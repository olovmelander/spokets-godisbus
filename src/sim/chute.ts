import { CHUTE_PULL, CHUTE_ROOM, CHUTE_SPEED, CHUTE_START, STEP } from './constants';
import type { Chute, Vec } from './types';

/**
 * A slide's chute (ChapterData.chutes; Olov, 14 November 2026: "Kan vi göra så att Elof faktiskt åker nedför
 * rutschkanan? Han ska fortfarande kunna gå uppför den, men när han tar sig nedför ska han åka."). Heading down it he
 * sits and slides: the simulation carries him along its line, as it carries him down a hose, gathering speed by the
 * step count alone, so the slide is the same at any frame rate and with every setting. Heading up it he walks.
 */

/** A slide under way: how far down the chute he is, in EL along it, and how fast he goes. */
export interface ChuteRun {
  chute: Chute;
  s: number;
  v: number;
}

export const chuteLength = (chute: Chute) => Math.hypot(chute.to.x - chute.from.x, chute.to.y - chute.from.y);
/** The way it goes down: 1 to the right, -1 to the left. */
export const chuteWay = (chute: Chute): 1 | -1 => (chute.to.x >= chute.from.x ? 1 : -1);

/** Where on the chute's line a point `s` EL down it is. */
export function chutePoint(chute: Chute, s: number): Vec {
  const k = Math.min(1, Math.max(0, s / chuteLength(chute)));
  return { x: chute.from.x + (chute.to.x - chute.from.x) * k, y: chute.from.y + (chute.to.y - chute.from.y) * k };
}

/** How fast he goes along and up, sliding at `v`. */
export function chuteVelocity(chute: Chute, v: number): Vec {
  const length = chuteLength(chute);
  return { x: ((chute.to.x - chute.from.x) / length) * v, y: ((chute.to.y - chute.from.y) / length) * v };
}

/**
 * The slide that begins where he stands at (x, y), pushing the stick `dir` at `speed` along the ground: on a chute's
 * line (or over its brink), with room left to slide, and heading the way it goes down. Null: he walks.
 */
export function chuteUnder(chutes: readonly Chute[], x: number, y: number, dir: number, speed: number): ChuteRun | null {
  for (const chute of chutes) {
    const way = chuteWay(chute);
    if (dir !== way) continue;
    const length = chuteLength(chute);
    const s = ((x - chute.from.x) / (chute.to.x - chute.from.x)) * length;
    if (s < 0 || s > length - CHUTE_ROOM) continue;
    // His body's uphill corner rests on a slope, so his feet's middle is a little over its line; at the brink it is level
    // with the top.
    if (Math.abs(y - chutePoint(chute, s).y) > 0.4) continue;
    return { chute, s, v: Math.min(CHUTE_START, Math.max(0, speed * way)) };
  }
  return null;
}

/** One step of a slide. True once he has come to the chute's foot. */
export function chuteStep(run: ChuteRun): boolean {
  run.v = Math.min(CHUTE_SPEED, run.v + CHUTE_PULL * STEP);
  run.s += run.v * STEP;
  return run.s >= chuteLength(run.chute);
}
