import { Matrix4, Quaternion, Vector3, type Object3D } from 'three';
import { STANDING, type Pose, type Rig, type Role } from './rig';
import type { GripTurn } from './arm-contact';
import type { Grip } from './fingers';
import { LAMP_BARREL, LAMP_GLASS, LAMP_HELD, LAMP_TAIL } from './flashlight';

/**
 * How a flashlight is held (Olov, 14 November 2026: "Kan vi förbättra hur karaktärerna håller i sina ficklampor så att
 * det ser snyggare och mer naturligt ut genom hela spelet?"; 12 November: "Pappa måste hålla i ficklampan på ett snyggt och
 * naturligt sätt").
 *
 * As a person carries one to light the way: the barrel lies slanting across the palm with the lens out past the first
 * finger and the thumb along it (./fingers.ts, `torch`), so the beam goes on above the forearm's own line with the wrist
 * nearly straight. Held as a handle is, straight across the palm, the wrist stood a quarter turn off the forearm.
 *
 * The arm is placed, not left to whatever the pose before happened to bend: the upper arm hangs easily beside the body, a
 * little forward and out; the forearm lies under the beam by as much as the hand's own grip asks (`FOREARM_UNDER`), and
 * the elbow is told where it belongs. A beam at something low (Elof at their feet, the path) is so carried in a nearly
 * hanging arm beside the hip, the wrist turning the lamp down; one held level or up (out through a window, over the
 * water) with the forearm raised and the elbow in front of the ribs. Where the lamp would go into the coat (a beam across
 * the body), the hand goes out before it until the lamp is clear. The arm swings a little with the stride, the lamp going
 * with the hand and its light staying on what it lights; the beam and the hand go over to something new at a hand's
 * pace. The live shoulder and the arm's real lengths follow a kneel, a lean and getting up.
 *
 * Both of the family's bodies hold it so: the models from Blender, whose fingers close round it, and the figures built in
 * code, whose hand is put where the same arm has it.
 */

/**
 * How far the forearm lies below the beam, in radians: a quarter turn less the barrel's slant across the palm
 * (./fingers.ts TORCH_SLANT) and less `WRIST_GIVE`, the wrist's easy give towards the little finger. A body with a hand
 * that has fingers says by its own grip; this is for one without (the figures built in code), as the family's models
 * hold theirs.
 */
export const FOREARM_UNDER = 0.9, WRIST_GIVE = 0.32;
/** How fast a carrying forearm turns to a new way, in radians a second: the beam leaving Klonk for Elof. */
const CARRY_TURN = 3;
/** How fast the beam itself swings to something new, in radians a second: a turn of the wrist, never a jump. */
const BEAM_TURN = 7;
/** How fast the hand goes to a new place against the body, in the body's heights a second: a handover's start, a lamp let down. */
const HAND_SPEED = 2;
/** The least the elbow stays bent, in radians: an arm carrying something never hangs quite straight. */
const LEAST_BEND = 0.3;
/** How far the carrying arm swings with the stride, for each height the knees are apart along the way, and at most. */
const STRIDE_SWING = 1.6, MOST_SWING = 0.2;

const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3();
const forward = new Vector3(), across = new Vector3(), direction = new Vector3(), held = new Vector3();
const before = new Vector3(), turn = new Quaternion(), blend = new Quaternion();
const frame = new Matrix4(), frameUp = new Vector3(), frameSide = new Vector3();
const axis = new Vector3(0, 0, 1);
const fingersDown = new Vector3(0, -1, 0);
const grip: Grip = { kind: 'torch', size: LAMP_BARREL };
const frames = new WeakMap<Object3D, { axis: Vector3; rotation: Quaternion; time?: number; hands: [GripTurn, GripTurn]; forearm?: Vector3; place?: Vector3 }>();
const carriedFrame = new Quaternion(), transport = new Quaternion();
const ARM = [['armL', 'elbowL', 'wristL', 'outL'], ['armR', 'elbowR', 'wristR', 'outR']] as const;

/**
 * A body that can carry a lamp: one with an arm to place (the family's, Elof's model) is carried as above; one with a hand
 * only (Elof's figure built in code) has the lamp put in the hand where it is.
 */
export type LampHolder = Pick<Rig, 'hand' | 'reach'> & Partial<Pick<Rig, 'group' | 'arm' | 'knee' | 'height' | 'trunk' | 'grasp' | 'socket' | 'socketIn'>>;

/**
 * Where Elof's own lamp lights (Stormkvällen, from the table to Pappa): the floor a few steps ahead of him the way he
 * faces. `turn` is his turn about the upright, 0 along the course (he walks turned a little towards the camera); `big`
 * how big he is drawn.
 */
export function lightAhead(out: Vector3, x: number, y: number, turn: number, big: number): Vector3 {
  return out.set(x + Math.cos(turn) * 1.6 * big, y + 0.1 * big, -Math.sin(turn) * 1.6 * big);
}

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
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * The carrying arm as the body has it now: its lengths, how tall the body is in the world (by its arm: a body may be
 * drawn bigger than it was made, as Elof is at home), the stride's swing, the trunk the lamp must keep out of, and the
 * grip's socket in the hand's own frame.
 */
const body = {
  upper: 0, fore: 0, tall: 1, swing: 0, size: 1, fingered: false, under: FOREARM_UNDER,
  /** Between the shoulders, and the trunk's half width and half depth about the upright through there (coat and all). */
  middle: new Vector3(), half: 0, wide: 0, deep: 0,
  /** The socket from the wrist, its axis and the fingers' way, in the hand's frame; and those two made square. */
  at: new Vector3(), axis: new Vector3(), along: new Vector3(), fingers: new Vector3(), third: new Vector3(),
};
/**
 * An arm's length (shoulder to wrist) as a share of its body's height: between the family's models' (a quarter) and the
 * figures' built in code (0.31).
 */
const ARM_OF_HEIGHT = 0.28;
/**
 * The trunk's round about the upright between the shoulders, for a body that does not say its own (Rig.trunk): its half
 * width and its half depth, as shares of half the way from shoulder to shoulder. As the family's models are in their
 * raincoats: 1.2 to 1.5 times as wide as their shoulders' joints, and about as deep as those are apart.
 */
const TRUNK_WIDE = 1.3, TRUNK_DEEP = 1.05;
const kneeL = new Vector3(), kneeR = new Vector3(), span = new Vector3(), feet = new Vector3(), group = new Matrix4();

/** Measures the body for a carry in `side`: false where it has no arm to measure (a hand only). */
function measure(rig: LampHolder, side: 0 | 1, size: number): boolean {
  grip.size = LAMP_BARREL * size;
  body.size = size; body.tall = rig.height ?? 1;
  group.identity();
  if (rig.group) { rig.group.updateWorldMatrix(true, false); group.copy(rig.group.matrixWorld); }
  forward.set(0, 0, 1).transformDirection(group);
  across.set(side === 0 ? 1 : -1, 0, 0).transformDirection(group);
  inverse.copy(group).invert();
  if (!rig.arm) return false;
  // Which way the body faces, from its own shoulders: a model may face another way in its group than the figures built in
  // code do (Elof's), and the shoulders turn a little with the stride.
  rig.arm(side === 0 ? 1 : 0, body.middle, elbow, wrist);
  rig.arm(side, shoulder, elbow, wrist);
  span.subVectors(shoulder, body.middle).setY(0);
  const round = rig.trunk;
  body.half = 0.5 * span.length();
  body.wide = (round?.wide ?? TRUNK_WIDE) * body.half; body.deep = (round?.deep ?? TRUNK_DEEP) * body.half;
  if (span.lengthSq() > 1e-8) {
    across.copy(span).normalize();
    forward.set(side === 0 ? -across.z : across.z, 0, side === 0 ? across.x : -across.x);
  }
  body.middle.add(shoulder).multiplyScalar(0.5);
  body.upper = shoulder.distanceTo(elbow); body.fore = elbow.distanceTo(wrist);
  body.tall = (body.upper + body.fore) / ARM_OF_HEIGHT;
  // The stride: the arm goes with the other leg, as far as the knees are apart along the way; not on a knee or sitting.
  body.swing = 0;
  if (rig.knee) {
    rig.knee(0, kneeL); rig.knee(1, kneeR);
    const ground = feet.setFromMatrixPosition(group).y;
    const up = smooth(((Math.min(kneeL.y, kneeR.y) - ground) / body.tall - 0.1) / 0.08);
    const apart = kneeL.sub(kneeR).dot(forward) / body.tall * (side === 0 ? -1 : 1);
    body.swing = up * Math.max(-MOST_SWING, Math.min(MOST_SWING, STRIDE_SWING * apart));
  }
  body.fingered = !!rig.socketIn?.(side, grip, body.at, body.axis, body.along);
  body.under = FOREARM_UNDER;
  if (body.fingered) {
    body.under = Math.max(0.2, Math.acos(Math.max(-1, Math.min(1, body.axis.dot(body.along)))) - WRIST_GIVE);
    body.fingers.copy(body.along).addScaledVector(body.axis, -body.along.dot(body.axis)).normalize();
    body.third.crossVectors(body.axis, body.fingers);
  }
  return true;
}

const fore = new Vector3(), hang = new Vector3(), elbowAt = new Vector3(), wristAt = new Vector3(), socketAt = new Vector3();
const elbowWay = new Vector3(), forearm = new Vector3(), heldForearm = new Vector3(), third = new Vector3(), bendAxis = new Vector3();
const local = new Matrix4(), world = new Matrix4(), handTurn = new Quaternion(), part = new Vector3();

/**
 * The forearm's way for a beam along `beam`, into `fore`: under the beam, as the lamp rests in the hand; held `out`
 * further before the body than it would be by itself.
 */
function forearmFor(beam: Vector3, out: number): void {
  // The forearm under the beam: the barrel slants across the palm (./fingers.ts). A beam nearly straight down (Elof at
  // their feet) has no under: the arm hangs and the wrist turns the lamp, so that he passes below without the hand swinging
  // from one side of him to the other.
  // And a beam held up (out through the window, at the shelf) lifts the hand with it: the forearm comes up nearer the
  // beam, the wrist cocked, so that the light goes over the sill and not into the wall under it.
  resting.set(0, -1, 0).applyQuaternion(aimFrame(beam, rest));
  const level = smooth(Math.hypot(beam.x, beam.z) / 0.6), under = body.under * (1 - 0.5 * smooth(beam.y / 0.6));
  fore.copy(beam).multiplyScalar(Math.cos(under)).addScaledVector(resting, Math.sin(under) * level);
  // Always out in front of the body, never far across it (a hanging hand not at all: it stays beside its own hip, not in
  // front of the legs), never straight down a leg nor up over the head: the wrist gives the rest.
  const least = 0.16 + out;
  const ahead = fore.dot(forward);
  if (ahead < least) fore.addScaledVector(forward, least - ahead);
  const hanging = smooth((-fore.y - 0.5) / 0.35), inmost = 0.05 * hanging - 0.25 * (1 - hanging);
  const outward = fore.dot(across);
  if (outward < inmost) fore.addScaledVector(across, inmost - outward);
  fore.normalize();
  // A beam held high (the shelf, the lamp over the table) has the forearm raised out before the body, whichever way the
  // beam itself leans up there.
  const high = smooth((fore.y - 0.25) / 0.5);
  if (high > 0) fore.addScaledVector(forward, 0.45 * high).normalize();
  const up = Math.max(-0.985, Math.min(0.5, fore.y));
  if (up !== fore.y) {
    const flat = Math.hypot(fore.x, fore.z), keep = Math.sqrt(1 - up * up) / Math.max(1e-6, flat);
    fore.set(fore.x * keep, up, fore.z * keep);
  }
  // With the stride the forearm swings half as far as the upper arm does: the hand leads and trails the elbow a little.
  fore.addScaledVector(forward, 0.5 * body.swing).normalize();
}

/** The arm for the forearm's way in `fore`: the elbow, the wrist, and the lamp's place in the hand turned to the beam. */
function armFor(beam: Vector3, down: Vector3): void {
  // The upper arm hangs, a little forward and out; a raised forearm brings the elbow forward in front of the ribs, and one
  // held out to the side takes it out a little too.
  const raised = smooth((fore.y + 0.85) / 1.05);
  hang.copy(DOWN).addScaledVector(forward, 0.12 + 0.42 * raised + body.swing)
    .addScaledVector(across, 0.15 + 0.07 * raised + 0.12 * Math.max(0, fore.dot(across))).normalize();
  // Never quite straight: the elbow goes back, the way an elbow bends, until the arm does. (Always back: turned away from
  // the forearm's own line whichever side that lay, the elbow jumped from one side to the other as the forearm passed it.)
  const bend = hang.angleTo(fore);
  if (bend < LEAST_BEND) hang.applyAxisAngle(bendAxis.crossVectors(forward, DOWN).normalize(), LEAST_BEND - bend);
  elbowAt.copy(shoulder).addScaledVector(hang, body.upper);
  wristAt.copy(elbowAt).addScaledVector(fore, body.fore);
  socketAt.copy(wristAt);
  if (body.fingered) {
    // The hand as it holds the barrel along the beam: the socket from the wrist, turned with it.
    third.crossVectors(beam, down);
    local.makeBasis(body.axis, body.fingers, body.third);
    world.makeBasis(beam, down, third);
    handTurn.setFromRotationMatrix(world.multiply(local.transpose()));
    socketAt.add(held.copy(body.at).applyQuaternion(handTurn));
  }
}

/**
 * Whether the lamp, held at `socketAt` along `beam`, is clear of the trunk: its glass, its middle and its tail outside the
 * coat's round, with the lamp's own thickness to spare. A lamp pointed across the body from a hanging hand went through
 * the coat and the legs.
 */
function clearOfTrunk(beam: Vector3): boolean {
  const spare = 0.12 * body.size, wide = body.wide + spare, deep = body.deep + spare;
  for (const along of [LAMP_GLASS - LAMP_HELD, 0.5 * (LAMP_GLASS - LAMP_HELD), 0, LAMP_TAIL - LAMP_HELD]) {
    part.copy(socketAt).addScaledVector(beam, along * body.size);
    if (part.y > shoulder.y) continue;
    part.sub(body.middle);
    const x = part.dot(across) / wide, z = part.dot(forward) / deep;
    if (x * x + z * z < 1) return false;
  }
  return true;
}

/**
 * Places the measured arm for a beam along `beam` (unit): `elbowAt`, `wristAt` and `socketAt` (the lamp's place in the
 * hand) in the world. The arm goes by the beam alone, the forearm under it as the lamp rests in the hand, and further out
 * before the body until the lamp is clear of the trunk; `down` (unit, square to the beam) is the fingers' side of the
 * barrel as the hand has it now, which may still be coming round to that after the beam has passed straight down: the
 * socket's place in the hand goes by it. With `was` (the forearm's way before, in the body's frame) the forearm turns
 * from it by at most `most` radians; `forearm` is left holding the way it took, in the body's frame.
 */
function place(beam: Vector3, down: Vector3, was: Vector3 | null, most: number): void {
  forearmFor(beam, 0);
  armFor(beam, down);
  if (!clearOfTrunk(beam)) {
    // Further out before the body: by as little as clears the coat, so that the hand goes there smoothly as the beam turns.
    let near = 0, far = 1.6;
    for (let n = 0; n < 7; n++) {
      const out = (near + far) / 2;
      forearmFor(beam, out);
      armFor(beam, down);
      if (clearOfTrunk(beam)) far = out; else near = out;
    }
    forearmFor(beam, far);
    armFor(beam, down);
  }
  forearm.copy(fore).transformDirection(inverse);
  if (was) {
    const angle = was.angleTo(forearm);
    if (angle > most && angle > 1e-6) {
      // Turned from the old way towards the new, about the axis between them, by as much as it may.
      pivot.crossVectors(was, forearm);
      if (pivot.lengthSq() < 1e-10) pivot.set(0, 1, 0);
      forearm.copy(was).applyAxisAngle(pivot.normalize(), most);
      fore.copy(forearm).transformDirection(group);
      armFor(beam, down);
    }
  }
}

/** The beam's frame at rest: its top up, as near as the beam lets it. */
function aimFrame(ray: Vector3, out: Quaternion): Quaternion {
  frameUp.set(0, 1, 0).addScaledVector(ray, -ray.y);
  // An overhead authored endpoint uses the body's forward side to define the top of the torch.
  // Intermediate frames are quaternion blends, so passing overhead never switches reference directions.
  if (frameUp.lengthSq() < 1e-8) frameUp.copy(forward).addScaledVector(ray, -forward.dot(ray));
  frameUp.normalize(); frameSide.crossVectors(frameUp, ray).normalize();
  frame.makeBasis(frameSide, frameUp, ray);
  return out.setFromRotationMatrix(frame);
}

const ray = new Vector3(), under = new Vector3(), rest = new Quaternion(), resting = new Vector3();

/**
 * The beam from where the hand carries the lamp for `aim`, the hand at rest on it: `out` is its way, and `socketAt` (and
 * the arm with it) where the lamp is then. The hand's place depends on the beam and the beam on the hand's place: a few
 * rounds settle them. With no aim, forward and a little down, as a lamp is carried walking. `was` and `most`: as `place`.
 */
function beamTo(aim: Vector3 | null, out: Vector3, was: Vector3 | null = null, most = 0): Vector3 {
  out.copy(forward); out.y = -0.3; out.normalize();
  for (let round = 0; round < (aim ? 8 : 1); round++) {
    under.set(0, -1, 0).applyQuaternion(aimFrame(out, blend));
    place(out, under, was, most);
    if (!aim) break;
    ray.subVectors(aim, socketAt);
    if (ray.lengthSq() < 1e-8) break;
    const settled = ray.normalize().distanceToSquared(out) < 1e-20;
    out.copy(ray);
    if (settled) break;
  }
  return out;
}

const endTo = new Vector3(), endFrom = new Vector3();

/**
 * Where a hand carries a torch for `aim` (./lamp-hold.ts, above): the lamp's place in it. `aimFrom` and `aimWeight` blend
 * it on the scene's clock, as the beam's own turn is blended. Both hands share it during a transfer.
 */
export function flashlightCarryTarget(rig: LampHolder, side: 0 | 1, out: Vector3, aim: Vector3 | null = null, aimFrom: Vector3 | null = null, aimWeight = 1, size = Math.max(.7, (rig.height ?? 5.2) / 5.2)): Vector3 {
  if (!measure(rig, side, size)) return rig.hand(side, out);
  beamTo(aim, direction);
  out.copy(socketAt);
  if (aimFrom && aimWeight < 1) {
    beamTo(aimFrom, direction);
    out.lerpVectors(socketAt, out, Math.max(0, aimWeight));
  }
  return out;
}

const carryL = new Vector3(), carryR = new Vector3(), belly = new Vector3();

/**
 * Where the two hands meet to pass a torch from the left to the right (`transfer`, 0 to 1: Pappa's, as he puts his coat
 * on): from where the left carries it, in before the belly where both hands reach it with their elbows bent, and out to
 * where the right carries it. Straight across from one hip to the other it went through the coat, further off than either
 * arm is long.
 */
export function flashlightHandover(rig: LampHolder, out: Vector3, transfer: number, aim: Vector3 | null = null, aimFrom: Vector3 | null = null, aimWeight = 1, size = Math.max(.7, (rig.height ?? 5.2) / 5.2)): Vector3 {
  flashlightCarryTarget(rig, 0, carryL, aim, aimFrom, aimWeight, size);
  flashlightCarryTarget(rig, 1, carryR, aim, aimFrom, aimWeight, size);
  const t = Math.max(0, Math.min(1, transfer));
  if (!rig.arm) return out.lerpVectors(carryL, carryR, t);
  // Far enough out that the lamp passes before the coat, whichever way it points meanwhile; and as low before the body as
  // both arms reach with their elbows bent (a wide-shouldered body's hands meet higher).
  const before = body.deep + .15 * body.size, half = body.half, reach = .85 * (body.upper + body.fore);
  const low = Math.sqrt(Math.max(0, reach * reach - half * half - before * before));
  belly.copy(body.middle).addScaledVector(DOWN, Math.max(.08 * body.tall, Math.min(.22 * body.tall, low))).addScaledVector(forward, before);
  // Through that place at the middle of the handover: a curve from the one carry to the other.
  out.copy(carryL).add(carryR).multiplyScalar(-.5).addScaledVector(belly, 2).multiplyScalar(2 * t * (1 - t));
  return out.addScaledVector(carryL, (1 - t) * (1 - t)).addScaledVector(carryR, t * t);
}

const target = new Vector3(), lampUp = new Vector3(), lampSide = new Vector3(), axisOut = new Vector3(), stood = new Vector3();

/**
 * Carry a torch (above). Only the carrying arm is solved; the other hand keeps what it does.
 * `weight` blends acquisition on the scene clock; the torch always follows the actual hand socket.
 * `aimFrom` and `aimWeight` blend the beam and the palm's roll together on that same clock. Blending target points
 * can sweep the target through the hand; deriving a new roll during that sweep can flip a wrist overhead.
 * `carried=false` preserves a working hand's authored position; `contact` gives both hands a shared handoff point.
 * `wall`: a room's back wall (its z, the room before it), which the lamp's glass stays before: leaning to the window to
 * pull it to, Pappa's lamp went into the wall beside it.
 */
export function holdFlashlight(rig: LampHolder, lamp: Object3D, side: 0 | 1, aim: Vector3 | null, size: number, carried = true, weight = 1,
  aimFrom: Vector3 | null = null, aimWeight = 1, time?: number, reset = false, contact?: Vector3, wall?: number): void {
  const armed = measure(rig, side, size);
  let previous = frames.get(lamp);
  const rewound = time !== undefined && previous?.time !== undefined && time < previous.time;
  const placed = carried && armed;
  // The carry follows where the beam goes: when that changes at once (the beam leaves Klonk for Elof), the forearm swings
  // over at a hand's pace rather than in one frame. Paused, it stays; a cut or a seek puts it where it belongs.
  const limited = placed && !!previous?.forearm && !contact && !reset && !rewound && time !== undefined && previous.time !== undefined;
  const was = limited ? previous!.forearm! : null, most = limited ? CARRY_TURN * Math.max(0, time! - previous!.time!) : 0;
  // While the beam turns from one thing to another, each end of the turn is taken from where the hand carries the torch
  // for that thing alone: those stand still while the hand goes over between them. A turn between ends that move with
  // it can go the long way round in one frame.
  const turning = !!aim && !!aimFrom && aimWeight < 1;
  if (placed) {
    // Not turning, the beam is taken from where the hand is on its way: the lamp points at what it lights from there.
    beamTo(aim, direction, turning ? null : was, turning ? 0 : most); endTo.copy(socketAt);
    if (turning) { beamTo(aimFrom, before); endFrom.copy(socketAt); }
  } else {
    if (rig.socket) rig.socket(side, grip, endTo); else rig.hand(side, endTo);
    endFrom.copy(endTo);
  }
  if (contact) { endTo.copy(contact); endFrom.copy(contact); }
  if (!placed || contact) {
    if (aim) direction.subVectors(aim, endTo).normalize();
    else { direction.copy(forward); direction.y = -.3; direction.normalize(); }
    if (direction.lengthSq() < 1e-8) direction.copy(forward);
  }
  aimFrame(direction, turn);
  if (turning) {
    if (!placed || contact) before.subVectors(aimFrom!, endFrom).normalize();
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
    // Carried from frame to frame it is kept a pure turn: the beam and the fingers' side stay square to each other.
    turn.copy(carriedFrame).normalize();
  }
  fingersDown.set(0, -1, 0).applyQuaternion(turn);
  // The hand's place for that beam, with the palm as the frame now has it; and, settled on one thing, the lamp turned the
  // last hair so that it points exactly at it from there.
  if (placed) {
    place(direction, fingersDown, was, most);
    if (aim && !turning && !contact && ray.subVectors(aim, socketAt).lengthSq() > 1e-8) {
      turn.premultiply(transport.setFromUnitVectors(direction, ray.normalize())).normalize();
      direction.copy(ray); fingersDown.set(0, -1, 0).applyQuaternion(turn);
    }
  }
  // What it lights may change at once (the frozen one wakes, a scene ends): the beam swings over to it, the hand with it.
  if (previous && !reset && !rewound && time !== undefined && previous.time !== undefined) {
    const angle = previous.axis.angleTo(direction), swing = BEAM_TURN * Math.max(0, time - previous.time);
    if (angle > swing && angle > 1e-6) {
      pivot.crossVectors(previous.axis, direction);
      if (pivot.lengthSq() < 1e-10) pivot.crossVectors(previous.axis, Math.abs(previous.axis.y) < 0.9 ? DOWN : forward);
      ray.copy(previous.axis).applyAxisAngle(pivot.normalize(), swing);
      turn.premultiply(transport.setFromUnitVectors(direction, ray)).normalize();
      direction.copy(ray); fingersDown.set(0, -1, 0).applyQuaternion(turn);
      if (placed) place(direction, fingersDown, was, most);
    }
  }
  if (placed) {
    heldForearm.copy(forearm);
    target.copy(contact ?? socketAt);
    elbowWay.subVectors(elbowAt, shoulder);
  } else target.copy(contact ?? endTo);
  // Not into a wall: the hand comes back by as far as the glass would be in it.
  if (wall !== undefined && placed) target.z += Math.max(0, wall - (target.z + direction.z * (LAMP_GLASS - LAMP_HELD) * size));
  // A frame drawn again at the same moment (a pause, a reading stop) holds exactly what was drawn.
  if (previous && !reset && time === previous.time && direction.distanceToSquared(previous.axis) < 1e-18 && turn.angleTo(previous.rotation) < 1e-6) {
    direction.copy(previous.axis); turn.copy(previous.rotation); fingersDown.set(0, -1, 0).applyQuaternion(turn);
  }
  // The hand's place against the body changes at a hand's pace too: where a handover begins while the lamp is still on its
  // way down, the hands go to their meeting, they are not there in one frame.
  if (placed || contact) {
    stood.copy(target).applyMatrix4(inverse);
    if (previous?.place && !reset && !rewound && time !== undefined && previous.time !== undefined) {
      const step = HAND_SPEED * body.tall * Math.max(0, time - previous.time), far = stood.distanceTo(previous.place);
      if (far > step) target.copy(stood.sub(previous.place).multiplyScalar(step / far).add(previous.place)).applyMatrix4(group);
    }
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
  if (placed && !contact) (previous.forearm ??= new Vector3()).copy(heldForearm);
  else previous.forearm = undefined;
  if (placed || contact) (previous.place ??= new Vector3()).copy(stood);
  else previous.place = undefined;
  if (rig.grasp) {
    rig.grasp(side, grip, target, direction, held, weight, axisOut, fingersDown, previous.hands[side], placed ? elbowWay : undefined);
    lamp.position.copy(held).addScaledVector(axisOut, -LAMP_HELD * size);
  } else {
    if (placed || contact) rig.reach(side, target, weight, contact ? .95 : 1, placed ? elbowWay : undefined);
    rig.hand(side, held);
    lamp.position.copy(held);
    axisOut.copy(direction);
  }
  // Its switch under the thumb, which lies along the barrel on the side away from the fingers and a little over towards
  // the palm (./fingers.ts torchGrip): the lamp's own up goes there.
  lampUp.copy(fingersDown).negate().addScaledVector(third.crossVectors(axisOut, fingersDown), side === 0 ? -0.75 : 0.75);
  lampUp.addScaledVector(axisOut, -lampUp.dot(axisOut));
  if (lampUp.lengthSq() < 1e-8) lamp.quaternion.setFromUnitVectors(axis, axisOut);
  else {
    lampUp.normalize(); lampSide.crossVectors(lampUp, axisOut);
    lamp.quaternion.setFromRotationMatrix(frame.makeBasis(lampSide, lampUp, axisOut));
  }
  lamp.scale.setScalar(size);
}
