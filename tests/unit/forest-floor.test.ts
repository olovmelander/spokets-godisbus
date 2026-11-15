import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { FLOOR_ENDS, bankShapes, floorDrop, forwardAt, shoreAt, slopeDrop } from '../../src/render/dressing/ground';
import { heightAt, landscape } from '../../src/render/dressing/kit';
import { openPools } from '../../src/render/dressing/natural';

const forest = landscape(COURSES['granskog']!);
/** A pool that runs on towards the camera has its banks beside it all the way: a wall into one does not draw back. */
const intoPool = (x: number) => openPools(forest).some((w) => Math.abs(x - w.from) < 1e-6 || Math.abs(x - w.to) < 1e-6);
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
      if (Math.abs(heightAt(forest, on) - top.y) > 0.3 || intoPool(top.x)) continue;
      expect(forwardAt(forest, on), `the wall top at x ${top.x}`).toBeLessThan(0.02);
      // The floor rolls over the edge there as a bank, 0.7 out at the most (ground.ts, CHEEK): a hand under his knee.
      expect(floorDrop(forest, on, 0.7), `the wall top at x ${top.x}`).toBeGreaterThan(0.05);
      expect(floorDrop(forest, on, 1.2), `the wall top at x ${top.x}`).toBeNull();
    }
    // In the mesh: within a step of a tall wall's top nothing of the upper floor stands further out than that.
    const tall = tops.filter((top) => !intoPool(top.x) && Math.abs(heightAt(forest, top.x + top.side * 0.05) - top.y) < 0.3);
    for (const { shape } of bankShapes(forest, groundOf(forest.place!))) {
      const at = shape.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const [x, y, z] = [at.getX(i), at.getY(i), at.getZ(i)];
        const top = tall.find((wall) => (x - wall.x) * wall.side > -0.01 && (x - wall.x) * wall.side < 0.3 && y > wall.y - 2 && y < wall.y + 0.01);
        if (top) expect(z, `at x ${x.toFixed(2)}, y ${y.toFixed(2)}`).toBeLessThan(0.45 + 0.7 + 0.21);
      }
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

  it('lets each pool run on towards the camera between its banks, to a shore far in front', () => {
    // Olov, 14 November 2026: "Kan vattnet i diket rinna vidare ut ur bild i riktning mot kameran ... i stället för att
    // sluta i en rak linje närmast kameran?" A pool had a near shore half a length in front of the path, one line.
    const pools = forest.water ?? [];
    expect(pools.length).toBeGreaterThan(0);
    expect(openPools(forest).map((w) => w.from)).toEqual(pools.map((w) => w.from));
    for (const pool of pools) expect(shoreAt(forest, (pool.from + pool.to) / 2), `the pool at x ${pool.from}`).toBeNull();
    // In the mesh: between its banks the bed lies under the water all the way to where a picture held sideways ends,
    // down the floor's own fall; and before the floor's end it has come up as a shore, a finger over the water.
    const pool = pools[0]!;
    let under = 0, shore = 0;
    for (const { shape } of bankShapes(forest, groundOf(forest.place!))) {
      const at = shape.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const [x, y, z] = [at.getX(i), at.getY(i), at.getZ(i)];
        if (x < pool.from + 2 || x > pool.to - 2 || z < 0.49) continue;
        if (z < 3.85) { under++; expect(y, `at x ${x.toFixed(1)}, z ${z.toFixed(2)}`).toBeLessThan(pool.y - slopeDrop(z) - 0.5); }
        if (z > 4.61 && z < 5.01) { shore++; expect(y - (pool.y - slopeDrop(z)), `at x ${x.toFixed(1)}, z ${z.toFixed(2)}`).toBeGreaterThan(0.02); }
      }
    }
    expect(under).toBeGreaterThan(200);
    expect(shore).toBeGreaterThan(20);
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
    expect(deepest('myren')).toBeLessThan(3);
    // Granite now falls away in broader fractured planes, still shallower than the forest's sloping floor.
    expect(deepest('berget')).toBeLessThan(deepest('granskog'));
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

  it('meets a deck that also falls away in front: the two end within a step of one another', () => {
    const fronts = new Map<string, number>();
    for (const { kind, shape } of bankShapes(garden, groundOf(garden.place!))) {
      const at = shape.getAttribute('position');
      let front = -Infinity;
      for (let i = 0; i < at.count; i++) front = Math.max(front, at.getZ(i));
      fronts.set(kind, Math.max(fronts.get(kind) ?? -Infinity, front));
    }
    expect(fronts.get('lawn')).toBeCloseTo(5.3, 5);
    expect(fronts.get('wood')).toBeCloseTo(5.6, 5);
  });
});
