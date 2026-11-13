"""Lavskrikan, the Siberian jay (plan 4.6, P6): Elof's friend, who lands at the window in the prologue, takes his
lingonberry in Granskogen, Stormskogen and on the summit, and comes as the helper in every chapter after the garden.
One bird with bones, made with art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/jay.py --out=art/baked/boot/jay.glb
    node scripts/bake/blender-kit.mjs art/blender/jay.py --fast --preview=<folder>    (stills of every clip)

Units: 1 Blender unit is 1 EL; Z is up, the bird faces +X, and the camera's side is -Y (its right: the '.R' bones). It
stands with its feet at the origin, about 0.72 EL to the top of its crown, as the bird built in code (src/render/jay.ts)
does. The marker bone 'bill' is the tip of its beak, where the game puts the berry it takes.

A round, fluffy jay: grey-brown above, paler grey-buff below, warming to rust under the tail; a big round head with a
sooty cap, a pale face round the short dark beak and pale tufts over its nostrils, a bright dark eye with a speck of
light, a crown that it raises; rust at the base of its primaries and their coverts, a rust rump and a long tail whose
outer feathers are bright rust, so that both flash when it opens its wings and fans its tail. Short dark legs, three
toes forward and one behind, that grip.

Its rest pose is the bird standing with its wings spread, tail closed. It is one mesh with its colours on its corners,
skinned to its bones: the body and the neck bend smoothly, each part of the arm of a wing, each group of flight
feathers and each half of the tail goes rigidly with its own bone, so that a wing folds as a bird's does and the tail
fans. The body's feathers go with 'puff', which swells as it fluffs itself up. The clips, each named 'jay:<clip>':
    idle      looks about in quick snaps, flicks its tail, fluffs itself up and shakes                     (loop)
    look      cocks its head at him, one eye and then the other, its crown up                            (loop)
    hop       one hop on the spot, from a crouch, landing with a give                                     (loop)
    peck      two pecks at the ground                                                                      (loop)
    eat       reaches out, takes the berry, tips its head back and swallows it, pleased                   (once)
    call      head up, crown up, its beak open twice: the two notes of its call                           (once)
    takeoff   a crouch, the spring, the first beats, its legs drawn up; ends as `fly` begins             (once)
    fly       one wingbeat from the top: down in 60% of it, up, flexed, in the rest; the game scrubs it   (loop)
    glide     wings out and held a little under level, the primaries spread, the tail a little fanned     (loop)
    land      braking with wings and fanned tail, legs forward, touchdown at frame 9, folding             (once)
    perch     sitting low on a sill or a branch, toes curled round it, looking about                      (loop)
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Matrix, Vector

BACK = tone('#6e6157')        # noqa: F821 (kit-tools.py)  the grey-brown of its back
GREY = tone('#887a6d')        # noqa: F821  its sides
PALE = tone('#b9ab99')        # noqa: F821  the grey-buff breast
THROAT = tone('#bfb4a5')      # noqa: F821
BUFF = tone('#c39a72')        # noqa: F821  the warm belly
RUST = tone('#cf6d2b')        # noqa: F821  tail, rump, wing patch
RUST_DEEP = tone('#a9521e')   # noqa: F821
CAP = tone('#3a302a')         # noqa: F821
CAP_EDGE = tone('#54483f')    # noqa: F821
HEAD = tone('#887e75')        # noqa: F821
FACE = tone('#cbc1b2')        # noqa: F821
WING = tone('#6a5f56')        # noqa: F821
WING_EDGE = tone('#857a6f')   # noqa: F821
WING_TIP = tone('#463e38')    # noqa: F821
BEAK = tone('#2a2420')        # noqa: F821
LEG = tone('#332c27')         # noqa: F821
CLAW = tone('#1d1916')        # noqa: F821
EYE = tone('#120d0b')         # noqa: F821
EYE_RIM = tone('#5d544c')     # noqa: F821
SHINE = tone('#f6f1e8')       # noqa: F821


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

BODY_C = V(-0.03, 0.0, 0.36)
PITCH = math.radians(16.0)          # the body's long axis, front up
HEAD_C = V(0.215, 0.0, 0.585)
HEAD_SIZE = (0.15, 0.142, 0.145)
TAIL_ROOT = V(-0.25, 0.0, 0.335)
SHOULDER = V(0.075, 0.18, 0.47)
ELBOW = V(-0.005, 0.32, 0.475)
WRIST = V(0.055, 0.48, 0.475)
HAND = V(0.005, 0.6, 0.47)
HIP = V(0.0, 0.06, 0.3)
KNEE = V(0.07, 0.068, 0.22)
HEEL = V(-0.02, 0.064, 0.125)
BALL = V(0.02, 0.058, 0.022)
TOE_MID = V(0.068, 0.058, 0.012)
TOE_TIP = V(0.112, 0.058, 0.004)
HALLUX = V(-0.035, 0.058, 0.008)
UP = V(0, 0, 0.05)
GONE = 0.02                         # the scale of a part drawn in to nothing
COVER_AT = V(0.02, 0.09, 0.44)
SEC_AT = [0.25, 0.75]
PRIM_AT = [0.08, 0.3, 0.52, 0.74, 0.96]
PRIM_TURN = [58.0, 44.0, 31.0, 18.0, 6.0]   # how far back from straight out each group points, at rest
PRIM_LONG = [0.25, 0.27, 0.285, 0.29, 0.28]
TAIL_LONG = 0.4
FAN_STEP = 2.2                      # degrees between the closed tail's feathers


def prim_dir(k, spread=1.0, back=0.0):
    a = math.radians(PRIM_TURN[k] * spread + back)
    return V(-math.sin(a), math.cos(a), 0.0)


def tail_dir(i):
    """The way tail feather i (0 the middle, 4 the outermost, on the left) points in the closed tail."""
    a = math.radians(FAN_STEP * i)
    return V(-math.cos(a), math.sin(a), -0.42 - 0.035 * i).normalized()


BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.1), {'deform': False}),
    ('body', 'root', tuple(BODY_C + V(-0.12, 0, -0.03)), tuple(BODY_C + V(0.16, 0, 0.045))),
    ('puff', 'body', tuple(BODY_C + V(-0.02, 0, 0)), tuple(BODY_C + V(0.06, 0, 0.02))),
    ('neck1', 'body', (0.09, 0, 0.44), (0.135, 0, 0.495)),
    ('neck2', 'neck1', (0.135, 0, 0.495), (0.165, 0, 0.535), {'connect': True}),
    ('head', 'neck2', (0.165, 0, 0.535), (0.33, 0, 0.56), {'connect': True}),
    ('jaw', 'head', (0.33, 0, 0.553), (0.41, 0, 0.545)),
    ('bill', 'head', (0.44, 0, 0.553), (0.48, 0, 0.553), {'deform': False}),
    ('crest', 'head', (0.235, 0, 0.705), (0.15, 0, 0.73)),
    ('tail', 'body', (-0.17, 0, 0.35), tuple(TAIL_ROOT)),
    ('fan1.L', 'tail', tuple(TAIL_ROOT + V(0, 0.012, 0)), tuple(TAIL_ROOT + V(0, 0.012, 0) + tail_dir(1.5) * TAIL_LONG)),
    ('fan2.L', 'tail', tuple(TAIL_ROOT + V(0, 0.024, -0.004)), tuple(TAIL_ROOT + V(0, 0.024, -0.004) + tail_dir(3.5) * TAIL_LONG)),
    # The folded wing as it lies on its side: a shell of its own, shown while the wing is folded and drawn in to
    # nothing, inside the body, while the wing of feathers below is open.
    ('cover.L', 'puff', tuple(COVER_AT), tuple(COVER_AT + V(-0.1, 0, -0.02))),
    ('upperarm.L', 'body', tuple(SHOULDER), tuple(ELBOW)),
    ('forearm.L', 'upperarm.L', tuple(ELBOW), tuple(WRIST), {'connect': True}),
    ('hand.L', 'forearm.L', tuple(WRIST), tuple(HAND), {'connect': True}),
    ('tert.L', 'upperarm.L', tuple(lerp(SHOULDER, ELBOW, 0.55) + V(-0.03, 0, 0)), tuple(lerp(SHOULDER, ELBOW, 0.55) + V(-0.22, 0, -0.005)),
     {'z': (0, 0, 1)}),
]
for i, u in enumerate(SEC_AT):
    root = lerp(ELBOW, WRIST, u) + V(-0.02, 0, 0)
    BONES.append(('sec%d.L' % (i + 1), 'forearm.L', tuple(root), tuple(root + V(-0.22, 0, -0.004)), {'z': (0, 0, 1)}))
for k, u in enumerate(PRIM_AT):
    root = lerp(WRIST, HAND, u)
    BONES.append(('prim%d.L' % (k + 1), 'hand.L', tuple(root), tuple(root + prim_dir(k) * PRIM_LONG[k]), {'z': (0, 0, 1)}))
BONES += [
    ('thigh.L', 'body', tuple(HIP), tuple(KNEE)),
    ('shin.L', 'thigh.L', tuple(KNEE), tuple(HEEL), {'connect': True, 'ik': ('heel_ik.L', 2)}),
    ('tarsus.L', 'shin.L', tuple(HEEL), tuple(BALL), {'connect': True, 'track': 'ball_ik.L'}),
    ('toes.L', 'tarsus.L', tuple(BALL), tuple(TOE_MID), {'connect': True, 'track': 'toe_ik.L'}),
    ('claws.L', 'toes.L', tuple(TOE_MID), tuple(TOE_TIP), {'connect': True}),
    ('hallux.L', 'tarsus.L', tuple(BALL), tuple(HALLUX)),
    ('heel_ik.L', None, tuple(HEEL), tuple(HEEL + UP), {'ctrl': True}),
    ('ball_ik.L', None, tuple(BALL), tuple(BALL + UP), {'ctrl': True}),
    ('toe_ik.L', None, tuple(TOE_MID), tuple(TOE_MID + UP), {'ctrl': True}),
]

arm = armature('jay', BONES)  # noqa: F821 (creature-tools.py)
part = new_part()  # noqa: F821


def feather(root, ahead, side, long, wide, droop, c_root, c_tip, steps=5, bend=None, quill=0.003, shape=0.6, c_edge=None):
    """One feather: a blade from `root` along `ahead`, `wide` across `side`, its quill raised, curving by `droop`
    towards `bend` (by default, square to its face). A smaller `shape` makes it blunter: a covert. `c_edge`, if given,
    is the colour of its edges, so that a row of them shows each one."""
    ahead = ahead.normalized()
    side = side.normalized()
    down = (bend if bend is not None else ahead.cross(side)).normalized()
    rows = []
    for s in range(steps + 1):
        t = s / steps
        c = root + ahead * (long * t) + down * (droop * long * t * t)
        w = wide * (math.sin(math.pi * min(1.0, 0.14 + t * 0.9)) ** shape) * (1.0 - 0.2 * t) + 0.002
        colour = mix(c_root, c_tip, smooth((t - 0.35) / 0.55))
        edge = mix(colour, c_edge, 0.55) if c_edge is not None else colour
        rows.append([put(part, c - side * w, edge), put(part, c - down * quill * (1 - t), colour), put(part, c + side * w, edge)])  # noqa: F821
    for s in range(steps):
        a, b = rows[s], rows[s + 1]
        face(part, [a[0], b[0], b[1], a[1]])  # noqa: F821
        face(part, [a[1], b[1], b[2], a[2]])  # noqa: F821


def tuft(base, ahead, long, wide, c_root, c_tip):
    """A small soft tuft: a short, broad feather, cupped."""
    side = ahead.cross(V(0, 0, 1))
    if side.length < 0.1:
        side = ahead.cross(V(0, 1, 0))
    feather(base, ahead, side, long, wide, 0.25, c_root, c_tip, 3, quill=0.004, shape=0.4)


def body_frame():
    """The body's own axes: u along it (front up by PITCH), v to its left, w up from its back."""
    u = V(math.cos(PITCH), 0.0, math.sin(PITCH))
    w = V(-math.sin(PITCH), 0.0, math.cos(PITCH))
    return u, V(0, 1, 0), w


# --- the body: a round, fluffy egg, sleek on the back, loose and soft below -------------------------------------------
U, VV, W = body_frame()
at = mark(part)  # noqa: F821
made = lump(part, V(0, 0, 0), (1.0, 1.0, 1.0), 4, GREY)  # noqa: F821
for p in made:
    d = p.co.normalized()
    a, b, c = d.x, d.y, d.z
    ax = 0.25 if a > 0 else 0.3
    ay = 0.205 * (1.0 - 0.22 * max(0.0, -a) ** 2) * (1.0 - 0.08 * max(0.0, c))
    az = 0.2 if c > 0 else 0.22
    local = V(a * ax + 0.03 * max(0.0, a) * max(0.0, -c), b * ay, c * az)
    world = BODY_C + U * local.x + VV * local.y + W * local.z
    normal = (U * (a / ax) + VV * (b / ay) + W * (c / az)).normalized()
    tuft_n = noise(world.x * 52.0, world.y * 52.0, world.z * 52.0)  # noqa: F821
    coarse = noise(world.x * 17.0 + 3.0, world.y * 17.0, world.z * 17.0)  # noqa: F821
    loose = 0.006 + 0.022 * smooth((0.35 - c) / 0.9)
    world = world + normal * loose * (0.65 * tuft_n + 0.35 * coarse - 0.35)
    p.co = world
    # Its colours, by where on the body the point is.
    back = smooth((c - 0.05) / 0.55)
    under = smooth((-c + 0.1) / 0.55)
    col = mix(mix(GREY, BACK, back), PALE, under)
    col = mix(col, BUFF, under * smooth((-a + 0.2) / 0.6) * 0.8)
    col = mix(col, RUST, smooth((-a - 0.45) / 0.3) * smooth((-c - 0.05) / 0.4))
    col = mix(col, RUST, 0.85 * smooth((-a - 0.62) / 0.2) * smooth((c + 0.15) / 0.35))
    col = mix(col, THROAT, smooth((a - 0.55) / 0.3) * smooth((0.25 - c) / 0.5))
    # Rows of feathers, each with a paler edge: soft scallops.
    scallop = (local.x * 26.0 + 2.0 * math.sin(local.y * 22.0) + 0.6 * coarse) % 1.0
    col = mix(col, mix(col, THROAT, 0.35), 0.5 * smooth((scallop - 0.72) / 0.2) * (0.4 + 0.6 * under))
    part['paint'][p] = lit(col, 0.93 + 0.12 * tuft_n)  # noqa: F821
bind(arm, part, at, 'puff')  # noqa: F821

# loose soft feathers on its belly and flanks, its "trousers" over the thighs, and under the tail
at = mark(part)  # noqa: F821
for i in range(14):
    a = -0.15 + 0.85 * rnd(i, 1.0)  # noqa: F821
    s = (rnd(i, 2.0) - 0.5) * 1.6  # noqa: F821
    d = (U * a + VV * s * 0.75 + W * (-0.55 - 0.3 * rnd(i, 3.0))).normalized()  # noqa: F821
    base = BODY_C + U * (d.dot(U) * 0.24) + VV * (d.dot(VV) * 0.19) + W * (d.dot(W) * 0.2)
    tuft(base, (d * 0.5 + V(-0.7, 0, -0.2)).normalized(), 0.04 + 0.02 * rnd(i, 4.0), 0.036, PALE, mix(PALE, THROAT, 0.5))  # noqa: F821
bind(arm, part, at, 'puff')  # noqa: F821
for side in (1.0, -1.0):
    at = mark(part)  # noqa: F821
    for i in range(5):
        base = V(0.0 + 0.02 * i, side * (0.085 + 0.012 * (i % 2)), 0.24 - 0.008 * i)
        tuft(base, V(-0.25, side * 0.3, -1.0), 0.07 - 0.006 * i, 0.03, mix(PALE, GREY, 0.4), PALE)
    bind(arm, part, at, 'thigh' + ('.L' if side > 0 else '.R'))  # noqa: F821
at = mark(part)  # noqa: F821
for i in range(7):
    y = (i - 3) * 0.022
    tuft(V(-0.2, y, 0.25 + 0.01 * abs(i - 3)), V(-1.0, y * 2.0, -0.45), 0.1 - 0.01 * abs(i - 3), 0.032, RUST_DEEP, RUST)
bind(arm, part, at, 'tail')  # noqa: F821

# --- the neck: short and thick, pale at the throat, the cap running down the nape --------------------------------------
NECK_PATH = [V(0.06, 0, 0.43), V(0.105, 0, 0.475), V(0.145, 0, 0.52), V(0.185, 0, 0.56)]
at = mark(part)  # noqa: F821
made = tube(part, NECK_PATH, [0.13, 0.12, 0.112, 0.105], [GREY] * 4, 14, closed_ends=False, twist=0.0)  # noqa: F821
for k, ring in enumerate(made):
    for p in ring:
        off = (p.co - NECK_PATH[k]).normalized()
        front = smooth((off.x * 0.8 - off.z * 0.6 + 0.1) / 0.5)
        nape = smooth((-off.x * 0.7 + off.z * 0.7 - 0.1) / 0.4) * smooth((k - 0.8) / 1.5)
        n = noise(p.co.x * 50.0, p.co.y * 50.0, p.co.z * 50.0)  # noqa: F821
        p.co = p.co + off * 0.012 * (n - 0.4)
        part['paint'][p] = lit(mix(mix(GREY, THROAT, front), CAP_EDGE, nape), 0.95 + 0.1 * n)  # noqa: F821
bind(arm, part, at, ['neck1', 'neck2', 'head'], blend=0.04)  # noqa: F821

# --- the head: big and round, the sooty cap, a pale face, the eye at the cap's edge --------------------------------------
at = mark(part)  # noqa: F821
made = lump(part, HEAD_C, HEAD_SIZE, 4, HEAD)  # noqa: F821
for p in made:
    n = p.co - HEAD_C
    n = V(n.x / HEAD_SIZE[0], n.y / HEAD_SIZE[1], n.z / HEAD_SIZE[2])
    # A little flatter on the crown behind, fuller at the cheeks, and a steep forehead.
    if n.z > 0.3 and n.x < 0.2:
        p.co.z -= 0.012 * (n.z - 0.3) * (0.2 - n.x)
    fluffed = noise(p.co.x * 60.0, p.co.y * 60.0, p.co.z * 60.0)  # noqa: F821
    out = (p.co - HEAD_C).normalized()
    p.co = p.co + out * 0.008 * (fluffed - 0.4) * smooth((-n.x + 0.6) / 0.6)
    capped = smooth((n.z - 0.24 - 0.36 * max(0.0, n.x)) / 0.1)
    nape = smooth((-n.x - 0.25) / 0.2) * smooth((n.z + 0.45) / 0.25)
    cap = max(capped, nape)
    col = HEAD
    col = mix(col, THROAT, smooth((-n.z - 0.1) / 0.35))
    col = mix(col, FACE, smooth((n.x - 0.45) / 0.25) * smooth((0.45 - n.z) / 0.3))
    col = mix(col, mix(CAP, CAP_EDGE, 0.4 * fluffed), cap)
    part['paint'][p] = lit(col, 0.94 + 0.12 * fluffed)  # noqa: F821
# the eyes: big and dark, in a thin darker rim, with a speck of light
EYE_DIR = V(0.52, 0.8, 0.26).normalized()
for side in (1.0, -1.0):
    d = V(EYE_DIR.x, EYE_DIR.y * side, EYE_DIR.z)
    on = HEAD_C + V(d.x * HEAD_SIZE[0], d.y * HEAD_SIZE[1], d.z * HEAD_SIZE[2]) * 0.93
    out = V(d.x / HEAD_SIZE[0], d.y / HEAD_SIZE[1], d.z / HEAD_SIZE[2]).normalized()
    across = V(0, 0, 1).cross(out).normalized()
    upward = out.cross(across).normalized()
    look = Matrix((across, upward, out)).transposed()
    rim = lump(part, V(0, 0, 0), (0.037, 0.039, 0.016), 2, EYE_RIM)  # noqa: F821
    for p in rim:
        p.co = on + look @ p.co
    ball = lump(part, V(0, 0, 0), (0.03, 0.032, 0.02), 2, EYE)  # noqa: F821
    for p in ball:
        p.co = on + out * 0.004 + look @ p.co
    speck = lump(part, V(0, 0, 0), (0.008, 0.008, 0.005), 1, SHINE)  # noqa: F821
    for p in speck:
        p.co = on + out * 0.021 + look @ (p.co + V(-0.009 * side, 0.011, 0))
# the beak: short and dark, the upper half hooked a little at its tip
tube(part, [V(0.32, 0, 0.568), V(0.365, 0, 0.566), V(0.405, 0, 0.559), V(0.43, 0, 0.548), V(0.443, 0, 0.536)],  # noqa: F821
     [0.034, 0.024, 0.014, 0.007, 0.002], [BEAK] * 5, 10, squash=0.72, lean=V(0, 0, 1))
# the pale tufts over its nostrils
for side in (1.0, -1.0):
    tuft(V(0.318, side * 0.016, 0.585), V(1.0, side * 0.25, 0.25), 0.05, 0.016, FACE, mix(FACE, PALE, 0.6))
# the nape, fluffed
for i in range(5):
    y = (i - 2) * 0.04
    tuft(HEAD_C + V(-0.12, y, 0.02 - 0.01 * abs(i - 2)), V(-0.7, y * 1.5, -0.6), 0.06, 0.03, CAP_EDGE, CAP)
bind(arm, part, at, 'head')  # noqa: F821
# the lower half of the beak, which opens
at = mark(part)  # noqa: F821
tube(part, [V(0.325, 0, 0.551), V(0.37, 0, 0.547), V(0.405, 0, 0.541), V(0.425, 0, 0.537)], [0.024, 0.016, 0.008, 0.002],  # noqa: F821
     [BEAK] * 4, 8, squash=0.6, lean=V(0, 0, 1))
bind(arm, part, at, 'jaw')  # noqa: F821
# the crown: soft dark feathers that it raises
at = mark(part)  # noqa: F821
for i in range(7):
    x = 0.27 - 0.022 * i
    y = 0.022 * ((i % 3) - 1)
    zt = HEAD_C.z + HEAD_SIZE[2] * math.sqrt(max(0.0, 1.0 - ((x - HEAD_C.x) / HEAD_SIZE[0]) ** 2)) - 0.018
    tuft(V(x, y, zt), V(-0.75, y * 2.5, 0.42 - 0.05 * i), 0.06 + 0.005 * i, 0.04, CAP_EDGE, CAP)
bind(arm, part, at, 'crest')  # noqa: F821

# --- the tail: long and rounded, grey-brown in the middle, the outer feathers bright rust -------------------------------
TAIL_FEATHERS = [(0, 'tail'), (1, 'fan1'), (2, 'fan1'), (3, 'fan2'), (4, 'fan2')]
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    for i, bone in TAIL_FEATHERS:
        if i == 0 and side < 0:
            continue
        at = mark(part)  # noqa: F821
        d = tail_dir(i)
        d = V(d.x, d.y * side, d.z)
        root = TAIL_ROOT + V(0.0, side * 0.012 * i, -0.007 * i)
        long = TAIL_LONG * (1.0 - 0.035 * i)
        inner = mix(BACK, WING_TIP, 0.2) if i == 0 else mix(RUST_DEEP, BACK, 0.55 if i == 1 else 0.15)
        tip = WING_TIP if i == 0 else mix(RUST, RUST_DEEP, 0.3) if i == 1 else RUST
        if i == 0:
            # the middle pair, side by side, a shade darker at their tips
            for s in (1.0, -1.0):
                feather(root + V(0, s * 0.014, 0.004), d, V(0, 1, 0), long, 0.064, 0.04, inner, tip, 6, bend=V(0, 0, -1),
                        c_edge=WING_EDGE)
        else:
            # Closed, the tail is a low roof: each feather further out lies lower and turned down at its outer edge, so
            # that from the side its rust shows.
            roll = math.radians(15.0 * i)
            across = V(0, math.cos(roll) * side, -math.sin(roll))
            feather(root, d, across, long, 0.064, 0.04, inner, tip, 6, bend=V(0, 0, -1), c_edge=RUST)
        bind(arm, part, at, bone + (tag if bone != 'tail' else ''))  # noqa: F821

# --- the wings: each part of the arm, each row of coverts and each group of flight feathers with a bone of its own -----
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    # Each feather a little above the one behind it, so that folded they lie on each other as shingles do.
    def lift_of(order):
        return V(0, 0, 0.0025 * order)

    # the leading edge, round where the bones are
    # thin, and under the coverts, so that folded it is the coverts that show, not a bracket of bones
    for bone, a, b, r0, r1 in (('upperarm', SHOULDER - V(0, 0.03, 0), ELBOW, 0.014, 0.011), ('forearm', ELBOW, WRIST, 0.011, 0.009),
                               ('hand', WRIST, HAND + V(0.0, 0.02, 0), 0.009, 0.005)):
        at = mark(part)  # noqa: F821
        tube(part, [S(lerp(a, b, k / 4.0)) + lift_of(3) for k in range(5)], [r0 + (r1 - r0) * k / 4.0 for k in range(5)],  # noqa: F821
             [WING] * 5, 8, squash=0.6, lean=V(0, 0, 1), twist=0.0)
        bind(arm, part, at, bone + tag)  # noqa: F821

    # the coverts: rows of short round feathers over the base of the flight feathers; those over the hand are rust. Each
    # goes with the flight feathers it lies on, so that it folds back with them.
    def coverts(a, b, n, offset, long, wide, order, c0, c1, bones, edge):
        for i in range(n):
            u = (i + 0.5) / n
            at = mark(part)  # noqa: F821
            root = S(lerp(a, b, u) + V(offset, 0, 0)) + lift_of(order + 0.3 * i)
            feather(root, V(-1.0, side * 0.05 * (u - 0.5), -0.04), V(0, side, 0), long, wide, 0.04, c0, c1, 3, bend=V(0, 0, -1),
                    shape=0.3, c_edge=edge)
            bone = bones[min(len(bones) - 1, int(u * len(bones)))]
            bind(arm, part, at, bone + tag)  # noqa: F821

    coverts(SHOULDER, ELBOW, 4, -0.01, 0.1, 0.034, 12, GREY, GREY, ['tert'], WING_EDGE)
    coverts(ELBOW, WRIST, 6, -0.01, 0.085, 0.03, 12, GREY, WING, ['sec1', 'sec2'], WING_EDGE)
    coverts(ELBOW, WRIST, 5, -0.06, 0.1, 0.036, 10, WING, WING, ['sec1', 'sec2'], WING_EDGE)
    coverts(WRIST, HAND, 4, -0.005, 0.085, 0.03, 12, RUST_DEEP, RUST, ['prim1', 'prim2', 'prim3', 'prim4'], RUST)
    # the tertials, broad and long, on the arm
    at = mark(part)  # noqa: F821
    for i in range(3):
        root = S(lerp(SHOULDER, ELBOW, 0.35 + 0.25 * i) + V(-0.03, 0, 0)) + lift_of(8 - i)
        feather(root, V(-1.0, side * 0.04, -0.03), V(0, side, 0), 0.2 - 0.01 * i, 0.048, 0.025, WING, WING_TIP, 5, bend=V(0, 0, -1),
                c_edge=WING_EDGE)
    bind(arm, part, at, 'tert' + tag)  # noqa: F821
    # the secondaries, along the forearm, a touch of rust at their base
    for g, u0 in enumerate(SEC_AT):
        at = mark(part)  # noqa: F821
        for i in range(4):
            u = min(1.0, max(0.0, u0 - 0.2 + 0.13 * i))
            root = S(lerp(ELBOW, WRIST, u) + V(-0.03, 0, 0)) + lift_of(5 - 2 * g - 0.4 * i)
            feather(root, V(-1.0, side * 0.1 * (u - 0.4), -0.03), V(0, side, 0), 0.215 - 0.02 * u, 0.042, 0.025,
                    mix(WING, RUST_DEEP, 0.35), WING_TIP, 5, bend=V(0, 0, -1), c_edge=WING_EDGE)
        bind(arm, part, at, 'sec%d%s' % (g + 1, tag))  # noqa: F821
    # the primaries, rust at their base, grey-brown, darker at their tips: two to a bone, the outer one alone
    for k, u in enumerate(PRIM_AT):
        at = mark(part)  # noqa: F821
        root = lerp(WRIST, HAND, u) + V(-0.015, 0, 0)
        for j, back in enumerate((0.0, 6.0) if k < 4 else (0.0,)):
            d = prim_dir(k, back=back)
            r = root + V(0.008 * j, -0.01 * j, 0)
            feather(S(r) + lift_of(-2 - k - 0.5 * j), S(d), S(V(d.y, -d.x, 0)), PRIM_LONG[k] + 0.02 - 0.03 * j, 0.036, 0.03,
                    RUST, WING_TIP, 6, bend=V(0, 0, -1), c_edge=WING_EDGE)
        bind(arm, part, at, 'prim%d%s' % (k + 1, tag))  # noqa: F821

# --- the folded wing: a cupped shell on each flank, its feathers painted on ---------------------------------------------
# Lesser coverts at its front and top, a row of greater coverts with pale edges, the rust of the primary coverts and the
# bases of the primaries low at its front, the tertials and secondaries with pale fringes, and the dark primaries
# drawn out to a point over the rump. Built in the body's own frame, a little out from its surface.

def body_half_width(u, w):
    """How far out the body's side is at u along it and w up from its middle (its egg, without its fluff)."""
    ax = 0.25 if u > 0 else 0.3
    az = 0.2 if w > 0 else 0.22
    a = u / ax
    c = w / az
    r = 1.0 - a * a - c * c
    if r <= 0.0:
        return 0.0
    ay = 0.205 * (1.0 - 0.22 * max(0.0, -a) ** 2) * (1.0 - 0.08 * max(0.0, c))
    return ay * math.sqrt(r)


COVER_S = 16
COVER_T = 8
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    rows = []
    for i in range(COVER_S + 1):
        s = i / COVER_S
        top = 0.12 - 0.075 * s
        bottom = min(-0.055 + 0.17 * s ** 1.4, top - 0.02 * (1.0 - s) - 0.004)
        row = []
        for j in range(COVER_T + 1):
            t = j / COVER_T
            u = 0.17 - 0.52 * s - 0.05 * (2.0 * t - 1.0) ** 2 * (1.0 - s) ** 2
            w = top + (bottom - top) * t
            # The trailing edge in feather tips: the secondaries, then the long primaries.
            if j == COVER_T:
                w -= 0.012 * abs(math.sin(s * math.pi * 7.0)) * (1.0 - s)
                u -= 0.01 * abs(math.sin(s * math.pi * 7.0))
            y = body_half_width(u, w)
            y = max(y, 0.035 + 0.05 * (1.0 - s)) + 0.017 + 0.012 * math.sin(math.pi * t) * (1.0 - 0.6 * s)
            point = BODY_C + U * u + VV * (side * y) + W * w
            # Its feathers, by where on the wing the point is.
            lesser = smooth((0.4 - t) / 0.12) * smooth((0.5 - s) / 0.12)
            greater = smooth((t - 0.3) / 0.08) * smooth((0.62 - t) / 0.08) * smooth((0.6 - s) / 0.1)
            # The rust: the primary coverts and the bases of the primaries, feathered at its edges.
            ragged = 0.05 * math.sin(s * 40.0) + 0.04 * math.sin(t * 23.0 + s * 9.0)
            rust = 0.9 * smooth((t - 0.5 + ragged) / 0.18) * smooth((s - 0.06 + ragged) / 0.1) * smooth((0.4 - s + ragged) / 0.14)
            primaries = smooth((s - 0.66) / 0.1)
            col = mix(WING, WING_EDGE, 0.25)
            col = mix(col, GREY, lesser)
            fringe = smooth((((s * 9.0 + t * 1.2) % 1.0) - 0.78) / 0.15)
            col = mix(col, mix(WING, PALE, 0.4 * fringe), greater)
            col = mix(col, mix(RUST, RUST_DEEP, 0.3 * fringe), rust * (1.0 - primaries))
            tertial = smooth((s - 0.42) / 0.08) * (1.0 - primaries)
            col = mix(col, mix(WING, WING_EDGE, 0.7 * smooth((((t * 4.0 + s * 2.0) % 1.0) - 0.8) / 0.12)), tertial * (1.0 - rust))
            col = mix(col, mix(WING_TIP, WING, 0.35 * smooth((((t * 5.0) % 1.0) - 0.75) / 0.2)), primaries)
            row.append(put(part, point, lit(col, 0.94 + 0.08 * math.sin(s * 23.0 + t * 7.0))))  # noqa: F821
        rows.append(row)
    for i in range(COVER_S):
        for j in range(COVER_T):
            quad = [rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]]
            face(part, quad if side > 0 else quad[::-1])  # noqa: F821
    bind(arm, part, at, 'cover' + tag)  # noqa: F821

# --- the legs: short and dark, three toes forward and one behind ------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    path = [S(lerp(HIP, KNEE, k / 2.0)) for k in range(3)] + [S(lerp(KNEE, HEEL, k / 3.0)) for k in range(1, 4)] + \
        [S(lerp(HEEL, BALL, k / 3.0)) for k in range(1, 4)]
    radii = [0.035, 0.032, 0.026, 0.02, 0.014, 0.011, 0.0095, 0.009, 0.0085]
    colours = [GREY, GREY, GREY, mix(GREY, LEG, 0.5), LEG, LEG, LEG, LEG, LEG]
    at = mark(part)  # noqa: F821
    tube(part, path, radii, colours, 7)  # noqa: F821
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag, 'tarsus' + tag], blend=0.025)  # noqa: F821
    # the three front toes, in two parts each: the inner part with 'toes', the claw end with 'claws'
    for turn in (-0.42, 0.0, 0.42):
        d = V(math.cos(turn), math.sin(turn) * side, 0.0)
        long = 0.1 if turn == 0.0 else 0.082
        mid = S(BALL) + d * long * 0.5 + V(0, 0, -0.01)
        at = mark(part)  # noqa: F821
        tube(part, [S(BALL), mid], [0.009, 0.0075], [LEG, LEG], 5)  # noqa: F821
        bind(arm, part, at, 'toes' + tag)  # noqa: F821
        at = mark(part)  # noqa: F821
        tip = S(BALL) + d * long + V(0, 0, -0.016)
        tube(part, [mid, lerp(mid, tip, 0.6), tip + V(0, 0, -0.006)], [0.0075, 0.005, 0.0015], [LEG, CLAW, CLAW], 5)  # noqa: F821
        bind(arm, part, at, 'claws' + tag)  # noqa: F821
    at = mark(part)  # noqa: F821
    tube(part, [S(BALL + V(0, 0, 0.003)), S(lerp(BALL, HALLUX, 0.6)), S(HALLUX) + V(0, 0, -0.008)], [0.008, 0.006, 0.0015],  # noqa: F821
         [LEG, CLAW, CLAW], 5)
    bind(arm, part, at, 'hallux' + tag)  # noqa: F821

skinned(arm, part, 'jay-body', strength=0.45, reach=0.12, leaf=True)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def folded(lift=0.0):
    """Its wings folded on its sides: the leading edge high on the flank, the rust of the hand at the front edge, the
    primaries lying back over its rump. Given in the body's own space, so that they go with it as it tips. `lift` holds
    them a little out from its sides (it fluffs, it shakes)."""
    # The wrist tucked into the feathers of its breast, the flight feathers drawn in over its rump, where it narrows.
    up = (0.0, 0.88, 0.45)
    out = {
        # The wing of feathers drawn in under the shell (inside the body), but for its primaries over the rump.
        'upperarm.L': {'dir': (-0.88, 0.1 + lift, -0.45), 'up': up, 'of': 'body', 'loc': (-0.04, -0.07, 0.0)},
        'cover.L': {'rot': (0, 0, 0), 'scale': 1.0},
        'forearm.L': {'dir': (0.96, -0.06 + lift * 0.5, 0.24), 'up': up, 'of': 'body'},
        'hand.L': {'dir': (-0.97, -0.06 + lift, -0.2), 'up': up, 'of': 'body'},
        'tert.L': {'dir': (-0.95, -0.12 + lift, -0.22), 'up': (0.0, 0.85, 0.5), 'of': 'body', 'scale': GONE},
    }
    # Its flight feathers drawn in to nothing under the shell: folded, it is the shell's feathers that show.
    for i in range(2):
        out['sec%d.L' % (i + 1)] = {'dir': (-0.95, -0.12 + lift, -0.28 + 0.07 * i), 'up': up, 'of': 'body', 'scale': GONE}
    for k in range(5):
        out['prim%d.L' % (k + 1)] = {'dir': (-0.95, -0.2 + 0.015 * k + lift, -0.2 + 0.015 * k), 'up': (0.0, 0.88, 0.42), 'of': 'body',
                                     'scale': GONE}
    return out


IK_LEG = {'thigh.L': (0, 0, 0), 'shin.L': {'con': 1.0, 'rot': (0, 0, 0)}, 'tarsus.L': {'con': 1.0, 'rot': (0, 0, 0)},
          'toes.L': {'con': 1.0, 'rot': (0, 0, 0)}}


def feet(lift=0.0, bend=0.0, x=0.0, grip=0.0, spread=0.0):
    """Both feet under it: lifted `lift`, the heel lowered `bend`, moved `x`; `grip` curls the toes round a perch."""
    return over(IK_LEG, {
        'heel_ik.L': {'at': tuple(HEEL + V(x - 0.4 * bend, spread, lift - bend))},
        'ball_ik.L': {'at': tuple(BALL + V(x, spread, lift))},
        'toe_ik.L': {'at': tuple(TOE_MID + V(x, spread, lift - 0.012 * grip))},
        'claws.L': (-55.0 * grip, 0, 0),
        'hallux.L': (-50.0 * grip, 0, 0),
    })


def tucked():
    """In flight: the feet drawn up under its belly, toes curled."""
    return over(IK_LEG, {
        'heel_ik.L': {'at': (-0.06, 0.06, 0.24)},
        'ball_ik.L': {'at': (-0.12, 0.05, 0.19)},
        'toe_ik.L': {'at': (-0.15, 0.045, 0.165)},
        'claws.L': (-60, 0, 0),
        'hallux.L': (-50, 0, 0),
    })


STILL = {'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'puff': {'rot': (0, 0, 0), 'scale': 1.0}, 'neck1': (0, 0, 0),
         'neck2': (0, 0, 0), 'head': (0, 0, 0), 'jaw': (0, 0, 0), 'crest': (0, 0, 0), 'tail': (0, 0, 0), 'fan1.L': (0, 0, 0),
         'fan2.L': (0, 0, 0)}


def pose(*extra, wings=None, legs=None):
    return over(STILL, wings or folded(), legs or feet(), *extra)


def fan(k):
    """The tail fanned by k (0 closed, 1 wide open)."""
    return {'fan1.L': (0, 0, 16.0 * k), 'fan2.L': (0, 0, 34.0 * k)}


# The head, turned: towards the camera (its right) is a negative turn about Z.
TO_CAMERA = {'head': (6, -6, -38), 'neck2': (0, 0, -8)}
AHEAD_UP = {'head': (12, 4, 14), 'neck2': (4, 0, 4)}
AWAY = {'head': (2, 8, 40), 'neck2': (0, 0, 10)}
DOWN = {'head': (-22, -4, -10), 'neck1': (-6, 0, 0), 'neck2': (-6, 0, 0)}
COCK_A = {'head': (14, -28, -30), 'neck2': (4, 0, -6), 'crest': (-14, 0, 0)}
COCK_B = {'head': (10, 22, -22), 'neck2': (2, 0, -4), 'crest': (-18, 0, 0)}
FLICK = {'tail': (-26, 0, 0)}


def flick(f, keys, base, fanned=0.35):
    """A quick tail flick at frame f: up in two frames, down in four, fanned a little."""
    keys.append((f, over(base, {'tail': (0, 0, 0)}, fan(0))))
    keys.append((f + 2, over(base, FLICK, fan(fanned))))
    keys.append((f + 6, over(base, {'tail': (3, 0, 0)}, fan(0))))


# --- idle: looking about in snaps, a flick, a fluff and a shake ---------------------------------------------------------
keys = [(0, pose())]
keys += [(6, pose()), (8, pose(TO_CAMERA)), (28, pose(TO_CAMERA)), (30, pose(AHEAD_UP)), (46, pose(AHEAD_UP))]
flick(48, keys, pose(AHEAD_UP))
keys += [(58, pose(AHEAD_UP)), (60, pose(DOWN)), (74, pose(DOWN)), (77, pose())]
# it fluffs itself up, shakes, and settles
keys += [(84, pose({'puff': {'rot': (0, 0, 0), 'scale': (1.1, 1.12, 1.1)}, 'crest': (-16, 0, 0)}, wings=folded(0.06)))]
for j, roll in enumerate((14, -14, 12, -10, 6)):
    keys.append((87 + 2 * j, pose({'puff': {'rot': (0, roll, 0), 'scale': (1.1, 1.12, 1.1)}, 'head': (0, -roll * 1.6, 0), 'crest': (-16, 0, 0),
                                   'tail': (0, roll * 0.8, 0)}, fan(0.4), wings=folded(0.06))))
keys += [(98, pose({'puff': {'rot': (0, 0, 0), 'scale': (1.04, 1.05, 1.04)}}, wings=folded(0.02))), (106, pose())]
keys += [(112, pose(COCK_A)), (126, pose(COCK_A)), (129, pose(AWAY)), (138, pose(AWAY)), (141, pose())]
clip(arm, 'idle', 144, keys)  # noqa: F821

# --- look: it cocks its head at him, one eye, then the other ---------------------------------------------------------------
keys = [(0, pose(COCK_A)), (16, pose(COCK_A)), (18, pose(over(COCK_A, {'head': (16, -32, -34)}))), (30, pose(over(COCK_A, {'head': (16, -32, -34)})))]
keys += [(33, pose(COCK_B)), (50, pose(COCK_B))]
flick(52, keys, pose(COCK_B))
keys += [(62, pose(COCK_B)), (65, pose(COCK_A))]
clip(arm, 'look', 72, keys)  # noqa: F821

# --- hop: one hop on the spot ------------------------------------------------------------------------------------------------
CROUCH = {'body': {'loc': (0, 0, -0.045), 'rot': (-8, 0, 0)}, 'tail': (-14, 0, 0)}
clip(arm, 'hop', 12, [  # noqa: F821
    (0, pose()),
    (3, pose(CROUCH, legs=feet(bend=0.04))),
    (5, pose({'body': {'loc': (0, 0, 0.09), 'rot': (6, 0, 0)}, 'tail': (6, 0, 0)}, wings=folded(0.04), legs=feet(lift=0.05))),
    (7, pose({'body': {'loc': (0, 0, 0.13), 'rot': (4, 0, 0)}, 'tail': (10, 0, 0)}, fan(0.3), wings=folded(0.03), legs=feet(lift=0.11, grip=0.4))),
    (9, pose({'body': {'loc': (0, 0, 0.05), 'rot': (-2, 0, 0)}, 'tail': (-6, 0, 0)}, wings=folded(0.015), legs=feet(lift=0.04))),
    (10, pose(over(CROUCH, {'body': {'loc': (0, 0, -0.035), 'rot': (-6, 0, 0)}}), legs=feet(bend=0.03))),
], loop=True)

# --- peck: down to the ground, two quick pecks -------------------------------------------------------------------------------
LEAN = {'body': {'loc': (0, 0, -0.02), 'rot': (-26, 0, 0)}, 'neck1': (-18, 0, 0), 'neck2': (-14, 0, 0), 'head': (-34, 0, 0), 'tail': (-18, 0, 0)}
STAB = over(LEAN, {'neck1': (-26, 0, 0), 'neck2': (-22, 0, 0), 'head': (-44, 0, 0)})
clip(arm, 'peck', 30, [  # noqa: F821
    (0, pose()),
    (7, pose(LEAN, legs=feet(bend=0.02))),
    (9, pose(STAB, legs=feet(bend=0.02))),
    (12, pose(LEAN, legs=feet(bend=0.02))),
    (14, pose(STAB, legs=feet(bend=0.02))),
    (17, pose(LEAN, legs=feet(bend=0.02))),
    (24, pose({'head': (6, 0, 8)})),
])

# --- eat: it reaches out, takes the berry, tips its head back and swallows, pleased -------------------------------------
REACH = {'body': {'loc': (0.04, 0, 0.0), 'rot': (-12, 0, 0)}, 'neck1': (-14, 0, 0), 'neck2': (-6, 0, 0), 'head': (12, 0, 0), 'tail': (-12, 0, 0)}
FAR = over(REACH, {'body': {'loc': (0.09, 0, -0.01), 'rot': (-16, 0, 0)}, 'neck1': (-18, 0, 0)})
clip(arm, 'eat', 56, [  # noqa: F821
    (0, pose()),
    (6, pose(REACH, {'jaw': (-28, 0, 0), 'crest': (-10, 0, 0)}, legs=feet(bend=0.02))),
    (10, pose(FAR, {'jaw': (-30, 0, 0)}, legs=feet(bend=0.02))),
    (12, pose(FAR, {'jaw': (-4, 0, 0)}, legs=feet(bend=0.02))),
    (18, pose({'head': (10, 0, 0), 'jaw': (-4, 0, 0)})),
    (23, pose({'head': (40, 0, 0), 'neck2': (8, 0, 0), 'jaw': (-14, 0, 0)})),
    (27, pose({'head': (46, 0, 0), 'neck2': (12, 0, 0), 'neck1': (6, 0, 0), 'jaw': (-6, 0, 0)})),
    (30, pose({'head': (30, 0, 0), 'neck2': (4, 0, 0), 'jaw': (0, 0, 0)})),
    (34, pose({'head': (4, 0, -18), 'crest': (-18, 0, 0)})),
    (36, pose({'head': (4, 0, 16), 'crest': (-18, 0, 0)})),
    (38, pose({'head': (4, 0, -10), 'crest': (-18, 0, 0)})),
    (40, pose({'head': (4, 0, 0), 'crest': (-14, 0, 0)})),
    (42, pose(FLICK, fan(0.45), {'crest': (-12, 0, 0)})),
    (46, pose({'puff': {'rot': (0, 0, 0), 'scale': (1.08, 1.1, 1.08)}, 'tail': (2, 0, 0), 'crest': (-12, 0, 0)}, wings=folded(0.04))),
    (52, pose({'puff': {'rot': (0, 0, 0), 'scale': (1.02, 1.02, 1.02)}})),
    (56, pose()),
], loop=False)

# --- call: head up, crown up, two notes ----------------------------------------------------------------------------------------
UPRIGHT = {'body': {'loc': (0, 0, 0.012), 'rot': (8, 0, 0)}, 'neck1': (6, 0, 0), 'neck2': (6, 0, 0), 'head': (22, 0, -10), 'crest': (-22, 0, 0)}
clip(arm, 'call', 32, [  # noqa: F821
    (0, pose()),
    (4, pose(UPRIGHT, FLICK, fan(0.3))),
    (7, pose(UPRIGHT, {'jaw': (-34, 0, 0), 'tail': (4, 0, 0)})),
    (10, pose(UPRIGHT, {'jaw': (-4, 0, 0)})),
    (13, pose(UPRIGHT, {'jaw': (-30, 0, 0), 'head': (26, 0, -12)})),
    (17, pose(UPRIGHT, {'jaw': (0, 0, 0)})),
    (24, pose({'head': (6, 0, -12), 'crest': (-8, 0, 0)})),
    (32, pose()),
], loop=False)


# --- the wingbeat ----------------------------------------------------------------------------------------------------------
# One beat from the top: the downstroke, which carries it, to 60% of it, then up again, the wing flexed at the wrist and
# the primaries drawn together, as a small bird's is.

def beat(phase):
    """A wing in the `phase` of a beat ('top', 'mid-down', 'bottom', 'mid-up'), as turns of its bones from the spread
    rest: about X up (+) and down, about Z swept back (+) and forward; and how far its primaries spread."""
    if phase == 'top':
        return {'upperarm': (68, 0, 2), 'forearm': (-6, 0, 10), 'hand': (-10, 0, 14), 'spread': 0.8, 'tip': -6}
    if phase == 'mid-down':
        return {'upperarm': (6, 0, -8), 'forearm': (0, 0, -4), 'hand': (4, 0, -4), 'spread': 1.15, 'tip': 10}
    if phase == 'bottom':
        return {'upperarm': (-46, 0, -12), 'forearm': (-4, 0, 0), 'hand': (-8, 0, 6), 'spread': 1.0, 'tip': -2}
    return {'upperarm': (14, 0, 16), 'forearm': (0, 0, 50), 'hand': (8, 0, 72), 'spread': 0.25, 'tip': -10}


def wing(b):
    out = {'upperarm.L': {'rot': b['upperarm'], 'loc': (0, 0, 0)}, 'forearm.L': b['forearm'], 'hand.L': b['hand'],
           'cover.L': {'rot': (0, 0, 0), 'scale': GONE}}
    for k in range(5):
        out['prim%d.L' % (k + 1)] = {'rot': (b['tip'] * (0.4 + 0.15 * k), 0, PRIM_TURN[k] * (b['spread'] - 1.0)), 'scale': 1.0}
    for i in range(2):
        out['sec%d.L' % (i + 1)] = {'rot': (b['tip'] * 0.3, 0, 0), 'scale': 1.0}
    out['tert.L'] = {'rot': (b['tip'] * 0.2, 0, 0), 'scale': 1.0}
    return out


def flight(extra=None, bob=0.0, pitch=0.0, tail=0.0, fanned=0.0):
    return over(STILL, {'body': {'loc': (0, 0, bob), 'rot': (pitch, 0, 0)}, 'neck1': (-6, 0, 0), 'neck2': (-4, 0, 0),
                        'head': (4, 0, 0), 'tail': (tail, 0, 0)}, fan(fanned), tucked(), extra or {})


FLY = [(0, 'top', -0.015, 3.0, -4.0), (7, 'mid-down', 0.0, 0.0, 0.0), (14, 'bottom', 0.02, -3.0, 4.0), (19, 'mid-up', 0.008, 0.0, 0.0)]
clip(arm, 'fly', 24, [(f, flight(wing(beat(p)), bob, pitch, tail)) for f, p, bob, pitch, tail in FLY])  # noqa: F821

GLIDE = {'upperarm': (-4, 0, -2), 'forearm': (0, 0, -2), 'hand': (4, 0, 2), 'spread': 1.18, 'tip': 7}
GLIDE2 = {'upperarm': (-1, 0, 0), 'forearm': (1, 0, 0), 'hand': (6, 0, 0), 'spread': 1.24, 'tip': 10}
clip(arm, 'glide', 48, [  # noqa: F821
    (0, flight(over(wing(GLIDE), {'body': {'loc': (0, 0, 0), 'rot': (0, 3, 0)}}), tail=-4.0, fanned=0.3)),
    (24, flight(over(wing(GLIDE2), {'body': {'loc': (0, 0, 0.01), 'rot': (1, -3, 0)}, 'head': (2, 0, -8)}), tail=-2.0, fanned=0.4)),
])

# --- takeoff: a crouch, the spring, two strong beats, the legs drawn up --------------------------------------------------
clip(arm, 'takeoff', 18, [  # noqa: F821
    (0, pose()),
    (4, pose({'body': {'loc': (0, 0, -0.055), 'rot': (-14, 0, 0)}, 'tail': (-18, 0, 0), 'head': (8, 0, 0)}, legs=feet(bend=0.05))),
    (6, pose({'body': {'loc': (0.02, 0, 0.05), 'rot': (-6, 0, 0)}, 'tail': (6, 0, 0)}, fan(0.3), wings=wing(beat('top')),
             legs=feet(lift=0.02))),
    (9, pose({'body': {'loc': (0.04, 0, 0.14), 'rot': (-2, 0, 0)}, 'tail': (4, 0, 0)}, fan(0.4), wings=wing(beat('bottom')),
             legs=feet(lift=0.1, x=-0.03, grip=0.5))),
    (12, pose({'body': {'loc': (0.03, 0, 0.12), 'rot': (0, 0, 0)}, 'tail': (-2, 0, 0)}, fan(0.2), wings=wing(beat('mid-up')),
              legs=tucked())),
    (15, pose({'body': {'loc': (0.0, 0, 0.0), 'rot': (2, 0, 0)}, 'tail': (2, 0, 0)}, wings=wing(beat('bottom')), legs=tucked())),
    (18, flight(wing(beat('top')), -0.015, 3.0, -4.0)),
], loop=False)

# --- land: braking, legs forward, touchdown at frame 9, folding ----------------------------------------------------------
BRAKE = {'upperarm': (30, 0, -18), 'forearm': (0, 0, -8), 'hand': (10, -10, -6), 'spread': 1.25, 'tip': 14}
clip(arm, 'land', 18, [  # noqa: F821
    (0, pose({'body': {'loc': (0, 0, 0.12), 'rot': (24, 0, 0)}, 'tail': (10, 0, 0), 'head': (-14, 0, 0)}, fan(0.8),
             wings=wing(BRAKE), legs=feet(lift=0.1, x=0.06))),
    (4, pose({'body': {'loc': (0, 0, 0.08), 'rot': (28, 0, 0)}, 'tail': (14, 0, 0), 'head': (-18, 0, 0)}, fan(0.9),
             wings=wing(beat('bottom')), legs=feet(lift=0.05, x=0.05))),
    (7, pose({'body': {'loc': (0, 0, 0.03), 'rot': (16, 0, 0)}, 'tail': (6, 0, 0), 'head': (-10, 0, 0)}, fan(0.7),
             wings=wing(beat('mid-up')), legs=feet(lift=0.01, x=0.02))),
    (9, pose({'body': {'loc': (0, 0, -0.04), 'rot': (-6, 0, 0)}, 'tail': (-16, 0, 0)}, fan(0.5),
             wings=wing({'upperarm': (40, 0, 20), 'forearm': (0, 0, 30), 'hand': (-30, 0, 60), 'spread': 0.4, 'tip': -6}),
             legs=feet(bend=0.04))),
    (12, pose({'body': {'loc': (0, 0, -0.02), 'rot': (-3, 0, 0)}, 'tail': (-22, 0, 0)}, fan(0.3), wings=folded(0.05),
              legs=feet(bend=0.02))),
    (15, pose({'tail': (4, 0, 0)}, legs=feet())),
    (18, pose()),
], loop=False)

# --- perch: low on a sill or a branch, gripping it, looking about ------------------------------------------------------------
SIT = {'body': {'loc': (0, 0, -0.03), 'rot': (-3, 0, 0)}, 'puff': {'rot': (0, 0, 0), 'scale': (1.03, 1.04, 1.03)}}
GRIP = feet(bend=0.035, grip=1.0)
keys = [(0, pose(SIT, legs=GRIP)), (10, pose(SIT, legs=GRIP)), (12, pose(SIT, TO_CAMERA, legs=GRIP)), (34, pose(SIT, TO_CAMERA, legs=GRIP)),
        (37, pose(SIT, COCK_A, legs=GRIP)), (54, pose(SIT, COCK_A, legs=GRIP))]
flick(56, keys, pose(SIT, COCK_A, legs=GRIP), 0.25)
keys += [(66, pose(SIT, COCK_A, legs=GRIP)), (69, pose(SIT, AWAY, legs=GRIP)), (84, pose(SIT, AWAY, legs=GRIP)), (87, pose(SIT, legs=GRIP))]
clip(arm, 'perch', 96, keys)  # noqa: F821
bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'jay': {'idle': [0, 10, 50, 64, 90], 'look': [0, 20, 40], 'hop': [0, 3, 7, 10], 'peck': [0, 9, 14],
                          'eat': [0, 10, 12, 27, 46], 'call': [0, 7, 13], 'takeoff': [0, 4, 6, 9, 12], 'fly': [0, 7, 14, 19],
                          'glide': [0, 24], 'land': [0, 4, 9, 12, 18], 'perch': [0, 20, 45]}}
