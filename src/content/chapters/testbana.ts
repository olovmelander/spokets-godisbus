import type { ChapterData } from '../../sim/types';

/**
 * Stage 0a's test course. It is not part of the story. Units: EL.
 * From the left: flat ground, a low step (a hop), a high block (a held jump), a ditch (a running jump,
 * or a held jump to get out of it), and the big candy at the end.
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
    { x: 32, y: 0 },
    { x: 32, y: 6 },
  ],
};
