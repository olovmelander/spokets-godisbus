import type { Candy, ChapterData, Flyby } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, flightAt, jump, round, row, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 2: Stormskogen (docs/aventyr-2.md). Units: EL. The spruce forest at night, in the storm.
 * The old trägubbe's sweets lead in under the trees, and Klonk hops ahead all the way. The places, from the left:
 *
 * 1. **Skogsbrynet:** a root across the path, and the dark.
 * 2. **Kottregnet** (the exciting sequence): cones shaken loose from the swaying spruces fall in two groups,
 *    with a big candy between them. Each cone's shadow grows on the ground before it lands: read the way
 *    through from the ground, as under the birch in Äventyr 1. Past them, a flash of lightning shows the little
 *    one blown past, low enough to be in the picture on a phone held sideways.
 * 3. **Gungande grenar:** the trail goes down into a ravine and up its far side in two steps. Over it the
 *    wind sways three boughs to and fro, a moving way across for whoever climbs the trunk on the near rim:
 *    when two boughs swing close, hop over. Never needed, and a miss is a soft landing in the ravine.
 * 4. **Ugglan** (puzzle): a storm-blown twig is stuck in the owl's nest hole up in a spruce. The lace pulls
 *    it out by its red ring; it falls into the moss at the trunk's foot, and the owl is free.
 * 5. **Vindfällen:** fallen spruces: a trunk across the path, one leaning on another as a slope, a crack
 *    between two of them, and the widest gap of all. There the owl waits, and flies Elof over.
 * 6. **Pappas ficklampa** (puzzle, the Toy Story rule): a gap too wide to jump, and Klonk waits at its edge.
 *    Pappa peers at something tiny moving in his lamplight: "Är det du, Elof?" "Ropa på Pappa": he sees him at the edge, his
 *    beam falls on Klonk, who freezes stiff and topples across the gap like a plank (to Pappa, a toy that fell
 *    over); Elof, thinking, sees why. Elof walks over his friend. On the far side Pappa turns the beam to the path,
 *    and Klonk wakes beside Elof. Two held scenes, `ss:ljuset` and `ss:vaknar`: each line is read before the
 *    acting goes on.
 * 7. **Gamla trägubbens minne:** past a fallen trunk, a dark hollow under the roots. There Klonk shows the
 *    old one's thought, the crack on the mountain where it lay: "Gamla trägubben låg ensam i flera år."
 *    "Därför skyndar han. Lillgubben är ensam!" He stands at the hollow while it is said, the picture on the
 *    thought (`ss:minnet`): the answer to the night's question is not said on the run.
 * 8. **Lavskrikan:** the jay from Äventyr 1 shelters from the rain. A lingonberry for it, and it shows the
 *    beard lichen down a high root, the way up.
 * 9. **Backen:** from the root a gentle slope runs down towards the village, where every window is dark.
 *    A flash shows the old trägubbe far ahead, hurrying down.
 *
 * Over the trail lie three optional layers with side candy, each letting out forward onto it: the swaying
 * boughs over the ravine; a branch over the leaning spruce's top; and two boughs off the high root.
 * To the simulation the crack and the two gaps are pits; what fills them is drawn only.
 */

/** The hill down to the village: from the high root's end (184, 4) to the level at (200, 0). */
const hill = (x: number) => round(4 - (x - 184) * 0.25, 4);

/** Pappa's gap, Klonk across it, and where Elof stands when Klonk wakes on its far side. */
const GAP = { from: 134, to: 138, woke: 139.4, klonk: 141.5 };
/** Pappa with his lamp, behind the call sign: where Elof and the camera look up to his face. */
const PAPPA_FACE = { x: 131, y: 4.8, z: -0.9 };

/** Where the flash shows the little one: past the cone rain, on the open ground before the ravine. */
const FLASH_AT = 35.2;
/** The dark hollow under the roots, where Klonk shows the old one's thought. */
const HOLLOW = { x: 155.5, y: -1.2 };
/** Set when the picture has closed in on the hollow and its thought: the words about it wait for that. */
const SHOWN = 'ss:memory-shown';

/**
 * From the high root, the old one far down the hill (Olov, 12 November 2026: "Det kan se bättre ut när trägubben i slutet
 * av kapitlet syns"). A flash shows him where the hill opens below the boughs off the root, clear of them and of what
 * hangs on them, a little in front of the path so that its sweets do not cover him: pale wood in his own glow, and big
 * enough to be read across the picture. Elof stops and points; the old one stands while the line is read, the lightning
 * flashes again as he sets off, and he hurries on down towards the village, the picture going with him. He was a grey
 * figure walking under the boughs, behind their sweets, who vanished halfway down the open hill. Now the moment ends
 * while he is still on his way, and the picture goes back to Elof: he walks on out of it, down the hill.
 */
const OLD_DOWNHILL: Flyby = {
  on: 'ss:old-appears', from: { x: 190.8, y: hill(190.8) }, to: { x: 200, y: hill(200) }, seconds: 5.6, who: 'tragubbe', walk: true,
  z: 0.35, size: 1.8, lit: [0.15],
};

/** The owl's flight over the widest gap of the windthrow: from its near edge to well past its far one. */
const OWL = { from: { x: 109.6, y: 0 }, to: { x: 123, y: 0 }, rise: 4, time: 3 };

/** The swaying boughs: three in a row over the ravine, each a little way to and fro; neighbours swing opposite. */
const SWAY = 4.2;
const bough = (i: number, x: number) => ({
  id: `bough-${i}`, look: 'twig' as const, width: 1.6, height: 0.3, verb: 'push' as const, extra: true,
  // Out and back by 1 EL, dipping a little at the far end: the gap to the next opens and closes.
  cycle: { seconds: SWAY, phase: (i % 2) * SWAY / 2 },
  stops: [{ x, y: 1.5 }, { x: x + 1, y: 1.4 }],
});

/** Candy on a hop up a step: half an EL over the step's top, a little before and after it. */
const hopUp = (edge: number, high: number): Candy[] => [
  { x: round(edge - 0.2, 1), y: round(high + 0.25) },
  { x: round(edge + 1.2, 1), y: round(high + 0.45) },
];

export const stormskog: ChapterData = {
  id: 'stormskog',
  place: 'forest',
  spawn: { x: 1, y: 0.01 },
  scenes: [
    // Where and when, as the chapter opens (src/content/chapters/cards.ts).
    timeCard('stormskog', 1),
    // From the high root, the old one far down the hill (`OLD_DOWNHILL`): Elof and the old one in one picture, and then
    // the picture goes down the hill with him. The line waits for the flash's picture; the moment ends as he walks on.
    {
      id: 'ss:old-downhill', at: 182, seconds: 4.8, hold: true, dialogue: ['ss:see-old'],
      cues: [{ at: .8, flag: 'ss:old-appears' }], lines: [],
      stage: { shots: [{ at: 0, x: 186.8, y: 3.7, height: 7.2, width: 13, move: .6 },
        { at: 1, x: 193.4, y: 2.5, height: 7.2, width: 12.5, move: 3 }],
        elof: [
          { at: 0, act: 'look', aim: { x: OLD_DOWNHILL.from.x, y: OLD_DOWNHILL.from.y + 1, z: OLD_DOWNHILL.z } },
          { at: .8, act: 'point', aim: { x: OLD_DOWNHILL.from.x, y: OLD_DOWNHILL.from.y + 1, z: OLD_DOWNHILL.z } },
          { at: 1.4, act: 'look', aim: { ...flightAt(OLD_DOWNHILL, 0.6), y: flightAt(OLD_DOWNHILL, 0.6).y + 1 } },
        ] },
    },
    // The old one's memory (docs/aventyr-2.md, the question that pulls the night on, answered). At the hollow he
    // stands and looks: Klonk's picture of the crack on the mountain, and what it means, are read there with the
    // picture in view, not on the run a long way past it. The scene is only this: a closer look, and the three lines.
    // The first comes once the picture has closed in on the hollow (`SHOWN`); the scene's clock waits for the words,
    // so its last half second is the breath after them, before he sets off again.
    // A game taken up beyond the hollow without those words (`sets`, below) is told them here too, looking back
    // at the hollow; one that has read them never sees it again.
    {
      id: 'ss:minnet', on: 'ss:hollow', until: 'beat:ss:why', seconds: 1.4, hold: true, dialogue: ['ss:hollow', 'ss:alone', 'ss:why'],
      cues: [{ at: 0.9, flag: SHOWN }],
      stage: {
        // The picture hangs over the hollow: it sits in the middle of the frame, clear of the words above it on a
        // phone held sideways, with him and Klonk under it.
        shots: [{ at: 0, x: HOLLOW.x + 0.4, y: 1.7, height: 7.6, width: 10, move: 0.8 }],
        elof: [{ at: 0, act: 'look', aim: { x: HOLLOW.x, y: HOLLOW.y + 1.1, z: 0 } }],
      },
    },
    // Called, Pappa finds him at the edge with his lamp. Its light falls on Klonk, who is wood at once and lies across
    // the gap; to Pappa a toy has fallen over, and Elof, thinking, sees why. The picture takes in Pappa's face.
    {
      id: 'ss:ljuset', on: 'ss:beam', from: 129, before: GAP.from - 0.5, until: 'ss:frozen', seconds: 3.6, hold: true,
      cues: [{ at: 1.2, flag: 'ss:frozen' }],
      lines: [
        { at: 0.4, who: 'pappa', line: 'ssBeam' },
        { at: 1.8, who: 'pappa', line: 'ssFell' },
        { at: 2.8, who: 'elof', line: 'ssStiff' },
      ],
      stage: {
        shots: [{ at: 0, x: 133.6, y: 2.7, height: 7.6, width: 13, move: 0.6 }],
        elof: [
          { at: 0, act: 'look', aim: PAPPA_FACE },
          { at: 1.4, act: 'look', aim: { x: 136, y: 0.2, z: 0 } },
          { at: 2.8, act: 'look', aim: { x: 133.8, y: 0.3, z: 0 } },
        ],
      },
    },
    // Over on the far side: Pappa turns his lamp to the path, and in the dark Klonk is himself again, beside Elof.
    {
      id: 'ss:vaknar', at: GAP.woke, needs: 'ss:frozen', seconds: 2.9, hold: true,
      cues: [{ at: 0.9, flag: 'ss:woke' }],
      lines: [
        { at: 0.3, who: 'pappa', line: 'ssPappaAway' },
        { at: 1.3, who: 'spoket', line: 'ssAwake' },
        { at: 2.2, who: 'elof', line: 'ssThanks' },
      ],
      stage: {
        shots: [{ at: 0, x: 137.2, y: 2.4, height: 7.2, width: 12, move: 0.6 }],
        elof: [
          { at: 0, act: 'look', aim: PAPPA_FACE },
          { at: 1, act: 'look', aim: { x: GAP.klonk, y: 0.6, z: 0 } },
          { at: 2.2, act: 'wave', aim: { x: GAP.klonk, y: 0.6, z: 0 } },
        ],
      },
    },
  ],
  goalX: 205,
  coda: 'pappa',
  storm: { frozen: 'ss:frozen', wakes: 'ss:woke', drips: 'cone', rain: 0.75,
    lightning: 10,
    flybys: [
      // At the forest's edge: the little one, tumbling over the treetops ahead.
      { on: 'beat:ss:flash', from: { x: round(FLASH_AT - 6, 1), y: 2.3 }, to: { x: round(FLASH_AT + 17, 1), y: 3.3 }, rise: 0.7, seconds: 3, who: 'lillgubbe', lit: [1.3] },
      // From the high root: the old one, far down the hill, hurrying on towards the village (`OLD_DOWNHILL`).
      OLD_DOWNHILL,
    ],
  },
  ground: [
    { x: -3, y: 12 },
    { x: -3, y: 0 },
    // 1. the forest's edge: a root across the path
    { x: 8, y: 0 },
    { x: 10, y: 0.9 },
    { x: 12, y: 0 },
    // 2. the cone rain falls on level ground, 14 to 36
    // A storm-felled pole across the path, between the cones and the ravine, to hop over.
    { x: 39.4, y: 0 },
    { x: 39.4, y: 0.8 },
    { x: 44.4, y: 0.8 },
    { x: 44.4, y: 0 },
    // 3. the ravine: down its near bank, and up its far side in two steps
    { x: 46, y: 0 },
    { x: 49, y: -2 },
    { x: 56.2, y: -2 },
    { x: 56.2, y: -1 },
    { x: 58.6, y: -1 },
    { x: 58.6, y: 0 },
    // 4. the owl's spruce stands on level ground at 72
    // 5. the windthrow: a trunk across the path, a leaning one, a crack, and the widest gap
    { x: 84, y: 0 },
    { x: 84, y: 0.9 },
    { x: 88, y: 0.9 },
    { x: 88, y: 0 },
    { x: 92, y: 0 },
    { x: 97, y: 2.2 },
    { x: 99, y: 2.2 },
    { x: 99, y: 0 },
    { x: 103, y: 0 },
    { x: 103, y: -5 },
    { x: 104.6, y: -5 },
    { x: 104.6, y: 0 },
    { x: 111, y: 0 },
    { x: 111, y: -6 },
    { x: 121.5, y: -6 },
    { x: 121.5, y: 0 },
    // 6. Pappa's gap: four EL, twice a running jump
    { x: 134, y: 0 },
    { x: 134, y: -6 },
    { x: 138, y: -6 },
    { x: 138, y: 0 },
    // 7. a fallen trunk, and the dark hollow under the roots
    { x: 145.5, y: 0 },
    { x: 145.5, y: 0.8 },
    { x: 149.5, y: 0.8 },
    { x: 149.5, y: 0 },
    { x: 152, y: 0 },
    { x: 154, y: -1.2 },
    { x: 157, y: -1.2 },
    { x: 159, y: 0 },
    // 8. the high root with the beard lichen
    { x: 178, y: 0 },
    { x: 178, y: 4 },
    // 9. the hill down towards the village
    { x: 184, y: 4 },
    { x: 200, y: 0 },
    { x: 212, y: 0 },
    { x: 212, y: 12 },
  ],
  // What two of the blocks above are, for the picture only: fallen spruces across the path.
  treeGaps: [{ from: 69, to: 76, back: -8 }, { from: 182, to: 196, back: -8 }],
  landmarks: [
    { look: 'log', from: 39.4, to: 44.4, base: 0 },
    { look: 'log', from: 84, to: 88, base: 0 },
    { look: 'log', from: 145.5, to: 149.5, base: 0 },
  ],
  checkpoints: [
    { x: 15, y: 0 },
    // between the two groups of falling cones
    { x: 25.2, y: 0 },
    { x: 37, y: 0 },
    { x: 61, y: 0 },
    { x: 80, y: 0 },
    { x: 106.2, y: 0 },
    { x: 124.2, y: 0 },
    // after Klonk has woken and been thanked, before the fallen trunk
    { x: 143.6, y: 0 },
    { x: 163, y: 0 },
    { x: 181, y: 4 },
    { x: 196, y: hill(196) },
  ],
  // The cones: two groups of three, the same rhythm as the dew under the birch in Äventyr 1 (garden.ts).
  drips: [
    { at: { x: 18, y: 0 }, every: 1.8, first: 0.2 },
    { at: { x: 20.2, y: 0 }, every: 2.2, first: 1.1 },
    { at: { x: 22.4, y: 0 }, every: 1.6, first: 0.7 },
    { at: { x: 28, y: 0 }, every: 2, first: 0.4 },
    { at: { x: 30.2, y: 0 }, every: 1.5, first: 1.2 },
    { at: { x: 32.2, y: 0 }, every: 2.4, first: 0.9 },
  ],
  movers: [
    // The swaying boughs (never needed). Each is 1.6 wide and sways 1 EL: between neighbours the gap breathes
    // from 0.4 to 2.4 EL, and when one pair is close the next is far. Their undersides stay more than an EL
    // over every head in the ravine below, so nothing on the trail touches them.
    bough(0, 47.7),
    bough(1, 50.7),
    bough(2, 53.7),
    // The twig in the owl's nest hole, 2.7 over the path: out of every jump's reach, its red ring in the lace's
    // from about three EL before the trunk. Pulled, it drops into the moss at the trunk's foot, low enough to
    // walk over (as the twig on the ants' road in Äventyr 1).
    { id: 'owl-twig', look: 'owl-twig', width: 1.8, height: 0.5, verb: 'pull', seconds: 2.4, wait: .5, ring: { x: -0.7, y: 0.3, z: 1 }, stops: [{ x: 72.2, y: 3.9 }, { x: 71.5, y: -0.25 }] },
  ],
  // Ledges: the optional layers. Up a trunk each is one held jump over the last, 0.9 at most.
  ledges: [
    // The boughs over the ravine: a plate of bark on the near rim's trunk, and a branch level with the boughs.
    { x: 43.4, y: 0.9, width: 1.2, look: 'bark' },
    { x: 45.2, y: 1.75, width: 2, look: 'branch' },
    // Where the last bough swings near: a branch over the far side's steps. From its end it is a soft drop
    // onto the far rim.
    { x: 57, y: 1.8, width: 2.4, look: 'branch' },
    // A branch over the leaning spruce's top: a hop up from it, and down again before the crack.
    { x: 100.6, y: 2.9, width: 2.4, look: 'branch' },
    // Pappa's beam freezes Klonk, who topples across the gap: as wide as the gap and a little more, level
    // with both rims. Drawn as Klonk, stiff as a plank.
    { x: 136, y: 0, width: 4.4, look: 'plank', needs: 'ss:frozen' },
    // Two boughs off the high root, over the hill: a running jump up from the root's end, and a step down
    // that begins under the first one's end, so that walking off it lands on the second.
    { x: 186.6, y: 4.8, width: 2.4, look: 'branch' },
    { x: 188.9, y: 4, width: 2.6, look: 'branch' },
  ],
  spots: [
    // The dark hollow under the roots: coming close is enough. Klonk shows the old one's thought there.
    { id: 'ss:hollow', at: HOLLOW, verb: 'take', touch: true },
    // The owl, once free, waits at the widest gap: Använd and it carries him over.
    { id: 'owl', at: OWL.from, verb: 'take', word: 'ssFlyOwl', needs: 'placed:owl-twig', ride: 'owl' },
    // Pappa's flashlight: calling him is the whole puzzle. His beam finds Klonk at the edge.
    { id: 'ss:beam', look: 'sign', at: { x: 131, y: 0 }, verb: 'call', word: 'callPappa' },
    // The jay from Äventyr 1, as in Granskogen: a lingonberry first, then the gift.
    { id: 'berry', look: 'berry', at: { x: 167.5, y: 0 }, verb: 'take', word: 'pick' },
    { id: 'jay', look: 'jay', at: { x: 172.5, y: 0 }, verb: 'give', word: 'giveJay', needs: 'berry' },
  ],
  decor: [
    // The owl in its hole, behind the twig, until it is free...
    { look: 'owl', at: { x: 72.6, y: 2.8 }, z: -.1, until: 'placed:owl-twig' },
    // ...and at the widest gap's edge, waiting for him, until it flies.
    { look: 'owl', at: { x: 110.3, y: 0 }, after: 'placed:owl-twig', until: 'owl' },
  ],
  // The crack on the mountain, left at the hollow once Klonk has shown it.
  thoughtClues: [{ at: { x: 155.5, y: -0.6 }, picture: 'pine-crack', after: 'ss:hollow' }],
  climbs: [
    // The beard lichen down the high root: the jay shows it once it is his friend.
    { x: 177.7, bottom: 0, top: 4, exit: 1, needs: 'jay', look: 'lichen' },
  ],
  rides: [{ id: 'owl', look: 'owl', ...OWL }],
  // The memory also reaches a child who passes the hollow or resumes beyond it without its receipt:
  // keep its picture and unlock the explanation, just as touching the hollow does on the walking route.
  // Klonk is awake in a game taken up beyond the gap, as in one that saw him wake.
  sets: [{ flag: 'ss:hollow', when: ['beat:ss:hollow'] }, { flag: 'ss:woke', when: ['scene:ss:vaknar'] }],
  jumps: [
    // Up the ravine's far side, step by step.
    jump({ x: 39.1, y: 0 }, { x: 40, y: 0.8 }),
    jump({ x: 55.9, y: -2 }, { x: 56.9, y: -1 }),
    jump({ x: 58.3, y: -1 }, { x: 59.3, y: 0 }),
    // Onto the trunk across the path, over the crack, and onto the trunk before the hollow.
    jump({ x: 83.8, y: 0 }, { x: 84.8, y: 0.9 }),
    jump({ x: 102.8, y: 0 }, { x: 104.9, y: 0 }),
    jump({ x: 145.3, y: 0 }, { x: 146.3, y: 0.8 }),
  ],
  ghost: [
    { at: { x: 6, y: 0 } },
    { at: { x: 10, y: 0.9 } },
    { at: { x: 16, y: 0 } },
    // through the cone rain, where nothing falls on a ghost
    { at: { x: 21, y: 0 } },
    { at: { x: 26.5, y: 0 } },
    { at: { x: 31.2, y: 0 } },
    { at: { x: 36, y: 0 } },
    { at: { x: 40, y: 0.8 } },
    { at: { x: 42, y: 0.8 } },
    { at: { x: 52.5, y: -2 } },
    { at: { x: 60.5, y: 0 } },
    { at: { x: 66, y: 0 } },
    { at: { x: 74.5, y: 0 } },
    { at: { x: 80.5, y: 0 } },
    { at: { x: 86.5, y: 0.9 } },
    { at: { x: 98, y: 2.2 } },
    { at: { x: 106.5, y: 0 } },
    // over the widest gap ahead of the owl: a ghost hops where a boy has to fly
    { at: { x: 124.5, y: 0 } },
    { at: { x: 128.5, y: 0 } },
    // At the edge of Pappa's gap it stands and waits for the beam, which turns it into the bridge.
    { at: { x: 133.6, y: 0 }, until: 'ss:frozen', still: true },
    // It wakes on the far side, beside him, once Pappa looks away, and stands there until he has thanked it.
    { at: { x: GAP.klonk, y: 0 }, until: 'scene:ss:vaknar', still: true },
    { at: { x: 147.5, y: 0.8 } },
    // In the dark hollow it waits, showing the old one's thought, until he has come to see.
    { at: { x: 155.5, y: -1.2 }, until: 'ss:hollow', thought: { picture: 'pine-crack' } },
    { at: { x: 161, y: 0 }, thought: { picture: 'pine-crack', after: 'ss:hollow' } },
    { at: { x: 167, y: 0 } },
    { at: { x: 174, y: 0 } },
    { at: { x: 181, y: 4 } },
    { at: { x: 188, y: hill(188) } },
    { at: { x: 195, y: hill(195) } },
    { at: { x: 203, y: 0 } },
    { at: { x: 209, y: 0 } },
  ],
  beats: [
    // Which lines are the story's and which are passing remarks (`aside`): docs/dialogue.md.
    // 1. the forest's edge: a few words, so that the cones' own are said before the first cone falls
    { id: 'ss:dark', at: 1.4, who: 'elof', line: 'ssDark' },
    { id: 'ss:klonk', on: 'beat:ss:dark', who: 'spoket', line: 'ssKlonk', aside: true },
    // 2. the cone rain
    { id: 'ss:cones', at: 14.6, within: [14.6, 34], who: 'elof', line: 'ssCones', read: true },
    // Past the cones, where there is room to look up: the flash, and the little one blown over the ravine ahead.
    { id: 'ss:flash', at: FLASH_AT, who: 'elof', line: 'ssFlash' },
    // 3. the boughs
    // 4. the owl
    { id: 'ss:owl', at: 64.5, until: 'placed:owl-twig', who: 'elof', line: 'ssOwlStuck', read: true },
    { id: 'ss:owl-free', on: 'placed:owl-twig', who: 'elof', line: 'ssOwlFree' },
    // 5. the windthrow, and the flight: what he says on the owl's back is said there or not at all
    { id: 'ss:windthrow', at: 81, who: 'elof', line: 'ssWindthrow', aside: true },
    { id: 'ss:owl-waits', at: 107.5, until: 'owl', needs: 'placed:owl-twig', who: 'elof', line: 'ssOwlWaits', read: true },
    { id: 'ss:owl-fly', on: 'owl', within: [OWL.from.x, OWL.to.x], who: 'elof', line: 'ssOwlFly', aside: 12 },
    // 6. Pappa's flashlight: the gap is too wide to jump, seen as he lands from the owl; Pappa, searching, sees
    // something tiny in his light and asks if it is him. The rest is in its two scenes, and a whisper to the friend
    // he is about to walk on, said as he steps out so that it is read by the far side.
    { id: 'ss:wide', at: 124.6, until: 'ss:beam', who: 'elof', line: 'ssTooWide', aside: true },
    { id: 'ss:pappa', at: 129.8, until: 'ss:beam', who: 'pappa', line: 'ssPappaHere', read: true },
    { id: 'ss:tiptoe', at: 131.6, needs: 'ss:frozen', who: 'elof', line: 'ssTiptoe' },
    // 7. the old one's memory: the heart of the chapter, read slowly. He asks from the fallen trunk; Klonk's answer
    // and what the picture means are told at the hollow, with it in the picture (`ss:minnet`); and the resolve is
    // said as he climbs out of it and sets off again.
    { id: 'ss:hollow-seen', at: 149.2, who: 'elof', line: 'ssHollowSeen' },
    { id: 'ss:hollow', at: 159, on: 'ss:hollow', needs: SHOWN, who: 'spoket', line: 'ssHollowKlonk' },
    { id: 'ss:alone', on: 'ss:hollow', needs: SHOWN, who: 'elof', line: 'ssAlone', read: true },
    { id: 'ss:why', on: 'ss:hollow', needs: SHOWN, who: 'elof', line: 'ssWhy', read: true },
    { id: 'ss:both', at: 157.2, needs: 'beat:ss:why', who: 'elof', line: 'ssBoth' },
    // 8. the jay
    { id: 'ss:jay', at: 165, until: 'jay', who: 'elof', line: 'ssJaySeen', aside: true },
    { id: 'ss:jay-glad', on: 'jay', who: 'elof', line: 'ssJayGlad' },
    // 9. the hill down to the dark village
    { id: 'ss:see-old', on: 'ss:old-appears', who: 'elof', line: 'ssSeeOld', read: true },
    { id: 'ss:village', at: 190, who: 'elof', line: 'ssVillage', aside: true },
    { id: 'ss:onward', on: 'beat:ss:village', who: 'spoket', line: 'ssOnward', aside: true },
  ],
  cameras: [
    // On the optional layers the picture is wider and looks down a little, at the ground he will come down on.
    // Each begins higher than a jump from the trail reaches.
    { from: 42, to: 59.5, above: 1.3, zoom: 1.4, lift: -0.8 },
    { from: 99, to: 102.5, above: 2.6, zoom: 1.3, lift: -0.6 },
    { from: 184.5, to: 192, above: 4.6, zoom: 1.35, lift: -0.8 },
    // The cone rain: the shadows on the ground and the boughs they fall from.
    { from: 14, to: 36, zoom: 1.25, lead: 3.2 },
    { from: 40, to: 62, zoom: 1.3, lift: 0.3 },
    // Fit the entire owl and its crossbar above Elof, including on a phone held sideways.
    { from: 63, to: 77, zoom: 1.55, lift: 1.3 },
    // The flight, and the far rim it lands on.
    { from: 105, to: 126, zoom: 1.5, lift: 0.9, lead: 3.4 },
    { from: 125, to: 143, zoom: 1.35, lift: 0.4 },
    { from: 150, to: 161, zoom: 1.15, lift: -0.2 },
    { from: 164, to: 184.5, zoom: 1.25, lift: 0.3 },
    // From the high root the hill and the dark village below.
    { from: 184.5, to: 210, zoom: 1.45, lift: 0.4, lead: 3.5 },
  ],
  candy: [
    // 1. the forest's edge, over the root
    ...row(2.6, 6.6, 0),
    { x: 8.6, y: 0.72 },
    { x: 10, y: 1.35 },
    { x: 11.4, y: 0.72 },
    { x: 13.4, y: 0.45 },
    // 2. the cone rain: between the cones, never under one
    ...[16.6, 19.1, 21.3, 23.5, 26.6, 29.1, 31.2, 33.4].map((x) => ({ x, y: 0.45 })),
    // 3. to the ravine, down its bank, along its floor and up its far side
    ...row(35.5, 37.5, 0),
    { x: 40.2, y: 1.25 },
    ...row(41.5, 45.5, 0).map(c => c.x < 44.4 ? { ...c, y: 1.25 } : c),
    ...slopeRow(46.8, 48.8, 46, 0, 49, -2),
    ...row(50.6, 54.6, -2),
    ...hopUp(56.2, -1),
    ...hopUp(58.6, 0),
    // 4. the owl's spruce, and over the twig once it lies in the moss
    ...row(61.6, 69.6, 0),
    { x: 71.5, y: 0.75 },
    ...row(73.5, 81.5, 0),
    // 5. the windthrow: onto the trunk and off it, up the leaning one, over the crack
    { x: 83.3, y: 0.95 },
    { x: 84.8, y: 1.35 },
    { x: 86.6, y: 1.35 },
    { x: 88.4, y: 0.75 },
    { x: 90.2, y: 0.45 },
    ...slopeRow(92.4, 96.4, 92, 0, 97, 2.2),
    { x: 98, y: 2.65 },
    { x: 99.6, y: 1.6 },
    { x: 101, y: 0.6 },
    { x: 102.4, y: 0.9 },
    { x: 103.8, y: 1.5 },
    { x: 105.2, y: 0.9 },
    { x: 107.2, y: 0.45 },
    { x: 108.8, y: 0.45 },
    // across the widest gap with the owl
    ...alongAll(OWL, [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94]),
    // 6. to Pappa's gap, and over Klonk once he lies across it: in the near half, where a walk and a run
    // both take them before the far rim invites a jump
    ...row(125.4, 133.4, 0),
    { x: 134.8, y: 0.45, after: 'ss:frozen' },
    { x: 136, y: 0.45, after: 'ss:frozen' },
    ...row(138.6, 144.6, 0),
    // 7. over the fallen trunk, and down through the hollow
    { x: 145.9, y: 1.25 },
    { x: 147.5, y: 1.25 },
    { x: 149.1, y: 1.25 },
    { x: 150.6, y: 0.6 },
    { x: 152.6, y: 0.09 },
    { x: 154.4, y: -0.75 },
    { x: 156.2, y: -0.75 },
    { x: 158.4, y: 0.09 },
    // 8. to the jay, and up the beard lichen
    ...row(160.2, 176.2, 0),
    { x: 177.7, y: 1.5 },
    { x: 177.7, y: 3 },
    { x: 178.6, y: 4.45 },
    ...row(180.4, 182.4, 4),
    // 9. down the hill
    ...slopeRow(184.4, 198.4, 184, 4, 200, 0),
    ...row(200.4, 204.4, 0),
  ],
  // Side candy: hearts and lollipops on the optional layers. The first of each way is a heart, its tell.
  // New ones are added at the end.
  side: [
    // The boughs: up the bark and the branch, one over each bough's middle, and two on the far branch.
    { x: 43.4, y: 1.45 },
    { x: 44.8, y: 2.3 },
    { x: 45.7, y: 2.3 },
    { x: 48.2, y: 2.3 },
    { x: 51.2, y: 2.3 },
    { x: 54.2, y: 2.3 },
    { x: 56.4, y: 2.35 },
    { x: 57.6, y: 2.35 },
    // The branch over the leaning spruce.
    { x: 99.9, y: 3.45 },
    { x: 100.7, y: 3.45 },
    { x: 101.5, y: 3.45 },
    // The two boughs off the high root.
    { x: 185.9, y: 5.35 },
    { x: 186.7, y: 5.35 },
    { x: 187.5, y: 5.35 },
    { x: 188.6, y: 4.55 },
    { x: 189.7, y: 4.55 },
  ],
};

/** What "Just nu" says here: what he is doing, what has happened, and who is helping. */
export const context: Chooser = (has, at) => {
  if (at.x >= 184 || (at.x >= 177.5 && at.y >= 3.5)) return ['ssDown', 'ssLamps', 'village'];
  if (has('jay')) return ['ssLichen', 'ssJay', 'heart'];
  if (at.x >= 162) return ['ssJay', 'ssJay', 'heart'];
  if (has('ss:hollow')) return ['ssMemory', 'ssLamps', 'mountain'];
  if (has('ss:frozen')) return has('ss:woke') ? ['ssFollow', 'ssLamps'] : ['ssPlank', 'ssPappa', 'heart', 'pappa'];
  if (at.x >= 123) return ['ssPappa', 'ssPappa', 'trail', 'pappa'];
  if (has('owl')) return ['ssOwlRide', 'ssOwl', 'sparkle'];
  if (has('placed:owl-twig')) return at.x >= 104.6 ? ['ssOwlBoard', 'ssOwl', 'sparkle'] : ['ssWindthrow', 'ssOwl'];
  if (at.x >= 62) return ['ssOwl', 'ssLamps', 'heart'];
  if (at.x >= 38) return ['ssBoughs', 'ssLamps'];
  if (at.x >= 14) return ['ssCones', 'ssLamps'];
  return ['ssForest', 'ssLamps'];
};
