import {
  BoxGeometry, BufferGeometry, Color, ConeGeometry, CylinderGeometry, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial,
  IcosahedronGeometry, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Storm } from '../../sim/types';

/**
 * The big things of Äventyr 2's places, built in code (docs/aventyr-2.md): Billsta's white house with its two
 * gables and the red barn beside it, Olympia's goals, floodlight masts, stand and clubhouse, Flärken's diving tower
 * and changing huts, the garden's playhouse, birches and a car. Each is an interpretation in plain shapes, never a
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
function paint(geometry: BufferGeometry, colour: string): BufferGeometry {
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

function playhouse(def: BuildingDef) {
  // The garden's green playhouse, white-trimmed, with a red door: his own house's size to him.
  const w = def.width ?? 12;
  const h = def.height ?? 8;
  const d = 9;
  const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0, '#4f7a4a'), ...roof(w, h * 0.3, d, 0, h, 0, '#3a2c26', 0.6)];
  parts.push(box(w * 0.22, h * 0.66, 0.3, -w * 0.18, h * 0.33, d / 2 + 0.2, '#b03a2e'));
  const panes = [new PlaneGeometry(w * 0.2, w * 0.2).translate(w * 0.22, h * 0.6, d / 2 + 0.25)];
  parts.push(box(w * 0.25, w * 0.25, 0.2, w * 0.22, h * 0.6, d / 2 + 0.15, '#f0ece2'));
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
  return { parts, panes: [] };
}

/**
 * The pitch, from its near touchline back towards the stand: mown stripes across it and its white lines, flat on the
 * ground in one shape. `width` is along the path. The lines stand a little over the stripes, and the goals are the
 * chapter's own. `marks`, from the pitch's middle: where the halfway line and its circle lie, a goal's box, and how
 * far it runs on towards the camera past the path, so that he runs on the pitch and not along its edge.
 */
function pitch(def: BuildingDef) {
  const w = def.width ?? 130;
  const deep = def.height ?? 70;
  const halfway = def.marks?.halfway ?? 0;
  const box6 = def.marks?.box ?? null;
  const front = def.marks?.front ?? 0;
  const flat = (wide: number, long: number, x: number, z: number, y: number, colour: string) => box(wide, 0.04, long, x, y, z, colour);
  const parts: BufferGeometry[] = [];
  const stripe = 9;
  for (let i = 0; i * stripe < w; i++) parts.push(flat(stripe, deep + front, -w / 2 + (i + 0.5) * stripe, (front - deep) / 2, 0.02, i % 2 ? '#2a6630' : '#3f8c3e'));
  const line = '#dfe8e0';
  const y = 0.06;
  parts.push(flat(w, 0.4, 0, front - 1.2, y, line), flat(w, 0.4, 0, -deep + 2, y, line));
  parts.push(flat(0.4, deep - 3, halfway, -deep / 2 - 0.3, y, line));
  // The centre circle: lying on the turf behind the flooded part of it.
  const middle = -deep * 0.42;
  const radius = 11;
  const sides = 48;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    parts.push(flat(0.4, (Math.PI * 2 * radius) / sides + 0.1, halfway + Math.cos(a) * radius, middle + Math.sin(a) * radius, y, line).rotateY(0));
    const seg = parts.pop()!;
    seg.translate(-(halfway + Math.cos(a) * radius), 0, -(middle + Math.sin(a) * radius));
    seg.rotateY(-a);
    seg.translate(halfway + Math.cos(a) * radius, 0, middle + Math.sin(a) * radius);
    parts.push(seg);
  }
  if (box6) {
    parts.push(flat(box6.long, 0.4, box6.x - box6.long / 2, -deep * 0.2, y, line), flat(box6.long, 0.4, box6.x - box6.long / 2, -deep * 0.62, y, line));
    parts.push(flat(0.4, deep * 0.42, box6.x - box6.long, -deep * 0.41, y, line));
  }
  return { parts, panes: [] };
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
  // A wooden diving tower in the lake: four legs, a ladder, a platform at its top with a rail.
  const h = def.height ?? 20;
  const w = def.width ?? 8;
  const parts: BufferGeometry[] = [];
  for (const x of [-w / 2, w / 2]) for (const z of [-3, 3]) parts.push(post(0.4, h + 3, x, -3, z, '#6a5442'));
  parts.push(box(w + 2, 0.8, 8, 0, h, 0, '#8a6a4c'));
  parts.push(box(w + 2, 0.3, 0.3, 0, h + 3, -4, '#e6e2d8'));
  for (const x of [-w / 2 - 1, w / 2 + 1]) parts.push(box(0.3, 3, 0.3, x, h + 1.5, -4, '#e6e2d8'));
  // A diving board out over the water.
  parts.push(box(10, 0.4, 2, w / 2 + 5, h + 0.6, 1, '#e8e2d2'));
  for (let y = 1; y < h; y += 1.6) parts.push(box(2, 0.2, 0.25, -w / 2 - 1.4, y, 3.4, '#b8bcc0'));
  for (const side of [-0.95, 0.95]) parts.push(box(0.25, h, 0.25, -w / 2 - 1.4 + side, h / 2, 3.4, '#b8bcc0'));
  return { parts, panes: [] };
}

function hut(def: BuildingDef) {
  // A changing hut by the beach: painted boards, a door ajar, a little roof.
  const w = def.width ?? 10;
  const h = def.height ?? 15;
  const d = 8;
  const parts: BufferGeometry[] = [box(w, h, d, 0, h / 2, 0, '#6a8aa4'), ...roof(w, 3, d, 0, h, 0, '#3a3c40', 0.5)];
  for (let x = -w / 2 + 0.8; x < w / 2; x += 1.6) parts.push(box(0.2, h, 0.25, x, h / 2, d / 2 + 0.1, '#58748c'));
  parts.push(box(w * 0.4, h * 0.72, 0.4, 0, h * 0.36, d / 2 + 0.3, '#e6e2d8'));
  return { parts, panes: [] };
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
  const tiers = 7;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const r = (h * 0.2) * (1 - t * 0.85);
    const tall = h * 0.2;
    parts.push(paint(new ConeGeometry(r, tall, 9).translate(0, h * 0.18 + t * h * 0.74 + tall / 2, 0), i % 2 ? '#1f3a2a' : '#24402e'));
  }
  return { parts, panes: [] };
}

function car(def: BuildingDef) {
  // The family's car: no badge, no plate, only its shape. Slate blue, because red is the candy's (art bible §2.2).
  const w = def.width ?? 29;
  const parts: BufferGeometry[] = [box(w, 6, 11, 0, 5, 0, '#3b4f66'), box(w * 0.55, 5, 10, -w * 0.05, 10.5, 0, '#34465b')];
  for (const x of [-w * 0.32, w * 0.32]) for (const z of [-5, 5]) parts.push(paint(new CylinderGeometry(2.6, 2.6, 1.6, 14).rotateX(Math.PI / 2).translate(x, 2.6, z), '#1c1c1e'));
  const panes = [new PlaneGeometry(w * 0.45, 3.6).translate(-w * 0.05, 10.8, 5.05)];
  return { parts, panes };
}

function kota(def: BuildingDef) {
  // A timber kåta: a cone of logs with smoke-dark crown.
  const h = def.height ?? 26;
  return { parts: [paint(new ConeGeometry((def.width ?? 22) / 2, h, 12).translate(0, h / 2, 0), '#7a5a3c')], panes: [] };
}

function church(def: BuildingDef) {
  // Själevad's church far down the lake, as the flashes show it: white, eight-sided, a tent roof, a lantern storey
  // and a small turret with a spire. A silhouette in plain shapes, seen from kilometres off.
  const r = (def.width ?? 40) / 2;
  const h = def.height ?? 26;
  const parts: BufferGeometry[] = [paint(new CylinderGeometry(r, r, h, 8).translate(0, h / 2, 0), '#ecebe4')];
  parts.push(paint(new ConeGeometry(r * 1.08, h * 0.55, 8).translate(0, h + h * 0.275, 0), '#3e4248'));
  parts.push(paint(new CylinderGeometry(r * 0.32, r * 0.32, h * 0.32, 8).translate(0, h * 1.55 + h * 0.16, 0), '#ecebe4'));
  parts.push(paint(new ConeGeometry(r * 0.36, h * 0.22, 8).translate(0, h * 1.87 + h * 0.11, 0), '#3e4248'));
  parts.push(paint(new ConeGeometry(r * 0.06, h * 0.5, 6).translate(0, h * 2.09 + h * 0.25, 0), '#3e4248'));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    parts.push(box(1.2, h * 0.9, 1.2, Math.sin(a) * r * 0.99, h * 0.45, Math.cos(a) * r * 0.99, '#ffffff'));
  }
  const panes = [-0.45, 0, 0.45].map((x) => new PlaneGeometry(r * 0.16, h * 0.36).translate(x * r, h * 0.5, r * 0.93));
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
  for (let row = 0; row < 7; row++) for (let i = 0; i < Math.floor(w / 1.4) - 1; i++) {
    parts.push(paint(new CylinderGeometry(0.62, 0.62, d * 0.8, 6).rotateX(Math.PI / 2).translate(-w / 2 + 1.4 + i * 1.4 + (row % 2) * 0.7, 0.7 + row * 1.25, 0), row % 3 ? '#c8a878' : '#b8986a'));
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
  // A slide: a ladder up to a little platform and the chute down, shiny in the rain.
  const h = def.height ?? 10;
  const w = def.width ?? 16;
  const parts: BufferGeometry[] = [box(3, 0.5, 3, -w / 2 + 1.5, h, 0, '#c84a3a')];
  for (const z of [-1.4, 1.4]) parts.push(box(0.3, h, 0.3, -w / 2, h / 2, z, '#3a6a8a'));
  for (let y = 1.2; y < h; y += 1.5) parts.push(box(0.2, 0.2, 2.8, -w / 2, y, 0, '#3a6a8a'));
  const run = Math.hypot(w - 3, h);
  parts.push(tilted(run, 0.4, 2.6, 0, -Math.atan2(h, w - 3), 1.5, h / 2, 0, '#e8c048'));
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
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI;
    parts.push(paint(new CylinderGeometry(0.25, 0.3, w * 0.5, 5).rotateZ(Math.PI / 2 - a + 0.3 * Math.sin(i)).translate(Math.cos(a) * w * 0.3, Math.sin(a) * h * 0.8, (i % 3 - 1) * 2), '#8a6a48'));
  }
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

const BUILD: Record<BuildingDef['kind'], (def: BuildingDef) => { parts: BufferGeometry[]; panes: BufferGeometry[] }> = {
  pitch, villa, barn, playhouse, goal, floodlight, stand, clubhouse, tower, hut, birch, car, kota,
  church, bridge, woodshed, rowboat, swings, slide, picnic, volleyball, lodge, mailbox, cliff, spruce,
};

/** One building, placed: its foot at (x, y), `z` behind the play plane, mirrored with `flip`. */
export function building(def: BuildingDef): Building {
  const { parts, panes } = BUILD[def.kind](def);
  const group = new Group();
  group.name = `building:${def.kind}`;
  if (def.model) group.userData.model = def.model;
  group.add(new Mesh(mergeGeometries(parts), new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })));
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
  group.position.set(def.x, def.y ?? 0, def.z);
  if (def.flip) group.scale.x = -1;
  if (def.turn) group.rotation.y = (def.turn * Math.PI) / 2;
  return { group, panes: paneMaterial, def };
}

/** The warm colour of a lit pane, and the dark of one with nobody home. */
export const PANE = { lit: new Color('#ffc870'), dark: new Color('#141a24') };
