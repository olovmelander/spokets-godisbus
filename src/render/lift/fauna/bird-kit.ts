import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Float32BufferAttribute, InstancedBufferAttribute, InstancedMesh,
  Matrix3, Matrix4, MeshStandardMaterial, SphereGeometry, Vector3, type BufferAttribute, type Material, type Mesh, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Assets } from '../../assets';
import { BIRDS, SOARING, type Species } from './shapes';

/**
 * The birds (the creature overhaul, 13 November 2026): the small birds that hop and peck behind the path (a great tit,
 * a blue tit, a house sparrow, a song thrush, a white wagtail, a magpie and a jackdaw), and the raven and the hooded
 * crow that circle over the place. Each is modelled in Blender (art/blender/birds.py, `boot/birds`) with its own shape
 * and plumage, and moved here in the vertex stage, because a flock is many: a species is one instanced mesh and one
 * draw call, and each bird moves its wings, tail, head, bill and legs by the eight numbers it carries (`act`, `act2`).
 *
 * Each corner says what it is part of and how that moves (`rig`: the part, its side, how much of a wing's hand or how
 * far out on the tail it is, and how far the bird's body is tipped up at rest), where it turns (`pivot`: the neck, a
 * shoulder, the tail's root, the hips; `joint`: a wrist, the bill's hinge), and, on a wing, how far it moves to lie
 * folded on the flank (`fold`, and its normal there, `foldNormal`). A wing opens and folds about its shoulder keeping its
 * length, beats about the body's long axis, and its hand bends at the wrist.
 *
 * Every kind is first drawn with a shape built here in code, with the same corners and the same numbers; the kit's
 * shape takes its place in the same mesh when it arrives, before the view's first frames (`installBirds`).
 *
 * What the eight numbers are:
 * | | x | y | z | w |
 * | --- | --- | --- | --- | --- |
 * | `act` | wings beaten (rad, up) | wings spread (0 folded, 1 open) | head turned (rad, to the far side) | head nodded (rad, down) |
 * | `act2` | tail raised (rad) | tail fanned (0 to 1) | bill opened (0 to 1) | hands bent at the wrist (rad, up) |
 * The legs tuck up and back as the wings open.
 */

export type BirdKind = Species | 'raven' | 'crow';
export const BIRD_KINDS: readonly BirdKind[] = ['tit', 'blue', 'sparrow', 'thrush', 'wagtail', 'magpie', 'jackdaw', 'raven', 'crow'];

/** How a part moves, by its name in the kit. */
export const BIRD_RIGS = { body: 0, head: 1, jaw: 2, wing: 3, tail: 4, legs: 5 } as const;
type Rig = keyof typeof BIRD_RIGS;

/**
 * How far each small bird's body is tipped up at rest, nose up, in radians (as art/blender/birds.py builds it): a
 * thrush stands up, a wagtail lies nearly level. In flight the game levels it. A raven and a crow fly level.
 */
export const BIRD_TILT: Record<BirdKind, number> = {
  tit: 0.42, blue: 0.4, sparrow: 0.32, thrush: 0.55, wagtail: 0.18, magpie: 0.3, jackdaw: 0.3, raven: 0, crow: 0,
};

const BIRD_RIG = /* glsl */ `attribute vec3 pivot;
attribute vec3 joint;
attribute vec4 rig;
attribute vec3 fold;
attribute vec3 foldNormal;
attribute vec4 act;
attribute vec4 act2;
vec3 birdPosed;
mat3 birdRx(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
mat3 birdRy(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
mat3 birdRz(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0., -s, c, 0., 0., 0., 1.); }
/* Moves a corner as its part moves (./bird-kit.ts): a head turns and nods about the neck, the lower bill drops at its
   hinge, a wing opens from folded about its shoulder keeping its length, bends at the wrist and beats about the body's
   long axis, a tail rises and fans, and the legs tuck back as the wings open. */
void birdPose(inout vec3 p, inout vec3 n) {
  float kind = rig.x, side = rig.y, share = rig.z;
  mat3 tilt = birdRz(rig.w), level = birdRz(-rig.w);
  if (kind < .5) return;
  if (kind < 2.5) {
    if (kind > 1.5) { mat3 j = birdRz(-act2.z * .5); p = j * (p - joint) + joint; n = j * n; }
    mat3 h = birdRy(act.z) * birdRz(-act.w);
    p = h * (p - pivot) + pivot;
    n = h * n;
  } else if (kind < 3.5) {
    float k = clamp(act.y, 0., 1.);
    vec3 a = p - pivot, b = a + fold;
    vec3 m = mix(b, a, k);
    float l = mix(length(b), length(a), k);
    vec3 q = length(m) > 1e-5 ? normalize(m) * l : m;
    n = normalize(mix(foldNormal, n, k) + 1e-5);
    vec3 wrist = joint - pivot;
    mat3 hand = tilt * birdRx(-side * act2.w * k) * level;
    q = mix(q, hand * (q - wrist) + wrist, share);
    n = normalize(mix(n, hand * n, share));
    mat3 beat = tilt * birdRx(-side * act.x) * level;
    p = beat * q + pivot;
    n = beat * n;
  } else if (kind < 4.5) {
    mat3 t = birdRz(-act2.x) * tilt * birdRy(share * act2.y * .5) * level;
    p = t * (p - pivot) + pivot;
    n = t * n;
  } else {
    mat3 l = birdRz(-smoothstep(.3, .85, act.y) * 1.35);
    p = l * (p - pivot) + pivot;
    n = l * n;
  }
}
`;

/** The material every bird is drawn with: its colours on its corners, lit as the forest is, its parts posed. */
export function birdMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.82, side: DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = BIRD_RIG + shader.vertexShader
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nbirdPosed = position;\nbirdPose(birdPosed, objectNormal);')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed = birdPosed;');
  };
  material.customProgramCacheKey = () => 'bird-kit-v1';
  return material;
}

/** Many birds of a kind, each with its eight numbers, and nowhere until it is put somewhere. */
export function flockOf(kind: BirdKind, count: number, material: Material): InstancedMesh {
  const mesh = new InstancedMesh(shaped(birdFallback(kind), count), material, count);
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  // The kit's shape comes in its place when it arrives (`installBirds`).
  mesh.userData.birdKit = kind;
  return mesh;
}

/** A kind's shape with its own instanced numbers. */
function shaped(shape: BufferGeometry, count: number, act?: InstancedBufferAttribute, act2?: InstancedBufferAttribute): BufferGeometry {
  const made = new BufferGeometry();
  for (const [name, attribute] of Object.entries(shape.attributes)) made.setAttribute(name, attribute);
  made.setIndex(shape.index);
  made.boundingSphere = shape.boundingSphere;
  made.boundingBox = shape.boundingBox;
  made.setAttribute('act', act ?? new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage));
  made.setAttribute('act2', act2 ?? new InstancedBufferAttribute(new Float32Array(count * 4), 4).setUsage(DynamicDrawUsage));
  return made;
}

// --- the kit ------------------------------------------------------------------------------------------------------------

/** The kit's numbers are Blender's, Z up and -Y towards the camera; the game's are Y up, +Z towards it. */
const fromBlender = (v: unknown, into = new Vector3()): Vector3 => {
  const [x, y, z] = Array.isArray(v) ? (v as number[]) : [0, 0, 0];
  return into.set(x ?? 0, z ?? 0, -(y ?? 0));
};

/**
 * Reads the kit from its loaded model: each part a mesh that says on itself which bird it belongs to and how it moves
 * (art/blender/birds.py `done`). The pack step stores a model's corners as small whole numbers with the scale on its
 * node, so each part is taken out as it stands in the kit's space; a fold is stored as it was made, in Blender's axes.
 */
export function birdKit(model: Object3D): Map<BirdKind, BufferGeometry> {
  model.updateMatrixWorld(true);
  const found = new Map<BirdKind, Mesh[]>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    const kind = mesh.userData?.species as BirdKind | undefined;
    if (!mesh.isMesh || mesh.userData?.creature !== 'bird' || !kind || !BIRD_KINDS.includes(kind)) return;
    if (!found.has(kind)) found.set(kind, []);
    found.get(kind)!.push(mesh);
  });
  const kit = new Map<BirdKind, BufferGeometry>();
  for (const [kind, meshes] of found) {
    meshes.sort((a, b) => Number(a.userData.rig !== 'body') - Number(b.userData.rig !== 'body') || a.name.localeCompare(b.name));
    kit.set(kind, mergeGeometries(meshes.map(part))!);
  }
  return kit;
}

function part(mesh: Mesh): BufferGeometry {
  const from = mesh.geometry;
  const position = from.getAttribute('position');
  const normal = from.getAttribute('normal');
  const colour = from.getAttribute('color');
  const fold = from.getAttribute('_fold') as BufferAttribute | undefined;
  const bend = from.getAttribute('_bend') as BufferAttribute | undefined;
  const count = position.count;
  const data = mesh.userData as { rig?: Rig; side?: number; pivot?: number[]; joint?: number[]; tilt?: number };
  const rig = BIRD_RIGS[data.rig ?? 'body'] ?? 0;
  const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
  const at = new Vector3();
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const colours = new Float32Array(count * 3);
  const folds = new Float32Array(count * 3);
  const shares = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    at.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
    at.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, i * 3);
    colours.set([colour.getX(i), colour.getY(i), colour.getZ(i)], i * 3);
    if (fold && rig === BIRD_RIGS.wing) fromBlender([fold.getX(i), fold.getY(i), fold.getZ(i)], at).toArray(folds, i * 3);
    if (bend) shares[i] = rig === BIRD_RIGS.wing ? bend.getX(i) : rig === BIRD_RIGS.tail ? bend.getY(i) : 0;
  }
  return rigged(positions, normals, colours, from.index ? Array.from(from.index.array) : null, folds, rig, data.side ?? 0, shares, data.tilt ?? 0,
    fromBlender(data.pivot), fromBlender(data.joint));
}

/** A part's shape with its rig on its corners, and its normals as it lies folded. */
function rigged(positions: Float32Array, normals: Float32Array, colours: Float32Array, index: number[] | null, folds: Float32Array, rig: number, side: number,
  shares: Float32Array, tilt: number, pivot: Vector3, joint: Vector3): BufferGeometry {
  const count = positions.length / 3;
  const made = new BufferGeometry();
  const corners = index ?? Array.from({ length: count }, (_, i) => i);
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setAttribute('fold', new Float32BufferAttribute(folds, 3));
  // A folded wing's normals, worked out from its folded corners; anything else keeps its own.
  let folded = normals;
  if (rig === BIRD_RIGS.wing) {
    const lying = new BufferGeometry();
    lying.setAttribute('position', new Float32BufferAttribute(positions.map((v, i) => v + folds[i]!), 3));
    lying.setIndex(corners);
    lying.computeVertexNormals();
    folded = lying.getAttribute('normal').array as Float32Array;
    // A sheet folded onto the flank keeps the way it faced: its over side out.
    lying.dispose();
  }
  made.setAttribute('foldNormal', new Float32BufferAttribute(folded, 3));
  const pivots = new Float32Array(count * 3);
  const joints = new Float32Array(count * 3);
  const rigs = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    pivot.toArray(pivots, i * 3);
    joint.toArray(joints, i * 3);
    rigs.set([rig, side, shares[i]!, tilt], i * 4);
  }
  made.setAttribute('pivot', new Float32BufferAttribute(pivots, 3));
  made.setAttribute('joint', new Float32BufferAttribute(joints, 3));
  made.setAttribute('rig', new Float32BufferAttribute(rigs, 4));
  made.setIndex(corners);
  return made;
}

/**
 * Puts the kit's shapes in the place of the ones built in code, in every flock in the scene, before the first frames:
 * each keeps its own numbers. Without the file, or if it fails, they keep theirs.
 */
export async function installBirds(assets: Assets, scene: Object3D): Promise<boolean> {
  const wanting: InstancedMesh[] = [];
  scene.traverse((object) => {
    if ((object as InstancedMesh).isInstancedMesh && typeof object.userData.birdKit === 'string' && !object.userData.birdKitted) wanting.push(object as InstancedMesh);
  });
  if (wanting.length === 0) return false;
  const manifest = await assets.manifest();
  if (!manifest.packs.boot?.files['birds.glb']) return false;
  const model = await assets.model('boot', 'birds').catch((error) => {
    console.warn('The birds could not be loaded; their shapes built in code stay.', error);
    return null;
  });
  if (!model) return false;
  const kit = birdKit(model);
  let arrived = false;
  for (const mesh of wanting) {
    const shape = kit.get(mesh.userData.birdKit as BirdKind);
    if (!shape) continue;
    const before = mesh.geometry;
    mesh.geometry = shaped(shape, mesh.count, before.getAttribute('act') as InstancedBufferAttribute, before.getAttribute('act2') as InstancedBufferAttribute);
    mesh.userData.birdKitted = true;
    arrived = true;
  }
  return arrived;
}

// --- the shapes built in code, until the kit has come --------------------------------------------------------------------
// Plain and few-cornered, in the birds' colours (./shapes.ts), with the same rig: the same numbers move them the same way.

const cache = new Map<BirdKind, BufferGeometry>();
const ink = new Color();

/** A kind's shape built in code. Shared: never change or dispose it. */
export function birdFallback(kind: BirdKind): BufferGeometry {
  let shape = cache.get(kind);
  if (!shape) {
    shape = kind === 'raven' || kind === 'crow' ? soaringFallback(kind) : smallFallback(kind);
    cache.set(kind, shape);
  }
  return shape;
}

interface Piece {
  unit: 'ball' | 'cone' | 'rod';
  colour: string;
  at: readonly [number, number, number];
  size: readonly [number, number, number];
  /** Tilted about z. */
  turn?: number;
  rig?: Rig;
  side?: number;
  pivot?: readonly [number, number, number];
  joint?: readonly [number, number, number];
}

/** Merges pieces into a bird, its body tipped up by `tilt` about `middle` (its legs not). A wing's corners fold onto its flank. */
function assemble(pieces: Piece[], tilt: number, middle: Vector3, wing: { span: number; fold: number }): BufferGeometry {
  const units = { ball: new SphereGeometry(1, 10, 7), cone: new ConeGeometry(1, 1, 7).rotateZ(-Math.PI / 2), rod: new CylinderGeometry(1, 1, 1, 5) };
  const tipped = new Matrix4().makeTranslation(middle.x, middle.y, middle.z).multiply(new Matrix4().makeRotationZ(tilt)).multiply(new Matrix4().makeTranslation(-middle.x, -middle.y, -middle.z));
  const turn = new Matrix4().makeRotationZ(tilt);
  const parts = pieces.map((p) => {
    const g = units[p.unit].clone().toNonIndexed().scale(...p.size).rotateZ(p.turn ?? 0).translate(...p.at);
    const legs = p.rig === 'legs';
    const count = g.getAttribute('position').count;
    const pivot = new Vector3(...(p.pivot ?? [0, 0, 0]));
    const joint = new Vector3(...(p.joint ?? [0, 0, 0]));
    // Where a wing's corners lie folded, worked out before the body is tipped: out along the span becomes back along
    // the flank, as far back as it was out, against the body's side.
    const folds = new Float32Array(count * 3);
    const shares = new Float32Array(count);
    const v = new Vector3();
    const d = new Vector3();
    for (let i = 0; i < count; i++) {
      v.fromBufferAttribute(g.getAttribute('position'), i).sub(pivot);
      if (p.rig === 'wing') {
        const out = Math.abs(v.z) / wing.span;
        d.set(-out * wing.fold - 0.3 * v.x - v.x, 0.4 * v.y - v.y, (p.side ?? 0) * 0.08 - v.z);
        if (!legs) d.applyMatrix4(turn);
        d.toArray(folds, i * 3);
        shares[i] = Math.min(1, Math.max(0, (out - 0.35) / 0.2));
      } else if (p.rig === 'tail') shares[i] = Math.max(-1, Math.min(1, v.z / Math.max(1e-3, p.size[2])));
    }
    if (!legs) {
      g.applyMatrix4(tipped);
      pivot.applyMatrix4(tipped);
      joint.applyMatrix4(tipped);
    }
    const positions = g.getAttribute('position').array as Float32Array;
    const normals = g.getAttribute('normal').array as Float32Array;
    ink.set(p.colour);
    const colours = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) colours.set([ink.r, ink.g, ink.b], i * 3);
    return rigged(positions, normals, colours, null, folds, BIRD_RIGS[p.rig ?? 'body'], p.side ?? 0, shares, tilt, pivot, joint);
  });
  for (const unit of Object.values(units)) unit.dispose();
  return mergeGeometries(parts)!;
}

function smallFallback(kind: Species): BufferGeometry {
  const p = BIRDS[kind] as (typeof BIRDS)[Species] & { long?: number; cap?: string; bib?: string };
  const long = p.long ?? 1;
  const neck: [number, number, number] = [0.14, 0.44, 0];
  const pieces: Piece[] = [
    { unit: 'ball', colour: p.back, at: [0, 0.36, 0], size: [0.27, 0.17, 0.17] },
    { unit: 'ball', colour: p.belly, at: [0.04, 0.31, 0], size: [0.22, 0.14, 0.15] },
    { unit: 'ball', colour: p.head, at: [0.22, 0.47, 0], size: [0.13, 0.12, 0.12], rig: 'head', pivot: neck },
    ...[1, -1].map((s): Piece => ({ unit: 'ball', colour: p.cheek, at: [0.25, 0.45, s * 0.07], size: [0.065, 0.05, 0.05], rig: 'head', pivot: neck })),
    ...[1, -1].map((s): Piece => ({ unit: 'ball', colour: '#141210', at: [0.3, 0.49, s * 0.08], size: [0.02, 0.02, 0.02], rig: 'head', pivot: neck })),
    { unit: 'cone', colour: p.beak, at: [0.38, 0.465, 0], size: [0.024, 0.09, 0.024], rig: 'head', pivot: neck },
    { unit: 'cone', colour: p.beak, at: [0.37, 0.452, 0], size: [0.016, 0.08, 0.016], rig: 'jaw', pivot: neck, joint: [0.33, 0.455, 0] },
    ...(p.bib ? [{ unit: 'ball', colour: p.bib, at: [0.2, 0.33, 0], size: [0.1, 0.11, 0.06] } as Piece] : []),
    ...[1, -1].map((s): Piece => ({ unit: 'ball', colour: p.wing, at: [0.02, 0.4, s * 0.31], size: [0.12, 0.012, 0.24], rig: 'wing', side: s, pivot: [0.04, 0.4, s * 0.1], joint: [0.04, 0.4, s * 0.33] })),
    { unit: 'ball', colour: p.tail, at: [-0.2 - 0.17 * long, 0.42, 0], size: [0.17 * long, 0.02, 0.065], turn: 0.1, rig: 'tail', pivot: [-0.22, 0.4, 0] },
    ...[1, -1].map((s): Piece => ({ unit: 'rod', colour: '#4e443a', at: [0.04, 0.1, s * 0.045], size: [0.013, 0.2, 0.013], rig: 'legs', pivot: [0.04, 0.2, 0] })),
  ];
  return assemble(pieces, BIRD_TILT[kind], new Vector3(0, 0.36, 0), { span: 0.5, fold: 0.42 });
}

function soaringFallback(kind: 'raven' | 'crow'): BufferGeometry {
  const p = SOARING[kind] as (typeof SOARING)['raven'];
  const pieces: Piece[] = [
    { unit: 'ball', colour: p.body, at: [0, 0, 0], size: [0.36, 0.12, 0.13] },
    { unit: 'ball', colour: p.head, at: [0.36, 0.035, 0], size: [0.12, 0.1, 0.095], rig: 'head', pivot: [0.26, 0.02, 0] },
    { unit: 'cone', colour: p.beak, at: [0.5, 0.04, 0], size: [0.04, 0.12, 0.034], rig: 'head', pivot: [0.26, 0.02, 0] },
    { unit: 'cone', colour: p.beak, at: [0.49, 0.015, 0], size: [0.025, 0.1, 0.025], rig: 'jaw', pivot: [0.26, 0.02, 0], joint: [0.44, 0.025, 0] },
    { unit: 'ball', colour: p.tail, at: [-0.5, 0.01, 0], size: [0.22, 0.02, kind === 'raven' ? 0.12 : 0.1], rig: 'tail', pivot: [-0.3, 0.01, 0] },
    ...[1, -1].flatMap((s): Piece[] => [
      { unit: 'ball', colour: p.wing, at: [0.02, 0.03, s * 0.45], size: [0.2, 0.018, 0.4], rig: 'wing', side: s, pivot: [0.05, 0.03, s * 0.08], joint: [0.06, 0.03, s * 0.4] },
      ...[0, 1, 2, 3].map((k): Piece => ({ unit: 'ball', colour: p.wing, at: [-0.06 + k * 0.055, 0.03, s * 0.88], size: [0.035, 0.008, 0.12], rig: 'wing', side: s, pivot: [0.05, 0.03, s * 0.08], joint: [0.06, 0.03, s * 0.4] })),
    ]),
  ];
  return assemble(pieces, 0, new Vector3(), { span: 0.95, fold: 0.5 });
}
