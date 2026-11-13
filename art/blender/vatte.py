"""The little forest beings, vattar (src/render/lift/fauna.ts, beings): small round moss creatures with a leaf or a tuft
of lichen for a cap, soft dark eyes, a nose of bark, a small smile and twig arms. They peek out from behind stones and
stumps and duck when Elof comes near; shy and friendly, now and then one of them waves. A child's drawing of a vatte:
curious and kind. Made with art/blender/kit-tools.py and art/blender/creature-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/vatte.py --out=art/baked/boot/vatte.glb
    node scripts/bake/blender-kit.mjs art/blender/vatte.py --fast --preview=<folder>

Units: the being is built at the size of the game's code-built one (src/render/lift/fauna/shapes.ts being): about 0.55
tall with its cap, and the game draws it 1.35 times that. Z is up, it faces +X, and the camera's side is -Y (its right:
the '.R' bones). Its rest pose is peeking: its eyes just over the top of its stone where the game stands it.

It wears both caps, each on a bone of its own: the game shrinks the one it does not wear (a leaf in the forest, lichen
on the bog and the mountain). Its lids are a bone each, stretched down over its eyes to close them. The clips, each
named 'vatte:<clip>':
    peek    up behind its stone, looking about, leaning, blinking now and then                         (loop)
    hide    ducked down behind it, eyes shut tight, trembling a little                                  (loop)
    blink   up, still, watching him with a slow curious blink and a tilt of its head                    (loop)
    wave    up, waving its left twig hand, its head tilted and its eyes smiling                         (loop)
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Vector

MOSS = tone('#5e7a3a')        # noqa: F821 (kit-tools.py)
MOSS_DARK = tone('#4a6430')   # noqa: F821
MOSS_TIP = tone('#7f9a48')    # noqa: F821
FACE = tone('#93a65e')        # noqa: F821
BARK = tone('#6b5a44')        # noqa: F821
BARK_DARK = tone('#55473a')   # noqa: F821
TWIG = tone('#5a4a38')        # noqa: F821
EYE = tone('#24211d')         # noqa: F821
SHINE = tone('#eef0e2')       # noqa: F821
NOSE = tone('#76624a')        # noqa: F821
SMILE = tone('#3a3428')       # noqa: F821
LEAF = tone('#6f8f3a')        # noqa: F821
LEAF_RIB = tone('#94ac5a')    # noqa: F821
LICHEN = tone('#aab49c')      # noqa: F821
LICHEN_DARK = tone('#8e9a82')  # noqa: F821

HIDE = 0.34
TAU = math.pi * 2.0


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


def V(x, y, z):
    return Vector((x, y, z))


def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


EYE_AT = V(0.19, 0.066, 0.322)
BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.1), {'deform': False}),
    ('body', 'root', (0, 0, 0.04), (0, 0, 0.24)),
    ('head', 'body', (0, 0, 0.24), (0, 0, 0.46), {'connect': True}),
    ('lid.L', 'head', (EYE_AT.x + 0.004, EYE_AT.y, EYE_AT.z + 0.058), (EYE_AT.x + 0.004, EYE_AT.y, EYE_AT.z - 0.058)),
    ('arm.L', 'body', (0.03, 0.15, 0.23), (0.08, 0.30, 0.12)),
    ('hand.L', 'arm.L', (0.08, 0.30, 0.12), (0.10, 0.355, 0.08), {'connect': True}),
    ('cap.leaf', 'head', (0, 0, 0.47), (0, 0, 0.56)),
    ('cap.lichen', 'head', (0, 0, 0.47), (0, 0, 0.56)),
]
arm = armature('vatte', BONES)  # noqa: F821
part = new_part()  # noqa: F821

# --- the body: bark below, a round mound of moss over it, its tufts lighter at the tips ------------------------------
at = mark(part)  # noqa: F821
made = lump(part, V(0, 0, 0.13), (0.21, 0.2, 0.13), 3, BARK)  # noqa: F821
for pt in made:
    k = noise(pt.co.x * 24.0, pt.co.y * 24.0, pt.co.z * 24.0)  # noqa: F821
    pt.co.z = max(0.0, pt.co.z)
    part['paint'][pt] = lit(mix(BARK, BARK_DARK, k), 0.95 + 0.1 * k)  # noqa: F821
# Two stubby feet of bark.
for side in (1.0, -1.0):
    lump(part, V(0.1, 0.09 * side, 0.03), (0.07, 0.045, 0.035), 2, BARK_DARK)  # noqa: F821
bind(arm, part, at, 'body')  # noqa: F821

at = mark(part)  # noqa: F821
CENTRE = V(0, 0, 0.28)
made = lump(part, CENTRE, (0.205, 0.195, 0.23), 4, MOSS)  # noqa: F821
for pt in made:
    d = pt.co - CENTRE
    n = d.normalized()
    k = noise(pt.co.x * 30.0 + 3.0, pt.co.y * 30.0, pt.co.z * 30.0)  # noqa: F821
    tuft = noise(pt.co.x * 70.0, pt.co.y * 70.0 + 5.0, pt.co.z * 70.0)  # noqa: F821
    pt.co = pt.co + n * (0.022 * (k - 0.5) + 0.012 * (tuft - 0.5))
    c = mix(MOSS, MOSS_DARK, smooth((0.5 - k) / 0.3) * 0.6)
    c = mix(c, MOSS_TIP, smooth((tuft - 0.6) / 0.25))
    part['paint'][pt] = c
bind(arm, part, at, ['body', 'head'], blend=0.06)  # noqa: F821

# --- the face: a paler patch, soft dark eyes with a speck of light, a nose of bark and a small smile ---------------
at = mark(part)  # noqa: F821
made = lump(part, V(0.14, 0, 0.3), (0.085, 0.15, 0.115), 3, FACE)  # noqa: F821
for pt in made:
    k = noise(pt.co.x * 40.0, pt.co.y * 40.0, pt.co.z * 40.0)  # noqa: F821
    part['paint'][pt] = lit(FACE, 0.94 + 0.12 * k)  # noqa: F821
for side in (1.0, -1.0):
    eye = V(EYE_AT.x, EYE_AT.y * side, EYE_AT.z)
    lump(part, eye, (0.034, 0.04, 0.054), 2, EYE)  # noqa: F821
    lump(part, eye + V(0.028, 0.008 * side, 0.02), (0.009, 0.009, 0.01), 1, SHINE)  # noqa: F821
    lump(part, eye + V(0.03, -0.01 * side, -0.014), (0.004, 0.004, 0.0045), 1, SHINE)  # noqa: F821
lump(part, V(0.215, 0, 0.27), (0.028, 0.026, 0.024), 2, NOSE)  # noqa: F821
smile = [V(0.196, -0.036, 0.243), V(0.205, -0.018, 0.232), V(0.208, 0.0, 0.229), V(0.205, 0.018, 0.232), V(0.196, 0.036, 0.243)]
tube(part, smile, [0.003, 0.0045, 0.0045, 0.0045, 0.003], [SMILE] * 5, 5)  # noqa: F821
bind(arm, part, at, 'head')  # noqa: F821

# Its lids: the colour of its face, as big as its eyes and a little over, stretched down from above them to close.
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    eye = V(EYE_AT.x + 0.004, EYE_AT.y * side, EYE_AT.z)
    made = lump(part, eye, (0.036, 0.044, 0.058), 2, FACE)  # noqa: F821
    for pt in made:
        part['paint'][pt] = lit(FACE, 0.9)  # noqa: F821
    # A line of lashes along its edge: darker at the bottom of the lid.
    for pt in made:
        if pt.co.z < eye.z - 0.036:
            part['paint'][pt] = lit(MOSS_DARK, 0.8)  # noqa: F821
    bind(arm, part, at, 'lid' + tag)  # noqa: F821

# --- the twig arms, each with three twig fingers ---------------------------------------------------------------------
for side, tag in ((1.0, '.L'), (-1.0, '.R')):
    at = mark(part)  # noqa: F821
    tube(part, [V(0.02, 0.12 * side, 0.24), V(0.055, 0.22 * side, 0.175), V(0.08, 0.30 * side, 0.12)], [0.026, 0.021, 0.017],  # noqa: F821
         [TWIG, TWIG, TWIG], 7)
    # A little side twig with a bud, on the forearm.
    tube(part, [V(0.055, 0.22 * side, 0.175), V(0.07, 0.25 * side, 0.215)], [0.009, 0.004], [TWIG, TWIG], 4)  # noqa: F821
    lump(part, V(0.072, 0.252 * side, 0.222), (0.013, 0.013, 0.017), 1, MOSS_TIP)  # noqa: F821
    bind(arm, part, at, 'arm' + tag)  # noqa: F821
    at = mark(part)  # noqa: F821
    tube(part, [V(0.08, 0.30 * side, 0.12), V(0.10, 0.355 * side, 0.08)], [0.017, 0.015], [TWIG, TWIG], 7)  # noqa: F821
    # A tuft of moss at the wrist, and three twig fingers spread out from it.
    lump(part, V(0.095, 0.345 * side, 0.088), (0.022, 0.022, 0.02), 2, MOSS)  # noqa: F821
    for k, spread in enumerate((-0.55, 0.0, 0.55)):
        root = V(0.10, 0.355 * side, 0.08)
        d = V(0.25 + 0.65 * spread, 0.55 * side, -0.75 + 0.25 * abs(spread)).normalized()
        tube(part, [root, root + d * 0.04, root + d * 0.075 + V(0.0, 0.0, 0.008)], [0.009, 0.007, 0.003], [TWIG, TWIG, TWIG], 5)  # noqa: F821
    bind(arm, part, at, 'hand' + tag)  # noqa: F821

# --- the caps: a leaf with its stalk, or a tuft of lichen ----------------------------------------------------------
at = mark(part)  # noqa: F821
made = lump(part, V(0.0, 0.0, 0.0), (0.2, 0.15, 0.022), 3, LEAF)  # noqa: F821
tilt_x = 0.15
tilt_z = 0.3
for pt in made:
    x, y, z = pt.co.x, pt.co.y, pt.co.z
    # Pointed at its tip (+X), rounded at its base; its edges curling down over the head, its tip up.
    taper = max(0.0, 1.0 - max(0.0, x) / 0.2) ** 0.75 if x > 0 else 1.0 - 0.25 * (x / 0.2) ** 2
    y *= taper
    z += -0.05 * (y / 0.15) ** 2 + 0.03 * max(0.0, x / 0.2) ** 2
    rib = smooth(1.0 - abs(y) / 0.012)
    vein = smooth(1.0 - abs(abs(y) - 0.6 * abs(x + 0.2) * 0.5) / 0.008) * 0.4
    c = mix(LEAF, LEAF_RIB, max(rib, vein))
    c = lit(c, 0.92 + 0.12 * noise(x * 40.0, y * 40.0, 1.0))  # noqa: F821
    p = V(x, y, z)
    # Tilted as the code's leaf is: a little about X and about Z.
    cx, sx = math.cos(tilt_x), math.sin(tilt_x)
    p = V(p.x, p.y * cx - p.z * sx, p.y * sx + p.z * cx)
    cz, sz = math.cos(tilt_z), math.sin(tilt_z)
    p = V(p.x * cz - p.z * sz, p.y, p.x * sz + p.z * cz)
    pt.co = p + V(-0.01, 0.0, 0.5)
    part['paint'][pt] = c
tube(part, [V(-0.17, 0, 0.47), V(-0.19, 0, 0.53), V(-0.17, 0, 0.58)], [0.008, 0.006, 0.004], [TWIG, TWIG, TWIG], 5)  # noqa: F821
bind(arm, part, at, 'cap.leaf')  # noqa: F821

at = mark(part)  # noqa: F821
for k, (x, y, z, r) in enumerate(((0.0, 0.0, 0.5, 0.1), (0.06, 0.08, 0.48, 0.06), (-0.05, -0.07, 0.49, 0.07), (0.04, -0.03, 0.535, 0.05),
                                  (-0.07, 0.06, 0.475, 0.05), (0.09, -0.06, 0.47, 0.045))):
    made = lump(part, V(x, y, z), (r, r, r * 0.6), 2, LICHEN)  # noqa: F821
    for pt in made:
        n = noise(pt.co.x * 80.0, pt.co.y * 80.0, pt.co.z * 80.0 + k)  # noqa: F821
        pt.co = pt.co + (pt.co - V(x, y, z)).normalized() * 0.012 * (n - 0.5)
        part['paint'][pt] = mix(LICHEN, LICHEN_DARK, smooth((0.5 - n) / 0.3))
bind(arm, part, at, 'cap.lichen')  # noqa: F821

skinned(arm, part, 'vatte-body', strength=0.3, reach=0.06, floor=0.0)  # noqa: F821


# --- poses -------------------------------------------------------------------------------------------------------------
def lids(k):
    """Its lids: 0 open, 1 shut."""
    s = 0.03 + 0.97 * k
    return {'lid.L': {'rot': (0, 0, 0), 'scale': (1.0, s, 1.0)}}


ARMS_DOWN = {'arm.L': (0, 0, 0), 'hand.L': (0, 0, 0)}
UP = over({'root': (0, 0, 0), 'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 1.0}, 'head': (0, 0, 0),
           'cap.leaf': (0, 0, 0), 'cap.lichen': (0, 0, 0)}, ARMS_DOWN, lids(0.0))


def peeking(turn=0.0, tilt=0.0, lean=0.0, shut=0.0, rise=0.0, extra=None):
    """Up behind its stone: its head turned (degrees, + to its left) and tilted, its body leaning, its lids closed by `shut`."""
    return over(UP, {'body': {'loc': (0, rise, 0), 'rot': (0, 0, lean), 'scale': 1.0}, 'head': (0, turn, tilt)}, lids(shut), extra or {})


clip(arm, 'peek', 96, [  # noqa: F821
    (0, peeking()),
    (10, peeking(0, 0, 0, 0, 0.012)),
    (18, peeking(24, 6, 3)),
    (22, peeking(24, 6, 3, 1.0)),
    (25, peeking(24, 6, 3)),
    (36, peeking(26, 8, 4, 0, 0.01)),
    (48, peeking(-6, -2, 0)),
    (58, peeking(-26, -8, -4)),
    (68, peeking(-24, -6, -3, 0, 0.012)),
    (72, peeking(-24, -6, -3, 1.0)),
    (75, peeking(-24, -6, -3)),
    (86, peeking(0, 0, 0)),
])

HIDDEN = over(UP, {'body': {'loc': (0, -HIDE, 0), 'rot': (0, 0, 0), 'scale': (1.06, 0.9, 1.06)}, 'head': {'loc': (0, -0.03, 0), 'rot': (-6, 0, 0)},
                   'arm.L': (0, 0, 30)}, lids(1.0))
clip(arm, 'hide', 48, [  # noqa: F821
    (0, HIDDEN),
    (6, over(HIDDEN, {'head': {'loc': (0, -0.03, 0), 'rot': (-6, 2, 1.5)}})),
    (12, over(HIDDEN, {'head': {'loc': (0, -0.03, 0), 'rot': (-6, -2, -1.5)}})),
    (18, over(HIDDEN, {'head': {'loc': (0, -0.032, 0), 'rot': (-6, 1, 1)}})),
    (30, HIDDEN),
])

clip(arm, 'blink', 36, [  # noqa: F821
    (0, peeking(0, 0)),
    (10, peeking(0, 10, 2)),
    (14, peeking(0, 10, 2, 0.15)),
    (18, peeking(0, 11, 2, 1.0)),
    (23, peeking(0, 11, 2, 0.0)),
    (30, peeking(0, 4, 1)),
])


def waving(k, shut=0.45):
    """Its left arm up, its twig hand swinging from side to side; its head tilted towards it, its eyes smiling."""
    swing = math.sin(k)
    return peeking(8, 12, 6, shut, 0.02, {
        'arm.L': {'dir': tuple(V(0.2, 0.8, 0.56).normalized()), 'up': (0.0, -0.6, 0.8)},
        'hand.L': {'dir': tuple(V(0.2 + 0.1 * swing, 0.2 + 0.6 * swing, 0.95).normalized()), 'up': (-1.0, 0.0, 0.2)},
        'arm.R': (0, 0, 0), 'hand.R': (0, 0, 0),
    })


clip(arm, 'wave', 36, [(f, waving(TAU * 2.0 * f / 36.0)) for f in range(0, 36, 3)])  # noqa: F821

bake(arm)  # noqa: F821

PREVIEW_FRAMES = {'vatte': {'peek': [0, 18, 22, 58], 'hide': [0, 12], 'blink': [0, 18], 'wave': [0, 4, 9, 13]}}
