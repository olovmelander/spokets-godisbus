import { readFileSync } from 'node:fs';
import { Box3, Group, type Object3D, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { rigWalker, STRIDE, walkPose, WALKER } from '../../src/render/passerby';

const THIGH = WALKER.hip - WALKER.knee;
const SHIN = WALKER.knee - WALKER.ankle;
const CYCLE = 2 * STRIDE.step;

/** The walker as the game installs it (./shared-models.ts): a clone of the named node, in a wrapper. */
async function installed(): Promise<{ copy: Group; mesh: SkinnedMesh }> {
  const file = readFileSync(new URL('../../art/baked/aventyr2/street.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  const made = gltf.scene.getObjectByName('fotgangare')!;
  const copy = new Group();
  copy.add(made.clone());
  let mesh: SkinnedMesh | null = null;
  copy.traverse((object: Object3D) => { if ((object as SkinnedMesh).isSkinnedMesh) mesh = object as SkinnedMesh; });
  return { copy, mesh: mesh! };
}

/** Its skin's points as posed, in the model's frame. */
function posed(copy: Group, mesh: SkinnedMesh): Vector3[] {
  copy.updateMatrixWorld(true);
  mesh.skeleton.update();
  const out: Vector3[] = [];
  const count = mesh.geometry.getAttribute('position').count;
  for (let i = 0; i < count; i++) out.push(mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld));
  return out;
}

describe('the grown-up walking past behind Byn', () => {
  it('keeps a standing foot where it was put, from the heel striking ahead to the toes leaving behind', () => {
    for (const leg of [0, 1] as const) {
      const start = leg === 0 ? 0 : CYCLE / 2;
      const strike = walkPose(start + 1e-4).legs[leg];
      const leave = walkPose(start + CYCLE * 0.6 - 1e-4).legs[leg];
      expect(strike.planted && leave.planted).toBe(true);
      // Ahead of the hips as it strikes, toes up; behind them as it pushes off, heel up.
      expect(strike.ankle.x).toBeGreaterThan(2.5);
      expect(strike.foot).toBeGreaterThan(0.25);
      expect(leave.ankle.x).toBeLessThan(-2);
      expect(leave.foot).toBeLessThan(-0.7);
      // Flat on the ground in between, it does not move along the ground as the body goes over it.
      const flat = [0.12, 0.2, 0.28, 0.34].map((k) => { const at = start + CYCLE * k; return walkPose(at).legs[leg].ankle.x + at; });
      for (const x of flat) expect(x).toBeCloseTo(flat[0]!, 6);
    }
  });

  it('bends its knees forward, a little standing and well over half a right angle in the swing, the legs keeping their length', () => {
    let swing = 0;
    for (let k = 0; k < 200; k++) {
      const walked = (k / 200) * CYCLE;
      const pose = walkPose(walked);
      for (const leg of pose.legs) {
        const bend = leg.thigh - leg.shin;
        expect(bend).toBeGreaterThan(0.02);
        if (!leg.planted) swing = Math.max(swing, bend);
        // The hips are where the thigh starts: its length to the knee, and the shin's to the ankle.
        expect(Math.hypot(leg.ankle.x - leg.knee.x, leg.ankle.y - leg.knee.y)).toBeCloseTo(SHIN, 2);
        expect(Math.hypot(leg.knee.x, leg.knee.y - pose.hips.y)).toBeLessThan(THIGH + 0.1);
      }
    }
    expect(swing).toBeGreaterThan(0.85);
    expect(swing).toBeLessThan(1.4);
  });

  it('moves smoothly: no joint jumps between one moment and the next, round the whole stride', () => {
    const step = 0.02;
    let before = walkPose(0);
    for (let walked = step; walked <= CYCLE + step; walked += step) {
      const now = walkPose(walked);
      expect(Math.abs(now.hips.y - before.hips.y)).toBeLessThan(0.05);
      for (const i of [0, 1]) {
        for (const key of ['thigh', 'shin', 'foot', 'toes', 'hem'] as const) {
          expect(Math.abs(now.legs[i]![key] - before.legs[i]![key]), `${key} at ${walked.toFixed(2)}`).toBeLessThan(0.06);
        }
        expect(Math.abs(now.legs[i]!.ankle.y - before.legs[i]!.ankle.y)).toBeLessThan(0.05);
      }
      before = now;
    }
  });

  it('dips its hips as its legs reach, never above walking height, and is the same at the same place', () => {
    const heights = Array.from({ length: 120 }, (_, k) => walkPose((k / 120) * CYCLE).hips.y);
    expect(Math.max(...heights)).toBeLessThanOrEqual(WALKER.hip);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(0.12);
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.6);
    expect(walkPose(37.25)).toEqual(walkPose(37.25));
  });

  it('walks the model made in Blender: its soles on the ground and still while they stand, the swinging boot clear of it', async () => {
    const { copy, mesh } = await installed();
    const walker = rigWalker(copy)!;
    expect(walker).not.toBeNull();
    // The copy's own bones drive its skin, not the source's.
    expect(mesh.skeleton.bones.every((bone) => copy.getObjectById(bone.id) === bone)).toBe(true);
    // The points under the right boot's heel, found as it was made, standing: the right is the near one, on +z.
    const rest = posed(copy, mesh);
    const right = rest.map((p, i) => [p, i] as const).filter(([p]) => p.y < 0.05 && p.z > 0.3 && p.x > -0.7 && p.x < 0.1).map(([, i]) => i);
    expect(right.length).toBeGreaterThan(2);
    let lowest = Infinity;
    const flat: number[] = [];
    for (let k = 0; k <= 40; k++) {
      // The right leg strikes half a stride after the left.
      const walked = CYCLE / 2 + (k / 40) * CYCLE;
      walker.pose(walked);
      const points = posed(copy, mesh);
      lowest = Math.min(lowest, ...points.map((p) => p.y));
      const phase = k / 40;
      const sole = right.map((i) => points[i]!);
      const low = Math.min(...sole.map((p) => p.y));
      if (phase > 0.14 && phase < 0.32) {
        // Standing flat: on the ground, and staying where it stands while the body walks on over it.
        expect(low).toBeLessThan(0.08);
        flat.push(sole[0]!.x + walked);
      }
      if (phase > 0.72 && phase < 0.9) expect(low, `swing at ${phase}`).toBeGreaterThan(0.25);
    }
    for (const x of flat) expect(x).toBeCloseTo(flat[0]!, 1);
    // Nothing goes down through the ground.
    expect(lowest).toBeGreaterThan(-0.08);
    // The coat goes up out of the picture, and the walker is a grown-up's height to him: its knee about five of him up.
    const size = new Box3().setFromPoints(rest).getSize(new Vector3());
    expect(size.y).toBeGreaterThan(20);
  });
});
