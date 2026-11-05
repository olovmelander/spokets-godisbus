import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { alongAll, row, timeCard } from '../kit';

/**
 * Äventyr 2, Finalen: Stormens öga (docs/aventyr-2.md). Units: EL. In the narrow at Billsta, at midnight, where
 * Moälven runs out into Själevadsfjärden. Every step is something Elof does with Använd; nothing can go wrong.
 *
 * 1. **Bryggan nedanför Billaberget:** down through the forest from mormor and morfar's house by the road, a jetty
 *    in the narrow. The storm has put out the family's lamps, and they stand in the dark calling for him over the
 *    water, and never see him, small as he is, at their feet. Only mormor knows. He lights their lamps, one by one,
 *    and each of them feels that he is near: this is what the night has been for, Moa says it aloud. The row of
 *    light reaches out over the water, the stone is too far out to jump to, and *Ropa på ugglan*: the owl from
 *    Stormskogen has seen the light, and flies him out over the waves. Far down the lake Själevad's white church
 *    stands in the flashes.
 * 2. **Stormens öga:** as he lands on the stone the wind drops, the rain stops, the clouds part: stars, and the
 *    moon on the water.
 * 3. **Mötet** (a held scene): the old trägubbe holds the little one. It did not wait, all night, because it knows
 *    how long one night alone in the dark is.
 * 4. **Guldgodiset:** the old one gives him a geléhallon in gold paper it saved for him, the kind little Elof once
 *    shared with it. *Ta emot*, and *Smaka*: he grows, standing in the shallows with both figures in his hands,
 *    and the family's lamps, with mormor and morfar, reach the shore.
 * 5. **Hem:** *Gå hem*, all of them together, to the cars and home; mormor and morfar come along to the Sunday
 *    breakfast (Morgonen efter).
 */

/** The owl's flight from the jetty's end to the stone, and the walk home along the shore once he is big. */
const OWL = { from: { x: 10.6, y: 0 }, to: { x: 40.4, y: 0.6 }, rise: 4.2, time: 5.2, corridor: 0.5 };
const HOME = { from: { x: 54, y: 0.6 }, to: { x: 90, y: 0 }, rise: 1, time: 10, corridor: 0.3 };
/** Where the two trägubbar sit on the stone, and where the storm's eye opens. */
const FIGURES = 47.2;
const EYE = 42.2;

/** Where the family stands on the jetty in the dark, and where each one's dead lamp lies. */
const FAMILY = { mamma: 4, pappa: 5.8, moa: 7.4, bertil: 8.8 } as const;
const LAMP = { mamma: 4.7, pappa: 6.5, moa: 8, bertil: 9.4 } as const;
type Lit = keyof typeof FAMILY;
const LIT: Lit[] = ['mamma', 'pappa', 'moa', 'bertil'];
/** They look out over the water, for him. */
const OUT = { x: 40, y: 2, z: -2 };
const AT_Z = { mamma: -1.3, pappa: -1.7, moa: -1.2, bertil: -1.6 } as const;
const standing = (who: Lit) => [{ at: 0, x: FAMILY[who], y: 0, z: AT_Z[who], face: 0, move: 0.01, act: 'look' as const, aim: OUT }];

/** He lights a lamp: its owner starts, holds it up, and feels that he is near. */
const lit = (who: Lit, line: string, seconds: number): SceneDef => ({
  id: `lampa:${who}`,
  on: `so:${who}`,
  seconds,
  hold: true,
  sounds: [{ at: 0.1, sound: 'blink' }],
  lines: [{ at: 0.5, who, line }],
  stage: { actors: { [who]: [{ at: 0, act: 'gasp' }, { at: 0.4, act: 'point', aim: { x: 40, y: 6, z: -2 }, holds: `lamp-${who}` as const }] } },
});

const SCENES: SceneDef[] = [
  {
    ...timeCard('stormoga', 1),
    stage: {
      ...timeCard('stormoga', 1).stage,
      actors: { mamma: standing('mamma'), pappa: standing('pappa'), moa: standing('moa'), bertil: standing('bertil') },
    },
  },
  {
    // 1. The jetty in the dark. Nobody sees him but mormor, who has come down with him.
    id: 'bryggan',
    on: 'so:jetty',
    seconds: 8.2,
    hold: true,
    lines: [
      { at: 0.4, who: 'pappa', line: 'soDark' },
      { at: 2.4, who: 'mamma', line: 'soCalling' },
      { at: 4.2, who: 'elof', line: 'soTooSmall' },
      { at: 6.2, who: 'mormor', line: 'soMormorSecret' },
    ],
    stage: {
      shots: [{ at: 0, x: 6.4, y: 3, height: 7.4, width: 13, move: 0.8 }],
      actors: { mamma: [{ at: 2.2, act: 'wave', aim: OUT }, { at: 4, act: 'look', aim: OUT }] },
      elof: [{ at: 3.8, act: 'wave', aim: { x: FAMILY.mamma, y: 4, z: -1.3 } }],
    },
  },
  lit('mamma', 'soLampMamma', 2.6),
  lit('pappa', 'soLampPappa', 2.6),
  lit('moa', 'soLampMoa', 3.6),
  lit('bertil', 'soLampBertil', 2.6),
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
    seconds: 13.2,
    hold: true,
    lines: [
      { at: 1.0, who: 'elof', line: 'soFound' },
      { at: 3.2, who: 'spoket', line: 'soKlonk' },
      { at: 5.4, who: 'elof', line: 'soHeld' },
      { at: 8.0, who: 'elof', line: 'soKnow' },
      { at: 10.4, who: 'elof', line: 'soCapBack' },
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
    seconds: 15.6,
    hold: true,
    soundQuiet: [0.6, 5],
    sounds: [{ at: 0.8, sound: 'taste' }, { at: 1.6, sound: 'swell' }, { at: 2.0, sound: 'poff' }],
    lines: [
      { at: 4.2, who: 'mamma', line: 'soMamma' },
      { at: 6.0, who: 'pappa', line: 'soPappa' },
      { at: 7.8, who: 'moa', line: 'soMoa' },
      { at: 9.4, who: 'bertil', line: 'soBertil' },
      { at: 11.2, who: 'mormor', line: 'soMormor' },
      { at: 13.0, who: 'morfar', line: 'soMorfar' },
      { at: 14.8, who: 'elof', line: 'soHome' },
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
  storm: {
    rain: 1, lightning: 4.5, calm: 'eye',
    // The shore behind: Billaberget's granite and its forest, which the path from mormor and morfar's house by the
    // road comes down through, and birches; far down the lake, Själevad's church. The house is not on the shore.
    buildings: [
      { kind: 'cliff', x: -34, z: -46, y: 0, width: 40, height: 26 },
      { kind: 'spruce', x: -58, z: -58, height: 70 },
      { kind: 'spruce', x: -20, z: -62, height: 64 },
      { kind: 'spruce', x: 6, z: -54, height: 58 },
      { kind: 'birch', x: -4, z: -40, height: 70 },
      { kind: 'birch', x: 92, z: -36, height: 64 },
      { kind: 'church', x: 128, z: -74, y: -2, width: 26, height: 18 },
    ],
    glows: [
      // A warm place on the cold stone, where the two of them are.
      { at: { x: FIGURES + 0.1, y: 1.2 }, z: -1, size: 3.8, after: 'eye' },
    ],
  },
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
  // The great stone stands in open water.
  river: true,
  landmarks: [{ look: 'skerry', from: 38, to: 58, base: -6 }],
  surfaces: [{ from: -3, to: 12, kind: 'wood' }, { from: 38, to: 58, kind: 'wetRock' }],
  scenes: SCENES,
  checkpoints: [{ x: 4, y: 0 }, { x: 41, y: 0.6 }, { x: 50.4, y: 0.6 }],
  spots: [
    // He comes onto the jetty, among them, in the dark.
    { id: 'so:jetty', at: { x: 3.2, y: 0 }, verb: 'take', touch: true },
    // The family's lamps, one by one, down the jetty: the light goes from each to the next.
    ...LIT.map((who, i) => ({
      id: `so:${who}`, at: { x: LAMP[who], y: 0 }, verb: 'turn' as const, word: 'soLightLamp',
      needs: i === 0 ? 'scene:bryggan' : `scene:lampa:${LIT[i - 1]}`,
    })),
    // The owl: called, it settles on the jetty's end; then he chooses to climb up.
    { id: 'owl:call', at: { x: 10.2, y: 0 }, verb: 'call', word: 'soCallOwl', needs: 'scene:lampa:bertil' },
    { id: 'owl', look: 'owlLanding', at: { x: OWL.from.x, y: 0 }, verb: 'take', word: 'soBoardOwl', needs: 'owl:ready', ride: 'owl' },
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
    // Driftwood on the far shore.
    { look: 'kit', word: 'gren-a', at: { x: 66, y: 0 }, z: -1.6, turn: 0.3 },
    { look: 'kit', word: 'lag-mossig', at: { x: 76, y: 0 }, z: -2.6, turn: 0.2 },
    { look: 'kit', word: 'gren-b', at: { x: 84, y: 0 }, z: -1.5, turn: 2.1 },
    { look: 'kit', word: 'stubbe-sagad', at: { x: 90, y: 0 }, z: -2.4, turn: 0.9 },
    // Mormor and morfar at the head of the jetty, her lantern the only light left; the family's dead lamps at their feet.
    { look: 'mormor', at: { x: -0.6, y: 0 }, z: -1.2, until: 'owl' },
    { look: 'morfar', at: { x: -2.2, y: 0 }, z: -1.6, until: 'owl' },
    ...LIT.map((who) => ({ look: 'deadLamp' as const, at: { x: LAMP[who], y: 0 }, z: -0.5, until: `so:${who}` })),
    // The two trägubbar on the stone, the old one holding the little one; he carries them once he is big.
    { look: 'tragubbe', at: { x: FIGURES, y: 0.6 }, z: -0.5, until: 'taste', word: 'lifted' },
    { look: 'lillgubbe', word: 'lifted', at: { x: FIGURES + 0.32, y: 0.6 }, z: -0.3, until: 'taste' },
    // The cap he found in the gutter in Byn, back on the little one's head.
    { look: 'tiny-cap', word: 'worn', at: { x: FIGURES + 0.32, y: 1.08 }, z: -0.3, after: 'scene:motet', until: 'taste' },
    // The family on the far shore with their lamps, once the storm has let go; mormor with her lantern, morfar.
    { look: 'mormor', at: { x: 61.6, y: 0 }, z: -1, after: 'taste' },
    { look: 'morfar', at: { x: 63.4, y: 0 }, z: -1.4, after: 'taste' },
  ],
  ghost: [
    // Klonk is beside him now: on the jetty, then across with the owl, then by the figures.
    { at: { x: 11, y: 0 }, until: 'owl' },
    { at: { x: 44.6, y: 0.6 }, until: 'scene:motet', near: 99 },
    { at: { x: FIGURES - 0.7, y: 0.6 }, until: 'taste', near: 99 },
    { at: { x: 55.4, y: 0.6 }, near: 1.2 },
  ],
  beats: [
    { id: 'soFar', on: 'scene:lampa:bertil', who: 'elof', line: 'soFarLine', read: true },
    { id: 'soOwl', on: 'owl:ready', who: 'elof', line: 'soOwlCome', read: true },
    { id: 'soGold', on: 'gift', who: 'elof', line: 'soGoldLine', read: true },
    { id: 'soLast', on: 'gift', who: 'elof', line: 'soLastOne', read: true },
    { id: 'soShare', on: 'gift', who: 'elof', line: 'soShareLine', read: true },
  ],
  cameras: [
    // Wide enough for their faces, high over him.
    { from: -3, to: 12, zoom: 1.75, lift: 1.5 },
    { from: 12, to: 40, zoom: 1.6, lift: 1.6 },
    { from: 40, to: 58, zoom: 1.15 },
    { from: 58, to: 100, zoom: 1.5, lift: 0.6 },
  ],
  candy: [
    ...row(2.4, 8.4, 0),
    ...alongAll(OWL, [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94]),
    // Nothing sweet stands between him and the two of them.
    ...row(41.4, 53.4, 0.6).map((candy) => (Math.abs(candy.x - FIGURES) < 0.8 ? { ...candy, x: candy.x + 1 } : candy)),
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
  if (has('scene:lampa:bertil')) return ['soReach', 'soFamilyLamps', 'water'];
  return ['soLamps', 'soFamilyDark', 'water'];
};
