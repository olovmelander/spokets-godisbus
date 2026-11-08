import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { row } from '../kit';

/**
 * Äventyr 2, Epilog: Morgonen efter (docs/aventyr-2.md). Units: EL. Sunday morning at home, still and bright
 * after the storm, with leaves on the floor. He is a boy among small things all through.
 *
 * 1. **Frukost** (a held scene): the family at the table, sleepy and happy; mormor and morfar came home with them.
 * 2. **Hyllan:** he puts the old trägubbe back in its place, first in the row, and the little one beside it.
 * 3. **Fönsterhaken:** Pappa has fitted a new latch. *Vrid fönsterhaken*: "Nu blåser ingen bort."
 * 4. **Namnet:** the little one flew like a wisp of fluff in the storm. "Du ska heta Fjun!" Klonk: klonk, klonk.
 * 5. **Söndag:** a cup of cocoa, and out into the washed-clean morning. The last card.
 */

/** Pappa's shelf, its first place, and the window by it with the new latch. */
const SHELF = { x: 30, y: 5.4 };
const FIRST = { x: SHELF.x - 3.6, y: SHELF.y + 0.08, z: -8.5 };
const WINDOW = 22;

const SCENES: SceneDef[] = [
  {
    id: 'frukost',
    at: 0.6,
    seconds: 13.4,
    hold: true,
    lines: [
      { at: 1.6, who: 'mamma', line: 'moMorning' },
      { at: 3.8, who: 'bertil', line: 'moBranches' },
      { at: 6.0, who: 'moa', line: 'moSleepy' },
      { at: 8.0, who: 'pappa', line: 'moShelf' },
      // Mormor and morfar came home with them in the night, for breakfast.
      { at: 10.0, who: 'mormor', line: 'moMormor' },
      { at: 12.0, who: 'morfar', line: 'moMorfar' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.4 }],
      words: [{ at: 0.4, seconds: 3.2, kind: 'caption', text: 'morgonen' }],
      // Wide enough for mormor (x 4.6) and morfar (x 16) as they speak, and Elof at the door.
      shots: [{ at: 0, x: 8.6, y: 3.6, height: 7.8, width: 17, move: 0.01 }],
      // Each at the table where a body can be (it is 5 long and 2.2 deep, x 7.5 to 12.5, z -2.6 to -0.4): Bertil on
      // the chair behind it, Moa drawing on the one at its end, and Pappa standing behind her with his cup.
      actors: {
        mamma: [{ at: 0, x: 6.2, y: 0, z: -2.2, face: 0.3, move: 0.01, act: 'sip', holdsLeft: 'mug' }, { at: 1.4, act: 'wave' }],
        bertil: [{ at: 0, x: 10, y: 0, z: -3.15, face: 0.25, move: 0.01, act: 'sit' }, { at: 3.6, act: 'shrug' }],
        moa: [{ at: 0, x: 13.15, y: 0, z: -1.5, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' }, { at: 5.8, act: 'shrug' }],
        // He points at the shelf as he speaks of it, and goes back to his cup: his arm stayed out, into morfar's face.
        pappa: [
          { at: 0, x: 14.4, y: 0, z: -3, face: 0.4, move: 0.01, act: 'sip', holdsLeft: 'mug' },
          { at: 7.8, act: 'point', aim: { x: FIRST.x, y: FIRST.y, z: FIRST.z } },
          { at: 9.6, act: 'sip' },
        ],
        ghost: [{ at: 0, x: 3.2, y: 0, z: 0, face: 0, move: 0.01, act: 'hop' }],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: 9, y: 2.6, z: -2.4 } }, { at: 8.6, act: 'nod' }],
    },
  },
  {
    // Once both figures are on the shelf, the family come along (they spoke from the table, x 4 to 16, while he was at
    // the window and the sofa): Pappa to the window he fitted the latch on, Moa to hear the little one named, and Mamma
    // with her cup to the sofa, where the cocoa is, round the table and Morfar and behind where Elof is. He is free.
    id: 'mo:folj',
    on: 'shelf:small',
    seconds: 14,
    stage: {
      actors: {
        pappa: [{ at: 0.5, x: 20.4, y: 0, z: -4.4, move: 3.4 }, { at: 4.2, face: 0.2, act: 'stand' }],
        moa: [{ at: 0.6, act: 'stand', holds: null }, { at: 1.0, x: 25.4, y: 0, z: -1.6, move: 3.8 }, { at: 5.0, face: 0.35, act: 'stand' }],
        mamma: [
          { at: 0.6, act: 'stand' },
          { at: 1.0, x: 6.9, y: 0, z: 0.2, move: 1.0 },
          { at: 2.0, x: 17, y: 0, z: 0.4, move: 2.8 },
          { at: 4.8, x: 18.6, y: 0, z: -3, move: 0.8 },
          { at: 5.6, x: 45.6, y: 0, z: -3.2, move: 8 },
          { at: 13.7, face: 0.3, act: 'sip' },
        ],
      },
    },
  },
  {
    // The little one named and welcomed, Moa and Pappa go to the sofa too, for the cocoa.
    id: 'mo:kakao',
    on: 'beat:moWelcome',
    seconds: 7.4,
    stage: {
      actors: {
        moa: [{ at: 0.2, x: 42, y: 0, z: -2.8, move: 5 }, { at: 5.4, face: 0.3, act: 'stand' }],
        pappa: [{ at: 0.6, x: 37.6, y: 0, z: -3.4, move: 6.4 }, { at: 7.1, face: 0.35, act: 'sip' }],
      },
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
  goalX: 56,
  // The morning is told to its end before the last card: the cup of cocoa is the last thing he chooses.
  goalNeeds: 'cocoa',
  coda: 'all',
  scenes: SCENES,
  ground: [
    { x: -3, y: 9 },
    { x: -3, y: 0 },
    { x: 62, y: 0 },
    { x: 62, y: 9 },
  ],
  surfaces: [{ from: -19, to: 62, kind: 'wood' }],
  house: { from: -40, to: 76, windows: [4, 13, WINDOW, 40, 49] },
  furniture: [
    { look: 'table', at: { x: 10, y: 0 }, z: -1.5 },
    { look: 'chair', at: { x: 10, y: 0 }, z: -3.5, face: 0.25 },
    { look: 'chair', at: { x: 13.4, y: 0 }, z: -1.5, face: 0.5 },
  ],
  checkpoints: [{ x: 3, y: 0 }, { x: 18, y: 0 }, { x: 38, y: 0 }],
  spots: [
    { id: 'shelf:old', at: { x: FIRST.x + 0.2, y: 0 }, verb: 'give', word: 'moPutOld', needs: 'scene:frukost' },
    { id: 'shelf:small', at: { x: FIRST.x + 1.4, y: 0 }, verb: 'give', word: 'moPutSmall', needs: 'shelf:old' },
    { id: 'latch', at: { x: WINDOW + 0.6, y: 0 }, verb: 'turn', word: 'moLatch', needs: 'shelf:small' },
    { id: 'cocoa', look: 'cocoa', at: { x: 44, y: 0 }, verb: 'take', word: 'moCocoa', needs: 'beat:moWelcome' },
  ],
  decor: [
    // What the night left in the room: wet raincoats and boots, leaves on the floor, mormor's lantern put out.
    { look: 'aftermath', at: { x: 0, y: 0 } },
    // The two back on the shelf, first in the row: placed by his own hands.
    { look: 'tragubbe', at: { x: FIRST.x, y: FIRST.y }, z: FIRST.z, after: 'shelf:old' },
    { look: 'lillgubbe', at: { x: FIRST.x + 0.7, y: FIRST.y }, z: FIRST.z + 0.2, after: 'shelf:small' },
    { look: 'tiny-cap', word: 'worn', at: { x: FIRST.x + 0.7, y: FIRST.y + 0.48 }, z: FIRST.z + 0.2, after: 'shelf:small' },
    // Mormor and morfar, who came home with them in the night for the Sunday breakfast.
    { look: 'mormorHome', at: { x: 4.6, y: 0 }, z: -1.2 },
    { look: 'morfar', at: { x: 16, y: 0 }, z: -0.8 },
    // The new latch on the window.
    { look: 'latch', at: { x: WINDOW + 2.4, y: 5.4 }, z: -8.8 },
  ],
  ghost: [
    { at: { x: 4.4, y: 0 }, until: 'scene:frukost', near: 99 },
    { at: { x: FIRST.x - 1.6, y: 0 }, until: 'shelf:small', near: 99 },
    { at: { x: WINDOW + 2, y: 0 }, until: 'beat:moKlonk', near: 99 },
    { at: { x: 46, y: 0 }, until: 'cocoa', near: 99 },
    { at: { x: 54, y: 0 }, near: 1.2 },
  ],
  beats: [
    { id: 'moOld', on: 'shelf:old', who: 'elof', line: 'moOldHome', read: true },
    { id: 'moSmall', on: 'shelf:small', who: 'elof', line: 'moSmallHome', read: true },
    { id: 'moLatched', on: 'latch', who: 'pappa', line: 'moLatchLine', read: true },
    { id: 'moFluff', on: 'beat:moLatched', who: 'elof', line: 'moFluffLine', read: true },
    { id: 'moName', on: 'beat:moFluff', who: 'elof', line: 'moNameLine', read: true },
    { id: 'moKlonk', on: 'beat:moName', who: 'spoket', line: 'moKlonkLine' },
    { id: 'moNice', on: 'beat:moName', who: 'moa', line: 'moNiceLine', read: true },
    { id: 'moWelcome', on: 'beat:moNice', who: 'pappa', line: 'moWelcomeLine', read: true },
    { id: 'moCup', on: 'cocoa', who: 'mamma', line: 'moCupLine', read: true },
    // What she said on the jetty, in the dark, when her lamp lit by itself.
    { id: 'moKnew', on: 'beat:moCup', who: 'moa', line: 'moKnewLine', read: true },
    { id: 'moAnswer', on: 'beat:moKnew', who: 'elof', line: 'moAnswerLine', read: true },
    { id: 'moAll', at: 50, needs: 'beat:moAnswer', who: 'elof', line: 'moAllLine', read: true },
  ],
  cameras: [{ from: -3, to: 62, zoom: 1.5, lift: 0.3 }],
  candy: [...row(3, 53, 0)],
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
