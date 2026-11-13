"""The birds of the near forest and the sky over it (the creature overhaul, 13 November 2026): a great tit, a blue tit,
a house sparrow, a song thrush, a white wagtail, a magpie and a jackdaw, which hop and peck behind the path and lift as
he comes; and a raven and a hooded crow, which circle high over the place. Sent to Blender after kit-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/birds.py --out=art/baked/boot/birds.glb
A name in ONLY ('tit', 'raven', ...) builds that bird alone.

They are moved in the game's vertex stage (src/render/lift/fauna/bird-kit.ts), because a flock is many: a species is
one instanced mesh there, and each bird moves its wings, tail, head, bill and legs by eight numbers. So each moving part
is a thing of its own here, and says on itself (custom properties, which arrive as userData) which bird it is part of
(`creature` 'bird', `species`), how it moves (`rig`: body, head, jaw, wing, tail, legs), its side (`side`: +1 the near
side, towards the camera, which is Blender's -Y; -1 the far side), where it turns (`pivot`: the neck, the shoulder, the
tail's root, the hips; and `joint`: a wing's wrist, the bill's hinge), and how far the bird's body is tipped up at rest
(`tilt`, in radians: the game levels it in flight).

A wing is built spread, and each of its corners also knows where it lies when the wing is folded on the bird's flank
(the attribute _FOLD, how far it moves to get there) and how much of the hand it is (_BEND x: the part beyond the
wrist, which bends there). A tail's corners know how far out to the side they are (_BEND y), to fan it. The game moves
a wing between folded and spread about the shoulder, so that it keeps its length as it opens.

Every bird faces +X. A small bird stands with its feet at the origin, on the generic bird's scale (the game makes each
species its own size: BIRDS in src/render/lift/fauna/shapes.ts); a raven or a crow flies with its middle at the origin.
Z is up. Units are EL. Nothing here comes from anyone else; every shape and colour is made from the numbers below.
Keep this file in plain ASCII.
"""

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)

X = Vector((1.0, 0.0, 0.0))
Y = Vector((0.0, 1.0, 0.0))
Z = Vector((0.0, 0.0, 1.0))


def wanted(name):
    return ONLY is None or ONLY == name


def clamp01(t):
    return max(0.0, min(1.0, t))


def sstep(a, b, x):
    t = clamp01((x - a) / (b - a))
    return t * t * (3.0 - 2.0 * t)


def lerp(a, b, t):
    return a + (b - a) * t


def mask(p, centre, radii, soft=0.35):
    """1 inside an ellipsoid round `centre` (given for the far side, +Y, and mirrored: |y|), 0 outside, soft at its
    edge."""
    d = math.sqrt(((p.x - centre[0]) / radii[0]) ** 2 + ((abs(p.y) - centre[1]) / radii[1]) ** 2 + ((p.z - centre[2]) / radii[2]) ** 2)
    return clamp01((1.0 + soft - d) / (2.0 * soft))


# --- a part being built: its points, their colours, where each lies folded, and how it bends -------------------------

def bird_part():
    part = new_part()
    part['fold'] = {}
    part['bend'] = {}
    return part


def pt(part, at, colour, fold=None, bend=(0.0, 0.0, 0.0)):
    made = put(part, at, colour)
    part['fold'][made] = Vector(fold) if fold is not None else None
    part['bend'][made] = bend
    return made


def moved(part, matrix):
    """Moves a part's points, and where they lie folded, by a matrix."""
    for vert in part['bm'].verts:
        vert.co = matrix @ vert.co
        f = part['fold'].get(vert)
        if f is not None:
            part['fold'][vert] = matrix @ f


def done(part, name, species, rig, side=0.0, pivot=(0.0, 0.0, 0.0), joint=(0.0, 0.0, 0.0), tilt=0.0, shade=0.45, reach=0.06, sharp=60.0, leaf=False, recalc=True, floor=None):
    """Finishes a part: the object, its two attributes, and what it says on itself."""
    bm = part['bm']
    bm.verts.index_update()
    folds = [None] * len(bm.verts)
    bends = [None] * len(bm.verts)
    for vert in bm.verts:
        f = part['fold'].get(vert)
        folds[vert.index] = (f - vert.co) if f is not None else Vector((0.0, 0.0, 0.0))
        bends[vert.index] = part['bend'].get(vert, (0.0, 0.0, 0.0))
    made = finish(part, name, sharp=sharp, strength=shade, reach=reach, floor=floor, recalc=recalc, leaf=leaf)
    mesh = made.data
    fold = mesh.attributes.new('_FOLD', 'FLOAT_VECTOR', 'POINT')
    bend = mesh.attributes.new('_BEND', 'FLOAT_VECTOR', 'POINT')
    for i in range(len(mesh.vertices)):
        fold.data[i].vector = folds[i]
        bend.data[i].vector = bends[i]
    made['creature'] = 'bird'
    made['species'] = species
    made['rig'] = rig
    made['side'] = float(side)
    made['pivot'] = [float(pivot[0]), float(pivot[1]), float(pivot[2])]
    made['joint'] = [float(joint[0]), float(joint[1]), float(joint[2])]
    made['tilt'] = float(tilt)
    return made


def loft(part, rows, sides, paint, close=True):
    """A body along X from rows of (x, z, half width across Y, half height in Z), each point in its colour (`paint`
    of where it is). Both ends close. Gives the rings."""
    rings = []
    for row in rows:
        ring = []
        for j in range(sides):
            a = TAU * j / sides
            ring.append(Vector((row[0], row[2] * math.cos(a), row[1] + row[3] * math.sin(a))))
        rings.append(ring)
    made = []
    for ring in rings:
        made.append([pt(part, p, paint(p)) for p in ring])
    for i in range(len(made) - 1):
        for j in range(sides):
            k = (j + 1) % sides
            face(part, (made[i][j], made[i][k], made[i + 1][k], made[i + 1][j]))
    if close:
        a = Vector((rows[0][0] - 0.004, 0.0, rows[0][1]))
        b = Vector((rows[-1][0] + 0.004, 0.0, rows[-1][1]))
        ta = pt(part, a, paint(a))
        tb = pt(part, b, paint(b))
        for j in range(sides):
            k = (j + 1) % sides
            face(part, (made[0][k], made[0][j], ta))
            face(part, (made[-1][j], made[-1][k], tb))
    return made


def blob(part, centre, size, detail, paint, squash=None):
    """A round lump in its colours: an icosphere pulled into shape, each point painted where it is."""
    ball = bmesh.new()
    bmesh.ops.create_icosphere(ball, subdivisions=detail, radius=1.0, matrix=Matrix.Translation(centre) @ Matrix.Diagonal((size[0], size[1], size[2], 1.0)))
    ball.verts.index_update()
    made = []
    for vert in ball.verts:
        p = vert.co.copy()
        if squash is not None:
            p = squash(p)
        made.append(pt(part, p, paint(p)))
    for side in ball.faces:
        face(part, [made[v.index] for v in side.verts])
    ball.free()
    return made


def tube_pts(part, path, radii, colour, sides=5):
    tube(part, [Vector(p) for p in path], radii, [colour] * len(path), sides)
    for vert in part['bm'].verts:
        if vert not in part['fold']:
            part['fold'][vert] = None
            part['bend'][vert] = (0.0, 0.0, 0.0)


def disc(part, at, normal, along, size, colour, sides=6):
    """A small flat mark on a surface: a spot, a streak. `along` is the way its long side lies."""
    n = Vector(normal).normalized()
    a = Vector(along)
    a = (a - n * a.dot(n)).normalized()
    b = n.cross(a)
    centre = Vector(at) + n * 0.0025
    hub = pt(part, centre, colour)
    ring = [pt(part, centre + a * (size[0] * math.cos(TAU * k / sides)) + b * (size[1] * math.sin(TAU * k / sides)), colour) for k in range(sides)]
    for k in range(sides):
        face(part, (hub, ring[k], ring[(k + 1) % sides]))


# --- the species -------------------------------------------------------------------------------------------------------
# Each in its body's own level frame first, its middle at the origin: the body from the rump (-X) to the breast (+X),
# the head over its front, the wings' roots on the shoulders, the tail out behind. Then the whole bird is tipped up by
# its `tilt` about the middle and lifted onto its legs, which stand on the ground at the origin.
# Colours as in the game ('#rrggbb'), and none of the candy's red, pink or gold: a brown here leans to yellow.

SMALL = {
    'tit': {
        'tilt': 0.42, 'up': 0.36,
        'body': [(-0.25, 0.02, 0.055, 0.05), (-0.22, 0.01, 0.1, 0.095), (-0.15, 0.0, 0.145, 0.14), (-0.06, 0.0, 0.168, 0.162),
                 (0.03, 0.0, 0.172, 0.168), (0.11, 0.01, 0.158, 0.158), (0.17, 0.035, 0.125, 0.128), (0.21, 0.07, 0.085, 0.09)],
        'head': (0.2, 0.12, 0.128), 'bill': (0.08, 0.024, 0.022),
        'wing': {'span': 0.6, 'chord': 0.25, 'wrist': 0.42, 'fold': 0.46, 'tall': 72.0, 'root': (0.07, 0.12, 0.075)},
        'tail': {'root': (-0.21, 0.035), 'long': 0.38, 'w0': 0.045, 'w1': 0.088, 'end': 'notch', 'lift': 0.14},
        'legs': {'hip': (0.01, -0.1), 'long': 0.18, 'colour': '#6c7684'},
        'beak': '#232326',
    },
    'blue': {
        'tilt': 0.4, 'up': 0.34,
        'body': [(-0.23, 0.02, 0.055, 0.05), (-0.2, 0.01, 0.105, 0.1), (-0.13, 0.0, 0.152, 0.148), (-0.04, 0.0, 0.175, 0.17),
                 (0.05, 0.0, 0.178, 0.172), (0.12, 0.015, 0.16, 0.16), (0.18, 0.04, 0.125, 0.128), (0.215, 0.075, 0.085, 0.09)],
        'head': (0.2, 0.13, 0.135), 'bill': (0.062, 0.022, 0.02),
        'wing': {'span': 0.56, 'chord': 0.25, 'wrist': 0.42, 'fold': 0.42, 'tall': 72.0, 'root': (0.07, 0.125, 0.08)},
        'tail': {'root': (-0.19, 0.035), 'long': 0.32, 'w0': 0.045, 'w1': 0.08, 'end': 'notch', 'lift': 0.12},
        'legs': {'hip': (0.01, -0.1), 'long': 0.17, 'colour': '#6a7488'},
        'beak': '#2a2a2e',
    },
    'sparrow': {
        'tilt': 0.32, 'up': 0.34,
        'body': [(-0.26, 0.02, 0.06, 0.05), (-0.22, 0.01, 0.11, 0.1), (-0.15, 0.0, 0.155, 0.145), (-0.06, 0.0, 0.178, 0.165),
                 (0.03, 0.0, 0.182, 0.17), (0.11, 0.01, 0.165, 0.16), (0.17, 0.035, 0.13, 0.13), (0.215, 0.07, 0.09, 0.095)],
        'head': (0.21, 0.12, 0.135), 'bill': (0.075, 0.034, 0.032),
        'wing': {'span': 0.62, 'chord': 0.26, 'wrist': 0.42, 'fold': 0.46, 'tall': 72.0, 'root': (0.07, 0.13, 0.075)},
        'tail': {'root': (-0.22, 0.035), 'long': 0.34, 'w0': 0.05, 'w1': 0.085, 'end': 'notch', 'lift': 0.12},
        'legs': {'hip': (0.01, -0.1), 'long': 0.16, 'colour': '#8a7c6e'},
        'beak': '#2e2a26',
    },
    'thrush': {
        'tilt': 0.55, 'up': 0.4,
        'body': [(-0.25, 0.02, 0.05, 0.05), (-0.21, 0.01, 0.095, 0.095), (-0.14, 0.0, 0.135, 0.135), (-0.05, -0.005, 0.152, 0.155),
                 (0.04, -0.005, 0.155, 0.16), (0.12, 0.005, 0.14, 0.148), (0.18, 0.03, 0.11, 0.118), (0.22, 0.06, 0.075, 0.08)],
        'head': (0.2, 0.11, 0.108), 'bill': (0.1, 0.022, 0.02),
        'wing': {'span': 0.6, 'chord': 0.23, 'wrist': 0.42, 'fold': 0.44, 'tall': 68.0, 'root': (0.07, 0.11, 0.065)},
        'tail': {'root': (-0.21, 0.03), 'long': 0.32, 'w0': 0.042, 'w1': 0.075, 'end': 'square', 'lift': 0.1},
        'legs': {'hip': (0.02, -0.1), 'long': 0.22, 'colour': '#a89a8c'},
        'beak': '#4a4034',
    },
    'wagtail': {
        'tilt': 0.18, 'up': 0.3,
        'body': [(-0.24, 0.02, 0.045, 0.045), (-0.2, 0.01, 0.085, 0.08), (-0.13, 0.0, 0.12, 0.115), (-0.04, 0.0, 0.138, 0.135),
                 (0.05, 0.005, 0.14, 0.138), (0.12, 0.015, 0.125, 0.125), (0.18, 0.04, 0.098, 0.1), (0.22, 0.07, 0.068, 0.072)],
        'head': (0.215, 0.115, 0.1), 'bill': (0.085, 0.018, 0.016),
        'wing': {'span': 0.6, 'chord': 0.22, 'wrist': 0.42, 'fold': 0.42, 'tall': 70.0, 'root': (0.07, 0.1, 0.06)},
        'tail': {'root': (-0.2, 0.03), 'long': 0.6, 'w0': 0.035, 'w1': 0.06, 'end': 'square', 'lift': 0.06},
        'legs': {'hip': (0.01, -0.09), 'long': 0.2, 'colour': '#232326'},
        'beak': '#232326',
    },
    'magpie': {
        'tilt': 0.3, 'up': 0.32,
        'body': [(-0.22, 0.02, 0.05, 0.05), (-0.19, 0.01, 0.085, 0.085), (-0.12, 0.0, 0.118, 0.12), (-0.04, 0.0, 0.132, 0.135),
                 (0.04, 0.0, 0.135, 0.14), (0.11, 0.01, 0.124, 0.13), (0.17, 0.035, 0.1, 0.105), (0.21, 0.065, 0.072, 0.075)],
        'head': (0.2, 0.105, 0.098), 'bill': (0.11, 0.03, 0.03),
        'wing': {'span': 0.52, 'chord': 0.24, 'wrist': 0.42, 'fold': 0.36, 'tall': 64.0, 'root': (0.06, 0.1, 0.07)},
        'tail': {'root': (-0.19, 0.03), 'long': 0.78, 'w0': 0.04, 'w1': 0.075, 'end': 'wedge', 'lift': 0.16},
        'legs': {'hip': (0.01, -0.1), 'long': 0.18, 'colour': '#1d1e21'},
        'beak': '#16171a',
    },
    'jackdaw': {
        'tilt': 0.3, 'up': 0.34,
        'body': [(-0.24, 0.02, 0.055, 0.05), (-0.21, 0.01, 0.1, 0.095), (-0.14, 0.0, 0.14, 0.135), (-0.05, 0.0, 0.158, 0.155),
                 (0.04, 0.0, 0.16, 0.16), (0.12, 0.012, 0.145, 0.148), (0.18, 0.04, 0.115, 0.118), (0.22, 0.072, 0.08, 0.085)],
        'head': (0.215, 0.12, 0.112), 'bill': (0.085, 0.032, 0.03),
        'wing': {'span': 0.62, 'chord': 0.24, 'wrist': 0.42, 'fold': 0.5, 'tall': 72.0, 'root': (0.07, 0.115, 0.075)},
        'tail': {'root': (-0.22, 0.035), 'long': 0.36, 'w0': 0.05, 'w1': 0.085, 'end': 'square', 'lift': 0.1},
        'legs': {'hip': (0.01, -0.1), 'long': 0.19, 'colour': '#1d1e21'},
        'beak': '#1a1b1e',
    },
}


# How each is painted, point by point, in its level frame. `head` is the head's middle and size.

def paint_tit(p, h):
    hx, hz, hr = h
    c = blend(tone('#cbbb5e'), tone('#7d8b52'), sstep(-0.05, 0.06, p.z - 0.25 * p.x))
    c = blend(c, tone('#7a8a98'), mask(p, (-0.2, 0.0, 0.05), (0.08, 0.1, 0.08)))
    # The black tie down the middle of the yellow breast and belly, broadest between the legs.
    tie = mask(p, (0.08, 0.0, -0.06), (0.17, 0.035 + 0.02 * clamp01(-p.x * 3.0), 0.16), 0.3) * sstep(0.05, -0.02, p.z)
    c = blend(c, tone('#1f2125'), tie)
    # The black of the head runs down the throat into the bib.
    c = blend(c, tone('#1f2125'), mask(p, (0.17, 0.0, 0.05), (0.07, 0.08, 0.09)))
    d = p - Vector((hx, 0.0, hz))
    if d.length < hr * 1.35:
        c = blend(c, tone('#1f2125'), sstep(hr * 1.3, hr * 1.1, d.length))
        # White cheeks, and a pale spot on the nape.
        c = blend(c, tone('#eeeee8'), mask(p, (hx + 0.01, hr * 0.78, hz - 0.03), (0.075, 0.08, 0.05), 0.25))
        c = blend(c, tone('#dcdcc4'), mask(p, (hx - hr * 0.95, 0.0, hz + 0.02), (0.03, 0.03, 0.035)))
    return c


def paint_blue(p, h):
    hx, hz, hr = h
    c = blend(tone('#cfc368'), tone('#8c9a58'), sstep(-0.05, 0.06, p.z - 0.25 * p.x))
    c = blend(c, tone('#b8b48a'), mask(p, (0.0, 0.0, -0.12), (0.18, 0.04, 0.06)) * 0.6)
    d = p - Vector((hx, 0.0, hz))
    # A dark blue collar round the neck, and a dark bib under the bill.
    c = blend(c, tone('#2f3d5c'), mask(p, (hx - 0.03, 0.0, hz - 0.08), (0.06, 0.2, 0.05), 0.25) * sstep(hr * 0.75, hr * 1.0, d.length))
    c = blend(c, tone('#25304a'), mask(p, (hx + 0.05, 0.0, hz - 0.1), (0.04, 0.035, 0.04)))
    if d.length < hr * 1.3:
        face_ = sstep(hr * 1.25, hr * 1.05, d.length)
        c = blend(c, tone('#efefea'), face_)
        # The blue cap, the dark stripe through the eye, round to the collar.
        c = blend(c, tone('#4f7ab8'), sstep(hr * 0.32, hr * 0.48, d.z + 0.25 * d.x) * face_)
        # The dark stripe through the eye, back to the nape, and down round the white cheek to the collar.
        stripe = sstep(hr * 0.16, hr * 0.08, abs(d.z + 0.012 - 0.3 * d.x)) * sstep(hr * 0.85, hr * 0.6, d.x) * sstep(hr * 0.2, hr * 0.4, abs(d.y))
        c = blend(c, tone('#25304a'), 0.95 * stripe)
        ring = sstep(hr * 0.2, hr * 0.06, abs(math.hypot(d.x + hr * 0.1, d.z + hr * 0.05) - hr * 0.78)) * sstep(hr * 0.1, hr * 0.4, abs(d.y)) * sstep(hr * 0.2, -hr * 0.2, d.z)
        c = blend(c, tone('#25304a'), 0.9 * ring)
        c = blend(c, tone('#efefea'), mask(p, (hx + hr * 0.9, 0.0, hz + hr * 0.3), (0.025, 0.06, 0.025)))
    return c


def paint_sparrow(p, h):
    hx, hz, hr = h
    c = blend(tone('#c6c3ba'), tone('#86683f'), sstep(-0.04, 0.07, p.z - 0.2 * p.x))
    c = blend(c, tone('#8a8070'), mask(p, (-0.21, 0.0, 0.04), (0.06, 0.09, 0.07)))
    # The black bib, wide on the breast.
    c = blend(c, tone('#26241f'), mask(p, (0.17, 0.0, 0.0), (0.075, 0.07, 0.11), 0.25))
    d = p - Vector((hx, 0.0, hz))
    if d.length < hr * 1.3:
        head_ = sstep(hr * 1.25, hr * 1.05, d.length)
        # A grey crown, a broad chestnut band from the eye back round the nape, pale grey cheeks.
        c = blend(c, tone('#cfcdc6'), head_)
        band = sstep(hr * 0.05, hr * 0.25, d.z + 0.35 * d.x + hr * 0.15) * sstep(hr * 0.2, -hr * 0.1, d.x) * head_
        c = blend(c, tone('#87683f'), band)
        c = blend(c, tone('#8a8e92'), sstep(hr * 0.42, hr * 0.6, d.z + 0.1 * d.x) * head_)
        # Black lores round to the eye, and the black chin and throat, down into the bib.
        c = blend(c, tone('#26241f'), mask(p, (hx + hr * 0.75, hr * 0.5, hz + 0.0), (0.045, 0.05, 0.03)))
        throat = sstep(-hr * 0.1, -hr * 0.4, d.z - 0.3 * d.x) * sstep(-hr * 0.2, hr * 0.2, d.x) * sstep(hr * 0.75, hr * 0.45, abs(d.y))
        c = blend(c, tone('#26241f'), throat)
    return c


def paint_thrush(p, h):
    hx, hz, hr = h
    c = blend(tone('#e6dfcc'), tone('#7d6a4c'), sstep(-0.03, 0.07, p.z - 0.15 * p.x))
    c = blend(c, tone('#d8c8a0'), mask(p, (0.12, 0.05, -0.01), (0.1, 0.12, 0.1)) * sstep(0.06, 0.0, p.z))
    d = p - Vector((hx, 0.0, hz))
    if d.length < hr * 1.3:
        c = blend(c, tone('#a08c6c'), mask(p, (hx, hr * 0.8, hz - 0.03), (0.06, 0.06, 0.04)))
        c = blend(c, tone('#e2dac4'), mask(p, (hx + 0.02, hr * 0.85, hz + 0.012), (0.035, 0.05, 0.012)) * 0.8)
        c = blend(c, tone('#7d6a4c'), sstep(hr * 0.15, hr * 0.4, d.z + 0.15 * d.x) * sstep(hr * 1.25, hr * 1.0, d.length))
    return c


def paint_wagtail(p, h):
    hx, hz, hr = h
    c = blend(tone('#ecebe6'), tone('#8e9398'), sstep(-0.03, 0.06, p.z - 0.1 * p.x))
    # The big black bib, from the chin over the breast.
    c = blend(c, tone('#232326'), mask(p, (0.17, 0.0, 0.03), (0.08, 0.09, 0.12), 0.25))
    d = p - Vector((hx, 0.0, hz))
    if d.length < hr * 1.35:
        head_ = sstep(hr * 1.3, hr * 1.05, d.length)
        c = blend(c, tone('#eeeee9'), head_ * sstep(hr * 0.0, hr * 0.2, d.x + 0.4 * d.z + hr * 0.3))
        # A black crown and nape, a white forehead and face.
        c = blend(c, tone('#232326'), sstep(hr * 0.2, hr * 0.4, d.z - 0.55 * d.x) * head_)
        c = blend(c, tone('#232326'), sstep(-hr * 0.2, -hr * 0.5, d.z) * head_ * sstep(-0.0, hr * 0.5, d.x + 0.3))
    return c


def paint_magpie(p, h):
    hx, hz, hr = h
    c = tone('#1b1e22')
    # The white belly and flanks, sharp-edged against the black breast.
    belly = sstep(0.0, -0.04, p.z - 0.02) * sstep(0.06, 0.0, p.x) * sstep(-0.2, -0.12, p.x)
    c = blend(c, tone('#ecebe6'), belly)
    # White over the shoulders: the scapulars, which lie along the folded wing's top.
    c = blend(c, tone('#e8e7e2'), mask(p, (-0.02, 0.12, 0.06), (0.1, 0.05, 0.05), 0.3))
    c = blend(c, tone('#a8aaa8'), mask(p, (-0.2, 0.0, 0.05), (0.04, 0.05, 0.04)) * 0.7)
    d = p - Vector((hx, 0.0, hz))
    if d.length < hr * 1.2:
        c = blend(c, tone('#22262c'), 0.5 * sstep(hr * 0.5, hr * 0.9, d.z))
    return c


def paint_jackdaw(p, h):
    hx, hz, hr = h
    c = blend(tone('#33363c'), tone('#3b3e44'), sstep(-0.03, 0.06, p.z))
    d = p - Vector((hx, 0.0, hz))
    # The silver-grey nape and sides of the neck.
    nape = mask(p, (hx - 0.06, 0.04, hz - 0.03), (0.1, 0.13, 0.11), 0.3) * sstep(-0.03, 0.03, -d.x + 0.03)
    c = blend(c, tone('#a4a9ae'), nape)
    if d.length < hr * 1.3:
        c = blend(c, tone('#1c1d21'), sstep(hr * 0.15, hr * 0.35, d.x + 0.35 * d.z) * sstep(hr * 1.25, hr * 1.0, d.length))
        c = blend(c, tone('#1c1d21'), sstep(hr * 0.35, hr * 0.55, d.z) * sstep(hr * 1.25, hr * 1.0, d.length))
    return c


PAINT = {'tit': paint_tit, 'blue': paint_blue, 'sparrow': paint_sparrow, 'thrush': paint_thrush, 'wagtail': paint_wagtail,
         'magpie': paint_magpie, 'jackdaw': paint_jackdaw}

# How each wing is painted, over and under, by where on it a point is: u out along it (0 at the shoulder, 1 at the tip,
# `wrist` where the hand begins) and v across it (0 the leading edge, 1 the trailing edge). Its coverts first, then a bar
# where their tips lie (if it has one), the flight feathers with their pale edges, and the tertials.
WINGS = {
    'tit': {'covert': '#6f8296', 'lesser': '#7d8b52', 'bar': '#e4e6e0', 'flight': '#48505a', 'edge': '#8c9aa4', 'tertial': '#dfe2dc', 'under': '#c9ccc8'},
    'blue': {'covert': '#5a82b8', 'lesser': '#5a82b8', 'bar': '#e8eaea', 'flight': '#3e5a86', 'edge': '#7a98c0', 'tertial': '#d8dee6', 'under': '#cfd2d0'},
    'sparrow': {'covert': '#87683f', 'lesser': '#87683f', 'bar': '#e2e0d8', 'flight': '#4e4032', 'edge': '#a89070', 'tertial': '#b09878', 'under': '#c8c4ba'},
    'thrush': {'covert': '#78634a', 'lesser': '#7d6a4c', 'bar': '#a8926c', 'flight': '#5e4e3a', 'edge': '#8c7656', 'tertial': '#7d6a4c', 'under': '#c8b07a'},
    'wagtail': {'covert': '#3c3e42', 'lesser': '#8e9398', 'bar': '#e0e0dc', 'flight': '#2c2d31', 'edge': '#c8c8c4', 'tertial': '#d4d4d0', 'under': '#d8d8d4'},
    'magpie': {'covert': '#1f2c3a', 'lesser': '#1b1e22', 'bar': '#1f2c3a', 'flight': '#1a222c', 'edge': '#24364a', 'tertial': '#203448', 'under': '#2a2e34',
               'window': '#ecebe6'},
    'jackdaw': {'covert': '#2a2d33', 'lesser': '#2e3137', 'bar': '#2a2d33', 'flight': '#202227', 'edge': '#363a42', 'tertial': '#2a2d33', 'under': '#34373d'},
    'raven': {'covert': '#1c1e26', 'lesser': '#1c1e26', 'bar': '#1c1e26', 'flight': '#15161b', 'edge': '#262a36', 'tertial': '#1c1e26', 'under': '#202229'},
    'crow': {'covert': '#1d1f23', 'lesser': '#1d1f23', 'bar': '#1d1f23', 'flight': '#17181c', 'edge': '#24262c', 'tertial': '#1d1f23', 'under': '#23252a'},
}
# A bar where the coverts' tips lie: a great tit's, a blue tit's, a sparrow's and a wagtail's are white.
BARRED = {'tit': 0.9, 'blue': 0.9, 'sparrow': 0.75, 'wagtail': 0.8, 'thrush': 0.5}


def wing_paint(species, u, v, wrist, under):
    w = WINGS[species]
    if under:
        c = blend(tone(w['under']), tone(w['flight']), sstep(0.45, 0.85, v) * 0.6)
        if species == 'magpie':
            c = blend(c, tone(w['window']), sstep(wrist, wrist + 0.1, u) * sstep(0.3, 0.45, v) * sstep(0.98, 0.85, u))
        return c
    # Where the coverts end: further out on the arm, less far on the hand.
    edge = lerp(0.42, 0.3, sstep(wrist - 0.1, wrist + 0.2, u))
    c = blend(tone(w['lesser']), tone(w['covert']), sstep(0.08, 0.2, v))
    bar = BARRED.get(species, 0.0)
    if bar > 0.0:
        c = blend(c, tone(w['bar']), bar * sstep(edge - 0.1, edge - 0.03, v) * sstep(edge + 0.04, edge - 0.01, v))
    # The flight feathers: each its own, a pale edge on each, darker towards its tip.
    n = 9.0 if u > wrist else 10.0
    k = (u - wrist) / (1.0 - wrist) if u > wrist else u / wrist
    line = abs(math.sin(math.pi * n * k))
    f = blend(tone(w['flight']), tone(w['edge']), 0.55 * sstep(0.5, 0.95, line))
    f = blend(f, lit(tone(w['flight']), 0.8), sstep(0.75, 1.0, v) * 0.5)
    if u < wrist * 0.45:
        f = blend(f, tone(w['tertial']), 0.65 * sstep(0.6, 0.95, line))
    if species == 'magpie':
        # The white inner webs of a magpie's primaries: a long white window in the open hand.
        f = blend(f, tone(w['window']), sstep(wrist + 0.04, wrist + 0.14, u) * sstep(0.95, 0.85, u) * sstep(0.5, 0.65, v) * 0.95)
    return blend(c, f, sstep(edge - 0.02, edge + 0.03, v))


# --- a wing ---------------------------------------------------------------------------------------------------------------
# Built spread, as a sheet over and a sheet under, closed along its leading edge and round its tip. Each corner also knows
# where it lies folded: on the flank, from the shoulder back over the rump, its trailing edge (the tertials) along the
# back, its leading edge (the coverts) low on the side, and the hand's tips over the tail.

def section(rows, x):
    """The body's cross-section at x (level frame): its middle's height, its half width and half height. Behind the
    rump, the tail's root, narrow and low."""
    if x <= rows[0][0]:
        r = rows[0]
        k = clamp01((rows[0][0] - x) / 0.2)
        return (r[1] + 0.01 * k, lerp(r[2], 0.045, k), lerp(r[3], 0.03, k))
    if x >= rows[-1][0]:
        r = rows[-1]
        return (r[1], r[2], r[3])
    i = 1
    while rows[i][0] < x:
        i += 1
    a = rows[i - 1]
    b = rows[i]
    t = (x - a[0]) / (b[0] - a[0])
    return (lerp(a[1], b[1], t), lerp(a[2], b[2], t), lerp(a[3], b[3], t))


def flank(rows, x, z):
    """How far out from the middle the body's side is at x and z (level frame)."""
    zc, hw, hh = section(rows, x)
    k = (z - zc) / hh
    return hw * math.sqrt(max(0.0, 1.0 - k * k))


def on_flank(rows, x, angle, lift):
    """A point on the body's near side at x, `angle` round from its side (0) up towards its back (90 degrees), and
    `lift` out from its surface; and the way out there. Level frame, the near side (-Y)."""
    zc, hw, hh = section(rows, x)
    a = math.radians(angle)
    surface = Vector((x, -hw * math.cos(a), zc + hh * math.sin(a)))
    normal = Vector((0.0, -math.cos(a) / max(hw, 1e-4), math.sin(a) / max(hh, 1e-4))).normalized()
    return surface + normal * lift, normal


def wing(species, sp, side, rows, fingers=None):
    """A wing on side `side` (+1 near, -Y), in the level frame. Gives its part, its shoulder and its wrist."""
    w = sp['wing']
    out = Vector((0.0, -side, 0.0))
    shoulder = Vector((w['root'][0], -side * w['root'][1], w['root'][2]))
    span = w['span']
    wrist = w['wrist']
    chord = w['chord']
    # The leading edge: forward a little to the wrist, then swept back to the tip; the chord, rounded at the tip.
    lead = [(0.0, 0.0), (wrist, 0.035), (0.75, 0.0), (1.0, -0.06)]
    width = [(0.0, 1.0), (wrist, 0.95), (0.75, 0.78), (0.9, 0.55), (1.0, 0.12)]
    if fingers:
        # A raven's or a crow's: broad all the way out, the fingers beyond (below).
        lead = [(0.0, 0.0), (wrist, 0.06), (1.0, 0.0)]
        width = [(0.0, 0.9), (0.25, 1.06), (wrist, 1.0), (1.0, 0.82)]
    us = [0.0, 0.04, 0.1, 0.17, 0.25, 0.33, wrist - 0.03, wrist + 0.03, 0.52, 0.61, 0.7, 0.78, 0.85, 0.91, 0.96, 1.0]
    us = sorted(set(round(u, 3) for u in us if u <= 1.0))
    vs = [0.0, 0.08, 0.2, 0.33, 0.47, 0.62, 0.77, 0.9, 1.0]
    fold_long = w['fold']
    fold_tall = w['tall']
    part = bird_part()
    layers = []
    for layer in (1.0, -1.0):
        grid = []
        for u in us:
            row = []
            c = chord * along(width, u)
            for v in vs:
                # The trailing edge in feather tips: a notch between each two.
                notch = 0.0
                if v > 0.85 and not fingers:
                    n = 9.0 if u > wrist else 10.0
                    k = (u - wrist) / (1.0 - wrist) if u > wrist else u / wrist
                    notch = (0.04 + 0.06 * sstep(wrist, 1.0, u)) * (0.5 - 0.5 * math.cos(TAU * n * k)) * sstep(0.85, 1.0, v)
                thick = (0.003 + 0.009 * (1.0 - v) * (1.0 - u) ** 1.5) * (1.6 if fingers else 1.0)
                spread_at = shoulder + out * (span * u) + X * (span * along(lead, u) - v * c * (1.0 - notch)) + Z * (0.18 * c * math.sin(math.pi * min(1.0, v * 1.2)) * (1.0 - u) * 0.3 + layer * thick * 0.5)
                # Folded: back along the flank and over the rump, its leading edge low on the side, its trailing
                # edge (the tertials) along the back, the hand's tips over the tail.
                fx = shoulder.x + 0.03 - u * fold_long - 0.03 * v * (1.0 - u)
                # Round at its front (the bend of the wing), broadest a little behind it, to a point over the tail.
                mid = lerp(0.5 * fold_tall - 8.0, 34.0, u ** 1.2)
                half = (0.5 * fold_tall + 6.0) * (0.5 + 0.5 * sstep(0.0, 0.3, u)) * (1.0 - u ** 1.6) ** 0.6 + 3.0
                low = mid - half
                high = mid + half
                lift_ = 0.008 + 0.014 * math.sin(math.pi * v) * (1.0 - u) + layer * thick * 0.5
                folded, _ = on_flank(rows, fx, lerp(low, high, v), lift_)
                folded.y *= side
                hand = sstep(wrist - 0.06, wrist + 0.08, u)
                row.append(pt(part, spread_at, wing_paint(species, u, v, wrist, layer < 0.0), folded, (hand, 0.0, 0.0)))
            grid.append(row)
        layers.append(grid)
    top, under = layers
    # Each sheet faces its own way: the top one up, the under one down; seen from the near side, the near wing's over
    # side is up, the far wing's too.
    for grid, up in ((top, True), (under, False)):
        for i in range(len(grid) - 1):
            for j in range(len(grid[0]) - 1):
                quad = [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]]
                n = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
                if (n.dot(Z) > 0.0) != up:
                    quad = quad[::-1]
                face(part, quad)
    # The leading edge and the tip, closed.
    rims = [([(top[i][0], under[i][0]) for i in range(len(us))], X), ([(top[-1][j], under[-1][j]) for j in range(len(vs))], out)]
    for rim, outward in rims:
        for k in range(len(rim) - 1):
            a, b = rim[k]
            c, d = rim[k + 1]
            quad = [a, c, d, b]
            n = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
            if n.dot(outward) < 0.0:
                quad = quad[::-1]
            face(part, quad)
    wrist_at = shoulder + out * (span * wrist) + X * (span * along(lead, wrist))
    if fingers:
        add_fingers(part, species, sp, side, shoulder, out, top, us, vs, fingers)
    return part, shoulder, wrist_at


def add_fingers(part, species, sp, side, shoulder, out, top, us, vs, fingers):
    """The long primaries of a raven's or a crow's hand, each its own, splayed like fingers. They root inside the hand's
    outer edge and fan out from leading to trailing, the outermost a little shorter."""
    w = sp['wing']
    span = w['span']
    tip_row = top[-1]
    for k, (v, long, wide, turn) in enumerate(fingers):
        j = min(range(len(vs)), key=lambda q: abs(vs[q] - v))
        root = tip_row[j].co.copy() - out * (0.12 * span) + Z * 0.0
        root.z = shoulder.z + 0.004
        way = (out * math.cos(math.radians(turn)) - X * math.sin(math.radians(turn))).normalized()
        across = Z.cross(way).normalized()
        if across.dot(X) < 0.0:
            across = -across
        n = 6
        rows_ = []
        for layer in (1.0, -1.0):
            rows = []
            for i in range(n):
                s = i / (n - 1.0)
                at = root + way * (long * s) + Z * (0.05 * long * s * s + layer * 0.004)
                half = wide * (1.0 - 0.15 * s) * (math.sqrt(max(0.0, 1.0 - ((s - 0.82) / 0.18) ** 2)) if s > 0.82 else 1.0) + 0.002
                colour = wing_paint(species, 1.0, 0.6, w['wrist'], layer < 0.0)
                colour = blend(colour, lit(colour, 0.85), s)
                fx = shoulder.x + 0.03 - w['fold'] - 0.02 - long * 0.5 * s - 0.01 * k
                folded_mid = Vector((fx, -side * (0.04 + 0.006 * k + layer * 0.003), shoulder.z - 0.02 + 0.012 * k))
                ring = []
                for c in (-1.0, 0.0, 1.0):
                    p = at + across * (half * c)
                    f = folded_mid + Vector((0.0, 0.0, 0.5 * half * c))
                    ring.append(pt(part, p, colour, f, (1.0, 0.0, 0.0)))
                rows.append(ring)
            rows_.append(rows)
        for grid, up in ((rows_[0], True), (rows_[1], False)):
            for i in range(n - 1):
                for c in range(2):
                    quad = [grid[i][c], grid[i][c + 1], grid[i + 1][c + 1], grid[i + 1][c]]
                    nn = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
                    if (nn.dot(Z) > 0.0) != up:
                        quad = quad[::-1]
                    face(part, quad)


# --- a tail ---------------------------------------------------------------------------------------------------------------

TAILS = {
    'tit': ('#5c6a7a', '#dfe2dc'), 'blue': ('#557aa8', '#7a98c0'), 'sparrow': ('#56483a', '#8c7656'), 'thrush': ('#6e5a42', '#7d6a4c'),
    'wagtail': ('#26272a', '#ecece8'), 'magpie': ('#1a2220', '#2a3a34'), 'jackdaw': ('#24272c', '#2e3238'),
    'raven': ('#17181d', '#22242e'), 'crow': ('#1b1d21', '#24262c'),
}


def tail(species, sp):
    """A tail of feathers, out behind the rump along -X, a little up from the body's line: two sheets, a keel down its
    middle, and its end notched, square, rounded or a wedge. Each corner knows how far out to the side it is (_BEND y)."""
    t = sp['tail']
    dark, pale = TAILS[species]
    rx, rz = t['root']
    long = t['long']
    lift = t['lift']
    way = Vector((-math.cos(lift), 0.0, math.sin(lift)))
    part = bird_part()
    nu = 9
    nv = 7
    layers = []
    for layer in (1.0, -1.0):
        grid = []
        for i in range(nu):
            s = i / (nu - 1.0)
            half = lerp(t['w0'], t['w1'], sstep(0.0, 0.7, s))
            row = []
            for j in range(nv):
                c = j / (nv - 1.0) * 2.0 - 1.0
                end = 1.0
                if t['end'] == 'notch':
                    end = 1.0 - 0.07 * (1.0 - abs(c))
                elif t['end'] == 'round':
                    end = 1.0 - 0.1 * c * c
                elif t['end'] == 'wedge':
                    end = 1.0 - 0.42 * abs(c) ** 1.1
                # Thick at its root, under the coverts, and a shallow V across, so that it is seen from the side.
                thick = lerp(0.03, 0.007, sstep(0.0, 0.6, s))
                at = Vector((rx, 0.0, rz)) + way * (long * s * end) + Y * (half * c) + Z * (layer * thick * 0.5 - 0.02 * (1.0 - abs(c)) * (0.3 + s))
                # Its feathers: each a line, the outer ones of a wagtail's white, a pale edge on each.
                feather = abs(math.sin(math.pi * (c + 1.0) * 3.0))
                colour = blend(tone(dark), tone(pale), 0.35 * sstep(0.7, 1.0, feather))
                if species == 'wagtail':
                    colour = blend(colour, tone(pale), sstep(0.62, 0.78, abs(c)))
                if species == 'tit':
                    colour = blend(colour, tone(pale), sstep(0.8, 0.95, abs(c)) * 0.8)
                if species == 'magpie':
                    colour = blend(colour, tone('#2c4a3c'), 0.35 * math.sin(math.pi * s) * (1.0 - abs(c)))
                if layer < 0.0:
                    colour = lit(colour, 0.85)
                # How far out to the side, +1 the near side (-Y), as a wing's `side` counts.
                row.append(pt(part, at, colour, None, (0.0, -c, 0.0)))
            grid.append(row)
        layers.append(grid)
    for grid, up in ((layers[0], True), (layers[1], False)):
        for i in range(nu - 1):
            for j in range(nv - 1):
                quad = [grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]]
                n = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
                if (n.dot(Z) > 0.0) != up:
                    quad = quad[::-1]
                face(part, quad)
    top, under = layers
    for rim in ([(top[i][0], under[i][0]) for i in range(nu)], [(top[i][-1], under[i][-1]) for i in range(nu)], [(top[-1][j], under[-1][j]) for j in range(nv)]):
        for k in range(len(rim) - 1):
            a, b = rim[k]
            c, d = rim[k + 1]
            quad = [a, c, d, b]
            mid = (a.co + b.co + c.co + d.co) * 0.25
            n = (quad[1].co - quad[0].co).cross(quad[3].co - quad[0].co)
            centre = Vector((rx, 0.0, rz)) + way * (long * 0.5)
            if n.dot(mid - centre) < 0.0:
                quad = quad[::-1]
            face(part, quad)
    return part, Vector((rx, 0.0, rz))


# --- a head, its bill and its eyes -------------------------------------------------------------------------------------

def head(species, sp, paint, hd, corvid=False):
    """The head and the upper bill, the eyes; and, a part of its own, the lower bill. Gives both parts, the neck and the
    bill's hinge."""
    hx, hz, hr = hd
    part = bird_part()
    centre = Vector((hx, 0.0, hz))

    def shape(p):
        # A little longer than round, flatter on top, the forehead running into the bill.
        d = p - centre
        if d.x > 0.0:
            d.z -= 0.12 * d.x * max(0.0, d.z) / hr
        return centre + d

    blob(part, centre, (hr * 1.08, hr * 0.94, hr * 0.96), 3, lambda p: paint(p, hd), shape)
    bl, bw, bh = sp['bill']
    beak = tone(sp['beak'])
    base = Vector((hx + hr * 0.86, 0.0, hz - hr * 0.08))
    gape = base.z - bh * 0.15
    # The upper bill: a pointed loft, its ridge a little arched.
    arch = 0.35 if corvid else 0.15
    rows = []
    for k in range(7):
        s = k / 6.0
        wide = bw * (1.0 - s) ** 0.85 + 0.002
        tall = bh * 0.62 * (1.0 - s) ** 0.8 + 0.0015
        rows.append((base.x - 0.012 + bl * s, gape + tall * 0.6 + arch * bh * math.sin(math.pi * s * 0.5) * (1.0 - s) * 0.5 - 0.15 * bh * s * s, wide, tall))
    loft(part, rows, 8, lambda p: lit(beak, 1.0 + 0.25 * sstep(0.0, 0.01, p.z - gape)))
    # The mouth inside, dark, seen only when the bill opens.
    blob(part, Vector((base.x + 0.004, 0.0, gape - 0.003)), (bl * 0.25, bw * 0.6, bh * 0.25), 1, lambda p: tone('#3a3236'))
    # The eyes: dark, round, a pale ring round a jackdaw's.
    for s in (1.0, -1.0):
        at = centre + Vector((hr * 0.5, -s * hr * 0.74, hr * 0.22))
        if species == 'jackdaw':
            blob(part, at, (0.026, 0.012, 0.026), 1, lambda p: tone('#d6dbdc'))
            blob(part, at + Vector((0.004, -s * 0.006, 0.0)), (0.012, 0.008, 0.012), 1, lambda p: tone('#141210'))
        else:
            r = 0.022 if not corvid else 0.02
            blob(part, at, (r, r * 0.6, r), 1, lambda p: tone('#141210'))
            blob(part, at + Vector((0.006, -s * r * 0.55, 0.007)), (0.0045, 0.002, 0.0045), 0, lambda p: tone('#c8ccd0'))
    if species == 'thrush':
        for s in (1.0, -1.0):
            at = centre + Vector((hr * 0.5, -s * hr * 0.74, hr * 0.22))
            blob(part, at - Vector((0.002, -s * 0.001, 0.0)), (0.027, 0.01, 0.027), 1, lambda p: tone('#e2dac4'))
    if corvid:
        # A raven's shaggy throat: a beard of pointed feathers under the bill.
        for k in range(5):
            y = (k - 2) * 0.025
            a = Vector((hx + hr * 0.3, y, hz - hr * 0.75))
            b = a + Vector((0.05, y * 0.6, -0.05 - 0.015 * (2 - abs(k - 2))))
            tube_pts(part, [tuple(a), tuple((a + b) * 0.5), tuple(b)], [0.022, 0.014, 0.002], paint(a, hd), 4)
    jaw = bird_part()
    rows = []
    for k in range(6):
        s = k / 5.0
        wide = bw * 0.9 * (1.0 - s) ** 0.9 + 0.002
        tall = bh * 0.38 * (1.0 - s) ** 0.8 + 0.0015
        rows.append((base.x - 0.01 + bl * 0.94 * s, gape - tall * 0.55, wide, tall))
    loft(jaw, rows, 8, lambda p: lit(beak, 0.9) if species != 'thrush' else blend(tone('#a8986a'), beak, sstep(0.3, 0.7, (p.x - base.x) / bl)))
    neck = Vector((hx - hr * 0.55, 0.0, hz - hr * 0.55))
    hinge = Vector((base.x - 0.01, 0.0, gape))
    return part, jaw, neck, hinge


# --- legs ------------------------------------------------------------------------------------------------------------------

def legs(sp, hips):
    """Both legs, standing on the ground (z 0) under the hips: the shin from the belly feathers down, and four toes each,
    three forward and one back."""
    colour = tone(sp['legs']['colour'])
    part = bird_part()
    for s in (1.0, -1.0):
        knee = hips + Vector((0.0, -s * 0.045, -0.02))
        ankle = Vector((hips.x + 0.01, -s * 0.05, 0.022))
        tube_pts(part, [tuple(knee), tuple(knee.lerp(ankle, 0.5)), tuple(ankle)], [0.014, 0.011, 0.01], colour, 5)
        for turn in (-0.45, 0.0, 0.45):
            toe = ankle + Vector((0.075 * math.cos(turn), -s * 0.075 * math.sin(turn) - s * 0.01, -0.016))
            tube_pts(part, [tuple(ankle), tuple(ankle.lerp(toe, 0.6) + Vector((0.0, 0.0, 0.004))), tuple(toe)], [0.008, 0.007, 0.004], colour, 4)
        back = ankle + Vector((-0.05, -s * 0.005, -0.016))
        tube_pts(part, [tuple(ankle), tuple(back)], [0.008, 0.004], colour, 4)
    return part


# --- a small bird ---------------------------------------------------------------------------------------------------------

def small_bird(species):
    sp = SMALL[species]
    paint = PAINT[species]
    hd = sp['head']
    rows = sp['body']
    parts = {}
    body = bird_part()
    loft(body, rows, 22, lambda p: paint(p, hd))
    # The thrush's breast: dark drops in rows, big enough to be seen from the path. The sparrow's back: dark streaks.
    if species == 'thrush':
        for row in range(6):
            for k in range(7):
                x = 0.17 - row * 0.045 + (k % 2) * 0.012
                a = math.radians(-100.0 + k * 22.0 + (row % 2) * 9.0)
                for s in (1.0, -1.0):
                    hw = flank(rows, x, 0.0)
                    zc = -0.005
                    hh = 0.155
                    p = Vector((x, -s * hw * math.cos(a) * 0.98 if abs(math.cos(a)) > 0.05 else 0.0, zc + hh * math.sin(a) * 0.98))
                    if p.z > 0.06 or abs(p.y) < 0.02 and s < 0.0:
                        continue
                    nrm = Vector((0.15, p.y / max(hw, 0.01), (p.z - zc) / hh)).normalized()
                    disc(body, p, nrm, (0.3, 0.0, -1.0), (0.016 - row * 0.0012, 0.011), tone('#4a3c2c' if (row + k) % 2 else '#56463a'))
    if species == 'sparrow':
        for k in range(14):
            x = 0.1 - k * 0.022
            y = 0.035 + 0.04 * ((k * 7) % 3)
            for s in (1.0, -1.0):
                z = math.sqrt(max(0.0, 1.0 - (y / max(flank(rows, x, 0.0), 0.05)) ** 2)) * 0.16
                disc(body, (x, -s * y, z), (0.0, -s * y * 2.0, 1.0), (1.0, 0.0, -0.2), (0.022, 0.006), tone('#3c3226' if k % 2 else '#b8a37a'))
    parts['body'] = body
    hpart, jaw, neck, hinge = head(species, sp, paint, hd)
    parts['head'] = hpart
    parts['jaw'] = jaw
    wings = {}
    for side in (1.0, -1.0):
        wings[side] = wing(species, sp, side, rows)
    tpart, troot = tail(species, sp)
    # Tipped up by its tilt about its middle, and lifted onto its legs.
    tilt = sp['tilt']
    place = Matrix.Translation((0.0, 0.0, sp['up'])) @ Matrix.Rotation(-tilt, 4, 'Y')
    for p in (body, hpart, jaw, tpart):
        moved(p, place)
    for side in (1.0, -1.0):
        moved(wings[side][0], place)
    hx, hz = sp['legs']['hip']
    hips = place @ Vector((hx, 0.0, hz))
    hips = Vector((hips.x, 0.0, hips.z))
    lpart = legs(sp, hips)
    made = [
        done(body, species, species, 'body', tilt=tilt, shade=0.45, reach=0.08, floor=0.0),
        done(hpart, species + '-huvud', species, 'head', pivot=place @ neck, tilt=tilt, shade=0.35, reach=0.05),
        done(jaw, species + '-nabb', species, 'jaw', pivot=place @ neck, joint=place @ hinge, tilt=tilt, shade=0.2, reach=0.02),
        done(tpart, species + '-stjart', species, 'tail', pivot=place @ troot, tilt=tilt, shade=0.25, reach=0.04, recalc=False, leaf=True),
        done(lpart, species + '-ben', species, 'legs', pivot=hips, tilt=tilt, shade=0.2, reach=0.03, floor=0.0),
    ]
    for side in (1.0, -1.0):
        wpart, shoulder, wrist = wings[side]
        tag = 'n' if side > 0 else 'f'
        made.append(done(wpart, species + '-vinge-' + tag, species, 'wing', side=side, pivot=place @ shoulder, joint=place @ wrist, tilt=tilt,
                         shade=0.0, reach=0.03, recalc=False, leaf=True, sharp=180.0))
    return made


for species in ('tit', 'blue', 'sparrow', 'thrush', 'wagtail', 'magpie', 'jackdaw'):
    if wanted(species):
        small_bird(species)


# --- the raven and the hooded crow ------------------------------------------------------------------------------------------
# High over the place, seen from below and the side: a raven, all black with a blue sheen, its heavy bill, its shaggy
# throat, long wings with five fingers and a wedge of a tail; and a hooded crow, grey with a black head, bib, wings and
# tail, rounder wings and a rounded tail. Its body is 1 long with its tail, and it flies with its middle at the origin.

CORVIDS = {
    'raven': {
        'body': [(-0.3, 0.0, 0.05, 0.05), (-0.26, 0.0, 0.085, 0.08), (-0.18, 0.0, 0.12, 0.11), (-0.08, 0.0, 0.14, 0.125),
                 (0.04, 0.0, 0.142, 0.128), (0.14, 0.01, 0.125, 0.115), (0.22, 0.03, 0.095, 0.09), (0.28, 0.045, 0.07, 0.07)],
        'head': (0.33, 0.06, 0.088), 'bill': (0.17, 0.048, 0.06), 'beak': '#141518',
        'wing': {'span': 0.66, 'chord': 0.36, 'wrist': 0.48, 'fold': 0.55, 'tall': 60.0, 'root': (0.07, 0.09, 0.03)},
        'fingers': [(0.05, 0.36, 0.034, 6.0), (0.25, 0.42, 0.036, 16.0), (0.45, 0.43, 0.036, 27.0), (0.65, 0.4, 0.036, 38.0), (0.84, 0.33, 0.034, 50.0)],
        'tail': {'root': (-0.28, 0.005), 'long': 0.44, 'w0': 0.06, 'w1': 0.15, 'end': 'wedge', 'lift': 0.0},
    },
    'crow': {
        'body': [(-0.29, 0.0, 0.05, 0.05), (-0.25, 0.0, 0.088, 0.082), (-0.17, 0.0, 0.125, 0.115), (-0.07, 0.0, 0.145, 0.13),
                 (0.05, 0.0, 0.146, 0.132), (0.15, 0.01, 0.128, 0.118), (0.22, 0.03, 0.098, 0.092), (0.27, 0.045, 0.072, 0.07)],
        'head': (0.31, 0.06, 0.09), 'bill': (0.12, 0.034, 0.04), 'beak': '#18191c',
        'wing': {'span': 0.6, 'chord': 0.38, 'wrist': 0.48, 'fold': 0.5, 'tall': 60.0, 'root': (0.07, 0.095, 0.03)},
        'fingers': [(0.08, 0.27, 0.036, 8.0), (0.28, 0.32, 0.038, 19.0), (0.48, 0.32, 0.038, 30.0), (0.68, 0.29, 0.038, 42.0), (0.86, 0.24, 0.036, 54.0)],
        'tail': {'root': (-0.27, 0.005), 'long': 0.36, 'w0': 0.06, 'w1': 0.14, 'end': 'round', 'lift': 0.0},
    },
}


def paint_raven(p, h):
    hx, hz, hr = h
    # Black, a blue-purple sheen along the back.
    return blend(tone('#18191e'), tone('#262838'), 0.6 * sstep(0.02, 0.1, p.z))


def paint_crow(p, h):
    hx, hz, hr = h
    grey = blend(tone('#7e8186'), tone('#8d9094'), sstep(-0.05, 0.08, p.z))
    black = tone('#1d1f23')
    # Black head and bib, and black thighs; the rest the hood's grey.
    hood = sstep(0.16, 0.2, p.x) + mask(p, (0.17, 0.0, -0.06), (0.08, 0.07, 0.07), 0.3)
    thigh = mask(p, (-0.16, 0.06, -0.08), (0.06, 0.05, 0.05))
    return blend(grey, black, clamp01(hood + thigh))


def corvid(species):
    sp = CORVIDS[species]
    paint = paint_raven if species == 'raven' else paint_crow
    hd = sp['head']
    rows = sp['body']
    body = bird_part()
    loft(body, rows, 22, lambda p: paint(p, hd))
    # Its feet, tucked up under the tail.
    for s in (1.0, -1.0):
        tube_pts(body, [(-0.08, -s * 0.04, -0.09), (-0.18, -s * 0.035, -0.1), (-0.26, -s * 0.03, -0.085)], [0.016, 0.012, 0.008], tone('#16171a'), 4)
    sp_ = dict(sp)
    sp_['legs'] = {'colour': '#16171a'}
    hpart, jaw, neck, hinge = head(species, sp_, paint, hd, corvid=True)
    tpart, troot = tail(species, sp_)
    made = [
        done(body, species, species, 'body', shade=0.35, reach=0.1),
        done(hpart, species + '-huvud', species, 'head', pivot=neck, shade=0.3, reach=0.05),
        done(jaw, species + '-nabb', species, 'jaw', pivot=neck, joint=hinge, shade=0.2, reach=0.02),
        done(tpart, species + '-stjart', species, 'tail', pivot=troot, shade=0.2, reach=0.05, recalc=False, leaf=True),
    ]
    for side in (1.0, -1.0):
        wpart, shoulder, wrist = wing(species, sp_, side, rows, fingers=sp['fingers'])
        tag = 'n' if side > 0 else 'f'
        made.append(done(wpart, species + '-vinge-' + tag, species, 'wing', side=side, pivot=shoulder, joint=wrist, shade=0.0, reach=0.03,
                         recalc=False, leaf=True, sharp=180.0))
    return made


for species in ('raven', 'crow'):
    if wanted(species):
        corvid(species)

print('birds built')
