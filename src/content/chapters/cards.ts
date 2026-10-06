import type { SceneDef } from '../../sim/scene';

/**
 * A chapter's time card (docs/narrative-audit/threads.md §5.4): where it is and what time it is, over a picture
 * that comes up from black, for the chapter's first seconds. It is not held: he can set off at once. A game taken
 * up at a big candy further on has had it (src/sim/scene.ts). `word` is its text in `sv.scene`.
 */
export function timeCard(word: string, spawnX: number): SceneDef {
  return {
    id: 'card',
    at: spawnX - 0.4,
    seconds: 3.4,
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.05, to: 0, move: 1.2 }],
      words: [{ at: 0.4, seconds: 2.9, kind: 'caption', text: word }],
    },
  };
}
