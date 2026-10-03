"""Builds the big candy, the checkpoint of plan §3.3, rule 4: a striped sweet on a stick.

It is the first model to go the whole way from Blender to the page (plan §7.3, Stage 0a), so it carries one
of everything the chain has to handle: two meshes, a material with a texture, and a custom property.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up.
The texture is painted here in code, so nothing in this model comes from anyone else.
"""
import math

import bpy

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for block in (bpy.data.meshes, bpy.data.materials, bpy.data.images):
    for item in list(block):
        if item.users == 0:
            block.remove(item)

# --- the stripes: red with a white band that winds round the sweet ----------------------------------
SIZE = 256
RED = (0.867, 0.294, 0.224, 1.0)
WHITE = (1.0, 0.965, 0.918, 1.0)
image = bpy.data.images.new('big-candy-colour', SIZE, SIZE, alpha=False)
pixels = []
for y in range(SIZE):
    for x in range(SIZE):
        band = ((x / SIZE) * 5 + (y / SIZE) * 2.5) % 1.0 < 0.4
        pixels.extend(WHITE if band else RED)
image.pixels.foreach_set(pixels)
image.pack()

candy_material = bpy.data.materials.new('candy')
candy_material.use_nodes = True
nodes = candy_material.node_tree.nodes
bsdf = nodes['Principled BSDF']
texture = nodes.new('ShaderNodeTexImage')
texture.image = image
candy_material.node_tree.links.new(texture.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.25

stick_material = bpy.data.materials.new('stick')
stick_material.use_nodes = True
stick_bsdf = stick_material.node_tree.nodes['Principled BSDF']
stick_bsdf.inputs['Base Color'].default_value = (0.95, 0.92, 0.86, 1.0)
stick_bsdf.inputs['Roughness'].default_value = 0.6

# --- the stick stands on the ground at the origin; the sweet sits on top and turns round its own middle
bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=0.035, depth=1.1, location=(0, 0, 0.55))
stick = bpy.context.object
stick.name = 'stick'
stick.data.materials.append(stick_material)
bpy.ops.object.shade_smooth()

bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=0.32, location=(0, 0, 1.25))
candy = bpy.context.object
candy.name = 'candy'
candy.data.materials.append(candy_material)
bpy.ops.object.shade_smooth()
candy.rotation_euler = (math.radians(20), 0, 0)
# A custom property becomes glTF "extras", and arrives in three as userData (plan §5.6).
candy['role'] = 'checkpoint'

print('big candy built:', [o.name for o in bpy.data.objects])
