/** Where *Följ fingret*'s finger is held, as `followPoint()` in src/input/input.ts reports it. */
export interface HeldFinger {
  x: number;
  y: number;
  /** The hold has become a walk or a run. */
  steering: boolean;
  /** Far enough off to run him. */
  run: boolean;
}

/**
 * *Följ fingret*'s marks (docs/ux-audit/in-play.md row 11): a ring round the held finger, so that its edge shows round
 * the fingertip, and Moa's crayon arrow over his head, turned toward it. The ring lands small and opens to its size
 * as the hold becomes a walk, and goes candy yellow when the finger is far enough off to run him.
 */
export function createFingerMarks(doc: Document) {
  const ring = doc.getElementById('fingerRing')!;
  const arrow = doc.getElementById('followArrow')!;
  let shown = { ring: false, arrow: false, steering: false, run: false };
  return {
    /** One frame: the held finger (or null), the point over his head, and his centre, which the arrow turns from. */
    show(finger: HeldFinger | null, head: { x: number; y: number } | null, centre: { x: number; y: number } | null) {
      const on = {
        ring: finger !== null,
        arrow: finger?.steering === true && head !== null && centre !== null,
        steering: finger?.steering === true,
        run: finger?.run === true,
      };
      if (on.ring !== shown.ring) ring.hidden = !on.ring;
      if (on.arrow !== shown.arrow) arrow.hidden = !on.arrow;
      if (on.steering !== shown.steering) ring.classList.toggle('steering', on.steering);
      if (on.run !== shown.run) {
        ring.classList.toggle('run', on.run);
        arrow.classList.toggle('run', on.run);
      }
      if (finger) ring.style.translate = `${Math.round(finger.x)}px ${Math.round(finger.y)}px`;
      if (on.arrow && finger && head && centre) {
        arrow.style.translate = `${Math.round(head.x)}px ${Math.round(head.y)}px`;
        arrow.style.rotate = `${Math.atan2(finger.y - centre.y, finger.x - centre.x).toFixed(2)}rad`;
      }
      shown = on;
    },
  };
}
