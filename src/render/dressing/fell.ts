import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { KIT, grows, heightAt, sequence } from './kit';

// --- the mountain -------------------------------------------------------------------------------------------

/** One stretch of the mountain: reindeer lichen like small white shrubs, crowberry, dry grass and boulders. */
export function fell(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const clumps = Math.round(length * 2.6);
  const lichen = new InstancedMesh(KIT.ball, KIT.lichen, Math.max(1, clumps * 5));
  let n = 0;
  for (let i = 0; i < clumps; i++) {
    const x = from + next() * length;
    const z = depth(6, 0.25);
    if (!grows(chapter, x)) continue;
    const size = (0.07 + next() * 0.12) * (Math.abs(z) < 0.7 ? 0.5 : 1);
    for (let k = 0; k < 5; k++) {
      const ball = size * (0.6 + next() * 0.6);
      place.position.set(x + (next() - 0.5) * size * 3, top(x, z) + ball * 0.5, z + (next() - 0.5) * size * 2.4);
      place.rotation.set(0, next() * 6.28, 0);
      place.scale.set(ball, ball * 0.8, ball);
      place.updateMatrix();
      lichen.setMatrixAt(n++, place.matrix);
    }
  }
  lichen.count = n;

  // Crowberry: low dark sprigs with black berries.
  const sprigs = Math.round(length * 0.9);
  const leaves = new InstancedMesh(KIT.ball, KIT.crowLeaf, Math.max(1, sprigs * 8));
  const berries = new InstancedMesh(KIT.ball, KIT.blackBerry, Math.max(1, sprigs * 3));
  let leaf = 0;
  let berry = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3.2, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z);
    for (let k = 0; k < 8; k++) {
      place.position.set(x + (next() - 0.5) * 0.28, y + 0.05 + next() * 0.16, z + (next() - 0.5) * 0.24);
      place.rotation.set(next() * 1.4, next() * 6.28, next() * 1.4);
      place.scale.set(0.06, 0.013, 0.022);
      place.updateMatrix();
      leaves.setMatrixAt(leaf++, place.matrix);
    }
    for (let k = 0; k < 1 + Math.floor(next() * 3); k++) {
      place.position.set(x + (next() - 0.5) * 0.24, y + 0.08 + next() * 0.08, z + (next() - 0.5) * 0.2);
      place.rotation.set(0, 0, 0);
      place.scale.setScalar(0.04);
      place.updateMatrix();
      berries.setMatrixAt(berry++, place.matrix);
    }
  }
  leaves.count = leaf;
  berries.count = berry;

  // Dry grass, where there is a crack for it.
  const grass = new InstancedMesh(KIT.blade, KIT.straw, Math.round(length * 3.5));
  n = 0;
  for (let tuft = 0; n < grass.count && tuft < grass.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.15 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6;
    if (!grows(chapter, x)) continue;
    const tall = 0.3 + next() * 0.6;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && n < grass.count; k++) {
      const bx = x + (next() - 0.5) * 0.2;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.2);
      place.rotation.set((next() - 0.5) * 0.8, next() * 6.28, (next() - 0.5) * 0.8);
      place.scale.set(0.03 + next() * 0.03, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      grass.setMatrixAt(n, place.matrix);
      grass.setColorAt(n++, tint.set('#cdb878').multiplyScalar(0.75 + next() * 0.4));
    }
  }
  grass.count = n;

  // Boulders, bare. The crooked pines come when a pine has a crown: a bare trunk reads as a pole.
  const stones = new InstancedMesh(KIT.bare, KIT.stone, Math.max(1, Math.round(length * 0.45)));
  n = 0;
  for (let i = 0; i < stones.count; i++) {
    const x = from + next() * length;
    const z = -1.4 - next() ** 1.4 * 9;
    if (!grows(chapter, x)) continue;
    const size = 0.3 + next() ** 1.8 * 1.3;
    place.position.set(x, top(x, z) + size * 0.2, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * 1.3, size * 0.8, size);
    place.updateMatrix();
    stones.setMatrixAt(n, place.matrix);
    stones.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.85 + next() * 0.3));
  }
  stones.count = n;

  for (const mesh of [lichen, leaves, berries, grass, stones]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
