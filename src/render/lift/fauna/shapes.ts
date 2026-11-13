import {
  AdditiveBlending, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute,
  InstancedBufferAttribute, InstancedMesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture } from '../../glow';

/**
 * The near forest's life, as shapes built in code (docs/visual-upgrade.md): low-poly and round, as Äventyr 1's
 * stand-ins and the jay are, and dull and natural in colour: never the candy's red, pink or gold.
 *
 * Every creature faces +x with its feet at the origin, in EL. Its colours are on its corners, and each corner
 * says how it moves (its `rig`): the vertex stage turns a tail, a head, a wing or a lid about its pivot by the
 * numbers each instance carries in `act`. So all of them are one material and one program, a creature of a kind
 * is one draw call, and nothing but a few numbers an instance goes to the graphics card each frame.
 */

export type V3 = readonly [number, number, number];
/**
 * How a part moves, read in the vertex stage:
 * - 0: it does not;
 * - 1: it pitches, by `act.y` × gain and `act.w` × aux: a tail, a leg;
 * - 2: a head: turned by `act.z` × gain, and nodded by `act.w` × aux;
 * - 3: a wing: spread by `act.y` along its span (z), and beaten by `act.x` × gain;
 * - 4: a lid: closed by `act.w` from its pivot down, and turned with the head by `act.z` × gain.
 */
export type Rig = readonly [id: number, gain?: number, aux?: number, pivot?: V3];
/** A part: its shape (ball, bead, facet, cone, rod), colour, middle, size, its tilt about x and z and turn about y, and rig. */
export type Part = readonly [shape: 'b' | 'e' | 'f' | 'c' | 'r', colour: string, at: V3, size: V3 | number, turn?: V3, rig?: Rig];

let units: Record<Part[0], BufferGeometry> | null = null;
const ink = new Color();
const NONE: V3 = [0, 0, 0];

/** Both sides of a creature: `make` is given +1 for the near side (+z) and -1 for the far one. */
export const both = (make: (side: number) => Part): Part[] => [make(1), make(-1)];

/** Merges parts into one shape, with its colours, pivots and rigs on its corners. */
export function build(parts: readonly Part[]): BufferGeometry {
  units ??= {
    b: new SphereGeometry(1, 12, 8), e: new SphereGeometry(1, 7, 5), f: new SphereGeometry(1, 6, 4),
    c: new ConeGeometry(1, 1, 7), r: new CylinderGeometry(0.8, 1, 1, 7),
  };
  return mergeGeometries(parts.map(([shape, colour, at, size, turn = NONE, rig = [0]]) => {
    const s = typeof size === 'number' ? [size, size, size] : size;
    // Tilted first (about z, then x), and turned about the upright last.
    const g = units![shape].clone().scale(s[0]!, s[1]!, s[2]!).rotateZ(turn[2]).rotateX(turn[0]).rotateY(turn[1]).translate(...at);
    g.deleteAttribute('uv');
    const n = g.getAttribute('position').count;
    const fill = (values: readonly number[]) => new Float32BufferAttribute(Array.from({ length: n * values.length }, (_, i) => values[i % values.length]!), values.length);
    ink.set(colour);
    g.setAttribute('color', fill([ink.r, ink.g, ink.b]));
    g.setAttribute('pivot', fill(rig[3] ?? at));
    g.setAttribute('rig', fill([rig[0], rig[1] ?? 1, rig[2] ?? 0]));
    return g;
  }))!;
}

/** What sets the creatures' poses, after three's own corner and normal. */
const RIG = /* glsl */ `attribute vec3 pivot;
attribute vec3 rig;
attribute vec4 act;
mat3 faunaRx(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 faunaRy(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 faunaRz(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
mat3 faunaTurn() {
  if (rig.x < .5) return mat3(1.);
  if (rig.x < 1.5) return faunaRz(act.y * rig.y + act.w * rig.z);
  if (rig.x < 2.5) return faunaRy(act.z * rig.y) * faunaRz(act.w * rig.z);
  if (rig.x < 3.5) return faunaRx(act.x * rig.y);
  return faunaRy(act.z * rig.y);
}
`;
const POSE = /* glsl */ `#include <begin_vertex>
{
  vec3 p = transformed - pivot;
  if (rig.x > 3.5) { p.y *= max(act.w, .02); p = faunaTurn() * (p + pivot); }
  else { if (rig.x > 2.5) p.z *= act.y; p = faunaTurn() * p + pivot; }
  transformed = p;
}`;

/** The one material every creature that moves is drawn with: its colours on its corners, and its rig. */
export function creatureMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88, side: DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = RIG + shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nobjectNormal = faunaTurn() * objectNormal;')
      .replace('#include <begin_vertex>', POSE);
  };
  material.customProgramCacheKey = () => 'fauna-rig-v1';
  return material;
}

/** Many of one creature, each with its pose numbers, white unless tinted, and nowhere until it is put somewhere. */
export function herd(shape: BufferGeometry, count: number, material: Material): InstancedMesh {
  shape.setAttribute('act', new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage));
  const mesh = new InstancedMesh(shape, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  for (let i = 0; i < count; i++) mesh.setColorAt(i, ink.setRGB(1, 1, 1));
  return mesh;
}

/** A shape that never moves, without its rig: the stones, stumps and branches, and the carvings. */
export function plain(parts: readonly Part[]): BufferGeometry {
  const shape = build(parts);
  shape.deleteAttribute('pivot');
  shape.deleteAttribute('rig');
  return shape;
}

/**
 * Glints: soft round points of added light. A firefly drifts and glows up and fades by itself, slower than once a
 * second; a dragonfly's wings are a glint that keeps its brightness. Per instance `fly` is: its phase, its speed,
 * how far it drifts (0: it is a wing, and holds still), and how bright it is.
 */
export function glintMaterial(time: { value: number }, glow: { value: number }): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ map: glowTexture(32), transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { faunaTime: time, faunaGlow: glow });
    shader.vertexShader = 'attribute vec4 fly;\nuniform float faunaTime, faunaGlow;\nvarying float vGlint;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      float ft = faunaTime * fly.y + fly.x;
      transformed += fly.z * vec3(sin(ft * .7) + .5 * sin(ft * 1.9), .6 * sin(ft * .9 + 1.3), .5 * cos(ft * .6));
      vGlint = fly.z > 0. ? fly.w * faunaGlow * (.3 + .7 * smoothstep(.1, .9, .5 + .5 * sin(faunaTime * (.45 + .3 * fly.y) + fly.x * 3.1))) : fly.w;`);
    shader.fragmentShader = 'varying float vGlint;\n' + shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.a *= vGlint;');
  };
  material.customProgramCacheKey = () => 'fauna-glint-v1';
  return material;
}

/** The glints' card, with its numbers. */
export function glints(count: number, material: Material): InstancedMesh {
  const card = new PlaneGeometry(1, 1);
  card.setAttribute('fly', new InstancedBufferAttribute(new Float32Array(count * 4), 4));
  const mesh = new InstancedMesh(card, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.renderOrder = 3;
  for (let i = 0; i < count; i++) mesh.setColorAt(i, ink.setRGB(1, 1, 1));
  return mesh;
}

// --- the creatures ------------------------------------------------------------------------------------------

const EYE = '#1d1915';

/** A red squirrel, as dull as a red squirrel is in the shade: brown with an orange cast, a pale belly, a bushy tail. */
export function squirrel(): BufferGeometry {
  const fur = '#a87842';
  const head: Rig = [2, 1, 0, [0.3, 0.44, 0]];
  const tail: Rig = [1, 1, 0, [-0.34, 0.34, 0]];
  const curl: [number, number, number][] = [[-0.42, 0.38, 0.11], [-0.55, 0.49, 0.14], [-0.64, 0.66, 0.16], [-0.65, 0.86, 0.16], [-0.58, 1.01, 0.14], [-0.47, 1.08, 0.11], [-0.38, 1.04, 0.07]];
  return build([
    ['b', fur, [-0.02, 0.3, 0], [0.4, 0.21, 0.19]],
    ['b', '#e0d6bf', [0.07, 0.24, 0], [0.3, 0.14, 0.15]],
    ['b', fur, [-0.2, 0.27, 0], [0.22, 0.22, 0.2]],
    ['b', fur, [0.4, 0.47, 0], [0.18, 0.155, 0.145], NONE, head],
    ['b', '#b48a5c', [0.55, 0.44, 0], [0.085, 0.075, 0.075], NONE, head],
    ['e', EYE, [0.635, 0.45, 0], 0.024, NONE, head],
    ...both((s) => ['e', EYE, [0.5, 0.51, s * 0.11], 0.035, NONE, head]),
    ...both((s) => ['c', '#7e603c', [0.37, 0.66, s * 0.075], [0.045, 0.16, 0.035], [s * 0.25, 0, 0.12], head]),
    // Its legs gallop by `act.w`: fore and hind reach and gather in turn. The head's aux is 0, so it stays out of that.
    ...both((s) => ['r', fur, [0.27, 0.14, s * 0.09], [0.035, 0.22, 0.035], [0, 0, -0.35], [1, 0, 1, [0.27, 0.32, s * 0.09]]]),
    ...both((s) => ['b', fur, [-0.17, 0.06, s * 0.11], [0.15, 0.05, 0.055], NONE, [1, 0, -1, [-0.17, 0.26, s * 0.11]]]),
    ...curl.map(([x, y, r], i): Part => ['b', i % 2 ? '#a27848' : '#9a7040', [x, y, 0], [r, r, r * 0.8], NONE, tail]),
  ]);
}

/** A fox, far off: muted rust-brown, a white chest and tail tip, dark socks. Standing, it is 1 tall at the shoulder. */
export function fox(): BufferGeometry {
  const fur = '#926c42';
  const white = '#ddd6c8';
  const sock = '#4a3b2f';
  const head: Rig = [2, 1, -1, [0.7, 1.02, 0]];
  const shoulder: V3 = [0.48, 0.66, 0];
  const legs = (x: number, gain: number, aux: number): Part[] => both((s) => ['r', sock, [x, 0.34, s * 0.11], [0.045, 0.68, 0.045], NONE, [1, gain * s, aux, [x, shoulder[1], s * 0.11]]])
    .concat(both((s) => ['b', fur, [x, 0.66, s * 0.12], [0.1, 0.2, 0.07], NONE, [1, gain * s, aux, [x, shoulder[1], s * 0.11]]]));
  const tail: Rig = [1, 0.18, -0.5, [-0.7, 0.88, 0]];
  return build([
    ['b', fur, [0, 0.8, 0], [0.72, 0.25, 0.23]],
    ['b', fur, [0.42, 0.85, 0], [0.27, 0.27, 0.23]],
    ['b', white, [0.6, 0.76, 0], [0.17, 0.23, 0.17]],
    ['b', fur, [-0.46, 0.8, 0], [0.3, 0.27, 0.24]],
    ['b', fur, [0.67, 0.98, 0], [0.18, 0.21, 0.15]],
    ['b', fur, [0.86, 1.12, 0], [0.2, 0.165, 0.165], NONE, head],
    ['b', white, [0.93, 1.06, 0], [0.14, 0.085, 0.14], NONE, head],
    ['c', fur, [1.08, 1.08, 0], [0.075, 0.25, 0.075], [0, 0, -Math.PI / 2], head],
    ['e', EYE, [1.2, 1.08, 0], 0.03, NONE, head],
    ...both((s) => ['e', EYE, [1.0, 1.17, s * 0.085], 0.024, NONE, head]),
    ...both((s) => ['c', '#5c4a3a', [0.82, 1.36, s * 0.09], [0.075, 0.2, 0.04], [-s * 0.15, 0, -0.1], head]),
    ...legs(shoulder[0], 0.5, -1),
    ...legs(-0.5, -0.5, 1.1),
    ['b', fur, [-0.8, 0.86, 0], [0.18, 0.13, 0.13], NONE, tail],
    ['b', fur, [-1.02, 0.78, 0], [0.2, 0.15, 0.15], NONE, tail],
    ['b', fur, [-1.24, 0.66, 0], [0.17, 0.14, 0.14], NONE, tail],
    ['b', white, [-1.41, 0.57, 0], [0.11, 0.1, 0.1], NONE, tail],
  ]);
}

/** A tawny owl, round and soft: a pale face with dark eyes that have no shine, and lids that close slowly. 1 tall. */
export function owl(): BufferGeometry {
  const brown = '#76644e';
  const face = '#d2c3a2';
  const head: Rig = [2, 1, 0, [0, 0.74, 0]];
  return build([
    ['b', brown, [0, 0.42, 0], [0.3, 0.38, 0.28]],
    ['b', '#a8957a', [0.09, 0.38, 0], [0.23, 0.31, 0.23]],
    ...both((s) => ['b', '#665643', [-0.02, 0.44, s * 0.2], [0.25, 0.32, 0.08], [s * 0.12, 0, 0]]),
    ['b', '#5e4f3e', [-0.14, 0.12, 0], [0.1, 0.16, 0.12], [0, 0, -0.3]],
    ['b', brown, [0.02, 0.85, 0], [0.27, 0.24, 0.27], NONE, head],
    ['b', face, [0.15, 0.86, 0], [0.13, 0.2, 0.23], NONE, head],
    ['c', '#a89878', [0.29, 0.83, 0], [0.022, 0.06, 0.022], [0, 0, Math.PI], head],
    // Round eyes in pale rims: soft brown round a small dark middle, nothing in them that shines, and the lids
    // resting half down.
    ...both((s) => ['e', '#ebe2ca', [0.25, 0.89, s * 0.09], [0.045, 0.085, 0.082], NONE, head]),
    ...both((s) => ['e', '#8a6e4c', [0.275, 0.885, s * 0.09], [0.03, 0.056, 0.054], NONE, head]),
    ...both((s) => ['e', EYE, [0.293, 0.885, s * 0.09], [0.016, 0.028, 0.028], NONE, head]),
    ...both((s) => ['b', face, [0.262, 0.89, s * 0.09], [0.06, 0.09, 0.088], NONE, [4, 1, 0, [0.262, 0.98, s * 0.09]]]),
    ...both((s) => ['b', '#8a7a5e', [0.1, 0.03, s * 0.08], [0.07, 0.035, 0.05]]),
  ]);
}

/**
 * A small bird's colours: back, belly, head, cheek, wing, tail, beak, and a bib or eye stripe where it has one. A
 * long-tailed bird (`long`, its tail's length against a tit's) cocks its tail as it pecks, by `pump`; `patch` is a pale
 * patch on its folded wing, `cap` a dark crown, and `eye` an iris that is not dark.
 */
export interface Plumage {
  back: string; belly: string; head: string; cheek: string; wing: string; tail: string; beak: string; bib?: string; speckled?: boolean;
  long?: number; pump?: number; patch?: string; cap?: string; eye?: string;
}

/**
 * The small birds, each 1 long before its size: a great tit, a blue tit, a house sparrow and a song thrush; and
 * those that come by themselves now and then (../fauna.ts, visitors): a white wagtail, a magpie and a jackdaw, as
 * big against him as they are against a child's hand. Black, white and grey: none has the candy's colours. They are
 * modelled in Blender (./bird-kit.ts); these colours and sizes are what the game and the shapes built in code until the
 * kit has come go by.
 */
export const BIRDS = {
  tit: { size: 0.95, back: '#7f8f5a', belly: '#c8b863', head: '#29292c', cheek: '#ecebe4', wing: '#6b7988', tail: '#5d6a78', beak: '#2a2622', bib: '#29292c' },
  blue: { size: 0.82, back: '#8a9a5c', belly: '#cfc474', head: '#5f86b4', cheek: '#efeee8', wing: '#6a8cb4', tail: '#5f7ea6', beak: '#2a2622' },
  sparrow: { size: 0.98, back: '#866a4a', belly: '#c4beb2', head: '#8a8c8e', cheek: '#d8d4cc', wing: '#7a6042', tail: '#5e4c3a', beak: '#3a3430', bib: '#3a3430' },
  thrush: { size: 1.45, back: '#7a654a', belly: '#ddd2b6', head: '#7a654a', cheek: '#d2c6a8', wing: '#6e5a42', tail: '#6a5842', beak: '#4e4236', speckled: true },
  wagtail: { size: 1.0, back: '#8e9296', belly: '#ecebe6', head: '#eeeeea', cheek: '#f2f2ee', wing: '#3c3d40', tail: '#2c2d30', beak: '#26241f', bib: '#232326', cap: '#232326', long: 1.7, pump: 1.1 },
  magpie: { size: 2.0, back: '#1d2124', belly: '#ecebe6', head: '#1b1e21', cheek: '#1f2326', wing: '#1f2a30', tail: '#1c272c', beak: '#16171a', patch: '#e8e7e2', long: 2.4, pump: 0.7 },
  jackdaw: { size: 1.9, back: '#3b3e43', belly: '#464a4f', head: '#25272b', cheek: '#8e9398', wing: '#2c2f34', tail: '#2a2d31', beak: '#1a1b1e', cap: '#1d1e21', eye: '#d6dbdc', long: 1.2, pump: 0.4 },
} satisfies Record<string, Plumage & { size: number }>;
export type Species = keyof typeof BIRDS;

/** A butterfly, 0.4 EL across: white wings that its instance tints, a dark body. Its wings beat about its body. */
export function butterfly(): BufferGeometry {
  return build([
    ['r', '#4a463e', [0, 0, 0], [0.012, 0.13, 0.012], [0, 0, Math.PI / 2]],
    ...both((s) => ['b', '#f6f5ee', [0.02, 0, s * 0.095], [0.065, 0.005, 0.1], [0, 0.25 * s, 0], [3, s, 0, [0.02, 0, 0]]]),
    ...both((s) => ['b', '#e4e2da', [-0.035, 0, s * 0.07], [0.05, 0.005, 0.07], [0, -0.3 * s, 0], [3, s, 0, [0.02, 0, 0]]]),
    ...both((s) => ['r', '#4a463e', [0.09, 0.035, s * 0.02], [0.004, 0.08, 0.004], [s * 0.3, 0, -0.9]]),
  ]);
}

/** A dragonfly, half an EL long: blue-green, with big eyes. Its wings are glints. */
export function dragonfly(): BufferGeometry {
  return build([
    ['r', '#3f8f8a', [-0.15, 0, 0], [0.016, 0.32, 0.016], [0, 0, Math.PI / 2]],
    ...[-0.08, -0.16, -0.24].map((x): Part => ['e', '#2f6b6e', [x, 0, 0], [0.012, 0.019, 0.019]]),
    ['b', '#356f74', [0.05, 0, 0], [0.05, 0.04, 0.038]],
    ['b', '#2f5f70', [0.1, 0.005, 0], [0.035, 0.032, 0.046]],
  ]);
}

/**
 * A big bird high in the air: a raven or a hooded crow, modelled in Blender (./bird-kit.ts). Its colours, for the shape
 * built in code until the kit has come.
 */
export interface Soaring { body: string; head: string; wing: string; tail: string; beak: string; wedge?: boolean }
export const SOARING = {
  raven: { body: '#1c1e23', head: '#191b1f', wing: '#1e2127', tail: '#1b1d22', beak: '#141518', wedge: true },
  crow: { body: '#8d9094', head: '#202226', wing: '#23262b', tail: '#222428', beak: '#18191c' },
} satisfies Record<string, Soaring>;

/** A bat at dusk, 1 across with its wings spread: a small dark furry body, two ears, and thin wings that beat fast. */
export function bat(): BufferGeometry {
  const fur = '#3b332d';
  const skin = '#2e2824';
  const wing = (s: number, at: V3, size: V3): Part => ['e', skin, [at[0], at[1], s * at[2]], size, NONE, [3, s, 0, [0, 0, s * 0.04]]];
  return build([
    ['e', fur, [0, 0, 0], [0.11, 0.06, 0.065]],
    ['e', fur, [0.1, 0.01, 0], [0.05, 0.045, 0.045]],
    ...both((s) => ['c', fur, [0.11, 0.06, s * 0.025], [0.018, 0.05, 0.012], [s * 0.3, 0, -0.2]]),
    ...both((s) => wing(s, [0.0, 0, 0.22], [0.1, 0.008, 0.2])),
    // The scalloped trailing edge: the fingers' lobes.
    ...both((s) => wing(s, [-0.06, 0, 0.3], [0.07, 0.006, 0.1])),
    ...both((s) => wing(s, [0.03, 0, 0.42], [0.05, 0.006, 0.08])),
  ]);
}

/**
 * A little forest being: a round body of moss over bark, soft dark eyes that blink, a nose of bark, twig arms,
 * and a leaf for a cap, or lichen. A child's drawing of a vätte: curious and kind. 0.55 tall.
 */
export function being(lichen: boolean): BufferGeometry {
  const moss = '#5e7a3a';
  return build([
    ['b', '#6b5a44', [0, 0.13, 0], [0.21, 0.14, 0.2]],
    ['b', moss, [0, 0.27, 0], [0.2, 0.23, 0.19]],
    ...[[-0.06, 0.4, 0.08], [0.08, 0.38, -0.12], [-0.12, 0.25, 0.14], [0.02, 0.44, -0.04]].map(([x, y, z]): Part => ['e', '#7f9a48', [x!, y!, z!], 0.06]),
    // A paler face, so that its dark eyes are seen.
    ['b', '#93a65e', [0.13, 0.31, 0], [0.075, 0.1, 0.13]],
    ...both((s) => ['e', '#24211d', [0.19, 0.315, s * 0.058], [0.03, 0.045, 0.032]]),
    ...both((s) => ['b', '#93a65e', [0.192, 0.315, s * 0.058], [0.036, 0.052, 0.038], NONE, [4, 0, 0, [0.192, 0.365, s * 0.058]]]),
    ['e', '#76624a', [0.21, 0.27, 0], 0.024],
    ...both((s) => ['r', '#5a4a38', [0.08, 0.2, s * 0.2], [0.014, 0.14, 0.014], [s * 1.1, 0, -0.4]]),
    ...(lichen
      ? [[0, 0.5, 0, 0.1], [0.06, 0.48, 0.08, 0.06], [-0.05, 0.49, -0.07, 0.07], [0.04, 0.53, -0.03, 0.05]].map(([x, y, z, r]): Part => ['e', '#aab49c', [x!, y!, z!], [r!, r! * 0.6, r!]])
      : [['b', '#6f8f3a', [-0.01, 0.5, 0], [0.19, 0.03, 0.15], [0.15, 0, 0.3]] as Part, ['r', '#5a4a38', [0.12, 0.54, 0], [0.008, 0.08, 0.008], [0, 0, -0.6]] as Part]),
  ]);
}

/**
 * The carvings: pale unpainted wood, all knife facets, each finished and standing on its own little plinth. Its marks
 * are the knife's and the burning iron's, never paint: grooves for the wings and the ears, a darker grain where a cut
 * goes across it, two burnt dots for eyes. Olov found them unfinished as they were, blobs without a face or a foot
 * (12 November 2026). None is either of the story's two figures: the nisse keeps no face and no beard.
 */
const GRAIN = '#b99a6c';
const LIGHT = '#e6d4b0';
const BURNT = '#3b2618';
const PLINTH = '#a4865c';

export const CARVINGS = {
  bird: (wood: string): BufferGeometry => plain([
    ['e', wood, [0, 0.13, 0], [0.13, 0.09, 0.085]],
    ['e', LIGHT, [0.06, 0.12, 0], [0.08, 0.072, 0.07]],
    ['e', wood, [0.12, 0.215, 0], [0.064, 0.06, 0.056]],
    ['c', GRAIN, [0.19, 0.21, 0], [0.017, 0.055, 0.017], [0, 0, -Math.PI / 2]],
    ...both((s): Part => ['e', BURNT, [0.152, 0.228, s * 0.045], 0.011]),
    // Its folded wings, cut in from the back, and the tail fanned behind.
    ...both((s): Part => ['f', GRAIN, [-0.02, 0.155, s * 0.074], [0.105, 0.052, 0.02], [0, s * 0.12, 0.28]]),
    ['f', GRAIN, [-0.165, 0.165, 0], [0.09, 0.018, 0.052], [0, 0, 0.45]],
    ...both((s): Part => ['r', GRAIN, [0.02, 0.05, s * 0.03], [0.009, 0.05, 0.009]]),
    ['r', PLINTH, [0, 0.02, 0], [0.1, 0.04, 0.08]],
  ]),
  hare: (wood: string): BufferGeometry => plain([
    ['e', wood, [-0.02, 0.13, 0], [0.12, 0.105, 0.085]],
    ...both((s): Part => ['e', GRAIN, [-0.07, 0.1, s * 0.062], [0.065, 0.062, 0.03]]),
    ['e', wood, [0.1, 0.23, 0], [0.068, 0.062, 0.058]],
    ['e', LIGHT, [0.155, 0.215, 0], [0.032, 0.028, 0.032]],
    ['e', '#5e4a36', [0.186, 0.222, 0], 0.009],
    ...both((s): Part => ['e', BURNT, [0.135, 0.246, s * 0.048], 0.01]),
    ...both((s): Part => ['f', wood, [0.07, 0.36, s * 0.025], [0.022, 0.095, 0.016], [s * 0.15, 0, 0.2]]),
    ...both((s): Part => ['f', GRAIN, [0.074, 0.355, s * 0.031], [0.011, 0.07, 0.007], [s * 0.15, 0, 0.2]]),
    ['e', LIGHT, [-0.135, 0.13, 0], 0.032],
    ...both((s): Part => ['e', wood, [0.07, 0.035, s * 0.036], [0.032, 0.025, 0.02]]),
    ['r', PLINTH, [0, 0.02, 0], [0.11, 0.04, 0.08]],
  ]),
  // A small round figure whose long cap droops forward: no face, no beard, no paint.
  nisse: (wood: string): BufferGeometry => plain([
    ['e', wood, [0, 0.11, 0], [0.085, 0.1, 0.085]],
    // A belt cut round it, and its arms folded down its sides.
    ['r', GRAIN, [0, 0.1, 0], [0.09, 0.016, 0.09]],
    ...both((s): Part => ['e', wood, [0.01, 0.12, s * 0.085], [0.03, 0.07, 0.026], [s * 0.15, 0, 0]]),
    ...both((s): Part => ['e', GRAIN, [0.025, 0.02, s * 0.04], [0.04, 0.022, 0.03]]),
    ['e', wood, [0, 0.235, 0], 0.062],
    ['e', LIGHT, [0.062, 0.228, 0], 0.017],
    ['r', GRAIN, [0, 0.282, 0], [0.072, 0.02, 0.072]],
    ['c', wood, [0, 0.33, 0], [0.065, 0.11, 0.065]],
    ['c', wood, [0.05, 0.39, 0], [0.03, 0.08, 0.03], [0, 0, -1.1]],
    ['r', PLINTH, [0, 0.005, 0], [0.09, 0.03, 0.09]],
  ]),
};
export type Carving = keyof typeof CARVINGS;

// --- what they hide behind and sit on -----------------------------------------------------------------------

/** A stone with moss or lichen on its top, `size` across, its foot at the origin. */
export function stone(size: number, rock: string, top: string): Part[] {
  return [['b', rock, [0, size * 0.3, 0], [size * 0.55, size * 0.42, size * 0.45], [0, 0.4, 0.05]], ['b', top, [0, size * 0.55, 0.02 * size], [size * 0.42, size * 0.16, size * 0.34], [0, 0.4, 0.05]]];
}

/** A stump with its roots, `tall` high, broken at the top. */
export function stump(tall: number, wide: number): Part[] {
  return [
    ['r', '#6e5c48', [0, tall / 2, 0], [wide, tall, wide]],
    ['f', '#a39784', [0, tall, 0], [wide * 0.82, wide * 0.3, wide * 0.82], [0, 0.5, 0.15]],
    ...[0.4, 2.3, 4.2].map((a): Part => ['b', '#665442', [Math.cos(a) * wide, wide * 0.25, Math.sin(a) * wide], [wide * 0.6, wide * 0.32, wide * 0.32], [0, -a, -0.3]]),
    ['e', '#5f7a34', [wide * 0.3, tall * 0.35, wide * 0.8], [wide * 0.4, tall * 0.2, wide * 0.2]],
  ];
}

/**
 * A reed in the water, `tall` from its foot at the origin to its tip, straight up: a dragonfly perches on its tip. A
 * leaf leans off it, and its top is a little darker and thinner.
 */
export function reed(tall: number): Part[] {
  return [
    ['r', '#7a8646', [0, tall * 0.42, 0], [0.014, tall * 0.84, 0.014]],
    ['r', '#6a7440', [0, tall * 0.92, 0], [0.009, tall * 0.16, 0.009]],
    ['f', '#86924e', [0.07, tall * 0.5, 0.01], [0.014, tall * 0.42, 0.04], [0, 0, -0.32]],
    ['f', '#7c8848', [-0.05, tall * 0.3, -0.01], [0.012, tall * 0.3, 0.035], [0, 0.4, 0.28]],
  ];
}

/** A dead branch that grows out of a trunk along `toward` (a turn about y), `long`, with a twig. Its root is at the origin. */
export function branch(long: number, toward: number, thick = 0.07): Part[] {
  const along = (k: number): V3 => [Math.cos(toward) * long * k, long * k * 0.12, -Math.sin(toward) * long * k];
  return [
    ['r', '#5e5042', along(0.5), [thick, long, thick], [0, toward, -Math.PI / 2 + 0.12]],
    ['r', '#5e5042', along(0.75), [thick * 0.5, long * 0.35, thick * 0.5], [0, toward + 0.5, -0.7]],
  ];
}
