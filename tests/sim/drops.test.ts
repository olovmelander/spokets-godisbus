import { describe, expect, it } from 'vitest';
import { DOWN_TIME, DROP_FALL, DROP_RADIUS, DROP_WARNING, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, SimOptions, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Flat ground with one drip at x = 4: a drop lands there at 1.5 s, 4.5 s, 7.5 s and so on. */
const FIRST = 1.5;
const course: ChapterData = {
  id: 'drops',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 8 }],
  candy: [{ x: 0.5, y: 0.45 }],
  drips: [{ at: { x: 4, y: 0 }, every: 3, first: FIRST }],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** A simulation with Elof standing at x, at the time the first drop has `before` seconds left to fall. */
function standingAt(x: number, before: number, options: SimOptions = {}): Sim {
  const sim = new Sim({ ...course, spawn: { x, y: 0.01 } }, options);
  run(sim, FIRST - before);
  return sim;
}

describe('a falling drop', () => {
  it('is announced by its shadow, which grows for a second before it lands', () => {
    const sim = new Sim(course);
    run(sim, FIRST - DROP_WARNING - 0.1);
    expect(sim.drips[0]!.shadow).toBe(0);
    run(sim, 0.35);
    const early = sim.drips[0]!.shadow;
    expect(early).toBeGreaterThan(0.15);
    expect(early).toBeLessThan(0.4);
    run(sim, 0.5);
    expect(sim.drips[0]!.shadow).toBeGreaterThan(early + 0.4);
  });

  it('is in the air only at the end of that second, and lower each moment', () => {
    const sim = new Sim(course);
    run(sim, FIRST - DROP_FALL - 0.1);
    expect(sim.drips[0]!.height).toBe(-1);
    run(sim, 0.2);
    const high = sim.drips[0]!.height;
    expect(high).toBeGreaterThan(2);
    run(sim, 0.3);
    expect(sim.drips[0]!.height).toBeGreaterThan(0);
    expect(sim.drips[0]!.height).toBeLessThan(high);
  });

  it('knocks him over when it lands on him, for about a second, and takes nothing', () => {
    const sim = standingAt(4, 0.5);
    run(sim, 0.4, { x: 0 });
    expect(sim.knocks).toBe(0);
    run(sim, 0.15);
    expect(sim.knocks).toBe(1);
    expect(sim.curr.mode).toBe('down');
    // Down: the stick and Hoppa do nothing.
    run(sim, DOWN_TIME - 0.2, { x: 1, hop: true, hopHeld: true });
    expect(sim.curr.mode).toBe('down');
    expect(sim.curr.x).toBeCloseTo(4, 1);
    run(sim, 0.3);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('gives him time to get away before the next one', () => {
    const sim = standingAt(4, 0.02);
    run(sim, 0.1);
    expect(sim.knocks).toBe(1);
    // Up again, and running: the next drop lands on nobody.
    run(sim, 4, { x: 1 });
    expect(sim.knocks).toBe(1);
    expect(sim.curr.x).toBeGreaterThan(8);
  });

  it('misses him when he stands beside where it lands', () => {
    const sim = standingAt(4 - DROP_RADIUS - 0.25, 0.1);
    run(sim, 0.4);
    expect(sim.knocks).toBe(0);
    expect(sim.curr.mode).toBe('free');
  });

  it('keeps the candy he had', () => {
    const sim = new Sim(course);
    run(sim, 0.4, { x: 1 });
    expect(sim.candyCount).toBe(1);
    // He walks under the drop and waits for it.
    for (let i = 0; i < 6 / STEP && sim.knocks === 0; i++) sim.step({ ...idle, x: sim.curr.x < 3.9 ? 0.6 : 0 });
    expect(sim.knocks).toBe(1);
    expect(sim.candyCount).toBe(1);
  });

  it('keeps time by the simulation, not by the clock: the same at any pace of play', () => {
    const landings = (stepsAtATime: number) => {
      const sim = new Sim({ ...course, spawn: { x: -5, y: 0.01 } });
      const at: number[] = [];
      let was = 0;
      for (let i = 0; i < 7 / STEP; i += stepsAtATime) {
        for (let k = 0; k < stepsAtATime; k++) {
          sim.step(idle);
          const shadow = sim.drips[0]!.shadow;
          if (shadow < was) at.push(sim.steps);
          was = shadow;
        }
      }
      return at;
    };
    expect(landings(1)).toEqual(landings(8));
    expect(landings(1).length).toBe(2);
  });
});

// From here he is right under the drop, at a run, when it lands: 3.5 EL/s after 0.3 s of speeding up.
const RUN_UP = 4 - (3.5 * FIRST - 0.525);

describe('falling drops on Lugnt', () => {
  it('miss him while he moves', () => {
    const sim = new Sim({ ...course, spawn: { x: RUN_UP, y: 0.01 } }, { gentle: true });
    let under = false;
    for (let i = 0; i < 3 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.steps === Math.round(FIRST / STEP)) under = Math.abs(sim.curr.x - 4) < DROP_RADIUS;
    }
    expect(under).toBe(true);
    expect(sim.knocks).toBe(0);
  });

  it('still land on him when he stands still under one', () => {
    const sim = standingAt(4, 0.3, { gentle: true });
    run(sim, 0.5);
    expect(sim.knocks).toBe(1);
  });

  it('on Äventyr the same run is a knock', () => {
    const sim = new Sim({ ...course, spawn: { x: RUN_UP, y: 0.01 } });
    run(sim, 3, { x: 1 });
    expect(sim.knocks).toBe(1);
  });
});
