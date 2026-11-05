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
        size = (long * 0.62, long * 0.56, long * 0.17)
        verts = lump(part, points[2], size, 2, PINE_DARK)
        for vert in verts:
            at = vert.co - points[2]
            flat_top = max(0.0, at.z / size[2])
            bump = noise(at.x * 0.5 + seed, at.y * 0.5, i * 1.7)
            vert.co = points[2] + Vector((at.x * (0.8 + 0.5 * bump), at.y * (0.8 + 0.5 * bump), at.z * (0.7 + 0.8 * bump)))
            part['paint'][vert] = blend(PINE_DARK, PINE_LIGHT, flat_top * 0.9 + bump * 0.4 - 0.2)
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
GNAW = tone('#d8b888')


def bark_row(sides, z, seed, wet=1.0):
    row = []
    for j in range(sides):
        n = noise(j * 1.2 + seed, z * 1.4, 3.0)
        row.append(lit(blend(BARK_DEEP, blend(BARK, BARK_PALE, noise(j * 2.3, z * 2.0, seed) ** 1.5), n * 1.5), wet))
    return row


def stump(name, radius, high, seed, gnawed):
    """A spruce stump: roots running out into the ground, furrowed bark, and either a sawn face with its rings or, gnawed
    by a beaver, the waist and cone a beaver leaves."""
    if not wanted(name):
        return
    part = new_part()
    sides = 14
    rings = []
    tones = []
    rows = 9
    for i in range(rows):
        t = i / (rows - 1.0)
        z = -0.2 + (high + 0.2) * t
        ripple = []
        for j in range(sides):
            rib = 0.5 + 0.5 * math.cos(j * TAU / 7.0 * 2.0 + seed)
            flare = max(0.0, 1.0 - t * 2.4) ** 1.6
            ripple.append(1.0 + flare * (0.35 + 1.1 * rib * rib) + 0.1 * noise(j, z * 2.0, seed))
        wide = radius
        row = bark_row(sides, z, seed)
        if gnawed:
            # The waist the teeth cut, pale wood where the bark has gone, and a point on top.
            waist = abs(t - 0.62) / 0.62
            wide = radius * (0.34 + 0.66 * min(1.0, waist * 1.5))
            if 0.42 < t:
                row = [blend(GNAW, WOOD_HEART, noise(j * 3.0, i * 2.0, seed)) for j in range(sides)]
        rings.append(circle(Vector((0.0, 0.0, z)), Vector((1.0, 0.0, 0.0)), Vector((0.0, 1.0, 0.0)), wide, sides, turn=0.5 * (i % 2), ripple=ripple))
        tones.append(row)
    top = Vector((0.15, 0.1, high + (radius * 0.7 if gnawed else 0.0)))
    made = skin(part, rings, tones, None, None)
    tip = put(part, top, WOOD_HEART if gnawed else WOOD_PALE)
    ring_top = made[-1]
    if gnawed:
        for j in range(sides):
            face(part, (ring_top[j], ring_top[(j + 1) % sides], tip))
    else:
        # The sawn face: rings of a tree's years, pale to dark, each its own band.
        rims = [ring_top]
        for band in range(1, 4):
            k = 1.0 - band * 0.26
            rims.append([put(part, Vector((ring_top[j].co.x * k, ring_top[j].co.y * k, high + 0.02 * band * (j % 2))), blend(WOOD, WOOD_PALE, band * 0.3) if band % 2 else WOOD_HEART) for j in range(sides)])
        for band in range(3):
            for j in range(sides):
                k = (j + 1) % sides
                face(part, (rims[band][j], rims[band][k], rims[band + 1][k], rims[band + 1][j]))
        for j in range(sides):
            face(part, (rims[3][j], rims[3][(j + 1) % sides], tip))
    return finish(part, name, sharp=70.0, strength=0.5, reach=0.5, floor=0.0)


stump('stubbe-sagad', 1.1, 1.3, 2.2, False)
stump('stubbe-gnagd', 1.0, 2.0, 5.1, True)


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
fallen('lag-mossig', 14.0, 0.8, 6.2, 8, 1.0)
fallen('stock-flod', 5.0, 0.5, 8.4, 3, 0.0)

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
