/**
 * Less motion is one switch with two sources (docs/ux-audit/style-and-sound.md row 17, "Motion"): the device's own
 * setting and *Mindre rörelse*. It is kept as `<html data-motion="reduce">`, which index.html sets from the save
 * before the first paint and main.ts keeps as either source changes. The stylesheet reads only the attribute; under
 * it every movement becomes a fade, loops stop, and the helper's knock is the same still ring.
 */
export const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** Sets the switch from *Mindre rörelse* and the device's setting. */
export function applyMotion(doc: Document, calm: boolean): void {
  const reduce = calm || !!doc.defaultView?.matchMedia?.(MOTION_QUERY).matches;
  if (reduce) doc.documentElement.dataset.motion = 'reduce';
  else delete doc.documentElement.dataset.motion;
}

/** Whether things should move less now. The device's setting counts even where nothing has set the switch yet. */
export function lessMotion(doc: Document = document): boolean {
  return doc.documentElement.dataset.motion === 'reduce' || !!doc.defaultView?.matchMedia?.(MOTION_QUERY).matches;
}
