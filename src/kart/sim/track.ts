/** A course to drive on, built from its numbers in courses.ts: a closed toy-world lap through places from
 * Elof's adventure. Pure numbers, no three and no DOM. Everything lives in the track frame: `distance` runs
 * along the centreline and `lane` is the sideways offset, positive to the driver's left. Metres, seconds, radians.
 */
import { COURSES, type Cave, type CourseDef, type Landmark, type Mud, type Pad, type Ramp, type TrackId } from './courses';
import { splinePolyline } from './trace';

export { TRACK_IDS, type TrackId } from './courses';
export type { Cave, Landmark, Mud, Pad, Ramp } from './courses';

/** One lap of every course. At this length a hairpin fits eight karts side by side with what they throw. */
export const LAP = 960;
export const LAPS = 3;
const STEP = .5, N = LAP / STEP, BLEND = 16;

export type Surface = 'road' | 'rough' | 'mud' | 'water' | 'planks' | 'snow';
/** The five kinds of place a lap can pass through, by number: home, Granskogen, Myren, Berget and Godisängen. */
export const PLACES: readonly { id: 'garden' | 'forest' | 'bog' | 'mountain' | 'candy'; road: Surface; rough: Surface }[] = [
  { id: 'garden', road: 'road', rough: 'rough' }, { id: 'forest', road: 'road', rough: 'rough' }, { id: 'bog', road: 'planks', rough: 'water' },
  { id: 'mountain', road: 'road', rough: 'snow' }, { id: 'candy', road: 'road', rough: 'rough' },
];
export interface ZoneSpan { kind: number; from: number; to: number }
export interface BoxSpot { at: number; lane: number }
export interface CandySpot { at: number; lane: number; lift: number }
export interface TrackPoint { x: number; y: number; z: number; angle: number; pitch: number; lx: number; lz: number }

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
  readonly id: TrackId;
  readonly length: number;
  /** Signed bend of the centreline (1/m): positive turns left. */
  curvature(distance: number): number;
  height(distance: number): number;
  /** Road edges and barriers as positive lane extents on each side. */
  roadLeft(distance: number): number;
  roadRight(distance: number): number;
  wallLeft(distance: number): number;
  wallRight(distance: number): number;
  /** The kind of place here: an index into PLACES. */
  zone(distance: number): number;
  /** How much of each kind of place a spot on the lap is: one, or two across the stretch where they meet. */
  mix(distance: number, out?: number[]): number[];
  /** Under rock; `margin` widens (or with a negative number, narrows) each cave at both ends. */
  inCave(distance: number, margin?: number): boolean;
  surface(distance: number, lane: number): Surface;
  /** Height of a ramp above the road at this spot, else 0. */
  bump(distance: number, lane: number): number;
  onRamp(distance: number, lane: number): boolean;
  pad(distance: number, lane: number): boolean;
  /** World position and direction; `out` is reused when given. */
  point(distance: number, lane?: number, out?: TrackPoint): TrackPoint;
  /** The nearest centreline distance and lane of a world point. */
  nearest(x: number, z: number): { distance: number; lane: number };
  readonly zones: readonly ZoneSpan[];
  readonly caves: readonly Cave[];
  readonly landmarks: readonly Landmark[];
  readonly pads: readonly Pad[];
  readonly ramps: readonly Ramp[];
  readonly mud: readonly Mud[];
  readonly boxes: readonly BoxSpot[];
  readonly candies: readonly CandySpot[];
  readonly grid: readonly { distance: number; lane: number }[];
  readonly bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

function build(def: CourseDef): Track {
  // Resample the outline at even steps of arc length, scaled so one lap is LAP metres.
  const poly = splinePolyline(def.plan), count = poly.x.length, cumulative = new Float64Array(count + 1);
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
    px[i] = (poly.x[k]! + (poly.x[j]! - poly.x[k]!) * f - def.centre[0]) * scale;
    pz[i] = (poly.z[k]! + (poly.z[j]! - poly.z[k]!) * f - def.centre[1]) * scale;
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
  const kappa = blur(raw, 2), height = smoothProfile(def.heights);
  // Barriers stay inside the centre of a bend, so the inside line of a hairpin is always a real line.
  const half = blur(linearProfile(def.widths, 1), 8), shoulderL = blur(linearProfile(def.widths, 2), 8), shoulderR = blur(linearProfile(def.widths, 3), 8);
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
  // The places in the order they are driven, each ending where the next begins.
  const ordered = [...def.zones].sort((a, b) => a[1] - b[1]);
  const zones: ZoneSpan[] = ordered.map(([kind, from], i) => ({ kind, from, to: ordered[(i + 1) % ordered.length]![1] }));
  const spanAt = new Uint8Array(N);
  for (let i = 0; i < N; i++) spanAt[i] = zones.length === 1 ? 0 : Math.max(0, zones.findIndex(zone => within(i * STEP, zone.from, zone.to)));

  const read = (table: Float32Array, distance: number) => {
    const x = wrap(distance) / STEP, i = Math.floor(x) % N, f = x - Math.floor(x);
    return table[i]! * (1 - f) + table[(i + 1) % N]! * f;
  };
  const road = (distance: number, side: number) => read(side > 0 ? roadL : roadR, distance);
  const boxes: BoxSpot[] = [];
  for (const at of def.boxRows) {
    const span = Math.min(road(at, 1), road(at, -1)) - 1.1;
    for (let i = 0; i < 5; i++) boxes.push({ at, lane: -span + span * i / 2 });
  }
  const candies: CandySpot[] = [];
  for (const [from, to, pieces, laneFrom, laneTo = laneFrom, lift = 0] of def.candies) for (let i = 0; i < pieces; i++) {
    const t = pieces > 1 ? i / (pieces - 1) : 0;
    candies.push({ at: from + (to - from) * t, lane: laneFrom + (laneTo - laneFrom) * t, lift: lift * Math.sin(Math.PI * (.15 + .7 * t)) });
  }
  const grid = Array.from({ length: GRID_SIZE }, (_, i) => ({ distance: -3.2 - i * 3.3, lane: i % 2 ? -2.4 : 2.4 }));
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < N; i++) { minX = Math.min(minX, px[i]!); maxX = Math.max(maxX, px[i]!); minZ = Math.min(minZ, pz[i]!); maxZ = Math.max(maxZ, pz[i]!); }

  const track: Track = {
    id: def.id, length: LAP,
    curvature: distance => read(kappa, distance),
    height: distance => read(height, distance),
    roadLeft: distance => read(roadL, distance), roadRight: distance => read(roadR, distance),
    wallLeft: distance => read(wallL, distance), wallRight: distance => read(wallR, distance),
    zone: distance => zones[spanAt[Math.floor(wrap(distance) / STEP) % N]!]!.kind,
    mix(distance, out = [0, 0, 0, 0, 0]) {
      const index = spanAt[Math.floor(wrap(distance) / STEP) % N]!, span = zones[index]!;
      out.fill(0); out[span.kind] = 1;
      if (zones.length < 2) return out;
      // Metres on to this place's end and back to its start, the long way round if need be.
      const ahead = wrap(span.to - distance), behind = wrap(distance - span.from);
      const other = ahead < BLEND ? zones[(index + 1) % zones.length]! : behind < BLEND ? zones[(index + zones.length - 1) % zones.length]! : null;
      if (other && other.kind !== span.kind) { const t = .5 * (1 - Math.min(ahead, behind) / BLEND); out[span.kind] = 1 - t; out[other.kind] = t; }
      return out;
    },
    inCave: (distance, margin = 0) => def.caves.some(cave => within(distance, cave.from - margin, cave.to + margin)),
    surface(distance, lane) {
      const place = PLACES[track.zone(distance)]!;
      if (lane > read(roadL, distance) || -lane > read(roadR, distance)) return place.rough;
      for (const puddle of def.mud) {
        const along = trackGap(puddle.at, distance) / puddle.long, across = (lane - puddle.lane) / puddle.wide;
        if (along * along + across * across < 1) return 'mud';
      }
      return place.road;
    },
    bump(distance, lane) {
      const d = wrap(distance);
      for (const ramp of def.ramps) if (d >= ramp.from && d <= ramp.to && Math.abs(lane - ramp.lane) <= ramp.half) return ramp.height * (d - ramp.from) / (ramp.to - ramp.from);
      return 0;
    },
    onRamp(distance, lane) {
      const d = wrap(distance);
      return def.ramps.some(ramp => d >= ramp.from && d <= ramp.to && Math.abs(lane - ramp.lane) <= ramp.half);
    },
    pad(distance, lane) {
      const d = wrap(distance);
      return def.pads.some(pad => d >= pad.from && d <= pad.to && Math.abs(lane - pad.lane) <= pad.half);
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
    zones, caves: def.caves, landmarks: def.landmarks,
    pads: def.pads, ramps: def.ramps, mud: def.mud, boxes, candies, grid, bounds: { minX, maxX, minZ, maxZ },
  };
  return track;
}

const built = new Map<TrackId, Track>();
/** A course by name; building one is pure and takes a few milliseconds, and each is built once. */
export function getTrack(id: TrackId = 'varggropen'): Track {
  let track = built.get(id);
  if (!track) built.set(id, track = build(COURSES[id]));
  return track;
}
