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

/** A small bird's colours: back, belly, head, cheek, wing, tail, beak, and a bib or eye stripe where it has one. */
export interface Plumage { back: string; belly: string; head: string; cheek: string; wing: string; tail: string; beak: string; bib?: string; speckled?: boolean }

/** The small birds, each 1 long before its size: a great tit, a blue tit, a house sparrow and a song thrush. */
export const BIRDS = {
  tit: { size: 0.95, back: '#7f8f5a', belly: '#c8b863', head: '#29292c', cheek: '#ecebe4', wing: '#6b7988', tail: '#5d6a78', beak: '#2a2622', bib: '#29292c' },
  blue: { size: 0.82, back: '#8a9a5c', belly: '#cfc474', head: '#5f86b4', cheek: '#efeee8', wing: '#6a8cb4', tail: '#5f7ea6', beak: '#2a2622' },
  sparrow: { size: 0.98, back: '#866a4a', belly: '#c4beb2', head: '#8a8c8e', cheek: '#d8d4cc', wing: '#7a6042', tail: '#5e4c3a', beak: '#3a3430', bib: '#3a3430' },
  thrush: { size: 1.45, back: '#7a654a', belly: '#ddd2b6', head: '#7a654a', cheek: '#d2c6a8', wing: '#6e5a42', tail: '#6a5842', beak: '#4e4236', speckled: true },
} satisfies Record<string, Plumage & { size: number }>;
export type Species = keyof typeof BIRDS;

export function bird(p: Plumage): BufferGeometry {
  const head: Rig = [2, 1, -1, [0.17, 0.42, 0]];
  return build([
    ['b', p.back, [0, 0.36, 0], [0.3, 0.2, 0.19]],
    ['b', p.belly, [0.06, 0.3, 0], [0.25, 0.17, 0.165]],
    ...(p.bib ? [['b', p.bib, [0.19, 0.31, 0], [0.13, 0.14, 0.065]] as Part] : []),
    // The thrush's spotted breast and flanks: dark drops in rows, big enough to read from the path, which sees the
    // bird from its side.
    ...(p.speckled ? [0.21, 0.26, 0.31, 0.36].flatMap((y, row) => [0.05, 0.11, 0.17, 0.22]
      .map((x) => ({ x: x + row * 0.012, out: 1 - ((x + row * 0.012 - 0.06) / 0.25) ** 2 - ((y - 0.3) / 0.17) ** 2 }))
      .filter(({ out }) => out > 0.08)
      .flatMap(({ x, out }) => both((s): Part => ['e', (row + Math.round(x * 20)) % 2 ? '#4a3c2e' : '#584a3a', [x, y, s * (0.165 * Math.sqrt(out) - 0.004)], [0.026, 0.028, 0.01]]))) : []),
    ['b', p.head, [0.25, 0.5, 0], [0.14, 0.13, 0.13], NONE, head],
    ...both((s) => ['b', p.cheek, [0.285, 0.475, s * 0.075], [0.075, 0.055, 0.05], NONE, head]),
    ['c', p.beak, [0.42, 0.49, 0], [0.026, 0.1, 0.026], [0, 0, -Math.PI / 2], head],
    ...both((s) => ['e', '#141210', [0.33, 0.52, s * 0.088], 0.02, NONE, head]),
    ...both((s) => ['b', p.wing, [-0.06, 0.41, s * 0.13], [0.22, 0.1, 0.05], [0, 0, -0.15]]),
    ...both((s) => ['b', p.wing, [0, 0.42, s * 0.3], [0.12, 0.012, 0.22], NONE, [3, s, 0, [0, 0.42, s * 0.08]]]),
    ['b', p.tail, [-0.36, 0.41, 0], [0.2, 0.025, 0.07], [0, 0, 0.3]],
    ...both((s) => ['r', '#4e443a', [0.04, 0.1, s * 0.045], [0.013, 0.2, 0.013]]),
    ...both((s) => ['b', '#4e443a', [0.08, 0.012, s * 0.045], [0.06, 0.012, 0.016]]),
  ]);
}

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

/** The carvings: pale unpainted wood, all knife facets. None has eyes, and none is either of the story's two figures. */
export const CARVINGS = {
  bird: (wood: string): BufferGeometry => plain([
    ['f', wood, [0, 0.12, 0], [0.13, 0.085, 0.08]],
    ['f', wood, [0.11, 0.2, 0], 0.06],
    ['c', wood, [0.18, 0.2, 0], [0.018, 0.06, 0.018], [0, 0, -Math.PI / 2]],
    ['f', wood, [-0.14, 0.15, 0], [0.08, 0.02, 0.045], [0, 0, 0.35]],
    ['r', wood, [0, 0.02, 0], [0.09, 0.04, 0.07]],
  ]),
  hare: (wood: string): BufferGeometry => plain([
    ['f', wood, [-0.02, 0.13, 0], [0.12, 0.11, 0.085]],
    ['f', wood, [0.1, 0.23, 0], [0.07, 0.065, 0.06]],
    ...both((s): Part => ['f', wood, [0.07, 0.36, s * 0.025], [0.022, 0.095, 0.016], [s * 0.15, 0, 0.2]]),
    ['f', wood, [-0.13, 0.12, 0], 0.03],
    ['r', wood, [0, 0.02, 0], [0.11, 0.04, 0.08]],
  ]),
  // A small round figure whose long cap droops forward: no face, no beard, no paint.
  nisse: (wood: string): BufferGeometry => plain([
    ['f', wood, [0, 0.1, 0], [0.085, 0.1, 0.085]],
    ['f', wood, [0, 0.22, 0], 0.06],
    ['c', wood, [0, 0.3, 0], [0.065, 0.12, 0.065]],
    ['c', wood, [0.05, 0.37, 0], [0.03, 0.08, 0.03], [0, 0, -1.1]],
    ['f', wood, [0.06, 0.21, 0], 0.016],
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

/** A dead branch that grows out of a trunk along `toward` (a turn about y), `long`, with a twig. Its root is at the origin. */
export function branch(long: number, toward: number, thick = 0.07): Part[] {
  const along = (k: number): V3 => [Math.cos(toward) * long * k, long * k * 0.12, -Math.sin(toward) * long * k];
  return [
    ['r', '#5e5042', along(0.5), [thick, long, thick], [0, toward, -Math.PI / 2 + 0.12]],
    ['r', '#5e5042', along(0.75), [thick * 0.5, long * 0.35, thick * 0.5], [0, toward + 0.5, -0.7]],
  ];
}
