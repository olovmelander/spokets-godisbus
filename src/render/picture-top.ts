import type { ChapterData } from '../sim/types';
import { walkLine } from './dressing/foreground';

/**
 * How high the play picture reaches (./lift/flora/trees.ts hangs a big tree's boughs just under it; ./village.ts grows a
 * yard birch's stem up into them). Here by itself, so that both can read it.
 */

const TAN = Math.tan(Math.PI / 12);
/** About how high over the ground he stands on the picture reaches at a depth, on a tablet held sideways (the lens 10.9 off). */
export const TOP = (z: number, lens = 10.9) => 0.08 * lens + (lens - z) * TAN;

/**
 * How high the picture's top reaches at a depth, at most, wherever he is when a thing at x is in it: the picture
 * follows where he can stand (dressing/foreground.ts `walkLine`), waits at the edge of a drop, and is wider and
 * lifted where the chapter says. A bough hung under that never hangs into the middle of the picture.
 */
export function pictureTop(chapter: ChapterData): (x: number, z: number) => number {
  const walk = walkLine(chapter);
  return (x, z) => {
    let top = -Infinity;
    const half = (10.9 - z) * TAN * 1.5;
    for (let eye = x - half; eye <= x + half; eye += 1) {
      const zones = (chapter.cameras ?? []).filter((zone) => eye >= zone.from && eye <= zone.to);
      const lens = 10.9 * Math.max(1, ...zones.map((zone) => zone.zoom ?? 1));
      // He may stand on a ledge over the ground there, and the picture goes up with him.
      const stand = Math.max(walk(eye, true), ...(chapter.ledges ?? []).filter((l) => Math.abs(l.x - eye) < l.width / 2).map((l) => l.y));
      top = Math.max(top, stand + TOP(z, lens) + Math.max(0, ...zones.map((zone) => zone.lift ?? 0)));
    }
    return top;
  };
}
