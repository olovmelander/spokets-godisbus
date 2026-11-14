import type { ChapterData } from '../../sim/types';
import { HOME_LAYOUT } from '../home-layout';

/**
 * The bowl of Saturday sweets on the family's table, and the fistful the old trägubbe takes from it as he leaps after the
 * little one (Olov, 14 November 2026: "Vi behöver en godisskål … Det ska tydligt synas när han tar godiset ur skålen").
 * The trail is his: "han tog en näve lördagsgodis ur skålen när han hoppade" (docs/aventyr-2.md), and what is left of
 * that fistful is the golden geléhallon he gives Elof at the night's end. Here is where the bowl stands, when the leap
 * comes, and where he is at each moment of it; ./candy-bowl.ts draws it.
 *
 * - **Stormkvällen:** the bowl stands heaped on the table from the first picture. In the scene `fonstret`, once the gust
 *   has taken the little one, the old one leaps from the shelf down into the bowl, digs in, comes up with his arms full
 *   and leaps on out through the window, two sweets after him; four spill onto the table, and the bowl is half empty.
 * - **Morgonen efter:** the same bowl in the same place, with what was left (the decor's word `left`).
 * - **Äventyr 1's home** has no bowl: its Saturday sweets are in the bag the ghost takes.
 */

/** The top of the family's table from the floor: the room kit's `bord` (../../render/stage.ts). */
export const TABLE_TOP = 1.65;

/**
 * Where the bowl stands: on the table's left end, towards its front, clear of Mamma's candle and the flashlight, and of
 * the morning's cups, buns and thermos. `radius` is its rim's, `rim` how high its rim is over the table.
 */
export const BOWL = { x: HOME_LAYOUT.dining.x - 1.85, y: TABLE_TOP, z: HOME_LAYOUT.dining.z + 0.35, radius: 0.6, rim: 0.46 } as const;

/** The flag of the old one's leap from the shelf: the bowl's decor waits for it (`until`), and so does his place on the shelf. */
export const BOWL_LEAP = 'sk:leap';

/**
 * The flag of the scene the leap is in, when it is over. A game saved in it before the bowl was there has this and
 * not the leap's flag: the chapter sets the leap's from it (`sets`), and the bowl is then simply as he left it.
 */
export const LEAP_OVER = 'scene:fonstret';

/** The decor's word for the old one on the shelf who will leap for the bowl, and for the bowl the morning after. */
export const GRABS = 'grabs';
export const LEFT = 'left';

/**
 * The leap, in seconds from its flag: a crouch on the shelf, down through the room into the bowl (`lands`), where he
 * digs in and comes up with his arms full (`lifts`), a crouch there (`leaps`), and up and out through the window (`out`).
 */
export const GRAB = { crouch: 0.22, lands: 1.0, lifts: 1.9, leaps: 2.1, out: 2.95 } as const;

/** How high over the straight way each of his two leaps rises. */
const ARC = { down: 1.5, up: 1.25 } as const;

/** How deep in the heap his feet are while he stands in the bowl, over the table. */
export const IN_BOWL = 0.36;

export interface Point3 { x: number; y: number; z: number }

/** Where the old one is at a moment of his leap, and what he does there. */
export interface Grab {
  /** `shelf`: not yet. `down`, `bowl`, `up`: on his way. `gone`: out in the storm. */
  phase: 'shelf' | 'down' | 'bowl' | 'up' | 'gone';
  /** His feet. */
  at: Point3;
  /** How far through this part he is, 0 to 1. */
  k: number;
  /** How far he bends down into the sweets, 0 to 1, and how gathered up into his arms the fistful is, 0 to 1. */
  dig: number;
  gathered: number;
  /** How low he crouches before a leap, 0 to 1. */
  crouch: number;
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where he stands in the bowl. */
export const inBowl = (): Point3 => ({ x: BOWL.x, y: BOWL.y + IN_BOWL, z: BOWL.z });

/** A point `k` of the way along one of his leaps: straight across, and up over it in an arc. */
export function leapAt(from: Point3, to: Point3, rise: number, k: number): Point3 {
  return { x: mix(from.x, to.x, k), y: mix(from.y, to.y, k) + rise * 4 * k * (1 - k), z: mix(from.z, to.z, k) };
}

/**
 * The old one `since` seconds after the flag of his leap: `from` is where he stood on the shelf, `out` a point out in
 * the dark beyond the window. Before the flag (`since` below zero) he is on the shelf; after `GRAB.out` he is gone.
 */
export function grabAt(since: number, from: Point3, out: Point3): Grab {
  const bowl = inBowl();
  if (since < 0) return { phase: 'shelf', at: from, k: 0, dig: 0, gathered: 0, crouch: 0 };
  if (since < GRAB.crouch) return { phase: 'shelf', at: from, k: since / GRAB.crouch, dig: 0, gathered: 0, crouch: Math.sin(Math.PI * 0.5 * (since / GRAB.crouch)) };
  if (since < GRAB.lands) {
    const k = (since - GRAB.crouch) / (GRAB.lands - GRAB.crouch);
    return { phase: 'down', at: leapAt(from, bowl, ARC.down, k), k, dig: 0, gathered: 0, crouch: 0 };
  }
  if (since < GRAB.leaps) {
    const k = (since - GRAB.lands) / (GRAB.leaps - GRAB.lands);
    const digging = (since - GRAB.lands) / (GRAB.lifts - GRAB.lands);
    // Down into the sweets and up again with them; then a crouch for the leap out.
    const dig = digging < 1 ? Math.sin(Math.PI * Math.min(1, digging * 1.15)) : 0;
    const crouch = since < GRAB.lifts ? 0 : Math.sin(Math.PI * 0.5 * ((since - GRAB.lifts) / (GRAB.leaps - GRAB.lifts)));
    // He sinks a little as he lands, and stands up on the heap as he comes up with his arms full.
    const sink = 0.08 * Math.exp(-(since - GRAB.lands) * 9);
    return { phase: 'bowl', at: { x: bowl.x, y: bowl.y - sink - 0.1 * Math.max(0, dig), z: bowl.z }, k, dig: Math.max(0, dig), gathered: smooth((digging - 0.42) / 0.5), crouch };
  }
  if (since < GRAB.out) {
    const k = (since - GRAB.leaps) / (GRAB.out - GRAB.leaps);
    return { phase: 'up', at: leapAt(bowl, out, ARC.up, k), k, dig: 0, gathered: 1, crouch: 0 };
  }
  return { phase: 'gone', at: out, k: 1, dig: 0, gathered: 1, crouch: 0 };
}

/**
 * Where a chapter's old one leaps from and out to: his place on the shelf (the decor `tragubbe` with the word
 * `grabs`), and a point out in the dark beyond the window the storm blew open, a little to the bowl's side of its
 * middle. Null where nobody leaps for the bowl (the morning after).
 */
export function grabPlaces(chapter: Pick<ChapterData, 'decor' | 'house'>): { from: Point3; out: Point3 } | null {
  const stands = chapter.decor?.find((thing) => thing.look === 'tragubbe' && thing.word === GRABS);
  const window = chapter.decor?.find((thing) => thing.look === 'casement');
  if (!stands || !window || chapter.house?.opens === undefined) return null;
  return {
    from: { x: stands.at.x, y: stands.at.y, z: stands.z ?? 0 },
    out: { x: chapter.house.opens + 0.8, y: window.at.y + 0.3, z: HOME_LAYOUT.wall.z - 1.6 },
  };
}

/** The sweets in the bowl, heaped: what becomes of each when he comes. */
export type SweetPart = 'rest' | 'armful' | 'after' | 'spill';

export interface BowlSweet {
  /** Its place in the bowl, from the middle of the bowl's foot on the table. */
  at: Point3;
  /** How it lies: turned about the upright, and tipped. */
  turn: number;
  tip: number;
  part: SweetPart;
}

/**
 * The heap, layer by layer from the bowl's bottom: (height over the table, how far from the middle, how many, where the
 * first lies, what becomes of them). Seven at the bottom stay; of the others, four go in his arms, two fly out after
 * him and four spill onto the table: a fistful, for one as small as he, is most of what was heaped over the rim.
 */
const LAYERS: readonly (readonly [y: number, r: number, n: number, turn: number, parts: readonly SweetPart[]])[] = [
  [0.105, 0.17, 3, 0.2, ['rest', 'rest', 'rest']],
  [0.215, 0.31, 5, 0.9, ['rest', 'rest', 'spill', 'rest', 'rest']],
  [0.34, 0.35, 5, 0.3, ['spill', 'after', 'spill', 'after', 'spill']],
  [0.47, 0.23, 3, 1.3, ['armful', 'armful', 'armful']],
  [0.6, 0.0, 1, 0, ['armful']],
];

/** The same number from 0 to 1 for the same pair, every time. */
const fixed = (a: number, b: number) => { const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453; return s - Math.floor(s); };

/** Every sweet of the full bowl. */
export const BOWL_SWEETS: readonly BowlSweet[] = LAYERS.flatMap(([y, r, n, turn, parts], layer) => parts.map((part, i) => {
  const angle = turn + (Math.PI * 2 * i) / n;
  return {
    at: { x: Math.cos(angle) * r, y: y + 0.02 * (fixed(layer, i) - 0.5), z: Math.sin(angle) * r },
    // Along the ring it lies in, give or take, and tipped a little as it came to lie.
    turn: -angle + Math.PI / 2 + 0.7 * (fixed(i, layer + 3) - 0.5),
    tip: 0.5 * (fixed(layer + 7, i) - 0.5),
    part,
  };
}));

/** Where those that spill come to lie on the table, from the bowl's middle: beside it, towards the table's front. */
export const SPILLED: readonly Point3[] = [{ x: 0.92, y: 0.075, z: 0.34 }, { x: 0.64, y: 0.075, z: 0.6 }, { x: 1.22, y: 0.075, z: -0.08 }, { x: 1.36, y: 0.075, z: 0.5 }];

/** How many sweets are in the bowl before he comes, and after. */
export const BOWL_FULL = BOWL_SWEETS.length;
export const BOWL_LEFT = BOWL_SWEETS.filter((sweet) => sweet.part === 'rest').length;
