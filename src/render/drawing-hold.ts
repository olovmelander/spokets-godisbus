import { Vector3 } from 'three';
import type { Act } from '../sim/scene';

/**
 * Where Moa holds her drawing in the prologue (src/render/stage.ts), shown and then held a little shyly (Olov, 13 November
 * 2026: "När Moa visat pappret med godisarna så ska det visas snyggt och inte gå in genom hennes kropp. Sen skäms Moa
 * litegrann av pappa och Elof").
 *
 * Shown, it is held out in front of her chest in both hands, its top under her chin, far enough ahead of her shoulders
 * that her chest and the long hair over it stay behind it: it was held so close that her hair came through it. Taken up,
 * it comes from her hands, but never from behind the front of her: it began at the middle between her hands, which hung
 * at her sides, inside her. Shy, she lifts it up in front of her face and hides behind it, her eyes peeking over its top
 * edge, and it bobs a little as she sways.
 *
 * Distances are in an adult's units (the stage's `unit`): down from her mouth and ahead of her shoulders.
 */
export const SHOWN = { below: .82, ahead: .66 } as const;
export const SHY = { below: .3, ahead: .74, bob: .035 } as const;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * How shy she is with it, 0 to 1: coming into it, and back out of it to showing it again. Letting the drawing go from
 * there, it stays where it was held.
 */
export function shyness(act: Act, before: Act | undefined, since: number, elapsed: number, calm: boolean, holds: boolean): number {
  if (act === 'shy') return calm ? 1 : smooth(since / .6);
  if (before !== 'shy') return 0;
  return holds && !calm ? 1 - smooth(elapsed / .45) : holds ? 0 : 1;
}

/**
 * The middle of the drawing: `at` comes in as her mouth's height over the middle between her shoulders, and goes out as
 * where the drawing's middle is held. `clock` keeps going while the story waits on a line, so she goes on swaying.
 */
export function drawingCentre(at: Vector3, forward: Vector3, unit: number, shy: number, clock: number, calm: boolean): Vector3 {
  const bob = calm ? 0 : SHY.bob * Math.sin(clock * 2.2 + 1.1);
  const below = SHOWN.below + (SHY.below + bob - SHOWN.below) * shy, ahead = SHOWN.ahead + (SHY.ahead - SHOWN.ahead) * shy;
  at.y -= below / unit;
  return at.addScaledVector(forward, ahead / unit);
}

/** A point brought out ahead, along `forward`, to the plane the drawing is held in, if it lies behind it. */
export function clearOf(point: Vector3, held: Vector3, forward: Vector3): Vector3 {
  const behind = (held.x - point.x) * forward.x + (held.z - point.z) * forward.z;
  if (behind > 0) point.addScaledVector(forward, behind);
  return point;
}
