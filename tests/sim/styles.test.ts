import { describe, expect, it } from 'vitest';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** A step up, a chasm, and two big candies: one before each. */
const course: ChapterData = {
  id: 'course',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [
    { x: -6, y: 10 }, { x: -6, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 0.9 }, { x: 12, y: 0.9 }, { x: 12, y: -8 }, { x: 14, y: -8 },
    { x: 14, y: 0.9 }, { x: 30, y: 0.9 }, { x: 30, y: 10 },
  ],
  candy: [{ x: 1, y: 0.45 }, { x: 2.5, y: 0.45 }, { x: 8, y: 1.35 }, { x: 16, y: 1.35 }],
  checkpoints: [{ x: 4, y: 0 }, { x: 10, y: 0.9 }],
  jumps: [
    { at: { x: 5.8, y: 0 }, dir: 1, land: { x: 6.7, y: 0.9 } },
    { at: { x: 11.8, y: 0.9 }, dir: 1, land: { x: 14.6, y: 0.9 } },
  ],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

function until(sim: Sim, seconds: number, input: Partial<StepInput>, test: () => boolean): boolean {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (test()) return true;
    sim.step({ ...idle, ...input });
  }
  return test();
}

describe('big candy', () => {
  it('becomes the place he comes back to when he reaches it, and never an earlier one again', () => {
    const sim = new Sim(course);
    expect(sim.checkpoint).toBe(-1);
    until(sim, 5, { x: 1 }, () => sim.curr.x > 4.5);
    expect(sim.checkpoint).toBe(0);
    // Back past the start and to the first candy again: it stays the first.
    run(sim, 3, { x: -1 });
    until(sim, 5, { x: 1 }, () => sim.curr.x > 4.5);
    expect(sim.checkpoint).toBe(0);
  });

  it('"Jag har fastnat" carries him back to it, with everything he has', () => {
    const sim = new Sim(course);
    until(sim, 5, { x: 1 }, () => sim.curr.x > 5);
    run(sim, 2, { x: -1 });
    expect(sim.candyCount).toBe(2);
    sim.toCheckpoint();
    expect(sim.curr.mode).toBe('bubble');
    expect(until(sim, 3, {}, () => sim.curr.mode === 'free' && sim.curr.grounded)).toBe(true);
    expect(sim.curr.x).toBeCloseTo(4, 1);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.candyCount).toBe(2);
    expect(sim.bubbles).toBe(0);
  });

  it('"Jag har fastnat" before the first one carries him to the start', () => {
    const sim = new Sim(course);
    run(sim, 0.6, { x: 1 });
    sim.toCheckpoint();
    until(sim, 3, {}, () => sim.curr.mode === 'free' && sim.curr.grounded);
    expect(sim.curr.x).toBeCloseTo(0, 1);
  });

  it('is where a saved game starts, with its candy already in the bag', () => {
    const sim = new Sim(course, {}, { checkpoint: 1, collected: [0, 1, 2] });
    run(sim, 0.3);
    expect(sim.curr.x).toBeCloseTo(10, 1);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
    expect(sim.checkpoint).toBe(1);
    expect(sim.candyCount).toBe(3);
    expect(sim.collected).toEqual([true, true, true, false]);
  });

  it('starts at the beginning when the save names a candy the chapter does not have', () => {
    const sim = new Sim(course, {}, { checkpoint: 7, collected: [0, 99] });
    run(sim, 0.3);
    expect(sim.curr.x).toBeCloseTo(0, 1);
    expect(sim.checkpoint).toBe(-1);
    expect(sim.candyCount).toBe(1);
  });
});

describe('Lätta hopp', () => {
  it('makes the marked jumps by itself: he only runs', () => {
    const sim = new Sim(course, { easyJumps: true });
    let flights = 0;
    let was = 'free';
    for (let i = 0; i < Math.round(8 / STEP) && sim.curr.x < 18; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.curr.mode === 'fly' && was !== 'fly') flights++;
      was = sim.curr.mode;
    }
    expect(sim.curr.x).toBeGreaterThanOrEqual(18);
    expect(flights).toBe(2);
    expect(sim.bubbles).toBe(0);
  });

  it('steers a jump he makes himself, a little early, to the same landing', () => {
    const sim = new Sim(course, { easyJumps: true }, { checkpoint: 1 });
    until(sim, 3, { x: 1 }, () => sim.curr.x > 10.9);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    expect(sim.curr.mode).toBe('fly');
    until(sim, 3, {}, () => sim.curr.mode === 'free' && sim.curr.grounded);
    expect(sim.curr.x).toBeCloseTo(14.6, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('does nothing when he walks the other way', () => {
    const sim = new Sim(course, { easyJumps: true }, { checkpoint: 1 });
    run(sim, 1, { x: -1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeLessThan(8);
  });

  it('is off on Äventyr: at a run he goes over the edge', () => {
    const sim = new Sim(course, {}, { checkpoint: 1 });
    expect(until(sim, 5, { x: 1 }, () => sim.bubbles === 1)).toBe(true);
  });
});

describe('Lugnt', () => {
  it('stops him at a long drop even at a run', () => {
    const sim = new Sim(course, { stopAtEdges: true }, { checkpoint: 1 });
    run(sim, 4, { x: 1 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.atEdge).toBe(true);
    expect(sim.curr.x).toBeLessThan(12);
    expect(sim.curr.x).toBeGreaterThan(11.4);
    expect(sim.curr.y).toBeCloseTo(0.9, 1);
  });

  it('can be switched on while the game is played', () => {
    const sim = new Sim(course, {}, { checkpoint: 1 });
    run(sim, 0.2, { x: 1 });
    sim.options = { stopAtEdges: true, easyJumps: true };
    run(sim, 5, { x: 1 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.x).toBeGreaterThan(14);
  });
});
