"""Sickan, the family's black cat, out in the storm in Stormgarden (src/content/aventyr2/sickan.ts): a sleek short-haired
domestic cat with a small round head, upright triangular ears, yellow-green eyes, whiskers, a long supple body and a long
tail carried in a curve. Made with art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/sickan.py --out=art/baked/aventyr2/sickan.glb
    node scripts/bake/blender-kit.mjs art/blender/sickan.py --fast --preview=<folder>    (stills of every clip)
    node scripts/bake/blender-kit.mjs art/blender/sickan.py --fast --only=grey --preview=<folder>   (in grey, to see her form)

Units: she is built 1 tall at the withers, her nose 1.05 ahead of her middle and her rump 0.66 behind it, and her tail
1.2 long; the game draws her SIZE times that (src/content/aventyr2/sickan.ts: a cat of 25 cm at the withers beside an
Elof of 15 cm). Z is up, she faces +X, and the camera's side is -Y (her right: the '.R' bones). Her feet stand at the
origin.

One mesh with its colours on its corners, skinned to its bones: black all over, the insides of her ears a dark skin
colour, her nose leather dark, her whiskers pale, and her eyes yellow-green with a dark pupil and a speck of light. Her
legs bend at real joints, their feet set on the ground by IK while the clips are keyed, and baked to plain bone keys.
'lid.L' and 'lid.R' are her upper eyelids: a turn of -LID_OPEN degrees about their own X shuts them (the game blinks
them, and turns her neck, head and ears, on top of any clip). The clips, each named 'sickan:<clip>':
    walk      one stride of a walk, four beats, her tail up with a hook at its tip; the game turns it by how far
              she goes                                                                                       (loop)
    trot      one stride of a trot, the diagonal legs together, her tail up; the same                        (loop)
    stand     standing, breathing, her tail low and swaying, an ear turning                                  (loop)
    sit       sitting upright, her tail curled round her feet on her right, breathing, an ear twitching, the
              tip of her tail flicking, a slow blink                                                         (loop)
    greet     sitting: a slow blink at him, her head a little on one side, the tip of her tail curling up    (once)
    wash      sitting: she lifts her right fore paw, licks it, and wipes it over her ear and her face, twice (loop)
    crouch    crouched low under shelter, her fore paws out in front of her as a sphinx lies, her tail tight
              along her side, her ears turning, the tip of her tail twitching                                (loop)
    stretch   up from sitting into a long bow, fore paws far out and her rump and tail high, and up to stand (once)
    shake     standing: she shakes the rain off, from her head down her back to her tail                     (once)
    jump      a crouch, the leap, the flight with her fore legs reaching, and the landing. She leaps on the
              spot: the game carries her along the arc between frames JUMP_LIFT and JUMP_LAND                (once)
A stride of `walk` covers WALK_STRIDE and one of `trot` TROT_STRIDE, in her own units (the game reads the same).
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

GREY = ONLY == 'grey'  # noqa: F821 (set by scripts/bake/blender-kit.mjs)

# Black, and a little warm, so that the storm night's blue light leaves her black and not blue. Her form is read from her
# outline and the sheen the game gives her fur (src/content/aventyr2/sickan.ts), so the colours here are close together.
FUR = tone('#a9a9b2' if GREY else '#161412')       # noqa: F821 (kit-tools.py)
FUR_TOP = tone('#b8b8c2' if GREY else '#1d1a17')   # noqa: F821
FUR_UNDER = tone('#98969c' if GREY else '#100e0d')  # noqa: F821
EAR_IN = tone('#b08e94' if GREY else '#3a2b2f')    # noqa: F821
NOSE = tone('#6a5a5e' if GREY else '#2a2024')      # noqa: F821
MOUTH = tone('#2a1a1c')       # noqa: F821
TONGUE = tone('#b8707e')      # noqa: F821
WHISKER = tone('#e2e0d6')     # noqa: F821
IRIS_IN = tone('#dfe65a')     # noqa: F821
IRIS = tone('#c2d83a')        # noqa: F821
IRIS_EDGE = tone('#7fa82c')   # noqa: F821
EYE_RIM = tone('#0c0c0e')     # noqa: F821
PUPIL = tone('#060708')       # noqa: F821
SHINE = tone('#f6f8ee')       # noqa: F821

WALK_STRIDE = 0.84
TROT_STRIDE = 1.5
LID_OPEN = 124.0
LID_SPAN = 80.0
LOWER_LID = 106.0
JUMP_FRAMES = 36
JUMP_LIFT = 8
JUMP_LAND = 24

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

FORE_BALL = 0.44
HIND_BALL = -0.46
FORE_Y = 0.075
HIND_Y = 0.085
# Her head is drawn HEAD_K times its measure, about where it turns on her neck: a little big, as a young cat's.
HEAD_PIVOT = V(0.70, 0.0, 1.09)
HEAD_K = 1.12


def hp(x, y, z):
    """A place in her head, from its measure."""
    return HEAD_PIVOT + (V(x, y, z) - HEAD_PIVOT) * HEAD_K


def hs(*sizes):
    return tuple(s * HEAD_K for s in sizes)


EYE_Y = 0.083
EYE_Z = 1.163
EYE_DIR = V(0.9, 0.42, 0.1).normalized()
EYE_R = 0.07 * HEAD_K
# How far her eye stands out of her face.
EYE_OUT = 0.013 * HEAD_K
# Her tail at rest: back and down from her rump, and up again at its tip.
TAIL_REST = [V(-0.60, 0, 0.87), V(-0.78, 0, 0.80), V(-0.96, 0, 0.71), V(-1.14, 0, 0.63), V(-1.33, 0, 0.57), V(-1.52, 0, 0.56),
             V(-1.70, 0, 0.62)]

HEAD = [
    (0.688, 1.150, 0.060, 0.060, 0.060),
    (0.715, 1.152, 0.124, 0.116, 0.106),
    (0.755, 1.155, 0.168, 0.154, 0.134),
    (0.800, 1.155, 0.188, 0.166, 0.148),
    (0.850, 1.150, 0.193, 0.164, 0.154),
    (0.895, 1.142, 0.186, 0.150, 0.152),
    (0.935, 1.130, 0.170, 0.132, 0.146),
    (0.962, 1.117, 0.140, 0.108, 0.134),
    (0.982, 1.104, 0.100, 0.078, 0.116),
    (1.002, 1.094, 0.078, 0.060, 0.098),
    (1.025, 1.085, 0.060, 0.046, 0.078),
    (1.042, 1.080, 0.040, 0.032, 0.054),
]
HEAD_SQUARE = 0.07


def skull(x):
    """The ring of her head's measure at x: its centre's height, half width, and half heights over and under."""
    for a, b in zip(HEAD[:-1], HEAD[1:]):
        if a[0] <= x <= b[0]:
            t = (x - a[0]) / (b[0] - a[0])
            return tuple(lerp(a[k], b[k], t) for k in range(1, 5))
    return HEAD[-1][1:] if x > HEAD[-1][0] else HEAD[0][1:]


def face_at(y, z):
    """Where her face is, in her head's measure, at this far to her side and this high: the foremost x there."""
    lo, hi = 0.86, 1.042
    for _ in range(30):
        mid = (lo + hi) * 0.5
        zc, w, ht, hb = skull(mid)
        h = ht if z >= zc else hb
        s = y / w
        u = (z - zc) / h
        r = math.hypot(s, u)
        # The ring's corners are filled out (HEAD_SQUARE), as loft() fills them.
        k = 1.0 + HEAD_SQUARE * (1.0 if u >= 0.0 else -1.2) * (abs(s * u) / max(r * r, 1e-9) * 2.0) ** 1.5
        inside = r < k
        if inside:
            lo = mid
        else:
            hi = mid
    return V(lo, y, z)


def _eye(side, look):
    at_face = face_at(EYE_Y, EYE_Z)
    return hp(at_face.x, at_face.y * side, at_face.z) - look * (EYE_R - EYE_OUT)


EYE_L = _eye(1.0, EYE_DIR)
# Her lower lids' rims slant up towards the outside of each eye, as a cat's do.
EYE_SLANT = 0.0
LOWER_SLANT = 20.0


def eye_frame(side, slant_deg=EYE_SLANT):
    """An eye's own directions: the way it looks, the line its lids turn about (towards her nose, and down by the
    slant), and up across that line."""
    look = V(EYE_DIR.x, EYE_DIR.y * side, EYE_DIR.z)
    inward = look.cross(V(0, 0, 1)).normalized() * side
    tall = (inward.cross(look) * side).normalized()
    slant = math.radians(slant_deg)
    hinge = (inward * math.cos(slant) - tall * math.sin(slant)).normalized()
    return look, hinge, (hinge.cross(look) * side).normalized(), inward, tall


LID_Z = tuple(eye_frame(1.0)[2])
EAR_BASE = hp(0.775, 0.112, 1.235)
EAR_TIP = hp(0.755, 0.172, 1.468)

BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.2), {'deform': False}),
    ('hips', 'root', (-0.50, 0, 0.80), (-0.20, 0, 0.80)),
    ('body', 'hips', (-0.20, 0, 0.80), (0.14, 0, 0.80), {'connect': True}),
    ('chest', 'body', (0.14, 0, 0.80), (0.46, 0, 0.82), {'connect': True}),
    ('neck', 'chest', (0.46, 0, 0.90), (0.70, 0, 1.09)),
    ('head', 'neck', (0.70, 0, 1.09), (1.08, 0, 1.09), {'connect': True}),
    ('jaw', 'head', tuple(hp(0.80, 0, 1.055)), tuple(hp(1.0, 0, 1.03))),
    ('ear.L', 'head', tuple(EAR_BASE), tuple(EAR_TIP)),
    ('lid.L', 'head', tuple(EYE_L), tuple(EYE_L + EYE_DIR * 0.1), {'z': LID_Z}),
]
for i in range(6):
    BONES.append(('tail%d' % (i + 1), 'hips' if i == 0 else 'tail%d' % i, tuple(TAIL_REST[i]), tuple(TAIL_REST[i + 1]),
                  {'connect': i > 0}))
BONES += [
    ('upperarm.L', 'chest', (0.50, 0.085, 0.66), (0.36, 0.09, 0.50)),
    ('forearm.L', 'upperarm.L', (0.36, 0.09, 0.50), (0.39, FORE_Y, 0.15), {'connect': True, 'ik': ('wrist_ik.L', 2)}),
    ('hand.L', 'forearm.L', (0.39, FORE_Y, 0.15), (FORE_BALL, FORE_Y, 0.035), {'connect': True, 'track': 'fball_ik.L'}),
    ('fpaw.L', 'hand.L', (FORE_BALL, FORE_Y, 0.035), (0.525, FORE_Y, 0.02), {'connect': True, 'track': 'ftoe_ik.L'}),
    ('thigh.L', 'hips', (-0.42, 0.1, 0.72), (-0.26, 0.115, 0.45)),
    ('shin.L', 'thigh.L', (-0.26, 0.115, 0.45), (-0.52, HIND_Y, 0.23), {'connect': True, 'ik': ('hock_ik.L', 2)}),
    ('foot.L', 'shin.L', (-0.52, HIND_Y, 0.23), (HIND_BALL, HIND_Y, 0.035), {'connect': True, 'track': 'hball_ik.L'}),
    ('hpaw.L', 'foot.L', (HIND_BALL, HIND_Y, 0.035), (-0.375, HIND_Y, 0.02), {'connect': True, 'track': 'htoe_ik.L'}),
    ('wrist_ik.L', None, (0.39, FORE_Y, 0.15), (0.39, FORE_Y, 0.25), {'ctrl': True}),
    ('fball_ik.L', None, (FORE_BALL, FORE_Y, 0.035), (FORE_BALL, FORE_Y, 0.135), {'ctrl': True}),
    ('ftoe_ik.L', None, (0.525, FORE_Y, 0.02), (0.525, FORE_Y, 0.12), {'ctrl': True}),
    ('hock_ik.L', None, (-0.52, HIND_Y, 0.23), (-0.52, HIND_Y, 0.33), {'ctrl': True}),
    ('hball_ik.L', None, (HIND_BALL, HIND_Y, 0.035), (HIND_BALL, HIND_Y, 0.135), {'ctrl': True}),
    ('htoe_ik.L', None, (-0.375, HIND_Y, 0.02), (-0.375, HIND_Y, 0.12), {'ctrl': True}),
]
arm = armature('sickan', BONES)  # noqa: F821
part = new_part()  # noqa: F821


def finer(rows, k):
    """The rows of a loft with k - 1 more between each pair, on a smooth curve through them (Catmull-Rom)."""
    out = []
    n = len(rows)
    for i in range(n - 1):
        p0 = rows[max(i - 1, 0)]
        p1 = rows[i]
        p2 = rows[i + 1]
        p3 = rows[min(i + 2, n - 1)]
        for s in range(k):
            t = s / float(k)
            row = []
            for a, b, c, d in zip(p0, p1, p2, p3):
                row.append(0.5 * ((2.0 * b) + (-a + c) * t + (2.0 * a - 5.0 * b + 4.0 * c - d) * t * t + (-a + 3.0 * b - 3.0 * c + d) * t * t * t))
            out.append(tuple(row))
    out.append(rows[-1])
    return out


def loft(rows, count, paint, fluff=0.0, grain=30.0, first=None, last=None, square=0.0, upright=False, bulges=None):
    """Rings along a path: each row (centre, half width, half height over the centre, half height under it), each ring
    square to the path (or, `upright`, standing straight up across her), and coloured by paint(point, row, across, up)
    where across and up go from -1 to 1 round it. `fluff` pushes each point out or in a little, unevenly: fur.
    `square` fills out the ring's corners (0: an ellipse). `bulges` swell her sides where her shoulders and haunches
    are under her skin: each (x, half length, degrees over level, degrees wide, how much)."""
    rings = []
    colours = []
    n = len(rows)
    for i, (c, w, ht, hb) in enumerate(rows):
        ahead = V(1, 0, 0) if upright else rows[min(i + 1, n - 1)][0] - rows[max(i - 1, 0)][0]
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
            k = 1.0 + square * (1.0 if u >= 0.0 else -1.2) * (abs(s * u) * 2.0) ** 1.5 if square else 1.0
            for bx, blong, bat, bwide, bmuch in bulges or ():
                along_it = smooth(1.0 - abs(c.x - bx) / blong)
                round_it = math.exp(-(((math.degrees(math.atan2(u, abs(s))) - bat) / bwide) ** 2))
                k *= 1.0 + bmuch * along_it * round_it
            off = side * (w * s * k) + up * ((ht if u >= 0.0 else hb) * u * k)
            p = c + off
            if fluff and off.length > 1e-5:
                g = noise(p.x * grain + 7.0, p.y * grain, p.z * grain)  # noqa: F821
                p = p + off.normalized() * fluff * (g - 0.45)
            ring.append(p)
            tones.append(paint(p, i, s, u))
        rings.append(ring)
        colours.append(tones)
    return skin(part, rings, colours, first, last)  # noqa: F821


def rows_of(table, k=1):
    """Loft rows from a table of (x, z, half width, half height over, half height under), `k` times as fine."""
    return [(V(x, 0, z), w, ht, hb) for x, z, w, ht, hb in (finer(table, k) if k > 1 else table)]


def fur(p, u=0.0, k=0.07):
    """Her fur at a point: a little lighter where it faces up, a little warmer under her, and uneven by its own grain."""
    c = mix(FUR, FUR_TOP, smooth((u - 0.2) / 0.6))
    c = mix(c, FUR_UNDER, smooth((-u - 0.35) / 0.4))
    return lit(c, 1.0 - k * 0.5 + k * noise(p.x * 43.0, p.y * 43.0 + 3.0, p.z * 43.0))  # noqa: F821


def furred(points, u=0.0, k=0.06):
    for pt in points:
        part['paint'][pt] = fur(pt.co, u, k)
    return points


# --- the body: long and supple, deep at the chest, tucked up at the flank, round at the rump ---------------------------

def body_paint(p, i, s, u):
    return fur(p, u)


at = mark(part)  # noqa: F821
# From her rump along her back to her withers, and on up her neck into her head: one skin, bent with her spine.
BODY = [
    (-0.655, 0.800, 0.035, 0.045, 0.045),
    (-0.612, 0.800, 0.112, 0.142, 0.160),
    (-0.500, 0.800, 0.156, 0.182, 0.225),
    (-0.360, 0.802, 0.168, 0.190, 0.246),
    (-0.200, 0.806, 0.156, 0.182, 0.236),
    (-0.040, 0.812, 0.150, 0.178, 0.250),
    (0.120, 0.818, 0.156, 0.182, 0.288),
    (0.270, 0.826, 0.166, 0.182, 0.326),
    (0.380, 0.860, 0.164, 0.168, 0.312),
    (0.470, 0.915, 0.158, 0.150, 0.268),
    (0.550, 0.985, 0.152, 0.146, 0.218),
    (0.620, 1.050, 0.148, 0.152, 0.176),
    (0.690, 1.105, 0.142, 0.165, 0.142),
    (0.750, 1.145, 0.128, 0.150, 0.104),
]
loft(rows_of(BODY, 3), 28, body_paint, fluff=0.004, first=(V(-0.668, 0, 0.80), FUR),
     bulges=[(-0.39, 0.3, -22.0, 40.0, 0.2), (0.41, 0.2, -18.0, 36.0, 0.13)])
bind(arm, part, at, ['hips', 'body', 'chest', 'neck', 'head'], blend=0.12)  # noqa: F821

# --- the head: round, broad at the cheeks, a short blunt muzzle ---------------------------------------------------

def head_paint(p, i, s, u):
    return fur(p, u, 0.05)


at = mark(part)  # noqa: F821
head_rows = []
for x, z, w, ht, hb in finer(HEAD, 2):
    c = hp(x, 0, z)
    head_rows.append((c, w * HEAD_K, ht * HEAD_K, hb * HEAD_K))
loft(head_rows, 26, head_paint, fluff=0.002, grain=50.0, first=(hp(0.676, 0, 1.15), FUR), last=(hp(1.052, 0, 1.078), FUR),
     square=HEAD_SQUARE, upright=True)
# Her cheeks, the pads her whiskers grow from, and her chin.
for side in (1.0, -1.0):
    furred(lump(part, hp(1.006, 0.037 * side, 1.062), hs(0.046, 0.042, 0.036), 2, FUR), 0.3)  # noqa: F821
furred(lump(part, hp(0.992, 0, 1.026), hs(0.04, 0.044, 0.026), 2, FUR), -0.5)  # noqa: F821
# Her nose: small, a dark leather triangle, its point down.
nose_at = hp(1.047, 0, 1.092)
for pt in lump(part, nose_at, hs(0.013, 0.021, 0.014), 2, NOSE):  # noqa: F821
    below = smooth((nose_at.z - pt.co.z) / 0.015)
    pt.co.y *= 1.0 - 0.6 * below
# Her eyes: big, yellow-green, a tall dark pupil and a speck of light. Each is a ball set into her face, a little of it
# standing out between her lids; they look ahead and a little outwards. Only its front is made, finely, so that its
# pupil and the rings of its iris are drawn sharp.
EYE_RINGS = [3.0, 6.0, 9.0, 12.0, 15.0, 18.5, 22.0, 26.0, 30.0, 35.0, 41.0, 49.0, 60.0, 74.0]
for side in (1.0, -1.0):
    look, hinge, lid_up, inward, tall = eye_frame(side)
    centre = _eye(side, look)
    rings = []
    tones = []
    for a_deg in EYE_RINGS:
        a = math.radians(a_deg)
        ring = []
        ring_tones = []
        for j in range(24):
            b = TAU * j / 24.0
            wide = math.sin(a) * math.cos(b)
            high = math.sin(a) * math.sin(b)
            ring.append(centre + (look * math.cos(a) + inward * wide + tall * high) * EYE_R)
            colour = mix(IRIS_IN, IRIS, smooth((a_deg - 9.0) / 9.0))
            colour = mix(colour, IRIS_EDGE, smooth((a_deg - 20.0) / 12.0))
            colour = mix(colour, EYE_RIM, smooth((a_deg - 33.0) / 5.0))
            pupil = math.hypot(wide / math.sin(math.radians(12.5)), high / math.sin(math.radians(23.0)))
            ring_tones.append(mix(PUPIL, colour, smooth((pupil - 0.85) / 0.3)))
        rings.append(ring)
        tones.append(ring_tones)
    skin(part, rings, tones, first=(centre + look * EYE_R, PUPIL))  # noqa: F821
    # The speck of light: on the same side of both eyes, as from one light, up and towards the camera's side.
    glint = centre + (look * math.cos(math.radians(13.0)) + V(0, -1, 0) * 0.14 + tall * 0.2).normalized() * (EYE_R * 1.004)
    lump(part, glint, (0.0085, 0.0085, 0.0085), 1, SHINE)  # noqa: F821
    # Her lower lid: a rim under the eye, still, rising towards the eye's outer corner.
    look, hinge, lid_up, inward, tall = eye_frame(side, LOWER_SLANT)
    lower = []
    for i in range(6):
        a = math.radians(8.0 + (LID_SPAN - 8.0) * i / 5.0)
        ring = []
        for j in range(20):
            b = TAU * j / 20.0
            d = look * math.cos(a) + (hinge * math.cos(b) + lid_up * math.sin(b)) * math.sin(a)
            ring.append(centre + d * (EYE_R * 1.03))
        lower.append(ring)
    mark_lower = mark(part)  # noqa: F821
    skin(part, lower, [FUR] * len(lower), first=(centre + look * (EYE_R * 1.03), FUR))  # noqa: F821
    turn = Matrix.Translation(centre) @ Matrix.Rotation(math.radians(-LOWER_LID * side), 4, hinge) @ Matrix.Translation(-centre)  # noqa: F821
    for pt in list(part['paint'].keys())[mark_lower:]:
        pt.co = turn @ pt.co
# The dark of her mouth, inside her head where her jaw opens.
lump(part, hp(0.95, 0, 1.045), hs(0.07, 0.04, 0.016), 2, MOUTH)  # noqa: F821
# Her whiskers: four each side from the pads, and two over each eye.
for side in (1.0, -1.0):
    for k, (dx, dz, long) in enumerate(((0.18, 0.2, 0.2), (0.12, 0.08, 0.235), (0.08, -0.05, 0.225), (0.1, -0.18, 0.18))):
        root = hp(1.012, 0.06 * side, 1.07 + 0.012 * (1.5 - k))
        d = V(dx, side, dz).normalized()
        path = [root, root + d * (long * 0.5) + V(0, 0, 0.004), root + d * long + V(-0.012, 0, -0.012)]
        tube(part, path, [0.0038, 0.003, 0.0012], [WHISKER, WHISKER, WHISKER], 3)  # noqa: F821
    for k, (dx, long) in enumerate(((0.25, 0.075), (0.05, 0.06))):
        root = hp(0.925, (0.07 + 0.03 * k) * side, 1.238 - 0.012 * k)
        d = V(dx, 0.55 * side, 1.0).normalized()
        tube(part, [root, root + d * long], [0.003, 0.001], [WHISKER, WHISKER], 3)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# Her lower jaw, small, and her tongue in it.
at = mark(part)  # noqa: F821
JAW = [
    (0.830, 1.040, 0.070, 0.018, 0.034),
    (0.900, 1.036, 0.062, 0.016, 0.032),
    (0.960, 1.030, 0.046, 0.014, 0.026),
    (1.005, 1.026, 0.028, 0.012, 0.018),
]
loft([(hp(x, 0, z), w * HEAD_K, ht * HEAD_K, hb * HEAD_K) for x, z, w, ht, hb in JAW], 12, head_paint,
     first=(hp(0.82, 0, 1.04), FUR), last=(hp(1.02, 0, 1.026), FUR), upright=True)
lump(part, hp(0.975, 0, 1.042), hs(0.05, 0.022, 0.007), 2, TONGUE)  # noqa: F821
bind(arm, part, at, 'jaw')  # noqa: F821

# Her upper eyelids: each a shell over its eye, made shut and turned up out of the way, back into her head, so that at
# rest her eyes are open under the lid's rim, and a turn of the lid's bone down shuts them (LID_OPEN degrees).
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    look, hinge, lid_up, inward, tall = eye_frame(side)
    centre = _eye(side, look)
    lid_rings = []
    for i in range(8):
        a = math.radians(5.0 + (LID_SPAN - 5.0) * i / 7.0)
        ring = []
        for j in range(20):
            b = TAU * j / 20.0
            d = look * math.cos(a) + (hinge * math.cos(b) + lid_up * math.sin(b)) * math.sin(a)
            ring.append(centre + d * (EYE_R * 1.025))
        lid_rings.append(ring)
    at = mark(part)  # noqa: F821
    skin(part, lid_rings, [FUR] * len(lid_rings), first=(centre + look * (EYE_R * 1.025), FUR))  # noqa: F821
    turn = Matrix.Translation(centre) @ Matrix.Rotation(math.radians(LID_OPEN * side), 4, hinge) @ Matrix.Translation(-centre)  # noqa: F821
    for pt in list(part['paint'].keys())[at:]:
        pt.co = turn @ pt.co
    bind(arm, part, at, 'lid' + tag)  # noqa: F821

# --- her ears: upright triangles, broad at the base, cupped forwards and a little out ----------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    base = V(EAR_BASE.x, EAR_BASE.y * side, EAR_BASE.z - 0.02)
    tip = V(EAR_TIP.x, EAR_TIP.y * side, EAR_TIP.z)
    axis = (tip - base).normalized()
    front = V(0.74, 0.68 * side, 0.0)
    front = (front - axis * front.dot(axis)).normalized()
    across = axis.cross(front).normalized()
    rings = []
    tones = []
    steps = 9
    for k in range(steps):
        t = k / float(steps)
        c = base + (tip - base) * t
        wide = (0.112 * (1.0 - t) ** 0.8 + 0.01) * HEAD_K
        deep = (0.07 * (1.0 - t) + 0.01) * HEAD_K
        ring = []
        ring_tones = []
        for j in range(14):
            a = TAU * j / 14.0
            f = math.cos(a)
            g = math.sin(a)
            # The front is hollowed: a cup facing forward and a little out.
            cup = deep * (f if f < 0.0 else -0.45 * f)
            p = c + across * (wide * g) + front * cup
            ring.append(p)
            inner = smooth((f - 0.1) / 0.5) * smooth((1.0 - abs(g) - 0.12) / 0.3) * smooth((0.82 - t) / 0.2)
            ring_tones.append(mix(fur(p, 0.2, 0.04), EAR_IN, inner))
        rings.append(ring)
        tones.append(ring_tones)
    skin(part, rings, tones, None, (tip + axis * 0.012, FUR))  # noqa: F821
    bind(arm, part, at, 'ear' + tag, blend=0.03)  # noqa: F821

# --- her legs: slim and black, with neat round paws --------------------------------------------------------------------

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

    # The fore leg: its upper arm inside the skin of her chest, down and back to the elbow; then the forearm straight
    # down to the wrist, and the short pastern.
    path = polyline([S(0.43, 0.02, 0.78), S(0.375, 0.086, 0.51), S(0.39, FORE_Y, 0.15), S(FORE_BALL, FORE_Y, 0.05)], 3)
    radii = [0.09, 0.1, 0.1, 0.088, 0.077, 0.067, 0.059, 0.055, 0.052, 0.05]
    at = mark(part)  # noqa: F821
    tube(part, path, radii, [fur(p, 0.0) for p in path], 14, twist=0.0)  # noqa: F821
    bind(arm, part, at, ['chest', 'upperarm' + tag, 'forearm' + tag, 'hand' + tag], blend=0.07)  # noqa: F821
    # The fore paw.
    at = mark(part)  # noqa: F821
    furred(lump(part, S(0.468, FORE_Y, 0.036), (0.072, 0.054, 0.036), 2, FUR), 0.2)  # noqa: F821
    bind(arm, part, at, 'fpaw' + tag)  # noqa: F821

    # The hind leg: the thigh down and forward to the stifle, the shin back to the hock, the long foot.
    path = polyline([S(-0.43, 0.02, 0.80), S(-0.26, 0.112, 0.45), S(-0.52, HIND_Y, 0.23), S(HIND_BALL, HIND_Y, 0.05)], 3)
    radii = [0.11, 0.13, 0.132, 0.11, 0.09, 0.073, 0.059, 0.054, 0.051, 0.05]
    at = mark(part)  # noqa: F821
    tube(part, path, radii, [fur(p, 0.0) for p in path], 14, twist=0.0)  # noqa: F821
    bind(arm, part, at, ['hips', 'thigh' + tag, 'shin' + tag, 'foot' + tag], blend=0.07)  # noqa: F821
    at = mark(part)  # noqa: F821
    furred(lump(part, S(-0.432, HIND_Y, 0.036), (0.074, 0.054, 0.036), 2, FUR), 0.2)  # noqa: F821
    bind(arm, part, at, 'hpaw' + tag)  # noqa: F821

# --- her tail: long and slender, a little thicker at its root, its tip round ------------------------------------------
TAIL = []
for i in range(len(TAIL_REST) - 1):
    for s in range(3):
        TAIL.append(TAIL_REST[i] + (TAIL_REST[i + 1] - TAIL_REST[i]) * (s / 3.0))
TAIL.append(TAIL_REST[-1])
TAIL_R = [lerp(0.064, 0.042, smooth(i / 5.0)) if i < 5 else lerp(0.042, 0.034, (i - 5) / float(len(TAIL) - 6)) for i in range(len(TAIL))]
TAIL_R[-1] = 0.027


def tail_paint(p, i, s, u):
    return fur(p, u, 0.06)


at = mark(part)  # noqa: F821
loft([(c, r, r, r) for c, r in zip(TAIL, TAIL_R)], 12, tail_paint, fluff=0.003, first=(TAIL[0] + V(0.03, 0, 0), FUR),
     last=(TAIL[-1] + (TAIL[-1] - TAIL[-2]).normalized() * 0.03, FUR))
bind(arm, part, at, ['tail%d' % (i + 1) for i in range(6)], blend=0.08)  # noqa: F821

skinned(arm, part, 'sickan-kropp', strength=0.3, reach=0.14, floor=0.0)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def fore(tag, x, lift=0.0, fold=0.0, dz=0.0, y=None, roll=0.0):
    """A fore foot: its ball at x, lifted `lift`; folded back at the wrist by `fold` (0 to 1), as it is in a stride;
    `roll` lifts its wrist as it rolls off its toes at the end of a step."""
    y = (FORE_Y if tag == '.L' else -FORE_Y) if y is None else y
    w = V(x - 0.05, y, 0.15 + lift + dz + 0.06 * roll)
    b = w + V(lerp(0.05, -0.055, fold) + 0.03 * roll, 0, lerp(-0.115, -0.10, fold) - 0.06 * roll)
    t = b + V(lerp(0.085, -0.03, fold), 0, lerp(-0.015, -0.08, fold))
    return {'wrist_ik' + tag: {'at': tuple(w)}, 'fball_ik' + tag: {'at': tuple(b)}, 'ftoe_ik' + tag: {'at': tuple(t)},
            'upperarm' + tag: (0, 0, 0), 'forearm' + tag: {'con': 1.0, 'rot': (0, 0, 0)},
            'hand' + tag: {'con': 1.0, 'rot': (0, 0, 0)}, 'fpaw' + tag: {'con': 1.0, 'rot': (0, 0, 0)}}


def hind(tag, x, lift=0.0, fold=0.0, dz=0.0, y=None, roll=0.0):
    """A hind foot: its ball at x, lifted `lift`, its toes hanging by `fold`; `roll` lifts its hock at a step's end."""
    y = (HIND_Y if tag == '.L' else -HIND_Y) if y is None else y
    h = V(x - 0.06, y, 0.23 + lift + dz + 0.06 * roll)
    b = h + V(lerp(0.06, 0.02, fold) + 0.03 * roll, 0, lerp(-0.195, -0.19, fold) - 0.06 * roll)
    t = b + V(lerp(0.085, 0.02, fold), 0, lerp(-0.015, -0.085, fold))
    return {'hock_ik' + tag: {'at': tuple(h)}, 'hball_ik' + tag: {'at': tuple(b)}, 'htoe_ik' + tag: {'at': tuple(t)},
            'thigh' + tag: (0, 0, 0), 'shin' + tag: {'con': 1.0, 'rot': (0, 0, 0)},
            'foot' + tag: {'con': 1.0, 'rot': (0, 0, 0)}, 'hpaw' + tag: {'con': 1.0, 'rot': (0, 0, 0)}}


def standing(spread=0.0):
    return over(fore('.L', FORE_BALL + spread), fore('.R', FORE_BALL + spread), hind('.L', HIND_BALL - spread), hind('.R', HIND_BALL - spread))


CENTRE = {'root': (0, 0, 0), 'hips': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'body': (0, 0, 0), 'chest': {'rot': (0, 0, 0), 'loc': (0, 0, 0)},
          'neck': (0, 0, 0), 'head': (0, 0, 0), 'jaw': (0, 0, 0), 'ear.L': (0, 0, 0), 'lid.L': (0, 0, 0),
          'tail1': (0, 0, 0), 'tail2': (0, 0, 0), 'tail3': (0, 0, 0), 'tail4': (0, 0, 0), 'tail5': (0, 0, 0), 'tail6': (0, 0, 0)}


def tail(dirs, of='hips', sway=0.0):
    """Her tail, each bone pointing its way (as her hips are turned, if `of`), swung to her side by `sway`."""
    out = {}
    for i, d in enumerate(dirs):
        d = V(d[0], d[1] + sway * (i + 1) / 6.0, d[2])
        out['tail%d' % (i + 1)] = sag(tuple(d), {'of': of} if of else None)
    return out


def tail_round(dirs):
    """Her tail lying in a curl on the ground: each bone pointing its way, none twisted against the one before it."""
    return {'tail%d' % (i + 1): {'dir': tuple(V(*d).normalized()), 'up': (0.0, 0.0, -1.0)} for i, d in enumerate(dirs)}


# Up, with a hook at its tip: a cat that is glad to see someone. Low and easy. And streaming behind a leap.
TAIL_UP = [(-0.5, 0, 0.87), (-0.26, 0, 0.97), (-0.08, 0, 1.0), (0.06, 0, 1.0), (0.34, 0, 0.94), (0.72, 0, 0.69)]
TAIL_LOW = [(-0.8, 0, -0.6), (-0.76, 0, -0.65), (-0.84, 0, -0.54), (-0.94, 0, -0.34), (-0.99, 0, -0.08), (-0.94, 0, 0.34)]
TAIL_BACK = [(-0.94, 0, 0.34), (-0.98, 0, 0.2), (-1.0, 0, 0.08), (-1.0, 0, 0.0), (-0.99, 0, 0.1), (-0.95, 0, 0.3)]


def lids(shut):
    """Her lids, from 0 (open) to 1 (shut)."""
    return {'lid.L': (-LID_OPEN * shut, 0, 0)}


def stand(extra=None):
    return over(CENTRE, standing(), tail(TAIL_LOW), extra or {})


# --- walk and trot -----------------------------------------------------------------------------------------------------

def gait(name, frames, stride, duty, lift, offsets, bob, nod, sway, lean=0.0):
    """A loop of one stride: each foot on the ground for `duty` of it, going back as far as the stride carries the
    body, then lifted and brought forward, folding at the wrist. The body rises and falls with each footfall, her
    shoulders and hips roll against each other, her head is held still against it all, and her tail is up, its hook
    swaying."""
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
                roll = smooth((q / duty - 0.72) / 0.28)
            else:
                s = (q - duty) / (1.0 - duty)
                dx = -reach + 2.0 * reach * smooth(s)
                up = lift * math.sin(math.pi * s)
                fold = math.sin(math.pi * min(1.0, s * 1.15)) ** 0.8
                roll = 1.0 - smooth(s / 0.25)
            if leg.startswith('fore'):
                pose.update(fore(tag, FORE_BALL + 0.06 + dx, up, fold, roll=roll))
            else:
                pose.update(hind(tag, HIND_BALL + dx, up * 0.85, fold * 0.7, roll=roll))
        beats = 2
        wave = math.cos(TAU * beats * p)
        side = math.sin(TAU * p)
        pose.update({
            'root': (0, 0, 0),
            'hips': {'loc': (0, 0, -bob * wave - 0.03), 'rot': (0.8 * wave + lean, 3.0 * side, 2.5 * side)},
            'body': (0, -1.5 * side, -2.0 * side), 'chest': {'rot': (-0.8 * wave - lean * 0.5, -3.0 * side, -2.5 * side), 'loc': (0, 0, 0)},
            'neck': (nod * wave - lean * 0.5 + 4, 0, 1.0 * side), 'head': (-nod * wave - 6, 1.5 * side, 1.0 * side), 'jaw': (0, 0, 0),
            'ear.L': (-5, 0, 0), 'lid.L': (0, 0, 0),
        })
        pose.update(tail(TAIL_UP, sway=sway * math.sin(TAU * p - 0.8)))
        pose['tail6'] = sag((0.72, sway * math.sin(TAU * p - 1.8), 0.69), {'of': 'hips'})
        keys.append((f, pose))
    clip(arm, name, frames, keys)  # noqa: F821


gait('walk', 24, WALK_STRIDE, 0.62, 0.075, {'hind.L': 0.0, 'fore.L': 0.25, 'hind.R': 0.5, 'fore.R': 0.75}, 0.008, 2.5, 0.16)
gait('trot', 16, TROT_STRIDE, 0.4, 0.12, {'fore.L': 0.0, 'hind.R': 0.0, 'fore.R': 0.5, 'hind.L': 0.5}, 0.018, 2.0, 0.1, lean=-2.0)

# --- standing: her tail low and easy, swaying; an ear turns ------------------------------------------------------------

def stood(swing=0.0, breathe=0.0, extra=None):
    return stand(over({'chest': {'rot': (0, 0, 0), 'loc': (0, 0, 0.004 * breathe)}, 'neck': (6, 0, 0), 'head': (-6, 0, 0)},
                      tail(TAIL_LOW, sway=swing), extra or {}))


clip(arm, 'stand', 96, [  # noqa: F821
    (0, stood(0.0)),
    (16, stood(0.3, 1.0)),
    (32, stood(0.0, 0.3)),
    (40, stood(-0.2, 0.0, {'ear.L': (0, 0, 0), 'ear.R': (6, -22, 0)})),
    (46, stood(-0.3, 0.3, {'ear.R': (0, 0, 0)})),
    (64, stood(0.0, 1.0)),
    (80, stood(0.2, 0.4)),
])

# --- sitting -----------------------------------------------------------------------------------------------------------
# Upright on her haunches, her fore legs straight under her chest, her hind feet flat under her, her back rounded, and
# her tail lying round her feet on her right, its tip in front of her paws.

TAIL_ROUND = [(-0.42, -0.5, -0.76), (-0.05, -0.99, -0.12), (0.62, -0.78, -0.02), (0.96, -0.28, 0.0), (0.99, 0.12, 0.0), (0.9, 0.42, 0.06)]


def sit_hind(tag):
    """A hind foot flat on the ground, pointing forward, its hock down by the rump."""
    y = 0.135 if tag == '.L' else -0.135
    return {'hock_ik' + tag: {'at': (-0.31, y, 0.06)}, 'hball_ik' + tag: {'at': (-0.115, y, 0.036)},
            'htoe_ik' + tag: {'at': (-0.03, y, 0.02)}, 'thigh' + tag: (0, 0, 0), 'shin' + tag: {'con': 1.0, 'rot': (0, 0, 0)},
            'foot' + tag: {'con': 1.0, 'rot': (0, 0, 0)}, 'hpaw' + tag: {'con': 1.0, 'rot': (0, 0, 0)}}


def sitting(extra=None, breathe=0.0, tip=None):
    pose = over(CENTRE, {
        'hips': {'loc': (0, 0.14, -0.545), 'rot': (62, 0, 0)},
        'body': (-20, 0, 0), 'chest': {'rot': (-21, 0, 0), 'loc': (0, 0, 0.005 * breathe)},
        'neck': sag((0.52, 0, 0.85)), 'head': sag((1.0, 0, -0.08)),
    }, tail_round(TAIL_ROUND), fore('.L', 0.385, y=0.07), fore('.R', 0.385, y=-0.07), sit_hind('.L'), sit_hind('.R'))
    if tip is not None:
        pose.update(tail_round(TAIL_ROUND[:4] + [(0.99, 0.12, tip * 0.5), (0.9, 0.42, 0.06 + tip)]))
    return over(pose, extra or {})


SLEEPY = 0.0
clip(arm, 'sit', 192, [  # noqa: F821
    (0, sitting()),
    (24, sitting(breathe=1.0)),
    (40, sitting({'ear.L': (0, 0, 0), 'ear.R': (8, -26, 0)}, 0.5)),
    (45, sitting({'ear.R': (0, 0, 0)}, 0.3)),
    (56, sitting()),
    (80, sitting(breathe=1.0)),
    # The tip of her tail lifts and taps, twice.
    (92, sitting(breathe=0.6, tip=0.0)),
    (97, sitting(breathe=0.4, tip=0.5)),
    (102, sitting(breathe=0.3, tip=0.02)),
    (107, sitting(breathe=0.2, tip=0.4)),
    (113, sitting(tip=0.0)),
    (136, sitting(breathe=1.0)),
    # A slow blink.
    (146, sitting(lids(0.0), 0.6)),
    (156, sitting(lids(1.0), 0.3)),
    (164, sitting(lids(1.0), 0.1)),
    (176, sitting(lids(0.0))),
])

# --- greeting him: a slow blink, her head a little on one side, the tip of her tail curling up ------------------------
GREET = 60
clip(arm, 'greet', GREET, [  # noqa: F821
    (0, sitting()),
    (8, sitting(over(lids(0.25), {'head': {'dir': (1.0, 0, -0.06), 'up': (0.0, -0.12, 0.99)}}), 0.5, tip=0.25)),
    (18, sitting(over(lids(1.0), {'head': {'dir': (1.0, 0, -0.03), 'up': (0.0, -0.2, 0.98)}, 'ear.L': (-4, 0, 0)}), 1.0, tip=0.6)),
    (28, sitting(over(lids(1.0), {'head': {'dir': (1.0, 0, -0.03), 'up': (0.0, -0.2, 0.98)}, 'ear.L': (-4, 0, 0)}), 0.8, tip=0.7)),
    (42, sitting(over(lids(0.0), {'head': {'dir': (1.0, 0, -0.06), 'up': (0.0, -0.1, 0.99)}}), 0.4, tip=0.3)),
    (GREET, sitting()),
], loop=False)

# --- washing: she licks her right fore paw (the camera's side) and wipes it over her ear and her face ------------------

def paw_up(wrist, ball, toe):
    return {'wrist_ik.R': {'at': wrist}, 'fball_ik.R': {'at': ball}, 'ftoe_ik.R': {'at': toe}}


def licking(dip, extra=None):
    """Her head down over her lifted paw, her tongue at it."""
    return sitting(over(paw_up((0.50, -0.075, 0.80), (0.555, -0.05, 0.875), (0.585, -0.035, 0.95)), {
        'neck': sag((0.62, -0.12, 0.78)), 'head': {'dir': tuple(V(0.72, -0.1, -0.68 - dip).normalized()), 'up': (0.68, 0.1, 0.73)},
        'jaw': (-9 - 60 * dip, 0, 0), 'ear.L': (6, 0, 0), 'lid.L': (-LID_OPEN * 0.45, 0, 0),
    }, extra or {}), 0.5)


def wiping(k, extra=None):
    """Her paw up over her right ear, drawn forward and down over her face as k goes from 0 to 1."""
    w = lerp(V(0.47, -0.16, 1.02), V(0.56, -0.12, 0.9), k)
    return sitting(over(paw_up(tuple(w), tuple(w + V(0.07, 0.03, 0.09)), tuple(w + V(0.12, 0.07, 0.15))), {
        'neck': sag((0.5, -0.1, 0.86)),
        'head': {'dir': tuple(V(0.86, -0.12, -0.5 - 0.15 * k).normalized()), 'up': (0.5, -0.32 + 0.1 * k, 0.8)},
        'ear.R': (24 - 14 * k, 0, 0), 'lid.L': (-LID_OPEN * 0.8, 0, 0),
    }, extra or {}), 0.5)


WASH = 120
clip(arm, 'wash', WASH, [  # noqa: F821
    (0, sitting()),
    (10, licking(0.0)),
    (15, licking(0.14)),
    (20, licking(0.0)),
    (25, licking(0.14)),
    (30, licking(0.0)),
    (35, licking(0.14)),
    (40, licking(0.02)),
    (50, wiping(0.0)),
    (58, wiping(1.0)),
    (64, licking(0.1)),
    (69, licking(0.0)),
    (78, wiping(0.0)),
    (86, wiping(1.0)),
    (94, licking(0.08)),
    (106, sitting(lids(0.3))),
])

# --- crouched low under shelter: her fore paws out in front of her, her tail tight along her side --------------------
TAIL_TIGHT = [(-0.3, -0.62, -0.72), (0.2, -0.97, -0.1), (0.8, -0.6, 0.0), (0.99, -0.12, 0.0), (0.99, 0.1, 0.0), (0.97, 0.22, 0.04)]


def crouching(extra=None, breathe=0.0, low=0.0, tip=0.0):
    y = 0.135
    pose = over(CENTRE, {
        'hips': {'loc': (0, 0.05, -0.44 - 0.03 * low), 'rot': (5, 0, 0)},
        'body': (-3, 0, 0), 'chest': {'rot': (-5, 0, 0), 'loc': (0, 0, 0.004 * breathe)},
        'neck': sag((0.86, 0, 0.5 - 0.3 * low)), 'head': sag((1.0, 0, -0.12 - 0.1 * low)),
    }, tail_round(TAIL_TIGHT[:5] + [(0.97, 0.22, 0.04 + tip)]))
    for tag, side in (('.L', 1.0), ('.R', -1.0)):
        # Her forearms flat on the ground in front of her, as a sphinx lies.
        pose.update(fore(tag, 0.9, y=0.08 * side))
        pose.update({'wrist_ik' + tag: {'at': (0.825, 0.08 * side, 0.062)}, 'fball_ik' + tag: {'at': (0.9, 0.08 * side, 0.036)},
                     'ftoe_ik' + tag: {'at': (0.985, 0.08 * side, 0.02)}})
        pose.update(sit_hind(tag))
        pose.update({'hock_ik' + tag: {'at': (-0.45, y * side, 0.06)}, 'hball_ik' + tag: {'at': (-0.255, y * side, 0.036)},
                     'htoe_ik' + tag: {'at': (-0.17, y * side, 0.02)}})
    return over(pose, extra or {})


clip(arm, 'crouch', 144, [  # noqa: F821
    (0, crouching()),
    (24, crouching(breathe=1.0)),
    (36, crouching({'ear.L': (4, 20, 0), 'ear.R': (0, 0, 0)}, 0.6)),
    (48, crouching({'ear.L': (4, 20, 0), 'ear.R': (6, -24, 0)}, 0.0)),
    (60, crouching({'ear.L': (0, 0, 0), 'ear.R': (6, -24, 0)}, 0.5)),
    (72, crouching(breathe=1.0)),
    (84, crouching(lids(0.0), 0.5, tip=0.0)),
    (88, crouching(lids(1.0), 0.4, tip=0.3)),
    (92, crouching(lids(0.0), 0.3, tip=0.0)),
    (96, crouching(tip=0.3)),
    (101, crouching(tip=0.0)),
    (120, crouching(breathe=1.0)),
])

# --- the stretch: up from sitting into a long bow, and up to stand -----------------------------------------------------
STRETCH = 56


def bowing(deep, extra=None):
    """Her chest down between her fore paws, far out in front of her; her rump and her tail high."""
    pose = over(CENTRE, {
        'hips': {'loc': (0, -0.07, 0.02), 'rot': (-22 - 8 * deep, 0, 0)},
        'body': (4, 0, 0), 'chest': {'rot': (8, 0, 0), 'loc': (0, 0, 0)},
        'neck': sag((0.78, 0, 0.62)), 'head': sag((1.0, 0, 0.26)), 'ear.L': (10, 0, 0), 'lid.L': (-LID_OPEN * 0.7 * deep, 0, 0),
    }, tail([(-0.62, 0, 0.78), (-0.5, 0, 0.87), (-0.32, 0, 0.95), (-0.1, 0, 1.0), (0.2, 0, 0.98), (0.55, 0, 0.83)], of=None),
        hind('.L', HIND_BALL - 0.02), hind('.R', HIND_BALL - 0.02))
    for tag, side in (('.L', 1.0), ('.R', -1.0)):
        x = 0.74 + 0.05 * deep
        pose.update(fore(tag, x, y=0.085 * side))
        pose.update({'wrist_ik' + tag: {'at': (x - 0.075, 0.085 * side, 0.07)}, 'fball_ik' + tag: {'at': (x, 0.085 * side, 0.036)},
                     'ftoe_ik' + tag: {'at': (x + 0.085, 0.085 * side, 0.022)}})
    return over(pose, extra or {})


clip(arm, 'stretch', STRETCH, [  # noqa: F821
    (0, sitting()),
    # Up off her haunches, her fore paws walking out.
    (8, over(stand(), {'hips': {'loc': (0, 0.02, -0.16), 'rot': (14, 0, 0)}, 'neck': sag((0.6, 0, 0.8)), 'head': sag((1.0, 0, 0.0))},
             fore('.L', 0.56), fore('.R', 0.5), hind('.L', HIND_BALL + 0.06), hind('.R', HIND_BALL + 0.02))),
    (17, bowing(0.3)),
    (24, bowing(1.0)),
    (34, bowing(0.9, {'tail6': sag((0.75, 0.1, 0.65))})),
    # And up, forward over her fore paws, into a stand.
    (44, over(stand(), {'hips': {'loc': (0, 0.07, -0.01), 'rot': (-5, 0, 0)}, 'neck': sag((0.72, 0, 0.7)), 'head': sag((1.0, 0, 0.05))},
              fore('.L', FORE_BALL + 0.1), fore('.R', FORE_BALL + 0.08), tail(TAIL_BACK))),
    (STRETCH, stood()),
], loop=False)

# --- shaking the rain off: from her head down her back to the tip of her tail ----------------------------------------
SHAKE = 34


def shaking(f):
    """Her twist at frame f: it starts at her head and runs back along her, each part a beat behind the one before."""
    def twist(lag, most):
        t = f - lag
        gain = smooth(t / 3.0) * (1.0 - smooth((t - 15.0) / 7.0))
        return most * gain * math.sin(TAU * t / 5.0)
    return stand(over({
        'hips': {'loc': (0, 0, -0.03), 'rot': (0, twist(6, 9), 0)},
        'body': (0, twist(4, 12), 0), 'chest': {'rot': (-3, twist(3, 14), 0), 'loc': (0, 0, 0)},
        'neck': (-4, twist(1, 20), 0), 'head': (-8, twist(0, 30), 0),
        'ear.L': (14, 0, twist(0, 20)), 'ear.R': (14, 0, twist(0, 20)), 'lid.L': (-LID_OPEN * 0.9 * smooth(f / 3.0) * (1.0 - smooth((f - 20.0) / 6.0)), 0, 0),
    }, tail([(-0.9, 0, -0.1), (-0.95, 0, 0.0), (-0.99, 0, 0.05), (-1.0, 0, 0.05), (-0.99, 0, 0.1), (-0.95, 0, 0.3)], sway=twist(8, 0.9)),
        fore('.L', FORE_BALL + 0.03, y=0.1), fore('.R', FORE_BALL + 0.03, y=-0.1), hind('.L', HIND_BALL - 0.02, y=0.1), hind('.R', HIND_BALL - 0.02, y=-0.1)))


clip(arm, 'shake', SHAKE, [(0, stood())] + [(f, shaking(f - 2)) for f in range(3, 30)] + [(SHAKE, stood())], loop=False)  # noqa: F821

# --- the leap: a crouch, the push, the flight with her fore legs reaching, and the landing ----------------------------
FK = {'con': 0.0}


def fly_legs(fore_dirs, hind_dirs):
    """Legs off the ground, posed by the way each bone points as her hips are turned (the IK let go). None: that pair
    is left as it is posed."""
    out = {}
    turned = {'con': 0.0, 'of': 'hips'}
    for tag in ('.L', '.R'):
        if fore_dirs is not None:
            out['upperarm' + tag] = sag(fore_dirs[0], {'of': 'hips'})
            out['forearm' + tag] = sag(fore_dirs[1], turned)
            out['hand' + tag] = sag(fore_dirs[2], turned)
            out['fpaw' + tag] = sag(fore_dirs[3], turned)
        if hind_dirs is not None:
            out['thigh' + tag] = sag(hind_dirs[0], {'of': 'hips'})
            out['shin' + tag] = sag(hind_dirs[1], turned)
            out['foot' + tag] = sag(hind_dirs[2], turned)
            out['hpaw' + tag] = sag(hind_dirs[3], turned)
    return out


clip(arm, 'jump', JUMP_FRAMES, [  # noqa: F821
    (0, stood()),
    # The crouch: down at the back, her hind feet under her, her eyes on where she will land.
    (5, over(stand(), {'hips': {'loc': (0, -0.04, -0.2), 'rot': (9, 0, 0)}, 'body': (-4, 0, 0), 'chest': {'rot': (-8, 0, 0), 'loc': (0, 0, 0)},
                       'neck': sag((0.8, 0, 0.6)), 'head': sag((1.0, 0, -0.05)), 'ear.L': (-8, 0, 0)},
             tail(TAIL_BACK), hind('.L', HIND_BALL + 0.16), hind('.R', HIND_BALL + 0.16), fore('.L', FORE_BALL + 0.03), fore('.R', FORE_BALL + 0.03))),
    # The push: long, her hind legs straight out behind her, her fore legs coming up.
    (JUMP_LIFT, over(CENTRE, {'hips': {'loc': (0, 0.1, 0.04), 'rot': (30, 0, 0)}, 'body': (-3, 0, 0), 'chest': {'rot': (-5, 0, 0), 'loc': (0, 0, 0)},
                              'neck': sag((0.92, 0, 0.4)), 'head': sag((1.0, 0, 0.1)), 'ear.L': (-10, 0, 0)},
                     tail([(-0.9, 0, 0.44), (-0.97, 0, 0.26), (-1.0, 0, 0.1), (-1.0, 0, 0.0), (-0.99, 0, 0.1), (-0.96, 0, 0.26)]),
                     fly_legs([(0.82, 0, -0.57), (0.94, 0, -0.34), (0.98, 0, -0.2), (1.0, 0, -0.05)],
                              [(-0.42, 0, -0.91), (-0.8, 0, -0.6), (-0.66, 0, -0.75), (-0.3, 0, -0.95)]))),
    # In the air: stretched out, her fore paws reaching, her hind legs trailing.
    (15, over(CENTRE, {'hips': {'loc': (0, 0.06, 0.02), 'rot': (5, 0, 0)}, 'body': (2, 0, 0), 'chest': {'rot': (2, 0, 0), 'loc': (0, 0, 0)},
                       'neck': sag((0.9, 0, 0.42)), 'head': sag((1.0, 0, -0.12)), 'ear.L': (-6, 0, 0)},
              tail([(-0.97, 0, 0.24), (-1.0, 0, 0.1), (-1.0, 0, 0.0), (-0.99, 0, 0.1), (-0.97, 0, 0.25), (-0.9, 0, 0.44)]),
              fly_legs([(0.72, 0, -0.69), (0.92, 0, -0.39), (0.9, 0, -0.44), (0.94, 0, -0.34)],
                       [(-0.6, 0, -0.8), (-0.95, 0, -0.3), (-0.97, 0, -0.22), (-0.92, 0, -0.38)]))),
    # Coming down: nose and fore paws first, her hind legs gathering under her.
    (21, over(CENTRE, {'hips': {'loc': (0, 0.02, 0.0), 'rot': (-20, 0, 0)}, 'body': (4, 0, 0), 'chest': {'rot': (4, 0, 0), 'loc': (0, 0, 0)},
                       'neck': sag((0.86, 0, 0.5)), 'head': sag((1.0, 0, -0.1)), 'ear.L': (-4, 0, 0)},
              tail([(-0.86, 0, 0.5), (-0.8, 0, 0.6), (-0.76, 0, 0.65), (-0.8, 0, 0.6), (-0.86, 0, 0.5), (-0.92, 0, 0.38)]),
              fly_legs([(0.5, 0, -0.87), (0.7, 0, -0.71), (0.6, 0, -0.8), (0.82, 0, -0.57)],
                       [(-0.05, 0, -1.0), (-0.8, 0, -0.6), (-0.5, 0, -0.87), (-0.05, 0, -1.0)]))),
    # Her fore paws down, taking her weight; her hind feet coming in under her.
    (JUMP_LAND, over(CENTRE, {'hips': {'loc': (0, 0.0, -0.05), 'rot': (-12, 0, 0)}, 'body': (5, 0, 0), 'chest': {'rot': (2, 0, 0), 'loc': (0, 0, 0)},
                              'neck': sag((0.8, 0, 0.6)), 'head': sag((1.0, 0, -0.08))},
                     tail([(-0.8, 0, 0.6), (-0.7, 0, 0.71), (-0.66, 0, 0.75), (-0.7, 0, 0.71), (-0.8, 0, 0.6), (-0.9, 0, 0.44)]),
                     fore('.L', FORE_BALL + 0.07), fore('.R', FORE_BALL + 0.03),
                     fly_legs(None, [(0.3, 0, -0.95), (-0.7, 0, -0.71), (-0.25, 0, -0.97), (0.45, 0, -0.89)]))),
    # Down on all four, low, and up.
    (28, over(stand(), {'hips': {'loc': (0, 0.02, -0.12), 'rot': (3, 0, 0)}, 'neck': sag((0.78, 0, 0.62)), 'head': sag((1.0, 0, -0.05))},
              tail(TAIL_BACK), hind('.L', HIND_BALL + 0.08), hind('.R', HIND_BALL + 0.05), fore('.L', FORE_BALL + 0.05), fore('.R', FORE_BALL + 0.02))),
    (JUMP_FRAMES, stood()),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'sickan': {
    'walk': [0, 6, 12, 18], 'trot': [0, 4, 8, 12], 'stand': [0, 40], 'sit': [0, 40, 97, 160], 'greet': [0, 18, 28],
    'wash': [0, 15, 35, 50, 58], 'crouch': [0, 48, 88], 'stretch': [0, 8, 17, 24, 44, 56], 'shake': [0, 6, 9, 12, 20],
    'jump': [0, 5, 8, 15, 21, 24, 28, 36],
}}
