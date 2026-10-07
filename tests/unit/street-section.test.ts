import { Color, DoubleSide, Mesh, MeshBasicMaterial, Raycaster, Triangle, Vector3, type BufferGeometry } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { bankShapes } from '../../src/render/dressing/ground';
import type { SurfaceKind } from '../../src/sim/types';

function section(kind: SurfaceKind) {
  const chapter = { ...COURSES['byn']!,
    ground: [{ x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 6 }, { x: 8, y: 6 }, { x: 8, y: 0 }, { x: 16, y: 0 }],
    surfaces: [{ from: -24, to: 32, kind }], water: [],
  };
  return bankShapes(chapter, 'asphalt').find((part) => part.kind === kind)!.shape;
}

function paintedAt(shape: BufferGeometry, x: number, depth: number, direction: 1 | -1) {
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const mesh = new Mesh(shape, material);
  const ray = new Raycaster(new Vector3(x - direction * 2, 6 - depth, -0.3), new Vector3(direction, 0, 0));
  const hit = ray.intersectObject(mesh)[0]!;
  expect(hit).toBeDefined();
  expect(hit.point.x).toBeCloseTo(x, 5);
  const at = shape.getAttribute('position'), colour = shape.getAttribute('color');
  const indices = [hit.face!.a, hit.face!.b, hit.face!.c];
  const corners = indices.map((i) => new Vector3().fromBufferAttribute(at, i));
  const weights = Triangle.getBarycoord(hit.point, corners[0]!, corners[1]!, corners[2]!, new Vector3())!;
  const out = new Color(0, 0, 0);
  indices.forEach((i, n) => out.add(new Color(colour.getX(i), colour.getY(i), colour.getZ(i)).multiplyScalar(weights.getComponent(n))));
  material.dispose();
  return out;
}

describe('the street exposed in section', () => {
  it('shows a thin wearing course, pale aggregate and earth fading at six lengths on both wall directions', () => {
    for (const kind of ['asphalt', 'paving'] as const) {
      const shape = section(kind);
      for (const [x, direction] of [[0, 1], [8, -1]] as const) {
        const cap = paintedAt(shape, x, 0.15, direction);
        const aggregate = paintedAt(shape, x, 0.8, direction);
        const lowerAggregate = paintedAt(shape, x, 1.9, direction);
        const earth = paintedAt(shape, x, 2.3, direction);
        const deep = paintedAt(shape, x, 5.95, direction);
        expect(aggregate.r, kind).toBeGreaterThan(earth.r * 1.6);
        expect(lowerAggregate.r, kind).toBeGreaterThan(earth.r * 1.6);
        expect(earth.r).toBeGreaterThan(earth.b * 1.5);
        expect(Math.max(deep.r, deep.g, deep.b)).toBeLessThan(0.02);
        if (kind === 'asphalt') expect(aggregate.r).toBeGreaterThan(cap.r * 1.4);
      }
      shape.dispose();
    }
  });

  it('adds collinear front samples without moving the original street surface, even beside retracted edges', () => {
    // Stone (the shop's step) still uses the original street profile. Its shape is an independent reference
    // for the road's surface; new section rows may split its segments, never move beyond them or towards the
    // camera. The profile has 19 rows: one is where a drain's grate ends behind the path.
    const reference = section('stone');
    const before = reference.getAttribute('position');
    const originalRows = 19;
    const columns = new Map<number, Vector3[][]>();
    for (let first = 0; first < before.count; first += originalRows) {
      const points = Array.from({ length: originalRows }, (_, row) => new Vector3().fromBufferAttribute(before, first + row));
      const x = points[0]!.x;
      columns.set(x, [...(columns.get(x) ?? []), points]);
    }
    for (const kind of ['asphalt', 'paving'] as const) {
      const shape = section(kind);
      const at = shape.getAttribute('position');
      let nearStep = 0, sampled = 0;
      const point = new Vector3(), delta = new Vector3(), offset = new Vector3();
      for (let i = 0; i < at.count; i++) {
        point.fromBufferAttribute(at, i);
        // Actual wall faces gain extra vertical columns too; here check the front's profile columns.
        if (point.x === 0 || point.x === 8) continue;
        const originals = columns.get(point.x);
        expect(originals).toBeDefined();
        let distance = Infinity;
        for (const column of originals!) for (let row = 1; row < column.length; row++) {
          const a = column[row - 1]!, b = column[row]!;
          delta.copy(b).sub(a); offset.copy(point).sub(a);
          const k = Math.min(1, Math.max(0, offset.dot(delta) / delta.lengthSq()));
          distance = Math.min(distance, offset.addScaledVector(delta, -k).length());
        }
        expect(distance, `${kind} at ${point.toArray()}`).toBeLessThan(2e-5);
        expect(point.z).toBeLessThanOrEqual(5.60001);
        sampled++;
        if (point.x > 0 && point.x < 2.5 || point.x > 5.5 && point.x < 8) nearStep++;
      }
      expect(sampled).toBeGreaterThan(2000);
      expect(nearStep).toBeGreaterThan(200);
      shape.dispose();
    }
    reference.dispose();
  });

  it('keeps the playable top normals and texture coordinates of the unchanged street profile', () => {
    const reference = section('stone');
    const oldAt = reference.getAttribute('position'), oldNormal = reference.getAttribute('normal'), oldUv = reference.getAttribute('uv');
    const tops = new Map<string, { normal: number[]; uv: number[] }[]>();
    for (let i = 0; i < oldAt.count; i++) {
      if (oldNormal.getY(i) < 0.8) continue;
      const key = [oldAt.getX(i), oldAt.getY(i), oldAt.getZ(i)].join(',');
      tops.set(key, [...(tops.get(key) ?? []), { normal: [oldNormal.getX(i), oldNormal.getY(i), oldNormal.getZ(i)], uv: [oldUv.getX(i), oldUv.getY(i)] }]);
    }
    for (const kind of ['asphalt', 'paving'] as const) {
      const shape = section(kind);
      const at = shape.getAttribute('position'), normal = shape.getAttribute('normal'), uv = shape.getAttribute('uv');
      let matched = 0;
      for (let i = 0; i < at.count; i++) {
        if (normal.getY(i) < 0.8) continue;
        const key = [at.getX(i), at.getY(i), at.getZ(i)].join(',');
        const originals = tops.get(key);
        expect(originals, key).toBeDefined();
        expect(originals!.some((old) => old.normal.every((n, axis) => Math.abs(n - normal.getComponent(i, axis)) < 1e-5)
          && old.uv.every((v, axis) => Math.abs(v - uv.getComponent(i, axis)) < 1e-5)), key).toBe(true);
        matched++;
      }
      expect(matched).toBeGreaterThan(1000);
      shape.dispose();
    }
    reference.dispose();
  });
});
