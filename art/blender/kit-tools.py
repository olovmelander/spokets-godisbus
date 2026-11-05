"""The tools every kit is built with: put in front of a kit when it is sent to Blender (scripts/bake/send-kit.mjs).

Units: 1 Blender unit is 1 EL, Z is up, and a thing's front faces -Y. A thing's colours are on its corners (the colour
attribute "Color"), with the shade of its own creases baked into them. Keep this file in plain ASCII. The server's safe
mode allows no classes and no functions passed as values, so shapes are given as tables.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2.0
GOLDEN = math.radians(137.50776)

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)


def linear(value):
    """Blender wants light, not paint: an sRGB value from 0 to 255 as linear light from 0 to 1."""
    c = value / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def tone(text):
    """A colour written as in the game, '#rrggbb', as linear light."""
    return (linear(int(text[1:3], 16)), linear(int(text[3:5], 16)), linear(int(text[5:7], 16)))


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def lit(colour, k):
    return (colour[0] * k, colour[1] * k, colour[2] * k)


def rnd(a, b=0.0):
    """A fixed number from 0 to 1 for a pair of numbers: the same kit every time it is built."""
    s = math.sin(a * 12.9898 + b * 78.233) * 43758.5453
    return s - math.floor(s)


def knot(i, j, k):
    s = math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
    return s - math.floor(s)


def noise(x, y, z):
    """Smooth noise from 0 to 1."""
    xi = math.floor(x)
    yi = math.floor(y)
    zi = math.floor(z)
    xf = x - xi
    yf = y - yi
    zf = z - zi
    u = xf * xf * (3.0 - 2.0 * xf)
    v = yf * yf * (3.0 - 2.0 * yf)
    w = zf * zf * (3.0 - 2.0 * zf)
    total = 0.0
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                share = (u if dx else 1.0 - u) * (v if dy else 1.0 - v) * (w if dz else 1.0 - w)
                total += share * knot(xi + dx, yi + dy, zi + dz)
    return total


def along(table, t):
    """A value read from a table of (at, value) rows, straight between its rows."""
    if t <= table[0][0]:
        return table[0][1]
    for i in range(1, len(table)):
        if t <= table[i][0]:
            a = table[i - 1]
            b = table[i]
            return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])
    return table[-1][1]


# The one material: the colour attribute feeds the base colour, so that the exporter writes COLOR_0.
MATERIAL = bpy.data.materials.new('kit')
MATERIAL.use_nodes = True
for node in MATERIAL.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.9
        attribute = MATERIAL.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Color'
        MATERIAL.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])


# Thin things seen from both sides, needles and leaves: the same, but it draws its backs too.
LEAF = MATERIAL.copy()
LEAF.name = 'kit-leaf'
LEAF.use_backface_culling = False


def new_part():
    """One thing while it is being built: its mesh, the colour of each of its points, and the faces that
    have one colour of their own (a crisp border, where a point's colour would run)."""
    return {'bm': bmesh.new(), 'paint': {}, 'flat': {}}


def put(part, at, colour):
    """A point, in its colour."""
    made = part['bm'].verts.new(at)
    part['paint'][made] = colour
    return made


def face(part, verts, colour=None):
    made = part['bm'].faces.new(verts)
    if colour is not None:
        part['flat'][made] = colour
    return made


def skin(part, rings, colours, first=None, last=None, closed=True, flip=False):
    """Quads between rings of points. colours[i] is ring i's colour, or a list with one for each point.
    `first` and `last` close an end with a fan: each is (point, colour). Gives the points as [ring][j]."""
    made = []
    for i in range(len(rings)):
        row = []
        for j in range(len(rings[i])):
            colour = colours[i]
            if isinstance(colour, list):
                colour = colour[j]
            row.append(put(part, rings[i][j], colour))
        made.append(row)
    count = len(rings[0])
    span = count if closed else count - 1
    for i in range(len(made) - 1):
        for j in range(span):
            k = (j + 1) % count
            quad = (made[i][j], made[i][k], made[i + 1][k], made[i + 1][j])
            face(part, quad[::-1] if flip else quad)
    ends = ((first, made[0], True), (last, made[-1], False))
    for end, ring, down in ends:
        if end is None:
            continue
        tip = put(part, end[0], end[1])
        for j in range(span):
            k = (j + 1) % count
            fan = (ring[k], ring[j], tip) if down else (ring[j], ring[k], tip)
            face(part, fan[::-1] if flip else fan)
    return made


def circle(centre, across, up, radius, count, turn=0.0, squash=1.0, ripple=None):
    """A ring of points round a centre, in the plane of `across` and `up`."""
    ring = []
    for j in range(count):
        angle = TAU * (j + turn) / count
        wide = radius * (ripple[j] if ripple else 1.0)
        ring.append(centre + across * (wide * math.cos(angle)) + up * (wide * math.sin(angle) * squash))
    return ring


def tube(part, path, radii, colours, count, closed_ends=True, squash=1.0, lean=None, twist=0.5):
    """A round tube along a path of points. colours[i] is the colour at point i of the path, or a list with
    one for each point round it. `squash` is how thick it is across `lean` as a share of round."""
    rings = []
    normal = lean if lean is not None else Vector((0.0, 1.0, 0.0))
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(normal)
        if side.length < 0.001:
            side = ahead.cross(Vector((1.0, 0.0, 0.0)))
        side.normalize()
        up = side.cross(ahead)
        # Round the way it goes, so that its faces look outwards.
        rings.append(circle(path[i], up, side, radii[i], count, turn=twist * (i % 2), squash=1.0 / squash if squash else 1.0))
        if squash != 1.0:
            rings[-1] = [path[i] + (point - path[i]) * squash for point in rings[-1]]
    first = (path[0], colours[0] if not isinstance(colours[0], list) else colours[0][0]) if closed_ends else None
    last = (path[-1], colours[-1] if not isinstance(colours[-1], list) else colours[-1][0]) if closed_ends else None
    return skin(part, rings, colours, first, last)


def lathe(part, profile, count, matrix, colours, ripple=None, turn=None):
    """A profile of (radius, height) turned round Z, then placed by `matrix`. A radius of 0 at an end closes it."""
    rings = []
    tones = []
    first = None
    last = None
    for i in range(len(profile)):
        radius = profile[i][0]
        height = profile[i][1]
        if radius <= 0.0 and i == 0:
            first = (matrix @ Vector((0.0, 0.0, height)), colours[i])
            continue
        if radius <= 0.0 and i == len(profile) - 1:
            last = (matrix @ Vector((0.0, 0.0, height)), colours[i])
            continue
        ring = []
        for j in range(count):
            angle = TAU * (j + (turn[i] if turn else 0.0)) / count
            wide = radius * (ripple[i][j] if ripple else 1.0)
            ring.append(matrix @ Vector((wide * math.cos(angle), wide * math.sin(angle), height)))
        rings.append(ring)
        tones.append(colours[i])
    return skin(part, rings, tones, first, last)


def lump(part, centre, size, detail, colour):
    """A round lump: an icosphere pulled into shape. Gives its points, to push about and to paint.
    It is made in a mesh of its own and copied in: made in place, Blender lets go of the points already there."""
    matrix = Matrix.Translation(centre) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    ball = bmesh.new()
    bmesh.ops.create_icosphere(ball, subdivisions=detail, radius=1.0, matrix=matrix)
    ball.verts.index_update()
    made = [put(part, vert.co.copy(), colour) for vert in ball.verts]
    for side in ball.faces:
        face(part, [made[vert.index] for vert in side.verts])
    ball.free()
    return made


IDENTITY = Matrix.Identity(4)
ALONG_X = Matrix.Rotation(math.radians(90), 4, 'Y')


def finish(part, name, sharp=180.0, strength=0.6, reach=0.3, floor=None, recalc=True, leaf=False):
    """Makes the object, with smooth shading up to an angle. `strength` and `reach` are how dark and how far
    its own shade goes when it is baked, and `floor` is the height of the ground it stands on, if it does."""
    bm = part['bm']
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    layer = bm.loops.layers.float_color.new('Color')
    paint = part['paint']
    crisp = part['flat']
    for made in bm.faces:
        made.smooth = True
        own = crisp.get(made)
        for loop in made.loops:
            colour = own if own is not None else paint.get(loop.vert, (1.0, 0.0, 1.0))
            loop[layer] = (colour[0], colour[1], colour[2], 1.0)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if sharp < 180.0:
        mesh.set_sharp_from_angle(angle=math.radians(sharp))
    mesh.materials.append(LEAF if leaf else MATERIAL)
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = strength
    made['reach'] = reach
    made['floor'] = -1000.0 if floor is None else floor
    return made


def strip(part, points, wide, colour, out):
    """A thin band on a surface, along a line of points: a seam, a stitched line, a stem. `out` is the way it faces."""
    prev = None
    for i in range(len(points)):
        ahead = points[min(i + 1, len(points) - 1)] - points[max(i - 1, 0)]
        side = ahead.cross(out)
        side.normalize()
        w = wide[i] if isinstance(wide, list) else wide
        pair = (put(part, points[i] - side * w + out * 0.002, colour), put(part, points[i] + side * w + out * 0.002, colour))
        if prev is not None:
            face(part, (prev[0], prev[1], pair[1], pair[0]))
        prev = pair
