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
/** Everything up to the bag: the sharing can begin. The trägubbe was pulled out (`uppdragen`), and he drags it behind him. */
const WITH_THE_BAG = { flags: ['lower', 'haul', 'scene:uppdragen', 'bag'], placed: ['tragubbe'] };

describe('Final, Norrsken, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the old pine to the way home at ${fps} Hz`, () => {
      const result = playThrough(fps, norrsken, {}, 200);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      // The story's steps, each one built on the one before.
      const did = result.flags.filter((flag) => !flag.startsWith('beat:') && !flag.startsWith('gift:') && !flag.startsWith('scene:') && !flag.startsWith('nr:'));
      // One lowering and one pull, and no eyes to paint (Olov, 13 November 2026).
      expect(did.slice(0, 4)).toEqual(['lower', 'haul', 'placed:tragubbe', 'bag']);
      expect(did.slice(4, 7).sort()).toEqual(['share:jay', 'share:spoket', 'share:tragubbe']);
      expect(did.slice(7)).toEqual(['shared', 'taste', 'home', 'goal']);
      expect(result.said).toEqual(['nrFoundYou', 'aterfunna:0', 'aterfunna:1', 'first1', 'first2', 'first3', 'first4', ...Array.from({ length: 7 }, (_, i) => `aterfunna:${i + 6}`)]);
      expect(result.flags.indexOf('scene:aterfunna')).toBeLessThan(result.flags.indexOf('home'));
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
    // With one friend still waiting, Smaka is not offered: the trägubbe he has dragged here is, at his heels.
    const early = at(26.6, ['share:jay', 'share:spoket']);
    run(early, 0.2);
    expect(early.curr.word).toBe('giveTragubbe');
    // With all three given, it is.
    const ready = at(26.6, ['share:jay', 'share:spoket', 'share:tragubbe']);
    run(ready, 0.2);
    expect(ready.flags.has('shared')).toBe(true);
    expect(ready.curr.word).toBe('taste');
  });

  it('brings the trägubbe out with one lowering and one pull (Olov, 13 November 2026)', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 10.9, y: 0.01 } });
    run(sim, 0.2);
    expect(sim.curr.word).toBe('lowerLace');
    sim.step({ ...idle, act: true });
    run(sim, 0.1);
    expect(sim.curr.verb).toBeNull();
    expect(sim.sceneFrame?.id).toBe('snoret');
    expect(sim.movers[0]!.y).toBeCloseTo(-2.6);
    run(sim, 2.6);
    // The loop has hold of it: one Dra upp, and nothing else is offered there.
    expect(sim.curr.word).toBe('pullUp');
    expect(sim.movers[0]!.y).toBeCloseTo(-2.6);
    sim.step({ ...idle, act: true });
    run(sim, 0.1);
    expect(sim.sceneFrame?.id).toBe('hissa');
    expect(sim.curr.verb).toBeNull();
    // It comes up the crack in one go, without another press, while he and the ghost heave.
    let last = sim.movers[0]!.y;
    let fell = false;
    for (let i = 0; i < 30 && !sim.flags.has('placed:tragubbe'); i++) {
      run(sim, 0.1);
      expect(sim.curr.word === 'lowerLace' || sim.curr.word === 'pullUp').toBe(false);
      if (sim.movers[0]!.y < last - 1e-6) fell = true;
      last = sim.movers[0]!.y;
    }
    expect(fell).toBe(false);
    expect(sim.flags.has('placed:tragubbe')).toBe(true);
    expect(sim.movers[0]!.y).toBeCloseTo(0, 2);
    // Then he lifts it out onto the rock, and the lace is lowered no more.
    run(sim, 4);
    expect(sim.flags.has('scene:hissa')).toBe(true);
    expect(sim.flags.has('scene:uppdragen')).toBe(true);
    expect(sim.curr.word).toBeNull();
    expect(sim.bubbles).toBe(0);
  });

  it('takes up older saves of the rescue where they left off', () => {
    // Lowered, before the pull: Dra upp is offered at the crack.
    const lowered = new Sim({ ...norrsken, spawn: { x: 10.9, y: 0.01 } }, {}, { flags: ['lower', 'nr:rope-ready', 'scene:snoret'] });
    run(lowered, 0.2);
    expect(lowered.curr.word).toBe('pullUp');
    // Pulled out the old way, at the old eyes step (with or without the crowberry) or after it: on to the bag, and the
    // crack offers nothing again.
    for (const flags of [['crowberry'], [], ['crowberry', 'eyes']]) {
      const old = ['lower', 'nr:rope-ready', 'scene:snoret', 'placed:tragubbe', 'scene:uppdragen', ...flags];
      const crack = new Sim({ ...norrsken, spawn: { x: 10.9, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: old });
      run(crack, 0.2);
      expect(crack.flags.has('haul')).toBe(true);
      expect(crack.curr.word).toBeNull();
      const bag = new Sim({ ...norrsken }, {}, { placed: ['tragubbe'], flags: old, checkpoint: 1 });
      run(bag, 0.2, { x: 1 });
      run(bag, 0.2);
      expect(bag.curr.word, `after ${flags.join(', ') || 'the pull'}`).toBe('takeBag');
      bag.step({ ...idle, act: true });
      expect(bag.flags.has('bag')).toBe(true);
    }
  });

  it('has a crack he can walk over, and a trägubbe he can step over', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 9, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: ['scene:uppdragen'] });
    // At a walk: the slowest way over.
    run(sim, 6, { x: 0.5 });
    expect(sim.curr.x).toBeGreaterThan(13);
    expect(sim.bubbles).toBe(0);
    const back = new Sim({ ...norrsken, spawn: { x: 15, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: ['scene:uppdragen'] });
    run(back, 2.5, { x: -1 });
    expect(back.curr.x).toBeLessThan(11.5);
    expect(back.bubbles).toBe(0);
  });

  it('drags the trägubbe behind him, and gives its candy where it is (Olov, 12 November 2026)', () => {
    const sim = new Sim({ ...norrsken, spawn: { x: 13, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: ['lower', 'haul', 'scene:uppdragen', 'bag'] });
    const figure = sim.movers.find((mover) => mover.def.id === 'tragubbe')!;
    run(sim, 2, { x: 1 });
    // A step behind him, not back at the crack, and nothing he bumps into.
    expect(sim.curr.x).toBeGreaterThan(17);
    expect(sim.curr.x - figure.x).toBeGreaterThan(0.84);
    expect(sim.curr.x - figure.x).toBeLessThan(1.6);
    expect(figure.y).toBe(0);
    // Standing, it comes to rest a step behind him: Ge trägubben is offered there, and the helper points there too.
    run(sim, 1);
    expect(sim.curr.x - figure.x).toBeCloseTo(0.85, 1);
    expect(sim.curr.word).toBe('giveTragubbe');
    const share = norrsken.spots!.find((spot) => spot.id === 'share:tragubbe')!;
    expect(sim.placeOf(share).x).toBeCloseTo(figure.x);
    expect(share.at.x).toBeCloseTo(13.4);
    // No eyes to paint on him, and no berry to pick for them (Olov, 13 November 2026).
    expect(norrsken.spots!.some((spot) => spot.id === 'eyes' || spot.id === 'crowberry' || spot.word === 'paintEyes')).toBe(false);
    // Turned back the other way, it is dragged that way too, without a bump as he walks past it.
    run(sim, 1.5, { x: -1 });
    expect(figure.x - sim.curr.x).toBeGreaterThan(0.84);
    expect(sim.bubbles).toBe(0);
    // A game taken up again at the checkpoint by the ghost finds it at his heels, not slid there from the crack.
    const later = new Sim({ ...norrsken }, {}, { placed: ['tragubbe'], flags: ['lower', 'haul', 'scene:uppdragen'], checkpoint: 1 });
    later.step(idle);
    const there = later.movers.find((mover) => mover.def.id === 'tragubbe')!;
    expect(Math.abs(later.curr.x - there.x)).toBeLessThan(1);
    // Tasted, the lace is let go: the simulation drags it no more, and the reunion's picture sets it at his feet.
    const tasted = new Sim({ ...norrsken, spawn: { x: 26.6, y: 0.01 } }, {}, { placed: ['tragubbe'], flags: ['lower', 'haul', 'scene:uppdragen', 'taste'] });
    run(tasted, 0.5, { x: 1 });
    expect(tasted.movers.find((mover) => mover.def.id === 'tragubbe')!.x).toBeCloseTo(12.4);
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
    expect(sv.end.kickers['norrsken']).toBeDefined();
  });
});
