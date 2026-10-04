import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { chapterNumber, nextAfter } from '../../src/content/chapters';
import { norrsken } from '../../src/content/chapters/norrsken';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';
import { decide, heightAt, playThrough } from './robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** Where the walk home begins: beyond it he is carried. */
const HOME = norrsken.rides![0]!.from.x;
/** Everything up to the bag: the sharing can begin. */
const WITH_THE_BAG = { flags: ['lower', 'crowberry', 'eyes', 'bag'], placed: ['tragubbe'] };

describe('Final, Norrsken, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the old pine to the way home at ${fps} Hz`, () => {
      const result = playThrough(fps, norrsken, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      // The story's steps, each one built on the one before.
      const did = result.flags.filter((flag) => !flag.startsWith('beat:') && !flag.startsWith('gift:'));
      expect(did.slice(0, 5)).toEqual(['lower', 'placed:tragubbe', 'crowberry', 'eyes', 'bag']);
      expect(did.slice(5, 8).sort()).toEqual(['share:jay', 'share:spoket', 'share:tragubbe']);
      expect(did.slice(8)).toEqual(['shared', 'taste', 'home', 'goal']);
      // Pappa's line, in its four bubbles.
      expect(result.said).toEqual(['first1', 'first2', 'first3', 'first4']);
      expect(result.bubbles).toBe(0);
      expect(result.missed).toEqual([]);
      expect(result.checkpoint).toBe(norrsken.checkpoints!.length - 1);
    });
  }

  it('on Lugnt it is played the same way, without Hoppa', () => {
    const game = new Game(norrsken, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 200 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, norrsken);
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(hops).toBe(0);
    expect(game.sim.bubbles).toBe(0);
  });

  it('cannot be walked past: without the story the way home never begins', () => {
    // Walking, he stops at the mountainside.
    const walker = new Sim(norrsken);
    run(walker, 90, { x: 0.5 });
    expect(walker.flags.has('goal')).toBe(false);
    expect(walker.curr.atEdge).toBe(true);
    expect(walker.curr.x).toBeLessThan(35);
    expect(walker.bubbles).toBe(0);
    // A runner goes over the edge, and the glitter bubble brings him back, every time.
    const runner = new Sim(norrsken);
    run(runner, 40, { x: 1 });
    expect(runner.flags.has('goal')).toBe(false);
    expect(runner.bubbles).toBeGreaterThan(1);
    expect(runner.curr.x).toBeLessThan(40);
  });

  it('lets him share in the order he likes: the golden candy waits until everyone has theirs', () => {
    const at = (x: number, flags: string[] = []) =>
      new Sim({ ...norrsken, spawn: { x, y: 0.01 } }, {}, { ...WITH_THE_BAG, flags: [...WITH_THE_BAG.flags, ...flags] });
    // The jay first.
    const jay = at(23);
    run(jay, 0.2);
    expect(jay.curr.verb).toBe('give');
    expect(jay.curr.word).toBe('giveJay');
    jay.step({ ...idle, act: true });
    expect(jay.flags.has('share:jay')).toBe(false);
    expect(jay.finishStory({ kind: 'share', friend: 'jay', sweet: 'lingon' })).toBe(true);
    expect(jay.flags.has('share:jay')).toBe(true);
    expect(jay.flags.has('shared')).toBe(false);
    // With one friend still waiting, Smaka is not offered.
    const early = at(26.6, ['share:jay', 'share:spoket']);
    run(early, 0.2);
    expect(early.curr.verb).toBeNull();
    // With all three given, it is.
    const ready = at(26.6, ['share:jay', 'share:spoket', 'share:tragubbe']);
    run(ready, 0.2);
    expect(ready.flags.has('shared')).toBe(true);
    expect(ready.curr.word).toBe('taste');
  });

  it('takes two pulls to bring the trägubbe out, and the lace must be lowered first', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 10.9, y: 0.01 } });
    run(sim, 0.2);
    expect(sim.curr.word).toBe('lowerLace');
    sim.step({ ...idle, act: true });
    run(sim, 0.1);
    expect(sim.curr.verb).toBe('pull');
    sim.step({ ...idle, act: true });
    run(sim, 1);
    expect(sim.flags.has('placed:tragubbe')).toBe(false);
    expect(sim.curr.verb).toBe('pull');
    sim.step({ ...idle, act: true });
    run(sim, 1);
    expect(sim.flags.has('placed:tragubbe')).toBe(true);
    expect(sim.movers[0]!.y).toBeCloseTo(0, 2);
  });

  it('has a crack he can walk over, and a trägubbe he can step over', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 9, y: 0.01 } }, {}, { placed: ['tragubbe'] });
    // At a walk: the slowest way over.
    run(sim, 6, { x: 0.5 });
    expect(sim.curr.x).toBeGreaterThan(13);
    expect(sim.bubbles).toBe(0);
    const back = new Sim({ ...norrsken, spawn: { x: 15, y: 0.01 } }, {}, { placed: ['tragubbe'] });
    run(back, 2.5, { x: -1 });
    expect(back.curr.x).toBeLessThan(11.5);
    expect(back.bubbles).toBe(0);
  });

  it('has a candy trail that is never lost on the summit', () => {
    const candy = norrsken.candy;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      // On the way home he is carried, and the picture is wide.
      const x = candy[i]!.x;
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(x > HOME ? 7 : 3.2);
      expect(x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
      if (x < HOME) expect(candy[i]!.y).toBeGreaterThan(heightAt(norrsken, x) + 0.15);
    }
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of norrsken.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    // Pappa's line is the plan's, word for word, over four bubbles.
    expect(['first1', 'first2', 'first3', 'first4'].map((id) => lines[id]).join(' ')).toBe(
      'Min allra första trägubbe … Den täljde jag till dig när du var liten, Elof. Vi tappade den här uppe.',
    );
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of norrsken.spots ?? []) expect(verbs[spot.word ?? spot.verb], `the word for ${spot.id}`).toBeDefined();
  });

  it('follows Kapitel 4, and has a name and no number', () => {
    expect(nextAfter('berget')?.id).toBe('norrsken');
    expect(chapterNumber('berget')).toBe(4);
    expect(chapterNumber('norrsken')).toBe(0);
    expect(sv.end.named['norrsken']).toBeDefined();
  });
});
