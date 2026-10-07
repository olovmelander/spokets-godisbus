import type { Candy, ChapterData, Jump, Vec } from '../../sim/types';
import { timeCard } from './cards';

/**
 * An extra chapter: Byn, the village's shopping street on a Saturday morning in October, in greybox rules
 * with its own look. It comes after the story is over: Elof has one more star, is small again, and follows
 * his friend along the pavement to the candy shop. Units: EL. The places, from the left:
 *
 * 1. **The pavement,** and **the kerb:** a cliff two Elofs high, down into the gutter.
 * 2. **The drain:** a grate in the gutter. Its bars are the way across, and the dark between them is deep.
 * 3. **The puddle:** a lake to him. A birch leaf lies at its shore: "Kliv på", and it sails him over.
 * 4. **The bicycle:** the candy lace on its pedal, and one swing over the well of a cellar window.
 * 5. **Under the awning:** last night's rain still drips from it. He reads the drops from their shadows.
 * 6. **The shop's step:** a matchbox on its edge, with a red ring. Pulled down, it is the way up. At the top
 *    the door stands ajar, and it smells of candy.
 * 7. **Inside the shop:** a warm wooden floor under shelves of enormous candy jars. His friend leads him
 *    past the doormat to a paper bag and the final candy. Passing shoes and cars stay behind his path.
 *
 * Nothing here is a real shop, and no house has a number: a shop is told by the wares in its window, and
 * nothing on the street is a letter (plan §0, §2.6).
 */

/** The drain and the well are this deep: a fall into either ends in the glitter bubble. */
const DEEP = -6;

/** A place to stand, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/** The gutter before the drain, the grate's four bars, and the street beyond it. */
const BARS: Stone[] = [
  { from: 19.4, to: 21.8, y: 0 },
  { from: 23.2, to: 25.6, y: 0 },
  { from: 27, to: 29.4, y: 0 },
  { from: 30.8, to: 33.2, y: 0 },
];
const WAY: Stone[] = [{ from: 12, to: 18, y: 0 }, ...BARS, { from: 34.6, to: 42, y: 0 }];

const round = (n: number) => Math.round(n * 100) / 100;
/** A bar in the ground's outline: up out of the dark, across, and down again. */
const bar = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[]): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.9), y: next.y } };
  });
}

/** The trail over the grate: one candy on each bar, and one in an arc over each hop. */
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

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: round(x), y: ground + 0.45 });
  return out;
}

/** The leaf's way over the puddle, and a candy where it is at `t` of that way. */
const LEAF = { from: { x: 40.6, y: 0 }, to: { x: 63.4, y: 0 }, rise: 0.15, time: 8, corridor: 0.3 };
function sailing(t: number): Candy {
  const k = t * t * (3 - 2 * t);
  return { x: Math.round((LEAF.from.x + (LEAF.to.x - LEAF.from.x) * k) * 10) / 10, y: Math.round((Math.sin(Math.PI * t) * LEAF.rise + 0.5) * 10) / 10 };
}

/** The shop's floor: the height of its stone step. */
const SHOP_FLOOR = 3.3;

export const byn: ChapterData = {
  id: 'byn',
  place: 'village',
  // The pavement's slabs, the grate's iron, and the shop's stone step. The rest is the street's own asphalt.
  surfaces: [
    { from: -19, to: 12, kind: 'paving' },
    ...BARS.map((b) => ({ from: b.from, to: b.to, kind: 'iron' as const })),
    { from: 110, to: 122, kind: 'stone' },
    { from: 122, to: 194, kind: 'wood' },
  ],
  shop: { door: 122, to: 178, floor: 3.3 },
  // What stands behind him, written by hand so that each place has the backdrop it wants (docs/art-bible.md
  // §2.3). A near wall is 7 EL behind the path: the bicycle leans on one, and the drops fall along one. The
  // crossing is open: the houses and the yard on its far side are 20 EL off, with the sky over the yard.
  // No upright part of a near wall (a casing, a pipe, a corner, a sign) stands behind a big candy or the hook.
  street: [
    // The yarn shop, pale, with lying boards. It stands on the pavement, and its window is behind the start.
    { from: -22, to: 12, depth: 'near', kind: 'house', wall: '#efe6c8', boards: 'lying', goods: 'yarn', windows: [{ from: -1.6, to: 5.4 }], pipes: [10.3] },
    // Across the crossing: the shoemaker's, the street's one Falu red house, in shade and haze...
    { from: 12, to: 38, depth: 'far', kind: 'house', foot: 1, wall: '#8f2d22', boards: 'upright', goods: 'boots', windows: [{ from: 14.4, to: 22.6 }], door: { from: 29.2, to: 35.2 }, sign: 26 },
    // ...and a yard behind the puddle: a grey fence, a birch and a hedge, and the far village and the sky.
    { from: 38, to: 62, depth: 'far', kind: 'yard', foot: 1 },
    // The bakery, white, with upright boards: the bicycle leans on its wall over the cellar window's well, the
    // first run of drops falls before its window, the dry place is the pier, and the second run is at its door.
    {
      from: 62, to: 110, depth: 'near', kind: 'house', wall: '#e9e6dc', boards: 'upright', goods: 'bread',
      windows: [{ from: 85.5, to: 90.7 }], door: { from: 96, to: 102 }, pipes: [63.7, 108.2], sign: 79.6, cellar: 74.2,
      // An awning over the window and one over the door, each a whole number of scallops: the drops fall from
      // their tips. The pier between them is dry.
      awnings: [{ from: 84.35, to: 92.05 }, { from: 94.2, to: 104.1 }],
    },
    // The sweet shop, ochre, up on the stone step: its window is the most colourful, and stands only here.
    { from: 110, to: 122, depth: 'near', kind: 'house', wall: '#e3b24c', boards: 'upright', goods: 'candy', windows: [{ from: 112.6, to: 119.4 }] },
  ],
  // Two lamp posts on the far pavement: one between the shoemaker's window and its sign, and one in the yard
  // behind the puddle. Neither stands behind a big candy, whichever way he faces at it.
  lampPosts: [23.2, 52],
  spawn: { x: 1, y: 2.01 },
  // Where and when, as the chapter opens (./cards.ts): a week after the story's Saturday.
  scenes: [timeCard('byn', 1)],
  goalX: 158,
  ground: [
    { x: -3, y: 14 },
    { x: -3, y: 2 },
    // 1. the pavement, and the kerb down into the gutter
    { x: 12, y: 2 },
    { x: 12, y: 0 },
    // 2. the drain
    { x: 18, y: 0 },
    { x: 18, y: DEEP },
    ...BARS.flatMap(bar),
    { x: 34.6, y: DEEP },
    { x: 34.6, y: 0 },
    // 3. the puddle: a pit to the simulation, with the water drawn in it
    { x: 42, y: 0 },
    { x: 42, y: -5 },
    { x: 62, y: -5 },
    { x: 62, y: 0 },
    // 4. the well of a cellar window, under the bicycle
    { x: 72, y: 0 },
    { x: 72, y: DEEP },
    { x: 76.4, y: DEEP },
    { x: 76.4, y: 0 },
    // 5. under the awning, and 6. the shop's step
    { x: 110, y: 0 },
    { x: 110, y: 3.3 },
    // 7. The open door and shop floor continue at the step's height: no invisible wall or scene reset.
    { x: 178, y: 3.3 },
    { x: 178, y: 20 },
  ],
  water: [{ from: 42, to: 62, y: -0.3 }],
  checkpoints: [
    { x: 8, y: 2 },
    { x: 15.6, y: 0 },
    { x: 37.6, y: 0 },
    { x: 66, y: 0 },
    { x: 83, y: 0 },
    { x: 93.2, y: 0 },
    { x: 105, y: 0 },
    { x: 115, y: 3.3 },
    // Append: older saves keep every existing checkpoint and candy index.
    { x: 128, y: 3.3 },
    { x: 150, y: 3.3 },
  ],
  hooks: [
    // The lace on the bicycle's pedal: one swing over the cellar window's well.
    { x: 73.5, y: 3.3, length: 2.7, land: { x: 77.8, y: 0 } },
    // In the shop: the rings of the two lamps over the floor, between the shelves. Out of the lace's reach
    // from the floor, and in reach from the top shelf. Each hangs on its flex from the ceiling.
    { x: 138, y: 8.8, length: 2.6, extra: true, hangs: 16 },
    { x: 142.4, y: 8.8, length: 2.6, extra: true, hangs: 16 },
  ],
  // The shop's shelves (docs/level-design.md): three steps of shelf up from the floor, the two lamps to swing
  // along, a long shelf to land on and a step down before the bag. A fall from any of it lands on the floor.
  // They stand on legs on the floor: the wall is far behind the jars.
  ledges: [
    { x: 130.6, y: SHOP_FLOOR + 0.9, width: 1.6, look: 'trestle' },
    { x: 132.8, y: SHOP_FLOOR + 1.7, width: 1.6, look: 'trestle' },
    { x: 135, y: SHOP_FLOOR + 2.5, width: 1.6, look: 'trestle' },
    { x: 146.2, y: SHOP_FLOOR + 2.5, width: 2.4, look: 'trestle' },
    { x: 148.6, y: SHOP_FLOOR + 1.7, width: 1.4, look: 'trestle' },
  ],
  // What a sweet shop keeps on its shelves: hearts and lollipops, one on every shelf and along both swings.
  side: [
    { x: 130.6, y: SHOP_FLOOR + 1.45 },
    { x: 132.8, y: SHOP_FLOOR + 2.25 },
    { x: 135, y: SHOP_FLOOR + 3.05 },
    { x: 136.7, y: SHOP_FLOOR + 3.3 },
    { x: 138, y: SHOP_FLOOR + 2.9 },
    { x: 139.5, y: SHOP_FLOOR + 3.3 },
    { x: 141, y: SHOP_FLOOR + 3.3 },
    { x: 142.4, y: SHOP_FLOOR + 2.9 },
    { x: 143.9, y: SHOP_FLOOR + 3.3 },
    { x: 146.2, y: SHOP_FLOOR + 3.05 },
    { x: 148.6, y: SHOP_FLOOR + 2.25 },
  ],
  movers: [
    // A matchbox on the step's edge, with a red ring: pulled down, it is the step up.
    { id: 'box', look: 'matchbox', width: 1.2, height: 1.5, verb: 'pull', ring: { x: -0.5, y: 0.3 }, stops: [{ x: 110.7, y: 3.3 }, { x: 109.3, y: 0 }] },
  ],
  // The awnings drip: a run of three under each, with the dry pier and a big candy between them.
  drips: [
    { at: { x: 86, y: 0 }, every: 1.8, first: 0.2 },
    { at: { x: 88.2, y: 0 }, every: 2.2, first: 1.1 },
    { at: { x: 90.4, y: 0 }, every: 1.6, first: 0.7 },
    { at: { x: 96, y: 0 }, every: 2, first: 0.4 },
    { at: { x: 98.2, y: 0 }, every: 1.5, first: 1.2 },
    { at: { x: 100.2, y: 0 }, every: 2.4, first: 0.9 },
  ],
  spots: [
    // The birch leaf at the puddle's shore: he steps on, and it sails him over.
    { id: 'leaf', at: { x: 40.6, y: 0 }, verb: 'take', word: 'board', ride: 'leaf' },
  ],
  rides: [{ id: 'leaf', look: 'leaf', ...LEAF }],
  jumps: [
    ...hops(WAY),
    { at: { x: 108.4, y: 0 }, dir: 1, land: { x: 109.3, y: 1.5 }, needs: 'box' },
    { at: { x: 109.5, y: 1.5 }, dir: 1, land: { x: 110.6, y: 3.3 }, needs: 'box' },
  ],
  // His friend goes ahead of him all the way, and in through the door.
  ghost: [
    { at: { x: 6, y: 2 } },
    { at: { x: 10.4, y: 2 } },
    { at: { x: 15, y: 0 } },
    { at: { x: 36.6, y: 0 } },
    { at: { x: 65.4, y: 0 } },
    { at: { x: 69.4, y: 0 } },
    { at: { x: 79.6, y: 0 } },
    { at: { x: 83.6, y: 0 } },
    { at: { x: 93.6, y: 0 } },
    { at: { x: 104, y: 0 } },
    { at: { x: 113, y: 3.3 } },
    { at: { x: 119.6, y: 3.3 }, near: 2.2 },
    { at: { x: 130, y: 3.3 } },
    { at: { x: 141, y: 3.3 } },
    { at: { x: 156, y: 3.3 }, near: 2.2 },
  ],
  beats: [
    { id: 'again', at: 1.4, who: 'elof', line: 'again' },
    { id: 'lake', at: 37.4, who: 'elof', line: 'lake' },
    { id: 'shop', at: 114, who: 'elof', line: 'shop' },
    { id: 'shopInside', at: 124, who: 'elof', line: 'shopInside' },
    { id: 'shopBag', at: 154, who: 'elof', line: 'shopBag' },
  ],
  cameras: [
    { from: 16, to: 36, zoom: 1.2 },
    { from: 40, to: 64, zoom: 1.3 },
    { from: 68, to: 80, zoom: 1.25, lift: 0.4 },
    { from: 84, to: 103, zoom: 1.25, lead: 3.2 },
    // Up on the shelves the picture rises with him, so that the lamps' rings and the far shelf are in it.
    { from: 129, to: 150, above: SHOP_FLOOR + 0.6, zoom: 1.8, lift: 1.4 },
    { from: 120, to: 178, zoom: 1.6 },
  ],
  candy: [
    // 1. the pavement, and down the kerb
    ...row(2.6, 10.6, 2),
    { x: 12.6, y: 1.6 },
    ...row(14, 16, 0),
    // 2. over the grate
    ...over(WAY),
    ...row(36, 40, 0),
    // 3. across the puddle on the leaf
    sailing(0.12),
    sailing(0.22),
    sailing(0.3),
    sailing(0.37),
    sailing(0.44),
    sailing(0.5),
    sailing(0.56),
    sailing(0.63),
    sailing(0.7),
    sailing(0.78),
    sailing(0.88),
    // 4. to the bicycle, along the swing, and the ramp of candy out of the well
    ...row(65, 71, 0),
    { x: 72.5, y: 0.8 },
    { x: 73.5, y: 0.6 },
    { x: 74.5, y: 0.8 },
    { x: 76, y: 1.75 },
    { x: 76.8, y: 1.6 },
    { x: 77.6, y: 0.8 },
    ...row(79.6, 81.6, 0),
    // 5. under the awning
    { x: 84.6, y: 0.45 },
    { x: 87.1, y: 0.45 },
    { x: 89.3, y: 0.45 },
    { x: 91.5, y: 0.45 },
    { x: 94.6, y: 0.45 },
    { x: 97.1, y: 0.45 },
    { x: 99.2, y: 0.45 },
    { x: 101.4, y: 0.45 },
    // 6. the shop's step
    ...row(104, 107.4, 0, 1.7),
    { x: 109.2, y: 2 },
    { x: 110.2, y: 3.8 },
    { x: 111.6, y: 3.75 },
    ...row(113.5, 121.5, 3.3),
    // New candy is appended, so every older collected index still points to the same sweet.
    ...row(123.5, 157.5, 3.3),
  ],
};
