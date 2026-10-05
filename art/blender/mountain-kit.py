"""Builds the mountain kit: the things of Berget and of the summit at dusk (src/render/mountain-kit.ts).

  - tall: the old pine that the story walks to. Low and broad, as an old pine stands on a mountain top in the
    north: a short twisted trunk with a strip of bare silver wood winding up it, furrowed plates of bark at the
    foot and thin orange bark above, a few heavy limbs under a flat crown swept to one side, one dead limb,
    and roots that run out over the rock;
  - martall-a and -b: small crooked pines for the rim behind the path;
  - what he stands on, each with its flat tops where the chapter has them (see STANDS below): hylla-1 to -7,
    a slab of rock on the blocks it has weathered out of; la-1 to -3 and la-topp, a boulder to shelter behind
    with a step on its lee side and a flat top; rose-1 to -3, the three stacks of Topproset, the summit cairn;
  - sten-a, -b and -c: stones as the ice left them, one whole, one split in two, one a slab;
  - klapper: a cobble worn round by an old shore; lav: a cushion of reindeer lichen.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL (15 cm); Blender's Z is up, and
a part's front faces -Y, which is towards the camera in the game. Every part is an object of its own, named as
the game asks for it.

Nothing here has a texture. A part's colours are painted on its corners (the colour attribute "Color"), with
the shade of its own corners and creases baked into them.

A pine's needles are one shoot, `skott`, set many times. Where a tree's shoots stand is a part of its own,
named after the tree with `-skott`: a small triangle for each shoot (see `shoots_of`).

Nothing in this model comes from anyone else. Keep this file in plain ASCII: it is sent to Blender as text.
The server's safe mode allows no classes and no functions passed as values, so shapes are given as tables.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2.0

# For looking at a few parts while working on them, a first line may set ONLY to their names.
try:
    ONLY
except NameError:
    ONLY = None

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)


# --- what he stands on, from the chapter ---------------------------------------------------------------------
# Each is (name, how wide its flat top is, how high the top is over the ground, how far under the top a second
# flat top lies or 0, and up to what height over the ground it keeps clear of what stands by the path there).
# src/content/chapters/berget.ts has the same numbers, and tests/unit/mountain-kit.test.ts holds the two
# together: change a shelf there, change it here and build the kit again.
STANDS = (
    # The rock shelves: four rising along the rock, two level, and the far one beyond the ring. A big candy
    # stands under the fifth, and a cobble that rings lies under each of the last two.
    ('hylla-1', 1.4, 0.9, 0.0, 0.0),
    ('hylla-2', 1.4, 1.8, 0.0, 0.0),
    ('hylla-3', 1.4, 1.5, 0.0, 0.0),
    ('hylla-4', 1.6, 2.4, 0.0, 0.0),
    ('hylla-5', 2.0, 2.4, 0.0, 1.7),
    ('hylla-6', 1.6, 2.4, 0.0, 0.9),
    ('hylla-7', 2.4, 2.0, 0.0, 0.9),
    # The boulders of the open granite: a low shelf in the lee and a high one on top; the last has its top only.
    ('la-1', 1.2, 1.8, 0.9, 0.0),
    ('la-2', 1.2, 1.8, 0.9, 0.0),
    ('la-3', 1.2, 1.8, 0.9, 0.0),
    ('la-topp', 1.2, 1.8, 0.0, 0.0),
    # Topproset: three stacks, each with a step at its top, and the two lower ones with a step half way up.
    # A big candy stands by the second and the memory by the first.
    ('rose-1', 1.6, 5.7, 3.8, 1.7),
    ('rose-2', 1.6, 7.6, 3.8, 1.7),
    ('rose-3', 1.9, 9.5, 0.0, 1.7),
)
# How far behind the play plane everything stands that holds up what he stands on: the trail's candy hangs in
# the plane, and he and the ghost walk in it. Only the flat tops themselves reach out to it.
BACK = 0.42
# And how far where something stands by the path (a big candy, a cobble, the memory), up to the height the
# row's last number gives: those stand a little behind the plane, and nothing may hide them.
CLEAR = 1.15
# How deep a thing he stands on is, from the play plane back: as a ledge in src/render/ledges.ts.
DEPTH = 0.9
# How far under its ground everything that stands goes: the ground is not level everywhere.
SUNK = 1.4


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


def dim(colour, k):
    return (colour[0] * k, colour[1] * k, colour[2] * k)


def step(a, b, x):
    """0 under a, 1 over b, and smooth between."""
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


# A fixed sequence of numbers from 0 to 1: the same kit every time it is built.
STATE = [1]


def start(n):
    STATE[0] = (n * 2654435761 + 97) % 4294967296
    rnd()
    rnd()


def rnd():
    STATE[0] = (STATE[0] * 1664525 + 1013904223) % 4294967296
    return STATE[0] / 4294967296.0


def between(a, b):
    return a + (b - a) * rnd()


def hash3(x, y, z):
    s = math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
    return s - math.floor(s)


def noise(p, scale=1.0):
    """Smooth noise from 0 to 1 at a point."""
    x = p[0] * scale
    y = p[1] * scale
    z = p[2] * scale
    xi = math.floor(x)
    yi = math.floor(y)
    zi = math.floor(z)
    u = x - xi
    v = y - yi
    w = z - zi
    u = u * u * (3.0 - 2.0 * u)
    v = v * v * (3.0 - 2.0 * v)
    w = w * w * (3.0 - 2.0 * w)
    total = 0.0
    for k in range(8):
        dx = k % 2
        dy = (k // 2) % 2
        dz = k // 4
        total += hash3(xi + dx, yi + dy, zi + dz) * (u if dx else 1.0 - u) * (v if dy else 1.0 - v) * (w if dz else 1.0 - w)
    return total


# The granite of the ground (src/render/dressing/ground.ts): the same four greys.
GRANITE = (tone('#8f939d'), tone('#a4a8b2'), tone('#bcbfc6'), tone('#d6d5d6'))
# The pale crust of lichen on what faces the sky, and what the shade goes towards: cool, never black.
CRUST = tone('#d9d6c6')
DEEP = tone('#46527e')
MAP_LICHEN = tone('#a9b06a')

# The one material: the colour attribute feeds the base colour, so that the exporter writes COLOR_0.
MATERIAL = bpy.data.materials.new('mountain')
MATERIAL.use_nodes = True
for node in MATERIAL.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.92
        attribute = MATERIAL.node_tree.nodes.new('ShaderNodeVertexColor')
        attribute.layer_name = 'Color'
        MATERIAL.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])


# --- building ------------------------------------------------------------------------------------------------

def new_part():
    """One part while it is being built: its mesh, the layer its corners are painted in, and the faces of it
    that are wood: a tree's stem is cut in flat faces with edges between them, and its needles are soft."""
    bm = bmesh.new()
    return {'bm': bm, 'colour': bm.loops.layers.float_color.new('Color'), 'hard': []}


def paint(part, faces, rgb):
    for face in faces:
        for loop in face.loops:
            loop[part['colour']] = (rgb[0], rgb[1], rgb[2], 1.0)


def take(part, piece, matrix=None):
    """Moves a piece that was built by itself into a part, placed by `matrix`."""
    mesh = bpy.data.meshes.new('piece')
    piece['bm'].to_mesh(mesh)
    piece['bm'].free()
    if matrix is not None:
        mesh.transform(matrix)
    part['bm'].from_mesh(mesh)
    bpy.data.meshes.remove(mesh)


def finish(part, name, shade=0.7, ground=None, rock=True, sharp=40.0, normals=None):
    """Makes the object. Rock gets the normals of its large faces on their corners, so that a face is flat and
    only its worn edge is round. `ground` is the height it stands on, for the shade at its foot. `normals`
    gives each point the direction it is lit from, where that is not the way its faces lie."""
    bm = part['bm']
    for item in bm.faces:
        item.smooth = True
    if normals is None:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        normals = []
    else:
        rock = True
    bm.normal_update()
    if rock and not normals:
        for vert in bm.verts:
            total = Vector((0.0, 0.0, 0.0))
            for item in vert.link_faces:
                total += item.normal * item.calc_area() ** 2
            if total.length < 1e-12:
                total = vert.normal.copy()
            total.normalize()
            normals.append(total)
    if not rock:
        hard = set(part['hard'])
        for edge in bm.edges:
            faces = edge.link_faces
            edge.smooth = not (len(faces) == 2 and faces[0] in hard and faces[1] in hard and edge.calc_face_angle(0.0) > math.radians(sharp))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    if rock:
        mesh.normals_split_custom_set_from_vertices(normals)
    mesh.materials.append(MATERIAL)
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = shade
    made['ground'] = -1000.0 if ground is None else ground
    return made


def wanted(name):
    return ONLY is None or name in ONLY


# --- stone ---------------------------------------------------------------------------------------------------

def hull(piece, points):
    """The smallest shape with no hollow that holds these points."""
    bm = piece['bm']
    bmesh.ops.delete(bm, geom=bm.faces[:], context='FACES_ONLY')
    for edge in bm.edges[:]:
        bm.edges.remove(edge)
    verts = bm.verts[:] + [bm.verts.new(point) for point in points]
    made = bmesh.ops.convex_hull(bm, input=verts)
    inside = list(set([item for item in made['geom_interior'] + made['geom_unused'] if isinstance(item, bmesh.types.BMVert)]))
    if inside:
        bmesh.ops.delete(bm, geom=inside, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


def cut(piece, at, out):
    """Breaks off what lies beyond a plane: a face where the rock has split."""
    bm = piece['bm']
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], dist=0.0005, plane_co=Vector(at), plane_no=Vector(out).normalized(), clear_outer=True)
    hull(piece, [])


def facets(piece, angle=10.0):
    """Faces that lie nearly in one plane become one face."""
    bm = piece['bm']
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(angle), verts=bm.verts[:], edges=bm.edges[:])


def wear(piece, offset, segments=1):
    """Every edge worn round."""
    bm = piece['bm']
    if offset <= 0.0:
        return
    bmesh.ops.bevel(bm, geom=bm.edges[:], offset=offset, offset_type='OFFSET', segments=segments, profile=0.5, affect='EDGES', clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])


def boulder(key, radii, points=16, breaks=2, bevel=0.08, segments=1, flat=None):
    """A stone as the ice left it: a round lump with a few faces where it has split. `flat` cuts it level at
    that height."""
    start(key)
    piece = new_part()
    cloud = []
    for i in range(points):
        # Points spread over a ball, some of them nearer its middle.
        z = between(-1.0, 1.0)
        turn = rnd() * TAU
        ring = math.sqrt(max(0.0, 1.0 - z * z))
        far = between(0.72, 1.0)
        cloud.append((ring * math.cos(turn) * radii[0] * far, ring * math.sin(turn) * radii[1] * far, z * radii[2] * far))
    hull(piece, cloud)
    for i in range(breaks):
        z = between(-0.35, 0.75)
        turn = rnd() * TAU
        ring = math.sqrt(max(0.0, 1.0 - z * z))
        out = Vector((ring * math.cos(turn), ring * math.sin(turn), z))
        reach = between(0.5, 0.72)
        cut(piece, (out[0] * radii[0] * reach, out[1] * radii[1] * reach, out[2] * radii[2] * reach), (out[0] / radii[0], out[1] / radii[1], out[2] / radii[2]))
    if flat is not None:
        cut(piece, (0.0, 0.0, flat), (0.0, 0.0, 1.0))
    facets(piece)
    wear(piece, bevel, segments)
    return piece


def ring_of(corners, radii, centre, jitter, turn=0.0):
    """An outline of so many corners round an oval, each pushed in or out a little."""
    out = []
    for i in range(corners):
        angle = turn + TAU * (i + between(-0.22, 0.22)) / corners
        far = 1.0 + between(-jitter, jitter)
        out.append((centre[0] + math.cos(angle) * radii[0] * far, centre[1] + math.sin(angle) * radii[1] * far))
    return out


def prism(top, bottom, z1, z0, tilt=0.0):
    """A stone between two outlines with as many corners, the upper one at z1 and the lower at z0. With
    `tilt` neither is quite level; without it the top is flat."""
    piece = new_part()
    bm = piece['bm']
    count = len(top)
    upper = []
    lower = []
    for i in range(count):
        upper.append(bm.verts.new((top[i][0], top[i][1], z1 + (between(-tilt, tilt) if tilt > 0.0 else 0.0))))
        lower.append(bm.verts.new((bottom[i][0], bottom[i][1], z0 + (between(-tilt, tilt) if tilt > 0.0 else 0.0))))
    bm.faces.new(upper)
    bm.faces.new(list(reversed(lower)))
    for i in range(count):
        k = (i + 1) % count
        bm.faces.new((upper[i], lower[i], lower[k], upper[k]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    return piece


def granite(piece, key, crust=0.5, foot=None, lip=None, light=1.0):
    """Paints a stone as granite: each face in a grey of its own, a pale crust of lichen on what faces the
    sky, the damp dark at its foot, and with `lip` (a height) a pale line along the edge he walks on.
    A point has one colour, that of the largest face it lies on: a worn edge goes from one face's grey to the
    next one's, and the stone's points are shared between its faces."""
    bm = piece['bm']
    layer = piece['colour']
    bm.normal_update()
    own = hash3(key * 0.37, 1.7, 4.1) * 1.3 + 0.5
    for vert in bm.verts:
        face = None
        most = -1.0
        for item in vert.link_faces:
            area = item.calc_area()
            if area > most:
                most = area
                face = item
        if face is None:
            continue
        centre = face.calc_center_median()
        at = own + (hash3(centre[0] * 9.1 + key, centre[1] * 7.7, centre[2] * 8.3) - 0.5) * 1.1 + (noise(centre, 0.8) - 0.5) * 1.0
        at = max(0.0, min(2.999, at))
        co = vert.co
        up = face.normal[2]
        c = dim(blend(GRANITE[int(at)], GRANITE[int(at) + 1], at - int(at)), 0.93 + 0.14 * noise(co, 2.6))
        c = blend(c, CRUST, step(0.4, 0.95, up) * crust * (0.45 + 1.1 * noise(co + Vector((key, 0.0, 0.0)), 1.7)))
        if noise(co + Vector((3.0, key, 9.0)), 3.1) > 0.78 and up > 0.2:
            c = blend(c, MAP_LICHEN, 0.35 * crust)
        if foot is not None:
            low = 1.0 - step(0.0, 0.45, co[2] - foot)
            c = blend(c, dim(blend(c, DEEP, 0.35), 0.6), low)
        if lip is not None and up > 0.9 and co[2] > lip - 0.01 and co[1] < 0.12:
            c = blend(c, (1.0, 1.0, 1.0), 0.4)
        # Its own shade: what faces the ground sees little of the sky. (The baked shade knows only a face's
        # corners, and on a stone among stones every corner lies in a joint.)
        c = dim(blend(c, DEEP, 0.3 * (1.0 - step(-0.9, 0.2, up))), light * (0.66 + 0.34 * step(-0.9, 0.2, up)))
        for loop in vert.link_loops:
            loop[layer] = (c[0], c[1], c[2], 1.0)


def tongue(wide, key, deep=DEPTH, flare=0.03):
    """The outline of a flat top he stands on, seen from above: its front edge is straight, on the play plane
    and as wide as the chapter says, and the rest of it is behind that, as the rock happened to break."""
    start(key)
    half = wide / 2.0
    back = deep + between(0.0, 0.2)
    return [
        (-half, 0.0), (half, 0.0),
        (half + between(0.0, flare), between(0.24, 0.36)),
        (half - between(0.04, 0.16), between(0.52, 0.68)),
        (half - between(0.25, 0.5), back - between(0.0, 0.12)),
        (between(-0.3, 0.3) * half, back + between(0.02, 0.16)),
        (-half + between(0.25, 0.5), back - between(0.0, 0.14)),
        (-half + between(0.04, 0.16), between(0.52, 0.68)),
        (-half - between(0.0, flare), between(0.24, 0.36)),
    ]


def topped(outline, top, thick, spread=1.0, back=0.06, centre=None, bevel=0.045, loose=0.25):
    """A stone with a level top of this outline at this height: under the top it is as the rock broke, `thick`
    deep, drawn in or spread out by `spread`, and nowhere in front of `back`."""
    piece = new_part()
    points = [(point[0], point[1], top) for point in outline]
    if centre is None:
        centre = (0.0, 0.0)
        for point in outline:
            centre = (centre[0] + point[0] / len(outline), centre[1] + point[1] / len(outline))
    for point in outline:
        far = spread * between(1.0 - loose * 0.4, 1.0 + loose * 0.4)
        points.append((centre[0] + (point[0] - centre[0]) * far, max(back, centre[1] + (point[1] - centre[1]) * far), top - thick * between(1.0 - loose, 1.0)))
    hull(piece, points)
    facets(piece)
    wear(piece, bevel)
    return piece


def slab(part, wide, key, top, thick, deep=DEPTH, crust=0.6, foot=None, light=1.06):
    """A flat stone he stands on: its top level at `top`, its front edge on the play plane. It is a little
    paler than what it lies on, so that it is seen to be a place to stand."""
    # Its underside begins well behind the play plane: its edge there is thin, and hides little of him.
    piece = topped(tongue(wide, key, deep), top, thick, 0.92, 0.3)
    granite(piece, key, crust, foot, top, light)
    take(part, piece)


def chunk(part, key, centre, size, bevel=0.08, crust=0.35, foot=None, front=None, turn=0.2, bulges=3):
    """One of the blocks a rock has weathered into: a box that has lost its corners, none of its faces quite
    square to another. `front` keeps all of it behind that depth."""
    start(key)
    piece = new_part()
    points = []
    for k in range(8):
        points.append(((-0.5 if k % 2 == 0 else 0.5) * size[0] * between(0.8, 1.0), (-0.5 if (k // 2) % 2 == 0 else 0.5) * size[1] * between(0.8, 1.0), (-0.5 if k // 4 == 0 else 0.5) * size[2] * between(0.86, 1.0)))
    for k in range(bulges):
        # A bulge on a face or two.
        axis = int(rnd() * 3) % 3
        point = [between(-0.3, 0.3) * size[0], between(-0.3, 0.3) * size[1], between(-0.3, 0.3) * size[2]]
        point[axis] = (0.5 if rnd() < 0.5 else -0.5) * size[axis] * between(0.98, 1.06)
        points.append(tuple(point))
    hull(piece, points)
    facets(piece)
    wear(piece, bevel)
    bm = piece['bm']
    bmesh.ops.transform(bm, matrix=Matrix.Translation(centre) @ Matrix.Rotation(between(-turn, turn), 4, 'Z') @ Matrix.Rotation(between(-0.05, 0.05), 4, 'X') @ Matrix.Rotation(between(-0.05, 0.05), 4, 'Y'), verts=bm.verts[:])
    if front is not None:
        for vert in bm.verts:
            if vert.co[1] < front:
                vert.co[1] = front
    granite(piece, key, crust, foot)
    take(part, piece)


def rubble(part, key, places, foot, back):
    """Small stones lying where they fell, each given as (x, y, size) and none nearer the play plane than
    `back`: too small to have worn edges."""
    for i in range(len(places)):
        spot = places[i]
        size = spot[2]
        piece = boulder(key + i * 13, (size, size * 0.85, size * 0.65), 8, 1, 0.0)
        granite(piece, key + i, 0.4, -size * 0.75)
        take(part, piece, Matrix.Translation((spot[0], max(back + size, spot[1]), foot + size * 0.25)) @ Matrix.Rotation(hash3(key, i, 2.0) * TAU, 4, 'Z'))


def pile(part, key, top, low, ground, left0, right0, left1, right1, depth0, depth1, front, tall0, tall1, bevel, bulges, crust, clear=0.0):
    """Blocks in courses from `top` down to `low`: each course reaches from the left to the right, as wide and
    as deep as its height says between the pile's top (the 0s) and the ground (the 1s), and is one block or two.
    All of it stands `front` behind the play plane, and under `clear` over the ground it stands CLEAR behind
    it: what is over that rests on what is under, and reaches out past it."""
    start(key)
    z = top
    course = 0
    edge = ground + clear
    while z > low + 0.25:
        tall = min(between(tall0, tall1), z - low)
        if z - tall - low < 0.35:
            tall = z - low
        # A course ends where the pile steps back.
        if clear > 0.0 and z > edge + 0.05 and z - tall < edge + 0.3:
            tall = z - edge
        under = clear > 0.0 and z <= edge + 0.05
        back = CLEAR if under else front
        down = min(1.0, max(0.0, (top - z + tall * 0.5) / max(0.4, top - ground)))
        left = left0 + (left1 - left0) * down + between(-0.07, 0.07)
        right = right0 + (right1 - right0) * down + between(-0.07, 0.07)
        depth = depth0 + (depth1 - depth0) * down + (CLEAR - front + 0.1 if clear > 0.0 and not under else 0.0)
        near = back + between(0.0, 0.06)
        middle_z = z - tall / 2.0
        two = right - left > 1.55 and rnd() < 0.72
        share = between(0.34, 0.66)
        nudge = (between(0.0, 0.1), between(0.0, 0.14), between(-0.02, 0.02), between(-0.02, 0.02), between(0.82, 1.0), between(0.82, 1.0), between(0.95, 1.08), between(0.95, 1.08))
        if two:
            middle = left + (right - left) * share
            chunk(part, key + course * 7 + 1, ((left + middle) / 2.0 + 0.03, near + depth * 0.5 + nudge[0], middle_z + nudge[2]), (middle - left + 0.12, depth * nudge[4], tall * nudge[6] + 0.04), bevel, crust, ground, back, 0.16, bulges)
            chunk(part, key + course * 7 + 2, ((middle + right) / 2.0 - 0.03, near + depth * 0.5 + nudge[1], middle_z + nudge[3]), (right - middle + 0.12, depth * nudge[5], tall * nudge[7] + 0.04), bevel, crust, ground, back, 0.16, bulges)
        else:
            chunk(part, key + course * 7 + 3, ((left + right) / 2.0, near + depth * 0.5, middle_z), (right - left, depth, tall + 0.05), bevel, crust, ground, back, 0.1, bulges)
        z -= tall
        course += 1
        start(key + course * 3)


# A slab on the blocks it has weathered out of: the rock shelves.
def shelf(name, wide, drop, key, clear):
    part = new_part()
    thick = 0.27
    slab(part, wide, key, 0.0, thick, 1.6 if clear > 0.0 else DEPTH + 0.15)
    start(key + 5)
    lean = between(-0.12, 0.12)
    # Under it the blocks are narrower than the slab at its top and wider than it at the ground.
    pile(part, key + 6, -thick + 0.04, -drop - SUNK, -drop,
         -wide * 0.36 + lean, wide * 0.36 + lean, -wide * 0.5 - 0.22, wide * 0.5 + 0.22, 0.75, 1.25, BACK, 0.62, 1.15, 0.09, 3, 0.3, clear)
    start(key + 9)
    rubble(part, key + 11, (
        (-wide / 2.0 - between(0.25, 0.5), between(0.6, 0.9), between(0.2, 0.3)),
        (wide / 2.0 + between(0.25, 0.5), between(0.7, 1.1), between(0.18, 0.32)),
        (wide / 2.0 + between(0.5, 0.8), between(1.3, 1.7), between(0.12, 0.2)),
    ), -drop, CLEAR if clear > 0.0 else BACK)
    return finish(part, name, 0.28, -drop)


# A boulder to shelter behind. On its lee side, which faces him, a block has split off, and a plate of it
# juts out as a step; the boulder's own flat top juts out over that. Both are flat exactly as wide as the
# chapter's shelves. `side` is which side of it a smaller stone leans on.
def lee(name, wide, high, low, key, side):
    part = new_part()
    start(key)
    lean = between(-0.14, 0.14)
    radii = (between(1.14, 1.3), between(0.84, 0.98), 1.25)
    body = boulder(key, radii, 20, 3, 0.1, 1, 0.96)
    granite(body, key, 0.45, -0.72)
    take(part, body, Matrix.Translation((lean, BACK + 0.08 + radii[1], 0.72)))
    # The top: a thick plate of the same rock, as wide as its shelf where he stands and no wider behind.
    plate = topped(tongue(wide, key + 3, 1.75), high, 0.4, 1.22, 0.3, (lean * 0.6, 1.0), 0.05, 0.2)
    granite(plate, key + 1, 0.7, None, high, 1.06)
    take(part, plate)
    if low > 0.0:
        # The step: a plate on the block that has split from the boulder's face and stands before it.
        slab(part, wide, key + 4, high - low, 0.25, 1.05)
        stair = topped(under_of(tongue(wide, key + 5, 0.75)), high - low - 0.2, high - low + SUNK * 0.4, 1.14, BACK, (lean * 0.3, 0.9), 0.05, 0.12)
        granite(stair, key + 2, 0.4, 0.0)
        take(part, stair)
    # A smaller stone leaning on it, to one side: no two boulders have the same outline.
    start(key + 6)
    size = between(0.45, 0.66)
    place = (side * between(1.2, 1.45), between(1.7, 2.0), size * 0.4)
    mate = boulder(key + 8, (size, size * 0.85, size * 0.9), 10, 2, 0.06)
    granite(mate, key + 4, 0.5, -size * 0.6)
    take(part, mate, Matrix.Translation(place))
    # Built from the ground up; like everything he stands on, it has its top at the origin.
    bmesh.ops.translate(part['bm'], vec=Vector((0.0, 0.0, -high)), verts=part['bm'].verts[:])
    return finish(part, name, 0.28, -high)


def under_of(outline):
    """An outline moved back from the play plane, for what holds up a plate of that outline."""
    return [(point[0] * 0.92, point[1] + BACK) for point in outline]


# One stack of the summit cairn: flat round stones laid on one another by hand. The step at its top is its
# capstone, and a step half way up is one of its stones; each reaches out to the play plane over a stone that
# reaches half as far. `grow` is how much wider it is at the ground than at its top, to the left and right.
def stack(name, wide, drop, lower, key, grow, marker=False):
    part = new_part()
    thick = 0.4
    for top in ((0.0, lower) if lower > 0.0 else (0.0,)):
        slab(part, wide, key + int(top * 3.0), -top, thick, 1.8, 0.8, None, 1.14)
        start(key + 30 + int(top * 3.0))
        chunk(part, key + 31 + int(top * 3.0), (between(-0.12, 0.12), 0.5 + 0.62, -top - thick - 0.19), (wide * between(0.7, 0.82), 1.25, 0.44), 0.12, 0.4, None, 0.5, 0.12, 0)
    pile(part, key + 2, -thick + 0.05, -drop - 0.5, -drop,
         -wide * 0.5 - 0.02, wide * 0.5 + 0.02, -wide * 0.5 - 0.02 - grow[0], wide * 0.5 + 0.02 + grow[1], 1.25, 1.75, CLEAR, 0.36, 0.86, 0.13, 0, 0.5)
    if marker:
        # The mark on the summit: a few small stones on the capstone, behind where he stands.
        z = 0.0
        for i in range(4):
            start(key + 60 + i)
            size = 0.36 - i * 0.065
            tall = size * between(0.55, 0.7)
            chunk(part, key + 40 + i, (0.32 + between(-0.05, 0.05), 1.3 + between(-0.04, 0.04), z + tall / 2.0 - 0.015), (size * 2.0, size * 1.6, tall), tall * 0.28, 0.5, None, 0.9, 0.6, 0)
            z += tall - 0.03
    start(key + 20)
    stones = [
        (wide / 2.0 + grow[1] + between(0.1, 0.35), between(1.4, 1.9), between(0.2, 0.34)),
        (between(-0.2, 0.3) * wide, between(1.2, 1.3), between(0.16, 0.24)),
    ]
    if grow[0] > 0.2:
        stones.append((-wide / 2.0 - grow[0] - between(0.1, 0.3), between(1.4, 1.8), between(0.22, 0.32)))
    rubble(part, key + 21, stones, -drop, CLEAR)
    return finish(part, name, 0.28, -drop)


for row in STANDS:
    if not wanted(row[0]):
        continue
    number = int(row[0][-1]) if row[0][-1].isdigit() else 9
    if row[0].startswith('hylla'):
        made = shelf(row[0], row[1], row[2], 100 + number * 17, row[4])
    elif row[0].startswith('la'):
        # The first boulder has a big candy standing to its left: its smaller stone leans on its right.
        made = lee(row[0], row[1], row[2], row[3], 300 + number * 23, 1.0 if number % 2 == 1 else -1.0)
    else:
        made = stack(row[0], row[1], row[2], row[3], 500 + number * 31, ((0.3, 0.25), (0.25, 0.3), (0.0, 0.45))[number - 1], number == 3)
    # What the game matches it to the chapter by.
    made['wide'] = row[1]
    made['drop'] = row[2]
    made['step'] = row[3]


# --- stones, cobbles and lichen ------------------------------------------------------------------------------
# Each is about one length across, with its middle at the origin: the game turns it, sinks it and paints the
# lichen on whatever side ends up facing the sky.

if wanted('sten-a'):
    part = new_part()
    piece = boulder(41, (1.0, 0.82, 0.72), 18, 3, 0.08, 1)
    granite(piece, 41, 0.0)
    take(part, piece)
    finish(part, 'sten-a', 0.7)

if wanted('sten-b'):
    # Split in two by the frost, the halves a finger apart.
    part = new_part()
    for half in (-1.0, 1.0):
        piece = boulder(57, (1.0, 0.86, 0.78), 16, 2, 0.0)
        cut(piece, (half * -0.04, 0.0, 0.0), (-half, 0.18 * half, 0.1))
        facets(piece)
        wear(piece, 0.06, 1)
        granite(piece, 57 + (1 if half > 0 else 0), 0.0)
        take(part, piece, Matrix.Translation((half * 0.05, 0.0, 0.0)) @ Matrix.Rotation(half * 0.05, 4, 'Y'))
    finish(part, 'sten-b', 0.8)

if wanted('sten-c'):
    # A slab: broad and low, lying nearly level.
    part = new_part()
    start(73)
    top = ring_of(8, (1.0, 0.74), (0.0, 0.0), 0.16)
    piece = prism(top, [(point[0] * 1.06, point[1] * 1.04) for point in top], 0.24, -0.26, 0.05)
    wear(piece, 0.08, 1)
    granite(piece, 73, 0.0)
    take(part, piece)
    finish(part, 'sten-c', 0.7)

if wanted('klapper'):
    # A cobble: an egg of pale stone, smooth, with a vein of quartz round it.
    part = new_part()
    bm = part['bm']
    made = bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    for vert in made['verts']:
        co = vert.co
        swell = 0.93 + 0.14 * noise(co, 1.3)
        vert.co = Vector((co[0] * swell, co[1] * 0.78 * swell, co[2] * 0.6 * swell))
    for item in bm.faces:
        for loop in item.loops:
            co = loop.vert.co
            c = dim(tone('#d8d6cf'), 0.9 + 0.14 * noise(co, 2.1))
            vein = abs(co[0] * 0.5 + co[1] * 0.2 + co[2] * 0.9 - 0.12)
            c = blend(c, tone('#fbf9f2'), 1.0 - step(0.05, 0.13, vein))
            loop[part['colour']] = (c[0], c[1], c[2], 1.0)
    finish(part, 'klapper', 0.35, None, False, 80.0)

if wanted('lav'):
    # Reindeer lichen: a pale cushion as high as his knee, branching like a small bare shrub. Its base is on
    # the ground at the origin, and it is one across.
    part = new_part()
    bm = part['bm']
    layer = part['colour']
    start(88)
    pale = tone('#f4f3e4')
    grey = tone('#bfc6b0')
    sides = 6
    rings = []
    for level in ((0.5, -0.06), (0.44, 0.17), (0.26, 0.31)):
        rings.append([bm.verts.new((math.cos(TAU * j / sides) * level[0] * between(0.85, 1.1), math.sin(TAU * j / sides) * level[0] * between(0.85, 1.1), level[1])) for j in range(sides)])
    tip = bm.verts.new((0.0, 0.0, 0.36))
    faces = []
    for i in range(2):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append(bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])))
    for j in range(sides):
        faces.append(bm.faces.new((rings[2][j], rings[2][(j + 1) % sides], tip)))
    for item in faces:
        for loop in item.loops:
            c = blend(grey, pale, step(0.0, 0.3, loop.vert.co[2]))
            loop[layer] = (c[0], c[1], c[2], 1.0)
    # Its branch ends: short blunt prongs standing out of it in pairs, as the lichen forks.
    for k in range(11):
        turn = k * 2.399963 + rnd() * 0.5
        tilt = 0.15 + 1.25 * math.sqrt((k + 0.5) / 11.0)
        out = Vector((math.cos(turn) * math.sin(tilt), math.sin(turn) * math.sin(tilt), math.cos(tilt)))
        foot = Vector((out[0] * 0.38, out[1] * 0.38, 0.08 + out[2] * 0.24))
        side = out.cross(Vector((0.3, 0.2, 0.9))).normalized()
        for fork in (-1.0, 1.0):
            towards = (out + side * fork * 0.5 + Vector((0.0, 0.0, 0.2))).normalized()
            across_it = towards.cross(side).normalized()
            long = between(0.11, 0.17)
            base = [bm.verts.new(foot + side * fork * 0.05 + (side * math.cos(TAU * n / 3.0) + across_it * math.sin(TAU * n / 3.0)) * 0.085) for n in range(3)]
            point = bm.verts.new(foot + side * fork * 0.05 + towards * long)
            for n in range(3):
                made = bm.faces.new((base[n], base[(n + 1) % 3], point))
                loops = made.loops
                loops[0][layer] = (pale[0] * 0.9, pale[1] * 0.9, pale[2] * 0.9, 1.0)
                loops[1][layer] = (pale[0] * 0.9, pale[1] * 0.9, pale[2] * 0.9, 1.0)
                loops[2][layer] = (pale[0], pale[1], pale[2], 1.0)
    finish(part, 'lav', 0.45, 0.0, False, 60.0)


# --- pines ---------------------------------------------------------------------------------------------------

# Bark at an old pine's foot: thick plates, grey-brown, with dark furrows between them. Higher up it is thin
# and orange and flakes off. Where the bark is gone the wood is silver.
PLATE = (tone('#7d6657'), tone('#a58470'))
FURROW = tone('#3f342e')
ORANGE = (tone('#a0683f'), tone('#bf8b5c'))
SILVER = (tone('#77756f'), tone('#aeaaa1'), tone('#d8d4ca'))
TWIG = tone('#5e4c40')
NEEDLE = (tone('#1c3019'), tone('#2f4c27'), tone('#56732f'), tone('#8f9c48'))


def smooth(points, steps, crook=0.0, key=0.0):
    """A curve through points, as more points: `steps` to each stretch. `crook` bends it out of true between
    its ends, as a limb grows."""
    out = []
    count = len(points)
    for i in range(count - 1):
        p0 = points[max(i - 1, 0)]
        p1 = points[i]
        p2 = points[i + 1]
        p3 = points[min(i + 2, count - 1)]
        for s in range(steps):
            t = s / steps
            at = []
            for k in range(3):
                at.append(0.5 * (2.0 * p1[k] + (p2[k] - p0[k]) * t + (2.0 * p0[k] - 5.0 * p1[k] + 4.0 * p2[k] - p3[k]) * t * t
                                 + (3.0 * p1[k] - p0[k] - 3.0 * p2[k] + p3[k]) * t * t * t))
            out.append(Vector(at))
    out.append(Vector(points[-1]))
    if crook > 0.0:
        for i in range(1, len(out) - 1):
            share = math.sin(math.pi * i / (len(out) - 1.0)) ** 0.5
            at = out[i] * 1.0
            out[i] = at + Vector((noise(at + Vector((key, 0.0, 0.0)), 1.1) - 0.5, noise(at + Vector((0.0, key, 5.0)), 1.1) - 0.5, (noise(at + Vector((9.0, 0.0, key)), 1.1) - 0.5) * 0.7)) * (2.0 * crook * share)
    return out


def spread(values, count):
    """Values given at even steps along something, read at `count` even steps."""
    out = []
    for i in range(count):
        at = i * (len(values) - 1) / max(1, count - 1)
        k = min(len(values) - 2, int(at))
        out.append(values[k] + (values[k + 1] - values[k]) * (at - k))
    return out


def across(path):
    """Two directions square to a path at each of its points, turning as little as the path lets them."""
    out = []
    ahead = (path[1] - path[0]).normalized()
    side = Vector((1.0, 0.0, 0.0)) if abs(ahead[0]) < 0.8 else Vector((0.0, 1.0, 0.0))
    for i in range(len(path)):
        ahead = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        side = (side - ahead * side.dot(ahead)).normalized()
        out.append((side.copy(), ahead.cross(side)))
    return out


def wood(kind, at, angle, thin):
    """The colour of wood or bark at a place: `angle` is where round its limb, and `thin` how thin the limb
    is there, from 0 to 1."""
    grain = noise(at, 2.3)
    if kind == 'dead':
        streak = hash3(math.floor(angle * 4.0), 3.0, 1.0)
        c = blend(SILVER[0], SILVER[1], 0.15 + 0.85 * streak)
        return blend(c, SILVER[2], step(0.5, 0.85, grain))
    if kind == 'twig':
        return dim(TWIG, 0.75 + 0.5 * grain)
    if kind == 'root':
        c = blend(PLATE[0], PLATE[1], grain)
        c = blend(c, FURROW, step(0.55, 0.8, noise(at, 5.0)) * 0.75)
        return blend(c, SILVER[1], thin * step(0.4, 0.7, noise(at, 1.6)) * 0.8)
    if kind == 'stem':
        # A young pine's stem: grey-brown plates below, going orange towards its top.
        c = blend(PLATE[0], PLATE[1], grain)
        c = blend(c, FURROW, step(0.55, 0.8, noise(at, 5.0)) * 0.6)
        return blend(c, blend(ORANGE[0], ORANGE[1], grain), step(0.25, 0.7, thin))
    # A limb: orange where young bark shows, in patches between plates of older bark; browner towards its twigs.
    c = blend(ORANGE[0], ORANGE[1], step(0.3, 0.75, grain))
    c = blend(c, PLATE[0], step(0.5, 0.72, noise(at, 1.2)) * 0.75 * (1.0 - thin))
    c = blend(c, FURROW, step(0.6, 0.86, noise(at, 4.6)) * 0.6)
    return blend(c, TWIG, step(0.45, 1.0, thin))


def limb(part, path, radii, sides, kind, lobes=0.0, tip=True):
    """A round limb along a path, as thick at each point as `radii` says, closed at both ends."""
    bm = part['bm']
    layer = part['colour']
    frames = across(path)
    count = len(path)
    thick = max(radii)
    rings = []
    faces = []
    for i in range(count):
        ring = []
        for j in range(sides):
            angle = TAU * j / sides
            there = path[i] + (frames[i][0] * math.cos(angle) + frames[i][1] * math.sin(angle)) * radii[i]
            far = 1.0 + lobes * ((noise(there, 1.7) - 0.5) + 0.5 * (noise(there, 4.3) - 0.5))
            ring.append((bm.verts.new(path[i] + (there - path[i]) * far), angle, 1.0 - radii[i] / thick))
        rings.append(ring)
    for i in range(count - 1):
        for j in range(sides):
            k = (j + 1) % sides
            corners = (rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])
            made = bm.faces.new([corner[0] for corner in corners])
            loops = made.loops
            for n in range(4):
                c = wood(kind, corners[n][0].co, corners[n][1], corners[n][2])
                loops[n][layer] = (c[0], c[1], c[2], 1.0)
            faces.append(made)
    ends = [(bm.verts.new(path[0]), rings[0], True)]
    if tip:
        ends.append((bm.verts.new(path[-1] + (path[-1] - path[-2]).normalized() * radii[-1] * 1.2), rings[-1], False))
    for end in ends:
        c = wood(kind, end[0].co, 0.0, 1.0 if not end[2] else 0.0)
        for j in range(sides):
            k = (j + 1) % sides
            made = bm.faces.new((end[1][k][0], end[1][j][0], end[0]) if end[2] else (end[1][j][0], end[1][k][0], end[0]))
            paint(part, [made], c)
            faces.append(made)
    return faces


# Where a tree's shoots stand, gathered while it is built: each as its foot, the way it points and how long
# it is. The needles are one shoot, set many times: see `skott` and `shoots_of` below.
SHOOTS = []


def shoot(foot, towards, size):
    side = towards.cross(Vector((0.2, 0.9, 0.33))).normalized()
    up = towards.cross(side)
    turn = rnd() * TAU
    SHOOTS.append((foot.copy(), towards * size, (side * math.cos(turn) + up * math.sin(turn)) * size))


def puff(part, centre, radius, shoots, size, wind, sides=6, levels=4):
    """A round head of needles: a mass too thick to see into, with its shoots standing out of it all round."""
    bm = part['bm']
    layer = part['colour']
    rings = []
    for i in range(1, levels):
        tilt = math.pi * i / levels
        ring = []
        for j in range(sides):
            angle = TAU * (j + 0.5 * (i % 2)) / sides
            out = Vector((math.cos(angle) * math.sin(tilt), math.sin(angle) * math.sin(tilt), math.cos(tilt)))
            far = radius * (0.66 + 0.3 * noise(out * 1.6 + centre, 1.0))
            ring.append(bm.verts.new(centre + Vector((out[0] * far, out[1] * far, out[2] * far * 0.8))))
        rings.append(ring)
    faces = []
    for i in range(len(rings) - 1):
        for j in range(sides):
            k = (j + 1) % sides
            faces.append(bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][k], rings[i][k])))
    top = bm.verts.new(centre + Vector((0.0, 0.0, radius * 0.62)))
    foot = bm.verts.new(centre - Vector((0.0, 0.0, radius * 0.6)))
    for j in range(sides):
        k = (j + 1) % sides
        faces.append(bm.faces.new((rings[0][k], rings[0][j], top)))
        faces.append(bm.faces.new((rings[-1][j], rings[-1][k], foot)))
    for item in faces:
        for loop in item.loops:
            c = blend(NEEDLE[0], NEEDLE[1], step(-0.6, 1.0, (loop.vert.co[2] - centre[2]) / radius))
            loop[layer] = (c[0], c[1], c[2], 1.0)
    # Its shoots, by the golden angle: over its top and its sides, fewer underneath.
    for k in range(shoots):
        turn = k * 2.399963 + rnd() * 0.6
        tilt = 0.25 + 1.75 * math.sqrt((k + 0.5) / shoots)
        out = Vector((math.cos(turn) * math.sin(tilt), math.sin(turn) * math.sin(tilt), math.cos(tilt)))
        towards = (out + Vector((wind * 0.22, 0.0, 0.3))).normalized()
        shoot(centre + Vector((out[0], out[1], out[2] * 0.8)) * (radius * 0.6), towards, size * between(0.85, 1.15))


def bough(part, hub, radii, key, puffs, shoots, size, wind, twigs=2, fine=True):
    """A plate of needles, as an old pine carries them: round heads side by side in a flat layer, on the twigs
    that hold them. `hub` is where its branch comes into it from below, and `wind` leans it over."""
    start(key)
    centre = Vector(hub) + Vector((wind * 0.12, 0.0, radii[2] * 0.6))
    for k in range(puffs):
        # One in the middle and a little higher, the others round it.
        turn = k * 2.399963 + rnd() * 0.7
        far = 0.0 if k == 0 else between(0.5, 0.78)
        at = centre + Vector((math.cos(turn) * radii[0] * far, math.sin(turn) * radii[1] * far, radii[2] * (0.25 if k == 0 else between(-0.3, 0.1))))
        radius = min(radii[0], radii[1]) * (0.62 if k == 0 else between(0.42, 0.56))
        middle = (Vector(hub) + at) / 2.0 + Vector((0.0, 0.0, -0.1))
        limb(part, [Vector(hub), middle, at], [0.07, 0.05, 0.035], 3, 'twig', 0.0, False)
        puff(part, at, radius, shoots, size, wind, 6 if fine else 5, 4 if fine else 3)
    # Twigs that reach past the rim, each with a shoot or two of its own.
    for k in range(twigs):
        turn = between(0.0, TAU)
        out = Vector((math.cos(turn), math.sin(turn) * 0.8, between(-0.1, 0.2)))
        end = centre + Vector((out[0] * radii[0] * between(1.05, 1.3), out[1] * radii[1] * between(1.05, 1.3), out[2] * radii[2] + between(-0.2, 0.1)))
        middle = (Vector(hub) + end) / 2.0 + Vector((0.0, 0.0, -0.12))
        limb(part, [Vector(hub), middle, end], [0.06, 0.045, 0.03], 3, 'twig', 0.0, False)
        shoot(end - out * 0.12, (out + Vector((wind * 0.3, 0.0, 0.7))).normalized(), size * 1.1)
        shoot(end - out * 0.3, (out * 0.4 + Vector((wind * 0.3, between(-0.5, 0.5), 0.9))).normalized(), size)


def shoots_of(name):
    """Makes the part that says where a tree's shoots stand, and forgets them: a small triangle for each,
    with a square corner at the shoot's foot, its long leg along the shoot and as long as it, and its short
    leg, 0.4 as long, to one side. Whatever order the corners end up in, the game can read that."""
    bm = bmesh.new()
    for row in SHOOTS:
        bm.faces.new((bm.verts.new(row[0]), bm.verts.new(row[0] + row[1]), bm.verts.new(row[0] + row[2] * 0.4)))
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    made = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(made)
    made['shade'] = 0.0
    made['ground'] = -1000.0
    count = len(SHOOTS)
    SHOOTS.clear()
    return count


if wanted('skott'):
    # One shoot of a pine: its needles stand out round it like a bottle brush, forward at its end. It is one
    # long from its foot at the origin to its end along +Z. A needle is a thin blade seen from both sides, and
    # is lit as if it were part of a round mass, so that a bough is light above and dark below.
    part = new_part()
    bm = part['bm']
    layer = part['colour']
    start(64)
    normals = []
    for k in range(16):
        along = 0.1 + 0.8 * (k + 0.5) / 16.0
        turn = k * 2.399963
        lean = 1.2 - 0.85 * along + between(-0.12, 0.12)
        out = Vector((math.cos(turn) * math.sin(lean), math.sin(turn) * math.sin(lean), math.cos(lean)))
        flat = Vector((0.0, 0.0, 1.0)).cross(out).normalized()
        at = Vector((0.0, 0.0, along))
        length = between(0.5, 0.72)
        shade = step(0.0, 1.0, along)
        dark = blend(NEEDLE[0], NEEDLE[1], shade)
        pale = blend(NEEDLE[2], NEEDLE[3], between(0.2, 1.0))
        lit = (out * 0.55 + Vector((out[0], out[1], 0.0)) * 0.5 + Vector((0.0, 0.0, 0.6))).normalized()
        for side in (1.0, -1.0):
            # Once for each of its two sides.
            made = bm.faces.new((bm.verts.new(at - flat * 0.06 * side), bm.verts.new(at + flat * 0.06 * side), bm.verts.new(at + out * length)))
            loops = made.loops
            loops[0][layer] = (dark[0], dark[1], dark[2], 1.0)
            loops[1][layer] = (dark[0], dark[1], dark[2], 1.0)
            loops[2][layer] = (pale[0], pale[1], pale[2], 1.0)
            normals.append(lit)
            normals.append(lit)
            normals.append(lit)
    finish(part, 'skott', 0.0, None, False, 50.0, normals)


if wanted('tall'):
    # The old pine. Its foot is at the origin; it is swept towards -X, away from the wind.
    part = new_part()
    bm = part['bm']
    layer = part['colour']
    start(7)
    SIDES = 24
    # The stem, and on from it the leader, which the wind has laid over: one line from the root to the top.
    spine = smooth([(0.05, 0.0, -0.6), (0.0, 0.0, 0.0), (-0.12, 0.04, 0.8), (-0.4, 0.0, 1.65), (-0.55, 0.12, 2.5), (-0.38, 0.5, 3.4),
                    (-0.7, 0.95, 4.4), (-1.5, 1.3, 5.35), (-2.5, 1.5, 5.95)], 4, 0.06, 3.0)
    # Where its roots leave it, round the foot. The bare wood starts at the foot on the side towards him and
    # winds a third of the way round, up to where the dead limb leaves the stem; the stem's own ridges wind
    # with it.
    ROOTS = (-2.45, -1.2, 0.1, 1.4, 2.6)
    BARE_FROM = -2.0
    WIND = 0.92
    rings = []
    frames = across(spine)
    for i in range(len(spine)):
        height = spine[i][2]
        # Thick at the ground, where it flares into its roots; thinning into the leader above the fork.
        far = 0.25 + 0.56 * (1.0 - step(1.5, 4.4, height)) + 0.62 * math.exp(-max(0.0, height + 0.1) * 1.7) - 0.14 * step(4.6, 6.2, height)
        ring = []
        for j in range(SIDES):
            angle = TAU * j / SIDES
            wound = angle - BARE_FROM - WIND * height
            off = math.atan2(math.sin(wound), math.cos(wound))
            r = far * (1.0 + 0.1 * math.sin(3.0 * wound + 0.7) + 0.045 * math.sin(6.0 * wound + 1.9) + 0.05 * (noise(spine[i] + Vector((math.cos(angle), math.sin(angle), 0.0)), 2.2) - 0.5))
            for root in ROOTS:
                r += far * 0.34 * math.exp(-max(0.0, height) * 2.4) * max(0.0, math.cos(angle - root)) ** 6
            wide = (0.7 - 0.14 * step(0.4, 2.0, height)) * (1.0 - step(2.3, 3.0, height))
            bare = 1.0 - step(wide - 0.1, wide + 0.05, abs(off))
            roll = math.exp(-((abs(off) - wide - 0.15) / 0.13) ** 2) * (1.0 if wide > 0.05 else 0.0)
            # Plates of bark: every third line up the stem is a furrow, broken where one plate ends.
            thick = 1.0 - step(1.5, 3.0, height)
            row = int((height + 0.41 * (j // 3)) / 0.6)
            furrow = 1.0 if (j + row) % 3 == 0 or (i + (j // 3) * 2) % 5 == 0 else 0.0
            r *= 1.0 - 0.07 * bare + 0.08 * roll * (1.0 - bare) - 0.1 * furrow * thick * (1.0 - bare) + 0.05 * (hash3(j // 3, row, 5.0) - 0.5) * thick
            point = spine[i] + (frames[i][0] * math.cos(angle) + frames[i][1] * math.sin(angle)) * r
            ring.append((bm.verts.new(point), bare, furrow, thick, hash3(j // 3, row, 9.0), off))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(SIDES):
            k = (j + 1) % SIDES
            corners = (rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j])
            made = bm.faces.new([corner[0] for corner in corners])
            loops = made.loops
            for n in range(4):
                note = corners[n]
                co = note[0].co
                plate = blend(PLATE[0], PLATE[1], note[4])
                plate = blend(plate, FURROW, note[2] * 0.9)
                c = blend(wood('limb', co, 0.0, 1.0 - step(5.6, 3.2, co[2])), plate, note[3])
                # The bare wood: silver, in streaks along the grain, with a dark line where it meets the bark.
                grey = blend(SILVER[0], SILVER[1], 0.1 + 0.9 * hash3(math.floor(note[5] * 11.0), 2.0, 2.0))
                grey = blend(grey, SILVER[2], step(0.45, 0.8, noise(co, 3.0)))
                c = blend(c, grey, note[1])
                c = blend(c, FURROW, (1.0 - abs(note[1] * 2.0 - 1.0)) * 0.55)
                # A scar of an old fire, low on the side towards him.
                c = blend(c, tone('#2a2422'), (1.0 - step(0.2, 1.0, co[2])) * step(0.45, 0.8, noise(co, 1.3)) * (1.0 - note[1]) * 0.75)
                loops[n][layer] = (c[0], c[1], c[2], 1.0)
    top = bm.verts.new(spine[-1] + (spine[-1] - spine[-2]).normalized() * 0.15)
    for j in range(SIDES):
        paint(part, [bm.faces.new((rings[-1][j][0], rings[-1][(j + 1) % SIDES][0], top))], TWIG)

    # Its roots run out over the rock, half in it. One stands up in an arch over a hollow.
    number = 0
    for root in (
        ((-0.95, -0.7, 0.4), (-1.7, -1.3, 0.2), (-2.5, -1.5, 0.08), (-3.3, -1.85, 0.0), (-4.2, -1.8, -0.1)),
        ((0.5, -1.15, 0.4), (1.1, -1.7, 0.16), (1.9, -1.8, 0.06), (2.6, -2.1, -0.02), (3.3, -2.05, -0.12)),
        ((1.15, 0.15, 0.5), (1.95, 0.1, 0.85), (2.75, -0.15, 0.78), (3.4, -0.35, 0.3), (3.8, -0.5, -0.12)),
        ((0.25, 1.2, 0.4), (0.8, 2.0, 0.18), (0.9, 2.9, 0.06), (1.6, 3.5, -0.1)),
        ((-1.15, 0.5, 0.4), (-2.0, 1.1, 0.18), (-2.9, 1.2, 0.08), (-3.6, 1.8, -0.1)),
    ):
        number += 1
        path = smooth(root, 4, 0.1, number * 3.7)
        limb(part, path, spread([0.52, 0.34, 0.24, 0.16, 0.06], len(path)), 8, 'root', 0.45)

    # A few heavy limbs under a flat crown: (its path, how thick, then its plates of needles as hub, size and
    # how far along the limb their branch leaves it).
    LIMBS = (
        # Long and low to the lee side, the way the wind has laid it; its end hangs.
        (((-0.45, 0.0, 2.0), (-1.3, -0.1, 3.0), (-2.5, 0.2, 3.6), (-3.8, 0.0, 3.95), (-4.9, -0.3, 3.85), (-5.7, -0.4, 3.6)), (0.46, 0.38, 0.3, 0.22, 0.14, 0.07),
         (((-2.45, 0.4, 4.05), (1.35, 1.15, 0.6), 0.45), ((-4.05, -0.1, 4.35), (1.4, 1.2, 0.6), 0.72), ((-5.75, -0.45, 3.75), (1.15, 1.0, 0.5), 0.97))),
        # To the wind's side: shorter, and rising.
        (((-0.3, 0.1, 2.75), (0.5, 0.3, 3.5), (1.4, 0.6, 4.0), (2.2, 0.5, 4.4), (2.8, 0.3, 4.9)), (0.4, 0.32, 0.24, 0.16, 0.08),
         (((1.45, 0.7, 4.4), (1.25, 1.1, 0.55), 0.6), ((2.9, 0.3, 4.95), (1.15, 1.0, 0.5), 0.97))),
        # Behind.
        (((-0.4, 0.4, 2.9), (0.1, 1.5, 3.7), (0.8, 2.3, 4.5), (1.3, 2.8, 5.1)), (0.36, 0.28, 0.18, 0.09),
         (((1.1, 2.8, 5.15), (1.4, 1.15, 0.55), 0.97),)),
        # Low, towards him and to the lee.
        (((-0.7, -0.3, 1.75), (-1.7, -0.85, 2.3), (-2.7, -1.1, 2.25), (-3.5, -1.0, 2.55)), (0.26, 0.2, 0.14, 0.07),
         (((-3.45, -1.0, 2.6), (1.2, 0.95, 0.46), 0.97),)),
    )
    number = 0
    for row in LIMBS:
        number += 1
        path = smooth(row[0], 4, 0.13, number * 5.3)
        limb(part, path, spread(row[1], len(path)), 9, 'limb', 0.4)
        for plate in row[2]:
            # A branch from the limb up into the plate.
            at = path[min(len(path) - 1, int(plate[2] * (len(path) - 1)))]
            hub = Vector(plate[0])
            limb(part, [at, (at + hub) / 2.0 + Vector((0.14, 0.0, -0.1)), hub], [0.12, 0.09, 0.06], 5, 'limb', 0.0, False)
            bough(part, plate[0], plate[1], 40 + number * 10 + int(plate[2] * 7.0), 5, 8, 0.56, -1.0)
    # The leader carries the crown's top, well over the rest.
    for plate in (((-0.85, 1.1, 5.1), (1.3, 1.15, 0.6), 0.74), ((-2.1, 1.4, 5.85), (1.5, 1.2, 0.62), 0.9), ((-3.35, 1.6, 6.0), (1.2, 1.05, 0.52), 1.0)):
        at = spine[min(len(spine) - 1, int(plate[2] * (len(spine) - 1)))]
        hub = Vector(plate[0])
        limb(part, [at, (at + hub) / 2.0 + Vector((0.1, 0.0, -0.1)), hub], [0.12, 0.09, 0.06], 5, 'limb', 0.0, False)
        bough(part, plate[0], plate[1], 90 + int(plate[2] * 9.0), 5, 8, 0.56, -1.0)

    # The dead limb: silver, bare, crooked, with the stubs of its twigs.
    dead = smooth([(0.62, -0.25, 1.8), (1.6, -0.6, 2.45), (2.6, -0.85, 2.62), (3.35, -0.65, 3.2), (3.8, -0.5, 4.0)], 4, 0.09, 8.0)
    limb(part, dead, spread([0.33, 0.25, 0.18, 0.12, 0.045], len(dead)), 8, 'dead', 0.4)
    for snag in (
        ((1.9, -0.68, 2.5), (1.7, -0.95, 3.1), (1.9, -1.05, 3.55)),
        ((2.85, -0.8, 2.75), (3.25, -1.25, 2.55), (3.7, -1.4, 2.72)),
        ((3.4, -0.64, 3.28), (3.1, -0.5, 3.85), (3.22, -0.3, 4.25)),
        ((1.15, -0.45, 2.15), (1.3, -0.72, 1.78)),
    ):
        path = smooth(snag, 2)
        limb(part, path, spread([0.1, 0.06, 0.022], len(path)), 5, 'dead', 0.2)
    finish(part, 'tall', 0.8, 0.0, False, 32.0)
    shoots_of('tall-skott')


# A small crooked pine for the rim: a bent stem, warm near its top, and a few flat plates for a crown. It
# is seen from far off and out of focus, so it has few needles and they are large.
def crooked(name, key, stem, radii, plates):
    part = new_part()
    start(key)
    path = smooth(stem, 3, 0.06, key)
    limb(part, path, spread(radii, len(path)), 7, 'stem', 0.35)
    number = 0
    for plate in plates:
        number += 1
        at = path[min(len(path) - 1, int(plate[2] * (len(path) - 1)))]
        hub = Vector(plate[0])
        middle = (at + hub) / 2.0 + Vector((0.0, 0.0, -0.2))
        limb(part, [at, middle, hub], [radii[-1] * 1.5, radii[-1] * 1.1, 0.07], 4, 'limb', 0.0, False)
        bough(part, plate[0], plate[1], key + number, 4, 6, 0.6, -0.8, 1, False)
    finish(part, name, 0.7, 0.0, False, 50.0)
    shoots_of(name + '-skott')


if wanted('martall-a'):
    crooked('martall-a', 21, ((0.0, 0.0, -0.4), (0.1, 0.0, 1.2), (-0.35, 0.1, 2.6), (-0.2, 0.0, 4.0), (-0.9, 0.1, 5.2), (-1.3, 0.0, 6.0)), (0.36, 0.3, 0.26, 0.2, 0.14, 0.08), (
        ((-1.6, 0.1, 5.9), (1.5, 1.2, 0.55), 1.0), ((0.5, 0.3, 4.9), (1.3, 1.1, 0.5), 0.7), ((-2.0, -0.3, 4.2), (1.2, 1.0, 0.45), 0.6), ((0.9, -0.2, 3.3), (0.9, 0.8, 0.4), 0.45)))

if wanted('martall-b'):
    crooked('martall-b', 33, ((0.0, 0.0, -0.4), (-0.25, 0.0, 1.0), (0.2, 0.1, 2.2), (-0.5, 0.0, 3.3), (-1.4, 0.1, 4.0)), (0.32, 0.28, 0.22, 0.15, 0.08), (
        ((-1.9, 0.1, 3.9), (1.5, 1.2, 0.5), 1.0), ((0.4, 0.2, 3.5), (1.1, 1.0, 0.45), 0.72), ((-1.5, -0.3, 2.6), (0.9, 0.8, 0.4), 0.5)))


# --- the shade of each part's own corners, baked into its colours ---------------------------------------------

scene = bpy.context.scene
before = scene.render.engine
try:
    scene.render.engine = 'CYCLES'
except TypeError:
    pass
shaded = 0
if scene.render.engine == 'CYCLES':
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
    if scene.world is not None:
        scene.world.light_settings.distance = 1.0
    parts = [made for made in scene.objects if made.type == 'MESH']
    # What stands on the ground is shaded with ground under it, so that its foot is dark.
    floor_mesh = bpy.data.meshes.new('floor')
    floor_mesh.from_pydata([(-40.0, -40.0, 0.0), (40.0, -40.0, 0.0), (40.0, 40.0, 0.0), (-40.0, 40.0, 0.0)], [], [(0, 1, 2, 3)])
    floor = bpy.data.objects.new('floor', floor_mesh)
    scene.collection.objects.link(floor)
    # Each is shaded alone: the others stand aside while it is baked.
    for made in parts:
        made.hide_render = True
    for made in parts:
        mesh = made.data
        if made['shade'] <= 0.0:
            continue
        # One shade for each point.
        occlusion = mesh.color_attributes.new('occlusion', 'FLOAT_COLOR', 'POINT')
        mesh.color_attributes.active_color = occlusion
        made.hide_render = False
        floor.hide_render = made['ground'] < -999.0
        floor.location = (0.0, 0.0, max(-999.0, made['ground']))
        bpy.ops.object.select_all(action='DESELECT')
        made.select_set(True)
        bpy.context.view_layer.objects.active = made
        bpy.ops.object.bake(type='AO', target='VERTEX_COLORS')
        made.hide_render = True
        strength = made['shade']
        occlusion = mesh.color_attributes['occlusion']
        colour = mesh.color_attributes['Color']
        for i in range(len(colour.data)):
            light = occlusion.data[mesh.loops[i].vertex_index].color[0]
            k = 1.0 - strength * (1.0 - min(1.0, light) ** 0.8)
            c = colour.data[i].color
            # The shade is cool: it goes towards the blue of the sky, not towards black.
            colour.data[i].color = (c[0] * k, c[1] * (k + (1.0 - k) * 0.04), c[2] * (k + (1.0 - k) * 0.12), 1.0)
        mesh.color_attributes.remove(mesh.color_attributes['occlusion'])
        mesh.color_attributes.active_color = mesh.color_attributes['Color']
        shaded += 1
    for made in parts:
        made.hide_render = False
    bpy.data.objects.remove(floor, do_unlink=True)
    bpy.data.meshes.remove(floor_mesh)
try:
    scene.render.engine = before
except TypeError:
    pass

total = 0
for made in scene.objects:
    if made.type == 'MESH':
        del made['shade']
        del made['ground']
        if len(made.data.color_attributes) > 0:
            made.data.color_attributes.render_color_index = 0
            made.data.color_attributes.active_color_index = 0
        made.data.calc_loop_triangles()
        count = len(made.data.loop_triangles)
        total += count
        print('  ', made.name, count)
print('mountain kit built:', len(scene.objects), 'parts,', total, 'triangles,', shaded, 'shaded')
