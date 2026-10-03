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

/**
 * The deck edge: the planks he stands on, the red house behind, the drop to the lawn, and the lawn as a
 * jungle. A hook hangs under the lower deck, where the sun falls through between the boards.
 */
export const lookDeck: ChapterData = {
  id: 'look-deck',
  place: 'garden',
  spawn: { x: 6, y: 6.01 },
  goalX: 46,
  ground: [
    { x: -3, y: 15 },
    { x: -3, y: 6 },
    { x: 8, y: 6 },
    { x: 8, y: 6.6 },
    { x: 12, y: 6.6 },
    { x: 12, y: 6 },
    // the deck's edge, and the lawn below it
    { x: 16, y: 6 },
    { x: 16, y: 0 },
    { x: 50, y: 0 },
    { x: 50, y: 9 },
  ],
  surfaces: [
    { from: -19, to: 16, kind: 'wood' },
    { from: 16, to: 28, kind: 'earth' },
  ],
  roofs: [{ from: 16.6, to: 28, y: 5.2 }],
  house: { from: -40, to: 30, windows: [3, 20] },
  checkpoints: [{ x: 13.6, y: 6 }, { x: 31, y: 0 }],
  climbs: [{ x: 16.3, bottom: 0, top: 6, exit: -1 }],
  hooks: [{ x: 22.4, y: 3.3, length: 2.6, land: { x: 26, y: 0 } }],
  ghost: [{ at: { x: 10, y: 6.6 }, near: 0.5 }, { at: { x: 33, y: 0 } }, { at: { x: 43, y: 0 } }],
  cameras: [{ from: 14, to: 30, zoom: 1.25, lift: 0.4 }],
  candy: [
    { x: 7.4, y: 6.6 },
    { x: 9, y: 7.2 },
    { x: 11, y: 7.2 },
    { x: 12.8, y: 6.6 },
    { x: 14.6, y: 6.45 },
    { x: 16.3, y: 4.5 },
    { x: 16.3, y: 2.5 },
    { x: 17.6, y: 0.5 },
    { x: 19.4, y: 0.45 },
    { x: 21, y: 0.8 },
    { x: 22.4, y: 0.6 },
    { x: 23.8, y: 0.8 },
    { x: 25.4, y: 1.1 },
    { x: 27.4, y: 0.45 },
    { x: 29.4, y: 0.45 },
    { x: 33, y: 0.45 },
    { x: 35, y: 0.45 },
    { x: 37, y: 0.45 },
    { x: 39, y: 0.45 },
    { x: 41, y: 0.45 },
    { x: 43, y: 0.45 },
  ],
};
