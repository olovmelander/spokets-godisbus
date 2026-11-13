"""The tools of a creature with bones: put after kit-tools.py, in front of the kit (scripts/bake/blender-kit.mjs does it).

A creature is made in four steps, all from numbers in its kit:
  1. armature(name, BONES): its bones, from a table. Rows named '.L' (the creature's left, Blender's +Y) get a mirrored
     '.R' of their own. A bone may be a marker that deforms nothing (where a rider sits), or a control used only while
     posing (an IK target), which is baked away before the export.
  2. its mesh, built with the kit's helpers (lump, tube, lathe, skin, ...) into one part: before each piece,
     at = mark(part); after it, bind(arm, part, at, bones): the piece's points go with one bone (rigid), with a chain
     of bones (each point with the nearest, blended smoothly across the joints), or with fixed shares of several.
     Then skinned(arm, part, name, ...) finishes it as kit-tools' finish() does, with its vertex groups and an
     Armature modifier.
  3. clip(arm, name, frames, keys, loop): an action called '<creature>:<name>' from a pose table, keyed per bone,
     with smooth curves. A loop is seamless: its first pose is keyed again at its end, and its curves wrap.
     bake(arm), last, turns what the constraints did into keys of the bones themselves and takes the controls away.
  4. the export (scripts/bake/export.py) writes the skin and every action, each as a clip of its own name;
     preview_creatures(folder) renders stills of every clip, for a builder to look at.

Conventions (shared by every creature of the game): 1 Blender unit is 1 EL, Z is up. A bone's own Y runs along it.
The bones of the middle and of the legs have their X towards the creature's right (Blender's -Y for a creature that
faces +X), so that a positive turn about X turns a bone counter-clockwise as a camera on that side sees it: a bone that
points forward lifts its tip, one that points up leans back, one that points down swings forward. A bone that points
sideways (a wing) has its Z up, so that a turn about X beats it up and down, about Z sweeps it forward and back, and
about Y twists it. A pose given for a '.L' bone is given to its '.R' bone too, mirrored (x, -y, -z for a turn, -x, y, z
for a move), unless the same pose gives the '.R' bone its own. Angles are in degrees; moves in EL, in the bone's own
rest axes.

Keep this file in plain ASCII: it may be sent to Blender as text. It defines functions and constants, and changes
nothing in the scene when it is loaded, except that it clears the actions and armatures of an earlier build.
"""
import math
import os

import bpy
from mathutils import Matrix, Quaternion, Vector

FPS = 24

for item in list(bpy.data.actions):
    bpy.data.actions.remove(item)
for item in list(bpy.data.armatures):
    if item.users == 0:
        bpy.data.armatures.remove(item)


def mirrored(name):
    """The name of a bone's twin on the other side, or None for a bone of the middle."""
    if name.endswith('.L'):
        return name[:-2] + '.R'
    if name.endswith('.R'):
        return name[:-2] + '.L'
    return None


def _flip(v):
    return Vector((v[0], -v[1], v[2]))


def armature(name, table, at=(0.0, 0.0, 0.0)):
    """The armature `name` from a table of bones, one row each, in the creature's rest pose:
        (bone, parent or None, head (x, y, z), tail (x, y, z))  or the same with a dict of extras at the end:
          'z': (x, y, z)      where the bone's own Z points (the default is as the conventions above say)
          'deform': False     a marker: it moves nothing (where a rider sits, where its feet are)
          'ctrl': True        a control, used while posing and baked away (an IK target); it deforms nothing
          'connect': True     its head is its parent's tail
          'ik': (target, n)   an IK constraint: its tail reaches for the control `target`, with n bones of the chain
          'track': target     a damped track: its tail points at the control `target`
    A row whose bone ends in '.L' makes its '.R' twin too, mirrored across the creature's middle."""
    data = bpy.data.armatures.new(name)
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = at
    obj.show_in_front = True
    rows = []
    for row in table:
        extra = row[4] if len(row) > 4 else {}
        rows.append((row[0], row[1], Vector(row[2]), Vector(row[3]), extra))
        twin = mirrored(row[0])
        if twin is not None:
            parent = mirrored(row[1]) if row[1] is not None and mirrored(row[1]) is not None else row[1]
            more = dict(extra)
            if 'ik' in extra:
                more['ik'] = (mirrored(extra['ik'][0]) or extra['ik'][0], extra['ik'][1])
            if 'track' in extra:
                more['track'] = mirrored(extra['track']) or extra['track']
            if 'z' in extra:
                more['z'] = tuple(_flip(Vector(extra['z'])))
            more['twin_of'] = row[0]
            rows.append((twin, parent, _flip(Vector(row[2])), _flip(Vector(row[3])), more))
    bpy.context.view_layer.update()
    for other in bpy.context.scene.objects:
        if other is not None and other != obj:
            other.select_set(False)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')
    made = {}
    for bone, parent, head, tail, extra in rows:
        eb = data.edit_bones.new(bone)
        eb.head = head
        eb.tail = tail
        along = (tail - head).normalized()
        if 'twin_of' in extra and 'z' not in extra:
            # The twin's own axes mirror its first's: its Z is the mirror of the first's Z.
            eb.align_roll(_flip(made[extra['twin_of']].z_axis))
        elif 'z' in extra:
            eb.align_roll(Vector(extra['z']))
        elif abs(along.y) > 0.7:
            eb.align_roll(Vector((0.0, 0.0, 1.0)))
        else:
            eb.align_roll(Vector((0.0, -1.0, 0.0)).cross(along))
        eb.use_deform = extra.get('deform', True) and not extra.get('ctrl', False)
        if parent is not None:
            eb.parent = made[parent]
            eb.use_connect = extra.get('connect', False)
        made[bone] = eb
    bpy.ops.object.mode_set(mode='OBJECT')
    controls = []
    for bone, parent, head, tail, extra in rows:
        pb = obj.pose.bones[bone]
        pb.rotation_mode = 'XYZ'
        if extra.get('ctrl'):
            controls.append(bone)
        if 'ik' in extra:
            ik = pb.constraints.new('IK')
            ik.target = obj
            ik.subtarget = extra['ik'][0]
            ik.chain_count = extra['ik'][1]
            ik.use_tail = True
            ik.use_stretch = False
        if 'track' in extra:
            track = pb.constraints.new('DAMPED_TRACK')
            track.target = obj
            track.subtarget = extra['track']
            track.track_axis = 'TRACK_Y'
    obj['controls'] = controls
    return obj


# --- skinning --------------------------------------------------------------------------------------------------------

def mark(part):
    """Where the points made from now on begin: pass it to bind() once they are made."""
    return len(part['paint'])


def _smooth(t):
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def _rest(arm, bone):
    b = arm.data.bones.get(bone)
    if b is None:
        raise KeyError('no bone called %r in %s' % (bone, arm.name))
    return b.head_local.copy(), b.tail_local.copy()


def _chain_shares(arm, chain, point, blend):
    """The shares of a chain's bones in a point: the nearest bone's, blended with its neighbour's near their joint."""
    best = None
    for i, bone in enumerate(chain):
        head, tail = _rest(arm, bone)
        axis = tail - head
        length = axis.length
        axis = axis / length
        s = (point - head).dot(axis)
        nearest = head + axis * max(0.0, min(length, s))
        d = (point - nearest).length
        if best is None or d < best[0]:
            best = (d, i, s, length)
    _, i, s, length = best
    if blend <= 0.0:
        return [(chain[i], 1.0)]
    bones = arm.data.bones
    # Shared with the bone before it in the chain near its head, if that is its parent; with the next one near its
    # tail, if the next one's head is there.
    if i > 0 and bones[chain[i]].parent is not None and bones[chain[i]].parent.name == chain[i - 1] and s < blend:
        w = _smooth((s + blend) / (2.0 * blend))
        return [(chain[i], w), (chain[i - 1], 1.0 - w)]
    if i < len(chain) - 1 and s > length - blend:
        nxt = bones[chain[i + 1]]
        if nxt.parent is not None and nxt.parent.name == chain[i] and (nxt.head_local - bones[chain[i]].tail_local).length < 1e-3:
            w = _smooth((s - length + blend) / (2.0 * blend))
            return [(chain[i + 1], w), (chain[i], 1.0 - w)]
    return [(chain[i], 1.0)]


def bind(arm, part, since, bones, blend=0.0):
    """Binds the points of `part` made since mark() returned `since`:
         bones = 'head'                      each goes with the one bone; with `blend`, those within `blend` EL of
                                             the bone's head share it with its parent, smoothly
         bones = ['neck1', 'neck2', ...]     a chain: each goes with its nearest bone, shared with the next within
                                             `blend` EL of their joint
         bones = {'body': 0.7, 'thigh.L': 0.3}  each in these fixed shares
    A point bound twice keeps the last."""
    shares = part.setdefault('bones', {})
    points = list(part['paint'].keys())[since:]
    if isinstance(bones, dict):
        fixed = [(bone, float(w)) for bone, w in bones.items()]
        for bone, _ in fixed:
            _rest(arm, bone)
        for vert in points:
            shares[vert] = fixed
        return len(points)
    if isinstance(bones, str):
        head, tail = _rest(arm, bones)
        parent = arm.data.bones[bones].parent
        axis = (tail - head).normalized()
        for vert in points:
            if blend > 0.0 and parent is not None:
                s = (vert.co - head).dot(axis)
                w = _smooth((s + blend) / (2.0 * blend))
                shares[vert] = [(bones, w), (parent.name, 1.0 - w)] if w < 1.0 else [(bones, 1.0)]
            else:
                shares[vert] = [(bones, 1.0)]
        return len(points)
    for vert in points:
        shares[vert] = _chain_shares(arm, list(bones), vert.co, blend)
    return len(points)


def skinned(arm, part, name, **finishing):
    """kit-tools' finish() for a part whose points are bound to `arm`: the object, its vertex groups, and an Armature
    modifier, parented to the armature. Every point must have been bound."""
    bm = part['bm']
    bm.verts.index_update()
    shares = part.get('bones', {})
    table = []
    loose = 0
    for vert in bm.verts:
        own = shares.get(vert)
        if not own:
            loose += 1
            continue
        table.append((vert.index, own))
    if loose:
        raise ValueError('%s: %d points are bound to no bone' % (name, loose))
    made = finish(part, name, **finishing)  # noqa: F821 (kit-tools.py)
    groups = {}
    for index, own in table:
        total = sum(w for _, w in own)
        for bone, w in own:
            if w <= 0.0:
                continue
            if bone not in groups:
                groups[bone] = made.vertex_groups.new(name=bone)
            groups[bone].add([index], w / total, 'REPLACE')
    made.parent = arm
    modifier = made.modifiers.new('bones', 'ARMATURE')
    modifier.object = arm
    return made


# --- clips -----------------------------------------------------------------------------------------------------------

def _pose_value(value):
    """A pose's value for one bone as a dict: a bare (x, y, z) is a turn."""
    if isinstance(value, dict):
        return value
    return {'rot': value}


def _mirror_value(value):
    out = {}
    for key, v in value.items():
        if key == 'rot':
            out['rot'] = (v[0], -v[1], -v[2])
        elif key == 'loc':
            out['loc'] = (-v[0], v[1], v[2])
        elif key in ('at', 'dir', 'up'):
            out[key] = (v[0], -v[1], v[2])
        elif key == 'of' and mirrored(v) is not None:
            out[key] = mirrored(v)
        else:
            out[key] = v
    return out


def _full(pose):
    """A pose with its '.L' bones given to their '.R' twins too, where it does not give those their own."""
    out = {}
    for bone, value in pose.items():
        out[bone] = _pose_value(value)
    for bone, value in list(out.items()):
        twin = mirrored(bone)
        if bone.endswith('.L') and twin not in pose:
            out[twin] = _mirror_value(value)
    return out


def _channel_bag(arm):
    from bpy_extras import anim_utils
    return anim_utils.animdata_get_channelbag_for_assigned_slot(arm.animation_data)


def _key(arm, bone, value, frame):
    pb = arm.pose.bones.get(bone)
    if pb is None:
        raise KeyError('no bone called %r in %s' % (bone, arm.name))
    if 'rot' in value:
        pb.rotation_euler = [math.radians(a) for a in value['rot']]
        pb.keyframe_insert('rotation_euler', frame=frame, group=bone)
    if 'at' in value:
        rest = arm.data.bones[bone].matrix_local
        pb.location = rest.to_3x3().inverted() @ (Vector(value['at']) - rest.translation)
        pb.keyframe_insert('location', frame=frame, group=bone)
    if 'loc' in value:
        pb.location = value['loc']
        pb.keyframe_insert('location', frame=frame, group=bone)
    if 'scale' in value:
        s = value['scale']
        pb.scale = (s, s, s) if isinstance(s, (int, float)) else s
        pb.keyframe_insert('scale', frame=frame, group=bone)
    if 'con' in value:
        for constraint in pb.constraints:
            constraint.influence = value['con']
            constraint.keyframe_insert('influence', frame=frame)


def _depth(arm, bone):
    n = 0
    b = arm.data.bones[bone]
    while b.parent is not None:
        n += 1
        b = b.parent
    return n


def _key_dir(arm, bone, value, frame):
    """Keys a bone's turn so that it points along `dir` with its own Z towards `up`, both in the creature's space, as
    the pose of its parents at that frame leaves it. With 'of': <bone>, both are first turned as that bone is turned
    from its rest (a folded wing that goes with the body as the body tips)."""
    scene = bpy.context.scene
    scene.frame_set(frame)
    pb = arm.pose.bones[bone]
    along = Vector(value['dir']).normalized()
    up = Vector(value.get('up', (0.0, 0.0, 1.0)))
    if 'of' in value:
        ref = arm.pose.bones[value['of']]
        turn = ref.matrix.to_3x3() @ arm.data.bones[value['of']].matrix_local.to_3x3().inverted()
        along = (turn @ along).normalized()
        up = turn @ up
    x = along.cross(up).normalized()
    z = x.cross(along).normalized()
    m = Matrix((x, along, z)).transposed().to_4x4()
    m.translation = pb.matrix.translation
    before = pb.rotation_euler.copy()
    pb.matrix = m
    bpy.context.view_layer.update()
    pb.rotation_euler = pb.matrix_basis.to_euler('XYZ', before)
    pb.keyframe_insert('rotation_euler', frame=frame, group=bone)
    if 'twist' in value:
        pb.rotation_euler[1] += math.radians(value['twist'])
        pb.keyframe_insert('rotation_euler', frame=frame, group=bone)


def rest_pose(arm):
    """Every bone back at rest, with no action on the armature."""
    if arm.animation_data is not None:
        arm.animation_data.action = None
    for pb in arm.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_mode = 'XYZ'
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)
        for constraint in pb.constraints:
            constraint.influence = 1.0
    bpy.context.view_layer.update()


def clip(arm, name, frames, keys, loop=True):
    """The action '<armature>:<name>', `frames` long at FPS frames a second, from a pose table:
        keys = [(frame, {bone: value, ...}), ...]
    where a value is a turn (x, y, z) or a dict of any of:
        'rot': (x, y, z)     the turn, in degrees about the bone's own axes
        'loc': (x, y, z)     a move from rest, in EL along the bone's own rest axes
        'at': (x, y, z)      for a control with no parent: where its head is, in the creature's own space
        'scale': s           or (x, y, z)
        'con': influence     of the bone's constraints, 0 to 1 (0: its own turn holds; 1: its IK or track)
        'dir': (x, y, z)     instead of 'rot': the way the bone points, in the creature's space, with
        'up': (x, y, z)      the way its own Z faces (default straight up), and
        'of': bone           optionally, both turned as that bone is turned from its rest; 'twist': degrees more
                             about its own Y
    A bone holds its first key's pose before it and its last after it. A bone no key names stays at rest. Curves are
    smooth (Bezier, auto-clamped: a pose is held where the motion turns). A loop keys its first pose again at `frames`,
    unless it keys that frame itself, and its curves wrap, so that it runs on without a seam. Turns given by 'dir' are
    worked out after all the others, parents first, each from its parents' pose at its frame."""
    act = bpy.data.actions.new('%s:%s' % (arm.name, name))
    act.use_fake_user = True
    rest_pose(arm)
    arm.animation_data_create()
    arm.animation_data.action = act
    keys = sorted(keys, key=lambda row: row[0])
    if loop and keys[0][0] == 0 and keys[-1][0] != frames:
        keys.append((frames, keys[0][1]))
    fulls = [(frame, _full(pose)) for frame, pose in keys]
    named = set()
    pointed = set()
    for frame, full in fulls:
        for bone, value in full.items():
            _key(arm, bone, value, frame)
            named.add(bone)
            if 'dir' in value:
                pointed.add(bone)
    # Every bone of the creature has curves of its own in every clip, so that a clip never leaves a bone where another
    # one put it.
    for pb in arm.pose.bones:
        if pb.name not in named:
            pb.keyframe_insert('rotation_euler', frame=0, group=pb.name)
            pb.keyframe_insert('location', frame=0, group=pb.name)
    for bone in sorted(pointed, key=lambda b: _depth(arm, b)):
        for frame, full in fulls:
            if bone in full and 'dir' in full[bone]:
                _key_dir(arm, bone, full[bone], frame)
    bag = _channel_bag(arm)
    for curve in bag.fcurves:
        if loop:
            # A loop's every curve begins at 0 and ends at `frames` on the same value: the period of its wrap is the
            # clip's own. One keyed first later holds its first value from 0.
            at = sorted((point.co.x, point.co.y) for point in curve.keyframe_points)
            if at[0][0] > 0.5:
                curve.keyframe_points.insert(0, at[0][1])
                at.insert(0, (0.0, at[0][1]))
            if all(abs(x - frames) > 0.5 for x, _ in at):
                curve.keyframe_points.insert(frames, at[0][1])
        for point in curve.keyframe_points:
            point.interpolation = 'BEZIER'
            point.handle_left_type = 'AUTO_CLAMPED'
            point.handle_right_type = 'AUTO_CLAMPED'
        if loop and len(curve.keyframe_points) > 1:
            curve.modifiers.new('CYCLES')
        curve.update()
    act.use_frame_range = True
    act.frame_start = 0
    act.frame_end = frames
    act.use_cyclic = loop
    act['loop'] = 1 if loop else 0
    rest_pose(arm)
    return act


def actions_of(arm):
    """The clips of a creature, in the order they were made."""
    prefix = arm.name + ':'
    return [act for act in bpy.data.actions if act.name.startswith(prefix)]


def _show(arm, act):
    arm.animation_data_create()
    arm.animation_data.action = act
    if arm.animation_data.action_slot is None and len(act.slots) > 0:
        arm.animation_data.action_slot = act.slots[0]


def bake(arm):
    """Turns each clip into keys of the bones themselves, on every frame, as its constraints posed them; then takes
    the constraints and the controls away. Call it once, after the last clip()."""
    controls = list(arm.get('controls', []))
    keep = [pb.name for pb in arm.pose.bones if pb.name not in controls]
    scene = bpy.context.scene
    baked = []
    for act in actions_of(arm):
        _show(arm, act)
        end = int(act.frame_end)
        poses = []
        scaled = set()
        for frame in range(0, end + 1):
            scene.frame_set(frame)
            row = {}
            for bone in keep:
                pb = arm.pose.bones[bone]
                local = arm.convert_space(pose_bone=pb, matrix=pb.matrix, from_space='POSE', to_space='LOCAL')
                loc, rot, scale = local.decompose()
                if max(abs(scale[0] - 1.0), abs(scale[1] - 1.0), abs(scale[2] - 1.0)) > 1e-4:
                    scaled.add(bone)
                row[bone] = (loc, rot, scale)
            poses.append(row)
        baked.append((act.name, end, bool(act.get('loop', 0)), poses, scaled))
    rest_pose(arm)
    for act in actions_of(arm):
        bpy.data.actions.remove(act)
    for pb in arm.pose.bones:
        for constraint in list(pb.constraints):
            pb.constraints.remove(constraint)
    if controls:
        bpy.context.view_layer.objects.active = arm
        bpy.ops.object.mode_set(mode='EDIT')
        for bone in controls:
            arm.data.edit_bones.remove(arm.data.edit_bones[bone])
        bpy.ops.object.mode_set(mode='OBJECT')
    arm['controls'] = []
    for name, end, loop, poses, scaled in baked:
        act = bpy.data.actions.new(name)
        act.use_fake_user = True
        arm.animation_data.action = act
        last = {}
        for frame, row in enumerate(poses):
            for bone, (loc, rot, scale) in row.items():
                pb = arm.pose.bones[bone]
                pb.rotation_mode = 'QUATERNION'
                # The same turn, from the side of the last one, so that it never goes the long way round.
                if bone in last and last[bone].dot(rot) < 0.0:
                    rot = Quaternion((-rot.w, -rot.x, -rot.y, -rot.z))
                last[bone] = rot
                pb.rotation_quaternion = rot
                pb.location = loc
                pb.keyframe_insert('rotation_quaternion', frame=frame, group=bone)
                pb.keyframe_insert('location', frame=frame, group=bone)
                if bone in scaled:
                    pb.scale = scale
                    pb.keyframe_insert('scale', frame=frame, group=bone)
        for curve in _channel_bag(arm).fcurves:
            for point in curve.keyframe_points:
                point.interpolation = 'LINEAR'
        act.use_frame_range = True
        act.frame_start = 0
        act.frame_end = end
        act.use_cyclic = loop
        act['loop'] = 1 if loop else 0
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    rest_pose(arm)
    for pb in arm.pose.bones:
        pb.rotation_mode = 'QUATERNION'


def report(arm):
    """Prints the creature's bones and clips."""
    print('creature', arm.name, len(arm.data.bones), 'bones:', ', '.join(b.name for b in arm.data.bones))
    for act in actions_of(arm):
        print('  clip %-24s %3d frames  %.2f s%s' % (act.name, act.frame_end, act.frame_end / FPS, '  loop' if act.get('loop') else ''))


# --- looking at it ---------------------------------------------------------------------------------------------------

def _meshes_of(arm):
    return [obj for obj in bpy.context.scene.objects if obj.type == 'MESH' and obj.parent == arm]


def _bounds(arm, act, frames):
    scene = bpy.context.scene
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    _show(arm, act)
    for frame in frames:
        scene.frame_set(frame)
        graph = bpy.context.evaluated_depsgraph_get()
        for obj in _meshes_of(arm):
            ev = obj.evaluated_get(graph)
            mesh = ev.to_mesh()
            world = ev.matrix_world
            for v in mesh.vertices:
                p = world @ v.co
                lo = Vector((min(lo.x, p.x), min(lo.y, p.y), min(lo.z, p.z)))
                hi = Vector((max(hi.x, p.x), max(hi.y, p.y), max(hi.z, p.z)))
            ev.to_mesh_clear()
    return lo, hi


def preview(arm, folder, frames=None, size=(400, 300), views=('side', 'three-quarter'), clips=None):
    """Stills of every clip of `arm`: one sheet per clip and view, its frames in a row, saved as
    <folder>/<creature>-<clip>-<view>.png. `frames` maps a clip to the frames to show; the others show five,
    evenly spaced. A grey line on the ground is the creature's floor (Z = 0). Rendered with Workbench, in the colours
    of its corners. Call it after the export: it adds a camera and a floor to the scene."""
    import numpy as np
    os.makedirs(folder, exist_ok=True)
    scene = bpy.context.scene
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.light = 'STUDIO'
    scene.display.shading.color_type = 'VERTEX'
    scene.display.shading.show_shadows = True
    scene.display.shading.show_cavity = True
    scene.render.resolution_x = size[0]
    scene.render.resolution_y = size[1]
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = 'PNG'
    if scene.world is None:
        scene.world = bpy.data.worlds.new('preview')
    scene.world.color = (0.62, 0.66, 0.7)
    bpy.ops.mesh.primitive_plane_add(size=60.0, location=(0.0, 0.0, -0.002))
    floor = bpy.context.object
    floor.name = 'preview-floor'
    colour = floor.data.color_attributes.new('Color', 'FLOAT_COLOR', 'POINT')
    for i in range(len(colour.data)):
        colour.data[i].color = (0.42, 0.40, 0.36, 1.0)
    camera_data = bpy.data.cameras.new('preview-camera')
    camera_data.type = 'ORTHO'
    camera = bpy.data.objects.new('preview-camera', camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    written = []
    names = {act.name: act for act in actions_of(arm)}
    for full, act in names.items():
        clip_name = full.split(':', 1)[1]
        if clips and clip_name not in clips:
            continue
        end = int(act.frame_end)
        shown = (frames or {}).get(clip_name)
        if shown is None:
            shown = [int(round(end * k / 4.0)) for k in range(5)] if end > 0 else [0]
        lo, hi = _bounds(arm, act, shown)
        middle = (lo + hi) * 0.5
        wide = max(hi.x - lo.x, (hi.z - min(lo.z, 0.0)) * size[0] / size[1], hi.y - lo.y) * 1.12 + 0.2
        for view in views:
            if view == 'side':
                camera.location = (middle.x, -30.0, middle.z)
                camera.rotation_euler = (math.radians(90.0), 0.0, 0.0)
            elif view == 'front':
                camera.location = (30.0, middle.y, middle.z)
                camera.rotation_euler = (math.radians(90.0), 0.0, math.radians(90.0))
            elif view == 'top':
                camera.location = (middle.x, middle.y, 30.0)
                camera.rotation_euler = (0.0, 0.0, 0.0)
            else:
                # From the front's left, a little above: the camera's side, three-quarters on.
                aim = Vector((middle.x, middle.y, middle.z))
                place = aim + Vector((14.0, -22.0, 9.0))
                camera.location = place
                camera.rotation_euler = (aim - place).to_track_quat('-Z', 'Y').to_euler()
            camera_data.ortho_scale = wide
            tiles = []
            for frame in shown:
                scene.frame_set(frame)
                path = os.path.join(folder, '_tile.png')
                scene.render.filepath = path
                bpy.ops.render.render(write_still=True)
                image = bpy.data.images.load(path, check_existing=False)
                pixels = np.empty(size[0] * size[1] * 4, dtype=np.float32)
                image.pixels.foreach_get(pixels)
                tiles.append(pixels.reshape(size[1], size[0], 4))
                bpy.data.images.remove(image)
            sheet = np.concatenate(tiles, axis=1)
            # A thin dark line between the frames.
            for k in range(1, len(tiles)):
                sheet[:, k * size[0] - 1, :3] = 0.1
            out = bpy.data.images.new('preview-sheet', width=sheet.shape[1], height=sheet.shape[0], alpha=True)
            out.pixels.foreach_set(sheet.ravel())
            target = os.path.join(folder, '%s-%s-%s.png' % (arm.name, clip_name, view))
            out.filepath_raw = target
            out.file_format = 'PNG'
            out.save()
            bpy.data.images.remove(out)
            written.append(target)
            print('preview', target, 'frames', shown)
    if os.path.exists(os.path.join(folder, '_tile.png')):
        os.remove(os.path.join(folder, '_tile.png'))
    rest_pose(arm)
    bpy.data.objects.remove(floor, do_unlink=True)
    bpy.data.objects.remove(camera, do_unlink=True)
    return written


def preview_creatures(folder, frames=None, views=('side', 'three-quarter'), clips=None, size=(400, 300)):
    """preview() for every creature in the scene. A kit may set PREVIEW_FRAMES = {'creature': {'clip': [frames]}}."""
    shown = []
    for arm in [obj for obj in bpy.context.scene.objects if obj.type == 'ARMATURE']:
        shown += preview(arm, folder, (frames or {}).get(arm.name), size=size, views=views, clips=clips)
    return shown
