"""Pappa's hidden carvings (src/render/lift/fauna.ts, carvings): small figures whittled from pale wood by a father for
his children and left on stones along the way, in both adventures. A sitting hare with long ears, round haunches, a
tucked tail and a small face; a little round bird; and a nisse whose long cap droops forward. Each stands on a plinth
cut from the same wood. Made with art/blender/kit-tools.py:
    node scripts/bake/blender-kit.mjs art/blender/carvings.py --out=art/baked/boot/carvings.glb
    node scripts/bake/blender-kit.mjs art/blender/carvings.py --fast --save=<file.blend>     to look at it

Units: each is built at the size of the game's code-built one (src/render/lift/fauna/shapes.ts CARVINGS), and the game
draws it 1.4 times that. Z is up, it faces +X, and its plinth stands on the origin.

How one is carved: its form is a table of round lumps, joined into one piece of wood and softened; then the knife: the
piece is cut down to a few hundred flat facets, the same on both its sides, so that every face is a cut and every edge
a ridge. Its colours are on its corners: each facet a little its own tone, paler where it faces up, the grain running up
through the blank, the cuts between its parts darker (baked), and what the burning iron did: two eyes, a nose, the
hollow of an ear, the feathers of a wing. No paint and no texture. None is either of the story's two figures: the nisse
has no face and no beard. Nothing in it comes from anyone else. Keep this file in plain ASCII.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector
from mathutils.bvhtree import BVHTree

WOOD = tone('#e2c08c')      # noqa: F821 (kit-tools.py)
RIDGE = tone('#f4e0b6')     # noqa: F821
CUT = tone('#b98f58')       # noqa: F821
BURNT = tone('#3a2416')     # noqa: F821
SCORCH = tone('#7a5632')    # noqa: F821
PLINTH = tone('#c29c68')    # noqa: F821
PLINTH_TOP = tone('#d8ba86')  # noqa: F821
SIDES = (1.0, -1.0)


def V(x, y, z):
    return Vector((x, y, z))


def lump_at(bm, centre, radii, turn=(0.0, 0.0, 0.0), detail=3, spin=0.0):
    """A round lump of the blank: an ellipsoid, spun about its own upright (degrees), then tilted about x and y."""
    tilt = (Matrix.Rotation(math.radians(turn[0]), 4, 'X') @ Matrix.Rotation(math.radians(turn[1]), 4, 'Y')
            @ Matrix.Rotation(math.radians(turn[2] + spin), 4, 'Z'))
    matrix = Matrix.Translation(centre) @ tilt @ Matrix.Diagonal((radii[0], radii[1], radii[2], 1.0))
    bmesh.ops.create_icosphere(bm, subdivisions=detail, radius=1.0, matrix=matrix)


def limb_at(bm, a, b, ra, rb):
    """A limb from a to b, as thick as ra and rb at its ends: lumps along it, so that it joins what it meets."""
    a = Vector(a)
    b = Vector(b)
    steps = max(2, int((b - a).length / (0.6 * min(ra, rb))) + 1)
    for i in range(steps + 1):
        t = i / steps
        r = ra + (rb - ra) * t
        lump_at(bm, a + (b - a) * t, (r, r, r), detail=2)


def whittle(name, bm, voxel, facets, soften=4):
    """Joins the lumps into one piece, softens it, and cuts it down to about `facets` flat faces, the same on both sides."""
    mesh = bpy.data.meshes.new(name + '-blank')
    bm.to_mesh(mesh)
    bm.free()
    blank = bpy.data.objects.new(name + '-blank', mesh)
    bpy.context.scene.collection.objects.link(blank)
    union = blank.modifiers.new('union', 'REMESH')
    union.mode = 'VOXEL'
    union.voxel_size = voxel
    union.adaptivity = 0.0
    soft = blank.modifiers.new('soften', 'SMOOTH')
    soft.factor = 0.6
    soft.iterations = soften
    count = len(blank.evaluated_get(bpy.context.evaluated_depsgraph_get()).data.polygons)
    cuts = blank.modifiers.new('cuts', 'DECIMATE')
    cuts.decimate_type = 'COLLAPSE'
    cuts.ratio = min(1.0, facets / (count * 2.0))
    cuts.use_symmetry = True
    cuts.symmetry_axis = 'Y'
    cuts.use_collapse_triangulate = True
    carved = bpy.data.meshes.new_from_object(blank.evaluated_get(bpy.context.evaluated_depsgraph_get()))
    bpy.data.objects.remove(blank, do_unlink=True)
    out = bmesh.new()
    out.from_mesh(carved)
    bpy.data.meshes.remove(carved)
    # Faces that are as good as one plane are one cut of the knife.
    bmesh.ops.dissolve_limit(out, angle_limit=math.radians(9.0), verts=out.verts[:], edges=out.edges[:])
    bmesh.ops.recalc_face_normals(out, faces=out.faces[:])
    return out


def paint_wood(bm, layer, seed, floor, tall):
    """Each facet its own tone: paler where it faces up (a ridge the hand has polished), darker where it faces down, the
    grain running up through the blank in soft streaks with the year rings across them, and a little darker low down."""
    for made in bm.faces:
        made.smooth = False
        own = 0.95 + 0.1 * rnd(made.index * 1.37 + seed, 3.0)  # noqa: F821
        up = made.normal.z
        colour = blend(WOOD, RIDGE, up * 0.75) if up > 0.0 else blend(WOOD, CUT, -up * 0.8)  # noqa: F821
        for loop in made.loops:
            p = loop.vert.co
            streak = noise(p.x * 46.0 + seed, p.y * 46.0, p.z * 4.0 + 0.6 * math.sin(p.x * 30.0))  # noqa: F821
            ring = 0.5 + 0.5 * math.sin(math.hypot(p.x + 0.42, p.y + 0.31) * 150.0 + 2.4 * noise(p.x * 9.0, p.y * 9.0, p.z * 5.0 + seed))  # noqa: F821
            k = own * (0.94 + 0.09 * streak) * (1.0 - 0.06 * ring * ring)
            k *= 1.0 - 0.08 * max(0.0, 1.0 - (p.z - floor) / (tall * 0.25))
            loop[layer] = (colour[0] * k, colour[1] * k, colour[2] * k, 1.0)


def burn(bm, layer, tree, origin, toward, size, colour, sides=8, long=1.0, lean=None, proud=0.0018):
    """What the burning iron or the knife's point left: a small flat mark on the wood where a line from `origin` towards
    `toward` meets it, `size` across (and `long` times that along `lean`), lying on the surface and facing out."""
    way = (Vector(toward) - Vector(origin)).normalized()
    hit, normal, _index, _far = tree.ray_cast(Vector(origin), way)
    if hit is None:
        print('carvings: a mark missed the wood', origin, toward)
        return None
    across = normal.cross(Vector(lean) if lean is not None else Vector((0.0, 0.0, 1.0)))
    if across.length < 1e-4:
        across = normal.cross(Vector((1.0, 0.0, 0.0)))
    across.normalize()
    up = across.cross(normal).normalized()
    centre = bm.verts.new(hit + normal * (proud * 1.7))
    ring = []
    for j in range(sides):
        a = TAU * j / sides  # noqa: F821
        ring.append(bm.verts.new(hit + normal * proud + across * (size * math.cos(a)) + up * (size * long * math.sin(a))))
    for j in range(sides):
        made = bm.faces.new((centre, ring[(j + 1) % sides], ring[j]))
        made.smooth = False
        for loop in made.loops:
            loop[layer] = (colour[0], colour[1], colour[2], 1.0)
    return hit


def plinth(bm, layer, long, wide, tall, seed, sides=10):
    """The plinth: a slice of the same wood, cut round with the knife in flat strokes, its top edge taken off."""
    rings = []
    for z, inset in ((0.0, 0.95), (tall * 0.7, 1.0), (tall, 0.9)):
        ring = []
        for j in range(sides):
            a = TAU * (j + 0.5) / sides  # noqa: F821
            r = 1.0 + 0.07 * (rnd(j + seed, 5.0) - 0.5)  # noqa: F821
            ring.append(bm.verts.new((long * r * inset * math.cos(a), wide * r * inset * math.sin(a), z)))
        rings.append(ring)
    made = []
    for i in range(2):
        for j in range(sides):
            k = (j + 1) % sides
            made.append((bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])), PLINTH if i == 0 else blend(PLINTH, PLINTH_TOP, 0.5)))  # noqa: F821
    made.append((bm.faces.new(rings[2]), PLINTH_TOP))
    made.append((bm.faces.new(rings[0][::-1]), PLINTH))
    for side, colour in made:
        side.smooth = False
        k = 0.94 + 0.12 * rnd(side.index * 2.11 + seed, 9.0)  # noqa: F821
        for loop in side.loops:
            p = loop.vert.co
            ring = 0.5 + 0.5 * math.sin(math.hypot(p.x + 0.05, p.y - 0.03) * 210.0)
            g = k * (1.0 - 0.07 * ring * ring)
            loop[layer] = (colour[0] * g, colour[1] * g, colour[2] * g, 1.0)


def done(bm, name, shade=0.42, reach=0.08):
    """The figure as the kit's bake and export want it: flat faces, its colours on its corners, the one material."""
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    # Cutting both sides alike can leave a face twice on the middle: once is enough.
    mesh.validate()
    mesh.materials.append(MATERIAL)  # noqa: F821
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = shade
    made['reach'] = reach
    made['floor'] = -1000.0
    made['carving'] = name
    return made


# --- the hare ---------------------------------------------------------------------------------------------------------
# Sitting up on its haunches, alert: its back a long curve from the tucked tail to the nape, its chest over two straight
# forelegs, a small face with round cheeks, and two long ears a little apart, laid a little back and turned half
# forward, so that they are broad from the front and from the side.

def hare():
    base = 0.036
    bm = bmesh.new()
    # The rump and the back, the chest, and the neck between them.
    lump_at(bm, V(-0.058, 0.0, base + 0.1), (0.108, 0.082, 0.098), (0.0, -14.0, 0.0))
    lump_at(bm, V(0.0, 0.0, base + 0.135), (0.085, 0.07, 0.1), (0.0, 28.0, 0.0))
    lump_at(bm, V(0.05, 0.0, base + 0.16), (0.062, 0.06, 0.092), (0.0, 12.0, 0.0))
    lump_at(bm, V(0.078, 0.0, base + 0.232), (0.046, 0.044, 0.05))
    # The haunches: round thighs on its sides, and the long hind feet under them.
    for s in SIDES:
        lump_at(bm, V(-0.05, s * 0.066, base + 0.085), (0.08, 0.034, 0.078), (0.0, -10.0, 0.0))
        lump_at(bm, V(0.0, s * 0.074, base + 0.022), (0.078, 0.026, 0.022))
    # The forelegs, straight down from the chest, and their paws.
    for s in SIDES:
        limb_at(bm, (0.082, s * 0.036, base + 0.15), (0.098, s * 0.038, base + 0.03), 0.026, 0.02)
        lump_at(bm, V(0.112, s * 0.038, base + 0.018), (0.032, 0.023, 0.018))
    # The tail, tucked.
    lump_at(bm, V(-0.16, 0.0, base + 0.072), (0.04, 0.04, 0.038))
    # The head: a small face, round cheeks, and the muzzle.
    lump_at(bm, V(0.106, 0.0, base + 0.288), (0.07, 0.056, 0.057), (0.0, 8.0, 0.0))
    for s in SIDES:
        lump_at(bm, V(0.128, s * 0.032, base + 0.268), (0.036, 0.027, 0.03))
    lump_at(bm, V(0.166, 0.0, base + 0.27), (0.036, 0.034, 0.03))
    # The ears.
    for s in SIDES:
        lump_at(bm, V(0.05, s * 0.037, base + 0.42), (0.032, 0.0175, 0.114), (s * -10.0, -12.0, 0.0), spin=s * -42.0)
    bm = whittle('hare', bm, 0.0055, 560)
    layer = bm.loops.layers.float_color.new('Color')
    paint_wood(bm, layer, 1.0, base, 0.53)
    tree = BVHTree.FromBMesh(bm)
    # Burnt in: two eyes on the sides of its head, its nose, and the hollow of each ear.
    for s in SIDES:
        burn(bm, layer, tree, (0.134, s * 0.3, base + 0.302), (0.134, 0.0, base + 0.302), 0.0135, BURNT)
    burn(bm, layer, tree, (0.4, 0.0, base + 0.277), (0.1, 0.0, base + 0.277), 0.011, BURNT, sides=6)
    for s in SIDES:
        burn(bm, layer, tree, (0.26, s * 0.23, base + 0.44), (0.05, s * 0.04, base + 0.43), 0.0105, SCORCH, sides=6, long=5.6, lean=(0.2, s * -0.16, -1.0))
    plinth(bm, layer, 0.172, 0.114, base, 3.0)
    return done(bm, 'hare')


# --- the bird ---------------------------------------------------------------------------------------------------------
# A small round songbird, sitting: a plump breast, its head a little up, a short bill, its wings folded on its sides and
# its tail out behind. The knife cut the feathers of its wings in three strokes each.

def bird():
    base = 0.032
    bm = bmesh.new()
    lump_at(bm, V(-0.005, 0.0, base + 0.108), (0.118, 0.086, 0.09), (0.0, -20.0, 0.0))
    lump_at(bm, V(0.052, 0.0, base + 0.1), (0.074, 0.078, 0.082))
    lump_at(bm, V(0.092, 0.0, base + 0.205), (0.064, 0.06, 0.058))
    lump_at(bm, V(0.07, 0.0, base + 0.16), (0.05, 0.056, 0.05))
    # Its bill, short and pointed.
    limb_at(bm, (0.14, 0.0, base + 0.2), (0.182, 0.0, base + 0.194), 0.02, 0.008)
    # Its wings, folded, their tips over the root of its tail; and its tail.
    for s in SIDES:
        lump_at(bm, V(-0.03, s * 0.07, base + 0.13), (0.096, 0.024, 0.05), (0.0, -16.0, s * -6.0))
    lump_at(bm, V(-0.14, 0.0, base + 0.152), (0.085, 0.042, 0.018), (0.0, 22.0, 0.0))
    # What it sits on: its feet as one low knob.
    lump_at(bm, V(0.02, 0.0, base + 0.018), (0.06, 0.055, 0.03))
    bm = whittle('bird', bm, 0.005, 420)
    layer = bm.loops.layers.float_color.new('Color')
    paint_wood(bm, layer, 2.0, base, 0.3)
    tree = BVHTree.FromBMesh(bm)
    for s in SIDES:
        burn(bm, layer, tree, (0.118, s * 0.3, base + 0.222), (0.118, 0.0, base + 0.222), 0.0115, BURNT)
        # The feathers: three strokes down each wing.
        for k in range(3):
            burn(bm, layer, tree, (-0.06 + k * 0.045, s * 0.3, base + 0.13 - k * 0.006), (-0.06 + k * 0.045, 0.0, base + 0.13 - k * 0.006),
                 0.006, SCORCH, sides=6, long=3.6, lean=(0.5, 0.0, -1.0))
    plinth(bm, layer, 0.145, 0.1, base, 5.0)
    return done(bm, 'bird')


# --- the nisse --------------------------------------------------------------------------------------------------------
# A small round figure whose long cap droops forward over where its face would be: only the tip of a nose shows under
# the brim. No face and no beard: it is neither of the story's figures. Its arms lie down its sides, and two burnt dots
# are its buttons.

def nisse():
    base = 0.032
    bm = bmesh.new()
    lump_at(bm, V(0.0, 0.0, base + 0.05), (0.098, 0.098, 0.06))
    lump_at(bm, V(0.0, 0.0, base + 0.105), (0.088, 0.088, 0.1))
    for s in SIDES:
        lump_at(bm, V(0.014, s * 0.086, base + 0.112), (0.032, 0.027, 0.068), (s * -8.0, 0.0, 0.0))
        lump_at(bm, V(0.056, s * 0.04, base + 0.016), (0.044, 0.032, 0.02))
    # Its head, the tip of its nose, and the cap: a brim round it, and the long top that droops forward.
    lump_at(bm, V(0.004, 0.0, base + 0.222), (0.066, 0.066, 0.06))
    lump_at(bm, V(0.07, 0.0, base + 0.214), (0.022, 0.02, 0.02))
    lump_at(bm, V(0.004, 0.0, base + 0.262), (0.086, 0.086, 0.022))
    limb_at(bm, (0.002, 0.0, base + 0.27), (0.012, 0.0, base + 0.372), 0.064, 0.034)
    limb_at(bm, (0.012, 0.0, base + 0.372), (0.074, 0.0, base + 0.412), 0.034, 0.022)
    limb_at(bm, (0.074, 0.0, base + 0.412), (0.118, 0.0, base + 0.372), 0.022, 0.017)
    lump_at(bm, V(0.126, 0.0, base + 0.356), (0.024, 0.024, 0.024))
    bm = whittle('nisse', bm, 0.005, 460)
    layer = bm.loops.layers.float_color.new('Color')
    paint_wood(bm, layer, 3.0, base, 0.46)
    tree = BVHTree.FromBMesh(bm)
    for z in (0.085, 0.135):
        burn(bm, layer, tree, (0.4, 0.0, base + z), (0.0, 0.0, base + z), 0.0095, BURNT, sides=6)
    plinth(bm, layer, 0.128, 0.118, base, 7.0)
    return done(bm, 'nisse')


FIGURES = {'bird': bird, 'hare': hare, 'nisse': nisse}
for figure_name in sorted(FIGURES):
    if ONLY is None or ONLY == figure_name:  # noqa: F821
        FIGURES[figure_name]()
