"""Roerelser: how the family move, keyed in Blender for the game (plan 5.6 point 3, the motion pass of 8 November 2026).

Each person's walk and run, how they stand and breathe and shift their weight, are keyed here as curves over time, one
Empty per person and gait with a custom property for every joint the game poses (src/render/rig.ts, Pose). Blender's own
Bezier curves between the keys are what the game plays: this script samples them and writes them, as Fourier series, to
src/render/motion-data.ts. The stride (src/render/gait.ts) puts the feet and fits the legs to them on each body; the rest of
the body follows these curves.

Run it inside Blender, after a first line that sets where the game's table goes:
    OUT = r'C:/.../src/render/motion-data.ts'
Headless, in a cloud session or on Olov's computer:
    blender -b --factory-startup --python-expr "OUT=r'src/render/motion-data.ts'; exec(open('art/blender/motion.py').read())"
or, with the bpy 5.2 module:  python -c "OUT='src/render/motion-data.ts'; exec(open('art/blender/motion.py').read())"
With SAVE = r'C:/.../art/blender/motion.blend' set too (git ignores it), the keys are saved there, to be opened, looked at
in the Graph Editor and moved; running this script again keys them afresh from the tables below, so a change that should
last goes into the tables. The game's own page for looking at the motion is dev/motion.html (`npm run dev`).

How the keys are read:
- A stride is two steps, and its keys are at a share of it, 0 to 1: the left heel comes down at 0, the right at 0.5.
- Most of the body does the same each step, mirrored: those keys are given for the first step only. "odd" mirrors with
  the sign turned (the hips go left, then right), "even" without (the hips go down at each step).
- The arm is the left arm, over the whole stride; the right arm goes half a stride later.
- The foot's pitch is over its own cycle, from its heel strike (toes up +): it comes down on its heel, rolls flat, lifts
  its heel about its ball, pushes off on its toes and swings through.
- Lengths are shares of the body's height, angles radians. A stand's keys are shares of its loop; a clip's (going down on
  a knee) are shares of its seconds, in the game's own pose.

Nothing here comes from anyone else: no clip, no capture, no library. Keep this file in plain ASCII: it is sent to
Blender as text.
"""
import math

import bpy

FRAMES = 48         # keyed frames in a stride: Blender's timeline for one cycle
SAMPLES = 96        # samples of each curve for its series
HARMONICS = 3       # terms of a body curve's series
FOOT_HARMONICS = 8  # the foot's pitch has sharp corners: more terms

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

# --- how they stand ------------------------------------------------------------------------------------------------------
# A loop of `period` seconds, keyed at shares of it. Nobody stands still: the weight goes onto one leg (that hip comes up, the
# other knee gives, the shoulders tip the other way, the head stays level or tilts), rests there, and goes over to the other;
# the head looks about; the arms hang from relaxed elbows and swing a little with the body. Breathing comes on top: `breath`
# breaths a second, `deep` of lean. Lengths are shares of the height, angles radians.

ADULT_STAND = {
    'period': 10.0, 'breath': 0.24, 'deep': 0.012, 'width': 0.05,
    # Onto the left foot, resting there, over to the right, resting there.
    'sway': ('full', [(0.0, 0.0), (0.09, 0.008), (0.16, 0.011), (0.42, 0.01), (0.5, 0.0), (0.59, -0.009), (0.66, -0.011),
                      (0.92, -0.01)]),
    'roll': ('full', [(0.0, 0.0), (0.1, 0.03), (0.17, 0.04), (0.42, 0.036), (0.5, 0.0), (0.6, -0.03), (0.67, -0.04),
                      (0.92, -0.036)]),
    'side': ('full', [(0.0, 0.0), (0.17, -0.012), (0.42, -0.01), (0.5, 0.0), (0.67, 0.012), (0.92, 0.01)]),
    'tilt': ('full', [(0.0, 0.0), (0.2, 0.02), (0.45, 0.01), (0.55, -0.005), (0.7, -0.018), (0.95, -0.01)]),
    'lean': ('full', [(0.0, 0.012), (0.5, 0.008)]),
    'nod': ('full', [(0.0, 0.02), (0.3, 0.035), (0.6, 0.01), (0.85, 0.03)]),
    # Looking about: over there, back, the other way.
    'turn': ('full', [(0.0, 0.0), (0.12, 0.12), (0.3, 0.1), (0.4, 0.0), (0.62, -0.08), (0.78, -0.1), (0.9, 0.0)]),
    'arm': ('full', [(0.0, 0.05), (0.2, 0.08), (0.5, 0.04), (0.7, 0.07)]),
    'elbow': ('full', [(0.0, 0.2), (0.25, 0.26), (0.55, 0.18), (0.8, 0.24)]),
    'wrist': ('full', [(0.0, 0.1), (0.3, 0.14), (0.65, 0.08)]),
}

# Pappa stands easy and solid, looking about. Mamma rests on a hip, her head tilted. Moa fidgets, quicker. Bertil can
# hardly stand still. Mormor and Morfar stand a little stooped, slow and steady, and breathe slower.
STANDS = {
    'pappa': person(ADULT_STAND, period=11.0, width=0.055, turn=('scale', 1.2)),
    'mamma': person(ADULT_STAND, period=9.0, width=0.045, sway=('scale', 1.35), roll=('scale', 1.4), side=('scale', 1.4),
                    tilt=('scale', 1.6), elbow=('scale', 1.25)),
    'moa': person(ADULT_STAND, period=6.5, breath=0.3, sway=('scale', 1.2), tilt=('scale', 1.8), turn=('scale', 1.4),
                  arm=('scale', 1.4)),
    'bertil': person(ADULT_STAND, period=4.6, breath=0.34, deep=0.014, width=0.06, sway=('scale', 1.5), roll=('scale', 1.2),
                     tilt=('scale', 1.5), turn=('scale', 1.6), arm=('scale', 1.8), wrist=('scale', 1.3)),
    'mormor': person(ADULT_STAND, period=13.0, breath=0.22, deep=0.014, sway=('scale', 0.7), roll=('scale', 0.6),
                     lean=('full', [(0.0, 0.075), (0.5, 0.07)]), nod=('full', [(0.0, 0.06), (0.4, 0.08), (0.75, 0.05)]),
                     elbow=('scale', 1.6), turn=('scale', 0.8)),
    'morfar': person(ADULT_STAND, period=12.0, breath=0.21, deep=0.014, sway=('scale', 0.8), roll=('scale', 0.7),
                     lean=('full', [(0.0, 0.07), (0.5, 0.065)]), nod=('full', [(0.0, 0.05), (0.35, 0.07), (0.7, 0.04)]),
                     elbow=('scale', 1.4)),
}
# --- going down on a knee ------------------------------------------------------------------------------------------------
# Down onto the left knee with the right foot forward (src/render/acting.ts kneel), keyed at shares of `seconds`. The legs
# are keyed as shares and reach the floor from there on each body's own legs (src/render/gait.ts kneelLegs), as the
# chair's are: `down`, how far the hips have gone from standing to kneeling, the left knee on the floor; `front`, how far
# the right foot has stepped ahead to its place, and `frontUp` how high it is lifted on the way (a share of the hips'
# height); `back` and `backUp`, the same for the left foot stepping back to its place; `toes`, how far the left heel has
# come up, the boot onto its toe. `hand` is how much the right hand rests on the right knee (src/render/stage.ts puts it
# there with the real arm). The rest is the pose itself.
# The weight goes onto the left foot and the right steps out ahead, lifted, and is put down; the weight comes forward over
# it, the left heel lifts and the left foot steps back onto its toe as the hips go down, the trunk leaning over the front
# foot; the knee comes down softly to the floor, the right hand going to the right knee, and the body settles, the trunk
# and the head coming up. Getting up is the same way back. Mormor and Morfar take longer, lean further over and lean on
# the knee with the hand; an old foot is slid more than lifted.

KNEEL = {
    'seconds': 1.2,
    'down': [(0.0, 0.0), (0.12, 0.05), (0.36, 0.3), (0.56, 0.6), (0.74, 0.87), (0.86, 0.97), (0.94, 1.0)],
    'front': [(0.1, 0.0), (0.38, 1.0)],
    'frontUp': [(0.1, 0.0), (0.22, 0.12), (0.34, 0.03), (0.4, 0.0)],
    # The left foot steps back low once the hips are low enough for it to reach, and comes down on its toe.
    'back': [(0.34, 0.0), (0.64, 1.0)],
    'backUp': [(0.34, 0.0), (0.46, 0.035), (0.6, 0.008), (0.66, 0.0)],
    'toes': [(0.28, 0.0), (0.45, 0.5), (0.62, 0.86), (0.9, 1.0)],
    'hand': [(0.5, 0.0), (0.9, 1.0)],
    # Onto the left foot, over to the right as it comes down ahead, and square again.
    'sway': [(0.0, 0.0), (0.14, 0.08), (0.3, 0.06), (0.48, -0.04), (0.72, -0.01), (0.9, 0.0)],
    'hipRoll': [(0.0, 0.0), (0.14, 0.045), (0.3, 0.035), (0.48, -0.02), (0.75, 0.0)],
    'bendSide': [(0.0, 0.0), (0.14, -0.03), (0.48, 0.02), (0.8, 0.0)],
    'lean': [(0.0, 0.0), (0.15, 0.05), (0.4, 0.14), (0.7, 0.3), (0.86, 0.33), (1.0, 0.24)],
    # Down at where the foot goes, and up again.
    'nod': [(0.0, 0.0), (0.25, 0.18), (0.6, 0.26), (0.85, 0.2), (1.0, 0.08)],
    'tilt': [(0.0, 0.0), (0.2, 0.03), (0.5, -0.02), (0.8, 0.02), (1.0, 0.03)],
    # The left arm comes a little forward for balance and hangs easy; the right goes to the knee, the hand over it.
    'armL': [(0.0, 0.02), (0.25, 0.12), (0.5, 0.3), (0.75, 0.22), (1.0, 0.14)],
    'elbowL': [(0.0, 0.1), (0.3, 0.3), (0.6, 0.45), (1.0, 0.32)],
    'wristL': [(0.0, 0.0), (0.5, 0.1), (1.0, 0.06)],
    'armR': [(0.0, 0.02), (0.3, 0.15), (0.55, 0.45), (0.8, 0.62), (1.0, 0.6)],
    'elbowR': [(0.0, 0.1), (0.3, 0.3), (0.6, 0.7), (0.85, 0.85), (1.0, 0.8)],
    'wristR': [(0.0, 0.0), (0.6, 0.15), (0.9, 0.35), (1.0, 0.3)],
}
KNEEL_ELDER = dict(KNEEL)
KNEEL_ELDER.update({
    'seconds': 1.7,
    'down': [(0.0, 0.0), (0.14, 0.04), (0.38, 0.28), (0.58, 0.56), (0.76, 0.85), (0.88, 0.97), (0.96, 1.0)],
    # An old foot is slid forward and back, hardly lifted.
    'frontUp': [(0.1, 0.0), (0.22, 0.05), (0.34, 0.01), (0.4, 0.0)],
    'backUp': [(0.38, 0.0), (0.5, 0.02), (0.66, 0.0)],
    'hand': [(0.42, 0.0), (0.8, 1.0)],
    'lean': [(0.0, 0.07), (0.15, 0.12), (0.4, 0.26), (0.7, 0.44), (0.86, 0.46), (1.0, 0.36)],
    'nod': [(0.0, 0.05), (0.25, 0.2), (0.6, 0.3), (0.85, 0.24), (1.0, 0.12)],
    'armR': [(0.0, 0.02), (0.3, 0.2), (0.5, 0.5), (0.75, 0.68), (1.0, 0.66)],
    'elbowR': [(0.0, 0.2), (0.3, 0.4), (0.55, 0.8), (0.8, 0.95), (1.0, 0.9)],
})
# Getting up off a kitchen chair: the chair pushed back from the table with the body on it and the feet drawn in under
# the seat onto their balls; then the body leans well forward over them, comes forward and up off the seat over feet
# that stay where they were put, the heels coming down and the arms swinging forward to help. Sitting down is the same
# the other way about: down over the feet onto the seat behind, and in to the table with the chair.
# Keyed as shares, the legs reaching the floor from where they put the hips, whatever their length (src/render/gait.ts
# seated): `tuck`, how far the feet are drawn in; `heel`, how far the heels are up; `over`, how far the hips have come
# over the feet; `rise`, how far up off the seat they are. `planted` is where the body stands: 0 with the hips at its place
# (where a scene seats it), 1 with the feet there (src/render/stage.ts). The chair goes with the hips while they are on it.
STAND_UP = {
    'seconds': 0.5,
    'tuck': [(0.0, 0.0), (0.3, 1.0)],
    'heel': [(0.0, 0.0), (0.3, 1.0), (0.5, 0.9), (0.75, 0.0)],
    'planted': [(0.0, 0.0), (0.42, 1.0)],
    'over': [(0.0, 0.0), (0.42, 0.0), (0.62, 0.65), (0.85, 1.0)],
    'rise': [(0.0, 0.0), (0.42, 0.0), (0.56, 0.25), (0.76, 0.8), (0.92, 1.0)],
    'lean': [(0.0, 0.12), (0.25, 0.28), (0.45, 0.6), (0.6, 0.5), (0.85, 0.1), (1.0, 0.0)],
    'nod': [(0.0, 0.0), (0.45, -0.22), (0.8, -0.05), (1.0, 0.0)],
    'armL': [(0.0, 0.0), (0.42, 0.3), (0.6, 0.38), (0.85, 0.08), (1.0, 0.02)],
    'armR': [(0.0, 0.0), (0.42, 0.3), (0.6, 0.38), (0.85, 0.08), (1.0, 0.02)],
    'elbowL': [(0.0, 1.63), (0.42, 1.25), (0.6, 0.7), (0.85, 0.22), (1.0, 0.1)],
    'elbowR': [(0.0, 1.63), (0.42, 1.25), (0.6, 0.7), (0.85, 0.22), (1.0, 0.1)],
}
SIT_DOWN = {
    'seconds': 0.8,
    'tuck': [(0.0, 1.0), (0.6, 1.0), (1.0, 0.0)],
    'heel': [(0.0, 0.0), (0.4, 0.25), (0.58, 0.4), (0.9, 0.0)],
    'planted': [(0.0, 1.0), (0.6, 1.0), (1.0, 0.0)],
    'over': [(0.0, 1.0), (0.14, 0.85), (0.34, 0.35), (0.48, 0.06), (0.58, 0.0)],
    'rise': [(0.0, 1.0), (0.12, 0.94), (0.34, 0.35), (0.5, 0.05), (0.58, 0.0)],
    'lean': [(0.0, 0.0), (0.22, 0.3), (0.42, 0.5), (0.6, 0.36), (0.85, 0.12), (1.0, 0.12)],
    'nod': [(0.0, 0.0), (0.4, -0.18), (0.8, 0.0)],
    'armL': [(0.0, 0.02), (0.27, 0.3), (0.5, 0.3), (0.7, 0.08), (0.85, 0.0)],
    'armR': [(0.0, 0.02), (0.27, 0.3), (0.5, 0.3), (0.7, 0.08), (0.85, 0.0)],
    'elbowL': [(0.0, 0.1), (0.27, 0.45), (0.5, 1.05), (0.7, 1.5), (0.85, 1.63)],
    'elbowR': [(0.0, 0.1), (0.27, 0.45), (0.5, 1.05), (0.7, 1.5), (0.85, 1.63)],
}
CLIPS = {'kneel': KNEEL, 'kneelElder': KNEEL_ELDER, 'standUp': STAND_UP, 'sitDown': SIT_DOWN}

# --- putting on the raincoat and the boots -------------------------------------------------------------------------------
# Stormkvallen's `tillsammans` (src/content/aventyr2/chapters/stormkvall.ts): each of the family pulls on a raincoat and
# rubber boots before they go out into the storm, in their own way. A part (the coat, or a pair of boots) is keyed here in
# the game's own pose, in seconds, from standing to standing, with the left arm in first and the left foot first; the parts
# are put together for each person below, at their own pace, bigger or smaller, and turned about for someone who starts
# with the right.
# `coat`, `bootL` and `bootR` key how far each piece is on, 0 to 1: the game draws a piece as far as it is on
# (src/render/rain-gear.ts), so it goes on with the hands that put it on. The coat goes on in this order (COAT_ORDER there):
#   0-0.22 the first sleeve, from the cuff up, as the arm goes into it; 0.22-0.32 that side's front, as it falls from the
#   shoulder; 0.32-0.52 across the back, as the coat is swung round behind; 0.52-0.74 the other sleeve; 0.74-0.84 its
#   front; 0.88-1 the open front closed from the hem up to the collar, as it is zipped.
# A boot goes on from the sole up as the foot is pushed down into it, and the foot is stamped down.

# Held by the collar in the right hand, the coat's left sleeve is held open at the left hip; the left arm goes down into it
# as the right hand pulls the coat up the arm onto the shoulder; the right hand carries the collar up over the head and
# round behind, lets go, and the right arm reaches back and down into its sleeve, the head turned to find it; a shrug onto
# the shoulders, the fronts pulled together at the waist, and the zip run up to the chin.
COAT_ON = {
    'seconds': 2.95,
    'armL': [(0.0, 0.02), (0.3, 0.3), (0.62, 0.15), (0.85, 0.08), (1.1, 0.12), (1.62, 0.45), (1.9, 0.38), (2.12, 0.3),
             (2.4, 0.42), (2.7, 0.38), (2.95, 0.02)],
    'outL': [(0.0, 0.0), (0.3, 0.15), (0.62, 0.32), (0.85, 0.2), (1.1, 0.1), (1.62, -0.1), (2.12, 0.08), (2.4, -0.32),
             (2.7, -0.32), (2.95, 0.0)],
    'elbowL': [(0.0, 0.1), (0.3, 0.9), (0.62, 0.08), (0.85, 0.2), (1.1, 0.3), (1.62, 1.1), (1.9, 0.9), (2.12, 0.35),
               (2.4, 1.25), (2.7, 1.2), (2.95, 0.1)],
    'wristL': [(0.0, 0.0), (0.3, 0.1), (0.62, -0.25), (0.85, 0.0), (2.4, 0.15), (2.7, 0.1), (2.95, 0.0)],
    'armR': [(0.0, 0.02), (0.3, 0.55), (0.62, 0.62), (0.85, 1.2), (1.1, 2.7), (1.38, 0.9), (1.62, -0.7), (1.9, -0.25),
             (2.12, 0.3), (2.4, 0.42), (2.7, 0.95), (2.95, 0.02)],
    'outR': [(0.0, 0.0), (0.3, -0.75), (0.62, -1.0), (0.85, -0.85), (1.1, 0.45), (1.38, 0.7), (1.62, 0.35), (1.9, 0.2),
             (2.12, 0.08), (2.4, -0.32), (2.7, -0.38), (2.95, 0.0)],
    'elbowR': [(0.0, 0.1), (0.3, 1.05), (0.62, 1.1), (0.85, 1.75), (1.1, 1.25), (1.38, 0.8), (1.62, 0.3), (1.9, 0.12),
               (2.12, 0.35), (2.4, 1.25), (2.7, 2.25), (2.95, 0.1)],
    'wristR': [(0.0, 0.0), (0.3, 0.25), (0.85, 0.1), (1.1, 0.3), (1.62, -0.35), (1.9, -0.1), (2.4, 0.15), (2.7, 0.1),
               (2.95, 0.0)],
    'lean': [(0.0, 0.0), (0.3, 0.1), (0.62, 0.08), (0.85, 0.04), (1.1, 0.0), (1.38, 0.1), (1.62, 0.18), (1.9, 0.1),
             (2.12, -0.04), (2.4, 0.06), (2.7, 0.02), (2.95, 0.0)],
    'nod': [(0.0, 0.0), (0.3, 0.3), (0.62, 0.25), (0.85, 0.05), (1.1, -0.12), (1.38, 0.0), (1.62, 0.1), (2.12, -0.1),
            (2.4, 0.42), (2.7, 0.15), (2.95, 0.0)],
    'turn': [(0.0, 0.0), (0.3, 0.2), (0.62, 0.28), (0.85, 0.1), (1.1, -0.1), (1.38, -0.3), (1.62, -0.32), (1.9, -0.12),
             (2.12, 0.0), (2.95, 0.0)],
    'twist': [(0.0, 0.0), (0.3, 0.15), (0.62, 0.18), (0.85, 0.1), (1.1, -0.05), (1.38, -0.18), (1.62, -0.25), (1.9, -0.08),
              (2.12, 0.0), (2.95, 0.0)],
    'bendSide': [(0.0, 0.0), (0.62, -0.04), (1.1, 0.04), (1.62, 0.02), (2.12, 0.0), (2.95, 0.0)],
    'coat': [(0.0, 0.0), (0.3, 0.0), (0.62, 0.22), (0.85, 0.32), (1.1, 0.44), (1.38, 0.52), (1.62, 0.6), (1.9, 0.74),
             (2.12, 0.86), (2.4, 0.88), (2.7, 1.0)],
}

# Standing on the right foot, the left knee comes up over the boot, the foot is pushed down into it and stamped down; the
# weight goes over onto the left, and the right foot does the same. The arms go out a little for balance; the eyes on the
# boot.
BOOTS_ON = {
    'seconds': 1.7,
    'sway': [(0.0, 0.0), (0.2, -0.14), (0.76, -0.14), (1.02, 0.14), (1.48, 0.14), (1.7, 0.0)],
    'hipRoll': [(0.0, 0.0), (0.2, 0.04), (0.76, 0.03), (1.02, -0.04), (1.48, -0.03), (1.7, 0.0)],
    'bendSide': [(0.0, 0.0), (0.2, 0.03), (0.76, 0.02), (1.02, -0.03), (1.48, -0.02), (1.7, 0.0)],
    'legL': [(0.0, 0.0), (0.2, 0.06), (0.4, 0.8), (0.62, 0.35), (0.76, 0.0), (1.7, 0.0)],
    'kneeL': [(0.0, 0.0), (0.2, 0.1), (0.4, 1.25), (0.62, 0.55), (0.76, 0.1), (0.86, 0.02), (1.48, 0.1), (1.6, 0.0),
              (1.7, 0.0)],
    'footL': [(0.0, 0.0), (0.4, -0.1), (0.62, 0.05), (0.76, 0.06), (0.86, 0.0), (1.7, 0.0)],
    'splayL': [(0.0, 0.0), (0.2, 0.04), (0.4, 0.2), (0.62, 0.1), (0.76, 0.0), (1.7, 0.0)],
    'legR': [(0.0, 0.0), (0.92, 0.0), (1.02, 0.06), (1.12, 0.8), (1.34, 0.35), (1.48, 0.0), (1.7, 0.0)],
    'kneeR': [(0.0, 0.0), (0.76, 0.1), (0.86, 0.02), (1.02, 0.1), (1.12, 1.25), (1.34, 0.55), (1.48, 0.1), (1.6, 0.02),
              (1.7, 0.0)],
    'footR': [(0.0, 0.0), (1.02, 0.0), (1.12, -0.1), (1.34, 0.05), (1.48, 0.06), (1.6, 0.0), (1.7, 0.0)],
    'splayR': [(0.0, 0.0), (0.92, 0.0), (1.02, 0.04), (1.12, 0.2), (1.34, 0.1), (1.48, 0.0), (1.7, 0.0)],
    'armL': [(0.0, 0.02), (0.2, 0.15), (0.76, 0.12), (1.02, 0.15), (1.48, 0.12), (1.7, 0.02)],
    'armR': [(0.0, 0.02), (0.2, 0.12), (0.76, 0.15), (1.02, 0.12), (1.48, 0.15), (1.7, 0.02)],
    'outL': [(0.0, 0.0), (0.2, 0.12), (0.76, 0.18), (1.02, 0.1), (1.48, 0.12), (1.7, 0.0)],
    'outR': [(0.0, 0.0), (0.2, 0.18), (0.76, 0.1), (1.02, 0.18), (1.48, 0.12), (1.7, 0.0)],
    'elbowL': [(0.0, 0.1), (0.2, 0.35), (0.76, 0.4), (1.48, 0.4), (1.7, 0.1)],
    'elbowR': [(0.0, 0.1), (0.2, 0.35), (0.76, 0.4), (1.48, 0.4), (1.7, 0.1)],
    'lean': [(0.0, 0.0), (0.2, 0.08), (0.4, 0.12), (0.76, 0.14), (1.12, 0.12), (1.48, 0.14), (1.7, 0.0)],
    'nod': [(0.0, 0.0), (0.2, 0.3), (0.76, 0.35), (1.48, 0.35), (1.7, 0.0)],
    'turn': [(0.0, 0.0), (0.4, 0.1), (0.76, 0.06), (1.12, -0.1), (1.48, -0.06), (1.7, 0.0)],
    'bootL': [(0.0, 0.0), (0.4, 0.0), (0.62, 0.55), (0.76, 1.0)],
    'bootR': [(0.0, 0.0), (1.12, 0.0), (1.34, 0.55), (1.48, 1.0)],
}

STANDING = {'armL': 0.02, 'armR': 0.02, 'elbowL': 0.1, 'elbowR': 0.1}
GEAR = ('coat', 'bootL', 'bootR')
# Turned about, left for right: the arms and legs change places, and what turns or tips to one side goes to the other.
MIRROR = {'armL': 'armR', 'elbowL': 'elbowR', 'outL': 'outR', 'wristL': 'wristR', 'legL': 'legR', 'kneeL': 'kneeR',
          'footL': 'footR', 'splayL': 'splayR', 'bootL': 'bootR'}
MIRROR.update({right: left for left, right in list(MIRROR.items())})
SIDEWAYS = ('turn', 'twist', 'tilt', 'bendSide', 'sway', 'hipRoll')


def mirrored(part):
    """The part the other way about: the right arm in first, or the right foot first."""
    out = {'seconds': part['seconds']}
    for name, keys in part.items():
        if name == 'seconds':
            continue
        sign = -1.0 if name in SIDEWAYS else 1.0
        out[MIRROR.get(name, name)] = [(at, value * sign) for at, value in keys]
    return out


def paced(part, pace=1.0, **gains):
    """The part taken `pace` times as long, each named channel `gain` times as far from standing (the gear never)."""
    out = {'seconds': part['seconds'] * pace}
    for name, keys in part.items():
        if name == 'seconds':
            continue
        rest, gain = STANDING.get(name, 0.0), gains.get(name, 1.0)
        out[name] = [(at * pace, value if name in GEAR else rest + (value - rest) * gain) for at, value in keys]
    return out


def dressing(*parts, **extra):
    """One clip of the parts one after another. A channel a part does not key is held between its neighbours (at standing,
    or for the gear at what is on by then); `extra` keys more on top, in seconds of the whole."""
    seconds = sum(part['seconds'] for part in parts)
    names = sorted({name for part in parts for name in part if name != 'seconds'} | set(extra))
    clip = {'seconds': seconds}
    for name in names:
        keys, start, worn = [], 0.0, 0.0
        for part in parts:
            if name in part:
                keys += [(start + at, value) for at, value in part[name]]
                worn = part[name][-1][1]
            elif name not in extra:
                held = worn if name in GEAR else STANDING.get(name, 0.0)
                keys += [(start, held), (start + part['seconds'], held)]
            start += part['seconds']
        keys = sorted(keys + list(extra.get(name, [])))
        # A key where two parts meet is kept once.
        clip[name] = [(at / seconds, value) for i, (at, value) in enumerate(keys) if i == 0 or at - keys[i - 1][0] > 1e-6]
    return clip


# Mamma: quick and light, the left arm first, her head tipped as she zips. Pappa: steady and big, the right arm first (the
# lamp is in his left hand), leaning well into it, heavy on his feet. Moa: the left arm first, quick, her head tipped, a
# springy stamp. Bertil: the boots first ("Jag tar mina storsta stovlar!"), lifted high and stamped hard, then the coat in a
# hurry, the right arm first, the arms flung.
DRESS = {
    'dressMamma': dressing(paced(COAT_ON, 0.88), paced(BOOTS_ON, 0.85, legL=0.85, kneeL=0.85, legR=0.85, kneeR=0.85),
                           tilt=[(0.0, 0.0), (2.0, 0.0), (2.3, 0.08), (2.6, 0.02), (4.0, 0.0)]),
    'dressPappa': dressing(paced(mirrored(COAT_ON), 1.0, lean=1.35, nod=0.85),
                           paced(mirrored(BOOTS_ON), 1.08, lean=1.3, kneeL=1.15, kneeR=1.15)),
    'dressMoa': dressing(paced(COAT_ON, 0.92, turn=1.25), paced(BOOTS_ON, 0.82, legL=1.1, legR=1.1),
                         tilt=[(0.0, 0.0), (0.4, 0.06), (1.2, -0.05), (2.3, 0.08), (2.7, 0.0)]),
    'dressBertil': dressing(paced(mirrored(BOOTS_ON), 0.8, legL=1.2, kneeL=1.25, legR=1.2, kneeR=1.25, sway=1.3),
                            paced(mirrored(COAT_ON), 0.78, armL=1.12, armR=1.12, turn=1.2)),
}
CLIPS.update(DRESS)

STAND_CHANNELS = ['sway', 'roll', 'side', 'tilt', 'lean', 'nod', 'turn', 'arm', 'elbow', 'wrist']
STAND_SCALARS = ['period', 'breath', 'deep', 'width']

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


def keyed(name, table, channels=None, scalars=None):
    """An Empty with each curve of `table` keyed as a custom property, and its scalars as plain properties."""
    obj = bpy.data.objects.new(name, None)
    holder.objects.link(obj)
    for scalar in scalars or SCALARS:
        obj[scalar] = float(table[scalar])
    for channel in channels or CHANNELS:
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
    """The Fourier series of a keyed cycle, as the game reads it: in radians of its phase, starting at `offset`. Terms too
    small to see (under a thousandth) are left off its end."""
    values = [curve.evaluate(i * FRAMES / SAMPLES) for i in range(SAMPLES)]
    out = [sum(values) / SAMPLES]
    for k in range(1, terms + 1):
        a = b = 0.0
        for i, value in enumerate(values):
            x = offset + 2 * math.pi * i / SAMPLES
            a += value * math.cos(k * x)
            b += value * math.sin(k * x)
        out += [2 * a / SAMPLES, 2 * b / SAMPLES]
    while len(out) > 1 and abs(out[-1]) < 0.0005:
        out.pop()
    return out


def number(value):
    text = '%.3f' % value
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
            terms, offset = (FOOT_HARMONICS if channel == 'pitch' else 5, 0.0) if channel in ('pitch', 'give') else (HARMONICS, 0.0)
            fields.append('%s: [%s]' % (channel, ', '.join(number(v) for v in series(curves[channel], terms, offset))))
        parts.append('    %s: { %s },' % (gait, ', '.join(fields)))
    lines.append('  %s: {\n%s\n  },' % (who, '\n'.join(parts)))

def clip_keys(name, clip):
    """An Empty with each channel of `clip` keyed over its seconds, as Blender keys it; its keys and their slopes, as the game
    reads them (cubic between keys, the slope at each key from its handles)."""
    obj = bpy.data.objects.new(name, None)
    holder.objects.link(obj)
    fps = scene.render.fps
    for channel, keys in clip.items():
        if channel == 'seconds':
            continue
        obj[channel] = 0.0
        for at, value in keys:
            obj[channel] = float(value)
            obj.keyframe_insert('["%s"]' % channel, frame=at * clip['seconds'] * fps)
    out = {}
    for channel, curve in curves_of(obj).items():
        for point in curve.keyframe_points:
            point.interpolation = 'BEZIER'
            point.handle_left_type = point.handle_right_type = 'AUTO_CLAMPED'
        curve.update()
        flat = []
        for point in curve.keyframe_points:
            dx = point.handle_right[0] - point.co[0]
            slope = (point.handle_right[1] - point.co[1]) / dx * fps if abs(dx) > 1e-9 else 0.0
            flat += [point.co[0] / fps, point.co[1], slope]
        out[channel] = flat
    return out


clips = []
for name, clip in CLIPS.items():
    keyed_clip = clip_keys('clip.%s' % name, clip)
    fields = ['seconds: %s' % number(clip['seconds'])]
    for channel, flat in keyed_clip.items():
        fields.append('%s: [%s]' % (channel, ', '.join(number(v) for v in flat)))
    clips.append('  %s: { %s },' % (name, ', '.join(fields)))

stands = []
for who, table in STANDS.items():
    obj = keyed('%s.stand' % who, table, STAND_CHANNELS, STAND_SCALARS)
    curves = curves_of(obj)
    fields = ['%s: %s' % (scalar, number(table[scalar])) for scalar in STAND_SCALARS]
    for channel in STAND_CHANNELS:
        fields.append('%s: [%s]' % (channel, ', '.join(number(v) for v in series(curves[channel], HARMONICS, 0.0))))
    stands.append('  %s: { %s },' % (who, ', '.join(fields)))

text = '\n'.join([
    "import type { Clip, Stander, Strider } from './gait';",
    '',
    '/**',
    ' * Written by art/blender/motion.py: each person\'s walk and run, and how they stand, keyed in Blender and sampled as',
    ' * Fourier series. Change the keys there and run it again, rather than these numbers.',
    ' */',
    'export const GAITS = {',
    '\n'.join(lines),
    '} as const satisfies Record<string, Strider>;',
    '',
    'export const STANDS = {',
    '\n'.join(stands),
    '} as const satisfies Record<string, Stander>;',
    '',
    '/** Clips keyed in the pose itself: each channel\'s keys as [seconds, value, slope, ...]. */',
    'export const CLIPS = {',
    '\n'.join(clips),
    '} as const satisfies Record<string, Clip>;',
    '',
])

# Saved through a text block, as MCP's safe mode allows nothing but bpy.
out = bpy.data.texts.get('motion-data.ts') or bpy.data.texts.new('motion-data.ts')
out.clear()
out.write(text)
with bpy.context.temp_override(edit_text=out):
    bpy.ops.text.save_as(filepath=OUT, check_existing=False)  # noqa: F821 (set by the caller, see above)
print('motion: wrote', OUT)  # noqa: F821

# The keys, to look at in the Graph Editor: SAVE = r'C:/.../art/blender/motion.blend' (git ignores it) keeps them.
if 'SAVE' in globals():
    bpy.ops.wm.save_as_mainfile(filepath=SAVE)  # noqa: F821 (set by the caller, see above)
    print('motion: saved', SAVE)  # noqa: F821
