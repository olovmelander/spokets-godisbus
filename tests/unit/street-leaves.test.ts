import { Box3, Matrix4, Vector3, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { heightAt } from '../../src/render/dressing/kit';
import { STREET_DEPTH, STREET_LEAF, street, streetLeaf } from '../../src/render/village';

const byn = COURSES['byn']!;

/** Every leaf on the village's street, stretch by stretch as the dressing lays them. */
function leaves() {
  const all: { x: number; y: number; z: number; up: Vector3 }[][] = [];
  for (let a = byn.ground[0]!.x - 12; a < byn.ground[byn.ground.length - 1]!.x + 12; a += 18) {
    const mesh = street(byn, a, a + 18, Math.round(a * 7 + 97)).getObjectByName('street-leaves') as InstancedMesh | undefined;
    if (!mesh) continue;
    const m = new Matrix4();
    all.push(Array.from({ length: mesh.count }, (_, i) => {
      mesh.getMatrixAt(i, m);
      const at = new Vector3().setFromMatrixPosition(m);
      return { x: at.x, y: at.y, z: at.z, up: new Vector3(0, 1, 0).transformDirection(m) };
    }));
  }
  return all;
}

describe("the street's birch leaves", () => {
  it('are each a pointed egg, broadest near its stalk, folded along its midrib with its face up', () => {
    const leaf = streetLeaf();
    leaf.computeBoundingBox();
    const size = leaf.boundingBox!.getSize(new Vector3());
    expect(size.x).toBeCloseTo(STREET_LEAF.long, 2);
    expect(size.z).toBeGreaterThan(STREET_LEAF.wide * 0.9);
    expect(size.z).toBeLessThanOrEqual(STREET_LEAF.wide + 1e-6);
    const at = leaf.getAttribute('position'), normal = leaf.getAttribute('normal');
    // Its edges lie higher than its midrib, and every face looks up.
    let widest = { x: 0, z: 0 };
    for (let i = 0; i < at.count; i++) {
      if (Math.abs(at.getZ(i)) > Math.abs(widest.z)) widest = { x: at.getX(i), z: at.getZ(i) };
      if (Math.abs(at.getZ(i)) < 1e-6) expect(at.getY(i)).toBeCloseTo(0, 6);
      else expect(at.getY(i)).toBeGreaterThan(0);
      expect(normal.getY(i)).toBeGreaterThan(0.95);
    }
    expect(widest.x).toBeLessThan(0);
  });

  it('show their faces, tipped towards the camera, and lie on the street, never where he walks or in the shop', () => {
    const all = leaves().flat();
    expect(all.length).toBeGreaterThan(200);
    for (const leaf of all) {
      expect(leaf.up.z).toBeGreaterThan(Math.sin(STREET_LEAF.tip[0]) - 1e-6);
      expect(leaf.up.y).toBeGreaterThan(Math.cos(STREET_LEAF.tip[1]) - 1e-6);
      expect(Math.abs(leaf.z)).toBeGreaterThan(0.45);
      expect(leaf.x).toBeLessThan(byn.shop!.door);
      expect(leaf.y - heightAt(byn, leaf.x)).toBeLessThan(0.03);
      expect(leaf.y).toBeGreaterThan(-2);
    }
  });

  it('lie mostly in drifts against the foot of a wall or a step', () => {
    const walls = byn.ground.filter((p, i) => i > 0 && byn.ground[i - 1]!.x === p.x).map((p) => p.x);
    const near = (leaf: { x: number; z: number }) => Math.abs(leaf.z - (STREET_DEPTH.near + 0.75)) < 0.6
      || walls.some((x) => Math.abs(leaf.x - x) < 1.4);
    const all = leaves().flat();
    expect(all.filter(near).length / all.length).toBeGreaterThan(0.5);
  });

  it('take one draw a stretch', () => {
    const group = street(byn, 60, 78, 517);
    expect(group.children.length).toBe(1);
    expect(new Box3().setFromObject(group).isEmpty()).toBe(false);
  });
});
