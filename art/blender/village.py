"""Builds the village kit: the parts that the houses of the street in Byn are put together from
(src/render/village.ts), and what stands in a yard.

  - a house's front: its stone foot with the white drip board on it, upright boards with cover strips, lying
    boards, a corner board, a downpipe, a door in its casing behind a granite step, and the opening of a
    passage through a house;
  - a shop window for each of the street's four shops, with its wares standing in it: yarn, boots, bread and
    sweets. A shop is told by its wares, and by a carved sign low on its wall;
  - a cellar window; and for a yard: a low wall, a fence of boards, a gatepost, a hedge and a birch.

Nothing is built above 12 EL: the picture never reaches higher on a house. No part has a letter, a numeral or a
mark on it, and no front is a real shop's.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL (15 cm); Blender's Z is up, and
a part's front faces -Y, which is towards the camera in the game. Every part is an object of its own, named as
the game asks for it. It stands on the ground at Z 0 with the face of the wall's boards at Y 0, and what tiles
along a wall starts at X 0.

Nothing here has a texture. A part's colours are painted on its corners (the colour attribute "Color"), with
the shade of its own corners and creases baked into them. The UV coordinate says two things about a corner:
U is whose colour it takes (0 its own, 0.5 the house's wall, 1 the house's door), and V is how much of its
colour it gives off, which is how a shop window glows.

Nothing in this model comes from anyone else. Keep this file in plain ASCII: it is sent to Blender as text.
The server's safe mode allows no classes and no functions passed as values, so shapes are given as tables.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2.0

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


def dim(colour, k):
    return (colour[0] * k, colour[1] * k, colour[2] * k)


def chance(n):
    """A fixed number from 0 to 1 for each n: the same kit every time it is built."""
    s = math.sin(n * 12.9898 + 78.233) * 43758.5453
    return s - math.floor(s)


# Whose colour a corner takes: its own, the house's wall, or the house's door.
OWN = 0.0
WALL = 0.5
DOOR = 1.0

WHITE = (1.0, 1.0, 1.0)
TRIM = tone('#f4efe2')
STONE = tone('#8f8c86')
GRANITE = tone('#aaa59d')
ZINC = tone('#c3c8c6')
IRON = tone('#2b2f36')
BRASS = tone('#a08352')
DARK = tone('#15171c')
# The light in a shop window, from its middle to its sides.
LAMP = tone('#ffe2a0')
LAMP_SIDE = tone('#d9a85c')

# How high the stone foot is, where the boards begin over the drip board, and where everything ends.
FOOT = 1.6
BOARDS = 1.95
TOP = 12.0
# A window's sill, counted from the ground: the floor its wares stand on.
SILL = 2.6

# The one material: the colour attribute feeds the base colour, so that the exporter writes COLOR_0.
MATERIAL = bpy.data.materials.new('village')
MATERIAL.use_nodes = True
for node in MATERIAL.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.9
        attribute = MATERIAL.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Color'
        MATERIAL.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])


# --- building: flat faces with a side that is out, and closed shapes -----------------------------------------

def new_part():
    """One part while it is being built: its mesh, and the two layers its corners are painted in."""
    bm = bmesh.new()
    return {'bm': bm, 'colour': bm.loops.layers.float_color.new('Color'), 'tint': bm.loops.layers.uv.new('tint')}


def paint(part, faces, rgb, whose=OWN, glow=0.0):
    """Paints faces: a colour, whose colour is laid over it, and how much of it they give off."""
    for face in faces:
        for loop in face.loops:
            loop[part['colour']] = (rgb[0], rgb[1], rgb[2], 1.0)
            loop[part['tint']].uv = (whose, glow)


def scale_paint(part, faces, k):
    for face in faces:
        for loop in face.loops:
            c = loop[part['colour']]
            loop[part['colour']] = (c[0] * k, c[1] * k, c[2] * k, 1.0)


def face(part, points, out=None):
    """A flat face with corners of its own. `out` is a direction its outside faces."""
    bm = part['bm']
    made = bm.faces.new([bm.verts.new(point) for point in points])
    if out is not None:
        made.normal_update()
        if made.normal.dot(Vector(out)) < 0.0:
            made.normal_flip()
    return made


def place(axis, point, at):
    """A profile's point at a place along its axis. The profile lies in the two other axes, in their order."""
    if axis == 'x':
        return Vector((at, point[0], point[1]))
    if axis == 'y':
        return Vector((point[1], at, point[0]))
    return Vector((point[0], point[1], at))


def extrude(part, profile, axis, a, b, cuts=()):
    """Faces between a profile's points, drawn out from a to b along an axis and cut across at `cuts`.
    Walking along the profile with the axis pointing at you, the outside is on your right: for an upright
    member, give its outline anticlockwise as seen from above."""
    stops = [a] + list(cuts) + [b]
    faces = []
    for i in range(len(profile) - 1):
        for s in range(len(stops) - 1):
            faces.append(face(part, (
                place(axis, profile[i], stops[s]), place(axis, profile[i + 1], stops[s]),
                place(axis, profile[i + 1], stops[s + 1]), place(axis, profile[i], stops[s + 1]),
            )))
    return faces


def cap(part, profile, axis, at, out):
    """The end of a drawn-out profile, facing `out`."""
    return face(part, [place(axis, point, at) for point in profile], out)


def sheet(part, origin, u, v, out, us=(0.0, 1.0), vs=(0.0, 1.0)):
    """A flat rectangle from a corner along two edges, cut into a grid at parts of each edge."""
    o = Vector(origin)
    u = Vector(u)
    v = Vector(v)
    faces = []
    for i in range(len(us) - 1):
        for j in range(len(vs) - 1):
            faces.append(face(part, (
                o + u * us[i] + v * vs[j], o + u * us[i + 1] + v * vs[j],
                o + u * us[i + 1] + v * vs[j + 1], o + u * us[i] + v * vs[j + 1],
            ), out))
    return faces


def ring(part, outer, inner, out):
    """Four faces between two rectangles, each given as four corners in the same order."""
    faces = []
    for i in range(4):
        k = (i + 1) % 4
        faces.append(face(part, (outer[i], outer[k], inner[k], inner[i]), out))
    return faces


def faces_of(verts):
    found = set()
    for vert in verts:
        for item in vert.link_faces:
            found.add(item)
    return list(found)


def solid(part, faces):
    """A closed shape: its faces are turned so that their outsides are out."""
    bmesh.ops.recalc_face_normals(part['bm'], faces=faces)
    return faces


def move(part, faces, matrix):
    verts = set()
    for item in faces:
        for vert in item.verts:
            verts.add(vert)
    bmesh.ops.transform(part['bm'], matrix=matrix, verts=list(verts))
    return faces


def block(part, lo, hi, bevel=0.0):
    """A box between two corners, with its edges cut off by `bevel`."""
    bm = part['bm']
    size = (hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2])
    centre = ((hi[0] + lo[0]) / 2.0, (hi[1] + lo[1]) / 2.0, (hi[2] + lo[2]) / 2.0)
    made = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(centre) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    if bevel <= 0.0:
        return faces_of(made['verts'])
    edges = set()
    for vert in made['verts']:
        for edge in vert.link_edges:
            edges.add(edge)
    bevelled = bmesh.ops.bevel(bm, geom=list(edges), offset=bevel, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES')
    faces = set(bevelled['faces'])
    for vert in bevelled['verts']:
        for item in vert.link_faces:
            faces.add(item)
    return [item for item in faces if item.is_valid]


def skin(part, rings, first=None, last=None, closed=True):
    """Quads between rings of points. `first` and `last` close an end with a fan."""
    bm = part['bm']
    made = [[bm.verts.new(point) for point in one] for one in rings]
    count = len(rings[0])
    faces = []
    for i in range(len(made) - 1):
        for j in range(count if closed else count - 1):
            k = (j + 1) % count
            faces.append(bm.faces.new((made[i][j], made[i][k], made[i + 1][k], made[i + 1][j])))
    for point, one in ((first, made[0]), (last, made[-1])):
        if point is not None:
            tip = bm.verts.new(point)
            for j in range(count):
                faces.append(bm.faces.new((one[j], one[(j + 1) % count], tip)))
    return faces


def lathe(part, profile, segments, matrix):
    """A profile of (radius, height) turned round Z, then placed by `matrix`. A radius of 0 at an end closes it."""
    rings = []
    first = None
    last = None
    for i in range(len(profile)):
        radius = profile[i][0]
        height = profile[i][1]
        if radius <= 0.0 and i == 0:
            first = matrix @ Vector((0.0, 0.0, height))
            continue
        if radius <= 0.0 and i == len(profile) - 1:
            last = matrix @ Vector((0.0, 0.0, height))
            continue
        rings.append([matrix @ Vector((radius * math.cos(TAU * j / segments), radius * math.sin(TAU * j / segments), height)) for j in range(segments)])
    return solid(part, skin(part, rings, first, last))


def sweep(part, path, radii, segments, squash=1.0):
    """A round tube along a path of points that keeps away from the Y direction, closed at both ends.
    `squash` flattens it from front to back."""
    rings = []
    normal = Vector((0.0, 1.0, 0.0))
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(normal)
        side.normalize()
        up = side.cross(ahead)
        rings.append([path[i] + (side * math.cos(TAU * j / segments) + up * math.sin(TAU * j / segments) * squash) * radii[i] for j in range(segments)])
    return solid(part, skin(part, rings, path[0], path[-1]))


def ball(part, centre, scale, segments=10, rings=6, turn=None):
    """A sphere pulled into shape."""
    matrix = Matrix.Translation(centre)
    if turn is not None:
        matrix = matrix @ turn
    matrix = matrix @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    made = bmesh.ops.create_uvsphere(part['bm'], u_segments=segments, v_segments=rings, radius=1.0, matrix=matrix)
    return faces_of(made['verts'])


def smooth(points, steps):
    """A curve through points, as more points: `steps` to each stretch."""
    out = []
    count = len(points)
    for i in range(count - 1):
        p0 = points[max(i - 1, 0)]
        p1 = points[i]
        p2 = points[i + 1]
        p3 = points[min(i + 2, count - 1)]
        for s in range(steps):
            t = s / steps
            at = []
            for k in range(3):
                at.append(0.5 * (2.0 * p1[k] + (p2[k] - p0[k]) * t + (2.0 * p0[k] - 5.0 * p1[k] + 4.0 * p2[k] - p3[k]) * t * t
                                 + (3.0 * p1[k] - p0[k] - 3.0 * p2[k] + p3[k]) * t * t * t))
            out.append(Vector(at))
    out.append(Vector(points[-1]))
    return out


def finish(part, name, sharp=35.0, shade=0.7):
    """Makes the object. Faces that share corners are smooth where they meet at less than `sharp` degrees."""
    bm = part['bm']
    for item in bm.faces:
        item.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.set_sharp_from_angle(angle=math.radians(sharp))
    mesh.materials.append(MATERIAL)
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = shade
    return made


# An upright member's outline, anticlockwise as seen from above: from the wall out to its front and back,
# with both front edges cut off. The left one catches the low sun.
def member(x0, x1, proud, cut, back0=0.0, back1=0.0):
    return [(x0, back0), (x0, cut - proud), (x0 + cut, -proud), (x1 - cut, -proud), (x1, cut - proud), (x1, back1)]


# --- a house's front ----------------------------------------------------------------------------------------

def stone_at(height, top):
    """A stone foot's colour at a height: dark and damp under the ground, a shade where it meets the street, and
    the shade of what lies on it at its top."""
    if height < -0.5:
        k = 0.5
    elif height < 0.05:
        k = 0.7
    elif height < top - 0.2:
        k = 1.0
    else:
        k = 0.9
    return (STONE[0] * k, STONE[1] * k, STONE[2] * k, 1.0)


# Sockel: the stone foot, 4 EL of it, with the white drip board lying on it. It goes far down under the
# ground, for a house that stands at the edge of a well or of the drain.
part = new_part()
WIDE = 4.0
rows = extrude(part, [(0.0, -0.29), (0.06, -0.35), (WIDE - 0.06, -0.35), (WIDE, -0.29)], 'z', -7.0, FOOT, (-1.0, 0.0, 0.45, 1.25))
paint(part, rows, STONE)
for item in rows:
    for loop in item.loops:
        loop[part['colour']] = stone_at(loop.vert.co.z, FOOT)
for x, out in ((0.0, (-1.0, 0.0, 0.0)), (WIDE, (1.0, 0.0, 0.0))):
    paint(part, sheet(part, (x, -0.29, -7.0), (0.0, 0.29, 0.0), (0.0, 0.0, 7.0 + FOOT), out), dim(STONE, 0.85))
DRIP = [(0.0, 1.98), (-0.45, 1.72), (-0.45, 1.6), (-0.35, 1.6)]
paint(part, extrude(part, DRIP, 'x', 0.0, WIDE), TRIM)
paint(part, [cap(part, DRIP, 'x', 0.0, (-1.0, 0.0, 0.0)), cap(part, DRIP, 'x', WIDE, (1.0, 0.0, 0.0))], TRIM)
finish(part, 'sockel', shade=0.6)

# Panel: one upright board and the cover strip over its joint, 1.35 EL from strip to strip.
part = new_part()
PITCH = 1.35
board = extrude(part, [(0.35, 0.0), (0.47, 0.0), (PITCH - 0.12, 0.0), (PITCH, 0.0)], 'z', BOARDS, TOP, (3.3,))
strip = extrude(part, member(0.0, 0.35, 0.15, 0.06), 'z', BOARDS, TOP, (3.3,))
paint(part, board + strip, WHITE, WALL)
# The lowest boards are weathered: rain splashes up from the street.
for item in board + strip:
    for loop in item.loops:
        if loop.vert.co.z < BOARDS + 0.1:
            loop[part['colour']] = (0.84, 0.85, 0.83, 1.0)
finish(part, 'panel', shade=0.75)

# Liggande: lying boards, 4 EL of them, each 0.8 EL tall and leaning out over the one below.
part = new_part()
COURSES = 13
profile = [(0.0, BOARDS + COURSES * 0.8)]
for k in range(COURSES):
    low = BOARDS + (COURSES - 1 - k) * 0.8
    profile.append((-0.1, low))
    profile.append((0.0, low))
lying = extrude(part, profile, 'x', 0.0, WIDE)
paint(part, lying, WHITE, WALL)
for item in lying:
    # The underside of a board is in its own shade.
    if abs(item.calc_center_median().y + 0.05) < 0.001 and abs(item.verts[0].co.z - item.verts[2].co.z) < 0.001:
        scale_paint(part, [item], 0.7)
finish(part, 'liggande', shade=0.6)

# Knut: the white board at a house's left corner, going round it. A right corner is the same, mirrored.
part = new_part()
KNUT = [(0.0, 1.1), (-0.14, 1.1), (-0.2, 1.04), (-0.2, -0.14), (-0.14, -0.2), (1.04, -0.2), (1.1, -0.14), (1.1, 0.0)]
paint(part, extrude(part, KNUT, 'z', BOARDS, TOP, (3.3,)), TRIM)
finish(part, 'knut', shade=0.6)

# Ror: a downpipe of zinc, held to the wall by two clamps, with its shoe turned out over the street.
part = new_part()
PIPE = [Vector((0.0, -0.66, TOP)), Vector((0.0, -0.66, 2.7)), Vector((0.0, -0.69, 2.25)), Vector((0.0, -0.84, 1.8)), Vector((0.0, -1.1, 1.42)), Vector((0.0, -1.34, 1.16))]
tube = sweep(part, PIPE, [0.3, 0.3, 0.3, 0.3, 0.3, 0.31], 8)
paint(part, tube, ZINC)
for item in tube:
    # Its mouth is dark.
    if len(item.verts) == 3 and (item.calc_center_median() - PIPE[-1]).length < 0.25:
        paint(part, [item], dim(IRON, 0.6))
for height in (3.5, 8.6):
    paint(part, block(part, (-0.37, -1.02, height), (0.37, 0.0, height + 0.24), 0.03), dim(ZINC, 0.72))
finish(part, 'ror', sharp=50.0, shade=0.6)

# Dorr: a door, 6 EL wide in its casing, behind a granite step. The leaf has two raised panels under a pane
# of glass, a brass kick plate and a brass handle. It takes the house's door colour.
part = new_part()
STEP = 1.2
LEAF = 0.6
step = block(part, (-4.0, -3.0, -7.0), (4.0, 0.0, STEP), 0.09)
paint(part, step, GRANITE)
for item in step:
    for loop in item.loops:
        if loop.vert.co.z < -0.5:
            loop[part['colour']] = (GRANITE[0] * 0.5, GRANITE[1] * 0.5, GRANITE[2] * 0.5, 1.0)
paint(part, extrude(part, [(-4.0, 0.0), (-4.0, -0.23), (-3.93, -0.3), (-3.07, -0.3), (-3.0, -0.23), (-3.0, LEAF)], 'z', STEP, TOP), TRIM)
paint(part, extrude(part, [(3.0, LEAF), (3.0, -0.23), (3.07, -0.3), (3.93, -0.3), (4.0, -0.23), (4.0, 0.0)], 'z', STEP, TOP), TRIM)
paint(part, sheet(part, (-3.0, 0.0, STEP), (6.0, 0.0, 0.0), (0.0, LEAF, 0.0), (0.0, 0.0, 1.0)), dim(GRANITE, 0.8))
FRONT = (0.0, -1.0, 0.0)
leaf = []
leaf += sheet(part, (-3.0, LEAF, STEP), (6.0, 0.0, 0.0), (0.0, 0.0, 1.7), FRONT)
leaf += sheet(part, (-3.0, LEAF, STEP + 1.7), (0.7, 0.0, 0.0), (0.0, 0.0, TOP - STEP - 1.7), FRONT)
leaf += sheet(part, (2.3, LEAF, STEP + 1.7), (0.7, 0.0, 0.0), (0.0, 0.0, TOP - STEP - 1.7), FRONT)
leaf += sheet(part, (-0.3, LEAF, STEP + 1.7), (0.6, 0.0, 0.0), (0.0, 0.0, 3.8), FRONT)
leaf += sheet(part, (-2.3, LEAF, STEP + 5.5), (4.6, 0.0, 0.0), (0.0, 0.0, 0.8), FRONT)
# The two panels: sunk into the leaf, with a raised field in the middle of each.
for x0, x1 in ((-2.3, -0.3), (0.3, 2.3)):
    z0 = STEP + 1.7
    z1 = STEP + 5.5
    outer = [Vector((x0, LEAF, z0)), Vector((x1, LEAF, z0)), Vector((x1, LEAF, z1)), Vector((x0, LEAF, z1))]
    sunk = [Vector((x0 + 0.2, LEAF + 0.12, z0 + 0.2)), Vector((x1 - 0.2, LEAF + 0.12, z0 + 0.2)), Vector((x1 - 0.2, LEAF + 0.12, z1 - 0.2)), Vector((x0 + 0.2, LEAF + 0.12, z1 - 0.2))]
    field = [Vector((x0 + 0.42, LEAF + 0.03, z0 + 0.42)), Vector((x1 - 0.42, LEAF + 0.03, z0 + 0.42)), Vector((x1 - 0.42, LEAF + 0.03, z1 - 0.42)), Vector((x0 + 0.42, LEAF + 0.03, z1 - 0.42))]
    leaf += ring(part, outer, sunk, FRONT)
    leaf += ring(part, sunk, field, FRONT)
    leaf.append(face(part, field, FRONT))
paint(part, leaf, WHITE, DOOR)
# The pane: warm light from inside, behind a bar down its middle.
z0 = STEP + 6.3
outer = [Vector((-2.3, LEAF, z0)), Vector((2.3, LEAF, z0)), Vector((2.3, LEAF, TOP)), Vector((-2.3, LEAF, TOP))]
glass = [Vector((-2.15, LEAF + 0.1, z0 + 0.15)), Vector((2.15, LEAF + 0.1, z0 + 0.15)), Vector((2.15, LEAF + 0.1, TOP)), Vector((-2.15, LEAF + 0.1, TOP))]
paint(part, ring(part, outer, glass, FRONT), WHITE, DOOR)
paint(part, [face(part, glass, FRONT)], tone('#e8c88a'), OWN, 0.45)
paint(part, block(part, (-0.11, LEAF - 0.02, z0), (0.11, LEAF + 0.1, TOP)), WHITE, DOOR)
paint(part, block(part, (-2.6, LEAF - 0.06, STEP + 0.3), (2.6, LEAF + 0.02, STEP + 1.45), 0.02), BRASS)
paint(part, block(part, (2.42, LEAF - 0.06, STEP + 5.45), (2.84, LEAF + 0.02, STEP + 6.35), 0.02), BRASS)
paint(part, block(part, (1.72, LEAF - 0.3, STEP + 5.8), (2.74, LEAF - 0.17, STEP + 5.98), 0.03), BRASS)
paint(part, block(part, (2.56, LEAF - 0.3, STEP + 5.78), (2.72, LEAF, STEP + 6.0)), BRASS)
finish(part, 'dorr', shade=0.75)

# Port: the opening of a passage through a house, 5.4 EL wide, dark between two white posts. What drives and
# walks along the street behind the houses comes out of it and goes into it.
part = new_part()
PORT = 5.4
dark = sheet(part, (0.0, -0.02, -7.0), (PORT, 0.0, 0.0), (0.0, 0.0, 20.0), FRONT, vs=(0.0, 0.35, 0.5, 1.0))
paint(part, dark, DARK)
for item in dark:
    for loop in item.loops:
        # A little of the street's light reaches in along the ground.
        if abs(loop.vert.co.z) < 0.01:
            loop[part['colour']] = (DARK[0] * 3.2, DARK[1] * 3.2, DARK[2] * 3.2, 1.0)
for x0 in (-0.5, PORT):
    post = extrude(part, member(x0, x0 + 0.5, 0.2, 0.06), 'z', -7.0, 13.0, (0.0,))
    paint(part, post, TRIM)
    for item in post:
        if item.calc_center_median().z < 0.0:
            paint(part, [item], dim(STONE, 0.5))
made = finish(part, 'port', shade=0.3)
made['wide'] = PORT

# Kallarfonster: a cellar window with two panes behind three iron bars, down in the house's foot. It stands
# with its middle at X 0, and is seen in a well.
part = new_part()
paint(part, [face(part, [Vector((-1.6, -0.37, -2.55)), Vector((1.6, -0.37, -2.55)), Vector((1.6, -0.37, -1.05)), Vector((-1.6, -0.37, -1.05))], FRONT)], tone('#b0935c'), OWN, 0.06)
for lo, hi in (((-1.82, -0.5, -2.77), (-1.6, -0.35, -0.83)), ((1.6, -0.5, -2.77), (1.82, -0.35, -0.83)), ((-1.6, -0.5, -2.77), (1.6, -0.35, -2.55)), ((-1.6, -0.5, -1.05), (1.6, -0.35, -0.83)), ((-0.09, -0.46, -2.55), (0.09, -0.36, -1.05))):
    paint(part, block(part, lo, hi), tone('#77736a'))
for x in (-1.07, 0.0, 1.07):
    paint(part, block(part, (x - 0.06, -0.6, -2.66), (x + 0.06, -0.5, -0.94)), IRON)
finish(part, 'kallarfonster', shade=0.7)


# --- the wares ----------------------------------------------------------------------------------------------

# A kringla, as its rope of dough runs: from one end up through the middle, round one side, along the bottom,
# round the other side and down through the middle again. Its two strands cross in front of one another.
KRINGLA = [
    (-0.52, -0.1, -0.7), (-0.2, -0.1, -0.32), (0.12, -0.08, 0.1), (0.45, -0.03, 0.52), (0.8, 0.0, 0.8), (1.1, 0.0, 0.55), (1.2, 0.0, 0.05),
    (0.98, 0.0, -0.52), (0.5, 0.0, -0.9), (0.0, 0.0, -1.0), (-0.5, 0.0, -0.9), (-0.98, 0.0, -0.52), (-1.2, 0.0, 0.05), (-1.1, 0.0, 0.55),
    (-0.8, 0.0, 0.8), (-0.45, 0.03, 0.52), (-0.12, 0.08, 0.1), (0.2, 0.1, -0.32), (0.52, 0.1, -0.7),
]


def kringla(part, centre, size, thick, sides, steps, colour, glow, sugar):
    """A kringla standing on its edge, facing the street: `size` is half its width."""
    path = [Vector(centre) + point * size for point in smooth(KRINGLA, steps)]
    faces = sweep(part, path, [thick] * len(path), sides, 0.8)
    paint(part, faces, colour, OWN, glow)
    if sugar:
        # Pearl sugar: pale grains on what faces the street.
        n = 0
        for item in faces:
            n += 1
            item.normal_update()
            if item.normal.y < -0.5 and chance(n) < 0.3:
                paint(part, [item], tone('#f6ecd6'), OWN, glow)
    return faces


def loaf(part, centre, long, colour, turn, glow):
    """A loaf of bread lying along X: thick in the middle, with a blunt point at each end, and slashed across
    its top, where the pale crumb shows."""
    half = long / 2.0
    profile = [(0.0, -half), (0.2, -half * 0.94), (0.34, -half * 0.74), (0.43, -half * 0.4), (0.45, 0.0), (0.43, half * 0.4), (0.34, half * 0.74), (0.2, half * 0.94), (0.0, half)]
    matrix = Matrix.Translation(centre) @ Matrix.Rotation(turn, 4, 'Y') @ Matrix.Diagonal((1.0, 1.15, 0.92, 1.0)) @ Matrix.Rotation(math.radians(90), 4, 'Y')
    faces = lathe(part, profile, 12, matrix)
    paint(part, faces, colour, OWN, glow)
    back = matrix.inverted()
    for item in faces:
        # In the loaf's own space it lies along Z, and its top is towards -X.
        at = back @ item.calc_center_median()
        if at.x < -0.2 and math.floor((at.z + at.y * 0.8 + 4.0) / 0.3) % 2 == 0 and abs(at.z) < half * 0.8:
            paint(part, [item], tone('#f0dcae'), OWN, glow)
    return faces


def boot(part, at, size, leather, sole, tall, glow):
    """A boot standing at `at` with its toe towards +X: a shaft `tall` high, a foot, a sole and a heel."""
    path = [Vector((-0.05, 0.0, tall)), Vector((-0.05, 0.0, 0.62)), Vector((-0.03, 0.0, 0.4)), Vector((0.12, 0.0, 0.24)), Vector((0.38, 0.0, 0.19)), Vector((0.58, 0.0, 0.16))]
    faces = sweep(part, path, [0.2, 0.185, 0.2, 0.2, 0.175, 0.12], 10)
    paint(part, faces, leather, OWN, glow)
    for item in faces:
        # Looking down into it.
        if len(item.verts) == 3 and item.calc_center_median().z > tall - 0.02:
            paint(part, [item], dim(leather, 0.25), OWN, 0.0)
    under = block(part, (-0.27, -0.2, -0.05), (0.7, 0.2, 0.03), 0.03) + block(part, (-0.27, -0.19, -0.16), (0.02, 0.19, -0.05), 0.02)
    paint(part, under, sole, OWN, glow)
    # A fold at the ankle and a band round the top of the shaft.
    band = block(part, (-0.265, -0.2, tall - 0.14), (0.165, 0.2, tall - 0.02), 0.03)
    paint(part, band, dim(leather, 0.7), OWN, glow)
    all_faces = faces + under + band
    move(part, all_faces, Matrix.Translation((at[0], at[1], at[2] + 0.16 * size)) @ Matrix.Scale(size, 4))
    return all_faces


def jar(part, at, size, sweets, glow):
    """A sweet jar: full to its shoulder, with a brass lid and a knob."""
    profile = [(0.0, 0.0), (0.56, 0.0), (0.6, 0.08), (0.6, 0.27), (0.6, 0.46), (0.6, 0.66), (0.6, 0.86), (0.6, 1.05), (0.52, 1.24), (0.4, 1.33), (0.4, 1.42), (0.47, 1.42), (0.47, 1.57), (0.3, 1.66), (0.1, 1.68), (0.13, 1.75), (0.1, 1.84), (0.0, 1.86)]
    faces = lathe(part, profile, 12, Matrix.Translation(at) @ Matrix.Scale(size, 4))
    n = 0
    for item in faces:
        n += 1
        height = (item.calc_center_median().z - at[2]) / size
        if height > 1.4:
            paint(part, [item], BRASS, OWN, glow * 0.6)
        elif height > 1.08:
            paint(part, [item], tone('#dfe9e4'), OWN, glow)
        else:
            # Many sweets of one kind, lying in layers: a lighter and a darker ring by turns. Never a pattern of
            # single faces: by chance such a pattern can look like a letter.
            paint(part, [item], dim(sweets, 1.0 if int(height / 0.195 + 0.3) % 2 == 0 else 0.86), OWN, glow)
    return faces


def wrapped(part, at, size, colour, turn, glow):
    """A sweet in its wrapper, lying along X: the shape of the trail's candy."""
    profile = [(0.0, -0.2), (0.075, -0.19), (0.026, -0.115), (0.086, -0.064), (0.1, 0.0), (0.086, 0.064), (0.026, 0.115), (0.075, 0.19), (0.0, 0.2)]
    matrix = Matrix.Translation(at) @ Matrix.Rotation(turn, 4, 'Y') @ Matrix.Rotation(math.radians(90), 4, 'Y') @ Matrix.Scale(size, 4)
    faces = lathe(part, profile, 10, matrix)
    paint(part, faces, colour, OWN, glow)
    back = matrix.inverted()
    for item in faces:
        # The twisted ends of the paper are paler than the sweet.
        if abs((back @ item.calc_center_median()).z) > 0.1:
            paint(part, [item], blend(colour, WHITE, 0.55), OWN, glow)
    return faces


# --- a shop window: its casing, its sill, the room behind the glass, and what stands there ---------------------

def window(part, wide, bars):
    """A shop window `wide` across with its middle at X 0: an apron on the drip board, a sill board, a casing at
    each side, bars between its panes, and a lit room behind the glass, 3 EL deep."""
    half = wide / 2.0
    paint(part, extrude(part, [(-0.3, SILL - 0.25), (-0.3, BOARDS)], 'x', -half - 1.0, half + 1.0), TRIM)
    paint(part, sheet(part, (-half - 1.0, 0.0, BOARDS), (0.0, -0.3, 0.0), (0.0, 0.0, SILL - 0.25 - BOARDS), (-1.0, 0.0, 0.0)), TRIM)
    paint(part, sheet(part, (half + 1.0, 0.0, BOARDS), (0.0, -0.3, 0.0), (0.0, 0.0, SILL - 0.25 - BOARDS), (1.0, 0.0, 0.0)), TRIM)
    board = [(0.5, SILL), (-0.5, SILL - 0.08), (-0.5, SILL - 0.25), (-0.3, SILL - 0.25)]
    paint(part, extrude(part, board, 'x', -half - 1.15, half + 1.15), TRIM)
    paint(part, [cap(part, board, 'x', -half - 1.15, (-1.0, 0.0, 0.0)), cap(part, board, 'x', half + 1.15, (1.0, 0.0, 0.0))], TRIM)
    paint(part, extrude(part, [(-half - 1.0, 0.0), (-half - 1.0, -0.23), (-half - 0.93, -0.3), (-half - 0.07, -0.3), (-half, -0.23), (-half, 0.5)], 'z', SILL - 0.04, TOP), TRIM)
    paint(part, extrude(part, [(half, 0.5), (half, -0.23), (half + 0.07, -0.3), (half + 0.93, -0.3), (half + 1.0, -0.23), (half + 1.0, 0.0)], 'z', SILL - 0.04, TOP), TRIM)
    for x in bars:
        paint(part, extrude(part, [(x - 0.11, 0.5), (x - 0.11, 0.38), (x + 0.11, 0.38), (x + 0.11, 0.5)], 'z', SILL, TOP), TRIM)
    paint(part, extrude(part, [(0.5, 9.25), (0.41, 9.25), (0.41, 9.0), (0.5, 9.0)], 'x', -half, half), TRIM)
    # The room: its back wall is brightest in the middle, and its side walls are seen through the glass.
    columns = [k / 8.0 for k in range(9)]
    back = sheet(part, (-half - 0.6, 3.5, SILL), (wide + 1.2, 0.0, 0.0), (0.0, 0.0, TOP - SILL), FRONT, us=columns, vs=(0.0, 0.14, 0.3, 0.5, 1.0))
    for item in back:
        for loop in item.loops:
            away = min(1.0, abs(loop.vert.co.x) / (half + 0.6))
            low = max(0.0, 1.0 - (loop.vert.co.z - SILL) / 1.2)
            colour = blend(LAMP, LAMP_SIDE, away * away)
            loop[part['colour']] = (colour[0], colour[1], colour[2], 1.0)
            loop[part['tint']].uv = (OWN, 0.62 - 0.26 * away * away - 0.1 * low)
    for x, out in ((-half - 0.6, (1.0, 0.0, 0.0)), (half + 0.6, (-1.0, 0.0, 0.0))):
        paint(part, sheet(part, (x, 0.5, SILL), (0.0, 3.0, 0.0), (0.0, 0.0, TOP - SILL), out), LAMP_SIDE, OWN, 0.3)
    for x, out in ((-half - 0.6, (0.0, 1.0, 0.0)), (half, (0.0, 1.0, 0.0))):
        paint(part, sheet(part, (x, 0.5, SILL), (0.6, 0.0, 0.0), (0.0, 0.0, TOP - SILL), out), LAMP_SIDE, OWN, 0.2)
    # The floor the wares stand on, seen as its front edge.
    paint(part, sheet(part, (-half, 0.5, SILL - 0.04), (wide, 0.0, 0.0), (0.0, 3.0, 0.0), (0.0, 0.0, 1.0)), dim(LAMP_SIDE, 0.8), OWN, 0.25)


def stand(part, x0, x1, y0, y1, height, colour, glow):
    """A plain box on the window's floor to set wares on."""
    faces = block(part, (x0, y0, SILL), (x1, y1, SILL + height), 0.03)
    paint(part, faces, colour, OWN, glow)
    return faces


# The wares give off far less than the wall behind them: each stands dark against the light, and is told by
# its outline with the colours taken away.
WARES = 0.13
WOOD = tone('#8a6a44')

# Garn: a basket of five balls of yarn with two needles through the top one, a ball by itself, and a pair of
# mittens on a stand.
part = new_part()
window(part, 7.0, (-1.17, 1.17))
at = (-0.95, 1.9, SILL)
basket = lathe(part, [(0.0, 0.0), (1.15, 0.0), (1.24, 0.3), (1.32, 0.6), (1.4, 0.9), (1.48, 1.15), (1.36, 1.15), (0.0, 0.9)], 14, Matrix.Translation(at))
n = 0
for item in basket:
    n += 1
    centre = item.calc_center_median()
    weave = (int((centre.z - SILL) / 0.3) + int((math.atan2(centre.y - at[1], centre.x - at[0]) + math.pi) / TAU * 14.0)) % 2
    paint(part, [item], tone('#b08a55') if weave == 0 else tone('#8f6c3d'), OWN, WARES)
YARN = (('#d8c060', -0.82, 0.0, 1.42), ('#7fae8a', 0.05, -0.15, 1.5), ('#c8a6c8', 0.86, 0.0, 1.42), ('#ece4d2', -0.4, -0.05, 2.22), ('#6f9ac0', 0.5, -0.05, 2.18), ('#c98a4a', -1.95, -0.6, 0.52))
n = 0
for colour, x, y, z in YARN:
    n += 1
    turn = Matrix.Rotation(chance(n) * 3.0, 4, 'X') @ Matrix.Rotation(chance(n + 9) * 3.0, 4, 'Y')
    wound = ball(part, (at[0] + x, at[1] + y, SILL + z), (0.52, 0.52, 0.52), 10, 7, turn)
    paint(part, wound, tone(colour), OWN, WARES)
    back = (Matrix.Translation((at[0] + x, at[1] + y, SILL + z)) @ turn).inverted()
    for item in wound:
        # The strands lie side by side round it.
        if int(((back @ item.calc_center_median()).z + 2.0) / 0.26) % 2 == 0:
            scale_paint(part, [item], 0.62)
# The two needles lean the same way, one more than the other: sticks in a ball of yarn, and no letter's shape.
for lean, out in ((0.35, 0.0), (0.95, 0.25)):
    foot = Vector((at[0] - 0.55 + out, at[1] - 0.25, SILL + 2.05))
    tip = foot + Vector((lean, 0.0, 1.9 - out))
    paint(part, sweep(part, [foot, tip], [0.07, 0.05], 5), tone('#7a5632'), OWN, WARES)
    paint(part, ball(part, tip, (0.13, 0.13, 0.13), 6, 4), tone('#7a5632'), OWN, WARES)
stand(part, 1.5, 3.2, 1.3, 2.3, 0.35, WOOD, WARES)
for x, y, lean, colour in ((1.95, 2.0, -0.1, '#5f8fb8'), (2.6, 1.55, 0.16, '#6f9ac0')):
    base = Vector((x, y, SILL + 0.35))
    turn = Matrix.Rotation(lean, 4, 'Y')
    mitten = ball(part, Vector((0.0, 0.0, 1.12)), (0.42, 0.2, 0.74), 10, 6)
    # Its thumb points up and out to the right, from half way up.
    mitten += ball(part, Vector((0.44, 0.0, 0.86)), (0.14, 0.13, 0.36), 8, 5, Matrix.Rotation(0.6, 4, 'Y'))
    paint(part, mitten, tone(colour), OWN, WARES)
    # A ribbed cuff in another yarn, and a pale band knitted across the hand.
    cuff = block(part, (-0.33, -0.17, 0.0), (0.33, 0.17, 0.5), 0.05)
    paint(part, cuff, tone('#d8c060'), OWN, WARES)
    band = block(part, (-0.43, -0.21, 1.2), (0.43, 0.21, 1.36), 0.03)
    paint(part, band, tone('#ece4d2'), OWN, WARES)
    move(part, mitten + cuff + band, Matrix.Translation(base) @ turn)
made = finish(part, 'fonster-yarn', sharp=40.0)
made['wide'] = 7.0

# Skor: boots on stands of different heights, a child's yellow pair, and a brush beside a round tin.
part = new_part()
window(part, 8.2, (-1.37, 1.37))
LEATHER = tone('#6a4a32')
stand(part, -3.9, -1.7, 1.0, 2.6, 0.5, WOOD, WARES)
boot(part, (-3.35, 2.1, SILL + 0.5), 2.5, LEATHER, tone('#d9c8a4'), 1.0, WARES)
boot(part, (-3.0, 1.4, SILL + 0.5), 2.5, LEATHER, tone('#d9c8a4'), 1.0, WARES)
stand(part, -1.3, 1.3, 1.2, 2.6, 2.1, WOOD, WARES)
boot(part, (-0.55, 1.9, SILL + 2.1), 2.7, tone('#2f3f55'), tone('#1e2732'), 1.15, WARES)
stand(part, 1.75, 3.9, 1.0, 2.6, 1.1, WOOD, WARES)
boot(part, (2.2, 2.1, SILL + 1.1), 1.7, tone('#e0b83a'), tone('#f0e2b0'), 0.95, WARES)
boot(part, (2.6, 1.45, SILL + 1.1), 1.7, tone('#e0b83a'), tone('#f0e2b0'), 0.95, WARES)
# The brush lies before the tall stand, with its bristles down, and the tin of polish stands by it.
paint(part, block(part, (-1.0, 0.75, SILL + 0.22), (0.3, 1.1, SILL + 0.45), 0.04), tone('#a9763f'), OWN, WARES)
paint(part, block(part, (-0.95, 0.78, SILL), (0.25, 1.07, SILL + 0.22)), tone('#3b332b'), OWN, WARES)
paint(part, lathe(part, [(0.0, 0.0), (0.42, 0.0), (0.42, 0.26), (0.0, 0.3)], 12, Matrix.Translation((0.72, 0.95, SILL))), tone('#b9bcc0'), OWN, WARES)
made = finish(part, 'fonster-boots', sharp=40.0)
made['wide'] = 8.2

# Brod: three loaves stacked like logs, and a kringla standing on its edge on a little stand.
part = new_part()
window(part, 5.2, (0.0,))
CRUST = ('#a8692f', '#96592a', '#b4763a')
for k in range(3):
    loaf(part, (-1.36 + (0.1 if k == 1 else -0.04), 1.7 + 0.12 * k, SILL + 0.42 + 0.78 * k), 2.0 - 0.14 * k, tone(CRUST[k]), 0.1 if k == 1 else -0.07, WARES)
paint(part, lathe(part, [(0.0, 0.0), (0.5, 0.0), (0.5, 0.1), (0.16, 0.16), (0.16, 0.42), (0.75, 0.5), (0.75, 0.58), (0.0, 0.58)], 12, Matrix.Translation((1.36, 1.7, SILL))), tone('#e9e2d2'), OWN, WARES)
kringla(part, (1.36, 1.7, SILL + 0.58 + 1.0), 0.94, 0.18, 6, 3, tone('#b97a36'), WARES, True)
made = finish(part, 'fonster-bread', sharp=40.0)
made['wide'] = 5.2

# Godis: three jars of sweets, a pile of sweets in their wrappers, a striped paper cone with sweets in it, and
# three lollipops in a stand. Nothing here is red: red is the candy he gathers.
part = new_part()
window(part, 6.8, (-1.8, 1.8))
GLOW = 0.17
for x, y, colour, lift in ((-1.0, 2.0, '#f2c230', 0.0), (0.2, 1.7, '#f08fb0', 0.0), (1.05, 2.4, '#6dbf6a', 0.6)):
    if lift > 0.0:
        stand(part, x - 0.75, x + 0.75, y - 0.7, y + 0.7, lift, WOOD, WARES)
    jar(part, (x, y, SILL + lift), 1.2, tone(colour), GLOW)
for x, y, z, colour, turn in ((-2.98, 1.4, 0.3, '#f2c230', 0.1), (-2.3, 1.5, 0.3, '#4aa3d8', -0.15), (-2.64, 1.5, 0.82, '#6dbf6a', 0.25)):
    wrapped(part, (x, y, SILL + z), 2.7, tone(colour), turn, GLOW)
# The cone stands with its point in a block of wood.
CONE = 2.62
paint(part, block(part, (CONE - 0.35, 1.35, SILL), (CONE + 0.35, 2.05, SILL + 0.45), 0.04), WOOD, OWN, WARES)
cone = lathe(part, [(0.0, 0.3), (0.3, 0.9), (0.62, 1.9), (0.5, 1.9), (0.0, 1.75)], 12, Matrix.Translation((CONE, 1.7, SILL)))
for item in cone:
    centre = item.calc_center_median()
    stripe = int((math.atan2(centre.y - 1.7, centre.x - CONE) + math.pi) / TAU * 12.0 + 0.01) % 2
    paint(part, [item], tone('#5379a3') if stripe == 0 else tone('#f6efdf'), OWN, GLOW)
for x, y, z, colour in ((-0.2, 1.6, 1.98, '#f2c230'), (0.18, 1.6, 2.0, '#f08fb0'), (0.0, 1.9, 2.12, '#6dbf6a'), (0.0, 1.45, 2.14, '#f08a2c')):
    paint(part, ball(part, (CONE + x, y, SILL + z), (0.22, 0.22, 0.22), 8, 5), tone(colour), OWN, GLOW)
# The lollipops: a round swirl on a stick, each facing the street.
paint(part, block(part, (-3.2, 2.2, SILL), (-2.1, 2.75, SILL + 0.4), 0.04), WOOD, OWN, WARES)
for x, lean, colour in ((-3.0, -0.16, '#f08a2c'), (-2.65, 0.0, '#4aa3d8'), (-2.3, 0.16, '#6dbf6a')):
    foot = Vector((x, 2.48, SILL + 0.4))
    top = foot + Vector((math.sin(lean) * 1.9, 0.0, math.cos(lean) * 1.9 + (0.5 if lean == 0.0 else 0.0)))
    paint(part, sweep(part, [foot, top], [0.04, 0.04], 5), tone('#f4ecdc'), OWN, GLOW)
    disc = lathe(part, [(0.0, -0.09), (0.4, -0.09), (0.5, 0.0), (0.4, 0.09), (0.0, 0.09)], 12, Matrix.Translation(top) @ Matrix.Rotation(math.radians(90), 4, 'X'))
    for item in disc:
        centre = item.calc_center_median() - top
        # A swirl of its colour with a narrow white stripe in it.
        swirl = int((math.atan2(centre.z, centre.x) + math.pi + math.sqrt(centre.x ** 2 + centre.z ** 2) * 2.4) / TAU * 12.0) % 3
        paint(part, [item], tone('#fff6ea') if swirl == 0 else tone(colour), OWN, GLOW)
made = finish(part, 'fonster-candy', sharp=40.0)
made['wide'] = 6.8


# --- the signs: carved wood, low on the wall, where he can see them --------------------------------------------

# A gilded kringla for the bakery, as a baker's sign has been for hundreds of years.
part = new_part()
kringla(part, (0.0, -0.42, 3.85), 1.22, 0.24, 6, 3, tone('#b88c3c'), 0.02, False)
for x in (-0.75, 0.75):
    paint(part, block(part, (x - 0.07, -0.3, 4.35), (x + 0.07, 0.0, 4.49)), IRON)
finish(part, 'skylt-bread', sharp=45.0, shade=0.6)

# A boot cut out of a board for the shoemaker's, 4.4 EL tall, with a pale sole and a pale band at its top.
part = new_part()
OUTLINE = [(-0.25, 1.0), (-0.25, 0.6), (-0.27, 0.35), (-0.29, 0.12), (-0.27, 0.0), (-0.02, 0.0), (-0.02, 0.07), (0.05, 0.07), (0.12, 0.02), (0.62, 0.02), (0.66, 0.1), (0.6, 0.2), (0.45, 0.28), (0.22, 0.38), (0.15, 0.55), (0.13, 1.0)]
TALL = 4.4
LOW = 3.2
MIDDLE = 0.185
front = [Vector(((x - MIDDLE) * TALL, -0.4, LOW + z * TALL)) for x, z in OUTLINE]
paint(part, [face(part, front, FRONT)], tone('#5a3f2c'))
for i in range(len(OUTLINE)):
    a = front[i]
    b = front[(i + 1) % len(OUTLINE)]
    edge = b - a
    paint(part, [face(part, (a, b, b + Vector((0.0, 0.3, 0.0)), a + Vector((0.0, 0.3, 0.0))), (edge.z, 0.0, -edge.x))], tone('#4a3324'))
paint(part, block(part, ((-0.29 - MIDDLE) * TALL, -0.46, LOW), ((0.64 - MIDDLE) * TALL, -0.4, LOW + 0.05 * TALL)), tone('#d9c8a4'))
paint(part, block(part, ((-0.25 - MIDDLE) * TALL, -0.46, LOW + 0.86 * TALL), ((0.13 - MIDDLE) * TALL, -0.4, LOW + 0.94 * TALL)), tone('#d9c8a4'))
finish(part, 'skylt-boots', shade=0.6)


# --- a yard: a low wall, a fence of boards, a gatepost, a hedge and a birch ------------------------------------

# Mur: 4 EL of the low concrete wall a fence stands on. Like a house's foot, it goes far down.
part = new_part()
rows = extrude(part, [(0.0, -0.25), (WIDE, -0.25)], 'z', -7.0, 0.42, (-1.0, 0.0))
paint(part, rows, STONE)
for item in rows:
    for loop in item.loops:
        loop[part['colour']] = stone_at(loop.vert.co.z, 9.0)
paint(part, extrude(part, [(0.25, 0.5), (-0.17, 0.5), (-0.25, 0.42)], 'x', 0.0, WIDE), dim(STONE, 1.08))
finish(part, 'mur', shade=0.5)

# Staket: four boards of a fence, flat-topped and weathered grey, on two rails. 3.8 EL of it.
part = new_part()
GREY = tone('#9a968c')
FENCE = 4.6
for k in range(4):
    x0 = 0.15 + 0.95 * k
    top = FENCE + (chance(k + 3) - 0.5) * 0.12
    boards = extrude(part, member(x0, x0 + 0.65, 0.15, 0.04), 'z', 0.62, top, (1.5,))
    boards.append(cap(part, member(x0, x0 + 0.65, 0.15, 0.04), 'z', top, (0.0, 0.0, 1.0)))
    move(part, boards, Matrix.Translation((0.0, -0.15, 0.0)))
    paint(part, boards, dim(GREY, (1.0, 0.93, 1.05, 0.97)[k]))
    for item in boards:
        for loop in item.loops:
            # Green and damp at the foot.
            if loop.vert.co.z < 0.7:
                loop[part['colour']] = (GREY[0] * 0.62, GREY[1] * 0.7, GREY[2] * 0.6, 1.0)
for z0 in (1.4, 3.5):
    paint(part, extrude(part, [(0.05, z0 + 0.4), (-0.15, z0 + 0.4), (-0.15, z0)], 'x', 0.0, 3.8), dim(GREY, 0.8))
made = finish(part, 'staket', shade=0.6)
made['wide'] = 3.8

# Grindstolpe: a concrete gatepost with a pointed cap.
part = new_part()
paint(part, block(part, (-0.6, -0.8, -0.5), (0.6, 0.4, 5.2), 0.07), tone('#a6a299'))
paint(part, solid(part, skin(part, [[Vector((-0.7, -0.9, 5.2)), Vector((0.7, -0.9, 5.2)), Vector((0.7, 0.5, 5.2)), Vector((-0.7, 0.5, 5.2))]], Vector((0.0, -0.2, 5.1)), Vector((0.0, -0.2, 5.75)))), tone('#b3afa6'))
finish(part, 'grindstolpe', shade=0.6)

# Hack: 6 EL of a hedge in October, lumpy, behind the fence. Its two ends are alike, so that it can go on.
part = new_part()
HEDGE = 6.0
SECTION = ((2.5, 0.0), (2.25, 2.2), (2.4, 4.0), (2.9, 5.2), (3.9, 5.6), (4.9, 5.1), (5.2, 3.0), (5.2, 0.0))
rings = []
for i in range(9):
    x = HEDGE * i / 8.0
    one = []
    for j in range(len(SECTION)):
        swell = 0.32 * math.sin(TAU * (i / 8.0) * 2.0 + j * 1.7) + 0.2 * math.sin(TAU * (i / 8.0) * 3.0 + j * 2.9 + 1.0)
        y = SECTION[j][0] - (swell if j < 4 else -swell * 0.5)
        z = SECTION[j][1] + (swell * 0.9 if 2 <= j <= 5 else 0.0)
        one.append(Vector((x, y, z)))
    rings.append(one)
hedge = skin(part, rings, closed=False)
for item in hedge:
    item.normal_update()
    centre = item.calc_center_median()
    if item.normal.dot(Vector((0.0, centre.y - 3.8, centre.z - 2.0))) < 0.0:
        item.normal_flip()
    for loop in item.loops:
        at = loop.vert.co
        patch = 0.5 + 0.5 * math.sin(TAU * (at.x / HEDGE) * 3.0 + at.z * 1.3)
        colour = blend(blend(tone('#566430'), tone('#7d8a3c'), min(1.0, at.z / 4.5)), tone('#b89a3e'), patch * 0.55 * min(1.0, at.z / 3.0))
        loop[part['colour']] = (colour[0], colour[1], colour[2], 1.0)
        loop[part['tint']].uv = (OWN, 0.0)
made = finish(part, 'hack', sharp=80.0, shade=0.35)
made['wide'] = HEDGE

# Bjork: a birch in the yard. Its white stem goes up out of the picture, with dark scars across it and rough
# dark bark at its foot, and twigs of yellow leaves hang down into the top of the picture.
part = new_part()
heights = [0.0, 0.7, 1.5]
z = 1.5
k = 0
while z < 15.0:
    k += 1
    z += 0.5 + chance(k) * 1.5
    heights.append(z)
    z += 0.16
    heights.append(z)
stem = lathe(part, [(1.35 - 0.3 * min(1.0, h / 3.0) - 0.012 * h, h) for h in heights], 10, Matrix.Translation((0.0, 5.2, 0.0)))
n = 0
for item in stem:
    n += 1
    centre = item.calc_center_median()
    low = min(item.verts[0].co.z, item.verts[1].co.z, item.verts[2].co.z)
    high = max(item.verts[0].co.z, item.verts[1].co.z, item.verts[2].co.z)
    if high < 1.6:
        paint(part, [item], tone('#4a443c') if chance(n) < 0.6 else tone('#6b655c'))
    elif high - low < 0.2 and chance(n * 1.3) < 0.45:
        paint(part, [item], tone('#3a362f'))
    else:
        paint(part, [item], tone('#ece6d8') if chance(n * 2.1) < 0.7 else tone('#dcd6c6'))
LEAVES = ('#e8b63a', '#f0cf5a', '#d99a2b', '#e2c24a')
n = 0
for strand in range(11):
    x = -5.6 + strand * 1.1 + chance(strand + 20) * 0.7
    y = 1.4 + chance(strand + 31) * 2.4
    long = 8 + int(chance(strand + 40) * 7.0)
    for k in range(long):
        n += 1
        # A twig hangs nearly straight down, with a leaf to one side and then to the other.
        at = Vector((x + (0.16 if k % 2 == 0 else -0.16) + (chance(n) - 0.5) * 0.2, y + (chance(n + 0.5) - 0.5) * 0.3, 13.8 - k * 0.42 - chance(n + 7) * 0.12))
        wide = 0.15 + chance(n + 3) * 0.06
        tilt = (0.5 if k % 2 == 0 else -0.5) + (chance(n + 5) - 0.5) * 0.6
        across = Vector((math.cos(tilt) * wide, 0.0, math.sin(tilt) * wide))
        down = Vector((math.sin(tilt) * 0.23, 0.0, -math.cos(tilt) * 0.23))
        leaf_points = (at, at + across + down * 0.9, at + down * 2.0, at - across + down * 0.9)
        colour = tone(LEAVES[n % 4])
        paint(part, [face(part, leaf_points, FRONT), face(part, leaf_points, (0.0, 1.0, 0.0))], colour, OWN, 0.22)
finish(part, 'bjork', sharp=50.0, shade=0.4)


# --- the shade of each part's own corners, baked into its colours ---------------------------------------------

scene = bpy.context.scene
before = scene.render.engine
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    pass
shaded = 0
if scene.render.engine == 'CYCLES':
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    if scene.world is not None:
        scene.world.light_settings.distance = 1.4
    parts = [made for made in scene.objects if made.type == 'MESH']
    # Each is shaded alone: the others stand aside while it is baked.
    for made in parts:
        made.hide_render = True
    for made in parts:
        mesh = made.data
        # One shade for each point. A flat face has points of its own, so its shade is its own too.
        occlusion = mesh.color_attributes.new('occlusion', 'FLOAT_COLOR', 'POINT')
        mesh.color_attributes.active_color = occlusion
        made.hide_render = False
        bpy.ops.object.select_all(action='DESELECT')
        made.select_set(True)
        bpy.context.view_layer.objects.active = made
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        made.hide_render = True
        strength = made['shade']
        occlusion = mesh.color_attributes['occlusion']
        colour = mesh.color_attributes['Color']
        for i in range(len(colour.data)):
            light = occlusion.data[mesh.loops[i].vertex_index].color[0]
            k = 1.0 - strength * (1.0 - min(1.0, light) ** 0.8)
            c = colour.data[i].color
            colour.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)
        mesh.color_attributes.remove(mesh.color_attributes['occlusion'])
        mesh.color_attributes.active_color = mesh.color_attributes['Color']
        shaded += 1
    for made in parts:
        made.hide_render = False
try:
    scene.render.engine = before
except TypeError:
    pass

total = 0
for made in scene.objects:
    if made.type == 'MESH':
        del made['shade']
        made.data.color_attributes.render_color_index = 0
        made.data.color_attributes.active_color_index = 0
        made.data.calc_loop_triangles()
        count = len(made.data.loop_triangles)
        total += count
        print('  ', made.name, count)
print('village kit built:', len(scene.objects), 'parts,', total, 'triangles,', shaded, 'shaded')
