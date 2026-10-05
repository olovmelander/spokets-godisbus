import { Color, Group, InstancedMesh, Mesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { backRise, shapeOf, stones, type MountainSocket, type StonePlace } from '../mountain-kit';
import { forwardAt } from './ground';
import { KIT, grows, heightAt, sequence } from './kit';

// --- the mountain -------------------------------------------------------------------------------------------

/** The greys of the cobbles that lie round the five that ring: the granite's own, and one warmer. */
const COBBLES = ['#8f939d', '#a4a8b2', '#bcbfc6', '#d6d5d6', '#c9c4b8'].map((hex) => new Color(hex));

/**
 * One stretch of the mountain: stones as the ice left them, reindeer lichen in drifts at their feet and in the
 * rock's hollows, crowberry, dry grass, and round the cobbles that ring an old shore of them.
 *
 * The stones, the lichen and the cobbles are modelled in Blender (../mountain-kit.ts). What is built here are
 * their stand-ins, each marked with what the kit is to put in its place.
 */
export function fell(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : backRise(z));
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);
  /** Whether there is ground at a depth in front of the path: at a wall's top the rock's front has drawn back. */
  const stands = (x: number, z: number) => z < 0.45 || forwardAt(chapter, x) >= 1;
  // Where a rock he stands on is, or the old pine: no stone lies in it.
  const rocks = [
    ...(chapter.ledges ?? []).filter((ledge) => ledge.look === 'stone').map((ledge) => ({ x: ledge.x, wide: ledge.width })),
    ...(chapter.movers ?? []).filter((mover) => mover.look === 'stone').map((mover) => ({ x: mover.stops[0]!.x, wide: mover.width + 1.4 })),
  ];
  const taken = (x: number, z: number, reach: number) =>
    (z + reach > -2.9 && rocks.some((rock) => Math.abs(x - rock.x) < rock.wide / 2 + reach + 0.5))
    || (chapter.pine !== undefined && Math.abs(x - chapter.pine.x) < 5.2 + reach && z + reach > -8);

  // Stones: three shapes, turned every way, sunk a quarter into the rock. A slab lies nearly level.
  const lying: StonePlace[] = [];
  const count = Math.max(1, Math.round(length * 0.45));
  for (let i = 0; i < count; i++) {
    const x = from + next() * length;
    const z = -1.5 - next() ** 1.4 * 9;
    const size = 0.16 + next() ** 1.8 * 0.9;
    const shape = Math.floor(next() * 3);
    const turn: StonePlace['turn'] = shape === 2 ? [(next() - 0.5) * 0.4, next() * 6.28, (next() - 0.5) * 0.4] : [next() * 6.28, next() * 6.28, next() * 6.28];
    const tone = 0.9 + next() * 0.2;
    if (!grows(chapter, x) || taken(x, z, size)) continue;
    const foot = top(x, z);
    lying.push({ x, y: foot + size * (shape === 2 ? 0.1 : 0.38), z, size, turn, shape, tone, foot });
  }
  // And to every second stretch one great block that the ice carried here, far back.
  if (Math.round(from / 18) % 2 === 0) {
    const x = from + 3 + next() * 12;
    const z = -5.5 - next() * 2.5;
    const turn: StonePlace['turn'] = [next() * 6.28, next() * 6.28, next() * 6.28];
    if (grows(chapter, x) && grows(chapter, x - 2) && grows(chapter, x + 2) && !taken(x, z, 1.8)) lying.push({ x, y: top(x, z) + 0.7, z, size: 1.8, turn, shape: 0, tone: 1, foot: top(x, z) });
  }
  if (lying.length > 0) {
    const mesh = new Mesh(stones(lying, [shapeOf(KIT.bare)]), KIT.stone);
    mesh.userData.mountain = { stones: lying } satisfies MountainSocket;
    group.add(mesh);
  }

  // Reindeer lichen, in drifts: at the foot of a stone, on its side towards him, and in the rock's hollows.
  const drifts: { x: number; z: number; wide: number }[] = [];
  for (const stone of lying) {
    if (stone.z < -7.5) continue;
    const round = (next() - 0.5) * 2.6;
    drifts.push({ x: stone.x + Math.sin(round) * stone.size * 0.95, z: stone.z + Math.cos(round) * stone.size * 0.85, wide: 0.3 + stone.size * 0.5 });
  }
  for (let i = Math.round(length * 0.55); i > 0; i--) drifts.push({ x: from + next() * length, z: depth(6, 0.3), wide: 0.25 + next() * 0.45 });
  const lichen = new InstancedMesh(KIT.lav, KIT.lichen, Math.max(1, drifts.length * 6));
  lichen.userData.mountain = { part: 'lav' } satisfies MountainSocket;
  // A little light of its own keeps it white by day. At dusk it is blue with everything else.
  KIT.lichen.emissiveIntensity = chapter.place === 'dusk' ? 0.06 : 0.25;
  let n = 0;
  for (const drift of drifts) {
    for (let k = 3 + Math.floor(next() * 4); k > 0; k--) {
      const away = next() ** 0.7 * drift.wide;
      const round = next() * 6.28;
      const x = drift.x + Math.cos(round) * away;
      // A drift in front of the path stays there, and one behind it stays behind: none lies where he walks.
      const z = drift.z > 0 ? Math.min(0.95, Math.max(0.5, drift.z + Math.sin(round) * away * 0.4)) : Math.min(-0.45, drift.z + Math.sin(round) * away);
      const size = (0.3 + next() * 0.5) * (1 - 0.45 * (away / drift.wide)) * (Math.abs(z) < 0.75 ? 0.55 : 1);
      if (!grows(chapter, x) || !stands(x, z) || taken(x, z, 0)) continue;
      place.position.set(x, top(x, z) - 0.02, z);
      place.rotation.set(0, next() * 6.28, 0);
      place.scale.set(size, size * (0.8 + next() * 0.4), size);
      place.updateMatrix();
      lichen.setMatrixAt(n, place.matrix);
      lichen.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.9 + next() * 0.1));
    }
  }
  lichen.count = n;

  // Crowberry: low dark sprigs with black berries. A leaf and a berry are a few pixels across: beads, of few corners.
  const sprigs = Math.round(length * 0.9);
  const leaves = new InstancedMesh(KIT.bead, KIT.crowLeaf, Math.max(1, sprigs * 8));
  const berries = new InstancedMesh(KIT.bead, KIT.blackBerry, Math.max(1, sprigs * 3));
  let leaf = 0;
  let berry = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3.2, 0.3);
    if (!grows(chapter, x) || !stands(x, z)) continue;
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
    if (!grows(chapter, x) || !stands(x, z)) continue;
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

  const meshes = [lichen, leaves, berries, grass];

  // Round the cobbles that ring, an old shore: grey cobbles packed behind the path and along its front edge,
  // never on it, thinning out to both sides. The five lie among them, pale.
  const ringing = (chapter.spots ?? []).filter((spot) => spot.look === 'cobble').map((spot) => spot.at.x);
  const shore = { from: Math.min(...ringing) - 2.5, to: Math.max(...ringing) + 2.5 };
  const lo = Math.max(from, shore.from);
  const hi = Math.min(to, shore.to);
  if (hi > lo) {
    const field = new InstancedMesh(KIT.cobble, KIT.stone, Math.round((hi - lo) * 20));
    field.userData.mountain = { part: 'strandsten' } satisfies MountainSocket;
    n = 0;
    for (let i = 0; i < field.count; i++) {
      const x = lo + next() * (hi - lo);
      const behind = next() < 0.82;
      const z = behind ? -0.72 - next() ** 1.5 * 4.4 : 0.58 + next() * 0.3;
      const size = behind ? 0.12 + next() * 0.2 : 0.09 + next() * 0.07;
      const turn = [next(), next(), next(), next(), next()] as const;
      // Fewer towards the shore's ends and its back, and none where one of the five lies.
      if (turn[4] > Math.min(1, (x - shore.from) / 3, (shore.to - x) / 3) * (1 - 0.6 * (z < -2.5 ? (-2.5 - z) / 2.6 : 0))) continue;
      if (!grows(chapter, x) || !stands(x, z) || (z > -1.1 && z < 0 && ringing.some((at) => Math.abs(x - at) < 0.62))) continue;
      place.position.set(x, top(x, z) + size * 0.3, z);
      place.rotation.set((turn[0] - 0.5) * 0.5, turn[1] * 6.28, (turn[2] - 0.5) * 0.5);
      place.scale.setScalar(size);
      place.updateMatrix();
      field.setMatrixAt(n, place.matrix);
      field.setColorAt(n++, tint.copy(COBBLES[Math.floor(turn[3] * COBBLES.length)]!).multiplyScalar(1.15));
    }
    field.count = n;
    meshes.push(field);
  }

  for (const mesh of meshes) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
