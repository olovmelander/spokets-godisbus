/** Godisracet's course: Varggropen's outline as a toy-world lap through five places from Elof's adventure.
 * Pure numbers, no three and no DOM. Everything lives in the track frame: `distance` runs along the centreline
 * and `lane` is the sideways offset, positive to the driver's left. Metres, seconds, radians.
 */
import { PLAN_CENTRE, tracePolyline } from './trace';

/** One lap. The trace keeps its proportions; at this length the hairpins fit eight karts side by side with items. */
export const LAP = 960;
export const LAPS = 3;
const STEP = .5, N = LAP / STEP;

export type Surface = 'road' | 'rough' | 'mud' | 'water' | 'planks' | 'snow';
export type ZoneId = 'garden' | 'forest' | 'bog' | 'mountain' | 'candy';
export interface Zone { id: ZoneId; from: number; to: number; road: Surface; rough: Surface }
/** The lap in the order it is driven: home, Granskogen, Myren, Berget, and the candy meadow before home again. */
export const ZONES: readonly Zone[] = [
  { id: 'garden', from: 890, to: 70, road: 'road', rough: 'rough' },
  { id: 'forest', from: 70, to: 290, road: 'road', rough: 'rough' },
  { id: 'bog', from: 290, to: 468, road: 'planks', rough: 'water' },
  { id: 'mountain', from: 468, to: 665, road: 'road', rough: 'snow' },
  { id: 'candy', from: 665, to: 890, road: 'road', rough: 'rough' },
];
/** The cave on the mountain: the lap's second hairpin runs under rock. */
export const CAVE = { from: 566, to: 640 } as const;

export interface Pad { from: number; to: number; lane: number; half: number }
export interface Ramp { from: number; to: number; lane: number; half: number; height: number }
export interface Mud { at: number; lane: number; long: number; wide: number }
export interface BoxSpot { at: number; lane: number }
export interface CandySpot { at: number; lane: number; lift: number }
export interface TrackPoint { x: number; y: number; z: number; angle: number; pitch: number; lx: number; lz: number }

/** Road height along the lap: a forest hill, the low bog, the mountain and the candy hill. Artistic, not surveyed. */
const HEIGHTS: readonly (readonly [number, number])[] = [
  [0, 0], [70, .5], [118, 3], [150, 4.2], [205, 2.8], [262, 1.4], [292, -.6], [322, -1.6], [400, -1.5], [452, -.9],
  [482, .8], [508, 4.4], [540, 7.2], [575, 8.6], [606, 8.6], [640, 6.6], [690, 2.6], [742, 1.2], [800, 1.6],
  [850, 2.6], [905, .6], [935, 0],
];
/** Half-width of the road, and the rough ground between each road edge and its barrier (left, right). */
const WIDTHS: readonly (readonly [number, number, number, number])[] = [
  [0, 6, 2.4, 2.4], [55, 6, 2.4, 2.4], [85, 5.2, 2, 2], [163, 5, 1.8, 1.8], [200, 5.2, 2, 2], [280, 5, 1.6, 1.6],
  [340, 4.6, 1.2, 2], [356, 4.2, 3.4, 2.4], [440, 4.2, 3.4, 3.4], [462, 4.8, 1.8, 1.8], [540, 4.8, 1.8, 1.8],
  [566, 4.6, 1.4, 1.4], [640, 4.6, 1.4, 1.4], [668, 5.4, 2.6, 2.6], [800, 5.6, 3, 3], [880, 5.8, 2.6, 2.6],
  [930, 6, 2.4, 2.4],
];
const PADS: readonly Pad[] = [
  { from: 34, to: 40, lane: 2.8, half: 1.5 }, { from: 172, to: 178, lane: -1.6, half: 1.5 },
  { from: 430, to: 436, lane: 1.9, half: 1.3 }, { from: 544, to: 550, lane: 0, half: 1.5 },
  { from: 742, to: 748, lane: -2.8, half: 1.5 }, { from: 768, to: 774, lane: 2.8, half: 1.5 },
  { from: 884, to: 890, lane: 0, half: 1.6 },
];
const RAMPS: readonly Ramp[] = [
  { from: 226, to: 233, lane: 0, half: 3.4, height: 1.5 },
  { from: 654, to: 662, lane: 0, half: 3.6, height: 1.9 },
];
const MUD: readonly Mud[] = [
  { at: 366, lane: -1.5, long: 4.4, wide: 1.5 }, { at: 391, lane: 1.6, long: 4.4, wide: 1.5 }, { at: 415, lane: -.7, long: 4, wide: 1.4 },
];
const BOX_ROWS = [58, 196, 350, 556, 706, 866];
const GRID_SIZE = 8;

const wrap = (d: number) => ((d % LAP) + LAP) % LAP;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Signed shortest way along the lap from a to b, in (−LAP/2, LAP/2]. */
export const trackGap = (a: number, b: number) => ((b - a + LAP / 2) % LAP + LAP) % LAP - LAP / 2;
/** True when d lies on [from, to), on a lap where `to` may lie past the start line. */
export const within = (d: number, from: number, to: number) => { const x = wrap(d); return from <= to ? x >= from && x < to : x >= from || x < to; };

/** A periodic monotone cubic through the points: smooth, and never overshooting a crest or a hollow. */
function smoothProfile(points: readonly (readonly [number, number])[]): Float32Array {
  const m = points.length, x = (i: number) => points[((i % m) + m) % m]![0] + Math.floor(i / m) * LAP, y = (i: number) => points[((i % m) + m) % m]![1];
  const slope = (i: number) => (y(i + 1) - y(i)) / (x(i + 1) - x(i));
  const tangent = (i: number) => {
    const a = slope(i - 1), b = slope(i);
    if (a * b <= 0) return 0;
    const h0 = x(i) - x(i - 1), h1 = x(i + 1) - x(i), w1 = 2 * h1 + h0, w2 = h1 + 2 * h0;
    return (w1 + w2) / (w1 / a + w2 / b);
  };
  const out = new Float32Array(N);
  for (let i = 0, k = 0; i < N; i++) {
    const d = i * STEP;
    while (k + 1 < m && points[k + 1]![0] <= d) k++;
    const h = x(k + 1) - x(k), t = (d - x(k)) / h, t2 = t * t, t3 = t2 * t;
    out[i] = (2 * t3 - 3 * t2 + 1) * y(k) + (t3 - 2 * t2 + t) * h * tangent(k) + (-2 * t3 + 3 * t2) * y(k + 1) + (t3 - t2) * h * tangent(k + 1);
  }
  return out;
}
function linearProfile(points: readonly (readonly number[])[], column: number): Float32Array {
  const m = points.length, out = new Float32Array(N);
  for (let i = 0, k = 0; i < N; i++) {
    const d = i * STEP;
    while (k + 1 < m && points[k + 1]![0]! <= d) k++;
    const a = points[k]!, b = points[(k + 1) % m]!, end = k + 1 < m ? b[0]! : b[0]! + LAP;
    out[i] = a[column]! + (b[column]! - a[column]!) * (d - a[0]!) / (end - a[0]!);
  }
  return out;
}
function blur(values: Float32Array, radius: number): Float32Array {
  const out = new Float32Array(N);
  for (let i = 0; i < N; i++) { let sum = 0; for (let j = -radius; j <= radius; j++) sum += values[(i + j + N) % N]!; out[i] = sum / (radius * 2 + 1); }
  return out;
}

export interface Track {
  readonly length: number;
  /** Signed bend of the centreline (1/m): positive turns left. */
  curvature(distance: number): number;
  height(distance: number): number;
  /** Road edges and barriers as positive lane extents on each side. */
  roadLeft(distance: number): number;
  roadRight(distance: number): number;
  wallLeft(distance: number): number;
  wallRight(distance: number): number;
  zone(distance: number): number;
  surface(distance: number, lane: number): Surface;
  /** Height of a ramp above the road at this spot, else 0. */
  bump(distance: number, lane: number): number;
  onRamp(distance: number, lane: number): boolean;
  pad(distance: number, lane: number): boolean;
  /** World position and direction; `out` is reused when given. */
  point(distance: number, lane?: number, out?: TrackPoint): TrackPoint;
  /** The nearest centreline distance and lane of a world point. */
  nearest(x: number, z: number): { distance: number; lane: number };
  readonly pads: readonly Pad[];
  readonly ramps: readonly Ramp[];
  readonly mud: readonly Mud[];
  readonly boxes: readonly BoxSpot[];
  readonly candies: readonly CandySpot[];
  readonly grid: readonly { distance: number; lane: number }[];
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

function build(): Track {
  // Resample the trace at even steps of arc length, scaled so one lap is LAP metres.
  const poly = tracePolyline(), count = poly.x.length, cumulative = new Float64Array(count + 1);
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    cumulative[i + 1] = cumulative[i]! + Math.hypot(poly.x[j]! - poly.x[i]!, poly.z[j]! - poly.z[i]!);
  }
  const scale = LAP / cumulative[count]!;
  const px = new Float32Array(N), pz = new Float32Array(N), tx = new Float32Array(N), tz = new Float32Array(N);
  for (let i = 0, k = 0; i < N; i++) {
    const s = i * STEP / scale;
    while (cumulative[k + 1]! < s) k++;
    const f = (s - cumulative[k]!) / (cumulative[k + 1]! - cumulative[k]!), j = (k + 1) % count;
    px[i] = (poly.x[k]! + (poly.x[j]! - poly.x[k]!) * f - PLAN_CENTRE[0]) * scale;
    pz[i] = (poly.z[k]! + (poly.z[j]! - poly.z[k]!) * f - PLAN_CENTRE[1]) * scale;
  }
  const angle = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const a = (i + N - 1) % N, b = (i + 1) % N, dx = px[b]! - px[a]!, dz = pz[b]! - pz[a]!, length = Math.hypot(dx, dz);
    tx[i] = dx / length; tz[i] = dz / length; angle[i] = Math.atan2(dx, dz);
  }
  const raw = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const turn = angle[(i + 2) % N]! - angle[(i + N - 2) % N]!;
    raw[i] = Math.atan2(Math.sin(turn), Math.cos(turn)) / (4 * STEP);
  }
  const kappa = blur(raw, 2), height = smoothProfile(HEIGHTS);
  // Barriers stay inside the centre of a bend, so the inside line of a hairpin is always a real line.
  const half = blur(linearProfile(WIDTHS, 1), 8), shoulderL = blur(linearProfile(WIDTHS, 2), 8), shoulderR = blur(linearProfile(WIDTHS, 3), 8);
  const insideL = new Float32Array(N), insideR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    let left = Infinity, right = Infinity;
    for (let j = -16; j <= 16; j++) {
      const k = kappa[(i + j + N) % N]!;
      if (k > .02) left = Math.min(left, .6 / k); else if (k < -.02) right = Math.min(right, .6 / -k);
    }
    insideL[i] = left; insideR[i] = right;
  }
  const wallL = new Float32Array(N), wallR = new Float32Array(N), roadL = new Float32Array(N), roadR = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    wallL[i] = Math.min(half[i]! + shoulderL[i]!, insideL[i]!); wallR[i] = Math.min(half[i]! + shoulderR[i]!, insideR[i]!);
  }
  const smoothL = blur(wallL, 6), smoothR = blur(wallR, 6);
  for (let i = 0; i < N; i++) {
    wallL[i] = Math.min(wallL[i]!, smoothL[i]!); wallR[i] = Math.min(wallR[i]!, smoothR[i]!);
    roadL[i] = Math.min(half[i]!, wallL[i]! - .4); roadR[i] = Math.min(half[i]!, wallR[i]! - .4);
  }
  const zoneAt = new Uint8Array(N);
  for (let i = 0; i < N; i++) zoneAt[i] = Math.max(0, ZONES.findIndex(zone => within(i * STEP, zone.from, zone.to)));

  const read = (table: Float32Array, distance: number) => {
    const x = wrap(distance) / STEP, i = Math.floor(x) % N, f = x - Math.floor(x);
    return table[i]! * (1 - f) + table[(i + 1) % N]! * f;
  };
  const road = (distance: number, side: number) => read(side > 0 ? roadL : roadR, distance);
  const boxes: BoxSpot[] = [];
  for (const at of BOX_ROWS) {
    const span = Math.min(road(at, 1), road(at, -1)) - 1.1;
    for (let i = 0; i < 5; i++) boxes.push({ at, lane: -span + span * i / 2 });
  }
  const candies: CandySpot[] = [];
  const trail = (from: number, to: number, pieces: number, laneFrom: number, laneTo = laneFrom, lift = 0) => {
    for (let i = 0; i < pieces; i++) {
      const t = pieces > 1 ? i / (pieces - 1) : 0;
      candies.push({ at: from + (to - from) * t, lane: laneFrom + (laneTo - laneFrom) * t, lift: lift * Math.sin(Math.PI * (.15 + .7 * t)) });
    }
  };
  trail(14, 30, 4, -2.6); trail(84, 108, 5, 2, -1);                    // off the grid, and into the forest
  trail(126, 154, 6, -3, -3.2); trail(184, 192, 3, 2.2, 0);             // the inside of the first bend
  trail(236, 256, 5, 0, 0, 2.6);                                        // over the forest jump
  trail(296, 326, 6, -3.2, -3.4); trail(372, 384, 3, 1.4, -1.2);        // the bog hairpin, between the puddles
  trail(398, 408, 3, -1.6, .8); trail(486, 526, 7, 3, 3.2);             // the climb's inside line
  trail(590, 624, 6, -3, -3.2); trail(667, 690, 5, 0, 0, 3.4);          // through the cave, and off the mountain
  trail(716, 736, 4, 2.6, -2.2); trail(752, 764, 3, -2.4, 2.4); trail(806, 868, 9, -3.4, -3.6); // the candy meadow
  const grid = Array.from({ length: GRID_SIZE }, (_, i) => ({ distance: -3.2 - i * 3.3, lane: i % 2 ? -2.4 : 2.4 }));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) { minX = Math.min(minX, px[i]!); maxX = Math.max(maxX, px[i]!); minZ = Math.min(minZ, pz[i]!); maxZ = Math.max(maxZ, pz[i]!); }

  const track: Track = {
    length: LAP,
    curvature: distance => read(kappa, distance),
    height: distance => read(height, distance),
    roadLeft: distance => read(roadL, distance), roadRight: distance => read(roadR, distance),
    wallLeft: distance => read(wallL, distance), wallRight: distance => read(wallR, distance),
    zone: distance => zoneAt[Math.floor(wrap(distance) / STEP) % N]!,
    surface(distance, lane) {
      const zone = ZONES[track.zone(distance)]!;
      if (lane > read(roadL, distance) || -lane > read(roadR, distance)) return zone.rough;
      for (const puddle of MUD) {
        const along = trackGap(puddle.at, distance) / puddle.long, across = (lane - puddle.lane) / puddle.wide;
        if (along * along + across * across < 1) return 'mud';
      }
      return zone.road;
    },
    bump(distance, lane) {
      const d = wrap(distance);
      for (const ramp of RAMPS) if (d >= ramp.from && d <= ramp.to && Math.abs(lane - ramp.lane) <= ramp.half) return ramp.height * (d - ramp.from) / (ramp.to - ramp.from);
      return 0;
    },
    onRamp(distance, lane) {
      const d = wrap(distance);
      return RAMPS.some(ramp => d >= ramp.from && d <= ramp.to && Math.abs(lane - ramp.lane) <= ramp.half);
    },
    pad(distance, lane) {
      const d = wrap(distance);
      return PADS.some(pad => d >= pad.from && d <= pad.to && Math.abs(lane - pad.lane) <= pad.half);
    },
    point(distance, lane = 0, out = { x: 0, y: 0, z: 0, angle: 0, pitch: 0, lx: 0, lz: 0 }) {
      const x = wrap(distance) / STEP, i = Math.floor(x) % N, j = (i + 1) % N, f = x - Math.floor(x);
      const ax = tx[i]! * (1 - f) + tx[j]! * f, az = tz[i]! * (1 - f) + tz[j]! * f, length = Math.hypot(ax, az) || 1;
      out.lx = az / length; out.lz = -ax / length;
      out.x = px[i]! * (1 - f) + px[j]! * f + out.lx * lane; out.z = pz[i]! * (1 - f) + pz[j]! * f + out.lz * lane;
      out.y = height[i]! * (1 - f) + height[j]! * f;
      out.angle = Math.atan2(ax, az); out.pitch = -Math.atan((height[j]! - height[i]!) / STEP);
      return out;
    },
    nearest(x, z) {
      let best = 0, square = Infinity;
      for (let i = 0; i < N; i += 4) { const d = (px[i]! - x) ** 2 + (pz[i]! - z) ** 2; if (d < square) { square = d; best = i; } }
      for (let i = best - 4; i <= best + 4; i++) { const k = (i + N) % N, d = (px[k]! - x) ** 2 + (pz[k]! - z) ** 2; if (d < square) { square = d; best = k; } }
      const along = (x - px[best]!) * tx[best]! + (z - pz[best]!) * tz[best]!;
      return { distance: wrap(best * STEP + clamp(along, -STEP, STEP)), lane: (x - px[best]!) * tz[best]! - (z - pz[best]!) * tx[best]! };
    },
    pads: PADS, ramps: RAMPS, mud: MUD, boxes, candies, grid, bounds: { minX, maxX, minZ, maxZ },
  };
  return track;
}

let shared: Track | undefined;
/** The one course; building it is pure and takes a few milliseconds. */
export function getTrack(): Track { return shared ??= build(); }
