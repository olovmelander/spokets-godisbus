import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { floorDrop, shoreAt } from './ground';
import { KIT, grows, heightAt, mossAt, sequence } from './kit';

// --- the forest ---------------------------------------------------------------------------------------------

/** One stretch of it, each kind as one instanced mesh. */
export function stretch(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  /** The floor's height at a place, which in front of the path slopes down towards the camera. */
  const top = (x: number, z: number) => heightAt(chapter, x) - (floorDrop(chapter, x, z) ?? 0);
  /** A depth for something at x: its own, or behind the path's edge where the floor in front has drawn back. */
  const settle = (x: number, z: number, back = 0.4) => (floorDrop(chapter, x, z) === null ? back : z);
  // What lies on the floor in front of the path is put there last, with numbers of its own.
  const FRONT = { cushions: 5, blades: 10, sprigs: 0.35, cones: 0.2, needles: 12, stones: 0.18 };
  /** A depth behind the play plane or just in front of it, never where he walks. */
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  // Moss cushions: what makes the carpet a carpet.
  const cushionsBehind = Math.round(length * 22);
  const cushions = new InstancedMesh(KIT.ball, KIT.moss, cushionsBehind + Math.round(length * FRONT.cushions));
  let n = 0;
  for (let i = 0; i < cushionsBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(6.5, 0.22));
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
  const bladesBehind = Math.round(length * 9);
  const grass = new InstancedMesh(KIT.blade, KIT.grass, bladesBehind + Math.round(length * FRONT.blades));
  n = 0;
  for (let tuft = 0; n < bladesBehind && tuft < bladesBehind; tuft++) {
    const x = from + next() * length;
    const z = settle(x, next() < 0.12 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6.5);
    if (!grows(chapter, x)) continue;
    const tall = z > 0 ? 0.35 + next() * 0.4 : 0.7 + next() * 1.6;
    const gold = next() < 0.3;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && n < bladesBehind; k++) {
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
  const sprigsInFront = Math.round(length * FRONT.sprigs);
  const leaves = new InstancedMesh(KIT.bead, KIT.leaf, Math.max(1, (sprigs + sprigsInFront) * 6));
  const berries = new InstancedMesh(KIT.bead, KIT.berry, Math.max(1, (sprigs + sprigsInFront) * 3));
  let leaf = 0;
  let berry = 0;
  /** One sprig: six leaves up a stem, and its berries. */
  const sprig = (x: number, y: number, z: number, turn: number, draw: () => number) => {
    for (let k = 0; k < 6; k++) {
      const a = turn + k * 1.05;
      const h = 0.1 + k * 0.045;
      place.position.set(x + Math.cos(a) * 0.09, y + h, z + Math.sin(a) * 0.09);
      place.rotation.set(0.5, -a, 0.35);
      place.scale.set(0.085, 0.016, 0.05);
      place.updateMatrix();
      leaves.setMatrixAt(leaf++, place.matrix);
    }
    for (let k = 0; k < 1 + Math.floor(draw() * 3); k++) {
      const a = turn + 0.5 + k * 2.1;
      place.position.set(x + Math.cos(a) * 0.12, y + 0.1 + draw() * 0.07, z + Math.sin(a) * 0.12);
      place.rotation.set(0, 0, 0);
      place.scale.setScalar(0.05 + draw() * 0.012);
      place.updateMatrix();
      berries.setMatrixAt(berry++, place.matrix);
    }
  };
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(3.2, 0.3));
    if (!grows(chapter, x)) continue;
    sprig(x, top(x, z), z, next() * 6.28, next);
  }
  leaves.count = leaf;
  berries.count = berry;

  // Spruce cones, half an Elof long, lying where they fell; and the needles under everything.
  const conesBehind = Math.max(1, Math.round(length * 0.32));
  const cones = new InstancedMesh(KIT.cone, KIT.coneWood, conesBehind + Math.round(length * FRONT.cones));
  n = 0;
  for (let i = 0; i < conesBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(4, 0.15), -0.7);
    if (!grows(chapter, x) || Math.abs(z) < 0.6) continue;
    place.position.set(x, top(x, z) + 0.13, z);
    place.rotation.set(Math.PI / 2 + (next() - 0.5) * 0.3, next() * 6.28, next() * 6.28, 'YXZ');
    place.scale.setScalar(0.42 + next() * 0.14);
    place.updateMatrix();
    cones.setMatrixAt(n++, place.matrix);
  }
  cones.count = n;
  const needlesBehind = Math.round(length * 7);
  const needles = new InstancedMesh(KIT.needle, KIT.needleWood, needlesBehind + Math.round(length * FRONT.needles));
  n = 0;
  for (let i = 0; i < needlesBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(4.5, 0.3));
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
  const stonesBehind = Math.max(1, Math.round(length * 0.2));
  const stones = new InstancedMesh(KIT.boulder, KIT.stone, stonesBehind + Math.round(length * FRONT.stones));
  n = 0;
  for (let i = 0; i < stonesBehind; i++) {
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

  // The floor in front of the path: the same things, lying down the slope towards the camera. Nothing there
  // stands higher than the path it lies under, less a finger, so that nothing ever covers his boots.
  const front = sequence(seed * 31 + 7);
  const lie = (reach = 3.9) => {
    const x = from + front() * length;
    const z = 0.55 + front() ** 0.85 * reach;
    // In front of a pool the floor is its near shore, from a hand in front of the water.
    const shore = shoreAt(chapter, x);
    const drop = shore !== null ? (z > 0.75 ? floorDrop(chapter, x, z) : null) : grows(chapter, x) ? floorDrop(chapter, x, z) : null;
    return drop === null ? null : { x, z, y: (shore ?? heightAt(chapter, x)) - drop, room: drop - 0.05 };
  };
  for (let i = 0; i < Math.round(length * FRONT.cushions); i++) {
    const at = lie();
    const want = 0.07 + front() ** 2 * 0.24;
    const turn = front() * 6.28;
    // Seen from above a cushion is a low hummock: wider than a ball, and half as high.
    const wide = [1.3 + front() * 0.7, 0.4 + front() * 0.3, 1.3 + front() * 0.7];
    const shade = 0.8 + front() * 0.4;
    if (!at || at.room < 0.02) continue;
    // Its top is at most 0.35 of its size over the floor.
    const size = Math.min(want, at.room / 0.35);
    place.position.set(at.x, at.y - size * 0.35, at.z);
    place.rotation.set(0, turn, 0);
    place.scale.set(size * wide[0]!, size * wide[1]!, size * wide[2]!);
    place.updateMatrix();
    cushions.setMatrixAt(cushions.count, place.matrix);
    cushions.setColorAt(cushions.count++, mossAt(at.x * 2.1, at.z * 2.1, tint).multiplyScalar(shade));
  }
  for (let tuft = 0; tuft < Math.round(length * FRONT.blades) / 5; tuft++) {
    const at = lie();
    const gold = front() < 0.3;
    const want = 0.3 + front() * 0.9;
    for (let k = 0; k < 5; k++) {
      const lean = [(front() - 0.5) * 0.3, (front() - 0.5) * 0.5, front() * 6.28, (front() - 0.5) * 0.5, front(), front(), front()];
      if (!at || at.room < 0.25) continue;
      place.position.set(at.x + lean[0]!, at.y, at.z);
      place.rotation.set(lean[1]!, lean[2]!, lean[3]!);
      place.scale.set(0.07 + lean[4]! * 0.07, Math.min(want, at.room) * (0.7 + lean[5]! * 0.3), 1);
      place.updateMatrix();
      grass.setMatrixAt(grass.count, place.matrix);
      grass.setColorAt(grass.count++, gold ? tint.set('#c9b54e').multiplyScalar(0.8 + lean[6]! * 0.3) : tint.set('#6f9434').multiplyScalar(0.7 + lean[6]! * 0.5));
    }
  }
  for (let i = 0; i < sprigsInFront; i++) {
    const at = lie();
    const turn = front() * 6.28;
    // A sprig stands 0.42 high with its berries.
    if (at && at.room >= 0.42) sprig(at.x, at.y, at.z, turn, front);
  }
  leaves.count = leaf;
  berries.count = berry;
  for (let i = 0; i < Math.round(length * FRONT.cones); i++) {
    const at = lie();
    const turn = [(front() - 0.5) * 0.3, front() * 6.28, front() * 6.28, front()];
    if (!at || at.room < 0.36) continue;
    place.position.set(at.x, at.y + 0.13, at.z);
    place.rotation.set(Math.PI / 2 + turn[0]!, turn[1]!, turn[2]!, 'YXZ');
    place.scale.setScalar(0.42 + turn[3]! * 0.14);
    place.updateMatrix();
    cones.setMatrixAt(cones.count++, place.matrix);
  }
  for (let i = 0; i < Math.round(length * FRONT.needles); i++) {
    const at = lie(3.4);
    const turn = [front() * 6.28, (front() - 0.5) * 0.3, front()];
    if (!at) continue;
    place.position.set(at.x, at.y + 0.012, at.z);
    // It lies along the slope: about one in three down at the middle of it.
    place.rotation.set(0, turn[0]!, turn[1]!);
    place.scale.set(0.16 + turn[2]! * 0.14, 1, 1);
    place.updateMatrix();
    needles.setMatrixAt(needles.count++, place.matrix);
  }
  for (let i = 0; i < Math.round(length * FRONT.stones); i++) {
    const at = lie();
    const want = 0.2 + front() * 0.6;
    const turn = front() * 6.28;
    const shade = 0.85 + front() * 0.3;
    if (!at || at.room < 0.15) continue;
    // Its top is 0.95 of its size over the floor.
    const size = Math.min(want, at.room / 0.95);
    place.position.set(at.x, at.y + size * 0.15, at.z);
    place.rotation.set(0, turn, 0);
    place.scale.set(size * 1.3, size * 0.8, size);
    place.updateMatrix();
    stones.setMatrixAt(stones.count, place.matrix);
    stones.setColorAt(stones.count++, tint.set('#ffffff').multiplyScalar(shade));
  }

  for (const mesh of [cushions, grass, leaves, berries, cones, needles, trunks, stones]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Its bounds are those of its instances, so a stretch out of the picture is not drawn.
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
