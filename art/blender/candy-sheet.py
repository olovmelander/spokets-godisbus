"""Lays the candy kit out as a sheet and renders it, for looking at. Run it after candy.py, after two first lines
that set OUT, the path of the picture to write, and TURN, how far each sweet is turned round, in degrees:
    OUT = r'C:/.../docs/shots/_work/candy/sheet.png'
    TURN = 0

The trail's sweets are shown in the colours the game gives them. This changes the scene (places, materials,
a camera, lights), so run candy.py again before exporting.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bpy
from mathutils import Vector

scene = bpy.context.scene


def linear(value):
    c = value / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def tone(text):
    return (linear(int(text[1:3], 16)), linear(int(text[3:5], 16)), linear(int(text[5:7], 16)), 1.0)


# The preview material does what the game's does: a corner takes the object's colour as far as its UV says.
preview = bpy.data.materials.new('candy-preview')
preview.use_nodes = True
tree = preview.node_tree
for node in tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Roughness'].default_value = 0.3
        painted = tree.nodes.new('ShaderNodeVertexColor')
        painted.layer_name = 'Color'
        uv = tree.nodes.new('ShaderNodeUVMap')
        uv.uv_map = 'tint'
        parts = tree.nodes.new('ShaderNodeSeparateXYZ')
        tree.links.new(uv.outputs['UV'], parts.inputs['Vector'])
        own = tree.nodes.new('ShaderNodeObjectInfo')
        take = tree.nodes.new('ShaderNodeMix')
        take.data_type = 'RGBA'
        take.inputs['A'].default_value = (1.0, 1.0, 1.0, 1.0)
        tree.links.new(parts.outputs['X'], take.inputs['Factor'])
        tree.links.new(own.outputs['Color'], take.inputs['B'])
        both = tree.nodes.new('ShaderNodeMix')
        both.data_type = 'RGBA'
        both.blend_type = 'MULTIPLY'
        both.inputs['Factor'].default_value = 1.0
        tree.links.new(painted.outputs['Color'], both.inputs['A'])
        tree.links.new(take.outputs['Result'], both.inputs['B'])
        tree.links.new(both.outputs['Result'], node.inputs['Base Color'])

COLOURS = ['#e8483f', '#f6c445', '#58b368', '#4a90d9', '#ef7fb0', '#f08a3c']
ROWS = [
    [('karamell', 0), ('karamell', 1), ('karamell', 2), ('randig', 3), ('randig', 0), ('polka', 5), ('polka', 0), ('hjarta', 4), ('klubba', 0), ('klubba', 2), ('burk', 1)],
    ['gelehallon', 'gummibjorn', 'skumbanan', 'skumsvamp', 'sockerbit', 'gummiorm', 'chokladkola', 'colaflaska'],
    ['chokladpeng', 'stektagg', 'surnapp', 'lakritskonfekt', 'polkagris', 'graddkola', 'salmiakruta', 'chokladpralin'],
    ['guldhallon', 'lysklubba', 'stjarna'],
]
STEP = 0.62
turned = math.radians(TURN)  # noqa: F821 (set by the caller, see above)

used = set()
for r in range(len(ROWS)):
    row = ROWS[r]
    for k in range(len(row)):
        entry = row[k]
        name = entry if isinstance(entry, str) else entry[0]
        made = bpy.data.objects[name]
        if name in used:
            made = made.copy()
            scene.collection.objects.link(made)
        used.add(name)
        made.location = ((k - (len(row) - 1) / 2.0) * STEP, 0.0, -r * STEP)
        made.rotation_euler = (0.0, 0.0, turned)
        made.color = tone('#ffffff') if isinstance(entry, str) else tone(COLOURS[entry[1]])
        made.data.materials.clear()
        made.data.materials.append(preview)

# A wall behind, a sun from the upper left as in the game, and a camera straight on.
bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0.0, 1.2, -1.0), rotation=(math.radians(90), 0.0, 0.0))
wall = bpy.context.object
wall.name = 'wall'
paper = bpy.data.materials.new('wall')
paper.use_nodes = True
for node in paper.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Base Color'].default_value = tone('#56634c')
        node.inputs['Roughness'].default_value = 1.0
wall.data.materials.append(paper)

sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.2
sun.data.angle = math.radians(12)
sun.rotation_euler = (math.radians(52), math.radians(-18), math.radians(-28))
scene.collection.objects.link(sun)
if scene.world is not None and scene.world.use_nodes:
    for node in scene.world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            node.inputs['Color'].default_value = (0.62, 0.68, 0.78, 1.0)
            node.inputs['Strength'].default_value = 0.75

camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
camera.data.type = 'ORTHO'
camera.data.ortho_scale = STEP * 11.6
camera.location = Vector((0.0, -6.0, -1.5 * STEP + 0.02))
camera.rotation_euler = (math.radians(90), 0.0, 0.0)
scene.collection.objects.link(camera)
scene.camera = camera

scene.render.resolution_x = 2200
scene.render.resolution_y = 880
scene.render.resolution_percentage = 100
try:
    scene.view_settings.view_transform = 'Standard'
except TypeError:
    pass
scene.render.filepath = OUT  # noqa: F821 (set by the caller, see above)
bpy.ops.render.render(write_still=True)
print('rendered', OUT, 'with', scene.render.engine)  # noqa: F821
