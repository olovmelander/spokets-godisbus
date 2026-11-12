import {
  BufferGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh,
  MeshStandardMaterial, Quaternion, SphereGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData, Ledge } from '../../sim/types';
import { sequence } from '../../render/dressing/kit';
import type { ExtraContext, ViewExtra } from '../../render/extensions';
import { sway } from '../../render/wind';
import { HAZEL } from './chapters/billsta';

/**
 * Hazel at Billaberget's rock shelves in Billsta (Olov, 12 November 2026: "gör det som rekommenderad men gärna
 * hasselbuskar också och nån hasselnöt"). Elof's line there is about the shelves and their sweets; beside them, at the
 * cliff's foot and behind the path, grow hazel bushes: many grey-brown stems from the ground, fanning up and arching
 * out, with side twigs, and their round, toothed leaves in October's green going yellow. Ripe nuts in their leafy husks
 * hang in twos and threes at the front of each bush, and two that have fallen lie on the shelves, a little aside from
 * their sweets (`HAZEL` in ./chapters/billsta.ts says where).
 *
 * Picture only: the simulation knows none of it, and no nut is candy. Everything stands well behind the path, and
 * behind the back of each shelf where a bush reaches one, so that none of it is ever in front of him, his shelves or a
 * sweet. Two draws for all of it: the leaves in one instanced mesh, which trembles in the storm's wind with the grass
 * (../../render/wind.ts), and the stems, the twigs and the nuts in one mesh of vertex colours.
 */

/** The leaves' October colours: green at the heart of a bush, going yellow towards its outside and its top. */
const LEAF = ['#56722a', '#6f892e', '#8e9a36', '#ada63f', '#c39d3a'].map((hex) => new Color(hex));
/** Hazel's smooth bark: grey-brown, lighter than the night makes it look. */
const BARK = ['#9a8a76', '#a89884', '#8a7a68'].map((hex) => new Color(hex));
const NUT = { shell: new Color('#94602e'), dark: new Color('#6e4422'), scar: new Color('#d6c194') };
const HUSK = { green: new Color('#a3a04a'), brown: new Color('#8c7238') };

/** How near the path (z 0) anything of a bush comes, at the most. */
export const HAZEL_FRONT = -1.2;
/** Beside or over a shelf, nothing of a bush comes nearer than the shelf's back (the kit's shelves reach back to -1.6). */
const BEHIND_SHELF = -1.8;
/** A shelf's drawn half-width for its ledge's: the kit's shelves are drawn a little wider than they are walked. */
const SHELF_DRAWN = 0.8;

/** A nut's size, in EL: its length from its pale foot to its point, and its breadth. Drawn a little big, to be seen. */
export const NUT_SIZE = { long: 0.24, wide: 0.18 };
/** No leaf grows lower over a bush's foot than this: there he, and the trail's sweets, stand before its bare stems. */
export const BARE_BELOW = 2.3;

const UP = new Vector3(0, 1, 0);

/**
 * One hazel leaf, a unit long from the end of its stalk to its tip, facing +z: round and broad, heart-shaped at its
 * foot, with a short point, and doubly toothed all round. It folds back a little along its midrib and curls back
 * towards its tip. Its colour is darker at its foot, for the instance's colour to multiply.
 */
export function hazelLeaf(): BufferGeometry {
  const edge = new CatmullRomCurve3([
    [0, 0.06], [0.13, -0.03], [0.3, 0.03], [0.45, 0.2], [0.5, 0.42], [0.47, 0.63], [0.37, 0.82], [0.21, 0.96], [0.08, 1.05], [0, 1.12],
  ].map(([x, y]) => new Vector3(x, y, 0)));
  const N = 14;
  const parts: BufferGeometry[] = [];
  for (const side of [1, -1]) {
    const position: number[] = [], colour: number[] = [], index: number[] = [];
    const curl = (y: number) => -0.1 * Math.max(0, y) ** 2;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const p = edge.getPointAt(s);
      const t = edge.getTangentAt(s);
      // Every edge point between foot and tip is a tooth, pointing a little towards the tip: every other one a big one.
      const tooth = i > 0 && i < N ? (i % 2 ? 0.045 : 0.016) : 0;
      const x = (p.x + t.y * tooth) * side;
      const y = p.y - t.x * tooth + (tooth > 0.02 ? 0.02 : 0);
      const fold = -0.08 * Math.abs(x) / 0.5;
      const mid = 0.06 + (1.12 - 0.06) * s;
      position.push(0, mid, curl(mid), x, y, curl(y) + fold);
      const light = 0.72 + 0.28 * s;
      colour.push(light * 1.04, light * 1.04, light * 1.04, light, light, light);
      if (i < N) {
        const a = i * 2;
        // Front faces +z on both halves.
        if (side > 0) index.push(a, a + 1, a + 3, a, a + 3, a + 2);
        else index.push(a, a + 3, a + 1, a, a + 2, a + 3);
      }
    }
    const half = new BufferGeometry();
    half.setAttribute('position', new Float32BufferAttribute(position, 3));
    half.setAttribute('color', new Float32BufferAttribute(colour.map((c) => Math.min(1, c)), 3));
    half.setIndex(index);
    half.computeVertexNormals();
    parts.push(half);
  }
  const leaf = mergeGeometries(parts)!;
  parts.forEach((part) => part.dispose());
  return leaf;
}

/** Colours a geometry's every corner, by the corner's own place: what `paint` does, but varying. */
function coloured(geometry: BufferGeometry, by: (x: number, y: number, z: number) => Color): BufferGeometry {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  if (part !== geometry) geometry.dispose();
  const at = part.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    const c = by(at.getX(i), at.getY(i), at.getZ(i));
    colours.set([c.r, c.g, c.b], i * 3);
  }
  part.setAttribute('color', new Float32BufferAttribute(colours, 3));
  part.deleteAttribute('uv');
  return part;
}

/** A tapering round piece of a stem or twig from one point to another, in bark. */
function limb(from: Vector3, to: Vector3, r0: number, r1: number, bark: Color, sides = 5): BufferGeometry {
  const along = to.clone().sub(from);
  const length = along.length();
  const geometry = new CylinderGeometry(r1, r0, length + Math.min(r0, 0.06), sides, 1, true).translate(0, length / 2, 0);
  geometry.applyQuaternion(new Quaternion().setFromUnitVectors(UP, along.normalize()));
  geometry.translate(from.x, from.y, from.z);
  return coloured(geometry, () => bark);
}

/** A hazelnut, its foot at the origin and its point along +y: a brown egg, pointed at its tip, its foot a pale scar. */
function nut(): BufferGeometry {
  const geometry = new SphereGeometry(1, 10, 8);
  const at = geometry.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const y = at.getY(i);
    const point = 1 + 0.22 * Math.max(0, y) ** 2;
    at.setXYZ(i, at.getX(i) * (NUT_SIZE.wide / 2) * (1 - 0.18 * Math.max(0, y)), (y * point + 1) * (NUT_SIZE.long / 2) / 1.11, at.getZ(i) * (NUT_SIZE.wide / 2));
  }
  geometry.computeVertexNormals();
  const tone = new Color();
  // Faint stripes along the shell, and darker towards its point.
  return coloured(geometry, (x, y, z) => y < NUT_SIZE.long * 0.16 ? NUT.scar
    : tone.copy(NUT.shell).lerp(NUT.dark, Math.min(1, 0.2 + 0.2 * Math.sin(Math.atan2(x, z) * 7) + 0.4 * (y / NUT_SIZE.long))));
}

/**
 * The leafy husk a nut sits in, its foot at the origin and open along +y: a cup, ragged at its rim into lobes that
 * reach past the nut's middle, green going brown.
 */
function husk(seed: number): BufferGeometry {
  const sides = 10;
  const k = NUT_SIZE.long / 0.2;
  const geometry = new CylinderGeometry(0.105 * k, 0.042 * k, 0.15 * k, sides, 2, true).translate(0, 0.075 * k, 0);
  const at = geometry.getAttribute('position');
  const random = sequence(seed);
  const lobes = Array.from({ length: sides + 1 }, (_, j) => (j % 2 ? -0.025 : 0.045 + 0.03 * random()) * k);
  for (let i = 0; i < at.count; i++) {
    if (at.getY(i) < 0.14 * k) continue;
    const a = Math.atan2(at.getZ(i), at.getX(i));
    const j = Math.round(((a + Math.PI) / (2 * Math.PI)) * sides) % sides;
    const lift = lobes[j]!;
    const out = 1 + (Math.max(0, lift) / k) * 2.4;
    at.setXYZ(i, at.getX(i) * out, at.getY(i) + lift, at.getZ(i) * out);
  }
  geometry.computeVertexNormals();
  const tone = new Color();
  return coloured(geometry, (_, y) => tone.copy(HUSK.green).lerp(HUSK.brown, Math.min(1, Math.max(0, (y / k - 0.08) / 0.12))));
}

/** A nut in its husk, or bare, its foot at `at` and pointing along `way`. */
function nutAt(at: Vector3, way: Vector3, seed: number, inHusk = true): BufferGeometry[] {
  const turn = new Quaternion().setFromUnitVectors(UP, way.clone().normalize());
  const place = (g: BufferGeometry, lift: number) => g.translate(0, lift, 0).applyQuaternion(turn).translate(at.x, at.y, at.z);
  const parts = [place(nut(), inHusk ? 0.1 * NUT_SIZE.long : 0)];
  if (inHusk) parts.push(place(husk(seed), 0));
  return parts;
}

interface LeafAt { at: Vector3; way: Vector3; size: number; tint: Color }
interface Bush { x: number; y: number; z: number; tall: number; wide: number; nuts: number }

/** Where a shelf stands in the way of a leaf, for a leaf's foot and tip: in front of the shelf's back, beside or over it. */
function byShelf(point: Vector3, shelves: readonly Ledge[]): boolean {
  return shelves.some((s) => Math.abs(point.x - s.x) < s.width * SHELF_DRAWN + 0.35 && point.y > s.y - 1.6 && point.y < s.y + 0.7 && point.z > BEHIND_SHELF);
}

/** One bush: its stems and twigs, where its leaves grow, and where its nuts hang (`hubs`: where each cluster hangs from). */
function grow(bush: Bush, seed: number, shelves: readonly Ledge[]): { wood: BufferGeometry[]; leaves: LeafAt[]; hubs: Vector3[] } {
  const random = sequence(seed);
  const wood: BufferGeometry[] = [];
  const leaves: LeafAt[] = [];
  const tips: Vector3[] = [];
  const hubs: Vector3[] = [];
  const stems = 6 + Math.round(random() * 2);
  const tint = new Color();
  const leafColour = (height: number, out: number) => {
    // Greener low in the bush and at its heart, yellower high and at its outside; each leaf a little its own.
    const k = Math.min(LEAF.length - 1.001, Math.max(0, 0.6 + height * 1.8 + out * 1.4 + (random() - 0.5) * 1.6));
    const i = Math.floor(k);
    return tint.copy(LEAF[i]!).lerp(LEAF[i + 1]!, k - i).clone();
  };
  /** Leaves along a limb, alternately to each side, from `from` of its way along to its tip, and one or two at its tip. */
  const leafy = (points: Vector3[], from: number, spacing: number, size: number) => {
    const length = points.slice(1).reduce((sum, p, i) => sum + p.distanceTo(points[i]!), 0);
    const curve = new CatmullRomCurve3(points);
    const count = Math.max(1, Math.round((length * (1 - from)) / spacing));
    for (let k = 0; k <= count; k++) {
      const s = from + ((1 - from) * k) / count;
      const at = curve.getPointAt(Math.min(1, s));
      const along = curve.getTangentAt(Math.min(1, s));
      const side = k % 2 ? 1 : -1;
      const spread = k === count ? (random() - 0.5) * 0.6 : side * (0.85 + random() * 0.5);
      const c = Math.cos(spread), n = Math.sin(spread);
      const way = new Vector3(along.x * c - along.y * n, along.x * n + along.y * c - 0.25, along.z + (random() - 0.6) * 0.5).normalize();
      const height = (at.y - bush.y) / bush.tall;
      const out = Math.min(1, Math.abs(at.x - bush.x) / bush.wide);
      leaves.push({ at, way, size: size * (0.85 + random() * 0.3), tint: leafColour(height, out) });
      if (k === count && random() < 0.6) {
        const twin = way.clone().applyAxisAngle(new Vector3(0, 0, 1), side * 0.7).normalize();
        leaves.push({ at: at.clone(), way: twin, size: size * 0.8, tint: leafColour(height + 0.1, out) });
      }
    }
  };
  for (let i = 0; i < stems; i++) {
    const fan = ((i + 0.5) / stems - 0.5) * 1.1 + (random() - 0.5) * 0.18;
    const lean = -0.12 + (random() - 0.5) * 0.2;
    const length = bush.tall * (0.82 + random() * 0.22) * (1 - 0.3 * Math.abs(fan));
    const arch = 0.35 * Math.sign(fan || 1) * (0.5 + random());
    const base = new Vector3(bush.x + fan * bush.wide * 0.18 + (random() - 0.5) * 0.25, bush.y - 0.3, bush.z + (random() - 0.5) * 0.4);
    const points = [base];
    for (let k = 1; k <= 4; k++) {
      const a = fan * (bush.wide / 2.2) + arch * (k / 4) ** 1.5;
      const step = new Vector3(Math.sin(a), Math.cos(a), Math.sin(lean)).normalize().multiplyScalar(length / 4);
      points.push(points[k - 1]!.clone().add(step));
    }
    const bark = BARK[i % BARK.length]!;
    const r0 = 0.1 + random() * 0.035;
    for (let k = 0; k < 4; k++) wood.push(limb(points[k]!, points[k + 1]!, r0 * (1 - 0.68 * k / 4), r0 * (1 - 0.68 * (k + 1) / 4), bark));
    leafy(points, 0.45, 0.3, 0.44);
    // Its side twigs, upward and out to either side, leafy all along.
    const curve = new CatmullRomCurve3(points);
    const twigs = 3 + Math.round(random());
    for (let k = 0; k < twigs; k++) {
      const s = 0.45 + (0.4 * (k + random() * 0.6)) / twigs;
      const from = curve.getPointAt(s);
      const along = curve.getTangentAt(s);
      const side = (k + i) % 2 ? 1 : -1;
      const a = side * (0.6 + random() * 0.35);
      const way = new Vector3(along.x * Math.cos(a) - along.y * Math.sin(a), along.x * Math.sin(a) + along.y * Math.cos(a), along.z - 0.1 + random() * 0.1).normalize();
      const long = 0.9 + random() * 0.7;
      const mid = from.clone().addScaledVector(way, long / 2).add(new Vector3(0, 0.08, 0));
      const end = from.clone().addScaledVector(way, long).add(new Vector3(0, -0.05, 0));
      // None reaches in front of a shelf.
      if (byShelf(mid, shelves) || byShelf(end, shelves)) continue;
      wood.push(limb(from, mid, 0.034, 0.024, bark, 4), limb(mid, end, 0.024, 0.014, bark, 4));
      leafy([from, mid, end], 0.15, 0.3, 0.42);
      tips.push(end);
    }
    tips.push(points[4]!);
  }
  // Ripe nuts in their husks, hanging in twos and threes from twigs at the front of the bush, in its middle heights.
  const hanging = tips
    .filter((tip) => tip.y > bush.y + bush.tall * 0.4 && tip.y < bush.y + bush.tall * 0.85 && !byShelf(tip, shelves))
    .sort((a, b) => Math.abs(a.x - bush.x) - Math.abs(b.x - bush.x));
  const chosen: Vector3[] = [];
  for (const tip of hanging) if (chosen.length < bush.nuts && chosen.every((c) => c.distanceTo(tip) > 1.2)) chosen.push(tip);
  for (const [k, tip] of chosen.entries()) {
    const stalk = tip.clone().add(new Vector3(0, -0.05, 0.2));
    stalk.z = Math.min(stalk.z, HAZEL_FRONT - 0.25);
    const hub = stalk.clone().add(new Vector3(0, -0.12, 0));
    wood.push(limb(tip, stalk, 0.016, 0.014, BARK[0]!, 4), limb(stalk, hub, 0.014, 0.012, BARK[0]!, 4));
    const ways = k % 2 ? [[-0.55, -1, 0.1], [0.55, -1, 0.1]] : [[-0.6, -1, 0], [0.6, -1, 0], [0, -1, 0.55]];
    for (const [j, [x, y, z]] of ways.entries()) wood.push(...nutAt(hub, new Vector3(x, y, z), seed * 10 + k * 3 + j));
    hubs.push(hub);
  }
  return { wood, leaves, hubs };
}

/**
 * Everything of the hazel: the wood and nuts in one geometry, the leaves as where each one grows, and where the nuts
 * are: the clusters hanging in the bushes (each from its hub) and the middles of the fallen ones.
 */
export function hazelGrowth(shelves: readonly Ledge[]): { wood: BufferGeometry; leaves: LeafAt[]; nuts: { hanging: Vector3[]; fallen: Vector3[] } } {
  const wood: BufferGeometry[] = [];
  const leaves: LeafAt[] = [];
  const nuts = { hanging: [] as Vector3[], fallen: [] as Vector3[] };
  for (const [i, bush] of HAZEL.bushes.entries()) {
    const grown = grow(bush, 7919 + i * 101, shelves);
    wood.push(...grown.wood);
    nuts.hanging.push(...grown.hubs);
    // None of it comes nearer the path than its front, or reaches in front of a shelf's back.
    for (const leaf of grown.leaves) {
      const tip = leaf.at.clone().addScaledVector(leaf.way, leaf.size * 1.15);
      if (Math.max(leaf.at.z, tip.z) + leaf.size * 0.5 > HAZEL_FRONT || byShelf(leaf.at, shelves) || byShelf(tip, shelves) || Math.min(leaf.at.y, tip.y) < bush.y + BARE_BELOW) continue;
      leaves.push(leaf);
    }
  }
  // Fallen nuts, lying on their sides on the shelves.
  for (const [i, fallen] of HAZEL.fallen.entries()) {
    const way = new Vector3(Math.cos(1.1 + i * 2.3), 0, Math.sin(1.1 + i * 2.3) * 0.5);
    const middle = new Vector3(fallen.x, fallen.y + NUT_SIZE.wide / 2 - 0.01, fallen.z);
    wood.push(...nutAt(middle.clone().addScaledVector(way.clone().normalize(), -NUT_SIZE.long / 2), way, 31 + i, false));
    nuts.fallen.push(middle);
  }
  const merged = mergeGeometries(wood)!;
  wood.forEach((part) => part.dispose());
  return { wood: merged, leaves, nuts };
}

/** Billsta's hazel (registered by ./render.ts). Other chapters get nothing. */
export function hazelExtra({ chapter, scene }: ExtraContext): ViewExtra | null {
  if (chapter.id !== 'billsta') return null;
  scene.add(hazel(chapter));
  return { update() {} };
}

/** The hazel's two meshes, in a group named 'hazel'. */
export function hazel(chapter: ChapterData): Group {
  const shelves = (chapter.ledges ?? []).filter((ledge) => ledge.look === 'shelf');
  const { wood, leaves } = hazelGrowth(shelves);
  const group = new Group();
  group.name = 'hazel';
  const stems = new Mesh(wood, new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, side: DoubleSide }));
  stems.name = 'hazel-wood';
  // Wet leaves in the rain: a little sheen. They tremble in the wind, the whole leaf a little and its tip more.
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.58, side: DoubleSide });
  sway(material, 0.1, 0, 0.02, 1, 0);
  const shape = hazelLeaf();
  const foliage = new InstancedMesh(shape, material, leaves.length);
  foliage.name = 'hazel-leaves';
  const basis = new Matrix4(), scale = new Matrix4();
  const facing = new Vector3(), side = new Vector3();
  const random = sequence(4057);
  for (const [i, leaf] of leaves.entries()) {
    // Each leaf turned mostly to the camera, as a bush's leaves are seen from the path, but each a little its own way.
    facing.set((random() - 0.5) * 0.9, 0.3 + (random() - 0.5) * 0.6, 1).addScaledVector(leaf.way, -leaf.way.dot(facing)).normalize();
    side.crossVectors(leaf.way, facing).normalize();
    facing.crossVectors(side, leaf.way).normalize();
    basis.makeBasis(side, leaf.way, facing).setPosition(leaf.at);
    foliage.setMatrixAt(i, basis.multiply(scale.makeScale(leaf.size, leaf.size, leaf.size)));
    foliage.setColorAt(i, leaf.tint);
  }
  foliage.instanceMatrix.needsUpdate = true;
  if (foliage.instanceColor) foliage.instanceColor.needsUpdate = true;
  foliage.computeBoundingBox();
  foliage.computeBoundingSphere();
  // Their trembling must not take them out of the picture when their still bounds just leave it.
  foliage.boundingSphere!.radius += 0.3;
  group.add(stems, foliage);
  return group;
}
