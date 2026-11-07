import { Color, Group, InstancedMesh, Object3D } from 'three';
import type { ChapterData } from '../../sim/types';
import { KIT, heightAt, sequence, surfaceAt } from './kit';

/**
 * What lives on wet rock (Älven's slabs and stones, Billsta's stones in the brook): grey-green lichen in rosettes,
 * small loose stones, and straw sedge in its cracks, so that a slab reads as old rock and not as a smooth grey top.
 * A broad slab has them on its top behind the path too; a narrow stone in a river only along the path, where it
 * is rock under them. Three draws for the whole chapter. Stormöga's skerry dresses itself (moonstone.ts).
 */
export function rockLife(chapter: ChapterData, from: number, to: number): Group | null {
  const skerries = (chapter.landmarks ?? []).filter((mark) => mark.look === 'skerry');
  const stretches = (chapter.surfaces ?? [])
    .filter((s) => s.kind === 'wetRock' && s.to > from && s.from < to)
    .filter((s) => skerries.every((mark) => s.to <= mark.from || s.from >= mark.to));
  if (stretches.length === 0) return null;
  const length = stretches.reduce((sum, s) => sum + (s.to - s.from), 0);
  const next = sequence(Math.round(from * 13 + length * 7));
  const place = new Object3D();
  const tint = new Color();
  const lichen = new InstancedMesh(KIT.ball, KIT.moss, Math.max(1, Math.round(length * 6)));
  const loose = new InstancedMesh(KIT.ball, KIT.moss, Math.max(1, Math.round(length * 1.4)));
  const cracks = new InstancedMesh(KIT.blade, KIT.straw, Math.max(1, Math.round(length * 7)));
  const LICHEN = ['#8d9a7c', '#a9ad90', '#76846c', '#bdb89c', '#c9a85a'];
  /** A place on the rock: along a stretch, at a depth it has rock at, and the rock's top there. */
  const spot = (front: number) => {
    const s = stretches[Math.floor(next() * stretches.length)]!;
    const wide = s.to - s.from;
    const x = s.from + 0.2 + next() * Math.max(0, wide - 0.4);
    const back = wide > 3 ? 3.6 : 0.9;
    const z = next() < front ? 0.45 + next() * 0.3 : -0.4 - next() ** 1.3 * back;
    if (surfaceAt(chapter, x) !== 'wetRock') return null;
    return { x, z, y: heightAt(chapter, x) - (z > 0.45 ? 0.05 * (z - 0.45) / 0.3 : 0) };
  };
  let l = 0, st = 0, cr = 0;
  for (let i = 0; i < lichen.count; i++) {
    const at = spot(0.25);
    if (!at) continue;
    const wide = 0.07 + next() ** 1.8 * 0.26;
    place.position.set(at.x, at.y + 0.004, at.z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(wide * (0.8 + next() * 0.5), 0.012, wide * (0.8 + next() * 0.5));
    place.updateMatrix();
    lichen.setMatrixAt(l, place.matrix);
    lichen.setColorAt(l++, tint.set(LICHEN[Math.floor(next() * LICHEN.length)]!).multiplyScalar(0.75 + next() * 0.35));
  }
  for (let i = 0; i < loose.count; i++) {
    const at = spot(0.1);
    if (!at) continue;
    const size = 0.05 + next() ** 2 * 0.16;
    place.position.set(at.x, at.y - size * 0.3, at.z);
    place.rotation.set(next() * 0.5, next() * 6.28, next() * 0.5);
    place.scale.set(size * (1 + next() * 0.6), size * (0.55 + next() * 0.3), size * (1 + next() * 0.4));
    place.updateMatrix();
    loose.setMatrixAt(st, place.matrix);
    loose.setColorAt(st++, tint.set('#5a6068').multiplyScalar(0.8 + next() * 0.4));
  }
  for (let tuft = 0; cr < cracks.count && tuft < cracks.count; tuft++) {
    const at = spot(0);
    if (!at || at.z > -0.5 || next() > 0.6) continue;
    const tall = 0.25 + next() * 0.45;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && cr < cracks.count; k++) {
      place.position.set(at.x + (next() - 0.5) * 0.16, at.y - 0.02, at.z + (next() - 0.5) * 0.14);
      place.rotation.set((next() - 0.5) * 0.8, next() * 6.28, (next() - 0.5) * 0.8);
      place.scale.set(0.03 + next() * 0.02, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      cracks.setMatrixAt(cr, place.matrix);
      cracks.setColorAt(cr++, tint.set(next() < 0.3 ? '#7f8a48' : '#c9b268').multiplyScalar(0.7 + next() * 0.35));
    }
  }
  lichen.count = l; loose.count = st; cracks.count = cr;
  const group = new Group();
  group.name = 'rock-life';
  for (const mesh of [lichen, loose, cracks]) {
    if (mesh.count === 0) continue;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group.children.length ? group : null;
}
