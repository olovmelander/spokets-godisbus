import { describe, expect, it } from 'vitest';
import { cameraIntent } from '../../src/sim/camera-intent';
import { BUBBLE_TIME, ELOF_HALF_WIDTH, FALL_LIMIT, RUN_SPEED, SAFE_AFTER, STEP, WALK_DEFLECTION } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** High ground on the left that ends at x = 0, with lower ground `drop` EL below it. */
function cliff(drop: number, candy: ChapterData['candy'] = [], spawnX = -5): ChapterData {
  return {
    id: 'cliff',
    spawn: { x: spawnX, y: drop + 0.01 },
    goalX: 1000,
    ground: [{ x: -40, y: drop + 8 }, { x: -40, y: drop }, { x: 0, y: drop }, { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: drop + 8 }],
    candy,
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

describe('the glitter bubble', () => {
  it('catches him in the air when he has fallen more than four EL', () => {
    const sim = new Sim(cliff(7));
    expect(until(sim, 5, { x: 1 }, () => sim.bubbles === 1)).toBe(true);
    // Caught on the way down: he never reached the ground seven EL below.
    expect(sim.curr.y).toBeLessThan(7 - FALL_LIMIT + 0.2);
    expect(sim.curr.y).toBeGreaterThan(1);
  });

  it('floats him back to where he stood half a second before he left the ground, in about a second', () => {
    const sim = new Sim(cliff(7));
    until(sim, 5, { x: 1 }, () => sim.bubbles === 1);
    const steps = sim.steps;
    expect(until(sim, 3, {}, () => sim.curr.bubble === 0 && sim.curr.grounded)).toBe(true);
    expect((sim.steps - steps) * STEP).toBeLessThan(BUBBLE_TIME + 0.2);
    // His last step on solid ground was a half-width before the edge, and half a second of running lies
    // about 1.75 EL before that.
    const expected = -ELOF_HALF_WIDTH - RUN_SPEED * SAFE_AFTER;
    expect(sim.curr.x).toBeGreaterThan(expected - 0.4);
    expect(sim.curr.x).toBeLessThan(expected + 0.4);
    expect(sim.curr.y).toBeCloseTo(7, 1);
    run(sim, 0.5);
    expect(sim.curr.vx).toBe(0);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.bubbles).toBe(1);
  });

  it('does not carry a child who hops along far back', () => {
    const sim = new Sim(cliff(7, [], -30));
    // Thirty EL of hopping: on the ground for a moment, in the air for longer, again and again.
    for (let i = 0; sim.bubbles === 0 && i < 30 / STEP; i++) {
      sim.step({ ...idle, x: 1, hopHeld: true, hop: i % Math.round(0.45 / STEP) === 0 });
    }
    expect(sim.bubbles).toBe(1);
    until(sim, 3, {}, () => sim.curr.bubble === 0 && sim.curr.grounded);
    // Back to his last landing, which is within one jump of the edge.
    expect(sim.curr.x).toBeGreaterThan(-3);
    expect(sim.curr.x).toBeLessThan(-ELOF_HALF_WIDTH + 0.01);
    expect(sim.curr.y).toBeCloseTo(7, 1);
  });

  it('does not put him back on a corner he only clipped on the way down', () => {
    // A gap just too wide for a standing jump: he clips the far corner and falls on.
    const gap: ChapterData = {
      id: 'gap',
      spawn: { x: -3, y: 0.01 },
      goalX: 1000,
      ground: [{ x: -12, y: 8 }, { x: -12, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -9 }, { x: 1.3, y: -9 }, { x: 1.3, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 8 }],
      candy: [],
    };
    for (const from of [-0.9, -0.7, -0.5, -0.3]) {
      const sim = new Sim({ ...gap, spawn: { x: from, y: 0.01 } });
      run(sim, 0.7);
      // Walking speed and a tap: a short hop into the gap.
      run(sim, 0.05, { x: WALK_DEFLECTION, hop: true });
      until(sim, 4, { x: WALK_DEFLECTION }, () => sim.bubbles > 0 || sim.curr.x > 2);
      if (sim.bubbles === 0) continue;
      until(sim, 3, {}, () => sim.curr.bubble === 0 && sim.curr.grounded);
      run(sim, 1);
      // Wherever it put him, he stands there: no second bubble.
      expect(sim.bubbles, `from ${from}`).toBe(1);
      expect(sim.curr.grounded, `from ${from}`).toBe(true);
      expect(sim.curr.y, `from ${from}`).toBeCloseTo(0, 1);
    }
  });

  it('does not listen to the stick while it carries him', () => {
    const sim = new Sim(cliff(7));
    until(sim, 5, { x: 1 }, () => sim.bubbles === 1);
    const from = sim.curr.x;
    // Pushing on towards the drop all the way: he still goes back.
    until(sim, 3, { x: 1, hop: true, hopHeld: true }, () => sim.curr.bubble === 0);
    expect(sim.curr.x).toBeLessThan(from - 1);
    expect(sim.curr.x).toBeLessThan(0);
  });

  it('takes nothing from the bag', () => {
    const sim = new Sim(cliff(7, [{ x: -3, y: 7.45 }, { x: -1, y: 7.45 }]));
    until(sim, 5, { x: 1 }, () => sim.bubbles === 1);
    expect(sim.candyCount).toBe(2);
    until(sim, 3, {}, () => sim.curr.bubble === 0 && sim.curr.grounded);
    expect(sim.candyCount).toBe(2);
    expect(sim.collected).toEqual([true, true]);
  });

  it('leaves a shorter fall alone: that is just a landing', () => {
    const sim = new Sim(cliff(3.5));
    run(sim, 4, { x: 1 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.x).toBeGreaterThan(2);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.grounded).toBe(true);
  });
});

describe('an edge with a long drop', () => {
  it('stops him when he walks to it', () => {
    const sim = new Sim(cliff(7));
    run(sim, 8, { x: WALK_DEFLECTION });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.atEdge).toBe(true);
    expect(sim.curr.vx).toBe(0);
    expect(sim.curr.y).toBeCloseTo(7, 1);
    // Close to the edge, and wholly on the ground.
    expect(sim.curr.x).toBeGreaterThan(-0.6);
    expect(sim.curr.x).toBeLessThan(-ELOF_HALF_WIDTH);
  });

  it('does not let him run off it from a standstill at the edge either', () => {
    const sim = new Sim(cliff(7));
    run(sim, 8, { x: WALK_DEFLECTION });
    run(sim, 2, { x: 1 });
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.y).toBeCloseTo(7, 1);
  });

  it('lets him turn round and walk away', () => {
    const sim = new Sim(cliff(7));
    run(sim, 8, { x: WALK_DEFLECTION });
    const at = sim.curr.x;
    run(sim, 1, { x: -WALK_DEFLECTION });
    expect(sim.curr.x).toBeLessThan(at - 0.8);
    expect(sim.curr.atEdge).toBe(false);
  });

  it('lets him walk off a drop he can land', () => {
    const sim = new Sim(cliff(3.5));
    run(sim, 8, { x: WALK_DEFLECTION });
    expect(sim.curr.x).toBeGreaterThan(1);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.bubbles).toBe(0);
  });
});

describe('the camera over a chasm', () => {
  it('keeps looking at the ground he jumped from, not at the bottom', () => {
    const sim = new Sim(cliff(7));
    until(sim, 5, { x: 1 }, () => !sim.curr.grounded && sim.curr.x > 0.5);
    // In the air past the edge, with seven EL of nothing below him.
    expect(sim.curr.y - sim.curr.groundY).toBeGreaterThan(FALL_LIMIT);
    expect(cameraIntent(sim.curr).y).toBeGreaterThan(6);
  });
});
