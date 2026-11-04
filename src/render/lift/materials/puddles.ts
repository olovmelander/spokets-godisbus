import { Color, NoColorSpace, Vector4, type Material, type Mesh, type MeshStandardMaterial, type Object3D, type Texture } from 'three';
import type { ChapterData } from '../../../sim/types';
import { drawn, sequence } from '../../dressing/kit';
import type { ExtraContext, ExtraFrame, ViewExtra } from '../../extensions';
import { STREET_DEPTH } from '../../village';

/**
 * Puddles (docs/visual-upgrade.md): in the rain the hard ground gives back the sky, in pools it lies in and in a thin
 * film between them, looked along more than from above. It brightens with each flash, because the sky does. A lit
 * window lays a long warm streak over the wet towards the eye, along the line from the window to the camera, as a
 * lamp does on a wet road at night: the warm against the storm's cold.
 *
 * It is cheap on purpose. A noise in every fragment of the ground cost half a frame in software rendering, so where
 * the water lies comes from one small tiling picture, what it gives back is one colour, and the four nearest windows
 * are a few sums on four numbers at a time. No mirror, and no new draw.
 */

/** How much water a ground holds, by its kind: the rest drinks it. */
export const HOLDS: Readonly<Partial<Record<string, number>>> = { asphalt: 1, paving: 1, turf: 0.7, stone: 0.85, iron: 0.8, wood: 0.5, granite: 0.5, earth: 0.45 };

/** What the wet gives back: the sky's glow, dimmed, as it lies low over the ground. */
const SKY_SHARE = 0.5;
/** A lit window's warmth on the wet: candlelight, never the gold of the candy, and how far it reaches. */
const LAMP = new Color(1.35, 0.7, 0.28);
const SEEN = 4;
/** How far from him a window is still worth one of the four places, in EL. */
const REACH = 46;

/** A lit window, from above: where it stands, and the flag that lights it ('' is lit from the start). */
export interface Lamp { x: number; z: number; on: string }

const FRAGMENT = /* glsl */ `
{
  float wetUp = dot(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz));
  float wetLies = smoothstep(0.55, 0.85, wetUp) * wetHold;
  float wetPool = smoothstep(0.4, 0.68, texture2D(wetMap, wetWorld.xz * vec2(0.075, 0.16)).r);
  float wetFresnel = 0.04 + 0.96 * pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 4.0);
  outgoingLight *= 1.0 - 0.32 * wetPool * wetLies;
  outgoingLight = mix(outgoingLight, wetSky, wetFresnel * (0.14 + 0.62 * wetPool) * wetLies);
  vec4 wetAlong = (wetWorld.z - wetLampZ) / (cameraPosition.z - wetLampZ);
  vec4 wetOff = (wetWorld.x - wetLampX - (cameraPosition.x - wetLampX) * wetAlong) / 1.3;
  outgoingLight += wetLamp * dot(exp(-wetOff * wetOff), wetLampOn) * wetLies * wetFresnel * (0.3 + 0.9 * wetPool);
}
#include <opaque_fragment>`;

/** Where the water lies: soft blobs that meet themselves across the picture's edges. */
function pools(): Texture {
  const next = sequence(97);
  const size = 128;
  const texture = drawn(size, size, (c) => {
    c.fillStyle = '#000';
    c.fillRect(0, 0, size, size);
    for (let i = 0; i < 26; i++) {
      const [x, y, r] = [next() * size, next() * size, 9 + next() * 20];
      for (const dx of [-size, 0, size]) {
        for (const dy of [-size, 0, size]) {
          const blob = c.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
          blob.addColorStop(0, 'rgba(255,255,255,0.9)');
          blob.addColorStop(1, 'rgba(255,255,255,0)');
          c.fillStyle = blob;
          c.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
        }
      }
    }
  }, true);
  texture.colorSpace = NoColorSpace;
  return texture;
}

/** A chapter's lit windows: its street's, which are lit all night, and those its buildings say they have. */
export function lampsOf(chapter: ChapterData, scene: Object3D): Lamp[] {
  const lamps: Lamp[] = [];
  for (const part of chapter.street ?? []) {
    if (part.kind !== 'house') continue;
    for (const window of part.windows ?? []) lamps.push({ x: (window.from + window.to) / 2, z: STREET_DEPTH[part.depth], on: '' });
  }
  scene.traverse((object) => { lamps.push(...((object.userData.lamps as Lamp[] | undefined) ?? [])); });
  return lamps;
}

export function createPuddles(context: ExtraContext): ViewExtra | null {
  const { chapter, hemisphere, place, scene } = context;
  if (!chapter.storm?.rain || !place) return null;
  const glow = new Color(place.sky.glow).multiplyScalar(SKY_SHARE);
  const sky = { value: glow.clone() };
  const shared = {
    wetMap: { value: pools() }, wetSky: sky, wetLamp: { value: LAMP },
    wetLampX: { value: new Vector4() }, wetLampZ: { value: new Vector4() }, wetLampOn: { value: new Vector4() },
  };
  const patched = new WeakSet<Material>();
  /** The tier of the picture's first frame, kept, as for the surfaces: a change in the menu lays nothing and compiles nothing. */
  let startedOn: ExtraFrame['tier'] | null = null;
  let calmLight: number | null = null;
  let lamps: Lamp[] | null = null;

  function patch(material: MeshStandardMaterial, holds: number) {
    patched.add(material);
    const hold = { value: holds };
    const before = material.onBeforeCompile;
    const key = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => `${key()}:lift-puddles-v1`;
    material.onBeforeCompile = (shader, renderer) => {
      before.call(material, shader, renderer);
      Object.assign(shader.uniforms, shared, { wetHold: hold });
      shader.vertexShader = 'varying vec3 wetWorld;\n' + shader.vertexShader
        .replace('#include <project_vertex>', 'wetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;\n#include <project_vertex>');
      shader.fragmentShader = 'uniform sampler2D wetMap;\nuniform vec3 wetSky, wetLamp;\nuniform vec4 wetLampX, wetLampZ, wetLampOn;\nuniform float wetHold;\nvarying vec3 wetWorld;\n' + shader.fragmentShader
        .replace('#include <opaque_fragment>', FRAGMENT);
    };
    material.needsUpdate = true;
  }

  return {
    /** Patches the hard ground in `root`. Again at each warm-up: only new ones are touched. */
    patch(root: Object3D) {
      if (startedOn === 'low') return;
      root.traverse((object) => {
        const material = (object as Mesh).material as MeshStandardMaterial | undefined;
        const holds = HOLDS[material?.userData?.ground as string];
        if (material && holds && !patched.has(material)) patch(material, holds);
      });
    },
    update(frame: ExtraFrame) {
      startedOn ??= frame.tier;
      calmLight ??= hemisphere.intensity;
      sky.value.copy(glow).multiplyScalar(hemisphere.intensity / calmLight);
      if (startedOn === 'low') return;
      // Asked here and not when made: a chapter's buildings are in the scene by the first frame.
      lamps ??= lampsOf(chapter, scene);
      const near = lamps
        .filter((lamp) => Math.abs(lamp.x - frame.x) < REACH && (lamp.on === '' || frame.flags.has(lamp.on)))
        .sort((a, b) => Math.abs(a.x - frame.x) - Math.abs(b.x - frame.x));
      const [x, z, on] = [shared.wetLampX.value, shared.wetLampZ.value, shared.wetLampOn.value];
      for (let i = 0; i < SEEN; i++) {
        const lamp = near[i];
        x.setComponent(i, lamp?.x ?? 0);
        z.setComponent(i, lamp?.z ?? -1);
        // A window at the edge of its reach fades in, so that it never comes on all at once.
        on.setComponent(i, lamp ? Math.min(1, (REACH - Math.abs(lamp.x - frame.x)) / 8) : 0);
      }
    },
  };
}
