import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { BUBBLE_TIME, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}
/** A held jump straight up, or with a push to one side, until he stands again. */
function jump(sim: Sim, x = 0): void {
  sim.step({ ...idle, x, hop: true, hopHeld: true });
  for (let i = 0; i < 400; i++) {
    sim.step({ ...idle, x, hopHeld: true });
    if (sim.curr.grounded && sim.curr.vy <= 0.01) break;
  }
  run(sim, 0.1);
}
/** Walks to an x, slowly near it, and stands. */
function walkTo(sim: Sim, x: number): void {
  for (let i = 0; i < 2000 && Math.abs(x - sim.curr.x) > 0.05; i++) sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.5 });
  run(sim, 0.2);
}

/** A level floor from 0 to 40 with a wall at each end, and ledges over it. */
const course = (more: Partial<ChapterData> = {}): ChapterData => ({
  id: 'ledges',
  ground: [{ x: 0, y: 12 }, { x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 12 }],
  spawn: { x: 4, y: 0.01 },
  goalX: 39,
  candy: [],
  ledges: [
    { x: 8, y: 0.9, width: 2, look: 'plank' },
    { x: 10.4, y: 1.8, width: 2, look: 'plank' },
    { x: 16, y: 0.9, width: 1.2, look: 'leaf' },
  ],
  ...more,
});

describe('a ledge', () => {
  it('is not in his way from below: he walks in front of it', () => {
    const sim = new Sim(course());
    run(sim, 4, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(12);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('is jumped up through, and stood on', () => {
    const sim = new Sim(course());
    walkTo(sim, 8);
    jump(sim);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('is too high for a hop: only a held jump reaches it', () => {
    const sim = new Sim(course());
    walkTo(sim, 8);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.03, { hopHeld: true });
    run(sim, 1.2);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('is ground to jump from: from one to the next, higher one', () => {
    const sim = new Sim(course());
    walkTo(sim, 8.6);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    jump(sim, 1);
    expect(sim.curr.y).toBeCloseTo(1.8, 1);
    expect(sim.curr.x).toBeGreaterThan(9.4);
  });

  it('is left by walking off its end, and he lands on the ground under it', () => {
    const sim = new Sim(course());
    walkTo(sim, 8);
    jump(sim);
    run(sim, 1.2, { x: -1 });
    expect(sim.curr.x).toBeLessThan(6.9);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('is never pulled up onto: his hands only take the ledges of solid things', () => {
    const sim = new Sim(course());
    // Running into its side at its own height changes nothing: he goes on along the ground.
    run(sim, 2.5, { x: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('is firm ground for the glitter bubble to put him back on', () => {
    const pit = course({
      ground: [{ x: 0, y: 12 }, { x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: -9 }, { x: 30, y: -9 }, { x: 30, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 12 }],
      ledges: [{ x: 10.6, y: 0.9, width: 2.6, look: 'plank' }],
    });
    const sim = new Sim(pit);
    walkTo(sim, 10.6);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    run(sim, 0.8);
    // Off its far end, over the pit: a long fall, and the bubble brings him back onto the ledge.
    run(sim, 0.9, { x: 1 });
    run(sim, BUBBLE_TIME + 1.5);
    expect(sim.bubbles).toBe(1);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    expect(sim.curr.grounded).toBe(true);
  });

  it('that waits for a flag is not there before it', () => {
    const later = course({
      ledges: [{ x: 8, y: 0.9, width: 2, look: 'plank', needs: 'laid' }],
      spots: [{ id: 'laid', at: { x: 5, y: 0 }, verb: 'call' }],
    });
    const sim = new Sim(later);
    expect(sim.ledges[0]!.there).toBe(false);
    walkTo(sim, 8);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    walkTo(sim, 5);
    sim.step({ ...idle, act: true });
    run(sim, 0.2);
    expect(sim.flags.has('laid')).toBe(true);
    expect(sim.ledges[0]!.there).toBe(true);
    walkTo(sim, 8);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    // A saved game that has the flag has the ledge from its first step.
    expect(new Sim(later, {}, { flags: ['laid'] }).ledges[0]!.there).toBe(true);
  });

  it('does not hide a hook from the lace', () => {
    const hooked = course({
      ledges: [{ x: 8, y: 1.6, width: 3, look: 'branch' }],
      hooks: [{ x: 8, y: 3.4, length: 2.4 }],
    });
    const sim = new Sim(hooked);
    walkTo(sim, 7);
    expect(sim.curr.verb).toBe('lace');
  });

  it('plays the same at every rate of drawing: the simulation steps alone', () => {
    const play = () => {
      const sim = new Sim(course());
      walkTo(sim, 8.6);
      jump(sim);
      jump(sim, 1);
      run(sim, 1, { x: 1 });
      return { x: sim.curr.x, y: sim.curr.y };
    };
    expect(play()).toEqual(play());
  });
});

describe('side candy', () => {
  const sweet = course({
    candy: [{ x: 6, y: 0.5 }],
    side: [{ x: 8, y: 1.5 }, { x: 10.4, y: 2.4 }, { x: 16, y: 1.5, after: 'laid' }],
  });

  it('goes in the same bag as the trail candy, and is kept apart from it', () => {
    const sim = new Sim(sweet);
    walkTo(sim, 8);
    expect(sim.candyCount).toBe(1);
    expect(sim.collected).toEqual([true]);
    jump(sim);
    expect(sim.collectedSide).toEqual([true, false, false]);
    expect(sim.candyCount).toBe(2);
  });

  it('is not found by following the trail along the ground', () => {
    const sim = new Sim(sweet);
    run(sim, 6, { x: 1 });
    expect(sim.collected).toEqual([true]);
    expect(sim.collectedSide).toEqual([false, false, false]);
  });

  it('can wait for a flag, as trail candy can', () => {
    const sim = new Sim(sweet);
    walkTo(sim, 16);
    jump(sim);
    expect(sim.collectedSide[2]).toBe(false);
    const after = new Sim(sweet, {}, { flags: ['laid'] });
    walkTo(after, 16);
    jump(after);
    expect(after.collectedSide[2]).toBe(true);
  });

  it('comes back from a saved game by its place in the list', () => {
    const sim = new Sim(sweet, {}, { collected: [0], side: [1, 7] });
    expect(sim.collectedSide).toEqual([false, true, false]);
    expect(sim.candyCount).toBe(2);
  });
});

describe('"Jag har fastnat" after a ride', () => {
  it('lets him take the ride again, instead of leaving him on its near side', () => {
    // Bertil's cap over the forest pool: called at 154.6, it lands at 177.4, before the next big candy.
    const cap = granskog.spots!.find((spot) => spot.ride === 'cap')!;
    const before = granskog.checkpoints!.findIndex((c) => c.x > cap.at.x) - 1;
    const sim = new Sim(granskog, {}, { checkpoint: before });
    walkTo(sim, cap.at.x);
    sim.step({ ...idle, act: true });
    for (let i = 0; i < 3000 && sim.curr.mode !== 'free'; i++) sim.step(idle);
    run(sim, 0.3);
    expect(sim.curr.x).toBeGreaterThan(170);
    expect(sim.flags.has(cap.id)).toBe(true);
    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.5);
    expect(sim.curr.x).toBeLessThan(cap.at.x);
    expect(sim.flags.has(cap.id)).toBe(false);
    walkTo(sim, cap.at.x);
    expect(sim.curr.verb).not.toBeNull();
  });
});
