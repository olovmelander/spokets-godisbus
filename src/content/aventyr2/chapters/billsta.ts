import { GRAVITY, RUN_SPEED } from '../../../sim/constants';
import type { Candy, ChapterData, Ledge, Mover, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, hopCandy, jump, round, row, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 7: Billsta (docs/aventyr-2.md), nearly midnight. Units: EL. The river has carried Elof to
 * Billstasundet, the narrow where Moälven leaves Happstafjärden for Själevadsfjärden (docs/aventyr-2-reference-
 * study.md §1). Mormor and morfar live here, and their lit window is the warm goal of the whole night. The places,
 * from the left:
 *
 * 1. **Sundet:** he stands on a stone in the current. A birch leaf lies at its edge: "Kliv på", and the current
 *    carries him through the narrow to an old jetty in the reeds. The bank at its end is too high to jump: he
 *    climbs a reed like a stem.
 * 2. **Billaberget's boulders:** big stones below the hill's cliff, a crack between two of them, and hazel among
 *    them. Three shelves of rock up the cliff are a second way, with October's hazelnuts on them (side candy). Then
 *    the open slope, where the storm's gusts sweep across: the boulders are the lee.
 * 3. **Mormor and morfar's place,** from the hill: the white house with its two gables and a lit window, the red
 *    barn beside it, birches, the woodshed and its stack of firewood, a rowing boat turned over on trestles, and a
 *    plain mailbox by the road (no name, no number). Interpreted in plain shapes, never an address.
 * 4. **Morfar** stands at the road's ditch, full of rushing rain. "Ropa på morfar": he lays his long ladder across
 *    it while Elof watches, and Elof walks over. **Mormor** waits by the woodshed. "Ropa på mormor": she lights her
 *    lantern and opens the barn for him. Both are glad, warm and a little amazed at how small he is.
 * 5. **The red barn:** up the woodshed's stack of firewood, step by step, and down; up the planks to the barn's
 *    door, through the dark hay loft by mormor's lantern, over the hatch in its floor, and out onto the long rusty
 *    roof against the barn, where the gusts blow. Two beams over the loft are a second way.
 * 6. **The roof's end** slopes down to its low eaves by the shore. A flash, and far out on a stone in the narrow
 *    the old trägubbe holds the little one: "Där! På stenen ute i sundet!" The owl hoots far off, and mormor will
 *    take him down to the jetty.
 *
 * To the simulation the narrow, the crack, the ditch and the loft's hatch are pits; what fills them is drawn only.
 * Nothing here is a real house, no house has a number, and the mailbox has no name (plan §0, §2.6).
 */

/** Open water and the crack are pits this deep; the narrow's surface is where the glitter bubble catches him. */
const DEEP = -6;
const WATER = -0.6;

/** The stone in the current where he stands, and the birch leaf's way through the narrow to the jetty. */
const STONE = { from: -3, to: 4.2 };
const JETTY = { from: 22, to: 33, y: 0.6 };
const LEAF = { from: { x: 3.2, y: 0 }, to: { x: 23.6, y: JETTY.y }, rise: 0.3, time: 6.5, corridor: 0.4 };

/** The reed bank at the jetty's end: more than two jumps high. A reed stands at its foot, and he climbs it. */
const BANK = { from: 33, to: 40.5, y: 3.2 };
const REED = { x: BANK.from - 0.3, bottom: JETTY.y, top: BANK.y, exit: 1 as const, look: 'root' as const };

/**
 * Billaberget's boulders (verified: a boulder field below its cliff, with hazel): one a held jump up, a crack
 * between it and the next, a step down, and a big one in two steps, with a soft drop off its far side.
 */
const B1 = { from: BANK.to, to: 44, y: 4.4 };
const CRACK = { from: B1.to, to: 45.4, bottom: -3 };
const B2 = { from: CRACK.to, to: 49.6, y: 4.4 };
const B3 = { from: 52, mid: 54, to: 56.8, low: 4.4, high: 5.6 };

/** The open slope below the cliff, level and whole from the first boulder of its lee to the last. */
const SLOPE = BANK.y;
const LEE = [60, 65.2, 70.4, 75.6, 80.8, 86];

/** Down the hill to the road: from the slope's end to the road's level. */
const HILL = { from: 89, to: 94 };
const hill = (x: number) => round(SLOPE - (SLOPE * (x - HILL.from)) / (HILL.to - HILL.from), 4);

/** The road's ditch, full of rushing rain: twice a running jump. Morfar's ladder lies over it, rim to rim. */
const DITCH = { from: 98.6, to: 103.2, bottom: -5 };
const DITCH_WATER = -0.3;
const LADDER: Ledge = { x: (DITCH.from + DITCH.to) / 2, y: 0, width: DITCH.to - DITCH.from + 0.4, look: 'plank', needs: 'bi:ladder' };

/** The woodshed's stack of firewood, three rows of logs high: up it a row at a time, and a soft drop off its end. */
const STACK = [122, 123.6, 125.2].map((x, i) => ({ x, y: round(1.2 * (i + 1)) }));
const STACK_TOP = { from: STACK[2]!.x, to: 128.4, y: STACK[2]!.y };

/** The planks up to the barn's door, and the hay loft's floor behind it. */
const PLANKS = { from: 132, to: 139 };
const LOFT = 4.8;
const ramp = (x: number) => round((LOFT * (x - PLANKS.from)) / (PLANKS.to - PLANKS.from), 4);

/**
 * The barn's door at the top of the planks, blown shut: as high as two of him, and nothing climbs it. Mormor
 * opens it (`on`): it slides up in its frame, over his head.
 */
const DOOR: Mover = {
  id: 'bi-door', look: 'plank', width: 0.4, height: 2.6, verb: 'pull', on: 'bi:mormor',
  stops: [{ x: 139.6, y: LOFT }, { x: 139.6, y: LOFT + 2.8 }],
};

/** In the loft: a bale of hay a jump high, the hatch in the floor to hop over, and the hay up to the roof's hatch. */
const BALE = { from: 142.6, to: 145, y: LOFT + 1 };
const HATCH = { from: 147.2, to: 148.6 };
const HAY = [151.6, 153.2].map((x, i) => ({ x, y: round(LOFT + 1.2 * (i + 1)) }));
/**
 * The long roof against the barn, level and whole from its first lee to its last, where the gusts blow. At its far
 * end it slopes down to its low eaves by the shore: from there the narrow is in sight, over the roof he stands on.
 */
const ROOF = { from: HAY[1]!.x, to: 183.6, y: HAY[1]!.y };
const ROOF_LEE = [156, 161.2, 166.4, 171.6, 176.8, 182];
const EAVES = { from: 192.4, to: 206, y: 0.6 };
const eaves = (x: number) => round(ROOF.y - ((ROOF.y - EAVES.y) * (x - ROOF.to)) / (EAVES.from - ROOF.to), 4);
/**
 * Where the two trägubbar are seen, far out on a big stone in the narrow: its top stands clear of the eaves he
 * looks over, so that both figures are in sight.
 */
const STONE_OUT = { x: 194.2, y: 1.4, z: -18 };

/**
 * Up Billaberget's cliff, a second way (docs/level-design.md): three shelves of rock where the hazel grows, each a
 * held jump over the last. He walks off the third onto the big boulder. A hop along the trail tops out under all.
 */
const SHELVES: Ledge[] = [
  { x: 47.8, y: 5.4, width: 1.6, look: 'stone' },
  { x: 50.4, y: 6.3, width: 1.6, look: 'stone' },
  { x: 53.2, y: 7, width: 1.6, look: 'stone' },
];

/**
 * Two beams over the loft, the other second way: up from the bale, a jump across to the higher one over the hatch,
 * and a soft drop off its end beyond the hatch. Each is nailed to the loft's wall.
 */
const BEAMS: Ledge[] = [
  { x: 145.8, y: 6.7, width: 1.6, look: 'plank' },
  { x: 148.4, y: 7.4, width: 1.6, look: 'plank' },
];

/** Where morfar and mormor stand, and he calls them. */
const MORFAR = { x: 97.2, y: 0 };
const MORMOR = { x: 131.4, y: 0 };

/** A heart over a ledge, where he takes it standing there. */
const over = (ledge: Ledge, dx = 0, lift = 0.55): Candy => ({ x: round(ledge.x + dx), y: round(ledge.y + lift) });
/** Candy on a jump up a step: a little before its edge, and on the step. */
const hopUp = (edge: number, high: number): Candy[] => [
  { x: round(edge - 0.2, 1), y: round(high + 0.25) },
  { x: round(edge + 1.2, 1), y: round(high + 0.45) },
];
/** A candy where a running Elof's middle is, `dx` past an edge `top` high that he runs off. */
const offEdge = (edge: number, top: number, dx: number): Candy => ({ x: round(edge + dx, 1), y: round(top + 0.5 - (GRAVITY / 2) * (dx / RUN_SPEED) ** 2) });
/** A pit in the ground's outline: down from one level, across the bottom, and up again. */
const pit = (from: number, to: number, bottom: number, top: number, again = top): Vec[] => [{ x: from, y: top }, { x: from, y: bottom }, { x: to, y: bottom }, { x: to, y: again }];
/** Steps up in the ground's outline: from `base`, each `x` an upright edge up to its own height. */
const steps = (way: { x: number; y: number }[], base: number): Vec[] => way.flatMap((s, i) => [{ x: s.x, y: i === 0 ? base : way[i - 1]!.y }, { x: s.x, y: s.y }]);

export const billsta: ChapterData = {
  id: 'billsta',
  place: 'garden',
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the chapter opens (src/content/chapters/cards.ts).
  scenes: [timeCard('billsta', 1)],
  goalX: 194.4,
  // The chapter's card waits until the flash's last word is said: the little one safe on the stone, the owl.
  goalNeeds: 'beat:bi:cheer',
  // Everyone answers in the coda: the family on the road, and mormor and morfar at the barn.
  coda: 'all',
  ground: [
    { x: -3, y: 10 },
    { x: -3, y: 0 },
    // 1. the stone in the current, the narrow, the jetty, and the reed bank
    { x: STONE.to, y: 0 },
    { x: STONE.to, y: DEEP },
    { x: JETTY.from, y: DEEP },
    { x: JETTY.from, y: JETTY.y },
    { x: JETTY.to, y: JETTY.y },
    { x: BANK.from, y: BANK.y },
    // 2. Billaberget's boulders: up the first, over the crack, down, and up the big one in two steps
    { x: B1.from, y: BANK.y },
    { x: B1.from, y: B1.y },
    ...pit(CRACK.from, CRACK.to, CRACK.bottom, B1.y, B2.y),
    { x: B2.to, y: B2.y },
    { x: B2.to, y: SLOPE },
    { x: B3.from, y: SLOPE },
    { x: B3.from, y: B3.low },
    { x: B3.mid, y: B3.low },
    { x: B3.mid, y: B3.high },
    { x: B3.to, y: B3.high },
    { x: B3.to, y: SLOPE },
    // the open slope where the gusts blow, level from the first boulder of its lee to the last, and down the hill
    { x: HILL.from, y: SLOPE },
    { x: HILL.to, y: 0 },
    // 3. the road, and its ditch
    ...pit(DITCH.from, DITCH.to, DITCH.bottom, 0),
    // 4. the drive, the lawn, and the woodshed's stack, with a soft drop off its end
    ...steps(STACK, 0),
    { x: STACK_TOP.to, y: STACK_TOP.y },
    { x: STACK_TOP.to, y: 0 },
    // 5. the planks up to the barn's door, the loft's floor, a bale, the hatch, and the hay up to the roof
    { x: PLANKS.from, y: 0 },
    { x: PLANKS.to, y: LOFT },
    { x: BALE.from, y: LOFT },
    { x: BALE.from, y: BALE.y },
    { x: BALE.to, y: BALE.y },
    { x: BALE.to, y: LOFT },
    ...pit(HATCH.from, HATCH.to, 0, LOFT),
    ...steps(HAY, LOFT),
    // 6. the roof, out to where it slopes down to its low eaves by the shore
    { x: ROOF.to, y: ROOF.y },
    { x: EAVES.from, y: EAVES.y },
    { x: EAVES.to, y: EAVES.y },
    { x: EAVES.to, y: 10 },
  ],
  water: [
    { from: STONE.to, to: JETTY.from, y: WATER },
    { from: DITCH.from, to: DITCH.to, y: DITCH_WATER },
  ],
  surfaces: [
    { from: STONE.from, to: STONE.to, kind: 'stone' },
    { from: JETTY.from, to: JETTY.to, kind: 'wood' },
    { from: BANK.from, to: B1.from, kind: 'earth' },
    { from: B1.from, to: B3.to, kind: 'stone' },
    // The village road, and the gravel drive up to the yard.
    { from: HILL.to, to: DITCH.from, kind: 'asphalt' },
    { from: DITCH.to, to: 113, kind: 'earth' },
    { from: STACK[0]!.x, to: STACK_TOP.to, kind: 'wood' },
    // The planks, the loft's floor and the roof, all boards: the ground's 'iron' is a drain's grate, not a roof.
    { from: PLANKS.from, to: EAVES.to, kind: 'wood' },
  ],
  // What the boulders are, for the picture only: stones of Billaberget's boulder field.
  landmarks: [
    { look: 'stone', from: B1.from, to: B1.to, base: BANK.y },
    { look: 'stone', from: B2.from, to: B2.to, base: SLOPE },
    { look: 'stone', from: B3.from, to: B3.to, base: SLOPE },
  ],
  checkpoints: [
    { x: 26, y: JETTY.y },
    { x: 36.6, y: BANK.y },
    { x: 58.4, y: SLOPE },
    { x: 88, y: SLOPE },
    { x: 106, y: 0 },
    { x: 119.4, y: 0 },
    { x: 141.4, y: LOFT },
    { x: 154.6, y: ROOF.y },
    { x: 183, y: ROOF.y },
  ],
  // The storm over the open slope and over the barn's roof: every four seconds a gust for a little more than one.
  // A dash from one lee to the next takes half the calm between, as on Berget.
  gusts: [
    { from: LEE[0]!, to: LEE[LEE.length - 1]!, y: SLOPE, every: 4, length: 1.4, first: 0.5, shelters: LEE },
    { from: ROOF_LEE[0]!, to: ROOF_LEE[ROOF_LEE.length - 1]!, y: ROOF.y, every: 4, length: 1.4, first: 0.5, shelters: ROOF_LEE },
  ],
  climbs: [REED],
  ledges: [...SHELVES, LADDER, ...BEAMS],
  spots: [
    // The birch leaf at the stone's edge: he steps on, and the current carries him through the narrow.
    { id: 'bi:leaf', at: LEAF.from, verb: 'take', word: 'board', ride: 'bi:leaf' },
    // Morfar at the ditch, with his long ladder.
    { id: 'bi:morfar', look: 'morfar', at: MORFAR, verb: 'call', word: 'biCallMorfar' },
    // Mormor by the woodshed, with her lantern.
    { id: 'bi:mormor', look: 'mormor', at: MORMOR, verb: 'call', word: 'biCallMormor' },
  ],
  rides: [{ id: 'bi:leaf', look: 'leaf', ...LEAF }],
  movers: [DOOR],
  // Morfar lays his ladder over the ditch: Elof stands and watches until it lies still.
  later: [
    { flag: 'bi:ladder', after: 'bi:morfar', seconds: 1.6, hold: true, within: [90, 104] },
    // The little one, tossed onto the stone by a wave, where the old one catches him.
    { flag: 'bi:landed', after: 'beat:bi:there', seconds: 1.6 },
  ],
  // Lätta hopp: every edge the trail jumps from.
  jumps: [
    jump({ x: round(B1.from - 0.2), y: BANK.y }, { x: round(B1.from + 0.7), y: B1.y }),
    jump({ x: round(CRACK.from - 0.2), y: B1.y }, { x: round(CRACK.to + 0.9), y: B2.y }),
    jump({ x: round(B3.from - 0.2), y: SLOPE }, { x: round(B3.from + 0.7), y: B3.low }),
    jump({ x: round(B3.mid - 0.2), y: B3.low }, { x: round(B3.mid + 0.7), y: B3.high }),
    // Up a stair, each landing is short of the next riser by more than a stride, so he runs on from it.
    ...STACK.map((s, i) => jump({ x: round(s.x - 0.2), y: i === 0 ? 0 : STACK[i - 1]!.y }, { x: round(s.x + 0.45), y: s.y })),
    jump({ x: round(BALE.from - 0.2), y: LOFT }, { x: round(BALE.from + 0.7), y: BALE.y }),
    jump({ x: round(HATCH.from - 0.2), y: LOFT }, { x: round(HATCH.to + 0.9), y: LOFT }),
    ...HAY.map((s, i) => jump({ x: round(s.x - 0.2), y: i === 0 ? LOFT : HAY[i - 1]!.y }, { x: round(s.x + 0.45), y: s.y })),
  ],
  storm: {
    rain: 0.85,
    lightning: 8,
    // Billaberget's lee is its boulders; on the barn's roof it is the ventilation hoods along the ridge.
    shelters: ['rocks', 'vents'],
    // The narrow past the barn's low eaves, out to the stone where the two figures are: the water is up to the eaves.
    lakes: [{ from: 186, to: 260, y: 0.66, near: -5 }],
    flybys: [
      // At the roof's end: a wave tosses the little one onto the stone out in the narrow, where the old one is.
      { on: 'beat:bi:there', from: { x: 189.4, y: 8 }, to: { x: STONE_OUT.x + 0.6, y: STONE_OUT.y }, seconds: 1.6, who: 'lillgubbe' },
    ],
    // Mormor and morfar's place, from the drive: the white house with its lit window far behind, the red barn
    // beside it, whose windows glow once mormor has taken her lantern in; the woodshed, the rowing boat on its
    // trestles, the mailbox by the road, and birches.
    buildings: [
      // Billaberget's face behind its shelves: the shelves jut out of the granite.
      { kind: 'cliff', x: 51, z: -3.2, width: 14, height: 11 },
      // The house comes into sight over the hill's brow, with the barn beside it: neither stands in the other.
      { kind: 'villa', x: 110, z: -30, width: 56, lit: '' },
      { kind: 'barn', x: 162, z: -16, lit: 'bi:mormor' },
      { kind: 'woodshed', x: 126, z: -7 },
      { kind: 'rowboat', x: 108, z: -5, width: 16 },
      { kind: 'mailbox', x: 95.6, z: -2.4 },
      { kind: 'birch', x: 76, z: -20, height: 60 },
      { kind: 'birch', x: 92, z: -10, height: 58 },
      { kind: 'birch', x: 190, z: -24, height: 64 },
    ],
    glows: [
      // Mormor's lantern, set down just inside the barn's door: it lights the dark loft.
      { at: { x: 140.8, y: LOFT + 0.6 }, z: -0.9, size: 1.3, after: 'bi:mormor' },
      { at: { x: 147, y: LOFT + 2.2 }, z: -2.4, size: 2.4, after: 'bi:mormor' },
    ],
  },
  decor: [
    // Reeds in the narrow, along the jetty, at the bank's foot (the one he climbs), and on the bank.
    ...[6.4, 10.2, 15.6, 19.8, 21.2].map((x) => ({ look: 'reed' as const, at: { x, y: WATER } })),
    ...[REED.x, 31.4].map((x) => ({ look: 'reed' as const, at: { x, y: JETTY.y } })),
    ...[34.2, 37.8].map((x) => ({ look: 'reed' as const, at: { x, y: BANK.y } })),
    // Mormor's lantern, once she has opened the barn.
    { look: 'lantern', at: { x: 140.8, y: LOFT }, z: -0.9, after: 'bi:mormor' },
    // Far out in the narrow, on a stone: the old one, and the little one once the wave has tossed him there.
    { look: 'tragubbe', at: { x: STONE_OUT.x, y: STONE_OUT.y }, z: STONE_OUT.z, after: 'beat:bi:there' },
    { look: 'lillgubbe', at: { x: STONE_OUT.x + 0.6, y: STONE_OUT.y }, z: STONE_OUT.z, after: 'bi:landed' },
  ],
  // Klonk, ahead of him all the way, on firm ground. It waits at the ditch for the ladder and at the barn's door
  // for mormor; on the roof it hops from lee to lee; at the end it thinks of the little one.
  ghost: [
    { at: { x: 3.9, y: 0 } },
    { at: { x: 25.4, y: JETTY.y } },
    { at: { x: 30.2, y: JETTY.y } },
    { at: { x: 35.8, y: BANK.y } },
    { at: { x: 42.4, y: B1.y } },
    { at: { x: 47.2, y: B2.y } },
    { at: { x: 51, y: SLOPE } },
    { at: { x: 55.8, y: B3.high } },
    { at: { x: 59, y: SLOPE } },
    ...LEE.slice(1).map((x) => ({ at: { x, y: SLOPE } })),
    { at: { x: 91, y: hill(91) } },
    { at: { x: 98.2, y: 0 }, until: 'bi:ladder' },
    { at: { x: 104.6, y: 0 } },
    { at: { x: 110, y: 0 } },
    { at: { x: 115.6, y: 0 } },
    { at: { x: 120.6, y: 0 } },
    { at: { x: 126.8, y: STACK_TOP.y } },
    { at: { x: 133.6, y: ramp(133.6) } },
    { at: { x: 137.6, y: ramp(137.6) }, until: `placed:${DOOR.id}` },
    { at: { x: 142.2, y: LOFT } },
    { at: { x: 144.2, y: BALE.y } },
    { at: { x: 146.4, y: LOFT } },
    { at: { x: 150.4, y: LOFT } },
    { at: { x: 154.8, y: ROOF.y } },
    ...ROOF_LEE.slice(1).map((x) => ({ at: { x, y: ROOF.y } })),
    { at: { x: 186.4, y: eaves(186.4) } },
    { at: { x: 193.4, y: EAVES.y }, thought: { picture: 'small-figure' as const, after: 'beat:bi:there' } },
    { at: { x: 196.4, y: EAVES.y } },
  ],
  beats: [
    // 1. the narrow
    { id: 'bi:arrive', at: 1.4, who: 'elof', line: 'biArrive' },
    { id: 'bi:klonk', at: 1.9, who: 'spoket', line: 'biKlonk' },
    { id: 'bi:current', on: 'bi:leaf', who: 'elof', line: 'biCurrent' },
    { id: 'bi:jetty', at: 24.6, who: 'elof', line: 'biJetty' },
    { id: 'bi:reeds', at: 29.4, who: 'elof', line: 'biReeds' },
    // 2. Billaberget
    { id: 'bi:hill', at: 38.4, who: 'elof', line: 'biHill' },
    { id: 'bi:hazel', at: 46.8, who: 'elof', line: 'biHazel' },
    { id: 'bi:wind', at: 58.8, who: 'elof', line: 'biWind', read: true },
    { id: 'bi:window', at: 87, who: 'elof', line: 'biWindow', read: true },
    { id: 'bi:window-klonk', on: 'beat:bi:window', who: 'spoket', line: 'biKlonkKlonk' },
    // 4. Morfar at the ditch
    { id: 'bi:ditch', at: 94.6, who: 'elof', line: 'biDitch' },
    { id: 'bi:morfar-here', at: 95.4, until: 'bi:morfar', who: 'morfar', line: 'biMorfarHere', read: true },
    { id: 'bi:ladder-lay', on: 'bi:morfar', within: [90, 104], who: 'morfar', line: 'biLadderLay', read: true },
    { id: 'bi:ladder', on: 'bi:ladder', within: [90, 104], who: 'morfar', line: 'biLadderOn' },
    { id: 'bi:thanks', at: 103.8, needs: 'bi:ladder', who: 'elof', line: 'biThanksMorfar' },
    { id: 'bi:to-mormor', at: 106.6, needs: 'bi:ladder', who: 'morfar', line: 'biToMormor' },
    // 3. the yard, and Mormor by the woodshed
    { id: 'bi:yard', at: 110.4, who: 'elof', line: 'biYard' },
    { id: 'bi:mormor-here', at: 129, until: 'bi:mormor', who: 'mormor', line: 'biMormorHere', read: true },
    { id: 'bi:lantern', on: 'bi:mormor', who: 'mormor', line: 'biLantern', read: true },
    { id: 'bi:open', on: `placed:${DOOR.id}`, who: 'elof', line: 'biOpen' },
    // 5. the hay loft, and the roof
    { id: 'bi:loft', at: 141.8, needs: `placed:${DOOR.id}`, who: 'elof', line: 'biLoft' },
    { id: 'bi:hatch', at: 145.8, who: 'elof', line: 'biHatch' },
    { id: 'bi:roof', at: 154.2, who: 'elof', line: 'biRoof' },
    { id: 'bi:roof-klonk', at: 157.4, who: 'spoket', line: 'biKlonk' },
    // 6. the flash: both trägubbar on a stone in the narrow, and the owl far off
    { id: 'bi:there', at: 193, who: 'elof', line: 'biThere', read: true },
    { id: 'bi:holds', on: 'bi:landed', who: 'elof', line: 'biHolds' },
    { id: 'bi:owl', on: 'beat:bi:holds', who: 'elof', line: 'biOwl' },
    { id: 'bi:jetty-next', on: 'beat:bi:owl', who: 'mormor', line: 'biDownToJetty' },
    { id: 'bi:cheer', on: 'beat:bi:jetty-next', who: 'spoket', line: 'biKlonkCheer' },
  ],
  cameras: [
    // On the second ways the picture is wider and lower, so the next landing and the trail under him are in it.
    // Each begins higher than a hop along the trail rises there.
    { from: 46.4, to: 54.4, above: 5.9, zoom: 1.4, lift: -0.6 },
    { from: 144.4, to: 149.8, above: 6.6, zoom: 1.4, lift: -0.6 },
    // The narrow: wide, so the jetty comes in sight as the current carries him.
    { from: -3, to: 24, zoom: 1.45, lift: 0.6, lead: 3.2 },
    { from: 24, to: 38, zoom: 1.3, lift: 0.8 },
    { from: 38, to: 58, zoom: 1.3, lift: 0.4 },
    // From lee to lee the next boulder is in the picture.
    { from: 58, to: 87, zoom: 1.35 },
    // Down the hill the picture opens out over the house and its lit window.
    { from: 87, to: 106, zoom: 1.5, lift: 1.6, lead: 3.2 },
    { from: 106, to: 130, zoom: 1.35, lift: 1 },
    // Mormor, the planks and the door at their top in one picture.
    { from: 130, to: 140, zoom: 1.45, lift: 1.4, lead: 3.4 },
    { from: 140, to: 154, zoom: 1.25 },
    { from: 154, to: 183, zoom: 1.35 },
    // Down to the eaves the picture opens out over the narrow, towards the stone, and looks down on it. It looks
    // little ahead: the end of the world is well to the right, out of the picture.
    { from: 183, to: 206, zoom: 1.6, lift: 1.4, lead: 1 },
  ],
  candy: [
    // 1. on the stone, along the leaf's way through the narrow, along the jetty, and up the reed
    { x: 2, y: 0.45 },
    ...alongAll(LEAF, [0.08, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.9]),
    ...row(24.8, 30.8, JETTY.y),
    { x: 31.6, y: round(JETTY.y + 0.45) },
    { x: REED.x, y: 1.6 },
    { x: REED.x, y: 2.6 },
    { x: 33.6, y: round(BANK.y + 0.45) },
    ...row(35, 39, BANK.y),
    // 2. up the first boulder, over the crack, along the second, down, and up the big one
    ...hopUp(B1.from, B1.y),
    { x: 42.9, y: round(B1.y + 0.45) },
    hopCandy({ x: CRACK.from, y: B1.y }, { x: CRACK.to, y: B2.y }, 1.15),
    { x: 46.6, y: round(B2.y + 0.45) },
    { x: 48.4, y: round(B2.y + 0.45) },
    offEdge(B2.to, B2.y, 0.5),
    { x: 50.8, y: round(SLOPE + 0.45) },
    ...hopUp(B3.from, B3.low),
    ...hopUp(B3.mid, B3.high),
    offEdge(B3.to, B3.high, 0.5),
    offEdge(B3.to, B3.high, 1.1),
    // across the open slope, and down the hill to the road
    ...row(58.6, 88.6, SLOPE),
    ...slopeRow(90.4, 92.4, HILL.from, SLOPE, HILL.to, 0),
    { x: 94.4, y: 0.45 },
    { x: 96.2, y: 0.45 },
    // over the ditch on morfar's ladder, once it lies there
    { x: 97.8, y: 0.45 },
    { x: 99.4, y: 0.45, after: 'bi:ladder' },
    { x: 101, y: 0.45, after: 'bi:ladder' },
    // 3. up the drive and over the lawn
    ...row(103.8, 121, 0, 1.9),
    // 5. up the woodshed's stack, along its top, and off its end; up the planks to the barn's door
    ...STACK.map((s) => ({ x: round(s.x + 0.7, 1), y: round(s.y + 0.45) })),
    { x: 127.4, y: round(STACK_TOP.y + 0.45) },
    offEdge(STACK_TOP.to, STACK_TOP.y, 0.5),
    offEdge(STACK_TOP.to, STACK_TOP.y, 1.1),
    { x: 130.4, y: 0.45 },
    ...slopeRow(132.4, 138.4, PLANKS.from, 0, PLANKS.to, LOFT),
    // through the loft: over the bale, over the hatch, and up the hay to the roof
    ...row(140.2, 142.2, LOFT),
    ...hopUp(BALE.from, BALE.y),
    { x: 145.6, y: round(LOFT + 0.45) },
    { x: 146.8, y: round(LOFT + 0.45) },
    hopCandy({ x: HATCH.from, y: LOFT }, { x: HATCH.to, y: LOFT }, 1.15),
    { x: 150, y: round(LOFT + 0.45) },
    ...hopUp(HAY[0]!.x, HAY[0]!.y),
    ...hopUp(HAY[1]!.x, HAY[1]!.y),
    // 6. along the roof, from lee to lee, and down to its eaves
    ...row(156.4, 182.4, ROOF.y),
    ...slopeRow(184.4, 192.4, ROOF.to, ROOF.y, EAVES.from, EAVES.y),
    { x: 193.8, y: round(EAVES.y + 0.45) },
  ],
  // Side candy: hearts and lollipops by turns, the first of each way a heart (its tell). None is taken by walking
  // under it, or by a hop along the trail. New ones are added at the end.
  side: [
    // Billaberget's shelves, where the hazel grows: its nuts, two on the first shelf, one in the arc of each jump
    // up, one on the second and two on the third.
    over(SHELVES[0]!, -0.4),
    over(SHELVES[0]!, 0.4),
    hopCandy({ x: 48.6, y: SHELVES[0]!.y }, { x: 49.6, y: SHELVES[1]!.y }, 0.9),
    over(SHELVES[1]!),
    hopCandy({ x: 51.2, y: SHELVES[1]!.y }, { x: 52.4, y: SHELVES[2]!.y }, 0.9),
    over(SHELVES[2]!, -0.3),
    over(SHELVES[2]!, 0.4),
    // The loft's beams: two on the first, one in the arc of the jump across, two on the second.
    over(BEAMS[0]!, -0.4),
    over(BEAMS[0]!, 0.4),
    hopCandy({ x: 146.6, y: BEAMS[0]!.y }, { x: 147.6, y: BEAMS[1]!.y }, 0.9),
    over(BEAMS[1]!, -0.4),
    over(BEAMS[1]!, 0.4),
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): through the narrow, up the reed, over Billaberget's
 * boulders and its gusts, to morfar at the ditch and mormor at the barn, through the loft, along the roof, and the
 * two found on the stone. Morfar and mormor guide where their help is the next thing to do.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:bi:there')) return ['billstaFound', 'billstaBoth', 'heart'];
  if (at >= ROOF.from - 0.2 && (player.y > LOFT + 1.6 || at > ROOF.to)) return ['billstaRoof', 'billstaMormor'];
  if (has('bi:mormor')) return at < DOOR.stops[0]!.x ? ['billstaBarn', 'billstaMormor', 'house', 'mormor'] : ['billstaLoft', 'billstaMormor', 'house'];
  if (at >= STACK[0]!.x - 1.5) return ['billstaMormor', 'billstaMormor', 'house', 'mormor'];
  if (has('bi:ladder')) return at < DITCH.to + 0.4 ? ['billstaLadder', 'billstaMorfar', 'water', 'morfar'] : ['billstaYard', 'billstaBoth', 'house'];
  if (at >= HILL.to - 0.5) return ['billstaMorfar', 'billstaMorfar', 'water', 'morfar'];
  if (at >= LEE[LEE.length - 1]!) return ['billstaWindow', 'billstaFamily', 'house'];
  if (at >= LEE[0]! - 1.5) return ['billstaWind', 'billstaFamily', 'mountain'];
  if (at >= BANK.from + 0.3 && player.y >= BANK.y - 0.3) return ['billstaBoulders', 'billstaFamily', 'mountain'];
  if (has('bi:leaf') || at >= JETTY.from) return ['billstaReeds', 'billstaFamily', 'water'];
  return ['billstaNarrow', 'billstaFamily', 'water'];
};
