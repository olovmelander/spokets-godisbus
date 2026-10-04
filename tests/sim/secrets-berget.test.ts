import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { foundFlag } from '../../src/content/kinds';
import { CANDY_MAGNET, ELOF_HEIGHT, JUMP_APEX, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { heightAt } from '../robot/robot';
import { idle, jump, run, swingAlong, walkTo } from './drive';

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
  const up = rock.slice(0, -2);
  const far = rock[rock.length - 2]!;
  const step = rock[rock.length - 1]!;

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

  it('is in sight from the trail and out of reach from it: by the ring only', () => {
    // Above what a held jump from the granite reaches, and low enough to be in the picture from there.
    const ground = heightAt(berget, h.x);
    expect(h.y - ground).toBeGreaterThan(JUMP_APEX + ELOF_HEIGHT / 2 + CANDY_MAGNET + 0.2);
    expect(h.y - ground).toBeLessThan(3);
    expect(jumpUnder('graddkola').flags.has(foundFlag('graddkola'))).toBe(false);
    // Nor from the step below the far shelf, which is more than a held jump under it.
    const below = at(step.x - step.width / 2 + 0.1, step.y);
    jump(below, -1);
    expect(below.curr.y).toBeLessThan(far.y - 1);
    expect(below.flags.has(foundFlag('graddkola'))).toBe(false);
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
  });
});
