"""Generic, non-likeness garden buildings for public checkouts without the private home pack.

These deliberately simple buildings are not reconstructions of the family photographs.
Run with Blender 4.5 / bpy 4.5.14 from the repository root. No images or textures.
"""
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[2]
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
material = bpy.data.materials.new('Garden paint')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = .85
colour_node = material.node_tree.nodes.new('ShaderNodeVertexColor')
colour_node.layer_name = 'Color'
material.node_tree.links.new(colour_node.outputs['Color'], shader.inputs['Base Color'])


def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4


def paint(obj, hex_colour):
    colour = tuple(linear(int(hex_colour[i:i + 2], 16) / 255) for i in (1, 3, 5)) + (1,)
    layer = obj.data.color_attributes.new(name='Color', type='BYTE_COLOR', domain='CORNER')
    for value in layer.data:
        value.color = colour
    obj.data.materials.append(material)
    pieces.append(obj)


def box(at, size, colour):
    bpy.ops.mesh.primitive_cube_add(size=1, location=at)
    obj = bpy.context.object
    obj.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    paint(obj, colour)


def roof(width, depth, bottom, height, colour):
    vertices = [(-width/2, -depth/2, bottom), (width/2, -depth/2, bottom),
                (0, -depth/2, bottom+height), (-width/2, depth/2, bottom),
                (width/2, depth/2, bottom), (0, depth/2, bottom+height)]
    mesh = bpy.data.meshes.new('Pitched roof')
    mesh.from_pydata(vertices, [], [(0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (0, 2, 5, 3), (1, 4, 5, 2)])
    mesh.update()
    obj = bpy.data.objects.new('Roof', mesh)
    bpy.context.collection.objects.link(obj)
    paint(obj, colour)


def window(x, y, z, width, height):
    box((x, y, z), (width+.28, .15, height+.28), '#eee5d0')
    box((x, y-.09, z), (width, .05, height), '#668b93')
    box((x, y-.13, z), (.10, .06, height), '#eee5d0')


def finish(name):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in pieces:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = pieces[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    return obj


pieces = []
box((0, 0, 5.5), (18, 8, 11), '#8e4436')
roof(19, 9, 11, 5, '#49505b')
for x in (-5.5, 0, 5.5):
    for z in (3.5, 8):
        window(x, -4.1, z, 1.8, 2.5)
box((0, -5.6, .35), (20, 4, .7), '#aa8c63')
for x in (-9.6, -5, 5, 9.6):
    box((x, -7.3, 1.4), (.25, .25, 2.1), '#e7dfc9')
box((0, -7.3, 2.3), (19.5, .3, .25), '#e7dfc9')
finish('home-house')

pieces = []
box((0, 0, 3.5), (5, 4.5, 7), '#779780')
roof(5.7, 5.2, 7, 3, '#525a63')
box((0, -2.33, 1.6), (1.5, .16, 3.2), '#e5dfc6')
window(-1.55, -2.34, 4.9, .85, 1.5)
window(1.55, -2.34, 4.9, .85, 1.5)
finish('home-playhouse')

pieces = []
box((0, 0, 2), (6.5, 5, 4), '#807467')
roof(7.6, 6, 4, 4, '#515358')
box((1, -2.59, 1.6), (1.5, .16, 3.2), '#4f493e')
window(-1.7, -2.6, 2.2, 1.2, 1.3)
finish('home-kota')

out = ROOT / 'art/baked/boot/garden-fallback.glb'
out.parent.mkdir(parents=True, exist_ok=True)
bpy.context.scene['_export_selected_only'] = True
bpy.ops.object.select_all(action='SELECT')
exec(compile((ROOT / 'scripts/bake/export.py').read_text(), 'export.py', 'exec'), {'OUT': str(out)})
