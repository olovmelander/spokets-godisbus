import {
  BoxGeometry, BufferGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, ExtrudeGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
  IcosahedronGeometry, MeshStandardMaterial, PlaneGeometry, Shape, ShapeGeometry, SphereGeometry, TorusGeometry, Vector3, type Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Storm } from '../../sim/types';
import { paintedWood } from '../../render/painted-wood';
import { groundDetail } from '../../render/ground-detail';
import { PLANK, STONE, barkDetail, barky, notBark } from '../../render/bark-detail';

/**
 * The big things of Äventyr 2's places, built in code (docs/aventyr-2.md): Billsta's white house with its two
 * gables and the red barn beside it, Olympia's goals, floodlight masts, stand and clubhouse, Flärken's diving tower
 * and changing huts, birches and a car. Each is an interpretation in plain shapes, never a
 * survey: no house number, no sign, no letter and no logotype anywhere. Sizes are in EL, one Elof length of 15 cm,
 * so a real house towers over him; the pictures stand behind the play plane and are never ground.
 *
 * Every building is one lit mesh (its parts' colours in the vertex colours) and, where it has windows, one more for
 * the panes, which glow warm once its `lit` flag is set: two draws at most.
 */

export type BuildingDef = NonNullable<Storm['buildings']>[number];
export interface Building { group: Group; panes: MeshBasicMaterial | null; def: BuildingDef }

const tint = new Color();
/** A part in one colour, ready to merge. */
export function paint(geometry: BufferGeometry, colour: string): BufferGeometry {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  tint.set(colour);
  const count = part.getAttribute('position').count;
  part.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count }, () => [tint.r, tint.g, tint.b]).flat(), 3));
  part.deleteAttribute('uv');
  return part;
}
export const box = (w: number, h: number, d: number, x: number, y: number, z: number, colour: string) => paint(new BoxGeometry(w, h, d).translate(x, y, z), colour);
/** A box turned about its own middle, then put in its place. */
const tilted = (w: number, h: number, d: number, rx: number, rz: number, x: number, y: number, z: number, colour: string) =>
  paint(new BoxGeometry(w, h, d).rotateX(rx).rotateZ(rz).translate(x, y, z), colour);
const post = (r: number, h: number, x: number, y: number, z: number, colour: string, sides = 8) => paint(new CylinderGeometry(r, r, h, sides).translate(x, y + h / 2, z), colour);
/** A gable's triangle, standing in the x-y plane, `depth` thick. */
function gable(width: number, rise: number, depth: number, x: number, y: number, z: number, colour: string): BufferGeometry {
  const g = new BufferGeometry();
  const w = width / 2;
  const d = depth / 2;
  const v = [[-w, 0, d], [w, 0, d], [0, rise, d], [-w, 0, -d], [w, 0, -d], [0, rise, -d]];
  const tri = [[0, 1, 2], [3, 5, 4], [0, 2, 5], [0, 5, 3], [1, 4, 5], [1, 5, 2], [0, 3, 4], [0, 4, 1]];
  g.setAttribute('position', new Float32BufferAttribute(tri.flatMap((t) => t.flatMap((i) => [v[i]![0]! + x, v[i]![1]! + y, v[i]![2]! + z])), 3));
  g.computeVertexNormals();
  return paint(g, colour);
}
/** A pitched roof over a box: two slabs from the eaves to the ridge, overhanging a little. */
function roof(width: number, rise: number, depth: number, x: number, y: number, z: number, colour: string, overhang = 1.2): BufferGeometry[] {
  const half = width / 2 + overhang;
  const slope = Math.hypot(half, rise);
  const angle = Math.atan2(rise, half);
  return [-1, 1].map((side) => paint(new BoxGeometry(slope, 0.5, depth + overhang * 2).rotateZ(side * -angle).translate(x + side * half / 2, y + rise / 2, z), colour));
}
const glass = () => new MeshBasicMaterial({ color: '#141a24', fog: true });

function villa(def: BuildingDef) {
  // Two storeys of white upright boards, a dark tiled roof with two gables to the front, a chimney, a ladder to the
  // roof, and windows in pale grey frames: interpreted from the picture Olov gave, never measured.
  const w = def.width ?? 64;
  const h = def.height ?? 40;
  const d = 32;
  const parts: BufferGeometry[] = [];
  parts.push(box(w, 2.4, d + 0.6, 0, 1.2, 0, '#7c7c78'));
  parts.push(box(w, h, d, 0, h / 2 + 2.4, 0, '#e8e8e2'));
  for (let x = -w / 2 + 1.2; x < w / 2; x += 2.4) parts.push(box(0.25, h, 0.3, x, h / 2 + 2.4, d / 2 + 0.1, '#cfcfc8'));
  const eaves = h + 2.4;
  parts.push(...roof(w, 14, d, 0, eaves, 0, '#3a3c40'));
  for (const gx of [-w * 0.17, w * 0.17]) {
    parts.push(gable(w * 0.34, 16, 2, gx, eaves, d / 2 - 0.4, '#e8e8e2'));
    parts.push(...roof(w * 0.34, 16, 3, gx, eaves, d / 2 - 1, '#3a3c40', 0.8));
  }
  parts.push(box(4, 14, 4, -w * 0.12, eaves + 12, -2, '#2e2e30'));
  // A roof ladder up the gable end.
  for (const side of [-0.9, 0.9]) parts.push(box(0.25, h - 4, 0.25, -w * 0.33 + side, (h - 4) / 2 + 6, d / 2 + 0.4, '#b8bcc0'));
  for (let y = 7; y < h; y += 1.6) parts.push(box(2, 0.2, 0.2, -w * 0.33, y, d / 2 + 0.4, '#b8bcc0'));
  const panes: BufferGeometry[] = [];
  for (const row of [h * 0.3, h * 0.75]) {
    for (const wx of [-w * 0.4, -w * 0.18, w * 0.05, w * 0.27, w * 0.42]) {
      parts.push(box(6.6, 7.6, 0.4, wx, row, d / 2 + 0.25, '#c8ccd0'));
      panes.push(new PlaneGeometry(5.4, 6.4).translate(wx, row, d / 2 + 0.5));
    }
  }
  return { parts, panes };
}

function barn(def: BuildingDef) {
  // Falu red boards, white trim, a big door, and a corrugated roof gone rusty.
  const w = def.width ?? 44;
  const h = def.height ?? 22;
  const d = 26;
  const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0, '#8a3328')];
  for (let x = -w / 2 + 1; x < w / 2; x += 2) parts.push(box(0.25, h, 0.3, x, h / 2, d / 2 + 0.1, '#6e281f'));
  parts.push(...roof(w, 8, d, 0, h, 0, '#8a5c3c'));
  parts.push(box(12, 14, 0.5, -w * 0.2, 7, d / 2 + 0.3, '#5a1e18'));
  for (const x of [-w * 0.2 - 6, -w * 0.2 + 6]) parts.push(box(0.6, 14.4, 0.6, x, 7.2, d / 2 + 0.4, '#e6e2d8'));
  const panes: BufferGeometry[] = [];
  for (const wx of [w * 0.12, w * 0.32]) {
    parts.push(box(5, 4.6, 0.4, wx, h * 0.62, d / 2 + 0.25, '#e6e2d8'));
    panes.push(new PlaneGeometry(4, 3.6).translate(wx, h * 0.62, d / 2 + 0.5));
  }
  return { parts, panes };
}

function goal(def: BuildingDef) {
  // A small goal for training, its mouth towards where he comes from: white posts, a crossbar going away into the
  // picture, and the net's frame behind. The net itself is drawn as fine lines of white.
  const depth = def.width ?? 7;
  const h = def.height ?? 8;
  const span = 12;
  const parts: BufferGeometry[] = [];
  for (const z of [-span / 2, span / 2]) {
    parts.push(post(0.35, h, 0, 0, z, '#f4f4f0'));
    parts.push(box(depth, 0.25, 0.25, depth / 2, h * 0.75, z, '#d8d8d4'));
    parts.push(box(0.25, h * 0.75, 0.25, depth, h * 0.375, z, '#d8d8d4'));
  }
  parts.push(box(0.7, 0.7, span, 0, h, 0, '#f4f4f0'));
  for (let k = 1; k < 10; k++) {
    parts.push(box(0.08, h * 0.9, 0.08, depth * (k / 10), h * 0.45, -span / 2, '#e6e6e2'));
    parts.push(box(0.08, 0.08, span, depth * (k / 10), h * (1 - 0.25 * (k / 10)), 0, '#e6e6e2'));
  }
  // The net is a mesh, not a row of strings: strands across the sides too, and the back net behind, in squares.
  for (let k = 1; k < 9; k++) {
    const y = h * 0.75 * (k / 9);
    for (const z of [-span / 2, span / 2]) parts.push(box(depth, 0.06, 0.06, depth / 2, y, z, '#e6e6e2'));
    parts.push(box(0.06, 0.06, span, depth, y, 0, '#e6e6e2'));
  }
  for (let k = 1; k < 12; k++) parts.push(box(0.06, h * 0.75, 0.06, depth, h * 0.375, -span / 2 + span * (k / 12), '#e6e6e2'));
  return { parts, panes: [] };
}

/**
 * The pitch, from its near touchline back towards the stand: mown stripes across it and its white lines, flat on the
 * ground in one shape. `width` is along the path. The lines stand a little over the stripes, and the goals are the
 * chapter's own. `marks`, from the pitch's middle: where the halfway line and its circle lie, a goal's box, and how
 * far it runs on towards the camera past the path, so that he runs on the pitch and not along its edge.
 *
 * `marks.wet`, in the chapter's own x and z: the flooded places. The pitch lies over the ground's pits, so over each
 * the turf and its lines are cut away and a bank of dark earth goes down from the cut, and the water in the pit
 * shows (Olov, 8 November 2026: Olympia's puddle could not be seen). A hole is the pit's whole width where he walks,
 * from where a pool's water is cut towards the camera (../../render/water.ts) back past the path, and rounds off
 * behind that to `back` at its middle.
 */
function pitch(def: BuildingDef) {
  const w = def.width ?? 130;
  const deep = def.height ?? 70;
  const halfway = def.marks?.halfway ?? 0;
  const box6 = def.marks?.box ?? null;
  const front = def.marks?.front ?? 0;
  const wets = (def.marks?.wet ?? []).map((wet) => ({ x0: wet.from - def.x, x1: wet.to - def.x, near: WET_NEAR - def.z, path: WET_PATH - def.z, back: wet.back - def.z }));
  // Each hole's whole box, for the turf; and in narrow slices, each as deep as the hole goes in it, for the lines.
  const boxes = wets.map((wet) => ({ x0: wet.x0, x1: wet.x1, z0: wet.back, z1: wet.near }));
  const slices = wets.flatMap((wet) => {
    const count = Math.ceil((wet.x1 - wet.x0) / 0.2);
    return Array.from({ length: count }, (_, i) => {
      const [x0, x1] = [wet.x0 + ((wet.x1 - wet.x0) * i) / count, wet.x0 + ((wet.x1 - wet.x0) * (i + 1)) / count];
      return { x0, x1, z0: Math.min(wetEdge(wet, x0), wetEdge(wet, x1)), z1: wet.near };
    });
  });
  const flat = (wide: number, long: number, x: number, z: number, y: number, colour: string) => box(wide, 0.04, long, x, y, z, colour);
  /** A flat rectangle (`x0` to `x1`, `z0` to `z1`), with what lies over the holes (`cut`) cut out of it. */
  const dry = (x0: number, x1: number, z0: number, z1: number, y: number, colour: string, cut = slices) => {
    for (const piece of cut.reduce((left, hole) => left.flatMap((r) => outside(r, hole)), [{ x0, x1, z0, z1 }])) {
      parts.push(flat(piece.x1 - piece.x0, piece.z1 - piece.z0, (piece.x0 + piece.x1) / 2, (piece.z0 + piece.z1) / 2, y, colour));
    }
  };
  const parts: BufferGeometry[] = [];
  const stripe = 9;
  for (let i = 0; i * stripe < w; i++) {
    const [x0, x1, colour] = [-w / 2 + i * stripe, -w / 2 + (i + 1) * stripe, i % 2 ? '#2a6630' : '#3f8c3e'];
    dry(x0, x1, -deep, front, 0.02, colour, boxes);
    // Behind each hole, the turf comes forward again to its rounded edge.
    for (const wet of wets) {
      const [a, b] = [Math.max(x0, wet.x0), Math.min(x1, wet.x1)];
      if (b > a) parts.push(turfTo(wet, a, b, 0.04, colour));
    }
  }
  const line = '#dfe8e0';
  const y = 0.06;
  dry(-w / 2, w / 2, front - 1.4, front - 1, y, line);
  dry(-w / 2, w / 2, -deep + 1.8, -deep + 2.2, y, line);
  dry(halfway - 0.2, halfway + 0.2, -deep + 1.2, -1.8, y, line);
  // The centre circle: lying on the turf behind the flooded part of it.
  const middle = -deep * 0.42;
  const radius = 11;
  const sides = 48;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const [cx, cz] = [halfway + Math.cos(a) * radius, middle + Math.sin(a) * radius];
    if (wets.some((wet) => cx > wet.x0 - 0.3 && cx < wet.x1 + 0.3 && cz < wet.near
      && cz > wetEdge(wet, Math.min(wet.x1, Math.max(wet.x0, cx))) - 0.8)) continue;
    const seg = flat(0.4, (Math.PI * 2 * radius) / sides + 0.1, 0, 0, y, line);
    seg.rotateY(-a);
    seg.translate(cx, 0, cz);
    parts.push(seg);
  }
  if (box6) {
    dry(box6.x - box6.long, box6.x, -deep * 0.2 - 0.2, -deep * 0.2 + 0.2, y, line);
    dry(box6.x - box6.long, box6.x, -deep * 0.62 - 0.2, -deep * 0.62 + 0.2, y, line);
    dry(box6.x - box6.long - 0.2, box6.x - box6.long + 0.2, -deep * 0.62, -deep * 0.2, y, line);
  }
  // The cut turf's banks: dark earth from the turf down past the water, round each hole's sides and its rounded back.
  // Its near edge needs none: the water's own cut face is there, and the turf in front hides it.
  for (const wet of wets) parts.push(bankOf(wet));
  return { parts, panes: [] };
}

/** How far down a hole's bank goes: past the water and into its murk. */
const BANK_DOWN = 2.6;
/** Where a hole in the pitch begins towards the camera: where a pool's water is cut (../../render/water.ts, POOL). */
const WET_NEAR = 0.65;
/** How far behind the path a hole is its pit's whole width before it rounds off. */
const WET_PATH = -1.2;
/** A hole in the pitch, in the pitch's own x and z. */
interface Wet { x0: number; x1: number; near: number; path: number; back: number }

/** Where a hole's back edge is at `x`: at the path at its two ends, rounding back to `back` at its middle. */
function wetEdge(wet: Wet, x: number): number {
  const t = ((x - wet.x0) / (wet.x1 - wet.x0)) * 2 - 1;
  return wet.path + (wet.back - wet.path) * Math.sqrt(Math.max(0, 1 - t * t));
}

/** Points along a hole's back edge from `a` to `b`, about every 0.15 EL. */
function edgeAlong(wet: Wet, a: number, b: number): [number, number][] {
  const count = Math.max(1, Math.ceil((b - a) / 0.15));
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / count;
    return [x, wetEdge(wet, x)];
  });
}

/** A flat mesh in one colour from its triangles' corners, each triangle given as it is to face. */
function flatMesh(corners: number[], normals: number[], colour: string): BufferGeometry {
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(corners, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return paint(made, colour);
}

/** The turf behind a hole, from its box's back forward to the hole's rounded edge, between `a` and `b`. */
function turfTo(wet: Wet, a: number, b: number, y: number, colour: string): BufferGeometry {
  const corners: number[] = [], normals: number[] = [];
  const edge = edgeAlong(wet, a, b);
  for (let i = 0; i < edge.length - 1; i++) {
    const [[x0, z0], [x1, z1]] = [edge[i]!, edge[i + 1]!];
    // Wound to face up.
    corners.push(x0, y, wet.back, x0, y, z0, x1, y, wet.back, x1, y, wet.back, x0, y, z0, x1, y, z1);
    for (let k = 0; k < 6; k++) normals.push(0, 1, 0);
  }
  return flatMesh(corners, normals, colour);
}

/** A hole's bank: down its two sides from the front and round its back, seen from inside the hole. */
function bankOf(wet: Wet): BufferGeometry {
  const outline: [number, number][] = [[wet.x0, wet.near], ...edgeAlong(wet, wet.x0, wet.x1), [wet.x1, wet.near]];
  const corners: number[] = [], normals: number[] = [];
  const [top, bottom] = [0.04, 0.04 - BANK_DOWN];
  for (let i = 0; i < outline.length - 1; i++) {
    const [[x0, z0], [x1, z1]] = [outline[i]!, outline[i + 1]!];
    const long = Math.hypot(x1 - x0, z1 - z0);
    if (long < 1e-6) continue;
    // Down its near-left side, along its back and up its right side: the hole is to the left of the way the outline goes.
    const [nx, nz] = [-(z1 - z0) / long, (x1 - x0) / long];
    corners.push(x0, top, z0, x0, bottom, z0, x1, top, z1, x1, top, z1, x0, bottom, z0, x1, bottom, z1);
    for (let k = 0; k < 6; k++) normals.push(nx, 0, nz);
  }
  return flatMesh(corners, normals, '#3a2f24');
}

/** What is left of a rectangle outside another: up to four rectangles. */
function outside(r: { x0: number; x1: number; z0: number; z1: number }, hole: { x0: number; x1: number; z0: number; z1: number }) {
  if (hole.x1 <= r.x0 || hole.x0 >= r.x1 || hole.z1 <= r.z0 || hole.z0 >= r.z1) return [r];
  const out: { x0: number; x1: number; z0: number; z1: number }[] = [];
  if (hole.x0 > r.x0) out.push({ ...r, x1: hole.x0 });
  if (hole.x1 < r.x1) out.push({ ...r, x0: hole.x1 });
  const [x0, x1] = [Math.max(r.x0, hole.x0), Math.min(r.x1, hole.x1)];
  if (hole.z0 > r.z0) out.push({ x0, x1, z0: r.z0, z1: hole.z0 });
  if (hole.z1 < r.z1) out.push({ x0, x1, z0: hole.z1, z1: r.z1 });
  return out;
}

function floodlight(def: BuildingDef) {
  // A floodlight mast, dark in the storm: the power is out. A rack of lamps at its top, high over the stand.
  const h = def.height ?? 110;
  const parts: BufferGeometry[] = [post(0.5, h, 0, 0, 0, '#8a9096', 10)];
  parts.push(box(10, 5, 1.4, 0, h + 1, 0.6, '#5a5e64'));
  for (let i = 0; i < 6; i++) parts.push(box(1.4, 1.4, 0.8, -3.75 + i * 1.5, h + 1.8 - (i % 2) * 2.2, 1.4, '#d8dce0'));
  return { parts, panes: [] };
}

function stand(def: BuildingDef) {
  // A wooden stand: risers taller than he is, plank benches on every step, and a roof on posts.
  const w = def.width ?? 60;
  const steps = 5;
  const rise = def.height ? def.height / steps : 2.7;
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < steps; i++) {
    parts.push(box(w, rise * (i + 1), 4, 0, (rise * (i + 1)) / 2, -i * 4, '#6e6a64'));
    parts.push(box(w, 0.6, 1.6, 0, rise * (i + 1) + 0.3, -i * 4 + 0.6, '#a8784a'));
  }
  for (const x of [-w / 2 + 1, -w / 6, w / 6, w / 2 - 1]) parts.push(post(0.4, rise * steps + 14, x, 0, -steps * 4 + 2, '#5a3a2a'));
  parts.push(box(w + 4, 0.8, steps * 4 + 4, 0, rise * steps + 14, -steps * 2 + 2, '#3c3e44'));
  return { parts, panes: [] };
}

function clubhouse(def: BuildingDef) {
  // The club's house by the pitch: yellow boards, white trim, a door and two windows. No name on it.
  const w = def.width ?? 36;
  const h = def.height ?? 18;
  const d = 20;
  const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0, '#d9b04a'), ...roof(w, 7, d, 0, h, 0, '#3a3c40')];
  parts.push(box(6, 13, 0.5, -w * 0.25, 6.5, d / 2 + 0.3, '#5a3a2a'));
  const panes: BufferGeometry[] = [];
  for (const wx of [w * 0.05, w * 0.3]) {
    parts.push(box(6.4, 5.4, 0.4, wx, h * 0.55, d / 2 + 0.25, '#f0ece2'));
    panes.push(new PlaneGeometry(5.4, 4.4).translate(wx, h * 0.55, d / 2 + 0.5));
  }
  return { parts, panes };
}

function tower(def: BuildingDef) {
  // Flärkenbadet's tower stands on a raft moored in the bay: a dark steel lattice with a ladder and stepped platforms,
  // and no diving board. The raft is square and flat on the water.
  const h = def.height ?? 20;
  const w = def.width ?? 8;
  const steel = '#343a40';
  const rail = '#8a9096';
  const parts: BufferGeometry[] = [];
  parts.push(box(w + 11, 1.1, 11, 0, -2.6, 0, '#4a4e50'), box(w + 11.4, 0.3, 11.4, 0, -2, 0, '#6a6e6c'));
  for (const x of [-w / 2 - 0.6, w / 2 + 0.6]) for (const z of [-3.2, 3.2]) parts.push(post(0.22, h + 2, x, -2, z, steel));
  // The lattice: crossed braces up each side, level by level.
  const levels = Math.max(3, Math.round(h / 1.3));
  const step = h / levels;
  for (let i = 0; i < levels; i++) {
    const y = -2 + i * step * 1.15 + step * 0.55;
    for (const z of [-3.2, 3.2]) {
      const long = Math.hypot(w + 1.2, step);
      const angle = Math.atan2(step, w + 1.2);
      parts.push(tilted(long, 0.14, 0.14, 0, angle, 0, y, z, steel), tilted(long, 0.14, 0.14, 0, -angle, 0, y, z, steel));
    }
    parts.push(box(w + 1.4, 0.12, 0.12, 0, y + step * 0.55, -3.2, steel), box(w + 1.4, 0.12, 0.12, 0, y + step * 0.55, 3.2, steel));
  }
  // The platforms, stepping up, and the white-grey rail round the top.
  parts.push(box(w + 2.2, 0.35, 7.6, 0, h, 0, '#50565c'), box(w * 0.6, 0.3, 7.4, -w * 0.3, h * 0.55, 0, '#50565c'));
  parts.push(box(w + 2.2, 0.16, 0.16, 0, h + 2.4, -3.8, rail));
  for (const x of [-w / 2 - 1, 0, w / 2 + 1]) parts.push(box(0.16, 2.4, 0.16, x, h + 1.2, -3.8, rail));
  // Its ladder.
  for (let y = 0; y < h; y += 1.3) parts.push(box(2, 0.16, 0.2, -w / 2 - 1.4, y, 3.4, rail));
  for (const side of [-0.95, 0.95]) parts.push(box(0.2, h + 2, 0.2, -w / 2 - 1.4 + side, h / 2 - 1, 3.4, rail));
  return { parts, panes: [] };
}

function hut(def: BuildingDef) {
  // The changing hut: honey-brown round logs, each its own, under the deep eaves of a pale grey-blue metal roof.
  const w = def.width ?? 10;
  const h = def.height ?? 15;
  const d = 8;
  const tar = def.tar === true;
  const metal = roof(w, 3, d, 0, h, 0, '#7a8c9a', 0.9);
  const parts: BufferGeometry[] = [box(w - 0.6, h, d - 0.6, 0, h / 2, 0, tar ? '#1e1a18' : '#8a6232'), gable(w - 0.2, 3, d - 0.2, 0, h, 0, tar ? '#26211e' : '#a97a42'), ...metal];
  const tones = tar ? ['#2a2522', '#231f1c', '#302a26'] : ['#b98a4e', '#a97a42', '#c49658'];
  const logs = Math.max(6, Math.round(h / 0.62));
  for (let i = 0; i < logs; i++) {
    const y = (i + 0.5) * (h / logs);
    const r = (h / logs) * 0.54;
    parts.push(paint(new CylinderGeometry(r, r, w + 0.5, 12).rotateZ(Math.PI / 2).translate(0, y, d / 2 - 0.3), tones[i % 3]!));
    parts.push(paint(new CylinderGeometry(r, r, d + 0.5, 12).rotateX(Math.PI / 2).translate(w / 2 - 0.3, y, 0), tones[(i + 1) % 3]!));
    parts.push(paint(new CylinderGeometry(r, r, d + 0.5, 12).rotateX(Math.PI / 2).translate(-w / 2 + 0.3, y, 0), tones[(i + 2) % 3]!));
  }
  // The logs' sawn ends at the front corners: pale end grain with a darker heart, as fresh-cut timber has.
  for (let i = 0; i < logs; i++) {
    const y = (i + 0.5) * (h / logs);
    const r = (h / logs) * 0.54;
    for (const side of [-1, 1]) {
      const x = side * (w / 2 - 0.3);
      parts.push(paint(new CircleGeometry(r * 0.9, 12).translate(x, y, d / 2 + 0.26), tar ? '#4a3e34' : ['#d9b57e', '#cfa86e', '#e0bf8a'][(i + side + 2) % 3]!));
      parts.push(paint(new CircleGeometry(r * 0.38, 10).translate(x, y, d / 2 + 0.27), tar ? '#3a3029' : '#bf955c'));
    }
  }
  // The logs, their ends and the gable have the wood's grain seen close (../../render/bark-detail.ts); not the metal
  // roof, nor the door's upright planks and the window, which are added after.
  for (const part of parts) if (!metal.includes(part)) barky(part, PLANK);
  parts.push(...(def.slider ? hutDoorway(w, h, d, tar, def.slider) : hutDoor(w, h, d, tar)));
  // A small window beside the door, high up, in a white frame with a cross of glazing bars: on the left where the
  // door slides open to the right over the wall.
  const panes: BufferGeometry[] = [];
  const front = d / 2 - 0.3 + (h / logs) * 0.54;
  const wx = w * (def.slider ? -0.32 : 0.32);
  const wy = h * 0.6;
  parts.push(box(0.98, 0.84, 0.12, wx, wy, front + 0.04, '#e9e5da'));
  parts.push(box(0.06, 0.6, 0.06, wx, wy, front + 0.16, '#e9e5da'), box(0.74, 0.06, 0.06, wx, wy, front + 0.16, '#e9e5da'));
  parts.push(box(1.12, 0.1, 0.22, wx, wy - 0.45, front + 0.1, '#d6d1c4'));
  panes.push(new PlaneGeometry(0.74, 0.6).translate(wx, wy, front + 0.11));
  return { parts, panes };
}

/**
 * A changing hut's door (the graphics pass of 6 November 2026; Olov: "finare byggnader"): upright planks with dark
 * gaps between them, held by a Z of braces, black strap hinges on the left, an iron handle on the right, in a
 * white casing, over a worn sill board. It stands no further out than the flat door it replaced.
 */
function hutDoor(w: number, h: number, d: number, tar: boolean): BufferGeometry[] {
  const dw = w * 0.36;
  const dh = h * 0.7;
  const z = d / 2 + 0.3;
  const parts: BufferGeometry[] = [box(dw, dh, 0.1, 0, dh / 2, z - 0.05, '#20160d')];
  const planks = Math.max(4, Math.round(dw / 0.42));
  const tones = tar ? ['#4a3a2c', '#41332a', '#524233'] : ['#7a5532', '#6c4a2a', '#835c37', '#71502d'];
  for (let i = 0; i < planks; i++) {
    const x = -dw / 2 + (i + 0.5) * (dw / planks);
    parts.push(box(dw / planks - 0.05, dh - 0.04, 0.14, x, dh / 2, z + 0.07, tones[i % tones.length]!));
  }
  const brace = tar ? '#5a4836' : '#8c6640';
  for (const y of [dh * 0.17, dh * 0.83]) parts.push(box(dw - 0.14, 0.22, 0.08, 0, y, z + 0.18, brace));
  const run = dw - 0.34;
  const rise = dh * 0.66;
  parts.push(tilted(Math.hypot(run, rise), 0.2, 0.08, 0, Math.atan2(rise, run), 0, dh / 2, z + 0.18, brace));
  // Strap hinges from the hinge side along each brace, and a ring handle on the latch side.
  for (const y of [dh * 0.17, dh * 0.83]) parts.push(box(dw * 0.42, 0.08, 0.04, -dw / 2 + dw * 0.21, y, z + 0.24, '#1d1d1f'));
  parts.push(box(0.14, 0.3, 0.04, dw / 2 - 0.26, dh * 0.5, z + 0.24, '#1d1d1f'));
  parts.push(paint(new TorusGeometry(0.1, 0.025, 6, 12).translate(dw / 2 - 0.26, dh * 0.5 - 0.1, z + 0.26), '#1d1d1f'));
  // The casing, and the sill board worn pale.
  const trim = '#e9e5da';
  parts.push(box(0.2, dh + 0.2, 0.16, -dw / 2 - 0.1, (dh + 0.2) / 2, z + 0.04, trim), box(0.2, dh + 0.2, 0.16, dw / 2 + 0.1, (dh + 0.2) / 2, z + 0.04, trim));
  parts.push(box(dw + 0.6, 0.22, 0.2, 0, dh + 0.1, z + 0.06, trim));
  parts.push(box(dw + 0.5, 0.12, 0.42, 0, 0.06, z + 0.06, tar ? '#5b5650' : '#a58a66'));
  return parts;
}

/**
 * A changing hut's doorway whose door slides (Flärken's second hut, whose door bangs in the wind): the dark inside, the
 * white casing and the worn sill as `hutDoor` has them, and an iron rail along the front over the door, from beside
 * the doorway to past the hut's corner. The door's top is at `top` shut, and the rail rises `rise` over its width, as
 * the door does on it (the mover 'hut-door'). The door hangs in front of the casing, at the play plane.
 */
function hutDoorway(w: number, h: number, d: number, tar: boolean, slider: { top: number; rise: number }): BufferGeometry[] {
  const dw = w * 0.36;
  const dh = h * 0.7;
  const z = d / 2 + 0.3;
  const parts: BufferGeometry[] = [box(dw, dh, 0.1, 0, dh / 2, z - 0.05, '#120c07')];
  // The inside, dimly: a bench along the back wall and a hook board.
  parts.push(box(dw * 0.9, 0.12, 0.3, 0, dh * 0.24, z - 0.2, tar ? '#2c2520' : '#3a2a1a'));
  parts.push(box(dw * 0.7, 0.1, 0.06, 0, dh * 0.72, z - 0.12, tar ? '#2c2520' : '#3a2a1a'));
  const trim = '#e9e5da';
  parts.push(box(0.2, dh + 0.2, 0.16, -dw / 2 - 0.1, (dh + 0.2) / 2, z + 0.04, trim), box(0.2, dh + 0.2, 0.16, dw / 2 + 0.1, (dh + 0.2) / 2, z + 0.04, trim));
  parts.push(box(dw + 0.6, 0.22, 0.2, 0, dh + 0.1, z + 0.06, trim));
  parts.push(box(dw + 0.5, 0.12, 0.42, 0, 0.06, z + 0.06, tar ? '#5b5650' : '#a58a66'));
  // The rail, on brackets into the logs: from the doorway's left to a stop past the hut's right corner.
  const from = -dw / 2 - 0.2, to = Math.min(w / 2 + 0.35, dw * 1.5 + 0.25);
  const railAt = (x: number) => slider.top + 0.16 + (slider.rise * x) / dw;
  const run = to - from, lift = railAt(to) - railAt(from);
  parts.push(tilted(Math.hypot(run, lift), 0.09, 0.09, 0, Math.atan2(lift, run), (from + to) / 2, (railAt(from) + railAt(to)) / 2, z + 0.12, '#2a2a2c'));
  for (const x of [from + 0.1, (from + to) / 2, to - 0.1]) parts.push(box(0.1, 0.22, 0.3, x, railAt(x) + 0.02, z - 0.02, '#232325'));
  // A rubber stop at each end, where it bangs.
  for (const x of [from + 0.02, to - 0.02]) parts.push(box(0.12, 0.2, 0.16, x, railAt(x), z + 0.12, '#151515'));
  return parts;
}

/** How wide a birch's stem is at a height: 1.6 at its foot, 0.9 at its top. */
const stemAt = (y: number, h: number) => 1.6 + ((0.9 - 1.6) * y) / h;

/**
 * A dark mark on a birch's bark: a thin lens across the stem, pointed at both ends. It follows the round of the stem
 * just over its surface, so it stays inside the stem's outline at any size.
 */
function barkMark(h: number, y: number, middle: number, wide: number, tall: number, colour: string): BufferGeometry {
  const g = new BufferGeometry();
  const position: number[] = [];
  const normal: number[] = [];
  const index: number[] = [];
  const rows = 6;
  for (let k = 0; k <= rows; k++) {
    const a = middle + (k / rows - 0.5) * wide;
    const half = (Math.sin((k / rows) * Math.PI) * tall) / 2;
    for (const side of [-1, 1]) {
      const at = y + side * half;
      const r = stemAt(at, h) + 0.02;
      position.push(Math.sin(a) * r, at, Math.cos(a) * r);
      normal.push(Math.sin(a), 0, Math.cos(a));
    }
    if (k < rows) index.push(k * 2, k * 2 + 2, k * 2 + 1, k * 2 + 1, k * 2 + 2, k * 2 + 3);
  }
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(normal, 3));
  g.setIndex(index);
  return paint(g, colour);
}

function birch(def: BuildingDef) {
  // A birch: white bark with dark marks across it, thick and many towards its dark foot, and a thin crown of
  // October's last yellow leaves. The stem has rows enough for its foot to darken gradually.
  const h = def.height ?? 70;
  const stem = paint(new CylinderGeometry(0.9, 1.6, h, 18, 36).translate(0, h / 2, 0), '#e8e6de');
  const shade = stem.getAttribute('color');
  const up = stem.getAttribute('position');
  for (let i = 0; i < up.count; i++) {
    const foot = Math.max(0, 1 - up.getY(i) / 6);
    const light = 1 - 0.72 * foot * foot;
    shade.setXYZ(i, shade.getX(i) * light, shade.getY(i) * light * 0.97, shade.getZ(i) * light * 0.93);
  }
  const parts: BufferGeometry[] = [stem];
  let seed = Math.abs(Math.round(def.x * 7 + def.z * 3)) + 11;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // Long and thin: a wide short mark reads as an eye in the stem.
  for (let y = 0.6; y < h * 0.62; y += 0.3 + next() * (y < 12 ? 0.55 : 1.3)) {
    const low = Math.max(0, 1 - y / 14);
    parts.push(barkMark(h, y, (next() - 0.5) * 2.6, 0.4 + next() * (0.8 + low * 0.5), 0.08 + next() * (0.1 + low * 0.1), next() < 0.7 ? '#2a2622' : '#4a443c'));
  }
  for (const [x, y, s] of [[0, h, 14], [-8, h * 0.85, 10], [8, h * 0.82, 11], [-4, h * 0.7, 8], [5, h * 0.66, 7]] as const) {
    parts.push(paint(new SphereGeometry(s, 9, 6).scale(1, 0.75, 0.6).translate(x, y, -2), '#b89838'));
  }
  return { parts, panes: [] };
}

function spruce(def: BuildingDef) {
  // A spruce of the forest by the road: a dark narrow cone in tiers, drooping, its trunk showing at the foot.
  const h = def.height ?? 60;
  const parts: BufferGeometry[] = [paint(new CylinderGeometry(0.5, 1.1, h * 0.3, 7).translate(0, h * 0.15, 0), '#4a3a2c')];
  // Many tiers, each hanging in points at its edge: a spruce's boughs, not a stack of cones.
  const tiers = 11;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (h * 0.21) * (1 - t * 0.9);
    const tall = h * 0.15;
    const tier = new ConeGeometry(r, tall, 14, 1, true).toNonIndexed();
    const at = tier.getAttribute('position');
    for (let v = 0; v < at.count; v++) {
      if (at.getY(v) > 0) continue;
      const a = Math.atan2(at.getZ(v), at.getX(v));
      const k = Math.round(((a + Math.PI) / (Math.PI * 2)) * 14) % 2;
      at.setXYZ(v, at.getX(v) * (k ? 1.08 : 0.62), at.getY(v) - (k ? 0.14 : 0) * tall, at.getZ(v) * (k ? 1.08 : 0.62));
    }
    tier.computeVertexNormals();
    parts.push(paint(tier.translate(0, h * 0.2 + t * h * 0.72 + tall / 2, 0), i % 3 === 0 ? '#1d3829' : i % 3 === 1 ? '#254531' : '#1a3226'));
  }
  return { parts, panes: [] };
}

/** How long the model of the car is, in the metres it is made in (art/blender/a2-props.py, build_leaf). */
const CAR_LONG = 4.5;

function car(def: BuildingDef) {
  // The family's car, a silver electric hatchback as theirs is (Olov, 7 November 2026): no badge, no plate, only its
  // shape. This stands in until the model from Blender (art/blender/a2-props.py, build_leaf) has come.
  const w = def.width ?? 29;
  const side = (x: number) => x * w;
  // Its side, drawn once and pushed out to its width: low nose, raked windscreen, a roof that slopes to the tailgate.
  const shape = new Shape();
  shape.moveTo(side(-0.5), 2.4);
  shape.quadraticCurveTo(side(-0.505), 4.4, side(-0.495), 5.6);
  shape.quadraticCurveTo(side(-0.48), 7.6, side(-0.42), 8.8);
  shape.quadraticCurveTo(side(-0.34), 10.2, side(-0.22), 10.6);
  shape.lineTo(side(0.06), 10.5);
  shape.quadraticCurveTo(side(0.14), 10.3, side(0.19), 9.2);
  shape.lineTo(side(0.28), 7.1);
  shape.quadraticCurveTo(side(0.4), 6.6, side(0.48), 5.9);
  shape.quadraticCurveTo(side(0.51), 5, side(0.5), 2.4);
  shape.closePath();
  const body = new ExtrudeGeometry(shape, { depth: 11, bevelEnabled: true, bevelSize: 0.45, bevelThickness: 0.5, bevelSegments: 2, curveSegments: 8 }).translate(0, 0, -5.5);
  const parts: BufferGeometry[] = [paint(body.toNonIndexed(), '#b0b5ba')];
  const NEAR = 6.03;
  const dark = '#1a1d22';
  // The dark sill, and the seams of its doors, on the side that shows.
  parts.push(box(w * 0.94, 0.9, 0.08, 0, 2.5, NEAR, dark));
  for (const x of [-0.15, 0.07]) parts.push(box(0.14, 6.6, 0.06, side(x), 6, NEAR, '#7d838a'));
  for (const x of [-0.11, 0.11]) parts.push(box(1.4, 0.3, 0.1, side(x), 7.3, NEAR, '#8a929c'));
  // Wheels in their arches: a dark arch, a tyre, a pale rim and its hub.
  for (const x of [-0.31, 0.32]) {
    parts.push(paint(new CircleGeometry(3.3, 20).translate(side(x), 2.9, NEAR + 0.01), dark));
    for (const z of [-5.2, 5.2]) parts.push(paint(new CylinderGeometry(2.7, 2.7, 1.8, 20).rotateX(Math.PI / 2).translate(side(x), 2.7, z), '#14161a'));
    parts.push(paint(new CylinderGeometry(1.5, 1.5, 0.3, 16).rotateX(Math.PI / 2).translate(side(x), 2.7, 6.2), '#9aa2ac'));
    parts.push(paint(new CylinderGeometry(0.5, 0.5, 0.36, 10).rotateX(Math.PI / 2).translate(side(x), 2.7, 6.26), '#4a5058'));
  }
  // A lamp at the nose and one at the tail.
  parts.push(box(1.6, 1, 0.1, side(0.46), 5.4, NEAR, '#d6d8cc'), box(0.9, 2.2, 0.1, side(-0.485), 6.6, NEAR, '#6e2a24'));
  // Its side windows, where the model's are (art/blender/a2-props.py), in the car's own metres.
  const metre = w / CAR_LONG;
  const pane = (points: readonly (readonly [number, number])[]) => {
    const glass = new Shape();
    glass.moveTo(points[0]![0] * metre, points[0]![1] * metre);
    for (const [x, y] of points.slice(1)) glass.lineTo(x * metre, y * metre);
    glass.closePath();
    return new ShapeGeometry(glass).translate(0, 0, NEAR + 0.02);
  };
  // The two doors' windows (the pillar behind them is dark, not glass).
  const panes = [
    pane([[-1.3, 1.05], [-1.3, 1.4], [-0.38, 1.42], [-0.38, 0.96]]),
    pane([[-0.3, 0.96], [-0.3, 1.42], [0.3, 1.43], [0.99, 1.02], [0.99, 0.95]]),
  ];
  return { parts, panes };
}

function kota(def: BuildingDef) {
  // A timber kåta: a cone of logs with smoke-dark crown.
  const h = def.height ?? 26;
  return { parts: [paint(new ConeGeometry((def.width ?? 22) / 2, h, 12).translate(0, h / 2, 0), '#7a5a3c')], panes: [] };
}

/**
 * Själevad's church as art/blender/a2-buildings.py makes it (`kyrka`; the numbers marked SHARED there): 26 across its
 * corners, the walls' apothem, a window's width, sill and spring (the one over the door sits higher), and the lantern's.
 */
const CHURCH = {
  across: 26, apothem: 13 * Math.cos(Math.PI / 8), wide: 3, sill: 5.2, spring: 11.5, frontSill: 9.6,
  lantern: { apothem: 4, wide: 1.4, sill: 28.5, spring: 30.6 },
} as const;

/** A round-arched pane standing on its sill, facing +z. */
function arched(wide: number, sill: number, spring: number): BufferGeometry {
  const shape = new Shape();
  shape.moveTo(-wide / 2, sill);
  shape.lineTo(wide / 2, sill);
  shape.lineTo(wide / 2, spring);
  shape.absarc(0, spring, wide / 2, 0, Math.PI, false);
  shape.lineTo(-wide / 2, sill);
  return new ShapeGeometry(shape, 6);
}

function church(def: BuildingDef) {
  // Själevad's church far down the lake, as the flashes show it: white, eight-sided with a wall towards the camera, a
  // tent roof, a lantern storey and a small turret with a spire. Until its model has come (art/blender/a2-buildings.py),
  // the same in plain shapes; its windows are the game's own, on the model's walls, in each wall and the lantern's sides.
  const s = (def.width ?? CHURCH.across) / CHURCH.across;
  const r = 13;
  const flat = (geometry: BufferGeometry) => geometry.rotateY(Math.PI / 8);
  const parts: BufferGeometry[] = [paint(flat(new CylinderGeometry(r, r, 18, 8)).translate(0, 9, 0), '#ecebe4')];
  parts.push(paint(flat(new CylinderGeometry(4.6, (CHURCH.apothem + 1.35) / Math.cos(Math.PI / 8), 8.8, 8, 1, true)).translate(0, 22.4, 0), '#2e3238'));
  parts.push(paint(flat(new CylinderGeometry(4.33, 4.33, 6, 8)).translate(0, 29.5, 0), '#ecebe4'));
  parts.push(paint(flat(new ConeGeometry(5.1, 2.3, 8)).translate(0, 33.85, 0), '#2e3238'));
  parts.push(paint(flat(new CylinderGeometry(1.9, 1.9, 2.6, 8)).translate(0, 36.3, 0), '#ecebe4'));
  parts.push(paint(flat(new ConeGeometry(2, 9, 8)).translate(0, 42.1, 0), '#2e3238'));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push(box(1.2, 15, 1.2, Math.sin(a) * r, 9.1, Math.cos(a) * r, '#ffffff'));
  }
  const panes: BufferGeometry[] = [];
  for (let k = 0; k < 8; k++) {
    const turn = (k * Math.PI) / 4;
    panes.push(arched(CHURCH.wide, k === 0 ? CHURCH.frontSill : CHURCH.sill, CHURCH.spring).translate(0, 0, CHURCH.apothem + 0.025).rotateY(turn));
    const lantern = CHURCH.lantern;
    panes.push(arched(lantern.wide, lantern.sill, lantern.spring).translate(0, 0, lantern.apothem + 0.025).rotateY(turn));
  }
  for (const part of [...parts, ...panes]) part.scale(s, s, s);
  return { parts, panes };
}

function bridge(def: BuildingDef) {
  // A road bridge over the river: a deck on two piers, a railing, the river running under it.
  const w = def.width ?? 60;
  const h = def.height ?? 14;
  const parts: BufferGeometry[] = [box(w, 2.4, 10, 0, h, 0, '#7a7e84')];
  for (const x of [-w / 2 + 6, w / 2 - 6]) parts.push(box(4, h, 8, x, h / 2, 0, '#8a8c8e'));
  for (let x = -w / 2; x <= w / 2; x += 2.5) parts.push(box(0.25, 2.2, 0.25, x, h + 2.3, 4.6, '#3c3e42'));
  parts.push(box(w, 0.3, 0.3, 0, h + 3.4, 4.6, '#3c3e42'));
  return { parts, panes: [] };
}

function woodshed(def: BuildingDef) {
  // A woodshed with an open front and the winter's firewood stacked in it, split ends showing.
  const w = def.width ?? 18;
  const h = def.height ?? 13;
  const d = 10;
  const parts: BufferGeometry[] = [box(w, h, 0.6, 0, h / 2, -d / 2, '#7a3428'), ...roof(w, 3, d, 0, h, 0, '#5a4a3c', 0.6)];
  for (const x of [-w / 2, w / 2]) parts.push(box(0.6, h, d, x, h / 2, 0, '#7a3428'));
  // Round logs, each a little its own: bark, and the pale sawn end with its darker ring.
  let seed = 41;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let row = 0; row < 7; row++) {
    for (let i = 0; i < Math.floor(w / 1.4) - 1; i++) {
      const r = 0.52 + next() * 0.14;
      const x = -w / 2 + 1.4 + i * 1.4 + (row % 2) * 0.7 + (next() - 0.5) * 0.12;
      const y = 0.7 + row * 1.2 + (next() - 0.5) * 0.08;
      const end = d * 0.4 + (next() - 0.5) * 0.3;
      parts.push(paint(new CylinderGeometry(r, r, d * 0.8, 11).rotateX(Math.PI / 2).translate(x, y, 0), next() < 0.5 ? '#4e3a2c' : '#5e4636'));
      parts.push(paint(new CircleGeometry(r * 0.97, 11).translate(x, y, end + 0.03), next() < 0.5 ? '#c9a978' : '#b99a6c'));
      parts.push(paint(new CircleGeometry(r * 0.62, 9).translate(x, y, end + 0.05), '#a98a5e'));
    }
  }
  return { parts, panes: [] };
}

function rowboat(def: BuildingDef) {
  // A rowing boat turned over on two trestles for the winter, a tarp half over it.
  const w = def.width ?? 26;
  const parts: BufferGeometry[] = [];
  for (const x of [-w * 0.3, w * 0.3]) {
    for (const z of [-2.4, 2.4]) parts.push(box(0.5, 6, 0.5, x, 3, z, '#6a5442'));
    parts.push(box(1, 0.6, 6, x, 6, 0, '#6a5442'));
  }
  parts.push(paint(new SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(w / 2, 3.4, 4).translate(0, 6.3, 0), '#e6e2d6'));
  parts.push(box(w * 0.5, 0.3, 8.6, w * 0.12, 9.4, 0, '#3a5a7a'));
  return { parts, panes: [] };
}

function swings(def: BuildingDef) {
  // A swing set: an A-frame each side, a top bar, and two seats on chains.
  const w = def.width ?? 22;
  const h = def.height ?? 16;
  const parts: BufferGeometry[] = [box(w, 0.6, 0.6, 0, h, 0, '#3a6a8a')];
  for (const x of [-w / 2, w / 2]) for (const z of [-1.5, 1.5]) parts.push(tilted(0.5, h * 1.02, 0.5, z > 0 ? 0.18 : -0.18, 0, x, h / 2, z, '#3a6a8a'));
  for (const x of [-w / 4, w / 4]) {
    for (const z of [-0.6, 0.6]) parts.push(box(0.1, h - 4, 0.1, x, (h + 4) / 2, z, '#9a9ea4'));
    parts.push(box(3, 0.4, 1.6, x, 4, 0, '#d8a038'));
  }
  return { parts, panes: [] };
}

function slide(def: BuildingDef) {
  // The water slide: rust-red steel, its ladder up to a little platform, and the chute running down.
  const h = def.height ?? 10;
  const w = def.width ?? 16;
  const steel = '#7c4436';
  const parts: BufferGeometry[] = [box(3, 0.4, 3, -w / 2 + 1.5, h, 0, steel)];
  for (const z of [-1.4, 1.4]) parts.push(box(0.26, h, 0.26, -w / 2, h / 2, z, steel), box(0.26, h, 0.26, -w / 2 + 3, h / 2, z, steel));
  for (let y = 1.2; y < h; y += 1.4) parts.push(box(0.2, 0.18, 2.8, -w / 2, y, 0, '#8a9096'));
  const run = Math.hypot(w - 3, h);
  const angle = -Math.atan2(h, w - 3);
  parts.push(tilted(run, 0.3, 2.4, 0, angle, 1.5, h / 2, 0, '#945040'));
  for (const z of [-1.2, 1.2]) parts.push(tilted(run, 0.7, 0.2, 0, angle, 1.5, h / 2 + 0.25, z, steel));
  return { parts, panes: [] };
}

function chess(def: BuildingDef) {
  // Giant chess on its gravel pad: black and white squares, and a few pieces standing as the game was left.
  const size = def.width ?? 14;
  const n = 8;
  const cell = size / n;
  const parts: BufferGeometry[] = [box(size + 1.6, 0.2, size + 1.6, 0, 0.1, 0, '#8a8478')];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    parts.push(box(cell, 0.1, cell, -size / 2 + (i + 0.5) * cell, 0.24, -size / 2 + (j + 0.5) * cell, (i + j) % 2 ? '#e6e2d6' : '#26282c'));
  }
  const piece = (x: number, z: number, colour: string, tall: number) => {
    parts.push(paint(new CylinderGeometry(cell * 0.26, cell * 0.36, tall, 12).translate(x, 0.3 + tall / 2, z), colour));
    parts.push(paint(new SphereGeometry(cell * 0.24, 12, 8).translate(x, 0.3 + tall + cell * 0.1, z), colour));
  };
  for (const [i, j, tall] of [[1, 1, 2.2], [2, 5, 1.6], [4, 2, 2.8], [6, 6, 1.6], [5, 4, 2.2], [3, 6, 2.8]] as const) {
    piece(-size / 2 + (i + 0.5) * cell, -size / 2 + (j + 0.5) * cell, (i + j) % 2 ? '#26282c' : '#e6e2d6', tall);
  }
  return { parts, panes: [] };
}

function sunboard(def: BuildingDef) {
  // The bathing place's painted board: the lake, the ridge and a smiling wooden sun. No word on it.
  const w = def.width ?? 12;
  const h = def.height ?? 8;
  const parts: BufferGeometry[] = [box(w + 0.8, h + 0.8, 0.5, 0, h / 2 + 5, -0.1, '#6a4a2c'), box(w, h * 0.45, 0.3, 0, 5 + h * 0.225, 0.2, '#3f6a8a')];
  parts.push(box(w, h * 0.55, 0.3, 0, 5 + h * 0.725, 0.2, '#b8d0dc'), box(w, h * 0.16, 0.34, 0, 5 + h * 0.5, 0.2, '#3a5a40'));
  for (const x of [-w / 2 + 0.6, w / 2 - 0.6]) parts.push(post(0.3, 5.4, x, 2.7, -0.3, '#5a3e22'));
  const sun = { x: w * 0.22, y: 5 + h * 0.74, r: h * 0.17 };
  parts.push(paint(new CircleGeometry(sun.r, 16).translate(sun.x, sun.y, 0.4), '#d9a84e'));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    parts.push(box(sun.r * 0.5, sun.r * 0.14, 0.05, sun.x + Math.cos(a) * sun.r * 1.35, sun.y + Math.sin(a) * sun.r * 1.35, 0.4, '#d9a84e').rotateZ(0));
  }
  parts.push(box(sun.r * 0.16, sun.r * 0.16, 0.05, sun.x - sun.r * 0.34, sun.y + sun.r * 0.2, 0.46, '#3a2a1c'), box(sun.r * 0.16, sun.r * 0.16, 0.05, sun.x + sun.r * 0.34, sun.y + sun.r * 0.2, 0.46, '#3a2a1c'));
  parts.push(paint(new TorusGeometry(sun.r * 0.46, sun.r * 0.06, 6, 12, Math.PI).rotateZ(Math.PI).translate(sun.x, sun.y - sun.r * 0.04, 0.46), '#3a2a1c'));
  return { parts, panes: [] };
}

function picnic(def: BuildingDef) {
  // A picnic table with its benches, grey wood, a little bigger than his house to him.
  const w = def.width ?? 12;
  const h = def.height ?? 5;
  const parts: BufferGeometry[] = [box(w, 0.5, 4.6, 0, h, 0, '#8a8478')];
  for (const z of [-3.8, 3.8]) parts.push(box(w, 0.4, 1.6, 0, h * 0.6, z, '#8a8478'));
  for (const x of [-w / 2 + 1.5, w / 2 - 1.5]) parts.push(tilted(0.5, h * 1.3, 0.5, 0.5, 0, x, h * 0.5, 0, '#6a6458'), tilted(0.5, h * 1.3, 0.5, -0.5, 0, x, h * 0.5, 0, '#6a6458'));
  return { parts, panes: [] };
}

function volleyball(def: BuildingDef) {
  // A volleyball net between two posts, sagging in the wind.
  const w = def.width ?? 60;
  const h = def.height ?? 16;
  const parts: BufferGeometry[] = [];
  for (const z of [-w / 2, w / 2]) parts.push(post(0.35, h + 2, 0, 0, z, '#d8dcdc'));
  parts.push(box(0.2, 0.5, w, 0, h, 0, '#f4f4f0'));
  for (let k = 0; k < 6; k++) parts.push(box(0.08, 0.08, w, 0, h - 0.6 - k * 0.9, 0, '#d0d0cc'));
  for (let z = -w / 2; z <= w / 2; z += 1.2) parts.push(box(0.06, 5, 0.06, 0, h - 2.7, z, '#d0d0cc'));
  return { parts, panes: [] };
}

function lodge(def: BuildingDef) {
  // A beaver's lodge: a heap of gnawed sticks and mud on the bank, sticks poking every way.
  const w = def.width ?? 24;
  const h = def.height ?? 9;
  const parts: BufferGeometry[] = [paint(new SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(w / 2, h, w / 3), '#5a4632')];
  // Layer on layer of gnawed sticks over the dome, each lying its own way, their cut ends pale.
  const STICKS = 90;
  for (let i = 0; i < STICKS; i++) {
    const a = 0.12 + (i * 2.4) % (Math.PI - 0.24);
    const up = (i % 9) / 9;
    const long = 4 + (i % 5) * 1.3;
    const lean = ((i * 7) % 11) / 11 * 2.4 - 1.2;
    const x = Math.cos(a) * (w / 2) * Math.cos(up * 1.2);
    const y = h * Math.sin(up * 1.2) + 0.5;
    const z = (w / 3) * Math.cos(up * 1.2) * Math.sin(a) + 0.2;
    parts.push(paint(new CylinderGeometry(0.18, 0.26, long, 5).rotateZ(lean).translate(x, y, z), i % 3 === 0 ? '#7a6248' : '#4a3a2a'));
    if (i % 3 === 0) parts.push(paint(new SphereGeometry(0.2, 5, 4).translate(x - Math.sin(lean) * long / 2, y + Math.cos(lean) * long / 2, z), '#c2a678'));
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    parts.push(paint(new CylinderGeometry(0.25, 0.3, w * 0.5, 5).rotateZ(Math.PI / 2 - a + 0.3 * Math.sin(i)).translate(Math.cos(a) * w * 0.3, Math.sin(a) * h * 0.8, (i % 3 - 1) * 2), '#8a6a48'));
  }
  return { parts, panes: [] };
}

function gardenset(def: BuildingDef) {
  // The garden table and its chairs under a green tarp for the winter, its legs showing under the hem.
  const w = def.width ?? 9.2;
  const parts: BufferGeometry[] = [box(w, 1.8, 5, 0, 2.3, 0, '#4c6650'), box(w * 0.9, 1.2, 4.4, 0, 3.6, 0, '#4c6650')];
  for (const x of [-w * 0.37, w * 0.37]) for (const z of [-1.6, 1.6]) parts.push(box(0.44, 1.4, 0.44, x, 0.7, z, '#8a6a4a'));
  return { parts, panes: [] };
}

function mailbox(def: BuildingDef) {
  // A plain mailbox on its post by the road: no name, no number.
  const h = def.height ?? 8;
  const parts: BufferGeometry[] = [box(0.6, h, 0.6, 0, h / 2, 0, '#5a4a3c'), box(3.2, 2.2, 2, 0, h + 1.1, 0, '#e8e4da'), box(0.2, 1.2, 0.4, 1.7, h + 1.8, 0, '#c8372a')];
  return { parts, panes: [] };
}

/** A lump of granite: faceted, a little uneven, its corners pushed about by a seeded hash so no two are alike. */
export function rock(seed: number, sx: number, sy: number, sz: number): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 1);
  const at = geometry.getAttribute('position');
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    const n = Math.sin((x * 12.9898 + y * 78.233 + z * 37.719 + seed) * 43758.5453);
    const k = 0.86 + 0.22 * (n - Math.floor(n));
    at.setXYZ(i, x * k * sx, Math.max(y * k, -0.55) * sy, z * k * sz);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function cliff(def: BuildingDef) {
  // A face of Billaberget: grey granite in great lumps, stacked and leaning, lichen-pale at the top.
  const w = def.width ?? 16;
  const h = def.height ?? 12;
  const parts: BufferGeometry[] = [];
  const n = Math.max(3, Math.round(w / 3.2));
  for (let i = 0; i < n; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / n;
    const tall = h * (0.55 + 0.45 * Math.abs(Math.sin(i * 2.3 + 1)));
    parts.push(paint(rock(i * 7 + 3, w / n * 0.75, tall / 2, 3.2).translate(x, tall / 2, 0), i % 2 ? '#8a8d93' : '#7d8087'));
    parts.push(paint(rock(i * 7 + 5, w / n * 0.5, 0.9, 2.2).translate(x + 0.6, tall - 0.2, 0.6), '#a4a89a'));
  }
  return { parts, panes: [] };
}

function jettyArm(def: BuildingDef) {
  // The other leg of Flärken's L: a pontoon jetty low on the water, running out behind the path, with a life ring on a post.
  const long = def.width ?? 22;
  const wide = 4;
  const parts: BufferGeometry[] = [];
  for (let z = 0, i = 0; z < long; z += 0.9, i++) parts.push(box(wide, 0.16, 0.8, 0, 0.1, -z - 0.45, i % 3 === 0 ? '#74746a' : i % 3 === 1 ? '#6a6a60' : '#7c7c70'));
  for (const side of [-1, 1]) parts.push(box(0.24, 0.3, long, side * (wide / 2 - 0.3), -0.1, -long / 2, '#3e3e38'));
  for (let z = 3; z < long; z += 6) parts.push(box(wide - 0.5, 0.8, 3.2, 0, -0.52, -z, '#2c3036'));
  for (const z of [long * 0.45, long - 0.5]) for (const side of [-1, 1]) parts.push(paint(new CylinderGeometry(0.13, 0.15, 2.2, 8).translate(side * (wide / 2 - 0.1), 0.9, -z), '#54504a'));
  // The life ring on the last post, white with dark bands.
  parts.push(paint(new TorusGeometry(0.62, 0.17, 8, 18).translate(wide / 2 - 0.1, 1.3, -long + 0.32), '#e4e0d6'));
  for (const a of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) parts.push(box(0.26, 0.38, 0.38, wide / 2 - 0.1 + Math.cos(a) * 0.62, 1.3 + Math.sin(a) * 0.62, -long + 0.32, '#8a3a30'));
  return { parts, panes: [] };
}

function pole(def: BuildingDef) {
  // A country road's wooden power pole, with a lamp on an arm, and its wires on to the next one, sagging across the sky.
  const h = def.height ?? 26;
  const span = def.width ?? 40;
  const wood = '#7a6048';
  const parts: BufferGeometry[] = [paint(new CylinderGeometry(0.4, 0.62, h, 8).translate(0, h / 2, 0), wood), box(7.5, 0.5, 0.5, 0, h - 1.1, 0, wood)];
  parts.push(box(4.4, 0.26, 0.26, 2.2, h - 4.4, 1, '#54585e'), box(1.8, 0.42, 0.8, 4.4, h - 4.6, 1, '#2a2c30'));
  const LINKS = 14;
  const sagged = (t: number) => h - 0.7 - 4 * t * (1 - t) * 2.4;
  for (const z of [-3.4, 0, 3.4]) {
    for (let i = 0; i < LINKS; i++) {
      const [a, b] = [i / LINKS, (i + 1) / LINKS];
      const [dx, dy] = [span * (b - a), sagged(b) - sagged(a)];
      parts.push(tilted(Math.hypot(dx, dy) + 0.04, 0.09, 0.09, 0, Math.atan2(dy, dx), span * (a + b) / 2, (sagged(a) + sagged(b)) / 2, z, '#2a2e36'));
    }
  }
  // Its lamp's glass, under the head, where the model's lamp is (art/blender/a2-buildings.py, `POLE`): made 19 high.
  const panes = [new PlaneGeometry(1.5, 0.7).rotateX(Math.PI / 2).translate(4.4, 19 - 4.83, 1).scale(h / 19, h / 19, h / 19)];
  return { parts, panes };
}

function trestleTable(def: BuildingDef) {
  // A plain table on two trestles, the club's for its kit: open underneath, so that he is seen as he runs under it.
  const w = def.width ?? 4;
  const h = def.height ?? 1.1;
  const parts: BufferGeometry[] = [box(w, 0.14, 2.2, 0, h - 0.07, -0.2, '#8a7458')];
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) for (const z of [-1.2, 0.8]) parts.push(box(0.14, h, 0.14, x, h / 2, z, '#6a5640'));
  return { parts, panes: [] };
}

/**
 * Olympia's store as art/blender/a2-buildings.py makes it (`kiosk`; the numbers marked SHARED there): its width, depth and
 * walls' height, and its serving hatch's middle, width, sill and head.
 */
const STORE = { wide: 22, deep: 9, high: 11, hatch: { x: -2.4, wide: 11.6, sill: 4, head: 7.8 } } as const;

function store(def: BuildingDef) {
  // Olympia's little store: red boards under broad white trim, and a red-and-white striped awning over its counter. Until
  // its model has come (art/blender/a2-buildings.py), the same in plain shapes; the hatch's glass is the game's own.
  const s = (def.width ?? STORE.wide) / STORE.wide;
  const w = STORE.wide;
  const h = STORE.high;
  const d = STORE.deep;
  const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0, '#6e2622'), gable(w, 3.4, d, 0, h, 0, '#6e2622'), ...roof(w, 3.4, d, 0, h, 0, '#3a3e44')];
  const { x: hx, wide, sill, head } = STORE.hatch;
  const door = { x: 7.3, wide: 2.6, high: 8 };
  for (let x = -w / 2 + 0.9; x < w / 2; x += 1.2) {
    if (Math.abs(x - hx) < wide / 2 + 0.6 || Math.abs(x - door.x) < door.wide / 2 + 0.5) continue;
    parts.push(box(0.2, h - 0.4, 0.08, x, h / 2, d / 2 + 0.04, '#541c1a'));
  }
  // The white trim: under the eaves, at the corners, and the casing round the hatch, its glass in the wall.
  parts.push(box(w + 0.3, 0.9, 0.16, 0, h - 0.45, d / 2 + 0.08, '#e4e0d6'));
  for (const x of [-w / 2 + 0.24, w / 2 - 0.24]) parts.push(box(0.72, h, 0.28, x, h / 2, d / 2 + 0.1, '#e4e0d6'));
  for (const x of [hx - wide / 2 - 0.21, hx + wide / 2 + 0.21]) parts.push(box(0.42, head - sill + 0.5, 0.16, x, (sill + head) / 2 + 0.16, d / 2 + 0.08, '#e4e0d6'));
  parts.push(box(wide, 0.42, 0.16, hx, head + 0.21, d / 2 + 0.08, '#e4e0d6'));
  parts.push(box(wide + 1.4, 0.32, 1.3, hx, sill - 0.16, d / 2 + 0.65, '#d8d2c4'));
  // The door, and the awning: one sloping stripe after the other.
  parts.push(box(door.wide + 0.76, door.high + 0.38, 0.16, door.x, (door.high + 0.38) / 2, d / 2 + 0.08, '#e4e0d6'), box(door.wide, door.high - 0.8, 0.2, door.x, (door.high + 0.8) / 2, d / 2 + 0.1, '#3c4844'));
  const STRIPES = 12;
  for (let i = 0; i < STRIPES; i++) {
    const stripe = (wide + 1.4) / STRIPES;
    parts.push(tilted(stripe, 0.12, 2.8, 0.45, 0, hx - (wide + 1.4) / 2 + (i + 0.5) * stripe, head + 0.5, d / 2 + 1.3, i % 2 ? '#ebe5d8' : '#a3302b'));
  }
  const panes = [new PlaneGeometry(wide, head - sill).translate(hx, (sill + head) / 2, d / 2 + 0.025)];
  for (const part of [...parts, ...panes]) part.scale(s, s, s);
  return { parts, panes };
}

const BUILD: Record<BuildingDef['kind'], (def: BuildingDef) => { parts: BufferGeometry[]; panes: BufferGeometry[] }> = {
  jettyArm, pole, store, trestleTable, pitch, chess, sunboard, villa, barn, goal, floodlight, stand, clubhouse, tower, hut, birch, car, kota,
  church, bridge, woodshed, rowboat, swings, slide, picnic, volleyball, lodge, mailbox, cliff, spruce, gardenset,
};

/**
 * What is made in Blender now (art/blender/a2-yard.py), and how big it was made there: the yard's things at Billsta, the
 * swings at Flärkenbadet and Olympia's kit table. Each takes its stand-in's place at the size the chapter gives it, across or up.
 */
const YARD: Partial<Record<BuildingDef['kind'], { model: string; size: number; by: 'width' | 'height' }>> = {
  woodshed: { model: 'vedbod', size: 18, by: 'width' },
  rowboat: { model: 'roddbat-vinter', size: 16, by: 'width' },
  mailbox: { model: 'brevlada', size: 8, by: 'height' },
  swings: { model: 'gungor', size: 19, by: 'width' },
  gardenset: { model: 'utemobler', size: 9.2, by: 'width' },
  trestleTable: { model: 'kitbord', size: 3.8, by: 'width' },
};

/**
 * The buildings made in Blender (art/blender/a2-buildings.py), each with its own shade baked in, and how big each was
 * made there. Each takes its stand-in's place at the size the chapter gives it; where it has glass, the game's own panes
 * stay on its walls, so that they still light up.
 */
const BUILDINGS: Partial<Record<BuildingDef['kind'], { model: string; size: number; by: 'width' | 'height' }>> = {
  church: { model: 'kyrka', size: CHURCH.across, by: 'width' },
  lodge: { model: 'baverhydda', size: 18, by: 'width' },
  store: { model: 'kiosk', size: STORE.wide, by: 'width' },
  floodlight: { model: 'belysningsmast', size: 90, by: 'height' },
  pole: { model: 'elstolpe', size: 19, by: 'height' },
};

/** What is built of stone: the bridge's piers and deck. */
const STONY = new Set<BuildingDef['kind']>(['bridge']);
/** What is built of painted boards. */
const PAINTED = new Set<BuildingDef['kind']>(['villa', 'barn', 'store', 'clubhouse', 'church', 'woodshed', 'lodge', 'stand']);

/** One building, placed: its foot at (x, y), `z` behind the play plane, mirrored with `flip`. */
export function building(def: BuildingDef): Building {
  const { parts, panes } = BUILD[def.kind](def);
  const group = new Group();
  group.name = `building:${def.kind}`;
  if (def.model) group.userData.model = def.model;
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  // Houses, barns and halls of painted boards have their grain and weather seen close (../../render/painted-wood.ts).
  if (PAINTED.has(def.kind)) paintedWood(material);
  // What is built of stone has the granite's grain, rain streaks and lichen, and a builder may mark its own parts as
  // wood with a grain (../../render/bark-detail.ts).
  const grained = parts.some((part) => part.hasAttribute('barky'));
  if (STONY.has(def.kind) || grained) barkDetail(material);
  // A pitch's turf has its fibres, its crumbs and its wet sheen seen close, as the ground's own turf does.
  if (def.kind === 'pitch') groundDetail(material, 'turf');
  group.add(new Mesh(mergeGeometries(STONY.has(def.kind) ? parts.map((part) => barky(part, STONE)) : grained ? parts.map(notBark) : parts), material));
  let paneMaterial: MeshBasicMaterial | null = null;
  if (panes.length) {
    // Where its windows are, for what their light falls on (../../render/lift/materials/puddles.ts), which has
    // no business with this pack. A building turned sideways shines past the path.
    if (def.lit !== undefined && !def.turn) {
      group.userData.lamps = panes.map((pane) => {
        pane.computeBoundingBox();
        const middle = pane.boundingBox!.getCenter(new Vector3());
        return { x: def.x + (def.flip ? -middle.x : middle.x), z: def.z + middle.z, on: def.lit };
      });
    }
    paneMaterial = glass();
    group.add(new Mesh(mergeGeometries(panes.map((p) => { p.deleteAttribute('uv'); return p; })), paneMaterial));
  }
  // A tree of the nature kit, one of a few by where it stands, as tall as the chapter says: art/blender/a2-nature.py.
  if (def.kind === 'spruce' || def.kind === 'birch') {
    const pick = Math.abs(Math.round(def.x * 3.7 + def.z * 1.3));
    group.userData.model = def.kind === 'spruce' ? ['gran-a', 'gran-b', 'gran-c'][pick % 3]! : ['bjork-a', 'bjork-b'][pick % 2]!;
    group.userData.fit = def.kind === 'spruce' && pick % 3 === 2 ? (def.height ?? 60) / 42 : (def.height ?? 60) / 60;
    group.userData.turn = pick * 1.3;
  }
  if (def.kind === 'bridge') group.userData.model = 'bro';
  if (def.kind === 'picnic') {
    group.userData.model = 'picknick';
    group.userData.fit = 2;
    group.userData.shift = -6;
  }
  // The car takes the model's place, and keeps its windows, so that they can light up.
  if (def.kind === 'car') {
    group.userData.model = 'bil';
    group.userData.fit = (def.width ?? 29) / CAR_LONG;
    group.children[1]!.userData.keep = -0.022 * (def.width ?? 29);
  }
  // Olympia's goals: the training goal, and the big one at the far end.
  if (def.kind === 'goal') {
    const big = (def.height ?? 8) > 12;
    group.userData.model = big ? 'fotbollsmal-stort' : 'fotbollsmal';
    group.userData.fit = (def.height ?? 8) / (big ? 16 : 8);
  }
  const yard = YARD[def.kind];
  if (yard) {
    group.userData.model = yard.model;
    group.userData.fit = (def[yard.by] ?? yard.size) / yard.size;
    // The rowing boat's tarp has a loose corner, for the wind to lift (./render.ts).
    if (def.kind === 'rowboat') group.userData.onModelInstalled = (model: Object3D) => { group.userData.flap = model.getObjectByName('roddbat-vinter-flik') ?? undefined; };
  }
  const made = BUILDINGS[def.kind];
  if (made && !def.model) {
    group.userData.model = made.model;
    group.userData.fit = (def[made.by] ?? made.size) / made.size;
    if (group.children[1]) group.children[1].userData.keep = 0;
  }
  if (def.kind === 'cliff') {
    const [wide, high] = [def.width ?? 16, def.height ?? 12];
    group.userData.model = wide < 24 ? 'klippa-b' : 'klippa-a';
    group.userData.block = { width: wide * 1.2, height: high * 1.08, depth: Math.max(6, wide * 0.22), x: 0, y: high * 0.54 };
  }
  group.position.set(def.x, def.y ?? 0, def.z);
  if (def.size) group.scale.setScalar(def.size);
  if (def.flip) group.scale.x = -group.scale.x;
  if (def.turn) group.rotation.y = (def.turn * Math.PI) / 2;
  return { group, panes: paneMaterial, def };
}

/** The warm colour of a lit pane, and the dark of one with nobody home. */
export const PANE = { lit: new Color('#ffc870'), cabin: new Color('#8a6a44'), dark: new Color('#141a24') };
