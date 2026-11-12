import { GRAVITY, RUN_SPEED } from '../../../sim/constants';
import type { Candy, ChapterData, Jump, Ledge, Mover, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, elderWalk, hopCandy, jump, round, row, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 7: Billsta (docs/aventyr-2.md), nearly midnight. Units: EL. Billsta is three mil from Bredbyn,
 * and the family has driven there to mormor and morfar, whose house stands by the road near the forest. Their lit
 * window is the warm light of the whole night. The narrow (sundet) lies below Billaberget, behind the forest: it is
 * seen only from the hill's brow at the end. The places, from the left:
 *
 * 1. **Vägen:** the family's car has just stopped on the road. Spruces stand across it, and mormor and morfar's
 *    white house with its two gables and a lit window is in sight behind the yard, the red barn beside it. He stands
 *    by the car while Moa points to the window and says whose trail it is now; then she and Bertil run ahead.
 * 2. **Diket:** the ditch along the road, full of rushing rain. "Ropa på morfar": he lays his long ladder across it
 *    while Elof watches, and Elof walks over.
 * 3. **Gården:** the gravel drive, the lawn, a rowing boat turned over on trestles, birches, the woodshed and its
 *    stack of firewood, and a plain mailbox by the road (no name, no number). **Mormor** waits by the woodshed.
 *    "Ropa på mormor": she lights her lantern, walks up the planks to the barn's door and opens it for him.
 * 4. **Ladan:** up the planks to the barn's door, through the dark hay loft by mormor's lantern, over a bale and the
 *    hatch in its floor, and out onto the long roof against the barn, where the gusts blow and its row of old brick
 *    ventilation chimneys is the lee. Two beams over the loft are a second way. The roof's far end slopes down to its low eaves,
 *    and a soft drop takes him to the ground behind the house.
 * 5. **Skogen och Billaberget:** a forest brook behind the house, crossed on three stones. Further on the brook runs
 *    deep and wide below the hill's steep bank, and a dry spruce the storm has blown down lies over a stone on the
 *    near bank: a seesaw (the puzzle, and Klonk's own help). "Ropa på Klonk": Klonk jumps onto the high end, and it
 *    hardly stirs: he weighs nothing. The way is the lever: he goes round the stone and pushes it back towards his
 *    own end, so that Klonk has the long arm, and Elof is flung over the brook, up onto the bank. Then Billaberget's
 *    boulders, a crack, and rock shelves jutting from its granite face with side candy on them, hazel bushes beside
 *    them with October's nuts (`HAZEL`); and the open slope in the gusts, the boulders the lee.
 * 6. **Krönet:** up on Billaberget's brow, a flash: far below in the narrow, on a stone, the old trägubbe holds the
 *    little one. The owl hoots far off, and mormor, come up the path with her lantern, will take him down to the
 *    narrow's shore, where the final begins.
 *
 * To the simulation the ditch, the brook, the crack and the loft's hatch are pits; what fills them is drawn only.
 * Nothing here is a real house, no house has a number, and the mailbox has no name (plan §0, §2.6).
 */

// --- 1. the road, 2. the ditch, 3. the yard ----------------------------------------------------------------------

/**
 * The family's car, stopped on the road where he starts: its front, with the headlights, is to the right, beside
 * him. It stands well back from the play plane, so that its wheels, its body and its cabin are all in the picture.
 */
const CAR = { x: -8, z: -17, width: 29 };

/** The chapter's time card, which Moa and Bertil stand in by the car's front. */
const CARD = timeCard('billsta', 1);
/** Where Moa and Bertil stand by the car, and the lit window up at the house. */
const KIDS = { moa: { x: 6.4, z: -7.6 }, bertil: { x: 8.6, z: -6.4 } };
/** Mamma by the car's headlight, Pappa by its front door, a little out from its near side; what their lamps light. */
const PARENTS = { mamma: { x: 2.8, z: -10.8 }, pappa: { x: -1.6, z: -11.2 } };
const ROAD = { x: 11, y: 0.4, z: 0 };
/** Where Elof stands beside the car as the chapter opens, for them to look at and wave to. */
const BY_CAR = { x: 1, y: 0.5, z: 0 };
const UP_TO_HOUSE = { x: 16, y: 2, z: -40 };
const WINDOW = { x: 14, y: 7.5, z: -66 };
/**
 * Their run ahead of him to the house, which stands about x 2 to 34 and z -84 to -61 (`buildings`, below): to its left
 * end, and round it to the door at its back, where the house hides them from the road. In seconds, each child's run to
 * the corner and on round to the door: at about a child's sprint for their size at the fastest, so that their steps
 * hold the ground (in 6.2 and 2.6 seconds they went twice that, and their boots slid a third to a half of the way).
 * Bertil, the smaller, takes a little longer and comes round a moment after Moa.
 */
const RUN = {
  corner: { x: -0.6, y: 0, z: -62 }, door: { x: 6, y: 0, z: -89 },
  moa: { from: 1.1, corner: 11, door: 5.4 }, bertil: { from: 0.8, corner: 11.6, door: 6 },
};
/** Each child sets off round the corner a little before reaching it, so that the run goes round it rather than stopping. */
const ROUND = 0.93;
const roundAt = (who: 'moa' | 'bertil') => round(RUN[who].from + RUN[who].corner * ROUND, 1);
const inAt = (who: 'moa' | 'bertil') => round(roundAt(who) + RUN[who].door, 1);

/** The road's ditch, full of rushing rain: twice a running jump. Morfar's ladder lies over it, rim to rim. */
const DITCH = { from: 14.6, to: 19.2, bottom: -5 };
const DITCH_WATER = -0.3;
const LADDER: Ledge = { x: (DITCH.from + DITCH.to) / 2, y: 0, width: DITCH.to - DITCH.from + 0.4, look: 'ladder', needs: 'bi:ladder' };

/** The gravel drive up from the road to the yard. */
const DRIVE = { from: DITCH.to, to: 29 };
/** Where he thanks morfar, a step past the ladder's far end, and the big candy on the drive beyond, which a game is taken up at. */
const THANKS_AT = 19.8;
const DRIVE_CANDY = 22.65;

/** The woodshed's stack of firewood, three rows of logs high: up it a row at a time, and a soft drop off its end. */
const STACK = [38, 39.6, 41.2].map((x, i) => ({ x, y: round(1.2 * (i + 1)) }));
const STACK_TOP = { from: STACK[2]!.x, to: 44.4, y: STACK[2]!.y };

// --- 4. the barn ---------------------------------------------------------------------------------------------------

/** The planks up to the barn's door, and the hay loft's floor behind it. */
const PLANKS = { from: 48, to: 55 };
const LOFT = 4.8;
const ramp = (x: number) => round((LOFT * (x - PLANKS.from)) / (PLANKS.to - PLANKS.from), 4);

/**
 * The barn's door at the top of the planks, blown shut: as high as two of him, and nothing climbs it. Mormor walks up
 * and opens it (`on`): to the simulation its block slides up, over his head; in the picture it is the big sliding door
 * in the barn's front, which she pushes aside along its rail (../barn-loft.ts, 'barn-door').
 */
const DOOR: Mover = {
  id: 'bi-door', look: 'barn-door', width: 0.4, height: 2.6, verb: 'pull', on: 'bi:door',
  stops: [{ x: 55.6, y: LOFT }, { x: 55.6, y: LOFT + 2.8 }],
};

/** In the loft: a bale of hay a jump high, the hatch in the floor to hop over, and the hay up to the roof's hatch. */
const BALE = { from: 58.6, to: 61, y: LOFT + 1 };
const HATCH = { from: 63.2, to: 64.6 };
const HAY = [67.6, 69.2].map((x, i) => ({ x, y: round(LOFT + 1.2 * (i + 1)) }));
/**
 * The long roof against the barn, level and whole from its first lee to its last, where the gusts blow. At its far
 * end it slopes down to its low eaves, a soft drop over the ground behind the house.
 */
const ROOF = { from: HAY[1]!.x, to: 99.6, y: HAY[1]!.y };
/**
 * Where the hay he climbs ends, at the barn's right gable (../barn-loft.ts, `LOFT_BARN.right`), and the roof outside
 * begins. The outline has a point there, on the roof's own level, so that the picture's floor can run on under the
 * hay to the gable (`landmarks`, 'bale') while the simulation's roof is as it was.
 */
const HAY_ENDS = 70.9;
const ROOF_LEE = [72, 77.2, 82.4, 87.6, 92.8, 98];
/** The loft's ground, for its picture (../barn-loft.ts): the planks up to it, its floor, the bale, the hatch, the hay. */
export const LOFT_GROUND = { planks: PLANKS, floor: LOFT, bale: BALE, hatch: HATCH, hay: HAY, roof: { from: HAY[1]!.x, y: HAY[1]!.y } } as const;
const EAVES = { from: 105.6, to: 106.4, y: 2.4 };
const eaves = (x: number) => round(ROOF.y - ((ROOF.y - EAVES.y) * (x - ROOF.to)) / (EAVES.from - ROOF.to), 4);

/**
 * Two beams over the loft, a second way: up from the bale, a jump across to the higher one over the hatch, and a
 * soft drop off its end beyond the hatch. Each is nailed to the loft's wall.
 */
const BEAMS: Ledge[] = [
  { x: 61.8, y: 6.7, width: 1.6, look: 'plank' },
  { x: 64.4, y: 7.4, width: 1.6, look: 'plank' },
];

/** Where morfar and mormor stand, and he calls them. */
const MORFAR = { x: 13.2, y: 0 };
/**
 * He calls mormor from two and a half steps short of where she waits, as he comes down off the woodpile. Nearer, where
 * the call was offered he stood where she holds her lantern out low as she bends to him (`MORMOR_WAITS`), and it was in
 * front of him: he was hidden behind it while she spoke.
 */
const MORMOR = { x: 45.4, y: 0 };
/**
 * Mormor (Olov, 9 November 2026: "Mormor döljs av en stubbe", and "Mormor ska gå fram och öppna ladan"). She waits by the
 * foot of the planks, in front of the woodshed's chopping block, and when he has called her she walks up the planks to
 * the barn's door, puts her hand on it and opens it, and stays there with her lantern while he goes in. While she walks
 * up he stands and watches; the door opens as she pushes it (`ELDER_WALK` times both). Meanwhile the picture opens out
 * to show all of it, him at the planks' foot, her going up them and the door at their top (`MORMOR_SEEN`).
 */
const MORMOR_WAITS = { x: 47.9, y: 0, z: -0.9 };
/**
 * At the top of the planks she stands by the barn's corner, on the planks' near side: the door is in the barn's front,
 * which faces the yard (../barn-loft.ts), and she takes its handle and pushes it aside along its rail. He goes in behind
 * her.
 */
const MORMOR_AT_DOOR = { x: 54.6, y: ramp(54.6), z: 1.0 };
const MORMOR_WALK = elderWalk(MORMOR_WAITS.x, MORMOR_AT_DOOR.x, (x) => (x < PLANKS.from ? 0 : ramp(x)));
const MORMOR_SEEN = { x: 51.4, y: 5.4, height: 12.4, width: 13.6, seconds: round(MORMOR_WALK + 2.2, 1) };

// --- 5. the forest behind the house, and Billaberget ---------------------------------------------------------------

/**
 * The brook's bed is a pit this deep, deeper than a fall he lands, so that over it the camera stays at the height he
 * stands on (src/sim/camera-intent.ts); its surface is where the bubble catches him.
 */
const BED = -5;
const BROOK_WATER = -0.5;

/** The forest's edge behind the house, where he lands off the eaves. */
const EDGE = { from: EAVES.to, to: 109.4 };
/** A place to stand: a stone in the brook, or a stretch of its bank. */
interface Stone { from: number; to: number; y: number }
/** Three stones in the brook, each a hop of water from the next, and the far bank beyond them. */
const STONES: Stone[] = [
  { from: 110.8, to: 113.2, y: 0.4 },
  { from: 114.6, to: 117, y: 0.7 },
  { from: 118.4, to: 120.8, y: 0.4 },
];
const BANK = { from: 122.2, to: 133.6 };
const BROOK_WAY: Stone[] = [{ from: EDGE.from, to: EDGE.to, y: 0 }, ...STONES, { from: BANK.from, to: BANK.to, y: 0 }];

/**
 * Further on, the brook runs deep and wide, twice a running jump, and on its far side the hill's steep bank rises
 * straight out of it, out of every jump's reach: walking back off the bank ends in the glitter bubble, back on it.
 */
const POOL = { from: BANK.to, to: 138.2, bottom: BED };
const POOL_WATER = -0.6;
const TOP = { from: POOL.to, to: 144.4, y: 3.2 };

/**
 * Klonk's seesaw (the puzzle): a dry spruce the storm has blown down, lying over a stone on the near bank, the stone
 * under its middle. Klonk waits by the high end and jumps on when called (a short held beat), and nothing comes of it:
 * with the arms even he is far too light. What moves it is the lever, as when a grown-up sits near the middle: Elof goes
 * round the stone and pushes it back towards his own end. Now Klonk has the long arm, high in the air, and when
 * Elof steps on the short one it falls and flings him over the brook, up onto the bank.
 */
const SEESAW = { low: 127.9, middle: 130.4, short: 129.1 };
/** Where its fling is touched: a little before the low end, so that the stone's top beside it is out of reach. */
const TOUCHED = 127.5;
const CALL_AT = round(SEESAW.low + 0.95);
const KLONK_WAITS = { x: 132.2, y: 0 };
/** Where the high end stands, with Klonk on it: first with the arms even, then on the long arm. */
const HIGH_END = { x: 132.7, y: 1.1 };
const HIGH_ARM = { x: 132.5, y: 1.55 };
/** The stone under the spruce: a low boulder he jumps over, and pushes only from the far side. */
const PIVOT: Mover = {
  id: 'bi-pivot', look: 'boulder', width: 1.2, height: 0.6, verb: 'push', needs: 'bi:klonk-on',
  stops: [{ x: SEESAW.middle, y: 0 }, { x: SEESAW.short, y: 0 }],
};
const PIVOT_PLACED = `placed:${PIVOT.id}`;
const FLING = { from: { x: SEESAW.low, y: 0 }, to: { x: 140.4, y: TOP.y }, rise: 4, time: 1.8, corridor: 0.4 };

/**
 * Billaberget's boulders (verified: a boulder field below its cliff, with hazel): one a held jump up, a crack
 * between it and the next, a step down, and a big one in two steps, with a soft drop off its far side.
 */
const B1 = { from: TOP.to, to: 147.9, y: 4.4 };
const CRACK = { from: B1.to, to: 149.3, bottom: -3 };
const B2 = { from: CRACK.to, to: 153.5, y: 4.4 };
const B3 = { from: 155.9, mid: 157.9, to: 160.7, low: 4.4, high: 5.6 };

/** The open slope below the cliff, level and whole from the first boulder of its lee to the last. */
const SLOPE = TOP.y;
const LEE = [163.9, 169.1, 174.3, 179.5, 184.7];

/** Up the last of the hill to its brow, where the narrow is seen far below. */
const RISE = { from: 186.9, to: 191.3 };
const BROW = { from: RISE.to, to: 210, y: 6.4 };
const rise = (x: number) => round(SLOPE + ((BROW.y - SLOPE) * (x - RISE.from)) / (RISE.to - RISE.from), 4);
/** Where mormor stands when she has come up the path behind him, on the last of the rise, behind the path and Klonk. */
const MORMOR_UP = { x: 190.4, z: -1.5 };

/**
 * Up Billaberget's cliff, a second way (docs/level-design.md): three shelves of rock where the hazel grows, each a
 * held jump over the last. He walks off the third onto the big boulder. A hop along the trail tops out under all.
 */
const SHELVES: Ledge[] = [
  { x: 151.7, y: 5.4, width: 1.6, look: 'shelf' },
  { x: 154.3, y: 6.3, width: 1.6, look: 'shelf' },
  { x: 157.1, y: 7, width: 1.6, look: 'shelf' },
];

/**
 * The hazel at the shelves (Olov, 12 November 2026: "gör det som rekommenderad men gärna hasselbuskar också och nån
 * hasselnöt"): bushes of many stems at the cliff's foot, two beside the first shelf and two beside the third, standing
 * behind the boulders and the path, with October's nuts hanging in them in their husks (`nuts`: how many clusters); and
 * two nuts that have fallen, lying near the front of the first shelf and of the third, aside from their sweets. Each
 * bush's `y` is the ground at its foot (the boulders' foot), `tall` and `wide` its crown's. Picture only (../hazel.ts):
 * the simulation has none of it, and no nut is candy.
 */
export const HAZEL = {
  bushes: [
    { x: 145.3, y: TOP.y, z: -3, tall: 6, wide: 2.4, nuts: 2 },
    // On the first boulder's back, short of the crack: the crack's floor is far down, and the bush would stand in it.
    { x: 147, y: TOP.y, z: -2.3, tall: 5.6, wide: 2.1, nuts: 2 },
    { x: 161.6, y: SLOPE, z: -2.4, tall: 5.6, wide: 2.2, nuts: 3 },
    { x: 164.2, y: SLOPE, z: -3.4, tall: 6.2, wide: 2.4, nuts: 2 },
  ],
  fallen: [
    { x: round(SHELVES[0]!.x - 0.85), y: SHELVES[0]!.y, z: -0.62 },
    { x: round(SHELVES[2]!.x + 0.85), y: SHELVES[2]!.y, z: -0.62 },
  ],
};

/**
 * The narrow far below the brow, behind the forest, for the picture: from the brow, a dark band of water at the
 * horizon. The sheet lies a little over the brow's own ground, where the ground's bank behind the path does not
 * hide it, and starts in front of the garden's nearest far picture (32 behind the path), which covers whatever is
 * behind it. From lower down the hill it is above the camera, and not seen. The two figures sit on a stone in it.
 */
const NARROW = { from: 182, to: 300, y: 6.75, near: -20 };
const STONE_OUT = { x: 195, y: round(NARROW.y + 0.3), z: -27 };
/**
 * Seeing them there (Olov, 9 November 2026: "Bilden ska bli tydligare när lillgubben och gamla trägubben syns nere i
 * sundet"): far as they are, the two figures and their stone are drawn bigger than they would be, as a picture that wants
 * them seen does, warm against the dark water with a light on the water behind them; and when the flash shows them, the
 * camera goes out from the brow to them, over the narrow's water (`z`: the picture is measured at the stone), holds
 * them while he says what he sees, and then gives him back.
 */
const FAR_SIZE = 2.2;
const SEEN = { x: STONE_OUT.x - 0.3, y: round(NARROW.y + 1.1), z: STONE_OUT.z, height: 4.4, width: 5, seconds: 7 };

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
/** A stone in the brook in the ground's outline: up out of its bed, across, and down again. */
const island = (s: Stone): Vec[] => [{ x: s.from, y: BED }, { x: s.from, y: s.y }, { x: s.to, y: s.y }, { x: s.to, y: BED }];
/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
const hops = (way: Stone[]): Jump[] => way.slice(1).map((next, i) => jump({ x: round(way[i]!.to - 0.2), y: way[i]!.y }, { x: round(next.from + 0.9), y: next.y }));
/** The trail over the brook: one candy in an arc over each hop, and one on each stone. */
function across(way: Stone[]): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push(hopCandy({ x: here.to, y: here.y }, { x: next.from, y: next.y }, 1.15));
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2, 1), y: round(next.y + 0.45) });
  }
  return out;
}

export const billsta: ChapterData = {
  id: 'billsta',
  place: 'garden',
  // Beside the family's car, on the road.
  spawn: { x: 1, y: 0.01 },
  scenes: [
    // Where and when, as the chapter opens (src/content/chapters/cards.ts), and the arrival. Moa and Bertil have
    // jumped out of the car and stand by its front, Moa looking up at mormor and morfar's lit window, Bertil at Elof.
    // Mamma, who drove ("Hoppa in, Elof! Vi kör dit med bilen." at Älven's end), stands by the headlight and lights
    // the road for him; Pappa beside the front door lights the way up to the house. They stay by the car (the coda's
    // "family by the car").
    //
    // He stands by the car while Moa says the two things the chapter rests on: there is light at mormor and morfar's,
    // and the trail is hers and Bertil's now (Älven's end: "Då lägger vi ett eget spår åt dig!"). The road to morfar
    // is fourteen EL: said on the run, her words were still up when morfar spoke, and his came late all the way to
    // mormor. Each line is a reading stop of the scene, as in the evening at home.
    { ...CARD, seconds: 5.2, hold: true,
      lines: [
        { at: 2.2, who: 'moa', line: 'biWindow', id: 'bi:window' },
        { at: 3.8, who: 'moa', line: 'biNewTrail', id: 'bi:new-trail' },
      ],
      stage: { ...CARD.stage,
      // Establish the whole car and the family before following Elof, including on a portrait phone.
      shots: [{ at: 0, x: -2, y: 3.2, height: 12.5, width: 30, move: 0.01 }],
      actors: {
      // "Titta! Det lyser hos mormor och morfar.": she points, and Bertil looks; then both look to Elof.
      moa: [
        { at: 0, ...KIDS.moa, y: 0, face: 0.3, move: 0.01, act: 'look', aim: WINDOW },
        { at: 2, act: 'point', aim: WINDOW },
        { at: 3.7, act: 'look', aim: BY_CAR },
      ],
      bertil: [
        { at: 0, ...KIDS.bertil, y: 0, face: 0.35, move: 0.01, act: 'look', aim: BY_CAR },
        { at: 2.4, act: 'look', aim: WINDOW },
        { at: 3.9, act: 'look', aim: BY_CAR },
      ],
      mamma: [{ at: 0, ...PARENTS.mamma, y: 0, face: 0.2, move: 0.01, act: 'shine', aim: ROAD, holds: 'lamp-mamma' }],
      pappa: [{ at: 0, ...PARENTS.pappa, y: 0, face: 0.12, move: 0.01, act: 'shine', aim: UP_TO_HOUSE, holds: 'lamp-pappa' }],
    } } },
    // "Följ vårt godis! Vi springer före.": the trail is theirs now (docs/aventyr-2.md). Moa waves to him, and they
    // run off ahead of him up to mormor and morfar's house, round its left end, and in by its door at the back.
    { id: 'bi:kids-run', on: 'beat:bi:new-trail', until: 'bi:morfar', seconds: inAt('bertil') + 0.6, stage: { actors: {
      // Mamma watches them go, and lights his road again.
      mamma: [{ at: 0.6, act: 'look', aim: RUN.corner }, { at: roundAt('moa') + 1, act: 'shine', aim: ROAD }],
      moa: [
        { at: 0, act: 'wave', aim: BY_CAR },
        { at: RUN.moa.from, ...RUN.corner, y: 0, move: RUN.moa.corner, act: 'look', aim: RUN.corner },
        { at: roundAt('moa'), ...RUN.door, y: 0, move: RUN.moa.door, act: 'look', aim: RUN.door },
        { at: inAt('moa') + 0.2, away: true },
      ],
      bertil: [
        { at: 0.3, act: 'cheer' },
        { at: RUN.bertil.from, x: RUN.corner.x + 1.4, y: 0, z: RUN.corner.z + 2.2, move: RUN.bertil.corner, act: 'look', aim: RUN.corner },
        { at: roundAt('bertil'), x: RUN.door.x + 1.2, y: 0, z: RUN.door.z + 0.6, move: RUN.bertil.door, act: 'look', aim: RUN.door },
        { at: inAt('bertil') + 0.2, away: true },
      ],
    } } },
    // Over the ditch he turns back to morfar, waves and thanks him for the ladder, and morfar sends him on to mormor
    // (Olov, 12 November 2026: "Elof måste tacka morfar som lägger stegen över diket"). Told standing on the far side,
    // as the family's thanks are in the first adventure (`tack-pappa`, `flata-tack`): said in passing, the thanks was a
    // remark, let go when he ran on. A game taken up at the drive's big candy has had it.
    // The picture takes in the two of them, morfar by his ladder and Elof turned back to him, before the words.
    {
      id: 'bi:tack-morfar', at: THANKS_AT, needs: 'bi:ladder', before: DRIVE_CANDY - 0.2, until: 'beat:bi:to-mormor', seconds: 0.9, hold: true,
      dialogue: ['bi:thanks', 'bi:to-mormor'], cues: [{ at: 0.55, flag: 'bi:thanks-seen' }],
      stage: {
        shots: [{ at: 0, x: round((MORFAR.x + THANKS_AT) / 2 + 0.3), y: 2.9, height: 7.6, width: 12.4, move: 0.6 }],
        elof: [{ at: 0, face: 0.5, act: 'wave', aim: { x: MORFAR.x + 0.4, y: 4.2, z: -0.8 } }, { at: 0.8, act: 'look', aim: { x: MORFAR.x + 0.4, y: 4.4, z: -0.8 } }],
      },
    },
    // Called, mormor walks up the planks and opens the barn's door while he watches: all of it in the picture, until
    // the door is open and she has let go of it.
    {
      id: 'bi:ladan', on: 'bi:mormor-goes', seconds: MORMOR_SEEN.seconds,
      stage: { shots: [{ at: 0, x: MORMOR_SEEN.x, y: MORMOR_SEEN.y, height: MORMOR_SEEN.height, width: MORMOR_SEEN.width, move: 1.2 }] },
    },
    // "Där nere! På en sten i sundet!": the camera goes out to the stone far below, looking down onto it a little, and
    // stays there while he says what he sees, the little one lands, and the old one holds him. This short
    // view holds Elof on the safe brow; its dialogue finishes automatically, with the figures still in sight.
    // Mormor's words come after it, back on the brow, where she has come up the path with her lantern and is seen saying
    // them (`MORMOR_UP`): said in it, they were said with the picture out on the stone.
    {
      id: 'bi:sundet', at: 193.2, seconds: SEEN.seconds, hold: true,
      dialogue: ['bi:there', 'bi:holds', 'bi:not-alone', 'bi:owl'],
      // Frame the stone before making the first line available, even when earlier speech is still queued.
      cues: [{ at: 0.01, flag: 'bi:strait-seen' }],
      stage: { shots: [{ at: 0, x: SEEN.x, y: SEEN.y, z: SEEN.z, height: SEEN.height, width: SEEN.width, eye: 1, move: 0.001 }] },
    },
  ],
  goalX: 194.6,
  // The chapter's card waits until the flash's last word is said: the little one safe on the stone, the owl.
  goalNeeds: 'beat:bi:cheer',
  // Everyone answers in the coda: the family by the car, and mormor and morfar.
  coda: 'all',
  ground: [
    // The level's backstop is beyond the parked car. At x=-3 its tall front face hid the whole rear and cabin.
    { x: -30, y: 10 },
    { x: -30, y: 0 },
    // 1. the road, 2. its ditch
    ...pit(DITCH.from, DITCH.to, DITCH.bottom, 0),
    // 3. the drive, the lawn, and the woodshed's stack, with a soft drop off its end
    ...steps(STACK, 0),
    { x: STACK_TOP.to, y: STACK_TOP.y },
    { x: STACK_TOP.to, y: 0 },
    // 4. the planks up to the barn's door, the loft's floor, a bale, the hatch, and the hay up to the roof
    { x: PLANKS.from, y: 0 },
    { x: PLANKS.to, y: LOFT },
    { x: BALE.from, y: LOFT },
    { x: BALE.from, y: BALE.y },
    { x: BALE.to, y: BALE.y },
    { x: BALE.to, y: LOFT },
    ...pit(HATCH.from, HATCH.to, 0, LOFT),
    ...steps(HAY, LOFT),
    // the gable at the hay's end, on the roof's level (`HAY_ENDS`), the roof, out to where it slopes down to its low
    // eaves, and the soft drop to the ground behind the house
    { x: HAY_ENDS, y: ROOF.y },
    { x: round(HAY_ENDS + 0.05, 2), y: ROOF.y },
    { x: ROOF.to, y: ROOF.y },
    { x: EAVES.from, y: EAVES.y },
    { x: EAVES.to, y: EAVES.y },
    { x: EAVES.to, y: 0 },
    // 5. the brook and its stones, the bank where the seesaw lies, the deep brook, and the hill's steep bank
    { x: EDGE.to, y: 0 },
    { x: EDGE.to, y: BED },
    ...STONES.flatMap(island),
    { x: BANK.from, y: BED },
    { x: BANK.from, y: 0 },
    ...pit(POOL.from, POOL.to, POOL.bottom, 0, TOP.y),
    // Billaberget's boulders: up the first, over the crack, down, and up the big one in two steps
    { x: B1.from, y: TOP.y },
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
    // the open slope where the gusts blow, level from the first boulder of its lee to the last; 6. up to the brow
    { x: RISE.from, y: SLOPE },
    { x: RISE.to, y: BROW.y },
    { x: BROW.to, y: BROW.y },
    { x: BROW.to, y: 14 },
  ],
  water: [
    { from: DITCH.from, to: DITCH.to, y: DITCH_WATER },
    { from: EDGE.to, to: BANK.from, y: BROOK_WATER },
    { from: POOL.from, to: POOL.to, y: POOL_WATER },
  ],
  surfaces: [
    // The road, and the gravel drive up to the yard.
    { from: -3, to: DITCH.from, kind: 'asphalt' },
    { from: DRIVE.from, to: DRIVE.to, kind: 'earth' },
    // The planks, the loft's floor and the roof, all boards: the ground's 'iron' is a drain's grate, not a roof. The bale
    // and the hay he climbs to the roof are straw (their bales are drawn over them: ../barn-loft.ts); as boards, each
    // was a wooden box whose floor ran out towards the camera.
    { from: PLANKS.from, to: BALE.from, kind: 'wood' },
    { from: BALE.from, to: BALE.to, kind: 'shavings' },
    { from: BALE.to, to: HAY[0]!.x, kind: 'wood' },
    { from: HAY[0]!.x, to: HAY[1]!.x, kind: 'shavings' },
    { from: HAY[1]!.x, to: HAY_ENDS, kind: 'shavings' },
    { from: HAY_ENDS, to: EAVES.to, kind: 'roof' },
    // The forest floor behind the house, the stones in the brook, and Billaberget's boulders.
    { from: EDGE.from, to: EDGE.to, kind: 'moss' },
    ...STONES.map((s) => ({ from: s.from, to: s.to, kind: 'wetRock' as const })),
    { from: BANK.from, to: BANK.to, kind: 'moss' },
    // Billaberget: moss and thin forest up to the boulders, and all the way over them to the brow.
    { from: TOP.from, to: B1.from, kind: 'moss' },
    { from: B1.from, to: B3.to, kind: 'stone' },
    { from: B3.to, to: BROW.to, kind: 'moss' },
  ],
  // What the stones and the boulders are, for the picture only: granite of Billaberget's boulder field.
  landmarks: [
    { look: 'woodpile', from: STACK[0]!.x, to: STACK_TOP.to, base: 0 },
    // The loft's bales are the barn's own (../barn-loft.ts): the picture's floor runs on under them. As steps of the
    // ground, each had a front of its own reaching out under the bale towards the camera, a grey wedge of straw.
    { look: 'bale', from: BALE.from, to: BALE.to, base: LOFT },
    { look: 'bale', from: HAY[0]!.x, to: HAY[1]!.x, base: LOFT },
    { look: 'bale', from: HAY[1]!.x, to: HAY_ENDS, base: LOFT },
    ...STONES.map((s) => ({ look: 'stone' as const, from: s.from, to: s.to, base: BROOK_WATER - 1 })),
    { look: 'stone', from: B1.from, to: B1.to, base: TOP.y },
    { look: 'stone', from: B2.from, to: B2.to, base: SLOPE },
    { look: 'stone', from: B3.from, to: B3.to, base: SLOPE },
  ],
  // Each in the gap between two of the trail's sweets, never with one at its foot.
  checkpoints: [
    { x: 7, y: 0 },
    { x: DRIVE_CANDY, y: 0 },
    { x: 35.95, y: 0 },
    { x: 57.4, y: LOFT },
    { x: 70.7, y: ROOF.y },
    { x: 108.2, y: 0 },
    // On the bank where the brook's stones end, before the frog and the branches.
    { x: 122.7, y: 0 },
    { x: 142.4, y: TOP.y },
    // Past where he lands off the big boulder, not under the sweets of the drop off it.
    { x: 163.3, y: SLOPE },
  ],
  // The storm over the barn's roof and over the open slope: Berget's rhythm, a gust every four seconds for a little
  // under one and a half. A dash from one lee to the next (1.5 s) leaves a good second of the calm between to spare.
  gusts: [
    { from: ROOF_LEE[0]!, to: ROOF_LEE[ROOF_LEE.length - 1]!, y: ROOF.y, every: 4, length: 1.4, first: 0.5, shelters: ROOF_LEE },
    { from: LEE[0]!, to: LEE[LEE.length - 1]!, y: SLOPE, every: 4, length: 1.4, first: 0.5, shelters: LEE },
  ],
  ledges: [LADDER, ...BEAMS, ...SHELVES],
  spots: [
    // Morfar at the ditch, with his long ladder.
    { id: 'bi:morfar', look: 'morfar', at: MORFAR, verb: 'call', word: 'biCallMorfar' },
    // Mormor by the woodshed, with her lantern: called, she walks up the planks and opens the barn's door.
    {
      id: 'bi:mormor', look: 'mormor', at: MORMOR, verb: 'call', word: 'biCallMormor',
      standsAt: MORMOR_WAITS, goesTo: MORMOR_AT_DOOR, goesWhen: 'bi:mormor-goes',
    },
    // Klonk at the seesaw: he is too light alone, and calls his friend.
    { id: 'bi:call-klonk', at: { x: CALL_AT, y: 0 }, verb: 'call', word: 'biCallKlonk' },
    // The seesaw itself. Once the stone is near his end, Klonk's long arm flings him over the brook.
    { id: 'bi:fling', look: 'seesawLog', at: { x: TOUCHED, y: 0 }, verb: 'take', touch: true, needs: PIVOT_PLACED, ride: 'bi:fling' },
  ],
  rides: [{ id: 'bi:fling', look: 'none', ...FLING }],
  movers: [DOOR, PIVOT],
  counterweight: { from: BANK.from, to: POOL.from, call: 'bi:call-klonk', heavy: PIVOT.id, launch: 'bi:fling' },
  // Morfar lays his ladder over the ditch: Elof stands and watches until it lies still.
  later: [
    { flag: 'bi:ladder', after: 'bi:morfar', seconds: 2.7, hold: true, within: [6, 20] },
    // Mormor, once her words are read, walks up the planks to the barn's door and opens it: he stands and watches.
    { flag: 'bi:mormor-goes', after: 'bi:mormor', seconds: 0.2, hold: true, within: [MORMOR.x - 4, PLANKS.to] },
    { flag: 'bi:door', after: 'bi:mormor-goes', seconds: round(MORMOR_WALK + 0.55, 2), hold: true, within: [MORMOR.x - 4, PLANKS.to] },
    // Klonk jumps onto the seesaw's high end: Elof stands on the low end and watches until Klonk is on.
    { flag: 'bi:klonk-on', after: 'bi:call-klonk', seconds: 1.2, hold: true, within: [BANK.from, POOL.from] },
    // If he stands and thinks, he remembers something, and a little later he looks at the stone.
    { flag: 'bi:think', after: 'bi:klonk-on', seconds: 10, until: PIVOT_PLACED },
    { flag: 'bi:think-more', after: 'bi:klonk-on', seconds: 22, until: PIVOT_PLACED },
    // The little one, tossed onto the stone by a wave, where the old one catches him.
    { flag: 'bi:landed', after: 'beat:bi:there', seconds: 1.6 },
    // Back on the brow from the stone, mormor is there with her lantern, and speaks.
    { flag: 'bi:mormor-up', after: 'scene:bi:sundet', seconds: 0.5 },
  ],
  // Lätta hopp: every edge the trail jumps from.
  jumps: [
    // Up a stair, each landing is short of the next riser by more than a stride, so he runs on from it.
    ...STACK.map((s, i) => jump({ x: round(s.x - 0.2), y: i === 0 ? 0 : STACK[i - 1]!.y }, { x: round(s.x + 0.45), y: s.y })),
    jump({ x: round(BALE.from - 0.2), y: LOFT }, { x: round(BALE.from + 0.7), y: BALE.y }),
    jump({ x: round(HATCH.from - 0.2), y: LOFT }, { x: round(HATCH.to + 0.9), y: LOFT }),
    ...HAY.map((s, i) => jump({ x: round(s.x - 0.2), y: i === 0 ? LOFT : HAY[i - 1]!.y }, { x: round(s.x + 0.45), y: s.y })),
    ...hops(BROOK_WAY),
    // Over the stone under the spruce: past it, to its far side, and back again when it has been pushed.
    { at: { x: 129.2, y: 0 }, dir: 1, land: { x: 131.6, y: 0 }, until: PIVOT_PLACED },
    { at: { x: 130.2, y: 0 }, dir: -1, land: { x: 128.1, y: 0 }, needs: PIVOT.id },
    jump({ x: round(B1.from - 0.2), y: TOP.y }, { x: round(B1.from + 0.7), y: B1.y }),
    jump({ x: round(CRACK.from - 0.2), y: B1.y }, { x: round(CRACK.to + 0.9), y: B2.y }),
    jump({ x: round(B3.from - 0.2), y: SLOPE }, { x: round(B3.from + 0.7), y: B3.low }),
    jump({ x: round(B3.mid - 0.2), y: B3.low }, { x: round(B3.mid + 0.7), y: B3.high }),
  ],
  storm: {
    rain: 1,
    lightning: 5.5,
    // On the barn's roof the lee is its brick ventilation chimneys (../barn-chimney.ts); on Billaberget its boulders.
    shelters: ['vents', 'rocks'],
    // The narrow, far below the brow beyond the forest, where the two figures are.
    lakes: [NARROW],
    flybys: [
      // From the brow: a wave of wind tosses the little one away towards the narrow, onto the stone out in it.
      { on: 'beat:bi:there', from: { x: 188.4, y: 12 }, to: { x: STONE_OUT.x + 1, y: 9 }, seconds: 1.6, who: 'lillgubbe' },
    ],
    // Mormor and morfar's place by the road near the forest: the white house with its lit window behind the yard,
    // the red barn beside it, whose windows glow once mormor has taken her lantern in; the woodshed, the rowing boat
    // on its trestles under a tarp, the garden furniture under another, the mailbox by the road, birches, and the
    // forest's spruces across the road and behind the house, up Billaberget.
    buildings: [
      // The family's car on the road, just stopped after the drive, its wet glass reflecting the night sky.
      { kind: 'car', x: CAR.x, z: CAR.z, width: CAR.width, lit: '', size: 0.62 },
      { kind: 'mailbox', x: 11.6, z: -2.4 },
      // The road's wooden poles, with their wires across the sky, and a lamp on each.
      { kind: 'pole', x: -30, z: -9, height: 19, width: 34, lit: '' },
      { kind: 'pole', x: 4, z: -9, height: 19, width: 34, lit: '' },
      { kind: 'pole', x: 38, z: -9, height: 19, width: 34, lit: '' },
      // Spruces across the road.
      { kind: 'spruce', x: -26, z: -30, y: -6, height: 62 },
      { kind: 'spruce', x: -12, z: -42, y: -7, height: 70 },
      { kind: 'spruce', x: -1, z: -34, y: -5, height: 54 },
      // The house behind the yard, in sight from the road, with the barn beside it: neither stands in the other.
      { kind: 'villa', x: 18, z: -72, width: 44, lit: '', model: 'billsta-house', size: 0.72 },
      // The great round birch that stands behind it.
      { kind: 'birch', x: -6, z: -96, height: 84 },
      { kind: 'barn', x: 94, z: -44, lit: 'bi:mormor', model: 'billsta-barn', size: 0.8 },
      // The woodshed, far enough back that its chopping block stands behind the path, and behind mormor.
      { kind: 'woodshed', x: 42, z: -12.2 },
      { kind: 'rowboat', x: 24, z: -5, width: 16 },
      // Morfar's garden table and chairs, put away under a tarp for the winter, on the lawn towards the house.
      { kind: 'gardenset', x: 34, z: -30, width: 9.2 },
      { kind: 'birch', x: 18, z: -10, height: 56 },
      { kind: 'birch', x: 104, z: -22, height: 60 },
      // The forest behind the house, and up Billaberget. Each spruce stands a little sunk, so that its lowest
      // boughs come down near the ground, as a Norrland spruce's do, and none hangs over the path as a dark roof.
      { kind: 'spruce', x: 113, z: -30, y: -6, height: 46 },
      { kind: 'spruce', x: 120, z: -26, y: -5, height: 38 },
      { kind: 'spruce', x: 127, z: -31, y: -7, height: 54 },
      { kind: 'spruce', x: 133, z: -27, y: -5, height: 40 },
      { kind: 'spruce', x: 140, z: -30, y: -5, height: 44 },
      // A spruce on the bank's top, over the brook.
      { kind: 'spruce', x: 143.6, z: -10, y: round(TOP.y - 4), height: 36 },
      // Billaberget's face behind its shelves: the shelves jut out of the granite.
      { kind: 'cliff', x: 154.9, z: -3.2, width: 14, height: 11 },
      { kind: 'spruce', x: 159, z: -31, y: round(SLOPE - 7), height: 50 },
      { kind: 'spruce', x: 166, z: -28, y: round(SLOPE - 6), height: 46 },
      { kind: 'spruce', x: 173, z: -26, y: round(SLOPE - 5), height: 40 },
      { kind: 'spruce', x: 179, z: -31, y: round(SLOPE - 7), height: 52 },
    ],
    glows: [
      // The car's headlights, still on.
      { at: { x: round(CAR.x + CAR.width / 2 + 0.3), y: 4.6 }, z: CAR.z + 4.5, size: 1.6 },
      { at: { x: round(CAR.x + CAR.width / 2 + 0.3), y: 4.6 }, z: CAR.z - 4.5, size: 1.6 },
      // Mormor's lantern, held up at the barn's door once she has opened it: its light falls into the dark loft.
      { at: { x: 56.8, y: LOFT + 0.6 }, z: -0.9, size: 1.3, after: `placed:${DOOR.id}` },
      { at: { x: 63, y: LOFT + 2.2 }, z: -2.4, size: 2.4, after: `placed:${DOOR.id}` },
      // Mormor, come up the path behind him with her lantern, as the owl hoots: its light, where she holds it low.
      { at: { x: MORMOR_UP.x + 0.9, y: round(rise(MORMOR_UP.x) + 2.1) }, z: MORMOR_UP.z + 0.4, size: 1.2, after: 'beat:bi:owl' },
      // A light on the water behind the two on their stone, from the moment the flash shows them: they stand out against it.
      { at: { x: STONE_OUT.x + 0.4, y: round(NARROW.y + 1.1) }, z: STONE_OUT.z - 1.2, size: 6.5, after: 'beat:bi:there' },
    ],
  },
  decor: [
    // A frog on the middle stone of the brook, and another on its bank.
    { look: 'kit', word: 'groda', at: { x: 115.6, y: 0.4 }, z: -1.4, turn: 0.6, scale: 0.8 },
    { look: 'kit', word: 'groda', at: { x: 124.6, y: 0 }, z: -1.2, turn: -0.5, scale: 0.7 },
    // The forest behind the house: fallen branches, a mossy log and a sawn stump.
    { look: 'kit', word: 'gren-a', at: { x: 124.6, y: 0 }, z: -1.6, turn: 0.4 },
    { look: 'kit', word: 'stubbe-sagad', at: { x: 125.8, y: 0 }, z: -2.6, turn: 1.1 },
    { look: 'kit', word: 'lag-mossig', at: { x: 143.4, y: 3.2 }, z: -2.8, turn: 0.1 },
    { look: 'kit', word: 'gren-b', at: { x: 166.8, y: 3.2 }, z: -1.4, turn: 2.4 },
    { look: 'kit', word: 'gren-a', at: { x: 176.6, y: 3.2 }, z: -1.7, turn: 0.2 },
    { look: 'kit', word: 'stubbe-sagad', at: { x: 181.2, y: 3.2 }, z: -2.4, turn: 0.5 },
    { look: 'kit', word: 'gren-b', at: { x: 190.2, y: 6.4 }, z: -1.5, turn: 1.2 },
    { look: 'kit', word: 'lag-mossig', at: { x: 199, y: 6.4 }, z: -2.6, turn: 2.9 },
    // The hazel shelves on Billaberget's face.
    ...SHELVES.map((l, i) => ({ look: 'kit' as const, word: i === 1 ? 'hylla-b' : 'hylla-a', at: { x: l.x, y: l.y }, z: -0.5, scale: l.width / (i === 1 ? 3.2 : 2.6) })),
    // Mormor, come up the path behind him with her lantern as the owl hoots, and there when the picture comes back from
    // the stone: she says they will go down to the narrow.
    { look: 'mormor', at: { x: MORMOR_UP.x, y: rise(MORMOR_UP.x) }, z: MORMOR_UP.z, after: 'beat:bi:owl' },
    // Far out in the narrow, on a stone: the old one, and the little one once the wave has tossed him there. Found, both
    // are warm in the dark (as on the stone in the storm's eye), and the old one rocks a little as he holds the little one.
    { look: 'tragubbe', word: 'lifted', at: { x: STONE_OUT.x, y: STONE_OUT.y }, z: STONE_OUT.z, scale: FAR_SIZE, after: 'beat:bi:there' },
    { look: 'lillgubbe', word: 'lifted', at: { x: round(STONE_OUT.x + 0.32 * FAR_SIZE), y: STONE_OUT.y }, z: STONE_OUT.z, scale: FAR_SIZE, after: 'bi:landed' },
  ],
  // Klonk, ahead of him all the way, on firm ground. It waits at the ditch for the ladder and at the barn's door
  // for mormor; on the roof and the slope it hops from lee to lee; at the seesaw it waits over the stone until he
  // calls, jumps onto the high end and stays there until he flies, and then follows him over the brook; at the end
  // it thinks of the little one.
  // After the cutaway, its picture remains at the lookout even though Klonk has hopped ahead.
  thoughtClues: [{ at: { x: 195.6, y: BROW.y + .5 }, picture: 'small-figure', after: 'beat:bi:there' }],
  ghost: [
    { at: { x: 3.9, y: 0 } },
    { at: { x: 9.4, y: 0 } },
    { at: { x: 14.2, y: 0 }, until: 'bi:ladder' },
    { at: { x: 20.6, y: 0 } },
    { at: { x: 26, y: 0 } },
    { at: { x: 31.6, y: 0 } },
    { at: { x: 36.6, y: 0 } },
    { at: { x: 42.8, y: STACK_TOP.y } },
    { at: { x: 49.6, y: ramp(49.6) } },
    { at: { x: 53.6, y: ramp(53.6) }, until: `placed:${DOOR.id}` },
    { at: { x: 58.2, y: LOFT } },
    { at: { x: 60.2, y: BALE.y } },
    { at: { x: 62.4, y: LOFT } },
    { at: { x: 66.4, y: LOFT } },
    { at: { x: 70.8, y: ROOF.y } },
    ...ROOF_LEE.slice(1).map((x) => ({ at: { x, y: ROOF.y } })),
    { at: { x: 102.4, y: eaves(102.4) } },
    { at: { x: 108, y: 0 } },
    { at: { x: 112, y: STONES[0]!.y } },
    { at: { x: 115.8, y: STONES[1]!.y } },
    { at: { x: 119.6, y: STONES[2]!.y } },
    { at: KLONK_WAITS, until: 'bi:call-klonk', near: 8, still: true },
    { at: HIGH_END, until: PIVOT_PLACED, near: 8, z: -0.34, still: true },
    { at: HIGH_ARM, until: 'bi:fling', near: 8, z: -0.34, still: true },
    { at: { x: 143, y: TOP.y } },
    { at: { x: 146.3, y: B1.y } },
    { at: { x: 151.1, y: B2.y } },
    { at: { x: 154.9, y: SLOPE } },
    { at: { x: 159.7, y: B3.high } },
    { at: { x: 162.9, y: SLOPE } },
    ...LEE.slice(1).map((x) => ({ at: { x, y: SLOPE } })),
    { at: { x: 189, y: rise(189) } },
    { at: { x: 195.6, y: BROW.y }, thought: { picture: 'small-figure' as const, after: 'beat:bi:there' } },
    { at: { x: 199.4, y: BROW.y } },
  ],
  beats: [
    // Which lines are the story's and which are passing remarks (`aside`): docs/dialogue.md.
    // 1. the road: Moa's two lines are the arrival's, said by the car (`card`, above)
    // 2. Morfar at the ditch. He sees Elof coming and greets him, and Elof answers with what stops him; called, he
    // says what he does. Over the ladder Elof thanks him, standing, and morfar answers.
    { id: 'bi:morfar-here', at: 6, until: 'bi:morfar', who: 'morfar', line: 'biMorfarHere', read: true },
    { id: 'bi:ditch', on: 'beat:bi:morfar-here', until: 'bi:morfar', who: 'elof', line: 'biDitch', aside: true },
    // What each of them is about to do is said while they do it: once the ladder lies there, or the door is open,
    // the words for it are let go, and the next ones come in their place.
    { id: 'bi:ladder-lay', on: 'bi:morfar', until: 'bi:ladder', within: [6, 20], who: 'morfar', line: 'biLadderLay', read: true },
    { id: 'bi:ladder', on: 'bi:ladder', within: [6, 20], who: 'morfar', line: 'biLadderOn', aside: true },
    // The thanks and morfar's answer are the story's now, told standing (`bi:tack-morfar`, above).
    { id: 'bi:thanks', at: THANKS_AT, needs: 'bi:thanks-seen', within: [DITCH.from, DRIVE_CANDY], who: 'elof', line: 'biThanksMorfar' },
    { id: 'bi:to-mormor', on: 'beat:bi:thanks', who: 'morfar', line: 'biToMormor' },
    // 3. the yard, and Mormor by the woodshed
    { id: 'bi:yard', at: 26.4, who: 'elof', line: 'biYard', aside: true },
    { id: 'bi:mormor-here', at: 45, until: 'bi:mormor', who: 'mormor', line: 'biMormorHere', read: true },
    { id: 'bi:lantern', on: 'bi:mormor', until: 'bi:door', who: 'mormor', line: 'biLantern', read: true },
    { id: 'bi:open', on: `placed:${DOOR.id}`, who: 'elof', line: 'biOpen', read: true },
    // A lookout is the next lead after the river's trail ends; the barn is the way up to it. Told at the door and in
    // the loft's first steps: on the roof the wind's words have to come at once.
    { id: 'bi:lookout', on: 'beat:bi:open', within: [MORMOR.x - 2.6, HATCH.from], who: 'mormor', line: 'biLookout', read: true },
    { id: 'bi:way', on: 'beat:bi:lookout', within: [MORMOR.x - 2.6, HATCH.from], who: 'mormor', line: 'biWay', read: true },
    { id: 'bi:onward', on: 'beat:bi:way', within: [MORMOR.x - 2.6, HATCH.from], who: 'elof', line: 'biOnward', read: true },
    // 4. the hay loft, the roof, and down behind the house
    { id: 'bi:loft', at: 57.8, needs: `placed:${DOOR.id}`, who: 'elof', line: 'biLoft', aside: true },
    { id: 'bi:roof', at: 70.2, who: 'elof', line: 'biRoof' },
    { id: 'bi:roof-klonk', on: 'beat:bi:roof', who: 'spoket', line: 'biKlonk', aside: true },
    // 5. the brook, Klonk's seesaw, and Billaberget. Each line of the puzzle belongs to its step, and is let go once
    // that step is behind him: whoever sees the answer at once is not told the question afterwards.
    { id: 'bi:seesaw', at: 126.4, until: 'bi:call-klonk', who: 'elof', line: 'biSeesaw', read: true },
    { id: 'bi:call', on: 'bi:call-klonk', until: 'bi:klonk-on', who: 'elof', line: 'biJumpOn' },
    { id: 'bi:klonk-jump', on: 'beat:bi:call', who: 'spoket', line: 'biKlonk', aside: true },
    { id: 'bi:too-light', on: 'bi:klonk-on', until: PIVOT_PLACED, who: 'elof', line: 'biTooLight' },
    { id: 'bi:klonk-sorry', on: 'beat:bi:too-light', who: 'spoket', line: 'biKlonk', aside: true },
    { id: 'bi:middle', on: 'bi:think', until: PIVOT_PLACED, who: 'elof', line: 'biMiddle' },
    { id: 'bi:the-stone', on: 'bi:think-more', until: PIVOT_PLACED, who: 'elof', line: 'biTheStone' },
    { id: 'bi:near-middle', on: PIVOT_PLACED, until: 'bi:fling', who: 'elof', line: 'biNearMiddle' },
    { id: 'bi:fly', on: 'bi:fling', within: [FLING.from.x - 1, FLING.to.x + 1], who: 'elof', line: 'biFly', aside: 12 },
    { id: 'bi:thanks-klonk', at: 141, needs: 'bi:fling', who: 'elof', line: 'biThanksKlonk' },
    { id: 'bi:klonk-glad', on: 'beat:bi:thanks-klonk', who: 'spoket', line: 'biKlonkKlonk', aside: true },
    { id: 'bi:hazel', at: 150.2, who: 'elof', line: 'biHazel', aside: true },
    { id: 'bi:wind', at: 162.4, who: 'elof', line: 'biWind', read: true },
    // 6. the brow: a flash, both trägubbar on a stone in the narrow far below, and the owl far off
    { id: 'bi:there', at: 193.2, needs: 'bi:strait-seen', who: 'elof', line: 'biThere', read: true },
    { id: 'bi:holds', on: 'bi:landed', who: 'elof', line: 'biHolds' },
    // The old one reached him: what he hurried for all night (Stormskogen's hollow).
    { id: 'bi:not-alone', on: 'beat:bi:holds', who: 'elof', line: 'biNotAlone' },
    { id: 'bi:owl', on: 'beat:bi:not-alone', who: 'elof', line: 'biOwl' },
    { id: 'bi:down', on: 'bi:mormor-up', who: 'mormor', line: 'biToNarrow' },
    { id: 'bi:cheer', on: 'beat:bi:down', who: 'spoket', line: 'biKlonkCheer' },
  ],
  cameras: [
    // On the second ways the picture is wider and lower, so the next landing and the trail under him are in it.
    // Each begins higher than a hop along the trail rises there.
    { from: 60.4, to: 65.8, above: 6.6, zoom: 1.4, lift: -0.6 },
    { from: 150.3, to: 158.3, above: 5.9, zoom: 1.4, lift: -0.6 },
    // The road: wide and lifted, so the car, the spruces and the lit window behind the yard are in the picture.
    { from: -30, to: 22, zoom: 1.5, lift: 1.6, lead: 3.2 },
    { from: 22, to: 46, zoom: 1.35, lift: 1 },
    // Mormor, the planks and the door at their top in one picture.
    { from: 46, to: 56, zoom: 1.45, lift: 1.4, lead: 3.4 },
    { from: 56, to: 70, zoom: 1.25 },
    { from: 70, to: 99, zoom: 1.35 },
    // Down off the roof's end, the brook and its stones in sight ahead.
    { from: 99, to: 110, zoom: 1.4, lift: 0.6, lead: 3.2 },
    { from: 110, to: 123, zoom: 1.35, lift: 0.4 },
    // The seesaw, Klonk on its high end, the deep brook and the bank beyond in one picture.
    { from: 123, to: 138, zoom: 1.5, lift: 1, lead: 3.4 },
    { from: 138, to: 141, zoom: 1.4 },
    { from: 141, to: 162, zoom: 1.3, lift: 0.4 },
    // From lee to lee the next boulder is in the picture.
    { from: 162, to: 187, zoom: 1.35 },
    // Up on the brow the picture opens out over the forest towards the narrow far below. It looks little ahead: the
    // end of the world is well to the right, out of the picture.
    { from: 187, to: 210, zoom: 1.6, lift: 2.6, lead: 1 },
  ],
  candy: [
    // 1. along the road to the ditch
    ...row(2, 10, 0),
    { x: 12.2, y: 0.45 },
    { x: 13.8, y: 0.45 },
    // 2. over the ditch on morfar's ladder, once it lies there
    { x: 15.4, y: 0.45, after: 'bi:ladder' },
    { x: 17, y: 0.45, after: 'bi:ladder' },
    // 3. up the drive and over the lawn
    ...row(19.8, 37, 0, 1.9),
    // up the woodshed's stack, along its top, and off its end; 4. up the planks to the barn's door
    ...STACK.map((s) => ({ x: round(s.x + 0.7, 1), y: round(s.y + 0.45) })),
    { x: 43.4, y: round(STACK_TOP.y + 0.45) },
    offEdge(STACK_TOP.to, STACK_TOP.y, 0.5),
    offEdge(STACK_TOP.to, STACK_TOP.y, 1.1),
    { x: 46.4, y: 0.45 },
    ...slopeRow(48.4, 54.4, PLANKS.from, 0, PLANKS.to, LOFT),
    // through the loft: over the bale, over the hatch, and up the hay to the roof
    ...row(56.2, 58.2, LOFT),
    ...hopUp(BALE.from, BALE.y),
    { x: 61.6, y: round(LOFT + 0.45) },
    { x: 62.8, y: round(LOFT + 0.45) },
    hopCandy({ x: HATCH.from, y: LOFT }, { x: HATCH.to, y: LOFT }, 1.15),
    { x: 66, y: round(LOFT + 0.45) },
    ...hopUp(HAY[0]!.x, HAY[0]!.y),
    // the one up on the roof a little back from its big candy, not at its foot
    ...hopUp(HAY[1]!.x, HAY[1]!.y).map((c, i) => (i === 1 ? { ...c, x: round(c.x - 0.4, 1) } : c)),
    // along the roof, from lee to lee, down to its eaves, and off them to the ground behind the house
    ...row(72.4, 98.4, ROOF.y),
    ...slopeRow(100.4, 104.4, ROOF.to, ROOF.y, EAVES.from, EAVES.y),
    { x: 106, y: round(EAVES.y + 0.45) },
    offEdge(EAVES.to, EAVES.y, 0.5),
    offEdge(EAVES.to, EAVES.y, 1.1),
    { x: 108.9, y: 0.45 },
    // 5. over the brook on its stones
    ...across(BROOK_WAY),
    // along the bank to the seesaw's low end, along the fling over the deep brook, and on the bank beyond
    ...row(123.4, 127.4, 0),
    ...alongAll(FLING, [0.12, 0.25, 0.38, 0.5, 0.62, 0.75, 0.88]),
    { x: 141.8, y: round(TOP.y + 0.45) },
    // up the first boulder, over the crack, along the second, down, and up the big one
    ...hopUp(B1.from, B1.y),
    { x: 146.8, y: round(B1.y + 0.45) },
    hopCandy({ x: CRACK.from, y: B1.y }, { x: CRACK.to, y: B2.y }, 1.15),
    { x: 150.5, y: round(B2.y + 0.45) },
    { x: 152.3, y: round(B2.y + 0.45) },
    offEdge(B2.to, B2.y, 0.5),
    { x: 154.7, y: round(SLOPE + 0.45) },
    ...hopUp(B3.from, B3.low),
    ...hopUp(B3.mid, B3.high),
    offEdge(B3.to, B3.high, 0.5),
    offEdge(B3.to, B3.high, 1.1),
    // across the open slope, and up to the brow
    ...row(162.5, 186.5, SLOPE),
    ...slopeRow(188.2, 190.2, RISE.from, SLOPE, RISE.to, BROW.y),
    { x: 192, y: round(BROW.y + 0.45) },
    { x: 193.6, y: round(BROW.y + 0.45) },
  ],
  // Side candy: hearts and lollipops by turns, the first of each way a heart (its tell). None is taken by walking
  // under it, or by a hop along the trail. New ones are added at the end.
  side: [
    // Billaberget's shelves, where the hazel grows beside them (`HAZEL`): two on the first shelf, one in the arc of each
    // jump up, one on the second and two on the third.
    over(SHELVES[0]!, -0.4),
    over(SHELVES[0]!, 0.4),
    hopCandy({ x: round(SHELVES[0]!.x + 0.8), y: SHELVES[0]!.y }, { x: round(SHELVES[1]!.x - 0.8), y: SHELVES[1]!.y }, 0.9),
    over(SHELVES[1]!),
    hopCandy({ x: round(SHELVES[1]!.x + 0.8), y: SHELVES[1]!.y }, { x: round(SHELVES[2]!.x - 0.8), y: SHELVES[2]!.y }, 0.9),
    over(SHELVES[2]!, -0.3),
    over(SHELVES[2]!, 0.4),
    // The loft's beams: two on the first, one in the arc of the jump across, and two where he steps off the second
    // one's end and drops beyond the hatch. The second beam is the kolaknapp's and the peg's (../../collections.ts):
    // they lay in the loft's doorway, on the trail, with its big candy and two of its sweets.
    over(BEAMS[0]!, -0.4),
    over(BEAMS[0]!, 0.4),
    hopCandy({ x: round(BEAMS[0]!.x + 0.8), y: BEAMS[0]!.y }, { x: round(BEAMS[1]!.x - 0.8), y: BEAMS[1]!.y }, 0.9),
    { x: 65.55, y: 7.25 },
    { x: 65.6, y: 6.55 },
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): along the road to morfar at the ditch and mormor at
 * the barn, through the loft and along the roof, over the brook's stones, Klonk's seesaw over the deep brook,
 * Billaberget's boulders and gusts, to the brow and the two found on the stone. Morfar, mormor and Klonk guide where
 * their help is the next thing to do.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('bi:landed')) return ['billstaFound', 'billstaForest', 'heart'];
  if (has('beat:bi:there')) return ['billstaLook', 'billstaForest', 'water'];
  if (at > LEE[LEE.length - 1]! + 0.8) return ['billstaBrow', 'billstaForest', 'mountain'];
  if (at >= LEE[0]! - 1.5) return ['billstaWind', 'billstaForest', 'mountain'];
  if (at >= TOP.from + 0.3 && player.y >= TOP.y - 0.3) return ['billstaBoulders', 'billstaForest', 'mountain'];
  if (has('bi:fling')) return ['billstaFly', 'billstaKlonk', 'water', 'spoket'];
  if (has(PIVOT_PLACED)) return ['billstaShortEnd', 'billstaKlonk', 'water', 'spoket'];
  if (has('bi:think-more')) return ['billstaPush', 'billstaKlonk', 'water', 'spoket'];
  if (has('bi:klonk-on')) return ['billstaLever', 'billstaKlonk', 'water', 'spoket'];
  if (has('bi:call-klonk')) return ['billstaKlonkOn', 'billstaKlonk', 'water', 'spoket'];
  if (at >= BANK.from - 0.5) return ['billstaSeesaw', 'billstaKlonk', 'water', 'spoket'];
  if (at >= EAVES.to && player.y < EAVES.y) return ['billstaBrook', 'billstaForest', 'water'];
  if (at >= ROOF.from - 0.2 && (player.y > LOFT + 1.6 || at > ROOF.to)) return ['billstaRoof', 'billstaMormor'];
  // Called, she walks up the planks and opens the door while he watches; then the barn is open.
  if (has('bi:mormor') && !has(`placed:${DOOR.id}`)) return ['billstaOpens', 'billstaMormor', 'house', 'mormor'];
  if (has('bi:mormor')) return at < DOOR.stops[0]!.x ? ['billstaBarn', 'billstaMormor', 'house', 'mormor'] : ['billstaLoft', 'billstaMormor', 'house'];
  if (at >= STACK[0]!.x - 1.5) return ['billstaMormor', 'billstaMormor', 'house', 'mormor'];
  if (has('bi:ladder')) return at < DITCH.to + 0.4 ? ['billstaLadder', 'billstaMorfar', 'water', 'morfar'] : ['billstaYard', 'billstaBoth', 'house'];
  if (at >= MORFAR.x - 2.6) return ['billstaMorfar', 'billstaMorfar', 'water', 'morfar'];
  return ['billstaRoad', 'billstaFamily', 'house'];
};
