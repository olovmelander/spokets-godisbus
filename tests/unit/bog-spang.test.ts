import type { Mesh } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { bankShapes } from '../../src/render/dressing/ground';
import { heightAt } from '../../src/render/dressing/kit';
import { spang } from '../../src/render/dressing/spang';

beforeAll(() => {
  // The planks wear the boards' picture, drawn on a canvas: there is none here, and none is needed.
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
});
afterAll(() => vi.unstubAllGlobals());

const myren = COURSES['myren']!;
const walk = myren.surfaces!.find((surface) => surface.kind === 'wood')!;
const corners = (mesh: Mesh) => {
  const at = mesh.geometry.getAttribute('position');
  return Array.from({ length: at.count }, (_, i) => ({ x: at.getX(i), y: at.getY(i), z: at.getZ(i) }));
};

describe("the bog's walk of planks", () => {
  it('is three planks along the path, their tops on the line he walks on, on sleepers whose ends show in front', () => {
    const mesh = spang(myren)!;
    expect(mesh).not.toBeNull();
    const all = corners(mesh);
    const flat = all.filter((p) => p.x > walk.from + 0.5 && p.x < 127.5);
    // Level and flat on top where he walks, and nothing of it over the line: on the level there are no battens.
    expect(Math.max(...flat.map((p) => p.y))).toBeCloseTo(4.5, 3);
    const tops = flat.filter((p) => Math.abs(p.y - 4.5) < 0.001);
    // He walks on the middle plank: it is under the plane he moves in.
    expect(tops.some((p) => p.z < -0.3) && tops.some((p) => p.z > 0.3)).toBe(true);
    // Three planks, each a board wide: from about a plank and a half behind the path to as far in front.
    expect(Math.min(...tops.map((p) => p.z))).toBeCloseTo(-1.18, 2);
    expect(Math.max(...tops.map((p) => p.z))).toBeCloseTo(1.18, 2);
    // The sleepers lie across under the planks, longer than the planks are wide.
    expect(Math.max(...flat.map((p) => p.z))).toBeGreaterThan(1.3);
    expect(Math.min(...flat.map((p) => p.y))).toBeLessThan(4.5 - 0.5);
    // On the ramp down, battens lie across the planks, a little over the line.
    const ramp = all.filter((p) => p.x > 128.5 && p.x < 135.5);
    expect(ramp.some((p) => p.y > heightAt(myren, p.x) + 0.05)).toBe(true);
    expect(ramp.every((p) => p.y < heightAt(myren, p.x) + 0.2)).toBe(true);
    expect(mesh.geometry.getAttribute('color').count).toBe(mesh.geometry.getAttribute('position').count);
  });

  it("lies on a ridge of the bog's own peat, under the planks a plank and a sleeper below the line", () => {
    const shapes = bankShapes(myren, 'sphagnum');
    expect(shapes.some(({ kind }) => kind === 'wood')).toBe(false);
    const ridge = shapes.filter(({ kind }) => kind === 'ridge');
    expect(ridge).toHaveLength(1);
    const at = ridge[0]!.shape.getAttribute('position');
    let under = 0;
    for (let i = 0; i < at.count; i++) {
      if (at.getX(i) < walk.from + 0.5 || at.getX(i) > 127.5 || Math.abs(at.getZ(i)) > 1.2) continue;
      under++;
      expect(at.getY(i)).toBeLessThan(4.5 - 0.3);
    }
    expect(under).toBeGreaterThan(20);
  });

  it('is only where a chapter has wood over the bog', () => {
    expect(spang({ ...myren, surfaces: [] })).toBeNull();
  });
});
