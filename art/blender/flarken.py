"""Flarkenbadet's things that were built in code until now (src/content/aventyr2/buildings.ts): the diving tower on its
raft in the bay, the changing huts of round logs, one of them with the doorway and rail of the sliding door Elof rides,
and the small tarred hut among the birches.

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Each stands on
its origin, which is where the chapter puts it (src/content/aventyr2/chapters/flarken.ts), at the size the chapter gives
it in EL, with its front towards -Y, towards the camera. Where Elof walks on one of them, its top is exactly where his
ledge is: the tower's platform at 2.7 over its origin from x -2.65 to 2.35, with its ladder at x -2.9; a hut's roof at
2.9 where it crosses the play plane, 4.5 in front of the hut's origin, from x -3.1 to 3.1. No letters, numbers or marks.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)


def wanted(name):
    return ONLY is None or ONLY == name


def block(part, low, high, colour, seed=0.0, grain=0.06, top=0.06):
    """A sawn or pressed piece, each of its six faces its own tone, its top a little paler and its bottom darker."""
    corners = [put(part, Vector((x, y, z)), colour) for x in (low[0], high[0]) for y in (low[1], high[1]) for z in (low[2], high[2])]
    sides = ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))
    for i in range(6):
        made = face(part, [corners[k] for k in sides[i]])
        part['flat'][made] = lit(colour, 1.0 + grain * (rnd(seed, i) - 0.5) * 2.0 + (top if i == 5 else 0.0) - (0.12 if i == 4 else 0.0))


def beam(part, a, b, wide, deep, colour, up=None, seed=0.0, grain=0.05):
    """A square bar from a to b, `wide` across and `deep` the other way, its `deep` side towards `up`."""
    ahead = b - a
    ahead.normalize()
    lift = up if up is not None else Vector((0.0, 0.0, 1.0))
    if abs(ahead.dot(lift)) > 0.95:
        lift = Vector((0.0, -1.0, 0.0))
    side = ahead.cross(lift)
    side.normalize()
    over = side.cross(ahead)
    over.normalize()
    ends = []
    for at in (a, b):
        ring = []
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            ring.append(put(part, at + side * (sx * wide * 0.5) + over * (sy * deep * 0.5), colour))
        ends.append(ring)
    for j in range(4):
        k = (j + 1) % 4
        made = face(part, (ends[0][j], ends[0][k], ends[1][k], ends[1][j]))
        part['flat'][made] = lit(colour, 1.0 + grain * (rnd(seed, j) - 0.5) * 2.0)
    face(part, list(reversed(ends[0])), lit(colour, 0.9))
    face(part, ends[1], lit(colour, 0.9))


def rod(part, a, b, radius, colour, sides=8):
    """A round bar or tube from a to b: a rail, a rung, a pipe."""
    tube(part, [a, b], [radius, radius], [colour, colour], sides, twist=0.0)


def bend(part, points, radius, colour, sides=8):
    """A tube bent along a path of points: a handrail."""
    tube(part, points, [radius] * len(points), [colour] * len(points), sides, twist=0.0)


def prism(part, outline, depth, colour):
    """A flat shape standing in the plane of x = outline's x, `depth` thick towards +x: a gable's boards."""
    near = [put(part, Vector(p), colour) for p in outline]
    far = [put(part, Vector((p[0] + depth, p[1], p[2])), colour) for p in outline]
    face(part, near, lit(colour, 0.95))
    face(part, list(reversed(far)), lit(colour, 0.95))
    count = len(outline)
    for j in range(count):
        k = (j + 1) % count
        face(part, (near[k], near[j], far[j], far[k]), lit(colour, 0.85))


# --- the diving tower on its raft -------------------------------------------------------------------------------------
# A dark steel lattice on a square raft moored in the bay: four legs, crossed braces in two bays on every face, a deck
# of planks on top with a rail round its back and sides, cantilevered out over the water in front on knee braces, and a
# lower deck stepping down behind it with its own short ladder. A steel ladder up its front, at its left end, from the
# water past the jetty's end to the top, its stringers curving over into grab rails. No diving board. The raft is
# boards on a timber frame on black floats, old tyres hung on its front, its chains going down to its anchors.
# Its origin is the end of the jetty's deck (0.6 in the chapter); the lake lies 1.2 under it.

if wanted('hopptorn'):
    part = new_part()
    STEEL = tone('#3b4148')
    STEEL_DARK = tone('#2c3137')
    RUST = tone('#5a4234')
    GALV = tone('#9aa0a4')
    PLANK_GREY = tone('#8a7c66')
    FRAME = tone('#3e3328')
    FLOAT = tone('#1c1d1f')
    TYRE = tone('#18181a')
    CHAIN = tone('#4a4640')
    TOP = 2.7
    LEFT = -2.65
    RIGHT = 2.35
    FRONT = -3.78
    BACK = 2.45
    LADDER_X = -2.9
    LADDER_Y = -3.24
    WATER = -1.2
    RAFT = -0.95
    LEGS_X = (-2.35, 2.05)
    LEGS_Y = (-1.75, 2.15)
    MID = 0.8
    # The raft: a frame of dark wet timber round its edge, the floats under it at the waterline, and its boards.
    RX0, RX1, RY0, RY1 = -4.2, 3.7, -2.05, 5.2
    for y in (RY0, RY1 - 0.3):
        block(part, (RX0, y, RAFT - 0.28), (RX1, y + 0.3, RAFT - 0.04), FRAME, y, grain=0.08)
    for x in (RX0, RX1 - 0.3):
        block(part, (x, RY0 + 0.3, RAFT - 0.28), (x + 0.3, RY1 - 0.3, RAFT - 0.04), FRAME, x, grain=0.08)
    n = 0
    x = RX0 + 0.25
    while x < RX1 - 0.6:
        n += 1
        wide = 0.9 + 0.1 * rnd(n, 2.0)
        block(part, (x, RY0 + 0.32, WATER - 0.22), (min(x + wide, RX1 - 0.25), RY1 - 0.32, RAFT - 0.3), lit(FLOAT, 0.9 + 0.2 * rnd(n, 3.0)), n)
        x += wide + 0.08
    y = RY0 + 0.02
    n = 0
    while y < RY1 - 0.05:
        n += 1
        board = min(0.46, RY1 - 0.02 - y)
        block(part, (RX0 + 0.02, y, RAFT - 0.06), (RX1 - 0.02, y + board - 0.04, RAFT), lit(blend(PLANK_GREY, FRAME, 0.45), 0.85 + 0.25 * rnd(n, 4.0)), n, grain=0.1)
        y += board
    # Old tyres hung on its front as fenders.
    for x in (-3.2, 2.7):
        centre = Vector((x, RY0 - 0.12, RAFT - 0.3))
        ring_ = [centre + Vector((0.27 * math.cos(TAU * j / 12.0), 0.0, 0.27 * math.sin(TAU * j / 12.0))) for j in range(13)]
        bend(part, ring_, 0.1, TYRE, 6)
        rod(part, Vector((x, RY0 - 0.12, RAFT - 0.04)), Vector((x, RY0 - 0.12, RAFT - 0.3 + 0.27)), 0.02, CHAIN, 4)
    # Its chains, from its corners down to the anchors, sideways and back.
    for (cx, cy, dx, dy) in ((RX0 + 0.2, RY0 + 0.3, -1.0, 0.4), (RX1 - 0.2, RY0 + 0.3, 1.0, 0.4), (RX0 + 0.2, RY1 - 0.2, -0.8, 1.0), (RX1 - 0.2, RY1 - 0.2, 0.8, 1.0)):
        path = [Vector((cx, cy, RAFT - 0.1)), Vector((cx + dx * 0.7, cy + dy * 0.7, WATER - 0.4)), Vector((cx + dx * 1.8, cy + dy * 1.8, WATER - 2.4))]
        tube(part, path, [0.05, 0.05, 0.05], [CHAIN, CHAIN, lit(CHAIN, 0.6)], 5, twist=0.0)
    # The legs, from the raft's boards to under the deck, on their foot plates, a little rust where the water splashes.
    for lx in LEGS_X:
        for ly in LEGS_Y:
            block(part, (lx - 0.2, ly - 0.2, RAFT), (lx + 0.2, ly + 0.2, RAFT + 0.05), STEEL_DARK, lx + ly)
            beam(part, Vector((lx, ly, RAFT)), Vector((lx, ly, RAFT + 0.5)), 0.17, 0.17, blend(STEEL, RUST, 0.5), seed=lx)
            beam(part, Vector((lx, ly, RAFT + 0.5)), Vector((lx, ly, TOP - 0.2)), 0.17, 0.17, STEEL, seed=ly)
    # The lattice: a tie round each level, and crossed braces in each bay of each face, a plate where they cross.
    LEVELS = (RAFT + 0.1, MID, TOP - 0.24)
    sides_ = (((LEGS_X[0], LEGS_Y[0]), (LEGS_X[1], LEGS_Y[0])), ((LEGS_X[0], LEGS_Y[1]), (LEGS_X[1], LEGS_Y[1])),
              ((LEGS_X[0], LEGS_Y[0]), (LEGS_X[0], LEGS_Y[1])), ((LEGS_X[1], LEGS_Y[0]), (LEGS_X[1], LEGS_Y[1])))
    for (a2, b2) in sides_:
        out = Vector((b2[1] - a2[1], -(b2[0] - a2[0]), 0.0))
        out.normalize()
        if (out.x * (a2[0] + b2[0]) + out.y * (a2[1] + b2[1] - 0.4)) < 0.0:
            out = -out
        for z in LEVELS:
            beam(part, Vector((a2[0], a2[1], z)) + out * 0.02, Vector((b2[0], b2[1], z)) + out * 0.02, 0.1, 0.12, STEEL, up=out, seed=z)
        for k in range(2):
            z0 = LEVELS[k] + 0.06
            z1 = LEVELS[k + 1] - 0.06
            for (p, q) in (((a2[0], a2[1], z0), (b2[0], b2[1], z1)), ((a2[0], a2[1], z1), (b2[0], b2[1], z0))):
                beam(part, Vector(p) + out * 0.1, Vector(q) + out * 0.1, 0.1, 0.035, STEEL_DARK, up=out, seed=k)
            middle = (Vector((a2[0], a2[1], z0)) + Vector((b2[0], b2[1], z1))) * 0.5 + out * 0.13
            beam(part, middle - Vector((0.0, 0.0, 0.12)), middle + Vector((0.0, 0.0, 0.12)), 0.24, 0.03, STEEL_DARK, up=out)
    # The deck's bearers: along it over the legs and at its front edge, and out over the water on knee braces.
    for lx in LEGS_X:
        beam(part, Vector((lx, FRONT + 0.1, TOP - 0.17)), Vector((lx, BACK - 0.05, TOP - 0.17)), 0.12, 0.18, STEEL)
        beam(part, Vector((lx, LEGS_Y[0], TOP - 1.25)), Vector((lx, FRONT + 0.45, TOP - 0.26)), 0.09, 0.09, STEEL_DARK)
    for y in (FRONT + 0.12, LEGS_Y[0], LEGS_Y[1]):
        beam(part, Vector((LEFT + 0.05, y, TOP - 0.17)), Vector((RIGHT - 0.05, y, TOP - 0.17)), 0.12, 0.18, STEEL, seed=y)
    # Its planks, front to back, each its own grey of weathered wood, their ends showing along the front.
    n = 0
    x = LEFT
    while x < RIGHT - 0.05:
        n += 1
        wide = min(0.4, RIGHT - x)
        board_tone = lit(blend(PLANK_GREY, tone('#a08e74'), rnd(n, 5.0)), 0.85 + 0.22 * rnd(n, 6.0))
        block(part, (x + 0.015, FRONT, TOP - 0.08), (x + wide - 0.015, BACK, TOP), board_tone, n, grain=0.1)
        x += wide
    # The rail round its back and down its sides as far as the middle: galvanised tube, a post at each corner.
    RAIL = 1.55
    for (px, py) in ((LEFT + 0.1, BACK - 0.1), (-0.15, BACK - 0.1), (RIGHT - 0.1, BACK - 0.1), (LEFT + 0.1, -0.9), (RIGHT - 0.1, -0.9)):
        rod(part, Vector((px, py, TOP)), Vector((px, py, TOP + RAIL)), 0.06, GALV)
    for z in (TOP + RAIL, TOP + RAIL * 0.55):
        bend(part, [Vector((LEFT + 0.1, -0.9, z)), Vector((LEFT + 0.1, BACK - 0.1, z)), Vector((RIGHT - 0.1, BACK - 0.1, z)), Vector((RIGHT - 0.1, -0.9, z))], 0.05, GALV)
    # The lower deck, stepping down behind, on two more legs, with its rail, and a short ladder up from it.
    LOW = 1.25
    LY0, LY1 = LEGS_Y[1] - 0.15, 4.55
    for lx in LEGS_X:
        beam(part, Vector((lx, LY1 - 0.15, RAFT)), Vector((lx, LY1 - 0.15, LOW - 0.12)), 0.15, 0.15, STEEL, seed=lx + 7.0)
        beam(part, Vector((lx, LY0, LOW - 0.12)), Vector((lx, LY1, LOW - 0.12)), 0.1, 0.14, STEEL)
        beam(part, Vector((lx, LY1 - 0.15, RAFT + 0.15)), Vector((lx, LEGS_Y[1], LOW - 0.25)), 0.05, 0.1, STEEL_DARK, up=Vector((1.0, 0.0, 0.0)))
    n = 0
    y = LY0
    while y < LY1 - 0.05:
        n += 1
        block(part, (LEGS_X[0] - 0.2, y + 0.015, LOW - 0.07), (LEGS_X[1] + 0.2, y + 0.37, LOW), lit(PLANK_GREY, 0.82 + 0.2 * rnd(n, 7.0)), n + 30, grain=0.1)
        y += 0.385
    for lx in LEGS_X:
        rod(part, Vector((lx, LY1 - 0.1, LOW)), Vector((lx, LY1 - 0.1, LOW + RAIL * 0.9)), 0.05, GALV)
    bend(part, [Vector((LEGS_X[0], LY0 + 0.3, LOW + RAIL * 0.9)), Vector((LEGS_X[0], LY1 - 0.1, LOW + RAIL * 0.9)),
                Vector((LEGS_X[1], LY1 - 0.1, LOW + RAIL * 0.9)), Vector((LEGS_X[1], LY0 + 0.3, LOW + RAIL * 0.9))], 0.045, GALV)
    for sx in (0.95, 1.55):
        rod(part, Vector((sx, BACK + 0.05, TOP)), Vector((sx, BACK + 0.95, LOW)), 0.045, GALV)
    for k in range(1, 4):
        t = k / 4.0
        rod(part, Vector((0.95, BACK + 0.05 + 0.9 * t, TOP + (LOW - TOP) * t)), Vector((1.55, BACK + 0.05 + 0.9 * t, TOP + (LOW - TOP) * t)), 0.035, GALV, 6)
    # The ladder up its front, at its left end: two stringers from under the water to over the deck, where they curve
    # over into grab rails down onto it, and flat rungs between them. Brackets hold it to the front left leg.
    for sx in (-0.31, 0.31):
        x = LADDER_X + sx
        rail_path = [Vector((x, LADDER_Y, WATER - 0.9)), Vector((x, LADDER_Y, TOP + 0.55)),
                     Vector((x, LADDER_Y + 0.12, TOP + 0.85)), Vector((x, LADDER_Y + 0.42, TOP + 0.95)),
                     Vector((x, LADDER_Y + 0.72, TOP + 0.75)), Vector((x, LADDER_Y + 0.8, TOP + 0.35)), Vector((x, LADDER_Y + 0.8, TOP))]
        bend(part, rail_path, 0.055, GALV)
    z = 0.32
    while z < TOP - 0.1:
        block(part, (LADDER_X - 0.3, LADDER_Y - 0.06, z - 0.035), (LADDER_X + 0.3, LADDER_Y + 0.06, z + 0.035), lit(GALV, 0.9), z, grain=0.04)
        z += 0.6
    for z in (0.1, TOP - 0.35):
        beam(part, Vector((LADDER_X + 0.31, LADDER_Y, z)), Vector((LEGS_X[0], LEGS_Y[0], z)), 0.06, 0.06, STEEL_DARK)
    # The left grab rail comes down beside the deck's end: a bracket ties its foot and its bend to the end bearer.
    for (y, z) in ((LADDER_Y + 0.8, TOP - 0.05), (LADDER_Y + 0.3, TOP - 0.3)):
        beam(part, Vector((LADDER_X - 0.31, y, z)), Vector((LEFT + 0.08, y, z)), 0.05, 0.05, STEEL_DARK)
    beam(part, Vector((LEFT + 0.04, FRONT + 0.1, TOP - 0.17)), Vector((LEFT + 0.04, BACK - 0.05, TOP - 0.17)), 0.1, 0.18, STEEL)
    finish(part, 'hopptorn', sharp=40.0, strength=0.5, reach=0.6, leaf=True)


# --- the changing huts --------------------------------------------------------------------------------------------------
# Honey-brown round logs, each its own, crossing at the corners with their sawn ends showing, on stones; deep eaves under
# a pale grey-blue roof of standing-seam sheet metal, its ridge along the path, so that its front slope crosses the play
# plane where his ledge is; a plank door in a white casing with a Z of braces, strap hinges and a ring handle; a small
# window in a white frame with a cross of bars. The second hut has its open doorway and the iron rail its old door slides
# on (the door is the game's own, a part that moves: src/content/aventyr2/render.ts, 'hut-door'); the tarred hut is dark.

HONEY = (tone('#b98a4e'), tone('#a97a42'), tone('#c49658'))
HONEY_END = (tone('#d9b57e'), tone('#cfa86e'), tone('#e0bf8a'))
TARRED = (tone('#2a2522'), tone('#231f1c'), tone('#302a26'))
TARRED_END = (tone('#4a3e34'), tone('#463a30'), tone('#52443a'))
ROOF_TIN = tone('#7a8c9a')
TRIM = tone('#e9e5da')
IRON = tone('#1d1d1f')
STONE_ = tone('#6e6c66')


def log(part, a, b, radius, colour, n, sides=8, every=1.1, ends=(None, None)):
    """A round log from a to b, a little out of round and uneven along it, in pieces along it so that the shade baked on
    it can change along it. `ends` gives each sawn end's colour, or None to leave that end open: (at a, at b). A sawn end
    is a disc, its heart a little darker and its rim weathered to the log's own tone; one that faces the camera has its
    corners marked for the game to draw its rings and cracks (src/render/firewood.ts)."""
    ahead = b - a
    length = ahead.length
    ahead.normalize()
    side = ahead.cross(Vector((0.0, 0.0, 1.0)))
    side.normalize()
    over = side.cross(ahead)
    pieces = max(1, int(round(length / every)))
    rings = []
    tones_ = []
    for i in range(pieces + 1):
        t = i / pieces
        centre = a + ahead * (length * t)
        ring = []
        for j in range(sides):
            angle = TAU * j / sides
            wide = radius * (1.0 + 0.06 * (noise(math.cos(angle) * 1.4 + n, math.sin(angle) * 1.4, t * 3.0 + n * 0.37) - 0.5))
            ring.append(centre + side * (wide * math.cos(angle)) + over * (wide * math.sin(angle)))
        rings.append(ring)
        tones_.append(lit(colour, 0.92 + 0.14 * noise(t * 4.0 + n, n * 1.7, 0.5)))
    made = skin(part, rings, tones_)
    for k in (0, len(made) - 1):
        end = ends[0] if k == 0 else ends[1]
        if end is None:
            continue
        rim = made[k]
        middle = sum((v.co for v in rim), Vector()) / len(rim)
        heart = put(part, middle, lit(end, 0.84))
        inner = [put(part, middle + (v.co - middle) * 0.8, end) for v in rim]
        count = len(rim)
        facing = -ahead if k == 0 else ahead
        for j in range(count):
            q = (j + 1) % count
            for verts in ((rim[j], rim[q], inner[q], inner[j]), (inner[j], inner[q], heart)):
                cap = face(part, verts if k == 0 else list(reversed(verts)))
                if facing.y < -0.9:
                    part['wood'][cap] = (1.0 + radius * 0.5, middle, radius, Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)))
                    part['stuff'][cap] = 'kit-wood'
    return made


def roof_at(ridge, slope, y):
    """The height of a hut's roof over y: its ridge over y 0, falling `slope` for each EL out to either eave."""
    return ridge - abs(y) * slope


def log_hut(name, wide, deep, walk, cross_y, eave_y, edge, pitch, tar, door, opening, window, radius, course, sides, every=1.1):
    """A changing hut of round logs. `wide` and `deep` are its walls' from log middle to log middle. Its roof is `walk`
    high over `cross_y` (the play plane, for a hut he walks on), runs out to `eave_y` in front and to `edge` at each end.
    `door` is 'door', 'slider' or None, `opening` its width and height; `window` is its middle and size (x, z, scale),
    or None."""
    part = new_part()
    logs = TARRED if tar else HONEY
    ends = TARRED_END if tar else HONEY_END
    W = wide * 0.5
    D = deep * 0.5
    T = math.tan(math.radians(pitch))
    RIDGE = walk + abs(cross_y) * T
    face_y = -D - radius
    top = roof_at(RIDGE, T, face_y) - 0.14
    dw = opening[0]
    dh = opening[1]
    window_x = window[0] if window else None
    wz = window[1] if window else 0.0
    ws = window[2] if window else 1.0
    # The stones it stands on, under each corner and the middle of each wall.
    for (sx, sy) in ((-W, -D), (W, -D), (-W, D), (W, D), (0.0, D), (-W, 0.0), (W, 0.0)):
        lump(part, Vector((sx, sy, 0.03)), (radius * 1.7, radius * 1.4, 0.14), 1, lit(STONE_, 0.85 + 0.25 * rnd(sx, sy)))
    # The front and back walls lie at heights 0, 1, 2 of a course, the side walls half a course over them, as the logs
    # cross at the corners in their notches; each log runs out past the corner, its sawn end showing.
    n = 0
    k = 0
    reach = W + radius * 1.5
    while True:
        z = radius + 0.05 + k * course
        if z + radius > top + 0.05:
            break
        for y in (-D, D):
            n += 1
            colour = logs[n % 3]
            end = lit(ends[n % 3], 0.92)
            if y > 0:
                log(part, Vector((-reach, y, z)), Vector((reach, y, z)), radius, colour, n, sides=6, every=99.0)
                continue
            # The front wall is cut where the door and the window are: a log from each cut to the next.
            cuts = []
            if door and z - radius < dh + 0.02:
                cuts.append((-dw * 0.5 - 0.12, dw * 0.5 + 0.12))
            if window_x is not None and abs(z - wz) < 0.43 * ws + 0.02:
                cuts.append((window_x - 0.5 * ws, window_x + 0.5 * ws))
            cuts.sort()
            starts = [-reach] + [c[1] for c in cuts]
            stops = [c[0] for c in cuts] + [reach]
            for i in range(len(starts)):
                if stops[i] - starts[i] < 0.2:
                    continue
                log(part, Vector((starts[i], y, z)), Vector((stops[i], y, z)), radius, colour, n + 0.3 * i, sides=sides, every=every,
                    ends=(end if i == 0 else None, end if i == len(starts) - 1 else None))
        zs = z + course * 0.5
        if zs + radius < roof_at(RIDGE, T, -D) - 0.12:
            for x in (-W, W):
                n += 1
                log(part, Vector((x, -D - radius * 1.5, zs)), Vector((x, D + radius * 1.5, zs)), radius, logs[(n + 1) % 3], n,
                    sides=sides + 2, every=every * 1.6, ends=(ends[(n + k) % 3], None))
        k += 1
    # The gables over the side walls, boarded, up under the roof.
    foot = radius + 0.05 + (k - 1) * course
    for x in (-W - 0.06, W - 0.06):
        prism(part, [(x, -D, foot), (x, D, foot), (x, D, roof_at(RIDGE, T, D) - 0.1), (x, 0.0, RIDGE - 0.1), (x, -D, roof_at(RIDGE, T, -D) - 0.1)],
              0.12, lit(logs[1], 0.8))
    # Inside, dark: behind the logs' gaps, the doorway and the window.
    block(part, (-W + 0.08, -D + 0.05, 0.0), (W - 0.08, D - 0.05, top), tone('#0c0a08') if tar else tone('#120c07'), 1.0, grain=0.0)
    # The roof: sheet metal on battens, from each eave to the ridge, overhanging the gables, a hand thick; a seam
    # standing up every half EL down the front slope; a ridge cap, a fascia along each eave and barge boards up the ends.
    columns = int(round(edge * 2.0 / 0.5))
    rows = 4
    for sign in (-1.0, 1.0):
        grid_top = []
        grid_under = []
        for i in range(columns + 1):
            x = -edge + 2.0 * edge * i / columns
            line_top = []
            line_under = []
            for j in range(rows + 1):
                y = sign * abs(eave_y) * (1.0 - j / rows)
                z = roof_at(RIDGE, T, y)
                strip_tone = lit(ROOF_TIN, 0.94 + 0.1 * rnd(i, sign))
                line_top.append(put(part, Vector((x, y, z)), strip_tone))
                line_under.append(put(part, Vector((x, y, z - 0.12)), lit(ROOF_TIN, 0.42)))
            grid_top.append(line_top)
            grid_under.append(line_under)
        for i in range(columns):
            for j in range(rows):
                quad = [grid_top[i][j], grid_top[i + 1][j], grid_top[i + 1][j + 1], grid_top[i][j + 1]]
                face(part, quad if sign < 0 else list(reversed(quad)))
                quad = [grid_under[i][j], grid_under[i][j + 1], grid_under[i + 1][j + 1], grid_under[i + 1][j]]
                face(part, quad if sign < 0 else list(reversed(quad)))
        # Its four edges, closing the sheet.
        for i in range(columns):
            for j in (0, rows):
                quad = [grid_top[i][j], grid_under[i][j], grid_under[i + 1][j], grid_top[i + 1][j]]
                face(part, quad if (j == 0) == (sign < 0) else list(reversed(quad)), lit(ROOF_TIN, 0.7))
        for i in (0, columns):
            for j in range(rows):
                quad = [grid_top[i][j], grid_top[i][j + 1], grid_under[i][j + 1], grid_under[i][j]]
                face(part, quad if (i == 0) == (sign < 0) else list(reversed(quad)), lit(ROOF_TIN, 0.7))
        ye = sign * abs(eave_y)
        if sign < 0:
            for i in range(1, columns):
                x = -edge + 2.0 * edge * i / columns
                beam(part, Vector((x, ye + 0.02, roof_at(RIDGE, T, ye) + 0.02)), Vector((x, -0.15, roof_at(RIDGE, T, -0.15) + 0.02)), 0.035, 0.05, lit(ROOF_TIN, 1.14))
        block(part, (-edge - 0.04, ye - 0.06 if sign < 0 else ye - 0.01, roof_at(RIDGE, T, ye) - 0.24),
              (edge + 0.04, ye + 0.01 if sign < 0 else ye + 0.06, roof_at(RIDGE, T, ye) + 0.01), lit(ROOF_TIN, 0.8), sign, grain=0.03)
        for x in (-edge - 0.03, edge + 0.03):
            beam(part, Vector((x, ye, roof_at(RIDGE, T, ye) - 0.1)), Vector((x, 0.0, RIDGE - 0.1)), 0.2, 0.06, lit(ROOF_TIN, 0.78), up=Vector((1.0, 0.0, 0.0)))
    beam(part, Vector((-edge - 0.05, 0.0, RIDGE + 0.03)), Vector((edge + 0.05, 0.0, RIDGE + 0.03)), 0.36, 0.08, lit(ROOF_TIN, 1.06))
    # Its door, or its open doorway with the rail; the white casing and the worn sill.
    door_y = face_y - 0.02
    if door:
        block(part, (-dw * 0.5 - 0.2, door_y - 0.12, 0.0), (-dw * 0.5, face_y + 0.2, dh + 0.2), TRIM, 1.0, grain=0.03)
        block(part, (dw * 0.5, door_y - 0.12, 0.0), (dw * 0.5 + 0.2, face_y + 0.2, dh + 0.2), TRIM, 2.0, grain=0.03)
        block(part, (-dw * 0.5 - 0.3, door_y - 0.14, dh), (dw * 0.5 + 0.3, face_y + 0.2, dh + 0.22), TRIM, 3.0, grain=0.03)
        block(part, (-dw * 0.5 - 0.25, door_y - 0.42, 0.0), (dw * 0.5 + 0.25, face_y + 0.2, 0.12), tone('#5b5650') if tar else tone('#a58a66'), 4.0, grain=0.08)
    if door == 'door':
        plank_tones = (tone('#4a3a2c'), tone('#41332a'), tone('#524233')) if tar else (tone('#7a5532'), tone('#6c4a2a'), tone('#835c37'), tone('#71502d'))
        dy = face_y + 0.06
        block(part, (-dw * 0.5, dy, 0.12), (dw * 0.5, dy + 0.3, dh), tone('#20160d'), 9.0, grain=0.0)
        planks = 5
        for i in range(planks):
            x0 = -dw * 0.5 + i * dw / planks
            block(part, (x0 + 0.025, dy - 0.14, 0.12), (x0 + dw / planks - 0.025, dy, dh - 0.02), plank_tones[i % len(plank_tones)], i, grain=0.08)
        brace = tone('#5a4836') if tar else tone('#8c6640')
        for z in (dh * 0.17, dh * 0.83):
            block(part, (-dw * 0.5 + 0.07, dy - 0.22, z - 0.11), (dw * 0.5 - 0.07, dy - 0.14, z + 0.11), brace, z, grain=0.06)
        beam(part, Vector((-dw * 0.5 + 0.22, dy - 0.18, dh * 0.17 + 0.08)), Vector((dw * 0.5 - 0.22, dy - 0.18, dh * 0.83 - 0.08)), 0.18, 0.08, brace, up=Vector((0.0, -1.0, 0.0)))
        for z in (dh * 0.17, dh * 0.83):
            block(part, (-dw * 0.5 - 0.02, dy - 0.26, z - 0.04), (-dw * 0.5 + dw * 0.42, dy - 0.22, z + 0.04), IRON, z, grain=0.0)
        block(part, (dw * 0.5 - 0.33, dy - 0.26, dh * 0.5 - 0.15), (dw * 0.5 - 0.19, dy - 0.22, dh * 0.5 + 0.15), IRON, 5.0, grain=0.0)
        handle = [Vector((dw * 0.5 - 0.26 + 0.1 * math.sin(TAU * j / 10.0), dy - 0.28, dh * 0.5 - 0.1 - 0.1 * math.cos(TAU * j / 10.0))) for j in range(11)]
        bend(part, handle, 0.022, IRON, 5)
    elif door == 'slider':
        # The doorway: the dark inside, a bench along its back wall and a hook board.
        block(part, (-dw * 0.5, face_y, 0.0), (dw * 0.5, face_y + 0.3, dh), tone('#0d0905'), 9.0, grain=0.0)
        block(part, (-dw * 0.45, face_y + 0.32, dh * 0.24 - 0.06), (dw * 0.45, face_y + 0.7, dh * 0.24 + 0.06), tone('#3a2a1a'), 6.0)
        block(part, (-dw * 0.35, face_y + 0.6, dh * 0.72 - 0.05), (dw * 0.35, face_y + 0.68, dh * 0.72 + 0.05), tone('#3a2a1a'), 7.0)
        # The rail, on brackets into the logs, from the doorway's left to a stop past the hut's right corner, rising as the
        # door does on it: the door's top at 1.85 shut and 0.4 higher open (DOOR in flarken.ts), the rail 0.16 over it.
        x_from = -dw * 0.5 - 0.2
        x_to = min(W + 0.35, dw * 1.5 + 0.25)
        rail_y = -4.42
        lift_from = 1.85 + 0.16 + 0.4 * x_from / dw
        lift_to = 1.85 + 0.16 + 0.4 * x_to / dw
        beam(part, Vector((x_from, rail_y, lift_from)), Vector((x_to, rail_y, lift_to)), 0.09, 0.09, tone('#2a2a2c'))
        for x in (x_from + 0.1, (x_from + x_to) * 0.5, x_to - 0.1):
            z = 1.85 + 0.16 + 0.4 * x / dw
            block(part, (x - 0.05, rail_y - 0.02, z - 0.09), (x + 0.05, face_y + 0.05, z + 0.13), tone('#232325'), x, grain=0.0)
        for x in (x_from + 0.02, x_to - 0.02):
            z = 1.85 + 0.16 + 0.4 * x / dw
            block(part, (x - 0.06, rail_y - 0.08, z - 0.1), (x + 0.06, rail_y + 0.08, z + 0.1), tone('#151515'), x, grain=0.0)
    # The window: a white frame standing out from the logs, a cross of bars, the glass back in the dark, and a sill.
    if window_x is not None:
        wy = face_y - 0.04
        block(part, (window_x - 0.4 * ws, wy + 0.03, wz - 0.33 * ws), (window_x + 0.4 * ws, wy + 0.06, wz + 0.33 * ws), tone('#1a2230'), 8.0, grain=0.0, top=0.0)
        for (x0, z0, x1, z1) in ((-0.5, 0.31, 0.5, 0.43), (-0.5, -0.43, 0.5, -0.31), (-0.5, -0.31, -0.38, 0.31), (0.38, -0.31, 0.5, 0.31)):
            block(part, (window_x + x0 * ws, wy - 0.1, wz + z0 * ws), (window_x + x1 * ws, wy + 0.3, wz + z1 * ws), TRIM, x0 + z0, grain=0.03)
        block(part, (window_x - 0.03 * ws, wy - 0.06, wz - 0.31 * ws), (window_x + 0.03 * ws, wy + 0.04, wz + 0.31 * ws), TRIM, 1.0, grain=0.0)
        block(part, (window_x - 0.38 * ws, wy - 0.06, wz - 0.03 * ws), (window_x + 0.38 * ws, wy + 0.04, wz + 0.03 * ws), TRIM, 2.0, grain=0.0)
        block(part, (window_x - 0.56 * ws, wy - 0.22, wz - 0.5 * ws), (window_x + 0.56 * ws, wy + 0.04, wz - 0.42 * ws), lit(TRIM, 0.9), 3.0, grain=0.0)
    return finish(part, name, sharp=50.0, strength=0.6, reach=0.7, floor=0.0, leaf=True)


# The two by the path: 5.8 wide between their corners' logs, their roofs 2.9 high where they cross the play plane
# (ROOFS in flarken.ts), out to 3.15 each side, past the ledge's 3.1.
if wanted('hydda'):
    log_hut('hydda', 5.8, 7.4, 2.9, -4.5, -4.86, 3.15, 18.0, False, 'door', (2.09, 2.03), (1.86, 1.74, 1.0), 0.16, 0.29, 8)

if wanted('hydda-skjutdorr'):
    log_hut('hydda-skjutdorr', 5.8, 7.4, 2.9, -4.5, -4.86, 3.15, 18.0, False, 'slider', (2.09, 2.03), (-1.86, 1.74, 1.0), 0.16, 0.29, 8)

# The tarred one back among the birches, 9 wide, its eaves 10 high (the chapter's numbers), steeper, with bigger logs,
# its door and window as big for it as the others' are for them.
if wanted('hydda-tjarad'):
    log_hut('hydda-tjarad', 8.4, 7.0, 10.0, -3.85, -4.9, 5.0, 28.0, True, 'door', (3.24, 7.0), (2.88, 6.0, 1.8), 0.3, 0.55, 6, every=3.0)
