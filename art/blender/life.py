"""Builds the pictures of the far scenery's life (src/content/life.ts): one atlas of 1024 by 512, carried as the
texture of a plane called "life", for art/baked/boot/life.glb.

Run it inside Blender, after two first lines that set where things go:
    OUT = r'C:/.../art/baked/boot/life.glb'      the model; this script writes life.json beside it
    WORK = r'C:/.../some/scratch/folder'         where the moose's frames are rendered to, and a preview
and then send scripts/bake/export.py, with the same OUT. Headless:
    blender -b --factory-startup --python-expr "OUT=r'...'; WORK=r'...';
        exec(open('art/blender/life.py').read()); exec(open('scripts/bake/export.py').read())"

What is in the atlas, and where, is STRIPS below: the same table as in src/content/life.ts (a test holds the
two together, through life.json).

- The moose is built here from numbers: a body, a neck, a head, legs, ears and antlers, each a tube through a
  few stations. There is no armature. For every cell a gait puts the joints where they belong, the parts are
  built anew, and Cycles renders the animal from the side, without perspective, on a clear film. It is one
  grey: the game gives it its colour, mixed with the place's haze. The legs of its far side are rendered
  thinner than air, so that they are paler than the near ones.
- The birds, the smoke, the far window and the shooting star are drawn here, in white, from plain shapes.

Nothing in it comes from anyone else: no model, no picture, no photograph. It empties the scene first.
Units: 1 Blender unit is 1 EL. Z is up, the animal faces +X, and the camera looks along +Y.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import json
import math

import bmesh
import bpy
from mathutils import Matrix, Vector

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

WIDE = 1024
TALL = 512
# name: left, top, a cell's width and height, how many cells, how many in a row
STRIPS = {
    'walk': (0, 0, 160, 128, 12, 6),
    'stand': (0, 256, 160, 128, 4, 4),
    'crane': (640, 256, 96, 48, 4, 4),
    'goose': (640, 304, 96, 48, 4, 4),
    'puff': (960, 0, 64, 64, 1, 1),
    'dot': (960, 64, 32, 32, 1, 1),
    'streak': (640, 352, 128, 64, 1, 1),
}

# The picture, as Blender keeps one: four numbers a pixel, rows from the bottom. White and clear to begin with,
# so that no dark edge shows where a soft shape thins out.
atlas = [1.0, 1.0, 1.0, 0.0] * (WIDE * TALL)


def dab(x, y, alpha, shade):
    """One pixel: x from the left and y from the top, as the game counts."""
    at = ((TALL - 1 - y) * WIDE + x) * 4
    atlas[at] = shade
    atlas[at + 1] = shade
    atlas[at + 2] = shade
    atlas[at + 3] = alpha


def cell_origin(name, cell):
    strip = STRIPS[name]
    return strip[0] + (cell % strip[5]) * strip[2], strip[1] + (cell // strip[5]) * strip[3]


def clamp(value):
    return max(0.0, min(1.0, value))


# --- the drawn cells -----------------------------------------------------------------------------------------

def to_capsule(px, py, shape):
    """How far a point is from a tapered stroke: from (ax, ay) with radius ra to (bx, by) with radius rb."""
    ax, ay, bx, by, ra, rb = shape
    dx = bx - ax
    dy = by - ay
    along = clamp(((px - ax) * dx + (py - ay) * dy) / max(1e-9, dx * dx + dy * dy))
    return math.hypot(px - ax - dx * along, py - ay - dy * along) - (ra + (rb - ra) * along)


def draw_strokes(name, cell, shapes, scale, mid_x, mid_y, soft):
    """Strokes given in the shape's own measure, y up, with (0, 0) at mid_x and mid_y of the cell (y from its top)."""
    left, top = cell_origin(name, cell)
    wide = STRIPS[name][2]
    tall = STRIPS[name][3]
    for y in range(tall):
        for x in range(wide):
            px = (x + 0.5 - mid_x) / scale
            py = (mid_y - y - 0.5) / scale
            near = 9.0
            for shape in shapes:
                near = min(near, to_capsule(px, py, shape))
            alpha = clamp(0.5 - near * scale / soft)
            if alpha > 0.0:
                dab(left + x, top + y, alpha, 1.0)


def bird(neck, legs, wing):
    """A flying bird from the side, facing right, in four beats: its wings up, level, down, level."""
    body = [
        (-0.15, 0.0, 0.10, 0.01, 0.052, 0.046),
        (0.10, 0.015, 0.10 + neck, 0.045, 0.024, 0.014),
        (0.10 + neck, 0.045, 0.17 + neck, 0.04, 0.017, 0.006),
        (-0.15, 0.0, -0.25, -0.005, 0.034, 0.012),
    ]
    if legs > 0.0:
        body.append((-0.15, -0.01, -0.15 - legs, -0.05, 0.016, 0.007))
    beats = [
        [(0.02, 0.02, -0.01, 0.15 * wing, 0.065, 0.055), (-0.01, 0.15 * wing, -0.07, 0.27 * wing, 0.055, 0.018)],
        [(0.02, 0.02, -0.16, 0.08 * wing, 0.048, 0.018)],
        [(0.02, 0.0, -0.01, -0.11 * wing, 0.06, 0.05), (-0.01, -0.11 * wing, -0.06, -0.21 * wing, 0.05, 0.018)],
        [(0.02, 0.01, -0.15, -0.03 * wing, 0.048, 0.018)],
    ]
    return [body + beat for beat in beats]


crane = bird(0.30, 0.32, 1.25)
goose = bird(0.22, 0.0, 1.1)
for beat in range(4):
    draw_strokes('crane', beat, crane[beat], 66.0, 48.0, 27.0, 1.6)
    draw_strokes('goose', beat, goose[beat], 72.0, 50.0, 26.0, 1.6)

# A puff of smoke: a few soft rounds, heaped.
left, top = cell_origin('puff', 0)
PUFFS = [(32.0, 33.0, 27.0), (20.0, 27.0, 17.0), (43.0, 24.0, 16.0), (45.0, 40.0, 16.0), (22.0, 43.0, 17.0), (33.0, 18.0, 14.0)]
for y in range(64):
    for x in range(64):
        thick = 0.0
        for puff in PUFFS:
            away = math.hypot(x + 0.5 - puff[0], y + 0.5 - puff[1]) / puff[2]
            if away < 1.0:
                thick += (1.0 - away * away) ** 2
        rim = math.hypot(x + 0.5 - 32.0, y + 0.5 - 32.0) / 31.0
        # No flat middle and no edge: thick where the rounds lie over each other, thinning out to nothing.
        alpha = (1.0 - math.exp(-thick * 1.3)) * clamp(1.0 - rim ** 4)
        if alpha > 0.0:
            dab(left + x, top + y, alpha, 1.0)

# A far light: a small bright middle in a soft glow.
left, top = cell_origin('dot', 0)
for y in range(32):
    for x in range(32):
        away = math.hypot(x + 0.5 - 16.0, y + 0.5 - 16.0)
        alpha = clamp((15.0 - away) / 9.0) ** 1.6
        if alpha > 0.0:
            dab(left + x, top + y, alpha, 1.0)

# A shooting star, falling to the left: its head bright and low, its tail thinning out behind and above it.
left, top = cell_origin('streak', 0)
TAIL = (118.0, 9.0)
HEAD = (11.0, 54.0)
for y in range(64):
    for x in range(128):
        dx = HEAD[0] - TAIL[0]
        dy = HEAD[1] - TAIL[1]
        along = clamp(((x + 0.5 - TAIL[0]) * dx + (y + 0.5 - TAIL[1]) * dy) / (dx * dx + dy * dy))
        away = math.hypot(x + 0.5 - TAIL[0] - dx * along, y + 0.5 - TAIL[1] - dy * along)
        width = 0.9 + 1.9 * along
        alpha = along ** 1.6 * math.exp(-(away / width) ** 2)
        if alpha > 0.004:
            dab(left + x, top + y, clamp(alpha), 1.0)

# --- what each cell holds, for the tests ---------------------------------------------------------------------

def measure(name, cell):
    """A cell's lowest covered row (from its top), its box, and how much of it is covered."""
    left, top = cell_origin(name, cell)
    wide = STRIPS[name][2]
    tall = STRIPS[name][3]
    box = [wide, tall, -1, -1]
    solid = 0
    foot = -1
    for y in range(tall):
        for x in range(wide):
            alpha = atlas[((TALL - 1 - top - y) * WIDE + left + x) * 4 + 3]
            if alpha > 0.02:
                box = [min(box[0], x), min(box[1], y), max(box[2], x), max(box[3], y)]
            if alpha > 0.5:
                solid += 1
                foot = max(foot, y)
    return {'foot': foot, 'box': box, 'cover': round(solid / (wide * tall), 4)}


report = {'atlas': [WIDE, TALL], 'strips': {name: list(STRIPS[name]) for name in STRIPS}, 'cells': {}}
for name in STRIPS:
    if name in ('walk', 'stand'):
        continue
    report['cells'][name] = [measure(name, cell) for cell in range(STRIPS[name][4])]

# --- the plane that carries the picture --------------------------------------------------------------------

image = bpy.data.images.new('life-atlas', WIDE, TALL, alpha=True)
image.alpha_mode = 'STRAIGHT'
image.pixels.foreach_set(atlas)
image.pack()

material = bpy.data.materials.new('life')
material.use_nodes = True
material.blend_method = 'BLEND'
for node in material.node_tree.nodes:
    if node.type == 'BSDF_PRINCIPLED':
        texture = material.node_tree.nodes.new('ShaderNodeTexImage')
        texture.image = image
        material.node_tree.links.new(texture.outputs['Color'], node.inputs['Base Color'])
        material.node_tree.links.new(texture.outputs['Alpha'], node.inputs['Alpha'])
        node.inputs['Roughness'].default_value = 1.0

bm = bmesh.new()
uv = bm.loops.layers.uv.new('UVMap')
corners = [bm.verts.new((x, 0.0, z)) for x, z in ((-1.0, -0.5), (1.0, -0.5), (1.0, 0.5), (-1.0, 0.5))]
face = bm.faces.new(corners)
for loop in face.loops:
    loop[uv].uv = (loop.vert.co.x * 0.5 + 0.5, loop.vert.co.z + 0.5)
mesh = bpy.data.meshes.new('life')
bm.to_mesh(mesh)
bm.free()
mesh.materials.append(material)
plane = bpy.data.objects.new('life', mesh)
bpy.context.scene.collection.objects.link(plane)
plane['role'] = 'life'

# The numbers, beside the model: the same folder and name, as .json.
text = bpy.data.texts.new('life.json')
text.write(json.dumps(report, indent=1) + '\n')
with bpy.context.temp_override(edit_text=text):
    bpy.ops.text.save_as(filepath=OUT[:-4] + '.json', check_existing=False)  # noqa: F821 (set by the caller, see above)

# A look at it, for the one who runs this: the picture as it is, and on the bog's mist in the moose's colour.
look = bpy.data.images.new('life-look', WIDE, TALL, alpha=False)
shown = [0.0] * (WIDE * TALL * 4)
MIST = (0.965, 0.925, 0.831)
INK = (0.227, 0.204, 0.180)
for at in range(0, WIDE * TALL * 4, 4):
    alpha = atlas[at + 3]
    for channel in range(3):
        shown[at + channel] = MIST[channel] + (INK[channel] * min(1.0, atlas[at + channel] * 1.6) - MIST[channel]) * alpha
    shown[at + 3] = 1.0
look.pixels.foreach_set(shown)
look.filepath_raw = WORK + '/life-look.png'  # noqa: F821
look.file_format = 'PNG'
look.save()
bpy.data.images.remove(look)
print('life built:', [o.name for o in bpy.data.objects], 'cells', sum(STRIPS[name][4] for name in STRIPS))
