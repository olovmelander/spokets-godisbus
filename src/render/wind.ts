import { Vector2, Vector3, Vector4, type Material } from 'three';

/**
 * The wind in what grows: grass, sedge and straw sway where they stand, a dandelion nods, and every few
 * seconds a breath of wind passes along the path and lays them over for a moment. On the mountain there are
 * no such breaths: there the wind is the gusts', and the grass and the lichen lean while one blows.
 *
 * It is one clock and one gust for the whole place. The materials read them in their vertex stage (`sway`),
 * and the soft cards in front are moved by the same numbers (`windAt`), so that everything bends together.
 * With reduced motion asked for, nothing moves at all.
 */

/** A breath of wind passes a place this often, in seconds, and travels to the right this fast, in EL a second. */
export const BREATH = { every: 6.5, speed: 9 };

const air = {
  windTime: { value: 0 },
  /** How much everything moves (0: nothing does), and how strong the breaths are (0: there are none). */
  windAir: { value: new Vector2(1, 1) },
  /** The gust: where it blows, from and to along the path, and how hard, with its direction. */
  windGust: { value: new Vector3() },
};

/** A gust of the simulation's, for the picture: the stretch it sweeps, and how hard it blows now. */
export interface Blow {
  from: number;
  to: number;
  /** 0 to 1 while it blows. It blows against the way he goes, to the left. */
  blow: number;
}

/** Sets the wind for this frame. */
export function setWind(clock: number, still: boolean, breaths: boolean, gust: Blow | null): void {
  air.windTime.value = clock;
  air.windAir.value.set(still ? 0 : 1, breaths ? 1 : 0);
  air.windGust.value.set(gust?.from ?? 0, gust?.to ?? 0, gust ? -1.6 * gust.blow : 0);
}

const step = (from: number, to: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/**
 * How far the wind pushes what grows at x, to the right: between -1 and 1 in still air, about 3 at the height
 * of a breath, and about -4 in a gust. The same sum as in the materials, here for what is moved by hand.
 */
export function windAt(x: number, steady = 1): number {
  const time = air.windTime.value;
  const gust = air.windGust.value;
  const pass = (((time - x / BREATH.speed) / BREATH.every) % 1 + 1) % 1;
  const within = step(gust.x - 3, gust.x, x) * (1 - step(gust.y, gust.y + 3, x));
  const lean = air.windAir.value.y * step(0, 0.12, pass) * (1 - step(0.12, 0.5, pass)) + gust.z * within;
  return air.windAir.value.x * (
    (0.6 * Math.sin(time * 1.7 + x * 0.9) + 0.4 * Math.sin(time * 0.63 + x * 0.21)) * (steady + 0.8 * Math.abs(lean)) + 2.5 * lean);
}

const DECLARED = 'uniform float windTime; uniform vec2 windAir; uniform vec3 windGust; uniform vec4 windBend;\n';
// After `begin_vertex`, where `transformed` is the corner in its own shape's space. The push is along the
// world's x, so it is turned back into that space: the columns of an instance's matrix are its own axes.
const SWAY = /* glsl */ `
  #ifdef USE_INSTANCING
  {
    mat4 m = instanceMatrix;
    float x = m[3].x;
    float pass = fract((windTime - x / ${BREATH.speed.toFixed(1)}) / ${BREATH.every.toFixed(1)});
    float lean = windAir.y * smoothstep(0.0, 0.12, pass) * (1.0 - smoothstep(0.12, 0.5, pass))
      + windGust.z * smoothstep(windGust.x - 3.0, windGust.x, x) * (1.0 - smoothstep(windGust.y, windGust.y + 3.0, x));
    float push = windAir.x * ((0.6 * sin(windTime * 1.7 + x * 0.9) + 0.4 * sin(windTime * 0.63 + x * 0.21)) * (windBend.w + 0.8 * abs(lean)) + 2.5 * lean);
    float up = position.y * position.y;
    vec3 size = max(vec3(dot(m[0].xyz, m[0].xyz), dot(m[1].xyz, m[1].xyz), dot(m[2].xyz, m[2].xyz)), 1e-6);
    transformed += push * (windBend.x * up * sqrt(size.y) + windBend.y * up + windBend.z) * vec3(m[0].x, m[1].x, m[2].x) / size;
  }
  #endif
`;

/**
 * Makes a material's instances sway: every blade, stalk and flower head of the kit goes through here, and
 * nothing else changes their vertex stage. How a shape bends is four numbers:
 * - `blade`: its top moves by this share of its own length, and the rest by the square of the height (a
 *   blade's shape is 1 high, on its foot);
 * - `stalk`: the same, but by this many EL whatever its length, so that what sits on its top can follow;
 * - `whole`: the whole shape moves by this many EL: a flower's head on its stalk;
 * - `steady`: 1 for what sways in still air, 0 for what only a breath or a gust moves.
 *
 * It is written as the place's grade and the water's caustics are (grade.ts, water.ts): it runs what was
 * there before it, adds to the vertex stage without taking any of three's own chunks away (the caustics
 * read `transformed` after it, before `project_vertex`), and adds its name to the program's key. Every
 * material that sways gets the same text and the same key, so they differ by uniforms only: no shader is
 * made for a new bend, and none during play.
 */
export function sway(material: Material, blade: number, stalk = 0, whole = 0, steady = 1): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  const windBend = { value: new Vector4(blade, stalk, whole, steady) };
  material.customProgramCacheKey = () => `${key()}:wind-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, air, { windBend });
    shader.vertexShader = DECLARED + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>${SWAY}`);
  };
}
