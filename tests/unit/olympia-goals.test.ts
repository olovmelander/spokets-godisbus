import { readFileSync } from 'node:fs';
import { type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';

/**
 * Olympia's two goals, the yard kit's `fotbollsmal` and `fotbollsmal-stort` (art/blender/a2-yard.py): he walks in at
 * each one's mouth and out through its back net, which is torn where the path goes through (Olov, 12 November 2026:
 * "vi ska gå inne i målet inte bredvid", and "Vi kan göra båda stora målen på samma sätt på Olympia?"). The training
 * goal is level on top, for him to walk along. Baked on Olov's computer; read here from the baked kit.
 */
describe("Olympia's goals", () => {
  async function goal(name: string): Promise<Object3D> {
    const file = readFileSync(new URL('../../art/baked/aventyr2/yard.glb', import.meta.url));
    const scene = (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
    const made = scene.getObjectByName(name);
    if (!made) throw new Error(`the yard kit has no ${name}`);
    made.updateMatrixWorld(true);
    return made;
  }

  /** The model's points within `half` of a depth `x` and of `across` (its z, towards the camera), between two heights. */
  function points(made: Object3D, x: number, across: number, half: number, low: number, high: number): number {
    const p = new Vector3();
    let count = 0;
    made.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const at = mesh.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        if (Math.abs(p.x - x) < 0.5 && Math.abs(p.z - across) < half && p.y > low && p.y < high) count++;
      }
    });
    return count;
  }

  const goals = olympia.storm?.buildings?.filter((b) => b.kind === 'goal') ?? [];

  it('the far goal is torn open where the path goes out through its back net, and whole elsewhere', async () => {
    const far = goals.find((b) => (b.height ?? 0) > 12);
    expect(far).toBeDefined();
    const made = await goal('fotbollsmal-stort');
    // The goal stands at z = far.z; the path is the play plane, z 0: in the model, that far in front of its middle.
    const path = 0 - far!.z!;
    const back = far!.width ?? 10;
    // Under his head, where he goes through, no cord (its cut ends hang at the opening's edges, past 0.6 from the path).
    expect(points(made, back, path, 0.6, 0.2, 1.6)).toBe(0);
    // Beside the opening, and across the rest of the back, the net is there.
    expect(points(made, back, path - 3.2, 0.6, 0.2, 1.6)).toBeGreaterThan(10);
    expect(points(made, back, path, 0.6, 2.2, 6)).toBeGreaterThan(8);
  });

  it('the training goal is the same: torn where he goes out, and level on top where he walks', async () => {
    const training = goals.find((b) => b.level);
    expect(training).toBeDefined();
    // The model is 6 high and 7 deep, the size the chapter asks for, so it is drawn at its own size.
    expect(training!.height).toBe(6);
    expect(training!.width).toBe(7);
    const made = await goal('fotbollsmal');
    const path = 0 - training!.z!;
    expect(points(made, 7, path, 0.55, 0.2, 1.4)).toBe(0);
    expect(points(made, 7, path - 3, 0.55, 0.2, 1.4)).toBeGreaterThan(10);
    expect(points(made, 7, path, 0.55, 1.9, 5.8)).toBeGreaterThan(8);
    // The top: a net stretched level at the bar's height all the way back, under where he walks.
    for (const x of [1.5, 3.5, 5.5]) expect(points(made, x, path, 1, 5.75, 6.05)).toBeGreaterThan(8);
  });
});
