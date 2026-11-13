"""The small animals that live beside his way: the mallards of Myren and Flarken (a drake and a duck), the common frog of
Myren, Alven and Billsta, the hedgehog of the garden and Stormgarden, and the garden snail. Each has bones and clips of
its own, and the game gives each a little life (src/render/ambient-animals.ts). Made with art/blender/kit-tools.py and
art/blender/creature-tools.py, one animal to a file, so that the exporter writes every clip of its one armature:
    node scripts/bake/blender-kit.mjs art/blender/ambient-animals.py --only=anka --out=art/baked/aventyr2/ankor.glb
    node scripts/bake/blender-kit.mjs art/blender/ambient-animals.py --only=groda --out=art/baked/aventyr2/groda.glb
    node scripts/bake/blender-kit.mjs art/blender/ambient-animals.py --only=igelkott --out=art/baked/aventyr2/igelkott.glb
    node scripts/bake/blender-kit.mjs art/blender/ambient-animals.py --only=snigel --out=art/baked/aventyr2/snigel.glb
    node scripts/bake/blender-kit.mjs art/blender/ambient-animals.py --only=groda --fast --preview=<folder>

Units: 1 Blender unit is 1 EL; Z is up, each animal faces +X and the camera's side is -Y (its right: the '.R' bones). Each
stands on its origin (the ducks float with it at the water's face) and is as big as the one it takes the place of (it
was in art/blender/a2-creatures.py, facing -Y; the game turns these a quarter round to face as that one did). One mesh
each, its colours on its corners, skinned to its bones; the two mallards share one armature ('anka'), each its own mesh
('and', the drake, and 'and-hona', the duck), and the game shows one of them. The clips, each '<armature>:<clip>':
    anka      paddle (loop: one kick of each foot, its tail wagging), dabble (tail up, head under, feet kicking),
              preen, look, quack (bill open three times), flap (rises on the water and beats its wings)
    groda     sit (loop: breathing, its throat pumping, a blink), hop (a real jump: crouch, legs out straight behind,
              forelegs reaching, landing; the game carries it forward between HOP_LIFT and HOP_LAND), croak (its
              throat swelling), catch (a flick of its tongue at a fly, and a gulp with its eyes)
    igelkott  walk (loop: one scurrying stride of all four feet, WALK_STRIDE EL), sniff (loop), curl (into a ball,
              held), uncurl (from that ball, a peek, and up again)
    snigel    crawl (loop: a wave along its foot, its eyestalks swaying), look (loop: stalks stretching and
              drawing in), hide (into its shell, held; the game runs it backwards to come out)
Nothing in it comes from anyone else, and it has no texture. Keep this file in plain ASCII.
"""
import math

from mathutils import Matrix, Vector

WALK_STRIDE = 0.34
HOP_FRAMES = 30
HOP_LIFT = 4
HOP_LAND = 19
HOP_DISTANCE = 2.2


def wanted(name):
    return ONLY is None or ONLY == name  # noqa: F821 (blender-kit.mjs)


def V(x, y, z):
    return Vector((x, y, z))


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def mix(a, b, t):
    return blend(a, b, t)  # noqa: F821


def lerp(a, b, t):
    return a + (b - a) * t


def over(*poses):
    out = {}
    for pose in poses:
        out.update(pose)
    return out


def ring_x(x, cz, hw, hh, sides, flat=1.0, cy=0.0):
    """A ring across X at x: an ellipse `hw` wide and `hh` high about (cy, cz); `flat` under 1 flattens its lower half."""
    out = []
    for j in range(sides):
        a = TAU * j / sides  # noqa: F821
        s = math.sin(a)
        out.append(V(x, cy + hw * math.cos(a), cz + hh * s * (flat if s < 0.0 else 1.0)))
    return out


def loft_x(part, rows, sides, colour, flat=1.0):
    """A body along X from rows of (x, half width, bottom, top); its two ends closed with a fan. Gives its rings."""
    rings = [ring_x(r[0], (r[2] + r[3]) * 0.5, r[1], (r[3] - r[2]) * 0.5, sides, flat) for r in rows]
    a = rows[0]
    b = rows[-1]
    step_a = 0.35 * (rows[0][0] - rows[1][0])
    step_b = 0.35 * (rows[-1][0] - rows[-2][0])
    first = (V(a[0] + step_a, 0.0, (a[2] + a[3]) * 0.5), colour)
    last = (V(b[0] + step_b, 0.0, (b[2] + b[3]) * 0.5), colour)
    return skin(part, rings, [colour] * len(rows), first, last)  # noqa: F821


def row_at(rows, x):
    """The (half width, bottom, top) of a loft's rows at x, straight between its rows."""
    ordered = sorted(rows, key=lambda r: r[0])
    if x <= ordered[0][0]:
        return ordered[0][1:]
    for i in range(1, len(ordered)):
        if x <= ordered[i][0]:
            a = ordered[i - 1]
            b = ordered[i]
            t = (x - a[0]) / (b[0] - a[0])
            return tuple(a[k] + (b[k] - a[k]) * t for k in (1, 2, 3))
    return ordered[-1][1:]


def half_width(rows, x, z, flat=1.0):
    """How far out a loft's side is at (x, z)."""
    hw, lo, hi = row_at(rows, x)
    cz = (lo + hi) * 0.5
    hh = (hi - lo) * 0.5
    s = (z - cz) / (hh * (flat if z < cz else 1.0))
    return hw * math.sqrt(max(0.0, 1.0 - s * s))


def everything(part, since):
    return list(part['paint'].keys())[since:]


def shine(part, centre, size, colour=None):
    """A speck of light in an eye."""
    lump(part, centre, size, 1, colour or tone('#f4f2ec'))  # noqa: F821


# =====================================================================================================================
# The mallards: one armature, two meshes. Afloat, the water's face at the origin; their keels a little under it.
# =====================================================================================================================

DRAKE = {
    'head': tone('#1d5a3a'), 'head_dark': tone('#0f3424'), 'head_light': tone('#2f8a58'), 'ring': tone('#f2f0e8'),
    'breast': tone('#6a3622'), 'breast_dark': tone('#4a2618'), 'flank': tone('#cdcbc2'), 'flank_line': tone('#a6a49a'),
    'back': tone('#8c8070'), 'back_dark': tone('#5e5446'), 'rump': tone('#18181a'), 'tail': tone('#e6e2d8'),
    'tail_mid': tone('#9c988e'), 'covert': tone('#8e8a80'), 'tertial': tone('#a89c88'), 'primary': tone('#5e584e'),
    'bill': tone('#d8c43a'), 'bill_dark': tone('#a89a2c'), 'nail': tone('#3a3a2c'), 'belly': tone('#d8d6cc'),
}
HEN = {
    'head': tone('#b8986a'), 'head_dark': tone('#4a3424'), 'head_light': tone('#d0b48c'), 'ring': tone('#b8986a'),
    'breast': tone('#b08a5c'), 'breast_dark': tone('#5a3e26'), 'flank': tone('#b08c60'), 'flank_line': tone('#5a3e26'),
    'back': tone('#8a6a46'), 'back_dark': tone('#4a3420'), 'rump': tone('#7a5c3c'), 'tail': tone('#d4bc94'),
    'tail_mid': tone('#7a5c3c'), 'covert': tone('#86704e'), 'tertial': tone('#a08460'), 'primary': tone('#5c4c3a'),
    'bill': tone('#d8823a'), 'bill_dark': tone('#4a3a28'), 'nail': tone('#2e2620'), 'belly': tone('#c8ac80'),
}
SPECULUM = tone('#3446a8')
SPECULUM_SHINE = tone('#5a6ad0')
BAR = tone('#f2f0ea')
FOOT = tone('#e8782a')
FOOT_DARK = tone('#c25a1c')
DUCK_EYE = tone('#1a120c')

DUCK_ROWS = [  # x, half width, bottom, top
    (0.665, 0.07, 0.25, 0.41),
    (0.62, 0.16, 0.11, 0.49),
    (0.54, 0.245, 0.0, 0.54),
    (0.42, 0.3, -0.07, 0.56),
    (0.24, 0.33, -0.1, 0.56),
    (0.02, 0.33, -0.1, 0.55),
    (-0.2, 0.3, -0.08, 0.53),
    (-0.38, 0.25, -0.04, 0.51),
    (-0.52, 0.19, 0.04, 0.49),
    (-0.62, 0.13, 0.15, 0.475),
    (-0.7, 0.075, 0.28, 0.465),
    (-0.75, 0.035, 0.37, 0.455),
]
DUCK_FLAT = 0.85

DUCK_BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.2), {'deform': False}),
    ('body', 'root', (-0.12, 0, 0.26), (0.36, 0, 0.3)),
    ('tail', 'body', (-0.58, 0, 0.4), (-0.96, 0, 0.5)),
    ('neck1', 'body', (0.36, 0, 0.44), (0.42, 0, 0.62)),
    ('neck2', 'neck1', (0.42, 0, 0.62), (0.47, 0, 0.75), {'connect': True}),
    ('head', 'neck2', (0.47, 0, 0.75), (0.68, 0, 0.8), {'connect': True}),
    ('jaw', 'head', (0.64, 0, 0.768), (0.9, 0, 0.71)),
    ('wing.L', 'body', (0.26, 0.24, 0.45), (-0.2, 0.31, 0.47), {'z': (0, 1, 0)}),
    ('hand.L', 'wing.L', (-0.2, 0.31, 0.47), (-0.8, 0.24, 0.48), {'connect': True, 'z': (0, 1, 0)}),
    ('shin.L', 'body', (-0.18, 0.13, 0.0), (-0.24, 0.14, -0.22)),
    ('foot.L', 'shin.L', (-0.24, 0.14, -0.22), (-0.05, 0.14, -0.25), {'connect': True}),
]


def duck_body_paint(p, pal, drake):
    """The colour of a point of the body: breast, flank, back, rump and belly, each with its feathers' pattern."""
    x, y, z = p.x, p.y, p.z
    fine = noise(x * 30.0, y * 30.0, z * 30.0)  # noqa: F821
    coarse = noise(x * 7.0 + 3.0, y * 7.0, z * 7.0)  # noqa: F821
    if drake:
        # Flank: pale grey, finely lined across.
        flank = mix(pal['flank'], pal['flank_line'], 0.55 * smooth((math.sin(z * 120.0 + coarse * 6.0) - 0.4) / 0.5))
        c = flank
        # Breast: deep chestnut, to the front, under the white ring.
        # its edge curves forward at the waterline and up to the ring
        breast = smooth((x - 0.2 - 0.5 * (z - 0.3) ** 2) / 0.07)
        c = mix(c, mix(pal['breast'], pal['breast_dark'], fine * 0.6), breast)
        # Back: grey-brown, darker along the middle.
        back = smooth((z - 0.47) / 0.08) * (1.0 - breast * 0.7)
        c = mix(c, mix(pal['back'], pal['back_dark'], smooth((0.12 - abs(y)) / 0.12) * 0.6 + fine * 0.2), back)
        # Rump and the coverts under the tail: black.
        c = mix(c, pal['rump'], smooth((-0.47 - x) / 0.07))
    else:
        # The duck is brown all over: each feather buff with a dark middle, overlapping in rows like scales.
        rows_z = z * 14.0 + coarse * 0.6
        band = math.floor(rows_z)
        fx = x * 11.0 + abs(y) * 4.0 + 0.5 * (band % 2) + coarse * 0.4
        dx = fx - math.floor(fx) - 0.5
        dz = rows_z - band - 0.5
        d = dx * dx + 1.8 * (dz + 0.12) ** 2
        mark = smooth((0.13 - d) / 0.07) * (0.7 + 0.3 * fine)
        base = mix(pal['flank'], pal['back'], smooth((z - 0.38) / 0.15))
        base = mix(base, pal['breast'], smooth((x - 0.3) / 0.15) * 0.5)
        c = mix(base, pal['flank_line'], mark * 0.9)
        c = mix(c, pal['rump'], smooth((-0.55 - x) / 0.1) * 0.4)
    # Under the water it is a little darker and greener.
    c = mix(c, lit(c, 0.7), smooth((0.02 - z) / 0.08))  # noqa: F821
    c = mix(c, pal['belly'], 0.25 * smooth((0.05 - z) / 0.1) * smooth((x + 0.2) / 0.3))
    return lit(c, 0.94 + 0.12 * fine)  # noqa: F821


def duck_head_paint(p, pal, drake):
    x, y, z = p.x, p.y, p.z
    fine = noise(x * 26.0, y * 26.0, z * 26.0)  # noqa: F821
    if drake:
        # The glossy green head, a darker crown and a lighter sheen on its cheek, then the white ring and the breast.
        sheen = smooth((abs(y) - 0.06) / 0.08) * smooth((0.86 - z) / 0.1)
        c = mix(pal['head'], pal['head_light'], 0.55 * sheen * (0.6 + 0.6 * fine))
        c = mix(c, pal['head_dark'], smooth((z - 0.9) / 0.06) * 0.7)
        ring = smooth((z - 0.585) / 0.012) * smooth((0.63 - z) / 0.012)
        c = mix(c, pal['ring'], ring)
        c = mix(c, pal['breast'], smooth((0.59 - z) / 0.015))
        return c
    # The duck: buff, finely streaked; a dark crown and a dark stripe through the eye.
    c = mix(pal['head'], pal['head_dark'], 0.35 * smooth((fine - 0.5) / 0.3))
    c = mix(c, pal['head_light'], smooth((0.8 - z) / 0.06) * 0.5 * smooth((x - 0.5) / 0.1))
    crown = smooth((z - 0.9) / 0.04)
    stripe = smooth((0.025 - abs(z - 0.855 + (x - 0.6) * 0.15)) / 0.012) * smooth((x - 0.47) / 0.05)
    c = mix(c, pal['head_dark'], max(crown * 0.85, stripe * 0.9))
    c = mix(c, pal['breast'], smooth((0.62 - z) / 0.04))
    return c


def duck_wing(arm, part, side, pal):
    """The folded wing on one side, a broad blade along the body, its lower edge tucked under the flank: coverts above,
    the blue speculum with its white bars low at the back, the dark primaries over the tail. Spread by its two bones
    (the clip 'flap'), it is a wing."""
    tag = '.L' if side > 0 else '.R'
    nu = 16
    nv = 6
    rings = []
    tones = []
    for i in range(nu + 1):
        u = i / nu
        x = lerp(0.3, -0.86, u)
        high = 0.26 * math.sin(min(1.0, u / 0.3) * math.pi / 2.0) ** 0.6 * (1.0 - 0.86 * smooth((u - 0.5) / 0.5))
        top = 0.548 - 0.03 * u - 0.025 * smooth((u - 0.6) / 0.4)
        ring = []
        shade = []
        for k in range(nv + 1):
            v = k / nv
            # Serrated where feather tips are: along its top at the back, and at its tip.
            tip = 0.006 * (1 if (i + k) % 2 else -1) if (k == nv and u > 0.3) else 0.0
            z = top - high * (1.0 - v) + tip
            out = half_width(DUCK_ROWS, max(-0.69, x), min(0.55, z), DUCK_FLAT) if x > -0.7 else 0.0
            tuck = -0.03 * smooth((0.28 - v) / 0.28)
            y = max(0.03, out + 0.012 + tuck + 0.018 * math.sin(v * math.pi)) if x > -0.7 else 0.035 + 0.02 * (1.0 - u)
            ring.append(V(x, side * y, z))
            # Its colours.
            fine = noise(x * 20.0, v * 6.0, side * 3.0)  # noqa: F821
            c = mix(pal['covert'], pal['back_dark'], 0.3 * fine)
            c = mix(c, pal['tertial'], smooth((v - 0.55) / 0.2) * smooth((u - 0.25) / 0.1) * (1.0 - smooth((u - 0.62) / 0.08)))
            spec = smooth((u - 0.26) / 0.04) * (1.0 - smooth((u - 0.6) / 0.04))
            band = smooth((v - 0.16) / 0.05) * (1.0 - smooth((v - 0.42) / 0.05))
            c = mix(c, mix(SPECULUM, SPECULUM_SHINE, fine * 0.6), spec * band)
            bars = spec * (smooth((0.07 - abs(v - 0.12)) / 0.04) + smooth((0.06 - abs(v - 0.47)) / 0.04))
            c = mix(c, BAR, min(1.0, bars))
            c = mix(c, pal['primary'], smooth((u - 0.6) / 0.08))
            shade.append(c)
        rings.append(ring)
        tones.append(shade)
    at = mark(part)  # noqa: F821
    skin(part, rings, tones, closed=False)  # noqa: F821
    bind(arm, part, at, ['wing' + tag, 'hand' + tag], blend=0.08)  # noqa: F821


def duck_mesh(arm, name, pal, drake):
    part = new_part()  # noqa: F821
    # --- the body
    at = mark(part)  # noqa: F821
    loft_x(part, DUCK_ROWS, 20, pal['flank'], flat=DUCK_FLAT)
    for p in everything(part, at):
        part['paint'][p] = duck_body_paint(p.co, pal, drake)
    bind(arm, part, at, ['body', 'tail'], blend=0.12)  # noqa: F821
    # --- the tail: a fan of pointed feathers, and the coverts under and over it
    at = mark(part)  # noqa: F821
    root = V(-0.7, 0.0, 0.43)
    rim = []
    for k in range(9):
        t = (k - 4) / 4.0
        long = 0.3 - 0.06 * t * t
        a = t * 0.55
        tipx = root.x - long * math.cos(a)
        rim.append((V(tipx, root.y + long * math.sin(a), root.z + 0.05 + 0.02 * (1.0 - t * t)), k % 2 == 0))
    centre = put(part, root, pal['tail_mid'])  # noqa: F821
    prev = None
    for k, (p, tip) in enumerate(rim):
        t = abs(k - 4) / 4.0
        c = mix(pal['tail_mid'], pal['tail'], 0.4 + 0.6 * t) if drake else mix(pal['tail'], pal['flank_line'], 0.5 * (k % 2))
        made = put(part, p if tip else p + V(0.05, 0.0, 0.0), c)  # noqa: F821
        if prev is not None:
            face(part, (centre, prev, made))  # noqa: F821
        prev = made
    bind(arm, part, at, 'tail')  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, V(-0.66, 0.0, 0.37), (0.1, 0.07, 0.06), 2, pal['rump'])  # noqa: F821
    lump(part, V(-0.64, 0.0, 0.47), (0.1, 0.07, 0.035), 2, pal['rump'])  # noqa: F821
    bind(arm, part, at, ['body', 'tail'], blend=0.08)  # noqa: F821
    if drake:
        # The drake's black curls on its rump.
        at = mark(part)  # noqa: F821
        for side in (-1.0, 1.0):
            path = [V(-0.62, side * 0.02, 0.5), V(-0.72, side * 0.025, 0.56), V(-0.75, side * 0.03, 0.64), V(-0.7, side * 0.03, 0.69),
                    V(-0.64, side * 0.03, 0.665), V(-0.645, side * 0.03, 0.62)]
            tube(part, path, [0.024, 0.022, 0.02, 0.016, 0.012, 0.006], [pal['rump']] * 6, 6)  # noqa: F821
        bind(arm, part, at, 'tail')  # noqa: F821
    # --- the wings
    for side in (1.0, -1.0):
        duck_wing(arm, part, side, pal)
    # --- the neck
    at = mark(part)  # noqa: F821
    tube(part, [V(0.33, 0, 0.4), V(0.4, 0, 0.56), V(0.45, 0, 0.68), V(0.5, 0, 0.78)], [0.17, 0.135, 0.118, 0.12],  # noqa: F821
         [pal['head']] * 4, 16, closed_ends=False)
    for p in everything(part, at):
        part['paint'][p] = duck_head_paint(p.co, pal, drake)
    bind(arm, part, at, ['neck1', 'neck2', 'head'], blend=0.05)  # noqa: F821
    # --- the head: long and rounded, a little flat on the crown, the forehead sloping to the bill
    at = mark(part)  # noqa: F821
    centre = V(0.53, 0.0, 0.82)
    head = lump(part, centre, (0.2, 0.142, 0.16), 3, pal['head'])  # noqa: F821
    for p in head:
        d = p.co - centre
        if d.z > 0.08:
            p.co.z -= (d.z - 0.08) * 0.35
        if d.x > 0.06:
            p.co.z -= (d.x - 0.06) * 0.35 * smooth(d.z / 0.1)
        if d.x < -0.08 and d.z < 0.0:
            p.co.x += 0.02
    for p in head:
        part['paint'][p] = duck_head_paint(p.co, pal, drake)
    for side in (-1.0, 1.0):
        lump(part, V(0.615, side * 0.118, 0.85), (0.028, 0.016, 0.028), 2, DUCK_EYE)  # noqa: F821
        shine(part, V(0.632, side * 0.128, 0.858), (0.008, 0.004, 0.008))
    # The upper bill, flat and broad, its nail at the tip and its nostrils.
    path = [V(0.64, 0, 0.805), V(0.72, 0, 0.787), V(0.8, 0, 0.768), V(0.87, 0, 0.75), V(0.905, 0, 0.742)]
    bill = tube(part, path, [0.072, 0.07, 0.068, 0.06, 0.028], [pal['bill']] * 5, 12, squash=0.4, lean=V(0, 0, 1))  # noqa: F821
    for ring in bill:
        for p in ring:
            c = pal['bill']
            if not drake:
                # The duck's orange bill has a dark saddle on its top.
                c = mix(c, pal['bill_dark'], smooth((p.co.z - 0.775 + (p.co.x - 0.75) * 0.25) / 0.01) * smooth((0.86 - p.co.x) / 0.04) * 0.85)
            part['paint'][p] = mix(c, pal['bill_dark'] if drake else c, 0.3 * smooth((0.66 - p.co.x) / 0.03))
    lump(part, V(0.9, 0.0, 0.752), (0.022, 0.03, 0.01), 1, pal['nail'])  # noqa: F821
    for side in (-1.0, 1.0):
        lump(part, V(0.71, side * 0.022, 0.8), (0.012, 0.006, 0.005), 1, pal['nail'])  # noqa: F821
    bind(arm, part, at, 'head')  # noqa: F821
    # The lower bill, that opens to quack.
    at = mark(part)  # noqa: F821
    tube(part, [V(0.65, 0, 0.775), V(0.75, 0, 0.756), V(0.85, 0, 0.732), V(0.89, 0, 0.725)], [0.058, 0.056, 0.05, 0.02],  # noqa: F821
         [lit(pal['bill'], 0.8)] * 4, 10, squash=0.3, lean=V(0, 0, 1))
    bind(arm, part, at, 'jaw')  # noqa: F821
    # --- the legs and the webbed orange feet, under the water
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        at = mark(part)  # noqa: F821
        tube(part, [V(-0.18, side * 0.13, 0.02), V(-0.21, side * 0.135, -0.1), V(-0.24, side * 0.14, -0.22)], [0.035, 0.026, 0.022],  # noqa: F821
             [FOOT_DARK, FOOT, FOOT], 6)
        bind(arm, part, at, 'shin' + tag)  # noqa: F821
        at = mark(part)  # noqa: F821
        ankle = V(-0.24, side * 0.14, -0.22)
        tips = []
        for spread in (-1.0, 0.0, 1.0):
            tip = V(-0.04 - 0.02 * abs(spread), side * (0.14 + 0.065 * spread), -0.25)
            tube(part, [ankle, lerp(ankle, tip, 0.5), tip], [0.014, 0.011, 0.006], [FOOT, FOOT, FOOT_DARK], 5)  # noqa: F821
            tips.append(tip)
        for k in range(2):
            a = put(part, ankle + V(0.02, 0, -0.005), FOOT)  # noqa: F821
            b = put(part, tips[k] + V(0.01, 0, 0.0), FOOT)  # noqa: F821
            c = put(part, tips[k + 1] + V(0.01, 0, 0.0), FOOT)  # noqa: F821
            face(part, (a, b, c))  # noqa: F821
        bind(arm, part, at, 'foot' + tag)  # noqa: F821
    return skinned(arm, part, name, strength=0.45, reach=0.18, floor=None, leaf=True)  # noqa: F821


def wingbeat(up):
    """The wings spread, at the top of a beat (up=1), level (0) or at its bottom (-1), the upper face outwards."""
    if up > 0.5:
        return {'wing.L': {'dir': (-0.15, 0.5, 0.85), 'up': (0.0, -0.85, 0.5)}, 'hand.L': {'dir': (-0.3, 0.25, 0.92), 'up': (0.0, -0.9, 0.3)}}
    if up < -0.5:
        return {'wing.L': {'dir': (-0.05, 0.86, -0.5), 'up': (0.0, 0.5, 0.86)}, 'hand.L': {'dir': (-0.2, 0.6, -0.78), 'up': (0.0, 0.78, 0.6)}}
    return {'wing.L': {'dir': (-0.1, 1.0, 0.05), 'up': (0.0, 0.0, 1.0)}, 'hand.L': {'dir': (-0.25, 1.0, 0.0), 'up': (0.0, 0.0, 1.0)}}


DUCK_REST = {'root': {'at': (0, 0, 0)}, 'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'tail': (0, 0, 0), 'neck1': (0, 0, 0),
             'neck2': (0, 0, 0), 'head': (0, 0, 0), 'jaw': (0, 0, 0), 'wing.L': (0, 0, 0), 'hand.L': (0, 0, 0),
             'shin.L': (0, 0, 0), 'foot.L': (0, 0, 0)}


def duck(*extra):
    return over(DUCK_REST, *extra)


def kick(tag, q):
    """One foot at q of its stroke: back with the web open, then forward folded."""
    if q < 0.5:
        s = smooth(q / 0.5)
        angle = 28.0 - 62.0 * s
        return {'shin' + tag: (angle, 0, 0), 'foot' + tag: (-0.5 * angle, 0, 0)}
    s = smooth((q - 0.5) / 0.5)
    angle = -34.0 + 62.0 * s
    return {'shin' + tag: (angle, 0, 0), 'foot' + tag: (-65.0 * math.sin(math.pi * s), 0, 0)}


def kicks(p, rate=1.0):
    return over(kick('.L', (p * rate) % 1.0), kick('.R', (p * rate + 0.5) % 1.0))


if wanted('anka'):
    arm = armature('anka', DUCK_BONES)  # noqa: F821
    # A look at one of them alone (stills) may name it in DUCK_MESHES, set before this kit; the export has both.
    if 'and' in globals().get('DUCK_MESHES', ('and', 'and-hona')):
        duck_mesh(arm, 'and', DRAKE, True)
    if 'and-hona' in globals().get('DUCK_MESHES', ('and', 'and-hona')):
        duck_mesh(arm, 'and-hona', HEN, False)

    # paddle: one kick of each foot; a small surge and roll, its tail wagging and its head nodding with the strokes.
    keys = []
    for f in range(0, 28, 2):
        p = f / 28.0
        keys.append((f, duck(kicks(p), {
            'body': {'loc': (0, 0, 0.006 * math.sin(4 * math.pi * p)), 'rot': (1.2 * math.sin(4 * math.pi * p), 1.8 * math.sin(2 * math.pi * p), 0)},
            'tail': (0, 0, 6.0 * math.sin(2 * math.pi * p)), 'neck1': (2.0 * math.sin(4 * math.pi * p + 0.6), 0, 0),
            'head': (-2.5 * math.sin(4 * math.pi * p + 0.6), 0, 0)})))
    clip(arm, 'paddle', 28, keys)  # noqa: F821

    # dabble: tips up, head under, tail to the sky and the feet kicking to hold it there; up again, and a shake.
    DOWN = {'root': {'at': (0, 0, -0.04)}, 'body': {'loc': (0, 0, 0), 'rot': (-72, 0, 0)}, 'neck1': (-25, 0, 0), 'neck2': (-15, 0, 0),
            'head': (-20, 0, 0), 'tail': (-20, 0, 0)}
    keys = [(0, duck()), (8, duck({'body': {'loc': (0, 0, 0.01), 'rot': (6, 0, 0)}, 'neck1': (8, 0, 0), 'head': (-10, 0, 0)})),
            (16, duck(DOWN, kicks(0.0)))]
    for k, f in enumerate(range(20, 60, 4)):
        wag = (1 if k % 2 else -1)
        keys.append((f, duck(DOWN, kicks(k * 0.5), {'tail': (-20, 0, 9 * wag), 'body': {'loc': (0, 0, 0), 'rot': (-72 + 3 * wag, 2 * wag, 0)}})))
    keys += [(64, duck({'root': {'at': (0, 0, 0.03)}, 'body': {'loc': (0, 0, 0), 'rot': (10, 0, 0)}, 'head': (12, 0, 0), 'neck1': (-6, 0, 0)})),
             (69, duck({'head': (0, 0, 22), 'neck2': (0, 10, 0)})), (72, duck({'head': (0, 0, -22), 'neck2': (0, -10, 0)})),
             (75, duck({'head': (0, 0, 18), 'tail': (0, 0, 12)})), (78, duck({'head': (0, 0, -10), 'tail': (0, 0, -12)})),
             (84, duck())]
    clip(arm, 'dabble', 84, keys, loop=False)  # noqa: F821

    # preen: its bill back into the feathers of its side, nibbling, its wing a little lifted; then its breast; a shake.
    SIDE = {'neck1': (-6, 55, 30), 'neck2': (-12, 45, 25), 'head': (-35, 0, 40),
            'wing.L': {'dir': (-0.97, 0.22, 0.08), 'up': (0.0, 0.97, 0.2)}}
    keys = [(0, duck()), (12, duck(SIDE))]
    for k, f in enumerate(range(16, 44, 4)):
        keys.append((f, duck(SIDE, {'head': (-35 + 8 * (k % 2), 0, 40 - 6 * (k % 2)), 'jaw': (-10 * (k % 2), 0, 0)})))
    CHEST = {'neck1': (-35, 0, 0), 'neck2': (-30, 0, 0), 'head': (-45, 0, 0)}
    keys += [(52, duck(CHEST)), (56, duck(CHEST, {'head': (-38, 0, 8), 'jaw': (-8, 0, 0)})), (60, duck(CHEST, {'head': (-45, 0, -8)})),
             (64, duck(CHEST)), (72, duck({'neck1': (6, 0, 0)}))]
    for k, f in enumerate(range(74, 88, 2)):
        s = 1 if k % 2 else -1
        keys.append((f, duck({'body': {'loc': (0, 0, 0.01), 'rot': (2, 10 * s, 0)}, 'tail': (0, 0, 14 * s), 'head': (0, 0, -12 * s),
                              'wing.L': {'dir': (-0.95, 0.3, 0.1), 'up': (0.0, 0.95, 0.3)}})))
    keys.append((96, duck()))
    clip(arm, 'preen', 96, keys, loop=False)  # noqa: F821

    # look: its head turned to the camera, an eye tipped to the sky, then the other way, and back.
    keys = [(0, duck()), (10, duck({'neck1': (-4, 0, 0), 'neck2': (6, -25, 0), 'head': (0, 0, -32)})),
            (20, duck({'neck1': (-4, 0, 0), 'neck2': (6, -25, 0), 'head': (8, 30, -38)})),
            (32, duck({'neck1': (-4, 0, 0), 'neck2': (6, -25, 0), 'head': (8, 30, -38)})),
            (42, duck({'neck2': (0, 22, 0), 'head': (0, 0, 34)})), (54, duck({'neck2': (0, 22, 0), 'head': (-6, -10, 34)})),
            (64, duck({'head': (0, 0, 4)})), (72, duck())]
    clip(arm, 'look', 72, keys, loop=False)  # noqa: F821

    # quack: its neck stretched forward and up, its bill opening three times, its body pumping with each.
    STRETCH = {'neck1': (-10, 0, 0), 'neck2': (12, 0, 0), 'head': (6, 0, 0)}
    keys = [(0, duck()), (6, duck(STRETCH))]
    for f in (9, 17, 25):
        keys.append((f, duck(STRETCH, {'jaw': (-30, 0, 0), 'head': (14, 0, 0), 'body': {'loc': (0, 0, 0.012), 'rot': (-3, 0, 0)}, 'tail': (6, 0, 0)})))
        keys.append((f + 3, duck(STRETCH, {'jaw': (-3, 0, 0)})))
    keys += [(34, duck(STRETCH)), (40, duck())]
    clip(arm, 'quack', 40, keys, loop=False)  # noqa: F821

    # flap: it rises up on the water, beats its wings four times, its feet running on the water; folds and shakes.
    RISE = {'root': {'at': (0, 0, 0.16)}, 'body': {'loc': (0, 0, 0), 'rot': (52, 0, 0)}, 'neck1': (-38, 0, 0), 'neck2': (-6, 0, 0),
            'head': (-12, 0, 0), 'tail': (-14, 0, 0)}
    keys = [(0, duck()), (8, duck({'root': {'at': (0, 0, 0.03)}, 'body': {'loc': (0, 0, 0), 'rot': (14, 0, 0)},
                                   'wing.L': {'dir': (-0.9, 0.42, 0.15), 'up': (0.0, 0.9, 0.42)}}))]
    beats = [(13, 0), (16, 1), (20, 0), (24, -1), (28, 0), (32, 1), (36, 0), (40, -1), (44, 0), (48, 1), (52, 0), (56, -1)]
    for k, (f, up) in enumerate(beats):
        keys.append((f, duck(RISE, wingbeat(up), kicks(k * 0.33, 1.0), {'root': {'at': (0, 0, 0.16 + 0.03 * up)}})))
    keys += [(61, duck({'root': {'at': (0, 0, 0.04)}, 'body': {'loc': (0, 0, 0), 'rot': (12, 0, 0)},
                        'wing.L': {'dir': (-0.9, 0.42, 0.15), 'up': (0.0, 0.9, 0.42)}})),
             (64, duck({'body': {'loc': (0, 0, 0), 'rot': (0, 9, 0)}, 'tail': (0, 0, 14), 'head': (0, 0, 16)})),
             (67, duck({'body': {'loc': (0, 0, 0), 'rot': (0, -9, 0)}, 'tail': (0, 0, -14), 'head': (0, 0, -16)})),
             (72, duck())]
    clip(arm, 'flap', 72, keys, loop=False)  # noqa: F821
    bake(arm)  # noqa: F821

# =====================================================================================================================
# The common frog: sitting, its front up on its arms, its long hind legs folded beside it. Olive brown with dark
# blotches, a pale fold down each side of its back, the dark mask behind its eye, a cream belly and throat, gold eyes.
# =====================================================================================================================

FROG_SKIN = tone('#7c7440')  # noqa: F821
FROG_GREEN = tone('#68783a')  # noqa: F821
FROG_DARK = tone('#3a3420')  # noqa: F821
FROG_FOLD = tone('#9c9456')  # noqa: F821
FROG_BELLY = tone('#ddd2a4')  # noqa: F821
FROG_MASK = tone('#3e2c1c')  # noqa: F821
FROG_EYE = tone('#d0a030')  # noqa: F821
FROG_IRIS = tone('#7a5418')  # noqa: F821
FROG_PUPIL = tone('#0c0a08')  # noqa: F821
FROG_MOUTH = tone('#9a4a50')  # noqa: F821
FROG_TONGUE = tone('#d87a86')  # noqa: F821
FROG_LIP = tone('#c8c08a')  # noqa: F821

FROG_ROWS = [  # x, half width, bottom, top
    (-0.5, 0.05, 0.07, 0.23),
    (-0.44, 0.16, 0.03, 0.4),
    (-0.3, 0.25, 0.04, 0.52),
    (-0.14, 0.3, 0.07, 0.53),
    (0.02, 0.31, 0.1, 0.515),
    (0.16, 0.3, 0.13, 0.505),
    (0.3, 0.28, 0.17, 0.5),
]
HEAD_C = V(0.42, 0.0, 0.33)
HIP = V(-0.36, 0.18, 0.22)
KNEE = V(0.0, 0.38, 0.17)
ANKLE = V(-0.42, 0.42, 0.08)
BALL = V(-0.06, 0.44, 0.03)
TOE = V(0.16, 0.48, 0.01)
SHOULDER = V(0.26, 0.2, 0.27)
ELBOW = V(0.34, 0.3, 0.14)
WRIST = V(0.44, 0.28, 0.03)
FINGER = V(0.56, 0.3, 0.02)

FROG_BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.15), {'deform': False}),
    ('body', 'root', (-0.1, 0, 0.3), (0.3, 0, 0.36)),
    ('hips', 'body', (-0.1, 0, 0.3), (-0.46, 0, 0.2)),
    ('head', 'body', (0.3, 0, 0.38), (0.72, 0, 0.4)),
    ('jaw', 'head', (0.18, 0, 0.32), (0.72, 0, 0.3)),
    ('throat', 'jaw', (0.4, 0, 0.27), (0.4, 0, 0.17)),
    ('tongue', 'jaw', (0.66, 0, 0.325), (0.46, 0, 0.325)),
    ('eye.L', 'head', (0.52, 0.19, 0.44), (0.52, 0.19, 0.56)),
    ('arm.L', 'body', tuple(SHOULDER), tuple(ELBOW), {'z': (1, 0, 0)}),
    ('forearm.L', 'arm.L', tuple(ELBOW), tuple(WRIST), {'connect': True, 'z': (1, 0, 0)}),
    ('hand.L', 'forearm.L', tuple(WRIST), tuple(FINGER), {'connect': True, 'z': (0, 0, 1)}),
    ('thigh.L', 'hips', tuple(HIP), tuple(KNEE), {'z': (0, 0, 1)}),
    ('shin.L', 'thigh.L', tuple(KNEE), tuple(ANKLE), {'connect': True, 'z': (0, 0, 1)}),
    ('foot.L', 'shin.L', tuple(ANKLE), tuple(BALL), {'connect': True, 'z': (0, 0, 1)}),
    ('toes.L', 'foot.L', tuple(BALL), tuple(TOE), {'connect': True, 'z': (0, 0, 1)}),
]


def frog_skin(p, belly_below=None):
    """Its back's colour at a point: olive brown going green, dark blotches, and the cream of its belly underneath."""
    x, y, z = p.x, p.y, p.z
    fine = noise(x * 24.0, y * 24.0, z * 24.0)  # noqa: F821
    blot = noise(x * 6.5 + 7.0, y * 6.5, z * 6.5)  # noqa: F821
    c = mix(FROG_SKIN, FROG_GREEN, noise(x * 3.0, y * 3.0 + 2.0, z * 3.0))  # noqa: F821
    c = mix(c, FROG_DARK, 0.85 * smooth((blot - 0.6) / 0.08))
    if belly_below is not None:
        c = mix(c, mix(FROG_BELLY, FROG_SKIN, 0.25 * fine), smooth((belly_below - z) / 0.05))
    return lit(c, 0.93 + 0.14 * fine)  # noqa: F821


def frog_limb(part, path, radii, bars):
    """A leg's tube, banded across with dark bars."""
    made = tube(part, path, radii, [FROG_SKIN] * len(path), 9)  # noqa: F821
    for i, ring in enumerate(made):
        for p in ring:
            c = frog_skin(p.co)
            if bars and i % 3 == 1:
                c = mix(c, FROG_DARK, 0.75)
            part['paint'][p] = c
    return made


def webbed(part, root, tips, colour, web):
    """Long thin toes from `root` out to `tips`, with a web between each and the next."""
    for tip in tips:
        tube(part, [root, lerp(root, tip, 0.55) + V(0, 0, 0.012), tip], [0.02, 0.014, 0.008], [colour, colour, FROG_DARK], 5)  # noqa: F821
        lump(part, tip, (0.016, 0.016, 0.01), 1, lit(colour, 0.85))  # noqa: F821
    if web:
        for k in range(len(tips) - 1):
            a = put(part, root + V(0, 0, 0.008), colour)  # noqa: F821
            b = put(part, lerp(root, tips[k], 0.75) + V(0, 0, 0.004), lit(colour, 0.85))  # noqa: F821
            c = put(part, lerp(root, tips[k + 1], 0.75) + V(0, 0, 0.004), lit(colour, 0.85))  # noqa: F821
            face(part, (a, b, c))  # noqa: F821


def frog_mesh(arm):
    part = new_part()  # noqa: F821
    # --- the body, and the pale folds down its back
    at = mark(part)  # noqa: F821
    loft_x(part, FROG_ROWS, 18, FROG_SKIN, flat=0.8)
    for p in everything(part, at):
        hw, lo, hi = row_at(FROG_ROWS, p.co.x)
        part['paint'][p] = frog_skin(p.co, lo + (hi - lo) * 0.35)
    bind(arm, part, at, ['hips', 'body'], blend=0.14)  # noqa: F821
    at = mark(part)  # noqa: F821
    for side in (-1.0, 1.0):
        path = [V(x, side * (0.2 + 0.02 * math.sin(x * 4.0)), row_at(FROG_ROWS, x)[2] - 0.035) for x in (-0.36, -0.2, -0.04, 0.12, 0.28)]
        path.append(V(0.42, side * 0.2, 0.47))
        tube(part, path, [0.008, 0.012, 0.013, 0.013, 0.011, 0.007], [FROG_FOLD] * 6, 6)  # noqa: F821
    bind(arm, part, at, ['hips', 'body', 'head'], blend=0.12)  # noqa: F821
    # --- the head: its top, and its lower jaw, meeting at the mouth's line; inside, the mouth
    at = mark(part)  # noqa: F821
    dome = Matrix.Translation(HEAD_C) @ Matrix.Diagonal((0.32, 0.29, 0.18, 1.0))
    profile = [(math.cos(math.radians(a)), math.sin(math.radians(a))) for a in (0, 15, 30, 45, 60, 75)] + [(0.0, 1.0)]
    top = lathe(part, profile, 22, dome, [FROG_SKIN] * len(profile))  # noqa: F821
    pts = [p for ring in top for p in ring] + everything(part, at)[-1:]
    for p in pts:
        d = p.co - HEAD_C
        # A rounded snout, narrower than its broad cheeks.
        if d.x > 0.1:
            p.co.y *= 1.0 - 0.32 * smooth((d.x - 0.1) / 0.22)
        c = frog_skin(p.co)
        # The dark mask from its eye back over its eardrum, and the pale line of its upper lip.
        mask = smooth((abs(p.co.y) - 0.17) / 0.04) * smooth((0.47 - p.co.x) / 0.05) * smooth((p.co.x - 0.2) / 0.05) * smooth((0.45 - p.co.z) / 0.03)
        c = mix(c, FROG_MASK, 0.9 * mask)
        c = mix(c, FROG_LIP, smooth((0.36 - p.co.z) / 0.02) * smooth((p.co.x - 0.3) / 0.1) * 0.8)
        c = mix(c, FROG_DARK, smooth((0.338 - p.co.z) / 0.008))
        part['paint'][p] = c
    rim = [put(part, p.co.copy(), FROG_MOUTH) for p in top[0]]  # noqa: F821
    middle = put(part, HEAD_C.copy(), lit(FROG_MOUTH, 0.6))  # noqa: F821
    for j in range(len(rim)):
        face(part, (rim[(j + 1) % len(rim)], rim[j], middle))  # noqa: F821
    # The eyes' sockets, its nostrils and its eardrums.
    for side in (-1.0, 1.0):
        socket = lump(part, V(0.5, side * 0.165, 0.455), (0.1, 0.085, 0.07), 2, FROG_SKIN)  # noqa: F821
        for p in socket:
            part['paint'][p] = frog_skin(p.co)
        lump(part, V(0.69, side * 0.05, 0.44), (0.012, 0.008, 0.008), 1, FROG_DARK)  # noqa: F821
        lump(part, V(0.37, side * 0.255, 0.41), (0.045, 0.012, 0.04), 2, lit(FROG_MASK, 0.8))  # noqa: F821
    bind(arm, part, at, 'head')  # noqa: F821
    at = mark(part)  # noqa: F821
    jaw = Matrix.Translation(HEAD_C) @ Matrix.Diagonal((0.31, 0.28, 0.13, 1.0))
    profile = [(0.0, -1.0)] + [(math.cos(math.radians(a)), -math.sin(math.radians(a))) for a in (75, 60, 45, 30, 15, 0)]
    low = lathe(part, profile, 22, jaw, [FROG_BELLY] * len(profile))  # noqa: F821
    for p in everything(part, at):
        d = p.co - HEAD_C
        if d.x > 0.1:
            p.co.y *= 1.0 - 0.32 * smooth((d.x - 0.1) / 0.22)
        c = mix(FROG_BELLY, frog_skin(p.co), smooth((p.co.z - 0.24) / 0.03) * smooth((abs(p.co.y) - 0.12) / 0.08))
        c = mix(c, FROG_LIP, smooth((p.co.z - 0.3) / 0.02) * 0.5)
        part['paint'][p] = c
    floor = [put(part, p.co.copy() + V(0, 0, -0.004), FROG_MOUTH) for p in low[-1]]  # noqa: F821
    middle = put(part, HEAD_C + V(0.0, 0, -0.03), lit(FROG_MOUTH, 0.7))  # noqa: F821
    for j in range(len(floor)):
        face(part, (floor[j], floor[(j + 1) % len(floor)], middle))  # noqa: F821
    bind(arm, part, at, 'jaw')  # noqa: F821
    # The throat, that pumps and swells, under its jaw.
    at = mark(part)  # noqa: F821
    lump(part, V(0.42, 0.0, 0.225), (0.19, 0.17, 0.05), 2, FROG_BELLY)  # noqa: F821
    bind(arm, part, at, 'throat')  # noqa: F821
    # The tongue, folded back on the floor of its mouth, its sticky tip at the back.
    at = mark(part)  # noqa: F821
    tube(part, [V(0.66, 0, 0.325), V(0.56, 0, 0.33), V(0.48, 0, 0.33)], [0.03, 0.034, 0.03], [FROG_TONGUE] * 3, 8, squash=0.5, lean=V(0, 0, 1))  # noqa: F821
    lump(part, V(0.47, 0, 0.332), (0.04, 0.04, 0.02), 1, lit(FROG_TONGUE, 0.9))  # noqa: F821
    bind(arm, part, at, 'tongue')  # noqa: F821
    # --- the eyes: gold, flecked darker, a dark bar of a pupil, a speck of light; they sink in to blink and to swallow
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        at = mark(part)  # noqa: F821
        c = V(0.52, side * 0.185, 0.5)
        ball = lump(part, c, (0.075, 0.07, 0.068), 2, FROG_EYE)  # noqa: F821
        for p in ball:
            part['paint'][p] = mix(FROG_EYE, FROG_IRIS, 0.6 * smooth((noise(p.co.x * 60.0, p.co.y * 60.0, p.co.z * 60.0) - 0.55) / 0.2))  # noqa: F821
        out = V(0.45, side * 0.85, 0.28).normalized()
        lump(part, c + out * 0.064, (0.036, 0.012, 0.014), 1, FROG_PUPIL)  # noqa: F821
        shine(part, c + V(0.3, side * 0.7, 0.65).normalized() * 0.068, (0.012, 0.008, 0.01))
        bind(arm, part, at, 'eye' + tag)  # noqa: F821
    # --- the forelegs, and the hands with four fingers
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        def S(v):
            return V(v.x, v.y * side, v.z)
        at = mark(part)  # noqa: F821
        frog_limb(part, [S(SHOULDER), S(lerp(SHOULDER, ELBOW, 0.5)), S(ELBOW)], [0.062, 0.055, 0.045], False)
        bind(arm, part, at, 'arm' + tag)  # noqa: F821
        at = mark(part)  # noqa: F821
        frog_limb(part, [S(ELBOW), S(lerp(ELBOW, WRIST, 0.5)), S(WRIST)], [0.045, 0.04, 0.03], True)
        bind(arm, part, at, ['arm' + tag, 'forearm' + tag], blend=0.03)  # noqa: F821
        at = mark(part)  # noqa: F821
        tips = [S(WRIST + V(0.12 * math.cos(a), 0.12 * math.sin(a), -0.02)) for a in (-0.9, -0.3, 0.25, 0.75)]
        webbed(part, S(WRIST), tips, FROG_SKIN, False)
        bind(arm, part, at, 'hand' + tag)  # noqa: F821
    # --- the hind legs: a strong thigh forward, the shin back, the long foot forward again, and webbed toes
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        def S(v):
            return V(v.x, v.y * side, v.z)
        at = mark(part)  # noqa: F821
        frog_limb(part, [S(HIP + V(0.02, -0.04, 0.02)), S(lerp(HIP, KNEE, 0.35)), S(lerp(HIP, KNEE, 0.7)), S(KNEE)], [0.12, 0.125, 0.1, 0.075], True)
        bind(arm, part, at, ['hips', 'thigh' + tag], blend=0.08)  # noqa: F821
        at = mark(part)  # noqa: F821
        frog_limb(part, [S(KNEE), S(lerp(KNEE, ANKLE, 0.5)), S(ANKLE)], [0.075, 0.065, 0.045], True)
        bind(arm, part, at, ['thigh' + tag, 'shin' + tag], blend=0.05)  # noqa: F821
        at = mark(part)  # noqa: F821
        frog_limb(part, [S(ANKLE), S(lerp(ANKLE, BALL, 0.5)), S(BALL)], [0.045, 0.04, 0.034], True)
        bind(arm, part, at, ['shin' + tag, 'foot' + tag], blend=0.04)  # noqa: F821
        at = mark(part)  # noqa: F821
        tips = [S(BALL + V(math.cos(a) * long, math.sin(a) * long, -0.02)) for a, long in ((-0.45, 0.13), (-0.15, 0.18), (0.1, 0.24), (0.35, 0.28), (0.65, 0.18))]
        webbed(part, S(BALL), tips, lit(FROG_SKIN, 0.9), True)  # noqa: F821
        bind(arm, part, at, 'toes' + tag)  # noqa: F821
    return skinned(arm, part, 'groda-kropp', strength=0.45, reach=0.15, floor=0.0, leaf=True)  # noqa: F821


FROG_REST = {'root': {'at': (0, 0, 0)}, 'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'hips': (0, 0, 0), 'head': (0, 0, 0),
             'jaw': (0, 0, 0), 'throat': {'rot': (0, 0, 0), 'scale': 1.0}, 'tongue': {'rot': (0, 0, 0), 'scale': 1.0},
             'eye.L': {'loc': (0, 0, 0)}, 'arm.L': (0, 0, 0), 'forearm.L': (0, 0, 0), 'hand.L': (0, 0, 0),
             'thigh.L': (0, 0, 0), 'shin.L': (0, 0, 0), 'foot.L': (0, 0, 0), 'toes.L': (0, 0, 0)}


def frog(*extra):
    return over(FROG_REST, *extra)


PUMP = {'throat': {'rot': (0, 0, 0), 'scale': (1.12, 1.4, 1.12)}}
BLINK = {'eye.L': {'loc': (0, -0.055, 0)}}


def leg_line(thigh, shin, foot, toes):
    """The hind legs, each bone pointing a way of its own in the frog's space, their tops up."""
    return {'thigh.L': {'dir': thigh, 'up': (0, 0, 1)}, 'shin.L': {'dir': shin, 'up': (0, 0, 1)},
            'foot.L': {'dir': foot, 'up': (0, 0, 1)}, 'toes.L': {'dir': toes, 'up': (0, 0, 1)}}


def arm_line(arm_, forearm, hand):
    return {'arm.L': {'dir': arm_, 'up': (1, 0, 0.2)}, 'forearm.L': {'dir': forearm, 'up': (1, 0, 0.2)},
            'hand.L': {'dir': hand, 'up': (0, 0, 1)}}


if wanted('groda'):
    arm = armature('groda', FROG_BONES)  # noqa: F821
    frog_mesh(arm)

    # sit: breathing, its throat pumping all the while, a little tilt of its head, and a blink.
    keys = []
    for f in range(0, 96, 3):
        pose = frog({'body': {'loc': (0, 0, 0.006 * math.sin(f / 96.0 * 4 * math.pi)), 'rot': (0, 0, 0)}})
        if (f // 3) % 2:
            pose.update(PUMP)
        if 30 <= f <= 48:
            pose['head'] = (3, 0, 5)
        if f in (66, 69):
            pose.update(BLINK)
        keys.append((f, pose))
    clip(arm, 'sit', 96, keys)  # noqa: F821

    # hop: a crouch, the push with its legs straightening, the leap with them out behind and its arms reaching, and the
    # landing on its hands, its legs folding back under it. The game carries it forward from HOP_LIFT to HOP_LAND.
    CROUCH = {'root': {'at': (0, 0, -0.025)}, 'body': {'loc': (0, 0, 0), 'rot': (-8, 0, 0)}, 'head': (-4, 0, 0), 'hips': (6, 0, 0)}
    PUSH = over({'root': {'at': (0, 0, 0.17)}, 'body': {'loc': (0, 0, 0), 'rot': (28, 0, 0)}, 'head': (-10, 0, 0), 'hips': (-8, 0, 0)},
                leg_line((-0.85, 0.3, -0.45), (-0.92, 0.15, -0.38), (-0.9, 0.06, -0.42), (-0.6, 0.0, -0.8)),
                arm_line((-0.45, 0.35, -0.82), (-0.6, 0.1, -0.8), (-0.9, 0.0, -0.4)))
    AIR = over({'body': {'loc': (0, 0, 0), 'rot': (6, 0, 0)}, 'head': (-6, 0, 0), 'hips': (-6, 0, 0)},
               leg_line((-0.94, 0.3, -0.16), (-0.97, 0.14, -0.2), (-0.97, 0.06, -0.22), (-0.92, 0.0, -0.38)),
               arm_line((0.2, 0.4, -0.9), (0.5, 0.05, -0.86), (0.9, 0.0, -0.4)))
    REACH = over({'body': {'loc': (0, 0, 0), 'rot': (-14, 0, 0)}, 'head': (6, 0, 0)},
                 leg_line((-0.8, 0.5, -0.3), (-0.9, 0.3, -0.3), (-0.95, 0.1, -0.3), (-0.9, 0.0, -0.4)),
                 arm_line((0.55, 0.3, -0.78), (0.6, 0.0, -0.8), (0.95, 0.0, -0.3)))
    keys = [(0, frog()), (HOP_LIFT, frog(CROUCH)), (7, frog(CROUCH, {'root': {'at': (0, 0, 0.05)}, 'body': {'loc': (0, 0, 0), 'rot': (14, 0, 0)}})),
            (10, frog(PUSH)), (13, frog(AIR, {'root': {'at': (0, 0, 0.33)}})), (15, frog(AIR, {'root': {'at': (0, 0, 0.36)}})),
            (17, frog(REACH, {'root': {'at': (0, 0, 0.24)}})),
            (HOP_LAND, frog(REACH, {'root': {'at': (0, 0, 0.0)}, 'body': {'loc': (0, 0, 0), 'rot': (-12, 0, 0)}})),
            (22, frog({'root': {'at': (0, 0, -0.03)}, 'body': {'loc': (0, 0, 0), 'rot': (-6, 0, 0)}, 'hips': (4, 0, 0)})),
            (25, frog({'root': {'at': (0, 0, -0.012)}, 'body': {'loc': (0, 0, 0), 'rot': (-2, 0, 0)}})), (HOP_FRAMES, frog())]
    clip(arm, 'hop', HOP_FRAMES, keys, loop=False)  # noqa: F821

    # croak: its head up a little, and its throat swelling round and falling, twice, its body heaving with it.
    BIG = {'throat': {'rot': (0, 0, 0), 'scale': (1.9, 2.6, 1.9)}}
    keys = [(0, frog()), (6, frog({'head': (6, 0, 0)})), (12, frog({'head': (8, 0, 0), 'body': {'loc': (0, 0, 0.012), 'rot': (2, 0, 0)}}, BIG)),
            (18, frog({'head': (6, 0, 0)})), (26, frog({'head': (8, 0, 0), 'body': {'loc': (0, 0, 0.012), 'rot': (2, 0, 0)}}, BIG)),
            (34, frog({'head': (5, 0, 0)})), (40, frog(PUMP)), (48, frog())]
    clip(arm, 'croak', 48, keys, loop=False)  # noqa: F821

    # catch: it turns its head up to a fly, its mouth opens, its tongue flicks out and back in a blink, and it gulps,
    # its eyes sinking in to push the fly down.
    LOOK = {'body': {'loc': (0, 0, 0), 'rot': (8, 0, 0)}, 'head': (10, 0, 10)}
    OPEN = {'jaw': (-30, 0, 0)}
    keys = [(0, frog()), (6, frog(LOOK)), (9, frog(LOOK, OPEN)),
            (10, frog(LOOK, OPEN, {'tongue': {'rot': (-172, 0, 0), 'scale': (1.0, 0.7, 1.0)}})),
            (12, frog(LOOK, OPEN, {'tongue': {'rot': (-158, 0, 0), 'scale': (1.0, 4.2, 1.0)}})),
            (14, frog(LOOK, OPEN, {'tongue': {'rot': (-172, 0, 0), 'scale': (1.0, 0.7, 1.0)}})),
            (15, frog(LOOK, {'jaw': (-12, 0, 0)})), (17, frog(LOOK)), (20, frog({'head': (4, 0, 4)})),
            (23, frog(BLINK, {'throat': {'rot': (0, 0, 0), 'scale': (1.15, 0.8, 1.15)}})), (26, frog(BLINK)), (30, frog()), (36, frog())]
    clip(arm, 'catch', 36, keys, loop=False)  # noqa: F821
    bake(arm)  # noqa: F821

# =====================================================================================================================
# The hedgehog: a dome of spines in rows from its brow back, each banded pale and dark with a pale tip, a skirt of
# brown fur under them, a pointed face with a black nose, small dark eyes and round ears, and four little legs.
# =====================================================================================================================

HOG_SKIN = tone('#4a3a2c')  # noqa: F821
HOG_FUR = tone('#7a6248')  # noqa: F821
HOG_FUR_DARK = tone('#5a4634')  # noqa: F821
HOG_FACE = tone('#b08e64')  # noqa: F821
HOG_SNOUT = tone('#6e5440')  # noqa: F821
HOG_MASK = tone('#4e3a2a')  # noqa: F821
HOG_NOSE = tone('#141010')  # noqa: F821
HOG_EAR = tone('#6a4e3e')  # noqa: F821
HOG_PAW = tone('#5a4234')  # noqa: F821
HOG_CLAW = tone('#c8b8a0')  # noqa: F821
SPINE_BASE = tone('#d4c4a4')  # noqa: F821
SPINE_BAND = tone('#3a2a1e')  # noqa: F821
SPINE_TIP = tone('#ece2cc')  # noqa: F821

MANTLE_C = V(-0.1, 0.0, 0.3)
MANTLE_AXES = (0.95, 0.72, 0.62)
HOG_CHAIN = ['rump', 'hips', 'body', 'chest', 'front']

HOG_BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.2), {'deform': False}),
    ('body', 'root', (-0.05, 0, 0.32), (0.2, 0, 0.32)),
    ('chest', 'body', (0.2, 0, 0.32), (0.46, 0, 0.32), {'connect': True}),
    ('front', 'chest', (0.46, 0, 0.32), (0.7, 0, 0.31), {'connect': True}),
    ('hips', 'body', (-0.05, 0, 0.32), (-0.36, 0, 0.32)),
    ('rump', 'hips', (-0.36, 0, 0.32), (-0.7, 0, 0.3), {'connect': True}),
    ('head', 'front', (0.6, 0, 0.36), (0.98, 0, 0.3)),
    ('snout', 'head', (0.98, 0, 0.3), (1.24, 0, 0.27), {'connect': True}),
    ('arm.L', 'front', (0.42, 0.3, 0.22), (0.48, 0.32, 0.03)),
    ('paw.L', 'arm.L', (0.48, 0.32, 0.03), (0.6, 0.32, 0.02), {'connect': True}),
    ('leg.L', 'rump', (-0.45, 0.33, 0.22), (-0.47, 0.35, 0.03)),
    ('foot.L', 'leg.L', (-0.47, 0.35, 0.03), (-0.33, 0.35, 0.02), {'connect': True}),
]


def mantle_point(a, b):
    """A point on the spiny mantle, `a` degrees from its front back along it and `b` round it from the top, with the
    way out from it and the way back along it."""
    ax, ay, az = MANTLE_AXES
    ra = math.radians(a)
    rb = math.radians(b)
    d = V(ax * math.cos(ra), ay * math.sin(ra) * math.sin(rb), az * math.sin(ra) * math.cos(rb))
    p = MANTLE_C + d
    out = V(d.x / (ax * ax), d.y / (ay * ay), d.z / (az * az)).normalized()
    back = V(-ax * math.sin(ra), ay * math.cos(ra) * math.sin(rb), az * math.cos(ra) * math.cos(rb)).normalized()
    return p, out, back


def spine(part, root, way, long, wide, dark):
    """One spine: a thin three-sided cone, pale at its root, a dark band, and a pale tip."""
    side = way.cross(V(0, 0, 1))
    if side.length < 0.01:
        side = way.cross(V(1, 0, 0))
    side.normalize()
    up = side.cross(way).normalized()
    rings = []
    for s, r in ((0.0, wide), (0.42, wide * 0.8), (0.74, wide * 0.55)):
        centre = root + way * (long * s)
        rings.append([centre + (side * math.cos(TAU * j / 3.0) + up * math.sin(TAU * j / 3.0)) * r for j in range(3)])  # noqa: F821
    band = lit(SPINE_BAND, dark)  # noqa: F821
    skin(part, rings, [lit(SPINE_BASE, 0.8 + 0.2 * dark), band, band], None, (root + way * long, SPINE_TIP))  # noqa: F821


def hog_mesh(arm):
    part = new_part()  # noqa: F821
    # --- the mantle under the spines
    at = mark(part)  # noqa: F821
    rings = []
    for i in range(17):
        a = 26.0 + (170.0 - 26.0) * i / 16.0
        rings.append([mantle_point(a, -100.0 + 200.0 * j / 20.0)[0] for j in range(21)])
    skin(part, rings, [HOG_SKIN] * len(rings), closed=False)  # noqa: F821
    bind(arm, part, at, HOG_CHAIN, blend=0.2)  # noqa: F821
    # --- the spines, in rows across it, each row's set between the last's
    count = 0
    for r in range(15):
        b = -96.0 + 192.0 * r / 14.0
        edge = abs(b) / 96.0
        for k in range(23):
            a = 30.0 + (166.0 - 30.0) * (k + 0.5 * (r % 2)) / 22.5
            a += 3.0 * (rnd(r, k) - 0.5)  # noqa: F821
            root, out, back = mantle_point(a, b + 4.0 * (rnd(k, r) - 0.5))  # noqa: F821
            way = (out * 0.5 + back * 0.86 + V(0, 0, 0.12) * (1.0 - edge)).normalized()
            way = (way + V(rnd(r, k + 50) - 0.5, rnd(k, r + 50) - 0.5, rnd(r + k, 3.0) - 0.5) * 0.18).normalized()  # noqa: F821
            long = (0.27 + 0.07 * rnd(r * 3.0, k)) * (1.0 - 0.35 * edge ** 2) * (0.8 + 0.2 * smooth((a - 30.0) / 30.0))  # noqa: F821
            shares = _chain_shares(arm, HOG_CHAIN, root, 0.2)  # noqa: F821
            at = mark(part)  # noqa: F821
            spine(part, root - out * 0.02, way, long, 0.026, 0.8 + 0.4 * rnd(k, r * 7.0))  # noqa: F821
            bind(arm, part, at, dict(shares))  # noqa: F821
            count += 1
    # --- the body under them, its fur hanging below the spines in a skirt
    at = mark(part)  # noqa: F821
    rows = [(-0.95, 0.18, 0.12, 0.32), (-0.8, 0.46, 0.07, 0.46), (-0.5, 0.6, 0.05, 0.56), (-0.1, 0.64, 0.05, 0.6),
            (0.3, 0.58, 0.06, 0.55), (0.52, 0.44, 0.1, 0.5), (0.66, 0.3, 0.13, 0.46)]
    loft_x(part, rows, 18, HOG_FUR, flat=0.7)
    for p in everything(part, at):
        f = noise(p.co.x * 18.0, p.co.y * 18.0, p.co.z * 18.0)  # noqa: F821
        part['paint'][p] = mix(mix(HOG_FUR_DARK, HOG_FUR, f * 1.4), HOG_FACE, smooth((0.16 - p.co.z) / 0.1) * 0.4)
    bind(arm, part, at, HOG_CHAIN, blend=0.18)  # noqa: F821
    # --- the face: pointed, pale brown going dark at the snout, a dark mask round the eyes
    at = mark(part)  # noqa: F821
    rows = [(0.46, 0.3, 0.12, 0.56), (0.62, 0.28, 0.13, 0.54), (0.78, 0.22, 0.15, 0.48), (0.92, 0.16, 0.18, 0.42),
            (1.04, 0.1, 0.205, 0.36), (1.14, 0.06, 0.225, 0.32), (1.2, 0.035, 0.24, 0.3)]
    loft_x(part, rows, 16, HOG_FACE)
    for p in everything(part, at):
        f = noise(p.co.x * 22.0, p.co.y * 22.0, p.co.z * 22.0)  # noqa: F821
        c = mix(HOG_FACE, HOG_SNOUT, smooth((p.co.x - 0.95) / 0.2))
        c = mix(c, HOG_MASK, 0.7 * smooth((0.1 - (p.co - V(0.88, math.copysign(0.13, p.co.y), 0.4)).length) / 0.05))
        c = mix(c, HOG_FUR, smooth((p.co.z - 0.48) / 0.05) * 0.6)
        part['paint'][p] = lit(c, 0.92 + 0.16 * f)  # noqa: F821
    bind(arm, part, at, ['head', 'snout'], blend=0.06)  # noqa: F821
    at = mark(part)  # noqa: F821
    lump(part, V(1.215, 0.0, 0.272), (0.045, 0.052, 0.042), 2, HOG_NOSE)  # noqa: F821
    shine(part, V(1.24, -0.02, 0.29), (0.01, 0.008, 0.008), tone('#9a9a9a'))  # noqa: F821
    bind(arm, part, at, 'snout')  # noqa: F821
    at = mark(part)  # noqa: F821
    for side in (-1.0, 1.0):
        lump(part, V(0.9, side * 0.138, 0.405), (0.034, 0.022, 0.036), 2, HOG_NOSE)  # noqa: F821
        shine(part, V(0.915, side * 0.152, 0.418), (0.009, 0.004, 0.009))
        ear = lump(part, V(0.66, side * 0.25, 0.53), (0.05, 0.028, 0.062), 2, HOG_EAR)  # noqa: F821
        for p in ear:
            if p.co.x > 0.66:
                part['paint'][p] = lit(HOG_EAR, 1.25)  # noqa: F821
    bind(arm, part, at, 'head')  # noqa: F821
    # --- the four little legs, dark, with pale claws
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        for leg, paw, top, foot in (('arm', 'paw', V(0.42, 0.3, 0.22), V(0.48, 0.32, 0.03)), ('leg', 'foot', V(-0.45, 0.33, 0.22), V(-0.47, 0.35, 0.03))):
            at = mark(part)  # noqa: F821
            tube(part, [V(top.x, side * top.y, top.z), V(foot.x, side * foot.y, foot.z + 0.03)], [0.065, 0.045], [HOG_FUR_DARK, HOG_PAW], 7)  # noqa: F821
            bind(arm, part, at, leg + tag)  # noqa: F821
            at = mark(part)  # noqa: F821
            lump(part, V(foot.x + 0.05, side * foot.y, 0.025), (0.075, 0.05, 0.025), 2, HOG_PAW)  # noqa: F821
            for k in (-1.0, 0.0, 1.0):
                lump(part, V(foot.x + 0.12, side * foot.y + k * 0.028, 0.015), (0.02, 0.008, 0.008), 1, HOG_CLAW)  # noqa: F821
            bind(arm, part, at, paw + tag)  # noqa: F821
    print('igelkott:', count, 'spines')
    return skinned(arm, part, 'igelkott-kropp', strength=0.5, reach=0.2, floor=0.0)  # noqa: F821


HOG_REST = {'root': {'at': (0, 0, 0)}, 'body': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'hips': (0, 0, 0), 'chest': (0, 0, 0),
            'front': (0, 0, 0), 'rump': (0, 0, 0),
            'head': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'snout': (0, 0, 0), 'arm.L': (0, 0, 0), 'paw.L': (0, 0, 0),
            'leg.L': (0, 0, 0), 'foot.L': (0, 0, 0)}


def hog(*extra):
    return over(HOG_REST, *extra)


def step(tag, leg, paw, q, stance=0.55, swing=29.0):
    """One leg at q of a stride: back along the ground, then lifted and brought forward."""
    if q < stance:
        a = swing - 2.0 * swing * (q / stance)
        return {leg + tag: (a, 0, 0), paw + tag: (-a, 0, 0)}
    s = (q - stance) / (1.0 - stance)
    a = -swing + 2.0 * swing * smooth(s)
    return {leg + tag: (a, 0, 4.0 * math.sin(math.pi * s)), paw + tag: (-a + 30.0 * math.sin(math.pi * s), 0, 0)}


CURLED = {'root': {'at': (0, 0, 0.08)}, 'body': {'loc': (0, 0, 0), 'rot': (-4, 0, 0)}, 'chest': (-42, 0, 0), 'front': (-48, 0, 0),
          'hips': (40, 0, 0), 'rump': (48, 0, 0), 'head': {'loc': (0, -0.1, -0.04), 'rot': (-70, 0, 0)}, 'snout': (-40, 0, 0),
          'arm.L': (-70, 0, 0), 'paw.L': (-40, 0, 0), 'leg.L': (80, 0, 0), 'foot.L': (60, 0, 0)}


def curled(k, head=None):
    """The curl `k` of the way into the ball (0 standing, 1 the ball)."""
    out = {}
    for bone in ('chest', 'front', 'hips', 'rump', 'arm.L', 'paw.L', 'leg.L', 'foot.L', 'snout'):
        out[bone] = tuple(v * k for v in CURLED[bone])
    out['root'] = {'at': (0, 0, 0.08 * k)}
    out['body'] = {'loc': (0, 0, 0), 'rot': (-4 * k, 0, 0)}
    out['head'] = head or {'loc': tuple(v * k for v in CURLED['head']['loc']), 'rot': tuple(v * k for v in CURLED['head']['rot'])}
    return out

if wanted('igelkott'):
    arm = armature('igelkott', HOG_BONES)  # noqa: F821
    hog_mesh(arm)

    # walk: one stride, the legs going in diagonal pairs; it bobs twice and waddles from side to side once, its snout
    # sniffing the way.
    keys = []
    for f in range(0, 16):
        p = f / 16.0
        pose = hog(step('.L', 'arm', 'paw', p), step('.R', 'arm', 'paw', (p + 0.5) % 1.0),
                   step('.L', 'leg', 'foot', (p + 0.5) % 1.0), step('.R', 'leg', 'foot', p),
                   {'body': {'loc': (0, 0, 0.012 * math.cos(4 * math.pi * p)), 'rot': (0, 4.0 * math.sin(2 * math.pi * p), 2.0 * math.sin(2 * math.pi * p))},
                    'chest': (0, -2.0 * math.sin(2 * math.pi * p), 0), 'head': {'loc': (0, 0, 0), 'rot': (-6, 0, -3.0 * math.sin(2 * math.pi * p))},
                    'snout': (4.0 * math.sin(8 * math.pi * p), 0, 3.0 * math.sin(4 * math.pi * p))})
        keys.append((f, pose))
    clip(arm, 'walk', 16, keys)  # noqa: F821

    # sniff: its head up, snuffling in quick little bursts, to one side and the other, and down to the ground.
    keys = [(0, hog())]
    for start, turn, lift in ((6, 22, 12), (28, -26, 8), (50, 0, -14)):
        keys.append((start, hog({'head': {'loc': (0, 0, 0), 'rot': (lift, 0, turn)}, 'chest': (4 if lift > 0 else -3, 0, 0)})))
        for k in range(6):
            keys.append((start + 3 + 2 * k, hog({'head': {'loc': (0, 0, 0), 'rot': (lift + (2 if k % 2 else -2), 0, turn)},
                                                 'chest': (4 if lift > 0 else -3, 0, 0), 'snout': ((8 if k % 2 else -6), 0, (4 if k % 3 else -4)),
                                                 'front': (3 if lift > 0 else -3, 0, 0),
                                                 'arm.L': (14 if lift > 0 and turn > 0 else 0, 0, 0)})))
    keys.append((72, hog()))
    clip(arm, 'sniff', 72, keys)  # noqa: F821

    # curl: into a ball, its head and legs tucked under, the spines all round.
    keys = [(0, hog()), (5, hog(curled(0.15, {'loc': (0, 0, 0), 'rot': (-40, 0, 0)}))),
            (12, hog(curled(0.65))), (19, hog(curled(1.06))), (24, hog(CURLED))]
    clip(arm, 'curl', 24, keys, loop=False)  # noqa: F821

    # uncurl: from the ball, it loosens, its snout peeks out and sniffs, and it opens and stands.
    PEEK = over(curled(0.8, {'loc': (0, -0.06, -0.02), 'rot': (-45, 0, 0)}), {'snout': (8, 0, 0)})
    keys = [(0, hog(CURLED)), (8, hog(PEEK))]
    for k in range(5):
        keys.append((10 + 2 * k, hog(PEEK, {'snout': (8 + (6 if k % 2 else -6), 0, (5 if k % 2 else -3))})))
    keys += [(26, hog(curled(0.45, {'loc': (0, -0.02, 0), 'rot': (-25, 0, 0)}))),
             (34, hog(curled(0.08, {'loc': (0, 0, 0), 'rot': (-8, 0, 0)}))),
             (40, hog({'head': {'loc': (0, 0, 0), 'rot': (8, 0, 6)}, 'snout': (6, 0, 0)})), (48, hog())]
    clip(arm, 'uncurl', 48, keys, loop=False)  # noqa: F821
    bake(arm)  # noqa: F821

# =====================================================================================================================
# The garden snail: a glossy brown shell coiled in a widening spiral, banded with broken dark stripes and fine growth
# lines, its pale lip at the mouth; and its grey-brown body, wet and finely grooved, with a paler rim to its foot, two
# long eyestalks with dark eyes at their tips, and two short feelers.
# =====================================================================================================================

SHELL = tone('#b8925a')  # noqa: F821
SHELL_DARK = tone('#4a3020')  # noqa: F821
SHELL_LINE = tone('#d4b884')  # noqa: F821
SHELL_LIP = tone('#e8dcc4')  # noqa: F821
SHELL_APEX = tone('#7a5a38')  # noqa: F821
SNAIL = tone('#7c7062')  # noqa: F821
SNAIL_DARK = tone('#4e463e')  # noqa: F821
SNAIL_PALE = tone('#a8a094')  # noqa: F821
SNAIL_EYE = tone('#221e1a')  # noqa: F821
SNAIL_INSIDE = tone('#3a3430')  # noqa: F821

SHELL_C = V(-0.05, 0.0, 0.62)
SHELL_R = 0.37
SHELL_TURN = math.log(2.6) / TAU  # noqa: F821
SHELL_START = math.radians(-40.0)

# The snail's wet look: its corners' colours, a little glossy, seen from both sides (the inside of its shell).
WET = LEAF.copy()  # noqa: F821
WET.name = 'kit-wet'
for node in WET.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.32

SNAIL_BONES = [
    ('root', None, (0, 0, 0), (0, 0, 0.15), {'deform': False}),
    ('foot1', 'root', (-0.1, 0, 0.1), (0.2, 0, 0.1)),
    ('tail', 'foot1', (-0.1, 0, 0.1), (-0.58, 0, 0.04)),
    ('neck', 'foot1', (0.2, 0, 0.12), (0.55, 0, 0.24)),
    ('head', 'neck', (0.55, 0, 0.24), (0.82, 0, 0.3), {'connect': True}),
    ('stalk.L', 'head', (0.74, 0.055, 0.36), (0.9, 0.13, 0.64)),
    ('feeler.L', 'head', (0.82, 0.06, 0.25), (0.93, 0.1, 0.2)),
    ('shell', 'root', (-0.05, 0, 0.25), (-0.05, 0, 0.6)),
]


def shell_at(t):
    """The middle of the shell's tube at `t` radians coiled in from its mouth, and the tube's radius there."""
    k = math.exp(-SHELL_TURN * t)
    a = SHELL_START - t
    return V(SHELL_C.x + SHELL_R * k * math.cos(a), SHELL_C.y - 0.13 * (1.0 - k), SHELL_C.z + SHELL_R * k * math.sin(a)), 0.48 * SHELL_R * k


def snail_mesh(arm):
    part = new_part()  # noqa: F821
    # --- the shell, its mouth at the front, low, where the body comes out of it
    at = mark(part)  # noqa: F821
    steps = 60
    path = []
    radii = []
    for i in range(steps + 1):
        t = 20.0 * i / steps
        c, r = shell_at(t)
        path.append(c)
        radii.append(max(0.004, r))
    made = tube(part, path, radii, [SHELL] * len(path), 28, twist=0.0)  # noqa: F821
    for i, ring in enumerate(made):
        t = 20.0 * i / steps
        c = path[i]
        out = (c - V(SHELL_C.x, c.y, SHELL_C.z))
        out = V(out.x, 0.0, out.z).normalized()
        for p in ring:
            d = p.co - c
            psi = math.degrees(math.atan2(-d.y, d.dot(out)))
            colour = mix(SHELL, SHELL_APEX, smooth((t - 12.0) / 6.0))
            # Its dark bands run round the coil on both its flat sides, where they are seen, broken into flecks.
            for band in (-112.0, -84.0, -58.0, 58.0, 84.0, 112.0):
                fleck = noise(t * 2.6, band * 0.1, 1.0)  # noqa: F821
                colour = mix(colour, SHELL_DARK, 0.85 * smooth((9.0 - abs(psi - band)) / 4.0) * smooth((fleck - 0.3) / 0.12))
            colour = mix(colour, SHELL_LINE, 0.35 * smooth((math.sin(t * 22.0 + noise(t, 0.0, 2.0) * 3.0) - 0.6) / 0.3))  # noqa: F821
            if i == 0:
                colour = SHELL_LIP
            part['paint'][p] = lit(colour, 0.95 + 0.1 * noise(p.co.x * 30.0, p.co.y * 30.0, p.co.z * 30.0))  # noqa: F821
    # Its mouth, closed by the dark of the body within it.
    mouth = everything(part, at)
    part['paint'][mouth[-2]] = SNAIL_INSIDE
    bind(arm, part, at, 'shell')  # noqa: F821
    # --- the body: a long foot, flat on the ground, rising at the front into its neck and head
    at = mark(part)  # noqa: F821
    rows = [(-0.6, 0.025, -0.025, 0.025), (-0.5, 0.08, -0.08, 0.08), (-0.36, 0.13, -0.13, 0.13), (-0.18, 0.16, -0.17, 0.17),
            (0.0, 0.17, -0.2, 0.2), (0.2, 0.17, -0.24, 0.24), (0.4, 0.15, -0.29, 0.29), (0.56, 0.135, -0.35, 0.35),
            (0.68, 0.125, -0.39, 0.39), (0.77, 0.11, -0.39, 0.39), (0.84, 0.08, -0.36, 0.36), (0.88, 0.04, -0.31, 0.31)]
    loft_x(part, rows, 20, SNAIL)
    for p in everything(part, at):
        # The lower half is its sole, flat on the ground; at the front the head lifts off it.
        lift = 0.2 * smooth((p.co.x - 0.6) / 0.25)
        if p.co.z < lift:
            p.co.z = lift + (p.co.z - lift) * 0.12 if lift > 0.01 else 0.004
        g = noise(p.co.x * 34.0, p.co.y * 34.0, p.co.z * 34.0)  # noqa: F821
        c = mix(SNAIL, SNAIL_DARK, 0.75 * smooth((0.06 - abs(g - 0.5)) / 0.04))
        c = mix(c, SNAIL_PALE, smooth((0.03 - p.co.z) / 0.03) * 0.8)
        c = mix(c, SNAIL_PALE, 0.35 * smooth((0.04 - abs(p.co.y)) / 0.03) * smooth((p.co.z - 0.15) / 0.05))
        part['paint'][p] = c
    bind(arm, part, at, ['tail', 'foot1', 'neck', 'head'], blend=0.1)  # noqa: F821
    # A collar where the body goes into the shell.
    at = mark(part)  # noqa: F821
    c0, r0 = shell_at(0.0)
    collar = lump(part, c0 + V(0.02, 0.0, -0.04), (0.08, r0 * 0.85, r0 * 0.75), 2, SNAIL_DARK)  # noqa: F821
    for p in collar:
        part['paint'][p] = mix(SNAIL_DARK, SNAIL, noise(p.co.x * 30.0, p.co.y * 30.0, p.co.z * 30.0))  # noqa: F821
    bind(arm, part, at, 'foot1')  # noqa: F821
    # --- the eyestalks and the feelers
    for side, tag in ((1.0, '.L'), (-1.0, '.R')):
        at = mark(part)  # noqa: F821
        tube(part, [V(0.74, side * 0.055, 0.34), V(0.8, side * 0.09, 0.5), V(0.88, side * 0.125, 0.62)], [0.028, 0.019, 0.015],  # noqa: F821
             [SNAIL, SNAIL, SNAIL_DARK], 7)
        lump(part, V(0.895, side * 0.13, 0.648), (0.032, 0.03, 0.032), 2, SNAIL_EYE)  # noqa: F821
        shine(part, V(0.915, side * 0.128, 0.668), (0.008, 0.006, 0.008))
        bind(arm, part, at, 'stalk' + tag)  # noqa: F821
        at = mark(part)  # noqa: F821
        tube(part, [V(0.8, side * 0.05, 0.27), V(0.88, side * 0.085, 0.23), V(0.94, side * 0.1, 0.2)], [0.02, 0.014, 0.009], [SNAIL] * 3, 6)  # noqa: F821
        bind(arm, part, at, 'feeler' + tag)  # noqa: F821
    made = skinned(arm, part, 'snigel-kropp', strength=0.45, reach=0.15, floor=0.0, leaf=True)  # noqa: F821
    made.data.materials[0] = WET
    return made


SNAIL_REST = {'root': {'at': (0, 0, 0)}, 'foot1': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 1.0},
              'tail': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 1.0}, 'neck': {'rot': (0, 0, 0), 'scale': 1.0},
              'head': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}, 'stalk.L': {'rot': (0, 0, 0), 'scale': 1.0},
              'feeler.L': {'rot': (0, 0, 0), 'scale': 1.0}, 'shell': {'loc': (0, 0, 0), 'rot': (0, 0, 0)}}


def snail(*extra):
    return over(SNAIL_REST, *extra)


def stalks(left, right, size_l=1.0, size_r=1.0):
    return {'stalk.L': {'rot': left, 'scale': size_l}, 'stalk.R': {'rot': right, 'scale': size_r}}


if wanted('snigel'):
    arm = armature('snigel', SNAIL_BONES)  # noqa: F821
    snail_mesh(arm)

    # crawl: a wave along its foot, its head pushing on and its tail drawn after; the shell rocking a little; its
    # eyestalks swaying, each in its own time.
    keys = []
    for f in range(0, 72, 4):
        p = f / 72.0
        s = math.sin(TAU * p)  # noqa: F821
        c = math.cos(TAU * p)  # noqa: F821
        keys.append((f, snail({'head': {'loc': (0, 0.035 * max(0.0, s), 0), 'rot': (2.0 * s, 0, 0)},
                               'tail': {'loc': (0, -0.03 * max(0.0, -s), 0), 'rot': (0, 0, 0), 'scale': 1.0},
                               'foot1': {'loc': (0, 0.008 * c, 0), 'rot': (0, 0, 0), 'scale': 1.0},
                               'shell': {'loc': (0, 0.008 * (0.5 + 0.5 * c), 0), 'rot': (2.5 * s, 1.5 * c, 0)}},
                              stalks((6.0 * s, 0, 9.0 * c), (6.0 * math.sin(TAU * p + 1.9), 0, -9.0 * math.cos(TAU * p + 1.3))),  # noqa: F821
                              {'feeler.L': {'rot': (8.0 * c, 0, 6.0 * s), 'scale': 1.0}})))
    clip(arm, 'crawl', 72, keys)  # noqa: F821

    # look: its head up, its eyestalks stretching long and waving; one drawn in as if touched, and out again; then the
    # other.
    UP = {'neck': {'rot': (14, 0, 0), 'scale': 1.0}, 'head': {'loc': (0, 0.02, 0), 'rot': (6, 0, 0)}}
    keys = [(0, snail()), (12, snail(UP, stalks((0, 0, 10), (0, 0, -10), 1.32, 1.32))),
            (24, snail(UP, stalks((12, 0, 18), (-6, 0, -6), 1.36, 1.3))), (34, snail(UP, stalks((-6, 0, 6), (10, 0, -18), 1.3, 1.36))),
            (40, snail(UP, stalks((-6, 0, 6), (10, 0, -18), 0.22, 1.36))), (46, snail(UP, stalks((-6, 0, 6), (10, 0, -18), 0.3, 1.36))),
            (56, snail(UP, stalks((4, 0, 12), (4, 0, -12), 1.3, 1.32))),
            (64, snail(UP, {'head': {'loc': (0, 0.02, 0), 'rot': (6, 0, 16)}}, stalks((4, 0, 16), (4, 0, -8), 1.3, 1.3))),
            (72, snail(UP, {'head': {'loc': (0, 0.02, 0), 'rot': (6, 0, 16)}}, stalks((4, 0, 16), (4, 0, -8), 1.3, 0.25))),
            (80, snail(UP, stalks((4, 0, 10), (4, 0, -10), 1.3, 1.2))), (96, snail())]
    clip(arm, 'look', 96, keys)  # noqa: F821

    # hide: its eyestalks and feelers drawn in at once, then its head, its neck and its foot into the shell, which
    # settles down onto the ground.
    keys = [(0, snail()), (4, snail(stalks((0, 0, 0), (0, 0, 0), 0.08, 0.08), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.1}})),
            (9, snail(stalks((0, 0, 0), (0, 0, 0), 0.05, 0.05), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.05},
                                                                    'neck': {'rot': (-12, 0, 0), 'scale': 0.7}, 'head': {'loc': (0, 0, 0), 'rot': (-20, 0, 0)}})),
            (17, snail(stalks((0, 0, 0), (0, 0, 0), 0.05, 0.05), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.05},
                                                                     'neck': {'rot': (-20, 0, 0), 'scale': 0.32}, 'head': {'loc': (0, 0, 0), 'rot': (-30, 0, 0)},
                                                                     'tail': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 0.45},
                                                                     'foot1': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 0.8},
                                                                     'shell': {'loc': (0, -0.03, 0), 'rot': (3, 0, 0)}})),
            (26, snail(stalks((0, 0, 0), (0, 0, 0), 0.05, 0.05), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.05},
                                                                     'neck': {'rot': (-20, 0, 0), 'scale': 0.15}, 'head': {'loc': (0, 0, 0), 'rot': (-30, 0, 0)},
                                                                     'tail': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 0.2},
                                                                     'foot1': {'loc': (0, 0.06, 0), 'rot': (0, 0, 0), 'scale': 0.45},
                                                                     'shell': {'loc': (0, -0.1, 0), 'rot': (6, 0, 0)}})),
            (32, snail(stalks((0, 0, 0), (0, 0, 0), 0.05, 0.05), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.05},
                                                                     'neck': {'rot': (-20, 0, 0), 'scale': 0.15}, 'head': {'loc': (0, 0, 0), 'rot': (-30, 0, 0)},
                                                                     'tail': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 0.2},
                                                                     'foot1': {'loc': (0, 0.06, 0), 'rot': (0, 0, 0), 'scale': 0.45},
                                                                     'shell': {'loc': (0, -0.12, 0), 'rot': (4, 0, 0)}})),
            (36, snail(stalks((0, 0, 0), (0, 0, 0), 0.05, 0.05), {'feeler.L': {'rot': (0, 0, 0), 'scale': 0.05},
                                                                     'neck': {'rot': (-20, 0, 0), 'scale': 0.15}, 'head': {'loc': (0, 0, 0), 'rot': (-30, 0, 0)},
                                                                     'tail': {'loc': (0, 0, 0), 'rot': (0, 0, 0), 'scale': 0.2},
                                                                     'foot1': {'loc': (0, 0.06, 0), 'rot': (0, 0, 0), 'scale': 0.45},
                                                                     'shell': {'loc': (0, -0.115, 0), 'rot': (4, 0, 0)}}))]
    clip(arm, 'hide', 36, keys, loop=False)  # noqa: F821
    bake(arm)  # noqa: F821

PREVIEW_FRAMES = {
    'anka': {'paddle': [0, 7, 14, 21], 'dabble': [0, 16, 36, 64, 72], 'preen': [0, 20, 56, 80], 'look': [0, 20, 48],
             'quack': [0, 9, 17], 'flap': [8, 16, 24, 40, 64]},
    'groda': {'sit': [0, 3, 66], 'hop': [0, 4, 10, 15, 19, 22], 'croak': [0, 12, 26], 'catch': [0, 9, 12, 23]},
    'igelkott': {'walk': [0, 4, 8, 12], 'sniff': [0, 12, 34, 56], 'curl': [0, 8, 14, 24], 'uncurl': [0, 12, 26, 40]},
    'snigel': {'crawl': [0, 18, 36, 54], 'look': [0, 24, 40, 72], 'hide': [0, 6, 14, 22, 36]},
}
