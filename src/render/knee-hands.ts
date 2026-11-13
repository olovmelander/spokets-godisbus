import { Vector3 } from 'three';
import type { Grip } from './fingers';
import { KNEE_HAND, kneelLegs } from './gait';
import { STANDS } from './motion-data';
import type { Legs, Pose, Rig, Role } from './rig';

/**
 * A grown-up kneeling outside a scene (src/render/view.ts): in the epilogue Pappa kneels beside Elof while he carves and
 * paints. He goes down on his own legs, as the family kneel in the scenes (./gait.ts kneelLegs: the left knee on the
 * floor, the right foot ahead), and his right hand rests on the right knee, the one that is up, as their hands do there
 * (src/render/stage.ts): palm flat on its visible top, fingers forward. Before, his legs were set to fixed angles that
 * left the back knee off the floor, and his hands hung down through the knee in front (Olov, 13 November 2026: "när
 * föräldrarna står på knä så måste vi fixa så att handen ligger på knät och inte igenom knät genom hela kapitlet").
 */

/** The legs as kneelLegs puts them, mixed in by `weight`; the trunk leans a little towards what he looks at. */
const LEGS = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR'] as const;
const kneeled = {} as Pose;
export function kneelOnOwnLegs(pose: Pose, legs: Legs, weight: number, who: Role, lean = .4): void {
  if (weight <= 1e-3) return;
  Object.assign(kneeled, pose);
  kneelLegs(kneeled, legs, 1, 1, 0, 1, 0, 1, STANDS[who].width);
  for (const joint of LEGS) pose[joint] += (kneeled[joint] - pose[joint]) * weight;
  pose.lean += (Math.max(pose.lean, lean) - pose.lean) * weight;
  // The supporting arm starts relaxed, its elbow out, as the stage's does before its palm goes to the knee.
  pose.armR += (.2 - pose.armR) * weight;
  pose.elbowR += (.6 - pose.elbowR) * weight;
  pose.outR += (.4 - pose.outR) * weight;
  pose.wristR *= 1 - weight;
}

const FLAT: Grip = { kind: 'flat' };
const at = new Vector3(), ahead = new Vector3(), outside = new Vector3(), palm = new Vector3();
const DOWN = new Vector3(0, -1, 0), UP = new Vector3(0, 1, 0);
/** How far over the knee a palm on its way to it aims, at the start of the way, in the body's heights. */
export const ABOVE = .06;
/**
 * After the body is posed: a hand laid flat on the top of its own knee (the visible surface where the model has one),
 * the fingers forward, the way the body faces (its +z), the elbow out to its own side (+x is its left).
 */
export function handOnKnee(rig: Rig, side: 0 | 1, weight: number): void {
  if (weight <= 1e-3 || !rig.knee) return;
  if (rig.kneeSurface) rig.kneeSurface(side, at);
  else rig.knee(side, at).addScaledVector(UP, rig.height * KNEE_HAND.up);
  // On the way, the palm comes down onto the knee from over it, not up through it as the knee rises under it.
  at.addScaledVector(UP, (1 - weight) * rig.height * ABOVE);
  rig.group.updateWorldMatrix(true, false);
  ahead.set(0, 0, 1).transformDirection(rig.group.matrixWorld).setY(0).normalize();
  outside.set(ahead.z, 0, -ahead.x).multiplyScalar(side === 0 ? 1 : -1);
  rig.grip(side, at, ahead, palm, weight, DOWN, outside);
  rig.hold?.(side, FLAT, weight);
}
