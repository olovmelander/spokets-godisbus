import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { toneAt } from './ground';
import { KIT, grows, heightAt, sequence } from './kit';

// --- the bog ------------------------------------------------------------------------------------------------

/** One stretch of the bog: rust-red and green moss, straw sedge, dwarf birch in autumn red, cloudberry leaves. */
export function bog(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const cushions = new InstancedMesh(KIT.ball, KIT.moss, Math.round(length * 18));
  let n = 0;
  for (let i = 0; i < cushions.count; i++) {
    const x = from + next() * length;
    const z = depth(6.5, 0.22);
    if (!grows(chapter, x)) continue;
    const size = (0.06 + next() ** 2.2 * 0.3) * (z > 0.45 ? 0.55 : 1);
    const low = Math.abs(z) < 0.7 ? 0.5 : 1;
    place.position.set(x, top(x, z) - size * 0.35, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * (1 + next() * 0.5), size * low * (0.75 + next() * 0.45), size * (1 + next() * 0.5));
    place.updateMatrix();
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, toneAt('sphagnum', x * 2.1, z * 2.1, tint).multiplyScalar(0.85 + next() * 0.4));
  }
  cushions.count = n;

  // Sedge: straw-coloured in late September, in tufts.
  const sedge = new InstancedMesh(KIT.blade, KIT.straw, Math.round(length * 8));
  n = 0;
  for (let tuft = 0; n < sedge.count && tuft < sedge.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.12 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6.5;
    if (!grows(chapter, x)) continue;
    const tall = z > 0 ? 0.3 + next() * 0.35 : 0.6 + next() * 1.2;
    for (let k = 0; k < 4 + Math.floor(next() * 5) && n < sedge.count; k++) {
      const bx = x + (next() - 0.5) * 0.3;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.25);
      place.rotation.set((next() - 0.5) * 0.7, next() * 6.28, (next() - 0.5) * 0.7);
      place.scale.set(0.035 + next() * 0.03, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      sedge.setMatrixAt(n, place.matrix);
      sedge.setColorAt(n++, next() < 0.2 ? tint.set('#8f9a48') : tint.set('#d2b968').multiplyScalar(0.75 + next() * 0.4));
    }
  }
  sedge.count = n;

  // Dwarf birch: low twigs with small round leaves, red in autumn. Cloudberry leaves, orange, near the moss.
  const twigs = Math.round(length * 0.9);
  const birch = new InstancedMesh(KIT.ball, KIT.redLeaf, Math.max(1, twigs * 7));
  n = 0;
  for (let i = 0; i < twigs; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.2);
    if (!grows(chapter, x)) continue;
    for (let k = 0; k < 7; k++) {
      place.position.set(x + (next() - 0.5) * 0.4, top(x, z) + 0.12 + next() * 0.45, z + (next() - 0.5) * 0.3);
      place.rotation.set(next() * 1.2, next() * 6.28, next() * 1.2);
      place.scale.set(0.065, 0.014, 0.055);
      place.updateMatrix();
      birch.setMatrixAt(n++, place.matrix);
    }
  }
  birch.count = n;
  const cloud = new InstancedMesh(KIT.ball, KIT.orangeLeaf, Math.max(1, Math.round(length * 1.3)));
  n = 0;
  for (let i = 0; i < cloud.count; i++) {
    const x = from + next() * length;
    const z = depth(3.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.1 + next() * 0.08, z);
    place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
    place.scale.set(0.17 + next() * 0.06, 0.016, 0.15 + next() * 0.05);
    place.updateMatrix();
    cloud.setMatrixAt(n++, place.matrix);
  }
  cloud.count = n;

  // Cranberries, lying on the moss.
  const berries = new InstancedMesh(KIT.ball, KIT.berry, Math.max(1, Math.round(length * 1.6)));
  n = 0;
  for (let i = 0; i < berries.count; i++) {
    const x = from + next() * length;
    const z = depth(3, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.04, z);
    place.rotation.set(0, 0, 0);
    place.scale.setScalar(0.04 + next() * 0.012);
    place.updateMatrix();
    berries.setMatrixAt(n++, place.matrix);
  }
  berries.count = n;

  // Dead pines: grey and bare, far apart, some leaning, none taller than the picture.
  const dead = new InstancedMesh(KIT.snag, KIT.deadwood, 2);
  n = 0;
  for (let i = 0; i < 2; i++) {
    const x = from + next() * length;
    const z = -6 - next() * 12;
    if (next() > 0.45 || !grows(chapter, x)) continue;
    // Its broken top stays in the picture: from about 0.8 over the path, 10.5 in front of it, the camera sees
    // up to tan(15°) of the distance higher. The nearer, the smaller.
    const size = ((1.3 + Math.tan(Math.PI / 12) * (10.5 - z)) / 9.6) * (0.75 + next() * 0.2);
    place.rotation.set((next() - 0.5) * 0.1, next() * 6.28, (next() - 0.5) * 0.2);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.setScalar(size);
    place.updateMatrix();
    dead.setMatrixAt(n++, place.matrix);
  }
  dead.count = n;

  for (const mesh of [cushions, sedge, birch, cloud, berries, dead]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
