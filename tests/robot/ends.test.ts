import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { STORY, chapterNumber, courseFor, nextAfter } from '../../src/content/chapters';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';
import { decide, playThrough } from './robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** What he did, in order: the flags that are not bubbles. */
const did = (flags: string[]) => flags.filter((flag) => !flag.startsWith('beat:'));

/** On Lugnt: played by running and Använd, and how many times Hoppa was needed. */
function onLugnt(chapter: ChapterData) {
  const game = new Game(chapter, simOptions(settingsFor('lugnt')));
  let wasOffered = false;
  let wasAhead = false;
  let hops = 0;
  for (let frame = 0; frame < 60 * 200 && !game.sim.flags.has('goal'); frame++) {
    const { x, y, ahead, offered } = decide(game, chapter);
    const blocked = ahead && game.sim.curr.vx < 0.2;
    if (blocked && !wasAhead) hops++;
    game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
    wasOffered = offered;
    wasAhead = blocked;
  }
  return { goal: game.sim.flags.has('goal'), hops, bubbles: game.sim.bubbles, candy: game.sim.candyCount };
}

describe('Prolog, Lördagsmorgon, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the kitchen table to the star at ${fps} Hz`, () => {
      const result = playThrough(fps, prolog, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(did(result.flags)).toEqual(['paint', 'star', 'goal']);
      expect(result.said).toEqual(['tonight']);
      expect(result.bubbles).toBe(0);
      expect(result.missed).toEqual([]);
    });
  }

  it('on Lugnt it is played without Hoppa', () => {
    expect(onLugnt(prolog)).toEqual({ goal: true, hops: 0, bubbles: 0, candy: prolog.candy.length });
  });

  it('has no candy trail until the eyes are painted: the bag has not torn yet', () => {
    for (const c of prolog.candy) expect(c.after, `the candy at ${c.x}`).toBe('paint');
    const sim = new Sim(prolog);
    run(sim, 12, { x: 1 });
    expect(sim.candyCount).toBe(0);
  });

  it('cannot be walked past: the ghost waits for its eyes, the star for the ghost, and the step for the star', () => {
    const sim = new Sim(prolog);
    run(sim, 30, { x: 1, hopHeld: true });
    expect(sim.flags.has('goal')).toBe(false);
    expect(sim.curr.x).toBeLessThan(42.4);
    // The ghost has not moved from the table.
    expect(sim.ghost!.x).toBeCloseTo(6.6, 1);
    // And the star can't be taken before the eyes are painted.
    const early = new Sim({ ...prolog, spawn: { x: 41, y: -0.79 } });
    run(early, 0.3);
    expect(early.curr.verb).toBeNull();
  });
});

describe('Epilog, Godiskalaset, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the party to bed at ${fps} Hz`, () => {
      const result = playThrough(fps, epilog, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      const steps = did(result.flags);
      expect(steps.slice(0, 5).sort()).toEqual(['party:bertil', 'party:mamma', 'party:moa', 'party:pappa', 'party:spoket']);
      expect(steps.slice(5)).toEqual(['partied', 'knife', 'cut1', 'cut2', 'cut3', 'dots', 'teeth', 'goal']);
      // The ghost's feet, its name, Pappa's rule, and Elof's pride.
      expect(result.said).toEqual(['klonk', 'named', 'away', 'carved']);
      expect(result.bubbles).toBe(0);
      expect(result.missed).toEqual([]);
    });
  }

  it('on Lugnt it is played without Hoppa', () => {
    expect(onLugnt(epilog)).toEqual({ goal: true, hops: 0, bubbles: 0, candy: epilog.candy.length });
  });

  it('lets him hand out the candy in the order he likes, and the knife waits until the ghost has its name', () => {
    const at = (x: number, flags: string[]) => {
      const sim = new Sim({ ...epilog, spawn: { x, y: 0.01 } }, {}, { flags });
      run(sim, 0.2);
      return sim;
    };
    // Bertil first.
    const first = at(19, []);
    expect(first.curr.word).toBe('giveBertil');
    // With one still waiting, the knife is not offered.
    const four = ['party:mamma', 'party:pappa', 'party:moa', 'party:bertil'];
    expect(at(29, four).curr.verb).toBeNull();
    // With everyone given, the ghost hops, he names it, and then the knife is.
    const all = at(29, [...four, 'party:spoket']);
    expect(all.flags.has('partied')).toBe(true);
    expect(all.said).toEqual(['klonk', 'named']);
    expect(all.curr.word).toBe('takeKnife');
  });

  it('takes three strokes, and then the eyes', () => {
    const sim = new Sim({ ...epilog, spawn: { x: 32, y: 0.01 } }, {}, { flags: ['knife'] });
    const words: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      run(sim, 0.1);
      words.push(sim.curr.word);
      sim.step({ ...idle, act: true });
    }
    expect(words).toEqual(['carve', 'carve', 'carve', 'paintEyes']);
    expect(sim.flags.has('dots')).toBe(true);
    expect(sim.said).toContain('carved');
  });

  it('cannot be walked past: the stairs to bed are a wall until his teeth are brushed', () => {
    const sim = new Sim(epilog);
    run(sim, 30, { x: 1, hopHeld: true });
    expect(sim.flags.has('goal')).toBe(false);
    expect(sim.curr.x).toBeLessThan(47);
  });
});

describe('the story from its first scene to its last', () => {
  it('runs prologue, four chapters, final, epilogue', () => {
    expect(STORY.map((part) => part.id)).toEqual(['prolog', 'garden', 'granskog', 'myren', 'berget', 'norrsken', 'epilog']);
    expect(nextAfter('prolog')?.id).toBe('garden');
    expect(nextAfter('norrsken')?.id).toBe('epilog');
    expect(nextAfter('epilog')).toBeNull();
    // Kapitel 1 is still Kapitel 1.
    expect(STORY.map((part) => chapterNumber(part.id))).toEqual([0, 1, 2, 3, 4, 0, 0]);
  });

  it('?dev starts at the prologue, or where the saved game is', () => {
    const dev = new URLSearchParams('dev');
    expect(courseFor(dev).id).toBe('prolog');
    expect(courseFor(dev, 'myren').id).toBe('myren');
    expect(courseFor(new URLSearchParams('')).id).toBe('testbana');
    expect(courseFor(new URLSearchParams('course=epilog')).id).toBe('epilog');
  });

  it('gives each part without a number a name for its card, and the last one its closing words', () => {
    for (const part of STORY) if (chapterNumber(part.id) === 0) expect(sv.end.named[part.id], part.id).toBeDefined();
    expect(sv.end.closing['epilog']).toBe('Klonk kunde inte säga det med ord. Men Elof förstod.');
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    const verbs: Record<string, string> = sv.verbs;
    for (const part of [prolog, epilog]) {
      for (const beat of part.beats ?? []) {
        expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
        expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
      }
      for (const spot of part.spots ?? []) expect(verbs[spot.word ?? spot.verb], `the word for ${spot.id}`).toBeDefined();
    }
  });

  it('calls the ghost "spöket" until it is named: only the epilogue says Klonk', () => {
    const lines: Record<string, string> = sv.lines;
    for (const part of STORY) {
      if (part.id === 'epilog') continue;
      for (const beat of part.beats ?? []) expect(lines[beat.line], `${part.id}: ${beat.line}`).not.toMatch(/Klonk/);
    }
    for (const word of Object.values(sv.verbs)) expect(word).not.toMatch(/Klonk/);
  });
});
