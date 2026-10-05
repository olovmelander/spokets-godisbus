import type { ChapterData } from '../../sim/types';

/**
 * The golden frames (plan §5.6, Stage 0b): short stretches that exist to be looked at. Each holds Elof, a
 * red hook ring and candy, and is the picture every later scene of its place is compared with.
 * They are courses like any other, so they are drawn by the game itself: `?course=look-forest`,
 * `?course=look-deck`, `?course=look-street`.
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

/**
 * The village street, in 61 EL: the pavement under the yarn shop's window, the kerb, one bar of the drain,
 * the crossing with a yard and the sky on its far side, and then the bakery's wall close behind him: the
 * bicycle leaning on it with the hook on its pedal over the cellar window's well, the window where the drops
 * fall, and the door behind its granite step. No shop is a real one, and nothing on the street is a letter.
 */
export const lookStreet: ChapterData = {
  id: 'look-street',
  place: 'village',
  spawn: { x: 1, y: 2.01 },
  goalX: 53.8,
  ground: [
    { x: -3, y: 14 },
    { x: -3, y: 2 },
    // the pavement, and the kerb down into the gutter
    { x: 7, y: 2 },
    { x: 7, y: 0 },
    // one bar of the drain, with the dark on both sides of it
    { x: 9.5, y: 0 },
    { x: 9.5, y: -6 },
    { x: 10.9, y: -6 },
    { x: 10.9, y: 0 },
    { x: 13.3, y: 0 },
    { x: 13.3, y: -6 },
    { x: 14.7, y: -6 },
    { x: 14.7, y: 0 },
    // the well of the cellar window
    { x: 27, y: 0 },
    { x: 27, y: -6 },
    { x: 31.4, y: -6 },
    { x: 31.4, y: 0 },
    { x: 58, y: 0 },
    { x: 58, y: 9 },
  ],
  surfaces: [
    { from: -19, to: 7, kind: 'paving' },
    { from: 10.9, to: 13.3, kind: 'iron' },
  ],
  street: [
    { from: -22, to: 7, depth: 'near', kind: 'house', wall: '#efe6c8', boards: 'lying', goods: 'yarn', windows: [{ from: -2.6, to: 4.4 }] },
    { from: 7, to: 18, depth: 'far', kind: 'yard', foot: 1 },
    {
      from: 18, to: 58, depth: 'near', kind: 'house', wall: '#e9e6dc', boards: 'upright', goods: 'bread',
      windows: [{ from: 37, to: 42.2 }], door: { from: 44.8, to: 50.8 }, pipes: [19.7], sign: 34.4, cellar: 29.2,
    },
  ],
  checkpoints: [{ x: 23, y: 0 }],
  hooks: [{ x: 28.5, y: 3.3, length: 2.7, land: { x: 32.8, y: 0 } }],
  drips: [
    { at: { x: 38.1, y: 0 }, every: 1.8, first: 0.2 },
    { at: { x: 40.3, y: 0 }, every: 2.2, first: 1.1 },
  ],
  jumps: [
    { at: { x: 9.3, y: 0 }, dir: 1, land: { x: 11.8, y: 0 } },
    { at: { x: 13.1, y: 0 }, dir: 1, land: { x: 15.6, y: 0 } },
  ],
  ghost: [{ at: { x: 5, y: 2 }, near: 0.5 }, { at: { x: 16.6, y: 0 } }, { at: { x: 34, y: 0 } }, { at: { x: 48, y: 0 } }],
  cameras: [
    { from: 8, to: 16, zoom: 1.2 },
    { from: 23, to: 33, zoom: 1.25, lift: 0.4 },
    { from: 36, to: 44, zoom: 1.25, lead: 3.2 },
  ],
  candy: [
    { x: 2.6, y: 2.45 },
    { x: 4.6, y: 2.45 },
    { x: 6.4, y: 2.45 },
    { x: 7.6, y: 1.6 },
    { x: 8.8, y: 0.45 },
    { x: 10.2, y: 1.15 },
    { x: 12.1, y: 0.45 },
    { x: 14, y: 1.15 },
    { x: 16, y: 0.45 },
    { x: 18, y: 0.45 },
    { x: 20, y: 0.45 },
    { x: 25, y: 0.45 },
    { x: 27.5, y: 0.8 },
    { x: 28.5, y: 0.6 },
    { x: 29.5, y: 0.8 },
    { x: 31, y: 1.75 },
    { x: 31.8, y: 1.6 },
    { x: 32.6, y: 0.8 },
    { x: 34.6, y: 0.45 },
    { x: 36.6, y: 0.45 },
    { x: 39.2, y: 0.45 },
    { x: 41.6, y: 0.45 },
    { x: 43.6, y: 0.45 },
    { x: 45.6, y: 0.45 },
    { x: 47.6, y: 0.45 },
    { x: 49.6, y: 0.45 },
    { x: 51.6, y: 0.45 },
  ],
};
