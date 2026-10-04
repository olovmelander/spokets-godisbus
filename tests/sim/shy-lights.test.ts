import { describe, expect, it } from 'vitest';
import { myren } from '../../src/content/chapters/myren';
import { foundFlag } from '../../src/content/kinds';
import { BUBBLE_TIME, STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const tufts = myren.movers!.filter((mover) => mover.id.startsWith('shy-tuft:')).map((mover) => ({
  x: mover.stops[0]!.x, y: mover.stops[0]!.y + mover.height, width: mover.width,
}));
const prize = myren.hidden!.find((sweet) => sweet.route)!;
const found = foundFlag(prize.kind);
const pending = ['shy:1', 'shy:2', 'shy:3'];
const checkpoint = 7; // Firm ground beside the lollipop; optional progress adds no checkpoint.

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

function settle(sim: Sim, x: number): void {
  for (let i = 0; i < 150 && Math.abs(x - sim.curr.x) > 0.1; i++) {
    sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.6 });
  }
  run(sim, 0.25);
}

/** Plays onto successive high tussocks with real jumps; no teleports or fabricated completion flags. */
function follow(count = tufts.length, light = true, edgeMargin = 0.3): Sim {
  const sim = new Sim(myren, {}, { checkpoint, flags: light ? ['light'] : [] });
  run(sim, 0.3);
  for (const [i, tuft] of tufts.slice(0, count).entries()) {
    const previous = tufts[i - 1];
    const takeoff = previous ? previous.x + previous.width / 2 - edgeMargin : tuft.x - tuft.width / 2 - 0.8;
    for (let step = 0; step < 420 && sim.curr.x < takeoff; step++) sim.step({ ...idle, x: 1 });
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    let landed = false;
    for (let step = 0; step < 360; step++) {
      sim.step({ ...idle, x: 1, hopHeld: true });
      if (Math.abs(sim.curr.y - tuft.y) < 0.15 && sim.curr.grounded) {
        landed = true;
        break;
      }
      if (sim.bubbles > 0) break;
    }
    expect(landed, `tuft ${i + 1}, takeoff margin ${edgeMargin}`).toBe(true);
    settle(sim, tuft.x);
  }
  return sim;
}

describe('C3, the shy lights above the mist trail', () => {
  it('is optional: the ordinary tussocks bring the chick home without finding the challenge candy', () => {
    const sim = new Sim(myren, { easyJumps: true }, { checkpoint, flags: ['light'] });
    run(sim, 12, { x: 1 });
    expect(sim.curr.x).toBeGreaterThan(176);
    expect(sim.flags.has('home')).toBe(true);
    expect(sim.flags.has(found)).toBe(false);
    for (const flag of pending) expect(sim.flags.has(flag)).toBe(false);
    expect(sim.bubbles).toBe(0);
  });

  it('held jumps find the three lights in order, and the last leaves the existing album candy', () => {
    expect(prize.kind).toBe('lakritskonfekt');
    expect(prize.after).toBe('shy:3');
    for (const margin of [0.22, 0.3, 0.38]) {
      const sim = follow(tufts.length, true, margin);
      for (const flag of pending) expect(sim.flags.has(flag), `margin ${margin}, ${flag}`).toBe(true);
      expect(sim.flags.has(found)).toBe(true);
      expect(sim.checkpoint).toBe(checkpoint);
      expect(sim.bubbles).toBe(0);
      expect(sim.flags.has('goal')).toBe(false);
    }
  });

  it('the lollipop is needed, and visiting later lights first cannot skip the sequence or take its candy', () => {
    const dark = follow(tufts.length, false);
    for (const flag of pending) expect(dark.flags.has(flag)).toBe(false);
    expect(dark.flags.has(found)).toBe(false);
    // A route hint must not pretend that an unlit light is there.
    expect(hintFor(dark, myren)?.at).toEqual({ x: 142, y: 0 });

    for (const [x, y] of [[155.6, 4.9], [161.2, 3.7]]) {
      const late = new Sim({ ...myren, spawn: { x: x!, y: y! + 0.01 } }, {}, { flags: ['light'] });
      run(late, 0.4);
      for (const flag of pending) expect(late.flags.has(flag)).toBe(false);
      expect(late.flags.has(found)).toBe(false);
    }
  });

  it('leaving an unfinished game resets its lights and preserves ordinary progress', () => {
    const sim = follow(2);
    expect(sim.flags.has('shy:1')).toBe(true);
    const candy = sim.candyCount;
    for (let step = 0; step < 600 && !(sim.curr.x < 145 && sim.curr.grounded); step++) sim.step({ ...idle, x: -1 });
    expect(sim.curr.x).toBeLessThan(145);
    expect(sim.curr.y).toBeLessThan(1.55);
    for (const flag of pending) expect(sim.flags.has(flag)).toBe(false);
    expect(sim.flags.has('light')).toBe(true);
    expect(sim.flags.has(found)).toBe(false);
    expect(sim.candyCount).toBeGreaterThanOrEqual(candy);
    expect(sim.checkpoint).toBe(checkpoint);
  });

  it('Jag har fastnat and loading an unfinished save restart the lights beside the lollipop', () => {
    const sim = follow(2);
    expect(sim.flags.has('shy:1')).toBe(true);
    const reload = new Sim(myren, {}, { checkpoint: sim.checkpoint, flags: [...sim.flags], placed: sim.placed });
    for (const flag of pending) expect(reload.flags.has(flag)).toBe(false);
    expect(reload.flags.has('light')).toBe(true);
    expect(reload.curr.x).toBeCloseTo(139, 1);

    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.3);
    for (const flag of pending) expect(sim.flags.has(flag)).toBe(false);
    expect(sim.flags.has('light')).toBe(true);
    expect(sim.curr.x).toBeCloseTo(139, 1);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('after a missed gap clears the lights, the helper leads back to the first one for a playable retry', () => {
    const sim = follow(3);
    expect(sim.flags.has('shy:1')).toBe(true);
    // Run into the gap after the third tuft, then stop instead of reaching the next landing.
    for (let step = 0; step < 150 && sim.curr.x < 154.05; step++) sim.step({ ...idle, x: 1 });
    run(sim, BUBBLE_TIME + 0.8);
    expect(sim.bubbles).toBe(1);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(4.5, 1);
    for (const flag of pending) expect(sim.flags.has(flag)).toBe(false);
    expect(hintFor(sim, myren)?.at).toEqual({ x: 150, y: 3.8 });

    // Following that backward hint reaches the first light again; no reload or debug movement is needed.
    for (let step = 0; step < 300; step++) {
      sim.step({ ...idle, x: -1 });
      if (sim.curr.grounded && Math.abs(sim.curr.y - 3.8) < 0.1) break;
    }
    settle(sim, 150);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(3.8, 1);
    expect(sim.flags.has('shy:1')).toBe(true);
    expect(sim.flags.has('shy:2')).toBe(false);
    expect(sim.flags.has(found)).toBe(false);
    expect(sim.bubbles).toBe(1);
  });

  it('steps down to the lower trail after the last light and keeps the prize through reset and reload', () => {
    const sim = follow();
    // No jump is needed on the return: the drop to the firm tussock is less than the bubble's fall limit.
    for (let step = 0; step < 300 && sim.curr.y > 0.2; step++) sim.step({ ...idle, x: 1 });
    settle(sim, 164.7);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0.1, 1);
    expect(sim.bubbles).toBe(0);
    expect(sim.flags.has(found)).toBe(true);
    for (const flag of pending) expect(sim.flags.has(flag)).toBe(true);

    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.3);
    expect(sim.flags.has(found)).toBe(true);
    const reload = new Sim(myren, {}, { checkpoint: sim.checkpoint, flags: [...sim.flags], placed: sim.placed });
    expect(reload.flags.has(found)).toBe(true);
    for (const flag of pending) expect(reload.flags.has(flag)).toBe(true);
    expect(reload.curr.x).toBeCloseTo(139, 1);
  });

  it('the challenge rejoins the chick so the normal trail still leads to its family and the crane flight', () => {
    const sim = follow();
    for (let step = 0; step < 300 && sim.curr.y > 0.2; step++) sim.step({ ...idle, x: 1 });
    settle(sim, 164.7);
    expect(sim.flags.has('chick')).toBe(true);
    // The same supported assisted hops can be enabled after any challenge, without moving the player.
    sim.options.easyJumps = true;
    for (let step = 0; step < 20 / STEP && !sim.flags.has('goal'); step++) {
      sim.step({ ...idle, x: 1, act: sim.curr.verb === 'take' && sim.curr.word === 'climbOn' });
    }
    expect([...sim.flags]).toEqual(expect.arrayContaining(['chick', 'home', 'crane', 'goal', found]));
    expect(sim.bubbles).toBe(0);
  });
});
