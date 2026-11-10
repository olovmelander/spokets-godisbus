import { Vector3 } from 'three';
import type { Rig } from './rig';

export type CarryingRig = Pick<Rig, 'grasp' | 'hand' | 'reach' | 'hold'> & Partial<Pick<Rig, 'grip'>>;

const actual = new Vector3();

/** A carving's base follows the fingers around its body, even when the requested reach is too far.
 * `gripHeight` is measured up from the toy's feet; `radius` is the thickness enclosed by the hand.
 * Both output vectors are world-space. Call after the carrier's final pose and placement.
 */
export function holdCarving(rig: CarryingRig, side: 0 | 1, target: Vector3, up: Vector3,
  gripHeight: number, radius: number, base: Vector3, heldAxis: Vector3, weight = 1): Vector3 {
  heldAxis.copy(up).normalize();
  const grip = { kind: 'power' as const, size: radius };
  if (rig.grasp) rig.grasp(side, grip, target, heldAxis, actual, weight, heldAxis);
  else {
    if (rig.grip) rig.grip(side, target, heldAxis, actual, weight);
    else { rig.reach(side, target, weight); rig.hand(side, actual); }
    rig.hold?.(side, grip, weight);
  }
  return base.copy(actual).addScaledVector(heldAxis, -gripHeight);
}
