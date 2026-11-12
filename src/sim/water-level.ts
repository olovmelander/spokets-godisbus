import type { Mover } from './types';

/**
 * A floating thing that has not yet been lifted lies awash, as Granskogen's leaf does: its top this far over the water,
 * under the water's reach, so that a jump down onto it is a fall into the water and the glitter bubble takes him back.
 */
export const AWASH = 0.05;

/**
 * How high a stretch of water stands under the thing that floats on it (`floats`, Stormgården's lid in its ditch), with
 * the thing's bottom at `y`. At its first stop the thing lies awash; as the water fills, it rises, and comes out of the
 * water, until at its last stop it lies on the banks with the water at the stretch's own height under it.
 */
export function levelUnder(pool: { y: number }, floats: Pick<Mover, 'height' | 'stops'>, y: number): number {
  const first = floats.stops[0]!;
  const last = floats.stops[floats.stops.length - 1]!;
  const low = first.y + floats.height - AWASH;
  const k = last.y === first.y ? 1 : Math.min(1, Math.max(0, (y - first.y) / (last.y - first.y)));
  return low + (pool.y - low) * k;
}
