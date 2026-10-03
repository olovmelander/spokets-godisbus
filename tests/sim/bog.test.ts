import { describe, expect, it } from 'vitest';
import { BUBBLE_TIME, RISE_TIME, SINK_DEPTH, SINK_TIME, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, SimOptions, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/**
 * Firm ground to x = 10, open water to x = 20, firm ground again. A soft tussock lies against the first
 * shore, from 10 to 12, so that he can walk onto it.
 */
const bog: ChapterData = {
  id: 'bog',
  spawn: { x: 8.5, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 10, y: 0 }, { x: 10, y: -6 }, { x: 20, y: -6 }, { x: 20, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 8 }],
  candy: [{ x: 39, y: 0.45 }],
  water: [{ from: 10, to: 20, y: -0.6 }],
  tussocks: [{ x: 11, y: 0, width: 2 }],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** Elof standing on the soft tussock, having walked onto it. */
function onTheTussock(options: SimOptions = {}): Sim {
  const sim = new Sim(bog, options);
  run(sim, 0.75, { x: 1 });
  return sim;
}

describe('a soft tussock', () => {
  it('carries him, and sinks slowly while he stands on it', () => {
    const sim = onTheTussock();
    expect(sim.curr.x).toBeGreaterThan(10.3);
    expect(sim.curr.x).toBeLessThan(11.8);
    expect(sim.curr.grounded).toBe(true);
    run(sim, SINK_TIME / 2);
    expect(sim.sinks).toBe(0);
    expect(sim.tussocks[0]!.sunk).toBeGreaterThan(0.5);
    expect(sim.tussocks[0]!.y).toBeLessThan(-SINK_DEPTH * 0.5);
    // He sinks with it, and still stands.
    expect(sim.curr.y).toBeCloseTo(sim.tussocks[0]!.y, 1);
    expect(sim.curr.grounded).toBe(true);
  });

  it('once sunk, sends him back to the last firm ground in the glitter bubble, before he is wet', () => {
    const sim = onTheTussock();
    let lowest = Infinity;
    for (let i = 0; i < SINK_TIME / STEP + 5 && sim.sinks === 0; i++) {
      sim.step(idle);
      lowest = Math.min(lowest, sim.curr.y);
    }
    expect(sim.sinks).toBe(1);
    expect(sim.bubbles).toBe(1);
    expect(sim.curr.mode).toBe('bubble');
    // The water's surface is at -0.6: his boots never reach it.
    expect(lowest).toBeGreaterThan(-0.55);
    run(sim, BUBBLE_TIME + 0.2);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeLessThan(10);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('rises again when he has left it', () => {
    const sim = onTheTussock();
    run(sim, SINK_TIME + 0.1);
    expect(sim.sinks).toBe(1);
    run(sim, BUBBLE_TIME + RISE_TIME);
    expect(sim.tussocks[0]!.sunk).toBe(0);
    expect(sim.tussocks[0]!.y).toBe(0);
  });

  it('lets him jump off while it sinks', () => {
    const sim = onTheTussock();
    run(sim, SINK_TIME * 0.6);
    sim.step({ ...idle, x: -1, hop: true, hopHeld: true });
    run(sim, 0.9, { x: -1, hopHeld: true });
    expect(sim.sinks).toBe(0);
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.x).toBeLessThan(10);
    expect(sim.curr.grounded).toBe(true);
  });

  it('hardly sinks under a runner who crosses it', () => {
    const sim = new Sim(bog);
    let deepest = 0;
    for (let i = 0; i < 1.05 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      deepest = Math.max(deepest, sim.tussocks[0]!.sunk);
    }
    expect(deepest).toBeGreaterThan(0.1);
    expect(deepest).toBeLessThan(0.45);
  });

  it('on Lugnt sinks only while he stands still', () => {
    const moving = onTheTussock({ gentle: true });
    // He walks to and fro on it for five seconds.
    for (let i = 0; i < 10; i++) run(moving, 0.25, { x: i % 2 === 0 ? -1 : 1 });
    for (let i = 0; i < 10; i++) run(moving, 0.25, { x: i % 2 === 0 ? -1 : 1 });
    expect(moving.sinks).toBe(0);
    expect(moving.curr.x).toBeGreaterThan(10);
    const still = onTheTussock({ gentle: true });
    run(still, SINK_TIME + 0.2);
    expect(still.sinks).toBe(1);
  });
});

describe('water', () => {
  it('is never touched: the glitter bubble catches him just above it', () => {
    const sim = new Sim({ ...bog, tussocks: [], spawn: { x: 9, y: 0.01 } });
    let lowest = Infinity;
    for (let i = 0; i < 1.5 / STEP && sim.bubbles === 0; i++) {
      sim.step({ ...idle, x: 1 });
      lowest = Math.min(lowest, sim.curr.y);
    }
    expect(sim.bubbles).toBe(1);
    expect(lowest).toBeGreaterThan(-0.6);
    run(sim, BUBBLE_TIME + 0.2);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeLessThan(10);
  });

  it('stops him at its edge when he walks', () => {
    const sim = new Sim({ ...bog, tussocks: [], spawn: { x: 9, y: 0.01 } });
    run(sim, 3, { x: 0.5 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.atEdge).toBe(true);
    expect(sim.curr.x).toBeLessThan(10);
  });
});

describe('a thing that a helper lifts into place', () => {
  const pool: ChapterData = {
    ...bog,
    tussocks: [],
    spawn: { x: 8.6, y: 0.01 },
    spots: [{ id: 'mamma', at: { x: 9, y: 0 }, verb: 'call' }],
    movers: [{ id: 'pine', width: 10.6, height: 0.4, verb: 'pull', on: 'mamma', stops: [{ x: 15, y: -1.5 }, { x: 15, y: -0.4 }] }],
  };

  it('is never offered to Använd: the call is', () => {
    const sim = new Sim(pool);
    run(sim, 0.2);
    expect(sim.curr.verb).toBe('call');
  });

  it('goes to its place by itself when she is called, and then carries him across', () => {
    const sim = new Sim(pool);
    run(sim, 0.2);
    sim.step({ ...idle, act: true });
    run(sim, 1);
    expect(sim.flags.has('mamma')).toBe(true);
    expect(sim.movers[0]!.y).toBeCloseTo(-0.4, 2);
    expect(sim.flags.has('placed:pine')).toBe(true);
    expect(sim.curr.verb).toBeNull();
    run(sim, 4, { x: 1 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.x).toBeGreaterThan(20);
  });

  it('is in place from the start when the saved game says so', () => {
    const sim = new Sim(pool, {}, { placed: ['pine'], flags: ['mamma'] });
    expect(sim.movers[0]!.y).toBeCloseTo(-0.4, 2);
  });
});
