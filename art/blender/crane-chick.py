"""The crane chick of Myren (plan 3.4, Tranungen): fluffy rusty-brown down, a paler breast, long legs with big feet,
and a short dark beak that opens to peep. It follows Elof's light home to its family. Made with
art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/crane-chick.py --out=art/baked/boot/crane-chick.glb
    node scripts/bake/blender-kit.mjs art/blender/crane-chick.py --fast --preview=<folder>

Units: 1 Blender unit is 1 EL; Z is up, the chick faces +X, and the camera's side is -Y. It stands with its feet at the
origin, about 1 EL tall, as the stand-in built in code (src/render/crane.ts craneChick) does. One mesh, its colours on its
corners, skinned to its bones. The clips, each named 'crane-chick:<clip>':
    idle   it peeps, looks up at him, flaps its little wings, tilts its head, pecks at the ground   (loop)
    walk   one stride of both feet, its head held and thrust; the game turns it by how far it goes  (loop)
    run    the same, running, leaning forward, its wings out for balance                          (loop)
A stride of `walk` covers WALK_STRIDE EL and one of `run` RUN_STRIDE (src/render/crane-chick.ts reads the same).
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

RUST = tone('#b5793f')        # noqa: F821 (kit-tools.py)
RUST_DARK = tone('#97602f')   # noqa: F821
CREAM = tone('#dcc09a')       # noqa: F821
FACE = tone('#c99460')        # noqa: F821
LEG = tone('#857766')         # noqa: F821
TOE = tone('#6f6253')         # noqa: F821
BEAK = tone('#4c3e30')        # noqa: F821
EYE = tone('#141210')         # noqa: F821
SHINE = tone('#f4eee2')       # noqa: F821

WALK_STRIDE = 0.48
RUN_STRIDE = 0.8


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


def V(x, y, z):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


BODY_C = V(0.0, 0.0, 0.46)
HIP = V(0.0, 0.075, 0.38)
KNEE = V(0.05, 0.08, 0.28)
HEEL = V(-0.01, 0.075, 0.15)
BALL = V(0.02, 0.075, 0.025)
TOE_TIP = V(0.14, 0.075, 0.01)
UP = V(0, 0, 0.08)

BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.15), {'deform': False}),
    ('body', 'root', tuple(BODY_C + V(-0.04, 0, 0)), tuple(BODY_C + V(0.2, 0, 0))),
    ('tail', 'body', (-0.2, 0, 0.48), (-0.32, 0, 0.5)),
    ('neck1', 'body', (0.13, 0, 0.52), (0.18, 0, 0.67)),
    ('neck2', 'neck1', (0.18, 0, 0.67), (0.22, 0, 0.8), {'connect': True}),
    ('head', 'neck2', (0.22, 0, 0.8), (0.4, 0, 0.84), {'connect': True}),
    ('jaw', 'head', (0.33, 0, 0.842), (0.41, 0, 0.834)),
    ('wing.L', 'body', (0.05, 0.18, 0.53), (-0.15, 0.21, 0.47)),
    ('thigh.L', 'body', tuple(HIP), tuple(KNEE)),
    ('shin.L', 'thigh.L', tuple(KNEE), tuple(HEEL), {'connect': True, 'ik': ('heel_ik.L', 2)}),
    ('tarsus.L', 'shin.L', tuple(HEEL), tuple(BALL), {'connect': True, 'track': 'ball_ik.L'}),
    ('toes.L', 'tarsus.L', tuple(BALL), tuple(TOE_TIP), {'connect': True, 'track': 'toe_ik.L'}),
    ('heel_ik.L', None, tuple(HEEL), tuple(HEEL + UP), {'ctrl': True}),
    ('ball_ik.L', None, tuple(BALL), tuple(BALL + UP), {'ctrl': True}),
    ('toe_ik.L', None, tuple(TOE_TIP), tuple(TOE_TIP + UP), {'ctrl': True}),
]
arm = armature('crane-chick', BONES)  # noqa: F821
part = new_part()  # noqa: F821


def fluff(points, centre, size, amount, dark_back=True, cream_front=True):
    """Down: each point pushed out a little, unevenly, and coloured rust, darker on the back, cream at the breast."""
    for p in points:
        n = p.co - centre
        local = V(n.x / size[0], n.y / size[1], n.z / size[2])
        tuft = noise(p.co.x * 46.0, p.co.y * 46.0, p.co.z * 46.0)  # noqa: F821
        coarse = noise(p.co.x * 15.0 + 3.0, p.co.y * 15.0, p.co.z * 15.0)  # noqa: F821
        p.co = p.co + n.normalized() * amount * (0.6 * tuft + 0.4 * coarse - 0.35)
        c = RUST
        if dark_back:
            c = mix(c, RUST_DARK, smooth((local.z - 0.2) / 0.6) * smooth((0.4 - local.x) / 0.8))
        if cream_front:
            c = mix(c, CREAM, 0.85 * smooth((-local.z + 0.3) / 0.7) * smooth((local.x + 0.2) / 0.5))
        # The tips of the down are paler: where a tuft stands out, it catches the light.
        c = mix(c, CREAM, 0.25 * smooth((tuft - 0.55) / 0.3))
        part['paint'][p] = lit(c, 0.92 + 0.14 * tuft)  # noqa: F821


# --- the body: a round ball of down -----------------------------------------------------------------------------------
at = mark(part)  # noqa: F821
size = (0.27, 0.21, 0.22)
fluff(lump(part, BODY_C, size, 4, RUST), BODY_C, size, 0.03)  # noqa: F821
bind(arm, part, at, 'body')  # noqa: F821
at = mark(part)  # noqa: F821
size = (0.08, 0.085, 0.065)
fluff(lump(part, V(-0.25, 0, 0.5), size, 2, RUST), V(-0.25, 0, 0.5), size, 0.025, cream_front=False)  # noqa: F821
bind(arm, part, at, 'tail', blend=0.05)  # noqa: F821

# --- the neck and the head: a big round head, paler at the face --------------------------------------------------------
at = mark(part)  # noqa: F821
made = tube(part, [V(0.12, 0, 0.48), V(0.165, 0, 0.62), V(0.2, 0, 0.74), V(0.23, 0, 0.83)], [0.085, 0.066, 0.06, 0.062],  # noqa: F821
            [RUST, RUST, RUST, RUST], 10, closed_ends=False, twist=0.0)
for ring in made:
    for p in ring:
        part['paint'][p] = mix(RUST, CREAM, 0.45 * smooth((p.co.x - 0.2) / 0.05)) if p.co.z < 0.7 else RUST
bind(arm, part, at, ['neck1', 'neck2', 'head'], blend=0.05)  # noqa: F821
HEAD_C = V(0.26, 0, 0.86)
at = mark(part)  # noqa: F821
size = (0.11, 0.096, 0.1)
ball = lump(part, HEAD_C, size, 4, RUST)  # noqa: F821
fluff(ball, HEAD_C, size, 0.012, cream_front=False)
for p in ball:
    n = p.co - HEAD_C
    if n.x > 0.02 and n.z < 0.04:
        part['paint'][p] = mix(part['paint'][p], FACE, 0.75 * smooth((n.x - 0.02) / 0.05))
# a few tufts of down on the crown
for i, (x, y) in enumerate(((0.22, 0.0), (0.25, 0.03), (0.25, -0.03), (0.19, 0.02))):
    base = V(x, y, 0.94)
    tube(part, [base, base + V(-0.02 - 0.01 * i, y * 0.6, 0.05)], [0.012, 0.002], [RUST, RUST_DARK], 5)  # noqa: F821
# the upper beak, and the eyes with a speck of light
tube(part, [V(0.34, 0, 0.862), V(0.39, 0, 0.857), V(0.44, 0, 0.846)], [0.022, 0.013, 0.003], [BEAK, BEAK, BEAK], 8, squash=0.8,  # noqa: F821
     lean=V(0, 0, 1))
for side in (-1.0, 1.0):
    lump(part, V(0.32, side * 0.074, 0.885), (0.022, 0.014, 0.024), 2, EYE)  # noqa: F821
    lump(part, V(0.333, side * 0.084, 0.893), (0.006, 0.004, 0.006), 1, SHINE)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821
# the lower beak, which opens to peep
at = mark(part)  # noqa: F821
tube(part, [V(0.335, 0, 0.843), V(0.38, 0, 0.838), V(0.42, 0, 0.832)], [0.016, 0.01, 0.003], [BEAK, BEAK, BEAK], 8, squash=0.7,  # noqa: F821
     lean=V(0, 0, 1))
bind(arm, part, at, 'jaw')  # noqa: F821

# --- the little wings: stubs of down that flap -----------------------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    centre = V(-0.04, 0.19 * side, 0.5)
    size = (0.13, 0.045, 0.075)
    fluff(lump(part, centre, size, 2, RUST_DARK), centre, size, 0.02, cream_front=False)  # noqa: F821
    bind(arm, part, at, 'wing' + tag)  # noqa: F821

# --- the legs: long and thin, a knob at the heel, and big feet ------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    path = [S(HIP), S(lerp(HIP, KNEE, 0.5)), S(KNEE)]
    radii = [0.05, 0.045, 0.034]
    colours = [RUST, RUST, RUST]
    for k in range(1, 5):
        path.append(S(lerp(KNEE, HEEL, k / 4.0)))
        radii.append(0.034 - 0.014 * k / 4.0 if k < 4 else 0.024)
        colours.append(RUST if k == 1 else LEG)
    for k in range(1, 5):
        path.append(S(lerp(HEEL, BALL, k / 4.0)))
        radii.append(0.018 - 0.002 * k / 4.0)
        colours.append(LEG)
    at = mark(part)  # noqa: F821
    tube(part, path, radii, colours, 8)  # noqa: F821
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag, 'tarsus' + tag], blend=0.04)  # noqa: F821
    at = mark(part)  # noqa: F821
    for turn, long in ((-0.55, 0.1), (0.0, 0.13), (0.55, 0.1)):
        d = V(math.cos(turn), math.sin(turn) * side, 0.0)
        tube(part, [S(BALL), S(BALL) + d * long * 0.5 + V(0, 0, -0.008), S(BALL) + d * long + V(0, 0, -0.014)],  # noqa: F821
             [0.015, 0.012, 0.005], [TOE, TOE, TOE], 6)
    bind(arm, part, at, 'toes' + tag)  # noqa: F821
    at = mark(part)  # noqa: F821
    tube(part, [S(BALL + V(0, 0, 0.01)), S(BALL + V(-0.045, 0, -0.005))], [0.01, 0.004], [TOE, TOE], 5)  # noqa: F821
    bind(arm, part, at, 'tarsus' + tag)  # noqa: F821

skinned(arm, part, 'crane-chick-body', strength=0.35, reach=0.12, floor=0.0)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def foot(tag, x, lift, toe_down=0.0):
    """One foot: the ball at `x`, lifted `lift`; the heel above it, the toes ahead, drooping as it lifts."""
    y = 0.075 if tag == '.L' else -0.075
    return {'ball_ik' + tag: {'at': (x, y, 0.025 + lift)},
            'heel_ik' + tag: {'at': (x - 0.035, y, 0.15 + lift * 0.85)},
            'toe_ik' + tag: {'at': (x + 0.115, y, 0.01 + lift * (1.0 - toe_down))},
            'thigh' + tag: (0, 0, 0), 'shin' + tag: {'rot': (0, 0, 0)}, 'tarsus' + tag: {'rot': (0, 0, 0)}, 'toes' + tag: {'rot': (0, 0, 0)}}


def standing():
    return over(foot('.L', 0.02, 0.0), foot('.R', 0.02, 0.0))


REST = {'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'neck1': (0, 0, 0), 'neck2': (0, 0, 0), 'head': (0, 0, 0), 'jaw': (0, 0, 0),
        'tail': (0, 0, 0), 'wing.L': (0, 0, 0)}


def idle(extra=None):
    return over(REST, standing(), extra or {})


LOOK_UP = {'neck1': (14, 0, 0), 'neck2': (10, 0, 0), 'head': (26, 0, -12)}
PEEP = {'jaw': (-22, 0, 0)}
WINGS_OUT = {'wing.L': {'dir': (-0.55, 0.8, 0.25), 'up': (0.0, -0.3, 1.0)}}
WINGS_IN = {'wing.L': {'dir': (-0.95, 0.15, -0.28), 'up': (0.0, 0.0, 1.0)}}
TILT = {'head': (8, 22, -18)}
PECK = {'neck1': (-30, 0, 0), 'neck2': (-26, 0, 0), 'head': (-30, 0, 0), 'body': {'loc': (0, 0, -0.02), 'rot': (-14, 0, 0)}}
clip(arm, 'idle', 120, [  # noqa: F821
    (0, idle()),
    (14, idle(LOOK_UP)),
    (18, idle(over(LOOK_UP, PEEP))),
    (22, idle(LOOK_UP)),
    (26, idle(over(LOOK_UP, PEEP))),
    (32, idle(LOOK_UP)),
    (44, idle(over(WINGS_OUT, {'body': {'loc': (0, 0, 0.02), 'rot': (4, 0, 0)}}))),
    (48, idle(WINGS_IN)),
    (52, idle(WINGS_OUT)),
    (58, idle()),
    (70, idle(TILT)),
    (80, idle(TILT)),
    (90, idle(PECK)),
    (94, idle(over(PECK, {'head': (-38, 0, 0)}))),
    (98, idle(PECK)),
    (108, idle(over(LOOK_UP, PEEP))),
    (112, idle(LOOK_UP)),
])


def gait(name, frames, stride, stance, lift, lean, bob, wings_out=False):
    """A loop of one stride: each foot on the ground for `stance` of it, moving back as far as the stride carries the
    body, then lifted `lift` and brought forward. Its head is held while the body goes under it, and thrust on."""
    keys = []
    reach = stride * stance / 2.0
    for f in range(0, frames, 2):
        p = f / float(frames)
        pose = {}
        for tag, offset in (('.L', 0.0), ('.R', 0.5)):
            q = (p + offset) % 1.0
            if q < stance:
                x = reach - 2.0 * reach * (q / stance)
                up = 0.0
            else:
                s = (q - stance) / (1.0 - stance)
                x = -reach + 2.0 * reach * smooth(s)
                up = lift * math.sin(math.pi * s)
            pose.update(foot(tag, x + 0.02, up, toe_down=0.6))
        # Down at each foot's landing, up between; the head lags, then thrusts, twice a stride.
        twice = (2.0 * p) % 1.0
        body_z = -bob * math.cos(2.0 * math.pi * twice)
        thrust = -6.0 + 12.0 * smooth((twice - 0.6) / 0.3) if twice > 0.6 else 6.0 - 12.0 * (twice / 0.6)
        pose.update({'body': {'loc': (0, 0, body_z), 'rot': (lean, 0, 3.0 * math.sin(2 * math.pi * p))},
                     'neck1': (-lean * 0.6 + thrust * 0.5, 0, 0), 'neck2': (thrust * 0.6, 0, 0), 'head': (-thrust * 0.9, 0, 0),
                     'jaw': (0, 0, 0), 'tail': (4.0 * math.sin(2 * math.pi * p), 0, 0)})
        if wings_out:
            wob = math.sin(4.0 * math.pi * p)
            pose['wing.L'] = {'dir': (-0.6, 0.75, 0.15 + 0.25 * wob), 'up': (0.0, -0.3, 1.0)}
        else:
            pose['wing.L'] = (0, 0, 0)
        keys.append((f, pose))
    clip(arm, name, frames, keys)  # noqa: F821


gait('walk', 24, WALK_STRIDE, 0.58, 0.06, -4.0, 0.012)
gait('run', 16, RUN_STRIDE, 0.42, 0.11, -14.0, 0.025, wings_out=True)
bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'crane-chick': {'idle': [0, 18, 44, 70, 94], 'walk': [0, 6, 12, 18], 'run': [0, 4, 8, 12]}}
