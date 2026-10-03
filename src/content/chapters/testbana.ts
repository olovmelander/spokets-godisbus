import type { ChapterData } from '../../sim/types';

/**
 * Stage 0a's test course. It is not part of the story. Units: EL.
 * From the left: flat ground, a low step (a hop), a high block (a held jump), a ditch (a running jump,
 * or a held jump to get out of it), a chasm too deep to land in (a miss ends in the glitter bubble), and
 * the big candy at the end.
 *
 * The candy trail shows the way (plan §4.3): a candy every 1.5 to 3 EL along the ground, a low arc over the
 * step, a high arc onto the block, and a long arc across the ditch and across the chasm.
 */
export const testbana: ChapterData = {
  id: 'testbana',
  spawn: { x: 0, y: 0.01 },
  goalX: 30,
  ground: [
    { x: -4, y: 6 },
    { x: -4, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 0.5 },
    { x: 13, y: 0.5 },
    { x: 13, y: 0 },
    { x: 16, y: 0 },
    { x: 16, y: 0.95 },
    { x: 19, y: 0.95 },
    { x: 19, y: 0 },
    { x: 22, y: 0 },
    { x: 22, y: -0.9 },
    { x: 23.8, y: -0.9 },
    { x: 23.8, y: 0 },
    { x: 26, y: 0 },
    { x: 26, y: -7 },
    { x: 27.8, y: -7 },
    { x: 27.8, y: 0 },
    { x: 32, y: 0 },
    { x: 32, y: 6 },
  ],
  candy: [
    { x: 2, y: 0.45 },
    { x: 4, y: 0.45 },
    { x: 5.6, y: 0.45 },
    { x: 7.8, y: 0.45 },
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
    { x: 29.3, y: 0.45 },
  ],
};
