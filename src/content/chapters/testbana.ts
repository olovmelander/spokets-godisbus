import type { ChapterData } from '../../sim/types';

/**
 * The test course. It is not part of the story: it has one of everything Elof can do so far. Units: EL.
 * From the left:
 * - flat ground, and a kerb he walks over;
 * - a low step (a hop), a high block (a held jump), and a ditch (a running jump, or a held jump out of it);
 * - a chasm too deep to land in: a miss ends in the glitter bubble;
 * - a ramp he walks up, and a wall he pulls himself up;
 * - a wall too high for that, with a hose to climb;
 * - a cliff too high to jump from, with a hose to slide down (Använd);
 * - a gully too wide to jump, with a hook over it: the lace (Använd), a swing, and Hoppa to let go;
 * - a puzzle in two steps: a plank he pulls over a pit with the lace (Dra), and a block he pushes to a wall
 *   in two goes (Knuffa) and climbs from;
 * - an exciting sequence: a stretch where drops fall, each announced by its shadow on the ground, with a
 *   big candy in the middle;
 * - and the big candy at the end.
 *
 * The ghost is always a little ahead. After the swing it stumbles: there Elof can come close, and Använd
 * says Ta! It gets away, and drops five candies.
 *
 * The candy trail shows the way (plan §4.3): a candy every 1.5 to 3 EL along the ground, an arc over each
 * jump (the higher the arc, the longer Hoppa is held), a line of candy up and down each hose, and at the
 * swing an arc for the flight that lands.
 */
export const testbana: ChapterData = {
  id: 'testbana',
  spawn: { x: 0, y: 0.01 },
  goalX: 87,
  ground: [
    { x: -4, y: 6 },
    { x: -4, y: 0 },
    // the kerb
    { x: 7, y: 0 },
    { x: 7, y: 0.25 },
    { x: 8.6, y: 0.25 },
    { x: 8.6, y: 0 },
    // the step
    { x: 10, y: 0 },
    { x: 10, y: 0.5 },
    { x: 13, y: 0.5 },
    { x: 13, y: 0 },
    // the block
    { x: 16, y: 0 },
    { x: 16, y: 0.95 },
    { x: 19, y: 0.95 },
    { x: 19, y: 0 },
    // the ditch
    { x: 22, y: 0 },
    { x: 22, y: -0.9 },
    { x: 23.8, y: -0.9 },
    { x: 23.8, y: 0 },
    // the chasm
    { x: 26, y: 0 },
    { x: 26, y: -7 },
    { x: 27.8, y: -7 },
    { x: 27.8, y: 0 },
    // the ramp
    { x: 31, y: 0 },
    { x: 33.5, y: 1.5 },
    // the wall he pulls himself up
    { x: 36, y: 1.5 },
    { x: 36, y: 2.8 },
    // the wall with the hose
    { x: 39, y: 2.8 },
    { x: 39, y: 6 },
    // the cliff with the hose down
    { x: 43, y: 6 },
    { x: 43, y: 0 },
    // the gully under the hook
    { x: 46, y: 0 },
    { x: 46, y: -6 },
    { x: 50.4, y: -6 },
    { x: 50.4, y: 0 },
    // the pit the plank bridges
    { x: 56, y: 0 },
    { x: 56, y: -5 },
    { x: 58.8, y: -5 },
    { x: 58.8, y: 0 },
    // the wall the block is pushed to
    { x: 67.3, y: 0 },
    { x: 67.3, y: 3.3 },
    { x: 90, y: 3.3 },
    { x: 90, y: 11 },
  ],
  ghost: [
    { at: { x: 6.2, y: 0 } },
    { at: { x: 12, y: 0.5 } },
    { at: { x: 17.5, y: 0.95 } },
    { at: { x: 25, y: 0 } },
    { at: { x: 30, y: 0 } },
    { at: { x: 34.8, y: 1.5 } },
    { at: { x: 37.6, y: 2.8 } },
    { at: { x: 41.6, y: 6 } },
    { at: { x: 45.2, y: 0 } },
    // the near-catch
    { at: { x: 52.6, y: 0 }, catch: 'caught' },
    { at: { x: 55.2, y: 0 } },
    { at: { x: 62.4, y: 0 } },
    { at: { x: 69.6, y: 3.3 } },
    { at: { x: 76.3, y: 3.3 } },
    { at: { x: 82.1, y: 3.3 } },
    { at: { x: 88.6, y: 3.3 } },
  ],
  // Wider pictures: the climb and the cliff, the swing, and the drops, whose shadows have to be seen ahead.
  cameras: [
    { from: 36, to: 44, zoom: 1.2 },
    { from: 44, to: 52, zoom: 1.3, lift: 0.4 },
    { from: 70, to: 87, zoom: 1.25, lead: 3.2 },
  ],
  // The drops keep different times, so the way through has to be read from their shadows.
  drips: [
    { at: { x: 73, y: 3.3 }, every: 1.8, first: 0.2 },
    { at: { x: 75.2, y: 3.3 }, every: 2.2, first: 1.1 },
    { at: { x: 77.4, y: 3.3 }, every: 1.6, first: 0.7 },
    { at: { x: 81, y: 3.3 }, every: 2, first: 0.4 },
    { at: { x: 83.2, y: 3.3 }, every: 1.5, first: 1.2 },
    { at: { x: 85.2, y: 3.3 }, every: 2.4, first: 0.9 },
  ],
  movers: [
    // Home on the far side of the pit; pulled, it lies across it with its top level with the ground.
    { id: 'plank', width: 3.1, height: 0.4, verb: 'pull', ring: { x: -1.4, y: 0.55 }, stops: [{ x: 60.6, y: 0 }, { x: 57.4, y: -0.4 }] },
    // Too high to walk onto, so he pushes it. Two pushes take it to the wall, which is too high without it.
    { id: 'block', width: 1, height: 1.5, verb: 'push', stops: [{ x: 64, y: 0 }, { x: 65.4, y: 0 }, { x: 66.8, y: 0 }] },
  ],
  // In reach from 1.4 EL before the edge, so there is time to throw the lace even at a run.
  hooks: [{ x: 47.5, y: 3.3, length: 2.7, land: { x: 51.8, y: 0 } }],
  // Big candies: after the jumps, after the chasm, on top of the hose, and before the swing.
  checkpoints: [
    { x: 20.8, y: 0 },
    { x: 30.3, y: 0 },
    { x: 40.5, y: 6 },
    { x: 44.9, y: 0 },
    { x: 54.6, y: 0 },
    // before the drops, and between them
    { x: 70.6, y: 3.3 },
    { x: 79.2, y: 3.3 },
  ],
  // What Lätta hopp jumps by itself: onto the step and the block, and across the ditch and the chasm.
  jumps: [
    { at: { x: 9.8, y: 0 }, dir: 1, land: { x: 10.7, y: 0.5 } },
    { at: { x: 15.8, y: 0 }, dir: 1, land: { x: 16.7, y: 0.95 } },
    { at: { x: 21.8, y: 0 }, dir: 1, land: { x: 24.4, y: 0 } },
    { at: { x: 25.8, y: 0 }, dir: 1, land: { x: 28.4, y: 0 } },
    // and, once the block stands at the wall, onto the block and from it onto the wall
    { at: { x: 66, y: 0 }, dir: 1, land: { x: 66.8, y: 1.5 }, needs: 'block' },
    { at: { x: 67, y: 1.5 }, dir: 1, land: { x: 67.9, y: 3.3 }, needs: 'block' },
  ],
  climbs: [
    { x: 38.7, bottom: 2.8, top: 6, exit: 1 },
    { x: 43.3, bottom: 0, top: 6, exit: -1 },
  ],
  candy: [
    { x: 2, y: 0.45 },
    { x: 4, y: 0.45 },
    { x: 5.6, y: 0.45 },
    { x: 7.8, y: 0.7 },
    // a low arc: a hop takes the step
    { x: 9.3, y: 0.8 },
    { x: 9.9, y: 1.1 },
    { x: 10.6, y: 1.05 },
    { x: 12, y: 0.95 },
    { x: 13.9, y: 0.45 },
    // a high arc: hold Hoppa to land on the block
    { x: 15.1, y: 0.85 },
    { x: 15.6, y: 1.4 },
    { x: 16.3, y: 1.6 },
    { x: 17.7, y: 1.4 },
    { x: 19.9, y: 0.45 },
    // a long arc: a running jump clears the ditch
    { x: 21.7, y: 0.75 },
    { x: 22.9, y: 1.25 },
    { x: 24.1, y: 0.75 },
    // and another across the chasm
    { x: 25.7, y: 0.75 },
    { x: 26.9, y: 1.25 },
    { x: 28.1, y: 0.75 },
    { x: 29.5, y: 0.45 },
    // up the ramp
    { x: 31.4, y: 0.7 },
    { x: 32.6, y: 1.4 },
    { x: 34.4, y: 1.95 },
    // up the wall
    { x: 35.7, y: 2.5 },
    { x: 36.5, y: 3.25 },
    { x: 37.8, y: 3.25 },
    // up the hose
    { x: 38.7, y: 4 },
    { x: 38.7, y: 5 },
    { x: 38.7, y: 6 },
    { x: 39.8, y: 6.45 },
    { x: 41.2, y: 6.45 },
    { x: 42.5, y: 6.45 },
    // down the other hose
    { x: 43.3, y: 5 },
    { x: 43.3, y: 3.5 },
    { x: 43.3, y: 2 },
    { x: 44.4, y: 0.45 },
    { x: 45.6, y: 0.45 },
    // along the swing
    { x: 46.5, y: 0.8 },
    { x: 47.5, y: 0.6 },
    { x: 48.5, y: 0.8 },
    // the flight that lands
    { x: 50, y: 1.75 },
    { x: 50.8, y: 1.6 },
    { x: 51.6, y: 0.8 },
    { x: 53, y: 0.45 },
    // what the ghost drops when it is nearly caught
    { x: 53.4, y: 0.6, after: 'caught' },
    { x: 53.8, y: 0.8, after: 'caught' },
    { x: 54.2, y: 0.9, after: 'caught' },
    { x: 54.6, y: 0.8, after: 'caught' },
    { x: 55, y: 0.6, after: 'caught' },
    { x: 55.3, y: 0.45 },
    // across the plank
    { x: 57.4, y: 0.45 },
    { x: 59.6, y: 0.45 },
    { x: 61.6, y: 0.45 },
    { x: 63, y: 0.45 },
    { x: 65.2, y: 0.45 },
    // up the block and the wall
    { x: 66.7, y: 2 },
    { x: 67.6, y: 3.8 },
    { x: 69.2, y: 3.75 },
    // between the drops
    { x: 71.6, y: 3.75 },
    { x: 74.1, y: 3.75 },
    { x: 76.3, y: 3.75 },
    { x: 78.3, y: 3.75 },
    { x: 79.9, y: 3.75 },
    { x: 82.1, y: 3.75 },
    { x: 84.2, y: 3.75 },
    { x: 86.3, y: 3.75 },
  ],
};
