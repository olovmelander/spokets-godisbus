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
# Seen from its end, across the path: a board fence, 0.8 wide and 5.2 up, with a flat cap board he walks over. Its end is
# read as a fence's: a square post between the edges of the planks on either side, each plank its own board with a gap of
# light beside it, painted a weathered green, the cap pale. Far behind him the posts go on up, with the ball-stop net
# between them. Its origin is its near side's foot on the path. (It was a dark green block: the 12 November fine-tuning.)

if wanted('staket'):
    part = new_part()
    GREEN = tone('#5a8566')
    POST_WOOD = tone('#6d8a70')
    INSIDE = tone('#24342b')
    END_GRAIN = tone('#b9ab8c')
    CAP = tone('#c0c6b8')
    NET = tone('#dfe3df')
    POST = tone('#8a9496')
    # The cap board, its edges a little over the planks, and a shadowed lip under its front.
    timber(part, (-0.05, -1.32, 5.04), (0.85, 9.0, 5.2), CAP, 1.0)
    timber(part, (-0.04, -1.31, 4.96), (0.84, -1.24, 5.04), lit(CAP, 0.6), 1.5)
    # The posts, every 2.1 back, the near one at the end; two rails between them, out of sight inside but for the gaps.
    y = -1.2
    k = 0
    while y < 9.0:
        timber(part, (0.14, y, 0.0), (0.66, y + 0.5, 5.04), lit(POST_WOOD, 0.92 + 0.16 * rnd(k, 4.0)), 3.0 + k)
        y += 2.1
        k += 1
    for z in (1.0, 4.1):
        timber(part, (0.14, -0.7, z), (0.66, 9.0, z + 0.3), lit(POST_WOOD, 0.8), z)
    # Dark inside between the two faces, so that light shows only through the gaps.
    timber(part, (0.13, -0.7, 0.02), (0.67, 9.0, 4.96), INSIDE, 6.0)
    # The end post's face: a grain of darker lines up it, and the nail heads of the planks either side.
    for g in range(4):
        x = 0.2 + g * 0.13 + 0.03 * rnd(g, 7.0)
        strip(part, [Vector((x, -1.201, 0.15)), Vector((x + 0.01, -1.201, 4.9))], 0.008, lit(POST_WOOD, 0.72), Vector((0.0, -1.0, 0.0)))
    # The planks up both sides, each its own board 0.08 thick, with a gap between: their pale sawn ends frame the post.
    for side, (x0, x1) in ((-1.0, (0.05, 0.13)), (1.0, (0.67, 0.75))):
        y = -1.24
        n = 0
        while y < 9.0:
            wide = 0.42 + 0.08 * rnd(n, 1.0 + side)
            shade = lit(GREEN, 0.86 + 0.28 * rnd(n, 2.0 + side))
            top = 5.03 - 0.03 * rnd(n, 3.0 + side)
            timber(part, (x0, y, 0.03), (x1, y + wide, top), shade, n + 10.0 * side)
            if n == 0:
                # The near board's sawn end, seen from the path: pale wood under the paint.
                pts = [Vector((x0, y - 0.002, 0.03)), Vector((x1, y - 0.002, 0.03)), Vector((x1, y - 0.002, top)), Vector((x0, y - 0.002, top))]
                part['flat'][face(part, [put(part, p, END_GRAIN) for p in pts])] = END_GRAIN
            y += wide + 0.05
            n += 1
    # The ball-stop net's posts, galvanised, from the second one back, and its net of cord between them.
    for y in (3.0, 7.2):
        tube(part, [Vector((0.4, y + 0.1, 5.2)), Vector((0.4, y + 0.1, 15.0))], [0.1, 0.09], [POST, POST], 8)
    tube(part, [Vector((0.4, 3.1, 14.9)), Vector((0.4, 7.3, 14.9))], [0.04, 0.04], [POST, POST], 6)
    for k in range(14):
        z = 5.6 + k * 0.66
        strip(part, [Vector((0.4, 3.1, z)), Vector((0.4, 7.3, z))], 0.022, NET, Vector((-1.0, 0.0, 0.0)))
    for k in range(9):
        y = 3.1 + k * 0.52
        strip(part, [Vector((0.4, y, 5.3)), Vector((0.4, y, 14.8))], 0.022, NET, Vector((-1.0, 0.0, 0.0)))
    finish(part, 'staket', sharp=30.0, strength=0.4, reach=0.5, floor=0.0, leaf=True)


# --- the road bridge in Bredbyn ------------------------------------------------------------------------------------
# Concrete cast against boards and stained by years of rain, on two piers with rounded noses, with a steel railing. 24 long
# and 7.8 to the middle of its deck. Its origin is on the river's bed under its middle, as the chapter sets it, with the water
# at about 0. An edge beam runs along each side of the deck, standing a little over it, darker where the rain drips off it, with
# drains through the deck inside it; each pier stands on a footing, green with algae and moss up to a pale high-water line,
# and carries a cap with the bearings under the deck. The game draws the boards, the holes, the runs and the wet on the
# concrete's corners (`part['con']`, src/render/concrete.ts).

if wanted('bro'):
    part = new_part()
    PALE = tone('#a6a7a1')
    DRY = tone('#b8b8b1')
    STAIN = tone('#62665e')
    ALGAE = tone('#2a321e')
    MOSS = tone('#4c6626')
    LIME = tone('#cacac2')
    DARK = tone('#3c3e42')
    STEEL = tone('#80868c')
    LENGTH = 24.0
    HIGH = 7.8
    DEEP = 5.0
    ENDS = LENGTH / 2.0 + 3.0
    TOP = HIGH + 1.65
    start = len(part['bm'].faces)
    # The deck as one section drawn along X: (y, z over HIGH, how open to the rain, colour). The outer faces of the edge
    # beams first, then their tops, the deck between them, and the underside out of the rain.
    SECTION = (
        (-DEEP - 0.5, -1.4, 0.9, STAIN), (-DEEP - 0.5, -0.7, 1.0, blend(STAIN, PALE, 0.6)), (-DEEP - 0.5, 0.8, 1.0, PALE),
        (-DEEP - 0.5, 1.55, 1.0, PALE), (-DEEP - 0.32, 1.65, 1.0, PALE), (-DEEP + 0.5, 1.65, 1.0, PALE), (-DEEP + 0.5, 1.2, 1.0, STAIN),
        (DEEP - 0.5, 1.2, 1.0, STAIN), (DEEP - 0.5, 1.65, 1.0, PALE), (DEEP + 0.32, 1.65, 1.0, PALE), (DEEP + 0.5, 1.55, 1.0, PALE),
        (DEEP + 0.5, 0.8, 1.0, PALE), (DEEP + 0.5, -0.7, 1.0, blend(STAIN, PALE, 0.6)), (DEEP + 0.5, -1.4, 0.9, STAIN),
        (DEEP - 0.5, -1.4, 0.1, PALE), (DEEP - 0.5, -0.9, 0.0, DRY), (-DEEP + 0.5, -0.9, 0.0, DRY), (-DEEP + 0.5, -1.4, 0.1, PALE))
    rows = []
    tones = []
    STEPS = 50
    for i in range(STEPS + 1):
        x = -ENDS + 2.0 * ENDS * i / STEPS
        rows.append([Vector((x, y, HIGH + z)) for y, z, open_, colour in SECTION])
        # Paler and darker in long patches, and a dark run under each railing post.
        post = math.exp(-(((x + ENDS + 1.2) % 2.4) - 1.2) ** 2 / 0.1)
        tones.append([lit(blend(colour, STAIN, (0.3 * noise(x * 0.35, y, 1.0) + 0.35 * post) * (1.0 if z > 0.0 and open_ > 0.5 else 0.4)),
                          0.94 + 0.12 * noise(x * 0.8, y * 0.2, 2.0)) for y, z, open_, colour in SECTION])
    made = skin(part, rows, tones, (Vector((-ENDS, 0.0, HIGH)), PALE), (Vector((ENDS, 0.0, HIGH)), PALE))
    for i in range(STEPS + 1):
        for j in range(len(SECTION)):
            vert = made[i][j]
            part['con'][vert] = (SECTION[j][2], vert.co.x, TOP - vert.co.z)
    # The two piers on their footings, green with algae to the high water and paler and drier up under the deck.
    AROUND = 32
    LEVELS = ((-0.2, 1.1, ALGAE), (0.55, 1.1, ALGAE), (0.9, 1.1, MOSS), (0.98, 1.0, ALGAE), (1.4, 1.0, blend(ALGAE, STAIN, 0.5)),
              (1.85, 1.0, STAIN), (2.0, 1.0, LIME), (2.15, 1.0, PALE), (3.4, 0.99, PALE), (4.8, 0.98, PALE), (6.0, 0.97, DRY))
    for side in (-1.0, 1.0):
        x = side * 6.0
        rows = []
        tones = []
        for z, grow, colour in LEVELS:
            ring = []
            shades = []
            for k in range(AROUND):
                # Round from its back, so that the seam is out of sight: a long round, 3.8 across and 8.2 along the stream.
                turn = TAU * k / AROUND + math.pi / 2.0
                cx = math.cos(turn)
                cy = math.sin(turn)
                ring.append(Vector((x + grow * 1.9 * cx, grow * (2.1 * cy + (2.0 if cy > 0.0 else -2.0) * min(1.0, abs(cy) * 4.0)), z)))
                streak = noise(cx * 3.0 + side, cy * 3.0, z * 0.4)
                shades.append(lit(blend(colour, STAIN, (0.35 * streak if z > 2.1 else 0.1 * streak)), 0.95 + 0.1 * noise(k * 0.7, z, side)))
            rows.append(ring)
            tones.append(shades)
        made = skin(part, rows, tones, (Vector((x, 0.0, -0.2)), ALGAE), (Vector((x, 0.0, 6.0)), DRY))
        for ring in made:
            along = 0.0
            for k in range(AROUND):
                vert = ring[k]
                if k:
                    along += (vert.co - ring[k - 1].co).length
                part['con'][vert] = (1.0 if vert.co.z < 2.0 else 0.25, along, 6.0 - vert.co.z)
        # Its cap, under the deck, a little wider than the pier.
        cap = len(part['bm'].verts)
        timber(part, (x - 2.25, -4.6, 6.0), (x + 2.25, 4.6, 6.6), DRY, side, grain=0.04)
        part['bm'].verts.ensure_lookup_table()
        for vert in part['bm'].verts[cap:]:
            part['con'][vert] = (0.1, vert.co.x, 6.6 - vert.co.z)
    part['bm'].faces.ensure_lookup_table()
    for made_face in part['bm'].faces[start:]:
        part['stuff'][made_face] = 'kit-concrete'
    # The bearings between the caps and the deck, and the drains through the deck inside its edge beams.
    for side in (-1.0, 1.0):
        for y in (-3.0, 0.0, 3.0):
            timber(part, (side * 6.0 - 0.7, y - 0.6, 6.6), (side * 6.0 + 0.7, y + 0.6, HIGH - 0.9), DARK, y + side)
    for y in (-DEEP + 0.85, DEEP - 0.85):
        for x in (-9.0, -3.0, 3.0, 9.0):
            tube(part, [Vector((x, y, HIGH - 0.85)), Vector((x, y, HIGH - 1.9))], [0.12, 0.11], [DARK, lit(DARK, 0.8)], 8)
    # The railing along the near edge and the far one: galvanised posts, and two rails.
    for y in (-DEEP - 0.1, DEEP + 0.1):
        x = -ENDS
        while x <= ENDS:
            timber(part, (x - 0.07, y - 0.07, HIGH + 1.2), (x + 0.07, y + 0.07, HIGH + 3.2), STEEL, x)
            x += 2.4
        timber(part, (-ENDS, y - 0.09, HIGH + 3.12), (ENDS, y + 0.09, HIGH + 3.3), lit(STEEL, 1.08), 2.0)
        timber(part, (-ENDS, y - 0.05, HIGH + 2.2), (ENDS, y + 0.05, HIGH + 2.3), STEEL, 3.0)
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
# Rows of 0.6: whole logs, halves and quarters as they came from the chopping block, their sawn ends out, the top of each
# step laid flat with split faces up (kit-tools.py, `stack_row`).

if wanted('vedstapel'):
    part = new_part()
    columns = ((0.0, 1.6, 2), (1.6, 3.2, 4), (3.2, 6.4, 6))
    n = 0
    for x0, x1, rows in columns:
        for row in range(rows):
            n = stack_row(part, x0, x1, row * 0.6, 0.6, -1.55, 1.1, n + 7, 0.4, top=row == rows - 1)
    finish(part, 'vedstapel', sharp=46.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)


# --- the edge of the flower bed ------------------------------------------------------------------------------------------
# Cobbles set in two rows across the path, 2 wide with their tops at 0.8, dark soil between them, and the bed's last flowers
# going away behind, beaten down by the rain. Its origin is at the near foot of the first row.

if wanted('rabatt'):
    part = new_part()
    STONE_ = tone('#8a8c8a')
    STONE_DARK = tone('#6a6e72')
    SOIL = tone('#2e2620')
    STALK = tone('#4e7038')
    # A low dry wall of field stones, three courses high at its front, and a top of flat ones he can stand on.
    n = 0
    for course in range(3):
        x = -0.05 + 0.12 * (course % 2)
        while x < 2.05:
            n += 1
            wide = 0.3 + 0.12 * rnd(n, 1.0)
            tone_ = blend(blend(STONE_, tone('#a8aaa4'), rnd(n, 2.0)), tone('#6e7a4a'), 0.3 * rnd(n, 4.0))
            lump(part, Vector((x + wide, -1.7, 0.15 + course * 0.25)), (wide * 1.08, 0.3, 0.18), 1, lit(tone_, 1.25))
            x += wide * 2.0
    for i in range(18):
        y = -1.5 + i * 0.4
        for x in (0.32, 1.68):
            n += 1
            wide = 0.26 + 0.1 * rnd(n, 1.0)
            lump(part, Vector((x, y, 0.64)), (wide * 1.3, 0.26, 0.18), 1, lit(blend(STONE_, tone('#a8aaa4'), rnd(n, 2.0)), 1.25))
    pad_soil = [Vector((0.2, -1.8, 0.62)), Vector((1.8, -1.8, 0.62)), Vector((1.8, 5.0, 0.62)), Vector((0.2, 5.0, 0.62))]
    part['flat'][face(part, [put(part, p, SOIL) for p in pad_soil])] = SOIL
    # What grows on behind the stones: tall stalks, and a few heavy heads hanging in the wet.
    for i in range(16):
        x = 2.2 + 3.0 * rnd(i, 1.0)
        y = 0.8 + 4.0 * rnd(i, 2.0)
        tall = 1.6 + 2.0 * rnd(i, 3.0)
        lean = 0.5 + 0.6 * rnd(i, 4.0)
        top = Vector((x + lean, y, tall))
        tube(part, [Vector((x, y, 0.0)), Vector((x + lean * 0.2, y, tall * 0.7)), top], [0.05, 0.04, 0.03], [STALK] * 3, 5)
        head = blend(tone('#c8a03c'), tone('#a8605a'), rnd(i, 5.0))
        lump(part, top + Vector((0.08, 0.0, -0.06)), (0.2, 0.2, 0.15), 1, head)
    timber(part, (0.04, -1.5, 0.0), (1.96, 5.0, 0.6), tone('#3a3c3a'), 9.0)
    finish(part, 'rabatt', sharp=36.0, strength=0.3, reach=0.2, floor=0.0, leaf=True)


# --- Mamma's rowing boat -------------------------------------------------------------------------------------------------
# Clinker built, white with a dark sheer strake, 6.4 long and 2.2 across, its gunwale 1.2 over the water: he walks along it.
# Its origin is amidships at the waterline, its bow towards +X. A lantern stands on a short staff in the bow.

if wanted('roddbat'):
    part = new_part()
    WHITE_ = tone('#d8d4c8')
    SHEER = tone('#34506a')
    TAR = tone('#23211f')
    RAIL = tone('#a87c4c')
    INSIDE = tone('#b49a70')
    BOARD = tone('#c8a878')
    LONG = 3.2
    BEAM = 1.1
    SHEER_Z = 1.2

    def half(t):
        """How wide she is at t, -1 at the stern and 1 at the bow."""
        return BEAM * (1.0 - abs(t) ** 2.6 * (0.2 if t < 0.0 else 1.0)) ** 0.8

    rings = []
    tones = []
    STEPS = 18
    STRAKES = 6
    for i in range(STEPS + 1):
        t = -1.0 + 2.0 * i / STEPS
        x = LONG * t
        wide = max(half(t), 0.015)
        keel = -0.5 + 0.9 * max(0.0, t) ** 3.0 + 0.5 * max(0.0, -t) ** 4.0
        ring = []
        shades = []
        for s in range(-STRAKES, STRAKES + 1):
            k = abs(s) / STRAKES
            y = wide * (1.0 if s > 0 else -1.0) * (1.0 - (1.0 - k) ** 2.2)
            z = keel + (SHEER_Z + 0.1 * abs(t) ** 2.0 - keel) * k ** 1.3
            # Each plank laps the one under it.
            y *= 1.0 + 0.016 * (abs(s) % 2)
            ring.append(Vector((x, y, z)))
            colour = SHEER if abs(s) == STRAKES else (TAR if z < 0.06 else WHITE_)
            shades.append(lit(colour, (1.0 if abs(s) % 2 else 0.88) * (0.95 + 0.1 * rnd(i, s))))
        rings.append(ring)
        tones.append(shades)
    skin(part, rings, tones, closed=False, flip=True)
    # The gunwales, the rail he walks on.
    for side in (-1.0, 1.0):
        path = []
        for i in range(STEPS + 1):
            t = -1.0 + 2.0 * i / STEPS
            path.append(Vector((LONG * t, side * (max(half(t), 0.015) - 0.03), SHEER_Z + 0.1 * abs(t) ** 2.0 + 0.02)))
        tube(part, path, [0.075] * len(path), [RAIL] * len(path), 5, squash=0.7)
    # The transom, the floorboards, three thwarts and the rowlocks.
    stern = [Vector((-LONG, -half(-1.0), 1.3)), Vector((-LONG, half(-1.0), 1.3)), Vector((-LONG, 0.3, 0.1)), Vector((-LONG, -0.3, 0.1))]
    part['flat'][face(part, [put(part, p, WHITE_) for p in stern])] = WHITE_
    for i in range(5):
        y = -0.5 + i * 0.25
        timber(part, (-2.3, y, -0.05), (2.1, y + 0.21, 0.02), lit(INSIDE, 0.9 + 0.2 * rnd(i, 1.0)), i * 1.0)
    for x in (-1.9, 0.0, 1.6):
        wide = half(x / LONG) - 0.08
        timber(part, (x - 0.24, -wide, 0.7), (x + 0.24, wide, 0.8), BOARD, x)
    for side in (-1.0, 1.0):
        tube(part, [Vector((0.5, side * 1.06, 1.24)), Vector((0.5, side * 1.06, 1.46))], [0.03, 0.02], [tone('#6a6e72')] * 2, 5)
    # The oars, shipped along the thwarts.
    for side in (-1.0, 1.0):
        tube(part, [Vector((-2.6, side * 0.62, 0.86)), Vector((1.4, side * 0.66, 0.86)), Vector((2.0, side * 0.66, 0.86))], [0.035, 0.04, 0.03], [BOARD] * 3, 6)
        lump(part, Vector((2.3, side * 0.66, 0.86)), (0.4, 0.13, 0.02), 1, BOARD)
    # The lantern's staff in the bow, and the lantern.
    tube(part, [Vector((2.55, 0.0, 1.0)), Vector((2.55, 0.0, 1.9))], [0.03, 0.025], [BOARD] * 2, 5)
    tube(part, [Vector((2.55, 0.0, 1.9)), Vector((2.75, 0.0, 1.98)), Vector((2.78, 0.0, 1.86))], [0.018, 0.018, 0.014], [tone('#3a3e44')] * 3, 4)
    lump(part, Vector((2.78, 0.0, 1.73)), (0.1, 0.1, 0.13), 1, tone('#3a3e44'))
    finish(part, 'roddbat', sharp=44.0, strength=0.5, reach=0.5, floor=-3.0, leaf=True)
