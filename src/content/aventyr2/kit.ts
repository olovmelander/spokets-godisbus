import { rideY } from '../../sim/ride-path';
import type { Candy, Flyby, Jump, Ride, Vec } from '../../sim/types';

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

/**
 * A ride as the simulation flies it: eased along, with a sine's rise over the straight line between its ends, low over
 * a stretch it skims (../../sim/ride-path.ts).
 */
export interface Arc { from: Vec; to: Vec; rise: number; skim?: Ride['skim'] }

/** A candy on a ride's arc, at `t` of the way, half an EL over where his feet are. */
export function along(ride: Arc, t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: round(ride.from.x + (ride.to.x - ride.from.x) * k, 1),
    y: round((ride.skim ? rideY(ride, t) : ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * t) * ride.rise) + 0.5, 1),
  };
}

/**
 * How mormor and morfar walk where a chapter sends them (`Spot.goesTo`, ./grandparents.ts): at an easy pace for their age,
 * in EL a second along the ground, and eased in and out over `ease` seconds more.
 */
export const ELDER_WALK = { pace: 2.6, ease: 0.5 };

/** How many seconds their walk from `from` to `to` takes, over ground whose height at x is `ground(x)`. */
export function elderWalk(from: number, to: number, ground: (x: number) => number): number {
  let long = 0;
  const parts = 40;
  for (let i = 0; i < parts; i++) {
    const a = from + ((to - from) * i) / parts, b = from + ((to - from) * (i + 1)) / parts;
    long += Math.hypot(b - a, ground(b) - ground(a));
  }
  return long / ELDER_WALK.pace + ELDER_WALK.ease;
}

/** Candy all along a ride, at these shares of the way. */
export const alongAll = (ride: Arc, at: readonly number[]): Candy[] => at.map((t) => along(ride, t));

/** A candy in the arc over a hop from one edge to a landing. */
export const hopCandy = (from: Vec, to: Vec, lift = 1.1): Candy => ({ x: round((from.x + to.x) / 2, 1), y: round(Math.max(from.y, to.y) + lift) });

/** Whether a flyby floats on the water, bobbing along, rather than tumbling through the air. */
export const afloat = (f: Flyby): boolean => Math.max(f.from.y, f.to.y) < 1.5;

/**
 * Where a flyby's figure is, `k` of the way through its flight (0 to 1), as the picture flies it (./render.ts): eased
 * along and back into the dark, over its tumble's rise. A scene's shots and Elof's eyes follow it from the same numbers.
 */
export function flightAt(f: Flyby, k: number): { x: number; y: number; z: number } {
  const t = Math.min(1, Math.max(0, k));
  const e = t * t * (3 - 2 * t);
  const z = f.z ?? -4;
  return {
    x: f.from.x + (f.to.x - f.from.x) * e,
    y: f.from.y + (f.to.y - f.from.y) * e + (afloat(f) ? 0 : Math.sin(Math.PI * t) * (f.rise ?? 2.2)),
    z: z + ((f.toZ ?? z) - z) * e,
  };
}

/** Lätta hopp: a marked jump from an edge to where it lands. */
export const jump = (at: Vec, land: Vec, extra: Partial<Jump> = {}): Jump => ({ at, dir: land.x > at.x ? 1 : -1, land, ...extra });
