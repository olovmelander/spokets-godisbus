import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { BUBBLE_TIME, STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const run = (sim: Sim, seconds: number, input: Partial<StepInput> = {}) => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
};
const route = ['ant-column-0', 'ant-column-1', 'ant-column-2', 'anthill-rest', 'ant-column-3', 'ant-column-4', 'ant-column-5', 'anthill-top'];
const start = () => new Sim(granskog, {}, { checkpoint: 2, flags: ['berry', 'jay'], placed: ['twig'] });
function settle(sim: Sim, x: number): void {
  for (let i = 0; i < 150 && Math.abs(x - sim.curr.x) > 0.1; i++) sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.6 });
  run(sim, 0.25);
}
function climb(wait = 0): Sim {
  const sim = start();
  run(sim, 0.3 + wait);
  let previous: typeof sim.movers[number] | undefined;
  for (const id of route) {
    const target = sim.movers.find((m) => m.def.id === id)!;
    const takeoff = previous ? previous.x + previous.def.width / 2 - 0.3 : target.x - target.def.width / 2 - 0.8;
    for (let i = 0; i < 240 && sim.curr.x < takeoff; i++) sim.step({ ...idle, x: 1 });
    const jump = target.y + target.def.height - sim.curr.y > 0.7;
    sim.step({ ...idle, x: 1, hop: jump, hopHeld: jump });
    let landed = false;
    for (let i = 0; i < 360; i++) {
      sim.step({ ...idle, x: 1, hopHeld: true });
      if (sim.curr.grounded && Math.abs(sim.curr.y - target.y - target.def.height) < 0.1 && Math.abs(sim.curr.x - target.x) < target.def.width / 2 + 0.1) { landed = true; break; }
      if (sim.bubbles > 0) break;
    }
    expect(landed, `${id}, wait ${wait}, at ${JSON.stringify(sim.curr)}`).toBe(true);
    settle(sim, target.x);
    previous = target;
  }
  return sim;
}

describe('C2, Myrstacken', () => {
  it('moving columns can be climbed at different phases, with a firm rest halfway up', () => {
    for (const wait of [0, 1.2, 2.4, 3.6]) {
      const sim = climb(wait);
      expect(sim.flags.has('found:chokladkola')).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sim.checkpoint).toBe(2);
      expect(sim.placed).toEqual(['twig']);
    }
  });

  it('carries standing feet up and down without drifting or suppressing a jump', () => {
    const column = granskog.movers!.find((m) => m.id === 'ant-column-0')!;
    const sim = new Sim({ ...granskog, spawn: { x: 48, y: column.stops[0]!.y + column.height + 0.02 } });
    run(sim, 0.2);
    let top = 0;
    let low = Infinity;
    for (let i = 0; i < 1200; i++) {
      sim.step(idle);
      const mover = sim.movers.find((m) => m.def.id === column.id)!;
      expect(sim.curr.y).toBeCloseTo(mover.y + column.height, 1);
      expect(sim.curr.x).toBeCloseTo(48, 3);
      top = Math.max(top, sim.curr.y); low = Math.min(low, sim.curr.y);
    }
    expect(top - low).toBeGreaterThan(0.6);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.1, { hopHeld: true });
    expect(sim.curr.grounded).toBe(false);
    expect(sim.curr.vy).toBeGreaterThan(0);
    expect(sim.bubbles).toBe(0);
  });

  it('the helper has three stable hints on a moving column, and ordinary hints stay on the trail', () => {
    const sim = new Sim({ ...granskog, spawn: { x: 48, y: 5.57 } }, {}, { flags: ['berry', 'jay'], placed: ['twig'] });
    run(sim, 0.3);
    for (const step of [1, 2, 3]) {
      sim.step({ ...idle, help: true });
      expect(sim.help.step).toBe(step);
      expect(sim.help.at).toEqual({ x: 50.3, y: 7.3 });
      run(sim, 0.2);
    }
    expect(hintFor(start(), granskog)?.at.y).toBeLessThan(5.4);
  });

  it('the ordinary ant ride and hilltop jumps never invite him into the optional route', () => {
    const sim = new Sim({ ...granskog, spawn: { x: 58.6, y: 4.01 } }, {}, { flags: ['berry', 'jay'], placed: ['twig'] });
    run(sim, 0.2);
    sim.step({ ...idle, act: true });
    run(sim, 3.5);
    expect(sim.curr.x).toBeCloseTo(61.6, 1);
    expect(sim.curr.y).toBeCloseTo(10, 1);
    expect(hintFor(sim, granskog)?.at.y).toBeLessThan(12);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.2, { hopHeld: true });
    expect(hintFor(sim, granskog)?.at.y).toBeLessThan(12);
  });

  it('the root returns to the regular hilltop and completed candy survives reset/reload', () => {
    const sim = climb();
    for (let i = 0; i < 180 && sim.curr.verb !== 'slide'; i++) sim.step({ ...idle, x: 0.6 });
    expect(sim.curr.verb).toBe('slide');
    sim.step({ ...idle, act: true });
    run(sim, 3);
    expect(sim.curr.y).toBeCloseTo(10, 1);
    expect(sim.bubbles).toBe(0);
    expect(sim.flags.has('found:chokladkola')).toBe(true);
    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.3);
    const resumed = new Sim(granskog, {}, { checkpoint: sim.checkpoint, flags: [...sim.flags], placed: sim.placed });
    expect(resumed.flags.has('found:chokladkola')).toBe(true);
    expect(resumed.placed).toEqual(['twig']);
  });

  it('a missed long jump bubbles back to firm ground with all collected candy', () => {
    const sim = new Sim({ ...granskog, spawn: { x: 62, y: 14.01 } }, {}, { flags: ['berry', 'jay'], placed: ['twig'], collected: [0, 1] });
    run(sim, 0.7);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    for (let i = 0; i < 720 && sim.bubbles === 0; i++) sim.step({ ...idle, x: 1, hopHeld: true });
    expect(sim.bubbles).toBe(1);
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(14, 1);
    expect(sim.collected.slice(0, 2)).toEqual([true, true]);
  });
});
