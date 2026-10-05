"""Lays the forest kit out on a grey ground and renders it, for looking at. Run it after forest-kit.py, after
first lines that set OUT, the path of the picture to write, and NAMES, the things to show in rows (a list of
lists of names; a name may be given as (name, size) to show it at another size):
    OUT = r'C:/.../sheet.png'
    NAMES = [['kotte', 'kotte-liten'], ['tuva']]

This changes the scene (places, a ground, a camera, lights), so run forest-kit.py again before exporting.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bpy
from mathutils import Vector

scene = bpy.context.scene

rows = NAMES  # noqa: F821 (set by the caller, see above)
# What hangs under its origin (the cap, the lichen) is lifted to stand on the ground, unless LIFT is set to False.
LIFT = LIFT if 'LIFT' in dir() else True  # noqa: F821
shown = set()
for row in rows:
    for entry in row:
        shown.add(entry if isinstance(entry, str) else entry[0])
for made in list(scene.objects):
    if made.type == 'MESH' and made.name not in shown:
        bpy.data.objects.remove(made, do_unlink=True)
depth = 0.0
widest = 0.0
tallest = 0.0
used = set()
for row in rows:
    at = 0.0
    deep = 0.0
    placed = []
    for entry in row:
        name = entry if isinstance(entry, str) else entry[0]
        size = 1.0 if isinstance(entry, str) else entry[1]
        made = bpy.data.objects[name]
        if name in used:
            made = made.copy()
            scene.collection.objects.link(made)
        used.add(name)
        made.scale = (size, size, size)
        low = [min(corner[i] for corner in made.bound_box) * size for i in range(3)]
        high = [max(corner[i] for corner in made.bound_box) * size for i in range(3)]
        made.location = (at - low[0], depth - high[1], -low[2] if LIFT else 0.0)
        placed.append(made)
        at += high[0] - low[0] + 0.35
        deep = max(deep, high[1] - low[1])
        tallest = max(tallest, high[2] - (low[2] if LIFT else 0.0))
    for made in placed:
        made.location.x -= (at - 0.35) / 2.0
    widest = max(widest, at)
    depth -= deep + 0.6

bpy.ops.mesh.primitive_plane_add(size=200.0, location=(0.0, 0.0, 0.0))
ground = bpy.context.object
ground.name = 'ground'
grey = bpy.data.materials.new('ground')
grey.use_nodes = True
for node in grey.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Base Color'].default_value = (0.2, 0.2, 0.2, 1.0)
        node.inputs['Roughness'].default_value = 1.0
ground.data.materials.append(grey)

# A sun from the upper left, and the sky as a soft light from everywhere.
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.4
sun.data.angle = math.radians(8)
sun.rotation_euler = (math.radians(50), math.radians(-12), math.radians(-38))
scene.collection.objects.link(sun)
if scene.world is not None and scene.world.use_nodes:
    for node in scene.world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            node.inputs['Color'].default_value = (0.62, 0.68, 0.78, 1.0)
            node.inputs['Strength'].default_value = 0.8

# The camera looks from the front and a little from above, as the game's does, and takes in every row.
TILT = math.radians(TILT_DEGREES if 'TILT_DEGREES' in dir() else 22)  # noqa: F821
camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
camera.data.lens = 85
middle = Vector((0.0, (depth + 0.6) / 2.0, tallest * 0.3))
across = max(widest, 1.0) * 1.08
upward = (tallest + (-depth) * math.sin(TILT)) * 1.25
far = max(across * 85.0 / 36.0, upward * 85.0 / 22.5)
camera.location = middle + Vector((0.0, -far * math.cos(TILT), far * math.sin(TILT)))
camera.rotation_euler = (math.radians(90) - TILT, 0.0, 0.0)
scene.collection.objects.link(camera)
scene.camera = camera

try:
    scene.render.engine = 'CYCLES'
except TypeError:
    pass
if scene.render.engine == 'CYCLES':
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 48
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
try:
    scene.view_settings.view_transform = 'Standard'
except TypeError:
    pass
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.filepath = OUT  # noqa: F821 (set by the caller, see above)
bpy.ops.render.render(write_still=True)
print('rendered', OUT, 'with', scene.render.engine)  # noqa: F821
