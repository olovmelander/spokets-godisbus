import type { SceneDef } from '../../../sim/scene';
import type { Candy, ChapterData, Climb, Flyby, Jump, Ledge, Mover, Roller, Vec } from '../../../sim/types';
import type { Chooser } from '../context';
import { alongAll, flightAt, round, row, slopeRow, timeCard } from '../kit';

/**
 * Äventyr 2, Kapitel 4: Olympia (docs/aventyr-2.md), Bredbyn's football ground at night in the storm. Units: EL. The
 * power is out, the floodlights stand dark, and the lightning shows the flooded artificial turf for a moment at a
 * time. A football is one and a half Elofs high, so the puzzles are football puzzles. The places, from the left:
 *
 * 1. **Trappan och staketet:** up the stone steps from the road to the ground on its hill, along the gravel path,
 *    and over the high fence by the ball-stop net: up its near side, and a slide down the far side. From the top a
 *    flash shows the whole pitch, and the little one tumbling across it.
 * 2. **Bollarna i blåsten** (the exciting sequence): the wind rolls balls across the small pitch from behind him.
 *    He jumps each one; one that reaches his legs bowls him into the glitter bubble, as the cones on Granskogen's
 *    slope do. The trail floats a little higher here, so that he takes it running or jumping.
 * 3. **Bollen i målet** (the puzzle): the goalmouth of the small goal is a deep puddle, too wide to jump, and a small
 *    ball bobs in it. The answer is behind him: he has run under a table with a big football on it. He goes back, climbs
 *    up behind it, kicks it down onto the turf and on, and it rolls into the puddle and floats there with its top at
 *    his feet, a stepping stone. Then into the goal: "Mål! Jag gjorde mål själv!"
 * 4. **Nätet och ribban** (a side way): a held jump up to the back of the goal's net, the net climbed to the top
 *    of the goal, and the crossbar walked along with the hearts, to a lookout over the whole pitch.
 * 5. **Hörnflaggan och bänkarna:** the corner flag snapping in the wind, and the team benches' roofs pouring:
 *    two runs of drops, read from their shadows, with a dry place between.
 * 6. **Bertils frispark:** the centre circle is a lake, and the old trägubbe is blown over it. "Ropa på
 *    Bertil": he lays the ball ready, Elof climbs onto it, and Bertil's free kick carries him in a great arc over
 *    the water into the far goal.
 * 7. **Skidskyttevallen:** the ski stadium's biathlon range, five black targets in a row. A pine cone thrown at
 *    each turns it white and lets out a heart; all five white, three more. Nothing needs them.
 * 8. **Elljusspåret:** the floodlit trail goes up into the forest, its lamps dark too. A flash: the strongest gust
 *    takes the little one north over the treetops, up towards the lake at Flärken, and the old trägubbe follows.
 *
 * Nothing here has a crest or a sponsor's mark on it. The one word is the hall's name, in white letters, which Olov
 * asked for (CLAUDE.md); otherwise there is no name or letter (plan §0, §2.6): the club's goals, nets, benches and boards
 * are plain. To the simulation the two flooded places are pits, with the water drawn in them.
 */

/** The flooded goalmouth's pit, and the centre circle's: a fall into either ends in the glitter bubble. */
const DEEP = -6;
/**
 * The way up from the road (Olov, 9 November 2026: "Man ska gå upp till Olympia, inte ner."): the ground lies up on its
 * hill, over the road he comes along, and three stone steps of one EL climb to it, each a pull-up (Byn's wall's), with
 * a tread long enough to land on. Each step is where it begins and the height of its top.
 */
const ROAD = -3;
const STEPS = [{ from: 3, y: -2 }, { from: 5.2, y: -1 }, { from: 7.4, y: 0 }];

/**
 * The fence by the ball-stop net: its near side is climbed, and from its top rail he slides down its far side.
 * The far side's net is first in `climbs`: at the top, Använd slides him down that one, not back.
 */
const FENCE = { from: 16, to: 16.8, top: 5.2 };
const FENCE_DOWN: Climb = { x: 17.05, bottom: 0, top: FENCE.top, look: 'hose' };
const FENCE_UP: Climb = { x: 15.75, bottom: 0, top: FENCE.top, exit: 1, look: 'hose' };

/**
 * The balls the wind rolls across the small pitch: the youngest teams' small balls, out of their torn ball bag at
 * the foot of the fence. They set off once he is well past the bag, the first a second after the beat that shows
 * them, and then one every one and a half seconds, more than twice as fast as he runs: always from behind him, and a
 * held jump clears each. They are smaller than the big football of the puzzle: a ball of that size (radius 0.75)
 * rolls higher under him than any jump lifts his legs. The turf is level and whole from the bag to well past the
 * stretch's end.
 */
const BALLS = { from: 17.8, to: 60, y: 0, every: 4.5, speed: 8.5, radius: 0.45, candy: 1.05 };
const ROLLERS: Roller[] = [1, 2.5, 4].map((first) => ({
  from: { x: BALLS.from, y: BALLS.y }, to: { x: BALLS.to, y: BALLS.y }, every: BALLS.every, first, speed: BALLS.speed,
  radius: BALLS.radius, needs: 'beat:ol:wind', until: 'beat:ol:phew',
}));

/** A place to stand, from one side to the other, at one height. */
interface Stone {
  from: number;
  to: number;
  y: number;
}

/**
 * Bollen i målet: the goalmouth's puddle, a hop wider on each side than the ball. The ball floats in its middle
 * with its top level with the turf, mostly under water. The rain water stands nearly up to the turf, as a puddle on a
 * pitch does (Olov, 9 November 2026: "Pölen där man sparkar ner bollen ska bli snyggare."): at 0.7 under it, the
 * puddle was a slot in the pitch, its water out of sight behind the turf in front of it.
 */
const BALL_HIGH = 1.5;
const BANK: Stone = { from: 64, to: 75, y: 0 };
const AFLOAT: Stone = { from: 76.2, to: 77.7, y: 0 };
const FAR: Stone = { from: 78.9, to: 90, y: 0 };
const PUDDLE = { from: BANK.to, to: FAR.from, water: -0.4 };
/** The table the big football lies on: he runs under it on his way to the puddle, and climbs it on his way back. */
const KIT: Ledge = { x: 66.5, y: 1.1, width: 3.8, look: 'plank' };
/**
 * The big football (the puzzle): it lies up on the table, out of his way, and Sparka comes only from behind it, up
 * there. One kick brings it down onto the turf, two roll it to the puddle's edge, and the fourth into the water.
 */
const BALL: Mover = {
  id: 'ol-ball', look: 'football', width: AFLOAT.to - AFLOAT.from, height: BALL_HIGH, verb: 'push', word: 'olKick',
  stops: [{ x: 66.9, y: KIT.y }, { x: 71.8, y: 0 }, { x: 73, y: 0 }, { x: round(BANK.to - BALL_HIGH / 2), y: 0 }, { x: round((AFLOAT.from + AFLOAT.to) / 2), y: AFLOAT.y - BALL_HIGH }],
};
const BALL_WAY: Stone[] = [BANK, AFLOAT, FAR];

/**
 * The small goal beyond the puddle: its mouth towards him at `x`, its net going back `depth`, the top of its side
 * frame at `bar`. He walks in at its mouth along its near side, under the bar.
 */
const GOAL = { x: 80, depth: 7, height: 8, bar: 6 };
/**
 * Nätet och ribban, a side way: the back of the net is climbed from a held jump (its foot is out of reach of his
 * feet as he walks past), and its top steps onto the goal's top bar, a walkway back to the crossbar.
 */
const NET: Climb = { x: round(GOAL.x + GOAL.depth + 0.25), bottom: 0.9, top: GOAL.bar, exit: -1, look: 'hose' };
const CROSSBAR: Ledge = { x: GOAL.x + GOAL.depth / 2, y: GOAL.bar, width: GOAL.depth, look: 'trestle' };

/** The two team benches' clear roofs pour: a run of three drops under each, with a dry place between them. */
const DRIPS = [
  { at: { x: 96, y: 0 }, every: 1.8, first: 0.3 },
  { at: { x: 98.2, y: 0 }, every: 2.2, first: 1.2 },
  { at: { x: 100.4, y: 0 }, every: 1.6, first: 0.7 },
  { at: { x: 106.2, y: 0 }, every: 2, first: 0.5 },
  { at: { x: 108.4, y: 0 }, every: 1.5, first: 1.1 },
  { at: { x: 110.6, y: 0 }, every: 2.4, first: 0.9 },
];
const DRY = 103.3;
/** Where the benches' purpose holds: from just before the first roof to just past the second. */
const BENCHES = { from: 92, to: 113 };

/** The flooded centre circle, and Bertil's free kick over it into the far goal (Granskog's seesaw, as a ball). */
const CIRCLE = { from: 125, to: 146, bottom: -5, water: -0.3 };
// He arrives on top of the ball, then steps down as it rolls farther into the net: never through the turf.
const KICK = { from: { x: 123.4, y: 0 }, to: { x: 149.4, y: 1.7 }, rise: 5, time: 3, corridor: 0.4 };
/** The far goal: a full one, as high as sixteen Elofs, its mouth towards him where the kick comes down. */
const FAR_GOAL = { x: 147.8, depth: 10, height: 16 };

/** The biathlon range's five targets, a lane each on the mat. */
const TARGETS = [158.4, 160, 161.6, 163.2, 164.8];
/** The floodlit trail rises into the forest. */
const TRAIL = { from: 170, to: 177, y: 1.4 };
const trailAt = (x: number) => round((TRAIL.y * (x - TRAIL.from)) / (TRAIL.to - TRAIL.from), 4);

/**
 * At the trail the strongest gust takes the little one north (Olov, 9 November 2026: "Man ser inte när vinden tar
 * lillgubben norrut, för det går alldeles för fort."). It lifts him off the trail ahead, close to the path, and carries
 * him slowly up past the birches and away north over the treetops into the dark, pale in his own
 * glow, the lightning flashing again as he goes; as he is lost, the old trägubbe leaps up from the trail after him.
 * Each was a dark shape across the sky in three seconds, the two at once, behind the words, and went into the forest's
 * edge where the ground ends (`EDGE`, 14 EL high). Now they go up and away from the path, clear of it.
 * They stay on the near side of the trees: retreating into the canopy hid the last half of the flight on a phone.
 */
const EDGE = { x: 186, y: 14 };
const NORTH: Flyby = {
  on: 'beat:ol:gust', from: { x: 177.6, y: 2.4 }, to: { x: 182.6, y: 25 }, z: -0.6, toZ: -0.6, seconds: 6.4, rise: 2.4, size: 1.8,
  who: 'lillgubbe', lit: [2.2, 4.4],
};
/** When the old one leaps after him, in seconds from the gust: as the little one is all but lost. */
const FOLLOWS_AT = 6;
const FOLLOWS = 'ol:old-follows';
const FOLLOW: Flyby = {
  on: FOLLOWS, from: { x: 179.6, y: 1.6 }, to: { x: 183.6, y: 23 }, z: -0.6, toZ: -0.6, seconds: 4.8, rise: 2, size: 1.5,
  who: 'tragubbe', lit: [2],
};
/**
 * Elof stops and watches it all. The camera goes up with the little one, with the same ease as his flight and part of
 * his way, so that he stays in the picture under the words until he is lost over the trees; it comes down to the trail
 * as the old one leaps, and goes up with him a little way. It never goes so far up or along that the forest's edge,
 * the end of the ground, fills the picture.
 */
const GUST_SCENE: SceneDef = {
  id: 'norrut', at: 172.8, before: 178, seconds: 11, hold: true,
  // A flight begins only once this shot has taken over, after the previous words finish.
  cues: [{ at: 0.8, flag: 'ol:north-flight' }, { at: FOLLOWS_AT, flag: FOLLOWS }],
  stage: {
    shots: [
      { at: 0, x: 177.4, y: 4.4, height: 8.6, width: 9.6, move: 0.8 },
      { at: 0.9, x: 180.2, y: 21.2, height: 11.5, width: 10.5, move: 5 },
      { at: FOLLOWS_AT - 0.4, x: 180.6, y: 5, height: 9, width: 9.6, move: 1.1 },
      { at: FOLLOWS_AT + 0.7, x: 181.2, y: 22.2, height: 11, width: 10.5, move: 4.2 },
    ],
    // He points at the little one as the gust takes him and follows him up with his eyes; then the old one.
    elof: [
      { at: 0.15, act: 'point', aim: flightAt(NORTH, 0.25) },
      { at: 2, act: 'look', aim: flightAt(NORTH, 0.55) },
      { at: 3.8, act: 'look', aim: flightAt(NORTH, 0.85) },
      { at: FOLLOWS_AT, act: 'point', aim: flightAt(FOLLOW, 0.3) },
      { at: FOLLOWS_AT + 2, act: 'look', aim: flightAt(FOLLOW, 0.7) },
    ],
  },
};

/** A pit in the ground's outline: down from the turf, across the bottom, and up again. */
const pit = (from: number, to: number, bottom: number): Vec[] => [{ x: from, y: 0 }, { x: from, y: bottom }, { x: to, y: bottom }, { x: to, y: 0 }];

/** Lätta hopp: one marked jump for each hop from a place to stand to the next. */
function hops(way: Stone[], extra: Partial<Jump> = {}): Jump[] {
  return way.slice(1).map((next, i) => {
    const here = way[i]!;
    return { at: { x: round(here.to - 0.2), y: here.y }, dir: 1 as const, land: { x: round(next.from + 0.55), y: next.y }, ...extra };
  });
}

/** The trail over water: one candy in an arc over each hop, and one on each place to stand between. */
function over(way: Stone[]): Candy[] {
  const out: Candy[] = [];
  for (const [i, next] of way.slice(1).entries()) {
    const here = way[i]!;
    out.push({ x: round((here.to + next.from) / 2, 1), y: round(Math.max(here.y, next.y) + 1.15) });
    if (i < way.length - 2) out.push({ x: round((next.from + next.to) / 2, 1), y: round(next.y + 0.45) });
  }
  return out;
}

export const olympia: ChapterData = {
  id: 'olympia',
  // The pitch is artificial turf; the place's grass is its dressing.
  place: 'garden',
  spawn: { x: 1, y: ROAD + 0.01 },
  // Where and when, as the chapter opens (src/content/chapters/cards.ts); and the strongest gust at the end, watched.
  scenes: [timeCard('olympia', 1), GUST_SCENE],
  goalX: 179,
  // Bertil answers from afar in the coda: it was his kick.
  coda: 'bertil',
  ground: [
    { x: -3, y: 14 },
    { x: -3, y: ROAD },
    // 1. the road, the steps up to the ground, the gravel path, and the fence
    ...STEPS.flatMap((step, i) => [{ x: step.from, y: i === 0 ? ROAD : STEPS[i - 1]!.y }, { x: step.from, y: step.y }]),
    { x: FENCE.from, y: 0 },
    { x: FENCE.from, y: FENCE.top },
    { x: FENCE.to, y: FENCE.top },
    { x: FENCE.to, y: 0 },
    // 2. the small pitch, level and whole where the balls roll; 3. the flooded goalmouth
    ...pit(PUDDLE.from, PUDDLE.to, DEEP),
    // 4. the goal, 5. the corner and the benches, 6. the flooded centre circle
    ...pit(CIRCLE.from, CIRCLE.to, CIRCLE.bottom),
    // 7. the ski stadium and its range, 8. the trail up into the forest
    { x: TRAIL.from, y: 0 },
    { x: TRAIL.to, y: TRAIL.y },
    { x: EDGE.x, y: TRAIL.y },
    EDGE,
  ],
  water: [
    { from: PUDDLE.from, to: PUDDLE.to, y: PUDDLE.water },
    { from: CIRCLE.from, to: CIRCLE.to, y: CIRCLE.water },
  ],
  // The high fence stands across the path, whatever he goes over.
  landmarks: [{ look: 'fence', from: FENCE.from, to: FENCE.to, base: 0 }],
  surfaces: [
    { from: -3, to: STEPS[0]!.from, kind: 'asphalt' },
    { from: STEPS[0]!.from, to: STEPS[2]!.from, kind: 'stone' },
    { from: STEPS[2]!.from, to: FENCE.from, kind: 'earth' },
    // (Not 'iron': that is a street drain's grate, and the picture would dig a well round it.)
    { from: FENCE.from, to: FENCE.to, kind: 'asphalt' },
    { from: FENCE.to, to: 152, kind: 'turf' },
    { from: 152, to: 157, kind: 'earth' },
    { from: 157, to: 166, kind: 'paving' },
    { from: 166, to: 174, kind: 'earth' },
    { from: 174, to: 196, kind: 'moss' },
  ],
  checkpoints: [
    // At the top of the steps, on the ground's own level.
    { x: 9.4, y: 0 },
    // Where the balls begin to roll, and in the middle of their stretch, under a candy of the trail.
    { x: 22.6, y: 0 },
    { x: 40.6, y: 0 },
    { x: 64, y: 0 },
    { x: 89.4, y: 0 },
    // The dry place between the benches.
    { x: DRY, y: 0 },
    { x: 117, y: 0 },
    // In the far goal, where the kick comes down.
    { x: 152.4, y: 0 },
    { x: 172, y: trailAt(172) },
  ],
  climbs: [FENCE_DOWN, FENCE_UP, NET],
  ledges: [CROSSBAR, KIT],
  rollers: ROLLERS,
  movers: [BALL],
  counterweight: { from: BANK.from - 2, to: PUDDLE.from, call: 'beat:ol:puddle', heavy: BALL.id, launch: `placed:${BALL.id}` },
  drips: DRIPS,
  spots: [
    // On the crossbar's end, over the goal's mouth: the whole pitch in view.
    { id: 'ol:lookout', at: { x: GOAL.x + 0.8, y: GOAL.bar }, verb: 'take', touch: true, extra: true },
    // At the edge of the centre circle: Bertil comes when he calls, and lays the ball ready for a free kick.
    { id: 'ol:bertil', look: 'sign', at: { x: KICK.from.x - 0.8, y: 0 }, verb: 'call', word: 'callBertil' },
    { id: 'ol:kick', look: 'football', at: KICK.from, verb: 'take', word: 'olRideBall', needs: 'ol:kick-ready', ride: 'kick' },
    // The biathlon range: a cone thrown at each target turns it white.
    ...TARGETS.map((x, i) => ({ id: `ol:target-${i + 1}`, look: 'target' as const, at: { x, y: 0 }, verb: 'take' as const, word: 'olThrow', extra: true })),
  ],
  sets: [{ flag: 'ol:all-white', when: TARGETS.map((_, i) => `ol:target-${i + 1}`) }],
  rides: [{ id: 'kick', look: 'football', ...KICK }],
  later: [
    { flag: 'ol:kick-ready', after: 'ol:bertil', until: 'ol:kick', within: [116, 126], seconds: 1.2, hold: true },
    // If he stands at the water and thinks, he sees the small ball, and then what that means.
    { flag: 'ol:think', after: 'beat:ol:puddle', until: `placed:${BALL.id}`, seconds: 12 },
    { flag: 'ol:think-more', after: 'beat:ol:puddle', until: `placed:${BALL.id}`, seconds: 24 },
  ],
  // Lätta hopp: onto the floating ball and off it, once it floats in the goalmouth.
  jumps: [
    ...hops(BALL_WAY, { needs: BALL.id }),
    // Up onto the table behind the ball, coming back to it.
    { at: { x: 66.4, y: 0 }, dir: -1, land: { x: 65.85, y: KIT.y }, until: `placed:${BALL.id}` },
  ],
  storm: {
    // The crossbar he walks is the goal's own white frame, not a trestle.
    bars: 'goal',
    rain: 0.9,
    lightning: 8,
    // What rolls in the wind is balls, not cones.
    rollers: 'football',
    flybys: [
      // From the fence's top: the little one, tumbling over the whole pitch.
      { on: 'beat:ol:top', from: { x: 22, y: 12 }, to: { x: 64, y: 8 }, seconds: 2.8, who: 'lillgubbe' },
      // At the centre circle: the old one, blown over the water ahead of him.
      { on: 'beat:ol:old-one', from: { x: 124.4, y: 0.6 }, to: { x: 152, y: 7 }, seconds: 2.4, who: 'tragubbe' },
      // At the trail: the strongest gust takes the little one north over the treetops, and the old one follows, while
      // Elof stands and watches (`norrut`).
      NORTH,
      FOLLOW,
    ],
    // All of it plain, with no name, crest or letter: the small goal the ball is kicked to and the far goal the free
    // kick ends in, the dark floodlight masts, the stand behind the benches, the club's house, and birches where
    // the trail goes into the forest.
    buildings: [
      // The pitch, flat from the near touchline back to the stand: the path runs along its edge. Its turf is cut away
      // over the goalmouth's puddle, back into the goal's mouth, and over the near half of the flooded centre circle.
      { kind: 'pitch', x: 84.4, z: -0.6, width: 135.2, height: 22, y: 0.01, marks: { halfway: 51.1, box: { x: 8, long: 18 }, front: 7,
        wet: [{ from: PUDDLE.from, to: PUDDLE.to, back: -7 }, { from: CIRCLE.from, to: CIRCLE.to, back: -9 }] } },
      // The little store beside the ground, under its striped awning, closed in the storm.
      { kind: 'store', x: 4, z: -40, width: 22 },
      { kind: 'floodlight', x: 30, z: -36, height: 90 },
      // The red hall under its arch, across the pitch (art/blender/olympia.py).
      { kind: 'clubhouse', x: 50, z: -66, width: 36, height: 18, model: 'olympia-hall' },
      { kind: 'goal', x: GOAL.x, z: -6.4, width: GOAL.depth, height: GOAL.height },
      { kind: 'trestleTable', x: KIT.x, z: 0, width: KIT.width, height: KIT.y },
      { kind: 'floodlight', x: 92, z: -30, height: 90 },
      // The long timber stand on the far side, the forest straight behind it.
      { kind: 'stand', x: 118, z: -29, width: 44, model: 'olympia-stand' },
      { kind: 'floodlight', x: 136, z: -38, height: 90 },
      // The kick runs on z=0. Put that path inside the twelve-EL mouth, rather than beside its near post.
      { kind: 'goal', x: FAR_GOAL.x, z: -4.2, width: FAR_GOAL.depth, height: FAR_GOAL.height },
      { kind: 'floodlight', x: 164, z: -28, height: 70 },
      { kind: 'birch', x: 174, z: -16, height: 60 },
      { kind: 'birch', x: 183, z: -24, height: 70 },
    ],
  },
  decor: [
    // Where the trail goes into the forest.
    { look: 'kit', word: 'gren-a', at: { x: 176.5, y: 2.4 }, z: -1.5, turn: 0.3 },
    { look: 'kit', word: 'stubbe-sagad', at: { x: 171, y: 1 }, z: -2.4, turn: 1.2 },
    // A small ball from the torn bag, bobbing in the goalmouth's puddle: the clue.
    { look: 'floatBall', at: { x: PUDDLE.from + 1.2, y: PUDDLE.water }, z: -0.3, until: `placed:${BALL.id}` },
    // The ball bag at the foot of the fence, torn open by the wind: the balls roll out of it.
    { look: 'football', at: { x: BALLS.from, y: 0 }, z: -1.2 },
    // The corner flag, snapping in the wind.
    { look: 'flag', at: { x: 90.8, y: 0 }, z: -0.8 },
    // The old trägubbe at the edge of the centre circle, until the flash that shows him blown over it.
    { look: 'tragubbe', at: { x: 124.4, y: 0 }, z: -1, until: 'beat:ol:old-one' },
  ],
  // Klonk, ahead of him all the way, on firm ground: on the fence's top, along the pitch ahead of the balls, over
  // the puddle and the circle, and at the trail it thinks of the little one, once the flash has shown it.
  ghost: [
    // up the steps ahead of him, and at the top
    { at: { x: 6.4, y: STEPS[1]!.y } },
    { at: { x: 12.4, y: 0 } },
    { at: { x: 16.4, y: FENCE.top } },
    { at: { x: 24.4, y: 0 } },
    { at: { x: 30, y: 0 } },
    { at: { x: 38, y: 0 } },
    { at: { x: 46, y: 0 } },
    { at: { x: 54, y: 0 } },
    { at: { x: 62.4, y: 0 } },
    // in the goal, beyond the puddle, where Elof can't follow until the ball floats
    { at: { x: 81.6, y: 0 } },
    { at: { x: 88.6, y: 0 } },
    { at: { x: 93, y: 0 } },
    { at: { x: 99.3, y: 0 } },
    { at: { x: 104.6, y: 0 } },
    { at: { x: 114, y: 0 } },
    { at: { x: 120.4, y: 0 } },
    // over the circle, waiting in the far goal
    { at: { x: 155, y: 0 } },
    { at: { x: 160.8, y: 0 } },
    { at: { x: 167.4, y: 0 } },
    { at: { x: 174, y: trailAt(174) } },
    { at: { x: 182, y: TRAIL.y }, thought: { picture: 'small-figure', after: 'beat:ol:gust' } },
  ],
  beats: [
    // 1. up the steps: at the top the dark pitch, and the dark floodlights; the fence
    { id: 'ol:arrive', at: 7.6, who: 'elof', line: 'olArrive' },
    { id: 'ol:klonk', at: 9.8, who: 'spoket', line: 'olKlonk' },
    { id: 'ol:lights', at: 12.2, who: 'elof', line: 'olLights' },
    { id: 'ol:top', at: 16.2, who: 'elof', line: 'olTop' },
    { id: 'ol:little', on: 'beat:ol:top', who: 'elof', line: 'olLittle' },
    // 2. the balls in the wind: the first beat sets them rolling
    { id: 'ol:wind', at: 21.2, who: 'elof', line: 'olWind', read: true },
    { id: 'ol:jump', at: 26.4, who: 'elof', line: 'olJump' },
    { id: 'ol:klonk-balls', at: 34, who: 'spoket', line: 'olKlonkKlonk' },
    { id: 'ol:phew', at: 61, who: 'elof', line: 'olPhew' },
    // 3. Bollen i målet
    { id: 'ol:puddle', at: 73.6, who: 'elof', line: 'olPuddle' },
    { id: 'ol:idea', on: 'ol:think', until: `placed:${BALL.id}`, who: 'elof', line: 'olIdea', read: true },
    { id: 'ol:idea-more', on: 'ol:think-more', until: `placed:${BALL.id}`, who: 'elof', line: 'olIdeaMore', read: true },
    { id: 'ol:splash', on: `placed:${BALL.id}`, who: 'elof', line: 'olSplash' },
    { id: 'ol:klonk-ball', on: `placed:${BALL.id}`, who: 'spoket', line: 'olKlonkKlonk' },
    { id: 'ol:in-goal', at: 81, who: 'elof', line: 'olInGoal' },
    // 4. up on the crossbar (the side way)
    { id: 'ol:lookout', on: 'ol:lookout', who: 'elof', line: 'olLookout' },
    // 5. the corner flag and the benches
    { id: 'ol:crowd', at: 113.4, who: 'elof', line: 'olCrowd' },
    // 6. Bertil's free kick
    { id: 'ol:old-one', at: 118.4, who: 'elof', line: 'olOldOne' },
    { id: 'ol:bertil-here', at: 120, until: 'ol:bertil', who: 'bertil', line: 'olBertilHere', read: true },
    { id: 'ol:kick-ready', on: 'ol:kick-ready', until: 'ol:kick', within: [116, 126], who: 'bertil', line: 'olBertilReady', read: true },
    { id: 'ol:fly', on: 'ol:kick', within: [120, 150], who: 'elof', line: 'olFly' },
    { id: 'ol:goal', at: 149.8, needs: 'ol:kick', who: 'elof', line: 'olGoal' },
    { id: 'ol:cheer', on: 'beat:ol:goal', who: 'bertil', line: 'olBertilCheer' },
    { id: 'ol:thanks', on: 'beat:ol:cheer', who: 'elof', line: 'olThanks' },
    // 7. the biathlon range
    { id: 'ol:range', at: 156, who: 'elof', line: 'olRange' },
    { id: 'ol:all-white', on: 'ol:all-white', who: 'elof', line: 'olAllWhite' },
    // 8. the trail, and the strongest gust: said as the flash comes, while he stands and watches the little one go
    // (`norrut`), so that the words are under the flight and not in front of it; and as the old one leaps after him.
    // Then Bertil says where the wind is taking them, and how they will follow.
    { id: 'ol:gust', on: 'ol:north-flight', who: 'elof', line: 'olGust' },
    { id: 'ol:follow', on: FOLLOWS, who: 'elof', line: 'olFollow' },
    { id: 'ol:north', on: 'beat:ol:follow', who: 'bertil', line: 'olNorth' },
    // Flärken is six kilometres north: the family drives there, as they will to Billsta.
    { id: 'ol:car', on: 'beat:ol:north', who: 'bertil', line: 'olCar' },
    { id: 'ol:klonk-end', on: 'beat:ol:car', who: 'spoket', line: 'olKlonkKlonk' },
  ],
  cameras: [
    // Up on the crossbar: wider and lower, the bar, the hearts and the goal's mouth in view.
    { from: GOAL.x - 0.5, to: NET.x + 0.5, above: 3, zoom: 1.4, lift: -0.4 },
    // Over the fence: the whole climb, and the pitch beyond it from the top.
    { from: 12, to: 20, zoom: 1.5, lift: 0.6 },
    // While the balls roll the picture looks less far ahead, so that the ones coming from behind are seen.
    { from: 20, to: 62, zoom: 1.4, lead: 0.4 },
    { from: 62, to: 80, zoom: 1.35, lift: 0.4 },
    { from: 80, to: 90, zoom: 1.3, lift: 1 },
    { from: 92, to: 114, zoom: 1.25, lead: 3.2 },
    // As he comes down, the near upright and the back net frame the scoring ball together.
    { from: 141, to: 154, zoom: 1.3, lift: 0, lead: 2.4 },
    // The centre circle: wide, so that the far goal is in the picture before he flies.
    { from: 115, to: 153, zoom: 1.6, lift: 1.2 },
    { from: 154, to: 168, zoom: 1.25 },
    // The trail: the sky over the forest, where the little one flies.
    { from: 168, to: 186, zoom: 1.5, lift: 1.4 },
  ],
  candy: [
    // 1. along the road, up the steps to the ground, along the path, up the fence's near side and down its far side
    { x: 2, y: round(ROAD + 0.45) },
    ...STEPS.flatMap((step) => [{ x: round(step.from + 0.5), y: round(step.y + 0.45) }, { x: round(step.from + 1.5), y: round(step.y + 0.45) }]),
    ...row(10.6, 14.6, 0),
    { x: FENCE_UP.x, y: 1.3 },
    { x: FENCE_UP.x, y: 2.6 },
    { x: FENCE_UP.x, y: 3.9 },
    { x: 16.4, y: round(FENCE.top + 0.45) },
    { x: FENCE_DOWN.x, y: 4.2 },
    { x: FENCE_DOWN.x, y: 2.6 },
    { x: FENCE_DOWN.x, y: 1 },
    // 2. across the small pitch, where the balls roll: a little higher than on a walk, so that a runner and a
    // jumper both take each one, wherever a ball makes him jump
    ...row(18.6, 20.6, 0),
    ...row(22.6, 62.6, 0).map((c) => ({ ...c, y: BALLS.candy })),
    ...row(64.6, 68.6, 0),
    // 3. beside the ball as it is kicked on, over the puddle and onto it, and into the goal
    { x: 71.2, y: 0.45 },
    { x: 73.2, y: 0.45 },
    ...over(BALL_WAY),
    ...row(79.8, 93.8, 0),
    // 5. under the benches' roofs, between the drops, and the dry place between them
    { x: 94.9, y: 0.45 },
    { x: 97.1, y: 0.45 },
    { x: 99.3, y: 0.45 },
    { x: 101.5, y: 0.45 },
    { x: DRY, y: 0.45 },
    { x: 105.1, y: 0.45 },
    { x: 107.3, y: 0.45 },
    { x: 109.5, y: 0.45 },
    { x: 111.7, y: 0.45 },
    ...row(113.6, 121.6, 0),
    // 6. in the arc of Bertil's free kick
    ...alongAll(KICK, [0.08, 0.17, 0.26, 0.35, 0.44, 0.53, 0.62, 0.71, 0.8, 0.89]),
    // 7. out of the far goal and along the range; 8. up the trail
    ...row(151, 169, 0),
    ...slopeRow(171, 177, TRAIL.from, 0, TRAIL.to, TRAIL.y),
  ],
  // Side candy: hearts and lollipops by turns, in the order of this list, so the first of each way is a heart.
  side: [
    // The net and the crossbar: the tell low on the net, a held jump from the turf; three up the net; six along
    // the bar, out of reach of any jump from the turf under it.
    { x: NET.x, y: 1.6 },
    { x: NET.x, y: 2.7 },
    { x: NET.x, y: 3.8 },
    { x: NET.x, y: 4.9 },
    ...[86.2, 85.1, 84, 82.9, 81.8, 80.7].map((x) => ({ x, y: round(GOAL.bar + 0.55) })),
    // The range: a heart from each target as it turns white, and three more when all five are.
    ...TARGETS.map((x, i) => ({ x, y: 0.55, after: `ol:target-${i + 1}` })),
    { x: 166.4, y: 0.55, after: 'ol:all-white' },
    { x: 167.2, y: 0.95, after: 'ol:all-white' },
    { x: 168, y: 0.55, after: 'ol:all-white' },
  ],
};

/**
 * What "Just nu" says here (src/content/aventyr2/context.ts): the steps, the fence, the balls, the ball in the
 * goalmouth, the benches, Bertil's free kick, the stadium, and the little one blown north.
 */
export const context: Chooser = (has, player) => {
  const at = player.x;
  if (has('beat:ol:gust')) return ['olympiaNorth', 'olympiaFamily', 'water'];
  if (at >= KICK.to.x - 0.5) return ['olympiaStadium', 'olympiaFamily'];
  if (has('ol:kick')) return ['olympiaFly', 'olympiaBertil', 'trail', 'bertil'];
  if (has('ol:bertil')) return ['olympiaBoard', 'olympiaBertil', 'trail', 'bertil'];
  if (at >= 116) return ['olympiaCallBertil', 'olympiaBertil', 'water', 'bertil'];
  if (at >= BENCHES.from && at < BENCHES.to) return ['olympiaBenches', 'olympiaFamily'];
  if (at >= FAR.from) return ['olympiaTrail', 'olympiaFamily'];
  if (has(`placed:${BALL.id}`)) return ['olympiaHop', 'olympiaFamily', 'water'];
  if (at >= BANK.from) return ['olympiaKick', 'olympiaFamily', 'water'];
  if (has('beat:ol:wind') && !has('beat:ol:phew')) return ['olympiaBalls', 'olympiaFamily'];
  if (at >= 11 && at < FENCE.to + 0.5) return ['olympiaFence', 'olympiaFamily'];
  return at >= FENCE.to ? ['olympiaTrail', 'olympiaFamily'] : ['olympiaArrive', 'olympiaFamily'];
};
