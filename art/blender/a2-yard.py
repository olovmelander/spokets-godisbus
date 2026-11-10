"""Aventyr 2's yard things, which were built in code until now (docs/aventyr-2-overhaul.md): Billsta's woodshed, the
rowing boat turned over on its trestles for the winter under a tarp, the mailbox by the road and the garden furniture
under its tarp; the swings at Flärkenbadet; and Olympia's two goals and its kit table.

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Each stands on
its origin, at the size the chapter gives it in EL, with its front towards -Y. No letters, numbers or marks on anything.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)


def wanted(name):
    return ONLY is None or ONLY == name


def timber(part, low, high, colour, seed=0.0, grain=0.07):
    """A sawn piece, each of its six faces its own tone, in EL."""
    corners = [put(part, Vector((x, y, z)), colour) for x in (low[0], high[0]) for y in (low[1], high[1]) for z in (low[2], high[2])]
    sides = ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))
    for i in range(6):
        made = face(part, [corners[k] for k in sides[i]])
        part['flat'][made] = lit(colour, 1.0 + grain * (rnd(seed, i) - 0.5) * 2.0 + (0.09 if i == 5 else 0.0))


BARK = tone('#6a5040')
CUT_OLD = tone('#a88a60')
FALU = tone('#8a2f22')
FALU_DARK = tone('#5e1f17')
TIN = tone('#3e4246')
WHITE_ = tone('#dcd8cc')

# --- the woodshed ------------------------------------------------------------------------------------------------------------
# Falu red boards and battens on three sides, open to the yard, under a roof of dark corrugated tin. The winter's wood is
# stacked in it to the beams, sawn ends out, birch among the spruce; a chopping block stands in front with its split pieces.
# 18 wide, 10 deep, its eaves 13 up: as the chapter has it.

if wanted('vedbod'):
    part = new_part()
    W = 9.0
    D = 5.0
    H = 13.0
    RISE = 3.0
    # The sills, the corner posts and the beam over the open front.
    for x in (-W, W - 0.6):
        timber(part, (x, -D, 0.0), (x + 0.6, D, 0.5), FALU_DARK, x)
        for y in (-D, D - 0.6):
            timber(part, (x, y, 0.0), (x + 0.6, y + 0.6, H), FALU, x + y)
    timber(part, (-W, D - 0.6, 0.0), (W, D, 0.5), FALU_DARK, 3.0)
    timber(part, (-W, -D, H - 1.1), (W, -D + 0.6, H), FALU, 4.0)
    # The back wall: boards side by side, a batten over each joint, outside.
    n = 0
    x = -W
    while x < W - 0.01:
        n += 1
        wide = min(1.1 + 0.08 * (rnd(n, 1.0) - 0.5), W - x)
        timber(part, (x, D - 0.3, 0.3), (x + wide, D - 0.05, H + 0.05), lit(FALU, 0.9 + 0.2 * rnd(n, 2.0)), n, grain=0.1)
        if x > -W + 0.1:
            timber(part, (x - 0.16, D - 0.05, 0.3), (x + 0.16, D + 0.1, H), lit(FALU, 0.85), n + 0.5)
        x += wide
    # The side walls: boards up to the gable, battens outside.
    for side in (-1.0, 1.0):
        y = -D
        while y < D - 0.01:
            n += 1
            wide = min(1.1 + 0.08 * (rnd(n, 1.0) - 0.5), D - y)
            mid = y + wide / 2.0
            top = H + RISE * (1.0 - abs(mid) / D) - 0.15
            xs = sorted((side * (W - 0.05), side * (W - 0.3)))
            timber(part, (xs[0], y, 0.3), (xs[1], y + wide, top), lit(FALU, 0.9 + 0.2 * rnd(n, 2.0)), n, grain=0.1)
            if y > -D + 0.1:
                xb = sorted((side * (W - 0.05), side * (W + 0.1)))
                timber(part, (xb[0], y - 0.16, 0.3), (xb[1], y + 0.16, top - 0.2), lit(FALU, 0.85), n + 0.5)
            y += wide
    # The roof: corrugated tin in two slopes, ribs running down them, with an overhang all round; white fascia boards.
    OVER = 1.0
    RIBS = 64
    for slope in (-1.0, 1.0):
        rings = []
        tones = []
        for j in range(3):
            k = j / 2.0
            yy = slope * (D + OVER) * k
            zz = H + RISE + 0.15 - (RISE + RISE * OVER / D) * k
            ring = []
            for i in range(RIBS + 1):
                xx = -W - OVER + 2.0 * (W + OVER) * i / RIBS
                ring.append(Vector((xx, yy, zz + 0.09 * math.sin(i * math.pi))))
            rings.append(ring)
            tones.append([lit(TIN, (1.05 if i % 2 == 0 else 0.82) * (0.95 + 0.1 * rnd(i, slope))) for i in range(RIBS + 1)])
        skin(part, rings, tones, closed=False, flip=slope > 0.0)
        eave_z = H + RISE + 0.15 - (RISE + RISE * OVER / D)
        ys = sorted((slope * (D + OVER), slope * (D + OVER - 0.2)))
        timber(part, (-W - OVER, ys[0], eave_z - 0.55), (W + OVER, ys[1], eave_z + 0.05), WHITE_, 5.0 + slope)
    # The ridge cap.
    tube(part, [Vector((-W - OVER, 0.0, H + RISE + 0.28)), Vector((W + OVER, 0.0, H + RISE + 0.28))], [0.28, 0.28], [lit(TIN, 0.75)] * 2, 6, squash=0.5,
         lean=Vector((0.0, 0.0, 1.0)))
    # The winter's wood, from wall to wall and up to the beam, the rows not quite level: split spruce and birch, with
    # here and there a whole log, their sawn ends out (kit-tools.py, `stack_row`).
    HIGH = 1.02
    for row in range(int((H - 1.6) / HIGH)):
        n = stack_row(part, -W + 0.8, W - 0.8, 0.45 + row * HIGH, HIGH, -D + 1.4, D - 0.5, n + 11, 0.3, wave=0.05 if row else 0.0)
    # Behind the stack, the dark between the pieces, where the light does not reach.
    DEPTH = tone('#16110d')
    face(part, [put(part, Vector((x_, D - 0.62, z_)), DEPTH) for x_, z_ in ((-W + 0.6, 0.45), (W - 0.6, 0.45), (W - 0.6, H - 1.1), (-W + 0.6, H - 1.1))], DEPTH)
    # The chopping block in front of it, its top a sawn end with its rings and cracks, and pieces split on it lying about.
    BLOCK = tone('#8a6a48')
    rings = lathe(part, [(0.0, 0.0), (1.25, 0.0), (1.3, 0.2), (1.2, 1.9)], 16, Matrix.Translation((5.6, -D - 4.2, 0.0)),
                  [BLOCK, BARK, BARK, lit(BARK, 0.9)])
    top = face(part, rings[-1], lit(CUT_OLD, 0.95))
    # A spruce's sawn end (1) of radius 1.2 (0.6 is half of it), across X and up Y (kit-tools.py, `firewood`).
    part['wood'][top] = (1.6, Vector((5.6, -D - 4.2, 1.9)), 1.2, ACROSS, Vector((0.0, 1.0, 0.0)))
    part['stuff'][top] = 'kit-wood'
    for i, (px, py, turn) in enumerate(((3.0, -D - 3.4, 0.4), (3.9, -D - 5.8, 1.9), (7.6, -D - 3.0, 0.1))):
        firewood(part, (px, 0.0), 0.62, py - 0.9, py + 0.9, 300 + i, i % 2, turn=turn, wedge=math.pi / 2.0 if i < 2 else math.pi)
    finish(part, 'vedbod', sharp=40.0, strength=0.55, reach=0.6, floor=0.0, leaf=True)


# --- the rowing boat on its trestles ------------------------------------------------------------------------------------------
# Clinker built and turned over for the winter on two sawhorses, its red-brown bottom up and its white topsides down, a blue
# tarp over its stern half, tied with a rope, and a loose corner of the tarp on its own (`roddbat-vinter-flik`), hinged
# along the gunwale, for the wind to lift. 16 long; its gunwale 5.6 up. Its origin is on the ground under its middle.

if wanted('roddbat-vinter'):
    part = new_part()
    LONG = 8.0
    BEAM = 2.6
    REST = 5.6
    BOTTOM = tone('#6a3226')
    TOPSIDE = tone('#d8d4c8')
    SHEER = tone('#34506a')
    TARP = tone('#3e6488')
    ROPE = tone('#c8b88a')
    HORSE = tone('#7a6a58')

    def half(t):
        return BEAM * (1.0 - abs(t) ** 2.6 * (0.2 if t < 0.0 else 1.0)) ** 0.8

    def keel(t):
        return -2.3 + 1.2 * max(0.0, t) ** 3.0 + 0.6 * max(0.0, -t) ** 4.0

    def hull(t, u):
        """A point of the hull, turned over: `t` from the stern (-1) to the bow (1), `u` from one gunwale (-1) over the
        keel (0) to the other (1)."""
        k = abs(u)
        wide = max(half(t), 0.015)
        y = wide * (1.0 if u > 0.0 else -1.0) * (1.0 - (1.0 - k) ** 2.2)
        z_up = keel(t) + (0.15 * abs(t) ** 2.0 - keel(t)) * k ** 1.3
        return Vector((LONG * t, y, REST - z_up))

    STEPS = 22
    STRAKES = 7
    rings = []
    tones = []
    for i in range(STEPS + 1):
        t = -1.0 + 2.0 * i / STEPS
        ring = []
        shades = []
        for s in range(-STRAKES, STRAKES + 1):
            u = s / STRAKES
            p = hull(t, u)
            p.y *= 1.0 + 0.016 * (abs(s) % 2)
            ring.append(p)
            k = abs(u)
            colour = SHEER if abs(s) == STRAKES else (BOTTOM if k < 0.62 else TOPSIDE)
            shades.append(lit(colour, (1.0 if abs(s) % 2 else 0.88) * (0.94 + 0.12 * rnd(i, s))))
        rings.append(ring)
        tones.append(shades)
    skin(part, rings, tones, closed=False)
    # The keel along the top, and the gunwale rails along the bottom edges.
    tube(part, [hull(-1.0 + 2.0 * i / STEPS, 0.0) + Vector((0.0, 0.0, 0.1)) for i in range(STEPS + 1)], [0.14] * (STEPS + 1), [lit(BOTTOM, 0.7)] * (STEPS + 1), 5)
    for side in (-1.0, 1.0):
        path = [hull(-1.0 + 2.0 * i / STEPS, side) - Vector((0.0, 0.0, 0.03)) for i in range(STEPS + 1)]
        tube(part, path, [0.09] * len(path), [tone('#a87c4c')] * len(path), 5, squash=0.7)
    # The transom, the board across the stern.
    stern = [hull(-1.0, u) for u in (-1.0, -0.5, 0.0, 0.5, 1.0)]
    part['flat'][face(part, [put(part, p - Vector((0.03, 0.0, 0.0)), TOPSIDE) for p in stern])] = lit(TOPSIDE, 0.9)
    # The two sawhorses it rests on.
    for x in (-4.6, 4.6):
        timber(part, (x - 0.3, -3.2, REST - 0.42), (x + 0.3, 3.2, REST - 0.02), HORSE, x)
        for y in (-2.6, 2.6):
            for lean in (-1.0, 1.0):
                tube(part, [Vector((x + lean * 0.15, y, REST - 0.3)), Vector((x + lean * 1.15, y * 1.12, 0.0))], [0.17, 0.17], [HORSE, lit(HORSE, 0.8)], 5)
        timber(part, (x - 0.12, -2.9, 1.6), (x + 0.12, 2.9, 1.9), lit(HORSE, 0.9), x + 1.0)

    # The tarp over the stern half: on the hull a hand's breadth off it, then hanging down past the gunwales, in folds. Where
    # the loose corner is, near the camera, the main sheet ends at the gunwale.
    FROM = -8.6
    TO = 1.2
    CORNER = (-1.4, 1.2)
    LENGTHS = 18
    ACROSS = 24

    def tarp_point(x, v):
        """The tarp at `x` along the boat, `v` across it from -1.3 to 1.3 (past ±1 it hangs below the gunwale)."""
        t = max(-1.0, min(1.0, x / LONG))
        u = max(-1.0, min(1.0, v))
        p = hull(t, u)
        centre = Vector((p.x, 0.0, REST - keel(t) * 0.45))
        out = p - centre
        out.x = 0.0
        if out.length > 0.0:
            out.normalize()
        fold = math.sin(x * 1.35 + v * 2.1) * 0.06 + math.sin(x * 0.55 - v * 3.3) * 0.05
        p = p + out * (0.12 + fold)
        if abs(v) > 1.0:
            hang = (abs(v) - 1.0) / 0.3
            p.z -= hang * 1.7
            p.y *= 1.0 + 0.05 * hang
            p.y += (1.0 if v > 0.0 else -1.0) * 0.12 * math.sin(x * 1.9 + hang * 2.0) * hang
        if x < -LONG:
            # Past the transom it falls over the end.
            p.z -= (-LONG - x) * 2.6
            p.x = -LONG - 0.08 - (-LONG - x) * 0.25
        return p

    tarp_rings = []
    tarp_tones = []
    for i in range(LENGTHS + 1):
        x = FROM + (TO - FROM) * i / LENGTHS
        ring = []
        shades = []
        for j in range(ACROSS + 1):
            v = -1.3 + 2.6 * j / ACROSS
            if v < -1.0 and CORNER[0] < x <= CORNER[1] + 0.01:
                v = -1.0
            p = tarp_point(x, v)
            ring.append(p)
            shade = 0.9 + 0.18 * math.sin(x * 1.35 + v * 2.1) + 0.06 * rnd(i, j)
            shades.append(lit(TARP, shade))
        tarp_rings.append(ring)
        tarp_tones.append(shades)
    skin(part, tarp_rings, tarp_tones, closed=False)
    # Its grommets along the hanging edges, and the rope over it twice, down to pegs in the ground.
    for i in range(0, LENGTHS + 1, 2):
        x = FROM + (TO - FROM) * i / LENGTHS
        for v in (-1.3, 1.3):
            if v < 0.0 and CORNER[0] < x <= CORNER[1]:
                continue
            lump(part, tarp_point(x, v) + Vector((0.0, 0.0, 0.12)), (0.07, 0.07, 0.07), 1, tone('#9aa0a4'))
    for x in (-5.8, -2.6):
        path = [tarp_point(x, -1.3 + 2.6 * j / 12) + Vector((0.0, 0.0, 0.05)) for j in range(13)]
        path = [Vector((x, path[0].y - 0.4, 0.0))] + path + [Vector((x, path[-1].y + 0.4, 0.0))]
        tube(part, path, [0.06] * len(path), [ROPE] * len(path), 5)
        for y in (path[0].y, path[-1].y):
            tube(part, [Vector((x, y, -0.2)), Vector((x, y, 0.5))], [0.12, 0.08], [lit(HORSE, 0.7)] * 2, 5)
    boat = finish(part, 'roddbat-vinter', sharp=44.0, strength=0.5, reach=0.6, floor=0.0, leaf=True)

    # The loose corner: hinged along the near gunwale, its origin on the hinge, for the wind to lift about X.
    flap = new_part()
    hinge = tarp_point((CORNER[0] + CORNER[1]) / 2.0, -1.0)
    rows = []
    shades = []
    for i in range(7):
        x = CORNER[0] + (CORNER[1] + 0.5 - CORNER[0]) * i / 6
        ring = []
        tone_row = []
        for j in range(5):
            down = j / 4.0
            top = tarp_point(min(x, TO), -1.0)
            # It hangs a little longer at its free corner, and lies loose, not straight.
            drop = 1.7 * down * (1.0 + 0.25 * max(0.0, x - CORNER[1]) / 0.5)
            p = Vector((x, top.y - 0.1 * down - 0.08 * math.sin(i * 1.3 + down * 2.0), top.z - drop))
            ring.append(p - hinge)
            tone_row.append(lit(TARP, 0.86 + 0.16 * math.sin(i * 1.3 + j) + 0.05 * rnd(i, j)))
        rows.append(ring)
        shades.append(tone_row)
    skin(flap, rows, shades, closed=False)
    for i in range(0, 7, 2):
        lump(flap, rows[i][-1] + Vector((0.0, -0.02, 0.1)), (0.07, 0.07, 0.07), 1, tone('#9aa0a4'))
    loose = finish(flap, 'roddbat-vinter-flik', sharp=60.0, strength=0.3, reach=0.3, leaf=True)
    loose.location = hinge
    loose.parent = boat


# --- the mailbox by the road ---------------------------------------------------------------------------------------------------
# A grey-white tin box with a rounded lid on a wooden post and its arm, by the road, a little darker at its foot. No
# name, no number. The post is 8 up; the box sits on the arm, towards the road (-Y).

if wanted('brevlada'):
    part = new_part()
    POST = tone('#6a5644')
    TIN_ = tone('#c8ccc8')
    timber(part, (-0.3, -0.3, -0.5), (0.3, 0.3, 8.0), POST, 1.0, grain=0.12)
    timber(part, (-0.25, -1.9, 7.4), (0.25, 0.3, 8.0), POST, 2.0, grain=0.12)
    tube(part, [Vector((0.0, -0.1, 6.0)), Vector((0.0, -1.5, 7.45))], [0.14, 0.14], [lit(POST, 0.85)] * 2, 5)
    # The box: straight sides, a lid rounded over it along X, a front with its little latch.
    BOX_W = 1.9
    BOX_D = 1.15
    LOW = 8.0
    HIGH_ = 9.4
    rings = []
    tones = []
    ARC = 9
    for i in range(2):
        y = -1.8 - BOX_D + 2.0 * BOX_D * i
        ring = [Vector((-BOX_W, y, LOW)), Vector((-BOX_W, y, HIGH_))]
        for a in range(1, ARC):
            angle = math.pi * a / ARC
            ring.append(Vector((-BOX_W * math.cos(angle), y, HIGH_ + 0.8 * math.sin(angle))))
        ring += [Vector((BOX_W, y, HIGH_)), Vector((BOX_W, y, LOW))]
        rings.append(ring)
        tones.append([lit(TIN_, 0.92 + 0.12 * rnd(i, j)) if j not in (0, len(ring) - 1) else lit(TIN_, 0.72) for j in range(len(ring))])
    skin(part, rings, tones, closed=True)
    for end in (0, 1):
        colour = lit(TIN_, 0.86 if end == 0 else 0.95)
        made = face(part, [put(part, p, colour) for p in (rings[end] if end == 1 else rings[end][::-1])])
        part['flat'][made] = colour
    # The front lid's hinge line and its latch knob, and a seam round the box.
    front_y = -1.8 - BOX_D - 0.02
    tube(part, [Vector((-BOX_W + 0.1, front_y, HIGH_ - 0.05)), Vector((BOX_W - 0.1, front_y, HIGH_ - 0.05))], [0.05, 0.05], [lit(TIN_, 0.7)] * 2, 5)
    lump(part, Vector((0.0, front_y - 0.05, LOW + 0.7)), (0.16, 0.08, 0.12), 1, tone('#3a3e44'))
    finish(part, 'brevlada', sharp=40.0, strength=0.5, reach=0.4, floor=0.0, leaf=True)


# --- the garden furniture under its tarp ------------------------------------------------------------------------------------------
# Morfar's garden table and its chairs, put away for the winter by the house under a green tarp tied round the legs: the
# shapes of the chairs' backs stand up through it, and the table's legs show under its hem. 9 across.

if wanted('utemobler'):
    part = new_part()
    GREEN = tone('#4c6650')
    WOOD = tone('#8a6a4a')
    ROPE = tone('#c8b88a')
    # The legs that show under the hem.
    for x in (-3.4, 3.4):
        for y in (-1.6, 1.6):
            timber(part, (x - 0.22, y - 0.22, 0.0), (x + 0.22, y + 0.22, 1.4), WOOD, x * y)
    # The tarp: a sheet over a table 3.0 up, the chairs' backs rising through it at the ends, hanging to 1.2 off the ground,
    # gathered in at its waist by the rope.
    COLS = 28
    ROWS = 18

    def cover(i, j):
        u = -1.0 + 2.0 * i / COLS
        v = -1.0 + 2.0 * j / ROWS
        x = 4.6 * u
        y = 2.5 * v
        top = 3.0 + 0.12 * math.sin(u * 7.0) * math.cos(v * 5.0)
        # The chairs' backs at both ends and one behind, standing up under it.
        for cx, cy, wide in ((-3.1, 0.0, 1.5), (3.1, 0.0, 1.5), (0.0, 1.7, 1.9)):
            reach = max(0.0, 1.0 - ((x - cx) / wide) ** 2 - ((y - cy) / 1.0) ** 2)
            top = max(top, 3.0 + 1.25 * reach ** 0.45)
        edge = max(abs(u), abs(v))
        z = top
        if edge > 0.82:
            fall = (edge - 0.82) / 0.18
            z = top - fall * (top - 1.2)
            pull = 1.0 - 0.08 * math.sin(fall * math.pi)
            x *= pull
            y *= pull
        z += 0.08 * math.sin(x * 2.3 + y * 1.7)
        return Vector((x, y, z)), 0.86 + 0.16 * math.sin(x * 2.3 + y * 1.7) + 0.05 * rnd(i, j)

    rings = []
    tones = []
    for i in range(COLS + 1):
        ring = []
        shades = []
        for j in range(ROWS + 1):
            p, k = cover(i, j)
            ring.append(p)
            shades.append(lit(GREEN, k))
        rings.append(ring)
        tones.append(shades)
    skin(part, rings, tones, closed=False, flip=True)
    # Where it is tied down at its corners: a knot of rope at each, to a leg.
    for x in (-3.4, 3.4):
        for y in (-1.6, 1.6):
            p, k = cover(0 if x < 0.0 else COLS, 0 if y < 0.0 else ROWS)
            lump(part, Vector((p.x * 0.98, p.y * 0.98, p.z + 0.05)), (0.14, 0.14, 0.12), 1, ROPE)
    finish(part, 'utemobler', sharp=60.0, strength=0.5, reach=0.6, floor=0.0, leaf=True)


# --- the swings at Flärkenbadet ---------------------------------------------------------------------------------------------------
# A green steel frame, an A at each end and a bar over them, and two seats of black rubber on chains, each over its ring. 19
# wide and 16 high, as the chapter has it; its seats 4 up at a quarter of the width from the middle.

if wanted('gungor'):
    part = new_part()
    STEEL = tone('#3c6a4e')
    CHAIN = tone('#9a9ea4')
    SEAT = tone('#26282a')
    W = 9.5
    H = 16.0
    tube(part, [Vector((-W - 0.6, 0.0, H)), Vector((W + 0.6, 0.0, H))], [0.32, 0.32], [STEEL] * 2, 10)
    for x in (-W, W):
        for y in (-2.9, 2.9):
            tube(part, [Vector((x, y * 0.06, H + 0.1)), Vector((x, y, 0.0))], [0.27, 0.29], [STEEL, lit(STEEL, 0.85)], 9)
        timber(part, (x - 0.12, -1.7, 5.4), (x + 0.12, 1.7, 5.7), lit(STEEL, 0.9), x)
        # The feet's ground plates.
        for y in (-2.9, 2.9):
            timber(part, (x - 0.4, y - 0.4, 0.0), (x + 0.4, y + 0.4, 0.12), lit(STEEL, 0.6), x + y)
    for x in (-W / 2.0, W / 2.0):
        for y in (-0.6, 0.6):
            # Each chain hangs from a hook on the bar, its links a little turned.
            path = [Vector((x, y * 0.4, H - 0.3)), Vector((x, y, 4.35))]
            tube(part, path, [0.06, 0.06], [CHAIN] * 2, 4)
            lump(part, Vector((x, y * 0.4, H - 0.25)), (0.14, 0.14, 0.14), 1, CHAIN)
        # A seat of black rubber, curved like a sling.
        seat = []
        tones_ = []
        for i in range(9):
            u = -1.0 + 2.0 * i / 8
            sag = 0.18 * (1.0 - u * u)
            seat.append([Vector((x + 1.4 * u, -0.75, 4.2 - sag)), Vector((x + 1.4 * u, 0.75, 4.2 - sag)),
                         Vector((x + 1.4 * u, 0.75, 4.45 - sag)), Vector((x + 1.4 * u, -0.75, 4.45 - sag))])
            tones_.append(lit(SEAT, 0.95 + 0.1 * rnd(i, x)))
        skin(part, seat, tones_, first=(Vector((x - 1.42, 0.0, 4.32)), SEAT), last=(Vector((x + 1.42, 0.0, 4.32)), SEAT))
    finish(part, 'gungor', sharp=40.0, strength=0.5, reach=0.5, floor=0.0, leaf=True)


# --- the goals at Olympia ------------------------------------------------------------------------------------------------------------
# White round posts and a crossbar, the mouth towards -X where he comes from, the frame going back along +X, and the net: white cord
# in squares, hanging a little between its frame, slack at the bottom. 12 across (Y), as the stand-in was, so that the near post
# stays behind the path. `fotbollsmal` is the training goal, 7 deep and 8 high; `fotbollsmal-stort` the big one, 10 deep, 16 high.


def goal(name, depth, high, span=12.0):
    part = new_part()
    WHITE__ = tone('#f2f2ee')
    NET = tone('#e2e2de')
    R = 0.35
    for y in (-span / 2.0, span / 2.0):
        tube(part, [Vector((0.0, y, 0.0)), Vector((0.0, y, high))], [R, R], [WHITE__] * 2, 12)
        # The back frame: a stanchion down from the bar's end, and a ground bar back to the rear post.
        tube(part, [Vector((0.0, y, high * 0.98)), Vector((depth * 0.45, y, high * 0.8)), Vector((depth, y, high * 0.62)), Vector((depth, y, 0.0)), Vector((0.0, y, 0.0))],
             [0.12] * 5, [lit(WHITE__, 0.9)] * 5, 6)
    tube(part, [Vector((0.0, -span / 2.0 - R, high)), Vector((0.0, span / 2.0 + R, high))], [R, R], [WHITE__] * 2, 12)
    tube(part, [Vector((depth, -span / 2.0, high * 0.62)), Vector((depth, span / 2.0, high * 0.62))], [0.1, 0.1], [lit(WHITE__, 0.9)] * 2, 6)
    tube(part, [Vector((depth, -span / 2.0, 0.05)), Vector((depth, span / 2.0, 0.05))], [0.1, 0.1], [lit(WHITE__, 0.9)] * 2, 6)

    def roof_z(x):
        """The net's top, from the crossbar back to the back bar, sagging between."""
        k = x / depth
        return high * (1.0 - 0.38 * k) - 0.35 * math.sin(math.pi * k)

    CELL = 0.9 if high < 10 else 1.3
    cord = 0.035 if high < 10 else 0.05
    # The sides' net: squares between the posts' line and the back, from the ground to the roof's line, bellying out a hair.
    for y in (-span / 2.0, span / 2.0):
        out = 1.0 if y > 0.0 else -1.0
        steps_x = max(2, int(depth / CELL))
        steps_z = max(2, int(high / CELL))
        for i in range(1, steps_x):
            x = depth * i / steps_x
            path = [Vector((x, y + out * 0.15 * math.sin(math.pi * j / 6), roof_z(x) * j / 6)) for j in range(7)]
            tube(part, path, [cord] * 7, [NET] * 7, 4, closed_ends=False)
        for j in range(1, steps_z):
            z = high * j / steps_z
            path = []
            for i in range(9):
                x = depth * i / 8
                if z <= roof_z(x) + 0.01:
                    path.append(Vector((x, y + out * 0.15 * math.sin(math.pi * z / max(roof_z(x), 0.1)), z)))
            if len(path) > 1:
                tube(part, path, [cord] * len(path), [NET] * len(path), 4, closed_ends=False)
    # The roof's net and the back's, across the goal.
    steps_y = max(2, int(span / CELL))
    for k in range(1, steps_y):
        y = -span / 2.0 + span * k / steps_y
        path = [Vector((depth * i / 8, y, roof_z(depth * i / 8) - 0.12 * math.sin(math.pi * k / steps_y))) for i in range(9)]
        path += [Vector((depth + 0.2 * math.sin(math.pi * j / 6), y, high * 0.62 * (1.0 - j / 6))) for j in range(1, 7)]
        tube(part, path, [cord] * len(path), [NET] * len(path), 4, closed_ends=False)
    for i in range(1, max(2, int(depth / CELL))):
        x = depth * i / max(2, int(depth / CELL))
        path = [Vector((x, -span / 2.0 + span * k / 10, roof_z(x) - 0.12 * math.sin(math.pi * k / 10))) for k in range(11)]
        tube(part, path, [cord] * len(path), [NET] * len(path), 4, closed_ends=False)
    for j in range(1, max(2, int(high * 0.62 / CELL))):
        z = high * 0.62 * j / max(2, int(high * 0.62 / CELL))
        path = [Vector((depth + 0.2 * math.sin(math.pi * (1.0 - z / (high * 0.62))), -span / 2.0 + span * k / 10, z)) for k in range(11)]
        tube(part, path, [cord] * len(path), [NET] * len(path), 4, closed_ends=False)
    finish(part, name, sharp=50.0, strength=0.3, reach=0.5, floor=0.0, leaf=True)


if wanted('fotbollsmal'):
    goal('fotbollsmal', 7.0, 8.0)
if wanted('fotbollsmal-stort'):
    goal('fotbollsmal-stort', 10.0, 16.0)


# --- the club's kit table ---------------------------------------------------------------------------------------------------------
# A table of planks on two folding trestles, open underneath so that he is seen as he runs under it: 3.8 long, its top 1.1 up,
# where he walks; the club's things on its back edge (a stack of training bibs, a net bag of balls), clear of where he walks.


def kit_football(part, centre, radius, turn):
    """The same 12 pentagons/20 hexagons as the playing balls, merged into the table's one mesh."""
    ico = bmesh.new()
    bmesh.ops.create_icosphere(ico, subdivisions=1, radius=1.0)
    ico.verts.index_update()
    points = [v.co.copy().normalized() for v in ico.verts]
    faces = [[v.index for v in f.verts] for f in ico.faces]
    ico.free()
    near = [set() for _ in points]
    for side in faces:
        for i in range(3):
            a, b = side[i], side[(i + 1) % 3]
            near[a].add(b)
            near[b].add(a)
    def cut(a, b):
        return (2 * points[a] + points[b]).normalized()
    panels = []
    for i, normal in enumerate(points):
        across = normal.cross(Vector((0, 1, 0)) if abs(normal.y) < .9 else Vector((1, 0, 0))).normalized()
        up = normal.cross(across)
        corners = [cut(i, j) for j in near[i]]
        ordered = [(math.atan2(p.dot(up), p.dot(across)), k) for k, p in enumerate(corners)]
        ordered.sort()
        corners = [corners[k] for angle, k in ordered]
        panels.append((corners, tone('#20262a')))
    for a, b, c in faces:
        panels.append(([cut(a, b), cut(b, a), cut(b, c), cut(c, b), cut(c, a), cut(a, c)], tone('#f2eee4')))
    seam = tone('#555953')
    rotate = Matrix.Rotation(turn, 3, 'Z')
    vertices = {}

    def vertex(p):
        key = tuple(round(v, 7) for v in p)
        if key not in vertices:
            vertices[key] = put(part, centre + rotate @ (p * radius), seam)
        return vertices[key]

    def triangle(a, b, c, colour):
        if (b - a).cross(c - a).dot(a) < 0:
            b, c = c, b
        face(part, [vertex(a), vertex(b), vertex(c)], colour)

    def between(a, b, t):
        return (a * (1 - t) + b * t).normalized()
    for corners, colour in panels:
        middle = sum(corners, Vector()).normalized()
        inner = [(p * math.cos(.012) + (middle - p * middle.dot(p)).normalized() * math.sin(.012)) for p in corners]
        for i in range(len(corners)):
            j = (i + 1) % len(corners)
            for k in range(2):
                a, b = [between(corners[i], corners[j], t) * .992 for t in (k / 2, (k + 1) / 2)]
                c, d = [between(inner[i], inner[j], t) for t in (k / 2, (k + 1) / 2)]
                triangle(a, b, d, seam)
                triangle(a, d, c, seam)
            rows = [[(middle * (1 - row / 2) + inner[i] * ((row - col) / 2) + inner[j] * (col / 2)).normalized() for col in range(row + 1)] for row in range(3)]
            for row in range(2):
                for col in range(row + 1):
                    triangle(rows[row][col], rows[row + 1][col], rows[row + 1][col + 1], colour)
                    if col < row:
                        triangle(rows[row][col], rows[row + 1][col + 1], rows[row][col + 1], colour)


if wanted('kitbord'):
    part = new_part()
    PLANK = tone('#9a8060')
    LEG = tone('#6a5640')
    W = 1.9
    TOP = 1.1
    for i in range(5):
        y = -1.3 + i * 0.44
        timber(part, (-W, y, TOP - 0.12), (W, y + 0.42, TOP), lit(PLANK, 0.92 + 0.14 * rnd(i, 3.0)), i, grain=0.12)
    for x in (-W + 0.35, W - 0.35):
        timber(part, (x - 0.08, -1.2, TOP - 0.24), (x + 0.08, 0.8, TOP - 0.12), LEG, x)
        for y in (-1.15, 0.75):
            for lean in (-1.0, 1.0):
                tube(part, [Vector((x + lean * 0.06, y, TOP - 0.2)), Vector((x + lean * 0.32, y, 0.0))], [0.05, 0.05], [LEG, lit(LEG, 0.8)], 5)
        timber(part, (x - 0.04, -1.15, 0.38), (x + 0.04, 0.75, 0.46), lit(LEG, 0.9), x + 1.0)
    # On its back edge: folded bibs in a pile, and a net bag of balls against the wall of it.
    for k in range(4):
        timber(part, (0.6 - 0.02 * k, 0.55, TOP + 0.03 * k * 2), (1.3 + 0.02 * k, 0.86, TOP + 0.06 + 0.06 * k), lit(tone('#e0a020' if k % 2 else '#d84a20'), 0.95), k)
    for k in range(3):
        kit_football(part, Vector((-1.25 + 0.3 * k, 0.72, TOP + 0.16 + 0.05 * (k % 2))), 0.15, k * .53)
    finish(part, 'kitbord', sharp=40.0, strength=0.5, reach=0.4, floor=0.0, leaf=True)
