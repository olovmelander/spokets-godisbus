import { describe, expect, it } from 'vitest';
import {
  CLIMB_SPEED, ELOF_HALF_WIDTH, LEDGE_TIME, RUN_SPEED, SLIDE_TIME, STEP, WALK_DEFLECTION, WALK_SPEED,
} from '../../src/sim/constants';
import { cameraIntent } from '../../src/sim/camera-intent';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, Climb, StepInput, Vec } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** A course from its ground line, between two high walls, with Elof standing at its start. */
function course(ground: Vec[], spawn: Vec = { x: 0, y: 0.01 }, climbs: Climb[] = []): ChapterData {
  const first = ground[0]!;
  const last = ground[ground.length - 1]!;
  return {
    id: 'course',
    spawn,
    goalX: 1000,
    ground: [{ x: first.x, y: first.y + 12 }, ...ground, { x: last.x, y: last.y + 12 }],
    candy: [],
    climbs,
  };
}

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

describe('a low step', () => {
  const kerb = course([{ x: -5, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 0.25 }, { x: 20, y: 0.25 }]);

  it('is walked over, without Hoppa', () => {
    const sim = new Sim(kerb);
    run(sim, 6, { x: WALK_DEFLECTION });
    expect(sim.curr.x).toBeGreaterThan(5);
    expect(sim.curr.y).toBeCloseTo(0.25, 1);
    expect(sim.curr.grounded).toBe(true);
  });

  it('hardly slows a run', () => {
    const sim = new Sim(kerb);
    run(sim, 2.5, { x: 1 });
    // Without the kerb he would be 8 EL on; it may cost him a little.
    expect(sim.curr.x).toBeGreaterThan(6.8);
    expect(sim.curr.y).toBeCloseTo(0.25, 1);
  });
});

describe('a slope he can walk', () => {
  // 30 degrees, from x = 2 to x = 6.
  const rise = 4 * Math.tan(Math.PI / 6);
  const slope = course([{ x: -5, y: 0 }, { x: 2, y: 0 }, { x: 6, y: rise }, { x: 20, y: rise }]);

  it('is walked up to the top', () => {
    const sim = new Sim(slope);
    run(sim, 4, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(7);
    expect(sim.curr.y).toBeCloseTo(rise, 1);
  });

  it('is run up at his running speed, measured along the slope', () => {
    const sim = new Sim(slope);
    until(sim, 3, { x: 1 }, () => sim.curr.x > 2.6);
    const from = { x: sim.curr.x, y: sim.curr.y };
    run(sim, 0.5, { x: 1 });
    const along = Math.hypot(sim.curr.x - from.x, sim.curr.y - from.y);
    expect(along / 0.5).toBeGreaterThan(RUN_SPEED * 0.93);
    expect(along / 0.5).toBeLessThan(RUN_SPEED * 1.03);
    expect(sim.curr.grounded).toBe(true);
  });

  it('lets him stand still on it', () => {
    const sim = new Sim(slope);
    until(sim, 3, { x: 1 }, () => sim.curr.x > 3.5);
    run(sim, 0.4);
    const at = { x: sim.curr.x, y: sim.curr.y };
    run(sim, 2);
    expect(Math.abs(sim.curr.x - at.x)).toBeLessThan(0.02);
    expect(Math.abs(sim.curr.y - at.y)).toBeLessThan(0.02);
    expect(sim.curr.grounded).toBe(true);
  });

  it('lets him jump from it', () => {
    const sim = new Sim(slope);
    until(sim, 3, { x: 1 }, () => sim.curr.x > 3.5);
    run(sim, 0.4);
    const from = sim.curr.y;
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.25, { hopHeld: true });
    expect(sim.curr.grounded).toBe(false);
    expect(sim.curr.y).toBeGreaterThan(from + 0.7);
  });

  it('keeps his feet on it on the way down', () => {
    const sim = new Sim({ ...slope, spawn: { x: 8, y: rise + 0.01 } });
    let inTheAir = 0;
    for (let i = 0; i < Math.round(3 / STEP); i++) {
      sim.step({ ...idle, x: -1 });
      if (sim.curr.x < 5.5 && sim.curr.x > 2.5 && !sim.curr.grounded) inTheAir++;
    }
    expect(sim.curr.x).toBeLessThan(1);
    expect(inTheAir).toBeLessThan(6);
  });
});

describe('a slope too steep to walk', () => {
  // 60 degrees.
  const steep = course([{ x: -5, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 2 * Math.tan(Math.PI / 3) }, { x: 20, y: 2 * Math.tan(Math.PI / 3) }]);

  it('sends him back down', () => {
    const sim = new Sim(steep);
    run(sim, 5, { x: 1 });
    expect(sim.curr.x).toBeLessThan(3);
    expect(sim.curr.y).toBeLessThan(1.6);
  });
});

describe('a ledge', () => {
  const wall = (height: number) => course([{ x: -5, y: 0 }, { x: 3, y: 0 }, { x: 3, y: height }, { x: 20, y: height }]);

  it('within reach of his hands is grabbed and climbed in 0.4 s, by walking into it', () => {
    const sim = new Sim(wall(1.3));
    let hauling = 0;
    for (let i = 0; i < Math.round(5 / STEP); i++) {
      sim.step({ ...idle, x: WALK_DEFLECTION });
      if (sim.curr.mode === 'ledge') hauling++;
    }
    expect(hauling * STEP).toBeCloseTo(LEDGE_TIME, 1);
    expect(sim.curr.y).toBeCloseTo(1.3, 1);
    expect(sim.curr.x).toBeGreaterThan(3 + ELOF_HALF_WIDTH);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
  });

  it('out of reach is not climbed from the ground', () => {
    const sim = new Sim(wall(1.6));
    run(sim, 4, { x: 1 });
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.x).toBeLessThan(3);
  });

  it('out of reach from the ground is reached with a jump', () => {
    const sim = new Sim(wall(1.6));
    until(sim, 3, { x: 1 }, () => sim.curr.x > 2.2);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    run(sim, 1.5, { x: 1, hopHeld: true });
    expect(sim.curr.y).toBeCloseTo(1.6, 1);
    expect(sim.curr.x).toBeGreaterThan(3 + ELOF_HALF_WIDTH);
    expect(sim.curr.grounded).toBe(true);
  });

  it('is not grabbed when he walks away from it', () => {
    const sim = new Sim({ ...wall(1.3), spawn: { x: 2.7, y: 0.01 } });
    run(sim, 1, { x: -WALK_DEFLECTION });
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.x).toBeLessThan(2.7 - WALK_SPEED * 0.6);
  });
});

describe('a hose', () => {
  const hose: Climb = { x: 2.7, bottom: 0, top: 4, exit: 1 };
  const wall = course([{ x: -5, y: 0 }, { x: 3, y: 0 }, { x: 3, y: 4 }, { x: 20, y: 4 }], { x: 0, y: 0.01 }, [hose]);

  /** A fresh simulation with Elof on the hose, a little way up. */
  function onTheHose(): Sim {
    const sim = new Sim(wall);
    until(sim, 4, { x: 1 }, () => sim.curr.mode === 'climb');
    run(sim, 1, { x: 1 });
    return sim;
  }

  it('is taken hold of when he walks into it', () => {
    const sim = new Sim(wall);
    expect(until(sim, 4, { x: 1 }, () => sim.curr.mode === 'climb')).toBe(true);
    expect(sim.curr.x).toBeCloseTo(hose.x, 1);
  });

  it('is climbed by holding forward, at one EL a second', () => {
    const sim = onTheHose();
    const from = sim.curr.y;
    run(sim, 1, { x: 1 });
    expect(sim.curr.y - from).toBeCloseTo(CLIMB_SPEED, 1);
    expect(sim.curr.x).toBeCloseTo(hose.x, 2);
  });

  it('holds him when he does nothing', () => {
    const sim = onTheHose();
    const from = sim.curr.y;
    run(sim, 2);
    expect(sim.curr.y).toBeCloseTo(from, 3);
    expect(sim.curr.mode).toBe('climb');
  });

  it('is climbed down by pushing down, and let go of at the ground', () => {
    const sim = onTheHose();
    run(sim, 3, { y: -1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.grounded).toBe(true);
  });

  it('is jumped off with Hoppa', () => {
    const sim = onTheHose();
    const from = sim.curr.y;
    sim.step({ ...idle, x: -1, hop: true, hopHeld: true });
    expect(sim.curr.mode).toBe('free');
    run(sim, 0.2, { x: -1, hopHeld: true });
    expect(sim.curr.x).toBeLessThan(hose.x - 0.3);
    expect(sim.curr.y).toBeGreaterThan(from + 0.4);
  });

  it('leads onto the ledge at its top', () => {
    const sim = new Sim(wall);
    run(sim, 8, { x: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(4, 1);
    expect(sim.curr.x).toBeGreaterThan(3 + ELOF_HALF_WIDTH);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.bubbles).toBe(0);
  });
});

describe('a hose below him', () => {
  const hose: Climb = { x: 0.3, bottom: 0, top: 6, exit: -1 };
  const cliff = course([{ x: -8, y: 6 }, { x: 0, y: 6 }, { x: 0, y: 0 }, { x: 20, y: 0 }], { x: -5, y: 6.01 }, [hose]);

  it('is not offered far from its top', () => {
    const sim = new Sim(cliff);
    run(sim, 0.5);
    expect(sim.curr.verb).toBeNull();
  });

  it('is offered at its top, where walking stops at the edge', () => {
    const sim = new Sim(cliff);
    run(sim, 8, { x: WALK_DEFLECTION });
    expect(sim.curr.atEdge).toBe(true);
    expect(sim.curr.verb).toBe('slide');
    expect(sim.curr.y).toBeCloseTo(6, 1);
  });

  it('is slid down in a second with Använd, and he stands at the bottom', () => {
    const sim = new Sim(cliff);
    run(sim, 8, { x: WALK_DEFLECTION });
    const steps = sim.steps;
    sim.step({ ...idle, act: true });
    expect(sim.curr.mode).toBe('slide');
    expect(until(sim, 3, {}, () => sim.curr.mode === 'free' && sim.curr.grounded)).toBe(true);
    expect((sim.steps - steps) * STEP).toBeLessThan(SLIDE_TIME + 0.15);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.x).toBeCloseTo(hose.x, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('keeps the camera on him all the way down', () => {
    const sim = new Sim(cliff);
    run(sim, 8, { x: WALK_DEFLECTION });
    sim.step({ ...idle, act: true });
    until(sim, 3, {}, () => sim.curr.mode === 'slide' && sim.curr.t > 0.6);
    const look = cameraIntent(sim.curr);
    expect(look.y).toBeLessThan(sim.curr.y);
    expect(look.y).toBeGreaterThan(sim.curr.y - 2);
  });

  it('is not taken hold of again the moment he lands', () => {
    const sim = new Sim(cliff);
    run(sim, 8, { x: WALK_DEFLECTION });
    sim.step({ ...idle, act: true });
    until(sim, 3, { x: 1 }, () => sim.curr.mode === 'free' && sim.curr.grounded);
    run(sim, 1, { x: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeGreaterThan(2);
  });
});

describe('a camera zone', () => {
  const flat = course([{ x: -5, y: 0 }, { x: 40, y: 0 }]);

  it('widens and lifts the picture while he is in it, and nowhere else', () => {
    const zones = [{ from: 4, to: 9, zoom: 1.3, lift: 0.5, lead: 1 }];
    const sim = new Sim(flat);
    run(sim, 0.3);
    expect(cameraIntent(sim.curr, zones)).toEqual({ x: sim.curr.x + 2.5, y: sim.curr.groundY, zoom: 1 });
    until(sim, 4, { x: 1 }, () => sim.curr.x > 5);
    const inside = cameraIntent(sim.curr, zones);
    expect(inside.zoom).toBe(1.3);
    expect(inside.y).toBeCloseTo(0.5, 5);
    expect(inside.x).toBeCloseTo(sim.curr.x + 1, 5);
    until(sim, 4, { x: 1 }, () => sim.curr.x > 10);
    expect(cameraIntent(sim.curr, zones).zoom).toBe(1);
  });
});
