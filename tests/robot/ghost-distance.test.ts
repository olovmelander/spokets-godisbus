import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { myren } from '../../src/content/chapters/myren';
import { berget } from '../../src/content/chapters/berget';
import { byn } from '../../src/content/chapters/byn';
import { settingsFor, simOptions } from '../../src/save/settings';
import { GHOST_CLEARANCE } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { decide } from './robot';

describe('the whole chase keeps the ghost out of reach', () => {
  for (const chapter of [garden, granskog, myren, berget, byn]) {
    for (const gentle of [false, true]) {
      it(`${chapter.id}, ${gentle ? 'Lugnt' : 'Äventyr'}: distance survives every puzzle, swing and ride`, () => {
        const game = new Game(chapter, gentle ? simOptions(settingsFor('lugnt')) : {});
        let nearest = Infinity, grabs = 0, samples = 0;
        // Measure every simulation step, including both steps inside an ordinary drawn frame.
        const step = game.sim.step.bind(game.sim);
        game.sim.step = (input) => {
          step(input);
          const ghost = game.sim.ghost;
          if (ghost && !ghost.gone) {
            nearest = Math.min(nearest, Math.hypot(ghost.x - game.sim.curr.x, ghost.y - game.sim.curr.y));
            samples++;
          }
          if (game.sim.curr.verb === 'grab') grabs++;
        };
        let wasAhead = false, wasOffered = false;
        for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
          const { x, y, ahead, offered } = decide(game, chapter);
          game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
          wasAhead = ahead; wasOffered = offered;
        }
        expect(game.sim.flags.has('goal'), `stopped at ${game.sim.curr.x}`).toBe(true);
        expect(samples).toBeGreaterThan(100);
        expect(nearest).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
        expect(grabs).toBe(0);
      });
    }

    it(`${chapter.id}: every checkpoint starts with the ghost safely separated`, () => {
      for (const [checkpoint] of (chapter.checkpoints ?? []).entries()) {
        const sim = new Sim(chapter, {}, { checkpoint });
        if (!sim.ghost || sim.ghost.gone) continue;
        expect(Math.hypot(sim.ghost.x - sim.curr.x, sim.ghost.y - sim.curr.y), `checkpoint ${checkpoint}`)
          .toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
      }
    });
  }
});
