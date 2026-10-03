import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { GUST_SHELTER, GUST_SLOW, RUN_SPEED, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Flat ground. From x = 10 to 30 it is open, with boulders at 10, 20 and 30. A gust blows at 2 s, for 1.4 s, every 4 s. */
const FIRST = 2;
const LENGTH = 1.4;
const course: ChapterData = {
  id: 'gusts',
  spawn: { x: 15, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 8 }],
  candy: [{ x: 15.2, y: 0.45 }],
  gusts: [{ from: 10, to: 30, y: 0, every: 4, length: LENGTH, first: FIRST, shelters: [10, 20, 30] }],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

const startAt = (x: number, gentle = false) => new Sim({ ...course, spawn: { x, y: 0.01 } }, { gentle });

describe('a gust', () => {
  it('is announced for a second before it blows, and blows for its time', () => {
    const sim = startAt(50);
    run(sim, FIRST - 1.2);
    expect(sim.gusts[0]!.warn).toBe(0);
    expect(sim.gusts[0]!.blow).toBe(0);
    run(sim, 0.7);
    expect(sim.gusts[0]!.warn).toBeCloseTo(0.5, 1);
    expect(sim.gusts[0]!.until).toBeCloseTo(0.5, 1);
    run(sim, 0.6);
    expect(sim.gusts[0]!.blow).toBeGreaterThan(0);
    expect(sim.gusts[0]!.until).toBe(0);
    run(sim, LENGTH);
    expect(sim.gusts[0]!.blow).toBe(0);
    expect(sim.gusts[0]!.until).toBeGreaterThan(2);
  });

  it('that catches him in the open takes him back to the last boulder, and takes nothing', () => {
    const sim = startAt(15);
    run(sim, 0.3);
    expect(sim.candyCount).toBe(1);
    run(sim, FIRST - 0.3 + LENGTH + 0.3);
    expect(sim.blown).toBe(1);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
    // The boulder stands at x = 10: he is in its lee.
    expect(sim.curr.x).toBeLessThanOrEqual(10 + GUST_SHELTER + 0.05);
    expect(sim.curr.x).toBeGreaterThan(10 - GUST_SHELTER);
    expect(sim.bubbles).toBe(0);
    expect(sim.candyCount).toBe(1);
  });

  it('passes him by in a boulder\'s lee', () => {
    const sim = startAt(20.5);
    run(sim, FIRST + LENGTH + 0.3);
    expect(sim.blown).toBe(0);
    expect(sim.curr.x).toBeCloseTo(20.5, 1);
  });

  it('cannot be run against: the stick does nothing while it has hold of him', () => {
    const sim = startAt(22);
    run(sim, FIRST - 0.2);
    // He sets off just before it blows, and holds the stick forward all through it.
    let furthest = 0;
    for (let i = 0; i < (LENGTH + 0.2) / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      furthest = Math.max(furthest, sim.curr.x);
    }
    expect(furthest).toBeLessThan(23.5);
    expect(sim.curr.x).toBeLessThan(22);
    // One gust is counted once, however many times it takes hold of him.
    expect(sim.blown).toBe(1);
  });

  it('leaves time to dash from one boulder to the next between two gusts', () => {
    // Boulders 8 EL apart: further than any in the game.
    const sim = new Sim({ ...course, spawn: { x: 10.5, y: 0.01 }, gusts: [{ ...course.gusts![0]!, shelters: [10, 18, 30] }] });
    run(sim, FIRST + LENGTH);
    expect(sim.blown).toBe(0);
    run(sim, 2.3, { x: 1 });
    // He is in the next boulder's lee before the next gust begins, and it passes him by.
    expect(sim.gusts[0]!.blow).toBe(0);
    expect(Math.abs(sim.curr.x - 18)).toBeLessThan(GUST_SHELTER);
    run(sim, 2);
    expect(sim.blown).toBe(0);
    expect(Math.abs(sim.curr.x - 18)).toBeLessThan(GUST_SHELTER);
  });

  it('does nothing outside its stretch', () => {
    const sim = startAt(40);
    run(sim, FIRST + LENGTH + 0.3);
    expect(sim.blown).toBe(0);
    expect(sim.curr.x).toBeCloseTo(40, 1);
  });

  it('on Lugnt only slows him', () => {
    const sim = startAt(12, true);
    run(sim, FIRST, { x: 1 });
    const before = sim.curr.x;
    run(sim, 1, { x: 1 });
    // A second of the gust: he keeps going, at half his running speed.
    expect(sim.curr.x - before).toBeGreaterThan(RUN_SPEED * GUST_SLOW * 0.8);
    expect(sim.curr.x - before).toBeLessThan(RUN_SPEED * 0.75);
  });
});

describe('a ride that begins by itself', () => {
  const lift: ChapterData = {
    id: 'lift',
    spawn: { x: 1, y: 0.01 },
    goalX: 1000,
    ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 6, y: 0 }, { x: 6, y: -9 }, { x: 20, y: -9 }, { x: 20, y: 3 }, { x: 40, y: 3 }, { x: 40, y: 9 }],
    candy: [{ x: 39, y: 3.45 }],
    checkpoints: [{ x: 26, y: 3 }],
    spots: [{ id: 'crane', at: { x: 1, y: 0 }, verb: 'take', touch: true, ride: 'crane' }],
    rides: [{ id: 'crane', from: { x: 1, y: 0 }, to: { x: 24, y: 3 }, rise: 3, time: 3 }],
  };

  it('carries him off as soon as he stands at it, and sets him down at its end', () => {
    const sim = new Sim(lift);
    run(sim, 0.2);
    expect(sim.curr.mode).toBe('ride');
    expect(sim.flags.has('crane')).toBe(true);
    run(sim, 3.2);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeCloseTo(24, 0);
    expect(sim.curr.y).toBeCloseTo(3, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('begins again when the game was saved in the middle of it', () => {
    const sim = new Sim(lift, {}, { flags: ['crane'] });
    run(sim, 0.2);
    expect(sim.curr.mode).toBe('ride');
  });

  it('is not taken again once he has been set down beyond it', () => {
    const sim = new Sim(lift, {}, { checkpoint: 0, flags: ['crane'] });
    expect(sim.flags.has('crane')).toBe(true);
    run(sim, 0.5);
    expect(sim.curr.mode).toBe('free');
  });

  it('the same holds for a ride he calls for: Bertil\'s cap can be called again from the near shore', () => {
    const near = new Sim(granskog, {}, { checkpoint: 9, flags: ['cap'] });
    expect(near.flags.has('cap')).toBe(false);
    const far = new Sim(granskog, {}, { checkpoint: 10, flags: ['cap'] });
    expect(far.flags.has('cap')).toBe(true);
  });
});
