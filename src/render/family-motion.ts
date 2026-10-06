import { actPose } from './acting';
import { STANDING, type Pose, type Role } from './rig';

/** Helpers stay on their feet: a quiet look, a greeting, or Pappa holding his passenger on the way home. */
export function createFamilyMotion(who: Role, at: number) {
  const pose: Pose = { ...STANDING };
  const offset = ['pappa', 'mamma', 'moa', 'bertil'].indexOf(who) * 1.7 + at * 0.13;
  let lastX: number | null = null, walked = 0;
  return {
    update(dt: number, clock: number, joy: number, towards: number, carryX: number | null, calm: boolean): Pose {
      if (dt <= 0) return pose;
      Object.assign(pose, STANDING);
      if (carryX !== null) {
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
        const up = joy > 0 ? Math.min(1, joy / 0.3, (1.8 - joy) / 0.25) : 0;
        pose.lean = 0.012 * breathe;
        pose.nod = 0.08 + 0.018 * breathe;
        pose.turn = towards * 0.22;
        pose.armL = 0.04 + 1.7 * up + (calm ? 0 : Math.sin(t * 1.1) * 0.025);
        pose.armR = 0.04 + 1.85 * up + (calm ? 0 : Math.sin(t * 1.1 + 1) * 0.025);
        pose.elbowL = 0.12 + 0.35 * up;
        pose.elbowR = 0.12 + (0.5 + (calm ? 0 : Math.sin(t * 6) * 0.1)) * up;
        pose.spread = 0.08 * up;
      }
      lastX = carryX;
      pose.bounce = 0;
      return pose;
    },
  };
}
