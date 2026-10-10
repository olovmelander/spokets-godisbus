import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { STORY, chapterNumber, courseFor, nextAfter } from '../../src/content/chapters';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { STEP } from '../../src/sim/constants';
import { guidedCarve, guidedEye } from '../../src/sim/story-stroke';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';
import { decide, playThrough } from './robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** What he did, in order: the flags that are not bubbles. */
const did = (flags: string[]) => flags.filter((flag) => !flag.startsWith('beat:') && !flag.startsWith('party-gift:'));

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

describe('Prolog, Lördagsmorgon', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the kitchen table to the title at ${fps} Hz`, () => {
      const result = playThrough(fps, prolog, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      // The morning, two eyes, the waking he watches, the chase, the star, the family, Pappa's hand and the title.
      expect(did(result.flags).filter((flag) => !flag.startsWith('scene:'))).toEqual([
        'eye', 'paint', 'woke', 'grab', 'blink', 'mamma:noticed', 'mamma:passed', 'bag:torn', 'star', 'hand',
        'pappa:noticed', 'snuck', 'pappa:done', 'leap', 'titel', 'goal']);
      // The title is still on the screen when the chapter reaches its goal: its scene ends behind the card.
      expect(did(result.flags).filter((flag) => flag.startsWith('scene:'))).toEqual(
        ['scene:morgon', 'scene:vaknar', 'scene:stjarnan', 'scene:poff', 'scene:familj', 'scene:handen', 'scene:lofte']);
      expect(result.said).toEqual(['morgon:0', 'morgon:1', 'vaknar:0', 'vaknar:1', 'vaknar:2', 'vaknar:3', 'dropped', 'stjarnan:0', 'stjarnan:1', 'poff:0', 'poff:1', 'familj:0', 'familj:1', 'familj:2', 'familj:3',
        'handen:0', 'handen:1', 'handen:2', 'handen:3', 'onlyWood', 'snuck', 'nearYou', 'mapForYou', 'heja', 'followTrail', 'titel:0']);
      expect(result.bubbles).toBe(0);
      expect(result.missed).toEqual([]);
    });
  }

  it('on Lugnt it is played without Hoppa', () => {
    expect(onLugnt(prolog)).toEqual({ goal: true, hops: 0, bubbles: 0, candy: prolog.candy.length });
  });

  it('has no candy trail until the ghost has run off with the bag: it has not torn yet', () => {
    for (const c of prolog.candy) expect(c.after, `the candy at ${c.x}`).toBe('bag:torn');
    const sim = new Sim(prolog);
    run(sim, 12, { x: 1 });
    expect(sim.candyCount).toBe(0);
  });

  it('exploring the deck before painting never announces a star that has not spilled', () => {
    const sim = new Sim(prolog);
    run(sim, 25, { x: 1, hopHeld: true });
    expect(sim.curr.x).toBeGreaterThan(38.5);
    expect(sim.flags.has('blink')).toBe(false);
    expect(sim.said).not.toContain('stjarnan:0');
    expect(sim.said).not.toContain('tinyElof');
  });

  it('cannot be walked past: the ghost waits for its eyes, the star for the ghost, and the title for the family', () => {
    const sim = new Sim(prolog);
    run(sim, 40, { x: 1, hopHeld: true });
    expect(sim.flags.has('goal')).toBe(false);
    // The ghost has not moved from the table.
    expect(sim.ghost!.x).toBeCloseTo(4.6, 1);
    // And the star can't be taken before the ghost has run.
    const early = new Sim({ ...prolog, spawn: { x: 41, y: -0.79 } });
    run(early, 0.3);
    expect(early.curr.verb).toBeNull();
  });

  it('opens on the morning: he watches Pappa carve, and is let go to paint the eyes', () => {
    const sim = new Sim(prolog);
    run(sim, 5, { x: 1, hopHeld: true, act: true });
    expect(sim.sceneFrame?.id).toBe('morgon');
    expect(sim.curr.x).toBeCloseTo(prolog.spawn.x, 1);
    run(sim, 6);
    expect(sim.flags.has('scene:morgon')).toBe(true);
    expect(sim.sceneFrame).toBeNull();
    run(sim, 0.4, { x: 1 });
    expect(sim.curr.word).toBe('paintGhost');
  });

  it('lets him discover the star, choose to taste it, and then choose Pappa\'s hand', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 39, y: -0.79 } }, {}, { flags: ['eye', 'paint', 'blink', 'mamma:passed', 'bag:torn'] });
    run(sim, 1, { x: 1 });
    expect(sim.sceneFrame?.id).toBe('stjarnan');
    expect(sim.flags.has('star')).toBe(false);
    const x = sim.curr.x;
    run(sim, 2.5, { x: 1, act: true });
    expect(sim.flags.has('star')).toBe(false);
    run(sim, 2);
    expect(sim.flags.has('scene:stjarnan')).toBe(true);
    expect(sim.flags.has('star')).toBe(false);
    expect(sim.curr.x).toBeLessThan(x + 2);
    for (let i = 0; i < 240 && sim.curr.word !== 'tasteStar'; i++) sim.step({ ...idle, x: 1 });
    expect(sim.curr.word).toBe('tasteStar');
    // Waiting beside it or brushing past it is not eating. The action is a fresh, deliberate press.
    run(sim, 5);
    expect(sim.flags.has('star')).toBe(false);
    sim.step({ ...idle, act: true });
    run(sim, 0.2);
    expect(sim.flags.has('star')).toBe(true);
    expect(sim.sceneFrame?.id).toBe('poff');
    run(sim, 20);
    expect(sim.flags.has('scene:familj')).toBe(true);
    // Nothing goes on until he steps onto the hand himself.
    run(sim, 5);
    expect(sim.flags.has('hand')).toBe(false);
    expect(sim.curr.word).toBe('climbOn');
    sim.step({ ...idle, act: true });
    run(sim, 0.2);
    expect(sim.sceneFrame?.id).toBe('handen');
  });
});

describe('the blink: a beat of the story that takes time', () => {
  /** Elof at the ghost, having painted one eye. */
  const atTheGhost = () => {
    const sim = new Sim({ ...prolog, spawn: { x: 3.4, y: 0.01 } }, {}, { flags: ['scene:morgon'] });
    run(sim, 0.2);
    sim.step({ ...idle, act: true });
    sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] });
    run(sim, 0.1);
    return sim;
  };

  it('takes two completed strokes to paint the eyes, the second in the same panel', () => {
    const sim = atTheGhost();
    expect(sim.flags.has('eye')).toBe(true);
    expect(sim.flags.has('paint')).toBe(false);
    expect(sim.story).toEqual({ kind: 'paint', spot: 'paint' });
    sim.finishStory({ kind: 'paint', traces: [guidedEye(204)] });
    expect(sim.flags.has('paint')).toBe(true);
  });

  it('leaves the second eye for later when he steps back from the first', () => {
    const sim = atTheGhost();
    sim.cancelStory();
    run(sim, 0.1);
    expect(sim.curr.word).toBe('paintGhost');
    sim.step({ ...idle, act: true });
    expect(sim.story).toEqual({ kind: 'paint', spot: 'paint' });
  });

  it('holds him while the ghost wakes and looks at the shelf and the bag, and then lets it run', () => {
    const sim = atTheGhost();
    sim.step({ ...idle, act: true });
    sim.finishStory({ kind: 'paint', traces: [guidedEye(204)] });
    const x = sim.curr.x;
    // He watches: the stick does nothing, and the ghost is still on the table.
    run(sim, 10.5, { x: 1, hop: true, hopHeld: true });
    expect(sim.flags.has('blink')).toBe(false);
    expect(sim.curr.x).toBeCloseTo(x, 1);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.ghost!.x).toBeCloseTo(4.6, 1);
    // It takes the bag, and the bag's magic begins: the chase starts at the scene's end.
    run(sim, 3.5);
    expect(sim.flags.has('grab')).toBe(true);
    expect(sim.ghost!.x).toBeCloseTo(6.5, 1);
    run(sim, 4.2);
    expect(sim.flags.has('blink')).toBe(true);
    run(sim, 6, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(x + 2);
    expect(sim.ghost!.x).toBeGreaterThan(8);
    expect(sim.candyCount).toBeGreaterThan(0);
  });

  it('is short: a beat that holds him is never longer than three seconds', () => {
    for (const part of STORY) for (const beat of part.later ?? []) if (beat.hold) expect(beat.seconds, `${part.id}: ${beat.flag}`).toBeLessThanOrEqual(3);
  });

  it('begins again from its start in a game saved in the middle of it', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 3.4, y: 0.01 } }, {}, { flags: ['scene:morgon', 'eye', 'paint', 'woke'] });
    run(sim, 0.1);
    expect(sim.sceneFrame).toEqual({ id: 'vaknar', seconds: expect.any(Number) });
    expect(sim.sceneFrame!.seconds).toBeLessThan(0.2);
    run(sim, 18);
    expect(sim.flags.has('blink')).toBe(true);
  });

  it('shows what the ghost looks at: the empty place on the shelf, and then the bag', () => {
    const shelf = prolog.shelf!;
    const bag = prolog.decor!.find((d) => d.look === 'bag')!;
    const looks = prolog.scenes!.find((scene) => scene.id === 'vaknar')!.stage!.actors!.ghost!.filter((key) => key.act === 'look');
    expect(looks).toHaveLength(3);
    expect(looks[1]!.aim!.x).toBeCloseTo(shelf.x - 3.6);
    expect(looks[2]!.aim!.x).toBeCloseTo(bag.at.x);
    expect(bag.until).toBe('grab');
  });
});

describe('Epilog, Godiskalaset, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the party to bed at ${fps} Hz`, () => {
      const result = playThrough(fps, epilog, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      // The story's steps; the time card it opens on is no step of it.
      const steps = did(result.flags).filter((flag) => flag !== 'scene:card');
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
    run(sim, 0.1);
    words.push(sim.curr.word);
    sim.step({ ...idle, act: true });
    // Then each step follows the last in the same panel (docs/ux-audit/story-presentation.md row 18).
    for (let i = 0; i < 4; i++) {
      words.push(sim.story?.spot ?? null);
      if (i < 3) sim.finishStory({ kind: 'carve', stroke: guidedCarve() });
      else sim.finishStory({ kind: 'paint', traces: [guidedEye(116), guidedEye(204)] });
    }
    run(sim, .1);
    expect(words).toEqual(['carve', 'cut1', 'cut2', 'cut3', 'dots']);
    expect(sim.story).toBeNull();
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
    expect(courseFor(new URLSearchParams('dev&course=epilog')).id).toBe('epilog');
  });

  it('gives each part without a number a name for its card, and the last one its closing words', () => {
    for (const part of STORY) if (chapterNumber(part.id) === 0) expect(sv.end.kickers[part.id], part.id).toBeDefined();
    // The page is headed by the chapter's name, never by "klart".
    for (const part of STORY) expect(sv.end.headings[part.id] ?? sv.explore.chapters[part.id], part.id).toBeDefined();
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
