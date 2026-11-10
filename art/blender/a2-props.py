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


# --- the cars ---------------------------------------------------------------------------------------------------------------
# Two cars, made the same way, in metres: the family's own, a silver electric five-door hatchback as theirs is (Olov,
# 7 November 2026), and the grey estate that drives past behind Byn's street in the storm. Neither has a badge, a plate, an
# emblem or a letter: only the shape of a car, and neither copies any maker's design. Each stands on its origin with its
# wheels on the ground, its nose towards +X and its near side towards -Y.
#
# The body is one shell: rings across it from the tail to the nose, every ring the same points in the same order (along
# the floor, round the sill, up the door to the shoulder and the belt, up the glass to the roof's edge and over the roof),
# so that the shell is smooth along it and across it. Over the wheels the rings' lower points rise to the arch. Glass,
# lamps, the dark trim, the seams of the doors and the mirrors lie on the shell, each a little out from it.
#
# The wheels are things of their own, one pair for each axle, hanging from a pivot on its axle (`<car>-hjul-fram` and
# `<car>-hjul-bak`): the game turns the pivots as the car rolls. Tyres with round shoulders and a tread, rims with their
# spokes, the brake disc behind them, and a plain cap with no mark.

CAR = MATERIAL.copy()
CAR.name = 'kit-car'
for node in CAR.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        # Wet, all of it: the paint, the glass, the tyres and the trim have the rain on them.
        node.inputs['Roughness'].default_value = 0.34

SECTION = 27          # points on a half ring, from the floor's middle round to the roof's middle
FLOOR = 4             # the first of them that are the floor's and the sill's, dark


def smooth_along(table, t):
    """A value read from a table of (at, value) rows, through its rows on a smooth curve (Catmull-Rom)."""
    n = len(table)
    if t <= table[0][0]:
        return table[0][1]
    if t >= table[-1][0]:
        return table[-1][1]
    i = 1
    while table[i][0] < t:
        i += 1
    x1 = table[i - 1][0]
    x2 = table[i][0]
    y1 = table[i - 1][1]
    y2 = table[i][1]
    x0 = table[i - 2][0] if i >= 2 else x1 - (x2 - x1)
    y0 = table[i - 2][1] if i >= 2 else y1 - (y2 - y1)
    x3 = table[i + 1][0] if i + 1 < n else x2 + (x2 - x1)
    y3 = table[i + 1][1] if i + 1 < n else y2 + (y2 - y1)
    s = (t - x1) / (x2 - x1)
    # Tangents measured over the spacing on each side, so that uneven rows don't overshoot.
    m1 = (y2 - y0) / (x2 - x0) * (x2 - x1)
    m2 = (y3 - y1) / (x3 - x1) * (x2 - x1)
    return (2 * s ** 3 - 3 * s ** 2 + 1) * y1 + (s ** 3 - 2 * s ** 2 + s) * m1 + (-2 * s ** 3 + 3 * s ** 2) * y2 + (s ** 3 - s ** 2) * m2


def smoothstep(a, b, t):
    k = max(0.0, min(1.0, (t - a) / (b - a)))
    return k * k * (3.0 - 2.0 * k)


def car_low(spec, x):
    """How high the body's lower edge stands at x: the sill, the bumpers, or the round of an arch over a wheel."""
    low = smooth_along(spec['bottom'], x)
    for ax in spec['axles']:
        d = abs(x - ax)
        if d < spec['arch']:
            low = max(low, spec['radius'] + math.sqrt(spec['arch'] ** 2 - d * d))
    return low


def car_section(spec, x):
    """The half ring at x, from the middle of the floor to the middle of the roof: SECTION (y, z) pairs, the same
    features at the same places along every ring. Over the bonnet and the tail, where there is no cabin, the points of
    the glass and the roof lie across the top instead. Also gives the belt's height and how much cabin there is."""
    w = smooth_along(spec['wide'], x)
    top = smooth_along(spec['top'], x)
    belt = min(smooth_along(spec['belt'], x), top - 0.02)
    roof_w = min(smooth_along(spec['roof'], x), w - 0.08)
    # The ring is made down to the sill, and only then are its lowest points lifted to an arch over a wheel.
    low = smooth_along(spec['bottom'], x)
    cabin = smoothstep(0.03, 0.17, top - belt)
    if cabin < 1.0:
        belt = belt * cabin + (top - 0.075) * (1.0 - cabin)
    shoulder = belt - spec['shoulder']
    tuck = spec['tuck']
    pts = []
    # The floor, from the middle out, and round the sill (4).
    for k in (0.0, 0.5, 0.82):
        pts.append((w * k, low))
    pts.append((w - tuck - 0.03, low + 0.004))
    # Round the sill to the door (2).
    pts.append((w - tuck + 0.004, low + 0.034))
    pts.append((w - tuck * 0.55, low + 0.09))
    # Up the door to the shoulder, bellied a little (5).
    side_from = low + 0.09
    span = max(0.04, shoulder - side_from)
    for k in (0.2, 0.42, 0.64, 0.84, 1.0):
        pts.append((w - tuck * 0.55 * (1.0 - k) ** 1.5 + 0.005 * math.sin(k * math.pi), side_from + span * k))
    # The shoulder's soft crease, and in to the belt (3).
    pts.append((w - 0.004, shoulder + (belt - shoulder) * 0.4))
    pts.append((w - 0.018, shoulder + (belt - shoulder) * 0.78))
    pts.append((w - 0.036, belt))
    # The glass leaning in to the roof's edge (5).
    roof_top = top - 0.004
    rail = roof_top - spec['rail']
    lean_from = w - 0.036
    for k in (0.2, 0.4, 0.6, 0.8, 1.0):
        y = lean_from + (roof_w + 0.035 - lean_from) * k - 0.01 * math.sin(k * math.pi)
        z = belt + (rail - belt) * k
        if cabin < 1.0:
            y = y * cabin + (lean_from - lean_from * 0.1 * k) * (1.0 - cabin)
            z = z * cabin + (belt + (top - 0.016 - belt) * k ** 0.55) * (1.0 - cabin)
        pts.append((y, z))
    # Over the roof's edge (4).
    ey, ez = pts[-1]
    for k in (0.3, 0.6, 0.85, 1.0):
        a = k * math.pi * 0.5
        y = roof_w + 0.035 - 0.05 * (1.0 - math.cos(a)) - 0.012 * k
        z = rail + (roof_top - 0.012 - rail) * math.sin(a)
        if cabin < 1.0:
            y = y * cabin + ey * (1.0 - 0.16 * k) * (1.0 - cabin)
            z = z * cabin + (top - 0.016 + 0.01 * k) * (1.0 - cabin)
        pts.append((y, z))
    # Across the roof to its middle (4).
    ay, az = pts[-1]
    for k in (0.3, 0.55, 0.8, 1.0):
        pts.append((ay * (1.0 - k), az + (top - az) * math.sin(k * math.pi * 0.5)))
    # Over a wheel the lower part of the ring is drawn up into the arch, smoothly, the more the higher the arch: the
    # floor becomes the well's roof, the sill's round the arch's lip, and the side above it stays as it is anywhere.
    arch = car_low(spec, x)
    if arch > low + 0.001:
        ceiling = spec['radius'] + spec['arch'] + 0.07
        for j in range(len(pts)):
            y, z = pts[j]
            if z < ceiling:
                pts[j] = (y, arch + (z - low) * (ceiling - arch) / (ceiling - low))
    return pts, belt, cabin


def car_shell(part, spec, stations):
    """The body's shell: a ring at each station, closed at both ends. Gives the points as [station][j], j going round
    from the floor's middle up the near side, over the roof and down the far side."""
    rings = []
    tones = []
    for x in stations:
        half, belt, cabin = car_section(spec, x)
        ring = []
        for y, z in half:
            ring.append(Vector((x, -y, z)))
        for y, z in half[-2:0:-1]:
            ring.append(Vector((x, y, z)))
        rings.append(ring)
        shades = []
        for j in range(len(ring)):
            jj = j if j < SECTION else 2 * SECTION - 2 - j
            point = ring[j]
            if jj < FLOOR:
                shades.append(spec['under'])
            else:
                # The coat, brighter towards the roof where it takes the sky.
                shades.append(lit(spec['coat'], 0.82 + 0.3 * min(1.0, max(0.0, (point.z - 0.35) / 1.0))))
        tones.append(shades)
    tail = Vector((stations[0] - 0.004, 0.0, (rings[0][SECTION - 1].z * 0.4 + rings[0][0].z * 0.6)))
    nose = Vector((stations[-1] + 0.004, 0.0, (rings[-1][SECTION - 1].z * 0.4 + rings[-1][0].z * 0.6)))
    return skin(part, rings, tones, (tail, spec['coat']), (nose, spec['coat']))


# --- what lies on the shell -------------------------------------------------------------------------------------------------

def shell_point(spec, x, z, side, out=0.0):
    """The point of the shell's side at x and height z, between its lowest edge and its roof's edge, pushed `out`
    along its normal: found up the half ring by its height."""
    half, belt, cabin = car_section(spec, x)
    if z <= half[FLOOR][1]:
        a = half[FLOOR]
        b = half[FLOOR + 1]
        y = a[0]
        dy = b[0] - a[0]
        dz = b[1] - a[1]
        length = math.sqrt(dy * dy + dz * dz)
        return Vector((x, side * (y + dz / length * out), z - dy / length * out))
    for j in range(FLOOR, SECTION - 5):
        a = half[j]
        b = half[j + 1]
        if (a[1] - z) * (b[1] - z) <= 0.0 and abs(b[1] - a[1]) > 1e-7:
            t = (z - a[1]) / (b[1] - a[1])
            y = a[0] + (b[0] - a[0]) * t
            dy = b[0] - a[0]
            dz = b[1] - a[1]
            length = math.sqrt(dy * dy + dz * dz)
            return Vector((x, side * (y + dz / length * out), z - dy / length * out))
    a = half[SECTION - 5]
    return Vector((x, side * (a[0] + out), a[1]))


def top_point(spec, x, y, out=0.0):
    """The point of the shell's top (bonnet, windscreen, roof or tailgate) at x and y across, lifted by `out`."""
    half, belt, cabin = car_section(spec, x)
    for j in range(SECTION - 1, FLOOR + 6, -1):
        a = half[j]
        b = half[j - 1]
        if (a[0] - abs(y)) * (b[0] - abs(y)) <= 0.0 and abs(b[0] - a[0]) > 1e-7:
            t = (abs(y) - a[0]) / (b[0] - a[0])
            return Vector((x, y, a[1] + (b[1] - a[1]) * t + out))
    return Vector((x, y, half[SECTION - 1][1] + out))


def side_patch(part, spec, corners, side, out, colour, rows=3, step=0.08):
    """A patch lying on the side of the shell. `corners` are (x, z) as (bottom-back, top-back, top-front,
    bottom-front); between them it is sampled finely along x, so that it follows the shell's curves."""
    bb, tb, tf, bf = corners
    cols = max(2, int(max(abs(bf[0] - bb[0]), abs(tf[0] - tb[0])) / step) + 1)
    grid = []
    for i in range(rows + 1):
        v = i / rows
        row = []
        for c in range(cols + 1):
            u = c / cols
            x = (bb[0] + (bf[0] - bb[0]) * u) * (1.0 - v) + (tb[0] + (tf[0] - tb[0]) * u) * v
            z = (bb[1] + (bf[1] - bb[1]) * u) * (1.0 - v) + (tb[1] + (tf[1] - tb[1]) * u) * v
            row.append(put(part, shell_point(spec, x, z, side, out), colour))
        grid.append(row)
    for i in range(rows):
        for c in range(cols):
            quad = (grid[i][c], grid[i][c + 1], grid[i + 1][c + 1], grid[i + 1][c])
            face(part, quad if side > 0 else quad[::-1], colour)
    return grid


def roof_rail(spec, x):
    """How high the roof's edge is at x: the top of the side glass."""
    return smooth_along(spec['top'], x) - 0.004 - spec['rail']


def window_patch(part, spec, xs, side, out, colour, gap=0.0, rows=4):
    """A side window from its belt up to the roof's edge: `xs` are its corners' x as (bottom-back, top-back,
    top-front, bottom-front); its foot follows the belt, its head the roof's edge, `gap` in from both."""
    bb, tb, tf, bf = xs
    cols = max(3, int(max(abs(bf - bb), abs(tf - tb)) / 0.1) + 1)
    grid = []
    for i in range(rows + 1):
        v = i / rows
        row = []
        for c in range(cols + 1):
            u = c / cols
            xb = bb + (bf - bb) * u
            xt = tb + (tf - tb) * u
            x = xb + (xt - xb) * v
            low = car_section(spec, xb)[1] + gap
            high = roof_rail(spec, xt) - gap
            row.append(put(part, shell_point(spec, x, low + (high - low) * v, side, out), colour))
        grid.append(row)
    for i in range(rows):
        for c in range(cols):
            quad = (grid[i][c], grid[i][c + 1], grid[i + 1][c + 1], grid[i + 1][c])
            face(part, quad if side > 0 else quad[::-1], colour)
    return grid


def side_band(part, spec, path, wide, side, out, colour):
    """A thin band lying on the side of the shell along a path of (x, z): a seam, a trim line, a light's strip."""
    prev = None
    for i in range(len(path)):
        a = path[max(i - 1, 0)]
        b = path[min(i + 1, len(path) - 1)]
        dx = b[0] - a[0]
        dz = b[1] - a[1]
        length = math.sqrt(dx * dx + dz * dz) or 1.0
        nx = -dz / length * wide
        nz = dx / length * wide
        x, z = path[i]
        pair = (put(part, shell_point(spec, x - nx, z - nz, side, out), colour), put(part, shell_point(spec, x + nx, z + nz, side, out), colour))
        if prev is not None:
            quad = (prev[0], prev[1], pair[1], pair[0])
            face(part, quad if side < 0 else quad[::-1], colour)
        prev = pair


def top_patch(part, spec, x0, x1, half0, half1, out, colour, cols=8, rows=6):
    """A patch lying on the top of the shell from x0 to x1, across from -half to +half, each read at its end."""
    grid = []
    for i in range(rows + 1):
        v = i / rows
        x = x0 + (x1 - x0) * v
        half = half0 + (half1 - half0) * v
        row = []
        for c in range(cols + 1):
            y = -half + 2.0 * half * c / cols
            row.append(put(part, top_point(spec, x, y, out), colour))
        grid.append(row)
    for i in range(rows):
        for c in range(cols):
            quad = (grid[i][c], grid[i][c + 1], grid[i + 1][c + 1], grid[i + 1][c])
            face(part, quad if x1 > x0 else quad[::-1], colour)
    return grid


def end_patch(part, x, y0, y1, z0, z1, colour, out):
    """A flat patch on an end face at x, facing `out` (+1 the nose's way, -1 the tail's), rounded at its corners."""
    corners = []
    cy = (y0 + y1) * 0.5
    cz = (z0 + z1) * 0.5
    hy = abs(y1 - y0) * 0.5
    hz = abs(z1 - z0) * 0.5
    r = min(hy, hz) * 0.45
    for qy, qz, a0 in ((1.0, 1.0, 0.0), (-1.0, 1.0, 90.0), (-1.0, -1.0, 180.0), (1.0, -1.0, 270.0)):
        for k in range(4):
            a = math.radians(a0 + 90.0 * k / 3.0)
            corners.append(Vector((x + out * 0.004, cy + qy * (hy - r) + r * math.cos(a), cz + qz * (hz - r) + r * math.sin(a))))
    pts = [put(part, p, colour) for p in corners]
    middle = put(part, Vector((x + out * 0.004, cy, cz)), colour)
    for k in range(len(pts)):
        tri = (pts[k], pts[(k + 1) % len(pts)], middle)
        face(part, tri if out > 0 else tri[::-1], colour)


# --- a pair of wheels on an axle ---------------------------------------------------------------------------------------------

def wheel(part, spec, side, sides):
    """One wheel round the origin on the axle (along Y), its outer face towards `side`: the tyre, the rim and its
    spokes, the brake disc behind them and the plain cap. Gives nothing: its points are in `part`."""
    R = spec['radius']
    half = spec['tyre'] * 0.5
    y0 = side * spec['track']
    rim_r = spec['rim']
    TYRE = spec['tyre_tone']
    WALL = lit(TYRE, 1.25)
    RIM = spec['rim_tone']
    DEEP = tone('#0d0e10')
    # The tyre: a round-shouldered ring, from inside the rim's lip round its outer wall, the tread and its inner wall.
    profile = [
        (rim_r - 0.004, -half * 0.86, WALL), (rim_r + 0.02, -half * 0.98, WALL), (R - 0.05, -half, WALL), (R - 0.016, -half * 0.92, TYRE),
        (R - 0.002, -half * 0.62, TYRE), (R, -half * 0.2, lit(TYRE, 0.86)), (R, half * 0.2, lit(TYRE, 0.86)), (R - 0.002, half * 0.62, TYRE),
        (R - 0.016, half * 0.92, TYRE), (R - 0.05, half, WALL), (rim_r + 0.02, half * 0.98, WALL), (rim_r - 0.004, half * 0.86, WALL),
    ]
    rings = []
    tones = []
    for r, y, colour in profile:
        rings.append(circle(Vector((0.0, y0 + side * y, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, sides))
        tones.append(colour)
    # Tread: every other point of the tread's rows a little darker, as its blocks are.
    made = skin(part, rings, tones, closed=True, flip=side < 0.0)
    for i in (5, 6):
        for j in range(0, sides, 2):
            part['paint'][made[i][j]] = lit(TYRE, 0.6)
    # The rim's barrel inside the tyre, dark, and its bright lip at the face.
    face_y = y0 + side * (half * 0.8)
    barrel = [
        (rim_r - 0.004, y0 - side * half * 0.8, DEEP), (rim_r - 0.012, face_y - side * 0.03, DEEP),
        (rim_r, face_y, lit(RIM, 0.85)), (rim_r - 0.022, face_y + side * 0.004, RIM), (rim_r - 0.03, face_y - side * 0.006, lit(RIM, 0.7)),
    ]
    rings = []
    tones = []
    for r, y, colour in barrel:
        rings.append(circle(Vector((0.0, y, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, sides))
        tones.append(colour)
    skin(part, rings, tones, closed=True, flip=side > 0.0)
    # The brake disc in the dark behind the spokes, and the rim's well around it.
    back_y = face_y - side * 0.05
    disc = circle(Vector((0.0, back_y, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), rim_r - 0.03, sides)
    well = [put(part, p, DEEP) for p in disc]
    centre = put(part, Vector((0.0, back_y, 0.0)), tone('#3a3d42'))
    for j in range(sides):
        k = (j + 1) % sides
        tri = (well[j], well[k], centre)
        face(part, tri if side < 0.0 else tri[::-1])
    ring_disc = circle(Vector((0.0, back_y + side * 0.003, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), (rim_r - 0.03) * 0.78, sides)
    inner_disc = circle(Vector((0.0, back_y + side * 0.003, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), (rim_r - 0.03) * 0.4, sides)
    skin(part, [ring_disc, inner_disc], [tone('#56595e'), tone('#3a3d42')], closed=True, flip=side > 0.0)
    # The spokes: each a little arched box from the hub out to the lip, bright on its face and darker on its sides.
    count = spec['spokes']
    for s in range(count):
        turn = TAU * s / count + 0.2
        for twin in spec['twin']:
            a0 = turn + twin
            spread_in = spec['spoke_in']
            spread_out = spec['spoke_out']
            pts = []
            for k in range(4):
                t = k / 3.0
                r = 0.055 + (rim_r - 0.03 - 0.055) * t
                spread = (spread_in + (spread_out - spread_in) * t) / r
                dip = -side * 0.016 * math.sin(t * math.pi) + side * 0.006
                for sgn in (-1.0, 1.0):
                    a = a0 + sgn * spread * 0.5
                    pts.append((Vector((r * math.cos(a), face_y + dip, r * math.sin(a))), Vector((r * math.cos(a), face_y + dip - side * 0.028, r * math.sin(a)))))
            front = [put(part, p[0], RIM) for p in pts]
            back = [put(part, p[1], lit(RIM, 0.55)) for p in pts]
            for k in range(3):
                i0 = k * 2
                quads = [
                    (front[i0], front[i0 + 1], front[i0 + 3], front[i0 + 2]),
                    (front[i0], front[i0 + 2], back[i0 + 2], back[i0]),
                    (front[i0 + 1], back[i0 + 1], back[i0 + 3], front[i0 + 3]),
                ]
                for quad in quads:
                    face(part, quad if side < 0.0 else quad[::-1])
    # The hub, and a plain cap on it, with its nuts round it.
    hub = [(0.075, face_y - side * 0.01, lit(RIM, 0.8)), (0.07, face_y + side * 0.012, RIM), (0.045, face_y + side * 0.02, lit(RIM, 1.1)), (0.0, face_y + side * 0.022, lit(RIM, 1.15))]
    rings = []
    tones = []
    for r, y, colour in hub[:-1]:
        rings.append(circle(Vector((0.0, y, 0.0)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 16))
        tones.append(colour)
    skin(part, rings, tones, None, (Vector((0.0, hub[-1][1], 0.0)), hub[-1][2]), closed=True, flip=side > 0.0)
    for s in range(5):
        a = TAU * s / 5.0 + 0.5
        lump(part, Vector((0.058 * math.cos(a), face_y + side * 0.012, 0.058 * math.sin(a))), (0.011, 0.008, 0.011), 1, lit(RIM, 0.6))


def axle(spec, name, x, wheel_mesh=None):
    """A pair of wheels on the axle at x, under its pivot `<name>`; both axles share one mesh."""
    pivot = bpy.data.objects.new(name, None)
    pivot.empty_display_size = 0.2
    bpy.context.scene.collection.objects.link(pivot)
    pivot.location = (x, 0.0, spec['radius'])
    # For the game: how far it rolls in a turn, and how far out from the middle the tyres' outer faces are.
    pivot['radius'] = spec['radius']
    pivot['track'] = spec['track'] + spec['tyre'] * 0.5
    if wheel_mesh is None:
        part = new_part()
        for side in (-1.0, 1.0):
            wheel(part, spec, side, spec['sides'])
        made = finish(part, name + '-par', sharp=40.0, strength=0.35, reach=0.12, floor=None)
    else:
        made = bpy.data.objects.new(name + '-par', wheel_mesh)
        bpy.context.scene.collection.objects.link(made)
        # It shares the first pair's mesh: its shade is baked once, there.
        made['shade'] = 0.0
        made['reach'] = 0.1
        made['floor'] = -1000.0
    made.data.materials[0] = CAR
    made.parent = pivot
    return pivot, made


def build_car(name, spec):
    if not wanted(name):
        return
    part = new_part()
    stations = spec['stations']
    car_shell(part, spec, stations)
    COAT = spec['coat']
    BLACK = spec['plastic']
    GLASS = spec['glass']
    FRAME = tone('#0b0d10')
    for side in (-1.0, 1.0):
        # The sill's and the bumpers' dark plastic, and the arches' edges.
        for x0, x1 in spec['sills']:
            low0 = car_low(spec, x0)
            low1 = car_low(spec, x1)
            side_patch(part, spec, ((x0, low0 - 0.01), (x0, spec['sill_top']), (x1, spec['sill_top']), (x1, low1 - 0.01)), side, 0.004, BLACK, rows=2)
        # The windows: first their black surround, a little bigger, then the glass on it.
        for bb, tb, tf, bf in spec['windows']:
            grow = 0.024
            window_patch(part, spec, (bb - grow, tb - grow, tf + grow, bf + grow), side, 0.004, FRAME, gap=-0.012, rows=3)
            grid = window_patch(part, spec, (bb, tb, tf, bf), side, 0.008, GLASS, gap=0.012, rows=4)
            # A soft long shine low along each pane, as there is on wet glass.
            for c in range(len(grid[1])):
                part['paint'][grid[1][c]] = blend(GLASS, tone('#4c6178'), 0.55)
        # The pillars between the windows, black, so that the glass reads as one band under the roof.
        for x0, x1 in spec['pillars']:
            window_patch(part, spec, (x0, x0, x1, x1), side, 0.006, FRAME, gap=-0.012, rows=3)
        # The doors' seams and their handles.
        for path in spec['seams']:
            side_band(part, spec, path, 0.0045, side, 0.003, tone('#202328'))
        for x, z in spec['handles']:
            lump(part, shell_point(spec, x, z, side, 0.012), (0.075, 0.012, 0.014), 1, lit(COAT, 1.2))
            side_band(part, spec, ((x - 0.07, z - 0.02), (x + 0.07, z - 0.02)), 0.004, side, 0.004, tone('#2a2d32'))
        # The lamps: lenses, the light inside them, and a strip of running light.
        for lamp in spec['heads']:
            side_patch(part, spec, lamp, side, 0.007, spec['lens'], rows=3, step=0.035)
        for path in spec['running']:
            side_band(part, spec, path, 0.009, side, 0.011, tone('#f4f2ea'))
        for lamp in spec['tails']:
            side_patch(part, spec, lamp, side, 0.007, spec['tail'], rows=3, step=0.035)
        # The mirror on the door, its cap in the coat on a dark foot.
        mx, mz = spec['mirror']
        root = shell_point(spec, mx, mz, side, 0.0)
        lump(part, root + Vector((-0.02, side * 0.05, 0.0)), (0.05, 0.05, 0.03), 1, BLACK)
        cap = lump(part, root + Vector((0.0, side * 0.13, 0.04)), (0.085, 0.09, 0.06), 2, COAT)
        for vert in cap:
            if (vert.co.x - root.x) < -0.04:
                part['paint'][vert] = BLACK
        # Inside each arch, a dark wall, so that the wheel stands in a well and nothing shows through.
        for ax in spec['axles']:
            ring = []
            w = smooth_along(spec['wide'], ax)
            for k in range(13):
                a = math.pi * k / 12.0
                ring.append(Vector((ax + spec['arch'] * math.cos(a), side * (w - 0.27), spec['radius'] + spec['arch'] * math.sin(a))))
            pts = [put(part, p, spec['under']) for p in ring]
            hub_pt = put(part, Vector((ax, side * (w - 0.27), spec['radius'])), spec['under'])
            for k in range(12):
                tri = (pts[k], pts[k + 1], hub_pt)
                face(part, tri if side < 0 else tri[::-1])
    # The windscreen and the back glass, each on a black surround.
    for x0, x1, h0, h1 in spec['screens']:
        top_patch(part, spec, x0 - 0.02 * (1 if x1 > x0 else -1), x1 + 0.02 * (1 if x1 > x0 else -1), h0 + 0.02, h1 + 0.02, 0.004, FRAME)
        grid = top_patch(part, spec, x0, x1, h0, h1, 0.008, GLASS)
        for c in range(len(grid[2])):
            part['paint'][grid[2][c]] = blend(GLASS, tone('#4c6178'), 0.5)
    # On the flat end faces: the tail lamps, the corners of the headlamps, and the nose's low intake.
    tail_x = spec['stations'][0] - 0.006
    nose_x = spec['stations'][-1] + 0.006
    for y0, y1, z0, z1 in spec['tail_faces']:
        for side in (-1.0, 1.0):
            end_patch(part, tail_x, side * y0, side * y1, z0, z1, spec['tail'], -1.0)
    for y0, y1, z0, z1 in spec['head_faces']:
        for side in (-1.0, 1.0):
            end_patch(part, nose_x, side * y0, side * y1, z0, z1, spec['lens'], 1.0)
    for y0, y1, z0, z1 in spec['intakes']:
        end_patch(part, nose_x, y0, y1, z0, z1, FRAME, 1.0)
    # Roof rails on their feet, where the car has them.
    for x0, x1 in spec['rails']:
        for side in (-1.0, 1.0):
            across = smooth_along(spec['roof'], (x0 + x1) * 0.5) - 0.07
            path = []
            for k in range(7):
                x = x0 + (x1 - x0) * k / 6.0
                lift = 0.055 if 0 < k < 6 else 0.0
                path.append(top_point(spec, x, side * across, lift))
            tube(part, path, [0.016] * 7, [tone('#2a2d33')] * 7, 6)
    # The wipers at the foot of the windscreen.
    for y in spec['wipers']:
        a = top_point(spec, spec['wiper_x'], y, 0.02)
        b = top_point(spec, spec['wiper_x'] - 0.12, y + 0.42, 0.02)
        tube(part, [a, b], [0.009, 0.007], [FRAME, FRAME], 5)
    finish(part, name, sharp=34.0, strength=0.5, reach=0.5, floor=0.0)
    body = bpy.data.objects[name]
    body.data.materials[0] = CAR
    front, shared = axle(spec, name + '-hjul-fram', spec['axles'][1])
    back, ignored = axle(spec, name + '-hjul-bak', spec['axles'][0], shared.data)
    front.parent = body
    back.parent = body
    # Where its near headlamp and tail lamp are, for the game to light: two marks, nothing drawn.
    for mark, lamp in (('-lykta-fram', spec['heads'][0]), ('-lykta-bak', spec['tails'][0])):
        x = (lamp[0][0] + lamp[1][0] + lamp[2][0] + lamp[3][0]) * 0.25
        z = (lamp[0][1] + lamp[1][1] + lamp[2][1] + lamp[3][1]) * 0.25
        at = shell_point(spec, x, z, -1.0, 0.03)
        light = bpy.data.objects.new(name + mark, None)
        bpy.context.scene.collection.objects.link(light)
        light.location = at
        light.parent = body


def car_stations(tail, nose, axles, arch, middle_step=0.19):
    """Where the rings stand: close together at the rounded ends, round each arch evenly along its curve, and every
    `middle_step` between."""
    xs = []
    ends = (0.0, 0.006, 0.016, 0.032, 0.054, 0.084, 0.124, 0.174, 0.234, 0.304, 0.384)
    for k in ends:
        xs.append(tail + k)
        xs.append(nose - k)
    for ax in axles:
        for k in range(17):
            xs.append(ax - arch * math.cos(math.pi * k / 16.0))
    for a, b in ((tail + 0.384, axles[0] - arch), (axles[0] + arch, axles[1] - arch), (axles[1] + arch, nose - 0.384)):
        count = max(1, int(round((b - a) / middle_step)))
        for k in range(1, count):
            xs.append(a + (b - a) * k / count)
    out = []
    for x in sorted(xs):
        if not out or x - out[-1] > 0.003:
            out.append(x)
    return out


def arch_seam(ax, reach, angles):
    """Points round an arch at `reach` from its axle, at the given angles in degrees from the front."""
    out = []
    for a in angles:
        out.append((ax + reach * math.cos(math.radians(a)), 0.33 + reach * math.sin(math.radians(a))))
    return tuple(out)


# The family's car: a five-door electric hatchback 4.5 long, with a raked windscreen and a long roof sloping down to the
# tailgate, a closed nose, lamps that sweep back along its wings, and the belt kicking up behind the rear door. Silver.
HATCH = {
    'coat': tone('#b4b9be'),
    'plastic': tone('#1d1f23'),
    'under': tone('#141518'),
    'glass': tone('#141c26'),
    'lens': tone('#d6dde2'),
    'tail': tone('#6a1c1a'),
    'axles': (-1.35, 1.35),
    'radius': 0.33,
    'arch': 0.4,
    'track': 0.775,
    'tyre': 0.21,
    'rim': 0.235,
    'tyre_tone': tone('#1a1b1e'),
    'rim_tone': tone('#aab0b6'),
    'spokes': 5,
    'twin': (-0.13, 0.13),
    'spoke_in': 0.03,
    'spoke_out': 0.026,
    'sides': 28,
    'shoulder': 0.11,
    'tuck': 0.045,
    'rail': 0.07,
    'top': ((-2.25, 0.96), (-2.243, 1.04), (-2.225, 1.09), (-2.18, 1.13), (-2.08, 1.2), (-1.88, 1.33), (-1.64, 1.44), (-1.3, 1.51), (-0.8, 1.545),
            (-0.2, 1.552), (0.14, 1.535), (0.42, 1.45), (0.72, 1.28), (1.0, 1.1), (1.18, 1.0), (1.5, 0.935), (1.85, 0.88),
            (2.06, 0.82), (2.18, 0.75), (2.235, 0.67), (2.25, 0.58)),
    'belt': ((-2.25, 1.0), (-2.05, 1.04), (-1.75, 1.03), (-1.4, 0.99), (-0.6, 0.965), (0.4, 0.95), (1.1, 0.935), (1.5, 0.9), (2.25, 0.8)),
    'roof': ((-2.25, 0.5), (-1.95, 0.58), (-1.55, 0.635), (-0.6, 0.665), (0.25, 0.655), (0.65, 0.68), (1.0, 0.74), (1.3, 0.8), (2.25, 0.8)),
    'wide': ((-2.25, 0.7), (-2.243, 0.79), (-2.225, 0.84), (-2.19, 0.87), (-2.1, 0.888), (-1.35, 0.898), (0.0, 0.895), (1.35, 0.893),
             (1.85, 0.882), (2.05, 0.866), (2.16, 0.84), (2.215, 0.8), (2.242, 0.74), (2.25, 0.66)),
    'bottom': ((-2.25, 0.42), (-2.21, 0.34), (-2.05, 0.3), (-1.75, 0.29), (-0.95, 0.27), (0.95, 0.27), (1.75, 0.27), (2.05, 0.255),
               (2.2, 0.27), (2.25, 0.34)),
    'sill_top': 0.37,
    'sills': ((-0.95, 0.95),),
    'windows': ((-0.27, -0.27, 0.34, 1.02), (-1.3, -1.3, -0.37, -0.37), (-1.94, -1.62, -1.42, -1.42)),
    'pillars': ((-0.37, -0.27), (-1.42, -1.3)),
    'seams': (
        ((0.9, 0.38), (0.91, 0.62), (0.93, 0.91)),
        ((-0.32, 0.38), (-0.32, 0.7), (-0.32, 0.95)),
        ((-1.3, 0.98), (-1.3, 0.8)) + arch_seam(-1.35, 0.44, (80, 65, 50, 35, 20, 8)),
        ((1.18, 0.925), (1.45, 0.875), (1.7, 0.84), (1.9, 0.8)),
    ),
    'handles': ((0.6, 0.865), (-0.66, 0.88)),
    'mirror': (0.98, 0.985),
    'heads': (((1.86, 0.72), (1.8, 0.81), (2.2, 0.725), (2.245, 0.615)),),
    'running': (((1.87, 0.728), (2.05, 0.69), (2.24, 0.625)),),
    'tails': (((-2.247, 0.86), (-2.235, 1.0), (-1.98, 1.02), (-1.99, 0.88)),),
    # On the end faces, (y from, y to, z from, z to): the tail lamps round the corners, and the nose's low dark intake.
    'tail_faces': ((0.46, 0.69, 0.87, 0.99),),
    'head_faces': ((0.5, 0.64, 0.6, 0.66),),
    'intakes': ((-0.5, 0.5, 0.37, 0.45),),
    'screens': ((1.12, 0.36, 0.7, 0.6), (-1.66, -2.1, 0.56, 0.6)),
    'wipers': (-0.52, 0.04),
    'wiper_x': 1.1,
    'rails': (),
}
HATCH['stations'] = car_stations(-2.25, 2.25, HATCH['axles'], HATCH['arch'])

# The car that drives past behind the street in Byn: an older estate, 4.7 long, square-backed, with roof rails, a plain
# dark grille between square lamps and tall lamps up the corners of its tailgate. Warm grey.
ESTATE = {
    'coat': tone('#a8a69a'),
    'plastic': tone('#24262a'),
    'under': tone('#141518'),
    'glass': tone('#16202a'),
    'lens': tone('#d8dcd8'),
    'tail': tone('#6e2420'),
    'axles': (-1.42, 1.42),
    'radius': 0.32,
    'arch': 0.39,
    'track': 0.765,
    'tyre': 0.2,
    'rim': 0.215,
    'tyre_tone': tone('#1b1c1f'),
    'rim_tone': tone('#a2a6aa'),
    'spokes': 5,
    'twin': (0.0,),
    'spoke_in': 0.05,
    'spoke_out': 0.044,
    'sides': 24,
    'shoulder': 0.1,
    'tuck': 0.04,
    'rail': 0.065,
    'top': ((-2.35, 0.98), (-2.345, 1.12), (-2.335, 1.3), (-2.31, 1.41), (-2.25, 1.465), (-2.1, 1.488), (-1.0, 1.5), (0.0, 1.5),
            (0.22, 1.48), (0.45, 1.39), (0.8, 1.2), (1.15, 1.0), (1.32, 0.955), (1.8, 0.9), (2.15, 0.845), (2.3, 0.76),
            (2.345, 0.66), (2.35, 0.56)),
    'belt': ((-2.35, 0.95), (-2.0, 0.952), (0.0, 0.932), (1.15, 0.92), (1.6, 0.89), (2.35, 0.8)),
    'roof': ((-2.35, 0.6), (-2.25, 0.645), (-1.8, 0.68), (0.2, 0.68), (0.7, 0.72), (1.1, 0.78), (1.4, 0.8), (2.35, 0.8)),
    'wide': ((-2.35, 0.72), (-2.343, 0.8), (-2.32, 0.845), (-2.27, 0.868), (-2.15, 0.88), (0.0, 0.885), (2.15, 0.875), (2.27, 0.84),
             (2.325, 0.79), (2.345, 0.72), (2.35, 0.64)),
    'bottom': ((-2.35, 0.42), (-2.3, 0.34), (-2.1, 0.3), (-1.81, 0.29), (1.81, 0.28), (2.1, 0.27), (2.3, 0.3), (2.35, 0.36)),
    'sill_top': 0.36,
    'sills': ((-1.03, 1.03),),
    'windows': ((-0.25, -0.25, 0.42, 1.12), (-1.28, -1.28, -0.35, -0.35), (-2.2, -2.16, -1.38, -1.38)),
    'pillars': ((-0.35, -0.25), (-1.38, -1.28)),
    'seams': (
        ((0.98, 0.37), (0.99, 0.62), (1.0, 0.9)),
        ((-0.3, 0.37), (-0.3, 0.7), (-0.3, 0.93)),
        ((-1.28, 0.95), (-1.28, 0.8)) + arch_seam(-1.42, 0.43, (78, 62, 46, 30, 16, 6)),
    ),
    'handles': ((0.66, 0.85), (-0.62, 0.86)),
    'mirror': (1.08, 0.975),
    'heads': (((2.0, 0.7), (1.99, 0.8), (2.3, 0.765), (2.335, 0.665)),),
    'running': (),
    'tails': (((-2.345, 0.8), (-2.343, 1.3), (-2.27, 1.3), (-2.27, 0.8)),),
    'tail_faces': ((0.56, 0.71, 0.8, 1.3),),
    'head_faces': ((0.5, 0.66, 0.64, 0.74),),
    'intakes': ((-0.55, 0.55, 0.38, 0.5), (-0.44, 0.44, 0.58, 0.7)),
    'screens': ((1.2, 0.44, 0.74, 0.62),),
    'wipers': (-0.5, 0.06),
    'wiper_x': 1.18,
    'rails': ((-2.0, 0.05),),
}
ESTATE['stations'] = car_stations(-2.35, 2.35, ESTATE['axles'], ESTATE['arch'])


build_car('bil', HATCH)
build_car('bil-gra', ESTATE)
