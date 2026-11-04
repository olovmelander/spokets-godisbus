import { actPose } from './acting';
import { seeded } from './player-motion';
import { STANDING, type Pose, type Role } from './rig';

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const UPPER = ['lean', 'nod', 'turn', 'armL', 'armR', 'elbowL', 'elbowR', 'spread'] as const;
const JOINTS = [...UPPER, 'legL', 'legR', 'kneeL', 'kneeR'] as const;
const pulse = (t: number, at: number, up: number, hold: number, down: number) => smooth((t - at) / up) * (1 - smooth((t - at - up - hold) / down));

/** What they do while they wait for him, in seconds: shift their weight, glance about, fold their arms, look at the sky. */
export const WAITING = { shift: 4.6, glance: 2.8, fold: 5.2, sky: 3.6 } as const;
export type Waiting = keyof typeof WAITING;

/**
 * A quiet idle, added to the waiting pose `u` seconds into it. `side` picks the leg that rests and the way a glance
 * goes. A resting knee bends with its thigh, so that its boot stays level and the other stands on the ground.
 */
function waitPose(act: Waiting, u: number, side: 1 | -1, grown: boolean, out: Pose): void {
  switch (act) {
    case 'shift': {
      const e = pulse(u, 0, .8, 2.8, 1);
      if (side > 0) { out.legL += .1 * e; out.kneeL += .1 * e; out.armL += .06 * e; } else { out.legR += .1 * e; out.kneeR += .1 * e; out.armR += .06 * e; }
      out.lean -= .02 * e;
      return;
    }
    case 'glance': {
      const e = pulse(u, 0, .45, 1.3, .55);
      out.turn += side * .55 * e; out.nod -= .08 * e;
      return;
    }
    case 'fold': {
      const e = pulse(u, 0, .7, 3.6, .8);
      out.armL += (.42 - out.armL) * e; out.armR += (.42 - out.armR) * e;
      out.elbowL += (1.85 - out.elbowL) * e; out.elbowR += (1.85 - out.elbowR) * e;
      out.spread += (-.2 - out.spread) * e; out.nod += .03 * e;
      return;
    }
    case 'sky': {
      // Up at the sky; a grown-up shades the eyes with a hand.
      const e = pulse(u, 0, .6, 2.2, .7);
      out.nod += (-.5 - out.nod) * e; out.turn += side * .15 * e; out.lean -= .02 * e;
      if (grown) { out.armR += (2.45 - out.armR) * e * .9; out.elbowR += (2.1 - out.elbowR) * e * .9; }
      return;
    }
  }
}

// The sheets' personalities read in the silhouette, even with the rehearsal bodies.
const CHARACTER = {
  pappa: { lean: 0, nod: 0.14, elbow: 0.22, left: 0.08, armL: 0.48, armR: 1.55, elbowL: 0.58, elbowR: 0.85, spread: 0.09, wave: 0.04, tempo: 5 },
  mamma: { lean: 0.025, nod: 0.12, elbow: 0.2, left: 0.18, armL: 0.85, armR: 1.35, elbowL: 1.0, elbowR: 0.65, spread: 0.16, wave: 0.06, tempo: 6 },
  moa: { lean: -0.012, nod: 0.06, elbow: 0.14, left: 0.5, armL: 0.38, armR: 2.45, elbowL: 0.8, elbowR: 0.75, spread: 0.1, wave: 0.2, tempo: 10 },
  bertil: { lean: 0.018, nod: 0.04, elbow: 0.26, left: 0.1, armL: 2.1, armR: 2.55, elbowL: 0.62, elbowR: 0.58, spread: 0.18, wave: 0.13, tempo: 12 },
} satisfies Record<Role, object>;

/** Helpers stay on their feet: a personal greeting, a quiet look, or Pappa supporting his passenger. */
export function createFamilyMotion(who: Role, at: number, purpose = '') {
  const pose: Pose = { ...STANDING }, helping: Pose = { ...STANDING };
  const character = CHARACTER[who];
  const gift = purpose.startsWith('party:');
  const task = purpose === 'moa' || gift ? 'offer' : purpose === 'cap' || purpose === 'cap:ready' ? 'reach' : purpose === 'seesaw' ? 'point'
    : purpose === 'mamma' || purpose === 'bog:return-bridge' ? 'lift' : null;
  const offset = ['pappa', 'mamma', 'moa', 'bertil'].indexOf(who) * 1.7 + at * 0.13;
  let lastX: number | null = null, walked = 0, pace = 0, lastJoy = 0, ready = false;
  let gaze: number | null = null, pitch: number | null = null, settling = 0, presence = 0;
  let lastHelp: boolean | undefined, blendLegs = false;
  let from: Pose | null = null;
  // Waiting idles, each of the family in an order and a time of their own; they fade when anything else begins.
  const random = seeded(Math.round(offset * 1000) + 1), waiting: Pose = { ...STANDING }, grown = who === 'mamma' || who === 'pappa';
  let quiet = 0, act: Waiting | null = null, actT = 0, nextAt = 0, fade = 0, side: 1 | -1 = 1, last: Waiting | null = null;
  const bag: Waiting[] = [];
  return {
    /** What they do while they wait, if anything. */
    get waiting(): Waiting | null { return act; },
    update(dt: number, clock: number, joy: number, towards: number, carryX: number | null, calm: boolean,
      look?: { ahead: number; up: number }, help?: { ready: boolean; near: boolean }): Pose {
      if (dt <= 0) return pose;
      const close = help?.near ? 1 : 0;
      presence = calm ? close : presence + (close - presence) * -Math.expm1(-dt * 5);
      const changedHelp = help?.ready !== lastHelp;
      if (ready && (changedHelp || (lastX === null) !== (carryX === null) || lastJoy > 0 && joy > lastJoy + .1 || lastJoy > .4 && joy === 0)) {
        from = { ...pose };
        blendLegs = changedHelp;
        settling = 0;
      }
      lastHelp = help?.ready;
      ready = true; lastJoy = joy;
      Object.assign(pose, STANDING);
      if (carryX !== null) {
        gaze = 0; pitch = character.nod;
        const distance = lastX === null ? 0 : Math.abs(carryX - lastX);
        // A restored ride changes its place, not the phase of a long unseen march.
        const travel = distance < dt * 12 + .05;
        const want = travel ? Math.min(1, distance / dt / 2.6) : 0;
        pace = travel ? pace + (want - pace) * -Math.expm1(-dt * 12) : 0;
        if (want > 0) walked += distance;
        actPose('walk', { t: clock, aim: null, stride: walked / 1.25, pace: pace * 0.65, calm }, pose);
        // Keep the supporting forearms raised while the chest eases into a step.
        pose.armL = pose.armR = 1.85 + pose.lean;
        pose.elbowL = pose.elbowR = 0.55;
        pose.spread = 0.12;
      } else {
        pace = 0;
        const t = calm ? 0 : clock + offset;
        const breathe = calm ? 0 : Math.sin(t * 1.3);
        const elapsed = Math.max(0, 1.8 - joy);
        const active = joy > 0 || !!help?.ready && presence > .001;
        const greeting = active && !task && purpose !== 'braid';
        // An open greeting says "I'm here for you" before the call. Once asked, the same hands
        // keep showing the offered solution while Elof studies it or gets ready to board.
        const welcome = help && !help.ready ? presence : 0;
        // The head acknowledges Elof before the arms rise; the second arm follows, then both settle gently.
        const right = Math.max(welcome, greeting ? calm ? 1 : smooth((elapsed - 0.05) / 0.24) * smooth(joy / 0.4) : 0);
        const left = Math.max(welcome, greeting ? calm ? 1 : smooth((elapsed - 0.12) / 0.3) * smooth(joy / 0.46) : 0);
        const wave = calm ? 0 : Math.sin(elapsed * character.tempo) * character.wave * right * smooth((1.3 - elapsed) / .45);
        pose.lean = character.lean + 0.012 * breathe + 0.035 * right;
        pose.nod = character.nod + 0.018 * breathe + (active && !calm ? 0.075 * Math.sin(Math.min(1, elapsed / 0.24) * Math.PI) : 0);
        const target = Math.max(-.5, Math.min(.5, towards));
        gaze = gaze === null || calm ? target : gaze + (target - gaze) * -Math.expm1(-dt * 9);
        pose.turn = gaze;
        const down = look ? Math.max(-.5, Math.min(.65, Math.atan2(4.65 - look.up, Math.max(1, look.ahead)))) : character.nod;
        pitch = pitch === null || calm ? down : pitch + (down - pitch) * -Math.expm1(-dt * 7);
        pose.nod += pitch - character.nod;
        pose.armL = .06; pose.armR = .04;
        pose.elbowL = character.elbow + character.left;
        pose.elbowR = character.elbow;
        pose.armL += (character.armL - pose.armL) * left;
        pose.armR += (character.armR - pose.armR) * right;
        pose.elbowL += (character.elbowL - pose.elbowL) * left;
        pose.elbowR += (character.elbowR - pose.elbowR) * right + wave;
        pose.spread = character.spread * right;
        const weight = Math.max(help?.ready ? presence : 0, joy > 0 ? calm ? 1 : smooth(elapsed / .5) * smooth(joy / .5) : 0);
        if (active && task) {
          // The same flag that moves the help object gives its helper a purposeful, weighted gesture.
          actPose(task, { t: calm ? 3 : elapsed, aim: gift && look ? look : { ahead: task === 'point' ? 4 : 1.4,
            up: purpose === 'cap' || purpose === 'cap:ready' ? 1.0 : task === 'lift' ? 3.15 : gift ? 1.6 : 3.5 }, stride: 0, pace: 0, calm, role: who }, helping);
          for (const joint of [...UPPER, 'legL', 'legR', 'kneeL', 'kneeR'] as const) {
            if (joint !== 'turn' && joint !== 'nod') pose[joint] += (helping[joint] - pose[joint]) * weight;
          }
        } else if (active && purpose === 'braid') {
          pose.armL += (2.6 - pose.armL) * weight;
          pose.elbowL += (1.4 - pose.elbowL) * weight;
          pose.armR += (.9 - pose.armR) * weight;
        }
      }
      // Nobody needs them: no greeting, no help to give or show, nothing carried, and no reduced motion.
      const idle = !calm && carryX === null && joy === 0 && !help?.ready && presence < 1e-3 && !from;
      // Each quiet spell waits a while of its own before the first idle.
      if (idle && quiet === 0) nextAt = 2.6 + random() * 2.4;
      quiet = idle ? quiet + dt : 0;
      fade = idle ? fade + (1 - fade) * -Math.expm1(-dt * 3) : fade * Math.exp(-dt * 8);
      if (act && (actT += dt) >= WAITING[act]) { act = null; nextAt = quiet + 2 + random() * 3.5; }
      if (!idle && fade < 1e-3) { act = null; fade = 0; }
      if (idle && !act && quiet >= nextAt) {
        if (bag.length === 0) {
          // A shuffled round of all four, never starting with the one that ended the last round.
          bag.push('shift', 'glance', 'fold', 'sky');
          for (let i = 3; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [bag[i], bag[j]] = [bag[j]!, bag[i]!]; }
          if (bag[3] === last) [bag[0], bag[3]] = [bag[3]!, bag[0]!];
        }
        act = last = bag.pop()!;
        actT = 0; side = random() < .5 ? 1 : -1;
        // A glance goes away from where they look now.
        if (act === 'glance' && Math.abs(pose.turn) > .1) side = pose.turn > 0 ? -1 : 1;
      }
      if (act && fade > 0) {
        waitPose(act, actT, side, grown, Object.assign(waiting, pose));
        for (const joint of JOINTS) pose[joint] += (waiting[joint] - pose[joint]) * fade;
      }
      if (from && !calm) {
        // Boarding, alighting and interrupted reactions retain the previous hands, then settle.
        const k = smooth((settling += dt) / .32);
        for (const joint of UPPER) pose[joint] = from[joint] + (pose[joint] - from[joint]) * k;
        if (blendLegs) for (const joint of ['legL', 'legR', 'kneeL', 'kneeR'] as const) pose[joint] = from[joint] + (pose[joint] - from[joint]) * k;
        if (k === 1) from = null;
      } else from = null;
      lastX = carryX;
      pose.bounce = 0;
      return pose;
    },
  };
}
