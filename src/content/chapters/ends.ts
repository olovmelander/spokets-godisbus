import type { Candy, ChapterData } from '../../sim/types';
import { HOME_BATHROOM, HOME_LAYOUT } from '../home-layout';
import { timeCard } from './cards';
import { PROLOG_SCENES } from './prolog-scenes';
import { HOME_LAYOUT } from '../home-layout';

/**
 * The story's two ends (plan §3.4): the prologue before Kapitel 1, and the epilogue after the final. Both
 * are played at home, and in both every step is something Elof does with Använd.
 *
 * Elof begins at normal size. His family stays in a shared shot while the star makes him small;
 * the same identifiable bag links the kitchen, chase and return. Final likeness/acting art is separate.
 */

/** A row of candy over ground at one height, one every `every` EL. */
function row(from: number, to: number, ground: number, every = 2, after?: string): Candy[] {
  const out: Candy[] = [];
  for (let x = from; x <= to + 1e-6; x += every) out.push({ x: Math.round(x * 10) / 10, y: ground + 0.45, ...(after ? { after } : {}) });
  return out;
}

/**
 * Prolog: Lördagsmorgon (docs/narrative-audit.md, "the intro").
 * 1. **The morning** (a scene): Pappa carves the ghost at the kitchen table while the family is round him; he
 *    sets it down before Elof and holds out the brush.
 * 2. **Måla ögonen!** (P0): he paints the new ghost's eyes, one and then the other.
 * 3. **It wakes** (a scene): the jay at the window turns every grown-up's head; the ghost blinks, looks at the
 *    empty place on the shelf and at the bag, takes the bag, and its magic makes two sweets in it glitter.
 * 4. **The chase**, with Mamma's freeze joke at the doorway, whose hinge tears the bag: the candy trail.
 * 5. **The star** on the deck: look, choose *Smaka på stjärnan*, eat, and POFF: he is as small as the ghost.
 * 6. **The family** (scenes): they kneel round him; he steps onto Pappa's hand; Moa's drawing says what the
 *    star did and what the gold sweet could do; Pappa's freeze joke at the railing; their promises as he
 *    walks to the deck's edge, and the game's title over the garden.
 *
 * The family are rehearsal figures that act (src/render/stage.ts); their models from Blender take their
 * places where the private pack has them. The table and chairs are plain stand-ins: the house is Olov's.
 */
export const prolog: ChapterData = {
  id: 'prolog',
  ghostMeet: true,
  place: 'home',
  // He is a boy among small things, until the star shrinks him. The POFF scene says when he is drawn small.
  size: { scale: 3, until: 'scene:poff' },
  // Pappa's shelf, with the first place in the row empty: the first trägubbe is not there.
  shelf: HOME_LAYOUT.shelf,
  decor: [
    // The shavings Pappa's knife left, and the Saturday bag on the table, until the ghost takes it.
    { look: 'shavings', at: { x: HOME_LAYOUT.dining.x + 0.1, y: 0 } },
    { look: 'bag', at: { x: HOME_LAYOUT.dining.x + 1.6, y: 1.65 }, until: 'grab', z: -1.25 },
  ],
  furniture: [
    { look: 'table', at: { x: HOME_LAYOUT.dining.x, y: 0 }, z: HOME_LAYOUT.dining.z },
    ...Object.values(HOME_LAYOUT.dining.chairs).map(chair => ({
      look: 'chair' as const, at: { x: chair.x, y: 0 }, z: chair.z, face: chair.face,
    })),
  ],
  scenes: PROLOG_SCENES,
  // Pappa's line after his freeze joke has its own moment: Elof sees the ghost slip away.
  later: [{ flag: 'snuck', after: 'pappa:noticed', seconds: 4.1 }],
  // In reach of the brush Pappa holds out, so the morning ends with "Måla ögonen!" lit on Använd: the first thing
  // asked of him has its button ready (docs/ux-audit/first-minutes.md row 19). The move lesson waits for the hall.
  spawn: { x: HOME_LAYOUT.dining.x - 2.9, y: 0.01 },
  goalX: 51.0,
  goalNeeds: 'titel',
  prologue: {
    // Pappa notices the ghost once Moa's drawing is told, as Elof sets off towards it.
    doorway: { x: HOME_LAYOUT.dining.x + 6.5, y: 0 }, railing: { x: 46.6, y: 1.9 }, edge: { x: 52.6, y: -0.8 }, pappaAfter: 'scene:handen', pappaFrom: 41.5,
    // The deck's railing runs along its far side: Pappa puts the frozen ghost up on its top rail.
    rail: { from: 38.4, to: 53.8, z: -3.4 },
  },
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // the kitchen and the hall, and the door sill to the veranda
    { x: 30, y: 0 },
    { x: 30, y: 0.5 },
    { x: 31.2, y: 0.5 },
    { x: 31.2, y: 0 },
    // the veranda, and the step down to the deck, out of doors
    { x: 38, y: 0 },
    { x: 38, y: -0.8 },
    // the deck, and its edge: the garden's lawn lies far below it
    { x: 54, y: -0.8 },
    { x: 54, y: -7 },
    { x: 96, y: -7 },
    { x: 96, y: 10 },
  ],
  // The floors and the deck are boards; the garden below the deck's edge is lawn (picture and footsteps only).
  surfaces: [{ from: -19, to: 54, kind: 'wood' }],
  house: { from: -40, to: 38, windows: HOME_LAYOUT.windows },
  outdoors: 38,
  // The big candies keep their meaning in older saves: in the kitchen at the start (behind him, out of the
  // morning's pictures), at the end of the hall, and on the deck after the shrinking.
  checkpoints: [{ x: HOME_LAYOUT.dining.x - 4.9, y: 0 }, { x: 26, y: 0 }, { x: 45.5, y: -0.8 }],
  spots: [
    // Two eyes: a brush stroke for each; Pappa finishes a short stroke.
    { id: 'eye', at: { x: HOME_LAYOUT.dining.x - 1.8, y: 0 }, verb: 'give', word: 'paintGhost', story: 'paint' },
    { id: 'paint', at: { x: HOME_LAYOUT.dining.x - 1.8, y: 0 }, verb: 'give', word: 'paintGhost', needs: 'eye', story: 'paint' },
    // He first sees where the star came from, then chooses to taste it. Walking past never consumes it.
    { id: 'star', look: 'star', at: { x: 41.7, y: -0.8 }, verb: 'take', word: 'tasteStar', needs: 'scene:stjarnan' },
    // Pappa's open hand on the planks: he chooses to step onto it.
    { id: 'hand', at: { x: 40.9, y: -0.8 }, verb: 'take', word: 'climbOn', needs: 'scene:familj' },
  ],
  jumps: [
    { at: { x: 29.8, y: 0 }, dir: 1, land: { x: 30.6, y: 0.5 } },
  ],
  ghost: [
    // On the table, new, with no eyes yet. Awake, it hops to the bag, and with the bag off the table.
    { at: { x: HOME_LAYOUT.dining.x - 0.9, y: 1.65 }, z: -1.15, until: 'woke' },
    { at: { x: HOME_LAYOUT.dining.x + 1, y: 1.65 }, z: -1.2, until: 'blink', near: 99 },
    { at: { x: 24.5, y: 0 } },
    { at: { x: 26.5, y: 0 } },
    { at: { x: 28.6, y: 0 } },
    { at: { x: 35, y: 0 } },
    // On the deck, beyond the star it lost: it waits there until Pappa's joke.
    { at: { x: 44.4, y: -0.8 }, until: 'pappa:done', near: 0 },
    // At the deck's edge, where it hid behind his back; then down into the garden, as the title comes.
    { at: { x: 52.6, y: -0.8 }, until: 'leap', near: 99 },
    { at: { x: 57.5, y: -7 }, near: 0 },
  ],
  beats: [
    { id: 'dropped', on: 'mamma:noticed', who: 'mamma', line: 'dropped' },
    { id: 'onlyWood', on: 'pappa:noticed', who: 'pappa', line: 'onlyWood', read: true },
    { id: 'snuck', on: 'snuck', who: 'elof', line: 'snuck' },
    // Their promises, one from each as he passes them on the deck.
    { id: 'nearYou', at: 45.0, needs: 'pappa:done', who: 'mamma', line: 'nearYou', read: true },
    { id: 'mapForYou', at: 47.0, needs: 'pappa:done', who: 'moa', line: 'mapForYou', read: true },
    { id: 'heja', at: 48.8, needs: 'pappa:done', who: 'bertil', line: 'heja', read: true },
    { id: 'followTrail', at: 50.8, needs: 'pappa:done', who: 'pappa', line: 'followTrail', read: true },
  ],
  // Indoors the picture is wide while he is big; on the deck it frames him small among the kneeling family.
  cameras: [{ from: -3, to: 38, zoom: 1.5, lift: 0.3 }, { from: 38, to: 60, zoom: 1.7, lift: 1.5 }],
  candy: [
    // Nothing lies there until the bag has torn on the doorway's hinge.
    // Keep all eleven original save indices, in order, along the shorter hall after the new hinge.
    ...row(21.5, 29, 0, 0.75, 'bag:torn'),
    { x: 30.6, y: 1.25, after: 'bag:torn' },
    ...row(32.4, 36.4, 0, 2, 'bag:torn'),
    { x: 38.6, y: -0.2, after: 'bag:torn' },
    { x: 39.8, y: -0.35, after: 'bag:torn' },
  ],
};

/** Who gets candy at the party, where each sits, and the word on the button. */
const GUESTS = [
  { id: 'mamma', x: 7, word: 'giveMamma' },
  { id: 'pappa', x: 11, word: 'givePappa' },
  { id: 'moa', x: 15, word: 'giveMoa' },
  { id: 'bertil', x: 19, word: 'giveBertil' },
] as const;

/** The party table's top (`furniture`, below, and the room's table in ../../render/stage.ts): its two ends and middle. */
const TABLE_HOP = { left: HOME_LAYOUT.dining.x - 2, middle: HOME_LAYOUT.dining.x,
  right: HOME_LAYOUT.dining.x + 2, top: 1.68, z: HOME_LAYOUT.dining.z };

/**
 * Epilog: Godiskalaset, on the glazed veranda at nine in the evening.
 * 1. **Elof hands out candy** (P18): he chooses a candy and then Mamma, Pappa, Moa, Bertil or the ghost.
 * 2. **The naming.** The ghost hops across the table: klonk, klonk. "Du ska heta Klonk!"
 * 3. **Elofs första trägubbe** (P19): *Ta kniven*, three outward strokes traced with Pappa, and two painted eyes.
 *    Pappa: "Alltid bort från kroppen." Elof: "Titta, Pappa! Min egen Lillgubbe!"
 * 4. **Teeth:** he walks through the bathroom door and brushes at the basin before the last card.
 *
 * And **Hittegods** (O2): what he found under the deck in Kapitel 1 lies on the table beside its owner, and
 * the one who gets candy from him sees it: "Mitt hårspänne!"
 *
 * Approved likenesses and hand/acting poses remain art work. The album leads to the last windowsill shot;
 * the existing ending then offers free exploration.
 */
export const epilog: ChapterData = {
  id: 'epilog',
  ghostMeet: true,
  place: 'home',
  // He has grown back: a boy among small things, all through.
  size: { scale: 3 },
  // The first trägubbe has its place again, first in the row.
  shelf: { ...HOME_LAYOUT.shelf, filled: true },
  // The party's table, behind the family where they stand to be given their candy.
  furniture: [
    { look: 'table', at: { x: HOME_LAYOUT.dining.x, y: 0 }, z: HOME_LAYOUT.dining.z, cloth: '#f1ead8' },
    ...Object.values(HOME_LAYOUT.dining.chairs).map(chair => ({ look: 'chair' as const, at: { x: chair.x, y: 0 }, z: chair.z, face: chair.face })),
  ],
  epilogue: { window: { x: 9.4, y: 3.43, z: -8.3 } },
  spawn: { x: 1, y: 0.01 },
  scenes: [
    // Where and when, as the evening opens (./cards.ts).
    timeCard('epilog', 1),
    // The naming: given its candy, the ghost hops up onto the party table and across it, klonk, klonk, and down again
    // to where it waits for the carving. He is free all the while.
    { id: 'klonk-table', on: 'partied', until: 'knife', seconds: 7.2, stage: { actors: { ghost: [
      { at: 0, x: 23.4, y: 0, z: 0, move: 0.01, act: 'hop' },
      // Up over the front edge, clear of the chair at the end; both landings happen above the tabletop.
      { at: .05, x: TABLE_HOP.right + .8, y: TABLE_HOP.top + .42, z: 1.65, move: 1.15 },
      { at: 1.2, x: TABLE_HOP.right, y: TABLE_HOP.top, z: TABLE_HOP.z, move: .6 },
      { at: 1.85, x: TABLE_HOP.middle, move: .8 },
      { at: 2.7, x: TABLE_HOP.left, move: .8 },
      // First clear the cloth, then land and run along the open floor in front of the family.
      { at: 3.55, y: TABLE_HOP.top + .37, z: 1.65, move: .65 },
      { at: 4.25, y: 0, move: .45 },
      { at: 4.75, x: 26.6, move: 1.8, act: 'run' },
      { at: 6.55, z: 0, move: .4 },
      { at: 6.95, act: 'tilt' },
    ] } } },
    // The panel closes onto the actual finished carving, supported in his open hand.
    { id: 'first-carving', on: 'dots', until: 'teeth', resumeAt: { x: 32, y: 0 }, seconds: 6, hold: true,
      lines: [{ at: .9, who: 'elof', line: 'carved' }, { at: 3.3, who: 'pappa', line: 'carvingProud' }],
      stage: { shots: [{ at: 0, x: 33, y: 2.4, height: 5.7, width: 7.2, move: .001 }],
        elof: [{ at: 0, face: .22, act: 'offer', aim: { x: 32.9, y: 1.65 } }],
        actors: { pappa: [{ at: 0, x: 35.4, z: -2.2, act: 'kneel', face: .38, aim: { x: 32, y: 2.2 }, move: .001 }] } } },
    // He opens the real bathroom door, walks in on his own feet, and brushes before the ending is allowed.
    { id: 'bathroom', on: 'teeth', until: 'goal', resumeAt: { x: HOME_BATHROOM.x, y: 0 }, seconds: HOME_BATHROOM.seconds, hold: true,
      lines: [{ at: .1, who: 'elof', line: 'brushNow' }, { at: HOME_BATHROOM.goodnight, who: 'mamma', line: 'goodnight' }],
      cues: [{ at: HOME_BATHROOM.bedtime, flag: 'bedtime' }],
      stage: { shots: [
        // Begin at the hall floor, then follow his whole walk in depth. Focusing on the basin from the
        // start enlarged the boy still in front of the lens and cut his boots off in landscape.
        { at: 0, x: HOME_BATHROOM.x, y: 2.55, z: 0, height: 7.4, width: 6.8, move: .001 },
        { at: HOME_BATHROOM.walkStart, x: HOME_BATHROOM.x, y: 2.1, z: HOME_BATHROOM.feetZ,
          height: 5.6, width: 5.8, move: HOME_BATHROOM.walkEnd - HOME_BATHROOM.walkStart },
      ],
        elof: [{ at: 0, act: 'stand', face: .75 }],
        actors: { pappa: [
          { at: HOME_BATHROOM.walkStart, x: 31.8, y: 0, z: -2.4, face: .9, move: .8, act: 'walk' },
          { at: HOME_BATHROOM.walkStart + .8, act: 'stand', aim: { x: HOME_BATHROOM.x, y: 2.2, z: HOME_BATHROOM.feetZ } },
        ] } } },
  ],
  goalX: 34.2,
  goalNeeds: 'bedtime',
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // The hall floor continues beyond the bathroom; the end waits for the complete brushing scene.
    { x: 47, y: 0 },
    { x: 47, y: 3 },
    { x: 62, y: 3 },
    { x: 62, y: 12 },
  ],
  house: { from: -40, to: 76, windows: HOME_LAYOUT.windows },
  // It is evening from the first moment: the lights are low, and the northern lights show in the windows.
  night: { after: null },
  checkpoints: [{ x: 2.6, y: 0 }, { x: 25, y: 0 }, { x: 33, y: 0 }],
  spots: [
    ...GUESTS.map((g) => ({ id: `party:${g.id}`, look: 'sign' as const, at: { x: g.x, y: 0 }, verb: 'give' as const, word: g.word, story: 'party' as const,
      // Moa stands in front of the shared dining table, with the gift still offered at the same mark.
      ...(g.id === 'moa' ? { standsAt: { x: g.x, y: 0, z: .45 } } : {}),
      // Pappa comes over to the carving once Elof has the knife, and kneels at his side, behind the line he walks.
      ...(g.id === 'pappa' ? { goesTo: { x: 35.4, y: 0, z: -2.2 }, goesWhen: 'knife' } : {}) })),
    { id: 'party:spoket', at: { x: 22.4, y: 0 }, verb: 'give', word: 'giveGhost', story: 'party' },
    // Pappa kneels beside him with a piece of linden and a knife: it waits until the ghost has its name.
    { id: 'knife', look: 'sign', at: { x: 29, y: 0 }, verb: 'take', word: 'takeKnife', needs: 'beat:named' },
    // Three strokes, each away from his body, and two dots of paint.
    { id: 'cut1', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'knife', story: 'carve' },
    { id: 'cut2', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut1', story: 'carve' },
    { id: 'cut3', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut2', story: 'carve' },
    { id: 'dots', at: { x: 32, y: 0 }, verb: 'give', word: 'paintEyes', needs: 'cut3', story: 'paint' },
    // A deliberate action at the bathroom door begins the walk to the basin and his toothbrush.
    { id: 'teeth', at: { x: HOME_BATHROOM.x, y: 0 }, verb: 'take', word: 'brush', needs: 'scene:first-carving' },
  ],
  // What he found under the deck came with him: each thing lies by the one it belongs to, until it is given back
  // ("Mitt hårspänne! Tack, lillebror!"); the found coin is returned to Pappa.
  decor: [
    { look: 'coin', at: { x: HOME_LAYOUT.dining.x - 1.6, y: TABLE_HOP.top }, z: HOME_LAYOUT.dining.z, after: 'lost:coin', until: 'back:coin' },
    { look: 'clip', at: { x: HOME_LAYOUT.dining.x + 1.7, y: TABLE_HOP.top }, z: HOME_LAYOUT.dining.z, after: 'lost:clip', until: 'back:clip' },
    { look: 'marble', at: { x: 20.2, y: 0 }, after: 'lost:marble', until: 'back:marble' },
    { look: 'brick', at: { x: 21, y: 0 }, after: 'lost:brick' },
  ],
  sets: [
    { flag: 'partied', when: ['party:mamma', 'party:pappa', 'party:moa', 'party:bertil', 'party:spoket'] },
    // Pappa tells him why the musical beach stones lie so high up, if he found them.
    { flag: 'cobbles:explained', when: ['party:pappa', 'heard:cobbles'] },
    // A thing is given back when its owner has had candy and the thing was found.
    { flag: 'back:coin', when: ['party:pappa', 'lost:coin'] },
    { flag: 'back:clip', when: ['party:moa', 'lost:clip'] },
    { flag: 'back:marble', when: ['party:bertil', 'lost:marble'] },
  ],
  ghost: [
    { at: { x: 23.4, y: 0 }, until: 'partied' },
    { at: { x: 26.6, y: 0 }, until: 'knife' },
    { at: { x: 34.4, y: 0 }, until: 'dots' },
    { at: { x: 33.7, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'partyThanks:mamma', on: 'party:mamma', who: 'mamma', line: 'partyMammaThanks', read: true },
    { id: 'partyThanks:pappa', on: 'party:pappa', who: 'pappa', line: 'partyPappaThanks', read: true },
    { id: 'partyThanks:moa', on: 'party:moa', who: 'moa', line: 'partyMoaThanks', read: true },
    { id: 'partyThanks:bertil', on: 'party:bertil', who: 'bertil', line: 'partyBertilThanks', read: true },
    { id: 'partyThanks:spoket', on: 'party:spoket', who: 'spoket', line: 'partyGhostThanks', read: true },
    { id: 'cobbles1', on: 'cobbles:explained', who: 'elof', line: 'cobbles1' },
    { id: 'cobbles2', on: 'cobbles:explained', who: 'pappa', line: 'cobbles2' },
    { id: 'cobbles3', on: 'cobbles:explained', who: 'elof', line: 'cobbles3' },
    { id: 'coinBack', on: 'back:coin', who: 'pappa', line: 'coinBack' },
    { id: 'clipBack', on: 'back:clip', who: 'moa', line: 'clipBack' },
    { id: 'marbleBack', on: 'back:marble', who: 'bertil', line: 'marbleBack' },
    { id: 'klonk', on: 'partied', who: 'spoket', line: 'klonk' },
    { id: 'named', on: 'partied', who: 'elof', line: 'named' },
    { id: 'away', on: 'knife', who: 'pappa', line: 'away' },
  ],
  cameras: [{ from: -3, to: 62, zoom: 1.5, lift: 0.3 }],
  candy: [...row(3, 33, 0)],
};
