import { InstancedMesh, Matrix4, Vector3, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';
import { nearEdge, pitchFibres, wetEdge, wetsOf } from '../../src/content/aventyr2/pitch';
import { slopeDrop } from '../../src/render/dressing/ground';
import type { Storm } from '../../src/sim/types';

/** Äventyr 2's buildings (src/content/aventyr2/buildings.ts): each is built, stands on its foot, and costs two draws at most. */
describe('Äventyr 2: the buildings', () => {
  const kinds: NonNullable<Storm['buildings']>[number]['kind'][] = ['jettyArm', 'pole', 'store', 'trestleTable', 'pitch', 'chess', 'sunboard', 'villa', 'barn', 'goal', 'floodlight', 'stand', 'clubhouse', 'tower', 'hut', 'birch', 'car', 'kota', 'church', 'bridge', 'woodshed', 'rowboat', 'swings', 'slide', 'picnic', 'volleyball', 'lodge', 'mailbox', 'cliff', 'spruce'];
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

  // Olov, 12 November 2026: "Man har en rak platta som gräs sen under den så böjer sig gräset på något sätt". It ran on
  // level 7 EL towards the camera, a plate over the ground rolling away under it; now it lies on the ground as the lawn
  // does (src/content/aventyr2/pitch.ts).
  it('lays a pitch level where he walks, and in front of the path down the ground\'s slope a finger over it, as far as the floor goes', () => {
    const made = building({ kind: 'pitch', x: 0, z: 0, width: 100, height: 22, marks: { halfway: 10, front: 7 } });
    const geometry = (made.group.children[0] as Mesh).geometry;
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeLessThan(0.2);
    expect(geometry.boundingBox!.max.z).toBeGreaterThanOrEqual(4.9);
    expect(geometry.boundingBox!.min.z).toBeLessThanOrEqual(-22);
    // As wide as it is told, and no wider: its last stripe ran on 9 EL past its end.
    expect(geometry.boundingBox!.max.x - geometry.boundingBox!.min.x).toBeCloseTo(100, 3);
    const position = geometry.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const [z, y] = [position.getZ(i), position.getY(i)];
      const ground = z <= 0.45 ? 0 : -slopeDrop(z);
      expect(y, `at z ${z.toFixed(2)}`).toBeGreaterThanOrEqual(ground - 1e-4);
      expect(y, `at z ${z.toFixed(2)}`).toBeLessThan(ground + 0.12);
    }
  });

  // Olov, 12 November 2026, of both of Olympia's puddles: "närmst kameran ser det bara ut som ett rakt streck".
  describe('Olympia\'s puddles and the turf\'s fibres', () => {
    const def = olympia.storm!.buildings!.find((b) => b.kind === 'pitch')!;
    const wets = wetsOf(def);

    it('brings each puddle\'s near edge round towards the camera from the pit\'s sides, and lets it wander', () => {
      expect(wets.length).toBe(2);
      for (const wet of wets) {
        const at = (x: number) => nearEdge(wet, x) + def.z;
        // At the pit's two sides it is the level path's edge, so that the hole is the pit's whole width where he walks.
        expect(at(wet.x0)).toBeCloseTo(0.45, 5);
        expect(at(wet.x1)).toBeCloseTo(0.45, 5);
        const middle = Array.from({ length: 41 }, (_, i) => at(wet.x0 + ((wet.x1 - wet.x0) * (0.25 + i / 80))));
        // Towards the camera, never past the turf's slope, and not straight across.
        for (const z of middle) {
          expect(z).toBeGreaterThan(0.6);
          expect(z).toBeLessThan(1.8);
        }
        expect(Math.max(...middle) - Math.min(...middle)).toBeGreaterThan(0.25);
      }
    });

    it('lays no turf over the water, between the back edge and the near edge', () => {
      const geometry = (building(def).group.children[0] as Mesh).geometry;
      const position = geometry.getAttribute('position');
      const centre = new Vector3();
      for (let t = 0; t + 2 < position.count; t += 3) {
        centre.set(0, 0, 0);
        for (let k = 0; k < 3; k++) centre.add(new Vector3().fromBufferAttribute(position, t + k).divideScalar(3));
        // Only what lies at the turf's height: the shores go down under the water.
        if (centre.y < -0.12) continue;
        for (const wet of wets) {
          if (centre.x < wet.x0 + 0.15 || centre.x > wet.x1 - 0.15) continue;
          const inside = centre.z > wetEdge(wet, centre.x) + 0.08 && centre.z < nearEdge(wet, centre.x) - 0.08;
          expect(inside, `turf at x ${(centre.x + def.x).toFixed(2)}, z ${(centre.z + def.z).toFixed(2)}`).toBe(false);
        }
      }
    });

    it('stands the turf\'s fibres in front of the path in stretches, none over his boots, and none in the water', () => {
      const group = pitchFibres(def);
      expect(group.children.length).toBeGreaterThan(5);
      const matrix = new Matrix4();
      const tip = new Vector3();
      let fibres = 0;
      for (const child of group.children) {
        const mesh = child as InstancedMesh;
        expect(mesh.isInstancedMesh).toBe(true);
        // A stretch at a time, so that only what is in the picture is drawn.
        expect(mesh.boundingSphere!.radius).toBeLessThan(14);
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          const [x, z] = [matrix.elements[12]!, matrix.elements[14]!];
          tip.set(0, 1, 0.22).applyMatrix4(matrix);
          fibres++;
          for (const wet of wets) {
            // (Along the water's edge one may stand a finger into it, as fibres do in a puddle's shallow edge.)
            if (x > wet.x0 + 0.1 && x < wet.x1 - 0.1) {
              expect(z > wetEdge(wet, x) + 0.1 && z < nearEdge(wet, x) - 0.1, `a fibre in the water at ${(x + def.x).toFixed(2)}, ${(z + def.z).toFixed(2)}`).toBe(false);
            }
          }
          // Away from the puddles' edges, none stands higher than the path: his boots are never hidden.
          if (wets.every((wet) => x < wet.x0 - 0.6 || x > wet.x1 + 0.6)) expect(tip.y, `a fibre at ${(x + def.x).toFixed(2)}`).toBeLessThanOrEqual(0.06);
        }
      }
      expect(fibres).toBeGreaterThan(5000);
    });
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
