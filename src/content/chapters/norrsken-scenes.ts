import type { SceneDef } from '../../sim/scene';

/** Where the ghost is, beside the crack, while they pull: a step behind him, on his side of it. */
const BEHIND = -0.95;
/** Where it waits with the bag once the trägubbe is out (norrsken.ts, its second place). */
const AHEAD = { x: 19.4, z: -0.6 };

/**
 * The rescue and the reunion have visible beginnings; nobody appears on the word "Smaka".
 *
 * The rescue is one lowering and one pull (Olov, 13 November 2026: "När man hissar ner röda snöret till trägubben som
 * fastnat så gör man det två gånger"): *Sänk snöret* and the loop takes hold (`snoret`); *Dra upp*, and he and the
 * ghost heave it up in one go (`hissa`); and he lifts it out onto the rock (`uppdragen`).
 */
export const NORRSKEN_SCENES: readonly SceneDef[] = [{
  id: 'snoret', on: 'lower', from: 9.2, before: 17.7, until: 'placed:tragubbe', seconds: 2.6, hold: true,
  cues: [{ at: 2.3, flag: 'nr:rope-ready' }],
  stage: {
    // Keep the whole stranded figure below the lip visible in a short landscape frame too.
    shots: [{ at: 0, x: 11.8, y: -1.05, height: 5.4, width: 4.5, eye: .4, move: .65 }],
    elof: [{ at: 0, act: 'crouch', aim: { x: 12.4, y: -2.3, z: 0 }, face: .05 },
      { at: .45, act: 'reach', aim: { x: 12.4, y: -1.2, z: .1 } }],
  },
}, {
  // Dra upp: he stands, the ghost waddles up behind him and takes the lace's end, and the two of them heave three
  // times while the trägubbe comes up the crack, all the way, in one go (the mover, from `nr:heave`). The heaves are
  // drawn by the picture (src/render/norrsken-rescue.ts, `heaveAt`). The picture follows it up to the lip.
  id: 'hissa', on: 'haul', from: 9.2, before: 17.7, until: 'placed:tragubbe', seconds: 3.1, hold: true,
  cues: [{ at: .35, flag: 'nr:heave' }],
  stage: {
    shots: [
      { at: 0, x: 11.5, y: -1.05, height: 5.4, width: 5.2, eye: .4, move: .5 },
      { at: 1.3, x: 11.5, y: -.3, height: 4.6, width: 5.2, move: 1 },
      { at: 2.4, x: 11.6, y: .5, height: 3.8, width: 5, move: .6 },
    ],
    elof: [{ at: 0, act: 'stand', face: .05 }],
    actors: { ghost: [
      // From where it waited by the pine (norrsken.ts, its first place).
      { at: 0, x: 9.2, y: 0, z: 0, face: 0, move: .01 },
      { at: .05, byElof: BEHIND, z: .05, move: .45, act: 'waddle' },
      // Each heave a little step back, the lace taut between them.
      { at: .5, act: 'grab' },
      { at: 1.15, byElof: BEHIND - .15, move: .3, act: 'grab' },
      { at: 1.8, byElof: BEHIND - .3, move: .3, act: 'grab' },
      { at: 2.55, act: 'hop' },
    ] },
  },
}, {
  id: 'uppdragen', on: 'placed:tragubbe', from: 9.2, before: 17.7, until: 'bag', seconds: 2.9, hold: true,
  stage: {
    shots: [{ at: 0, x: 11.9, y: .8, height: 3.4, width: 4.6, move: .5 }],
    elof: [
      { at: 0, lift: { x: .7, y: 0, z: .05 }, move: .55, face: .08, act: 'crouch', aim: { x: 12.4, y: .6, z: .1 } },
      { at: .6, act: 'lift', aim: { x: 12, y: .6, z: .2 } },
      { at: 2.2, act: 'crouch' },
      { at: 2.5, lift: { x: 0, y: 0, z: 0 }, move: .4, act: null },
    ],
    // It is glad with him while he lifts it out, and then goes on ahead, behind the path, to wait with the bag where
    // the simulation has it next: no jump as the scene lets it go.
    actors: { ghost: [
      { at: 0, byElof: BEHIND - .3, z: .05, face: 0, act: 'hop' },
      { at: 1.3, act: 'tilt' },
      { at: 2, x: AHEAD.x, z: AHEAD.z, move: .9, act: 'hop' },
    ] },
  },
}, {
  id: 'aterfunna', on: 'taste', from: 25, before: 35, until: 'home', seconds: 10.8, hold: true,
  resumeAt: { x: 26.6, y: 0 }, resumeReading: true,
  lines: [
    { at: 3, who: 'mamma', line: 'nrHowAreYou' },
    { at: 3.6, who: 'elof', line: 'nrAllRight' },
    { at: 4.2, who: 'pappa', line: 'first1', id: 'first1' },
    { at: 4.8, who: 'pappa', line: 'first2', id: 'first2' },
    { at: 5.4, who: 'pappa', line: 'first3', id: 'first3' },
    { at: 6, who: 'pappa', line: 'first4', id: 'first4' },
    { at: 6.6, who: 'elof', line: 'nrGhostHelped' },
    { at: 7.2, who: 'elof', line: 'nrStuck' },
    { at: 7.8, who: 'elof', line: 'nrLonely' },
    { at: 8.4, who: 'pappa', line: 'nrTogether' },
    { at: 9, who: 'moa', line: 'nrBrave' },
    { at: 9.6, who: 'elof', line: 'nrBothHome' },
    { at: 10.2, who: 'mamma', line: 'nrGoHome' },
  ],
  stage: {
    // Mamma and Pappa stand 5.2 EL tall: at a picture 6.4 high round 2, Mamma's face was under the scene's top bar
    // while she asked "Elof! Hur mår du?", and so was Pappa's as he came. A little higher, their faces are in it too.
    shots: [
      { at: 0, x: 27.6, y: 1.8, height: 6, width: 7.6, move: .6 },
      { at: 1.1, x: 28.8, y: 2.7, height: 7, width: 9.2, move: 1 },
      { at: 4, x: 27.7, y: 2.6, height: 6.4, width: 6.6, move: .7 },
      { at: 9.8, x: 28.6, y: 2.7, height: 7, width: 9, move: .6 },
    ],
    actors: {
      mamma: [
        { at: 0, x: 44, y: 0, z: -.8, face: .5, act: 'stand', away: false },
        { at: .55, x: 25.3, z: -.9, move: 1.9, act: 'walk' },
        { at: 2.45, act: 'look', face: .06, move: .4, aim: { x: 26.6, y: 2.6, z: 0 } },
        { at: 10.8, away: true },
      ],
      pappa: [
        { at: 0, x: 47, y: 0, z: -1.3, face: .5, act: 'stand', away: false },
        { at: 1, x: 29.4, z: -.8, move: 2, act: 'walk' },
        { at: 3, act: 'look', face: .4, aim: { x: 26.6, y: 2.4, z: 0 } },
        { at: 4.1, act: 'kneel', aim: { x: 27, y: .65, z: .1 } },
        { at: 8.4, act: 'nod' },
        { at: 9.7, act: 'stand', face: .25 },
        { at: 10.8, away: true },
      ],
      moa: [
        { at: 0, x: 46, y: 0, z: -2.1, face: .5, act: 'stand', away: false },
        { at: 1.15, x: 30.9, z: -.9, move: 1.8, act: 'walk' },
        { at: 3, act: 'watch', face: .4, aim: { x: 26.6, y: 2.5, z: 0 } },
        { at: 9, act: 'nod' },
        { at: 10.8, away: true },
      ],
      // Behind the path like the others: at 0.3 EL back, Elof, grown big, walked through him on his way to the way home.
      bertil: [
        { at: 0, x: 45, y: 0, z: -1.1, face: .5, act: 'stand', away: false },
        { at: 1.05, x: 32.1, z: -1.1, move: 1.85, act: 'walk' },
        { at: 3, act: 'watch', face: .42, aim: { x: 26.6, y: 2.5, z: 0 } },
        { at: 8.7, act: 'cheer' },
        { at: 10.8, away: true },
      ],
    },
    elof: [
      { at: 0, act: 'hands', face: .08 },
      { at: 2.7, act: 'wave', aim: { x: 25.3, y: 4.6, z: -.9 } },
      { at: 4, act: 'watch', aim: { x: 29.4, y: 2.8, z: -.8 } },
      { at: 6.6, act: 'point', aim: { x: 28, y: .6, z: .1 } },
      { at: 9.6, act: 'nod' },
    ],
  },
}];
