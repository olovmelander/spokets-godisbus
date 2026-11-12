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
const frames = new WeakMap<Object3D, { axis: Vector3; rotation: Quaternion; time?: number; hands: [GripTurn, GripTurn]; forearm?: Vector3 }>();
const endTo = new Vector3(), endFrom = new Vector3(), forearm = new Vector3(), heldForearm = new Vector3();
/** How fast a carrying forearm turns to a new way, in radians a second: the beam leaving Klonk for Elof. */
const CARRY_TURN = 4;
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

const DOWN = new Vector3(0, -1, 0);
const inverse = new Matrix4(), pivot = new Vector3();
const hangs = new Vector3(), elbowAt = new Vector3(), along = new Vector3(), alongFrom = new Vector3();

/**
 * The way a forearm points to carry a torch at `aim` from an elbow at `from` (the torch runs on from it): towards the
 * aim, but always out in front of the body, never far across it, never straight down a leg nor up over the head. With no
 * aim, forward and down, as a lamp is carried walking.
 */
function forearmTowards(from: Vector3, aim: Vector3 | null, out: Vector3): Vector3 {
  if (aim) out.subVectors(aim, from); else out.copy(forward).multiplyScalar(.8).addScaledVector(DOWN, .6);
  if (out.lengthSq() < 1e-8) out.copy(forward);
  out.normalize();
  const ahead = out.dot(forward);
  if (ahead < .35) out.addScaledVector(forward, .35 - ahead);
  const outward = out.dot(across);
  if (outward < -.2) out.addScaledVector(across, -.2 - outward);
  out.normalize();
  // Between pointing down beside the hip and raised a little over level: the elbow stays down either way.
  const up = Math.max(-.72, Math.min(.55, out.y));
  if (up !== out.y) {
    const flat = Math.hypot(out.x, out.z), keep = Math.sqrt(1 - up * up) / Math.max(1e-6, flat);
    out.set(out.x * keep, up, out.z * keep);
  }
  return out;
}

/**
 * Where a hand carries a torch, held as a person holds one (Olov, 12 November 2026: "Pappa måste hålla i ficklampan på ett
 * snyggt och naturligt sätt"): the upper arm hangs easily beside the body, a little forward and out, and the forearm
 * points the way the beam goes, so that the torch runs on from the fist with the wrist nearly straight. A beam at
 * something low (Elof at his feet) is held low beside the hip, one out through a window with the forearm raised; with no
 * aim it is carried forward and down. The live shoulder and the arm's real lengths follow a kneel, a lean and getting
 * up. `aimFrom` and `aimWeight` blend the forearm's way on the scene's clock, as the beam's own turn is blended. Both
 * hands share it during a transfer.
 */
export function flashlightCarryTarget(rig: Rig, side: 0 | 1, out: Vector3, aim: Vector3 | null = null, aimFrom: Vector3 | null = null, aimWeight = 1): Vector3 {
  return carry(rig, side, out, aim, aimFrom, aimWeight, null, 0);
}

/**
 * The carry, with the forearm's way turned from the way it had (`was`, in the body's own frame) by at most `most`
 * radians: a sudden new aim swings the hand over at a hand's pace, while the body's own movements carry it exactly.
 * `forearm` is left holding the way it took, in the body's frame.
 */
function carry(rig: Rig, side: 0 | 1, out: Vector3, aim: Vector3 | null, aimFrom: Vector3 | null, aimWeight: number, was: Vector3 | null, most: number): Vector3 {
  rig.group.updateWorldMatrix(true, false);
  forward.set(0, 0, 1).transformDirection(rig.group.matrixWorld);
  across.set(side === 0 ? 1 : -1, 0, 0).transformDirection(rig.group.matrixWorld);
  if (!rig.arm) return rig.hand(side, out);
  rig.arm(side, shoulder, elbow, wrist);
  const upper = shoulder.distanceTo(elbow), fore = elbow.distanceTo(wrist), length = upper + fore;
  hangs.copy(DOWN).multiplyScalar(.93).addScaledVector(forward, .26).addScaledVector(across, .22).normalize();
  elbowAt.copy(shoulder).addScaledVector(hangs, upper);
  forearmTowards(elbowAt, aim, along);
  if (aimFrom && aimWeight < 1) {
    forearmTowards(elbowAt, aimFrom, alongFrom);
    alongFrom.lerp(along, Math.max(0, aimWeight));
    if (alongFrom.lengthSq() > 1e-6) along.copy(alongFrom.normalize());
  }
  forearm.copy(along).transformDirection(inverse.copy(rig.group.matrixWorld).invert());
  if (was) {
    const angle = was.angleTo(forearm);
    if (angle > most && angle > 1e-6) {
      // Turned from the old way towards the new, about the axis between them, by as much as it may.
      pivot.crossVectors(was, forearm);
      if (pivot.lengthSq() < 1e-10) pivot.set(0, 1, 0);
      forearm.copy(was).applyAxisAngle(pivot.normalize(), most);
      along.copy(forearm).transformDirection(rig.group.matrixWorld);
    }
  }
  out.copy(elbowAt).addScaledVector(along, .85 * fore);
  // Never at the arm's full stretch: a bend stays in the elbow, and the other hand can reach it for a handover.
  const reach = out.distanceTo(shoulder), longest = .8 * length;
  if (reach > longest) out.sub(shoulder).multiplyScalar(longest / reach).add(shoulder);
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
  let previous = frames.get(lamp);
  const rewound = time !== undefined && previous?.time !== undefined && time < previous.time;
  if (carried) {
    // The carry follows where the beam goes (the forearm along it): when that changes at once (the beam leaves Klonk
    // for Elof), the forearm swings over at a hand's pace rather than in one frame. Paused, it stays; a cut or a seek
    // puts it where it belongs.
    const limited = !!previous?.forearm && !contact && !reset && !rewound && time !== undefined && previous.time !== undefined;
    carry(rig, side, target, aim, aimFrom, aimWeight, limited ? previous!.forearm! : null,
      limited ? CARRY_TURN * Math.max(0, time! - previous!.time!) : 0);
    heldForearm.copy(forearm);
  } else if (rig.socket) rig.socket(side, grip, target);
  else rig.hand(side, target);
  if (contact) target.copy(contact);
  // While the beam turns from one thing to another, each end of the turn is taken from where the hand carries the torch
  // for that thing alone: those stand still while the hand goes over between them. A turn between ends that move with
  // it can go the long way round in one frame.
  if (carried && !contact && aim && aimFrom && aimWeight < 1) {
    flashlightCarryTarget(rig, side, endTo, aim);
    flashlightCarryTarget(rig, side, endFrom, aimFrom);
  } else { endTo.copy(target); endFrom.copy(target); }
  if (aim) direction.subVectors(aim, endTo).normalize();
  else { direction.copy(forward); direction.y = -.3; direction.normalize(); }
  if (direction.lengthSq() < 1e-8) direction.copy(forward);
  aimFrame(direction, turn);
  if (aimFrom && aimWeight < 1) {
    before.subVectors(aimFrom, endFrom).normalize();
    if (before.lengthSq() > 1e-8 && direction.lengthSq() > 1e-8) {
      aimFrame(before, blend);
      turn.copy(blend.slerp(turn, Math.max(0, aimWeight)));
    }
  }
  direction.copy(axis).applyQuaternion(turn);
  // A moving recipient can pass directly below the hand, including after an authored turn has finished. Carry the
  // last frame across that pole; gently restore its resting roll instead of selecting another palm side in one frame.
  // Cuts/seeks restart from the authored frame. Repeated times never advance the roll correction.
  if (previous && !reset && !rewound) {
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
  if (reset || rewound) {
    previous.hands[0].valid = previous.hands[1].valid = false;
  }
  previous.axis.copy(direction); previous.rotation.copy(turn); previous.time = time;
  if (carried && !contact && rig.arm) (previous.forearm ??= new Vector3()).copy(heldForearm);
  else previous.forearm = undefined;
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
