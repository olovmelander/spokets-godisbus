import { BoxGeometry, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { CLIMB_SPEED, JUMP_SPEED, RUN_AFTER, RUN_SPEED } from '../sim/constants';
import type { PlayerState } from '../sim/types';
import { blendPose, createSway, JOINTS, plantFeet, STANDING, type Legs, type Pose } from './rig';
import { stand, wave as series, type Gait, type Series } from './gait';
import { GAITS, STANDS } from './motion-data';

/** A small boy's stride, as Bertil's is keyed: Elof's hips, trunk and hands go with it. */
const BOY = GAITS.bertil;
/** What standing gives him while he waits: the legs on the ground, the hips over them, the trunk and head. */
const STOOD = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'sway', 'hipRoll', 'bendSide', 'tilt'] as const;
import { createArmContact } from './arm-contact';
import { COAT_ORDER, type RainGear } from './rain-gear';

const clamp = (n: number) => Math.min(1, Math.max(0, n));
const smooth = (n: number) => { const t = clamp(n); return t * t * (3 - 2 * t); };
type MotionState = Pick<PlayerState, 'mode' | 'grounded' | 'vy'> & Partial<Pick<PlayerState, 't' | 'atEdge'>>;
/** 0 → 1 over `up` seconds from `at`, held for `hold`, and back to 0 over `down`. */
const pulse = (t: number, at: number, up: number, hold: number, down: number) => smooth((t - at) / up) * (1 - smooth((t - at - up - hold) / down));
/** A small seeded random (mulberry32): the idles' order is shuffled, the same in every run. */
export const seeded = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/** What he does while he waits, in its seconds. After a long wait he stretches. */
export const IDLES = { look: 4.4, rock: 3.6, scratch: 2.8, leaf: 3.8, tap: 3.2, stretch: 3.4 } as const;
export type IdleAct = keyof typeof IDLES;
/** The first idle begins this long after he stops, and a stretch only after this long a wait. */
const FIRST = 3.4, STRETCH = 18;

/**
 * The thigh and knee that lift a heel by tipping the boot `tip` (< 0) about its toe, which stays where it stood: the
 * public figure's measures (thigh 0.19, toe 0.135 ahead of and 0.21 below the knee).
 */
function onToe(tip: number): { hip: number; knee: number } {
  const hip = Math.asin(Math.max(-1, Math.min(1, (0.135 * (1 - Math.cos(tip)) - 0.21 * Math.sin(tip)) / 0.19)));
  return { hip, knee: hip - tip };
}

/**
 * A short readable idle, added to the standing target at `u` seconds into it. Nothing moves a foot from its place: a
 * heel lifts about its toe, and the rest is spine, head and arms. `near` is +1 when his right arm is nearer the camera
 * (facing right), and `toward` turns the head towards the camera. Returns a hand in the hair, −1 to 1.
 */
function idlePose(act: IdleAct, u: number, near: 1 | -1, out: Pose): number {
  const d = IDLES[act];
  const arm = near > 0 ? 'armR' : 'armL', elbow = near > 0 ? 'elbowR' : 'elbowL';
  const toward = -near;
  const lift = (tip: number, legs: 'both' | 'near') => {
    const { hip, knee } = onToe(tip);
    if (legs === 'both' || near < 0) { out.legL += hip; out.kneeL += knee; }
    if (legs === 'both' || near > 0) { out.legR += hip; out.kneeR += knee; }
  };
  switch (act) {
    case 'look': {
      // Over his shoulder towards us, away into the place, then up.
      const first = pulse(u, .15, .5, .7, .45), second = pulse(u, 1.75, .5, .55, .45), up = pulse(u, 3, .45, .5, .45);
      out.turn += toward * (.6 * first - .45 * second) + .08 * up;
      out.nod += .04 * first - .36 * up;
      out.lean -= .025 * up;
      return 0;
    }
    case 'rock': {
      // Up on his toes and back, twice, with his hands behind his back.
      const e = pulse(u, 0, .45, d - .95, .5), wave = Math.sin(u * Math.PI * 2 / 1.65);
      const up = e * Math.max(0, wave), back = e * Math.max(0, -wave);
      lift(-.13 * up, 'both');
      out.lean += .05 * up - .045 * back; out.nod += .03 * back - .03 * up;
      out.armL += (-.42 - out.armL) * e; out.armR += (-.42 - out.armR) * e;
      out.elbowL += (.55 - out.elbowL) * e; out.elbowR += (.55 - out.elbowR) * e;
      return 0;
    }
    case 'scratch': {
      // The nearer hand up to the side of his head (or his cap's brim), a quick scratch, and down.
      const raise = pulse(u, .1, .5, 1.6, .55);
      const rub = Math.sin(u * 26) * smooth((u - .6) / .2) * (1 - smooth((u - 1.9) / .2));
      out[arm] += (2.55 - out[arm]) * raise; out[elbow] += (2.05 - out[elbow]) * raise + .13 * rub;
      out.nod += .12 * raise; out.turn += toward * .1 * raise; out.lean += .02 * raise;
      return rub;
    }
    case 'leaf': {
      // Up at a falling leaf, following it down as it drifts, and a hand opens for it.
      const watch = pulse(u, 0, .5, 2.8, .5), follow = smooth((u - .5) / 2.6), take = pulse(u, 2.2, .45, .5, .6);
      out.nod += watch * (-.5 + .62 * follow);
      out.turn += watch * .16 * Math.sin(u * 2.4) * (1 - .5 * follow);
      out.lean -= .03 * watch * (1 - follow);
      out[arm] += (.75 - out[arm]) * take; out[elbow] += (.7 - out[elbow]) * take;
      return 0;
    }
    case 'tap': {
      // Arms folded across his chest, and the nearer heel taps about its toe.
      const e = pulse(u, 0, .45, d - .95, .5), beat = Math.max(0, Math.sin((u - .5) * Math.PI * 2 * 2.1)) * smooth((u - .5) / .15) * (1 - smooth((u - d + .7) / .2));
      out.armL += (.5 - out.armL) * e; out.armR += (.55 - out.armR) * e;
      out.elbowL += (1.9 - out.elbowL) * e; out.elbowR += (1.85 - out.elbowR) * e;
      out.spread -= .25 * e;
      lift(-.12 * beat, 'near');
      out.nod += .035 * beat;
      return 0;
    }
    case 'stretch': {
      // Both arms up high, up on his toes a little, and down again through the sides.
      const up = pulse(u, .1, .7, 1.4, .9), toes = pulse(u, .5, .5, .8, .5);
      out.armL += (2.95 - out.armL) * up; out.armR += (2.95 - out.armR) * up;
      out.elbowL += (.12 - out.elbowL) * up; out.elbowR += (.12 - out.elbowR) * up;
      out.spread += .18 * up + .35 * pulse(u, 2.2, .3, .2, .5);
      out.lean -= .1 * up; out.nod -= .28 * up;
      lift(-.09 * toes, 'both');
      return 0;
    }
  }
}

/**
 * How far each leg swings from the hip at `pace`: about 0.42 at a walk, 0.74 at a run. A walk's step is long enough
 * that its cadence stays a small boy's, and the stride is paced by it (`strideRate`), so the planted foot holds still.
 */
export function strideReach(pace: number): number {
  return 0.74 * Math.pow(clamp(pace), 0.52);
}

/** Leg length (thigh and shin, ./rig.ts) in EL at size 1, as far as a swing carries the foot with the knee's give. */
const STEP_LEG = 0.8;

/**
 * How far round the stride goes for `distance` EL travelled at `pace`, at size `tall`: half a turn (one step) for
 * each step's length, the ground the planted foot covers as the leg swings through. A bigger Elof steps longer.
 */
export function strideRate(distance: number, pace: number, tall = 1): number {
  return (distance / Math.max(0.2, tall)) * Math.PI / Math.max(0.12, STEP_LEG * Math.sin(strideReach(pace)));
}

/**
 * A thigh's angle at its stride's `phase`, for a swing of `reach` either way: forward in a smooth arc through the swing
 * (the cosine is positive), and back through the stance so that the planted foot moves under the hip in a straight line.
 */
function thigh(phase: number, reach: number): number {
  if (Math.cos(phase) >= 0) return reach * Math.sin(phase);
  const u = ((((phase - Math.PI / 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / Math.PI;
  return Math.asin(Math.sin(reach) * (1 - 2 * Math.min(1, u)));
}

/** A landing's give, 0 → 1 → 0: up to its deepest `tau` seconds after `t` = 0, and back over a few times that. */
export const give = (t: number, tau: number) => (t <= 0 || t > 40 * tau ? 0 : (t / tau) * Math.exp(1 - t / tau));

/** How the legs' give on landing peaks, and how much later the trunk's does, in seconds: the weight comes through the knees first. */
const GIVE = 0.075, TRUNK_GIVE = 0.11, TRUNK_LATE = 0.045;
/**
 * How far the knees are bent as he comes down to land (the thighs half as far, the soles flat): the landing's give goes on
 * from there, so the feet stay where they touch down.
 */
const READY = 0.25;
/**
 * How long a jump's push off the ground takes, in seconds: down into the knees, then up onto the toes to full stretch, and
 * on into the tuck. The simulation has him off the ground at once; the body is drawn on the ground through the dip and
 * the push, its feet left behind no longer than the push takes (`Air.rise`), and goes up after them.
 */
const DIP_HOLD = 0.035, DIP = 0.115, PUSH = 0.2;

/**
 * Where a jump is: how long since he left the ground, whether he jumped (rather than stepped off), how fast he went along
 * (a share of a run), and how far he has risen since.
 */
export interface Air { t: number; pushed: boolean; carry: number; rise?: number }

/**
 * In the air, as a small boy jumps (the leading leg is the left one here; the caller mirrors it): a dip and a push off his
 * toes with the arms swung up, the knees tucking as he rises to the top with the arms out for balance, and the legs
 * opening to reach for the ground as he falls, the leading foot ahead as far as he is going forward, the head down to
 * where he lands. Stepping off a ledge he does not push: the legs reach down from where they were.
 */
function airPose(vy: number, air: Air, out: Pose): void {
  const rise = clamp(vy / JUMP_SPEED), fall = clamp(-vy / JUMP_SPEED), m = clamp(air.carry);
  // The top of the arc is the most tucked; as he falls the legs open, quickly.
  const top = air.pushed ? 1 - Math.max(rise, fall) : 0, open = air.pushed ? smooth(fall * 1.6) : 1;
  const push = air.pushed ? 1 - smooth((air.t - DIP) / (PUSH - DIP)) : 0, dip = air.pushed ? 1 - smooth((air.t - DIP_HOLD) / (DIP - DIP_HOLD)) : 0;
  const mix = (tuck: number, reach: number) => tuck + (reach - tuck) * open;
  // Reaching for the ground: a little bent, ready to give (READY), the leading foot ahead as far as he goes forward.
  const kneeLead = READY + 0.1 * m, kneeTrail = READY + 0.2 * m, legLead = READY / 2 + 0.55 * m, legTrail = READY / 2 - 0.35 * m;
  out.legL = mix(0.62 + 0.38 * top, legLead); out.legR = mix(0.05 + 0.45 * top, legTrail);
  out.kneeL = mix(0.75 + 0.6 * top, kneeLead); out.kneeR = mix(0.6 + 0.6 * top, kneeTrail);
  out.footL = mix(-0.3, kneeLead - legLead); out.footR = mix(-0.45, (kneeTrail - legTrail) * (1 - m) - 0.15 * m);
  out.armL = mix(1.25 + 0.15 * top, 1.65); out.armR = mix(1.4 + 0.1 * top, 1.85);
  out.elbowL = mix(0.5, 0.32); out.elbowR = mix(0.45, 0.28);
  out.spread = mix(0.22 + 0.2 * top, 0.42);
  out.wristL = mix(0.1, -0.2); out.wristR = mix(0.12, -0.18);
  out.lean = mix(0.06 + 0.06 * top, 0.06); out.nod = mix(-0.06, 0.2 * fall);
  out.twist = 0.12 * rise - 0.05 * fall;
  // The push: straight from the hips to the toes, the arms swung up past the head.
  const stretch = (joint: keyof Pose, value: number) => { (out[joint] as number) += (value - (out[joint] as number)) * push; };
  stretch('legL', 0.12); stretch('legR', -0.22); stretch('kneeL', 0.18); stretch('kneeR', 0.1);
  stretch('footL', -0.45); stretch('footR', -0.5); stretch('armL', 1.95); stretch('armR', 1.75);
  stretch('elbowL', 0.3); stretch('elbowR', 0.35); stretch('spread', 0.08); stretch('wristL', 0.3); stretch('wristR', 0.3);
  stretch('lean', 0.14); stretch('nod', -0.14);
  // And the dip before it: down into the knees with the arms back, the soles flat.
  const crouch = (joint: keyof Pose, value: number) => { (out[joint] as number) += (value - (out[joint] as number)) * dip; };
  crouch('legL', 0.45); crouch('legR', 0.38); crouch('kneeL', 0.8); crouch('kneeR', 0.75);
  crouch('footL', 0.35); crouch('footR', 0.37); crouch('armL', -0.5); crouch('armR', -0.4);
  crouch('elbowL', 0.4); crouch('elbowR', 0.35); crouch('spread', 0); crouch('lean', 0.34); crouch('nod', 0.12);
}

/**
 * One pose language for the rounded public figure and the approved model's named bones. `leg`: how far his planted foot
 * goes back under him for a swing's sine, in EL at size 1 (twice the leg, hip to ankle): his model's own legs are shorter
 * than the stride's measure, and swing further for the same step, so that the foot holds the ground. `air`: where a jump
 * is (left out, the arc alone, as at its top: no push, the legs tucked by how near the top he is).
 */
export function playerPose(player: MotionState, phase: number, pace: number, landing: number, out: Pose, leg = STEP_LEG, air?: Air): Pose {
  Object.assign(out, STANDING);
  if (player.mode === 'climb') {
    const step = Math.sin(phase);
    out.armL = 2.5 + step * 0.3; out.armR = 2.5 - step * 0.3;
    out.elbowL = 0.4 - step * 0.22; out.elbowR = 0.4 + step * 0.22;
    out.legL = 0.45 - step * 0.3; out.legR = 0.45 + step * 0.3;
    out.kneeL = 0.65 - step * 0.3; out.kneeR = 0.65 + step * 0.3;
    out.lean = -0.06; out.nod = -0.18;
  } else if (player.mode === 'slide') {
    out.armL = 2.45; out.armR = 2.25; out.elbowL = 0.55; out.elbowR = 0.65;
    out.legL = 0.7; out.legR = 0.45; out.kneeL = 0.85; out.kneeR = 0.7;
    out.lean = -0.16; out.nod = 0.15;
  } else if (player.mode === 'ledge') {
    // Reach, pull the chest over the rim, then plant a knee and stand up.
    const pull = smooth((player.t ?? 0) / 0.6), stand = smooth(((player.t ?? 0) - 0.55) / 0.45);
    out.armL = (2.8 - pull * 1.6) * (1 - stand); out.armR = (2.6 - pull * 1.4) * (1 - stand);
    out.elbowL = out.elbowR = (0.2 + 0.8 * pull) * (1 - stand);
    out.legL = (0.35 + pull * 0.85) * (1 - stand); out.legR = 0.2 * (1 - stand);
    out.kneeL = (0.55 + pull * 0.65) * (1 - stand); out.kneeR = 0.35 * (1 - stand);
    out.lean = 0.35 * pull * (1 - stand); out.nod = -0.2 * (1 - pull);
  } else if (player.mode === 'swing') {
    out.armL = out.armR = 2.9; out.elbowL = out.elbowR = 0.15;
    out.legL = out.legR = 0.2; out.kneeL = out.kneeR = 0.45;
    out.lean = -.08; out.nod = -.12;
  } else if (player.mode === 'ride') {
    out.legL = out.legR = 1.25; out.kneeL = out.kneeR = 1.3;
    out.armL = out.armR = 0.3; out.elbowL = out.elbowR = 0.6;
  } else if (player.mode === 'down' || player.mode === 'bubble') {
    out.armL = out.armR = 0.45; out.elbowL = out.elbowR = 0.9;
    out.legL = out.legR = 0.4; out.kneeL = out.kneeR = 0.8;
    out.spread = player.mode === 'bubble' ? 0.25 : 0;
  } else if (!player.grounded) {
    airPose(player.vy, air ?? { t: 1, pushed: true, carry: 0 }, out);
  } else if (player.atEdge) {
    out.lean = -0.16; out.nod = 0.35; out.spread = 0.18;
    out.armL = 0.25; out.armR = 0.4; out.elbowL = out.elbowR = 0.3;
    out.legL = 0.1; out.legR = -0.12; out.kneeL = 0.1; out.kneeR = 0.18;
  } else {
    const effort = Math.sqrt(clamp(pace)), run = smooth((pace - 0.35) / 0.65);
    const reach = strideReach(pace), swing = Math.sin(phase) * reach;
    const recovery = Math.cos(phase), fold = effort * (0.45 + 0.65 * run);
    // The leg on the ground goes back under him in a straight line, as fast as he goes on, so that its foot stays where it
    // came down (a swung arc would skate it forward at each end of the step and back in the middle); the other swings.
    const legs = leg === STEP_LEG ? reach : Math.asin(Math.min(Math.sin(1), STEP_LEG * Math.sin(reach) / leg));
    // Landing, the hips go back and down over the feet: the thighs come forward by half what the knees bend, so the feet
    // stay under him.
    out.legL = thigh(phase, legs) + 0.5 * landing; out.legR = thigh(phase + Math.PI, legs) + 0.5 * landing;
    // The recovering foot folds behind the knee; the supporting leg extends on its way back.
    // Squaring the lift makes both ends of contact smooth instead of snapping the knee straight.
    out.kneeL = Math.max(0, recovery) ** 2 * fold + landing;
    out.kneeR = Math.max(0, -recovery) ** 2 * fold + landing;
    out.armL = -swing * 0.9; out.armR = swing * 0.9;
    // A run bends the arms and drives them, and each stride goes through the trunk: the shoulders turn against the hips.
    const bent = 0.08 + (0.5 + 0.45 * run) * effort;
    out.elbowL = bent - swing * 0.12; out.elbowR = bent + swing * 0.12;
    // (Landing, the trunk gives a moment after the legs: createPlayerMotion adds it.)
    out.lean = (0.1 + 0.08 * run) * pace; out.nod = -0.05 * pace;
    out.twist = swing * (0.3 + 0.16 * run);
    plantFeet(out, phase);
    // Giving on landing, the soles stay flat: the ankles take up what the shins tip that the stride's feet do not.
    const flat = (side: number) => { const t = clamp(0.5 - side * Math.cos(phase) * 2), k = t * t * (3 - 2 * t); return 1 - 0.55 * k - 0.9 * (1 - k); };
    out.footL += 0.5 * landing * flat(1); out.footR += 0.5 * landing * flat(-1);
  }
  return out;
}

/** How long he takes to move into a scene's pose, or from one act's to the next, in seconds. */
const SCRIPT_BLEND = 0.3;

type Joint = typeof JOINTS[number];
/** How softly he is drawn on his feet: his pose is followed at this rate (a second's exponential), as it always has been. */
const STRIDE_EASE = 18;
/**
 * How quickly each joint takes up a jump in what is asked of it (off the ground, onto it, onto a hose, a stride's foot
 * coming down), in radians a second: the legs first, then the arms, the trunk a moment after them, the head and the hips'
 * shift last.
 */
const CATCH: Record<Joint, number> = {
  legL: 26, legR: 26, kneeL: 26, kneeR: 26, footL: 26, footR: 26, splayL: 20, splayR: 20,
  armL: 17, armR: 17, elbowL: 17, elbowR: 17, wristL: 14, wristR: 14, spread: 15, outL: 15, outR: 15,
  lean: 14, twist: 12, bendSide: 10, nod: 10, turn: 10, tilt: 9, sway: 8, hipRoll: 8,
};
/**
 * A change in a joint's step from one frame to the next beyond this (radians, at 60 frames a second) is a jump, not motion,
 * whenever it comes: a stride's fastest turns stay well under it.
 */
const JUMP = 0.3;

/**
 * Inertial blending: the pose drawn follows what is asked of it exactly while that moves smoothly, however fast; where it
 * jumps (a new state of the body: `jumped`, or a joint asked to jump further than JUMP), the drawn body goes on from where
 * it was at the speed it had, and the difference dies away like a critically damped spring at each joint's own rate
 * (CATCH). Nothing snaps, and nothing in between is slowed: a stride's planted foot keeps its place.
 */
export function createFollower() {
  const drawn = { ...STANDING }, speed = { ...STANDING }, off = { ...STANDING }, offSpeed = { ...STANDING };
  const asked = { ...STANDING }, step = { ...STANDING }, rate = { ...STANDING };
  const pending = new Set<Joint>();
  let fresh = true;
  return {
    /** Forget how it was moving: the next pose is drawn as asked (a cut, or a pose given from elsewhere). */
    reset(pose?: Pose): void {
      fresh = true;
      if (pose) Object.assign(drawn, pose);
    },
    /**
     * Takes `target` (what is asked) over `dt` seconds into `out`; `jumped`: the body has just changed what it does, and
     * `quick` times as quickly as the joints' own rates it takes that up (a jump's dip: down into the knees at once).
     */
    follow(target: Pose, dt: number, out: Pose, jumped = false, quick = 1): Pose {
      const jump = JUMP * (dt * 60) ** 2;
      for (const joint of JOINTS) {
        const x = target[joint];
        if (fresh || dt <= 0) {
          drawn[joint] = x; speed[joint] = off[joint] = offSpeed[joint] = step[joint] = 0; asked[joint] = x;
          pending.delete(joint);
          continue;
        }
        const now = x - asked[joint];
        if (pending.has(joint)) {
          // The frame after a jump: how fast what is asked now goes is known, and the body keeps its own speed.
          offSpeed[joint] = speed[joint] - now / dt;
          step[joint] = now;
          pending.delete(joint);
        } else if (jumped || Math.abs(now - step[joint]) > jump) {
          // A jump: the body goes on from where it was at the speed it had.
          off[joint] = drawn[joint] + speed[joint] * dt - x;
          offSpeed[joint] = speed[joint] - step[joint] / dt;
          rate[joint] = CATCH[joint] * (jumped ? quick : 1);
          pending.add(joint);
          asked[joint] = x;
          speed[joint] = (x + off[joint] - drawn[joint]) / dt;
          drawn[joint] = x + off[joint];
          continue;
        } else step[joint] = now;
        // Critically damped, as far as this frame: the difference and its speed die away together.
        const w = rate[joint] || CATCH[joint], e = Math.exp(-w * dt), k = (offSpeed[joint] + w * off[joint]) * dt;
        off[joint] = (off[joint] + k) * e;
        offSpeed[joint] = (offSpeed[joint] - w * k) * e;
        if (Math.abs(off[joint]) < 1e-7 && Math.abs(offSpeed[joint]) < 1e-6) off[joint] = offSpeed[joint] = 0;
        asked[joint] = x;
        const at = x + off[joint];
        speed[joint] = (at - drawn[joint]) / dt;
        drawn[joint] = at;
      }
      fresh = false;
      Object.assign(out, target);
      for (const joint of JOINTS) out[joint] = drawn[joint];
      return out;
    },
  };
}

/**
 * The body's turn about (its yaw, in radians), as a body turns round: from rest it gathers speed and comes to rest facing
 * the new way, the short way round, never setting off at full speed. Two critically damped springs, one after the other,
 * at `rate` (radians a second): a half turn takes about a quarter of a second at the rate a game's turn about has.
 */
export function createTurning(start = 0, rate = 30) {
  let lead = start, leadSpeed = 0, at = start, atSpeed = 0;
  const spring = (x: number, v: number, to: number, dt: number) => {
    const e = Math.exp(-rate * dt), o = x - to, k = (v + rate * o) * dt;
    return [to + (o + k) * e, (v - rate * k) * e] as const;
  };
  return {
    get angle(): number { return at; },
    /** Turned towards `target` over `dt`; `at once` (a cut) puts it there. */
    update(target: number, dt: number, atOnce = false): number {
      if (atOnce) { lead = at = target; leadSpeed = atSpeed = 0; return at; }
      if (dt <= 0) return at;
      // The short way round, from where the turn is going now.
      const to = lead + Math.atan2(Math.sin(target - lead), Math.cos(target - lead));
      [lead, leadSpeed] = spring(lead, leadSpeed, to, dt);
      [at, atSpeed] = spring(at, atSpeed, lead, dt);
      return at;
    },
  };
}

/** Only actual travel advances a stride: blocked movement, rides and a paused view never march. */
export function createPlayerMotion() {
  const target = { ...STANDING }, pose = { ...STANDING };
  let lastX: number | null = null, lastY = 0, lastMode: PlayerState['mode'] = 'free';
  let grounded = true, free = false, phase = 0, landing = 0, landed = Infinity, impact = 0, idle = 0;
  let speed = 0, lead = 1;
  // Where a jump is (Air), and the follower that keeps every joint from snapping between states.
  const air: Air = { t: 0, pushed: false, carry: 0, rise: 0 };
  let leftAt = 0, was = '';
  const follower = createFollower();
  // A stride's legs, arms and trunk are drawn a little softened, as they always have been (STRIDE_EASE).
  const strode = { ...STANDING };
  let wasScripted = false, blendT = 0;
  const blendFrom = { ...STANDING }, lastScripted = { ...STANDING };
  // The idles: a shuffled bag, so that no two rounds go the same way, and a quiet gap of its own before each.
  const random = seeded(7), bag: IdleAct[] = [];
  let act: IdleAct | null = null, actAt = 0, nextAt = FIRST, stretchedAt = -Infinity, last: IdleAct | null = null;
  let ruffle = 0, blown = 0;
  const acted = { ...STANDING }, standing = { ...STANDING };
  const draw = (): IdleAct => {
    if (bag.length === 0) {
      bag.push('look', 'rock', 'scratch', 'leaf', 'tap');
      for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!]; }
      if (bag[bag.length - 1] === last) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1]!, bag[0]!];
    }
    return last = bag.pop()!;
  };
  return {
    /** The idle playing now, if any. */
    get idling(): IdleAct | null { return act; },
    /** A hand in his hair: −1 to 1 while he scratches his head. */
    get ruffle(): number { return ruffle; },
    /**
     * `wind` is the shared wind where he stands (`windAt`, ./wind.ts): standing in a strong one, he leans into it with
     * an arm up. It never moves the simulation, and with `calm` (reduced motion) he stands quite still.
     */
    update(player: PlayerState, x: number, dt: number, scripted: Pose | null, wave = 0, calm = false, wind = 0, tall = 1, legs?: Legs): Pose {
      const leg = legs ? 2 * (legs.thigh + legs.shin) : STEP_LEG;
      const travel = lastX === null ? 0 : x - lastX, distance = Math.abs(travel), previousMode = lastMode;
      const climb = lastMode === 'climb' && player.mode === 'climb' ? player.y - lastY : 0;
      // Assisted arcs move a kinematic body: its reported velocity stays zero.
      const vy = player.mode === 'fly' && previousMode === 'fly' && dt > 0 ? (player.y - lastY) / dt : player.vy;
      const airborne = player.mode === 'free' || player.mode === 'fly', wasY = lastY;
      lastX = x; lastY = player.y; lastMode = player.mode;
      if (scripted) {
        grounded = player.grounded; free = false; landing = 0; impact = 0; idle = 0; speed = 0;
        // Into a scene, and from one act to the next, he moves over a moment instead of in one frame; once there he
        // holds the scene's pose exactly.
        if (!wasScripted || JOINTS.some((joint) => Math.abs(scripted[joint] - lastScripted[joint]) > 0.25)) {
          Object.assign(blendFrom, pose);
          blendT = 0;
        }
        wasScripted = true;
        Object.assign(lastScripted, scripted);
        blendT += Math.max(0, dt);
        landed = Infinity;
        const held = blendT >= SCRIPT_BLEND || calm ? Object.assign(pose, scripted) : blendPose(blendFrom, scripted, smooth(blendT / SCRIPT_BLEND), pose, true);
        // Out of the scene, he goes on from the scene's pose.
        follower.reset(held);
        return held;
      }
      const unscripted = wasScripted;
      wasScripted = false;
      if (dt <= 0) return pose;
      const walking = player.mode === 'free' && player.grounded;
      // Carried (a ride, an assisted arc, the glitter bubble) he goes as fast as what carries him: that is no teleport.
      const carried = player.mode === 'ride' || player.mode === 'fly' || player.mode === 'bubble';
      // (Taking hold of a hose or a ledge puts him a little way along to it: that is no teleport either.)
      const continuous = carried || distance <= Math.max(RUN_SPEED * 2, Math.abs(player.vx) * 1.5) * dt + 0.35;
      const pace = walking && free && continuous ? clamp(distance / (dt * RUN_SPEED)) : 0;
      // Filter measured travel before taking acceleration, so interpolation does not shake the torso.
      const before = speed;
      speed = walking && free && continuous && !player.atEdge ? speed + (travel / dt - speed) * (1 - Math.exp(-16 * dt)) : 0;
      const acceleration = walking && free && continuous && !player.atEdge
        ? Math.max(-1, Math.min(1, (speed - before) * RUN_AFTER / (dt * RUN_SPEED))) : 0;
      const braking = Math.abs(speed) < Math.abs(before) ? Math.abs(acceleration) : 0;
      // Turned about while still going the old way, he plants and skids: the legs do not stride backwards.
      const skid = walking && travel * player.facing < -1e-4;
      if (pace > 0 && !skid) phase += strideRate(distance, pace, tall);
      if (Math.abs(climb) <= CLIMB_SPEED * dt * 3 + 0.05) phase += climb * 7;
      if (!continuous) { phase = 0; landing = 0; landed = Infinity; impact = 0; speed = 0; Object.assign(pose, STANDING); follower.reset(); }
      // A running jump leads with the foot already ahead. Keep that choice through the whole flight.
      if (airborne && !player.grounded && grounded) {
        lead = pose.legL >= pose.legR ? 1 : -1;
        // A jump pushes off; a step off a ledge does not.
        air.t = 0; air.pushed = player.mode === 'fly' || vy > 0.35 * JUMP_SPEED; air.carry = clamp(distance / (dt * RUN_SPEED)); leftAt = wasY;
      } else if (airborne && !player.grounded) air.t += dt;
      air.rise = airborne && !player.grounded ? player.y - leftAt : 0;
      // Stepping off a ride, a hose or the finished clamber is not a fall onto the ground.
      if (walking && !grounded && (previousMode === 'free' || previousMode === 'fly') && impact > 0 && continuous) {
        landing = 0.2 + 0.8 * clamp(impact / JUMP_SPEED);
        landed = 0;
        // Landing on the run, the leading foot is the one that comes down: the stride goes on from its heel strike.
        if (pace > 0.05) phase = lead > 0 ? Math.PI / 2 : Math.PI * 1.5;
      } else landed += dt;
      impact = airborne && !player.grounded ? Math.max(impact, -vy) : 0;
      grounded = player.grounded; free = walking;
      // The give on landing: through the knees and hips first, deepest a moment after he comes down, on from the knees'
      // bend as he reached for the ground.
      const absorb = landing > 0 ? READY * Math.exp(-landed / 0.2) + landing * give(landed, GIVE) : 0;
      playerPose(player.mode === 'fly' ? { ...player, vy } : player, phase, skid ? 0 : pace, absorb, target, leg, air);
      if (airborne && !player.grounded && air.pushed && air.t < PUSH && !calm) {
        // Through the dip and the push the body is drawn with its feet on the ground, and goes up after them.
        target.bounce = -(air.rise ?? 0) / Math.max(0.2, tall) * 5.2 * (1 - smooth(air.t / PUSH));
      }
      if (walking && landed < 1.5 && !calm) {
        // The trunk a moment after the legs: it goes on down over them and comes up again, the head after it; the arms
        // come down from the air past where they hang.
        const late = landing * give(landed - TRUNK_LATE, TRUNK_GIVE);
        target.lean += 0.3 * late; target.nod += 0.16 * late;
        target.armL -= 0.25 * late; target.armR -= 0.2 * late; target.elbowL += 0.15 * late; target.elbowR += 0.15 * late;
      }
      if (airborne && !player.grounded && lead < 0) {
        [target.legL, target.legR] = [target.legR, target.legL];
        [target.kneeL, target.kneeR] = [target.kneeR, target.kneeL];
        [target.armL, target.armR] = [target.armR, target.armL];
        [target.elbowL, target.elbowR] = [target.elbowR, target.elbowL];
      }
      if (player.mode === 'swing' && previousMode === 'swing') {
        // On the lace he pumps as a child on a swing does: legs out ahead going forward, tucked back with bent knees
        // on the way back, the body leaning against them.
        const v = (travel / dt) * player.facing / 4, going = clamp(v) - clamp(-v);
        target.legL += 0.4 * going; target.legR += 0.4 * going;
        target.kneeL += 0.45 * Math.max(0, -going); target.kneeR += 0.45 * Math.max(0, -going);
        target.lean -= 0.08 * going;
      }
      if (walking && !player.atEdge && pace > 0 && !calm) {
        // The hips, trunk, head and hands go with his stride as the family's do (./gait.ts, keyed in Blender for a small
        // boy): over the standing foot and tipped away from the swinging one, the head level against it, the hands trailing.
        // His left heel comes down a quarter turn on from the family's.
        const run = smooth((pace - 0.35) / 0.65), at = phase - Math.PI / 2, k = Math.min(1, pace * 1.6);
        const curve = (pick: (g: Gait) => Series, x: number) => series(pick(BOY.walk), x) * (1 - run) + series(pick(BOY.run), x) * run;
        target.sway += curve((g) => g.sway, at) * 5.2 * k;
        target.hipRoll += curve((g) => g.roll, at) * k;
        target.bendSide += curve((g) => g.side, at) * k;
        target.tilt += curve((g) => g.tilt, at) * k;
        target.wristL += curve((g) => g.wrist, at) * k;
        target.wristR += curve((g) => g.wrist, at + Math.PI) * k;
      }
      if (walking && !player.atEdge) {
        // Lean into a start or a change of direction; plant and soften both knees while stopping.
        const weight = calm ? (skid ? 0.3 : 0.45) : 1, drive = acceleration * player.facing;
        // Turned about while still going the old way, he leans hard into the new way.
        target.lean += drive * (skid ? 0.3 : 0.18) * weight; target.nod -= drive * 0.08 * weight;
        target.legL += braking * 0.12; target.legR += braking * 0.12;
        target.kneeL += braking * 0.28; target.kneeR += braking * 0.28;
        target.armL += braking * 0.18 * weight; target.armR += braking * 0.18 * weight;
      }
      idle = walking && pace === 0 && !player.atEdge && wave <= 0 ? idle + dt : 0;
      ruffle = 0;
      if (idle === 0) { act = null; nextAt = FIRST + random() * 1.2; stretchedAt = -Infinity; }
      blown = calm ? 0 : blown + (wind - blown) * -Math.expm1(-dt / .35);
      if (!calm && idle > 0.4 && legs) {
        // Waiting, he stands as a small boy stands (./gait.ts): the weight onto one leg and the other, the other knee easy.
        // A little idle of his own lifts it while it plays.
        stand(standing, idle, STANDS.bertil, legs, false, smooth((idle - 1.2) / 1.5) * (act ? 0.35 : 1));
        for (const joint of STOOD) target[joint] += standing[joint] - STANDING[joint];
      }
      if (!calm && idle > 0.4) {
        const breath = Math.sin(idle * 1.8) * smooth((idle - 0.4) / 0.8);
        target.lean += breath * 0.015; target.nod += breath * 0.025;
        target.turn = Math.sin(idle * 0.65) * smooth((idle - 2) / 2) * 0.06;
        // A strong wind where he stands: he leans into it, braced, with the nearer arm up before his face (or on his
        // hair, with the wind at his back). It pauses the little idles while it blows. A gust blows to the left, against
        // the way he goes (./wind.ts); the breaths that pass to the right lay the grass over, and it takes a storm's
        // for him to brace against one.
        const windy = smooth(blown < 0 ? (-blown - 1.7) / 1.1 : (blown - 3.4) / 1) * smooth((idle - .25) / .3);
        if (act && idle - actAt >= IDLES[act]) { act = null; nextAt = idle + 1.6 + random() * 2.6; }
        if (!act && idle >= nextAt && windy < .05) {
          act = idle >= STRETCH && idle - stretchedAt > 30 ? 'stretch' : draw();
          if (act === 'stretch') stretchedAt = idle;
          actAt = idle;
        }
        const near = player.facing > 0 ? 1 : -1;
        if (act) {
          const rub = idlePose(act, idle - actAt, near, Object.assign(acted, target)), k = 1 - windy;
          for (const joint of JOINTS) target[joint] += (acted[joint] - target[joint]) * k;
          ruffle = rub * k;
        }
        if (windy > 0) {
          const into = -Math.sign(blown) * player.facing > 0, arm = near > 0 ? 'armR' : 'armL', elbow = near > 0 ? 'elbowR' : 'elbowL';
          target.lean += (into ? .17 : -.07) * windy; target.nod += (into ? .14 : -.05) * windy;
          // The forearm folds ahead of the upper arm, so the hand comes up by his face rather than reaching out.
          target[arm] += ((into ? 2.25 : 2.6) - target[arm]) * windy; target[elbow] += ((into ? 1.9 : 2.05) - target[elbow]) * smooth(windy * 1.6);
          const { hip, knee } = onToe(-.07 * windy);
          target.legL += hip; target.legR += hip; target.kneeL += knee; target.kneeR += knee;
        }
      }
      if (wave > 0 && walking) {
        target.armR = 2; target.elbowR = 0.7 + (calm ? 0 : Math.sin(wave * 22) * 0.3);
      }
      // On his feet he is drawn softened, as he always has been; whatever jumps (off the ground, onto it, onto a hose) the
      // follower takes up.
      const ease = walking && continuous ? 1 - Math.exp(-STRIDE_EASE * dt) : 1;
      for (const joint of JOINTS) strode[joint] += (target[joint] - strode[joint]) * ease;
      for (const joint of JOINTS) target[joint] = strode[joint];
      // A new state of the body (off the ground or onto it, onto a hose or a ledge, a skid, an edge, a wave, out of a scene)
      // is taken up by the follower from what was drawn.
      const doing = `${player.mode}:${player.grounded}:${skid}:${!!player.atEdge}:${wave > 0}`;
      // Leaving the ground in a jump, the legs go down into the dip at once, and the arms back.
      follower.follow(target, dt, pose, doing !== was || unscripted, airborne && !player.grounded && air.pushed && air.t === 0 ? 1.8 : 1);
      was = doing;
      // A story's explicit seat ends with its act; locomotion is supported by the actual posed soles.
      pose.seat = null;
      return pose;
    },
  };
}

/** Public rehearsal figure: the same face, hair, colours and backpack, with two joints in each limb. */
export function createPlayerStandIn() {
  const group = new Group(), figure = new Group(), body = new Group();
  figure.name = 'player-figure';
  body.position.y = 0.4;
  group.add(figure); figure.add(body);
  const material = (color: string) => new MeshStandardMaterial({ color, roughness: 0.9 });
  const shirt = material('#9db9e3'), jeans = material('#2f4b7c'), boot = material('#6b4a2e');
  const skin = material('#f2cba8'), hair = material('#ecc967');
  const leg = (z: number) => {
    const hip = new Group(), knee = new Group();
    hip.position.set(0, 0.4, z); knee.position.y = -0.19;
    const thigh = new Mesh(new BoxGeometry(0.12, 0.17, 0.12), jeans); thigh.position.y = -0.105;
    const shin = new Mesh(new BoxGeometry(0.12, 0.15, 0.12), jeans); shin.position.y = -0.085;
    const foot = new Mesh(new BoxGeometry(0.2, 0.09, 0.13), boot); foot.position.set(0.035, -0.165, 0);
    knee.add(shin, foot); hip.add(thigh, knee); figure.add(hip);
    return { hip, knee };
  };
  const legs = [leg(-0.075), leg(0.075)];
  const torso = new Mesh(new CapsuleGeometry(0.15, 0.16, 6, 14), shirt); torso.position.y = 0.14;
  const head = new Mesh(new SphereGeometry(0.19, 20, 14), skin); head.position.y = 0.41;
  head.name = 'player-head';
  const hairTop = new Mesh(new SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairTop.position.set(-0.012, 0.43, 0);
  const fringe = new Mesh(new ConeGeometry(0.075, 0.18, 8), hair); fringe.position.set(0.13, 0.585, 0); fringe.rotation.z = -0.85;
  const backpack = new Mesh(new BoxGeometry(0.13, 0.24, 0.22), material('#6f6a40')); backpack.position.set(-0.19, 0.16, 0);
  const neck = new Group(); neck.position.y = 0.3;
  for (const part of [head, hairTop, fringe]) { part.position.y -= 0.3; neck.add(part); }
  // The fringe bends about its root on the brow; the hair's crown turns a little with it.
  const sway = createSway(), root = new Vector3(0.13 - 0.09 * Math.sin(0.85), 0.285 - 0.09 * Math.cos(0.85), 0);
  body.add(torso, neck, backpack);
  const arm = (z: number) => {
    const shoulder = new Group(), elbow = new Group();
    shoulder.position.set(0.02, 0.245, z); elbow.position.y = -0.145;
    const upper = new Mesh(new CapsuleGeometry(0.045, 0.055, 4, 8), shirt); upper.position.y = -0.0725;
    const lower = new Mesh(new CapsuleGeometry(0.045, 0.055, 4, 8), shirt); lower.position.y = -0.0725;
    elbow.add(lower); shoulder.add(upper, elbow); body.add(shoulder);
    return { shoulder, elbow };
  };
  const arms = [arm(-0.19), arm(0.19)];
  const handTip = new Vector3(0, -.145, 0);
  const contacts = arms.map(arm => createArmContact(arm.shoulder, arm.elbow, handTip));
  for (const [i, side] of ['left', 'right'].entries()) {
    legs[i]!.hip.name = `player-hip-${side}`; legs[i]!.knee.name = `player-knee-${side}`;
    legs[i]!.knee.children[1]!.name = `player-boot-${side}`;
    arms[i]!.shoulder.name = `player-shoulder-${side}`; arms[i]!.elbow.name = `player-elbow-${side}`;
  }
  // The doll's raincoat in Stormnatten (./elof-coat.ts): over his body with its hood on his back, and over each arm's
  // upper arm and forearm, each shown as the coat comes over it. Made the first time it is worn.
  let coat: { back: Group; sleeves: Group[]; material: MeshStandardMaterial } | null = null;
  const makeCoat = () => {
    const material = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.42 });
    const back = new Group();
    const trunk = new Mesh(new CapsuleGeometry(0.168, 0.2, 6, 14), material); trunk.position.y = 0.12;
    const hem = new Mesh(new ConeGeometry(0.205, 0.2, 14, 1, true).translate(0, -0.1, 0), material); hem.position.y = 0.02;
    const hood = new Mesh(new SphereGeometry(0.11, 12, 8).scale(0.55, 0.7, 1), material); hood.position.set(-0.15, 0.33, 0);
    back.add(trunk, hem, hood);
    body.add(back);
    const sleeves = arms.map((arm) => {
      const sleeve = new Group();
      const upper = new Mesh(new CapsuleGeometry(0.056, 0.06, 4, 8), material); upper.position.y = -0.0725;
      const lower = new Mesh(new CapsuleGeometry(0.054, 0.05, 4, 8), material); lower.position.y = -0.066;
      arm.shoulder.add(upper); arm.elbow.add(lower);
      sleeve.userData.parts = [upper, lower];
      return sleeve;
    });
    return { back, sleeves, material };
  };
  let disposed = false;
  return {
    group,
    /**
     * The doll's coat on, as far as it is on, or off with null (./rain-gear.ts). Each part takes it as the coat comes over
     * it, in the family's order (COAT_ORDER): the first forearm and upper arm, the body, the other arm.
     */
    dress(gear: RainGear | null) {
      if (!gear && !coat) return;
      coat ??= makeCoat();
      const share = gear?.on?.coat ?? 1, first = gear?.first ?? 0;
      const sleeve = (side: number, k: number) => {
        const [from, to] = side === first ? COAT_ORDER.sleeve : COAT_ORDER.otherSleeve;
        return from + (to - from) * k;
      };
      coat.back.visible = gear !== null && share >= (COAT_ORDER.back[0] + COAT_ORDER.back[1]) / 2;
      coat.sleeves.forEach((sleeveOf, i) => {
        const [upper, lower] = sleeveOf.userData.parts as Mesh[];
        upper!.visible = gear !== null && share >= sleeve(i, 1);
        lower!.visible = gear !== null && share >= sleeve(i, 0.4);
      });
      if (gear) coat.material.color.set(gear.coat);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const materials = new Set<MeshStandardMaterial>();
      figure.traverse(object => {
        if (!(object instanceof Mesh)) return;
        object.geometry.dispose();
        materials.add(object.material as MeshStandardMaterial);
      });
      materials.forEach(material => material.dispose());
    },
    hand(side: 0 | 1, out: Vector3) { return arms[side]!.elbow.localToWorld(out.copy(handTip)); },
    mouth(out: Vector3) { return neck.localToWorld(out.set(.17, .1, 0)); },
    /** The wind in his hair (`windAt` where he stands), and a hand in it: secondary motion, never the simulation. */
    breeze(wind: number, dt: number, still: boolean, ruffle = 0) {
      // Paused (no time passing), the hair holds exactly as it is.
      if (dt <= 0) return;
      const angle = sway.step(wind, dt, still), e = neck.matrixWorld.elements;
      // His front is +x: a wind from behind lays the fringe forward, one in his face lifts it.
      const ahead = e[0]! / (Math.hypot(e[0]!, e[1]!, e[2]!) || 1), turn = still ? 0 : -ahead * angle * 1.3 + ruffle * .22;
      fringe.rotation.z = -0.85 + turn;
      fringe.position.set(root.x + 0.09 * Math.sin(0.85 - turn), root.y + 0.09 * Math.cos(0.85 - turn), 0);
      hairTop.rotation.z = still ? 0 : -ahead * angle * .35 + ruffle * .06;
    },
    reach(side: 0 | 1, target: Vector3, weight = 1) { contacts[side]!(target, weight); },
    pose(p: Pose) {
      body.rotation.z = -p.lean;
      neck.rotation.z = -p.nod;
      neck.rotation.y = p.turn;
      let lowest = Infinity;
      for (const [i, hipAngle, kneeAngle, armAngle, elbowAngle] of [
        [0, p.legL, p.kneeL, p.armL, p.elbowL], [1, p.legR, p.kneeR, p.armR, p.elbowR],
      ] as const) {
        legs[i]!.hip.rotation.z = hipAngle; legs[i]!.knee.rotation.z = -kneeAngle;
        arms[i]!.shoulder.rotation.set((i === 0 ? 1 : -1) * p.spread, 0, armAngle);
        arms[i]!.elbow.rotation.set(0, 0, elbowAngle);
        const angle = hipAngle - kneeAngle;
        // The full boot's four sole corners, not just its ankle; a turned toe never enters the floor.
        lowest = Math.min(lowest, 0.4 - 0.19 * Math.cos(hipAngle) + 0.035 * Math.sin(angle) - 0.165 * Math.cos(angle)
          - 0.1 * Math.abs(Math.sin(angle)) - 0.045 * Math.abs(Math.cos(angle)));
      }
      figure.position.y = (p.seat === null ? -lowest : p.seat / 5.2 - 0.4) + p.bounce / 5.2;
    },
  };
}
