import { BoxGeometry, CapsuleGeometry, ConeGeometry, Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { CLIMB_SPEED, JUMP_SPEED, RUN_AFTER, RUN_SPEED } from '../sim/constants';
import type { PlayerState } from '../sim/types';
import { blendPose, createSway, JOINTS, STANDING, type Legs, type Pose } from './rig';
import { ankleOf, createFooting, reachWith, rolled, stand, stepOf, stride, type Gait, type Strider } from './gait';
import { GAITS, STANDS } from './motion-data';

/**
 * A small boy's walk and run, as Bertil's are keyed in Blender (./motion-data.ts): Elof strides as he does, on shorter legs
 * in bigger boots. His boots are two thirds as long as his legs (the family's shoes are under half): rolled from heel to
 * toe as far as Bertil rolls his, and lifted as high, the ankle came up half his leg's length and the knee past a right
 * angle, as in a march. He rolls them less and lifts them less, so that the knee bends about as far as a walking child's;
 * and his leg, reaching for the ground at the end of a step, straightens softly instead of stopping straight in a frame.
 */
const own = (gait: Gait, lift: number, clear: number, roll: number, soft: number, toes = 0): Gait => ({
  ...gait, lift, clear, soft,
  // (Toes up as the heel comes down and for a moment each side of it: a raised cosine, cubed, as its Fourier series.)
  pitch: gait.pitch.map((value, i) => value * roll + toes * ([0.3125, 0.46875, 0, 0.1875, 0, 0.03125][i] ?? 0)),
});
/**
 * Running, his foot comes down far ahead for his legs, on its heel with the toes up, as the stride rolls a foot to reach
 * the ground (./gait.ts): it comes in through the air with its toes up already. Level until it touched, it flicked up
 * in the frame it landed.
 */
const BOY: Strider = { walk: own(GAITS.bertil.walk, 0.022, 0.13, 0.4, 0.06), run: own(GAITS.bertil.run, 0.05, 0.16, 0.5, 0.08, 0.3) };
/**
 * Walked somewhere by a scene (its `walk` act, ./acting.ts), he takes his own steps on his own legs: at a trot, this many
 * of his heights a second, whatever way the scene moves him. (He strode as Pappa does, on the rehearsal figure's legs.)
 */
export const SCENE_WALK = { strider: BOY, gait: 1 } as const;
/** What standing gives him while he waits: the legs on the ground, the hips over them, the trunk and head. */
const STOOD = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'sway', 'hipRoll', 'bendSide', 'tilt'] as const;
import { createArmContact } from './arm-contact';
import { drawnWhile } from './idle';
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
 * The public figure's legs (createPlayerStandIn), as shares of its height: his stride is fitted to the legs he has, these
 * or his model's own (Rig.legs), so that a planted foot stays where it came down (./gait.ts).
 */
export const STAND_IN_LEGS: Readonly<Legs> = { hip: 0.4, thigh: 0.19, shin: 0.165, ankle: 0.045, heel: 0.065, toe: 0.135, width: 0.075 };

/** Going slower than this (his own heights a second), his steps get no shorter: he takes them more slowly. */
const SLOW = 0.3;
/**
 * His steps are a little shorter than the family's for their legs, and he takes more of them: his legs are short under a
 * big head, and a step as long as theirs put his foot down far ahead of him, the hips sinking between his feet at each
 * one. In a sprint (from SPRINT) they are as long as theirs.
 */
const SHORT_STEPS = 0.85;

/** From how fast (his own heights a second) he sprints, and how much further forward the trunk goes then, the head held up against it. */
const SPRINT = 1.6, SPRINT_LEAN = 0.07, SPRINT_NOD = 0.05;

/**
 * How he strides at `speed`, in his own heights a second, on `legs`. He is as big as a thumb out in the world and three
 * times that at home, and goes as fast in EL either way: it is how fast he goes for his size that says how he moves.
 * `step`: how long a step is, in his heights, longer as he goes faster and fitted to his legs. `run`: how far it is a run
 * (0 a walk), from about three leg lengths a second, as the family's is (./acting.ts): short legs have to run sooner.
 * `amount`: how much of the stride's own motion there is, the arms' swing, the trunk's lean and the hips' rise and fall.
 */
export function strideAt(speed: number, legs: Legs = STAND_IN_LEGS): { step: number; run: number; amount: number } {
  const gait = Math.max(0, speed);
  return {
    step: stepOf(Math.max(gait, SLOW), legs) * (SHORT_STEPS + (1 - SHORT_STEPS) * smooth((gait - SPRINT) / SPRINT)),
    run: smooth((gait / legs.hip - 2.15) / 1.1),
    amount: gait <= 1e-6 ? 0 : 0.65 + 0.35 * smooth((gait - 0.1) / 0.3),
  };
}

/** Setting off, he leans into it only as far as this, with the stride's own lean (radians): never bent far over. */
const LEAN_MOST = 0.3;

/** The trunk in a sprint: a little further into it than a run's own lean, looking ahead. */
function sprinting(out: Pose, speed: number, amount: number): void {
  const sprint = smooth((speed - SPRINT) / SPRINT) * amount;
  out.lean += SPRINT_LEAN * sprint; out.nod -= SPRINT_NOD * sprint;
}

/** How far the hips come down when both knees bend `bend` (radians) from straight, in the body's heights. */
const dropOf = (bend: number, legs: Legs) => {
  const thigh = legs.thigh, shin = legs.shin;
  return thigh + shin - Math.sqrt(thigh * thigh + shin * shin + 2 * thigh * shin * Math.cos(Math.max(0, Math.min(2.4, bend))));
};

/**
 * The hips come down `drop` (heights) over feet that stay where they are, each tipped as it was: both knees give, and
 * the thighs come forward by as much as keeps the soles on the ground (a landing's give, a stop's).
 */
function sink(pose: Pose, legs: Legs, drop: number): void {
  if (drop <= 1e-6) return;
  const least = 0.35 * (legs.thigh + legs.shin);
  for (const side of [0, 1] as const) {
    const at = ankleOf(pose, side, legs);
    reachWith(at.ahead, Math.max(Math.min(at.down, least), at.down - drop), at.out, at.pitch, legs, pose, side);
  }
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
/** How far up the body goes over feet still on the ground as the legs push (EL at size 1): then the feet go too. */
const PUSH_REACH = 0.3;

/**
 * Where a jump is: how long since he left the ground, whether he jumped (rather than stepped off), how fast he went along
 * (a share of a run), and how far he has risen since. `step`: the ground lifted him over a low step as he walked (the
 * game takes him up one in a little hop of its own): that is a step up, not a jump.
 */
export interface Air { t: number; pushed: boolean; carry: number; rise?: number; step?: boolean }

/** A jump leaves the ground faster than this share of a jump's speed; the lift over a step he walks up is slower. */
const JUMPED = 0.7;
/** Off an edge, the arms come out for balance once the fall has lasted this long, over this long (seconds): not in a kerb's. */
const BALANCE_AFTER = 0.08, BALANCE_OVER = 0.16;

/**
 * In the air, as a small boy jumps (the leading leg is the left one here; the caller mirrors it): a dip and a push off his
 * toes with the arms swung up, the knees tucking as he rises to the top with the arms out for balance, and the legs
 * opening to reach for the ground as he falls, the leading foot ahead as far as he is going forward, the head down to
 * where he lands. Stepping off a ledge he does not push: the legs reach down from where they were, and the arms come out
 * only as the fall lasts. Up a step he walks, he steps: the leading knee up and its foot onto it, the other leg pushing
 * off behind, the arms as they swing in a walk.
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
  // The trailing ankle opens too: pointing its toe down makes it touch before the leading heel and drag on landing.
  out.footL = mix(-0.3, kneeLead - legLead); out.footR = mix(-0.45, kneeTrail - legTrail);
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
  if (!air.pushed) {
    // No jump: the arms stay down by his sides, the one against the leading leg ahead, and come out as a fall lasts.
    const balance = air.step ? 0 : smooth((air.t - BALANCE_AFTER) / BALANCE_OVER);
    const low = (joint: 'armL' | 'armR' | 'elbowL' | 'elbowR' | 'spread' | 'wristL' | 'wristR', value: number) => { out[joint] = value + (out[joint] - value) * balance; };
    low('armL', -0.2 - 0.25 * m); low('armR', 0.3 + 0.3 * m); low('elbowL', 0.35 + 0.4 * m); low('elbowR', 0.4 + 0.4 * m);
    low('spread', 0.06); low('wristL', 0); low('wristR', 0);
  }
  if (air.step) {
    // Up a step: the leading foot comes up level onto it, the knee high, and reaches down for it as he comes over; the
    // other leg is left behind, its toes down. He looks where he puts his foot.
    const up = clamp(0.5 + vy / (0.5 * JUMP_SPEED));
    out.legL = 0.5 + 0.3 * up; out.kneeL = 0.55 + 0.5 * up; out.footL = out.kneeL - out.legL;
    out.legR = -0.22; out.kneeR = 0.14; out.footR = -0.3;
    out.lean = 0.08; out.nod = 0.1; out.twist = 0;
  }
  // Jumping on the run, he keeps leaning the way he goes, as far as he is going, instead of straightening up in the air.
  out.lean += 0.14 * m;
}

/**
 * One pose language for the rounded public figure and the approved model's named bones. On his feet he strides as the
 * family do (./gait.ts): `phase` is the stride's (π a step, the left heel down at 0), `speed` how fast he goes in his own
 * heights a second, and `legs` the legs he has, which the stride is fitted to. `landing`: how far his knees give (radians).
 * `air`: where a jump is (left out, the arc alone, as at its top: no push, the legs tucked by how near the top he is).
 */
export function playerPose(player: MotionState, phase: number, speed: number, landing: number, out: Pose, legs: Legs = STAND_IN_LEGS, air?: Air): Pose {
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
    // His feet are put down where each step needs them and the legs reach them, the knee giving as the weight comes on:
    // the foot comes down a little ahead of him with the trunk over it, leaning a little the way he goes and more as he
    // goes faster. (With straight legs swung from the hip and the trunk upright over them, he looked to lean back: Olov,
    // 14 November 2026, "Ibland lutar Elof sig väldigt mycket bakåt när han går".)
    const { step, run, amount } = strideAt(speed, legs);
    stride(out, phase, step, amount, run, BOY, legs);
    sprinting(out, speed, amount);
    // Landing, the hips come down over the feet, the soles flat where they are.
    sink(out, legs, dropOf(landing, legs));
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

/** What a stride places on the ground: its legs, and the hips over them. */
const PLACED: ReadonlySet<Joint> = new Set<Joint>(['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'sway', 'hipRoll']);
/** A knee and an elbow bend one way only. */
const HINGES: ReadonlySet<Joint> = new Set<Joint>(['kneeL', 'kneeR', 'elbowL', 'elbowR']);

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
    /**
     * Forget how it was moving: the next pose is drawn as asked (a cut); or, with `pose`, the body is held there, still (a
     * pose given from elsewhere, as a scene's), and goes on from it.
     */
    reset(pose?: Pose): void {
      if (!pose) { fresh = true; return; }
      for (const joint of JOINTS) {
        drawn[joint] = asked[joint] = pose[joint];
        speed[joint] = step[joint] = off[joint] = offSpeed[joint] = 0;
      }
      pending.clear();
      fresh = false;
    },
    /**
     * Takes `target` (what is asked) over `dt` seconds into `out`; `jumped`: the body has just changed what it does, and
     * `quick` times as quickly as the joints' own rates it takes that up (a jump's dip: down into the knees at once).
     * `firm`: the legs are a stride's, fitted to the ground, and are drawn as it has them however fast they go: a heel
     * coming down stops a knee in a frame, and taken for a jump, the knee went on past straight at the speed it had.
     */
    follow(target: Pose, dt: number, out: Pose, jumped = false, quick = 1, firm = false): Pose {
      const jump = JUMP * (dt * 60) ** 2;
      for (const joint of JOINTS) {
        const x = target[joint];
        if (fresh || dt <= 0) {
          drawn[joint] = x; speed[joint] = off[joint] = offSpeed[joint] = step[joint] = 0; asked[joint] = x;
          pending.delete(joint);
          continue;
        }
        const now = x - asked[joint];
        if (pending.has(joint) && !jumped) {
          // The frame after a jump: how fast what is asked now goes is known, and the body keeps its own speed. (Unless
          // the body changes what it does again in that frame, as when he comes down and strides on in the next: taken for
          // how fast the new pose goes, that second jump threw the joint on at a hundred radians a second.)
          offSpeed[joint] = speed[joint] - now / dt;
          step[joint] = now;
          pending.delete(joint);
        } else if (jumped || (!(firm && PLACED.has(joint)) && Math.abs(now - step[joint]) > jump)) {
          // A jump: the body goes on from where it was at the speed it had.
          off[joint] = drawn[joint] + speed[joint] * dt - x;
          offSpeed[joint] = speed[joint] - step[joint] / dt;
          rate[joint] = CATCH[joint] * (jumped ? quick : 1);
          pending.add(joint);
          asked[joint] = x;
          // (Carried on past straight, a knee or an elbow stops there.)
          if (HINGES.has(joint) && x >= 0 && x + off[joint] < 0) off[joint] = -x;
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
        if (HINGES.has(joint) && x >= 0 && x + off[joint] < 0) { off[joint] = -x; offSpeed[joint] = Math.max(0, offSpeed[joint]); }
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

/** How quickly the speed his stride goes by follows the speed he goes at, a second: a stride changes over a step, not in a frame. */
const GAIT_EASE = 14;
/** How quickly the stride's own motion comes in as he sets off, and dies away once he has stopped, a second. */
const AMOUNT_EASE = 16, SETTLE = 7;
/**
 * How quickly a walk becomes a run and a run a walk, a second. The game takes him from a run to nothing in a few frames;
 * a walk has each foot down for longer than a run, and changed as fast as his speed, a foot high in a run's swing was
 * on the ground a frame later.
 */
const RUN_EASE = 6;
/** The most steps a second his stride counts: setting off into a sprint, the game has him at full speed before a child could take two. */
const CADENCE = 6.2;

/** A foot as a stop finds it: where it stands flat, ahead of the hips (his heights), or would if it were down; how it is
 * tipped; how far off the ground it is; how far out from under its hip; and how far it is still carried on ahead. */
interface Halted { flat: number; pitch: number; raise: number; out: number; carry: number; planted: boolean; seconds: number }
const rolling = { x: 0, y: 0 };

/**
 * Stopped, his feet come together under him. The game stops him within a few frames, wherever his stride is: a foot in the
 * air, or one far ahead and the other behind. He does not slide them home, and he does not stand with a foot out ahead
 * of him, the trunk behind it: the foot in the air comes down under his hips, then the one behind steps up beside it, and
 * one left ahead steps back, each a small low step with the weight over the other foot. One for each body that walks.
 */
function createGather() {
  const feet: [Halted, Halted] = [
    { flat: 0, pitch: 0, raise: 0, out: 0, carry: 0, planted: true, seconds: 0 },
    { flat: 0, pitch: 0, raise: 0, out: 0, carry: 0, planted: true, seconds: 0 },
  ];
  let active = false, t = 0, first: 0 | 1 = 0, hips = 0, bounce = 0;
  /** How long the hips and the soles take to come level, in seconds. */
  const LEVEL = 0.14;
  return {
    get active(): boolean { return active; },
    reset(): void { active = false; },
    /**
     * From the stride as it was last drawn (`pose`, its legs), with `down`: which feet it had on the ground, and
     * `speeds`: how fast each ankle was going ahead of the hips (heights a second).
     */
    begin(pose: Pose, legs: Legs, down: readonly [boolean, boolean], speeds: readonly [number, number]): void {
      active = true; t = 0; bounce = pose.bounce;
      const ankles = [ankleOf(pose, 0, legs), ankleOf(pose, 1, legs)] as const;
      // How high the hip joints are over the ground: over the feet that stand on it, or else over the lower foot.
      const over = ankles.map((ankle) => ankle.down + rolled(0, ankle.pitch, legs, rolling).y);
      const standing = [0, 1].filter((side) => down[side]);
      hips = standing.length > 0 ? standing.reduce((sum, side) => sum + over[side]!, 0) / standing.length : Math.max(over[0]!, over[1]!);
      for (const side of [0, 1] as const) {
        const ankle = ankles[side], foot = feet[side];
        foot.pitch = ankle.pitch; foot.out = ankle.out; foot.planted = down[side];
        foot.flat = ankle.ahead - rolled(0, ankle.pitch, legs, rolling).x;
        foot.raise = down[side] ? 0 : Math.max(0, hips - over[side]!);
        // A step home takes longer the further it has to come; a foot that is there already takes none.
        const far = Math.abs(foot.flat) + foot.raise;
        foot.seconds = far < 0.012 && Math.abs(foot.pitch) < 0.04 ? 0 : Math.min(0.26, 0.14 + 0.7 * Math.abs(foot.flat) + 0.8 * foot.raise);
        // A foot in the air goes on a little the way it was going before it comes back under him.
        foot.carry = down[side] ? 0 : Math.max(-0.2, Math.min(0.2, speeds[side] * foot.seconds));
      }
      // The foot in the air first; with both down, the one behind; with neither, the lower.
      first = down[0] !== down[1] ? (down[0] ? 1 : 0) : down[0] ? (feet[0].flat <= feet[1].flat ? 0 : 1) : feet[0].raise <= feet[1].raise ? 0 : 1;
    },
    /** The legs `dt` seconds on, over `pose` (its trunk and arms are left as they are): whether both feet are home, where they then stay. */
    step(pose: Pose, legs: Legs, dt: number): boolean {
      t += dt;
      const second = (1 - first) as 0 | 1, most = (legs.thigh + legs.shin) * 0.998;
      const level = smooth(t / LEVEL);
      const placed = [0, 1].map((side) => {
        const foot = feet[side]!, from = side === first ? 0 : feet[first].seconds;
        const k = foot.seconds <= 0 ? 1 : clamp((t - from) / foot.seconds), e = smooth(k);
        // Home along a smooth way, carried on at first as it was going; up a little from the ground and down again, or down
        // from where it was in the air; and flat as it comes down (a foot that waits its turn settles flat at once).
        // (It is over its place a little before it is down, and comes straight down onto it: it does not scuff the last of the way.)
        const j = Math.min(1, k / 0.85);
        const flat = (2 * j * j * j - 3 * j * j + 1) * foot.flat + (j * j * j - 2 * j * j + j) * foot.carry;
        const hop = foot.planted && foot.seconds > 0 ? Math.min(0.035, 0.008 + 0.18 * Math.abs(foot.flat)) * Math.sin(Math.PI * k) ** 0.8 : 0;
        const raise = foot.raise * (1 - e) + hop;
        const pitch = foot.pitch * (1 - (foot.planted ? Math.max(level, e) : e));
        rolled(flat, pitch, legs, rolling);
        return { x: rolling.x, y: rolling.y + raise, pitch, out: foot.out * (1 - level), k, moving: k > 0 && k < 1 && foot.planted };
      });
      // The hips come up to standing as the feet come in under them: never higher than either leg reaches its foot from, in
      // the air or on the ground, so that they rise as a foot comes home, and not in the frame it lifts.
      let high = hips + (legs.hip - hips) * level;
      for (const foot of placed) high = Math.min(high, foot.y + Math.sqrt(Math.max(0, most * most - foot.x * foot.x - foot.out * foot.out)));
      placed.forEach((foot, side) => reachWith(foot.x, high - foot.y, foot.out, foot.pitch, legs, pose, side as 0 | 1));
      // The weight over the foot that stays while the other steps, and back to the middle as it comes down.
      for (const side of [0, 1] as const) {
        const foot = placed[side]!;
        if (!foot.moving) continue;
        const shift = (side === 0 ? -1 : 1) * 0.35 * Math.sin(Math.PI * foot.k) ** 0.7;
        pose.sway += shift * legs.width * 5.2; pose.hipRoll += shift * 0.05;
      }
      pose.bounce = bounce * (1 - level);
      return t >= feet[first].seconds + feet[second].seconds;
    },
  };
}

/** Setting off, the stride begins this far into a step: the first foot lifts almost at once. */
const SET_OFF_AT = 0.12;
/**
 * And its first step is a short, quick one. A stride has its standing foot come down well ahead of the hips; setting off,
 * that foot stands under them, and left to the stride's own count it would trail a whole step behind before it lifted, the
 * leg at full stretch. So the stride counts this many steps more over the first ground he covers, half as fast again as
 * the ground asks: the foot that stays lifts near where a stride lifts it, and the first foot comes down half a step ahead.
 */
const FIRST_STEP = 0.62, FIRST_QUICKER = 0.5;
/** The stride's footing, with the ground along his way measured in his own heights: ahead is +x. */
const AHEAD = Math.PI / 2;

/** Only actual travel advances a stride: blocked movement, rides and a paused view never march. */
export function createPlayerMotion() {
  const target = { ...STANDING }, pose = { ...STANDING };
  // The view can add a pull or a gesture without changing the cached motion used by paused frames
  // and by the next scene transition. Reuse the output; no per-frame allocation is needed.
  const drawn: Pose = { ...STANDING };
  let lastX: number | null = null, lastY = 0, lastMode: PlayerState['mode'] = 'free';
  let grounded = true, free = false, phase = 0, landing = 0, landed = Infinity, impact = 0, idle = 0;
  let speed = 0, lead = 1;
  // His stride (./gait.ts): how many steps it has counted, the speed it goes by (his heights a second) and how much of its
  // motion there is, how long its steps are drawn (1: as long as the speed asks), and the feet's hold on the ground.
  const footing = createFooting(), at = { x: 0, z: 0, yaw: AHEAD, height: 1, dt: 0 };
  let striding = false, steps = 0, gait = 0, amount = 0, running = 0, leftFirst = false, setOffs = 0, quick = 0;
  // Stopping: his feet's last steps home (createGather), and where each ankle was a frame ago, for how fast it goes.
  const gather = createGather(), ankleWas: [number, number] = [0, 0], ankleSpeed: [number, number] = [0, 0];
  // Where a jump is (Air), and the follower that keeps every joint from snapping between states.
  const air: Air = { t: 0, pushed: false, carry: 0, rise: 0 };
  let leftAt = 0, was = '';
  const follower = createFollower();
  // Standing, he is drawn a little softened, as he always has been (STRIDE_EASE).
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
  /** The stride lets go of the legs: the next one sets off from standing. */
  const halt = () => { striding = false; amount = 0; footing.reset(); gather.reset(); };
  return {
    /** The idle playing now, if any. */
    get idling(): IdleAct | null { return act; },
    /** A hand in his hair: −1 to 1 while he scratches his head. */
    get ruffle(): number { return ruffle; },
    /**
     * `x`: where he is drawn along the course, and `dt` the time that has passed there since the last frame (the two go
     * together: his stride is paced by how far he has come in how long). `wind` is the shared wind where he stands
     * (`windAt`, ./wind.ts): standing in a strong one, he leans into it with an arm up. It never moves the simulation, and
     * with `calm` (reduced motion) he stands quite still. `tall`: how big he is drawn, and `legs`: his model's own legs.
     */
    update(player: PlayerState, x: number, dt: number, scripted: Pose | null, wave = 0, calm = false, wind = 0, tall = 1, legs?: Legs): Pose {
      const body = legs ?? STAND_IN_LEGS, height = Math.max(0.2, tall);
      const travel = lastX === null ? 0 : x - lastX, distance = Math.abs(travel), previousMode = lastMode;
      const climb = lastMode === 'climb' && player.mode === 'climb' ? player.y - lastY : 0;
      // Assisted arcs move a kinematic body: its reported velocity stays zero.
      const vy = player.mode === 'fly' && previousMode === 'fly' && dt > 0 ? (player.y - lastY) / dt : player.vy;
      const airborne = player.mode === 'free' || player.mode === 'fly', wasY = lastY;
      // A frame in which no time passes draws him as he was, and keeps what he has travelled for the next that does.
      if (dt > 0 || scripted) { lastX = x; lastY = player.y; lastMode = player.mode; }
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
        for (const joint of JOINTS) strode[joint] = held[joint];
        halt(); gait = 0;
        return Object.assign(drawn, held);
      }
      const unscripted = wasScripted;
      wasScripted = false;
      if (dt <= 0) return Object.assign(drawn, pose);
      const walking = player.mode === 'free' && player.grounded;
      // Carried (a ride, an assisted arc, the glitter bubble) he goes as fast as what carries him: that is no teleport.
      const carried = player.mode === 'ride' || player.mode === 'fly' || player.mode === 'bubble';
      // (Taking hold of a hose or a ledge puts him a little way along to it: that is no teleport either.)
      const continuous = carried || distance <= Math.max(RUN_SPEED * 2, Math.abs(player.vx) * 1.5) * dt + 0.35;
      // On his feet again out of the air: with a fall behind him he lands (and gives); lifted up a step he walks, he only
      // arrives on it.
      const arrives = walking && !grounded && (previousMode === 'free' || previousMode === 'fly') && continuous;
      const touchesDown = arrives && impact > 0;
      // How fast he goes, in his own heights a second. The first grounded frame already travels: waiting for the previous
      // frame to be free would leave it zero here, and no running landing would stride on from its heel strike.
      const rate = walking && (free || arrives) && continuous ? distance / (dt * height) : 0;
      // Filter measured travel before taking acceleration, so interpolation does not shake the torso.
      const before = speed;
      speed = walking && free && continuous && !player.atEdge ? speed + (travel / dt - speed) * (1 - Math.exp(-16 * dt)) : 0;
      const acceleration = walking && free && continuous && !player.atEdge
        ? Math.max(-1, Math.min(1, (speed - before) * RUN_AFTER / (dt * RUN_SPEED * height))) : 0;
      const braking = Math.abs(speed) < Math.abs(before) ? Math.abs(acceleration) : 0;
      // Turned about while still going the old way, he plants and skids: the legs do not stride backwards.
      const skid = walking && travel * player.facing < -1e-4;
      // Walking: he covers ground on his feet, the way he faces.
      const moving = rate > 1e-3 && !skid && !player.atEdge;
      if (Math.abs(climb) <= CLIMB_SPEED * dt * 3 + 0.05) phase += climb * 7;
      if (!continuous) { phase = 0; landing = 0; landed = Infinity; impact = 0; speed = 0; gait = 0; halt(); Object.assign(pose, STANDING); follower.reset(); }
      // A running jump leads with the foot already ahead. Keep that choice through the whole flight.
      if (airborne && !player.grounded && grounded) {
        lead = pose.legL >= pose.legR ? 1 : -1;
        // A jump pushes off; a step off a ledge does not, nor the lift over a step he walks up. (Against a step's riser he
        // stands still for a moment as he is lifted: how fast he goes is how fast his stride was going.)
        air.t = 0; air.pushed = player.mode === 'fly' || vy > JUMPED * JUMP_SPEED; air.step = !air.pushed && vy > 0.1 * JUMP_SPEED;
        air.carry = clamp(Math.max(distance / dt, gait * height) / RUN_SPEED); leftAt = wasY;
      } else if (airborne && !player.grounded) air.t += dt;
      air.rise = airborne && !player.grounded ? player.y - leftAt : 0;
      // Stepping off a ride, a hose or the finished clamber is not a fall onto the ground.
      if (touchesDown) {
        landing = 0.2 + 0.8 * clamp(impact / JUMP_SPEED);
        landed = 0;
      } else landed += dt;
      impact = airborne && !player.grounded ? Math.max(impact, -vy) : 0;
      grounded = player.grounded; free = walking;
      // The give on landing: through the knees and hips first, deepest a moment after he comes down, on from the knees'
      // bend as he reached for the ground.
      const absorb = landing > 0 ? READY * Math.exp(-landed / 0.2) + landing * give(landed, GIVE) : 0;
      // The speed his stride goes by follows his own, through the air too: landing on the run, he runs on.
      const through = airborne && !player.grounded && player.mode === 'free' && continuous ? distance / (dt * height) : 0;
      const gaitWas = gait;
      gait += ((moving ? rate : through) - gait) * (1 - Math.exp(-GAIT_EASE * dt));
      if (!walking || skid || player.atEdge) {
        // Off his feet, at an edge, or sliding the old way after a turn about: the stride lets go, and its speed goes with him.
        if (striding) { const kept = amount; halt(); if (!walking) amount = kept; }
      } else if (moving) {
        // Off again before his feet were home: the stride sets off anew from under him.
        if (gather.active) halt();
        if (!striding) {
          striding = true; setOffs++;
          footing.reset();
          // Landing on the run, the leading foot is the one that comes down: the stride goes on from its heel strike, as
          // lively as he was going. From standing, the first foot lifts almost at once, the other foot the next time.
          if (arrives && amount > 0.3) { steps = lead > 0 ? 0 : 1; quick = 0; }
          else { steps = (leftFirst ? 1 : 0) + SET_OFF_AT; leftFirst = !leftFirst; amount = 0; running = 0; quick = FIRST_STEP; }
        }
        // (Steps as long as his speed over this frame makes them, from where it was to where it is: counted by the
        // speed it ends at, a slow tablet's stride fell a sixth of a step behind a fast screen's in getting up to a run.)
        const now = strideAt(gait, body);
        const counted = distance / (height * strideAt((gaitWas + gait) / 2, body).step), more = Math.min(quick, counted * FIRST_QUICKER);
        steps += Math.min(counted + more, CADENCE * dt); quick -= more;
        at.x += distance / height;
        amount += (now.amount - amount) * (1 - Math.exp(-AMOUNT_EASE * dt));
        running += (now.run - running) * (1 - Math.exp(-RUN_EASE * dt));
      } else if (striding && !gather.active) {
        // Stopped: from the stride as it was last drawn (the target still holds it), his feet come home.
        gather.begin(target, body, footing.down, ankleSpeed);
      }
      if (striding && gather.active) {
        // The trunk and the arms settle as the stride's own motion dies away; the legs are the last steps home.
        amount *= Math.exp(-SETTLE * dt);
        stride(target, steps * Math.PI, strideAt(gait, body).step, amount, running, BOY, body, calm);
        sprinting(target, gait, amount);
        if (gather.step(target, body, dt) && amount < 0.05) halt();
        sink(target, body, dropOf(absorb, body));
      } else if (striding) {
        // On his feet: the stride, its planted feet held where they came down (./gait.ts).
        at.dt = dt;
        footing.stride(target, steps * Math.PI, strideAt(gait, body).step, amount, running, BOY, body, calm, at);
        sprinting(target, gait, amount);
        for (const side of [0, 1] as const) {
          const ahead = ankleOf(target, side, body).ahead;
          ankleSpeed[side] = (ahead - ankleWas[side]) / dt; ankleWas[side] = ahead;
        }
        sink(target, body, dropOf(absorb, body));
      } else playerPose(player.mode === 'fly' ? { ...player, vy } : player, phase, 0, absorb, target, body, air);
      if (airborne && !player.grounded && air.pushed && air.t < PUSH && !calm) {
        // Through the dip and the push the body is drawn with its feet on the ground, as far as its legs push it up, and goes
        // up after them.
        target.bounce = -Math.min((air.rise ?? 0) / height, PUSH_REACH) * 5.2 * (1 - smooth(air.t / PUSH));
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
      if (walking && !player.atEdge) {
        // Into a start or a change of direction he leans a little the way he goes; stopping, both knees soften, and only
        // braking hard from a run does the trunk come back a little, for a moment. For his size: at home, three times as
        // big, the same start is a third as hard.
        const weight = calm ? (skid ? 0.3 : 0.45) : 1, drive = acceleration * player.facing;
        const hard = smooth((Math.abs(before) / height - 0.8) / 1.6);
        // Turned about while still going the old way, he leans into the new way.
        const room = skid ? 1 : clamp(1 - target.lean / LEAN_MOST);
        target.lean += (drive > 0 ? drive * (skid ? 0.3 : 0.12) * room : drive * 0.1 * hard) * weight; target.nod -= Math.max(0, drive) * 0.06 * weight;
        sink(target, body, dropOf(0.28 * braking, body));
        target.armL += braking * 0.18 * weight * hard; target.armR += braking * 0.18 * weight * hard;
      }
      idle = walking && rate <= 1e-3 && !player.atEdge && wave <= 0 ? idle + dt : 0;
      ruffle = 0;
      if (idle === 0) { act = null; nextAt = FIRST + random() * 1.2; stretchedAt = -Infinity; }
      blown = calm ? 0 : blown + (wind - blown) * -Math.expm1(-dt / .35);
      if (!calm && idle > 0.4 && legs && !striding) {
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
      // Standing, he is drawn softened, as he always has been. Striding, he is drawn as the stride has him: its legs put his
      // feet where they stand, and softened they would trail behind the ground. Whatever jumps (off the ground, onto it, onto
      // a hose, into a stride and out of it) the follower takes up.
      const ease = striding ? 1 : walking && continuous ? 1 - Math.exp(-STRIDE_EASE * dt) : 1;
      for (const joint of JOINTS) strode[joint] += (target[joint] - strode[joint]) * ease;
      for (const joint of JOINTS) target[joint] = strode[joint];
      // A new state of the body (off the ground or onto it, onto a hose or a ledge, a skid, an edge, a wave, into a stride
      // or out of one, out of a scene) is taken up by the follower from what was drawn.
      const doing = `${player.mode}:${player.grounded}:${skid}:${!!player.atEdge}:${wave > 0}:${striding}:${setOffs}`;
      // Leaving the ground in a jump, the legs go down into the dip at once, and the arms back.
      follower.follow(target, dt, pose, doing !== was || unscripted, airborne && !player.grounded && air.pushed && air.t === 0 ? 1.8 : 1, striding);
      was = doing;
      // A story's explicit seat ends with its act; locomotion is supported by the actual posed soles.
      pose.seat = null;
      return Object.assign(drawn, pose);
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
    const hip = new Group(), knee = new Group(), ankle = new Group();
    hip.position.set(0, 0.4, z); knee.position.y = -0.19; ankle.position.y = -0.165;
    const thigh = new Mesh(new BoxGeometry(0.12, 0.17, 0.12), jeans); thigh.position.y = -0.105;
    const shin = new Mesh(new BoxGeometry(0.12, 0.15, 0.12), jeans); shin.position.y = -0.085;
    const foot = new Mesh(new BoxGeometry(0.2, 0.09, 0.13), boot); foot.position.x = 0.035;
    ankle.add(foot); knee.add(shin, ankle); hip.add(thigh, knee); figure.add(hip);
    return { hip, knee, ankle, foot };
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
  // A mouth on the front of his head, which opens as he speaks (./talk.ts): nothing of it while it is shut. Dark as his boots.
  const mouth = new Mesh(new SphereGeometry(0.05, 10, 6), boot);
  mouth.name = 'player-mouth';
  mouth.position.set(0.176, 0.045, 0);
  drawnWhile(mouth, false);
  neck.add(mouth);
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
    legs[i]!.ankle.name = `player-ankle-${side}`; legs[i]!.foot.name = `player-boot-${side}`;
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
    mouth(out: Vector3) { return mouth.getWorldPosition(out); },
    /** His mouth open (0 shut, 1 wide) and round; the stand-in has no lids to close. */
    face(open: number, round: number, _lids: number) {
      mouth.scale.set(0.25, Math.max(1e-3, 0.5 * open), 1 - 0.35 * round);
      drawnWhile(mouth, open > 0.01);
    },
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
        const footAngle = i === 0 ? p.footL : p.footR;
        legs[i]!.ankle.rotation.z = footAngle;
        arms[i]!.shoulder.rotation.set((i === 0 ? 1 : -1) * p.spread, 0, armAngle);
        arms[i]!.elbow.rotation.set(0, 0, elbowAngle);
        const angle = hipAngle - kneeAngle, soleAngle = angle + footAngle;
        // The full boot's four sole corners, not just its ankle; a turned toe never enters the floor.
        lowest = Math.min(lowest, 0.4 - 0.19 * Math.cos(hipAngle) - 0.165 * Math.cos(angle) + 0.035 * Math.sin(soleAngle)
          - 0.1 * Math.abs(Math.sin(soleAngle)) - 0.045 * Math.abs(Math.cos(soleAngle)));
      }
      figure.position.y = (p.seat === null ? -lowest : p.seat / 5.2 - 0.4) + p.bounce / 5.2;
    },
  };
}
