"""Aventyr 2's creatures: the owl, the otter and the small lives in the storm (docs/aventyr-2-overhaul.md).

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone.

Each stands on its origin, its front towards -Y. The owl in flight lies along +X, with its wings as things of their own,
each with its origin on its hinge, so that the game can beat them. Nothing here comes from anyone else.
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
    # The head is a thing of its own, 'uggla-huvud', so that the game can turn it as an owl turns its head: it sits on
    # the body at the neck, (0, 0, 1.42), the pivot the game turns it about.
    top = new_part()
    tpaint = top['paint']
    head = ball(top, (0.0, 0.0, 1.78), (0.72, 0.66, 0.6), 3, OWL_BACK)
    owl_paint(tpaint, head, 2.7, 3.0)
    # The facial disc: two round pale fans that meet at the beak, with a dark rim.
    for side in (-1.0, 1.0):
        rim = ball(top, (side * 0.27, -0.5, 1.84), (0.33, 0.13, 0.34), 2, OWL_RIM)
        fan = ball(top, (side * 0.26, -0.58, 1.83), (0.29, 0.1, 0.3), 2, OWL_FACE)
        for vert in fan:
            at = vert.co
            spoke = noise(math.atan2(at.z - 1.83, at.x - side * 0.26) * 3.0, 2.0, side)
            tpaint[vert] = blend(OWL_FACE, OWL_RIM, max(0.0, spoke - 0.5) * 1.2)
        ball(top, (side * 0.25, -0.66, 1.87), (0.145, 0.05, 0.15), 2, OWL_EYE)
        ball(top, (side * 0.22 - 0.03, -0.706, 1.92), (0.034, 0.012, 0.034), 1, tone('#c8ccd8'))
    # The white brows over them, and the beak between.
    for side in (-1.0, 1.0):
        ball(top, (side * 0.15, -0.66, 2.1), (0.2, 0.05, 0.05), 1, OWL_FACE)
    beak = loft(top, [(0.0, -0.66, 1.76, 0.07, 0.06), (0.0, -0.73, 1.68, 0.05, 0.04), (0.0, -0.74, 1.6, 0.01, 0.01)], 6, OWL_BEAK)
    finish(top, 'uggla-huvud', sharp=180.0, strength=0.5, reach=0.5, floor=None)
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
    # The head is a thing of its own, 'utter-huvud', turned by the game about the neck at (0, -0.04, 1.3).
    top = new_part()
    tpaint = top['paint']
    head = ball(top, (0.0, -0.08, 1.46), (0.25, 0.28, 0.2), 2, OTTER_FUR)
    for vert in head:
        at = vert.co
        tpaint[vert] = blend(blend(OTTER_DARK, OTTER_FUR, noise(at.x * 5.0, at.y * 5.0, 3.0) * 1.7), OTTER_PALE, (1.42 - at.z) * 5.0)
    muzzle = ball(top, (0.0, -0.32, 1.41), (0.13, 0.12, 0.085), 2, OTTER_PALE)
    ball(top, (0.0, -0.43, 1.45), (0.045, 0.028, 0.03), 1, OTTER_NOSE)
    for side in (-1.0, 1.0):
        ball(top, (side * 0.13, -0.28, 1.52), (0.038, 0.03, 0.04), 2, OTTER_NOSE)
        ball(top, (side * 0.125, -0.307, 1.532), (0.012, 0.008, 0.012), 1, tone('#c8ccd8'))
        ball(top, (side * 0.22, -0.02, 1.6), (0.058, 0.03, 0.058), 1, OTTER_DARK)
        # Whiskers.
        for w in range(3):
            root = Vector((side * 0.1, -0.36, 1.42 + w * 0.012))
            tip = Vector((side * (0.34 + 0.03 * w), -0.3, 1.38 + w * 0.05))
            a = put(top, root, OTTER_PALE)
            b = put(top, root + UP * 0.012, OTTER_PALE)
            c = put(top, tip, OTTER_PALE)
            face(top, (a, b, c))
    finish(top, 'utter-huvud', sharp=180.0, strength=0.5, reach=0.3, floor=None, leaf=True)
    for side in (-1.0, 1.0):
        # Its arms held to its chest, and its broad webbed feet.
        loft(part, [(side * 0.27, -0.12, 0.92, 0.07, 0.08), (side * 0.25, -0.26, 0.74, 0.06, 0.07), (side * 0.13, -0.34, 0.72, 0.05, 0.05)], 6, OTTER_DARK)
        ball(part, (side * 0.2, -0.3, 0.04), (0.14, 0.24, 0.05), 1, OTTER_DARK)
    # The tail, thick at its root, lying out on the stone behind it.
    tail = loft(part, [
        (0.0, 0.2, 0.26, 0.2, 0.2), (0.0, 0.48, 0.12, 0.15, 0.13), (0.1, 0.82, 0.06, 0.1, 0.08), (0.24, 1.1, 0.03, 0.05, 0.04), (0.34, 1.26, 0.02, 0.012, 0.012),
    ], 8, OTTER_FUR)
    finish(part, 'utter', sharp=180.0, strength=0.5, reach=0.3, floor=0.0, leaf=True)


# --- the beaver --------------------------------------------------------------------------------------------------------------
# At its lodge in Alven: sitting up on its haunches with a birch stick in its front paws to gnaw, its tail flat on the
# ground behind it and its broad webbed hind feet before it. Round and brown, small round ears, a blunt pale muzzle with
# whiskers, orange front teeth, and dark eyes with a light in them: friendly, as a child would draw one.
# Its head is a thing of its own (`baver-huvud`, turned about the neck at (0, -0.08, 1.24)). Its tail and its stick
# each hang from a pivot of their own, under the beaver (`baver-svans` at the tail's root, which lifts and slaps;
# `baver-pinne` in its paws, which turns as it gnaws). Swimming, the game tips the whole of it forward into the water.

BEAVER_FUR = tone('#7a5638')
BEAVER_DARK = tone('#4c3624')
BEAVER_PALE = tone('#ad8a62')
BEAVER_MUZZLE = tone('#c2a684')
BEAVER_FOOT = tone('#3a302a')
BEAVER_WEB = tone('#5a4c42')
BEAVER_TAIL = tone('#3c3632')
BEAVER_SCALE = tone('#262220')
BEAVER_TOOTH = tone('#e08a2c')
BEAVER_NOSE = tone('#1e1612')
BIRCH_BARK = tone('#e4e0d4')
BIRCH_MARK = tone('#2e2a26')
FRESH_WOOD = tone('#e8cc98')


def beaver_fur(paint, points, seed, belly):
    """Its fur on a part's points: darker along the back, paler down the belly towards the front, and soft tufts."""
    for vert in points:
        at = vert.co
        tuft = noise(at.x * 5.0 + seed, at.y * 5.0, at.z * 5.0)
        colour = blend(BEAVER_DARK, BEAVER_FUR, 0.45 + tuft * 0.9)
        front = max(0.0, -at.y - 0.05) / 0.5
        if belly:
            colour = blend(colour, BEAVER_PALE, min(1.0, front) * 0.75 * (1.0 - abs(at.x) / 0.6))
        paint[vert] = colour


if wanted('baver'):
    part = new_part()
    paint = part['paint']
    # Its body, sitting up: round haunches on the ground, a full belly, and the chest drawing in to the neck.
    body = loft(part, [
        (0.0, 0.16, 0.02, 0.3, 0.3), (0.0, 0.14, 0.14, 0.56, 0.54), (0.0, 0.1, 0.36, 0.66, 0.62), (0.0, 0.04, 0.6, 0.66, 0.6),
        (0.0, -0.02, 0.84, 0.58, 0.52), (0.0, -0.06, 1.04, 0.46, 0.42), (0.0, -0.08, 1.2, 0.34, 0.32), (0.0, -0.08, 1.3, 0.22, 0.2),
    ], 16, BEAVER_FUR)
    beaver_fur(paint, [vert for ring in body for vert in ring], 0.7, True)
    for side in (-1.0, 1.0):
        # The haunches, round under its fur.
        haunch = ball(part, (side * 0.36, 0.2, 0.36), (0.32, 0.4, 0.34), 2, BEAVER_FUR)
        beaver_fur(paint, haunch, 1.9 + side, False)
        # Short arms from the shoulders to the small dark paws that hold the stick.
        tube(part, [Vector((side * 0.34, -0.2, 1.06)), Vector((side * 0.3, -0.42, 0.98)), Vector((side * 0.22, -0.56, 1.06))], [0.1, 0.08, 0.06], [BEAVER_FUR, BEAVER_FUR, BEAVER_DARK], 8)
        for toe in (-1.0, 0.0, 1.0):
            ball(part, (side * 0.2 + toe * 0.035, -0.6, 1.08 + toe * 0.01), (0.035, 0.05, 0.035), 1, BEAVER_FOOT)
        # The big webbed hind feet, flat before it: a sole, five long toes and the web between them.
        heel = Vector((side * 0.34, 0.06, 0.04))
        sole = ball(part, (side * 0.38, -0.18, 0.05), (0.15, 0.3, 0.05), 2, BEAVER_FOOT)
        tips = []
        for k in range(5):
            spread = (k - 2) * 0.11
            tip = Vector((side * (0.38 + spread * 0.9), -0.62 - 0.05 * (2 - abs(k - 2)), 0.03))
            tube(part, [Vector((side * (0.38 + spread * 0.35), -0.34, 0.05)), tip], [0.035, 0.025], [BEAVER_FOOT, BEAVER_FOOT], 6)
            ball(part, (tip.x, tip.y - 0.02, tip.z), (0.03, 0.035, 0.022), 1, tone('#1a1614'))
            tips.append(tip)
        root_y = -0.34
        for k in range(4):
            a = put(part, Vector((side * (0.38 + (k - 2) * 0.11 * 0.35), root_y, 0.045)), BEAVER_WEB)
            b = put(part, Vector((side * (0.38 + (k - 1) * 0.11 * 0.35), root_y, 0.045)), BEAVER_WEB)
            c = put(part, tips[k + 1] + Vector((0.0, 0.06, 0.012)), BEAVER_WEB)
            d = put(part, tips[k] + Vector((0.0, 0.06, 0.012)), BEAVER_WEB)
            face(part, (a, b, c, d) if side > 0 else (d, c, b, a))
    finish(part, 'baver', sharp=180.0, strength=0.5, reach=0.4, floor=0.0, leaf=True)

    # The head, on its neck.
    top = new_part()
    tpaint = top['paint']
    head = ball(top, (0.0, -0.2, 1.5), (0.38, 0.4, 0.34), 3, BEAVER_FUR)
    beaver_fur(tpaint, head, 3.1, False)
    for vert in head:
        # Its cheeks paler, round under its eyes.
        if vert.co.y < -0.3 and vert.co.z < 1.5:
            tpaint[vert] = blend(tpaint[vert], BEAVER_PALE, 0.5)
    muzzle = ball(top, (0.0, -0.5, 1.4), (0.22, 0.2, 0.16), 2, BEAVER_MUZZLE)
    for vert in muzzle:
        tpaint[vert] = blend(BEAVER_MUZZLE, BEAVER_PALE, noise(vert.co.x * 9.0, vert.co.z * 9.0, 4.0) * 0.6)
    ball(top, (0.0, -0.68, 1.47), (0.085, 0.05, 0.06), 2, BEAVER_NOSE)
    # The mouth's line under the nose, a little smile, and the two orange front teeth under it.
    for side in (-1.0, 1.0):
        strip(top, [Vector((0.0, -0.69, 1.4)), Vector((side * 0.06, -0.675, 1.37)), Vector((side * 0.11, -0.64, 1.38))], 0.008, BEAVER_NOSE, Vector((0.0, -1.0, 0.0)))
        tooth = []
        for dx, dz in ((0.0, 0.0), (0.04, 0.0), (0.04, -0.1), (0.0, -0.1)):
            tooth.append(Vector((side * (0.006 + dx), -0.665 + 0.012 * dz, 1.33 + dz)))
        made = face(top, [put(top, p, BEAVER_TOOTH) for p in (tooth if side > 0 else tooth[::-1])], BEAVER_TOOTH)
        back = [put(top, p + Vector((0.0, 0.03, 0.0)), BEAVER_TOOTH) for p in (tooth[::-1] if side > 0 else tooth)]
        face(top, back, lit(BEAVER_TOOTH, 0.7))
        # Its eyes: dark and round, each with a light in it.
        ball(top, (side * 0.17, -0.47, 1.62), (0.078, 0.06, 0.084), 2, tone('#120e0c'))
        ball(top, (side * 0.15, -0.525, 1.655), (0.022, 0.012, 0.022), 1, tone('#e8ecf0'))
        # Small round ears, set back on its head.
        ball(top, (side * 0.27, -0.06, 1.75), (0.08, 0.05, 0.085), 2, BEAVER_DARK)
        ball(top, (side * 0.265, -0.085, 1.75), (0.045, 0.02, 0.05), 1, tone('#2a1e16'))
        # Whiskers, pale and fine, out from the muzzle.
        for w in range(3):
            root = Vector((side * 0.13, -0.6, 1.43 - w * 0.02))
            tip = Vector((side * (0.46 + 0.04 * w), -0.58 + 0.04 * w, 1.47 - w * 0.06))
            a = put(top, root, tone('#d8d0c0'))
            b = put(top, root + Vector((0.0, 0.0, 0.01)), tone('#d8d0c0'))
            c = put(top, tip, tone('#d8d0c0'))
            face(top, (a, b, c) if side > 0 else (c, b, a))
    finish(top, 'baver-huvud', sharp=180.0, strength=0.45, reach=0.3, floor=None, leaf=True)

    # The tail: a flat paddle on the ground behind it, scaled in a pattern of small diamonds, on a hinge at its root.
    hinge = Vector((0.0, 0.62, 0.12))
    tail = new_part()
    rows = []
    shades = []
    for k in range(9):
        t = k / 8.0
        along_ = 0.05 + 1.25 * t
        half = 0.12 + 0.2 * math.sin(min(1.0, t * 1.15) * math.pi) ** 0.6 if t < 0.97 else 0.08
        thick = 0.06 * (1.0 - 0.5 * t) + 0.02
        droop = -0.07 * t * t
        ring = []
        ring_tones = []
        for j in range(12):
            a = TAU * j / 12.0
            x = half * math.cos(a)
            z = droop + thick * math.sin(a)
            ring.append(Vector((x, along_, z)))
            diamond = (int((x + 0.5) * 18.0) + int(along_ * 14.0)) % 2
            ring_tones.append(BEAVER_SCALE if diamond else BEAVER_TAIL)
        rows.append(ring)
        shades.append(ring_tones)
    made = skin(tail, rows, shades, (Vector((0.0, 0.0, 0.0)), BEAVER_FUR), (Vector((0.0, 1.34, -0.07)), BEAVER_TAIL))
    for vert in made[0] + made[1]:
        tail['paint'][vert] = BEAVER_FUR
    disc = finish(tail, 'baver-svans-skiva', sharp=60.0, strength=0.3, reach=0.2, floor=-0.12)
    tail_pivot = bpy.data.objects.new('baver-svans', None)
    bpy.context.scene.collection.objects.link(tail_pivot)
    tail_pivot.location = hinge
    disc.parent = tail_pivot
    tail_pivot.parent = bpy.data.objects['baver']

    # The stick in its paws: a length of young birch, white with its dark marks, gnawed pale where its teeth have been.
    grip = Vector((0.0, -0.62, 1.12))
    stick = new_part()
    path = [Vector((-0.62 + 1.24 * k / 8.0, 0.0, 0.012 * math.sin(k * 0.9))) for k in range(9)]
    made = tube(stick, path, [0.055, 0.058, 0.06, 0.06, 0.058, 0.06, 0.058, 0.056, 0.05], [BIRCH_BARK] * 9, 10)
    for ring in made:
        for vert in ring:
            at = vert.co
            mark = noise(at.x * 7.0, at.y * 20.0, at.z * 20.0)
            colour = BIRCH_MARK if mark > 0.72 else blend(BIRCH_BARK, tone('#c8c0b0'), noise(at.x * 3.0, 1.0, at.z * 9.0))
            # Gnawed: bare wood in two places near its middle.
            if abs(abs(at.x) - 0.12) < 0.07 and at.y < 0.02:
                colour = FRESH_WOOD
            stick['paint'][vert] = colour
    rod = finish(stick, 'baver-pinne-stam', sharp=60.0, strength=0.3, reach=0.15, floor=None)
    stick_pivot = bpy.data.objects.new('baver-pinne', None)
    bpy.context.scene.collection.objects.link(stick_pivot)
    stick_pivot.location = grip
    rod.parent = stick_pivot
    stick_pivot.parent = bpy.data.objects['baver']


# The small lives that were here (the hedgehog, the snail, the frog and the two mallards) have bones and clips of their
# own now, each in a file of its own: art/blender/ambient-animals.py.
