import { actPose } from './acting';
import { STANDING, type Pose, type Role } from './rig';

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
const UPPER = ['lean', 'nod', 'armL', 'armR', 'elbowL', 'elbowR', 'spread'] as const;

// The sheets' personalities read in the silhouette, even with the rehearsal bodies.
const CHARACTER = {
  pappa: { lean: 0, nod: 0.14, elbow: 0.22, left: 0.08, armL: 0.48, armR: 1.55, elbowL: 0.58, elbowR: 0.85, spread: 0.09, wave: 0.04, tempo: 5 },
  mamma: { lean: 0.025, nod: 0.12, elbow: 0.2, left: 0.18, armL: 0.85, armR: 1.35, elbowL: 1.0, elbowR: 0.65, spread: 0.16, wave: 0.06, tempo: 6 },
  moa: { lean: -0.012, nod: 0.06, elbow: 0.14, left: 0.5, armL: 0.38, armR: 2.45, elbowL: 0.8, elbowR: 0.75, spread: 0.1, wave: 0.2, tempo: 10 },
  bertil: { lean: 0.018, nod: 0.04, elbow: 0.26, left: 0.1, armL: 2.1, armR: 2.55, elbowL: 0.62, elbowR: 0.58, spread: 0.18, wave: 0.13, tempo: 12 },
} satisfies Record<Role, object>;

/** Helpers stay on their feet: a personal greeting, a quiet look, or Pappa supporting his passenger. */
export function createFamilyMotion(who: Role, at: number) {
  const pose: Pose = { ...STANDING };
  const character = CHARACTER[who];
  const offset = ['pappa', 'mamma', 'moa', 'bertil'].indexOf(who) * 1.7 + at * 0.13;
  let lastX: number | null = null, walked = 0;
  let gaze: number | null = null, release = 0;
  let releasedFrom: Pose | null = null;
  return {
    update(dt: number, clock: number, joy: number, towards: number, carryX: number | null, calm: boolean): Pose {
      if (dt <= 0) return pose;
      if (lastX !== null && carryX === null) {
        releasedFrom = { ...pose };
        release = 0;
      }
      Object.assign(pose, STANDING);
      if (carryX !== null) {
        releasedFrom = null;
        gaze = 0;
        const distance = lastX === null ? 0 : Math.abs(carryX - lastX);
        // A restored ride changes its place, not the phase of a long unseen march.
        const pace = distance < dt * 12 + 0.05 ? Math.min(1, distance / dt / 2.6) : 0;
        if (pace > 0) walked += distance;
        actPose('walk', { t: clock, aim: null, stride: walked / 1.25, pace: pace * 0.65, calm }, pose);
        pose.armL = pose.armR = 1.85;
        pose.elbowL = pose.elbowR = 0.55;
        pose.spread = 0.12;
      } else {
        const t = calm ? 0 : clock + offset;
        const breathe = calm ? 0 : Math.sin(t * 1.3);
        const elapsed = Math.max(0, 1.8 - joy);
        const active = joy > 0;
        // The head acknowledges Elof before the arms rise; the second arm follows, then both settle gently.
        const right = active ? calm ? 1 : smooth((elapsed - 0.05) / 0.24) * smooth(joy / 0.4) : 0;
        const left = active ? calm ? 1 : smooth((elapsed - 0.12) / 0.3) * smooth(joy / 0.46) : 0;
        const wave = calm ? 0 : Math.sin(elapsed * character.tempo) * character.wave * right;
        pose.lean = character.lean + 0.012 * breathe + 0.035 * right;
        pose.nod = character.nod + 0.018 * breathe + (active && !calm ? 0.075 * Math.sin(Math.min(1, elapsed / 0.24) * Math.PI) : 0);
        const target = Math.max(-0.75, Math.min(0.75, towards)) * 0.22;
        gaze = gaze === null || calm ? target : gaze + (target - gaze) * -Math.expm1(-dt * 9);
        pose.turn = gaze;
        pose.armL = 0.06 + (calm ? 0 : Math.sin(t * 1.1) * 0.02);
        pose.armR = 0.04 + (calm ? 0 : Math.sin(t * 1.1 + 1) * 0.02);
        pose.elbowL = character.elbow + character.left;
        pose.elbowR = character.elbow;
        pose.armL += (character.armL - pose.armL) * left;
        pose.armR += (character.armR - pose.armR) * right;
        pose.elbowL += (character.elbowL - pose.elbowL) * left;
        pose.elbowR += (character.elbowR - pose.elbowR) * right + wave;
        pose.spread = character.spread * right;
        if (releasedFrom && !calm) {
          // Lower the supporting hands after the passenger leaves, without taking another step.
          const k = smooth((release += dt) / 0.32);
          for (const joint of UPPER) pose[joint] = releasedFrom[joint] + (pose[joint] - releasedFrom[joint]) * k;
          if (k === 1) releasedFrom = null;
        } else releasedFrom = null;
      }
      lastX = carryX;
      pose.bounce = 0;
      return pose;
    },
  };
}
