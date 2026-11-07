"""Builds the common crane of Myren and Berget (plan 4.4, 4.5): kneeling on the bog for Elof to climb on, and in
flight with him on its back. It takes the place of the stand-in built in code (src/render/crane.ts), with the same
parts by the same names, so that the game moves them as before.

Run it inside Blender. It empties the scene first. Units: 1 Blender unit is 1 EL; Blender's Z is up, the bird faces
+X, and the camera's side is -Y. Every part is one mesh with its colours on its corners (the attribute "Color"), so
that each part that moves is one draw:
  crane-kneeling: crane-torso (body, folded wings, bustle), crane-neck with crane-head on it, crane-legs;
  crane-flying: crane-body (body, tail, neck, head, trailing legs), wingNear with wingTipNear, wingFar with
  wingTipFar (the near wing mirrored). Each wing's origin is at the shoulder, each tip's at the wrist.
Nothing in this model comes from anyone else, and it has no texture.

Keep this file in plain ASCII: it is sent to Blender as text.
"""
import math

import bpy  # first: it makes bmesh and mathutils importable outside Blender's own Python
import bmesh
from mathutils import Vector

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for item in list(bpy.data.meshes):
    if item.users == 0:
        bpy.data.meshes.remove(item)
for item in list(bpy.data.materials):
    if item.users == 0:
        bpy.data.materials.remove(item)


def linear(value):
    """Blender wants light, not paint: an sRGB value from 0 to 255 as linear light from 0 to 1."""
    c = value / 255.0
    if c <= 0.04045:
        return c / 12.92
    return ((c + 0.055) / 1.055) ** 2.4


def rgb(hexcode):
    return (linear(int(hexcode[1:3], 16)), linear(int(hexcode[3:5], 16)), linear(int(hexcode[5:7], 16)), 1.0)


def mix(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(a[i] + (b[i] - a[i]) * t for i in range(4))


def smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3 - 2 * t)


GREY = rgb('#9aa1a8')
BACK = rgb('#8a9198')
PALE = rgb('#b3b9be')
BLACK = rgb('#24262a')
SLATE = rgb('#3a3e44')
WHITE = rgb('#eceae4')
RED = rgb('#c0352a')
HORN = rgb('#8b8a6a')
EYE = rgb('#6a1e10')
LEG = rgb('#2b2c2e')


def material(name, double):
    made = bpy.data.materials.new(name)
    made.use_nodes = True
    made.use_backface_culling = not double
    for node in made.node_tree.nodes:
        if node.type == 'BSDF_PRINCIPLED':
            node.inputs['Roughness'].default_value = 0.85
            attribute = made.node_tree.nodes.new('ShaderNodeVertexColor')
            attribute.layer_name = 'Color'
            made.node_tree.links.new(attribute.outputs['Color'], node.inputs['Base Color'])
    return made


SOLID = material('crane', False)
FEATHER = material('crane-feather', True)


class Part:
    """A mesh while it is built: its points, each with its colour."""

    def __init__(self):
        self.bm = bmesh.new()
        self.colour = self.bm.verts.layers.float_color.new('Color')

    def point(self, at, colour):
        made = self.bm.verts.new(at)
        made[self.colour] = colour
        return made

    def face(self, verts):
        try:
            return self.bm.faces.new(verts)
        except ValueError:
            return None


def tube(part, centres, radii, colour_of, around=12, squash=(1.0, 1.0), cap=True):
    """Rings round a line of centres: radii[i] at centre i, each point's colour from colour_of(i, angle, offset)."""
    rings = []
    for i, c in enumerate(centres):
        ahead = centres[min(i + 1, len(centres) - 1)] - centres[max(i - 1, 0)]
        ahead.normalize()
        side = Vector((0, 1, 0))
        up = ahead.cross(side)
        if up.length < 1e-6:
            up = Vector((0, 0, 1))
        up.normalize()
        side = up.cross(ahead)
        side.normalize()
        ring = []
        for j in range(around):
            a = 2 * math.pi * j / around
            offset = side * math.sin(a) * radii[i] * squash[0] + up * math.cos(a) * radii[i] * squash[1]
            ring.append(part.point(c + offset, colour_of(i, a, offset)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(around):
            part.face([rings[i][j], rings[i][(j + 1) % around], rings[i + 1][(j + 1) % around], rings[i + 1][j]])
    if cap:
        for ring, flip in ((rings[0], True), (rings[-1], False)):
            part.face(list(reversed(ring)) if flip else ring)
    return rings


def body(part, profile, around, colour_of, centre_z=0.0):
    """A body of revolution along X from profile [(x, height, depth, lift)], closed at both ends."""
    centres = [Vector((x, 0, centre_z + lift)) for x, h, d, lift in profile]
    rings = []
    for i, (x, h, d, lift) in enumerate(profile):
        ring = []
        for j in range(around):
            a = 2 * math.pi * j / around
            at = Vector((x, math.sin(a) * d, centre_z + lift + math.cos(a) * h))
            ring.append(part.point(at, colour_of(x, a, h)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(around):
            part.face([rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % around], rings[i][(j + 1) % around]])
    tail = part.point(centres[0] - Vector((0.03, 0, 0)), colour_of(profile[0][0], 0, 0))
    nose = part.point(centres[-1] + Vector((0.03, 0, 0)), colour_of(profile[-1][0], 0, 0))
    for j in range(around):
        part.face([tail, rings[0][(j + 1) % around], rings[0][j]])
        part.face([nose, rings[-1][j], rings[-1][(j + 1) % around]])


def feather(part, root, ahead, side, long, wide, droop, colour_root, colour_tip, steps=7, bend=None):
    """One long feather: a curved blade from `root` along `ahead`, `wide` across `side`, its quill raised, bending
    by `droop` towards `bend` (by default, square to its face)."""
    ahead = ahead.normalized()
    side = side.normalized()
    down = (bend if bend is not None else ahead.cross(side)).normalized()
    rows = []
    for s in range(steps + 1):
        t = s / steps
        bend = ahead * (long * t) + down * (droop * long * t * t)
        w = wide * (math.sin(math.pi * min(1.0, t * 1.15)) ** 0.6) * (1 - 0.25 * t) + 0.004
        c = root + bend
        colour = mix(colour_root, colour_tip, smooth((t - 0.35) / 0.65))
        rows.append([part.point(c - side * w, colour), part.point(c - down * 0.006 * (1 - t), colour), part.point(c + side * w, colour)])
    for s in range(steps):
        a, b = rows[s], rows[s + 1]
        part.face([a[0], b[0], b[1], a[1]])
        part.face([a[1], b[1], b[2], a[2]])


def sphere(part, centre, radii, colour_of, rings=10, around=14):
    made = bmesh.ops.create_uvsphere(part.bm, u_segments=around, v_segments=rings, radius=1.0)['verts']
    for v in made:
        local = Vector((v.co.x * radii[0], v.co.y * radii[1], v.co.z * radii[2]))
        v.co = centre + local
        v[part.colour] = colour_of(Vector((local.x / radii[0], local.y / radii[1], local.z / radii[2])))


def cone(part, base, tip, radius, colour, around=10):
    axis = tip - base
    made = bmesh.ops.create_cone(part.bm, cap_ends=True, segments=around, radius1=radius, radius2=0.002, depth=axis.length)['verts']
    turn = Vector((0, 0, 1)).rotation_difference(axis.normalized()).to_matrix()
    for v in made:
        v.co = base + turn @ (v.co + Vector((0, 0, axis.length / 2)))
        v[part.colour] = colour


def finish(name, part, parent=None, at=(0, 0, 0), double=False, subsurf=0, scale=None):
    mesh = bpy.data.meshes.new(name)
    bmesh.ops.recalc_face_normals(part.bm, faces=part.bm.faces)
    part.bm.normal_update()
    part.bm.to_mesh(mesh)
    part.bm.free()
    mesh.materials.append(FEATHER if double else SOLID)
    for poly in mesh.polygons:
        poly.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = at
    if scale is not None:
        obj.scale = scale
    if subsurf:
        mod = obj.modifiers.new('smooth', 'SUBSURF')
        mod.levels = subsurf
        mod.render_levels = subsurf
    return obj


def empty(name, parent=None, at=(0, 0, 0)):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.parent = parent
    obj.location = at
    return obj


def head(part, centre, r, tilt=-0.12):
    """Black, with the white patch behind the eye running into the neck, the red crown, a horn-coloured beak."""
    def colour(n):
        if n.z > 0.55 and -0.55 < n.x < 0.75:
            return RED
        if n.x < 0.1 and abs(n.y) > 0.35 and -0.75 < n.z < 0.45:
            return WHITE
        return BLACK
    sphere(part, centre, (r * 1.3, r * 0.86, r * 0.92), colour)
    forward = Vector((math.cos(tilt), 0, math.sin(tilt)))
    cone(part, centre + forward * r * 1.05 - Vector((0, 0, r * 0.1)), centre + forward * r * 3.7 - Vector((0, 0, r * 0.25)), r * 0.32, HORN)
    for side in (-1, 1):
        sphere(part, centre + Vector((r * 0.5, side * r * 0.78, r * 0.18)), (r * 0.16, r * 0.16, r * 0.16), lambda n: EYE, 6, 8)


def neck(part, points, r0, r1, front, grey_until):
    """An S of points (Catmull-Rom), tapering, grey low down, black in front and white behind higher up."""
    def at(t):
        n = len(points) - 1
        f = min(n - 1e-6, t * n)
        i = int(f)
        u = f - i
        p0, p1, p2, p3 = points[max(i - 1, 0)], points[i], points[i + 1], points[min(i + 2, n)]
        return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u)
    count = 22
    centres = [at(k / count) for k in range(count + 1)]
    radii = [r0 + (r1 - r0) * smooth(k / count) for k in range(count + 1)]

    def colour(i, a, offset):
        t = i / count
        facing = offset.normalized().dot(front)
        upper = mix(WHITE, BLACK, smooth((facing + 0.55) / 0.25))
        return mix(GREY, upper, smooth((t - grey_until) / 0.12))
    tube(part, centres, radii, colour)
    return centres[-1]


def bustle(part, root, length):
    """The drooping tertials over the tail: long, dark, soft, falling back and down from under the folded wings in a
    full, layered cascade. Each hangs on edge, its face to the side, as they lie over the tail's flanks, so that they
    show from the side as the game sees the bird."""
    for i in range(22):
        k = i / 21
        side = (k - 0.5) * 0.46
        angle = 0.35 + 0.5 * math.sin(i * 1.7) ** 2
        long = length * (0.55 + 0.22 * math.sin(i * 2.3) ** 2)
        ahead = Vector((-math.cos(angle), side * 0.5, -math.sin(angle) * 0.6)).normalized()
        across = ahead.cross(Vector((0, 1, 0))).normalized()
        tip = SLATE if i % 3 else BLACK
        start = root + Vector((-0.06 * (i % 4), side * 0.6, 0.04 * math.sin(i * 2.2)))
        feather(part, start, ahead, across, long, 0.085 + 0.03 * math.sin(i * 1.3) ** 2, 0.55, rgb('#6a7078'), tip,
                bend=Vector((0, 0, -1)))


# --- kneeling ------------------------------------------------------------------------------------------------------

kneeling = empty('crane-kneeling')

torso = Part()
PROFILE = [(-0.95, 0.03, 0.03, 0.02), (-0.86, 0.13, 0.13, 0.02), (-0.64, 0.24, 0.25, 0.02), (-0.32, 0.33, 0.35, 0.0),
           (0.0, 0.37, 0.39, 0.0), (0.34, 0.37, 0.38, 0.01), (0.62, 0.32, 0.33, 0.03), (0.82, 0.23, 0.24, 0.05), (0.93, 0.12, 0.13, 0.07)]


def torso_colour(x, a, h):
    # The folded wings lie over the back, a shade darker, in rows of feathers with paler edges; under them, along the
    # rear of the flank, the black flight feathers show.
    over = math.cos(a)
    back = smooth((over - 0.15) / 0.5) * smooth((0.55 - x) / 0.4)
    rows = 0.5 + 0.5 * math.sin(x * 20.0 + over * 5.0)
    colour = mix(GREY, BACK, back * (0.75 + 0.25 * rows))
    colour = mix(colour, PALE, 0.25 * smooth((over + 0.2) / 0.3) * (1 - back))
    flight = smooth((-x - 0.2) / 0.35) * smooth(1 - abs(over + 0.05) / 0.3)
    return mix(colour, SLATE, 0.75 * flight)


body(torso, PROFILE, 16, torso_colour)
bustle(torso, Vector((-0.62, 0, 0.2)), 1.0)
crane_torso = finish('crane-torso', torso, kneeling, (0, 0, 0.55), double=True, subsurf=1)
crane_torso.rotation_euler = (0, -0.1, 0)

neck_part = Part()
end = neck(neck_part, [Vector((0, 0, 0)), Vector((0.12, 0, 0.22)), Vector((0.08, 0, 0.5)), Vector((0.1, 0, 0.72)), Vector((0.2, 0, 0.84))],
           0.11, 0.055, Vector((1, 0, 0)), 0.42)
crane_neck = finish('crane-neck', neck_part, kneeling, (0.78, 0, 0.82), subsurf=1)
head_part = Part()
head(head_part, Vector((0, 0, 0)), 0.1)
crane_head = finish('crane-head', head_part, crane_neck, (0.24, 0, 0.88))
crane_head.rotation_euler = (0, 0.12, 0)

legs = Part()
for side in (-1, 1):
    # Kneeling, it rests on its shins: from the heel, tucked under the body, forward along the ground.
    a, b = Vector((-0.18, side * 0.16, 0.24)), Vector((0.6, side * 0.19, 0.05))
    tube(legs, [a, (a + b) / 2, b], [0.036, 0.032, 0.028], lambda i, ang, off: LEG, 8)
    for turn in (-0.45, 0, 0.45):
        toe = Vector((math.cos(turn), math.sin(turn), -0.02)) * 0.14
        tube(legs, [b, b + toe], [0.022, 0.012], lambda i, ang, off: LEG, 6)
finish('crane-legs', legs, kneeling)

# --- flying --------------------------------------------------------------------------------------------------------

flying = empty('crane-flying')
fly = Part()
FLY = [(-1.0, 0.03, 0.03, 0.0), (-0.9, 0.14, 0.15, 0.0), (-0.6, 0.26, 0.27, 0.0), (-0.25, 0.34, 0.35, 0.0),
       (0.1, 0.37, 0.38, 0.0), (0.45, 0.34, 0.35, 0.01), (0.75, 0.25, 0.26, 0.03), (0.95, 0.12, 0.13, 0.05)]
body(fly, FLY, 16, lambda x, a, h: mix(GREY, PALE, 0.2 * smooth((-math.cos(a) - 0.2) / 0.5)), centre_z=-0.35)
for i in range(7):
    k = i / 6
    feather(fly, Vector((-0.92, (k - 0.5) * 0.18, -0.33)), Vector((-1, (k - 0.5) * 0.6, -0.05)), Vector((0, 1, 0)),
            0.34 + 0.06 * math.sin(i * 2.1), 0.06, 0.15, rgb('#4a4f55'), BLACK)
neck(fly, [Vector((0.9, 0, -0.25)), Vector((1.2, 0, -0.19)), Vector((1.5, 0, -0.15)), Vector((1.72, 0, -0.15))],
                   0.1, 0.05, Vector((0, 0, -1)), 0.3)
head(fly, Vector((1.82, 0, -0.15)), 0.09, -0.05)
for side in (-1, 1):
    a, b = Vector((-0.7, side * 0.07, -0.52)), Vector((-2.05, side * 0.09, -0.5))
    tube(fly, [a, (a + b) / 2, b], [0.024, 0.022, 0.02], lambda i, ang, off: LEG, 6)
    for turn in (-0.4, 0, 0.4):
        toe = Vector((-math.cos(turn), math.sin(turn), 0)) * 0.1
        tube(fly, [b, b + toe], [0.016, 0.008], lambda i, ang, off: LEG, 5)
finish('crane-body', fly, flying, double=True, subsurf=0)


def wing_part():
    """The inner wing out along -Y: grey coverts over a row of long dark secondaries, a round leading edge."""
    part = Part()
    span = 1.0
    # The coverts: a cambered panel, grey, paler at the leading edge.
    rows, cols = 6, 8
    grid = []
    for r in range(rows + 1):
        b = r / rows
        lead, trail = 0.28 + 0.06 * math.sin(math.pi * b), -0.32 + 0.05 * b
        row = []
        for c in range(cols + 1):
            a = c / cols
            x = lead + (trail - lead) * a
            z = 0.05 * math.sin(math.pi * a) * (1 - 0.5 * b)
            row.append(part.point(Vector((x, -b * span, z)), mix(PALE, GREY, smooth(a / 0.5))))
        grid.append(row)
    for r in range(rows):
        for c in range(cols):
            part.face([grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]])
    # The leading edge: round and thick, where the bones are.
    tube(part, [Vector((0.24, 0.02, 0.02)), Vector((0.3, -0.5, 0.03)), Vector((0.26, -1.0, 0.02))], [0.065, 0.055, 0.045],
         lambda i, ang, off: GREY, 10, (1.0, 0.7))
    # The secondaries: long dark feathers along the back edge, overlapping, their tips black.
    for i in range(11):
        b = 0.04 + i * 0.09
        feather(part, Vector((-0.12, -b * span, 0.02)), Vector((-1, -0.12, -0.04)), Vector((0, -1, 0)), 0.48 - 0.06 * abs(b - 0.5),
                0.06, 0.12, rgb('#4a4f55'), BLACK)
    return part


def tip_part():
    """The outer wing: a narrowing panel and the six black primaries spread like fingers."""
    part = Part()
    rows, cols = 5, 6
    grid = []
    for r in range(rows + 1):
        b = r / rows
        lead, trail = 0.3 - 0.12 * b, -0.18 + 0.2 * b
        row = []
        for c in range(cols + 1):
            a = c / cols
            x = lead + (trail - lead) * a
            row.append(part.point(Vector((x, -b * 0.62, 0.04 * math.sin(math.pi * a))), mix(PALE, SLATE, smooth((b - 0.3) / 0.6) * 0.8 + 0.2 * a)))
        grid.append(row)
    for r in range(rows):
        for c in range(cols):
            part.face([grid[r][c], grid[r][c + 1], grid[r + 1][c + 1], grid[r + 1][c]])
    tube(part, [Vector((0.27, 0.0, 0.02)), Vector((0.22, -0.35, 0.02)), Vector((0.18, -0.62, 0.015))], [0.045, 0.035, 0.025],
         lambda i, ang, off: GREY, 8, (1.0, 0.7))
    for i in range(6):
        k = i / 5
        spread = 0.55 - 1.0 * k
        root = Vector((0.16 - 0.3 * k, -0.55 - 0.05 * math.sin(math.pi * k), 0.02))
        ahead = Vector((math.sin(spread), -math.cos(spread), 0.04))
        feather(part, root, ahead, Vector((math.cos(spread), math.sin(spread), 0)), 0.42 - 0.12 * abs(k - 0.35), 0.045, -0.15,
                rgb('#33363b'), BLACK, 6)
    return part


for name, side in (('Near', -1), ('Far', 1)):
    shoulder = finish('wing' + name, wing_part(), flying, (0.22, side * 0.28, -0.2), double=True, scale=(1, -side, 1) if side > 0 else None)
    finish('wingTip' + name, tip_part(), shoulder, (0, -0.98, 0), double=True)

print('crane built:', [obj.name for obj in bpy.data.objects])
