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
  /**
   * Him, for what he walks through (docs/visual-upgrade.md): where his feet are, how fast he goes along (held a
   * little after he stops, so that what he passed springs back), and how much he bends it (0: not at all).
   */
  windPlayer: { value: new Vector4(0, -1e4, 0, 0) },
};

/** A gust of the simulation's, for the picture: the stretch it sweeps, and how hard it blows now. */
export interface Blow {
  from: number;
  to: number;
  /** 0 to 1 while it blows. It blows against the way he goes, to the left. */
  blow: number;
}

let carried = 0;

/**
 * Sets where he is, each frame, from the lift's flora (./lift/flora.ts): what grows round him leans away from
 * him and springs back after him. With reduced motion it only leans, gently, and does not spring.
 */
export function setPlayer(x: number, y: number, vx: number, dt: number, still: boolean, near = 1): void {
  carried += (vx - carried) * Math.min(1, dt * (Math.abs(vx) > Math.abs(carried) ? 12 : 2.5));
  air.windPlayer.value.set(x, y, still ? 0 : carried, near * (still ? 0.5 : 1));
}

/**
 * How far he pushes what grows with its foot at x, y, z and `tall` high, to the right, in the units of `windAt`:
 * the same sum as in the materials, for what is moved by hand (the soft cards in front). Without `y`, it stands
 * at his own height.
 */
export function bendAt(x: number, y?: number, z = 0, tall = 1): number {
  const { x: px, y: py, z: speed, w: strength } = air.windPlayer.value;
  const dx = x - px;
  const rise = y === undefined ? 0 : py - y;
  const reach = strength * Math.exp(-1.2 * z * z) * step(-0.5, 0.1, rise) * (1 - step(0.4, 1, rise - tall));
  const lean = (dx / (Math.abs(dx) + 0.2)) * Math.exp(-2.2 * dx * dx) * 7;
  const behind = Math.max(0, -dx * Math.sign(speed));
  if (behind <= 0) return reach * lean;
  // Once he has passed, it swings back past upright and settles, the sooner the faster he went.
  const t = behind / Math.max(Math.abs(speed), 0.5);
  const swing = -7 * Math.sign(speed) * step(0, 0.35, behind) * Math.exp(-2.5 * t) * Math.cos(9 * t);
  return reach * (lean + (swing - lean) * Math.min(1, Math.abs(speed) / 3));
}

/** Sets the wind for this frame. */
export function setWind(clock: number, still: boolean, breaths: boolean, gust: Blow | null): void {
  air.windTime.value = clock;
  air.windAir.value.set(still ? 0 : 1, breaths ? 1 : 0);
  air.windGust.value.set(gust?.from ?? 0, gust?.to ?? 0, gust ? -1.6 * gust.blow : 0);
}

/** The wind's own clock, for a material of the lift that moves by it in a way of its own (a leaf's flutter). */
export const WIND = air;

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

const DECLARED = 'uniform float windTime, windNear; uniform vec2 windAir; uniform vec3 windGust; uniform vec4 windBend, windPlayer;\n';
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
    float k = windBend.x * up * sqrt(size.y) + windBend.y * up + windBend.z;
    vec3 ax = vec3(m[0].x, m[1].x, m[2].x) / size;
    transformed += push * k * ax;
    // He bends what he walks through away from him, and what he has passed springs back after him (bendAt).
    float dx = x - windPlayer.x;
    float rise = windPlayer.y - m[3].y;
    // What sits on a stalk's top (a dandelion's head) is as high as its stalk, and goes with it.
    float low = windBend.z > 0.0 ? -2.0 : -0.5;
    float reach = windNear * windPlayer.w * exp(-1.2 * m[3].z * m[3].z) * smoothstep(low, low + 0.6, rise) * (1.0 - smoothstep(0.4, 1.0, rise - sqrt(size.y)));
    float away = dx / (abs(dx) + 0.2) * exp(-2.2 * dx * dx) * 7.0;
    float behind = max(0.0, -dx * sign(windPlayer.z));
    float t = behind / max(abs(windPlayer.z), 0.5);
    float swing = -7.0 * sign(windPlayer.z) * smoothstep(0.0, 0.35, behind) * exp(-2.5 * t) * cos(9.0 * t);
    float b = k * reach * (behind > 0.0 ? mix(away, swing, min(1.0, abs(windPlayer.z) / 3.0)) : away);
    transformed += b * (ax + 0.4 * sign(m[3].z) * vec3(m[0].z, m[1].z, m[2].z) / size) - b * b * 0.5 / max(sqrt(size.y), 0.3) * vec3(m[0].y, m[1].y, m[2].y) / size;
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
 * - `steady`: 1 for what sways in still air, 0 for what only a breath or a gust moves;
 * - `near`: how much it bends as he walks through it (`setPlayer`): 1 for grass, 0 for a tree's crown.
 *
 * It is written as the place's grade and the water's caustics are (grade.ts, water.ts): it runs what was
 * there before it, adds to the vertex stage without taking any of three's own chunks away (the caustics
 * read `transformed` after it, before `project_vertex`), and adds its name to the program's key. Every
 * material that sways gets the same text and the same key, so they differ by uniforms only: no shader is
 * made for a new bend, and none during play.
 */
export function sway(material: Material, blade: number, stalk = 0, whole = 0, steady = 1, near = 1): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  const windBend = { value: new Vector4(blade, stalk, whole, steady) };
  const windNear = { value: near };
  material.customProgramCacheKey = () => `${key()}:wind-v1`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, air, { windBend, windNear });
    shader.vertexShader = DECLARED + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>${SWAY}`);
  };
}
