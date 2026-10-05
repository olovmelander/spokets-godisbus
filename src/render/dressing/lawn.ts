import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { floorDrop } from './ground';
import { KIT, grows, heightAt, sequence } from './kit';

// --- the garden ---------------------------------------------------------------------------------------------

/** One stretch of the lawn, as he sees it: a jungle behind the path, stubble where he walks, and dew on it all. */
export function lawn(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  /** The lawn's height at a place, which in front of the path slopes down towards the camera. */
  const top = (x: number, z: number) => heightAt(chapter, x) - (floorDrop(chapter, x, z) ?? 0);
  /** A depth for something at x: its own, or behind the path's edge where the lawn in front has drawn back. */
  const settle = (x: number, z: number, back = 0.4) => (floorDrop(chapter, x, z) === null ? back : z);
  // What grows down the lawn in front of the path is put there last, with numbers of its own.
  const FRONT = { blades: 34, clover: 0.7, leaves: 0.6, dew: 2.5 };
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const bladesBehind = Math.round(length * 36);
  const grass = new InstancedMesh(KIT.blade, KIT.lawn, bladesBehind + Math.round(length * FRONT.blades));
  let n = 0;
  for (let i = 0; i < bladesBehind; i++) {
    const x = from + next() * length;
    const where = next();
    // Behind the path it stands tall; on the path it is stubble, so that his boots show; in front it is short.
    const z = settle(x, where < 0.55 ? -0.55 - next() ** 1.4 * 7.5 : where < 0.85 ? -0.5 + next() : 0.55 + next() * 0.4);
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
  const dewBehind = Math.round(length * 5);
  const dew = new InstancedMesh(KIT.bead, KIT.dew, dewBehind + Math.round(length * FRONT.dew));
  n = 0;
  for (let i = 0; i < dewBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(3.5, 0.3));
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
  const sprigsInFront = Math.round(length * FRONT.clover);
  const clover = new InstancedMesh(KIT.bead, KIT.clover, Math.max(1, (sprigs + sprigsInFront) * 3));
  /** One clover: three leaves round a stalk's top. */
  const sprig = (x: number, y: number, z: number, turn: number) => {
    for (let k = 0; k < 3; k++) {
      const a = turn + k * 2.094;
      place.position.set(x + Math.cos(a) * 0.075, y, z + Math.sin(a) * 0.075);
      place.rotation.set(0.15, -a, 0.1);
      place.scale.set(0.085, 0.014, 0.07);
      place.updateMatrix();
      clover.setMatrixAt(clover.count++, place.matrix);
    }
  };
  clover.count = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(3, 0.3));
    if (!grows(chapter, x)) continue;
    const y = top(x, z) + 0.14 + next() * 0.2;
    sprig(x, y, z, next() * 6.28);
  }
  const leavesBehind = Math.max(1, Math.round(length * 1.4));
  const fallen = new InstancedMesh(KIT.bead, KIT.birchLeaf, leavesBehind + Math.round(length * FRONT.leaves));
  n = 0;
  for (let i = 0; i < leavesBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(4, 0.3));
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

  // The lawn in front of the path: grass grows down the slope towards the camera, taller the further
  // down it stands, and never higher than the path it stands under, less a finger: nothing covers his boots.
  const front = sequence(seed * 37 + 11);
  const stand = (reach = 3.9) => {
    const x = from + front() * length;
    const z = 0.55 + front() ** 0.8 * reach;
    const drop = grows(chapter, x) ? floorDrop(chapter, x, z) : null;
    return drop === null ? null : { x, z, y: heightAt(chapter, x) - drop, room: drop - 0.05 };
  };
  for (let tuft = 0; tuft < Math.round(length * FRONT.blades) / 4; tuft++) {
    const at = stand();
    const yellow = front() < 0.14;
    const want = 0.25 + front() * 1.15;
    for (let k = 0; k < 4; k++) {
      const lean = [(front() - 0.5) * 0.34, (front() - 0.5) * 0.6, front() * 6.28, (front() - 0.5) * 0.6, front(), front(), front()];
      // Near the path it is stubble, as on it.
      if (!at || at.room < 0.06) continue;
      place.position.set(at.x + lean[0]!, at.y, at.z + lean[0]! * 0.6);
      place.rotation.set(lean[1]!, lean[2]!, lean[3]!);
      place.scale.set(0.06 + lean[4]! * 0.07, Math.min(want, at.room) * (0.7 + lean[5]! * 0.3), 1);
      place.updateMatrix();
      grass.setMatrixAt(grass.count, place.matrix);
      grass.setColorAt(grass.count++, yellow ? tint.set('#c2c552').multiplyScalar(0.8 + lean[6]! * 0.3) : tint.set('#6fae34').multiplyScalar(0.62 + lean[6]! * 0.5));
    }
  }
  for (let i = 0; i < sprigsInFront; i++) {
    const at = stand();
    const lift = 0.14 + front() * 0.2;
    const turn = front() * 6.28;
    if (at && at.room >= lift + 0.03) sprig(at.x, at.y + lift, at.z, turn);
  }
  for (let i = 0; i < Math.round(length * FRONT.leaves); i++) {
    const at = stand();
    const turn = [(front() - 0.5) * 0.4, front() * 6.28, (front() - 0.5) * 0.4];
    if (!at || at.room < 0.05) continue;
    place.position.set(at.x, at.y + 0.03, at.z);
    place.rotation.set(turn[0]!, turn[1]!, turn[2]!);
    place.scale.set(0.15, 0.012, 0.1);
    place.updateMatrix();
    fallen.setMatrixAt(fallen.count++, place.matrix);
  }
  for (let i = 0; i < Math.round(length * FRONT.dew); i++) {
    const at = stand(3.2);
    const size = 0.016 + front() * 0.024;
    if (!at || at.room < 0.08) continue;
    place.position.set(at.x, at.y + 0.035, at.z);
    place.rotation.set(0, 0, 0);
    place.scale.setScalar(size);
    place.updateMatrix();
    dew.setMatrixAt(dew.count++, place.matrix);
  }

  for (const mesh of [grass, dew, stalks, heads, clover, fallen, trunks]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
