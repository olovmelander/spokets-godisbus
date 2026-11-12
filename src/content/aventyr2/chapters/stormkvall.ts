import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { jump, round, row } from '../kit';
import { DOLL_Z, TAKE } from '../../../render/elof-coat';
import { HOME_LAYOUT } from '../../home-layout';
import { CANDLES_LIT, POWER_FLICKER, POWER_GOES, POWER_OUT } from '../../home-power';

/**
 * Äventyr 2, Prolog: Stormkvällen (docs/aventyr-2.md). Units: EL. A Saturday evening at the end of October, at
 * home, while the autumn storm comes in over the village. Elof begins as a boy among small things.
 *
 * 1. **Kvällen** (a held scene): rain on the windows, the lights go out, Mamma lights candles, Bertil thinks the
 *    house creaks like a ship, and Pappa can't find the flashlight in the dark.
 * 2. **Ficklampan:** Elof takes it from the table and gives it to Pappa: *Ta ficklampan*, *Ge Pappa*.
 * 3. **Godnatt:** at Pappa's shelf Elof says goodnight to his own little trägubbe and to the old one, the
 *    first, home again on the shelf. *Säg godnatt.*
 * 4. **Fönstret** (a held scene): the window by the shelf has rattled all evening. A gust bursts it open: its
 *    halves fly outward and bang in the wind (`house.opens`, the `casement` look), the little one is swept out into
 *    the dark, and the old one leaps after him. Pappa sees only two empty places on the shelf.
 * 5. **Klonks stjärna** (a held scene): Pappa shuts the window and Mamma looks out after them, so no grown-up sees
 *    the shelf. Klonk wakes, hops down to Elof's feet and opens its carved bag: one star left, and it rises out of
 *    the bag. It is nowhere to be seen before (`Spot.after`). *Smaka på stjärnan*: POFF.
 * 6. **Vi letar tillsammans:** Moa misses Elof; Bertil finds him tiny on the floor. Once they have
 *    reacted and promised to help, the family pull on raincoats and take their lamps. A candy lies on the floor, then
 *    another: the old trägubbe's trail. Tiny, he crosses the giant room, the door sill and the veranda. The trail
 *    is laid only now, its big candies too (`Checkpoint.after`): nothing lies on the floor before the gust.
 *    None of their raincoats fits him now; at the foot of the toy shelf a doll sits in a small yellow one. *Ta
 *    regnrocken*: he puts it on, one arm and the other, and it fits (Olov, 9 November 2026; ../../../render/elof-coat.ts).
 *    He wears it through the storm. It is not needed to go on: walked past, he goes out onto the deck in his own clothes.
 * 7. **Stormnatten:** at the deck's edge the stormy garden opens below him, and the adventure's title.
 *
 * The family are the same rehearsal figures as the first adventure's prologue (src/render/stage.ts).
 */

/** Pappa's shelf on the wall, and where the two figures stand on it until the gust. */
const SHELF = HOME_LAYOUT.shelf;
const OLD = { x: SHELF.x - 3.6, y: SHELF.y + 0.08, z: -8.5 };
const LITTLE = { x: SHELF.x - 2.9, y: SHELF.y + 0.08, z: -8.3 };
/** The window by the shelf that the storm bursts open. */
const WINDOW = { x: 9.4, y: 6, z: -8.9 };
/**
 * Out in the dark beyond that window, where Pappa's lamp shines looking for the figures: far enough out, and a little
 * up, that the beam leaves his hand at a gentle slant and goes out through the glass, not straight up the wall.
 */
const OUTSIDE = { x: WINDOW.x + 0.8, y: 9, z: -22 };
/** Klonk on the shelf beside them, still wood while the grown-ups look. */
const KLONK_SHELF = { x: SHELF.x - 2.1, y: SHELF.y + 0.08, z: -8.4 };
/** Where he says goodnight, under the shelf. */
const GOODNIGHT = 4.2;
/** Where he tastes the star, a step on from the shelf: it floats between him and Klonk, at Klonk's bag. */
const STAR = 6.4;
const STAR_Y = 0.35;
/** Where Klonk lands from the shelf and stands with its bag, facing him. */
const KLONK = { x: STAR + 0.9, y: 0, z: 0 };
/**
 * Where each of the family kneels or crouches round him once they have found him small (`upptackt`), facing him, and gets
 * ready to go out (`tillsammans`). Their ways there from the window and the table do not cross.
 */
const AROUND = {
  pappa: { x: STAR - 1.8, z: -1.6, face: 0.116 },
  mamma: { x: STAR + 0.2, z: -3.2, face: 0.26 },
  moa: { x: STAR + 2.0, z: -1.0, face: 0.426 },
  bertil: { x: STAR + 3.4, z: -2.8, face: 0.39 },
};
/** What the trail's big candies wait for: the old trägubbe lays it, and it is found once he is small. */
const TRAIL = 'scene:tillsammans';
/**
 * The toy shelf in front of the sofa, and the doll sitting at its foot in its small yellow raincoat: on his way across
 * the room, after the table, where nobody stands in any scene. Its back leans on the shelf's front.
 */
const TOY_SHELF = { x: 21.3, z: DOLL_Z - 0.8 };
const DOLL = { x: 20.45 };

// Where each of the family is as the evening opens, clear of each other, the table and its chairs. The table is 5 long
// and 2.2 deep (x 11.5 to 16.5, z -2.6 to -0.4), with a chair behind it and one at its right end (`furniture`).
/** Mamma behind the table, and the candle she lights, near its back edge where she reaches it. */
const MAMMA = { x: 12.4, z: -3.3 };
const CANDLE = { x: 13, y: 1.65, z: -2.1 };
/** When the candle catches in the dark, a moment after the lamps went out: her hand is at its wick. */
const CANDLE_CATCHES = 4.2;
/** The lamp over the table, which goes out with the power (../../../render/power-cut.ts draws it): its shade, looked up at. */
export const PENDANT = { x: HOME_LAYOUT.dining.x, y: 6.3, z: HOME_LAYOUT.dining.z };
/** Pappa left of the table, feeling about in the dark: Elof gives him the flashlight here. */
const PAPPA = { x: 10.6, z: -1.6 };
/** Moa on the chair at the table's end, drawing, as she does in the first adventure's prologue. */
const MOA = { x: HOME_LAYOUT.dining.chairs.end.x - 0.395, z: HOME_LAYOUT.dining.chairs.end.z };
/** Bertil by the wall between the shelf and the window he watches. */
const BERTIL = { x: 8.4, z: -4.4 };

const SCENES: SceneDef[] = [
  {
    // 1. The storm evening, from black: rain on the panes, the room lit by its lamp over the table. The storm takes the
    // power: the lamps flicker and go out (../../home-power.ts), they all look up, and in the dark Mamma reaches to the
    // candle on the table, unlit until now, and it catches as she says so (Olov, 12 November 2026: "hur får vi det att
    // se ut som att strömmen faktiskt går i början och att mamma sen tänder det ljus som i början inte är tänt?").
    id: 'kvall',
    at: 2.2,
    until: 'goodnight',
    seconds: 12,
    hold: true,
    cues: [{ at: POWER_GOES, flag: POWER_OUT }, { at: CANDLE_CATCHES, flag: CANDLES_LIT }],
    // A gust in the dark outside as the lamps flicker: what took the power.
    sounds: [{ at: POWER_FLICKER - 0.1, sound: 'wind' }],
    lines: [
      { at: CANDLE_CATCHES, who: 'mamma', line: 'skPower' },
      { at: 6.2, who: 'pappa', line: 'skLamp' },
      { at: 8.2, who: 'bertil', line: 'skShip' },
      { at: 10.2, who: 'elof', line: 'skWind' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.6 }],
      words: [{ at: 0.4, seconds: 3.2, kind: 'caption', text: 'stormkvall' }],
      // Wide enough for Pappa, Mamma and her candle as each of them speaks, and the lamp over the table.
      shots: [{ at: 0, x: 8.4, y: 3.8, height: 7.8, width: 14, move: 0.01 }],
      actors: {
        // As the lamps go out she looks up at the one over the table; then she lights the candle, her hand at its wick
        // as it catches, and lets her arm down again.
        mamma: [
          { at: 0, ...MAMMA, y: 0, face: 0.25, move: 0.01, act: 'stand' },
          { at: POWER_GOES - 0.3, act: 'look', aim: PENDANT },
          { at: POWER_GOES + 0.1, act: 'lift', aim: { x: CANDLE.x, y: CANDLE.y + 0.35, z: CANDLE.z } },
          { at: 5.8, act: 'stand' },
        ],
        pappa: [
          { at: 0, ...PAPPA, y: 0, face: 0.3, move: 0.01, act: 'look', aim: WINDOW },
          { at: POWER_GOES - 0.2, aim: PENDANT },
          { at: 6.0, act: 'shrug' },
        ],
        // He looks at the creaking window with relaxed arms, up at the lamp as it goes, then turns back as Elof answers.
        bertil: [
          { at: 0, ...BERTIL, y: 0, face: 0.7, move: 0.01, act: 'stand', aim: WINDOW },
          { at: POWER_GOES - 0.1, act: 'look', aim: PENDANT },
          { at: 8.0, act: 'look', aim: WINDOW },
          { at: 10.0, face: 0.4, act: 'look', aim: { x: 2.6, y: 2.6, z: 0 } },
        ],
        // Moa looks up from her drawing as the lamp goes out, and draws on by candlelight.
        moa: [
          { at: 0, ...MOA, y: 0, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' },
          { at: POWER_GOES, act: 'look', aim: PENDANT },
          { at: 5.4, act: 'draw' },
        ],
        ghost: [{ at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'freeze' }],
      },
      elof: [
        { at: 0, act: 'watch', aim: WINDOW },
        { at: POWER_GOES - 0.2, aim: PENDANT },
        { at: CANDLE_CATCHES, aim: { x: CANDLE.x, y: CANDLE.y + 0.4, z: CANDLE.z } },
        { at: 10.0, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.6, z: OLD.z } },
      ],
    },
  },
  {
    // 3. The window bursts open: its two halves fly out and bang in the wind (the `casement` look, at 'gust'), and a
    // stream of wind goes from the shelf out into the dark. Both figures are gone.
    id: 'fonstret',
    on: 'goodnight',
    until: 'star',
    seconds: 12.4,
    hold: true,
    cues: [{ at: 1.4, flag: 'gust' }],
    sounds: [{ at: 1.4, sound: 'wind' }, { at: 5.6, sound: 'wind' }, { at: 9.2, sound: 'wind' }],
    lines: [
      { at: 0.3, who: 'elof', line: 'skGoodnightLine' },
      { at: 2.6, who: 'moa', line: 'skWindow' },
      { at: 4.4, who: 'elof', line: 'skTaken' },
      { at: 6.4, who: 'elof', line: 'skLeapt' },
      { at: 8.4, who: 'pappa', line: 'skEmpty' },
      { at: 10.4, who: 'mamma', line: 'skSearch' },
    ],
    stage: {
      shots: [
        { at: 0, x: 6.4, y: 4.6, height: 5.6, width: 8.4, move: 0.6 },
        { at: 1.4, x: 8.0, y: 5.6, height: 4.4, width: 7, move: 0.4 },
        { at: 4.2, x: 7.2, y: 3.6, height: 7, width: 11, move: 1.2 },
      ],
      fx: [
        { at: 1.4, kind: 'wind', from: WINDOW, to: { x: 3.6, y: 2.0, z: -0.8 }, seconds: 11 },
        { at: 1.3, kind: 'stream', from: { x: OLD.x, y: OLD.y + 0.5, z: OLD.z }, to: { x: WINDOW.x + 2, y: WINDOW.y + 1.4, z: WINDOW.z }, seconds: 1.8 },
        { at: 1.4, kind: 'sparkle', from: { x: WINDOW.x, y: WINDOW.y, z: WINDOW.z + 0.3 }, seconds: 1.4 },
      ],
      actors: {
        moa: [{ at: 2.4, act: 'point', aim: WINDOW }],
        bertil: [{ at: 1.6, act: 'startle' }, { at: 3.0, act: 'look', aim: WINDOW }],
        mamma: [{ at: 1.6, act: 'gasp' }, { at: 10.2, act: 'nod' }],
        pappa: [{ at: 1.6, act: 'startle' }, { at: 7.6, x: 10, y: 0, z: -3.4, face: 0.6, move: 1.0, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.4, z: OLD.z } }],
        // Klonk stays wood on the shelf while Pappa looks; it peeks at Elof the moment he turns away. A scene's
        // ghost starts from nowhere in particular, so its first key says where it is.
        ghost: [{ at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'freeze' }, { at: 4.2, act: 'peek' }, { at: 7.6, act: 'freeze' }, { at: 11.0, act: 'tilt' }],
      },
      elof: [{ at: 1.4, act: 'startle' }, { at: 4.2, act: 'point', aim: WINDOW }, { at: 6.2, act: 'watch', aim: WINDOW }],
    },
  },
  {
    // The grown-ups go to the burst window, their backs to the room: Pappa shuts it, Mamma looks out after the
    // figures. Nobody grown-up sees the shelf, so Klonk wakes, hops down to Elof's feet and opens its carved bag:
    // one star left, saved for a night like this. The star rises out of the bag ('star:out'); it was not there.
    id: 'klonkstar',
    on: 'scene:fonstret',
    until: 'star',
    seconds: 10.6,
    hold: true,
    // Pappa pulls the banging window to as he reaches it ('window:shut'), while the picture is still wide.
    cues: [{ at: 2.0, flag: 'window:shut' }, { at: 4.6, flag: 'star:out' }],
    sounds: [{ at: 1.2, sound: 'blink' }, { at: 4.5, sound: 'blink' }],
    lines: [
      { at: 5.4, who: 'spoket', line: 'skKlonk' },
      { at: 7.2, who: 'elof', line: 'skOneStar' },
      { at: 9.2, who: 'elof', line: 'skStarPlan' },
    ],
    stage: {
      shots: [
        // The shelf, Elof under it and the window with the grown-ups' backs; then down to the floor with Klonk.
        { at: 0, x: 6.4, y: 3.8, height: 7.6, width: 11, move: 0.8 },
        { at: 3.0, x: STAR + 0.4, y: 1.5, height: 4.6, width: 6.6, move: 1.4 },
      ],
      fx: [
        { at: 0, kind: 'wind', from: WINDOW, to: { x: 3.6, y: 2.0, z: -0.8 }, seconds: 2.0 },
        { at: 4.4, kind: 'sparkle', from: { x: KLONK.x - 0.3, y: 0.6, z: 0.2 }, seconds: 1.6 },
        { at: 4.6, kind: 'glow', from: { x: STAR, y: STAR_Y + 0.55, z: 0.1 }, seconds: 3.8 },
      ],
      actors: {
        // He pulls the window to with his free hand, his lamp shining out through it into the dark after the figures
        // (Olov, 12 November 2026: "pappa ska lysa ut genom fönstret för att titta efter trägubbarna"), and looks out.
        pappa: [
          { at: 0.2, x: WINDOW.x, y: 0, z: -7.4, face: 0.75, move: 1.2, act: 'reach', aim: WINDOW, beam: OUTSIDE },
          { at: 2.4, act: 'look', aim: OUTSIDE },
        ],
        mamma: [{ at: 0.5, x: WINDOW.x + 1.8, y: 0, z: -6.8, face: 0.75, move: 1.3, act: 'look', aim: { x: WINDOW.x + 0.6, y: WINDOW.y - 0.4, z: WINDOW.z - 1 } }],
        bertil: [{ at: 0.6, face: 0.75, act: 'look', aim: WINDOW }],
        moa: [{ at: 0.8, face: 0.75, act: 'look', aim: WINDOW }],
        ghost: [
          { at: 0, ...KLONK_SHELF, face: 0.25, move: 0.01, act: 'peek' },
          // A look at Elof: the grown-ups have turned away.
          { at: 1.2, act: 'tilt' },
          { at: 1.8, ...KLONK, face: 0.5, move: 1.2, act: 'hop' },
          { at: 3.0, act: 'stand' },
          { at: 3.8, act: 'tilt' },
        ],
      },
      // He came to the shelf from the right, so he faces the shelf first, then turns as Klonk lands.
      elof: [
        { at: 0, face: 0.75, act: 'watch', aim: { x: KLONK_SHELF.x, y: KLONK_SHELF.y + 0.6, z: KLONK_SHELF.z } },
        { at: 2.2, face: 0.06, act: 'watch', aim: { x: KLONK.x, y: 0.6, z: KLONK.z } },
        { at: 4.6, act: 'watch', aim: { x: STAR, y: STAR_Y + 0.6, z: 0 } },
      ],
    },
  },
  {
    // 4. A taste, a held breath, POFF: the same magic as the first time, by his own choice now.
    id: 'krymper',
    resumeAt: { x: STAR, y: 0 },
    on: 'star',
    seconds: 7.8,
    hold: true,
    soundQuiet: [1.6, 7],
    sounds: [{ at: 2.4, sound: 'taste' }, { at: 3.3, sound: 'swell' }, { at: 3.7, sound: 'poff' }, { at: 6.2, sound: 'breath' }],
    lines: [
      { at: 6.8, who: 'elof', line: 'skSmall' },
    ],
    stage: {
      // The star he took from Klonk is in his hand, and at his lips, as in the first adventure's POFF.
      star: true,
      shots: [
        { at: 0, x: STAR, y: 1.4, height: 4.6, width: 5.2, move: 0.8 },
        { at: 3.4, x: STAR, y: 0.2, height: 3.2, width: 4.2, eye: -0.1, move: 2.6 },
      ],
      actors: {
        // Everyone is still looking at the window. They discover the result afterwards; none sees the star or the POFF.
        mamma: [{ at: 0, face: 0.75, act: 'look', aim: WINDOW }],
        pappa: [{ at: 0, face: 0.75, act: 'look', aim: OUTSIDE }],
        moa: [{ at: 0, face: 0.75, act: 'look', aim: WINDOW }],
        bertil: [{ at: 0, face: 0.75, act: 'stand', aim: WINDOW }],
        // One glad hop while nobody looks, then still wood.
        ghost: [{ at: 0, ...KLONK, face: 0.5, move: 0.01, act: 'stand' }, { at: 3.75, act: 'hop' }, { at: 4.27, act: 'freeze' }],
      },
      elof: [
        { at: 0, act: 'show', size: 3 },
        { at: 1.8, act: 'eat' },
        { at: 3.6, act: 'startle', size: 1, move: 2.4 },
        { at: 6.2, act: 'hands' },
      ],
      fx: [
        { at: 0, kind: 'glow', from: { x: STAR + 0.3, y: 1.7, z: 0.3 }, seconds: 3.4 },
        { at: 3.2, kind: 'sparkle', from: { x: STAR, y: 1.3, z: 0.1 }, seconds: 3.0 },
        { at: 3.6, kind: 'poff', from: { x: STAR, y: 0.2, z: 0.2 }, seconds: 2.5 },
      ],
    },
  },
  {
    id: 'upptackt', on: 'scene:krymper', until: 'scene:tillsammans', resumeAt: { x: STAR, y: 0 }, seconds: 9.4, hold: true,
    lines: [
      { at: 0.8, who: 'moa', line: 'skWhereElof' },
      { at: 2.8, who: 'bertil', line: 'skBertilFound' },
      { at: 5.0, who: 'elof', line: 'skTinyAnswer' },
      { at: 7.2, who: 'pappa', line: 'skTinyTogether' },
    ],
    stage: {
      shots: [
        { at: 0, x: 10.4, y: 2.3, height: 7.2, width: 15.2, move: 0.6 },
        { at: 1.1, x: STAR + 1.2, y: 1.8, height: 6.8, width: 10, eye: -1.1, move: 1.5 },
      ],
      actors: {
        // Each comes to him from where they were, on a way of their own, and none crosses another's: Moa from the
        // table to his right, Mamma from the window to behind him, Pappa from the window round to his left, Bertil first.
        moa: [
          { at: 0, x: MOA.x - 0.5, y: 0, z: 0.3, face: 0.4, move: 0.6, act: 'stand' },
          { at: 3.0, x: 11, y: 0, z: 0.3, move: 0.9, act: 'walk' },
          { at: 3.9, ...AROUND.moa, y: 0, face: AROUND.moa.face, move: 0.9 },
          { at: 4.8, face: AROUND.moa.face, act: 'crouch', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        bertil: [
          { at: 1.0, ...AROUND.bertil, y: 0, face: AROUND.bertil.face, move: 1.2, act: 'walk' },
          { at: 2.2, act: 'crouch', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        mamma: [
          { at: 3.1, ...AROUND.mamma, y: 0, face: AROUND.mamma.face, move: 1.6, act: 'walk' },
          { at: 4.7, act: 'kneel', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
        pappa: [
          { at: 3.1, ...AROUND.pappa, y: 0, face: AROUND.pappa.face, move: 1.6, act: 'walk', aim: { x: STAR, y: 0.6, z: 0 } },
          { at: 4.7, act: 'kneel', aim: { x: STAR, y: 0.6, z: 0 } },
        ],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: AROUND.bertil.x, y: 1.8, z: AROUND.bertil.z } },
        { at: 4.7, act: 'wave' }, { at: 6.5, act: 'watch', aim: { x: AROUND.pappa.x, y: 2.4, z: AROUND.pappa.z } }],
    },
  },
  {
    // 5. The giants get ready around him: up off their knees, each pulls on a raincoat and rubber boots in their own way
    // and rhythm (the act `dress`: src/render/rain-gear.ts, art/blender/motion.py), the coat and the boots going on with
    // the hands and feet that put them on. Mamma first, as she says it; Pappa shows the flashlight, and dresses with it
    // in his hand; Bertil his biggest boots first, stamped down; Moa last.
    id: 'tillsammans',
    resumeAt: { x: STAR, y: 0 },
    on: 'scene:upptackt',
    seconds: 11.6,
    hold: true,
    lines: [
      { at: 1.0, who: 'mamma', line: 'skTogether' },
      { at: 3.0, who: 'pappa', line: 'skPappaLamp' },
      { at: 5.0, who: 'bertil', line: 'skBoots' },
      { at: 7.0, who: 'moa', line: 'skUmbrella' },
    ],
    stage: {
      shots: [{ at: 0, x: STAR + 1.2, y: 1.8, height: 6.8, width: 10, eye: -1.4, move: 0.9 }],
      actors: {
        mamma: [{ at: 0, face: 0.27, act: 'stand' }, { at: 1.0, act: 'dress' }],
        pappa: [{ at: 1.4, face: 0.18, act: 'stand' }, { at: 2.4, act: 'show' }, { at: 3.6, act: 'dress' }],
        bertil: [{ at: 4.2, face: 0.3, act: 'stand' }, { at: 4.6, act: 'dress' }],
        moa: [{ at: 6.4, face: 0.34, act: 'stand' }, { at: 6.8, act: 'dress' }],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: AROUND.mamma.x, y: 2.2, z: AROUND.mamma.z } },
        { at: 2.4, aim: { x: AROUND.pappa.x, y: 2.4, z: AROUND.pappa.z } },
        { at: 4.6, aim: { x: AROUND.bertil.x, y: 1.4, z: AROUND.bertil.z } },
        { at: 6.8, aim: { x: AROUND.moa.x, y: 2.0, z: AROUND.moa.z } },
        { at: 11.0, act: 'nod' },
      ],
    },
  },
  {
    // 6. A raincoat that fits him: the doll's. He takes it off the doll, swings it up onto his back and puts his arms into
    // its sleeves, the left and then the right, pulls its front together, and holds out his arms: it fits (the coat and his
    // arms as it goes on, ../../../render/elof-coat.ts). He turns from the doll to us as it goes on.
    id: 'regnrock',
    on: TAKE,
    resumeAt: { x: DOLL.x - 0.6, y: 0 },
    seconds: 5,
    hold: true,
    lines: [{ at: 3.75, who: 'elof', line: 'skCoatFits' }],
    stage: {
      shots: [{ at: 0, x: DOLL.x - 0.3, y: 0.85, height: 3, width: 5, move: 0.8 }],
      elof: [
        { at: 0, face: 0.68, act: 'watch', aim: { x: DOLL.x, y: 0.35, z: DOLL_Z } },
        { at: 1.15, face: 0.22, act: 'watch', aim: { x: DOLL.x - 1, y: 1.2, z: 3 } },
      ],
    },
  },
  {
    // 7. At the deck's edge the storm-dark garden opens below, and the adventure's name stands over it.
    id: 'stormtitel',
    at: 51.4,
    needs: 'scene:tillsammans',
    seconds: 10.6,
    hold: true,
    quiet: true,
    cues: [{ at: 10.4, flag: 'a2titel' }],
    lines: [{ at: 2.2, who: 'elof', line: 'skOut' }],
    stage: {
      words: [{ at: 6.0, seconds: 4.4, kind: 'title', text: 'a2title' }],
      shots: [
        { at: 0, x: 52.2, y: 0.1, height: 3.2, width: 5.6, eye: -0.05, move: 0.8 },
        { at: 2.2, x: 51.2, y: 0.8, height: 5.6, width: 10, move: 1.2 },
        { at: 3.8, x: 57, y: 0.6, height: 15, width: 28, move: 2.6 },
      ],
      elof: [
        { at: 0, act: 'watch', aim: { x: 58, y: -6, z: 0 }, face: 0 },
        { at: 2.2, face: 0.44, act: 'wave', aim: { x: 46, y: 2, z: -2 } },
        { at: 4.0, face: 0, act: 'watch', aim: { x: 70, y: 0, z: -10 } },
      ],
    },
  },
];

export const stormkvall: ChapterData = {
  id: 'stormkvall',
  ghostMeet: true,
  place: 'home',
  // A boy among small things, until his own choice of Klonk's star makes him small.
  size: { scale: 3, until: 'scene:krymper' },
  // The shelf's first place is the old trägubbe's: drawn by the pack's figure, so the gust can take it.
  shelf: { x: SHELF.x, y: SHELF.y },
  // The evening: the lights low, and the storm-dark sky in the windows (the pack paints the panes).
  night: { after: null },
  storm: {
    rain: 0.6,
    lightning: 7,
    // Candles on the table and the windowsill once Mamma has lit them.
    glows: [
      { at: { x: CANDLE.x, y: CANDLE.y + 0.4 }, z: CANDLE.z, size: 0.9, after: CANDLES_LIT },
      { at: { x: 21, y: 3.3 }, z: -8.6, size: 0.8, after: CANDLES_LIT },
    ],
  },
  decor: [
    // The family's room, which Sunday morning has too.
    { look: 'homeEvening', at: { x: 0, y: 0 } },
    // The window by the shelf: rattling, burst open by the gust, banging, and pulled to by Pappa.
    { look: 'casement', at: { x: WINDOW.x, y: WINDOW.y }, until: 'window:shut' },
    // The two figures on the shelf, until the gust.
    { look: 'tragubbe', at: { x: OLD.x, y: OLD.y }, z: OLD.z, until: 'gust' },
    { look: 'lillgubbe', at: { x: LITTLE.x, y: LITTLE.y }, z: LITTLE.z, until: 'gust' },
    // The candle Mamma lights when the power goes ("Strömmen gick! Jag tänder ljusen."): on the table from the start,
    // unlit until it catches (`CANDLES_LIT`, ../render.ts).
    { look: 'candle', at: { x: CANDLE.x, y: CANDLE.y }, z: CANDLE.z },
    // The flashlight on the table, until Elof has taken it to Pappa.
    { look: 'flashlight', at: { x: 15, y: 1.65 }, z: -1.3, until: 'lamp:take' },
    // The toy shelf, with the doll at its foot (the spot `coat:take`).
    { look: 'toyShelf', at: { x: TOY_SHELF.x, y: 0 }, z: TOY_SHELF.z },
  ],
  furniture: [
    { look: 'table', at: { x: HOME_LAYOUT.dining.x, y: 0 }, z: HOME_LAYOUT.dining.z },
    ...Object.values(HOME_LAYOUT.dining.chairs).map(chair => ({ look: 'chair' as const, at: { x: chair.x, y: 0 }, z: chair.z, face: chair.face })),
  ],
  scenes: SCENES,
  spawn: { x: 2.6, y: 0.01 },
  goalX: 51.0,
  goalNeeds: 'a2titel',
  coda: 'all',
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    // the living room and the hall, and the door sill to the veranda
    { x: 30, y: 0 },
    { x: 30, y: 0.5 },
    { x: 31.2, y: 0.5 },
    { x: 31.2, y: 0 },
    // the veranda, and the step down to the deck, out of doors in the rain
    { x: 38, y: 0 },
    { x: 38, y: -0.8 },
    // the deck, and its edge: the stormy garden lies far below it
    { x: 54, y: -0.8 },
    { x: 54, y: -7 },
    { x: 96, y: -7 },
    { x: 96, y: 10 },
  ],
  surfaces: [{ from: -19, to: 54, kind: 'wood' }],
  // The window by the shelf is the one the storm blows open: the wall has a real opening there.
  house: { from: -40, to: 38, windows: HOME_LAYOUT.windows, opens: WINDOW.x },
  outdoors: 38,
  // The trail's big candies: the first where the old trägubbe landed, under the window.
  checkpoints: [{ x: 10.6, y: 0, after: TRAIL }, { x: 18, y: 0, after: TRAIL }, { x: 36, y: 0, after: TRAIL }, { x: 45.5, y: -0.8, after: TRAIL }],
  spots: [
    // Pappa feels for the flashlight in the dark: Elof takes it from the table and gives it to him.
    { id: 'lamp:take', at: { x: 15, y: 0 }, verb: 'take', word: 'skTakeLamp', needs: 'scene:kvall' },
    { id: 'lamp:give', at: { x: PAPPA.x + 1, y: 0 }, verb: 'give', word: 'givePappa', needs: 'lamp:take' },
    { id: 'goodnight', at: { x: GOODNIGHT, y: 0 }, verb: 'give', word: 'skGoodnight', needs: 'beat:skLampThanks' },
    // Klonk's last star: out of its bag in the scene, held up between them, and not there before.
    { id: 'star', look: 'star', at: { x: STAR, y: STAR_Y }, verb: 'take', word: 'tasteStar', needs: 'scene:klonkstar', after: 'star:out' },
    // The doll's raincoat, once the family have put on theirs and he is small.
    { id: TAKE, look: 'doll', at: { x: DOLL.x, y: 0 }, verb: 'take', word: 'skTakeCoat', needs: 'scene:tillsammans' },
  ],
  jumps: [jump({ x: 29.8, y: 0 }, { x: 30.6, y: 0.5 })],
  ghost: [
    // On the shelf beside the figures, still wood while the grown-ups look.
    { at: { x: KLONK_SHELF.x, y: KLONK_SHELF.y }, z: KLONK_SHELF.z, until: 'scene:fonstret', near: 99 },
    // Down on the floor with its star, where the scene lands it.
    { at: { x: KLONK.x, y: KLONK.y }, until: 'scene:tillsammans', near: 99 },
    // Then ahead of him: across the room, over the sill, out onto the deck and down into the garden.
    { at: { x: 16, y: 0 } },
    { at: { x: 23, y: 0 } },
    { at: { x: 28.6, y: 0 } },
    { at: { x: 34.4, y: 0 } },
    { at: { x: 41.6, y: -0.8 } },
    { at: { x: 47.4, y: -0.8 } },
    { at: { x: 52.6, y: -0.8 }, until: 'beat:stormtitel:0', near: 99 },
    { at: { x: 57.5, y: -7 }, near: 0 },
  ],
  beats: [
    { id: 'skLampThanks', on: 'lamp:give', who: 'pappa', line: 'skLampThanks', read: true },
    { id: 'skShelf', on: 'beat:skLampThanks', until: 'goodnight', who: 'pappa', line: 'skShelf', read: true },
    { id: 'skMyCarving', on: 'beat:skShelf', until: 'goodnight', who: 'elof', line: 'skMyCarving', read: true },
    // The first candy on the floor, where the old one leapt: a trail.
    { id: 'skTrail', at: 10.6, needs: 'scene:tillsammans', who: 'elof', line: 'skTrail', read: true },
    // A handful is not for ever: this is what runs out at the end of Älven.
    { id: 'skHandful', on: 'beat:skTrail', who: 'moa', line: 'skHandful', read: true },
    { id: 'skEnough', on: 'beat:skHandful', who: 'bertil', line: 'skEnough', read: true },
    // The doll at the toy shelf, as he comes to it: its raincoat might fit him.
    { id: 'skDoll', at: DOLL.x - 2.2, needs: 'scene:tillsammans', until: TAKE, who: 'elof', line: 'skDollCoat', read: true },
    // Passing remarks (docs/dialogue.md): the one about the rain gives way to the family's promises on the deck.
    { id: 'skSill', at: 27.6, needs: 'scene:tillsammans', who: 'spoket', line: 'skKlonkHop', aside: true },
    { id: 'skRain', at: 39.4, needs: 'scene:tillsammans', who: 'elof', line: 'skRainLine', aside: true },
    // On the deck, the family's promises, as he passes them.
    { id: 'skNear', at: 44, needs: 'scene:tillsammans', who: 'mamma', line: 'nearYou', read: true },
    { id: 'skFollow', at: 48, needs: 'scene:tillsammans', who: 'pappa', line: 'followTrail', read: true },
  ],
  // Indoors the picture is wide while he is big; tiny, it comes down to him.
  cameras: [{ from: -3, to: 10, zoom: 1.5, lift: 0.3 }, { from: 10, to: 38, zoom: 1.2, lift: 0.4 }, { from: 38, to: 60, zoom: 1.5, lift: 1.2 }],
  candy: [
    // The old trägubbe's trail: a sweet where it landed, then one at a time towards the veranda door.
    ...row(10, 29, 0, 1.9, TRAIL),
    { x: 30.6, y: 1.25, after: TRAIL },
    ...row(32.4, 36.4, 0, 2, TRAIL),
    { x: 38.6, y: -0.2, after: TRAIL },
    ...row(40, 50, -0.8, 2, TRAIL),
  ].map((c) => ({ ...c, x: round(c.x, 1) })),
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('scene:tillsammans')) return ['skFollowTrail', 'skFamilyLamps', 'trail'];
  if (has('star')) return ['skShrinking', 'skFamilyHome', 'sparkle'];
  if (has('star:out')) return ['skStar', 'skFamilyHome', 'sparkle'];
  if (has('gust')) return ['skWindow', 'skFamilyHome', 'sparkle'];
  if (has('lamp:give')) return ['skGoodnightPurpose', 'skFamilyHome', 'heart'];
  if (has('lamp:take')) return ['skGiveLamp', 'skFamilyHome', 'heart', 'pappa'];
  if (has('scene:kvall')) return ['skFetchLamp', 'skFamilyHome', 'house', 'pappa'];
  return ['skEvening', 'skFamilyHome', 'house'];
};
