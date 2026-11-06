import { GRAVITY, RUN_SPEED } from '../../../sim/constants';
import type { Candy, ChapterData, Ledge, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, hopCandy, jump, round, row, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 1: Stormgården (docs/aventyr-2.md). Units: EL. The home garden at night, in the autumn
 * storm. Elof is small again, Klonk is with him, and the old trägubbe's candy trail leads out into the rain
 * after the little figure the storm blew out of the window. The places, from the left:
 *
 * 1. **The veranda:** the deck in the rain, high over the lawn as in Gården. The gutter overflows: two runs of
 *    drops, read from their shadows, with a dry place between them. Moa lights him from the window.
 * 2. **The steps down,** and **the pumpkin lantern**: warm light, and the first big candy. "Gamla trägubben
 *    lämnar godis åt oss!"
 * 3. **Stormbyarna** (the exciting sequence): the open lawn, where gusts sweep across. Upturned flowerpots are
 *    the lee; one that catches him in the open takes him back to the last pot. Klonk is blown into one.
 * 4. **Regntunnan** (the puzzle): the ditch beyond the rain barrel is too wide to jump. Up the barrel's hose,
 *    *Vrid på kranen*: the water runs into the ditch and the floating lid rises into a bridge.
 * 5. **Bertils stövelbåt:** the lawn is flooded. "Ropa på Bertil": his rubber boot carries Elof over.
 * 6. **The playhouse:** a flash shows the old trägubbe up on its roof, and it leaps away. Its front steps lead
 *    up onto the roof, where the old one's thought picture waits: a lonely figure. "Varför väntar den aldrig?"
 * 7. **The hedge:** a flash of lightning shows the little one tumbling over the hedge towards the forest.
 *
 * Over the trail lie two side ways (docs/level-design.md), each with a heart as its tell and each letting
 * out forward onto the trail:
 * - **The window sills:** four boards along the house wall over the first run of drops: the dry way.
 * - **The trampoline:** on the lawn before the playhouse. Its bounce is the only way onto the planks nailed up
 *   the playhouse's wall, and from the highest a plank over the roof has the hearts.
 *
 * What the canon asks for that the simulation does not have is simplified, never faked:
 * - The playhouse's way up for the trail is its front steps in the ground's outline, each a held jump or a
 *   pull-up, because the robot and Lugnt climb those; the planks (ledges) up its wall are the side way.
 * - There is no hidden candy yet: each needs a new kind in src/content/kinds.ts. Where one would be, on the
 *   plank over the roof, lie hearts.
 */

/** The veranda deck, as high over the lawn as Gården's. */
const DECK = 6;

/** The gutter's two runs of drops, with the dry place between them (Byn's awnings, tested at 0 knocks). */
const DRIPS = [
  { at: { x: 7, y: DECK }, every: 1.8, first: 0.2 },
  { at: { x: 9.2, y: DECK }, every: 2.2, first: 1.1 },
  { at: { x: 11.4, y: DECK }, every: 1.6, first: 0.7 },
  { at: { x: 17, y: DECK }, every: 2, first: 0.4 },
  { at: { x: 19.2, y: DECK }, every: 1.5, first: 1.2 },
  { at: { x: 21.2, y: DECK }, every: 2.4, first: 0.9 },
];

/**
 * The steps down from the deck: five of 1.2, each a soft landing, 2.4 EL deep. `x` is each one's top edge,
 * where he runs off it.
 */
const STEPS = [24, 26.4, 28.8, 31.2, 33.6].map((x, i) => ({ x, y: round(DECK - 1.2 * i) }));
/** The pumpkin lantern stands on the third step, a little behind its big candy. */
const LANTERN = { x: 30.6, y: STEPS[3]!.y, z: -0.9 };

/** The stone edging of Mamma's flower bed, on the lawn below the steps: a held jump, or a pull-up. */
const BED = { from: 37, to: 39, y: 0.8 };

/** The open lawn and its upturned flowerpots, as far apart as Berget's boulders: the same beat of the dash. */
const POTS = [44, 49.2, 54.4, 59.6, 64.8, 70];

/**
 * The rain barrel: its hose hangs down its near side, 0.25 EL in front of its wall, so that walking or jumping
 * into the wall takes hold of it (Myren's braid). Its top is low enough that walking off its far side is a soft
 * landing, and a watering can beside it is the way back up for anyone who goes down there before the tap.
 */
const BARREL = { from: 80, to: 82.4, top: 3.4 };
const CAN = { from: BARREL.to, to: 83.6, top: 1.2 };
/** The ditch: wider than a running jump carries, and deep enough that a fall into it is the water's. */
const DITCH = { from: 85, to: 90, bottom: -3 };
/** The water's surface, a little under the lawn, in the ditch, on the flooded lawn and in the rut. */
const WATER = -0.3;

/** The flooded lawn: a pit to the simulation, with the water drawn in it, and the boot's way over it (Granskog's cap). */
const FLOOD = { from: 106, to: 126, bottom: -5 };
const BOOT = { from: { x: 104.6, y: 0 }, to: { x: 127.4, y: 0 }, rise: 0.15, time: 8, corridor: 0.3 };

/**
 * The playhouse: four front steps of 0.9, each 1.4 deep (a held jump, or a pull-up on Lugnt), up to its eaves,
 * and its roof rising to the ridge and falling to the far eaves. The far side is a drop he lands softly from.
 */
const PLAYHOUSE = { from: 138, step: 1.4, rise: 0.9, eaves: 3.6, ridge: { x: 145.6, y: 4.6 }, to: 149 };
const FRONT = [0, 1, 2, 3].map((i) => ({ x: round(PLAYHOUSE.from + i * PLAYHOUSE.step), y: round((i + 1) * PLAYHOUSE.rise) }));
const EAVES = FRONT[3]!.x;
/** The roof's height at x, from eaves to ridge to eaves. */
const roof = (x: number) => {
  const { ridge, eaves, to } = PLAYHOUSE;
  return x <= ridge.x ? eaves + ((ridge.y - eaves) * (x - EAVES)) / (ridge.x - EAVES) : ridge.y - ((ridge.y - eaves) * (x - ridge.x)) / (to - ridge.x);
};

/** The wheel rut's puddle: a hop as wide as Byn's drain bars, with water in it. */
const RUT = { from: 160, to: 161.4, bottom: -4.5 };
/** The birch root, a low rise over the lawn (Gården's). */
const ROOT = { from: 166, top: 169, end: 172, to: 175, y: 1.4 };
/** The low clipped hedge at the garden's end: a pull-up onto it, and the way to the forest. */
const HEDGE = { from: 184.6, y: 1.2 };

/**
 * The window sills, over the first run of drops: a dry way, up from the deck and down again in the dry place.
 * Each is a held jump over the last or level with it, and the two over the drops stand higher than a drop can
 * knock him (1.5 over the deck).
 */
const SILLS: Ledge[] = [
  { x: 5.2, y: 6.9, width: 1.6, look: 'plank' },
  { x: 7.4, y: 7.7, width: 2, look: 'plank' },
  { x: 10.4, y: 7.7, width: 2.4, look: 'plank' },
  { x: 12.8, y: 7, width: 1.6, look: 'plank' },
];

/**
 * The trampoline, on the lawn before the playhouse, where nothing on the trail makes him jump: its bounce
 * is higher than any jump, and the only way onto the first plank up the playhouse's wall.
 */
const TRAMPOLINE = { x: 134, y: 0.5, lift: 3.4 };
/**
 * The great leaves of the sunflowers by the playhouse. Each is a held jump over the last and out of reach from the
 * steps and the roof below it, and the last lies at the roof's edge, higher than a jump from its eaves, with the hearts.
 */
const PLANKS: Ledge[] = [
  { x: 136.2, y: 3.3, width: 2.4, look: 'leaf' },
  { x: 138.4, y: 4.2, width: 1.4, look: 'leaf' },
  { x: 140.6, y: 5.1, width: 1.4, look: 'leaf' },
  { x: 142, y: 5.9, width: 2.4, look: 'leaf' },
];
const LOOKOUT = PLANKS[3]!;

/** A heart over a ledge, where he takes it standing there. */
const over = (ledge: Ledge, lift = 0.55): Candy => ({ x: ledge.x, y: round(ledge.y + lift) });
/** A candy where a running Elof's middle is, `dx` past an edge `top` high that he runs off. */
const offEdge = (edge: number, top: number, dx: number): Candy => ({ x: round(edge + dx, 1), y: round(top + 0.5 - (GRAVITY / 2) * (dx / RUN_SPEED) ** 2) });

/** A pit in the ground's outline: down from the lawn, across the bottom, and up again. */
const pit = (from: number, to: number, bottom: number, top = 0): Vec[] => [{ x: from, y: top }, { x: from, y: bottom }, { x: to, y: bottom }, { x: to, y: top }];

export const stormgard: ChapterData = {
  id: 'stormgard',
  // The ditch and the flood lie open across the lawn, with no bank before them.
  river: true,
  place: 'garden',
  // The house's red wall behind the veranda, with two windows: in one, Moa and her lamp.
  house: { from: -40, to: 26, windows: [4, 16] },
  storm: { shelters: 'pots',
    // The bouncer on the lawn is the garden's trampoline, not a cranberry.
    bouncers: 'trampoline',
    rain: 0.7,
    lightning: 10,
    flybys: [
      // A flash: the old trägubbe on the playhouse roof leaps away towards the hedge.
      { on: 'beat:sg:playhouse', from: { x: PLAYHOUSE.ridge.x, y: PLAYHOUSE.ridge.y + 0.6 }, to: { x: 172, y: 8 }, seconds: 2.5, who: 'tragubbe' },
      // And at the hedge: the little one, tumbling over it towards the forest.
      { on: 'beat:sg:flash', from: { x: 176, y: 5 }, to: { x: 200, y: 10 }, seconds: 2.5, who: 'lillgubbe' },
    ],
    // The playhouse the trail climbs, its green walls just behind the roof he walks on; birches by the hedge.
    buildings: [
      { kind: 'birch', x: 160, z: -16, height: 60 },
      { kind: 'birch', x: 184, z: -22, height: 72 },
      { kind: 'birch', x: 58, z: -26, height: 66 },
    ],
    glows: [
      // Mamma's candles in the house's windows, which src/render/dressing/built.ts draws 15 EL over the deck.
      { at: { x: 4, y: DECK + 15 }, z: -20.6, size: 3 },
      { at: { x: 16, y: DECK + 15 }, z: -20.6, size: 3 },
      // The pumpkin lantern on the steps.
      { at: { x: LANTERN.x, y: LANTERN.y + 0.5 }, z: LANTERN.z, size: 1.2 },
    ],
    // Moa's lamp from the window, on him as he goes down off the deck ("Jag lyser för dig från fönstret!").
    beams: [{ at: { x: 16, y: DECK + 14.6 }, z: -20.2, within: [-3, 34] }],
  },
  coda: 'bertil',
  // The barrel and the can are things on the lawn, whatever he walks on: the lawn goes on under them.
  landmarks: [
    { look: 'stairs', from: STEPS[0]!.x, to: STEPS[4]!.x, base: 0 },
    { look: 'edging', from: BED.from, to: BED.to, base: 0 },
    { look: 'barrel', from: BARREL.from, to: BARREL.to, base: 0 },
    { look: 'can', from: CAN.from, to: CAN.to, base: 0 },
    { look: 'playhouse', from: PLAYHOUSE.from, to: PLAYHOUSE.to, base: 0 },
  ],
  surfaces: [
    { from: -19, to: STEPS[0]!.x, kind: 'wood' },
    { from: BED.from, to: BED.to, kind: 'stone' },
    { from: BARREL.from, to: BARREL.to, kind: 'wood' },
    // Zinc, pale grey (not 'iron': that is a street drain's grate, and the picture would dig a well round it).
    { from: CAN.from, to: CAN.to, kind: 'paving' },
    { from: PLAYHOUSE.from, to: PLAYHOUSE.to, kind: 'wood' },
    { from: HEDGE.from, to: 196, kind: 'hedge' },
  ],
  decor: [
    // Who else is out in it: a hedgehog in the lee of a pot, and a snail going up his blocks.
    { look: 'kit', word: 'igelkott', at: { x: 51.4, y: 0 }, z: -2.3, turn: -0.7 },
    { look: 'kit', word: 'snigel', at: { x: 141.6, y: 2.7 }, z: 0.9, turn: 0.4, scale: 0.8 },
    // The pumpkin lantern, a little behind the step's big candy.
    { look: 'pumpkin', at: { x: LANTERN.x, y: LANTERN.y }, z: LANTERN.z },
    // The old trägubbe, seen ahead on the playhouse roof until the flash that shows it leaping away.
    { look: 'tragubbe', at: PLAYHOUSE.ridge, until: 'beat:sg:playhouse', z: -0.4 },
  ],
  spawn: { x: 1, y: DECK + 0.01 },
  // Where and when, as the chapter opens (../kit.ts).
  scenes: [timeCard('stormgard', 1)],
  goalX: 189,
  ground: [
    { x: -3, y: 16 },
    { x: -3, y: DECK },
    // 1. the veranda deck
    { x: STEPS[0]!.x, y: DECK },
    // 2. the steps down
    ...STEPS.flatMap((s, i) => [{ x: s.x, y: round(s.y - 1.2) }, ...(i < STEPS.length - 1 ? [{ x: STEPS[i + 1]!.x, y: round(s.y - 1.2) }] : [])]),
    // the flower bed's stone edging
    { x: BED.from, y: 0 },
    { x: BED.from, y: BED.y },
    { x: BED.to, y: BED.y },
    { x: BED.to, y: 0 },
    // 3. the open lawn: level and unbroken from the first pot to the last
    // 4. the rain barrel, the watering can beside it, and the ditch
    { x: BARREL.from, y: 0 },
    { x: BARREL.from, y: BARREL.top },
    { x: BARREL.to, y: BARREL.top },
    { x: CAN.from, y: CAN.top },
    { x: CAN.to, y: CAN.top },
    { x: CAN.to, y: 0 },
    ...pit(DITCH.from, DITCH.to, DITCH.bottom),
    // a molehill
    { x: 96, y: 0 },
    { x: 97.5, y: 0.9 },
    { x: 99, y: 0 },
    // 5. the flooded lawn
    ...pit(FLOOD.from, FLOOD.to, FLOOD.bottom),
    // 6. the playhouse: its front steps, its roof, and the drop off its far eaves
    { x: PLAYHOUSE.from, y: 0 },
    ...FRONT.flatMap((s) => [{ x: s.x, y: s.y }, { x: round(s.x + PLAYHOUSE.step), y: s.y }]).slice(0, -1),
    { x: PLAYHOUSE.ridge.x, y: PLAYHOUSE.ridge.y },
    { x: PLAYHOUSE.to, y: PLAYHOUSE.eaves },
    { x: PLAYHOUSE.to, y: 0 },
    // the wheel rut's puddle
    ...pit(RUT.from, RUT.to, RUT.bottom),
    // the birch root
    { x: ROOT.from, y: 0 },
    { x: ROOT.top, y: ROOT.y },
    { x: ROOT.end, y: ROOT.y },
    { x: ROOT.to, y: 0 },
    // 7. the hedge
    { x: HEDGE.from, y: 0 },
    { x: HEDGE.from, y: HEDGE.y },
    { x: 196, y: HEDGE.y },
    { x: 196, y: 14 },
  ],
  water: [
    { from: DITCH.from, to: DITCH.to, y: WATER },
    { from: FLOOD.from, to: FLOOD.to, y: WATER },
    { from: RUT.from, to: RUT.to, y: WATER },
  ],
  checkpoints: [
    // the pumpkin lantern's: the first big candy the old trägubbe has left
    { x: 29.8, y: LANTERN.y },
    { x: 42.4, y: 0 },
    { x: 72.4, y: 0 },
    { x: 92.4, y: 0 },
    { x: 129.6, y: 0 },
    { x: 152.6, y: 0 },
    { x: 170, y: ROOT.y },
    { x: 181, y: 0 },
  ],
  drips: DRIPS,
  gusts: [{ from: POTS[0]!, to: POTS[POTS.length - 1]!, y: 0, every: 4, length: 1.4, first: 0.5, shelters: POTS }],
  climbs: [
    // The rain barrel's hose, up its near side to the tap on top.
    { x: BARREL.from - 0.25, bottom: 0, top: BARREL.top, exit: 1, look: 'hose' },
  ],
  spots: [
    // Regntunnan: the tap on the barrel's top. Its water fills the ditch, and the lid floats up.
    { id: 'sg:tap', look: 'tap', at: { x: 81.2, y: BARREL.top }, verb: 'turn', word: 'sgTurnTap' },
    // The boot boat (Granskog's cap): calling prepares it, and Elof chooses when to step in.
    { id: 'sg:bertil', look: 'sign', at: BOOT.from, verb: 'call', word: 'callBertil' },
    { id: 'sg:boot', at: BOOT.from, verb: 'take', word: 'sgBoardBoot', needs: 'sg:boot-ready', ride: 'boot' },
    // On the playhouse ridge, where the old one stood: touching it shows its thought.
    { id: 'sg:thought', at: PLAYHOUSE.ridge, verb: 'take', touch: true },
    // On the plank over the roof, at the end of the trampoline's way: the whole garden in view.
    { id: 'sg:lookout', at: { x: LOOKOUT.x, y: LOOKOUT.y }, verb: 'take', touch: true, extra: true },
  ],
  thoughtClues: [{ at: { x: PLAYHOUSE.ridge.x, y: PLAYHOUSE.ridge.y + 0.7 }, picture: 'lonely-figure', after: 'sg:thought' }],
  movers: [
    // The barrel's lid in the ditch: the tap's water lifts it, by itself, to lie level with the lawn. It is a
    // little longer than the ditch is wide, like Myren's pine, so both its ends rest on the banks.
    // Its last stop puts its top (0.35 over its bottom) at the lawn's height.
    { id: 'lid', look: 'lid', width: 5.6, height: 0.35, verb: 'pull', on: 'sg:tap', stops: [{ x: (DITCH.from + DITCH.to) / 2, y: DITCH.bottom }, { x: (DITCH.from + DITCH.to) / 2, y: -0.35 }] },
  ],
  rides: [{ id: 'boot', look: 'boot', ...BOOT }],
  later: [{ flag: 'sg:boot-ready', after: 'sg:bertil', until: 'sg:boot', within: [99, 108], seconds: 1.2, hold: true }],
  ledges: [...SILLS, ...PLANKS],
  bouncers: [TRAMPOLINE],
  // Lätta hopp: every edge the trail jumps from, and the way back up the watering can.
  jumps: [
    jump({ x: BED.from - 0.2, y: 0 }, { x: BED.from + 0.7, y: BED.y }),
    jump({ x: CAN.to - 0.95, y: CAN.top }, { x: BARREL.to - 0.6, y: BARREL.top }),
    ...FRONT.map((s, i) => jump({ x: round(s.x - 0.2), y: i === 0 ? 0 : FRONT[i - 1]!.y }, { x: round(s.x + 0.9), y: i === 3 ? round(roof(s.x + 0.9)) : s.y })),
    jump({ x: RUT.from - 0.2, y: 0 }, { x: RUT.to + 0.9, y: 0 }),
    jump({ x: HEDGE.from - 0.2, y: 0 }, { x: HEDGE.from + 0.7, y: HEDGE.y }),
  ],
  // Klonk, ahead of him all the way. In the gusts it is blown into a flowerpot, behind the path.
  ghost: [
    { at: { x: 6.4, y: DECK } },
    { at: { x: 14.4, y: DECK } },
    { at: { x: 22.6, y: DECK } },
    // down the steps, and on the flower bed's edging
    { at: { x: 27.6, y: STEPS[2]!.y } },
    { at: { x: 32.4, y: STEPS[4]!.y } },
    { at: { x: 38, y: BED.y } },
    // from pot to pot, and into one
    { at: { x: 46.6, y: 0 } },
    { at: { x: POTS[2]!, y: 0.9 }, z: -1.3 },
    { at: { x: 62.2, y: 0 } },
    { at: { x: 68, y: 0 } },
    { at: { x: 74.6, y: 0 } },
    // on the barrel's top, beside the tap: the way is up there
    { at: { x: 81.8, y: BARREL.top } },
    // over the ditch, where Elof can't follow until the lid is up
    { at: { x: 91.4, y: 0 } },
    { at: { x: 99.8, y: 0 } },
    { at: { x: 103.2, y: 0 } },
    // across the flooded lawn, waiting on the far shore
    { at: { x: 130.6, y: 0 } },
    { at: { x: 136.6, y: 0 } },
    { at: { x: 143.6, y: round(roof(143.6), 4) } },
    { at: { x: 148.2, y: round(roof(148.2), 4) } },
    { at: { x: 155.4, y: 0 } },
    { at: { x: 163.6, y: 0 } },
    { at: { x: 171.4, y: ROOT.y } },
    { at: { x: 178.6, y: 0 } },
    { at: { x: 183, y: 0 } },
    { at: { x: 192, y: HEDGE.y } },
  ],
  beats: [
    // 1. the veranda
    { id: 'sg:moa', at: 1.4, who: 'moa', line: 'sgMoaLight' },
    { id: 'sg:gutter', at: 5.2, who: 'elof', line: 'sgGutter' },
    // 2. the pumpkin lantern
    { id: 'sg:pumpkin', at: 29.2, who: 'elof', line: 'sgPumpkin', read: true },
    { id: 'sg:pumpkin-klonk', at: 30.8, who: 'spoket', line: 'sgKlonk' },
    // 3. Stormbyarna: Klonk lands in a flowerpot
    { id: 'sg:gusts', at: 40.8, who: 'elof', line: 'sgPots' },
    { id: 'sg:pot-klonk', at: 45.2, who: 'spoket', line: 'sgKlonk' },
    { id: 'sg:pot', at: 46.2, who: 'elof', line: 'sgFlowerpot' },
    // 4. Regntunnan: Klonk on the barrel shows the way up
    { id: 'sg:ditch', at: 77, who: 'elof', line: 'sgDitch' },
    { id: 'sg:barrel', at: 78.4, who: 'spoket', line: 'sgKlonkKlonk' },
    { id: 'sg:lid', on: 'placed:lid', who: 'elof', line: 'sgLid' },
    // 5. Bertil and his boot
    { id: 'sg:bertil-here', at: 101.8, until: 'sg:bertil', who: 'bertil', line: 'sgBertilHere', read: true },
    { id: 'sg:boot-ready', on: 'sg:boot-ready', until: 'sg:boot', within: [99, 108], who: 'bertil', line: 'sgBertilBoot', read: true },
    { id: 'sg:heja', at: 116, who: 'bertil', line: 'sgBertilHeja' },
    { id: 'sg:thanks', at: 128.4, who: 'elof', line: 'sgThanks' },
    // 6. the playhouse: the old one seen, and its thought
    { id: 'sg:playhouse', at: 131.6, who: 'elof', line: 'sgPlayhouse' },
    { id: 'sg:lonely', on: 'sg:thought', who: 'elof', line: 'sgLonely', read: true },
    { id: 'sg:why', at: 147.6, needs: 'sg:thought', who: 'elof', line: 'sgWhy', read: true },
    { id: 'sg:lookout', on: 'sg:lookout', who: 'elof', line: 'sgLookout' },
    // 7. the hedge
    { id: 'sg:flash', at: 177, who: 'elof', line: 'sgFlash', read: true },
    { id: 'sg:forest', at: 180.2, who: 'elof', line: 'sgForest' },
    { id: 'sg:end-klonk', at: 182.4, who: 'spoket', line: 'sgKlonkKlonk' },
  ],
  cameras: [
    // Up on the sills: wider, looking down at the deck and its drops.
    { from: 4, to: 14, above: DECK + 0.8, zoom: 1.3, lift: -1 },
    // Up the trampoline's planks: the next plank, and the steps and roof below.
    { from: 134.8, to: 145, above: 3.1, zoom: 1.45, lift: -0.6 },
    // Up the hose and on the barrel: the ditch and where the lid will float.
    { from: 78, to: 92, zoom: 1.5, lift: 0.8, lead: 3.2 },
    { from: -3, to: 24, zoom: 1.4, lift: 0.35 },
    { from: 24, to: 36, zoom: 1.4, lift: 0.4 },
    { from: 42, to: 72, zoom: 1.35 },
    { from: 100, to: 130, zoom: 1.3, lift: 2 },
    { from: 130, to: 152, zoom: 1.35, lift: 0.8 },
    // The hedge: the sky over it, where the little one flies.
    { from: 174, to: 196, zoom: 1.5, lift: 1.4 },
  ],
  candy: [
    // 1. the veranda, between the gutter's drops
    { x: 2.6, y: 6.45 },
    { x: 4.2, y: 6.45 },
    { x: 5.6, y: 6.45 },
    { x: 8.1, y: 6.45 },
    { x: 10.3, y: 6.45 },
    { x: 12.5, y: 6.45 },
    { x: 14, y: 6.45 },
    { x: 15.6, y: 6.45 },
    { x: 18.1, y: 6.45 },
    { x: 20.2, y: 6.45 },
    { x: 22.4, y: 6.45 },
    // 2. down the steps: where a runner's middle is off each edge, and on each step
    ...STEPS.flatMap((s) => [offEdge(s.x, s.y, 0.5), { x: round(s.x + 1.6, 1), y: round(s.y - 1.2 + 0.45) }]),
    // over the flower bed's edging
    { x: 36.8, y: 1.4 },
    { x: 38, y: 1.25 },
    { x: 39.5, y: 1.1 },
    { x: 40.6, y: 0.45 },
    { x: 42.6, y: 0.45 },
    // 3. across the open lawn
    ...row(45.5, 69.5, 0),
    ...row(71.5, 77.5, 0),
    // 4. up the barrel's hose, over its top, down past the can, and over the lid
    { x: BARREL.from - 0.25, y: 1.5 },
    { x: BARREL.from - 0.25, y: 2.8 },
    { x: 80.8, y: 3.85 },
    { x: 81.9, y: 3.85 },
    offEdge(BARREL.to, BARREL.top, 0.5),
    offEdge(BARREL.to, BARREL.top, 1.1),
    { x: 84.5, y: 0.5 },
    ...row(85.6, 89.4, 0, 1.9),
    ...row(91.4, 95.4, 0),
    { x: 97.5, y: 1.4 },
    ...row(99.6, 103.6, 0),
    // 5. over the flooded lawn in Bertil's boot
    ...alongAll(BOOT, [0.15, 0.25, 0.33, 0.4, 0.47, 0.53, 0.6, 0.67, 0.75, 0.85]),
    ...row(128.2, 136.2, 0),
    // 6. up the playhouse's steps, over its roof, and off its far eaves
    ...FRONT.slice(0, 3).map((s) => ({ x: round(s.x + 0.7, 1), y: round(s.y + 0.45) })),
    ...[143, 144.3, 145.6, 146.8, 148].map((x) => ({ x, y: round(roof(x) + 0.45) })),
    offEdge(PLAYHOUSE.to, PLAYHOUSE.eaves, 0.5),
    offEdge(PLAYHOUSE.to, PLAYHOUSE.eaves, 1),
    { x: 151, y: 0.5 },
    ...row(153, 159, 0),
    // the rut's puddle, and the birch root
    hopCandy({ x: RUT.from, y: 0 }, { x: RUT.to, y: 0 }),
    ...row(162.4, 164.4, 0),
    ...slopeRow(167, 167, ROOT.from, 0, ROOT.top, ROOT.y),
    ...row(169, 171, ROOT.y),
    ...slopeRow(173, 173, ROOT.end, ROOT.y, ROOT.to, 0),
    ...row(175, 183, 0),
    // 7. onto the hedge
    { x: 184.2, y: 1.6 },
    ...row(185.4, 187.4, HEDGE.y),
  ],
  // Side candy, off the trail: hearts and lollipops by turns, the first of each way a heart (its tell).
  side: [
    // The window sills: one over the first and the last, two over each long one between. Six, so that the
    // trampoline's way begins with a heart too.
    over(SILLS[0]!),
    { x: 7, y: 8.25 },
    { x: 7.8, y: 8.25 },
    { x: 9.9, y: 8.25 },
    { x: 10.9, y: 8.25 },
    over(SILLS[3]!),
    // The trampoline: the heart its bounce carries him through, higher than any jump from the lawn...
    { x: 134.4, y: 3.7 },
    // ...one over each plank up the playhouse's wall...
    over(PLANKS[0]!),
    over(PLANKS[1]!),
    over(PLANKS[2]!),
    // ...and the prize, five over the plank above the roof: out of reach of a jump from the roof below.
    ...[-0.8, -0.4, 0, 0.4, 0.8].map((dx) => ({ x: round(LOOKOUT.x + dx), y: round(LOOKOUT.y + 0.75) })),
  ],
};

/** What "Just nu" says here: the purpose by how far he has come, and who in the family helps. */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:sg:flash')) return ['sgHedge', 'sgFamily'];
  if (has('sg:thought')) return ['sgLonely', 'sgFamily', 'heart'];
  if (at >= 128) return has('beat:sg:playhouse') ? ['sgPlayhouse', 'sgFamily', 'house'] : ['sgTrail', 'sgFamily'];
  if (has('sg:boot')) return ['sgBoot', 'sgBertil', 'water', 'bertil'];
  if (has('sg:bertil')) return ['sgBoard', 'sgBertil', 'water', 'bertil'];
  if (at >= 99) return ['sgBertilCall', 'sgBertil', 'water', 'bertil'];
  if (has('sg:tap')) return at < DITCH.to + 1 ? ['sgLid', 'sgFamily', 'water'] : ['sgTrail', 'sgFamily'];
  if (at >= 76) return ['sgTap', 'sgFamily', 'water'];
  if (at >= 40 && at < 72) return ['sgWind', 'sgFamily'];
  if (at < STEPS[0]!.x) return ['sgVeranda', 'sgMoa', 'house'];
  return ['sgTrail', 'sgFamily'];
};
