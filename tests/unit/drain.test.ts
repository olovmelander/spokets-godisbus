import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { FRAME, drainFrame } from '../../src/render/dressing/drain';
import { DRAIN_BACK, DRAIN_FRONT, bankShapes, drainsOf, streetDrop } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';

const byn = COURSES['byn']!;
const street = COURSES['look-street']!;

describe('the drain in the road', () => {
  it('is found where bars of iron stand side by side over pits, from the edge into the first to the edge out of the last', () => {
    expect(drainsOf(byn)).toEqual([{ from: 18, to: 34.6, y: 0 }]);
    expect(drainsOf(street)).toEqual([{ from: 9.5, to: 14.7, y: 0 }]);
    // A pit with no iron in it is not a drain: the cellar window's well.
    for (const drain of drainsOf(byn)) expect(drain.to < 72 || drain.from > 76.4).toBe(true);
    expect(drainsOf(COURSES['garden']!)).toEqual([]);
  });

  it('keeps its bars where the simulation has them: their tops at the height he walks on', () => {
    for (const bar of (byn.surfaces ?? []).filter((s) => s.kind === 'iron')) {
      expect(heightAt(byn, (bar.from + bar.to) / 2)).toBe(drainsOf(byn)[0]!.y);
    }
  });

  it('lies in its cast frame: flat on the road a hair over it, round the grate and never over its slots', () => {
    const frame = drainFrame(byn)!;
    expect(frame.name).toBe('drain-frame');
    const at = frame.geometry.getAttribute('position');
    const { from, to, y } = drainsOf(byn)[0]!;
    for (let i = 0; i < at.count; i++) {
      const px = at.getX(i), py = at.getY(i), pz = at.getZ(i);
      // On the road, as the road lies there.
      const over = py - (y - streetDrop(pz));
      expect(over).toBeGreaterThan(0.005);
      expect(over).toBeLessThan(0.02);
      // Round the grate: behind it, in front of it, or beside it, and never further than its own width.
      const behind = pz <= DRAIN_BACK + 1e-6 && pz >= DRAIN_BACK - FRAME - 1e-6;
      const before = pz >= DRAIN_FRONT - 1e-6 && pz <= DRAIN_FRONT + FRAME + 1e-6;
      const beside = (px <= from + 1e-6 && px >= from - FRAME - 1e-6) || (px >= to - 1e-6 && px <= to + FRAME + 1e-6);
      expect(behind || before || beside, `${px}, ${pz}`).toBe(true);
      expect(px).toBeGreaterThanOrEqual(from - FRAME - 1e-6);
      expect(px).toBeLessThanOrEqual(to + FRAME + 1e-6);
    }
    // Its faces look up.
    const normal = frame.geometry.getAttribute('normal');
    for (let i = 0; i < normal.count; i++) expect(normal.getY(i)).toBeGreaterThan(0.9);
  });

  it('shows each bar a bar deep, in iron, and under it the dark of the well', () => {
    const { from, to, y } = drainsOf(byn)[0]!;
    let iron = 0, dark = 0;
    for (const { shape } of bankShapes(byn, 'asphalt')) {
      const at = shape.getAttribute('position'), colour = shape.getAttribute('color');
      for (let i = 0; i < at.count; i++) {
        const px = at.getX(i), py = at.getY(i), pz = at.getZ(i);
        if (px <= from + 0.01 || px >= to - 0.01 || pz <= DRAIN_BACK + 0.01 || pz >= DRAIN_FRONT - 0.01) continue;
        const light = colour.getX(i) + colour.getY(i) + colour.getZ(i);
        if (py > y - 1 && py < y - 0.05) {
          iron += 1;
          expect(light, `iron at ${px}, ${py}, ${pz}`).toBeGreaterThan(0.03);
        } else if (py < y - 2) {
          dark += 1;
          expect(light, `the well at ${px}, ${py}, ${pz}`).toBeLessThan(0.05);
        }
      }
      shape.dispose();
    }
    expect(iron).toBeGreaterThan(10);
    expect(dark).toBeGreaterThan(10);
  });

  it('is one draw for every drain, and nothing where there is none', () => {
    expect(drainFrame(street)).not.toBeNull();
    expect(drainFrame(COURSES['garden']!)).toBeNull();
  });
});
