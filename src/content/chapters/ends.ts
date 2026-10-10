import type { Candy, ChapterData } from '../../sim/types';
import { timeCard } from './cards';
import { PROLOG_SCENES } from './prolog-scenes';

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
  shelf: { x: 2.4, y: 5.4 },
  decor: [
    // The shavings Pappa's knife left, and the Saturday bag on the table, until the ghost takes it.
    { look: 'shavings', at: { x: 5.6, y: 0 } },
    { look: 'bag', at: { x: 7.1, y: 1.65 }, until: 'grab', z: -1.25 },
  ],
  furniture: [
    { look: 'table', at: { x: 5.5, y: 0 }, z: -1.5 },
    { look: 'chair', at: { x: 5.5, y: 0 }, z: -3.5, face: 0.25 },
    { look: 'chair', at: { x: 8.8, y: 0 }, z: -1.5, face: 0.5 },
  ],
  scenes: PROLOG_SCENES,
  // Pappa's line after his freeze joke has its own moment: Elof sees the ghost slip away.
  later: [{ flag: 'snuck', after: 'pappa:noticed', seconds: 2.2 }],
  // In reach of the brush Pappa holds out, so the morning ends with "Måla ögonen!" lit on Använd: the first thing
  // asked of him has its button ready (docs/ux-audit/first-minutes.md row 19). The move lesson waits for the hall.
  spawn: { x: 2.6, y: 0.01 },
  goalX: 51.0,
  goalNeeds: 'titel',
  prologue: {
    // Pappa notices the ghost once Moa's drawing is told, as Elof sets off towards it.
    doorway: { x: 12, y: 0 }, railing: { x: 46.6, y: 1.9 }, edge: { x: 52.6, y: -0.8 }, pappaAfter: 'scene:handen', pappaFrom: 41.5,
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
  house: { from: -40, to: 38, windows: [9.4, 21, 34] },
  outdoors: 38,
  // The big candies keep their meaning in older saves: in the kitchen at the start (behind him, out of the
  // morning's pictures), at the end of the hall, and on the deck after the shrinking.
  checkpoints: [{ x: 0.6, y: 0 }, { x: 26, y: 0 }, { x: 45.5, y: -0.8 }],
  spots: [
    // Two eyes: a brush stroke for each; Pappa finishes a short stroke.
    { id: 'eye', at: { x: 3.7, y: 0 }, verb: 'give', word: 'paintGhost', story: 'paint' },
    { id: 'paint', at: { x: 3.7, y: 0 }, verb: 'give', word: 'paintGhost', needs: 'eye', story: 'paint' },
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
    { at: { x: 4.6, y: 1.65 }, z: -1.15, until: 'woke' },
    { at: { x: 6.5, y: 1.65 }, z: -1.2, until: 'blink', near: 99 },
    { at: { x: 16, y: 0 } },
    { at: { x: 22, y: 0 } },
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
    { id: 'onlyWood', on: 'pappa:noticed', who: 'pappa', line: 'onlyWood', priority: true },
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
    ...row(13, 29, 0, 1.6, 'bag:torn'),
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

/**
 * Epilog: Godiskalaset, on the glazed veranda at nine in the evening.
 * 1. **Elof hands out candy** (P18): he chooses a candy and then Mamma, Pappa, Moa, Bertil or the ghost.
 * 2. **The naming.** The ghost hops across the table: klonk, klonk. "Du ska heta Klonk!"
 * 3. **Elofs första trägubbe** (P19): *Ta kniven*, three outward strokes traced with Pappa, and two painted eyes.
 *    Pappa: "Alltid bort från kroppen." Elof: "Jag kan tälja!"
 * 4. **Teeth:** *Borsta tänderna*, and up to bed. The last card.
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
  shelf: { x: 34, y: 5.4, filled: true },
  epilogue: { window: { x: 40, y: 3.43, z: -8.3 } },
  spawn: { x: 1, y: 0.01 },
  // Where and when, as the evening opens (./cards.ts).
  scenes: [timeCard('epilog', 1)],
  goalX: 53,
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // the veranda, and the stairs up to bed: a wall to walk at, which only the last step carries him over
    { x: 47, y: 0 },
    { x: 47, y: 3 },
    { x: 62, y: 3 },
    { x: 62, y: 12 },
  ],
  house: { from: -40, to: 76, windows: [4, 13, 22, 31, 40] },
  // It is evening from the first moment: the lights are low, and the northern lights show in the windows.
  night: { after: null },
  checkpoints: [{ x: 2.6, y: 0 }, { x: 25, y: 0 }, { x: 38, y: 0 }],
  spots: [
    ...GUESTS.map((g) => ({ id: `party:${g.id}`, look: 'sign' as const, at: { x: g.x, y: 0 }, verb: 'give' as const, word: g.word, story: 'party' as const })),
    { id: 'party:spoket', at: { x: 22.4, y: 0 }, verb: 'give', word: 'giveGhost', story: 'party' },
    // Pappa kneels beside him with a piece of linden and a knife: it waits until the ghost has its name.
    { id: 'knife', look: 'sign', at: { x: 29, y: 0 }, verb: 'take', word: 'takeKnife', needs: 'beat:named' },
    // Three strokes, each away from his body, and two dots of paint.
    { id: 'cut1', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'knife', story: 'carve' },
    { id: 'cut2', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut1', story: 'carve' },
    { id: 'cut3', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut2', story: 'carve' },
    { id: 'dots', at: { x: 32, y: 0 }, verb: 'give', word: 'paintEyes', needs: 'cut3', story: 'paint' },
    { id: 'teeth', at: { x: 44, y: 0 }, verb: 'take', word: 'brush', needs: 'dots', ride: 'bed' },
  ],
  // What he found under the deck came with him: each thing lies by the one it belongs to.
  decor: [
    { look: 'coin', at: { x: 12.4, y: 0 }, after: 'lost:coin' },
    { look: 'clip', at: { x: 16.4, y: 0 }, after: 'lost:clip' },
    { look: 'marble', at: { x: 20.2, y: 0 }, after: 'lost:marble' },
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
  rides: [{ id: 'bed', look: 'none', from: { x: 44, y: 0 }, to: { x: 54, y: 3 }, rise: 1, time: 4, corridor: 0 }],
  ghost: [
    { at: { x: 23.4, y: 0 }, until: 'partied' },
    { at: { x: 26.6, y: 0 }, until: 'knife' },
    { at: { x: 34.4, y: 0 }, until: 'dots' },
    { at: { x: 41, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'cobbles1', on: 'cobbles:explained', who: 'pappa', line: 'cobbles1' },
    { id: 'cobbles2', on: 'cobbles:explained', who: 'pappa', line: 'cobbles2' },
    { id: 'cobbles3', on: 'cobbles:explained', who: 'pappa', line: 'cobbles3' },
    { id: 'coinBack', on: 'back:coin', who: 'pappa', line: 'coinBack' },
    { id: 'clipBack', on: 'back:clip', who: 'moa', line: 'clipBack' },
    { id: 'marbleBack', on: 'back:marble', who: 'bertil', line: 'marbleBack' },
    { id: 'klonk', on: 'partied', who: 'spoket', line: 'klonk' },
    { id: 'named', on: 'partied', who: 'elof', line: 'named' },
    { id: 'away', on: 'knife', who: 'pappa', line: 'away' },
    { id: 'carved', on: 'cut3', who: 'elof', line: 'carved' },
  ],
  cameras: [{ from: -3, to: 62, zoom: 1.5, lift: 0.3 }],
  candy: [...row(3, 43, 0)],
};
