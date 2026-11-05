"""Aventyr 2's built things that he walks on: the slide, the picnic table, the fence, the bridge, the steps and the firewood.

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



def timber(part, low, high, colour, seed=0.0, grain=0.07):
    """A sawn piece, each of its six faces its own tone, in EL."""
    corners = [put(part, Vector((x, y, z)), colour) for x in (low[0], high[0]) for y in (low[1], high[1]) for z in (low[2], high[2])]
    sides = ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3))
    for i in range(6):
        made = face(part, [corners[k] for k in sides[i]])
        part['flat'][made] = lit(colour, 1.0 + grain * (rnd(seed, i) - 0.5) * 2.0 + (0.09 if i == 5 else 0.0))


# --- the slide at Flärkenbadet --------------------------------------------------------------------------------
# Rust-red steel, with its ladder, a platform and rails, and a chute worn to bright metal where children have gone down it.
# Its origin is the platform's near corner on the ground: the platform is 3 long and 3.2 up, and the chute comes down 3.4 on.

if wanted('rutschkana'):
    part = new_part()
    STEEL = tone('#7c4436')
    RUST = tone('#5a3024')
    WORN = tone('#b8b6ae')
    GREY = tone('#8a9096')
    WIDE = 1.05
    # Four legs, cross-braced, and the platform's plate with its raised pattern.
    for x in (0.1, 2.9):
        for y in (-WIDE, WIDE):
            tube(part, [Vector((x, y, 0.0)), Vector((x, y, 4.3))], [0.09, 0.08], [RUST, STEEL], 8)
        tube(part, [Vector((x, -WIDE, 0.5)), Vector((x, WIDE, 2.9))], [0.04, 0.04], [STEEL, STEEL], 6)
        tube(part, [Vector((x, WIDE, 0.5)), Vector((x, -WIDE, 2.9))], [0.04, 0.04], [STEEL, STEEL], 6)
    timber(part, (0.0, -WIDE, 3.04), (3.0, WIDE, 3.2), lit(GREY, 0.8), 1.0)
    for i in range(14):
        for j in range(10):
            x = 0.12 + i * 0.21
            y = -0.95 + j * 0.21
            strip(part, [Vector((x - 0.05, y + (0.03 if (i + j) % 2 else -0.03), 3.206)), Vector((x + 0.05, y - (0.03 if (i + j) % 2 else -0.03), 3.206))], 0.012, lit(GREY, 1.1), UP)
    # Its rails, along the far side and the near one, with their posts.
    for y in (-WIDE, WIDE):
        tube(part, [Vector((0.1, y, 4.3)), Vector((2.9, y, 4.3))], [0.06, 0.06], [STEEL, STEEL], 8)
        tube(part, [Vector((0.1, y, 3.78)), Vector((2.9, y, 3.78))], [0.04, 0.04], [STEEL, STEEL], 6)
    tube(part, [Vector((2.9, -WIDE, 4.3)), Vector((3.3, -WIDE + 0.2, 3.85))], [0.05, 0.05], [STEEL, STEEL], 6)
    tube(part, [Vector((2.9, WIDE, 4.3)), Vector((3.3, WIDE - 0.2, 3.85))], [0.05, 0.05], [STEEL, STEEL], 6)
    # The ladder up its near end: two stiles, and flat rungs, worn in the middle.
    for y in (-0.62, 0.62):
        tube(part, [Vector((-0.25, y, 0.0)), Vector((-0.25, y, 4.2))], [0.06, 0.05], [RUST, STEEL], 6)
    z = 0.42
    while z < 3.3:
        timber(part, (-0.31, -0.62, z - 0.05), (-0.18, 0.62, z + 0.05), blend(GREY, WORN, 0.4), z)
        z += 0.46
    # The chute: a shallow trough with rolled rims, from the platform to the sand, ending in a little run-out.
    rows = []
    tones = []
    STEPS = 14
    for i in range(STEPS + 1):
        t = i / STEPS
        x = 3.0 + 3.4 * t
        top = 3.2 * (1.0 - t)
        ring = []
        shades = []
        for k, (y, drop, colour) in enumerate(((-0.92, -0.4, STEEL), (-0.94, 0.0, lit(STEEL, 1.2)), (-0.84, 0.03, STEEL), (-0.76, -0.32, RUST), (-0.72, -0.36, blend(WORN, STEEL, 0.4)), (-0.3, -0.4, WORN), (0.3, -0.4, WORN), (0.72, -0.36, blend(WORN, STEEL, 0.4)), (0.76, -0.32, RUST), (0.84, 0.03, STEEL), (0.94, 0.0, lit(STEEL, 1.2)), (0.92, -0.4, STEEL))):
            lift = 0.32
            ring.append(Vector((x, y, top + drop + lift)))
            streak = noise(x * 2.0, y * 5.0, 3.0)
            shades.append(blend(colour, RUST, 0.45 * streak))
        rows.append(ring)
        tones.append(shades)
    skin(part, rows, tones, closed=True, flip=True)
    # Two legs under it, in sand.
    for t, y in ((0.42, -0.8), (0.42, 0.8)):
        x = 3.0 + 3.4 * t
        tube(part, [Vector((x, y, 0.0)), Vector((x, y, 3.2 * (1.0 - t) - 0.1))], [0.07, 0.06], [RUST, STEEL], 6)
    finish(part, 'rutschkana', sharp=40.0, strength=0.5, reach=0.4, floor=0.0, leaf=True)


# --- the picnic table, seen from its end ------------------------------------------------------------------------
# Silver-grey wood. Its origin is at the near bench's near edge on the ground: a bench 1.4 wide at each end of the 6 across,
# their tops at 1.2, and the table top at 2 between them, 3.6 wide. Its length goes away into the picture, along Y.

if wanted('picknick'):
    part = new_part()
    GREYED = tone('#9a948a')
    DARKER = tone('#6e685e')
    LONG = 2.7
    for x0 in (0.0, 4.6):
        for i in range(3):
            timber(part, (x0 + 0.02 + i * 0.47, -LONG, 1.04), (x0 + 0.44 + i * 0.47, LONG, 1.2), lit(GREYED, 0.88 + 0.24 * rnd(i, x0)), i + x0)
    for i in range(7):
        timber(part, (1.21 + i * 0.515, -LONG, 1.86), (1.7 + i * 0.515, LONG, 2.0), lit(GREYED, 0.9 + 0.24 * rnd(i, 3.3)), i * 2.0)
    # A frame at each end of it: the beam the benches lie on, a beam under the top, and the crossed legs.
    for y in (-1.9, 1.9):
        timber(part, (-0.1, y - 0.1, 0.88), (6.1, y + 0.1, 1.04), DARKER, y)
        timber(part, (1.15, y - 0.1, 1.72), (4.85, y + 0.1, 1.86), DARKER, y + 1.0)
        tube(part, [Vector((0.6, y, 0.0)), Vector((1.5, y, 0.9)), Vector((2.4, y, 1.8))], [0.1, 0.1, 0.1], [DARKER] * 3, 4)
        tube(part, [Vector((5.4, y, 0.0)), Vector((4.5, y, 0.9)), Vector((3.6, y, 1.8))], [0.1, 0.1, 0.1], [DARKER] * 3, 4)
    tube(part, [Vector((3.0, -1.9, 1.75)), Vector((3.0, 1.9, 1.75))], [0.07, 0.07], [DARKER] * 2, 4)
    finish(part, 'picknick', sharp=30.0, strength=0.55, reach=0.5, floor=0.0, leaf=True)


# --- the high fence at Olympia --------------------------------------------------------------------------------
# Seen from its end, across the path: planks on posts, dark green, with a flat top rail he walks over, 0.8 wide and 5.2 up.
# Far behind him the posts go on up, with the ball-stop net between them. Its origin is its near side's foot on the path.

if wanted('staket'):
    part = new_part()
    GREEN = tone('#3e5a46')
    GREEN_DARK = tone('#2a3f33')
    CAP = tone('#8a9288')
    NET = tone('#d8dcd8')
    POST = tone('#6e7a78')
    timber(part, (-0.04, -1.3, 5.04), (0.84, 9.0, 5.2), CAP, 1.0)
    timber(part, (0.08, -1.2, 0.0), (0.72, 9.0, 5.04), GREEN_DARK, 2.0)
    # The planks up both sides, each its own, and three rails showing at the end.
    for side, x in ((-1.0, 0.07), (1.0, 0.73)):
        y = -1.22
        n = 0
        while y < 9.0:
            wide = 0.5 + 0.1 * rnd(n, 1.0)
            shade = lit(GREEN, 0.84 + 0.3 * rnd(n, 2.0))
            top = 5.03 - 0.02 * rnd(n, 3.0)
            pts = [Vector((x, y, 0.02)), Vector((x, y + wide - 0.03, 0.02)), Vector((x, y + wide - 0.03, top)), Vector((x, y, top))]
            part['flat'][face(part, [put(part, p, shade) for p in pts])] = shade
            y += wide
            n += 1
    for z in (0.7, 2.5, 4.4):
        timber(part, (0.02, -1.26, z), (0.78, -1.2, z + 0.26), GREEN, z)
    for y in (-1.22, 3.0, 7.2):
        tube(part, [Vector((0.4, y + 0.1, 5.2)), Vector((0.4, y + 0.1, 15.0 if y > 0.0 else 5.5))], [0.08, 0.07], [POST, POST], 8)
    # The ball-stop net over it, from the second post back: only its thread, row on row.
    for k in range(14):
        z = 5.6 + k * 0.72
        strip(part, [Vector((0.4, 3.1, z)), Vector((0.4, 7.3, z))], 0.012, NET, Vector((-1.0, 0.0, 0.0)))
    for k in range(9):
        y = 3.1 + k * 0.52
        strip(part, [Vector((0.4, y, 5.3)), Vector((0.4, y, 14.8))], 0.012, NET, Vector((-1.0, 0.0, 0.0)))
    finish(part, 'staket', sharp=30.0, strength=0.4, reach=0.5, floor=0.0, leaf=True)


# --- the road bridge in Bredbyn ------------------------------------------------------------------------------------
# Concrete, stained by years of rain, on two piers with rounded noses, with a steel railing. 24 long and 7.8 to the middle of
# its deck. Its origin is on the river's bed under its middle, as the chapter sets it.

if wanted('bro'):
    part = new_part()
    PALE = tone('#9a9c9a')
    STAIN = tone('#5e625c')
    DARK = tone('#3c3e42')
    MOSS = tone('#55702c')
    LENGTH = 24.0
    HIGH = 7.8
    DEEP = 5.0
    # The deck: a thick slab, with an overhanging edge beam and dark runs below every drain.
    rows = []
    tones = []
    AROUND = ((-DEEP - 0.4, -1.2, 0.9), (-DEEP - 0.4, 1.2, 1.06), (DEEP + 0.4, 1.2, 1.06), (DEEP + 0.4, -1.2, 0.9))
    for i in range(25):
        x = -LENGTH / 2.0 - 3.0 + (LENGTH + 6.0) * i / 24.0
        rows.append([Vector((x, y, HIGH + z)) for y, z, k in AROUND])
        run = noise(x * 0.8, 1.0, 3.0)
        tones.append([blend(lit(PALE, k), STAIN, 0.55 * run * (1.0 if z < 0.0 else 0.3)) for y, z, k in AROUND])
    skin(part, rows, tones, (Vector((-LENGTH / 2.0 - 3.0, 0.0, HIGH)), PALE), (Vector((LENGTH / 2.0 + 3.0, 0.0, HIGH)), PALE))
    for k in range(9):
        x = -LENGTH / 2.0 + k * 3.0
        strip(part, [Vector((x + 0.5, -DEEP - 0.41, HIGH + 1.1)), Vector((x + 0.58 + 0.2 * rnd(k, 1.0), -DEEP - 0.41, HIGH - 1.2 - 1.2 * rnd(k, 2.0)))], [0.1, 0.03], STAIN, FRONT_)
    # A joint in the slab, and the two piers on their footings, wet to the high-water mark.
    for side in (-1.0, 1.0):
        x = side * 6.0
        profile = []
        for k in range(20):
            turn = TAU * k / 20.0
            profile.append((turn, math.cos(turn), math.sin(turn)))
        rows = []
        tones = []
        for z, grow in ((-0.2, 1.08), (0.9, 1.08), (1.0, 1.0), (3.0, 1.0), (5.4, 0.96), (6.5, 0.96)):
            ring = []
            shades = []
            for turn, cx, cy in profile:
                # A long round: 4 across, 8 along the stream, its noses to the current.
                ring.append(Vector((x + grow * 1.9 * cx, grow * (2.1 * cy + (2.0 if cy > 0.0 else -2.0) * min(1.0, abs(cy) * 4.0)), z)))
                wet = max(0.0, 1.0 - z / 3.6)
                streak = noise(cx * 3.0 + side, cy * 3.0, z * 0.4)
                shades.append(blend(blend(PALE, STAIN, 0.4 * streak), tone('#3c4238'), wet * 0.75))
            rows.append(ring)
            tones.append(shades)
        skin(part, rows, tones, (Vector((x, 0.0, -0.2)), PALE), (Vector((x, 0.0, 6.6)), PALE))
        # The bearing on its top, and moss at its foot.
        timber(part, (x - 1.5, -3.8, 6.5), (x + 1.5, 3.8, 6.6), DARK, side)
    # The railing along the near edge and the far one: posts, and two rails.
    for y in (-DEEP - 0.1, DEEP + 0.1):
        x = -LENGTH / 2.0 - 3.0
        while x <= LENGTH / 2.0 + 3.0:
            timber(part, (x - 0.07, y - 0.07, HIGH + 1.2), (x + 0.07, y + 0.07, HIGH + 3.2), DARK, x)
            x += 2.4
        timber(part, (-LENGTH / 2.0 - 3.0, y - 0.09, HIGH + 3.12), (LENGTH / 2.0 + 3.0, y + 0.09, HIGH + 3.3), tone('#54585e'), 2.0)
        timber(part, (-LENGTH / 2.0 - 3.0, y - 0.05, HIGH + 2.2), (LENGTH / 2.0 + 3.0, y + 0.05, HIGH + 2.3), DARK, 3.0)
    finish(part, 'bro', sharp=40.0, strength=0.45, reach=1.2, floor=-0.5, leaf=True)


# --- the steps down from the deck ----------------------------------------------------------------------------------
# Four treads of 2.4 and a rise of 1.2, in the deck's own boards, with a white stringer and a white cross-brace as the deck has.
# Its origin is on the lawn under the deck's edge.

if wanted('trappa'):
    part = new_part()
    BOARD = tone('#b49a78')
    WHITE_ = tone('#dcd8cc')
    DARK = tone('#2a2622')
    for i in range(4):
        x0 = 2.4 * i
        top = 4.8 - 1.2 * i
        for k in range(4):
            y0 = -1.62 + k * 1.16
            timber(part, (x0 - 0.02, y0, top - 0.14), (x0 + 2.42, y0 + 1.12, top), lit(BOARD, 0.86 + 0.26 * rnd(i, k)), i + k * 0.3)
        # The riser under its nose, dark between its boards.
        timber(part, (x0 + 2.3, -1.56, top - 1.22), (x0 + 2.42, 3.0, top - 0.14), lit(BOARD, 0.7), i * 2.0)
    # The stringer down its side: one white board, stepped as the treads are.
    for y in (-1.66, 3.06):
        points = [Vector((0.0, y, 4.66))]
        for i in range(4):
            points.append(Vector((2.4 * (i + 1), y, 4.66 - 1.2 * i)))
            points.append(Vector((2.4 * (i + 1), y, 3.46 - 1.2 * i)))
        points.append(Vector((9.6, y, 0.0)))
        points.append(Vector((8.4, y, 0.0)))
        points.append(Vector((0.0, y, 3.6)))
        part['flat'][face(part, [put(part, p, WHITE_) for p in points])] = WHITE_
    # What holds it up: posts on the lawn, with a cross of boards between the two nearest.
    for x in (0.5, 4.8):
        timber(part, (x - 0.14, -1.56, 0.0), (x + 0.14, -1.3, 3.5 - x * 0.5), WHITE_, x)
    tube(part, [Vector((0.6, -1.5, 0.3)), Vector((4.7, -1.5, 1.2))], [0.06, 0.06], [WHITE_] * 2, 4)
    tube(part, [Vector((4.7, -1.5, 0.3)), Vector((0.6, -1.5, 3.2))], [0.06, 0.06], [WHITE_] * 2, 4)
    finish(part, 'trappa', sharp=30.0, strength=0.55, reach=0.6, floor=0.0, leaf=True)


# --- the stack of firewood -------------------------------------------------------------------------------------------
# Split birch and spruce, end on, in three steps up of 1.2 and a long top: its origin is at the near foot of its first step.

if wanted('vedstapel'):
    part = new_part()
    BARK = tone('#6a5040')
    BIRCH = tone('#d8d0c0')
    CUT = tone('#d8b880')
    CUT_OLD = tone('#a88a60')
    R = 0.3
    columns = ((0.0, 1.6, 2), (1.6, 3.2, 4), (3.2, 6.4, 6))
    n = 0
    for x0, x1, rows in columns:
        across = int((x1 - x0) / (R * 2.04))
        for row in range(rows):
            for k in range(across):
                n += 1
                x = x0 + (x1 - x0) * (k + 0.5) / across + 0.03 * (rnd(n, 1.0) - 0.5)
                z = R + row * 0.6
                r = R * (0.9 + 0.1 * rnd(n, 2.0))
                y = -1.5 + 0.14 * rnd(n, 3.0)
                bark = BIRCH if rnd(n, 4.0) > 0.6 else BARK
                turn = rnd(n, 5.0)
                near = circle(Vector((x, y, z)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 7, turn)
                far = circle(Vector((x, 1.1, z)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 0.0, 1.0)), r, 7, turn)
                skin(part, [near, far], [bark, lit(bark, 0.7)], closed=True)
                end = lit(blend(CUT, CUT_OLD, rnd(n, 6.0)), 0.9 + 0.2 * rnd(n, 7.0))
                part['flat'][face(part, [put(part, p, end) for p in near])] = end
                # The heart of the log, darker.
                heart = [Vector((x + 0.45 * (p.x - x), y - 0.004, z + 0.45 * (p.z - z))) for p in near]
                part['flat'][face(part, [put(part, p, lit(end, 0.8)) for p in heart])] = lit(end, 0.8)
    finish(part, 'vedstapel', sharp=46.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)
