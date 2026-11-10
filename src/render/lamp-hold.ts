import { Vector3, type Object3D } from 'three';
import type { Rig } from './rig';

const shoulder = new Vector3(), elbow = new Vector3(), target = new Vector3(), wrist = new Vector3();
const forward = new Vector3(), across = new Vector3(), direction = new Vector3(), held = new Vector3();
const axis = new Vector3(0, 0, 1);
const grip = { kind: 'power' as const, size: .075 };

/**
 * Carry a torch ahead of the body, with its elbow down and beside its own shoulder. The live shoulder and actual arm
 * lengths follow a kneel, a lean and getting up; a standing-height target would lift the hand through a crouched chest.
 * Only the carrying arm is solved. The other hand can keep its authored support on the knee.
 * `weight` blends acquisition on the scene clock; the torch always follows the actual hand socket.
 * `carried=false` preserves a working hand's authored position during the raincoat's hand-to-hand transfer.
 */
export function holdFlashlight(rig: Rig, lamp: Object3D, side: 0 | 1, aim: Vector3 | null, size: number, carried = true, weight = 1): void {
  rig.group.updateWorldMatrix(true, false);
  forward.set(0, 0, 1).transformDirection(rig.group.matrixWorld);
  across.set(side === 0 ? 1 : -1, 0, 0).transformDirection(rig.group.matrixWorld);
  grip.size = .075 * size;
  if (carried && rig.arm) {
    rig.arm(side, shoulder, elbow, wrist);
    const length = shoulder.distanceTo(elbow) + elbow.distanceTo(wrist);
    target.copy(shoulder).addScaledVector(forward, .56 * length).addScaledVector(across, .12 * length);
    target.y -= .55 * length;
  } else if (rig.socket) rig.socket(side, grip, target);
  else rig.hand(side, target);
  if (aim) direction.subVectors(aim, target).normalize();
  else { direction.copy(forward); direction.y = -.3; direction.normalize(); }
  if (rig.grasp) {
    rig.grasp(side, grip, target, direction, held, weight, wrist);
    lamp.position.copy(held).addScaledVector(wrist, -.06 * size);
    lamp.quaternion.setFromUnitVectors(axis, wrist);
  } else {
    if (carried) rig.reach(side, target, weight, .9);
    rig.hand(side, held);
    lamp.position.copy(held);
    lamp.quaternion.setFromUnitVectors(axis, direction);
  }
  lamp.scale.setScalar(size);
}
