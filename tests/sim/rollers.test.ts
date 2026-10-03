import { describe, expect, it } from 'vitest';
import { BUBBLE_TIME, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, SimOptions, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Flat ground with one big candy at x = 2, and a cone that rolls from x = 0 to x = 30 every 6 s, at 6 EL/s. */
const course: ChapterData = {
  id: 'rollers',
  spawn: { x: 12, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 8 }],
  candy: [{ x: 39, y: 0.45 }],
  checkpoints: [{ x: 2, y: 0 }],
  rollers: [{ from: { x: 0, y: 0 }, to: { x: 30, y: 0 }, every: 6, first: 0, speed: 6, radius: 0.28 }],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

const start = (options: SimOptions = {}, chapter: ChapterData = course) => new Sim(chapter, options, { checkpoint: -1 });

describe('a rolling cone', () => {
  it('rolls its way at its speed, and the next one sets off when its time comes', () => {
    const sim = new Sim({ ...course, spawn: { x: 35, y: 0.01 } });
    run(sim, 1);
    expect(sim.rollers[0]!.on).toBe(true);
    expect(sim.rollers[0]!.x).toBeCloseTo(6, 0);
    run(sim, 4.5);
    // It has reached the end of its way: no cone is rolling until the next sets off.
    expect(sim.rollers[0]!.on).toBe(false);
    run(sim, 1);
    expect(sim.rollers[0]!.on).toBe(true);
    expect(sim.rollers[0]!.x).toBeCloseTo(3, 0);
  });

  it('bowls him over when it reaches his legs: the glitter takes him to the last big candy', () => {
    const sim = start();
    run(sim, 1.8);
    expect(sim.bowled).toBe(0);
    run(sim, 0.3);
    expect(sim.bowled).toBe(1);
    expect(sim.curr.mode).toBe('bubble');
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.curr.mode).toBe('free');
    // No big candy reached yet: the chapter's start.
    expect(sim.curr.x).toBeCloseTo(12, 0);
  });

  it('takes him to the big candy he reached last', () => {
    // This cone sets off after 3 s, when he has run on from the big candy.
    const late: ChapterData = { ...course, rollers: [{ ...course.rollers![0]!, first: 3, speed: 8 }] };
    const sim = new Sim(late, {}, { checkpoint: 0 });
    expect(sim.curr.x).toBeCloseTo(2, 0);
    run(sim, 3, { x: 1 });
    expect(sim.bowled).toBe(0);
    expect(sim.curr.x).toBeGreaterThan(10);
    for (let i = 0; i < 6 / STEP && sim.bowled === 0; i++) sim.step({ ...idle, x: 1 });
    expect(sim.bowled).toBe(1);
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeCloseTo(2, 0);
  });

  it('passes under him when he jumps in time', () => {
    const sim = start();
    // The cone is at x = 12 after 2 s. He jumps a little before, and is in the air as it passes.
    run(sim, 1.72);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.5, { hopHeld: true });
    expect(sim.rollers[0]!.x).toBeGreaterThan(12.6);
    run(sim, 1);
    expect(sim.bowled).toBe(0);
    expect(sim.curr.grounded).toBe(true);
  });

  it('takes nothing: the candy he has stays his', () => {
    const sim = new Sim({ ...course, candy: [{ x: 12.2, y: 0.45 }] });
    run(sim, 0.2);
    expect(sim.candyCount).toBe(1);
    run(sim, 3);
    expect(sim.bowled).toBe(1);
    expect(sim.candyCount).toBe(1);
  });

  it('on Lugnt misses him while he runs, and reaches him only if he stands still', () => {
    const running = start({ gentle: true });
    run(running, 5, { x: 1 });
    expect(running.bowled).toBe(0);
    const standing = start({ gentle: true });
    run(standing, 2.2);
    expect(standing.bowled).toBe(1);
  });

  it('waits for the nudge when it has one, and keeps time from it', () => {
    const nudged: ChapterData = {
      ...course,
      spawn: { x: 20, y: 0.01 },
      spots: [{ id: 'nudge', at: { x: 22, y: 0 }, verb: 'take', touch: true }],
      rollers: [{ ...course.rollers![0]!, first: 1, needs: 'nudge' }],
    };
    const sim = new Sim(nudged);
    run(sim, 3);
    expect(sim.rollers[0]!.on).toBe(false);
    expect(sim.flags.has('nudge')).toBe(false);
    // He walks up to the loose cone: coming close is enough, with no button.
    run(sim, 0.5, { x: 1 });
    expect(sim.flags.has('nudge')).toBe(true);
    // Its first cone sets off a second after the nudge, and none is on its way before.
    expect(sim.rollers[0]!.on).toBe(false);
    run(sim, 1.5);
    expect(sim.rollers[0]!.on).toBe(true);
    expect(sim.rollers[0]!.x).toBeLessThan(7);
  });
});

describe('a thing on a rail that needs something first', () => {
  const railed: ChapterData = {
    id: 'railed',
    spawn: { x: 0, y: 0.01 },
    goalX: 1000,
    ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 8 }],
    candy: [{ x: 39, y: 0.45 }],
    spots: [{ id: 'called', at: { x: 0.5, y: 0 }, verb: 'call' }],
    movers: [{ id: 'cone', width: 1, height: 1.5, verb: 'push', needs: 'called', stops: [{ x: 3, y: 0 }, { x: 5, y: 0 }] }],
  };

  it('cannot be pushed before, and can after; in place it sets its flag', () => {
    const sim = new Sim({ ...railed, spawn: { x: 2.1, y: 0.01 } });
    run(sim, 0.3);
    expect(sim.curr.verb).toBeNull();
    const called = new Sim({ ...railed, spawn: { x: 2.1, y: 0.01 } }, {}, { flags: ['called'] });
    run(called, 0.3);
    expect(called.curr.verb).toBe('push');
    expect(called.flags.has('placed:cone')).toBe(false);
    called.step({ ...idle, act: true });
    run(called, 1);
    expect(called.movers[0]!.x).toBeCloseTo(5, 2);
    expect(called.flags.has('placed:cone')).toBe(true);
  });

  it('is in place from the start when the saved game says so', () => {
    const sim = new Sim(railed, {}, { placed: ['cone'] });
    expect(sim.flags.has('placed:cone')).toBe(true);
    expect(sim.movers[0]!.x).toBeCloseTo(5, 2);
  });

  it('that only rises can be pulled from either side', () => {
    const lift: ChapterData = {
      ...railed,
      spots: [],
      movers: [{ id: 'leaf', width: 2, height: 0.3, verb: 'pull', ring: { x: 0, y: 0.9 }, stops: [{ x: 3, y: -0.3 }, { x: 3, y: 1 }] }],
    };
    for (const x of [0.5, 5.5]) {
      const sim = new Sim({ ...lift, spawn: { x, y: 0.01 } });
      run(sim, 0.3);
      expect(sim.curr.verb, `from x ${x}`).toBe('pull');
    }
  });
});
