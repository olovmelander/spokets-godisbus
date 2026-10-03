import { describe, expect, it } from 'vitest';
import { testbana } from '../../src/content/chapters/testbana';
import { CANDY_MAGNET, JUMP_APEX, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

const still: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Flat ground with the candy a test asks for. */
function flat(candy: ChapterData['candy']): ChapterData {
  return {
    id: 'flat',
    spawn: { x: 0, y: 0.01 },
    goalX: 50,
    ground: [{ x: -5, y: 5 }, { x: -5, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 5 }],
    candy,
  };
}

function run(sim: Sim, seconds: number, input: StepInput): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...input, hop: input.hop && i === 0 });
}

/** The ground's height at x, read from the chapter data. */
function heightAt(chapter: ChapterData, x: number): number {
  const g = chapter.ground;
  for (let i = 0; i < g.length - 1; i++) {
    const a = g[i]!;
    const b = g[i + 1]!;
    if (a.x !== b.x && x >= a.x && x < b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return Infinity;
}

describe('trail candy', () => {
  it('stays where it is while Elof is far away', () => {
    const sim = new Sim(flat([{ x: 3, y: 0.45 }]));
    run(sim, 1, still);
    expect(sim.candyCount).toBe(0);
    expect(sim.collected).toEqual([false]);
  });

  it('goes into the bag when he runs through it, once', () => {
    const sim = new Sim(flat([{ x: 3, y: 0.45 }]));
    run(sim, 2, { ...still, x: 1 });
    expect(sim.curr.x).toBeGreaterThan(4);
    expect(sim.candyCount).toBe(1);
    expect(sim.collected).toEqual([true]);
    // Back through the same place: the count stays.
    run(sim, 2, { ...still, x: -1 });
    expect(sim.candyCount).toBe(1);
  });

  it('forgives a near miss, but not a far one', () => {
    const near = new Sim(flat([{ x: 0, y: 0.5 + CANDY_MAGNET - 0.05 }]));
    run(near, 0.5, still);
    expect(near.candyCount).toBe(1);
    const far = new Sim(flat([{ x: 0, y: 0.5 + CANDY_MAGNET + 0.1 }]));
    run(far, 0.5, still);
    expect(far.candyCount).toBe(0);
  });

  it('above his head it takes a jump', () => {
    const sim = new Sim(flat([{ x: 0, y: 1.9 }]));
    run(sim, 0.5, still);
    expect(sim.candyCount).toBe(0);
    run(sim, 1, { ...still, hop: true, hopHeld: true });
    expect(sim.candyCount).toBe(1);
  });
});

describe("the test course's trail", () => {
  const candy = testbana.candy;

  it('shows the way: the next candy is never more than 3 EL on', () => {
    expect(candy[0]!.x - testbana.spawn.x).toBeLessThanOrEqual(3);
    for (let i = 1; i < candy.length; i++) {
      // Up or down a hose the trail stands on end, so "after" allows the same x.
      expect(candy[i]!.x, `candy ${i} lies after candy ${i - 1}`).toBeGreaterThanOrEqual(candy[i - 1]!.x);
      expect(Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y), `from candy ${i - 1} to ${i}`).toBeLessThanOrEqual(3);
    }
    expect(testbana.goalX - candy[candy.length - 1]!.x).toBeLessThanOrEqual(3);
  });

  it('has every candy over the ground and within a jump of it, or on a hose', () => {
    for (const [i, c] of candy.entries()) {
      if ((testbana.climbs ?? []).some((h) => Math.abs(h.x - c.x) < 0.5 && c.y > h.bottom && c.y < h.top + 0.6)) continue;
      // Along a swing: within the lace's length of its hook.
      if ((testbana.hooks ?? []).some((h) => Math.hypot(h.x - c.x, h.y - c.y) < h.length + 0.7)) continue;
      // A candy over a wall or a ditch belongs to the ground a jump takes off from: the highest within reach.
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(testbana, c.x + dx));
      const ground = Math.max(...around);
      const lowest = Math.min(...around);
      expect(c.y, `candy ${i} is not in the ground`).toBeGreaterThan(heightAt(testbana, c.x) + 0.15);
      expect(c.y, `candy ${i} can be reached`).toBeLessThanOrEqual(ground + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
      expect(c.y, `candy ${i} is not far below the path`).toBeGreaterThan(lowest);
    }
  });
});
