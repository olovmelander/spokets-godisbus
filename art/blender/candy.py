"""Builds the candy kit (plan 4.3): every sweet in the game except the big one on its stick, which
big-candy.py builds.

  - the trail's sweets, after Olov's poster: a karamell in its twisted wrapper, a striped one, a polka swirl
    in a wrapper, a heart and a small swirl lollipop, and a plain little one for the shop's jars;
  - the sixteen kinds of hidden candy, each shaped as what it is, in the colours of src/content/kinds.ts;
  - the golden gelehallon, the glowing lollipop of the mist and the shrinking star;
  - Elof's Saturday bag, which the ghost takes, and the tear in it.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up, and a
sweet's front faces -Y, which is towards the camera in the game. Every sweet is an object of its own, named
as the game asks for it, with its middle at the origin. The bag stands on the origin.

Nothing here has a texture. A sweet's colours are painted on its corners (the colour attribute "Color"),
with the shade of its own creases baked into them. The first UV coordinate says how much of the game's own
colour a corner takes: 1 is all of it, 0 keeps the painted colour. That is how one karamell is red, the
next yellow, and the stripes stay white (src/render/candy.ts).

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


def fixed(colour):
    """A colour of the sweet's own: it takes none of the game's."""
    return (colour[0], colour[1], colour[2], 0.0)


WHITE = tone('#fff6ea')
STICK = tone('#f4ecdc')
# What takes the game's colour is painted white, and says so in its UV. The wrapper's paper takes most of it.
OWN = (1.0, 1.0, 1.0, 1.0)
PAPER = (1.0, 1.0, 1.0, 0.7)

# The one material: the colour attribute feeds the base colour, so that the exporter writes COLOR_0.
MATERIAL = bpy.data.materials.new('candy')
MATERIAL.use_nodes = True
for node in MATERIAL.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.3
        attribute = MATERIAL.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Color'
        MATERIAL.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])


def new_part():
    """One sweet while it is being built: its mesh, and the two layers its corners are painted in."""
    bm = bmesh.new()
    return {'bm': bm, 'colour': bm.loops.layers.float_color.new('Color'), 'tint': bm.loops.layers.uv.new('tint')}


def dab(part, loop, rgba):
    """Paints one corner: a colour, and how much of the game's colour it takes."""
    loop[part['colour']] = (rgba[0], rgba[1], rgba[2], 1.0)
    loop[part['tint']].uv = (rgba[3], 0.0)


def flat(part, faces, rgba):
    for face in faces:
        for loop in face.loops:
            dab(part, loop, rgba)


def split(part, faces, axis, limit, below, above):
    """Two colours with a crisp border: the faces whose middle lies below `limit` along an axis, and the rest."""
    for face in faces:
        flat(part, [face], below if face.calc_center_median()[axis] < limit else above)


def layered(part, faces, back, low, high, mirrored, inside, outside):
    """Layers through a box: `inside` where a face's height lies between low and high, once `back` has undone its tilt."""
    for face in faces:
        height = (back @ face.calc_center_median()).z
        if mirrored:
            height = abs(height)
        flat(part, [face], inside if low < height < high else outside)


def reach(part, faces, near, far, start, span, flatten):
    """A soft change of colour outwards from the middle, corner by corner."""
    for face in faces:
        for loop in face.loops:
            at = loop.vert.co
            away = math.sqrt(at.x ** 2 + at.z ** 2 + (0.0 if flatten else at.y ** 2))
            dab(part, loop, fixed(blend(near, far, (away - start) / span)))


def striped(part, quads, fans, wide, among, one, other):
    """Stripes that follow the faces round a turned shape: `wide` of every `among` segments are `one`."""
    for row in quads + fans:
        for j in range(len(row)):
            flat(part, [row[j]], one if j % among < wide else other)


def faces_of(verts):
    found = set()
    for vert in verts:
        for face in vert.link_faces:
            found.add(face)
    return list(found)


def skin(part, rings, first=None, last=None):
    """Quads between rings of points, each ring closed. `first` and `last` close an end with a fan.
    Gives the quads as [ring][segment], and the two fans."""
    bm = part['bm']
    made = [[bm.verts.new(point) for point in ring] for ring in rings]
    count = len(rings[0])
    quads = []
    for i in range(len(made) - 1):
        row = []
        for j in range(count):
            k = (j + 1) % count
            row.append(bm.faces.new((made[i][j], made[i][k], made[i + 1][k], made[i + 1][j])))
        quads.append(row)
    fans = []
    for point, ring in ((first, made[0]), (last, made[-1])):
        fan = []
        if point is not None:
            tip = bm.verts.new(point)
            for j in range(count):
                fan.append(bm.faces.new((ring[j], ring[(j + 1) % count], tip)))
        fans.append(fan)
    return quads, fans[0], fans[1]


def lathe(part, profile, segments, matrix, turn=None, ripple=None, squash=(1.0, 1.0)):
    """A profile of (radius, height) turned round Z, then placed by `matrix`. A radius of 0 at an end closes it.
    turn[i] turns ring i by that many segments (for stripes that wind), and ripple[i][j] scales a radius."""
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
        ring = []
        for j in range(segments):
            angle = TAU * (j + (turn[i] if turn else 0.0)) / segments
            wide = radius * (ripple[i][j] if ripple else 1.0)
            ring.append(matrix @ Vector((wide * math.cos(angle) * squash[0], wide * math.sin(angle) * squash[1], height)))
        rings.append(ring)
    return skin(part, rings, first, last)


def sweep(part, path, radii, segments, squash=1.0):
    """A round tube along a path of points, closed at both ends. Gives the quads as [ring][segment] and the fans."""
    rings = []
    normal = Vector((0.0, 1.0, 0.0))
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(normal)
        side.normalize()
        up = side.cross(ahead)
        ring = []
        for j in range(segments):
            angle = TAU * j / segments
            ring.append(path[i] + (side * math.cos(angle) + up * math.sin(angle) * squash) * radii[i])
        rings.append(ring)
    return skin(part, rings, path[0], path[-1])


def every(grid):
    return [face for row in grid for face in row]


def ball(part, centre, scale, segments=10, rings=6):
    """A sphere pulled into shape."""
    matrix = Matrix.Translation(centre) @ Matrix.Diagonal((scale[0], scale[1], scale[2], 1.0))
    made = bmesh.ops.create_uvsphere(part['bm'], u_segments=segments, v_segments=rings, radius=1.0, matrix=matrix)
    return faces_of(made['verts'])


def box(part, size, round_by, cuts=(), matrix=None):
    """A box with rounded edges, cut across at the given heights so that it can be painted in layers."""
    bm = part['bm']
    made = bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    edges = set()
    for vert in made['verts']:
        for edge in vert.link_edges:
            edges.add(edge)
    bevelled = bmesh.ops.bevel(bm, geom=list(edges), offset=round_by, offset_type='OFFSET', segments=3, profile=0.5, affect='EDGES')
    faces = set(bevelled['faces'])
    for vert in bevelled['verts']:
        for face in vert.link_faces:
            faces.add(face)
    for height in cuts:
        geom = set()
        for face in faces:
            if face.is_valid:
                geom.add(face)
                for edge in face.edges:
                    geom.add(edge)
                for vert in face.verts:
                    geom.add(vert)
        cut = bmesh.ops.bisect_plane(bm, geom=list(geom), dist=0.0001, plane_co=(0.0, 0.0, height), plane_no=(0.0, 0.0, 1.0))
        for item in cut['geom']:
            if isinstance(item, bmesh.types.BMFace):
                faces.add(item)
    faces = [face for face in faces if face.is_valid]
    if matrix is not None:
        moved = set()
        for face in faces:
            for vert in face.verts:
                moved.add(vert)
        bmesh.ops.transform(bm, matrix=matrix, verts=list(moved))
    return faces


ALONG_X = Matrix.Rotation(math.radians(90), 4, 'Y')
ALONG_Y = Matrix.Rotation(math.radians(-90), 4, 'X')


def finish(part, name, sharp=180.0, strength=0.6):
    """Makes the object, with smooth shading up to an angle."""
    bm = part['bm']
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if sharp < 180.0:
        mesh.set_sharp_from_angle(angle=math.radians(sharp))
    mesh.materials.append(MATERIAL)
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = strength
    return made


# --- the wrapper's twisted end, and the trail's sweets --------------------------------------------------------

# One end of a wrapper as (along, radius, pleat): out from the neck to the rim, and back in along its inside.
FAN = [
    (0.000, 0.024, 0.00),
    (0.027, 0.036, 0.12),
    (0.062, 0.064, 0.20),
    (0.097, 0.088, 0.24),
    (0.072, 0.066, 0.20),
    (0.037, 0.028, 0.10),
]
FAN_END = 0.022
PLEATS = 6


def folds(depths):
    """The pleats of a wrapper's paper: every other point of a ring stands out, by its ring's depth."""
    return [[1.0 + depth * (1.0 if j % 2 == 0 else -1.0) for j in range(PLEATS * 2)] for depth in depths]


def twist(part, at, side, scale, rgba):
    """One twisted end of a wrapper, opening along X from `at` towards `side`."""
    profile = [(radius * scale, along) for along, radius, fold in FAN] + [(0.0, FAN_END)]
    place = Matrix.Translation((at, 0.0, 0.0)) @ Matrix.Rotation(math.radians(90 * side), 4, 'Y')
    quads, first, last = lathe(part, profile, PLEATS * 2, place, ripple=folds([fold for along, radius, fold in FAN] + [0.0]))
    flat(part, every(quads) + last, rgba)


def wrapped(part, body, neck, turn_body=0.0):
    """A sweet in its wrapper, lying along X: `body` is its profile as (along, radius) from neck to neck.
    Paints the paper, and gives the sweet's own quads."""
    profile = [(0.0, -neck - FAN_END)]
    pleat = [0.0]
    for along, radius, fold in reversed(FAN):
        profile.append((radius, -neck - along))
        pleat.append(fold)
    start = len(profile)
    for along, radius in body:
        profile.append((radius, along))
        pleat.append(0.0)
    end = len(profile)
    for along, radius, fold in FAN:
        profile.append((radius, neck + along))
        pleat.append(fold)
    profile.append((0.0, neck + FAN_END))
    pleat.append(0.0)
    turn = [max(0, min(end - start, i - start + 1)) * turn_body for i in range(len(profile))]
    quads, first, last = lathe(part, profile, PLEATS * 2, ALONG_X, turn=turn, ripple=folds(pleat))
    # The lathe leaves out the two closing points, so its rows are numbered one less than the profile.
    flat(part, every(quads[: start - 2]) + every(quads[end - 1:]) + first + last, PAPER)
    return quads[start - 2: end - 1]


BODY = [(-0.118, 0.05), (-0.088, 0.082), (-0.046, 0.097), (0.0, 0.102), (0.046, 0.097), (0.088, 0.082), (0.118, 0.05)]

# Karamell: one colour, glossy, as most of the poster's.
part = new_part()
flat(part, every(wrapped(part, BODY, 0.134)), OWN)
finish(part, 'karamell', sharp=38.0)

# Randig: the same sweet with white stripes that wind round it.
part = new_part()
striped(part, wrapped(part, BODY, 0.134, turn_body=0.5), [], 2, 4, OWN, fixed(WHITE))
finish(part, 'randig', sharp=38.0)


def swirl(part, radius, thick, one, other):
    """A round, flat sweet with a swirl of two colours, facing -Y. Its stripes follow the faces, so they stay crisp."""
    profile = [
        (0.0, -thick), (radius * 0.34, -thick), (radius * 0.66, -thick * 0.94), (radius * 0.9, -thick * 0.66),
        (radius, 0.0),
        (radius * 0.9, thick * 0.66), (radius * 0.66, thick * 0.94), (radius * 0.34, thick), (0.0, thick),
    ]
    # Out from the middle the rings turn, so that each spoke bends: a swirl. It goes on round the rim to the back.
    turn = [0.0, 0.0, 0.9, 1.7, 2.3, 2.9, 3.7, 4.6, 4.6]
    quads, first, last = lathe(part, profile, 16, ALONG_Y, turn=turn)
    striped(part, quads, [first, last], 2, 4, one, other)


# Polka: a swirl in a wrapper.
part = new_part()
swirl(part, 0.108, 0.05, OWN, fixed(WHITE))
for side in (-1.0, 1.0):
    twist(part, side * 0.1, side, 1.0, PAPER)
finish(part, 'polka', sharp=38.0)

# Hjarta: a plump heart.
part = new_part()
outline = []
for j in range(24):
    t = TAU * j / 24
    outline.append((16.0 * math.sin(t) ** 3, 13.0 * math.cos(t) - 5.0 * math.cos(2 * t) - 2.0 * math.cos(3 * t) - math.cos(4 * t)))
rings = []
for wide, deep in ((0.42, 0.92), (0.74, 0.7), (0.93, 0.38), (1.0, 0.0), (0.93, -0.38), (0.74, -0.7), (0.42, -0.92)):
    rings.append([Vector((x * 0.0078 * wide, -deep * 0.062, (z + 2.2) * 0.0078 * wide + 0.004)) for x, z in outline])
quads, first, last = skin(part, rings, Vector((0.0, -0.064, 0.004)), Vector((0.0, 0.064, 0.004)))
flat(part, every(quads) + first + last, OWN)
finish(part, 'hjarta')

# Klubba: a small swirl lollipop.
part = new_part()
swirl(part, 0.112, 0.042, OWN, fixed(WHITE))
bmesh.ops.translate(part['bm'], vec=(0.0, 0.0, 0.07), verts=part['bm'].verts[:])
quads, first, last = lathe(part, [(0.0, -0.24), (0.013, -0.24), (0.013, 0.0)], 6, Matrix.Identity(4))
flat(part, every(quads) + first, fixed(STICK))
finish(part, 'klubba', sharp=50.0)

# Burk: the shop's jars hold hundreds, so this one is as plain as a wrapped sweet can be.
part = new_part()
quads, first, last = lathe(
    part, [(0.0, -0.2), (0.07, -0.2), (0.022, -0.12), (0.1, -0.05), (0.1, 0.05), (0.022, 0.12), (0.07, 0.2), (0.0, 0.2)],
    5, ALONG_X)
flat(part, every(quads) + first + last, OWN)
finish(part, 'burk', sharp=50.0, strength=0.35)


# --- the sixteen kinds of hidden candy, in the colours of src/content/kinds.ts ------------------------------

def raspberry(name, base, light):
    """A gelehallon: a little dome of round beads."""
    part = new_part()
    quads, first, last = lathe(
        part, [(0.0, -0.15), (0.14, -0.15), (0.16, -0.1), (0.15, 0.0), (0.11, 0.085), (0.055, 0.14), (0.0, 0.155)],
        12, Matrix.Identity(4))
    faces = every(quads) + first + last
    rows = ((8, 0.158, -0.092, 0.064, 0.0), (7, 0.14, 0.0, 0.062, 0.5), (5, 0.096, 0.085, 0.058, 0.2), (1, 0.0, 0.145, 0.056, 0.0))
    for count, out, height, size, shift in rows:
        for k in range(count):
            angle = TAU * (k + shift) / count
            faces += ball(part, (math.cos(angle) * out, math.sin(angle) * out, height), (size, size, size), 7, 5)
    reach(part, faces, base, light, 0.15, 0.07, False)
    return finish(part, name, strength=0.7)


raspberry('gelehallon', tone('#d8345a'), tone('#ff8fa8'))

# Gummibjorn: round, sitting, with its paws out.
part = new_part()
green = fixed(tone('#4caf50'))
pale = fixed(tone('#b6e86a'))
faces = ball(part, (0.0, 0.0, -0.035), (0.105, 0.085, 0.125), 10, 7)
faces += ball(part, (0.0, 0.0, 0.125), (0.094, 0.082, 0.084), 10, 7)
for side in (-1.0, 1.0):
    faces += ball(part, (side * 0.068, 0.0, 0.198), (0.036, 0.024, 0.036), 8, 5)
    faces += ball(part, (side * 0.102, -0.034, 0.02), (0.04, 0.05, 0.046), 8, 5)
    faces += ball(part, (side * 0.064, -0.04, -0.148), (0.05, 0.058, 0.046), 8, 5)
flat(part, faces, green)
flat(part, ball(part, (0.0, -0.036, -0.04), (0.072, 0.06, 0.088), 10, 6), pale)
flat(part, ball(part, (0.0, -0.066, 0.108), (0.04, 0.03, 0.03), 8, 5), pale)
finish(part, 'gummibjorn', strength=0.7)

# Skumbanan: a foam banana, paler along its inside.
part = new_part()
path = []
radii = []
for i in range(15):
    s = i / 14.0
    angle = math.radians(-62 + 124 * s)
    path.append(Vector((0.235 * math.sin(angle), 0.0, 0.18 - 0.235 * math.cos(angle))))
    radii.append(0.022 + 0.044 * math.sin(math.pi * s) ** 0.6)
quads, first, last = sweep(part, path, radii, 10, squash=0.9)
yellow = tone('#f2d24a')
cream = tone('#fff3a8')
for face in every(quads) + first + last:
    for loop in face.loops:
        at = loop.vert.co
        middle = 0.18 - math.sqrt(max(0.0, 0.235 ** 2 - at.x ** 2))
        dab(part, loop, fixed(blend(yellow, cream, (at.z - middle) / 0.05)))
finish(part, 'skumbanan')

# Skumsvamp: a foam mushroom with a plain pink cap. No dots: it is a sweet, not a fly agaric.
part = new_part()
profile = [
    (0.0, -0.2), (0.058, -0.2), (0.074, -0.17), (0.07, -0.06), (0.062, 0.0),
    (0.15, 0.0), (0.195, 0.03), (0.185, 0.085), (0.142, 0.14), (0.076, 0.178), (0.0, 0.19),
]
quads, first, last = lathe(part, profile, 14, Matrix.Identity(4))
flat(part, every(quads[:3]) + first, fixed(tone('#ffffff')))
flat(part, every(quads[3:]) + last, fixed(tone('#f4a6b8')))
finish(part, 'skumsvamp', sharp=60.0)

TILT = Matrix.Rotation(math.radians(14), 4, 'X') @ Matrix.Rotation(math.radians(-10), 4, 'Y')
UNTILT = TILT.inverted()

# Sockerbit: a soft cube in two layers.
part = new_part()
faces = box(part, (0.27, 0.27, 0.27), 0.05, cuts=(0.01,), matrix=TILT)
layered(part, faces, UNTILT, 0.01, 9.0, False, fixed(tone('#ff9fb6')), fixed(tone('#f7d6de')))
finish(part, 'sockerbit')

# Gummiorm: a wavy worm with rings, orange at one end and yellow at the other.
part = new_part()
path = []
radii = []
for i in range(27):
    s = i / 26.0
    x = -0.235 + 0.47 * s
    path.append(Vector((x, 0.0, 0.055 * math.sin(x * TAU / 0.3))))
    end = min(1.0, min(s, 1.0 - s) * 9.0) ** 0.5
    radii.append((0.047 if i % 2 == 0 else 0.04) * (0.35 + 0.65 * end))
quads, first, last = sweep(part, path, radii, 8)
split(part, every(quads) + first + last, 0, 0.0, fixed(tone('#f08a2c')), fixed(tone('#ffe066')))
finish(part, 'gummiorm')

# Chokladkola: chocolate with a layer of toffee through it.
part = new_part()
faces = box(part, (0.38, 0.21, 0.17), 0.035, cuts=(-0.03, 0.03), matrix=TILT)
layered(part, faces, UNTILT, -1.0, 0.03, True, fixed(tone('#c99562')), fixed(tone('#7a4a2a')))
finish(part, 'chokladkola')

# Colaflaska: a flat little bottle, dark below and pale above.
part = new_part()
profile = [
    (0.0, -0.215), (0.082, -0.215), (0.1, -0.195), (0.1, -0.09), (0.092, -0.06), (0.1, -0.03), (0.1, 0.02),
    (0.086, 0.07), (0.056, 0.11), (0.042, 0.14), (0.042, 0.182), (0.056, 0.188), (0.056, 0.212), (0.0, 0.222),
]
quads, first, last = lathe(part, profile, 12, Matrix.Identity(4), squash=(1.0, 0.62))
split(part, every(quads) + first + last, 2, -0.02, fixed(tone('#5a2d1a')), fixed(tone('#e8c690')))
finish(part, 'colaflaska', sharp=60.0)

# Chokladpeng: a coin in gold foil, with a milled edge. Its face is a plain raised round, with no mark on it.
part = new_part()
profile = [
    (0.0, -0.03), (0.096, -0.03), (0.112, -0.018), (0.152, -0.018), (0.164, -0.032), (0.192, -0.032), (0.2, -0.02),
    (0.2, 0.02), (0.192, 0.032), (0.164, 0.032), (0.152, 0.018), (0.112, 0.018), (0.096, 0.03), (0.0, 0.03),
]
milled = [[1.022 if (5 <= i <= 8 and j % 2 == 0) else 1.0 for j in range(28)] for i in range(len(profile))]
quads, first, last = lathe(part, profile, 28, ALONG_Y, ripple=milled)
foil = tone('#d9a93a')
shine = fixed(blend(foil, tone('#fff0a8'), 0.55))
for face in every(quads) + first + last:
    flat(part, [face], shine if abs(face.calc_center_median().y) > 0.0275 else fixed(foil))
finish(part, 'chokladpeng', sharp=32.0)

# Stekt agg: a fried egg, its white with a wavy edge.
part = new_part()
profile = [(0.0, -0.02), (0.1, -0.022), (0.168, -0.016), (0.2, 0.0), (0.168, 0.016), (0.1, 0.02), (0.0, 0.02)]
wavy = [
    [1.0 + (0.13 * math.cos(3 * TAU * j / 22 + 0.6) + 0.06 * math.cos(5 * TAU * j / 22 + 2.0)) * (0.5 if i == 1 or i == 5 else 1.0)
     for j in range(22)]
    for i in range(len(profile))
]
quads, first, last = lathe(part, profile, 22, ALONG_Y, ripple=wavy)
flat(part, every(quads) + first + last, fixed(tone('#fff7e0')))
flat(part, ball(part, (0.022, -0.026, 0.014), (0.086, 0.05, 0.086), 12, 6), fixed(tone('#f6c445')))
finish(part, 'stektagg', sharp=60.0)

# Sur napp: a sour dummy. A shield, a ring in front of it and a teat behind.
part = new_part()
blue = fixed(tone('#4aa3d8'))
ice = fixed(tone('#d6f0ff'))
quads, first, last = lathe(
    part, [(0.0, -0.02), (0.8, -0.02), (1.0, 0.0), (0.8, 0.02), (0.0, 0.02)], 18,
    ALONG_Y @ Matrix.Diagonal((0.2, 0.135, 1.0, 1.0)))
flat(part, every(quads) + first + last, blue)
path = []
for i in range(17):
    angle = TAU * i / 16
    path.append(Vector((0.078 * math.cos(angle), -0.062, 0.078 * math.sin(angle) - 0.012)))
quads, first, last = sweep(part, path, [0.02] * 17, 7)
flat(part, every(quads) + first + last, ice)
flat(part, ball(part, (0.0, -0.034, 0.045), (0.034, 0.03, 0.034), 8, 5), blue)
quads, first, last = lathe(
    part, [(0.036, 0.015), (0.034, 0.075), (0.056, 0.11), (0.066, 0.145), (0.05, 0.185), (0.0, 0.2)], 12, ALONG_Y)
flat(part, every(quads) + last, ice)
finish(part, 'surnapp', sharp=60.0)

# Lakritskonfekt: liquorice with two pink layers through it.
part = new_part()
faces = box(part, (0.25, 0.25, 0.21), 0.03, cuts=(-0.063, -0.021, 0.021, 0.063), matrix=TILT)
layered(part, faces, UNTILT, 0.021, 0.063, True, fixed(tone('#f08ab0')), fixed(tone('#3a2a3a')))
finish(part, 'lakritskonfekt')

# Polkagris: a white stick with red stripes that wind round it.
part = new_part()
profile = [(0.0, -0.235), (0.034, -0.228), (0.05, -0.2)]
for i in range(1, 8):
    profile.append((0.05, -0.2 + 0.05 * i))
profile += [(0.05, 0.2), (0.034, 0.228), (0.0, 0.235)]
quads, first, last = lathe(
    part, profile, 12, Matrix.Rotation(math.radians(32), 4, 'Y'), turn=[0.8 * i for i in range(len(profile))])
striped(part, quads, [first, last], 1, 3, fixed(tone('#e8483f')), fixed(tone('#f4efe6')))
finish(part, 'polkagris')

# Graddkola: a square toffee in waxed paper, twisted at both ends.
part = new_part()
flat(part, box(part, (0.21, 0.14, 0.14), 0.028), fixed(tone('#d9b382')))
for side in (-1.0, 1.0):
    twist(part, side * 0.1, side, 0.95, fixed(tone('#fff0d0')))
finish(part, 'graddkola', sharp=38.0)

# Salmiakruta: a black lozenge with cut edges, dusted pale.
part = new_part()
corners = ((0.215, 0.0), (0.0, 0.135), (-0.215, 0.0), (0.0, -0.135))
rings = []
for wide, deep in ((0.66, -0.045), (1.0, -0.016), (1.0, 0.016), (0.66, 0.045)):
    rings.append([Vector((x * wide, deep, z * wide)) for x, z in corners])
quads, first, last = skin(part, rings, Vector((0.0, -0.045, 0.0)), Vector((0.0, 0.045, 0.0)))
night = tone('#2a2a2e')
dust = tone('#d8d8e0')
flat(part, first + last, fixed(blend(night, dust, 0.1)))
flat(part, quads[0] + quads[2], fixed(blend(night, dust, 0.36)))
flat(part, quads[1], fixed(night))
bmesh.ops.rotate(part['bm'], cent=(0.0, 0.0, 0.0), matrix=Matrix.Rotation(math.radians(-18), 3, 'Y'), verts=part['bm'].verts[:])
finish(part, 'salmiakruta', sharp=20.0, strength=0.3)

# Chokladpralin: a dome of dark chocolate in a pleated paper cup, with a golden pearl on top.
part = new_part()
quads, first, last = lathe(
    part, [(0.0, -0.1), (0.15, -0.1), (0.168, -0.06), (0.162, 0.0), (0.128, 0.07), (0.07, 0.118), (0.0, 0.132)],
    14, Matrix.Identity(4))
flat(part, every(quads) + first + last, fixed(tone('#5a3620')))
profile = [(0.0, -0.118), (0.13, -0.118), (0.172, -0.07), (0.205, -0.012), (0.19, -0.02), (0.165, -0.06), (0.0, -0.1)]
quads, first, last = lathe(
    part, profile, 20, Matrix.Identity(4),
    ripple=[[1.045 if j % 2 == 0 else 0.975 for j in range(20)] for i in range(len(profile))])
flat(part, every(quads) + first + last, fixed(tone('#d9a93a')))
flat(part, ball(part, (0.0, 0.0, 0.14), (0.034, 0.034, 0.03), 8, 5), fixed(tone('#ffe08a')))
finish(part, 'chokladpralin', sharp=50.0)


# --- the magic candy: it glitters, and the game makes it glow ----------------------------------------------

raspberry('guldhallon', tone('#ffc93a'), tone('#fff3b0'))

# Lysklubba: the lollipop that lights the mist, without its stick. A swirl like the trail's, but big and
# golden: the game lets it give off its own colours, so it looks lit from within.
part = new_part()
swirl(part, 0.22, 0.085, fixed(tone('#ffab2e')), fixed(tone('#fff4c8')))
finish(part, 'lysklubba', strength=0.3)

# Stjarna: the shrinking star, plump and five-pointed.
part = new_part()
points = []
for j in range(10):
    angle = TAU * j / 10
    far = 0.3 if j % 2 == 0 else 0.135
    points.append((math.sin(angle) * far, math.cos(angle) * far))
rings = []
for wide, deep in ((0.5, -0.07), (0.86, -0.04), (1.0, 0.0), (0.86, 0.04), (0.5, 0.07)):
    rings.append([Vector((x * wide, deep, z * wide)) for x, z in points])
quads, first, last = skin(part, rings, Vector((0.0, -0.085, 0.0)), Vector((0.0, 0.085, 0.0)))
reach(part, every(quads) + first + last, tone('#fff4b8'), tone('#ffd75a'), 0.0, 0.2, True)
finish(part, 'stjarna', sharp=50.0, strength=0.4)


# --- the Saturday bag: striped paper, pinked at its top, open, with sweets looking out ---------------------

def outline(wide, deep, height, count, lift=None):
    """A ring with a rounded-rectangle outline, lying flat at a height, its points evenly spaced along it."""
    fine = []
    for k in range(720):
        angle = TAU * k / 720
        c = math.cos(angle)
        s = math.sin(angle)
        fine.append(((abs(c) ** 0.4) * (1.0 if c >= 0 else -1.0) * wide / 2.0, (abs(s) ** 0.4) * (1.0 if s >= 0 else -1.0) * deep / 2.0))
    along = [0.0]
    for k in range(1, 721):
        a = fine[k - 1]
        b = fine[k % 720]
        along.append(along[-1] + math.sqrt((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2))
    ring = []
    k = 0
    for j in range(count):
        want = along[-1] * j / count
        while along[k + 1] < want:
            k += 1
        ring.append(Vector((fine[k][0], fine[k][1], height + (lift[j] if lift else 0.0))))
    return ring


SIDES = 32
part = new_part()
pinked = [0.02 if j % 2 == 0 else -0.012 for j in range(SIDES)]
rings = [
    outline(0.33, 0.21, 0.0, SIDES),
    outline(0.40, 0.27, 0.08, SIDES),
    outline(0.43, 0.30, 0.24, SIDES),
    outline(0.42, 0.28, 0.40, SIDES),
    outline(0.40, 0.22, 0.52, SIDES),
    outline(0.41, 0.19, 0.60, SIDES, lift=pinked),
    outline(0.385, 0.165, 0.585, SIDES, lift=pinked),
    outline(0.36, 0.17, 0.47, SIDES),
]
quads, first, last = skin(part, rings, Vector((0.0, 0.0, 0.0)), Vector((0.0, 0.0, 0.45)))
paper = fixed(tone('#efdfbd'))
striped(part, quads[:5], [], 2, 4, fixed(tone('#5379a3')), paper)
flat(part, first, paper)
flat(part, every(quads[5:]) + last, fixed(tone('#8f7350')))
# What he chose on Saturday looks out over the edge.
PEEKING = (
    (-0.11, 0.0, 0.57, 0.055, '#e8483f'), (0.0, 0.01, 0.6, 0.06, '#f6c445'), (0.105, -0.01, 0.575, 0.052, '#58b368'),
    (-0.05, -0.03, 0.545, 0.045, '#ef7fb0'), (0.06, 0.03, 0.55, 0.045, '#4a90d9'),
)
for x, y, z, size, colour in PEEKING:
    flat(part, ball(part, (x, y, z), (size, size * 0.8, size), 8, 5), fixed(tone(colour)))
finish(part, 'lordagspase', sharp=50.0, strength=0.55)

# Reva: the tear at the bag's hinge, a jagged rip that is dark inside. It lies in the bag's front.
part = new_part()
points = []
jagged = (0.085, 0.03, 0.06, 0.022, 0.075, 0.028, 0.05, 0.02, 0.07, 0.03, 0.055, 0.024)
for j in range(12):
    angle = TAU * j / 12 + 0.2
    points.append(Vector((math.cos(angle) * jagged[j] * 1.3, 0.0, math.sin(angle) * jagged[j] * 0.75)))
behind = [point + Vector((0.0, 0.004, 0.0)) for point in points]
quads, first, last = skin(part, [points, behind], Vector((0.0, -0.002, 0.0)), Vector((0.0, 0.006, 0.0)))
flat(part, every(quads) + first + last, fixed(tone('#5d4433')))
finish(part, 'reva', sharp=20.0, strength=0.0)


# --- the shade of each sweet's own creases, baked into its colours ------------------------------------------

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
        scene.world.light_settings.distance = 0.22
    sweets = [made for made in scene.objects if made.type == 'MESH']
    # Each is shaded alone: the others stand aside while it is baked.
    for made in sweets:
        made.hide_render = True
    for made in sweets:
        mesh = made.data
        # One shade for each point, so that a smooth sweet stays smooth: its corners agree where they meet.
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
    for made in sweets:
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
        total += len(made.data.loop_triangles)
print('candy kit built:', len(scene.objects), 'sweets,', total, 'triangles,', shaded, 'shaded')
