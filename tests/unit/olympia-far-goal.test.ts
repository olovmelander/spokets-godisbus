import { readFileSync } from 'node:fs';
import { type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';

/**
 * Olympia's far goal, the yard kit's `fotbollsmal-stort` (art/blender/a2-yard.py): he walks in at its mouth and out through
 * its back net, which is torn where the path goes through (Olov, 12 November 2026: "vi ska gå inne i målet inte bredvid").
 * Baked on Olov's computer; read here from the baked kit.
 */
describe("Olympia's far goal", () => {
  async function goal(): Promise<Object3D> {
    const file = readFileSync(new URL('../../art/baked/aventyr2/yard.glb', import.meta.url));
    const scene = (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
    const made = scene.getObjectByName('fotbollsmal-stort');
    if (!made) throw new Error('the yard kit has no fotbollsmal-stort');
    made.updateMatrixWorld(true);
    return made;
  }

  /** The net's points in the back's plane, within `half` across of `across` (the model's z, towards the camera), between two heights. */
  function back(made: Object3D, across: number, half: number, low: number, high: number): number {
    const p = new Vector3();
    let count = 0;
    made.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const at = mesh.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        if (Math.abs(p.x - 10) < 0.5 && Math.abs(p.z - across) < half && p.y > low && p.y < high) count++;
      }
    });
    return count;
  }

  it('is torn open where the path goes out through its back net, and whole elsewhere', async () => {
    const far = (olympia.storm?.buildings ?? []).find((b) => b.kind === 'goal' && (b.height ?? 0) > 12);
    expect(far).toBeDefined();
    const made = await goal();
    // The goal stands at z = far.z; the path is the play plane, z 0: in the model, that far in front of its middle.
    const path = 0 - far!.z!;
    // Under his head, where he goes through, no cord (its cut ends hang at the opening's edges, past 0.6 from the path).
    expect(back(made, path, 0.6, 0.2, 1.6)).toBe(0);
    // Beside the opening, and across the rest of the back, the net is there.
    expect(back(made, path - 3.2, 0.6, 0.2, 1.6)).toBeGreaterThan(10);
    expect(back(made, path, 0.6, 2.2, 6)).toBeGreaterThan(8);
  });
});
