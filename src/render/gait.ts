import { JOINTS, REHEARSAL_LEGS, STANDING, type Legs, type Pose } from './rig';

/**
 * The stride (plan §5.6 point 3): how a body walks and runs, in the pose language of ./rig.ts. Pure: no three, no clock.
 *
 * The feet are placed, and the legs reach them (two-bone IK on each body's own measures, `Rig.legs`): a foot strikes with its
 * heel, rolls flat, lifts its heel about the ball of the foot and pushes off, swings through clear of the ground, and is put
 * down where the next step needs it. A planted foot stays where it was put down, on any body and at any step, because the
 * legs are fitted to it rather than swung by a fixed angle. The hips ride over the feet, lowest as the weight comes onto a
 * foot; they shift over the standing foot and tip away from the swinging one, and the trunk, the head and the arms go with
 * it. How each person does all that is their own, authored in Blender (art/blender/motion.py) as `Gait`s in ./motion-data.ts.
 */

/** A periodic curve as its Fourier series: [mean, cos 1, sin 1, cos 2, sin 2, …]. */
export type Series = readonly number[];

/** One gait of one person: a walk or a run (art/blender/motion.py). Lengths are shares of the body's height. */
export interface Gait {
  /** The share of a stride each foot is on the ground: over half in a walk (both feet are down between steps), under in a run. */
  stance: number;
  /** How far ahead of the middle of its stance a foot comes down. */
  ahead: number;
  /** How far out from the middle each foot goes down. */
  width: number;
  /** How high the ankle rises through the swing, over its straight way, and where in the swing it is highest (0 to 1). */
  lift: number;
  peak: number;
  /** How much lower than standing the hips go, a share of their height, and their rise and fall over the stride. */
  crouch: number;
  bob: Series;
  /** How far the knee of a foot that has just come down gives under the weight, over its own cycle from its heel strike. */
  give: Series;
  /** The foot's tip to the ground over its own cycle, from its heel strike (toes up +). */
  pitch: Series;
  /** The rest of the body over the stride: the hips' shift (a share of the height), their roll, the trunk's twist, lean and
   * side-bend, the head's nod and tilt, and the left arm, elbow and wrist (the right ones half a stride later). */
  sway: Series;
  roll: Series;
  twist: Series;
  lean: Series;
  side: Series;
  nod: Series;
  tilt: Series;
  arm: Series;
  elbow: Series;
  wrist: Series;
  /** The arms held out from the sides. */
  spread: number;
}

/** A person's walk and run. */
export interface Strider { walk: Gait; run: Gait }

/** How far a planted foot may be from where the stride would put it, in leg lengths, before it is taken to have been put
 * somewhere else (a cut). */
const DRIFT = 0.5;
/** How far the hips may come down below the stride's own height for a foot to reach the ground, in leg lengths. */
const SINK = 0.06;
/** How long the last step takes, closing the feet as the body stops, in seconds. */
const CLOSING = 0.32;

const TAU = Math.PI * 2;
const LEGS = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR'] as const;
const frac = (x: number) => x - Math.floor(x);
const clamp = (x: number, low: number, high: number) => Math.min(high, Math.max(low, x));
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A Fourier series at `x` radians. */
export function wave(series: Series, x: number): number {
  let value = series[0] ?? 0;
  for (let k = 1; 2 * k <= series.length; k++) value += series[2 * k - 1]! * Math.cos(k * x) + (series[2 * k] ?? 0) * Math.sin(k * x);
  return value;
}

/**
 * How long a step is at `gait` (the body's own heights a second), in its heights, for legs `legs`: longer as it goes
 * faster, as people's are, and fitted to the leg, so that a short-legged body takes more, shorter steps than a long-legged
 * one going as fast. Near a stop the steps shorten to nothing.
 */
export function stepOf(gait: number, legs: Legs = REHEARSAL_LEGS): number {
  const g = Math.max(gait, 0), leg = legs.hip;
  // In leg lengths: about three quarters of a leg at an easy walk, more running.
  const share = 0.36 + 0.27 * Math.min(g / leg, 4.2);
  return Math.min(share * leg, 2.4 * g);
}

/** The ankle of a foot flat on the ground `x` ahead of the hips, tipped `pitch` about its heel (toes up) or its ball (heel up). */
function rolled(x: number, pitch: number, legs: Legs, out: { x: number; y: number }): { x: number; y: number } {
  const cos = Math.cos(pitch), sin = Math.sin(pitch);
  if (pitch >= 0) {
    out.x = x - legs.heel + legs.heel * cos - legs.ankle * sin;
    out.y = legs.heel * sin + legs.ankle * cos;
  } else {
    out.x = x + legs.toe - legs.toe * cos - legs.ankle * sin;
    out.y = -legs.toe * sin + legs.ankle * cos;
  }
  return out;
}

/** How far below the ankle the lowest of the heel and the ball of a foot tipped `pitch` is. */
const under = (pitch: number, legs: Legs) =>
  Math.max(legs.heel * Math.sin(pitch) + legs.ankle * Math.cos(pitch), -legs.toe * Math.sin(pitch) + legs.ankle * Math.cos(pitch));

/** Where one foot's ankle is over a stride, ahead of the hips and over the ground, and how it is tipped: in `out`. */
interface Foot { x: number; y: number; pitch: number; on: number; flat: number | null; c: number }

const blended = (walk: Gait, run: Gait, k: number) => (pick: (g: Gait) => number) => pick(walk) + (pick(run) - pick(walk)) * k;
const curve = (walk: Gait, run: Gait, k: number) => (pick: (g: Gait) => Series, x: number) =>
  k <= 0 ? wave(pick(walk), x) : k >= 1 ? wave(pick(run), x) : wave(pick(walk), x) * (1 - k) + wave(pick(run), x) * k;

const start = { x: 0, y: 0 }, end = { x: 0, y: 0 };
/**
 * One foot at `c` of its own cycle (0 its heel strike), for steps of `step` (heights). `on`: how much it bears the body.
 * `flat`: where the foot stands flat, ahead of the hips, if it has been kept there (a `Footing`), and `left`: where it was
 * when it left the ground.
 */
function foot(c: number, step: number, at: (pick: (g: Gait) => number) => number, pitchAt: (c: number) => number, legs: Legs,
  pace: number, out: Foot, flat: number | null = null, left: number | null = null, raise = 0): Foot {
  const stance = at((g) => g.stance), ahead = at((g) => g.ahead) * pace;
  out.c = c;
  out.flat = c < stance ? flat ?? step * (stance - 2 * c) + ahead : null;
  if (out.flat !== null) {
    // On the ground: flat where it came down, going back under the hips as fast as they go on.
    out.pitch = pitchAt(c);
    rolled(out.flat, out.pitch, legs, out);
    out.y += raise;
    // It bears the body from just before its heel comes down to just after its toe leaves.
    out.on = 1;
    return out;
  }
  // In the air: from where its toe left to where its heel comes down next, as fast as the ground at both ends, and up.
  const w = (c - stance) / (1 - stance);
  out.pitch = pitchAt(c);
  rolled(left ?? -step * stance + ahead, pitchAt(stance), legs, start);
  rolled(step * stance + ahead, pitchAt(1), legs, end);
  const speed = -2 * step * (1 - stance), w2 = w * w, w3 = w2 * w;
  out.x = (2 * w3 - 3 * w2 + 1) * start.x + (w3 - 2 * w2 + w) * speed + (-2 * w3 + 3 * w2) * end.x + (w3 - w2) * speed;
  const peak = clamp(at((g) => g.peak), 0.15, 0.85), bend = Math.log(0.5) / Math.log(peak);
  const rise = Math.sin(Math.PI * Math.pow(w, bend)) ** 2;
  // However short the step, the foot is lifted to make it, never dragged: a share of the way it goes, at least.
  const lift = Math.max(at((g) => g.lift) * pace, Math.abs(end.x - start.x) * 0.22);
  out.y = start.y + (end.y - start.y) * w + lift * rise;
  // Never through the ground: the heel or the ball clear of it.
  out.y = Math.max(out.y, under(out.pitch, legs));
  out.on = 1 - smooth(w / 0.16) * (1 - smooth((w - 0.84) / 0.16));
  return out;
}

const left: Foot = { x: 0, y: 0, pitch: 0, on: 0, flat: null, c: 0 }, right: Foot = { x: 0, y: 0, pitch: 0, on: 0, flat: null, c: 0 };

const rolling = { x: 0, y: 0 };
/** Tips a planted foot about its toe or heel, from its own pitch, until its ankle is within the leg's reach from `hipY`. */
function rollToReach(one: Foot, hipY: number, legs: Legs, most: number): void {
  const flat = one.flat!;
  const far = (pitch: number) => { rolled(flat, pitch, legs, rolling); return Math.hypot(rolling.x, hipY - rolling.y); };
  // The hips have been brought down for the feet that bear them: such a foot is just within reach, give or take a rounding.
  if (far(one.pitch) <= most * (1 + 1e-6)) return;
  // Behind the hips the heel lifts; ahead, the toes do.
  let near = one.pitch, limit = flat < 0 ? Math.min(one.pitch, -1.25) : Math.max(one.pitch, 0.9);
  if (far(limit) > most) near = limit;
  else for (let i = 0; i < 14; i++) {
    const mid = (near + limit) / 2;
    if (far(mid) > most) near = mid; else limit = mid;
  }
  one.pitch = far(near) <= most ? near : limit;
  rolled(flat, one.pitch, legs, one);
}

/** The thigh, knee and foot that put an ankle at (ahead, down, out) from the hip joint, tipped `pitch`, for `legs`. */
function reachWith(ahead: number, down: number, out: number, pitch: number, legs: Legs, pose: Pose, side: 0 | 1): void {
  const thigh = legs.thigh, shin = legs.shin;
  const far = clamp(Math.hypot(ahead, down, out), Math.abs(thigh - shin) + 1e-4, thigh + shin);
  const knee = Math.PI - Math.acos(clamp((thigh * thigh + shin * shin - far * far) / (2 * thigh * shin), -1, 1));
  const open = Math.acos(clamp((thigh * thigh + far * far - shin * shin) / (2 * thigh * far), -1, 1));
  const swing = Math.atan2(ahead, Math.hypot(down, out)) + open;
  const splay = Math.atan2(out, down);
  if (side === 0) { pose.legL = swing; pose.kneeL = knee; pose.footL = pitch - (swing - knee); pose.splayL = splay; }
  else { pose.legR = swing; pose.kneeR = knee; pose.footR = pitch - (swing - knee); pose.splayR = splay; }
}

/**
 * The pose a stride asks for at `phase` (π a step: the left heel comes down at 0, the right at π, so that a walk of whole
 * steps starts and ends with both feet on the ground), for steps of `step` (heights), at
 * `pace` (0 standing, 1 striding), `run` of the way from the walk to the run. `calm`: reduced motion, the legs go by the
 * ground but nothing bobs or sways. Writes the whole pose.
 */
export function stride(pose: Pose, phase: number, step: number, pace: number, run: number, strider: Strider, legs: Legs = REHEARSAL_LEGS, calm = false,
  kept?: Kept): Pose {
  Object.assign(pose, STANDING);
  const k = clamp(run, 0, 1), p = clamp(pace, 0, 1);
  const at = blended(strider.walk, strider.run, k), along = curve(strider.walk, strider.run, k);
  // Held by a footing, the steps are as long as the stride counts them (its last step brings the feet together), and the
  // pace grows and dies away the rest of the motion. On their own, the steps die away with it too.
  const still = calm ? 0 : 1, s = Math.max(0, step) * (kept ? 1 : p);
  // The feet: the left heel strikes at 0, the right half a stride later (π: a step).
  const pitch = (c: number) => along((g) => g.pitch, TAU * c) * p;
  foot(frac(phase / TAU), s, at, pitch, legs, p, left, kept?.flat[0], kept?.left[0], kept?.raise[0]);
  foot(frac((phase - Math.PI) / TAU), s, at, pitch, legs, p, right, kept?.flat[1], kept?.left[1], kept?.raise[1]);
  if (kept) { kept.now[0] = left.flat; kept.now[1] = right.flat; }
  // The hips: how high, how tipped. A foot that bears them must reach the ground from there: lower them as far as it needs.
  const roll = along((g) => g.roll, phase) * p * still;
  const lift = legs.width * Math.sin(roll);
  let hips = legs.hip * (1 - at((g) => g.crouch) * p) + along((g) => g.bob, phase) * p * still;
  const lowest = hips - legs.hip * SINK, stance = at((g) => g.stance), thigh = legs.thigh, shin = legs.shin;
  for (const [one, side] of [[left, 1], [right, -1]] as const) {
    // Never quite straight while striding (a straight knee turns too fast to follow), and straight standing.
    const most = (thigh + shin) * (1 - 0.002 * p);
    const reach = Math.max(lowest, one.y + Math.sqrt(Math.max(0, most * most - one.x * one.x)) - side * lift);
    if (hips > reach) hips -= (hips - reach) * one.on;
    // The foot that has just taken the weight: its knee gives, and the hips come down with it.
    if (one.flat === null || calm) continue;
    const give = Math.max(0, along((g) => g.give, TAU * one.c)) * p, loading = 1 - smooth((one.c - stance * 0.55) / (stance * 0.3));
    const far = Math.sqrt(thigh * thigh + shin * shin + 2 * thigh * shin * Math.cos(give));
    const bent = Math.max(lowest, one.y + Math.sqrt(Math.max(0, far * far - one.x * one.x)) - side * lift);
    if (hips > bent) hips -= (hips - bent) * loading;
  }
  // A planted foot too far behind (or ahead) for the leg to reach rolls up onto its toe (or back on its heel), and stays where
  // it is on the ground, rather than being dragged.
  for (const [one, side] of [[left, 1], [right, -1]] as const) {
    if (one.flat !== null) rollToReach(one, hips + side * lift, legs, (legs.thigh + legs.shin) * (1 - 0.002 * p));
  }
  // Where the feet go across: the gait's own track, from under the hips as it sets off.
  const out = (at((g) => g.width) - legs.width) * p;
  reachWith(left.x, hips + lift - left.y, out, left.pitch, legs, pose, 0);
  reachWith(right.x, hips - lift - right.y, out, right.pitch, legs, pose, 1);
  // Barely moving, the legs are those of standing: a nearly straight knee's angle is too touchy to settle there by itself.
  // (A footing's last step brings its feet together instead.)
  const settled = kept ? 1 : smooth(p / 0.04);
  if (settled < 1) for (const joint of LEGS) pose[joint] *= settled;
  // Off the ground in a run's flight: the hips are as high as the feet put them, and the rig stands the lowest foot down.
  const clear = Math.min(left.y - under(left.pitch, legs), right.y - under(right.pitch, legs));
  pose.bounce = Math.max(0, clear) * 5.2 * still;
  // The rest of the body, from standing, as far as the pace goes.
  const towards = (rest: number, value: number) => rest + (value - rest) * p;
  pose.sway = along((g) => g.sway, phase) * 5.2 * p * still;
  pose.hipRoll = roll;
  pose.twist = along((g) => g.twist, phase) * p;
  pose.lean = along((g) => g.lean, phase) * p;
  pose.bendSide = along((g) => g.side, phase) * p * still;
  pose.nod = along((g) => g.nod, phase) * p;
  pose.tilt = along((g) => g.tilt, phase) * p * still;
  pose.armL = towards(STANDING.armL, along((g) => g.arm, phase));
  pose.armR = towards(STANDING.armR, along((g) => g.arm, phase + Math.PI));
  pose.elbowL = towards(STANDING.elbowL, along((g) => g.elbow, phase));
  pose.elbowR = towards(STANDING.elbowR, along((g) => g.elbow, phase + Math.PI));
  pose.wristL = along((g) => g.wrist, phase) * p;
  pose.wristR = along((g) => g.wrist, phase + Math.PI) * p;
  pose.spread = at((g) => g.spread) * p;
  return pose;
}

/** What a `Footing` asks of the stride, and what it hears back: each foot's place flat ahead of the hips, if kept. */
interface Kept {
  flat: [number | null, number | null];
  left: [number | null, number | null];
  now: [number | null, number | null];
  /** A planted foot lifted to close up beside the other as the body stops. */
  raise: [number, number];
}

/**
 * Feet that stay where they were put down (the stride's foot lock). A stride on its own keeps a foot planted only while its
 * steps keep their length; setting off, slowing down and turning they change, and the foot would slide. A footing
 * remembers where in the world each foot came down, and holds it there until it lifts. Stopping, it brings a foot left
 * behind in beside the other with a last small step. One for each body that walks.
 */
export function createFooting() {
  const kept: Kept = { flat: [null, null], left: [null, null], now: [null, null], raise: [0, 0] };
  const world: [{ x: number; z: number } | null, { x: number; z: number } | null] = [null, null];
  const last: [number | null, number | null] = [null, null];
  const nominal = { ...STANDING };
  /** Whether the body has got going: only then does a dying pace mean that it stops. */
  let going = false;
  /** The last step, closing the feet: which foot, how far it has to come, and how far through it is. */
  let closing: { side: 0 | 1; by: number; done: number } | null = null;
  /** Setting off from standing: the feet stand where they stood, under the hips, and the first step is taken from there. */
  let fresh = true;
  return {
    /** Forget where the feet stood: the body has been put somewhere else, or has stood still for a while. */
    reset(): void {
      world[0] = world[1] = null; kept.flat = [null, null]; kept.left = [null, null]; last[0] = last[1] = null; going = false; closing = null;
      fresh = true;
    },
    /** Whether the last step is still under way: the stride should go on being drawn until it has closed the feet. */
    get settling(): boolean { return closing !== null && closing.done < 1; },
    /**
     * The stride (`stride`), with each planted foot held where it came down. `at`: where the body stands in the world (the
     * middle of its feet), which way it faces (`yaw`: ahead is (sin, cos) of it in x and z), how tall it is, and the
     * seconds since the last frame.
     */
    stride(pose: Pose, phase: number, step: number, pace: number, run: number, strider: Strider, legs: Legs,
      calm: boolean, at: { x: number; z: number; yaw: number; height: number; dt: number }): Pose {
      const ahead = { x: Math.sin(at.yaw), z: Math.cos(at.yaw) };
      // Where the stride on its own would put the feet now: which are on the ground, and where.
      kept.flat = [null, null]; kept.left = [last[0], last[1]]; kept.raise = [0, 0];
      stride(nominal, phase, step, pace, run, strider, legs, calm, kept);
      const planned = [kept.now[0], kept.now[1]] as const;
      for (const side of [0, 1] as const) {
        const flat = planned[side];
        if (flat === null) {
          // Lifted: it leaves from where it was last held (`last`), and is held again where it next comes down.
          world[side] = null;
          continue;
        }
        const held = world[side];
        const there = held ? ((held.x - at.x) * ahead.x + (held.z - at.z) * ahead.z) / at.height : fresh && pace < 0.3 ? 0 : flat;
        if (!held || Math.abs(there - flat) > legs.hip * DRIFT) {
          // Coming down (or put somewhere else, or standing as it sets off): it stands where the stride puts it.
          world[side] = { x: at.x + ahead.x * there * at.height, z: at.z + ahead.z * there * at.height };
          kept.flat[side] = there;
        } else kept.flat[side] = there;
        last[side] = kept.flat[side];
      }
      kept.left = [world[0] ? null : last[0], world[1] ? null : last[1]];
      fresh = false;
      // Stopping with both feet down, one left behind or ahead comes in beside the other: a last small step, lifted, not
      // slid. It ends where the stride puts it, which is under the hips as the pace dies away.
      if (pace > 0.6) going = true;
      const off = (side: 0 | 1) => world[side] && planned[side] !== null ? kept.flat[side]! - planned[side]! : 0;
      if (going && !closing && pace < 0.3 && world[0] && world[1]) {
        const side = Math.abs(off(0)) >= Math.abs(off(1)) ? 0 : 1;
        if (Math.abs(off(side)) > legs.hip * 0.04) closing = { side, by: off(side), done: 0 };
      }
      if (closing) {
        closing.done = Math.min(1, closing.done + Math.max(0, at.dt) / CLOSING);
        // The foot comes up first, goes, and comes down where it belongs.
        const side = closing.side, k = closing.done, over = smooth((k - 0.12) / 0.72);
        if (planned[side] !== null && world[side]) {
          kept.flat[side] = planned[side]! + closing.by * (1 - over);
          kept.raise[side] = Math.min(legs.hip * 0.16, 0.02 + Math.abs(closing.by) * 0.5) * Math.sin(Math.PI * k) ** 0.8;
          world[side] = { x: at.x + ahead.x * kept.flat[side]! * at.height, z: at.z + ahead.z * kept.flat[side]! * at.height };
        }
        if (pace > 0.45) closing = null;
      }
      return stride(pose, phase, step, pace, run, strider, legs, calm, kept);
    },
  };
}
export type Footing = ReturnType<typeof createFooting>;

/** How one person stands (art/blender/motion.py): a loop of `period` seconds, over which each curve is a Fourier series. */
export interface Stander {
  period: number;
  /** Breaths a second, and how far each leans the body. */
  breath: number;
  deep: number;
  /** How far out from the middle each foot stands, a share of the height. */
  width: number;
  /** The hips over one foot (a share of the height) and tipped, the trunk bent and the head tilted against it, the body's
   * lean, the head's nod and its turn about, and the arms hanging from relaxed elbows and wrists. */
  sway: Series;
  roll: Series;
  side: Series;
  tilt: Series;
  lean: Series;
  nod: Series;
  turn: Series;
  arm: Series;
  elbow: Series;
  wrist: Series;
}

const planted: Foot = { x: 0, y: 0, pitch: 0, on: 1, flat: 0, c: 0 };
/**
 * Someone standing, `t` seconds into their own loop (./motion-data.ts STANDS): the feet stay where they are, the weight
 * goes from one leg to the other and the other knee gives, the head looks about, and they breathe. `weight` is how much of
 * it there is (0: plain standing). `calm`: reduced motion, standing quite still. Writes the whole pose.
 */
export function stand(pose: Pose, t: number, stander: Stander, legs: Legs = REHEARSAL_LEGS, calm = false, weight = 1): Pose {
  Object.assign(pose, STANDING);
  // Reduced motion: their own posture, held.
  const w = calm ? 0 : clamp(weight, 0, 1), x = calm ? 0 : TAU * t / stander.period;
  const breath = calm ? 0 : Math.sin(TAU * stander.breath * t + 0.6 * Math.sin(TAU * stander.breath * 0.23 * t)) * w;
  const roll = wave(stander.roll, x) * w, lift = legs.width * Math.sin(roll);
  pose.sway = wave(stander.sway, x) * 5.2 * w;
  pose.hipRoll = roll;
  pose.bendSide = wave(stander.side, x) * w;
  pose.tilt = wave(stander.tilt, x) * w;
  // The lean and the nod belong to the person even standing still; a breath leans them a little and the head stays level.
  pose.lean = wave(stander.lean, x) + stander.deep * breath;
  pose.nod = wave(stander.nod, x) - stander.deep * 0.7 * breath;
  pose.turn = wave(stander.turn, x) * w;
  pose.armL = wave(stander.arm, x) + 0.02 * breath;
  pose.armR = wave(stander.arm, x + Math.PI * 0.8) + 0.02 * breath;
  pose.elbowL = wave(stander.elbow, x);
  pose.elbowR = wave(stander.elbow, x + Math.PI * 0.8);
  pose.wristL = wave(stander.wrist, x);
  pose.wristR = wave(stander.wrist, x + Math.PI * 0.8);
  pose.spread = 0.01 * breath;
  // The feet stand flat where they are; the legs reach them from hips that come down as far as the lower hip needs.
  const most = (legs.thigh + legs.shin) * (1 - 0.002 * w);
  const hips = Math.min(legs.hip, legs.ankle + most - Math.abs(lift));
  const out = (stander.width - legs.width) * w;
  rolled(0, 0, legs, planted);
  reachWith(0, hips + lift - planted.y, out, 0, legs, pose, 0);
  reachWith(0, hips - lift - planted.y, out, 0, legs, pose, 1);
  // Barely shifting, the legs are those of standing: a nearly straight knee's angle is too touchy to settle by itself.
  const settled = smooth(w / 0.04);
  if (settled < 1) for (const joint of LEGS) pose[joint] *= settled;
  return pose;
}

/** A clip keyed in the pose itself (art/blender/motion.py CLIPS): each channel's keys as [seconds, value, slope, …]. */
export type Clip = { readonly seconds: number } & { readonly [joint in keyof Pose]?: readonly number[] };

/**
 * A clip at `t` seconds, over `out`: each keyed channel as Blender plays it between its keys (cubic, with each key's own
 * slope), held at its first and last values outside them. Channels it does not key are left as they are.
 */
export function play(clip: Clip, t: number, out: Pose): Pose {
  for (const joint of JOINTS) {
    const keys = clip[joint];
    if (!keys || keys.length < 3) continue;
    if (t <= keys[0]!) { out[joint] = keys[1]!; continue; }
    let i = 0;
    while (i + 3 < keys.length && t > keys[i + 3]!) i += 3;
    if (i + 3 >= keys.length) { out[joint] = keys[i + 1]!; continue; }
    const t0 = keys[i]!, v0 = keys[i + 1]!, s0 = keys[i + 2]!, t1 = keys[i + 3]!, v1 = keys[i + 4]!, s1 = keys[i + 5]!;
    const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
    out[joint] = (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * s0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * s1;
  }
  return out;
}
