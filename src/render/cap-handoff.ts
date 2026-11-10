import { Vector3 } from 'three';
import type { Pose, Rig } from './rig';

const smooth = (t: number) => { const k = Math.max(0, Math.min(1, t)); return k * k * (3 - 2 * k); };
const target = new Vector3(), offset = new Vector3();
const pinch = { kind: 'pinch' as const, size: .04 };

/** Event-time shares: both hands arrive before the cap leaves the head, and release only after it reaches the water. */
export function capHandoff(since: number, seconds: number) {
  const t = Math.max(0, since / seconds), take = smooth(t / .12), release = smooth((t - .82) / .18);
  return { take, hold: take * (1 - release), release,
    lower: smooth((t - .12) / .7), crouch: smooth((t - .25) / .4) * (1 - release) };
}

/** The authored arms underneath contact must blend too; switching their elbow plane snaps an otherwise blended reach. */
export function capArms(pose: Pose, since: number, seconds: number): void {
  const { take, hold, release } = capHandoff(since, seconds);
  pose.armL = .12 + (1.1 - .12) * hold;
  pose.elbowL = .25 + (.8 - .25) * hold;
  pose.armR = (1.9 + (1.1 - 1.9) * take) * (1 - release) + .18 * release;
  pose.elbowR = (1.05 + (.8 - 1.05) * take) * (1 - release) + .3 * release;
  pose.spread = .08;
}

/** Same contacts before, during and after the handoff: no full-strength IK appears or disappears in one frame. */
export function capHands(rig: Rig, since: number, seconds: number, capAt: Vector3): void {
  const { take, hold } = capHandoff(since, seconds);
  if (take < 1) {
    target.set(-.12 * rig.height, .95 * rig.height, .14 * rig.height).applyMatrix4(rig.group.matrixWorld);
    rig.reach(1, target, .9 * (1 - take), .96);
    rig.hold?.(1, pinch, .65 * (1 - take));
  }
  if (hold > 0) for (const side of [0, 1] as const) {
    target.copy(capAt).add(offset.set(side === 0 ? .5 : -.5, .04, 0));
    rig.reach(side, target, hold, .97);
    rig.hold?.(side, pinch, .75 * hold);
  }
}
