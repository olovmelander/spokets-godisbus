import type { Candy, Jump, Vec } from '../../sim/types';

/**
 * Small helpers for authoring Äventyr 2's courses (docs/aventyr-2.md). Units: EL, as everywhere. They are the
 * same rules the first adventure's chapters follow: a trail candy floats about half an EL over the ground, one
 * every two EL on a walk, and along the arc of a jump or a ride.
 */

export { timeCard } from '../chapters/cards';

export const round = (n: number, places = 2): number => Math.round(n * 10 ** places) / 10 ** places;

/** A row of candy over ground at one height, one every `every` EL. */
export function row(from: number, to: number, ground: number, every = 2, after?: string): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: round(x, 1), y: round(ground + 0.45), ...(after ? { after } : {}) });
  return out;
}

/** A row of candy over a straight slope from (x0, y0) to (x1, y1). */
export function slopeRow(from: number, to: number, x0: number, y0: number, x1: number, y1: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: round(x, 1), y: round(y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) + 0.45) });
  return out;
}

/** A ride as the simulation flies it: eased along, with a sine's rise over the straight line between its ends. */
export interface Arc { from: Vec; to: Vec; rise: number }

/** A candy on a ride's arc, at `t` of the way, half an EL over where his feet are. */
export function along(ride: Arc, t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: round(ride.from.x + (ride.to.x - ride.from.x) * k, 1),
    y: round(ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * t) * ride.rise + 0.5, 1),
  };
}

/** Candy all along a ride, at these shares of the way. */
export const alongAll = (ride: Arc, at: readonly number[]): Candy[] => at.map((t) => along(ride, t));

/** A candy in the arc over a hop from one edge to a landing. */
export const hopCandy = (from: Vec, to: Vec, lift = 1.1): Candy => ({ x: round((from.x + to.x) / 2, 1), y: round(Math.max(from.y, to.y) + lift) });

/** Lätta hopp: a marked jump from an edge to where it lands. */
export const jump = (at: Vec, land: Vec, extra: Partial<Jump> = {}): Jump => ({ at, dir: land.x > at.x ? 1 : -1, land, ...extra });
