import { Vector3, type BufferAttribute } from 'three';
import { describe, expect, it } from 'vitest';
import { footballGeometry } from '../../src/render/football';

const pointKey = (at: BufferAttribute, i: number) => [at.getX(i), at.getY(i), at.getZ(i)].map(v => Math.round(v * 1e5)).join(',');

describe('the football skin', () => {
  it('is closed, round and outward-facing, with only shallow seams inside the unchanged unit radius', () => {
    const skin = footballGeometry(), at = skin.getAttribute('position') as BufferAttribute;
    const normals = skin.getAttribute('normal');
    const edges = new Map<string, number>();
    const a = new Vector3(), b = new Vector3(), c = new Vector3(), normal = new Vector3();
    for (let i = 0; i < at.count; i++) {
      a.fromBufferAttribute(at, i); normal.fromBufferAttribute(normals, i);
      expect(a.length()).toBeGreaterThan(.99);
      expect(a.length()).toBeLessThanOrEqual(1.000001);
      expect(normal.length()).toBeCloseTo(1, 5);
      expect(normal.dot(a)).toBeGreaterThan(.9);
    }
    for (let i = 0; i < at.count; i += 3) {
      a.fromBufferAttribute(at, i); b.fromBufferAttribute(at, i + 1); c.fromBufferAttribute(at, i + 2);
      expect(b.sub(a).cross(c.sub(a)).dot(a)).toBeGreaterThan(1e-9);
      for (let j = 0; j < 3; j++) {
        const key = [pointKey(at, i + j), pointKey(at, i + (j + 1) % 3)].sort().join('|');
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    // Every geometric edge is shared twice, even where three separate panel colours meet.
    expect(new Set(edges.values())).toEqual(new Set([2]));
    expect(skin.boundingSphere!.center.length()).toBeLessThan(1e-6);
    expect(skin.boundingSphere!.radius).toBeCloseTo(1, 6);
    skin.dispose();
  });

  it('has twelve separate crisp dark pentagons and twenty pale hexagons', () => {
    const skin = footballGeometry(), at = skin.getAttribute('position') as BufferAttribute, colour = skin.getAttribute('color');
    for (const [shade, expected, sides] of [['dark', 12, 5], ['pale', 20, 6]] as const) {
      const parent: number[] = [], owner = new Map<string, number>(), triangles: number[] = [];
      const find = (id: number): number => parent[id] === id ? id : find(parent[id]!);
      for (let i = 0; i < at.count; i += 3) {
        // Only solid panel interiors, excluding the narrow grey channel and the rounded lip.
        if (![0, 1, 2].every(j => shade === 'dark' ? colour.getX(i + j) < .04 : colour.getX(i + j) > .6)) continue;
        const id = parent.length; parent.push(id); triangles.push(i);
        for (let j = 0; j < 3; j++) {
          const key = pointKey(at, i + j), previous = owner.get(key);
          if (previous !== undefined) parent[find(id)] = find(previous); else owner.set(key, id);
        }
      }
      const panels = new Map<number, Map<string, Vector3>>();
      for (const [id, triangle] of triangles.entries()) {
        const root = find(id), vertices = panels.get(root) ?? new Map<string, Vector3>();
        for (let j = 0; j < 3; j++) vertices.set(pointKey(at, triangle + j), new Vector3().fromBufferAttribute(at, triangle + j));
        panels.set(root, vertices);
      }
      expect(panels.size).toBe(expected);
      for (const vertices of panels.values()) {
        const points = [...vertices.values()], centre = points.reduce((sum, p) => sum.add(p), new Vector3()).normalize();
        const x = new Vector3().crossVectors(centre, Math.abs(centre.y) < .9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0)).normalize();
        const y = new Vector3().crossVectors(centre, x);
        // Gnomonic projection straightens spherical panel edges. Its convex hull must have five/six actual corners.
        const round = (v: number) => Math.round(v * 1e6) / 1e6; // Float32 noise must not reorder points on a vertical edge.
        const projected = points.map(p => ({ x: round(p.dot(x) / p.dot(centre)), y: round(p.dot(y) / p.dot(centre)) })).sort((a, b) => a.x - b.x || a.y - b.y);
        const turn = (a: typeof projected[number], b: typeof a, c: typeof a) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
        const half = (list: typeof projected) => {
          const hull: typeof projected = [];
          for (const p of list) { while (hull.length > 1 && turn(hull.at(-2)!, hull.at(-1)!, p) <= 0) hull.pop(); hull.push(p); }
          return hull.slice(0, -1);
        };
        const hull = [...half(projected), ...half([...projected].reverse())];
        // Float32 positions can produce tiny extra bends along an otherwise straight edge.
        // Remove points within 0.00001 EL of the chord, not real panel corners.
        let changed = true;
        while (changed) {
          changed = false;
          for (let i = 0; i < hull.length; i++) {
            const a = hull[(i + hull.length - 1) % hull.length]!, b = hull[i]!, c = hull[(i + 1) % hull.length]!;
            if (Math.abs(turn(a, b, c)) / Math.hypot(c.x - a.x, c.y - a.y) < 1e-5) {
              hull.splice(i, 1); changed = true; break;
            }
          }
        }
        expect(hull.length).toBe(sides);
      }
    }
    skin.dispose();
  });
});
