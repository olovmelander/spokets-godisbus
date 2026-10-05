import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { buildHooks, ringPlaces } from '../../src/render/rings';
import type { Hook } from '../../src/sim/types';

// The red rings: one mesh for each place they hang in, drawn only while the place is in sight.

const ring = (x: number, y: number): Hook => ({ x, y, length: 2.6 });

describe('the rings, as they are drawn', () => {
  it('rings in a row are one place, and rings far apart are places of their own', () => {
    const hooks = [ring(40, 5), ring(12, 4), ring(16, 4), ring(44, 5), ring(20, 4)];
    expect(ringPlaces(hooks).map((place) => place.map((hook) => hook.x))).toEqual([[12, 16, 20], [40, 44]]);
    expect(ringPlaces([])).toEqual([]);
  });

  it('a place is one mesh with a ring at every hook, as large as the row for the picture\'s eye', () => {
    const built = buildHooks({ hooks: [ring(12, 4), ring(16, 4), ring(20, 4), ring(60, 7)] });
    expect(built.name).toBe('rings');
    const meshes = built.children as InstancedMesh[];
    expect(meshes.map((mesh) => mesh.count)).toEqual([3, 1]);
    const matrix = new Matrix4();
    const at = new Vector3();
    meshes[0]!.getMatrixAt(1, matrix);
    expect(at.setFromMatrixPosition(matrix).x).toBe(16);
    expect(at.y).toBe(4);
    // Just behind the plane he moves in.
    expect(at.z).toBeLessThan(0);
    for (const mesh of meshes) expect(mesh.frustumCulled).toBe(true);
    expect(meshes[0]!.boundingSphere!.center.x).toBeCloseTo(16);
    expect(meshes[0]!.boundingSphere!.radius).toBeGreaterThan(4);
    expect(meshes[0]!.boundingSphere!.radius).toBeLessThan(5);
    expect(meshes[1]!.boundingSphere!.radius).toBeLessThan(1);
    // The rings share one shape and one red.
    expect(meshes[1]!.geometry).toBe(meshes[0]!.geometry);
    expect(meshes[1]!.material).toBe(meshes[0]!.material);
  });

  it('a chapter without hooks draws nothing for them, and no chapter has more places than side ways and swings', () => {
    expect(buildHooks({}).children).toHaveLength(0);
    for (const chapter of [...STORY, ...BONUS]) {
      const places = ringPlaces(chapter.hooks ?? []);
      expect(buildHooks(chapter).children, chapter.id).toHaveLength(places.length);
      expect(places.length, chapter.id).toBeLessThanOrEqual(4);
    }
  });
});
