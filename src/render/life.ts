import { BufferAttribute, BufferGeometry, DataTexture, DynamicDrawUsage, Mesh, MeshBasicMaterial, type Object3D, type PlaneGeometry, type Texture } from 'three';
import { LIFE, type Smoke } from '../content/life';
import type { ChapterData, PlaceId } from '../sim/types';
import { sequence } from './dressing/kit';
import { QUADS, STRIDE, lifePlan, type Watch } from './life-plan';

/**
 * The far scenery's life, drawn: one mesh of at most 32 soft quads that hangs among a place's far pictures
 * and goes with the camera as they do. While the stage is empty it is not drawn at all. It is unlit and
 * unfogged like those pictures, and its haze is in its colours.
 *
 * Its picture is the atlas of `boot/life.glb`. Until that has arrived the mesh has a clear picture and
 * nothing happens. The material is in the scene from the first frame, so the view's warm-up compiles it.
 */

/** What the view says each frame, besides where the camera looks: is he busy, is "calm" on, and the lens. */
export type Quiet = Pick<Watch, 'busy' | 'calm' | 'eye' | 'slope'>;

export interface Life {
  mesh: Mesh;
  /** The atlas has arrived. */
  install(atlas: Texture): void;
  update(cameraX: number, groundY: number, clock: number, night: number, quiet: Quiet): void;
}

/** How far over the ground he stands on the far pictures' horizon lies: backdrop.ts hangs its cards there. */
const EYE = 1.4;

/**
 * The far village's chimneys, read off its picture as village.ts paints it: the same numbers in the same
 * order (thirty-four trees, then nine houses), 512 across 96 EL and 128 down 24. Every third house smokes.
 */
function chimneys(plate: Mesh): Smoke['at'] {
  const next = sequence(211);
  for (let i = 0; i < 102; i++) next();
  const left = plate.position.x - (plate.geometry as PlaneGeometry).parameters.width / 2;
  const out: [number, number][] = [];
  for (let i = 0; i < 9; i++) {
    const x = 20 + i * 56 + (next() - 0.5) * 16;
    const wide = 30 + next() * 12;
    const top = 80 + next() * 6;
    if (i % 3 === 1) out.push([left + ((x + wide * 0.12 + 2) * 96) / 512, ((22 - top) * 24) / 128]);
  }
  return out;
}

/**
 * Builds a place's life. `anchor` is the height the chapter starts at, as the far pictures count their
 * sinking from. `plate` is the far village's picture, where there is one: its smoke stands in the world.
 * `now` puts one kind on stage at once: the page's `&life=` switch.
 */
export function createLife(chapter: ChapterData, place: PlaceId, anchor: number, plate: Object3D | undefined, now: string | null): Life | null {
  const cast = LIFE[place];
  const plan = lifePlan(place, chapter.life, Math.random() * 1000, now, plate ? chimneys(plate as Mesh) : undefined);
  if (!cast || !plan) return null;
  const at = new BufferAttribute(new Float32Array(QUADS * 12), 3).setUsage(DynamicDrawUsage);
  const uv = new BufferAttribute(new Float32Array(QUADS * 8), 2).setUsage(DynamicDrawUsage);
  const colour = new BufferAttribute(new Float32Array(QUADS * 16), 4).setUsage(DynamicDrawUsage);
  const corners = new Uint16Array(QUADS * 6);
  for (let i = 0; i < QUADS; i++) corners.set([0, 1, 2, 0, 2, 3].map((corner) => i * 4 + corner), i * 6);
  const geometry = new BufferGeometry().setAttribute('position', at).setAttribute('uv', uv).setAttribute('color', colour).setIndex(new BufferAttribute(corners, 1));
  const material = new MeshBasicMaterial({ map: new DataTexture(new Uint8Array(4), 1, 1), vertexColors: true, transparent: true, depthWrite: false, fog: false });
  material.map!.needsUpdate = true;
  const mesh = new Mesh(geometry, material);
  mesh.name = 'life';
  // Among the far pictures, sorted with them by depth. It goes with the camera, so it is always in the picture.
  mesh.renderOrder = -3;
  mesh.frustumCulled = false;
  mesh.visible = false;
  let ready = false;
  return {
    mesh,
    install(atlas) {
      material.map = atlas;
      ready = true;
    },
    update(cameraX, groundY, clock, night, quiet) {
      const count = ready ? plan.step({ x: cameraX, clock, night, ...quiet }) : 0;
      mesh.visible = count > 0;
      if (!count) return;
      const slot = cast.slots[plan.slot]!;
      // The far village stands in the world; everything else hangs at the height of his eyes, as the far pictures do.
      const level = plate ? plate.position.y + 12 : groundY + EYE - Math.max(-5, Math.min(5, (groundY - anchor) * slot.sink));
      mesh.position.set(cameraX, level, slot.z);
      const q = plan.quads;
      for (let i = 0; i < count; i++) {
        const o = i * STRIDE;
        for (let corner = 0; corner < 4; corner++) {
          const right = corner === 1 || corner === 2;
          const up = corner > 1;
          at.setXYZ(i * 4 + corner, q[o]! + (right ? q[o + 2]! : 0), q[o + 1]! + (up ? q[o + 3]! : 0), 0);
          uv.setXY(i * 4 + corner, q[o + (right ? 5 : 4)]!, q[o + (up ? 7 : 6)]!);
          colour.setXYZW(i * 4 + corner, q[o + 8]!, q[o + 9]!, q[o + 10]!, q[o + (up ? 11 : 12)]!);
        }
      }
      geometry.setDrawRange(0, count * 6);
      at.needsUpdate = uv.needsUpdate = colour.needsUpdate = true;
    },
  };
}
