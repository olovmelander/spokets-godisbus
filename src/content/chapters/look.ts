import type { ChapterData } from '../../sim/types';

/**
 * The golden frames (plan §5.6, Stage 0b): short stretches that exist to be looked at. Each holds Elof, a
 * red hook ring and candy, and is the picture every later scene of its place is compared with.
 * They are courses like any other, so they are drawn by the game itself: `?course=look-forest`.
 */

/** The moss under the spruces: a root to step over, a hollow with a hook over it, and a big candy. */
export const lookForest: ChapterData = {
  id: 'look-forest',
  place: 'forest',
  spawn: { x: 6, y: 0.01 },
  goalX: 44,
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    { x: 9.5, y: 0 },
    // a root across the path
    { x: 10.4, y: 0.42 },
    { x: 11.6, y: 0.42 },
    { x: 12.6, y: 0 },
    { x: 17, y: 0 },
    // the hollow
    { x: 18.2, y: -0.9 },
    { x: 22.4, y: -0.9 },
    { x: 23.6, y: 0.3 },
    { x: 32, y: 0.3 },
    { x: 34, y: 0 },
    { x: 48, y: 0 },
    { x: 48, y: 9 },
  ],
  checkpoints: [{ x: 14.4, y: 0 }],
  hooks: [{ x: 20.2, y: 3.3, length: 2.6, land: { x: 24.6, y: 0.3 } }],
  ghost: [{ at: { x: 12.6, y: 0 }, near: 0.5 }, { at: { x: 28, y: 0.3 } }, { at: { x: 40, y: 0 } }],
  cameras: [],
  candy: [
    { x: 7.6, y: 0.45 },
    { x: 9.2, y: 0.5 },
    { x: 11, y: 1.25 },
    { x: 12.8, y: 0.5 },
    { x: 15.8, y: 0.45 },
    { x: 17.6, y: 0.5 },
    { x: 19, y: 0.9 },
    { x: 20.2, y: 0.6 },
    { x: 21.4, y: 0.9 },
    { x: 23, y: 1.3 },
    { x: 25, y: 0.75 },
    { x: 27, y: 0.75 },
    { x: 29, y: 0.75 },
    { x: 31, y: 0.75 },
    { x: 33, y: 0.6 },
    { x: 35, y: 0.45 },
    { x: 37, y: 0.45 },
    { x: 39, y: 0.45 },
    { x: 41, y: 0.45 },
  ],
};
