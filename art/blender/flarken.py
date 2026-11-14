"""Flarkenbadet's things that were built in code until now (src/content/aventyr2/buildings.ts): the diving tower on its
raft in the bay, the changing huts of round logs, one of them with the doorway and rail of the sliding door Elof rides,
and the small tarred hut among the birches.

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Each stands on
its origin, which is where the chapter puts it (src/content/aventyr2/chapters/flarken.ts), at the size the chapter gives
it in EL, with its front towards -Y, towards the camera. Where Elof walks on one of them, its top is exactly where his
ledge is: the tower's platform at 2.7 over its origin from x -2.65 to 2.35, with its ladder at x -2.9; a hut's roof at
2.9 where it crosses the play plane, 4.5 in front of the hut's origin, from x -3.1 to 3.1. No letters, numbers or marks,
but the place's own name on the sun board (Olov's decision, 9 November 2026).
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


def grid_slab(part, x0, x1, y0, y1, n, m, top, bottom, points, faces_, side):
    """A closed slab from `bottom` to `top` whose top is a grid of n by m faces: `points` gives the colour of each of its
    top corners ([i][j], or None), `faces_` the colour of each of its top faces ([i][j], or None), `side` its sides'."""
    grid = [[put(part, Vector((x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * j / m, top)), points[i][j] if points else side) for j in range(m + 1)] for i in range(n + 1)]
    for i in range(n):
        for j in range(m):
            made = face(part, (grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]))
            if faces_:
                part['flat'][made] = faces_[i][j]
    rim = [grid[i][0] for i in range(n + 1)] + [grid[n][j] for j in range(1, m + 1)] + [grid[i][m] for i in range(n - 1, -1, -1)] + [grid[0][j] for j in range(m - 1, 0, -1)]
    low = [put(part, Vector((v.co.x, v.co.y, bottom)), lit(side, 0.8)) for v in rim]
    for k in range(len(rim)):
        q = (k + 1) % len(rim)
        made = face(part, (rim[q], rim[k], low[k], low[q]))
        part['flat'][made] = side
    face(part, low, lit(side, 0.6))


def plate(part, outline, y0, y1, colour):
    """A flat shape standing in the picture's plane, from `y0` in front to `y1` behind: `outline` is its corners (x, z),
    round it anticlockwise as the camera sees it."""
    near = [put(part, Vector((x, y0, z)), colour) for (x, z) in outline]
    far = [put(part, Vector((x, y1, z)), colour) for (x, z) in outline]
    made = face(part, near)
    part['flat'][made] = colour
    made = face(part, list(reversed(far)))
    part['flat'][made] = lit(colour, 0.8)
    count = len(outline)
    for j in range(count):
        k = (j + 1) % count
        made = face(part, (near[k], near[j], far[j], far[k]))
        part['flat'][made] = lit(colour, 0.85)


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
    # Round a log lying down, its sides from up; round a post standing up, from the camera's way.
    side = ahead.cross(Vector((0.0, 0.0, 1.0)) if abs(ahead.z) < 0.9 else Vector((0.0, -1.0, 0.0)))
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


# --- the giant chess -----------------------------------------------------------------------------------------------------
# On its gravel pad behind the huts: a board of black and white squares, worn paler where feet have stood, and a few big
# pieces standing as the game was left, one pawn blown over by the storm onto the gravel. Plain turned shapes, each
# piece the colour against its square; the king has a plain knob, not a cross. 16 wide, as the chapter has it.

PIECE_LIGHT = tone('#e6e2d6')
PIECE_DARK = tone('#26282c')
# Turned profiles, (radius, height) from the foot up, for each kind of piece.
PAWN = ((0.0, 0.0), (0.56, 0.0), (0.56, 0.12), (0.46, 0.2), (0.34, 0.34), (0.24, 0.62), (0.2, 0.9), (0.36, 0.98), (0.36, 1.06),
        (0.2, 1.1), (0.27, 1.18), (0.32, 1.32), (0.27, 1.48), (0.14, 1.58), (0.0, 1.62))
ROOK = ((0.0, 0.0), (0.64, 0.0), (0.64, 0.14), (0.52, 0.24), (0.44, 0.4), (0.38, 1.2), (0.42, 1.6), (0.5, 1.72), (0.5, 1.95),
        (0.36, 1.95), (0.36, 1.85), (0.0, 1.85))
BISHOP = ((0.0, 0.0), (0.6, 0.0), (0.6, 0.13), (0.48, 0.24), (0.36, 0.42), (0.24, 1.3), (0.4, 1.4), (0.4, 1.48), (0.22, 1.54),
          (0.3, 1.72), (0.34, 1.98), (0.26, 2.22), (0.12, 2.36), (0.12, 2.42), (0.15, 2.5), (0.0, 2.62))
QUEEN = ((0.0, 0.0), (0.66, 0.0), (0.66, 0.14), (0.52, 0.26), (0.38, 0.46), (0.26, 1.6), (0.44, 1.72), (0.44, 1.8), (0.28, 1.86),
         (0.34, 2.2), (0.48, 2.5), (0.44, 2.56), (0.26, 2.6), (0.2, 2.68), (0.0, 2.72))
KING = ((0.0, 0.0), (0.68, 0.0), (0.68, 0.14), (0.54, 0.26), (0.4, 0.46), (0.28, 1.7), (0.46, 1.82), (0.46, 1.9), (0.3, 1.96),
        (0.36, 2.3), (0.5, 2.58), (0.36, 2.66), (0.2, 2.72), (0.24, 2.84), (0.2, 2.98), (0.0, 3.04))
KNIGHT_FOOT = ((0.0, 0.0), (0.62, 0.0), (0.62, 0.14), (0.5, 0.24), (0.4, 0.42), (0.36, 0.7), (0.0, 0.72))


def piece(part, shape, x, y, z, colour, turn=None):
    """A big chess piece turned from its profile, standing at (x, y) on a board whose top is at z, or lying as `turn` lays it."""
    matrix = Matrix.Translation(Vector((x, y, z)))
    if turn is not None:
        matrix = matrix @ turn
    tones_ = [lit(colour, 0.94 + 0.08 * (h / 3.0)) for (_, h) in shape]
    lathe(part, shape, 16, matrix, tones_)


def square_at(i, j, size, cell):
    """The middle of a square of the board, counted from its left and from its far side as the stand-in counted them."""
    return (-size * 0.5 + (i + 0.5) * cell, size * 0.5 - (j + 0.5) * cell)


if wanted('schack'):
    part = new_part()
    GRAVEL = tone('#8a8478')
    SIZE = 16.0
    CELL = SIZE / 8.0
    PAD = SIZE * 0.5 + 0.8
    TOP = 0.26
    # The gravel pad: a slab whose top is a grid, so that its tone can wander and the pieces' shade fall on it.
    N = 12
    gravel = [[lit(GRAVEL, 0.86 + 0.24 * noise(i * 1.3, j * 1.3, 3.0)) for j in range(N + 1)] for i in range(N + 1)]
    grid_slab(part, -PAD, PAD, -PAD, PAD, N, N, 0.16, -0.05, gravel, None, lit(GRAVEL, 0.8))
    # The board: its squares, each in its own tone, the dark ones worn paler in the middle where feet have stood.
    squares = []
    for i in range(8):
        row = []
        for j in range(8):
            worn = max(0.0, 1.0 - math.hypot(i - 3.5, j - 3.5) / 4.0)
            if (i + (7 - j)) % 2 == 1:
                row.append(lit(blend(PIECE_LIGHT, tone('#c8c2b4'), 0.3 + 0.4 * rnd(j, i)), 0.95 + 0.05 * rnd(i + 3.0, j)))
            else:
                row.append(lit(blend(PIECE_DARK, tone('#3a3c40'), worn * 0.8), 0.92 + 0.1 * rnd(i, j)))
        squares.append(row)
    grid_slab(part, -SIZE * 0.5, SIZE * 0.5, -SIZE * 0.5, SIZE * 0.5, 8, 8, TOP, 0.1, None, squares, lit(PIECE_DARK, 0.8))
    # The pieces where the chapter's stand-in had them, each against its square, and a bishop and a pawn more.
    placed = ((1, 1, ROOK), (2, 5, PAWN), (4, 2, QUEEN), (6, 6, PAWN), (3, 6, KING), (6, 2, BISHOP), (1, 6, PAWN))
    for (i, j, shape) in placed:
        x, y = square_at(i, j, SIZE, CELL)
        colour = PIECE_DARK if (i + j) % 2 else PIECE_LIGHT
        piece(part, shape, x, y, TOP, colour)
        if shape is ROOK:
            for k in range(4):
                a = TAU * (k + 0.5) / 4.0
                cx = x + 0.4 * math.cos(a)
                cy = y + 0.4 * math.sin(a)
                block(part, (cx - 0.14, cy - 0.14, TOP + 1.85), (cx + 0.14, cy + 0.14, TOP + 2.2), colour, k, grain=0.03)
        if shape is QUEEN:
            for k in range(7):
                a = TAU * k / 7.0
                lump(part, Vector((x + 0.42 * math.cos(a), y + 0.42 * math.sin(a), TOP + 2.6)), (0.09, 0.09, 0.09), 1, colour)
    # The knight: a turned foot, and a horse's head of blocks, its neck leaning, its muzzle down towards the board.
    x, y = square_at(5, 4, SIZE, CELL)
    colour = PIECE_DARK if (5 + 4) % 2 else PIECE_LIGHT
    piece(part, KNIGHT_FOOT, x, y, TOP, colour)
    beam(part, Vector((x + 0.12, y, TOP + 0.6)), Vector((x - 0.05, y, TOP + 1.9)), 0.5, 0.66, colour, up=Vector((0.0, -1.0, 0.0)))
    beam(part, Vector((x - 0.05, y, TOP + 1.72)), Vector((x - 0.72, y, TOP + 1.38)), 0.38, 0.44, colour, up=Vector((0.0, -1.0, 0.0)))
    beam(part, Vector((x + 0.2, y, TOP + 1.4)), Vector((x + 0.32, y, TOP + 0.75)), 0.24, 0.5, lit(colour, 0.92), up=Vector((0.0, -1.0, 0.0)))
    for side in (-0.14, 0.14):
        beam(part, Vector((x + 0.02, y + side, TOP + 1.86)), Vector((x + 0.08, y + side, TOP + 2.18)), 0.1, 0.08, colour)
    # A white pawn blown over onto the gravel in front of the board.
    piece(part, PAWN, 3.6, -SIZE * 0.5 - 0.45, 0.16 + 0.5, PIECE_LIGHT, turn=Matrix.Rotation(math.radians(96.0), 4, 'Y') @ Matrix.Rotation(0.4, 4, 'X'))
    finish(part, 'schack', sharp=60.0, strength=0.55, reach=0.8, floor=0.0, leaf=True)


# --- the painted board with the smiling sun -----------------------------------------------------------------------------------
# The bathing place's board, hand-painted: a pale sky, the dark ridge across the lake, the lake with its ripples painted
# in, and a smiling sun of wood fixed on it, its rays cut out round it. Across the lake the place's name in white letters,
# Flarken with its a-umlaut (Olov's decision, 9 November 2026: the second exception to the game's rule of no lettering,
# after the name Olympia on the red hall), in the game's own Playpen Sans; no other word, letter or mark. A frame of
# rough boards, two peeled posts behind it and a little roof of boards over it. 13 wide and 8.5 high, its foot 3 up: low
# enough that the name is in the picture on a phone held sideways, where the camera looks down onto the water.
#
# It stands in the ground (Olov, 14 November 2026: the board "ser ut att svava i luften i stallet for att vara forankrad
# i marken"). The chapter has it out in the shallows behind the beach stones, lifted so that its name is over the high
# stone, and its posts ended in the air over the lake. Now it has an islet of its own under it, a hump of the shore
# with worn grass on it and sand and stones at its waterline, which its posts go well down into, with stones heaped
# round their feet; and it is braced as a board this big in the wind has to be: a rail under it, two braces up from the
# posts' feet, a stay out from each post and one back. The chapter puts its origin 2.3 over its ground at 10/13 of its
# size (src/content/aventyr2/chapters/flarken.ts), so the lake lies SIGN_LAKE under its origin, and the islet's top is
# SIGN_GROUND under it: a little over the water.

SIGN_LOW = 3.0
SIGN_GROUND = -2.7
SIGN_LAKE = -3.8

if wanted('solskylt'):
    part = new_part()
    W = 6.5
    LOW = SIGN_LOW
    HIGH = LOW + 8.5
    FRAME_WOOD = tone('#6a4a2c')
    POST = tone('#7a6450')
    SKY = tone('#b8d0dc')
    SKY_LOW = tone('#d6e2e2')
    RIDGE = tone('#3a5a40')
    LAKE = tone('#3f6a8a')
    LAKE_PALE = tone('#6f94ac')
    SUN = tone('#d9a84e')
    FACE_ = tone('#3a2a1c')
    FRONT = -0.2
    # Its two posts behind it, peeled and grey, down into the islet's ground, and the boards of its back.
    POST_X = W - 0.6
    for x in (-POST_X, POST_X):
        log(part, Vector((x, 0.32, SIGN_GROUND - 0.9)), Vector((x, 0.32, HIGH + 0.9)), 0.34, POST, x, sides=10, every=1.5, ends=(None, lit(POST, 1.1)))
    # Its bracing: a rail between the posts under the board, two braces from the posts' feet up to the rail's middle, a
    # stay from each post out to the ground beside it, and one back from it.
    BRACE = tone('#6f5a44')
    TOWARDS = Vector((0.0, -1.0, 0.0))
    beam(part, Vector((-POST_X - 0.5, 0.02, LOW - 0.85)), Vector((POST_X + 0.5, 0.02, LOW - 0.85)), 0.34, 0.14, BRACE, up=TOWARDS, seed=1.0)
    for side in (-1.0, 1.0):
        beam(part, Vector((side * POST_X, -0.04, SIGN_GROUND + 0.35)), Vector((side * 0.25, -0.04, LOW - 0.95)), 0.26, 0.1,
             lit(BRACE, 0.94 + 0.1 * side), up=TOWARDS, seed=2.0 + side)
        beam(part, Vector((side * POST_X, 0.32, LOW - 1.3)), Vector((side * (POST_X + 2.0), 0.32, SIGN_GROUND - 0.4)), 0.24, 0.24,
             lit(BRACE, 0.9), up=TOWARDS, seed=4.0 + side)
        beam(part, Vector((side * POST_X, 0.6, LOW - 0.2)), Vector((side * POST_X, 3.0, SIGN_GROUND - 0.5)), 0.22, 0.22, lit(BRACE, 0.8), seed=6.0 + side)
    # The islet it stands on: a low hump out of the lake, closed underneath, its top worn grass, drier in patches and
    # trodden to earth round the posts, its shore sand, wet and dark at the waterline, and mud under the water.
    GRASS = tone('#6c7a40')
    GRASS_DRY = tone('#8c8648')
    EARTH = tone('#5c5038')
    SAND_ = tone('#b7a57e')
    SAND_WET = tone('#6c6450')
    MUD = tone('#34352f')
    ISLET_A = 8.8
    ISLET_B = 3.1
    ISLET_Y = 0.5
    AROUND = 48
    OUT = (0.18, 0.36, 0.54, 0.7, 0.82, 0.92, 1.0, 1.1, 1.26)

    def islet_edge(a):
        return 1.0 + 0.07 * math.sin(3.0 * a + 0.6) + 0.05 * math.sin(5.0 * a + 2.1) + 0.03 * math.sin(9.0 * a)

    def islet_top(x, y):
        """How high the islet's top is at a place on it, and how far out towards its shore that is (0 to 1)."""
        a = math.atan2((y - ISLET_Y) / ISLET_B, x / ISLET_A)
        out = math.sqrt((x / ISLET_A) ** 2 + ((y - ISLET_Y) / ISLET_B) ** 2) / islet_edge(a)
        high = SIGN_LAKE + 0.14 + (SIGN_GROUND - SIGN_LAKE - 0.14) * (1.0 - min(1.0, out) ** 2.4)
        return (high + 0.14 * (noise(x * 0.6, y * 0.6, 1.0) - 0.5) * max(0.0, 1.0 - out), out)

    rings = []
    tones_ = []
    for out in OUT:
        ring = []
        shades = []
        for j in range(AROUND):
            a = TAU * j / AROUND
            x = ISLET_A * out * math.cos(a) * islet_edge(a)
            y = ISLET_Y + ISLET_B * out * math.sin(a) * islet_edge(a)
            if out <= 1.0:
                z = islet_top(x, y)[0]
            else:
                z = SIGN_LAKE - (0.3 if out < 1.2 else 1.0)
            grass = blend(GRASS, GRASS_DRY, noise(x * 0.5, y * 0.5, 3.0) * 1.3 - 0.1)
            near_post = min(math.hypot(x - POST_X, y - 0.32), math.hypot(x + POST_X, y - 0.32))
            grass = blend(EARTH, grass, (near_post - 0.5) / 1.2)
            if out < 0.6:
                colour = grass
            elif out < 0.86:
                colour = blend(grass, SAND_, (out - 0.6) / 0.26 + 0.25 * (noise(x, y, 5.0) - 0.5))
            elif out <= 1.0:
                colour = blend(SAND_, SAND_WET, (out - 0.86) / 0.14)
            else:
                colour = MUD
            ring.append(Vector((x, y, z)))
            shades.append(lit(colour, 0.9 + 0.2 * noise(x * 2.0, y * 2.0, 7.0)))
        rings.append(ring)
        tones_.append(shades)
    skin(part, rings, tones_, first=(Vector((0.0, ISLET_Y, islet_top(0.0, ISLET_Y)[0])), GRASS), last=(Vector((0.0, ISLET_Y, SIGN_LAKE - 1.0)), MUD))
    # Stones heaped round each post's foot, and a few along the shore in front: grey granite, each its own.
    STONE_TONES = (tone('#8a8a84'), tone('#77756f'), tone('#96928a'))
    heap = []
    for (k, px) in enumerate((-POST_X, POST_X)):
        for m in range(6):
            a = TAU * m / 6.0 + 0.5 * k
            heap.append((px + 0.72 * math.cos(a), 0.32 + 0.6 * math.sin(a), 0.38 + 0.24 * rnd(m, k + 2.0), 2))
        heap.append((px + (ISLET_A * 0.2 if k == 0 else -ISLET_A * 0.16), -1.5, 0.34, 1))
    for m in range(7):
        heap.append((-6.6 + 2.2 * m + 0.8 * (rnd(m, 9.0) - 0.5), ISLET_Y - ISLET_B * 0.86 + 0.3 * rnd(m, 4.0), 0.2 + 0.16 * rnd(m, 5.0), 1))
    for (k, (sx, sy, size, detail)) in enumerate(heap):
        ground = islet_top(sx, sy)[0]
        made = lump(part, Vector((sx, sy, ground + size * 0.32)), (size * (1.0 + 0.3 * rnd(k, 1.0)), size * (1.0 + 0.3 * rnd(k, 2.0)), size * 0.7), detail, STONE_TONES[k % 3])
        for v in made:
            d = v.co - Vector((sx, sy, ground + size * 0.32))
            swell = 1.0 + 0.16 * (noise(d.x * 3.0 + k, d.y * 3.0, d.z * 3.0) - 0.5)
            v.co = Vector((sx, sy, ground + size * 0.32)) + d * swell
            part['paint'][v] = lit(STONE_TONES[k % 3], 0.78 + 0.34 * noise(d.x * 5.0 + k, d.y * 5.0, d.z * 5.0 + 2.0) + 0.1 * max(0.0, d.z / size))
    # Grass in tufts on it, longest against the posts' feet and the stones: thin blades, pale at their tips.
    BLADE = tone('#7a8444')
    BLADE_TIP = tone('#c2b872')
    tufts = []
    for (k, px) in enumerate((-POST_X, POST_X)):
        for m in range(5):
            a = TAU * m / 5.0 + 0.9 * k + 0.3
            tufts.append((px + 1.15 * math.cos(a), 0.32 + 0.95 * math.sin(a), 1.7))
    for m in range(34):
        tufts.append((ISLET_A * 0.84 * (2.0 * rnd(m, 11.0) - 1.0), ISLET_Y + ISLET_B * 0.66 * (2.0 * rnd(m, 12.0) - 1.0), 0.9 + 0.6 * rnd(m, 13.0)))
    for (k, (tx, ty, tall)) in enumerate(tufts):
        for m in range(11):
            a = TAU * rnd(m, k + 20.0)
            r = 0.06 + 0.2 * rnd(m * 3.0, k)
            x = tx + r * math.cos(a)
            y = ty + r * math.sin(a)
            (ground, out) = islet_top(x, y)
            if out > 0.8:
                continue
            high = tall * (0.45 + 0.6 * rnd(m * 7.0, k + 1.0))
            lean = 0.2 + 0.3 * rnd(m * 5.0, k + 2.0)
            across = Vector((-math.sin(a), math.cos(a), 0.0)) * 0.055
            foot = Vector((x, y, ground - 0.03))
            tip = foot + Vector((math.cos(a) * lean * high, math.sin(a) * lean * high, high))
            shade = lit(BLADE, 0.8 + 0.4 * rnd(m, k + 3.0))
            face(part, (put(part, foot - across, shade), put(part, foot + across, shade), put(part, tip, BLADE_TIP)))
    block(part, (-W - 0.1, -0.08, LOW - 0.1), (W + 0.1, 0.0, HIGH + 0.1), lit(FRAME_WOOD, 0.85), 1.0, grain=0.05)
    # The painting, a little in front of the boards: the sky down to the ridge, the ridge's wavy top, the lake below it.
    HORIZON = LOW + 8.5 * 0.42
    # The name across the lake: Playpen Sans is 2.4 times as wide as its size, and its tallest letters, the l and the
    # k, stand 0.52 of it over the line. Wide enough to read from the shore, with the lake round it.
    NAME_SIZE = 4.3
    NAME_TALL = 0.52 * NAME_SIZE
    NAME_BASE = LOW + (HORIZON - LOW - NAME_TALL) * 0.5
    COLUMNS = 20
    ridge_top = []
    for c in range(COLUMNS + 1):
        x = -W + 2.0 * W * c / COLUMNS
        ridge_top.append(HORIZON + 0.55 + 0.75 * (0.5 + 0.5 * math.sin(x * 0.55 + 1.2)) * (0.6 + 0.4 * math.sin(x * 1.7)) + 0.2 * noise(x, 1.0, 2.0))
    # The sky in three bands of paint, palest at the horizon, and the ridge's wavy top standing in front of it.
    for (z0, z1, colour) in ((HORIZON + 0.3, HORIZON + 1.9, SKY_LOW), (HORIZON + 1.9, HORIZON + 3.4, blend(SKY_LOW, SKY, 0.5)), (HORIZON + 3.4, HIGH, SKY)):
        plate(part, [(-W, z0), (W, z0), (W, z1), (-W, z1)], FRONT, FRONT + 0.05, colour)
    for c in range(COLUMNS):
        x0 = -W + 2.0 * W * c / COLUMNS
        x1 = -W + 2.0 * W * (c + 1) / COLUMNS
        plate(part, [(x0, HORIZON), (x1, HORIZON), (x1, ridge_top[c + 1]), (x0, ridge_top[c])], FRONT - 0.03, FRONT - 0.005, lit(RIDGE, 0.9 + 0.1 * rnd(c, 7.0)))
    # The lake, its ripples painted as paler strokes over the name and under it, never behind its letters.
    block(part, (-W, FRONT - 0.03, LOW), (W, FRONT + 0.05, HORIZON), LAKE, 3.0, grain=0.0, top=0.0)
    for (k, z) in enumerate((LOW + 0.18, LOW + 0.36, NAME_BASE + NAME_TALL + 0.16, NAME_BASE + NAME_TALL + 0.36)):
        x = -W + 0.5 + (2.0 * W - 2.6) * rnd(k, 3.0)
        long_ = 0.8 + 1.6 * rnd(k, 4.0)
        block(part, (x, FRONT - 0.06, z), (min(W - 0.3, x + long_), FRONT - 0.03, z + 0.07), LAKE_PALE, k, grain=0.0, top=0.0)
    # The sun's glitter on the lake, under it, between the name and the far shore.
    sun_x = 2.0 * W * 0.22
    sun_z = LOW + 8.5 * 0.74
    for k in range(2):
        z = HORIZON - 0.2 - 0.24 * k
        half = 0.9 - 0.3 * k
        block(part, (sun_x - half, FRONT - 0.06, z), (sun_x + half, FRONT - 0.03, z + 0.09), lit(SUN, 0.9), k, grain=0.0, top=0.0)
    # The wooden sun, cut out and fixed on: a thick disc, its rays round it, and its smiling face.
    R = 8.5 * 0.17
    disc = Matrix.Translation(Vector((sun_x, FRONT - 0.03, sun_z))) @ Matrix.Rotation(math.radians(90.0), 4, 'X')
    lathe(part, ((0.0, 0.0), (R, 0.0), (R, 0.16), (R * 0.95, 0.2), (0.0, 0.22)), 20, disc, [SUN, SUN, lit(SUN, 1.05), lit(SUN, 1.08), lit(SUN, 1.1)])
    for k in range(10):
        a = TAU * k / 10.0
        tip = (sun_x + math.cos(a) * R * 1.75, sun_z + math.sin(a) * R * 1.75)
        left = (sun_x + math.cos(a - 0.17) * R * 1.12, sun_z + math.sin(a - 0.17) * R * 1.12)
        right = (sun_x + math.cos(a + 0.17) * R * 1.12, sun_z + math.sin(a + 0.17) * R * 1.12)
        near =[put(part, Vector((p[0], FRONT - 0.12, p[1])), lit(SUN, 1.0)) for p in (left, right, tip)]
        far = [put(part, Vector((p[0], FRONT - 0.03, p[1])), lit(SUN, 0.8)) for p in (left, right, tip)]
        face(part, near)
        face(part, list(reversed(far)))
        for m in range(3):
            q = (m + 1) % 3
            face(part, (near[q], near[m], far[m], far[q]), lit(SUN, 0.85))
    for side in (-1.0, 1.0):
        eye = Matrix.Translation(Vector((sun_x + side * R * 0.34, FRONT - 0.24, sun_z + R * 0.2))) @ Matrix.Rotation(math.radians(90.0), 4, 'X')
        lathe(part, ((0.0, 0.0), (R * 0.1, 0.0), (R * 0.08, 0.04), (0.0, 0.05)), 8, eye, [FACE_] * 4)
    smile = [Vector((sun_x + math.cos(math.radians(200.0 + 14.0 * k)) * R * 0.46, FRONT - 0.26, sun_z - R * 0.04 + math.sin(math.radians(200.0 + 14.0 * k)) * R * 0.46)) for k in range(11)]
    bend(part, smile, R * 0.05, FACE_, 6)
    # The frame of rough boards round the painting, standing out from it.
    for (x0, z0, x1, z1) in ((-W - 0.4, HIGH, W + 0.4, HIGH + 0.4), (-W - 0.4, LOW - 0.4, W + 0.4, LOW), (-W - 0.4, LOW, -W, HIGH), (W, LOW, W + 0.4, HIGH)):
        block(part, (x0, FRONT - 0.16, z0), (x1, 0.02, z1), lit(FRAME_WOOD, 0.92 + 0.1 * rnd(x0, z0)), x0 + z0, grain=0.08)
    # Its little roof of boards, overhanging the front and the back: two boards meeting over a ridge board.
    for side in (-1.0, 1.0):
        beam(part, Vector((-W - 0.8, side * 0.55, HIGH + 0.4 + 0.25)), Vector((W + 0.8, side * 0.55, HIGH + 0.4 + 0.25)), 1.2, 0.08,
             lit(FRAME_WOOD, 0.8), up=Vector((0.0, side * 0.45, 1.0)))
    block(part, (-W - 0.85, -0.08, HIGH + 0.82), (W + 0.85, 0.08, HIGH + 0.98), lit(FRAME_WOOD, 0.7), 5.0, grain=0.0)
    finish(part, 'solskylt', sharp=40.0, strength=0.55, reach=0.8, leaf=True)
    # The name, made as the name on Olympia's hall is (art/blender/olympia.py): Playpen Sans's letters as Blender sets
    # them, flat, a little in front of the lake's paint. A thing of its own, `solskylt-name`, which the game keeps white
    # in the night (src/render/shared-models.ts); none of the kit's shade is baked on it.
    letters = bpy.data.curves.new('solskylt-name', 'FONT')
    letters.body = 'Fl' + chr(0xE4) + 'rken'
    letters.size = NAME_SIZE
    letters.resolution_u = 3
    letters.align_x = 'CENTER'
    letters.font = bpy.data.fonts.load(ROOT + '/public/fonts/playpen-sans-700-sv.woff2')
    name = bpy.data.objects.new('solskylt-name', letters)
    bpy.context.scene.collection.objects.link(name)
    name.rotation_euler = (math.pi / 2, 0.0, 0.0)
    name.location = (0.0, FRONT - 0.1, NAME_BASE)
    bpy.ops.object.select_all(action='DESELECT')
    name.select_set(True)
    bpy.context.view_layer.objects.active = name
    bpy.ops.object.convert(target='MESH')
    name = bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    name.name = 'solskylt-name'
    name.data.name = 'solskylt-name'
    white = name.data.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for item in white.data:
        item.color = (1.0, 1.0, 1.0, 1.0)
    name.data.materials.clear()
    name.data.materials.append(MATERIAL)
    name['shade'] = 0.0
    name['reach'] = 0.0
    name['floor'] = -1000.0


# --- the jetty's other leg ---------------------------------------------------------------------------------------------------
# The L of Flarken's jetty: a pontoon jetty low on the water, running out behind the path from the planks he walks on.
# Grey planks across it, each its own, on stringers over black floats, a rubbing board along each side, two pairs of posts
# with a rope between them, mooring cleats, and on the last post a life ring, white with four red bands. 24 long. Its
# origin is 0.3 over the chapter's 0, and the lake lies 0.9 under it.

if wanted('bryggarm'):
    part = new_part()
    LONG = 24.0
    HALF = 2.0
    TOP = 0.18
    WATER = -0.9
    GREY = (tone('#74746a'), tone('#6a6a60'), tone('#7c7c70'))
    DARK_WOOD = tone('#3e3e38')
    FLOAT = tone('#1e1f22')
    ROPE = tone('#b4aa8c')
    y = 0.05
    n = 0
    while y < LONG - 0.1:
        n += 1
        plank = lit(GREY[n % 3], 0.9 + 0.18 * rnd(n, 2.0))
        lean = 0.03 * (rnd(n, 3.0) - 0.5)
        block(part, (-HALF, y, TOP - 0.16 + lean), (HALF, y + 0.8, TOP + lean), plank, n, grain=0.08)
        y += 0.9
    for x in (-HALF + 0.3, HALF - 0.3):
        block(part, (x - 0.12, 0.0, TOP - 0.46), (x + 0.12, LONG, TOP - 0.16), DARK_WOOD, x, grain=0.06)
    for x in (-HALF - 0.08, HALF - 0.04):
        block(part, (x, 0.0, TOP - 0.42), (x + 0.12, LONG, TOP - 0.1), lit(DARK_WOOD, 1.1), x + 1.0, grain=0.06)
    for k in range(4):
        y = 3.0 + 6.0 * k
        block(part, (-HALF + 0.25, y - 1.6, WATER - 0.35), (HALF - 0.25, y + 1.6, TOP - 0.46), lit(FLOAT, 0.9 + 0.2 * rnd(k, 5.0)), k)
    # Its posts, standing in the lake, a rope from each to the next along both sides.
    posts = (LONG * 0.45, LONG - 0.5)
    for py in posts:
        for x in (-HALF - 0.1, HALF + 0.1):
            log(part, Vector((x, py, WATER - 1.5)), Vector((x, py, 2.0)), 0.14, tone('#54504a'), x + py, sides=8, every=1.2,
                ends=(None, lit(tone('#54504a'), 1.15)))
    for x in (-HALF - 0.1, HALF + 0.1):
        sag = [Vector((x, posts[0] + (posts[1] - posts[0]) * k / 8.0, 1.6 - 0.35 * math.sin(math.pi * k / 8.0))) for k in range(9)]
        bend(part, sag, 0.04, ROPE, 5)
    # Mooring cleats on its planks.
    for (cx, cy) in ((-HALF + 0.35, 6.0), (HALF - 0.35, 14.0), (-HALF + 0.35, 20.0)):
        block(part, (cx - 0.06, cy - 0.3, TOP), (cx + 0.06, cy + 0.3, TOP + 0.08), tone('#2a2a2c'), cy, grain=0.0)
        block(part, (cx - 0.05, cy - 0.06, TOP + 0.08), (cx + 0.05, cy + 0.06, TOP + 0.2), tone('#2a2a2c'), cy + 1.0, grain=0.0)
    # The life ring on the last post, white with four red bands, facing the camera.
    centre = Vector((HALF + 0.1, LONG - 0.82, 1.3))
    ring_ = [centre + Vector((0.62 * math.cos(TAU * j / 24.0), 0.0, 0.62 * math.sin(TAU * j / 24.0))) for j in range(25)]
    bands = [tone('#c43a30') if (j % 6) in (0, 5) else tone('#e4e0d6') for j in range(25)]
    tube(part, ring_, [0.17] * 25, bands, 8, twist=0.0)
    beam(part, Vector((HALF + 0.1, LONG - 0.62, 1.95)), Vector((HALF + 0.1, LONG - 0.82, 1.95)), 0.06, 0.06, tone('#2a2a2c'))
    finish(part, 'bryggarm', sharp=40.0, strength=0.5, reach=0.6, leaf=True)


# --- the stone, the bark and the gap at the jetty's end -------------------------------------------------------------------
# What the puzzle at the jetty's end is made of (src/content/aventyr2/chapters/flarken.ts, "Vad flyter?"), each as big as it
# is to the game. The stone Elof pushes out, thinking it will fill the gap, rolls and sinks; the bark, which is wood,
# floats there. The game moves them both itself, so neither has the ground's shade baked under it.

# A round field stone of grey granite, rounded by the ice: 1.4 across and 1.5 high, as the stone is to the game. It
# rolls, so it is round every way, and its origin is its middle, where the game turns it. Mottled grey with dark and
# rosy grains, a white vein of quartz round it, crusts of pale lichen and a few orange spots on one side; wet.
if wanted('grasten'):
    part = new_part()
    GRANITE = tone('#a3a19a')
    GRANITE_DARK = tone('#7f7d77')
    GRAIN_DARK = tone('#3a3a3d')
    GRAIN_ROSE = tone('#a8948a')
    QUARTZ = tone('#dcd8cc')
    LICHEN = tone('#a2aa8e')
    LICHEN_ORANGE = tone('#c49a3e')
    made = lump(part, Vector((0.0, 0.0, 0.0)), (1.0, 1.0, 1.0), 5, GRANITE)
    VEIN = Vector((0.5, 0.32, 0.8))
    VEIN.normalize()
    for v in made:
        d = v.co.normalized()
        # Round, a little longer than it is wide, with soft swells and dents, as no two field stones are alike.
        swell = 1.0 + 0.11 * (noise(d.x * 1.3 + 4.0, d.y * 1.3, d.z * 1.3) - 0.5) + 0.05 * (noise(d.x * 3.1, d.y * 3.1 + 2.0, d.z * 3.1) - 0.5)
        v.co = Vector((d.x * 0.7, d.y * 0.64, d.z * 0.75)) * swell
        # Its paint: the granite's mottle, its grains, the vein, the lichen; all of it darker for the rain.
        mottle = noise(d.x * 2.2 + 9.0, d.y * 2.2, d.z * 2.2)
        colour = blend(GRANITE_DARK, GRANITE, mottle * 1.3 - 0.15)
        grain = rnd(v.co.x * 41.0 + v.co.z * 7.0, v.co.y * 37.0 + v.co.z * 13.0)
        if grain < 0.14:
            colour = blend(colour, GRAIN_DARK, 0.45)
        elif grain < 0.26:
            colour = blend(colour, GRAIN_ROSE, 0.4)
        across = abs(d.dot(VEIN) - 0.16 - 0.16 * (noise(d.x * 1.6, d.y * 1.6, d.z * 1.6 + 5.0) - 0.5))
        wide = 0.012 + 0.03 * noise(d.x * 3.0 + 2.0, d.y * 3.0, d.z * 3.0)
        colour = blend(colour, QUARTZ, 0.8 * (1.0 - max(0.0, min(1.0, (across - wide) / 0.03))))
        crust = noise(d.x * 2.6 + 3.0, d.y * 2.6 + 1.0, d.z * 2.6)
        if d.z > -0.2 and crust > 0.6:
            colour = blend(colour, LICHEN, min(1.0, (crust - 0.6) * 5.0) * 0.8)
        if d.z > 0.25 and noise(d.x * 7.0, d.y * 7.0 + 3.0, d.z * 7.0) > 0.8:
            colour = blend(colour, LICHEN_ORANGE, 0.7)
        part['paint'][v] = lit(colour, 0.88)
    finish(part, 'grasten', sharp=180.0, strength=0.3, reach=0.4)


# A thick piece of an old pine's bark (Olov, 14 November 2026: "Kan vi forbattra bade designen och texturen pa barken som
# flyter, sa att den ser snyggare ut?"; it was a block of bulging plates like a wall of field stones). As the bark is to
# the game: 2 long and 1.5 high as it stands on the planks on its long edge, its outside to the camera, and BARK_T
# thick; its origin the middle of its bottom. When it goes into the water the game lays it down flat, its outside up,
# and it floats so (src/content/aventyr2/bark-raft.ts): what is its top on the planks is then its far edge.
#
# Its outside is an old pine's: long plates in columns between the long furrows that run up the trunk, each plate built
# up in steps like a map's contours, its top grey and cinnamon scales in rings with flecks of orange where scales have
# come off, the steps under them red-brown; the furrows deep, nearly black at the bottom. Its long edges curl outwards a little, as bark
# does when it dries. Round its broken edge are the bark's layers, each a little further out or in than the next: grey
# outermost, then red-brown and rust by turns, and palest innermost; its back is its pale inside.

BARK_T = 0.9
BARK_PLATE = 0.16
# Its plates stand in columns between long furrows that run up the trunk, each column cut across into plates of its own
# lengths: where each furrow is at the piece's mid height, and where each column is cut.
BARK_COLS = 6
BARK_EDGES = [-1.32 + 2.64 * k / BARK_COLS + (0.12 * (rnd(k, 3.3) - 0.5) if k > 0 and k < BARK_COLS else 0.0) for k in range(BARK_COLS + 1)]
BARK_CUTS = []
for k in range(BARK_COLS):
    cuts = []
    z = -0.35 + 0.5 * rnd(k, 1.7)
    while z < 1.95:
        cuts.append(z)
        z += 0.72 + 0.6 * rnd(k * 3.1, len(cuts) + 0.5)
    BARK_CUTS.append(cuts)


def bark_furrow(k, z):
    """Where the furrow between two columns is at a height: it wanders as it goes up."""
    return BARK_EDGES[k] + 0.05 * math.sin(z * 4.0 + k * 1.9) + 0.04 * (noise(z * 2.5, k * 1.0, 4.0) - 0.5)


def bark_plate(x, z):
    """Where on old pine bark (x, z) is: (how far it is from the nearest furrow, which plate it is on)."""
    col = BARK_COLS - 1
    for k in range(BARK_COLS):
        if x < bark_furrow(k + 1, z):
            col = k
            break
    far = min(x - bark_furrow(col, z), bark_furrow(col + 1, z) - x)
    row = 0
    cuts = BARK_CUTS[col]
    for m in range(len(cuts)):
        cut = cuts[m] + 0.06 * math.sin(x * 9.0 + m * 2.3 + col)
        far = min(far, abs(z - cut) * 0.8)
        if z >= cut:
            row = m + 1
    return (max(0.0, far), col * 7 + row)


def bark_step(far):
    """A plate's contours: (which of its three steps a place this far from a furrow is on, from 0 lowest to 2, how far
    up the riser to it, from 0 to 1)."""
    t = max(0.0, min(1.0, (far - 0.012) / 0.12)) * 3.0
    level = min(2.0, math.floor(t))
    riser = max(0.0, min(1.0, (t - level) / 0.35))
    return (level, riser * riser * (3.0 - 2.0 * riser))


if wanted('barkbit'):
    part = new_part()
    SCALE = (tone('#8f8272'), tone('#a08a76'), tone('#7c7062'), tone('#96785e'))
    FLECK = tone('#b9774a')
    STEP = (tone('#6a3a22'), tone('#8c5636'))
    FURROW = tone('#1e110b')
    LAYERS = (tone('#7a4a2e'), tone('#b06c3e'), tone('#6a3c22'), tone('#c68048'), tone('#8a4e2a'), tone('#dcbc90'))
    INSIDE = tone('#caa37a')
    NX = 58
    NZ = 42
    FRONT_Y = -BARK_T * 0.5
    BACK_Y = BARK_T * 0.5

    def outline_at(u, v):
        """Where on its face (u, v) from 0 to 1 is: its ends broken off unevenly, its top and bottom level."""
        left = -0.95 + 0.07 * (noise(v * 5.0, 1.0, 2.0) - 0.5) + 0.05 * (1.0 - v) * v * 4.0 * (noise(v * 2.0, 3.0, 1.0) - 0.3)
        right = 0.95 + 0.07 * (noise(v * 4.4, 4.0, 1.0) - 0.5) - 0.05 * (1.0 - v) * v * 4.0 * (noise(v * 2.3, 6.0, 2.0) - 0.3)
        return (left + (right - left) * u, 1.5 * v)

    front = []
    for i in range(NX + 1):
        row = []
        for j in range(NZ + 1):
            (x, z) = outline_at(i / NX, j / NZ)
            (far, which) = bark_plate(x, z)
            (level, riser) = bark_step(far)
            relief = BARK_PLATE * ((level + riser) / 3.0) * (0.85 + 0.3 * rnd(which, 4.0))
            top = level >= 2.0 and riser >= 1.0
            # On a plate's top its scales lie in rings round it, each a thin flake a little under the one inside it.
            ring = math.floor(far / 0.045)
            flake = noise(x * 13.0, z * 8.0, 3.0)
            if top:
                relief += 0.012 * min(4.0, ring - 2.0) + 0.012 * (flake - 0.5)
            # Its long edges curl outwards, and its whole face bulges a little, as a piece off a round trunk does.
            curl = 0.07 * (max(0.0, 1.0 - z / 0.22) ** 2 + max(0.0, 1.0 - (1.5 - z) / 0.22) ** 2)
            bulge = 0.06 * math.cos(math.pi * x / 2.3)
            if top:
                colour = lit(SCALE[int(which + ring) % 4], 0.84 + 0.3 * flake)
                if noise(x * 6.0 + which, z * 4.0, 9.0) > 0.68:
                    colour = blend(colour, FLECK, 0.75)
            elif far < 0.02:
                colour = FURROW
            elif riser < 1.0:
                colour = blend(FURROW, STEP[int(min(1.0, level))], 0.25 + 0.5 * riser)
            else:
                colour = lit(STEP[int(min(1.0, level))], 0.88 + 0.24 * rnd(which, 7.0 + level))
            row.append(put(part, Vector((x, FRONT_Y - relief - curl - bulge, z)), colour))
        front.append(row)
    for i in range(NX):
        for j in range(NZ):
            face(part, (front[i][j], front[i + 1][j], front[i + 1][j + 1], front[i][j + 1]))
    # Round its broken edge, from its face to its back: first the plates' own sides, down to the furrows' floor; then the
    # bark's layers, thin bands of red-brown and rust by turns, each a little further out or in than the next (on its
    # ends: its top and bottom stay level), the innermost pale; and its pale inside as its back.
    rim = [(i, 0) for i in range(NX)] + [(NX, j) for j in range(NZ)] + [(i, NZ) for i in range(NX, 0, -1)] + [(0, j) for j in range(NZ, 0, -1)]
    BANDS = len(LAYERS)
    rings = []
    for (i, j) in rim:
        a = front[i][j]
        end = 1.0 if (i == 0 or i == NX) else 0.0
        way = Vector((-1.0 if i == 0 else (1.0 if i == NX else 0.0), 0.0, 0.0))
        ring = [a, put(part, Vector((a.co.x, FRONT_Y, a.co.z)), FURROW)]
        for m in range(BANDS):
            t_ = (m + 1.0) / BANDS
            jut = (0.05 * (rnd(m, 3.0) - 0.4) + 0.025 * (rnd(m * 7.0 + i * 0.3, j * 0.3) - 0.5)) * end
            at = Vector((a.co.x, FRONT_Y + (BACK_Y - FRONT_Y) * t_, a.co.z)) + way * jut
            ring.append(put(part, at, LAYERS[m]))
        rings.append(ring)
    for k in range(len(rim)):
        here = rings[k]
        on = rings[(k + 1) % len(rim)]
        # (The plates' sides keep their corners' own colours, the plate's above and the furrow's dark below.)
        face(part, (here[0], on[0], on[1], here[1]))
        for m in range(BANDS):
            made = face(part, (here[m + 1], on[m + 1], on[m + 2], here[m + 2]))
            part['flat'][made] = lit(LAYERS[m], 0.9 + 0.2 * rnd(k * 0.37, m))
    face(part, [ring[BANDS + 1] for ring in reversed(rings)], INSIDE)
    finish(part, 'barkbit', sharp=28.0, strength=0.65, reach=0.25)


# Where the jetty's last planks have gone: the ends of its three rows of planks broken off, splintered and paler where
# the wood is new, and one plank on each side snapped and hanging down into the water at the back. The jetty's own
# planks are the game's (src/render/dressing/spang.ts: 0.76 wide and 0.22 thick, their tops on the line he walks, at
# 0.8 behind him, under him and 0.8 in front). Its origin is the near edge of the gap, its far edge 4.6 on; nothing of it
# is over the gap at the height he stands, so it is never something to stand on.
if wanted('bryggbrott'):
    part = new_part()
    SILVER = (tone('#aca79c'), tone('#b9b4a8'), tone('#c6c1b5'))
    FRESH = tone('#cdb48a')
    WIDE = 0.76
    THICK = 0.22
    GAP = 4.6
    for (edge, way) in ((0.0, 1.0), (GAP, -1.0)):
        for (row, y) in enumerate((0.8, 0.0, -0.8)):
            # The broken end: splinters of uneven length, pale where they broke, over the plank's thickness.
            wood = SILVER[(row + int(edge)) % 3]
            count = 4
            for k in range(count):
                y0 = y - WIDE * 0.5 + WIDE * k / count + 0.01
                y1 = y - WIDE * 0.5 + WIDE * (k + 1) / count - 0.01
                reach = 0.06 + 0.24 * rnd(k + row * 5.0, edge + 3.0)
                tip_z = -THICK * (0.3 + 0.5 * rnd(k, row + edge))
                base = [Vector((edge - way * 0.02, y0, 0.0)), Vector((edge - way * 0.02, y1, 0.0)),
                        Vector((edge - way * 0.02, y1, -THICK)), Vector((edge - way * 0.02, y0, -THICK))]
                tip = Vector((edge + way * reach, (y0 + y1) * 0.5, tip_z))
                corners = [put(part, p, wood) for p in base]
                point = put(part, tip, FRESH)
                for m in range(4):
                    face(part, (corners[m], corners[(m + 1) % 4], point))
        # The back row's plank, snapped and hanging down into the water, its far end under it: a board 0.84 of a plank
        # wide and a plank thick, from just under the deck's edge down to under the water.
        start = Vector((edge + way * 0.05, 0.8, -0.06))
        end = Vector((edge + way * 1.05, 0.8, -0.95))
        ahead = end - start
        ahead.normalize()
        down = Vector((ahead.z, 0.0, -ahead.x)) if way > 0 else Vector((-ahead.z, 0.0, ahead.x))
        rings = []
        for at in (start, end):
            rings.append([at + Vector((0.0, -WIDE * 0.42, 0.0)), at + Vector((0.0, WIDE * 0.42, 0.0)),
                          at + Vector((0.0, WIDE * 0.42, 0.0)) + down * THICK, at + Vector((0.0, -WIDE * 0.42, 0.0)) + down * THICK])
        board = skin(part, rings, [SILVER[1], lit(SILVER[1], 0.7)])
        face(part, list(reversed(board[0])), FRESH)
        face(part, board[1], lit(FRESH, 0.8))
    finish(part, 'bryggbrott', sharp=40.0, strength=0.4, reach=0.4)
