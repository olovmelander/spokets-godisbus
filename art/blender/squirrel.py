"""The red squirrel of Granskogen and the garden (src/render/lift/fauna.ts, squirrels): quick and small, with tufted ears,
big dark eyes and a bushy tail that flicks. It dashes up and round its trunk, stops dead, flicks its tail, comes down
now and then to sit on the ground and nibble a spruce cone, and leaps back onto the bark. Made with
art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/squirrel.py --out=art/baked/boot/squirrel.glb
    node scripts/bake/blender-kit.mjs art/blender/squirrel.py --fast --preview=<folder>

Units: the squirrel is built at the size of the game's code-built one (src/render/lift/fauna/shapes.ts squirrel): its
body about 0.6 long and its tail curling up behind it to about 1. Z is up (away from the bark, when it is on a trunk),
it faces +X, and the camera's side is -Y (its right: the '.R' bones). Its feet are at the origin.

One mesh with its colours on its corners, skinned to its bones; the cone it eats is part of the mesh too, on a bone of
its own, shrunk to nothing in every clip but the one it eats in. The clips, each named 'squirrel:<clip>':
    run-up      one bound along the bark: the hind feet land by the fore feet and push it on, its tail
                streaming behind; the game turns it by how far it goes                                   (loop)
    run         the same bound on the ground, higher, its tail up in a curve                             (loop)
    sit-eat     sitting up on its haunches, turning a cone in its paws and nibbling it                    (loop)
    tail-flick  stopped on all fours, its tail flicking in quick waves                                    (loop)
    freeze      pressed still, its head up, its ears forward                                              (loop)
    leap        the crouch, the spring, stretched out in the air, and the landing; the game carries it    (once)
A bound of `run-up` covers RUN_STRIDE (the game's STRIDE). Nothing in it comes from anyone else, and it has no texture.
Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

# Never the candy's red, pink or gold (tests/unit): a russet's hue stays over 30 degrees, its chroma under 120.
FUR = tone('#b07c42')        # noqa: F821 (kit-tools.py)
FUR_DARK = tone('#946a3a')   # noqa: F821
FUR_PALE = tone('#b48c58')   # noqa: F821
TAIL_FUR = tone('#a0723c')   # noqa: F821
BELLY = tone('#e6dcc8')      # noqa: F821
TUFT = tone('#6e5234')       # noqa: F821
EYE = tone('#120f0c')        # noqa: F821
SHINE = tone('#f4efe4')      # noqa: F821
RIM = tone('#d8cbb2')        # noqa: F821
NOSE = tone('#3a2c24')       # noqa: F821
CLAW = tone('#4a3a2e')       # noqa: F821
CONE = tone('#7a5c3c')       # noqa: F821
CONE_DARK = tone('#5a4632')  # noqa: F821

RUN_STRIDE = 0.5
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
TAIL = [V(-0.2, 0, 0.30), V(-0.34, 0, 0.36), V(-0.46, 0, 0.47), V(-0.53, 0, 0.62), V(-0.53, 0, 0.80), V(-0.45, 0, 0.95)]
BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.1), {'deform': False}),
    ('hips', 'root', (-0.22, 0, 0.28), (0.0, 0, 0.30)),
    ('chest', 'hips', (0.0, 0, 0.30), (0.19, 0, 0.33), {'connect': True}),
    ('neck', 'chest', (0.17, 0, 0.34), (0.27, 0, 0.42)),
    ('head', 'neck', (0.27, 0, 0.42), (0.54, 0, 0.43), {'connect': True}),
    ('jaw', 'head', (0.43, 0, 0.385), (0.53, 0, 0.375)),
    ('ear.L', 'head', (0.34, 0.06, 0.52), (0.33, 0.075, 0.63)),
    ('tail1', 'hips', tuple(TAIL[0]), tuple(TAIL[1])),
]
for k in range(2, len(TAIL)):
    BONES.append(('tail%d' % k, 'tail%d' % (k - 1), tuple(TAIL[k - 1]), tuple(TAIL[k]), {'connect': True}))
BONES += [
    ('arm.L', 'chest', (0.15, 0.075, 0.25), (0.13, 0.08, 0.13)),
    ('fore.L', 'arm.L', (0.13, 0.08, 0.13), (0.19, 0.08, 0.025), {'connect': True}),
    ('thigh.L', 'hips', (-0.15, 0.09, 0.25), (-0.05, 0.10, 0.15)),
    ('shin.L', 'thigh.L', (-0.05, 0.10, 0.15), (-0.15, 0.09, 0.055), {'connect': True}),
    ('foot.L', 'shin.L', (-0.15, 0.09, 0.055), (0.0, 0.09, 0.012), {'connect': True}),
    # The cone it eats: off the root, so that it goes nowhere with the body unless a clip puts it there.
    ('cone', 'root', (0.3, 0, 0.3), (0.3, 0, 0.42)),
]
arm = armature('squirrel', BONES)  # noqa: F821
part = new_part()  # noqa: F821


def loft(rows, count, paint, fluff=0.0, grain=30.0, first=None, last=None):
    """Rings along a path: each row (centre, half width, half height over the centre, half height under it), square to
    the path, coloured by paint(point, row, across, up). `fluff` pushes each point out or in a little: fur."""
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
    return lit(c, 1.0 - k * 0.5 + k * noise(p.x * 60.0, p.y * 60.0 + 3.0, p.z * 60.0))  # noqa: F821


def polyline(points, k):
    out = [points[0]]
    for a, b in zip(points[:-1], points[1:]):
        for s in range(1, k + 1):
            out.append(a + (b - a) * (s / float(k)))
    return out


# --- the body: a round rump, a slimmer chest, a white belly ---------------------------------------------------------

def body_paint(p, i, s, u):
    c = mix(FUR, FUR_DARK, 0.6 * smooth((u - 0.4) / 0.5))
    c = mix(c, FUR_PALE, 0.3 * smooth((0.2 - abs(u)) / 0.3))
    c = mix(c, BELLY, smooth((-u - 0.35) / 0.25))
    return grain_lit(c, p)


at = mark(part)  # noqa: F821
rows = [
    (V(-0.30, 0, 0.27), 0.03, 0.03, 0.03),
    (V(-0.27, 0, 0.275), 0.085, 0.09, 0.09),
    (V(-0.20, 0, 0.28), 0.115, 0.12, 0.12),
    (V(-0.11, 0, 0.29), 0.11, 0.115, 0.105),
    (V(-0.01, 0, 0.30), 0.09, 0.1, 0.085),
    (V(0.09, 0, 0.315), 0.08, 0.09, 0.08),
    (V(0.18, 0, 0.335), 0.075, 0.085, 0.08),
    (V(0.25, 0, 0.37), 0.06, 0.07, 0.07),
]
loft(rows, 16, body_paint, fluff=0.012, grain=40.0, first=(V(-0.31, 0, 0.27), FUR), last=None)
bind(arm, part, at, ['hips', 'chest', 'neck'], blend=0.1)  # noqa: F821

# --- the head: round, with a short blunt muzzle, big dark eyes, and tufted ears -------------------------------------

def head_paint(p, i, s, u):
    c = mix(FUR, FUR_DARK, 0.4 * smooth((u - 0.5) / 0.4))
    c = mix(c, BELLY, smooth((-u - 0.3) / 0.25) * smooth((p.x - 0.33) / 0.05))
    c = mix(c, FUR_PALE, 0.5 * smooth((p.x - 0.5) / 0.05))
    return grain_lit(c, p, 0.06)


at = mark(part)  # noqa: F821
rows = [
    (V(0.26, 0, 0.42), 0.05, 0.05, 0.05),
    (V(0.29, 0, 0.425), 0.085, 0.085, 0.08),
    (V(0.35, 0, 0.43), 0.1, 0.095, 0.085),
    (V(0.41, 0, 0.425), 0.092, 0.085, 0.075),
    (V(0.47, 0, 0.415), 0.07, 0.068, 0.058),
    (V(0.52, 0, 0.405), 0.048, 0.05, 0.04),
    (V(0.555, 0, 0.398), 0.028, 0.03, 0.024),
]
loft(rows, 16, head_paint, fluff=0.005, grain=60.0, first=(V(0.25, 0, 0.42), FUR), last=(V(0.568, 0, 0.397), NOSE))
lump(part, V(0.562, 0, 0.405), (0.012, 0.016, 0.01), 2, NOSE)  # noqa: F821
for side in (1.0, -1.0):
    out = V(0.35, 0.8 * side, 0.45).normalized()
    centre = V(0.45, 0.062 * side, 0.45)
    lump(part, centre - out * 0.004, (0.034, 0.02, 0.03), 2, RIM)  # noqa: F821
    lump(part, centre + out * 0.002, (0.03, 0.018, 0.027), 2, EYE)  # noqa: F821
    lump(part, centre + out * 0.016 + V(0.008, 0, 0.01), (0.007, 0.004, 0.007), 1, SHINE)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821
# The lower jaw, pale, which nibbles.
at = mark(part)  # noqa: F821
loft([(V(0.43, 0, 0.375), 0.04, 0.012, 0.022), (V(0.49, 0, 0.372), 0.03, 0.01, 0.018), (V(0.54, 0, 0.37), 0.015, 0.008, 0.01)],
     10, lambda p, i, s, u: BELLY, first=(V(0.42, 0, 0.375), BELLY), last=(V(0.552, 0, 0.37), BELLY))
bind(arm, part, at, 'jaw')  # noqa: F821
# The ears: small and round, each with a long dark tuft standing up from its tip.
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    base = V(0.34, 0.06 * side, 0.5)
    tip = V(0.33, 0.077 * side, 0.6)
    tube(part, [base, (base + tip) * 0.5, tip], [0.032, 0.03, 0.012], [FUR, FUR_DARK, TUFT], 8, squash=0.45,  # noqa: F821
         lean=V(1, 0, 0))
    for k, (dx, dy) in enumerate(((0.0, 0.0), (0.012, 0.006), (-0.01, -0.005))):
        root = tip + V(dx, dy * side, -0.012)
        tube(part, [root, root + V(-0.006 + dx * 0.5, 0.01 * side, 0.05), root + V(-0.014 + dx, 0.016 * side, 0.09 - k * 0.012)],  # noqa: F821
             [0.008, 0.005, 0.0015], [TUFT, TUFT, TUFT], 5)
    bind(arm, part, at, 'ear' + tag)  # noqa: F821

# --- the legs: small fore paws, long hind feet ---------------------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(x, y, z):
        return V(x, y * side, z)

    at = mark(part)  # noqa: F821
    path = polyline([S(0.15, 0.06, 0.29), S(0.13, 0.08, 0.13), S(0.19, 0.08, 0.025)], 2)
    tube(part, path, [0.04, 0.035, 0.026, 0.02, 0.016], [FUR, FUR, FUR_PALE, FUR_PALE, FUR_PALE], 7)  # noqa: F821
    bind(arm, part, at, ['arm' + tag, 'fore' + tag], blend=0.03)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, S(0.2, 0.08, 0.02), (0.024, 0.016, 0.012), 2, FUR_PALE)  # noqa: F821
    for k in (-1.0, 0.0, 1.0):
        tube(part, [S(0.215, 0.08 + 0.01 * k, 0.018), S(0.235, 0.08 + 0.014 * k, 0.008)], [0.004, 0.0015], [CLAW, CLAW], 4)  # noqa: F821
    bind(arm, part, at, 'fore' + tag)  # noqa: F821
    # The haunch, big and round, and the long hind foot.
    at = mark(part)  # noqa: F821
    made = lump(part, S(-0.15, 0.075, 0.22), (0.1, 0.055, 0.085), 2, FUR)  # noqa: F821
    for pt in made:
        part['paint'][pt] = grain_lit(mix(FUR, BELLY, 0.4 * smooth((0.16 - pt.co.z) / 0.04)), pt.co)
    bind(arm, part, at, 'thigh' + tag, blend=0.06)  # noqa: F821
    at = mark(part)  # noqa: F821
    path = polyline([S(-0.12, 0.09, 0.2), S(-0.05, 0.10, 0.15), S(-0.15, 0.09, 0.055), S(0.0, 0.09, 0.015)], 2)
    tube(part, path, [0.05, 0.042, 0.035, 0.028, 0.022, 0.02, 0.016], [FUR, FUR, FUR, FUR_PALE, FUR_PALE, FUR_PALE, FUR_PALE], 7)  # noqa: F821
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag, 'foot' + tag], blend=0.03)  # noqa: F821
    at = mark(part)  # noqa: F821
    for k in (-1.0, 0.0, 1.0):
        tube(part, [S(0.0, 0.09 + 0.011 * k, 0.014), S(0.025, 0.09 + 0.015 * k, 0.006)], [0.005, 0.0015], [CLAW, CLAW], 4)  # noqa: F821
    bind(arm, part, at, 'foot' + tag)  # noqa: F821

# --- the tail: big, bushy, curling up behind -----------------------------------------------------------------------
TAIL_PATH = polyline(TAIL, 2)
TAIL_R = []
for k in range(len(TAIL_PATH)):
    t = k / float(len(TAIL_PATH) - 1)
    TAIL_R.append(0.045 + 0.085 * smooth(t / 0.4) - 0.05 * smooth((t - 0.85) / 0.15))


def tail_paint(p, i, s, u):
    t = i / float(len(TAIL_PATH) - 1)
    c = mix(TAIL_FUR, FUR_DARK, 0.5 * smooth((abs(s) - 0.3) / 0.6))
    c = mix(c, FUR_PALE, 0.25 * smooth((0.4 - t) / 0.3))
    return grain_lit(c, p, 0.16)


at = mark(part)  # noqa: F821
# A tube, so that its rings keep their way round where it turns upright; then furred, and painted.
made = tube(part, TAIL_PATH, TAIL_R, [TAIL_FUR] * len(TAIL_PATH), 12, lean=V(0, 1, 0))  # noqa: F821
for i, ring in enumerate(made[:len(TAIL_PATH)]):
    for j, pt in enumerate(ring):
        off = pt.co - TAIL_PATH[i]
        k = noise(pt.co.x * 26.0 + 7.0, pt.co.y * 26.0, pt.co.z * 26.0)  # noqa: F821
        if off.length > 1e-5:
            pt.co = pt.co + off.normalized() * 0.045 * (k - 0.45)
        a = TAU * j / 12.0
        part['paint'][pt] = tail_paint(pt.co, i, math.cos(a), math.sin(a))
bind(arm, part, at, ['tail%d' % k for k in range(1, len(TAIL))], blend=0.07)  # noqa: F821

# --- the cone: a spruce cone, scale over scale ---------------------------------------------------------------------
at = mark(part)  # noqa: F821
profile = []
for k in range(9):
    t = k / 8.0
    profile.append((0.035 * math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.7, 0.3 + 0.13 * t))
rings = []
tones = []
for k, (r, z) in enumerate(profile):
    ring = []
    shade = []
    for j in range(10):
        a = TAU * (j + 0.5 * (k % 2)) / 10.0
        rr = r * (1.0 + 0.12 * (k % 2))
        ring.append(V(0.3 + rr * math.cos(a), rr * math.sin(a), z))
        shade.append(CONE if k % 2 else CONE_DARK)
    rings.append(ring)
    tones.append(shade)
skin(part, rings, tones, (V(0.3, 0, 0.295), CONE_DARK), (V(0.3, 0, 0.435), CONE_DARK))  # noqa: F821
bind(arm, part, at, 'cone')  # noqa: F821

skinned(arm, part, 'squirrel-body', strength=0.3, reach=0.06, floor=0.0)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------
HIDDEN_CONE = {'cone': {'loc': (0, -0.05, 0.1), 'rot': (0, 0, 0), 'scale': 0.001}}
CENTRE = over({'root': (0, 0, 0), 'hips': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'chest': (0, 0, 0), 'neck': (0, 0, 0),
               'head': (0, 0, 0), 'jaw': (0, 0, 0), 'ear.L': (0, 0, 0)},
              {'tail%d' % k: (0, 0, 0) for k in range(1, len(TAIL))}, HIDDEN_CONE)


def legs(fa, ff, th, sh, ft):
    """Each leg by the way its bones point, the fore leg (arm, fore) and the hind (thigh, shin, foot)."""
    return {'arm.L': sag(fa), 'fore.L': sag(ff), 'thigh.L': sag(th), 'shin.L': sag(sh), 'foot.L': sag(ft)}


STAND = legs((-0.15, 0, -0.99), (0.5, 0, -0.87), (0.7, 0, -0.71), (-0.73, 0, -0.68), (0.96, 0, -0.27))


def tail_dirs(dirs, of='hips'):
    return {'tail%d' % (k + 1): sag(d, {'of': of} if of else None) for k, d in enumerate(dirs)}


# Its tail streaming out behind along the bark, a little up from it.
TAIL_BACK = [(-0.95, 0, 0.3), (-0.97, 0, 0.22), (-0.98, 0, 0.18), (-0.97, 0, 0.24), (-0.9, 0, 0.42)]
# Up over its back in an S, as it sits (in the creature's own space, not the body's).
SIT_TAIL = [(-0.5, 0, 0.87), (-0.25, 0, 0.97), (0.1, 0, 1.0), (0.45, 0, 0.9), (0.8, 0, 0.6)]
# Up over its back in an S, as it stops.
TAIL_UP = [(-0.85, 0, 0.5), (-0.55, 0, 0.84), (-0.1, 0, 1.0), (0.3, 0, 0.95), (0.7, 0, 0.7)]


def wave(dirs, k, amount, lag=0.9):
    """A tail's way, waved: each bone a little later than the one before."""
    out = []
    for i, d in enumerate(dirs):
        a = amount * math.sin(k - lag * i) * (0.5 + 0.5 * i / len(dirs))
        dd = V(*d)
        out.append(tuple(dd + V(0, 0, a)))
    return out


def bound(name, frames, high, tail, tail_wave):
    """One bound, by the fore and hind legs together: gathered, the hind feet by the fore; the push; stretched out in the
    air; the fore feet down. The body arches and stretches with it, and the tail waves after it."""
    phases = [
        (0.0, {'hips': {'loc': (0, 0, -0.02), 'rot': (14, 0, 0)}, 'chest': (-10, 0, 0), 'neck': (-4, 0, 0), 'head': (2, 0, 0)},
         legs((-0.6, 0, -0.8), (-0.75, 0, -0.66), (0.75, 0, -0.66), (-0.3, 0, -0.95), (0.98, 0, -0.2))),
        (0.25, {'hips': {'loc': (0, 0, high * 0.4), 'rot': (4, 0, 0)}, 'chest': (-2, 0, 0), 'neck': (-4, 0, 0), 'head': (2, 0, 0)},
         legs((0.45, 0, -0.89), (0.8, 0, -0.6), (-0.1, 0, -0.99), (-0.75, 0, -0.66), (-0.7, 0, -0.71))),
        (0.5, {'hips': {'loc': (0, 0, high), 'rot': (-6, 0, 0)}, 'chest': (6, 0, 0), 'neck': (-4, 0, 0), 'head': (0, 0, 0)},
         legs((0.85, 0, -0.52), (0.95, 0, -0.3), (-0.65, 0, -0.76), (-0.95, 0, -0.3), (-0.98, 0, -0.2))),
        (0.75, {'hips': {'loc': (0, 0, high * 0.35), 'rot': (8, 0, 0)}, 'chest': (-6, 0, 0), 'neck': (-2, 0, 0), 'head': (0, 0, 0)},
         legs((0.05, 0, -1.0), (0.3, 0, -0.95), (0.3, 0, -0.95), (-0.65, 0, -0.76), (0.5, 0, -0.87))),
    ]
    keys = []
    for at_phase, body, limbs in phases:
        f = int(round(at_phase * frames))
        k = TAU * at_phase
        keys.append((f, over(CENTRE, body, limbs, {'ear.L': (-10, 0, 0)}, tail_dirs(wave(tail, k, tail_wave)))))
    clip(arm, name, frames, keys)  # noqa: F821


bound('run-up', 12, 0.03, TAIL_BACK, 0.25)
bound('run', 12, 0.1, [(-0.9, 0, 0.45), (-0.8, 0, 0.6), (-0.6, 0, 0.8), (-0.3, 0, 0.95), (0.1, 0, 1.0)], 0.3)

# --- sitting up, eating a cone ---------------------------------------------------------------------------------------

def sitting(chew=0.0, turn=0.0, look=0.0, extra=None):
    return over(CENTRE, {
        'hips': {'loc': (0, -0.02, -0.06), 'rot': (58, 0, 0)}, 'chest': (14, 0, 0),
        'neck': sag((0.55, 0, 0.83)), 'head': sag((0.9, look, -0.3)), 'jaw': (-10 * chew, 0, 0), 'ear.L': (-6, 0, 0),
        'arm.L': sag((0.55, -0.35, -0.2)), 'fore.L': sag((0.35, -0.35, 0.85)),
        'thigh.L': sag((0.9, 0.15, -0.4)), 'shin.L': sag((-0.85, 0, -0.5)), 'foot.L': sag((0.97, 0, -0.1)),
        'cone': {'loc': (0, 0.21, 0.13), 'rot': (-20, turn, 0), 'scale': 0.995},
    }, tail_dirs(SIT_TAIL, None), extra or {})


clip(arm, 'sit-eat', 48, [(f, sitting(1.0 if (f // 3) % 2 else 0.0, f * 7.5, 0.06 * math.sin(TAU * f / 48.0))) for f in range(0, 48, 3)])  # noqa: F821

# --- stopped: the tail flicks, or it freezes -------------------------------------------------------------------------
STOP = over(CENTRE, STAND, {'hips': {'loc': (0, 0, 0.01), 'rot': (4, 0, 0)}, 'neck': (14, 0, 0), 'head': (-12, 0, 0),
                           'ear.L': (-8, 0, 0)})
FLICK_REST = [(-0.9, 0, 0.42), (-0.6, 0, 0.8), (-0.2, 0, 0.98), (0.25, 0, 0.97), (0.6, 0, 0.8)]


def flicked(k):
    """The tail at a moment of its flick: a wave runs up it, quick, and dies away."""
    dirs = []
    for i, d in enumerate(FLICK_REST):
        a = math.sin(k - 1.1 * i) * (0.45 + 0.25 * i)
        dirs.append((d[0] - 0.3 * a, d[1], d[2] + a * 0.6))
    return tail_dirs(dirs)


keys = []
for f in range(0, 24, 2):
    t = f / 24.0
    # Two quick flicks in the first half, then still.
    k = TAU * 2.0 * min(t, 0.5) * 2.0
    amp = smooth((0.5 - t) / 0.12) if t < 0.5 else 0.0
    pose = over(STOP, flicked(k) if amp > 0 else tail_dirs(FLICK_REST))
    if amp > 0:
        pose = over(STOP, tail_dirs([(d[0] - 0.3 * amp * math.sin(k - 1.1 * i) * (0.45 + 0.25 * i), 0,
                                      d[2] + 0.6 * amp * math.sin(k - 1.1 * i) * (0.45 + 0.25 * i)) for i, d in enumerate(FLICK_REST)]))
    keys.append((f, pose))
clip(arm, 'tail-flick', 24, keys)  # noqa: F821

FROZEN = over(CENTRE, legs((0.1, 0, -0.99), (0.6, 0, -0.8), (0.85, 0, -0.52), (-0.8, 0, -0.6), (0.98, 0, -0.2)),
              {'hips': {'loc': (0, 0, -0.035), 'rot': (-2, 0, 0)}, 'neck': (18, 0, 0), 'head': (-10, 0, 0), 'ear.L': (-14, 0, 0)},
              tail_dirs(TAIL_BACK))
clip(arm, 'freeze', 48, [  # noqa: F821
    (0, FROZEN),
    (24, over(FROZEN, {'chest': {'loc': (0, 0, 0.003), 'rot': (0, 0, 0)}, 'head': (-9, 0, 0)})),
])

# --- the leap -------------------------------------------------------------------------------------------------------
clip(arm, 'leap', 14, [  # noqa: F821
    (0, over(STOP, tail_dirs(TAIL_BACK))),
    (3, over(CENTRE, legs((0.1, 0, -0.99), (0.6, 0, -0.8), (0.9, 0, -0.44), (-0.85, 0, -0.52), (0.98, 0, -0.2)),
             {'hips': {'loc': (0, 0, -0.05), 'rot': (6, 0, 0)}, 'neck': (10, 0, 0), 'head': (-6, 0, 0), 'ear.L': (-10, 0, 0)},
             tail_dirs(TAIL_BACK))),
    (6, over(CENTRE, legs((0.9, 0, -0.44), (0.98, 0, -0.2), (-0.7, 0, -0.71), (-0.95, 0, -0.3), (-0.99, 0, -0.1)),
             {'hips': {'loc': (0, 0, 0.04), 'rot': (-4, 0, 0)}, 'chest': (6, 0, 0), 'neck': (-6, 0, 0), 'ear.L': (-16, 0, 0)},
             tail_dirs([(-0.98, 0, 0.1), (-0.99, 0, 0.05), (-0.98, 0, 0.15), (-0.95, 0, 0.3), (-0.85, 0, 0.5)]))),
    (10, over(CENTRE, legs((0.75, 0, -0.66), (0.6, 0, -0.8), (-0.2, 0, -0.98), (-0.8, 0, -0.6), (-0.3, 0, -0.95)),
              {'hips': {'loc': (0, 0, 0.02), 'rot': (-8, 0, 0)}, 'chest': (-4, 0, 0), 'neck': (0, 0, 0), 'ear.L': (-12, 0, 0)},
              tail_dirs([(-0.95, 0, 0.3), (-0.9, 0, 0.42), (-0.8, 0, 0.6), (-0.6, 0, 0.8), (-0.3, 0, 0.95)]))),
    (14, over(STOP, tail_dirs(TAIL_BACK))),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'squirrel': {'run-up': [0, 3, 6, 9], 'run': [0, 3, 6, 9], 'sit-eat': [0, 12, 24, 36], 'tail-flick': [0, 3, 6, 9],
                               'freeze': [0, 24], 'leap': [0, 3, 6, 10, 14]}}
