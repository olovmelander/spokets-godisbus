import type { Candy, ChapterData, Jump, Ledge, Mover, Tussock, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { hopCandy, round, row, slopeRow, timeCard } from '../kit';

/**
 * Kapitel 4: Sjön (docs/aventyr-2.md), the lake shore in the storm. Units: EL. The places, from the left:
 *
 * 1. **Strandstenarna:** wet stones in the shallows, a hop of water between each, and a stone too high to jump
 *    onto. A reed stands at its foot, and he climbs it like a stem. Over the first stones, three stone shelves
 *    are a second way, and on top of the high stone a bent reed leads up to a leaf.
 * 2. **Gungflyet:** floating mats of reeds that sink while he stands on them; the glitter bubble takes him back
 *    from one that has sunk. A stone in the middle splits the stretch. Klonk does not sink: it is wood. On the
 *    far shore a flash shows the little trägubbe blown out over the lake.
 * 3. **Bryggan:** the jetty, where the waves wash over the planks in gusts. Behind each post is a lee. The old
 *    trägubbe stands far out on the planks, and leaps away into the dark.
 * 4. **Mammas båt:** the jetty has broken off. "Ropa på Mamma": she rows up and holds the rowing boat against
 *    both broken ends, and its gunwale is the way on. After it, on the outer jetty, two benches up, three
 *    loose planks bobbing on the waves and a last bench are a second way, with sweets on them.
 * 5. **Barkflotten** (the puzzle): the last planks are gone, and the gap is too wide to jump. A big piece of
 *    bark lies on the jetty. Bark floats, like Klonk: pushed three times, it slides into the gap and floats
 *    there, a stepping stone at walking height.
 * 6. **The jetty's end:** a flash, and far out on a stone in the lake the old trägubbe holds the little one.
 *    "Där! På stenen ute i sjön!" Wood floats: they are safe.
 *
 * To the simulation the open water is a pit; its surface is where the glitter bubble catches him.
 */

/** Open water is a pit this deep to the simulation, and its surface is here, as in Myren. */
const DEEP = -6;
const WATER = -0.6;

/** A place to stand: a stone, a reed mat, a stretch of jetty, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/** The stones in the shallows: a step up from the sand, and a hop over water to each of the others. */
const STONES: Stone[] = [
  { from: 8, to: 11, y: 0.6 },
  { from: 12.4, to: 15, y: 0.9 },
  { from: 16.4, to: 19, y: 0.5 },
];
/** The high stone with the reed at its foot: more than two jumps high. Steps of stone lead down its far side. */
const HIGH = { from: 26.5, to: 33, y: 2.9 };
const STEP = { from: 33, to: 35.2, y: 1.5 };

/** Gungflyet: three mats, a firm stone to rest on, four mats, and the shore before the jetty. */
const SHORE: Stone = { from: 35.2, to: 46, y: 0 };
const MATS_A: Stone[] = [
  { from: 47.3, to: 49.3, y: 0 },
  { from: 50.6, to: 52.6, y: 0.15 },
  { from: 53.9, to: 55.9, y: 0 },
];
const ISLAND: Stone = { from: 57.2, to: 61.6, y: 0 };
const MATS_B: Stone[] = [
  { from: 62.9, to: 64.9, y: 0.15 },
  { from: 66.2, to: 68.2, y: 0.3 },
  { from: 69.5, to: 71.5, y: 0.15 },
  { from: 72.8, to: 74.8, y: 0 },
];
const LANDING: Stone = { from: 76.1, to: 80, y: 0 };

/** The jetty's planks, a step up from the shore. */
const DECK = 0.6;
const JETTY = { from: 80, to: 126 };
/** The posts: the lee from each wave. As on Berget, a dash from one to the next takes half the calm between. */
const POSTS = [86, 91.2, 96.4, 101.6, 106.8, 112];
/** Where it has broken off: Mamma's boat lies along the gap, and its gunwale is level with the planks. */
const BREAK = { from: 126, to: 132 };
const GUNWALE: Ledge = { x: (BREAK.from + BREAK.to) / 2, y: DECK, width: BREAK.to - BREAK.from + 0.2, look: 'plank', needs: 'sjon:boat' };
/** The outer jetty, its far end pushed down into the water by the waves, and the bark lying on it. */
const OUTER = { from: 132, to: 146 };
const SAG = { from: 146, to: 149 };
const LOW: Stone = { from: 149, to: 156, y: 0 };
/**
 * The gap where the last planks have gone: too wide for a jump. The bark floats in its middle with its top level
 * with the planks, and the hop to it and the hop off it are each as wide as a hop between two reed mats.
 */
const RAFT: Stone = { from: 157.3, to: 159.3, y: 0 };
const FAR: Stone = { from: 160.6, to: 163, y: 0 };
/** The jetty's last stretch, on its stone crib: a step up again, out to the end post. */
const END = { from: 163, to: 180 };

/**
 * The bark (the puzzle): a thick piece, lying on the low planks, and each push moves it on along them. The third
 * slides it off the edge into the gap, where it floats as wood does, mostly under water, with its top at his feet.
 * It is taller than he pulls himself up (LEDGE_REACH), so a run stops at it, with Knuffa on the button; only a
 * jump climbs it, as on Granskogen's cone.
 */
const BARK_HIGH = 1.5;
const BARK: Mover = {
  id: 'sjon-bark', look: 'bark', width: RAFT.to - RAFT.from, height: BARK_HIGH, verb: 'push',
  stops: [{ x: 151.6, y: 0 }, { x: 153.4, y: 0 }, { x: 155, y: 0 }, { x: (RAFT.from + RAFT.to) / 2, y: RAFT.y - BARK_HIGH }],
};

/**
 * Over the first stones, a second way (docs/level-design.md): a stone shelf a held jump over the second stone,
 * well past where the hop onto it lands; a second a held jump over the first, hanging over the water; and a third
 * level with it over the third stone, a jump across. He walks off its end onto the sand. A hop along the trail
 * tops out under all three.
 */
const SHELVES: Ledge[] = [
  { x: 14, y: 1.85, width: 1.4, look: 'stone' },
  { x: 15.4, y: 2.75, width: 1.6, look: 'stone' },
  { x: 18, y: 2.75, width: 1.8, look: 'stone' },
];

/**
 * On the high stone a reed is bent over: its stem begins a held jump over the stone, out of reach of his feet as
 * he walks under it, and he climbs it to a reed leaf held out flat. He walks off the leaf's far end, down onto
 * the stone or the step below it.
 */
const BENT_REED = { x: 30.6, bottom: 3.8, top: 5.5, exit: 1 as const, look: 'root' as const };
const REED_LEAF: Ledge = { x: 31.9, y: 5.5, width: 1.8, look: 'leaf' };

/**
 * On the outer jetty, a second way: a bench and a higher one, a held jump each, then three loose planks that bob
 * on the waves, and a last bench over the sagging end. The planks ride high enough that he walks under them on
 * the jetty, and each is a jump from the last. Only the sweets are on them.
 */
const BENCHES: Ledge[] = [
  { x: 137.2, y: DECK + 0.9, width: 1.4, look: 'trestle' },
  { x: 138.2, y: DECK + 1.8, width: 1.4, look: 'trestle' },
  { x: 147.6, y: DECK + 2, width: 1.6, look: 'trestle' },
];
const PLANK = { width: 1.6, height: 0.25, low: 2.3, high: 2.7, seconds: 3.2 };
const PLANKS: Mover[] = [140.5, 142.9, 145.3].map((x, i) => ({
  id: `sjon-plank-${i + 1}`, look: 'jetty-plank', width: PLANK.width, height: PLANK.height, verb: 'push', extra: true,
  cycle: { seconds: PLANK.seconds, phase: i * 1.1 },
  stops: [{ x, y: PLANK.low }, { x, y: PLANK.high }],
}));

/** A stone, a mat or a stretch of jetty in the ground's outline: up out of the water, across, and down again. */
const island = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];
const mat = (s: Stone): Tussock => ({ x: (s.from + s.to) / 2, y: s.y, width: s.to - s.from });
/** A side candy over the middle of a ledge: he takes it standing there, and not from the ground under it. */
const above = (ledge: { x: number; y: number }, lift = 0.55): Candy => ({ x: ledge.x, y: round(ledge.y + lift) });

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[], extra: Partial<Jump> = {}): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.9), y: next.y }, ...extra };
  });
}

/** The trail over water: one candy in an arc over each hop, and one on each place to stand but the last. */
function over(way: Stone[]): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push(hopCandy({ x: here.to, y: here.y }, { x: next.from, y: next.y }, 1.15));
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2, 1), y: round(next.y + 0.45) });
  }
  return out;
}

const GUNGFLY: Stone[] = [SHORE, ...MATS_A, ISLAND, ...MATS_B, LANDING];
const BARK_WAY: Stone[] = [LOW, RAFT, FAR];

export const sjon: ChapterData = {
  id: 'sjon',
  // Its water and its reed mats are the bog's, at the lake's edge.
  place: 'bog',
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (src/content/chapters/cards.ts).
  scenes: [timeCard('sjon', 1)],
  goalX: 173,
  // Mamma answers from the boat in the coda.
  coda: 'mamma',
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the beach, the stones in the shallows, the sand, and the high stone with its steps down
    { x: 8, y: 0 },
    { x: 8, y: STONES[0]!.y },
    { x: 11, y: STONES[0]!.y },
    { x: 11, y: DEEP },
    ...island(STONES[1]!),
    { x: STONES[2]!.from, y: DEEP },
    { x: STONES[2]!.from, y: STONES[2]!.y },
    { x: STONES[2]!.to, y: STONES[2]!.y },
    { x: STONES[2]!.to, y: 0 },
    { x: HIGH.from, y: 0 },
    { x: HIGH.from, y: HIGH.y },
    { x: HIGH.to, y: HIGH.y },
    { x: STEP.from, y: STEP.y },
    { x: STEP.to, y: STEP.y },
    { x: STEP.to, y: 0 },
    // 2. the shore, the reed mats float over the water, and the stone between them is ground
    { x: SHORE.to, y: 0 },
    { x: SHORE.to, y: DEEP },
    ...island(ISLAND),
    { x: LANDING.from, y: DEEP },
    { x: LANDING.from, y: 0 },
    // 3. the jetty, up a plank's height from the shore
    { x: JETTY.from, y: 0 },
    { x: JETTY.from, y: DECK },
    { x: JETTY.to, y: DECK },
    // 4. where it has broken off
    { x: BREAK.from, y: DEEP },
    { x: BREAK.to, y: DEEP },
    { x: BREAK.to, y: DECK },
    // 5. the outer jetty, its end sagging into the water, and the gap where its planks have gone
    { x: OUTER.to, y: DECK },
    { x: SAG.to, y: LOW.y },
    { x: LOW.to, y: LOW.y },
    { x: LOW.to, y: DEEP },
    { x: FAR.from, y: DEEP },
    { x: FAR.from, y: FAR.y },
    // 6. up onto the last stretch, out to the end post
    { x: END.from, y: FAR.y },
    { x: END.from, y: DECK },
    { x: END.to, y: DECK },
    { x: END.to, y: 9 },
  ],
  water: [
    { from: 11, to: 16.4, y: WATER },
    { from: SHORE.to, to: LANDING.from, y: WATER },
    { from: BREAK.from, to: BREAK.to, y: WATER },
    { from: LOW.to, to: FAR.from, y: WATER },
  ],
  tussocks: [...MATS_A, ...MATS_B].map(mat),
  surfaces: [
    { from: 8, to: STONES[2]!.to, kind: 'stone' },
    { from: HIGH.from, to: STEP.to, kind: 'stone' },
    { from: ISLAND.from, to: ISLAND.to, kind: 'stone' },
    { from: JETTY.from, to: JETTY.to, kind: 'wood' },
    { from: OUTER.from, to: LOW.to, kind: 'wood' },
    { from: FAR.from, to: END.to, kind: 'wood' },
  ],
  // The waves over the jetty: every four seconds one washes over for a little more than one, and the posts are
  // the lee, as the boulders are on Berget. The planks between the first post and the last are level and whole.
  gusts: [{ from: POSTS[0]!, to: POSTS[POSTS.length - 1]!, y: DECK, every: 4, length: 1.4, first: 0.5, shelters: POSTS }],
  checkpoints: [
    { x: 4, y: 0 },
    { x: 22, y: 0 },
    { x: 41, y: 0 },
    { x: 59.4, y: 0 },
    { x: 83.4, y: DECK },
    { x: 114.4, y: DECK },
    { x: 134.2, y: DECK },
    { x: 161.8, y: 0 },
  ],
  climbs: [
    // The reed at the foot of the high stone: he climbs it like a stem and steps off onto the top.
    { x: HIGH.from - 0.3, bottom: 0, top: HIGH.y, exit: 1, look: 'root' },
    BENT_REED,
  ],
  ledges: [...SHELVES, REED_LEAF, ...BENCHES, GUNWALE],
  spots: [
    // At the broken end: Mamma rows up with the boat when he calls.
    { id: 'sjon:mamma', look: 'sign', at: { x: 124, y: DECK }, verb: 'call', word: 'callMamma' },
  ],
  movers: [BARK, ...PLANKS],
  jumps: [
    ...hops(STONES),
    ...hops(GUNGFLY),
    // Onto the bark and off it, once it floats in the gap.
    ...hops(BARK_WAY, { needs: BARK.id }),
  ],
  // The storm, for the picture: rain, a flash now and then, what three flashes show, and Mamma's lantern in the
  // boat once she has rowed up.
  storm: { shelters: 'posts',
    rain: 0.8,
    lightning: 8,
    flybys: [
      // On the far shore of the reed mats: the little one, blown out over the lake.
      { on: 'beat:sjon:flash', from: { x: 70, y: 9 }, to: { x: 118, y: 12 }, seconds: 2.6, who: 'lillgubbe' },
      // The old one, far out on the planks, leaps on into the dark when he comes.
      { on: 'beat:sjon:old-one', from: { x: 116.5, y: 1.4 }, to: { x: 150, y: 6 }, seconds: 2.2, who: 'tragubbe' },
      // At the end: the little one comes down out of the storm onto the stone, where the old one catches it.
      { on: 'beat:sjon:there', from: { x: 168, y: 11 }, to: { x: 176, y: 0.4 }, seconds: 1.6, who: 'lillgubbe' },
    ],
    glows: [{ at: { x: 129, y: 1.6 }, z: -1.2, size: 1, after: 'sjon:mamma' }],
  },
  decor: [
    // Reeds along the shore, among the mats and at the foot of the jetty. Two of them are climbed.
    ...[5.2, 7.4, 19.6, HIGH.from - 0.3, 36.4, 44.8, 75.4, 79.2].map((x) => ({ look: 'reed' as const, at: { x, y: 0 } })),
    { look: 'reed', at: { x: BENT_REED.x, y: HIGH.y } },
    ...[46.6, 52.9, 56.6, 65.5, 72.2].map((x) => ({ look: 'reed' as const, at: { x, y: WATER } })),
    // The old trägubbe, far out on the planks after the last post: gone when he comes, in a leap.
    { look: 'tragubbe', at: { x: 116.5, y: DECK }, until: 'beat:sjon:old-one' },
    // And far out in the lake, on a stone: the old one, and the little one once it has come down beside it.
    { look: 'tragubbe', at: { x: 175.4, y: 0.4 }, z: -18, after: 'beat:sjon:there' },
    { look: 'lillgubbe', at: { x: 176, y: 0.4 }, z: -18, after: 'sjon:landed' },
  ],
  // Klonk is always a little ahead, on firm ground: over the mats it never stops, and it is never on one.
  ghost: [
    { at: { x: 6, y: 0 } },
    { at: { x: 9.6, y: STONES[0]!.y } },
    { at: { x: 13.8, y: STONES[1]!.y } },
    { at: { x: 17.8, y: STONES[2]!.y } },
    { at: { x: 22.6, y: 0 } },
    { at: { x: 28.4, y: HIGH.y } },
    { at: { x: 31.8, y: HIGH.y } },
    { at: { x: 34.2, y: STEP.y } },
    { at: { x: 39, y: 0 } },
    { at: { x: 44.6, y: 0 } },
    { at: { x: 59.8, y: 0 } },
    { at: { x: 78.4, y: 0 } },
    { at: { x: 82.4, y: DECK } },
    // from post to post; at the first it thinks of the little one, once the flash has shown it
    { at: { x: POSTS[1]!, y: DECK }, thought: { picture: 'small-figure', after: 'beat:sjon:flash' } },
    { at: { x: POSTS[3]!, y: DECK } },
    { at: { x: POSTS[5]!, y: DECK } },
    { at: { x: 117.6, y: DECK } },
    { at: { x: 124.8, y: DECK } },
    // over the break and out along the outer jetty
    { at: { x: 134.8, y: DECK } },
    { at: { x: 140, y: DECK } },
    { at: { x: 144.8, y: DECK } },
    { at: { x: 149.6, y: 0 } },
    { at: { x: 162.4, y: 0 } },
    { at: { x: 166.5, y: DECK } },
    { at: { x: 170.5, y: DECK } },
    { at: { x: 175.5, y: DECK } },
  ],
  beats: [
    { id: 'sjon:arrive', at: 2.5, who: 'elof', line: 'sjArrive' },
    { id: 'sjon:stones', at: 7, who: 'elof', line: 'sjStones' },
    { id: 'sjon:reeds', at: 24.4, who: 'elof', line: 'sjReeds' },
    { id: 'sjon:mats', at: 43, who: 'elof', line: 'sjMats' },
    { id: 'sjon:wood', at: 58, who: 'elof', line: 'sjKlonkWood' },
    { id: 'sjon:flash', at: 77, who: 'elof', line: 'sjFlash' },
    { id: 'sjon:jetty', at: 80.8, who: 'elof', line: 'sjJetty' },
    { id: 'sjon:posts', at: 84.4, who: 'elof', line: 'sjPosts', read: true },
    { id: 'sjon:old-one', at: 104, who: 'elof', line: 'sjOldOne' },
    { id: 'sjon:broken', at: 119, who: 'elof', line: 'sjBroken' },
    { id: 'sjon:family:mamma', at: 121, until: 'sjon:mamma', who: 'mamma', line: 'sjMamma', read: true },
    { id: 'sjon:boat-ready', on: 'sjon:boat', within: [116, 134], who: 'mamma', line: 'sjBoatReady', read: true },
    { id: 'sjon:steady', at: 128.6, needs: 'sjon:boat', who: 'mamma', line: 'sjSteady' },
    { id: 'sjon:thanks', at: 133, who: 'elof', line: 'sjThanks' },
    { id: 'sjon:near', at: 135.6, who: 'mamma', line: 'sjNear' },
    { id: 'sjon:gap', at: 148, who: 'elof', line: 'sjGap' },
    { id: 'sjon:bark-idea', at: 149.4, until: `placed:${BARK.id}`, who: 'elof', line: 'sjBarkIdea', read: true },
    { id: 'sjon:raft', on: `placed:${BARK.id}`, who: 'elof', line: 'sjRaft' },
    { id: 'sjon:klonk-raft', on: `placed:${BARK.id}`, who: 'spoket', line: 'sjKlonkRaft' },
    { id: 'sjon:there', at: 168, who: 'elof', line: 'sjThere', read: true },
    { id: 'sjon:floated', on: 'beat:sjon:there', who: 'elof', line: 'sjFloated' },
    { id: 'sjon:mamma-sees', on: 'beat:sjon:floated', who: 'mamma', line: 'sjMammaSees' },
    { id: 'sjon:klonk-cheer', on: 'beat:sjon:mamma-sees', who: 'spoket', line: 'sjKlonkCheer' },
  ],
  later: [
    // Mamma rows up and lays the boat along the gap: he watches until it is still.
    { flag: 'sjon:boat', after: 'sjon:mamma', seconds: 1.4, hold: true, within: [116, 134] },
    // The little one has come down beside the old one, on the stone.
    { flag: 'sjon:landed', after: 'beat:sjon:there', seconds: 1.6 },
  ],
  cameras: [
    // On the upper ways the picture is wider and lower, so the next landing and the trail under him are in it.
    // Each begins higher than a hop along the trail rises there.
    { from: 12.6, to: 19.6, above: 2.1, zoom: 1.4, lift: -0.6 },
    { from: 29.6, to: 33.6, above: 4.1, zoom: 1.4, lift: -0.8 },
    { from: 136, to: 149, above: 1.8, zoom: 1.45, lift: -0.6 },
    { from: 6, to: 21, zoom: 1.2 },
    { from: 24, to: 38, zoom: 1.3, lift: 0.5 },
    { from: 44, to: 78, zoom: 1.3 },
    // From post to post the next post is in the picture.
    { from: 84, to: 114, zoom: 1.35 },
    { from: 117, to: 134, zoom: 1.3, lift: 0.3 },
    { from: 147, to: 163, zoom: 1.3 },
    // At the end the picture opens out over the lake, towards the stone.
    { from: 165, to: 180, zoom: 1.6, lift: 0.8 },
  ],
  candy: [
    // 1. the beach, the stones, and up onto the first
    ...row(2.6, 6.6, 0),
    { x: 8.4, y: round(STONES[0]!.y + 0.45) },
    { x: 9.9, y: round(STONES[0]!.y + 0.45) },
    ...over(STONES),
    { x: 17.7, y: round(STONES[2]!.y + 0.45) },
    // the sand, up the reed, across the high stone and down its steps
    ...row(19.8, 23.8, 0),
    { x: 25.5, y: 0.45 },
    { x: HIGH.from - 0.3, y: 1.3 },
    { x: HIGH.from - 0.3, y: 2.4 },
    { x: 27.3, y: round(HIGH.y + 0.45) },
    { x: 29.3, y: round(HIGH.y + 0.45) },
    { x: 31.3, y: round(HIGH.y + 0.45) },
    { x: 34.1, y: round(STEP.y + 0.45) },
    // 2. the shore, over the reed mats and the stone between them
    ...row(36.2, 44.2, 0),
    ...over(GUNGFLY),
    { x: 77.2, y: 0.45 },
    { x: 79, y: 0.45 },
    // 3. up onto the jetty and from post to post; 4. along Mamma's gunwale; 5. down the sagging end
    { x: 80.6, y: round(DECK + 0.45) },
    ...row(82.4, 144.4, DECK),
    ...slopeRow(146.4, 148.4, SAG.from, DECK, SAG.to, LOW.y),
    // on the planks the bark is pushed along: in sight beside it at first, and taken once it has moved on; and
    // over the gap where it will float
    { x: 150.2, y: 0.45 },
    { x: 153, y: 0.45 },
    { x: 155, y: 0.45 },
    ...over(BARK_WAY),
    { x: 161.8, y: 0.45 },
    // 6. up onto the last stretch, to the end
    { x: 163.4, y: round(DECK + 0.45) },
    ...row(165.4, 171.4, DECK),
  ],
  // Side candy: hearts and lollipops by turns, in the order of this list, so the first of each way is a heart. None
  // is taken by walking under it, or by a hop along the trail. New ones are added at the end.
  side: [
    // The stone shelves: two over the first (one at its near end), one over the second, one in the arc of the
    // jump across, two over the third.
    { x: 13.5, y: round(SHELVES[0]!.y + 0.55) },
    { x: 14.4, y: round(SHELVES[0]!.y + 0.55) },
    above(SHELVES[1]!),
    hopCandy({ x: 16.2, y: 2.75 }, { x: 17.1, y: 2.75 }, 0.9),
    { x: 17.6, y: round(SHELVES[2]!.y + 0.55) },
    { x: 18.5, y: round(SHELVES[2]!.y + 0.55) },
    // The bent reed: its tell low on the stem, within a jump of the stone; two more up it; three on the leaf.
    { x: BENT_REED.x, y: 4.45 },
    { x: BENT_REED.x, y: 5 },
    { x: BENT_REED.x, y: 5.75 },
    { x: 31.4, y: round(REED_LEAF.y + 0.55) },
    { x: 32, y: round(REED_LEAF.y + 0.55) },
    { x: 32.6, y: round(REED_LEAF.y + 0.55) },
    // The benches and the bobbing planks: one over each, where he stands on it as it rides low.
    above(BENCHES[0]!),
    above(BENCHES[1]!),
    ...PLANKS.map((p) => ({ x: p.stops[0]!.x, y: round(PLANK.low + PLANK.height + 0.6) })),
    above(BENCHES[2]!),
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): the way along the shore, the reed, the mats, the
 * waves, Mamma's boat, the bark, and the two found on the stone.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:sjon:there')) return ['sjonFound', 'sjonMamma', 'heart'];
  if (has(`placed:${BARK.id}`)) return [at < FAR.from ? 'sjonRaft' : 'sjonEnd', 'sjonMamma', 'water'];
  if (at >= SAG.from) return ['sjonBark', 'sjonMamma', 'water'];
  if (has('sjon:boat')) return at < BREAK.to + 0.5 ? ['sjonBoat', 'sjonMamma', 'water', 'mamma'] : ['sjonOut', 'sjonMamma'];
  if (at >= 118) return ['sjonMamma', 'sjonFamily', 'water', 'mamma'];
  if (at >= JETTY.from) return ['sjonJetty', 'sjonFamily', 'water'];
  if (at >= SHORE.from + 6) return ['sjonMats', 'sjonFamily', 'water'];
  if (at >= 23 && at < HIGH.from + 0.5 && player.y < HIGH.y - 0.4) return ['sjonReeds', 'sjonFamily'];
  return ['sjonShore', 'sjonFamily'];
};
