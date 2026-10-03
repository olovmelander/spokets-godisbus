import { describe, expect, it } from 'vitest';
import { MOVE_TIME, MOVER_RESET, STEP, WALK_DEFLECTION } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/**
 * A pit with a plank to pull across it, then a block to push to a wall that is too high without it.
 * The same puzzle as on the test course, a little smaller.
 */
const puzzle: ChapterData = {
  id: 'puzzle',
  spawn: { x: -0.4, y: 0.01 },
  goalX: 1000,
  ground: [
    { x: -30, y: 12 }, { x: -30, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -5 }, { x: 2.8, y: -5 }, { x: 2.8, y: 0 }, { x: 11.3, y: 0 },
    { x: 11.3, y: 3.3 }, { x: 20, y: 3.3 }, { x: 20, y: 12 },
  ],
  candy: [],
  movers: [
    { id: 'plank', width: 3.1, height: 0.4, verb: 'pull', ring: { x: -1.4, y: 0.55 }, stops: [{ x: 4.6, y: 0 }, { x: 1.4, y: -0.4 }] },
    { id: 'block', width: 1, height: 1.5, verb: 'push', stops: [{ x: 8, y: 0 }, { x: 9.4, y: 0 }, { x: 10.8, y: 0 }] },
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

/** Presses Använd once, and waits for whatever it moved to come to rest. */
function use(sim: Sim): void {
  sim.step({ ...idle, act: true });
  run(sim, MOVE_TIME + 0.1);
}

const plank = (sim: Sim) => sim.movers[0]!;
const block = (sim: Sim) => sim.movers[1]!;

describe('a thing pulled with the lace (Dra)', () => {
  it('is offered when its red ring is within reach, from the side it is pulled to', () => {
    const sim = new Sim(puzzle);
    run(sim, 0.2);
    expect(sim.curr.verb).toBe('pull');
    const far = new Sim({ ...puzzle, spawn: { x: -6, y: 0.01 } });
    run(far, 0.2);
    expect(far.curr.verb).toBeNull();
  });

  it('slides one stop along its rail and stays there', () => {
    const sim = new Sim(puzzle);
    run(sim, 0.2);
    sim.step({ ...idle, act: true });
    run(sim, MOVE_TIME / 2);
    // On its way: between its stops, and Använd has nothing to offer.
    expect(plank(sim).x).toBeLessThan(4.6);
    expect(plank(sim).x).toBeGreaterThan(1.4);
    expect(sim.curr.verb).toBeNull();
    run(sim, MOVE_TIME);
    expect(plank(sim).x).toBeCloseTo(1.4, 3);
    expect(plank(sim).y).toBeCloseTo(-0.4, 3);
    expect(sim.curr.verb).toBeNull();
    expect(sim.placed).toEqual(['plank']);
  });

  it('makes a bridge he can walk across', () => {
    const sim = new Sim(puzzle);
    run(sim, 0.2);
    use(sim);
    run(sim, 4, { x: WALK_DEFLECTION });
    expect(sim.curr.x).toBeGreaterThan(3);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('is needed: without it the pit stops him walking, and catches him running', () => {
    const walking = new Sim(puzzle);
    run(walking, 4, { x: WALK_DEFLECTION });
    expect(walking.curr.atEdge).toBe(true);
    expect(walking.curr.x).toBeLessThan(0);
    const running = new Sim(puzzle);
    expect(until(running, 4, { x: 1 }, () => running.bubbles === 1)).toBe(true);
  });
});

describe('a thing pushed (Knuffa)', () => {
  /** Elof beside the block, on the side it is pushed from, with the plank already across. */
  function atTheBlock(): Sim {
    const sim = new Sim(puzzle, {}, { placed: ['plank'] });
    until(sim, 6, { x: 1 }, () => sim.curr.verb === 'push');
    run(sim, 0.3);
    return sim;
  }

  it('is offered when he stands beside it, on the side it is pushed from', () => {
    const sim = atTheBlock();
    expect(sim.curr.verb).toBe('push');
    expect(sim.curr.x).toBeLessThan(block(sim).x - 0.5);
  });

  it('is too high to walk onto: he has to push it or jump', () => {
    const sim = atTheBlock();
    run(sim, 2, { x: 1 });
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.x).toBeLessThan(block(sim).x - 0.5);
  });

  it('goes one stop for each push, and no further than its last', () => {
    const sim = atTheBlock();
    use(sim);
    expect(block(sim).x).toBeCloseTo(9.4, 3);
    expect(sim.placed).toEqual(['plank']);
    until(sim, 3, { x: 1 }, () => sim.curr.verb === 'push');
    use(sim);
    expect(block(sim).x).toBeCloseTo(10.8, 3);
    expect(sim.placed).toEqual(['plank', 'block']);
    run(sim, 1, { x: 1 });
    expect(sim.curr.verb).toBeNull();
  });

  it('goes home when he leaves it half way', () => {
    const sim = atTheBlock();
    use(sim);
    until(sim, 12, { x: -1 }, () => block(sim).x - sim.curr.x > MOVER_RESET + 0.5);
    run(sim, MOVE_TIME + 0.2);
    expect(block(sim).x).toBeCloseTo(8, 3);
  });

  it('stays for good once it is where it belongs', () => {
    const sim = atTheBlock();
    use(sim);
    until(sim, 3, { x: 1 }, () => sim.curr.verb === 'push');
    use(sim);
    run(sim, 6, { x: -1 });
    expect(block(sim).x).toBeCloseTo(10.8, 3);
  });

  it('is the step up the wall: from its top the wall is within a jump', () => {
    const sim = atTheBlock();
    use(sim);
    until(sim, 3, { x: 1 }, () => sim.curr.verb === 'push');
    use(sim);
    // Onto the block with a jump, and from the block onto the wall with another.
    until(sim, 3, { x: 1 }, () => sim.curr.x > 9.9);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    expect(until(sim, 3, { x: 1, hopHeld: true }, () => sim.curr.grounded && sim.curr.y > 1.4)).toBe(true);
    expect(sim.curr.y).toBeCloseTo(1.5, 1);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    expect(until(sim, 3, { x: 1, hopHeld: true }, () => sim.curr.grounded && sim.curr.y > 3.2)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(11.3);
  });

  it('cannot be reached without it', () => {
    const sim = new Sim(puzzle, {}, { placed: ['plank'] });
    until(sim, 6, { x: 1 }, () => sim.curr.verb === 'push');
    // Past the block by jumping over... onto it, and from there the wall is too far and too high.
    for (let i = 0; i < 6 / STEP; i++) sim.step({ ...idle, x: 1, hopHeld: true, hop: i % 80 === 0 });
    expect(sim.curr.y).toBeLessThan(3);
  });
});

describe('a saved puzzle', () => {
  it('starts with what was in place still in place, and the rest at home', () => {
    const sim = new Sim(puzzle, {}, { placed: ['plank', 'something from another game'] });
    expect(plank(sim).x).toBeCloseTo(1.4, 3);
    expect(block(sim).x).toBeCloseTo(8, 3);
    expect(sim.placed).toEqual(['plank']);
  });
});
