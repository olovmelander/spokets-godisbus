"""Street life: a grown-up walking past behind Byn's street, as tiny Elof sees one (docs/aventyr-2.md, Kapitel 3).

Sent to Blender by scripts/bake/send-kit.mjs, after kit-tools.py. A name in ONLY builds that thing alone. Nothing here
comes from anyone else, and nothing on it is a mark or a letter.

`fotgangare` is an armature with one skinned mesh under it (`fotgangare-kropp`), in EL, standing on the origin and
facing +X, its near side towards -Y: a long coat buttoned to above the knee with the hands in its pockets, trousers
with a pressed crease that fold at the knee and break over the boots, and laced leather boots with a heel, a sole and
its welt. The coat goes on up out of every picture. The game walks it (src/render/passerby.ts): the bones are `hips`,
`coat`, and for each leg (`l` on +Y, `r` on -Y) `thigh`, `calf`, `hem` (the trousers' hem, which swings), `foot` and
`ball`. Each bone's head is the joint it turns about; the measurements the game needs are marked SHARED.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.armatures):
    if item.users == 0:
        bpy.data.armatures.remove(item)


def wanted(name):
    return ONLY is None or ONLY == name


# SHARED with src/render/passerby.ts: the joints, in EL. The hip joints are HIP_W out to each side at HIP up, the knees
# KNEE_W at KNEE, the ankles ANKLE_W at ANKLE; the ball of the foot BALL ahead of the ankle, the heel HEEL behind it.
HIP = 10.4
KNEE = 5.5
ANKLE = 0.9
HIP_W = 1.02
KNEE_W = 0.96
ANKLE_W = 0.9
BALL = 1.75
BALL_UP = 0.3
HEEL = 0.78
TOE = 2.56
COAT_HEM = 8.0
# The coat, from its hem up: half its depth front to back, and half its width.
COAT_AX = ((COAT_HEM, 2.42), (9.0, 2.2), (10.4, 1.98), (11.9, 1.84), (12.45, 1.74), (13.1, 1.78), (15.0, 1.84), (25.0, 1.86))
COAT_AY = ((COAT_HEM, 2.9), (9.0, 2.7), (10.4, 2.54), (11.9, 2.42), (12.45, 2.34), (13.1, 2.4), (15.0, 2.5), (25.0, 2.52))

TROUSERS = tone('#3d4757')
TROUSERS_DARK = tone('#262d38')
TROUSERS_PALE = tone('#5a6678')
LEATHER = tone('#5e4838')
LEATHER_DARK = tone('#3a2c21')
LEATHER_PALE = tone('#7c6650')
SOLE = tone('#262220')
WELT = tone('#9c8664')
LACE = tone('#2c2018')
COAT = tone('#7a6d58')
COAT_DARK = tone('#4e4537')
COAT_PALE = tone('#958771')
LINING = tone('#2c2620')
BUTTON = tone('#2a2622')


def smooth01(a, b, t):
    k = max(0.0, min(1.0, (t - a) / (b - a)))
    return k * k * (3.0 - 2.0 * k)


def weigh(part, vert, groups):
    """Gives a point its share of each bone, as {bone: weight}; the shares are made to sum to one."""
    total = 0.0
    for name in groups:
        total += groups[name]
    out = {}
    for name in groups:
        if groups[name] > 1e-4:
            out[name] = groups[name] / total
    part['weights'][vert] = out


def leg_axis(s, z):
    """Where the leg's middle is at height z, in its rest pose: from the hip joint down through the knee to the ankle."""
    if z >= KNEE:
        t = (z - KNEE) / (HIP - KNEE)
        return Vector((0.0, s * (KNEE_W + (HIP_W - KNEE_W) * t), z))
    t = (z - ANKLE) / (KNEE - ANKLE)
    return Vector((0.0, s * (ANKLE_W + (KNEE_W - ANKLE_W) * t), z))


def trouser_radius(z):
    return along(((1.2, 0.9), (1.6, 0.875), (2.4, 0.87), (3.4, 0.9), (4.3, 0.93), (5.0, 0.92), (5.6, 0.92), (6.4, 0.98), (7.4, 1.05),
                  (8.6, 1.1), (10.4, 1.16), (11.4, 1.16)), z)


def trouser_leg(part, s):
    """One trouser leg, from inside the coat down to its hem over the boot: round, a little deeper than wide, with a
    pressed crease down its front; folds behind the knee, and the break where it rests on the boot."""
    SIDES = 20
    rows = []
    z = 11.4
    while z > 1.22:
        rows.append(z)
        z -= 0.34 if z > 6.6 or z < 4.4 else 0.17
    rows.append(1.2)
    made = []
    for z in rows:
        centre = leg_axis(s, z)
        ring = []
        for j in range(SIDES):
            a = TAU * j / SIDES
            front = math.cos(a)
            r = trouser_radius(z)
            # Behind the knee, the cloth gathers in folds; over the boot, it breaks in front.
            fold = 0.0
            if 4.9 < z < 6.3 and front < 0.2:
                fold = 0.035 * math.sin((z - 4.9) * 9.0) * (0.2 - front) * smooth01(4.9, 5.3, z) * (1.0 - smooth01(5.9, 6.3, z))
            if z < 2.4 and front > -0.3:
                fold += 0.04 * math.sin((2.4 - z) * 7.5) * (front + 0.3) * (1.0 - smooth01(1.6, 2.4, z))
            crease = 0.035 * max(0.0, front) ** 18
            out = r * (1.0 + fold) + crease
            point = centre + Vector((out * 1.04 * front, out * 0.96 * math.sin(a), 0.0))
            vert = put(part, point, TROUSERS)
            # The cloth's light and shade: paler on the crease and the knee, darker in the folds and down the inside.
            shade = 0.0
            shade += 0.55 * crease / 0.035
            shade -= 6.0 * max(0.0, -fold) + 0.35 * max(0.0, -math.sin(a) * s) * 0.6
            if 5.2 < z < 5.9 and front > 0.4:
                shade += 0.25
            colour = blend(TROUSERS, TROUSERS_PALE, shade) if shade > 0.0 else blend(TROUSERS, TROUSERS_DARK, -shade)
            part['paint'][vert] = colour
            # Its bones: the hips at the top, the thigh to the knee, the shin below, and the hem's own at its foot.
            knee = smooth01(KNEE - 0.6, KNEE + 0.6, z)
            top = smooth01(HIP - 1.0, HIP + 0.3, z)
            hem = 1.0 - smooth01(1.2, 2.6, z)
            groups = {
                'hips': top,
                'thigh_' + ('l' if s > 0 else 'r'): knee * (1.0 - top),
                'calf_' + ('l' if s > 0 else 'r'): (1.0 - knee) * (1.0 - hem * 0.8),
                'hem_' + ('l' if s > 0 else 'r'): (1.0 - knee) * hem * 0.8,
            }
            weigh(part, vert, groups)
            ring.append(vert)
        made.append(ring)
    for i in range(len(made) - 1):
        for j in range(SIDES):
            k = (j + 1) % SIDES
            face(part, (made[i][j], made[i][k], made[i + 1][k], made[i + 1][j]))
    # The hem turned in: a short dark band inside, so that the leg is not hollow from below.
    inner = []
    for j in range(SIDES):
        a = TAU * j / SIDES
        centre = leg_axis(s, 1.45)
        r = trouser_radius(1.45) * 0.93
        vert = put(part, centre + Vector((r * 1.04 * math.cos(a), r * 0.96 * math.sin(a), 0.0)), TROUSERS_DARK)
        weigh(part, vert, {'calf_' + ('l' if s > 0 else 'r'): 0.2, 'hem_' + ('l' if s > 0 else 'r'): 0.8})
        inner.append(vert)
    last = made[-1]
    for j in range(SIDES):
        k = (j + 1) % SIDES
        face(part, (last[j], last[k], inner[k], inner[j]))


def boot(part, s):
    """A laced leather boot: the upper over a sole with a heel, its welt stitched round, a shaft up round the ankle
    under the trousers, and laces across the instep. The front of it bends at the ball."""
    foot_bone = 'foot_' + ('l' if s > 0 else 'r')
    ball_bone = 'ball_' + ('l' if s > 0 else 'r')
    calf_bone = 'calf_' + ('l' if s > 0 else 'r')
    y0 = s * ANKLE_W
    stations = (-HEEL, -0.72, -0.6, -0.4, -0.15, 0.15, 0.45, 0.75, 1.05, 1.35, 1.6, 1.85, 2.1, 2.3, 2.45, TOE - 0.03, TOE)
    # Along the foot: how high the upper's top is, how wide the boot is, and the sole's top and bottom.
    top_of = ((-HEEL, 0.95), (-0.6, 1.08), (-0.15, 1.16), (0.45, 1.16), (0.9, 1.02), (1.35, 0.86), (1.85, 0.73), (2.2, 0.64), (2.45, 0.53), (TOE, 0.36))
    wide_of = ((-HEEL, 0.36), (-0.72, 0.45), (-0.4, 0.52), (0.15, 0.56), (0.75, 0.59), (1.35, 0.63), (1.85, 0.64), (2.2, 0.58), (2.45, 0.45), (TOE, 0.18))
    sole_top = ((-HEEL, 0.42), (0.1, 0.42), (0.5, 0.25), (1.9, 0.22), (2.3, 0.26), (TOE, 0.34))
    sole_low = ((-HEEL, 0.0), (0.12, 0.0), (0.16, 0.2), (0.55, 0.2), (0.7, 0.0), (1.9, 0.0), (2.3, 0.05), (TOE, 0.14))
    SIDES = 14
    upper = []
    for x in stations:
        zs = along(sole_top, x)
        zt = along(top_of, x)
        hw = along(wide_of, x)
        ring = []
        for j in range(SIDES + 1):
            a = math.pi * j / SIDES
            y = -math.cos(a)
            lift = math.sin(a) ** 0.6
            point = Vector((x, y0 + hw * y * (1.0 - 0.12 * lift), zs + (zt - zs) * lift))
            vert = put(part, point, LEATHER)
            shine = max(0.0, lift - 0.55) * (1.0 if x > 1.4 else 0.4)
            part['paint'][vert] = blend(blend(LEATHER, LEATHER_DARK, 0.35 * (1.0 - lift)), LEATHER_PALE, shine * 1.4)
            front = smooth01(BALL - 0.25, BALL + 0.2, x)
            weigh(part, vert, {foot_bone: 1.0 - front, ball_bone: front})
            ring.append(vert)
        upper.append(ring)
    made = skin_rows(part, upper, False)
    # The toe's tip and the heel's back, closed.
    cap(part, upper[0], True)
    cap(part, upper[-1], False)
    # The sole and the heel: a slab under the upper, a little wider, with the welt's pale stitch along its top.
    sole = []
    for x in stations:
        zs = along(sole_top, x)
        zb = along(sole_low, x)
        hw = along(wide_of, x) + 0.05
        ring = []
        for y, z, colour in ((-hw, zs + 0.02, WELT), (-hw - 0.01, zs - 0.03, SOLE), (-hw, zb + 0.03, SOLE), (-hw + 0.04, zb, SOLE),
                             (hw - 0.04, zb, SOLE), (hw, zb + 0.03, SOLE), (hw + 0.01, zs - 0.03, SOLE), (hw, zs + 0.02, WELT)):
            vert = put(part, Vector((x, y0 + y, z)), colour)
            front = smooth01(BALL - 0.25, BALL + 0.2, x)
            weigh(part, vert, {foot_bone: 1.0 - front, ball_bone: front})
            ring.append(vert)
        sole.append(ring)
    skin_rows(part, sole, True)
    cap(part, sole[0], True)
    cap(part, sole[-1], False)
    # The shaft round the ankle, up under the trousers: a little open at its top.
    shaft = []
    for z, r in ((0.78, 0.66), (1.0, 0.66), (1.3, 0.67), (1.62, 0.7), (1.7, 0.66)):
        ring = []
        for j in range(16):
            a = TAU * j / 16.0
            point = Vector((0.04 + r * 1.08 * math.cos(a), y0 + r * 0.9 * math.sin(a), z))
            vert = put(part, point, LEATHER if z < 1.65 else LEATHER_DARK)
            weigh(part, vert, {foot_bone: 1.0 - smooth01(0.9, 1.3, z), calf_bone: smooth01(0.9, 1.3, z)})
            ring.append(vert)
        shaft.append(ring)
    for i in range(len(shaft) - 1):
        for j in range(16):
            k = (j + 1) % 16
            face(part, (shaft[i][j], shaft[i][k], shaft[i + 1][k], shaft[i + 1][j]))
    # Laces: dark crossings over the instep, from the shaft's front down to the vamp.
    for k in range(5):
        x = 0.42 + 0.17 * k
        zt = along(top_of, x) + 0.012
        hw = along(wide_of, x) * 0.42
        a = put(part, Vector((x - 0.05, y0 - hw, zt - 0.06)), LACE)
        b = put(part, Vector((x + 0.06, y0 + hw, zt - 0.06)), LACE)
        c = put(part, Vector((x + 0.1, y0 + hw, zt - 0.03)), LACE)
        d = put(part, Vector((x - 0.01, y0 - hw, zt - 0.03)), LACE)
        e = put(part, Vector((x + 0.02, y0, zt + 0.015)), LACE)
        for v in (a, b, c, d, e):
            weigh(part, v, {foot_bone: 1.0})
        face(part, (a, e, d))
        face(part, (e, b, c))
        face(part, (d, e, c))


def skin_rows(part, rows, closed):
    """Quads between rows of points, each row open or closed round."""
    count = len(rows[0])
    span = count if closed else count - 1
    for i in range(len(rows) - 1):
        for j in range(span):
            k = (j + 1) % count
            face(part, (rows[i][j], rows[i][k], rows[i + 1][k], rows[i + 1][j]))
    return rows


def cap(part, row, back):
    """Closes an end of a row of points with a fan to its middle."""
    middle = Vector((0.0, 0.0, 0.0))
    for vert in row:
        middle += vert.co
    middle /= len(row)
    tip = put(part, middle, part['paint'][row[0]])
    part['weights'][tip] = dict(part['weights'][row[0]])
    for j in range(len(row) - 1):
        tri = (row[j], row[j + 1], tip)
        face(part, tri[::-1] if back else tri)


def coat(part):
    """A long coat, buttoned down its front to above the knee, belted at the waist, its hands in its pockets, with a
    vent at the back of its hem. It goes on up out of the picture. Its lower part is the `coat` bone's, which swings."""
    SIDES = 36
    rows = (COAT_HEM, COAT_HEM + 0.25, COAT_HEM + 0.6, 9.0, 9.6, 10.2, 10.8, 11.4, 11.9, 12.25, 12.45, 12.75, 13.1, 13.8, 14.8, 16.2, 18.0, 21.0, 25.0)
    made = []
    for z in rows:
        ax = along(COAT_AX, z)
        ay = along(COAT_AY, z)
        cx = 0.06 * (z - 10.0)
        ring = []
        for j in range(SIDES):
            a = TAU * j / SIDES
            c = math.cos(a)
            sn = math.sin(a)
            bulge = 0.0
            # The hands in the pockets: a soft swelling low on each side, a little forward.
            if 9.4 < z < 11.6:
                bulge = 0.14 * max(0.0, abs(sn) - 0.55) / 0.45 * max(0.0, 1.0 - abs(c - 0.25) * 1.6) * math.sin((z - 9.4) / 2.2 * math.pi)
            # The belt stands out a little.
            if 12.2 < z < 12.8:
                bulge += 0.05
            point = Vector((cx + (ax + bulge) * c, (ay + bulge) * sn, z))
            vert = put(part, point, COAT)
            colour = blend(COAT, COAT_PALE, max(0.0, c) * 0.25 * (1.0 if z < 12 else 0.6))
            if 12.2 < z < 12.8:
                colour = COAT_DARK
            if z < COAT_HEM + 0.3:
                colour = lit(colour, 0.82)
            # Down the front, the edge where it buttons over, and the back's vent and seam.
            if c > 0.985 and z < 12.2:
                colour = lit(colour, 0.7)
            if c < -0.985 and z < COAT_HEM + 2.2:
                colour = LINING
            part['paint'][vert] = colour
            sway = 1.0 - smooth01(COAT_HEM + 0.5, 11.4, z)
            weigh(part, vert, {'hips': 1.0 - sway, 'coat': sway})
            ring.append(vert)
        made.append(ring)
    skin_rows(part, made, True)
    # The top, closed out of sight, and the hem turned in with the lining inside.
    cap(part, made[-1], False)
    inside = []
    for j in range(SIDES):
        a = TAU * j / SIDES
        z = COAT_HEM + 0.9
        ax = along(COAT_AX, z) - 0.12
        ay = along(COAT_AY, z) - 0.12
        vert = put(part, Vector((0.06 * (z - 10.0) + ax * math.cos(a), ay * math.sin(a), z)), LINING)
        weigh(part, vert, {'hips': 0.2, 'coat': 0.8})
        inside.append(vert)
    hem = made[0]
    for j in range(SIDES):
        k = (j + 1) % SIDES
        face(part, (hem[k], hem[j], inside[j], inside[k]))
    # The buttons down its front, and the pockets' flaps.
    for k in range(4):
        z = COAT_HEM + 0.9 + 1.0 * k
        if z > 12.0:
            continue
        ax = along(COAT_AX, z)
        centre = Vector((0.06 * (z - 10.0) + ax + 0.02, -0.28, z))
        ball_ = lump(part, centre, (0.05, 0.13, 0.13), 1, BUTTON)
        sway = 1.0 - smooth01(COAT_HEM + 0.5, 11.4, z)
        for vert in ball_:
            weigh(part, vert, {'hips': 1.0 - sway, 'coat': sway})
    for sgn in (-1.0, 1.0):
        flap = []
        for k in range(6):
            t = k / 5.0
            z = 11.3 - 0.35 * t
            a = (0.35 + 0.55 * t) * sgn
            ax = along(COAT_AX, z)
            ay = along(COAT_AY, z)
            out = 0.03
            p0 = Vector((0.06 * (z - 10.0) + (ax + out) * math.cos(a + 0.0), (ay + out) * math.sin(a), z))
            p1 = Vector((0.06 * (z - 10.0) + (ax + out) * math.cos(a), (ay + out) * math.sin(a), z - 0.12))
            v0 = put(part, p0, COAT_DARK)
            v1 = put(part, p1, COAT_DARK)
            for vert in (v0, v1):
                weigh(part, vert, {'hips': 1.0})
            flap.append((v0, v1))
        for k in range(5):
            quad = (flap[k][0], flap[k + 1][0], flap[k + 1][1], flap[k][1])
            face(part, quad if sgn > 0 else quad[::-1])


BONES = (
    # name, head, tail, parent
    ('hips', (0.0, 0.0, HIP), (0.0, 0.0, HIP + 1.2), None),
    ('coat', (0.0, 0.0, HIP), (0.0, 0.0, COAT_HEM), 'hips'),
    ('thigh_l', (0.0, HIP_W, HIP), (0.0, KNEE_W, KNEE), 'hips'),
    ('calf_l', (0.0, KNEE_W, KNEE), (0.0, ANKLE_W, ANKLE), 'thigh_l'),
    ('hem_l', (0.0, ANKLE_W + 0.01, 2.6), (0.0, ANKLE_W, 1.2), 'calf_l'),
    ('foot_l', (0.0, ANKLE_W, ANKLE), (BALL, ANKLE_W, BALL_UP), 'calf_l'),
    ('ball_l', (BALL, ANKLE_W, BALL_UP), (TOE, ANKLE_W, BALL_UP), 'foot_l'),
    ('thigh_r', (0.0, -HIP_W, HIP), (0.0, -KNEE_W, KNEE), 'hips'),
    ('calf_r', (0.0, -KNEE_W, KNEE), (0.0, -ANKLE_W, ANKLE), 'thigh_r'),
    ('hem_r', (0.0, -ANKLE_W - 0.01, 2.6), (0.0, -ANKLE_W, 1.2), 'calf_r'),
    ('foot_r', (0.0, -ANKLE_W, ANKLE), (BALL, -ANKLE_W, BALL_UP), 'calf_r'),
    ('ball_r', (BALL, -ANKLE_W, BALL_UP), (TOE, -ANKLE_W, BALL_UP), 'foot_r'),
)


if wanted('fotgangare'):
    part = new_part()
    part['weights'] = {}
    for s in (-1.0, 1.0):
        trouser_leg(part, s)
        boot(part, s)
    coat(part)
    # The weights by the points' order, which the mesh keeps.
    part['bm'].verts.index_update()
    shares = {}
    for vert in part['weights']:
        shares[vert.index] = part['weights'][vert]
    body = finish(part, 'fotgangare-kropp', sharp=70.0, strength=0.45, reach=0.6, floor=0.0)
    # The skeleton, and the body bound to it.
    rig = bpy.data.armatures.new('fotgangare')
    holder = bpy.data.objects.new('fotgangare', rig)
    bpy.context.scene.collection.objects.link(holder)
    bpy.context.view_layer.objects.active = holder
    bpy.ops.object.mode_set(mode='EDIT')
    for name, head, tail, parent in BONES:
        bone = rig.edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        bone.roll = 0.0
        if parent is not None:
            bone.parent = rig.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT')
    for name, head, tail, parent in BONES:
        body.vertex_groups.new(name=name)
    for index in shares:
        for name in shares[index]:
            body.vertex_groups[name].add([index], shares[index][name], 'REPLACE')
    body.parent = holder
    bind = body.modifiers.new('rig', 'ARMATURE')
    bind.object = holder
