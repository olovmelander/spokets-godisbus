import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { KIT, grows, heightAt, sequence } from './kit';

// --- the garden ---------------------------------------------------------------------------------------------

/** One stretch of the lawn, as he sees it: a jungle behind the path, stubble where he walks, and dew on it all. */
export function lawn(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const grass = new InstancedMesh(KIT.blade, KIT.lawn, Math.round(length * 36));
  let n = 0;
  for (let i = 0; i < grass.count; i++) {
    const x = from + next() * length;
    const where = next();
    // Behind the path it stands tall; on the path it is stubble, so that his boots show; in front it is short.
    const z = where < 0.55 ? -0.55 - next() ** 1.4 * 7.5 : where < 0.85 ? -0.5 + next() : 0.55 + next() * 0.4;
    const tall = where < 0.55 ? (0.5 + next() * 1.9) * Math.min(1, -z / 1.5 + 0.3) : where < 0.85 ? 0.07 + next() * 0.12 : 0.2 + next() * 0.3;
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z), z);
    place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
    place.scale.set(0.06 + next() * 0.07, tall, 1);
    place.updateMatrix();
    grass.setMatrixAt(n, place.matrix);
    grass.setColorAt(n++, next() < 0.14 ? tint.set('#c2c552').multiplyScalar(0.8 + next() * 0.3) : tint.set('#6fae34').multiplyScalar(0.7 + next() * 0.5));
  }
  grass.count = n;

  // Dew: on the ground, and on the grass behind him.
  const dew = new InstancedMesh(KIT.ball, KIT.dew, Math.round(length * 5));
  n = 0;
  for (let i = 0; i < dew.count; i++) {
    const x = from + next() * length;
    const z = depth(3.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + (z < -0.5 && next() < 0.6 ? 0.2 + next() * 0.9 : 0.035), z);
    place.rotation.set(0, 0, 0);
    place.scale.setScalar(0.016 + next() * 0.024);
    place.updateMatrix();
    dew.setMatrixAt(n++, place.matrix);
  }
  dew.count = n;

  // Dandelions, as tall as he is and taller.
  const flowers = Math.max(1, Math.round(length * 0.3));
  const stalks = new InstancedMesh(KIT.stalk, KIT.stem, flowers);
  const heads = new InstancedMesh(KIT.ball, KIT.petal, flowers);
  n = 0;
  for (let i = 0; i < flowers; i++) {
    const x = from + next() * length;
    const z = -0.9 - next() * 4;
    if (!grows(chapter, x)) continue;
    const tall = 0.9 + next() * 0.9;
    const lean = (next() - 0.5) * 0.25;
    place.position.set(x, top(x, z), z);
    place.rotation.set(0, 0, lean);
    place.scale.set(1.4, tall, 1.4);
    place.updateMatrix();
    stalks.setMatrixAt(n, place.matrix);
    place.position.set(x - Math.sin(lean) * tall, top(x, z) + Math.cos(lean) * tall, z);
    place.scale.set(0.19, 0.13, 0.19);
    place.updateMatrix();
    heads.setMatrixAt(n++, place.matrix);
  }
  stalks.count = n;
  heads.count = n;

  // Clover, three leaves to a stalk, and the birch's first yellow leaves on the ground.
  const sprigs = Math.round(length * 1.6);
  const clover = new InstancedMesh(KIT.ball, KIT.clover, Math.max(1, sprigs * 3));
  n = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z) + 0.14 + next() * 0.2;
    const turn = next() * 6.28;
    for (let k = 0; k < 3; k++) {
      const a = turn + k * 2.094;
      place.position.set(x + Math.cos(a) * 0.075, y, z + Math.sin(a) * 0.075);
      place.rotation.set(0.15, -a, 0.1);
      place.scale.set(0.085, 0.014, 0.07);
      place.updateMatrix();
      clover.setMatrixAt(n++, place.matrix);
    }
  }
  clover.count = n;
  const fallen = new InstancedMesh(KIT.ball, KIT.birchLeaf, Math.max(1, Math.round(length * 1.4)));
  n = 0;
  for (let i = 0; i < fallen.count; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.03, z);
    place.rotation.set((next() - 0.5) * 0.4, next() * 6.28, (next() - 0.5) * 0.4);
    place.scale.set(0.15, 0.012, 0.1);
    place.updateMatrix();
    fallen.setMatrixAt(n++, place.matrix);
  }
  fallen.count = n;

  // A birch now and then, far behind the path.
  const trunks = new InstancedMesh(KIT.trunk, KIT.birch, 2);
  n = 0;
  for (let i = 0; i < 2; i++) {
    const x = from + next() * length;
    const z = -8 - next() * 9;
    if (next() > 0.4 || !grows(chapter, x)) continue;
    const radius = 0.8 + next() * 0.4;
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.06);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 1, radius);
    place.updateMatrix();
    trunks.setMatrixAt(n++, place.matrix);
  }
  trunks.count = n;

  for (const mesh of [grass, dew, stalks, heads, clover, fallen, trunks]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
