"""Bredbyn's church, its separate belfry and the six far street fronts (art/baked/boot/bredbyn.glb), with their
soft shade baked into their colours: the second step of scripts/bake-bredbyn.mjs, which runs it.

The first step builds the buildings in code (art/procedural/bredbyn-*.ts) and exports them with three, plain: every
wall as bright under its eaves as in the open. Here Blender's Cycles bakes ambient occlusion into each corner's
colour, with each building's parts together on its ground, so that a wall darkens under its eaves and at its
foot, round its windows and where a tower comes up out of a roof. The church and the belfry are baked together,
as they stand together in the game; each bank of street fronts is baked by itself.

A corner's colour is all the shade a face has, and a large flat face has corners only at its ends: a wall's
corners lie under its corner boards and its plinth, where no light comes. So each face is first cut into pieces no
longer than its group's longest edge. The shade is baked on a copy cut four times finer, and each corner takes
the mean of the fine shade round it on its own surface, leaving out what lies covered under another part: a strip
of boards or a row of shingles then gives an even shade, not stripes where a corner happens to fall. Faces that
are never seen, or only edge-on, are left whole: those turned away from the street, which the game always looks
at from the south, those turned down, and those buried under another part all over, like the boards under a
roof's shingles.

It expects IN, the plain export, and OUT, where the shaded model is written; the export itself is
scripts/bake/export.py, as for every model. Headless, with the bpy module (Blender 5.2):
    python -I -c "IN='...'; OUT='...'; exec(open('art/blender/bredbyn-shade.py').read() + open('scripts/bake/export.py').read())"
or the same expression in `blender -b --python-expr`. It empties the scene first. Keep this file in plain ASCII.
"""
import math

# bpy first: with the bpy module, bmesh and mathutils come with it.
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

# Each group is baked together on its ground: (its objects, how far the shade reaches, how dark it may make a
# corner, the longest edge a face keeps). Units are the model's own: the landmarks stand at a little over half
# size in the game (src/render/view.ts), the street fronts at full size but further off.
GROUPS = [
    (('anundsjo-church', 'anundsjo-bell-tower'), 3.0, 0.85, 1.25),
    (('street-west',), 2.0, 0.8, 2.0),
    (('street-east',), 2.0, 0.8, 2.0),
]
# The fine copy's edges are a quarter of the group's longest, and a corner takes the fine shade within this much
# of the longest edge round it.
FINE = 0.25
REACH = 0.5
# A point with another part closer than this in front of it is covered: its own shade is never seen.
COVER = 0.3
# Faces turned further than this from the street (Blender's +Y is north, away from the game's camera) are not cut.
AWAY = 0.35
SAMPLES = 64
# The roughness each building was drawn with in three.
ROUGH = {'anundsjo-church': 0.96, 'anundsjo-bell-tower': 0.96, 'street-west': 0.93, 'street-east': 0.93}

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for block in (bpy.data.meshes, bpy.data.materials):
    for item in list(block):
        if item.users == 0:
            block.remove(item)

bpy.ops.import_scene.gltf(filepath=IN)  # noqa: F821 (set by the caller, see above)

MATERIALS = {}


def material(rough):
    """One material for each roughness: the colour attribute feeds the base colour, so that it is exported."""
    key = round(rough, 2)
    if key in MATERIALS:
        return MATERIALS[key]
    made = bpy.data.materials.new('bredbyn-%d' % int(key * 100))
    made.use_nodes = True
    made.use_backface_culling = True
    for node in made.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Roughness'].default_value = rough
            node.inputs['Metallic'].default_value = 0.0
            attribute = made.node_tree.nodes.new('ShaderNodeVertexColor')
            attribute.layer_name = 'Color'
            made.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])
    MATERIALS[key] = made
    return made


def covered(tree, point, normal):
    """Whether another part lies just in front of a point on a surface."""
    hit = tree.ray_cast(point + normal * 0.001, normal, COVER)
    return hit[0] is not None


def welded(obj):
    """The object's triangles as one mesh whose corners are shared wherever they lie at one place and face one way:
    the faces of a flat side become one piece, and an edge between two sides stays sharp. Colours stay on the
    corners. Each face is marked whether it is worth cutting."""
    source = obj.data
    normals = source.corner_normals
    colours = source.color_attributes['Color']
    positions = []
    keys = {}
    faces = []
    paint = []
    for poly in source.polygons:
        corners = []
        for corner in range(poly.loop_start, poly.loop_start + poly.loop_total):
            p = source.vertices[source.loops[corner].vertex_index].co
            n = normals[corner].vector
            key = (round(p.x, 4), round(p.y, 4), round(p.z, 4), round(n.x, 3), round(n.y, 3), round(n.z, 3))
            index = keys.get(key)
            if index is None:
                index = len(positions)
                keys[key] = index
                positions.append(p.copy())
            corners.append(index)
            paint.append(tuple(colours.data[corner].color))
        faces.append(corners)
    mesh = bpy.data.meshes.new(obj.name)
    mesh.from_pydata(positions, [], faces)
    colour = mesh.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
    for corner, rgba in enumerate(paint):
        colour.data[corner].color = (rgba[0], rgba[1], rgba[2], 1.0)
    mesh.shade_smooth()
    old = obj.data
    obj.data = mesh
    bpy.data.meshes.remove(old)
    mesh.materials.append(material(ROUGH.get(obj.name, 0.95)))
    # Worth cutting: turned towards the street, not down, and not covered all over.
    tree = BVHTree.FromPolygons([v.co for v in mesh.vertices], [list(p.vertices) for p in mesh.polygons])
    worth = mesh.attributes.new('worth', 'INT', 'FACE')
    for poly in mesh.polygons:
        n = poly.normal
        corners = [mesh.vertices[i].co for i in poly.vertices]
        centre = poly.center
        if n.y > AWAY or n.z < -0.5:
            worth.data[poly.index].value = 0
            continue
        probes = [centre] + [centre.lerp(c, 0.6) for c in corners]
        worth.data[poly.index].value = 0 if all(covered(tree, p, n) for p in probes) else 1
    return len(positions)


def cut(obj, longest):
    """Cuts every edge longer than `longest` in half, again and again, in the faces worth cutting. Quads are cut
    into a grid, so that a long wall is cut along its length and not needlessly across it as well."""
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    worth = bm.faces.layers.int.get('worth')
    bmesh.ops.join_triangles(bm, faces=bm.faces[:], cmp_seam=False, cmp_sharp=False, cmp_uvs=False,
                             cmp_vcols=True, cmp_materials=True, angle_face_threshold=math.radians(0.5),
                             angle_shape_threshold=math.radians(180.0))
    for _ in range(12):
        edges = [e for e in bm.edges if e.calc_length() > longest and any(f[worth] for f in e.link_faces)]
        if not edges:
            break
        bmesh.ops.subdivide_edges(bm, edges=edges, cuts=1, use_grid_fill=True, use_single_edge=False,
                                  quad_corner_type='STRAIGHT_CUT')
        # What the cutting left with more than four sides is made triangles, so the next pass can cut it again.
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.shade_smooth()


def bake(obj, seen, reach):
    """Ambient occlusion on each point of an object, baked with only `seen` and the ground to be seen."""
    scene = bpy.context.scene
    scene.world.light_settings.distance = reach
    for other in scene.objects:
        other.hide_render = other not in seen and other.name != 'bake-ground'
    mesh = obj.data
    occlusion = mesh.color_attributes.new('occlusion', 'FLOAT_COLOR', 'POINT')
    mesh.color_attributes.active_color = occlusion
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
    occlusion = mesh.color_attributes['occlusion']
    light = [min(1.0, item.color[0]) for item in occlusion.data]
    mesh.color_attributes.remove(occlusion)
    mesh.color_attributes.active_color = mesh.color_attributes['Color']
    return light


def gathered(obj, fine, light, radius):
    """Each corner of `obj` takes the mean of the fine shade within `radius` on its own surface, tent-weighted,
    leaving out fine points that are covered. A corner with none of those round it keeps its own fine shade."""
    points = fine.data.vertices
    tree = BVHTree.FromPolygons([v.co for v in points], [list(p.vertices) for p in fine.data.polygons])
    kd = KDTree(len(points))
    for v in points:
        kd.insert(v.co, v.index)
    kd.balance()
    seen = [not covered(tree, v.co, v.normal) for v in points]
    out = []
    for v in obj.data.vertices:
        total = 0.0
        weight = 0.0
        own = None
        for co, index, distance in kd.find_range(v.co, radius):
            n = points[index].normal
            if n.dot(v.normal) < 0.97 or abs((co - v.co).dot(v.normal)) > 0.02:
                continue
            if distance < 1e-4:
                own = light[index]
            if not seen[index]:
                continue
            w = 1.0 - distance / radius
            total += light[index] * w
            weight += w
        if weight > 1e-6:
            out.append(total / weight)
        elif own is not None:
            out.append(own)
        else:
            out.append(light[kd.find(v.co)[1]])
    return out


scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = SAMPLES
if scene.world is None:
    scene.world = bpy.data.worlds.new('World')

bpy.ops.mesh.primitive_plane_add(size=1.0)
ground = bpy.context.object
ground.name = 'bake-ground'

total = 0
for names, reach, strength, longest in GROUPS:
    objects = [bpy.data.objects[name] for name in names]
    for obj in objects:
        welded(obj)
    # The ground: under all of the group, at the foot of its lowest building.
    lo = [math.inf, math.inf, math.inf]
    hi = [-math.inf, -math.inf, -math.inf]
    for obj in objects:
        for corner in obj.bound_box:
            at = obj.matrix_world @ Vector(corner)
            for k in range(3):
                lo[k] = min(lo[k], at[k])
                hi[k] = max(hi[k], at[k])
    ground.location = ((lo[0] + hi[0]) / 2.0, (lo[1] + hi[1]) / 2.0, lo[2])
    ground.scale = (hi[0] - lo[0] + 60.0, hi[1] - lo[1] + 60.0, 1.0)
    for obj in objects:
        fine = obj.copy()
        fine.data = obj.data.copy()
        fine.name = obj.name + '-fine'
        for collection in obj.users_collection:
            collection.objects.link(fine)
        cut(fine, longest * FINE)
        # Baked in place of its object, beside the group's others.
        light = bake(fine, [fine] + [other for other in objects if other is not obj], reach)
        cut(obj, longest)
        shade = gathered(obj, fine, light, longest * REACH)
        data = fine.data
        bpy.data.objects.remove(fine, do_unlink=True)
        bpy.data.meshes.remove(data)
        mesh = obj.data
        colour = mesh.color_attributes['Color']
        for corner, loop in enumerate(mesh.loops):
            k = 1.0 - strength * (1.0 - shade[loop.vertex_index])
            c = colour.data[corner].color
            colour.data[corner].color = (c[0] * k, c[1] * k, c[2] * k, 1.0)
        mesh.attributes.remove(mesh.attributes['worth'])
        mesh.color_attributes.active_color = colour
        mesh.color_attributes.render_color_index = 0
        mesh.calc_loop_triangles()
        total += len(mesh.loop_triangles)
        print('  ', obj.name, len(mesh.vertices), 'points,', len(mesh.loop_triangles), 'triangles')

bpy.data.objects.remove(ground, do_unlink=True)
for obj in scene.objects:
    obj.hide_render = False
print('bredbyn shaded:', total, 'triangles')
