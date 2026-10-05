import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { FLOOR_ENDS, bankShapes, floorDrop, forwardAt, shoreAt, slopeDrop } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';

const forest = COURSES['granskog']!;
/** The tops of the forest's walls: a wall tall enough to hide something at its foot. */
function wallTops() {
  const tops: { x: number; y: number; side: number }[] = [];
  const line = forest.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (Math.abs(b.y - a.y) <= Math.abs(b.x - a.x) * 1.3 || Math.abs(b.y - a.y) < 0.6) continue;
    // The upper side lies to the right of a wall that goes up, to the left of one that goes down.
    tops.push(b.y > a.y ? { x: b.x, y: b.y, side: 1 } : { x: a.x, y: a.y, side: -1 });
  }
  return tops;
}

describe("the forest's floor", () => {
  it('is level where he walks, and slopes down towards the camera in front of the path, never up', () => {
    for (const z of [-0.3, 0, 0.3, 0.45]) expect(slopeDrop(z)).toBe(0);
    let last = 0;
    for (let z = 0.45; z <= FLOOR_ENDS; z += 0.05) {
      expect(slopeDrop(z), `at depth ${z.toFixed(2)}`).toBeGreaterThanOrEqual(last);
      last = slopeDrop(z);
    }
    // Enough of it that the picture's lower edge cuts the floor and not a face: 1.3 EL under him at 3.4 in front.
    expect(slopeDrop(3.4)).toBeGreaterThan(1.2);
    expect(slopeDrop(3.4)).toBeLessThan(1.5);
  });

  it("draws back to the path at the top of every wall, so that no corner hides the wall's foot", () => {
    const tops = wallTops();
    expect(tops.length).toBeGreaterThan(6);
    for (const top of tops) {
      const on = top.x + top.side * 0.05;
      // Only where the top is ground to stand on: a wall's top can be another wall's foot.
      if (Math.abs(heightAt(forest, on) - top.y) > 0.3) continue;
      expect(forwardAt(forest, on), `the wall top at x ${top.x}`).toBeLessThan(0.02);
      expect(floorDrop(forest, on, 1.2), `the wall top at x ${top.x}`).toBeNull();
    }
  });

  it('comes all the way forward on open ground, and there it is the slope', () => {
    // The start, the needle slope and the last stretch: nothing near them to draw back from.
    for (const x of [4, 80, 96, 150]) {
      expect(forwardAt(forest, x), `at x ${x}`).toBe(1);
      expect(floorDrop(forest, x, 2.2)).toBeCloseTo(slopeDrop(2.2), 6);
      expect(floorDrop(forest, x, FLOOR_ENDS + 0.2)).toBeNull();
    }
  });

  it('has a near shore in front of each pool, a finger over its water', () => {
    const pools = forest.water ?? [];
    expect(pools.length).toBeGreaterThan(0);
    for (const pool of pools) {
      const middle = (pool.from + pool.to) / 2;
      const shore = shoreAt(forest, middle);
      expect(shore, `the pool at x ${middle}`).not.toBeNull();
      expect(shore!).toBeGreaterThan(pool.y);
      expect(shore!).toBeLessThan(pool.y + 0.15);
    }
    // In the mesh: in front of a pool no point of the floor's first row lies under the water.
    const pool = pools[0]!;
    for (const { shape } of bankShapes(forest, groundOf(forest.place!))) {
      const at = shape.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const [x, y, z] = [at.getX(i), at.getY(i), at.getZ(i)];
        if (x > pool.from + 1 && x < pool.to - 1 && z > 0.49 && z < 0.95) expect(y, `at x ${x.toFixed(1)}, z ${z.toFixed(2)}`).toBeGreaterThan(pool.y);
      }
    }
  });

  it("is the forest's and the lawn's: the bog keeps its front, and the rock has its own", () => {
    const deepest = (course: string) => {
      const chapter = COURSES[course]!;
      let front = -Infinity;
      // A wooden floor runs on towards the camera in every place: this is about what grows.
      for (const { kind, shape } of bankShapes(chapter, groundOf(chapter.place!))) {
        if (kind === 'wood') continue;
        const at = shape.getAttribute('position');
        for (let i = 0; i < at.count; i++) front = Math.max(front, at.getZ(i));
      }
      return front;
    };
    for (const course of ['granskog', 'garden']) expect(deepest(course), course).toBeCloseTo(5.3, 6);
    for (const course of ['myren', 'berget']) expect(deepest(course), course).toBeLessThan(3);
  });
});

describe("the lawn's floor", () => {
  const garden = COURSES['garden']!;

  it('is the same floor as the forest has: all the way forward on the open lawn, and no floor past its lip', () => {
    for (const x of [75, 118, 160, 200]) {
      expect(forwardAt(garden, x), `at x ${x}`).toBe(1);
      expect(floorDrop(garden, x, 0.3)).toBe(0);
      expect(floorDrop(garden, x, 2.2)).toBeCloseTo(slopeDrop(2.2), 6);
      expect(floorDrop(garden, x, FLOOR_ENDS + 0.2)).toBeNull();
    }
  });

  it('draws back at the top of the garden\'s walls too', () => {
    const line = garden.ground;
    let walls = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i]!;
      const b = line[i + 1]!;
      if (Math.abs(b.y - a.y) <= Math.abs(b.x - a.x) * 1.3 || Math.abs(b.y - a.y) < 0.6) continue;
      const top = b.y > a.y ? b : a;
      const on = top.x + (b.y > a.y ? 0.05 : -0.05);
      if (Math.abs(heightAt(garden, on) - top.y) > 0.3) continue;
      walls += 1;
      expect(forwardAt(garden, on), `the wall top at x ${top.x}`).toBeLessThan(0.02);
    }
    expect(walls).toBeGreaterThan(3);
  });

  it('leaves the deck alone: a wooden floor does not draw back, and runs straight on', () => {
    let front = -Infinity;
    for (const { kind, shape } of bankShapes(garden, groundOf(garden.place!))) {
      if (kind !== 'wood') continue;
      const at = shape.getAttribute('position');
      // Every corner of the deck stands at one of its rows' own depths: none has been drawn in.
      for (let i = 0; i < at.count; i++) {
        front = Math.max(front, at.getZ(i));
        if (at.getZ(i) > 1.2) expect([2.2, 3.6, 5.4, 8, 13].some((z) => Math.abs(at.getZ(i) - z) < 1e-5), `a deck corner at depth ${at.getZ(i)}`).toBe(true);
      }
    }
    expect(front).toBeCloseTo(13, 5);
  });
});
