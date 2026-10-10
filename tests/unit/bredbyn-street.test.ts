import { describe, expect, it } from 'vitest';
import { Box3, Group, Mesh, MeshStandardMaterial } from 'three';
import { bredbynStreet } from '../../art/procedural/bredbyn-street';
import { BRED_BYN_CHIMNEYS, BRED_BYN_SMOKE_Z } from '../../src/content/bredbyn';
import { COURSES } from '../../src/content/chapters';
import { createLife } from '../../src/render/life';
import { lifePlan } from '../../src/render/life-plan';

describe('the Köpmangatan-inspired distant street', () => {
  it('uses bounded opaque lit geometry, without photograph textures or extra draw calls', () => {
    const street = bredbynStreet();
    const meshes = street.children as Mesh[];
    expect(meshes.length).toBeLessThanOrEqual(3);
    let triangles = 0;
    for (const mesh of meshes) {
      expect(mesh).toBeInstanceOf(Mesh);
      expect(mesh.material).toBeInstanceOf(MeshStandardMaterial);
      const material = mesh.material as MeshStandardMaterial;
      expect(material.vertexColors).toBe(true);
      expect(material.map).toBeNull();
      expect(material.transparent).toBe(false);
      const geometry = mesh.geometry;
      expect(geometry.groups).toHaveLength(0);
      const vertices = geometry.getAttribute('position');
      triangles += (geometry.index?.count ?? vertices.count) / 3;
      for (const key of ['position', 'normal', 'color']) {
        const attribute = geometry.getAttribute(key);
        expect(attribute.count).toBe(vertices.count);
        expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
      }
      // The facade and roof catch different light: these are volumes, not flat background cards.
      const normals = geometry.getAttribute('normal');
      expect(Array.from({ length: normals.count }, (_, i) => normals.getY(i)).some(y => y > 0.5 && y < 0.99)).toBe(true);
    }
    expect(triangles).toBeLessThan(7000);
  });

  it('keeps the street deeper than gameplay and the church, with houses beside the yard opening', () => {
    const street = bredbynStreet();
    for (const child of street.children) {
      const bounds = new Box3().setFromObject(child);
      expect(bounds.max.z).toBeLessThan(-40);
      expect(bounds.min.y).toBeGreaterThanOrEqual(-0.001);
      expect(bounds.max.y).toBeLessThan(16);
    }
    const bounds = new Box3().setFromObject(street);
    expect(bounds.min.x).toBeLessThan(0);
    expect(bounds.max.x).toBeGreaterThan(100);
  });

  it('starts smoke at real chimney cap surfaces in the authored geometry', () => {
    const street = bredbynStreet();
    for (const [x, y] of BRED_BYN_CHIMNEYS) {
      const onCap = street.children.some(child => {
        const geometry = (child as Mesh).geometry;
        const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
        for (let i = 0; i < position.count; i++) {
          if (normal.getY(i) > 0.99 && Math.abs(position.getY(i) - y) < 0.001 &&
            Math.abs(Math.abs(position.getX(i) - x) - 0.46) < 0.001 &&
            Math.abs(Math.abs(position.getZ(i) - BRED_BYN_SMOKE_Z) - 0.45) < 0.001) return true;
        }
        return false;
      });
      expect(onCap, `chimney ${x},${y}`).toBe(true);
    }
  });

  it('uses a translated world anchor and never repeats smoke above absent roofs', () => {
    const anchor = new Group();
    anchor.position.set(10, 3, BRED_BYN_SMOKE_Z);
    anchor.userData.chimneys = BRED_BYN_CHIMNEYS;
    const life = createLife(COURSES.byn, 'village', 0, anchor)!;
    const quiet = { busy: false, calm: false, eye: 12, slope: 0.4 };
    const at = BRED_BYN_CHIMNEYS[0][0] + anchor.position.x;
    life.update(at, 0, 4, 0, quiet);
    expect(life.mesh.geometry.drawRange.count).toBeGreaterThan(0);
    expect(life.mesh.position.toArray()).toEqual([at, 3, BRED_BYN_SMOKE_Z]);
    const plan = lifePlan('village', [], 0, null, BRED_BYN_CHIMNEYS)!;
    const watch = { ...quiet, clock: 4, night: 0, x: BRED_BYN_CHIMNEYS[0][0] };
    expect(plan.step(watch)).toBeGreaterThan(0);
    expect(plan.step({ ...watch, x: watch.x - 96 })).toBe(0);
    expect(plan.step({ ...watch, x: 1000 })).toBe(0);
  });
});
