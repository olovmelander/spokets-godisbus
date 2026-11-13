"""The otter of Alven (Aventyr 2, src/content/aventyr2/otter.ts): one animal with bones, that sits up on its stone out in
the lake, looks round at Elof as he comes out over the rolling logs, leaps head first into the water, floats away on its
back with a pebble on its chest, and later climbs back onto its stone and shakes itself. Made with
art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/otter.py --out=art/baked/aventyr2/otter.glb
    node scripts/bake/blender-kit.mjs art/blender/otter.py --fast --preview=<folder>    (stills of every clip)

Units: 1 Blender unit is 1 EL; Z is up, the otter faces +X, and the camera's side is -Y (its right: the '.R' bones). Its
origin is on the ground under it as it sits up, as the kit's old otter (art/blender/a2-creatures.py, `utter`) had it, and
it is as tall sitting up: about 1.6 EL. The game turns it a quarter round so that it faces the camera as the old one
did (src/content/aventyr2/river-creatures.ts).

Its rest pose is the otter on all fours, long and low. It is one mesh with its colours on its corners, skinned to its
bones: its long body and thick tail bend smoothly along their bones; its head, its short legs and broad webbed feet go
each with their own. The clips, each named 'otter:<clip>':
    sit     sitting up on its haunches, alert, its paws at its chest, sniffing the air            (loop)
    look    up taller with a start, then down into a crouch, ready to jump                         (once)
    leap    from the crouch, stretched out long, its forepaws tucked, head first                   (once)
    swim    long and low, its body and tail rippling up and down, its feet tucked               (loop)
    float   on its back, its paws holding a pebble on its chest, turning lazily, its feet up    (loop)
    climb   up out of the water onto its stone: forepaws up, a pull, its hind feet after       (once)
    shake   on all fours, shaking the water off, head to tail                                   (once)
In the water clips (swim, float) its origin is at the water's surface. Nothing in it comes from anyone else, and it has
no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

BACK = tone('#3b2a1d')        # noqa: F821 (kit-tools.py)
FUR = tone('#553d2a')         # noqa: F821
SIDE = tone('#684c35')        # noqa: F821
SHEEN = tone('#8a6a4c')       # noqa: F821
PALE = tone('#cbb393')        # noqa: F821
PALE_DARK = tone('#a88d6c')   # noqa: F821
NOSE = tone('#15100c')        # noqa: F821
EYE = tone('#0d0a08')         # noqa: F821
SHINE = tone('#eef0f2')       # noqa: F821
PAW = tone('#2e2219')         # noqa: F821
CLAW = tone('#6a5a4a')        # noqa: F821
WHISKER = tone('#e0dace')     # noqa: F821
PEBBLE = tone('#8f9496')      # noqa: F821
PEBBLE_DARK = tone('#6c7173')  # noqa: F821


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def V(x, y, z):
    return Vector((x, y, z))


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


X = V(1, 0, 0)
Y = V(0, 1, 0)
Z = V(0, 0, 1)
UP = V(0, 0, 0.1)

# --- bones -------------------------------------------------------------------------------------------------------------
HEEL = V(-0.42, 0.22, 0.07)
BALL = V(-0.2, 0.24, 0.025)
WRIST = V(0.58, 0.21, 0.06)
PEBBLE_AT = V(0.42, 0.0, 0.17)

BONES = [
    ('root', None, (0, 0, 0), (0.25, 0, 0), {'deform': False}),
    ('hips', 'root', (-0.6, 0, 0.42), (-0.18, 0, 0.46)),
    ('spine', 'hips', (-0.18, 0, 0.46), (0.22, 0, 0.47), {'connect': True}),
    ('chest', 'spine', (0.22, 0, 0.47), (0.6, 0, 0.47), {'connect': True}),
    ('neck', 'chest', (0.6, 0, 0.47), (0.82, 0, 0.56), {'connect': True}),
    ('head', 'neck', (0.82, 0, 0.56), (1.27, 0, 0.58), {'connect': True}),
    ('tail1', 'hips', (-0.6, 0, 0.42), (-0.92, 0, 0.35)),
    ('tail2', 'tail1', (-0.92, 0, 0.35), (-1.24, 0, 0.26), {'connect': True}),
    ('tail3', 'tail2', (-1.24, 0, 0.26), (-1.56, 0, 0.18), {'connect': True}),
    ('tail4', 'tail3', (-1.56, 0, 0.18), (-1.92, 0, 0.11), {'connect': True}),
    ('pebble', 'chest', tuple(PEBBLE_AT), tuple(PEBBLE_AT + V(0.1, 0, 0))),
    ('paw_ik.L', None, tuple(WRIST), tuple(WRIST + UP), {'ctrl': True}),
    ('upper_arm.L', 'chest', (0.5, 0.2, 0.36), (0.53, 0.21, 0.2)),
    ('forearm.L', 'upper_arm.L', (0.53, 0.21, 0.2), tuple(WRIST), {'connect': True, 'ik': ('paw_ik.L', 2)}),
    ('hand.L', 'forearm.L', tuple(WRIST), (0.72, 0.22, 0.025), {'connect': True}),
    ('thigh.L', 'hips', (-0.42, 0.2, 0.36), (-0.3, 0.22, 0.2)),
    ('shin.L', 'thigh.L', (-0.3, 0.22, 0.2), tuple(HEEL), {'connect': True, 'ik': ('heel_ik.L', 2)}),
    ('foot.L', 'shin.L', tuple(HEEL), (-0.12, 0.25, 0.02), {'connect': True, 'track': 'ball_ik.L'}),
    ('heel_ik.L', None, tuple(HEEL), tuple(HEEL + UP), {'ctrl': True}),
    ('ball_ik.L', None, tuple(BALL), tuple(BALL + UP), {'ctrl': True}),
]
arm = armature('otter', BONES)  # noqa: F821
part = new_part()  # noqa: F821


def ring(centre, side, front, half, ahead, behind, count, turn=0.0):
    """Points round `centre`: `half` out along `side` each way, `ahead` out along `front`, `behind` the other way."""
    out = []
    for j in range(count):
        a = TAU * (j + turn) / count  # noqa: F821
        c = math.cos(a)
        s = math.sin(a)
        out.append(centre + front * ((ahead if c > 0.0 else behind) * c) + side * (half * s))
    return out


def coat(p, centre_z, half, pale=1.0, seed=0.0):
    """Its coat at a point: dark and sleek along its back, warmer down its sides, a wet sheen in streaks along it, and
    pale under its chin, throat and chest (`pale` says how much of that a part has)."""
    q = p.co
    up = (q.z - centre_z) / max(half, 0.05)
    streak = noise(q.x * 3.0 + seed, q.y * 14.0, q.z * 14.0)  # noqa: F821
    c = mix(SIDE, BACK, smooth((up + 0.1) / 0.8))
    c = mix(c, FUR, 0.35 * streak)
    c = mix(c, SHEEN, 0.28 * smooth((streak - 0.62) / 0.25) * smooth((up + 0.3) / 0.6))
    under = smooth((-up - 0.12) / 0.4) * pale
    c = mix(c, mix(PALE, PALE_DARK, noise(q.x * 9.0, q.y * 9.0, 1.0)), under)  # noqa: F821
    return c


# --- the body: long and sleek, the hips a little fuller, the throat and chest pale --------------------------------------
BODY = [
    # (x, z, half across, up, down, pale)
    (-0.72, 0.41, 0.12, 0.1, 0.11, 0.0),
    (-0.62, 0.42, 0.2, 0.18, 0.2, 0.0),
    (-0.48, 0.43, 0.26, 0.23, 0.25, 0.0),
    (-0.3, 0.45, 0.28, 0.25, 0.27, 0.0),
    (-0.1, 0.46, 0.275, 0.245, 0.27, 0.0),
    (0.1, 0.465, 0.265, 0.24, 0.26, 0.1),
    (0.3, 0.47, 0.25, 0.23, 0.245, 0.4),
    (0.48, 0.48, 0.235, 0.22, 0.23, 0.8),
    (0.62, 0.5, 0.21, 0.2, 0.2, 1.0),
    (0.74, 0.53, 0.19, 0.18, 0.17, 1.0),
    (0.84, 0.56, 0.17, 0.16, 0.15, 1.0),
]
at = mark(part)  # noqa: F821
rows = [ring(V(x, 0, z), Y, Z, h, u, d, 28) for x, z, h, u, d, _ in BODY]
made = skin(part, rows, [FUR] * len(rows), (V(-0.76, 0, 0.41), BACK), (V(0.88, 0, 0.57), FUR))  # noqa: F821
for i, row in enumerate(made):
    x, z, h, u, d, pale = BODY[i]
    for p in row:
        part['paint'][p] = coat(p, z, u if p.co.z > z else d, pale)
bind(arm, part, at, ['hips', 'spine', 'chest', 'neck'], blend=0.14)  # noqa: F821

# --- the head: flat and broad, a short muzzle with fat whisker pads, small eyes and ears -------------------------------
HEAD = [
    # (x, z, half across, up, down)
    (0.76, 0.585, 0.1, 0.09, 0.09),
    (0.82, 0.6, 0.18, 0.14, 0.14),
    (0.9, 0.61, 0.215, 0.15, 0.155),
    (0.99, 0.61, 0.22, 0.14, 0.16),
    (1.08, 0.6, 0.2, 0.115, 0.15),
    (1.16, 0.585, 0.175, 0.085, 0.12),
    (1.22, 0.578, 0.14, 0.065, 0.09),
    (1.26, 0.578, 0.09, 0.045, 0.06),
]
at = mark(part)  # noqa: F821
rows = [ring(V(x, 0, z), Y, Z, h, u, d, 24) for x, z, h, u, d in HEAD]
made = skin(part, rows, [FUR] * len(rows), (V(0.72, 0, 0.585), FUR), (V(1.285, 0, 0.58), NOSE))  # noqa: F821
for i, row in enumerate(made):
    x, z, h, u, d = HEAD[i]
    for p in row:
        c = coat(p, z, u if p.co.z > z else d, 1.0, 3.0)
        # The muzzle and the lips pale, the top of the head darkest.
        c = mix(c, PALE, 0.55 * smooth((p.co.x - 1.12) / 0.1) * smooth((z + 0.02 - p.co.z) / 0.05))
        part['paint'][p] = c
for side in (-1.0, 1.0):
    # Fat whisker pads, pale, with dark spots where the whiskers grow.
    pad = lump(part, V(1.18, 0.075 * side, 0.555), (0.07, 0.08, 0.055), 2, PALE)  # noqa: F821
    for p in pad:
        part['paint'][p] = mix(PALE, PALE_DARK, 0.6 * smooth((noise(p.co.x * 60.0, p.co.y * 60.0, p.co.z * 60.0) - 0.55) / 0.2))  # noqa: F821
    # Small dark eyes, set high and forward, each with a light in it.
    lump(part, V(1.07, 0.135 * side, 0.665), (0.034, 0.026, 0.032), 2, EYE)  # noqa: F821
    lump(part, V(1.09, 0.152 * side, 0.676), (0.009, 0.006, 0.009), 1, SHINE)  # noqa: F821
    # Tiny round ears, low on the sides of the head.
    lump(part, V(0.86, 0.185 * side, 0.7), (0.04, 0.03, 0.038), 2, BACK)  # noqa: F821
    # Long whiskers, out and back from the pads.
    for w in range(3):
        root = V(1.2, 0.11 * side, 0.565 - 0.014 * w)
        tip = V(1.16 - 0.04 * w, (0.34 + 0.03 * w) * side, 0.59 - 0.035 * w)
        tube(part, [root, root * 0.5 + tip * 0.5 + V(0, 0, 0.01), tip], [0.0038, 0.0025, 0.001], [WHISKER] * 3, 3)  # noqa: F821
lump(part, V(1.27, 0, 0.6), (0.032, 0.06, 0.032), 2, NOSE)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# --- the tail: thick at its root, tapering to a point, a little flat -----------------------------------------------------
TAIL = [(-0.62, 0.41, 0.16), (-0.8, 0.37, 0.14), (-1.0, 0.32, 0.115), (-1.2, 0.27, 0.09), (-1.4, 0.22, 0.07),
        (-1.6, 0.17, 0.05), (-1.78, 0.13, 0.032), (-1.9, 0.11, 0.016)]
at = mark(part)  # noqa: F821
rows = [ring(V(x, 0, z), Y, Z, r, r * 0.8, r * 0.8, 14) for x, z, r in TAIL]
made = skin(part, rows, [FUR] * len(rows), None, (V(-1.95, 0, 0.1), BACK))  # noqa: F821
for i, row in enumerate(made):
    x, z, r = TAIL[i]
    for p in row:
        part['paint'][p] = coat(p, z, r, 0.0, 5.0)
tail_points = list(part['paint'].keys())[at:]
bind(arm, part, at, ['tail1', 'tail2', 'tail3', 'tail4'], blend=0.1)  # noqa: F821
for p in tail_points:
    # Its root goes with the hips, as it grows out of them.
    if p.co.x > -0.78:
        w = smooth((p.co.x + 0.78) / 0.2)
        part['bones'][p] = [(b, s * (1.0 - w)) for b, s in part['bones'][p]] + [('hips', w)]

# --- the legs: short and strong; broad webbed feet ---------------------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)
    at = mark(part)  # noqa: F821
    made = tube(part, [S(V(0.48, 0.18, 0.4)), S(V(0.52, 0.2, 0.28)), S(V(0.53, 0.21, 0.2)), S(V(0.56, 0.21, 0.12)), S(WRIST)],  # noqa: F821
                [0.1, 0.085, 0.07, 0.06, 0.05], [FUR, FUR, FUR, PAW, PAW], 10)
    for row in made:
        for p in row:
            part['paint'][p] = mix(coat(p, 0.47, 0.25, 0.6, 7.0), PAW, smooth((0.2 - p.co.z) / 0.1))
    bind(arm, part, at, ['upper_arm' + tag, 'forearm' + tag], blend=0.06)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, S(V(0.64, 0.215, 0.035)), (0.08, 0.055, 0.028), 2, PAW)  # noqa: F821
    for k in range(5):
        toe = S(V(0.7, 0.215 + (k - 2) * 0.022, 0.03))
        tube(part, [toe, toe + V(0.045, (k - 2) * 0.006 * side, -0.01)], [0.014, 0.009], [PAW, CLAW], 5)  # noqa: F821
    bind(arm, part, at, 'hand' + tag)  # noqa: F821

    at = mark(part)  # noqa: F821
    made = tube(part, [S(V(-0.42, 0.18, 0.4)), S(V(-0.33, 0.21, 0.26)), S(V(-0.3, 0.22, 0.2)), S(V(-0.36, 0.22, 0.12)), S(HEEL)],  # noqa: F821
                [0.14, 0.11, 0.085, 0.07, 0.055], [FUR, FUR, FUR, PAW, PAW], 10)
    for row in made:
        for p in row:
            part['paint'][p] = mix(coat(p, 0.45, 0.25, 0.0, 8.0), PAW, smooth((0.16 - p.co.z) / 0.1))
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag], blend=0.07)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, S(V(-0.28, 0.235, 0.035)), (0.15, 0.075, 0.03), 2, PAW)  # noqa: F821
    tips = []
    for k in range(5):
        root = S(V(-0.2, 0.235 + (k - 2) * 0.03, 0.035))
        tip = S(V(-0.1 + 0.02 * (2 - abs(k - 2)), 0.235 + (k - 2) * 0.055, 0.02))
        tube(part, [root, tip], [0.018, 0.012], [PAW, PAW], 5)  # noqa: F821
        lump(part, tip + V(0.015, 0, -0.004), (0.016, 0.008, 0.007), 1, CLAW)  # noqa: F821
        tips.append((root, tip))
    for k in range(4):
        quad = [tips[k][0] + V(0.02, 0, 0), tips[k + 1][0] + V(0.02, 0, 0), tips[k + 1][1] - V(0.03, 0, 0),
                tips[k][1] - V(0.03, 0, 0)]
        top = [put(part, p + Z * 0.003, PAW) for p in quad]  # noqa: F821
        low = [put(part, p - Z * 0.003, PAW) for p in quad]  # noqa: F821
        face(part, top)  # noqa: F821
        face(part, low[::-1])  # noqa: F821
        for j in range(4):
            n = (j + 1) % 4
            face(part, (top[n], top[j], low[j], low[n]))  # noqa: F821
    bind(arm, part, at, 'foot' + tag)  # noqa: F821

# --- the pebble it plays with on its chest, floating ---------------------------------------------------------------------
at = mark(part)  # noqa: F821
stone = lump(part, PEBBLE_AT, (0.07, 0.06, 0.04), 2, PEBBLE)  # noqa: F821
for p in stone:
    part['paint'][p] = mix(PEBBLE, PEBBLE_DARK, noise(p.co.x * 40.0, p.co.y * 40.0, p.co.z * 40.0))  # noqa: F821
bind(arm, part, at, 'pebble')  # noqa: F821

body = skinned(arm, part, 'otter-body', strength=0.4, reach=0.25, floor=0.0)  # noqa: F821
# Its own stuff: wet and sleek, so a little glossier than the kit's paint.
WET = body.data.materials[0].copy()
WET.name = 'otter-coat'
for node in WET.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.45
body.data.materials[0] = WET


# --- poses -------------------------------------------------------------------------------------------------------------

def over(*poses):
    out = {}
    for pose in poses:
        for bone, value in pose.items():
            if bone in out and isinstance(out[bone], dict) and isinstance(value, dict):
                merged = dict(out[bone])
                merged.update(value)
                out[bone] = merged
            else:
                out[bone] = value
    return out


def D(x, z, y=0.0, of='root'):
    """A bone pointing along (x, y, z) in the otter's space as its root is turned, not twisted about itself."""
    return {'dir': (x, y, z), 'up': (-z, 0.0, x), 'of': of}


ZERO = (0, 0, 0)
REST = {
    'root': {'loc': (0, 0, 0), 'rot': ZERO},
    'hips': ZERO, 'spine': ZERO, 'chest': ZERO, 'neck': ZERO, 'head': ZERO,
    'tail1': ZERO, 'tail2': ZERO, 'tail3': ZERO, 'tail4': ZERO,
    'pebble': {'rot': ZERO, 'loc': (0, 0, 0), 'scale': 0.001},
    'paw_ik.L': {'at': tuple(WRIST)},
    'upper_arm.L': ZERO, 'forearm.L': {'rot': ZERO, 'con': 1.0}, 'hand.L': ZERO,
    'thigh.L': ZERO, 'shin.L': {'rot': ZERO, 'con': 1.0}, 'foot.L': {'rot': ZERO, 'con': 1.0},
    'heel_ik.L': {'at': tuple(HEEL)}, 'ball_ik.L': {'at': tuple(BALL)},
}
FREE_ARMS = {'forearm.L': {'con': 0.0}}
FREE_LEGS = {'shin.L': {'con': 0.0}, 'foot.L': {'con': 0.0}}


def pose(*extra):
    return over(REST, *extra)


# sit: up on its haunches on the stone, over its origin, its tail out behind it on the stone, paws at its chest.
UPRIGHT = {
    'root': {'loc': (0, 0.52, -0.14), 'rot': ZERO},
    'hips': D(0.32, 1.0), 'spine': D(0.12, 1.0), 'chest': D(0.04, 1.0), 'neck': D(0.35, 1.0), 'head': D(1.0, 0.05),
    'tail1': D(-1.0, -0.55), 'tail2': D(-1.0, -0.12), 'tail3': D(-1.0, 0.0), 'tail4': D(-1.0, 0.03, 0.25),
    'upper_arm.L': D(0.35, -1.0, 0.1), 'forearm.L': {'con': 0.0, 'dir': (1.0, -0.2, 0.35), 'up': (-0.35, 0.0, 1.0)},
    'hand.L': D(0.3, -1.0),
    'heel_ik.L': {'at': (-0.02, 0.2, 0.07)}, 'ball_ik.L': {'at': (0.2, 0.24, 0.025)},
}


def sit_pose(f, frames=72):
    t = f / float(frames)
    breath = math.sin(TAU * 2.0 * t)  # noqa: F821
    sniff = math.sin(f * 1.7) * (1.0 if (8 <= f <= 20 or 44 <= f <= 54) else 0.0)
    lift = 0.06 * smooth((math.sin(TAU * t) + 0.3) / 1.3)  # noqa: F821
    return pose(UPRIGHT, {
        'chest': D(0.04 - 0.02 * breath, 1.0),
        'neck': D(0.35 - lift, 1.0),
        'head': D(1.0, 0.05 + 0.04 * sniff + lift),
        'tail4': D(-1.0, 0.0, 0.25 + 0.2 * math.sin(TAU * t)),  # noqa: F821
    })


clip(arm, 'sit', 72, [(f, sit_pose(f)) for f in range(0, 72, 3)])  # noqa: F821

# look: up taller with a start, its head high, then down into a crouch, ready to jump.
TALL = over(UPRIGHT, {'root': {'loc': (0, 0.52, -0.08), 'rot': ZERO}, 'hips': D(0.2, 1.0), 'spine': D(0.05, 1.0),
                      'chest': D(-0.02, 1.0), 'neck': D(0.15, 1.0), 'head': D(1.0, 0.2)})
CROUCH = over(UPRIGHT, {'root': {'loc': (0, 0.4, -0.22), 'rot': ZERO}, 'hips': D(0.75, 1.0), 'spine': D(0.6, 1.0),
                        'chest': D(0.55, 1.0), 'neck': D(1.0, 1.0), 'head': D(1.0, 0.0),
                        'upper_arm.L': D(0.6, -1.0, 0.1), 'forearm.L': {'con': 0.0, 'dir': (1.0, 0.0, -0.4), 'up': (0.4, 0.0, 1.0)},
                        'tail1': D(-1.0, -0.3), 'tail2': D(-1.0, -0.04)})
clip(arm, 'look', 14, [(0, pose(UPRIGHT)), (4, pose(TALL)), (7, pose(TALL)), (14, pose(CROUCH))], loop=False)  # noqa: F821

# leap: from the crouch, out long through the air, forepaws tucked back, hind feet trailing, head first.
LONG = {
    'root': {'loc': (0, -0.1, 0.0), 'rot': ZERO},
    'hips': D(1.0, 0.0), 'spine': D(1.0, 0.0), 'chest': D(1.0, 0.0), 'neck': D(1.0, 0.05), 'head': D(1.0, -0.05),
    'tail1': D(-1.0, 0.0), 'tail2': D(-1.0, 0.03), 'tail3': D(-1.0, 0.05), 'tail4': D(-1.0, 0.06),
    'upper_arm.L': D(-0.6, -1.0), 'forearm.L': {'con': 0.0, **D(-1.0, -0.3)}, 'hand.L': D(-1.0, -0.1),
    'thigh.L': D(-0.6, -1.0), 'shin.L': {'con': 0.0, **D(-1.0, -0.4)}, 'foot.L': {'con': 0.0, **D(-1.0, 0.0)},
}
REACH = over(LONG, {'upper_arm.L': D(1.0, -0.1), 'forearm.L': {'con': 0.0, **D(1.0, -0.15)}, 'hand.L': D(1.0, -0.3),
                    'hips': D(1.0, -0.12), 'tail1': D(-1.0, -0.2)})
clip(arm, 'leap', 15, [  # noqa: F821
    (0, pose(CROUCH)),
    (4, pose(FREE_LEGS, REACH, {'root': {'loc': (0, -0.1, 0.05), 'rot': (12, 0, 0)}})),
    (9, pose(FREE_LEGS, LONG)),
    (15, pose(FREE_LEGS, LONG, {'neck': D(1.0, -0.1), 'head': D(1.0, -0.2), 'tail2': D(-1.0, 0.12), 'tail3': D(-1.0, 0.2),
                                'tail4': D(-1.0, 0.25)})),
], loop=False)


# swim: long and low at the surface, its body and tail rippling, its feet tucked and kicking a little.
def swim_pose(p):
    wave = lambda k: math.sin(TAU * (p - k))  # noqa: E731,F821
    return pose(FREE_ARMS, FREE_LEGS, LONG, {
        'root': {'loc': (0, -0.1, -0.6 + 0.02 * wave(0.0)), 'rot': (2.0 * wave(0.1), 0, 0)},
        'hips': D(1.0, 0.05 * wave(0.3)), 'spine': D(1.0, 0.05 * wave(0.15)), 'chest': D(1.0, 0.05 * wave(0.0)),
        'neck': D(1.0, 0.45), 'head': D(1.0, -0.02),
        'tail1': D(-1.0, 0.1 * wave(0.4)), 'tail2': D(-1.0, 0.2 * wave(0.55)), 'tail3': D(-1.0, 0.3 * wave(0.7)),
        'tail4': D(-1.0, 0.35 * wave(0.85)),
        'upper_arm.L': D(-0.3, -1.0), 'forearm.L': {'con': 0.0, **D(-1.0, -0.2)}, 'hand.L': D(-1.0, 0.0),
        'thigh.L': D(-0.5 - 0.3 * wave(0.3), -1.0), 'shin.L': {'con': 0.0, **D(-1.0, -0.3 + 0.3 * wave(0.4))},
        'foot.L': {'con': 0.0, **D(-1.0, 0.1 * wave(0.5))},
    })


clip(arm, 'swim', 24, [(f, swim_pose(f / 24.0)) for f in range(0, 24, 2)])  # noqa: F821


# float: on its back, its belly and face to the sky, a pebble held on its chest, turning lazily, feet up, the tail out.
def float_pose(f, frames=96):
    t = f / float(frames)
    sway = math.sin(TAU * t)  # noqa: F821
    turn = math.sin(TAU * t + 0.6)  # noqa: F821
    pat = math.sin(TAU * 4.0 * t)  # noqa: F821
    return pose(FREE_ARMS, FREE_LEGS, {
        'root': {'loc': (0, 0.0, 0.38 + 0.015 * math.sin(TAU * 2.0 * t)), 'rot': (0, 178.0 + 6.0 * sway, 8.0 * turn)},  # noqa: F821
        'hips': D(1.0, -0.12), 'spine': D(1.0, 0.0), 'chest': D(1.0, 0.04), 'neck': D(1.0, -0.4), 'head': D(1.0, -0.35),
        'tail1': D(-1.0, 0.05), 'tail2': D(-1.0, 0.0, 0.12 * sway), 'tail3': D(-1.0, -0.03, 0.2 * sway),
        'tail4': D(-1.0, -0.05, 0.25 * sway),
        'upper_arm.L': D(0.3, -1.0, -0.2), 'forearm.L': {'con': 0.0, 'dir': (0.2, -0.9, -0.3), 'up': (1.0, 0.0, 0.0), 'of': 'root'},
        'hand.L': D(0.2, -0.3, -1.0),
        'thigh.L': D(-0.2, -1.0, 0.2), 'shin.L': {'con': 0.0, **D(0.6, -1.0, 0.1)},
        'foot.L': {'con': 0.0, **D(1.0, -0.6 + 0.25 * pat, 0.15)},
        'pebble': {'loc': (0.0, 0.1, -0.02 + 0.02 * pat), 'rot': (0, 0, 20.0 * turn), 'scale': 1.0},
    })


clip(arm, 'float', 96, [(f, float_pose(f)) for f in range(0, 96, 4)])  # noqa: F821

# climb: up out of the water onto its stone: forepaws up on the edge, a pull, the hind feet scrabble up after.
FOURS = {
    'root': {'loc': (0, -0.1, -0.07), 'rot': ZERO},
    'hips': ZERO, 'spine': ZERO, 'chest': ZERO, 'neck': ZERO, 'head': ZERO,
    'tail1': D(-1.0, -0.12), 'tail2': D(-1.0, -0.2), 'tail3': D(-1.0, -0.15), 'tail4': D(-1.0, -0.08),
    'paw_ik.L': {'at': (0.48, 0.21, 0.06)}, 'heel_ik.L': {'at': (-0.52, 0.22, 0.07)}, 'ball_ik.L': {'at': (-0.3, 0.24, 0.025)},
}
clip(arm, 'climb', 26, [  # noqa: F821
    (0, pose(FREE_ARMS, FREE_LEGS, LONG, {'root': {'loc': (0, -0.1, -0.4), 'rot': (38, 0, 0)}, 'neck': D(1.0, 0.3),
                                          'upper_arm.L': D(1.0, 0.6), 'forearm.L': {'con': 0.0, **D(1.0, 0.3)},
                                          'hand.L': D(1.0, -0.2)})),
    (8, pose(FREE_LEGS, LONG, {'root': {'loc': (0, -0.1, -0.2), 'rot': (30, 0, 0)}, 'neck': D(1.0, 0.1),
                               'forearm.L': {'con': 1.0}, 'paw_ik.L': {'at': (0.62, 0.21, 0.08)}, 'hand.L': D(1.0, -0.1)})),
    (16, pose(FREE_LEGS, LONG, {'root': {'loc': (0, -0.1, -0.02), 'rot': (8, 0, 0)}, 'spine': D(1.0, 0.2),
                                'hips': D(1.0, 0.1), 'forearm.L': {'con': 1.0}, 'paw_ik.L': {'at': (0.5, 0.21, 0.06)},
                                'thigh.L': D(0.6, -1.0), 'shin.L': {'con': 0.0, **D(-0.3, -1.0)}})),
    (26, pose(FOURS)),
], loop=False)


# shake: on all fours, shaking the water off, a wave of twists from its head to its tail.
def shake_pose(f):
    k = math.sin(math.pi * min(1.0, f / 22.0))
    twist = lambda d: 32.0 * k * math.sin(f * 1.9 - d)  # noqa: E731
    return pose(FOURS, {
        'neck': (0, twist(0.0) * 0.6, 0), 'head': (0, twist(0.3) * 0.6, 0), 'chest': (0, twist(0.6), 0),
        'spine': (0, twist(1.0) * 0.7, 0), 'hips': (0, twist(1.4) * 0.5, 0),
        'tail1': D(-1.0, -0.12 + 0.2 * k, 0.4 * k * math.sin(f * 1.9 - 2.0)),
        'tail2': D(-1.0, -0.2 + 0.25 * k, 0.5 * k * math.sin(f * 1.9 - 2.4)),
        'root': {'loc': (0, -0.1, 0.03 * k), 'rot': ZERO},
    })


clip(arm, 'shake', 28, [(f, shake_pose(f)) for f in range(0, 29, 1)], loop=False)  # noqa: F821

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'otter': {'sit': [0, 12, 36], 'look': [0, 4, 14], 'leap': [0, 4, 9, 15], 'swim': [0, 6, 12, 18],
                            'float': [0, 24, 48, 72], 'climb': [0, 8, 16, 26], 'shake': [0, 6, 10, 14, 20]}}
