"""Builds lavskrikan, the Siberian jay: the helper from Kapitel 2 on (plan 4.6), and the friend he shares a
lingonberry with (P6). Stylized and round: grey-brown, with a dark cap and a rust-red tail, rump and wing patch.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up.
The bird stands with its feet at the origin and faces +X, as the stand-in built in code does. Its wings are
two objects of their own, wingNear (towards the camera, Blender's -Y) and wingFar, each with its origin at
the shoulder, so that the game can beat them. Nothing in this model comes from anyone else, and it has no
texture: every part is one plain colour.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bpy

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)

# The colours as they are meant to look (sRGB, 0 to 255), and how rough each is.
COLOURS = {
    'feather': ((140, 127, 114), 0.9),
    'belly': ((180, 167, 150), 0.9),
    'cap': ((74, 60, 51), 0.9),
    'rust': ((181, 98, 44), 0.85),
    'wing': ((111, 99, 87), 0.9),
    'dark': ((42, 38, 34), 0.45),
    'eye': ((12, 12, 12), 0.12),
}


def linear(value):
    """Blender wants light, not paint: an sRGB value from 0 to 255 as linear light from 0 to 1."""
    c = value / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


MATERIALS = {}
for name in COLOURS:
    paint = COLOURS[name][0]
    colour = (linear(paint[0]), linear(paint[1]), linear(paint[2]), 1.0)
    rough = COLOURS[name][1]
    material = bpy.data.materials.new('jay-' + name)
    material.use_nodes = True
    for node in material.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Base Color'].default_value = colour
            node.inputs['Roughness'].default_value = rough
    MATERIALS[name] = material


def ball(name, colour, location, scale, turn_y=0.0):
    """A sphere pulled into shape: the stuff of a round bird."""
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=1.0, location=location)
    made = bpy.context.object
    made.name = name
    made.scale = scale
    made.rotation_euler = (0.0, turn_y, 0.0)
    made.data.materials.append(MATERIALS[colour])
    bpy.ops.object.shade_smooth()
    return made


def join(parts, name):
    """Makes one object of several, keeping the first one's place as its origin."""
    bpy.ops.object.select_all(action='DESELECT')
    for part in parts:
        part.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    made = bpy.context.object
    made.name = name
    return made


# --- the body: plump, with its chest a little up, a paler belly and a rust rump ---------------------------
body = ball('body', 'feather', (0.0, 0.0, 0.36), (0.30, 0.21, 0.215), -0.22)
belly = ball('belly', 'belly', (0.06, 0.0, 0.315), (0.235, 0.185, 0.17), -0.22)
rump = ball('rump', 'rust', (-0.215, 0.0, 0.385), (0.115, 0.135, 0.095), 0.3)
body = join([body, belly, rump], 'body')

# --- the head: round, with the dark cap pulled down over the crown -----------------------------------------
head = ball('head', 'feather', (0.215, 0.0, 0.555), (0.15, 0.145, 0.14))
cheek = ball('cheek', 'belly', (0.25, 0.0, 0.525), (0.12, 0.15, 0.10))
cap = ball('cap', 'cap', (0.195, 0.0, 0.625), (0.138, 0.136, 0.085), 0.12)
head = join([head, cheek, cap], 'head')

bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=0.036, radius2=0.0, depth=0.14, location=(0.395, 0.0, 0.548))
beak = bpy.context.object
beak.name = 'beak'
beak.rotation_euler = (0.0, math.radians(90), 0.0)
beak.data.materials.append(MATERIALS['dark'])
bpy.ops.object.shade_smooth()

eyes = []
for side in (-1.0, 1.0):
    eyes.append(ball('eye', 'eye', (0.305, side * 0.108, 0.585), (0.03, 0.03, 0.03)))
eyes = join(eyes, 'eyes')

# --- the tail: long, flat and rust-red, lifted a little -----------------------------------------------------
tail = ball('tail', 'rust', (-0.40, 0.0, 0.335), (0.215, 0.075, 0.022), 0.32)

# --- the wings: folded along the sides, each with a rust patch, and its origin at the shoulder -------------
for side_name in ('wingNear', 'wingFar'):
    side = -1.0 if side_name == 'wingNear' else 1.0
    wing = ball(side_name, 'wing', (-0.045, side * 0.185, 0.385), (0.205, 0.035, 0.125), -0.32)
    patch = ball('patch', 'rust', (-0.02, side * 0.212, 0.375), (0.085, 0.02, 0.05), -0.32)
    wing = join([wing, patch], side_name)
    bpy.context.scene.cursor.location = (0.06, side * 0.16, 0.47)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)

# --- the legs: thin and dark, with a foot each ------------------------------------------------------------
legs = []
for side in (-1.0, 1.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.014, depth=0.2, location=(0.03, side * 0.065, 0.10))
    leg = bpy.context.object
    leg.data.materials.append(MATERIALS['dark'])
    bpy.ops.object.shade_smooth()
    legs.append(leg)
    legs.append(ball('foot', 'dark', (0.055, side * 0.065, 0.012), (0.06, 0.028, 0.012)))
legs = join(legs, 'legs')

# What it is, for the game: a custom property that arrives as userData.
body['role'] = 'jay'
print('jay built:', len(bpy.data.objects), 'objects')
