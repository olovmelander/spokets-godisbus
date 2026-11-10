import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { STANDING, type Pose, type Rig, type Role } from './rig';
import type { GripTurn } from './arm-contact';

const shoulder = new Vector3(), elbow = new Vector3(), target = new Vector3(), wrist = new Vector3();
const forward = new Vector3(), across = new Vector3(), direction = new Vector3(), held = new Vector3();
const before = new Vector3(), turn = new Quaternion(), blend = new Quaternion();
const frame = new Matrix4(), frameUp = new Vector3(), frameSide = new Vector3();
const axis = new Vector3(0, 0, 1);
const fingersDown = new Vector3(0, -1, 0);
const grip = { kind: 'power' as const, size: .075 };
const frames = new WeakMap<Object3D, { axis: Vector3; rotation: Quaternion; time?: number; hands: [GripTurn, GripTurn] }>();
const carriedFrame = new Quaternion(), transport = new Quaternion();
const ARM = [['armL', 'elbowL', 'wristL', 'outL'], ['armR', 'elbowR', 'wristR', 'outR']] as const;

/** Keep the same carrying hand when Elof passes. Moa's left hand belongs to the umbrella throughout that chapter. */
export const familyLampSide = (who: Role, umbrellaChapter: boolean): 0 | 1 => who === 'moa' && umbrellaChapter ? 1 : 0;

/** Bertil gives both hands to his boot before the lamp is hidden at half of the existing pull gesture. */
export function lampCarryWeight(pull: number): number {
  const t = Math.max(0, Math.min(1, pull / .5));
  return 1 - t * t * (3 - 2 * t);
}

/** The held tool owns this arm; keep a greeting or a wave on the free arm. */
export function quietLampArm(pose: Pose, side: 0 | 1, weight = 1): void {
  for (const joint of ARM[side]) pose[joint] += (STANDING[joint] - pose[joint]) * weight;
}

/** A reachable carrying point beside this shoulder, shared by both hands during a transfer. */
export function flashlightCarryTarget(rig: Rig, side: 0 | 1, out: Vector3): Vector3 {
  rig.group.updateWorldMatrix(true, false);
  forward.set(0, 0, 1).transformDirection(rig.group.matrixWorld);
  across.set(side === 0 ? 1 : -1, 0, 0).transformDirection(rig.group.matrixWorld);
  if (!rig.arm) return rig.hand(side, out);
  rig.arm(side, shoulder, elbow, wrist);
  const length = shoulder.distanceTo(elbow) + elbow.distanceTo(wrist);
  out.copy(shoulder).addScaledVector(forward, .56 * length).addScaledVector(across, .12 * length);
  out.y -= .55 * length;
  return out;
}

function aimFrame(ray: Vector3, out: Quaternion): Quaternion {
  frameUp.set(0, 1, 0).addScaledVector(ray, -ray.y);
  // An overhead authored endpoint uses the body's forward side to define the top of the torch.
  // Intermediate frames are quaternion blends, so passing overhead never switches reference directions.
  if (frameUp.lengthSq() < 1e-8) frameUp.copy(forward).addScaledVector(ray, -forward.dot(ray));
  frameUp.normalize(); frameSide.crossVectors(frameUp, ray).normalize();
  frame.makeBasis(frameSide, frameUp, ray);
  return out.setFromRotationMatrix(frame);
}

/**
 * Carry a torch ahead of the body, with its elbow down and beside its own shoulder. The live shoulder and actual arm
 * lengths follow a kneel, a lean and getting up; a standing-height target would lift the hand through a crouched chest.
 * Only the carrying arm is solved. The other hand can keep its authored support on the knee.
 * `weight` blends acquisition on the scene clock; the torch always follows the actual hand socket.
 * `aimFrom` and `aimWeight` blend the beam and the palm's roll together on that same clock. Blending target points
 * can sweep the target through the hand; deriving a new roll during that sweep can flip a wrist overhead.
 * `carried=false` preserves a working hand's authored position; `contact` gives both hands a shared handoff point.
 */
export function holdFlashlight(rig: Rig, lamp: Object3D, side: 0 | 1, aim: Vector3 | null, size: number, carried = true, weight = 1,
  aimFrom: Vector3 | null = null, aimWeight = 1, time?: number, reset = false, contact?: Vector3): void {
  rig.group.updateWorldMatrix(true, false);
  forward.set(0, 0, 1).transformDirection(rig.group.matrixWorld);
  across.set(side === 0 ? 1 : -1, 0, 0).transformDirection(rig.group.matrixWorld);
  grip.size = .075 * size;
  if (carried) flashlightCarryTarget(rig, side, target);
  else if (rig.socket) rig.socket(side, grip, target);
  else rig.hand(side, target);
  if (contact) target.copy(contact);
  if (aim) direction.subVectors(aim, target).normalize();
  else { direction.copy(forward); direction.y = -.3; direction.normalize(); }
  if (direction.lengthSq() < 1e-8) direction.copy(forward);
  aimFrame(direction, turn);
  if (aimFrom && aimWeight < 1) {
    before.subVectors(aimFrom, target).normalize();
    if (before.lengthSq() > 1e-8 && direction.lengthSq() > 1e-8) {
      aimFrame(before, blend);
      turn.copy(blend.slerp(turn, Math.max(0, aimWeight)));
    }
  }
  direction.copy(axis).applyQuaternion(turn);
  // A moving recipient can pass directly below the hand, including after an authored turn has finished. Carry the
  // last frame across that pole; gently restore its resting roll instead of selecting another palm side in one frame.
  // Cuts/seeks restart from the authored frame. Repeated times never advance the roll correction.
  let previous = frames.get(lamp);
  if (previous && !reset && !(time !== undefined && previous.time !== undefined && time < previous.time)) {
    transport.setFromUnitVectors(previous.axis, direction);
    carriedFrame.copy(previous.rotation).premultiply(transport);
    const dt = time !== undefined && previous.time !== undefined ? Math.max(0, time - previous.time) : 0;
    const angle = carriedFrame.angleTo(turn);
    if (angle > 1e-8 && dt > 0) carriedFrame.slerp(turn, Math.min(1, 1.5 * dt / angle));
    turn.copy(carriedFrame);
  }
  if (!previous) {
    previous = { axis: new Vector3(), rotation: new Quaternion(), hands: [
      { rotation: new Quaternion(), valid: false }, { rotation: new Quaternion(), valid: false },
    ] }; frames.set(lamp, previous);
  }
  if (reset || (time !== undefined && previous.time !== undefined && time < previous.time)) {
    previous.hands[0].valid = previous.hands[1].valid = false;
  }
  previous.axis.copy(direction); previous.rotation.copy(turn); previous.time = time;
  fingersDown.set(0, -1, 0).applyQuaternion(turn);
  if (rig.grasp) {
    rig.grasp(side, grip, target, direction, held, weight, wrist, fingersDown, previous.hands[side]);
    lamp.position.copy(held).addScaledVector(wrist, -.06 * size);
    lamp.quaternion.setFromUnitVectors(axis, wrist);
  } else {
    if (carried || contact) rig.reach(side, target, weight, .9);
    rig.hand(side, held);
    lamp.position.copy(held);
    lamp.quaternion.setFromUnitVectors(axis, direction);
  }
  lamp.scale.setScalar(size);
}
