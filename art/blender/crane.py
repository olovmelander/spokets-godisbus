"""The common crane of Myren and Berget (plan 4.4, 4.5): one bird with bones, that kneels on the bog for Elof to climb
on, rises, takes off with him on its back, flies, glides and lands. Made with art/blender/kit-tools.py and
art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/crane.py --out=art/baked/boot/crane.glb
    node scripts/bake/blender-kit.mjs art/blender/crane.py --fast --preview=<folder>    (stills of every clip)

Units: 1 Blender unit is 1 EL; Z is up, the bird faces +X, and the camera's side is -Y (its right: the '.R' bones). Its
origin is on the ground under the place on its back where he stands (the bone 'saddle'). Standing, its back is 2.2 EL
up; kneeling, 0.9. The game (src/render/crane-ride.ts) plays its clips, finds where he stands from 'saddle', and where
it would touch the ground from 'belly' and the toes.

Its rest pose is the bird standing with its wings spread. It is one mesh with its colours on its corners, skinned to
its bones: the body, neck and legs bend smoothly at their joints; each part of the arm of a wing, each covert and each
group of flight feathers goes rigidly with its own bone, so that a wing folds as a bird's does, its feathers sliding
over each other. The clips, each named 'crane:<clip>':
    kneel      on its shins, breathing, looking about, at him, and a glance back along its wing     (loop)
    rise       from kneeling to standing, its wings opening at the end                              (once)
    stand      standing, breathing, looking about                                                   (loop)
    takeoff    three running steps, the leap, the first strong beats, its legs going back           (once)
    fly        one wingbeat from the top: down in 60% of it, up in the rest. The near wing (towards
               the camera) rises only to about level, so that it never hides a rider               (loop)
    fly-free   the same beat with both wings full, for flying with no one on its back              (loop)
    glide      wings held a little under level, the fingers spread and turned up, a slow sway      (loop)
    land       legs forward, wings cupped and braking, touchdown, and down onto its shins           (once)
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

GREY = tone('#9aa1a8')        # noqa: F821 (kit-tools.py)
BACK = tone('#8a9198')        # noqa: F821
PALE = tone('#b9bec2')        # noqa: F821
COVERT = tone('#a2a9af')      # noqa: F821
SLATE = tone('#4a4f55')       # noqa: F821
DARK = tone('#33363b')        # noqa: F821
BLACK = tone('#1f2124')       # noqa: F821
WHITE = tone('#eceae4')       # noqa: F821
RED = tone('#c0352a')         # noqa: F821
HORN = tone('#9a9a78')        # noqa: F821
HORN_TIP = tone('#6d6c58')    # noqa: F821
EYE = tone('#8a2a14')         # noqa: F821
LEG = tone('#2b2c2e')         # noqa: F821
TOE = tone('#232426')         # noqa: F821


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


def V(x, y, z):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


# --- the bones ---------------------------------------------------------------------------------------------------------

BODY_Z = 1.88
SADDLE = V(0.0, 0.0, 2.23)
NECK = [V(0.62, 0, 2.00), V(0.84, 0, 2.27), V(0.93, 0, 2.57), V(0.95, 0, 2.87), V(1.02, 0, 3.12)]
HEAD_TIP = V(1.32, 0, 3.14)
SHOULDER = V(0.24, 0.30, 2.06)
ELBOW = V(0.12, 0.86, 2.09)
WRIST = V(0.24, 1.56, 2.08)
HAND = V(0.12, 2.02, 2.06)
HIP = V(0.02, 0.16, 1.74)
KNEE = V(0.20, 0.18, 1.48)
HEEL = V(-0.02, 0.16, 0.78)
BALL = V(0.08, 0.15, 0.06)
TOE_TIP = V(0.36, 0.15, 0.03)
UP = V(0, 0, 0.15)
SEC_AT = [0.14, 0.47, 0.80]
PRIM_AT = [0.10, 0.28, 0.46, 0.64, 0.82, 1.0]
PRIM_TURN = [62.0, 50.0, 38.0, 26.0, 13.0, 0.0]   # how far back from straight out each finger points, at rest
PRIM_LONG = [0.56, 0.6, 0.64, 0.66, 0.64, 0.58]


def prim_dir(k, spread=1.0, back=0.0):
    a = math.radians(PRIM_TURN[k] * spread + back)
    return V(-math.sin(a), math.cos(a), 0.0)


BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.3), {'deform': False}),
    ('body', 'root', (-0.05, 0, BODY_Z), (0.55, 0, BODY_Z)),
    ('saddle', 'body', tuple(SADDLE), tuple(SADDLE + UP), {'deform': False}),
    ('belly', 'body', (0.0, 0, BODY_Z - 0.38), (0.0, 0, BODY_Z - 0.5), {'deform': False}),
    ('tail', 'body', (-0.72, 0, 1.93), (-1.12, 0, 1.93)),
    ('bustle1', 'body', (-0.28, 0, 2.17), (-0.70, 0, 2.10)),
    ('bustle2', 'bustle1', (-0.70, 0, 2.10), (-1.10, 0, 1.80), {'connect': True}),
    ('neck1', 'body', tuple(NECK[0]), tuple(NECK[1])),
    ('neck2', 'neck1', tuple(NECK[1]), tuple(NECK[2]), {'connect': True}),
    ('neck3', 'neck2', tuple(NECK[2]), tuple(NECK[3]), {'connect': True}),
    ('neck4', 'neck3', tuple(NECK[3]), tuple(NECK[4]), {'connect': True}),
    ('head', 'neck4', tuple(NECK[4]), tuple(HEAD_TIP), {'connect': True}),
    ('upperarm.L', 'body', tuple(SHOULDER), tuple(ELBOW)),
    ('forearm.L', 'upperarm.L', tuple(ELBOW), tuple(WRIST), {'connect': True}),
    ('hand.L', 'forearm.L', tuple(WRIST), tuple(HAND), {'connect': True}),
    # The tertials of the inner wing, on the upper arm: they fold back along the body with the secondaries.
    ('tert.L', 'upperarm.L', tuple(lerp(SHOULDER, ELBOW, 0.5) + V(-0.05, 0, 0)), tuple(lerp(SHOULDER, ELBOW, 0.5) + V(-0.55, 0, -0.01)),
     {'z': (0, 0, 1)}),
]
for i, u in enumerate(SEC_AT):
    root = lerp(ELBOW, WRIST, u) + V(-0.03, 0, 0)
    BONES.append(('sec%d.L' % (i + 1), 'forearm.L', tuple(root), tuple(root + V(-0.5, 0, -0.01)), {'z': (0, 0, 1)}))
for k, u in enumerate(PRIM_AT):
    root = lerp(WRIST, HAND, u)
    BONES.append(('prim%d.L' % (k + 1), 'hand.L', tuple(root), tuple(root + prim_dir(k) * PRIM_LONG[k]), {'z': (0, 0, 1)}))
BONES += [
    ('thigh.L', 'body', tuple(HIP), tuple(KNEE)),
    ('shin.L', 'thigh.L', tuple(KNEE), tuple(HEEL), {'connect': True, 'ik': ('heel_ik.L', 2)}),
    ('tarsus.L', 'shin.L', tuple(HEEL), tuple(BALL), {'connect': True, 'track': 'ball_ik.L'}),
    ('toes.L', 'tarsus.L', tuple(BALL), tuple(TOE_TIP), {'connect': True, 'track': 'toe_ik.L'}),
    ('heel_ik.L', None, tuple(HEEL), tuple(HEEL + UP), {'ctrl': True}),
    ('ball_ik.L', None, tuple(BALL), tuple(BALL + UP), {'ctrl': True}),
    ('toe_ik.L', None, tuple(TOE_TIP), tuple(TOE_TIP + UP), {'ctrl': True}),
]

arm = armature('crane', BONES)  # noqa: F821 (creature-tools.py)
part = new_part()  # noqa: F821


def feather(root, ahead, side, long, wide, droop, c_root, c_tip, steps=6, bend=None, quill=0.006, shape=0.6):
    """One long feather: a blade from `root` along `ahead`, `wide` across `side`, its quill raised, curving by
    `droop` towards `bend` (by default, square to its face). A smaller `shape` makes it blunter: a covert."""
    ahead = ahead.normalized()
    side = side.normalized()
    down = (bend if bend is not None else ahead.cross(side)).normalized()
    rows = []
    for s in range(steps + 1):
        t = s / steps
        c = root + ahead * (long * t) + down * (droop * long * t * t)
        w = wide * (math.sin(math.pi * min(1.0, 0.12 + t * 0.98)) ** shape) * (1.0 - 0.25 * t) + 0.004
        colour = mix(c_root, c_tip, smooth((t - 0.3) / 0.6))
        rows.append([put(part, c - side * w, colour), put(part, c - down * quill * (1 - t), colour), put(part, c + side * w, colour)])  # noqa: F821
    for s in range(steps):
        a, b = rows[s], rows[s + 1]
        face(part, [a[0], b[0], b[1], a[1]])  # noqa: F821
        face(part, [a[1], b[1], b[2], a[2]])  # noqa: F821


def panel(lead, trail, steps_chord, camber, colour_lead, colour_trail):
    """A cambered sheet between two lines of points, its front edge `lead` and its back edge `trail`: a covert."""
    grid = []
    for i in range(len(lead)):
        row = []
        for j in range(steps_chord + 1):
            a = j / steps_chord
            p = lerp(lead[i], trail[i], a) + V(0, 0, camber * math.sin(math.pi * a) * (1.0 - 0.4 * i / max(1, len(lead) - 1)))
            row.append(put(part, p, mix(colour_lead, colour_trail, smooth(a / 0.7))))  # noqa: F821
        grid.append(row)
    for i in range(len(grid) - 1):
        for j in range(steps_chord):
            face(part, [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]])  # noqa: F821


# --- the body: a long egg, grey, the back a shade darker, the belly paler -------------------------------------------
PROFILE = [(-0.98, 0.03, 0.03, 0.05), (-0.88, 0.12, 0.13, 0.04), (-0.68, 0.22, 0.24, 0.02), (-0.40, 0.31, 0.33, 0.0),
           (-0.10, 0.355, 0.37, -0.01), (0.20, 0.36, 0.37, -0.02), (0.48, 0.33, 0.33, -0.02), (0.70, 0.26, 0.25, 0.01),
           (0.86, 0.17, 0.16, 0.06), (0.95, 0.08, 0.08, 0.10)]
AROUND = 24
WING_GREY = tone('#868d94')  # noqa: F821
rings = []
tones = []
for r in range(30):
    # The profile, read every so often along the body: enough rings for the feathers painted on it.
    x = PROFILE[0][0] + (PROFILE[-1][0] - PROFILE[0][0]) * r / 29.0
    h = along([(p[0], p[1]) for p in PROFILE], x)  # noqa: F821
    d = along([(p[0], p[2]) for p in PROFILE], x)  # noqa: F821
    lift = along([(p[0], p[3]) for p in PROFILE], x)  # noqa: F821
    ring = []
    shade = []
    for j in range(AROUND):
        a = TAU * j / AROUND  # noqa: F821
        over_ = math.cos(a)
        ring.append(V(x, math.sin(a) * d, BODY_Z + lift + over_ * h))
        back = smooth((over_ - 0.2) / 0.5)
        belly = smooth((-over_ - 0.1) / 0.6)
        rows = 0.97 + 0.06 * noise(x * 9.0, math.sin(a) * 3.0, over_ * 3.0)  # noqa: F821
        c = mix(mix(GREY, BACK, back), PALE, belly)
        # The folded wing, painted on the flank where it lies: a darker grey in rows of feathers with pale edges,
        # and towards the tail the dark flight feathers under the bustle.
        wing_here = smooth((0.5 - x) / 0.2) * smooth((x + 0.9) / 0.2) * smooth((over_ + 0.45) / 0.25) * smooth((0.85 - over_) / 0.2)
        scallop = (x * 7.0 + over_ * 1.6 + 0.35 * math.sin(math.sin(a) * 9.0)) % 1.0
        feathered = mix(WING_GREY, PALE, 0.35 * smooth((scallop - 0.78) / 0.18))
        feathered = mix(feathered, SLATE, 0.7 * smooth((-0.4 - x) / 0.25) * smooth((0.5 - over_) / 0.4))
        shade.append(lit(mix(c, feathered, wing_here), rows))  # noqa: F821
    rings.append(ring)
    tones.append(shade)
at = mark(part)  # noqa: F821
skin(part, rings, tones, first=(V(-1.01, 0, BODY_Z + 0.05), DARK), last=(V(0.98, 0, BODY_Z + 0.11), GREY))  # noqa: F821
bind(arm, part, at, ['body', 'tail'], blend=0.18)  # noqa: F821

# --- the tail: short, dark, under the bustle ----------------------------------------------------------------------
at = mark(part)  # noqa: F821
for i in range(9):
    k = (i - 4) / 4.0
    feather(V(-0.80, k * 0.09, 1.95), V(-1.0, k * 0.35, -0.10), V(0, 1, 0), 0.40 - 0.05 * abs(k), 0.055, 0.12, SLATE, BLACK, 4)
bind(arm, part, at, 'tail')  # noqa: F821

# --- the bustle: long dark tertials falling back and down over the tail, the crane's own outline ---------------------
at = mark(part)  # noqa: F821
for i in range(28):
    k = i / 27.0
    side = (k - 0.5) * 0.56
    angle = 0.12 + 0.3 * math.sin(i * 1.7) ** 2
    long = 0.66 + 0.26 * math.sin(i * 2.3) ** 2
    ahead = V(-math.cos(angle), side * 0.7, -math.sin(angle)).normalized()
    # Lying soft and loose, their faces mostly up and a little ruffled, rather than on edge.
    ruffle = 0.6 * (rnd(i, 3.0) - 0.5)  # noqa: F821
    across = V(0.0, math.cos(ruffle), math.sin(ruffle))
    across = (across - ahead * across.dot(ahead)).normalized()
    tip = SLATE if i % 3 else BLACK
    start = V(-0.4 - 0.06 * (i % 4), side * 0.5, 2.0 + 0.04 * math.sin(i * 2.2))
    feather(start, ahead, across, long, 0.085 + 0.03 * math.sin(i * 1.3) ** 2, 0.55, tone('#6a7078'), tip, 7, bend=V(0, 0, -1))  # noqa: F821
bind(arm, part, at, ['bustle1', 'bustle2'], blend=0.15)  # noqa: F821


# --- the neck: an S, grey low down, then black in front and white behind ----------------------------------------
def catmull(points, t):
    n = len(points) - 1
    f = min(n - 1e-6, t * n)
    i = int(f)
    u = f - i
    p0, p1, p2, p3 = points[max(i - 1, 0)], points[i], points[i + 1], points[min(i + 2, n)]
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)


NECK_PATH = NECK + [V(1.08, 0, 3.17)]
COUNT = 26
path = [catmull(NECK_PATH, k / COUNT) for k in range(COUNT + 1)]
radii = [0.15 + (0.058 - 0.15) * smooth(k / COUNT) for k in range(COUNT + 1)]
at = mark(part)  # noqa: F821
made = tube(part, path, radii, [GREY] * len(path), 14, closed_ends=False, twist=0.0)  # noqa: F821
for k, ring in enumerate(made):
    t = k / COUNT
    for p in ring:
        off = (p.co - path[k]).normalized()
        facing = off.dot(V(1, 0, 0.2).normalized())
        upper = mix(WHITE, BLACK, smooth((facing + 0.45) / 0.3))
        part['paint'][p] = mix(GREY, upper, smooth((t - 0.30) / 0.12))
bind(arm, part, at, ['neck1', 'neck2', 'neck3', 'neck4', 'head'], blend=0.1)  # noqa: F821

# --- the head: black, a white patch behind the eye running into the neck, the red crown, a long horn beak -----------
HEAD_C = V(1.11, 0, 3.17)
at = mark(part)  # noqa: F821
ball = lump(part, HEAD_C, (0.145, 0.088, 0.1), 3, BLACK)  # noqa: F821
for p in ball:
    n = p.co - HEAD_C
    n = V(n.x / 0.145, n.y / 0.088, n.z / 0.1)
    if n.z > 0.45 and -0.45 < n.x < 0.8:
        part['paint'][p] = RED
    elif n.x < 0.15 and abs(n.y) > 0.35 and -0.85 < n.z < 0.35:
        part['paint'][p] = WHITE
tube(part, [V(1.20, 0, 3.155), V(1.32, 0, 3.15), V(1.44, 0, 3.135), V(1.55, 0, 3.11)], [0.038, 0.03, 0.02, 0.004],  # noqa: F821
     [HORN, HORN, HORN_TIP, HORN_TIP], 10, squash=0.85, lean=V(0, 0, 1))
for side in (-1.0, 1.0):
    lump(part, V(1.17, side * 0.082, 3.195), (0.021, 0.012, 0.021), 1, EYE)  # noqa: F821
    lump(part, V(1.175, side * 0.088, 3.197), (0.010, 0.006, 0.010), 1, BLACK)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# --- the wings: each part of the arm, each covert and each group of flight feathers with a bone of its own ----------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    # the leading edge, round where the bones are, with a knob at each joint
    for bone, a, b, r0, r1 in (('upperarm', SHOULDER - V(0, 0.08, 0), ELBOW, 0.06, 0.045), ('forearm', ELBOW, WRIST, 0.045, 0.036),
                               ('hand', WRIST, HAND + V(0.02, 0.06, 0), 0.036, 0.022)):
        at = mark(part)  # noqa: F821
        tube(part, [S(lerp(a, b, k / 4.0)) for k in range(5)], [r0 + (r1 - r0) * k / 4.0 for k in range(5)],  # noqa: F821
             [COVERT] * 5, 8, squash=0.7, lean=V(0, 0, 1), twist=0.0)
        lump(part, S(b), (r1 * 1.15, r1 * 1.15, r1 * 0.9), 1, COVERT)  # noqa: F821
        bind(arm, part, at, bone + tag)  # noqa: F821

    # the coverts: two rows of short round feathers over the base of the flight feathers, each overlapping the next,
    # pale at the front. Those of the forearm go with the secondaries they lie on, and fold back with them.
    def coverts(a, b, n, offset, long, wide, lift, c0, c1, bones):
        for i in range(n):
            u = (i + 0.5) / n
            at = mark(part)  # noqa: F821
            root = S(lerp(a, b, u) + V(offset, 0, lift))
            feather(root, V(-1.0, side * 0.04 * (u - 0.5), -0.06), V(0, side, 0), long, wide, 0.12, c0, c1, 4, bend=V(0, 0, -1),
                    quill=0.003, shape=0.3)
            bone = bones[min(len(bones) - 1, int(u * len(bones)))]
            bind(arm, part, at, bone + tag)  # noqa: F821

    coverts(SHOULDER, ELBOW, 6, -0.02, 0.2, 0.065, 0.035, PALE, COVERT, ['upperarm'])
    coverts(SHOULDER, ELBOW, 5, -0.14, 0.28, 0.075, 0.02, COVERT, GREY, ['tert'])
    coverts(ELBOW, WRIST, 8, -0.02, 0.19, 0.06, 0.03, PALE, COVERT, ['sec1', 'sec2', 'sec3'])
    coverts(ELBOW, WRIST, 7, -0.13, 0.27, 0.07, 0.018, COVERT, GREY, ['sec1', 'sec2', 'sec3'])
    coverts(WRIST, HAND, 5, -0.02, 0.17, 0.055, 0.02, PALE, COVERT, ['hand'])
    coverts(WRIST, HAND, 4, -0.11, 0.24, 0.065, 0.012, COVERT, SLATE, ['hand'])
    # the inner secondaries (the tertials of the inner wing), on the arm
    at = mark(part)  # noqa: F821
    for i in range(4):
        root = S(lerp(SHOULDER, ELBOW, 0.2 + 0.22 * i) + V(-0.2, 0, -0.01))
        feather(root, V(-1.0, side * 0.05, -0.04), V(0, side, 0), 0.5, 0.08, 0.1, SLATE, BLACK, 5, bend=V(0, 0, -1))
    bind(arm, part, at, 'tert' + tag)  # noqa: F821
    # the secondaries, along the forearm: long, dark, black at their tips
    for g, u0 in enumerate(SEC_AT):
        at = mark(part)  # noqa: F821
        for i in range(5):
            u = min(1.0, max(0.0, u0 - 0.14 + 0.066 * i))
            root = S(lerp(ELBOW, WRIST, u) + V(-0.16, 0, -0.01))
            feather(root, V(-1.0, side * 0.08 * (u - 0.4), -0.03), V(0, side, 0), 0.6 - 0.08 * u, 0.095, 0.1, SLATE, BLACK, 5,
                    bend=V(0, 0, -1))
        bind(arm, part, at, 'sec%d%s' % (g + 1, tag))  # noqa: F821
    # the primaries, black fingers from the hand, each on a bone of its own
    for k, u in enumerate(PRIM_AT):
        at = mark(part)  # noqa: F821
        root = lerp(WRIST, HAND, u) + V(-0.03, 0, -0.005)
        d = prim_dir(k)
        feather(S(root), S(d), S(V(d.y, -d.x, 0)), PRIM_LONG[k] + 0.05, 0.07 - 0.01 * (k > 3), 0.08, DARK, BLACK, 6, bend=V(0, 0, -1))
        if k < 3:
            d2 = prim_dir(k, back=8.0)
            feather(S(root + V(0.03, 0.03, 0.004)), S(d2), S(V(d2.y, -d2.x, 0)), PRIM_LONG[k] - 0.02, 0.07, 0.08, DARK, BLACK, 6,
                    bend=V(0, 0, -1))
        bind(arm, part, at, 'prim%d%s' % (k + 1, tag))  # noqa: F821

# --- the legs: feathered grey thighs, then long bare dark legs with a knob at the heel -------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    path = []
    radii = []
    colours = []
    for k in range(3):
        t = k / 3.0
        path.append(S(lerp(HIP, KNEE, t)))
        radii.append(0.11 + (0.085 - 0.11) * t)
        colours.append(GREY)
    for k in range(7):
        t = k / 7.0
        path.append(S(lerp(KNEE, HEEL, t)))
        radii.append(0.085 - 0.049 * smooth(t / 0.45))
        colours.append(GREY if t < 0.38 else LEG)
    for k in range(6):
        t = k / 6.0
        path.append(S(lerp(HEEL, BALL, t)))
        radii.append(0.046 if k == 0 else 0.036 - 0.008 * t)
        colours.append(LEG)
    path.append(S(BALL + V(0.0, 0, -0.01)))
    radii.append(0.026)
    colours.append(LEG)
    at = mark(part)  # noqa: F821
    tube(part, path, radii, colours, 10)  # noqa: F821
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag, 'tarsus' + tag], blend=0.07)  # noqa: F821
    # three toes forward, spread, and a short one behind
    at = mark(part)  # noqa: F821
    for turn, long in ((-0.5, 0.24), (0.0, 0.3), (0.5, 0.24)):
        d = V(math.cos(turn), math.sin(turn) * side, 0.0)
        tip = S(BALL) + d * long + V(0, 0, -0.03)
        tube(part, [S(BALL), S(BALL) + d * long * 0.5 + V(0, 0, -0.015), tip], [0.024, 0.018, 0.008], [TOE, TOE, BLACK], 6)  # noqa: F821
    bind(arm, part, at, 'toes' + tag)  # noqa: F821
    at = mark(part)  # noqa: F821
    tube(part, [S(BALL + V(0.0, 0, 0.02)), S(BALL + V(-0.09, 0, 0.0))], [0.016, 0.007], [TOE, BLACK], 5)  # noqa: F821
    bind(arm, part, at, 'tarsus' + tag)  # noqa: F821

skinned(arm, part, 'crane-body', strength=0.55, reach=0.35, leaf=True)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def sag(d, extra=None):
    """A bone of the middle or of a leg pointing along `d`, its own X kept towards the creature's right."""
    d = V(*d).normalized()
    out = {'dir': tuple(d), 'up': tuple(V(0, -1, 0).cross(d))}
    if extra:
        out.update(extra)
    return out


def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def folded():
    """Its wings folded along its sides: the leading edge high on the flank, the flight feathers lying back over the
    tail under the bustle. Given in the body's own space ('of': 'body'), so that they go with it as it tips."""
    out = {
        'upperarm.L': {'dir': (-0.94, 0.02, -0.34), 'up': (0.0, 0.85, 0.5), 'of': 'body'},
        'forearm.L': {'dir': (0.97, -0.16, 0.18), 'up': (0.0, 0.85, 0.5), 'of': 'body'},
        'hand.L': {'dir': (-0.96, -0.02, -0.27), 'up': (0.0, 0.88, 0.45), 'of': 'body'},
        'tert.L': {'dir': (-0.95, -0.1, -0.22), 'up': (0.0, 0.9, 0.42), 'of': 'body'},
    }
    for i in range(3):
        out['sec%d.L' % (i + 1)] = {'dir': (-0.96, -0.06, -0.26 + 0.05 * i), 'up': (0.0, 0.9, 0.42), 'of': 'body'}
    for k in range(6):
        out['prim%d.L' % (k + 1)] = {'dir': (-0.97, -0.08, -0.2 + 0.01 * k), 'up': (0.0, 0.9, 0.4), 'of': 'body'}
    return out


IK_LEG = {'thigh.L': (0, 0, 0), 'shin.L': {'con': 1.0, 'rot': (0, 0, 0)}, 'tarsus.L': {'con': 1.0, 'rot': (0, 0, 0)},
          'toes.L': {'con': 1.0, 'rot': (0, 0, 0)}}


def standing_legs(bend=0.0):
    """Both feet flat under it, a little bent at the knee by `bend` EL."""
    return over(IK_LEG, {'heel_ik.L': {'at': tuple(HEEL + V(-0.04 * bend, 0, -bend))}, 'ball_ik.L': {'at': tuple(BALL)},
                         'toe_ik.L': {'at': tuple(TOE_TIP)}})


def kneeling_legs():
    """On its shins: the heels on the ground behind, the shins along the ground forward, the toes flat."""
    return over(IK_LEG, {'heel_ik.L': {'at': (-0.30, 0.17, 0.07)}, 'ball_ik.L': {'at': (0.42, 0.17, 0.05)},
                         'toe_ik.L': {'at': (0.72, 0.17, 0.03)}})


def trailing_legs():
    """In flight: the legs straight out behind, a little apart."""
    return {'thigh.L': sag((-0.55, 0.06, -0.83)),
            'shin.L': over({'con': 0.0}, sag((-0.97, 0.02, -0.24))),
            'tarsus.L': over({'con': 0.0}, sag((-0.995, 0.0, -0.06))),
            'toes.L': over({'con': 0.0}, sag((-0.9, 0.0, 0.42)))}


KNEEL_BODY = {'body': {'loc': (0, 0, -1.33), 'rot': (4, 0, 0)}}
STAND_BODY = {'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}}
NECK_S = {'neck1': (0, 0, 0), 'neck2': (0, 0, 0), 'neck3': (0, 0, 0), 'neck4': (0, 0, 0), 'head': (0, 0, 0)}
BUSTLE_REST = {'bustle1': (0, 0, 0), 'bustle2': (0, 0, 0), 'tail': (0, 0, 0)}
FLAT_NECK = {'neck1': sag((0.97, 0, 0.24)), 'neck2': sag((0.99, 0, 0.1)), 'neck3': sag((1.0, 0, 0.02)),
             'neck4': sag((1.0, 0, 0.0)), 'head': sag((1.0, 0, -0.03))}
# In flight the bustle lies back flat over the tail: a turn about X lifts a bone that points back when it is negative.
FLIGHT_BUSTLE = {'bustle1': (-12, 0, 0), 'bustle2': (-38, 0, 0), 'tail': (0, 0, 0)}


def kneel_pose(extra=None):
    return over(KNEEL_BODY, NECK_S, BUSTLE_REST, folded(), kneeling_legs(), extra or {})


def stand_pose(extra=None, bend=0.0):
    return over(STAND_BODY, NECK_S, BUSTLE_REST, folded(), standing_legs(bend), extra or {})


# --- the wingbeat ----------------------------------------------------------------------------------------------------
# A beat from the top: the downstroke, which carries it, to frame 12 of 20; the upstroke, quicker, the rest.

def beat(phase, far=True, scale=1.0):
    """The wing `phase` of a beat in: 'top', 'mid-down', 'bottom', 'mid-up'. The near wing (far=False) rises only to
    about level, and flexes more on its way up instead."""
    if phase == 'top':
        return {'upperarm': ((46 if far else 4) * scale, 0, 6), 'forearm': (8, 0, 14), 'hand': (-10, 6, 26), 'spread': 0.55, 'tip': 4}
    if phase == 'mid-down':
        return {'upperarm': ((6 if far else 0) * scale, 0, -6), 'forearm': (2, 0, -2), 'hand': (14 if far else 4, -4, -4), 'spread': 1.15,
                'tip': 10 if far else -2}
    if phase == 'bottom':
        return {'upperarm': (-40 * scale, 0, -4), 'forearm': (-6, 0, -4), 'hand': (-12, 0, 2), 'spread': 1.1, 'tip': -4}
    return {'upperarm': ((-8 if far else -14) * scale, 0, 4), 'forearm': (4, 0, 26), 'hand': (-24, 10, 42), 'spread': 0.45, 'tip': -10}


def wing(tag, b):
    out = {'upperarm' + tag: b['upperarm'], 'forearm' + tag: b['forearm'], 'hand' + tag: b['hand']}
    for k in range(6):
        # Spread: each finger turned back from its place at rest; closed, they come together.
        out['prim%d%s' % (k + 1, tag)] = (b['tip'] * (0.5 + 0.1 * k), 0, PRIM_TURN[k] * (b['spread'] - 1.0))
    for i in range(3):
        out['sec%d%s' % (i + 1, tag)] = (b['tip'] * 0.3, 0, 0)
    out['tert' + tag] = (b['tip'] * 0.2, 0, 0)
    return out


def wings(far_b, near_b):
    """The far wing (.L) in `far_b`, the near wing (.R) in `near_b`, both given as for a left wing."""
    out = wing('.L', far_b)
    for bone, value in wing('.R', near_b).items():
        out[bone] = (value[0], -value[1], -value[2])
    return out


def flight(extra=None, bob=0.0, pitch=0.0):
    return over({'body': {'loc': (0, 0, bob), 'rot': (pitch, 0, 0)}}, FLAT_NECK, FLIGHT_BUSTLE, trailing_legs(), extra or {})


FLY = [(0, 'top', -0.03, 1.5), (6, 'mid-down', 0.0, 0.0), (12, 'bottom', 0.04, -1.5), (16, 'mid-up', 0.01, 0.0)]
clip(arm, 'fly', 20, [(f, flight(wings(beat(p), beat(p, far=False)), bob, pitch)) for f, p, bob, pitch in FLY])  # noqa: F821
clip(arm, 'fly-free', 20, [(f, flight(wings(beat(p), beat(p)), bob, pitch)) for f, p, bob, pitch in FLY])  # noqa: F821

GLIDE = {'upperarm': (-6, 0, 0), 'forearm': (0, 0, -2), 'hand': (4, 0, 4), 'spread': 1.2, 'tip': 9}
GLIDE2 = {'upperarm': (-3, 0, 2), 'forearm': (1, 0, 0), 'hand': (7, 0, 2), 'spread': 1.25, 'tip': 12}
clip(arm, 'glide', 48, [(0, flight(wings(GLIDE, GLIDE), 0.0, 0.0)), (24, flight(wings(GLIDE2, GLIDE2), 0.015, 0.8))])  # noqa: F821

# --- kneeling: breathing, looking about, at him, and a glance back along its wing ------------------------------------
LOOK_CAMERA = {'neck3': (0, -8, 0), 'neck4': (2, -12, 0), 'head': (4, 0, -40)}
LOOK_BACK = {'neck2': (6, 20, 0), 'neck3': (4, 30, 0), 'neck4': (2, 24, 0), 'head': (-6, 0, 50)}
LOOK_AHEAD = {'neck3': (4, 4, 0), 'neck4': (0, 6, 0), 'head': (-6, 0, 18)}
BREATHE_IN = {'body': {'loc': (0, 0, -1.33 + 0.012), 'rot': (4.6, 0, 0)}}
clip(arm, 'kneel', 144, [  # noqa: F821
    (0, kneel_pose()),
    (18, kneel_pose(BREATHE_IN)),
    (36, kneel_pose(LOOK_CAMERA)),
    (54, kneel_pose(over(LOOK_CAMERA, BREATHE_IN))),
    (66, kneel_pose()),
    (84, kneel_pose(over(LOOK_BACK, BREATHE_IN))),
    (98, kneel_pose(LOOK_BACK)),
    (112, kneel_pose(LOOK_AHEAD)),
    (126, kneel_pose(over(LOOK_AHEAD, BREATHE_IN))),
])

# --- standing: the same, upright ---------------------------------------------------------------------------------------
STAND_IN = {'body': {'loc': (0, 0, 0.012), 'rot': (0.6, 0, 0)}}
clip(arm, 'stand', 96, [  # noqa: F821
    (0, stand_pose()),
    (20, stand_pose(STAND_IN)),
    (40, stand_pose(LOOK_CAMERA)),
    (60, stand_pose(over(LOOK_AHEAD, STAND_IN))),
    (78, stand_pose(LOOK_AHEAD)),
])

# --- rising: from its shins to its feet, the wings opening at the end -------------------------------------------------
clip(arm, 'rise', 24, [  # noqa: F821
    (0, kneel_pose()),
    (6, kneel_pose({'body': {'loc': (0, 0, -1.2), 'rot': (-6, 0, 0)}, 'neck2': (-6, 0, 0), 'neck3': (8, 0, 0)})),
    (14, stand_pose({'body': {'loc': (0, 0, -0.55), 'rot': (-8, 0, 0)}}, bend=0.3)),
    (24, stand_pose(over({'body': {'loc': (0, 0, 0.0), 'rot': (-6, 0, 0)}, 'neck3': (8, 0, 0), 'neck4': (6, 0, 0)},
                         wings(beat('mid-up'), beat('mid-up', far=False))))),
], loop=False)


# --- taking off: three running steps, the leap, the first strong beats -----------------------------------------------

def run_feet(l_at, r_at):
    """The feet in a run: each is (x of the ball, height lifted); the heel and the toes follow."""
    out = {}
    for tag, (x, lift) in (('.L', l_at), ('.R', r_at)):
        y = 0.16 if tag == '.L' else -0.16
        out['ball_ik' + tag] = {'at': (x, y, 0.06 + lift)}
        out['toe_ik' + tag] = {'at': (x + 0.28, y, 0.03 + lift * 0.7)}
        out['heel_ik' + tag] = {'at': (x - 0.12, y, 0.72 + lift * 0.6)}
        out['thigh' + tag] = (0, 0, 0)
        for bone in ('shin', 'tarsus', 'toes'):
            out[bone + tag] = {'con': 1.0, 'rot': (0, 0, 0)}
    return out


RUN_NECK = {'neck1': (-14, 0, 0), 'neck2': (-8, 0, 0), 'neck3': (6, 0, 0), 'neck4': (8, 0, 0), 'head': (4, 0, 0)}


def takeoff_frame(feet, wing_phase, body, scale=1.0):
    return over(body, RUN_NECK, BUSTLE_REST, wings(beat(wing_phase, scale=scale), beat(wing_phase, far=False, scale=scale)), feet)


PUSHED = {'thigh.L': sag((0.2, 0.06, -0.98)), 'shin.L': over({'con': 0.0}, sag((-0.4, 0.02, -0.92))),
          'tarsus.L': over({'con': 0.0}, sag((-0.75, 0.0, -0.66))), 'toes.L': over({'con': 0.0}, sag((-0.5, 0.0, -0.86)))}
clip(arm, 'takeoff', 34, [  # noqa: F821
    (0, takeoff_frame(run_feet((0.10, 0.0), (0.10, 0.0)), 'mid-up', {'body': {'loc': (0, 0, -0.04), 'rot': (-8, 0, 0)}}, 0.8)),
    (4, takeoff_frame(run_feet((-0.12, 0.0), (0.30, 0.22)), 'top', {'body': {'loc': (0, 0.04, -0.08), 'rot': (-12, 0, 0)}}, 0.9)),
    (8, takeoff_frame(run_feet((0.36, 0.2), (-0.10, 0.0)), 'bottom', {'body': {'loc': (0, 0.08, 0.02), 'rot': (-14, 0, 0)}}, 0.9)),
    (12, takeoff_frame(run_feet((-0.10, 0.0), (0.40, 0.25)), 'top', {'body': {'loc': (0, 0.10, -0.06), 'rot': (-14, 0, 0)}}, 1.0)),
    (16, takeoff_frame(run_feet((0.20, 0.15), (-0.20, 0.0)), 'bottom', {'body': {'loc': (0, 0.12, 0.05), 'rot': (-12, 0, 0)}}, 1.0)),
    # The leap: the last foot pushes off, the body goes up, the wings down hard.
    (19, takeoff_frame(run_feet((-0.05, 0.05), (-0.45, 0.10)), 'mid-down', {'body': {'loc': (0, 0.14, 0.3), 'rot': (-6, 0, 0)}}, 1.1)),
    (22, over({'body': {'loc': (0, 0.14, 0.42), 'rot': (-2, 0, 0)}}, FLAT_NECK, BUSTLE_REST,
              wings(beat('bottom', scale=1.15), beat('bottom', far=False, scale=1.15)), PUSHED)),
    (26, flight(wings(beat('mid-up'), beat('mid-up', far=False)), 0.2, 2)),
    (30, flight(wings(beat('top'), beat('top', far=False)), 0.06, 1)),
    (34, flight(wings(beat('mid-down'), beat('mid-down', far=False)), 0.0, 0)),
], loop=False)


# --- landing: legs forward, wings cupped and braking, touchdown, and down onto its shins -------------------------------

def reaching_legs(f):
    """The legs swung forward and down under it, ready for the ground: `f` from 0 (trailing) to 1."""
    return {'thigh.L': sag((0.3 * f - 0.55 * (1 - f), 0.06, -0.95)),
            'shin.L': over({'con': 0.0}, sag((-0.2 * f - 0.97 * (1 - f), 0.02, -0.98 * f - 0.24 * (1 - f)))),
            'tarsus.L': over({'con': 0.0}, sag((0.25 * f - 0.99 * (1 - f), 0.0, -0.97 * f - 0.06 * (1 - f)))),
            'toes.L': over({'con': 0.0}, sag((0.85 * f - 0.9 * (1 - f), 0.0, -0.4 * f + 0.42 * (1 - f))))}


CUPPED = {'upperarm': (24, 0, -18), 'forearm': (6, 0, -10), 'hand': (-34, -6, -6), 'spread': 1.25, 'tip': -6}
CUPPED_NEAR = {'upperarm': (4, 0, -18), 'forearm': (6, 0, -10), 'hand': (-30, -6, -6), 'spread': 1.25, 'tip': -6}
BRAKE = {'upperarm': (-18, 0, -26), 'forearm': (0, 0, -12), 'hand': (-20, 0, -10), 'spread': 1.3, 'tip': 4}
clip(arm, 'land', 36, [  # noqa: F821
    (0, flight(wings(beat('mid-down'), beat('mid-down', far=False)), 0.0, 0)),
    (6, over({'body': {'loc': (0, 0, 0.0), 'rot': (8, 0, 0)}}, FLAT_NECK, FLIGHT_BUSTLE, wings(CUPPED, CUPPED_NEAR), reaching_legs(0.5))),
    (11, over({'body': {'loc': (0, 0, 0.0), 'rot': (14, 0, 0)}}, NECK_S, BUSTLE_REST, wings(BRAKE, BRAKE), reaching_legs(0.9))),
    (15, over({'body': {'loc': (0, 0, 0.0), 'rot': (16, 0, 0)}}, NECK_S, BUSTLE_REST, wings(CUPPED, CUPPED_NEAR), reaching_legs(1.0))),
    # Touchdown: the feet on the ground under it, its knees taking its weight.
    (19, stand_pose(over({'body': {'loc': (0, 0, -0.18), 'rot': (8, 0, 0)}}, wings(BRAKE, BRAKE)), bend=0.15)),
    (24, stand_pose({'body': {'loc': (0, 0, -0.5), 'rot': (2, 0, 0)}}, bend=0.35)),
    (30, kneel_pose({'body': {'loc': (0, 0, -1.15), 'rot': (6, 0, 0)}})),
    (36, kneel_pose()),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'crane': {'fly': [0, 6, 12, 16], 'fly-free': [0, 6, 12, 16], 'glide': [0, 24], 'kneel': [0, 36, 84, 112],
                            'stand': [0, 40, 78], 'rise': [0, 6, 12, 18, 24], 'takeoff': [0, 4, 8, 12, 16, 19, 22, 26, 30, 34],
                            'land': [0, 6, 11, 15, 19, 24, 30, 36]}}
