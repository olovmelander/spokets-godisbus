import type { ChapterData } from '../../sim/types';
import { hash, heightAt, landscape, noise, surfaceAt } from './kit';

/**
 * The ground's edges as they are drawn (Olov, 14 November 2026: "Förbättra marken genom hela spelet så att kanterna
 * och övergångarna får mer naturliga och varierade former, i stället för så raka linjer").
 *
 * The simulation's ground is one line on the plane he moves in: a step, a pit and a ditch are upright walls in it. The
 * picture drew each wall as that line pulled straight through the depth, so that a ditch was a slot cut with a ruler
 * from the haze to the camera, and a ledge a box. Here every wall of ground that has grown or weathered (lawn, moss,
 * peat, sand, rock; never what is built) gets a line of its own through the depth: it wanders, comes out into the low
 * side behind the path, leans, bulges and breaks back down its face, and its lip rounds over. A ditch's two walls wind
 * together.
 *
 * **On the plane he moves in nothing changes.** Between `STILL_BEHIND` and `STILL_FRONT` every point is drawn where the
 * outline has it, so that his soles stand on what is drawn and he stops at what is drawn. Away from it a point is drawn
 * `shift` further along the path and `sink` lower. Both are smooth fields of where a point is (x, its height, z), so
 * that everything laid out by them stays whole: the ground's mesh, the water under its banks, and what grows on a lip.
 */

/** Ground that has grown or weathered. What is built keeps its straight lines. */
const GROWN: ReadonlySet<string> = new Set(['moss', 'lawn', 'sphagnum', 'shore', 'granite', 'earth', 'sand', 'wetRock']);
/** The places where a stretch marked stone is living rock, and not a kerb, a step or a bed's edging. */
const ROCKY_PLACES: ReadonlySet<string> = new Set(['bog', 'forest', 'mountain', 'dusk']);
/** The grounds that are rock: they break in blocks, and lean little. */
const ROCK: ReadonlySet<string> = new Set(['granite', 'wetRock', 'stone']);
/** The grounds that stand in water as islands: their sides are short and soft. */
const PEAT: ReadonlySet<string> = new Set(['sphagnum', 'shore']);

/** Where the drawn ground is the outline's own, behind the plane he moves in and in front of it. */
export const STILL_BEHIND = -0.35;
export const STILL_FRONT = 0.5;
/** How far from a wall its line moves the ground with it, at most. */
const REACH = 4.5;
/**
 * How much of a reach a line may move in front of the path, where the ground's picture is seen from above: so little
 * that the picture is nowhere pulled or squeezed by more than a third (tests/unit/ground.test.ts). Behind the path
 * the ground is seen edge on, and a line may move it further.
 */
const FRONT_SHARE = 0.2;

const smooth = (from: number, to: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** A wall of grown ground, with the line it takes through the depth. */
export interface Bank {
  /** Where the outline has it, its top and its foot. */
  x: number;
  top: number;
  foot: number;
  /** 1: its upper floor lies to the right. */
  side: 1 | -1;
  /** How far its line comes out into the low side at most, and how far it draws back into the upper. */
  out: number;
  back: number;
  /** How far its foot stands out from under its lip at most. */
  lean: number;
  /** How far its face bulges and breaks back. */
  rough: number;
  /** How far its lip rounds over, away from the plane he moves in. */
  round: number;
  /** How far it moves the ground with it, on its upper side and on its lower. */
  reachUp: number;
  reachLow: number;
  /** The most its line moves in front of the path, either way, where it goes on there. */
  front: number;
  /** It breaks in blocks, as rock does. */
  rock: boolean;
  /** Its foot is in a pool that is open towards the camera: its line goes on in front of the path too. */
  open: boolean;
  seed: number;
}

/** A pool that runs on towards the camera between its banks, instead of ending in a line in front of the path. */
export interface OpenPool { from: number; to: number; y: number }

/**
 * A pit or a ditch between two grown walls: the two go through the depth together, so that a narrow ditch winds as a
 * whole and is not only wider here and narrower there.
 */
export interface Channel { from: number; to: number; reachLeft: number; reachRight: number; wind: number; front: number; open: boolean; seed: number }

export interface Edges {
  readonly banks: readonly Bank[];
  readonly channels: readonly Channel[];
  readonly pools: readonly OpenPool[];
  /**
   * How far along the path a point of the ground is drawn from where the outline has it: by its x, its height on the
   * outline and its depth. `at` is the height it is drawn at, where that is another: in front of the path the ground
   * falls away, and two points drawn in one place move as one.
   */
  shift(x: number, y: number, z: number, at?: number): number;
  /** How far under where the outline has it a point is drawn: a lip rounds over, away from the plane he moves in. */
  sink(x: number, y: number, z: number): number;
  /** How far along the path something that stands on the ground at x (on whichever floor is there) is drawn, at a depth. */
  shiftOn(x: number, z: number): number;
  /** The wall at x, if a grown one stands there. */
  bankAt(x: number): Bank | undefined;
  /** The pool at x that is open towards the camera, if x is in one. */
  poolAt(x: number): OpenPool | undefined;
}

/** What the ground is at x: what the chapter marks it as, or the place's own. */
const kindAt = (chapter: ChapterData, own: string, x: number): string => surfaceAt(chapter, x) ?? own;
const grown = (chapter: ChapterData, kind: string): boolean => GROWN.has(kind) || (kind === 'stone' && ROCKY_PLACES.has(chapter.place ?? ''));
/** Whether a kind of ground has grown or weathered in a chapter: its edges are never ruler lines. */
export const isGrown = grown;

/** The place's own ground, for those that ask without knowing it (./index.ts, OWN). */
const OWN: Record<string, string> = { forest: 'moss', garden: 'lawn', bog: 'sphagnum', mountain: 'granite', dusk: 'granite', home: 'wood', village: 'asphalt' };
const ownOf = (chapter: ChapterData): string => (chapter.place === 'home' && chapter.outdoors !== undefined ? 'lawn' : OWN[chapter.place ?? ''] ?? '');

/**
 * The pools of a chapter that run on towards the camera: still water in a garden or a forest (their fronts have a
 * floor that grows: ./ground.ts), with a bed of the place's own ground. Not a river or a bog, whose water is open
 * already; not a street's puddle, and not a pool in something built, such as Olympia's pitch.
 */
const pooled = new WeakMap<ChapterData, OpenPool[]>();
export function openPools(chapter: ChapterData): readonly OpenPool[] {
  let pools = pooled.get(chapter);
  if (pools) return pools;
  const own = ownOf(chapter);
  // The land as the picture has it: without the things that stand on it.
  const land = landscape(chapter);
  pools = chapter.river || (own !== 'lawn' && own !== 'moss') ? [] : (chapter.water ?? []).filter((w) => {
    // Its bed, and the ground at one bank at least, have grown; turf is laid, and has holes of its own (Olympia's pitch).
    const bed = kindAt(land, own, (w.from + w.to) / 2);
    const sides = [kindAt(land, own, w.from - 0.05), kindAt(land, own, w.to + 0.05)];
    return grown(land, bed) && sides.some((kind) => grown(land, kind)) && !sides.includes('turf') && bed !== 'turf';
  }).map(({ from, to, y }) => ({ from, to, y }));
  pooled.set(chapter, pools);
  return pools;
}

/** A wall's own numbers: the same in every session. */
const drawOf = (seed: number, k: number) => hash(seed * 0.731 + k * 1.37, k * 7.9 + 3.1);

const made = new WeakMap<ChapterData, Map<string, Edges>>();
const NONE: Edges = { banks: [], channels: [], pools: [], shift: () => 0, sink: () => 0, shiftOn: () => 0, bankAt: () => undefined, poolAt: () => undefined };

/** The edges of a chapter's ground. `own` is the place's own ground (./ground.ts, Ground). */
export function edgesOf(chapter: ChapterData, own: string = ownOf(chapter)): Edges {
  if (!own) return NONE;
  let byOwn = made.get(chapter);
  if (!byOwn) made.set(chapter, (byOwn = new Map()));
  let edges = byOwn.get(own);
  if (!edges) byOwn.set(own, (edges = build(chapter, own)));
  return edges;
}

function build(source: ChapterData, own: string): Edges {
  const chapter = landscape(source);
  const line = chapter.ground;
  const pools = openPools(source);
  // Every wall of the outline, grown or built: a built one keeps its place, and holds its neighbours' lines off.
  const walls: { x: number; top: number; foot: number; side: 1 | -1; grown: boolean }[] = [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    const tall = Math.abs(b.y - a.y);
    if (tall <= Math.abs(b.x - a.x) * 1.3 || tall < 0.2) continue;
    const up = b.y > a.y;
    const [top, foot] = up ? [b, a] : [a, b];
    // The upper floor lies beyond the top: to the right of a wall that goes up, to the left of one that goes down.
    const side = up ? 1 : -1;
    const upper = kindAt(chapter, own, top.x + side * 0.05);
    const lower = kindAt(chapter, own, foot.x - side * 0.05);
    // The walls that close a course at its two ends are no part of its land.
    const closes = i === 0 || i === line.length - 2;
    walls.push({ x: (top.x + foot.x) / 2, top: top.y, foot: foot.y, side, grown: !closes && grown(chapter, upper) && grown(chapter, lower) });
  }
  // Where something built begins: a deck, a kerb, a thing that stands on the ground. A line stops short of it.
  const built: number[] = [];
  for (const s of chapter.surfaces ?? []) if (!grown(chapter, s.kind)) built.push(s.from, s.to);
  for (const mark of source.landmarks ?? []) built.push(mark.from, mark.to);
  /** How far it is from a wall to the next wall or built thing on one side. */
  const gap = (i: number, way: 1 | -1) => {
    const wall = walls[i]!;
    let least = Infinity;
    for (const [k, other] of walls.entries()) if (k !== i && (other.x - wall.x) * way > 1e-6) least = Math.min(least, Math.abs(other.x - wall.x));
    for (const x of built) if ((x - wall.x) * way > -1e-6) least = Math.min(least, Math.abs(x - wall.x));
    return least;
  };
  const isOpen = (wall: { x: number; foot: number }) => pools.some((w) => wall.x >= w.from - 1e-6 && wall.x <= w.to + 1e-6 && wall.foot < w.y);
  const banks: Bank[] = [];
  for (const [i, wall] of walls.entries()) {
    if (!wall.grown) continue;
    // A line never crosses its neighbour's: it moves the ground with it for less than half the way there.
    const reachUp = Math.min(REACH, 0.48 * gap(i, wall.side));
    const reachLow = Math.min(REACH, 0.48 * gap(i, -wall.side as 1 | -1));
    if (reachLow < 0.12) continue;
    const tall = wall.top - wall.foot;
    const upper = kindAt(chapter, own, wall.x + wall.side * 0.05);
    const rock = ROCK.has(upper);
    const peat = PEAT.has(upper);
    const seed = Math.round(wall.x * 10) + (wall.side > 0 ? 0.37 : 0.71);
    // Soil slumps and leans, and its turf rounds over; rock stands, and breaks in blocks; a bog's island is soft and low.
    const like = rock ? { out: 0.7, back: 0.3, lean: Math.min(0.2 * tall, 0.55), rough: 0.16, round: 0.04 }
      : peat ? { out: 0.5, back: 0.25, lean: Math.min(0.3 * tall, 0.35), rough: 0.08, round: 0.1 }
      : { out: 0.95, back: 0.3, lean: Math.min(0.45 * tall, 1.1), rough: 0.1, round: 0.16 };
    banks.push({
      x: wall.x, top: wall.top, foot: wall.foot, side: wall.side, rock, open: isOpen(wall), seed,
      // Out and lean together stay well inside the low side's reach, so that the ground there is never folded.
      out: Math.min(like.out * (0.7 + 0.3 * drawOf(seed, 1)), 0.26 * reachLow),
      lean: Math.min(like.lean * (0.6 + 0.4 * drawOf(seed, 2)), 0.1 * reachLow),
      back: Math.min(like.back, 0.25 * reachUp),
      rough: Math.min(like.rough, 0.1 * reachLow, 0.08 * tall + 0.03),
      round: Math.min(like.round, 0.3 * tall, 0.4 * reachUp),
      front: FRONT_SHARE * 0.55 * Math.min(reachUp, reachLow),
      reachUp: Math.max(reachUp, 0.05), reachLow,
    });
  }
  banks.sort((a, b) => a.x - b.x);
  // A pit or a ditch: a grown wall down and the next wall up, not far apart. Its two walls wind together.
  const channels: Channel[] = [];
  for (let i = 0; i < walls.length - 1; i++) {
    const [left, right] = [walls[i]!, walls[i + 1]!];
    if (!left.grown || !right.grown || left.side !== -1 || right.side !== 1 || right.x - left.x > 7) continue;
    const reachLeft = Math.min(REACH, 0.48 * gap(i, -1));
    const reachRight = Math.min(REACH, 0.48 * gap(i + 1, 1));
    const seed = Math.round(left.x * 10) + 0.53;
    const wind = Math.min(1.1 * (0.55 + 0.45 * drawOf(seed, 3)), 0.2 * Math.min(reachLeft, reachRight));
    if (wind >= 0.06) channels.push({ from: left.x, to: right.x, reachLeft, reachRight, wind, front: FRONT_SHARE * 0.35 * Math.min(reachLeft, reachRight), open: isOpen(left) && isOpen(right), seed });
  }

  /** How much of its line a wall has at a depth: none on the plane he moves in, all of it a few lengths away. */
  const away = (open: boolean, z: number): number => {
    if (z < STILL_BEHIND) return smooth(-STILL_BEHIND, 2.6, -z) * (1 + 0.15 * smooth(3, 14, -z));
    // In front of the path only a pool's banks go on: any other wall's upper floor has drawn back there.
    return z > STILL_FRONT && open ? smooth(STILL_FRONT, 2.4, z) : 0;
  };
  /** A wall's line at a depth, from -1 (drawn back) to 1 (out in the low side): it wanders, and rock breaks in blocks. */
  const lineOf = (bank: Bank, z: number): number => {
    if (bank.rock) {
      const at = z / 1.9 + bank.seed * 0.77;
      const block = Math.floor(at);
      const a = hash(block, bank.seed) * 2 - 1;
      const b = hash(block + 1, bank.seed) * 2 - 1;
      return (a + (b - a) * smooth(0.72, 1, at - block)) * 0.8 + (noise(z * 0.9 + bank.seed, 4.2) - 0.5) * 0.4;
    }
    return (noise(z * 0.36 + bank.seed * 1.3, 1.7) - 0.5) * 1.5 + (noise(z * 0.74 + bank.seed * 0.7, 6.3) - 0.5) * 0.6 + 0.22;
  };
  /** How far a wall's point stands out into the low side: `up` is how high up the wall it is, 1 at its lip. */
  const outOf = (bank: Bank, up: number, y: number, z: number): number => {
    // In front of the path a wall's corner rounds off into its upper side, more at one height than at another: never
    // out into the low side, where it would stand in front of what is at the wall's foot.
    if (z > STILL_FRONT && !bank.open) return -Math.min(0.5, FRONT_SHARE * Math.min(bank.reachUp, bank.reachLow)) * smooth(STILL_FRONT, 1.25, z) * (0.45 + 0.55 * noise(y * 1.1 + bank.seed, z * 0.8 + 3.7));
    const far = away(bank.open, z);
    if (far === 0) return 0;
    const wander = Math.min(1, Math.max(-1, lineOf(bank, z)));
    // In front of the path a pool's bank wanders less: the ground there is seen from above, and its picture with it.
    // And it stands upright, so that where the floor ends in its cut the bank's face is one line.
    if (z > STILL_FRONT) return far * Math.min(1, Math.max(-1, wander * 1.5)) * bank.front;
    const lip = wander >= 0 ? wander * bank.out : wander * bank.back;
    // Under its lip the face is steep; lower down it slopes out to its foot, more in some places than in others.
    const lean = bank.lean * (0.35 + 0.65 * noise(z * 0.5 + bank.seed * 2.1, 9.4)) * (1 - up) ** 1.5;
    // Down its face it bulges and breaks back: not at its lip or its foot, whose lines are the wander's.
    const bulge = bank.rough * Math.sin(Math.PI * Math.min(1, Math.max(0, up))) * (bank.rock
      ? (hash(Math.floor(y / 0.8 + bank.seed), Math.floor(z / 1.3 + bank.seed * 3)) - 0.5) * 2
      : (noise(z * 1.3 + bank.seed, y * 1.6 + 2.2) - 0.5) * 2.4);
    // Just under its lip the turf's shoulder stands out a little, where the lip has rounded over.
    const under = (1 - up) * (bank.top - bank.foot);
    const shoulder = bank.round * 0.6 * Math.exp(-(((under - 0.28) / 0.2) ** 2));
    return far * (lip + lean + bulge + shoulder);
  };
  const still = (z: number) => z >= STILL_BEHIND && z <= STILL_FRONT;
  /** How far a ditch's winding moves a point at x and a depth: all of it between its walls, less beside it. */
  const windAt = (x: number, z: number): number => {
    let dx = 0;
    for (const c of channels) {
      if (x < c.from - c.reachLeft || x > c.to + c.reachRight) continue;
      const far = away(c.open, z);
      if (far === 0) continue;
      const d = x < c.from ? (c.from - x) / c.reachLeft : x > c.to ? (x - c.to) / c.reachRight : 0;
      const winds = Math.min(1, Math.max(-1, (noise(z * 0.3 + c.seed * 0.9, 3.3) - 0.5) * 2.4 + (noise(z * 0.8 + c.seed * 1.7, 7.1) - 0.5) * 0.7));
      dx += (1 - d * d) ** 2 * far * (z > STILL_FRONT ? Math.min(c.wind, c.front) : c.wind) * winds;
    }
    return dx;
  };
  const shiftBy = (x: number, z: number, upOf: (bank: Bank) => number, y: number): number => {
    if (still(z)) return 0;
    let dx = windAt(x, z);
    for (const bank of banks) {
      if (bank.x < x - REACH) continue;
      if (bank.x > x + REACH) break;
      const u = (x - bank.x) * bank.side;
      const d = Math.abs(u) / (u >= 0 ? bank.reachUp : bank.reachLow);
      if (d >= 1) continue;
      dx -= bank.side * (1 - d * d) ** 2 * outOf(bank, upOf(bank), y, z);
    }
    return dx;
  };
  return {
    banks, channels, pools,
    shift: (x, y, z, at = y) => shiftBy(x, z, (bank) => Math.min(1, Math.max(0, (y - bank.foot) / (bank.top - bank.foot))), at),
    sink(x, y, z) {
      if (still(z)) return 0;
      let down = 0;
      for (const bank of banks) {
        if (bank.x < x - 1) continue;
        if (bank.x > x + 1) break;
        // Only its lip and the floor beside it, on its upper side: the turf rounds over the edge.
        const u = (x - bank.x) * bank.side;
        const wide = Math.min(0.9, bank.reachUp);
        if (u < -1e-6 || u >= wide || y < bank.top - 0.02) continue;
        down = Math.max(down, bank.round * away(bank.open, z) * (1 - u / wide) ** 2);
      }
      return down;
    },
    shiftOn: (x, z) => shiftBy(x, z, (bank) => ((x - bank.x) * bank.side >= 0 ? 1 : 0), heightAt(chapter, x)),
    bankAt: (x) => banks.find((bank) => Math.abs(bank.x - x) < 1e-3),
    poolAt: (x) => pools.find((w) => x >= w.from && x <= w.to),
  };
}
