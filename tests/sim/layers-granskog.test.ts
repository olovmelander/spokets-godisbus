import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { trailShape } from '../../src/render/candy';
import { settingsFor, simOptions } from '../../src/save/settings';
import { cameraIntent } from '../../src/sim/camera-intent';
import { BUBBLE_TIME, ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LACE_REACH, LEDGE_GIVE, STEP, SWING_MAX } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { Hook, Ledge, SimOptions } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { angleOf, idle, jump, leap, run, runPast, sideTaken, swingAlong, use, walkTo } from './drive';

// The first layers over Granskogen (docs/level-design.md): the boughs over the forest floor, with the forest's
// first ring; the nest up a trunk after the log, with two rings in a row; and a root from the hilltop back
// down to the ant road. Each is played here from the trail and back to it, on Äventyr.

const [plate, high, far, step, bark1, bark2, bark3, nest, last] = granskog.ledges! as [Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge, Ledge];
const [ring, first, second] = granskog.hooks! as [Hook, Hook, Hook];
/** Where each way's side candy lies, by x. */
const BOUGHS = { from: 20, to: 34 };
const NEST = { from: 138, to: 154 };
const berry = granskog.spots!.find((spot) => spot.id === 'berry')!;
const jay = granskog.spots!.find((spot) => spot.id === 'jay')!;
const lichen = granskog.climbs!.find((climb) => climb.look === 'lichen')!;
const memory = granskog.spots!.find((spot) => spot.id === 'memory')!;
const cap = granskog.spots!.find((spot) => spot.id === 'cap')!;
/** The big cone's top, which the trail runs over, and the fallen log's. */
const CONE = { from: 20, to: 23.5, y: 1.2 };
const LOG = { to: 137, y: -7.2 };

const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
/** Whether he stands on a ledge. Just landed, his feet are still a few hundredths over it. */
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.16;
/** Whether he stands on the ground the trail runs on. */
const onTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(granskog, sim.curr.x)) < 0.05;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)}`;
/** When he stood under the first ledge of the way he is on: the way's own time is counted from there. */
const entered = new WeakMap<Sim, number>();
const seconds = (sim: Sim) => (sim.steps - entered.get(sim)!) * STEP;

/**
 * From the first big candy along the trail onto the big cone, and from `under` the plate of bark up to the
 * high bough, in rhythm: a jump straight up, and a leap to the right from where that set him down.
 */
function upTheBoughs(under = plate.x, options: SimOptions = {}): Sim {
  const sim = new Sim(granskog, options, { checkpoint: 0 });
  run(sim, 0.2);
  leap(sim, 1, 19);
  walkTo(sim, under);
  // The cone's top is the trail's ground: its candy lies along it.
  expect(onTrail(sim), `on the cone: ${where(sim)}`).toBe(true);
  entered.set(sim, sim.steps);
  jump(sim);
  expect(on(sim, plate), `the plate of bark from ${under}: ${where(sim)}`).toBe(true);
  jump(sim, 1);
  expect(on(sim, high), `the high bough from ${under}: ${where(sim)}`).toBe(true);
  return sim;
}

/**
 * From the big candy before the log along the trail, and from `under` the lowest plate of bark up into the
 * nest, in rhythm: a jump straight up, then a leap to the right, to the left and to the right.
 */
function upToTheNest(under = bark1.x, options: SimOptions = {}): Sim {
  const sim = new Sim(granskog, options, { checkpoint: 8 });
  run(sim, 0.2);
  // Over the log, as the trail goes.
  leap(sim, 1, 131);
  runPast(sim, LOG.to + 0.6);
  walkTo(sim, under);
  expect(onTrail(sim), `under the lowest plate: ${where(sim)}`).toBe(true);
  entered.set(sim, sim.steps);
  jump(sim);
  expect(on(sim, bark1), `the lowest plate from ${under}: ${where(sim)}`).toBe(true);
  for (const [dir, ledge] of [[1, bark2], [-1, bark3], [1, nest]] as const) {
    jump(sim, dir);
    expect(on(sim, ledge), `the ledge at ${ledge.x}, ${ledge.y} from ${under}: ${where(sim)}`).toBe(true);
  }
  return sim;
}

/** On a ledge, as if he had just come up onto it. */
function standingOn(ledge: Ledge, x = ledge.x): Sim {
  const sim = new Sim({ ...granskog, spawn: { x, y: ledge.y + 0.01 } });
  run(sim, 0.3);
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

/** The whole of the boughs: up the bark, over on the ring, along the far bough, down the step to the floor. */
function alongTheBoughs(options: SimOptions = {}): Sim {
  const sim = upTheBoughs(plate.x, options);
  walkTo(sim, right(high) - 0.2);
  expect(sim.curr.verb).toBe('lace');
  expect(swingAlong(sim, 1, 1)).toEqual([ring.x]);
  expect(on(sim, far), `the far bough: ${where(sim)}`).toBe(true);
  // Back for the heart behind him, along the far bough to its end, down onto the step, and off its end to
  // the forest floor.
  walkTo(sim, left(far) + 0.8);
  walkTo(sim, right(far) - 0.3);
  walkTo(sim, right(far) + 0.3);
  run(sim, 0.5);
  expect(on(sim, step), `the step down: ${where(sim)}`).toBe(true);
  walkTo(sim, left(step) + 0.3);
  walkTo(sim, right(step) + 0.4);
  run(sim, 0.6);
  return sim;
}

/** The whole of the nest's way: up the bark, along both rings, along the last bough and off its end. */
function fromTheNest(options: SimOptions = {}): Sim {
  const sim = upToTheNest(bark1.x, options);
  walkTo(sim, right(nest) - 0.2);
  expect(sim.curr.verb).toBe('lace');
  expect(swingAlong(sim, 1, 2)).toEqual([first.x, second.x]);
  expect(on(sim, last), `the last bough: ${where(sim)}`).toBe(true);
  // Back for the lollipop behind him, if he landed past it, and along the bough to its end.
  walkTo(sim, last.x - 0.4);
  walkTo(sim, right(last) - 0.3);
  walkTo(sim, right(last) + 0.4);
  run(sim, 0.8);
  return sim;
}

describe('the boughs over the forest floor', () => {
  it('are entered from the big cone, swung across on the ring, and let out at the lingonberry', () => {
    const sim = alongTheBoughs();
    const began = plate.x;

    expect(onTrail(sim), `at the end: ${where(sim)}`).toBe(true);
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
    expect(seconds(sim)).toBeLessThan(25);
  });

  it('are climbed in rhythm: from anywhere under the plate of bark, a jump up and a leap end on the high bough', () => {
    for (const under of [left(plate) + 0.1, plate.x - 0.3, plate.x + 0.3, right(plate) - 0.1]) {
      const sim = upTheBoughs(under);
      expect(sim.bubbles).toBe(0);
    }
    // Each is one held jump over the last, and the plate is over the cone's top.
    expect(plate.y - CONE.y).toBeLessThan(0.9 + 1e-6);
    expect(high.y - plate.y).toBeLessThan(0.9 + 1e-6);
    expect(left(plate)).toBeGreaterThan(CONE.from);
    expect(right(plate)).toBeLessThan(CONE.to);
  });

  it('end long before the beard lichen, and nowhere near the ant road', () => {
    for (const ledge of [plate, high, far, step]) {
      expect(right(ledge)).toBeLessThan(berry.at.x + 0.5);
      expect(ledge.y).toBeLessThan(lichen.top);
      // A fall from any of them is one he can land, and so is a jump from one that misses.
      expect(ledge.y - heightAt(granskog, right(ledge) + 0.5)).toBeLessThan(FALL_LIMIT);
      expect(ledge.y + JUMP_APEX - heightAt(granskog, right(ledge) + 0.5)).toBeLessThan(FALL_LIMIT);
    }
    expect(lichen.x - right(step)).toBeGreaterThan(10);
  });

  it('take the ring: the far bough is further than a running jump from the high one, and a miss lands softly', () => {
    const sim = standingOn(high, left(high) + 0.2);
    leap(sim, 1, right(high) - 0.05);
    run(sim, 0.3);
    expect(onTrail(sim), `after the jump: ${where(sim)}`).toBe(true);
    expect(sim.curr.y).toBeCloseTo(0, 1);
    // He fell short of the far bough, onto the forest floor.
    expect(sim.curr.x).toBeLessThan(left(far));
    expect(sim.bubbles).toBe(0);
    expect(sim.flags.has('found:gummiorm')).toBe(false);
  });

  it('forgive the hands: wherever he lets go on the way up, he lands on the far bough', () => {
    for (const from of [right(high) - 0.1, high.x, left(high) + 0.2]) {
      for (const release of [0.4, 0.6, 0.8, 0.95]) {
        const sim = standingOn(high, from);
        const { taken, top } = swingFrom(sim, 1, release);
        expect(taken, `from ${from}, let go at ${release}`).toEqual([ring.x]);
        expect(on(sim, far), `from ${from}, let go at ${release}: ${where(sim)}`).toBe(true);
        expect(sim.bubbles).toBe(0);
        // Never so high that a miss would have ended in the bubble.
        expect(top - heightAt(granskog, sim.curr.x)).toBeLessThan(FALL_LIMIT);
      }
    }
  });

  it('can be taken at a leap: a running jump off the big cone brings the ring within reach of the lace', () => {
    for (const from of [22.8, 23.2, 23.5]) {
      const sim = new Sim({ ...granskog, spawn: { x: 20.6, y: CONE.y + 0.01 } });
      run(sim, 0.2);
      runPast(sim, from);
      sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
      let thrown = false;
      for (let i = 0; i < 20 / STEP; i++) {
        const p = sim.curr;
        const input = { ...idle, x: 1, hopHeld: !thrown };
        if (p.mode === 'free' && !p.grounded && p.verb === 'lace' && !thrown) input.act = true;
        if (p.mode === 'swing') {
          thrown = true;
          if (p.vx > 0 && angleOf(sim) > 0.5) input.hop = true;
        }
        sim.step(input);
        if (thrown && sim.curr.mode === 'free' && sim.curr.grounded) break;
        if (sim.curr.mode === 'bubble') break;
      }
      run(sim, 0.2);
      // A shorter way to the far bough, past the hearts on the bark. A miss would land him on the trail.
      expect(thrown, `leaping at ${from}`).toBe(true);
      expect(on(sim, far), `leaping at ${from}: ${where(sim)}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
    // Running off the cone without a jump, as the trail goes, the lace is never offered.
    const sim = new Sim({ ...granskog, spawn: { x: 20.6, y: CONE.y + 0.01 } });
    run(sim, 0.2);
    for (let i = 0; i < 2 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      expect(sim.curr.verb, `running at ${sim.curr.x}`).not.toBe('lace');
    }
    expect(sim.curr.x).toBeGreaterThan(ring.x);
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
    const sim = fromTheNest();
    const began = bark1.x;

    expect(onTrail(sim), `at the end: ${where(sim)}`).toBe(true);
    expect(sim.curr.y).toBeCloseTo(-8, 1);
    expect(sim.curr.x).toBeGreaterThan(began);
    // On the floor before Bertil's sign, with the pool still ahead.
    expect(sim.curr.x).toBeLessThan(cap.at.x);
    expect(sim.flags.has('cap')).toBe(false);
    expect(sideTaken(sim, NEST.from, NEST.to)).toEqual({ taken: 12, of: 12 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim)).toBeLessThan(25);
  });

  it('are climbed in rhythm: from under the lowest plate, up, right, left and right end in the nest', () => {
    // From all along the plate but its last quarter EL: from there the third leap falls a hair short, and
    // sets him down on the plate he leapt from.
    for (const under of [left(bark1) + 0.1, bark1.x - 0.3, bark1.x + 0.3, right(bark1) - 0.25]) {
      const sim = upToTheNest(under);
      expect(sim.bubbles).toBe(0);
    }
    // Each is one held jump over the last. The nest is not more than 4 EL up: stepping out of it is a fall he lands.
    const floor = heightAt(granskog, bark1.x);
    for (const [below, ledge] of [[floor, bark1], [bark1.y, bark2], [bark2.y, bark3], [bark3.y, nest]] as const) {
      expect(ledge.y - below, `the ledge at ${ledge.y}`).toBeLessThan(0.9 + 1e-6);
    }
    expect(nest.y - floor).toBeGreaterThan(3.5);
    expect(nest.y - floor).toBeLessThan(FALL_LIMIT);
  });

  it('hang the rings in a row: at one height, with one length of lace', () => {
    expect(second.y).toBe(first.y);
    expect(second.length).toBe(first.length);
    expect(second.x).toBeGreaterThan(first.x);
    // The second is within the lace's reach from where the first lets him go.
    expect(second.x - first.x).toBeLessThan(LACE_REACH + first.length * Math.sin(0.8));
  });

  it('forgive the hands: wherever he lets go on the way up, both rings carry him to the last bough', () => {
    for (const from of [right(nest) - 0.1, nest.x, left(nest) + 0.2]) {
      for (const release of [0.4, 0.6, 0.8, 0.95]) {
        const sim = standingOn(nest, from);
        const { taken } = swingFrom(sim, 2, release);
        expect(taken, `from ${from}, let go at ${release}`).toEqual([first.x, second.x]);
        expect(on(sim, last), `from ${from}, let go at ${release}: ${where(sim)}`).toBe(true);
        expect(sim.bubbles).toBe(0);
      }
    }
  });

  it('a miss costs nothing: letting go of the first ring without a second throw lands on the trail', () => {
    for (const release of [0.5, 0.8, 1.05]) {
      const sim = standingOn(nest, right(nest) - 0.2);
      const { taken } = swingFrom(sim, 1, release);
      expect(taken).toEqual([first.x]);
      expect(onTrail(sim), `let go at ${release}: ${where(sim)}`).toBe(true);
      expect(sim.curr.x).toBeGreaterThan(right(nest));
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
    }
    // And so does walking out of the nest.
    const sim = standingOn(nest);
    walkTo(sim, right(nest) + 0.5);
    run(sim, 0.8);
    expect(onTrail(sim)).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('a jump from any plate of bark that misses is a soft landing: only the nest is higher than that', () => {
    for (const bark of [bark1, bark2, bark3]) {
      expect(bark.y + JUMP_APEX - heightAt(granskog, bark.x), `the plate at ${bark.y}`).toBeLessThan(FALL_LIMIT);
    }
    // From the highest plate, a leap away from the trunk: down to the floor.
    const sim = standingOn(bark3);
    leap(sim, -1, left(bark3) + 0.1);
    run(sim, 0.5);
    expect(onTrail(sim), `after the leap: ${where(sim)}`).toBe(true);
    expect(sim.bubbles).toBe(0);

    // A jump out of the nest with no throw at the ring is the one fall he cannot land: the bubble sets him
    // back in the nest, with the ring still to try.
    const out = standingOn(nest);
    leap(out, 1, right(nest) - 0.1);
    expect(out.bubbles).toBe(1);
    run(out, BUBBLE_TIME + 0.5);
    expect(on(out, nest), `after the bubble: ${where(out)}`).toBe(true);
  });

  it('a leap from the end of the log lands on the lowest plate or on the floor, never higher up the trunk', () => {
    let landed = 0;
    for (const from of [LOG.to - 0.8, LOG.to - 0.5, LOG.to - 0.2, LOG.to, LOG.to + 0.1]) {
      const sim = new Sim({ ...granskog, spawn: { x: LOG.to - 2, y: LOG.y + 0.01 } });
      run(sim, 0.2);
      leap(sim, 1, from);
      if (on(sim, bark1)) landed++;
      // No higher than the lowest plate, wherever he took off.
      expect(sim.curr.y, `leaping at ${from}: ${where(sim)}`).toBeLessThan(bark1.y + 0.08);
      // And on along the trail from there.
      run(sim, 1, { x: 1 });
      run(sim, 0.3);
      expect(onTrail(sim), `after leaping at ${from}: ${where(sim)}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
    // The lowest plate is about as high as the log: it is a second way in.
    expect(bark1.y - LOG.y).toBeCloseTo(0.1, 5);
    expect(landed).toBeGreaterThan(0);
  });

  it('leave the memory and the big candy under them alone', () => {
    // Nothing hangs low over the memory: the ledge nearest to it is the nest, well to its left.
    for (const ledge of [bark1, bark2, bark3, nest, last]) {
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

describe('the root from the hilltop back down to the ant road', () => {
  const root = granskog.climbs!.find((climb) => climb.needs === 'antlift')!;
  const lift = granskog.rides!.find((ride) => ride.id === 'antlift')!;
  const anthill = granskog.challenges![0]!;
  /** On the ant road at its big candy, with the jay his friend and the twig pulled off the road. */
  const onTheAntRoad = () => {
    const sim = new Sim(granskog, {}, { checkpoint: 2, flags: ['berry', 'jay'], placed: ['twig'] });
    run(sim, 0.3);
    return sim;
  };
  const untilFree = (sim: Sim) => {
    for (let i = 0; i < 10 / STEP && sim.curr.mode !== 'free'; i++) sim.step(idle);
  };
  /** Up to the hilltop with the ants, as the trail goes. */
  function rideUp(sim: Sim): void {
    runPast(sim, lift.from.x - 1);
    walkTo(sim, lift.from.x);
    use(sim);
    untilFree(sim);
    run(sim, 0.3);
    expect(sim.curr.x).toBeCloseTo(lift.to.x, 1);
    expect(sim.curr.y).toBeCloseTo(lift.to.y, 1);
  }
  /** At the hilltop's near edge, Använd slides him down the root. */
  function slideDown(sim: Sim): void {
    walkTo(sim, root.x + 0.6);
    expect(sim.curr.verb).toBe('slide');
    use(sim);
    untilFree(sim);
  }

  it('runs down the hilltop\'s near side, from its top to the ant road', () => {
    expect(root.look).toBe('root');
    expect(root.top).toBe(heightAt(granskog, root.x + 0.5));
    expect(root.bottom).toBe(heightAt(granskog, root.x));
    expect(root.exit).toBe(1);
    // The climbs before it keep their places in the list.
    expect(granskog.climbs!.indexOf(root)).toBe(granskog.climbs!.length - 1);
  });

  it('is not there before the ants have carried him up: the twig and the ants are the first way', () => {
    const sim = onTheAntRoad();
    run(sim, 5, { x: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(4, 1);
    expect(sim.curr.x).toBeLessThan(60);
    run(sim, 0.5, { y: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(4, 1);
  });

  it('after the ant lift it takes him down to the ant road, to the foot of the anthill, and up again', () => {
    const sim = onTheAntRoad();
    rideUp(sim);
    expect(sim.flags.has('antlift')).toBe(true);
    slideDown(sim);
    expect(sim.curr.x).toBeCloseTo(root.x, 1);
    expect(sim.curr.y).toBeCloseTo(4, 1);
    // Along the ant road, over the twig, to where the anthill's own way up begins.
    expect(runPast(sim, anthill.steps[0]!.x - 0.8)).toBe(true);
    run(sim, 0.3);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(4, 1);
    expect(sim.curr.x).toBeGreaterThan(anthill.from);
    expect(sim.flags.has('found:chokladkola')).toBe(false);
    expect(sim.bubbles).toBe(0);
    // And back: running into the root he takes hold of it, climbs, and steps onto the hilltop.
    for (let i = 0; i < 20 / STEP && sim.curr.y < root.top - 0.05; i++) sim.step({ ...idle, x: 1 });
    run(sim, 0.6, { x: 1 });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(10, 1);
    expect(sim.curr.x).toBeGreaterThan(60);
    expect(sim.bubbles).toBe(0);
  });

  it('the helper leads on along the trail: from the hilltop to its candy, and from the ant road back up', () => {
    const sim = onTheAntRoad();
    rideUp(sim);
    const onTop = hintFor(sim, granskog)!;
    expect(onTop.verb).toBeNull();
    expect(onTop.at.x).toBeGreaterThan(sim.curr.x);
    expect(onTop.at.y).toBeGreaterThan(10);
    slideDown(sim);
    run(sim, 0.2);
    const below = hintFor(sim, granskog)!;
    expect(below.verb).toBeNull();
    expect(below.at.x).toBeGreaterThan(60);
    expect(below.at.y).toBeGreaterThan(10);
  });

  it('put back before the lift, he has neither the ride behind him nor the root: the ants carry him again', () => {
    const sim = onTheAntRoad();
    rideUp(sim);
    slideDown(sim);
    // He never touched the hilltop's big candy, so "Jag har fastnat" takes him to the ant road's.
    expect(sim.checkpoint).toBe(2);
    sim.toCheckpoint();
    run(sim, BUBBLE_TIME + 0.5);
    expect(sim.curr.x).toBeCloseTo(47, 0);
    expect(sim.flags.has('antlift')).toBe(false);
    run(sim, 5, { x: 1 });
    // He runs on to the wall under the hilltop, and no root takes him up.
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.y).toBeCloseTo(4, 1);
    runPast(sim, lift.from.x + 0.3);
    walkTo(sim, lift.from.x);
    expect(sim.curr.verb).toBe('take');
    expect(sim.curr.word).toBe('rideAnts');
  });
});

describe('on Lugnt', () => {
  it('both ways are there to play as well: the swing pumps itself, and the rest is the same', () => {
    const lugnt = simOptions(settingsFor('lugnt'));
    expect(lugnt.swingHelp).toBe(true);
    const boughs = alongTheBoughs(lugnt);
    expect(onTrail(boughs), `after the boughs: ${where(boughs)}`).toBe(true);
    expect(sideTaken(boughs, BOUGHS.from, BOUGHS.to)).toEqual({ taken: 10, of: 10 });
    expect(boughs.flags.has('found:gummiorm')).toBe(true);
    expect(boughs.bubbles).toBe(0);
    const nested = fromTheNest(lugnt);
    expect(onTrail(nested), `after the nest: ${where(nested)}`).toBe(true);
    expect(sideTaken(nested, NEST.from, NEST.to)).toEqual({ taken: 12, of: 12 });
    expect(nested.flags.has('found:colaflaska')).toBe(true);
    expect(nested.bubbles).toBe(0);
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
      expect(hook.y - hook.length * Math.cos(SWING_MAX) - ELOF_HEIGHT / 2 - floor).toBeLessThan(FALL_LIMIT);

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
    for (const [ledge, hook] of [[high, ring], [nest, first]] as const) {
      const sim = standingOn(ledge, right(ledge) - 0.2);
      expect(sim.curr.verb, `from the ledge at ${ledge.x}`).toBe('lace');
      expect(sim.actionAt).toMatchObject({ x: hook.x, y: hook.y });
    }
  });
});

describe('the tells and the picture', () => {
  it('a heart hangs over the first ledge of each way, in sight from the trail', () => {
    const side = granskog.side!;
    for (const ledge of [plate, bark1]) {
      const tell = side.findIndex((candy) => Math.abs(candy.x - ledge.x) < 0.3 && Math.abs(candy.y - ledge.y - 0.55) < 0.1);
      expect(tell, `over the ledge at ${ledge.x}`).toBeGreaterThanOrEqual(0);
      // Every other side candy is a heart: shape 3.
      expect(trailShape(tell, 'side')).toBe(3);
    }
  });

  it('every ledge has side candy over it, and every swing has it along its arc', () => {
    const side = granskog.side!;
    for (const ledge of granskog.ledges!) {
      const over = side.some((candy) => Math.abs(candy.x - ledge.x) <= ledge.width / 2 && candy.y > ledge.y && candy.y - ledge.y < 1);
      expect(over, `the ledge at ${ledge.x}, ${ledge.y}`).toBe(true);
    }
    for (const hook of granskog.hooks!) {
      const along = side.filter((candy) => Math.abs(Math.hypot(candy.x - hook.x, candy.y - hook.y) - hook.length) < 0.1);
      expect(along, `the ring at ${hook.x}`).toHaveLength(3);
    }
  });

  it('the picture widens on the boughs and in the nest, and is the usual one on the trail under them', () => {
    // From the last ledge before each swing, all through it, until he stands on the bough it ends on: the
    // picture is the wide one at every step, and never goes back and forth.
    for (const [sim, rings, end] of [[upTheBoughs(), 1, far], [upToTheNest(), 2, last]] as const) {
      expect(cameraIntent(sim.curr, granskog.cameras).zoom).toBe(1.4);
      let was = sim.curr.mode;
      let taken = 0;
      for (let i = 0; i < 25 / STEP; i++) {
        const p = sim.curr;
        const input = { ...idle, x: 1 };
        if (p.mode === 'free' && p.verb === 'lace' && taken < rings) input.act = true;
        if (p.mode === 'swing' && was !== 'swing') taken++;
        if (p.mode === 'swing' && p.vx > 0 && angleOf(sim) > 0.8) input.hop = true;
        was = p.mode;
        sim.step(input);
        expect(cameraIntent(sim.curr, granskog.cameras).zoom, where(sim)).toBe(1.4);
        if (taken === rings && sim.curr.mode === 'free' && sim.curr.grounded) break;
      }
      expect(on(sim, end)).toBe(true);
    }
    // On the last bough too, where the pool's own zone begins under it.
    expect(cameraIntent(standingOn(last, right(last) - 0.4).curr, granskog.cameras).zoom).toBe(1.4);

    // On the ground the picture is as it was, also at the top of a jump: on the cone, on the forest floor
    // and under the trunk.
    for (const x of [20.5, 22.6, 23.3, 26, 30, 137.6, 140, 146, 151]) {
      const sim = new Sim({ ...granskog, spawn: { x, y: heightAt(granskog, x) + 0.01 } });
      run(sim, 0.2);
      expect(cameraIntent(sim.curr, granskog.cameras).zoom, `standing at ${x}`).toBe(1);
      sim.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 0.7 / STEP; i++) {
        sim.step({ ...idle, hopHeld: true });
        expect(cameraIntent(sim.curr, granskog.cameras).zoom, `jumping at ${x}`).toBe(1);
      }
    }
    // A running jump off the end of the big cone and off the end of the log, which the trail invites.
    for (const [start, edge] of [[{ x: 21, y: CONE.y + 0.01 }, CONE.to], [{ x: LOG.to - 2, y: LOG.y + 0.01 }, LOG.to]] as const) {
      for (const before of [0.6, 0.3, 0.05, -0.1]) {
        const sim = new Sim({ ...granskog, spawn: start });
        run(sim, 0.2);
        runPast(sim, edge - before);
        sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
        for (let i = 0; i < 1 / STEP; i++) {
          sim.step({ ...idle, x: 1, hopHeld: true });
          expect(cameraIntent(sim.curr, granskog.cameras).zoom, `jumping ${before} before ${edge}: ${where(sim)}`).toBe(1);
        }
      }
    }
  });
});
