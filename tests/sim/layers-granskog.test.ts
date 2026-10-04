import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { trailShape } from '../../src/render/candy';
import { cameraIntent } from '../../src/sim/camera-intent';
import { BUBBLE_TIME, ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LACE_REACH, LEDGE_GIVE, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Hook, Ledge } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { angleOf, idle, jump, leap, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

// The first layers over Granskogen (docs/level-design.md): the boughs over the forest floor, with the forest's
// first ring, and the nest up a trunk after the log, with two rings in a row. Each is played here from the
// trail and back to it, on Äventyr.

const [barkA, barkB, near, far, step, plate1, plate2, plate3, plate4, nest, last] = granskog.ledges! as [Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge];
const [ring, first, second] = granskog.hooks! as [Hook, Hook, Hook];
/** Where each way's side candy lies, by x. */
const BOUGHS = { from: 20, to: 34 };
const NEST = { from: 138, to: 154 };
const berry = granskog.spots!.find((spot) => spot.id === 'berry')!;
const jay = granskog.spots!.find((spot) => spot.id === 'jay')!;
const lichen = granskog.climbs!.find((climb) => climb.look === 'lichen')!;
const memory = granskog.spots!.find((spot) => spot.id === 'memory')!;
const cap = granskog.spots!.find((spot) => spot.id === 'cap')!;

const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
/** Whether he stands on a ledge. Just landed, his feet are still a few hundredths over it. */
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.16;
/** Whether he stands on the ground the trail runs on. */
const onTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(granskog, sim.curr.x)) < 0.05;
const seconds = (sim: Sim) => sim.steps * STEP;

/**
 * Up onto the next ledge from the one he stands on. Where it lies over him he jumps straight up through it;
 * otherwise it is a standing leap, which the stick held towards it carries about 1.4 EL.
 */
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

/** From the first big candy along the trail onto the big cone, and up the bark to the bough the ring is thrown from. */
function upTheBoughs(): Sim {
  const sim = new Sim(granskog, {}, { checkpoint: 0 });
  run(sim, 0.2);
  leap(sim, 1, 19);
  // The cone's top is the trail's ground: its candy lies along it.
  expect(onTrail(sim), `on the cone: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
  walkTo(sim, barkA.x);
  jump(sim);
  expect(on(sim, barkA), `the first plate: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
  climbOnto(sim, barkA, barkB);
  climbOnto(sim, barkB, near);
  return sim;
}

/** From the big candy before the log along the trail, and up the bark into the nest. */
function upToTheNest(): Sim {
  const sim = new Sim(granskog, {}, { checkpoint: 8 });
  run(sim, 0.2);
  // Over the log, as the trail goes.
  leap(sim, 1, 131);
  runPast(sim, 137.6);
  walkTo(sim, plate1.x);
  expect(onTrail(sim), `under the first plate: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
  jump(sim);
  expect(on(sim, plate1), `the first plate: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
  // Right, left, right, and up into the nest.
  const trunk = [plate1, plate2, plate3, plate4, nest];
  for (let i = 1; i < trunk.length; i++) climbOnto(sim, trunk[i - 1]!, trunk[i]!);
  return sim;
}

/**
 * Swings from where he stands, letting go of every ring on the way up past `release` radians, and throwing
 * at the next ring in the air for as long as `rings` allows. Gives the highest his feet came after letting go.
 */
function swingFrom(sim: Sim, rings: number, release: number): { taken: number[]; top: number } {
  const taken: number[] = [];
  let was = sim.curr.mode;
  let top = -Infinity;
  for (let i = 0; i < 25 / STEP; i++) {
    const p = sim.curr;
    const input = { ...idle, x: 1 };
    if (p.mode === 'free' && p.verb === 'lace' && taken.length < rings) input.act = true;
    if (p.mode === 'swing' && p.hook) {
      if (was !== 'swing') taken.push(p.hook.x);
      if (p.vx > 0 && angleOf(sim) > release) input.hop = true;
    }
    was = p.mode;
    sim.step(input);
    if (taken.length > 0 && sim.curr.mode === 'free') top = Math.max(top, sim.curr.y);
    if (taken.length > 0 && sim.curr.mode === 'free' && sim.curr.grounded) break;
    if (sim.curr.mode === 'bubble') break;
  }
  run(sim, 0.2);
  return { taken, top };
}

describe('the boughs over the forest floor', () => {
  it('are entered from the big cone, swung across on the ring, and let out at the lingonberry', () => {
    const sim = upTheBoughs();
    const began = barkA.x;
    walkTo(sim, right(near) - 0.2);
    expect(sim.curr.verb).toBe('lace');
    expect(swingAlong(sim, 1, 1)).toEqual([ring.x]);
    expect(on(sim, far), `the far bough: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    // Back for the heart behind him, along the far bough to its end, down onto the step, and off its end to
    // the forest floor.
    walkTo(sim, left(far) + 0.8);
    walkTo(sim, right(far) - 0.3);
    walkTo(sim, right(far) + 0.3);
    run(sim, 0.5);
    expect(on(sim, step), `the step down: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    walkTo(sim, left(step) + 0.3);
    walkTo(sim, right(step) + 0.4);
    run(sim, 0.6);

    expect(onTrail(sim), `at the end: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sim.curr.x).toBeGreaterThan(began);
    expect(sideTaken(sim, BOUGHS.from, BOUGHS.to)).toEqual({ taken: 10, of: 10 });
    expect(sim.bubbles).toBe(0);
    // He comes down where the lingonberry grows: the jay's puzzle is ahead of him, and none of it is done.
    expect(sim.curr.verb).toBe('take');
    expect(sim.curr.word).toBe(berry.word);
    expect(sim.curr.x).toBeLessThan(jay.at.x);
    expect(sim.flags.has('berry')).toBe(false);
    expect(sim.flags.has('jay')).toBe(false);
    expect(seconds(sim)).toBeLessThan(40);
  });

  it('end long before the beard lichen, and nowhere near the ant road', () => {
    for (const ledge of [barkA, barkB, near, far, step]) {
      expect(right(ledge)).toBeLessThan(berry.at.x + 0.5);
      expect(ledge.y).toBeLessThan(lichen.top);
      // A fall from any of them is one he can land.
      expect(ledge.y - heightAt(granskog, right(ledge) + 0.5)).toBeLessThan(FALL_LIMIT);
    }
    expect(lichen.x - right(step)).toBeGreaterThan(10);
  });

  it('take the ring: the far bough is further than a running jump from the near one', () => {
    const sim = upTheBoughs();
    walkTo(sim, left(near) + 0.2);
    leap(sim, 1, right(near) - 0.05);
    // The jump falls short, from higher than he can land: the bubble sets him back on the bough he jumped
    // from, with the ring still to try.
    expect(sim.bubbles).toBe(1);
    run(sim, BUBBLE_TIME + 0.5);
    expect(on(sim, near), `after the jump: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    expect(sim.flags.has('found:gummiorm')).toBe(false);
    // Walking off its end is a soft landing on the trail.
    walkTo(sim, right(near) + 0.5);
    run(sim, 0.8);
    expect(onTrail(sim), `after the step off: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    expect(sim.bubbles).toBe(1);
  });

  it('forgive the hands: wherever he lets go on the way up, he lands on the far bough', () => {
    for (const from of [right(near) - 0.1, near.x, left(near) + 0.2]) {
      for (const release of [0.45, 0.6, 0.8, 0.95]) {
        const sim = new Sim({ ...granskog, spawn: { x: from, y: near.y + 0.01 } });
        run(sim, 0.3);
        const { taken, top } = swingFrom(sim, 1, release);
        expect(taken, `from ${from}, let go at ${release}`).toEqual([ring.x]);
        expect(on(sim, far), `from ${from}, let go at ${release}: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
        expect(sim.bubbles).toBe(0);
        // Never so high that a miss would have ended in the bubble.
        expect(top - heightAt(granskog, sim.curr.x)).toBeLessThan(FALL_LIMIT);
      }
    }
  });

  it('cannot be entered from their far end: the step down is too high to jump onto', () => {
    expect(step.y - heightAt(granskog, step.x)).toBeGreaterThan(JUMP_APEX + LEDGE_GIVE);
    const sim = new Sim({ ...granskog, spawn: { x: step.x, y: 0.01 } });
    run(sim, 0.2);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(0, 1);
  });

  it('are not found by following the trail: a walk under them takes none of their candy', () => {
    const sim = new Sim(granskog, {}, { checkpoint: 0 });
    run(sim, 0.2);
    // Running into the cone, his hands take its edge: the trail needs no jump here.
    expect(runPast(sim, berry.at.x + 2)).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    expect(sideTaken(sim, BOUGHS.from, BOUGHS.to)).toEqual({ taken: 0, of: 10 });
    expect(sim.collectedSide.some(Boolean)).toBe(false);
    expect(sim.flags.has('found:gummiorm')).toBe(false);
    // The trail's own candy along the stretch is his all the same.
    const under = granskog.candy.flatMap((candy, i) => (candy.x > 24 && candy.x < berry.at.x ? [i] : []));
    expect(under.length).toBeGreaterThan(3);
    for (const i of under) expect(sim.collected[i], `trail candy at ${granskog.candy[i]!.x}`).toBe(true);
  });
});

describe('the nest up the trunk, and the two rings from it', () => {
  it('are entered at the lowest plate of bark, swung along, and let out before Bertil is called', () => {
    const sim = upToTheNest();
    const began = plate1.x;
    walkTo(sim, right(nest) - 0.2);
    expect(sim.curr.verb).toBe('lace');
    expect(swingAlong(sim, 1, 2)).toEqual([first.x, second.x]);
    expect(on(sim, last), `the last bough: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    walkTo(sim, right(last) - 0.3);
    walkTo(sim, right(last) + 0.4);
    run(sim, 0.8);

    expect(onTrail(sim), `at the end: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
    expect(sim.curr.y).toBeCloseTo(-8, 1);
    expect(sim.curr.x).toBeGreaterThan(began);
    // On the floor before Bertil's sign, with the pool still ahead.
    expect(sim.curr.x).toBeLessThan(cap.at.x);
    expect(sim.flags.has('cap')).toBe(false);
    expect(sideTaken(sim, NEST.from, NEST.to)).toEqual({ taken: 12, of: 12 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim)).toBeLessThan(40);
  });

  it('hang the rings in a row: at one height, with one length of lace', () => {
    expect(second.y).toBe(first.y);
    expect(second.length).toBe(first.length);
    expect(second.x).toBeGreaterThan(first.x);
    // The second is within the lace's reach from where the first lets him go.
    expect(second.x - first.x).toBeLessThan(LACE_REACH + first.length * Math.sin(0.8));
  });

  it('forgive the hands: wherever he lets go on the way up, both rings carry him to the last bough', () => {
    for (const release of [0.5, 0.65, 0.8, 0.95]) {
      const sim = new Sim({ ...granskog, spawn: { x: right(nest) - 0.2, y: nest.y + 0.01 } });
      run(sim, 0.3);
      const { taken } = swingFrom(sim, 2, release);
      expect(taken, `let go at ${release}`).toEqual([first.x, second.x]);
      expect(on(sim, last), `let go at ${release}: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('a miss costs nothing: letting go of the first ring without a second throw lands on the trail', () => {
    for (const release of [0.5, 0.8, 1.05]) {
      const sim = new Sim({ ...granskog, spawn: { x: right(nest) - 0.2, y: nest.y + 0.01 } });
      run(sim, 0.3);
      const { taken } = swingFrom(sim, 1, release);
      expect(taken).toEqual([first.x]);
      expect(onTrail(sim), `let go at ${release}: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
      expect(sim.curr.x).toBeGreaterThan(right(nest));
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
    }
    // And so does walking out of the nest.
    const sim = new Sim({ ...granskog, spawn: { x: nest.x, y: nest.y + 0.01 } });
    run(sim, 0.3);
    walkTo(sim, right(nest) + 0.5);
    run(sim, 0.8);
    expect(onTrail(sim)).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('a leap from the end of the log lands on the lowest plate or on the floor, never higher up the trunk', () => {
    let landed = 0;
    for (const from of [136.2, 136.5, 136.8, 137, 137.1]) {
      const sim = new Sim({ ...granskog, spawn: { x: 135, y: -7.19 } });
      run(sim, 0.2);
      leap(sim, 1, from);
      if (on(sim, plate1)) landed++;
      else run(sim, 0.6);
      expect(on(sim, plate1) || onTrail(sim), `leaping at ${from}: ${sim.curr.x}, ${sim.curr.y}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
    // The lowest plate is level with the log: it is a second way in.
    expect(plate1.y).toBeCloseTo(heightAt(granskog, 136), 5);
    expect(landed).toBeGreaterThan(0);
  });

  it('leave the memory and the big candy under them alone', () => {
    // Nothing hangs low over the memory: the lowest ledge near it is the nest, well to its left.
    for (const ledge of [plate1, plate2, plate3, plate4, nest, last]) {
      expect(Math.abs(ledge.x - memory.at.x) - ledge.width / 2, `the ledge at ${ledge.x}`).toBeGreaterThan(2);
      expect(ledge.y - heightAt(granskog, right(ledge) + 0.5)).toBeLessThan(FALL_LIMIT);
    }
    const big = granskog.checkpoints!.find((c) => Math.abs(c.x - last.x) < last.width / 2 + 0.5)!;
    expect(big.x).toBe(150);
    expect(last.y - big.y).toBeGreaterThanOrEqual(1.7);

    // A walk along the trail under them: the memory is touched, the big candy reached, and none of their candy taken.
    const sim = new Sim(granskog, {}, { checkpoint: 8 });
    run(sim, 0.2);
    expect(runPast(sim, cap.at.x - 0.6)).toBe(true);
    expect(sim.flags.has('memory')).toBe(true);
    expect(sim.checkpoint).toBe(9);
    expect(sideTaken(sim, NEST.from, NEST.to)).toEqual({ taken: 0, of: 12 });
    expect(sim.collectedSide.some(Boolean)).toBe(false);
    expect(sim.flags.has('found:colaflaska')).toBe(false);
    expect(sim.bubbles).toBe(0);
  });
});

describe('the rings of the forest', () => {
  it('are off the main way, and out of the lace\'s reach from the forest floor, also at the top of a jump', () => {
    expect(granskog.hooks).toHaveLength(3);
    for (const hook of granskog.hooks!) {
      expect(hook.extra).toBe(true);
      expect(hook.land).toBeUndefined();
      const floor = heightAt(granskog, hook.x);
      expect(hook.y - (floor + JUMP_APEX + ELOF_HEIGHT / 2), `the ring at ${hook.x}`).toBeGreaterThan(LACE_REACH);
      // A full swing on the whole lace tops out lower than a fall he cannot land.
      expect(hook.y - hook.length * Math.cos((65 * Math.PI) / 180) - ELOF_HEIGHT / 2 - floor).toBeLessThan(FALL_LIMIT);

      // Jumping under it, Använd never offers the lace: the berry, the jay and the memory keep their button.
      const sim = new Sim({ ...granskog, spawn: { x: hook.x, y: floor + 0.01 } });
      run(sim, 0.2);
      let offered = sim.curr.verb === 'lace';
      sim.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 1 / STEP; i++) {
        sim.step({ ...idle, hopHeld: true });
        if (sim.curr.verb === 'lace') offered = true;
      }
      expect(offered, `the ring at ${hook.x}`).toBe(false);
    }
  });

  it('are in reach from the bough and the nest they are thrown from', () => {
    for (const [ledge, hook] of [[near, ring], [nest, first]] as const) {
      const sim = new Sim({ ...granskog, spawn: { x: right(ledge) - 0.2, y: ledge.y + 0.01 } });
      run(sim, 0.3);
      expect(sim.curr.verb, `from the ledge at ${ledge.x}`).toBe('lace');
      expect(sim.actionAt).toMatchObject({ x: hook.x, y: hook.y });
    }
  });
});

describe('the tells and the picture', () => {
  it('a heart hangs over the first ledge of each way, in sight from the trail', () => {
    const side = granskog.side!;
    for (const ledge of [barkA, plate1]) {
      const tell = side.findIndex((candy) => Math.abs(candy.x - ledge.x) < 0.3 && Math.abs(candy.y - ledge.y - 0.55) < 0.1);
      expect(tell, `over the ledge at ${ledge.x}`).toBeGreaterThanOrEqual(0);
      // Every other side candy is a heart: shape 3.
      expect(trailShape(tell, 'side')).toBe(3);
      // The ledge is one held jump over the ground the trail runs on.
      expect(ledge.y - heightAt(granskog, ledge.x)).toBeLessThan(0.9 + 1e-6);
    }
  });

  it('every ledge has side candy over it, and every swing has it along its arc', () => {
    const side = granskog.side!;
    for (const ledge of granskog.ledges!) {
      const over = side.some((candy) => Math.abs(candy.x - ledge.x) <= ledge.width / 2 && candy.y > ledge.y && candy.y - ledge.y < 1);
      const sweet = granskog.hidden!.some((h) => Math.abs(h.x - ledge.x) <= ledge.width / 2 && h.y > ledge.y && h.y - ledge.y < 1);
      expect(over || sweet, `the ledge at ${ledge.x}, ${ledge.y}`).toBe(true);
    }
    for (const hook of granskog.hooks!) {
      const along = side.filter((candy) => Math.abs(Math.hypot(candy.x - hook.x, candy.y - hook.y) - hook.length) < 0.1);
      expect(along, `the ring at ${hook.x}`).toHaveLength(3);
    }
  });

  it('the picture widens on the boughs and in the nest, and is the usual one on the trail under them', () => {
    const boughs = upTheBoughs();
    expect(cameraIntent(boughs.curr, granskog.cameras).zoom).toBe(1.4);
    const nested = upToTheNest();
    expect(cameraIntent(nested.curr, granskog.cameras).zoom).toBe(1.4);
    // On the last bough too, where the pool's own zone begins under it.
    const high = new Sim({ ...granskog, spawn: { x: right(last) - 0.4, y: last.y + 0.01 } });
    run(high, 0.3);
    expect(cameraIntent(high.curr, granskog.cameras).zoom).toBe(1.4);

    // On the ground the picture is as it was, also at the top of a jump: on the cone, on the forest floor
    // and off the end of the log.
    for (const x of [21, 22.4, 26, 30, 138.6, 140, 146, 151]) {
      const sim = new Sim({ ...granskog, spawn: { x, y: heightAt(granskog, x) + 0.01 } });
      run(sim, 0.2);
      const usual = cameraIntent(sim.curr, granskog.cameras).zoom;
      expect(usual, `standing at ${x}`).toBe(1);
      sim.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 0.7 / STEP; i++) {
        sim.step({ ...idle, hopHeld: true });
        expect(cameraIntent(sim.curr, granskog.cameras).zoom, `jumping at ${x}`).toBe(1);
      }
    }
    // A running jump off the end of the log, which is as high as the lowest plate.
    const sim = new Sim({ ...granskog, spawn: { x: 136, y: -7.19 } });
    run(sim, 0.2);
    runPast(sim, 136.9);
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    for (let i = 0; i < 1 / STEP; i++) {
      sim.step({ ...idle, x: 1, hopHeld: true });
      expect(cameraIntent(sim.curr, granskog.cameras).zoom, `off the log at ${sim.curr.x}`).toBe(1);
    }
  });
});
