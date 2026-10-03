import { describe, expect, it } from 'vitest';
import { GHOST_CATCH, GHOST_NEAR, STEP, WALK_DEFLECTION } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Flat ground, with a ghost that waits in four places, a lever, and candy that waits for things to happen. */
const course: ChapterData = {
  id: 'ghost',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 8 }],
  candy: [{ x: 1, y: 0.45 }, { x: 19, y: 0.5, after: 'caught' }, { x: 19.6, y: 0.5, after: 'caught' }],
  ghost: [{ at: { x: 5, y: 0 } }, { at: { x: 11.5, y: 0 } }, { at: { x: 18, y: 0 }, catch: 'caught' }, { at: { x: 24, y: 0 } }],
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

const gap = (sim: Sim) => sim.ghost!.x - sim.curr.x;

describe('the ghost', () => {
  it('waits where it is while Elof keeps away', () => {
    const sim = new Sim(course);
    run(sim, 3);
    expect(sim.ghost).toMatchObject({ x: 5, y: 0, perch: 0, t: 1, gone: false });
  });

  it('hops on to its next place when he comes near, in an arc', () => {
    const sim = new Sim(course);
    until(sim, 4, { x: 1 }, () => sim.ghost!.perch === 1);
    expect(gap(sim)).toBeCloseTo(GHOST_NEAR, 0);
    run(sim, 0.4, { x: 1 });
    expect(sim.ghost!.y).toBeGreaterThan(0.3);
    until(sim, 3, {}, () => sim.ghost!.t === 1);
    expect(sim.ghost!.x).toBeCloseTo(11.5, 3);
    expect(sim.ghost!.y).toBeCloseTo(0, 3);
  });

  it('is always ahead of a runner and never close: the chase cannot be won early', () => {
    const sim = new Sim(course);
    let nearest = Infinity;
    for (let i = 0; i < 4.2 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.ghost!.perch < 2) nearest = Math.min(nearest, gap(sim));
    }
    expect(nearest).toBeGreaterThan(3.5);
  });

  it('lets him come close once, and Använd says Ta!', () => {
    const sim = new Sim(course);
    until(sim, 10, { x: 1 }, () => sim.curr.verb === 'grab');
    expect(sim.curr.verb).toBe('grab');
    expect(gap(sim)).toBeLessThanOrEqual(GHOST_CATCH + 0.01);
    expect(sim.ghost!.perch).toBe(2);
    expect(sim.ghost!.t).toBe(1);
  });

  it('gets away when he grabs, and drops candy that was not there before', () => {
    const sim = new Sim(course);
    until(sim, 10, { x: 1 }, () => sim.curr.verb === 'grab');
    expect(sim.candyCount).toBe(1);
    sim.step({ ...idle, act: true });
    expect(sim.flags.has('caught')).toBe(true);
    run(sim, 0.3);
    expect(sim.ghost!.perch).toBe(3);
    run(sim, 2, { x: 1 });
    expect(sim.candyCount).toBe(3);
  });

  it('slips away by itself when he walks into it without grabbing, and then drops nothing', () => {
    const sim = new Sim(course);
    until(sim, 12, { x: WALK_DEFLECTION }, () => sim.ghost!.perch === 3);
    expect(sim.flags.has('caught')).toBe(false);
    run(sim, 4, { x: 1 });
    expect(sim.candyCount).toBe(1);
  });

  it('is gone from the chapter after its last place', () => {
    const sim = new Sim(course);
    for (let i = 0; i < 14 / STEP && !sim.ghost!.gone; i++) sim.step({ ...idle, x: 1, act: sim.curr.verb === 'grab' });
    expect(sim.ghost!.gone).toBe(true);
    expect(sim.curr.x).toBeLessThan(24);
  });

  it('starts ahead of him when a saved game is taken up further on', () => {
    const sim = new Sim({ ...course, checkpoints: [{ x: 13, y: 0 }] }, {}, { checkpoint: 0, flags: [] });
    expect(sim.ghost!.perch).toBe(2);
    expect(gap(sim)).toBeGreaterThan(1);
  });

  it('is not there at all in a chapter without one', () => {
    const { ghost: _none, ...bare } = course;
    expect(new Sim(bare).ghost).toBeNull();
  });
});

describe('a thing to use', () => {
  const garden: ChapterData = {
    ...course,
    ghost: [{ at: { x: 12, y: 0 }, until: 'lever' }, { at: { x: 20, y: 0 } }],
    spots: [{ id: 'lever', at: { x: 6, y: 0 }, verb: 'turn' }, { id: 'star', at: { x: 9, y: 0 }, verb: 'take', needs: 'lever' }],
  };

  it('is offered when he stands at it, with its own word', () => {
    const sim = new Sim(garden);
    run(sim, 0.3);
    expect(sim.curr.verb).toBeNull();
    until(sim, 4, { x: 1 }, () => sim.curr.verb !== null);
    expect(sim.curr.verb).toBe('turn');
    expect(Math.abs(sim.curr.x - 6)).toBeLessThan(1.3);
  });

  it('is used once: it sets its flag, and is not offered again', () => {
    const sim = new Sim(garden);
    until(sim, 4, { x: 1 }, () => sim.curr.verb === 'turn');
    sim.step({ ...idle, act: true });
    expect(sim.flags.has('lever')).toBe(true);
    run(sim, 0.5);
    expect(sim.curr.verb).not.toBe('turn');
  });

  it('can wait for another: the star is offered only once the lever is turned', () => {
    const sim = new Sim({ ...garden, spawn: { x: 9, y: 0.01 } });
    run(sim, 0.3);
    expect(sim.curr.verb).toBeNull();
    const after = new Sim({ ...garden, spawn: { x: 9, y: 0.01 } }, {}, { flags: ['lever'] });
    run(after, 0.3);
    expect(after.curr.verb).toBe('take');
  });

  it('can hold the ghost where it is until it is used', () => {
    const sim = new Sim(garden);
    until(sim, 4, { x: 1 }, () => sim.curr.verb === 'turn');
    // Past the lever and right up to the ghost: it stands.
    run(sim, 2, { x: 1 });
    expect(sim.ghost!.perch).toBe(0);
    run(sim, 2.5, { x: -1 });
    until(sim, 4, { x: 1 }, () => sim.curr.verb === 'turn');
    sim.step({ ...idle, act: true });
    until(sim, 5, { x: 1 }, () => sim.ghost!.perch === 1);
    expect(sim.ghost!.perch).toBe(1);
  });
});
