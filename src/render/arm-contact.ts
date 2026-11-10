import { Matrix4, Object3D, Quaternion, Vector3 } from 'three';

/**
 * Two rigid segments reaching a point in one coordinate space. The optional pole is a direction towards
 * the elbow, not a point. Outputs may be reused; inputs are never changed and no scratch objects are made.
 */
export function solveArm(shoulder: Vector3, elbow: Vector3, hand: Vector3, target: Vector3,
  outElbow: Vector3, outHand: Vector3, pole?: Vector3): void {
  const upper = shoulder.distanceTo(elbow), lower = elbow.distanceTo(hand);
  outElbow.copy(elbow); outHand.copy(hand);
  if (upper < 1e-8 || lower < 1e-8) return;
  let x = target.x - shoulder.x, y = target.y - shoulder.y, z = target.z - shoulder.z;
  let distance = Math.hypot(x, y, z);
  if (distance < 1e-8) {
    x = hand.x - shoulder.x; y = hand.y - shoulder.y; z = hand.z - shoulder.z;
    const length = Math.hypot(x, y, z);
    if (length > 1e-8) { x /= length; y /= length; z /= length; }
    else { x = (elbow.x - shoulder.x) / upper; y = (elbow.y - shoulder.y) / upper; z = (elbow.z - shoulder.z) / upper; }
  } else { x /= distance; y /= distance; z /= distance; }
  distance = Math.max(Math.max(1e-8, Math.abs(upper - lower)), Math.min(upper + lower, distance));
  let px = pole?.x ?? elbow.x - shoulder.x, py = pole?.y ?? elbow.y - shoulder.y, pz = pole?.z ?? elbow.z - shoulder.z;
  const along = px * x + py * y + pz * z;
  px -= x * along; py -= y * along; pz -= z * along;
  let across = Math.hypot(px, py, pz);
  if (across < 1e-8) {
    // A straight arm still needs a finite elbow plane. Choose the axis least parallel to the reach.
    px = Math.abs(x) <= Math.abs(y) && Math.abs(x) <= Math.abs(z) ? 1 : 0;
    py = px === 0 && Math.abs(y) <= Math.abs(z) ? 1 : 0;
    pz = px + py === 0 ? 1 : 0;
    const dot = px * x + py * y + pz * z;
    px -= x * dot; py -= y * dot; pz -= z * dot;
    across = Math.hypot(px, py, pz);
  }
  const reach = (upper * upper + distance * distance - lower * lower) / (2 * distance);
  const bend = Math.sqrt(Math.max(0, upper * upper - reach * reach)) / across;
  outElbow.set(shoulder.x + x * reach + px * bend, shoulder.y + y * reach + py * bend, shoulder.z + z * reach + pz * bend);
  outHand.set(shoulder.x + x * distance, shoulder.y + y * distance, shoulder.z + z * distance);
}

/**
 * Reach after applying the authored pose. Uses the actual joints and preserves their lengths and rest roll.
 * A Vector3 hand is a tip in the lower joint's local space. Weight blends from the currently posed hand. `most` is how
 * much of the arm's full length a reach may use: a hand held out to give something keeps a bend at the elbow.
 * The solve takes place above the shoulder, so transforms/scales around the rig do not distort its anatomy.
 */
export function createArmContact(upper: Object3D, lower: Object3D, hand: Object3D | Vector3): (worldTarget: Vector3, weight?: number, most?: number) => void {
  const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3(), target = new Vector3();
  const wantedElbow = new Vector3(), wantedHand = new Vector3(), from = new Vector3(), to = new Vector3();
  const pole = new Vector3(), candidate = new Vector3();
  const local = new Matrix4(), world = new Matrix4(), lowerLocal = new Matrix4(), turn = new Quaternion();
  const handNode = hand instanceof Object3D ? hand : null;
  const tip = handNode ? null : (hand as Vector3).clone();
  const handPosition = (out: Vector3) => handNode ? handNode.getWorldPosition(out) : lower.localToWorld(out.copy(tip!));
  return (worldTarget, weight = 1, most = 1) => {
    weight = Math.max(0, Math.min(1, weight));
    if (weight === 0) return;
    upper.updateWorldMatrix(true, true);
    if (upper.parent) world.copy(upper.parent.matrixWorld); else world.identity();
    local.copy(world).invert();
    upper.getWorldPosition(shoulder).applyMatrix4(local);
    lower.getWorldPosition(elbow).applyMatrix4(local);
    handPosition(wrist).applyMatrix4(local);
    const upperLength = shoulder.distanceTo(elbow), lowerLength = elbow.distanceTo(wrist);
    target.copy(worldTarget).applyMatrix4(local).sub(shoulder)
      .clampLength(Math.abs(upperLength - lowerLength), Math.max(Math.abs(upperLength - lowerLength), (upperLength + lowerLength) * most))
      .add(shoulder).lerp(wrist, 1 - weight);
    // Keep the authored elbow side, in body space, including when the whole actor turns.
    from.copy(wrist).sub(shoulder).normalize();
    candidate.copy(elbow).sub(shoulder);
    candidate.addScaledVector(from, -candidate.dot(from));
    if (candidate.lengthSq() > 1e-8) pole.copy(candidate).normalize();
    else pole.set(upper.position.x < 0 ? -1 : 1, -.35, 0);
    // Carry the authored bend plane with the reach. Projecting the old pole directly onto the new reach would
    // collapse it when the target crossed that pole, then put the elbow on the opposite side in the next frame.
    to.copy(target).sub(shoulder).normalize();
    pole.applyQuaternion(turn.setFromUnitVectors(from, to));
    solveArm(shoulder, elbow, wrist, target, wantedElbow, wantedHand, pole);
    from.copy(elbow).sub(shoulder).normalize(); to.copy(wantedElbow).sub(shoulder).normalize();
    upper.quaternion.premultiply(turn.setFromUnitVectors(from, to));
    upper.updateWorldMatrix(false, true);
    if (lower.parent) lowerLocal.copy(lower.parent.matrixWorld).invert(); else lowerLocal.identity();
    handPosition(from).applyMatrix4(lowerLocal).sub(lower.position).normalize();
    to.copy(wantedHand).applyMatrix4(world).applyMatrix4(lowerLocal).sub(lower.position).normalize();
    lower.quaternion.premultiply(turn.setFromUnitVectors(from, to));
    lower.updateWorldMatrix(false, true);
  };
}

/** Aim a rigid palm after reaching its wrist; lengths stay in the actual hand bone's local units. */
export function createHandGrip(lower: Object3D, hand: Object3D, reach: (target: Vector3) => void,
  fingerAxis = new Vector3(0, 1, 0), palmFraction = .2): (target: Vector3, direction: Vector3, out: Vector3, weight?: number) => Vector3 {
  const axis = fingerAxis.clone().normalize(), offset = new Vector3(), wrist = new Vector3();
  const palm = new Vector3(), from = new Vector3(), direction = new Vector3(), target = new Vector3();
  const inverse = new Matrix4(), turn = new Quaternion(), blend = new Quaternion();
  return (worldTarget, worldDirection, out, weight = 1) => {
    hand.updateWorldMatrix(true, false);
    const length = hand.worldToLocal(lower.getWorldPosition(wrist)).length() * palmFraction;
    offset.copy(axis).multiplyScalar(length);
    hand.localToWorld(palm.copy(offset));
    weight = Math.max(0, Math.min(1, weight));
    if (weight === 0) return out.copy(palm);
    hand.getWorldPosition(wrist);
    from.copy(axis).transformDirection(hand.matrixWorld);
    direction.copy(worldDirection).normalize();
    if (direction.lengthSq() < 1e-8) direction.copy(from);
    turn.setFromUnitVectors(from, direction);
    direction.copy(from).applyQuaternion(blend.identity().slerp(turn, weight));
    target.copy(palm).lerp(worldTarget, weight).addScaledVector(direction, -palm.distanceTo(wrist));
    reach(target);
    if (hand.parent) inverse.copy(hand.parent.matrixWorld).invert(); else inverse.identity();
    from.copy(axis).applyQuaternion(hand.quaternion);
    direction.transformDirection(inverse);
    hand.quaternion.premultiply(turn.setFromUnitVectors(from, direction));
    return hand.localToWorld(out.copy(offset));
  };
}

/**
 * Holds a thing in a hand after posing (./fingers.ts): the hand turns so that its grip's axis (`axisLocal`, in the hand
 * bone's frame) lies along the held thing's `axis`, with the least rotation from the authored palm, and the arm reaches
 * so that the grip's socket (`socketLocal`) comes to `target`. Even a symmetric bail uses the caller's directed axis:
 * choosing its sign from the moving palm would flip the hand as that palm passed a right angle. Weight blends from the hand as
 * posed. Returns the socket where it is (a reach too far is clamped), and the thing's axis as held in `axisOut`.
 */
export function createHandHold(_lower: Object3D, hand: Object3D, reach: (target: Vector3) => void,
  fingerAxis = new Vector3(0, 1, 0)) {
  const scale = new Vector3(), now = new Vector3(), wrist = new Vector3();
  const along = new Vector3(), want = new Vector3(), side = new Vector3();
  const current = new Quaternion(), turned = new Quaternion(), parent = new Quaternion();
  const fingers = new Vector3(), localFingers = new Vector3(), cross = new Vector3(), from = new Matrix4(), to = new Matrix4();
  return (socketLocal: Vector3, axisLocal: Vector3, target: Vector3, axis: Vector3, out: Vector3, weight = 1,
    axisOut?: Vector3, fingerDirection?: Vector3): Vector3 => {
    weight = Math.max(0, Math.min(1, weight));
    hand.updateWorldMatrix(true, false);
    if (weight === 0) {
      if (axisOut) axisOut.copy(axisLocal).transformDirection(hand.matrixWorld);
      return hand.localToWorld(out.copy(socketLocal));
    }
    const size = hand.getWorldScale(scale).x;
    hand.localToWorld(now.copy(socketLocal));
    hand.getWorldQuaternion(current);
    // Keep the authored palm's roll. A projected forearm has no direction when parallel to the held axis;
    // switching to another reference there made a walking hand flip by half a turn in one frame.
    along.copy(axisLocal).applyQuaternion(current).normalize();
    want.copy(axis).normalize();
    if (want.lengthSq() < 1e-8) want.copy(along);
    turned.setFromUnitVectors(along, want).multiply(current);
    // A tool can own its roll as well as its axis (a torch, fingers below the barrel). Use the measured hand frame,
    // rather than choosing a half-turn from an almost opposite authored palm. Other grips keep their authored roll.
    if (fingerDirection) {
      fingers.copy(fingerDirection).addScaledVector(want, -fingerDirection.dot(want));
      localFingers.copy(fingerAxis).addScaledVector(axisLocal, -fingerAxis.dot(axisLocal));
      if (fingers.lengthSq() > 1e-8 && localFingers.lengthSq() > 1e-8) {
        fingers.normalize(); localFingers.normalize();
        from.makeBasis(axisLocal, localFingers, cross.crossVectors(axisLocal, localFingers));
        to.makeBasis(want, fingers, cross.crossVectors(want, fingers));
        turned.setFromRotationMatrix(to.multiply(from.transpose()));
      }
    }
    current.slerp(turned, weight);
    // The wrist where the socket comes to the target, and the arm to it.
    reach(wrist.copy(now).lerp(target, weight).sub(side.copy(socketLocal).multiplyScalar(size).applyQuaternion(current)));
    if (hand.parent) { hand.parent.updateWorldMatrix(true, false); hand.parent.getWorldQuaternion(parent); } else parent.identity();
    hand.quaternion.copy(parent.invert().multiply(current));
    hand.updateWorldMatrix(false, true);
    if (axisOut) axisOut.copy(axisLocal).transformDirection(hand.matrixWorld);
    return hand.localToWorld(out.copy(socketLocal));
  };
}
