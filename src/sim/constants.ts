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

/** A step this high or lower is walked over (plan §4.2). */
export const STEP_HEIGHT = 0.3;
/** A ledge whose top is within this of his feet is grabbed and climbed. */
export const LEDGE_REACH = 1.4;
/** Pulling himself up a ledge takes this long. */
export const LEDGE_TIME = 0.4;
/** Climbing speed on a hose, a stem or the lace. */
export const CLIMB_SPEED = 1;
/** He takes hold of a hose when he is this close to it. */
export const CLIMB_GRAB = 0.2;
/** From the top of a hose he steps this far onto the ledge beside it. */
export const CLIMB_EXIT = 0.65;
/** After letting go of a hose he can't take hold again for this long. */
export const REGRAB_AFTER = 0.35;
/** Standing this close to the top of a hose, Använd slides him down it. */
export const SLIDE_REACH = 0.75;
/** Sliding down a hose takes this long, whatever its length. */
export const SLIDE_TIME = 1;
/** Ground too steep to stand on is slid down no faster than this. */
export const STEEP_SLIDE_SPEED = 3;

/** Within this of a hook, Använd throws the lace (plan §4.2). */
export const LACE_REACH = 4;
/** How fast the lace pulls him in to its swinging length. */
export const LACE_REEL = 5;
/** The lace is never climbed shorter than this. */
export const SWING_MIN_LENGTH = 1;
/** Full height: the swing goes no further from straight down than this. */
export const SWING_MAX = (65 * Math.PI) / 180;
/** What pushing the way he swings adds, along the arc, in EL/s². */
export const SWING_PUMP = 1.6;
/** With *Hjälp med svingen* the swing pumps itself, and harder: full height in about two seconds. */
export const SWING_PUMP_HELP = 3.2;
/** A swing left alone slowly comes to rest. */
export const SWING_DAMP = 0.08;
/** With help, the flight from the swing to its landing takes this long. */
export const SWING_FLIGHT = 0.6;
/** With help, Hoppa is held until the next forward top of the swing, but never longer than this. */
export const SWING_HOLD_MAX = 2.6;

/** A big candy is reached when Elof's middle comes this close to it (plan §3.3, rule 4). */
export const CHECKPOINT_REACH = 0.9;
/** *Lätta hopp*: running to within this of a marked edge jumps by itself. */
export const EASY_JUMP_REACH = 0.35;
/** *Lätta hopp*: Hoppa pressed within this of a marked edge is steered to its landing. */
export const EASY_JUMP_STEER = 1.2;

/** A thing on a rail takes this long from one stop to the next. */
export const MOVE_TIME = 0.6;
/** Standing this close beside a thing on a rail, Använd pushes it. */
export const PUSH_REACH = 0.5;
/** A thing that is not yet where it belongs goes home when Elof is this far from it (plan §4.5). */
export const MOVER_RESET = 10;

/** A falling drop's shadow shows on the ground this long before it lands: nothing hits him unannounced. */
export const DROP_WARNING = 1;
/** The drop itself is in the air for this long, and falls from this high. */
export const DROP_FALL = 0.55;
export const DROP_FROM = 5;
/** A drop knocks him over when he is this close to where it lands. */
export const DROP_RADIUS = 0.5;
/** Knocked over, he is back on his feet after this long: a miss costs about a second (plan §4.5). */
export const DOWN_TIME = 0.9;

/** The ghost hops on when Elof comes this close: it keeps its distance (plan §4.2). */
export const GHOST_NEAR = 4;
/** How fast the ghost hops from one place to the next. Faster than Elof runs: the chase can't be won early. */
export const GHOST_SPEED = 6;
/** At a near-catch it lets him come this close, and Använd says Ta! */
export const GHOST_CATCH = 1.5;
/** At a near-catch it slips away by itself when he comes this close without grabbing. */
export const GHOST_SLIP = 0.6;
/** Standing this close to a thing to use, Använd offers it. */
export const SPOT_REACH = 1.2;

/** On a ride the stick moves him this far up or down from the middle of its path. */
export const RIDE_CORRIDOR = 1.6;
/** ...and this fast. */
export const RIDE_STEER = 3;

/** A thing to touch is used when he comes this close: a memory in a curl of shaving. */
export const TOUCH_REACH = 0.7;
/** A rolling cone bowls him over when it comes this close to his legs. A jump clears it. */
export const ROLLER_REACH = 0.3;

/** A soft tussock sinks this far, in this many seconds, while he stands on it; left alone it rises again. */
export const SINK_DEPTH = 0.45;
export const SINK_TIME = 1.8;
export const RISE_TIME = 0.8;
/** The glitter bubble catches him when his boots come this close to water: before he touches it. */
export const WATER_REACH = 0.1;

/** A gust is announced this long before it blows: the lichen bends, and a line shows where it will come. */
export const GUST_WARNING = 1;
/** Caught in the open, he is taken back at this speed, to the last boulder. */
export const GUST_SPEED = 5;
/** He is in a boulder's lee within this far of it. */
export const GUST_SHELTER = 0.8;
/** On *Lugnt* a gust only slows him: to this share of his running speed. */
export const GUST_SLOW = 0.5;

/** A fall longer than this ends in the glitter bubble; a shorter one is a soft landing (plan §4.2). */
export const FALL_LIMIT = 4;
/** The bubble floats him back in about this long. */
export const BUBBLE_TIME = 1;
/** How far the bubble's path rises above a straight line: it floats, it doesn't fly. */
export const BUBBLE_LIFT = 0.6;
/** Safe ground is where he stood this much time on the ground ago: time in the air is not counted. */
export const SAFE_AFTER = 0.5;
/** If that spot is further than this from where he last stood, or at another height, he goes there instead. */
export const SAFE_REACH = 2.5;
/** How far past his own edge a walking Elof looks for the ground. */
export const EDGE_REACH = 0.08;

/** A trail candy is collected when it comes this close to Elof's middle: near misses count (plan §4.3). */
export const CANDY_MAGNET = 0.6;

export const ELOF_HALF_WIDTH = 0.18;
export const ELOF_HEIGHT = 1;
/** How far the camera looks ahead of Elof (plan §5.2: 2–3 EL). */
export const CAMERA_LEAD = 2.5;
