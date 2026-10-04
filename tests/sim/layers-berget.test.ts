import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { ELOF_HEIGHT, GUST_SHELTER, LACE_REACH, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { angleOf, idle, jump, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

// The layers over Berget (docs/level-design.md), each played from the trail and back to it on Äventyr:
// the rock shelves with the ring over the cobbles, and the lee shelves with a ring between two boulders.

const GRANITE = 26.4;
const gusts = berget.gusts![0]!;
const boulders = gusts.shelters;
const side = berget.side!;
/** The rock shelves lie before the open granite, the lee shelves over it. */
const rock = berget.ledges!.filter((ledge) => ledge.x < gusts.from - 1);
const lee = berget.ledges!.filter((ledge) => ledge.x >= gusts.from - 1);
const [cobbleRing, ...leeRings] = berget.hooks!;
const far = rock[rock.length - 2]!;
const step = rock[rock.length - 1]!;
const LOW = Math.min(...lee.map((ledge) => ledge.y));
const HIGH = Math.max(...lee.map((ledge) => ledge.y));

const at = (x: number, y: number) => {
  const sim = new Sim({ ...berget, spawn: { x, y: y + 0.01 } });
  run(sim, 0.2);
  return sim;
};
const seconds = (sim: Sim, since = 0) => (sim.steps - since) * STEP;
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const stands = (sim: Sim, ledge: Ledge) => sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) < ledge.width / 2 + 0.16;
/** Which of the side candy is in the bag, by its place in the chapter's list. */
const taken = (sim: Sim) => sim.collectedSide.flatMap((got, i) => (got ? [i] : []));
/** The heart over a ledge, by its place in the chapter's list. */
const heartOver = (ledge: Ledge) => side.findIndex((candy) => candy.x === ledge.x && Math.abs(candy.y - ledge.y - 0.55) < 0.01);

/** Waits where he stands until a gust has just blown over: the whole calm is ahead of him. */
function calm(sim: Sim): void {
  const whole = gusts.every - gusts.length;
  for (let i = 0; i < (2 * gusts.every) / STEP && !(sim.gusts[0]!.blow === 0 && sim.gusts[0]!.until > whole - 0.4); i++) sim.step(idle);
}

/** Up the rock shelves, each with a held jump from near the last one's end, and over the ring. */
function overTheCobbles(sim: Sim, release = 0.7): number[] {
  const up = rock.slice(0, -2);
  walkTo(sim, up[0]!.x);
  jump(sim);
  for (const [i, shelf] of up.slice(1).entries()) {
    expect(stands(sim, up[i]!), `on the shelf at ${up[i]!.x}`).toBe(true);
    walkTo(sim, right(up[i]!) - 0.2);
    jump(sim, 1);
    expect(stands(sim, shelf), `on the shelf at ${shelf.x}`).toBe(true);
  }
  walkTo(sim, right(up[up.length - 1]!) - 0.4);
  return swingAlong(sim, 1, 1, release);
}

/** Up a boulder's two shelves from the granite in its lee. */
function upTheBoulder(sim: Sim, boulder: number): void {
  walkTo(sim, boulder);
  jump(sim);
  expect(sim.curr.y).toBeCloseTo(LOW, 1);
  jump(sim);
  expect(sim.curr.y).toBeCloseTo(HIGH, 1);
}

/** From a boulder's high shelf to the next one's, by the ring between them, once a gust has passed. */
function toTheNextLee(sim: Sim, boulder: number, release = 0.7): number[] {
  walkTo(sim, boulder + 0.3);
  calm(sim);
  return swingAlong(sim, 1, 1, release);
}

describe('the layers of Berget', () => {
  it('are two ways: every ledge, ring and side candy belongs to one of them', () => {
    expect(rock).toHaveLength(8);
    // A low and a high shelf on every boulder but the last, which has its high one only.
    expect(lee).toHaveLength(2 * boulders.length - 1);
    expect(leeRings).toHaveLength(boulders.length - 1);
    expect(sideTaken(new Sim(berget), 85, 108).of + sideTaken(new Sim(berget), 109, 137).of).toBe(side.length);
    for (const ledge of berget.ledges!) expect(ledge.look).toBe('stone');
  });

  it('hang their rings out of the lace\'s reach from the trail: the lace is thrown from a shelf', () => {
    for (const ring of berget.hooks!) {
      expect(ring.extra).toBe(true);
      expect(ring.land).toBeUndefined();
      for (let x = ring.x - LACE_REACH; x <= ring.x + LACE_REACH; x += 0.5) {
        expect(ring.y - (heightAt(berget, x) + ELOF_HEIGHT / 2), `the ring at ${ring.x}, from x ${x}`).toBeGreaterThan(LACE_REACH);
      }
    }
    // The rings over the granite are a row: one boulder apart, at one height, each midway between two.
    for (const [i, ring] of leeRings.entries()) {
      expect(ring.x).toBeCloseTo((boulders[i]! + boulders[i + 1]!) / 2, 5);
      expect(ring.y).toBe(leeRings[0]!.y);
      expect(ring.length).toBe(leeRings[0]!.length);
    }
  });

  it('are not found by following the trail: walking under them takes no side candy and is never offered the lace', () => {
    // From the shoulder to beyond the last boulder with the stick held right: the gusts take him back, and he gets there.
    const sim = at(82, 24);
    let offered = 0;
    for (let i = 0; i < 120 / STEP && sim.curr.x < boulders[boulders.length - 1]! + 1.5; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.curr.verb === 'lace') offered++;
    }
    expect(sim.curr.x).toBeGreaterThan(boulders[boulders.length - 1]! + 1.4);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
    expect(offered).toBe(0);
    expect(sideTaken(sim, 85, 108).taken).toBe(0);
    expect(sideTaken(sim, 109, 137).taken).toBe(0);
    expect(sim.candyCount).toBeGreaterThan(20);
    expect(sim.bubbles).toBe(0);
  });
});

describe('the rock shelves, and the ring over the cobbles', () => {
  it('begin a held jump above the first slab, where the trail passes, with a heart over the first', () => {
    const first = rock[0]!;
    expect(first.y - heightAt(berget, first.x)).toBeCloseTo(0.9, 5);
    expect(heartOver(first)).toBeGreaterThanOrEqual(0);
    // No step up is more than a held jump, and no gap more than a running one.
    const up = rock.slice(0, -2);
    for (const [i, shelf] of up.slice(1).entries()) {
      expect(shelf.y - up[i]!.y).toBeLessThanOrEqual(0.9 + 1e-9);
      expect(shelf.x - shelf.width / 2 - right(up[i]!)).toBeLessThanOrEqual(1.6);
    }
  });

  it('are played from the first slab to the granite before the gusts, with every heart on the way', () => {
    // He comes along the trail: up the first slab from the shoulder.
    const sim = at(82, 24);
    walkTo(sim, 84.8);
    expect(sim.curr.y).toBeCloseTo(25.2, 1);
    const from = sim.curr.x;
    const since = sim.steps;
    const rings = overTheCobbles(sim);
    expect(rings).toEqual([cobbleRing!.x]);
    expect(stands(sim, far)).toBe(true);
    // Down the step, and on along the trail.
    runPast(sim, right(step) + 0.3);
    walkTo(sim, right(step) + 0.6);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
    expect(sim.curr.x).toBeGreaterThan(from);
    expect(sim.curr.x).toBeLessThan(gusts.from);
    expect(sideTaken(sim, 85, 108)).toEqual({ taken: 11, of: 11 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(20);
  });

  it('forgive the hands on the ring: anywhere on the upper half of the swing lands on the far shelf', () => {
    const last = rock[rock.length - 3]!;
    for (const from of [right(last) - 0.8, right(last) - 0.4, right(last) - 0.1]) {
      for (const release of [0.5, 0.6, 0.7, 0.8, 0.9]) {
        const sim = at(from, last.y);
        swingAlong(sim, 1, 1, release);
        expect(stands(sim, far), `from ${from}, let go at ${release}: he is at ${sim.curr.x.toFixed(2)},${sim.curr.y.toFixed(2)}`).toBe(true);
        expect(sim.bubbles).toBe(0);
      }
    }
  });

  it('cost a miss nothing but the climb: he lands on the slab below, unhurt', () => {
    // Off the end of the last level shelf without the lace.
    const last = rock[rock.length - 3]!;
    const off = at(last.x, last.y);
    runPast(off, right(last) + 1);
    run(off, 1);
    expect(off.curr.grounded).toBe(true);
    expect(off.curr.y).toBeCloseTo(GRANITE, 1);
    expect(off.bubbles).toBe(0);
    // Letting go too early on the swing: under the far shelf, and down among the cobbles.
    const early = at(right(last) - 0.4, last.y);
    swingAlong(early, 1, 1, 0.3);
    expect(early.curr.grounded).toBe(true);
    expect(early.curr.y).toBeCloseTo(GRANITE, 1);
    expect(early.curr.x).toBeGreaterThan(cobbleRing!.x);
    expect(early.bubbles).toBe(0);
  });

  it('let out forward only: the far shelf is not climbed from the step below it', () => {
    expect(far.y - step.y).toBeGreaterThan(1.2);
    const sim = at(step.x, step.y);
    walkTo(sim, step.x - step.width / 2 + 0.1);
    jump(sim, -1);
    expect(stands(sim, far)).toBe(false);
    expect(sim.curr.y).toBeLessThan(far.y - 1);
    expect(sim.bubbles).toBe(0);
  });
});

describe('the lee shelves, and the rings between the boulders', () => {
  it('keep him in the lee on every shelf: none is wider than a boulder\'s shelter', () => {
    for (const ledge of lee) {
      const boulder = boulders.find((b) => Math.abs(b - ledge.x) < 0.5);
      expect(boulder, `the shelf at ${ledge.x}`).toBeDefined();
      // As far out as his feet can stand on it.
      expect(Math.abs(ledge.x - boulder!) + ledge.width / 2 + 0.16).toBeLessThanOrEqual(GUST_SHELTER);
    }
    expect(LOW - gusts.y).toBeCloseTo(0.9, 5);
    expect(HIGH - LOW).toBeCloseTo(0.9, 5);
    // Two gusts pass him by on a high shelf.
    const sim = at(boulders[2]! + 0.5, HIGH);
    run(sim, 2 * gusts.every);
    expect(sim.blown).toBe(0);
    expect(sim.curr.x).toBeCloseTo(boulders[2]! + 0.5, 1);
    expect(sim.curr.y).toBeCloseTo(HIGH, 1);
  });

  it('are played from lee to lee between the gusts, from the first boulder to the granite beyond the last', () => {
    // He comes along the trail, from the big candy before the open granite.
    const sim = at(108.4, GRANITE);
    const from = sim.curr.x;
    const since = sim.steps;
    upTheBoulder(sim, boulders[0]!);
    for (const [i, boulder] of boulders.slice(0, -1).entries()) {
      expect(toTheNextLee(sim, boulder)).toEqual([leeRings[i]!.x]);
      expect(sim.curr.y, `after the ring at ${leeRings[i]!.x}`).toBeCloseTo(HIGH, 1);
      expect(Math.abs(sim.curr.x - boulders[i + 1]!)).toBeLessThan(GUST_SHELTER);
    }
    // Off the last boulder's top, forward, and down on the granite before the big candy and the cliff.
    const last = boulders[boulders.length - 1]!;
    runPast(sim, last + 1.2);
    walkTo(sim, last + 1.6);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
    expect(sim.curr.x).toBeGreaterThan(from);
    expect(sim.curr.x).toBeLessThan(berget.checkpoints![3]!.x);
    expect(sim.blown).toBe(0);
    expect(sim.bubbles).toBe(0);
    // Every side candy of the way: the first boulder's two hearts, the heart on each top, the one in each swing.
    // What is left hangs over the low shelves of the boulders he swung past.
    const left = lee.filter((ledge) => ledge.y === LOW && ledge.x > boulders[0]!).map(heartOver);
    expect(left).toHaveLength(boulders.length - 2);
    expect(sideTaken(sim, 109, 137)).toEqual({ taken: 11, of: 15 });
    for (const i of left) expect(sim.collectedSide[i]).toBe(false);
    expect(seconds(sim, since)).toBeLessThan(35);
  });

  it('can be gone up at every boulder before the last: its low shelf, its heart, and one ring to the next lee', () => {
    for (const [i, boulder] of boulders.slice(0, -1).entries()) {
      const sim = at(boulder, GRANITE);
      upTheBoulder(sim, boulder);
      expect(taken(sim)).toEqual([heartOver({ x: boulder, y: LOW, width: 1, look: 'stone' }), heartOver({ x: boulder, y: HIGH, width: 1, look: 'stone' })]);
      toTheNextLee(sim, boulder);
      expect(sim.curr.y).toBeCloseTo(HIGH, 1);
      // Down off the far end of the next top, into the open: once the next gust has passed.
      const next = boulders[i + 1]!;
      calm(sim);
      runPast(sim, next + 1.2);
      run(sim, 0.6);
      expect(sim.curr.grounded, `from the boulder at ${boulder}`).toBe(true);
      expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
      expect(sim.curr.x).toBeGreaterThan(next);
      expect(sim.blown).toBe(0);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('on the lace no gust has hold of him: he may hang there while it blows, and let go when it has passed', () => {
    const sim = at(boulders[1]! + 0.3, HIGH);
    // He throws as a gust begins.
    for (let i = 0; i < gusts.every / STEP && sim.gusts[0]!.blow === 0; i++) sim.step(idle);
    expect(sim.curr.verb).toBe('lace');
    sim.step({ ...idle, act: true });
    run(sim, gusts.length, { x: 1 });
    expect(sim.curr.mode).toBe('swing');
    expect(sim.gusts[0]!.blow).toBe(0);
    for (let i = 0; i < 6 / STEP && sim.curr.mode === 'swing'; i++) sim.step({ ...idle, x: 1, hop: sim.curr.vx > 0 && angleOf(sim) > 0.6 });
    for (let i = 0; i < 2 / STEP && !sim.curr.grounded; i++) sim.step(idle);
    run(sim, 0.3);
    expect(sim.curr.y).toBeCloseTo(HIGH, 1);
    expect(Math.abs(sim.curr.x - boulders[2]!)).toBeLessThan(GUST_SHELTER);
    expect(sim.blown).toBe(0);
  });

  it('a gust that catches him in the air sets him down by the boulder he left, and its low shelf is the way up again', () => {
    const boulder = boulders[1]!;
    const sim = at(boulder + 0.3, HIGH);
    // He throws a little before a gust, and lets go low on the swing, out in the open, while it blows.
    for (let i = 0; i < (2 * gusts.every) / STEP && !(sim.gusts[0]!.until > 0 && sim.gusts[0]!.until < 0.6); i++) sim.step(idle);
    swingAlong(sim, 1, 1, 0.5);
    run(sim, 0.6);
    expect(sim.blown).toBe(1);
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
    expect(Math.abs(sim.curr.x - boulder)).toBeLessThanOrEqual(GUST_SHELTER + 0.05);
    // Up again, and over once it has passed.
    upTheBoulder(sim, boulder);
    toTheNextLee(sim, boulder);
    expect(sim.curr.y).toBeCloseTo(HIGH, 1);
    expect(Math.abs(sim.curr.x - boulders[2]!)).toBeLessThan(GUST_SHELTER);
    expect(sim.blown).toBe(1);
    expect(sim.bubbles).toBe(0);
  });

  it('at the top of the swing he is already in the next lee: let go there, no gust takes him', () => {
    for (const wait of [0, 1, 2, 3]) {
      const sim = at(boulders[3]! + 0.3, HIGH);
      run(sim, wait);
      swingAlong(sim, 1, 1, 0.8);
      expect(sim.curr.y, `thrown after ${wait} s`).toBeCloseTo(HIGH, 1);
      expect(Math.abs(sim.curr.x - boulders[4]!)).toBeLessThan(GUST_SHELTER);
      expect(sim.blown).toBe(0);
    }
  });
});
