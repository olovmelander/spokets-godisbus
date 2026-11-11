"""Original family bathroom and TV, shared by all home chapters; no private references or brands.

Fresh scene only. Run in Blender or bpy, then scripts/bake/export.py with OUT set to
art/baked/aventyr2/home-routine.glb. The original animated programme is drawn at runtime.
Read the shared placement contract in src/content/home-layout.json. The bathroom is
world-positioned; the door is hinge-local and the independent home-tv is origin-local.
Run this file in a fresh bpy process with runpy.run_path, then the required exporter.
Do not open an existing blend or include any private model in this public asset.
"""
import bpy
import bmesh
import json
from math import cos, sin, tau
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
layout = json.loads((ROOT / 'src/content/home-layout.json').read_text())
bath = layout['bathroom']
tv = layout['television']

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

def mesh_part(vertices, faces, colour, smooth=False):
    mesh = bpy.data.meshes.new('original fixture detail')
    mesh.from_pydata([(x, -z, y) for x, y, z in vertices], [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new('fixture detail', mesh)
    bpy.context.collection.objects.link(obj)
    if smooth:
        for polygon in mesh.polygons:
            polygon.use_smooth = True
    return finish_part(obj, colour, 0)

def rod(start, end, radius, colour, segments=12):
    a, b = (Vector((p[0], -p[2], p[1])) for p in (start, end))
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius,
        depth=(b - a).length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = (b - a).to_track_quat('Z', 'Y').to_euler()
    for polygon in obj.data.polygons:
        polygon.use_smooth = len(polygon.vertices) == 4
    return finish_part(obj, colour, .008)

def tapered_leg(x, z, height, top_width, bottom_width, colour):
    vertices = [(x + dx * width / 2, y, z + dz * width / 2)
        for y, width in ((0, bottom_width), (height, top_width))
        for dx, dz in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    return mesh_part(vertices, [(0, 3, 2, 1), (4, 5, 6, 7),
        (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)], colour)

def join(name, objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    bpy.context.object.name = name

x, front, back = bath['x'], bath['doorZ'], bath['backZ']
width, height, thickness = bath['width'], bath['height'], bath['wallThickness']
# The room sits behind the house wall. Only its doorway trim reaches forward;
# exposed structural ends would otherwise outline a second, oversized doorway.
shell_front = layout['wall']['z'] - .01
depth, middle = shell_front - back, (shell_front + back) / 2
inside_width = width - thickness
tile_top = 3.05
floor_y = bath['floorY']
floor_front = front - .18
floor_depth = floor_front - back
floor_middle = (floor_front + back) / 2
walls = [box(width + thickness, height, thickness, x, height / 2, back, '#e6e0d3'),
    box(width + thickness, thickness, depth + thickness / 2, x, height - thickness / 2,
        middle - thickness / 4, '#f1ebdf'),
    # A thin tile finish sits above the continuous wood base. The shallow threshold
    # ramps up from y=0 instead of introducing a vertical step in Elof's walk.
    box(inside_width, .034, floor_depth, x, floor_y - .023, floor_middle, '#d0d7ce', 0)]
half_opening = bath['openingWidth'] / 2
walls.append(mesh_part([(x - half_opening, -.015, front + .18),
    (x + half_opening, -.015, front + .18), (x + half_opening, -.015, front - .18),
    (x - half_opening, -.015, front - .18), (x - half_opening, 0, front + .18),
    (x + half_opening, 0, front + .18), (x + half_opening, floor_y, front - .18),
    (x - half_opening, floor_y, front - .18)],
    [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5),
     (2, 3, 7, 6), (3, 0, 4, 7)], '#c8c3b4'))
for side in (-1, 1):
    sx = x + side * width / 2
    walls += [box(thickness, height, depth, sx, height / 2, middle, '#e6e0d3'),
        box(.028, tile_top, depth - .1, sx - side * (thickness / 2 + .014), tile_top / 2, middle, '#c9d9d1'),
        box(.06, .10, depth - .1, sx - side * (thickness / 2 + .03), tile_top, middle, '#edf0e4'),
        box(.065, .23, depth - .1, sx - side * (thickness / 2 + .033), .115, middle, '#e3e4d8')]
    for row in range(1, 5):
        walls.append(box(.006, .018, depth - .13, sx - side * (thickness / 2 + .031),
            row * .6, middle, '#e6ece2', 0))
    for column in range(1, 8):
        walls.append(box(.006, tile_top - .13, .018, sx - side * (thickness / 2 + .031),
            tile_top / 2, back + column * .65, '#e6ece2', 0))
back_face = back + thickness / 2
walls += [box(inside_width, tile_top, .028, x, tile_top / 2, back_face + .014, '#c9d9d1'),
    box(inside_width, .10, .06, x, tile_top, back_face + .03, '#edf0e4'),
    box(inside_width, .23, .065, x, .115, back_face + .033, '#e3e4d8')]
for row in range(1, 5):
    walls.append(box(inside_width - .06, .018, .006, x, row * .6, back_face + .031, '#e6ece2', 0))
for column in range(-3, 4):
    walls.append(box(.018, tile_top - .13, .006, x + column * .6, tile_top / 2,
        back_face + .031, '#e6ece2', 0))
# Recessed grout and separate tile faces avoid coplanar overlays in the deep room.
tile_colours = ('#aebbb3', '#b3beb6', '#b0bcb4')
left = x - inside_width / 2
for column in range(8):
    tile_left, tile_right = left + column * .6, min(left + (column + 1) * .6, x + inside_width / 2)
    for row in range(9):
        tile_back, tile_front = back + row * .6, min(back + (row + 1) * .6, floor_front)
        if tile_right <= tile_left or tile_front <= tile_back:
            continue
        walls.append(box(tile_right - tile_left - .018, .006, tile_front - tile_back - .018,
            (tile_left + tile_right) / 2, floor_y - .003, (tile_back + tile_front) / 2,
            tile_colours[(column + 2 * row) % len(tile_colours)], 0))
# A complete doorway trims the actual opening in the house's rear wall.
for side in (-1, 1):
    walls.append(box(.17, bath['openingHeight'], .30,
        x + side * (bath['openingWidth'] / 2 + .085), bath['openingHeight'] / 2, front, '#eee6d6'))
walls.append(box(bath['openingWidth'] + .34, .19, .30, x,
    bath['openingHeight'] + .095, front, '#eee6d6'))

# A compact oak vanity, rounded hollow ceramic bowl and a small unbranded tap.
sink = bath['sinkZ']
walls += [box(2.18, 1.05, .94, x, .925, sink, '#a9815e', .055),
    box(2.28, .12, 1.05, x, 1.46, sink, '#d4bea0', .04)]
for side in (-1, 1):
    walls += [box(.98, .88, .045, x + side * .52, .94, sink + .49, '#c5a17b', .02),
        box(.22, .055, .055, x + side * .20, 1.22, sink + .527, '#9f8c6a', .012)]
    for dz in (-.34, .34):
        walls.append(tapered_leg(x + side * .88, sink + dz, .43, .17, .12, '#806046'))
# Outer profile rises to a round rim, then folds inward and down into the bowl.
profile = [(.55, .27, 1.51), (.84, .43, 1.59), (.96, .50, 1.74),
    (.95, .50, 1.81), (.86, .41, 1.81), (.78, .36, 1.68), (.45, .20, 1.56), (.045, .035, 1.55)]
segments = 32
vertices = [(x + rx * cos(i * tau / segments), y, sink + rz * sin(i * tau / segments))
    for rx, rz, y in profile for i in range(segments)]
faces = [(ring * segments + i, ring * segments + (i + 1) % segments,
    (ring + 1) * segments + (i + 1) % segments, (ring + 1) * segments + i)
    for ring in range(len(profile) - 1) for i in range(segments)]
faces += [tuple(reversed(range(segments))), tuple(range((len(profile) - 1) * segments, len(profile) * segments))]
walls.append(mesh_part(vertices, faces, '#edf1e8', True))
walls += [rod((x, 1.55, sink), (x, 1.56, sink), .05, '#7d8d8d', 16),
    rod((x, 1.52, sink - .40), (x, 2.19, sink - .40), .055, '#8f9e9b'),
    rod((x, 2.19, sink - .40), (x, 2.19, sink - .13), .055, '#aab8b4'),
    rod((x, 2.19, sink - .13), (x, 2.10, sink - .13), .055, '#aab8b4'),
    box(.23, .055, .11, x, 1.96, sink - .40, '#bcc5be', .018)]

# Framed mirror, linen towel and a warm wall light, all beyond the clear entrance.
walls += [box(2.08, 2.46, .13, x, 3.82, back_face + .105, '#b79c74', .07),
    box(1.88, 2.26, .025, x, 3.82, back_face + .184, '#91adb1', .05),
    box(1.57, .025, .006, x, 4.76, back_face + .201, '#c5d6d2', .004),
    box(.42, .44, .12, x, 5.42, back_face + .12, '#a58c60', .06),
    box(.88, .29, .30, x, 5.42, back_face + .31, '#f3deb3', .09),
    rod((x - 1.76, 2.66, back_face + .22), (x - 1.08, 2.66, back_face + .22), .035, '#a8b1a5')]
towel_x = x - 1.42
for fold in range(7):
    walls.append(box(.085, 1.12 - .025 * (fold % 2), .035,
        towel_x + (fold - 3) * .082, 2.10, back_face + .245 + .025 * (fold % 2),
        '#528e92' if fold % 2 else '#6da4a5', .01))
walls.append(box(.57, .045, .045, towel_x, 1.62, back_face + .26, '#d7e2d8', .008))
join('home-routine-room', walls)

# Independent origin-local television and a solid cabinet; screen content remains runtime canvas.
cw, cd, top = tv['consoleWidth'], tv['consoleDepth'], tv['consoleTop']
television = [box(cw, 1.15, cd - .06, 0, top - .12 - .575, -.03, '#886348', .06),
    box(cw, .12, cd, 0, top - .06, 0, '#b28b62', .045)]
for side in (-1, 1):
    television += [box(cw / 2 - .14, .94, .045, side * cw / 4, .86, cd / 2 - .0325, '#b58f67', .025),
        box(.25, .045, .025, side * .22, 1.12, cd / 2 - .0125, '#66503c', .01)]
    for dz in (-cd / 2 + .17, cd / 2 - .17):
        television.append(tapered_leg(side * (cw / 2 - .30), dz, .30, .19, .13, '#6f513c'))
    # Restrained grain on the cabinet front reads as wood rather than a blank slab.
    for grain in range(3):
        television.append(box(.012, .60 - grain * .08, .006, side * (1.15 + grain * .23),
            .84 + grain * .035, cd / 2 - .003, '#a9825d', .002))
sw, sh, sy, sz = tv['screenWidth'], tv['screenHeight'], tv['screenY'], tv['screenZ']
frame_w, frame_h = sw + .40, sh + .33
television += [box(frame_w, frame_h, .14, 0, sy, -.05, '#253236', .05),
    box(frame_w, .165, .105, 0, sy + sh / 2 + .0825, .0675, '#334247', .035),
    box(frame_w, .165, .105, 0, sy - sh / 2 - .0825, .0675, '#334247', .035)]
for side in (-1, 1):
    television.append(box(.20, sh, .105, side * (sw / 2 + .10), sy, .0675, '#334247', .035))
    television.append(rod((side * 1.18, top, .20), (side * 1.08, sy - frame_h / 2 + .06, -.025), .045, '#384749'))
join('home-tv', television)

join('home-routine-door', [box(bath['doorWidth'], bath['doorHeight'], .14,
    bath['doorWidth'] / 2, bath['doorHeight'] / 2, 0, '#e5ddcb'),
    box(2.9, 2.15, .06, 1.8, 4.15, .1, '#f2ebdc'), box(2.9, 2.15, .06, 1.8, 1.65, .1, '#f2ebdc'),
    box(.45, .09, .12, 3.15, 2.6, .19, '#9a9b91')])
join('home-toothbrush', [box(.035, .26, .04, 0, 0, 0, '#409bbc', .006), box(.075, .095, .065, 0, .17, 0, '#eeeade', .006)])
