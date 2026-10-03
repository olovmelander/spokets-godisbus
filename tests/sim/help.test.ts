import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { STORY } from '../../src/content/chapters';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { readSettings, settingsFor, simOptions } from '../../src/save/settings';
import { GUIDE_AFTER, HELP_TIME, REMIND_AFTER, STEP } from '../../src/sim/constants';
import { HINT_REACH, hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, SimOptions, SimStart, StepInput } from '../../src/sim/types';
import { decide } from '../robot/robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}
const ask = (sim: Sim) => sim.step({ ...idle, help: true });
const at = (chapter: ChapterData, x: number, y: number, start: SimStart = {}, options: SimOptions = {}) => {
  const sim = new Sim({ ...chapter, spawn: { x, y } }, options, start);
  run(sim, 0.2);
  return sim;
};

describe('what the helper shows', () => {
  it('is the thing to use where he stands: the ladybird, and its word', () => {
    const sim = at(garden, 39.4, 6.01);
    expect(hintFor(sim, garden)).toEqual({ at: { x: 41, y: 6 }, verb: 'turn', word: null });
  });

  it('is the next candy of the trail where nothing to use is near', () => {
    const sim = at(garden, 2, 6.01);
    const hint = hintFor(sim, garden)!;
    expect(hint.verb).toBeNull();
    expect(hint.at.x).toBeGreaterThan(2);
    expect(hint.at.x).toBeLessThan(2 + HINT_REACH);
  });

  it('is never something that can\'t be done yet: the jay waits for its berry', () => {
    const before = at(granskog, 36, 0.01);
    expect(hintFor(before, granskog)).toMatchObject({ at: { x: 33, y: 0 }, word: 'pick' });
    const after = at(granskog, 36, 0.01, { flags: ['berry'] });
    expect(hintFor(after, granskog)).toMatchObject({ at: { x: 38, y: 0 }, verb: 'give' });
  });

  it('is a thing on a rail by its red ring, and a hook until he has swung past it', () => {
    const twig = at(granskog, 52, 4.01, { flags: ['berry', 'jay'] });
    expect(hintFor(twig, granskog)).toMatchObject({ verb: 'pull' });
    const hook = at(garden, 51, 0.01, { flags: ['ladybird'] });
    expect(hintFor(hook, garden)).toMatchObject({ at: { x: 54, y: 3.4 }, verb: 'lace' });
    const past = at(garden, 58.5, 0.01, { flags: ['ladybird'] });
    expect(hintFor(past, garden)).toMatchObject({ at: { x: 63.5, y: 3.3 }, verb: 'lace' });
  });

  it('agrees with the button all through the story: where Använd offers something, the helper shows that', () => {
    for (const chapter of STORY) {
      const game = new Game(chapter);
      let wasAhead = false;
      let wasOffered = false;
      let checked = 0;
      for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
        const p = game.sim.curr;
        // The ghost's near-catch is a gift, not a thing the story needs: the helper doesn't point at it.
        if (p.verb !== null && p.verb !== 'slide' && p.verb !== 'grab' && p.mode === 'free') {
          const hint = hintFor(game.sim, chapter);
          expect(hint, `${chapter.id} at x ${p.x.toFixed(1)}: ${p.verb}`).not.toBeNull();
          expect({ verb: hint!.verb, word: hint!.word }, `${chapter.id} at x ${p.x.toFixed(1)}`).toEqual({ verb: p.verb, word: p.word });
          checked++;
        }
        const { x, y, ahead, offered } = decide(game, chapter);
        game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
      expect(game.sim.flags.has('goal'), chapter.id).toBe(true);
      if ((chapter.spots ?? []).some((s) => !s.touch)) expect(checked, chapter.id).toBeGreaterThan(0);
    }
  });

  it('always has something to show until the chapter is over', () => {
    for (const chapter of STORY) {
      const game = new Game(chapter);
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
        if (frame % 120 === 0 && game.sim.curr.mode === 'free' && game.sim.curr.x < chapter.goalX - 3) {
          expect(hintFor(game.sim, chapter), `${chapter.id} at x ${game.sim.curr.x.toFixed(1)}`).not.toBeNull();
        }
        const { x, y, ahead, offered } = decide(game, chapter);
        game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
    }
  });
});

describe('the helper', () => {
  it('is away until he asks, and goes one step further each time he asks', () => {
    const sim = at(garden, 39.4, 6.01);
    expect(sim.help.step).toBe(0);
    ask(sim);
    expect(sim.help).toEqual({ step: 1, at: { x: 41, y: 6 }, verb: 'turn', word: null });
    ask(sim);
    expect(sim.help.step).toBe(2);
    ask(sim);
    expect(sim.help.step).toBe(3);
    ask(sim);
    expect(sim.help.step).toBe(3);
  });

  it('leaves when he has done the thing, and starts again at the next', () => {
    const sim = at(garden, 40.2, 6.01);
    ask(sim);
    ask(sim);
    sim.step({ ...idle, act: true });
    run(sim, 0.1);
    expect(sim.flags.has('ladybird')).toBe(true);
    expect(sim.help.step).toBe(0);
    ask(sim);
    expect(sim.help.step).toBe(1);
  });

  it('leaves by itself after a while', () => {
    const sim = at(garden, 39.4, 6.01);
    ask(sim);
    run(sim, HELP_TIME - 1);
    expect(sim.help.step).toBe(1);
    run(sim, 1.5);
    expect(sim.help.step).toBe(0);
  });

  it('on Bara när jag frågar never comes by itself', () => {
    const sim = at(garden, 39.4, 6.01, {}, { help: 'ask' });
    run(sim, REMIND_AFTER + 20);
    expect(sim.help.step).toBe(0);
  });

  it('on Påminn mig comes once, to look, when nothing has happened for a long time', () => {
    const sim = at(garden, 39.4, 6.01, {}, { help: 'remind' });
    run(sim, REMIND_AFTER - 2);
    expect(sim.help.step).toBe(0);
    run(sim, 3);
    expect(sim.help.step).toBe(1);
    // Once: when it has left, it stays away until something happens.
    run(sim, HELP_TIME + REMIND_AFTER + 5);
    expect(sim.help.step).toBe(0);
  });

  it('on Guida mig comes sooner, and knocks', () => {
    const sim = at(garden, 39.4, 6.01, {}, { help: 'guide' });
    run(sim, GUIDE_AFTER + 1);
    expect(sim.help.step).toBe(2);
  });

  it('does not come by itself to someone who is getting on', () => {
    const game = new Game(garden, { help: 'remind' });
    let wasAhead = false;
    let wasOffered = false;
    let came = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, garden);
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      if (game.sim.help.step > 0) came++;
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(came).toBe(0);
  });
});

describe('the help level in the settings', () => {
  it('is Bara när jag frågar on Äventyr and Påminn mig on Lugnt, and reaches the simulation', () => {
    expect(settingsFor('aventyr').help).toBe('ask');
    expect(settingsFor('lugnt').help).toBe('remind');
    expect(simOptions(settingsFor('lugnt')).help).toBe('remind');
  });

  it('is read from a save, and anything else becomes the style\'s own', () => {
    expect(readSettings({ style: 'aventyr', help: 'guide' }).help).toBe('guide');
    expect(readSettings({ style: 'lugnt', help: 'loud' }).help).toBe('remind');
    expect(readSettings({ style: 'aventyr' }).help).toBe('ask');
  });
});
