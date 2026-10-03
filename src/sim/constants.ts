/**
 * Simulation constants (plan §4.2). Lengths are in EL, one Elof length; times are in seconds.
 * These are starting values: Stage 1 tunes them on the devices.
 */
export const STEP = 1 / 120;
export const MAX_STEPS_PER_FRAME = 8;

export const WALK_SPEED = 1.2;
export const RUN_SPEED = 3.5;
/** A full stick reaches the run after this long. */
export const RUN_AFTER = 0.3;
/** From a run, Elof stands still within this long. */
export const STOP_WITHIN = 0.15;
/** Stick deflection that asks for a run. Below it Elof walks. */
export const RUN_DEFLECTION = 0.72;
/** Deflection at which the walk reaches its full speed. Shift on the keyboard gives exactly this. */
export const WALK_DEFLECTION = 0.6;

/** A tap on Hoppa tops out here. */
export const HOP_APEX = 0.6;
/** Holding Hoppa tops out here. */
export const JUMP_APEX = 1.1;
/** How far a held jump carries at a run. */
export const RUNNING_JUMP_REACH = 2.2;
export const COYOTE_TIME = 0.15;
export const JUMP_BUFFER = 0.2;
export const MAX_FALL_SPEED = 14;

/** Chosen so that a held jump at a run lands RUNNING_JUMP_REACH away. */
export const GRAVITY = (8 * JUMP_APEX * RUN_SPEED ** 2) / RUNNING_JUMP_REACH ** 2;

// The physics step lowers the speed first and then moves, so an arc tops out v·STEP/2 below the textbook
// height. Both values below are solved for that stepped arc.
const halfStep = (GRAVITY * STEP) / 2;
/** Take-off speed whose stepped arc tops out at JUMP_APEX. */
export const JUMP_SPEED = halfStep + Math.sqrt(halfStep * halfStep + 2 * GRAVITY * JUMP_APEX);
/** Gravity multiplier while Elof rises with Hoppa released. A tap then tops out at HOP_APEX. */
export const HOP_GRAVITY_SCALE = JUMP_SPEED ** 2 / (2 * GRAVITY * (HOP_APEX + (JUMP_SPEED * STEP) / 2));

/** A trail candy is collected when it comes this close to Elof's middle: near misses count (plan §4.3). */
export const CANDY_MAGNET = 0.6;

export const ELOF_HALF_WIDTH = 0.18;
export const ELOF_HEIGHT = 1;
/** How far the camera looks ahead of Elof (plan §5.2: 2–3 EL). */
export const CAMERA_LEAD = 2.5;
