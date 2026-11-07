"""Aventyr 2's props: the things near the path (docs/aventyr-2-overhaul.md).

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Each stands on its
origin unless it says otherwise, with its front towards -Y. No letters, numbers or marks on anything.
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


# --- the flower pot ---------------------------------------------------------------------------------------------------------
# An upturned terracotta pot, as tall as two of him: the rim on the ground, chipped, its clay bloomed with white lime where it
# has dried, dark and wet where the rain runs, with a drainage hole on top and a little moss at its foot.

CLAY = tone('#b4613c')
CLAY_DARK = tone('#7a3c26')
CLAY_PALE = tone('#d09a74')
LIME = tone('#e6dccc')
MOSS = tone('#4c6a2c')

if wanted('kruka'):
    part = new_part()
    paint = part['paint']
    sides = 26
    rows = [
        (1.02, 0.0), (1.05, 0.03), (1.05, 0.28), (0.98, 0.33), (0.92, 0.36), (0.88, 0.7), (0.8, 1.1), (0.68, 1.62), (0.64, 1.7),
        (0.5, 1.74), (0.2, 1.74), (0.17, 1.66),
    ]
    made = skin(part, [circle(Vector((0.0, 0.0, row[1])), Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), row[0], sides) for row in rows], [CLAY] * len(rows), None, (Vector((0.0, 0.0, 1.5)), tone('#1a1412')))
    for i in range(len(rows)):
        for j in range(sides):
            vert = made[i][j]
            at = vert.co
            turn = j * TAU / sides
            lime = noise(at.x * 1.6, at.y * 1.6, at.z * 2.2)
            run = noise(math.cos(turn) * 3.0, math.sin(turn) * 3.0, at.z * 0.35)
            colour = blend(CLAY, CLAY_PALE, noise(at.x * 6.0, at.y * 6.0, at.z * 6.0) * 0.9)
            if lime > 0.58:
                colour = blend(colour, LIME, (lime - 0.58) * 3.5)
            colour = blend(colour, CLAY_DARK, max(0.0, run - 0.44) * 2.6)
            if at.z < 0.5:
                colour = blend(colour, MOSS, max(0.0, noise(at.x * 3.0, at.y * 3.0, 5.0) - 0.5) * 3.0 * (0.5 - at.z) * 2.0)
            paint[vert] = colour
    # A chip out of the rim.
    for j in range(sides):
        turn = j * TAU / sides
        chip = max(0.0, 1.0 - abs(turn - 4.2) / 0.3)
        if chip > 0.0:
            for i in (0, 1, 2):
                made[i][j].co = made[i][j].co * (1.0 - 0.1 * chip)
                paint[made[i][j]] = CLAY_PALE
    finish(part, 'kruka', sharp=62.0, strength=0.45, reach=0.5, floor=0.0)

# --- Bertil's boot ------------------------------------------------------------------------------------------------------------
# A green rubber boot lying on the water as a boat: toe forward, along +X, the sole with its tread under it, the yellow-topped
# leg open at the stern, where Elof sits. Its origin is where he sits, on the waterline.

RUBBER = tone('#2f6b3a')
RUBBER_DARK = tone('#1d4426')
RUBBER_SHINE = tone('#4f9458')
SOLE = tone('#2a2420')
TOPLINE = tone('#e0be48')

if wanted('stovel'):
    part = new_part()
    paint = part['paint']
    path = [
        Vector((2.0, 0.0, -0.46)), Vector((1.74, 0.0, -0.3)), Vector((1.3, 0.0, -0.18)), Vector((0.7, 0.0, -0.16)), Vector((0.12, 0.0, -0.2)),
        Vector((-0.42, 0.0, -0.2)), Vector((-0.74, 0.0, -0.02)), Vector((-0.86, 0.0, 0.3)), Vector((-0.88, 0.0, 0.62)),
    ]
    radii = [0.12, 0.46, 0.56, 0.58, 0.6, 0.66, 0.68, 0.68, 0.7]
    rings = []
    tones = []
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = Vector((0.0, 1.0, 0.0))
        lift = side.cross(ahead)
        ring = []
        for j in range(18):
            angle = TAU * j / 18.0
            ring.append(path[i] + side * (radii[i] * math.cos(angle)) + lift * (radii[i] * 0.86 * math.sin(angle)))
        rings.append(ring)
        tones.append(RUBBER)
    made = skin(part, rings, tones, (path[0] + Vector((0.1, 0.0, 0.0)), RUBBER), None)
    for ring in made:
        for vert in ring:
            at = vert.co
            shine = max(0.0, (at.z + 0.1) * 0.9 - abs(at.y) * 0.6)
            paint[vert] = blend(RUBBER_DARK, blend(RUBBER, RUBBER_SHINE, shine), noise(at.x * 1.4, at.y * 1.4, at.z * 1.4) * 1.5)
    # Inside the leg: the same wall, dark, down to where he sits.
    inner = []
    for k in range(4):
        s = k / 3.0
        centre = path[-1] + Vector((0.02 * k, 0.0, -0.6 * s))
        inner.append(circle(centre, Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)), 0.63 - 0.05 * s, 18))
    skin(part, inner, [RUBBER_DARK, tone('#12281a'), tone('#0c1a10'), tone('#0c1a10')], None, (path[-1] + Vector((0.1, 0.0, -0.62)), tone('#0c1a10')))
    # The yellow top line, and the pull tab.
    top = path[-1]
    rim = skin(part, [circle(top, Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)), 0.73, 18), circle(top + UP * 0.14, Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)), 0.73, 18), circle(top + UP * 0.14, Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)), 0.6, 18), circle(top - UP * 0.04, Vector((0.0, 1.0, 0.0)), Vector((1.0, 0.0, 0.0)), 0.6, 18)], [TOPLINE] * 4)
    # The sole: a dark shape under the foot, with a heel, and the tread's bars across it.
    sole = []
    for x, wide, z in ((2.04, 0.3, -0.72), (1.6, 0.56, -0.8), (0.9, 0.6, -0.82), (0.3, 0.54, -0.82), (0.26, 0.54, -0.96), (-0.72, 0.62, -0.96), (-0.92, 0.5, -0.74)):
        sole.append([Vector((x, -wide, z)), Vector((x, wide, z)), Vector((x, wide, z + 0.16)), Vector((x, -wide, z + 0.16))])
    skin(part, sole, [SOLE] * len(sole), (Vector((2.08, 0.0, -0.62)), SOLE), (Vector((-0.96, 0.0, -0.66)), SOLE))
    for i in range(9):
        x = 1.8 - i * 0.3
        a = put(part, Vector((x, -0.56, -0.86)), tone('#3a3430'))
        b = put(part, Vector((x, 0.56, -0.86)), tone('#3a3430'))
        c = put(part, Vector((x - 0.12, 0.56, -0.84)), SOLE)
        d = put(part, Vector((x - 0.12, -0.56, -0.84)), SOLE)
        face(part, (a, b, c, d))
    finish(part, 'stovel', sharp=70.0, strength=0.4, reach=0.4, floor=None, leaf=True)

# --- Moa's umbrella ---------------------------------------------------------------------------------------------------------------
# Open over him: eight panels of denim blue, a little darker every other, pale spots, a scalloped edge between its ribs, and a
# curved wooden handle down to his hands. Its origin is the end of the handle.

DENIM = tone('#5b7fb5')
DENIM_DARK = tone('#46689c')
SPOT = tone('#f1ece2')
STEEL = tone('#4a4c50')
HANDLE = tone('#8a5a32')

if wanted('paraply'):
    part = new_part()
    paint = part['paint']
    ribs = 8
    across = 8
    rows = 9
    reach = 1.72
    crown = 2.9
    rings = []
    tones = []
    for i in range(rows):
        t = i / (rows - 1.0)
        ring = []
        row = []
        for j in range(ribs * across):
            turn = TAU * j / (ribs * across)
            s = (j % across) / across
            scallop = math.sin(s * math.pi)
            r = reach * math.sin(t * 1.42) * (1.0 - 0.07 * scallop * t * t)
            z = crown - 0.86 * (1.0 - math.cos(t * 1.42)) * 1.25 + 0.09 * scallop * t * t
            ring.append(Vector((r * math.cos(turn), r * math.sin(turn), z)))
            row.append(DENIM if (j // across) % 2 == 0 else DENIM_DARK)
        rings.append(ring)
        tones.append(row)
    skin(part, rings[1:], tones[1:], (Vector((0.0, 0.0, crown + 0.02)), DENIM), None)
    # Pale spots lying on its cloth.
    for i in range(16):
        turn = i * 2.399963
        t = 0.34 + 0.58 * ((i * 0.618) % 1.0)
        r = reach * math.sin(t * 1.42)
        z = crown - 0.86 * (1.0 - math.cos(t * 1.42)) * 1.25 + 0.03
        centre = Vector((r * math.cos(turn), r * math.sin(turn), z))
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        side = out.cross(UP)
        down = centre - Vector((0.0, 0.0, crown - 1.6))
        down.normalize()
        slope = side.cross(down)
        spot_ring = circle(centre + down * 0.012, side, slope, 0.12, 8)
        skin(part, [spot_ring], [SPOT], None, (centre + down * 0.03, SPOT))
    # The ribs under the cloth, the shaft, and the curved handle.
    for j in range(ribs):
        turn = TAU * j / ribs
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        points = []
        for i in range(1, rows, 2):
            t = i / (rows - 1.0)
            r = reach * math.sin(t * 1.42)
            points.append(out * r + UP * (crown - 0.86 * (1.0 - math.cos(t * 1.42)) * 1.25 - 0.03))
        tube(part, points, [0.016, 0.016, 0.014, 0.014], [STEEL] * len(points), 4)
        tube(part, [UP * 1.56, out * 0.86 + UP * (crown - 0.42)], [0.012, 0.012], [STEEL, STEEL], 4)
    tube(part, [UP * 0.2, UP * 1.2, UP * 2.2, UP * (crown + 0.14)], [0.03, 0.03, 0.03, 0.022], [STEEL] * 4, 6)
    hook = []
    for k in range(7):
        angle = 3.14 * k / 6.0
        hook.append(Vector((0.17 - 0.17 * math.cos(angle), 0.0, 0.2 - 0.2 * math.sin(angle))))
    hook.append(Vector((0.34, 0.0, 0.26)))
    tube(part, hook, [0.05] * 8, [HANDLE] * 8, 6)
    finish(part, 'paraply', sharp=70.0, strength=0.3, reach=0.5, floor=None, leaf=True)

# --- the raft ---------------------------------------------------------------------------------------------------------------------
# Five peeled logs lashed side by side, their sawn ends pale, two rope lashings, and one log a little shorter than the rest.
# Along X, 3.2 long. Its origin is the middle of its top.

LOG_DARK = tone('#4a3626')
LOG = tone('#7a5a3c')
LOG_PALE = tone('#a88a62')
SAWN = tone('#d2b888')
ROPE = tone('#c8b080')

if wanted('flotte'):
    part = new_part()
    paint = part['paint']
    logs = 5
    for i in range(logs):
        y = (i - 2.0) * 0.4
        long = 3.2 - 0.3 * ((i * 3) % 2) * 0.5
        shift = 0.06 * ((i * 5) % 3 - 1)
        rows = 9
        rings = []
        for k in range(rows):
            s = k / (rows - 1.0)
            r = 0.2 * (1.0 + 0.04 * math.sin(s * 8.0 + i))
            rings.append(circle(Vector((shift + (s - 0.5) * long, y, -0.22)), Vector((0.0, 1.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 9, turn=0.5 * (k % 2)))
        made = skin(part, rings, [LOG] * rows, (Vector((shift - long / 2.0, y, -0.22)), SAWN), (Vector((shift + long / 2.0, y, -0.22)), SAWN))
        for ring in made:
            for vert in ring:
                at = vert.co
                paint[vert] = blend(LOG_DARK, blend(LOG, LOG_PALE, noise(at.x * 1.2 + i, at.y * 6.0, at.z * 6.0)), noise(at.x * 3.0, at.z * 8.0, i) * 1.7)
    for x in (-1.05, 1.05):
        for k in range(3):
            shift = x + (k - 1.0) * 0.1
            rings = []
            for j in range(13):
                t = j / 12.0
                turn = t * TAU
                rings.append(Vector((shift, 1.02 * math.cos(turn), -0.22 + 0.25 * math.sin(turn))))
            tube(part, rings, [0.04] * 13, [ROPE if k % 2 else lit(ROPE, 0.8)] * 13, 5, closed_ends=False)
    finish(part, 'flotte', sharp=75.0, strength=0.45, reach=0.3, floor=None, leaf=True)

# --- the jetty's post -------------------------------------------------------------------------------------------------------------
# A tarred pile, thick enough to hide him from a wave: weathered, split at its top, with an iron band and a coil of old rope.

TAR = tone('#2e2a26')
TAR_PALE = tone('#5c544a')
IRON = tone('#3a3c40')

if wanted('bryggstolpe'):
    part = new_part()
    paint = part['paint']
    made = turned(part, [(0.0, -0.4, TAR), (0.56, -0.4, TAR), (0.58, 1.0, TAR), (0.56, 2.2, TAR), (0.52, 3.0, TAR), (0.47, 3.12, TAR_PALE), (0.0, 3.14, TAR_PALE)], 14)
    for ring in made:
        for vert in ring:
            at = vert.co
            paint[vert] = blend(TAR, TAR_PALE, noise(at.x * 7.0, at.y * 7.0, at.z * 0.7) * 1.1 + 0.1 * at.z / 3.0)
    turned(part, [(0.6, 2.55, IRON), (0.6, 2.72, IRON), (0.57, 2.72, IRON)], 14)
    for k in range(4):
        z = 1.1 + k * 0.13
        rings = []
        for j in range(15):
            t = j / 14.0
            rings.append(Vector((0.66 * math.cos(t * TAU), 0.66 * math.sin(t * TAU), z + 0.03 * math.sin(t * 6.0))))
        tube(part, rings, [0.075] * 15, [ROPE if k % 2 else lit(ROPE, 0.82)] * 15, 5, closed_ends=False)
    finish(part, 'bryggstolpe', sharp=75.0, strength=0.5, reach=0.3, floor=None, leaf=True)

# --- mormor's lantern ---------------------------------------------------------------------------------------------------------------
# A tin storm lantern: its tank, its wire guards and its hood and bail. It hangs from its top. The glass and its light are the game's.

TIN = tone('#6a6c70')
TIN_DARK = tone('#2a2c30')
TIN_PALE = tone('#9a9c9e')

if wanted('lykta'):
    part = new_part()
    turned(part, [(0.0, -0.92, TIN_DARK), (0.28, -0.92, TIN), (0.3, -0.82, TIN_PALE), (0.28, -0.72, TIN), (0.15, -0.68, TIN)], 14)
    turned(part, [(0.1, -0.24, TIN), (0.26, -0.2, TIN_DARK), (0.27, -0.13, TIN), (0.08, -0.05, TIN_PALE), (0.06, -0.03, TIN), (0.0, -0.02, TIN_DARK)], 14)
    for j in range(4):
        turn = j * TAU / 4.0 + 0.78
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        tube(part, [UP * -0.7 + out * 0.2, UP * -0.46 + out * 0.3, UP * -0.2 + out * 0.2], [0.012] * 3, [TIN_DARK] * 3, 4)
    bail = []
    for k in range(9):
        t = k / 8.0
        bail.append(Vector((0.27 * math.cos(t * 3.14), 0.0, -0.16 + 0.3 * math.sin(t * 3.14))))
    tube(part, bail, [0.012] * 9, [TIN_DARK] * 9, 4)
    finish(part, 'lykta', sharp=60.0, strength=0.3, reach=0.15, floor=None, leaf=True)


# --- the rain barrel -------------------------------------------------------------------------------------------
# Staves that are each their own board, bellied, in old wet oak, with four iron hoops, a lid of planks he walks over, and
# moss at its foot. It stands on its origin, 2.5 across and 3.42 tall, its lid at 3.4 as the ground's block has it.

if wanted('tunna'):
    part = new_part()
    TALL = 3.4
    WIDE = 1.2
    OAK = tone('#8a6238')
    OAK_DARK = tone('#4c3420')
    OAK_WET = tone('#3c3a2c')
    IRON = tone('#34363a')
    RUST = tone('#6e4228')
    STAVES = 20
    ROWS = 9

    def belly(z):
        t = z / TALL
        return WIDE * (0.93 + 0.17 * math.sin(math.pi * t) ** 0.8)

    for i in range(STAVES):
        a0 = TAU * i / STAVES + 0.007
        a1 = TAU * (i + 1) / STAVES - 0.007
        rows = []
        tones = []
        own = rnd(i * 1.7, 3.0)
        for k in range(ROWS):
            z = TALL * k / (ROWS - 1.0)
            r = belly(z) + 0.012 * (own - 0.5)
            ring = []
            shades = []
            for s in range(3):
                angle = a0 + (a1 - a0) * s / 2.0
                ring.append(Vector((r * math.cos(angle), r * math.sin(angle), z)))
                grain = noise(angle * 16.0, z * 1.4, 2.0 + i)
                wet = max(0.0, 1.0 - z / 1.3) ** 1.5 * (0.55 + 0.5 * noise(angle * 6.0, z * 2.2, 3.0))
                shades.append(blend(blend(lit(OAK, 0.78 + 0.34 * own), OAK_DARK, grain * 0.5), OAK_WET, wet))
            rows.append(ring)
            tones.append(shades)
        skin(part, rows, tones, closed=False, flip=True)
    # The dark inside that shows in the joints between staves.
    turned(part, [(0.0, 0.02, OAK_DARK), (belly(0.02) - 0.03, 0.02, OAK_DARK), (belly(1.7) - 0.03, 1.7, OAK_DARK), (belly(3.3) - 0.03, 3.3, OAK_DARK), (0.0, 3.3, OAK_DARK)], 20)
    # Four hoops, each with its rivets, rust along their edges.
    for z in (0.38, 1.05, 2.35, 3.02):
        r = belly(z) + 0.02
        turned(part, [(r - 0.02, z - 0.1, RUST), (r + 0.016, z - 0.09, IRON), (r + 0.02, z, IRON), (r + 0.016, z + 0.09, IRON), (r - 0.02, z + 0.1, RUST)], 28)
        for k in range(6):
            angle = TAU * (k + 0.5 + 0.3 * rnd(z, k)) / 6.0
            lump(part, Vector(((r + 0.024) * math.cos(angle), (r + 0.024) * math.sin(angle), z)), (0.022, 0.022, 0.022), 1, tone('#5a5c60'))
    # The rim stands proud of the lid, and the lid's planks lie across inside it.
    r = belly(TALL)
    turned(part, [(r - 0.08, TALL - 0.03, OAK_DARK), (r - 0.07, TALL + 0.05, lit(OAK, 1.1)), (r + 0.015, TALL + 0.05, OAK), (r + 0.015, TALL - 0.1, OAK)], 28)
    PLANKS = 7
    for i in range(PLANKS):
        x0 = (i / PLANKS * 2.0 - 1.0) * (r - 0.06) + 0.012
        x1 = ((i + 1.0) / PLANKS * 2.0 - 1.0) * (r - 0.06) - 0.012
        tone_of = lit(OAK, 0.82 + 0.34 * rnd(i, 7.0))
        ends = []
        for s in range(5):
            x = x0 + (x1 - x0) * s / 4.0
            y = math.sqrt(max(0.0, (r - 0.06) ** 2.0 - x * x))
            ends.append(Vector((x, y, TALL)))
        rows = [[Vector((p.x, -p.y + 2.0 * p.y * k / 5.0, TALL + 0.012 * rnd(i, k))) for p in ends] for k in range(6)]
        tones = [[blend(tone_of, OAK_DARK, 0.5 * noise(p.x * 3.0, p.y * 18.0, i * 1.0)) for p in row] for row in rows]
        skin(part, rows, tones, closed=False)
    # Moss where the wet ground reaches it.
    for i in range(14):
        angle = TAU * rnd(3.3, i)
        r = belly(0.2) + 0.03
        lump(part, Vector((r * math.cos(angle), r * math.sin(angle), 0.1 + 0.34 * rnd(i, 5.0))), (0.13 + 0.1 * rnd(i, 6.0), 0.1, 0.1 + 0.09 * rnd(i, 7.0)), 1, blend(tone('#55702c'), tone('#3e5a2a'), rnd(i, 8.0)))
    finish(part, 'tunna', sharp=40.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)


# --- the watering can ------------------------------------------------------------------------------------------
# Galvanised zinc, dented a little, with a long spout and a rose. It stands on its origin, 1.2 across and 1.2 tall, as the
# ground's block has it, its top closed, and its spout going off to the right.

if wanted('kanna'):
    part = new_part()
    ZINC = tone('#a4aeb4')
    ZINC_DARK = tone('#6a7680')
    profile = []
    for z, r, k in ((0.0, 0.0, 0.7), (0.0, 0.57, 0.7), (0.05, 0.6, 0.9), (0.14, 0.6, 1.0), (0.16, 0.615, 1.12), (0.19, 0.6, 0.9), (0.7, 0.585, 1.05), (1.0, 0.575, 1.0), (1.03, 0.59, 1.12), (1.06, 0.575, 0.9), (1.19, 0.57, 1.0), (1.2, 0.6, 1.16), (1.21, 0.0, 1.05)):
        profile.append((r, z, lit(ZINC, k)))
    mark = len(part['bm'].verts)
    turned(part, profile, 28)
    part['bm'].verts.ensure_lookup_table()
    for vert in list(part['bm'].verts)[mark:]:
        # Spangled, as hot zinc is: patches of a slightly other grey.
        vert_tone = noise(vert.co.x * 4.0, vert.co.y * 4.0, vert.co.z * 4.0)
        part['paint'][vert] = blend(part['paint'][vert], ZINC_DARK, 0.42 * vert_tone)
    # The spout, thick at its foot, with a stay to the body.
    tube(part, [Vector((0.5, 0.0, 0.26)), Vector((0.78, 0.0, 0.46)), Vector((1.06, 0.0, 0.88)), Vector((1.3, 0.0, 1.34))], [0.17, 0.11, 0.08, 0.065], [lit(ZINC, 0.9), ZINC, ZINC, lit(ZINC, 1.1)], 10)
    tube(part, [Vector((0.58, 0.0, 0.94)), Vector((0.88, 0.0, 0.8))], [0.024, 0.024], [ZINC_DARK, ZINC_DARK], 6)
    # The rose, its holes drawn dark on its face.
    rose = Vector((1.36, 0.0, 1.46))
    axis = Vector((0.5, 0.0, 0.86))
    tube(part, [rose - axis * 0.09, rose + axis * 0.05], [0.07, 0.17], [ZINC, lit(ZINC, 1.1)], 14)
    side = Vector((0.0, 1.0, 0.0))
    other = axis.cross(side)
    for i in range(13):
        turn = i * 2.399963
        far = 0.14 * math.sqrt((i + 0.5) / 13.0)
        lump(part, rose + axis * 0.058 + side * (far * math.cos(turn)) + other * (far * math.sin(turn)), (0.009, 0.009, 0.009), 1, tone('#2a2e34'))
    # The handle behind it: he stands on its top, so nothing goes over.
    tube(part, [Vector((0.0, 0.56, 1.06)), Vector((0.0, 0.88, 1.0)), Vector((0.0, 0.98, 0.7)), Vector((0.0, 0.86, 0.42)), Vector((0.0, 0.58, 0.3))], [0.04, 0.042, 0.042, 0.042, 0.04], [ZINC] * 5, 8)
    finish(part, 'kanna', sharp=46.0, strength=0.45, reach=0.25, floor=0.0, leaf=True)


# --- the pumpkin ------------------------------------------------------------------------------------------------
# As tall as two of him, its ribs deep, its skin streaked, with a fat, twisted stem and a curl of tendril. A rib stands where
# its face is cut, at the front, so that the face (drawn in the game, to glow) lies on its full round.

if wanted('pumpa'):
    part = new_part()
    ORANGE = tone('#e87a1e')
    DEEP = tone('#b4480e')
    PALE = tone('#f4a83c')
    STEM = tone('#6a7030')
    STEM_DRY = tone('#a8965a')
    RIBS = 11
    AROUND = 66
    ROWS = 20
    rings = []
    tones = []
    for i in range(1, ROWS):
        phi = math.pi * i / ROWS
        round_ = math.sin(phi) ** 0.8
        high = 1.1 - 1.12 * math.cos(phi) - 0.3 * max(0.0, 1.0 - math.sin(phi)) ** 2.4 * (1.0 if phi < 1.0 else -0.6)
        ring = []
        shades = []
        for j in range(AROUND):
            angle = TAU * j / AROUND
            crest = abs(math.cos(0.5 * RIBS * (angle + 0.5 * math.pi)))
            groove = 1.0 - crest ** 0.5
            r = 1.42 * round_ * (1.0 - 0.15 * groove * math.sin(phi) ** 0.4)
            ring.append(Vector((r * math.cos(angle), r * math.sin(angle), high)))
            streak = noise(math.cos(angle) * 5.0, math.sin(angle) * 5.0, high * 0.7)
            colour = blend(blend(ORANGE, PALE, streak * 0.7 * crest), DEEP, groove ** 1.3 * 0.9)
            shades.append(blend(colour, STEM, max(0.0, 0.8 - 1.5 * phi) * 0.7))
        rings.append(ring)
        tones.append(shades)
    skin(part, rings, tones, (Vector((0.0, 0.0, -0.02)), DEEP), (Vector((0.0, 0.0, 1.86)), STEM))
    for i in range(16):
        angle = TAU * rnd(i, 2.0)
        phi = 0.5 + 2.1 * rnd(i, 3.0)
        at = Vector((1.38 * math.sin(phi) ** 0.8 * math.cos(angle), 1.38 * math.sin(phi) ** 0.8 * math.sin(angle), 1.1 - 1.12 * math.cos(phi)))
        if angle < 5.4 and angle > 4.0:
            continue
        lump(part, at, (0.04, 0.04, 0.03), 1, PALE)
    tube(part, [Vector((0.0, 0.0, 1.72)), Vector((0.02, 0.0, 2.08)), Vector((0.12, 0.02, 2.36)), Vector((0.3, 0.05, 2.56)), Vector((0.38, 0.06, 2.62))],
         [0.3, 0.18, 0.14, 0.13, 0.16], [STEM, STEM, blend(STEM, STEM_DRY, 0.4), STEM_DRY, lit(STEM_DRY, 1.15)], 7)
    curl = []
    radii = []
    for k in range(18):
        t = k / 17.0
        turn = t * 9.0
        reach = 0.3 * (1.0 - t * 0.62)
        curl.append(Vector((-0.1 - 0.75 * t + reach * math.cos(turn), 0.05 + reach * math.sin(turn), 2.0 + 0.2 * math.sin(t * 3.0))))
        radii.append(0.026 * (1.0 - 0.7 * t))
    tube(part, curl, radii, [lit(STEM, 1.2)] * 18, 5)
    finish(part, 'pumpa', sharp=70.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)


# --- the family's car -----------------------------------------------------------------------------------------
# An estate car, plain as a car is with nothing written on it: no badge, no plate. 4.7 long in its own metres, its nose towards
# +X, standing on its origin. The game fits it to the length the place wants. Two coats: the family's slate blue, and a grey.

CAR_LONG = 4.7
CAR_ROOF = 0.68      # half across the roof
CAR_BODY = 0.9       # half across at the belt
SILL = 0.27

def car_top(x):
    """The car's line from tail to nose, as (x, height)."""
    return along(((-2.35, 0.98), (-2.3, 1.08), (-2.2, 1.4), (-2.05, 1.47), (0.15, 1.5), (0.42, 1.42), (1.28, 0.99), (2.05, 0.87), (2.3, 0.72), (2.35, 0.58)), x)


def car_belt(x):
    return along(((-2.35, 0.88), (-1.0, 0.92), (1.2, 0.93), (2.0, 0.83), (2.35, 0.62)), x)


def car_wide(x):
    """How far out its side stands, narrowing a little at both ends."""
    t = abs(x) / 2.35
    return CAR_BODY * (1.0 - 0.09 * t ** 3.6)


def greenhouse(x, z, side):
    """A point on the sloped side above the belt, for laying glass on."""
    belt = car_belt(x)
    top = car_top(x) - 0.07
    t = 0.0 if top <= belt else min(1.0, max(0.0, (z - belt) / (top - belt)))
    return Vector((x, side * (car_wide(x) * 0.975 + (CAR_ROOF + 0.02 - car_wide(x) * 0.975) * t + 0.022), z))


def build_car(name, COAT, seed):
    if not wanted(name):
        return
    part = new_part()
    DARK = tone('#16181c')
    PLASTIC = tone('#23262c')
    GLASS = tone('#12202c')
    CHROME = tone('#b8c0c8')
    stations = [-2.35, -2.32, -2.2, -2.05, -1.7, -1.2, -0.7, -0.2, 0.15, 0.42, 0.8, 1.28, 1.7, 2.05, 2.28, 2.35]
    rings = []
    tones = []
    for x in stations:
        wide = car_wide(x)
        belt = min(car_belt(x), car_top(x) - 0.01)
        top = car_top(x)
        high = belt < top - 0.06
        bottom = SILL + (0.12 if abs(x) > 2.1 else 0.0)
        half = [
            (0.0, bottom), (wide * 0.74, bottom), (wide * 0.96, bottom + 0.05), (wide, bottom + 0.16), (wide * 1.005, 0.62 if belt > 0.7 else belt - 0.02), (wide * 0.995, belt - 0.03), (wide * 0.975, belt),
        ]
        if high:
            half += [(CAR_ROOF + 0.02, top - 0.07), (CAR_ROOF - 0.1, top - 0.015), (CAR_ROOF * 0.5, top)]
        else:
            half += [(wide * 0.9, top - 0.015), (wide * 0.68, top - 0.002), (wide * 0.34, top)]
        half.append((0.0, top + (0.01 if high else 0.0)))
        ring = []
        shades = []
        for y, z in half:
            ring.append(Vector((x, -y, z)))
        for y, z in half[-2:0:-1]:
            ring.append(Vector((x, y, z)))
        rings.append(ring)
        for point in ring:
            k = 0.9 + 0.2 * min(1.0, max(0.0, (point.z - 0.3) / 0.7))
            shades.append(lit(COAT, k) if point.z > 0.36 else PLASTIC)
        tones.append(shades)
    skin(part, rings, tones, (Vector((-2.36, 0.0, 0.62)), COAT), (Vector((2.36, 0.0, 0.48)), COAT))
    out = Vector((0.0, -1.0, 0.0))
    for side in (-1.0, 1.0):
        out = Vector((0.0, side, 0.0))
        # Its side windows, each following the roof, with its pillars left in the coat.
        for points in (
            ((-2.02, 0.97), (-2.03, 1.38), (-1.3, 1.42), (-1.3, 0.96)),
            ((-1.22, 0.96), (-1.22, 1.42), (-0.36, 1.43), (-0.36, 0.95)),
            ((-0.28, 0.95), (-0.28, 1.43), (0.2, 1.43), (0.98, 1.0), (0.98, 0.94)),
        ):
            at = [greenhouse(x, z, side) for x, z in points]
            made = face(part, [put(part, p, GLASS) for p in at])
            part['flat'][made] = GLASS
            # A long soft shine, low along each pane, as there is on wet glass at night.
            top = [greenhouse(points[0][0] + 0.04, points[0][1] + (points[1][1] - points[0][1]) * 0.52, side), greenhouse(points[-1][0] - 0.1, points[-1][1] + 0.12, side)]
            strip(part, top, 0.018, tone('#3a5068'), out)
        # The doors' seams, and their handles.
        for x, low, high in ((-1.26, 0.34, 0.94), (-0.32, 0.34, 0.95), (0.94, 0.34, 0.95)):
            strip(part, [Vector((x, side * (car_wide(x) + 0.008), low)), Vector((x, side * (car_wide(x) + 0.008), high))], 0.0055, DARK, out)
        for x in (-1.15, -0.2):
            lump(part, Vector((x, side * (car_wide(x) + 0.012), 0.86)), (0.075, 0.012, 0.016), 1, lit(COAT, 1.25))
        # Dark sill trim and the belt's bright line.
        strip(part, [Vector((x, side * (car_wide(x) + 0.008), 0.97 if 0 else 0.915)) for x in (-2.0, -1.2, -0.3, 0.5, 0.98)], 0.007, CHROME, out)
        # The mirror.
        lump(part, Vector((0.92, side * 1.0, 1.0)), (0.075, 0.09, 0.055), 2, COAT)
        lump(part, Vector((0.9, side * 0.93, 0.98)), (0.04, 0.05, 0.02), 1, DARK)
        for x in (-1.46, 1.46):
            # A wheel in its arch: a dark round, the tyre, a five-spoked rim and its hub.
            arch = [Vector((x + 0.415 * math.cos(TAU * k / 22.0), side * (car_wide(x) + 0.006), 0.335 + 0.415 * math.sin(TAU * k / 22.0))) for k in range(22)]
            face(part, [put(part, p, DARK) for p in arch])
            y0 = side * (car_wide(x) - 0.18)
            y1 = side * (car_wide(x) + 0.02)
            tyre = []
            for y, r in ((y0, 0.33), (y1 - side * 0.03, 0.335), (y1, 0.3)):
                tyre.append(circle(Vector((x, y, 0.335)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 24))
            skin(part, tyre, [tone('#17181b'), tone('#1e2024'), tone('#26282c')], closed=True, flip=side > 0.0)
            hub = Vector((x, y1 + side * 0.004, 0.335))
            rim = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.235, 24)
            face(part, [put(part, p, tone('#1a1c20')) for p in rim])
            ring_out = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.3, 24)
            ring_in = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.235, 24)
            skin(part, [ring_out, ring_in], [tone('#20222a'), CHROME], closed=True, flip=side > 0.0)
            for k in range(5):
                turn = TAU * k / 5.0 + 0.3
                a = hub + Vector((0.238 * math.cos(turn - 0.2), side * 0.004, 0.238 * math.sin(turn - 0.2)))
                b = hub + Vector((0.238 * math.cos(turn + 0.2), side * 0.004, 0.238 * math.sin(turn + 0.2)))
                c = hub + Vector((0.05 * math.cos(turn + 0.5), side * 0.012, 0.05 * math.sin(turn + 0.5)))
                d = hub + Vector((0.05 * math.cos(turn - 0.5), side * 0.012, 0.05 * math.sin(turn - 0.5)))
                face(part, [put(part, p, CHROME) for p in (a, b, c, d)])
            lump(part, hub + Vector((0.0, side * 0.014, 0.0)), (0.055, 0.016, 0.055), 1, tone('#6a7078'))
    # The windscreen and the tailgate's window.
    wind = [greenhouse(0.44, 1.41, -1.0), greenhouse(0.44, 1.41, 1.0), greenhouse(1.2, 1.02, 1.0), greenhouse(1.2, 1.02, -1.0)]
    for p in wind:
        p.z += 0.03
    wind[0].y += 0.1; wind[1].y -= 0.1; wind[2].y -= 0.06; wind[3].y += 0.06
    part['flat'][face(part, [put(part, p, GLASS) for p in wind])] = GLASS
    tail = [Vector((-2.24, -0.56, 1.36)), Vector((-2.24, 0.56, 1.36)), Vector((-2.34, 0.66, 1.0)), Vector((-2.34, -0.66, 1.0))]
    part['flat'][face(part, [put(part, p, GLASS) for p in tail])] = GLASS
    # Lamps at the nose, a plain dark grille between them, and the tail's lamps up its corners.
    for side in (-1.0, 1.0):
        lamp = [Vector((2.2, side * 0.5, 0.82)), Vector((2.14, side * 0.82, 0.82)), Vector((2.26, side * 0.78, 0.68)), Vector((2.34, side * 0.5, 0.66))]
        part['flat'][face(part, [put(part, p, tone('#e6e8dc')) for p in lamp])] = tone('#e6e8dc')
        lamp = [Vector((-2.24, side * 0.82, 1.2)), Vector((-2.31, side * 0.85, 0.96)), Vector((-2.33, side * 0.68, 0.96)), Vector((-2.26, side * 0.66, 1.2))]
        part['flat'][face(part, [put(part, p, tone('#6e2420')) for p in lamp])] = tone('#6e2420')
    grille = [Vector((2.345, -0.42, 0.66)), Vector((2.345, 0.42, 0.66)), Vector((2.37, 0.5, 0.46)), Vector((2.37, -0.5, 0.46))]
    part['flat'][face(part, [put(part, p, DARK) for p in grille])] = DARK
    for k in range(4):
        z = 0.5 + k * 0.05
        strip(part, [Vector((2.372, -0.42, z)), Vector((2.372, 0.42, z))], 0.006, tone('#40444c'), Vector((1.0, 0.0, 0.0)))
    # Bumpers, in dark plastic.
    for x, depth in ((2.34, 0.12), (-2.34, 0.1)):
        cut = 1.0 if x > 0.0 else -1.0
        lump(part, Vector((x, 0.0, 0.36)), (depth, 0.84, 0.1), 2, PLASTIC)
    # Roof rails on their feet, and a short fin of an aerial.
    for side in (-1.0, 1.0):
        tube(part, [Vector((-1.95, side * 0.58, 1.47)), Vector((-1.85, side * 0.58, 1.53)), Vector((0.05, side * 0.58, 1.55)), Vector((0.16, side * 0.58, 1.49))], [0.02, 0.02, 0.02, 0.02], [tone('#2a2e34')] * 4, 5)
    lump(part, Vector((-1.8, 0.0, 1.5)), (0.09, 0.02, 0.05), 1, DARK)
    # The wipers, lying at the foot of the windscreen.
    for y in (-0.3, 0.32):
        strip(part, [Vector((1.15, y, 1.07)), Vector((1.1, y + 0.3, 1.09))], 0.007, DARK, Vector((0.5, 0.0, 0.86)))
    finish(part, name, sharp=30.0, strength=0.5, reach=0.5, floor=0.0, leaf=True)


# --- The family's own car: a silver electric hatchback, as theirs is (Olov, 7 November 2026), with no badge or plate ---

LEAF_LONG = 2.25     # half its length: 4.5 m
LEAF_ROOF = 0.64
LEAF_BODY = 0.89


def leaf_top(x):
    """Its line from tail to nose: a short sloping tailgate, a long roof, a raked windscreen and a short sloping bonnet."""
    return along(((-2.25, 0.96), (-2.22, 1.06), (-2.12, 1.18), (-1.9, 1.33), (-1.55, 1.46), (-1.1, 1.52), (0.1, 1.54), (0.42, 1.47), (1.22, 1.03), (1.95, 0.9), (2.18, 0.78), (2.25, 0.56)), x)


def leaf_belt(x):
    """The windows' lower edge, kicking up to the rear pillar."""
    return along(((-2.25, 0.9), (-1.95, 1.0), (-1.4, 1.02), (-1.0, 0.96), (1.2, 0.92), (1.95, 0.84), (2.25, 0.62)), x)


def leaf_wide(x):
    t = abs(x) / LEAF_LONG
    return LEAF_BODY * (1.0 - 0.1 * t ** 3.2)


def leaf_glass(x, z, side):
    """A point on the sloped side above the belt, for laying glass on."""
    belt = leaf_belt(x)
    top = leaf_top(x) - 0.07
    t = 0.0 if top <= belt else min(1.0, max(0.0, (z - belt) / (top - belt)))
    return Vector((x, side * (leaf_wide(x) * 0.975 + (LEAF_ROOF + 0.02 - leaf_wide(x) * 0.975) * t + 0.022), z))


def build_leaf(name, COAT):
    if not wanted(name):
        return
    part = new_part()
    DARK = tone('#16181c')
    PLASTIC = tone('#23262c')
    GLASS = tone('#12202c')
    PILLAR = tone('#0e1218')
    CHROME = tone('#c4cad0')
    LAMP = tone('#e8eae0')
    stations = [-2.25, -2.22, -2.12, -1.98, -1.65, -1.2, -0.7, -0.2, 0.15, 0.42, 0.8, 1.22, 1.6, 1.95, 2.18, 2.25]
    rings = []
    tones = []
    for x in stations:
        wide = leaf_wide(x)
        belt = min(leaf_belt(x), leaf_top(x) - 0.01)
        top = leaf_top(x)
        high = belt < top - 0.06
        bottom = SILL + (0.12 if abs(x) > 2.0 else 0.0)
        half = [
            (0.0, bottom), (wide * 0.74, bottom), (wide * 0.96, bottom + 0.05), (wide, bottom + 0.16), (wide * 1.005, 0.62 if belt > 0.7 else belt - 0.02), (wide * 0.995, belt - 0.03), (wide * 0.975, belt),
        ]
        if high:
            half += [(LEAF_ROOF + 0.02, top - 0.07), (LEAF_ROOF - 0.1, top - 0.015), (LEAF_ROOF * 0.5, top)]
        else:
            half += [(wide * 0.9, top - 0.015), (wide * 0.68, top - 0.002), (wide * 0.34, top)]
        half.append((0.0, top + (0.01 if high else 0.0)))
        ring = []
        shades = []
        for y, z in half:
            ring.append(Vector((x, -y, z)))
        for y, z in half[-2:0:-1]:
            ring.append(Vector((x, y, z)))
        rings.append(ring)
        for point in ring:
            # Silver paint: brighter towards the roof, as it takes the sky.
            k = 0.86 + 0.26 * min(1.0, max(0.0, (point.z - 0.3) / 0.9))
            shades.append(lit(COAT, k) if point.z > 0.36 else PLASTIC)
        tones.append(shades)
    skin(part, rings, tones, (Vector((-2.26, 0.0, 0.62)), COAT), (Vector((2.26, 0.0, 0.48)), COAT))
    for side in (-1.0, 1.0):
        out = Vector((0.0, side, 0.0))
        # The front and rear doors' windows, and behind them the black pillar that makes the roof seem to float.
        for points, colour in (
            (((-1.3, 1.05), (-1.3, 1.41), (-0.38, 1.43), (-0.38, 0.96)), GLASS),
            (((-0.3, 0.96), (-0.3, 1.43), (0.3, 1.44), (1.0, 1.02), (1.0, 0.94)), GLASS),
            (((-1.96, 1.1), (-1.72, 1.33), (-1.38, 1.42), (-1.38, 1.06)), PILLAR),
        ):
            at = [leaf_glass(x, z, side) for x, z in points]
            made = face(part, [put(part, p, colour) for p in at])
            part['flat'][made] = colour
            top = [leaf_glass(points[0][0] + 0.04, points[0][1] + (points[1][1] - points[0][1]) * 0.52, side), leaf_glass(points[-1][0] - 0.1, points[-1][1] + 0.12, side)]
            strip(part, top, 0.016, tone('#3a5068'), out)
        # The doors' seams, and their handles set flush.
        for x, low, high in ((-1.34, 0.34, 1.03), (-0.34, 0.34, 0.95), (1.02, 0.34, 0.93)):
            strip(part, [Vector((x, side * (leaf_wide(x) + 0.008), low)), Vector((x, side * (leaf_wide(x) + 0.008), high))], 0.0055, DARK, out)
        for x in (-1.2, -0.22):
            lump(part, Vector((x, side * (leaf_wide(x) + 0.01), 0.86)), (0.07, 0.01, 0.014), 1, lit(COAT, 1.2))
        # A bright line under the windows, and the dark sill.
        strip(part, [Vector((x, side * (leaf_wide(x) + 0.008), leaf_belt(x) - 0.012)) for x in (-1.95, -1.4, -0.4, 0.5, 1.0)], 0.006, CHROME, out)
        # The mirror, on the door.
        lump(part, Vector((0.96, side * 0.99, 1.0)), (0.07, 0.085, 0.05), 2, COAT)
        lump(part, Vector((0.94, side * 0.92, 0.98)), (0.04, 0.05, 0.02), 1, DARK)
        for x in (-1.35, 1.35):
            # A wheel in its arch: a dark round, the tyre, a rim of ten thin spokes and its hub.
            arch = [Vector((x + 0.41 * math.cos(TAU * k / 22.0), side * (leaf_wide(x) + 0.006), 0.33 + 0.41 * math.sin(TAU * k / 22.0))) for k in range(22)]
            face(part, [put(part, p, DARK) for p in arch])
            y0 = side * (leaf_wide(x) - 0.18)
            y1 = side * (leaf_wide(x) + 0.02)
            tyre = []
            for y, r in ((y0, 0.325), (y1 - side * 0.03, 0.33), (y1, 0.295)):
                tyre.append(circle(Vector((x, y, 0.33)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 24))
            skin(part, tyre, [tone('#17181b'), tone('#1e2024'), tone('#26282c')], closed=True, flip=side > 0.0)
            hub = Vector((x, y1 + side * 0.004, 0.33))
            rim = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.235, 24)
            face(part, [put(part, p, tone('#1a1c20')) for p in rim])
            ring_out = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.295, 24)
            ring_in = circle(hub, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), 0.235, 24)
            skin(part, [ring_out, ring_in], [tone('#20222a'), CHROME], closed=True, flip=side > 0.0)
            for k in range(10):
                turn = TAU * k / 10.0 + 0.3
                a = hub + Vector((0.236 * math.cos(turn - 0.07), side * 0.004, 0.236 * math.sin(turn - 0.07)))
                b = hub + Vector((0.236 * math.cos(turn + 0.07), side * 0.004, 0.236 * math.sin(turn + 0.07)))
                c = hub + Vector((0.05 * math.cos(turn + 0.25), side * 0.012, 0.05 * math.sin(turn + 0.25)))
                d = hub + Vector((0.05 * math.cos(turn - 0.25), side * 0.012, 0.05 * math.sin(turn - 0.25)))
                face(part, [put(part, p, CHROME) for p in (a, b, c, d)])
            lump(part, hub + Vector((0.0, side * 0.014, 0.0)), (0.05, 0.016, 0.05), 1, tone('#6a7078'))
        # Headlamps that sweep back up along the wing, and a running light along their lower edge.
        lamp = [Vector((2.23, side * 0.3, 0.76)), Vector((2.12, side * 0.62, 0.83)), Vector((1.93, side * 0.82, 0.88)), Vector((2.0, side * 0.86, 0.81)), Vector((2.19, side * 0.72, 0.7)), Vector((2.25, side * 0.4, 0.68))]
        part['flat'][face(part, [put(part, p, LAMP) for p in lamp])] = LAMP
        strip(part, [Vector((2.25, side * 0.42, 0.675)), Vector((2.2, side * 0.72, 0.695)), Vector((2.02, side * 0.865, 0.8))], 0.008, tone('#f6f4ea'), Vector((1.0, side * 0.4, 0.0)))
        # Tail lamps round the rear corners, in the same sweep.
        lamp = [Vector((-2.17, side * 0.83, 1.2)), Vector((-2.23, side * 0.87, 0.98)), Vector((-2.27, side * 0.72, 0.9)), Vector((-2.24, side * 0.66, 0.98)), Vector((-2.2, side * 0.7, 1.12))]
        part['flat'][face(part, [put(part, p, tone('#7a2420')) for p in lamp])] = tone('#7a2420')
    # The windscreen, and the tailgate's window sloping down to its spoiler.
    wind = [leaf_glass(0.44, 1.42, -1.0), leaf_glass(0.44, 1.42, 1.0), leaf_glass(1.2, 1.04, 1.0), leaf_glass(1.2, 1.04, -1.0)]
    for p in wind:
        p.z += 0.03
    wind[0].y += 0.1; wind[1].y -= 0.1; wind[2].y -= 0.06; wind[3].y += 0.06
    part['flat'][face(part, [put(part, p, GLASS) for p in wind])] = GLASS
    # The tailgate's glass lies along the sloping back, under a small spoiler in the coat at the roof's end.
    tail = [Vector((-1.62, -0.5, leaf_top(-1.62) + 0.006)), Vector((-1.62, 0.5, leaf_top(-1.62) + 0.006)), Vector((-2.1, 0.62, leaf_top(-2.1) - 0.01)), Vector((-2.1, -0.62, leaf_top(-2.1) - 0.01))]
    part['flat'][face(part, [put(part, p, GLASS) for p in tail])] = GLASS
    lump(part, Vector((-1.6, 0.0, leaf_top(-1.6) + 0.015)), (0.07, 0.56, 0.02), 1, lit(COAT, 1.1))
    # A closed nose, for it is electric: a dark gloss panel with a bright V across it, and no badge.
    grille = [Vector((2.255, -0.34, 0.73)), Vector((2.255, 0.34, 0.73)), Vector((2.272, 0.44, 0.5)), Vector((2.272, -0.44, 0.5))]
    part['flat'][face(part, [put(part, p, tone('#141820')) for p in grille])] = tone('#141820')
    strip(part, [Vector((2.262, -0.36, 0.735)), Vector((2.276, 0.0, 0.47)), Vector((2.262, 0.36, 0.735))], 0.012, CHROME, Vector((1.0, 0.0, 0.0)))
    # Bumpers in dark plastic, a low intake at the nose, and a short fin of an aerial.
    for x, depth in ((2.24, 0.12), (-2.24, 0.1)):
        lump(part, Vector((x, 0.0, 0.36)), (depth, 0.84, 0.1), 2, PLASTIC)
    lump(part, Vector((2.3, 0.0, 0.42)), (0.03, 0.5, 0.05), 1, DARK)
    lump(part, Vector((-1.65, 0.0, 1.53)), (0.09, 0.02, 0.05), 1, DARK)
    # The wipers, lying at the foot of the windscreen.
    for y in (-0.3, 0.32):
        strip(part, [Vector((1.17, y, 1.09)), Vector((1.12, y + 0.3, 1.11))], 0.007, DARK, Vector((0.5, 0.0, 0.86)))
    finish(part, name, sharp=30.0, strength=0.5, reach=0.5, floor=0.0, leaf=True)


build_leaf('bil', tone('#b4b9be'))
build_car('bil-gra', tone('#a8a69a'), 2.0)
