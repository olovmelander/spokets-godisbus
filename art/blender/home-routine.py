"""Generic family bathroom and TV, shared by all home chapters; no private references or brand marks.

Fresh scene only. Run in Blender or bpy, then scripts/bake/export.py with OUT set to
art/baked/aventyr2/home-routine.glb. The original animated programme is drawn at runtime.
The coordinates match the public fallback in src/render/home-routine.ts (game x, up, depth).
"""
import bpy

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

material = bpy.data.materials.new('home-vertex-colours')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .72
colour_node = material.node_tree.nodes.new('ShaderNodeVertexColor')
colour_node.layer_name = 'Color'
material.node_tree.links.new(colour_node.outputs['Color'], bsdf.inputs['Base Color'])

def linear(hex_colour):
    rgb = [int(hex_colour[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in rgb) + (1,)

def finish_part(obj, colour, bevel=.025):
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        mod = obj.modifiers.new('soft handmade edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        bpy.ops.object.modifier_apply(modifier=mod.name)
    layer = obj.data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='CORNER')
    shade = linear(colour)
    for corner in layer.data:
        corner.color = shade
    obj.data.materials.clear()
    obj.data.materials.append(material)
    return obj

def box(w, h, d, x, y, z, colour, bevel=.025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y))
    obj = bpy.context.object
    obj.scale = (w, d, h)
    return finish_part(obj, colour, min(bevel, min(w, h, d) / 4))

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = name

x, z = 35.5, -3.8
walls = []
for side in (-1, 1):
    walls.append(box(.18, 6.2, .32, x + side * 1.9, 3.1, z, '#ede7d8'))
walls += [box(4, .22, .34, x, 6.15, z, '#ede7d8'), box(4, .07, .55, x, .02, z, '#b6a28b'),
          box(4.2, 6.2, .12, x, 3.1, -8.6, '#bdd6d3'), box(4.2, .035, 4.9, x, .01, -6.2, '#a4bdbb')]
for i in range(1, 9):
    walls.append(box(4.2, .022, .02, x, .7 * i, -8.52, '#eef0df', 0))
for i in range(6):
    walls.append(box(.022, 6.1, .02, x - 1.8 + .7 * i, 3.05, -8.52, '#eef0df', 0))
walls += [box(1.9, 2.2, .12, x, 4, -8.4, '#e9e5d7'), box(1.62, 1.92, .03, x, 4, -8.31, '#8eabb8'),
          box(2.2, .18, 1.1, x, 1.65, -7.3, '#f4f0e3'), box(.28, 1.6, .3, x, .8, -7.3, '#dddcd2')]
# Rounded oval washbasin under the mirror.
bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=(x, 7.3, 1.65))
bpy.context.object.scale = (.87, .435, .235)
walls.append(finish_part(bpy.context.object, '#c8dfdf', 0))
walls += [box(.1, .5, .1, x, 1.98, -7.65, '#909da3'), box(.1, .1, .35, x, 2.18, -7.51, '#a5afb1'),
          box(.65, 1.2, .05, x - 1.45, 2.4, -8.33, '#3e8ca5')]
# A plain television and stand beside the sofa. No sign, logo or prerecorded programme.
walls += [box(4.1, .2, 1.2, 30.8, 1.42, -5.9, '#83634b'), box(.17, 1.4, .6, 29.1, .7, -5.9, '#73533b'),
          box(.17, 1.4, .6, 32.5, .7, -5.9, '#73533b'), box(3.9, 2.3, .24, 30.8, 2.76, -5.9, '#29363b'),
          box(.25, .4, .5, 30.8, 1.6, -5.9, '#29363b')]
join('home-routine-room', walls)
join('home-routine-door', [box(3.6, 5.9, .14, 1.8, 2.95, 0, '#e5ddcb'),
    box(2.9, 2.15, .06, 1.8, 4.15, .1, '#f2ebdc'), box(2.9, 2.15, .06, 1.8, 1.65, .1, '#f2ebdc'),
    box(.45, .09, .12, 3.15, 2.6, .19, '#9a9b91')])
join('home-toothbrush', [box(.035, .26, .04, 0, 0, 0, '#409bbc', .006), box(.075, .095, .065, 0, .17, 0, '#eeeade', .006)])
