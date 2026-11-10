/** The storm is a world field viewed through a moving window. Recycling an offscreen drop is invisible;
 * translating a drop or an expanding landing with the camera is not. Positive wind carries rain to the right. */
export const RAIN_SLANT = .32;
export const RAIN_ANGLE = Math.atan(RAIN_SLANT);
export const RAIN_BOX = { x: 34, y: 22, back: -8, front: 4 } as const;
const wrap = (value: number, centre: number, size: number) => centre - size / 2 + ((value - centre + size / 2) % size + size) % size;
export function rainDropAt(seed: { x: number; y: number; speed: number }, time: number, cx: number, cy: number) {
  return {
    x: wrap(seed.x + time * seed.speed * RAIN_SLANT, cx, RAIN_BOX.x),
    y: wrap(seed.y - time * seed.speed, cy, RAIN_BOX.y),
  };
}
/** UV y=0 is the lower, leading end of the streak. The long pale tail points upwind. */
export function rainStreakAlpha(uvY: number): number {
  const along = 1 - uvY;
  return Math.pow(along, 1.6) * (1 - Math.pow(along, 14));
}
export interface LandingSeed { x: number; z: number; phase: number; every: number }
export interface LandingAnchor { cycle: number; x: number; z: number }
/** A new impact chooses a point near the view once; its whole growing ring keeps that world position. */
export function rainLandingAt(seed: LandingSeed, index: number, time: number, cameraX: number, previous?: LandingAnchor): LandingAnchor & { age: number } {
  const round = time / seed.every + seed.phase, cycle = Math.floor(round), age = round - cycle;
  if (previous?.cycle === cycle) return { ...previous, age };
  const where = cycle * 7.31 + index * 3.7;
  return { cycle, age, x: cameraX + seed.x + Math.sin(where) * 2.5, z: seed.z + Math.cos(where) * .4 };
}
