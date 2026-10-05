import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes, forwardAt } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';

/** Every corner of a chapter's ground. */
function* corners(course: string) {
  const chapter = COURSES[course]!;
  for (const { shape } of bankShapes(chapter, groundOf(chapter.place!))) {
    const at = shape.getAttribute('position');
    for (let i = 0; i < at.count; i++) yield { x: at.getX(i), y: at.getY(i), z: at.getZ(i) };
  }
}

describe("the mountain's rock", () => {
  const mountain = COURSES['berget']!;
  /** Open rock, away from any wall: where the blocks and their ledges are. */
  const open = (x: number) => forwardAt(mountain, x - 0.5) === 1 && forwardAt(mountain, x + 0.5) === 1
    && Math.abs(heightAt(mountain, x - 0.5) - heightAt(mountain, x + 0.5)) < 0.05;

  it('is level where he walks and a little past it, exactly where the simulation has its ground', () => {
    let seen = 0;
    for (const corner of corners('berget')) {
      if (corner.z < -0.35 || corner.z > 0.91 || !open(corner.x)) continue;
      seen += 1;
      expect(corner.y, `at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeCloseTo(heightAt(mountain, corner.x), 5);
    }
    expect(seen).toBeGreaterThan(300);
  });

  it('goes down in front in ledges that never rise over the path, whatever block they belong to', () => {
    let lowest = Infinity;
    for (const corner of corners('berget')) {
      if (corner.z <= 0.91 || !open(corner.x)) continue;
      const under = heightAt(mountain, corner.x) - corner.y;
      // The first step down is at least half a length: an edge, not a kerb.
      if (corner.z >= 1) expect(under, `at x ${corner.x.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeGreaterThan(0.5);
      expect(under).toBeGreaterThan(0.05);
      lowest = Math.min(lowest, corner.z);
    }
    expect(lowest).toBeGreaterThan(0.91);
  });

  it('is in blocks: the first ledge lies at several heights along the chapter, each for some lengths', () => {
    // The first ledge's inner corner stands at depth 1: its height under the path, along the open rock.
    const heights = new Map<number, number>();
    for (const corner of corners('berget')) {
      if (Math.abs(corner.z - 1) > 1e-6 || !open(corner.x)) continue;
      const under = Math.round((heightAt(mountain, corner.x) - corner.y) * 100) / 100;
      if (under > 0.5 && under < 1.2) heights.set(under, (heights.get(under) ?? 0) + 1);
    }
    expect(heights.size).toBeGreaterThan(6);
    for (const under of heights.keys()) {
      expect(under).toBeGreaterThanOrEqual(0.62);
      expect(under).toBeLessThanOrEqual(1.08);
    }
  });

  it('draws back to the path at the top of its walls, as the forest does: the foot of the cliff is in sight', () => {
    const line = mountain.ground;
    let walls = 0;
    for (let i = 0; i < line.length - 1; i++) {
      const a = line[i]!;
      const b = line[i + 1]!;
      if (Math.abs(b.y - a.y) <= Math.abs(b.x - a.x) * 1.3 || Math.abs(b.y - a.y) < 0.6) continue;
      const top = b.y > a.y ? b : a;
      const on = top.x + (b.y > a.y ? 0.05 : -0.05);
      if (Math.abs(heightAt(mountain, on) - top.y) > 0.3) continue;
      walls += 1;
      // No corner of the ground stands out in front of the path within a hand of the wall's top.
      for (const corner of corners('berget')) {
        if (Math.abs(corner.x - top.x) < 0.02 && Math.abs(corner.y - top.y) < 0.02) expect(corner.z, `the wall top at x ${top.x}`).toBeLessThan(0.5);
      }
    }
    expect(walls).toBeGreaterThan(2);
  });

  it('is the same rock at dusk: the finale stands on the summit it climbed', () => {
    const front = (course: string) => Math.max(...[...corners(course)].map((corner) => corner.z));
    expect(front('norrsken')).toBeCloseTo(front('berget'), 6);
  });
});
