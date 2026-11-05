import { Box3, Mesh } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { moonstone } from '../../src/content/aventyr2/moonstone';

beforeAll(() => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => fake }) });
});
afterAll(() => vi.unstubAllGlobals());

describe('the moonlit meeting stone', () => {
  it('keeps the collision strip level across the entire landing, meeting and growth area', () => {
    const group = moonstone(20, 0.6, -0.5);
    const stone = group.getObjectByName('moonstone-surface') as Mesh;
    const position = stone.geometry.getAttribute('position');
    let samples = 0;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      if (x < 0 || x > 20 || Math.abs(z) > 1) continue;
      expect(position.getY(i)).toBeCloseTo(0.6, 6);
      samples++;
    }
    expect(samples).toBeGreaterThan(200);
  });

  it('has one manifold skin, with no overlapping crack strips or inverted faces', () => {
    const stone = moonstone(20, 0.6, -0.5).getObjectByName('moonstone-surface') as Mesh;
    const index = stone.geometry.getIndex()!, positions = stone.geometry.getAttribute('position');
    const triangles = new Set<string>(), edges = new Map<string, number>();
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
      const key = [a!, b!, c!].sort((x, y) => x - y).join(':');
      expect(triangles.has(key)).toBe(false);
      triangles.add(key);
      const normalY = (positions.getZ(b!) - positions.getZ(a!)) * (positions.getX(c!) - positions.getX(a!))
        - (positions.getX(b!) - positions.getX(a!)) * (positions.getZ(c!) - positions.getZ(a!));
      expect(normalY).toBeGreaterThan(0);
      for (const [from, to] of [[a!, b!], [b!, c!], [c!, a!]]) {
        const edge = [from!, to!].sort((x, y) => x - y).join(':');
        edges.set(edge, (edges.get(edge) ?? 0) + 1);
      }
    }
    expect(Math.max(...edges.values())).toBe(2);
  });

  it('submerges the front edge and covers the exposed lakebed on tall screens', () => {
    const group = moonstone(20, 0.6, -0.5);
    const stone = group.getObjectByName('moonstone-surface') as Mesh;
    const position = stone.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) if (position.getZ(i) > 5) expect(position.getY(i)).toBeLessThan(-0.5);
    const water = group.getObjectByName('moonstone-water')!;
    const bounds = new Box3().setFromObject(water);
    expect(bounds.min.x).toBe(0);
    expect(bounds.max.x).toBe(20);
    expect(bounds.min.z).toBeCloseTo(-5.5);
    expect(bounds.max.z).toBeGreaterThan(80);
    expect(bounds.max.y).toBeCloseTo(-0.515);
  });
});
