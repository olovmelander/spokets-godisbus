import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { foundFlag } from '../../src/content/kinds';
import { CANDY_MAGNET, ELOF_HEIGHT, JUMP_APEX, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { heightAt } from '../robot/robot';
import { idle, jump, leap, run, runPast, swingAlong, walkTo } from './drive';

// The sweets of Berget that have a way of their own (docs/level-design.md): both are for the brave, in sight
// from the trail and reached by a ring. Each is played here the way its `way` says.

const gusts = berget.gusts![0]!;
const boulders = gusts.shelters;
const sweet = (kind: string) => berget.hidden!.find((h) => h.kind === kind)!;
const at = (x: number, y: number) => {
  const sim = new Sim({ ...berget, spawn: { x, y: y + 0.01 } });
  run(sim, 0.2);
  return sim;
};
/** Waits where he stands until a gust has just blown over. */
function calm(sim: Sim): void {
  const whole = gusts.every - gusts.length;
  for (let i = 0; i < (2 * gusts.every) / STEP && !(sim.gusts[0]!.blow === 0 && sim.gusts[0]!.until > whole - 0.4); i++) sim.step(idle);
}
/** A held jump straight up from the trail's ground under a sweet does not find it. */
function jumpUnder(kind: string): Sim {
  const h = sweet(kind);
  const sim = at(h.x, heightAt(berget, h.x));
  jump(sim);
  return sim;
}

describe('gräddkola', () => {
  const h = sweet('graddkola');
  const rock = berget.ledges!.filter((ledge) => ledge.x < gusts.from - 1);
  const up = rock.slice(0, -1);
  const far = rock[rock.length - 1]!;

  it('lies on the far shelf of the ring over the cobbles', () => {
    expect(h.way).toBe('over the ring above the cobbles');
    expect(Math.abs(h.x - far.x)).toBeLessThan(far.width / 2);
    expect(h.y - far.y).toBeCloseTo(0.6, 5);
    // The ring hangs over the cobbles, between the last level shelf and the far one.
    const ring = berget.hooks![0]!;
    const cobbles = berget.spots!.filter((spot) => spot.look === 'cobble').map((spot) => spot.at.x);
    expect(ring.x).toBeGreaterThan(Math.min(...cobbles));
    expect(ring.x).toBeLessThan(Math.max(...cobbles));
    expect(ring.x).toBeGreaterThan(up[up.length - 1]!.x);
    expect(ring.x).toBeLessThan(far.x);
  });

  it('is found by going up the rock shelves from the first slab and swinging over the ring', () => {
    const sim = at(84.8, 25.2);
    walkTo(sim, up[0]!.x);
    jump(sim);
    for (const shelf of up.slice(0, -1)) {
      walkTo(sim, shelf.x + shelf.width / 2 - 0.2);
      jump(sim, 1);
    }
    const last = up[up.length - 1]!;
    expect(sim.curr.y).toBeCloseTo(last.y, 1);
    expect(sim.flags.has(foundFlag('graddkola'))).toBe(false);
    walkTo(sim, last.x + last.width / 2 - 0.4);
    expect(swingAlong(sim, 1, 1, 0.7)).toEqual([berget.hooks![0]!.x]);
    expect(sim.curr.y).toBeCloseTo(far.y, 1);
    walkTo(sim, h.x);
    expect(sim.flags.has(foundFlag('graddkola'))).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('cannot be missed by someone who has swung over: it lies where he goes on from, towards the far end of the shelf', () => {
    expect(h.x).toBeGreaterThan(far.x);
    const last = up[up.length - 1]!;
    // Wherever on the shelf's end he throws from and wherever on the upper swing he lets go, and then
    // simply runs on to the right as a child does: through the sweet, and down to the granite.
    for (const back of [1, 0.4, 0.1]) {
      for (const release of [0.5, 0.7, 0.9]) {
        const sim = at(last.x + last.width / 2 - back, last.y);
        swingAlong(sim, 1, 1, release);
        runPast(sim, far.x + far.width / 2 + 0.6);
        run(sim, 0.8);
        expect(sim.flags.has(foundFlag('graddkola')), `thrown ${back} from the end, let go at ${release}`).toBe(true);
        expect(sim.curr.y).toBeCloseTo(heightAt(berget, sim.curr.x), 1);
        expect(sim.bubbles).toBe(0);
      }
    }
  });

  it('is in sight from the trail and out of reach from it: by the ring only', () => {
    // Above what a held jump from the granite reaches, and low enough to be in the picture from there.
    const ground = heightAt(berget, h.x);
    expect(h.y - ground).toBeGreaterThan(JUMP_APEX + ELOF_HEIGHT / 2 + CANDY_MAGNET + 0.2);
    expect(h.y - ground).toBeLessThan(3);
    expect(jumpUnder('graddkola').flags.has(foundFlag('graddkola'))).toBe(false);
    // No jump from the granite finds it, standing or at a run, from under the far shelf or from either side
    // of it; and nothing else stands near enough to jump from.
    for (let x = far.x - far.width / 2 - 1; x <= far.x + far.width / 2 + 2.5; x += 0.3) {
      for (const how of [1, -1, 'right', 'left'] as const) {
        const sim = at(x, ground);
        if (how === 'right') leap(sim, 1, x + 1.2);
        else if (how === 'left') leap(sim, -1, x - 1.2);
        else jump(sim, how);
        expect(sim.flags.has(foundFlag('graddkola')), `a jump (${how}) from x ${x.toFixed(1)}`).toBe(false);
      }
    }
    const others = berget.ledges!.filter((ledge) => ledge !== far && Math.abs(ledge.x - h.x) < 4);
    expect(others).toEqual([]);
  });
});

describe('salmiakruta', () => {
  const h = sweet('salmiakruta');
  const last = boulders[boulders.length - 1]!;
  const lee = berget.ledges!.filter((ledge) => ledge.x >= gusts.from - 1);
  const high = Math.max(...lee.map((ledge) => ledge.y));

  it('lies on the last boulder\'s top, which has no low shelf under it', () => {
    expect(h.way).toBe('from lee to lee above the boulders');
    expect(h.x).toBe(last);
    expect(lee.filter((ledge) => ledge.x === last).map((ledge) => ledge.y)).toEqual([high]);
    expect(h.y - high).toBeGreaterThan(0.5);
    expect(h.y - high).toBeLessThan(0.5 + CANDY_MAGNET);
  });

  it('is found by going from lee to lee above the boulders, one ring between two gusts', () => {
    const sim = at(108.4, gusts.y);
    walkTo(sim, boulders[0]!);
    jump(sim);
    jump(sim);
    expect(sim.curr.y).toBeCloseTo(high, 1);
    const rings: number[] = [];
    for (const boulder of boulders.slice(0, -1)) {
      expect(sim.flags.has(foundFlag('salmiakruta'))).toBe(false);
      walkTo(sim, boulder + 0.3);
      calm(sim);
      rings.push(...swingAlong(sim, 1, 1, 0.7));
      expect(sim.curr.y).toBeCloseTo(high, 1);
    }
    expect(rings).toEqual(berget.hooks!.slice(1).map((ring) => ring.x));
    walkTo(sim, h.x);
    expect(sim.flags.has(foundFlag('salmiakruta'))).toBe(true);
    expect(sim.blown).toBe(0);
    expect(sim.bubbles).toBe(0);
  });

  it('is in sight from the trail and out of reach from it: by the ring only', () => {
    expect(h.y - gusts.y).toBeGreaterThan(JUMP_APEX + ELOF_HEIGHT / 2 + CANDY_MAGNET + 0.2);
    expect(h.y - gusts.y).toBeLessThan(3);
    expect(jumpUnder('salmiakruta').flags.has(foundFlag('salmiakruta'))).toBe(false);
    // No jump from the granite finds it, standing or at a run, from either side of the boulder. This is asked
    // in still air: a gust would only take him further from it.
    for (let x = last - 3; x <= last + 3; x += 0.3) {
      for (const how of [1, -1, 'right', 'left'] as const) {
        const sim = new Sim({ ...berget, gusts: [], spawn: { x, y: gusts.y + 0.01 } });
        run(sim, 0.2);
        if (how === 'right') leap(sim, 1, x + 1.2);
        else if (how === 'left') leap(sim, -1, x - 1.2);
        else jump(sim, how);
        expect(sim.flags.has(foundFlag('salmiakruta')), `a jump (${how}) from x ${x.toFixed(1)}`).toBe(false);
      }
    }
    // The nearest shelf to jump from is the top of the boulder before it, a whole dash away.
    const others = lee.filter((ledge) => ledge.x !== last && Math.abs(ledge.x - h.x) < 4);
    expect(others).toEqual([]);
  });
});
