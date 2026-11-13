import type { Act } from '../sim/scene';
import { groundedHips, JOINTS, REHEARSAL_LEGS, STANDING, type Legs, type Pose, type Role } from './rig';
import { carvingAt } from './carving-motion';
import { breathing, crouchPose, kneelPose, play, sample, seated, stand, stepOf, stride, type Clip, type Footing } from './gait';
import { CLIPS, GAITS, STANDS } from './motion-data';
import { DRESSING } from './rain-gear';

/** How long, in seconds, the end of putting on the gear takes to hand over to how they stand. */
const DRESSED = 0.5;
const dressing: Pose = { ...STANDING };

/**
 * Acting: what each of a scene's acts does to a body, as a pose that moves with time (docs/narrative-audit.md).
 * Pure: no three, no clock of its own. The same pose drives the rehearsal figures and the models from Blender
 * (src/render/rig.ts), so a scene reads the same wherever it is played; the models' own clips replace these
 * when they are made in Blender on Olov's computer.
 */
export interface ActContext {
  /** Seconds since the act began. */
  t: number;
  /** The aim, from the body's feet in its own side view, in an adult's units: how far ahead, and how high. */
  aim: { ahead: number; up: number; side?: number } | null;
  /** How far the body has walked, in its own strides: the legs go by it. */
  stride: number;
  /** How fast it walks now, from 0 to 1. */
  pace: number;
  /**
   * How fast it goes, in its own heights a second: the length of each step and whether it walks or jogs. Left out:
   * an easy walk. The stride must count steps of `stepLength` at the same gait, or the planted foot slides.
   */
  gait?: number;
  /** The length of each step, in the body's own heights, where a walk sets it (a whole number of steps): its swing fits it. */
  step?: number;
  /** Still: reduced motion. Each act holds its readable pose, without loops, bounces or shakes. */
  calm: boolean;
  /** Family timing and weight; story contacts retain their authored arrival times. */
  role?: Role;
  /** The body's legs (`Rig.legs`): the stride is fitted to them. Left out: the rehearsal figure's. */
  legs?: Legs;
  /** Where the body walks in the world, with its footing (./gait.ts): each planted foot stays where it came down. */
  feet?: { footing: Footing; x: number; z: number; yaw: number; height: number; dt: number };
  /** A clock that runs on through acts, for the loop of how someone stands (./gait.ts stand). Left out: `t`. */
  clock?: number;
  /** Seated, how high the hips are, in the body's heights: on its own chair (./gait.ts seated). Left out: an adult's. */
  seat?: number;
}

/** The body's stance under an act that only uses its arms and head. */
export type Stance = 'stand' | 'sit' | 'kneel' | 'crouch';

const UPPER = 0.84;
const FORE = 0.92;
/** How high the shoulders are over the hips. */
const SHOULDER = 1.55;
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
/** 0 → 1 over the first `inFor` seconds. */
const rise = (t: number, inFor: number) => smooth(t / inFor);
const timing = (role?: Role) => role === 'pappa' ? .9 : role === 'mamma' ? .86 : role === 'moa' ? 1.04 : role === 'bertil' ? 1.22 : 1;
const weight = (role?: Role) => role === 'pappa' ? .92 : role === 'mamma' ? .82 : role === 'bertil' ? 1.12 : 1;
const pulse = (t: number, at: number, up: number, hold: number, down: number) => rise(t - at, up) * (1 - rise(t - at - up - hold, down));

// Paper-space offsets: three deliberate marks, lifting between them, then looking over the drawing.
const DRAWING = [[0, -.12, -.04, .08], [.25, -.12, -.04, 0], [.85, .1, .04, 0], [1.1, .1, .04, .06],
  [1.4, -.08, .07, .06], [1.55, -.08, .07, 0], [2.05, .12, -.06, 0], [2.3, .12, -.06, .07],
  [2.7, -.02, -.02, .07], [2.85, -.02, -.02, 0], [3.15, .08, .06, 0], [3.5, .08, .06, .14],
  [4.2, .08, .06, .14], [4.8, -.12, -.04, .08]] as const;

/** Shared with the pen contact: seconds since drawing began, independent of frames and previous calls. */
export function drawingAt(seconds: number, calm = false, role?: Role) {
  const t = calm ? .25 : Math.max(0, seconds) * timing(role) % 4.8;
  let index = 1;
  while (index < DRAWING.length - 1 && t > DRAWING[index]![0]) index++;
  const a = DRAWING[index - 1]!, b = DRAWING[index]!, k = smooth((t - a[0]) / (b[0] - a[0]));
  const lift = a[3] + (b[3] - a[3]) * k;
  return { across: a[1] + (b[1] - a[1]) * k, ahead: a[2] + (b[2] - a[2]) * k, lift,
    contact: lift < 1e-6, inspect: calm ? 0 : pulse(t, 3.25, .3, .45, .65) };
}

/** Mug lift, a held sip, then a slower return; stage uses the same clock to meet the lips. */
export function sippingAt(seconds: number, calm = false, role?: Role) {
  const t = calm ? 0 : Math.max(0, seconds) * timing(role) % 6.8;
  return { raise: pulse(t, .9, .8, .95, 1.05), tilt: pulse(t, 1.75, .35, .35, .35) };
}

/** One deliberate bite: inspect, touch the lips, swallow, then lower the empty hand. */
export function eatingAt(seconds: number, calm = false) {
  const t = Math.max(0, seconds);
  return { mouth: calm ? 1 : rise(t, .85) * (1 - rise(t - 1.6, .65)),
    sweet: 1 - rise(t - .95, .45), swallow: calm ? 0 : pulse(t, 1.4, .2, .12, .4) };
}

/**
 * Two joints that put a hand at a point (ahead, up) from the shoulder, in the body's side view. The elbow bends
 * forward only: an arm that cannot reach points straight at it.
 */
export function reachFor(ahead: number, up: number): { arm: number; elbow: number } {
  const far = Math.min(UPPER + FORE - 1e-3, Math.max(Math.abs(UPPER - FORE) + 1e-3, Math.hypot(ahead, up)));
  const elbow = Math.acos(Math.max(-1, Math.min(1, (far * far - UPPER * UPPER - FORE * FORE) / (2 * UPPER * FORE))));
  const towards = Math.atan2(ahead, -up);
  const bent = Math.atan2(FORE * Math.sin(elbow), UPPER + FORE * Math.cos(elbow));
  return { arm: towards - bent, elbow };
}

/** The hips' height in a pose: its seat, or where its lowest foot or knee puts them. */
const hipsOf = (p: Pose) => p.seat ?? groundedHips(p);

/**
 * Puts a hand at a point given from the feet (ahead, up), for the pose's own hips and lean: the right hand, or
 * the left with `side` 0.
 */
function handTo(p: Pose, ahead: number, up: number, side: 0 | 1 = 1, k = 1): void {
  const hips = hipsOf(p);
  const shoulderAhead = Math.sin(p.lean) * SHOULDER;
  const shoulderUp = hips + Math.cos(p.lean) * SHOULDER;
  const r = reachFor(ahead - shoulderAhead, up - shoulderUp);
  // The arm hangs from the leaning spine, whose own "down" points back as it leans forward: its swing is counted
  // from there, so the lean is added to it.
  const arm = r.arm + p.lean;
  if (side === 1) {
    p.armR += (arm - p.armR) * k;
    p.elbowR += (r.elbow - p.elbowR) * k;
  } else {
    p.armL += (arm - p.armL) * k;
    p.elbowL += (r.elbow - p.elbowL) * k;
  }
}

/** The wrist before an action changes the torso: its path starts from the stance's actual hand. */
function handFrom(p: Pose, side: 0 | 1): { ahead: number; up: number } {
  const arm = (side === 0 ? p.armL : p.armR) - p.lean;
  const elbow = arm + (side === 0 ? p.elbowL : p.elbowR);
  return {
    ahead: Math.sin(p.lean) * SHOULDER + Math.sin(arm) * UPPER + Math.sin(elbow) * FORE,
    up: hipsOf(p) + Math.cos(p.lean) * SHOULDER - Math.cos(arm) * UPPER - Math.cos(elbow) * FORE,
  };
}

/** Solve the arm along a hand-space path, so the elbow follows the hand instead of flinging a held prop. */
function handAlong(p: Pose, from: { ahead: number; up: number }, ahead: number, up: number, travel: number, lift: number, arc: number, side: 0 | 1): void {
  handTo(p, from.ahead + (ahead - from.ahead) * travel, from.up + (up - from.up) * lift + Math.sin(Math.PI * lift) * arc, side);
}

/** Where a standing adult's chest is, from the feet: the hands come here to hold something before them. */
const CHEST = 3.55;

/** The body sitting on a chair, its feet flat on the floor in front of it whatever the length of its legs. */
export function sitting(p: Pose, legs?: Legs, seat?: number): Pose {
  seated(p, legs, seat);
  p.lean = 0.12;
  handTo(p, 1.0, 2.15, 0);
  handTo(p, 1.0, 2.15, 1);
  return p;
}

/**
 * One knee on the ground, the other foot planted: the giant comes down to Elof's height. It is where going down on a knee
 * ends (art/blender/motion.py CLIPS.kneel), on the body's own legs, the feet as far apart as it stands.
 */
export function kneeling(p: Pose, legs: Legs = REHEARSAL_LEGS, role?: Role): Pose {
  return kneelPose(CLIPS.kneel, CLIPS.kneel.seconds, legs, p, STANDS[role ?? 'pappa'].width);
}

/**
 * Down in a crouch, the hips back over the heels, the trunk forward and the hands on the knees: where going down into a
 * crouch ends (art/blender/motion.py CLIPS.crouch), on the body's own legs.
 */
export function crouching(p: Pose, legs: Legs = REHEARSAL_LEGS, role?: Role): Pose {
  return crouchPose(CLIPS.crouch, CLIPS.crouch.seconds, legs, p, STANDS[role ?? 'pappa'].width);
}

const LEGGED = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR'] as const;
/**
 * A gesture keyed in Blender (./motion-data.ts CLIPS) at `t` seconds over the stance under it: what it keys of the body,
 * and its legs and hop only standing (sitting, kneeling or crouching keeps its legs where they are).
 */
function gesture(clip: Clip, t: number, out: Pose, standing: boolean, energy = 1): Pose {
  const kept = LEGGED.map((joint) => out[joint]);
  play(clip, t, out);
  out.bounce = standing && clip.bounce ? sample(clip.bounce, t) * energy : 0;
  if (!standing) LEGGED.forEach((joint, i) => { out[joint] = kept[i]!; });
  // Someone with more go in them flings their arms further.
  if (energy !== 1) for (const joint of FLUNG) if (clip[joint]) out[joint] = STANDING[joint] + (out[joint] - STANDING[joint]) * energy;
  return out;
}
const FLUNG = ['armL', 'armR', 'outL', 'outR'] as const;

/**
 * When a gesture that ends is over, in the person's own time (seconds × their tempo), they stand again as they stand
 * (./gait.ts stand): breathing, the weight going over, looking about. Over BACK seconds.
 */
const ENDS: Partial<Record<Act, number>> = { wave: 2.4, nod: 1.1, shrug: 1.0, startle: 1.3, gasp: 1.6, cheer: 1.6 };
const BACK = 0.7;
const standingAfter: Pose = { ...STANDING };

/**
 * The pose an act asks for at its moment. `stance` is what the body does under an act that only uses its arms
 * or its head: sitting, kneeling, crouching or standing, which the stage keeps from the acts before.
 */
export function actPose(act: Act, c: ActContext, out: Pose, stance: Stance = 'stand'): Pose {
  actOf(act, c, out, stance);
  if (!c.calm) live(act, c, out, stance);
  const end = ENDS[act];
  if (end === undefined || stance !== 'stand' || c.calm) return out;
  const k = smooth((Math.max(0, c.t) * timing(c.role) - end) / BACK);
  if (k <= 0) return out;
  actOf('stand', c, standingAfter, 'stand');
  if (k >= 1) return Object.assign(out, standingAfter);
  for (const key in STANDING) {
    if (key === 'seat' || key === 'floor') continue;
    const joint = key as Exclude<keyof Pose, 'seat' | 'floor' | 'yawL' | 'yawR'>;
    out[joint] += (standingAfter[joint] - out[joint]) * k;
  }
  return out;
}

/**
 * The acts held long enough to stand under (a gesture, something shown, pointed at, shone on, held out or reached for, a
 * kneel or a crouch): the body goes on living under them. A sip keeps still for the mug at the lips.
 */
const LIVES: readonly Act[] = ['point', 'show', 'shine', 'offer', 'reach', 'lift', 'gasp', 'wave', 'cheer', 'shrug', 'hug', 'nod',
  'startle', 'eat', 'blow', 'hands', 'paint', 'sneak', 'kneel', 'crouch', 'shy'];
/** Acts with legs of their own standing: a cheer's bounce, a low reach's bent knees. */
const OWN_LEGS: readonly Act[] = ['cheer', 'reach'];
/** The arms an act leaves hanging (left, right). */
const FREE: Partial<Record<Act, readonly [boolean, boolean]>> = {
  wave: [true, false], nod: [true, true], shine: [true, false], offer: [true, false], paint: [true, false],
};
/** How much of how they stand goes on under a held act: a little less than standing idle. */
const UNDER = 0.7;
const life: Pose = { ...STANDING };
const LEGS_UNDER = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'sway', 'hipRoll'] as const;
const ARM_L = ['armL', 'elbowL', 'wristL', 'outL'] as const, ARM_R = ['armR', 'elbowR', 'wristR', 'outR'] as const;

/**
 * Under a held act the body goes on living (Olov, 9 November 2026): it breathes, its weight goes over from one foot to the
 * other with the hips and the trunk bending against them, the shoulders turning a little against the hips, and an arm the
 * act leaves free hangs as it hangs standing (./gait.ts stand), all as far as the act lets it: legs it keys stay its own,
 * and so do the head's turn and nod where the act looks at something. On a knee or in a crouch the trunk does the same,
 * the hips staying where they are.
 */
function live(act: Act, c: ActContext, out: Pose, under: Stance): void {
  // Kneeling and crouching are their own stance, whatever the one before.
  const stance = act === 'kneel' || act === 'crouch' ? act : under;
  if (stance === 'sit' || !LIVES.includes(act)) return;
  const stander = STANDS[c.role ?? 'pappa'], clock = c.clock ?? c.t;
  stand(life, clock, stander, c.legs, false, UNDER);
  const breath = breathing(clock, stander) * UNDER;
  if (stance === 'stand') {
    // The legs and the weight over them, unless the act has legs of its own.
    if (!OWN_LEGS.includes(act)) for (const joint of LEGS_UNDER) out[joint] = life[joint];
    // A free arm hangs, breathing, out from the body as the hip goes out.
    const free = FREE[act];
    if (free?.[0]) for (const joint of ARM_L) out[joint] = life[joint];
    if (free?.[1]) for (const joint of ARM_R) out[joint] = life[joint];
    out.lean += life.lean;
  } else if (act !== 'kneel' && act !== 'crouch') out.lean += stander.deep * breath;
  // The trunk bends against the hips and the head tilts against it, the shoulders turning a little against the weight.
  const k = stance === 'stand' ? 1 : 0.5;
  out.bendSide += life.bendSide * k;
  out.tilt += life.tilt * k;
  out.twist += 0.3 * life.sway * k;
  // A breath lifts the chest and the head stays level: the kneel and the crouch breathe already.
  if (act !== 'kneel' && act !== 'crouch') out.nod -= stander.deep * 0.7 * breath;
}

/** An easy walk, in the body's own heights a second, where a scene or a follower says nothing faster. */
export const EASY_GAIT = 0.6;

/**
 * How far one step goes at a gait, for a body `height` tall with legs `legs`: longer as it goes faster, as people's steps
 * are, and fitted to the leg (./gait.ts stepOf). The stride counts steps of this length, so the planted foot stays put.
 */
export function stepLength(gait: number, height: number, legs: Legs = REHEARSAL_LEGS): number {
  return stepOf(gait, legs) * height;
}

/**
 * A stride (./gait.ts), each person's own walk and run, authored in Blender (./motion-data.ts): from about three leg lengths
 * a second it becomes a run. Someone not of the family walks as Pappa does.
 */
function walking(p: Pose, c: ActContext): Pose {
  const gait = c.gait ?? EASY_GAIT, legs = c.legs ?? REHEARSAL_LEGS;
  const run = smooth((gait / legs.hip - 2.15) / 1.1), step = c.step ?? stepOf(gait, legs), strider = GAITS[c.role ?? 'pappa'];
  return c.feet ? c.feet.footing.stride(p, c.stride * Math.PI, step, c.pace, run, strider, legs, c.calm, c.feet)
    : stride(p, c.stride * Math.PI, step, c.pace, run, strider, legs, c.calm);
}

/** The head turned up or down at what is aimed at. */
function look(p: Pose, c: ActContext, k = 1): void {
  if (!c.aim) return;
  const eyes = hipsOf(p) + SHOULDER + 0.55;
  const nod = -Math.atan2(c.aim.up - eyes, Math.max(.6, Math.hypot(c.aim.ahead, c.aim.side ?? 0))) - p.lean * .6;
  p.nod += (Math.max(-0.55, Math.min(0.8, nod)) - p.nod) * k;
  const turn = Math.atan2(c.aim.side ?? 0, Math.max(.2, c.aim.ahead));
  p.turn += (Math.max(-.7, Math.min(.7, turn)) - p.turn) * k;
}

/** The act itself at its moment (actPose, above, hands a finished gesture back to standing). */
function actOf(act: Act, c: ActContext, out: Pose, stance: Stance): Pose {
  Object.assign(out, STANDING);
  const loop = c.calm ? 0 : 1;
  // A reduced-motion act holds its completed, readable pose; authored keys still decide when acts change.
  const t = c.calm ? 3 : Math.max(0, c.t);
  const r = t * timing(c.role), energy = weight(c.role);
  const under = () => (stance === 'sit' ? sitting(out, c.legs, c.seat) : stance === 'kneel' ? kneeling(out, c.legs, c.role)
    : stance === 'crouch' ? crouching(out, c.legs, c.role) : out);
  switch (act) {
    case 'stand':
    case 'watch':
    case 'look': {
      // Someone standing breathes, shifts their weight from one leg to the other and looks about, as they do (./gait.ts).
      if (stance === 'stand') stand(out, c.clock ?? c.t, STANDS[c.role ?? 'pappa'], c.legs, c.calm);
      else under();
      look(out, c);
      return out;
    }
    case 'walk':
      return walking(out, c);
    case 'sit':
      sitting(out, c.legs, c.seat);
      look(out, c);
      return out;
    case 'carve': {
      sitting(out, c.legs, c.seat);
      const carving = carvingAt(c.t, c.calm);
      out.nod = carving.nod;
      out.lean = carving.lean;
      handTo(out, carving.left.ahead, carving.left.up, 0);
      handTo(out, carving.right.ahead, carving.right.up, 1);
      return out;
    }
    case 'draw': {
      sitting(out, c.legs, c.seat);
      const pen = drawingAt(c.t, c.calm, c.role);
      out.nod = .55 - .18 * pen.inspect;
      out.lean = .3 - .055 * pen.inspect;
      handTo(out, 1.35, 1.75, 0);
      handTo(out, 1.55 + pen.ahead, 1.78 + pen.lift, 1);
      return out;
    }
    case 'sip': {
      under();
      const sip = sippingAt(c.t, c.calm, c.role), up = sip.raise;
      const hips = hipsOf(out);
      handTo(out, .55 - .08 * up, hips + 1.2 + .75 * up, 0);
      out.nod = -.08 * sip.tilt;
      look(out, c, 1 - up);
      return out;
    }
    case 'sneak': {
      under();
      out.lean = 0.3 * rise(t, 0.8);
      const creep = rise(t, 1.6);
      const target = c.aim ?? { ahead: 1.8, up: 2.2 };
      handTo(out, 0.6 + (target.ahead - 0.6) * creep, 2.6 + (target.up - 2.6) * creep, 1);
      out.armL = 0.3;
      out.elbowL = 0.9;
      look(out, c);
      return out;
    }
    case 'kneel': {
      // Down on a knee the way people go down (art/blender/motion.py CLIPS.kneel), on the body's own legs: the weight over,
      // a foot forward, and down onto the other knee, looking where the feet go and then up at what they came down to.
      // Down, they breathe. Reduced motion: kneeling.
      const clip = CLIPS.kneel, stander = STANDS[c.role ?? 'pappa'];
      kneelPose(clip, Math.min(t, clip.seconds), c.legs ?? REHEARSAL_LEGS, out, stander.width);
      if (!c.calm) {
        const breath = Math.sin(Math.PI * 2 * stander.breath * (c.clock ?? c.t)) * rise(t - clip.seconds * 0.8, 0.6);
        out.lean += stander.deep * breath;
        out.nod -= stander.deep * 0.7 * breath;
      }
      look(out, c, rise(t - clip.seconds * 0.45, clip.seconds * 0.5));
      return out;
    }
    case 'crouch': {
      // Down into a crouch the way people go down (art/blender/motion.py CLIPS.crouch), on the body's own legs: the hips
      // back and down over the feet, the trunk forward, the hands to the knees, looking down and then at what they came
      // down to. Down, they breathe. Reduced motion: crouching.
      const clip = CLIPS.crouch, stander = STANDS[c.role ?? 'pappa'];
      crouchPose(clip, Math.min(t, clip.seconds), c.legs ?? REHEARSAL_LEGS, out, stander.width);
      if (!c.calm) {
        const breath = Math.sin(Math.PI * 2 * stander.breath * (c.clock ?? c.t)) * rise(t - clip.seconds, 0.6);
        out.lean += stander.deep * breath;
        out.nod -= stander.deep * 0.7 * breath;
      }
      look(out, c, rise(t - clip.seconds * 0.4, clip.seconds * 0.5));
      return out;
    }
    case 'gasp': {
      // Keyed in Blender (art/blender/motion.py CLIPS.gasp): the hands drop a moment, then fly up to the mouth, the right
      // a moment before the left, a little past, the head and the chest going back with a start; and they come down a
      // little as the breath goes out. Reduced motion: the hands at the mouth.
      under();
      const clip = CLIPS.gasp, at = c.calm ? clip.seconds * .4 : r;
      const hips = hipsOf(out);
      out.lean += sample(clip.lean!, at);
      handTo(out, 0.42, hips + SHOULDER + 0.45, 0, sample(clip.mouthL!, at));
      handTo(out, 0.42, hips + SHOULDER + 0.4, 1, sample(clip.mouthR!, at));
      out.tilt = sample(clip.tilt!, at);
      out.bounce = loop * sample(clip.bounce!, at) * energy;
      look(out, c);
      out.nod += loop * sample(clip.nod!, at);
      return out;
    }
    case 'point': {
      // Keyed in Blender (art/blender/motion.py CLIPS.point): the hand draws back a moment, then goes out along the line to
      // what the scene points at, a little past and back, the trunk leaning into it, the other arm swinging back a little
      // (standing); held. Reduced motion: pointing.
      under();
      const clip = CLIPS.point, at = c.calm ? clip.seconds : t;
      const target = c.aim ?? { ahead: 6, up: CHEST };
      const hips = hipsOf(out);
      out.lean += sample(clip.lean!, at);
      if (stance === 'stand') { out.armL = sample(clip.armL!, at); out.elbowL = sample(clip.elbowL!, at); }
      // Straight at it: the hand in line with the forearm, as far as the arm reaches along the line to it.
      out.wristR = 0;
      const shoulderAhead = Math.sin(out.lean) * SHOULDER, shoulderUp = hips + Math.cos(out.lean) * SHOULDER;
      const dx = target.ahead - shoulderAhead, dy = target.up - shoulderUp;
      const far = Math.hypot(dx, dy) || 1;
      handTo(out, shoulderAhead + dx / far * 1.7, shoulderUp + dy / far * 1.7, 1, sample(clip.aim!, at));
      look(out, c, rise(t, .16));
      return out;
    }
    case 'wave': {
      // Keyed in Blender (art/blender/motion.py CLIPS.wave): the arm dips back, swings up and out beside the head past
      // where it stops, and the forearm waves from the elbow with the hand a moment late; then it comes down and hangs.
      // Reduced motion: the hand up, still.
      under();
      gesture(CLIPS.wave, c.calm ? CLIPS.wave.seconds * .3 : r, out, stance === 'stand', energy);
      if (c.calm) { out.elbowR = .55; out.wristR = 0; }
      look(out, c);
      return out;
    }
    case 'cheer': {
      // Keyed in Blender (art/blender/motion.py CLIPS.cheer): down into the knees, both arms flung up and out in a V with
      // the hands open, two hops, and down again. Reduced motion: the arms up, held, and no hop.
      under();
      gesture(CLIPS.cheer, c.calm ? CLIPS.cheer.seconds * .4 : r, out, stance === 'stand');
      out.bounce *= loop * energy;
      return out;
    }
    case 'shine': {
      // A lamp held out before them towards what they look for: the elbow bent and the hand a little under the
      // shoulder, as one holds a light up to see by, not a straight arm pointing.
      under();
      const target = c.aim ?? { ahead: 6, up: CHEST };
      const hips = hipsOf(out);
      const k = rise(t, 0.35);
      out.lean += 0.04 * k;
      const shoulderAhead = Math.sin(out.lean) * SHOULDER, shoulderUp = hips + Math.cos(out.lean) * SHOULDER;
      const dx = target.ahead - shoulderAhead, dy = target.up - shoulderUp;
      const far = Math.hypot(dx, dy) || 1;
      handTo(out, shoulderAhead + dx / far * 1.15, shoulderUp - 0.2 + dy / far * 0.5, 1, k);
      look(out, c, rise(t, .16));
      return out;
    }
    case 'offer':
    case 'reach':
    case 'lift': {
      under();
      const target = c.aim ?? { ahead: 1.6, up: CHEST };
      const fromR = handFrom(out, 1), fromL = handFrom(out, 0);
      const k = rise(t, act === 'lift' ? 1.1 : 0.5);
      const hips = hipsOf(out);
      const low = Math.max(0, hips + 0.4 - target.up);
      // A low standing reach shares the work with the knees; seated and kneeling contacts retain their stance.
      if (act === 'reach' && stance === 'stand') {
        const bend = Math.min(1, low / 2) * rise(t, 0.3);
        out.legL = out.legR = 0.5 * bend;
        out.kneeL = out.kneeR = 0.85 * bend;
      }
      out.lean += (act === 'reach' ? Math.min(0.8, 0.2 + low * 0.35) : act === 'lift' ? stance === 'kneel' ? 0 : 0.15 : 0.1) * k;
      if (act === 'reach' && target.ahead > 0) {
        // Bring the shoulder close enough to the object, rather than holding a fully stretched hand short of it.
        const up = target.up - hipsOf(out), far = Math.hypot(target.ahead, up);
        const reach = UPPER + FORE - 0.08;
        const angle = Math.acos(Math.max(-1, Math.min(1, (far * far + SHOULDER * SHOULDER - reach * reach) / (2 * far * SHOULDER))));
        out.lean = Math.max(out.lean, Math.min(stance === 'kneel' ? 1.45 : 0.8, Math.atan2(target.ahead, up) - angle) * k);
      }
      // Lift close to the body before extending; offering clears the lap, reaching takes a smaller curved path.
      const lifted = act === 'lift' ? rise(t, 0.85) : k;
      handAlong(out, fromR, target.ahead, target.up, k, lifted, act === 'offer' ? 0.3 : 0.14, 1);
      if (act !== 'offer') {
        const support = rise(t - 0.08, act === 'lift' ? 1.02 : 0.42);
        handAlong(out, fromL, target.ahead - 0.15, target.up - 0.1, support, support, 0.1, 0);
      }
      out.nod = (act === 'offer' ? 0.18 : Math.min(0.7, 0.25 + low * 0.2)) * k;
      look(out, c, rise(t, .18));
      return out;
    }
    case 'show': {
      // Something held up in both hands, at the height of the face, for others to see. Keyed in Blender
      // (art/blender/motion.py CLIPS.show): the hands dip a moment, then lift it, rising a moment ahead of coming out, a
      // little past and back, the chest up and the head back behind it, turned a little to the others. Reduced motion:
      // held up.
      under();
      const clip = CLIPS.show, at = c.calm ? clip.seconds : t;
      const hips = hipsOf(out);
      const fromR = handFrom(out, 1), fromL = handFrom(out, 0);
      const k = sample(clip.up!, at), lifted = sample(clip.up!, at + .08);
      out.lean += sample(clip.lean!, at);
      handAlong(out, fromL, 1.05, hips + SHOULDER + .22, k, lifted, .2, 0);
      handAlong(out, fromR, 1.05, hips + SHOULDER + .22, k, lifted, .2, 1);
      out.nod = sample(clip.nod!, at);
      out.twist += sample(clip.twist!, at);
      return out;
    }
    case 'eat': {
      under();
      const bite = eatingAt(c.t, c.calm), hips = hipsOf(out);
      out.nod = -.08 + .12 * bite.swallow;
      handTo(out, 1.05 - .62 * bite.mouth, hips + SHOULDER + .22 + .12 * bite.mouth, 1);
      handTo(out, 1.05 - .3 * bite.mouth, hips + SHOULDER + .22 - .42 * bite.mouth, 0);
      return out;
    }
    case 'blow': {
      under();
      out.nod = 0.25;
      out.lean += 0.2;
      const hips = hipsOf(out);
      handTo(out, 0.75, hips + SHOULDER + 0.35, 0);
      handTo(out, 0.8, hips + SHOULDER + 0.3, 1);
      // A breath in, and out over the piece.
      out.lean += loop * 0.1 * Math.sin(Math.min(1, t / 0.8) * Math.PI);
      return out;
    }
    case 'shrug': {
      // Keyed in Blender (art/blender/motion.py CLIPS.shrug): the forearms up and out with the palms turning up, the head
      // tipping a moment after them (who knows?), and down again, settling. Reduced motion: the shrug, held.
      under();
      return gesture(CLIPS.shrug, c.calm ? CLIPS.shrug.seconds * .4 : r, out, stance === 'stand');
    }
    case 'hug': {
      // Keyed in Blender (art/blender/motion.py CLIPS.hug): the arms open wide, then round the one hugged at the chest, a
      // squeeze, and held. Reduced motion: the hug, held.
      under();
      return gesture(CLIPS.hug, c.calm ? CLIPS.hug.seconds : r, out, stance === 'stand');
    }
    case 'nod': {
      // Keyed in Blender (art/blender/motion.py CLIPS.nod), on top of where they look: up a little first, down, and a
      // smaller second nod, the trunk going with it. Reduced motion: the head bowed a little, held.
      under();
      look(out, c);
      const clip = CLIPS.nod;
      out.nod += c.calm ? .18 : energy * sample(clip.nod!, r);
      out.tilt = c.calm ? .05 : sample(clip.tilt!, r);
      out.lean += c.calm ? 0 : sample(clip.lean!, r);
      return out;
    }
    case 'startle': {
      // Keyed in Blender (art/blender/motion.py CLIPS.startle): the arms fly up and open past where they stop, the head and
      // trunk jerk back with a hop, and it all comes down, the trunk forward past upright before it settles. Reduced
      // motion: the hands up, open, still.
      under();
      gesture(CLIPS.startle, c.calm ? CLIPS.startle.seconds * .3 : r, out, stance === 'stand', energy);
      out.bounce *= loop;
      look(out, c);
      return out;
    }
    case 'stomp': {
      under();
      // A foot comes up and down, hard: cross, and sure of himself.
      const lift = loop * pulse(r, .06, .18, .03, .12);
      const impact = loop * pulse(r, .39, .05, 0, .22);
      out.legR = 0.9 * lift;
      out.kneeR = 1.1 * lift + .15 * impact; out.kneeL = .12 * impact;
      out.armL = out.armR = -0.25;
      out.elbowL = out.elbowR = 0.5;
      out.lean = .16 + .045 * impact;
      out.nod = -0.1;
      return out;
    }
    case 'hands': {
      under();
      const k = rise(t, 0.4);
      out.lean = 0.12 * k;
      const hips = hipsOf(out);
      handTo(out, 0.7, hips + SHOULDER - 0.3, 0, k);
      handTo(out, 0.75, hips + SHOULDER - 0.25, 1, k);
      out.nod = 0.65 * k;
      return out;
    }
    case 'dress': {
      // Putting on the raincoat and the boots, each in their own way (art/blender/motion.py, DRESSING in ./rain-gear.ts),
      // the gear going on in step with it; from under it and after it, standing as they stand. Reduced motion: standing,
      // the gear on at once.
      stand(out, c.clock ?? c.t, STANDS[c.role ?? 'pappa'], c.legs, c.calm);
      if (c.calm) return out;
      const clip: Clip = CLIPS[DRESSING[c.role ?? 'pappa']];
      const k = 1 - smooth((t - clip.seconds) / DRESSED);
      if (k <= 0) return out;
      play(clip, Math.min(t, clip.seconds), Object.assign(dressing, out));
      for (const joint of JOINTS) out[joint] += (dressing[joint] - out[joint]) * k;
      return out;
    }
    case 'shy': {
      // A little shy (Moa, when Pappa reads her drawing out and Elof looks at it; Olov, 13 November 2026: "Sen skäms Moa
      // litegrann av pappa och Elof"): she lifts what she showed up in front of her face and hides behind it (the stage
      // holds it there, ./drawing-hold.ts), her head a little down and to the side so that her eyes peek over its top at
      // them, and she sways on her feet, the shoulders twisting from side to side, as long as it lasts. Reduced motion:
      // hidden behind it, still.
      under();
      const k = c.calm ? 1 : rise(t, .6), hips = hipsOf(out);
      const sway = c.calm ? 0 : Math.sin((c.clock ?? c.t) * 2.2);
      handTo(out, .8, hips + SHOULDER - .3, 0, k);
      handTo(out, .8, hips + SHOULDER - .3, 1, k);
      out.nod += (.12 - out.nod) * k;
      out.tilt += .22 * k;
      out.turn += (.15 - out.turn) * k;
      out.twist += .12 * sway * k;
      out.bendSide += .035 * sway * k;
      return out;
    }
    case 'paint': {
      under();
      const target = c.aim ?? { ahead: 1.2, up: 1.8 };
      const dab = loop * .08 * pulse(r % 2.6, .2, .3, .5, .55);
      out.lean = 0.2;
      handTo(out, target.ahead + dab, target.up, 1);
      look(out, c);
      return out;
    }
    default:
      // The ghost's acts are its own (src/render/stage.ts): a person asked for one just stands there.
      look(under(), c);
      return out;
  }
}

/** The stance an act leaves for the acts after it that only use arms and head. */
export function stanceOf(act: Act, before: Stance): Stance {
  if (act === 'sit' || act === 'carve' || act === 'draw') return 'sit';
  if (act === 'kneel') return 'kneel';
  if (act === 'crouch') return 'crouch';
  if (act === 'walk' || act === 'stand' || act === 'stomp' || act === 'sneak' || act === 'cheer' || act === 'dress') return 'stand';
  return before;
}
