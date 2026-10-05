import { Group, InstancedMesh, MeshStandardMaterial, Object3D, TorusGeometry } from 'three';
import type { ChapterData, Hook } from '../sim/types';

/** Rings further apart than this hang in different places. */
const APART = 10;

/** The places a chapter's rings hang in: a row over a side way, or the swings of one stretch of the trail. */
export function ringPlaces(hooks: readonly Hook[]): Hook[][] {
  const places: Hook[][] = [];
  for (const hook of [...hooks].sort((a, b) => a.x - b.x)) {
    const last = places.at(-1);
    if (last && hook.x - last.at(-1)!.x < APART) last.push(hook);
    else places.push([hook]);
  }
  return places;
}

/**
 * Every hook has a red ring: the one sign the game teaches for "the lace goes here" (plan §4.2). The rings of
 * one place are one mesh, drawn only while the place is in sight: a row of rings costs the picture one draw
 * call, and rings far from him none.
 */
export function buildHooks(chapter: Pick<ChapterData, 'hooks'>): Group {
  const group = new Group();
  group.name = 'rings';
  const shape = new TorusGeometry(0.19, 0.045, 10, 28);
  const red = new MeshStandardMaterial({ color: '#d8382c', roughness: 0.35 });
  const place = new Object3D();
  for (const here of ringPlaces(chapter.hooks ?? [])) {
    const rings = new InstancedMesh(shape, red, here.length);
    for (const [i, hook] of here.entries()) {
      place.position.set(hook.x, hook.y, -0.05);
      place.updateMatrix();
      rings.setMatrixAt(i, place.matrix);
    }
    rings.instanceMatrix.needsUpdate = true;
    rings.computeBoundingSphere();
    group.add(rings);
  }
  return group;
}
