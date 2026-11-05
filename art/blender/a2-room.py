"""Aventyr 2's family room, and the great stone of the meeting.

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Safe mode takes a
script of so many points and no more, so the kits are split. No letters, numbers or marks on anything.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)

UP = Vector((0.0, 0.0, 1.0))
FRONT_ = Vector((0.0, -1.0, 0.0))


def wanted(name):
    return ONLY is None or ONLY == name


def turned(part, profile, sides, centre=(0.0, 0.0, 0.0)):
    """A thing turned on a lathe: a profile of (radius, height, colour). A radius of 0 at an end closes it."""
    rings = []
    tones = []
    first = None
    last = None
    for i in range(len(profile)):
        radius = profile[i][0]
        height = profile[i][1]
        colour = profile[i][2]
        at = Vector((centre[0], centre[1], centre[2] + height))
        if radius <= 0.0 and i == 0:
            first = (at, colour)
            continue
        if radius <= 0.0 and i == len(profile) - 1:
            last = (at, colour)
            continue
        rings.append(circle(at, Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), radius, sides))
        tones.append(colour)
    return skin(part, rings, tones, first, last)



def pad(part, low, high, colour, soft=0.2, seed=0.0, dark=0.82):
    """A soft block, a cushion or a rounded piece of wood: its edges rounded by `soft`, a little darker underneath."""
    x0, y0, z0 = low
    x1, y1, z1 = high

    def outline(inset):
        points = []
        r = max(0.01, soft - inset)
        a = x0 + inset
        b = x1 - inset
        c = y0 + inset
        d = y1 - inset
        for cx, cy, start in ((b - r, d - r, 0.0), (a + r, d - r, 0.25), (a + r, c + r, 0.5), (b - r, c + r, 0.75)):
            for k in range(4):
                turn = TAU * (start + 0.25 * k / 3.0)
                points.append((cx + r * math.cos(turn), cy + r * math.sin(turn)))
        return points

    levels = ((z0, soft * 0.7, dark * 0.9), (z0 + soft * 0.32, soft * 0.2, dark), (z0 + soft, 0.0, 1.0), (z1 - soft, 0.0, 1.0), (z1 - soft * 0.32, soft * 0.2, 1.04), (z1, soft * 0.7, 1.08))
    rings = []
    tones = []
    for z, inset, k in levels:
        rings.append([Vector((x, y, z)) for x, y in outline(inset)])
        tones.append(lit(colour, k * (0.97 + 0.06 * rnd(seed, z))))
    mx = (x0 + x1) * 0.5
    my = (y0 + y1) * 0.5
    skin(part, rings, tones, (Vector((mx, my, z0)), lit(colour, dark * 0.85)), (Vector((mx, my, z1)), lit(colour, 1.1)))


# --- the family's room ---------------------------------------------------------------------------------------------
# A sofa, a floor lamp, a plant, and a table with its chairs: plain and well made, nobody's own. Each stands on its origin, its
# front towards -Y, in the sizes the room has them, drawn to a boy three times his small size.

def sofa(name, blanket):
    if not wanted(name):
        return
    part = new_part()
    CLOTH = tone('#5e6e4c')
    CLOTH_DARK = tone('#4a583c')
    WOOD = tone('#6a4a30')
    for x in (-4.9, 4.9):
        for y in (-1.5, 1.5):
            tube(part, [Vector((x, y, 0.0)), Vector((x, y, 0.5))], [0.11, 0.17], [WOOD, WOOD], 8)
    pad(part, (-5.5, -1.8, 0.46), (5.5, 1.8, 1.2), CLOTH_DARK, 0.18, 1.0)
    pad(part, (-5.5, 0.9, 0.46), (5.5, 1.8, 4.1), CLOTH_DARK, 0.3, 2.0)
    for side in (-1.0, 1.0):
        pad(part, (side * 5.6 - 0.56, -1.86, 0.46), (side * 5.6 + 0.56, 1.8, 2.72), CLOTH, 0.42, 3.0 + side)
    for i in range(3):
        x0 = -5.02 + i * 3.36
        pad(part, (x0, -1.84, 1.2), (x0 + 3.32, 0.96, 1.95), CLOTH, 0.26, 4.0 + i)
        pad(part, (x0 + 0.02, 0.3, 1.9), (x0 + 3.3, 1.1, 3.95), lit(CLOTH, 1.04), 0.34, 5.0 + i)
        # The piping along each cushion's front.
        strip(part, [Vector((x0 + 0.2, -1.86, 1.76)), Vector((x0 + 3.12, -1.86, 1.76))], 0.018, CLOTH_DARK, FRONT_)
    # A cushion in the corner, leaning.
    lump(part, Vector((3.7, 0.1, 2.72)), (0.86, 0.34, 0.74), 2, tone('#a8604a'))
    if blanket:
        # Bertil's blanket, pulled half off, over the seat and down its front.
        MUSTARD = tone('#b89a4a')
        rows = []
        tones = []
        for i in range(9):
            t = i / 8.0
            y = -1.9 if t > 0.5 else 1.0 - 5.6 * t
            z = 2.02 if t <= 0.5 else 2.0 - 3.0 * (t - 0.5)
            ring = []
            shades = []
            for k in range(8):
                s = k / 7.0
                x = -3.9 + 3.4 * s + 0.12 * math.sin(t * 7.0 + s * 3.0)
                ring.append(Vector((x, y + (0.05 * math.sin(s * 9.0) if t > 0.5 else 0.0), z + (0.05 * math.sin(s * 9.0 + t * 5.0) if t <= 0.5 else 0.0))))
                band = 0.7 if (k % 3 == 1) else 1.0
                shades.append(lit(MUSTARD, band * (0.92 + 0.14 * rnd(i, k))))
            rows.append(ring)
            tones.append(shades)
        skin(part, rows, tones, closed=False, flip=True)
    finish(part, name, sharp=60.0, strength=0.5, reach=0.8, floor=0.0, leaf=True)


sofa('soffa', False)
sofa('soffa-filt', True)

if wanted('golvlampa'):
    part = new_part()
    IRON_ = tone('#3a3e44')
    SHADE = tone('#e6dabe')
    INSIDE = tone('#fff0c8')
    turned(part, [(0.0, 0.0, IRON_), (0.78, 0.0, IRON_), (0.8, 0.06, lit(IRON_, 1.2)), (0.7, 0.13, IRON_), (0.14, 0.2, IRON_), (0.08, 0.34, lit(IRON_, 1.2)), (0.0, 0.34, IRON_)], 22)
    tube(part, [Vector((0.0, 0.0, 0.3)), Vector((0.0, 0.0, 6.0))], [0.065, 0.055], [IRON_, lit(IRON_, 1.2)], 10)
    rings = []
    tones = []
    for r, z, colour in ((1.17, 5.78, lit(SHADE, 0.9)), (1.19, 5.84, lit(SHADE, 1.08)), (1.02, 6.2, SHADE), (0.86, 6.62, lit(SHADE, 1.04)), (0.76, 7.0, lit(SHADE, 1.08)), (0.74, 7.04, lit(SHADE, 0.9))):
        rings.append(circle(Vector((0.0, 0.0, z)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), r, 26))
        tones.append(colour)
    skin(part, rings, tones, closed=True)
    # The shade's inside, warm, and the cord with its little bead.
    turned(part, [(1.14, 5.8, INSIDE), (0.72, 7.0, INSIDE)], 26)
    tube(part, [Vector((0.42, 0.0, 5.8)), Vector((0.44, 0.02, 5.1))], [0.012, 0.012], [IRON_] * 2, 4)
    lump(part, Vector((0.44, 0.02, 5.06)), (0.05, 0.05, 0.06), 1, tone('#b89a4a'))
    finish(part, 'golvlampa', sharp=50.0, strength=0.4, reach=0.5, floor=0.0, leaf=True)

if wanted('krukvaxt'):
    part = new_part()
    CLAY = tone('#a8704a')
    LEAFY = tone('#3a6a42')
    PALER = tone('#8aa85a')
    turned(part, [(0.0, 0.0, CLAY), (0.74, 0.0, CLAY), (0.78, 0.06, lit(CLAY, 1.1)), (0.58, 0.1, CLAY), (0.74, 1.0, CLAY), (0.8, 1.02, lit(CLAY, 1.1)), (0.8, 1.22, lit(CLAY, 1.1)), (0.7, 1.24, lit(CLAY, 0.8)), (0.68, 1.12, tone('#2c2018')), (0.0, 1.12, tone('#2c2018'))], 22)
    for i in range(11):
        turn = i * 2.399963
        lean = 0.08 + 0.26 * (i % 4) / 3.0
        tall = 2.2 + 1.5 * rnd(i, 1.0)
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        side = Vector((-math.sin(turn + 0.6), math.cos(turn + 0.6), 0.0))
        rows = []
        tones = []
        for k in range(7):
            t = k / 6.0
            wide = 0.2 * (1.0 - t ** 2.0) * (0.72 + 0.8 * min(1.0, t * 3.0)) + 0.004
            at = out * (0.14 + lean * 2.6 * t * t + 0.1 * t) + Vector((0.0, 0.0, 1.1 + tall * t))
            twist = side + UP * 0.0 + out * (0.5 * math.sin(t * 4.0))
            twist.normalize()
            rows.append([at - twist * wide, at, at + twist * wide])
            band = 0.8 + 0.3 * math.sin(k * 3.0 + i)
            tones.append([PALER, lit(LEAFY, band), PALER])
        skin(part, rows, tones, closed=False)
    finish(part, 'krukvaxt', sharp=60.0, strength=0.4, reach=0.4, floor=0.0, leaf=True)

if wanted('bord'):
    part = new_part()
    OAK_ = tone('#b58a58')
    OAK_DARK_ = tone('#8a6238')
    for i in range(5):
        y0 = -1.1 + i * 0.44
        pad(part, (-2.5, y0 + 0.01, 1.49), (2.5, y0 + 0.43, 1.65), lit(OAK_, 0.92 + 0.16 * rnd(i, 1.0)), 0.04, i * 1.0)
    pad(part, (-2.24, -0.86, 1.3), (2.24, 0.86, 1.5), OAK_DARK_, 0.04, 8.0)
    for x, y in ((-2.28, -0.88), (2.28, -0.88), (-2.28, 0.88), (2.28, 0.88)):
        turned(part, [(0.0, 0.0, OAK_DARK_), (0.07, 0.0, OAK_DARK_), (0.09, 0.3, OAK_), (0.12, 0.7, OAK_), (0.1, 0.96, OAK_), (0.14, 1.04, OAK_), (0.13, 1.3, OAK_), (0.0, 1.3, OAK_)], 10, (x, y, 0.0))
    finish(part, 'bord', sharp=50.0, strength=0.5, reach=0.5, floor=0.0, leaf=True)


def seat(name, high, back):
    if not wanted(name):
        return
    part = new_part()
    CREAM = tone('#d9cdb8')
    pad(part, (-0.55, -0.55, high - 0.06), (0.55, 0.55, high + 0.08), lit(CREAM, 1.04), 0.05, 1.0)
    for x, y in ((-0.45, -0.45), (0.45, -0.45), (-0.45, 0.45), (0.45, 0.45)):
        tube(part, [Vector((x * 1.08, y * 1.08, 0.0)), Vector((x, y, high))], [0.05, 0.075], [CREAM, CREAM], 8)
    for z in (high * 0.42,):
        tube(part, [Vector((-0.46, -0.46, z)), Vector((0.46, -0.46, z))], [0.03, 0.03], [CREAM] * 2, 6)
        tube(part, [Vector((-0.46, 0.46, z)), Vector((0.46, 0.46, z))], [0.03, 0.03], [CREAM] * 2, 6)
        tube(part, [Vector((-0.46, -0.46, z)), Vector((-0.46, 0.46, z))], [0.03, 0.03], [CREAM] * 2, 6)
        tube(part, [Vector((0.46, -0.46, z)), Vector((0.46, 0.46, z))], [0.03, 0.03], [CREAM] * 2, 6)
    if back:
        top = high + 1.5
        for x in (-0.48, 0.48):
            tube(part, [Vector((x, 0.5, high)), Vector((x, 0.56, top))], [0.06, 0.05], [CREAM, CREAM], 8)
        for x in (-0.24, 0.0, 0.24):
            tube(part, [Vector((x, 0.5, high)), Vector((x, 0.56, top - 0.2))], [0.03, 0.026], [CREAM, CREAM], 6)
        pad(part, (-0.56, 0.48, top - 0.26), (0.56, 0.62, top + 0.02), lit(CREAM, 1.04), 0.05, 3.0)
    finish(part, name, sharp=50.0, strength=0.5, reach=0.4, floor=0.0, leaf=True)


seat('stol', 1.25, True)
seat('pall', 1.15, False)


# --- the stone in the lake ---------------------------------------------------------------------------------------------
# The great stone of the meeting: a whale's back of granite, 20 long, its top at 0.6 where he walks. It goes down into the water
# before it in worn sheets, each with its own edge, and up behind him in others, with lichen on it, moss in its cracks and the wet
# dark at the waterline. Its origin is at the near end of the path, at the path's own height minus 0.6: the water is at -0.5.

if wanted('holme'):
    part = new_part()
    GRANITE = tone('#9aa0a8')
    GRANITE_PALE = tone('#c8cac4')
    CRACK = tone('#23272e')
    WET = tone('#262c34')
    LICHEN = tone('#c8b860')
    LICHEN_PALE = tone('#b4c0a4')
    MOSS = tone('#566f30')
    FLAT = 0.6

    def rise(t):
        t = max(0.0, min(1.0, t))
        return t * t * (3.0 - 2.0 * t)

    # The rows of the stone, front to back: (y, height, how lit), with a thin dark riser at each sheet's edge.
    def step(k, x):
        """How high one sheet stands over the next, here along it: some edges are a hand high, some die away altogether."""
        return 0.06 + 0.72 * rise((noise(x * 0.17 + k * 3.1, k * 2.3, 9.0) - 0.34) / 0.42)

    def level(k, x):
        """The height of sheet k at x: 0 is the path's, the sheets before it are negative, and those behind it positive."""
        high = FLAT
        for i in range(1, abs(k) + 1):
            high += (step(i, x) * 0.8 if k > 0 else -step(i + 7, x))
        return high

    plan = []
    for k in range(6, 0, -1):
        y0 = -1.0 - 1.1 * k
        plan.append((y0, -k - 1, 0.46, -k))
        plan.append((y0 + 0.08, -k, 0.9, -k))
        plan.append((y0 + 0.6, -k, 1.08, -k))
        plan.append((y0 + 1.04, -k, 1.0, -k))
    for y in (-1.0, -0.5, 0.0, 0.5, 1.0):
        plan.append((y, 0, 1.04, 0))
    for k in range(1, 6):
        y0 = 1.0 + 1.3 * (k - 1)
        plan.append((y0 + 0.06, k - 1, 0.5, k))
        plan.append((y0 + 0.14, k, 0.94, k))
        plan.append((y0 + 0.7, k, 1.1, k))
        plan.append((y0 + 1.26, k, 1.0, k))
    plan.append((8.0, 2, 0.6, 9))

    def ends(x):
        """How far the stone falls away towards its two ends, past the path's."""
        return 2.8 * rise((abs(x - 10.0) - 10.4) / 4.4)

    columns = 54
    rows = []
    tones = []
    for j in range(len(plan)):
        y, sheet, light, k = plan[j]
        ring = []
        shades = []
        for i in range(columns + 1):
            x = -5.0 + 30.0 * i / columns
            away = 0.0 if k == 0 else 1.5 * (noise(x * 0.16, k * 1.7, 3.0) - 0.5) + 0.34 * (noise(x * 0.6, k * 2.9, 4.0) - 0.5)
            high = level(sheet, x) - ends(x) - (1.8 if k == 9 else 0.0) + (0.0 if k == 0 else 0.14 * (noise(x * 0.5, y * 0.7, 2.0) - 0.5))
            ring.append(Vector((x, y + away, high)))
            grain = noise(x * 0.9, y * 0.9, 5.0)
            colour = blend(GRANITE, GRANITE_PALE, grain)
            patch = noise(x * 0.42, y * 0.42, 6.0)
            if patch > 0.58 and high > 0.0:
                colour = blend(colour, LICHEN if noise(x * 0.2, y * 0.2, 7.0) > 0.5 else LICHEN_PALE, min(1.0, (patch - 0.58) * 7.0))
            if abs(y) > 1.1:
                colour = blend(colour, MOSS, min(0.75, 4.0 * max(0.0, noise(x * 0.8, y * 0.8, 8.0) - 0.6)))
            colour = blend(colour, WET, rise((-0.1 - high) / 0.45) * 0.95)
            shades.append(lit(colour, light * (0.94 + 0.12 * rnd(i, j))))
        rows.append(ring)
        tones.append(shades)
    skin(part, rows, tones, closed=False, flip=True)
    # Cracks in the granite, running across the sheets.
    for i in range(16):
        x = -1.0 + 22.0 * rnd(i, 1.0)
        y = (-4.0 + 3.0 * rnd(i, 2.0)) if i % 2 else (1.3 + 4.0 * rnd(i, 3.0))
        points = []
        for k in range(4):
            points.append(Vector((x + k * (0.5 + rnd(i, k) * 0.5), y + k * 0.34 * (1.0 if i % 3 else -1.0), 0.0)))
        for p in points:
            p.z = 0.0
        # Laid on what is under it, row by row.
        for p in points:
            nearest = plan[0]
            best = 99.0
            for row in plan:
                if abs(row[0] - p.y) < best and row[2] > 0.8:
                    best = abs(row[0] - p.y)
                    nearest = row
            p.z = level(nearest[1], p.x) + 0.05
        strip(part, points, [0.02, 0.04, 0.03, 0.012], CRACK, UP)
    # Loose stones at its back, pale against the dark, and tufts of heather in its cracks.
    for i in range(6):
        x = 1.0 + 18.0 * rnd(i, 1.0)
        y = 2.0 + 2.6 * rnd(i, 2.0)
        lump(part, Vector((x, y, FLAT + 0.32 * (y - 1.0) + 0.34)), (0.34 + 0.3 * rnd(i, 3.0), 0.26, 0.2), 2, GRANITE)
    for i in range(14):
        x = 0.5 + 19.0 * rnd(i, 4.0)
        y = 1.6 + 3.6 * rnd(i, 5.0)
        lump(part, Vector((x, y, FLAT + 0.3 * (y - 1.0) + 0.3)), (0.24, 0.2, 0.14), 1, blend(tone('#6a5040'), MOSS, rnd(i, 6.0)))
    finish(part, 'holme', sharp=32.0, strength=0.35, reach=0.8, floor=-3.0, leaf=True)
