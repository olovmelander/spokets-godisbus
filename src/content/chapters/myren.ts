import type { Candy, ChapterData, Jump, Tussock, Vec } from '../../sim/types';

/**
 * Kapitel 3: Myren (plan §3.4), in greybox. Units: EL. The places, from the left:
 *
 * 1. **The edge of the bog,** and **the tussocks** (P11): they are the path, and open water lies between
 *    them. He never touches it: the glitter bubble catches him just above.
 * 2. **Sjunkande tuvor** (E3): further out, the pale tussocks sink while he stands on them. One that sinks
 *    under him sends him back to the last firm ground in the glitter bubble. A firm island with a big candy
 *    splits the stretch.
 * 3. **Mamma** (P12): at the wide pool, "Ropa på Mamma", and her hands lift a dead pine across it. At the
 *    boardwalk she lets her braid down, and he climbs it. At the top: "På myren går vi på spången."
 * 4. **Lysklubban** (P13): the trail ends at a lollipop the ghost has left for him. He takes it, the mist
 *    rolls in, and in its light the trail shows again.
 * 5. **Tranungen** (P14): a crane chick alone on a tussock. It follows his light to its family.
 * 6. **The ghost waits,** and lets him come close.
 * 7. **Tranornas dans** (S4): a crane kneels, he climbs on, and it carries him up towards the mountain.
 *
 * Not built yet: the tussocks' dip under his feet, the bouncing cranberries, Mamma's mug and her lamp behind
 * him, the lyktgubbar and their game (C3), the rings of the cranes' calls as a thing to follow, memory 3,
 * the ghost's picture bubble, the cranes' dance, the jay.
 */

/** Open water is a pit this deep to the simulation, and its surface is here. */
const DEEP = -6;
const WATER = -0.6;

/** A place to stand: firm ground or a tussock, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/** The firm tussocks of the first stretch, with a wide one to rest on, and the firm ground before the soft ones. */
const FIRM: Stone[] = [
  { from: 11.4, to: 14, y: 0.2 },
  { from: 15.4, to: 17.8, y: 0 },
  { from: 19.2, to: 22, y: 0.3 },
  { from: 23.5, to: 26, y: 0.1 },
  { from: 27.4, to: 30.4, y: 0.35 },
  { from: 31.8, to: 36, y: 0 },
  { from: 37.5, to: 40, y: 0.4 },
  { from: 41.5, to: 44, y: 0.8 },
  { from: 45.4, to: 47.6, y: 0.3 },
  { from: 49, to: 52, y: 0 },
];
/** The soft ones, in two runs, with a firm island between them and the pool's shore after them. */
const SOFT_A: Stone[] = [
  { from: 53.3, to: 55.3, y: 0 },
  { from: 56.6, to: 58.6, y: 0.15 },
  { from: 59.9, to: 61.9, y: 0 },
];
const ISLAND: Stone = { from: 63.2, to: 67, y: 0 };
const SOFT_B: Stone[] = [
  { from: 68.3, to: 70.3, y: 0.15 },
  { from: 71.6, to: 73.6, y: 0.3 },
  { from: 74.9, to: 76.9, y: 0.15 },
  { from: 78.2, to: 80.2, y: 0 },
];
const SHORE: Stone = { from: 81.5, to: 86, y: 0 };
/** The tussocks in the mist, between the lollipop and the cranes. */
const MIST: Stone[] = [
  { from: 151.4, to: 154, y: 0.2 },
  { from: 155.4, to: 158, y: 0 },
  { from: 159.4, to: 162, y: 0.3 },
  { from: 163.4, to: 166, y: 0.1 },
];

/** The two ways over water, each from firm ground to firm ground. */
const OUT: Stone[] = [{ from: -3, to: 10, y: 0 }, ...FIRM, ...SOFT_A, ISLAND, ...SOFT_B, SHORE];
const HOME: Stone[] = [{ from: 136, to: 150, y: 0 }, ...MIST, { from: 167.4, to: 190, y: 0 }];

/** A firm tussock in the ground's outline: up out of the water, across, and down again. */
const island = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];
const soft = (s: Stone): Tussock => ({ x: (s.from + s.to) / 2, y: s.y, width: s.to - s.from });
const round = (n: number) => Math.round(n * 100) / 100;

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[]): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.9), y: next.y } };
  });
}

/** The trail over water: one candy on each place to stand, and one in an arc over each hop. */
function over(way: Stone[], after?: string): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push({ x: round((here.to + next.from) / 2), y: round(Math.max(here.y, next.y) + 1.15), ...(after ? { after } : {}) });
    // The last place is firm ground with its own row.
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2), y: round(next.y + 0.45), ...(after ? { after } : {}) });
  }
  return out;
}

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2, after?: string): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: round(x), y: ground + 0.45, ...(after ? { after } : {}) });
  return out;
}

/** The ramp down from the boardwalk: from (128, 4.5) to (136, 0). */
const ramp = (x: number) => 4.5 - (4.5 * (x - 128)) / 8;

const CRANE = { from: { x: 182, y: 0 }, to: { x: 198, y: 8 }, rise: 5, time: 4.5, corridor: 0.5 };
/** A point on the crane's way, as the simulation flies it. */
function along(t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return {
    x: round(CRANE.from.x + (CRANE.to.x - CRANE.from.x) * k),
    y: round(CRANE.from.y + (CRANE.to.y - CRANE.from.y) * k + Math.sin(Math.PI * t) * CRANE.rise + 0.5),
    after: 'light',
  };
}

export const myren: ChapterData = {
  id: 'myren',
  place: 'bog',
  // The boardwalk and its ramp are planks.
  surfaces: [{ from: 104, to: 136, kind: 'wood' }],
  spawn: { x: 1, y: 0.01 },
  goalX: 197,
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the edge of the bog, and the tussocks
    { x: 10, y: 0 },
    { x: 10, y: DEEP },
    ...FIRM.flatMap(island),
    // 2. the soft tussocks float over the water; only the island between them is ground
    ...island(ISLAND),
    // 3. the pool's shore, the pool, and the boardwalk with its ramp down
    ...island(SHORE),
    { x: 94, y: DEEP },
    { x: 94, y: 0 },
    { x: 104, y: 0 },
    { x: 104, y: 4.5 },
    { x: 128, y: 4.5 },
    // 4. where the lollipop stands
    { x: 136, y: 0 },
    { x: 150, y: 0 },
    { x: 150, y: DEEP },
    // 5. the tussocks in the mist
    ...MIST.flatMap(island),
    // 6. and 7. the cranes' ground, and the hill the crane carries him onto
    { x: 167.4, y: DEEP },
    { x: 167.4, y: 0 },
    { x: 190, y: 0 },
    { x: 190, y: 8 },
    { x: 206, y: 8 },
    { x: 206, y: 20 },
  ],
  water: [
    { from: 10, to: 94, y: WATER },
    { from: 150, to: 167.4, y: WATER },
  ],
  tussocks: [...SOFT_A, ...SOFT_B].map(soft),
  checkpoints: [
    { x: 4, y: 0 },
    { x: 34, y: 0 },
    { x: 50.4, y: 0 },
    { x: 65, y: 0 },
    { x: 83.4, y: 0 },
    { x: 96.5, y: 0 },
    { x: 106.2, y: 4.5 },
    { x: 139, y: 0 },
    { x: 169.5, y: 0 },
    { x: 180, y: 0 },
  ],
  climbs: [
    // Mamma's braid, let down from the boardwalk.
    { x: 103.7, bottom: 0, top: 4.5, exit: 1, needs: 'braid' },
  ],
  spots: [
    { id: 'mamma', at: { x: 84.8, y: 0 }, verb: 'call', word: 'callMamma' },
    { id: 'braid', at: { x: 102.2, y: 0 }, verb: 'call', word: 'callMamma' },
    // The lollipop the ghost has stuck in the moss for him.
    { id: 'light', at: { x: 142, y: 0 }, verb: 'take', word: 'takeLight' },
    // The crane chick follows his light, and comes home when he reaches its family.
    { id: 'chick', at: { x: 156.7, y: 0 }, verb: 'take', touch: true, needs: 'light' },
    { id: 'home', at: { x: 176, y: 0 }, verb: 'take', touch: true, needs: 'chick' },
    { id: 'crane', at: { x: 182, y: 0 }, verb: 'take', word: 'climbOn', needs: 'home', ride: 'crane' },
  ],
  movers: [
    // The dead pine in the pool: Mamma's hands lift it across as a bridge.
    { id: 'pine', width: 8.6, height: 0.4, verb: 'pull', on: 'mamma', stops: [{ x: 90, y: -1.5 }, { x: 90, y: -0.4 }] },
  ],
  rides: [{ id: 'crane', ...CRANE }],
  jumps: [...hops(OUT), ...hops(HOME)],
  mist: { after: 'light' },
  follower: { at: { x: 156.7, y: 0 }, after: 'chick', until: 'home', home: { x: 177.4, y: 0 } },
  ghost: [
    { at: { x: 6, y: 0 } },
    { at: { x: 12.7, y: 0.2 } },
    { at: { x: 20.6, y: 0.3 } },
    { at: { x: 28.9, y: 0.35 } },
    { at: { x: 35, y: 0 } },
    { at: { x: 42.7, y: 0.8 } },
    { at: { x: 51.2, y: 0 } },
    { at: { x: 66, y: 0 } },
    { at: { x: 82.4, y: 0 } },
    // across the pool, and up on the boardwalk
    { at: { x: 98, y: 0 } },
    { at: { x: 109, y: 4.5 } },
    { at: { x: 118, y: 4.5 } },
    { at: { x: 126.5, y: 4.5 } },
    // it has left him the lollipop, and goes on into the mist
    { at: { x: 146.5, y: 0 } },
    { at: { x: 160.7, y: 0.3 } },
    // it waits on firm ground, and lets him come close
    { at: { x: 172.5, y: 0 }, near: 1.6 },
    { at: { x: 186.5, y: 0 }, near: 1.6 },
  ],
  beats: [{ id: 'spangen', at: 105.4, who: 'mamma', line: 'spangen' }],
  cameras: [
    { from: 9, to: 50, zoom: 1.2 },
    { from: 50, to: 83, zoom: 1.3 },
    { from: 84, to: 97, zoom: 1.25 },
    { from: 99, to: 132, zoom: 1.3, lift: 0.4 },
    { from: 150, to: 168, zoom: 1.2 },
    { from: 179, to: 204, zoom: 1.5, lift: 0.8 },
  ],
  candy: [
    // 1. the edge of the bog, the tussocks, 2. the soft ones
    ...row(2.6, 8.6, 0),
    ...over(OUT),
    { x: 83, y: 0.45 },
    { x: 85.2, y: 0.45 },
    // 3. over the pool where the pine will lie, and to the boardwalk
    ...row(87.5, 93.5, 0),
    ...row(95.5, 101.5, 0),
    { x: 103.7, y: 1.6 },
    { x: 103.7, y: 3.2 },
    ...row(105, 127, 4.5),
    { x: 129.5, y: round(ramp(129.5) + 0.45) },
    { x: 131.5, y: round(ramp(131.5) + 0.45) },
    { x: 133.5, y: round(ramp(133.5) + 0.45) },
    { x: 135.5, y: round(ramp(135.5) + 0.45) },
    // 4. the trail ends at the lollipop
    ...row(137, 141, 0),
    // In its light the trail shows again: 5. the tussocks in the mist, 6. the cranes' ground
    ...row(143.5, 149.5, 0, 2, 'light'),
    ...over(HOME, 'light'),
    ...row(168.5, 180.5, 0, 2, 'light'),
    // 7. up on the crane
    along(0.2),
    along(0.35),
    along(0.5),
    along(0.65),
    along(0.8),
  ],
};
