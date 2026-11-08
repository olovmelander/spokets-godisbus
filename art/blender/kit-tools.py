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

# What the game draws more on, seen close, each by its name: firewood's end grain, bark and split faces
# (src/render/firewood.ts), and cast concrete (src/render/concrete.ts). Faces are given one in `part['stuff']`.
STUFF = {}
for stuff_name in ('kit-wood', 'kit-concrete'):
    STUFF[stuff_name] = LEAF.copy()
    STUFF[stuff_name].name = stuff_name


def new_part():
    """One thing while it is being built: its mesh, the colour of each of its points, the faces that
    have one colour of their own (a crisp border, where a point's colour would run), the faces of another
    stuff than paint (`stuff`), where on a piece of firewood each of its faces is (`wood`), and for each point of
    concrete how open it is to the rain, how far along its face and how far below the face's top it is (`con`)."""
    return {'bm': bmesh.new(), 'paint': {}, 'flat': {}, 'stuff': {}, 'wood': {}, 'con': {}}


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
    # Firewood's corners: what face of the piece they are on, with the log's radius, and where they are from its pith
    # in the log's radius, across and up (_LOG; the exporter writes it, src/render/firewood.ts reads it).
    wood = part['wood']
    if wood:
        log = bm.loops.layers.float_vector.new('_LOG')
        for made in bm.faces:
            own = wood.get(made)
            if own is None:
                continue
            code, pith, big, across, up = own
            for loop in made.loops:
                d = loop.vert.co - pith
                loop[log] = (code, d.dot(across) / big, d.dot(up) / big)
    # Concrete's corners: how open to the rain, how far along its face, how far below its top (_CON;
    # src/render/concrete.ts).
    con = part['con']
    if con:
        cast = bm.loops.layers.float_vector.new('_CON')
        for made, stuff_name in part['stuff'].items():
            if stuff_name != 'kit-concrete':
                continue
            for loop in made.loops:
                loop[cast] = con.get(loop.vert, (0.0, 0.0, 0.0))
    slots = [LEAF if leaf else MATERIAL]
    for stuff_name in sorted(set(part['stuff'].values())):
        slots.append(STUFF[stuff_name])
    for made, stuff_name in part['stuff'].items():
        made.material_index = slots.index(STUFF[stuff_name])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if sharp < 180.0:
        mesh.set_sharp_from_angle(angle=math.radians(sharp))
    for slot in slots:
        mesh.materials.append(slot)
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


# --- firewood --------------------------------------------------------------------------------------------------------
# Spruce (index 0) and birch (1): a sawn end fresh and gone grey, the split wood, and the bark, pale and dark.
END_FRESH = (tone('#d8b884'), tone('#e0cca8'))
END_OLD = (tone('#9c8e78'), tone('#a89e8c'))
SPLIT_FRESH = (tone('#dcc290'), tone('#e6d4b2'))
BARK_PALE = (tone('#76604e'), tone('#e2ddd2'))
BARK_DARK = (tone('#4c3e34'), tone('#b4ada2'))
ACROSS = Vector((1.0, 0.0, 0.0))
UPWARD = Vector((0.0, 0.0, 1.0))


def firewood(part, pith, big, front, back, n, birch, turn=0.0, wedge=TAU, sides=16):
    """A piece of firewood lying along Y, its sawn end towards -Y at `front`: a whole log of radius `big` about its
    pith (x, z), or a piece split from one, its bark from `turn` round to `turn + wedge` and its split faces back
    to the pith. Each its own size and tone, a little out of round, and its end sawn a little out of square. Every
    face says where on the log it is (`part['wood']`), for the game to draw the rings, the cracks and the bark."""
    whole = wedge > TAU - 0.01
    count = sides if whole else max(3, int(round(sides * wedge / TAU))) + 1
    outline = []
    for j in range(count):
        a = turn + wedge * j / (count if whole else count - 1)
        wide = big * (1.0 + 0.06 * (noise(math.cos(a) * 1.6 + n, math.sin(a) * 1.6, n * 0.37) - 0.5))
        outline.append((wide * math.cos(a), wide * math.sin(a), True))
    if not whole:
        # The split, back to the pith and out again, a little torn on its way.
        last = outline[-1]
        first = outline[0]
        tear = (0.06 * (rnd(n, 11.0) - 0.5), 0.06 * (rnd(n, 13.0) - 0.5))
        outline += [(last[0] * 0.5 - last[1] * tear[0], last[1] * 0.5 + last[0] * tear[0], False), (0.0, 0.0, False),
                    (first[0] * 0.5 - first[1] * tear[1], first[1] * 0.5 + first[0] * tear[1], False)]
    tilt = (0.16 * (rnd(n, 12.0) - 0.5), 0.16 * (rnd(n, 13.0) - 0.5))
    age = rnd(n, 6.0)
    bark = lit(blend(BARK_PALE[birch], BARK_DARK[birch], rnd(n, 7.0) * (0.6 if birch else 1.0)), 0.9 + 0.2 * rnd(n, 10.0))
    near = []
    far = []
    for ox, oz, _ in outline:
        near.append(put(part, Vector((pith[0] + ox, front + tilt[0] * ox + tilt[1] * oz, pith[1] + oz)), bark))
        far.append(put(part, Vector((pith[0] + ox, back, pith[1] + oz)), lit(bark, 0.7)))
    centre = Vector((pith[0], front, pith[1]))
    code = big * 0.5 + birch + 1.0
    total = len(outline)
    split = lit(blend(SPLIT_FRESH[birch], END_OLD[birch], age * 0.35), 0.94 + 0.12 * rnd(n, 14.0))
    for j in range(total):
        k = (j + 1) % total
        side = face(part, (near[j], near[k], far[k], far[j]))
        on_bark = outline[j][2] and outline[k][2]
        part['wood'][side] = (code + (2.0 if on_bark else 4.0), centre, big, ACROSS, UPWARD)
        part['stuff'][side] = 'kit-wood'
        if not on_bark:
            part['flat'][side] = split
    end = lit(blend(END_FRESH[birch], END_OLD[birch], age * age), 0.88 + 0.2 * rnd(n, 9.0))
    cap = face(part, near, end)
    part['wood'][cap] = (code, centre, big, ACROSS, UPWARD)
    part['stuff'][cap] = 'kit-wood'
    return cap


def stack_row(part, x0, x1, z0, high, front, back, n, birch_share, top=False, wave=0.0):
    """One row of a stack of firewood from x0 to x1 over z0, `high` tall: whole logs, halves and quarters, each its
    own size and laid as it came, the sawn ends out at `front` give or take a hand. A top row lies flat: halves and
    quarters with their split faces up, to be walked on. Gives the number of the last piece."""
    x = x0 + 0.02
    while x < x1 - 0.3 * high:
        n += 1
        birch = 1 if rnd(n, 4.0) < birch_share else 0
        pick = rnd(n, 8.0)
        near = front + 0.18 * rnd(n, 3.0)
        lean = 0.3 * (rnd(n, 15.0) - 0.5)
        sink = wave * math.sin(x * 0.5 + z0)
        room = x1 - x
        if (top and pick < 0.5) or (not top and 0.35 <= pick < 0.72):
            # A half, its split face down or up.
            big = min(high * (0.8 + 0.12 * rnd(n, 1.0)), room / 2.0)
            face_up = top or pick >= 0.55
            pith = (x + big, z0 + sink + (high - 0.03 if face_up else 0.03))
            firewood(part, pith, big, near, back, n, birch, turn=(math.pi if face_up else 0.0) + lean * 0.8, wedge=math.pi)
            x += 2.0 * big
        elif pick >= 0.72 or (top and pick >= 0.8):
            # A quarter, its corner where its pith was; on top, a corner up.
            big = min(high * (0.86 + 0.1 * rnd(n, 1.0)), room)
            corner = int(rnd(n, 16.0) * 4.0) % 4
            if top:
                corner = 2 + corner % 2
            left = corner in (1, 2)
            low = corner in (0, 1)
            pith = (x + (big if left else 0.0), z0 + sink + (0.03 if low else high - 0.03))
            firewood(part, pith, big, near, back, n, birch, turn=corner * math.pi / 2.0 + lean * 0.7, wedge=math.pi / 2.0)
            x += big
        else:
            # A whole log, smaller.
            big = min(high * (0.42 + 0.07 * rnd(n, 1.0)), room / 2.0)
            firewood(part, (x + big, z0 + sink + high * 0.5 + 0.04 * (rnd(n, 2.0) - 0.5)), big, near, back, n, birch, turn=TAU * rnd(n, 5.0))
            x += 2.0 * big
        x += 0.02 + 0.05 * rnd(n, 17.0)
    return n
