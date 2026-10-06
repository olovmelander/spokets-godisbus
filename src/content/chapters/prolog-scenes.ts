import type { SceneDef } from '../../sim/scene';

/**
 * The prologue as it is told now (docs/narrative-audit.md, "the intro"): a Saturday morning at home, the ghost
 * waking from its wood, the theft, the shrinking whose cause is seen, and a family who are frightened for him
 * and then stand by him. Units: EL. Elof is drawn three times his small size until the star (`size`).
 *
 * The set: the kitchen table (x 3 to 8, behind the play plane), Pappa's chair behind it and Moa's at its end,
 * the window with the jay at x 9.4, Pappa's shelf with its empty first place over the table, the doorway at
 * x 12 whose hinge tears the bag, the hall, the veranda, and from x 38 the deck, out of doors.
 */

/** Where the new carving stands on the table for its eyes, and where the bag stands. */
const CARVING = { x: 4.6, y: 1.65, z: -1.15 };
const BAG = { x: 7.1, y: 1.65, z: -1.25 };
/** The empty place first in the row on Pappa's shelf (the shelf's middle less 3.6). */
const EMPTY = { x: -1.2, y: 6.1, z: -8.5 };
const WINDOW = { x: 9.4, y: 5.4, z: -9 };
/** Where Elof is when he runs into the star and it makes him small (the star lies a reach further on). */
const STAR = 40.5;
const PALM = { x: STAR + 1.0, y: 1.75, z: -0.55 };
/** The deck's railing, along its far side (ends.ts, `prologue.rail`). */
const RAIL = { z: -3.4 };

/**
 * The morning's first shot, alive, under the title (docs/ux-audit/first-minutes.md row 4): Pappa carves and the
 * curls fly, Moa draws, Mamma sips, Bertil watches. The title shows it; the director never plays it. "Börja" goes
 * on into the morning from this same shot, with no black between (row 16).
 */
export const TITLE_TABLEAU: SceneDef = {
  id: 'title',
  seconds: 0,
  by: { done: 'scene:morgon' },
  stage: {
    shots: [{ at: 0, x: 5.85, y: 2.3, height: 2.5, width: 3.8, eye: 0.15, move: 0.01 }],
    actors: {
      pappa: [{ at: 0, x: 5.8, y: 0, z: -3.15, face: 0.25, move: 0.01, act: 'carve', holds: 'knife' }],
      // As far carved as the morning has it when the title gives way to it.
      ghost: [{ at: 0, x: 5.95, y: 2.1, z: -1.95, face: 0.25, move: 0.01, act: 'carved', rough: 0.76 }],
      mamma: [{ at: 0, x: 10.4, y: 0, z: -2.0, face: 0.4, move: 0.01, act: 'sip', holdsLeft: 'mug', aim: { x: 6, y: 2.5, z: -2 } }],
      bertil: [{ at: 0, x: 7.7, y: 0, z: -3.3, face: 0.28, move: 0.01, act: 'look', aim: { x: 5.9, y: 2.2, z: -2 } }],
      moa: [{ at: 0, x: 9.05, y: 0, z: -1.5, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' }],
    },
    elof: [{ at: 0, act: 'watch', aim: { x: 5.9, y: 2.3, z: -2 } }],
    fx: [{ at: 0, kind: 'shavings', from: { x: 5.95, y: 2.4, z: -1.9 }, seconds: 3600 }],
  },
};

export const PROLOG_SCENES: SceneDef[] = [
  TITLE_TABLEAU,
  {
    // 1. Lördagsmorgon. Pappa carves the ghost out of a block, the curls fly; Moa draws; Bertil's hand creeps
    // towards the Saturday bag, and Mamma's look stops it. Pappa blows the last shavings off, sets the ghost
    // down before Elof, and holds out the brush: the eyes are Elof's to paint (plan §3.3 rule 1).
    id: 'morgon',
    // At the table where he starts: a game taken up further on has had its morning.
    at: 1.5,
    until: 'eye',
    seconds: 10.5,
    hold: true,
    lines: [
      { at: 5.5, who: 'mamma', line: 'notYet' },
      { at: 9.0, who: 'pappa', line: 'newGhost' },
    ],
    stage: {
      fade: [{ at: 0, to: 1, move: 0.01 }, { at: 0.1, to: 0, move: 1.8 }],
      words: [{ at: 0.9, seconds: 3.6, kind: 'caption', text: 'morning' }],
      shots: [
        { at: 0, x: 5.85, y: 2.3, height: 2.5, width: 3.8, eye: 0.15, move: 0.01 },
        { at: 3.4, x: 6.1, y: 2.9, height: 5.8, width: 9.5, move: 3.4 },
        { at: 7.4, x: 5.0, y: 3.4, height: 8.2, width: 15, move: 2.2 },
      ],
      actors: {
        pappa: [
          { at: 0, x: 5.8, y: 0, z: -3.15, face: 0.25, move: 0.01, act: 'carve', holds: 'knife' },
          { at: 7.2, act: 'blow', holds: null },
          { at: 8.0, act: 'reach', aim: { x: CARVING.x, y: CARVING.y + 0.35, z: CARVING.z } },
          { at: 8.9, act: 'offer', holds: 'brush', aim: { x: 2.3, y: 2.3, z: 0 } },
        ],
        ghost: [
          { at: 0, x: 5.95, y: 2.1, z: -1.95, face: 0.25, move: 0.01, act: 'carved', rough: 1 },
          { at: 0.3, rough: 0, move: 6.6 },
          { at: 8.0, x: CARVING.x, y: CARVING.y, z: CARVING.z, move: 0.8 },
        ],
        mamma: [
          { at: 0, x: 10.4, y: 0, z: -2.0, face: 0.4, move: 0.01, act: 'sip', holdsLeft: 'mug', aim: { x: 6, y: 2.5, z: -2 } },
          { at: 5.2, act: 'look', aim: { x: 7.7, y: 2.9, z: -3.3 } },
          { at: 7.8, act: 'sip', aim: { x: 5, y: 2.2, z: -1.2 } },
        ],
        bertil: [
          { at: 0, x: 7.7, y: 0, z: -3.3, face: 0.28, move: 0.01, act: 'look', aim: { x: 5.9, y: 2.2, z: -2 } },
          { at: 3.6, act: 'sneak', aim: { x: BAG.x, y: BAG.y + 0.4, z: BAG.z } },
          { at: 5.6, act: 'startle' },
          { at: 6.3, act: 'shrug' },
          { at: 7.3, act: 'look', aim: { x: CARVING.x, y: 2.2, z: CARVING.z } },
        ],
        moa: [
          { at: 0, x: 9.05, y: 0, z: -1.5, face: 0.5, move: 0.01, act: 'draw', holds: 'crayon' },
          { at: 8.4, act: 'sit', holds: null, aim: { x: CARVING.x, y: 2.2, z: CARVING.z } },
        ],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: 5.9, y: 2.3, z: -2 } }],
      fx: [
        { at: 0.3, kind: 'shavings', from: { x: 5.95, y: 2.4, z: -1.9 }, seconds: 6.7 },
        { at: 7.4, kind: 'shavings', from: { x: 5.95, y: 2.5, z: -1.8 }, seconds: 0.9 },
      ],
    },
  },
  {
    // 2. The ghost wakes. The jay lands at the window and every grown-up turns to it: only Elof sees the painted
    // eyes catch the light. It blinks, wobbles, looks at him, at the empty place on the shelf, and at the bag.
    // It takes the bag in both hands, and its magic runs into it: two sweets inside begin to glitter.
    id: 'vaknar',
    on: 'paint',
    until: 'blink',
    seconds: 7.4,
    hold: true,
    cues: [{ at: 5.0, flag: 'woke' }, { at: 5.6, flag: 'grab' }, { at: 7.4, flag: 'blink' }],
    lines: [
      { at: 0.15, who: 'mamma', line: 'jayWindow' },
      { at: 6.3, who: 'elof', line: 'stolenBag' },
    ],
    stage: {
      shots: [
        { at: 0, x: 5.6, y: 3.0, height: 5.4, width: 9, move: 0.8 },
        { at: 1.6, x: 4.7, y: 2.35, height: 3.1, width: 5.2, move: 0.9 },
        { at: 3.2, x: 2.4, y: 4.1, height: 6.8, width: 9, move: 0.9 },
        { at: 4.4, x: 5.7, y: 2.5, height: 4.2, width: 7.2, move: 0.8 },
        { at: 6.0, x: 7.4, y: 2.7, height: 6.4, width: 12, move: 1.0 },
      ],
      actors: {
        mamma: [
          { at: 0, act: 'point', aim: WINDOW, face: 0.62 },
          { at: 0.7, x: 9.7, z: -3.7, move: 0.8, face: 0.74, act: 'look', aim: WINDOW },
        ],
        pappa: [
          { at: 0.2, act: 'stand', holds: null },
          { at: 0.6, x: 7.7, z: -4.3, move: 1.0, face: 0.7, act: 'look', aim: WINDOW },
        ],
        bertil: [{ at: 0.3, x: 8.9, z: -4.7, move: 0.9, face: 0.76, act: 'look', aim: WINDOW }],
        moa: [
          { at: 0.4, face: 0.66, act: 'sit', aim: WINDOW },
          // Only Moa looks back at the table, as the magic runs into the bag: she sees it glitter (she says so
          // on the deck), and is turned to the jay again before the ghost hops away.
          { at: 5.3, face: 0.5, move: 0.3, aim: { x: BAG.x, y: BAG.y + 0.3, z: BAG.z } },
          { at: 6.15, face: 0.66, move: 0.3, aim: WINDOW },
        ],
        ghost: [
          { at: 0, x: CARVING.x, y: CARVING.y, z: CARVING.z, face: 0.25, move: 0.01, act: 'carved' },
          { at: 0.6, act: 'wake' },
          { at: 1.8, act: 'tilt' },
          { at: 2.5, act: 'look', aim: { x: 3.7, y: 2.6, z: 0.2 }, face: 0.38 },
          { at: 3.2, act: 'look', aim: EMPTY, face: 0.6 },
          { at: 4.4, act: 'look', aim: { x: BAG.x, y: BAG.y + 0.4, z: BAG.z }, face: 0 },
          { at: 5.0, act: 'waddle', x: 6.5, y: CARVING.y, z: -1.2, move: 0.6 },
          { at: 5.6, act: 'grab' },
          { at: 6.4, act: 'hop', face: 0 },
        ],
      },
      elof: [
        { at: 2.5, act: 'startle', aim: { x: CARVING.x, y: 2.4, z: CARVING.z } },
        { at: 3.4, act: 'watch', aim: EMPTY },
        { at: 4.5, act: 'watch', aim: { x: BAG.x, y: 2.0, z: BAG.z } },
        { at: 6.2, act: 'point', aim: { x: 6.5, y: 2.2, z: -1.2 } },
      ],
      fx: [
        { at: 0, kind: 'jay', from: { x: WINDOW.x, y: 3.55, z: -8.6 }, seconds: 7.4 },
        { at: 0.6, kind: 'sparkle', from: { x: CARVING.x, y: 2.0, z: CARVING.z }, seconds: 1.9 },
        { at: 5.6, kind: 'stream', from: { x: 6.5, y: 2.5, z: -1.2 }, to: { x: 7.0, y: 2.25, z: -1.35 }, seconds: 1.2 },
      ],
    },
  },
  {
    // The first freeze joke, played by the prologue's own clock (src/sim/prologue.ts): Mamma turns round, the
    // ghost drops stiff in mid-hop, and Mamma sees only a carving on the floor. Then they all go after Elof.
    id: 'prologue:mamma',
    by: { done: 'mamma:passed' },
    seconds: 2.6,
    stage: {
      actors: {
        mamma: [
          { at: 0, face: 0.05, act: 'look', aim: { x: 10.9, y: 0.6, z: 0 } },
          { at: 0.5, x: 10.4, z: -1.9, move: 0.9, face: 0.08, act: 'look', aim: { x: 10.9, y: 0.4, z: 0 } },
          { at: 1.5, act: 'shrug' },
          { at: 2.4, act: 'stand', follow: 5.2 },
        ],
        pappa: [
          { at: 0.2, face: 0.32, act: 'look', aim: { x: 6, y: 1.5, z: 0 } },
          { at: 2.4, act: 'stand', follow: 2.7, z: -2.5 },
        ],
        moa: [
          { at: 0.3, act: 'stand', face: 0.3 },
          { at: 2.4, act: 'stand', follow: 3.7, z: -1.5 },
        ],
        bertil: [
          { at: 0.25, act: 'startle', face: 0.3 },
          { at: 2.4, act: 'stand', follow: 4.5, z: -0.9 },
        ],
      },
      elof: [{ at: 0.2, act: 'watch', aim: { x: 10.9, y: 0.6, z: 0 } }],
    },
  },
  {
    // 3. POFF. He holds up the star that fell from the torn bag; it glitters as the bag did, and makes him as
    // small as the ghost. The camera goes down with him to the planks. The ghost turns: they look at each other.
    id: 'poff',
    on: 'star',
    from: 39.5,
    until: 'pappa:noticed',
    seconds: 4.4,
    hold: true,
    lines: [{ at: 2.7, who: 'elof', line: 'sameSize' }],
    stage: {
      shots: [
        { at: 0, x: 40.4, y: 1.6, height: 6.4, width: 10.5, move: 0.7 },
        { at: 1.0, x: 41.2, y: -0.15, height: 3.0, width: 5.2, eye: -0.1, move: 1.3 },
        { at: 2.8, x: 42.6, y: 0.05, height: 3.3, width: 6.8, move: 0.9 },
      ],
      actors: {
        mamma: [{ at: 1.0, act: 'gasp' }],
        pappa: [{ at: 1.0, act: 'startle', follow: null }, { at: 1.8, act: 'look', aim: { x: STAR, y: -0.4, z: 0 } }],
        moa: [{ at: 1.0, act: 'startle', follow: null }, { at: 1.8, act: 'look', aim: { x: STAR, y: -0.4, z: 0 } }],
        bertil: [{ at: 1.0, act: 'startle', follow: null }, { at: 1.8, act: 'look', aim: { x: STAR, y: -0.4, z: 0 } }],
        ghost: [
          { at: 0, x: 44.4, y: -0.8, z: 0, face: 0, move: 0.01, act: 'stand' },
          { at: 1.2, face: 0.5, act: 'look', aim: { x: STAR, y: -0.3, z: 0 } },
          { at: 2.0, act: 'tilt' },
          { at: 3.2, act: 'peek' },
        ],
      },
      elof: [
        { at: 0, act: 'show', size: 3 },
        { at: 1.0, act: 'startle', size: 1 },
        { at: 2.4, act: 'hands' },
        { at: 3.4, act: 'watch', aim: { x: 44.4, y: -0.3, z: 0 } },
      ],
      fx: [
        { at: 0, kind: 'glow', from: { x: STAR + 0.3, y: 2.5, z: 0.3 }, seconds: 1.1 },
        { at: 0, kind: 'sparkle', from: { x: STAR, y: 1.9, z: 0.1 }, seconds: 1.3 },
        { at: 1.0, kind: 'poff', from: { x: STAR, y: 0.2, z: 0.2 }, seconds: 1.2 },
      ],
    },
  },
  {
    // 4. The giants come down to him: Mamma on her knees with her hands to her mouth, Moa and Bertil crouched,
    // and Pappa holds his open hand on the planks beside him. The camera is at Elof's height, looking up.
    id: 'familj',
    on: 'scene:poff',
    from: 39.5,
    until: 'pappa:noticed',
    seconds: 6.2,
    hold: true,
    lines: [
      { at: 1.3, who: 'moa', line: 'tiny' },
      { at: 4.6, who: 'mamma', line: 'hurt' },
    ],
    stage: {
      shots: [{ at: 0, x: 41.5, y: 1.5, height: 6.4, width: 8.8, eye: -1.4, move: 0.9 }],
      actors: {
        mamma: [
          { at: 0, x: 39.4, y: -0.8, z: -1.3, face: 0.15, move: 1.0 },
          { at: 1.0, act: 'kneel', aim: { x: STAR, y: -0.4, z: 0 } },
          { at: 1.6, act: 'gasp' },
          { at: 3.4, act: 'look', aim: { x: STAR, y: -0.4, z: 0 } },
        ],
        pappa: [
          { at: 0.2, x: 43.1, y: -0.8, z: -1.4, face: 0.36, move: 1.0 },
          { at: 1.2, act: 'kneel', aim: { x: STAR, y: -0.4, z: 0 } },
          { at: 3.6, act: 'reach', aim: { x: STAR + 0.7, y: -0.65, z: -0.15 } },
        ],
        moa: [
          { at: 0.1, x: 40.1, y: -0.8, z: -2.6, face: 0.26, move: 1.0 },
          { at: 1.1, act: 'crouch', aim: { x: STAR, y: -0.4, z: 0 } },
        ],
        bertil: [
          { at: 0.3, x: 42.3, y: -0.8, z: -2.9, face: 0.3, move: 1.0 },
          { at: 1.3, act: 'crouch', aim: { x: STAR, y: -0.4, z: 0 } },
        ],
      },
      elof: [{ at: 0, act: 'watch', aim: { x: STAR + 0.5, y: 3.2, z: -1.5 } }],
    },
  },
  {
    // 5. He steps onto Pappa's hand (his choice: Använd, *Kliv upp*), and is lifted to their faces. Moa saw the
    // magic go into the bag, and has drawn it: the star made him small, and the gold sweet still in the bag
    // glitters too. Pappa reads her drawing: the gold one can make him big again. Then Elof sees the ghost.
    id: 'handen',
    on: 'hand',
    from: 39.5,
    until: 'pappa:noticed',
    seconds: 10.2,
    hold: true,
    lines: [
      { at: 2.4, who: 'moa', line: 'sawGlitter' },
      { at: 6.3, who: 'pappa', line: 'goldHope' },
    ],
    stage: {
      shots: [
        { at: 0, x: 41.6, y: 0.9, height: 4.2, width: 6.5, move: 0.7 },
        { at: 0.8, x: 41.7, y: 2.3, height: 5.0, width: 7.2, move: 1.5 },
        { at: 2.4, x: 41.3, y: 2.4, height: 5.8, width: 8.2, move: 0.8 },
        { at: 8.2, x: 43.0, y: 1.3, height: 5.4, width: 9.5, move: 0.9 },
      ],
      actors: {
        pappa: [
          { at: 0, act: 'reach', aim: { x: STAR + 0.7, y: -0.65, z: -0.15 } },
          { at: 0.7, act: 'lift', aim: PALM },
          { at: 8.3, act: 'look', aim: { x: 44.4, y: -0.4, z: 0 } },
          { at: 9.2, act: 'reach', aim: { x: STAR + 0.4, y: -0.7, z: -0.2 } },
        ],
        mamma: [{ at: 0.5, act: 'look', aim: { x: PALM.x, y: PALM.y + 0.6, z: PALM.z } }],
        moa: [
          { at: 1.8, act: 'stand' },
          { at: 2.2, act: 'show', holds: 'drawing' },
          { at: 8.0, act: 'crouch', holds: null, aim: { x: 44.4, y: -0.4, z: 0 } },
        ],
        bertil: [
          { at: 0.6, act: 'look', aim: { x: PALM.x, y: PALM.y + 0.6, z: PALM.z } },
          { at: 7.0, act: 'cheer' },
          { at: 8.4, act: 'crouch', aim: { x: 44.4, y: -0.4, z: 0 } },
        ],
      },
      elof: [
        // He steps onto Pappa's hand on the planks, and goes up with it to their faces.
        { at: 0, rides: 'pappa', move: 0.5, act: 'watch', aim: { x: 43.1, y: 2.6, z: -1.4 } },
        { at: 2.6, act: 'watch', aim: { x: 40.4, y: 3.2, z: -2.4 } },
        { at: 6.3, act: 'watch', aim: { x: 43.1, y: 2.6, z: -1.4 } },
        { at: 8.2, act: 'point', aim: { x: 44.4, y: -0.4, z: 0 } },
        // Set down on the planks again, he steps off.
        { at: 9.7, rides: null, move: 0.5, act: null },
      ],
    },
  },
  {
    // The second freeze joke (src/sim/prologue.ts): Pappa looks at the ghost and it stiffens, so he puts the
    // "carving" up on the railing's post; behind his back it hops down and scurries to the deck's edge.
    id: 'prologue:pappa',
    by: { done: 'pappa:done' },
    seconds: 3,
    stage: {
      actors: {
        pappa: [
          { at: 0, act: 'look', aim: { x: 44.4, y: -0.4, z: 0 }, face: 0.15 },
          { at: 0.4, act: 'reach', aim: { x: 44.4, y: -0.2, z: 0 } },
          // He gets up with it and takes it to the railing behind them, at his waist.
          { at: 0.8, act: 'stand' },
          { at: 0.95, x: 45.6, z: RAIL.z + 1.0, move: 0.45, act: 'lift', aim: { x: 46.6, y: 2.1, z: RAIL.z }, face: 0.88 },
          { at: 1.55, act: 'kneel', face: 0.4, aim: { x: STAR, y: -0.4, z: 0 } },
          { at: 2.6, act: 'shrug', face: 0.3 },
        ],
        moa: [{ at: 1.9, act: 'look', aim: { x: 50, y: -0.3, z: 0 } }],
        bertil: [{ at: 1.9, act: 'point', aim: { x: 50, y: -0.3, z: 0 } }],
        mamma: [{ at: 0.4, act: 'look', aim: { x: 46.6, y: 2, z: RAIL.z } }],
      },
      elof: [{ at: 1.8, act: 'point', aim: { x: 50, y: 0, z: 0 } }],
    },
  },
  {
    // 6. The promise. Not held: they kneel along the deck as he goes, and each says one thing as he passes.
    id: 'lofte',
    on: 'pappa:done',
    seconds: 1.6,
    stage: {
      actors: {
        mamma: [
          { at: 0, x: 45.6, y: -0.8, z: -1.7, face: 0.3, move: 1.4, act: 'stand' },
          { at: 1.4, act: 'kneel', aim: { x: 45.6, y: -0.3, z: 0 } },
        ],
        moa: [
          { at: 0, x: 47.6, y: -0.8, z: -2.1, face: 0.3, move: 1.5, act: 'stand' },
          { at: 1.5, act: 'crouch', aim: { x: 47.6, y: -0.3, z: 0 } },
        ],
        bertil: [
          { at: 0, x: 49.4, y: -0.8, z: -1.7, face: 0.3, move: 1.5, act: 'stand' },
          { at: 1.5, act: 'crouch', aim: { x: 49.4, y: -0.3, z: 0 } },
        ],
        pappa: [
          { at: 0, x: 51.7, y: -0.8, z: -2.5, face: 0.34, move: 1.6, act: 'stand' },
          { at: 1.6, act: 'kneel', aim: { x: 51.4, y: -0.3, z: 0 } },
        ],
      },
    },
  },
  {
    // 7. At the deck's edge the garden opens below, the ghost hops down into it with the bag, he turns to wave
    // to them, and turns back to the garden: the game's title over the whole of it.
    id: 'titel',
    at: 51.4,
    needs: 'pappa:done',
    seconds: 7.6,
    hold: true,
    // Their promises are let finish first: he stands at the edge and listens.
    quiet: true,
    cues: [{ at: 0.9, flag: 'leap' }, { at: 7.4, flag: 'titel' }],
    stage: {
      words: [{ at: 4.6, seconds: 3.0, kind: 'title', text: 'title' }],
      shots: [
        { at: 0, x: 52.2, y: -0.1, height: 2.9, width: 5.2, eye: -0.05, move: 0.8 },
        // Down over the edge with it, to the lawn where it lands.
        { at: 0.9, x: 55.0, y: -3.9, height: 7.8, width: 13, move: 1.8 },
        { at: 2.8, x: 51.2, y: 0.8, height: 5.6, width: 10, move: 1.2 },
        { at: 4.4, x: 56.5, y: 1.2, height: 15, width: 28, move: 2.6 },
      ],
      actors: {
        mamma: [{ at: 3.0, act: 'wave' }],
        moa: [{ at: 2.9, act: 'wave' }],
        bertil: [{ at: 3.1, act: 'cheer' }],
        pappa: [{ at: 3.2, act: 'nod' }],
      },
      elof: [
        { at: 0, act: 'watch', aim: { x: 57.5, y: -6, z: 0 }, face: 0 },
        { at: 2.8, face: 0.44, act: 'wave', aim: { x: 49.5, y: 2, z: -2 } },
        { at: 4.6, face: 0, act: 'watch', aim: { x: 70, y: 0, z: -10 } },
      ],
    },
  },
];
