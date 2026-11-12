import { FELL_IN } from '../../../sim/constants';
import type { Candy, ChapterData, Flyby, GhostPerch, Jump, Mover, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, hopCandy, round, row, sighting, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 6: Älven (docs/aventyr-2.md), down the river by night. Units: EL. At Flärken the lake's outlet
 * took the little one, and the old trägubbe followed on a log; the family follow by car along the road. The water
 * runs south down Norra Anundsjöån to Bredbyn, where two rivers meet, through the lake below it and on as Moälven
 * towards Billsta (docs/aventyr-2-reference-study.md §4). It is a fairy-tale river: no dam and no power station.
 * The places, from the left:
 *
 * 1. **Strömmen:** from the outlet's bank a little raft carries him down the current to a gravel bank, and from the
 *    raft a flash shows the little one bobbing on the same water. Beyond it the
 *    water turns round in eddies with three logs in them, each a hop from the next only for a moment: he waits, and
 *    goes. Anyone who has fallen in, or plays on Lugnt, is offered a birch leaf as in the village's gutter, which
 *    carries him over. Klonk floats beside him: he is wood.
 * 2. **Stenar och stockar:** stones in the stream with logs between them, each a hop from the last. The logs bob a
 *    little in the eddies, never more than his feet can take; behind the big stone the water turns round.
 * 3. **Bron i Bredbyn:** the rapids under the bridge are far too wild. "Ropa på Pappa": from the bridge he lowers
 *    his scarf, and when Elof takes hold he lifts him up and over the rapids to the far bank.
 * 4. **Bäverhyddan:** stumps the beaver has gnawed are steps, and a gnawed stick up the lodge's steep front is the
 *    climb. Over its top, quietly, and down its far side; an otter swims out towards a stone in the lake.
 * 5. **Sjön:** the widest water of all. The owl from Stormskogen has followed: "Ropa på ugglan", and it flies him
 *    over. Two logs roll in the shallows out to the otter's stone, a way of its own with sweets, never needed.
 * 6. **Moälven:** the river widens. From the owl's back the little one is seen far down it, and from the bank the old
 *    one floats past on the near water and on ahead. At the end the
 *    trail runs out, and he stands on the bank with Moa and Bertil while the night's lowest point and its turning
 *    are said (`al:slut`): the family's car is on the road by the river, the water runs all the way to Billsta,
 *    three mil off, where mormor and morfar live, and they will drive there.
 *
 * To the simulation the river is pits, with the water drawn in them: a fall into it is the glitter bubble.
 */

/**
 * Open water is a pit this deep to the simulation. Its surface is a little under the banks, where a raft and a leaf
 * sit in it; higher between the stones, where the logs float half under; and in the lake's shallows.
 */
const DEEP = -6;
const CURRENT = -0.4;
const STREAM = -0.15;
const RAPID = -0.5;
const LAKE = -0.25;
const BROOK = -0.2;

/** A place to stand: a bank, a stone, a log's top, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

// 1. The current: the outlet's bank, a gravel bank in the stream, and the bank after it.
const OUTLET: Stone = { from: -3, to: 14, y: 0 };
const GRAVEL: Stone = { from: 29.4, to: 37, y: 0.3 };
const BANK: Stone = { from: 49.6, to: 53, y: 0 };
/** The raft and the birch leaf: low on the water, steered only a little, from bank to bank. */
const RAFT = { from: { x: 13.4, y: 0 }, to: { x: 30.4, y: GRAVEL.y }, rise: 0.25, time: 5.4, corridor: 0.3 };
const LEAF = { from: { x: 36.4, y: GRAVEL.y }, to: { x: 50.6, y: 0 }, rise: 0.25, time: 4.6, corridor: 0.3 };

// 2. Stones in the stream, with a bobbing log between each two: every hop is as wide as a hop between Flärken's
// reed mats.
const S1: Stone = { from: 54.4, to: 56.4, y: 0.4 };
const L1: Stone = { from: 57.8, to: 60, y: 0.4 };
const S2: Stone = { from: 61.4, to: 63.4, y: 0.6 };
const L2: Stone = { from: 64.8, to: 67, y: 0.6 };
const BIG: Stone = { from: 68.4, to: 72.6, y: 0.8 };
const L3: Stone = { from: 74, to: 76.2, y: 0.6 };
const FLAT: Stone = { from: 77.6, to: 81.6, y: 0.6 };
const STONES: Stone[] = [BANK, S1, L1, S2, L2, BIG, L3, FLAT];

/**
 * A log bobs in the eddy so little that it carries him like a stone: a few hundredths of an EL either way. It is
 * nearly as thick as he is tall, and floats with its top at the stones' height, half under the water.
 */
const BOB = 0.07;
const LOG_HIGH = 0.9;
const bobbing = (id: string, log: Stone, seconds: number, phase: number): Mover => ({
  id, look: 'riverLog', width: log.to - log.from, height: LOG_HIGH, verb: 'push',
  cycle: { seconds, phase },
  stops: [{ x: (log.from + log.to) / 2, y: round(log.y - LOG_HIGH - BOB) }, { x: (log.from + log.to) / 2, y: round(log.y - LOG_HIGH + BOB) }],
});

/**
 * The eddies below the gravel bank: logs the water turns to and fro, at the gravel's height. Two neighbours go opposite
 * ways, so that each comes to the next once a round, end to end, and each end of the row comes to its bank.
 */
const TURN = 5.2;
const EDDY_WIDTH = 2.2;
const turning = (id: string, from: number, to: number, phase: number): Mover => ({
  id, look: 'riverLog', width: EDDY_WIDTH, height: LOG_HIGH, verb: 'push',
  cycle: { seconds: TURN, phase, wait: true },
  stops: [{ x: from, y: round(GRAVEL.y - LOG_HIGH) }, { x: to, y: round(GRAVEL.y - LOG_HIGH) }],
});
const EDDY: Mover[] = [
  turning('al-eddy-1', 38.7, 41.2, 0),
  turning('al-eddy-2', 43.4, 45.4, TURN / 2),
  turning('al-eddy-3', 47.6, 48.4, 0),
];

// 3. Bredbyn: the bank, the rapids under the bridge, and the far bank. Pappa's scarf lifts him over.
const BREDBYN: Stone = { from: 81.6, to: 92.4, y: 0 };
const RAPIDS = { from: 92.4, to: 107.4 };
const LIFT = { from: { x: 91.6, y: 0 }, to: { x: 108.4, y: 0 }, rise: 4.4, time: 4.6, corridor: 0.4 };
const CALL_PAPPA = 88.6;
/** The road bridge over the rapids, just behind the play plane: its deck high over him, its piers in the water. */
const BRIDGE = { x: 100, width: 24, height: 7.8 };
/** The bridge's deck, where Pappa stands: the deck's slab is centred on its height, and is 2.4 thick. */
const DECK = BRIDGE.height + 1.2 + RAPID;
/**
 * Pappa's scarf (src/render/scarf.ts). He stands at the railing straight over where Elof takes hold, so that it hangs
 * straight down to him, held out over the railing in both hands (`hands` high, `out` behind the path); while it
 * lifts Elof he walks along the bridge with him, and stands at its far end after. His lamp is set down on the edge of the
 * deck beside him meanwhile, and lights Elof from there.
 */
const SCARF = { at: 91.7, hands: DECK + 2.6, out: -0.3, wool: '#a8322b', lamp: { x: 93.2, y: DECK + 0.55, z: -0.72 } };
const PAPPA_STANDS = { x: SCARF.at, y: DECK, z: -1.5 };

// 4. The beaver's place: two gnawed stumps, a step each, and the lodge, too steep to jump: a gnawed stick up it.
const FAR_BANK: Stone = { from: 107.4, to: 116.4, y: 0 };
const STUMP1: Stone = { from: 116.4, to: 118, y: 0.9 };
const STUMP2: Stone = { from: 118, to: 119.8, y: 1.8 };
const LODGE: Stone = { from: 119.8, to: 123.6, y: 4.8 };
/** Down the lodge's far side, sticks and mud, to the lake's shore. */
const SLOPE_END = 131;
const lodgeSide = (x: number) => round(LODGE.y - ((x - LODGE.to) * LODGE.y) / (SLOPE_END - LODGE.to), 4);
const STICK = { x: 119.5, bottom: STUMP2.y, top: LODGE.y, exit: 1 as const, look: 'root' as const };

// 5. The lake: its shore, the owl, the otter's stone out in the shallows, and the far shore.
const SHORE: Stone = { from: SLOPE_END, to: 137.4, y: 0 };
const CALL_OWL = 133.8;
/**
 * The owl's flight (Olov, 9 November 2026: "När man flyger på ugglan över sjön syns godisar under. Går de att ta?").
 * It skims low over the shallows, over the rolling logs, so that the sweets on the way out to the otter's stone are
 * just under him: the stick dips him down to each (src/sim/ride-path.ts). Then it climbs high over the wide lake,
 * where he sees the little one far ahead, and comes down to the far shore. Low as it goes, the owl under him stays
 * clear of the water and the logs.
 */
const OWL = { from: { x: 136.2, y: 0 }, to: { x: 166, y: 0.4 }, rise: 4.6, time: 6.6, corridor: 0.7, skim: { from: 138.4, to: 143.8, y: 1.85 } };
const OTTER: Stone = { from: 145.2, to: 148.2, y: 0.5 };
/**
 * Two logs the eddy rolls to and fro in the shallows, a hop apart, their tops at the shore's height: the way out to
 * the otter's stone, and back. Thinner than the logs between the stones, they float half under too.
 */
const ROLL = { seconds: 3.4, width: 2, high: 0.6 };
const rolling = (id: string, x: number, phase: number): Mover => ({
  id, look: 'riverLog', width: ROLL.width, height: ROLL.high, verb: 'push', extra: true,
  cycle: { seconds: ROLL.seconds, phase },
  stops: [{ x: x - 0.2, y: -ROLL.high - 0.06 }, { x: x + 0.2, y: -ROLL.high + 0.06 }],
});
const ROLLERS: Mover[] = [rolling('al-roll-1', 139.6, 0), rolling('al-roll-2', 142.8, ROLL.seconds / 2)];

// 6. Moälven: the far shore, a stone in a stream that joins it, and the shore on towards Billsta.
const MOALVEN: Stone = { from: 165, to: 172, y: 0.4 };
const CREEK: Stone = { from: 173.4, to: 175.2, y: 0.6 };
// The end wall stays beyond the whole parked car: a wall at the goal hides its front half from the river.
const ON: Stone = { from: 176.6, to: 224, y: 0.4 };
const CREEK_WAY: Stone[] = [MOALVEN, CREEK, ON];

/**
 * Moa and Bertil (Olov, 9 November 2026: "Bertil och Moa bara dyker upp vid bilen"). They have followed by car, and wait
 * by it on the road at the river's end from the start, searching the water with their lamps: he sees them there as he
 * comes along Moälven, and they run down from the car to the bank at the trail's end, Bertil round the gnawed stump.
 */
const KIDS = {
  /**
   * Where he is when they set off: on the far bank of the creek, where he can stop safely and see both children come down
   * from the car before the trail runs out.
   */
  run: 177.8,
  car: { moa: { x: 186.4, y: 0, z: -9.6 }, bertil: { x: 188.8, y: 0, z: -9 } },
  bank: { moa: { x: 183.2, y: ON.y, z: -1.2 }, bertil: { x: 185.4, y: ON.y, z: -0.9 } },
  /** Where they shine their lamps, waiting: the river, where he will come. */
  river: { x: 177, y: 0, z: 0 },
  /** Where Elof stands as the trail runs out, for them to look at. */
  elof: { x: 181.6, y: ON.y + 0.9, z: 0 },
};
/** Where the old one is seen on his log: on the bank after the eddies, the stones and their logs ahead. */
const OLD_SEEN = 50.4;
/** The old one on his log among the logs between the stones, floating on down the stream. */
const OLD_FLOATS: Flyby = { on: 'beat:al:old-one', from: { x: round(OLD_SEEN + 7.6, 1), y: 0.3 }, to: { x: round(OLD_SEEN + 21.6, 1), y: 0.5 }, seconds: 3.6, who: 'tragubbe', lit: [1.2] };
/** From the bank after the eddies: Elof, the first stones and the old one on the water in one picture. */
const OLD_SIGHTING = sighting('al:gamla', OLD_SEEN, 51.2, 'al:old-one', 'al:old-seen', OLD_FLOATS,
  { x: OLD_SEEN + 5, y: 1.8, height: 7, width: 9 }, { x: OLD_SEEN + 10.4, y: 1.8, height: 7, width: 10 });
/** Where the old one is seen once more, floating on ahead, a little before the trail's end. */
const OLD_AHEAD = 171.6;
/** Where the last of the handful lies, and the trail ends. */
const TRAIL_END = 181;
/** What is said there, in order: the loss, and the family lifting him out of it. One conversation, told standing. */
const ENDING = ['al:last', 'al:gone', 'al:afraid', 'al:klonk-near', 'al:moa-never', 'al:bertil-pocket', 'al:moa-trail', 'al:billsta', 'al:car', 'al:window', 'al:klonk-end'];
/** The time card, which Moa and Bertil stand in by the car. */
const CARD = timeCard('alven', 1);

/** A stone in the ground's outline: up out of the water, across, and down again. */
const island = (s: Stone): Vec[] => [{ x: s.from, y: DEEP }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: DEEP }];
/** A log is no ground: the water is under it, and the log itself is a thing on a rail. */
const isLog = (s: Stone) => s === L1 || s === L2 || s === L3;

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[]): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.9), y: next.y } };
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

/** Klonk on the water, a little behind the play plane: he floats, being wood. */
const afloat = (x: number, water: number): GhostPerch => ({ at: { x, y: water }, z: -0.6 });

export const alven: ChapterData = {
  id: 'alven',
  // The night forest along the river.
  place: 'forest',
  river: true,
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (src/content/chapters/cards.ts).
  scenes: [
    // As the chapter opens, Moa and Bertil wait by the family's car at the river's end, far ahead, lamps on the water.
    { ...CARD, stage: { ...CARD.stage, actors: {
      moa: [{ at: 0, ...KIDS.car.moa, face: 0.36, move: 0.01, act: 'shine', aim: KIDS.river, holds: 'lamp-moa' }],
      bertil: [{ at: 0, ...KIDS.car.bertil, face: 0.4, move: 0.01, act: 'shine', aim: KIDS.river, holds: 'lamp-bertil' }],
    } } },
    // On the bank after the eddies: the old one on his log, seen and called to (../kit.ts, `sighting`).
    OLD_SIGHTING,
    // Called, Pappa is seen where he stands: up at the bridge's railing over the bank, lowering his scarf. The picture
    // opens out for a moment to show all of it: him on the bridge, the scarf coming down, and Elof on the bank below.
    {
      id: 'bron', on: 'al:pappa', until: 'al:lift', before: 92, seconds: 1.5, hold: true,
      stage: { shots: [{ at: 0, x: SCARF.at + 0.6, y: DECK - 1.6, height: 15.5, width: 16, move: 0.35 }] },
    },
    // The owl keeps flying and answering the stick while Elof points out the little one. Only this distant
    // figure and its camera wait for the line; the wider shot includes the owl all the way to its landing.
    // Its clock waits for the line, so it is over soon after the words: before he comes to the children on the bank.
    {
      id: 'al:little', at: 152, needs: 'al:owl', before: 169, seconds: 1.4, dialogue: ['al:see-little'],
      cues: [{ at: 0.8, flag: 'al:little-seen' }],
      stage: { shots: [{ at: 0, x: 160.5, y: 2.8, height: 7.5, width: 20, move: 0.6 }] },
    },
    // As he comes along Moälven they see his light, and run down from the car to the bank at the trail's end, Moa first,
    // Bertil round the gnawed stump after her: there when the trail runs out ("Vi letar tillsammans. Jag är här.").
    // He watches from the safe bank after the creek. The shot includes both children from their first step, also on
    // a portrait phone: from farther away the ordinary following camera missed their run entirely.
    { id: 'al:kids', at: KIDS.run, seconds: 3.6, hold: true, stage: {
      shots: [{ at: 0, x: 183.4, y: 3.4, height: 12.8, width: 16, move: 0.5 }],
      actors: {
      moa: [
        { at: 0, act: 'look', aim: KIDS.elof },
        { at: 0.15, ...KIDS.bank.moa, move: 2.2, act: 'look', aim: KIDS.elof },
      ],
      bertil: [
        { at: 0.25, x: 187.8, y: 0.2, z: -4.6, move: 1.1, act: 'look', aim: KIDS.elof },
        { at: 1.35, ...KIDS.bank.bertil, move: 1.25, act: 'look', aim: KIDS.elof },
      ],
    } } },
    // The trail's end. He stands with Moa and Bertil on the bank while the night's lowest point and its turning are
    // said, the car on the road behind them: one conversation, which a boy running on to the end of the bank would
    // have left behind him. Its clock waits for the words, so its last second is the breath after them.
    {
      id: 'al:slut', at: TRAIL_END, seconds: 2, hold: true, dialogue: ENDING,
      // The first word waits until the picture has all three of them in it.
      cues: [{ at: 1, flag: 'al:end-shown' }],
      stage: {
        shots: [{ at: 0, x: 184.6, y: 3.4, height: 12.8, width: 18, move: 0.9 }],
        actors: {
          moa: [{ at: 0, act: 'look', aim: KIDS.elof }],
          bertil: [{ at: 0, act: 'look', aim: KIDS.elof }],
        },
      },
    },
  ],
  goalX: 186,
  // The road and the children's whole approach stay in view; close spruces otherwise hide Moa as she sets off.
  treeGaps: [{ from: 178, to: 212, back: -22 }],
  trailEnds: true,
  // Pappa answers in the coda: he follows by car along the river.
  coda: 'pappa',
  ground: [
    { x: -3, y: 12 },
    { x: OUTLET.from, y: OUTLET.y },
    // 1. the outlet's bank, the current, the gravel bank in it, and the bank after the leaf
    { x: OUTLET.to, y: OUTLET.y },
    { x: OUTLET.to, y: DEEP },
    ...island(GRAVEL),
    { x: BANK.from, y: DEEP },
    { x: BANK.from, y: BANK.y },
    { x: BANK.to, y: BANK.y },
    { x: BANK.to, y: DEEP },
    // 2. the stones in the stream: the logs between them float over the water
    ...STONES.slice(1, -1).filter((s) => !isLog(s)).flatMap(island),
    { x: FLAT.from, y: DEEP },
    { x: FLAT.from, y: FLAT.y },
    { x: FLAT.to, y: FLAT.y },
    // 3. down onto the bank in Bredbyn, the rapids under the bridge, and the far bank
    { x: BREDBYN.from, y: BREDBYN.y },
    { x: BREDBYN.to, y: BREDBYN.y },
    { x: RAPIDS.from, y: DEEP },
    { x: RAPIDS.to, y: DEEP },
    { x: RAPIDS.to, y: FAR_BANK.y },
    // 4. the gnawed stumps, the lodge's steep front and its top, and its far side down to the lake
    { x: STUMP1.from, y: FAR_BANK.y },
    { x: STUMP1.from, y: STUMP1.y },
    { x: STUMP2.from, y: STUMP1.y },
    { x: STUMP2.from, y: STUMP2.y },
    { x: LODGE.from, y: STUMP2.y },
    { x: LODGE.from, y: LODGE.y },
    { x: LODGE.to, y: LODGE.y },
    { x: SLOPE_END, y: SHORE.y },
    // 5. the lake's shore, the lake with the otter's stone in it, and the far shore
    { x: SHORE.to, y: SHORE.y },
    { x: SHORE.to, y: DEEP },
    ...island(OTTER),
    { x: MOALVEN.from, y: DEEP },
    { x: MOALVEN.from, y: MOALVEN.y },
    // 6. along Moälven, over the stream that joins it, and on
    { x: MOALVEN.to, y: MOALVEN.y },
    { x: MOALVEN.to, y: DEEP },
    ...island(CREEK),
    { x: ON.from, y: DEEP },
    { x: ON.from, y: ON.y },
    { x: ON.to, y: ON.y },
    { x: ON.to, y: 10 },
  ],
  water: [
    { from: OUTLET.to, to: GRAVEL.from, y: CURRENT },
    { from: GRAVEL.to, to: BANK.from, y: CURRENT },
    { from: BANK.to, to: S1.from, y: STREAM },
    { from: S1.to, to: S2.from, y: STREAM },
    { from: S2.to, to: BIG.from, y: STREAM },
    { from: BIG.to, to: FLAT.from, y: STREAM },
    { from: RAPIDS.from, to: RAPIDS.to, y: RAPID },
    { from: SHORE.to, to: OTTER.from, y: LAKE },
    { from: OTTER.to, to: MOALVEN.from, y: LAKE },
    { from: MOALVEN.to, to: CREEK.from, y: BROOK },
    { from: CREEK.to, to: ON.from, y: BROOK },
  ],
  surfaces: [
    { from: GRAVEL.from, to: GRAVEL.to, kind: 'wetRock' },
    ...[S1, S2, BIG, FLAT, OTTER, CREEK].map((s) => ({ from: s.from, to: s.to, kind: 'wetRock' as const })),
    // The stumps and the lodge are gnawed sticks and mud.
    { from: STUMP1.from, to: SLOPE_END, kind: 'earth' },
  ],
  // The big stones in the stream, for the picture: boulders worn by the water.
  landmarks: [S1, S2, BIG, OTTER, CREEK].map((s) => ({ look: 'stone' as const, from: s.from, to: s.to, base: DEEP })),
  checkpoints: [
    { x: 4, y: 0 },
    { x: 33.2, y: GRAVEL.y },
    // Past where he stands to see the old one on his log, so that the sight is before it, as it was.
    { x: 52.4, y: BANK.y },
    { x: 70.4, y: BIG.y },
    { x: 86.2, y: BREDBYN.y },
    { x: 110.6, y: FAR_BANK.y },
    { x: 132.6, y: SHORE.y },
    { x: 168.4, y: MOALVEN.y },
  ],
  movers: [
    ...EDDY,
    bobbing('al-log-1', L1, 2.8, 0),
    bobbing('al-log-2', L2, 3.1, 1.2),
    bobbing('al-log-3', L3, 2.6, 0.6),
    ...ROLLERS,
  ],
  climbs: [STICK],
  spots: [
    // The raft at the outlet's bank, and the birch leaf at the gravel bank's end: he steps on, the current carries him.
    { id: 'al:raft', at: RAFT.from, verb: 'take', word: 'board', ride: 'al:raft' },
    // The gentle way: offered to anyone who has fallen in, or plays on Lugnt.
    { id: 'al:leaf', at: LEAF.from, verb: 'take', word: 'board', needs: FELL_IN, ride: 'al:leaf' },
    // On the bank before the rapids: he calls Pappa, who lowers his scarf from the bridge; then he takes hold.
    // Pappa himself is up on the bridge, at its railing over the bank's end ("Jag står här uppe på bron!"); while the
    // scarf lifts Elof he walks along the bridge with him, and stays at its far end.
    {
      id: 'al:pappa', look: 'sign', at: { x: CALL_PAPPA, y: 0 }, standsAt: PAPPA_STANDS, verb: 'call', word: 'callPappa',
      goesTo: { ...PAPPA_STANDS, x: LIFT.to.x + 0.4 }, goesWhen: 'al:lift',
    },
    { id: 'al:lift', at: LIFT.from, verb: 'take', word: 'alScarf', needs: 'al:scarf', ride: 'al:lift' },
    // On the lake's shore: the owl from the forest. Called, it glides over and settles where he climbs up (`goesTo`), and
    // that owl is the one that carries him.
    { id: 'al:owl-call', look: 'owl', at: { x: CALL_OWL, y: 0 }, goesTo: { x: OWL.from.x + 0.6, y: 0, z: -0.6 }, verb: 'call', word: 'alCallOwl' },
    { id: 'al:owl', at: OWL.from, verb: 'take', word: 'alBoardOwl', needs: 'al:owl-ready', ride: 'al:owl' },
  ],
  rides: [
    { id: 'al:raft', look: 'raft', ...RAFT },
    { id: 'al:leaf', look: 'leaf', ...LEAF },
    // Pappa's scarf: Elof hangs from it by his hands, lifted up towards the bridge and down on the far side.
    { id: 'al:lift', look: 'none', ...LIFT },
    { id: 'al:owl', look: 'owl', ...OWL },
  ],
  later: [
    // Pappa leans over the railing and lowers his scarf: he watches it come down, a moment only.
    { flag: 'al:scarf', after: 'al:pappa', until: 'al:lift', within: [84, 95], seconds: 1.6, hold: true },
    // The owl glides down from its stone and settles beside him.
    { flag: 'al:owl-ready', after: 'al:owl-call', until: 'al:owl', within: [128, 139], seconds: 1.4, hold: true },
  ],
  jumps: [...hops(STONES), ...hops(CREEK_WAY)],
  storm: {
    rain: 1,
    lightning: 7.5,
    // Pappa's scarf, red wool: lowered from his hands over the railing, and held down to Elof's all the way over the rapids.
    ropes: [{ ride: 'al:lift', held: 'al:pappa', from: { x: SCARF.at, y: SCARF.hands }, z: SCARF.out, colour: SCARF.wool, lamp: SCARF.lamp }],
    flybys: [
      // From the raft: the little one, bobbing on the same water a little ahead of it, and slowly away from it down
      // the current. Seen as he is, for as long as the line that points at him is new, and on the near water: the
      // boulders of the far bank hide what floats behind the raft's own lane.
      { on: 'beat:al:flash', from: { x: round(RAFT.from.x + 5, 1), y: 0 }, to: { x: round(RAFT.from.x + 24.6, 1), y: 0.2 }, z: 1.4, seconds: 5, who: 'lillgubbe', lit: [1.8] },
      // From the bank after the eddies: the old one on his log, among the logs between the stones.
      OLD_FLOATS,
      // From the owl's back, high over the lake: the little one, far down the river.
      { on: 'al:little-seen', from: { x: 161, y: 0.4 }, to: { x: 167, y: 0.4 }, z: -2.8,
        seconds: 5, who: 'lillgubbe', size: 1.8, lit: [0, 2.4] },
      // On Moälven: the old one once more, carried past on the wide water in front of the bank and on ahead. Behind
      // the bank are the fallen spruce, the road and the car, which hid him; the river itself is in front here.
      { on: 'beat:al:old-ahead', from: { x: round(OLD_AHEAD + 1, 1), y: -0.1 }, to: { x: round(OLD_AHEAD + 15, 1), y: -0.1 }, z: 2.6, toZ: 3, size: 1.5, seconds: 5, who: 'tragubbe', lit: [2] },
    ],
    glows: [
      // Pappa's lamp up on the bridge, set down on the edge of its deck once he is called, to hold his scarf.
      { at: { x: SCARF.lamp.x, y: SCARF.lamp.y }, z: SCARF.lamp.z, size: 1.4, after: 'al:pappa' },
      // The family's car on the road by the river, its headlights on: they drive to Billsta.
      { at: { x: 177.6, y: 1.4 }, z: -2.6, size: 1.6, after: 'beat:al:billsta' },
      { at: { x: 178.6, y: 1.4 }, z: -2.6, size: 1.6, after: 'beat:al:billsta' },
    ],
    // Cream foam on the black water: below the outlet and down through the rapids.
    foam: [
      { from: OUTLET.to, to: GRAVEL.from, y: CURRENT, speed: 4, dense: 8 },
      { from: GRAVEL.to, to: BANK.from, y: CURRENT, speed: 1.6 },
      { from: RAPIDS.from, to: RAPIDS.to, y: RAPID, speed: 6, dense: 12 },
    ],
    buildings: [
      { kind: 'birch', x: 8, z: -12 },
      // The bridge in Bredbyn over the rapids: its piers stand in the water.
      { kind: 'bridge', x: BRIDGE.x, z: -6, y: RAPID, width: BRIDGE.width, height: BRIDGE.height },
      { kind: 'birch', x: 86, z: -15 },
      // The beaver's lodge, a heap of sticks behind the stumps and the slope he climbs.
      { kind: 'lodge', x: 122.4, z: -7, y: CURRENT, width: 18, height: 7.4 },
      { kind: 'birch', x: 181, z: -18 },
      // The road along the river, where the family's car stops for him at the end.
      { kind: 'car', x: 195, z: -17, lit: 'beat:al:billsta' },
    ],
  },
  // Far across the lake a moose may come down to the water.
  life: [{ kind: 'moose', from: 128, to: 137 }],
  decor: [
    // A frog on the bank, by the reeds.
    { look: 'kit', word: 'groda', at: { x: 111.6, y: 0 }, z: -1.3, turn: 0.5, scale: 0.8 },
    // The beaver itself, on the bank by its stumps, gnawing a stick: it looks at Elof, thumps its tail and goes behind its
    // lodge, and swims home over the lake while he is up on the roof (../beaver.ts).
    { look: 'kit', word: 'baver', at: { x: 115.2, y: FAR_BANK.y }, z: -2.6 },
    // Gnawed stumps on the beaver's steps, and what he has felled and dropped along the banks.
    { look: 'kit', word: 'stubbe-gnagd', at: { x: 117.1, y: 0.9 }, z: -0.9, turn: 0.4 },
    { look: 'kit', word: 'stubbe-gnagd', at: { x: 118.9, y: 1.8 }, z: -1.1, turn: 1.9, scale: 1.2 },
    { look: 'kit', word: 'stubbe-sagad', at: { x: 112.6, y: 0 }, z: -2.2, turn: 0.8 },
    { look: 'kit', word: 'gren-a', at: { x: 110.4, y: 0 }, z: -1.4, turn: 0.3 },
    { look: 'kit', word: 'gren-b', at: { x: 6.4, y: 0 }, z: -1.5, turn: 2.2 },
    { look: 'kit', word: 'lag-mossig', at: { x: 171, y: 0.4 }, z: -2.6, turn: 0.2 },
    { look: 'kit', word: 'gren-a', at: { x: 184, y: 0.4 }, z: -1.8, turn: 2.8 },
    { look: 'kit', word: 'stubbe-gnagd', at: { x: 186.4, y: 0.4 }, z: -2, turn: 1 },
    // The rapids under the bridge: far too wild, and it should look it.
    { look: 'whiteWater', at: { x: (RAPIDS.from + RAPIDS.to) / 2, y: RAPID } },
    // And the forest torrent below the outlet, which the raft goes down.
    { look: 'whiteWater', at: { x: 22, y: CURRENT } },
    // The otter on its stone.
    { look: 'otter', at: { x: (OTTER.from + OTTER.to) / 2, y: OTTER.y }, z: 0.1 },
    // Reeds along the banks, and in the shallows by them.
    ...[3.6, 10.8, 49.9, 82.6, 131.8].map((x) => ({ look: 'reed' as const, at: { x, y: 0 } })),
    // Behind the beaver, so its paws, stick and broad tail are seen as he comes off the bridge.
    { look: 'reed', at: { x: 113, y: 0 }, z: -6 },
    ...[165.4, 177.4, 190.4].map((x) => ({ look: 'reed' as const, at: { x, y: ON.y } })),
    ...[15.2, 48.8].map((x) => ({ look: 'reed' as const, at: { x, y: CURRENT } })),
    { look: 'reed', at: { x: 164.4, y: LAKE } },
  ],
  // Klonk is always a little ahead. Over open water he floats, being wood; elsewhere he waits on firm ground.
  // Klonk hops onward before Elof can stand on the narrow bank. Leave the witnessed picture here to read.
  thoughtClues: [{ at: { x: 31, y: GRAVEL.y + .5 }, picture: 'small-figure', after: 'beat:al:flash' }],
  ghost: [
    { at: { x: 6, y: 0 } },
    afloat(18, CURRENT),
    afloat(24.6, CURRENT),
    // On the gravel bank he thinks of the little one, once the flash has shown it.
    { at: { x: 32.6, y: GRAVEL.y }, thought: { picture: 'small-figure', after: 'beat:al:flash' } },
    afloat(41.4, CURRENT),
    afloat(46.6, CURRENT),
    { at: { x: 52.2, y: BANK.y } },
    { at: { x: 55.6, y: S1.y } },
    { at: { x: 62.6, y: S2.y } },
    { at: { x: 71.6, y: BIG.y } },
    { at: { x: 79.6, y: FLAT.y } },
    { at: { x: 85.6, y: BREDBYN.y } },
    // Over the rapids a ghost hops where a boy has to be lifted.
    { at: { x: 112.4, y: FAR_BANK.y } },
    { at: { x: 118.9, y: STUMP2.y } },
    { at: { x: 121.8, y: LODGE.y } },
    { at: { x: 126.8, y: lodgeSide(126.8) } },
    { at: { x: 135.4, y: SHORE.y } },
    // Out on the otter's stone, and floating on the lake, while the owl carries Elof high over him.
    { at: { x: 146.7, y: OTTER.y } },
    afloat(155, LAKE),
    afloat(161, LAKE),
    { at: { x: 170.4, y: MOALVEN.y } },
    { at: { x: 174.3, y: CREEK.y } },
    { at: { x: 180, y: ON.y } },
    { at: { x: 188, y: ON.y } },
  ],
  beats: [
    // Which lines are the story's and which are passing remarks (`aside`): docs/dialogue.md.
    // 0. the outlet: where the water goes, and the little raft. What he says to Klonk is said standing there.
    { id: 'al:arrive', at: 2.4, who: 'elof', line: 'alArrive' },
    { id: 'al:klonk-floats', at: 5.4, who: 'elof', line: 'alKlonkFloats', aside: true },
    { id: 'al:klonk', on: 'beat:al:klonk-floats', who: 'spoket', line: 'alKlonk', aside: true },
    // 1. the current. The flash comes on the raft, where there is time to look: the little one bobs on the same water,
    // just ahead of him. It is a sight of the ride, and gives way to the logs' words if he boards with a line still up.
    { id: 'al:raft-seen', at: 11, until: 'al:raft', who: 'elof', line: 'alRaftSeen', read: true },
    { id: 'al:flash', on: 'al:raft', within: [12, 31], who: 'elof', line: 'alFlash', aside: 3 },
    { id: 'al:current', on: 'al:raft', within: [12, 31], who: 'elof', line: 'alCurrent', aside: true },
    // On the gravel bank the logs' own words come first, as he lands: they are what he has to do next.
    { id: 'al:logs-wait', at: 31.2, who: 'elof', line: 'alLogsWait', read: true },
    { id: 'al:leaf-seen', on: FELL_IN, within: [GRAVEL.from, BANK.from], until: 'al:leaf', who: 'elof', line: 'alLeafSeen', read: true },
    // 2. the stones and the logs: from the bank after the eddies, the old one on his log among them
    { id: 'al:old-one', at: OLD_SEEN, needs: 'al:old-seen', who: 'elof', line: 'alOldOne' },
    // 3. Bredbyn, the rapids, and Pappa on the bridge. He sees the rapids as he steps onto the bank, and Pappa
    // answers; called, Pappa is shown lowering his scarf (`bron`), and then says what to do with it, which Elof is
    // free to do at once.
    { id: 'al:bredbyn', at: 74.6, who: 'elof', line: 'alBredbyn', aside: true },
    { id: 'al:rapids', at: 82.6, until: 'al:pappa', who: 'elof', line: 'alRapids' },
    { id: 'al:pappa-here', on: 'beat:al:rapids', until: 'al:pappa', who: 'pappa', line: 'alPappaHere', read: true },
    { id: 'al:take-hold', on: 'scene:bron', until: 'al:lift', within: [84, 95], who: 'pappa', line: 'alTakeHold', read: true },
    { id: 'al:up', on: 'al:lift', within: [90, 109], who: 'elof', line: 'alUp', aside: 12 },
    { id: 'al:thanks', at: 109.6, needs: 'al:lift', who: 'elof', line: 'alThanks' },
    { id: 'al:follow', on: 'beat:al:thanks', who: 'pappa', line: 'alFollow' },
    // 4. the beaver's place
    { id: 'al:lodge', at: 120.8, who: 'elof', line: 'alLodge', aside: true },
    { id: 'al:otter', at: 126.4, who: 'elof', line: 'alOtter', aside: true },
    // 5. the lake, and the owl: who it is comes first; on its back the words are the little one's (`al:little`)
    { id: 'al:lake', at: 127.6, who: 'elof', line: 'alLake', aside: true },
    { id: 'al:owl-seen', at: 131.4, until: 'al:owl-call', who: 'elof', line: 'alOwlSeen', read: true },
    { id: 'al:owl-here', on: 'al:owl-ready', until: 'al:owl', within: [128, 139], who: 'elof', line: 'alOwlHere', read: true },
    { id: 'al:owl-fly', on: 'al:owl', within: [134, 150], who: 'elof', line: 'alOwlFly', aside: 12 },
    { id: 'al:see-little', on: 'al:little-seen', who: 'elof', line: 'alSeeLittle', read: true },
    { id: 'al:owl-thanks', at: 167, needs: 'al:owl', who: 'elof', line: 'alOwlThanks', aside: 4 },
    // 6. Moälven; the family's car, and the drive to Billsta
    { id: 'al:moalven', at: 168.6, who: 'elof', line: 'alMoalven', aside: 4 },
    { id: 'al:old-ahead', at: OLD_AHEAD, who: 'elof', line: 'alOldAhead', aside: true },
    // The handful from the bowl is gone: the trail ends here, and with it he has lost them. The night's lowest point,
    // and the family lifts him out of it. From here to Billsta the trail is Moa's and Bertil's. He stands with them
    // while it is said (`al:slut`).
    { id: 'al:last', at: TRAIL_END, needs: 'al:end-shown', who: 'elof', line: 'alLast', read: true },
    { id: 'al:gone', on: 'beat:al:last', who: 'elof', line: 'alGone', read: true },
    { id: 'al:afraid', on: 'beat:al:gone', who: 'elof', line: 'alAfraid', read: true },
    { id: 'al:klonk-near', on: 'beat:al:afraid', who: 'spoket', line: 'alKlonkNear', read: true },
    { id: 'al:moa-never', on: 'beat:al:klonk-near', who: 'moa', line: 'alMoaNever', read: true },
    { id: 'al:bertil-pocket', on: 'beat:al:moa-never', who: 'bertil', line: 'alBertilPocket', read: true },
    { id: 'al:moa-trail', on: 'beat:al:bertil-pocket', who: 'moa', line: 'alMoaTrail', read: true },
    { id: 'al:billsta', on: 'beat:al:moa-trail', who: 'pappa', line: 'alBillsta', read: true },
    { id: 'al:car', on: 'beat:al:billsta', who: 'mamma', line: 'alCar', read: true },
    { id: 'al:window', on: 'beat:al:car', who: 'elof', line: 'alWindow', read: true },
    { id: 'al:klonk-end', on: 'beat:al:window', who: 'spoket', line: 'alKlonkEnd' },
  ],
  cameras: [
    { from: -3, to: 13, zoom: 1.2 },
    // Down the current the picture is wide and looks ahead, so the next bank is in it.
    { from: 13, to: 52, zoom: 1.45, lift: 0.3, lead: 3.4 },
    { from: 52, to: 82, zoom: 1.3, lift: 0.2 },
    // At the rapids the bridge is in the picture, the scarf coming down from Pappa's hands at its railing (on a big
    // screen his hands too), and the arc he is lifted along.
    { from: 82, to: 110, zoom: 2, lift: 3.4 },
    { from: 110, to: 132, zoom: 1.35, lift: 0.9 },
    // Over the lake the picture opens out, the owl's arc and the far shore in it.
    { from: 132, to: 168, zoom: 1.6, lift: 1.4, lead: 3.4 },
    // At the end the river widens, and the family's car waits on the road.
    { from: 168, to: ON.to, zoom: 1.55, lift: 0.8 },
  ],
  candy: [
    // 0. the outlet's bank, up to the raft
    ...row(2.6, 12.6, 0),
    // 1. on the raft down the current, across the gravel bank, and on the birch leaf
    ...alongAll(RAFT, [0.1, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92]),
    ...row(31.4, 35.4, GRAVEL.y),
    ...alongAll(LEAF, [0.1, 0.22, 0.36, 0.5, 0.6, 0.8, 0.92]),
    { x: 51.8, y: 0.45 },
    // 2. from stone to log to stone, and along the flat stone
    ...over(STONES),
    ...row(78.6, 80.4, FLAT.y, 1.8),
    // 3. down onto the bank in Bredbyn, to Pappa's sign and the scarf, and up and over the rapids
    { x: 82.2, y: 0.45 },
    ...row(83.6, 87.6, 0),
    { x: 89.4, y: 0.45 },
    { x: 90.6, y: 0.45 },
    ...alongAll(LIFT, [0.1, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92]),
    // 4. the far bank, up the stumps and the gnawed stick, over the lodge and down its far side
    ...row(109.6, 115.6, 0),
    { x: 117.1, y: round(STUMP1.y + 0.45) },
    { x: 118.7, y: round(STUMP2.y + 0.45) },
    { x: STICK.x, y: 3 },
    { x: STICK.x, y: 4.2 },
    { x: 120.6, y: round(LODGE.y + 0.45) },
    { x: 122.4, y: round(LODGE.y + 0.45) },
    ...slopeRow(124.4, 130.4, LODGE.to, LODGE.y, SLOPE_END, SHORE.y),
    // 5. the lake's shore, to the owl, and over the lake on its back
    { x: 132.4, y: 0.45 },
    { x: 134, y: 0.45 },
    { x: 135.4, y: 0.45 },
    ...alongAll(OWL, [0.08, 0.18, 0.28, 0.38, 0.48, 0.58, 0.68, 0.78, 0.88, 0.96]),
    // 6. along Moälven, over the stream, and on towards Billsta
    ...row(167.4, 171.4, MOALVEN.y),
    ...over(CREEK_WAY),
    // The last of the handful from the bowl.
    ...row(177.8, 180.6, ON.y),
  ],
  // Side candy: hearts and lollipops on the way out to the otter's stone, in the arcs of the hops from the shore to the
  // first rolling log, from it to the second and from that to the stone, and one a hop up over the first log. None is
  // taken from the shore, nor by following the owl's trail; from its back, the stick dips him down to every one (`OWL`).
  // New ones are added at the end.
  side: [
    { x: 138.4, y: 1.5 },
    { x: 139.7, y: 1.45 },
    { x: 141.2, y: 1.5 },
    { x: 144.4, y: 1.55 },
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): the current, the stones, Pappa at the bridge, the
 * beaver's lodge, the owl over the lake, Moälven, and the car to Billsta.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:al:billsta')) return ['alvenBillsta', 'alvenFamily', 'house'];
  if (has('beat:al:last')) return ['alvenLost', 'alvenFamily', 'water'];
  if (has('al:owl')) return at < OWL.to.x ? ['alvenFly', 'alvenOwl', 'sparkle'] : ['alvenMoalven', 'alvenFamily', 'water'];
  if (has('al:owl-ready')) return ['alvenBoard', 'alvenOwl', 'sparkle'];
  if (at >= SLOPE_END - 1) return ['alvenLake', 'alvenOwl', 'water'];
  if (has('al:lift')) return at < LIFT.to.x - 0.2 ? ['alvenLifted', 'alvenPappa', 'heart', 'pappa'] : ['alvenLodge', 'alvenFamily'];
  if (has('al:scarf')) return ['alvenScarf', 'alvenPappa', 'heart', 'pappa'];
  if (at >= BREDBYN.from + 3) return ['alvenPappa', 'alvenPappa', 'water', 'pappa'];
  if (at >= BANK.from + 2) return ['alvenStones', 'alvenFamily', 'water'];
  if (has('al:leaf')) return ['alvenCurrent', 'alvenFamily', 'water'];
  if (has('al:raft')) return at >= GRAVEL.from ? [has(FELL_IN) ? 'alvenLeaf' : 'alvenEddy', 'alvenFamily', 'water'] : ['alvenCurrent', 'alvenFamily', 'water'];
  if (at >= 9) return ['alvenRaft', 'alvenFamily', 'water'];
  return ['alvenOutlet', 'alvenFamily', 'water'];
};
