import { readFileSync } from 'node:fs';
import { Group, type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { heightAt } from '../robot/robot';

/**
 * The frog on the far bank in Älven, after Pappa's scarf. Olov, 14 November 2026: "Efter att Elof har åkt på halsduken
 * står en groda mitt inne i stubben. Fixa grodans placering". It sat at the sawn stump's own x, 0.9 EL in front of the
 * stump's middle: inside its trunk as the camera sees it.
 */
describe('the frog on Älven\'s far bank', () => {
  /**
   * How far it hops to either side when he comes (src/content/aventyr2/render.ts, `kit`), and how far in or out of the
   * bank a hop can take it: it turns at most 0.15 from the path's line, plus what brings it back to its own line
   * (src/render/ambient-animals.ts, `startHop`).
   */
  const HOP = 0.6;
  const DRIFT = 0.12;
  /** Half its length and half its width as it sits, at the size the chapter gives it. */
  const frog = alven.decor!.find((d) => d.word === 'groda')!;
  const body = 0.35 * (frog.scale ?? 1);
  const wide = 0.25 * (frog.scale ?? 1);
  const z = frog.z ?? -0.6;
  /** Where it can be: where it sits, and where a hop to either side lands it. */
  const places = [-HOP, 0, HOP].flatMap((dx) => [-DRIFT, 0, DRIFT].map((dz) => ({ x: frog.at.x + dx, z: z + (dx === 0 ? 0 : dz) })));

  async function kit(): Promise<Object3D> {
    const file = readFileSync(new URL('../../art/baked/aventyr2/nature.glb', import.meta.url));
    return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
  }

  /** Every corner of a decor's kit model that stands over the ground, placed as the picture places it. */
  function corners(made: Object3D, d: NonNullable<typeof alven.decor>[number]): Vector3[] {
    const holder = new Group();
    holder.position.set(d.at.x, d.at.y, d.z ?? -0.6);
    holder.rotation.y = d.turn ?? 0;
    holder.scale.setScalar(d.scale ?? 1);
    holder.add(made.clone());
    holder.updateMatrixWorld(true);
    const out: Vector3[] = [];
    holder.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const at = mesh.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const p = new Vector3().fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        if (p.y > heightAt(alven, p.x) + 0.02) out.push(p);
      }
    });
    return out;
  }

  it('sits on the bank\'s own ground, between its edge and the first step, wherever it hops', () => {
    expect(frog.at.y).toBe(0);
    for (const place of places) {
      for (const side of [-body, body]) expect(heightAt(alven, place.x + side), `at ${place.x}`).toBeCloseTo(frog.at.y, 5);
    }
  });

  it('is just behind the path: never where he walks, and near enough to be in the picture\'s focus', () => {
    for (const place of places) {
      // His boots reach a quarter of an EL behind the path's line.
      expect(place.z + wide, `at ${place.x}`).toBeLessThan(-0.25);
      expect(place.z, `at ${place.x}`).toBeGreaterThan(-1.2);
    }
  });

  it('is clear of the sawn stump and of every stump, branch and log of the kit, where it sits and where it lands', async () => {
    const scene = await kit();
    const things = alven.decor!.filter((d) => d.look === 'kit' && scene.getObjectByName(d.word!));
    expect(things.some((d) => d.word === 'stubbe-sagad')).toBe(true);
    for (const d of things) {
      if (Math.abs(d.at.x - frog.at.x) > 8) continue;
      const shape = corners(scene.getObjectByName(d.word!)!, d);
      for (const place of places) {
        const nearest = Math.min(...shape.map((p) => Math.hypot(p.x - place.x, p.z - place.z)));
        expect(nearest, `${d.word} at ${d.at.x}, the frog at ${place.x}`).toBeGreaterThan(body + 0.15);
      }
      // Nor does one stand right behind it, so that it is seen against the thing: the camera looks along z.
      const behind = shape.filter((p) => Math.abs(p.x - frog.at.x) < body && p.z < z);
      expect(behind.length, `${d.word} at ${d.at.x} behind the frog`).toBe(0);
    }
  });

  it('is between two of the trail\'s sweets and clear of the reeds, with none in front of it where it sits', () => {
    const low = alven.candy.filter((c) => Math.abs(c.y - (frog.at.y + 0.45)) < 0.3);
    const before = low.filter((c) => c.x < frog.at.x).sort((a, b) => b.x - a.x)[0]!;
    const after = low.filter((c) => c.x > frog.at.x).sort((a, b) => a.x - b.x)[0]!;
    expect(frog.at.x - before.x).toBeGreaterThan(0.8);
    expect(after.x - frog.at.x).toBeGreaterThan(0.8);
    // A hop never lands it under a sweet either.
    for (const place of places) for (const c of low) expect(Math.abs(c.x - place.x), `the sweet at ${c.x}`).toBeGreaterThan(0.25);
    for (const reed of alven.decor!.filter((d) => d.look === 'reed')) {
      if ((reed.z ?? 0) < z) continue;
      expect(Math.abs(reed.at.x - frog.at.x), `the reeds at ${reed.at.x}`).toBeGreaterThan(1.5);
    }
  });
});
