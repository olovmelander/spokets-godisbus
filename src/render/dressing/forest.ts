import { Color, Group, InstancedMesh, Mesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { placing, together, type ForestKit, type Placed } from '../forest-kit';
import { floorDrop, shoreAt } from './ground';
import { KIT, grows, heightAt, landscape, mossAt, sequence } from './kit';

// --- the forest ---------------------------------------------------------------------------------------------

/** What of the kit the forest's floor is made of: without all of it a stretch keeps its stand-ins. */
export const FLOOR_SHAPES = ['tuva', 'sten-a', 'sten-b', 'sten-c', 'kotte-liten', 'gran', 'ormbunke', 'kantarell', 'karljohan', 'lov', 'renlav'] as const;

/**
 * One stretch of the forest, each kind of thing as one mesh. With the kit modelled in Blender
 * (../forest-kit.ts) its cushions are the kit's, and what stands and lies still (stones, cones, young spruces,
 * ferns, mushrooms, fallen leaves, lichen) is one mesh for the stretch. Without it, cushions are balls, and
 * stones and cones are stand-ins.
 */
export function stretch(chapter: ChapterData, from: number, to: number, seed: number, kit?: ForestKit): Group {
  const group = new Group();
  // The view puts the kit's shapes here once they have arrived: see `restock`.
  group.userData.forestStretch = { from, to, seed };
  group.add(...grown(chapter, from, to, seed, kit));
  return group;
}

/** Makes a stretch again from the kit, in place of its stand-ins. False, and nothing changed, if the kit lacks a shape. */
export function restock(group: Group, chapter: ChapterData, kit: ForestKit): boolean {
  if (FLOOR_SHAPES.some((name) => !kit.shape(name))) return false;
  const { from, to, seed } = group.userData.forestStretch as { from: number; to: number; seed: number };
  // The stand-ins' shapes and materials are the place's own (KIT), shared by every stretch: only each mesh's own places go.
  for (const child of group.children) (child as InstancedMesh).dispose?.();
  group.clear();
  group.add(...grown(chapter, from, to, seed, kit));
  return true;
}

function grown(chapter: ChapterData, from: number, to: number, seed: number, kit?: ForestKit): Object3D[] {
  chapter = landscape(chapter);
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

  // Moss cushions: what makes the carpet a carpet. The kit's is a low hummock of a few points, larger and
  // fewer than the balls that stand in for it; each takes its green from where it lies.
  const hummock = kit?.shape('tuva');
  const ballsBehind = Math.round(length * 22);
  const cushionsBehind = hummock ? Math.round(length * HUMMOCKS) : ballsBehind;
  const cushions = new InstancedMesh(hummock ?? KIT.ball, hummock ? kit!.material : KIT.moss, cushionsBehind + Math.round(length * (hummock ? HUMMOCKS_IN_FRONT : FRONT.cushions)));
  let n = 0;
  // The balls' numbers are drawn with the kit too, so that everything after them stands where it stood.
  for (let i = 0; i < ballsBehind; i++) {
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
    const shade = 0.85 + next() * 0.4;
    if (hummock) continue;
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, mossAt(x * 2.1, z * 2.1, tint).multiplyScalar(shade));
  }
  const own = sequence(seed * 13 + 1);
  for (let i = 0; hummock && i < cushionsBehind; i++) {
    const x = from + own() * length;
    const z = settle(x, own() < 0.22 ? 0.5 + own() * 0.45 : -0.45 - own() ** 1.6 * 6.5);
    const wide = (0.14 + own() ** 1.7 * 0.42) * (z > 0.45 ? 0.6 : 1);
    const high = wide * (Math.abs(z) < 0.7 ? 0.5 : 1) * (0.45 + own() * 0.4);
    const lie = [own() * 6.28, 0.85 + own() * 0.5, 0.85 + own() * 0.5, 1.15 + own() * 0.4];
    if (!grows(chapter, x)) continue;
    // It is sunk a little into the moss it grows out of.
    place.position.set(x, top(x, z) - high * 0.12, z);
    place.rotation.set(0, lie[0]!, 0);
    place.scale.set(wide * lie[1]!, high * 2, wide * lie[2]!);
    place.updateMatrix();
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, mossAt(x * 2.1, z * 2.1, tint).multiplyScalar(lie[3]!));
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
  /** With the kit, what stands and lies still is gathered here, and is one mesh. */
  const still: Placed[] = [];
  /** One of the kit's shapes on the floor at a place, turned round, at a size, a little lighter or darker. */
  const put = (shape: string, x: number, y: number, z: number, turn: number, size: number, tone: number, tilt: readonly [number, number] = [0, 0]) =>
    still.push({ shape: kit!.shape(shape)!, matrix: placing([x, y, z], [tilt[0], turn, tilt[1]], size), tone });
  n = 0;
  for (let i = 0; i < conesBehind; i++) {
    const x = from + next() * length;
    const z = settle(x, depth(4, 0.15), -0.7);
    if (!grows(chapter, x) || Math.abs(z) < 0.6) continue;
    place.position.set(x, top(x, z) + 0.13, z);
    place.rotation.set(Math.PI / 2 + (next() - 0.5) * 0.3, next() * 6.28, next() * 6.28, 'YXZ');
    place.scale.setScalar(0.42 + next() * 0.14);
    // One just in front of the path would lie higher than the path: those in front are laid further down, below.
    if (kit && z < 0) put('kotte-liten', x, top(x, z) + 0.05, z, place.rotation.y, place.scale.x * 1.1, 0.9 + own() * 0.3, [0, (own() - 0.5) * 0.3]);
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

  // The spruces themselves: trunks like pillars, 2.7 EL across, with a foot of roots and moss. A vittra door
  // has a spruce of its own to stand under.
  const doors = (chapter.spots ?? []).filter((spot) => spot.look === 'vittra-door' && spot.at.x >= from && spot.at.x < to);
  const trunks = new InstancedMesh(KIT.trunk, KIT.bark, Math.ceil(length / 4.5) + 1 + doors.length);
  trunks.name = 'forest-trunks';
  trunks.userData.casts = true;
  n = 0;
  for (let x = from + next() * 4; x < to && n < trunks.count - doors.length; x += 4.5 + next() * 6.5) {
    // Some stand close behind the path, and more of them further in.
    const z = next() < 0.3 ? -3.6 - next() * 2.5 : -7 - next() * 15;
    const radius = (1 + next() * 0.45) * (z < -12 ? 0.8 : 1);
    if (!grows(chapter, x)) continue;
    const turn = [next() * 6.28, (next() - 0.5) * 0.04, 0.8 + next() * 0.4];
    // None where a door's own spruce stands.
    if (doors.some((door) => Math.abs(door.at.x - x) < 3.2 && z > -9)) continue;
    place.rotation.set(0, turn[0]!, turn[1]!);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 1, radius);
    place.updateMatrix();
    trunks.setMatrixAt(n, place.matrix);
    trunks.setColorAt(n++, tint.set('#ffffff').multiplyScalar(turn[2]!));
  }
  for (const door of doors) {
    place.rotation.set(0, 1.1, 0.015);
    place.position.set(door.at.x + 0.1, door.at.y - 0.5, DOOR_SPRUCE.z);
    // The mound falls under the spruce's roots behind the door. Extend this trunk's foot into it,
    // keeping the top of its 60 EL stem fixed; the doorway still stands at its authored height.
    place.scale.set(DOOR_SPRUCE.radius, 1.01, DOOR_SPRUCE.radius);
    place.translateY(-0.6);
    place.updateMatrix();
    trunks.setMatrixAt(n, place.matrix);
    trunks.setColorAt(n++, tint.set('#ffffff'));
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
    if (kit) put(STONES[i % 3]!, x, top(x, z) - size * 0.12, z, place.rotation.y, size * 1.25, 0.9 + own() * 0.25);
    place.updateMatrix();
    stones.setMatrixAt(n, place.matrix);
    stones.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.85 + next() * 0.3));
  }
  stones.count = n;

  // The floor in front of the path: the same things, lying down the slope towards the camera. Nothing there
  // stands higher than the path it lies under, less a finger, so that nothing ever covers his boots.
  const front = sequence(seed * 31 + 7);
  const lie = (reach = 3.9, draw = front) => {
    const x = from + draw() * length;
    const z = 0.55 + draw() ** 0.85 * reach;
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
    if (!at || at.room < 0.02 || hummock) continue;
    // Its top is at most 0.35 of its size over the floor.
    const size = Math.min(want, at.room / 0.35);
    place.position.set(at.x, at.y - size * 0.35, at.z);
    place.rotation.set(0, turn, 0);
    place.scale.set(size * wide[0]!, size * wide[1]!, size * wide[2]!);
    place.updateMatrix();
    cushions.setMatrixAt(cushions.count, place.matrix);
    cushions.setColorAt(cushions.count++, mossAt(at.x * 2.1, at.z * 2.1, tint).multiplyScalar(shade));
  }
  for (let i = 0; hummock && i < Math.round(length * HUMMOCKS_IN_FRONT); i++) {
    const at = lie(3.9, own);
    const wide = (0.16 + own() ** 1.6 * 0.4) * (0.8 + own() * 0.45);
    const lies = [own() * 6.28, 0.36 + own() * 0.3, 0.8 + own() * 0.4, 1.1 + own() * 0.4];
    if (!at || at.room < 0.02) continue;
    // It stands 0.88 of its height over the floor it is sunk into, and never over the path's line.
    const high = Math.min(wide * lies[1]!, at.room / 0.88);
    place.position.set(at.x, at.y - high * 0.12, at.z);
    place.rotation.set(0, lies[0]!, 0);
    place.scale.set(wide, high * 2, wide * lies[2]!);
    place.updateMatrix();
    cushions.setMatrixAt(cushions.count, place.matrix);
    cushions.setColorAt(cushions.count++, mossAt(at.x * 2.1, at.z * 2.1, tint).multiplyScalar(lies[3]!));
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
    if (kit) put('kotte-liten', at.x, at.y + 0.05, at.z, turn[1]!, place.scale.x * 1.1, 0.9 + turn[3]! * 0.3, [0, turn[0]!]);
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
    if (kit) {
      // As big as the stand-in, or as its own height lets it be under the path's line, sunk a little.
      const tall = kit.shape(STONES[i % 3]!)!.boundingBox!.max.y - 0.1;
      const big = Math.min(want * 1.05, at.room / tall);
      put(STONES[i % 3]!, at.x, at.y - big * 0.1, at.z, turn, big, shade);
    }
    place.updateMatrix();
    stones.setMatrixAt(stones.count, place.matrix);
    stones.setColorAt(stones.count++, tint.set('#ffffff').multiplyScalar(shade));
  }

  const kinds: (InstancedMesh | Mesh)[] = [cushions, grass, leaves, berries, needles, trunks];
  if (kit) {
    undergrowth(chapter, from, to, seed, put, top, lie);
    // The stand-ins for cones and stones were never drawn: only their places were used.
    cones.dispose();
    stones.dispose();
    if (still.length > 0) kinds.push(new Mesh(together(still), kit.material));
  } else kinds.push(cones, stones);
  for (const mesh of kinds) {
    const many = mesh as InstancedMesh;
    if (many.isInstancedMesh) {
      many.instanceMatrix.needsUpdate = true;
      if (many.instanceColor) many.instanceColor.needsUpdate = true;
      // Its bounds are those of its instances, so a stretch out of the picture is not drawn.
      many.computeBoundingSphere();
    }
  }
  return kinds;
}

const STONES = ['sten-a', 'sten-b', 'sten-c'];
/** How many of the kit's cushions lie behind the path and in front of it, to the length: the balls that stand in for them are 22 and 5. */
const HUMMOCKS = 9;
const HUMMOCKS_IN_FRONT = 3.5;
/** Where a vittra door's own spruce stands behind it, and how thick it is: its roots are the door's arch. */
const DOOR_SPRUCE = { z: -2.45, radius: 1.05 };

/**
 * What grows on the forest's floor in October, from the kit: young spruces as tall as two or three of him,
 * ferns going yellow, chanterelles and a cep, pale reindeer lichen, and the birches' yellow leaves, which
 * have blown in. Nothing of it stands where he walks, and in front of the path nothing is taller than the
 * floor lies under the path there.
 */
function undergrowth(
  chapter: ChapterData, from: number, to: number, seed: number,
  put: (shape: string, x: number, y: number, z: number, turn: number, size: number, tone: number, tilt?: readonly [number, number]) => void,
  top: (x: number, z: number) => number,
  lie: (reach?: number) => { x: number; z: number; y: number; room: number } | null,
): void {
  const next = sequence(seed * 17 + 5);
  const length = to - from;
  /**
   * `count` to the length behind the path, as far as `far` behind it, each between `small` and `big` in size.
   * A thing `wide` at size 1 stands that far back and more, so that nothing of it reaches where he walks.
   */
  const behind = (count: number, shape: string, wide: number, far: number, small: number, big: number, sunk = 0, tilt = 0) => {
    for (let i = 0; i < Math.round(length * count); i++) {
      const x = from + next() * length;
      const size = small + next() * (big - small);
      const z = -0.4 - wide * size - next() ** 1.4 * far;
      const lies = [next() * 6.28, 0.85 + next() * 0.3, (next() - 0.5) * tilt, (next() - 0.5) * tilt];
      if (grows(chapter, x) && grows(chapter, x + 0.5) && grows(chapter, x - 0.5)) put(shape, x, top(x, z) - sunk, z, lies[0]!, size, lies[1]!, [lies[2]!, lies[3]!]);
    }
  };
  behind(0.13, 'gran', 0.6, 7.5, 0.7, 1.2, 0.05);
  behind(0.24, 'ormbunke', 1.1, 5, 0.9, 1.5, 0.03);
  behind(0.1, 'kantarell', 0.4, 3, 0.8, 1.3);
  behind(0.05, 'karljohan', 0.3, 3.5, 0.7, 1.2);
  behind(0.4, 'renlav', 0.26, 5.5, 0.9, 2, 0.01);
  behind(1.3, 'lov', 0.25, 6.5, 0.8, 1.4, -0.02, 0.6);
  /** `count` to the length in front of the path, where a thing `high` at size 1 has room under the path's line. */
  const inFront = (count: number, shape: string, high: number, small: number, big: number, lift = 0) => {
    for (let i = 0; i < Math.round(length * count); i++) {
      const at = lie();
      const want = small + next() * (big - small);
      const turn = next() * 6.28;
      const tone = 0.85 + next() * 0.3;
      // The floor falls about one in two towards the camera there: a flat thing lies along it.
      const slope = lift > 0 ? 0.3 : 0;
      if (at && at.room >= high * small) put(shape, at.x, at.y + lift, at.z, turn, Math.min(want, at.room / high), tone, [slope, 0]);
    }
  };
  inFront(0.1, 'ormbunke', 0.82, 0.6, 1.3);
  inFront(0.1, 'kantarell', 0.4, 0.7, 1.2);
  inFront(0.3, 'renlav', 0.22, 0.8, 1.8);
  inFront(0.9, 'lov', 0.1, 0.8, 1.4, 0.025);
}
