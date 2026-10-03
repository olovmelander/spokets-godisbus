import type { Candy, ChapterData } from '../../sim/types';

/**
 * The story's two ends (plan §3.4): the prologue before Kapitel 1, and the epilogue after the final. Both
 * are played at home, and in both every step is something Elof does with Använd.
 *
 * In the plan Elof is at his normal size in both. Here he is as big as anywhere else in the game: the
 * rooms are built around him. The change of scale, and the POFF that shrinks him, come with the art.
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
 * 2. **Måla ögonen!** (P0): he paints the new ghost's eyes.
 * 3. **The blink.** It grabs the bag and runs. The bag tears, and candy trickles out behind it: the trail.
 * 4. **The chase,** over the veranda's door sill.
 * 5. **The star** on the deck's step: *Ta*. He shrinks, and Kapitel 1 begins.
 *
 * Not built yet: Pappa's hands and the shelf with its empty place, Bertil's hand at the bag, the brush
 * strokes traced by hand, the blink and the freeze joke, the bag tearing on the hinge, the POFF, and Pappa
 * on the deck. His two lines are said at the start of Kapitel 1.
 */
export const prolog: ChapterData = {
  id: 'prolog',
  place: 'home',
  spawn: { x: 1, y: 0.01 },
  goalX: 44.4,
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
  checkpoints: [{ x: 2.6, y: 0 }, { x: 26, y: 0 }],
  spots: [
    { id: 'paint', at: { x: 5.4, y: 0 }, verb: 'give', word: 'paintGhost' },
    // The star that rolled out of the torn bag: taking it shrinks him.
    { id: 'star', look: 'star', at: { x: 41, y: -0.8 }, verb: 'take', needs: 'paint', ride: 'shrink' },
  ],
  // The POFF: it carries him a little way, and can't fail.
  rides: [{ id: 'shrink', look: 'none', from: { x: 41, y: -0.8 }, to: { x: 45, y: 2.4 }, rise: 1.4, time: 1.8, corridor: 0 }],
  jumps: [
    { at: { x: 29.8, y: 0 }, dir: 1, land: { x: 30.6, y: 0.5 } },
  ],
  ghost: [
    // On the table, new, with no eyes yet: it stays until they are painted.
    { at: { x: 6.6, y: 0 }, until: 'paint' },
    { at: { x: 14, y: 0 } },
    { at: { x: 22, y: 0 } },
    { at: { x: 28.6, y: 0 } },
    { at: { x: 35, y: 0 } },
    { at: { x: 48, y: 2.4 } },
  ],
  // Said as the scene opens: he stands at the table already.
  beats: [{ id: 'tonight', at: 0.9, who: 'mamma', line: 'tonight' }],
  cameras: [],
  candy: [
    // Nothing lies there until the bag has torn.
    ...row(9, 29, 0, 2, 'paint'),
    { x: 30.6, y: 1.25, after: 'paint' },
    ...row(32.4, 36.4, 0, 2, 'paint'),
    { x: 38.6, y: -0.2, after: 'paint' },
    { x: 39.8, y: -0.35, after: 'paint' },
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
 * 1. **Elof hands out candy** (P18): to Mamma, Pappa, Moa, Bertil and the ghost, in the order he likes.
 * 2. **The naming.** The ghost hops across the table: klonk, klonk. "Du ska heta Klonk!"
 * 3. **Elofs första trägubbe** (P19): *Ta kniven*, three strokes with *Tälj*, and *Måla ögon*.
 *    Pappa: "Alltid bort från kroppen." Elof: "Jag kan tälja!"
 * 4. **Teeth:** *Borsta tänderna*, and up to bed. The last card.
 *
 * Not built yet: which candy each one gets (the choice is whom, and in which order); the strokes traced by
 * hand, away from the body; the figure on the windowsill and its blink; the first trägubbe and the ghost on
 * the shelf; the album as credits; *Utforska vidare*.
 */
export const epilog: ChapterData = {
  id: 'epilog',
  place: 'home',
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
    ...GUESTS.map((g) => ({ id: `party:${g.id}`, look: 'sign' as const, at: { x: g.x, y: 0 }, verb: 'give' as const, word: g.word })),
    { id: 'party:spoket', at: { x: 22.4, y: 0 }, verb: 'give', word: 'giveGhost' },
    // Pappa kneels beside him with a piece of linden and a knife: it waits until the ghost has its name.
    { id: 'knife', look: 'sign', at: { x: 29, y: 0 }, verb: 'take', word: 'takeKnife', needs: 'beat:named' },
    // Three strokes, each away from his body, and two dots of paint.
    { id: 'cut1', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'knife' },
    { id: 'cut2', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut1' },
    { id: 'cut3', at: { x: 32, y: 0 }, verb: 'turn', word: 'carve', needs: 'cut2' },
    { id: 'dots', at: { x: 32, y: 0 }, verb: 'give', word: 'paintEyes', needs: 'cut3' },
    { id: 'teeth', at: { x: 44, y: 0 }, verb: 'take', word: 'brush', needs: 'dots', ride: 'bed' },
  ],
  sets: [{ flag: 'partied', when: ['party:mamma', 'party:pappa', 'party:moa', 'party:bertil', 'party:spoket'] }],
  rides: [{ id: 'bed', look: 'none', from: { x: 44, y: 0 }, to: { x: 54, y: 3 }, rise: 1, time: 4, corridor: 0 }],
  ghost: [
    { at: { x: 23.4, y: 0 }, until: 'partied' },
    { at: { x: 26.6, y: 0 }, until: 'knife' },
    { at: { x: 34.4, y: 0 }, until: 'dots' },
    { at: { x: 41, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'klonk', on: 'partied', who: 'spoket', line: 'klonk' },
    { id: 'named', on: 'partied', who: 'elof', line: 'named' },
    { id: 'away', on: 'knife', who: 'pappa', line: 'away' },
    { id: 'carved', on: 'cut3', who: 'elof', line: 'carved' },
  ],
  cameras: [{ from: -3, to: 26, zoom: 1.2 }],
  candy: [...row(3, 43, 0)],
};
