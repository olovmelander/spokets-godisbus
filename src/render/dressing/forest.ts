import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { KIT, grows, heightAt, mossAt, sequence } from './kit';

// --- the forest ---------------------------------------------------------------------------------------------

/** One stretch of it, each kind as one instanced mesh. */
export function stretch(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  /** A depth behind the play plane or just in front of it, never where he walks. */
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  // Moss cushions: what makes the carpet a carpet.
  const cushions = new InstancedMesh(KIT.ball, KIT.moss, Math.round(length * 22));
  let n = 0;
  for (let i = 0; i < cushions.count; i++) {
    const x = from + next() * length;
    const z = depth(6.5, 0.22);
    if (!grows(chapter, x)) continue;
    // Many small ones and a few big; low where he walks, so that his boots show.
    const size = (0.06 + next() ** 2.2 * 0.3) * (z > 0.45 ? 0.55 : 1);
    const low = Math.abs(z) < 0.7 ? 0.5 : 1;
    place.position.set(x, top(x, z) - size * 0.35, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * (1 + next() * 0.5), size * low * (0.75 + next() * 0.45), size * (1 + next() * 0.5));
    place.updateMatrix();
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, mossAt(x * 2.1, z * 2.1, tint).multiplyScalar(0.85 + next() * 0.4));
  }
  cushions.count = n;

  // Grass and sedge: thin blades in tufts, mostly behind him, some already autumn gold.
  const grass = new InstancedMesh(KIT.blade, KIT.grass, Math.round(length * 9));
  n = 0;
  for (let tuft = 0; n < grass.count && tuft < grass.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.12 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6.5;
    if (!grows(chapter, x)) continue;
    const tall = z > 0 ? 0.35 + next() * 0.4 : 0.7 + next() * 1.6;
    const gold = next() < 0.3;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && n < grass.count; k++) {
      const bx = x + (next() - 0.5) * 0.3;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.25);
      place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
      place.scale.set(0.07 + next() * 0.07, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      grass.setMatrixAt(n, place.matrix);
      grass.setColorAt(n++, gold ? tint.set('#c9b54e').multiplyScalar(0.8 + next() * 0.3) : tint.set('#6f9434').multiplyScalar(0.7 + next() * 0.5));
    }
  }
  grass.count = n;

  // Lingonberry sprigs: small glossy leaves, and red berries the size of his fist.
  const sprigs = Math.round(length * 1.1);
  const leaves = new InstancedMesh(KIT.ball, KIT.leaf, Math.max(1, sprigs * 6));
  const berries = new InstancedMesh(KIT.ball, KIT.berry, Math.max(1, sprigs * 3));
  let leaf = 0;
  let berry = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3.2, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z);
    const turn = next() * 6.28;
    for (let k = 0; k < 6; k++) {
      const a = turn + k * 1.05;
      const h = 0.1 + k * 0.045;
      place.position.set(x + Math.cos(a) * 0.09, y + h, z + Math.sin(a) * 0.09);
      place.rotation.set(0.5, -a, 0.35);
      place.scale.set(0.085, 0.016, 0.05);
      place.updateMatrix();
      leaves.setMatrixAt(leaf++, place.matrix);
    }
    for (let k = 0; k < 1 + Math.floor(next() * 3); k++) {
      const a = turn + 0.5 + k * 2.1;
      place.position.set(x + Math.cos(a) * 0.12, y + 0.1 + next() * 0.07, z + Math.sin(a) * 0.12);
      place.rotation.set(0, 0, 0);
      place.scale.setScalar(0.05 + next() * 0.012);
      place.updateMatrix();
      berries.setMatrixAt(berry++, place.matrix);
    }
  }
  leaves.count = leaf;
  berries.count = berry;

  // Spruce cones, half an Elof long, lying where they fell; and the needles under everything.
  const cones = new InstancedMesh(KIT.cone, KIT.coneWood, Math.max(1, Math.round(length * 0.32)));
  n = 0;
  for (let i = 0; i < cones.count; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.15);
    if (!grows(chapter, x) || Math.abs(z) < 0.6) continue;
    place.position.set(x, top(x, z) + 0.13, z);
    place.rotation.set(Math.PI / 2 + (next() - 0.5) * 0.3, next() * 6.28, next() * 6.28, 'YXZ');
    place.scale.setScalar(0.42 + next() * 0.14);
    place.updateMatrix();
    cones.setMatrixAt(n++, place.matrix);
  }
  cones.count = n;
  const needles = new InstancedMesh(KIT.needle, KIT.needleWood, Math.round(length * 7));
  n = 0;
  for (let i = 0; i < needles.count; i++) {
    const x = from + next() * length;
    const z = depth(4.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.012, z);
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.3);
    place.scale.set(0.16 + next() * 0.14, 1, 1);
    place.updateMatrix();
    needles.setMatrixAt(n++, place.matrix);
  }
  needles.count = n;

  // The spruces themselves: trunks like pillars, 2.7 EL across, with a foot of roots and moss.
  const trunks = new InstancedMesh(KIT.trunk, KIT.bark, Math.ceil(length / 4.5) + 1);
  n = 0;
  for (let x = from + next() * 4; x < to && n < trunks.count; x += 4.5 + next() * 6.5) {
    // Some stand close behind the path, and more of them further in.
    const z = next() < 0.3 ? -3.6 - next() * 2.5 : -7 - next() * 15;
    const radius = (1 + next() * 0.45) * (z < -12 ? 0.8 : 1);
    if (!grows(chapter, x)) continue;
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.04);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 1, radius);
    place.updateMatrix();
    trunks.setMatrixAt(n, place.matrix);
    trunks.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.8 + next() * 0.4));
  }
  trunks.count = n;

  // Stones under the moss.
  const stones = new InstancedMesh(KIT.boulder, KIT.stone, Math.max(1, Math.round(length * 0.2)));
  n = 0;
  for (let i = 0; i < stones.count; i++) {
    const x = from + next() * length;
    const z = -1.3 - next() * 5;
    if (!grows(chapter, x)) continue;
    const size = 0.25 + next() * 0.55;
    place.position.set(x, top(x, z) + size * 0.15, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * 1.3, size * 0.8, size);
    place.updateMatrix();
    stones.setMatrixAt(n, place.matrix);
    stones.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.85 + next() * 0.3));
  }
  stones.count = n;

  for (const mesh of [cushions, grass, leaves, berries, cones, needles, trunks, stones]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Its bounds are those of its instances, so a stretch out of the picture is not drawn.
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
