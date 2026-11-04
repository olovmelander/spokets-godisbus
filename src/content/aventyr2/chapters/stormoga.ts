import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { alongAll, row, timeCard } from '../kit';

/**
 * Äventyr 2, Finalen: Stormens öga (docs/aventyr-2.md). Units: EL. Out on the lake, at midnight. Every step is
 * something Elof does with Använd; nothing here can go wrong.
 *
 * 1. **Bryggans ände:** the stone is too far out to jump to. *Ropa på ugglan*: the owl from Stormskogen comes
 *    back, and flies him out over the waves.
 * 2. **Stormens öga:** as he lands on the stone the wind drops, the rain stops, the clouds part: stars, and the
 *    moon on the water.
 * 3. **Mötet** (a held scene): the old trägubbe holds the little one. It did not wait, all night, because it knows
 *    how long one night alone in the dark is.
 * 4. **Guldgodiset:** the old one gives him a geléhallon in gold paper it saved for him, the kind little Elof once
 *    shared with it. *Ta emot*, and *Smaka*: he grows, standing in the shallows with both figures in his hands,
 *    and the family's lamps reach the shore.
 * 5. **Hem:** *Gå hem*, along the shore, all of them together.
 */

/** The owl's flight from the jetty's end to the stone, and the walk home along the shore once he is big. */
const OWL = { from: { x: 10.6, y: 0 }, to: { x: 40.4, y: 0.6 }, rise: 4.2, time: 5.2, corridor: 0.5 };
const HOME = { from: { x: 54, y: 0.6 }, to: { x: 90, y: 0 }, rise: 1, time: 10, corridor: 0.3 };
/** Where the two trägubbar sit on the stone, and where the storm's eye opens. */
const FIGURES = 47.2;
const EYE = 42.2;

const SCENES: SceneDef[] = [
  timeCard('stormoga', 1),
  {
    // 2. The storm's eye: silence, and the sky opening.
    id: 'oga',
    on: 'eye',
    seconds: 7.6,
    hold: true,
    soundQuiet: [0, 7.6],
    sounds: [{ at: 0.4, sound: 'breath' }, { at: 3.4, sound: 'swell' }],
    lines: [
      { at: 1.6, who: 'elof', line: 'soQuiet' },
      { at: 4.6, who: 'elof', line: 'soStars' },
    ],
    stage: {
      shots: [
        { at: 0, x: EYE + 1.5, y: 1.6, height: 4.6, width: 7, move: 0.8 },
        { at: 2.8, x: EYE + 3, y: 4.5, height: 12, width: 20, move: 2.6 },
      ],
      elof: [{ at: 0, act: 'watch', aim: { x: EYE + 4, y: 8, z: -12 } }, { at: 4.4, act: 'point', aim: { x: EYE + 6, y: 9, z: -14 } }],
    },
  },
  {
    // 3. The meeting. The old one holds the little one; then they see him.
    id: 'motet',
    on: 'scene:oga',
    from: EYE - 1,
    seconds: 10.8,
    hold: true,
    lines: [
      { at: 1.0, who: 'elof', line: 'soFound' },
      { at: 3.2, who: 'spoket', line: 'soKlonk' },
      { at: 5.4, who: 'elof', line: 'soHeld' },
      { at: 8.0, who: 'elof', line: 'soKnow' },
    ],
    stage: {
      shots: [{ at: 0, x: FIGURES - 1.2, y: 1.3, height: 3.4, width: 5.6, move: 1.0 }],
      elof: [{ at: 0, act: 'watch', aim: { x: FIGURES, y: 1.0, z: -0.4 } }, { at: 4.8, act: 'kneel', aim: { x: FIGURES, y: 0.9, z: -0.4 } }, { at: 9.6, act: 'hands' }],
    },
  },
  {
    // 4. He grows, in the moonlight, with the two of them in his hands; the lamps reach the shore.
    id: 'stor',
    on: 'taste',
    seconds: 11.8,
    hold: true,
    soundQuiet: [0.6, 5],
    sounds: [{ at: 0.8, sound: 'taste' }, { at: 1.6, sound: 'swell' }, { at: 2.0, sound: 'poff' }],
    lines: [
      { at: 4.2, who: 'mamma', line: 'soMamma' },
      { at: 6.0, who: 'pappa', line: 'soPappa' },
      { at: 7.8, who: 'moa', line: 'soMoa' },
      { at: 9.4, who: 'bertil', line: 'soBertil' },
      { at: 11.2, who: 'elof', line: 'soHome' },
    ],
    stage: {
      shots: [
        { at: 0, x: 48.4, y: 1.4, height: 3.6, width: 5, move: 0.6 },
        { at: 1.8, x: 52, y: 3.4, height: 9, width: 15, move: 2.4 },
        { at: 4.0, x: 58, y: 3.4, height: 10, width: 22, move: 1.6 },
      ],
      actors: {
        mamma: [{ at: 0, x: 65.2, y: 0, z: -1.4, face: 0.6, move: 0.01, act: 'stand' }, { at: 4.0, act: 'wave' }],
        pappa: [{ at: 0, x: 67.4, y: 0, z: -2.2, face: 0.6, move: 0.01, act: 'stand' }, { at: 5.8, act: 'gasp' }, { at: 6.8, act: 'cheer' }],
        moa: [{ at: 0, x: 69.2, y: 0, z: -1.2, face: 0.6, move: 0.01, act: 'stand' }, { at: 7.6, act: 'cheer' }],
        bertil: [{ at: 0, x: 70.8, y: 0, z: -2.4, face: 0.6, move: 0.01, act: 'stand' }, { at: 9.2, act: 'stomp' }],
      },
      elof: [
        { at: 0, act: 'eat', size: 1 },
        { at: 1.8, act: 'startle', size: 3, move: 2.4 },
        { at: 4.4, act: 'wave', aim: { x: 66, y: 2, z: -1.5 } },
        { at: 10.6, act: 'hands' },
      ],
      fx: [
        { at: 1.4, kind: 'sparkle', from: { x: 48.6, y: 1.4, z: 0.1 }, seconds: 3.0 },
        { at: 1.9, kind: 'poff', from: { x: 48.6, y: 0.8, z: 0.2 }, seconds: 2.5 },
      ],
    },
  },
];

export const stormoga: ChapterData = {
  id: 'stormoga',
  ghostMeet: true,
  place: 'bog',
  // The golden geléhallon: he grows back on the stone, with both carvings in his hands.
  size: { scale: 3, after: 'taste' },
  storm: { rain: 0.9, lightning: 6, calm: 'eye' },
  spawn: { x: 1, y: 0.01 },
  goalX: 86,
  coda: 'all',
  ground: [
    { x: -3, y: 10 },
    { x: -3, y: 0 },
    // The jetty's end, and the open water: far too wide to jump.
    { x: 12, y: 0 },
    { x: 12, y: -6 },
    { x: 38, y: -6 },
    // The stone in the lake: flat on top, worn by the waves.
    { x: 38, y: 0.6 },
    { x: 58, y: 0.6 },
    { x: 58, y: -6 },
    // The shallows, and the far shore where the family's lamps come.
    { x: 63, y: -6 },
    { x: 63, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 10 },
  ],
  water: [
    { from: 12, to: 38, y: -0.5 },
    { from: 58, to: 63, y: -0.5 },
  ],
  surfaces: [{ from: -3, to: 12, kind: 'wood' }, { from: 38, to: 58, kind: 'stone' }],
  scenes: SCENES,
  checkpoints: [{ x: 4, y: 0 }, { x: 41, y: 0.6 }, { x: 50.4, y: 0.6 }],
  spots: [
    // The owl: called, it settles on the jetty's end; then he chooses to climb up.
    { id: 'owl:call', look: 'owl', at: { x: 9.4, y: 0 }, verb: 'call', word: 'soCallOwl' },
    { id: 'owl', at: { x: OWL.from.x, y: 0 }, verb: 'take', word: 'soBoardOwl', needs: 'owl:ready', ride: 'owl' },
    // The storm's eye opens as he steps onto the stone.
    { id: 'eye', at: { x: EYE, y: 0.6 }, verb: 'take', touch: true },
    { id: 'gift', look: 'gold', at: { x: FIGURES - 1, y: 0.6 }, verb: 'take', word: 'soTakeGold', needs: 'scene:motet' },
    { id: 'taste', at: { x: FIGURES + 0.6, y: 0.6 }, verb: 'take', word: 'taste', needs: 'beat:soShare' },
    { id: 'home', look: 'sign', at: { x: HOME.from.x, y: 0.6 }, verb: 'take', word: 'goHome', needs: 'scene:stor', ride: 'home' },
  ],
  later: [{ flag: 'owl:ready', after: 'owl:call', seconds: 1.4, hold: true }],
  rides: [
    { id: 'owl', look: 'owl', ...OWL },
    { id: 'home', look: 'none', ...HOME },
  ],
  decor: [
    // The two trägubbar on the stone, the old one holding the little one; he carries them once he is big.
    { look: 'tragubbe', at: { x: FIGURES, y: 0.6 }, z: -0.5, until: 'taste' },
    { look: 'lillgubbe', at: { x: FIGURES + 0.32, y: 0.6 }, z: -0.3, until: 'taste' },
    // The family on the far shore with their lamps, once the storm has let go.
    { look: 'flashlight', at: { x: 66.2, y: 1.6 }, z: -1.6, after: 'taste' },
    { look: 'flashlight', at: { x: 68.4, y: 1.8 }, z: -2.2, after: 'taste' },
  ],
  ghost: [
    // Klonk is beside him now: on the jetty, then across with the owl, then by the figures.
    { at: { x: 6.4, y: 0 }, until: 'owl' },
    { at: { x: 44.6, y: 0.6 }, until: 'scene:motet', near: 99 },
    { at: { x: FIGURES - 0.7, y: 0.6 }, until: 'taste', near: 99 },
    { at: { x: 55.4, y: 0.6 }, near: 1.2 },
  ],
  beats: [
    { id: 'soFar', at: 5.4, who: 'elof', line: 'soFarLine', read: true },
    { id: 'soOwl', on: 'owl:ready', who: 'elof', line: 'soOwlCome', read: true },
    { id: 'soGold', on: 'gift', who: 'elof', line: 'soGoldLine', read: true },
    { id: 'soShare', on: 'gift', who: 'elof', line: 'soShareLine', read: true },
  ],
  cameras: [
    { from: -3, to: 12, zoom: 1.25, lift: 0.4 },
    { from: 12, to: 40, zoom: 1.6, lift: 1.6 },
    { from: 40, to: 58, zoom: 1.15 },
    { from: 58, to: 100, zoom: 1.5, lift: 0.6 },
  ],
  candy: [
    ...row(2.4, 8.4, 0),
    ...alongAll(OWL, [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94]),
    ...row(41.4, 53.4, 0.6),
    ...alongAll(HOME, [0.15, 0.25, 0.35, 0.45, 0.55, 0.65, 0.75, 0.85]),
  ],
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('scene:stor')) return ['soGoHome', 'soFamilyShore', 'house'];
  if (has('taste')) return ['soGrow', 'soFamilyShore', 'sparkle'];
  if (has('gift')) return ['soTaste', 'soFriends', 'sparkle'];
  if (has('eye')) return ['soMeet', 'soFriends', 'heart'];
  if (has('owl:call')) return ['soRide', 'soFamilyLamps', 'water'];
  return ['soReach', 'soFamilyLamps', 'water'];
};
