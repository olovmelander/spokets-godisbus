"""Puts the village kit together as two short streets and renders them, for looking at. Run it after village.py,
after a first line that sets OUT, the path of the pictures to write without their ending:
    OUT = r'C:/.../docs/shots/_work/village/kit'
It writes OUT-near.png (a bakery and a sweet shop, as close as the game shows them) and OUT-far.png (a yarn
shop, the shoemaker's and a yard).

This changes the scene (copies, materials, a camera, lights), so run village.py again before exporting.

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


# The preview material does what the game's does: a corner takes the wall's colour (the object's colour) or
# the door's where its U says so, and gives off as much of its colour as its V says.
def preview(door):
    material = bpy.data.materials.new('village-preview')
    material.use_nodes = True
    tree = material.node_tree
    for node in tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Roughness'].default_value = 0.9
            painted = tree.nodes.new('ShaderNodeVertexColor')
            painted.layer_name = 'Color'
            uv = tree.nodes.new('ShaderNodeUVMap')
            uv.uv_map = 'tint'
            parts = tree.nodes.new('ShaderNodeSeparateXYZ')
            tree.links.new(uv.outputs['UV'], parts.inputs['Vector'])
            own = tree.nodes.new('ShaderNodeObjectInfo')
            is_wall = tree.nodes.new('ShaderNodeMath')
            is_wall.operation = 'GREATER_THAN'
            is_wall.inputs[1].default_value = 0.25
            tree.links.new(parts.outputs['X'], is_wall.inputs[0])
            is_door = tree.nodes.new('ShaderNodeMath')
            is_door.operation = 'GREATER_THAN'
            is_door.inputs[1].default_value = 0.75
            tree.links.new(parts.outputs['X'], is_door.inputs[0])
            wall = tree.nodes.new('ShaderNodeMix')
            wall.data_type = 'RGBA'
            wall.inputs['A'].default_value = (1.0, 1.0, 1.0, 1.0)
            tree.links.new(is_wall.outputs['Value'], wall.inputs['Factor'])
            tree.links.new(own.outputs['Color'], wall.inputs['B'])
            leaf = tree.nodes.new('ShaderNodeMix')
            leaf.data_type = 'RGBA'
            leaf.inputs['B'].default_value = door
            tree.links.new(is_door.outputs['Value'], leaf.inputs['Factor'])
            tree.links.new(wall.outputs['Result'], leaf.inputs['A'])
            both = tree.nodes.new('ShaderNodeMix')
            both.data_type = 'RGBA'
            both.blend_type = 'MULTIPLY'
            both.inputs['Factor'].default_value = 1.0
            tree.links.new(painted.outputs['Color'], both.inputs['A'])
            tree.links.new(leaf.outputs['Result'], both.inputs['B'])
            tree.links.new(both.outputs['Result'], node.inputs['Base Color'])
            tree.links.new(both.outputs['Result'], node.inputs['Emission Color'])
            glow = tree.nodes.new('ShaderNodeMath')
            glow.operation = 'MULTIPLY'
            glow.inputs[1].default_value = 2.2
            tree.links.new(parts.outputs['Y'], glow.inputs[0])
            tree.links.new(glow.outputs['Value'], node.inputs['Emission Strength'])
    return material


MATERIALS = {'bread': preview(tone('#4f5a60')), 'boots': preview(tone('#5d4a36')), 'yarn': preview(tone('#6a4a3a'))}


def put(name, x, wall, door, y=0.0, z=0.0, wide=1.0):
    """A copy of a part at a place along the street, in a house's colours."""
    made = bpy.data.objects[name].copy()
    made.data = made.data.copy()
    scene.collection.objects.link(made)
    made.location = (x, y, z)
    made.scale = (wide, 1.0, 1.0)
    made.color = tone(wall)
    made.data.materials.clear()
    made.data.materials.append(MATERIALS[door])
    return made


def run(name, x0, x1, pitch, wall, door, y=0.0, z=0.0):
    """A part that tiles, from x0 to x1, a little wider or narrower so that a whole number fits."""
    count = max(1, round((x1 - x0) / pitch))
    for k in range(count):
        put(name, x0 + (x1 - x0) * k / count, wall, door, y, z, (x1 - x0) / (pitch * count))


originals = [made for made in scene.objects if made.type == 'MESH']

# --- near: the bakery, white with upright boards, and the sweet shop, ochre, up on its step ---------------------
WHITE = '#e9e6dc'
put('knut', 0.0, WHITE, 'bread')
put('ror', 1.7, WHITE, 'bread')
run('panel', 1.1, 9.2, 1.35, WHITE, 'bread')
put('skylt-bread', 5.4, WHITE, 'bread')
put('fonster-bread', 12.8, WHITE, 'bread')
run('panel', 16.4, 18.0, 1.35, WHITE, 'bread')
put('dorr', 22.0, WHITE, 'bread')
run('panel', 26.0, 30.0, 1.35, WHITE, 'bread')
run('sockel', -0.35, 18.0, 4.0, WHITE, 'bread')
run('sockel', 26.0, 30.0, 4.0, WHITE, 'bread')
put('kallarfonster', 6.0, WHITE, 'bread', 0.0, 2.3)
OCHRE = '#e3b24c'
run('panel', 30.0, 31.0, 1.35, OCHRE, 'bread', 0.0, 3.3)
put('fonster-candy', 35.9, OCHRE, 'bread', 0.0, 3.3)
run('panel', 40.8, 42.0, 1.35, OCHRE, 'bread', 0.0, 3.3)
run('sockel', 30.0, 42.0, 4.0, OCHRE, 'bread', 0.0, 3.3)

# --- far: the yarn shop with lying boards, the shoemaker's in Falu red, and a yard --------------------------------
DEPTH = 60.0
PALE = '#efe6c8'
run('liggande', 0.0, 2.0, 4.0, PALE, 'yarn', DEPTH)
put('fonster-yarn', 6.5, PALE, 'yarn', DEPTH)
run('liggande', 11.0, 14.0, 4.0, PALE, 'yarn', DEPTH)
put('port', 14.5, PALE, 'yarn', DEPTH)
run('sockel', 0.0, 14.0, 4.0, PALE, 'yarn', DEPTH)
RED = '#8f2d22'
put('knut', 21.0, RED, 'boots', DEPTH)
run('panel', 22.1, 23.0, 1.35, RED, 'boots', DEPTH)
put('fonster-boots', 28.1, RED, 'boots', DEPTH)
run('panel', 33.2, 38.0, 1.35, RED, 'boots', DEPTH)
put('skylt-boots', 35.2, RED, 'boots', DEPTH)
put('dorr', 42.0, RED, 'boots', DEPTH)
run('panel', 46.0, 47.0, 1.35, RED, 'boots', DEPTH)
run('sockel', 20.65, 38.0, 4.0, RED, 'boots', DEPTH)
run('sockel', 46.0, 47.0, 4.0, RED, 'boots', DEPTH)
put('grindstolpe', 47.8, RED, 'boots', DEPTH)
run('staket', 48.4, 63.6, 3.8, RED, 'boots', DEPTH)
run('mur', 47.0, 64.0, 4.0, RED, 'boots', DEPTH)
run('hack', 47.0, 65.0, 6.0, RED, 'boots', DEPTH)
put('bjork', 56.0, RED, 'boots', DEPTH)

for made in originals:
    made.hide_render = True

# The street: grey, under both rows.
bpy.ops.mesh.primitive_plane_add(size=400.0, location=(30.0, 0.0, 0.0))
ground = bpy.context.object
ground.name = 'street'
asphalt = bpy.data.materials.new('street')
asphalt.use_nodes = True
for node in asphalt.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        node.inputs['Base Color'].default_value = tone('#62656b')
        node.inputs['Roughness'].default_value = 1.0
ground.data.materials.append(asphalt)

# A low sun from the upper left and a little behind the houses, as in the game, and a pale blue sky.
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN'))
sun.data.energy = 3.4
sun.data.color = (1.0, 0.76, 0.43)
sun.data.angle = math.radians(6)
sun.rotation_euler = (math.radians(68), 0.0, math.radians(-62))
scene.collection.objects.link(sun)
if scene.world is not None and scene.world.use_nodes:
    for node in scene.world.node_tree.nodes:
        if node.type == 'BACKGROUND':
            node.inputs['Color'].default_value = (0.62, 0.7, 0.86, 1.0)
            node.inputs['Strength'].default_value = 1.1

camera = bpy.data.objects.new('camera', bpy.data.cameras.new('camera'))
camera.data.sensor_fit = 'VERTICAL'
camera.data.angle = math.radians(30)
scene.collection.objects.link(camera)
scene.camera = camera

try:
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 64
except TypeError:
    pass
scene.render.resolution_x = 1600
scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
try:
    scene.view_settings.view_transform = 'Standard'
except TypeError:
    pass
scene.render.film_transparent = False
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'

# Near, the camera stands as the game's does: 0.75 EL up and 18 EL from the wall. Far, it stands back.
SHOTS = (('near', Vector((14.0, -30.0, 3.2)), 0.0), ('step', Vector((35.0, -18.0, 4.05)), 0.0), ('far', Vector((33.0, DEPTH - 42.0, 3.4)), 0.0))
for name, at, tilt in SHOTS:
    camera.location = at
    camera.rotation_euler = (math.radians(90 + tilt), 0.0, 0.0)
    scene.render.filepath = OUT + '-' + name + '.png'  # noqa: F821 (set by the caller, see above)
    bpy.ops.render.render(write_still=True)
    print('rendered', scene.render.filepath, 'with', scene.render.engine)
