import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { byn } from '../../src/content/chapters/byn';
import { berget } from '../../src/content/chapters/berget';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { myren } from '../../src/content/chapters/myren';
import type { ChapterData } from '../../src/sim/types';
import { decide } from './robot';

/**
 * "Fun per inch" (docs/level-design.md, principle 5): how long the main trail asks for nothing but running.
 * Ori's director allows almost never five seconds of plain running; the robot can measure it. A stretch is
 * plain while he is on his feet on the ground, running right, with nothing pressed, nothing to wait for and
 * no big candy reached. It ends at a jump, a press of Använd, a climb, a swing, a ride, a wait or a big candy.
 * The robot runs at 3.5 EL a second, so its five seconds are 17 EL of trail; a child takes longer over them.
 *
 * The numbers below are the chapters as they stand, rounded up: a ceiling, so that a change can make a
 * chapter denser and never emptier. Lower them when the main trail's arcs are laid (level design, §3).
 */
const CEILING: Record<string, { longest: number; over: number }> = {
  garden: { longest: 5, over: 0 },
  granskog: { longest: 5, over: 0 },
  // The boardwalk and its ramp, from x 105 to 138: the longest plain run in the story.
  myren: { longest: 10, over: 10 },
  berget: { longest: 4, over: 0 },
  // The shop's floor between its two big candies.
  byn: { longest: 7, over: 7 },
};
/** The length of plain running that counts as too long, in seconds. */
const TOO_LONG = 5;

function pace(chapter: ChapterData) {
  const game = new Game(chapter, {});
  const dt = 1 / 60;
  let wasAhead = false;
  let wasOffered = false;
  let run = 0;
  let from = chapter.spawn.x;
  let longest = { seconds: 0, from: 0, to: 0 };
  let over = 0;
  const close = (to: number) => {
    if (run > longest.seconds) longest = { seconds: run, from, to };
    if (run > TOO_LONG) over += run;
    run = 0;
    from = to;
  };
  for (let frames = 0; !game.sim.flags.has('goal') && frames < 60 * 150; frames++) {
    const d = decide(game, chapter);
    const hop = d.ahead && !wasAhead;
    const act = d.offered && !wasOffered;
    const big = game.sim.checkpoint;
    game.frame(dt, { x: d.x, y: d.y, hopHeld: true }, { hop, act, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
    const p = game.sim.curr;
    const plain = !hop && !act && d.x === 1 && p.mode === 'free' && p.grounded && game.sim.checkpoint === big;
    if (plain) run += dt;
    else close(p.x);
  }
  close(game.sim.curr.x);
  return { goal: game.sim.flags.has('goal'), longest, over };
}

describe('how long the trail asks for nothing but running', () => {
  for (const chapter of [garden, granskog, myren, berget, byn]) {
    it(`${chapter.id}: no emptier than it was`, () => {
      const measured = pace(chapter);
      expect(measured.goal).toBe(true);
      const ceiling = CEILING[chapter.id]!;
      const where = `${measured.longest.seconds.toFixed(1)} s from x ${measured.longest.from.toFixed(0)} to ${measured.longest.to.toFixed(0)}, ${measured.over.toFixed(1)} s in stretches over ${TOO_LONG} s`;
      console.log(`pace ${chapter.id}: ${where}`);
      expect(measured.longest.seconds, where).toBeLessThanOrEqual(ceiling.longest);
      expect(measured.over, where).toBeLessThanOrEqual(ceiling.over);
    });
  }
});
