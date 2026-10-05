import { AdditiveBlending, DynamicDrawUsage, Group, InstancedMesh, MeshBasicMaterial, Object3D, PlaneGeometry } from 'three';
import type { ChapterData } from '../sim/types';
import { drawnWhile } from './idle';

/** O1's reward lives in the grass. One preallocated draw call, warmed with the rest of the chapter. */
export function songGlitter(chapter: ChapterData) {
  const group = new Group();
  const notes = (chapter.spots ?? []).filter((spot) => chapter.song?.notes.includes(spot.id));
  if (!chapter.song || !notes.length) return { group, update: (_flags: ReadonlySet<string>, _clock: number) => {} };
  const flag = chapter.song.flag;
  const left = Math.min(...notes.map((spot) => spot.at.x)) - 3;
  const width = Math.max(...notes.map((spot) => spot.at.x)) + 3 - left;
  const floor = Math.min(...notes.map((spot) => spot.at.y)) - 1.6;
  const seeds = Array.from({ length: 72 }, (_, i) => {
    const x = left + ((i * 0.61803398875) % 1) * width;
    let y = floor;
    for (let g = 1; g < chapter.ground.length; g++) {
      const a = chapter.ground[g - 1]!;
      const b = chapter.ground[g]!;
      if (b.x > a.x && x >= a.x && x <= b.x) { y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x); break; }
    }
    return { x, y: y + 0.12 + ((i * 0.41421356) % 1) * 0.9, z: -0.8 + ((i * 0.7320508) % 1) * 2.8 };
  });
  const material = new MeshBasicMaterial({ color: '#fff5b5', transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending });
  const stars = new InstancedMesh(new PlaneGeometry(1, 1), material, 72);
  stars.name = 'song-glitter';
  stars.instanceMatrix.setUsage(DynamicDrawUsage);
  stars.frustumCulled = false;
  stars.renderOrder = 4;
  group.add(stars);
  const place = new Object3D();
  return {
    group,
    update(flags: ReadonlySet<string>, clock: number) {
      const on = flags.has(flag);
      // Until the song has been played every star has no size, and the one draw call is not made (./idle.ts).
      drawnWhile(stars, on);
      for (let i = 0; i < stars.count; i++) {
        const seed = seeds[i]!;
        place.position.set(seed.x, seed.y, seed.z);
        place.rotation.z = Math.PI / 4;
        // Slow waves of light rather than a flash; no new material, particles or allocations during play.
        const size = on ? 0.035 + 0.12 * (0.5 + 0.5 * Math.sin(clock * 1.8 + i * 2.1)) ** 6 : 0;
        place.scale.set(size, size, 1);
        place.updateMatrix();
        stars.setMatrixAt(i, place.matrix);
      }
      stars.instanceMatrix.needsUpdate = true;
    },
  };
}
