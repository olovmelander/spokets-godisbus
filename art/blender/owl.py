"""The tawny owl of Aventyr 2 (docs/aventyr-2.md): the owl trapped in its hollow in Stormskogen, freed by Elof, that
waits for him, carries him over the windthrow, is called over the lake in Alven and lands on the jetty in Stormens oga;
and the owls that sit on branches at dusk in the near forest. One bird with bones. Made with art/blender/kit-tools.py
and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/owl.py --out=art/baked/boot/owl.glb
    node scripts/bake/blender-kit.mjs art/blender/owl.py --fast --preview=<folder>      (stills of every clip)

Units: 1 Blender unit is 1 EL; Z is up, the owl faces +X, and the camera's side is -Y (its right: the '.R' bones).
It stands with its feet at the origin, about 2.45 EL tall, as the owl that sat in the hollow before it did; flying, it
is about as long, its wings 6 EL across, as the owl that carried him was. Its rest pose is the owl sitting upright
with its wings spread out to its sides, their undersides to the front: pitched forward onto its breast, that is the
owl in flight. The bone 'saddle' is the place on its back where he sits; 'lid.L' and 'lid.R' are its upper eyelids.

A round head with a facial disc (pale fans round the eyes in fine rings, a dark rim, white brows in a V over a small
pale hooked beak), big dark eyes with lids, and no ear tufts; russet-brown above, mottled dark and with a row of white
spots on its shoulders; buff below with dark streaks crossed by fine bars; soft and round. Broad rounded wings: each
part of the arm, each group of flight feathers and the coverts with their bones, so that a wing folds at its wrist as
a bird's does, and its outer primaries spread as fingers; a short barred tail that fans; feathered legs and toes, and
dark talons. It is one mesh with its colours on its corners, skinned to its bones. The clips, each named 'owl:<clip>':
    perch      sitting: breathing, slow blinks, its head turned far round, to the side and behind, a tilt, a fluff and
               a shake                                                                                     (loop)
    trapped    in its hollow behind the branch: it pushes against it, its wings half open and pinned, then rests
               with its eyes half shut and looks out                                                       (loop)
    freed      it is free: a shake, its feathers ruffled out and smoothed, its wings shaken out, wide awake  (once)
    takeoff    a crouch, the push off its feet, wings up, the first strong beats, its body tipping forward   (once)
    fly        one deep wingbeat from the top, both wings full; its head turned a little to the camera      (loop)
    glide      wings wide and flat, the fingers spread, silent, a slow sway                               (loop)
    land       pitching up, its talons swung forward and spread, wings cupped and braking, down, folded    (once)
    carry      flying with Elof on its back: the near wing rises only to about level, so it never hides him,
               and its back is steadier                                                                    (loop)
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Matrix, Vector

RUSSET = tone('#9c6539')       # noqa: F821 (kit-tools.py)
RUSSET_DEEP = tone('#7c4b29')  # noqa: F821
UMBER = tone('#4e3019')        # noqa: F821
DARK = tone('#2f1d11')         # noqa: F821
BUFF = tone('#d3ab7b')         # noqa: F821
CREAM = tone('#ead8b6')        # noqa: F821
WHITE = tone('#f3ebda')        # noqa: F821
DISC = tone('#c8ac88')         # noqa: F821
DISC_PALE = tone('#e0ccaa')    # noqa: F821
RIM = tone('#3c2213')          # noqa: F821
EYE = tone('#0b0806')          # noqa: F821
IRIS = tone('#2b170c')         # noqa: F821
SHINE = tone('#f6f2ea')        # noqa: F821
BEAK = tone('#dccf9a')         # noqa: F821
BEAK_TIP = tone('#a8986a')     # noqa: F821
LID = tone('#bc9c78')          # noqa: F821
LID_EDGE = tone('#6e4630')     # noqa: F821
TALON = tone('#2a221c')        # noqa: F821
TOE = tone('#dcc8a4')          # noqa: F821


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


# --- the bones ---------------------------------------------------------------------------------------------------------
# At rest it sits upright, its wings spread to its sides in the plane x = WING_X, their backs (in flight, their tops)
# towards -X: the wing bones' own Z points that way (DORSAL), so that a turn about X beats a wing up and down in flight,
# about Z sweeps it forward and back, as the crane's do.

DORSAL = (-1.0, 0.0, 0.0)
BODY_C = V(0.0, 0.0, 0.88)
HEAD_C = V(0.06, 0.0, 1.9)
HEAD_R = (0.54, 0.63, 0.55)
EYE_C = V(0.38, 0.215, 1.93)
EYE_DIR = V(math.cos(math.radians(7.0)), math.sin(math.radians(7.0)), 0.0)
EYE_R = 0.15
LID_R = 0.166
LID_OPEN = 125.0
SADDLE = V(-0.5, 0.0, 1.02)
WING_X = -0.16
SHOULDER = V(WING_X, 0.4, 1.36)
ELBOW = V(WING_X, 0.95, 1.34)
WRIST = V(WING_X, 1.7, 1.52)
HAND = V(WING_X, 2.15, 1.44)
HIP = V(0.04, 0.19, 0.5)
KNEE = V(0.1, 0.21, 0.3)
ANKLE = V(0.13, 0.21, 0.08)
TAIL_ROOT = V(-0.34, 0.0, 0.54)
TAIL_DIR = V(-0.5, 0.0, -0.866)
TAIL_UP = V(-0.866, 0.0, 0.5)
UP = V(0, 0, 0.12)
SEC_AT = [0.17, 0.5, 0.83]
PRIM_AT = [0.08, 0.26, 0.44, 0.62, 0.8, 0.98]
# How far back from straight out each finger points at rest, and how long it is: the inner ones longest after the
# middle, the outermost short, so that the wing's tip is round, as an owl's is.
PRIM_TURN = [70.0, 57.0, 44.0, 31.0, 18.0, 5.0]
PRIM_LONG = [0.98, 1.06, 1.12, 1.15, 1.08, 0.9]


def prim_dir(k, spread=1.0):
    """Finger k of the hand at rest: back is -Z (towards the tail in flight), out is +Y."""
    a = math.radians(PRIM_TURN[k] * spread)
    return V(0.0, math.cos(a), -math.sin(a))


BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.3), {'deform': False}),
    ('body', 'root', (0, 0, 0.7), (0, 0, 1.36)),
    # The plumage of its body, on a bone of its own: it fluffs out (a scale) without its head, wings and legs.
    ('plume', 'body', tuple(BODY_C), tuple(BODY_C + V(0, 0, 0.24))),
    ('saddle', 'body', tuple(SADDLE), tuple(SADDLE + V(-0.15, 0, 0)), {'deform': False}),
    ('neck', 'body', (0.02, 0, 1.42), (0.02, 0, 1.62)),
    ('head', 'neck', (0.02, 0, 1.62), (0.02, 0, 2.3), {'connect': True}),
    ('lid.L', 'head', tuple(EYE_C), tuple(EYE_C + EYE_DIR * 0.15), {'z': (0, 0, 1)}),
    ('tail', 'body', tuple(TAIL_ROOT), tuple(TAIL_ROOT + TAIL_DIR * 0.5), {'z': tuple(TAIL_UP)}),
    ('tailfan.L', 'tail', tuple(TAIL_ROOT + V(0, 0.05, 0)), tuple(TAIL_ROOT + V(0, 0.05, 0) + (TAIL_DIR * 0.95 + V(0, 0.32, 0)).normalized() * 0.5),
     {'z': tuple(TAIL_UP)}),
    ('upperarm.L', 'body', tuple(SHOULDER), tuple(ELBOW), {'z': DORSAL}),
    ('forearm.L', 'upperarm.L', tuple(ELBOW), tuple(WRIST), {'connect': True, 'z': DORSAL}),
    ('hand.L', 'forearm.L', tuple(WRIST), tuple(HAND), {'connect': True, 'z': DORSAL}),
    # The tertials of the inner wing, on the upper arm.
    ('tert.L', 'upperarm.L', tuple(lerp(SHOULDER, ELBOW, 0.55) + V(0, 0, -0.05)), tuple(lerp(SHOULDER, ELBOW, 0.55) + V(0, 0, -0.55)), {'z': DORSAL}),
]
for i, u in enumerate(SEC_AT):
    root = lerp(ELBOW, WRIST, u) + V(0, 0, -0.04)
    BONES.append(('sec%d.L' % (i + 1), 'forearm.L', tuple(root), tuple(root + V(0, 0, -0.5)), {'z': DORSAL}))
for k, u in enumerate(PRIM_AT):
    root = lerp(WRIST, HAND, u)
    BONES.append(('prim%d.L' % (k + 1), 'hand.L', tuple(root), tuple(root + prim_dir(k) * PRIM_LONG[k]), {'z': DORSAL}))
BONES += [
    ('thigh.L', 'body', tuple(HIP), tuple(KNEE)),
    ('tarsus.L', 'thigh.L', tuple(KNEE), tuple(ANKLE), {'connect': True}),
    ('foot.L', 'tarsus.L', tuple(ANKLE), tuple(ANKLE + V(0.2, 0, -0.04))),
    ('hind.L', 'tarsus.L', tuple(ANKLE), tuple(ANKLE + V(-0.17, 0.04, -0.04)), {'z': (0, 0, 1)}),
]

arm = armature('owl', BONES)  # noqa: F821 (creature-tools.py)
part = new_part()  # noqa: F821


def weigh(points, shares):
    """Each point's own shares of bones: `shares(point)` gives {bone: share}."""
    table = part.setdefault('bones', {})
    for p in points:
        own = [(bone, w) for bone, w in shares(p).items() if w > 1e-4]
        table[p] = own


# --- the plumage ---------------------------------------------------------------------------------------------------

def plumage(p, under, seed=0.0, spots=0.0):
    """The colour of its feathers at a point: `under` from 0 (its back, russet and mottled) to 1 (its breast, buff
    with dark streaks crossed by fine bars). `spots`: how much the row of white spots on its shoulders shows here."""
    m = noise(p.x * 6.0 + seed, p.y * 6.0, p.z * 6.0)  # noqa: F821
    m2 = noise(p.x * 15.0, p.y * 15.0 + seed, p.z * 15.0)  # noqa: F821
    back = mix(RUSSET, RUSSET_DEEP, smooth((m - 0.42) / 0.3))
    back = mix(back, UMBER, 0.7 * smooth((m2 - 0.68) / 0.08))
    back = mix(back, mix(RUSSET, BUFF, 0.5), 0.6 * smooth((0.26 - m2) / 0.1))
    # Each feather of the back has a dark middle and a paler edge, in scallops that run down it.
    scallop = (p.z * 9.0 + 0.6 * math.sin(p.y * 11.0 + seed) + 0.4 * m) % 1.0
    back = mix(back, UMBER, 0.35 * smooth((scallop - 0.72) / 0.2))
    if spots > 0.0:
        spot = noise(p.x * 13.0 + 7.0, p.y * 13.0, p.z * 9.0 + seed)  # noqa: F821
        back = mix(back, WHITE, spots * smooth((spot - 0.63) / 0.07))
    # The streaks of its breast: in columns round it, each a run of dashes down it, crossed by fine bars.
    a = math.atan2(p.y, max(1e-3, abs(p.x) + 0.2))
    col = a * 2.7 + seed
    ci = math.floor(col)
    cf = col - ci
    mid = 0.5 + 0.25 * (rnd(ci, 1.0) - 0.5)  # noqa: F821
    dash = noise(ci * 3.1, p.z * 5.0 + rnd(ci, 2.0) * 5.0, 0.5)  # noqa: F821
    wide = (0.08 + 0.1 * dash) * smooth((dash - 0.45) / 0.12)
    off = abs(cf - mid)
    line = smooth((wide - off) / 0.05)
    fine = noise(a * 9.0, p.z * 5.0 + seed, 0.4)  # noqa: F821
    breast = mix(BUFF, mix(BUFF, RUSSET, 0.5), 0.55 * fine * smooth((p.z - 0.6) / 0.6))
    breast = mix(breast, CREAM, 0.4 * smooth((0.4 - fine) / 0.2))
    bars = smooth((0.12 - abs((p.z * 13.0 + rnd(ci, 3.0)) % 1.0 - 0.5)) / 0.06) * smooth((0.3 - off) / 0.08)  # noqa: F821
    breast = mix(breast, RUSSET_DEEP, 0.55 * bars)
    breast = mix(breast, DARK, 0.85 * line)
    return mix(back, breast, under)


# --- the body: round and soft, broad at the belly ---------------------------------------------------------------------
# (z, half its width, how far its breast comes forward, how far its back goes back)
PROFILE = [(0.22, 0.05, 0.04, 0.05), (0.27, 0.26, 0.22, 0.22), (0.36, 0.42, 0.36, 0.34), (0.5, 0.52, 0.48, 0.41),
           (0.7, 0.56, 0.55, 0.43), (0.92, 0.56, 0.56, 0.43), (1.12, 0.55, 0.52, 0.42), (1.28, 0.53, 0.46, 0.41),
           (1.44, 0.55, 0.4, 0.42), (1.56, 0.58, 0.34, 0.46), (1.66, 0.58, 0.24, 0.46), (1.76, 0.5, 0.12, 0.4),
           (1.84, 0.32, 0.02, 0.24)]
RINGS = 60
AROUND = 80
rings = []
for r in range(RINGS):
    z = PROFILE[0][0] + (PROFILE[-1][0] - PROFILE[0][0]) * r / (RINGS - 1.0)
    w = along([(q[0], q[1]) for q in PROFILE], z)  # noqa: F821
    f = along([(q[0], q[2]) for q in PROFILE], z)  # noqa: F821
    b = along([(q[0], q[3]) for q in PROFILE], z)  # noqa: F821
    ring = []
    for j in range(AROUND):
        a = TAU * j / AROUND  # noqa: F821
        c = math.cos(a)
        s = math.sin(a)
        # Full at its flanks and back, as a round soft bird's is (a superellipse, squarer behind), and soft: each point
        # pushed out or in a hair.
        reach = (f if c > 0 else b)
        n = 2.3 if c > 0 else 2.8
        x = math.copysign(abs(c) ** (2.0 / n), c) * reach
        y = math.copysign(abs(s) ** (2.0 / n), s) * w
        p = V(x, y, z)
        fluff = noise(x * 9.0, y * 9.0, z * 9.0) - 0.5  # noqa: F821
        out = V(c, s, 0.0) * (0.035 * fluff * smooth((z - 0.24) / 0.1))
        ring.append(p + out)
    rings.append(ring)
at = mark(part)  # noqa: F821
made = skin(part, rings, [RUSSET] * RINGS, first=(V(0.0, 0.0, 0.205), BUFF), last=(V(-0.04, 0.0, 1.86), RUSSET))  # noqa: F821
points = [p for ring in made for p in ring]
for p in points:
    c = p.co
    a = math.atan2(c.y, c.x)
    front = math.cos(a)
    side = abs(math.sin(a))
    # The breast faces front, and below; the back and the shoulders behind. The folded wing lies on the flank: its
    # colours are painted there too, under the feathers of the wing itself.
    under = smooth((front + 0.2) / 0.55) * (1.0 - 0.45 * smooth((c.z - 1.38) / 0.2))
    under = max(under, smooth((0.42 - c.z) / 0.18) * 0.9)
    wing = smooth((side - 0.72) / 0.18) * smooth((0.25 - front) / 0.4) * smooth((c.z - 0.4) / 0.15) * smooth((1.35 - c.z) / 0.15)
    spots = smooth((side - 0.45) / 0.15) * smooth((-front - 0.25) / 0.25) * smooth((c.z - 0.95) / 0.1) * smooth((1.4 - c.z) / 0.1)
    colour = plumage(c, under * (1.0 - wing), 0.0, spots)
    bars = (c.z * 10.0 + 0.3 * noise(c.x * 5.0, c.y * 5.0, 1.0)) % 1.0  # noqa: F821
    colour = mix(colour, mix(RUSSET_DEEP, UMBER, smooth((bars - 0.75) / 0.15)), 0.6 * wing)
    part['paint'][p] = colour
weigh(list(part['paint'].keys())[at:], lambda p: {'plume': 1.0 - smooth((p.co.z - 1.4) / 0.36), 'neck': smooth((p.co.z - 1.4) / 0.36)})

# The soft feathers under its tail, over the root of the tail.
at = mark(part)  # noqa: F821
centre = TAIL_ROOT + V(0.12, 0.0, -0.06)
size = (0.2, 0.22, 0.14)
for p in lump(part, centre, size, 2, BUFF):  # noqa: F821
    n = p.co - centre
    p.co = p.co + n.normalized() * 0.02 * (noise(p.co.x * 14.0, p.co.y * 14.0, p.co.z * 14.0) - 0.5)  # noqa: F821
    part['paint'][p] = mix(BUFF, CREAM, 0.4 * noise(p.co.x * 9.0, 2.0, p.co.z * 9.0))  # noqa: F821
bind(arm, part, at, {'plume': 0.6, 'tail': 0.4})  # noqa: F821


# --- the head: round, with its facial disc ----------------------------------------------------------------------------
FACE_Z = 1.88


def eye_at(side):
    return V(EYE_C.x, EYE_C.y * side, EYE_C.z)


at = mark(part)  # noqa: F821
ball = lump(part, HEAD_C, HEAD_R, 4, RUSSET)  # noqa: F821
for p in ball:
    c = p.co.copy()
    d = V((c.x - HEAD_C.x) / HEAD_R[0], c.y / HEAD_R[1], (c.z - HEAD_C.z) / HEAD_R[2])
    u = c.y
    v = c.z - FACE_Z
    # How far from the middle of the face, where its rim is 1; a little narrower at the chin.
    r = math.sqrt((u / 0.52) ** 2 + ((v + 0.02) / (0.52 if v > -0.02 else 0.5)) ** 2)
    facing = smooth((d.x - 0.05) / 0.35)
    disc = facing * smooth((1.0 - r) / 0.12)
    # The dish of the face: deepest round each eye, a ridge down its middle over the beak, and its rim raised.
    near = min(math.hypot(u - EYE_C.y, v - (EYE_C.z - FACE_Z)), math.hypot(u + EYE_C.y, v - (EYE_C.z - FACE_Z)))
    lobe = max(0.0, 1.0 - (near / 0.3) ** 2)
    dish = disc * (0.07 + 0.07 * lobe) - facing * 0.03 * math.exp(-((u / 0.06) ** 2)) * smooth((0.26 - abs(v - 0.02)) / 0.1)
    rim = facing * math.exp(-(((r - 1.0) / 0.09) ** 2))
    c.x -= dish
    c.x += 0.03 * rim
    # Its lower half fuller, so that its head sits down into its body in one round shape, as an owl's does.
    full = 1.0 + 0.06 * smooth((-d.z - 0.25) / 0.55)
    c.x = HEAD_C.x + (c.x - HEAD_C.x) * (1.0 + (full - 1.0) * (1.0 - facing))
    c.y = c.y * full
    # The corners of its brow a little up: no tufts, only the round of its head a little less round there.
    c.z += 0.03 * facing * math.exp(-((((abs(u) - 0.42) / 0.12) ** 2) + (((v - 0.4) / 0.1) ** 2)))
    # Its crown and nape: streaked and spotted.
    colour = plumage(c, 0.12, 2.0, 0.0)
    crown = noise(c.y * 18.0, c.z * 6.0, 4.0)  # noqa: F821
    colour = mix(colour, DARK, 0.7 * smooth((crown - 0.66) / 0.08) * smooth((c.z - 2.0) / 0.2))
    colour = mix(colour, BUFF, 0.5 * smooth((0.25 - crown) / 0.08) * smooth((0.0 - d.x) / 0.4))
    # The disc: pale fans in fine rings round each eye, a dark rim, the white brows in a V, and buff at the chin.
    ringed = smooth((math.sin(near * 62.0) - 0.4) / 0.5)
    facial = mix(DISC, DISC_PALE, smooth((near - 0.18) / 0.2) * 0.5)
    facial = mix(facial, mix(DISC, RIM, 0.45), 0.4 * ringed * smooth((near - 0.16) / 0.04))
    spoke = noise(math.atan2(v - 0.03, u) * 8.0, near * 3.0, 1.0)  # noqa: F821
    facial = mix(facial, RUSSET_DEEP, 0.25 * smooth((spoke - 0.6) / 0.15))
    brow = 0.0
    for s in (-1.0, 1.0):
        e = math.hypot(u - EYE_C.y * s, v - (EYE_C.z - FACE_Z))
        inner = smooth((EYE_C.y - u * s + 0.04) / 0.12)
        brow = max(brow, math.exp(-(((e - 0.2) / 0.035) ** 2)) * smooth((v - (EYE_C.z - FACE_Z) + 0.02) / 0.06) * inner)
    brow = max(brow, math.exp(-((u / 0.035) ** 2)) * smooth((0.24 - v) / 0.05) * smooth((v + 0.12) / 0.05))
    facial = mix(facial, WHITE, 0.9 * brow)
    facial = mix(facial, DISC_PALE, smooth((-0.2 - v) / 0.1) * 0.6)
    edge = math.exp(-(((r - 0.99) / 0.1) ** 2))
    facial = mix(facial, RIM, 0.95 * edge)
    facial = mix(facial, mix(RIM, BUFF, 0.4), 0.5 * edge * smooth((noise(math.atan2(v, u) * 12.0, 1.0, 3.0) - 0.55) / 0.1))  # noqa: F821
    p.co = c
    part['paint'][p] = mix(colour, facial, smooth((d.x + 0.05) / 0.25) * smooth((1.06 - r) / 0.08))

# The eyes: big and dark, a darker brown ring round the pupil you hardly see, and a light in each.
for s in (-1.0, 1.0):
    centre = eye_at(s)
    look = V(EYE_DIR.x, EYE_DIR.y * s, EYE_DIR.z)
    for p in lump(part, centre, (EYE_R, EYE_R, EYE_R), 2, EYE):  # noqa: F821
        off = (p.co - centre).normalized()
        angle = math.degrees(math.acos(max(-1.0, min(1.0, off.dot(look)))))
        part['paint'][p] = mix(EYE, IRIS, smooth((angle - 22.0) / 8.0) * smooth((48.0 - angle) / 8.0))
    # The light in both eyes on the same side, as from one light.
    glint = centre + look * (EYE_R * 0.93) + V(0, 0.04, 0.055)
    lump(part, glint, (0.012, 0.03, 0.03), 1, SHINE)  # noqa: F821

# The beak: small, pale and hooked, half in the bristles between its eyes.
tube(part, [V(0.5, 0.0, 1.83), V(0.565, 0.0, 1.795), V(0.6, 0.0, 1.745), V(0.602, 0.0, 1.705), V(0.585, 0.0, 1.685)],  # noqa: F821
     [0.05, 0.042, 0.03, 0.014, 0.003], [BEAK, BEAK, BEAK, BEAK_TIP, BEAK_TIP], 10, squash=0.62, lean=V(0, 1, 0))
bind(arm, part, at, 'head')  # noqa: F821

# The upper lids: each a shell over its eye, made shut and turned up out of the way, so that at rest its eyes are open
# and a turn of the lid's bone down shuts them (LID_OPEN degrees).
for s, tag in ((1.0, '.L'), (-1.0, '.R')):
    centre = eye_at(s)
    look = V(EYE_DIR.x, EYE_DIR.y * s, EYE_DIR.z)
    z = V(0, 0, 1)
    x = look.cross(z).normalized()
    across = look.cross(x).normalized()
    lid_rings = []
    lid_tones = []
    for i in range(9):
        t = i / 8.0
        a = math.radians(4.0 + 66.0 * t)
        ring = []
        for j in range(22):
            b = TAU * j / 22.0  # noqa: F821
            d = look * math.cos(a) + (x * math.cos(b) + across * math.sin(b)) * math.sin(a)
            ring.append(centre + d * LID_R)
        lid_rings.append(ring)
        lid_tones.append(mix(LID, LID_EDGE, smooth((t - 0.7) / 0.3)))
    at = mark(part)  # noqa: F821
    lid = skin(part, lid_rings, lid_tones, first=(centre + look * LID_R, LID))  # noqa: F821
    turn = Matrix.Translation(centre) @ Matrix.Rotation(math.radians(LID_OPEN), 4, x) @ Matrix.Translation(-centre)
    for p in list(part['paint'].keys())[at:]:
        p.co = turn @ p.co
    bind(arm, part, at, 'lid' + tag)  # noqa: F821


# --- feathers ----------------------------------------------------------------------------------------------------------

def barred(t, base, bar, n, phase=0.0, tip=None):
    """A feather's colour `t` of the way along it: `n` darker bars across it, and a paler tip."""
    k = smooth((math.sin((t * n + phase) * TAU) - 0.35) / 0.4)  # noqa: F821
    c = mix(base, bar, 0.75 * k * smooth((t - 0.08) / 0.1))
    if tip is not None:
        c = mix(c, tip, smooth((t - 0.86) / 0.12))
    return c


def feather(root, ahead, side, long, wide, droop, colours, steps=8, bend=None, quill=0.006, shape=0.6, finger=0.0):
    """One feather: a blade from `root` along `ahead`, `wide` across `side`, its quill raised, curving by `droop` towards
    `bend` (by default square to its face). colours(t) is its colour along it. A smaller `shape` makes it blunter (a
    covert); `finger` narrows its outer part, as the slotted tips of an owl's outer primaries are."""
    ahead = ahead.normalized()
    side = side.normalized()
    down = (bend if bend is not None else ahead.cross(side)).normalized()
    rows = []
    for s in range(steps + 1):
        t = s / steps
        c = root + ahead * (long * t) + down * (droop * long * t * t)
        # Broad soon after its root, and round at its tip, as an owl's feathers are.
        w = wide * min(1.0, (t + 0.06) / 0.3) ** shape * math.sqrt(max(0.0, 1.0 - max(0.0, (t - 0.68) / 0.32) ** 2)) * (1.0 - 0.15 * t) + 0.004
        w *= 1.0 - finger * smooth((t - 0.5) / 0.3)
        colour = colours(t)
        rows.append([put(part, c - side * w, colour), put(part, c - down * quill * (1 - t), lit(colour, 0.92)), put(part, c + side * w, colour)])  # noqa: F821
    for s in range(steps):
        a, b = rows[s], rows[s + 1]
        face(part, [a[0], b[0], b[1], a[1]])  # noqa: F821
        face(part, [a[1], b[1], b[2], a[2]])  # noqa: F821


# --- the wings ---------------------------------------------------------------------------------------------------------
VENTRAL = V(1.0, 0.0, 0.0)
PRIMS = ['prim1', 'prim2', 'prim3', 'prim4', 'prim5', 'prim6']
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    # The leading edge, round where the bones are: the arm and the hand inside the feathers.
    for bone, a, b, r0, r1 in (('upperarm', SHOULDER - V(0, 0.1, 0), ELBOW, 0.085, 0.06), ('forearm', ELBOW, WRIST, 0.06, 0.05),
                               ('hand', WRIST, HAND + V(0, 0.08, -0.02), 0.05, 0.03)):
        at = mark(part)  # noqa: F821
        made = tube(part, [S(lerp(a, b, k / 5.0)) for k in range(6)], [r0 + (r1 - r0) * k / 5.0 for k in range(6)],  # noqa: F821
                    [RUSSET] * 6, 8, squash=0.6, lean=V(1, 0, 0), twist=0.0)
        for ring in made:
            for p in ring:
                part['paint'][p] = mix(RUSSET, BUFF, 0.35 * noise(p.co.y * 12.0, p.co.z * 12.0, 1.0))  # noqa: F821
        bind(arm, part, at, bone + tag)  # noqa: F821

    def coverts(a, b, n, drop, long, wide, lift, base, edge, bones, spotted=0.0, ventral=False, seed=0.0):
        """A row of coverts over the roots of the flight feathers, each overlapping the next; on the back of the wing,
        or with `ventral`, under it."""
        for i in range(n):
            u = (i + 0.5) / n
            at = mark(part)  # noqa: F821
            root = S(lerp(a, b, u) + V(-lift if not ventral else lift, 0, -drop))
            white = spotted > 0.0 and rnd(i, seed) < spotted  # noqa: F821

            def colours(t, base=base, edge=edge, white=white):
                c = mix(base, UMBER, 0.45 * smooth((0.6 - abs(t - 0.45)) / 0.3) * smooth((t - 0.15) / 0.2))
                c = mix(c, mix(base, edge, 0.5), smooth((t - 0.8) / 0.15))
                if white:
                    c = mix(c, WHITE, 0.85 * smooth((t - 0.62) / 0.08) * smooth((0.95 - t) / 0.06))
                return c
            feather(root, V(0, side * 0.08 * (u - 0.5), -1.0), V(0, side, 0), long, wide, 0.1, colours, 4,
                    bend=VENTRAL if not ventral else -VENTRAL, quill=0.004, shape=0.3)
            bone = bones[min(len(bones) - 1, int(u * len(bones)))]
            bind(arm, part, at, bone + tag)  # noqa: F821

    # The back of the wing: small coverts at its edge, then the median coverts with their white spots, and the long
    # greater coverts over the roots of the flight feathers.
    coverts(SHOULDER + V(0, 0.06, 0), ELBOW, 6, 0.0, 0.22, 0.07, 0.05, RUSSET, BUFF, ['tert'], seed=1.0)
    coverts(SHOULDER + V(0, 0.06, 0), ELBOW, 5, 0.12, 0.34, 0.08, 0.04, RUSSET_DEEP, BUFF, ['tert'], spotted=0.6, seed=2.0)
    coverts(SHOULDER + V(0, 0.1, 0), ELBOW, 4, 0.26, 0.5, 0.09, 0.03, RUSSET, BUFF, ['tert'], seed=3.0)
    coverts(ELBOW, WRIST, 9, 0.0, 0.2, 0.06, 0.05, RUSSET, BUFF, ['sec1', 'sec2', 'sec3'], seed=4.0)
    coverts(ELBOW, WRIST, 8, 0.1, 0.32, 0.075, 0.04, RUSSET_DEEP, BUFF, ['sec1', 'sec2', 'sec3'], spotted=0.55, seed=5.0)
    coverts(ELBOW, WRIST, 7, 0.24, 0.48, 0.085, 0.03, RUSSET, CREAM, ['sec1', 'sec2', 'sec3'], seed=6.0)
    coverts(WRIST, HAND + V(0, 0.05, 0), 5, 0.0, 0.2, 0.06, 0.045, RUSSET, BUFF, PRIMS, seed=7.0)
    coverts(WRIST, HAND + V(0, 0.05, 0), 5, 0.12, 0.42, 0.075, 0.03, RUSSET_DEEP, BUFF, PRIMS, seed=8.0)
    # Under the wing it is pale: the coverts there buff with dark tips.
    coverts(SHOULDER + V(0, 0.08, 0), ELBOW, 4, 0.06, 0.48, 0.1, 0.03, CREAM, BUFF, ['tert'], ventral=True, seed=9.0)
    coverts(ELBOW, WRIST, 7, 0.06, 0.46, 0.09, 0.03, CREAM, BUFF, ['sec1', 'sec2', 'sec3'], ventral=True, seed=10.0)
    coverts(WRIST, HAND, 4, 0.04, 0.4, 0.08, 0.03, CREAM, UMBER, PRIMS, ventral=True, seed=11.0)

    # The tertials, on the upper arm, by the body.
    at = mark(part)  # noqa: F821
    for i in range(4):
        root = S(lerp(SHOULDER, ELBOW, 0.22 + 0.21 * i) + V(0.0, 0, -0.06))
        feather(root, V(0, -side * 0.12, -1.0), V(0, side, 0), 0.78 + 0.04 * i, 0.09, 0.08,
                lambda t, i=i: barred(t, RUSSET, UMBER, 3.5, 0.2 * i, BUFF), 10, bend=VENTRAL)
    bind(arm, part, at, 'tert' + tag)  # noqa: F821
    # The secondaries along the forearm: broad, barred in brown, with pale tips.
    for g, u0 in enumerate(SEC_AT):
        at = mark(part)  # noqa: F821
        for i in range(4):
            u = min(1.0, max(0.0, u0 - 0.15 + 0.1 * i))
            root = S(lerp(ELBOW, WRIST, u) + V(0.0, 0, -0.05))
            feather(root, V(0, side * 0.1 * (u - 0.3), -1.0), V(0, side, 0), 1.06 - 0.08 * u, 0.1, 0.07,
                    lambda t, u=u: barred(t, mix(RUSSET, BUFF, 0.15), UMBER, 4.0, 0.3 * u, CREAM), 12, bend=VENTRAL)
        bind(arm, part, at, 'sec%d%s' % (g + 1, tag))  # noqa: F821
    # The primaries from the hand, each finger with a bone of its own; the outer ones narrow at their tips.
    for k, u in enumerate(PRIM_AT):
        at = mark(part)  # noqa: F821
        root = lerp(WRIST, HAND, u) + V(0.0, 0, -0.02)
        d = prim_dir(k)
        across = V(0, d.z, -d.y) * -1.0
        feather(S(root), S(d), S(across), PRIM_LONG[k], 0.11 - 0.012 * (k > 3), 0.06,
                lambda t, k=k: barred(t, mix(RUSSET, BUFF, 0.25), UMBER, 4.5, 0.15 * k, mix(BUFF, UMBER, 0.3)), 12, bend=VENTRAL,
                finger=0.45 if k >= 2 else 0.0)
        if k < 4:
            d2 = prim_dir(k, spread=0.88)
            across2 = V(0, d2.z, -d2.y) * -1.0
            feather(S(root + V(-0.01, 0.03, 0.01)), S(d2), S(across2), PRIM_LONG[k] - 0.04, 0.1, 0.06,
                    lambda t, k=k: barred(t, mix(RUSSET, BUFF, 0.2), UMBER, 4.5, 0.15 * k + 0.5, mix(BUFF, UMBER, 0.3)), 12,
                    bend=VENTRAL, finger=0.3 if k >= 2 else 0.0)
        bind(arm, part, at, 'prim%d%s' % (k + 1, tag))  # noqa: F821

# --- the tail: short, round and barred, in a fan ----------------------------------------------------------------------
for i in range(12):
    k = (i - 5.5) / 5.5
    at = mark(part)  # noqa: F821
    a = k * 0.42
    d = (TAIL_DIR * math.cos(a) + V(0, 1, 0) * math.sin(a)).normalized()
    root = TAIL_ROOT + V(0, k * 0.1, 0) + TAIL_UP * (0.01 * (1.0 - abs(k)))
    across = d.cross(TAIL_UP).normalized()
    feather(root, d, across, 0.6 - 0.07 * abs(k) ** 2, 0.075, -0.05,
            lambda t, i=i: barred(t, mix(RUSSET, BUFF, 0.2), UMBER, 4.0, 0.08 * i, mix(BUFF, CREAM, 0.4)), 10, bend=-TAIL_UP)
    if k > 0.5:
        bind(arm, part, at, 'tailfan.L')  # noqa: F821
    elif k < -0.5:
        bind(arm, part, at, 'tailfan.R')  # noqa: F821
    else:
        bind(arm, part, at, 'tail')  # noqa: F821

# --- the legs: thick with feathers to its toes, and dark talons ----------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    def S(v):
        return V(v.x, v.y * side, v.z)

    path = []
    radii = []
    for k in range(5):
        path.append(S(lerp(HIP, KNEE, k / 5.0)))
        radii.append(0.13 - 0.03 * k / 5.0)
    for k in range(6):
        path.append(S(lerp(KNEE, ANKLE, k / 5.0)))
        radii.append(0.1 - 0.035 * smooth(k / 5.0))
    at = mark(part)  # noqa: F821
    made = tube(part, path, radii, [BUFF] * len(path), 12)  # noqa: F821
    for ring in made:
        for p in ring:
            fl = noise(p.co.x * 18.0, p.co.y * 18.0, p.co.z * 18.0)  # noqa: F821
            centre = S(V(ANKLE.x, ANKLE.y, p.co.z))
            p.co = p.co + (p.co - centre) * 0.12 * (fl - 0.5)
            bar = smooth((math.sin(p.co.z * 70.0) - 0.7) / 0.3)
            part['paint'][p] = mix(mix(BUFF, CREAM, 0.4 * fl), RUSSET_DEEP, 0.35 * bar)
    bind(arm, part, at, ['thigh' + tag, 'tarsus' + tag], blend=0.06)  # noqa: F821
    # Two toes forward and two back, feathered pale nearly to their ends, each with a curved dark talon.
    for bone, turns in (('foot', (-20.0, 22.0)), ('hind', (172.0, 128.0))):
        at = mark(part)  # noqa: F821
        for turn in turns:
            a = math.radians(turn)
            d = V(math.cos(a), math.sin(a) * side, 0.0)
            long = 0.19 if bone == 'foot' else 0.15
            base = S(ANKLE)
            tip = base + d * long + V(0, 0, -0.055)
            tube(part, [base, base + d * long * 0.5 + V(0, 0, -0.035), tip], [0.045, 0.035, 0.026], [TOE, TOE, mix(TOE, BUFF, 0.4)], 8)  # noqa: F821
            tube(part, [tip, tip + d * 0.045 + V(0, 0, -0.01), tip + d * 0.065 + V(0, 0, -0.05)], [0.02, 0.013, 0.002],  # noqa: F821
                 [TALON, TALON, TALON], 6)
        bind(arm, part, at, bone + tag)  # noqa: F821

skinned(arm, part, 'owl-body', strength=0.45, reach=0.3, leaf=True)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------

def turned(pitch, yaw=0.0, roll=0.0):
    """A turn about the bone's own X, then about its own Y as that leaves it, then its own Z: a head pitched and then
    turned about its own upright, and tilted about its face. As (x, y, z) degrees for the clips."""
    m = Matrix.Rotation(math.radians(pitch), 3, 'X') @ Matrix.Rotation(math.radians(yaw), 3, 'Y') @ Matrix.Rotation(math.radians(roll), 3, 'Z')
    e = m.to_euler('XYZ')
    return (math.degrees(e.x), math.degrees(e.y), math.degrees(e.z))


def look(yaw=0.0, nod=0.0, tilt=0.0, pitch=0.0):
    """Its head turned `yaw` degrees to its left (negative: to its right, towards the camera in flight), nodded and
    tilted; a third of the turn in its neck. `pitch` is how far its neck and head hold it up against its body's tip."""
    return {'neck': turned(pitch * 0.5, yaw * 0.32, 0.0), 'head': turned(pitch * 0.5 + nod, yaw * 0.68, tilt)}


def lids(shut, right=None):
    """Its lids, from 0 (open) to 1 (shut); the right one may be given its own."""
    out = {'lid.L': (-LID_OPEN * shut, 0, 0)}
    out['lid.R'] = (-LID_OPEN * (shut if right is None else right), 0, 0)
    return out


def folded(open_=0.0):
    """Its wings folded along its sides, the hand and the flight feathers lying back and down over its flanks and the
    root of its tail. Given in the body's own space ('of': 'body'), so that they go with it as it leans. `open_` lifts
    them away from its sides a little, half open, as when it cannot spread them."""
    o = open_

    def d(x, y, z):
        return tuple(V(x, y, z).normalized())
    out = {
        'upperarm.L': {'dir': d(-0.42 + 0.3 * o, 0.12 + 0.5 * o, -0.9 + 0.3 * o), 'up': d(-0.2, 0.97, 0.1), 'of': 'body'},
        'forearm.L': {'dir': d(0.86 - 0.3 * o, 0.06 + 0.5 * o, 0.5 + 0.1 * o), 'up': d(-0.1, 0.99, -0.1 - 0.3 * o), 'of': 'body'},
        'hand.L': {'dir': d(-0.55, -0.02 + 0.5 * o, -0.83 + 0.3 * o), 'up': d(-0.3 - 0.3 * o, 0.95, 0.0), 'of': 'body'},
        'tert.L': {'dir': d(-0.15, -0.3 + 0.3 * o, -0.94), 'up': d(-0.8, 0.6, 0.05), 'of': 'body', 'scale': 0.85 + 0.15 * o},
    }
    # Round its flank: the feathers further back face further back, so that the folded wing wraps the body.
    for i in range(3):
        out['sec%d.L' % (i + 1)] = {'dir': d(-0.22 + 0.06 * i, -0.02 + 0.25 * o, -0.97), 'up': d(-0.5 + 0.22 * i, 0.9, 0.0), 'of': 'body',
                                   'scale': 0.86 + 0.14 * o}
    for k in range(6):
        out['prim%d.L' % (k + 1)] = {'dir': d(-0.45 + 0.02 * k, -0.06 + 0.3 * o + 0.03 * o * k, -0.89), 'up': d(-0.45, 0.89, 0.0), 'of': 'body'}
    return out


LEGS = {'thigh.L': (0, 0, 0), 'tarsus.L': (0, 0, 0), 'foot.L': (0, 0, 0), 'hind.L': (0, 0, 0)}
TAIL_REST = {'tail': (0, 0, 0), 'tailfan.L': (0, 0, 0)}
SIT = {'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'plume': {'rot': (0, 0, 0), 'scale': 1.0}}


def perched(extra=None, open_=0.0):
    return over(SIT, look(), lids(0.0), TAIL_REST, LEGS, folded(open_), extra or {})


def breathe(k):
    """In (1) or out (0)."""
    return {'plume': {'rot': (0, 0, 0), 'scale': 1.0 + 0.018 * k}, 'body': {'loc': (0, 0.008 * k, 0), 'rot': (0.6 * k, 0, 0)}}


# --- the wingbeat ----------------------------------------------------------------------------------------------------
# A beat from the top: the downstroke, deep and slow, to frame 14 of 24; the upstroke, the hand folded at its wrist,
# the rest. Angles as the crane's (art/blender/crane.py): for a left wing, X beats it up, Z sweeps it back.

def beat(phase, far=True, scale=1.0):
    if phase == 'top':
        return {'upperarm': ((52 if far else 6) * scale, 0, 4), 'forearm': (8, 0, 12), 'hand': (-12, 6, 22), 'spread': 0.7, 'tip': 6}
    if phase == 'mid-down':
        return {'upperarm': ((8 if far else 0) * scale, 0, -8), 'forearm': (2, 0, -4), 'hand': (14 if far else 6, -4, -6), 'spread': 1.12,
                'tip': 12 if far else 0}
    if phase == 'bottom':
        return {'upperarm': (-44 * scale, 0, -6), 'forearm': (-6, 0, -6), 'hand': (-10, 0, 0), 'spread': 1.08, 'tip': -4}
    return {'upperarm': ((-6 if far else -14) * scale, 0, 6), 'forearm': (6, 0, 30), 'hand': (-28, 12, 48), 'spread': 0.5, 'tip': -12}


def wing(tag, b):
    out = {'upperarm' + tag: b['upperarm'], 'forearm' + tag: b['forearm'], 'hand' + tag: b['hand']}
    for k in range(6):
        # Spread: each finger turned back from its place at rest; closed, they come together.
        out['prim%d%s' % (k + 1, tag)] = (b['tip'] * (0.5 + 0.1 * k), 0, PRIM_TURN[k] * (b['spread'] - 1.0))
    for i in range(3):
        out['sec%d%s' % (i + 1, tag)] = {'rot': (b['tip'] * 0.3, 0, 0), 'scale': 1.0}
    out['tert' + tag] = {'rot': (b['tip'] * 0.2, 0, 0), 'scale': 1.0}
    return out


def wings(far_b, near_b):
    """The far wing (.L) in `far_b`, the near wing (.R, towards the camera) in `near_b`, both given as for a left wing."""
    out = wing('.L', far_b)
    for bone, value in wing('.R', near_b).items():
        if isinstance(value, dict):
            r = value['rot']
            out[bone] = dict(value, rot=(r[0], -r[1], -r[2]))
        else:
            out[bone] = (value[0], -value[1], -value[2])
    return out


TUCKED = {'thigh.L': (48, 0, 0), 'tarsus.L': (62, 0, 0), 'foot.L': (-55, 0, 0), 'hind.L': (-50, 0, 0)}
FLIGHT_TAIL = {'tail': (-28, 0, 0), 'tailfan.L': (0, 0, 0)}
CAMERA = -22.0


def flight(extra=None, bob=0.0, pitch=0.0, yaw=CAMERA, tail=None):
    """Its body level, pitched forward onto its breast, its head held up against it and turned a little to the camera,
    its feet tucked under its tail."""
    return over({'body': {'loc': (0, bob, 0), 'rot': (-86 + pitch, 0, 0)}, 'plume': {'rot': (0, 0, 0), 'scale': 1.0}},
                look(yaw, 0.0, 0.0, 86 - pitch), lids(0.0), tail or FLIGHT_TAIL, TUCKED, extra or {})


FLY = [(0, 'top', -0.03, 2.0), (7, 'mid-down', 0.0, 0.0), (14, 'bottom', 0.05, -2.0), (19, 'mid-up', 0.02, 0.0)]
clip(arm, 'fly', 24, [(f, flight(wings(beat(p), beat(p)), bob, pitch)) for f, p, bob, pitch in FLY])  # noqa: F821
# Carrying him: the near wing rises only to about level, the beat a little shallower, its back steadier.
clip(arm, 'carry', 24, [(f, flight(wings(beat(p, scale=0.9), beat(p, far=False, scale=0.9)), bob * 0.5, pitch * 0.5, CAMERA - 6.0))  # noqa: F821
                        for f, p, bob, pitch in FLY])

# Gliding, its far wing a little up and its near one a little down, so that the camera, a little above it, sees the
# top of both, and neither hides a rider.
GLIDE = {'upperarm': (9, 0, 0), 'forearm': (0, 0, -3), 'hand': (4, 0, 3), 'spread': 1.22, 'tip': 10}
GLIDE2 = {'upperarm': (12, 0, 2), 'forearm': (1, 0, 0), 'hand': (6, 0, 1), 'spread': 1.26, 'tip': 13}
GLIDE_NEAR = {'upperarm': (-7, 0, 0), 'forearm': (0, 0, -3), 'hand': (6, 0, 3), 'spread': 1.22, 'tip': 10}
GLIDE2_NEAR = {'upperarm': (-5, 0, 2), 'forearm': (1, 0, 0), 'hand': (8, 0, 1), 'spread': 1.26, 'tip': 13}
SPREAD_TAIL = {'tail': (-26, 0, 0), 'tailfan.L': (0, 0, -18)}
clip(arm, 'glide', 48, [  # noqa: F821
    (0, flight(over(wings(GLIDE, GLIDE_NEAR), {'body': {'loc': (0, 0, 0), 'rot': (-86, 2, 0)}}), tail=SPREAD_TAIL)),
    (24, flight(over(wings(GLIDE2, GLIDE2_NEAR), {'body': {'loc': (0, 0.015, 0), 'rot': (-85, -2, 0)}}), yaw=CAMERA - 8.0, tail=SPREAD_TAIL)),
])

# --- sitting: breathing, blinks, its head turned far round, a tilt, a fluff and a shake ------------------------------
SLEEPY = 0.18


def sit(f, extra=None):
    return (f, perched(over(lids(SLEEPY), extra or {})))


clip(arm, 'perch', 288, [  # noqa: F821
    sit(0, breathe(0)),
    sit(30, breathe(1)),
    # A slow blink.
    sit(40, over(breathe(0.6), lids(SLEEPY))),
    sit(45, over(breathe(0.4), lids(1.0))),
    sit(49, over(breathe(0.3), lids(1.0))),
    sit(56, over(breathe(0.1), lids(SLEEPY))),
    # It looks to its left, and holds it.
    sit(70, over(breathe(0.4), look(70, 4))),
    sit(78, over(breathe(0.8), look(84, 6))),
    sit(104, over(breathe(0.2), look(84, 6))),
    # Back to the front, and a tilt of its head, as owls do.
    sit(120, over(breathe(0.6), look(0, -2))),
    sit(130, over(breathe(1.0), look(-6, 4, 22))),
    sit(146, over(breathe(0.5), look(-4, 4, 24))),
    sit(156, over(breathe(0.2), look(0, 0, 0), lids(SLEEPY))),
    # A double blink.
    sit(160, over(breathe(0.1), lids(0.95))),
    sit(163, over(breathe(0.1), lids(0.2))),
    sit(166, over(breathe(0.1), lids(0.95))),
    sit(170, over(breathe(0.2), lids(SLEEPY))),
    # It turns its head to its right, and on round, far, to look behind it; and back again.
    sit(184, over(breathe(0.6), look(-90, 0))),
    sit(196, over(breathe(0.9), look(-172, 2))),
    sit(212, over(breathe(0.7), look(-172, 2))),
    sit(228, over(breathe(0.3), look(-60, 0))),
    sit(236, over(breathe(0.1), look(0, 0))),
    # A fluff, all its feathers out, and a shake.
    sit(246, over({'plume': {'rot': (0, 0, 0), 'scale': 1.1}, 'body': {'loc': (0, 0.03, 0), 'rot': (0, 0, 0)}}, look(0, -6), lids(0.3))),
    sit(250, over({'plume': {'rot': (0, 4, 0), 'scale': 1.11}}, look(14, -6, 6), lids(0.3))),
    sit(253, over({'plume': {'rot': (0, -4, 0), 'scale': 1.1}}, look(-14, -6, -6), lids(0.3))),
    sit(256, over({'plume': {'rot': (0, 3, 0), 'scale': 1.09}}, look(10, -4, 4), lids(0.3))),
    sit(259, over({'plume': {'rot': (0, -2, 0), 'scale': 1.07}}, look(-6, -2, -2), lids(0.3))),
    sit(270, over(breathe(0.4), look(0, 0))),
])


# --- trapped in its hollow: it pushes at the branch, its wings pinned half open, then rests and looks out --------------
def strain(f, lean, open_, flutter, extra=None):
    return (f, perched(over({'body': {'loc': (0, 0, -0.04 * lean), 'rot': (-14 * lean, 0, 0)}}, look(0, -10 * lean, 0, 14 * lean), lids(0.0),
                            {'tail': (10 * lean, 0, 0), 'tailfan.L': (0, 0, -10 * open_)}, extra or {}), open_=open_ + flutter))


clip(arm, 'trapped', 96, [  # noqa: F821
    strain(0, 0.0, 0.0, 0.0, lids(0.4)),
    strain(6, 0.6, 0.25, 0.0),
    strain(9, 1.0, 0.45, 0.12),
    strain(12, 1.0, 0.45, -0.1),
    strain(15, 0.9, 0.45, 0.12),
    strain(18, 1.0, 0.45, -0.1),
    strain(21, 0.9, 0.45, 0.12),
    strain(24, 1.0, 0.4, -0.08, look(10, -10, 0, 14)),
    strain(28, 0.4, 0.15, 0.0, look(14, 0)),
    strain(36, 0.0, 0.0, 0.0, over(look(10, 4, -8), lids(0.45))),
    strain(46, 0.0, 0.0, 0.0, over(look(-30, 6, 6), lids(0.5))),
    strain(58, 0.0, 0.0, 0.0, over(look(-30, 6, 6), lids(0.5))),
    strain(64, 0.5, 0.2, 0.0, look(-6, -6)),
    strain(67, 1.0, 0.45, 0.12),
    strain(70, 1.0, 0.45, -0.1),
    strain(73, 0.9, 0.45, 0.12),
    strain(76, 1.0, 0.45, -0.1),
    strain(80, 0.5, 0.2, 0.0),
    strain(88, 0.0, 0.0, 0.0, lids(0.4)),
])

# --- freed: a shake, its feathers ruffled out and smoothed, its wings shaken out, wide awake ---------------------------
clip(arm, 'freed', 36, [  # noqa: F821
    (0, perched(over(lids(0.4), look(0, 0)))),
    (4, perched(over({'plume': {'rot': (0, 0, 0), 'scale': 1.12}}, look(0, -8), lids(0.0)))),
    (7, perched(over({'plume': {'rot': (0, 6, 0), 'scale': 1.13}}, look(22, -6, 10)), open_=0.35)),
    (10, perched(over({'plume': {'rot': (0, -6, 0), 'scale': 1.13}}, look(-22, -6, -10)), open_=0.6)),
    (13, perched(over({'plume': {'rot': (0, 5, 0), 'scale': 1.12}}, look(16, -4, 8)), open_=0.35)),
    (16, perched(over({'plume': {'rot': (0, -4, 0), 'scale': 1.1}}, look(-12, -2, -6)), open_=0.55)),
    (20, perched(over({'plume': {'rot': (0, 0, 0), 'scale': 1.05}}, look(0, 0), lids(0.0)), open_=0.1)),
    (26, perched(over({'plume': {'rot': (0, 0, 0), 'scale': 1.0}}, look(8, 6, -6), lids(0.0)))),
    (36, perched(over(look(0, 0), lids(0.0)))),
], loop=False)


# --- taking off: a crouch, the push off its feet, wings up, the first strong beats, tipping forward -------------------
def legs_push(k):
    return {'thigh.L': (-18 * k, 0, 0), 'tarsus.L': (-10 * k, 0, 0), 'foot.L': (-20 * k, 0, 0), 'hind.L': (-20 * k, 0, 0)}


clip(arm, 'takeoff', 20, [  # noqa: F821
    (0, perched(look(0, 0))),
    (4, over(perched(over({'body': {'loc': (0, -0.12, 0), 'rot': (-26, 0, 0)}}, look(0, -6, 0, 20), lids(0.0)), open_=0.3),
             {'thigh.L': (24, 0, 0), 'tarsus.L': (-30, 0, 0)})),
    (8, over({'body': {'loc': (0, 0.22, -0.08), 'rot': (-52, 0, 0)}, 'plume': {'rot': (0, 0, 0), 'scale': 1.0}}, look(0, 0, 0, 50), lids(0.0),
             wings(beat('top', scale=1.15), beat('top', scale=1.15)), FLIGHT_TAIL, legs_push(0.6))),
    (12, over({'body': {'loc': (0, 0.42, -0.12), 'rot': (-72, 0, 0)}, 'plume': {'rot': (0, 0, 0), 'scale': 1.0}}, look(CAMERA * 0.5, 0, 0, 72), lids(0.0),
              wings(beat('bottom', scale=1.15), beat('bottom', scale=1.15)), FLIGHT_TAIL, legs_push(1.0))),
    (16, flight(wings(beat('mid-up'), beat('mid-up')), 0.35, 4)),
    (20, flight(wings(beat('top'), beat('top')), 0.2, 2)),
], loop=False)


# --- landing: pitching up, talons forward and spread, wings cupped and braking, touchdown, folded ----------------------
def reaching(f):
    """Its legs swung forward under it, ready to grip: `f` from 0 (tucked) to 1 (talons out in front, spread)."""
    return {'thigh.L': (48 + 22 * f, 0, 0), 'tarsus.L': (62 - 52 * f, 0, 0), 'foot.L': (-55 + 95 * f, 0, 0), 'hind.L': (-50 + 90 * f, 0, 0)}


CUPPED = {'upperarm': (30, 0, -20), 'forearm': (6, 0, -12), 'hand': (-30, -6, -8), 'spread': 1.28, 'tip': -8}
BRAKE = {'upperarm': (48, 0, -30), 'forearm': (4, 0, -14), 'hand': (-24, 0, -12), 'spread': 1.32, 'tip': 6}
clip(arm, 'land', 30, [  # noqa: F821
    (0, flight(wings(GLIDE, GLIDE_NEAR), tail=SPREAD_TAIL)),
    (6, over(flight(wings(CUPPED, CUPPED), 0.0, 22, CAMERA * 0.6, tail=SPREAD_TAIL), reaching(0.5))),
    (11, over(flight(wings(BRAKE, BRAKE), 0.0, 52, CAMERA * 0.3, tail={'tail': (-50, 0, 0), 'tailfan.L': (0, 0, -22)}), reaching(0.95))),
    (15, over(flight(wings(BRAKE, BRAKE), 0.0, 70, 0.0, tail={'tail': (-30, 0, 0), 'tailfan.L': (0, 0, -22)}), reaching(1.0))),
    # Touchdown: its feet on the ground, its knees taking its weight, its wings still up.
    (19, over(perched(over({'body': {'loc': (0, -0.07, 0), 'rot': (-8, 0, 0)}}, look(0, -4))), wings(CUPPED, CUPPED))),
    (24, perched(over({'body': {'loc': (0, -0.03, 0), 'rot': (-3, 0, 0)}}, look(0, 0)), open_=0.5)),
    (30, perched(look(0, 0))),
], loop=False)

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'owl': {'perch': [0, 47, 78, 130, 196, 250], 'trapped': [0, 9, 12, 46, 70], 'freed': [0, 7, 10, 20, 36],
                          'takeoff': [0, 4, 8, 12, 16, 20], 'fly': [0, 7, 14, 19], 'carry': [0, 7, 14, 19], 'glide': [0, 24],
                          'land': [0, 6, 11, 15, 19, 24, 30]}}
