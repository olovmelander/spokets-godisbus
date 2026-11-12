import { BoxGeometry, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, MeshStandardMaterial, Object3D } from 'three';
import type { Storm } from '../../sim/types';
import { slopeDrop } from '../../render/dressing/ground';
import { sway } from '../../render/wind';

/**
 * Olympia's pitch (./chapters/olympia.ts), built in code as the adventure's other big things are (./buildings.ts):
 * its turf in mown stripes, its white lines, its flooded places, and the turf's fibres standing up near the camera.
 *
 * Olov, 12 November 2026, after playing it through: "Man har en rak platta som gräs sen under den så böjer sig gräset på
 * något sätt ... gräset ser bara ut som en platt matta och ser inte så bra ut närmst kameran". The turf was one flat
 * slab running on level 7 EL towards the camera, while the ground under it rolled away down the place's front
 * (../../render/dressing/ground.ts, the lawn's profile): from the camera a level plate with an edge, and under it the
 * ground bending away. Now the turf lies on the ground as the lawn does: level where he walks and behind, and in front
 * of the path down the same slope, a finger over it, as far as the ground's floor goes. Near the camera its fibres stand
 * up out of it in tufts, knee-high to him, and none higher than the path, so that his boots are never hidden.
 *
 * And of the two puddles, "närmst kameran ser det bara ut som ett rakt streck, vi måste göra pölen mer naturlig": a hole
 * was the pit's whole width, cut straight across where the water ends towards the camera. Now its near edge comes
 * round from the pit's two sides in a curve that wanders, the turf round it is soaked dark, its fibres stand ragged
 * along the water's edge and lean out over it, and a few shallow puddles of rain lie on the turf in front.
 */

type BuildingDef = NonNullable<Storm['buildings']>[number];

const tint = new Color();
/** A part in one colour, ready to merge with ./buildings.ts's parts: corners, their normals and their colour. */
function paint(geometry: BufferGeometry, colour: string): BufferGeometry {
  const part = geometry.index ? geometry.toNonIndexed() : geometry;
  tint.set(colour);
  const count = part.getAttribute('position').count;
  part.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count }, () => [tint.r, tint.g, tint.b]).flat(), 3));
  part.deleteAttribute('uv');
  return part;
}
const box = (w: number, h: number, d: number, x: number, y: number, z: number, colour: string) => paint(new BoxGeometry(w, h, d).translate(x, y, z), colour);

/** Where the level ground of the path ends in front, and the ground begins to slope away (ground.ts, EDGE). */
const EDGE = 0.45;
/** Where the lawn's floor ends in front (ground.ts, PROFILE_FOREST's last row over its cut): the turf ends there too. */
const DRAPE_ENDS = 5;
/**
 * The rows the turf is laid along in front of the path: every row of the ground's own profile (so that between two it
 * is as flat as the ground is) and more between them, for the hole's edge and the turf's shade.
 */
const ROWS = [0.45, 0.5, 0.65, 0.8, 0.9, 1.05, 1.2, 1.35, 1.5, 1.85, 2.2, 2.6, 3, 3.4, 3.8, 4.2, 4.6, 5];
/** How the ground's front darkens towards the camera (ground.ts, the profile's `shade`): the turf half as much. */
const SHADE: [number, number][] = [[0.9, 1], [1.5, 0.97], [2.2, 0.9], [3, 0.8], [3.8, 0.66], [4.6, 0.56], [5, 0.5]];
const shadeAt = (z: number) => {
  if (z <= SHADE[0]![0]) return 1;
  for (let i = 1; i < SHADE.length; i++) {
    const [[z0, s0], [z1, s1]] = [SHADE[i - 1]!, SHADE[i]!];
    if (z <= z1) return s0 + ((s1 - s0) * (z - z0)) / (z1 - z0);
  }
  return SHADE[SHADE.length - 1]![1];
};
/** The turf's top over the ground, and its lines' over the turf. */
const TOP = 0.04;
const LINE = 0.06;
/** The turf's shade, as the ground's turf has it (ground.ts, GROUNDS.turf.shade). */
const TURF_SHADE = new Color('#1c3a22');
/** Its two mown greens, a stripe each 9 EL along the pitch, and its white. */
const GREENS = ['#3f8c3e', '#2a6630'];
const STRIPE = 9;
const WHITE = '#dfe8e0';
/** The near touchline, on the slope in front of the path: in the picture under him as he runs, not at its foot. */
const TOUCHLINE = [2.45, 2.75];

/** How far under the path the turf lies at a depth in front of it (world z); level behind. */
const dropAt = (z: number) => (z <= EDGE ? 0 : slopeDrop(z));

/** How far a hole's shore slopes in from the turf's cut, and down: past the water and into its murk. */
const SHORE_IN = 0.75;
const SHORE_DOWN = 1.2;
/** How far out round a hole the turf is soaked dark, in steps that follow the slope. */
const SOAKED = 0.6;
/** The shore's turf, wet at the water's edge and darker under it, and the soaked turf round the hole at its edge. */
const SHORE = { lip: new Color('#24502a'), under: new Color('#16301a'), soaked: new Color('#1b3d22') };
/** How far behind the path a hole is its pit's whole width before it rounds off. */
const WET_PATH = -1.2;
/**
 * How far towards the camera a hole's near edge comes round at its middle, before it wanders. The water itself is cut
 * at 0.65 (../../render/water.ts, POOL): between that and the turf's edge the camera, over the edge, sees the water
 * further back, and the shore slopes down from the edge under it.
 */
const NEAR_REACH = 1.15;

/** A hole in the pitch, in the pitch's own x and z, and the pitch's depth (`dz`) to turn its z into the chapter's. */
export interface Wet { x0: number; x1: number; path: number; back: number; dz: number }

/**
 * Where a hole's back edge is at `x`: at the path at its two ends, rounding back to `back` at its middle, and wandering
 * in and out a little on the way, as rain water's edge does.
 */
export function wetEdge(wet: Wet, x: number): number {
  const t = ((x - wet.x0) / (wet.x1 - wet.x0)) * 2 - 1;
  const wander = 1 + 0.1 * Math.sin(t * 5.3 + wet.x0) + 0.05 * Math.sin(t * 11.7 + 2 * wet.x0);
  return wet.path + (wet.back - wet.path) * Math.sqrt(Math.max(0, 1 - t * t)) * wander;
}

/** The furthest back a hole's back edge wanders, at most: its box's back, from where the turf comes forward to its edge. */
const deepest = (wet: Wet) => wet.path + (wet.back - wet.path) * 1.16;

/**
 * Where a hole's near edge is at `x`, in the pitch's z: from the level path's edge at the pit's two sides it comes round
 * towards the camera, and along its middle it wanders in and out by a third of a length, in long and short bays.
 */
export function nearEdge(wet: Wet, x: number): number {
  const t = ((x - wet.x0) / (wet.x1 - wet.x0)) * 2 - 1;
  const round = Math.sqrt(Math.max(0, 1 - t * t));
  const wander = 0.2 * Math.sin(x * 1.9 + wet.x0) + 0.11 * Math.sin(x * 4.7 + 2.3 * wet.x0) + 0.06 * Math.sin(x * 10.3 + 1.1);
  return EDGE - wet.dz + Math.max(0, NEAR_REACH - EDGE + wander) * round ** 0.7;
}

/** Points along a hole's back edge from `a` to `b`, about every 0.15 EL. */
function backAlong(wet: Wet, a: number, b: number): [number, number][] {
  const count = Math.max(1, Math.ceil(Math.abs(b - a) / 0.15));
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / count;
    return [x, wetEdge(wet, x)];
  });
}
/** Points along a hole's near edge from `a` to `b`, about every 0.08 EL. */
function nearAlong(wet: Wet, a: number, b: number): [number, number][] {
  const count = Math.max(1, Math.ceil(Math.abs(b - a) / 0.08));
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = a + ((b - a) * i) / count;
    return [x, nearEdge(wet, x)];
  });
}

/**
 * A hole's whole outline, going round it with the water on its left: round its back from the pit's one side to the
 * other, and back along its near edge.
 */
function outlineOf(wet: Wet): [number, number][] {
  return [...backAlong(wet, wet.x0, wet.x1), ...nearAlong(wet, wet.x1, wet.x0)];
}

/** The holes of a pitch's flooded places, in its own x and z. */
export function wetsOf(def: BuildingDef): Wet[] {
  return (def.marks?.wet ?? []).map((wet) => ({ x0: wet.from - def.x, x1: wet.to - def.x, path: WET_PATH - def.z, back: wet.back - def.z, dz: def.z }));
}

/** A mesh in vertex colours from its triangles' corners, as ./buildings.ts's parts are. */
function coloured(corners: number[], colours: number[], normals?: number[]): BufferGeometry {
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(corners, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  if (normals) made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  else made.computeVertexNormals();
  return made;
}

/**
 * The turf's normal at a depth in the chapter, as the slope rolls there: smooth over the rows, so that the light does not
 * break in a line at each of them.
 */
function rolling(z: number): [number, number, number] {
  const slope = (dropAt(z + 0.25) - dropAt(z - 0.25)) / 0.5;
  const long = Math.hypot(1, slope);
  return [0, 1 / long, slope / long];
}

/** The turf behind a hole, from its box's back (`deepest`) forward to the hole's rounded edge, between `a` and `b`. */
function turfTo(wet: Wet, a: number, b: number, y: number, colour: string): BufferGeometry {
  const corners: number[] = [], colours: number[] = [];
  const edge = backAlong(wet, a, b);
  const back = deepest(wet);
  tint.set(colour);
  for (let i = 0; i < edge.length - 1; i++) {
    const [[x0, z0], [x1, z1]] = [edge[i]!, edge[i + 1]!];
    // Wound to face up.
    corners.push(x0, y, back, x0, y, z0, x1, y, back, x1, y, back, x0, y, z0, x1, y, z1);
    for (let k = 0; k < 6; k++) colours.push(tint.r, tint.g, tint.b);
  }
  return coloured(corners, colours);
}

/**
 * A hole's shore, all the way round it: along the outline the turf soaked dark out to `SOAKED`, fading into the turf's
 * own colour (`turfAt`), and from the outline the turf sloping in under the water. In front of the path the soaked turf
 * lies down the slope as the turf does (`lie`).
 */
function shoreOf(wet: Wet, turfAt: (x: number) => string, lie: (z: number) => number): BufferGeometry {
  const outline = outlineOf(wet);
  const n = outline.length;
  // Each point's way into the hole, between its two neighbours: the hole is to the left of the way the outline goes.
  const inward = outline.map((_, i) => {
    const [a, b] = [outline[(i - 1 + n) % n]!, outline[(i + 1) % n]!];
    const long = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [-(b[1] - a[1]) / long, (b[0] - a[0]) / long] as const;
  });
  const corners: number[] = [], colours: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], ca: Color, cb: Color, cc: Color, cd: Color) => {
    // a and b along the outline, c and d beyond each: wound to face up.
    corners.push(...a, ...c, ...b, ...b, ...c, ...d);
    for (const colour of [ca, cc, cb, cb, cc, cd]) colours.push(colour.r, colour.g, colour.b);
  };
  const soakedAt = (x: number, k: number) => SHORE.soaked.clone().lerp(new Color(turfAt(x)), k);
  for (let i = 0; i < n; i++) {
    const [[x0, z0], [x1, z1]] = [outline[i]!, outline[(i + 1) % n]!];
    if (Math.hypot(x1 - x0, z1 - z0) < 1e-6) continue;
    const [[n0x, n0z], [n1x, n1z]] = [inward[i]!, inward[(i + 1) % n]!];
    const [top0, top1] = [lie(z0) + TOP, lie(z1) + TOP];
    // Down into the water.
    quad([x0, top0, z0], [x1, top1, z1], [x0 + n0x * SHORE_IN, top0 - SHORE_DOWN, z0 + n0z * SHORE_IN], [x1 + n1x * SHORE_IN, top1 - SHORE_DOWN, z1 + n1z * SHORE_IN],
      SHORE.lip, SHORE.lip, SHORE.under, SHORE.under);
    // Out over the turf, soaked at the edge and drying into it, in three steps so that it lies on the slope.
    for (let s = 0; s < 3; s++) {
      const [k0, k1] = [s / 3, (s + 1) / 3];
      const at = (x: number, z: number, nx: number, nz: number, k: number) => {
        const [ox, oz] = [x - nx * SOAKED * k, z - nz * SOAKED * k];
        return [ox, lie(oz) + TOP + 0.012, oz];
      };
      quad(at(x1, z1, n1x, n1z, k0), at(x0, z0, n0x, n0z, k0), at(x1, z1, n1x, n1z, k1), at(x0, z0, n0x, n0z, k1),
        soakedAt(x1, k0 ** 1.5), soakedAt(x0, k0 ** 1.5), soakedAt(x1, k1 ** 1.5), soakedAt(x0, k1 ** 1.5));
    }
  }
  return coloured(corners, colours);
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

/** A small hash, for what is scattered: the same pitch every time. */
function sequence(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The pitch, from its near touchline back towards the stand: mown stripes across it and its white lines, in one shape.
 * `width` is along the path. The lines stand a little over the stripes, and the goals are the chapter's own. `marks`,
 * from the pitch's middle: where the halfway line and its circle lie, a goal's box, and how far it runs on towards the
 * camera past the path (`front`), so that he runs on the pitch and not along its edge: in front of the path it lies down
 * the ground's slope, as far as the floor goes.
 *
 * `marks.wet`, in the chapter's own x and z: the flooded places. The pitch lies over the ground's pits, so over each
 * the turf and its lines are cut away, and the water in the pit shows (Olov, 8 November 2026: Olympia's puddle could
 * not be seen). A hole is the pit's whole width where he walks, rounds off behind the path to `back` at its middle, and
 * comes round towards the camera in front of it (`nearEdge`). Round it the turf is soaked dark, and from its edge the
 * turf slopes down under the water as a puddle's shore does (Olov, 9 November 2026: "Pölen där man sparkar ner bollen
 * ska bli snyggare.").
 */
export function pitch(def: BuildingDef) {
  const w = def.width ?? 130;
  const deep = def.height ?? 70;
  const halfway = def.marks?.halfway ?? 0;
  const box6 = def.marks?.box ?? null;
  const front = def.marks?.front ?? 0;
  const wets = wetsOf(def);
  /** The pitch's own z of a depth in the chapter, and back. */
  const own = (z: number) => z - def.z;
  const world = (z: number) => z + def.z;
  // Level from the back to the path's edge; then, if it runs on so far, down the slope to where the floor ends.
  const level = Math.min(front, own(EDGE));
  const drapeTo = Math.min(front, own(DRAPE_ENDS));
  const draped = drapeTo > level + 1e-6;
  /** The height of the turf's top at a depth of the pitch, under the stripes' own little lift. */
  const lie = (z: number) => -dropAt(world(z));
  // Each hole's whole box, for the turf; and in narrow slices, each as deep as the hole goes in it, for the lines.
  // (Its box goes back as far as its back edge wanders: to `back` only, the turf lay over the water behind that.)
  const boxes = wets.map((wet) => ({ x0: wet.x0, x1: wet.x1, z0: deepest(wet), z1: level }));
  const slices = wets.flatMap((wet) => {
    const count = Math.ceil((wet.x1 - wet.x0) / 0.2);
    return Array.from({ length: count }, (_, i) => {
      const [x0, x1] = [wet.x0 + ((wet.x1 - wet.x0) * i) / count, wet.x0 + ((wet.x1 - wet.x0) * (i + 1)) / count];
      return { x0, x1, z0: Math.min(wetEdge(wet, x0), wetEdge(wet, x1)), z1: level };
    });
  });
  const parts: BufferGeometry[] = [];
  const flat = (wide: number, long: number, x: number, z: number, y: number, colour: string) => box(wide, 0.04, long, x, y, z, colour);
  /** A flat rectangle (`x0` to `x1`, `z0` to `z1`), with what lies over the holes (`cut`) cut out of it. */
  const dry = (x0: number, x1: number, z0: number, z1: number, y: number, colour: string, cut = slices) => {
    if (z1 <= z0) return;
    for (const piece of cut.reduce((left, hole) => left.flatMap((r) => outside(r, hole)), [{ x0, x1, z0, z1 }])) {
      parts.push(flat(piece.x1 - piece.x0, piece.z1 - piece.z0, (piece.x0 + piece.x1) / 2, (piece.z0 + piece.z1) / 2, y, colour));
    }
  };
  /** Where the turf in front of the path begins at x: the path's edge, or a hole's near edge. */
  const startAt = (x: number) => {
    const wet = wets.find((h) => x > h.x0 && x < h.x1);
    return wet ? Math.max(own(EDGE), nearEdge(wet, x)) : own(EDGE);
  };
  /**
   * A sheet of the turf in front of the path, from `x0` to `x1`, at `lift` over the turf's top: in columns where a hole's
   * near edge needs them and in the rows of the ground's slope, each corner at most as far back as `from` has it.
   */
  const sheet = (x0: number, x1: number, z0: number, z1: number, lift: number, colourAt: (z: number) => Color, from: (x: number) => number = () => z0) => {
    const columns = [x0, x1];
    for (const wet of wets) {
      const [a, b] = [Math.max(x0, wet.x0), Math.min(x1, wet.x1)];
      for (let x = a; x < b; x += 0.12) columns.push(x);
      if (b > a) columns.push(a, b);
    }
    const xs = [...new Set(columns)].sort((p, q) => p - q);
    const rows = [z0, ...ROWS.map(own).filter((z) => z > z0 && z < z1), z1];
    const corners: number[] = [], colours: number[] = [], normals: number[] = [];
    const at = (x: number, j: number) => {
      const z = Math.min(Math.max(rows[j]!, from(x)), z1);
      return [x, lie(z) + TOP + lift, z];
    };
    for (let i = 0; i < xs.length - 1; i++) {
      for (let j = 0; j < rows.length - 1; j++) {
        const [a, b, c, d] = [at(xs[i]!, j), at(xs[i + 1]!, j), at(xs[i]!, j + 1), at(xs[i + 1]!, j + 1)];
        if (c[2]! - a[2]! < 1e-5 && d[2]! - b[2]! < 1e-5) continue;
        // Wound to face up: a and b across, c and d nearer the camera.
        corners.push(...a, ...c, ...b, ...b, ...c, ...d);
        for (const p of [a, c, b, b, c, d]) {
          const colour = colourAt(world(p[2]!));
          colours.push(colour.r, colour.g, colour.b);
          normals.push(...rolling(world(p[2]!)));
        }
      }
    }
    if (corners.length) parts.push(coloured(corners, colours, normals));
  };
  const stripes = Math.ceil(w / STRIPE);
  for (let i = 0; i < stripes; i++) {
    const [x0, x1, colour] = [-w / 2 + i * STRIPE, Math.min(w / 2, -w / 2 + (i + 1) * STRIPE), GREENS[i % 2]!];
    dry(x0, x1, -deep, level, 0.02, colour, boxes);
    // Behind each hole, the turf comes forward again to its rounded edge.
    for (const wet of wets) {
      const [a, b] = [Math.max(x0, wet.x0), Math.min(x1, wet.x1)];
      if (b > a) parts.push(turfTo(wet, a, b, TOP, colour));
    }
    // In front of the path, down the slope, darkening a little towards the camera as the ground does.
    const green = new Color(colour);
    const shaded = new Color();
    if (draped) sheet(x0, x1, level, drapeTo, 0, (z) => shaded.copy(green).lerp(TURF_SHADE, (1 - shadeAt(z)) * 0.5), startAt);
  }
  const line = new Color(WHITE);
  const y = LINE - 0.02;
  if (draped) sheet(-w / 2, w / 2, own(TOUCHLINE[0]!), own(TOUCHLINE[1]!), LINE - TOP, () => line);
  else dry(-w / 2, w / 2, front - 1.4, front - 1, y, WHITE);
  dry(-w / 2, w / 2, -deep + 1.8, -deep + 2.2, y, WHITE);
  dry(halfway - 0.2, halfway + 0.2, -deep + 1.2, -1.8, y, WHITE);
  // The centre circle: lying on the turf behind the flooded part of it, and on the slope in front of it.
  const middle = -deep * 0.42;
  const radius = 11;
  const sides = 48;
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2;
    const [cx, cz] = [halfway + Math.cos(a) * radius, middle + Math.sin(a) * radius];
    // (Not on the slope in front of the path, where a straight piece would stand off it.)
    if (cz > level) continue;
    if (wets.some((wet) => cx > wet.x0 - 0.3 && cx < wet.x1 + 0.3
      && cz > wetEdge(wet, Math.min(wet.x1, Math.max(wet.x0, cx))) - 0.8 && cz < nearEdge(wet, Math.min(wet.x1, Math.max(wet.x0, cx))) + 0.8)) continue;
    const seg = flat(0.4, (Math.PI * 2 * radius) / sides + 0.1, 0, 0, y + lie(cz), WHITE);
    seg.rotateY(-a);
    seg.translate(cx, 0, cz);
    parts.push(seg);
  }
  if (box6) {
    dry(box6.x - box6.long, box6.x, -deep * 0.2 - 0.2, -deep * 0.2 + 0.2, y, WHITE);
    dry(box6.x - box6.long, box6.x, -deep * 0.62 - 0.2, -deep * 0.62 + 0.2, y, WHITE);
    dry(box6.x - box6.long - 0.2, box6.x - box6.long + 0.2, -deep * 0.62, -deep * 0.2, y, WHITE);
  }
  // Each hole's shore: the turf soaked dark round it, and sloping down under the water, all the way round.
  const turfAt = (x: number) => GREENS[Math.floor((x + w / 2) / STRIPE) % 2]!;
  for (const wet of wets) parts.push(shoreOf(wet, turfAt, lie));
  // Rain lying in shallow puddles on the turf in front of each hole, darker than the soaked turf and sheened with the sky.
  for (const wet of wets) if (draped) parts.push(puddlesBefore(wet, lie, drapeTo));
  return { parts, panes: [] as BufferGeometry[] };
}

/** A shallow puddle's colour on the turf: the dark sky in a film of water, a little of the turf's green through it. */
const FILM = new Color('#2a4f86');
const FILM_EDGE = new Color('#2c5a3c');

/**
 * A few shallow puddles of rain on the turf in front of a hole, one for every three or so EL of it: a ragged blob each,
 * lying on the slope a hand over the turf, dark at its middle and greener at its edge where the fibres stand through.
 */
function puddlesBefore(wet: Wet, lie: (z: number) => number, drapeTo: number): BufferGeometry {
  const next = sequence(Math.round(wet.x0 * 97 + 13));
  const corners: number[] = [], colours: number[] = [];
  const count = Math.max(2, Math.round((wet.x1 - wet.x0) / 2.6));
  const rim = 14;
  for (let p = 0; p < count; p++) {
    const x = wet.x0 + ((p + 0.25 + next() * 0.5) / count) * (wet.x1 - wet.x0);
    const z = Math.min(drapeTo - 0.6, nearEdge(wet, x) + 0.4 + next() * 0.8);
    const [rx, rz] = [0.25 + next() * 0.45, 0.12 + next() * 0.16];
    const wobble = [next() * 6.28, next() * 6.28, 0.18 + next() * 0.14];
    const ring = (k: number) => Array.from({ length: rim }, (_, i) => {
      const a = (i / rim) * Math.PI * 2;
      const r = k * (1 + wobble[2]! * Math.sin(a * 2 + wobble[0]!) + 0.12 * Math.sin(a * 5 + wobble[1]!));
      const [px, pz] = [x + Math.cos(a) * rx * r, z + Math.sin(a) * rz * r];
      return [px, lie(pz) + TOP + 0.02, pz];
    });
    const [inner, outer] = [ring(0.55), ring(1)];
    const middle = [x, lie(z) + TOP + 0.02, z];
    for (let i = 0; i < rim; i++) {
      const j = (i + 1) % rim;
      // Wound to face up: round the middle, then the ring out to the edge.
      corners.push(...middle, ...inner[j]!, ...inner[i]!);
      for (const c of [FILM, FILM, FILM]) colours.push(c.r, c.g, c.b);
      corners.push(...inner[i]!, ...inner[j]!, ...outer[i]!, ...outer[i]!, ...inner[j]!, ...outer[j]!);
      for (const c of [FILM, FILM, FILM_EDGE, FILM_EDGE, FILM, FILM_EDGE]) colours.push(c.r, c.g, c.b);
    }
  }
  return coloured(corners, colours);
}

// --- the fibres ------------------------------------------------------------------------------------------------

/**
 * One fibre of the turf, standing at the origin, 1 high: a flat blade curling a little towards the camera, which it
 * faces. It is lit as the turf it stands in is, from above (its normals point up): lit as a blade, from the side, every
 * fibre stood dark against the sunlit turf, a speck of dirt.
 */
function fibre(): BufferGeometry {
  const g = new BufferGeometry();
  const position = [-0.5, 0, 0, 0.5, 0, 0, -0.32, 0.55, 0.07, 0.32, 0.55, 0.07, 0, 1, 0.22];
  // Dark at its foot among the rubber crumbs, pale and yellower at its tip, where the light catches it.
  const shade = [[0.38, 0.4, 0.36], [0.38, 0.4, 0.36], [1.05, 1.08, 0.9], [1.05, 1.08, 0.9], [2.1, 2.2, 1.25]];
  const up = 1 / Math.hypot(1, 0.35);
  g.setAttribute('position', new Float32BufferAttribute(position, 3));
  g.setAttribute('normal', new Float32BufferAttribute(Array.from({ length: 5 }, () => [0, up, 0.35 * up]).flat(), 3));
  g.setAttribute('color', new Float32BufferAttribute(shade.flat(), 3));
  g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4]);
  return g;
}

/** How long a stretch of fibres is: each is drawn only while it is in the picture. */
const FIBRE_STRETCH = 18;
/** Tufts to a square EL of the slope in front of the path, and fibres to a tuft. */
const TUFTS = 10;
const PER_TUFT = 4;
/** Where they stand: from a little in front of the path, so that none is over his boots, to where the picture ends. */
const FIBRES = { from: 1.15, to: 4.5 };

/**
 * The turf's fibres near the camera, in stretches along the pitch (Olov, 12 November 2026: "gräset ser bara ut som en
 * platt matta ... närmst kameran"): tufts of flat blades on the slope in front of the path, each tuft its stripe's green,
 * none higher than the path less a finger, so that nothing covers his boots; and along each puddle's edge a ragged
 * fringe of them, leaning out over the water. They sway a little in the storm's wind, as the lawn's grass does
 * (../../render/wind.ts). Placed as the pitch is: at its x, its y and its z.
 */
export function pitchFibres(def: BuildingDef): Group {
  const group = new Group();
  group.name = 'pitch-fibres';
  group.position.set(def.x, def.y ?? 0, def.z);
  const w = def.width ?? 130;
  const front = def.marks?.front ?? 0;
  if (front + def.z <= FIBRES.from) return group;
  const wets = wetsOf(def);
  // Wet plastic: a little shine. Each faces the camera, so only its front is drawn.
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.55, emissive: '#10280f', emissiveIntensity: 0.4 });
  sway(material, 0.05);
  const blade = fibre();
  const place = new Object3D();
  const colour = new Color();
  const greenAt = (x: number) => GREENS[Math.floor((x + w / 2) / STRIPE) % 2]!;
  /** The turf's top at a depth in the chapter, in the pitch's own height; a fibre's foot is a little into it. */
  const footAt = (zw: number) => TOP - dropAt(zw) - 0.02;
  const wetAt = (x: number, z: number) => wets.some((wet) => x > wet.x0 - 0.05 && x < wet.x1 + 0.05 && z < nearEdge(wet, x) + 0.08);
  for (let from = -w / 2; from < w / 2; from += FIBRE_STRETCH) {
    const to = Math.min(w / 2, from + FIBRE_STRETCH);
    const next = sequence(Math.round(from * 31 + 7));
    const tufts = Math.round((to - from) * (FIBRES.to - FIBRES.from) * TUFTS);
    // With room for the fringes of the holes in the stretch: four at most to a point of each outline.
    const edges = wets.map((wet) => outlineOf(wet).filter(([x]) => x >= from && x < to));
    const mesh = new InstancedMesh(blade, material, tufts * PER_TUFT + edges.reduce((sum, edge) => sum + edge.length * 4, 0));
    mesh.name = 'pitch-fibres';
    mesh.count = 0;
    /** One fibre: where its foot is, how high and wide, which way it faces (`turn`), how far it leans that way and over. */
    const put = (x: number, y: number, z: number, high: number, wide: number, turn: number, lean: number, side: number, green: string, light: number) => {
      place.position.set(x, y, z);
      place.rotation.set(lean, turn, side, 'YXZ');
      place.scale.set(wide, high, 1);
      place.updateMatrix();
      mesh.setMatrixAt(mesh.count, place.matrix);
      mesh.setColorAt(mesh.count++, colour.set(green).multiplyScalar(light));
    };
    for (let t = 0; t < tufts; t++) {
      const x = from + next() * (to - from);
      const zw = FIBRES.from + next() ** 0.85 * (FIBRES.to - FIBRES.from);
      const z = zw - def.z;
      const want = 0.14 + next() * 0.26;
      const tone = 0.8 + next() * 0.5;
      // Most its stripe's green; some a lighter green, and some bleached to straw by the sun.
      const kind = next();
      const hue = (at: number) => (kind < 0.12 ? '#9cb35c' : kind < 0.42 ? '#5fae4c' : greenAt(at));
      // Never higher than the path less a finger, seen from in front: nothing covers his boots.
      const room = dropAt(zw) - 0.05;
      const marks = Array.from({ length: PER_TUFT * 2 }, () => next());
      if (room < 0.05 || wetAt(x, z)) continue;
      for (let k = 0; k < PER_TUFT; k++) {
        const [r1, r2] = [marks[k * 2]!, marks[k * 2 + 1]!];
        const [bx, bz] = [x + (r1 - 0.5) * 0.09, z + (r2 - 0.5) * 0.06];
        // The line is painted on the fibres as on the turf under them.
        const painted = bz + def.z > TOUCHLINE[0]! && bz + def.z < TOUCHLINE[1]!;
        // Each faces the camera, more or less, and leans a little every way.
        put(bx, footAt(bz + def.z), bz, Math.min(want, room) * (0.7 + r2 * 0.35), 0.028 + r1 * 0.024,
          (r1 - 0.5) * 1.6, (r2 - 0.35) * 0.7, (r1 - 0.5) * 0.6, painted ? '#b8c0b8' : hue(bx), tone * (0.9 + r1 * 0.2));
      }
    }
    // The ragged fringe along each hole's edge, where its water meets the turf: thicker in some places than in others,
    // leaning out over the water.
    for (const [w0, outline] of edges.entries()) {
      const wet = wets[w0]!;
      for (let i = 0; i < outline.length; i++) {
        const [x, z] = outline[i]!;
        const [px, pz] = outline[Math.max(0, i - 1)]!;
        const [nx, nz] = outline[Math.min(outline.length - 1, i + 1)]!;
        const along = Math.atan2(nz - pz, nx - px);
        // Clumps and gaps: by a slow wave along the edge, and a little chance.
        const thick = 0.5 + 0.5 * Math.sin(x * 3.1 + z * 2.3 + wet.x0);
        const blades = Math.min(4, Math.round(thick * 2.6 + next() * 1.2));
        // Which way the water is from here (to the left of the way round).
        const [ix, iz] = [-Math.sin(along), Math.cos(along)];
        for (let k = 0; k < blades; k++) {
          const [r1, r2, r3] = [next(), next(), next()];
          // Just outside the edge, on the soaked turf, facing the camera and leaning in over the water.
          const out = 0.04 + r1 * 0.09;
          const slide = (r2 - 0.5) * 0.08;
          const [bx, bz] = [x - ix * out + iz * slide, z - iz * out - ix * slide];
          const zw = bz + def.z;
          // Over the near edge, in front of the path, no higher than the path is over it; along its back, taller.
          const room = zw > EDGE ? Math.max(0.1, dropAt(zw) + 0.12) : 0.32;
          const lean = 0.3 + r3 * 0.45;
          put(bx, footAt(zw), bz, Math.min(room, 0.1 + r3 * 0.2), 0.022 + r2 * 0.022, (r1 - 0.5) * 1.2,
            iz * lean, -ix * lean + (r2 - 0.5) * 0.3, greenAt(bx), 0.75 + r3 * 0.35);
        }
      }
    }
    if (mesh.count === 0) continue;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
