"""Builds the forest kit: the things of the spruce forest (Kapitel 2, Granskogen).

  - one spruce cone, in three makes: `kotte` for the cones he pushes and the ones that roll, `kotte-liten`
    for the many that lie on the floor, and `jattekotte`, the cone as big as a car that he climbs over;
  - what lies and grows on the floor: a moss cushion (`tuva`), three stones (`sten-a` to `sten-c`), a young
    spruce (`gran`), a fern (`ormbunke`), chanterelles (`kantarell`), a cep (`karljohan`), a fallen birch leaf
    (`lov`) and a tuft of reindeer lichen (`renlav`);
  - the landmarks, each standing over its block of the chapter's ground: `jattekotte`, the fallen log
    (`stock`), the anthill (`myrstack`) and the stone at the eddy (`virvelsten`);
  - what he uses: Bertil's cap as a boat (`keps`), the birch leaf the ghost floats on (`lovbat`), the twig
    across the ants' road (`kvist`), Pappa's seesaw (`gungbrada` on `gungsten`), the vittra door
    (`vittradorr`), and what he climbs: beard lichen (`skagglav`) and a root (`rot`).

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up, and a
thing's front faces -Y, which is towards the camera in the game. Every thing is an object of its own, named
as the game asks for it (src/render/forest-kit.ts says where each has its origin).

Nothing here has a texture. A thing's colours are painted on its corners (the colour attribute "Color"), with
the shade of its own creases, and of the ground it stands on, baked into them.

Nothing in this model comes from anyone else, and nothing on it is a letter, a numeral or a mark: the cap's
badge is a plain round patch. Keep this file in plain ASCII: it is sent to Blender as text. The server's safe
mode allows no classes and no functions passed as values, so shapes are given as tables.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2.0
GOLDEN = math.radians(137.50776)

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)


def linear(value):
    """Blender wants light, not paint: an sRGB value from 0 to 255 as linear light from 0 to 1."""
    c = value / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def tone(text):
    """A colour written as in the game, '#rrggbb', as linear light."""
    return (linear(int(text[1:3], 16)), linear(int(text[3:5], 16)), linear(int(text[5:7], 16)))


def blend(a, b, t):
    t = max(0.0, min(1.0, t))
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t)


def lit(colour, k):
    return (colour[0] * k, colour[1] * k, colour[2] * k)


def rnd(a, b=0.0):
    """A fixed number from 0 to 1 for a pair of numbers: the same kit every time it is built."""
    s = math.sin(a * 12.9898 + b * 78.233) * 43758.5453
    return s - math.floor(s)


def knot(i, j, k):
    s = math.sin(i * 127.1 + j * 311.7 + k * 74.7) * 43758.5453
    return s - math.floor(s)


def noise(x, y, z):
    """Smooth noise from 0 to 1."""
    xi = math.floor(x)
    yi = math.floor(y)
    zi = math.floor(z)
    xf = x - xi
    yf = y - yi
    zf = z - zi
    u = xf * xf * (3.0 - 2.0 * xf)
    v = yf * yf * (3.0 - 2.0 * yf)
    w = zf * zf * (3.0 - 2.0 * zf)
    total = 0.0
    for dz in (0, 1):
        for dy in (0, 1):
            for dx in (0, 1):
                share = (u if dx else 1.0 - u) * (v if dy else 1.0 - v) * (w if dz else 1.0 - w)
                total += share * knot(xi + dx, yi + dy, zi + dz)
    return total


def along(table, t):
    """A value read from a table of (at, value) rows, straight between its rows."""
    if t <= table[0][0]:
        return table[0][1]
    for i in range(1, len(table)):
        if t <= table[i][0]:
            a = table[i - 1]
            b = table[i]
            return a[1] + (b[1] - a[1]) * (t - a[0]) / (b[0] - a[0])
    return table[-1][1]


# The one material: the colour attribute feeds the base colour, so that the exporter writes COLOR_0.
MATERIAL = bpy.data.materials.new('forest')
MATERIAL.use_nodes = True
for node in MATERIAL.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.9
        attribute = MATERIAL.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Color'
        MATERIAL.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])


def new_part():
    """One thing while it is being built: its mesh, the colour of each of its points, and the faces that
    have one colour of their own (a crisp border, where a point's colour would run)."""
    return {'bm': bmesh.new(), 'paint': {}, 'flat': {}}


def put(part, at, colour):
    """A point, in its colour."""
    made = part['bm'].verts.new(at)
    part['paint'][made] = colour
    return made


def face(part, verts, colour=None):
    made = part['bm'].faces.new(verts)
    if colour is not None:
        part['flat'][made] = colour
    return made


def skin(part, rings, colours, first=None, last=None, closed=True, flip=False):
    """Quads between rings of points. colours[i] is ring i's colour, or a list with one for each point.
    `first` and `last` close an end with a fan: each is (point, colour). Gives the points as [ring][j]."""
    made = []
    for i in range(len(rings)):
        row = []
        for j in range(len(rings[i])):
            colour = colours[i]
            if isinstance(colour, list):
                colour = colour[j]
            row.append(put(part, rings[i][j], colour))
        made.append(row)
    count = len(rings[0])
    span = count if closed else count - 1
    for i in range(len(made) - 1):
        for j in range(span):
            k = (j + 1) % count
            quad = (made[i][j], made[i][k], made[i + 1][k], made[i + 1][j])
            face(part, quad[::-1] if flip else quad)
    ends = ((first, made[0], True), (last, made[-1], False))
    for end, ring, down in ends:
        if end is None:
            continue
        tip = put(part, end[0], end[1])
        for j in range(span):
            k = (j + 1) % count
            fan = (ring[k], ring[j], tip) if down else (ring[j], ring[k], tip)
            face(part, fan[::-1] if flip else fan)
    return made


def circle(centre, across, up, radius, count, turn=0.0, squash=1.0, ripple=None):
    """A ring of points round a centre, in the plane of `across` and `up`."""
    ring = []
    for j in range(count):
        angle = TAU * (j + turn) / count
        wide = radius * (ripple[j] if ripple else 1.0)
        ring.append(centre + across * (wide * math.cos(angle)) + up * (wide * math.sin(angle) * squash))
    return ring


def tube(part, path, radii, colours, count, closed_ends=True, squash=1.0, lean=None, twist=0.5):
    """A round tube along a path of points. colours[i] is the colour at point i of the path, or a list with
    one for each point round it. `squash` is how thick it is across `lean` as a share of round."""
    rings = []
    normal = lean if lean is not None else Vector((0.0, 1.0, 0.0))
    for i in range(len(path)):
        ahead = path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]
        ahead.normalize()
        side = ahead.cross(normal)
        if side.length < 0.001:
            side = ahead.cross(Vector((1.0, 0.0, 0.0)))
        side.normalize()
        up = side.cross(ahead)
        # Round the way it goes, so that its faces look outwards.
        rings.append(circle(path[i], up, side, radii[i], count, turn=twist * (i % 2), squash=1.0 / squash if squash else 1.0))
        if squash != 1.0:
            rings[-1] = [path[i] + (point - path[i]) * squash for point in rings[-1]]
    first = (path[0], colours[0] if not isinstance(colours[0], list) else colours[0][0]) if closed_ends else None
    last = (path[-1], colours[-1] if not isinstance(colours[-1], list) else colours[-1][0]) if closed_ends else None
    return skin(part, rings, colours, first, last)


def lathe(part, profile, count, matrix, colours, ripple=None, turn=None):
    """A profile of (radius, height) turned round Z, then placed by `matrix`. A radius of 0 at an end closes it."""
    rings = []
    tones = []
    first = None
    last = None
    for i in range(len(profile)):
        radius = profile[i][0]
        height = profile[i][1]
        if radius <= 0.0 and i == 0:
            first = (matrix @ Vector((0.0, 0.0, height)), colours[i])
            continue
        if radius <= 0.0 and i == len(profile) - 1:
            last = (matrix @ Vector((0.0, 0.0, height)), colours[i])
            continue
        ring = []
        for j in range(count):
            angle = TAU * (j + (turn[i] if turn else 0.0)) / count
            wide = radius * (ripple[i][j] if ripple else 1.0)
            ring.append(matrix @ Vector((wide * math.cos(angle), wide * math.sin(angle), height)))
        rings.append(ring)
        tones.append(colours[i])
    return skin(part, rings, tones, first, last)


def lump(part, centre, size, detail, colour):
    """A round lump: an icosphere pulled into shape. Gives its points, to push about and to paint.
    It is made in a mesh of its own and copied in: made in place, Blender lets go of the points already there."""
    matrix = Matrix.Translation(centre) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    ball = bmesh.new()
    bmesh.ops.create_icosphere(ball, subdivisions=detail, radius=1.0, matrix=matrix)
    ball.verts.index_update()
    made = [put(part, vert.co.copy(), colour) for vert in ball.verts]
    for side in ball.faces:
        face(part, [made[vert.index] for vert in side.verts])
    ball.free()
    return made


IDENTITY = Matrix.Identity(4)
ALONG_X = Matrix.Rotation(math.radians(90), 4, 'Y')


def finish(part, name, sharp=180.0, strength=0.6, reach=0.3, floor=None, recalc=True):
    """Makes the object, with smooth shading up to an angle. `strength` and `reach` are how dark and how far
    its own shade goes when it is baked, and `floor` is the height of the ground it stands on, if it does."""
    bm = part['bm']
    if recalc:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    layer = bm.loops.layers.float_color.new('Color')
    paint = part['paint']
    crisp = part['flat']
    for made in bm.faces:
        made.smooth = True
        own = crisp.get(made)
        for loop in made.loops:
            colour = own if own is not None else paint.get(loop.vert, (1.0, 0.0, 1.0))
            loop[layer] = (colour[0], colour[1], colour[2], 1.0)
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if sharp < 180.0:
        mesh.set_sharp_from_angle(angle=math.radians(sharp))
    mesh.materials.append(MATERIAL)
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = strength
    made['reach'] = reach
    made['floor'] = -1000.0 if floor is None else floor
    return made


# --- the spruce cone -----------------------------------------------------------------------------------------
# A Norway spruce cone is four to five times as long as it is thick, and its scales lie over each other like
# shingles, their free ends towards the cone's tip, in spirals that run both ways round it. The scales are
# set out as they grow: each a golden angle round from the last, and a little further along.

CONE_DARK = tone('#4a2f1a')
CONE_SCALE = tone('#8a5a30')
CONE_TIP = tone('#c2955a')
CONE_STALK = tone('#5b4028')

# How thick a cone is along its length, from the stalk to the tip: (how far along, radius as a share of its length).
CONE_BODY = [
    (0.0, 0.034), (0.03, 0.066), (0.09, 0.088), (0.2, 0.101), (0.34, 0.106), (0.5, 0.103), (0.66, 0.094),
    (0.8, 0.079), (0.9, 0.061), (0.96, 0.043), (1.0, 0.02),
]
# The spirals that show, by how many scales a cone has: (across, along). A scale is as wide as the way to the
# next one round the cone, and as long as the way to the next one along it.
SPIRALS = {'sparse': (1.4835, 8.0), 'few': (0.9163, 13.0), 'many': (0.5665, 21.0), 'dense': (0.35, 34.0)}


def cone(part, count, spirals, length, lift, matrix, body=CONE_BODY, sides=9, squash=(1.0, 1.0), seed=0.0,
         plain=False, axis=None, shown=None, mossy=None):
    """A cone along Z from its stalk at 0 to its tip at `length`, placed by `matrix`.
    `squash` is how wide it is across X and across Y, as shares of round. `axis` bends it: a table of how far
    its middle lies along X by how far along the cone. `shown` is the part of the way round that has scales,
    as two angles, where the rest is never seen; `mossy` is the part where moss has crept over them."""
    across = SPIRALS[spirals][0]
    row = SPIRALS[spirals][1] / count * 0.94
    # The dark core that shows between the scales.
    rings = []
    tones = []
    steps = 10
    for i in range(steps + 1):
        s = i / steps
        radius = along(body, s) * length * 0.86
        shift = along(axis, s) if axis else 0.0
        ring = []
        for j in range(sides):
            angle = TAU * (j + 0.5 * (i % 2)) / sides
            ring.append(matrix @ Vector((radius * math.cos(angle) * squash[0] + shift, radius * math.sin(angle) * squash[1], s * length)))
        rings.append(ring)
        tones.append(CONE_DARK)
    low = along(axis, 0.0) if axis else 0.0
    high = along(axis, 1.0) if axis else 0.0
    skin(part, rings, tones, (matrix @ Vector((low, 0.0, -0.012 * length)), CONE_STALK), (matrix @ Vector((high, 0.0, length * 1.008)), CONE_SCALE))
    for k in range(count):
        s = 0.035 + 0.94 * (k + 0.5) / count
        angle = (k * GOLDEN + seed) % TAU
        if shown and not shown[0] <= angle <= shown[1]:
            continue
        c = math.cos(angle)
        d = math.sin(angle)
        wide = across * along(body, s) * length * (0.9 + 0.2 * rnd(k, 3.0 + seed)) * 1.12
        out = lift * length * (0.75 + 0.5 * rnd(k, 7.0 + seed))
        # Towards the tip the scales lie closer, and at the stalk they are small.
        out *= 0.5 + 0.5 * min(1.0, (1.0 - s) * 6.0)
        points = []
        # Its hidden root, its two corners, its free end, and the low ridge down its middle.
        for a, t, o in ((-0.5, 0.0, -0.3), (0.06, -0.5, 0.12), (0.06, 0.5, 0.12), (0.74, 0.0, 1.0), (0.22, 0.0, 0.62)):
            sa = min(1.0, max(0.0, s + a * row * 1.25))
            radius = along(body, sa) * length + o * out
            x = (radius * c - t * wide * d) * squash[0] + (along(axis, sa) if axis else 0.0)
            y = (radius * d + t * wide * c) * squash[1]
            points.append(matrix @ Vector((x, y, sa * length)))
        worn = 0.86 + 0.28 * rnd(k, 11.0 + seed)
        dark = CONE_DARK
        body_tone = lit(CONE_SCALE, worn)
        edge = lit(blend(CONE_DARK, CONE_SCALE, 0.6), worn)
        end = lit(CONE_TIP, worn)
        if mossy and mossy[0] <= angle <= mossy[1]:
            green = min(1.0, (mossy[1] - angle) / max(0.001, mossy[1] - mossy[0]) * 1.6) * (0.5 + 0.7 * rnd(k, 5.0))
            moss = blend(MOSS_DEEP, MOSS_BRIGHT, rnd(k, 2.0))
            body_tone = blend(body_tone, moss, green)
            edge = blend(edge, lit(moss, 0.7), green)
            end = blend(end, lit(moss, 1.15), green)
        root = put(part, points[0], dark)
        left = put(part, points[1], edge)
        right = put(part, points[2], edge)
        tip = put(part, points[3], end)
        if plain:
            face(part, (root, right, tip))
            face(part, (root, tip, left))
            continue
        ridge = put(part, points[4], body_tone)
        face(part, (root, right, ridge))
        face(part, (right, tip, ridge))
        face(part, (tip, left, ridge))
        face(part, (left, root, ridge))


MOSS_DEEP = tone('#35521f')
MOSS = tone('#587a27')
MOSS_BRIGHT = tone('#7f9a30')

# Kotte: the cone he pushes, and the ones that roll. It stands on its stalk at the origin, 1 long.
part = new_part()
cone(part, 150, 'few', 1.0, 0.02, IDENTITY)
finish(part, 'kotte', sharp=50.0, strength=0.75, reach=0.08, recalc=False)

# Kotte-liten: the same cone for the forest floor, where many lie: forty scales, each a plain kite.
# It lies along X with its middle at the origin, 1 long.
part = new_part()
cone(part, 40, 'sparse', 1.0, 0.03, Matrix.Translation((-0.5, 0.0, 0.0)) @ ALONG_X, sides=5, plain=True)
finish(part, 'kotte-liten', sharp=50.0, strength=0.6, reach=0.1, recalc=False)


# --- the moss cushion ----------------------------------------------------------------------------------------
# A low hummock with a knobbly outline, painted from white at its crown to dark at its foot: the game gives
# each one its own green. About four hundred lie in a picture, so it is a few points only.

part = new_part()
SIDES = 8
rings = []
tones = []
for i, (wide, high, light) in enumerate(((1.0, -0.12, 0.62), (0.95, 0.1, 0.74), (0.78, 0.3, 0.87), (0.48, 0.44, 0.96))):
    ring = []
    shades = []
    for j in range(SIDES):
        angle = TAU * (j + 0.5 * (i % 2)) / SIDES
        knob = 1.0 + (0.36 if i < 2 else 0.14) * (rnd(1.0 + (0.0 if i < 2 else i), j) - 0.5)
        ring.append(Vector((wide * knob * math.cos(angle), wide * knob * math.sin(angle), high)))
        k = light * (0.95 + 0.1 * rnd(j + 4.0, i))
        shades.append((k, k, k * 0.97))
    rings.append(ring)
    tones.append(shades)
skin(part, rings, tones, None, (Vector((0.03, -0.02, 0.5)), (1.0, 1.0, 0.97)))
finish(part, 'tuva', strength=0.0)


# --- stones --------------------------------------------------------------------------------------------------
# Granite as it lies in the forest: broken into planes, with a crack, grey with pale and yellow lichen, and a
# cap of moss. Each is about 1 across and sits a little into the ground.

GRANITE = tone('#a39f94')
GRANITE_DARK = tone('#77746b')
GRANITE_PALE = tone('#bdb9ab')
LICHEN_PALE = tone('#c9cdbf')
LICHEN_GOLD = tone('#b5a23c')
CRACK = tone('#3a3f3f')

# For each stone: its size, how fine it is, the planes that cut it (a direction and how far out), and its crack.
STONES = {
    'sten-a': ((1.0, 0.8, 0.62), 3, 11.0, (((0.3, -0.5, 0.8), 0.74), ((-0.8, -0.4, 0.3), 0.8), ((0.7, -0.6, 0.1), 0.78), ((0.1, 0.7, 0.6), 0.8), ((-0.2, -0.9, -0.1), 0.72)), ((0.5, 0.2, 0.4), 0.12)),
    'sten-b': ((1.0, 0.72, 0.8), 3, 23.0, (((0.0, -0.3, 0.95), 0.66), ((0.8, -0.5, 0.2), 0.72), ((-0.6, -0.7, 0.3), 0.76), ((-0.7, 0.5, 0.4), 0.8)), ((-0.4, 0.5, 0.3), -0.05)),
    'sten-c': ((1.0, 0.9, 0.46), 2, 37.0, (((0.2, -0.2, 0.96), 0.7), ((0.9, -0.3, 0.2), 0.84), ((-0.5, -0.8, 0.2), 0.8)), ((0.3, 0.6, 0.2), 0.3)),
}


def stone(name, size, detail, seed, planes, crack, mossy=1.0):
    part = new_part()
    verts = lump(part, (0.0, 0.0, 0.0), (1.0, 1.0, 1.0), detail, GRANITE)
    split = Vector(crack[0])
    split.normalize()
    for vert in verts:
        at = vert.co.copy()
        swell = 0.86 + 0.28 * noise(at.x * 1.3 + seed, at.y * 1.3, at.z * 1.3)
        at = at * swell
        for plane in planes:
            normal = Vector(plane[0])
            normal.normalize()
            over = at.dot(normal) - plane[1]
            if over > 0.0:
                at = at - normal * over
        # The crack: a groove where a plane through the stone meets its surface.
        near = abs(at.dot(split) - crack[1])
        groove = max(0.0, 1.0 - near / 0.07)
        at = at * (1.0 - 0.07 * groove)
        vert.co = Vector((at.x * size[0], at.y * size[1], at.z * size[2] + size[2] * 0.72))
        grain = noise(at.x * 5.0 + seed, at.y * 5.0, at.z * 5.0)
        colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 1.3 - 0.1)
        patch = noise(at.x * 2.6 + seed * 2.0, at.y * 2.6 + 4.0, at.z * 2.6)
        if patch > 0.58:
            colour = blend(colour, LICHEN_PALE, (patch - 0.58) * 7.0)
        gold = noise(at.x * 3.4 + 9.0, at.y * 3.4 + seed, at.z * 3.4)
        if gold > 0.7:
            colour = blend(colour, LICHEN_GOLD, (gold - 0.7) * 6.0)
        colour = blend(colour, CRACK, groove * 0.85)
        # Moss on what faces up, in from an edge that wanders.
        up = at.z / max(0.001, at.length)
        green = (up - 0.5 + (noise(at.x * 2.2 + seed, at.y * 2.2, 3.0) - 0.5) * 0.6) * 4.0 * mossy
        if green > 0.0:
            colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(at.x * 3.0, at.y * 3.0, seed)), green)
        part['paint'][vert] = colour
    return finish(part, name, sharp=38.0, strength=0.6, reach=0.5, floor=0.0)


for name in ('sten-a', 'sten-b', 'sten-c'):
    stone(name, STONES[name][0], STONES[name][1], STONES[name][2], STONES[name][3], STONES[name][4])

# --- what grows on the floor -----------------------------------------------------------------------------------

SPRUCE_DEEP = tone('#2a5a30')
SPRUCE = tone('#417a38')
SPRUCE_TIP = tone('#93b455')
BARK = tone('#6a5038')
BARK_DARK = tone('#463628')
BARK_PALE = tone('#93795c')
WOOD = tone('#c9a878')
WOOD_PALE = tone('#e2cfa4')
WOOD_HEART = tone('#a07850')
UP = Vector((0.0, 0.0, 1.0))


def spray(part, root, out, long, wide, droop, deep, bright, under=1.5):
    """A bough of needles: a ridge from its root to its tip with a wing to each side, and the same from below."""
    lift = UP - out * UP.dot(out)
    lift.normalize()
    side = lift.cross(out)
    middle = root + out * (long * 0.55) + lift * (long * 0.08)
    tip = root + out * long - UP * (long * droop)
    for below in (False, True):
        k = under if below else 1.0
        a = put(part, root, lit(deep, k))
        b = put(part, middle, lit(blend(deep, bright, 0.35), k))
        c = put(part, tip, lit(bright, k))
        left = put(part, middle - side * wide - UP * (long * 0.1) - out * (long * 0.12), lit(blend(deep, bright, 0.85), k))
        right = put(part, middle + side * wide - UP * (long * 0.1) - out * (long * 0.12), lit(blend(deep, bright, 0.85), k))
        for tri in ((a, b, right), (b, c, right), (a, left, b), (left, c, b)):
            face(part, tri[::-1] if below else tri)


def bough(part, root, out, long, wide, droop, deep, bright, under=1.5):
    """A spruce bough: its ridge, and two shoots to each side, the nearer ones the longer."""
    lift = UP - out * UP.dot(out)
    lift.normalize()
    side = lift.cross(out)
    one = root + out * (long * 0.36) + lift * (long * 0.07)
    two = root + out * (long * 0.72) + lift * (long * 0.03) - UP * (long * droop * 0.4)
    tip = root + out * long - UP * (long * droop)
    sag = UP * (long * (0.24 + droop * 0.6))
    for below in (False, True):
        k = under if below else 1.0
        a = put(part, root, lit(deep, k))
        b = put(part, one, lit(blend(deep, bright, 0.25), k))
        c = put(part, two, lit(blend(deep, bright, 0.55), k))
        d = put(part, tip, lit(bright, k))
        l1 = put(part, one - side * wide + out * (long * 0.12) - sag, lit(bright, k))
        r1 = put(part, one + side * wide + out * (long * 0.12) - sag, lit(bright, k))
        l2 = put(part, two - side * (wide * 0.58) + out * (long * 0.1) - sag * 0.8, lit(bright, k))
        r2 = put(part, two + side * (wide * 0.58) + out * (long * 0.1) - sag * 0.8, lit(bright, k))
        for tri in ((a, b, r1), (b, c, r1), (c, r2, r1), (c, d, r2), (a, l1, b), (b, l1, c), (c, l1, l2), (c, l2, d)):
            face(part, tri[::-1] if below else tri)


# Gran: a young spruce, as tall as two and a half of him: a thin stem, whorls of boughs that hang a little,
# and the pale shoot of this year at its top. It stands on the origin.
part = new_part()
TALL = 2.6
tube(part, [Vector((0.0, 0.0, -0.1)), Vector((0.01, 0.0, TALL * 0.3)), Vector((0.0, 0.01, TALL * 0.62)), Vector((0.0, 0.0, TALL * 0.9))],
     [0.06, 0.045, 0.028, 0.012], [BARK_DARK, BARK, BARK, SPRUCE], 5)
# Each whorl: how high it sits, how many boughs, how long they are, how far they hang, and how much they rise.
WHORLS = ((0.07, 7, 0.4, 0.26, -0.08), (0.2, 7, 0.38, 0.22, 0.0), (0.33, 6, 0.33, 0.17, 0.06), (0.46, 6, 0.27, 0.12, 0.14), (0.59, 5, 0.21, 0.08, 0.22), (0.71, 5, 0.15, 0.04, 0.32), (0.81, 4, 0.1, 0.0, 0.45))
for w in range(len(WHORLS)):
    high, boughs, reach, hang, rise = WHORLS[w]
    for k in range(boughs):
        angle = TAU * (k + 0.37 * w + 0.3 * rnd(w, k)) / boughs
        out = Vector((math.cos(angle), math.sin(angle), rise))
        out.normalize()
        long = TALL * reach * (0.86 + 0.28 * rnd(k, w + 20.0))
        bough(part, Vector((0.0, 0.0, TALL * (high + 0.02 * rnd(k, w + 7.0)))), out, long, long * 0.5, hang, SPRUCE_DEEP, blend(SPRUCE, SPRUCE_TIP, 0.2 + 0.6 * rnd(k + 3.0, w)))
for k in range(3):
    angle = TAU * k / 3 + 0.4
    out = Vector((math.cos(angle) * 0.35, math.sin(angle) * 0.35, 1.0))
    out.normalize()
    spray(part, Vector((0.0, 0.0, TALL * 0.88)), out, TALL * 0.12, TALL * 0.03, -0.1, SPRUCE, SPRUCE_TIP)
finish(part, 'gran', sharp=180.0, strength=0.3, reach=0.4, floor=0.0, recalc=False)

# Ormbunke: a fern in October. Fronds rise from one middle, arch over and hang at their tips, each with its
# leaflets as teeth along both sides, green at the stem and yellow at the tips.
FERN = tone('#5f9238')
FERN_DEEP = tone('#2f5a26')
FERN_GOLD = tone('#b5a83e')
FERN_RUST = tone('#a8742e')
part = new_part()
FRONDS = ((0.2, 1.0, 0.72, 0.2), (1.0, 0.8, 0.5, 0.17), (1.75, 0.92, 0.66, 0.19), (2.6, 1.05, 0.78, 0.21), (3.4, 0.76, 0.5, 0.16), (4.1, 0.98, 0.7, 0.2), (4.95, 0.86, 0.58, 0.18), (5.7, 0.55, 0.64, 0.11))
STEPS = 6
for f in range(len(FRONDS)):
    turn, long, high, wide = FRONDS[f]
    out = Vector((math.cos(turn), math.sin(turn), 0.0))
    side = UP.cross(out)
    autumn = rnd(f, 31.0)
    for below in (False, True):
        k = 1.4 if below else 1.0
        spine = []
        lefts = []
        rights = []
        for i in range(STEPS + 1):
            t = i / STEPS
            at = out * (long * t ** 0.9) + UP * (high * math.sin(math.pi * t * 0.86) ** 0.8)
            half = wide * math.sin(math.pi * t ** 0.7) ** 0.7 * (1.0 if i % 2 == 1 else 0.5)
            gold = max(0.0, t * 1.5 - 0.5 + (autumn - 0.5) * 0.8)
            blade = blend(FERN, blend(FERN_GOLD, FERN_RUST, autumn * 0.6), gold)
            spine.append(put(part, at, lit(blend(FERN_DEEP, blade, 0.3), k)))
            lefts.append(put(part, at - side * half - UP * (half * 0.35), lit(blade, k)))
            rights.append(put(part, at + side * half - UP * (half * 0.35), lit(blade, k)))
        for i in range(STEPS):
            for quad in ((spine[i], spine[i + 1], rights[i + 1], rights[i]), (spine[i], lefts[i], lefts[i + 1], spine[i + 1])):
                face(part, quad[::-1] if below else quad)
finish(part, 'ormbunke', sharp=180.0, strength=0.3, reach=0.3, floor=0.0, recalc=False)

# Kantarell: three chanterelles, each a funnel with a wavy rim. No fly agaric: red is the candy's.
CHANTERELLE = tone('#e8a93a')
CHANTERELLE_PALE = tone('#f2cf7a')
CHANTERELLE_DEEP = tone('#c98626')
part = new_part()
for at, size, turn in (((0.0, 0.0), 1.0, 0.0), ((0.2, 0.09), 0.72, 1.3), ((-0.13, 0.17), 0.55, 2.9)):
    wavy = [[1.0] * 6, [1.0] * 6, [1.0 + 0.22 * math.cos(2.0 * TAU * j / 6 + turn) + 0.1 * math.cos(3.0 * TAU * j / 6) for j in range(6)],
            [1.0 + 0.15 * math.cos(2.0 * TAU * j / 6 + turn) for j in range(6)], [1.0] * 6]
    lean = Matrix.Translation((at[0], at[1], -0.02)) @ Matrix.Rotation(0.18 * math.sin(turn * 3.0), 4, 'X') @ Matrix.Diagonal((size, size, size, 1.0))
    lathe(part, [(0.045, 0.0), (0.05, 0.16), (0.17, 0.35), (0.1, 0.345), (0.0, 0.3)], 6, lean,
          [CHANTERELLE_PALE, CHANTERELLE_PALE, CHANTERELLE, CHANTERELLE_DEEP, CHANTERELLE_DEEP], ripple=wavy)
finish(part, 'kantarell', sharp=70.0, strength=0.6, reach=0.2, floor=0.0)

# Karljohan: a cep. A fat pale stem and a brown bun of a cap, pale under its rim.
part = new_part()
lathe(part, [(0.0, -0.02), (0.11, -0.02), (0.135, 0.1), (0.1, 0.27), (0.09, 0.33), (0.25, 0.33), (0.275, 0.4), (0.22, 0.5), (0.11, 0.56), (0.0, 0.575)], 8, IDENTITY,
      [tone('#e6dcc4'), tone('#e6dcc4'), tone('#eee6d0'), tone('#e2d6ba'), tone('#d8c890'), tone('#d8c890'), tone('#6a4628'), tone('#7a5230'), tone('#8a6038'), tone('#8a6038')])
finish(part, 'karljohan', sharp=60.0, strength=0.6, reach=0.3, floor=0.0)

# Lov: a birch leaf that has fallen. Yellow, toothed, a little curled, with its stalk. It lies flat with its
# middle at the origin and its tip towards +X.
LEAF = tone('#e6c53a')
LEAF_DEEP = tone('#c9962a')
LEAF_VEIN = tone('#b8922a')


def leaf_outline(count, long, wide):
    """Half the outline of a birch leaf, from its stalk to its tip: (along, half its width)."""
    rows = []
    for i in range(count + 1):
        u = i / count
        tooth = 1.0 if i % 2 == 1 else 0.82
        rows.append((long * (u - 0.45), wide * math.sin(math.pi * u ** 0.62) ** 0.85 * (1.0 - u) ** 0.25 * tooth))
    return rows


part = new_part()
half = leaf_outline(7, 0.36, 0.2)
middle = put(part, Vector((0.0, 0.0, 0.012)), LEAF_VEIN)
rim = []
for i in range(len(half)):
    x, w = half[i]
    if i == 0 or i == len(half) - 1:
        rim.append(put(part, Vector((x, 0.0, 0.006 + 0.03 * abs(x))), LEAF_VEIN if i == 0 else LEAF_DEEP))
    else:
        rim.append(put(part, Vector((x, -w, 0.004 + 0.8 * w * w)), blend(LEAF, LEAF_DEEP, rnd(i, 1.0) * 0.7)))
for i in range(len(half) - 2, 0, -1):
    x, w = half[i]
    rim.append(put(part, Vector((x, w, 0.004 + 0.8 * w * w)), blend(LEAF, LEAF_DEEP, rnd(i, 2.0) * 0.7)))
for j in range(len(rim)):
    face(part, (middle, rim[j], rim[(j + 1) % len(rim)]))
stalk = put(part, Vector((-0.27, 0.012, 0.03)), LEAF_VEIN)
face(part, (rim[0], put(part, Vector((-0.16, 0.02, 0.008)), LEAF_VEIN), stalk))
finish(part, 'lov', sharp=180.0, strength=0.0, recalc=False)

# Renlav: a tuft of reindeer lichen, pale grey-green knobs.
LICHEN = tone('#c9cdbf')
LICHEN_SHADE = tone('#8f9a86')
part = new_part()
for at, size in (((0.0, 0.0, 0.07), 0.12), ((0.13, 0.04, 0.05), 0.09), ((-0.1, 0.09, 0.05), 0.085), ((0.03, -0.12, 0.045), 0.08), ((-0.09, -0.07, 0.04), 0.07)):
    for vert in lump(part, at, (size, size, size * 0.9), 1, LICHEN):
        push = 0.8 + 0.45 * rnd(vert.co.x * 37.0, vert.co.y * 53.0 + vert.co.z * 11.0)
        vert.co = Vector(at) + (vert.co - Vector(at)) * push
        part['paint'][vert] = blend(LICHEN_SHADE, LICHEN, (vert.co.z / 0.16) * push)
finish(part, 'renlav', sharp=180.0, strength=0.55, reach=0.12, floor=0.0)


# --- what he uses ----------------------------------------------------------------------------------------------

# Keps: Bertil's cap, upside down on the water as a boat. A trucker cap: a foam front in white, a mesh back
# and a curved peak in red, a button on its top, and a plain round patch on the front with nothing on it.
# Its opening is up and its peak points to +X. The origin is the middle of its opening.
CAP_RED = tone('#d23b2e')
CAP_RED_DEEP = tone('#a32a24')
CAP_WHITE = tone('#f2efe6')
CAP_SHADE = tone('#d9d5c8')
CAP_BAND = tone('#cfc8b8')
CAP_BADGE = tone('#2c3a5a')
CAP_STITCH = tone('#8e9bb8')
CAP_LONG = 0.98
CAP_WIDE = 0.82
CAP_DEEP = 0.74


def cap_at(turn, down, scale=1.0, sink=0.0):
    """A point of the crown: `turn` round it from the front, `down` from the rim (0) to the top (a quarter turn)."""
    front = max(0.0, math.cos(turn))
    power = 2.0 / (2.0 + 1.3 * front * front)
    out = math.cos(down) ** power * scale
    return Vector((CAP_LONG * out * math.cos(turn) + 0.04, CAP_WIDE * out * math.sin(turn), -(CAP_DEEP - sink) * math.sin(down) ** power))


part = new_part()
SEGS = 24
DOWNS = (0.0, 0.2, 0.5, 0.85, 1.2, 1.45)
shell = []
for i in range(len(DOWNS)):
    shell.append([put(part, cap_at(TAU * j / SEGS, DOWNS[i]), CAP_RED) for j in range(SEGS)])
for i in range(len(DOWNS) - 1):
    for j in range(SEGS):
        k = (j + 1) % SEGS
        middle_turn = TAU * (j + 0.5) / SEGS
        foam = math.cos(middle_turn) > 0.36
        # The opening over the strap at the back.
        if i == 0 and abs(middle_turn - math.pi) < 0.4:
            continue
        colour = CAP_WHITE if foam else (CAP_RED if (i + j) % 2 == 0 or i == 0 else lit(CAP_RED, 0.9))
        # A seam down the middle of the front, and where the foam meets the mesh.
        if foam and (j == 0 or j == SEGS - 1) and i < 4:
            colour = blend(CAP_WHITE, CAP_SHADE, 0.35)
        face(part, (shell[i][k], shell[i][j], shell[i + 1][j], shell[i + 1][k]), colour)
button = put(part, cap_at(0.0, math.pi / 2.0), CAP_RED)
for j in range(SEGS):
    face(part, (shell[-1][(j + 1) % SEGS], shell[-1][j], button), CAP_WHITE if math.cos(TAU * (j + 0.5) / SEGS) > 0.36 else CAP_RED)
# The inside: the foam's back, the mesh from within, and the sweatband round the rim.
INNER = (0.0, 0.55, 1.15)
lining = []
for i in range(len(INNER)):
    lining.append([put(part, cap_at(TAU * j / SEGS, INNER[i], 0.955, 0.03), CAP_RED) for j in range(SEGS)])
for j in range(SEGS):
    k = (j + 1) % SEGS
    foam = math.cos(TAU * (j + 0.5) / SEGS) > 0.36
    face(part, (shell[0][j], shell[0][k], lining[0][k], lining[0][j]), CAP_SHADE if foam else CAP_RED_DEEP)
    face(part, (lining[0][j], lining[0][k], lining[1][k], lining[1][j]), CAP_BAND)
    face(part, (lining[1][j], lining[1][k], lining[2][k], lining[2][j]), lit(CAP_SHADE, 0.85) if foam else lit(CAP_RED_DEEP, 0.8))
floor_point = put(part, cap_at(0.0, math.pi / 2.0, 0.955, 0.03), CAP_RED)
for j in range(SEGS):
    face(part, (lining[2][j], lining[2][(j + 1) % SEGS], floor_point), lit(CAP_RED_DEEP, 0.75))
# The strap across the opening at the back.
strap = []
for j in range(10, 15):
    turn = TAU * j / SEGS
    strap.append((cap_at(turn, 0.0, 1.01) + Vector((0.0, 0.0, 0.0)), cap_at(turn, 0.09, 1.01)))
for i in range(len(strap) - 1):
    a = put(part, strap[i][0], CAP_RED)
    b = put(part, strap[i + 1][0], CAP_RED)
    c = put(part, strap[i + 1][1], CAP_RED)
    d = put(part, strap[i][1], CAP_RED)
    face(part, (b, a, d, c), CAP_RED_DEEP)
# The button on its top, which is underneath now.
for vert in lump(part, cap_at(0.0, math.pi / 2.0) + Vector((0.0, 0.0, -0.015)), (0.07, 0.07, 0.035), 1, CAP_RED):
    part['paint'][vert] = CAP_RED
# The peak: a curved board from the front of the rim, a finger thick.
ACROSS = 9
OUTWARD = 4
for upper in (True, False):
    rows = []
    for v in range(OUTWARD + 1):
        row = []
        for u in range(ACROSS):
            side = (u / (ACROSS - 1.0)) * 2.0 - 1.0
            turn = side * 1.12
            base = cap_at(turn, 0.0, 1.0)
            reach = 0.78 * (v / OUTWARD) * (1.0 - 0.34 * side * side)
            curl = 0.1 * side * side + 0.03 * (v / OUTWARD)
            at = Vector((base.x + reach, base.y * (1.0 + 0.1 * v / OUTWARD), curl + (0.0 if upper else -0.045)))
            row.append(put(part, at, CAP_RED))
        rows.append(row)
    for v in range(OUTWARD):
        for u in range(ACROSS - 1):
            quad = (rows[v][u], rows[v][u + 1], rows[v + 1][u + 1], rows[v + 1][u])
            face(part, quad[::-1] if upper else quad, lit(CAP_RED, 0.92) if upper else lit(CAP_RED, 1.2))
    if upper:
        above = rows
    else:
        edge = [(above[v][0], rows[v][0]) for v in range(OUTWARD + 1)] + [(above[OUTWARD][u], rows[OUTWARD][u]) for u in range(1, ACROSS)]
        edge += [(above[v][ACROSS - 1], rows[v][ACROSS - 1]) for v in range(OUTWARD - 1, -1, -1)]
        for i in range(len(edge) - 1):
            face(part, (edge[i][0], edge[i][1], edge[i + 1][1], edge[i + 1][0]), CAP_WHITE)
# The badge on the foam front: a plain round patch. Nothing is on it.
centre = cap_at(0.0, 0.62)
ahead = cap_at(0.0, 0.5) - cap_at(0.0, 0.74)
ahead.normalize()
across_badge = Vector((0.0, 1.0, 0.0))
outward = across_badge.cross(ahead)
if outward.x < 0.0:
    outward = -outward
hub = put(part, centre + outward * 0.03, CAP_BADGE)
patch = [put(part, centre + outward * 0.026 + (across_badge * math.cos(TAU * j / 12) + ahead * math.sin(TAU * j / 12)) * 0.17, CAP_BADGE) for j in range(12)]
skirt = [put(part, centre - outward * 0.02 + (across_badge * math.cos(TAU * j / 12) + ahead * math.sin(TAU * j / 12)) * 0.2, CAP_STITCH) for j in range(12)]
for j in range(12):
    k = (j + 1) % 12
    face(part, (hub, patch[j], patch[k]), CAP_BADGE)
    face(part, (patch[j], skirt[j], skirt[k], patch[k]), CAP_STITCH)
finish(part, 'keps', sharp=40.0, strength=0.3, reach=0.35, recalc=False)

# Lovbat: the birch leaf the ghost floats on in the eddy, and the way across once it is pulled up. Dry and
# curled, its middle highest: he walks along its rib. 2.9 long towards +X, its rib 0.3 over the origin.
BOAT = tone('#e8b63a')
BOAT_VEIN = tone('#b98524')
BOAT_EDGE = tone('#b9722a')
part = new_part()
LONG = 16
WIDE = 4
for upper in (True, False):
    rows = []
    for i in range(LONG + 1):
        u = i / LONG
        tooth = 1.0 if i % 2 == 1 else 0.86
        half = 0.98 * math.sin(math.pi * u ** 0.6) ** 0.8 * (1.0 - u) ** 0.22 * tooth
        row = []
        for j in range(WIDE + 1):
            v = j / WIDE * 2.0 - 1.0
            x = 2.95 * (u - 0.5) + 0.2 * abs(v) * half
            high = 0.3 - 0.27 * abs(v) ** 1.7 * (0.35 + 0.65 * half) - 0.05 * (2.0 * u - 1.0) ** 2 * (1.0 - abs(v))
            colour = blend(BOAT, BOAT_EDGE, max(0.0, abs(v) - 0.6) * 1.6 + 0.25 * rnd(i, j))
            if i % 2 == 1 or j == WIDE // 2:
                colour = blend(colour, BOAT_VEIN, 0.7 if j == WIDE // 2 else 0.4)
            row.append(put(part, Vector((x, v * half, high - (0.0 if upper else 0.02))), colour if upper else lit(colour, 0.6)))
        rows.append(row)
    for i in range(LONG):
        for j in range(WIDE):
            quad = (rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1])
            face(part, quad if upper else quad[::-1])
tube(part, [Vector((-1.47, 0.0, 0.28)), Vector((-1.75, 0.02, 0.33)), Vector((-2.0, 0.0, 0.42))], [0.035, 0.03, 0.022], [BOAT_VEIN, BOAT_VEIN, BOAT_EDGE], 5)
finish(part, 'lovbat', sharp=180.0, strength=0.35, reach=0.3, recalc=False)


def bark_tone(x, y, z, seed):
    grain = noise(x * 2.0 + seed, y * 7.0, z * 7.0)
    return blend(BARK_DARK, BARK_PALE, grain * 1.5 - 0.25)


# Kvist: the spruce twig across the ants' road, which he pulls away. A stem with bark and a broken end, a
# fork with a few needles left, and a stub. 2.4 long along X and 0.5 high; he walks on its top.
part = new_part()
path = []
radii = []
tones = []
for i in range(9):
    t = i / 8.0
    radius = 0.25 - 0.045 * t + 0.02 * math.sin(t * 9.0)
    path.append(Vector((-1.2 + 2.4 * t, 0.03 * math.sin(t * 5.0), 0.5 - radius)))
    radii.append(radius)
    tones.append([bark_tone(-1.2 + 2.4 * t, math.cos(TAU * j / 8), math.sin(TAU * j / 8), 3.0) for j in range(8)])
made = tube(part, path, radii, tones, 8, closed_ends=False)
for ring, at in ((made[0], path[0]), (made[-1], path[-1])):
    hub = put(part, at + Vector((0.03 if ring is made[-1] else -0.03, 0.0, 0.0)), WOOD_HEART)
    inner = [put(part, at + (v.co - at) * 0.72, WOOD) for v in ring]
    for j in range(8):
        k = (j + 1) % 8
        order = (ring[j], ring[k], inner[k], inner[j]) if ring is made[-1] else (ring[k], ring[j], inner[j], inner[k])
        face(part, order)
        face(part, (inner[j], inner[k], hub) if ring is made[-1] else (inner[k], inner[j], hub))
fork = [Vector((0.25, 0.1, 0.34)), Vector((0.55, 0.42, 0.5)), Vector((0.8, 0.8, 0.62)), Vector((0.98, 1.12, 0.66))]
tube(part, fork, [0.11, 0.085, 0.06, 0.035], [BARK, BARK, BARK_PALE, BARK_PALE], 6)
tube(part, [Vector((-0.55, -0.12, 0.3)), Vector((-0.72, -0.4, 0.2)), Vector((-0.8, -0.62, 0.1))], [0.08, 0.06, 0.045], [BARK, BARK, WOOD], 5)
for at, turn, long in ((fork[2], 0.9, 0.42), (fork[3], 0.2, 0.5), (fork[3], 1.5, 0.44), (fork[1], 2.2, 0.36)):
    out = Vector((math.cos(turn), math.sin(turn), 0.12))
    out.normalize()
    spray(part, at, out, long, long * 0.26, 0.12, SPRUCE_DEEP, SPRUCE)
finish(part, 'kvist', sharp=60.0, strength=0.6, reach=0.3, floor=0.0, recalc=False)

# Gungbrada: Pappa's seesaw is a peeled stick, pale, with a knot and a little bark left at its ends.
# 4.4 long along X, with its middle at the origin.
part = new_part()
path = []
radii = []
tones = []
for i in range(12):
    t = i / 11.0
    radius = 0.1 - 0.012 * t + (0.022 if i == 7 else 0.0)
    path.append(Vector((-2.2 + 4.4 * t, 0.0, 0.016 * math.sin(t * 7.0))))
    radii.append(radius)
    peeled = blend(WOOD_PALE, WOOD, 0.5 * rnd(i, 4.0))
    tones.append(BARK if i in (0, 1, 10) else (WOOD_HEART if i == 7 else peeled))
made = tube(part, path, radii, tones, 7, closed_ends=False)
for ring, at, way in ((made[0], path[0], -1.0), (made[-1], path[-1], 1.0)):
    hub = put(part, at + Vector((0.01 * way, 0.0, 0.0)), WOOD_HEART)
    for j in range(7):
        k = (j + 1) % 7
        face(part, (ring[j], ring[k], hub) if way > 0.0 else (ring[k], ring[j], hub), WOOD)
finish(part, 'gungbrada', sharp=60.0, strength=0.4, reach=0.2, recalc=False)

# Gungsten: the stone the stick lies across.
stone('gungsten', (0.42, 0.36, 0.3), 2, 51.0, (((0.2, -0.4, 0.9), 0.8), ((0.9, -0.2, 0.3), 0.8), ((-0.7, -0.6, 0.3), 0.78)), ((0.4, 0.5, 0.3), 0.25), mossy=0.0)

# Vittradorr: a little door under a spruce's roots. Two roots meet in an arch; in it a door of three boards
# with a round top and an iron ring; moss over it, a step of bark, and a slit of warm light under the door.
# It stands on the origin and faces -Y.
ROOT = tone('#5c4836')
ROOT_PALE = tone('#7d6753')
DOOR = (tone('#8a6a40'), tone('#77592f'), tone('#94734a'))
IRON = tone('#34363a')
GLOW = tone('#ffd27a')
DARK = tone('#17110c')
part = new_part()
ARCH = (
    ([(-0.78, -0.22, -0.06), (-0.6, -0.08, 0.2), (-0.47, -0.02, 0.5), (-0.36, 0.0, 0.76), (-0.16, 0.02, 0.98), (0.02, 0.1, 1.1), (0.1, 0.3, 1.4), (0.14, 0.5, 1.9)], [0.13, 0.14, 0.125, 0.115, 0.11, 0.12, 0.15, 0.2]),
    ([(0.82, -0.16, -0.06), (0.62, -0.05, 0.22), (0.49, 0.0, 0.52), (0.38, 0.02, 0.78), (0.17, 0.05, 0.96), (-0.02, 0.14, 1.04), (-0.1, 0.34, 1.34), (-0.12, 0.5, 1.9)], [0.12, 0.13, 0.12, 0.11, 0.105, 0.11, 0.14, 0.19]),
    ([(-0.3, 0.2, 1.2), (-0.7, 0.1, 0.72), (-1.05, 0.02, 0.3), (-1.3, -0.04, -0.05)], [0.13, 0.1, 0.085, 0.06]),
    ([(0.34, 0.24, 1.15), (0.78, 0.16, 0.66), (1.1, 0.1, 0.25), (1.32, 0.06, -0.05)], [0.12, 0.09, 0.075, 0.055]),
)
for points, radii in ARCH:
    path = [Vector(point) for point in points]
    tones = []
    for i in range(len(path)):
        ring = []
        for j in range(7):
            up = math.cos(TAU * (j + 0.5 * (i % 2)) / 7)
            wood = blend(ROOT, ROOT_PALE, noise(path[i].x * 4.0, path[i].z * 4.0, j * 1.7))
            green = max(0.0, up - 0.25) * (0.5 + noise(path[i].x * 3.0, path[i].z * 3.0, 5.0)) * 1.3
            ring.append(blend(wood, blend(MOSS_DEEP, MOSS, 0.6), green))
        tones.append(ring)
    tube(part, path, radii, tones, 7, lean=Vector((0.0, -1.0, 0.0)), twist=0.5)
# The dark of the doorway, the light under the door, and the door's boards with the gaps between them.
BACK = 0.1
EDGES = (-0.31, -0.105, -0.095, 0.095, 0.105, 0.31)


def door_top(x):
    return 0.52 + math.sqrt(max(0.0, 0.31 * 0.31 - x * x)) * 0.92


for a in range(len(EDGES) - 1):
    x0 = EDGES[a]
    x1 = EDGES[a + 1]
    gap = a % 2 == 1
    board = DARK if gap else DOOR[a // 2]
    cuts = 1 if gap else 4
    for c in range(cuts):
        xa = x0 + (x1 - x0) * c / cuts
        xb = x0 + (x1 - x0) * (c + 1) / cuts
        depth = BACK + (0.012 if gap else 0.0)
        low = [put(part, Vector((xa, depth, 0.045)), lit(board, 0.8)), put(part, Vector((xb, depth, 0.045)), lit(board, 0.8))]
        high = [put(part, Vector((xa, depth, door_top(xa))), board), put(part, Vector((xb, depth, door_top(xb))), board)]
        face(part, (low[0], low[1], high[1], high[0]))
slit = [put(part, Vector((x, BACK - 0.004, z)), GLOW) for x, z in ((-0.31, 0.0), (0.31, 0.0), (0.31, 0.05), (-0.31, 0.05))]
face(part, slit, GLOW)
hollow = [put(part, Vector((x, BACK + 0.05, z)), DARK) for x, z in ((-0.6, -0.05), (0.6, -0.05), (0.6, 0.7), (0.3, 1.02), (-0.3, 1.02), (-0.6, 0.7))]
face(part, hollow, DARK)
# Two iron bands across the boards, and the ring to pull.
for z in (0.2, 0.52):
    band = [put(part, Vector((x, BACK - 0.012, zz)), IRON) for x, zz in ((-0.3, z), (0.3, z), (0.3, z + 0.045), (-0.3, z + 0.045))]
    face(part, band, IRON)
ring_at = Vector((0.17, BACK - 0.03, 0.38))
inner = [put(part, ring_at + Vector((math.cos(TAU * j / 8) * 0.04, 0.0, math.sin(TAU * j / 8) * 0.04)), IRON) for j in range(8)]
outer = [put(part, ring_at + Vector((math.cos(TAU * j / 8) * 0.068, 0.0, math.sin(TAU * j / 8) * 0.068)), lit(IRON, 1.5)) for j in range(8)]
for j in range(8):
    k = (j + 1) % 8
    face(part, (inner[j], outer[j], outer[k], inner[k]))
# Moss over the arch, and the step.
for at, size in (((-0.1, 0.02, 1.16), (0.3, 0.2, 0.11)), ((0.26, 0.06, 1.08), (0.22, 0.17, 0.09)), ((-0.42, 0.0, 0.92), (0.17, 0.15, 0.08)), ((0.02, 0.2, 1.3), (0.26, 0.2, 0.12))):
    for vert in lump(part, at, size, 1, MOSS):
        part['paint'][vert] = blend(MOSS_DEEP, MOSS_BRIGHT, (vert.co.z - at[2]) / size[2] * 0.5 + 0.5)
for vert in lump(part, (0.02, -0.2, 0.0), (0.36, 0.17, 0.045), 1, BARK):
    part['paint'][vert] = blend(BARK_DARK, BARK_PALE, noise(vert.co.x * 9.0, vert.co.y * 9.0, 1.0))
finish(part, 'vittradorr', sharp=50.0, strength=0.7, reach=0.3, floor=0.0, recalc=False)

# Skagglav: beard lichen, hanging in strands of different lengths. It hangs from the origin, 1 long.
BEARD = tone('#a9b596')
BEARD_PALE = tone('#cfd8c0')
part = new_part()
STRANDS = ((0.0, 0.0, 1.0, 0.04), (0.09, 0.03, 0.82, 0.032), (-0.08, 0.04, 0.9, 0.035), (0.04, -0.07, 0.7, 0.03), (-0.05, -0.05, 0.96, 0.034), (0.13, -0.03, 0.56, 0.026), (-0.13, 0.0, 0.64, 0.028))
for n in range(len(STRANDS)):
    x, y, long, thick = STRANDS[n]
    path = []
    radii = []
    tones = []
    for i in range(6):
        t = i / 5.0
        path.append(Vector((x + 0.035 * math.sin(t * 6.0 + n * 2.0) * t, y + 0.03 * math.cos(t * 5.0 + n) * t, -long * t)))
        radii.append(thick * (1.0 - 0.75 * t))
        tones.append(blend(BEARD, BEARD_PALE, t * 0.8 + 0.2 * rnd(n, i)))
    tube(part, path, radii, tones, 3)
finish(part, 'skagglav', sharp=180.0, strength=0.3, reach=0.1)

# Rot: a length of root to climb, gnarled, with knobs. It hangs from the origin, 2 long, and is the same at
# both ends, so that lengths of it join.
part = new_part()
path = []
radii = []
tones = []
for i in range(11):
    t = i / 10.0
    meet = math.sin(math.pi * t)
    path.append(Vector((0.05 * math.sin(t * TAU) * meet, 0.035 * math.sin(t * TAU * 2.0) * meet, -2.0 * t)))
    radii.append(0.13 * (1.0 + 0.3 * meet * (noise(t * 6.0, 2.0, 7.0) - 0.4) + (0.28 if i in (3, 7) else 0.0)))
    tones.append([blend(ROOT, ROOT_PALE, noise(t * 9.0, j * 1.3, 3.0) * 1.2) for j in range(7)])
tube(part, path, radii, tones, 7, closed_ends=False, lean=Vector((0.0, -1.0, 0.0)), twist=0.0)
finish(part, 'rot', sharp=180.0, strength=0.45, reach=0.2, recalc=False)


# --- the landmarks ---------------------------------------------------------------------------------------------
# Each stands over a block of the chapter's ground (src/content/chapters/granskog.ts, `landmarks`), with its
# origin at the block's left end, on the ground at the block's foot, on the path: X runs along the path, Z is
# up and -Y is towards the camera. Where he walks (0.3 behind the path to 0.45 in front of it) its top is the
# block's top, a finger over it at most, so that his feet stand on it.
#
# The ground under a landmark is still drawn as a raised bank of moss, whose top slopes on towards the camera
# for some four lengths (src/render/dressing/ground.ts, PROFILE_FOREST). So each landmark is wide towards the
# camera, and lies over that slope: seen from the path's side, as the game sees it, it has the height and the
# outline of the thing itself.

# Jattekotte: the cone as big as a car, lying along the path, half sunk in the moss. The block is 3.5 long
# and 1.2 high. Its scales are set out as the small cone's, in spirals of 13 and 21; only those that can be
# seen are built.
GIANT = [(0.0, 0.03), (0.03, 0.07), (0.0625, 0.093), (0.2, 0.104), (0.4, 0.106), (0.7, 0.102), (0.9, 0.092), (0.9375, 0.086), (0.975, 0.06), (1.0, 0.02)]
GIANT_LONG = 4.0
GIANT_UP = 2.12
GIANT_DEEP = 4.48
GIANT_TOP = 1.21
GIANT_LIFT = 0.006
bend = []
for i in range(21):
    s = i / 20.0
    held = min(0.9375, max(0.0625, s))
    # Its top is level from one end of the block to the other: where it is thinner, its middle lies higher.
    bend.append((s, -(GIANT_TOP - GIANT_UP * (along(GIANT, held) * GIANT_LONG + 0.6 * GIANT_LIFT * GIANT_LONG))))
part = new_part()
cone(part, 600, 'dense', GIANT_LONG, GIANT_LIFT, Matrix.Translation((-0.25, -0.2, 0.0)) @ ALONG_X, body=GIANT, sides=16,
     squash=(GIANT_UP, GIANT_DEEP), axis=bend, shown=(2.5, 5.3), mossy=(2.5, 2.95))
# The moss it is sunk in: hummocks as big as boulders in front of it, lower than the path, where the ground
# under it comes forward. Each: its middle, and how far it reaches along the path, towards the camera and up.
HUMMOCKS = (
    ((1.75, -2.95, -0.82), (1.25, 1.1, 0.95)), ((0.85, -2.3, -0.45), (0.8, 0.7, 0.62)), ((2.75, -2.4, -0.48), (0.85, 0.74, 0.64)),
    ((1.9, -3.75, -1.45), (1.0, 0.8, 0.8)), ((0.3, -1.75, -0.3), (0.56, 0.5, 0.42)), ((3.3, -1.8, -0.32), (0.56, 0.5, 0.43)),
)
for at, size in HUMMOCKS:
    for vert in lump(part, at, size, 2, MOSS):
        way = vert.co - Vector(at)
        swell = 0.9 + 0.22 * noise(vert.co.x * 1.6, vert.co.y * 1.6, vert.co.z * 1.6)
        vert.co = Vector(at) + way * swell
        high = way.z / size[2]
        green = blend(MOSS_DEEP, MOSS_BRIGHT, 0.25 + 0.5 * high + 0.5 * (noise(vert.co.x * 2.4, vert.co.y * 2.4, 3.0) - 0.5))
        part['paint'][vert] = lit(green, 0.62 + 0.22 * max(0.0, high))
finish(part, 'jattekotte', sharp=50.0, strength=0.6, reach=0.3, recalc=False)

# Stock: the fallen spruce he nearly catches the ghost on. The block is 5 long and 0.8 high. Bark in plates
# with dark furrows between them, moss along its top, four broken boughs, a broken root end and a torn end.
part = new_part()
LOG_FROM = -0.25
LOG_TO = 5.05
LOG_DEEP = 1.9
LOG_HIGH = 0.62
LOG_AXIS = (-0.2, 0.2)
ALONG_LOG = 44
# Round it from under its front to the back of its top: more rows where the bark shows, fewer in the moss.
ROUND_LOG = (-42.0, -28.0, -15.0, -4.0, 6.0, 15.0, 24.0, 33.0, 42.0, 51.0, 60.0, 70.0, 82.0, 94.0, 106.0, 120.0, 135.0)
GREY_LICHEN = tone('#9aa08e')
rings = []
tones = []
for i in range(ALONG_LOG + 1):
    x = LOG_FROM + (LOG_TO - LOG_FROM) * i / ALONG_LOG
    ring = []
    shades = []
    for j in range(len(ROUND_LOG)):
        angle = math.radians(ROUND_LOG[j])
        up = math.sin(angle)
        # Plates of bark, longer along the trunk than round it, with a furrow where two meet.
        plate = abs(noise(x * 0.75 + 3.0 + angle * 0.9, angle * 12.0 + 0.25 * math.sin(x * 2.7), 0.5) - 0.5) * 2.0
        furrow = max(0.0, 1.0 - plate / 0.2)
        moss = max(0.0, min(1.0, (up - 0.8) / 0.14)) * min(1.0, 0.5 + 0.9 * noise(x * 1.3, angle * 2.0, 5.0))
        swell = 1.0 + (0.035 - 0.085 * furrow + (noise(x * 5.0, angle * 14.0, 2.0) - 0.5) * 0.05) * (1.0 - moss) + moss * 0.025
        thick = 1.05 - 0.09 * i / ALONG_LOG
        ring.append(Vector((x, LOG_AXIS[0] - LOG_DEEP * thick * swell * math.cos(angle), LOG_AXIS[1] + LOG_HIGH * swell * up)))
        bark = blend(BARK, BARK_PALE, noise(x * 1.2 + angle, angle * 11.0, 7.0) * 1.4 - 0.2)
        bark = blend(bark, GREY_LICHEN, max(0.0, noise(x * 0.9 + 5.0, angle * 3.0, 1.0) - 0.66) * 1.6)
        bark = blend(bark, BARK_DARK, furrow * 0.9)
        green = blend(MOSS_DEEP, MOSS_BRIGHT, noise(x * 2.3, angle * 5.0, 9.0))
        shades.append(blend(bark, green, moss))
    rings.append(ring)
    tones.append(shades)
made = skin(part, rings, tones, closed=False, flip=True)
LAST = len(ROUND_LOG) - 1
middle = Vector((0.0, LOG_AXIS[0], LOG_AXIS[1]))
# The root end: broken across, pale wood with a darker heart.
ring = made[0]
hub = put(part, middle + Vector((LOG_FROM - 0.06, 0.0, 0.1)), WOOD_HEART)
inner = [put(part, v.co + (middle + Vector((LOG_FROM - 0.03, 0.0, 0.0)) - v.co) * 0.5, blend(WOOD, WOOD_HEART, 0.4)) for v in ring]
for j in range(LAST):
    face(part, (inner[j], ring[j], ring[j + 1], inner[j + 1]), blend(WOOD, WOOD_PALE, rnd(j, 6.0)))
    face(part, (hub, inner[j], inner[j + 1]))
# The torn end: long splinters of pale wood.
ring = made[-1]
hub = put(part, middle + Vector((LOG_TO - 0.12, 0.0, 0.1)), WOOD_HEART)
for j in range(LAST):
    between = (ring[j].co + ring[j + 1].co) / 2.0
    point = between + (middle + Vector((LOG_TO, 0.0, 0.0)) - between) * (0.25 + 0.3 * rnd(j, 8.0)) + Vector((0.1 + 0.24 * rnd(j, 9.0), 0.0, 0.0))
    splinter = put(part, point, WOOD_PALE)
    face(part, (ring[j + 1], ring[j], splinter), blend(WOOD, WOOD_PALE, rnd(j, 10.0)))
    face(part, (hub, ring[j + 1], ring[j]), blend(WOOD_HEART, WOOD, 0.4))
# The boughs that broke when it fell, standing from its back, each with a splintered end.
for x, lean, back, long, thick in ((0.9, -0.35, 0.5, 0.95, 0.1), (2.2, 0.3, 0.75, 0.55, 0.085), (3.3, -0.15, 0.35, 1.25, 0.11), (4.4, 0.4, 0.6, 0.7, 0.08)):
    angle = math.radians(116.0)
    root = Vector((x, LOG_AXIS[0] - LOG_DEEP * math.cos(angle) * 0.9, LOG_AXIS[1] + LOG_HIGH * math.sin(angle) * 0.85))
    way = Vector((lean, back, 0.8))
    way.normalize()
    bent = way + Vector((lean * 0.3, 0.1, 0.0))
    tube(part, [root, root + way * (long * 0.5), root + bent * (long * 0.9), root + bent * long + Vector((0.03, 0.0, 0.05))],
         [thick * 1.3, thick, thick * 0.8, thick * 0.3], [BARK_DARK, BARK, BARK_PALE, WOOD_PALE], 6)
finish(part, 'stock', sharp=55.0, strength=0.5, reach=0.3, recalc=False)

# Virvelsten: the stone he stands on to pull the ghost out of the eddy. The block is 2.4 long and 0.5 high,
# and to its right the eddy goes down: a slab of granite, flat where he stands, dark and wet at the water.
WET = tone('#3f4747')
part = new_part()
SLAB_AT = Vector((1.2, -0.1, -0.93))
SLAB = (1.62, 2.7, 1.75)
# The planes that cut it: its flat top, the slope of its front, its two sides, and four breaks.
SLAB_CUTS = (
    ((0.0, 0.0, 1.0), 0.52), ((0.0, -0.2, 1.0), 0.70), ((-1.0, 0.0, 0.1), 0.06), ((1.0, 0.0, 0.04), 2.46),
    ((0.5, -0.8, 0.35), 2.45), ((-0.55, -0.75, 0.36), 1.3), ((0.1, -1.0, 0.25), 2.3), ((-0.2, 0.9, 0.5), 1.25),
)
for vert in lump(part, (0.0, 0.0, 0.0), (1.0, 1.0, 1.0), 3, GRANITE):
    way = vert.co.copy()
    far = (abs(way.x / SLAB[0]) ** 3.2 + abs(way.y / SLAB[1]) ** 3.2 + abs(way.z / SLAB[2]) ** 3.2) ** (-1.0 / 3.2)
    at = SLAB_AT + way * (far * (0.95 + 0.1 * noise(way.x * 2.0 + 7.0, way.y * 2.0, way.z * 2.0)))
    for normal, limit in SLAB_CUTS:
        n = Vector(normal)
        long = n.length
        over = at.dot(n) / long - limit / long
        if over > 0.0:
            at = at - n * (over / long)
    vert.co = at
    grain = noise(at.x * 3.0, at.y * 3.0, at.z * 3.0)
    colour = blend(GRANITE_DARK, GRANITE_PALE, grain * 1.4 - 0.15)
    patch = noise(at.x * 1.7 + 4.0, at.y * 1.7, at.z * 1.7 + 2.0)
    if patch > 0.55:
        colour = blend(colour, LICHEN_PALE, (patch - 0.55) * 6.0)
    gold = noise(at.x * 2.4 + 9.0, at.y * 2.4 + 1.0, at.z * 2.4)
    if gold > 0.68:
        colour = blend(colour, LICHEN_GOLD, (gold - 0.68) * 5.0)
    crack = abs(at.x * 0.8 + at.y * 0.3 - 0.55 + 0.1 * math.sin(at.z * 4.0))
    colour = blend(colour, CRACK, max(0.0, 1.0 - crack / 0.09) * 0.8)
    # Moss comes in over its top from behind, and the water darkens its foot.
    green = (at.y - 0.25 + (noise(at.x * 2.0, at.y * 2.0, 1.0) - 0.5) * 0.9) * 2.5 if at.z > 0.45 else 0.0
    colour = blend(colour, blend(MOSS_DEEP, MOSS_BRIGHT, noise(at.x * 3.0, at.y * 3.0, 4.0)), green)
    colour = blend(colour, WET, (-0.55 - at.z) / 0.5)
    part['paint'][vert] = colour
finish(part, 'virvelsten', sharp=30.0, strength=0.6, reach=0.6)

# Myrstack: the anthill, a mound of spruce needles as high as six of him, with twigs in it and the ants'
# holes. The block is 6 long and 6 high: its top is level and its two sides are steep where he walks, towards
# the camera it is a dome, and behind where he walks the mound goes on up to its crown.
NEEDLE = (tone('#38312a'), tone('#483e33'), tone('#5a4e40'), tone('#6a5c4a'))
STROKE = (tone('#84704f'), tone('#9c8a66'), tone('#b9a884'), tone('#28221c'), tone('#6a5a44'), tone('#8a5a30'), tone('#4a3f33'))
STRAW = tone('#b79a66')
HOLE = tone('#1a100a')
HILL_TOP = 6.03
HILL_HALF = 3.06
HILL_FRONT = 6.0
HILL_AT = Vector((3.0, -0.5, 0.0))
SPOKES = 24
DOWN = 12
# The mound behind: where its crown stands, how high, and how far it reaches to the left, right, front and back.
MOUND_AT = Vector((2.6, 5.2, 0.0))
MOUND_TOP = 7.6
MOUND = (4.9, 3.5, 4.6, 5.6)
ROUND_MOUND = 22
DOWN_MOUND = 7


def hill_at(spoke, row):
    """A point of the dome: `spoke` from its left side (0) round its front to its right, `row` down from its crown."""
    angle = math.pi * spoke / SPOKES
    reach = 1.0 / math.sqrt((math.cos(angle) / HILL_HALF) ** 2 + (math.sin(angle) / HILL_FRONT) ** 2)
    # Steep as a wall at its two sides, where the path's own walls are, and round between them.
    power = 2.0 / (2.6 + 37.4 * abs(math.cos(angle)) ** 10)
    turn = (math.pi / 2.0) * (1.0 - row / DOWN) ** 0.85
    out = reach * math.cos(turn) ** power
    high = HILL_TOP * math.sin(turn) ** power
    return HILL_AT + Vector((-math.cos(angle) * out, -math.sin(angle) * out, high))


def mound_at(spoke, row):
    """A point of the mound behind: `spoke` round it, `row` down from its crown."""
    angle = TAU * spoke / ROUND_MOUND
    c = math.cos(angle)
    d = math.sin(angle)
    reach = 1.0 / math.sqrt((c / (MOUND[1] if c > 0.0 else MOUND[0])) ** 2 + (d / (MOUND[3] if d > 0.0 else MOUND[2])) ** 2)
    turn = (math.pi / 2.0) * (1.0 - row / DOWN_MOUND) ** 0.9
    out = reach * math.cos(turn) ** (2.0 / 2.3)
    high = MOUND_TOP * math.sin(turn) ** (2.0 / 2.3)
    bump = 1.0 + (noise(c * 2.0 + 5.0, d * 2.0, row * 0.7) - 0.5) * 0.12
    return MOUND_AT + Vector((c * out * bump, d * out * bump, high))


def needles(at, steep):
    """The colour of the mound at a place: rust needles, a straw here and there, and the dark of a hole."""
    n = noise(at.x * 1.9, at.y * 1.9, at.z * 1.9) * 0.6 + noise(at.x * 5.3, at.y * 5.3, at.z * 5.3) * 0.4
    k = min(2.999, max(0.0, n * 4.2 - 0.6))
    colour = blend(NEEDLE[int(k)], NEEDLE[int(k) + 1], k - int(k))
    if noise(at.x * 7.0 + 3.0, at.y * 7.0, at.z * 7.0) > 0.78:
        colour = blend(colour, STRAW, 0.5)
    if steep and noise(at.x * 2.7 + 11.0, at.y * 2.7, at.z * 2.7 + 5.0) > 0.8:
        colour = blend(colour, HOLE, 0.85)
    return colour


def sliver(part, at, toward, out, n, over=0.03):
    """A loose needle lying on the mound, turned any way, paler or darker than what is under it."""
    way = toward - at
    way = way - out * way.dot(out)
    if way.length < 0.001:
        return
    way.normalize()
    side = out.cross(way)
    turn = TAU * rnd(n, 61.0)
    way = way * math.cos(turn) + side * math.sin(turn)
    side = out.cross(way)
    long = 0.2 + 0.3 * rnd(n, 67.0)
    colour = STROKE[int(rnd(n, 71.0) * len(STROKE)) % len(STROKE)]
    a = put(part, at - way * (long / 2.0) + out * over, colour)
    b = put(part, at + way * (long / 2.0) + out * over, colour)
    c = put(part, at + side * 0.035 + out * (over * 1.6), lit(colour, 1.15))
    face(part, (a, b, c))


part = new_part()
crown = put(part, HILL_AT + Vector((0.0, 0.0, HILL_TOP)), needles(HILL_AT + Vector((0.0, 0.0, HILL_TOP)), False))
grid = []
for a in range(SPOKES + 1):
    column = []
    for r in range(1, DOWN + 1):
        at = hill_at(a, r)
        steep = at.z < HILL_TOP - 0.3
        if steep and 0 < a < SPOKES:
            middle = Vector((HILL_AT.x, HILL_AT.y, at.z * 0.6))
            bulge = at - middle
            bulge.normalize()
            at = at + bulge * ((noise(at.x * 0.9, at.y * 0.9, at.z * 0.9) - 0.5) * 0.3 * math.sin(math.pi * a / SPOKES))
        column.append(put(part, at, needles(at, steep)))
    # Its foot goes on down into the ground in front of it, which falls away towards the camera.
    foot = hill_at(a, DOWN)
    column.append(put(part, Vector((foot.x + (HILL_AT.x - foot.x) * 0.04, foot.y, -3.4)), lit(NEEDLE[0], 0.7)))
    grid.append(column)
for a in range(SPOKES):
    face(part, (crown, grid[a][0], grid[a + 1][0]))
    for r in range(DOWN):
        face(part, (grid[a][r], grid[a][r + 1], grid[a + 1][r + 1], grid[a + 1][r]))
# Behind the dome it is the same top and the same two sides, for as far back as he can stand.
BACK = 1.4
for a, left in ((0, True), (SPOKES, False)):
    near = [crown] + grid[a]
    far = []
    for v in near:
        at = v.co + Vector((0.0, BACK, 0.0))
        far.append(put(part, at, needles(at, True)))
    for r in range(len(near) - 1):
        quad = (near[r], far[r], far[r + 1], near[r + 1])
        face(part, quad if left else quad[::-1])
# The mound behind, with its foot in the ground.
summit = put(part, MOUND_AT + Vector((0.0, 0.0, MOUND_TOP)), needles(MOUND_AT + Vector((0.0, 0.0, MOUND_TOP)), False))
round_it = []
for a in range(ROUND_MOUND):
    column = []
    for r in range(1, DOWN_MOUND + 1):
        at = mound_at(a, r)
        column.append(put(part, at, needles(at, True)))
    foot = mound_at(a, DOWN_MOUND)
    column.append(put(part, Vector((foot.x, foot.y, -0.6)), lit(NEEDLE[0], 0.7)))
    round_it.append(column)
for a in range(ROUND_MOUND):
    b = (a + 1) % ROUND_MOUND
    face(part, (summit, round_it[a][0], round_it[b][0]))
    for r in range(DOWN_MOUND):
        face(part, (round_it[a][r], round_it[a][r + 1], round_it[b][r + 1], round_it[b][r]))
# Loose needles: on the dome, on its two sides, and on the mound behind.
for n in range(620):
    spoke = 0.6 + 22.8 * rnd(n, 41.0)
    row = 1.2 + 10.5 * rnd(n, 43.0) ** 0.8
    at = hill_at(spoke, row)
    out = at - Vector((HILL_AT.x, HILL_AT.y, at.z * 0.5))
    level = at.z > HILL_TOP - 0.2
    if level:
        out = Vector((0.0, 0.0, 1.0))
    out.normalize()
    # Where he walks they lie flat on it: his feet stand on the mound, not over it.
    sliver(part, at, hill_at(spoke + 0.4, row + 0.3), out, n, 0.006 if level else 0.03)
for n in range(260):
    left = n % 2 == 0
    at = Vector((HILL_AT.x + (-HILL_HALF if left else HILL_HALF), HILL_AT.y + BACK * rnd(n, 73.0), 0.2 + 5.6 * rnd(n, 79.0)))
    sliver(part, at, at + Vector((0.0, 0.3, 0.3)), Vector((-1.0 if left else 1.0, 0.0, 0.0)), n + 700)
for n in range(240):
    spoke = ROUND_MOUND * rnd(n, 83.0)
    row = 0.6 + 6.0 * rnd(n, 89.0) ** 0.8
    at = mound_at(spoke, row)
    out = at - Vector((MOUND_AT.x, MOUND_AT.y, at.z * 0.5))
    out.normalize()
    sliver(part, at, mound_at(spoke + 0.4, row + 0.3), out, n + 1000)
# Twigs the ants have carried there.
TWIG = (tone('#9c8a70'), tone('#6a5038'), tone('#b9a584'))
for n in range(18):
    spoke = 3.0 + 18.0 * rnd(n, 41.0)
    row = 2.5 + 8.5 * rnd(n, 43.0)
    at = hill_at(spoke, row)
    ahead = hill_at(spoke + 0.6, row + 0.5 * (rnd(n, 47.0) - 0.5) * 4.0) - at
    ahead.normalize()
    out = at - Vector((HILL_AT.x, HILL_AT.y, at.z * 0.5))
    out.normalize()
    long = 0.5 + 0.7 * rnd(n, 53.0)
    tube(part, [at - ahead * (long / 2.0) + out * 0.05, at + ahead * (long / 2.0) + out * 0.11], [0.04, 0.026], [TWIG[n % 3], TWIG[(n + 1) % 3]], 3)
finish(part, 'myrstack', sharp=70.0, strength=0.4, reach=0.9, recalc=False)

# KIT-PARTS-END


# --- the shade of each thing's own creases, and of the ground under it, baked into its colours --------------

scene = bpy.context.scene
before = scene.render.engine
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    pass
shaded = 0
if scene.render.engine == 'CYCLES':
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 32
    things = [made for made in scene.objects if made.type == 'MESH']
    bpy.ops.mesh.primitive_plane_add(size=80.0)
    ground = bpy.context.object
    ground.name = 'bake-ground'
    # Each is shaded alone: the others stand aside while it is baked.
    for made in things:
        made.hide_render = True
    for made in things:
        strength = made['shade']
        if strength <= 0.0:
            continue
        mesh = made.data
        # One shade for each point, so that a smooth thing stays smooth: its corners agree where they meet.
        occlusion = mesh.color_attributes.new('occlusion', 'FLOAT_COLOR', 'POINT')
        mesh.color_attributes.active_color = occlusion
        made.hide_render = False
        ground.hide_render = made['floor'] < -999.0
        ground.location = (0.0, 0.0, made['floor'])
        if scene.world is not None:
            scene.world.light_settings.distance = made['reach']
        bpy.ops.object.select_all(action='DESELECT')
        made.select_set(True)
        bpy.context.view_layer.objects.active = made
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        made.hide_render = True
        occlusion = mesh.color_attributes['occlusion']
        colour = mesh.color_attributes['Color']
        for i in range(len(colour.data)):
            light = occlusion.data[mesh.loops[i].vertex_index].color[0]
            k = 1.0 - strength * (1.0 - min(1.0, light) ** 0.8)
            c = colour.data[i].color
            colour.data[i].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)
        mesh.color_attributes.remove(mesh.color_attributes['occlusion'])
        mesh.color_attributes.active_color = mesh.color_attributes['Color']
        shaded += 1
    for made in things:
        made.hide_render = False
    bpy.data.objects.remove(ground, do_unlink=True)
try:
    scene.render.engine = before
except TypeError:
    pass

total = 0
for made in scene.objects:
    if made.type == 'MESH':
        del made['shade']
        del made['reach']
        del made['floor']
        made.data.color_attributes.render_color_index = 0
        made.data.color_attributes.active_color_index = 0
        made.data.calc_loop_triangles()
        total += len(made.data.loop_triangles)
        print('  ', made.name, len(made.data.loop_triangles), 'triangles,', len(made.data.vertices), 'points')
print('forest kit built:', len(scene.objects), 'things,', total, 'triangles,', shaded, 'shaded')
