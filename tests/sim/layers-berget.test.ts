import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { cameraIntent } from '../../src/sim/camera-intent';
import { ELOF_HEIGHT, GUST_SHELTER, LACE_REACH, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge } from '../../src/sim/types';
import { heightAt } from '../robot/robot';
import { angleOf, idle, jump, leap, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

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
/** The shelves on the near side of the ring, and the one on its far side. */
const up = rock.slice(0, -1);
const last = up[up.length - 1]!;
const far = rock[rock.length - 1]!;
const LOW = Math.min(...lee.map((ledge) => ledge.y));
const HIGH = Math.max(...lee.map((ledge) => ledge.y));

const at = (x: number, y: number) => {
  const sim = new Sim({ ...berget, spawn: { x, y: y + 0.01 } });
  run(sim, 0.2);
  return sim;
};
const seconds = (sim: Sim, since = 0) => (sim.steps - since) * STEP;
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const stands = (sim: Sim, ledge: Ledge) => sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.1 && Math.abs(sim.curr.x - ledge.x) < ledge.width / 2 + 0.16;
/** How many of the side candies lie between two x. */
const sideBetween = (from: number, to: number) => side.filter((candy) => candy.x >= from && candy.x <= to).length;
/** Which of the side candy is in the bag, by its place in the chapter's list. */
const taken = (sim: Sim) => sim.collectedSide.flatMap((got, i) => (got ? [i] : []));
/** The heart over a shelf, by its place in the chapter's list. */
const heartOver = (shelf: { x: number; y: number }) => side.findIndex((candy) => candy.x === shelf.x && Math.abs(candy.y - shelf.y - 0.55) < 0.01);

/**
 * What the picture holds, from its bottom to its top, on the smallest screen the game is drawn for: a phone
 * 360 px high shows 4.8 EL at zoom 1, with the place the camera looks at 35 % up (src/render/view.ts).
 */
function picture(sim: Sim): { bottom: number; top: number; zoom: number } {
  const look = cameraIntent(sim.curr, berget.cameras);
  return { bottom: look.y - 0.35 * 4.8 * look.zoom, top: look.y + 0.65 * 4.8 * look.zoom, zoom: look.zoom };
}

/** Waits where he stands until a gust has just blown over: the whole calm is ahead of him. */
function calm(sim: Sim): void {
  const whole = gusts.every - gusts.length;
  for (let i = 0; i < (2 * gusts.every) / STEP && !(sim.gusts[0]!.blow === 0 && sim.gusts[0]!.until > whole - 0.4); i++) sim.step(idle);
}

/** Up the rock shelves, each with a held jump from near the last one's end, and over the ring. */
function overTheCobbles(sim: Sim, release = 0.7): number[] {
  walkTo(sim, up[0]!.x);
  jump(sim);
  for (const [i, shelf] of up.slice(1).entries()) {
    expect(stands(sim, up[i]!), `on the shelf at ${up[i]!.x}`).toBe(true);
    walkTo(sim, right(up[i]!) - 0.2);
    jump(sim, 1);
    expect(stands(sim, shelf), `on the shelf at ${shelf.x}`).toBe(true);
  }
  walkTo(sim, right(last) - 0.4);
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
    expect(rock).toHaveLength(7);
    // A low and a high shelf on every boulder but the last, which has its high one only.
    expect(lee).toHaveLength(2 * boulders.length - 1);
    expect(leeRings).toHaveLength(boulders.length - 1);
    expect(sideBetween(85, 108) + sideBetween(109, 137)).toBe(side.length);
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

  it('hang their rings low enough that any let-go is a fall he can land: at full swing, with the lace climbed short', () => {
    for (const [x, y] of [[right(last) - 0.4, last.y], [boulders[1]! + 0.3, HIGH]] as const) {
      for (const dir of [1, -1] as const) {
        const sim = at(x, y);
        sim.step({ ...idle, act: true });
        expect(sim.curr.mode).toBe('swing');
        // Up the lace as far as it goes, pushing the way he swings until the swing is as high as it gets.
        for (let i = 0; i < 10 / STEP; i++) sim.step({ ...idle, x: sim.curr.vx >= 0 ? 1 : -1, y: i < 2.5 / STEP ? 1 : 0 });
        let top = 0;
        for (let i = 0; i < 8 / STEP && sim.curr.mode === 'swing'; i++) {
          sim.step({ ...idle, x: sim.curr.vx >= 0 ? 1 : -1, hop: dir * sim.curr.vx > 0 && dir * angleOf(sim) > 1 });
          top = Math.max(top, sim.curr.y);
        }
        for (let i = 0; i < 4 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step(idle);
        // From more than 3.5 EL over the granite, and no glitter bubble.
        expect(top - GRANITE, `from ${x}, going ${dir}`).toBeGreaterThan(3.5);
        expect(sim.curr.grounded).toBe(true);
        expect(sim.bubbles, `from ${x}, going ${dir}`).toBe(0);
      }
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
    // Off the far shelf's end, down to the granite, and on along the trail.
    runPast(sim, right(far) + 0.6);
    walkTo(sim, right(far) + 1.4);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
    expect(sim.curr.x).toBeGreaterThan(from);
    expect(sim.curr.x).toBeLessThan(berget.checkpoints![2]!.x);
    expect(sideTaken(sim, 85, 108)).toEqual({ taken: 9, of: 9 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(20);
  });

  it('show the ring from below: a held jump among the cobbles takes the lowest candy of its arc, and no more', () => {
    const sim = at(cobbleRing!.x, GRANITE);
    jump(sim);
    expect(taken(sim)).toEqual([side.findIndex((candy) => candy.x === cobbleRing!.x)]);
    expect(sim.curr.y).toBeCloseTo(GRANITE, 1);
  });

  it('are framed with the ring above him and the cobbles below, and the trail under them is framed as it was', () => {
    for (const shelf of [last, far]) {
      const up = picture(at(shelf.x, shelf.y));
      expect(up.bottom, `on the shelf at ${shelf.x}`).toBeLessThan(GRANITE - 0.3);
      expect(up.top, `on the shelf at ${shelf.x}`).toBeGreaterThan(cobbleRing!.y + 0.3);
    }
    // On the lace too: the picture rests on the hook's place and does not jump.
    const sim = at(right(last) - 0.4, last.y);
    sim.step({ ...idle, act: true });
    run(sim, 0.5);
    expect(sim.curr.mode).toBe('swing');
    expect(picture(sim).bottom).toBeLessThan(GRANITE - 0.3);
    expect(picture(sim).top).toBeGreaterThan(cobbleRing!.y + 0.3);
    // Down among the cobbles the picture is the usual one, and a held jump there does not widen it.
    const below = at(cobbleRing!.x, GRANITE);
    expect(picture(below).zoom).toBe(1);
    below.step({ ...idle, hop: true, hopHeld: true });
    for (let i = 0; i < 0.7 / STEP; i++) {
      below.step({ ...idle, hopHeld: true });
      expect(picture(below).zoom).toBe(1);
    }
  });

  it('forgive the hands on the ring: anywhere on the upper half of the swing lands on the far shelf', () => {
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

  it('let out forward only: nothing leads up to the far shelf from the granite, by any jump from under or beside it', () => {
    expect(far.y - GRANITE).toBeGreaterThan(1.5);
    expect(far.y - GRANITE).toBeLessThan(4);
    // The candy of the arc that a jump from the cobbles takes is its lowest, and nothing more.
    const lowest = side.findIndex((candy) => candy.x === cobbleRing!.x);
    for (let x = far.x - far.width / 2 - 1; x <= far.x + far.width / 2 + 2.5; x += 0.3) {
      for (const how of [0, 1, -1, 'right', 'left'] as const) {
        const sim = at(x, GRANITE);
        if (how === 'right') leap(sim, 1, x + 1.2);
        else if (how === 'left') leap(sim, -1, x - 1.2);
        else jump(sim, how);
        run(sim, 0.3);
        // He comes down on the granite again, or on the first boulder's low shelf, which is its own way up.
        expect(sim.curr.y, `a jump (${how}) from x ${x.toFixed(1)}`).toBeLessThan(far.y - 1);
        expect(taken(sim).filter((i) => i !== lowest && side[i]!.x < gusts.from - 1), `a jump (${how}) from x ${x.toFixed(1)}`).toEqual([]);
      }
    }
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

  it('are framed by the picture of the open granite: on top of a boulder it holds the rings and the ground', () => {
    const up = picture(at(boulders[2]!, HIGH));
    expect(up.bottom).toBeLessThan(GRANITE - 0.3);
    expect(up.top).toBeGreaterThan(leeRings[0]!.y + 0.3);
    // The same zone as on the granite below: nothing was widened for the way.
    expect(up.zoom).toBe(picture(at(boulders[2]!, GRANITE)).zoom);
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
    const end = boulders[boulders.length - 1]!;
    runPast(sim, end + 1.2);
    walkTo(sim, end + 1.6);
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
      expect(taken(sim)).toEqual([heartOver({ x: boulder, y: LOW }), heartOver({ x: boulder, y: HIGH })]);
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

  it('are never a dead end for careless hands: no waiting for gusts, a let-go anywhere on the swing, and he still gets there', () => {
    const ramps = boulders.slice(0, -1);
    const end = boulders[boulders.length - 1]!;
    for (let seed = 1; seed <= 8; seed++) {
      // The same careless child every time the test is run: a small generator of his own.
      let state = seed;
      const random = () => (state = (state * 1664525 + 1013904223) >>> 0) / 4294967296;
      const mood = () => ({ release: 0.2 + random() * 0.9, wait: Math.round((random() * 1.5) / STEP) });
      const sim = at(108.4, GRANITE);
      let now = mood();
      let i = 0;
      for (; i < 180 / STEP && !(sim.curr.grounded && Math.abs(sim.curr.y - HIGH) < 0.1 && Math.abs(sim.curr.x - end) < GUST_SHELTER); i++) {
        const p = sim.curr;
        const input = { ...idle, hopHeld: true };
        if (p.mode === 'swing') {
          // He pushes on, and lets go wherever the mood takes him.
          input.x = 1;
          if (p.vx > 0 && angleOf(sim) > now.release) {
            input.hop = true;
            now = mood();
          }
        } else if (p.mode === 'free' && p.grounded && Math.abs(p.y - HIGH) < 0.1) {
          // On a top: over to its far side, and the lace when he feels like it, whatever the wind does.
          const boulder = boulders.reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a));
          if (p.x < boulder + 0.25) input.x = 0.5;
          else if (now.wait-- <= 0 && p.verb === 'lace') input.act = true;
        } else if (p.mode === 'free' && p.grounded && Math.abs(p.y - LOW) < 0.1) {
          input.hop = true;
        } else if (p.mode === 'free' && p.grounded) {
          // Down on the granite: to the boulder he was taken back to, and up its two shelves again.
          const boulder = [...ramps].reverse().find((b) => b <= p.x + GUST_SHELTER) ?? ramps[0]!;
          if (Math.abs(p.x - boulder) > 0.12) input.x = Math.sign(boulder - p.x) * (Math.abs(p.x - boulder) > 0.6 ? 1 : 0.5);
          else input.hop = true;
        }
        sim.step(input);
      }
      expect(i * STEP, `careless child ${seed} is at ${sim.curr.x.toFixed(1)},${sim.curr.y.toFixed(1)}`).toBeLessThan(120);
      expect(sim.bubbles, `careless child ${seed}`).toBe(0);
    }
  });
});
