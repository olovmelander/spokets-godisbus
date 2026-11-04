import { BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, InstancedMesh, Matrix4, Object3D, SphereGeometry, Vector3, type Group } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../../sim/types';
import { KIT, grows, heightAt, sequence } from '../../dressing/kit';
import type { StonePlace } from '../../mountain-kit';
import { backRise } from '../../mountain-kit';
import { Cards } from './light';

/**
 * What grows on the floor behind the path (docs/visual-upgrade.md): ferns that sway and bend from him, mushrooms
 * that glow in the dark, and on the mountain cushions of moss on the stones.
 */

/** A fern: seven fronds arching out from one foot, 1 high. */
export function fern(): BufferGeometry {
  const next = sequence(97);
  const cards = new Cards(new Vector3(0, 0.45, 0), new Vector3(0.9, 0.5, 0.6));
  const greens = ['#6f8f3a', '#7f9a40', '#61803a', '#a39a4e'].map((c) => new Color(c));
  for (let k = 0; k < 7; k++) {
    const lean = (k / 6 - 0.5) * 2.2 + (next() - 0.5) * 0.3;
    cards.card([0, 0, (next() - 0.5) * 0.2], Math.PI / 2 + lean, 0.85 + next() * 0.3, 0.42, 'fern', greens[k === 3 ? 3 : Math.floor(next() * 3)]!, (next() - 0.5) * 1.6, -Math.sign(lean) * 0.75);
  }
  return cards.build();
}

/**
 * A cluster of small bell-capped mushrooms, as on a root or at a stone's foot: pale stems and pale caps whose
 * colour is the cluster's own (blue-green or pale violet, never a fly agaric's). Their caps carry the `glow`.
 */
export function mushrooms(): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const paint = (g: BufferGeometry, colour: string, glow: number) => {
    const c = new Color(colour);
    const n = g.getAttribute('position').count;
    g.setAttribute('color', new Float32BufferAttribute(Array.from({ length: n }, () => [c.r, c.g, c.b]).flat(), 3));
    g.setAttribute('glow', new Float32BufferAttribute(new Array<number>(n).fill(glow), 1));
    return g;
  };
  for (const [x, z, tall, cap, lean] of [[0, 0, 0.3, 0.09, 0.1], [0.12, 0.05, 0.22, 0.07, -0.25], [-0.1, 0.06, 0.16, 0.055, 0.3], [0.05, -0.09, 0.12, 0.045, -0.1]] as const) {
    parts.push(paint(new CylinderGeometry(cap * 0.16, cap * 0.22, tall, 5, 1, true).translate(0, tall / 2, 0).rotateZ(lean).translate(x, 0, z), '#e6e2d0', 0.12));
    const top = new Vector3(x - Math.sin(lean) * tall, Math.cos(lean) * tall, z);
    parts.push(paint(new SphereGeometry(cap, 7, 4, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 0.85, 1).rotateZ(lean * 0.6).translate(top.x, top.y - cap * 0.25, top.z), '#ffffff', 1));
  }
  return mergeGeometries(parts.map((part) => part.deleteAttribute('uv')));
}
/** Their caps' colours: cool and pale. */
export const MUSHROOM_INKS = ['#9fd2c4', '#a9c9d8', '#b9aee0'];

/** Where one thing of the floor stands, how big it is, its turn and its colour. */
export interface Placed { x: number; y: number; z: number; size: number; turn: number; colour: Color }

const one = new Object3D();
/** Things of one kind as one mesh. */
export function bed(geometry: BufferGeometry, material: import('three').Material, list: readonly Placed[], name: string, squash = 1): InstancedMesh | null {
  if (list.length === 0) return null;
  const mesh = new InstancedMesh(geometry, material, list.length);
  for (const [i, p] of list.entries()) {
    one.position.set(p.x, p.y, p.z);
    one.rotation.set(0, p.turn, 0);
    one.scale.set(p.size, p.size * squash, p.size);
    one.updateMatrix();
    mesh.setMatrixAt(i, one.matrix);
    mesh.setColorAt(i, p.colour);
  }
  mesh.name = name;
  mesh.computeBoundingSphere();
  return mesh;
}

/** Whether a thing at x, y keeps its distance from every candy of the chapter (plan §4.3: none by a mushroom). */
export const clearOfCandy = (chapter: ChapterData, x: number, y: number, keep = 1.5) =>
  ![...chapter.candy, ...(chapter.side ?? [])].some((c) => Math.hypot(c.x - x, c.y - y) < keep);

/** Near what the dressing has built of a material: the instances' feet, and how wide each is. */
function feet(root: Object3D | null | undefined, material: import('three').Material): { x: number; y: number; z: number; wide: number }[] {
  const found: { x: number; y: number; z: number; wide: number }[] = [];
  const matrix = new Matrix4();
  const at = new Vector3();
  const size = new Vector3();
  root?.traverse((object) => {
    const mesh = object as InstancedMesh;
    if (!mesh.isInstancedMesh || mesh.material !== material) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      found.push({ ...at.setFromMatrixPosition(matrix), wide: size.setFromMatrixScale(matrix).x });
    }
  });
  return found;
}

/** The mountain's stones as the dressing lays them out (dressing/fell.ts), before the kit takes them. */
export function mountainStones(root: Object3D | null | undefined): StonePlace[] {
  const found: StonePlace[] = [];
  root?.traverse((object) => {
    const socket = object.userData.mountain as { stones?: StonePlace[] } | undefined;
    if (socket?.stones) found.push(...socket.stones);
  });
  return found;
}

/**
 * The floor's plants and mushrooms for a chapter. Ferns stand behind the path in the forest, the more at its
 * edges, where the floor ends at a wall or a pool. Mushrooms grow in small clusters by the roots of the trunks and
 * at the feet of stones, in the forest, at the bog's edge and on the mountain, and never near a candy.
 */
export function floor(chapter: ChapterData, dressing: Group | null | undefined, pines: readonly { x: number; z: number }[]) {
  const next = sequence(chapter.id.length * 37 + 3);
  const place = chapter.place;
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const ground = (x: number, z: number) => heightAt(chapter, x) + (place === 'mountain' || place === 'dusk' ? backRise(z) : 0);
  const edge = (x: number) => !grows(chapter, x - 1.6) || !grows(chapter, x + 1.6);
  const ferns: Placed[] = [];
  const caps: Placed[] = [];
  const moss: Placed[] = [];
  const tint = (c: string, by = 0.85 + next() * 0.3) => new Color(c).multiplyScalar(by);
  if (place === 'forest' || place === 'bog') {
    const often = place === 'forest' ? 0.7 : 0.12;
    for (let x = from - 4; x < to + 4; x += (0.4 + next() * 1.6) / often) {
      if (!grows(chapter, x)) continue;
      const atEdge = edge(x);
      const z = -0.9 - next() ** (atEdge ? 2 : 1.2) * 5.5;
      // Small close behind the path, larger further in; and none right behind a candy, which stays easy to see.
      const size = (0.85 + next() * 1.1) * (atEdge ? 1.2 : 1) * Math.min(1, 0.3 - z * 0.25);
      if (z > -2.2 && !clearOfCandy(chapter, x, ground(x, z) + size * 0.5, 0.9 + size * 0.4)) continue;
      ferns.push({ x, y: ground(x, z) - 0.04, z, size, turn: (next() - 0.5) * 0.6, colour: tint('#e8ece0') });
    }
  }
  const cluster = (x: number, z: number) => {
    const y = ground(x, z);
    if (!grows(chapter, x) || z > -0.85 || !clearOfCandy(chapter, x, y, 1.8)) return;
    caps.push({ x, y: y - 0.02, z, size: 0.9 + next() * 0.7, turn: next() * 6.28, colour: new Color(MUSHROOM_INKS[Math.floor(next() * 3)]!) });
  };
  if (place === 'forest' || place === 'bog' || place === 'mountain' || place === 'dusk') {
    // By the roots of the trunks the dressing has, and at its stones' and snags' feet.
    for (const root of [...feet(dressing, KIT.bark), ...feet(dressing, KIT.deadwood)]) {
      if (root.z < -9 || next() > 0.6) continue;
      const side = next() < 0.5 ? -1 : 1;
      cluster(root.x + side * (root.wide * 1.3 + 0.25 + next() * 0.5), root.z + root.wide * (0.9 + next() * 0.5));
    }
    for (const stone of [...feet(dressing, KIT.stone), ...mountainStones(dressing)]) {
      const size = 'size' in stone ? (stone as StonePlace).size : stone.wide;
      if (stone.z > -1 || stone.z < -7 || next() > 0.45) continue;
      cluster(stone.x + (next() < 0.5 ? -1 : 1) * (size * 1.1 + 0.15), stone.z + size * 0.6);
    }
    for (const tree of pines) if (tree.z > -16 && next() < 0.5) cluster(tree.x + (next() - 0.5) * 1.2, tree.z + 0.6);
    // And on their own now and then, on the moss behind the path.
    for (let x = from + next() * 5; x < to; x += 4 + next() * 7) cluster(x, -1.2 - next() * 4.5);
  }
  if (place === 'mountain' || place === 'dusk') {
    // Moss on the mountain's stones: a soft green cushion on the tops of some, damp in their hollows.
    for (const stone of mountainStones(dressing)) {
      if (stone.z < -8 || stone.size < 0.3 || next() > 0.5) continue;
      moss.push({ x: stone.x, y: stone.y + stone.size * (stone.shape === 2 ? 0.12 : 0.42), z: stone.z, size: stone.size * (0.45 + next() * 0.2), turn: next() * 6.28, colour: tint(place === 'dusk' ? '#4f6a3a' : '#6a8a3c') });
    }
  }
  return { ferns, caps, moss };
}
