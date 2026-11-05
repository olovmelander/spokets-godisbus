import type { Candy, ChapterData, Jump, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, round, row, slopeRow, timeCard } from '../kit';

/**
 * Kapitel 3: Byn i stormen (docs/aventyr-2.md). The same village street as Byn, at ten o'clock on the storm's
 * night, further along: the power is out, every window is dark but for a few candles, and the rain runs down
 * the gutter towards the lake. Elof follows the old trägubbe's trail through it. Units: EL. The places, from
 * the left:
 *
 * 1. **The forest path** comes down onto the pavement, under the yarn shop's **flapping awning**. A loose
 *    flap of it lies on the pavement, a trampoline: it bounces him up to the tall stands under the awning,
 *    where hearts lie. A toy: nothing needs it.
 * 2. **Rännstensforsen:** down the kerb, the gutter is a rushing river. A birch leaf from the yard across the
 *    street lies at its shore: "Kliv på", and the current carries him the whole long way down it.
 * 3. **Gallret:** the drain's grate, five narrow bars over the deep dark, a hop from each to the next.
 * 4. **Moas paraply:** stone steps up a high wall. From its top he sees the crossing flooded. "Ropa på Moa":
 *    she holds her umbrella out to him, and he floats down under it to the far side.
 * 5. **The swinging sign:** the shoemaker's sign swings in the wind over the pavement. From the bench under
 *    it he can ride it up to the hearts over it and on to a stand. A toy too.
 * 6. **Fjun's cap:** the little figure's carved cap lies in the gutter. "Rännstenen rinner ner till sjön!"
 * 7. **Under the bakery's awnings** the rain pours off their scalloped edges. He reads the drops from their
 *    shadows, with a dry pier between the two runs. Then **the steps** go down to the lake's shore path.
 *
 * Nothing here is a real shop, and no house has a number: a shop is told by the wares in its window, and
 * nothing on the street is a letter (plan §0, §2.6). To the simulation the river and the crossing are pits,
 * with the water drawn in them.
 */

/** The drain is this deep, and the river's and the crossing's pits are 5 deep: a fall into any ends in the glitter bubble. */
const DEEP = -6;
/** The pavement over the gutter, and the high wall's top. */
const PAVEMENT = 2;
const WALL = 5;
/** The shore path, three steps under the street. */
const SHORE = -3;

/** A place to stand, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/** The street before the drain, the grate's five bars, and the street beyond it: one bar more than Byn's, each narrower. */
const BARS: Stone[] = [
  { from: 67.5, to: 69.3, y: 0 },
  { from: 70.8, to: 72.6, y: 0 },
  { from: 74.1, to: 75.9, y: 0 },
  { from: 77.4, to: 79.2, y: 0 },
  { from: 80.7, to: 82.5, y: 0 },
];
const WAY: Stone[] = [{ from: 62, to: 66, y: 0 }, ...BARS, { from: 84, to: 92, y: 0 }];

/** A bar in the ground's outline: up out of the dark, across, and down again. */
const bar = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[]): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.7), y: next.y } };
  });
}

/** The trail over the grate: one candy in an arc over each hop, and one on each bar. */
function over(way: Stone[]): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push({ x: round((here.to + next.from) / 2), y: round(Math.max(here.y, next.y) + 1.15) });
    // The last place is the street, with its own row.
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2), y: round(next.y + 0.45) });
  }
  return out;
}

/** The leaf's way down the gutter: longer than Byn's puddle, and quicker, as a river is. */
const LEAF = { from: { x: 36.4, y: 0 }, to: { x: 63.6, y: 0 }, rise: 0.15, time: 8, corridor: 0.3 };
/** Moa's umbrella: from the wall's edge, down over the flooded crossing, to the street on its far side. */
const UMBRELLA = { from: { x: 102.7, y: WALL }, to: { x: 119.6, y: 0 }, rise: 0.5, time: 4.5, corridor: 0.4 };

/** The high wall's stone steps: four risers, each a little under his reach, so he pulls himself up each. */
const STEP_RISE = 1.25;
const STEP_TREAD = 1.6;
const STEPS_FROM = 92;
const steps: Vec[] = Array.from({ length: 4 }, (_, i) => [
  { x: round(STEPS_FROM + i * STEP_TREAD), y: round(i * STEP_RISE) },
  { x: round(STEPS_FROM + i * STEP_TREAD), y: round((i + 1) * STEP_RISE) },
]).flat();
/** The wall's top, from the last riser to its edge over the crossing. */
const WALL_FROM = round(STEPS_FROM + 3 * STEP_TREAD);
const WALL_TO = 103;

export const stormbyn: ChapterData = {
  id: 'stormbyn',
  place: 'village',
  // The forest path's earth, the pavement's slabs, the grate's iron, the wall's stone and its steps, the steps
  // down, and the shore path. The rest is the street's own asphalt.
  surfaces: [
    { from: -3, to: 9, kind: 'earth' },
    { from: 9, to: 34, kind: 'paving' },
    ...BARS.map((b) => ({ from: b.from, to: b.to, kind: 'iron' as const })),
    { from: STEPS_FROM, to: WALL_TO, kind: 'stone' },
    { from: 164, to: 168, kind: 'stone' },
    { from: 168, to: 186, kind: 'earth' },
  ],
  // What stands behind him, written by hand (docs/art-bible.md §2.3), all of it dark: the power is out. A near
  // wall is 7 EL behind the path, a far one across the street 20 EL off. No upright part of a near wall stands
  // behind a big candy. A candle burns in each near window (`storm.glows`).
  street: [
    // The forest's edge: a fence, a birch and a hedge, the path coming down past them.
    { from: -22, to: 9, depth: 'far', kind: 'yard', foot: 1 },
    // The yarn shop on the pavement, with lying boards: its awning flaps over the window and the loose flap.
    {
      from: 9, to: 34, depth: 'near', kind: 'house', wall: '#d6ccb0', boards: 'lying', goods: 'yarn',
      windows: [{ from: 17, to: 24 }],
      // Seven scallops, its crank's rod at its left end.
      awnings: [{ from: 16.75, to: 24.45 }],
    },
    // Across the gutter river: a yard with the birch whose leaf he rides, and a lamp post on its pavement...
    { from: 34, to: 50, depth: 'far', kind: 'yard', foot: 1 },
    // ...the sweet shop, shut and dark, and the house with lying boards behind the grate.
    { from: 50, to: 66, depth: 'far', kind: 'house', foot: 1, wall: '#c9a24e', boards: 'upright', goods: 'candy', windows: [{ from: 54.6, to: 61.4 }] },
    { from: 66, to: 92, depth: 'far', kind: 'house', foot: 1, wall: '#a9b2a4', boards: 'lying', goods: 'yarn', windows: [{ from: 69, to: 76 }], door: { from: 81, to: 87 } },
    // The crossing: open, with a low fence across it, the second lamp post standing in the flood's mirror.
    { from: 92, to: 118, depth: 'far', kind: 'yard', foot: 1, lowFence: true },
    // The shoemaker's, whose sign swings over the pavement in front of its window.
    { from: 118, to: 142, depth: 'near', kind: 'house', wall: '#b7ab90', boards: 'upright', goods: 'boots', windows: [{ from: 124.2, to: 132.4 }] },
    // The bakery, plaster: an awning over its window and one over its door, the dry pier between them.
    {
      from: 142, to: 164, depth: 'near', kind: 'house', wall: '#dedbcd', boards: 'upright', finish: 'plaster', goods: 'bread',
      windows: [{ from: 144.8, to: 150 }], door: { from: 155.2, to: 161.2 },
      // Six scallops each: the drops fall from their tips.
      awnings: [{ from: 144.25, to: 150.85 }, { from: 154.6, to: 161.2 }],
    },
    // Down the steps: the shore, with a low fence, and the lake's sky over it.
    { from: 164, to: 186, depth: 'far', kind: 'yard', foot: -2, lowFence: true },
  ],
  // Two lamp posts on the far pavement, dark tonight: one in the yard across the river, one at the far end of
  // the flooded crossing, out of the tall picture from the wall's top. Neither stands behind a big candy.
  lampPosts: [44.4, 114.4],
  storm: { bouncers: 'awning', rain: 0.85,
    lightning: 9,
    // The whole village is dark. A candle is lit in each near window when he pulls the shop's bell cord: someone is awake,
    // and has heard. The same thing he does for his own family on the jetty, at the end of the night.
    glows: [
      { at: { x: 20.5, y: PAVEMENT + 3.4 }, z: -6, size: 5, after: 'sb:bell-yarn' },
      { at: { x: 128.3, y: 3.4 }, z: -6, size: 5, after: 'sb:bell-shoes' },
      { at: { x: 147.4, y: 3.4 }, z: -6, size: 5, after: 'sb:bell-bread' },
    ],
  },
  coda: 'moa',
  spawn: { x: 1, y: 3.01 },
  // Where and when, as the chapter opens.
  scenes: [timeCard('stormbyn', 1)],
  goalX: 180,
  ground: [
    { x: -3, y: 14 },
    { x: -3, y: 3 },
    // 1. the forest path, down onto the pavement, and the kerb
    { x: 4, y: 3 },
    { x: 9, y: PAVEMENT },
    { x: 34, y: PAVEMENT },
    { x: 34, y: 0 },
    // 2. the gutter river: a pit to the simulation, with the water drawn in it
    { x: 38, y: 0 },
    { x: 38, y: -5 },
    { x: 62, y: -5 },
    { x: 62, y: 0 },
    // 3. the grate
    { x: 66, y: 0 },
    { x: 66, y: DEEP },
    ...BARS.flatMap(bar),
    { x: 84, y: DEEP },
    { x: 84, y: 0 },
    // 4. the stone steps up the high wall, and the flooded crossing under it
    ...steps,
    { x: WALL_TO, y: WALL },
    { x: WALL_TO, y: -5 },
    { x: 118, y: -5 },
    { x: 118, y: 0 },
    // 5. the swinging sign, 6. the cap in the gutter, 7. the awnings, and the steps down to the shore
    { x: 164, y: 0 },
    { x: 164, y: -1 },
    { x: 166, y: -1 },
    { x: 166, y: -2 },
    { x: 168, y: -2 },
    { x: 168, y: SHORE },
    { x: 186, y: SHORE },
    { x: 186, y: 12 },
  ],
  water: [
    { from: 38, to: 62, y: -0.3 },
    { from: WALL_TO, to: 118, y: -0.3 },
  ],
  checkpoints: [
    { x: 12, y: PAVEMENT },
    { x: 35.8, y: 0 },
    { x: 64.4, y: 0 },
    { x: 86.6, y: 0 },
    { x: 97.8, y: WALL },
    { x: 121.4, y: 0 },
    { x: 137, y: 0 },
    // The dry pier between the awnings.
    { x: 152.6, y: 0 },
    { x: 172, y: SHORE },
  ],
  // The loose flap of the awning: down on it from a jump, it bounces him up under the awning.
  bouncers: [{ x: 19, y: PAVEMENT + 0.5, lift: 2.8 }],
  // Each stands on its legs on the pavement: the near walls are far behind them (src/render/ledges.ts).
  ledges: [
    // The yarn shop's tall stands under the awning, a hop apart: up there only from the flap. A fall from one
    // is a soft landing.
    { x: 21.2, y: 4.7, width: 1.8, look: 'trestle' },
    { x: 24.6, y: 4.7, width: 2, look: 'trestle' },
    { x: 28, y: 4.7, width: 1.8, look: 'trestle' },
    // The bench under the swinging sign, a jump high, and a stand just beyond the end of the sign's swing:
    // out of reach of any jump from the pavement or the bench, a hop or a step down from the sign.
    { x: 126.2, y: 1, width: 1.6, look: 'trestle' },
    { x: 133.3, y: 2, width: 1.4, look: 'trestle' },
  ],
  movers: [
    // The shoemaker's sign, swinging on its bracket: its top is in reach from the bench while it swings low.
    // It is above his head on the pavement.
    {
      id: 'swing-sign', look: 'swing-sign', width: 1.6, height: 0.25, verb: 'push', extra: true,
      cycle: { seconds: 3.6 }, stops: [{ x: 128.8, y: 1.55 }, { x: 131.6, y: 1.95 }],
    },
  ],
  // Hearts over the stands and the swinging sign; the first of each way is its tell.
  side: [
    // The flap and the stands: one over the flap, then over each stand and each hop between them.
    { x: 19, y: 4.8 },
    { x: 21.2, y: 5.25 },
    { x: 22.9, y: 5.85 },
    { x: 24.6, y: 5.25 },
    { x: 26.3, y: 5.85 },
    { x: 28, y: 5.25 },
    // The bench, three over the sign's swing, and the stand beyond it.
    { x: 126.2, y: 1.55 },
    { x: 129.2, y: 3.5 },
    { x: 130.6, y: 3.6 },
    { x: 132, y: 3.5 },
    { x: 133.3, y: 2.55 },
  ],
  // The bakery's awnings pour: a run of three under each, with the dry pier and a big candy between them.
  drips: [
    { at: { x: 145.9, y: 0 }, every: 1.8, first: 0.3 },
    { at: { x: 148.1, y: 0 }, every: 2.2, first: 1.2 },
    { at: { x: 150.3, y: 0 }, every: 1.6, first: 0.7 },
    { at: { x: 156.25, y: 0 }, every: 2, first: 0.5 },
    { at: { x: 158.45, y: 0 }, every: 1.5, first: 1.1 },
    { at: { x: 160.65, y: 0 }, every: 2.4, first: 0.9 },
  ],
  decor: [
    // The shops' blinds are down for the night, until someone wakes and raises one.
    { look: 'blind', word: '7.6', at: { x: 20.5, y: PAVEMENT + 2.5 }, z: -6.1, until: 'sb:bell-yarn' },
    { look: 'blind', word: '8.8', at: { x: 128.3, y: 2.5 }, z: -6.1, until: 'sb:bell-shoes' },
    { look: 'blind', word: '5.8', at: { x: 147.4, y: 2.5 }, z: -6.1, until: 'sb:bell-bread' },
  ],
  spots: [
    // The shops' bell cords, down from their awnings and signs: each wakes someone behind a dark window.
    { id: 'sb:bell-yarn', look: 'bellCord', at: { x: 26.5, y: PAVEMENT }, verb: 'call', word: 'sbRing' },
    { id: 'sb:bell-shoes', look: 'bellCord', at: { x: 134, y: 0 }, verb: 'call', word: 'sbRing' },
    { id: 'sb:bell-bread', look: 'bellCord', at: { x: 153.2, y: 0 }, verb: 'call', word: 'sbRing' },
    // The birch leaf at the river's shore: he steps on, and the current carries him.
    { id: 'leaf', at: LEAF.from, verb: 'take', word: 'board', ride: 'leaf' },
    // On the wall: he calls Moa, and she holds her umbrella out; then he takes hold of it at the edge.
    { id: 'umbrella:ready', look: 'sign', at: { x: 99.6, y: WALL }, verb: 'call', word: 'callMoa' },
    { id: 'umbrella', at: { x: 102.6, y: WALL }, verb: 'take', word: 'sbUmbrella', needs: 'family:umbrella-ready', ride: 'umbrella' },
    // The little one's carved cap, in the gutter: he finds it by coming close.
    { id: 'cap', look: 'tiny-cap', at: { x: 139.4, y: 0 }, verb: 'take', touch: true },
  ],
  rides: [
    { id: 'leaf', look: 'leaf', ...LEAF },
    { id: 'umbrella', look: 'umbrella', ...UMBRELLA },
  ],
  later: [{ flag: 'family:umbrella-ready', after: 'umbrella:ready', until: 'umbrella', within: [95, 104], seconds: 1.4, hold: true }],
  jumps: hops(WAY),
  // Klonk goes ahead of him all the way: over the river, along the bars, up the wall and across the flood.
  // At the cap it shows him what it is thinking of.
  ghost: [
    { at: { x: 7, y: 2.4 } },
    { at: { x: 16, y: PAVEMENT } },
    { at: { x: 26.4, y: PAVEMENT } },
    { at: { x: 32.6, y: PAVEMENT } },
    { at: { x: 65.2, y: 0 } },
    { at: { x: 71.7, y: 0 } },
    { at: { x: 78.3, y: 0 } },
    { at: { x: 90.4, y: 0 } },
    { at: { x: 96, y: 3 * STEP_RISE } },
    { at: { x: 102.2, y: WALL } },
    { at: { x: 125.4, y: 0 } },
    { at: { x: 133.6, y: 0 } },
    { at: { x: 144, y: 0 }, thought: { picture: 'small-figure', after: 'cap' } },
    { at: { x: 156, y: 0 } },
    { at: { x: 165, y: -1 } },
    { at: { x: 175.6, y: SHORE } },
    { at: { x: 183.4, y: SHORE } },
  ],
  beats: [
    { id: 'sbDark', at: 1.6, who: 'elof', line: 'sbDark' },
    { id: 'sbKlonkHere', at: 4.6, who: 'spoket', line: 'sbKlonkHere' },
    { id: 'sbAwning', at: 14, who: 'elof', line: 'sbAwning' },
    { id: 'sbCandle', on: 'sb:bell-yarn', who: 'elof', line: 'sbCandle' },
    { id: 'sbCandleTwo', on: 'sb:bell-shoes', who: 'elof', line: 'sbCandleTwo' },
    { id: 'sbCandleThree', on: 'sb:bell-bread', who: 'elof', line: 'sbCandleThree' },
    { id: 'sbRiver', at: 34.4, who: 'elof', line: 'sbRiver' },
    { id: 'family:moa', at: 97.4, until: 'umbrella:ready', who: 'moa', line: 'sbMoaHere', read: true },
    { id: 'family:umbrella', on: 'family:umbrella-ready', until: 'umbrella', within: [95, 104], who: 'moa', line: 'sbMoaHold', read: true },
    { id: 'sbFloat', on: 'umbrella', within: [100, 120], who: 'elof', line: 'sbFloat' },
    { id: 'sbLanded', at: 120.6, needs: 'umbrella', who: 'moa', line: 'sbMoaLanded' },
    { id: 'sbCap', on: 'cap', who: 'elof', line: 'sbCap' },
    { id: 'sbToLake', on: 'cap', who: 'elof', line: 'sbToLake', read: true },
    { id: 'sbKlonkCap', on: 'cap', who: 'spoket', line: 'sbKlonkCap' },
    { id: 'sbShore', at: 176, who: 'elof', line: 'sbShore' },
  ],
  cameras: [
    // Up under the awning the picture rises with him, so that the stands and the hearts are in it.
    { from: 18, to: 30, above: 4.2, zoom: 1.35, lift: 0.8 },
    { from: 36, to: 66, zoom: 1.5, lift: 0.6 },
    { from: 66, to: 86, zoom: 1.2 },
    // From the steps over the crossing the picture is wide, so that the far side is in it before he floats.
    { from: 90, to: 122, zoom: 1.55, lift: 1.2 },
    { from: 124, to: 136, zoom: 1.25, lift: 0.5 },
    { from: 143, to: 162, zoom: 1.25, lead: 3.2 },
    { from: 164, to: 186, zoom: 1.3 },
  ],
  candy: [
    // 1. down the forest path, along the pavement, and down the kerb
    ...row(2.6, 3.6, 3),
    ...slopeRow(4.6, 8.6, 4, 3, 9, PAVEMENT),
    ...row(10.6, 32.6, PAVEMENT),
    { x: 34.6, y: 1.5 },
    { x: 35.8, y: 0.45 },
    // 2. down the gutter river on the leaf
    ...alongAll(LEAF, [0.1, 0.18, 0.26, 0.33, 0.4, 0.46, 0.52, 0.58, 0.65, 0.72, 0.8, 0.9]),
    { x: 65, y: 0.45 },
    // 3. over the grate
    ...over(WAY),
    ...row(85.2, 91.2, 0),
    // 4. up the steps, along the wall, and down under the umbrella
    ...[1, 2, 3, 4].map((i) => ({ x: round(STEPS_FROM + (i - 0.5) * STEP_TREAD), y: round(i * STEP_RISE + 0.45) })),
    ...row(WALL_FROM + 0.8, 101.6, WALL, 1.6),
    ...alongAll(UMBRELLA, [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94]),
    // 5. past the swinging sign, and 6. to the cap
    ...row(121.6, 141.6, 0),
    // 7. under the awnings, between the drops, and down the steps to the shore
    { x: 143.6, y: 0.45 },
    { x: 144.8, y: 0.45 },
    { x: 147, y: 0.45 },
    { x: 149.2, y: 0.45 },
    { x: 151.4, y: 0.45 },
    { x: 153.6, y: 0.45 },
    { x: 155.15, y: 0.45 },
    { x: 157.35, y: 0.45 },
    { x: 159.55, y: 0.45 },
    { x: 161.75, y: 0.45 },
    { x: 163.4, y: 0.45 },
    { x: 165, y: -0.55 },
    { x: 167, y: -1.55 },
    { x: 169, y: SHORE + 0.45 },
    ...row(171, 179, SHORE),
  ],
};

/** What "Just nu" says here: along the street, at the river, at Moa's wall, and once the cap is found. */
export const context: Chooser = (has, player) => {
  if (has('cap')) return ['sbLake', 'sbFamily', 'water'];
  if (has('umbrella') || player.x >= WALL_TO + 4) return ['sbGutter', 'sbFamily', 'village'];
  if (has('umbrella:ready')) return ['sbBoard', 'sbMoa', 'village', 'moa'];
  if (player.x >= 89) return ['sbCallMoa', 'sbMoa', 'village', 'moa'];
  if (player.x >= 62) return ['sbGrate', 'sbFamily', 'village'];
  if (player.x >= 33) return ['sbRiver', 'sbFamily', 'water'];
  return ['sbStreet', 'sbFamily', 'village'];
};
