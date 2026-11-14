"""Aventyr 2's buildings that were still built in code (docs/aventyr-2-overhaul.md): Sjalevad's church far down the lake in
Stormens oga, the beaver's lodge on Alven's bank, Olympia's little store and its floodlight masts, and the road's power
poles at Billsta, each with the shade of its own creases baked into its colours.

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Each stands on
its origin, at the size the chapter gives it in EL, with its front towards -Y. Where the game lights a thing's glass
(src/content/aventyr2/buildings.ts, `panes`), the glass is not here: the game keeps its own panes, and lays them on the
walls where the windows here are. The numbers they share are marked SHARED. No letters, numbers or marks on anything.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)


def wanted(name):
    return ONLY is None or ONLY == name


def spun(v, angle):
    """A point turned about Z, the way the game turns a thing about its up."""
    c = math.cos(angle)
    s = math.sin(angle)
    return Vector((v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]))


def stand_up(part, plan, z0, z1, colour, top=None, high_colour=None):
    """A plan of points (x, y) stood up from z0 to z1: its sides in `colour` (and `high_colour` at its top, if given),
    and its top in `top`, if that is given. The plan may go round either way."""
    area = 0.0
    for i in range(len(plan)):
        a = plan[i]
        b = plan[(i + 1) % len(plan)]
        area += a[0] * b[1] - b[0] * a[1]
    if area < 0.0:
        plan = plan[::-1]
    low = [put(part, Vector((p[0], p[1], z0)), colour) for p in plan]
    high = [put(part, Vector((p[0], p[1], z1)), high_colour if high_colour is not None else colour) for p in plan]
    n = len(plan)
    for i in range(n):
        j = (i + 1) % n
        face(part, (low[i], low[j], high[j], high[i]))
    if top is not None:
        face(part, high, top)
    return high


def ring_of(apothem, z, sides=8, turn=0.0):
    """The corners of a regular polygon with a flat side towards -Y, going round counter-clockwise from above."""
    out = []
    wide = apothem / math.cos(math.pi / sides)
    for j in range(sides):
        a = -math.pi / 2.0 + math.pi / sides + TAU * j / sides + turn
        out.append(Vector((wide * math.cos(a), wide * math.sin(a), z)))
    return out


def sheet(part, corners, cols, rows, colours, lift=None):
    """A four-sided face (corners a, b, c, d going round its front) cut into a grid at the fractions `cols` (from a to b)
    and `rows` (from a to d), so that the shade baked into it can change across it. colours[r] is row r's colour, or a
    list with one for each column. `lift`, if given, is how far each point stands out from the face, [r][c]."""
    a, b, c, d = corners
    out = (b - a).cross(d - a)
    out.normalize()
    made = []
    for r in range(len(rows)):
        row = []
        for k in range(len(cols)):
            low = a + (b - a) * cols[k]
            high = d + (c - d) * cols[k]
            at = low + (high - low) * rows[r]
            if lift is not None:
                at = at + out * lift[r][k]
            colour = colours[r]
            if isinstance(colour, list):
                colour = colour[k]
            row.append(put(part, at, colour))
        made.append(row)
    for r in range(len(rows) - 1):
        for k in range(len(cols) - 1):
            face(part, (made[r][k], made[r][k + 1], made[r + 1][k + 1], made[r + 1][k]))
    return made


def steps(count):
    return [i / count for i in range(count + 1)]


def block(part, corners8, colour, faces=(0, 1, 2, 3, 4, 5)):
    """A block from its eight corners (the near four, then the far four, each going round counter-clockwise as seen
    from in front: low left, low right, high right, high left). `faces` picks which of its six sides are made."""
    v = [put(part, p, colour) for p in corners8]
    sides = ((0, 1, 2, 3), (5, 4, 7, 6), (4, 0, 3, 7), (1, 5, 6, 2), (3, 2, 6, 7), (4, 5, 1, 0))
    for i in faces:
        face(part, [v[k] for k in sides[i]])
    return v


# --- Sjalevad's church ---------------------------------------------------------------------------------------------------
# Far down the lake, as the lightning shows it (docs/aventyr-2-reference-study.md, section 1): an octagonal church of
# white boards on a granite plinth, a pilaster at each corner and an entablature round the top, a tall round-arched window
# in each wall, the door under a pediment in the wall towards the camera; a tent roof of dark sheet metal with standing
# seams and hips; over its middle an octagonal lantern storey with a window in each side, and on that a small bell turret
# with a pointed gable on each side and a slender spire with a gilded ball. 26 across its corners and its walls 18 high,
# as the chapter has it: the origin is the middle of its foot.

# SHARED with src/content/aventyr2/buildings.ts (`CHURCH`): the walls' apothem, a window's width and its sill, spring and
# head, the front window's sill, the lantern's apothem and its window.
CHURCH_R = 13.0
CHURCH_A = CHURCH_R * math.cos(math.pi / 8.0)
CHURCH_SIDE = 2.0 * CHURCH_R * math.sin(math.pi / 8.0)
WINDOW = {'wide': 3.0, 'sill': 5.2, 'spring': 11.5, 'front_sill': 9.6}
LANTERN = {'apothem': 4.0, 'wide': 1.4, 'sill': 28.5, 'spring': 30.6}

if wanted('kyrka'):
    part = new_part()
    PAINT = tone('#e8e5da')
    PAINT_LOW = tone('#cfcbbf')
    PAINT_HIGH = tone('#efede4')
    TRIM = tone('#f3f1e9')
    BAR = tone('#dedcd2')
    SILL = tone('#c9c6bc')
    GRANITE = tone('#7e7c76')
    GRANITE_DARK = tone('#5c5a56')
    SHEET = tone('#2e3238')
    SEAM = tone('#40454c')
    HIP = tone('#25292e')
    DOOR = tone('#4b3a2b')
    DOOR_DEEP = tone('#3a2c20')
    LOUVRE = tone('#1d1f23')
    GILT = tone('#c4a65a')
    A = CHURCH_A
    HALF = CHURCH_SIDE / 2.0
    PLINTH = 1.6
    TOP = 16.6
    OUT = 0.22

    def on_wall(k, x, out, z, apothem=CHURCH_A):
        """A point on wall k (0 is the one towards the camera, then round counter-clockwise from above): `x` along it
        from its middle, `out` out from it, `z` up."""
        return spun(Vector((x, -(apothem + out), z)), k * math.pi / 4.0)

    def wall_box(k, x0, x1, o0, o1, z0, z1, colour, apothem=CHURCH_A, back=False):
        corners = [on_wall(k, x0, o1, z0, apothem), on_wall(k, x1, o1, z0, apothem), on_wall(k, x1, o1, z1, apothem), on_wall(k, x0, o1, z1, apothem),
                   on_wall(k, x0, o0, z0, apothem), on_wall(k, x1, o0, z0, apothem), on_wall(k, x1, o0, z1, apothem), on_wall(k, x0, o0, z1, apothem)]
        block(part, corners, colour, (0, 1, 2, 3, 4, 5) if back else (0, 2, 3, 4, 5))

    def arch_band(k, cz, r0, r1, o0, o1, colour, count, apothem=CHURCH_A):
        """The round head of a window: a band from radius r0 to r1 about (0, cz) on wall k, standing from o0 to o1, with
        its face, and its inner and outer edges (only the outer, where it is a half disc)."""
        for i in range(count):
            a0 = math.pi * i / count
            a1 = math.pi * (i + 1) / count
            corners = [on_wall(k, r1 * math.cos(a0), o1, cz + r1 * math.sin(a0), apothem), on_wall(k, r1 * math.cos(a1), o1, cz + r1 * math.sin(a1), apothem),
                       on_wall(k, r0 * math.cos(a1), o1, cz + r0 * math.sin(a1), apothem), on_wall(k, r0 * math.cos(a0), o1, cz + r0 * math.sin(a0), apothem),
                       on_wall(k, r1 * math.cos(a0), o0, cz + r1 * math.sin(a0), apothem), on_wall(k, r1 * math.cos(a1), o0, cz + r1 * math.sin(a1), apothem),
                       on_wall(k, r0 * math.cos(a1), o0, cz + r0 * math.sin(a1), apothem), on_wall(k, r0 * math.cos(a0), o0, cz + r0 * math.sin(a0), apothem)]
            block(part, corners, colour, (0, 4, 5) if r0 > 0.0 else (0, 5))

    def window(k, wide, sill, spring, frame, apothem=CHURCH_A, bars=3, big=True):
        """A round-arched window on wall k: its frame standing out of the wall round the opening, the glazing bars
        over the glass (the glass itself is the game's), and the sill under it."""
        half = wide / 2.0
        head = spring + half
        wall_box(k, -half - frame, -half, 0.0, 0.12, sill, spring, TRIM, apothem)
        wall_box(k, half, half + frame, 0.0, 0.12, sill, spring, TRIM, apothem)
        arch_band(k, spring, half, half + frame, 0.0, 0.12, TRIM, 8 if big else 6, apothem)
        if big:
            # A keystone at the head.
            wall_box(k, -0.22, 0.22, 0.0, 0.18, head - 0.1, head + frame + 0.12, TRIM, apothem)
        wall_box(k, -half - frame - 0.15, half + frame + 0.15, 0.0, 0.3 if big else 0.2, sill - 0.28, sill, SILL, apothem)
        # The glazing bars: one up the middle into the head, across at the spring and between.
        wall_box(k, -0.06, 0.06, 0.02, 0.08, sill, head, BAR, apothem)
        wall_box(k, -half, half, 0.02, 0.08, spring - 0.06, spring + 0.06, BAR, apothem)
        for i in range(1, bars):
            z = sill + (spring - sill) * i / bars
            wall_box(k, -half, half, 0.02, 0.08, z - 0.05, z + 0.05, BAR, apothem)

    # The plinth of grey granite, darker at its foot, its top sloping in to the wall.
    base = ring_of(A + 0.45, 0.0)
    ring = ring_of(A + 0.45, PLINTH - 0.3)
    wall_foot = ring_of(A, PLINTH)
    skin(part, [base, ring, wall_foot], [GRANITE_DARK, GRANITE, lit(GRANITE, 1.1)])
    # The walls: each cut finer near its foot, its top and its corners, where its shade changes most.
    across = [0.0, 0.06, 0.14, 0.24, 0.36, 0.5, 0.64, 0.76, 0.86, 0.94, 1.0]
    up = [0.0, 0.03, 0.08, 0.16, 0.28, 0.42, 0.56, 0.7, 0.8, 0.88, 0.94, 0.98, 1.0]
    for k in range(8):
        tones = [blend(PAINT_LOW, PAINT, min(1.0, f * 6.0)) if f < 0.5 else blend(PAINT, PAINT_HIGH, (f - 0.5) * 2.0) for f in up]
        sheet(part, [on_wall(k, -HALF, 0.0, PLINTH), on_wall(k, HALF, 0.0, PLINTH), on_wall(k, HALF, 0.0, TOP), on_wall(k, -HALF, 0.0, TOP)],
              across, up, tones)
    # The battens over the boards' joints, up each wall between its pilasters, broken by its window and its door.
    BATTENS = 9
    for k in range(8):
        sill = WINDOW['front_sill'] if k == 0 else WINDOW['sill']
        head = WINDOW['spring'] + WINDOW['wide'] / 2.0 + 0.6
        for i in range(BATTENS):
            x = -HALF + 0.9 + (2.0 * HALF - 1.8) * (i + 0.5) / BATTENS
            runs = [(PLINTH, TOP)]
            if abs(x) < WINDOW['wide'] / 2.0 + 0.55:
                runs = [(PLINTH, sill - 0.3), (head, TOP)]
                if k == 0:
                    runs = [(head, TOP)]
            for z0, z1 in runs:
                if z1 - z0 > 0.2:
                    wall_box(k, x - 0.09, x + 0.09, 0.0, 0.06, z0, z1, lit(PAINT, 1.02))
    # A pilaster at each corner, wrapping it: a base, the shaft and a capital, each a step further out.
    for k in range(8):
        for o, z0, z1, wide, colour in ((OUT + 0.1, PLINTH, PLINTH + 0.8, 0.82, TRIM), (OUT, PLINTH + 0.8, TOP - 0.7, 0.7, TRIM),
                                         (OUT + 0.14, TOP - 0.7, TOP, 0.86, TRIM)):
            corner = on_wall(k, HALF, 0.0, 0.0)
            reach = (corner.length + o / math.cos(math.pi / 8.0)) / corner.length
            plan = [on_wall(k, HALF - wide, 0.0, 0.0), on_wall(k, HALF - wide, o, 0.0), corner * reach,
                    on_wall(k + 1, -HALF + wide, o, 0.0), on_wall(k + 1, -HALF + wide, 0.0, 0.0)]
            stand_up(part, [(p[0], p[1]) for p in plan], z0, z1, lit(colour, 0.97), top=colour if z1 == TOP or z1 == PLINTH + 0.8 else None)
    # The entablature: a frieze flush with the pilasters, and a cornice stepping out under the eaves.
    skin(part, [ring_of(A + OUT, TOP), ring_of(A + OUT, TOP + 0.75)], [PAINT, PAINT_HIGH])
    skin(part, [ring_of(A + OUT, TOP + 0.75), ring_of(A + OUT + 0.3, TOP + 0.75), ring_of(A + OUT + 0.3, TOP + 0.95),
                ring_of(A + OUT + 0.75, TOP + 1.25), ring_of(A + OUT + 0.75, TOP + 1.45)],
         [lit(TRIM, 0.8), lit(TRIM, 0.85), TRIM, TRIM, TRIM])
    EAVES = TOP + 1.45
    # The windows: a tall one in every wall, and over the door a shorter one.
    for k in range(8):
        window(k, WINDOW['wide'], WINDOW['front_sill'] if k == 0 else WINDOW['sill'], WINDOW['spring'], 0.38)
    # The door under its pediment, in the wall towards the camera, up three granite steps: its two leaves, each with two
    # raised panels, set back in a white casing.
    wall_box(0, -1.4, 1.4, 0.0, 0.06, PLINTH, PLINTH + 5.2, DOOR_DEEP)
    for x0 in (-1.36, 0.02):
        wall_box(0, x0, x0 + 1.34, 0.06, 0.1, PLINTH + 0.02, PLINTH + 5.16, DOOR)
        for z0, z1 in ((PLINTH + 0.45, PLINTH + 2.2), (PLINTH + 2.6, PLINTH + 4.75)):
            wall_box(0, x0 + 0.22, x0 + 1.12, 0.1, 0.14, z0, z1, lit(DOOR, 1.14))
    for x0, x1 in ((-1.8, -1.4), (1.4, 1.8)):
        wall_box(0, x0, x1, 0.0, 0.24, PLINTH, PLINTH + 5.6, TRIM)
    wall_box(0, -1.4, 1.4, 0.0, 0.24, PLINTH + 5.2, PLINTH + 5.6, TRIM)
    wall_box(0, -2.1, 2.1, 0.0, 0.34, PLINTH + 5.6, PLINTH + 6.0, TRIM)
    gable = [on_wall(0, -2.25, 0.36, PLINTH + 6.0), on_wall(0, 2.25, 0.36, PLINTH + 6.0), on_wall(0, 0.0, 0.36, PLINTH + 7.3)]
    back_ = [on_wall(0, -2.25, 0.0, PLINTH + 6.0), on_wall(0, 2.25, 0.0, PLINTH + 6.0), on_wall(0, 0.0, 0.0, PLINTH + 7.3)]
    front_ = [put(part, p, TRIM) for p in gable]
    rear = [put(part, p, TRIM) for p in back_]
    face(part, front_)
    face(part, (rear[0], front_[0], front_[2], rear[2]))
    face(part, (front_[1], rear[1], rear[2], front_[2]))
    face(part, (rear[0], rear[1], front_[1], front_[0]))
    for i in range(3):
        wall_box(0, -2.4 + i * 0.25, 2.4 - i * 0.25, 0.0, 0.45 + 2.4 - i * 0.8, PLINTH * i / 3.0, PLINTH * (i + 1) / 3.0, lit(GRANITE, 1.05 - 0.05 * i))

    # The tent roof: eight planes of dark sheet metal from the eaves up to the lantern, each with its standing seams, and a
    # hip over each of its corners.
    ROOF_TOP = 26.8
    INNER = LANTERN['apothem'] + 0.2
    eave = ring_of(A + 1.35, EAVES - 0.15)
    edge = ring_of(A + 1.35, EAVES + 0.12)
    crown = ring_of(INNER, ROOF_TOP)
    skin(part, [ring_of(A + OUT + 0.75, EAVES - 0.05), eave, edge], [lit(SHEET, 0.7), lit(SHEET, 0.85), SHEET])
    SEAMS = 7
    rows = [0.0, 0.1, 0.3, 0.55, 0.8, 1.0]
    for k in range(8):
        a = edge[k]
        b = edge[(k + 1) % 8]
        c = crown[(k + 1) % 8]
        d = crown[k]
        cols = []
        for s in range(SEAMS + 1):
            mid = s / SEAMS
            if 0 < s < SEAMS:
                cols += [mid - 0.012, mid, mid + 0.012]
            else:
                cols.append(mid)
        lift = [[0.07 if (i % 3 == 2) else 0.0 for i in range(len(cols))] for _ in rows]
        tones = [[SEAM if (i % 3 == 2) else lit(SHEET, 0.94 + 0.12 * rnd(k, i // 3)) for i in range(len(cols))] for _ in rows]
        sheet(part, [a, b, c, d], cols, rows, tones, lift)
        tube(part, [edge[k] + Vector((0.0, 0.0, 0.05)), crown[k] + Vector((0.0, 0.0, 0.05))], [0.16, 0.12], [HIP, HIP], 4)

    # The lantern storey: eight white walls, each with a pilaster at its corners and a round-arched window, under a cornice.
    LA = LANTERN['apothem']
    LHALF = LA * math.tan(math.pi / 8.0)
    LTOP = 32.5
    for k in range(8):
        sheet(part, [on_wall(k, -LHALF, 0.0, ROOF_TOP - 0.4, LA), on_wall(k, LHALF, 0.0, ROOF_TOP - 0.4, LA),
                     on_wall(k, LHALF, 0.0, LTOP, LA), on_wall(k, -LHALF, 0.0, LTOP, LA)],
              steps(4), [0.0, 0.12, 0.3, 0.6, 0.85, 1.0], [PAINT_LOW, PAINT, PAINT, PAINT, PAINT_HIGH, PAINT_HIGH])
        corner = on_wall(k, LHALF, 0.0, 0.0, LA)
        reach = (corner.length + 0.12 / math.cos(math.pi / 8.0)) / corner.length
        plan = [on_wall(k, LHALF - 0.3, 0.0, 0.0, LA), on_wall(k, LHALF - 0.3, 0.12, 0.0, LA), corner * reach,
                on_wall(k + 1, -LHALF + 0.3, 0.12, 0.0, LA), on_wall(k + 1, -LHALF + 0.3, 0.0, 0.0, LA)]
        stand_up(part, [(p[0], p[1]) for p in plan], ROOF_TOP - 0.4, LTOP, TRIM)
        window(k, LANTERN['wide'], LANTERN['sill'], LANTERN['spring'], 0.22, LA, bars=2, big=False)
    skin(part, [ring_of(LA + 0.12, LTOP), ring_of(LA + 0.12, LTOP + 0.35), ring_of(LA + 0.45, LTOP + 0.6), ring_of(LA + 0.45, LTOP + 0.75)],
         [PAINT, PAINT_HIGH, TRIM, TRIM])
    # Its own low tent roof, up to the bell turret.
    TURRET = 1.75
    THALF = TURRET * math.tan(math.pi / 8.0)
    T0 = LTOP + 2.3
    lantern_eave = ring_of(LA + 0.6, LTOP + 0.7)
    lantern_crown = ring_of(TURRET + 0.1, T0)
    for k in range(8):
        cols = [0.0, 0.24, 0.25, 0.26, 0.49, 0.5, 0.51, 0.74, 0.75, 0.76, 1.0]
        lift = [[0.05 if i in (2, 5, 8) else 0.0 for i in range(len(cols))] for _ in range(3)]
        tones = [[SEAM if i in (2, 5, 8) else SHEET for i in range(len(cols))] for _ in range(3)]
        sheet(part, [lantern_eave[k], lantern_eave[(k + 1) % 8], lantern_crown[(k + 1) % 8], lantern_crown[k]], cols, [0.0, 0.5, 1.0], tones, lift)
        tube(part, [lantern_eave[k] + Vector((0.0, 0.0, 0.04)), lantern_crown[k] + Vector((0.0, 0.0, 0.04))], [0.1, 0.08], [HIP, HIP], 4)
    # The bell turret: small white walls with a dark louvred opening in each, a pointed gable over each side, and the
    # slender spire rising out of the gables, with a gilded ball on its point.
    T1 = T0 + 2.6
    for k in range(8):
        sheet(part, [on_wall(k, -THALF, 0.0, T0 - 0.5, TURRET), on_wall(k, THALF, 0.0, T0 - 0.5, TURRET),
                     on_wall(k, THALF, 0.0, T1, TURRET), on_wall(k, -THALF, 0.0, T1, TURRET)],
              [0.0, 0.5, 1.0], [0.0, 0.5, 1.0], [PAINT, PAINT, PAINT_HIGH])
        wall_box(k, -0.36, 0.36, 0.0, 0.04, T0 + 0.35, T1 - 0.8, LOUVRE, TURRET)
        arch_band(k, T1 - 0.8, 0.0, 0.36, 0.0, 0.04, LOUVRE, 4, TURRET)
        for i in range(4):
            z = T0 + 0.6 + i * 0.36
            wall_box(k, -0.36, 0.36, 0.04, 0.09, z, z + 0.08, lit(PAINT, 0.6), TURRET)
        # The gable: a white triangle on the side's top, under two dark rake boards.
        left = on_wall(k, -THALF, 0.06, T1, TURRET)
        right = on_wall(k, THALF, 0.06, T1, TURRET)
        apex = on_wall(k, 0.0, 0.06, T1 + 1.15, TURRET)
        tri = [put(part, left, PAINT_HIGH), put(part, right, PAINT_HIGH), put(part, apex, PAINT_HIGH)]
        face(part, tri)
        tube(part, [left + (left - apex) * 0.1, apex + Vector((0.0, 0.0, 0.04))], [0.08, 0.08], [HIP, HIP], 4)
        tube(part, [apex + Vector((0.0, 0.0, 0.04)), right + (right - apex) * 0.1], [0.08, 0.08], [HIP, HIP], 4)
    # The spire rises from the turret's top, behind the gables.
    SPIRE = T1 + 9.0
    across_corners = 1.0 / math.cos(math.pi / 8.0)
    lathe(part, [(TURRET * across_corners, T1), (TURRET * 0.62 * across_corners, T1 + 1.5), (0.32, SPIRE - 1.0), (0.0, SPIRE)], 8,
          Matrix.Rotation(math.pi / 8.0, 4, 'Z'), [SHEET, SHEET, lit(SHEET, 1.1), lit(SHEET, 1.1)])
    lump(part, Vector((0.0, 0.0, SPIRE + 0.25)), (0.3, 0.3, 0.3), 1, GILT)
    tube(part, [Vector((0.0, 0.0, SPIRE + 0.4)), Vector((0.0, 0.0, SPIRE + 1.6))], [0.05, 0.02], [GILT, GILT], 4)
    finish(part, 'kyrka', sharp=40.0, strength=0.55, reach=1.6, floor=0.0, recalc=False)


# --- the beaver's lodge on Alven's bank ----------------------------------------------------------------------------------
# A real beaver lodge (Olov, 14 November 2026: "Baverhyddan behover fa battre design och texturer"): a broad dome of
# interlaced sticks and branches of many thicknesses, most of them peeled pale by the beaver and gnawed to a blunt point,
# some grey with age, some still in their bark, a few birch white; packed with dark mud, wet at the water and drier up
# the crown; wet leaves plastered on it, a few green sprigs the beaver has dragged home, and an apron of sticks down its
# front into the water, where a few float. It was a mound of mud with long sharpened poles standing out of it.
#
# The chapter's own ground is what he walks on (src/content/aventyr2/chapters/alven.ts: the two steps, the lodge's top
# and its far side down to the shore), a ridge that runs straight back from the path. The lodge is laid over that ridge:
# behind the path a shelf where the gnawed trunks stand, and the dome rising from it to its crown; in front of the path
# the ridge's own slope towards the camera, covered, and on down into the water. The strip he walks (LODGE_BAND) is left
# to the ground, so that his shadow and the rain's rings are seen on it, and nothing of the lodge stands over it.
#
# Its origin is the middle of its foot at the current's water; the play plane is 7 in front of it (towards -Y). `d` is
# how far towards the camera a place is from its middle, so the path is at d 7. 21 across at its foot, made for 18 as
# the chapter has it (the fit is 1).

# SHARED with src/content/aventyr2/chapters/alven.ts (FAR_BANK, STUMP1, STUMP2, LODGE, SLOPE_END, SHORE, and the lodge
# at x 122.4, y -0.4): where the ground he walks on is, from the lodge's middle, over its origin.
LODGE_WALK = {'bank': 0.4, 'step1': (-6.0, 1.3), 'step2': (-4.4, 2.2), 'top': (-2.6, 1.2, 5.2), 'shore': 8.6}
# SHARED with src/content/aventyr2/beaver.ts (SUMMIT): where the beaver comes out on top, (x, d, height). It is the
# lodge's highest place, a little dished and bare, with nothing standing between it and the camera.
LODGE_SUMMIT = (-0.25, -1.2, 7.85)
# SHARED with src/render/dressing/ground.ts (PROFILE_FOREST, `slopeDrop`): how far under the path the ground lies in
# front of it, by how far in front (tests/unit/aventyr2-lodge-kit.test.ts holds the two together).
LODGE_FALL = ((0.45, 0.0), (0.5, 0.005), (0.9, 0.04), (1.5, 0.22), (2.2, 0.55), (3.0, 1.0), (3.8, 1.6), (4.6, 2.6), (5.0, 3.1))
# SHARED with the same file (EDGE, DRAW_BACK, `forwardAt`): where the level ground ends in front of the path, and how far
# from the top of a wall the ground's front is drawn back towards the path, so that what is at the wall's foot is seen.
LODGE_EDGE = 0.45
LODGE_DRAWN = 2.5
# The strip left to the ground he walks on (d from, to): from 0.75 behind the path's line to 0.62 in front of it.
LODGE_BAND = (6.25, 7.62)
# Behind the path: the shelf ends and the dome begins here; over the banks at its two ends the dome begins further back,
# where the beaver sits on the left and the reeds stand on the right. Its back, and how far in front it reaches.
LODGE_D = {'shelf': 4.4, 'left': 3.0, 'right': 3.6, 'back': -7.4, 'front': 13.7}
# Its crest along the path, as high as the dome is at each x: a broad round back, its crown at the summit.
LODGE_CREST = ((-10.4, 0.3), (-9.4, 1.3), (-8.2, 2.6), (-6.8, 4.2), (-5.4, 5.6), (-4.0, 6.7), (-2.6, 7.4), (-1.2, 7.78),
               (-0.25, 7.85), (1.0, 7.74), (2.4, 7.3), (3.8, 6.5), (5.2, 5.4), (6.6, 4.1), (8.0, 2.7), (9.2, 1.4), (10.4, 0.3))
# The gnawed trunks that stand on the shelf by the steps (the nature kit's, placed by the chapter), and where the beaver
# sits on the bank: nothing of the lodge's sticks lies there. (x, d, how far round.)
LODGE_KEEP = ((-4.9, 5.0, 1.15), (-2.9, 5.0, 1.15), (-7.2, 4.4, 1.9))


def eased(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def lodge_walk(x):
    """How high over the lodge's origin the ground he walks on is at x: the bank, the two steps, the top, the far side."""
    w = LODGE_WALK
    if x < w['step1'][0]:
        return w['bank']
    if x < w['step2'][0]:
        return w['step1'][1]
    if x < w['top'][0]:
        return w['step2'][1]
    if x <= w['top'][1]:
        return w['top'][2]
    if x < w['shore']:
        return w['top'][2] - (x - w['top'][1]) * (w['top'][2] - w['bank']) / (w['shore'] - w['top'][1])
    return w['bank']


def lodge_inside(x):
    return LODGE_WALK['step1'][0] <= x <= LODGE_WALK['shore']


def lodge_water(x):
    """The river's surface at x, over the lodge's origin: it falls from the rapids to the lake (the chapter's `water`)."""
    return 0.025 + 0.0083 * x


def lodge_lumps(x, d, h, base):
    """The dome's own unevenness, none at its foot: broad swells and smaller heaps."""
    rough = (noise(x * 0.5, d * 0.5, 3.0) - 0.5) * 0.9 + (noise(x * 1.3, d * 1.3, 9.0) - 0.5) * 0.36 + (noise(x * 2.9, d * 2.9, 4.0) - 0.5) * 0.14
    return rough * min(1.0, max(0.0, h - base) / 1.3)


def lodge_back(x, d):
    """The lodge behind the path at x and d: the shelf, the dome up to its crown, and down behind it. None where it has
    not begun, over the banks at its two ends."""
    walk = lodge_walk(x)
    inside = lodge_inside(x)
    begins = LODGE_D['shelf'] if inside else (LODGE_D['left'] if x < 0.0 else LODGE_D['right'])
    if d > begins:
        if not inside:
            return None
        # The shelf: from just under the path's edge up onto it, a hand over the ground.
        k = eased((LODGE_BAND[0] - d) / 0.45)
        return walk - 0.08 + 0.2 * k
    base = walk + (0.12 if inside else -0.25)
    crest = max(along(LODGE_CREST, x), base)
    sx, sd, sh = LODGE_SUMMIT
    if d >= sd:
        t = (begins - d) / (begins - sd)
        h = base + (crest - base) * (1.0 - (1.0 - t) ** 2.2)
    else:
        u = (sd - d) / (sd - LODGE_D['back'])
        h = base + (crest - base) * max(0.0, 1.0 - u * u)
    h += lodge_lumps(x, d, h, base)
    # The crown: nothing is higher than the summit, and round it the dome is bare and a little dished.
    far = math.hypot(x - sx, d - sd)
    h = min(h, sh - 0.05 - 0.035 * far)
    if far < 2.1:
        dish = sh - 0.1 * max(0.0, far - 0.75)
        h = dish + (min(h, dish) - dish) * eased((far - 0.75) / 1.35)
    return max(h, base if inside else -0.6)


def lodge_forward(x):
    """How far forward the ground's front comes at x, from 0 to 1, and the height of the level below the wall that draws
    it back (None where it comes all the way): the top of each step's wall is drawn back, for 2.5 to its right."""
    w = LODGE_WALK
    forward = 1.0
    below = None
    for wall, low in ((w['step1'][0], w['bank']), (w['step2'][0], w['step1'][1]), (w['top'][0], w['step2'][1])):
        away = x - wall
        if away >= 0.0 and away < LODGE_DRAWN and eased(away / LODGE_DRAWN) < forward:
            forward = eased(away / LODGE_DRAWN)
            below = low
    return forward, below


def lodge_front(x, z):
    """What lies in front of the path at x, z in front of its line, for the lodge's sticks and leaves to lie on. Where
    the ground's front comes all the way forward it is the lodge's own mud, laid a little over the ground's slope and on
    down into the water (`lodge_covers`). Where the ground's front is drawn back at the top of a wall, it is the ground
    itself as far as that reaches: that corner is the ground's own, kept open, and the lodge lays no mud there. None
    beside the lodge, and none in front of a wall's top."""
    if not lodge_inside(x):
        return None
    walk = lodge_walk(x)
    forward, below = lodge_forward(x)
    whole = LODGE_EDGE + (z - LODGE_EDGE) / max(forward, 0.04)
    if forward < 0.999:
        return walk - along(LODGE_FALL, whole) if forward > 0.45 and whole < 4.4 else None
    # A little over the ground, more of it further out; none where it begins beside the drawn-back corner, and none
    # where the far side has come down to the shore.
    begins = eased((x - LODGE_WALK['top'][0] - LODGE_DRAWN) / 1.2) * min(1.0, (LODGE_WALK['shore'] - x) / 1.2)
    over = 0.014 + (0.05 * eased((z - 0.62) / 1.0) + 0.13 * eased((z - 2.0) / 1.6)) * begins
    h = walk - along(LODGE_FALL, min(z, 5.0)) + over
    h += max(0.0, noise(x * 1.1, z * 1.1, 6.0) - 0.45) * 0.32 * eased((z - 1.6) / 1.4) * begins
    if z > 5.0:
        h += (-0.6 - h) * eased((z - 5.0) / 1.6)
    return max(-0.6, h)


def lodge_covers(x):
    """Whether the lodge lays its own mud in front of the path at x: where the ground's front comes all the way forward."""
    return lodge_inside(x) and lodge_forward(x)[0] >= 0.999


def lodge_height(x, d):
    """How high the lodge is at x along the path and d towards the camera from its middle (d is -Y). None where there is
    none of it: on the strip he walks, and beside it over the banks."""
    if d > LODGE_BAND[0] and d < LODGE_BAND[1]:
        return None
    if d >= LODGE_BAND[1]:
        return lodge_front(x, d - 7.0)
    return lodge_back(x, d)


def lodge_kept(x, d):
    """Whether a place is one the lodge's sticks keep off: the gnawed trunks, the beaver's seat, the summit."""
    for kx, kd, kr in LODGE_KEEP:
        if math.hypot(x - kx, d - kd) < kr:
            return True
    return math.hypot(x - LODGE_SUMMIT[0], d - LODGE_SUMMIT[1]) < 1.35


if wanted('baverhydda'):
    part = new_part()
    MUD_WET = tone('#1c1611')
    MUD = tone('#4b3a29')
    MUD_DRY = tone('#665443')
    MUD_PALE = tone('#78664f')
    PEELED = tone('#cdbaa0')
    PEELED_OLD = tone('#a89f92')
    GREY = tone('#827d76')
    ALDER = tone('#573d30')
    WILLOW = tone('#6c5b47')
    BIRCH = tone('#d4cfc3')
    GNAWED = tone('#e8d6b4')
    HEART = tone('#b89a64')
    LEAVES = (tone('#c9a53a'), tone('#b9772b'), tone('#8a5a2c'), tone('#d4b84a'), tone('#6f4a2a'))
    GREENS = (tone('#4f7d33'), tone('#6c9942'), tone('#3f6a2f'))
    SX, SD, SH = LODGE_SUMMIT
    WALLS = (LODGE_WALK['step1'][0], LODGE_WALK['step2'][0], LODGE_WALK['top'][0])

    def mud_at(x, d, h):
        """The mud's colour at a place: wet and near black at the water, drier and paler up the crown, in patches."""
        water = lodge_water(x)
        wet = 1.0 - min(1.0, max(0.0, h - water) / 1.5)
        dry = min(1.0, max(0.0, (h - 3.2) / 4.2)) * (0.5 + 0.9 * noise(x * 0.8, d * 0.8, 5.0))
        colour = blend(blend(MUD, MUD_WET, wet ** 0.7), MUD_DRY, dry)
        colour = blend(colour, MUD_PALE, max(0.0, noise(x * 1.4, d * 1.4, 7.0) - 0.6) * 2.2 * min(1.0, h / 4.0))
        # Darker in its hollows, where the wet stays.
        return lit(colour, 0.82 + 0.3 * noise(x * 2.3, d * 2.3, 2.0))

    def columns(x0, x1, step):
        """The grid's columns from x0 to x1, with one on each side of every wall of the steps, so that each wall is a
        face of its own."""
        out = []
        x = x0
        while x < x1 - 0.001:
            out.append(round(x, 3))
            x += step
        out.append(x1)
        for wall in WALLS:
            if x0 < wall < x1:
                out = [v for v in out if abs(v - wall) > 0.12] + [wall - 0.004, wall + 0.004]
        return sorted(out)

    def sheet_of(xs, ds, covers=False):
        """The mud over a grid of columns and rows: a face wherever all four of its corners are there. In front of the
        path only where the lodge lays its own mud (`covers`)."""
        rows = []
        for d in ds:
            row = []
            for x in xs:
                h = lodge_height(x, d) if not covers or lodge_covers(x) else None
                row.append(None if h is None else put(part, Vector((x, -d, h)), mud_at(x, d, h)))
            rows.append(row)
        for j in range(len(ds) - 1):
            for i in range(len(xs) - 1):
                a, b, c, e = rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1], rows[j][i]
                if a is None or b is None or c is None or e is None:
                    continue
                # Wound so that it faces up: from in front, the row nearer the camera is j + 1.
                face(part, (a, b, c, e))
        return rows

    # The mud behind the path: the shelf and the dome, cut finer where it rises fastest.
    XS = columns(-10.6, 10.6, 0.42)
    DS = [LODGE_D['back'], -6.6, -5.6, -4.6, -3.7, -2.9, -2.2, -1.6, -1.2, -0.8, -0.3, 0.3, 0.9, 1.5, 2.1, 2.6, 3.0, 3.3, 3.6, 3.9, 4.15,
          4.4, 4.9, 5.4, 5.8, LODGE_BAND[0]]
    back = sheet_of(XS, DS)
    # Its hem behind and at its two ends, pulled down so that no gap shows under it.
    for i in range(len(XS) - 1):
        a, b = back[0][i], back[0][i + 1]
        if a is not None and b is not None:
            low = [put(part, Vector((v.co.x, v.co.y + 0.3, -0.8)), MUD_WET) for v in (a, b)]
            face(part, (a, b, low[1], low[0]))
    # Its left side over the bank, from where the dome begins there to the path: a wall of its own, the first step's.
    first = XS.index(LODGE_WALK['step1'][0] + 0.004)
    for j in range(len(DS) - 1):
        a, b = back[j][first], back[j + 1][first]
        if a is None or b is None or (back[j][first - 1] is not None and back[j + 1][first - 1] is not None):
            continue
        low = [put(part, Vector((v.co.x, v.co.y, LODGE_WALK['bank'] - 0.2)), MUD_WET) for v in (a, b)]
        face(part, (b, a, low[0], low[1]))
    # The mud in front of the path: over the ground's slope, and down under the water.
    FX = columns(LODGE_WALK['top'][0] + LODGE_DRAWN, LODGE_WALK['shore'], 0.42)
    FZ = [0.62, 0.8, 1.05, 1.35, 1.7, 2.1, 2.5, 2.9, 3.3, 3.7, 4.1, 4.5, 4.9, 5.25, 5.6, 5.95, 6.3, 6.7]
    front = sheet_of(FX, [7.0 + z for z in FZ], covers=True)
    # --- the sticks ---------------------------------------------------------------------------------------------------
    # Each lies on the lodge the way it was pushed into it: most down its slope or a little across it, some right across,
    # so that they lace over each other; sunk into the mud by a third of their thickness, long ones bent over it. One end
    # is gnawed to a blunt point, pale; the other is gnawed too, or broken off, or runs out into a twig. Behind the path,
    # where they are seen sharp, many are peeled and pale; in front of it, on the wet apron down to the water, they are
    # dark with mud and water, so that nothing bright stands between him and the camera.
    def rod(points, radii, tones, sides):
        """A stick along its points, lighter on its top than under it: its roundness is in its colours."""
        made = tube(part, points, radii, tones, sides, closed_ends=False)
        for i in range(len(made)):
            for vert in made[i]:
                rise = (vert.co.z - points[i].z) / max(0.001, radii[i])
                part['paint'][vert] = lit(part['paint'][vert], 0.74 + 0.3 * max(-1.0, min(1.0, rise)) * 0.5 + 0.15)
        return made

    def stick(n, x0, d0, long, thick, lift=0.0):
        """One stick with its middle at (x0, d0). Gives False if it cannot lie there."""
        h0 = lodge_height(x0, d0)
        if h0 is None:
            return False
        gx_a = lodge_height(x0 + 0.3, d0)
        gx_b = lodge_height(x0 - 0.3, d0)
        gd_a = lodge_height(x0, d0 + 0.3)
        gd_b = lodge_height(x0, d0 - 0.3)
        if gx_a is None or gx_b is None or gd_a is None or gd_b is None:
            return False
        gx = gx_a - gx_b
        gd = gd_a - gd_b
        down = math.atan2(-gd, -gx) if abs(gx) + abs(gd) > 0.02 else TAU * rnd(n, 4.0)
        pick = rnd(n, 6.0)
        if pick < 0.5:
            heading = down + (rnd(n, 5.0) - 0.5) * 1.1
        elif pick < 0.8:
            heading = down + math.pi / 2.0 + (rnd(n, 5.0) - 0.5) * 1.3
        else:
            heading = TAU * rnd(n, 7.0)
        ux = math.cos(heading)
        ud = math.sin(heading)
        places = []
        count = 2 if long < 1.5 else 3 if long < 3.6 else 4
        for k in range(count):
            f = k / (count - 1.0) - 0.5
            px = x0 + ux * long * f
            pd = d0 + ud * long * f
            ph = lodge_height(px, pd)
            if ph is None or abs(px) > 10.3 or lodge_kept(px, pd):
                return False
            places.append((px, pd, ph))
        # Never across the strip he walks, and by it only what lies low: nothing stands over his feet.
        side = places[0][1] >= LODGE_BAND[1]
        for px, pd, ph in places:
            if (pd >= LODGE_BAND[1]) != side:
                return False
        near = min(abs(pd - 7.0) for px, pd, ph in places)
        if side and thick > (0.075 if near < 2.4 else 0.11):
            return False
        if near < 1.5 and not side and thick > 0.1:
            return False
        # Round the summit and between it and the camera nothing rises: the beaver is seen whole there.
        sight = False
        for px, pd, ph in places:
            if abs(px - SX) < 2.4 and pd > SD - 0.6 and pd < LODGE_D['shelf'] + 0.5:
                sight = True
                if ph + thick * 1.4 > SH - 0.06 - 0.03 * max(0.0, pd - SD):
                    return False
        sunk = thick * (0.45 if side else 0.3 if thick > 0.07 else 0.1)
        path = []
        for k in range(count):
            px, pd, ph = places[k]
            path.append(Vector((px, -pd, ph + thick - sunk)))
        # Straight between its ends where the lodge falls away under it; never through the lodge.
        a = path[0]
        b = path[-1]
        for k in range(1, count - 1):
            f = k / (count - 1.0)
            straight = a.z + (b.z - a.z) * f
            path[k].z = max(path[k].z, straight - 0.03 * long * (1.0 - abs(f - 0.5) * 2.0))
        # Some stand out of it at one end.
        if lift > 0.0 and not sight and not side and near > 2.6 and min(math.hypot(px - SX, pd - SD) for px, pd, ph in places) > 3.4:
            for k in range(count):
                path[k].z += lift * (k / (count - 1.0)) ** 1.6
        tint = rnd(n, 12.0)
        if tint < 0.34:
            colour = blend(PEELED, PEELED_OLD, rnd(n, 13.0) * 0.8)
        elif tint < 0.6:
            colour = blend(PEELED_OLD, GREY, rnd(n, 14.0))
        elif tint < 0.93:
            colour = blend(ALDER, WILLOW, rnd(n, 15.0))
        else:
            colour = BIRCH
        colour = lit(colour, 0.8 + 0.3 * rnd(n, 19.0))
        gnawed = GNAWED
        if side:
            # On the apron: soaked, and plastered with mud.
            colour = blend(lit(colour, 0.66), MUD, 0.38)
            gnawed = blend(GNAWED, MUD, 0.72)
        water = lodge_water(x0)
        way = b - a
        way.normalize()
        points = [a - way * (thick * 1.5), a]
        radii = [thick * 0.22, thick]
        tones = [gnawed, blend(gnawed, colour, 0.4)]
        for k in range(1, count - 1):
            points.append(path[k])
            radii.append(thick * (0.98 - 0.1 * k / count))
            # Stained with mud where it lies deep, and dark where the water has it.
            stain = 0.1 + 0.3 * rnd(n, 20.0 + k)
            wet = 1.0 - min(1.0, max(0.0, path[k].z - water) / 0.5)
            tones.append(blend(blend(colour, MUD, stain), MUD_WET, 0.75 * wet))
        end = rnd(n, 16.0)
        wet_b = 1.0 - min(1.0, max(0.0, b.z - water) / 0.5)
        tail = blend(colour, MUD_WET, 0.75 * wet_b)
        if end < 0.45:
            # Gnawed at this end too.
            points += [b, b + way * (thick * 1.5)]
            radii += [thick * 0.86, thick * 0.2]
            tones += [blend(gnawed, tail, 0.45), blend(gnawed, MUD_WET, 0.6 * wet_b)]
        elif end < 0.75 or thick > 0.085:
            # Broken off: its pale wood shows in its end.
            points += [b, b + way * (thick * 0.25)]
            radii += [thick * 0.84, thick * 0.08]
            tones += [tail, blend(blend(HEART, MUD, 0.5 if side else 0.0), MUD_WET, 0.6 * wet_b)]
        else:
            # It runs out into a twig.
            points += [b, b + way * (0.3 + long * 0.12) + Vector((0.0, 0.0, 0.06))]
            radii += [thick * 0.6, thick * 0.12]
            tones += [tail, tail]
        rod(points, radii, tones, 6 if thick > 0.1 else 5 if thick > 0.062 else 4 if thick > 0.036 else 3)
        return True

    made = {'logs': 0, 'branches': 0, 'twigs': 0}
    # Of each kind: how many, how long at least and how much longer at most, how thick at least and how much thicker.
    wanted_sticks = (('logs', 44, 3.0, 3.4, 0.1, 0.075), ('branches', 250, 1.7, 2.9, 0.045, 0.042), ('twigs', 250, 0.8, 1.7, 0.02, 0.022))
    for kind, count, short, more, thin, fatter in wanted_sticks:
        n = 0
        seed = {'logs': 100.0, 'branches': 300.0, 'twigs': 700.0}[kind]
        while made[kind] < count and n < 9000:
            n += 1
            x0 = -10.0 + 20.0 * rnd(n, seed + 1.0)
            # Most of them up the dome's face behind the path, where they are seen; fewer on the apron; few behind its crown.
            share = rnd(n, seed + 2.0)
            if share < 0.3:
                d0 = LODGE_BAND[1] + 0.2 + (LODGE_D['front'] - LODGE_BAND[1] - 1.2) * rnd(n, seed + 3.0) ** 0.8
            elif share < 0.93:
                d0 = SD + (LODGE_BAND[0] - 0.2 - SD) * rnd(n, seed + 3.0)
            else:
                d0 = LODGE_D['back'] + 1.0 + (SD - LODGE_D['back'] - 1.0) * rnd(n, seed + 3.0)
            long = short + more * rnd(n, seed + 8.0) ** 1.5
            thick = thin + fatter * rnd(n, seed + 9.0) ** 1.4
            lift = (0.2 + 0.7 * rnd(n, seed + 11.0)) if rnd(n, seed + 10.0) < 0.2 else 0.0
            if stick(n + seed * 13.0, x0, d0, long, thick, lift):
                made[kind] += 1

    # The apron's foot: sticks out of the lodge's front down into the water, dark with it, and a few afloat before it.
    apron = 0
    n = 0
    while apron < 26 and n < 600:
        n += 1
        x0 = LODGE_WALK['top'][0] + LODGE_DRAWN + 0.3 + (LODGE_WALK['shore'] - LODGE_WALK['top'][0] - LODGE_DRAWN - 0.9) * rnd(n, 41.0)
        z0 = 3.9 + 1.5 * rnd(n, 42.0)
        h0 = lodge_front(x0, z0)
        if h0 is None or not lodge_covers(x0):
            continue
        water = lodge_water(x0)
        long = 1.5 + 1.7 * rnd(n, 43.0)
        thick = 0.045 + 0.06 * rnd(n, 44.0) ** 1.5
        lean = (rnd(n, 45.0) - 0.5) * 1.5
        out = Vector((math.sin(lean), -math.cos(lean), 0.0))
        a = Vector((x0, -(7.0 + z0), h0 + thick * 0.4))
        b = a + out * long
        if abs(b.x) > 9.6 or -b.y > 7.0 + 6.5:
            continue
        b.z = min(a.z - 0.3, water - 0.2 - 0.4 * rnd(n, 46.0))
        colour = blend(lit(blend(PEELED_OLD, GREY, rnd(n, 47.0)) if rnd(n, 48.0) < 0.5 else blend(ALDER, WILLOW, rnd(n, 47.0)), 0.6), MUD, 0.4)
        way = b - a
        way.normalize()
        mid = a + (b - a) * 0.5
        wet = blend(colour, MUD_WET, 0.8)
        rod([a - way * (thick * 1.5), a, mid, b, b + way * (thick * 1.4)], [thick * 0.22, thick, thick * 0.95, thick * 0.85, thick * 0.2],
            [blend(GNAWED, MUD, 0.72), colour, blend(colour, MUD_WET, 0.25 if mid.z > water + 0.3 else 0.75), wet, wet], 5 if thick > 0.062 else 4)
        apron += 1
    for i in range(6):
        x0 = 0.6 + 6.4 * rnd(i, 51.0)
        z0 = 6.05 + 0.5 * rnd(i, 52.0)
        water = lodge_water(x0)
        long = 1.0 + 1.3 * rnd(i, 53.0)
        thick = 0.04 + 0.04 * rnd(i, 54.0)
        turn = (rnd(i, 55.0) - 0.5) * 1.2
        way = Vector((math.cos(turn), math.sin(turn), 0.0))
        mid = Vector((x0, -(7.0 + z0), water - thick * 0.3))
        colour = blend(lit(blend(PEELED_OLD, GREY, rnd(i, 56.0)), 0.6), MUD_WET, 0.45)
        rod([mid - way * (long * 0.5 + thick * 1.4), mid - way * (long * 0.5), mid + way * (long * 0.5), mid + way * (long * 0.5 + thick * 1.4)],
            [thick * 0.22, thick, thick * 0.9, thick * 0.2], [blend(GNAWED, MUD_WET, 0.5), colour, colour, blend(GNAWED, MUD_WET, 0.5)], 4)

    # Mud the beaver has carried up in its paws and patted down over the sticks: dark lumps, wet.
    pats = 0
    n = 0
    while pats < 46 and n < 900:
        n += 1
        x0 = -8.6 + 17.2 * rnd(n, 31.0)
        d0 = SD - 2.0 + (LODGE_BAND[0] - 0.6 - SD + 2.0) * rnd(n, 32.0)
        h0 = lodge_height(x0, d0)
        if h0 is None or lodge_kept(x0, d0) or h0 < 1.0:
            continue
        if abs(x0 - SX) < 2.4 and d0 > SD - 0.6 and h0 + 0.2 > SH - 0.06 - 0.03 * max(0.0, d0 - SD):
            continue
        s = 0.32 + 0.5 * rnd(n, 33.0)
        lumped = lump(part, Vector((x0, -d0, h0 + 0.02)), (s * (1.0 + 0.5 * rnd(n, 34.0)), s, s * 0.3), 1, lit(mud_at(x0, d0, h0), 0.85 + 0.25 * rnd(n, 35.0)))
        for vert in lumped:
            under = lodge_height(vert.co.x, -vert.co.y)
            if under is not None:
                vert.co.z = max(vert.co.z + (under - h0), under - 0.06) + (noise(vert.co.x * 3.0, vert.co.y * 3.0, n) - 0.5) * 0.08
        pats += 1

    # --- wet leaves plastered on it, and the green sprigs the beaver has brought ---------------------------------------
    leaves = 0
    n = 0
    while leaves < 230 and n < 4000:
        n += 1
        x0 = -9.6 + 19.2 * rnd(n, 61.0)
        d0 = LODGE_D['back'] + 2.0 + (LODGE_D['front'] - 2.2 - LODGE_D['back'] - 2.0) * rnd(n, 62.0)
        h0 = lodge_height(x0, d0)
        if h0 is None or h0 < lodge_water(x0) + 0.06:
            continue
        in_front = d0 >= LODGE_BAND[1]
        size = 0.08 + 0.08 * rnd(n, 63.0)
        turn = TAU * rnd(n, 64.0)
        # Wet and dull, a few still yellow; darker on the apron.
        colour = lit(blend(LEAVES[int(rnd(n, 65.0) * 4.999)], MUD, 0.25 + 0.4 * rnd(n, 67.0)), (0.5 if in_front else 0.8) + 0.25 * rnd(n, 66.0))
        corners = []
        ok = True
        for along_it, across in ((1.0, 0.0), (0.45, 0.42), (-0.5, 0.36), (-1.0, 0.0), (-0.5, -0.36), (0.45, -0.42)):
            px = x0 + (math.cos(turn) * along_it - math.sin(turn) * across) * size
            pd = d0 + (math.sin(turn) * along_it + math.cos(turn) * across) * size
            ph = lodge_height(px, pd)
            if ph is None:
                ok = False
                break
            corners.append(put(part, Vector((px, -pd, ph + 0.02)), colour))
        if not ok:
            continue
        # Wound to face up: going round against the clock as seen from above, where d is -Y.
        face(part, corners[::-1])
        leaves += 1

    sprigs = 0
    n = 0
    while sprigs < 16 and n < 900:
        n += 1
        x0 = -8.6 + 17.2 * rnd(n, 71.0)
        d0 = -0.4 + 4.4 * rnd(n, 72.0)
        h0 = lodge_height(x0, d0)
        if h0 is None or lodge_kept(x0, d0) or (abs(x0 - SX) < 2.8 and d0 > SD - 0.6):
            continue
        lean = TAU * rnd(n, 74.0)
        reach = 0.7 + 0.7 * rnd(n, 75.0)
        root = Vector((x0, -d0, h0 - 0.05))
        tip = root + Vector((math.cos(lean) * reach * 0.6, math.sin(lean) * reach * 0.6, reach * 0.55))
        bend = root + (tip - root) * 0.5 + Vector((0.0, 0.0, reach * 0.08))
        tube(part, [root, bend, tip], [0.028, 0.022, 0.012], [lit(WILLOW, 0.9), lit(WILLOW, 1.0), GREENS[0]], 3, closed_ends=False)
        for k in range(6):
            f = 0.3 + 0.7 * k / 5.0
            at = root + (bend - root) * (f * 2.0) if f < 0.5 else bend + (tip - bend) * (f * 2.0 - 1.0)
            turn = lean + (1.0 if k % 2 else -1.0) * (0.9 + 0.4 * rnd(n, 80.0 + k))
            out = Vector((math.cos(turn), math.sin(turn), 0.25 - 0.3 * rnd(n, 90.0 + k)))
            out.normalize()
            side = out.cross(Vector((0.0, 0.0, 1.0)))
            side.normalize()
            long = 0.2 + 0.1 * rnd(n, 100.0 + k)
            green = lit(GREENS[k % 3], 0.85 + 0.3 * rnd(n, 110.0 + k))
            leaf = [at, at + out * (long * 0.45) + side * (long * 0.3), at + out * long, at + out * (long * 0.45) - side * (long * 0.3)]
            front_side = [put(part, p, green) for p in leaf]
            face(part, front_side)
            back_side = [put(part, p - Vector((0.0, 0.0, 0.004)), lit(green, 0.7)) for p in leaf]
            face(part, back_side[::-1])
        sprigs += 1
    print('  the lodge:', made, 'apron', apron, 'pats', pats, 'leaves', leaves, 'sprigs', sprigs)
    # Smooth all round each stick, the thinnest too (three sides, 120 degrees between them): its points are shared.
    finish(part, 'baverhydda', sharp=125.0, strength=0.75, reach=0.9, floor=0.0, recalc=False)


def box_at(part, lo, hi, colour, faces=(0, 1, 2, 3, 4, 5)):
    """A box between two corners, its front towards -Y."""
    x0, y0, z0 = lo
    x1, y1, z1 = hi
    return block(part, [Vector((x0, y0, z0)), Vector((x1, y0, z0)), Vector((x1, y0, z1)), Vector((x0, y0, z1)),
                        Vector((x0, y1, z0)), Vector((x1, y1, z0)), Vector((x1, y1, z1)), Vector((x0, y1, z1))], colour, faces)


def board_along(part, p, q, wide, thick, colour, out):
    """A flat board from p to q, `wide` across in the plane whose normal is `out`, standing `thick` out along it."""
    way = q - p
    way.normalize()
    side = out.cross(way)
    side.normalize()
    h = side * (wide / 2.0)
    o = out * thick
    block(part, [p - h + o, q - h + o, q + h + o, p + h + o, p - h, q - h, q + h, p + h], colour)


# --- Olympia's store ---------------------------------------------------------------------------------------------------------
# The little store by the football ground, closed in the storm: wine-red boards and battens on a concrete plinth, its gable
# towards the pitch with white barge boards, a white frieze and corner boards; the serving hatch in a white casing, its
# glass the game's own, with a counter shelf on brackets under it and a striped awning over it with a scalloped valance;
# the panelled door up a step, a lamp over it, gutters and downpipes at the corners, and a bin. 22 across, its walls 11 up.

# SHARED with src/content/aventyr2/buildings.ts (`STORE`): its size, and the hatch's middle, width, sill and head.
STORE = {'wide': 22.0, 'deep': 9.0, 'high': 11.0, 'rise': 3.4, 'hatch_x': -2.4, 'hatch_wide': 11.6, 'sill': 4.0, 'head': 7.8}

if wanted('kiosk'):
    part = new_part()
    RED = tone('#7a2a26')
    RED_DARK = tone('#5c1e1b')
    WHITE = tone('#e8e4da')
    TIN = tone('#3a3e44')
    CONCRETE = tone('#7d7d77')
    DOOR = tone('#3c4844')
    STRIPE_RED = tone('#a3302b')
    STRIPE_WHITE = tone('#ebe5d8')
    BIN = tone('#2e4a38')
    STEEL = tone('#5c6066')
    W = STORE['wide'] / 2.0
    D = STORE['deep'] / 2.0
    H = STORE['high']
    RISE = STORE['rise']
    FOOT = 0.8
    HX0 = STORE['hatch_x'] - STORE['hatch_wide'] / 2.0
    HX1 = STORE['hatch_x'] + STORE['hatch_wide'] / 2.0
    SILL = STORE['sill']
    HEAD = STORE['head']
    DX0 = 6.0
    DX1 = 8.6
    DOOR_TOP = 8.0

    def gable_top(x):
        return H + RISE * (1.0 - abs(x) / W)

    # The plinth, darker at its foot.
    box_at(part, (-W - 0.2, -D - 0.2, 0.0), (W + 0.2, D + 0.2, FOOT), CONCRETE, (0, 2, 3, 4))
    # The walls: the front cut fine for its shade, each board its own tone; the gable over it; the sides and back plainer.
    cols = [i / 22.0 for i in range(23)]
    rows = [0.0, 0.04, 0.1, 0.2, 0.32, 0.45, 0.58, 0.7, 0.8, 0.88, 0.94, 1.0]
    tones = []
    for f in rows:
        row = []
        for c in cols:
            board = int(c * 22.0 * 0.83)
            row.append(lit(blend(RED_DARK, RED, min(1.0, f * 5.0)), 0.9 + 0.2 * rnd(board, 3.0)))
        tones.append(row)
    sheet(part, [Vector((-W, -D, FOOT)), Vector((W, -D, FOOT)), Vector((W, -D, H)), Vector((-W, -D, H))], cols, rows, tones)
    sheet(part, [Vector((-W, -D, H)), Vector((W, -D, H)), Vector((0.0, -D, H + RISE)), Vector((0.0, -D, H + RISE))],
          [i / 8.0 for i in range(9)], [0.0, 0.5, 1.0], [RED, lit(RED, 1.04), lit(RED, 1.06)])
    for x0, x1, y0, y1 in ((-W, -W, D, -D), (W, W, -D, D)):
        sheet(part, [Vector((x0, y0, FOOT)), Vector((x1, y1, FOOT)), Vector((x1, y1, H)), Vector((x0, y0, H))], steps(6),
              [0.0, 0.1, 0.4, 0.8, 1.0], [RED_DARK, RED, RED, RED, lit(RED, 0.9)])
    sheet(part, [Vector((W, D, FOOT)), Vector((-W, D, FOOT)), Vector((-W, D, H)), Vector((W, D, H))], [0.0, 1.0], [0.0, 1.0], [RED_DARK, RED])
    sheet(part, [Vector((W, D, H)), Vector((-W, D, H)), Vector((0.0, D, H + RISE)), Vector((0.0, D, H + RISE))], [0.0, 1.0], [0.0, 1.0], [RED, RED])
    # The battens over the joints, up the front and into the gable, broken by the hatch and the door.
    x = -W + 0.9
    n = 0
    while x < W - 0.6:
        n += 1
        runs = [(FOOT, H - 0.9)]
        if HX0 - 0.6 < x < HX1 + 0.6:
            runs = [(FOOT, SILL - 0.6), (HEAD + 0.6, H - 0.9)]
        if DX0 - 0.5 < x < DX1 + 0.5:
            runs = [(DOOR_TOP + 0.5, H - 0.9)]
        runs.append((H + 0.9, gable_top(x) - 0.4))
        for z0, z1 in runs:
            if z1 - z0 > 0.3:
                box_at(part, (x - 0.1, -D - 0.08, z0), (x + 0.1, -D, z1), lit(RED, 0.92 + 0.12 * rnd(n, 5.0)), (0, 2, 3, 4, 5))
        x += 1.2
    for y in (-2.4, 0.0, 2.4):
        for side in (-1.0, 1.0):
            box_at(part, (side * W - 0.08, y - 0.1, FOOT), (side * W + 0.08, y + 0.1, H - 0.9), lit(RED, 0.95))
    # The white trim: corner boards, the frieze under the eaves, and the barge boards up the gable.
    box_at(part, (-W - 0.12, -D - 0.14, FOOT), (-W + 0.6, -D + 0.5, H), WHITE)
    box_at(part, (W - 0.6, -D - 0.14, FOOT), (W + 0.12, -D + 0.5, H), WHITE)
    box_at(part, (-W - 0.14, -D - 0.16, H - 0.9), (W + 0.14, -D, H), WHITE, (0, 2, 3, 4, 5))
    for side in (-1.0, 1.0):
        board_along(part, Vector((side * (W + 0.7), -D - 0.86, H - 0.45)), Vector((0.0, -D - 0.86, H + RISE + 0.28)), 0.75, 0.16, WHITE, Vector((0.0, -1.0, 0.0)))
    # A louvred vent high in the gable.
    box_at(part, (-0.9, -D - 0.12, H + 1.0), (0.9, -D, H + 2.1), WHITE, (0, 2, 3, 4, 5))
    for i in range(3):
        box_at(part, (-0.7, -D - 0.16, H + 1.2 + i * 0.3), (0.7, -D - 0.1, H + 1.32 + i * 0.3), lit(WHITE, 0.7), (0, 4, 5))
    # The roof: two planes of dark sheet over the gable, its edge showing, and the gutters along its eaves.
    for side in (-1.0, 1.0):
        eave = Vector((side * (W + 0.9), 0.0, H - 0.5))
        ridge = Vector((0.0, 0.0, H + RISE + 0.35))
        low = [eave + Vector((0.0, -D - 0.85, 0.0)), eave + Vector((0.0, D + 0.85, 0.0))]
        high = [ridge + Vector((0.0, -D - 0.85, 0.0)), ridge + Vector((0.0, D + 0.85, 0.0))]
        thick = Vector((0.0, 0.0, 0.22))
        if side < 0:
            sheet(part, [low[0] + thick, high[0] + thick, high[1] + thick, low[1] + thick], [0.0, 1.0], [0.0, 1.0], [TIN, TIN])
            block(part, [low[0], high[0], high[0] + thick, low[0] + thick, low[1], high[1], high[1] + thick, low[1] + thick], lit(TIN, 0.8), (0, 5))
        else:
            sheet(part, [high[0] + thick, low[0] + thick, low[1] + thick, high[1] + thick], [0.0, 1.0], [0.0, 1.0], [TIN, TIN])
            block(part, [high[0], low[0], low[0] + thick, high[0] + thick, high[1], low[1], low[1] + thick, high[1] + thick], lit(TIN, 0.8), (0, 5))
        tube(part, [Vector((side * (W + 1.05), -D - 0.95, H - 0.6)), Vector((side * (W + 1.05), D + 0.95, H - 0.6))], [0.22, 0.22], [STEEL, STEEL], 8)
        pipe = [Vector((side * (W + 1.05), -D + 0.55, H - 0.7)), Vector((side * (W + 0.24), -D + 0.55, H - 1.6)),
                Vector((side * (W + 0.24), -D + 0.55, 1.4)), Vector((side * (W + 0.55), -D + 0.55, 0.4))]
        tube(part, pipe, [0.13, 0.13, 0.13, 0.13], [STEEL, STEEL, STEEL, lit(STEEL, 0.8)], 8)
        for z in (3.0, 6.0, 9.0):
            box_at(part, (min(side * W, side * (W + 0.3)), -D + 0.4, z), (max(side * W, side * (W + 0.3)), -D + 0.7, z + 0.12), lit(STEEL, 0.7))
    # The hatch: a white casing round its glass, two mullions over it, the counter shelf on brackets under it.
    box_at(part, (HX0 - 0.42, -D - 0.16, SILL - 0.1), (HX0, -D, HEAD + 0.42), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (HX1, -D - 0.16, SILL - 0.1), (HX1 + 0.42, -D, HEAD + 0.42), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (HX0, -D - 0.16, HEAD), (HX1, -D, HEAD + 0.42), WHITE, (0, 2, 3, 4, 5))
    for i in (1, 2):
        x = HX0 + (HX1 - HX0) * i / 3.0
        box_at(part, (x - 0.1, -D - 0.1, SILL), (x + 0.1, -D - 0.04, HEAD), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (HX0, -D - 0.1, (SILL + HEAD) / 2.0 - 0.06), (HX1, -D - 0.04, (SILL + HEAD) / 2.0 + 0.06), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (HX0 - 0.7, -D - 1.3, SILL - 0.32), (HX1 + 0.7, -D, SILL), lit(WHITE, 0.92))
    for x in (HX0 + 0.2, (HX0 + HX1) / 2.0, HX1 - 0.2):
        tube(part, [Vector((x, -D, SILL - 1.3)), Vector((x, -D - 1.0, SILL - 0.34))], [0.08, 0.08], [lit(WHITE, 0.8), lit(WHITE, 0.85)], 4)
    # The awning: striped cloth out from over the casing, a little round, its valance cut in scallops, on two dark arms.
    AX0 = HX0 - 0.7
    AX1 = HX1 + 0.7
    STRIPES = 12
    profile = [(0.0, HEAD + 1.0), (-0.9, HEAD + 0.82), (-1.8, HEAD + 0.5), (-2.6, HEAD + 0.08)]
    for i in range(STRIPES):
        xa = AX0 + (AX1 - AX0) * i / STRIPES
        xb = AX0 + (AX1 - AX0) * (i + 1) / STRIPES
        colour = STRIPE_RED if i % 2 == 0 else STRIPE_WHITE
        for j in range(len(profile) - 1):
            ya, za = profile[j]
            yb, zb = profile[j + 1]
            top = [put(part, Vector((xa, -D + ya, za)), colour), put(part, Vector((xb, -D + ya, za)), colour),
                   put(part, Vector((xb, -D + yb, zb)), lit(colour, 0.96)), put(part, Vector((xa, -D + yb, zb)), lit(colour, 0.96))]
            face(part, (top[3], top[2], top[1], top[0]))
            under = [put(part, Vector((xa, -D + ya, za - 0.04)), lit(colour, 0.62)), put(part, Vector((xb, -D + ya, za - 0.04)), lit(colour, 0.62)),
                     put(part, Vector((xb, -D + yb, zb - 0.04)), lit(colour, 0.7)), put(part, Vector((xa, -D + yb, zb - 0.04)), lit(colour, 0.7))]
            face(part, under)
        # The valance: down from the edge, its foot a scallop for each stripe.
        yv = -D + profile[-1][0]
        zv = profile[-1][1]
        foot = [Vector((xa, yv, zv - 0.55)), Vector((xa + (xb - xa) * 0.25, yv, zv - 0.72)), Vector(((xa + xb) / 2.0, yv, zv - 0.78)),
                Vector((xa + (xb - xa) * 0.75, yv, zv - 0.72)), Vector((xb, yv, zv - 0.55))]
        front = [put(part, p, colour) for p in foot] + [put(part, Vector((xb, yv, zv)), colour), put(part, Vector((xa, yv, zv)), colour)]
        face(part, front)
        back = [put(part, p + Vector((0.0, 0.04, 0.0)), lit(colour, 0.6)) for p in foot] + [put(part, Vector((xb, yv + 0.04, zv)), lit(colour, 0.6)),
                                                                                       put(part, Vector((xa, yv + 0.04, zv)), lit(colour, 0.6))]
        face(part, back[::-1])
    for x in (AX0 + 0.1, AX1 - 0.1):
        tube(part, [Vector((x, -D, HEAD - 0.6)), Vector((x, -D + profile[-1][0] + 0.1, profile[-1][1] - 0.05))], [0.06, 0.06], [STEEL, STEEL], 5)
    # The door up its step: two raised panels, a handle, a white casing, and a lamp over it, dark in the storm.
    box_at(part, (DX0 - 0.4, -D - 1.6, 0.0), (DX1 + 0.4, -D, FOOT), lit(CONCRETE, 1.08), (0, 2, 3, 4))
    box_at(part, (DX0, -D - 0.08, FOOT), (DX1, -D, DOOR_TOP), DOOR, (0, 2, 3, 4, 5))
    for z0, z1 in ((FOOT + 0.6, FOOT + 3.2), (FOOT + 3.8, DOOR_TOP - 0.6)):
        box_at(part, (DX0 + 0.35, -D - 0.13, z0), (DX1 - 0.35, -D - 0.08, z1), lit(DOOR, 1.15), (0, 2, 3, 4, 5))
    box_at(part, (DX1 - 0.45, -D - 0.3, FOOT + 3.3), (DX1 - 0.3, -D - 0.08, FOOT + 3.6), STEEL)
    box_at(part, (DX0 - 0.38, -D - 0.16, FOOT), (DX0, -D, DOOR_TOP + 0.38), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (DX1, -D - 0.16, FOOT), (DX1 + 0.38, -D, DOOR_TOP + 0.38), WHITE, (0, 2, 3, 4, 5))
    box_at(part, (DX0, -D - 0.16, DOOR_TOP), (DX1, -D, DOOR_TOP + 0.38), WHITE, (0, 2, 3, 4, 5))
    lamp = (DX0 + DX1) / 2.0
    box_at(part, (lamp - 0.2, -D - 0.2, DOOR_TOP + 0.9), (lamp + 0.2, -D, DOOR_TOP + 1.3), STEEL)
    lathe(part, [(0.0, -0.05), (0.42, 0.0), (0.12, 0.35), (0.0, 0.36)], 8, Matrix.Translation((lamp, -D - 0.55, DOOR_TOP + 1.05)),
          [lit(STEEL, 0.8), STEEL, STEEL, STEEL])
    # A bin by the door.
    lathe(part, [(0.0, 0.0), (0.62, 0.0), (0.66, 2.3), (0.72, 2.32), (0.72, 2.5), (0.0, 2.62)], 10, Matrix.Translation((W - 1.2, -D - 1.1, 0.0)),
          [lit(BIN, 0.6), lit(BIN, 0.7), BIN, BIN, lit(BIN, 1.1), lit(BIN, 1.1)])
    finish(part, 'kiosk', sharp=40.0, strength=0.55, reach=1.2, floor=0.0, recalc=False)


# --- Olympia's floodlight masts -----------------------------------------------------------------------------------------------
# A tall galvanised mast, dark in the storm: the power is out. Seen from the pitch only its shaft shows, so that is where its
# detail is: a concrete footing, the base plate and its bolts, the hatch near its foot, the collars where its tapered
# sections are joined, and the ladder up its side from out of reach, in a cage. At its top, a frame of floodlights angled
# down at the pitch, with a platform under them. 90 high, as the chapter has it: its origin is the middle of its foot.

MAST_TOP = 90.0


def mast_radius(z):
    return 0.62 + (0.3 - 0.62) * z / MAST_TOP


if wanted('belysningsmast'):
    part = new_part()
    ZINC = tone('#8c9298')
    ZINC_DARK = tone('#6a7076')
    ZINC_PALE = tone('#a2a8ad')
    CONCRETE = tone('#7a7a74')
    LAMP = tone('#3c4046')
    GLASS = tone('#24282e')
    TOP = MAST_TOP
    # The footing and the base plate, with its bolts.
    box_at(part, (-1.4, -1.4, -0.6), (1.4, 1.4, 1.0), CONCRETE, (0, 1, 2, 3, 4))
    box_at(part, (-1.0, -1.0, 1.0), (1.0, 1.0, 1.16), ZINC_DARK, (0, 1, 2, 3, 4))
    for i in range(8):
        a = TAU * (i + 0.5) / 8.0
        lathe(part, [(0.0, 1.16), (0.13, 1.16), (0.13, 1.3), (0.06, 1.3), (0.06, 1.45), (0.0, 1.45)], 5,
              Matrix.Translation((0.82 * math.cos(a), 0.82 * math.sin(a), 0.0)), [ZINC_DARK] * 6)
    # The shaft in three tapered sections, a collar where each meets the next; paler with the light up its length.
    profile = []
    tones = []
    for z in (1.16, 1.6, 4.0, 8.0, 14.0, 22.0, 29.6, 29.7, 30.4, 30.5, 40.0, 50.0, 59.6, 59.7, 60.4, 60.5, 70.0, 80.0, TOP - 2.0, TOP):
        r = mast_radius(z)
        if 29.65 < z < 30.45 or 59.65 < z < 60.45:
            r += 0.08
        profile.append((r, z))
        tones.append(blend(ZINC_DARK, ZINC_PALE, min(1.0, z / 40.0)) if z > 1.6 else ZINC_DARK)
    lathe(part, profile + [(0.0, TOP)], 10, IDENTITY, tones + [ZINC])
    # The hatch near its foot, towards the pitch.
    box_at(part, (-0.28, -mast_radius(3.0) - 0.06, 2.4), (0.28, -mast_radius(3.0) + 0.1, 4.2), ZINC_DARK, (0, 2, 3, 4, 5))
    box_at(part, (-0.08, -mast_radius(3.0) - 0.1, 3.1), (0.08, -mast_radius(3.0) - 0.04, 3.5), ZINC_PALE, (0, 2, 3, 4, 5))
    # The ladder up its left side from out of reach, and its cage.
    for y in (-0.32, 0.32):
        tube(part, [Vector((-mast_radius(8.0) - 0.45, y, 8.0)), Vector((-mast_radius(TOP - 3.0) - 0.45, y, TOP - 3.0))], [0.05, 0.05], [ZINC, ZINC], 4)
    z = 8.4
    while z < TOP - 3.2:
        x = -mast_radius(z) - 0.45
        tube(part, [Vector((x, -0.32, z)), Vector((x, 0.32, z))], [0.035, 0.035], [ZINC, ZINC], 4, closed_ends=False)
        z += 1.2
    z = 13.0
    while z < TOP - 3.5:
        x = -mast_radius(z) - 0.45
        hoop = [Vector((x + 0.1, -0.4, z)), Vector((x - 0.4, -0.75, z)), Vector((x - 1.0, -0.6, z)), Vector((x - 1.2, 0.0, z)),
                Vector((x - 1.0, 0.6, z)), Vector((x - 0.4, 0.75, z)), Vector((x + 0.1, 0.4, z))]
        tube(part, hoop, [0.04] * len(hoop), [ZINC] * len(hoop), 3, closed_ends=False)
        z += 5.5
    for y, out in ((-0.7, 0.45), (0.0, 1.2), (0.7, 0.45)):
        tube(part, [Vector((-mast_radius(13.0) - 0.45 - out, y, 13.0)), Vector((-mast_radius(TOP - 3.5) - 0.45 - out, y, TOP - 3.5))],
             [0.035, 0.035], [ZINC, ZINC], 3, closed_ends=False)
    # The platform and the frame of floodlights at the top, angled down towards the pitch (-Y).
    box_at(part, (-3.2, -1.6, TOP - 3.0), (3.2, 1.2, TOP - 2.8), ZINC_DARK)
    for x in (-3.1, 3.1):
        tube(part, [Vector((x, -1.5, TOP - 2.8)), Vector((x, -1.5, TOP - 1.6))], [0.05, 0.05], [ZINC, ZINC], 4)
    tube(part, [Vector((-3.1, -1.5, TOP - 1.6)), Vector((3.1, -1.5, TOP - 1.6))], [0.05, 0.05], [ZINC, ZINC], 4)
    box_at(part, (-4.2, -0.3, TOP - 0.2), (4.2, 0.3, TOP + 0.2), ZINC_DARK)
    box_at(part, (-4.2, -0.3, TOP + 3.0), (4.2, 0.3, TOP + 3.4), ZINC_DARK)
    for x in (-4.0, 4.0):
        box_at(part, (x - 0.2, -0.3, TOP - 0.2), (x + 0.2, 0.3, TOP + 3.4), ZINC_DARK)
    tilt = Matrix.Rotation(math.radians(-28.0), 4, 'X')
    for z in (TOP + 0.9, TOP + 2.5):
        for i in range(4):
            centre = Vector((-3.0 + 2.0 * i, -0.6, z))
            corners = []
            for cx, cy, cz in ((-0.8, -0.3, -0.55), (0.8, -0.3, -0.55), (0.8, -0.3, 0.55), (-0.8, -0.3, 0.55),
                               (-0.8, 0.35, -0.55), (0.8, 0.35, -0.55), (0.8, 0.35, 0.55), (-0.8, 0.35, 0.55)):
                corners.append(centre + tilt @ Vector((cx, cy, cz)))
            block(part, corners, LAMP, (1, 2, 3, 4, 5))
            face(part, [put(part, corners[k], GLASS) for k in range(4)])
    finish(part, 'belysningsmast', sharp=40.0, strength=0.5, reach=1.0, floor=0.0, recalc=False)


# --- the road's power poles at Billsta --------------------------------------------------------------------------------------
# A wooden pole of the country road, grey with age above and dark with tar at its foot, its grain split: a crossarm across
# the line with three white insulators, the wires sagging on to the next pole, and a street lamp on a curved arm, its cable
# down the pole to a small box. The lamp's glass is the game's own, under the lamp's head, and lights. 19 high, its wires
# reaching 34 along to the next pole, as the chapter has it: its origin is the middle of its foot.

# SHARED with src/content/aventyr2/buildings.ts (`pole`): the height and span it is made at, and where the lamp's glass is:
# 4.4 along, 1 towards the camera, its underside 4.83 under the top.
POLE = {'high': 19.0, 'span': 34.0, 'lamp_x': 4.4, 'lamp_y': -1.0, 'lamp_drop': 4.83}


def pole_radius(z):
    return 0.44 + (0.3 - 0.44) * z / POLE['high']


if wanted('elstolpe'):
    part = new_part()
    WOOD = tone('#665240')
    WOOD_GREY = tone('#837766')
    TAR = tone('#3e3128')
    CRACK = tone('#2e241c')
    PORCELAIN = tone('#e2e0d8')
    WIRE = tone('#24272c')
    STEEL = tone('#4e5258')
    STEEL_DARK = tone('#383b40')
    H = POLE['high']
    # The pole, a little out of round and not quite straight, darker with tar at its foot.
    rings = []
    colours = []
    for i in range(12):
        z = -0.5 + (H + 0.5) * i / 11.0
        r = pole_radius(max(0.0, z))
        middle = Vector((0.05 * math.sin(z * 0.3), 0.04 * math.sin(z * 0.23 + 1.0), z))
        rings.append(circle(middle, Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), r, 10,
                            ripple=[1.0 + 0.05 * (noise(j * 1.7, z * 0.4, 2.0) - 0.5) for j in range(10)]))
        colours.append(blend(TAR, blend(WOOD, WOOD_GREY, z / H), min(1.0, max(0.0, (z - 0.6) / 2.0))))
    skin(part, rings, colours, last=(Vector((0.0, 0.0, H + 0.1)), WOOD_GREY))
    # Its drying cracks, dark, up its sides.
    for k in range(5):
        a = TAU * rnd(k, 31.0)
        z0 = 1.0 + 6.0 * rnd(k, 32.0)
        z1 = z0 + 4.0 + 7.0 * rnd(k, 33.0)
        pts = []
        for i in range(5):
            z = z0 + (z1 - z0) * i / 4.0
            r = pole_radius(z) + 0.02
            aa = a + 0.08 * math.sin(z * 0.9)
            pts.append(Vector((r * math.cos(aa), r * math.sin(aa), z)))
        strip(part, pts, [0.01, 0.03, 0.035, 0.03, 0.01], CRACK, Vector((math.cos(a), math.sin(a), 0.0)))
    # The crossarm across the line, its braces, and the insulators with the wires on to the next pole.
    box_at(part, (-0.22, -3.9, H - 1.35), (0.22, 3.9, H - 0.95), WOOD_GREY)
    for y in (-1.0, 1.0):
        tube(part, [Vector((0.0, y * 0.3, H - 3.0)), Vector((0.0, y * 2.2, H - 1.33))], [0.06, 0.06], [STEEL_DARK, STEEL_DARK], 4)
    for y in (-3.4, 0.0, 3.4):
        base = Vector((0.0, y, H - 0.95)) if y != 0.0 else Vector((0.0, 0.0, H + 0.1))
        lathe(part, [(0.0, 0.0), (0.06, 0.0), (0.06, 0.12), (0.2, 0.18), (0.12, 0.28), (0.22, 0.36), (0.12, 0.48), (0.14, 0.56), (0.0, 0.62)], 8,
              Matrix.Translation(base), [STEEL_DARK, STEEL_DARK, PORCELAIN, PORCELAIN, PORCELAIN, PORCELAIN, PORCELAIN, PORCELAIN, PORCELAIN])
        top = base.z + 0.5
        sag = [Vector((POLE['span'] * i / 14.0, y, top - 4.0 * (i / 14.0) * (1.0 - i / 14.0) * 2.4)) for i in range(15)]
        tube(part, sag, [0.045] * len(sag), [WIRE] * len(sag), 3, closed_ends=False)
    # The street lamp: its arm curving out from the pole and up to the head, the head's housing open underneath where
    # the game's glass is, and the lamp's cable down the pole to its box.
    LX = POLE['lamp_x']
    LY = POLE['lamp_y']
    LZ = H - POLE['lamp_drop']
    arm = [Vector((0.25, -0.15, H - 6.2)), Vector((0.9, -0.4, H - 5.3)), Vector((1.9, -0.7, H - 4.65)), Vector((3.0, -0.9, H - 4.35)),
           Vector((LX - 0.7, LY, LZ + 0.45))]
    tube(part, arm, [0.1, 0.09, 0.085, 0.08, 0.08], [STEEL] * len(arm), 6)
    box_at(part, (0.28, -0.32, H - 6.6), (0.42, 0.02, H - 5.0), STEEL_DARK)
    hx0 = LX - 0.92
    hx1 = LX + 0.92
    shell = [Vector((hx0, LY - 0.46, LZ - 0.03)), Vector((hx1, LY - 0.46, LZ - 0.03)), Vector((hx1 - 0.1, LY - 0.36, LZ + 0.42)),
             Vector((hx0 + 0.1, LY - 0.36, LZ + 0.42)), Vector((hx0, LY + 0.46, LZ - 0.03)), Vector((hx1, LY + 0.46, LZ - 0.03)),
             Vector((hx1 - 0.1, LY + 0.36, LZ + 0.42)), Vector((hx0 + 0.1, LY + 0.36, LZ + 0.42))]
    block(part, shell, STEEL, (0, 1, 2, 3, 4))
    # The housing's rim underneath, round the glass, facing down.
    outer = [Vector((hx0, LY - 0.46, LZ - 0.03)), Vector((hx1, LY - 0.46, LZ - 0.03)), Vector((hx1, LY + 0.46, LZ - 0.03)), Vector((hx0, LY + 0.46, LZ - 0.03))]
    inner = [Vector((LX - 0.75, LY - 0.35, LZ - 0.03)), Vector((LX + 0.75, LY - 0.35, LZ - 0.03)), Vector((LX + 0.75, LY + 0.35, LZ - 0.03)),
             Vector((LX - 0.75, LY + 0.35, LZ - 0.03))]
    for i in range(4):
        j = (i + 1) % 4
        face(part, [put(part, outer[i], STEEL_DARK), put(part, inner[i], STEEL_DARK), put(part, inner[j], STEEL_DARK), put(part, outer[j], STEEL_DARK)])
    cable =[Vector((0.36, -0.2, H - 5.0)), Vector((pole_radius(10.0) + 0.03, -0.12, 10.0)), Vector((pole_radius(3.4) + 0.03, -0.1, 3.4))]
    tube(part, cable, [0.035, 0.035, 0.035], [STEEL_DARK] * 3, 4, closed_ends=False)
    box_at(part, (pole_radius(3.0) - 0.05, -0.3, 2.2), (pole_radius(3.0) + 0.35, 0.3, 3.4), lit(STEEL, 1.1))
    finish(part, 'elstolpe', sharp=50.0, strength=0.5, reach=0.8, floor=0.0, recalc=False)
