import {
  BufferGeometry, CircleGeometry, Color, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh, Matrix3,
  MeshStandardMaterial, SphereGeometry, Vector3, type Material, type Mesh, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Assets } from '../../assets';

/**
 * The small and the many (the creature overhaul, 13 November 2026): three butterflies, a dragonfly, a bat, a firefly,
 * the bumblebee and the wood ant. They are modelled in Blender (art/blender/small-life.py, `boot/small-life`) and moved
 * here, in the vertex stage, because there can be many of them at once: each kind is one instanced mesh and one draw
 * call, and an instance moves its wings and legs by the four numbers it carries (`act`).
 *
 * Each corner says how it moves (`rig`: what it is part of, its side, and its group in a walk or how much of a bat's
 * hand it is) and where it turns (`pivot`, and a bat's wrist, `joint`). Every kind is first drawn with a shape built
 * here in code, with the same corners and the same numbers; the kit's shape takes its place in the same mesh when it
 * arrives, before the view's first frames (./small-kit.ts `installSmallLife`), so nothing is compiled for it in play.
 *
 * What each kind's four numbers are:
 * | kind | x | y | z | w |
 * | --- | --- | --- | --- | --- |
 * | butterfly, dragonfly | fore wings raised (rad; 0 flat, π/2 upright) | hind wings raised | wings swept back | |
 * | bee, firefly | wings raised | wings raised | wings swept back over its back | |
 * | bat | wings beaten (rad, up) | hands folded (0 to 1) | | |
 * | ant | step (rad) | stride (0 to 1) | | feelers waved |
 */

export type SmallKind = 'butterfly-1' | 'butterfly-2' | 'butterfly-3' | 'dragonfly' | 'bat' | 'firefly' | 'bee' | 'ant';
export const SMALL_KINDS: readonly SmallKind[] = ['butterfly-1', 'butterfly-2', 'butterfly-3', 'dragonfly', 'bat', 'firefly', 'bee', 'ant'];

/** How a part moves, by its name in the kit. */
export const RIGS = { body: 0, wing: 1, hind: 2, batwing: 3, leg: 4, feeler: 5, lantern: 6 } as const;
type Rig = keyof typeof RIGS;

/** The kinds whose wings are glassy: their colours carry how clear each corner is. */
const GLASSY = new Set<string>(['dragonfly', 'bee', 'firefly']);

const SMALL_RIG = /* glsl */ `attribute vec3 pivot;
attribute vec3 joint;
attribute vec4 rig;
attribute vec4 act;
vec3 smallPosed;
mat3 smallRx(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 smallRy(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 smallRz(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
/* Moves a corner as its part moves (./small-kit.ts): a wing is swept back and raised about its root, a bat's hand
   folds at its wrist before its wing beats, a leg swings and lifts about its hip in its group's turn of the step,
   and a feeler waves. */
void smallPose(inout vec3 p, inout vec3 n, vec4 a) {
  float kind = rig.x, side = rig.y;
  if (kind < .5 || kind > 5.5) return;
  mat3 r;
  if (kind < 2.5) {
    r = smallRx(-side * (kind < 1.5 ? a.x : a.y)) * smallRy(-side * a.z);
  } else if (kind < 3.5) {
    mat3 f = smallRy(-side * a.y * 1.15) * smallRx(side * a.y * .45);
    p = mix(p, f * (p - joint) + joint, rig.z);
    n = normalize(mix(n, f * n, rig.z));
    r = smallRx(-side * a.x);
  } else if (kind < 4.5) {
    float step = a.x + rig.z * 3.14159265;
    r = smallRy(side * a.y * .5 * sin(step)) * smallRx(-side * a.y * .5 * max(0., cos(step)));
  } else {
    r = smallRy(side * a.w * .35) * smallRz(.15 * a.w);
  }
  p = r * (p - pivot) + pivot;
  n = r * n;
}
`;

/** Where the pose goes into three's own vertex stage: worked out with the normal, and given to the corner after. */
function posed(shader: { vertexShader: string }, extra = '', act = 'act'): void {
  shader.vertexShader = SMALL_RIG + extra + shader.vertexShader
    .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>\nsmallPosed = position;\nsmallPose(smallPosed, objectNormal, ${act});`)
    .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = smallPosed;');
}

/**
 * The material the small life is drawn with: its colours on its corners, lit as the forest is, its moving parts posed
 * by `act`. A glassy one draws its corners as clear as their colours say: a wing's membrane clear, its veins dark.
 */
export function smallMaterial(glassy = false): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: glassy ? 0.35 : 0.8, transparent: glassy });
  material.onBeforeCompile = (shader) => posed(shader);
  material.customProgramCacheKey = () => (glassy ? 'small-life-glass-v1' : 'small-life-v1');
  return material;
}

/**
 * The fireflies' bodies: posed as the rest, and drifting and glowing exactly as their glints do (./shapes.ts
 * `glintMaterial`, from the same numbers `fly`), so that each body is where its light is and its lamp is as bright.
 * Each faces the way it drifts, and its lamp gives light of its own.
 */
export function fireflyMaterial(time: { value: number }, glow: { value: number }): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, transparent: true });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, { faunaTime: time, faunaGlow: glow });
    posed(shader, /* glsl */ `attribute vec4 fly;
uniform float faunaTime, faunaGlow;
varying float vLamp;
`);
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      {
        float ft = faunaTime * fly.y + fly.x;
        // The glint's drift, in the glint card's own scale (0.3 across and up, 1 in depth), and how fast it goes.
        vec3 scale = vec3(.3, .3, 1.);
        vec3 drift = fly.z * vec3(sin(ft * .7) + .5 * sin(ft * 1.9), .6 * sin(ft * .9 + 1.3), .5 * cos(ft * .6)) * scale;
        vec3 way = fly.z * vec3(.7 * cos(ft * .7) + .95 * cos(ft * 1.9), .54 * cos(ft * .9 + 1.3), -.3 * sin(ft * .6)) * scale;
        float yaw = atan(-way.z, way.x + 1e-4);
        transformed = smallRy(yaw) * smallRz(clamp(way.y * 2., -.5, .5)) * transformed + drift;
        vLamp = rig.x > 5.5 ? fly.w * faunaGlow * (.3 + .7 * smoothstep(.1, .9, .5 + .5 * sin(faunaTime * (.45 + .3 * fly.y) + fly.x * 3.1))) : 0.;
      }`);
    shader.fragmentShader = 'varying float vLamp;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(.82, 1., .5) * vLamp * 2.2;');
  };
  material.customProgramCacheKey = () => 'small-life-firefly-v1';
  return material;
}

/** Many of one kind, each with its four numbers, and nowhere until it is put somewhere. */
export function swarm(kind: SmallKind, count: number, material: Material): InstancedMesh {
  const shape = shaped(fallback(kind), count);
  const mesh = new InstancedMesh(shape, material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  // The kit's shape comes in its place when it arrives (`installSmallLife`).
  mesh.userData.smallLife = kind;
  return mesh;
}

/** A shape of a kind with its own instanced numbers. */
function shaped(shape: BufferGeometry, count: number, act?: InstancedBufferAttribute): BufferGeometry {
  const made = new BufferGeometry();
  for (const [name, attribute] of Object.entries(shape.attributes)) made.setAttribute(name, attribute);
  made.setIndex(shape.index);
  made.boundingSphere = shape.boundingSphere;
  made.boundingBox = shape.boundingBox;
  made.setAttribute('act', act ?? new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage));
  return made;
}

// --- the kit ------------------------------------------------------------------------------------------------------------

/**
 * Reads the kit from its loaded model: each part a mesh that says on itself what it is (art/blender/small-life.py
 * `rigged`). The pack step stores a model's corners as small whole numbers with the scale on its node, so each part is
 * taken out as it stands in the kit's space, and a creature's parts are merged into one shape, its body first.
 */
export function smallKit(model: Object3D): Map<SmallKind, BufferGeometry> {
  model.updateMatrixWorld(true);
  const found = new Map<SmallKind, Mesh[]>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    const creature = mesh.userData?.creature as string | undefined;
    if (!mesh.isMesh || !creature) return;
    const kind = (creature === 'butterfly' ? `butterfly-${mesh.userData.species}` : creature) as SmallKind;
    if (!SMALL_KINDS.includes(kind)) return;
    if (!found.has(kind)) found.set(kind, []);
    found.get(kind)!.push(mesh);
  });
  const kit = new Map<SmallKind, BufferGeometry>();
  for (const [kind, meshes] of found) {
    meshes.sort((a, b) => Number(a.userData.rig !== 'body') - Number(b.userData.rig !== 'body') || a.name.localeCompare(b.name));
    const glassy = GLASSY.has(kind);
    kit.set(kind, mergeGeometries(meshes.map((mesh) => part(mesh, glassy)))!);
  }
  return kit;
}

/** The kit's numbers are Blender's, Z up and -Y towards the camera; the game's are Y up, +Z towards it. */
const fromBlender = (v: unknown): Vector3 => {
  const [x, y, z] = Array.isArray(v) ? (v as number[]) : [0, 0, 0];
  return new Vector3(x ?? 0, z ?? 0, -(y ?? 0));
};

function part(mesh: Mesh, glassy: boolean): BufferGeometry {
  const from = mesh.geometry;
  const position = from.getAttribute('position');
  const normal = from.getAttribute('normal');
  const colour = from.getAttribute('color');
  const count = position.count;
  const data = mesh.userData as { rig?: Rig; side?: number; group?: number; pivot?: number[]; joint?: number[]; alpha?: number };
  const rig = RIGS[data.rig ?? 'body'] ?? 0;
  const pivot = fromBlender(data.pivot);
  const joint = fromBlender(data.joint);
  const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const at = new Vector3();
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * (glassy ? 4 : 3));
  for (let i = 0; i < count; i++) {
    at.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
    at.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, i * 3);
  }
  // How clear a glassy part is: its membrane as clear as `alpha`, and the darker a corner is painted (a vein, the
  // pterostigma), the more it hides what is behind it.
  const alpha = data.alpha ?? 1;
  let lightest = 0;
  const light = (i: number) => 0.2126 * colour.getX(i) + 0.7152 * colour.getY(i) + 0.0722 * colour.getZ(i);
  for (let i = 0; i < count; i++) lightest = Math.max(lightest, light(i));
  const size = glassy ? 4 : 3;
  for (let i = 0; i < count; i++) {
    colours[i * size] = colour.getX(i);
    colours[i * size + 1] = colour.getY(i);
    colours[i * size + 2] = colour.getZ(i);
    if (glassy) {
      const dark = lightest > 0 ? 1 - light(i) / lightest : 0;
      colours[i * size + 3] = alpha >= 1 ? 1 : alpha + (1 - alpha) * smoothstep(0.2, 0.75, dark);
    }
  }
  return rigged(positions, normals, new Float32BufferAttribute(colours, size), from.index ? Array.from(from.index.array) : null, rig, data.side ?? 0, data.group ?? 0, pivot, joint);
}

const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/** A part's shape with its rig on its corners. A bat's wing says at each corner how much of its hand it is. */
function rigged(positions: Float32Array, normals: Float32Array, colour: Float32BufferAttribute, index: number[] | null, rig: number, side: number, group: number,
  pivot: Vector3, joint: Vector3): BufferGeometry {
  const count = positions.length / 3;
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  made.setAttribute('color', colour);
  const pivots = new Float32Array(count * 3);
  const joints = new Float32Array(count * 3);
  const rigs = new Float32Array(count * 4);
  const wrist = Math.abs(joint.z);
  for (let i = 0; i < count; i++) {
    pivot.toArray(pivots, i * 3);
    joint.toArray(joints, i * 3);
    const hand = rig === RIGS.batwing ? smoothstep(wrist - 0.02, wrist + 0.07, Math.abs(positions[i * 3 + 2]!)) : group;
    rigs.set([rig, side, hand, 0], i * 4);
  }
  made.setAttribute('pivot', new Float32BufferAttribute(pivots, 3));
  made.setAttribute('joint', new Float32BufferAttribute(joints, 3));
  made.setAttribute('rig', new Float32BufferAttribute(rigs, 4));
  made.setIndex(index ?? Array.from({ length: count }, (_, i) => i));
  return made;
}

/**
 * Puts the kit's shapes in the place of the ones built in code, in every mesh of the small life in the scene, before
 * the first frames: each keeps its own numbers. Without the file, or if it fails, they keep theirs.
 */
export async function installSmallLife(assets: Assets, scene: Object3D): Promise<boolean> {
  const wanting: InstancedMesh[] = [];
  scene.traverse((object) => {
    if ((object as InstancedMesh).isInstancedMesh && typeof object.userData.smallLife === 'string' && !object.userData.smallKit) wanting.push(object as InstancedMesh);
  });
  if (wanting.length === 0) return false;
  const manifest = await assets.manifest();
  if (!manifest.packs.boot?.files['small-life.glb']) return false;
  const model = await assets.model('boot', 'small-life').catch((error) => {
    console.warn('The small life could not be loaded; its shapes built in code stay.', error);
    return null;
  });
  if (!model) return false;
  const kit = smallKit(model);
  let arrived = false;
  for (const mesh of wanting) {
    const shape = kit.get(mesh.userData.smallLife as SmallKind);
    if (!shape) continue;
    const before = mesh.geometry;
    const made = shaped(shape, mesh.count, before.getAttribute('act') as InstancedBufferAttribute);
    // A firefly's body keeps its drift and glow.
    const fly = before.getAttribute('fly');
    if (fly) made.setAttribute('fly', fly);
    mesh.geometry = made;
    mesh.userData.smallKit = true;
    arrived = true;
  }
  return arrived;
}

// --- the shapes built in code, until the kit has come ------------------------------------------------------------------
// Plain and few-cornered, in the kit's colours, with the same rig: the same numbers move them the same way.

type Shape = 'ball' | 'rod' | 'disc';
interface Piece {
  shape: Shape;
  colour: string;
  at: readonly [number, number, number];
  size: readonly [number, number, number];
  /** Tilted about z, then turned about y. */
  turn?: readonly [number, number];
  rig?: Rig;
  side?: number;
  group?: number;
  pivot?: readonly [number, number, number];
  joint?: readonly [number, number, number];
  alpha?: number;
}

const cache = new Map<SmallKind, BufferGeometry>();
const ink = new Color();

/** A kind's shape built in code. Shared: never change or dispose it. */
export function fallback(kind: SmallKind): BufferGeometry {
  let shape = cache.get(kind);
  if (!shape) {
    shape = build(PIECES[kind](), GLASSY.has(kind));
    cache.set(kind, shape);
  }
  return shape;
}

function build(pieces: Piece[], glassy: boolean): BufferGeometry {
  const units = { ball: new SphereGeometry(1, 8, 6), rod: new CylinderGeometry(1, 1, 1, 5), disc: new CircleGeometry(1, 10).rotateX(-Math.PI / 2) };
  const made = mergeGeometries(pieces.map((p) => {
    const g = units[p.shape].clone().toNonIndexed().scale(...p.size).rotateZ(p.turn?.[0] ?? 0).rotateY(p.turn?.[1] ?? 0).translate(...p.at);
    const count = g.getAttribute('position').count;
    ink.set(p.colour);
    const size = glassy ? 4 : 3;
    const colours = new Float32Array(count * size);
    for (let i = 0; i < count; i++) colours.set(glassy ? [ink.r, ink.g, ink.b, p.alpha ?? 1] : [ink.r, ink.g, ink.b], i * size);
    const positions = g.getAttribute('position').array as Float32Array;
    const normals = g.getAttribute('normal').array as Float32Array;
    return rigged(positions, normals, new Float32BufferAttribute(colours, size), null, RIGS[p.rig ?? 'body'], p.side ?? 0, p.group ?? 0,
      new Vector3(...(p.pivot ?? [0, 0, 0])), new Vector3(...(p.joint ?? [0, 0, 0])));
  }))!;
  for (const unit of Object.values(units)) unit.dispose();
  return made;
}

const both = (make: (side: number) => Piece[]): Piece[] => [...make(1), ...make(-1)];
const wing = (colour: string, rig: Rig, side: number, root: readonly [number, number, number], reach: number, wide: number, lean: number, alpha = 1): Piece => ({
  shape: 'disc', colour, rig, side, pivot: root, alpha,
  at: [root[0] + Math.sin(lean) * reach / 2, root[1], root[2] + side * Math.cos(lean) * reach / 2], size: [wide, 1, reach / 2], turn: [0, side * lean],
});

const BUTTERFLY = (ground: string, under: string): Piece[] => [
  { shape: 'rod', colour: '#34322c', at: [-0.02, 0, 0], size: [0.012, 0.13, 0.012], turn: [Math.PI / 2, 0] },
  { shape: 'ball', colour: '#34322c', at: [0.05, 0.004, 0], size: [0.012, 0.012, 0.012] },
  ...both((s) => [
    wing(ground, 'wing', s, [0.012, 0.008, s * 0.011], 0.2, 0.075, 0.15),
    wing(under, 'hind', s, [-0.004, 0.005, s * 0.011], 0.15, 0.06, -0.75),
    { shape: 'rod', colour: '#2c2a26', at: [0.1, 0.04, s * 0.025], size: [0.002, 0.11, 0.002], turn: [-0.95, 0] },
  ]),
];

const PIECES: Record<SmallKind, () => Piece[]> = {
  'butterfly-1': () => BUTTERFLY('#e6e08a', '#d4dc9a'),
  'butterfly-2': () => BUTTERFLY('#f2f0e8', '#dce2d0'),
  'butterfly-3': () => BUTTERFLY('#8ea2d8', '#b4ada0'),
  dragonfly: () => [
    { shape: 'rod', colour: '#24302e', at: [-0.18, 0.004, 0], size: [0.009, 0.29, 0.009], turn: [Math.PI / 2, 0] },
    ...[-0.08, -0.15, -0.22, -0.29].map((x): Piece => ({ shape: 'ball', colour: '#6ab0b4', at: [x, 0.01, 0], size: [0.012, 0.008, 0.009] })),
    { shape: 'ball', colour: '#24302e', at: [0, 0.004, 0], size: [0.04, 0.028, 0.026] },
    ...both((s) => [{ shape: 'ball', colour: '#4c8c8e', at: [0.058, 0.01, s * 0.017], size: [0.02, 0.021, 0.02] } as Piece]),
    ...both((s) => [
      wing('#e4eef0', 'wing', s, [0.018, 0.022, s * 0.012], 0.3, 0.02, 0.16, 0.3),
      wing('#e4eef0', 'hind', s, [-0.012, 0.02, s * 0.013], 0.29, 0.026, -0.12, 0.3),
    ]),
  ],
  bat: () => [
    { shape: 'ball', colour: '#5a4636', at: [-0.02, 0, 0], size: [0.08, 0.032, 0.038] },
    { shape: 'ball', colour: '#5a4636', at: [0.085, 0.012, 0], size: [0.028, 0.026, 0.03] },
    ...both((s) => [
      { shape: 'ball', colour: '#2e2622', at: [0.088, 0.06, s * 0.022], size: [0.012, 0.028, 0.008], turn: [0, 0] } as Piece,
      { shape: 'disc', colour: '#2e2622', rig: 'batwing', side: s, pivot: [0.02, 0.01, s * 0.03], joint: [0.03, 0.012, s * 0.24],
        at: [-0.01, 0.01, s * 0.26], size: [0.12, 1, 0.24] } as Piece,
    ]),
  ],
  firefly: () => [
    { shape: 'ball', colour: '#3a3026', at: [0, 0, 0], size: [0.045, 0.012, 0.016] },
    { shape: 'ball', colour: '#c2b48e', at: [0.037, 0.006, 0], size: [0.014, 0.005, 0.016] },
    { shape: 'ball', colour: '#e4ecaa', rig: 'lantern', at: [-0.04, -0.006, 0], size: [0.014, 0.008, 0.011] },
    ...both((s) => [wing('#c8ccc4', 'wing', s, [0.012, 0.012, s * 0.006], 0.06, 0.02, -0.3, 0.35)]),
  ],
  bee: () => [
    { shape: 'ball', colour: '#1e1a16', at: [-0.045, 0.07, 0], size: [0.068, 0.052, 0.058] },
    { shape: 'ball', colour: '#b49a4a', at: [-0.02, 0.075, 0], size: [0.03, 0.05, 0.056] },
    { shape: 'ball', colour: '#e2ddcc', at: [-0.1, 0.066, 0], size: [0.022, 0.036, 0.04] },
    { shape: 'ball', colour: '#1e1a16', at: [0.035, 0.078, 0], size: [0.042, 0.042, 0.044] },
    { shape: 'ball', colour: '#b49a4a', at: [0.062, 0.08, 0], size: [0.012, 0.036, 0.04] },
    { shape: 'ball', colour: '#1e1a16', at: [0.085, 0.07, 0], size: [0.022, 0.026, 0.028] },
    ...both((s) => [-0.025, 0.005, 0.035].map((x): Piece => ({ shape: 'rod', colour: '#1e1a16', at: [x, 0.025, s * 0.04], size: [0.005, 0.055, 0.005], turn: [s * 0.3, 0] }))),
    ...both((s) => [wing('#bcb8ac', 'wing', s, [0.04, 0.106, s * 0.024], 0.11, 0.04, -0.2, 0.4)]),
  ],
  ant: () => [
    { shape: 'ball', colour: '#2a1c16', at: [-0.115, 0.1, 0], size: [0.072, 0.054, 0.056] },
    { shape: 'ball', colour: '#6e3e26', at: [0.01, 0.1, 0], size: [0.05, 0.024, 0.022] },
    { shape: 'ball', colour: '#2a1c16', at: [0.085, 0.112, 0], size: [0.034, 0.03, 0.036] },
    ...both((s) => [0.04, 0.018, -0.004].map((x, k): Piece => ({
      shape: 'rod', colour: '#4a2c1e', rig: 'leg', side: s, group: (k + (s > 0 ? 0 : 1)) % 2, pivot: [x, 0.09, s * 0.014],
      at: [x, 0.05, s * 0.07], size: [0.006, 0.12, 0.006], turn: [0, 0],
    }))),
    ...both((s) => [{ shape: 'rod', colour: '#2a1c16', rig: 'feeler', side: s, pivot: [0.104, 0.128, s * 0.012],
      at: [0.135, 0.15, s * 0.03], size: [0.003, 0.08, 0.003], turn: [-0.9, 0] } as Piece]),
  ],
};
