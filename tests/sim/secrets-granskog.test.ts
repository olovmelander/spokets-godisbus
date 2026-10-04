import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { foundFlag } from '../../src/content/kinds';
import { BUBBLE_TIME } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Hook, Ledge } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { jump, leap, run, runPast, swingAlong, walkTo } from './drive';

// The sweets of Granskogen that are reached by a way of their own (docs/level-design.md): each is played here
// from the trail, and neither is found by a jump from the ground under it.

const [barkA, barkB, near, far, , plate1, plate2, plate3, plate4, nest] = granskog.ledges! as [Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge];
const ring = granskog.hooks![0] as Hook;
const sweet = (kind: string) => granskog.hidden!.find((h) => h.kind === kind)!;
const has = (sim: Sim, kind: string) => sim.flags.has(foundFlag(kind));
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.16;

/** Up onto the next ledge: straight up where it lies over him, otherwise a standing leap of about 1.4 EL. */
function climbOnto(sim: Sim, from: Ledge, to: Ledge): void {
  const under = Math.min(right(from), right(to)) - Math.max(left(from), left(to));
  if (under >= 0.4) {
    walkTo(sim, (Math.min(right(from), right(to)) + Math.max(left(from), left(to))) / 2);
    jump(sim);
  } else {
    const dir = to.x > from.x ? 1 : -1;
    walkTo(sim, to.x - dir * 1.4);
    jump(sim, dir);
  }
  expect(on(sim, to), `the ledge at ${to.x}, ${to.y}: he is at ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
}

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
    walkTo(sim, barkA.x);
    jump(sim);
    expect(on(sim, barkA)).toBe(true);
    climbOnto(sim, barkA, barkB);
    climbOnto(sim, barkB, near);
    expect(has(sim, 'gummiorm')).toBe(false);
    walkTo(sim, right(near) - 0.2);
    expect(swingAlong(sim, 1, 1)).toEqual([ring.x]);
    expect(on(sim, far), `the far bough: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    walkTo(sim, orm.x);
    expect(has(sim, 'gummiorm')).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('is not found without the ring: a jump from the near bough falls short, and the trail passes under it', () => {
    const jumped = new Sim({ ...granskog, spawn: { x: left(near) + 0.2, y: near.y + 0.01 } });
    run(jumped, 0.3);
    leap(jumped, 1, right(near) - 0.05);
    run(jumped, BUBBLE_TIME + 0.5);
    expect(has(jumped, 'gummiorm')).toBe(false);
    expect(on(jumped, near)).toBe(true);

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
    walkTo(sim, plate1.x);
    expect(sim.curr.y).toBeCloseTo(-8, 1);
    jump(sim);
    expect(on(sim, plate1)).toBe(true);
    const trunk = [plate1, plate2, plate3, plate4];
    for (let i = 1; i < trunk.length; i++) climbOnto(sim, trunk[i - 1]!, trunk[i]!);
    // Not from the highest plate: only in the nest itself.
    expect(has(sim, 'colaflaska')).toBe(false);
    climbOnto(sim, plate4, nest);
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
