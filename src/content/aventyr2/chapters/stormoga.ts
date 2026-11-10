import type { ChapterData } from '../../../sim/types';
import type { SceneDef } from '../../../sim/scene';
import type { Chooser } from '../context';
import { alongAll, row, timeCard, walkedAll } from '../kit';

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
 * 3. **Mötet** (a held scene, when he has gone up to them): the old trägubbe holds the little one. It did not wait, all
 *    night, because it knows how long one night alone in the dark is. Then it holds out what it saved for him.
 * 4. **Guldgodiset:** the old one gives him a geléhallon in gold paper it saved for him, the kind little Elof once
 *    shared with it. *Ta emot*: he holds it up, glittering, and *Smaka*: he tastes it, and in its glitter grows,
 *    standing on the stone with both figures in his hands, and the family's lamps, with mormor and morfar, reach the shore.
 * 5. **Hem:** *Gå hem*, all of them together: on his own feet, off the stone and through the shallows to the family on the
 *    shore, and on with them to the cars and home; mormor and morfar come along to the Sunday breakfast (Morgonen efter).
 */

/** The owl's flight from the jetty's end to the stone. */
const OWL = { from: { x: 10.6, y: 0 }, to: { x: 40.4, y: 0.6 }, rise: 4.2, time: 5.2, corridor: 0.5 };
/**
 * The way home, walked, big now (Olov, 9 November 2026: he flew it): off the stone into the shallows, through them, up
 * onto the shore and on among the family. His feet are on this ground all the way: the stone's top, the bed of the
 * shallows under the water, the shore.
 */
const HOME = {
  from: { x: 54, y: 0.6 }, to: { x: 70.4, y: 0 }, rise: 0, time: 9.6, corridor: 0,
  // Follow the moonstone's rounded end (moonstone.ts), then the shallow bank, without sinking into either.
  ground: [{ x: 54, y: 0.6 }, { x: 58, y: 0.6 }, { x: 58.4, y: 0.488 }, { x: 58.8, y: 0.152 },
    { x: 59.2, y: -0.408 }, { x: 59.464, y: -0.9 }, { x: 62.2, y: -0.9 }, { x: 63.8, y: 0 }, { x: 70.4, y: 0 }],
};
/** Where the two trägubbar sit on the stone, and where the storm's eye opens. */
const FIGURES = 47.2;
const EYE = 42.2;
/** How far towards them he comes before they meet: near enough to kneel to them, and to be in the picture with them. */
const MEET = 44.4;
/** Where the old one's golden sweet is taken, and where it is held out on its paper (../../../render/props.ts 'gold'). */
const GIFT = FIGURES - 1;
const SWEET = { x: GIFT + 0.55, y: 1.1, z: 0 };
/**
 * Where he tastes it: where he took it, before the old one, so that the two of them are seen beside him. Where Klonk
 * waits on the stone, past them and a little back, out of his way.
 */
const TASTE = GIFT + 0.2;
const KLONK = { x: FIGURES + 2.2, y: 0.6, z: -1.2 };

/** Where the family stands on the jetty in the dark, and where each one's dead lamp lies. */
const FAMILY = { mamma: 4, pappa: 5.8, moa: 7.4, bertil: 8.8 } as const;
const LAMP = { mamma: 4.7, pappa: 6.5, moa: 8, bertil: 9.4 } as const;
type Lit = keyof typeof FAMILY;
const LIT: Lit[] = ['mamma', 'pappa', 'moa', 'bertil'];
/** They look out over the water, for him. */
const OUT = { x: 40, y: 2, z: -2 };
const AT_Z = { mamma: -1.3, pappa: -1.7, moa: -1.2, bertil: -1.6 } as const;
/** Mormor's face at the head of the jetty, by her lantern: the one light left there. */
const MORMOR_JETTY = { x: -0.6, y: 4.4, z: -1.2 };
const standing = (who: Lit) => [{ at: 0, x: FAMILY[who], y: 0, z: AT_Z[who], face: 0, move: 0.01, act: 'look' as const, aim: OUT }];
/** Where someone's lit lamp is, held out over the water: what the others turn to. */
const lampHeld = (who: Lit) => ({ x: FAMILY[who] + 0.8, y: 3.2, z: AT_Z[who] + 0.6 });

/**
 * He lights a lamp: its owner starts, holds it out over the water (bent at the elbow, as a light is held), and feels that
 * he is near. Those still in the dark turn to the light, one after the other.
 */
const lit = (who: Lit, line: string, seconds: number): SceneDef => ({
  id: `lampa:${who}`,
  on: `so:${who}`,
  seconds,
  hold: true,
  sounds: [{ at: 0.1, sound: 'blink' }],
  lines: [{ at: 0.5, who, line }],
  stage: {
    actors: {
      [who]: [{ at: 0, act: 'gasp' }, { at: 0.4, act: 'shine', aim: { x: 40, y: 6, z: -2 }, holds: `lamp-${who}` as const }],
      ...Object.fromEntries(LIT.slice(LIT.indexOf(who) + 1).map((dark, i) => [dark, [{ at: 0.3 + 0.25 * i, aim: lampHeld(who) }]])),
    },
  },
});

/** Where the family stand on the far shore once the storm has let go, and how far back from the water. */
const SHORE = { mamma: 65, pappa: 66.8, moa: 68.4, bertil: 69.8 } as const;
const SHORE_Z = { mamma: -1.4, pappa: -2.2, moa: -1.2, bertil: -2.4 } as const;
/** Mormor and morfar on the shore, with her lantern. */
const MORMOR = { x: 63.9, z: 1.0 };
const MORFAR = { x: 64.4, z: -3.4 };
/** His face, big now, on the stone where he grew. */
const GROWN = { x: TASTE, y: 3.1, z: 0 };
/** Each of them, by face: for the others to look at whoever speaks. */
const FACE = {
  mamma: { x: SHORE.mamma, y: 4.6, z: SHORE_Z.mamma }, pappa: { x: SHORE.pappa, y: 4.8, z: SHORE_Z.pappa },
  moa: { x: SHORE.moa, y: 3.7, z: SHORE_Z.moa }, bertil: { x: SHORE.bertil, y: 3.3, z: SHORE_Z.bertil },
  mormor: { x: MORMOR.x, y: 4.4, z: MORMOR.z }, morfar: { x: MORFAR.x, y: 4.6, z: MORFAR.z },
};
/** Where his face is on the way home, so many seconds into it: the family's eyes go with him (`hem`). */
const walkedTo = (t: number) => {
  const k = Math.min(1, t / HOME.time);
  return { x: HOME.from.x + (HOME.to.x - HOME.from.x) * k * k * (3 - 2 * k), y: 2.9, z: 0 };
};
/** Where each of them ends up with him on the way home: on the shore, a little back from him, all facing him. */
const HOME_AT = { mamma: { x: 68.4, z: -1.3 }, pappa: { x: 72.6, z: -2.1 }, moa: { x: 74.2, z: -1.1 }, bertil: { x: 76, z: -2 } } as const;

const SCENES: SceneDef[] = [
  {
    ...timeCard('stormoga', 1),
    stage: {
      ...timeCard('stormoga', 1).stage,
      actors: { mamma: standing('mamma'), pappa: standing('pappa'), moa: standing('moa'), bertil: standing('bertil') },
    },
  },
  {
    // 1. The jetty in the dark. Nobody sees him but mormor, who has come down with him. They look down at the lamps the
    // wind knocked over, call out over the water, look out again, and turn to her when she speaks.
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
      shots: [{ at: 0, x: 6.4, y: 3, height: 7.4, width: 13, move: 0.3 }],
      actors: {
        pappa: [
          { at: 0.3, act: 'point', aim: { x: LAMP.pappa, y: 0.1, z: -0.5 } },
          { at: 2.0, act: 'look', aim: OUT },
          { at: 3.4, aim: { x: 30, y: 4, z: -9 } },
          { at: 4.8, x: FAMILY.pappa + 0.4, z: AT_Z.pappa + 0.2, move: 0.9, aim: { x: 44, y: 1, z: 1 } },
          { at: 6.4, aim: MORMOR_JETTY },
        ],
        mamma: [
          { at: 1.0, aim: { x: LAMP.mamma, y: 0.1, z: -0.5 } },
          { at: 2.2, act: 'wave', aim: OUT },
          { at: 4.0, act: 'look', aim: OUT },
          { at: 4.6, x: FAMILY.mamma + 0.3, z: AT_Z.mamma + 0.3, move: 0.8 },
          { at: 6.3, aim: MORMOR_JETTY },
        ],
        moa: [
          { at: 0.8, aim: { x: LAMP.moa, y: 0.1, z: -0.5 } },
          { at: 2.6, aim: { x: 42, y: 2.6, z: -4 } },
          // As he calls from her feet she looks down along the jetty, nearly at him, and does not see him.
          { at: 4.5, aim: { x: 3.6, y: 0.5, z: 0 } },
          { at: 5.6, aim: OUT },
          { at: 6.5, aim: MORMOR_JETTY },
        ],
        bertil: [
          { at: 0.6, aim: { x: 46, y: 4, z: -10 } },
          // Cold, and cross with the wind: he stamps his boots.
          { at: 2.9, act: 'stomp' },
          { at: 3.7, act: 'look', aim: OUT },
          { at: 5.2, aim: { x: 18, y: 1, z: 2 } },
          { at: 6.6, aim: MORMOR_JETTY },
        ],
      },
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
        { at: 2.8, x: EYE + 3, y: 4.5, height: 12, width: 20, move: 1.6 },
      ],
      elof: [{ at: 0, act: 'watch', aim: { x: EYE + 4, y: 8, z: -12 } }, { at: 4.4, act: 'point', aim: { x: EYE + 6, y: 9, z: -14 } }],
    },
  },
  {
    // The rain has stopped: off with the doll's raincoat, the right arm out of its sleeve and the left, off his shoulders,
    // and down onto the stone (../../../render/elof-coat.ts). It is a doll's coat: it must not be on him when he grows.
    id: 'rockav',
    on: 'scene:oga',
    seconds: 3.8,
    hold: true,
    lines: [{ at: 0.3, who: 'elof', line: 'soCoatOff' }],
    stage: {
      shots: [{ at: 0, x: EYE - 0.3, y: 1.45, height: 3.2, width: 5, move: 0.2 }],
      elof: [{ at: 0, face: 0.22, act: 'watch', aim: { x: EYE - 1, y: 1.8, z: 3 } }],
    },
  },
  {
    // 3. The meeting, once he has gone up to them. The old one holds the little one; then they see him. When the cap is
    // back on the little one's head, the old one has something for him: the golden sweet on its gold paper, held out to
    // him in a glitter ('gift:out'). It is not there before.
    id: 'motet',
    on: 'scene:oga',
    from: MEET,
    seconds: 14.4,
    hold: true,
    cues: [{ at: 12.4, flag: 'gift:out' }],
    sounds: [{ at: 12.3, sound: 'blink' }],
    lines: [
      { at: 1.0, who: 'elof', line: 'soFound' },
      { at: 3.2, who: 'spoket', line: 'soKlonk' },
      { at: 5.4, who: 'elof', line: 'soHeld' },
      { at: 8.0, who: 'elof', line: 'soKnow' },
      { at: 10.4, who: 'elof', line: 'soCapBack' },
    ],
    stage: {
      shots: [
        { at: 0, x: FIGURES - 0.8, y: 1.3, height: 3.4, width: 7.2, move: 1.0 },
        // The sweet, close: held out to him on its gold paper.
        { at: 12.0, x: SWEET.x + 0.2, y: 1.05, height: 2.4, width: 4, move: 0.8 },
      ],
      fx: [
        { at: 12.3, kind: 'sparkle', from: SWEET, seconds: 2.0 },
        { at: 12.4, kind: 'glow', from: SWEET, seconds: 2.0 },
      ],
      actors: {
        // Klonk on the stone, a little behind them: a glad hop at its own "Klonk …", a tilt of its head, and at the gold.
        ghost: [
          { at: 0, ...KLONK, face: 0.5, move: 0.01, act: 'stand' },
          { at: 3.0, act: 'hop' },
          { at: 4.2, act: 'tilt' },
          { at: 10.6, act: 'hop' },
          { at: 11.6, act: 'stand' },
          { at: 12.5, act: 'tilt' },
        ],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: FIGURES, y: 1.0, z: -0.4 } },
        { at: 4.8, act: 'kneel', aim: { x: FIGURES, y: 0.9, z: -0.4 } },
        { at: 7.6, aim: { x: FIGURES + 0.32, y: 0.8, z: -0.3 } },
        { at: 9.6, act: 'hands' },
        { at: 11.8, act: 'watch', aim: SWEET },
      ],
    },
  },
  {
    // 4. He holds the golden sweet up, tastes it, and in a swirl of its glitter grows, in the moonlight, with the two of
    // them in his hands. The family's lamps on the shore: they see him, and each says what they feel, looking to whoever
    // speaks.
    id: 'stor',
    on: 'taste',
    resumeAt: { x: TASTE, y: 0.6 },
    seconds: 17.4,
    hold: true,
    soundQuiet: [0.6, 6.2],
    sounds: [{ at: 2.2, sound: 'taste' }, { at: 2.8, sound: 'swell' }, { at: 3.2, sound: 'poff' }],
    lines: [
      { at: 5.6, who: 'mamma', line: 'soMamma' },
      { at: 7.4, who: 'pappa', line: 'soPappa' },
      { at: 9.2, who: 'moa', line: 'soMoa' },
      { at: 11.0, who: 'bertil', line: 'soBertil' },
      { at: 12.8, who: 'mormor', line: 'soMormor' },
      { at: 14.6, who: 'morfar', line: 'soMorfar' },
      { at: 16.4, who: 'elof', line: 'soHome' },
    ],
    stage: {
      // The sweet is in his hand, held up and then at his lips (../../../render/stage.ts).
      star: 'gold',
      shots: [
        { at: 0, x: TASTE + 0.5, y: 0.95, height: 2.4, width: 3.8, move: 0.5 },
        { at: 3.0, x: 50.6, y: 3.3, height: 8.6, width: 13, move: 1.0 },
        // Arrive before Mamma speaks at 5.6: reading holds the camera with the story.
        { at: 4.0, x: 57.6, y: 3.6, height: 10, width: 26.6, move: 1.5 },
      ],
      actors: {
        mamma: [
          { at: 0, x: SHORE.mamma, y: 0, z: SHORE_Z.mamma, face: 0.45, move: 0.01, act: 'look', aim: GROWN },
          { at: 3.3, act: 'gasp' },
          { at: 5.4, act: 'wave', aim: GROWN },
          // A step down to the water, to him.
          { at: 7.6, x: SHORE.mamma - 0.8, z: SHORE_Z.mamma + 0.4, move: 1.1, act: 'look', aim: GROWN },
          { at: 9.2, aim: FACE.moa },
          { at: 11.0, aim: FACE.bertil },
          { at: 11.7, act: 'nod', aim: FACE.bertil },
          { at: 12.9, act: 'look', aim: FACE.mormor },
          { at: 14.7, aim: FACE.morfar },
          { at: 16.4, aim: GROWN },
        ],
        pappa: [
          { at: 0, x: SHORE.pappa, y: 0, z: SHORE_Z.pappa, face: 0.45, move: 0.01, act: 'look', aim: GROWN },
          { at: 3.4, act: 'startle' },
          { at: 5.6, act: 'look', aim: FACE.mamma },
          // "Och du har båda trägubbarna!": at the two of them in his hands.
          { at: 7.3, act: 'point', aim: { x: TASTE + 0.3, y: 2.0, z: 0.2 } },
          { at: 9.0, act: 'cheer' },
          { at: 11.0, act: 'look', aim: FACE.bertil },
          { at: 12.0, act: 'nod', aim: FACE.bertil },
          { at: 13.2, x: SHORE.pappa - 0.4, z: SHORE_Z.pappa + 0.3, move: 0.9, act: 'look', aim: FACE.mormor },
          { at: 14.8, aim: FACE.morfar },
          { at: 16.4, aim: GROWN },
        ],
        moa: [
          { at: 0, x: SHORE.moa, y: 0, z: SHORE_Z.moa, face: 0.45, move: 0.01, act: 'look', aim: GROWN },
          { at: 3.3, act: 'startle' },
          { at: 5.2, act: 'wave', aim: GROWN },
          { at: 7.4, act: 'look', aim: FACE.pappa },
          { at: 9.0, act: 'cheer' },
          { at: 11.0, act: 'look', aim: FACE.bertil },
          { at: 11.6, act: 'shrug' },
          { at: 12.9, act: 'look', aim: FACE.mormor },
          { at: 14.6, aim: FACE.morfar },
          { at: 16.3, act: 'wave', aim: GROWN },
        ],
        bertil: [
          { at: 0, x: SHORE.bertil, y: 0, z: SHORE_Z.bertil, face: 0.45, move: 0.01, act: 'look', aim: GROWN },
          { at: 3.2, act: 'cheer' },
          { at: 5.6, act: 'look', aim: FACE.mamma },
          { at: 7.4, aim: GROWN },
          { at: 9.2, aim: FACE.moa },
          // Dreaming of the journey to come: far away over the lake, where the sun is.
          { at: 10.8, act: 'point', aim: { x: 96, y: 9, z: -30 } },
          { at: 12.6, act: 'look', aim: FACE.mormor },
          { at: 14.4, act: 'stomp' },
          { at: 15.2, act: 'look', aim: FACE.morfar },
          { at: 16.4, aim: GROWN },
        ],
      },
      elof: [
        // It glitters in his hands as he looks at it ("Det glittrar!"), and then he tastes it.
        { at: 0, act: 'hands', size: 1 },
        { at: 1.3, act: 'eat' },
        { at: 3.1, act: 'startle', size: 3, move: 2.4 },
        { at: 5.6, act: 'watch', aim: { x: 66, y: 4, z: -1.5 } },
        { at: 7.4, act: 'nod', aim: FACE.pappa },
        { at: 9.2, act: 'watch', aim: FACE.moa },
        { at: 11.0, aim: FACE.bertil },
        { at: 12.8, aim: FACE.mormor },
        { at: 14.6, aim: FACE.morfar },
        { at: 16.4, act: 'nod', aim: { x: 66, y: 4, z: -1.5 } },
      ],
      fx: [
        // The taste, a held breath, and the glitter swirls up round him: POFF.
        { at: 2.3, kind: 'sparkle', from: { x: TASTE, y: 0.9, z: 0.1 }, seconds: 3.0 },
        { at: 3.0, kind: 'poff', from: { x: TASTE, y: 0.8, z: 0.2 }, seconds: 2.5 },
      ],
    },
  },
  {
    // 5. Home, all of them together: he walks off the stone into the shallows and through them (the ride `home`, on his
    // own feet), up onto the shore; Mamma comes down to the water to meet him, and they walk on with him, their eyes on
    // him, and gather round him. Klonk hops ahead (`ghost`).
    id: 'hem',
    on: 'home',
    seconds: 12.4,
    stage: {
      actors: {
        mamma: [
          { at: 0.3, act: 'look', aim: walkedTo(1.2) },
          { at: 2.4, aim: walkedTo(3.6) },
          // Down to the water's edge, her hand out to him as he comes up out of it.
          { at: 3.2, x: SHORE.mamma - 1.2, z: SHORE_Z.mamma + 0.5, move: 1.2, act: 'offer', aim: { x: 62.8, y: 2.2, z: 0 } },
          { at: 5.8, x: HOME_AT.mamma.x, z: HOME_AT.mamma.z, move: 2.8, act: 'look', aim: walkedTo(8.4) },
          { at: 8.8, face: 0.4, act: 'nod', aim: walkedTo(9.6) },
          { at: 10.6, act: 'look', aim: FACE.mormor },
        ],
        pappa: [
          { at: 0.5, act: 'look', aim: walkedTo(1.6) },
          { at: 3.0, aim: walkedTo(4.4) },
          { at: 6.4, x: HOME_AT.pappa.x, z: HOME_AT.pappa.z, move: 2.8, aim: walkedTo(9) },
          { at: 9.4, face: 0.48, aim: walkedTo(9.6) },
          { at: 10.2, act: 'nod' },
          { at: 11.4, act: 'look', aim: { x: 90, y: 3, z: -6 } },
        ],
        moa: [
          { at: 0.4, act: 'look', aim: walkedTo(1.4) },
          { at: 2.8, act: 'wave', aim: walkedTo(3.6) },
          { at: 7.0, x: HOME_AT.moa.x, z: HOME_AT.moa.z, move: 2.6, act: 'look', aim: walkedTo(9.2) },
          { at: 9.8, face: 0.44, act: 'cheer' },
          { at: 11.4, act: 'look', aim: walkedTo(9.6) },
        ],
        bertil: [
          { at: 0.6, act: 'look', aim: walkedTo(1.8) },
          { at: 3.6, act: 'cheer' },
          // Ahead, the way they go home.
          { at: 7.4, x: HOME_AT.bertil.x, z: HOME_AT.bertil.z, move: 2.6, act: 'look', aim: { x: 92, y: 2, z: -4 } },
          { at: 10.2, face: 0.46, aim: walkedTo(9.6) },
          { at: 11.0, act: 'wave', aim: walkedTo(9.6) },
        ],
      },
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
      // Själevad's church on the far shore, small and pale, where the bog's nearest far picture is open (x 25 to 59): seen
      // past the jetty's lamps, ahead of the owl's flight and over the stone where the eye opens. Just behind that picture,
      // whose land hides its foot and whose mist lies over it; any further back the haze would take it.
      { kind: 'church', x: 31, z: -38, y: 1.8, width: 26, height: 18, size: 0.1 },
    ],
    glows: [
      // A warm place on the cold stone, where the two of them are.
      { at: { x: FIGURES + 0.1, y: 1.2 }, z: -1, size: 3.8, after: 'eye' },
    ],
  },
  spawn: { x: 1, y: 0.01 },
  // Let the walk home pass its last candy before the end card opens: among the family on the shore.
  goalX: 70,
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
    { x: 60, y: -6 },
    { x: 62.2, y: -0.9 },
    { x: 63.8, y: 0 },
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
    // Held out at the end of the meeting, and not there before it.
    { id: 'gift', look: 'gold', at: { x: GIFT, y: 0.6 }, verb: 'take', word: 'soTakeGold', needs: 'scene:motet', after: 'gift:out' },
    { id: 'taste', at: { x: TASTE, y: 0.6 }, verb: 'take', word: 'taste', needs: 'beat:soMagic' },
    { id: 'home', at: { x: HOME.from.x, y: 0.6 }, verb: 'take', word: 'goHome', needs: 'scene:stor', ride: 'home' },
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
    // The family on the far shore with their lamps, once the storm has let go; mormor with her lantern, which she lifts to
    // light his way as he sets off home; morfar.
    { look: 'mormor', at: { x: MORMOR.x, y: 0 }, z: MORMOR.z, after: 'taste' },
    { look: 'morfar', at: { x: MORFAR.x, y: 0 }, z: MORFAR.z, after: 'taste' },
  ],
  ghost: [
    // Klonk is beside him now: on the jetty, then across with the owl, then a little behind the figures on the stone, out
    // of his way as he goes up to them; and home with him, ahead of him over the shallows, to the shore.
    { at: { x: 11, y: 0 }, until: 'owl' },
    { at: { x: 44.6, y: 0.6 }, until: 'scene:rockav', near: 99 },
    { at: { x: KLONK.x, y: KLONK.y }, z: KLONK.z, until: 'home', near: 99 },
    { at: { x: 57, y: 0.6 }, z: -0.9, near: 1.6 },
    { at: { x: 64.8, y: 0 }, z: -0.6, near: 2.2 },
    { at: { x: 72.2, y: 0 }, z: -0.5, near: 0 },
  ],
  beats: [
    { id: 'soFar', on: 'scene:lampa:bertil', who: 'elof', line: 'soFarLine', read: true },
    { id: 'soOwl', on: 'owl:ready', who: 'elof', line: 'soOwlCome', read: true },
    { id: 'soGold', on: 'gift', who: 'elof', line: 'soGoldLine', read: true },
    { id: 'soLast', on: 'gift', who: 'elof', line: 'soLastOne', read: true },
    { id: 'soShare', on: 'gift', who: 'elof', line: 'soShareLine', read: true },
    { id: 'soMagic', on: 'beat:soShare', until: 'taste', who: 'elof', line: 'soMagicLine', read: true },
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
    // Nothing sweet stands between him and the two of them, nor where Klonk waits.
    ...[41.4, 43.4, 45.4, 48.2, 50.6, 52.6].map((x) => ({ x, y: 1.05 })),
    // Along the way home, over his feet: on the stone, over the shallows, on the shore.
    ...walkedAll(HOME, [0.12, 0.22, 0.32, 0.42, 0.52, 0.62, 0.72, 0.82]),
  ],
};

/** What "Just nu" says here. */
export const context: Chooser = (has) => {
  if (has('scene:stor')) return ['soGoHome', 'soFamilyShore', 'house'];
  if (has('taste')) return ['soGrow', 'soFamilyShore', 'sparkle'];
  if (has('gift')) return ['soTaste', 'soFriends', 'sparkle'];
  if (has('scene:motet')) return ['soGift', 'soFriends', 'sparkle'];
  if (has('eye')) return ['soMeet', 'soFriends', 'heart'];
  if (has('owl:ready') && !has('owl')) return ['soBoard', 'soFamilyLamps', 'sparkle'];
  if (has('owl:call')) return ['soRide', 'soFamilyLamps', 'water'];
  if (has('scene:lampa:bertil')) return ['soReach', 'soFamilyLamps', 'water'];
  return ['soLamps', 'soFamilyDark', 'water'];
};
