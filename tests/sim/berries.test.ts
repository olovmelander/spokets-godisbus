import { describe, expect, it } from 'vitest';
import { cuesFor, newCueMemory, type Heard } from '../../src/audio/cues';
import { myren } from '../../src/content/chapters/myren';
import { BERRY_HEIGHT, FALL_LIMIT, JUMP_APEX, RUN_SPEED, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

// O7, Tranbärsstuds (plan §4.8): cranberries bounce like trampolines. A toy: nothing needs them.

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Level ground with one cranberry on it. */
const lawn: ChapterData = {
  id: 'lawn',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 10 }, { x: -10, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 10 }],
  candy: [{ x: -5, y: 0.45 }],
  bouncers: [{ x: 4, y: BERRY_HEIGHT, lift: 2.2 }],
};

/** Runs for `seconds`, and tells the highest his feet came. */
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): number {
  let top = -Infinity;
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    sim.step({ ...idle, ...input });
    top = Math.max(top, sim.curr.y);
  }
  return top;
}

/** He starts in the air over the berry, and comes down on it. */
const dropOn = (chapter: ChapterData, held: boolean) => {
  const berry = chapter.bouncers![0]!;
  const sim = new Sim({ ...chapter, spawn: { x: berry.x, y: berry.y + 0.8 } });
  const top = run(sim, 0.25, { hopHeld: held }) && run(sim, 1.2, { hopHeld: held });
  return { sim, top };
};

describe('the cranberries', () => {
  it('coming down on one sends him up, twice as high as he jumps', () => {
    const { sim, top } = dropOn(lawn, false);
    // Standing still over it he goes on bouncing, as on a trampoline.
    expect(sim.bounces).toBeGreaterThanOrEqual(1);
    expect(top).toBeGreaterThan(BERRY_HEIGHT + 2.2 - 0.15);
    expect(top).toBeLessThan(BERRY_HEIGHT + 2.2 + 0.15);
    expect(2.2).toBeGreaterThanOrEqual(2 * JUMP_APEX);
  });

  it('the bounce is the same whether Hoppa is held or not', () => {
    const tapped = dropOn(lawn, false).top;
    const held = dropOn(lawn, true).top;
    expect(Math.abs(tapped - held)).toBeLessThan(0.05);
  });

  it('walking into one does nothing: he goes on along the ground', () => {
    const sim = new Sim(lawn);
    const top = run(sim, 3, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(6);
    expect(sim.bounces).toBe(0);
    expect(top).toBeLessThan(0.1);
  });

  it('a jump onto one bounces him, and he lands on his feet: no glitter bubble', () => {
    // A running jump from 2.2 EL before it comes down on it.
    const sim = new Sim({ ...lawn, spawn: { x: 0.6, y: 0.01 } });
    run(sim, 0.45, { x: 1 });
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    const top = run(sim, 2.5, { x: 1, hopHeld: true });
    expect(sim.bounces).toBe(1);
    expect(top).toBeGreaterThan(2.2);
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.grounded).toBe(true);
  });

  it('goes flat under him and springs back, and is heard', () => {
    expect(new Sim(lawn).berries[0]!.squash).toBe(0);
    const again = new Sim({ ...lawn, spawn: { x: 4, y: BERRY_HEIGHT + 0.8 } });
    let flat = 0;
    for (let i = 0; i < 0.5 / STEP; i++) {
      again.step(idle);
      flat = Math.max(flat, again.berries[0]!.squash);
    }
    expect(flat).toBeGreaterThan(0.9);
    const still: Heard = {
      time: 0, mode: 'free', grounded: false, x: 0, y: 1, vx: 0, vy: -3, candy: 0, checkpoint: -1, bubbles: 0, atGoal: false,
      moving: 0, shadows: [], drips: [], bounces: 0,
    };
    // A boing, and at the first bounce of a row he laughs.
    expect(cuesFor(still, { ...still, vy: 9, bounces: 1 }, newCueMemory())).toEqual([{ kind: 'bounce' }, { kind: 'giggle' }]);
  });

  it('in Myren there are two, on firm level ground, a running bounce apart, and never a way past anything', () => {
    const berries = myren.bouncers!;
    expect(berries).toHaveLength(2);
    for (const b of berries) {
      expect(heightAt(myren, b.x)).toBeCloseTo(b.y - BERRY_HEIGHT, 5);
      // Level for two EL either side: nothing to bounce up onto, and no water to bounce into from a standstill.
      for (const dx of [-2, -1, 1, 2]) expect(heightAt(myren, b.x + dx), `beside the berry at ${b.x}`).toBeCloseTo(b.y - BERRY_HEIGHT, 5);
      // From the top of a bounce he falls less than the glitter bubble's limit.
      expect(b.lift + BERRY_HEIGHT).toBeLessThan(FALL_LIMIT);
    }
    // At a run, the time in the air from one carries him to the other.
    const air = 2 * Math.sqrt((2 * berries[0]!.lift) / ((8 * JUMP_APEX * RUN_SPEED ** 2) / 2.2 ** 2));
    expect(Math.abs(berries[1]!.x - berries[0]!.x - RUN_SPEED * air)).toBeLessThan(0.3);
  });

  it('at a run he comes down on the second from the first, and lands before the water', () => {
    const first = myren.bouncers![0]!;
    const sim = new Sim({ ...myren, spawn: { x: first.x - 0.3, y: first.y + 0.8 } });
    for (let i = 0; i < 4 / STEP && !(sim.bounces === 2 && sim.curr.grounded); i++) sim.step({ ...idle, x: 1 });
    expect(sim.bounces).toBe(2);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.bubbles).toBe(0);
    // The firm ground ends at 10.
    expect(sim.curr.x).toBeLessThan(9.8);
  });
});
