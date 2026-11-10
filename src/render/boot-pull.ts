/** Bertil takes and releases his boot with both hands; event time holds the contact during reading and Pause. */
export function createBootPull() {
  let value = 0, from = 0, target = 0, elapsed = 0;
  const seconds = .55;
  return (pulling: boolean, dt: number, calm: boolean): number => {
    const next = pulling ? 1 : 0;
    if (calm) { from = target = value = next; elapsed = seconds; return value; }
    if (next !== target) { from = value; target = next; elapsed = 0; }
    elapsed = Math.min(seconds, elapsed + Math.max(0, dt));
    const t = elapsed / seconds, weight = t * t * (3 - 2 * t);
    // Start the release gently: a straight arm folds sharply if its contact loses a large share in one frame.
    return value = from + (target - from) * weight;
  };
}
