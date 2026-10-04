import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { foundFlag } from '../../src/content/kinds';
import { Sim } from '../../src/sim/sim';
import type { Hook, Ledge } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { jump, leap, run, runPast, swingAlong, walkTo } from './drive';

// The sweets of Granskogen that are reached by a way of their own (docs/level-design.md): each is played here
// from the trail, and neither is found by a jump from the ground under it.

const [plate, high, far, , bark1, bark2, bark3, nest] = granskog.ledges! as [Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge];
const ring = granskog.hooks![0] as Hook;
const sweet = (kind: string) => granskog.hidden!.find((h) => h.kind === kind)!;
const has = (sim: Sim, kind: string) => sim.flags.has(foundFlag(kind));
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.16;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)}`;

/** Under a sweet, on the ground there, having jumped as high as he can. */
function jumpUnder(kind: string): Sim {
  const at = sweet(kind);
  const sim = new Sim({ ...granskog, spawn: { x: at.x, y: heightAt(granskog, at.x) + 0.01 } });
  run(sim, 0.2);
  jump(sim);
  return sim;
}

describe('gummiorm, over the ring between the trunks', () => {
  const orm = sweet('gummiorm');

  it('lies at the end of the far bough, in sight from the trail and out of a jump\'s reach', () => {
    expect(orm.way).toBe('over the ring between the trunks');
    expect(orm.x).toBeGreaterThan(far.x);
    expect(orm.x).toBeLessThan(right(far));
    expect(orm.y - far.y).toBeCloseTo(0.55, 5);
    // The usual picture shows a little over 3 EL above the ground he walks on, on the smallest phone.
    expect(orm.y - heightAt(granskog, orm.x)).toBeLessThan(3.1);
    const sim = jumpUnder('gummiorm');
    expect(has(sim, 'gummiorm')).toBe(false);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('is found by climbing the bark from the big cone and swinging over on the ring', () => {
    const sim = new Sim(granskog, {}, { checkpoint: 0 });
    run(sim, 0.2);
    leap(sim, 1, 19);
    walkTo(sim, plate.x);
    jump(sim);
    expect(on(sim, plate), `the plate of bark: ${where(sim)}`).toBe(true);
    jump(sim, 1);
    expect(on(sim, high), `the high bough: ${where(sim)}`).toBe(true);
    expect(has(sim, 'gummiorm')).toBe(false);
    walkTo(sim, right(high) - 0.2);
    expect(swingAlong(sim, 1, 1)).toEqual([ring.x]);
    expect(on(sim, far), `the far bough: ${where(sim)}`).toBe(true);
    walkTo(sim, orm.x);
    expect(has(sim, 'gummiorm')).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('is not found without the ring: a jump from the high bough falls short, and the trail passes under it', () => {
    const jumped = new Sim({ ...granskog, spawn: { x: left(high) + 0.2, y: high.y + 0.01 } });
    run(jumped, 0.3);
    leap(jumped, 1, right(high) - 0.05);
    run(jumped, 0.3);
    expect(has(jumped, 'gummiorm')).toBe(false);
    expect(jumped.curr.y).toBeCloseTo(0, 1);

    const walked = new Sim(granskog, {}, { checkpoint: 0 });
    run(walked, 0.2);
    expect(runPast(walked, orm.x + 3)).toBe(true);
    expect(has(walked, 'gummiorm')).toBe(false);
  });
});

describe('colaflaska, up the bark to the nest', () => {
  const cola = sweet('colaflaska');

  it('lies in the nest, up a trunk off the line of travel, out of a jump\'s reach from the floor', () => {
    expect(cola.way).toBe('up the bark to the nest');
    expect(Math.abs(cola.x - nest.x)).toBeLessThan(nest.width / 2);
    expect(cola.y - nest.y).toBeCloseTo(0.55, 5);
    // Not more than 4 EL up: stepping out of the nest is a fall he lands.
    expect(nest.y - heightAt(granskog, nest.x)).toBeLessThan(4);
    expect(nest.y - heightAt(granskog, nest.x)).toBeGreaterThan(3.5);
    const sim = jumpUnder('colaflaska');
    expect(has(sim, 'colaflaska')).toBe(false);
    expect(sim.curr.y).toBeCloseTo(-8, 1);
  });

  it('is found by climbing the plates of bark from the forest floor after the log', () => {
    const sim = new Sim(granskog, {}, { checkpoint: 8 });
    run(sim, 0.2);
    leap(sim, 1, 131);
    runPast(sim, 137.6);
    walkTo(sim, bark1.x);
    expect(sim.curr.y).toBeCloseTo(-8, 1);
    jump(sim);
    expect(on(sim, bark1), `the lowest plate: ${where(sim)}`).toBe(true);
    jump(sim, 1);
    expect(on(sim, bark2), `the second plate: ${where(sim)}`).toBe(true);
    jump(sim, -1);
    expect(on(sim, bark3), `the third plate: ${where(sim)}`).toBe(true);
    // Not from the highest plate: only in the nest itself.
    expect(has(sim, 'colaflaska')).toBe(false);
    jump(sim, 1);
    expect(on(sim, nest), `the nest: ${where(sim)}`).toBe(true);
    walkTo(sim, cola.x);
    expect(has(sim, 'colaflaska')).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('is not found by following the trail under it', () => {
    const sim = new Sim(granskog, {}, { checkpoint: 8 });
    run(sim, 0.2);
    expect(runPast(sim, cola.x + 6)).toBe(true);
    expect(has(sim, 'colaflaska')).toBe(false);
    expect(sim.bubbles).toBe(0);
  });
});
