import { readFileSync } from 'node:fs';
import { type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';

/**
 * Olympia's two goals, the yard kit's `fotbollsmal` and `fotbollsmal-stort` (art/blender/a2-yard.py): he walks in at
 * each one's mouth and out through its back net, which is torn where the path goes through (Olov, 12 November 2026:
 * "vi ska gå inne i målet inte bredvid", and "Vi kan göra båda stora målen på samma sätt på Olympia?"). The training
 * goal is level on top, for him to walk along, and behind it stands the net's post, which he climbs (Olov, 14 November
 * 2026: "syns ingen stång att klättra på"). The far goal's back net stands clear of the range's first target (Olov, 14
 * November 2026: "Den första av de fem tavlor ... står mitt i nätet"). Baked on Olov's computer; read here from the kit.
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

  /** The model's points within `r` of an upright line at depth `x` and `across`, between two heights: how many, and how far out. */
  function about(made: Object3D, x: number, across: number, r: number, low: number, high: number): { count: number; out: number } {
    const p = new Vector3();
    let count = 0, out = 0;
    made.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const at = mesh.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        const from = Math.hypot(p.x - x, p.z - across);
        if (from < r && p.y > low && p.y < high) { count++; out = Math.max(out, from); }
      }
    });
    return { count, out };
  }

  it("behind the training goal stands the post he climbs: where the climb is, from the turf to over the goal's top", async () => {
    const training = goals.find((b) => b.level)!;
    const climb = olympia.climbs!.find((c) => c.look === 'ladder')!;
    const made = await goal('fotbollsmal');
    // Where the climb is along the path, behind the goal's back; and a little behind the path, so that he walks out past it.
    const x = climb.x - training.x;
    expect(x).toBeGreaterThan(training.width! + 0.1);
    expect(x).toBeLessThan(training.width! + 0.5);
    const path = 0 - training.z!;
    let across = NaN;
    for (let behind = 0.5; behind <= 1.2 && Number.isNaN(across); behind += 0.02) {
      if (about(made, x, path - behind, 0.05, 2.6, 3.2).count > 0) across = path - behind - 0.1;
    }
    expect(across, 'a post from 0.5 to 1.2 behind the path, at the climb').not.toBeNaN();
    // A tube a good hand thick, all the way up: at every height of the climb, and on over the goal's top to its cap.
    for (let y = 0.6; y < climb.top + 0.5; y += 0.6) {
      const ring = about(made, x, across, 0.3, y, y + 0.6);
      expect(ring.count, `the post at height ${y.toFixed(1)}`).toBeGreaterThan(6);
      expect(ring.out, `the post's thickness at height ${y.toFixed(1)}`).toBeGreaterThan(0.1);
    }
    expect(about(made, x, across, 0.3, climb.top + 0.3, climb.top + 0.9).count).toBeGreaterThan(6);
    expect(about(made, x, across, 0.3, climb.top + 1, climb.top + 3).count).toBe(0);
    // It stands on the turf, on its foot plate, which is wider than it.
    expect(about(made, x, across, 0.5, -0.01, 0.12).out).toBeGreaterThan(0.3);
    // He climbs from his feet's reach up: the climb is within the post, and ends at the goal's top.
    expect(climb.bottom).toBeGreaterThan(0.4);
    expect(climb.top).toBe(training.height);
    // Nothing of it stands where he walks out under the torn net.
    expect(points(made, x, path, 0.4, 0.1, 1.4)).toBe(0);
  });

  it("the far goal's back net stands well clear of the range's first target, which was seen through it", () => {
    const far = goals.find((b) => (b.height ?? 0) > 12)!;
    const targets = olympia.spots!.filter((spot) => spot.look === 'target');
    expect(targets.length).toBe(5);
    // The net's back bellies out 0.2 behind its frame; a target's plate is 1.1 across (src/content/aventyr2/render.ts).
    const net = far.x + far.width! + 0.2;
    const first = Math.min(...targets.map((t) => t.at.x)) - 0.55;
    expect(first - net).toBeGreaterThan(2.5);
    // And the targets stand a lane apart, each clear of the next.
    const xs = targets.map((t) => t.at.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(1.5);
    // No floodlight mast is seen behind a target that is in the picture. Far behind the path, a mast by the range passed
    // behind each target in turn as he went along it: a pale pole up out of the plate. (The camera is 12 EL from the
    // play plane at the range, the targets 1.2 behind it: a thing further back is seen that share of the way from the
    // picture's middle to where it stands. A target is in a 16:9 picture within 6 EL of its middle.)
    const masts = olympia.storm!.buildings!.filter((b) => b.kind === 'floodlight');
    expect(masts.length).toBe(4);
    for (const mast of masts) {
      const share = (12 + 1.2) / (12 - mast.z);
      for (const x of xs) {
        for (let camera = x - 6; camera <= x + 6; camera += 0.25) {
          const seenAt = camera + (mast.x - camera) * share;
          expect(Math.abs(seenAt - x), 'the mast at ' + mast.x + ' behind the target at ' + x + ', seen from ' + camera).toBeGreaterThan(0.9);
        }
      }
    }
  });
});
