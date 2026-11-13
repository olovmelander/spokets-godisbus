"""The red fox of Granskogen (src/render/lift/fauna.ts, foxes): a slim fox with bones, that steps out from behind a
trunk far back in the forest, trots, sniffs the ground, pounces in the moss now and then, sits down with its tail
curled round its feet, looks at the camera, scratches, yawns and trots off. Made with art/blender/kit-tools.py and
art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/fox.py --out=art/baked/boot/fox.glb
    node scripts/bake/blender-kit.mjs art/blender/fox.py --fast --preview=<folder>    (stills of every clip)

Units: the fox is built at the size the game's code-built fox has (src/render/lift/fauna/shapes.ts fox): about 1 tall
at the withers, its nose 1.08 ahead of its middle and its tail tip 1.56 behind it, and the game draws it 2.3 times that.
Z is up, the fox faces +X, and the camera's side is -Y (its right: the '.R' bones). Its feet stand at the origin.

Russet, with a darker back, a white chest, throat, cheeks and tail tip, black socks, black backs to its ears, and amber
eyes. Its russet is the most orange the game's rule allows: no colour of the candy's red, pink or gold (tests/unit).
One mesh with its colours on its corners, skinned to its bones; its legs bend at real joints, their feet set on the
ground by IK while the clips are keyed, and baked to plain bone keys. The clips, each named 'fox:<clip>':
    trot        one stride of a trot, the diagonal legs together; the game turns it by how far it goes (loop)
    walk        one stride of a walk, four beats; the same                                             (loop)
    sit         sitting, its tail curled round its feet, breathing, an ear twitching                    (loop)
    sniff       standing, its nose to the ground, sniffing this way and that                            (loop)
    look        standing alert, its head up, its ears turning to listen                                 (loop)
    mouse-jump  the pounce: a crouch, the leap straight up, the dive nose first into the moss, tail up,
                and up again. It leaps on the spot: the game carries it forward while it is in the air    (once)
    scratch     sitting, scratching behind its near ear with a hind foot                                (loop)
    yawn        sitting, a big yawn, and a shake of the head                                             (once)
A stride of `trot` covers TROT_STRIDE and one of `walk` WALK_STRIDE, in the fox's own units (the game reads the same).
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

# The game's rule (tests/unit/lift-fauna.test.ts): never the candy's red, pink or gold, so a russet's hue stays
# over 30 degrees and its chroma under 120 (of 255).
RUSSET = tone('#a8783a')       # noqa: F821 (kit-tools.py)
RUSSET_DARK = tone('#8a6232')  # noqa: F821
RUSSET_PALE = tone('#b48a52')  # noqa: F821
WHITE = tone('#e8e2d6')        # noqa: F821
CREAM = tone('#d4c6ae')        # noqa: F821
SOCK = tone('#2e2622')         # noqa: F821
BLACK = tone('#241e1a')        # noqa: F821
NOSE = tone('#161210')         # noqa: F821
AMBER = tone('#b08c40')        # noqa: F821
PUPIL = tone('#100d0b')        # noqa: F821
SHINE = tone('#f6f2e8')        # noqa: F821
MOUTH = tone('#3a2824')        # noqa: F821
TONGUE = tone('#806660')       # noqa: F821
EAR_IN = tone('#d6c6aa')       # noqa: F821

TROT_STRIDE = 0.7
WALK_STRIDE = 0.42
LEAP = 1.0

TAU = math.pi * 2.0


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


def V(x, y, z):
    return Vector((x, y, z))


def lerp(a, b, t):
    return a + (b - a) * t


def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def sag(d, extra=None):
    """A bone of the middle or of a leg pointing along `d`, its own X kept towards the creature's right."""
    d = V(*d).normalized()
    out = {'dir': tuple(d), 'up': tuple(V(0, -1, 0).cross(d))}
    if extra:
        out.update(extra)
    return out


# --- the bones ---------------------------------------------------------------------------------------------------------

FORE_BALL = 0.45
HIND_BALL = -0.39
FOOT_Y = 0.11

BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.2), {'deform': False}),
    ('hips', 'root', (-0.52, 0, 0.76), (-0.18, 0, 0.75)),
    ('body', 'hips', (-0.18, 0, 0.75), (0.20, 0, 0.75), {'connect': True}),
    ('chest', 'body', (0.20, 0, 0.75), (0.52, 0, 0.79), {'connect': True}),
    ('neck', 'chest', (0.50, 0, 0.82), (0.72, 0, 1.0)),
    ('head', 'neck', (0.72, 0, 1.0), (1.06, 0, 0.96), {'connect': True}),
    ('jaw', 'head', (0.80, 0, 0.952), (1.04, 0, 0.93)),
    ('ear.L', 'head', (0.765, 0.075, 1.08), (0.735, 0.125, 1.31)),
    ('tail1', 'hips', (-0.54, 0, 0.79), (-0.79, 0, 0.74)),
    ('tail2', 'tail1', (-0.79, 0, 0.74), (-1.04, 0, 0.65), {'connect': True}),
    ('tail3', 'tail2', (-1.04, 0, 0.65), (-1.28, 0, 0.55), {'connect': True}),
    ('tail4', 'tail3', (-1.28, 0, 0.55), (-1.50, 0, 0.47), {'connect': True}),
    ('upperarm.L', 'chest', (0.43, 0.115, 0.66), (0.36, 0.12, 0.42)),
    ('forearm.L', 'upperarm.L', (0.36, 0.12, 0.42), (0.40, FOOT_Y, 0.125), {'connect': True, 'ik': ('wrist_ik.L', 2)}),
    ('hand.L', 'forearm.L', (0.40, FOOT_Y, 0.125), (FORE_BALL, FOOT_Y, 0.032), {'connect': True, 'track': 'fball_ik.L'}),
    ('fpaw.L', 'hand.L', (FORE_BALL, FOOT_Y, 0.032), (0.535, FOOT_Y, 0.018), {'connect': True, 'track': 'ftoe_ik.L'}),
    ('thigh.L', 'hips', (-0.38, 0.115, 0.70), (-0.25, 0.13, 0.44)),
    ('shin.L', 'thigh.L', (-0.25, 0.13, 0.44), (-0.44, FOOT_Y, 0.20), {'connect': True, 'ik': ('hock_ik.L', 2)}),
    ('foot.L', 'shin.L', (-0.44, FOOT_Y, 0.20), (HIND_BALL, FOOT_Y, 0.032), {'connect': True, 'track': 'hball_ik.L'}),
    ('hpaw.L', 'foot.L', (HIND_BALL, FOOT_Y, 0.032), (-0.305, FOOT_Y, 0.018), {'connect': True, 'track': 'htoe_ik.L'}),
    ('wrist_ik.L', None, (0.40, FOOT_Y, 0.125), (0.40, FOOT_Y, 0.225), {'ctrl': True}),
    ('fball_ik.L', None, (FORE_BALL, FOOT_Y, 0.032), (FORE_BALL, FOOT_Y, 0.132), {'ctrl': True}),
    ('ftoe_ik.L', None, (0.535, FOOT_Y, 0.018), (0.535, FOOT_Y, 0.118), {'ctrl': True}),
    ('hock_ik.L', None, (-0.44, FOOT_Y, 0.20), (-0.44, FOOT_Y, 0.30), {'ctrl': True}),
    ('hball_ik.L', None, (HIND_BALL, FOOT_Y, 0.032), (HIND_BALL, FOOT_Y, 0.132), {'ctrl': True}),
    ('htoe_ik.L', None, (-0.305, FOOT_Y, 0.018), (-0.305, FOOT_Y, 0.118), {'ctrl': True}),
]
arm = armature('fox', BONES)  # noqa: F821
part = new_part()  # noqa: F821


def loft(rows, count, paint, fluff=0.0, grain=30.0, first=None, last=None):
    """Rings along a path: each row (centre, half width, half height over the centre, half height under it), each ring
    square to the path, and coloured by paint(point, row, across, up) where across and up go from -1 to 1 round it.
    `fluff` pushes each point out or in a little, unevenly: fur."""
    rings = []
    colours = []
    n = len(rows)
    for i, (c, w, ht, hb) in enumerate(rows):
        ahead = rows[min(i + 1, n - 1)][0] - rows[max(i - 1, 0)][0]
        ahead.normalize()
        side = V(0, 0, 1).cross(ahead)
        if side.length < 1e-4:
            side = V(0, 1, 0)
        side.normalize()
        up = ahead.cross(side).normalized()
        ring = []
        tones = []
        for j in range(count):
            a = TAU * j / count
            s = math.cos(a)
            u = math.sin(a)
            off = side * (w * s) + up * ((ht if u >= 0.0 else hb) * u)
            p = c + off
            if fluff and off.length > 1e-5:
                k = noise(p.x * grain + 7.0, p.y * grain, p.z * grain)  # noqa: F821
                p = p + off.normalized() * fluff * (k - 0.45)
            ring.append(p)
            tones.append(paint(p, i, s, u))
        rings.append(ring)
        colours.append(tones)
    return skin(part, rings, colours, first, last)  # noqa: F821


def grain_lit(c, p, k=0.08):
    """A colour a little lighter or darker by the fur's own grain."""
    return lit(c, 1.0 - k * 0.5 + k * noise(p.x * 41.0, p.y * 41.0 + 3.0, p.z * 41.0))  # noqa: F821


# --- the body ----------------------------------------------------------------------------------------------------------

def body_paint(p, i, s, u):
    c = mix(RUSSET, RUSSET_PALE, 0.35 * smooth(-u * 2.0 + 0.4))
    c = mix(c, RUSSET_DARK, smooth((u - 0.45) / 0.45))
    # A pale belly, and the white of the chest and throat in front.
    c = mix(c, CREAM, 0.7 * smooth((-u - 0.55) / 0.3))
    chest = smooth((-u + 0.15) / 0.5) * smooth((p.x - 0.30) / 0.2)
    c = mix(c, WHITE, chest)
    return grain_lit(c, p)


at = mark(part)  # noqa: F821
rows = [
    (V(-0.64, 0, 0.77), 0.04, 0.05, 0.05),
    (V(-0.60, 0, 0.775), 0.10, 0.12, 0.13),
    (V(-0.52, 0, 0.78), 0.145, 0.16, 0.18),
    (V(-0.40, 0, 0.78), 0.16, 0.17, 0.2),
    (V(-0.26, 0, 0.775), 0.145, 0.16, 0.16),
    (V(-0.10, 0, 0.77), 0.13, 0.15, 0.12),
    (V(0.06, 0, 0.77), 0.135, 0.16, 0.15),
    (V(0.22, 0, 0.77), 0.15, 0.175, 0.21),
    (V(0.38, 0, 0.775), 0.16, 0.18, 0.24),
    (V(0.50, 0, 0.79), 0.15, 0.17, 0.22),
    (V(0.58, 0, 0.80), 0.115, 0.13, 0.16),
    (V(0.63, 0, 0.81), 0.06, 0.07, 0.08),
]
loft(rows, 18, body_paint, fluff=0.014, first=(V(-0.655, 0, 0.77), grain_lit(RUSSET, V(0, 0, 0))), last=(V(0.645, 0, 0.81), WHITE))
bind(arm, part, at, ['hips', 'body', 'chest'], blend=0.12)  # noqa: F821

# The neck, with its ruff: white underneath, russet over, thick with fur.
at = mark(part)  # noqa: F821


def neck_paint(p, i, s, u):
    c = mix(RUSSET, RUSSET_DARK, smooth((u - 0.5) / 0.4))
    return grain_lit(mix(c, WHITE, smooth((-u + 0.25) / 0.45)), p)


rows = [
    (V(0.42, 0, 0.80), 0.145, 0.16, 0.2),
    (V(0.54, 0, 0.86), 0.145, 0.15, 0.19),
    (V(0.64, 0, 0.93), 0.13, 0.13, 0.15),
    (V(0.73, 0, 1.0), 0.115, 0.11, 0.115),
]
loft(rows, 16, neck_paint, fluff=0.022, grain=26.0)
bind(arm, part, at, ['chest', 'neck', 'head'], blend=0.07)  # noqa: F821

# --- the head: broad at the cheeks, with a white ruff below them, a long pointed muzzle ---------------------------

def head_paint(p, i, s, u):
    c = mix(RUSSET, RUSSET_DARK, 0.45 * smooth((u - 0.5) / 0.4) * smooth((0.9 - p.x) / 0.1))
    # The white of the cheeks and the lips, rising towards the eyes at the back of the cheek, and lower along the muzzle.
    line = lerp(0.12, -0.32, smooth((p.x - 0.84) / 0.18))
    c = mix(c, WHITE, smooth((line - u) / 0.2))
    # A dark mark from the eye down the side of the muzzle.
    mark_line = smooth(1.0 - abs(u - lerp(0.25, -0.05, smooth((p.x - 0.9) / 0.1))) / 0.12) * smooth((p.x - 0.9) / 0.02) \
        * smooth((1.0 - p.x) / 0.04) * smooth((abs(s) - 0.55) / 0.2)
    c = mix(c, RUSSET_DARK, 0.6 * mark_line)
    # The muzzle's top darkens towards the nose.
    c = mix(c, RUSSET_DARK, 0.4 * smooth((p.x - 0.98) / 0.06) * smooth(u / 0.4))
    return grain_lit(c, p, 0.06)


at = mark(part)  # noqa: F821
rows = [
    (V(0.685, 0, 1.012), 0.07, 0.07, 0.07),
    (V(0.72, 0, 1.015), 0.125, 0.112, 0.11),
    (V(0.78, 0, 1.015), 0.152, 0.118, 0.13),
    (V(0.845, 0, 1.006), 0.142, 0.106, 0.112),
    (V(0.905, 0, 0.993), 0.104, 0.082, 0.08),
    (V(0.965, 0, 0.978), 0.064, 0.058, 0.05),
    (V(1.015, 0, 0.968), 0.045, 0.045, 0.036),
    (V(1.06, 0, 0.962), 0.029, 0.032, 0.024),
]
made = loft(rows, 18, head_paint, fluff=0.008, grain=45.0, first=(V(0.668, 0, 1.012), RUSSET), last=(V(1.082, 0, 0.962), NOSE))
# The cheek ruffs: the fur of the lower cheek combed out and down in points, behind the jaw.
for ring in made[1:4]:
    for pt in ring:
        d = pt.co - V(pt.co.x, 0.0, 1.0)
        if d.z < 0.0 and abs(d.y) > 0.06:
            spike = 0.5 + 0.5 * math.cos(math.atan2(d.z, abs(d.y)) * 7.0)
            pt.co = pt.co + V(-0.035, 0.05 * (1 if d.y > 0 else -1), -0.04) * spike * smooth((abs(d.y) - 0.06) / 0.05)
# The nose, black, a little proud of the muzzle's tip.
lump(part, V(1.074, 0, 0.967), (0.024, 0.026, 0.02), 2, NOSE)  # noqa: F821
# The eyes: almond and amber, with a dark rim, a dark middle and a speck of light, set high on the head.
for side in (1.0, -1.0):
    out = V(0.34, 0.76 * side, 0.52).normalized()
    centre = V(0.898, 0.075 * side, 1.038)
    lump(part, centre - out * 0.003, (0.03, 0.013, 0.019), 2, BLACK)  # noqa: F821
    lump(part, centre + out * 0.002, (0.024, 0.0105, 0.015), 2, AMBER)  # noqa: F821
    lump(part, centre + out * 0.0085 + V(0.003, 0, 0), (0.0075, 0.0045, 0.012), 1, PUPIL)  # noqa: F821
    lump(part, centre + out * 0.0105 + V(0.008, 0, 0.005), (0.004, 0.0025, 0.004), 1, SHINE)  # noqa: F821
# The dark of the mouth, inside the head where the jaw opens.
lump(part, V(0.93, 0, 0.94), (0.12, 0.045, 0.022), 2, MOUTH)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# The lower jaw, white, with a tongue in it.
at = mark(part)  # noqa: F821


def jaw_paint(p, i, s, u):
    return grain_lit(WHITE, p, 0.05)


rows = [
    (V(0.80, 0, 0.935), 0.075, 0.022, 0.037),
    (V(0.88, 0, 0.932), 0.058, 0.02, 0.032),
    (V(0.96, 0, 0.93), 0.04, 0.016, 0.024),
    (V(1.025, 0, 0.93), 0.023, 0.012, 0.015),
]
loft(rows, 12, jaw_paint, first=(V(0.79, 0, 0.935), WHITE), last=(V(1.05, 0, 0.93), WHITE))
lump(part, V(0.94, 0, 0.947), (0.08, 0.028, 0.008), 2, TONGUE)  # noqa: F821
bind(arm, part, at, 'jaw')  # noqa: F821

# --- the ears: big and pointed, cream inside with a russet rim, black behind ---------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    base = V(0.765, 0.078 * side, 1.075)
    tip = V(0.732, 0.135 * side, 1.335)
    axis = (tip - base).normalized()
    front = V(1.0, 0.3 * side, 0.0)
    front = (front - axis * front.dot(axis)).normalized()
    across = axis.cross(front).normalized()
    rings = []
    tones = []
    steps = 7
    for k in range(steps):
        t = k / float(steps)
        c = base + (tip - base) * t
        wide = 0.085 * (1.0 - t) ** 0.8 + 0.004
        deep = 0.04 * (1.0 - t) + 0.006
        ring = []
        ring_tones = []
        for j in range(12):
            a = TAU * j / 12.0
            f = math.cos(a)
            g = math.sin(a)
            # The front is hollowed: a cup facing forward and a little out.
            cup = deep * (f if f < 0.0 else -0.4 * f)
            p = c + across * (wide * g) + front * cup
            ring.append(p)
            inner = smooth((f - 0.1) / 0.5) * smooth((1.0 - abs(g) - 0.1) / 0.3) * smooth((0.85 - t) / 0.2)
            colour = mix(SOCK, RUSSET, smooth((f + 0.3) / 0.4) * smooth((0.72 - t) / 0.18))
            colour = mix(colour, EAR_IN, inner)
            ring_tones.append(colour)
        rings.append(ring)
        tones.append(ring_tones)
    skin(part, rings, tones, None, (tip, SOCK))  # noqa: F821
    bind(arm, part, at, 'ear' + tag)  # noqa: F821

# --- the legs: slim, russet above and black below, with neat black paws -------------------------------------------


def leg_tube(points, radii, colours):
    return tube(part, points, radii, colours, 9)  # noqa: F821


def polyline(points, k):
    """Points along a polyline: k between each pair."""
    out = [points[0]]
    for a, b in zip(points[:-1], points[1:]):
        for s in range(1, k + 1):
            out.append(a + (b - a) * (s / float(k)))
    return out


for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(x, y, z):
        return V(x, y * side, z)

    # The fore leg: from inside the chest down past the elbow, the forearm, the wrist and the pastern.
    path = polyline([S(0.44, 0.10, 0.70), S(0.36, 0.12, 0.42), S(0.40, FOOT_Y, 0.125), S(FORE_BALL, FOOT_Y, 0.04)], 3)
    radii = []
    colours = []
    for p in path:
        z = p.z
        radii.append(lerp(0.03, 0.064, smooth((z - 0.14) / 0.42)))
        colours.append(grain_lit(mix(SOCK, RUSSET, smooth((z - 0.36) / 0.12)), p))
    at = mark(part)  # noqa: F821
    leg_tube(path, radii, colours)
    bind(arm, part, at, ['upperarm' + tag, 'forearm' + tag, 'hand' + tag], blend=0.05)  # noqa: F821
    # The shoulder's muscle, flat against the chest.
    at = mark(part)  # noqa: F821
    made = lump(part, S(0.41, 0.085, 0.63), (0.11, 0.07, 0.13), 2, RUSSET)  # noqa: F821
    for pt in made:
        part['paint'][pt] = grain_lit(mix(RUSSET, WHITE, 0.6 * smooth((0.56 - pt.co.z) / 0.08) * smooth((pt.co.x - 0.44) / 0.05)), pt.co)
    bind(arm, part, at, 'upperarm' + tag, blend=0.12)  # noqa: F821
    # The fore paw.
    at = mark(part)  # noqa: F821
    lump(part, S(0.475, FOOT_Y, 0.03), (0.052, 0.034, 0.028), 2, SOCK)  # noqa: F821
    bind(arm, part, at, 'fpaw' + tag)  # noqa: F821

    # The hind leg: the thigh, the stifle forward, the hock back, the long foot.
    path = polyline([S(-0.38, 0.10, 0.70), S(-0.25, 0.13, 0.44), S(-0.44, FOOT_Y, 0.20), S(HIND_BALL, FOOT_Y, 0.04)], 3)
    radii = []
    colours = []
    for k, p in enumerate(path):
        z = p.z
        radii.append(lerp(0.075, 0.062, k / 3.0) if k <= 3 else lerp(0.03, 0.058, smooth((z - 0.16) / 0.28)))
        colours.append(grain_lit(mix(SOCK, RUSSET, smooth((z - 0.22) / 0.1)), p))
    at = mark(part)  # noqa: F821
    leg_tube(path, radii, colours)
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag, 'foot' + tag], blend=0.05)  # noqa: F821
    # The haunch, big and furred, flat against the rump.
    at = mark(part)  # noqa: F821
    made = lump(part, S(-0.38, 0.09, 0.64), (0.17, 0.07, 0.16), 2, RUSSET)  # noqa: F821
    for pt in made:
        part['paint'][pt] = grain_lit(mix(RUSSET, CREAM, 0.45 * smooth((0.52 - pt.co.z) / 0.06)), pt.co)
    bind(arm, part, at, 'thigh' + tag, blend=0.16)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, S(-0.365, FOOT_Y, 0.03), (0.05, 0.033, 0.027), 2, SOCK)  # noqa: F821
    bind(arm, part, at, 'hpaw' + tag)  # noqa: F821

# --- the tail: big and bushy, darker over, its tip white ----------------------------------------------------------
TAIL = [V(-0.52, 0, 0.785), V(-0.66, 0, 0.765), V(-0.79, 0, 0.74), V(-0.92, 0, 0.70), V(-1.04, 0, 0.65),
        V(-1.16, 0, 0.60), V(-1.28, 0, 0.55), V(-1.39, 0, 0.51), V(-1.48, 0, 0.48), V(-1.54, 0, 0.465)]
TAIL_R = [0.05, 0.09, 0.12, 0.145, 0.158, 0.16, 0.152, 0.13, 0.095, 0.048]


def tail_paint(p, i, s, u):
    t = i / float(len(TAIL) - 1)
    c = mix(RUSSET, RUSSET_DARK, 0.55 * smooth((u + 0.1) / 0.7))
    # A few darker guard hairs before the white tip.
    c = mix(c, lit(RUSSET_DARK, 0.75), 0.4 * smooth((t - 0.55) / 0.1) * smooth((0.78 - t) / 0.06))  # noqa: F821
    c = mix(c, WHITE, smooth((t - 0.76) / 0.07))
    return grain_lit(c, p, 0.12)


at = mark(part)  # noqa: F821
loft([(c, r * 0.95, r, r * 0.95) for c, r in zip(TAIL, TAIL_R)], 14, tail_paint, fluff=0.04, grain=22.0,
     first=(TAIL[0] + V(0.02, 0, 0), RUSSET), last=(V(-1.565, 0, 0.46), WHITE))
bind(arm, part, at, ['tail1', 'tail2', 'tail3', 'tail4'], blend=0.08)  # noqa: F821

skinned(arm, part, 'fox-body', strength=0.32, reach=0.14, floor=0.0)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def fore(tag, x, lift=0.0, fold=0.0, dz=0.0, y=None):
    """A fore foot: its ball at x, lifted `lift`; folded back at the wrist by `fold` (0 to 1), as it is in a stride."""
    y = (FOOT_Y if tag == '.L' else -FOOT_Y) if y is None else y
    w = V(x - 0.05, y, 0.125 + lift + dz)
    b = w + V(lerp(0.05, -0.05, fold), 0, lerp(-0.093, -0.078, fold))
    t = b + V(lerp(0.085, -0.03, fold), 0, lerp(-0.014, -0.072, fold))
    return {'wrist_ik' + tag: {'at': tuple(w)}, 'fball_ik' + tag: {'at': tuple(b)}, 'ftoe_ik' + tag: {'at': tuple(t)},
            'upperarm' + tag: (0, 0, 0), 'forearm' + tag: {'con': 1.0, 'rot': (0, 0, 0)},
            'hand' + tag: {'con': 1.0, 'rot': (0, 0, 0)}, 'fpaw' + tag: {'con': 1.0, 'rot': (0, 0, 0)}}


def hind(tag, x, lift=0.0, fold=0.0, dz=0.0, y=None):
    """A hind foot: its ball at x, lifted `lift`, its toes hanging by `fold`."""
    y = (FOOT_Y if tag == '.L' else -FOOT_Y) if y is None else y
    h = V(x - 0.05, y, 0.168 + lift + dz)
    b = h + V(lerp(0.05, 0.02, fold), 0, lerp(-0.168, -0.16, fold))
    t = b + V(lerp(0.085, 0.02, fold), 0, lerp(-0.014, -0.08, fold))
    return {'hock_ik' + tag: {'at': tuple(h)}, 'hball_ik' + tag: {'at': tuple(b)}, 'htoe_ik' + tag: {'at': tuple(t)},
            'thigh' + tag: (0, 0, 0), 'shin' + tag: {'con': 1.0, 'rot': (0, 0, 0)},
            'foot' + tag: {'con': 1.0, 'rot': (0, 0, 0)}, 'hpaw' + tag: {'con': 1.0, 'rot': (0, 0, 0)}}


def standing(spread=0.0):
    return over(fore('.L', FORE_BALL + spread), fore('.R', FORE_BALL + spread), hind('.L', HIND_BALL - spread), hind('.R', HIND_BALL - spread))


CENTRE = {'root': (0, 0, 0), 'hips': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'body': (0, 0, 0), 'chest': (0, 0, 0),
          'neck': (0, 0, 0), 'head': (0, 0, 0), 'jaw': (0, 0, 0), 'ear.L': (0, 0, 0),
          'tail1': (0, 0, 0), 'tail2': (0, 0, 0), 'tail3': (0, 0, 0), 'tail4': (0, 0, 0)}


def stand(extra=None):
    return over(CENTRE, standing(), extra or {})


# --- trot and walk -----------------------------------------------------------------------------------------------------

def gait(name, frames, stride, duty, lift, offsets, bob, nod, tail_wave):
    """A loop of one stride: each foot on the ground for `duty` of it, going back as far as the stride carries the
    body, then lifted and brought forward, folding at the wrist. The body rises and falls with each footfall, the head
    nods a little against it, and the tail streams behind with a slow wave."""
    reach = stride * duty / 2.0
    keys = []
    for f in range(0, frames, 2):
        p = f / float(frames)
        pose = {}
        for leg, offset in offsets.items():
            tag = leg[-2:]
            q = (p + offset) % 1.0
            if q < duty:
                dx = reach - 2.0 * reach * (q / duty)
                up = 0.0
                fold = 0.0
            else:
                s = (q - duty) / (1.0 - duty)
                dx = -reach + 2.0 * reach * smooth(s)
                up = lift * math.sin(math.pi * s)
                fold = math.sin(math.pi * min(1.0, s * 1.15)) ** 0.8
            if leg.startswith('fore'):
                pose.update(fore(tag, FORE_BALL + dx, up, fold))
            else:
                pose.update(hind(tag, HIND_BALL + dx, up * 0.85, fold * 0.7))
        beats = len(set(offsets.values()))
        wave = math.cos(TAU * beats * p)
        pose.update({
            'root': (0, 0, 0),
            'hips': {'loc': (0, 0, -bob * wave - 0.01), 'rot': (0.8 * wave, 2.0 * math.sin(TAU * p), 0)},
            'body': (0, 0, 0), 'chest': (-0.8 * wave, 0, 0),
            'neck': (nod * wave, 0, 0), 'head': (-nod * 0.7 * wave, 0, 0), 'jaw': (0, 0, 0),
            'ear.L': (-4, 0, 0),
            'tail1': (-6 + tail_wave * math.sin(TAU * p), 0, 3.0 * math.sin(TAU * p + 0.6)),
            'tail2': (tail_wave * math.sin(TAU * p - 0.7), 0, 4.0 * math.sin(TAU * p)),
            'tail3': (tail_wave * 1.2 * math.sin(TAU * p - 1.4), 0, 5.0 * math.sin(TAU * p - 0.6)),
            'tail4': (tail_wave * 1.4 * math.sin(TAU * p - 2.1), 0, 6.0 * math.sin(TAU * p - 1.2)),
        })
        keys.append((f, pose))
    clip(arm, name, frames, keys)  # noqa: F821


gait('trot', 16, TROT_STRIDE, 0.42, 0.11, {'fore.L': 0.0, 'hind.R': 0.0, 'fore.R': 0.5, 'hind.L': 0.5}, 0.016, 3.0, 4.0)
gait('walk', 24, WALK_STRIDE, 0.64, 0.07, {'hind.L': 0.0, 'fore.L': 0.75, 'hind.R': 0.5, 'fore.R': 0.25}, 0.008, 4.0, 3.0)

# --- sitting -----------------------------------------------------------------------------------------------------------
# On its haunches, its fore legs straight under its chest, its hind feet flat, and its tail lying round them on its
# near side.

def sitting(extra=None, breathe=0.0):
    return over(CENTRE, {
        'hips': {'loc': (0, -0.02, -0.53), 'rot': (46, 0, 0)},
        'body': (2, 0, 0), 'chest': {'rot': (2, 0, 0), 'loc': (0, 0, 0.004 * breathe)},
        'neck': sag((0.42, 0, 0.9)), 'head': sag((1.0, 0, -0.1)),
        'tail1': sag((-0.62, -0.45, -0.5)), 'tail2': sag((0.05, -1.0, -0.12)),
        'tail3': sag((1.0, -0.3, 0.0)), 'tail4': sag((0.95, 0.3, 0.0)),
    }, fore('.L', 0.24), fore('.R', 0.24), hind('.L', -0.18, dz=-0.10), hind('.R', -0.18, dz=-0.10),
        sit_hind('.L'), sit_hind('.R'), extra or {})


def sit_hind(tag):
    """A hind foot flat on the ground, pointing forward, its hock down by the rump."""
    y = 0.13 if tag == '.L' else -0.13
    return {'hock_ik' + tag: {'at': (-0.36, y, 0.055)}, 'hball_ik' + tag: {'at': (-0.19, y, 0.035)},
            'htoe_ik' + tag: {'at': (-0.10, y, 0.02)}}


clip(arm, 'sit', 96, [  # noqa: F821
    (0, sitting()),
    (24, sitting(breathe=1.0)),
    (34, sitting({'ear.L': (0, 0, 0), 'ear.R': (-14, -25, 0)}, 0.6)),
    (38, sitting({'ear.R': (0, 0, 0)}, 0.4)),
    (48, sitting()),
    (60, sitting({'tail4': sag((0.95, 0.45, 0.25))}, 1.0)),
    (66, sitting({'tail4': sag((0.95, 0.15, 0.0))}, 0.8)),
    (72, sitting(breathe=1.0)),
])

# --- sniffing: its nose down to the moss, this way and that ---------------------------------------------------------

def sniffing(side=0.0, dip=0.0, extra=None):
    return over(stand(), {
        'hips': {'loc': (0, 0, -0.04), 'rot': (-4, 0, 0)}, 'chest': (-4, 0, 0),
        'neck': sag((0.3, side * 0.35, -0.95)), 'head': sag((0.14, side * 0.2, -0.99 - dip)),
        'ear.L': (8, 0, 0), 'tail1': (8, 0, 0), 'tail2': (6, 0, 0), 'tail3': (4, 0, 0), 'tail4': (2, 0, 0),
    }, fore('.L', FORE_BALL - 0.05), fore('.R', FORE_BALL - 0.08), extra or {})


clip(arm, 'sniff', 48, [  # noqa: F821
    (0, sniffing(0.0)),
    (4, sniffing(0.05, 0.08)),
    (8, sniffing(0.1)),
    (12, sniffing(0.2, 0.08)),
    (16, sniffing(0.35)),
    (20, sniffing(0.35, 0.1, {'tail2': (6, 0, 8)})),
    (24, sniffing(0.2)),
    (28, sniffing(0.0, 0.08)),
    (32, sniffing(-0.2, 0.0, {'tail2': (6, 0, -6)})),
    (36, sniffing(-0.3, 0.1)),
    (40, sniffing(-0.25)),
    (44, sniffing(-0.1, 0.08)),
])

# --- looking: head up, alert, its ears turning to listen --------------------------------------------------------------

def looking(ear_l=0.0, ear_r=0.0, tilt=0.0, extra=None):
    return over(stand(), {
        'hips': {'loc': (0, 0, 0.01), 'rot': (2, 0, 0)},
        'neck': (16, 0, 0), 'head': (-10, tilt, 0),
        'ear.L': (-6, ear_l, 0), 'ear.R': (-6, -ear_r, 0),
        'tail1': (-4, 0, 0), 'tail2': (2, 0, 0),
    }, fore('.L', FORE_BALL + 0.06, lift=0.0), extra or {})


clip(arm, 'look', 72, [  # noqa: F821
    (0, looking()),
    (10, looking(30, 0)),
    (18, looking(30, 35, 6)),
    (30, looking(-25, 35, 6)),
    (40, looking(-25, -20, -4)),
    (52, looking(10, 10)),
    (62, looking(0, 0)),
])

# --- the pounce (mouse-jump): crouch, leap up, dive nose first into the moss, tail up, and up again -------------------
FK = {'con': 0.0}


def fly_legs(fore_dirs, hind_dirs):
    """Legs off the ground, posed by the way each bone points (the IK let go)."""
    out = {}
    for tag in ('.L', '.R'):
        out['upperarm' + tag] = sag(fore_dirs[0])
        out['forearm' + tag] = sag(fore_dirs[1], FK)
        out['hand' + tag] = sag(fore_dirs[2], FK)
        out['fpaw' + tag] = sag(fore_dirs[3], FK)
        out['thigh' + tag] = sag(hind_dirs[0])
        out['shin' + tag] = sag(hind_dirs[1], FK)
        out['foot' + tag] = sag(hind_dirs[2], FK)
        out['hpaw' + tag] = sag(hind_dirs[3], FK)
    return out


TAIL_UP = {'tail1': sag((-0.7, 0, 0.7), {'of': 'hips'}), 'tail2': sag((-0.5, 0, 0.86), {'of': 'hips'}),
           'tail3': sag((-0.3, 0, 0.95), {'of': 'hips'}), 'tail4': sag((-0.1, 0, 1.0), {'of': 'hips'})}
JUMP = 48
clip(arm, 'mouse-jump', JUMP, [  # noqa: F821
    # Still, ears forward, eyes on the moss ahead.
    (0, over(stand(), {'neck': (4, 0, 0), 'head': sag((0.75, 0, -0.66)), 'ear.L': (-10, 0, 0)})),
    # The crouch: down at the back, the head aimed.
    (7, over(stand(), {'hips': {'loc': (0, 0, -0.1), 'rot': (-4, 0, 0)}, 'neck': (8, 0, 0), 'head': sag((0.7, 0, -0.72)),
                       'ear.L': (-12, 0, 0), 'tail1': (-12, 0, 0), 'tail2': (-6, 0, 0)},
                hind('.L', HIND_BALL - 0.02, dz=-0.06), hind('.R', HIND_BALL - 0.02, dz=-0.06))),
    # The spring: up and forward, the hind legs pushing out behind.
    (12, over(CENTRE, {'hips': {'loc': (0, 0.02, 0.18), 'rot': (32, 0, 0)}, 'neck': (-6, 0, 0), 'head': sag((0.8, 0, -0.5)),
                       'ear.L': (-8, 0, 0), 'tail1': (-10, 0, 0), 'tail2': (-4, 0, 0)},
              fly_legs([(0.35, 0, -0.94), (0.5, 0, -0.86), (0.45, 0, -0.9), (0.6, 0, -0.8)],
                       [(-0.25, 0, -0.97), (-0.62, 0, -0.78), (-0.75, 0, -0.66), (-0.9, 0, -0.43)]))),
    # High over the moss, turning over.
    (18, over(CENTRE, {'hips': {'loc': (0, 0.04, 0.72), 'rot': (6, 0, 0)}, 'neck': (-12, 0, 0), 'head': sag((0.6, 0, -0.8)),
                       'ear.L': (-6, 0, 0)}, TAIL_UP,
              fly_legs([(0.2, 0, -0.98), (0.55, 0, -0.84), (0.45, 0, -0.9), (0.6, 0, -0.8)],
                       [(0.2, 0, -0.98), (-0.55, 0, -0.84), (-0.3, 0, -0.95), (0.2, 0, -0.98)]))),
    # Nose first, its fore paws together, reaching for the mouse.
    (23, over(CENTRE, {'hips': {'loc': (0, 0.06, 0.6), 'rot': (-48, 0, 0)}, 'neck': (-6, 0, 0), 'head': sag((0.32, 0, -0.95)),
                       'ear.L': (-4, 0, 0)}, TAIL_UP,
              fly_legs([(0.5, 0, -0.86), (0.4, 0, -0.92), (0.35, 0, -0.94), (0.3, 0, -0.95)],
                       [(-0.1, 0, -0.99), (-0.6, 0, -0.8), (-0.4, 0, -0.92), (0.0, 0, -1.0)]))),
    # In the moss: its nose and fore paws down, its back legs up on their toes, its tail straight up.
    (27, over(CENTRE, {'hips': {'loc': (0, 0.1, 0.3), 'rot': (-52, 0, 0)}, 'body': (-4, 0, 0), 'neck': (-10, 0, 0),
                       'head': sag((0.25, 0, -0.97)), 'ear.L': (-2, 0, 0)}, TAIL_UP,
              fore('.L', 0.42, dz=0.0, y=0.05), fore('.R', 0.42, dz=0.0, y=-0.05),
              hind('.L', -0.55, lift=0.02, dz=0.04), hind('.R', -0.55, lift=0.02, dz=0.04))),
    (33, over(CENTRE, {'hips': {'loc': (0, 0.1, 0.28), 'rot': (-50, 0, 0)}, 'body': (-4, 0, 0), 'neck': (-12, 0, 0),
                       'head': sag((0.3, 0.1, -0.95)), 'ear.L': (-2, 0, 0)},
              {'tail1': sag((-0.7, 0, 0.7), {'of': 'hips'}), 'tail2': sag((-0.5, 0.15, 0.85), {'of': 'hips'}),
               'tail3': sag((-0.25, 0.3, 0.92), {'of': 'hips'}), 'tail4': sag((0.0, 0.4, 0.92), {'of': 'hips'})},
              fore('.L', 0.42, y=0.05), fore('.R', 0.42, y=-0.05), hind('.L', -0.55, lift=0.02, dz=0.04), hind('.R', -0.55, lift=0.02, dz=0.04))),
    # Up again, a little shake, and it stands.
    (40, over(stand(), {'hips': {'loc': (0, 0.04, 0.02), 'rot': (-4, 0, 0)}, 'neck': (6, 0, 0), 'head': (-6, 14, 0),
                        'ear.L': (-6, 0, 0), 'tail1': (-8, 0, 0)})),
    (44, over(stand(), {'neck': (6, 0, 0), 'head': (-4, -12, 0), 'tail1': (-6, 0, 0)})),
    (JUMP, stand()),
], loop=False)

# --- scratching behind its near ear (its right: towards the camera) with a hind foot ---------------------------------

def scratching(k):
    up = 0.035 * math.sin(k)
    return sitting({
        'hips': {'loc': (0, -0.02, -0.5), 'rot': (38, 8, 0)}, 'body': (-4, -6, 0), 'chest': (-6, 0, 0),
        'neck': sag((0.45, -0.65, 0.12)), 'head': {'dir': tuple(V(0.35, -0.3, -0.88).normalized()), 'up': (0.3, -0.8, 0.5)},
        'ear.R': (18, 0, 0), 'ear.L': (-4, 0, 0),
        'hock_ik.R': {'at': (-0.08, -0.27, 0.50 + up)},
        'hball_ik.R': {'at': (0.14, -0.30, 0.80 + up * 1.8)},
        'htoe_ik.R': {'at': (0.20, -0.30, 0.88 + up * 2.2)},
        'thigh.R': (0, 0, 0), 'shin.R': {'con': 1.0, 'rot': (0, 0, 0)}, 'foot.R': {'con': 1.0, 'rot': (0, 0, 0)},
        'hpaw.R': {'con': 1.0, 'rot': (0, 0, 0)},
    })


clip(arm, 'scratch', 24, [(f, scratching(TAU * 3.0 * f / 24.0)) for f in range(0, 24, 2)])  # noqa: F821

# --- the yawn ----------------------------------------------------------------------------------------------------------
YAWN = 52
clip(arm, 'yawn', YAWN, [  # noqa: F821
    (0, sitting()),
    (10, sitting({'neck': sag((0.35, 0, 0.94)), 'head': sag((1.0, 0, 0.18)), 'jaw': (-14, 0, 0), 'ear.L': (14, 0, 0)})),
    (18, sitting({'neck': sag((0.3, 0, 0.95)), 'head': sag((0.95, 0, 0.35)), 'jaw': (-46, 0, 0), 'ear.L': (28, 0, 0)}, 1.0)),
    (28, sitting({'neck': sag((0.3, 0, 0.95)), 'head': sag((0.95, 0, 0.32)), 'jaw': (-48, 0, 0), 'ear.L': (30, 0, 0)}, 1.0)),
    (34, sitting({'neck': sag((0.4, 0, 0.92)), 'head': sag((1.0, 0, 0.0)), 'jaw': (0, 0, 0), 'ear.L': (6, 0, 0)})),
    (38, sitting({'head': {'dir': (1.0, 0.0, -0.1), 'up': (0.0, 0.35, 0.94)}})),
    (41, sitting({'head': {'dir': (1.0, 0.0, -0.1), 'up': (0.0, -0.35, 0.94)}})),
    (44, sitting({'head': {'dir': (1.0, 0.0, -0.1), 'up': (0.0, 0.2, 0.98)}})),
    (YAWN, sitting()),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'fox': {'trot': [0, 4, 8, 12], 'walk': [0, 6, 12, 18], 'sit': [0, 34, 60], 'sniff': [0, 16, 36],
                          'look': [0, 18, 40], 'mouse-jump': [0, 7, 12, 18, 23, 27, 40], 'scratch': [0, 6, 12],
                          'yawn': [0, 18, 28, 40]}}
