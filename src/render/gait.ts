import { JOINTS, KNEELING, ON_TOES, REHEARSAL_LEGS, STANDING, type Legs, type Pose } from './rig';

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
/**
 * Setting off from standing, the hips go over the foot that stays this share of the way to it before the other lifts, and
 * hand over to the stride's own sway through the first step; stopping, the last step takes them over the foot that stays
 * and brings them back to the middle as it comes down (in the body's heights per the hip joints' width).
 */
const SET_OFF = 0.55, LAST_STEP = 0.4;

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
  // In leg lengths: about three quarters of a leg at an easy walk, more running, and in a sprint longer still, more of
  // each step in the air (they ran ever faster steps, over seven a second for Bertil, where a child sprints at under five).
  const share = 0.36 + 0.27 * Math.min(g / leg, 4.2) + 0.12 * clamp(g / leg - 4.2, 0, 7.8);
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

/**
 * The longest share of a stride a foot can be planted for, with steps of `step` (heights), the hips `crouch` of their
 * height down and the foot put down `ahead` of the middle of its stance: as far as the leg reaches it ahead (onto its
 * heel) and behind (onto its toe), from hips as low as the stride lets them go.
 */
function stanceReach(legs: Legs, crouch: number, ahead: number, step: number): number {
  if (step <= 1e-6) return 1;
  const most = (legs.thigh + legs.shin) * 0.995, down = legs.hip * (1 - crouch - SINK) - legs.ankle;
  const across = Math.sqrt(Math.max(0, most * most - down * down));
  return Math.max(0.12, Math.min((0.98 * (across + legs.heel) - ahead) / step, (0.98 * (across + legs.toe) + ahead) / step));
}

/** The thigh, knee and foot that put an ankle at (ahead, down, out) from the hip joint, tipped `pitch`, for `legs`. */
export function reachWith(ahead: number, down: number, out: number, pitch: number, legs: Legs, pose: Pose, side: 0 | 1, soft = 1): void {
  const thigh = legs.thigh, shin = legs.shin, whole = thigh + shin;
  let far = clamp(Math.hypot(ahead, down, out), Math.abs(thigh - shin) + 1e-4, whole);
  // Near a straight knee a little more reach turns the knee a lot: past `soft` of the leg, the foot falls a little short
  // and the knee goes on bending smoothly instead of snapping straight (a run sweeps its legs through there every step).
  const knee0 = soft * whole;
  if (soft < 1 && far > knee0) far = knee0 + (whole - knee0) * (1 - Math.exp(-(far - knee0) / (whole - knee0)));
  const knee = Math.PI - Math.acos(clamp((thigh * thigh + shin * shin - far * far) / (2 * thigh * shin), -1, 1));
  const open = Math.acos(clamp((thigh * thigh + far * far - shin * shin) / (2 * thigh * far), -1, 1));
  const swing = Math.atan2(ahead, Math.hypot(down, out)) + open;
  const splay = Math.atan2(out, down);
  if (side === 0) { pose.legL = swing; pose.kneeL = knee; pose.footL = pitch - (swing - knee); pose.splayL = splay; }
  else { pose.legR = swing; pose.kneeR = knee; pose.footR = pitch - (swing - knee); pose.splayR = splay; }
}

/**
 * Where a pose's leg puts its ankle from the hip joint (ahead, down and out, in the body's heights, in the leg's own side
 * view) and how its foot is tipped: reachWith the other way round.
 */
export function ankleOf(pose: Pose, side: 0 | 1, legs: Legs): { ahead: number; down: number; out: number; pitch: number } {
  const swing = side === 0 ? pose.legL : pose.legR, knee = side === 0 ? pose.kneeL : pose.kneeR;
  const splay = side === 0 ? pose.splayL : pose.splayR, foot = side === 0 ? pose.footL : pose.footR;
  const thigh = legs.thigh, shin = legs.shin;
  const far = Math.sqrt(Math.max(1e-12, thigh * thigh + shin * shin + 2 * thigh * shin * Math.cos(knee)));
  const open = Math.acos(clamp((thigh * thigh + far * far - shin * shin) / (2 * thigh * far), -1, 1));
  const toward = swing - open, plumb = far * Math.cos(toward);
  return { ahead: far * Math.sin(toward), down: plumb * Math.cos(splay), out: plumb * Math.sin(splay), pitch: foot + swing - knee };
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
  // Held by a footing, the steps are as long as the stride counts them (its last step brings the feet together), and the
  // pace grows and dies away the rest of the motion. On their own, the steps die away with it too.
  const still = calm ? 0 : 1, s = Math.max(0, step) * (kept ? 1 : p);
  // A planted foot goes back under the body only as far as the leg reaches it, from hips as low as they may go and with the
  // boot rolled onto its heel ahead or its toe behind: faster than that, it is down for less of the stride and the rest is
  // in the air. (A sprint asked for more, and the knee locked straight while the boot was dragged.)
  const natural = blended(strider.walk, strider.run, k);
  const stance = Math.min(natural((g) => g.stance), stanceReach(legs, natural((g) => g.crouch) * p, natural((g) => g.ahead) * p, s));
  const walk = stance < natural((g) => g.stance) ? { ...strider.walk, stance } : strider.walk;
  const runs = walk === strider.walk ? strider.run : { ...strider.run, stance };
  const at = blended(walk, runs, k), along = curve(strider.walk, strider.run, k);
  // The feet: the left heel strikes at 0, the right half a stride later (π: a step).
  const pitch = (c: number) => along((g) => g.pitch, TAU * c) * p;
  foot(frac(phase / TAU), s, at, pitch, legs, p, left, kept?.flat[0], kept?.left[0], kept?.raise[0]);
  foot(frac((phase - Math.PI) / TAU), s, at, pitch, legs, p, right, kept?.flat[1], kept?.left[1], kept?.raise[1]);
  if (kept) { kept.now[0] = left.flat; kept.now[1] = right.flat; }
  // The hips: how high, how tipped. A foot that bears them must reach the ground from there: lower them as far as it needs.
  const roll = along((g) => g.roll, phase) * p * still;
  const lift = legs.width * Math.sin(roll);
  let hips = legs.hip * (1 - at((g) => g.crouch) * p) + along((g) => g.bob, phase) * p * still;
  const lowest = hips - legs.hip * SINK, thigh = legs.thigh, shin = legs.shin;
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
  // A run's legs swing through full stretch every step: they are softened there (reachWith), a walk's are not.
  const soft = 1 - 0.08 * k * p;
  reachWith(left.x, hips + lift - left.y, out, left.pitch, legs, pose, 0, soft);
  reachWith(right.x, hips - lift - right.y, out, right.pitch, legs, pose, 1, soft);
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
  /** Setting off: which foot stays down for the first step, from what phase, and how far on the other lifts. */
  let setOff: { stays: 0 | 1; from: number; lifts: number } | null = null;
  return {
    /** Forget where the feet stood: the body has been put somewhere else, or has stood still for a while. */
    reset(): void {
      world[0] = world[1] = null; kept.flat = [null, null]; kept.left = [null, null]; last[0] = last[1] = null; going = false; closing = null;
      fresh = true; setOff = null;
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
      // Setting off with both feet down, the one whose step comes first lifts, and the other takes the weight first.
      if (fresh && planned[0] !== null && planned[1] !== null && !calm) {
        const stance = Math.min(blended(strider.walk, strider.run, clamp(run, 0, 1))((g) => g.stance), 1);
        const leftAt = TAU * Math.max(0, stance - frac(phase / TAU)), rightAt = TAU * Math.max(0, stance - frac((phase - Math.PI) / TAU));
        setOff = leftAt < rightAt ? { stays: 1, from: phase, lifts: Math.max(0.2, leftAt) } : { stays: 0, from: phase, lifts: Math.max(0.2, rightAt) };
      }
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
      stride(pose, phase, step, pace, run, strider, legs, calm, kept);
      // The weight over the foot that stays: before the first step lifts (handing over to the stride's sway through it), and
      // through the last step, back to the middle as it comes down.
      let over = 0;
      if (setOff) {
        const gone = phase - setOff.from;
        const k = smooth(gone / (0.75 * setOff.lifts)) * (1 - smooth((gone - setOff.lifts) / Math.max(0.3, Math.PI - setOff.lifts)));
        over += (setOff.stays === 0 ? 1 : -1) * SET_OFF * k;
        if (gone > Math.PI || gone < -0.01) setOff = null;
      }
      if (closing && closing.done < 1) over += (closing.side === 0 ? -1 : 1) * LAST_STEP * Math.sin(Math.PI * closing.done) ** 0.7;
      if (over !== 0 && !calm) {
        pose.sway += over * legs.width * 5.2;
        pose.hipRoll += over * 0.05;
      }
      return pose;
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
  /** How far the hanging arms are held out from the body (radians), clear of it: more on the side the hip goes out to. */
  out: number;
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

/** Where someone is in a breath at `t` seconds of their own loop, −1 (out) to 1 (in): not quite even, as breathing is not. */
export function breathing(t: number, stander: Stander): number {
  return Math.sin(TAU * stander.breath * t + 0.6 * Math.sin(TAU * stander.breath * 0.23 * t));
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
  const breath = calm ? 0 : breathing(t, stander) * w;
  const roll = wave(stander.roll, x) * w, lift = legs.width * Math.sin(roll), over = wave(stander.sway, x) * w;
  pose.sway = over * 5.2;
  // The arms hang clear of the body; the hip that goes out pushes its arm out with it.
  pose.outL = stander.out + 1.5 * Math.max(0, over);
  pose.outR = stander.out + 1.5 * Math.max(0, -over);
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

/**
 * A clip keyed in the pose itself (art/blender/motion.py CLIPS): each channel's keys as [seconds, value, slope, …].
 * Getting up from a chair and sitting down on one keys the legs as shares (seated, below), and where the body stands:
 * `planted`, 0 with its hips at its place, 1 with its feet there. Putting on the rain gear keys how far the coat and
 * each boot are on (`coat`, `bootL`, `bootR`, 0 to 1: ./rain-gear.ts), in step with the motion, and which hand holds
 * a flashlight meanwhile (`lamp`: 1, the other hand).
 */
export type Clip = { readonly seconds: number }
  & { readonly [channel in keyof Pose | 'planted' | 'tuck' | 'heel' | 'over' | 'rise' | 'coat' | 'bootL' | 'bootR' | 'lamp' | KneelChannel]?: readonly number[] };
/** What going down on a knee keys as shares, the legs reaching from there on each body (kneelLegs, below). */
type KneelChannel = 'down' | 'front' | 'frontUp' | 'back' | 'backUp' | 'toes' | 'hand'
  // And how far a gesture's hands have gone to what the scene aims them at (./acting.ts point, gasp, show).
  | 'aim' | 'mouthR' | 'mouthL' | 'up';

/** One channel's keys at `t` seconds, as Blender plays them: cubic between keys, held at the first and last outside them. */
export function sample(keys: readonly number[], t: number): number {
  let i = 0;
  while (i + 3 < keys.length && t > keys[i + 3]!) i += 3;
  if (t <= keys[0]! || i + 3 >= keys.length) return keys[t <= keys[0]! ? 1 : i + 1]!;
  const t0 = keys[i]!, v0 = keys[i + 1]!, s0 = keys[i + 2]!, t1 = keys[i + 3]!, v1 = keys[i + 4]!, s1 = keys[i + 5]!;
  const h = t1 - t0, u = (t - t0) / h, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * v0 + (u3 - 2 * u2 + u) * h * s0 + (-2 * u3 + 3 * u2) * v1 + (u3 - u2) * h * s1;
}

/** A clip at `t` seconds, over `out`: each keyed channel as Blender plays it. Channels it does not key are left as they are. */
export function play(clip: Clip, t: number, out: Pose): Pose {
  for (const joint of [...JOINTS, 'seat', 'floor'] as const) {
    const keys = clip[joint];
    if (keys && keys.length >= 3) out[joint] = sample(keys, t);
  }
  return out;
}

/** The hips' height on a kitchen chair, in an adult's heights: 1.5 of their 5.2. */
export const SEAT = 1.5 / 5.2;
/** How far the hips are over what they sit on, in heights: an adult's on a kitchen chair (src/render/stage.ts furniture). */
export const SITTING_ON = SEAT - 1.31 / 5.2;
/** How far the feet are drawn in under the seat to get up, from where they rest, in heights. */
const TUCK = 0.09;
/** How far a drawn-in heel comes up, the foot on its ball, in radians. */
const HEEL_UP = 0.35;
const seatFoot = { x: 0, y: 0 };

/**
 * The legs of a body on a chair, getting up from it or sitting down on it: the feet drawn `tuck` of the way in under the
 * seat with the heels `heel` of the way up, the hips come `over` the feet and `rise` of the way up off the seat to
 * standing. The legs reach the floor from there whatever their length, the shins upright at rest; a child whose feet do
 * not reach it lets them hang. `seat` is the hips' height on the chair, in the body's heights; `width`, how far apart
 * they stand (Stander.width): drawn in, the feet go to it. Writes the legs and the hips' height (`seat`, in an adult's
 * units); returns how far ahead of the hips the feet are, in heights.
 */
export function seated(pose: Pose, legs: Legs = REHEARSAL_LEGS, seat = SEAT, tuck = 0, over = 0, rise = 0, heel = 0,
  width = legs.width): number {
  const thigh = legs.thigh, reach = legs.thigh + legs.shin;
  // At rest the shins hang upright to the floor, the thighs no steeper than the seat lets them.
  const rest = thigh * Math.sin(Math.acos(clamp((seat - legs.ankle - legs.shin) / thigh, -0.5, 0.36))) + 0.01;
  const ahead = (rest - TUCK * tuck) * (1 - over), pitch = -HEEL_UP * heel;
  rolled(ahead, pitch, legs, seatFoot);
  // Up off the seat no higher than the legs reach the floor from, nearly straight.
  const most = reach * 0.998;
  const top = Math.sqrt(Math.max(0, most * most - seatFoot.x * seatFoot.x)) + seatFoot.y;
  const hips = seat + Math.max(0, top - seat) * rise;
  const out = (width - legs.width) * tuck;
  reachWith(seatFoot.x, hips - seatFoot.y, out, pitch, legs, pose, 0);
  reachWith(seatFoot.x, hips - seatFoot.y, out, pitch, legs, pose, 1);
  // Feet that do not reach the floor hang from knees at the seat's edge, the toes down.
  const hang = smooth((Math.hypot(seatFoot.x, hips - seatFoot.y) / reach - 1) / 0.05);
  if (hang > 0) {
    for (const [leg, knee, foot] of [['legL', 'kneeL', 'footL'], ['legR', 'kneeR', 'footR']] as const) {
      pose[leg] += (1.42 - pose[leg]) * hang;
      pose[knee] += (1.32 - pose[knee]) * hang;
      pose[foot] += (-0.3 - pose[foot]) * hang;
    }
  }
  pose.seat = hips * 5.2;
  return ahead;
}

/**
 * A chair clip at `t` seconds over `out` (play, and the legs seated as it keys them), for a body whose hips sit `seat`
 * high and who stands `width` apart: how far ahead of the hips its feet are, in heights.
 */
export function chairPose(clip: Clip, t: number, legs: Legs, out: Pose, seat = SEAT, width = legs.width): number {
  play(clip, t, out);
  const at = (keys?: readonly number[]) => (keys ? sample(keys, t) : 0);
  return seated(out, legs, seat, at(clip.tuck), at(clip.over), at(clip.rise), at(clip.heel), width);
}

/** Kneeling, how far the left knee is behind the hips, a share of the thigh: the weight a little forward, over the front foot. */
const KNEE_BACK = 0.3;
/** Kneeling, how far the right shin leans forward over its foot (radians). */
const FRONT_SHIN = 0.12;
/** How much a model's boots and knees give, kneeling, beyond what its bones say: a share of the height. */
const SKIN = 0.005;
/**
 * Where a kneeling hand's wrist goes, from the knee's joint, in the body's heights: up over the knee and back over the
 * thigh, so that the hand lies over the knee (src/render/stage.ts, src/content/aventyr2/grandparents.ts).
 */
export const KNEE_HAND = { up: 0.035, back: 0.07 } as const;
const kneelFoot = { x: 0, y: 0 };
/**
 * Where a body kneels on its own legs (art/blender/motion.py CLIPS.kneel): the hips' height, the right ankle's place ahead
 * of them and the left foot's flat place behind them, in shares of the height. The left knee is on the floor a little
 * behind the hips (its joint as high as the knee is thick: Legs.knee), the left shin goes back from it to a foot that
 * stands on its toe, and the right foot is flat ahead with its shin upright, leaning a little forward.
 */
export function kneelPlaces(legs: Legs): { hips: number; front: number; back: number; knee: { ahead: number; up: number } } {
  const thigh = legs.thigh, shin = legs.shin, knee = -KNEE_BACK * thigh, thick = legs.knee ?? KNEELING;
  const hips = thick + Math.sqrt(thigh * thigh - knee * knee);
  // On its toe: the ankle as high as the boot's toe cap on the floor puts it, and the shin rising back to it from the knee.
  rolled(0, -ON_TOES, legs, kneelFoot);
  kneelFoot.y = legs.tip ?? kneelFoot.y;
  const rise = clamp((kneelFoot.y - thick) / shin, -0.9, 0.9);
  const back = knee - shin * Math.sqrt(1 - rise * rise) - kneelFoot.x;
  // The right knee over its foot: as far ahead as the thigh reaches from the hips to it.
  const kneeUp = legs.ankle + shin * Math.cos(FRONT_SHIN);
  const ahead = Math.sqrt(Math.max(0, thigh * thigh - (kneeUp - hips) ** 2));
  return { hips, front: ahead - shin * Math.sin(FRONT_SHIN), back, knee: { ahead, up: kneeUp } };
}

const kneelAt = { x: 0, y: 0 };
/**
 * The legs of a body going down on its left knee, or kneeling: the hips `down` of the way from standing to kneeling, the
 * right foot `front` of the way to its place ahead and lifted `frontUp` (a share of the hips' height) on the way, the left
 * foot `back` of the way to its place behind, lifted `backUp`, and up on its toes `toes` of the way. The feet stand
 * `width` apart (Stander.width). Writes the legs; the rig stands the body on its lowest boot or knee.
 */
export function kneelLegs(pose: Pose, legs: Legs = REHEARSAL_LEGS, down = 1, front = 1, frontUp = 0, back = 1, backUp = 0,
  toes = 1, width = legs.width): Pose {
  const places = kneelPlaces(legs), most = (legs.thigh + legs.shin) * 1.0005;
  const hips = legs.hip + (places.hips - legs.hip) * clamp(down, 0, 1);
  const out = width - legs.width;
  // A model's skin and boots give a little where its bones do not: measured on the family's bodies kneeling.
  const skin = legs.tip === undefined ? 0 : SKIN;
  // The right foot flat, stepping ahead.
  rolled(places.front * front, 0, legs, kneelAt);
  kneelAt.y += frontUp * legs.hip - skin * clamp(down, 0, 1) * clamp(front, 0, 1);
  reachWith(kneelAt.x, hips - kneelAt.y, out, 0, legs, pose, 1);
  // The left foot, going back and up onto its toe; a foot too far for the leg to reach comes up further onto it. Right up
  // on its toe, the ankle is as high as the boot's own toe cap puts it (Legs.tip).
  const flat = places.back * back, up = backUp * legs.hip;
  rolled(0, -ON_TOES, legs, kneelFoot);
  const cap = (legs.tip ?? kneelFoot.y) - kneelFoot.y;
  const far = (pitch: number) => {
    rolled(flat, pitch, legs, kneelAt);
    kneelAt.y += (cap + skin) * Math.min(1, (pitch / -ON_TOES) ** 2);
    return Math.hypot(kneelAt.x, hips - kneelAt.y - up, out);
  };
  let pitch = -ON_TOES * clamp(toes, 0, 1);
  if (far(pitch) > most) {
    // Just as far up onto the toe as the leg needs to reach it (right over, the ankle swings away again: not past it).
    let near = pitch, reached = NaN;
    for (let p = pitch - 0.05; p >= -ON_TOES * 1.15; p -= 0.05) {
      if (far(p) <= most) { reached = p; break; }
      near = p;
    }
    if (!Number.isNaN(reached)) {
      for (let i = 0; i < 10; i++) {
        const mid: number = (near + reached) / 2;
        if (far(mid) > most) near = mid; else reached = mid;
      }
      pitch = reached;
    }
    far(pitch);
  }
  reachWith(kneelAt.x, hips - kneelAt.y - up, out, pitch, legs, pose, 0);
  // A model's knee bends on from how it was made, and its boot stands flat under the shin as it was made: going down, the
  // bend it already has is taken off both, so that a deep bend puts the knee and the boot where they belong.
  const made = (legs.bend ?? 0) * clamp(down, 0, 1);
  pose.kneeL -= made; pose.kneeR -= made;
  pose.footL -= made; pose.footR -= made;
  return pose;
}

/**
 * A kneeling clip at `t` seconds over `out` (play, and the legs as it keys them: kneelLegs), for a body with legs `legs`
 * who stands `width` apart.
 */
export function kneelPose(clip: Clip, t: number, legs: Legs, out: Pose, width = legs.width): Pose {
  play(clip, t, out);
  const at = (keys: readonly number[] | undefined, rest: number) => (keys ? sample(keys, t) : rest);
  return kneelLegs(out, legs, at(clip.down, 1), at(clip.front, 1), at(clip.frontUp, 0), at(clip.back, 1), at(clip.backUp, 0),
    at(clip.toes, 1), width);
}

/** Crouched, how far the legs fold: the hips as far from the ankles as this share of the whole leg. */
const CROUCH_FOLD = 0.42;
/** Crouched, how far ahead of the hips the ankles are, a share of that: the hips sit back over the heels. */
const CROUCH_AHEAD = 0.5;
/** Crouched, how much wider the feet are than standing (they stay where they stood). */
const CROUCH_WIDE = 1;
const crouchAt = { x: 0, y: 0 };
/**
 * Where a body crouches on its own legs (art/blender/motion.py CLIPS.crouch): the hips' height, and how far ahead of them
 * the ankles are, in shares of the height. The feet stay where they stood; the hips go back and down over them (the stage
 * moves the body back by `ahead`, src/render/stage.ts).
 */
export function crouchPlaces(legs: Legs): { hips: number; ahead: number } {
  const far = CROUCH_FOLD * (legs.thigh + legs.shin), ahead = CROUCH_AHEAD * far;
  return { hips: legs.ankle + Math.sqrt(far * far - ahead * ahead), ahead };
}

/**
 * The legs of a body going down into a crouch, or crouching: the hips `down` of the way from standing to crouched (a
 * little past it sinks them lower), the feet flat or the heels `heel` of the way up onto the balls of the feet, as wide
 * as it stands (`width`) and wider as it goes down, the knees out over them. Writes the legs; the rig stands the body on
 * its boots.
 */
export function crouchLegs(pose: Pose, legs: Legs = REHEARSAL_LEGS, down = 1, heel = 0, width = legs.width): Pose {
  const places = crouchPlaces(legs), k = clamp(down, 0, 1);
  const hips = legs.hip + (places.hips - legs.hip) * clamp(down, 0, 1.15), pitch = -HEEL_UP * clamp(heel, 0, 1);
  rolled(places.ahead * k, pitch, legs, crouchAt);
  const out = width * (1 + (CROUCH_WIDE - 1) * k) - legs.width;
  reachWith(crouchAt.x, hips - crouchAt.y, out, pitch, legs, pose, 0);
  reachWith(crouchAt.x, hips - crouchAt.y, out, pitch, legs, pose, 1);
  // A model's knee bends on from how it was made (see kneelLegs).
  const made = (legs.bend ?? 0) * k;
  pose.kneeL -= made; pose.kneeR -= made;
  pose.footL -= made; pose.footR -= made;
  return pose;
}

/** A crouching clip at `t` seconds over `out` (play, and the legs as it keys them: crouchLegs). */
export function crouchPose(clip: Clip, t: number, legs: Legs, out: Pose, width = legs.width): Pose {
  play(clip, t, out);
  return crouchLegs(out, legs, clip.down ? sample(clip.down, t) : 1, clip.heel ? sample(clip.heel, t) : 0, width);
}
