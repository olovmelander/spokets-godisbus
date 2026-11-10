import { Vector3, type Object3D } from 'three';
import type { Rig } from './rig';

export const GOLD_HAND = 1 as const;
export const GOLD_GRIP = { kind: 'pinch' as const, size: .05 };
const target = new Vector3();
const smooth = (t: number) => { const x = Math.max(0, Math.min(1, t)); return x * x * (3 - 2 * x); };

/** The carried sweet gives its hand to the authored inspection pose over the first moment of the scene. */
export const goldCarryWeight = (seconds: number) => 1 - smooth(seconds / .45);
/** It has been swallowed by 1.4s; lower the empty hand before growth replaces the eating act at 1.8s. */
export const goldMouthWeight = (seconds: number) => 1 - smooth((seconds - 1.4) / .4);

/** Norrsken’s sweet arrives in the hand, then shrinks away during growth; contact eases at both ends. */
export const goldGrowthWeight = (grown: number) => smooth(grown / .24) * (1 - smooth((grown - .32) / .13));

/** One carrying hand before and into the taste scene, applied after posing and before the scene's contact. */
export function carryGold(rig: Pick<Rig, 'reach' | 'hold'>, body: Object3D, clock: number, calm: boolean, weight: number): void {
  if (weight <= 0) return;
  body.updateWorldMatrix(true, false);
  target.set(.34, .7, .2).applyMatrix4(body.matrixWorld);
  rig.reach(GOLD_HAND, target, (calm ? .75 : .7 + .05 * Math.sin(clock * 2.1)) * weight);
  rig.hold?.(GOLD_HAND, GOLD_GRIP, weight);
}

const mouth = new Vector3();
/** Norrsken’s left hand raises the sweet to the lips and returns smoothly as the prop shrinks away. */
export function tasteGrowingGold(rig: Pick<Rig, 'reach' | 'hold' | 'mouth'>, body: Object3D, grown: number): void {
  body.updateWorldMatrix(true, false);
  rig.mouth(mouth);
  target.set(.3, .62, .18).applyMatrix4(body.matrixWorld).lerp(mouth, smooth(grown / .3));
  const contact = goldGrowthWeight(grown);
  rig.reach(0, target, contact);
  rig.hold?.(0, GOLD_GRIP, contact);
}
