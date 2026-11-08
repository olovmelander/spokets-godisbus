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
# A heap of mud and gnawed sticks at the water's edge, behind the stumps he climbs and the slope he goes down (the chapter
# draws the ground he walks on itself: src/content/aventyr2/chapters/alven.ts, LODGE). Its origin is the middle of its foot
# at the current's water; the play plane is 7 in front of it (towards -Y). Its top where he walks is 5.2 up, from 2.6 to
# the left of the middle to 1.2 to the right; the mound rises behind that to its crest and falls away behind it, steep on
# the left over the stumps and long on the right down to the lake's shore. The mud is wet and dark at its foot and dries
# paler up its crown, plastered over the sticks: many peeled pale by the beaver, some grey with age, some still in their
# bark, a few birch white, each with its gnawed point or its cut end. 18 across, as the chapter has it.

LODGE_CREST = ((-9.6, 0.0), (-8.6, 0.6), (-7.2, 2.0), (-5.8, 4.4), (-4.4, 6.4), (-2.8, 7.5), (-1.0, 8.0), (0.6, 7.9),
               (2.2, 7.3), (4.0, 6.0), (6.0, 4.0), (7.8, 2.0), (9.0, 0.7), (9.8, 0.0))
LODGE_FRONT = ((-9.6, 0.0), (-8.6, 0.3), (-7.0, 0.9), (-5.6, 2.0), (-4.2, 3.6), (-2.8, 5.0), (-1.0, 5.15), (1.2, 5.15),
               (3.0, 4.0), (5.0, 2.7), (7.0, 1.4), (8.6, 0.5), (9.8, 0.0))
LODGE_D = {'front': 4.6, 'crest': -0.6, 'back': -7.0, 'end': 6.2}


def lodge_height(x, d):
    """How high the lodge's mud is at x along the path and d towards the camera from its middle (d is -Y)."""
    crest = along(LODGE_CREST, x)
    front = along(LODGE_FRONT, x)
    if d >= LODGE_D['front']:
        h = front - (d - LODGE_D['front']) * 1.7
    elif d >= LODGE_D['crest']:
        t = (LODGE_D['front'] - d) / (LODGE_D['front'] - LODGE_D['crest'])
        h = front + (crest - front) * (1.0 - (1.0 - t) ** 2)
    else:
        u = (LODGE_D['crest'] - d) / (LODGE_D['crest'] - LODGE_D['back'])
        h = crest * max(0.0, 1.0 - u * u)
    lumpy = (noise(x * 0.45, d * 0.45, 3.0) - 0.5) * 1.1 + (noise(x * 1.1, d * 1.1, 9.0) - 0.5) * 0.45 + (noise(x * 2.6, d * 2.6, 4.0) - 0.5) * 0.18
    return max(0.0, h + lumpy * min(1.0, h / 1.5))


if wanted('baverhydda'):
    part = new_part()
    MUD_WET = tone('#2a211a')
    MUD = tone('#3f3226')
    MUD_DRY = tone('#5a4a39')
    MUD_PALE = tone('#6f604e')
    PEELED = tone('#b9a37c')
    PEELED_OLD = tone('#8d8476')
    GREY = tone('#6c665c')
    ALDER = tone('#4c3a2c')
    WILLOW = tone('#69593c')
    BIRCH = tone('#cdc7ba')
    GNAWED = tone('#dcc89f')
    # The mud: a grid over its foot, pulled down at its edge so that no gap shows under it.
    XS = [-10.0 + 0.5 * i for i in range(41)]
    DS = [LODGE_D['back'] - 0.4, -6.4, -5.4, -4.4, -3.4] + [-2.9 + 0.5 * j for j in range(int((LODGE_D['end'] + 2.9) / 0.5) + 1)]
    rows = []
    for j in range(len(DS)):
        d = DS[j]
        row = []
        for i in range(len(XS)):
            x = XS[i]
            h = lodge_height(x, d)
            edge = i == 0 or i == len(XS) - 1 or j == 0
            z = -0.8 if edge else (h if h > 0.0 else -0.4)
            wet = 1.0 - min(1.0, h / 1.6)
            dry = min(1.0, max(0.0, (h - 3.0) / 4.5)) * (0.55 + 0.9 * noise(x * 0.8, d * 0.8, 5.0))
            colour = blend(blend(MUD, MUD_WET, wet), MUD_DRY, dry)
            colour = blend(colour, MUD_PALE, max(0.0, noise(x * 1.3, d * 1.3, 7.0) - 0.62) * 2.0 * min(1.0, h / 4.0))
            row.append(put(part, Vector((x, -d, z)), colour))
        rows.append(row)
    for j in range(len(DS) - 1):
        for i in range(len(XS) - 1):
            # Wound so that it faces up: from in front, the row nearer the camera is j + 1.
            face(part, (rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1], rows[j][i]))
    # The sticks, most laid down the slope and over each other, sunk into the mud by nearly half their thickness and
    # bent over it where they are long, some sticking out; thicker and more of them at its front, where it is seen.
    placed = 0
    n = 0
    while placed < 235 and n < 4000:
        n += 1
        x0 = -8.8 + 17.6 * rnd(n, 1.0)
        d0 = LODGE_D['back'] + 1.2 + (LODGE_D['front'] - 0.1 - LODGE_D['back'] - 1.2) * (rnd(n, 2.0) ** 0.6)
        h0 = lodge_height(x0, d0)
        if h0 < 0.4:
            continue
        if d0 < -1.5 and rnd(n, 3.0) < 0.75:
            continue
        gx = lodge_height(x0 + 0.3, d0) - lodge_height(x0 - 0.3, d0)
        gd = lodge_height(x0, d0 + 0.3) - lodge_height(x0, d0 - 0.3)
        down = math.atan2(-gd, -gx) if abs(gx) + abs(gd) > 0.01 else TAU * rnd(n, 4.0)
        heading = down + (rnd(n, 5.0) - 0.5) * 2.2 if rnd(n, 6.0) < 0.45 else TAU * rnd(n, 7.0)
        long = 1.2 + 4.4 * rnd(n, 8.0) ** 1.6
        thick = min(0.06 + 0.2 * rnd(n, 9.0) ** 1.5, 0.04 + 0.045 * long)
        ux = math.cos(heading)
        ud = math.sin(heading)
        ax = x0 - ux * long * 0.5
        ad = d0 - ud * long * 0.5
        bx = x0 + ux * long * 0.5
        bd = d0 + ud * long * 0.5
        # Nothing lies out over where he walks.
        if ad > LODGE_D['front'] - 0.15 or bd > LODGE_D['front'] - 0.15 or abs(ax) > 9.5 or abs(bx) > 9.5:
            continue
        ha = lodge_height(ax, ad) - thick * 0.45
        hb = lodge_height(bx, bd) - thick * 0.45
        if rnd(n, 10.0) < (0.4 if h0 > 6.0 else 0.2):
            hb += 0.5 + 1.5 * rnd(n, 11.0)
        if min(ha, hb) < -0.2:
            continue
        pick = rnd(n, 12.0)
        if pick < 0.25:
            colour = blend(PEELED, PEELED_OLD, rnd(n, 13.0) * 0.7)
        elif pick < 0.52:
            colour = blend(PEELED_OLD, GREY, rnd(n, 14.0))
        elif pick < 0.92:
            colour = blend(ALDER, WILLOW, rnd(n, 15.0))
        else:
            colour = BIRCH
        # Mud on it low down, where the beaver plastered it, and some on every one.
        colour = blend(lit(colour, 0.6 + 0.4 * min(1.0, (ha + hb) / 2.0 / 4.5)), MUD, 0.15 + 0.3 * rnd(n, 18.0))
        a = Vector((ax, -ad, ha))
        b = Vector((bx, -bd, hb))
        way = b - a
        way.normalize()
        tip = 0.2 + 0.3 * rnd(n, 16.0)
        end = blend(GNAWED, PEELED_OLD, rnd(n, 17.0) * 0.7)
        path = [a, a + way * 0.03]
        radii = [thick * 0.6, thick]
        colours = [end, colour]
        if long > 3.2:
            mx = (ax + bx) * 0.5
            md = (ad + bd) * 0.5
            mid = Vector((mx, -md, max((ha + hb) * 0.5 - 0.6, min((ha + hb) * 0.5 + 0.3, lodge_height(mx, md) - thick * 0.35))))
            path.append(mid)
            radii.append(thick * 0.97)
            colours.append(lit(colour, 0.95))
        path += [b, b + way * tip]
        radii += [thick * 0.92, 0.015]
        colours += [colour, GNAWED]
        # Its cut end is closed; its gnawed point needs no cap.
        made = tube(part, path, radii, colours, 5, closed_ends=False)
        cap = put(part, a, end)
        for j in range(5):
            face(part, (made[0][(j + 1) % 5], made[0][j], cap))
        placed += 1
    # Lumps of mud plastered over them here and there.
    for i in range(18):
        x = -7.0 + 14.0 * rnd(i, 21.0)
        d = -3.0 + 7.4 * rnd(i, 22.0)
        h = lodge_height(x, d)
        if h < 1.0:
            continue
        s = 0.5 + 0.8 * rnd(i, 23.0)
        made = lump(part, Vector((x, -d, h - 0.08)), (s * 1.3, s, s * 0.32), 1, blend(MUD, MUD_DRY, 0.3 + 0.5 * rnd(i, 24.0)))
        for vert in made:
            vert.co.z += (noise(vert.co.x * 2.0, vert.co.y * 2.0, i) - 0.5) * 0.12
    # Twigs and bits of bark the beaver dropped, over its front where he sees it close.
    for i in range(90):
        x = -8.0 + 16.0 * rnd(i, 41.0)
        d = -1.5 + 6.0 * rnd(i, 42.0)
        h = lodge_height(x, d)
        if h < 0.5:
            continue
        heading = TAU * rnd(i, 43.0)
        long = 0.5 + 1.1 * rnd(i, 44.0)
        ax = x - math.cos(heading) * long * 0.5
        ad = d - math.sin(heading) * long * 0.5
        bx = x + math.cos(heading) * long * 0.5
        bd = d + math.sin(heading) * long * 0.5
        if max(ad, bd) > LODGE_D['front'] - 0.15:
            continue
        thin = 0.025 + 0.03 * rnd(i, 45.0)
        colour = blend(lit(blend(PEELED_OLD, ALDER, rnd(i, 46.0)), 0.8), MUD, 0.25)
        tube(part, [Vector((ax, -ad, lodge_height(ax, ad) + thin * 0.3)), Vector((bx, -bd, lodge_height(bx, bd) + thin * 0.3))], [thin, thin * 0.7],
             [colour, colour], 3, closed_ends=False)
    finish(part, 'baverhydda', sharp=80.0, strength=0.7, reach=1.1, floor=0.0, recalc=False)


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
