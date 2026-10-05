import { BufferAttribute, BufferGeometry, DataTexture, DynamicDrawUsage, Mesh, MeshBasicMaterial, SRGBColorSpace, type Object3D, type PlaneGeometry, type Texture } from 'three';
import { LIFE, type Smoke } from '../content/life';
import type { ChapterData, PlaceId } from '../sim/types';
import { sunk } from './backdrop';
import { sequence } from './dressing/kit';
import { drawnWhile } from './idle';
import { QUADS, STRIDE, lifePlan, type Watch } from './life-plan';

/**
 * The far scenery's life, drawn: one mesh of at most 32 soft quads that hangs among a place's far pictures
 * and goes with the camera as they do. It is unlit and unfogged like those pictures, and its haze is in its
 * colours.
 *
 * Nothing of it is made during play (plan §6.12, gate 6). While its stage is empty it is out of the picture
 * and idle (./idle.ts), so the view's first frames draw it once: its shader, its buffers and its picture
 * exist from then on. Its picture is the atlas of `boot/life.glb`. Until that has arrived it has a clear
 * picture of one pixel: what is always there (smoke, far windows) is drawn with it, unseen, so the place's
 * draw calls do not change when the atlas comes, and nothing begins on a stage. The atlas then takes the clear
 * picture's place in the same material: the same kind of picture, so no shader is made, and one picture for
 * another, so the count of pictures stays what it was.
 */

/** What the view says each frame, besides where the camera looks: is he busy, is "calm" on, and the lens. */
export type Quiet = Pick<Watch, 'busy' | 'calm' | 'eye' | 'slope'>;

/**
 * What is asked of the life from outside. `now` puts one kind on stage at once and again and again: the
 * page's `&life=` switch, for pictures. `seed` decides what comes in some visits only: the page gives each
 * visit its own, and a view made without one (a test's) has the same life every time.
 */
export interface LifeAsk {
  now?: string | null;
  seed?: number;
}

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
 */
export function createLife(chapter: ChapterData, place: PlaceId, anchor: number, plate: Object3D | undefined, ask: LifeAsk = {}): Life | null {
  const cast = LIFE[place];
  const plan = lifePlan(place, chapter.life, ask.seed ?? 0, ask.now ?? null, plate ? chimneys(plate as Mesh) : undefined);
  if (!cast || !plan) return null;
  const at = new BufferAttribute(new Float32Array(QUADS * 12), 3).setUsage(DynamicDrawUsage);
  const uv = new BufferAttribute(new Float32Array(QUADS * 8), 2).setUsage(DynamicDrawUsage);
  const colour = new BufferAttribute(new Float32Array(QUADS * 16), 4).setUsage(DynamicDrawUsage);
  const corners = new Uint16Array(QUADS * 6);
  for (let i = 0; i < QUADS; i++) corners.set([0, 1, 2, 0, 2, 3].map((corner) => i * 4 + corner), i * 6);
  const geometry = new BufferGeometry().setAttribute('position', at).setAttribute('uv', uv).setAttribute('color', colour).setIndex(new BufferAttribute(corners, 1));
  geometry.setDrawRange(0, 0);
  // One clear pixel, in the atlas's colour space: the atlas takes its place without a new shader.
  const clear = new DataTexture(new Uint8Array(4), 1, 1);
  clear.colorSpace = SRGBColorSpace;
  clear.needsUpdate = true;
  const material = new MeshBasicMaterial({ map: clear, vertexColors: true, transparent: true, depthWrite: false, fog: false });
  const mesh = new Mesh(geometry, material);
  mesh.name = 'life';
  // Among the far pictures, sorted with them by depth. It goes with the camera, so it is always in the picture.
  mesh.renderOrder = -3;
  mesh.frustumCulled = false;
  drawnWhile(mesh, false);
  let ready = false;
  return {
    mesh,
    install(atlas) {
      if (ready) return;
      material.map = atlas;
      clear.dispose();
      ready = true;
    },
    update(cameraX, groundY, clock, night, quiet) {
      const count = plan.step({ x: cameraX, clock, night, ...quiet, wait: !ready });
      // Out of the picture while there is nothing to draw, and drawn by the view's warm-up all the same.
      drawnWhile(mesh, count > 0);
      geometry.setDrawRange(0, count * 6);
      if (!count) return;
      const slot = cast.slots[plan.slot]!;
      // The far village stands in the world; everything else hangs at the height of his eyes, as the far pictures do.
      const level = plate ? plate.position.y + 12 : groundY + EYE - sunk(slot.sink, groundY - anchor);
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
      at.needsUpdate = uv.needsUpdate = colour.needsUpdate = true;
    },
  };
}
