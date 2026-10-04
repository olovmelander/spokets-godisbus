"""Renders the sixteen hidden kinds as one sheet of sticker pictures, for the album and the bag
(src/ui/sticker.ts). Run it after candy.py, after two first lines that set OUT, the path of the picture to
write, and CELL, the size of one picture in pixels:
    OUT = r'C:/.../src/ui/kinds.webp'
    CELL = 96

Six across and three down, in the order of ORDER below, which is the order of src/content/kinds.ts (a test
holds the two together). Each sweet fills its picture, whatever its size in the game. This changes the scene,
so run candy.py again before exporting.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bpy
from mathutils import Vector

scene = bpy.context.scene
ORDER = [
    'gelehallon', 'gummibjorn', 'skumbanan', 'skumsvamp', 'sockerbit', 'gummiorm',
    'chokladkola', 'colaflaska', 'chokladpeng', 'stektagg', 'surnapp', 'lakritskonfekt',
    'polkagris', 'graddkola', 'salmiakruta', 'chokladpralin',
]
ACROSS = 6
DOWN = 3

for made in scene.objects:
    made.hide_render = made.name not in ORDER
for k in range(len(ORDER)):
    made = bpy.data.objects[ORDER[k]]
    low = Vector((9.0, 9.0, 9.0))
    high = Vector((-9.0, -9.0, -9.0))
    for vert in made.data.vertices:
        for axis in range(3):
            low[axis] = min(low[axis], vert.co[axis])
            high[axis] = max(high[axis], vert.co[axis])
    size = 0.8 / max(high.x - low.x, high.z - low.z, (high.y - low.y) * 0.6)
    middle = (low + high) / 2.0
    made.scale = (size, size, size)
    # A little from above and from one side, so that each has a top and a flank. The dummy shows its side.
    made.rotation_euler = (math.radians(8), 0.0, math.radians(-62 if ORDER[k] == 'surnapp' else -24))
    made.location = Vector((k % ACROSS + 0.5, 0.0, DOWN - 0.5 - k // ACROSS)) - Vector((middle.x * size, 0.0, middle.z * size))

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.4
sun.data.angle = math.radians(20)
sun.rotation_euler = (math.radians(50), math.radians(-14), math.radians(-30))
scene.collection.objects.link(sun)
if scene.world is not None and scene.world.use_nodes:
    for node in scene.world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            node.inputs['Color'].default_value = (0.8, 0.82, 0.86, 1.0)
            node.inputs['Strength'].default_value = 0.9

camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
camera.data.type = 'ORTHO'
camera.data.ortho_scale = ACROSS
camera.location = Vector((ACROSS / 2.0, -8.0, DOWN / 2.0))
camera.rotation_euler = (math.radians(90), 0.0, 0.0)
scene.collection.objects.link(camera)
scene.camera = camera

scene.render.resolution_x = ACROSS * CELL  # noqa: F821 (set by the caller, see above)
scene.render.resolution_y = DOWN * CELL  # noqa: F821
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
try:
    scene.view_settings.view_transform = 'Standard'
except TypeError:
    pass
formats = [item.identifier for item in scene.render.image_settings.bl_rna.properties['file_format'].enum_items]
scene.render.image_settings.file_format = 'WEBP' if 'WEBP' in formats else 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
scene.render.image_settings.quality = 88
scene.render.filepath = OUT  # noqa: F821
bpy.ops.render.render(write_still=True)
print('rendered', OUT, scene.render.image_settings.file_format)  # noqa: F821
