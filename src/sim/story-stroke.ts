export interface StrokePoint { x: number; y: number }
export const EYE_Y = 86;
export const EYE_RADIUS = 22;
export function eyeCentres(spot: string): readonly number[] {
  return spot === 'eye' ? [116] : spot === 'paint' ? [204] : spot === 'dots' ? [116, 204] : [];
}
export function guidedEye(cx: number): StrokePoint[] {
  return Array.from({ length: 25 }, (_, i) => ({ x: cx + Math.sin(i * Math.PI / 12) * EYE_RADIUS, y: EYE_Y - Math.cos(i * Math.PI / 12) * EYE_RADIUS }));
}
/** A completed painted eye, clockwise or anticlockwise, with a generous corridor. */
export function validEyeStroke(points: readonly StrokePoint[], cx: number): boolean {
  if (points.length < 5 || points.length > 512) return false;
  let turn = 0, travel = 0;
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    const radius = Math.hypot(p.x - cx, p.y - EYE_Y);
    if (!Number.isFinite(radius) || radius < 9 || radius > 39) return false;
    if (!i) continue;
    const previous = points[i - 1]!;
    const delta = Math.atan2(p.y - EYE_Y, p.x - cx) - Math.atan2(previous.y - EYE_Y, previous.x - cx);
    const short = Math.atan2(Math.sin(delta), Math.cos(delta));
    turn += short;
    travel += Math.abs(short);
  }
  return Math.abs(turn) >= Math.PI * 1.5 && travel - Math.abs(turn) <= Math.PI;
}
/** Pappa finishes a short or wobbly stroke; a tap alone has not started painting. */
export function finishEyeStroke(points: readonly StrokePoint[], cx: number): StrokePoint[] | null {
  if (points.length < 2 || points.length > 512 || points.some((p) => !Number.isFinite(p.x + p.y) || p.x < 0 || p.x > 320 || p.y < 0 || p.y > 220)) return null;
  const distance = points.slice(1).reduce((sum, p, i) => sum + Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y), 0);
  return distance >= 3 ? guidedEye(cx) : null;
}

export const CARVE_FROM: StrokePoint = { x: 100, y: 150 };
export const CARVE_TO: StrokePoint = { x: 244, y: 70 };
const carveLength = Math.hypot(CARVE_TO.x - CARVE_FROM.x, CARVE_TO.y - CARVE_FROM.y);
export function guidedCarve(): StrokePoint[] {
  return Array.from({ length: 13 }, (_, i) => ({ x: CARVE_FROM.x + (CARVE_TO.x - CARVE_FROM.x) * i / 12, y: CARVE_FROM.y + (CARVE_TO.y - CARVE_FROM.y) * i / 12 }));
}
/** The hand starts beside the body and travels outwards. Tiny finger jitter is harmless. */
export function carveStrokeProgress(points: readonly StrokePoint[]): number | null {
  if (!points.length || points.length > 512) return null;
  if (Math.hypot(points[0]!.x - CARVE_FROM.x, points[0]!.y - CARVE_FROM.y) > 24) return null;
  let previous = 0, backwards = 0;
  for (const [i, p] of points.entries()) {
    if (!Number.isFinite(p.x + p.y)) return null;
    const x = p.x - CARVE_FROM.x, y = p.y - CARVE_FROM.y;
    const along = (x * (CARVE_TO.x - CARVE_FROM.x) + y * (CARVE_TO.y - CARVE_FROM.y)) / carveLength;
    const across = Math.abs(x * (CARVE_TO.y - CARVE_FROM.y) - y * (CARVE_TO.x - CARVE_FROM.x)) / carveLength;
    if (across > 26 || along < -24 || along > carveLength + 26) return null;
    if (i) backwards += Math.max(0, previous - along);
    if (backwards > 6) return null;
    previous = along;
  }
  return Math.max(0, Math.min(1, previous / carveLength));
}
export function validCarveStroke(points: readonly StrokePoint[]): boolean {
  const progress = carveStrokeProgress(points);
  const end = points[points.length - 1];
  return points.length >= 2 && progress !== null && progress >= .84 && !!end && Math.hypot(end.x - CARVE_TO.x, end.y - CARVE_TO.y) <= 28;
}
