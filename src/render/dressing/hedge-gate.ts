import {
  BufferGeometry, Color, DoubleSide, ExtrudeGeometry, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Matrix4, Mesh,
  MeshStandardMaterial, Quaternion, Shape, Vector2, Vector3, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { ChapterData } from '../../sim/types';
import { BARK_UP, barky } from '../bark-detail';
import { Cards, leafAtlas, leafy } from '../lift/flora/light';
import { KIT, heightAt, noise, sequence } from './kit';

/**
 * Gården ends at a tall hedge, and the hedge has an opening where the path goes on into the forest (Olov, 12 November
 * 2026: "Ja!" to "Ska häcken ha en öppning in mot skogen?"). The end of the ground is still the hedge's tall end, as
 * at Stormgården: just before it, beside the big candy, the hedge behind the path has a clipped round arch, a trodden
 * path runs from the lawn into it, and through it the forest is seen: dark spruce trunks on a floor of moss and needles,
 * the path going on between them. Only a hedge marked `gate` has one; Stormgården's and Stormbyn's ends are unchanged.
 *
 * The arch's own hedge is built with the rest of the hedge (./hedge.ts); what is seen through it is built here.
 */
export interface Gate {
  /** The hedge the arch is cut in: along the path, behind it, and how high. */
  from: number;
  to: number;
  bottom: number;
  top: number;
  front: number;
  back: number;
  /** The ground at its foot. */
  base: number;
  /** The opening: its two sides, the height where its round top springs, its middle and the round top's radius. */
  open: { from: number; to: number; spring: number; middle: number; radius: number };
}

/** The arch's place, from the end of the ground (`to` of the hedge marked `gate`): the wall he cannot pass. */
export function gateOf(chapter: ChapterData): Gate | null {
  const plant = (chapter.surfaces ?? []).find((surface) => surface.kind === 'hedge' && surface.gate);
  if (!plant) return null;
  const base = heightAt(chapter, plant.from - 0.01);
  const top = Math.max(base, ...chapter.ground.filter((point) => point.x >= plant.from && point.x <= plant.to).map((point) => point.y));
  const end = plant.to;
  // As wide as three of him and the big candy beside him; its round top a little over three of him high.
  const open = { from: end - 3.4, to: end - 0.7 };
  const radius = (open.to - open.from) / 2;
  // Four EL behind the path: out of the way of the birds that come down behind it (../lift/fauna/plan.ts), and its
  // right side runs into the hedge's tall end.
  return { from: end - 6.4, to: end + 0.6, bottom: base - 0.6, top, front: -4, back: -6.6, base,
    open: { ...open, spring: base + 2.2, middle: (open.from + open.to) / 2, radius } };
}

/** The arch's hedge, where it stands: a tall clipped wall with a round-topped opening down to the ground, its edges rounded. */
export function archShape(gate: Gate): BufferGeometry {
  const { open } = gate;
  const shape = new Shape();
  shape.moveTo(gate.from, gate.bottom);
  shape.lineTo(open.from, gate.bottom);
  shape.lineTo(open.from, open.spring);
  shape.absarc(open.middle, open.spring, open.radius, Math.PI, 0, true);
  shape.lineTo(open.to, gate.bottom);
  shape.lineTo(gate.to, gate.bottom);
  shape.lineTo(gate.to, gate.top);
  shape.lineTo(gate.from, gate.top);
  shape.lineTo(gate.from, gate.bottom);
  const round = 0.38;
  const geometry = new ExtrudeGeometry(shape, {
    depth: gate.front - gate.back - 2 * round, steps: 1, curveSegments: 18,
    bevelEnabled: true, bevelThickness: round, bevelSize: round, bevelOffset: -round, bevelSegments: 3,
  });
  geometry.translate(0, 0, gate.back + round);
  return geometry;
}

/** The trodden path from the lawn into the arch and on into the forest: its middle and half its width at a depth. */
function pathAt(gate: Gate, z: number): { x: number; half: number } {
  // Straight from the path to the arch, then bending a little to the right between the trunks.
  const on = Math.min(1, Math.max(0, (gate.front - z) / 16));
  return { x: gate.open.middle + 0.9 * on * on * (3 - 2 * on), half: 0.72 - 0.22 * on };
}

/**
 * The lawn behind the path, as the ground builder draws it (./ground.ts: the lawn's front has the forest's floor,
 * PROFILE_FOREST, and the lawn rolls by 0.8 of it): its rows, how far over the path each lies and how much it rolls.
 * The forest's floor lies on it.
 */
const ROWS: readonly (readonly [z: number, drop: number, bump: number])[] = [
  [-30, 0.3, 0.1], [-22, 0, 0.2], [-16, -0.25, 0.25], [-10, -0.15, 0.2], [-5.5, 0, 0.26], [-2.6, 0, 0.14], [-0.9, 0, 0.05], [-0.3, 0, 0],
];
const ROLL = 0.8;
/** The ground builder's points along the outline are this far apart at most, and the ground is straight between them. */
const STEP = 0.45;

/** The height of the lawn at (x, z) behind the path, sampled where the ground builder samples it. */
function lawnAt(line: readonly { x: number; y: number }[], x: number, z: number): number {
  const outline = [{ x: line[0]!.x - 16, y: line[0]!.y }, ...line, { x: line.at(-1)!.x + 16, y: line.at(-1)!.y }];
  const at = (px: number, py: number) => {
    // In front of the last row the lawn is level with the path.
    if (z >= ROWS.at(-1)![0]) return py;
    const row = ROWS.findIndex(([rz]) => rz >= z);
    const a = ROWS[Math.max(0, row - 1)]!, b = ROWS[Math.max(0, row)]!;
    const k = b[0] === a[0] ? 0 : (z - a[0]) / (b[0] - a[0]);
    const y = (r: readonly [number, number, number]) => py - r[1] + r[2] * ROLL * (noise(px * 1.15, r[0] * 1.4 + 7) - 0.5) * 2;
    return y(a) + (y(b) - y(a)) * Math.min(1, Math.max(0, k));
  };
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!, b = outline[i + 1]!;
    if (x < a.x || x > b.x || a.x === b.x) continue;
    const pieces = Math.max(1, Math.ceil((b.x - a.x) / STEP));
    const k = Math.min(pieces - 1, Math.floor(((x - a.x) / (b.x - a.x)) * pieces));
    const x0 = a.x + ((b.x - a.x) * k) / pieces, x1 = a.x + ((b.x - a.x) * (k + 1)) / pieces;
    const y0 = a.y + ((b.y - a.y) * k) / pieces, y1 = a.y + ((b.y - a.y) * (k + 1)) / pieces;
    const t = (x - x0) / (x1 - x0);
    return at(x0, y0) + (at(x1, y1) - at(x0, y0)) * t;
  }
  return at(x, heightAt({ ground: [...line] } as ChapterData, x));
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Where the sun comes down through the spruces onto the path, further in: its depth, and how long and wide the patch is. */
const SUNNY = { z: -15.5, long: 3.4, wide: 2.2 };
const LIT_PATH = new Color('#c4a874');
const LIT_MOSS = new Color('#6f7a3a');

/** The forest's floor seen through the arch, and the trodden path from the lawn into it, lying on the lawn. */
function floorOf(gate: Gate, line: readonly { x: number; y: number }[]): Mesh {
  const x0 = gate.from - 2.2, x1 = gate.to + 3.6, near = -0.5, far = -31;
  const cols = Math.ceil((x1 - x0) / 0.2), rows = Math.ceil((near - far) / 0.25);
  const position: number[] = [], colour: number[] = [], index: number[] = [];
  const moss = new Color('#26301d'), needles = new Color('#3b3322'), earth = new Color('#6f5b40'), deep = new Color('#4f4231');
  const c = new Color(), trodden = new Color();
  for (let j = 0; j <= rows; j++) {
    const z = near + ((far - near) * j) / rows;
    const path = pathAt(gate, z);
    for (let i = 0; i <= cols; i++) {
      const x = x0 + ((x1 - x0) * i) / cols;
      // A finger over the lawn, so that it lies on it and not in it: the ground's own triangles differ by a few hundredths.
      position.push(x, lawnAt(line, x, z) + 0.06, z);
      const edge = Math.abs(x - path.x) - path.half * (0.85 + 0.3 * noise(x * 2.3, z * 1.7));
      const onPath = 1 - smooth(-0.22, 0.18, edge);
      // Behind the hedge's face the forest's floor; in front of it only the path, coming in from the lawn.
      const forest = smooth(gate.front + 0.4, gate.front - 0.4, z);
      const sides = smooth(x0, x0 + 1.8, x) * (1 - smooth(x1 - 1.8, x1, x)) * smooth(far, far + 4, z);
      const alpha = Math.max(onPath * smooth(near, near - 1.1, z) * 0.92, forest) * sides;
      c.copy(moss).lerp(needles, noise(x * 0.9 + 4, z * 0.7) * 0.9);
      trodden.copy(earth).lerp(deep, smooth(gate.front, gate.front - 10, z) * 0.8 + noise(x * 3.1, z * 2.4) * 0.2);
      c.lerp(trodden, onPath);
      // Further in, the forest's shade; and a patch of sun through the spruces where the path bends, to go on to.
      const sun = Math.exp(-(((z - SUNNY.z) / SUNNY.long) ** 2) - ((x - path.x) / SUNNY.wide) ** 2) * (0.65 + 0.35 * noise(x * 1.7, z * 1.3));
      c.multiplyScalar(1 - 0.35 * smooth(gate.front, gate.front - 14, z)).lerp(onPath > 0.5 ? LIT_PATH : LIT_MOSS, sun * 0.85);
      colour.push(c.r, c.g, c.b, alpha);
      if (i < cols && j < rows) {
        const a = j * (cols + 1) + i, b = a + cols + 1;
        index.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 4));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const floor = new Mesh(geometry, new MeshStandardMaterial({
    vertexColors: true, transparent: true, depthWrite: false, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
  }));
  floor.name = 'hedge-gate-floor';
  floor.receiveShadow = true;
  return floor;
}

/** How tall the forest's spruces are: their tops are over every picture, on a phone held upright too. */
const TALL = 30;

/** A spruce's trunk as the forest's (./kit.ts): its roots, moss and bark, up into its crown. */
function trunk(): BufferGeometry {
  const profile: [number, number][] = [[1.9, 0], [1.55, 0.35], [1.25, 0.9], [1.08, 1.8], [1.01, 3.2], [1, 8], [0.97, 20], [0.55, TALL]];
  const geometry = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 18);
  const at = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const colour: number[] = [];
  const moss = new Color('#4d6b26');
  const wood = new Color('#7d6753');
  const c = new Color();
  for (let i = 0; i < at.count; i++) {
    const y = at.getY(i);
    const green = Math.max(0, 1 - y / (1.3 + 0.9 * Math.sin(Math.atan2(at.getZ(i), at.getX(i)))));
    c.copy(wood).lerp(moss, Math.min(1, green * 1.3));
    colour.push(c.r, c.g, c.b);
    uv.setXY(i, uv.getX(i) * 3, y / 6);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  return barky(geometry, BARK_UP);
}

/**
 * The spruces beyond the arch, near and further in, standing back from the path: [along from the arch's middle, depth,
 * radius, how dark]. Not the dressing's instanced trunks, which the near life and the boughs look for: these are only
 * seen through the arch, and past the hedge's end from the lawn.
 */
const SPRUCES: readonly (readonly [number, number, number, number])[] = [
  [-1.95, -8.6, 0.72, 0.62], [1.75, -10, 0.66, 0.55], [-4.2, -11.6, 0.66, 0.5], [-1.05, -12.8, 0.6, 0.5],
  [2.1, -15, 0.56, 0.46], [-2.8, -16.6, 0.6, 0.44], [4.1, -18, 0.55, 0.4], [-0.6, -19.4, 0.5, 0.4],
  [2.9, -21.2, 0.52, 0.38], [-2.2, -22.6, 0.5, 0.36], [0.9, -25.6, 0.48, 0.34], [-3.8, -26.4, 0.5, 0.32],
];
/** Young spruces further in, their dark tiers down to the moss: [along, depth, height]. They close the forest's depth. */
const YOUNG: readonly (readonly [number, number, number])[] = [
  [-4.9, -21.5, 6], [-1.2, -24.4, 5.4], [2.4, -24, 6.2], [4.8, -25.5, 6.6], [-2.9, -29, 7.2], [0.6, -30, 7.4], [3.6, -29.5, 7],
  [-5.6, -30.5, 7.6],
];
/** The dark of the spruce, as the lift's spruces have it (../lift/flora/trees.ts). */
const NEEDLES = ['#2c4636', '#34523a', '#283f30', '#3e5838'].map((hex) => new Color(hex));
const FERNS = ['#3d5a2c', '#4a6630', '#36522a'].map((hex) => new Color(hex));

function sprucesOf(gate: Gate, line: readonly { x: number; y: number }[]): Mesh {
  const shape = trunk();
  const parts = SPRUCES.map(([along, z, r, dark], i) => {
    const one = shape.clone();
    const x = gate.open.middle + along;
    one.scale(r, 1, r).rotateY(i * 2.3).translate(x, lawnAt(line, x, z) - 0.5, z);
    const colour = one.getAttribute('color');
    for (let k = 0; k < colour.count; k++) colour.setXYZ(k, colour.getX(k) * dark, colour.getY(k) * dark, colour.getZ(k) * dark);
    return one;
  });
  const merged = mergeGeometries(parts);
  for (const part of [shape, ...parts]) part.dispose();
  const trunks = new Mesh(merged, KIT.bark);
  trunks.name = 'hedge-gate-spruces';
  return trunks;
}

/** Tiers of spruce sprays round a stem from `from` to `to`, each as long as `reach` says at its height (as ../lift/flora/trees.ts). */
function tiers(cards: Cards, next: () => number, x: number, y0: number, z: number, from: number, to: number, reach: (y: number) => number, out: number): void {
  for (let y = from; y < to; y += 0.75 * (0.8 + next() * 0.4)) {
    for (let k = 0; k < 3; k++) {
      const side = k === 0 ? -1 : k === 1 ? 1 : next() < 0.5 ? -1 : 1;
      const long = reach(y) * (0.75 + next() * 0.35) * (k === 2 ? 0.7 : 1);
      const angle = (side > 0 ? 0 : Math.PI) - side * (0.3 + next() * 0.3);
      cards.card([x + side * out, y0 + y + 0.3, z + (next() - 0.5) * (k === 2 ? 2.4 : 1.2)], angle, long, long * 0.55 + 0.4, 'spray',
        NEEDLES[Math.floor(next() * NEEDLES.length)]!, (next() - 0.5) * (k === 2 ? 1.8 : 0.8), side * 0.35);
    }
  }
}

/**
 * The forest's green beyond the arch: the crowns of its spruces, whole up to their tops (high on the nearest two, so that
 * the path is seen under them; down to the moss further in), young spruces that close its depth, and ferns along the
 * path. From the lawn the same spruces are seen past the hedge's end, as the forest's edge: "Här börjar skogen."
 */
function greenOf(gate: Gate, line: readonly { x: number; y: number }[]): Mesh {
  const next = sequence(911);
  const shapes: BufferGeometry[] = [];
  for (const [along, z, r] of SPRUCES) {
    const x = gate.open.middle + along;
    const top = TALL * (0.85 + r * 0.2);
    const cards = new Cards(new Vector3(x, top * 0.45, z), new Vector3(3.4, top * 0.5, 1.5));
    // Through the arch the trunks and the floor between them are seen under the boughs; further in and to the sides
    // the boughs come down to the moss, and close the forest's depth.
    const near = z > -11, seen = Math.abs(along) < 3 && z > -21;
    tiers(cards, next, x, lawnAt(line, x, z), z, near ? 3 : seen ? 2.3 : 0.9, top * 0.97, (y) => (1 - y / top) * (near ? 3 : 3.6) + 0.45, r * 0.9);
    shapes.push(cards.build());
  }
  for (const [along, z, high] of YOUNG) {
    const x = gate.open.middle + along;
    const cards = new Cards(new Vector3(x, high * 0.45, z), new Vector3(2.6, high * 0.5, 1.3));
    tiers(cards, next, x, lawnAt(line, x, z), z, 0.2, high * 0.94, (y) => (1 - y / high) * 2.8 + 0.35, 0.1);
    shapes.push(cards.build());
  }
  // Ferns by the path, among the trunks: a few fronds each, arching up and out.
  const ferns = new Cards(new Vector3(gate.open.middle, 0.4, -14), new Vector3(6, 1, 10));
  for (let k = 0; k < 18; k++) {
    const z = gate.back - 0.6 - next() * 15;
    const path = pathAt(gate, z);
    const side = k % 2 === 0 ? -1 : 1;
    const x = path.x + side * (path.half + 0.35 + next() * 1.4);
    const y = lawnAt(line, x, z);
    const tint = FERNS[Math.floor(next() * FERNS.length)]!;
    for (let f = 0; f < 5; f++) {
      const angle = Math.PI / 2 + (f - 2) * 0.45 + (next() - 0.5) * 0.2;
      ferns.card([x, y, z + (next() - 0.5) * 0.4], angle, 0.8 + next() * 0.4, 0.55, 'fern', tint, (next() - 0.5) * 1.2, (f - 2) * 0.25);
    }
  }
  shapes.push(ferns.build());
  const merged = mergeGeometries(shapes);
  for (const shape of shapes) shape.dispose();
  const material = leafy(new MeshStandardMaterial({ map: leafAtlas(), alphaTest: 0.42, side: DoubleSide, vertexColors: true, roughness: 0.85 }));
  const green = new Mesh(merged, material);
  green.name = 'hedge-gate-green';
  return green;
}

/**
 * Grass is trodden short on the path, and does not grow on the forest's floor behind the hedge; a dandelion on the path
 * stands at its edge instead (the bee and the butterflies are told where they are only after this).
 */
function tread(standing: Object3D, gate: Gate): void {
  const m = new Matrix4(), p = new Vector3(), q = new Quaternion(), s = new Vector3();
  const onPath = (x: number, z: number, more = 0) => {
    const path = pathAt(gate, z);
    return z < -0.3 && z > gate.front - 0.2 && Math.abs(x - path.x) < path.half + more;
  };
  const inForest = (x: number, z: number) => z < gate.back && x > gate.from - 0.6 && x < gate.to + 2.6;
  standing.traverse((object) => {
    const mesh = object as InstancedMesh;
    if (!mesh.isInstancedMesh) return;
    if (mesh.material === KIT.lawn) {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        m.decompose(p, q, s);
        if (inForest(p.x, p.z)) s.setScalar(0);
        else if (onPath(p.x, p.z, 0.15)) s.y = Math.min(s.y, 0.08 + Math.abs(p.x - pathAt(gate, p.z).x) * 0.1);
        else continue;
        mesh.setMatrixAt(i, m.compose(p, q, s));
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
    // A stalk and its head are the same flower in two meshes of one stretch, at the same index.
    if (mesh.material === KIT.stem) {
      const heads = mesh.parent?.children.find((other) => (other as InstancedMesh).material === KIT.petal) as InstancedMesh | undefined;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        if (!onPath(p.x, p.z, 0.25)) continue;
        const path = pathAt(gate, p.z);
        const aside = (p.x < path.x ? -1 : 1) * (path.half + 0.4) + path.x - p.x;
        mesh.setMatrixAt(i, m.premultiply(new Matrix4().makeTranslation(aside, 0, 0)));
        if (heads && i < heads.count) {
          heads.getMatrixAt(i, m);
          heads.setMatrixAt(i, m.premultiply(new Matrix4().makeTranslation(aside, 0, 0)));
          heads.instanceMatrix.needsUpdate = true;
        }
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });
}

/**
 * What is seen through the arch of a chapter's gate, if it has one: built once the lawn stands (`standing`), whose grass
 * it treads down on the path. `line` is the ground as the ground builder draws it (./hedge.ts `hedgeGround`).
 */
export function hedgeGate(chapter: ChapterData, line: readonly { x: number; y: number }[], standing: Object3D): Group | null {
  const gate = gateOf(chapter);
  if (!gate || !KIT) return null;
  tread(standing, gate);
  const group = new Group();
  group.name = 'hedge-gate';
  group.add(floorOf(gate, line), sprucesOf(gate, line), greenOf(gate, line));
  return group;
}
