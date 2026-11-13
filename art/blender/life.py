"""Builds the pictures of the far scenery's life (src/content/life.ts): one atlas of 1024 by 1024, carried as the
texture of a plane called "life", for art/baked/boot/life.glb.

Run it inside Blender, after two first lines that set where things go:
    OUT = r'C:/.../art/baked/boot/life.glb'      the model; this script writes life.json beside it
    WORK = r'C:/.../some/scratch/folder'         where the moose's frames are rendered to, and a preview
and then send scripts/bake/export.py, with the same OUT. Headless:
    blender -b --factory-startup --python-expr "OUT=r'...'; WORK=r'...';
        exec(open('art/blender/life.py').read()); exec(open('scripts/bake/export.py').read())"

What is in the atlas, and where, is STRIPS below: the same table as in src/content/life.ts (a test holds the
two together, through life.json).

- The moose is built here from numbers: a body, a neck, a head, legs, ears and antlers, each a tube through a
  few stations. There is no armature. For every cell a gait puts the joints where they belong, the parts are
  built anew, and Cycles renders the animal from the side, without perspective, on a clear film, through a
  wide filter: it is as soft as a far picture. It is grey, lit along its back: the game gives it its colour,
  mixed with the place's haze. The legs of its far side are rendered half clear, so that they are paler than
  the near ones. Twelve cells are a cycle of its walk, and six are it standing: stopped, its head coming up and
  turning to the camera, looking, and with one ear laid back.
- The forest's bigger life, the same way: a moose cow with her calf at her heels, a roe deer (who stops and looks up
  as the moose does) and a brown bear, each with a body, legs and a gait of its own.
- The far flocks, the same way: a crane and a goose, each with a body, a neck, a head and wings that beat and bend at
  the wrist, rendered from a little below in eight cells a wingbeat (the creature overhaul, 13 November 2026).
- The smoke, the far window and the shooting star are drawn here, in white, from plain shapes.

Nothing in it comes from anyone else: no model, no picture, no photograph. It empties the scene first.
Units: 1 Blender unit is 1 EL. Z is up, the animal faces +X, and the camera looks along +Y.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import json
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)
for item in list(bpy.data.images):
    if item.users == 0:
        bpy.data.images.remove(item)

WIDE = 1024
TALL = 1024
# name: left, top, a cell's width and height, how many cells, how many in a row
STRIPS = {
    'walk': (0, 0, 160, 128, 12, 6),
    'stand': (0, 384, 160, 128, 6, 6),
    'crane': (128, 256, 96, 48, 8, 4),
    'goose': (640, 256, 96, 48, 8, 4),
    'puff': (960, 0, 64, 64, 1, 1),
    'dot': (960, 64, 32, 32, 1, 1),
    'streak': (0, 256, 128, 64, 1, 1),
    # The forest's bigger life (the lower half): a moose cow with her calf at her heels, a bear, and a roe deer,
    # which stops, looks up and walks on.
    'pair': (0, 512, 204, 96, 12, 5),
    'bear': (408, 704, 96, 64, 12, 6),
    'deer': (0, 832, 96, 72, 12, 10),
    'deerStand': (192, 904, 96, 72, 6, 6),
}

# The picture, as Blender keeps one: four numbers a pixel, rows from the bottom. White and clear to begin with,
# so that no dark edge shows where a soft shape thins out.
atlas = [1.0, 1.0, 1.0, 0.0] * (WIDE * TALL)


def dab(x, y, alpha, shade):
    """One pixel: x from the left and y from the top, as the game counts."""
    at = ((TALL - 1 - y) * WIDE + x) * 4
    atlas[at] = shade
    atlas[at + 1] = shade
    atlas[at + 2] = shade
    atlas[at + 3] = alpha


def cell_origin(name, cell):
    strip = STRIPS[name]
    return strip[0] + (cell % strip[5]) * strip[2], strip[1] + (cell // strip[5]) * strip[3]


def clamp(value):
    return max(0.0, min(1.0, value))


# --- the drawn cells -----------------------------------------------------------------------------------------

# A puff of smoke: a few soft rounds, heaped.
left, top = cell_origin('puff', 0)
PUFFS = [(32.0, 33.0, 27.0), (20.0, 27.0, 17.0), (43.0, 24.0, 16.0), (45.0, 40.0, 16.0), (22.0, 43.0, 17.0), (33.0, 18.0, 14.0)]
for y in range(64):
    for x in range(64):
        thick = 0.0
        for puff in PUFFS:
            away = math.hypot(x + 0.5 - puff[0], y + 0.5 - puff[1]) / puff[2]
            if away < 1.0:
                thick += (1.0 - away * away) ** 2
        rim = math.hypot(x + 0.5 - 32.0, y + 0.5 - 32.0) / 31.0
        # No flat middle and no edge: thick where the rounds lie over each other, thinning out to nothing.
        alpha = (1.0 - math.exp(-thick * 1.3)) * clamp(1.0 - rim ** 4)
        if alpha > 0.0:
            dab(left + x, top + y, alpha, 1.0)

# A far light: a small bright middle in a soft glow.
left, top = cell_origin('dot', 0)
for y in range(32):
    for x in range(32):
        away = math.hypot(x + 0.5 - 16.0, y + 0.5 - 16.0)
        alpha = clamp((15.0 - away) / 9.0) ** 1.6
        if alpha > 0.0:
            dab(left + x, top + y, alpha, 1.0)

# A shooting star, falling to the left: its head bright and low, its tail thinning out behind and above it.
left, top = cell_origin('streak', 0)
TAIL = (118.0, 9.0)
HEAD = (11.0, 54.0)
for y in range(64):
    for x in range(128):
        dx = HEAD[0] - TAIL[0]
        dy = HEAD[1] - TAIL[1]
        along = clamp(((x + 0.5 - TAIL[0]) * dx + (y + 0.5 - TAIL[1]) * dy) / (dx * dx + dy * dy))
        away = math.hypot(x + 0.5 - TAIL[0] - dx * along, y + 0.5 - TAIL[1] - dy * along)
        width = 0.9 + 1.9 * along
        alpha = along ** 1.6 * math.exp(-(away / width) ** 2)
        if alpha > 0.004:
            dab(left + x, top + y, clamp(alpha), 1.0)

# --- the moose ---------------------------------------------------------------------------------------------------
#
# A bull, 1.9 EL at the shoulder: a deep chest under a high hump, a back that falls to the rump, a short thick
# neck carried low, a long head with a heavy nose, a bell under its throat, and palms with tines. Its legs are
# long, and it lifts its hooves high, as a moose does in a bog.

CELL = (160, 128)
# How many EL a cell is wide, and how far over its bottom edge the hooves stand.
SCALE = 4.0
GROUND = 0.25
# The walk: how far the body goes in one cycle, the part of the cycle a hoof stands, and how high it is lifted.
STRIDE = 1.35
DUTY = 0.62
LIFT = 0.26
# A slow walk in which each side's hind hoof lands just before its fore hoof.
OFFSET = {'HL': 0.0, 'FL': 0.2, 'HR': 0.5, 'FR': 0.7}
# Its left side is the far one: the camera looks at its right.
SIDE = {'L': 0.18, 'R': -0.18}
# Where each pair of legs leaves the body, the two bones of a leg, which way its middle joint bends, and where
# the hoof is under the body halfway through its stand.
TOP = {'F': (0.50, 1.20), 'H': (-0.70, 1.30)}
BONES = {'F': (0.60, 0.565), 'H': (0.69, 0.63)}
# How far a leg's top joint may ride up and down in the body: the shoulder blade slides, so that a leg that
# carries weight is nearly straight, and the hump rolls.
RIDE = {'F': (-0.04, 0.06), 'H': (-0.02, 0.02)}
BEND = {'F': 1.0, 'H': -1.0}
REST = {'F': 0.03, 'H': -0.10}
# The cell it stops after: the two hooves in the air are then close to the ground, and are set down.
HALT = 5
CAMERA_X = 0.34


def paint(name, grey, alpha):
    made = bpy.data.materials.new(name)
    made.use_nodes = True
    for node in made.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Base Color'].default_value = (grey, grey, grey, 1.0)
            node.inputs['Roughness'].default_value = 1.0
            node.inputs['Specular IOR Level'].default_value = 0.0
            node.inputs['Alpha'].default_value = alpha
    return made


HIDE = paint('moose-hide', 0.36, 1.0)
# The far legs: the same hide with the air in it.
FAR = paint('moose-far', 0.36, 0.5)
HORN = paint('moose-antler', 0.62, 1.0)
PARTS = []


def finish(bm, name, material, turn):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    made = bpy.data.objects.new(name, mesh)
    made.matrix_world = turn
    smooth = made.modifiers.new('smooth', 'SUBSURF')
    smooth.levels = 2
    smooth.render_levels = 2
    bpy.context.scene.collection.objects.link(made)
    PARTS.append(made)
    return made


def tube(name, stations, material, turn):
    """A tube through stations in the part's own X-Z plane: each is x, z, half its width across (along Y), and
    half its thickness in the plane. Its ends are rounded."""
    around = 10
    bm = bmesh.new()
    rings = []
    count = len(stations)
    for i in range(count):
        x, z, across, thick = stations[i]
        before = stations[max(0, i - 1)]
        after = stations[min(count - 1, i + 1)]
        tx = after[0] - before[0]
        tz = after[1] - before[1]
        length = math.hypot(tx, tz) or 1.0
        ring = []
        for k in range(around):
            a = math.tau * k / around
            ring.append(bm.verts.new((x - math.sin(a) * thick * tz / length, math.cos(a) * across, z + math.sin(a) * thick * tx / length)))
        rings.append(ring)
    for i in range(count - 1):
        for k in range(around):
            j = (k + 1) % around
            bm.faces.new((rings[i][k], rings[i][j], rings[i + 1][j], rings[i + 1][k]))
    for ring, at, toward in ((rings[0], stations[0], stations[1]), (rings[-1], stations[-1], stations[-2])):
        dx = at[0] - toward[0]
        dz = at[1] - toward[1]
        length = math.hypot(dx, dz) or 1.0
        reach = min(at[2], at[3]) * 0.7
        tip = bm.verts.new((at[0] + dx / length * reach, 0.0, at[1] + dz / length * reach))
        for k in range(around):
            bm.faces.new((ring[k], ring[(k + 1) % around], tip))
    return finish(bm, name, material, turn)


def stick(name, a, b, r0, r1, material, turn):
    """A tapered stick from a to b, in the frame of `turn`."""
    way = Vector(b) - Vector(a)
    long = way.length
    place = turn @ Matrix.Translation(a) @ Vector((1.0, 0.0, 0.0)).rotation_difference(way).to_matrix().to_4x4()
    return tube(name, [(0.0, 0.0, r0, r0), (long * 0.5, 0.0, (r0 + r1) / 2.0, (r0 + r1) / 2.0), (long, 0.0, r1, r1)], material, place)


def ball(name, middle, along, across, size, material, turn):
    """A flattened round: `size` is half its length along `along`, half its width towards `across`, and half its thickness."""
    x = Vector(along).normalized()
    z = Vector(across)
    z = (z - x * z.dot(x)).normalized()
    y = z.cross(x)
    frame = Matrix(((x.x, y.x, z.x, middle[0]), (x.y, y.y, z.y, middle[1]), (x.z, y.z, z.z, middle[2]), (0.0, 0.0, 0.0, 1.0)))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=8, radius=1.0, matrix=Matrix.Diagonal((size[0], size[2], size[1], 1.0)))
    return finish(bm, name, material, turn @ frame)


def mix(a, b, t):
    return a + (b - a) * t


def hoof(phase, planted):
    """Where a hoof is from its place of rest: along, and up. While it stands it goes back under the body as
    fast as the body goes on."""
    half = STRIDE * DUTY / 2.0
    if phase < DUTY:
        return half - STRIDE * phase, 0.0
    t = (phase - DUTY) / (1.0 - DUTY)
    if planted:
        return (half if t > 0.5 else -half), 0.0
    ease = t * t * (3.0 - 2.0 * t)
    return half * (2.0 * ease - 1.0), LIFT * math.sin(math.pi * t) ** 1.2


def leg(which, side, phase, bob, planted):
    """A leg's top joint, its middle joint and its ankle: two bones of fixed length from the body to the hoof."""
    tx = TOP[which][0]
    along, up = hoof((phase + OFFSET[which + side]) % 1.0, planted)
    dx = REST[which] + along
    a, b = BONES[which]
    straight = math.sqrt(max(0.0, ((a + b) * 0.985) ** 2 - dx * dx)) + 0.09
    tz = max(TOP[which][1] + RIDE[which][0], min(TOP[which][1] + RIDE[which][1], straight)) + bob
    dz = up + 0.09 - tz
    reach = min(a + b - 0.002, math.hypot(dx, dz))
    aim = math.atan2(dz, dx)
    bend = math.acos(max(-1.0, min(1.0, (a * a + reach * reach - b * b) / (2.0 * a * reach))))
    knee = aim + BEND[which] * bend
    return (tx, tz), (tx + a * math.cos(knee), tz + a * math.sin(knee)), (tx + reach * math.cos(aim), tz + reach * math.sin(aim))


def between(a, b, t, across, thick):
    return (mix(a[0], b[0], t), mix(a[1], b[1], t), across, thick)


def clear_parts():
    for part in PARTS:
        mesh = part.data
        bpy.data.objects.remove(part, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    PARTS.clear()


def build(phase, planted, lift, look, flick, antlers=True, bell=True, clear=True):
    """The whole animal at a moment of its walk. `lift` raises its head, `look` turns it to the camera, and
    `flick` lays its near ear back: each from 0 to 1. A cow has no antlers, and a calf no bell either."""
    if clear:
        clear_parts()
    still = Matrix.Identity(4)
    # The body rises and falls a little twice a cycle, and the hump rolls as the shoulders take the weight.
    bob = 0.02 * math.cos(4.0 * math.pi * phase)
    roll = 0.5 * (leg('F', 'L', phase, 0.0, planted)[0][1] + leg('F', 'R', phase, 0.0, planted)[0][1]) - TOP['F'][1]
    # The body's line from the rump to the chest: x, its top, its underside, and half its width.
    profile = [
        (-1.02, 1.50, 1.30, 0.10), (-0.92, 1.62, 1.17, 0.22), (-0.70, 1.70, 1.08, 0.30), (-0.35, 1.70, 1.04, 0.33),
        (0.00, 1.76, 0.99, 0.35), (0.30, 1.90 + roll * 0.5, 0.95, 0.35), (0.52, 2.00 + roll, 0.96, 0.31),
        (0.72, 1.93 + roll * 0.5, 1.02, 0.25), (0.90, 1.76, 1.18, 0.15),
    ]
    tube('body', [(x, (top + under) / 2.0 + bob, wide, (top - under) / 2.0) for x, top, under, wide in profile], HIDE, still)
    stick('tail', (-1.01, 0.0, 1.48 + bob), (-1.09, 0.0, 1.33 + bob), 0.045, 0.02, HIDE, still)

    # The legs: the far pair first, paler.
    for side in ('L', 'R'):
        hide = FAR if side == 'L' else HIDE
        across = Matrix.Translation((0.0, SIDE[side], 0.0))
        top, knee, ankle = leg('F', side, phase, bob, planted)
        tube('fore' + side, [
            (top[0] + 0.03, top[1] + 0.30, 0.10, 0.20), (top[0], top[1], 0.09, 0.15), between(top, knee, 0.55, 0.066, 0.098),
            (knee[0], knee[1], 0.06, 0.078), between(knee, ankle, 0.5, 0.05, 0.06), between(knee, ankle, 0.92, 0.054, 0.066),
            (ankle[0] + 0.03, ankle[1] - 0.05, 0.06, 0.088),
        ], hide, across)
        top, hock, ankle = leg('H', side, phase, bob, planted)
        tube('hind' + side, [
            (top[0] + 0.10, top[1] + 0.26, 0.13, 0.25), (top[0], top[1], 0.115, 0.20), between(top, hock, 0.5, 0.078, 0.115),
            (hock[0], hock[1], 0.06, 0.082), between(hock, ankle, 0.5, 0.05, 0.061), between(hock, ankle, 0.92, 0.054, 0.066),
            (ankle[0] + 0.03, ankle[1] - 0.05, 0.06, 0.088),
        ], hide, across)

    # The head hangs from the end of the neck: low and nodding in the walk, up and level when it looks.
    nod = 0.0 if planted else 0.03 * math.sin(4.0 * math.pi * phase + 0.6)
    up = lift * lift * (3.0 - 2.0 * lift)
    joint = (mix(1.22, 1.12, up), mix(1.78, 2.00, up) + bob + nod)
    pitch = math.radians(mix(32.0, 12.0, up))
    head = Matrix.Translation((joint[0], 0.0, joint[1])) @ Matrix.Rotation(math.radians(-42.0) * look, 4, 'Z') @ Matrix.Rotation(pitch, 4, 'Y')
    base = (0.64, 1.50 + bob)
    bow = ((base[0] + joint[0]) / 2.0, (base[1] + joint[1]) / 2.0 - 0.04 + 0.05 * up)
    neck = []
    for i in range(4):
        t = i / 3.0
        neck.append((
            (1.0 - t) ** 2 * base[0] + 2.0 * t * (1.0 - t) * bow[0] + t * t * joint[0],
            (1.0 - t) ** 2 * base[1] + 2.0 * t * (1.0 - t) * bow[1] + t * t * joint[1],
            mix(0.23, 0.13, t), mix(0.41, 0.18, t),
        ))
    tube('neck', neck, HIDE, still)
    tube('head', [
        (-0.08, 0.02, 0.11, 0.13), (0.09, 0.035, 0.135, 0.165), (0.26, 0.015, 0.11, 0.14), (0.43, -0.005, 0.095, 0.125),
        (0.57, -0.03, 0.105, 0.145), (0.68, -0.065, 0.10, 0.14), (0.74, -0.09, 0.08, 0.11),
    ], HIDE, head)
    # The bell hangs straight down from the throat, whatever the head does.
    throat = head @ Vector((0.22, 0.0, -0.11))
    if bell:
        stick('bell', (throat.x, throat.y, throat.z), (throat.x + 0.02, throat.y, throat.z - (0.26 if antlers else 0.14)), 0.075, 0.03, HIDE, still)

    for side in (1.0, -1.0):
        # An ear: up and out, laid back by a flick, and pricked when it looks.
        lean = (mix(-0.35, -0.08, up), side * 0.42, mix(0.80, 0.92, up))
        if side < 0.0:
            lean = (mix(lean[0], -0.85, flick), mix(lean[1], -0.30, flick), mix(lean[2], 0.38, flick))
        way = Vector(lean).normalized()
        root = Vector((-0.07, side * 0.11, 0.09))
        ball('ear', root + way * 0.14, way, (1.0, 0.0, 0.0), (0.15, 0.06, 0.02), HIDE, head)
        if not antlers:
            continue
        # An antler: a beam out to the side, a broad palm that stands up and back like an open hand, short thick
        # tines along its upper edge and its end, and two brow tines forward.
        stick('beam', (0.04, side * 0.08, 0.12), (-0.12, side * 0.30, 0.24), 0.055, 0.05, HORN, head)
        middle = Vector((-0.32, side * 0.42, 0.31))
        back = Vector((-0.95, side * 0.10, 0.10)).normalized()
        out = Vector((-0.45, side * 0.52, 0.72))
        out = (out - back * out.dot(back)).normalized()
        ball('palm', middle, back, out, (0.30, 0.23, 0.04), HORN, head)
        for along, far in ((-0.24, 0.31), (-0.10, 0.37), (0.05, 0.39), (0.20, 0.36), (0.36, 0.24), (0.44, 0.07)):
            stick('tine', middle + back * along * 0.8 + out * 0.12, middle + back * along + out * far, 0.055, 0.022, HORN, head)
        stick('brow', (-0.02, side * 0.20, 0.20), (0.22, side * 0.26, 0.27), 0.045, 0.018, HORN, head)
        stick('brow', (-0.04, side * 0.26, 0.23), (0.17, side * 0.40, 0.35), 0.045, 0.018, HORN, head)


# --- the bigger life of the forest: a moose cow and her calf, a roe deer, a bear -------------------------------
#
# The cow is the bull without its antlers, a little smaller; her calf is the same animal at six tenths of her size,
# without a bell, at her heels, taking two steps to her one. The deer and the bear have bodies, legs and gaits of
# their own, built as the moose is: tubes through stations, two bones a leg, a hoof or a paw that stands while the
# body goes on.


def pair_part(phase, at, size, antlers, bell, stride):
    """The moose builder at `at` along X and `size` times as big, with a stride of its own."""
    global STRIDE
    keep = STRIDE
    STRIDE = stride
    before = len(PARTS)
    build(phase, False, 0.0, 0.0, 0.0, antlers=antlers, bell=bell, clear=False)
    STRIDE = keep
    move = Matrix.Translation((at, 0.0, 0.0)) @ Matrix.Scale(size, 4)
    for part in PARTS[before:]:
        part.matrix_world = move @ part.matrix_world


PAIR = {'cow': (0.95, 0.94), 'calf': (-1.55, 0.6)}
# What the cow's body goes on in one cycle: her calf takes two steps of its own in it.
PAIR_STRIDE = STRIDE * PAIR['cow'][1]


def build_pair(phase):
    clear_parts()
    pair_part(phase, PAIR['cow'][0], PAIR['cow'][1], False, True, STRIDE)
    pair_part((2.0 * phase + 0.3) % 1.0, PAIR['calf'][0], PAIR['calf'][1], False, False, PAIR_STRIDE / (2.0 * PAIR['calf'][1]))


def g_hoof(g, phase, planted):
    half = g['stride'] * g['duty'] / 2.0
    if phase < g['duty']:
        return half - g['stride'] * phase, 0.0
    t = (phase - g['duty']) / (1.0 - g['duty'])
    if planted:
        return (half if t > 0.5 else -half), 0.0
    ease = t * t * (3.0 - 2.0 * t)
    return half * (2.0 * ease - 1.0), g['lift'] * math.sin(math.pi * t) ** 1.2


def g_leg(g, which, side, phase, bob, planted):
    """As `leg`, for an animal of its own: its top joint, its middle joint and its ankle."""
    tx = g['top'][which][0]
    along, up = g_hoof(g, (phase + OFFSET[which + side]) % 1.0, planted)
    dx = g['rest'][which] + along
    a, b = g['bones'][which]
    foot = g['foot']
    straight = math.sqrt(max(0.0, ((a + b) * 0.985) ** 2 - dx * dx)) + foot
    tz = max(g['top'][which][1] + g['ride'][which][0], min(g['top'][which][1] + g['ride'][which][1], straight)) + bob
    dz = up + foot - tz
    reach = min(a + b - 0.002, math.hypot(dx, dz))
    aim = math.atan2(dz, dx)
    bend = math.acos(max(-1.0, min(1.0, (a * a + reach * reach - b * b) / (2.0 * a * reach))))
    knee = aim + BEND[which] * bend
    return (tx, tz), (tx + a * math.cos(knee), tz + a * math.sin(knee)), (tx + reach * math.cos(aim), tz + reach * math.sin(aim))


# A roe deer, a doe, 0.72 EL at the shoulder: slender, a short back, long thin legs, a long neck held up, a small
# head with big ears, and a pale patch on her rump. Light on her feet.
DEER = {
    'stride': 0.62, 'duty': 0.6, 'lift': 0.1, 'foot': 0.03,
    'top': {'F': (0.34, 0.62), 'H': (-0.36, 0.66)}, 'bones': {'F': (0.31, 0.30), 'H': (0.35, 0.33)},
    'ride': {'F': (-0.02, 0.03), 'H': (-0.01, 0.01)}, 'rest': {'F': 0.02, 'H': -0.06}, 'side': 0.085,
}
DEER_HALT = 5
RUMP = paint('deer-rump', 0.8, 1.0)


def build_deer(phase, planted, lift, look, flick):
    clear_parts()
    still = Matrix.Identity(4)
    bob = 0.012 * math.cos(4.0 * math.pi * phase)
    profile = [
        (-0.52, 0.74, 0.58, 0.05), (-0.47, 0.80, 0.50, 0.11), (-0.32, 0.82, 0.47, 0.15), (-0.10, 0.80, 0.46, 0.155),
        (0.12, 0.81, 0.45, 0.15), (0.30, 0.85, 0.47, 0.14), (0.42, 0.81, 0.53, 0.11), (0.50, 0.73, 0.61, 0.07),
    ]
    tube('body', [(x, (top + under) / 2.0 + bob, wide, (top - under) / 2.0) for x, top, under, wide in profile], HIDE, still)
    ball('rump', (-0.5, 0.0, 0.7 + bob), (0.0, 0.0, 1.0), (1.0, 0.0, 0.0), (0.09, 0.1, 0.06), RUMP, still)
    for side in ('L', 'R'):
        hide = FAR if side == 'L' else HIDE
        across = Matrix.Translation((0.0, DEER['side'] * (1.0 if side == 'L' else -1.0), 0.0))
        top, knee, ankle = g_leg(DEER, 'F', side, phase, bob, planted)
        tube('fore' + side, [
            (top[0] + 0.02, top[1] + 0.14, 0.05, 0.09), (top[0], top[1], 0.045, 0.07), between(top, knee, 0.55, 0.03, 0.045),
            (knee[0], knee[1], 0.026, 0.034), between(knee, ankle, 0.5, 0.02, 0.026), (ankle[0] + 0.015, ankle[1] - 0.02, 0.022, 0.03),
        ], hide, across)
        top, hock, ankle = g_leg(DEER, 'H', side, phase, bob, planted)
        tube('hind' + side, [
            (top[0] + 0.05, top[1] + 0.12, 0.065, 0.12), (top[0], top[1], 0.055, 0.1), between(top, hock, 0.5, 0.036, 0.055),
            (hock[0], hock[1], 0.026, 0.035), between(hock, ankle, 0.5, 0.02, 0.026), (ankle[0] + 0.015, ankle[1] - 0.02, 0.022, 0.03),
        ], hide, across)
    up = lift * lift * (3.0 - 2.0 * lift)
    nod = 0.0 if planted else 0.012 * math.sin(4.0 * math.pi * phase + 0.6)
    base = (0.40, 0.74 + bob)
    joint = (mix(0.60, 0.53, up), mix(1.02, 1.16, up) + bob + nod)
    neck = [(mix(base[0], joint[0], t), mix(base[1], joint[1], t) + 0.03 * math.sin(math.pi * t), mix(0.075, 0.045, t), mix(0.11, 0.05, t)) for t in (0.0, 0.35, 0.7, 1.0)]
    tube('neck', neck, HIDE, still)
    head = Matrix.Translation((joint[0], 0.0, joint[1])) @ Matrix.Rotation(math.radians(-45.0) * look, 4, 'Z') @ Matrix.Rotation(math.radians(mix(48.0, 22.0, up)), 4, 'Y')
    tube('head', [(-0.03, 0.01, 0.045, 0.055), (0.06, 0.01, 0.05, 0.06), (0.15, -0.01, 0.035, 0.045), (0.22, -0.03, 0.025, 0.032)], HIDE, head)
    for side in (1.0, -1.0):
        lean = (mix(-0.3, -0.05, up), side * 0.5, 0.85)
        if side < 0.0:
            lean = (mix(lean[0], -0.8, flick), mix(lean[1], -0.3, flick), mix(lean[2], 0.4, flick))
        way = Vector(lean).normalized()
        root = Vector((-0.02, side * 0.035, 0.04))
        ball('ear', root + way * 0.075, way, (1.0, 0.0, 0.0), (0.08, 0.035, 0.012), HIDE, head)


# A brown bear, 1.05 EL at the shoulder: a heavy body with a hump over its shoulders, short thick legs, broad paws,
# a big round head carried low, and small round ears. It rolls as it walks, and its head swings.
BEAR = {
    'stride': 0.78, 'duty': 0.64, 'lift': 0.09, 'foot': 0.07,
    'top': {'F': (0.52, 0.66), 'H': (-0.62, 0.66)}, 'bones': {'F': (0.33, 0.30), 'H': (0.34, 0.31)},
    'ride': {'F': (-0.03, 0.04), 'H': (-0.02, 0.02)}, 'rest': {'F': 0.03, 'H': -0.05}, 'side': 0.2,
}


def build_bear(phase):
    clear_parts()
    still = Matrix.Identity(4)
    bob = 0.018 * math.cos(4.0 * math.pi * phase)
    roll = 0.02 * math.sin(2.0 * math.pi * phase)
    profile = [
        (-0.98, 0.84, 0.52, 0.12), (-0.88, 0.96, 0.42, 0.27), (-0.62, 1.01, 0.36, 0.35), (-0.28, 0.98, 0.34, 0.37),
        (0.08, 1.03, 0.35, 0.37), (0.36, 1.13 + roll, 0.38, 0.35), (0.58, 1.08 + roll, 0.44, 0.3), (0.76, 0.96, 0.52, 0.21),
    ]
    tube('body', [(x, (top + under) / 2.0 + bob, wide, (top - under) / 2.0) for x, top, under, wide in profile], HIDE, still)
    stick('tail', (-0.97, 0.0, 0.78 + bob), (-1.02, 0.0, 0.72 + bob), 0.04, 0.02, HIDE, still)
    for side in ('L', 'R'):
        hide = FAR if side == 'L' else HIDE
        across = Matrix.Translation((0.0, BEAR['side'] * (1.0 if side == 'L' else -1.0), 0.0))
        for which in ('F', 'H'):
            top, knee, ankle = g_leg(BEAR, which, side, phase, bob, False)
            thick = 0.13 if which == 'F' else 0.15
            tube(('fore' if which == 'F' else 'hind') + side, [
                (top[0] + 0.03, top[1] + 0.2, thick * 0.9, thick * 1.5), (top[0], top[1], thick * 0.85, thick * 1.2), between(top, knee, 0.5, thick * 0.7, thick * 0.95),
                (knee[0], knee[1], thick * 0.6, thick * 0.75), between(knee, ankle, 0.5, thick * 0.55, thick * 0.65), (ankle[0], ankle[1] - 0.02, thick * 0.55, thick * 0.6),
            ], hide, across)
            ball('paw', (ankle[0] + 0.05, 0.0, 0.045), (1.0, 0.0, 0.0), (0.0, 0.0, 1.0), (0.12, 0.08, 0.045), hide, across)
    swing = 0.05 * math.sin(2.0 * math.pi * phase + 0.4)
    joint = (0.98, 0.84 + bob + 0.02 * math.sin(4.0 * math.pi * phase))
    tube('neck', [(0.62, 0.82 + bob, 0.24, 0.3), (0.82, 0.83 + bob, 0.2, 0.24), (joint[0], joint[1], 0.17, 0.2)], HIDE, still)
    head = Matrix.Translation((joint[0], swing, joint[1])) @ Matrix.Rotation(math.radians(14.0), 4, 'Y')
    tube('head', [(-0.08, 0.02, 0.15, 0.16), (0.06, 0.02, 0.165, 0.165), (0.2, -0.01, 0.12, 0.115), (0.31, -0.04, 0.075, 0.07), (0.37, -0.05, 0.055, 0.055)], HIDE, head)
    for side in (1.0, -1.0):
        ball('ear', (-0.02, side * 0.11, 0.17), (0.0, side, 1.0), (1.0, 0.0, 0.0), (0.055, 0.05, 0.025), HIDE, head)


# The picture: from the side, without perspective, clear behind it, the light from above, in front and a little behind.
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 96
scene.cycles.use_denoising = False
# A wide filter: the animal is as soft as a far picture, and is still an animal on a phone.
scene.cycles.pixel_filter_type = 'GAUSSIAN'
scene.cycles.filter_width = 3.2
scene.render.film_transparent = True
scene.render.resolution_x = CELL[0]
scene.render.resolution_y = CELL[1]
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.color_depth = '8'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
world = bpy.data.worlds.new('life-sky')
world.use_nodes = True
for node in world.node_tree.nodes:
    if node.type == 'BACKGROUND':
        node.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
        node.inputs['Strength'].default_value = 0.32
scene.world = world
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 5.0
sun.data.angle = math.radians(8)
sun.rotation_euler = Vector((-0.40, -0.48, -0.78)).to_track_quat('-Z', 'Y').to_euler()
scene.collection.objects.link(sun)
camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
camera.data.type = 'ORTHO'
camera.data.ortho_scale = SCALE
camera.location = (CAMERA_X, -20.0, SCALE * CELL[1] / CELL[0] / 2.0 - GROUND)
camera.rotation_euler = (math.radians(90), 0.0, 0.0)
scene.collection.objects.link(camera)
scene.camera = camera

# Every cell: which strip, which cell, the moment of the walk, hooves set down, head up, head turned, ear back.
CELLS = [('walk', i, (i + 0.5) / 12.0, False, 0.0, 0.0, 0.0) for i in range(12)]
REST_PHASE = (HALT + 0.5) / 12.0
# Standing: as it stopped; its head coming up in three steps and turning this way; looking; and an ear flicked.
CELLS += [
    ('stand', 0, REST_PHASE, True, 0.0, 0.0, 0.0),
    ('stand', 1, REST_PHASE, True, 0.35, 0.05, 0.0),
    ('stand', 2, REST_PHASE, True, 0.68, 0.35, 0.0),
    ('stand', 3, REST_PHASE, True, 0.92, 0.75, 0.0),
    ('stand', 4, REST_PHASE, True, 1.0, 1.0, 0.0),
    ('stand', 5, REST_PHASE, True, 1.0, 1.0, 1.0),
]
shades = []
small = {'walk': [], 'stand': []}
for name, cell, phase, planted, lift, look, flick in CELLS:
    build(phase, planted, lift, look, flick)
    scene.render.filepath = WORK + '/moose-%s-%02d.png' % (name, cell)  # noqa: F821 (set by the caller, see above)
    bpy.ops.render.render(write_still=True)
    frame = bpy.data.images.load(scene.render.filepath)
    pixels = list(frame.pixels)
    bpy.data.images.remove(frame)
    left, top = cell_origin(name, cell)
    # Its mean grey, for the pixels that are nearly clear: no dark edge where it thins out.
    total = 0.0
    weight = 0.0
    for at in range(0, len(pixels), 4):
        total += pixels[at] * pixels[at + 3]
        weight += pixels[at + 3]
    mean = total / max(1e-6, weight)
    shades.append(mean ** 2.2)
    for row in range(CELL[1]):
        for x in range(CELL[0]):
            at = (row * CELL[0] + x) * 4
            alpha = pixels[at + 3]
            dab(left + x, top + CELL[1] - 1 - row, alpha, pixels[at] if alpha > 0.1 else mean)
    # A small copy of its shape, sixteen by twenty: how alike two cells are can be told from these.
    marks = ''
    for by in range(16):
        for bx in range(20):
            covered = 0.0
            for y in range(8):
                for x in range(8):
                    covered += pixels[((CELL[1] - 1 - by * 8 - y) * CELL[0] + bx * 8 + x) * 4 + 3]
            marks += '0123456789abcdef'[min(15, int(covered / 64.0 * 16.0))]
    small[name].append(marks)

# The forest's bigger life: each in cells of its own size, as many pixels to its EL as fit, the ground as far over
# the cell's bottom as the moose's.
WILD = {
    # strip: EL across a cell, the ground over its bottom edge, where the camera looks along X, and its height in EL
    'pair': (5.6, 0.22, 0.12, 2.05),
    'deer': (2.0, 0.12, 0.05, 1.14),
    'deerStand': (2.0, 0.12, 0.05, 1.14),
    'bear': (2.7, 0.16, 0.12, 1.24),
}


def shoot(name, cell):
    """Renders the animal as it is built now into a cell of the atlas, and gives its mean grey, as light."""
    wide, tall = STRIPS[name][2], STRIPS[name][3]
    across, ground, middle, _ = WILD[name]
    scene.render.resolution_x = wide
    scene.render.resolution_y = tall
    camera.data.ortho_scale = across
    camera.location = (middle, -20.0, across * tall / wide / 2.0 - ground)
    scene.render.filepath = WORK + '/wild-%s-%02d.png' % (name, cell)  # noqa: F821
    bpy.ops.render.render(write_still=True)
    frame = bpy.data.images.load(scene.render.filepath)
    pixels = list(frame.pixels)
    bpy.data.images.remove(frame)
    left, top = cell_origin(name, cell)
    total = 0.0
    weight = 0.0
    for at in range(0, len(pixels), 4):
        total += pixels[at] * pixels[at + 3]
        weight += pixels[at + 3]
    mean = total / max(1e-6, weight)
    for row in range(tall):
        for x in range(wide):
            at = (row * wide + x) * 4
            alpha = pixels[at + 3]
            dab(left + x, top + tall - 1 - row, alpha, pixels[at] if alpha > 0.1 else mean)
    return mean ** 2.2


wild_shades = {'pair': [], 'deer': [], 'bear': []}
for i in range(12):
    build_pair((i + 0.5) / 12.0)
    wild_shades['pair'].append(shoot('pair', i))
    build_deer((i + 0.5) / 12.0, False, 0.0, 0.0, 0.0)
    wild_shades['deer'].append(shoot('deer', i))
    build_bear((i + 0.5) / 12.0)
    wild_shades['bear'].append(shoot('bear', i))
DEER_REST = (DEER_HALT + 0.5) / 12.0
for i, (lift, look, flick) in enumerate(((0.0, 0.0, 0.0), (0.35, 0.05, 0.0), (0.68, 0.35, 0.0), (0.92, 0.75, 0.0), (1.0, 1.0, 0.0), (1.0, 1.0, 1.0))):
    build_deer(DEER_REST, True, lift, look, flick)
    wild_shades['deer'].append(shoot('deerStand', i))

# --- the far flocks: cranes in a V and geese, as birds -------------------------------------------------------------
#
# Each a bird with a body, a neck, a head and a bill, and wings that beat: a crane (art/blender/crane.py's bird, far
# off) with its long neck out, its legs trailing behind its tail and the black fingers of its wings spread; a goose
# with a heavy body, a shorter neck and pointed wings. The wing turns at the shoulder and bends at the wrist, its hand
# trailing the arm through the beat: eight cells a beat, from the top. Seen a little from below and in front, as a
# flock high over the place is, so that both wings show. The flight feathers are darker than the body: the game gives
# the bird its colour, and this its light and dark.

FEATHER = paint('flock-body', 0.62, 1.0)
QUILL = paint('flock-quill', 0.2, 1.0)
FLYERS = {
    # body stations (x, z, half width, half thickness); neck from, head at, head size, bill length; the shoulder, the
    # span from it, the arm's share, the wing's chord at the shoulder, how many fingers; legs trailing (to x), or none.
    'crane': {
        'body': [(-0.34, 0.0, 0.03, 0.03), (-0.27, 0.0, 0.08, 0.07), (-0.14, 0.0, 0.11, 0.1), (0.02, 0.0, 0.115, 0.105),
                 (0.14, 0.01, 0.095, 0.09), (0.22, 0.02, 0.06, 0.06)],
        'neck': ((0.2, 0.02), (0.68, 0.0), 0.034), 'head': (0.72, 0.0, 0.045), 'bill': 0.13,
        'shoulder': (0.06, 0.1, 0.05), 'span': 1.05, 'arm': 0.42, 'chord': 0.3, 'fingers': 6, 'legs': -0.86,
        'beat': (34.0, -26.0), 'tilt': 4.0,
    },
    'goose': {
        'body': [(-0.36, 0.0, 0.04, 0.035), (-0.28, 0.0, 0.11, 0.09), (-0.12, 0.0, 0.15, 0.13), (0.05, 0.0, 0.15, 0.13),
                 (0.18, 0.02, 0.12, 0.11), (0.26, 0.04, 0.07, 0.07)],
        'neck': ((0.24, 0.04), (0.56, 0.06), 0.045), 'head': (0.6, 0.06, 0.052), 'bill': 0.08,
        'shoulder': (0.06, 0.12, 0.06), 'span': 0.86, 'arm': 0.38, 'chord': 0.24, 'fingers': 0, 'legs': None,
        'beat': (36.0, -28.0), 'tilt': 2.0,
    },
}


def sheet(name, grid, material):
    """A thin two-sided surface over a grid of points (rows of points): a wing, a feather."""
    bm = bmesh.new()
    made = [[bm.verts.new(p) for p in row] for row in grid]
    for i in range(len(made) - 1):
        for j in range(len(made[0]) - 1):
            bm.faces.new((made[i][j], made[i][j + 1], made[i + 1][j + 1], made[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    made_ = bpy.data.objects.new(name, mesh)
    solid = made_.modifiers.new('solid', 'SOLIDIFY')
    solid.thickness = 0.012
    bpy.context.scene.collection.objects.link(made_)
    PARTS.append(made_)
    return made_


def flyer_wing(f, side, phase):
    """A wing at a moment of its beat (phase 0 to 1, from the top): the arm out from the shoulder, raised by the beat;
    the hand out from the wrist, trailing the arm (up as the wing goes down, down and swept back as it comes up); and,
    for a crane, its fingers splayed at the tip. Side +1 is the near side (-Y)."""
    top, deep = f['beat']
    a = math.tau * phase
    up = math.radians(deep + (top - deep) * 0.5 * (1.0 + math.cos(a)))
    lag = math.radians(-22.0 * math.sin(a))
    sweep = math.radians(24.0 * max(0.0, -math.sin(a)) + 4.0)
    s = Vector(f['shoulder'])
    s.y *= -side
    span = f['span']
    arm = span * f['arm']
    hand = span - arm
    out_arm = Vector((0.0, -side * math.cos(up), math.sin(up)))
    out_hand = Vector((-math.sin(sweep), -side * math.cos(up + lag) * math.cos(sweep), math.sin(up + lag) * math.cos(sweep)))
    wrist = s + out_arm * arm + Vector((0.04, 0.0, 0.0))
    back = Vector((-1.0, 0.0, 0.0))
    rows = []
    chord = f['chord']
    for k in range(6):
        u = k / 5.0
        lead = s + out_arm * (arm * u) + Vector((0.04 * u, 0.0, 0.0))
        c = chord * (1.0 - 0.1 * u)
        rows.append([lead + back * (c * v) for v in (0.0, 0.35, 0.7, 1.0)])
    fingers = f['fingers']
    reach = 0.55 if fingers else 1.0
    hand_back = (back - out_hand * back.dot(out_hand)).normalized()
    for k in range(1, 6):
        u = k / 5.0 * reach
        lead = wrist + out_hand * (hand * u)
        c = chord * 0.9 * (1.0 - (0.15 if fingers else 0.9) * u / reach) + 0.01
        rows.append([lead + hand_back * (c * v) for v in (0.0, 0.35, 0.7, 1.0)])
    sheet('wing', rows, FEATHER)
    # The flight feathers: darker, along the trailing edge, and out to the tip.
    quills = []
    for row in rows:
        lead = row[0]
        tail = row[-1]
        quills.append([lead.lerp(tail, 0.55), lead.lerp(tail, 0.8), tail + (tail - lead).normalized() * 0.03])
    sheet('quills', quills, QUILL)
    if not fingers:
        tip = wrist + out_hand * (hand * 1.08)
        sheet('tip', [[rows[-1][0], rows[-1][-1]], [tip, tip + hand_back * 0.01]], QUILL)
        return
    # A crane's fingers: the long primaries, each its own, splayed and curling up at the tip.
    root = wrist + out_hand * (hand * reach)
    for k in range(fingers):
        t = k / (fingers - 1.0)
        turn = math.radians(-6.0 + 34.0 * t)
        way = (out_hand * math.cos(turn) + hand_back * math.sin(turn)).normalized()
        long = hand * (0.5 - 0.12 * abs(t - 0.3))
        start = root + hand_back * (chord * 0.75 * t)
        wide = 0.018
        across = hand_back
        pts = []
        for j in range(4):
            q = j / 3.0
            at = start + way * (long * q) + Vector((0.0, 0.0, 0.04 * q * q))
            w = wide * (1.0 - 0.4 * q)
            pts.append([at - across * w, at + across * w])
        sheet('finger', pts, QUILL)


def build_flyer(kind, phase):
    """A crane or a goose at a moment of its beat, facing +X, its middle at the origin."""
    clear_parts()
    f = FLYERS[kind]
    still = Matrix.Rotation(math.radians(f['tilt']), 4, 'Y').inverted()
    # It rises a little as its wings go down, and sinks as they come up.
    lift = 0.02 * math.sin(math.tau * phase)
    move = Matrix.Translation((0.0, 0.0, lift)) @ still
    tube('body', f['body'], FEATHER, move)
    (nx, nz), (hx, hz), thick = f['neck']
    neck = [(nx, nz, thick * 1.6, thick * 1.6), ((nx + hx) / 2.0, (nz + hz) / 2.0 + 0.01, thick, thick), (hx, hz, thick * 0.9, thick * 0.9)]
    tube('neck', neck, FEATHER, move)
    x, z, r = f['head']
    tube('head', [(x - r, z, r * 0.8, r * 0.8), (x, z + 0.005, r, r), (x + r * 0.8, z - 0.005, r * 0.6, r * 0.55)], QUILL if kind == 'goose' else FEATHER, move)
    stick('bill', (x + r * 0.7, 0.0, z - 0.008), (x + r * 0.7 + f['bill'], 0.0, z - 0.02), r * 0.32, r * 0.08, QUILL, move)
    if kind == 'goose':
        # A goose's dark neck.
        tube('collar', [(nx + 0.02, nz, thick * 1.3, thick * 1.3), (hx, hz, thick * 0.95, thick * 0.95)], QUILL, move)
    if f['legs'] is not None:
        for side in (1.0, -1.0):
            stick('leg', (-0.12, -side * 0.035, -0.05), (f['legs'], -side * 0.02, -0.07), 0.014, 0.009, QUILL, move)
        # The bustle: a crane's long tertials, drooping over its tail.
        ball('bustle', (-0.3, 0.0, 0.0), (1.0, 0.0, -0.25), (0.0, 0.0, 1.0), (0.1, 0.05, 0.03), QUILL, move)
    else:
        stick('tail', (-0.34, 0.0, 0.0), (-0.44, 0.0, 0.005), 0.05, 0.02, QUILL, move)
    for side in (1.0, -1.0):
        before = len(PARTS)
        flyer_wing(f, side, phase)
        for part in PARTS[before:]:
            part.matrix_world = move @ part.matrix_world


# Seen from a little below and in front of its near side, as a flock high over the place is.
FLOCK_VIEW = (math.radians(16.0), math.radians(22.0))


def flock_eye():
    below, front = FLOCK_VIEW
    eye = Vector((math.sin(front) * math.cos(below), -math.cos(front) * math.cos(below), -math.sin(below)))
    turn = (-eye).to_track_quat('-Z', 'Y').to_matrix()
    return eye, turn @ Vector((1.0, 0.0, 0.0)), turn @ Vector((0.0, 1.0, 0.0)), turn


def flock_frame(name):
    """Where to look and how wide, so that every cell of the beat fits its cell with a margin, the bird in the same
    place in each: the box round all of them, as the camera sees it."""
    eye, right, up, _ = flock_eye()
    box = [9.0, 9.0, -9.0, -9.0]
    for i in range(STRIPS[name][4]):
        build_flyer(name, i / STRIPS[name][4])
        for part in PARTS:
            for vert in part.data.vertices:
                p = part.matrix_world @ vert.co
                box = [min(box[0], p.dot(right)), min(box[1], p.dot(up)), max(box[2], p.dot(right)), max(box[3], p.dot(up))]
    wide, tall = STRIPS[name][2], STRIPS[name][3]
    across = max(box[2] - box[0], (box[3] - box[1]) * wide / tall) * 1.1
    return right * ((box[0] + box[2]) / 2.0) + up * ((box[1] + box[3]) / 2.0), across


def shoot_flock(name, cell, centre, across):
    """Renders the bird as it is built now into a cell of its strip, its light and dark scaled so that its body is
    nearly white: the game's ink is its colour."""
    wide, tall = STRIPS[name][2], STRIPS[name][3]
    scene.render.resolution_x = wide
    scene.render.resolution_y = tall
    camera.data.ortho_scale = across
    eye, _, _, turn = flock_eye()
    camera.location = centre + eye * 20.0
    camera.rotation_euler = turn.to_euler()
    scene.render.filepath = WORK + '/flock-%s-%02d.png' % (name, cell)  # noqa: F821
    bpy.ops.render.render(write_still=True)
    frame = bpy.data.images.load(scene.render.filepath)
    pixels = list(frame.pixels)
    bpy.data.images.remove(frame)
    left, top = cell_origin(name, cell)
    greys = sorted(pixels[at] for at in range(0, len(pixels), 4) if pixels[at + 3] > 0.6)
    bright = greys[int(len(greys) * 0.9)] if greys else 1.0
    for row in range(tall):
        for x in range(wide):
            at = (row * wide + x) * 4
            alpha = pixels[at + 3]
            grey = clamp(pixels[at] / max(1e-4, bright)) if alpha > 0.1 else 1.0
            dab(left + x, top + tall - 1 - row, alpha, grey)


for name in ('crane', 'goose'):
    centre, across = flock_frame(name)
    for i in range(STRIPS[name][4]):
        build_flyer(name, i / STRIPS[name][4])
        shoot_flock(name, i, centre, across)

for part in PARTS:
    mesh = part.data
    bpy.data.objects.remove(part, do_unlink=True)
    bpy.data.meshes.remove(mesh)
PARTS.clear()
bpy.data.objects.remove(sun, do_unlink=True)
bpy.data.objects.remove(camera, do_unlink=True)

# --- what each cell holds, for the tests ---------------------------------------------------------------------

def measure(name, cell):
    """A cell's lowest covered row (from its top), its box, and how much of it is covered."""
    left, top = cell_origin(name, cell)
    wide = STRIPS[name][2]
    tall = STRIPS[name][3]
    box = [wide, tall, -1, -1]
    solid = 0
    foot = -1
    for y in range(tall):
        for x in range(wide):
            alpha = atlas[((TALL - 1 - top - y) * WIDE + left + x) * 4 + 3]
            if alpha > 0.02:
                box = [min(box[0], x), min(box[1], y), max(box[2], x), max(box[3], y)]
            if alpha > 0.5:
                solid += 1
                foot = max(foot, y)
    return {'foot': foot, 'box': box, 'cover': round(solid / (wide * tall), 4)}


report = {'atlas': [WIDE, TALL], 'strips': {name: list(STRIPS[name]) for name in STRIPS}, 'cells': {}}
for name in STRIPS:
    report['cells'][name] = [measure(name, cell) for cell in range(STRIPS[name][4])]
# The moose's numbers, as the game needs them, and where each hoof is in each cell of the walk: how far from the
# cell's left edge in pixels, and how far off the ground in EL.
hooves = {}
for which in ('F', 'H'):
    for side in ('L', 'R'):
        steps = []
        for i in range(12):
            top, knee, ankle = leg(which, side, (i + 0.5) / 12.0, 0.0, False)
            steps.append([round((ankle[0] - CAMERA_X + SCALE / 2.0) * CELL[0] / SCALE, 2), round(ankle[1] - 0.09, 4)])
        hooves[which + side] = steps
report['moose'] = {
    'cell': SCALE, 'foot': GROUND, 'stride': STRIDE, 'duty': DUTY, 'halt': HALT, 'pixels': CELL[0] / SCALE,
    'shade': round(sum(shades) / len(shades), 4), 'hooves': hooves, 'small': small,
}
# The forest's bigger life, as the game needs it: a cell's EL across, the ground over its bottom, what the body goes on
# in a cycle, the cell it stops after, its height, and its mean grey.
report['wild'] = {
    'pair': {'cell': WILD['pair'][0], 'foot': WILD['pair'][1], 'stride': round(PAIR_STRIDE, 4), 'tall': WILD['pair'][3], 'shade': round(sum(wild_shades['pair']) / 12.0, 4)},
    'deer': {'cell': WILD['deer'][0], 'foot': WILD['deer'][1], 'stride': DEER['stride'], 'halt': DEER_HALT, 'tall': WILD['deer'][3], 'shade': round(sum(wild_shades['deer']) / 18.0, 4)},
    'bear': {'cell': WILD['bear'][0], 'foot': WILD['bear'][1], 'stride': BEAR['stride'], 'tall': WILD['bear'][3], 'shade': round(sum(wild_shades['bear']) / 12.0, 4)},
}

# --- the plane that carries the picture --------------------------------------------------------------------

image = bpy.data.images.new('life-atlas', WIDE, TALL, alpha=True)
image.alpha_mode = 'STRAIGHT'
image.pixels.foreach_set(atlas)
image.pack()

material = bpy.data.materials.new('life')
material.use_nodes = True
material.blend_method = 'BLEND'
for node in material.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        material.node_tree.links.new(texture.outputs['Color'], node.inputs['Base Color'])
        material.node_tree.links.new(texture.outputs['Alpha'], node.inputs['Alpha'])
        node.inputs['Roughness'].default_value = 1.0

bm = bmesh.new()
uv = bm.loops.layers.uv.new('UVMap')
corners = [bm.verts.new((x, 0.0, z)) for x, z in ((-1.0, -0.5), (1.0, -0.5), (1.0, 0.5), (-1.0, 0.5))]
face = bm.faces.new(corners)
for loop in face.loops:
    loop[uv].uv = (loop.vert.co.x * 0.5 + 0.5, loop.vert.co.z + 0.5)
mesh = bpy.data.meshes.new('life')
bm.to_mesh(mesh)
bm.free()
mesh.materials.append(material)
plane = bpy.data.objects.new('life', mesh)
bpy.context.scene.collection.objects.link(plane)
plane['role'] = 'life'

# The numbers, beside the model: the same folder and name, as .json.
text = bpy.data.texts.new('life.json')
text.write(json.dumps(report, indent=1) + '\n')
with bpy.context.temp_override(edit_text=text):
    bpy.ops.text.save_as(filepath=OUT[:-4] + '.json', check_existing=False)  # noqa: F821 (set by the caller, see above)

# A look at it, for the one who runs this: the picture as it is, and on the bog's mist in the moose's colour.
look = bpy.data.images.new('life-look', WIDE, TALL, alpha=False)
shown = [0.0] * (WIDE * TALL * 4)
MIST = (0.965, 0.925, 0.831)
INK = (0.227, 0.204, 0.180)
for at in range(0, WIDE * TALL * 4, 4):
    alpha = atlas[at + 3]
    for channel in range(3):
        shown[at + channel] = MIST[channel] + (INK[channel] * min(1.0, atlas[at + channel] * 1.6) - MIST[channel]) * alpha
    shown[at + 3] = 1.0
look.pixels.foreach_set(shown)
look.filepath_raw = WORK + '/life-look.png'  # noqa: F821
look.file_format = 'PNG'
look.save()
bpy.data.images.remove(look)
print('life built:', [o.name for o in bpy.data.objects], 'cells', sum(STRIPS[name][4] for name in STRIPS))
