import { Color, Object3D, type InstancedMesh } from 'three';
import type { ChapterData } from '../../sim/types';
import { slopeDrop } from './ground';
import { sequence } from './kit';
import { STILL_BEHIND, STILL_FRONT, edgesOf, type Bank } from './natural';

/**
 * What grows over an edge (Olov, 14 November 2026: "övergångarna mellan gräset och vattnet får mer naturliga former"):
 * along the lip of every grown wall of a lawn, a ditch's bank or a step's, the turf's own grass hangs out over the
 * edge and down the face, in tufts of uneven length, thicker in some places than in others, so that the lip is a
 * ragged fringe and not the line the ground's shape ends in.
 *
 * It grows just behind the plane he moves in and on away from the camera, and along a pool's banks in front of the
 * path too: never on the plane itself, where it would hang in front of his boots or of what lies at a wall's foot.
 * The blades go into the stretch's own mesh of grass, so they cost no draw; what stands on the ground is moved with
 * its walls' lines afterwards (./index.ts, `standWith`), and these with it.
 */

/** How many blades hang over a lip, for each length of its way through the depth: behind the path, and in front. */
const BEHIND = 30;
const FRONT = 22;
/** How far behind the path a lip's fringe is worth its blades: further off it is a line a pixel wide. */
const REACH_BEHIND = 9;
/** How far in front of the path a pool's banks have their fringe: to where the pool comes to its shore. */
const REACH_FRONT = 4.1;

/** How many blades the lips between `from` and `to` take, at most: room for them in the stretch's mesh. */
export function fringeRoom(chapter: ChapterData, from: number, to: number): number {
  return lipsOf(chapter, from, to).reduce((sum, bank) => sum + Math.ceil(REACH_BEHIND * BEHIND) + (bank.open ? Math.ceil(REACH_FRONT * FRONT) : 0), 0);
}

/** The walls whose lips lie in a stretch and have a lawn's turf to hang: not rock, sand or a heap of shavings. */
function lipsOf(chapter: ChapterData, from: number, to: number): Bank[] {
  return edgesOf(chapter).banks.filter((bank) => bank.kind === 'lawn' && bank.x >= from && bank.x < to && bank.top - bank.foot >= 0.3 && bank.reachUp >= 0.2);
}

/**
 * Hangs the fringe over the lips between `from` and `to`, at the end of a mesh of blades that has `fringeRoom` for
 * it. `inks` are the grass's colours; `long` is how long a blade is, from and to.
 */
export function fringe(mesh: InstancedMesh, chapter: ChapterData, from: number, to: number, seed: number, inks: readonly string[], long: readonly [number, number] = [0.22, 0.6]): void {
  const edges = edgesOf(chapter);
  const next = sequence(seed * 53 + 29);
  const place = new Object3D();
  // Turned round first, then leaned: a blade leans the way it faces.
  place.rotation.order = 'YXZ';
  const tint = new Color();
  const room = mesh.instanceMatrix.count;
  const blade = (bank: Bank, z: number) => {
    // A tuft here and none there: the fringe is thick in some places and thin in others.
    const thick = 0.35 + 0.65 * Math.abs(Math.sin(z * 1.7 + bank.seed * 3.1) * Math.sin(z * 0.6 + bank.seed));
    const draws = [next(), next(), next(), next(), next(), next()];
    if (draws[0]! > thick || mesh.count >= room) return;
    // Just inside the lip, on the upper side; in front of the path the ground has fallen away, and the lip with it.
    const inside = 0.02 + draws[1]! * Math.min(0.2, bank.reachUp * 0.5);
    const x = bank.x + bank.side * inside;
    const y = bank.top - (z > STILL_FRONT ? slopeDrop(z) : 0) - edges.sink(x, bank.top, z) - 0.02;
    place.position.set(x, y, z);
    // It faces out over the low side, a little to one side or the other, and leans out and down over the edge.
    place.rotation.set(1.05 + draws[2]! * 0.95, -bank.side * Math.PI / 2 + (draws[3]! - 0.5) * 1.3, 0);
    place.scale.set(0.05 + draws[4]! * 0.06, long[0] + (long[1] - long[0]) * draws[5]! ** 1.6, 1);
    place.updateMatrix();
    mesh.setMatrixAt(mesh.count, place.matrix);
    mesh.setColorAt(mesh.count++, tint.set(inks[Math.floor(draws[2]! * inks.length) % inks.length]!).multiplyScalar(0.62 + draws[4]! * 0.4));
  };
  for (const bank of lipsOf(chapter, from, to)) {
    const behind = Math.ceil(REACH_BEHIND * BEHIND);
    // Closest together just behind the plane he moves in, where the lip is nearest the eye.
    for (let i = 0; i < behind; i++) blade(bank, STILL_BEHIND - 0.03 - REACH_BEHIND * ((i + next()) / behind) ** 1.5);
    if (!bank.open) continue;
    const front = Math.ceil(REACH_FRONT * FRONT);
    for (let i = 0; i < front; i++) blade(bank, STILL_FRONT + 0.05 + (REACH_FRONT - STILL_FRONT) * ((i + next()) / front));
  }
}
