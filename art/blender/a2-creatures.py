"""Aventyr 2's creatures: the two trägubbar, the owl and the otter (docs/aventyr-2-overhaul.md).

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone.

Each stands on its origin, its front towards -Y. The owl in flight lies along +X, with its wings as things of their own,
each with its origin on its hinge, so that the game can beat them. Nothing here comes from anyone else. The trägubbar
are made from their description and have not been held up to Pappa's picture (art bible 1.3).
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)

UP = Vector((0.0, 0.0, 1.0))


def wanted(name):
    return ONLY is None or ONLY == name


def loft(part, rows, sides, colour):
    """A body from rows of (x, y, z, reach across, reach along Y): each is a ring of `sides`, and the two ends close."""
    rings = []
    for row in rows:
        ring = []
        for j in range(sides):
            angle = TAU * j / sides
            ring.append(Vector((row[0] + row[3] * math.cos(angle), row[1] + row[4] * math.sin(angle), row[2])))
        rings.append(ring)
    first = (Vector((rows[0][0], rows[0][1], rows[0][2])), colour)
    last = (Vector((rows[-1][0], rows[-1][1], rows[-1][2])), colour)
    return skin(part, rings, [colour] * len(rows), first, last)


def ball(part, centre, size, detail, colour):
    return lump(part, Vector(centre), size, detail, colour)


# --- the old trägubbe -------------------------------------------------------------------------------------------------
# Pappa's first carving, grey with its years: a knife's flat cuts all over it, a hood drawn to a crooked point, a big nose,
# a beard split down its middle, a crooked smile, and the crowberry eyes Elof gave it.

OLD_WOOD = tone('#94907e')
OLD_DARK = tone('#5c5a50')
OLD_PALE = tone('#b8b4a0')
OLD_BEARD = tone('#c4beaa')
OLD_HOOD = tone('#7a7668')
BERRY = tone('#14101e')
MOUTH = tone('#2a2622')


if wanted('tragubbe'):
    part = new_part()
    verts_paint = part['paint']
    body = loft(part, [
        (0.0, 0.0, 0.0, 0.2, 0.18), (0.0, 0.0, 0.04, 0.215, 0.195), (0.0, 0.0, 0.2, 0.2, 0.18), (0.01, 0.0, 0.34, 0.165, 0.155),
        (0.015, 0.0, 0.42, 0.14, 0.135), (0.015, 0.0, 0.47, 0.15, 0.145),
    ], 8, OLD_WOOD)
    for ring in body:
        for vert in ring:
            at = vert.co
            verts_paint[vert] = blend(OLD_DARK, OLD_WOOD, noise(at.x * 22.0, at.y * 22.0, at.z * 3.0) * 1.7)
    # The head, cut in flats.
    head = ball(part, (0.015, 0.0, 0.58), (0.155, 0.15, 0.15), 1, OLD_WOOD)
    for vert in head:
        verts_paint[vert] = blend(OLD_WOOD, OLD_PALE, noise(vert.co.x * 11.0, vert.co.y * 11.0, 4.0))
    # The hood: down to its brow, and drawn up to a point that bends over to one side.
    hood = loft(part, [
        (0.015, 0.0, 0.6, 0.178, 0.172), (0.012, 0.012, 0.66, 0.165, 0.16), (0.0, 0.02, 0.74, 0.122, 0.118),
        (-0.02, 0.025, 0.82, 0.08, 0.078), (-0.05, 0.03, 0.89, 0.044, 0.042), (-0.095, 0.03, 0.935, 0.012, 0.012),
    ], 7, OLD_HOOD)
    for ring in hood:
        for vert in ring:
            verts_paint[vert] = blend(lit(OLD_HOOD, 0.8), OLD_HOOD, noise(vert.co.x * 18.0, vert.co.y * 18.0, vert.co.z * 3.0) * 1.7)
    # The nose: a wedge left standing by the knife.
    nose = ball(part, (0.02, -0.158, 0.565), (0.045, 0.06, 0.056), 1, OLD_PALE)
    # The beard: two flat locks down the front, each its own cut.
    for side in (-1.0, 1.0):
        lock = loft(part, [
            (0.015 + side * 0.062, -0.13, 0.5, 0.066, 0.03), (0.015 + side * 0.058, -0.158, 0.42, 0.072, 0.036),
            (0.015 + side * 0.05, -0.172, 0.33, 0.058, 0.034), (0.015 + side * 0.034, -0.17, 0.25, 0.03, 0.024),
        ], 6, OLD_BEARD)
        for ring in lock:
            for vert in ring:
                verts_paint[vert] = blend(OLD_BEARD, OLD_DARK, max(0.0, noise(vert.co.x * 26.0, 3.0, vert.co.z * 7.0) - 0.45) * 1.6)
    # Arms folded up against the body: a ridge each side, and a pale hand.
    for side in (-1.0, 1.0):
        arm = loft(part, [
            (side * 0.165, -0.04, 0.4, 0.04, 0.05), (side * 0.19, -0.05, 0.3, 0.044, 0.054), (side * 0.165, -0.1, 0.22, 0.04, 0.05),
        ], 6, OLD_HOOD)
        hand = ball(part, (side * 0.11, -0.15, 0.2), (0.05, 0.042, 0.044), 1, OLD_PALE)
    # Crowberry eyes, set a little unevenly, with a tiny highlight.
    for side, high in ((-1.0, 0.0), (1.0, 0.008)):
        ball(part, (0.015 + side * 0.058, -0.133, 0.606 + high), (0.03, 0.022, 0.032), 2, BERRY)
        ball(part, (0.008 + side * 0.058, -0.152, 0.617 + high), (0.008, 0.006, 0.008), 1, tone('#d8d8e8'))
    # The crooked smile, cut into the wood: higher at one end.
    rings = []
    for k in range(7):
        s = k / 6.0
        x = 0.015 + (s - 0.5) * 0.15
        z = 0.5 + 0.024 * s + 0.03 * (2.0 * s - 1.0) ** 2.0
        rings.append([Vector((x, -0.15 + 0.02 * abs(2.0 * s - 1.0) ** 2.0, z + 0.008)), Vector((x, -0.152 + 0.02 * abs(2.0 * s - 1.0) ** 2.0, z - 0.008))])
    skin(part, rings, [MOUTH] * 7, closed=False)
    # A dab of lichen on its shoulder, as old wood has.
    ball(part, (-0.15, -0.06, 0.4), (0.06, 0.04, 0.035), 1, tone('#6f8a45'))
    finish(part, 'tragubbe', sharp=24.0, strength=0.55, reach=0.14, floor=0.0, leaf=True)


# --- the little one ---------------------------------------------------------------------------------------------------------
# Elof's own first carving: pale linden, round and small, with the knife's few crooked cuts, and the two eyes he painted.

LINDEN = tone('#e6cfa2')
LINDEN_CUT = tone('#c9b07e')
LINDEN_WARM = tone('#efdcb8')
PAINT = tone('#2c2420')

if wanted('lillgubbe'):
    part = new_part()
    verts_paint = part['paint']
    body = loft(part, [
        (0.0, 0.0, 0.0, 0.14, 0.13), (0.0, 0.0, 0.03, 0.15, 0.14), (0.0, 0.0, 0.16, 0.135, 0.125), (0.0, 0.0, 0.26, 0.105, 0.1),
    ], 7, LINDEN)
    head = ball(part, (0.0, 0.0, 0.385), (0.135, 0.125, 0.13), 1, LINDEN)
    for points in (body[0] + body[1] + body[2] + body[3], head):
        for vert in points:
            at = vert.co
            verts_paint[vert] = blend(LINDEN_CUT, LINDEN_WARM, noise(at.x * 16.0, at.y * 16.0, at.z * 5.0) * 1.6)
    # A crooked first try at arms, and two knife cuts across its front.
    for side in (-1.0, 1.0):
        ball(part, (side * 0.135, -0.03, 0.2), (0.05, 0.05, 0.075), 1, LINDEN_WARM)
    for z, turn in ((0.08, 0.3), (0.17, -0.34)):
        rings = []
        for k in range(4):
            s = k / 3.0
            x = (s - 0.5) * 0.17
            rings.append([Vector((x, -0.14 + abs(x) * 0.3, z + x * turn + 0.008)), Vector((x, -0.14 + abs(x) * 0.3, z + x * turn - 0.008))])
        skin(part, rings, [LINDEN_CUT] * 4, closed=False)
    # The eyes he painted, not quite level, and the small mouth.
    ball(part, (-0.05, -0.116, 0.405), (0.019, 0.012, 0.022), 2, PAINT)
    ball(part, (0.052, -0.116, 0.412), (0.019, 0.012, 0.022), 2, PAINT)
    rings = []
    for k in range(5):
        s = k / 4.0
        x = (s - 0.5) * 0.072
        z = 0.347 - 0.012 * (1.0 - (2.0 * s - 1.0) ** 2.0)
        rings.append([Vector((x, -0.125, z + 0.005)), Vector((x, -0.125, z - 0.005))])
    skin(part, rings, [PAINT] * 5, closed=False)
    finish(part, 'lillgubbe', sharp=26.0, strength=0.45, reach=0.1, floor=0.0, leaf=True)


# --- the owl ------------------------------------------------------------------------------------------------------------------
# A tawny owl: round head with no ears, a pale facial disc with dark rims, dark eyes, streaked breast and barred wings.

OWL_BACK = tone('#7a6248')
OWL_DARK = tone('#4a3a2c')
OWL_BREAST = tone('#c2ad8c')
OWL_FACE = tone('#d8c8a8')
OWL_RIM = tone('#5a4634')
OWL_EYE = tone('#120e0a')
OWL_BEAK = tone('#b8a878')
OWL_FEET = tone('#a8987a')


def owl_paint(paint, points, seed, breast_from):
    """Its plumage on a body's points: streaks down the breast, mottled bars on the back."""
    for vert in points:
        at = vert.co
        front = -at.y / 0.62
        streak = noise(at.x * 9.0 + seed, 1.0, at.z * 2.2)
        bar = noise(at.x * 2.0, at.y * 2.0, at.z * 6.0 + seed)
        back = blend(OWL_DARK, OWL_BACK, bar * 1.9 - 0.25)
        chest = blend(OWL_BREAST, OWL_DARK, max(0.0, streak - 0.5) * 5.0)
        paint[vert] = blend(back, chest, (front - breast_from) * 2.2)


if wanted('uggla'):
    part = new_part()
    paint = part['paint']
    body = loft(part, [
        (0.0, 0.05, 0.1, 0.34, 0.3), (0.0, 0.0, 0.26, 0.56, 0.5), (0.0, -0.02, 0.56, 0.68, 0.6), (0.0, -0.02, 0.92, 0.7, 0.62),
        (0.0, 0.0, 1.22, 0.62, 0.56), (0.0, 0.02, 1.42, 0.52, 0.5),
    ], 14, OWL_BACK)
    owl_paint(paint, [vert for ring in body for vert in ring], 1.3, 0.15)
    head = ball(part, (0.0, 0.0, 1.78), (0.72, 0.66, 0.6), 3, OWL_BACK)
    owl_paint(paint, head, 2.7, 3.0)
    # The facial disc: two round pale fans that meet at the beak, with a dark rim.
    for side in (-1.0, 1.0):
        rim = ball(part, (side * 0.27, -0.5, 1.84), (0.33, 0.13, 0.34), 2, OWL_RIM)
        fan = ball(part, (side * 0.26, -0.58, 1.83), (0.29, 0.1, 0.3), 2, OWL_FACE)
        for vert in fan:
            at = vert.co
            spoke = noise(math.atan2(at.z - 1.83, at.x - side * 0.26) * 3.0, 2.0, side)
            paint[vert] = blend(OWL_FACE, OWL_RIM, max(0.0, spoke - 0.5) * 1.2)
        ball(part, (side * 0.25, -0.66, 1.87), (0.145, 0.05, 0.15), 2, OWL_EYE)
        ball(part, (side * 0.22 - 0.03, -0.706, 1.92), (0.034, 0.012, 0.034), 1, tone('#c8ccd8'))
    # The white brows over them, and the beak between.
    for side in (-1.0, 1.0):
        ball(part, (side * 0.15, -0.66, 2.1), (0.2, 0.05, 0.05), 1, OWL_FACE)
    beak = loft(part, [(0.0, -0.66, 1.76, 0.07, 0.06), (0.0, -0.73, 1.68, 0.05, 0.04), (0.0, -0.74, 1.6, 0.01, 0.01)], 6, OWL_BEAK)
    # Folded wings along its sides, each barred, and its tail.
    for side in (-1.0, 1.0):
        wing = loft(part, [
            (side * 0.64, 0.12, 1.3, 0.13, 0.34), (side * 0.72, 0.16, 0.95, 0.15, 0.4), (side * 0.66, 0.24, 0.55, 0.12, 0.34),
            (side * 0.46, 0.34, 0.2, 0.08, 0.22), (side * 0.3, 0.42, 0.02, 0.03, 0.08),
        ], 8, OWL_DARK)
        for ring in wing:
            for vert in ring:
                at = vert.co
                paint[vert] = blend(OWL_DARK, OWL_BACK, max(0.0, math.sin(at.z * 15.0) * 0.6 + noise(at.x * 3.0, at.z * 3.0, 2.0)) * 1.1)
    loft(part, [(0.0, 0.42, 0.34, 0.28, 0.1), (0.0, 0.5, 0.02, 0.27, 0.08), (0.0, 0.54, -0.2, 0.18, 0.05)], 8, OWL_DARK)
    # Its feet on the branch.
    for side in (-1.0, 1.0):
        for toe in (-1.0, 0.0, 1.0):
            ball(part, (side * 0.26 + toe * 0.1, -0.38, 0.08), (0.05, 0.13, 0.05), 1, OWL_FEET)
    finish(part, 'uggla', sharp=180.0, strength=0.5, reach=0.5, floor=None)

if wanted('uggla-flyger'):
    part = new_part()
    paint = part['paint']
    # Along +X, with its head a little up: Elof rides on its back, and its top is his floor.
    body = []
    rows = [(-1.0, 0.0, 0.06, 0.1, 0.1), (-0.72, 0.0, 0.0, 0.3, 0.3), (-0.3, 0.0, -0.06, 0.5, 0.46), (0.2, 0.0, -0.08, 0.56, 0.5), (0.62, 0.0, -0.02, 0.46, 0.44), (0.92, 0.0, 0.08, 0.3, 0.32)]
    rings = []
    for row in rows:
        ring = []
        for j in range(14):
            angle = TAU * j / 14.0
            ring.append(Vector((row[0], row[1] + row[3] * math.cos(angle), row[2] + row[4] * math.sin(angle))))
        rings.append(ring)
    made = skin(part, rings, [OWL_BACK] * len(rows), (Vector((rows[0][0], 0.0, rows[0][2])), OWL_BACK), (Vector((rows[-1][0], 0.0, rows[-1][2])), OWL_BACK))
    for ring in made:
        for vert in ring:
            at = vert.co
            streak = noise(at.y * 7.0, at.x * 1.6, 2.0)
            bar = noise(at.y * 2.0, at.x * 6.0, 3.0)
            back = blend(OWL_DARK, OWL_BACK, bar * 1.9 - 0.25)
            chest = blend(OWL_BREAST, OWL_DARK, max(0.0, streak - 0.54) * 4.0)
            paint[vert] = blend(back, chest, 0.5 - at.z * 2.4)
    head = ball(part, (1.18, 0.0, 0.2), (0.56, 0.58, 0.5), 3, OWL_BACK)
    for vert in head:
        paint[vert] = blend(OWL_DARK, OWL_BACK, noise(vert.co.y * 3.0, vert.co.z * 3.0, 6.0) * 1.8)
    # Its round face turned towards the way it flies and a little to us.
    for side in (-1.0, 1.0):
        centre = Vector((1.58, -0.14 + side * 0.22, 0.2))
        ball(part, (centre.x - 0.03, centre.y, centre.z), (0.12, 0.27, 0.3), 2, OWL_RIM)
        ball(part, (centre.x, centre.y, centre.z), (0.1, 0.24, 0.26), 2, OWL_FACE)
        ball(part, (centre.x + 0.08, centre.y - 0.02, centre.z + 0.05), (0.04, 0.115, 0.125), 2, OWL_EYE)
    loft_beak = loft(part, [(1.72, -0.14, 0.14, 0.05, 0.05), (1.79, -0.14, 0.05, 0.03, 0.03), (1.8, -0.14, -0.02, 0.008, 0.008)], 6, OWL_BEAK)
    # The tail: short, round and barred, in a fan.
    for k in range(-3, 4):
        turn = k * 0.11
        a = put(part, Vector((-0.8, k * 0.04, 0.02)), OWL_DARK)
        b = put(part, Vector((-1.62, k * 0.06 + math.sin(turn) * 0.8 + 0.1, 0.1)), OWL_BACK)
        c = put(part, Vector((-1.66, k * 0.06 + math.sin(turn) * 0.8 - 0.1, 0.1)), blend(OWL_BACK, OWL_BREAST, 0.4))
        face(part, (a, b, c))
    for side in (-1.0, 1.0):
        ball(part, (-0.1, side * 0.2, -0.56), (0.18, 0.1, 0.09), 1, OWL_FEET)
    finish(part, 'uggla-flyger', sharp=180.0, strength=0.4, reach=0.4, floor=None, leaf=True)

FEATHER = (OWL_DARK, OWL_BACK, OWL_BREAST)


def wing_mesh(name, side):
    """A broad owl's wing with its origin on its hinge, out along Y. Feathers overlap in two rows, barred, the fingers at its
    tip spread apart. It is thin and seen from both sides."""
    if not wanted(name):
        return
    part = new_part()
    feathers = 11
    for i in range(feathers):
        t = i / (feathers - 1.0)
        # From the body out to the tip: along the wing the feathers fan from pointing back to pointing out.
        root = Vector((0.5 - 0.25 * t, side * (0.1 + 2.1 * t), 0.02 + 0.1 * math.sin(t * 3.1)))
        turn = (1.0 - t) * 1.45 + 0.12
        along = Vector((-math.sin(turn), side * math.cos(turn), 0.0))
        across = Vector((math.cos(turn), side * math.sin(turn), 0.0))
        long = 1.1 + 0.7 * t * (1.3 - t) + 0.4 * (1.0 - t)
        wide = 0.24 - 0.05 * t
        prev = None
        for k in range(6):
            s = k / 5.0
            at = root + along * (long * s) - UP * (0.1 * s * s)
            w = wide * (0.8 + 0.4 * math.sin(s * 3.1)) * (0.25 if k == 5 else 1.0)
            bar = 1.0 if k % 2 else 0.0
            colour = blend(OWL_BACK, OWL_DARK if bar else OWL_BREAST, 0.35 + 0.3 * s)
            pair = (put(part, at - across * w, colour), put(part, at + across * w, colour))
            if prev is not None:
                face(part, (prev[0], prev[1], pair[1], pair[0]))
            prev = pair
    # The coverts over the root: shorter, paler, overlapping the flight feathers.
    for i in range(8):
        t = i / 7.0
        root = Vector((0.62 - 0.2 * t, side * (0.06 + 1.6 * t), 0.08 + 0.1 * math.sin(t * 3.1)))
        turn = (1.0 - t) * 1.3 + 0.2
        along = Vector((-math.sin(turn), side * math.cos(turn), 0.0))
        across = Vector((math.cos(turn), side * math.sin(turn), 0.0))
        long = 0.72
        prev = None
        for k in range(4):
            s = k / 3.0
            at = root + along * (long * s) + UP * 0.04
            w = 0.22 * (1.0 if k < 3 else 0.3)
            colour = blend(OWL_BACK, OWL_BREAST, 0.2 + 0.25 * (k % 2))
            pair = (put(part, at - across * w, colour), put(part, at + across * w, colour))
            if prev is not None:
                face(part, (prev[0], prev[1], pair[1], pair[0]))
            prev = pair
    return finish(part, name, strength=0.0, leaf=True)


wing_mesh('uggla-vinge-n', -1.0)
wing_mesh('uggla-vinge-f', 1.0)

# --- the otter -------------------------------------------------------------------------------------------------------------------
# Long, low and wet: a flat broad head, small round ears, a pale throat, whiskers, short strong arms and a thick tapering tail.
# It stands up on a stone to look, as otters do.

OTTER_FUR = tone('#5a4230')
OTTER_DARK = tone('#3a2a1e')
OTTER_PALE = tone('#b49a78')
OTTER_NOSE = tone('#14100c')

if wanted('utter'):
    part = new_part()
    paint = part['paint']
    body = loft(part, [
        (0.0, 0.1, 0.0, 0.3, 0.32), (0.0, 0.08, 0.18, 0.4, 0.42), (0.0, 0.04, 0.5, 0.36, 0.38), (0.0, 0.0, 0.84, 0.28, 0.3),
        (0.0, -0.02, 1.1, 0.22, 0.24), (0.0, -0.04, 1.26, 0.19, 0.2),
    ], 12, OTTER_FUR)
    for ring in body:
        for vert in ring:
            at = vert.co
            front = -(at.y - 0.05)
            sleek = noise(at.x * 4.0, at.y * 4.0, at.z * 2.0)
            paint[vert] = blend(blend(OTTER_DARK, OTTER_FUR, sleek * 1.7), OTTER_PALE, (front - 0.14) * 4.0 * (1.2 - at.z * 0.4))
    head = ball(part, (0.0, -0.08, 1.46), (0.25, 0.28, 0.2), 2, OTTER_FUR)
    for vert in head:
        at = vert.co
        paint[vert] = blend(blend(OTTER_DARK, OTTER_FUR, noise(at.x * 5.0, at.y * 5.0, 3.0) * 1.7), OTTER_PALE, (1.42 - at.z) * 5.0)
    muzzle = ball(part, (0.0, -0.32, 1.41), (0.13, 0.12, 0.085), 2, OTTER_PALE)
    ball(part, (0.0, -0.43, 1.45), (0.045, 0.028, 0.03), 1, OTTER_NOSE)
    for side in (-1.0, 1.0):
        ball(part, (side * 0.13, -0.28, 1.52), (0.038, 0.03, 0.04), 2, OTTER_NOSE)
        ball(part, (side * 0.125, -0.307, 1.532), (0.012, 0.008, 0.012), 1, tone('#c8ccd8'))
        ball(part, (side * 0.22, -0.02, 1.6), (0.058, 0.03, 0.058), 1, OTTER_DARK)
        # Its arms held to its chest, and its broad webbed feet.
        loft(part, [(side * 0.27, -0.12, 0.92, 0.07, 0.08), (side * 0.25, -0.26, 0.74, 0.06, 0.07), (side * 0.13, -0.34, 0.72, 0.05, 0.05)], 6, OTTER_DARK)
        ball(part, (side * 0.2, -0.3, 0.04), (0.14, 0.24, 0.05), 1, OTTER_DARK)
        # Whiskers.
        for w in range(3):
            root = Vector((side * 0.1, -0.36, 1.42 + w * 0.012))
            tip = Vector((side * (0.34 + 0.03 * w), -0.3, 1.38 + w * 0.05))
            a = put(part, root, OTTER_PALE)
            b = put(part, root + UP * 0.012, OTTER_PALE)
            c = put(part, tip, OTTER_PALE)
            face(part, (a, b, c))
    # The tail, thick at its root, lying out on the stone behind it.
    tail = loft(part, [
        (0.0, 0.2, 0.26, 0.2, 0.2), (0.0, 0.48, 0.12, 0.15, 0.13), (0.1, 0.82, 0.06, 0.1, 0.08), (0.24, 1.1, 0.03, 0.05, 0.04), (0.34, 1.26, 0.02, 0.012, 0.012),
    ], 8, OTTER_FUR)
    finish(part, 'utter', sharp=180.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)
