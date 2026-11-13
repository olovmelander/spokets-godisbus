"""The beaver of Alven (Aventyr 2, src/content/aventyr2/beaver.ts): one animal with bones, that sits on the bank gnawing a
birch stick, looks up at Elof, thumps its tail, drops onto all fours and waddles into its lodge with the stick in its
teeth, rises on the lodge's top, and swims out over the lake, slaps the water with its tail and dives. Made with
art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/beaver.py --out=art/baked/aventyr2/beaver.glb
    node scripts/bake/blender-kit.mjs art/blender/beaver.py --fast --preview=<folder>    (stills of every clip)

Units: 1 Blender unit is 1 EL; Z is up, the beaver faces +X, and the camera's side is -Y (its right: the '.R' bones). Its
origin is on the ground under its middle as it sits, as the kit's old beaver (art/blender/a2-creatures.py, `baver`) had
it, and it is as big: 1.85 EL tall sitting up, with a tail 1.4 EL long. The game turns it a quarter round so that it
faces the camera as the old one did (src/content/aventyr2/river-creatures.ts).

Its rest pose is the beaver sitting up on its haunches, the stick across its paws at its teeth. It is one mesh with its
colours on its corners, skinned to its bones: its body bends smoothly along its back; its big webbed hind feet, its
small hands, its head, its jaw and its stick go each with their own bone, and its flat scaly tail bends along three.
The stick is held in its hands (its arms reach for it), or in its teeth (it goes with the head), or put away.
The clips, each named 'beaver:<clip>':
    gnaw     sitting, turning the stick in its hands in steps, its teeth working at the bark between      (loop)
    look     sitting up taller, the stick lowered, ears up, sniffing; the game turns its head to him     (loop)
    thump    the tail lifted high and slapped down on the ground (it hits at THUMP_HIT seconds)           (once)
    waddle   one stride on all fours, rocking, the stick in its teeth; the game turns it by distance    (loop)
    rise     from crouching nose-first to standing up tall on its hind feet, sniffing                    (once)
    swim     low in the water, its hind feet paddling in turn, its tail a rudder, its head up          (loop)
    slap     swimming, the tail up and down flat on the water (it hits at SLAP_HIT seconds)              (once)
    dive     head down, back arched, the tail flipped up and under                                       (once)
In the water clips its origin is at the water's surface. Nothing in it comes from anyone else, and it has no
texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

FUR = tone('#6f4b2f')          # noqa: F821 (kit-tools.py)
FUR_DARK = tone('#45301e')     # noqa: F821
FUR_TIP = tone('#9a7550')      # noqa: F821
BELLY = tone('#8f6a47')        # noqa: F821
MUZZLE = tone('#a5835e')       # noqa: F821
CHEEK = tone('#7d5a3b')        # noqa: F821
NOSE = tone('#1d1612')         # noqa: F821
EYE = tone('#0f0b09')          # noqa: F821
SHINE = tone('#eef0f2')        # noqa: F821
EAR = tone('#3a2818')          # noqa: F821
TOOTH = tone('#e2862a')        # noqa: F821
TOOTH_EDGE = tone('#f2b45c')   # noqa: F821
HAND = tone('#2f2620')         # noqa: F821
CLAW = tone('#5a4c40')         # noqa: F821
FOOT = tone('#2e2620')         # noqa: F821
WEB = tone('#4a3d33')          # noqa: F821
SCALE = tone('#2f2a27')        # noqa: F821
SCALE_LIGHT = tone('#45403b')  # noqa: F821
SCALE_DARK = tone('#211d1b')   # noqa: F821
WHISKER = tone('#d6cec0')      # noqa: F821
BIRCH = tone('#e6e2d6')        # noqa: F821
BIRCH_SHADE = tone('#c4bcae')  # noqa: F821
BIRCH_MARK = tone('#2e2a26')   # noqa: F821
WOOD = tone('#e8cc98')         # noqa: F821

THUMP_HIT = 12 / 24.0
SLAP_HIT = 8 / 24.0
WADDLE_STRIDE = 0.8


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def V(x, y, z):
    return Vector((x, y, z))


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


# --- bones -------------------------------------------------------------------------------------------------------------
HEEL = V(-0.06, 0.42, 0.1)
BALL = V(0.38, 0.44, 0.05)
UP = V(0, 0, 0.1)
STICK = V(0.66, 0.0, 1.13)
GRIP = V(0.6, 0.22, 1.09)

BONES = [
    ('root', None, (0, 0, 0), (0.25, 0, 0), {'deform': False}),
    ('hips', 'root', (-0.3, 0, 0.2), (-0.1, 0, 0.6)),
    ('spine', 'hips', (-0.1, 0, 0.6), (-0.03, 0, 0.9), {'connect': True}),
    ('chest', 'spine', (-0.03, 0, 0.9), (0.05, 0, 1.18), {'connect': True}),
    ('neck', 'chest', (0.05, 0, 1.18), (0.13, 0, 1.4), {'connect': True}),
    ('head', 'neck', (0.13, 0, 1.4), (0.68, 0, 1.44), {'connect': True}),
    ('jaw', 'head', (0.34, 0, 1.36), (0.6, 0, 1.28)),
    ('ear.L', 'head', (0.05, 0.25, 1.68), (0.04, 0.3, 1.8)),
    ('stick', 'chest', tuple(STICK), tuple(STICK + V(0, 0.3, 0)), {'deform': False}),
    ('stick.wood', 'stick', tuple(STICK), tuple(STICK + V(0, 0.3, 0))),
    ('stick.mouth', 'head', tuple(STICK), tuple(STICK + V(0, 0.3, 0)), {'ctrl': True}),
    ('grip.L', 'stick.wood', tuple(GRIP), tuple(GRIP + UP), {'ctrl': True}),
    ('paw_ik.L', None, tuple(GRIP), tuple(GRIP + UP), {'ctrl': True}),
    ('upper_arm.L', 'chest', (0.14, 0.33, 1.1), (0.36, 0.37, 0.95)),
    ('forearm.L', 'upper_arm.L', (0.36, 0.37, 0.95), tuple(GRIP), {'connect': True, 'ik': ('paw_ik.L', 2)}),
    ('hand.L', 'forearm.L', tuple(GRIP), (0.68, 0.2, 1.12), {'connect': True}),
    ('thigh.L', 'hips', (-0.16, 0.34, 0.44), (0.16, 0.42, 0.3)),
    ('shin.L', 'thigh.L', (0.16, 0.42, 0.3), tuple(HEEL), {'connect': True, 'ik': ('heel_ik.L', 2)}),
    ('foot.L', 'shin.L', tuple(HEEL), tuple(BALL), {'connect': True, 'track': 'ball_ik.L'}),
    ('toes.L', 'foot.L', tuple(BALL), (0.7, 0.46, 0.035), {'connect': True}),
    ('heel_ik.L', None, tuple(HEEL), tuple(HEEL + UP), {'ctrl': True}),
    ('ball_ik.L', None, tuple(BALL), tuple(BALL + UP), {'ctrl': True}),
    ('tail1', 'hips', (-0.4, 0, 0.17), (-0.82, 0, 0.1)),
    ('tail2', 'tail1', (-0.82, 0, 0.1), (-1.3, 0, 0.065), {'connect': True}),
    ('tail3', 'tail2', (-1.3, 0, 0.065), (-1.86, 0, 0.045), {'connect': True}),
]
arm = armature('beaver', BONES)  # noqa: F821
# The stick goes with its teeth as much as its 'con' says: a copy of the marker in its mouth, which goes with the head.
_hold = arm.pose.bones['stick'].constraints.new('COPY_TRANSFORMS')
_hold.target = arm
_hold.subtarget = 'stick.mouth'
# Each hand reaches for its paw target, which is on its grip on the stick as much as its 'con' says, and else where it
# is put (on the ground, walking).
for _tag in ('.L', '.R'):
    _on = arm.pose.bones['paw_ik' + _tag].constraints.new('COPY_LOCATION')
    _on.target = arm
    _on.subtarget = 'grip' + _tag
part = new_part()  # noqa: F821


def fur_paint(points, front_of, seed=0.0, belly=1.0, dark_back=1.0):
    """Fur on points: glossy brown, darker down the back, a little paler down the belly, in streaks that run down the
    fur, with the tips of the guard hairs catching the light. `front_of(p)` is how far towards its front p is, from -1
    (its back) to 1 (its belly)."""
    for p in points:
        q = p.co
        streak = noise(q.x * 9.0 + seed, q.y * 9.0, q.z * 2.4)  # noqa: F821
        fine = noise(q.x * 26.0, q.y * 26.0 + seed, q.z * 7.0)  # noqa: F821
        c = mix(FUR_DARK, FUR, 0.3 + 1.0 * streak)
        f = front_of(p)
        c = mix(c, FUR_DARK, dark_back * 0.45 * smooth((-f - 0.1) / 0.8))
        c = mix(c, BELLY, belly * 0.7 * smooth((f - 0.2) / 0.7))
        c = mix(c, FUR_TIP, 0.32 * smooth((fine - 0.58) / 0.3))
        part['paint'][p] = lit(c, 0.94 + 0.12 * streak)  # noqa: F821


def ring(centre, side, front, half, ahead, behind, count, turn=0.0):
    """Points round `centre`: `half` out along `side` each way, `ahead` out along `front`, `behind` the other way."""
    out = []
    for j in range(count):
        a = TAU * (j + turn) / count  # noqa: F821
        c = math.cos(a)
        s = math.sin(a)
        out.append(centre + front * ((ahead if c > 0.0 else behind) * c) + side * (half * s))
    return out


X = V(1, 0, 0)
Y = V(0, 1, 0)
Z = V(0, 0, 1)


def slab(quad, thick, colour):
    """A thin closed plate on four points (a web between toes), `thick` through, so that it is seen from both sides."""
    top = [put(part, p + Z * (thick * 0.5), colour) for p in quad]  # noqa: F821
    low = [put(part, p - Z * (thick * 0.5), colour) for p in quad]  # noqa: F821
    face(part, top)  # noqa: F821
    face(part, low[::-1])  # noqa: F821
    for k in range(4):
        n = (k + 1) % 4
        face(part, (top[n], top[k], low[k], low[n]))  # noqa: F821

# --- the body: a big pear, round haunches on the ground, a full belly, the chest drawing in to the neck ---------------
BODY = [
    # (x, z, half across, out in front, out behind)
    (-0.16, 0.0, 0.18, 0.14, 0.16),
    (-0.14, 0.05, 0.42, 0.36, 0.4),
    (-0.13, 0.16, 0.6, 0.52, 0.56),
    (-0.11, 0.32, 0.68, 0.6, 0.6),
    (-0.08, 0.52, 0.68, 0.62, 0.54),
    (-0.04, 0.72, 0.62, 0.58, 0.46),
    (0.0, 0.9, 0.53, 0.5, 0.39),
    (0.04, 1.05, 0.43, 0.42, 0.33),
    (0.07, 1.18, 0.33, 0.33, 0.27),
    (0.1, 1.29, 0.27, 0.27, 0.23),
    (0.12, 1.38, 0.23, 0.22, 0.2),
    (0.13, 1.44, 0.15, 0.14, 0.13),
]
SIDES = 32
HAUNCH = V(-0.06, 0.44, 0.3)


def haunch(p):
    """How much a point of the body is in one of its haunches: 1 at the middle of the round of the thigh, 0 away from it."""
    d = V((p.x - HAUNCH.x) / 0.42, (abs(p.y) - HAUNCH.y) / 0.42, (p.z - HAUNCH.z) / 0.34)
    return smooth(1.0 - d.length)


rings = []
for x, z, h, a, b in BODY:
    row = ring(V(x, 0, z), Y, X, h, a, b, SIDES)
    # The round haunches swell out of the sides, low and a little behind the middle.
    rings.append([p + V(0.03, 0.13 if p.y > 0 else -0.13, 0) * haunch(p) for p in row])
at = mark(part)  # noqa: F821
made = skin(part, rings, [FUR] * len(rings), (V(-0.16, 0, -0.01), FUR), (V(0.14, 0, 1.47), FUR))  # noqa: F821
fur_paint(list(part['paint'].keys())[at:], lambda p: max(-1.0, min(1.0, p.co.x / 0.5)), 0.7)
bind(arm, part, at, ['hips', 'spine', 'chest', 'neck'], blend=0.16)  # noqa: F821
for p in list(part['paint'].keys())[at:]:
    # The haunch goes with its thigh a little as the leg swings.
    w = 0.5 * haunch(p.co)
    if w > 0.0:
        part['bones'][p] = [(b, s * (1.0 - w)) for b, s in part['bones'][p]] + [('thigh.L' if p.co.y > 0 else 'thigh.R', w)]

# The hind legs, from the knees inside the haunches down to the heels.
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    tube(part, [V(0.14, 0.42 * side, 0.3), V(0.05, 0.43 * side, 0.2), V(-0.04, 0.43 * side, 0.12)], [0.11, 0.09, 0.075],  # noqa: F821
         [FUR, FUR_DARK, FOOT], 10)
    bind(arm, part, at, ['thigh' + tag, 'shin' + tag], blend=0.08)  # noqa: F821

# --- the big webbed hind feet: a long sole, five long toes with dark claws, and the web between ----------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    sole = lump(part, V(0.16, 0.43 * side, 0.065), (0.27, 0.13, 0.05), 2, FOOT)  # noqa: F821
    for p in sole:
        part['paint'][p] = mix(FOOT, WEB, 0.4 * noise(p.co.x * 14.0, p.co.y * 14.0, 2.0))  # noqa: F821
    bind(arm, part, at, 'foot' + tag)  # noqa: F821
    at = mark(part)  # noqa: F821
    tips = []
    roots = []
    for k in range(5):
        spread = (k - 2)
        root = V(0.36, (0.43 + spread * 0.045) * side, 0.05)
        tip = V(0.66 + 0.035 * (2 - abs(spread)) - 0.03 * (spread == -2), (0.43 + spread * 0.1) * side, 0.03)
        mid = (root + tip) * 0.5 + V(0, 0, 0.012)
        tube(part, [root, mid, tip], [0.034, 0.028, 0.02], [FOOT, FOOT, FOOT], 6)  # noqa: F821
        lump(part, tip + V(0.025, spread * 0.006 * side, -0.006), (0.032, 0.016, 0.012), 1, CLAW)  # noqa: F821
        roots.append(root)
        tips.append(tip)
    # The web between the toes, both faces, a little sunk from their tops.
    for k in range(4):
        quad = [roots[k] + V(0.03, 0, 0.0), roots[k + 1] + V(0.03, 0, 0.0), tips[k + 1] + V(-0.06, 0, 0.004),
                tips[k] + V(-0.06, 0, 0.004)]
        slab(quad, 0.008, WEB)
    bind(arm, part, at, 'toes' + tag, blend=0.08)  # noqa: F821

# --- the arms: short and strong, from the shoulders to small dark hands that hold the stick ---------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)
    at = mark(part)  # noqa: F821
    made = tube(part, [S(V(0.1, 0.32, 1.12)), S(V(0.24, 0.36, 1.04)), S(V(0.36, 0.37, 0.95)), S(V(0.48, 0.3, 1.01)),  # noqa: F821
                       S(GRIP)], [0.13, 0.11, 0.09, 0.075, 0.06], [FUR, FUR, FUR, FUR, FUR_DARK], 10)
    fur_paint([p for row in made for p in row], lambda p: 0.2, 4.0 + side, belly=0.4, dark_back=0.0)
    bind(arm, part, at, ['upper_arm' + tag, 'forearm' + tag], blend=0.07)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, S(V(0.62, 0.215, 1.1)), (0.06, 0.05, 0.05), 2, HAND)  # noqa: F821
    # Four fingers curled round the stick, with pale little claws.
    for k in range(4):
        base = S(V(0.65, 0.17 + 0.03 * k, 1.12))
        tube(part, [base, base + V(0.04, 0, 0.03), base + V(0.06, 0, -0.01)], [0.018, 0.016, 0.01], [HAND, HAND, CLAW], 5)  # noqa: F821
    bind(arm, part, at, 'hand' + tag)  # noqa: F821

# --- the head: broad and round, big cheeks, a blunt muzzle, small eyes and ears ----------------------------------------
HEAD = [
    # (x, z, half across, up, down)
    (-0.12, 1.53, 0.1, 0.08, 0.08),
    (-0.06, 1.53, 0.24, 0.2, 0.18),
    (0.03, 1.535, 0.32, 0.26, 0.23),
    (0.15, 1.53, 0.36, 0.27, 0.27),
    (0.28, 1.5, 0.35, 0.22, 0.27),
    (0.4, 1.46, 0.3, 0.17, 0.23),
    (0.5, 1.435, 0.26, 0.13, 0.19),
    (0.58, 1.425, 0.22, 0.1, 0.15),
    (0.64, 1.425, 0.16, 0.075, 0.11),
]
at = mark(part)  # noqa: F821
rings = [ring(V(x, 0, z), Y, Z, h, u, d, 28) for x, z, h, u, d in HEAD]
made = skin(part, rings, [FUR] * len(rings), (V(-0.15, 0, 1.53), FUR), (V(0.675, 0, 1.43), MUZZLE))  # noqa: F821
for row in made:
    for p in row:
        q = p.co
        streak = noise(q.x * 10.0, q.y * 10.0, q.z * 10.0 + 2.0)  # noqa: F821
        c = mix(FUR_DARK, FUR, 0.4 + 0.8 * streak)
        # The crown and the back of the neck darker; the cheeks paler and warm; the muzzle pale.
        c = mix(c, FUR_DARK, 0.35 * smooth((q.z - 1.62) / 0.12) * smooth((0.35 - q.x) / 0.3))
        c = mix(c, CHEEK, 0.5 * smooth((1.5 - q.z) / 0.1) * smooth((q.x - 0.1) / 0.15))
        c = mix(c, MUZZLE, smooth((q.x - 0.42) / 0.14) * (0.6 + 0.4 * smooth((1.46 - q.z) / 0.08)))
        part['paint'][p] = c
# The split upper lip, round pads either side, and the nose on top, dark and shiny.
for side in (-1.0, 1.0):
    pads = lump(part, V(0.6, 0.075 * side, 1.385), (0.075, 0.09, 0.066), 2, MUZZLE)  # noqa: F821
    for p in pads:
        part['paint'][p] = mix(MUZZLE, FUR_TIP, 0.4 * noise(p.co.x * 30.0, p.co.y * 30.0, p.co.z * 30.0))  # noqa: F821
lump(part, V(0.655, 0, 1.47), (0.05, 0.085, 0.045), 2, NOSE)  # noqa: F821
for side in (-1.0, 1.0):
    lump(part, V(0.693, 0.035 * side, 1.468), (0.012, 0.018, 0.012), 1, tone('#0a0706'))  # noqa: F821
# The two big orange front teeth, flat in front, with a paler edge.
for side in (-1.0, 1.0):
    x0 = 0.6
    y0 = 0.005 * side
    y1 = 0.05 * side
    top = 1.37
    low = 1.22
    front = [V(x0 + 0.045, y0, top), V(x0 + 0.045, y1, top), V(x0 + 0.04, y1, low), V(x0 + 0.04, y0, low)]
    back = [p - V(0.03, 0, 0) for p in front]
    vf = [put(part, p, TOOTH if p.z > low + 0.03 else TOOTH_EDGE) for p in front]  # noqa: F821
    vb = [put(part, p, TOOTH) for p in back]  # noqa: F821
    order = (lambda r: r) if side > 0 else (lambda r: r[::-1])
    face(part, order([vf[3], vf[2], vf[1], vf[0]]))  # noqa: F821
    face(part, order([vb[0], vb[1], vb[2], vb[3]]))  # noqa: F821
    face(part, order([vf[2], vf[3], vb[3], vb[2]]), TOOTH_EDGE)  # noqa: F821
    face(part, order([vf[0], vf[1], vb[1], vb[0]]))  # noqa: F821
    face(part, order([vf[1], vf[2], vb[2], vb[1]]))  # noqa: F821
    face(part, order([vf[3], vf[0], vb[0], vb[3]]))  # noqa: F821
# Small dark eyes set high, each with a light in it, and a darker rim.
for side in (-1.0, 1.0):
    lump(part, V(0.36, 0.25 * side, 1.62), (0.06, 0.04, 0.062), 2, tone('#2a1d14'))  # noqa: F821
    lump(part, V(0.38, 0.262 * side, 1.625), (0.048, 0.034, 0.05), 2, EYE)  # noqa: F821
    lump(part, V(0.405, 0.282 * side, 1.645), (0.013, 0.008, 0.013), 1, SHINE)  # noqa: F821
# Whiskers, pale and fine, out from the pads: each a thin blade seen from both sides.
for side in (-1.0, 1.0):
    for w in range(4):
        root = V(0.6, 0.12 * side, 1.4 - 0.016 * w)
        tip = V(0.66 - 0.05 * w, (0.5 + 0.03 * w) * side, 1.44 - 0.05 * w)
        tube(part, [root, root * 0.5 + tip * 0.5 + V(0, 0, 0.01), tip], [0.006, 0.0035, 0.0012], [WHISKER] * 3, 3)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# The chin and the lower teeth, which chatter as it gnaws.
at = mark(part)  # noqa: F821
chin = lump(part, V(0.5, 0, 1.31), (0.13, 0.12, 0.065), 2, MUZZLE)  # noqa: F821
for side in (-1.0, 1.0):
    lump(part, V(0.585, 0.018 * side, 1.29), (0.016, 0.016, 0.04), 1, TOOTH)  # noqa: F821
bind(arm, part, at, 'jaw')  # noqa: F821

# Small round ears, set back on the head.
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    lump(part, V(0.03, 0.265 * side, 1.705), (0.06, 0.035, 0.062), 2, FUR_DARK)  # noqa: F821
    lump(part, V(0.05, 0.285 * side, 1.705), (0.03, 0.016, 0.038), 1, EAR)  # noqa: F821
    bind(arm, part, at, 'ear' + tag)  # noqa: F821

# --- the tail: a flat paddle covered in small dark scales, furred at its root -----------------------------------------
TAIL = [
    # (x, z, half across, half thick)
    (-0.36, 0.2, 0.2, 0.14),
    (-0.5, 0.17, 0.19, 0.11),
    (-0.64, 0.14, 0.18, 0.075),
    (-0.78, 0.115, 0.22, 0.058),
    (-0.92, 0.1, 0.27, 0.052),
    (-1.06, 0.09, 0.3, 0.048),
    (-1.2, 0.08, 0.32, 0.045),
    (-1.34, 0.07, 0.33, 0.042),
    (-1.48, 0.06, 0.32, 0.039),
    (-1.6, 0.055, 0.3, 0.036),
    (-1.71, 0.05, 0.26, 0.033),
    (-1.8, 0.046, 0.2, 0.03),
    (-1.86, 0.045, 0.12, 0.026),
]
at = mark(part)  # noqa: F821
rows = []
for i, (x, z, half, thick) in enumerate(TAIL):
    # A rounded paddle across: its edges thin, its middle a little fuller.
    pts = []
    count = 24
    for j in range(count):
        a = TAU * (j + 0.5 * (i % 2)) / count  # noqa: F821
        c = math.cos(a)
        s = math.sin(a)
        pts.append(V(x, half * c, z + thick * s * (0.55 + 0.45 * abs(s))))
    rows.append(pts)
made = skin(part, rows, [SCALE] * len(rows), (V(-0.3, 0, 0.2), FUR), (V(-1.9, 0, 0.045), SCALE))  # noqa: F821
tail_points = set(list(part['paint'].keys())[at:])
for p in tail_points:
    part['paint'][p] = mix(SCALE, FUR, smooth((p.co.x + 0.66) / 0.18))
# Each scale a face of its own shade, lighter or darker at random and darker towards the rim, so that they read as
# scales; where the fur begins, the fur's.
for f in part['bm'].faces:
    if not all(v in tail_points for v in f.verts):
        continue
    centre = sum((v.co for v in f.verts), Vector()) / len(f.verts)
    if centre.x > -0.7:
        continue
    pick = rnd(centre.x * 31.0, centre.y * 17.0 + centre.z * 5.0)  # noqa: F821
    shade = SCALE_LIGHT if pick > 0.72 else SCALE_DARK if pick < 0.28 else SCALE
    part['flat'][f] = mix(shade, SCALE_DARK, 0.4 * smooth((abs(centre.y) - 0.22) / 0.1))
bind(arm, part, at, ['tail1', 'tail2', 'tail3'], blend=0.14)  # noqa: F821
for p in tail_points:
    # Its root goes with the hips as much as it is in the body.
    if p.co.x > -0.62:
        w = smooth((p.co.x + 0.62) / 0.3)
        part['bones'][p] = [(b, s * (1.0 - w)) for b, s in part['bones'][p]] + [('hips', w)]

# --- the stick: a length of young birch, white with its dark marks, gnawed pale where its teeth have been --------------
at = mark(part)  # noqa: F821
path = [STICK + V(0.0, -0.62 + 1.24 * k / 10.0, 0.012 * math.sin(k * 0.9)) for k in range(11)]
made = tube(part, path, [0.05, 0.056, 0.058, 0.06, 0.058, 0.06, 0.06, 0.058, 0.06, 0.056, 0.05], [BIRCH] * 11, 10)  # noqa: F821
for row in made:
    for p in row:
        q = p.co - STICK
        mark_ = noise(q.y * 7.0, q.x * 22.0, q.z * 22.0)  # noqa: F821
        c = BIRCH_MARK if mark_ > 0.72 else mix(BIRCH, BIRCH_SHADE, noise(q.y * 3.0, 1.0, q.z * 9.0))  # noqa: F821
        if abs(abs(q.y) - 0.14) < 0.07 and q.x > -0.02:
            c = WOOD
        part['paint'][p] = c
ends = list(part['paint'].keys())[at:]
for p in ends[-2:]:
    part['paint'][p] = WOOD
bind(arm, part, at, 'stick.wood')  # noqa: F821

body = skinned(arm, part, 'beaver-body', strength=0.45, reach=0.3, floor=0.0)  # noqa: F821
# Its own stuff: the kit's paint, a little glossy, as wet fur is.
FUR_STUFF = body.data.materials[0].copy()
FUR_STUFF.name = 'beaver-fur'
for node in FUR_STUFF.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.58
body.data.materials[0] = FUR_STUFF


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
    """A bone of the middle, a leg or the tail pointing along (x, y, z) in the beaver's space as its root is turned (so
    that a whole pose leans, rocks or dives with the root), not twisted about itself."""
    return {'dir': (x, y, z), 'up': (-z, 0.0, x), 'of': of}


ZERO = (0, 0, 0)
REST = {
    'root': {'loc': (0, 0, 0), 'rot': ZERO},
    'hips': ZERO, 'spine': ZERO, 'chest': ZERO, 'neck': ZERO, 'head': ZERO, 'jaw': ZERO, 'ear.L': ZERO,
    'stick': {'con': 0.0, 'loc': (0, 0, 0), 'rot': ZERO},
    'stick.wood': {'loc': (0, 0, 0), 'rot': ZERO, 'scale': 1.0},
    'paw_ik.L': {'con': 1.0, 'at': tuple(GRIP)},
    'upper_arm.L': ZERO, 'forearm.L': {'rot': ZERO, 'con': 1.0}, 'hand.L': ZERO,
    'thigh.L': ZERO, 'shin.L': {'rot': ZERO, 'con': 1.0}, 'foot.L': {'rot': ZERO, 'con': 1.0}, 'toes.L': ZERO,
    'heel_ik.L': {'at': tuple(HEEL)}, 'ball_ik.L': {'at': tuple(BALL)},
    'tail1': ZERO, 'tail2': ZERO, 'tail3': ZERO,
}
PUT_AWAY = {'stick': {'con': 0.0, 'loc': (0, 0, 0)}, 'stick.wood': {'loc': (-0.45, 0, -0.12), 'scale': 0.001}}
IN_TEETH = {'stick': {'con': 1.0}, 'stick.wood': {'loc': (-0.03, 0, 0.08), 'scale': 1.0}}
FREE_ARMS = {'forearm.L': {'con': 0.0}, 'paw_ik.L': {'con': 0.0}}
FREE_LEGS = {'shin.L': {'con': 0.0}, 'foot.L': {'con': 0.0}}


def sit(*extra):
    return over(REST, *extra)


# gnaw: the stick turned in steps, the teeth working at it between.
GNAW_HEAD = {'neck': (-4, 0, 0), 'head': (-7, 0, 0)}
TURNS = [(10, 16, 120.0, 0.07), (34, 40, 240.0, -0.06), (58, 64, 360.0, 0.0)]


def gnaw_pose(f):
    roll = 0.0
    slide = 0.0
    turning = False
    for start, end, to, shift in TURNS:
        if f >= end:
            roll = to
            slide = shift
        elif f >= start:
            k = smooth((f - start) / float(end - start))
            before = roll
            was = slide
            roll = before + (to - before) * k
            slide = was + (shift - was) * k
            turning = True
            break
    breath = math.sin(TAU * f / 36.0)  # noqa: F821
    pose = {'chest': (1.2 * breath, 0, 0), 'stick.wood': {'loc': (0, slide, 0), 'rot': (0, roll, 0), 'scale': 1.0}}
    if turning:
        pose.update({'neck': (-2, 0, 0), 'head': (-1, 0, 0), 'jaw': (0, 0, 0)})
    else:
        chew = (f // 2) % 2
        pose.update({'neck': (-4, 0, 0), 'head': (-7 - 2.5 * chew, 0, 1.5 * math.sin(f * 0.7)), 'jaw': (-13 * chew, 0, 0)})
    if 44 <= f <= 50:
        pose['ear.L'] = (0, 0, -18 * math.sin(math.pi * (f - 44) / 6.0))
    pose['tail3'] = (0, 0, 3.0 * math.sin(TAU * f / 72.0))  # noqa: F821
    return sit(pose)


clip(arm, 'gnaw', 72, [(f, gnaw_pose(f)) for f in range(0, 73, 2)])  # noqa: F821


# look: sitting up taller, the stick lowered to its chest, ears up, sniffing the air.
LOOK = {'spine': (3, 0, 0), 'chest': (4, 0, 0), 'neck': (-2, 0, 0), 'head': (12, 0, 0),
        'stick': {'con': 0.0, 'loc': (0.02, 0, -0.17), 'rot': ZERO}, 'ear.L': (0, 0, -8)}


def look_pose(f):
    breath = math.sin(TAU * f / 48.0)  # noqa: F821
    sniff = math.sin(f * 1.6) if 10 <= f <= 22 or 34 <= f <= 40 else 0.0
    return sit(LOOK, {'chest': (4 + 1.0 * breath, 0, 0), 'head': (12 + 2.5 * sniff, 0, 0)})


clip(arm, 'look', 48, [(f, look_pose(f)) for f in range(0, 49, 2)])  # noqa: F821

# thump: up goes the tail, and down, thump; the body jolts with it.
UP_TAIL = {'tail1': (-48, 0, 0), 'tail2': (-14, 0, 0), 'tail3': (-8, 0, 0), 'spine': (0, 0, 0), 'chest': (1, 0, 0),
           'head': (16, 0, 0)}
HIT = {'tail1': (2, 0, 0), 'tail2': (3, 0, 0), 'tail3': (-6, 0, 0), 'spine': (-1, 0, 0), 'chest': (1, 0, 0),
       'head': (8, 0, 0), 'ear.L': (0, 0, -16), 'root': {'loc': (0, 0, -0.02), 'rot': ZERO}}
clip(arm, 'thump', 22, [  # noqa: F821
    (0, sit(LOOK)),
    (7, sit(LOOK, UP_TAIL)),
    (10, sit(LOOK, UP_TAIL, {'tail1': (-54, 0, 0), 'tail3': (-14, 0, 0)})),
    (12, sit(LOOK, HIT)),
    (14, sit(LOOK, {'tail1': (-6, 0, 0), 'tail3': (4, 0, 0), 'root': {'loc': (0, 0, 0.01), 'rot': ZERO}})),
    (22, sit(LOOK)),
], loop=False)


# waddle: one stride on all fours, diagonal pairs, rocking from side to side, the stick in its teeth.
QUAD = {'hips': D(1.0, -0.02), 'spine': D(1.0, -0.04), 'chest': D(1.0, -0.1), 'neck': D(0.8, 1.0), 'head': D(1.0, -0.08),
        'tail1': D(-1.0, -0.42), 'tail2': D(-1.0, -0.12), 'tail3': D(-1.0, 0.0)}
QUAD_HIGH = 0.4
QUAD_BACK = -0.42


def all_fours(p):
    """Its body on all fours at a phase p of the stride (0 to 1): rocking, and down a little as each foot lands."""
    rock = math.sin(TAU * p)  # noqa: F821
    bob = 0.03 * math.cos(2.0 * TAU * p)  # noqa: F821
    return over(QUAD, {
        'root': {'loc': (0, QUAD_BACK, QUAD_HIGH + bob), 'rot': (0, 5.0 * rock, 0)},
        'head': D(1.0, -0.08, -0.06 * rock),
        'tail2': D(-1.0, -0.12, 0.08 * rock),
        'tail3': D(-1.0, 0.0, 0.16 * rock),
    })


def step(q, stance, reach, lift):
    """Where a foot is along the stride at its own phase q: on the ground going back, then up and forward."""
    if q < stance:
        return reach - 2.0 * reach * (q / stance), 0.0
    s = (q - stance) / (1.0 - stance)
    return -reach + 2.0 * reach * smooth(s), lift * math.sin(math.pi * s)


def waddle_pose(p):
    pose = sit(IN_TEETH, all_fours(p))
    reach = WADDLE_STRIDE * 0.6 / 2.0
    for tag, offset in (('.L', 0.0), ('.R', 0.5)):
        sign = 1.0 if tag == '.L' else -1.0
        x, up = step((p + offset) % 1.0, 0.6, reach, 0.13)
        pose['heel_ik' + tag] = {'at': (x - 0.62, 0.4 * sign, 0.1 + up)}
        pose['ball_ik' + tag] = {'at': (x - 0.2, 0.43 * sign, 0.05 + up * 0.5)}
        pose['toes' + tag] = (-20.0 * up / 0.13, 0, 0)
        # The front paw on the other side steps with it.
        front = '.R' if tag == '.L' else '.L'
        x, up = step((p + offset) % 1.0, 0.6, reach * 0.8, 0.1)
        pose['paw_ik' + front] = {'con': 0.0, 'at': (x + 0.42, -0.3 * sign, 0.08 + up)}
        pose['hand' + front] = D(1.0, -0.25 - 1.5 * up)
    return pose


clip(arm, 'waddle', 24, [(f, waddle_pose(f / 24.0)) for f in range(0, 24, 2)])  # noqa: F821


# rise: on the lodge's top, from crouching nose-first out of the sticks to standing up tall on its hind feet, sniffing.
def stand(extra=None):
    pose = sit(PUT_AWAY, FREE_ARMS, {
        'root': {'loc': (0, 0, 0.13), 'rot': ZERO},
        'hips': D(-0.12, 1.0), 'spine': D(0.0, 1.0), 'chest': D(0.06, 1.0), 'neck': D(0.25, 1.0), 'head': D(1.0, 0.3),
        'upper_arm.L': D(0.45, -1.0, 0.05), 'forearm.L': {'con': 0.0, 'dir': (1.0, -0.15, 0.55), 'up': (-0.5, 0.0, 1.0)},
        'hand.L': D(0.6, -1.0),
        'heel_ik.L': {'at': (-0.16, HEEL.y, 0.1)}, 'ball_ik.L': {'at': (0.28, BALL.y, 0.05)},
        'tail1': D(-1.0, -0.55), 'tail2': D(-1.0, -0.08), 'tail3': D(-1.0, 0.0),
    })
    return over(pose, extra or {})


CROUCH = sit(PUT_AWAY, FREE_ARMS, over(QUAD, {
    'root': {'loc': (0, QUAD_BACK, QUAD_HIGH - 0.08), 'rot': (14, 0, 0)}, 'neck': D(0.8, 1.0), 'head': D(1.0, 0.25),
    'heel_ik.L': {'at': (-0.62, 0.4, 0.1)}, 'ball_ik.L': {'at': (-0.2, 0.43, 0.05)},
    'upper_arm.L': D(0.3, -1.0), 'forearm.L': {'con': 0.0, 'dir': (0.5, 0.0, -1.0), 'up': (1.0, 0.0, 0.5)}, 'hand.L': D(1.0, -0.3),
}))
clip(arm, 'rise', 22, [  # noqa: F821
    (0, CROUCH),
    (7, over(CROUCH, {'root': {'loc': (0, QUAD_BACK * 0.6, QUAD_HIGH), 'rot': (40, 0, 0)}, 'head': D(1.0, 0.5)})),
    (14, stand({'head': D(1.0, 0.45), 'root': {'loc': (0, 0, 0.17), 'rot': ZERO}})),
    (17, stand({'head': D(1.0, 0.38), 'ear.L': (0, 0, -10)})),
    (19, stand({'head': D(1.0, 0.44)})),
    (22, stand()),
], loop=False)


# swim: low in the water, the origin at its surface; the hind feet paddle in turn, the tail steers, the head is up.
SWIM_LOW = -0.56
SWIM = sit(PUT_AWAY, FREE_ARMS, FREE_LEGS, {
    'root': {'loc': (0, -0.45, SWIM_LOW), 'rot': ZERO},
    'hips': D(1.0, 0.06), 'spine': D(1.0, 0.12), 'chest': D(1.0, 0.3), 'neck': D(0.65, 1.0), 'head': D(1.0, 0.04),
    'upper_arm.L': D(0.35, -1.0, 0.1), 'forearm.L': {'con': 0.0, 'dir': (1.0, -0.1, 0.25), 'up': (-0.25, 0.0, 1.0), 'of': 'root'},
    'hand.L': D(0.5, -1.0),
    'tail1': D(-1.0, -0.06), 'tail2': D(-1.0, 0.0), 'tail3': D(-1.0, 0.03),
})


def paddle(q):
    """A hind leg at its own phase q of a stroke: pushing back with its web spread, then drawn forward, folded."""
    a = math.cos(TAU * q)  # noqa: F821
    back = 0.5 - 0.5 * a   # 0 drawn forward, 1 pushed back
    folded = smooth((math.sin(TAU * q) + 0.2) / 0.6)  # noqa: F821
    return {'thigh.L': D(0.3 - 0.9 * back, -1.0), 'shin.L': {'con': 0.0, **D(-0.6 - 0.6 * back, -0.6 + 0.3 * back)},
            'foot.L': {'con': 0.0, **D(-1.0, -0.9 + 0.7 * back - 0.5 * folded)}, 'toes.L': (-35.0 * folded, 0, 0)}


def swim_pose(p):
    pose = over(SWIM, {'root': {'loc': (0, -0.45, SWIM_LOW + 0.02 * math.cos(2.0 * TAU * p)), 'rot': (1.5 * math.sin(2.0 * TAU * p), 0, 0)}})  # noqa: F821
    for tag, offset in (('.L', 0.0), ('.R', 0.5)):
        leg = paddle((p + offset) % 1.0)
        if tag == '.R':
            leg = {k.replace('.L', '.R'): v for k, v in leg.items()}
        pose.update(leg)
    sway = math.sin(TAU * p)  # noqa: F821
    pose['tail2'] = D(-1.0, 0.0, 0.07 * sway)
    pose['tail3'] = D(-1.0, 0.03, 0.14 * sway)
    pose['head'] = D(1.0, 0.04 + 0.03 * math.sin(2.0 * TAU * p))  # noqa: F821
    return pose


clip(arm, 'swim', 24, [(f, swim_pose(f / 24.0)) for f in range(0, 24, 2)])  # noqa: F821

# slap: the tail up high, and down flat on the water, smack; the body jolts.
SWIM0 = swim_pose(0.25)
clip(arm, 'slap', 14, [  # noqa: F821
    (0, SWIM0),
    (5, over(SWIM0, {'tail1': D(-0.45, 1.0), 'tail2': D(-0.2, 1.0), 'tail3': D(0.15, 1.0),
                     'root': {'loc': (0, -0.45, -0.66), 'rot': (-6, 0, 0)}})),
    (8, over(SWIM0, {'tail1': D(-1.0, -0.12), 'tail2': D(-1.0, -0.06), 'tail3': D(-1.0, 0.12),
                     'root': {'loc': (0, -0.45, -0.6), 'rot': (4, 0, 0)}})),
    (10, over(SWIM0, {'tail3': D(-1.0, -0.06)})),
    (14, SWIM0),
], loop=False)

# dive: its head goes down, its back arches over, its tail flips up and goes under after it.
clip(arm, 'dive', 24, [  # noqa: F821
    (0, SWIM0),
    (6, over(SWIM0, {'root': {'loc': (0, -0.3, -0.62), 'rot': (-18, 0, 0)}, 'chest': D(1.0, 0.0), 'neck': D(1.0, -0.2),
                     'head': D(1.0, -0.5), 'tail1': D(-1.0, 0.1)})),
    (12, over(SWIM0, {'root': {'loc': (0, -0.1, -0.7), 'rot': (-45, 0, 0)}, 'hips': D(1.0, 0.25), 'spine': D(1.0, 0.05),
                      'chest': D(1.0, -0.2), 'neck': D(1.0, -0.4), 'head': D(1.0, -0.45), 'tail1': D(-1.0, 0.5),
                      'tail2': D(-1.0, 0.6), 'tail3': D(-1.0, 0.5)})),
    (18, over(SWIM0, {'root': {'loc': (0, 0.1, -0.85), 'rot': (-70, 0, 0)}, 'hips': D(1.0, 0.15), 'chest': D(1.0, -0.1),
                      'neck': D(1.0, -0.2), 'head': D(1.0, -0.25), 'tail1': D(-0.6, 1.0), 'tail2': D(-0.5, 1.0),
                      'tail3': D(-0.3, 1.0)})),
    (24, over(SWIM0, {'root': {'loc': (0, 0.3, -1.1), 'rot': (-82, 0, 0)}, 'tail1': D(-1.0, 0.1), 'tail2': D(-1.0, 0.0),
                      'tail3': D(-1.0, -0.1)})),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'beaver': {'gnaw': [0, 8, 14, 30, 46], 'look': [0, 16], 'thump': [0, 7, 12, 22],
                             'waddle': [0, 6, 12, 18], 'rise': [0, 7, 14, 22], 'swim': [0, 6, 12, 18],
                             'slap': [0, 5, 8, 14], 'dive': [0, 6, 12, 18, 24]}}
