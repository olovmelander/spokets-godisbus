"""Builds the big candy, the checkpoint of plan 3.3, rule 4: a round swirl lollipop on a stick, with a bow.

It was the first model to go the whole way from Blender to the page (plan 7.3, Stage 0a), so it still carries
one of everything the chain has to handle: two meshes, a material with a texture, and a custom property.
The small sweets are built by candy.py, without a texture.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up, and the
sweet's face looks along -Y, which is towards the camera in the game. The stick stands on the ground at the
origin; the sweet is an object of its own, with its middle as its origin, so that the game can turn it.
The texture is painted here in code, so nothing in this model comes from anyone else.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

TAU = math.pi * 2.0

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)
for item in list(bpy.data.images):
    if item.users == 0:
        bpy.data.images.remove(item)

# --- the picture: a swirl of red and white, with the stick's and the bow's colours in its corners ------------
SIZE = 256
ARMS = 6
# How far out the swirl reaches in the picture, from its middle. The sweet's rim lies there.
RIM = 0.46
RED = (0.867, 0.294, 0.224)
WHITE = (1.0, 0.965, 0.918)
STICK = (0.957, 0.925, 0.863)
BOW = (0.965, 0.769, 0.271)
image = bpy.data.images.new('big-candy-colour', SIZE, SIZE, alpha=False)
pixels = []
for y in range(SIZE):
    for x in range(SIZE):
        u = (x + 0.5) / SIZE - 0.5
        v = (y + 0.5) / SIZE - 0.5
        away = math.sqrt(u * u + v * v) / RIM
        if away > 1.08:
            colour = STICK if x < SIZE // 2 else BOW
        elif away < 0.075:
            colour = RED
        else:
            band = (math.atan2(v, u) / TAU * ARMS + away * 1.45) % 1.0
            # Soft borders, a pixel or so wide, so that the stripes don't flicker when it turns.
            edge = min(band, abs(band - 0.5), 1.0 - band) * TAU * away * RIM * SIZE / ARMS
            white = 0.5 + (0.5 if band < 0.5 else -0.5) * min(1.0, edge / 1.2)
            colour = (RED[0] + (WHITE[0] - RED[0]) * white, RED[1] + (WHITE[1] - RED[1]) * white, RED[2] + (WHITE[2] - RED[2]) * white)
        pixels.extend((colour[0], colour[1], colour[2], 1.0))
image.pixels.foreach_set(pixels)
image.pack()

material = bpy.data.materials.new('candy')
material.use_nodes = True
for node in material.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        material.node_tree.links.new(texture.outputs['Color'], node.inputs['Base Color'])
        node.inputs['Roughness'].default_value = 0.22


def finish(bm, name, location):
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    for face in bm.faces:
        face.smooth = True
    mesh = bpy.data.meshes.new(name)
    bm.to_mesh(mesh)
    bm.free()
    mesh.materials.append(material)
    made = bpy.data.objects.new(name, mesh)
    made.location = location
    bpy.context.scene.collection.objects.link(made)
    return made


# --- the sweet: a thick lens, so that it is still round when it has turned its edge to him ------------------
WIDE = 0.34
THICK = 0.14
SEGMENTS = 28
bm = bmesh.new()
uv = bm.loops.layers.uv.new('UVMap')
rings = []
for i in range(1, 10):
    angle = math.pi * i / 10
    ring = []
    for j in range(SEGMENTS):
        turn = TAU * j / SEGMENTS
        ring.append(bm.verts.new((WIDE * math.sin(angle) * math.cos(turn), -THICK * math.cos(angle), WIDE * math.sin(angle) * math.sin(turn))))
    rings.append(ring)
for i in range(len(rings) - 1):
    for j in range(SEGMENTS):
        k = (j + 1) % SEGMENTS
        bm.faces.new((rings[i][j], rings[i][k], rings[i + 1][k], rings[i + 1][j]))
for ring, depth in ((rings[0], -THICK), (rings[-1], THICK)):
    tip = bm.verts.new((0.0, depth, 0.0))
    for j in range(SEGMENTS):
        bm.faces.new((ring[j], ring[(j + 1) % SEGMENTS], tip))
# The picture is laid on from the front, straight through to the back, so the stripes run over the rim.
for face in bm.faces:
    for loop in face.loops:
        loop[uv].uv = (0.5 + RIM * loop.vert.co.x / WIDE, 0.5 + RIM * loop.vert.co.z / WIDE)
candy = finish(bm, 'candy', (0.0, 0.0, 1.25))
# A custom property becomes glTF "extras", and arrives in three as userData (plan 5.6).
candy['role'] = 'checkpoint'

# --- the stick, and a bow tied round it under the sweet ------------------------------------------------------
bm = bmesh.new()
uv = bm.loops.layers.uv.new('UVMap')
made = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=True, segments=10, radius1=0.03, radius2=0.03, depth=1.0, matrix=Matrix.Translation((0.0, 0.0, 0.5)))
for face in bm.faces:
    for loop in face.loops:
        loop[uv].uv = (0.03, 0.03)
before = len(bm.faces)
BOW_PARTS = (
    # where, how big, and how far it leans
    ((0.0, -0.03, 0.845), (0.042, 0.042, 0.04), 0.0),
    ((-0.105, -0.022, 0.86), (0.092, 0.036, 0.056), 22.0),
    ((0.105, -0.022, 0.86), (0.092, 0.036, 0.056), -22.0),
    ((-0.05, -0.034, 0.755), (0.026, 0.018, 0.085), -24.0),
    ((0.05, -0.034, 0.755), (0.026, 0.018, 0.085), 24.0),
)
for where, size, lean in BOW_PARTS:
    place = Matrix.Translation(where) @ Matrix.Rotation(math.radians(lean), 4, 'Y') @ Matrix.Diagonal((size[0], size[1], size[2], 1.0))
    bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0, matrix=place)
bm.faces.ensure_lookup_table()
for face in bm.faces[before:]:
    for loop in face.loops:
        loop[uv].uv = (0.97, 0.03)
finish(bm, 'stick', (0.0, 0.0, 0.0))

print('big candy built:', [o.name for o in bpy.data.objects])
