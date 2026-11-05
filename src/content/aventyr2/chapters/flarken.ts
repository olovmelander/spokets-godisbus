import type { Candy, ChapterData, Hook, Jump, Ledge, Mover, Tussock, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { hopCandy, jump, round, row, slopeRow, timeCard } from '../kit';

/**
 * Kapitel 5: Flärken (docs/aventyr-2.md, docs/aventyr-2-reference-study.md §2): Flärkenbadet, the villages' bathing
 * place on the lake Flärken between Kubbe and Norrflärke, at eleven o'clock on the storm's night. The strongest gust
 * at Olympia took the little one north up the valley; here the lake runs out into Norra Anundsjöån, south again.
 * In late October the bath is empty: no sign, no club name, no letter anywhere. Units: EL. The places, from the
 * left:
 *
 * 1. **The playground,** from the parking down to the bay. Two lace rings hang under the swings' seats: the first
 *    over the sand, where a miss costs nothing, the second over the puddle that feet have worn under the swing. Up
 *    the slide's ladder (a climb), and down its chute.
 * 2. **The picnic table:** up its bench, and under the table top, where it is dry; the top is a side way. Then **the
 *    volleyball net,** sagging with rain: a bounce on it is a way up onto the changing rooms' roofs (a toy).
 * 3. **The changing rooms:** two huts. The door of the second bangs in the wind, a platform that swings out over
 *    the path: from the bench in front of it, it is the second way up onto the roofs, the high path.
 * 4. **Strandstenarna:** wet stones in the shallows, a hop of water between each, and a stone too high to jump
 *    onto with a reed at its foot to climb. Stone shelves over the first stones and a bent reed on the high one
 *    are side ways. Then **gungflyet:** floating reed mats that sink while he stands still, a firm stone between
 *    them. On the far side a flash shows the little one blown out over the lake.
 * 5. **Bryggan:** the jetty, where the waves wash over the planks in gusts; behind each post is a lee. The old
 *    trägubbe stands far out on the planks and leaps away into the dark.
 * 6. **Mammas båt:** the jetty has broken off. "Ropa på Mamma": she rows up and holds the boat against both broken
 *    ends, and its gunwale is the way on.
 * 7. **Hopptornet:** the diving tower stands in the water between two stretches of jetty. Up its ladder to the top,
 *    the lookout: a flash shows the little one far out, where the river begins. A run off its far side lands him
 *    on the jetty beyond.
 * 8. **Vad flyter?** (the puzzle): the last planks are gone, and the gap is too wide to jump. A stone lies first on the
 *    planks, and Elof has an idea of his own: he pushes it out. Plopp: it sinks. Only then can he think what floats:
 *    Klonk does, and bark is wood. Pushed three times, the bark slides into the gap and floats there, a stepping stone.
 * 9. **The jetty's end:** a flash, and the outlet takes the little one down the river; the old trägubbe leaps onto
 *    a log after him. "Trä flyter!" Mamma: "Vi följer ån med bilen."
 *
 * To the simulation the open water is a pit; its surface is where the glitter bubble catches him. The buildings
 * (the swings, the slide, the picnic table, the net, the huts and the tower) are pictures behind the play plane,
 * matched in size to the ground he walks on.
 */

/** Open water is a pit this deep to the simulation, and its surface is here, as in Myren. */
const DEEP = -6;
const WATER = -0.6;
/** The puddle under the swing is shallower: its water lies a little under the sand. */
const PUDDLE_WATER = -0.3;

/** A place to stand: a stone, a reed mat, a stretch of jetty, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

// --- 1. the playground --------------------------------------------------------------------------------------

/**
 * The swings: a lace ring under each seat. The first is over flat sand, and the second crosses the puddle worn
 * under it, as Gården's two do over the lawn and the gully: the same lengths, the same landings.
 */
const SWINGS: Hook[] = [
  { x: 10.5, y: 3.4, length: 2.6, land: { x: 13.9, y: 0 }, hangs: 0.6 },
  { x: 20, y: 3.3, length: 2.7, land: { x: 24.3, y: 0 }, hangs: 0.7 },
];
const SWING_SET = { x: (SWINGS[0]!.x + SWINGS[1]!.x) / 2, width: (SWINGS[1]!.x - SWINGS[0]!.x) * 2, height: 16 };
/** Wider than a running jump carries, and deep enough that a fall into it is the water's. */
const PUDDLE = { from: 18.5, to: 22.9, bottom: -5 };
/**
 * The slide: its ladder up the near side to a little platform higher than he jumps, and the chute down, a slope
 * he runs down (a little under 45°, so his feet keep to it).
 */
const SLIDE = { ladder: 27.25, from: 27.5, top: 3.2, to: 30.5, foot: 33.9 };
const chute = (x: number) => SLIDE.top - (SLIDE.top * (x - SLIDE.to)) / (SLIDE.foot - SLIDE.to);

// --- 2. the picnic table and the volleyball net ------------------------------------------------------------

/**
 * The picnic table, seen from its end: a bench each side, a pull-up high, and the top between them. The trail goes
 * up the first bench, down under the top where it is dry, and up the second; the top is a held jump from a bench.
 */
const BENCH_A: Stone = { from: 36.2, to: 37.6, y: 1.2 };
const BENCH_B: Stone = { from: 40.8, to: 42.2, y: 1.2 };
const TABLE: Ledge = { x: 39.2, y: 2, width: 3.6, look: 'trestle' };
/** The volleyball net, sagging with the rain on the sand court: down on it from a jump, it bounces him up to the roofs. */
const NET = { x: 45, y: 0.5, lift: 3.2 };

// --- 3. the changing rooms --------------------------------------------------------------------------------

/** The two huts' roofs, over the path: the high way, a hop apart. Each is a fall he lands softly from. */
const ROOFS: Ledge[] = [
  { x: 48.7, y: 2.9, width: 6.2, look: 'plank' },
  { x: 55.7, y: 2.9, width: 6.2, look: 'plank' },
];
/** The bench in front of the second hut, a jump high. */
const HUT_BENCH: Ledge = { x: 53.2, y: 1, width: 1.4, look: 'trestle' };
/**
 * The second hut's door, banging open and shut in the wind: its top swings out over the path, above his head,
 * low enough near the bench to jump onto, and from it the roof is a jump. A toy: nothing needs it.
 */
const DOOR: Mover = {
  id: 'sjon-door', look: 'plank', width: 1.6, height: 0.25, verb: 'push', extra: true,
  cycle: { seconds: 3.6 }, stops: [{ x: 55, y: 1.6 }, { x: 56.8, y: 2 }],
};

// --- 4. the beach stones, the reeds and the mats -------------------------------------------------------------

/** The stones in the shallows: a step up from the sand, and a hop over water to each of the others. */
const STONES: Stone[] = [
  { from: 62, to: 65, y: 0.6 },
  { from: 66.4, to: 69, y: 0.9 },
  { from: 70.4, to: 73, y: 0.5 },
];
/** The high stone with the reed at its foot: more than two jumps high. Steps of stone lead down its far side. */
const HIGH = { from: 77, to: 83.5, y: 2.9 };
const STEP = { from: 83.5, to: 85.7, y: 1.5 };

/** Gungflyet: two mats, a firm stone to rest on, two mats, and the shore before the jetty. */
const SHORE: Stone = { from: 85.7, to: 90, y: 0 };
const MATS_A: Stone[] = [
  { from: 91.3, to: 93.3, y: 0 },
  { from: 94.6, to: 96.6, y: 0.15 },
];
const ISLAND: Stone = { from: 97.9, to: 102.3, y: 0 };
const MATS_B: Stone[] = [
  { from: 103.6, to: 105.6, y: 0.15 },
  { from: 106.9, to: 108.9, y: 0 },
];
const LANDING: Stone = { from: 110.2, to: 113, y: 0 };

/**
 * Over the first stones, a second way (docs/level-design.md): a stone shelf a held jump over the second stone,
 * well past where the hop onto it lands; a second a held jump over the first, hanging over the water; and a third
 * level with it over the third stone, a jump across. He walks off its end onto the sand. A hop along the trail
 * tops out under all three.
 */
const SHELVES: Ledge[] = [
  { x: 68, y: 1.85, width: 1.4, look: 'shelf' },
  { x: 69.4, y: 2.75, width: 1.6, look: 'shelf' },
  { x: 72, y: 2.75, width: 1.8, look: 'shelf' },
];

/**
 * On the high stone a reed is bent over: its stem begins a held jump over the stone, out of reach of his feet as
 * he walks under it, and he climbs it to a reed leaf held out flat. He walks off the leaf's far end, down onto
 * the stone or the step below it.
 */
const BENT_REED = { x: 81.1, bottom: 3.8, top: 5.5, exit: 1 as const, look: 'root' as const };
const REED_LEAF: Ledge = { x: 82.4, y: 5.5, width: 1.8, look: 'leaf' };

// --- 5. the jetty, 6. Mamma's boat, 7. the diving tower, 8. the bark ---------------------------------------------

/** The jetty's planks, a step up from the shore. */
const DECK = 0.6;
const JETTY = { from: 113, to: 144 };
/** The posts: the lee from each wave. As on Berget, a dash from one to the next takes half the calm between. */
const POSTS = [118.6, 123.8, 129, 134.2];
/** Where the old trägubbe stands far out on the planks, until he leaps away. */
const OLD_ONE = { x: 138.7, y: DECK };
/** Where it has broken off: Mamma's boat lies along the gap, and its gunwale is level with the planks. */
const BREAK = { from: 144, to: 150 };
const GUNWALE: Ledge = { x: (BREAK.from + BREAK.to) / 2, y: DECK, width: BREAK.to - BREAK.from + 0.2, look: 'plank', needs: 'sjon:boat' };
/** The jetty on beyond the boat, out to the diving tower's ladder. */
const OUTER = { from: BREAK.to, to: 154 };
/**
 * The diving tower, standing in the water: its ladder goes up from the jetty's end, higher than he jumps, to the
 * platform. Even a held jump off the platform is a soft landing on the jetty beyond the water (FALL_LIMIT), and a
 * run off it clears the water; walking, he stops at the edge.
 */
const TOWER = { ladder: 153.75, from: 154, to: 159, y: 3.3 };
const PLATFORM: Ledge = { x: (TOWER.from + TOWER.to) / 2, y: TOWER.y, width: TOWER.to - TOWER.from, look: 'plank' };
/** The jetty beyond the tower, its far end pushed down into the water by the waves, and the bark lying on it. */
const BEYOND = { from: 159.6, to: 163.4 };
const SAG = { from: BEYOND.to, to: 166.4 };
const LOW: Stone = { from: SAG.to, to: 173.4, y: 0 };
/**
 * The gap where the last planks have gone: too wide for a jump. The bark floats in its middle with its top level
 * with the planks, and the hop to it and the hop off it are each as wide as a hop between two reed mats.
 */
const RAFT: Stone = { from: 174.7, to: 176.7, y: 0 };
const FAR: Stone = { from: 178, to: 180.4, y: 0 };
/** The jetty's last stretch, on its stone crib: a step up again, out to the end post. */
const END = { from: FAR.to, to: 191 };
/** Where the old trägubbe waits on the end post, until he leaps after the little one. */
const END_POST = { x: 189.4, y: DECK };

/**
 * The bark (the puzzle): a thick piece, lying on the low planks, and each push moves it on along them. The third
 * slides it off the edge into the gap, where it floats as wood does, mostly under water, with its top at his feet.
 * It is taller than he pulls himself up (LEDGE_REACH), so a run stops at it, with Knuffa on the button; only a
 * jump climbs it, as on Granskogen's cone.
 */
const BARK_HIGH = 1.5;
/** The wrong idea, which is the puzzle's first half: a stone, pushed out along the planks, rolls in and sinks. */
const STONE: Mover = {
  id: 'sjon-stone', look: 'boulder', width: 1.4, height: BARK_HIGH, verb: 'push',
  stops: [{ x: 167.5, y: 0 }, { x: (RAFT.from + RAFT.to) / 2, y: -3.6 }],
};
const BARK: Mover = {
  id: 'sjon-bark', look: 'bark', width: RAFT.to - RAFT.from, height: BARK_HIGH, verb: 'push', needs: `placed:${STONE.id}`,
  stops: [{ x: 169, y: 0 }, { x: 170.8, y: 0 }, { x: 172.4, y: 0 }, { x: (RAFT.from + RAFT.to) / 2, y: RAFT.y - BARK_HIGH }],
};

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

export const flarken: ChapterData = {
  id: 'flarken',
  // Its water and its reed mats are the bog's, at the lake's edge.
  place: 'bog',
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (src/content/chapters/cards.ts).
  scenes: [timeCard('flarken', 1)],
  goalX: 188,
  // Mamma answers from the boat in the coda.
  coda: 'mamma',
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the parking and the swings, the puddle under the second, and the slide
    { x: PUDDLE.from, y: 0 },
    { x: PUDDLE.from, y: PUDDLE.bottom },
    { x: PUDDLE.to, y: PUDDLE.bottom },
    { x: PUDDLE.to, y: 0 },
    { x: SLIDE.from, y: 0 },
    { x: SLIDE.from, y: SLIDE.top },
    { x: SLIDE.to, y: SLIDE.top },
    { x: SLIDE.foot, y: 0 },
    // 2. the picnic table's benches, and the dry ground under its top between them
    { x: BENCH_A.from, y: 0 },
    { x: BENCH_A.from, y: BENCH_A.y },
    { x: BENCH_A.to, y: BENCH_A.y },
    { x: BENCH_A.to, y: 0 },
    { x: BENCH_B.from, y: 0 },
    { x: BENCH_B.from, y: BENCH_B.y },
    { x: BENCH_B.to, y: BENCH_B.y },
    { x: BENCH_B.to, y: 0 },
    // the volleyball court, 3. the changing rooms, and 4. the beach: the stones in the shallows, the sand, and
    // the high stone with its steps down
    { x: STONES[0]!.from, y: 0 },
    { x: STONES[0]!.from, y: STONES[0]!.y },
    { x: STONES[0]!.to, y: STONES[0]!.y },
    { x: STONES[0]!.to, y: DEEP },
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
    // the shore, the reed mats float over the water, and the stone between them is ground
    { x: SHORE.to, y: 0 },
    { x: SHORE.to, y: DEEP },
    ...island(ISLAND),
    { x: LANDING.from, y: DEEP },
    { x: LANDING.from, y: 0 },
    // 5. the jetty, up a plank's height from the shore
    { x: JETTY.from, y: 0 },
    { x: JETTY.from, y: DECK },
    { x: JETTY.to, y: DECK },
    // 6. where it has broken off
    { x: BREAK.from, y: DEEP },
    { x: BREAK.to, y: DEEP },
    { x: BREAK.to, y: DECK },
    // 7. on to the diving tower, which stands in the water, and the jetty beyond it
    { x: OUTER.to, y: DECK },
    { x: OUTER.to, y: DEEP },
    { x: BEYOND.from, y: DEEP },
    { x: BEYOND.from, y: DECK },
    // 8. its end sagging into the water, and the gap where its planks have gone
    { x: SAG.from, y: DECK },
    { x: SAG.to, y: LOW.y },
    { x: LOW.to, y: LOW.y },
    { x: LOW.to, y: DEEP },
    { x: FAR.from, y: DEEP },
    { x: FAR.from, y: FAR.y },
    // 9. up onto the last stretch, out to the end post
    { x: END.from, y: FAR.y },
    { x: END.from, y: DECK },
    { x: END.to, y: DECK },
    { x: END.to, y: 9 },
  ],
  water: [
    { from: PUDDLE.from, to: PUDDLE.to, y: PUDDLE_WATER },
    { from: STONES[0]!.to, to: STONES[2]!.from, y: WATER },
    { from: SHORE.to, to: LANDING.from, y: WATER },
    { from: BREAK.from, to: BREAK.to, y: WATER },
    { from: OUTER.to, to: BEYOND.from, y: WATER },
    { from: LOW.to, to: FAR.from, y: WATER },
  ],
  tussocks: [...MATS_A, ...MATS_B].map(mat),
  surfaces: [
    // The parking's gravel and the playground's sand; the picnic table's benches; the court's sand and the beach.
    { from: -3, to: 10, kind: 'earth' },
    { from: 10, to: BENCH_A.from, kind: 'sand' },
    { from: BENCH_A.from, to: BENCH_A.to, kind: 'wood' },
    { from: BENCH_A.to, to: BENCH_B.from, kind: 'sand' },
    { from: BENCH_B.from, to: BENCH_B.to, kind: 'wood' },
    { from: BENCH_B.to, to: STONES[0]!.from, kind: 'sand' },
    { from: STONES[0]!.from, to: STONES[2]!.to, kind: 'stone' },
    { from: HIGH.from, to: STEP.to, kind: 'stone' },
    { from: ISLAND.from, to: ISLAND.to, kind: 'stone' },
    { from: JETTY.from, to: JETTY.to, kind: 'wood' },
    { from: OUTER.from, to: OUTER.to, kind: 'wood' },
    { from: BEYOND.from, to: LOW.to, kind: 'wood' },
    { from: FAR.from, to: END.to, kind: 'wood' },
  ],
  // The waves over the jetty: every four seconds one washes over for a little more than one, and the posts are
  // the lee, as the boulders are on Berget. The planks between the first post and the last are level and whole.
  gusts: [{ from: POSTS[0]!, to: POSTS[POSTS.length - 1]!, y: DECK, every: 4, length: 1.4, first: 0.5, shelters: POSTS }],
  checkpoints: [
    { x: 4, y: 0 },
    { x: 25.4, y: 0 },
    { x: 43.8, y: 0 },
    { x: 60.4, y: 0 },
    { x: 75, y: 0 },
    { x: 100.1, y: 0 },
    { x: 115.8, y: DECK },
    { x: 136.4, y: DECK },
    { x: 151.8, y: DECK },
    { x: 179.2, y: 0 },
  ],
  hooks: SWINGS,
  climbs: [
    // The slide's ladder: he climbs it and steps off onto the platform at the top of the chute.
    { x: SLIDE.ladder, bottom: 0, top: SLIDE.top, exit: 1, look: 'hose' },
    // The reed at the foot of the high stone: he climbs it like a stem and steps off onto the top.
    { x: HIGH.from - 0.3, bottom: 0, top: HIGH.y, exit: 1, look: 'root' },
    BENT_REED,
    // The diving tower's ladder, from the jetty's end up to its platform.
    { x: TOWER.ladder, bottom: DECK, top: TOWER.y, exit: 1, look: 'hose' },
  ],
  ledges: [TABLE, ...ROOFS, HUT_BENCH, ...SHELVES, REED_LEAF, GUNWALE, PLATFORM],
  bouncers: [NET],
  spots: [
    // At the broken end: Mamma rows up with the boat when he calls.
    { id: 'sjon:mamma', look: 'sign', at: { x: 142, y: DECK }, verb: 'call', word: 'callMamma' },
  ],
  movers: [DOOR, STONE, BARK],
  jumps: [
    // Up onto the picnic table's benches.
    jump({ x: round(BENCH_A.from - 0.2), y: 0 }, { x: round(BENCH_A.from + 0.7), y: BENCH_A.y }),
    jump({ x: round(BENCH_B.from - 0.2), y: 0 }, { x: round(BENCH_B.from + 0.7), y: BENCH_B.y }),
    ...hops(STONES),
    ...hops(GUNGFLY),
    // Off the diving tower, over the water, onto the jetty beyond it.
    jump({ x: round(TOWER.to - 0.2), y: TOWER.y }, { x: round(BEYOND.from + 0.7), y: DECK }),
    // Onto the bark and off it, once it floats in the gap.
    ...hops(BARK_WAY, { needs: BARK.id }),
  ],
  // The storm, for the picture: rain, a flash now and then, what five flashes show, Mamma's lantern, and the
  // bathing place's own things standing about.
  storm: {
    shelters: 'posts',
    // The volleyball net, sagging with rain, is the bouncer here.
    bouncers: 'net',
    rain: 0.95,
    lightning: 7,
    flybys: [
      // On the far side of the reed mats: the little one, blown out over the lake.
      { on: 'beat:sjon:flash', from: { x: 102, y: 9 }, to: { x: 140, y: 12 }, seconds: 2.6, who: 'lillgubbe' },
      // The old one, far out on the planks, leaps on into the dark when he comes.
      { on: 'beat:sjon:old-one', from: { x: OLD_ONE.x, y: 1.4 }, to: { x: 170, y: 6 }, seconds: 2.2, who: 'tragubbe' },
      // From the top of the diving tower: the little one, far out where the lake runs out into the river.
      { on: 'beat:sjon:lookout', from: { x: 166, y: 7 }, to: { x: 200, y: 2 }, seconds: 3, who: 'lillgubbe' },
      // At the end: the outlet takes the little one, and the old one leaps after him onto a log.
      { on: 'beat:sjon:outlet', from: { x: 186.4, y: 2.4 }, to: { x: 206, y: 0 }, seconds: 2.6, who: 'lillgubbe' },
      { on: 'beat:sjon:log', from: { x: END_POST.x, y: END_POST.y + 0.8 }, to: { x: 206, y: 0 }, seconds: 2.4, who: 'tragubbe' },
    ],
    // Mamma's lantern in the boat, once she has rowed up.
    glows: [{ at: { x: 147, y: 1.6 }, z: -1.2, size: 1, after: 'sjon:mamma' }],
    buildings: [
      // The family's car at the parking, where they left it to search the shore, its inside light on.
      { kind: 'car', x: 1, z: -14, lit: '' },
      // The playground: the swing set, the rings under its seats; the slide, its ladder where his is.
      { kind: 'swings', x: SWING_SET.x, z: -0.8, width: SWING_SET.width, height: SWING_SET.height },
      { kind: 'slide', x: SLIDE.from + (SLIDE.foot - SLIDE.from) / 2, z: -0.6, width: SLIDE.foot - SLIDE.from, height: SLIDE.top },
      // The picnic table he climbs, and another further back on the grass.
      { kind: 'picnic', x: TABLE.x, z: 0, width: TABLE.width, height: TABLE.y },
      { kind: 'picnic', x: 30, z: -14 },
      // (The volleyball net is the bouncer itself, torn loose and sagging between its posts.)
      // The changing rooms: their fronts just behind the path, their eaves the roofs he walks.
      ...ROOFS.map((roof) => ({ kind: 'hut' as const, x: roof.x, z: -4.5, width: roof.width - 0.4, height: roof.y })),
      // The diving tower in the water, its ladder where his is, its platform where he stands.
      { kind: 'tower', x: TOWER.ladder + 2.9, y: DECK, z: -3.4, width: 3, height: TOWER.y - DECK },
      // Birches round the bay, the October leaves nearly gone.
      // The giant chess on its gravel pad, and the painted board with the smiling sun.
      { kind: 'chess', x: 56, z: -16, width: 16 },
      // The L of the jetty: its other leg runs out behind the path, low on the water.
      { kind: 'jettyArm', x: 126.4, z: -1.2, y: DECK - 0.3, width: 24 },
      // The small tarred hut with its white trim, in among the birches.
      { kind: 'hut', x: 26, z: -22, width: 9, height: 10, tar: true },
      { kind: 'sunboard', x: 70, z: -30, width: 13, height: 8.5 },
      { kind: 'birch', x: 6, z: -22, height: 64 },
      { kind: 'birch', x: 40, z: -26, height: 72 },
      { kind: 'birch', x: 64, z: -18, height: 58 },
      { kind: 'birch', x: 88, z: -30, height: 70 },
    ],
  },
  decor: [
    // The rocks at the water, where he climbs.
    ...[68, 69.4, 72].map((x, i) => ({ look: 'kit' as const, word: i === 1 ? 'hylla-b' : 'hylla-a', at: { x, y: i === 0 ? 1.85 : 2.75 }, z: -0.5, scale: 0.55 })),
    // Reeds along the shore, among the mats and at the foot of the jetty. Two of them are climbed.
    ...[58.6, 60.8, 73.6, HIGH.from - 0.3, 86.4, 89.4, 109.6, 112.2].map((x) => ({ look: 'reed' as const, at: { x, y: 0 } })),
    { look: 'reed', at: { x: BENT_REED.x, y: HIGH.y } },
    ...[90.6, 93.9, 97.3, 103, 106.3].map((x) => ({ look: 'reed' as const, at: { x, y: WATER } })),
    // The old trägubbe, far out on the planks after the last post: gone when he comes, in a leap.
    { look: 'tragubbe', at: OLD_ONE, until: 'beat:sjon:old-one' },
    // And on the jetty's end post, until he leaps after the little one.
    { look: 'tragubbe', at: END_POST, until: 'beat:sjon:log' },
  ],
  // Klonk is always a little ahead, on firm ground: under the picnic table out of the rain, over the mats it never
  // stops, and it is never on one.
  ghost: [
    { at: { x: 5.6, y: 0 } },
    { at: { x: 15.6, y: 0 } },
    { at: { x: 26.2, y: 0 } },
    { at: { x: 29.6, y: SLIDE.top } },
    { at: { x: 39.2, y: 0 } },
    { at: { x: 45.2, y: 0 } },
    { at: { x: 52.2, y: 0 } },
    { at: { x: 58.4, y: 0 } },
    { at: { x: 63.6, y: STONES[0]!.y } },
    { at: { x: 67.8, y: STONES[1]!.y } },
    { at: { x: 71.8, y: STONES[2]!.y } },
    { at: { x: 75.6, y: 0 } },
    { at: { x: 78.9, y: HIGH.y } },
    { at: { x: 82.3, y: HIGH.y } },
    { at: { x: 84.7, y: STEP.y } },
    { at: { x: 88.6, y: 0 } },
    { at: { x: 100.4, y: 0 } },
    { at: { x: 111.6, y: 0 } },
    { at: { x: 115, y: DECK } },
    // from post to post; at the second it thinks of the little one, once the flash has shown it
    { at: { x: POSTS[1]!, y: DECK }, thought: { picture: 'small-figure', after: 'beat:sjon:flash' } },
    { at: { x: POSTS[3]!, y: DECK } },
    { at: { x: 139.8, y: DECK } },
    { at: { x: 143.2, y: DECK } },
    // over the break, at the foot of the tower's ladder, up on its platform, and beyond it
    { at: { x: 152.6, y: DECK } },
    { at: { x: 157, y: TOWER.y }, z: -0.3 },
    { at: { x: 160.4, y: DECK } },
    { at: { x: 167, y: 0 } },
    { at: { x: 179, y: 0 } },
    { at: { x: 183, y: DECK } },
    { at: { x: 186.6, y: DECK } },
    { at: { x: 189.8, y: DECK } },
  ],
  beats: [
    // 1. the parking and the playground
    { id: 'sjon:arrive', at: 2.5, who: 'elof', line: 'sjArrive' },
    // 2. the picnic table and the net
    { id: 'sjon:dry-klonk', at: 38.8, who: 'spoket', line: 'sjKlonkRaft' },
    // 3. the changing rooms
    { id: 'sjon:door', at: 50.2, who: 'elof', line: 'sjDoor' },
    // 4. the stones, the reeds and the mats
    { id: 'sjon:mats', at: 87.6, who: 'elof', line: 'sjMats' },
    { id: 'sjon:wood', at: 98.6, who: 'elof', line: 'sjKlonkWood' },
    { id: 'sjon:flash', at: 110.8, who: 'elof', line: 'sjFlash' },
    // 5. the jetty in the waves
    { id: 'sjon:jetty', at: 113.6, who: 'elof', line: 'sjJetty' },
    { id: 'sjon:posts', at: 116.8, who: 'elof', line: 'sjPosts', read: true },
    { id: 'sjon:old-one', at: 126.2, who: 'elof', line: 'sjOldOne' },
    // 6. Mamma's boat
    { id: 'sjon:broken', at: 138, who: 'elof', line: 'sjBroken' },
    { id: 'sjon:family:mamma', at: 139.4, until: 'sjon:mamma', who: 'mamma', line: 'sjMamma', read: true },
    { id: 'sjon:boat-ready', on: 'sjon:boat', within: [136, 152], who: 'mamma', line: 'sjBoatReady', read: true },
    { id: 'sjon:steady', at: 146.6, needs: 'sjon:boat', who: 'mamma', line: 'sjSteady' },
    { id: 'sjon:thanks', at: 150.6, who: 'elof', line: 'sjThanks' },
    { id: 'sjon:near', at: 151.4, who: 'mamma', line: 'sjNear' },
    // 7. the diving tower
    { id: 'sjon:tower', at: 152.6, who: 'elof', line: 'sjTower' },
    { id: 'sjon:lookout', at: 155.6, who: 'elof', line: 'sjLookout', read: true },
    // 8. the bark raft
    { id: 'sjon:gap', at: 165.4, who: 'elof', line: 'sjGap' },
    { id: 'sjon:stone-idea', at: 165.9, until: `placed:${STONE.id}`, who: 'elof', line: 'sjStoneIdea', read: true },
    { id: 'sjon:plop', on: `placed:${STONE.id}`, who: 'elof', line: 'sjPlop', read: true },
    { id: 'sjon:plop-klonk', on: 'beat:sjon:plop', who: 'spoket', line: 'sjPlopKlonk' },
    { id: 'sjon:bark-idea', at: 167.6, needs: `placed:${STONE.id}`, until: `placed:${BARK.id}`, who: 'elof', line: 'sjBarkIdea', read: true },
    { id: 'sjon:raft', on: `placed:${BARK.id}`, who: 'elof', line: 'sjRaft' },
    { id: 'sjon:klonk-raft', on: `placed:${BARK.id}`, who: 'spoket', line: 'sjKlonkRaft' },
    // 9. the jetty's end: the outlet takes them both, and the family will follow the river by car
    { id: 'sjon:outlet', at: 184, who: 'elof', line: 'sjOutlet', read: true },
    { id: 'sjon:log', on: 'beat:sjon:outlet', who: 'elof', line: 'sjLog' },
    { id: 'sjon:floated', on: 'beat:sjon:log', who: 'elof', line: 'sjFloated' },
    { id: 'sjon:car', on: 'beat:sjon:floated', who: 'mamma', line: 'sjCar' },
    { id: 'sjon:klonk-cheer', on: 'beat:sjon:car', who: 'spoket', line: 'sjKlonkCheer' },
  ],
  later: [
    // Mamma rows up and lays the boat along the gap: he watches until it is still.
    { flag: 'sjon:boat', after: 'sjon:mamma', seconds: 1.4, hold: true, within: [136, 152] },
  ],
  cameras: [
    // On the upper ways the picture is wider and lower, so the next landing and the trail under him are in it.
    // Each begins higher than a hop along the trail rises there.
    { from: 43, to: 60, above: 2.4, zoom: 1.45, lift: -0.4 },
    { from: 66.6, to: 73.6, above: 2.1, zoom: 1.4, lift: -0.6 },
    { from: 80.1, to: 84.1, above: 4.1, zoom: 1.4, lift: -0.8 },
    // The parking and the swings: the next ring and where it lands in the picture.
    { from: -3, to: 26, zoom: 1.4, lift: 0.8 },
    { from: 26, to: 35, zoom: 1.35, lift: 1 },
    { from: 35, to: 60, zoom: 1.3, lift: 0.5 },
    { from: 60, to: 75, zoom: 1.2 },
    { from: 75, to: 88, zoom: 1.3, lift: 0.5 },
    { from: 88, to: 113, zoom: 1.3 },
    // From post to post the next post is in the picture.
    { from: 116, to: 136, zoom: 1.35 },
    { from: 136, to: 152, zoom: 1.3, lift: 0.3 },
    // The tower: the platform, the jetty below it, and the lake beyond.
    { from: 152, to: 161, zoom: 1.5, lift: 1.2 },
    { from: 161, to: END.from, zoom: 1.3 },
    // At the end the picture opens out over the lake, towards the river's mouth.
    { from: END.from, to: END.to, zoom: 1.6, lift: 0.8 },
  ],
  candy: [
    // 1. the parking, and along both swings: the ramp of candy out of the puddle
    ...row(1.6, 7.6, 0),
    { x: 9.5, y: 0.95 },
    { x: 10.5, y: 0.8 },
    { x: 11.5, y: 0.95 },
    { x: 12.9, y: 1.5 },
    { x: 13.9, y: 0.9 },
    { x: 15.5, y: 0.45 },
    { x: 17.5, y: 0.45 },
    { x: 19, y: 0.8 },
    { x: 20, y: 0.6 },
    { x: 21, y: 0.8 },
    { x: 22.5, y: 1.75 },
    { x: 23.3, y: 1.6 },
    { x: 24.1, y: 0.8 },
    // up the slide's ladder, over its platform and down the chute
    { x: 26.2, y: 0.45 },
    { x: SLIDE.ladder, y: 1.6 },
    { x: SLIDE.ladder, y: 2.7 },
    { x: 28.4, y: round(SLIDE.top + 0.45) },
    { x: 29.8, y: round(SLIDE.top + 0.45) },
    ...[31.2, 32.5].map((x) => ({ x, y: round(chute(x) + 0.45) })),
    { x: 34.4, y: 0.45 },
    // 2. up the first bench, down under the table, up the second and off it
    { x: 36, y: 1.55 },
    { x: 37, y: 1.65 },
    { x: 38.1, y: 1.2 },
    { x: 39.2, y: 0.45 },
    { x: 40.5, y: 1.3 },
    { x: 41.5, y: 1.65 },
    { x: 42.6, y: 1.2 },
    // the court, the huts, and the sand down to the water
    ...row(44.2, 60.2, 0),
    { x: 61.6, y: 0.45 },
    // 4. up onto the first stone, and over the stones
    { x: 62.4, y: round(STONES[0]!.y + 0.45) },
    { x: 63.9, y: round(STONES[0]!.y + 0.45) },
    ...over(STONES),
    { x: 71.7, y: round(STONES[2]!.y + 0.45) },
    // the sand, up the reed, across the high stone and down its steps
    { x: 73.8, y: 0.45 },
    { x: 75.6, y: 0.45 },
    { x: HIGH.from - 0.3, y: 1.3 },
    { x: HIGH.from - 0.3, y: 2.4 },
    { x: 77.8, y: round(HIGH.y + 0.45) },
    { x: 79.8, y: round(HIGH.y + 0.45) },
    { x: 81.8, y: round(HIGH.y + 0.45) },
    { x: 84.6, y: round(STEP.y + 0.45) },
    // the shore, over the reed mats and the stone between them
    ...row(86.6, 88.6, 0),
    ...over(GUNGFLY),
    { x: 111.4, y: 0.45 },
    // 5. up onto the jetty and from post to post; 6. along Mamma's gunwale, out to the tower's ladder
    { x: 113.4, y: round(DECK + 0.45) },
    ...row(115.2, 147.2, DECK),
    // the robot's hop over the gunwale's far end lands where a walker steps off it
    ...row(150.4, 152.8, DECK, 1.2),
    // 7. up the ladder, over the platform, and off it down onto the jetty beyond
    { x: TOWER.ladder, y: 1.7 },
    { x: TOWER.ladder, y: 2.8 },
    { x: 154.8, y: round(TOWER.y + 0.45) },
    { x: 156.6, y: round(TOWER.y + 0.45) },
    { x: 158.4, y: round(TOWER.y + 0.45) },
    { x: 159.3, y: 3.4 },
    { x: 160.6, y: round(DECK + 0.45) },
    { x: 162.4, y: round(DECK + 0.45) },
    // 8. down the sagging end; on the planks the bark is pushed along: in sight beside it at first, and taken
    // once it has moved on; and over the gap where it will float
    ...slopeRow(164.6, 164.6, SAG.from, DECK, SAG.to, LOW.y),
    { x: 167.6, y: 0.45 },
    { x: 170.4, y: 0.45 },
    { x: 172.4, y: 0.45 },
    ...over(BARK_WAY),
    { x: 179.2, y: 0.45 },
    // 9. up onto the last stretch, to the end
    { x: 180.8, y: round(DECK + 0.45) },
    ...row(182.8, 186.8, DECK),
  ],
  // Side candy: hearts and lollipops by turns, in the order of this list, so the first of each way is a heart. None
  // is taken by walking under it, or by a hop along the trail. New ones are added at the end.
  side: [
    // The picnic table's top: two, a held jump from either bench.
    { x: 38.5, y: round(TABLE.y + 0.55) },
    { x: 39.9, y: round(TABLE.y + 0.55) },
    // The net's bounce: one high over it, then three along the first roof and two along the second.
    { x: 45.4, y: 3.6 },
    ...[46.6, 48.7, 50.8].map((x) => ({ x, y: round(ROOFS[0]!.y + 0.55) })),
    ...[54.6, 57.4].map((x) => ({ x, y: round(ROOFS[1]!.y + 0.55) })),
    // The banging door: one over the hut's bench, one over the door's swing.
    above(HUT_BENCH),
    { x: 55.9, y: 2.75 },
    // The stone shelves: two over the first (one at its near end), one over the second, one in the arc of the
    // jump across, two over the third.
    { x: 67.5, y: round(SHELVES[0]!.y + 0.55) },
    { x: 68.4, y: round(SHELVES[0]!.y + 0.55) },
    above(SHELVES[1]!),
    hopCandy({ x: 70.2, y: 2.75 }, { x: 71.1, y: 2.75 }, 0.9),
    { x: 71.6, y: round(SHELVES[2]!.y + 0.55) },
    { x: 72.5, y: round(SHELVES[2]!.y + 0.55) },
    // The bent reed: its tell low on the stem, within a jump of the stone; two more up it; three on the leaf.
    { x: BENT_REED.x, y: 4.45 },
    { x: BENT_REED.x, y: 5 },
    { x: BENT_REED.x, y: 5.75 },
    { x: 81.9, y: round(REED_LEAF.y + 0.55) },
    { x: 82.5, y: round(REED_LEAF.y + 0.55) },
    { x: 83.1, y: round(REED_LEAF.y + 0.55) },
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): the playground, the way along the shore, the reed,
 * the mats, the waves, Mamma's boat, the tower, the bark, and the river that takes them both.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:sjon:outlet')) return ['sjonRiver', 'sjonMamma', 'water'];
  if (has(`placed:${BARK.id}`)) return [at < FAR.from ? 'sjonRaft' : 'sjonEnd', 'sjonMamma', 'water'];
  if (has(`placed:${STONE.id}`)) return at >= TOWER.to ? ['sjonBark', 'sjonMamma', 'water'] : ['sjonTower', 'sjonMamma'];
  if (at >= TOWER.to) return ['sjonGap', 'sjonMamma', 'water'];
  if (at >= TOWER.ladder - 0.6) return has('beat:sjon:lookout') ? ['sjonDive', 'sjonMamma', 'water'] : ['sjonTower', 'sjonMamma'];
  if (has('sjon:boat')) return at < BREAK.to + 0.5 ? ['sjonBoat', 'sjonMamma', 'water', 'mamma'] : ['sjonOut', 'sjonMamma'];
  if (at >= 137.6) return ['sjonMamma', 'sjonFamily', 'water', 'mamma'];
  if (at >= JETTY.from) return ['sjonJetty', 'sjonFamily', 'water'];
  if (at >= SHORE.from + 1.5) return ['sjonMats', 'sjonFamily', 'water'];
  if (at >= STONES[2]!.to && at < HIGH.from + 0.5 && player.y < HIGH.y - 0.4) return ['sjonReeds', 'sjonFamily'];
  if (at >= SLIDE.foot) return ['sjonShore', 'sjonFamily'];
  if (at >= SWINGS[1]!.land!.x) return ['sjonSlide', 'sjonFamily'];
  if (at >= 5) return ['sjonSwings', 'sjonFamily'];
  return ['sjonPark', 'sjonFamily'];
};
