import type { ChapterData } from '../../../sim/types';
import type { Point, SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { ELDER_BACK, row } from '../kit';
import { DOLL_Z } from '../../../render/elof-coat';
import { HOME_LAYOUT } from '../../home-layout';

/**
 * Äventyr 2, Epilog: Morgonen efter (docs/aventyr-2.md). Units: EL. Sunday morning at home, still and bright
 * after the storm, with leaves on the floor. He is a boy among small things all through. It is the room of the evening of
 * the storm (./stormkvall.ts), each thing where it stood then: Pappa's shelf, the window the storm blew open beside it,
 * the table with its chairs, the toy shelf, the sofa (Olov, 9 November 2026: the shelf had moved).
 *
 * 1. **Frukost** (a held scene): the family at the table, sleepy and happy; mormor and morfar came home with them, and
 *    mormor's thermos of hot chocolate stands on the table with a cup for each.
 * 2. **Hyllan:** he puts the old trägubbe back in its place, first in the row, and the little one beside it.
 * 3. **Fönsterhaken:** Pappa has fitted a new latch, and goes to the window. *Haka fast fönsterhaken*: the hook swings
 *    up and drops into its eye. "Nu blåser ingen bort."
 * 4. **Namnet:** the little one flew like a wisp of fluff in the storm. "Du ska heta Fjun!" Klonk: klonk, klonk.
 * 5. **Söndag:** his cup of cocoa from the table, and there he thanks each of them for what they did in the night
 *    (`tack`). Then on down the room, past the TV, where he may play before the end, to the door in the hall, out into
 *    the washed-clean morning. There he turns to them all, and the story ends (`slut`): everyone home, the two of them
 *    on the shelf together, and the little one winks. The last card.
 */

/** Pappa's shelf, its first place, as on the evening of the storm; and the window by it, with the new latch. */
const SHELF = HOME_LAYOUT.shelf;
const FIRST = { x: SHELF.x - 3.6, y: SHELF.y + 0.08, z: -8.5 };
const WINDOW = { x: 9.4, y: 6, z: -8.9 };
/**
 * The latch on the window's meeting stiles, under the shelf that runs across the window (as on the evening of the storm):
 * its pin left of the middle, its eye right.
 */
const LATCH = { x: WINDOW.x, y: 4.5, z: -8.78 };
/** The table and its two chairs, as on the evening of the storm. It is 5 long and 2.2 deep (x 11.5 to 16.5, z -2.6 to -0.4). */
const TABLE = HOME_LAYOUT.dining;
const TABLE_TOP = 1.65;
/**
 * Where each of the family is at breakfast, clear of the table and its chairs. Mormor and morfar stand by: mormor behind
 * the table's far end, by her thermos and lantern, between Bertil and Moa. She stood at its near front corner, in front of
 * the window: in the close picture of the new latch her face filled a third of it, and he hooked the latch and named Fjun
 * standing against her. Behind the table's near end she was hidden behind Mamma, and still in the latch's corner.
 * Mormor's and morfar's are where their bodies stand, as everyone's are: a grandparent put by `z` stands `ELDER_BACK`
 * behind it, and at 1.9 further back mormor stood in the sofa's left arm (Olov, 13 November 2026: "mormor står mitt i
 * soffkanten").
 */
const MAMMA = { x: 12.6, z: -3.45 };
const BERTIL = { x: 14, z: -3.15 };
const MOA = { x: TABLE.chairs.end.x - 0.395, z: TABLE.chairs.end.z };
const PAPPA = { x: 18.4, z: -3 };
const MORMOR = { x: 16.2, z: -3.3 };
const MORFAR = { x: 20.2, z: -3.1 };
/** Pappa by the window when the latch is to be hooked, beside it, not in front of it. */
const BY_WINDOW = { x: 7.1, z: -6.6 };
/** The toy shelf in front of the sofa, as on the evening of the storm. */
const TOY_SHELF = { x: 21.3, z: DOLL_Z - 0.8 };
/** Where he takes his cup of cocoa: at the front of the table, where it stands poured for him. */
const COCOA = TABLE.x + 1.6;
/**
 * Where he turns at the door, out into the morning, and the story ends: in the hall, past the wet raincoats, and past
 * the TV (Olov, 12 November 2026: "Under frukosten så ska man kunna gå förbi TV:n och spela innan äventyr två tar
 * slut"). At 27, before the TV, the end came before he could reach it. The front door itself stands there on the back wall
 * (../../../render/front-door.ts), just past the raincoats, and the hall's window beyond it: at 42.5 he stood before a bare
 * wall, where the window at 46 left no room for a door.
 */
export const DOOR = 44.4;
/** When the little one winks one eye on the shelf in the last scene, as at the end of the first adventure. */
export const WINK = { scene: 'slut', at: 5.45, seconds: 0.55 } as const;

/** Each of them, by face, and the two figures on the shelf: for the others to look at. Pappa's by the window, too. */
const FACE = {
  mamma: { x: MAMMA.x, y: 4.6, z: MAMMA.z }, pappa: { x: PAPPA.x, y: 4.8, z: PAPPA.z }, moa: { x: MOA.x, y: 2.9, z: MOA.z },
  bertil: { x: BERTIL.x, y: 2.6, z: BERTIL.z }, mormor: { x: MORMOR.x, y: 4.4, z: MORMOR.z }, morfar: { x: MORFAR.x, y: 4.6, z: MORFAR.z },
  pappaWindow: { x: BY_WINDOW.x, y: 4.8, z: BY_WINDOW.z },
};
const ON_SHELF = { x: FIRST.x + 0.4, y: FIRST.y + 0.5, z: FIRST.z };
/** The little one's place on the shelf, beside the old one's. */
const SECOND = { x: FIRST.x + 0.7, y: FIRST.y, z: FIRST.z + 0.2 };
/**
 * The kitchen step stool under the shelf's first places, the one of the first adventure's epilogue (../../chapters/ends.ts,
 * `STEP_STOOL`; src/render/stage.ts `steps`): the shelf is a grown-up's height, so he steps onto its tread and up onto
 * its top to put each figure back, and the figure stands there once his hand is at its place (`OLD_UP`, `SMALL_UP`). He
 * used to stand on the floor, two heads under the shelf, while each appeared over him; and from a plain stool his hands
 * stopped short of the shelf.
 */
const STOOL = { x: FIRST.x + 0.35, z: -7.27, front: -6.2, tread: { y: 1.1, z: -6.99 }, top: { y: 2.2, z: -7.6 } };
const OLD_UP = 'mo:old-up';
const SMALL_UP = 'mo:small-up';
/** His face, a boy's height: where he stands at the start, and at the door. */
const ELOF_START = { x: 1, y: 2.6, z: 0 };
const ELOF_DOOR = { x: DOOR, y: 2.6, z: 0 };
/** His face by the table, where he stands with his cup: for the others to look at as he thanks them. */
const AT_COCOA = { x: COCOA, y: 2.6, z: 0 };

/** Set when the picture has the shelf and the two on it, for the name; and when the family has looked up at his cup. */
const AT_SHELF = 'mo:at-shelf';
const CUP = 'mo:cup';
/** Set a moment after the name is said: when the scene at the shelf is over, and the others answer. */
const NAMED = 'mo:named';

/**
 * He puts a figure back on the shelf: to the stool, up onto it, his hand to its place (the figure stands there, `up`), and
 * what he says to it, said there (the scene's clock waits for it); a nod, and down again to where he was. A boy who put
 * the second one up at once had run to the window before "Och du bredvid." was said (docs/dialogue.md).
 */
const putUp = (id: string, on: string, beat: string, up: string, place: Point): SceneDef => ({
  id, on, until: `beat:${beat}`, before: 6, seconds: 4.3, hold: true, dialogue: [beat],
  cues: [{ at: 1.9, flag: up }],
  stage: {
    // Close by the wall: the shelf's first places, and him on the step stool under them, its top in the picture.
    shots: [{ at: 0, x: STOOL.x, y: 4.1, z: -7, height: 6.4, width: 5.6, move: 0.8 }],
    elof: [
      { at: 0, face: 0.75, act: 'walk', to: { x: STOOL.x, y: 0, z: STOOL.front }, move: 0.8 },
      { at: 0.8, act: 'stand', to: { x: STOOL.x, ...STOOL.tread }, move: 0.35 },
      { at: 1.15, to: { x: STOOL.x, ...STOOL.top }, move: 0.35 },
      { at: 1.5, act: 'reach', aim: { x: place.x, y: place.y + 0.25, z: place.z } },
      { at: 2.3, act: 'nod', aim: { x: place.x, y: place.y + 0.5, z: place.z } },
      { at: 2.7, face: 0.25, act: 'stand', to: { x: STOOL.x, ...STOOL.tread }, move: 0.35 },
      { at: 3.05, to: { x: STOOL.x, y: 0, z: STOOL.front }, move: 0.35 },
      { at: 3.4, act: 'walk', lift: { x: 0, y: 0, z: 0 }, move: 0.45 },
      { at: 3.85, act: 'stand' },
    ],
  },
});

const SCENES: SceneDef[] = [
  {
    // 1. Breakfast, the morning after: good morning to him, the boot that is still a lake, a sleepy owl, the shelf that
    // waits, and mormor's hot chocolate. Each looks to whoever speaks, sips, draws, shrugs and nods as they do.
    id: 'frukost',
    at: 0.6,
    seconds: 14.4,
    hold: true,
    lines: [
      { at: 1.6, who: 'mamma', line: 'moMorning' },
      { at: 3.8, who: 'bertil', line: 'moBranches' },
      { at: 6.0, who: 'moa', line: 'moSleepy' },
      { at: 8.0, who: 'pappa', line: 'moShelf' },
      // Mormor and morfar came home with them in the night, for breakfast: her thermos is on the table.
      { at: 10.2, who: 'mormor', line: 'moMormor' },
      { at: 12.2, who: 'morfar', line: 'moMorfar' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.4 }],
      words: [{ at: 0.4, seconds: 3.2, kind: 'caption', text: 'morgonen' }],
      shots: [
        // The table, everyone at it and mormor by her thermos.
        { at: 0, x: 15.2, y: 3.8, height: 7.8, width: 13.6, move: 0.01 },
        // "Hyllan väntar": the shelf and its empty places, and him.
        { at: 6.6, x: 6.4, y: 4.6, height: 8.2, width: 14, move: 1.3 },
        // Mormor's hot chocolate, and the table again.
        // Arrive before each reading stop; the event clock holds the camera while the line is read.
        { at: 9.0, x: 13.6, y: 3.6, height: 7, width: 11.6, move: 1.1 },
        { at: 11.0, x: 15.2, y: 3.8, height: 7.8, width: 13.6, move: 1.1 },
      ],
      actors: {
        mamma: [
          { at: 0, ...MAMMA, y: 0, face: 0.3, move: 0.01, act: 'sip', holdsLeft: 'mug' },
          { at: 1.4, act: 'wave', aim: ELOF_START },
          { at: 3.8, act: 'look', aim: FACE.bertil },
          { at: 5.2, act: 'sip' },
          { at: 6.4, act: 'look', aim: FACE.moa },
          { at: 8.1, aim: ON_SHELF },
          { at: 10.2, aim: FACE.mormor },
          { at: 11.0, act: 'nod', aim: FACE.mormor },
          { at: 12.3, act: 'look', aim: FACE.morfar },
          { at: 13.4, aim: ELOF_START },
        ],
        bertil: [
          { at: 0, ...BERTIL, y: 0, face: 0.25, move: 0.01, act: 'sit' },
          { at: 1.6, act: 'look', aim: FACE.mamma },
          { at: 3.6, act: 'shrug' },
          { at: 5.8, act: 'look', aim: FACE.moa },
          { at: 8.2, aim: ON_SHELF },
          { at: 10.3, aim: FACE.mormor },
          { at: 11.4, act: 'nod', aim: FACE.mormor },
          { at: 12.4, act: 'look', aim: FACE.morfar },
          { at: 13.6, aim: ELOF_START },
        ],
        moa: [
          { at: 0, ...MOA, y: 0, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' },
          { at: 4.0, act: 'look', aim: FACE.bertil },
          { at: 5.8, act: 'shrug' },
          { at: 7.0, act: 'draw' },
          { at: 8.3, act: 'look', aim: ON_SHELF },
          { at: 9.6, act: 'draw' },
          { at: 12.4, act: 'look', aim: FACE.morfar },
          { at: 13.6, aim: ELOF_START },
        ],
        pappa: [
          { at: 0, ...PAPPA, y: 0, face: 0.4, move: 0.01, act: 'sip', holdsLeft: 'mug' },
          { at: 1.7, act: 'look', aim: FACE.mamma },
          { at: 3.9, aim: FACE.bertil },
          { at: 4.6, act: 'nod', aim: FACE.bertil },
          { at: 6.1, act: 'look', aim: FACE.moa },
          { at: 7.8, act: 'point', aim: { x: FIRST.x, y: FIRST.y, z: FIRST.z } },
          { at: 9.6, act: 'sip' },
          // A step, the weight over to the other foot, as he turns to mormor and morfar.
          { at: 11.0, x: PAPPA.x + 0.3, z: PAPPA.z + 0.2, move: 0.8, act: 'look', aim: FACE.mormor },
          { at: 12.3, aim: FACE.morfar },
          { at: 13.6, aim: ELOF_START },
        ],
        ghost: [
          { at: 0, x: 2.4, y: 0, z: 0, face: 0, move: 0.01, act: 'hop' },
          { at: 1.4, act: 'tilt' },
          { at: 3.6, act: 'stand' },
          { at: 8.2, act: 'tilt' },
          { at: 10.4, act: 'hop' },
          { at: 11.6, act: 'stand' },
        ],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: 13, y: 2.6, z: -2.4 } },
        { at: 1.6, act: 'wave', aim: FACE.mamma },
        { at: 3.8, act: 'watch', aim: FACE.bertil },
        { at: 6.0, aim: FACE.moa },
        { at: 8.2, aim: ON_SHELF },
        { at: 8.8, act: 'nod', aim: ON_SHELF },
        { at: 10.2, act: 'watch', aim: FACE.mormor },
        { at: 12.2, aim: FACE.morfar },
        { at: 13.0, act: 'shrug' },
      ],
    },
  },
  // 2. Each figure back on the shelf, from the stool, and what he says to it there.
  putUp('hylla:old', 'shelf:old', 'moOld', OLD_UP, FIRST),
  putUp('hylla:small', 'shelf:small', 'moSmall', SMALL_UP, SECOND),
  {
    // With both figures back on the shelf, Pappa goes over to the window by it, with his cup, to see to his new latch.
    id: 'fonster',
    on: 'shelf:small',
    seconds: 4,
    stage: {
      actors: {
        pappa: [{ at: 0.3, ...BY_WINDOW, y: 0, face: 0.6, move: 3.2, act: 'look', aim: LATCH }],
        mamma: [{ at: 0.6, act: 'look', aim: ON_SHELF }],
      },
    },
  },
  {
    // 3. He hooks the new latch. A window detail keeps the little carvings and the bird whole around it;
    // the former brass-only macro cut their heads and bodies off at the edges on a portrait phone.
    id: 'haken',
    on: 'latch',
    seconds: 3.6,
    hold: true,
    sounds: [{ at: 1.85, sound: 'blink' }],
    stage: {
      shots: [
        { at: 0, x: WINDOW.x + 0.4, y: 3.6, height: 6.4, width: 8.6, move: 0.6 },
        // Lift the detail above the foreground family on portrait; its extra height keeps the bird's feet in landscape.
        { at: 0.5, x: LATCH.x + .2, y: 5.4, z: LATCH.z, height: 5.6, width: 3, move: 0.7 },
        { at: 2.6, x: WINDOW.x + 0.4, y: 3.6, height: 6.4, width: 8.6, move: 0.9 },
      ],
      fx: [{ at: 1.8, kind: 'sparkle', from: { x: LATCH.x + 0.45, y: LATCH.y - 0.1, z: LATCH.z + 0.2 }, seconds: 1.2 }],
      actors: {
        pappa: [{ at: 0, act: 'look', aim: LATCH }, { at: 2.4, act: 'nod', aim: { x: WINDOW.x + 0.6, y: 2.6, z: 0 } }],
      },
      // He turns to the window and reaches his hand up to the latch.
      elof: [{ at: 0, face: 0.62, act: 'point', aim: LATCH }, { at: 2.2, act: 'watch', aim: LATCH }, { at: 2.8, face: 0.3, act: 'nod' }],
    },
  },
  {
    // 4. The name is given at the window, by the shelf where the little one stands: Pappa's word on the new latch, what
    // Elof sees in it, and the name. He stands and looks up at the two of them while it is said: a boy free to run had
    // named his carving from the far end of the room. The first word waits until the picture has the shelf in it
    // (`AT_SHELF`), and the scene's clock waits for the words.
    id: 'fjun',
    on: 'scene:haken',
    until: 'beat:moName',
    seconds: 1.4,
    hold: true,
    dialogue: ['moLatched', 'moFluff', 'moName'],
    cues: [{ at: 0.9, flag: AT_SHELF }],
    stage: {
      // The two on the shelf, Pappa by the window and Elof under them.
      shots: [{ at: 0, x: 6.9, y: 3.9, height: 7.2, width: 10.4, move: 0.8 }],
      actors: { pappa: [{ at: 0, act: 'look', aim: ON_SHELF }] },
      elof: [{ at: 0, face: 0.6, act: 'watch', aim: ON_SHELF }],
    },
  },
  {
    // The others' answer to it: they turn to the shelf, Moa is up off her chair for it, and Pappa nods to the little one.
    // He stands under the shelf while they say it, and Klonk last: free to run, he had heard Moa from the table and
    // Pappa from the door. The words come once they have turned (`NAMED`); the clock waits for them.
    id: 'namnet',
    on: 'beat:moName',
    seconds: 4,
    hold: true,
    dialogue: ['moNice', 'moWelcome', 'moKlonk'],
    cues: [{ at: 0.9, flag: NAMED }],
    stage: {
      actors: {
        moa: [{ at: 0.4, act: 'look', aim: ON_SHELF }, { at: 0.7, act: 'cheer' }, { at: 2.6, act: 'look', aim: ON_SHELF }, { at: 3.4, act: 'draw' }],
        mamma: [{ at: 0.5, act: 'look', aim: ON_SHELF }, { at: 2.0, act: 'nod', aim: ON_SHELF }],
        bertil: [{ at: 0.6, act: 'look', aim: ON_SHELF }, { at: 1.8, aim: FACE.moa }],
        pappa: [{ at: 0.3, aim: ON_SHELF }, { at: 2.4, act: 'nod', aim: ON_SHELF }],
      },
    },
  },
  {
    // 5. His cup of cocoa from the table: they look to him as Mamma says it, and sip their own. He stands by the table
    // with his cup while Moa thanks him for her lamp and he answers: free to run on, he was at the room's far wall when
    // the story's last scene began at the door. Mamma's line waits until they have looked up (`CUP`).
    id: 'kakao',
    on: 'cocoa',
    seconds: 2.6,
    hold: true,
    dialogue: ['moCup', 'moKnew', 'moAnswer'],
    cues: [{ at: 0.4, flag: CUP }],
    stage: {
      actors: {
        mamma: [{ at: 0.2, act: 'look', aim: { x: COCOA, y: 2.6, z: 0 } }, { at: 1.4, act: 'sip' }],
        moa: [{ at: 0.6, act: 'look', aim: { x: COCOA, y: 2.6, z: 0 } }],
        bertil: [{ at: 0.4, act: 'look', aim: { x: COCOA, y: 2.6, z: 0 } }, { at: 1.6, act: 'nod' }],
        pappa: [{ at: 0.8, act: 'look', aim: { x: COCOA, y: 2.6, z: 0 } }, { at: 2.0, act: 'sip' }],
      },
    },
  },
  {
    // His thanks (Olov, 12 November 2026: "Sen vill jag att Elof tackar alla för vad de gjort under äventyrets gång"),
    // told standing by the table with his cup, once Moa's thanks and his answer are said: each one he names looks to him
    // and answers with a nod, a wave or a cheer, in the order the night went. Bertil's boot in the garden, Pappa's lamp
    // in the forest and his scarf at the bridge, Moa's umbrella in the village, Mamma's board at Flärken, mormor's lantern
    // and morfar's ladder at Billsta, and Klonk's last star, which began it all. The scene's clock waits at each line.
    id: 'tack',
    on: 'beat:moAnswer',
    seconds: 8.9,
    hold: true,
    lines: [
      { at: 0.5, who: 'elof', line: 'moThanksAll' },
      { at: 1.6, who: 'elof', line: 'moThanksBertil' },
      { at: 2.7, who: 'elof', line: 'moThanksPappa' },
      { at: 3.8, who: 'elof', line: 'moThanksMoa' },
      { at: 4.9, who: 'elof', line: 'moThanksMamma' },
      { at: 6.0, who: 'elof', line: 'moThanksGrand' },
      { at: 7.2, who: 'elof', line: 'moThanksKlonk' },
      { at: 8.2, who: 'spoket', line: 'moKlonkLine' },
    ],
    stage: {
      // The table and all of them round it, Pappa by the window; then down to him and Klonk for the last thanks.
      shots: [
        // There before his first words: the picture's clock waits at each line, and held it halfway.
        { at: 0, x: 13.4, y: 3.9, height: 8, width: 16, move: 0.45 },
        // (Before Klonk's line: the scene's clock, and the picture with it, waits while each line is read.)
        { at: 6.1, x: COCOA + 0.8, y: 1.9, height: 4.8, width: 7, move: 1 },
      ],
      actors: {
        mamma: [{ at: 0.2, act: 'look', aim: AT_COCOA }, { at: 4.7, act: 'nod', aim: AT_COCOA }, { at: 5.9, act: 'look', aim: FACE.mormor }],
        bertil: [{ at: 0.3, act: 'look', aim: AT_COCOA }, { at: 1.4, act: 'nod', aim: AT_COCOA }, { at: 3.7, act: 'look', aim: FACE.moa }],
        pappa: [{ at: 0.4, act: 'look', aim: AT_COCOA }, { at: 2.5, act: 'wave', aim: AT_COCOA }, { at: 3.7, act: 'look', aim: AT_COCOA }],
        moa: [{ at: 0.3, act: 'look', aim: AT_COCOA }, { at: 3.6, act: 'cheer' }, { at: 4.8, act: 'look', aim: AT_COCOA }, { at: 5.8, act: 'draw' }],
        ghost: [
          { at: 0, x: COCOA + 1.4, y: 0, z: 0, face: 0.5, move: 0.01, act: 'stand' },
          { at: 7.1, act: 'tilt' },
          { at: 8.0, act: 'hop' },
        ],
      },
      elof: [
        { at: 0, face: 0.3, act: 'watch', aim: { x: TABLE.x, y: 3.6, z: TABLE.z - 1.5 } },
        { at: 1.4, aim: FACE.bertil },
        { at: 2.5, aim: FACE.pappaWindow },
        { at: 3.6, aim: FACE.moa },
        { at: 4.7, aim: FACE.mamma },
        // Mormor by her lantern first, and morfar on his other side after: the line names them both.
        { at: 5.8, aim: FACE.mormor },
        { at: 6.4, aim: FACE.morfar },
        { at: 7.0, face: 0.1, act: 'nod', aim: { x: COCOA + 1.4, y: 0.6, z: 0 } },
      ],
    },
  },
  {
    // The end of the story. At the door out into the morning he turns to them all: they wave to him, the picture goes over
    // to the two of them on the shelf, home together, and back to him. The goal waits for this (`a2slut`).
    //
    // It is due at the door once the cocoa's words are said (and his thanks, which stand him at the table till they are
    // done), and waits there for his last line ("Alla är hemma. Det är bäst av allt.", said in the hall on the way to
    // the door, past the TV) to be read: he stands at the door for it (`quiet`). Waiting for that line itself, he had run
    // on down the room while it was read, and turned to them from outside the picture.
    id: 'slut',
    at: DOOR,
    needs: 'beat:moAnswer',
    seconds: 10.4,
    hold: true,
    quiet: true,
    cues: [{ at: 10.2, flag: 'a2slut' }],
    sounds: [{ at: 5.4, sound: 'blink' }, { at: 5.6, sound: 'swell' }],
    stage: {
      shots: [
        // Him at the door in the hall, by the wet raincoats, turning back to the room; then them at the table, waving.
        { at: 0, x: DOOR - 2.8, y: 3.4, height: 7, width: 10.4, move: 1.2 },
        { at: 1.1, x: 15.2, y: 3.8, height: 7.8, width: 13.6, move: 0.01 },
        // The two of them on the shelf, side by side, home: as close as the picture comes to the wall. The little one
        // winks (`WINK`, ../render.ts).
        { at: 3.0, x: FIRST.x + 0.4, y: FIRST.y + 0.5, z: FIRST.z + 0.2, height: 1.4, width: 2.0, move: 2.6 },
        // And all of it: them at the table, the TV, and him at the door.
        { at: 7.4, x: (TABLE.x + DOOR) / 2 - 1, y: 5.6, height: 13.5, width: 38, move: 2.4 },
      ],
      fx: [{ at: 5.4, kind: 'sparkle', from: { x: FIRST.x + 0.4, y: FIRST.y + 0.6, z: FIRST.z + 0.3 }, seconds: 2.2 }],
      actors: {
        mamma: [{ at: 0.3, act: 'look', aim: ELOF_DOOR }, { at: 1.1, act: 'wave', aim: ELOF_DOOR }, { at: 7.6, act: 'look', aim: ELOF_DOOR }],
        moa: [{ at: 0.4, act: 'look', aim: ELOF_DOOR }, { at: 1.3, act: 'wave', aim: ELOF_DOOR }, { at: 8.0, act: 'cheer' }],
        bertil: [{ at: 0.5, act: 'look', aim: ELOF_DOOR }, { at: 1.6, act: 'nod', aim: ELOF_DOOR }, { at: 8.2, act: 'wave', aim: ELOF_DOOR }],
        pappa: [{ at: 0.6, act: 'look', aim: ELOF_DOOR }, { at: 1.4, act: 'nod', aim: ELOF_DOOR }, { at: 7.8, act: 'wave', aim: ELOF_DOOR }],
        ghost: [{ at: 0, x: DOOR + 1, y: 0, z: 0, face: 0.5, move: 0.01, act: 'stand' }, { at: 1.0, act: 'hop' }, { at: 2.2, act: 'tilt' }, { at: 8.0, act: 'hop' }],
      },
      elof: [
        { at: 0, face: 0.5, act: 'wave', aim: { x: TABLE.x, y: 3, z: TABLE.z } },
        { at: 2.6, act: 'watch', aim: ON_SHELF },
        { at: 7.6, act: 'wave', aim: { x: TABLE.x, y: 3, z: TABLE.z } },
      ],
    },
  },
];

export const morgonen: ChapterData = {
  id: 'morgonen',
  ghostMeet: true,
  place: 'home',
  size: { scale: 3 },
  shelf: { x: SHELF.x, y: SHELF.y },
  spawn: { x: 1, y: 0.01 },
  goalX: DOOR - 0.4,
  // The morning is told to its end before the last card: the scene at the door, after the cup of cocoa.
  goalNeeds: 'a2slut',
  coda: 'all',
  scenes: SCENES,
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    { x: 62, y: 0 },
    { x: 62, y: 9 },
  ],
  surfaces: [{ from: -19, to: 62, kind: 'wood' }],
  // The windows of the evening of the storm, and on along the room; the first is the one it blew open, by the shelf.
  house: { from: -40, to: 76, windows: [...HOME_LAYOUT.windows, 52] },
  furniture: [
    { look: 'table', at: { x: TABLE.x, y: 0 }, z: TABLE.z },
    ...Object.values(TABLE.chairs).map(chair => ({ look: 'chair' as const, at: { x: chair.x, y: 0 }, z: chair.z, face: chair.face })),
    // The step stool under the shelf, for putting the two figures back.
    { look: 'steps', at: { x: STOOL.x, y: 0 }, z: STOOL.z },
  ],
  // A game saved before the figures went up from the stool had them on the shelf once he had put them there.
  sets: [{ flag: OLD_UP, when: ['shelf:old', 'scene:hylla:old'] }, { flag: SMALL_UP, when: ['shelf:small', 'scene:hylla:small'] }],
  // Each between two of the trail's sweets, not with one at its foot. The first is halfway between the shelf's two places,
  // so that neither of the buttons offered there is drawn over its sweet, and a game taken up at it starts by the shelf.
  checkpoints: [{ x: 4.2, y: 0 }, { x: 12, y: 0 }, { x: 22, y: 0 }],
  spots: [
    { id: 'shelf:old', at: { x: FIRST.x + 0.2, y: 0 }, verb: 'give', word: 'moPutOld', needs: 'scene:frukost' },
    { id: 'shelf:small', at: { x: FIRST.x + 1.4, y: 0 }, verb: 'give', word: 'moPutSmall', needs: 'shelf:old' },
    { id: 'latch', at: { x: WINDOW.x + 0.6, y: 0 }, verb: 'turn', word: 'moLatch', needs: 'shelf:small' },
    // His cup, poured, at the front of the table.
    { id: 'cocoa', look: 'cocoa', at: { x: COCOA, y: 0 }, verb: 'take', word: 'moCocoa', needs: 'beat:moWelcome' },
  ],
  decor: [
    // What the night left in the room: wet raincoats and boots in the hall, leaves on the floor.
    { look: 'aftermath', at: { x: 0, y: 0 } },
    // The toy shelf, as on the evening of the storm.
    { look: 'toyShelf', at: { x: TOY_SHELF.x, y: 0 }, z: TOY_SHELF.z },
    // Breakfast on the table: mormor's thermos of hot chocolate, a cup for each, buns, her lantern put out.
    { look: 'breakfast', at: { x: TABLE.x, y: TABLE_TOP }, z: TABLE.z },
    // The two back on the shelf, first in the row: placed by his own hands. The little one is glad to be home.
    { look: 'tragubbe', at: { x: FIRST.x, y: FIRST.y }, z: FIRST.z, after: OLD_UP },
    { look: 'lillgubbe', word: 'home', at: { x: SECOND.x, y: SECOND.y }, z: SECOND.z, after: SMALL_UP },
    { look: 'tiny-cap', word: 'home', at: { x: SECOND.x, y: SECOND.y + 0.48 }, z: SECOND.z, after: SMALL_UP },
    // Mormor, by her thermos at the table, and morfar, who came home with them in the night for the Sunday breakfast.
    { look: 'mormorHome', at: { x: MORMOR.x, y: 0 }, z: MORMOR.z + ELDER_BACK },
    { look: 'morfar', at: { x: MORFAR.x, y: 0 }, z: MORFAR.z + ELDER_BACK },
    // The new latch on the window, until he hooks it hanging loose from its pin.
    { look: 'latch', at: { x: LATCH.x, y: LATCH.y }, z: LATCH.z },
  ],
  ghost: [
    { at: { x: 2.4, y: 0 }, until: 'scene:frukost', near: 99 },
    { at: { x: SHELF.x - 0.8, y: 0 }, until: 'shelf:small', near: 99 },
    { at: { x: WINDOW.x + 1.8, y: 0 }, until: 'beat:moKlonk', near: 99 },
    { at: { x: COCOA + 1.4, y: 0 }, until: 'scene:tack', near: 99 },
    { at: { x: DOOR + 1, y: 0 }, near: 0 },
  ],
  beats: [
    // Said once his hand is at the figure's place on the shelf, up on the stool (`hylla:*`).
    { id: 'moOld', on: 'shelf:old', needs: OLD_UP, who: 'elof', line: 'moOldHome', read: true },
    { id: 'moSmall', on: 'shelf:small', needs: SMALL_UP, who: 'elof', line: 'moSmallHome', read: true },
    // The latch's word, the wisp of fluff and the name: said at the shelf (`fjun`).
    { id: 'moLatched', on: 'scene:haken', needs: AT_SHELF, who: 'pappa', line: 'moLatchLine', read: true },
    { id: 'moFluff', on: 'beat:moLatched', who: 'elof', line: 'moFluffLine', read: true },
    { id: 'moName', on: 'beat:moFluff', who: 'elof', line: 'moNameLine', read: true },
    // What the others say to it comes a moment after, as they turn to the shelf (`namnet`), and Klonk's klonk last.
    { id: 'moNice', on: NAMED, who: 'moa', line: 'moNiceLine', read: true },
    { id: 'moWelcome', on: 'beat:moNice', who: 'pappa', line: 'moWelcomeLine', read: true },
    { id: 'moKlonk', on: 'beat:moWelcome', who: 'spoket', line: 'moKlonkLine' },
    // The cup, and what Moa and he say over it: said at the table (`kakao`).
    { id: 'moCup', on: 'cocoa', needs: CUP, who: 'mamma', line: 'moCupLine', read: true },
    // What she said on the jetty, in the dark, when her lamp lit by itself.
    { id: 'moKnew', on: 'beat:moCup', who: 'moa', line: 'moKnewLine', read: true },
    { id: 'moAnswer', on: 'beat:moKnew', who: 'elof', line: 'moAnswerLine', read: true },
    { id: 'moAll', at: DOOR - 2.4, needs: 'beat:moAnswer', who: 'elof', line: 'moAllLine', read: true },
  ],
  cameras: [{ from: -3, to: 62, zoom: 1.5, lift: 0.3 }],
  candy: [...row(3, DOOR - 2, 0)],
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('cocoa')) return ['moSunday', 'moFamily', 'house'];
  if (has('beat:moName')) return ['moCocoaPurpose', 'moFamily', 'heart'];
  if (has('latch')) return ['moNamePurpose', 'moFamily', 'heart'];
  if (has('shelf:small')) return ['moLatchPurpose', 'moPappa', 'house'];
  if (has('shelf:old')) return ['moSmallPurpose', 'moFamily', 'heart'];
  return ['moShelfPurpose', 'moFamily', 'heart'];
};
