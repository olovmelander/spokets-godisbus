/** Blend authored directions along the short arc, before applying the body's one timed turn. */
export function facingBetween(from: number, to: number, weight: number): number {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * weight;
}

/** Only event time advances a helper's turn; extra speech or Pause redraws keep the same body direction. */
export function turnFamily(current: number, target: number, dt: number, calm: boolean, rate = 4): number {
  if (dt <= 0) return current;
  return facingBetween(current, target, calm ? 1 : -Math.expm1(-rate * dt));
}
