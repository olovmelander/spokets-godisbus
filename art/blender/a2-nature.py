"""Aventyr 2's nature: the trees, rocks, stumps and branches of the night (docs/aventyr-2-overhaul.md).

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone.

Trees are modelled at their height in EL and scaled by the chapter. Their origin is at the foot of the trunk, and
their needles and leaves are thin and seen from both sides. Nothing here comes from anyone else.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)

UP = Vector((0.0, 0.0, 1.0))
GOLDEN = math.radians(137.50776)

BARK_DEEP = tone('#2c2219')
BARK = tone('#54402e')
BARK_PALE = tone('#7a6450')
NEEDLE_DEEP = tone('#16302a')
NEEDLE = tone('#2a5238')
NEEDLE_LIGHT = tone('#3e6c40')
NEEDLE_TIP = tone('#6a9450')


def wanted(name):
    return ONLY is None or ONLY == name


def shoot(part, root, side, down, long, wide, deep, bright):
    """A spruce's hanging shoot: a narrow curtain of needles that ends in a jagged edge, thin and seen from both sides."""
    a = put(part, root, deep)
    b = put(part, root + side * (wide * 0.62) + down * (long * 0.38), blend(deep, bright, 0.45))
    c = put(part, root + side * (wide * 0.88) + down * (long * 0.96), bright)
    d = put(part, root + side * (wide * 0.42) + down * (long * 0.74), blend(deep, bright, 0.7))
    e = put(part, root + side * (wide * 0.12) + down * long * 1.02, bright)
    f = put(part, root - side * (wide * 0.24) + down * (long * 0.62), blend(deep, bright, 0.55))
    face(part, (a, b, d))
    face(part, (b, c, d))
    face(part, (a, d, f))
    face(part, (d, e, f))


def spruce_bough(part, root, out, long, hang, wide, shade, seed):
    """A bough of a Norrland spruce: out from the stem, down under its own weight, and the tip turning up again."""
    side = out.cross(UP)
    side.normalize()
    points = []
    for k in range(5):
        s = k / 4.0
        drop = long * hang * s - long * 0.34 * hang * s * s * s
        points.append(root + out * (long * s) - UP * drop)
    deep = lit(NEEDLE_DEEP, shade)
    for k in range(4):
        a = points[k]
        b = points[k + 1]
        s = (k + 1) / 4.0
        bright = lit(blend(NEEDLE, NEEDLE_LIGHT, s), shade)
        wing = wide * (1.0 - s * 0.62)
        # The rib's own flat, so that it is green from above and has no bare line down it.
        p = put(part, a - side * (wing * 0.5), deep)
        q = put(part, a + side * (wing * 0.5), deep)
        r = put(part, b + side * (wing * 0.32), bright)
        t = put(part, b - side * (wing * 0.32), bright)
        face(part, (p, q, r, t))
        hanging = long * (0.5 - 0.2 * s) * (0.8 + 0.4 * rnd(seed, k))
        for way in (-1.0, 1.0):
            if rnd(seed + k, way) < 0.12:
                continue
            at = a + (b - a) * (0.35 + 0.3 * rnd(seed, k + way)) + side * (way * wing * 0.42)
            turned = (side * way + UP * -0.18)
            turned.normalize()
            shoot(part, at, side * way, -UP, hanging, wing * 0.75, deep, lit(blend(NEEDLE_LIGHT, NEEDLE_TIP, s * 0.7), shade))
    # A pale new shoot at the tip.
    tip = points[-1]
    a = put(part, points[-2], lit(NEEDLE_LIGHT, shade))
    b = put(part, tip + out * (long * 0.09) + UP * (long * 0.02), lit(NEEDLE_TIP, shade))
    c = put(part, tip - side * (wide * 0.2), lit(NEEDLE, shade))
    d = put(part, tip + side * (wide * 0.2), lit(NEEDLE, shade))
    face(part, (a, c, b, d))


def skirt(part, centre, top, bottom, reach, tips, shade, seed):
    """A tier of the crown's dark core: a collar at the stem and a jagged, hanging edge, so that the tree is a mass with no
    daylight through it, and the boughs only make its edge."""
    collar = []
    edge = []
    notch = []
    for j in range(tips):
        turn = TAU * (j + 0.4 * rnd(seed, j)) / tips
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        far = reach * (0.78 + 0.34 * rnd(seed, j * 3.0))
        collar.append(put(part, centre + out * (reach * 0.1) + UP * top, lit(NEEDLE_DEEP, 0.5 * shade)))
        edge.append(put(part, centre + out * far + UP * (bottom - (bottom - top) * 0.1 * rnd(seed, j)), lit(NEEDLE, shade)))
        between = turn + TAU * 0.5 / tips
        back = Vector((math.cos(between), math.sin(between), 0.0))
        notch.append(put(part, centre + back * (far * 0.62) + UP * (bottom + (top - bottom) * 0.36), lit(NEEDLE_DEEP, 0.8 * shade)))
    for j in range(tips):
        k = (j + 1) % tips
        face(part, (collar[j], edge[j], notch[j]))
        face(part, (collar[j], notch[j], collar[k]))
        face(part, (collar[k], notch[j], edge[k]))


def spruce(name, high, wide, seed, boughs, lean):
    """A Norrland spruce: a narrow spire of drooping boughs, thick at its foot, bare low down, with a bough missing here and
    there. Its height is `high`, its widest reach `wide`."""
    if not wanted(name):
        return
    part = new_part()
    rings = []
    tones = []
    count = 10
    levels = 16
    stem = []
    foot = high * 0.016
    for i in range(levels):
        t = i / (levels - 1.0)
        z = -0.6 + (high + 0.6) * t ** 1.25
        centre = Vector((lean * t * t * high * 0.03 + 0.2 * math.sin(t * 5.0 + seed) * t, 0.3 * math.sin(t * 3.0 + seed * 2.0) * t, z))
        stem.append(centre)
        radius = foot * (1.0 - t) ** 0.8 + 0.03
        ripple = []
        row = []
        flare = max(0.0, 1.0 - z / (high * 0.06))
        for j in range(count):
            # The roots: ribs that run out into the ground at its foot.
            rib = 0.5 + 0.5 * math.cos(j * TAU / 5.0 + seed)
            ripple.append(1.0 + flare * (0.35 + 0.55 * rib * rib) + 0.05 * noise(j * 1.3, t * 9.0, seed))
            grain = noise(j * 0.9 + seed, z * 0.8, 3.0)
            row.append(blend(BARK_DEEP, blend(BARK, BARK_PALE, noise(j * 2.0, z * 0.35, seed) ** 2.0), grain * 1.3))
        rings.append(circle(centre, Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), radius, count, turn=0.5 * (i % 2), ripple=ripple))
        tones.append(row)
    skin(part, rings, tones, None, (Vector((stem[-1].x, stem[-1].y, high + 1.2)), NEEDLE_LIGHT))
    low = high * 0.1
    # The dark core, tier on tier, up the stem.
    tiers = 15
    for i in range(tiers):
        t = i / (tiers - 1.0)
        z = low + (high * 0.98 - low) * t ** 0.9
        fall = (high / tiers) * (1.5 - 0.5 * t)
        reach = wide * 0.72 * (0.14 + 0.86 * (1.0 - t) ** 0.8) * min(1.0, 0.6 + t * 4.0)
        at = stem[min(levels - 1, int(((z + 0.6) / (high + 0.6)) ** 0.8 * (levels - 1)))]
        skirt(part, Vector((at.x, at.y, 0.0)), z, z - fall, reach, 11, 0.7 + 0.5 * t, seed + i)
    for i in range(boughs):
        t = (i + 0.5) / boughs
        if rnd(seed + i, 7.0) < 0.1 and t < 0.8:
            continue
        z = low + (high - low) * t ** 0.92
        turn = i * GOLDEN + 0.5 * rnd(seed, i)
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        level = z / high
        share = 0.26 + 0.74 * (1.0 - level) ** 0.72
        # The lowest are short and dying, the longest a third of the way up.
        share = share * min(1.0, 0.55 + level * 3.2)
        long = wide * share * (0.72 + 0.42 * rnd(seed, i * 3.0))
        ring_at = stem[min(levels - 1, int(((z + 0.6) / (high + 0.6)) ** 0.8 * (levels - 1)))]
        root = Vector((ring_at.x, ring_at.y, z)) + out * (foot * (1.0 - level) * 0.8)
        hang = 0.62 - 0.32 * level
        # Inside the crown it is dark, and light reaches its top first.
        shade = 0.66 + 0.5 * level + 0.2 * rnd(seed, i * 5.0)
        spruce_bough(part, root, out, long, hang, 1.3 + long * 0.2, shade, seed + i)
    return finish(part, name, strength=0.0, leaf=True)


spruce('gran-a', 60.0, 11.0, 1.3, 120, 1.0)
spruce('gran-b', 60.0, 9.0, 4.7, 104, -1.0)
spruce('gran-c', 42.0, 8.5, 8.1, 84, 0.5)

# --- birches ------------------------------------------------------------------------------------------------------
# A hanging birch in October: a white stem, black and fissured at its foot, marked with dark lenses, thin limbs that rise
# and arch, and long thin twigs hanging down in gold. Its crown is clouds of leaves with hanging strands at their edge.

BIRCH_WHITE = tone('#e8e4d8')
BIRCH_SHADE = tone('#b4b0a6')
BIRCH_BLACK = tone('#1e1c1a')
BIRCH_FOOT = tone('#3a3430')
LEAF_DEEP = tone('#5c5a22')
LEAF_MID = tone('#a88a2c')
LEAF_GOLD = tone('#d8b43c')
LEAF_GREEN = tone('#7c8434')
LIMB = tone('#5a4c40')


def stem_tube(part, path, radii, sides, colours_at):
    """A stem along a path: each ring's points take their colour from a table of rows, one row a ring."""
    rings = []
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(Vector((0.13, 1.0, 0.07)))
        side.normalize()
        up = side.cross(ahead)
        rings.append(circle(path[i], side, up, radii[i], sides, turn=0.5 * (i % 2)))
    skin(part, rings, colours_at, None, (path[-1], colours_at[-1][0]))


def strand(part, root, long, seed, deep, bright):
    """A hanging birch twig: a ribbon of overlapping leaves, narrow at its end and turning a little as it falls."""
    turn = rnd(seed, 1.0) * TAU
    across = Vector((math.cos(turn), math.sin(turn), 0.0))
    drift = Vector((0.16 * (rnd(seed, 2.0) - 0.5), 0.16 * (rnd(seed, 3.0) - 0.5), -1.0))
    leaves = 5
    wide = 0.62 + 0.4 * rnd(seed, 4.0)
    for k in range(leaves):
        s = k / leaves
        s2 = (k + 1.0) / leaves
        at = root + drift * (long * s)
        end = root + drift * (long * s2) + across * (0.26 * math.sin(k * 2.1 + seed))
        tone_of = blend(deep, bright, s * 0.75 + 0.4 * rnd(seed + k, 5.0))
        w = wide * (1.05 - s * 0.6)
        a = put(part, at, lit(tone_of, 0.8))
        b = put(part, at + (end - at) * 0.5 + across * w, tone_of)
        c = put(part, end + (end - at) * 0.3, lit(tone_of, 1.15))
        d = put(part, at + (end - at) * 0.5 - across * w, tone_of)
        face(part, (a, b, c, d))


def crown_cloud(part, centre, size, seed, shade):
    """A cloud of leaves: a rough ball with its surface broken up in tufts, gold on top and dark beneath."""
    verts = lump(part, centre, size, 1, LEAF_MID)
    for vert in verts:
        at = (vert.co - centre)
        unit = Vector((at.x / size[0], at.y / size[1], at.z / size[2]))
        bump = noise(unit.x * 2.3 + seed, unit.y * 2.3, unit.z * 2.3)
        vert.co = centre + at * (0.72 + 0.62 * bump)
        high = unit.z * 0.5 + 0.5
        fleck = noise(unit.x * 5.0, unit.y * 5.0 + seed, unit.z * 5.0)
        colour = blend(LEAF_DEEP, blend(LEAF_GREEN, LEAF_GOLD, fleck * 1.4 - 0.1), high * 1.1)
        part['paint'][vert] = lit(colour, shade)


def birch(name, high, seed, limbs):
    if not wanted(name):
        return
    part = new_part()
    levels = 22
    sides = 11
    path = []
    radii = []
    rows = []
    foot = high * 0.02
    for i in range(levels):
        t = i / (levels - 1.0)
        z = -0.5 + high * 0.9 * t
        path.append(Vector((math.sin(t * 3.0 + seed) * high * 0.012 * (t + 0.2), math.cos(t * 2.0 + seed) * high * 0.012 * t, z)))
        radii.append(foot * (1.0 - t * 0.9) ** 1.1 * (1.0 + 0.5 * max(0.0, 1.0 - z / 2.2)))
        row = []
        for j in range(sides):
            n = noise(j * 1.1 + seed, z * 0.5, 2.0)
            colour = blend(BIRCH_SHADE, BIRCH_WHITE, n * 1.5)
            # The foot: black and deeply fissured, reaching up further in tongues.
            reach = high * (0.06 + 0.1 * noise(j * 0.9, seed, 5.0))
            if z < reach:
                colour = blend(BIRCH_FOOT, BIRCH_BLACK, noise(j * 2.0, z * 2.0, 8.0) * 1.5)
            row.append(colour)
        rows.append(row)
    stem_tube(part, path, radii, sides, rows)
    # The dark lenses of the bark: thin marks across the stem, wider at its foot.
    for i in range(int(high * 1.5)):
        t = 0.08 + 0.8 * rnd(seed, i * 1.7)
        k = int(t * (levels - 1))
        turn = rnd(seed, i * 2.3) * TAU
        centre = path[k]
        radius = radii[k] * 1.03
        wide = (0.3 + 0.55 * rnd(seed, i) ** 2.0) * (1.2 - t)
        span = min(1.3, wide / max(0.12, radius))
        mid = []
        for s in (-1.0, -0.33, 0.33, 1.0):
            angle = turn + s * span * 0.5
            mid.append(centre + Vector((math.cos(angle), math.sin(angle), 0.0)) * radius)
        thick = 0.05 + 0.07 * (1.0 - abs(rnd(seed, i * 4.1) - 0.5) * 2.0)
        top = [put(part, mid[1] + UP * thick, BIRCH_BLACK), put(part, mid[2] + UP * thick, BIRCH_BLACK)]
        low = [put(part, mid[1] - UP * thick, BIRCH_BLACK), put(part, mid[2] - UP * thick, BIRCH_BLACK)]
        ends = [put(part, mid[0], BIRCH_BLACK), put(part, mid[3], BIRCH_BLACK)]
        face(part, (ends[0], low[0], top[0]))
        face(part, (low[0], low[1], top[1], top[0]))
        face(part, (low[1], ends[1], top[1]))
    # Limbs: they leave the stem, rise, and arch over.
    clouds = []
    for i in range(limbs):
        t = 0.42 + 0.54 * (i + 0.5) / limbs
        k = int(t * (levels - 1))
        turn = i * GOLDEN + rnd(seed, i)
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        long = high * (0.17 + 0.22 * (1.0 - t)) * (0.8 + 0.4 * rnd(seed, i * 1.3))
        points = []
        for s in range(5):
            q = s / 4.0
            points.append(path[k] + out * (long * q) + UP * (long * (0.85 * q - 0.55 * q * q)))
        row = [LIMB, LIMB, LIMB, LIMB, LIMB]
        tube(part, points, [radii[k] * 0.5, radii[k] * 0.38, radii[k] * 0.27, radii[k] * 0.17, 0.05], row, 5)
        clouds.append(points[-1])
        clouds.append(points[2])
    # Short dark twigs close in, so that the crown has a heart, and long bright ones hanging from every limb's outer half.
    for i in range(int(high * 2.2)):
        base = clouds[i % len(clouds)]
        turn = rnd(seed, i * 1.1) * TAU
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        root = base + out * (high * 0.05 * rnd(seed, i * 1.3)) + UP * (high * 0.05 * rnd(seed, i * 1.7))
        strand(part, root, high * (0.05 + 0.05 * rnd(seed, i * 2.1)), seed + i * 2.0, lit(LEAF_DEEP, 0.7), LEAF_DEEP)
    for i in range(int(high * 3.6)):
        base = clouds[i % len(clouds)]
        turn = rnd(seed, i * 1.9) * TAU
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        size = high * 0.1
        root = base + out * (size * rnd(seed, i) ** 0.6) + UP * (size * 0.5 * (rnd(seed, i * 2.0) - 0.3))
        strand(part, root, high * (0.08 + 0.13 * rnd(seed, i * 3.0)), seed + i, LEAF_DEEP, LEAF_GOLD if rnd(seed, i * 7.0) < 0.7 else LEAF_GREEN)
    return finish(part, name, strength=0.0, leaf=True)


birch('bjork-a', 60.0, 2.1, 11)
birch('bjork-b', 60.0, 6.4, 9)

# --- a pine ---------------------------------------------------------------------------------------------------------
# Tall and bare, its bark grey and plated low down and orange high up, its crown a few flat, dark plates.

PINE_LOW = tone('#5a4a3e')
PINE_HIGH = tone('#b5693a')
PINE_DARK = tone('#1f3a2c')
PINE_LIGHT = tone('#4c7248')


def pine(name, high, seed):
    if not wanted(name):
        return
    part = new_part()
    levels = 18
    sides = 9
    path = []
    radii = []
    rows = []
    for i in range(levels):
        t = i / (levels - 1.0)
        z = -0.5 + high * t
        path.append(Vector((high * 0.05 * math.sin(t * 2.6 + seed) * t, high * 0.03 * math.sin(t * 3.4 + seed), z)))
        radii.append(high * 0.016 * (1.0 - t * 0.86) * (1.0 + 0.4 * max(0.0, 1.0 - z / 2.0)))
        row = []
        for j in range(sides):
            plate = noise(j * 1.3 + seed, z * 0.7, 4.0)
            warm = max(0.0, min(1.0, (t - 0.3) * 2.6 + (noise(j, z * 0.4, 1.0) - 0.5)))
            row.append(lit(blend(PINE_LOW, PINE_HIGH, warm), 0.72 + 0.56 * plate))
        rows.append(row)
    stem_tube(part, path, radii, sides, rows)
    plates = 9
    for i in range(plates):
        t = 0.62 + 0.38 * (i + 0.5) / plates
        k = int(t * (levels - 1))
        turn = i * GOLDEN + seed
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        long = high * (0.2 - 0.13 * (t - 0.62) / 0.38) * (0.8 + 0.4 * rnd(seed, i))
        points = [path[k], path[k] + out * (long * 0.5) + UP * (long * 0.1), path[k] + out * long + UP * (long * 0.04)]
        tube(part, points, [radii[k] * 0.45, radii[k] * 0.3, 0.08], [PINE_LOW, PINE_HIGH, PINE_LOW], 5)
        # A pine's crown is not a plate but a cloud of tufts on the bough's end: a main one and four smaller ones
        # round it, each lumpy, dark beneath and catching the light on top, so that sky shows between them.
        tufts = [(Vector((0.0, 0.0, 0.0)), 1.0)]
        for n in range(4):
            a = turn + n * 1.7 + rnd(seed + i, n) * 0.8
            reach = long * (0.26 + 0.12 * rnd(i, n + seed))
            tufts.append((Vector((math.cos(a) * reach, math.sin(a) * reach * 0.9, long * (rnd(n, i) - 0.45) * 0.08)), 0.5 + 0.25 * rnd(seed, i + n)))
        for n, (shift, k) in enumerate(tufts):
            centre = points[2] + shift
            size = (long * 0.42 * k, long * 0.38 * k, long * 0.15 * (0.7 + 0.5 * k))
            verts = lump(part, centre, size, 2, PINE_DARK)
            for vert in verts:
                at = vert.co - centre
                flat_top = max(0.0, at.z / size[2])
                bump = noise(at.x * 0.9 + seed + n, at.y * 0.9, i * 1.7 + n)
                tuft = 0.75 + 0.6 * bump
                vert.co = centre + Vector((at.x * tuft, at.y * tuft, at.z * (0.6 + 0.9 * bump)))
                under = max(0.0, -at.z / size[2])
                part['paint'][vert] = lit(blend(PINE_DARK, PINE_LIGHT, flat_top * 0.95 + bump * 0.45 - 0.25), 1.0 - 0.35 * under)
    return finish(part, name, strength=0.0, leaf=True)


pine('tall-a', 62.0, 3.2)

# --- rock --------------------------------------------------------------------------------------------------------
# Lichened granite, as on Billaberget: rounded by the ice, with flat planes where it has split, a crack or two, pale crust
# lichen, gold lichen, and moss on what faces up. Neutral, so that a chapter's light is what colours it.

GRANITE = tone('#8c8f92')
GRANITE_DARK = tone('#54585c')
GRANITE_PALE = tone('#b8b9b4')
LICHEN_PALE = tone('#d4d6c4')
LICHEN_GOLD = tone('#b09a42')
CRACK = tone('#26282c')
MOSS_DEEP = tone('#2c4a24')
MOSS_BRIGHT = tone('#7e9a38')


def boulder(name, size, detail, seed, planes, crack, mossy=1.0, floor=0.0):
    if not wanted(name):
        return
    part = new_part()
    verts = lump(part, (0.0, 0.0, 0.0), (1.0, 1.0, 1.0), detail, GRANITE)
    split = Vector(crack[0])
    split.normalize()
    for vert in verts:
        at = vert.co.copy()
        at = at * (0.84 + 0.32 * noise(at.x * 1.2 + seed, at.y * 1.2, at.z * 1.2))
        for plane in planes:
            normal = Vector(plane[0])
            normal.normalize()
            over = at.dot(normal) - plane[1]
            if over > 0.0:
                at = at - normal * over
        near = abs(at.dot(split) - crack[1])
        groove = max(0.0, 1.0 - near / 0.05)
        at = at * (1.0 - 0.06 * groove)
        vert.co = Vector((at.x * size[0], at.y * size[1], at.z * size[2] + size[2] * 0.7))
        grain = noise(at.x * 6.0 + seed, at.y * 6.0, at.z * 6.0)
        colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 0.9 + 0.1)
        patch = noise(at.x * 2.4 + seed * 2.0, at.y * 2.4 + 4.0, at.z * 2.4)
        if patch > 0.64:
            colour = blend(colour, LICHEN_PALE, (patch - 0.64) * 4.0)
        gold = noise(at.x * 3.2 + 9.0, at.y * 3.2 + seed, at.z * 3.2)
        if gold > 0.74:
            colour = blend(colour, LICHEN_GOLD, (gold - 0.74) * 5.0)
        colour = blend(colour, CRACK, groove * 0.9)
        up = at.z / max(0.001, at.length)
        green = (up - 0.55 + (noise(at.x * 2.0 + seed, at.y * 2.0, 3.0) - 0.5) * 0.7) * 4.0 * mossy
        if green > 0.0:
            colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(at.x * 3.0, at.y * 3.0, seed)), green)
        part['paint'][vert] = colour
    return finish(part, name, sharp=44.0, strength=0.65, reach=0.8, floor=floor)


boulder('block-a', (5.0, 3.6, 3.2), 4, 1.7, [((0.3, -0.5, 1.0), 0.62), ((-0.8, 0.1, 0.3), 0.74)], ((1.0, 0.2, 0.4), 0.12), 0.8)
boulder('block-b', (3.4, 3.0, 2.2), 4, 4.3, [((-0.2, -0.3, 1.0), 0.55), ((0.9, -0.3, 0.2), 0.7)], ((0.5, 1.0, 0.3), -0.1), 1.0)
boulder('block-c', (6.4, 4.2, 4.4), 4, 7.9, [((0.1, -0.9, 0.5), 0.68), ((0.8, 0.2, 0.6), 0.72)], ((1.0, -0.4, 0.2), 0.2), 0.6)
boulder('block-d', (2.0, 1.8, 1.3), 3, 9.1, [((0.0, 0.1, 1.0), 0.58)], ((0.3, 1.0, 0.1), 0.0), 1.2)


def shelf(name, wide, deep, thick, seed):
    """A shelf of rock: a slab split off a cliff, flat on top where he stands, rough and tapering under it into the rock
    behind. Its origin is the middle of its top's front edge, and it goes back along +Y."""
    if not wanted(name):
        return
    part = new_part()
    columns = 15
    rows = 7
    rings = []
    tones = []
    for i in range(rows):
        t = i / (rows - 1.0)
        # From the back of its top, over its front lip, and under it to the back again.
        ring = []
        row = []
        for j in range(columns):
            s = j / (columns - 1.0)
            x = (s - 0.5) * wide
            edge = 1.0 - (2.0 * s - 1.0) ** 6
            lip = 0.32 * deep * noise(x * 0.5 + seed, 1.0, 2.0) * edge
            if t < 0.34:
                k = t / 0.34
                y = deep * (1.0 - k) - lip * k
                z = -0.02 * noise(x, y, seed)
            elif t < 0.5:
                k = (t - 0.34) / 0.16
                y = -lip - 0.14 * thick * math.sin(k * 3.14)
                z = -thick * 0.42 * k * (0.7 + 0.6 * noise(x * 0.8, seed, 4.0))
            else:
                k = (t - 0.5) / 0.5
                y = -lip * (1.0 - k) + deep * k
                z = -thick * (0.42 + 0.58 * k) * (0.7 + 0.6 * noise(x * 0.8, seed, 4.0 + k))
            at = Vector((x * (1.0 - 0.1 * max(0.0, t - 0.5)), y, z))
            ring.append(at)
            grain = noise(x * 1.7 + seed, y * 1.7, z * 2.0)
            colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 1.3)
            if t < 0.2:
                colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(x, y, seed)), max(0.0, 1.2 - t * 8.0) * noise(x * 0.8, y * 0.8, 7.0) * 1.8)
            lichen = noise(x * 1.1, y * 1.1 + seed, 2.0 + z)
            if lichen > 0.6:
                colour = blend(colour, LICHEN_PALE, (lichen - 0.6) * 5.0)
            row.append(colour)
        rings.append(ring)
        tones.append(row)
    skin(part, rings, tones, closed=False)
    return finish(part, name, sharp=60.0, strength=0.5, reach=0.6, floor=None)


shelf('hylla-a', 4.0, 1.8, 1.7, 2.3)
shelf('hylla-b', 5.6, 2.0, 2.0, 5.8)

# --- stumps, logs and branches -----------------------------------------------------------------------------------------

WOOD = tone('#c9a878')
WOOD_PALE = tone('#e2cfa4')
WOOD_HEART = tone('#a07850')
# Fresh wood a beaver has cut: warm, a little orange, darker in the bottom of each tooth mark.
GNAW = tone('#e2c592')
GNAW_GROOVE = tone('#a47a48')


def bark_row(sides, z, seed, wet=1.0):
    row = []
    for j in range(sides):
        n = noise(j * 1.2 + seed, z * 1.4, 3.0)
        row.append(lit(blend(BARK_DEEP, blend(BARK, BARK_PALE, noise(j * 2.3, z * 2.0, seed) ** 1.5), n * 1.5), wet))
    return row


# --- old wood seen close -------------------------------------------------------------------------------------------------
# The stumps, the great windfall and the root plate are seen from the height of a boot, as big as buildings (Olov, 14
# November 2026: "förbättra även designen och texturen på stubben", "det liggande trädet", "rotvältan ... modelleras
# bättre"). Their forms are modelled here, and each of their faces says what it is and where on its tree it is, so that
# the game can draw the bark's plates, the year rings and the earth on them (`_BARK`, src/render/old-wood.ts):
#   the kind, and two numbers the kind reads:
#   1 spruce bark, 2 birch bark, 4 bare wood, 7 a root's bark, 9 wood a beaver has cut: how far along the stem and how
#     far round it, in EL;
#   3 a sawn end: where it is from the pith, across the cut, in the stump's radius;
#   5 earth, 6 moss, 8 stone, 10 resin, 0 nothing drawn on it.
# All three are written as numbers from 0 to 1, which the pack step stores small: the kind in sixteenths, and the two
# numbers from -8 to 32 (`BARK_FROM`, `BARK_SPAN`).
BARK_FROM = -8.0
BARK_SPAN = 40.0
STUFF['kit-bark'] = LEAF.copy()
STUFF['kit-bark'].name = 'kit-bark'
K_PLAIN = 0
K_SPRUCE = 1
K_BIRCH = 2
K_END = 3
K_BARE = 4
K_SOIL = 5
K_MOSS = 6
K_ROOT = 7
K_STONE = 8
K_GNAW = 9
K_RESIN = 10

# An old spruce's bark: grey-brown plates, darker between them, red-brown where one has flaked off.
OLD_BARK = tone('#8a715c')
OLD_BARK_DEEP = tone('#4a3a2e')
OLD_BARK_PALE = tone('#ab947d')
OLD_BARK_RED = tone('#9c6646')
# Wood: just torn, sawn a few years ago and gone a little grey, long dead and silvered, and rotten at the heart.
TORN = tone('#ecd29c')
TORN_DEEP = tone('#c69a5e')
SAWN = tone('#d4bb90')
SAWN_GREY = tone('#a89c88')
SAWN_HEART = tone('#a87e56')
SILVER = tone('#a49c8e')
SILVER_DEEP = tone('#6c655c')
ROT = tone('#5e3a22')
RESIN = tone('#e2c67c')
# The red-belted bracket fungus of spruce stumps (klibbticka): a dark crust, a red band, a cream margin and underside.
CONK_CRUST = tone('#342c28')
CONK_RED = tone('#a8442a')
CONK_ORANGE = tone('#d0762e')
CONK_CREAM = tone('#f0e4c2')
CONK_UNDER = tone('#d6c89e')
# The ground a tree stood in: black humus under the moss, the grey leached sand, the rust-brown earth under that.
HUMUS = tone('#54402e')
EARTH = tone('#9c7854')
EARTH_RUST = tone('#ba7e46')
EARTH_ASH = tone('#c6bdac')
ROOT_BARK = tone('#ac8058')
ROOT_DEEP = tone('#765638')
NEEDLE_DEAD = tone('#9a6a34')
LEAF_FALLEN = tone('#c9a23a')
BEARD = tone('#a8b49a')


def new_wood():
    """A thing of old wood while it is built: as any part, and what each of its faces is (`bark`)."""
    part = new_part()
    part['bark'] = {}
    return part


def wface(part, verts, kind, at=None, colour=None):
    """A face that says what it is: `at` gives the kind's two numbers at each of its points, where it has them."""
    made = face(part, verts, colour)
    part['bark'][made] = (kind, at)
    return made


def wood_skin(part, grid, tones, along, ref, kind, kinds=None, closed=True):
    """Quads between rings of points, round a stem: `along[i]` is how far along it ring i is, and `ref` the radius its
    way round is measured at, so that its bark has plates of one size from its foot to its top. `kinds[i][j]`, where
    given, is what the quad after ring i and point j is."""
    rows = []
    for i in range(len(grid)):
        rows.append([put(part, grid[i][j], tones[i][j]) for j in range(len(grid[i]))])
    count = len(grid[0])
    span = count if closed else count - 1
    for i in range(len(rows) - 1):
        for j in range(span):
            k = (j + 1) % count
            ra = ref * TAU * j / count
            rb = ref * TAU * (j + 1) / count
            wface(part, (rows[i][j], rows[i][k], rows[i + 1][k], rows[i + 1][j]), kinds[i][j] if kinds else kind,
                  {rows[i][j]: (along[i], ra), rows[i][k]: (along[i], rb), rows[i + 1][k]: (along[i + 1], rb), rows[i + 1][j]: (along[i + 1], ra)})
    return rows


def frames(path, hint):
    """For each point of a path: the way it goes, and two ways across it. Along +X with `hint` up, across is the front."""
    out = []
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(hint)
        if side.length < 0.01:
            side = ahead.cross(Vector((1.0, 0.0, 0.0)))
        side.normalize()
        out.append((ahead, side, side.cross(ahead)))
    return out


def wood_tube(part, path, radii, sides, kind, tones, ref, hint=UP, ripple=None, start=0.0, first=None, last=None, seam=math.pi, kinds=None):
    """A stem, a branch or a root along a path, its seam underneath. `tones` is one colour, one for each ring, or a
    table. `first` and `last` close an end with a fan: (point, colour, kind). Gives its points and how far along each
    ring is."""
    fr = frames(path, hint)
    grid = []
    along = []
    run = start
    for i in range(len(path)):
        if i > 0:
            run += (path[i] - path[i - 1]).length
        along.append(run)
        ahead, side, up = fr[i]
        ring = []
        for j in range(sides):
            a = seam + TAU * j / sides
            wide = radii[i] * (ripple[i][j] if ripple else 1.0)
            ring.append(path[i] + (up * math.cos(a) + side * math.sin(a)) * wide)
        grid.append(ring)
    if isinstance(tones, tuple):
        table = [[tones] * sides for _ in path]
    elif isinstance(tones[0], list):
        table = tones
    else:
        table = [[tone_of] * sides for tone_of in tones]
    rows = wood_skin(part, grid, table, along, ref, kind, kinds)
    for end, row, far in ((first, rows[0], along[0]), (last, rows[-1], along[-1])):
        if end is None:
            continue
        tip = put(part, end[0], end[1])
        for j in range(sides):
            k = (j + 1) % sides
            wface(part, (row[j], row[k], tip), end[2], {row[j]: (far, 0.0), row[k]: (far, 0.0), tip: (far + 0.05, 0.0)})
    return rows, along


def wood_lump(part, centre, size, detail, colour, kind):
    """A round lump of one kind (moss, a stone, a clod): an icosphere, to push about and paint. Gives its points."""
    matrix = Matrix.Translation(centre) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    ball = bmesh.new()
    bmesh.ops.create_icosphere(ball, subdivisions=detail, radius=1.0, matrix=matrix)
    ball.verts.index_update()
    made = [put(part, vert.co.copy(), colour) for vert in ball.verts]
    for side in ball.faces:
        wface(part, [made[vert.index] for vert in side.verts], kind)
    ball.free()
    return made


def spike(part, foot, tip, thick, colour, pale, kind=K_BARE, sides=3):
    """A splinter or a twig: a thin point from `foot` to `tip`."""
    ahead = tip - foot
    long = ahead.length
    ahead.normalize()
    side = ahead.cross(Vector((0.31, 0.2, 0.93)))
    side.normalize()
    up = side.cross(ahead)
    ring = []
    for j in range(sides):
        a = TAU * j / sides
        ring.append(put(part, foot + (side * math.cos(a) + up * math.sin(a)) * thick, colour))
    end = put(part, tip, pale)
    for j in range(sides):
        k = (j + 1) % sides
        wface(part, (ring[j], ring[k], end), kind, {ring[j]: (0.0, 0.0), ring[k]: (0.0, 0.02), end: (long, 0.01)})


def moss_cushion(part, centre, size, seed, detail=1, bright=1.0, axes=None):
    """A cushion of moss: a low lump, lumpy, dark where it tucks under and bright on its crown. `axes` are the three
    ways its sizes are measured along, the last of them its crown's; level and upright if none are given."""
    verts = wood_lump(part, Vector((0.0, 0.0, 0.0)), (1.0, 1.0, 1.0), detail, MOSS_DEEP, K_MOSS)
    ex, ey, ez = axes if axes else (Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), UP)
    for vert in verts:
        unit = vert.co.copy()
        bump = noise(unit.x * 2.1 + seed, unit.y * 2.1, unit.z * 2.1 + seed * 0.7)
        grown = unit * (0.84 + 0.36 * bump)
        vert.co = centre + ex * (grown.x * size[0]) + ey * (grown.y * size[1]) + ez * (grown.z * size[2])
        high = max(0.0, min(1.0, unit.z * 0.6 + 0.45))
        fleck = noise(unit.x * 4.0 + seed, unit.y * 4.0, unit.z * 4.0)
        part['paint'][vert] = lit(blend(MOSS_DEEP, blend(MOSS_DEEP, MOSS_BRIGHT, 0.45 + 0.75 * fleck), high), bright)
    return verts


def bracket(part, at, out, wide, seed):
    """A shelf fungus on a stem, the red-belted one of spruce stumps: a hoof with its back to the bark at `at`, standing
    out level along `out`: a dark crust, a red band, an orange one and a cream margin, cream underneath."""
    side = out.cross(UP)
    side.normalize()
    deep = wide * (0.56 + 0.16 * rnd(seed, 1.0))
    thick = wide * (0.4 + 0.14 * rnd(seed, 2.0))
    columns = 9
    bands = ((0.3, CONK_CRUST), (0.58, blend(CONK_CRUST, CONK_RED, 0.75)), (0.82, blend(CONK_RED, CONK_ORANGE, 0.8)), (1.0, CONK_CREAM))
    apex = put(part, at + UP * (thick * 0.6) - out * (wide * 0.04), lit(CONK_CRUST, 0.8))
    rows = []
    for s, colour in bands:
        row = []
        for c in range(columns):
            a = math.pi * c / (columns - 1.0)
            wave = 1.0 + 0.07 * math.sin(c * 2.3 + seed * 5.0) * s
            point = at + side * (math.cos(a) * wide * 0.5 * s ** 0.8 * wave) + out * (math.sin(a) * deep * s * wave - wide * 0.04)
            point = point + UP * (thick * 0.6 * (1.0 - s ** 1.7) - thick * 0.12 * s + 0.02 * wide * math.sin(s * 9.0 + c))
            row.append(put(part, point, lit(colour, 0.9 + 0.2 * rnd(seed + c, s))))
        rows.append(row)
    for c in range(columns - 1):
        wface(part, (apex, rows[0][c], rows[0][c + 1]), K_PLAIN)
    for r in range(len(rows) - 1):
        for c in range(columns - 1):
            wface(part, (rows[r][c], rows[r + 1][c], rows[r + 1][c + 1], rows[r][c + 1]), K_PLAIN)
    under = put(part, at - UP * (thick * 0.42) - out * (wide * 0.04), lit(CONK_UNDER, 0.7))
    rim = [put(part, vert.co - UP * (0.012 * wide), CONK_UNDER) for vert in rows[-1]]
    for c in range(columns - 1):
        wface(part, (rows[-1][c], rim[c], rim[c + 1], rows[-1][c + 1]), K_PLAIN)
        wface(part, (under, rim[c + 1], rim[c]), K_PLAIN)


def lying(part, at, way, long, wide, colour, pale, lift=0.008):
    """A needle or a little leaf lying flat where it fell: a thin sliver at `at`, turned `way`."""
    ahead = Vector((math.cos(way), math.sin(way), 0.0))
    side = Vector((-ahead.y, ahead.x, 0.0))
    a = put(part, at - ahead * (long * 0.5) + UP * lift, colour)
    b = put(part, at + side * (wide * 0.5) + UP * lift, pale)
    c = put(part, at + ahead * (long * 0.5) + UP * lift, colour)
    d = put(part, at - side * (wide * 0.5) + UP * lift, pale)
    wface(part, (a, b, c, d), K_PLAIN)


def finish_wood(part, name, sharp=62.0, strength=0.6, reach=0.5, floor=0.0):
    """Makes the object of old wood: every face is the stuff the game draws on, and says what it is (`_BARK`)."""
    bm = part['bm']
    marks = part['bark']
    layer = bm.loops.layers.float_vector.new('_BARK')
    for made in bm.faces:
        kind, at = marks.get(made, (K_PLAIN, None))
        part['stuff'][made] = 'kit-bark'
        for loop in made.loops:
            pair = at.get(loop.vert, (0.0, 0.0)) if at else (0.0, 0.0)
            loop[layer] = (kind / 16.0, max(0.0, min(1.0, (pair[0] - BARK_FROM) / BARK_SPAN)), max(0.0, min(1.0, (pair[1] - BARK_FROM) / BARK_SPAN)))
    return finish(part, name, sharp=sharp, strength=strength, reach=reach, floor=floor, leaf=True)


def old_bark(seed, around, along, low=1.0):
    """The tone of an old spruce's bark at a place on it, before the game draws its plates: `low` darkens what is damp."""
    broad = noise(around * 1.3 + seed, along * 0.5, 3.0)
    fine = noise(around * 4.1, along * 2.3 + seed, 7.0)
    colour = blend(OLD_BARK_DEEP, blend(OLD_BARK, OLD_BARK_PALE, broad * 1.3 - 0.15), 0.45 + 0.6 * fine)
    if noise(around * 2.2 + 5.0, along * 1.4, seed) > 0.72:
        colour = blend(colour, OLD_BARK_RED, 0.5)
    return lit(colour, low)


def buttress_at(roots, angle):
    """How far a stem's foot swells at an angle round it: the most of its roots there. A root: (which way, how far, how wide)."""
    most = 0.0
    for way, far, wide in roots:
        d = (angle - way + math.pi) % TAU - math.pi
        most = max(most, far * math.exp(-(d / wide) ** 2))
    return most


def stem_wide(radius, high, roots, seed, angle, z, rough=0.05, rise=0.9, power=1.6):
    """A stump's radius at an angle and a height: thicker at its foot, its roots as ridges that widen into the ground
    from `rise` of its height down, a little hollow between them, and the furrows of its bark."""
    t = max(0.0, z) / high
    flare = max(0.0, 1.0 - max(0.0, z) / (high * rise)) ** power
    furrow = noise(angle * 7.0 + 0.5 * noise(z * 1.6, angle * 2.0, seed), z * 0.7, seed) - 0.5
    swell = 1.0 + 0.09 * (1.0 - t) ** 2 + flare * (buttress_at(roots, angle) - 0.035) + rough * furrow * (1.0 - 0.6 * flare)
    if z < 0.0:
        swell += 0.5 * buttress_at(roots, angle) * (-z / 0.3)
    return radius * swell


# The sawn stump's roots, which way it fell, and where its felling hinge is across its top, from the pith.
# The chapters turn the stump so that the camera sees it from about 3.5 to 4.2 (and the garden's from 5): there its roots
# are short, so that none reaches out to the path, and the long ones run out to the sides and behind. It fell away from
# the camera, so that the hinge stands across the top, seen from the path.
SAWN_ROOTS = ((0.75, 0.42, 0.3), (2.3, 0.52, 0.3), (3.3, 0.3, 0.24), (4.5, 0.32, 0.26), (5.5, 0.5, 0.3))
SAWN_FELL = Vector((math.cos(0.8), math.sin(0.8), 0.0))
SAWN_ACROSS = Vector((-SAWN_FELL.y, SAWN_FELL.x, 0.0))
SAWN_HINGE = (0.34, 0.47)


def sawn_cut(point, radius, high, seed):
    """How high the saw left the wood at a place on the stump's top: the back cut, level; the hinge, torn fibres standing
    up; and beyond it the notch's floor, a little lower."""
    s = point.dot(SAWN_FELL) / radius
    if s < SAWN_HINGE[0]:
        return high + 0.012 * math.sin(point.dot(SAWN_ACROSS) * 9.0 + s * 3.0) - 0.02 * s
    if s < SAWN_HINGE[1]:
        return high + 0.06 + 0.2 * rnd(round(point.x * 23.0), round(point.y * 23.0) + seed) * (0.4 + 0.6 * noise(point.dot(SAWN_ACROSS) * 6.0, seed, 2.0))
    return high - 0.15 - 0.06 * (s - SAWN_HINGE[1])


def root_toe(part, out, reach, far, seed, n, long, sink, mossy=True):
    """A root running on from its buttress, `long` out and `sink` down into the ground, with moss on its back."""
    turn = Vector((-out.y, out.x, 0.0))
    bend = 0.3 * (rnd(seed, n * 3.0) - 0.5)
    path = []
    radii = []
    count = 7
    for k in range(count):
        s = k / (count - 1.0)
        path.append(out * (reach + long * s) + turn * (bend * long * s * s) + UP * (0.06 - sink * s ** 1.15))
        radii.append((0.15 + far * 0.26) * (1.0 - 0.8 * s) * (1.0 + 0.12 * math.sin(s * 9.0 + n)))
    tones = []
    for k in range(count):
        row = []
        for j in range(7):
            top_side = math.cos(math.pi + TAU * j / 7.0)
            colour = blend(ROOT_DEEP, ROOT_BARK, 0.4 + 0.6 * noise(k * 1.3, j * 1.7, seed + n))
            if mossy and top_side > 0.2 and noise(k * 0.9 + n, j, seed) > 0.4:
                colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, rnd(k, j + n)), 0.8)
            row.append(colour)
        tones.append(row)
    wood_tube(part, path, radii, 7, K_ROOT, tones, 0.2, last=(path[-1] + out * 0.1 - UP * 0.05, ROOT_DEEP, K_ROOT))


def leaf_lying(part, at, way, long, colour, pale):
    """A birch leaf lying where it fell: pointed, widest near its stalk, its edges curled up a little."""
    ahead = Vector((math.cos(way), math.sin(way), 0.0))
    side = Vector((-ahead.y, ahead.x, 0.0))
    middle = put(part, at + UP * 0.012, colour)
    rim = []
    for u, v, lift in ((-0.5, 0.0, 0.02), (-0.2, 0.36, 0.035), (0.14, 0.27, 0.03), (0.52, 0.0, 0.045), (0.14, -0.27, 0.03), (-0.2, -0.36, 0.035)):
        rim.append(put(part, at + ahead * (u * long) + side * (v * long) + UP * lift, pale if u > 0.3 else colour))
    for k in range(6):
        wface(part, (middle, rim[k], rim[(k + 1) % 6]), K_PLAIN)


def sawn_stump(name, radius, high, seed):
    """A spruce someone felled with a saw a few years ago: root buttresses running out into the ground with moss between
    them, plated bark, and its sawn top: the back cut level and pale, the felling hinge standing up across it in torn
    fibres, the notch's floor a little lower beyond it, resin run down from its edge, red-belted bracket fungi on its
    side, and needles and birch leaves lying where they fell. Its top is at `high` and its stem `radius` thick, as the
    stump it takes the place of; towards the camera, as the chapters turn it, nothing of it above the ground reaches
    further than one and a half radii from its middle (`SAWN_ROOTS`; tests/unit/nature-old-wood.test.ts)."""
    if not wanted(name):
        return
    part = new_wood()
    sides = 44
    roots = SAWN_ROOTS
    levels = (-0.3, -0.12, 0.0, 0.07, 0.17, 0.3, 0.46, 0.64, 0.84, 1.02, 1.16, 1.26, 1.3)
    grid = []
    tones = []
    for i, level in enumerate(levels):
        z = level * high / 1.3
        ring = []
        row = []
        for j in range(sides):
            angle = TAU * j / sides
            out = Vector((math.cos(angle), math.sin(angle), 0.0))
            point = out * stem_wide(radius, high, roots, seed, angle, z) + UP * z
            if i == len(levels) - 1:
                point.z = sawn_cut(out * radius * 0.99, radius, high, seed) + 0.012 * rnd(j, seed)
            ring.append(point)
            # Darker and damp at its foot, and moss creeping up the buttresses from the ground.
            colour = old_bark(seed, angle * radius, z, 0.62 + 0.38 * min(1.0, max(0.0, z) / 0.5))
            green = (0.42 - z) * 2.2 * noise(angle * 2.6 + seed, z * 3.0, 4.0) + 1.6 * buttress_at(roots, angle) * max(0.0, 0.3 - z)
            if green > 0.34 and z > -0.05:
                colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(angle * 5.0, z * 5.0, seed)), min(0.9, (green - 0.34) * 3.0))
            row.append(colour)
        grid.append(ring)
        tones.append(row)
    wood_skin(part, grid, tones, [level * high / 1.3 for level in levels], radius, K_SPRUCE)

    # The sawn top, in strips along the hinge so that its step is a clean line: from the back of the back cut, over the
    # hinge's torn fibres, to the far lip of the notch's floor.
    strips = (-0.985, -0.93, -0.8, -0.62, -0.42, -0.2, 0.02, 0.2, 0.3, 0.335, 0.345, 0.38, 0.42, 0.455, 0.47, 0.48, 0.56, 0.68, 0.8, 0.9, 0.96, 0.985)
    points = 17
    top = []
    for s in strips:
        row = []
        for c in range(points):
            k = 2.0 * c / (points - 1.0) - 1.0
            # Across the chord at this distance, out to the stem's own outline there.
            reach = math.sqrt(max(0.0, 1.0 - s * s))
            flat = SAWN_FELL * (s * radius) + SAWN_ACROSS * (k * reach * radius)
            edge = stem_wide(radius, high, roots, seed, math.atan2(flat.y, flat.x), high) * 0.985
            if flat.length > edge:
                flat = flat * (edge / flat.length)
            far = flat.length / radius
            grey = noise(flat.x * 1.7 + seed, flat.y * 1.7, 3.0)
            colour = blend(blend(SAWN, SAWN_GREY, grey * 1.2 - 0.1), SAWN_HEART, max(0.0, 0.5 - far) * 1.1)
            if SAWN_HINGE[0] <= s < SAWN_HINGE[1]:
                colour = blend(TORN, TORN_DEEP, rnd(c * 3.1 + seed, s * 40.0))
            elif s >= SAWN_HINGE[1]:
                colour = lit(colour, 0.86)
            if far > 0.93:
                colour = blend(colour, OLD_BARK_DEEP, (far - 0.93) * 9.0)
            row.append((Vector((flat.x, flat.y, sawn_cut(flat, radius, high, seed))), colour, flat))
        top.append(row)
    made = [[put(part, point, colour) for point, colour, _ in row] for row in top]
    for i in range(len(strips) - 1):
        torn = SAWN_HINGE[0] <= 0.5 * (strips[i] + strips[i + 1]) < SAWN_HINGE[1]
        for c in range(points - 1):
            quad = (made[i][c], made[i][c + 1], made[i + 1][c + 1], made[i + 1][c])
            flats = (top[i][c][2], top[i][c + 1][2], top[i + 1][c + 1][2], top[i + 1][c][2])
            if (flats[0] - flats[2]).length < 0.004 or (flats[1] - flats[3]).length < 0.004:
                continue
            if torn:
                # Fibres that stand up along the stem: read along their height.
                wface(part, quad, K_BARE, {quad[n]: (quad[n].co.z * 3.0, flats[n].dot(SAWN_ACROSS)) for n in range(4)})
            else:
                wface(part, quad, K_END, {quad[n]: (flats[n].x / radius, flats[n].y / radius) for n in range(4)})
    # Splinters of the hinge, left standing where the last fibres tore.
    for n in range(16):
        k = (n + 0.5) / 16.0 * 2.0 - 1.0
        s = 0.5 * (SAWN_HINGE[0] + SAWN_HINGE[1]) + 0.04 * (rnd(seed, n) - 0.5)
        reach = math.sqrt(max(0.0, 1.0 - s * s)) * radius * 0.9
        foot = SAWN_FELL * (s * radius) + SAWN_ACROSS * (k * reach) + UP * (high + 0.03)
        lean = SAWN_FELL * (0.1 * (rnd(n, seed) - 0.2)) + SAWN_ACROSS * (0.06 * (rnd(n, 3.0) - 0.5))
        spike(part, foot, foot + lean + UP * (0.1 + 0.2 * rnd(seed + 2.0, n) ** 2), 0.022 + 0.012 * rnd(n, 5.0), TORN_DEEP, TORN)

    # Each root runs on from its buttress, down into the ground.
    for n, (way, far, wide) in enumerate(roots):
        short = far < 0.36
        root_toe(part, Vector((math.cos(way), math.sin(way), 0.0)), radius * (1.0 + far * 0.6), far, seed, n, 0.7 if short else 1.5, 0.75 if short else 0.6)

    # Moss at its foot, in the lee between the roots.
    for n in range(9):
        a = roots[n % len(roots)][0]
        b = roots[(n + 1) % len(roots)][0] + (TAU if (n + 1) % len(roots) == 0 else 0.0)
        way = a + (b - a) * (0.5 + 0.34 * (rnd(seed, n * 7.0) - 0.5)) + (0.3 if n >= len(roots) else 0.0)
        out = Vector((math.cos(way), math.sin(way), 0.0))
        far = radius * (1.05 + 0.16 * rnd(seed + 1.0, n))
        size = (0.3 + 0.16 * rnd(n, seed), 0.26 + 0.1 * rnd(n, 4.0), 0.1 + 0.08 * rnd(n, 5.0))
        moss_cushion(part, out * far + UP * (0.02 + 0.04 * rnd(n, 6.0)), size, seed + n)

    # Bracket fungi on its side, one over the other where the damp is.
    for n, (way, z, wide) in enumerate(((4.1, 0.46, 0.44), (4.24, 0.8, 0.27), (3.2, 0.34, 0.3), (1.6, 0.7, 0.34))):
        out = Vector((math.cos(way), math.sin(way), 0.0))
        bracket(part, out * (stem_wide(radius, high, roots, seed, way, z) - 0.02) + UP * z, out, wide, seed + n * 3.0)

    # Resin, run down the bark from the cut and set hard.
    for n, way in enumerate((3.72, 4.62, 2.9)):
        long = 0.14 + 0.3 * rnd(seed + 3.0, n)
        prev = None
        for k in range(6):
            s = k / 5.0
            z = sawn_cut(Vector((math.cos(way), math.sin(way), 0.0)) * radius * 0.99, radius, high, seed) - 0.01 - long * s
            wander = way + 0.03 * math.sin(s * 5.0 + n * 2.0)
            out = Vector((math.cos(wander), math.sin(wander), 0.0))
            turn = Vector((-out.y, out.x, 0.0))
            at = out * (stem_wide(radius, high, roots, seed, wander, z) + 0.012) + UP * z
            # Thin where it ran, a bead where it stopped.
            wide = (0.008, 0.011, 0.008, 0.012, 0.022, 0.008)[k]
            pair = (put(part, at - turn * wide, RESIN), put(part, at + turn * wide, lit(RESIN, 0.8)))
            if prev is not None:
                wface(part, (prev[0], prev[1], pair[1], pair[0]), K_RESIN)
            prev = pair

    # What has fallen on it since: spruce needles, rust-brown, and a few birch leaves.
    for n in range(46):
        turn = rnd(seed, n * 1.7) * TAU
        far = radius * 0.86 * math.sqrt(rnd(seed + 5.0, n))
        flat = Vector((math.cos(turn) * far, math.sin(turn) * far, 0.0))
        if SAWN_HINGE[0] - 0.05 <= flat.dot(SAWN_FELL) / radius < SAWN_HINGE[1] + 0.03:
            continue
        flat.z = sawn_cut(flat, radius, high, seed)
        lying(part, flat, rnd(n, seed) * TAU, 0.13 + 0.09 * rnd(n, 2.0), 0.02, lit(NEEDLE_DEAD, 0.75 + 0.5 * rnd(n, 3.0)), NEEDLE_DEAD)
    for n, (x, y, way) in enumerate(((-0.42, 0.18, 0.7), (0.1, -0.52, 2.4), (-0.2, -0.2, 4.0))):
        flat = Vector((x * radius, y * radius, 0.0))
        flat.z = sawn_cut(flat, radius, high, seed)
        leaf_lying(part, flat, way, 0.3, lit(LEAF_FALLEN, 0.8 + 0.15 * n), LEAF_GOLD)
    return finish_wood(part, name, sharp=72.0, strength=0.6, reach=0.7, floor=0.0)


sawn_stump('stubbe-sagad', 1.1, 1.3, 2.2)


# A beaver's stump is a birch's: beavers fell leaf trees, and leave the spruces.
GNAW_ROOTS = ((0.6, 0.26, 0.3), (2.2, 0.22, 0.28), (3.6, 0.26, 0.3), (5.2, 0.2, 0.26))
BAST = tone('#b08a58')
GNAW_OLD = tone('#b09a7c')


def mound_high(radius, angle, far, seed):
    """How high the heap of chips and earth round the gnawed stump's foot is, `far` from its middle."""
    k = max(0.0, min(1.0, (far - radius * 0.9) / (radius * 1.05)))
    return 0.52 * (1.0 - k ** 1.5) - 0.06 * k + 0.05 * (noise(angle * 2.3 + seed, far * 2.0, 1.0) - 0.5) * (1.0 - k)


def gnawed_stump(name, radius, high, seed):
    """A birch a beaver has felled: white bark with its dark lenses, black and fissured at the foot, torn off in a ragged
    edge where the teeth began; above it the beaver's pencil point, scoop beside scoop, each with its tooth marks, up to
    a splintered tip where the last fibres broke; and round its foot a heap of the pale chips it spat out, with moss
    coming. Its tip is `high` and seven tenths of its `radius` up, as it was; the chapters sink it a third of an EL, so
    its heap is what meets their ground."""
    if not wanted(name):
        return
    part = new_wood()
    sides = 36
    stem_high = 1.4
    tip = Vector((0.13, 0.08, high + radius * 0.7))
    point = tip - UP * 0.17
    # Where the bark ends, round the stem: lowest where it gnawed most.
    edges = [1.52 + 0.2 * math.sin(TAU * j / sides - 1.0) + 0.12 * (noise(j * 0.7, seed, 3.0) - 0.5) for j in range(sides)]
    shares = (0.0, 0.1, 0.2, 0.28, 0.37, 0.48, 0.61, 0.76, 0.9, 1.0)
    grid = []
    tones = []
    for i, share in enumerate(shares):
        ring = []
        row = []
        for j in range(sides):
            angle = TAU * j / sides
            z = -0.3 + (edges[j] + 0.3) * share
            out = Vector((math.cos(angle), math.sin(angle), 0.0))
            ring.append(out * stem_wide(radius, stem_high, GNAW_ROOTS, seed, angle, z, rough=0.025, rise=0.55, power=1.8) + UP * z)
            # Black and fissured at the foot, in tongues up into the white.
            foot = 0.62 + 0.5 * noise(angle * 2.2 + seed, 3.0, 5.0)
            if z < foot:
                colour = blend(BIRCH_FOOT, BIRCH_BLACK, noise(angle * 6.0, z * 5.0, 8.0) * 1.3)
                colour = blend(colour, BIRCH_SHADE, max(0.0, (z - foot + 0.14) / 0.14) * 0.6)
            else:
                colour = blend(BIRCH_SHADE, BIRCH_WHITE, noise(angle * 2.0 + seed, z * 1.2, 2.0) * 1.5)
            row.append(colour)
        grid.append(ring)
        tones.append(row)
    rows = wood_skin(part, grid, tones, [-0.3 + 1.82 * share for share in shares], radius, K_BIRCH)

    # The ragged rim where the bark ends: bast torn pale, in jags, and the wood a step in from it.
    rim = []
    wood = []
    for j in range(sides):
        at = rows[-1][j].co
        out = Vector((at.x, at.y, 0.0))
        out.normalize()
        jag = rnd(seed + 3.0, j)
        rim.append(put(part, at - out * (0.01 + 0.02 * jag) + UP * (0.02 + 0.09 * jag * jag), blend(BAST, BIRCH_WHITE, 0.3 * rnd(j, seed))))
        wood.append(put(part, at - out * 0.07 + UP * 0.02, blend(GNAW_OLD, GNAW_GROOVE, 0.5)))
    for j in range(sides):
        k = (j + 1) % sides
        wface(part, (rows[-1][j], rows[-1][k], rim[k], rim[j]), K_PLAIN)
        wface(part, (rim[j], rim[k], wood[k], wood[j]), K_PLAIN)

    # The point: ring on ring of scoops, each ring turned from the last, up to its top.
    bands = 8
    before = wood
    slope = 0.0
    for band in range(1, bands + 1):
        s = band / (bands + 1.0)
        ring = []
        for j in range(sides):
            angle = TAU * j / sides
            scoop = 0.5 + 0.5 * math.sin(angle * 9.0 + band * 2.3 + seed)
            foot = wood[j].co
            keep = (1.0 - s ** 1.25) * (1.0 - 0.07 * scoop)
            at = Vector((point.x + (foot.x - point.x) * keep, point.y + (foot.y - point.y) * keep, foot.z + (point.z - foot.z) * s + 0.02 * scoop))
            fresh = blend(blend(GNAW, GNAW_OLD, max(0.0, 0.5 - s)), WOOD_HEART, 0.3 * noise(j * 3.0, band * 2.0, seed) + 0.25 * s)
            ring.append(put(part, at, blend(fresh, GNAW_GROOVE, scoop ** 3 * 0.22)))
        step = (ring[0].co - before[0].co).length
        for j in range(sides):
            k = (j + 1) % sides
            ra = radius * TAU * j / sides
            rb = radius * TAU * (j + 1) / sides
            wface(part, (before[j], before[k], ring[k], ring[j]), K_GNAW,
                  {before[j]: (slope, ra), before[k]: (slope, rb), ring[k]: (slope + step, rb), ring[j]: (slope + step, ra)})
        slope += step
        before = ring
    top = put(part, point, WOOD_HEART)
    for j in range(sides):
        k = (j + 1) % sides
        wface(part, (before[j], before[k], top), K_GNAW, {before[j]: (slope, 0.0), before[k]: (slope, 0.05), top: (slope + 0.1, 0.02)})
    # Where the stem went over, the last fibres tore: a tuft of splinters on the point.
    for n in range(7):
        turn = n * GOLDEN
        foot = point + Vector((math.cos(turn), math.sin(turn), 0.0)) * (0.02 + 0.035 * rnd(seed, n)) - UP * 0.03
        lean = Vector((math.cos(turn + 1.0), math.sin(turn + 1.0), 0.0)) * (0.05 * rnd(n, seed))
        spike(part, foot, foot + lean + UP * (0.09 + 0.11 * rnd(seed + 1.0, n)), 0.02, GNAW_GROOVE, TORN)

    # Thin curls of birch bark peeling at the torn edge.
    for n in range(5):
        j = int(rnd(seed, n * 5.0) * sides)
        at = rows[-1][j].co
        out = Vector((at.x, at.y, 0.0))
        out.normalize()
        turn = Vector((-out.y, out.x, 0.0))
        long = 0.16 + 0.14 * rnd(n, seed)
        prev = None
        for k in range(4):
            s = k / 3.0
            curl = at - UP * (0.05 + 0.02 * n) + turn * (long * s) + out * (0.02 + 0.09 * s * s) + UP * (0.04 * s * s)
            pair = (put(part, curl + UP * 0.05, BIRCH_WHITE), put(part, curl - UP * 0.05, blend(BAST, BIRCH_WHITE, 0.4)))
            if prev is not None:
                wface(part, (prev[0], prev[1], pair[1], pair[0]), K_PLAIN)
            prev = pair

    # The heap round its foot: earth and old chips gone grey, moss coming on it.
    reach = (0.9, 1.18, 1.5, 1.78, 1.96)
    heap = []
    for far in reach:
        ring = []
        for j in range(sides):
            angle = TAU * (j + 0.5 * (len(heap) % 2)) / sides
            lobe = 1.0 + (far - 0.9) * (0.3 * (noise(angle * 1.6 + seed, 2.0, 7.0) - 0.5) + 0.1 * math.sin(angle * 5.0 + seed))
            at = Vector((math.cos(angle), math.sin(angle), 0.0)) * (far * radius * lobe)
            at.z = mound_high(radius, angle, far * radius, seed)
            earth = blend(HUMUS, EARTH, noise(at.x * 2.0 + seed, at.y * 2.0, 1.0) * 1.2)
            green = noise(at.x * 1.4, at.y * 1.4 + seed, 6.0)
            if green > 0.55:
                earth = blend(earth, blend(MOSS_DEEP, MOSS_BRIGHT, rnd(j, far)), min(1.0, (green - 0.55) * 4.0))
            ring.append(put(part, at, earth))
        heap.append(ring)
    for i in range(len(heap) - 1):
        for j in range(sides):
            k = (j + 1) % sides
            wface(part, (heap[i][j], heap[i][k], heap[i + 1][k], heap[i + 1][j]), K_SOIL)
    # The chips: pale curved flakes as long as his foot, the newest brightest, most of them close in.
    for n in range(52):
        angle = rnd(seed, n * 1.3) * TAU
        far = radius * (1.0 + 0.82 * rnd(seed + 2.0, n) ** 1.6)
        at = Vector((math.cos(angle) * far, math.sin(angle) * far, 0.0))
        at.z = mound_high(radius, angle, far, seed) + 0.025
        way = rnd(n, seed) * TAU
        ahead = Vector((math.cos(way), math.sin(way), 0.0))
        side = Vector((-ahead.y, ahead.x, 0.0))
        long = 0.14 + 0.16 * rnd(n, 2.0)
        wide = 0.06 + 0.06 * rnd(n, 3.0)
        tilt = 0.09 * (rnd(n, 4.0) - 0.3)
        colour = blend(GNAW, GNAW_OLD, rnd(n, 5.0) ** 0.7)
        ends = []
        for u, lift in ((-0.5, 0.0), (0.0, 0.035), (0.5, 0.0)):
            mid = at + ahead * (u * long) + UP * (lift + tilt * (u + 0.5))
            narrow = wide * (1.0 - 0.5 * abs(u) * 2.0 * 0.6)
            ends.append((put(part, mid - side * narrow * 0.5, lit(colour, 0.85)), put(part, mid + side * narrow * 0.5, lit(colour, 1.1))))
        for k in range(2):
            wface(part, (ends[k][0], ends[k][1], ends[k + 1][1], ends[k + 1][0]), K_BARE,
                  {ends[k][0]: (k * long * 0.5, 0.0), ends[k][1]: (k * long * 0.5, wide), ends[k + 1][1]: ((k + 1) * long * 0.5, wide), ends[k + 1][0]: ((k + 1) * long * 0.5, 0.0)})
    for n in range(4):
        angle = 0.9 + n * 1.5 + 0.4 * rnd(seed, n * 9.0)
        far = radius * (1.12 + 0.2 * rnd(n, seed))
        at = Vector((math.cos(angle) * far, math.sin(angle) * far, 0.0))
        at.z = mound_high(radius, angle, far, seed) + 0.02
        moss_cushion(part, at, (0.26 + 0.1 * rnd(n, 1.0), 0.22 + 0.08 * rnd(n, 2.0), 0.09 + 0.05 * rnd(n, 3.0)), seed + n)
    return finish_wood(part, name, sharp=66.0, strength=0.6, reach=0.6, floor=0.0)


gnawed_stump('stubbe-gnagd', 1.0, 2.0, 5.1)


def fallen(name, long, thick, seed, stubs, mossy):
    """A fallen branch or a dead trunk along X: its bark, the stubs of its boughs, moss along its top, and a pale broken end."""
    if not wanted(name):
        return
    part = new_part()
    sides = 8
    rows = int(long * 1.6) + 4
    path = []
    radii = []
    tones = []
    for i in range(rows):
        t = i / (rows - 1.0)
        path.append(Vector(((t - 0.5) * long, 0.25 * thick * math.sin(t * 4.0 + seed), thick * (1.0 - 0.3 * t) + 0.3 * thick * math.sin(t * 3.0 + seed))))
        radii.append(thick * (1.0 - 0.62 * t) * (0.94 + 0.12 * noise(t * 7.0, seed, 1.0)))
        row = bark_row(sides, t * long, seed)
        for j in range(sides):
            if mossy > 0.0 and 0.25 < j / sides < 0.75 and noise(t * 5.0 + seed, j * 0.7, 2.0) > 0.42:
                row[j] = blend(MOSS_DEEP, MOSS_BRIGHT, noise(t * 8.0, j * 1.3, seed) * mossy)
        tones.append(row)
    rings = []
    for i in range(rows):
        ahead = Vector((1.0, 0.0, 0.0))
        rings.append(circle(path[i], Vector((0.0, 1.0, 0.0)), Vector((0.0, 0.0, 1.0)), radii[i], sides, turn=0.5 * (i % 2)))
    skin(part, rings, tones, (path[0] - Vector((thick * 0.14, 0.0, 0.0)), WOOD_PALE), (path[-1] + Vector((thick * 0.3, 0.0, 0.0)), WOOD))
    for i in range(stubs):
        t = 0.12 + 0.8 * (i + 0.5) / stubs
        k = int(t * (rows - 1))
        turn = rnd(seed, i * 2.7) * TAU
        out = Vector((0.2, math.cos(turn), math.sin(turn)))
        out.normalize()
        length = thick * (1.2 + 2.2 * rnd(seed, i))
        tube(part, [path[k], path[k] + out * (length * 0.6), path[k] + out * length + Vector((0.2 * length, 0.0, 0.0))], [radii[k] * 0.42, radii[k] * 0.24, 0.05], [BARK, BARK_PALE, WOOD_PALE], 5)
    return finish(part, name, sharp=75.0, strength=0.45, reach=0.5, floor=0.0)


fallen('gren-a', 7.0, 0.26, 1.4, 7, 0.0)
fallen('gren-b', 4.5, 0.18, 3.8, 6, 0.8)
fallen('stock-flod', 5.0, 0.5, 8.4, 3, 0.0)


def snapped_end(part, ring, centre, ahead, long, seed, along, ref, heart, deep=0.3, sticks=8, tongue=1.0):
    """Where a stem or a root broke: from its last ring of bark, the bark's edge torn pale, splinters out to `long` along
    `ahead`, longest on the side that tore last (`tongue`, an angle round it), and inside them the wood torn back in
    round its heart."""
    count = len(ring)
    lip = []
    tips = []
    inner = []
    reach = []
    for j in range(count):
        out = ring[j].co - centre
        far = long * (0.1 + 0.9 * rnd(seed, j * 1.7) ** 2.4)
        far += long * 0.7 * max(0.0, math.cos(TAU * j / count - tongue)) ** 3 * (0.4 + 0.6 * rnd(seed + 1.0, j))
        back = deep * long * rnd(seed + 3.0, j)
        lip.append(put(part, centre + out * 0.95 + ahead * 0.012, blend(TORN_DEEP, OLD_BARK_PALE, 0.4)))
        tips.append(put(part, centre + out * (0.56 + 0.36 * rnd(seed + 2.0, j)) + ahead * far, lit(TORN, 0.9 + 0.16 * rnd(j, seed))))
        inner.append(put(part, centre + out * 0.38 - ahead * back, blend(TORN_DEEP, heart, 0.4)))
        reach.append((far, back))
    hub = put(part, centre - ahead * (deep * long), heart)
    for j in range(count):
        k = (j + 1) % count
        ra = ref * TAU * j / count
        rb = ref * TAU * (j + 1) / count
        wface(part, (ring[j], ring[k], lip[k], lip[j]), K_BARE, {ring[j]: (along, ra), ring[k]: (along, rb), lip[k]: (along + 0.02, rb), lip[j]: (along + 0.02, ra)})
        wface(part, (lip[j], lip[k], tips[j]), K_BARE, {lip[j]: (along, ra), lip[k]: (along, rb), tips[j]: (along + reach[j][0], ra)})
        wface(part, (lip[k], tips[k], tips[j]), K_BARE, {lip[k]: (along, rb), tips[k]: (along + reach[k][0], rb), tips[j]: (along + reach[j][0], ra)})
        wface(part, (tips[j], tips[k], inner[j]), K_BARE, {tips[j]: (along + reach[j][0], ra), tips[k]: (along + reach[k][0], rb), inner[j]: (along - reach[j][1], ra)})
        wface(part, (tips[k], inner[k], inner[j]), K_BARE, {tips[k]: (along + reach[k][0], rb), inner[k]: (along - reach[k][1], rb), inner[j]: (along - reach[j][1], ra)})
        wface(part, (inner[j], inner[k], hub), K_BARE, {inner[j]: (along - reach[j][1], ra), inner[k]: (along - reach[k][1], rb), hub: (along - deep * long, 0.5 * (ra + rb))})
    # Loose splinters standing out of the break, pale as matchsticks.
    radius = (ring[0].co - centre).length
    for n in range(sticks):
        j = int(rnd(seed + 5.0, n) * count) % count
        foot = centre + (tips[j].co - centre) * 0.9
        foot = foot - ahead * (foot - centre).dot(ahead) * 0.6
        spread = (ring[j].co - centre) * (0.12 * (rnd(n, seed) - 0.3))
        spike(part, foot, foot + ahead * (long * (0.5 + 0.9 * rnd(seed + 6.0, n))) + spread, radius * 0.045 + 0.012, TORN_DEEP, TORN)


def dead_stub(part, foot, out, long, thick, seed):
    """The stub of a branch that broke off long ago: grey and bare, a collar where it leaves the stem, crooked, and a
    jagged pale end."""
    side = out.cross(Vector((0.3, 0.5, 0.8)))
    side.normalize()
    path = []
    radii = []
    count = 5
    for k in range(count):
        s = k / (count - 1.0)
        bend = side * (long * 0.05 * math.sin(s * 3.0 + seed))
        path.append(foot + out * (long * s - 0.12 * (1.0 - s)) + bend * s)
        radii.append(thick * (1.6 - 0.55 * min(1.0, s * 3.0) - 0.3 * s))
    tones = [blend(OLD_BARK, SILVER_DEEP, min(1.0, 0.2 + k * 0.4)) for k in range(count)]
    tones[-1] = blend(SILVER, TORN_DEEP, 0.3)
    rows, along = wood_tube(part, path, radii, 6, K_BARE, tones, thick, hint=Vector((0.21, 0.35, 0.91)))
    ahead = path[-1] - path[-2]
    ahead.normalize()
    snapped_end(part, rows[-1], path[-1], ahead, thick * 2.2, seed, along[-1], thick, blend(SILVER_DEEP, TORN_DEEP, 0.5), deep=0.2, sticks=2)


def dead_bough(part, foot, out, long, thick, seed, beard=True):
    """A whole dead branch still on the stem: it rises, bends under its own weight, and carries bare twigs in a flat
    spray, with grey beard lichen hanging from it."""
    side = out.cross(UP)
    if side.length < 0.05:
        side = Vector((1.0, 0.0, 0.0))
    side.normalize()
    lift = side.cross(out)
    path = []
    radii = []
    count = 7
    for k in range(count):
        s = k / (count - 1.0)
        path.append(foot + out * (long * s - 0.1 * (1.0 - s)) + lift * (long * (0.16 * s - 0.3 * s * s)) + side * (long * 0.07 * math.sin(s * 4.0 + seed)))
        radii.append(thick * (1.5 - 0.5 * min(1.0, s * 4.0)) * (1.0 - 0.78 * s))
    tones = [blend(OLD_BARK_DEEP, SILVER_DEEP, min(1.0, 0.3 + k * 0.2)) for k in range(count)]
    wood_tube(part, path, radii, 5, K_BARE, tones, thick, hint=Vector((0.21, 0.35, 0.91)), last=(path[-1] + (path[-1] - path[-2]) * 0.5, SILVER_DEEP, K_BARE))
    # Twigs by turns to either side, each with two of its own.
    for n in range(2, count * 2 - 1):
        s = n / (count * 2.0 - 1.0)
        at = foot + out * (long * s) + lift * (long * (0.16 * s - 0.3 * s * s)) + side * (long * 0.07 * math.sin(s * 4.0 + seed))
        way = 1.0 if n % 2 else -1.0
        reach = long * (0.34 - 0.2 * s) * (0.7 + 0.6 * rnd(seed, n))
        twig = out * 0.62 + side * (way * 0.74) - lift * 0.22
        twig.normalize()
        end = at + twig * reach
        spike(part, at, end, 0.034 * (1.0 - 0.5 * s) + 0.012, SILVER_DEEP, blend(SILVER_DEEP, OLD_BARK_DEEP, 0.5), sides=3)
        for m in (0.45, 0.72):
            off = at + twig * (reach * m)
            fork = twig * 0.7 + out * 0.5 + side * (way * 0.3 * (1.0 if m < 0.6 else -1.0))
            fork.normalize()
            spike(part, off, off + fork * (reach * 0.42), 0.02, SILVER_DEEP, OLD_BARK_DEEP, sides=3)
        # Beard lichen: thin pale rags hanging from the twig.
        if beard and rnd(seed + n, 4.0) < 0.6:
            root = at + twig * (reach * (0.3 + 0.4 * rnd(n, seed)))
            hang = 0.22 + 0.34 * rnd(seed, n * 3.0)
            wide = 0.05 + 0.04 * rnd(n, 2.0)
            a = put(part, root - twig * wide, BEARD)
            b = put(part, root + twig * wide, lit(BEARD, 0.8))
            c = put(part, root + twig * (wide * 0.6) - UP * (hang * 0.6) + side * 0.03, lit(BEARD, 0.9))
            d = put(part, root - twig * (wide * 0.3) - UP * hang, BEARD)
            e = put(part, root - twig * (wide * 0.9) - UP * (hang * 0.45), lit(BEARD, 0.75))
            wface(part, (a, b, c, e), K_PLAIN)
            wface(part, (e, c, d), K_PLAIN)


FERN = tone('#52702c')
FERN_DRY = tone('#a88a3c')
GRASS = tone('#6a8a3a')
GRASS_DRY = tone('#b8a058')


def frond(part, at, way, long, seed, lift=0.03):
    """A fern frond pressed flat to the ground: a rib with its leaflets to both sides, shorter towards its tip, gone
    yellow-brown at its edges as in October."""
    ahead = Vector((math.cos(way), math.sin(way), 0.0))
    side = Vector((-ahead.y, ahead.x, 0.0))
    pairs = 7
    for k in range(pairs):
        s = k / (pairs - 1.0)
        base = at + ahead * (long * (0.1 + 0.9 * s)) + UP * (lift + 0.04 * math.sin(s * 3.0))
        wide = long * 0.3 * (1.0 - s * 0.85) * (0.8 + 0.4 * rnd(seed, k))
        colour = blend(FERN, FERN_DRY, 0.25 + 0.6 * rnd(seed + k, 2.0) * s)
        for turn in (-1.0, 1.0):
            a = put(part, base - ahead * (long * 0.045), lit(colour, 0.8))
            b = put(part, base + ahead * (long * 0.045), lit(colour, 0.8))
            c = put(part, base + side * (turn * wide) + ahead * (long * 0.06) + UP * 0.02, blend(colour, FERN_DRY, 0.5))
            wface(part, (a, b, c), K_PLAIN)


# Where the windfall's bark has sloughed off to the grey wood under it: (how far along, where round it, how long, how wide).
WINDFALL_BARE = ((0.2, 1.15, 0.075, 0.8), (0.44, 5.25, 0.09, 0.75), (0.65, 1.75, 0.06, 0.6), (0.85, 0.2, 0.07, 0.95), (0.31, 3.9, 0.05, 0.6))
# Its bracket fungi: (how far along, where round it, how wide). About 1.6 is its front, 4.7 its back.
WINDFALL_CONKS = ((0.1, 1.7, 0.44), (0.135, 1.42, 0.3), (0.52, 1.6, 0.38), (0.75, 1.75, 0.26), (0.29, 4.6, 0.42), (0.6, 4.85, 0.3), (0.9, 4.6, 0.24))


def windfall(name, long, thick, seed):
    """A big old spruce the wind broke off and threw down years ago, along X, its butt at -X: scaled bark, grey wood where
    the bark has sloughed off, a mat of moss along its back, red-belted bracket fungi on its flanks, the grey stubs of
    its branches and a few whole dead ones with beard lichen, a crown of long splinters where it broke, and, lying
    heavily, the ground heaped a little against it and dark under it, with ferns and leaves pressed flat. It is `long`
    from end to end and `thick` in radius at its butt, as the log it takes the place of."""
    if not wanted(name):
        return
    part = new_wood()
    sides = 24
    count = int(long * 4.2)
    x0 = -long / 2.0 + 0.9
    x1 = long / 2.0 - 0.34
    path = []
    radii = []
    for i in range(count):
        t = i / (count - 1.0)
        radius = thick * (1.0 - 0.56 * t) * (0.96 + 0.08 * noise(t * 6.0, seed, 1.0))
        path.append(Vector((x0 + (x1 - x0) * t, 0.22 * thick * math.sin(t * 4.0 + seed), radius * 0.8 + 0.05 * thick * math.sin(t * 7.0 + seed * 2.0))))
        radii.append(radius)
    ripple = []
    tones = []
    bare = []
    for i in range(count):
        t = i / (count - 1.0)
        x = path[i].x
        row = []
        swell = []
        gone = []
        for j in range(sides):
            angle = TAU * j / sides
            up = -math.cos(angle)
            # (the seam is underneath: round from there, a quarter turn is its front)
            round_it = (angle + math.pi) % TAU
            patch = 0.0
            for along_it, where, far, wide in WINDFALL_BARE:
                d = (round_it - where + math.pi) % TAU - math.pi
                inside = 1.0 - ((t - along_it) / far) ** 2 - (d / wide) ** 2 + 0.5 * (noise(x * 1.9 + seed, round_it * 2.4, 5.0) - 0.5)
                patch = max(patch, inside)
            moss = max(0.0, up) ** 0.7 * max(0.0, min(1.0, (noise(x * 0.8 + seed, round_it * 1.1, 2.0) - 0.28) * 3.2))
            ridge = 0.03 * (2.0 * noise(round_it * 5.0, x * 0.7, seed) - 1.0)
            colour = old_bark(seed, round_it * thick, x)
            if patch > 0.0:
                # Bare wood, silvered, a step in from the bark, darkest just under the bark's edge.
                colour = blend(SILVER_DEEP, SILVER, min(1.0, patch * 3.0) * (0.6 + 0.5 * noise(x * 3.0, round_it * 2.0, seed)))
                ridge = -0.05 * min(1.0, patch * 5.0)
                moss *= 0.25
            if moss > 0.05:
                colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(x * 2.6, round_it * 3.0, seed)), min(1.0, moss * 1.6))
                ridge += 0.085 * moss * (0.6 + 0.8 * noise(x * 2.2 + 4.0, round_it * 2.0, seed))
            # Dark and damp underneath, where it lies.
            colour = lit(colour, 0.42 + 0.58 * max(0.0, min(1.0, (up + 0.9) / 0.9)))
            row.append(colour)
            swell.append(1.0 + ridge / max(0.3, radii[i] / thick))
            gone.append(patch > 0.02)
        tones.append(row)
        ripple.append(swell)
        bare.append(gone)
    kinds = []
    for i in range(count - 1):
        kinds.append([K_BARE if bare[i][j] and bare[i][(j + 1) % sides] and bare[i + 1][j] and bare[i + 1][(j + 1) % sides] else K_SPRUCE for j in range(sides)])
    rows, along = wood_tube(part, path, radii, sides, K_SPRUCE, tones, thick, ripple=ripple, kinds=kinds)
    # Where it broke: a crown of long splinters at its butt, a rotten heart in them; shorter ones at its top end.
    snapped_end(part, rows[0], path[0], Vector((-1.0, 0.0, 0.0)), 0.62, seed, along[0], thick, ROT, deep=0.45, sticks=12, tongue=2.4)
    snapped_end(part, rows[-1], path[-1], Vector((1.0, 0.0, 0.0)), 0.32, seed + 9.0, along[-1], thick, TORN_DEEP, deep=0.3, sticks=5, tongue=3.4)

    # Its branches, in whorls: stubs round it, and three whole dead boughs standing up from its back.
    whorl = 0
    x = x0 + 1.5
    while x < x1 - 0.5:
        i = min(count - 1, int((x - x0) / (x1 - x0) * (count - 1)))
        radius = radii[i]
        start = rnd(seed, whorl * 3.0) * TAU
        for n in range(3):
            angle = start + n * TAU / 3.0 + 0.5 * (rnd(seed + whorl, n) - 0.5)
            up = math.cos(angle)
            front = math.sin(angle)
            if up < -0.25:
                continue
            radial = UP * up + Vector((0.0, -1.0, 0.0)) * front
            lean = 0.3 + 0.35 * rnd(whorl, n + seed)
            out = radial * math.cos(lean) + Vector((1.0, 0.0, 0.0)) * math.sin(lean)
            foot = path[i] + radial * (radius * 0.94)
            # In three of the whorls the branch that stood most upright is still whole.
            upward = [m for m in range(3) if math.cos(start + m * TAU / 3.0) > 0.45]
            whole = up > 0.45 and whorl in (2, 5, 7) and len(upward) > 0 and n == upward[0]
            if whole:
                dead_bough(part, foot, out, 2.3 + 1.1 * rnd(seed, whorl), 0.085 + 0.03 * rnd(whorl, 2.0), seed + whorl)
            else:
                # Short to the sides, where the path and the camera are; longer up from its back.
                most = 0.3 + 0.6 * max(0.0, up) ** 2
                dead_stub(part, foot, out, most * (0.5 + 0.5 * rnd(seed + n, whorl)), 0.09 + 0.05 * rnd(whorl, n), seed + whorl * 3.0 + n)
        whorl += 1
        x += 1.05 + 0.5 * rnd(seed, whorl * 7.0)

    # Bracket fungi on its flanks, and moss in cushions along its back.
    for n, (along_it, where, wide) in enumerate(WINDFALL_CONKS):
        i = int(along_it * (count - 1))
        out = Vector((0.0, -1.0 if where < math.pi else 1.0, 0.0))
        up = math.cos(where)
        front = math.sin(where)
        at = path[i] + (UP * up + Vector((0.0, -1.0, 0.0)) * front) * (radii[i] * 0.97)
        bracket(part, at, out, wide, seed + n * 2.0)
    for n in range(10):
        t = 0.06 + 0.9 * (n + 0.3 + 0.4 * rnd(seed, n * 5.0)) / 10.0
        i = int(t * (count - 1))
        where = 0.55 * (rnd(seed + 2.0, n) - 0.5) * 2.0
        at = path[i] + (UP * math.cos(where) + Vector((0.0, -1.0, 0.0)) * math.sin(where)) * (radii[i] * 1.0)
        moss_cushion(part, at, (0.34 + 0.3 * rnd(n, seed), 0.2 + 0.16 * rnd(n, 2.0), 0.08 + 0.07 * rnd(n, 3.0)), seed + n, bright=0.95)

    # The ground it lies in: heaped a little against it, black and damp nearest it, moss beyond, a ragged edge that
    # goes down into the ground it is put on.
    for way in (-1.0, 1.0):
        strip = []
        for i in range(0, count, 2):
            x = path[i].x
            radius = radii[i]
            far = 0.3 + 0.55 * noise(x * 0.7 + seed + way, 3.0, 9.0)
            line = []
            for k, (share, high, shade) in enumerate(((0.45, 0.2, 0.0), (1.0, 0.11, 0.25), (1.0, 0.06, 0.6), (1.0, -0.07, 1.0))):
                reach = radius * share + (0.0, 0.08, 0.45, 1.0)[k] * far
                at = Vector((x + 0.08 * (rnd(i, k) - 0.5), path[i].y + way * reach, high * (0.7 + 0.6 * noise(x * 1.3, k, seed))))
                earth = blend(HUMUS, EARTH, 0.6 * shade * noise(x * 2.0, k * 3.0, seed))
                if shade > 0.2 and noise(x * 1.1 + way * 3.0, k * 2.0, seed) > 0.42:
                    earth = blend(earth, blend(MOSS_DEEP, MOSS_BRIGHT, 0.5 * rnd(i, k + way)), 0.5 + 0.5 * shade)
                line.append(put(part, at, earth))
            strip.append(line)
        for i in range(len(strip) - 1):
            for k in range(3):
                wface(part, (strip[i][k], strip[i + 1][k], strip[i + 1][k + 1], strip[i][k + 1]), K_SOIL)
        # Ferns and birch leaves caught under it and beside it.
        for n in range(4):
            i = int((0.12 + 0.8 * (n + rnd(seed + way, n)) / 4.0) * (count - 1))
            at = Vector((path[i].x, path[i].y + way * radii[i] * 0.7, 0.05))
            frond(part, at, way * (1.3 + 0.5 * (rnd(n, seed + way) - 0.5)) + 0.3, 0.75 + 0.3 * rnd(n, way), seed + n)
        for n in range(6):
            i = int(rnd(seed + way, n * 3.0) * (count - 1))
            at = Vector((path[i].x, path[i].y + way * (radii[i] + 0.12 + 0.3 * rnd(n, way)), 0.09))
            leaf_lying(part, at, rnd(n, seed) * TAU, 0.24 + 0.08 * rnd(n, 5.0), lit(LEAF_FALLEN, 0.7 + 0.4 * rnd(n, 6.0)), LEAF_GOLD)
    return finish_wood(part, name, sharp=70.0, strength=0.62, reach=0.7, floor=0.0)


windfall('lag-mossig', 14.0, 0.8, 6.2)


# --- the root plate of a storm-felled spruce ---------------------------------------------------------------------------
# Stormskogen's dark hollow ("En mörk håla"; Olov, 14 November 2026: "Rotvältan ... behöver modelleras bättre och få
# snyggare design och texturer"). A spruce's roots run flat under the moss, so when the storm throws it the whole plate
# of roots and earth comes up and stands on its edge behind the pit it left. Here it is, as it looks from the pit: the
# thick roots out from the stem's foot like spokes, snapped pale where they tore, thinner ones forking off them, sinker
# roots broken short in the middle, fine roots hanging like hair, rust-brown earth with stones held in it, a band of grey
# leached sand and black humus at its rim, and the forest floor's moss peeled up over its edge; loose earth and stones
# fallen at its foot; behind it the stem, lying where it fell, its lowest branches dead stubs and its boughs still green.
# Its origin is on the pit's floor under the plate's middle; its roots face -Y, and the stem lies away along +Y, on the
# ground the pit was dug out of, `PLATE_GROUND` over the pit's floor.
PLATE_MIDDLE = 1.9
PLATE_GROUND = 1.2
PLATE_WIDE = 2.55
PLATE_HIGH = 2.4
# Its thick roots: (which way round the plate, from 0 at its right over its top, how far past the rim, how thick).
PLATE_ROOTS = ((0.3, 0.9, 0.13), (0.95, 1.3, 0.26), (1.5, 0.7, 0.12), (2.2, 1.4, 0.28), (2.8, 0.9, 0.14), (3.45, 0.55, 0.22),
               (4.0, 0.4, 0.12), (4.7, 0.3, 0.25), (5.35, 0.45, 0.13), (5.95, 0.65, 0.2))
# The stones it holds: (how far out from its middle, of 1, which way round, how big).
PLATE_STONES = ((0.5, 0.62, 0.4), (0.63, 2.5, 0.35), (0.44, 3.75, 0.3), (0.78, 1.52, 0.2), (0.8, 5.6, 0.27), (0.3, 5.05, 0.2),
                (0.87, 3.1, 0.18), (0.68, 4.4, 0.23), (0.9, 0.18, 0.16), (0.2, 2.0, 0.17))


def plate_rim(turn, seed):
    """How far the plate reaches from its middle, a way round it: an oval, ragged in lobes where a root held the earth."""
    lobe = 1.0 + 0.09 * math.sin(3.0 * turn + 1.0) + 0.06 * math.sin(5.0 * turn + 2.3) + 0.14 * (noise(turn * 2.2, seed, 1.0) - 0.5)
    wide = PLATE_WIDE * math.cos(turn)
    high = PLATE_HIGH * math.sin(turn)
    return math.sqrt(wide * wide + high * high) * lobe


def plate_face(share, turn, seed):
    """A point of the plate's root side, `share` of the way out from its middle: thickest in the middle, where the stem's
    foot is, lumpy with clods, and leaning out over the pit a little at its top."""
    far = plate_rim(turn, seed) * share
    x = far * math.cos(turn)
    z = far * math.sin(turn)
    clods = noise(x * 2.3 + seed, z * 2.3, 3.0) - 0.5
    deep = 0.18 + 0.5 * max(0.0, 1.0 - share * share) ** 0.8 + 0.3 * clods * (0.35 + 0.65 * share) + 0.12 * (z / PLATE_HIGH)
    return Vector((x, -deep, PLATE_MIDDLE + z))


def root_on_plate(part, turn, past, thick, seed, n):
    """One of the plate's thick roots: out from the stem's foot over the plate's face, wandering, and on past its rim to
    where it snapped; or, low down, on down into the pit's floor, where it still holds."""
    path = []
    radii = []
    down = math.sin(turn) < -0.3
    for k in range(9):
        share = 0.1 + 0.9 * k / 8.0
        wander = turn + 0.13 * math.sin(share * 6.0 + n * 1.7) * share
        at = plate_face(share, wander, seed)
        radius = thick * (1.55 - 1.0 * share ** 0.7) * (1.0 + 0.16 * math.sin(share * 11.0 + n * 2.1))
        # In and out of the earth on its way: here half buried, there standing clear of it.
        path.append(at - Vector((0.0, radius * (0.75 * noise(share * 3.4, n * 1.7, seed) - 0.05), 0.0)))
        radii.append(radius)
    out = path[-1] - path[-2]
    out.y = 0.0
    out.normalize()
    across = Vector((-out.z, 0.0, out.x))
    swing = 0.5 * (rnd(seed + 9.0, n) - 0.5)
    for k in range(1, 5):
        s = k / 4.0
        if down:
            path.append(path[8] + out * (past * 1.6 * s) + Vector((0.0, -0.1 * s, -0.5 * s * s)))
        else:
            path.append(path[8] + out * (past * s) + across * (past * swing * s * s) + Vector((0.0, -0.3 * s * (rnd(seed, n) - 0.3), -0.32 * past * s * s)))
        radii.append(thick * (0.55 - 0.33 * s))
    tones = []
    for k in range(len(path)):
        row = []
        for j in range(7):
            earthy = noise(k * 0.8 + n, j * 1.3, seed)
            row.append(blend(blend(ROOT_DEEP, ROOT_BARK, 0.3 + 0.7 * noise(k * 1.1, j * 2.0, seed + n)), EARTH, max(0.0, earthy - 0.45) * 1.6))
        tones.append(row)
    # Flat against the earth, as a spruce's roots are: wider across the plate than out from it.
    flat = [[0.72 + 0.4 * abs(math.sin(TAU * j / 7.0)) for j in range(7)] for _ in path]
    rows, along = wood_tube(part, path, radii, 7, K_ROOT, tones, thick, hint=Vector((0.0, -1.0, 0.0)), seam=0.0, ripple=flat)
    if down:
        return path, radii
    ahead = path[-1] - path[-2]
    ahead.normalize()
    snapped_end(part, rows[-1], path[-1], ahead, radii[-1] * 3.2, seed + n, along[-1], thick, TORN_DEEP, deep=0.2, sticks=3, tongue=n * 1.3)
    return path, radii


def root_fork(part, foot, way, long, thick, seed, n, droop=0.25):
    """A thinner root forking off a thick one: it wanders in the plate's plane, sags, and ends torn."""
    side = Vector((-way.z, 0.0, way.x))
    path = []
    radii = []
    count = 6
    for k in range(count):
        s = k / (count - 1.0)
        path.append(foot + way * (long * s) + side * (long * 0.16 * math.sin(s * 5.0 + n)) + Vector((0.0, -0.1 * s - 0.12 * math.sin(s * 3.0 + n * 2.0), -droop * long * s * s)))
        radii.append(thick * (1.0 - 0.72 * s))
    tones = [blend(ROOT_DEEP, ROOT_BARK, 0.35 + 0.5 * rnd(seed + n, k)) for k in range(count)]
    tones[-1] = TORN_DEEP
    tip = path[-1] + (path[-1] - path[-2]) * 0.4
    wood_tube(part, path, radii, 5, K_ROOT, tones, thick, hint=Vector((0.0, -1.0, 0.0)), seam=0.0, last=(tip, TORN, K_BARE))


def root_hair(part, root, long, seed, sway=0.0):
    """Fine roots hanging like hair: a thin ribbon that hangs, sways a little out over the pit, and ends in a wisp."""
    across = Vector((math.cos(seed * 7.0), 0.25 * math.sin(seed * 3.0), 0.0))
    across.normalize()
    prev = None
    count = 5
    for k in range(count):
        s = k / (count - 1.0)
        at = root + Vector((sway * s * s + 0.05 * math.sin(s * 6.0 + seed * 9.0), -0.06 - 0.16 * s * (0.4 + rnd(seed, 2.0)), -long * s))
        wide = 0.026 * (1.0 - 0.8 * s) + 0.006
        colour = blend(ROOT_BARK, BAST, 0.2 + 0.7 * s * (0.5 + 0.5 * rnd(seed, 3.0)))
        pair = (put(part, at - across * wide, colour), put(part, at + across * wide, lit(colour, 0.8)))
        if prev is not None:
            wface(part, (prev[0], prev[1], pair[1], pair[0]), K_PLAIN)
        prev = pair


def held_stone(part, centre, size, seed, detail):
    """A stone the roots held, or one that fell out of them: granite, rounded, with a flat face or two where it split."""
    verts = wood_lump(part, centre, (size, size * 0.78, size * 0.82), detail, GRANITE, K_STONE)
    cut = Vector((rnd(seed, 1.0) - 0.5, -0.4 - 0.5 * rnd(seed, 2.0), rnd(seed, 3.0) - 0.3))
    cut.normalize()
    for vert in verts:
        at = (vert.co - centre) / size
        at = at * (0.86 + 0.3 * noise(at.x * 1.4 + seed, at.y * 1.4, at.z * 1.4))
        over = at.dot(cut) - 0.6
        if over > 0.0:
            at = at - cut * over
        vert.co = centre + at * size
        grain = noise(at.x * 5.0 + seed, at.y * 5.0, at.z * 5.0)
        colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 0.9 + 0.15)
        # Earth still on it, where it sat in the ground.
        if noise(at.x * 2.0, at.y * 2.0 + seed, at.z * 2.0) > 0.58:
            colour = blend(colour, EARTH, 0.6)
        part['paint'][vert] = colour


def root_plate(name, seed):
    """The root plate, its bank of fallen earth and the stem behind it, as told above. Stormskogen stands it behind the
    hollow, turned so that its roots are seen from where he comes and its stem lies away behind the path
    (src/render/root-hollow.ts)."""
    if not wanted(name):
        return
    part = new_wood()
    around = 40
    middle = Vector((0.0, 0.0, PLATE_MIDDLE))
    # The root side: earth in rings out from the stem's foot. Rust-brown, darker clods, a grey band of leached sand
    # near its rim, and the black humus that lay just under the moss at its very edge.
    shares = (0.13, 0.27, 0.41, 0.55, 0.68, 0.79, 0.88, 0.95, 1.0)
    face_rows = []
    hub = put(part, plate_face(0.0, 0.0, seed), blend(ROOT_DEEP, EARTH, 0.5))
    for share in shares:
        ring = []
        for j in range(around):
            turn = TAU * (j + 0.5 * (len(face_rows) % 2)) / around
            at = plate_face(share, turn, seed)
            patch = noise(at.x * 1.1 + seed, at.z * 1.1, 4.0)
            colour = blend(EARTH, EARTH_RUST, patch * 1.5 - 0.2)
            colour = blend(colour, HUMUS, max(0.0, noise(at.x * 2.6, at.z * 2.6 + seed, 8.0) - 0.55) * 2.2)
            ash = max(0.0, 1.0 - abs(share - 0.86) / 0.09) * (0.3 + 0.9 * noise(turn * 3.0, seed, 6.0))
            colour = blend(colour, EARTH_ASH, min(0.5, ash * 0.7))
            if share > 0.93:
                colour = blend(colour, HUMUS, (share - 0.93) * 12.0)
            # Wet and dark low down, where the pit is.
            colour = lit(colour, 0.78 + 0.22 * max(0.0, min(1.0, at.z / 1.6)))
            ring.append(put(part, at, colour))
        face_rows.append(ring)
    for j in range(around):
        wface(part, (hub, face_rows[0][j], face_rows[0][(j + 1) % around]), K_SOIL)
    for i in range(len(face_rows) - 1):
        for j in range(around):
            k = (j + 1) % around
            wface(part, (face_rows[i][j], face_rows[i][k], face_rows[i + 1][k], face_rows[i + 1][j]), K_SOIL)
    # Its edge, and its other side: the forest floor as it was, moss and needles, now standing upright.
    back_rows = []
    for share, deep, bulge in ((1.03, 0.1, 0.0), (1.0, 0.34, 0.0), (0.8, 0.44, 0.06), (0.5, 0.5, 0.1), (0.22, 0.54, 0.12)):
        ring = []
        for j in range(around):
            turn = TAU * (j + 0.5) / around
            far = plate_rim(turn, seed) * share
            front = plate_face(1.0, turn, seed)
            at = Vector((far * math.cos(turn), front.y + deep + bulge * noise(turn * 3.0, share * 4.0, seed), PLATE_MIDDLE + far * math.sin(turn)))
            green = noise(at.x * 1.3 + seed, at.z * 1.3, 2.0)
            colour = blend(MOSS_DEEP, MOSS_BRIGHT, green * 0.7)
            if green < 0.44:
                colour = blend(colour, lit(NEEDLE_DEAD, 0.5), 0.7)
            ring.append(put(part, at, lit(colour, 0.75 + 0.25 * max(0.0, math.sin(turn)))))
        back_rows.append(ring)
    for j in range(around):
        k = (j + 1) % around
        wface(part, (face_rows[-1][j], face_rows[-1][k], back_rows[0][k], back_rows[0][j]), K_SOIL)
    for i in range(len(back_rows) - 1):
        for j in range(around):
            k = (j + 1) % around
            wface(part, (back_rows[i][j], back_rows[i][k], back_rows[i + 1][k], back_rows[i + 1][j]), K_MOSS)

    # The thick roots, and what forks off them.
    for n, (turn, past, thick) in enumerate(PLATE_ROOTS):
        path, radii = root_on_plate(part, turn, past, thick, seed, n)
        for m, at_point in enumerate((3, 5, 7)):
            if rnd(seed + n, m * 3.0) < 0.15:
                continue
            way = path[at_point + 1] - path[at_point]
            way.y = 0.0
            way.normalize()
            swing = (0.5 + 0.4 * rnd(n, m)) * (1.0 if (n + m) % 2 else -1.0)
            fork = Vector((way.x * math.cos(swing) - way.z * math.sin(swing), 0.0, way.x * math.sin(swing) + way.z * math.cos(swing)))
            root_fork(part, path[at_point], fork, 0.7 + 0.9 * rnd(seed + m, n), radii[at_point] * 0.55, seed, n * 3 + m)
    # The stem's foot, seen from under: a boss of root wood where the thick roots meet, knotted and earthy.
    boss = wood_lump(part, plate_face(0.0, 0.0, seed) + Vector((0.0, 0.16, 0.0)), (0.66, 0.34, 0.6), 2, ROOT_BARK, K_ROOT)
    for vert in boss:
        at = vert.co - middle
        knot = noise(at.x * 3.0 + seed, at.y * 3.0, at.z * 3.0)
        vert.co = vert.co + Vector((at.x, 0.0, at.z)) * (0.3 * (knot - 0.5)) - Vector((0.0, 0.14 * knot, 0.0))
        part['paint'][vert] = blend(blend(ROOT_DEEP, ROOT_BARK, knot * 1.4), EARTH, max(0.0, noise(at.x * 5.0, at.z * 5.0, seed) - 0.5) * 1.6)
    # Sinker roots, which went straight down from the stem's foot, broken short: they point out over the pit now.
    for n in range(6):
        turn = n * GOLDEN + 0.4
        share = 0.08 + 0.26 * rnd(seed, n * 4.0)
        foot = plate_face(share, turn, seed) + Vector((0.0, 0.08, 0.0))
        out = Vector((0.3 * math.cos(turn), -1.0, 0.3 * math.sin(turn) - 0.15))
        out.normalize()
        long = 0.3 + 0.4 * rnd(seed + 1.0, n)
        thick = 0.07 + 0.05 * rnd(n, seed)
        path = [foot, foot + out * (long * 0.5) + UP * (0.03 * math.sin(n)), foot + out * long - UP * (0.06 * long)]
        rows, along = wood_tube(part, path, [thick * 1.3, thick, thick * 0.85], 6, K_ROOT, [ROOT_DEEP, ROOT_BARK, blend(ROOT_BARK, TORN_DEEP, 0.5)], thick, hint=UP)
        snapped_end(part, rows[-1], path[-1], out, thick * 2.6, seed + n * 2.0, along[-1], thick, TORN_DEEP, deep=0.2, sticks=2, tongue=n)

    # Stones held in it, half in the earth; the biggest are round enough to be seen as stones.
    for n, (share, turn, size) in enumerate(PLATE_STONES):
        at = plate_face(share, turn, seed)
        held_stone(part, at + Vector((0.0, size * 0.28, 0.0)), size, seed + n, 2 if size > 0.29 else 1)

    # Fine roots hanging like hair, from under the turf at its top and from the earth between the thick roots.
    for n in range(140):
        turn = 0.1 + 2.95 * rnd(seed, n * 1.3) if n < 56 else rnd(seed + 4.0, n) * TAU
        share = 1.0 if n < 56 else 0.25 + 0.75 * rnd(seed + 2.0, n)
        at = plate_face(share, turn, seed)
        if at.z < 0.9:
            continue
        root_hair(part, at, (0.5 + 1.0 * rnd(seed + 3.0, n)) * min(1.0, (at.z - 0.2) / 1.6), seed + n * 0.37, 0.14 * (rnd(n, seed) - 0.5))

    # The forest floor peeled up over its edge: moss in a thick lip along its top and down its sides, strands of it
    # hanging, and a few grass blades and ferns that still grow there, now out sideways.
    for n in range(26):
        turn = -0.35 + 3.85 * (n + 0.5 * rnd(seed, n * 5.0)) / 26.0
        at = plate_face(1.0, turn, seed)
        out = Vector((math.cos(turn), 0.0, math.sin(turn)))
        # Each lies along the rim, more or less: torn turf does not hang in a row.
        skew = 0.5 * (rnd(seed + 11.0, n) - 0.5)
        along_rim = Vector((-out.z, 0.0, out.x)) * math.cos(skew) + Vector((0.0, 1.0, 0.0)) * math.sin(skew)
        # Not all the way round: here and there it tore away with the earth, and the rim is bare.
        if rnd(seed + 8.0, n) < 0.16:
            continue
        size = (0.32 + 0.2 * rnd(n, seed), 0.24 + 0.12 * rnd(n, 2.0), 0.15 + 0.1 * rnd(n, 3.0))
        moss_cushion(part, at + out * (0.03 + 0.08 * rnd(n, 7.0)) + Vector((0.0, 0.04 + 0.16 * rnd(n, 8.0), 0.0)), size, seed + n, bright=0.5 + 0.2 * rnd(n, 9.0),
                     axes=(along_rim, along_rim.cross(out), out))
        if n % 2 == 0:
            # A strand of moss and root threads hanging from the lip.
            prev = None
            hang = 0.3 + 0.4 * rnd(seed + 6.0, n)
            for k in range(4):
                s = k / 3.0
                point = at + Vector((0.06 * math.sin(s * 5.0 + n), -0.12 - 0.05 * s, -hang * s - 0.05))
                wide = 0.06 * (1.0 - 0.75 * s) + 0.008
                colour = blend(MOSS_BRIGHT, MOSS_DEEP, s)
                pair = (put(part, point - Vector((wide, 0.0, 0.0)), colour), put(part, point + Vector((wide, 0.0, 0.0)), lit(colour, 0.8)))
                if prev is not None:
                    wface(part, (prev[0], prev[1], pair[1], pair[0]), K_PLAIN)
                prev = pair
    for n in range(7):
        turn = 0.5 + 2.2 * (n + 0.5) / 7.0
        at = plate_face(1.0, turn, seed) + Vector((0.0, 0.22, 0.0)) + Vector((math.cos(turn), 0.0, math.sin(turn))) * 0.16
        for blade in range(5):
            lean = Vector((math.cos(turn) + 0.5 * (rnd(n, blade) - 0.5), 0.5 * (rnd(blade, n) - 0.2), math.sin(turn) + 0.5 * rnd(n + blade, 3.0)))
            lean.normalize()
            long = 0.4 + 0.45 * rnd(seed + blade, n)
            side = lean.cross(Vector((0.0, 1.0, 0.0)))
            side.normalize()
            a = put(part, at - side * 0.03, lit(GRASS, 0.6))
            b = put(part, at + side * 0.03, lit(GRASS, 0.6))
            c = put(part, at + lean * long - UP * (0.2 * long), blend(GRASS, GRASS_DRY, 0.6))
            wface(part, (a, b, c), K_PLAIN)

    # What fell out of it when it came up: a bank of loose earth at its foot, with stones in it.
    columns = 13
    lines = 5
    heap = []
    for i in range(lines):
        k = i / (lines - 1.0)
        row = []
        for c in range(columns):
            s = c / (columns - 1.0) * 2.0 - 1.0
            x = s * (2.3 - 0.5 * k)
            foot = plate_face(min(1.0, abs(x) / PLATE_WIDE * 0.9 + 0.5), 4.712 + 0.6 * s, seed)
            y = foot.y + 0.1 - k * (0.8 + 0.3 * noise(x * 0.9, seed, 5.0)) * (1.0 - 0.5 * s * s)
            z = 0.66 * (1.0 - s ** 4) * (1.0 - k) ** 1.4 * (0.75 + 0.5 * noise(x * 1.4 + seed, k * 3.0, 2.0)) - 0.1 * max(k, s ** 4)
            colour = blend(HUMUS, blend(EARTH, EARTH_RUST, noise(x * 1.7, k * 4.0, seed)), 0.45 + 0.4 * (1.0 - k))
            row.append(put(part, Vector((x, y, z)), lit(colour, 0.7)))
        heap.append(row)
    for i in range(lines - 1):
        for c in range(columns - 1):
            wface(part, (heap[i][c], heap[i][c + 1], heap[i + 1][c + 1], heap[i + 1][c]), K_SOIL)
    for n, (x, k, size) in enumerate(((-1.25, 0.5, 0.24), (0.35, 0.72, 0.3), (1.5, 0.45, 0.2), (-0.4, 0.25, 0.16))):
        held_stone(part, Vector((x, -0.55 - 0.75 * k, 0.1 + 0.3 * (1.0 - k) + size * 0.3)), size, seed + 20.0 + n, 1)

    # The stem, lying away from it on the forest floor: thick and ribbed where its roots began, then an old spruce's
    # scaled bark; its lowest branches dead stubs, and further up its boughs, still green, lying where they fell.
    path = []
    radii = []
    rings = 27
    sides = 18
    for i in range(rings):
        t = i / (rings - 1.0)
        y = 0.1 + 11.6 * t ** 1.15
        radius = 0.56 + 0.2 * (1.0 - t) + 0.36 * max(0.0, 1.0 - y / 1.5) ** 2
        ground = PLATE_GROUND + radius * 0.84
        path.append(Vector((0.12 * math.sin(t * 5.0 + seed), y, ground + (PLATE_MIDDLE - ground) * max(0.0, 1.0 - y / 2.6) ** 2)))
        radii.append(radius)
    ripple = []
    tones = []
    for i in range(rings):
        y = path[i].y
        flare = max(0.0, 1.0 - y / 1.7) ** 2
        swell = []
        row = []
        for j in range(sides):
            turn = TAU * j / sides
            ridge = 0.0
            for root_turn, _, thick in PLATE_ROOTS:
                d = (turn - (root_turn + 1.571) + math.pi) % TAU - math.pi
                ridge = max(ridge, thick * 1.6 * math.exp(-(d / 0.3) ** 2))
            swell.append(1.0 + flare * ridge + 0.035 * (2.0 * noise(turn * 5.0, y * 0.7, seed) - 1.0))
            up = -math.cos(turn)
            row.append(lit(old_bark(seed + 3.0, turn * 0.7, y), 0.5 + 0.5 * max(0.0, min(1.0, (up + 0.9) / 0.9))))
        ripple.append(swell)
        tones.append(row)
    rows, along = wood_tube(part, path, radii, sides, K_SPRUCE, tones, 0.7, ripple=ripple, last=(path[-1] + Vector((0.0, 0.4, 0.0)), OLD_BARK_DEEP, K_SPRUCE))
    for n in range(9):
        i = 6 + int(n * 1.3)
        turn = n * GOLDEN + 0.7
        up = math.cos(turn)
        if up < -0.2:
            continue
        radial = UP * up + Vector((1.0, 0.0, 0.0)) * math.sin(turn)
        out = radial * 0.9 + Vector((0.0, 0.42, 0.0))
        out.normalize()
        dead_stub(part, path[i] + radial * (radii[i] * 0.94), out, 0.35 + 0.7 * rnd(seed, n * 3.0) * max(0.2, up), 0.07 + 0.04 * rnd(n, seed), seed + n)
    for n in range(11):
        i = 17 + int(n * 0.9)
        turn = n * GOLDEN
        up = math.cos(turn)
        if up < -0.35:
            continue
        radial = UP * (0.25 + 0.75 * up) + Vector((1.0, 0.0, 0.0)) * math.sin(turn)
        radial.normalize()
        out = radial * 0.86 + Vector((0.0, 0.5, 0.0))
        out.z = min(out.z, 0.8)
        out.normalize()
        flat = Vector((out.x, out.y, 0.0))
        if flat.length < 0.2:
            out = out + Vector((0.3, 0.2, 0.0))
            out.normalize()
        long = 3.0 + 1.6 * rnd(seed + 7.0, n)
        spruce_bough(part, path[i] + radial * (radii[i] * 0.9), out, long, 0.7 + 0.25 * rnd(n, seed), 1.5 + long * 0.2, 0.62 + 0.3 * max(0.0, up), seed + n)
    return finish_wood(part, name, sharp=70.0, strength=0.5, reach=0.9, floor=0.0)


root_plate('rotvalta', 3.4)


# --- reeds at the water --------------------------------------------------------------------------------------------------

REED = tone('#7c8a3e')
REED_DRY = tone('#c2a85a')
REED_HEAD = tone('#4a2c1c')


def reeds(name, stems, high, seed):
    """A clump of bulrushes: stems leaning a little apart, long curling leaves at their feet, and a dark velvet head on each."""
    if not wanted(name):
        return
    part = new_part()
    for i in range(stems):
        turn = rnd(seed, i) * TAU
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        foot = out * (0.8 * rnd(seed, i * 2.0))
        tall = high * (0.74 + 0.26 * rnd(seed, i * 3.0))
        lean = 0.7 + 1.2 * rnd(seed, i * 4.0)
        points = []
        for k in range(6):
            s = k / 5.0
            points.append(foot + out * (lean * s * s) + UP * (tall * s))
        tube(part, points, [0.09, 0.08, 0.07, 0.06, 0.05, 0.03], [REED, REED, REED, blend(REED, REED_DRY, 0.5), REED_DRY, REED_DRY], 5, closed_ends=False)
        head = [points[-1] + (points[-1] - points[-2]) * (-0.5 + 0.1 * k) for k in range(5)]
        tube(part, head, [0.05, 0.22, 0.24, 0.23, 0.06], [REED_HEAD, REED_HEAD, lit(REED_HEAD, 1.2), REED_HEAD, REED_HEAD], 7)
    for i in range(stems * 3):
        turn = rnd(seed, i * 5.0) * TAU
        out = Vector((math.cos(turn), math.sin(turn), 0.0))
        side = out.cross(UP)
        foot = out * (0.9 * rnd(seed, i * 6.0))
        tall = high * (0.42 + 0.34 * rnd(seed, i * 7.0))
        prev = None
        for k in range(5):
            s = k / 4.0
            at = foot + out * (tall * 0.4 * s * s) + UP * (tall * s - tall * 0.22 * s * s * s)
            wide = 0.15 * (1.0 - s * 0.95)
            colour = blend(REED, REED_DRY, s * 0.8 * rnd(seed, i))
            pair = (put(part, at - side * wide, colour), put(part, at + side * wide, colour))
            if prev is not None:
                face(part, (prev[0], prev[1], pair[1], pair[0]))
            prev = pair
    return finish(part, name, strength=0.0, leaf=True)


reeds('vass-a', 7, 7.0, 1.9)
reeds('vass-b', 5, 5.0, 4.4)

# --- a rock face ---------------------------------------------------------------------------------------------------------
# Billaberget's granite: a grid pushed back and forth by broad lumps, in leaning benches, split by cracks, wet and dark at
# its foot, with moss and lichen on what lies flat. Its origin is the middle of its foot, its front towards -Y.


def rock_face(name, wide, high, deep, seed):
    if not wanted(name):
        return
    part = new_part()
    columns = 70
    rows = 34
    rings = []
    tones = []
    for i in range(rows):
        t = i / (rows - 1.0)
        z = high * t
        ring = []
        row = []
        for j in range(columns):
            s = j / (columns - 1.0)
            x = (s - 0.5) * wide
            broad = noise(x * 0.09 + seed, z * 0.12, 1.0)
            lumps = noise(x * 0.3 + seed, z * 0.4, 2.0)
            fine = noise(x * 1.1, z * 1.3 + seed, 3.0)
            bench = math.floor(z / (high * 0.17) + broad * 1.6)
            step = (z / (high * 0.17) + broad * 1.6) - bench
            shelf_at = 0.8 * max(0.0, 1.0 - step * 3.0)
            crack = abs(math.sin(x * 0.42 + 2.2 * noise(z * 0.1, seed, 4.0) * 3.0))
            groove = max(0.0, 1.0 - crack * 9.0)
            edge = abs(2.0 * s - 1.0) ** 5
            y = deep * (bench * 0.13 + 0.8 * broad + 0.55 * lumps + 0.1 * fine) + shelf_at + groove * 0.5 + edge * deep * 1.6 - deep
            y = y + (t ** 2.0) * deep * 0.9
            top_end = z - edge * high * 0.2 - (t ** 4.0) * (high * 0.12) * noise(x * 0.12, seed, 6.0)
            ring.append(Vector((x, y, max(0.0, top_end))))
            grain = noise(x * 2.2 + seed, z * 2.2, 5.0)
            colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 0.9 + 0.1 * broad)
            patch = noise(x * 0.5 + 3.0, z * 0.5, seed)
            if patch > 0.6:
                colour = blend(colour, LICHEN_PALE, (patch - 0.6) * 3.4)
            colour = blend(colour, CRACK, groove * 0.85)
            if shelf_at > 0.2:
                colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(x * 0.8, z * 0.8, seed)), min(1.0, shelf_at * 1.5) * (0.5 + noise(x * 0.4, z, 8.0)))
            colour = lit(colour, 0.62 + 0.42 * min(1.0, t * 3.0))
            row.append(colour)
        rings.append(ring)
        tones.append(row)
    skin(part, rings, tones, closed=False, flip=True)
    return finish(part, name, sharp=62.0, strength=0.0, recalc=False, leaf=True)


rock_face('klippa-a', 44.0, 22.0, 7.0, 3.1)
rock_face('klippa-b', 30.0, 15.0, 5.0, 6.7)
