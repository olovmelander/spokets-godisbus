import type { Ride } from './types';

/**
 * Where a ride carries him, `t` of the way through it: eased along the straight line between its ends, with a sine's
 * rise over it (plan §4.2). A ride that skims (`Ride.skim`) comes down to the stretch it skims a little before it, goes
 * along it no higher than it says, and climbs back to its arc over a longer way after it, as a bird swoops low and
 * rises again. The simulation flies it, and the chapters lay their candy along it, with this.
 */

/** How far before a skimmed stretch the ride comes down to it, and how far after it it climbs back, in EL. */
export const SKIM_IN = 1.5;
export const SKIM_OUT = 4;

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };

/** The place along the course `t` of the way through. */
export function rideX(ride: Pick<Ride, 'from' | 'to'>, t: number): number {
  return ride.from.x + (ride.to.x - ride.from.x) * smooth(t);
}

/** His feet's height on the ride's middle line, `t` of the way through (the stick moves him from it). */
export function rideY(ride: Pick<Ride, 'from' | 'to' | 'rise' | 'skim'>, t: number): number {
  const k = smooth(t);
  const arc = ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * Math.min(1, Math.max(0, t))) * ride.rise;
  const skim = ride.skim;
  if (!skim) return arc;
  const x = ride.from.x + (ride.to.x - ride.from.x) * k;
  const low = smooth((x - (skim.from - SKIM_IN)) / SKIM_IN) * (1 - smooth((x - skim.to) / SKIM_OUT));
  return arc - Math.max(0, arc - skim.y) * low;
}
