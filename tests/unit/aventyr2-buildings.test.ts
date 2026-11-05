import { Vector3, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';
import type { Storm } from '../../src/sim/types';

/** Äventyr 2's buildings (src/content/aventyr2/buildings.ts): each is built, stands on its foot, and costs two draws at most. */
describe('Äventyr 2: the buildings', () => {
  const kinds: NonNullable<Storm['buildings']>[number]['kind'][] = ['jettyArm', 'pole', 'store', 'trestleTable', 'pitch', 'chess', 'sunboard', 'villa', 'barn', 'playhouse', 'goal', 'floodlight', 'stand', 'clubhouse', 'tower', 'hut', 'birch', 'car', 'kota', 'church', 'bridge', 'woodshed', 'rowboat', 'swings', 'slide', 'picnic', 'volleyball', 'lodge', 'mailbox', 'cliff', 'spruce'];
  for (const kind of kinds) {
    it(`builds the ${kind} in at most two meshes, standing where it is put`, () => {
      const made = building({ kind, x: 10, z: -8 });
      expect(made.group.children.length).toBeLessThanOrEqual(2);
      expect(made.group.position.x).toBe(10);
      expect(made.group.position.z).toBe(-8);
      for (const child of made.group.children) {
        const position = (child as import('three').Mesh).geometry.getAttribute('position');
        expect(position.count).toBeGreaterThan(0);
        for (let i = 0; i < position.count; i++) expect(Number.isFinite(position.getY(i))).toBe(true);
      }
    });
  }

  it('lays a pitch flat on the ground, on past the path towards the camera when it is told to', () => {
    const made = building({ kind: 'pitch', x: 0, z: 0, width: 100, height: 22, marks: { halfway: 10, front: 7 } });
    const geometry = (made.group.children[0] as Mesh).geometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeLessThan(0.2);
    expect(geometry.boundingBox!.max.z).toBeGreaterThanOrEqual(7);
    expect(geometry.boundingBox!.min.z).toBeLessThanOrEqual(-22);
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeGreaterThanOrEqual(100);
  });

  it('marks a building that a model takes the place of, and keeps a stand-in until then', () => {
    const made = building({ kind: 'clubhouse', x: 50, z: -66, model: 'olympia-hall' });
    expect(made.group.userData.model).toBe('olympia-hall');
    expect(made.group.children.length).toBeGreaterThan(0);
  });

  it('keeps the marks of a birch on its bark: nothing stands out of the stem below its crown', () => {
    const h = 70;
    const made = building({ kind: 'birch', x: 0, z: 0, height: h });
    const position = (made.group.children[0] as Mesh).geometry.getAttribute('position');
    let marks = 0;
    for (let i = 0; i < position.count; i++) {
      const y = position.getY(i);
      // The crown's lowest leaves hang from 0.66 of its height, less their own size.
      if (y > h * 0.5) continue;
      const bark = 1.6 + (0.9 - 1.6) * (y / h);
      const out = Math.hypot(position.getX(i), position.getZ(i));
      expect(out).toBeLessThan(bark + 0.1);
      if (out > bark + 0.005) marks++;
    }
    expect(marks).toBeGreaterThan(100);
  });

  it('turns the marks of a birch outwards, where the eye is: wound the other way they are never drawn', () => {
    const h = 70;
    const made = building({ kind: 'birch', x: 0, z: 0, height: h });
    const position = (made.group.children[0] as Mesh).geometry.getAttribute('position');
    const corner = (i: number) => new Vector3().fromBufferAttribute(position, i);
    let seen = 0;
    for (let t = 0; t + 2 < position.count; t += 3) {
      const [a, b, c] = [corner(t), corner(t + 1), corner(t + 2)];
      const middle = a.clone().add(b).add(c).divideScalar(3);
      if (middle.y > h * 0.5 || Math.hypot(middle.x, middle.z) < 1.6 + (0.9 - 1.6) * (middle.y / h) + 0.005) continue;
      const facing = b.clone().sub(a).cross(c.clone().sub(a));
      // A mark comes to a point at each end, and a triangle closed to a line has no side to turn.
      if (facing.length() < 1e-5) continue;
      seen++;
      expect(facing.dot(new Vector3(middle.x, 0, middle.z))).toBeGreaterThan(0);
    }
    expect(seen).toBeGreaterThan(50);
  });

  it('darkens a birch at its foot, as an old one is, and keeps it white above', () => {
    const made = building({ kind: 'birch', x: 0, z: 0, height: 70 });
    const geometry = (made.group.children[0] as Mesh).geometry;
    const position = geometry.getAttribute('position');
    const colour = geometry.getAttribute('color');
    const light = (from: number, to: number) => {
      let sum = 0, count = 0;
      for (let i = 0; i < position.count; i++) {
        const y = position.getY(i);
        if (y >= from && y <= to) { sum += colour.getX(i); count++; }
      }
      return sum / count;
    };
    expect(light(0, 1)).toBeLessThan(light(20, 30) * 0.6);
  });
});
