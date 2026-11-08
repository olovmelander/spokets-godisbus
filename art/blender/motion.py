"""Roerelser: how the family move, keyed in Blender for the game (plan 5.6 point 3, the motion pass of 8 November 2026).

Each person's walk and run, how they stand and breathe and shift their weight, are keyed here as curves over time, one
Empty per person and gait with a custom property for every joint the game poses (src/render/rig.ts, Pose). Blender's own
Bezier curves between the keys are what the game plays: this script samples them and writes them, as Fourier series, to
src/render/motion-data.ts. The stride (src/render/gait.ts) puts the feet and fits the legs to them on each body; the rest of
the body follows these curves.

Run it inside Blender, after a first line that sets where the game's table goes:
    OUT = r'C:/.../src/render/motion-data.ts'
and, to see the curves on the family's own bodies, where the private repository is checked out (art/private):
    MODELS = r'C:/.../art/private/baked/private'
Headless, in a cloud session or on Olov's computer:
    blender -b --factory-startup --python-expr "OUT=r'src/render/motion-data.ts'; exec(open('art/blender/motion.py').read())"
or, with the bpy 5.2 module:  python -c "OUT='src/render/motion-data.ts'; exec(open('art/blender/motion.py').read())"
Saved as art/blender/motion.blend (which git ignores), the keys can be opened, looked at in the Graph Editor and moved;
running this script again keys them afresh from the tables below, so a change that should last goes into the tables.

How the keys are read:
- A stride is two steps, and its keys are at a share of it, 0 to 1: the left heel comes down at 0, the right at 0.5.
- Most of the body does the same each step, mirrored: those keys are given for the first step only. "odd" mirrors with
  the sign turned (the hips go left, then right), "even" without (the hips go down at each step).
- The arm is the left arm, over the whole stride; the right arm goes half a stride later.
- The foot's pitch is over its own cycle, from its heel strike (toes up +): it comes down on its heel, rolls flat, lifts
  its heel about its ball, pushes off on its toes and swings through.
- Lengths are shares of the body's height, angles radians, a stand's keys are seconds.

Nothing here comes from anyone else: no clip, no capture, no library. Keep this file in plain ASCII: it is sent to
Blender as text.
"""
import math

import bpy

FRAMES = 48         # keyed frames in a stride: Blender's timeline for one cycle
SAMPLES = 96        # samples of each curve for its series
HARMONICS = 4       # terms of a body curve's series
FOOT_HARMONICS = 9  # the foot's pitch has sharp corners: more terms

# --- the walks and runs ------------------------------------------------------------------------------------------------
# Scalars, then curves. A curve is (symmetry, keys): keys are (share, value). Lengths are shares of the height.

ADULT_WALK = {
    'stance': 0.61, 'ahead': 0.012, 'width': 0.032, 'lift': 0.046, 'peak': 0.3, 'crouch': 0.012, 'spread': 0.0,
    # Lowest as the weight comes onto the foot, highest over it.
    'bob': ('even', [(0.0, -0.005), (0.06, -0.009), (0.29, 0.008)]),
    # Over the standing foot, and tipped away from the swinging one.
    'sway': ('odd', [(0.0, -0.004), (0.07, 0.0), (0.29, 0.011), (0.46, 0.006)]),
    'roll': ('odd', [(0.0, -0.016), (0.04, 0.0), (0.17, 0.058), (0.36, 0.018)]),
    # The shoulders turn against the hips: the right shoulder forward as the left heel comes down.
    'twist': ('odd', [(0.03, 0.17), (0.27, 0.0)]),
    'lean': ('even', [(0.02, 0.058), (0.25, 0.044)]),
    'side': ('odd', [(0.07, 0.0), (0.3, 0.022)]),
    # The head stays level: it nods against the trunk and tilts against its bend.
    'nod': ('even', [(0.02, 0.012), (0.25, 0.028)]),
    'tilt': ('odd', [(0.07, 0.0), (0.3, -0.016)]),
    # The left arm comes forward with the right foot, a moment after it, the elbow bending as it comes; the hand trails.
    'arm': ('full', [(0.06, -0.24), (0.31, 0.02), (0.56, 0.36), (0.81, 0.08)]),
    'elbow': ('full', [(0.1, 0.17), (0.38, 0.27), (0.62, 0.48), (0.88, 0.3)]),
    'wrist': ('full', [(0.12, 0.1), (0.36, -0.16), (0.62, -0.06), (0.86, 0.15)]),
    'pitch': ('foot', [(0.0, 0.3), (0.07, 0.04), (0.11, 0.0), (0.35, 0.0), (0.47, -0.16), (0.61, -0.56), (0.69, -0.3),
                       (0.78, -0.03), (0.88, 0.13), (0.96, 0.26)]),
    # The knee of the foot that has just come down gives as it takes the weight, and straightens over it.
    'give': ('foot', [(0.0, 0.05), (0.12, 0.3), (0.3, 0.12), (0.45, 0.1), (0.62, 0.1), (0.85, 0.05)]),
}

ADULT_RUN = {
    'stance': 0.37, 'ahead': 0.02, 'width': 0.024, 'lift': 0.1, 'peak': 0.36, 'crouch': 0.04, 'spread': 0.12,
    # Lowest over the foot, highest in the flight between steps.
    'bob': ('even', [(0.0, 0.0), (0.17, -0.014), (0.42, 0.014)]),
    'sway': ('odd', [(0.0, 0.0), (0.18, 0.005)]),
    'roll': ('odd', [(0.0, 0.0), (0.12, 0.045), (0.36, 0.01)]),
    'twist': ('odd', [(0.04, 0.27), (0.29, 0.0)]),
    'lean': ('even', [(0.03, 0.2), (0.28, 0.17)]),
    'side': ('odd', [(0.06, 0.0), (0.2, 0.012)]),
    'nod': ('even', [(0.03, -0.03), (0.28, -0.01)]),
    'tilt': ('odd', [(0.06, 0.0), (0.2, -0.01)]),
    # Bent arms that drive, forward and up with the other foot.
    'arm': ('full', [(0.06, -0.48), (0.31, 0.05), (0.56, 0.62), (0.81, 0.1)]),
    'elbow': ('full', [(0.08, 1.18), (0.33, 1.38), (0.58, 1.58), (0.83, 1.35)]),
    'wrist': ('full', [(0.12, 0.05), (0.37, -0.1), (0.62, 0.0), (0.87, 0.1)]),
    'pitch': ('foot', [(0.0, 0.12), (0.05, 0.0), (0.16, 0.0), (0.37, -0.62), (0.48, -0.36), (0.62, -0.02),
                       (0.8, 0.12), (0.93, 0.14)]),
    # A runner lands on a soft knee and sinks over the foot.
    'give': ('foot', [(0.0, 0.18), (0.16, 0.62), (0.3, 0.4), (0.5, 0.2), (0.85, 0.15)]),
}


def person(base, **changes):
    """A gait like `base`, with some of its scalars or curves changed. A curve may be scaled: name=('scale', k)."""
    made = dict(base)
    for name, value in changes.items():
        if isinstance(value, tuple) and value and value[0] == 'scale':
            kind, keys = base[name]
            made[name] = (kind, [(at, v * value[1]) for at, v in keys])
        else:
            made[name] = value
    return made


# Who they are, in how they move. Pappa: easy, steady, loose arms. Mamma: lighter on her feet, her hips more in it,
# arms nearer the body. Moa: light and springy, swinging arms. Bertil: bouncy, rocking side to side on a wide base,
# arms flung. (Mormor and Morfar stand and kneel, and do not walk in the story: they have no gait yet.)
GAITS = {
    'pappa': {
        'walk': person(ADULT_WALK, lean=('scale', 0.9), twist=('scale', 1.05), crouch=0.014),
        'run': person(ADULT_RUN),
    },
    'mamma': {
        'walk': person(ADULT_WALK, width=0.024, roll=('scale', 1.3), sway=('scale', 1.12), twist=('scale', 0.8),
                       arm=('scale', 0.85), elbow=('full', [(0.1, 0.24), (0.38, 0.33), (0.62, 0.54), (0.88, 0.36)]),
                       bob=('scale', 0.85), spread=0.0),
        'run': person(ADULT_RUN, roll=('scale', 1.2), twist=('scale', 0.85), spread=0.1),
    },
    'moa': {
        'walk': person(ADULT_WALK, lift=0.058, bob=('scale', 1.45), arm=('scale', 1.18), wrist=('scale', 1.2),
                       elbow=('full', [(0.1, 0.22), (0.38, 0.33), (0.62, 0.58), (0.88, 0.36)]), tilt=('scale', 1.4)),
        'run': person(ADULT_RUN, lift=0.12, bob=('scale', 1.2), arm=('scale', 1.1)),
    },
    'bertil': {
        'walk': person(ADULT_WALK, width=0.06, lift=0.062, crouch=0.02, bob=('scale', 1.7), sway=('scale', 1.6),
                       roll=('scale', 0.85), side=('scale', 1.6), twist=('scale', 1.15), arm=('scale', 1.28),
                       elbow=('full', [(0.1, 0.26), (0.38, 0.38), (0.62, 0.66), (0.88, 0.42)]), lean=('scale', 1.25),
                       spread=0.06),
        'run': person(ADULT_RUN, width=0.04, lift=0.12, sway=('scale', 1.6), arm=('scale', 1.12), spread=0.14),
    },
}

CHANNELS = ['bob', 'give', 'sway', 'roll', 'twist', 'lean', 'side', 'nod', 'tilt', 'arm', 'elbow', 'wrist', 'pitch']
SCALARS = ['stance', 'ahead', 'width', 'lift', 'peak', 'crouch', 'spread']


def keys_over_stride(kind, keys):
    """The keys of a whole cycle, from a curve's own: mirrored onto the second step where it is odd or even."""
    if kind in ('full', 'foot'):
        return list(keys)
    sign = -1.0 if kind == 'odd' else 1.0
    return list(keys) + [(at + 0.5, v * sign) for at, v in keys]


# --- Blender: one Empty per person and gait, keyed ---------------------------------------------------------------------

for obj in list(bpy.data.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)
scene = bpy.context.scene
scene.frame_start, scene.frame_end, scene.render.fps = 0, FRAMES - 1, 24
holder = bpy.data.collections.get('motion') or bpy.data.collections.new('motion')
if holder.name not in scene.collection.children:
    scene.collection.children.link(holder)


def curves_of(obj):
    """The F-curves of an object's action, in Blender 4.4's and later's layered actions."""
    from bpy_extras import anim_utils
    bag = anim_utils.action_get_channelbag_for_slot(obj.animation_data.action, obj.animation_data.action_slot)
    return {curve.data_path[2:-2]: curve for curve in bag.fcurves}


def keyed(name, table):
    """An Empty with each curve of `table` keyed as a custom property, and its scalars as plain properties."""
    obj = bpy.data.objects.new(name, None)
    holder.objects.link(obj)
    for scalar in SCALARS:
        obj[scalar] = float(table[scalar])
    for channel in CHANNELS:
        kind, keys = table[channel]
        obj[channel] = 0.0
        for at, value in keys_over_stride(kind, keys):
            obj[channel] = float(value)
            obj.keyframe_insert('["%s"]' % channel, frame=at * FRAMES)
    for curve in curves_of(obj).values():
        # One cycle repeats for ever: the handles at its ends are worked out as for a loop.
        first = curve.keyframe_points[0]
        if first.co.x > 0 or len(curve.keyframe_points) == 1:
            curve.keyframe_points.insert(first.co.x + FRAMES, first.co.y)
        else:
            curve.keyframe_points.insert(FRAMES, first.co.y)
        modifier = curve.modifiers.new('CYCLES')
        modifier.mode_before = modifier.mode_after = 'REPEAT'
        for point in curve.keyframe_points:
            point.interpolation = 'BEZIER'
            point.handle_left_type = point.handle_right_type = 'AUTO_CLAMPED'
        curve.update()
    return obj


def series(curve, terms, offset):
    """The Fourier series of a keyed cycle, as the game reads it: in radians of its phase, starting at `offset`."""
    values = [curve.evaluate(i * FRAMES / SAMPLES) for i in range(SAMPLES)]
    out = [sum(values) / SAMPLES]
    for k in range(1, terms + 1):
        a = b = 0.0
        for i, value in enumerate(values):
            x = offset + 2 * math.pi * i / SAMPLES
            a += value * math.cos(k * x)
            b += value * math.sin(k * x)
        out += [2 * a / SAMPLES, 2 * b / SAMPLES]
    return out


def number(value):
    text = '%.4f' % value
    text = text.rstrip('0').rstrip('.') if '.' in text else text
    text = text.replace('0.', '.', 1) if text.startswith('0.') else text.replace('-0.', '-.', 1)
    return '0' if text in ('', '-0', '.', '-.') else text


lines = []
for who, gaits in GAITS.items():
    parts = []
    for gait, table in gaits.items():
        obj = keyed('%s.%s' % (who, gait), table)
        curves = curves_of(obj)
        fields = ['%s: %s' % (scalar, number(table[scalar])) for scalar in SCALARS]
        for channel in CHANNELS:
            # The stride's phase is 0 at the left heel strike (src/render/gait.ts), as is a foot's own cycle.
            terms, offset = (FOOT_HARMONICS, 0.0) if channel in ('pitch', 'give') else (HARMONICS, 0.0)
            fields.append('%s: [%s]' % (channel, ', '.join(number(v) for v in series(curves[channel], terms, offset))))
        parts.append('    %s: { %s },' % (gait, ', '.join(fields)))
    lines.append('  %s: {\n%s\n  },' % (who, '\n'.join(parts)))

text = '\n'.join([
    "import type { Strider } from './gait';",
    '',
    '/**',
    ' * Written by art/blender/motion.py: each person\'s walk and run, keyed in Blender and sampled as Fourier series. Change',
    ' * the keys there and run it again, rather than these numbers.',
    ' */',
    'export const GAITS = {',
    '\n'.join(lines),
    '} as const satisfies Record<string, Strider>;',
    '',
])

# Saved through a text block, as MCP's safe mode allows nothing but bpy.
out = bpy.data.texts.get('motion-data.ts') or bpy.data.texts.new('motion-data.ts')
out.clear()
out.write(text)
with bpy.context.temp_override(edit_text=out):
    bpy.ops.text.save_as(filepath=OUT, check_existing=False)  # noqa: F821 (set by the caller, see above)
print('motion: wrote', OUT)  # noqa: F821
