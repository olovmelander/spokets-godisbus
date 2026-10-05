"""Builds the pictures of the far scenery's life (src/content/life.ts): one atlas of 1024 by 512, carried as the
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
- The birds, the smoke, the far window and the shooting star are drawn here, in white, from plain shapes.

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
TALL = 512
# name: left, top, a cell's width and height, how many cells, how many in a row
STRIPS = {
    'walk': (0, 0, 160, 128, 12, 6),
    'stand': (0, 384, 160, 128, 6, 6),
    'crane': (640, 256, 96, 48, 4, 4),
    'goose': (640, 304, 96, 48, 4, 4),
    'puff': (960, 0, 64, 64, 1, 1),
    'dot': (960, 64, 32, 32, 1, 1),
    'streak': (0, 256, 128, 64, 1, 1),
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

def to_capsule(px, py, shape):
    """How far a point is from a tapered stroke: from (ax, ay) with radius ra to (bx, by) with radius rb."""
    ax, ay, bx, by, ra, rb = shape
    dx = bx - ax
    dy = by - ay
    along = clamp(((px - ax) * dx + (py - ay) * dy) / max(1e-9, dx * dx + dy * dy))
    return math.hypot(px - ax - dx * along, py - ay - dy * along) - (ra + (rb - ra) * along)


def draw_strokes(name, cell, shapes, scale, mid_x, mid_y, soft):
    """Strokes given in the shape's own measure, y up, with (0, 0) at mid_x and mid_y of the cell (y from its top)."""
    left, top = cell_origin(name, cell)
    wide = STRIPS[name][2]
    tall = STRIPS[name][3]
    for y in range(tall):
        for x in range(wide):
            px = (x + 0.5 - mid_x) / scale
            py = (mid_y - y - 0.5) / scale
            near = 9.0
            for shape in shapes:
                near = min(near, to_capsule(px, py, shape))
            alpha = clamp(0.5 - near * scale / soft)
            if alpha > 0.0:
                dab(left + x, top + y, alpha, 1.0)


def bird(neck, legs, wing):
    """A flying bird from the side, facing right, in four beats: its wings up, level, down, level."""
    body = [
        (-0.15, 0.0, 0.10, 0.01, 0.052, 0.046),
        (0.10, 0.015, 0.10 + neck, 0.045, 0.024, 0.014),
        (0.10 + neck, 0.045, 0.17 + neck, 0.04, 0.017, 0.006),
        (-0.15, 0.0, -0.25, -0.005, 0.034, 0.012),
    ]
    if legs > 0.0:
        body.append((-0.15, -0.01, -0.15 - legs, -0.05, 0.016, 0.007))
    beats = [
        [(0.02, 0.02, -0.01, 0.15 * wing, 0.065, 0.055), (-0.01, 0.15 * wing, -0.07, 0.27 * wing, 0.055, 0.018)],
        [(0.02, 0.02, -0.16, 0.08 * wing, 0.048, 0.018)],
        [(0.02, 0.0, -0.01, -0.11 * wing, 0.06, 0.05), (-0.01, -0.11 * wing, -0.06, -0.21 * wing, 0.05, 0.018)],
        [(0.02, 0.01, -0.15, -0.03 * wing, 0.048, 0.018)],
    ]
    return [body + beat for beat in beats]


crane = bird(0.30, 0.32, 1.25)
goose = bird(0.22, 0.0, 1.1)
for beat in range(4):
    draw_strokes('crane', beat, crane[beat], 66.0, 48.0, 27.0, 1.6)
    draw_strokes('goose', beat, goose[beat], 72.0, 50.0, 26.0, 1.6)

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


def build(phase, planted, lift, look, flick):
    """The whole animal at a moment of its walk. `lift` raises its head, `look` turns it to the camera, and
    `flick` lays its near ear back: each from 0 to 1."""
    for part in PARTS:
        mesh = part.data
        bpy.data.objects.remove(part, do_unlink=True)
        bpy.data.meshes.remove(mesh)
    PARTS.clear()
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
    stick('bell', (throat.x, throat.y, throat.z), (throat.x + 0.02, throat.y, throat.z - 0.26), 0.075, 0.03, HIDE, still)

    for side in (1.0, -1.0):
        # An ear: up and out, laid back by a flick, and pricked when it looks.
        lean = (mix(-0.35, -0.08, up), side * 0.42, mix(0.80, 0.92, up))
        if side < 0.0:
            lean = (mix(lean[0], -0.85, flick), mix(lean[1], -0.30, flick), mix(lean[2], 0.38, flick))
        way = Vector(lean).normalized()
        root = Vector((-0.07, side * 0.11, 0.09))
        ball('ear', root + way * 0.14, way, (1.0, 0.0, 0.0), (0.15, 0.06, 0.02), HIDE, head)
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
