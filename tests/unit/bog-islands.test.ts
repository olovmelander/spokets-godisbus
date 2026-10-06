import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes } from '../../src/render/dressing/ground';

/** Every corner of the bog's own ground near x, with its colour. */
function corners(from: number, to: number) {
  const myren = COURSES.myren!;
  const out: { x: number; y: number; z: number; light: number }[] = [];
  for (const { kind, shape } of bankShapes(myren, groundOf(myren.place!))) {
    if (kind !== 'sphagnum') continue;
    const at = shape.getAttribute('position');
    const colour = shape.getAttribute('color');
    for (let i = 0; i < at.count; i++) {
      if (at.getX(i) < from || at.getX(i) > to) continue;
      out.push({ x: at.getX(i), y: at.getY(i), z: at.getZ(i), light: colour.getX(i) + colour.getY(i) + colour.getZ(i) });
    }
  }
  return out;
}

describe("the bog's tussocks", () => {
  // The first firm tussock: from 11.4 to 14 at 0.2, in the water at -0.6.
  const tussock = corners(10.6, 14.8);
  const near = (y: number) => tussock.filter((c) => Math.abs(c.y - y) < 1e-6 && c.z > -0.3 && c.z < 0.45);

  it('stay level to the collision edge where he walks', () => {
    const top = tussock.filter((c) => c.x >= 11.4 - 1e-6 && c.x <= 14 + 1e-6 && c.z >= -0.3 && c.z <= 0.45 && c.y > 0.1);
    expect(top.length).toBeGreaterThan(5);
    for (const c of top) expect(c.y).toBeCloseTo(0.2, 6);
  });

  it('hang over the water in a lip of moss, and are undercut at the waterline', () => {
    // The lip, 0.12 under the top: out over the water on both sides.
    const lip = near(0.08);
    expect(Math.min(...lip.map((c) => c.x))).toBeCloseTo(11.4 - 0.12, 6);
    expect(Math.max(...lip.map((c) => c.x))).toBeCloseTo(14 + 0.12, 6);
    // At the waterline the side has come in under it.
    const line = near(-0.6);
    expect(Math.min(...line.map((c) => c.x))).toBeCloseTo(11.4 + 0.2, 6);
    expect(Math.max(...line.map((c) => c.x))).toBeCloseTo(14 - 0.2, 6);
    // The lip is moss, lit; the waterline is wet and dark.
    const light = (cs: typeof tussock) => cs.reduce((sum, c) => sum + c.light, 0) / cs.length;
    expect(light(line)).toBeLessThan(light(lip) * 0.5);
  });

  it('round over into the water before its front, so open water lies in front of each', () => {
    // How far forward the moss comes before it is 3.5 under the path: well under the water, which ends at 2.4.
    const reach = (cs: typeof tussock, top: number) => Math.max(...cs.filter((c) => c.y > top - 3.5).map((c) => c.z));
    expect(reach(tussock.filter((c) => c.x > 11.6 && c.x < 13.8), 0.2)).toBeLessThan(2);
    // Dry ground at the bog's start keeps its long front.
    expect(reach(corners(-2, 9), 0)).toBeGreaterThan(2.4);
  });
});
