import { describe, expect, it } from 'vitest';
import { cameraIntent } from '../../src/sim/camera-intent';
import { CLIMB_SPEED, STEP, SWING_FLIGHT, SWING_HOLD_MAX, SWING_MAX } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, Hook, SimOptions, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const degrees = (radians: number) => (radians * 180) / Math.PI;

/** A gully five EL wide and six deep, with a hook over it and the landing on its far side. */
const hook: Hook = { x: 2.3, y: 3.5, length: 2.9, land: { x: 6.6, y: 0 } };
const gully: ChapterData = {
  id: 'gully',
  spawn: { x: -0.2, y: 0.01 },
  goalX: 1000,
  ground: [
    { x: -8, y: 10 }, { x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -6 }, { x: 5, y: -6 }, { x: 5, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 10 },
  ],
  candy: [{ x: -0.2, y: 0.45 }],
  hooks: [hook],
};

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** Steps until the test passes, or for at most `seconds`. Returns whether it passed. */
function until(sim: Sim, seconds: number, input: Partial<StepInput>, test: () => boolean): boolean {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    if (test()) return true;
    sim.step({ ...idle, ...input });
  }
  return test();
}

/** The swing's angle from straight down, positive to the right, read from where he is. */
const angleOf = (sim: Sim) => Math.atan2(sim.curr.x - hook.x, hook.y - (sim.curr.y + 0.5));
const lengthOf = (sim: Sim) => Math.hypot(sim.curr.x - hook.x, hook.y - (sim.curr.y + 0.5));

/** Elof on the lace, thrown from the ledge. */
function onTheLace(options: SimOptions = {}): Sim {
  const sim = new Sim(gully, options);
  run(sim, 0.2);
  sim.step({ ...idle, act: true });
  return sim;
}

/** One step of pumping as a child does: pushing the way the swing goes. */
function pump(sim: Sim): void {
  sim.step({ ...idle, x: sim.curr.vx < -0.05 ? -1 : 1 });
}

/** Pumps until the swing is at full height, and returns how many times it passed the bottom on the way. */
function pumpToFull(sim: Sim): number {
  let passes = 0;
  let side = Math.sign(angleOf(sim));
  for (let i = 0; i < 20 / STEP; i++) {
    pump(sim);
    const now = Math.sign(angleOf(sim));
    if (now !== 0 && now !== side) {
      passes++;
      side = now;
    }
    if (Math.abs(angleOf(sim)) > SWING_MAX - 0.05) break;
  }
  return passes;
}

describe('the lace', () => {
  it('is offered within four EL of a hook above him, and not further off', () => {
    const near = new Sim(gully);
    run(near, 0.2);
    expect(near.curr.verb).toBe('lace');
    const far = new Sim({ ...gully, spawn: { x: -3, y: 0.01 } });
    run(far, 0.2);
    expect(far.curr.verb).toBeNull();
  });

  it('is not offered to a hook below his hands', () => {
    const sim = new Sim({ ...gully, hooks: [{ x: 1, y: 0.6, length: 1 }] });
    run(sim, 0.2);
    expect(sim.curr.verb).toBeNull();
  });

  it('hooks on by itself with Använd, and pulls him in to its swinging length', () => {
    const sim = onTheLace();
    expect(sim.curr.mode).toBe('swing');
    expect(sim.curr.hook).toEqual({ x: hook.x, y: hook.y });
    run(sim, 0.5);
    expect(lengthOf(sim)).toBeCloseTo(hook.length, 1);
    expect(sim.curr.verb).toBeNull();
  });

  it('can be thrown in the air too', () => {
    const sim = new Sim({ ...gully, spawn: { x: -1, y: 0.01 } });
    run(sim, 0.2);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    run(sim, 0.2, { x: 1, hopHeld: true });
    expect(sim.curr.grounded).toBe(false);
    sim.step({ ...idle, x: 1, act: true });
    expect(sim.curr.mode).toBe('swing');
  });

  it('left alone swings to and fro and slowly comes to rest', () => {
    const sim = onTheLace();
    run(sim, 1.5);
    const early = Math.abs(sim.curr.vx);
    let widest = 0;
    for (let i = 0; i < 30 / STEP; i++) {
      sim.step(idle);
      if (i > 28 / STEP) widest = Math.max(widest, Math.abs(angleOf(sim)));
    }
    expect(early).toBeGreaterThan(0.5);
    expect(degrees(widest)).toBeLessThan(15);
    expect(sim.curr.mode).toBe('swing');
    expect(sim.bubbles).toBe(0);
  });

  it('is pumped to full height in about three swings, by pushing the way he swings', () => {
    const sim = onTheLace();
    const passes = pumpToFull(sim);
    expect(degrees(Math.abs(angleOf(sim)))).toBeGreaterThan(degrees(SWING_MAX) - 3);
    expect(passes).toBeGreaterThanOrEqual(2);
    expect(passes).toBeLessThanOrEqual(5);
  });

  it('never swings past full height, however long he pumps', () => {
    const sim = onTheLace();
    let widest = 0;
    for (let i = 0; i < 25 / STEP; i++) {
      pump(sim);
      widest = Math.max(widest, Math.abs(angleOf(sim)));
    }
    expect(degrees(widest)).toBeLessThan(degrees(SWING_MAX) + 2);
  });

  it('gains nothing from a stick held one way', () => {
    const sim = onTheLace();
    let widest = 0;
    for (let i = 0; i < 12 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      if (i > 2 / STEP) widest = Math.max(widest, Math.abs(angleOf(sim)));
    }
    // Half of every swing goes against the stick, so it climbs slowly or not at all: timing is what counts.
    expect(degrees(widest)).toBeLessThan(degrees(SWING_MAX) + 2);
  });

  it('is climbed with up, and let out again with down', () => {
    const sim = onTheLace();
    run(sim, 0.5);
    run(sim, 1, { y: 1 });
    expect(lengthOf(sim)).toBeCloseTo(hook.length - CLIMB_SPEED, 1);
    run(sim, 3, { y: -1 });
    expect(lengthOf(sim)).toBeCloseTo(hook.length, 1);
  });

  it('keeps the picture still on the hook while he swings', () => {
    const sim = onTheLace();
    run(sim, 0.4);
    const a = cameraIntent(sim.curr);
    run(sim, 0.7);
    const b = cameraIntent(sim.curr);
    expect(a.y).toBeCloseTo(b.y, 5);
    expect(Math.abs(a.x - b.x)).toBeLessThan(2.5);
  });
});

describe('letting go on Äventyr', () => {
  it('on the way up at full height carries him to the far side', () => {
    const sim = onTheLace();
    pumpToFull(sim);
    // The right moment: going forward and upward, well past the bottom.
    expect(until(sim, 6, {}, () => sim.curr.vx > 0 && degrees(angleOf(sim)) > 38 && degrees(angleOf(sim)) < 50)).toBe(true);
    sim.step({ ...idle, x: 1, hop: true });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.vx).toBeGreaterThan(2);
    expect(sim.curr.vy).toBeGreaterThan(2);
    expect(until(sim, 3, { x: 1 }, () => sim.curr.grounded)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(5);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('has a window of about 0.3 s either side of the right moment', () => {
    // Every moment in the forward swing from which he lands, at full height.
    const landsFrom: number[] = [];
    for (let wait = 0; wait < 1.3; wait += 0.05) {
      const sim = onTheLace();
      pumpToFull(sim);
      // From the back top of the swing, so that every try starts the same way.
      until(sim, 6, {}, () => sim.curr.vx > 0 && angleOf(sim) < -0.9 * SWING_MAX + 0.3);
      run(sim, wait);
      if (sim.curr.vx <= 0) break;
      sim.step({ ...idle, x: 1, hop: true });
      until(sim, 4, { x: 1 }, () => sim.curr.grounded || sim.bubbles > 0);
      if (sim.bubbles === 0 && sim.curr.x > 5) landsFrom.push(wait);
    }
    const window = landsFrom.length * 0.05;
    expect(window).toBeGreaterThanOrEqual(0.25);
    expect(window).toBeLessThanOrEqual(0.8);
  });

  it('at the bottom drops him in the gully, and the bubble brings him back with everything he had', () => {
    const sim = onTheLace();
    expect(sim.candyCount).toBe(1);
    until(sim, 6, {}, () => sim.curr.vx > 0 && Math.abs(angleOf(sim)) < 0.05);
    sim.step({ ...idle, hop: true });
    expect(until(sim, 4, {}, () => sim.bubbles === 1)).toBe(true);
    until(sim, 3, {}, () => sim.curr.mode === 'free' && sim.curr.grounded);
    expect(sim.curr.x).toBeLessThan(0);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.candyCount).toBe(1);
  });
});

describe('Hjälp med svingen', () => {
  it('pumps the swing to full height by itself in about two seconds', () => {
    const sim = onTheLace({ swingHelp: true });
    let widest = 0;
    for (let i = 0; i < 3 / STEP; i++) {
      sim.step(idle);
      widest = Math.max(widest, Math.abs(angleOf(sim)));
    }
    expect(degrees(widest)).toBeGreaterThan(degrees(SWING_MAX) - 5);
  });

  it('lands him on the far side whenever Hoppa is pressed', () => {
    for (const after of [0.02, 0.3, 0.7, 1.1, 1.6, 2.2, 3.1, 4.4]) {
      const sim = onTheLace({ swingHelp: true });
      run(sim, after);
      const steps = sim.steps;
      sim.step({ ...idle, hop: true });
      expect(until(sim, 6, {}, () => sim.curr.mode === 'free' && sim.curr.grounded), `pressed after ${after} s`).toBe(true);
      expect((sim.steps - steps) * STEP, `pressed after ${after} s`).toBeLessThan(SWING_HOLD_MAX + SWING_FLIGHT + 0.2);
      expect(sim.curr.x, `pressed after ${after} s`).toBeCloseTo(hook.land!.x, 1);
      expect(sim.curr.y, `pressed after ${after} s`).toBeCloseTo(0, 1);
      expect(sim.bubbles, `pressed after ${after} s`).toBe(0);
    }
  });
});
