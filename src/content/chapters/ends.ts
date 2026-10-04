import type { Candy, ChapterData } from '../../sim/types';

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
 * Prolog: Lördagsmorgon.
 * 1. **The kitchen table.** Mamma, from the doorway: "Den får du öppna ikväll."
 * 2. **Måla ögonen!** (P0): he paints the new ghost's eyes, one and then the other.
 * 3. **The blink.** It looks at the empty place on the shelf, and then at the bag. It grabs the bag and runs.
 *    The bag tears, and candy trickles out behind it: the trail.
 * 4. **The chase,** over the veranda's door sill.
 * 5. **The star** on the deck's step: *Ta*. He shrinks, and Kapitel 1 begins.
 *
 * The two freeze jokes and the bag's tear use simple stage shapes until their Blender acting is ready.
 * Bertil's hand at the bag and the family's authored likeness/poses still need the art session.
 */
export const prolog: ChapterData = {
  id: 'prolog',
  place: 'home',
  // He is a boy among small things, until the star shrinks him.
  size: { scale: 3, until: 'star' },
  // Pappa's shelf, with the first place in the row empty: the first trägubbe is not there.
  shelf: { x: 10.5, y: 5.4 },
  decor: [
    // Mamma in the doorway; the shavings Pappa's knife left; and the Saturday bag, until the ghost takes it.
    { look: 'sign', at: { x: -1.7, y: 0 }, word: 'callMamma' },
    { look: 'shavings', at: { x: 5.9, y: 0 } },
    { look: 'bag', at: { x: 7.8, y: 0 }, until: 'blink' },
  ],
  // The blink: he watches while it looks at the empty place on the shelf, and then at the bag.
  later: [{ flag: 'blink', after: 'paint', seconds: 2.6, hold: true }],
  glance: { from: 'paint', until: 'blink', seconds: 2.6, at: [{ x: 6.9, y: 6.1, z: -8.8 }, { x: 7.8, y: 0.35, z: 0.25 }] },
  spawn: { x: 1, y: 0.01 },
  goalX: 50.6,
  goalNeeds: 'pappa:done',
  prologue: { doorway: { x: 8.4, y: 0 }, railing: { x: 48.2, y: 4.6 } },
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // the kitchen, and the door sill to the veranda
    { x: 30, y: 0 },
    { x: 30, y: 0.5 },
    { x: 31.2, y: 0.5 },
    { x: 31.2, y: 0 },
    // the veranda, and the deck's first step down
    { x: 38, y: 0 },
    { x: 38, y: -0.8 },
    // Shrunk, he is set down where the next step is a cliff: nothing but the star takes him there.
    { x: 42.4, y: -0.8 },
    { x: 42.4, y: 2.4 },
    { x: 52, y: 2.4 },
    { x: 52, y: 10 },
  ],
  house: { from: -40, to: 60, windows: [12, 24, 36] },
  checkpoints: [{ x: 2.6, y: 0 }, { x: 26, y: 0 }, { x: 45, y: 2.4 }],
  spots: [
    // Two eyes: a brush stroke for each; Pappa finishes a short stroke.
    { id: 'eye', at: { x: 4.6, y: 0 }, verb: 'give', word: 'paintGhost', story: 'paint' },
    { id: 'paint', at: { x: 4.6, y: 0 }, verb: 'give', word: 'paintGhost', needs: 'eye', story: 'paint' },
    // The star that rolled out of the torn bag: taking it shrinks him.
    { id: 'star', look: 'star', at: { x: 41, y: -0.8 }, verb: 'take', needs: 'blink', ride: 'shrink' },
  ],
  // The POFF: it carries him a little way, and can't fail.
  rides: [{ id: 'shrink', look: 'none', from: { x: 41, y: -0.8 }, to: { x: 45, y: 2.4 }, rise: 3, time: 2, corridor: 0 }],
  jumps: [
    { at: { x: 29.8, y: 0 }, dir: 1, land: { x: 30.6, y: 0.5 } },
  ],
  ghost: [
    // On the table, new, with no eyes yet: it stays until they are painted.
    { at: { x: 6.6, y: 0 }, until: 'blink' },
    { at: { x: 14, y: 0 } },
    { at: { x: 22, y: 0 } },
    { at: { x: 28.6, y: 0 } },
    { at: { x: 35, y: 0 } },
    // At the family, the torn bag spills its star before the little chase continues up the step.
    { at: { x: 40.9, y: -0.8 }, until: 'star' },
    { at: { x: 48, y: 2.4 }, until: 'pappa:done' },
  ],
  // Said as the scene opens: he stands at the table already.
  beats: [
    { id: 'newGhost', at: 0.9, who: 'pappa', line: 'newGhost' },
    { id: 'tonight', at: 0.9, who: 'mamma', line: 'tonight' },
    { id: 'stolenBag', on: 'blink', who: 'elof', line: 'stolenBag', priority: true },
    { id: 'fallenStar', at: 38.5, needs: 'bag:torn', who: 'moa', line: 'fallenStar', priority: true },
    { id: 'tinyElof', on: 'star', who: 'pappa', line: 'tinyElof', priority: true },
    { id: 'follow1', on: 'pappa:noticed', who: 'pappa', line: 'follow1' },
    { id: 'follow2', on: 'pappa:done', who: 'pappa', line: 'follow2' },
  ],
  // The picture is wide while he is big, and closes in on him when he has shrunk: the world grows.
  cameras: [{ from: -3, to: 42.4, zoom: 1.5, lift: 0.3 }, { from: 42.4, to: 52, zoom: 1.8, lift: 1.1 }],
  candy: [
    // Nothing lies there until the bag has torn.
    ...row(9, 29, 0, 2, 'bag:torn'),
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
  place: 'home',
  // He has grown back: a boy among small things, all through.
  size: { scale: 3 },
  // The first trägubbe has its place again, first in the row.
  shelf: { x: 34, y: 5.4, filled: true },
  epilogue: { window: { x: 40, y: 3.43, z: -8.3 } },
  spawn: { x: 1, y: 0.01 },
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
