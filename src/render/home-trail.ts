import { BufferGeometry, Color, Float32BufferAttribute, Mesh } from 'three';
import type { ChapterData, Ride } from '../sim/types';
import { granite, groundMaterial, tileOf, toneAt } from './dressing/ground';

/**
 * Norrsken's way home: Pappa carries Elof down the mountain on a trail (Olov, 8 November 2026: he walked down in the
 * air, with no ground under his feet). To the simulation the summit still ends in a sheer drop, so that Elof never
 * walks down alone; the trail is a shoulder of rock a little behind the play plane, along the ride's own arc. Pappa
 * steps back onto it at the summit's edge, walks down it, and comes forward off its foot in the valley. His feet are
 * on rock the whole way.
 */
export interface HomeTrail {
  mesh: Mesh;
  /**
   * Where Pappa's feet are when he carries Elof at x: on the summit, then on the trail, then on the valley floor.
   * `from` is the depth he sets off at and comes back to.
   */
  feet(x: number, out: { y: number; z: number }, from?: number): { y: number; z: number };
}

/** The trail's middle, behind the play plane, and how far it reaches back and forward of that. */
const MIDDLE = -3.2;
const BACK = -4.3;
const FRONT = -2.1;
/** Where its foot widens out to the front, so that he comes forward onto the valley floor on it. */
const SPREAD = 3.2;
const WIDE_FRONT = 0.8;
/** How far under the valley floor its rock goes. */
const UNDER = 0.4;

/** The simulation's own easing for a ride (src/sim/sim.ts). */
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** The trail of the chapter's `home` ride, or null where there is none. */
export function createHomeTrail(chapter: ChapterData): HomeTrail | null {
  const way = homeTrailWay(chapter);
  if (!way) return null;
  const { path, floor, edge, end } = way;
  const frontAt = (x: number) => FRONT + (WIDE_FRONT - FRONT) * smooth(clamp01((x - (end - SPREAD)) / SPREAD));
  // The rock is drawn from fewer points, a quarter of an EL apart at least: closer, they only make thin slivers.
  const sparse: { x: number; y: number }[] = [];
  for (const p of path) if (p.x >= edge - 0.4 && (sparse.length === 0 || p.x - sparse[sparse.length - 1]!.x > 0.25)) sparse.push(p);
  if (sparse[sparse.length - 1] !== path[path.length - 1]) sparse.push(path[path.length - 1]!);
  const mesh = new Mesh(trailGeometry(sparse, floor, frontAt), groundMaterial(chapter, 'granite', granite()));
  mesh.name = 'home-trail';
  mesh.receiveShadow = true;
  return { mesh, feet: way.feet };
}

/** The trail's line and where Pappa's feet are on it, without the rock: what the simulation can be checked against. */
export function homeTrailWay(chapter: ChapterData) {
  const ride = chapter.rides?.find((r) => r.id === 'home');
  if (!ride || ride.to.y >= ride.from.y) return null;
  const path = arc(ride);
  const floor = ride.to.y;
  const start = ride.from.x;
  const end = ride.to.x;
  /** The height of the arc at x, between its samples. */
  const height = (x: number): number => {
    if (x <= path[0]!.x) return path[0]!.y;
    for (let i = 1; i < path.length; i++) {
      const b = path[i]!;
      if (x > b.x) continue;
      const a = path[i - 1]!;
      return a.y + ((b.y - a.y) * (x - a.x)) / Math.max(1e-6, b.x - a.x);
    }
    return floor;
  };
  // The summit's edge: where the ground first falls away from the ride's start.
  const edge = chapter.ground.find((p, i) => i > 0 && p.x > start && p.y < chapter.ground[i - 1]!.y - 1)?.x ?? start + 2;
  const feet: HomeTrail['feet'] = (x, out, from = 0) => {
    out.y = x <= start ? ride.from.y : height(x);
    // Back onto the trail on the summit, before its edge; forward again over its widened foot.
    const back = smooth(clamp01((x - start) / Math.max(0.5, edge - start)));
    const forward = smooth(clamp01((x - (end - SPREAD * 0.8)) / (SPREAD * 0.8)));
    out.z = from + (MIDDLE - from) * back * (1 - forward);
    return out;
  };
  return { path, floor, edge, end, feet, back: BACK, front: FRONT };
}

/** The ride's arc, as the simulation moves him along it with the stick let go. */
function arc(ride: Ride): { x: number; y: number }[] {
  // Close enough together that his feet, read between two of them, are where the simulation has him.
  const out: { x: number; y: number }[] = [];
  const steps = 600;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const k = smooth(t);
    out.push({
      x: ride.from.x + (ride.to.x - ride.from.x) * k,
      y: ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * t) * (ride.rise ?? 0),
    });
  }
  return out;
}

/**
 * The shoulder of rock: a worn path on its top, a rough face in front and behind, all down into the valley floor.
 * Its colours and grain are the mountain's own granite (./dressing/ground.ts).
 */
function trailGeometry(path: { x: number; y: number }[], floor: number, frontAt: (x: number) => number): BufferGeometry {
  const position: number[] = [];
  const colour: number[] = [];
  const uv: number[] = [];
  const tile = tileOf('granite');
  const tone = new Color();
  const worn = new Color('#b9b6a8');
  const bottom = floor - UNDER;
  /** A little unevenness, the same at the same place. */
  const bump = (x: number, z: number) => Math.sin(x * 2.3 + z * 1.7) * 0.04 + Math.sin(x * 0.9 - z * 3.1) * 0.03;
  type V = { x: number; y: number; z: number; u: number; v: number; path?: number };
  const vertex = (p: V) => {
    position.push(p.x, p.y, p.z);
    uv.push(p.u, p.v);
    toneAt('granite', p.x, p.z, tone);
    if (p.path) tone.lerp(worn, p.path);
    colour.push(tone.r, tone.g, tone.b);
  };
  const quad = (a: V, b: V, c: V, d: V) => {
    for (const p of [a, b, c, a, c, d]) vertex(p);
  };
  // Across the top: the back rim a little raised, the path worn in the middle, the front edge rounded off.
  const across = [
    { z: () => BACK, lift: 0.12, path: 0 },
    { z: () => MIDDLE - 0.55, lift: 0.02, path: 0.35 },
    { z: () => MIDDLE, lift: -0.02, path: 0.5 },
    { z: (x: number) => Math.max(MIDDLE + 0.55, frontAt(x) - 0.45), lift: 0.0, path: 0.3 },
    { z: (x: number) => frontAt(x), lift: -0.1, path: 0 },
  ];
  const top = (p: { x: number; y: number }, j: number): V => {
    const row = across[j]!;
    const z = row.z(p.x);
    return { x: p.x, y: p.y + row.lift + bump(p.x, z) * (row.path > 0 ? 0.5 : 1), z, u: p.x * tile, v: z * tile, path: row.path };
  };
  /** A face from the top's edge down into the valley: in rough rows, each a little in or out. */
  const face = (p: { x: number; y: number }, z: number, out: number, rows: number): V[] => {
    const from = p.y + (out > 0 ? -0.1 : 0.12);
    // A low face is a slope more than a wall: its rows lie close together, and stay smooth.
    const tall = clamp01((from - bottom) / 3);
    return Array.from({ length: rows + 1 }, (_, r) => {
      const y = from + ((bottom - from) * r) / rows;
      const rough = r === 0 || r === rows ? 0 : (Math.sin(p.x * 1.3 + r * 2.1) * 0.18 + Math.sin(p.x * 3.7 - r) * 0.08) * tall;
      return { x: p.x, y, z: z + out * rough, u: p.x * tile, v: y * tile };
    });
  };
  const ROWS = 8;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1]!;
    const b = path[i]!;
    for (let j = 1; j < across.length; j++) quad(top(a, j - 1), top(a, j), top(b, j), top(b, j - 1));
    const fa = face(a, frontAt(a.x), 1, ROWS);
    const fb = face(b, frontAt(b.x), 1, ROWS);
    for (let r = 1; r <= ROWS; r++) quad(fa[r - 1]!, fa[r]!, fb[r]!, fb[r - 1]!);
    const ba = face(a, BACK, -1, ROWS);
    const bb = face(b, BACK, -1, ROWS);
    for (let r = 1; r <= ROWS; r++) quad(bb[r - 1]!, bb[r]!, ba[r]!, ba[r - 1]!);
  }
  // Its upper end, against the summit's cliff, closed so that no light shows through.
  const first = path[0]!;
  const zs = across.map((row) => row.z(first.x));
  for (let j = 1; j < zs.length; j++) {
    const za = zs[j - 1]!;
    const zb = zs[j]!;
    quad(
      { x: first.x, y: bottom, z: za, u: za * tile, v: bottom * tile },
      { x: first.x, y: bottom, z: zb, u: zb * tile, v: bottom * tile },
      { x: first.x, y: first.y, z: zb, u: zb * tile, v: first.y * tile },
      { x: first.x, y: first.y, z: za, u: za * tile, v: first.y * tile },
    );
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.computeVertexNormals();
  return geometry;
}
