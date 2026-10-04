import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { foundFlag } from '../../src/content/kinds';
import { BUBBLE_TIME, LEDGE_REACH, STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const shelves = berget.movers!.filter((mover) => mover.id.startsWith('cairn:')).map((mover) => ({
  x: mover.stops[0]!.x, y: mover.stops[0]!.y + mover.height, width: mover.width,
}));
const prize = berget.hidden!.find((sweet) => sweet.route)!;
const found = foundFlag(prize.kind);
const lastCheckpoint = berget.checkpoints!.length - 1;

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** Walking to the centre also leaves room to turn and make the next running jump. */
function settle(sim: Sim, x: number): void {
  for (let i = 0; i < 150 && Math.abs(x - sim.curr.x) > 0.1; i++) {
    sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.6 });
  }
  run(sim, 0.25);
}

/** Plays from the pine's existing checkpoint: ordinary movement, held jumps and automatic ledge grabs. */
function climb(edgeMargin = 0.3): Sim {
  const sim = new Sim(berget, {}, { checkpoint: lastCheckpoint, flags: ['lift', 'memory'] });
  run(sim, 0.3);
  for (const [i, target] of shelves.entries()) {
    const dir = Math.sign(target.x - sim.curr.x);
    const previous = shelves[i - 1];
    const takeoff = previous
      ? previous.x + dir * (previous.width / 2 - edgeMargin)
      : target.x - dir * (target.width / 2 + 0.8);
    for (let step = 0; step < 360 && dir * (takeoff - sim.curr.x) > 0; step++) sim.step({ ...idle, x: dir });
    sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
    let landed = false;
    for (let step = 0; step < 360; step++) {
      sim.step({ ...idle, x: dir, hopHeld: true });
      if (Math.abs(sim.curr.y - target.y) < 0.1 && sim.curr.grounded) {
        landed = true;
        break;
      }
      if (sim.bubbles > 0) break;
    }
    expect(landed, `shelf ${i + 1}, takeoff margin ${edgeMargin}`).toBe(true);
    settle(sim, target.x);
  }
  return sim;
}

describe('C4, Toppröset above the old pine', () => {
  it('requires an intentional jump from the ordinary path, and stays before the chapter exit', () => {
    expect(shelves).toHaveLength(5);
    expect(shelves[0]!.y - berget.checkpoints![lastCheckpoint]!.y).toBeGreaterThan(LEDGE_REACH);
    for (const shelf of shelves) expect(shelf.x + shelf.width / 2).toBeLessThan(berget.goalX);
    expect(prize.kind).toBe('chokladpralin');
    expect(prize.y).toBeGreaterThan(shelves[shelves.length - 1]!.y);

    const ordinary = new Sim(berget, {}, { checkpoint: lastCheckpoint, flags: ['lift', 'memory'] });
    run(ordinary, 3, { x: 1 });
    expect(ordinary.flags.has('goal')).toBe(true);
    expect(ordinary.flags.has(found)).toBe(false);
    expect(ordinary.bubbles).toBe(0);
  });

  it('five held jumps and ledge grabs reach the candy across a forgiving takeoff window', () => {
    for (const margin of [0.22, 0.3, 0.38]) {
      const sim = climb(margin);
      expect(sim.flags.has(found), `margin ${margin}`).toBe(true);
      expect(sim.flags.has('goal')).toBe(false);
      expect(sim.bubbles).toBe(0);
      // Optional climbing never moves the durable save away from the main path.
      expect(sim.checkpoint).toBe(lastCheckpoint);
    }
  });

  it('the shelves lead back down to the pine, with no forced chapter exit', () => {
    const sim = climb();
    for (const target of shelves.slice(0, -1).reverse()) {
      expect(hintFor(sim, berget)?.at).toEqual({ x: target.x, y: target.y });
      const dir = Math.sign(target.x - sim.curr.x);
      let landed = false;
      for (let step = 0; step < 480; step++) {
        sim.step({ ...idle, x: dir });
        if (Math.abs(sim.curr.y - target.y) < 0.1 && sim.curr.grounded) {
          landed = true;
          break;
        }
        if (sim.bubbles > 0) break;
      }
      expect(landed, `return shelf at ${target.y}`).toBe(true);
      settle(sim, target.x);
    }
    expect(hintFor(sim, berget)?.at).toEqual({ x: 150.6, y: 31.4 });
    // Step off the first shelf to the left, towards the pine and away from the chapter exit.
    for (let step = 0; step < 240 && sim.curr.y > 31.5; step++) sim.step({ ...idle, x: -1 });
    run(sim, 0.3);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(31.4, 1);
    expect(sim.bubbles).toBe(0);
    expect(sim.flags.has(found)).toBe(true);
    expect(sim.flags.has('goal')).toBe(false);
    run(sim, 3, { x: 1 });
    expect(sim.flags.has('goal')).toBe(true);
  });

  it('a missed landing costs nothing, and the bubble returns to a stable shelf', () => {
    const sim = climb();
    for (let step = 0; step < 360 && sim.bubbles === 0; step++) sim.step({ ...idle, x: -1 });
    expect(sim.bubbles).toBe(1);
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(shelves[shelves.length - 1]!.y, 1);
    expect(sim.flags.has(found)).toBe(true);
    expect(sim.flags.has('goal')).toBe(false);
  });

  it('a full running jump to the right cannot end the chapter before landing or a safe bubble return', () => {
    for (const shelf of shelves) {
      const sim = new Sim({ ...berget, spawn: { x: shelf.x - shelf.width / 2 + 0.25, y: shelf.y + 0.01 } }, {}, {
        flags: ['lift', 'memory'],
      });
      run(sim, 0.3);
      const takeoff = shelf.x + shelf.width / 2 - 0.22;
      for (let step = 0; step < 180 && sim.curr.x < takeoff; step++) sim.step({ ...idle, x: 1 });
      sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
      let recovered = false;
      for (let step = 0; step < 360; step++) {
        sim.step({ ...idle, x: 1, hopHeld: true });
        expect(sim.flags.has('goal'), `jump from shelf ${shelf.x}, ${shelf.y}`).toBe(false);
        if (sim.curr.grounded || sim.curr.mode === 'bubble') {
          recovered = true;
          break;
        }
      }
      expect(recovered, `jump from shelf at ${shelf.y}`).toBe(true);
      if (sim.curr.mode === 'bubble') {
        run(sim, BUBBLE_TIME + 0.3);
        expect(sim.curr.grounded).toBe(true);
        expect(sim.flags.has('goal')).toBe(false);
      }
    }
  });

  it('Jag har fastnat and a saved reload keep the reward and resume beside the pine', () => {
    const sim = climb();
    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.curr.x).toBeCloseTo(149, 1);
    expect(sim.curr.y).toBeCloseTo(31.4, 1);
    expect(sim.flags.has(found)).toBe(true);

    const resumed = new Sim(berget, {}, {
      checkpoint: sim.checkpoint,
      flags: [...sim.flags],
      collected: sim.collected.flatMap((collected, index) => collected ? [index] : []),
      placed: sim.placed,
    });
    run(resumed, 0.3);
    expect(resumed.curr.x).toBeCloseTo(149, 1);
    expect(resumed.curr.y).toBeCloseTo(31.4, 1);
    expect(resumed.flags.has(found)).toBe(true);
    expect(resumed.flags.has('goal')).toBe(false);
  });
});
