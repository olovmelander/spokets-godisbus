import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { jump, round, row } from '../kit';

/**
 * Äventyr 2, Prolog: Stormkvällen (docs/aventyr-2.md). Units: EL. A Saturday evening at the end of October, at
 * home, while the autumn storm comes in over the village. Elof begins as a boy among small things.
 *
 * 1. **Kvällen** (a held scene): rain on the windows, the lights go out, Mamma lights candles, Pappa finds the
 *    flashlight, Bertil thinks the house creaks like a ship.
 * 2. **Godnatt:** at Pappa's shelf Elof says goodnight to his own little trägubbe and to the old one, the
 *    first, home again on the shelf. *Säg godnatt.*
 * 3. **Fönstret** (a held scene): a gust bursts the window open; the little one is swept out into the dark,
 *    and the old one leaps after it. Pappa sees only two empty places on the shelf.
 * 4. **Klonks stjärna:** Klonk has kept one last star in its carved bag. *Smaka på stjärnan*: POFF.
 * 5. **Vi letar tillsammans:** the family pull on raincoats and take their lamps. A candy lies on the floor, then
 *    another: the old trägubbe's trail. Tiny, he crosses the giant room, the door sill and the veranda.
 * 6. **Stormnatten:** at the deck's edge the stormy garden opens below him, and the adventure's title.
 *
 * The family are the same rehearsal figures as the first adventure's prologue (src/render/stage.ts).
 */

/** Pappa's shelf on the wall, and where the two figures stand on it until the gust. */
const SHELF = { x: 7, y: 5.4 };
const OLD = { x: SHELF.x - 3.6, y: SHELF.y + 0.08, z: -8.5 };
const LITTLE = { x: SHELF.x - 2.9, y: SHELF.y + 0.08, z: -8.3 };
/** The window by the shelf that the storm bursts open. */
const WINDOW = { x: 9.4, y: 6, z: -8.9 };
/** Where he says goodnight, under the shelf, and where Klonk holds out its star. */
const GOODNIGHT = 4.2;
const STAR = 8.0;

const SCENES: SceneDef[] = [
  {
    // 1. The storm evening, from black: rain on the panes, the lights flicker out, candles.
    id: 'kvall',
    at: 2.2,
    until: 'goodnight',
    seconds: 9.6,
    hold: true,
    lines: [
      { at: 1.8, who: 'mamma', line: 'skPower' },
      { at: 3.8, who: 'pappa', line: 'skLamp' },
      { at: 5.8, who: 'bertil', line: 'skShip' },
      { at: 7.8, who: 'elof', line: 'skWind' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.6 }],
      words: [{ at: 0.4, seconds: 3.2, kind: 'caption', text: 'stormkvall' }],
      shots: [{ at: 0, x: 6.2, y: 3.4, height: 7.2, width: 11, move: 0.01 }],
      actors: {
        mamma: [{ at: 0, x: 12.4, y: 0, z: -2.4, face: 0.4, move: 0.01, act: 'stand' }, { at: 1.6, act: 'lift', aim: { x: 13.6, y: 2.0, z: -1.6 } }],
        pappa: [{ at: 0, x: 15.2, y: 0, z: -3.0, face: 0.45, move: 0.01, act: 'look', aim: { x: 9.4, y: 6, z: -8.9 } }, { at: 3.6, act: 'reach', aim: { x: 14.6, y: 1.8, z: -1.4 } }],
        bertil: [{ at: 0, x: 10.6, y: 0, z: -3.4, face: 0.3, move: 0.01, act: 'look', aim: { x: 9.4, y: 6, z: -8.9 } }, { at: 5.6, act: 'point', aim: { x: 9.4, y: 6, z: -8.9 } }],
        moa: [{ at: 0, x: 13.8, y: 0, z: -1.2, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' }],
        ghost: [{ at: 0, x: SHELF.x - 2.1, y: SHELF.y + 0.08, z: -8.4, face: 0.25, move: 0.01, act: 'freeze' }],
      },
      elof: [{ at: 0, act: 'watch', aim: WINDOW }, { at: 7.6, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.6, z: OLD.z } }],
    },
  },
  {
    // 3. The window bursts open: a stream of wind from the shelf out into the dark. Both figures are gone.
    id: 'fonstret',
    on: 'goodnight',
    until: 'star',
    seconds: 12.4,
    hold: true,
    cues: [{ at: 1.4, flag: 'gust' }],
    sounds: [{ at: 1.2, sound: 'swell' }, { at: 3.6, sound: 'breath' }],
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
        { at: 1.3, kind: 'stream', from: { x: OLD.x, y: OLD.y + 0.5, z: OLD.z }, to: { x: WINDOW.x + 2, y: WINDOW.y + 1.4, z: WINDOW.z }, seconds: 1.8 },
        { at: 1.4, kind: 'sparkle', from: { x: WINDOW.x, y: WINDOW.y, z: WINDOW.z + 0.3 }, seconds: 1.4 },
      ],
      actors: {
        moa: [{ at: 2.4, act: 'point', aim: WINDOW }],
        bertil: [{ at: 1.6, act: 'startle' }, { at: 3.0, act: 'look', aim: WINDOW }],
        mamma: [{ at: 1.6, act: 'gasp' }, { at: 10.2, act: 'nod' }],
        pappa: [{ at: 1.6, act: 'startle' }, { at: 7.6, x: 9.0, y: 0, z: -3.6, face: 0.6, move: 1.0, act: 'look', aim: { x: OLD.x, y: OLD.y + 0.4, z: OLD.z } }],
        // Klonk stays wood while Pappa looks; it peeks at Elof the moment he turns away.
        ghost: [{ at: 0, act: 'freeze' }, { at: 4.2, act: 'peek' }, { at: 7.6, act: 'freeze' }, { at: 11.0, act: 'tilt' }],
      },
      elof: [{ at: 1.4, act: 'startle' }, { at: 4.2, act: 'point', aim: WINDOW }, { at: 6.2, act: 'watch', aim: WINDOW }],
    },
  },
  {
    // Klonk hops down from the shelf and opens its carved bag: one star left, saved for a night like this.
    id: 'klonkstar',
    on: 'scene:fonstret',
    until: 'star',
    seconds: 4.6,
    hold: true,
    sounds: [{ at: 0.6, sound: 'blink' }],
    lines: [
      { at: 1.2, who: 'spoket', line: 'skKlonk' },
      { at: 3.0, who: 'elof', line: 'skOneStar' },
    ],
    stage: {
      shots: [{ at: 0, x: STAR, y: 1.6, height: 4.4, width: 6.4, move: 0.8 }],
      fx: [{ at: 1.0, kind: 'glow', from: { x: STAR + 0.55, y: 0.5, z: 0.2 }, seconds: 3.6 }],
      elof: [{ at: 0, act: 'watch', aim: { x: STAR + 0.6, y: 0.4, z: 0 } }],
    },
  },
  {
    // 4. A taste, a held breath, POFF: the same magic as the first time, by his own choice now.
    id: 'krymper',
    resumeAt: { x: STAR, y: 0 },
    on: 'star',
    seconds: 10.4,
    hold: true,
    soundQuiet: [1.6, 7],
    sounds: [{ at: 2.4, sound: 'taste' }, { at: 3.3, sound: 'swell' }, { at: 3.7, sound: 'poff' }, { at: 6.2, sound: 'breath' }],
    lines: [
      { at: 6.8, who: 'elof', line: 'skSmall' },
      { at: 8.6, who: 'moa', line: 'skMoaSmall' },
    ],
    stage: {
      shots: [
        { at: 0, x: STAR, y: 1.4, height: 4.6, width: 5.2, move: 0.8 },
        { at: 3.4, x: STAR, y: 0.2, height: 3.2, width: 4.2, eye: -0.1, move: 2.6 },
        { at: 7.6, x: STAR + 1, y: 1.4, height: 6.4, width: 9, eye: -1.2, move: 1.2 },
      ],
      actors: {
        mamma: [{ at: 3.8, act: 'gasp' }, { at: 5.0, x: STAR - 1.6, y: 0, z: -1.4, face: 0.15, move: 1.0 }, { at: 6.0, act: 'kneel', aim: { x: STAR, y: 0.3, z: 0 } }],
        pappa: [{ at: 3.8, act: 'gasp' }, { at: 4.6, x: STAR + 2.2, y: 0, z: -1.2, face: 0.4, move: 1.0 }, { at: 5.6, act: 'kneel', aim: { x: STAR, y: 0.3, z: 0 } }],
        moa: [{ at: 3.8, act: 'startle' }, { at: 5.2, x: STAR + 0.6, y: 0, z: -2.6, face: 0.3, move: 1.0 }, { at: 6.2, act: 'crouch', aim: { x: STAR, y: 0.3, z: 0 } }],
        bertil: [{ at: 3.8, act: 'cheer' }, { at: 5.4, x: STAR + 3.4, y: 0, z: -2.8, face: 0.35, move: 1.0 }, { at: 6.4, act: 'crouch', aim: { x: STAR, y: 0.3, z: 0 } }],
        ghost: [{ at: 0, act: 'stand' }, { at: 4.0, act: 'hop' }, { at: 6.0, act: 'tilt' }],
      },
      elof: [
        { at: 0, act: 'show', size: 3 },
        { at: 1.8, act: 'eat' },
        { at: 3.6, act: 'startle', size: 1, move: 2.4 },
        { at: 6.2, act: 'hands' },
        { at: 8.0, act: 'watch', aim: { x: STAR + 0.6, y: 2.4, z: -2.6 } },
      ],
      fx: [
        { at: 0, kind: 'glow', from: { x: STAR + 0.3, y: 1.7, z: 0.3 }, seconds: 3.4 },
        { at: 3.2, kind: 'sparkle', from: { x: STAR, y: 1.3, z: 0.1 }, seconds: 3.0 },
        { at: 3.6, kind: 'poff', from: { x: STAR, y: 0.2, z: 0.2 }, seconds: 2.5 },
      ],
    },
  },
  {
    // 5. The giants get ready around him: raincoats, the flashlight, Moa's umbrella, Bertil's boots.
    id: 'tillsammans',
    resumeAt: { x: STAR, y: 0 },
    on: 'scene:krymper',
    seconds: 9.4,
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
        mamma: [{ at: 0.6, act: 'nod' }],
        pappa: [{ at: 2.8, act: 'show' }],
        bertil: [{ at: 4.8, act: 'stomp' }],
        moa: [{ at: 6.8, act: 'wave' }],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: STAR - 1.6, y: 2.2, z: -1.4 } }, { at: 8.6, act: 'nod' }],
    },
  },
  {
    // 6. At the deck's edge the storm-dark garden opens below, and the adventure's name stands over it.
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
      { at: { x: 13.6, y: 2.05 }, z: -1.6, size: 0.9, after: 'beat:kvall:0' },
      { at: { x: 21, y: 3.3 }, z: -8.6, size: 0.8, after: 'beat:kvall:0' },
      { at: { x: 34, y: 3.3 }, z: -8.6, size: 0.8, after: 'beat:kvall:0' },
    ],
  },
  decor: [
    // The two figures on the shelf, until the gust.
    { look: 'tragubbe', at: { x: OLD.x, y: OLD.y }, z: OLD.z, until: 'gust' },
    { look: 'lillgubbe', at: { x: LITTLE.x, y: LITTLE.y }, z: LITTLE.z, until: 'gust' },
    { look: 'candle', at: { x: 13.6, y: 1.65 }, z: -1.6 },
    { look: 'flashlight', at: { x: 15, y: 1.65 }, z: -1.3 },
  ],
  furniture: [
    { look: 'table', at: { x: 14, y: 0 }, z: -1.5 },
    { look: 'chair', at: { x: 14, y: 0 }, z: -3.5, face: 0.25 },
    { look: 'chair', at: { x: 17.2, y: 0 }, z: -1.5, face: 0.5 },
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
  house: { from: -40, to: 38, windows: [WINDOW.x, 21, 34] },
  outdoors: 38,
  checkpoints: [{ x: 6, y: 0 }, { x: 18, y: 0 }, { x: 36, y: 0 }, { x: 45.5, y: -0.8 }],
  spots: [
    { id: 'goodnight', at: { x: GOODNIGHT, y: 0 }, verb: 'give', word: 'skGoodnight', needs: 'scene:kvall' },
    { id: 'star', look: 'star', at: { x: STAR, y: 0 }, verb: 'take', word: 'tasteStar', needs: 'scene:klonkstar' },
  ],
  jumps: [jump({ x: 29.8, y: 0 }, { x: 30.6, y: 0.5 })],
  ghost: [
    // On the shelf beside the figures, still wood while the grown-ups look.
    { at: { x: SHELF.x - 2.1, y: SHELF.y + 0.08 }, z: -8.4, until: 'scene:fonstret', near: 99 },
    // Down on the floor with its star.
    { at: { x: STAR + 0.6, y: 0 }, until: 'scene:tillsammans', near: 99 },
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
    // The first candy on the floor, where the old one leapt: a trail.
    { id: 'skTrail', at: 10.6, needs: 'scene:tillsammans', who: 'elof', line: 'skTrail', read: true },
    { id: 'skSill', at: 27.6, who: 'spoket', line: 'skKlonkHop' },
    { id: 'skRain', at: 39.4, who: 'elof', line: 'skRainLine' },
    // On the deck, the family's promises, as he passes them.
    { id: 'skNear', at: 44, needs: 'scene:tillsammans', who: 'mamma', line: 'nearYou', read: true },
    { id: 'skFollow', at: 48, needs: 'scene:tillsammans', who: 'pappa', line: 'followTrail', read: true },
  ],
  // Indoors the picture is wide while he is big; tiny, it comes down to him.
  cameras: [{ from: -3, to: 10, zoom: 1.5, lift: 0.3 }, { from: 10, to: 38, zoom: 1.2, lift: 0.4 }, { from: 38, to: 60, zoom: 1.5, lift: 1.2 }],
  candy: [
    // The old trägubbe's trail: a sweet where it landed, then one at a time towards the veranda door.
    ...row(10, 29, 0, 1.9, 'scene:tillsammans'),
    { x: 30.6, y: 1.25, after: 'scene:tillsammans' },
    ...row(32.4, 36.4, 0, 2, 'scene:tillsammans'),
    { x: 38.6, y: -0.2, after: 'scene:tillsammans' },
    ...row(40, 50, -0.8, 2, 'scene:tillsammans'),
  ].map((c) => ({ ...c, x: round(c.x, 1) })),
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('scene:tillsammans')) return ['skFollowTrail', 'skFamilyLamps', 'trail'];
  if (has('star')) return ['skShrinking', 'skFamilyHome', 'sparkle'];
  if (has('gust')) return ['skStar', 'skFamilyHome', 'sparkle'];
  if (has('scene:kvall')) return ['skGoodnightPurpose', 'skFamilyHome', 'heart'];
  return ['skEvening', 'skFamilyHome', 'house'];
};
