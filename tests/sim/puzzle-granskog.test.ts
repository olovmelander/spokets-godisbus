import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { granskog } from '../../src/content/chapters/granskog';
import { trailShape } from '../../src/render/candy';
import { settingsFor, simOptions } from '../../src/save/settings';
import { cameraIntent } from '../../src/sim/camera-intent';
import { BUBBLE_TIME, CANDY_MAGNET, ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LEDGE_GIVE, MOVE_TIME, MOVER_RESET, STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, Ledge, SimOptions, SimStart } from '../../src/sim/types';
import { decide, heightAt } from '../robot/robot';
import { idle, jump, run, runPast, sideTaken, use, walkTo } from './drive';

// The cone on the bough (docs/level-design.md, §1 point 8): Granskogen's one optional puzzle of three pieces,
// over the needle slope between its first big candy and the gap.
//
// - What he sees: hearts on a bough high over the slope, and a plate of bark with a heart under them.
// - The catch: from the plate he steps onto a long bough, and the hearts are two steps over it, with no step
//   between. A jump from the long bough ends well short of them.
// - The insight: a cone lies out on the long bough. Cones bowl him over on this slope; up here one is his
//   tool. Pushed out to the bough's tip, its weight tips the near end up: a twig, the missing step.
//
// The cones of the avalanche roll under all of it. It is played here both ways: with them rolling, as he
// meets it first, and on the calm slope he comes back up once Pappa has been called.

/** Where it lies, by x: between the slope's first big candy and the gap. Nothing else of the chapter's layers lies there. */
const SPAN = { from: 80.5, to: 88 };
const within = (at: { x: number }) => at.x > SPAN.from && at.x < SPAN.to;
const side = granskog.side!;
/** Its ledges, in the chapter's order: the plate of bark, the long bough, the twig that waits for the cone, the hearts' bough. */
const [plate, bough, twig, hearts] = granskog.ledges!.filter(within) as [Ledge, Ledge, Ledge, Ledge];
const cone = granskog.movers!.find((mover) => mover.id === 'cone-bough')!;
const [home, tip] = cone.stops as [{ x: number; y: number }, { x: number; y: number }];
/** Its side candy, by its place in the chapter's list: the tell, the lollipop, the four on the hearts' bough, the twig's heart. */
const [TELL, LOLLIPOP, ...REST] = side.flatMap((candy, i) => (within(candy) ? [i] : [])) as [number, number, ...number[]];
const HEARTS = REST.slice(0, 4);
const ON_THE_TWIG = REST[4]!;
const PLACED = `placed:${cone.id}`;

/** A saved game at the slope's first big candy: the jay and the ants are behind him, and the cones roll. */
const ROLLING: SimStart = { checkpoint: 5, flags: ['berry', 'jay', 'antlift', 'avalanche'], placed: ['twig'] };
/** Back up the calm slope after Pappa has prepared and explained the seesaw. */
const CALM: SimStart = { ...ROLLING, flags: [...ROLLING.flags!, 'seesaw', 'family:seesaw-ready', 'beat:family:seesaw'] };
/** At the top of the slope, before he has nudged the loose cone. */
const AT_THE_TOP: SimStart = { checkpoint: 4, flags: ['berry', 'jay', 'antlift'], placed: ['twig'] };
/** The calm slope with the cone already out at the tip. */
const PUSHED: SimStart = { ...CALM, placed: ['twig', cone.id] };

const slope = (x: number) => heightAt(granskog, x);
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.08 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.2;
const onTheCone = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - (theCone(sim).y + cone.height)) < 0.08;
const onTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - slope(sim.curr.x)) < 0.05;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)}`;
const taken = (sim: Sim) => sideTaken(sim, SPAN.from, SPAN.to).taken;
/** How much of the prize is his: the four on the hearts' bough and the heart on the twig. */
const prizeTaken = (sim: Sim) => [...HEARTS, ON_THE_TWIG].filter((i) => sim.collectedSide[i]).length;
const theCone = (sim: Sim) => sim.movers.find((mover) => mover.def.id === cone.id)!;
const theTwig = (sim: Sim) => sim.ledges[granskog.ledges!.indexOf(twig)]!;
/** How far the nearest sweet on the hearts' bough is from his middle: within `CANDY_MAGNET` it is his. */
const toTheHearts = (sim: Sim) => Math.min(...HEARTS.map((i) => Math.hypot(side[i]!.x - sim.curr.x, side[i]!.y - (sim.curr.y + ELOF_HEIGHT / 2))));

/** Standing somewhere, as if he had just come there: on a ledge, on the cone, on the slope. */
function standingAt(x: number, y: number, start: SimStart = CALM, chapter: ChapterData = granskog): Sim {
  const sim = new Sim({ ...chapter, spawn: { x, y: y + 0.01 } }, {}, { flags: start.flags ?? [], placed: start.placed ?? [] });
  run(sim, 0.3);
  return sim;
}

/** A held jump with the stick held one way, until his feet are on something again. Gives the least he missed the hearts by, and how high his feet came. */
function hop(sim: Sim, dir = 0): { nearest: number; highest: number } {
  let nearest = toTheHearts(sim);
  let highest = sim.curr.y;
  sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
  for (let i = 0; i < 2 / STEP; i++) {
    sim.step({ ...idle, x: dir, hopHeld: true });
    nearest = Math.min(nearest, toTheHearts(sim));
    highest = Math.max(highest, sim.curr.y);
    if (sim.curr.mode === 'bubble' || (i > 20 && sim.curr.mode === 'free' && sim.curr.grounded)) break;
  }
  run(sim, 0.2);
  return { nearest, highest };
}

/** Whether a cone of the avalanche rolls up behind him, as near as the robot jumps at. */
const coneBehind = (sim: Sim) => sim.rollers.some((r) => r.on && Math.abs(r.y - sim.curr.y) < 1.5 && sim.curr.x - r.x > 0.95 && sim.curr.x - r.x < 1.5);

/** Runs on down the slope until he has passed an x, jumping each cone that comes up from behind, and lands. */
function downTheSlope(sim: Sim, x: number): void {
  let was = false;
  for (let i = 0; i < 30 / STEP && sim.curr.x < x; i++) {
    const jumps = sim.curr.grounded && coneBehind(sim);
    sim.step({ ...idle, x: 1, hop: jumps && !was, hopHeld: true });
    was = jumps;
  }
  for (let i = 0; i < 2 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step({ ...idle, x: 1, hopHeld: true });
}

/** Waits where he stands until a cone has just rolled by under him: the next is a second and a half behind it. */
function untilAConeHasPassed(sim: Sim): void {
  for (let i = 0; i < 6 / STEP; i++) {
    if (sim.rollers.some((r) => r.on && r.x - sim.curr.x > 0.8 && r.x - sim.curr.x < 1.6)) return;
    sim.step(idle);
  }
}

/** From the trail under the plate of bark: a jump straight up, and a jump to the right onto the long bough. */
function ontoTheBough(sim: Sim): void {
  expect(onTrail(sim), `under the plate: ${where(sim)}`).toBe(true);
  jump(sim);
  expect(on(sim, plate), `the plate of bark: ${where(sim)}`).toBe(true);
  jump(sim, 1);
  expect(on(sim, bough), `the long bough: ${where(sim)}`).toBe(true);
}

/** Along the long bough to the cone, at a run and then a step at a time, and one press of Använd. */
function pushTheCone(sim: Sim): void {
  runPast(sim, home.x - cone.width / 2 - 1.4);
  walkTo(sim, home.x - cone.width / 2 - 0.45);
  expect(sim.curr.verb, `beside the cone: ${where(sim)}`).toBe('push');
  expect(sim.actionAt).toMatchObject({ x: home.x });
  use(sim);
  run(sim, MOVE_TIME);
}

/** Walking on into the cone, his hands take its top: he pulls himself onto it. */
function ontoTheCone(sim: Sim): void {
  for (let i = 0; i < 8 / STEP && !onTheCone(sim); i++) sim.step({ ...idle, x: Math.sign(theCone(sim).x - sim.curr.x) * 0.5 });
  run(sim, 0.2);
  expect(onTheCone(sim), `on the cone: ${where(sim)}`).toBe(true);
}

/** Back along the bough to its near end, and up the twig to the hearts: a jump straight up, twice. All of the prize. */
function upToTheHearts(sim: Sim): void {
  if (sim.curr.x > right(twig) + 0.5) runPast(sim, right(twig) + 0.5);
  walkTo(sim, twig.x + 0.25);
  jump(sim);
  expect(on(sim, twig), `the twig: ${where(sim)}`).toBe(true);
  jump(sim);
  expect(on(sim, hearts), `the hearts' bough: ${where(sim)}`).toBe(true);
  walkTo(sim, left(hearts) + 0.2);
}

/** Down the way he came: off the hearts' bough onto the long one, and off its near end onto the plate. */
function downToThePlate(sim: Sim): void {
  walkTo(sim, right(twig) + 0.35);
  run(sim, 0.5);
  expect(on(sim, bough), `down on the long bough: ${where(sim)}`).toBe(true);
  walkTo(sim, left(bough) - 0.35);
  run(sim, 0.5);
  expect(on(sim, plate), `down on the plate: ${where(sim)}`).toBe(true);
}

/** Off the plate's far end, forward onto the trail. */
function ontoTheTrail(sim: Sim): void {
  walkTo(sim, right(plate) + 0.4);
  run(sim, 0.5);
  expect(onTrail(sim), `back on the trail: ${where(sim)}`).toBe(true);
}

/**
 * The whole of it from the trail under the plate back to the trail. Gives the seconds it took, and how many of
 * them had passed when the last sweet of the prize was his.
 */
function solve(sim: Sim): { seconds: number; prize: number } {
  const began = sim.steps;
  ontoTheBough(sim);
  pushTheCone(sim);
  upToTheHearts(sim);
  const prize = (sim.steps - began) * STEP;
  downToThePlate(sim);
  ontoTheTrail(sim);
  return { seconds: (sim.steps - began) * STEP, prize };
}

/** On the calm slope at its first big candy, and from there to under the plate. */
function underThePlate(options: SimOptions = {}, start: SimStart = CALM): Sim {
  const sim = new Sim(granskog, options, start);
  run(sim, 0.2);
  walkTo(sim, plate.x - 0.3);
  return sim;
}

describe('the cone on the bough: how it is laid', () => {
  it('is added after everything that was in the chapter\'s lists: four ledges, one thing on a rail, seven side candies', () => {
    // The layers' nine ledges, the story's twelve things on rails and the layers' twenty-two side candies
    // keep their places: a saved game knows side candy by its place in the list.
    expect(granskog.ledges!.filter(within)).toHaveLength(4);
    expect(granskog.ledges!.indexOf(plate)).toBe(9);
    expect(granskog.ledges!.indexOf(hearts)).toBe(12);
    expect(granskog.movers!.filter((mover) => mover.stops.some(within))).toEqual([cone]);
    expect(granskog.movers!.indexOf(cone)).toBe(12);
    expect(side.filter(within)).toHaveLength(7);
    expect([TELL, LOLLIPOP, ...HEARTS, ON_THE_TWIG]).toEqual([22, 23, 24, 25, 26, 27, 28]);
    expect(cone).toMatchObject({ id: 'cone-bough', look: 'cone', verb: 'push', optional: true });
    expect(cone.needs).toBeUndefined();
    expect(cone.extra).toBeUndefined();
    expect(cone.on).toBeUndefined();
    expect(cone.stops).toHaveLength(2);
    expect([plate.look, bough.look, twig.look, hearts.look]).toEqual(['bark', 'branch', 'branch', 'branch']);
    // One piece waits for the cone, and its heart with it. Nothing else of it waits for anything.
    expect(twig.needs).toBe(PLACED);
    expect(side[ON_THE_TWIG]!.after).toBe(PLACED);
    for (const ledge of [plate, bough, hearts]) expect(ledge.needs).toBeUndefined();
    for (const i of [TELL, LOLLIPOP, ...HEARTS]) expect(side[i]!.after).toBeUndefined();
    // One thing to act on. It adds no thing to use, no ring, no climb and no camera zone: the slope's own
    // wide picture is the one it is seen in.
    expect(granskog.spots!.some((spot) => within(spot.at))).toBe(false);
    expect(granskog.hooks!.some(within)).toBe(false);
    expect(granskog.climbs!.some(within)).toBe(false);
    expect(granskog.cameras!.filter((zone) => zone.from < SPAN.to && zone.to > SPAN.from)).toEqual([{ from: 68, to: 105, zoom: 1.45, lead: 0.3 }]);
  });

  it('is a plate of bark, a long bough and two steps up: the first of the two is the one that is missing', () => {
    // The plate is within a jump of the slope all along, and a refuge: higher than a rolling cone reaches.
    expect(plate.y - slope(left(plate))).toBeGreaterThan(0.66);
    expect(plate.y - slope(plate.x)).toBeLessThan(0.9);
    expect(plate.y - slope(right(plate))).toBeLessThan(JUMP_APEX - 0.05);
    expect(bough.y - plate.y).toBeLessThanOrEqual(0.9 + 1e-9);
    expect(twig.y - bough.y).toBeCloseTo(0.9, 9);
    expect(hearts.y - twig.y).toBeCloseTo(0.9, 9);
    // Two steps are more than a jump, and the long bough is too high to jump onto from the slope.
    expect(hearts.y - bough.y).toBeGreaterThan(JUMP_APEX + LEDGE_GIVE + 0.5);
    expect(bough.y - slope(left(bough))).toBeGreaterThan(JUMP_APEX + LEDGE_GIVE + 0.5);
    // The four lie over one another at the long bough's near end: up, up, up is a jump straight up each time.
    const column = { from: Math.max(...[plate, bough, twig, hearts].map(left)), to: Math.min(...[plate, bough, twig, hearts].map(right)) };
    expect(column.to - column.from).toBeGreaterThanOrEqual(0.3 - 1e-9);
    // The twig is over the long bough's near end, and the cone is pushed along its far half, out to its tip.
    expect(left(twig)).toBeLessThan(left(bough));
    expect(right(twig)).toBeGreaterThan(left(bough) + 0.7);
    expect(tip.x + cone.width / 2).toBeCloseTo(right(bough), 9);
    expect(tip.x).toBeGreaterThan(home.x);
    expect(home.x).toBeGreaterThan(bough.x);
    expect(tip.y).toBe(bough.y);
    expect(home.y).toBe(bough.y);
  });

  it('has a heart over the plate as its tell, and a prize of four on the hearts\' bough with a fifth on the twig', () => {
    expect(trailShape(TELL, 'side')).toBe(3);
    expect(Math.abs(side[TELL]!.x - plate.x)).toBeLessThan(plate.width / 2);
    expect(side[TELL]!.y - plate.y).toBeCloseTo(0.55, 9);
    expect(Math.abs(side[LOLLIPOP]!.x - bough.x)).toBeLessThan(bough.width / 2);
    expect(side[LOLLIPOP]!.x).toBeLessThan(home.x - cone.width / 2 - 1);
    for (const i of HEARTS) {
      expect(Math.abs(side[i]!.x - hearts.x)).toBeLessThan(hearts.width / 2);
      expect(side[i]!.y - hearts.y).toBeCloseTo(0.7, 9);
      // More than a jump and a reach over the long bough.
      expect(side[i]!.y - (bough.y + JUMP_APEX + ELOF_HEIGHT / 2)).toBeGreaterThan(CANDY_MAGNET + 0.25);
    }
    expect(trailShape(ON_THE_TWIG, 'side')).toBe(3);
    expect(Math.abs(side[ON_THE_TWIG]!.x - twig.x)).toBeLessThan(twig.width / 2);
  });

  it('keeps clear of the side ways and of what the story uses, between the big candy and the gap', () => {
    const root = granskog.climbs!.find((climb) => climb.needs === 'antlift')!;
    const [, , , boughsEnd, nestStart] = granskog.ledges! as [Ledge, Ledge, Ledge, Ledge, Ledge];
    const nudge = granskog.spots!.find((spot) => spot.id === 'avalanche')!;
    const heavy = granskog.movers!.find((mover) => mover.id === 'cone')!;
    expect(left(hearts) - right(boughsEnd)).toBeGreaterThan(10);
    expect(left(hearts) - root.x).toBeGreaterThan(10);
    expect(left(nestStart) - right(bough)).toBeGreaterThan(10);
    expect(left(hearts) - nudge.at.x).toBeGreaterThan(10);
    expect(heavy.stops[0]!.x - right(bough)).toBeGreaterThan(10);
    // It ends an EL before the gap, and begins an EL beyond the big candy: the slope leaves no more room than that.
    const gap = granskog.jumps!.find((marked) => marked.land.x - marked.at.x > 2 && marked.at.x > 80 && marked.at.x < 95)!;
    expect(gap.at.x - right(bough)).toBeGreaterThanOrEqual(1 - 1e-9);
    const big = granskog.checkpoints![5]!;
    expect(left(hearts) - big.x).toBeGreaterThanOrEqual(1);
    expect(left(plate) - big.x).toBeGreaterThan(1.3);
  });

  it('a step off any ledge of it is a fall he lands, and so is a walk off the cone at the tip: down in front of the gap', () => {
    for (const ledge of [plate, bough, twig, hearts]) {
      for (const end of [left(ledge) - 0.4, right(ledge) + 0.4]) expect(ledge.y - slope(end), `the ledge at ${ledge.x}, ${ledge.y}`).toBeLessThan(FALL_LIMIT);
    }
    expect(tip.y + cone.height - slope(tip.x + cone.width / 2 + 0.4)).toBeLessThan(FALL_LIMIT);
    // A jump that misses from the plate or from the near end of the long bough is a soft landing too.
    expect(plate.y + JUMP_APEX - slope(right(plate) + 0.5)).toBeLessThan(FALL_LIMIT);
    expect(bough.y + JUMP_APEX - slope(left(bough) + 2.5)).toBeLessThan(FALL_LIMIT);

    // Walked off for real: the hearts' bough at both ends, and the long bough's near end.
    for (const [ledge, to] of [[hearts, left(hearts) - 0.5], [hearts, right(hearts) + 0.5], [bough, left(bough) - 0.5]] as const) {
      const sim = standingAt(ledge.x, ledge.y, PUSHED);
      walkTo(sim, to);
      run(sim, 1.2);
      expect(sim.curr.grounded, `off the ledge at ${ledge.x}, ${ledge.y} towards ${to}: ${where(sim)}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
    // Over the cone at the tip, walking on: he comes down on the trail before the gap, and stops at its edge.
    const over = standingAt(tip.x, tip.y + cone.height, PUSHED);
    run(over, 3, { x: 0.5 });
    run(over, 0.5);
    expect(onTrail(over), `off the cone at the tip: ${where(over)}`).toBe(true);
    expect(over.curr.x).toBeGreaterThan(right(bough));
    expect(over.curr.x).toBeLessThan(88);
    expect(over.bubbles).toBe(0);
  });

  it('the one fall it has that he cannot land: at a run over the cone and off the far end he comes down in the gap, and the bubble sets him back on the cone', () => {
    for (const start of [CALM, PUSHED]) {
      const sim = standingAt(bough.x, bough.y, start);
      // Running into the cone, his hands take its top; running on, he is off its far side and out over the gap.
      for (let i = 0; i < 6 / STEP && sim.bubbles === 0; i++) sim.step({ ...idle, x: 1 });
      expect(sim.bubbles).toBe(1);
      expect(sim.curr.x).toBeGreaterThan(88);
      run(sim, BUBBLE_TIME + 0.3);
      expect(onTheCone(sim), `after the bubble: ${where(sim)}`).toBe(true);
      // Nothing is lost by it: the cone is where it was, and he steps down to its near side again.
      expect(theCone(sim).x).toBe(start === CALM ? home.x : tip.x);
      walkTo(sim, theCone(sim).x - cone.width / 2 - 0.45);
      expect(on(sim, bough), `down on the near side: ${where(sim)}`).toBe(true);
      expect(sim.curr.verb).toBe(start === CALM ? 'push' : null);
      expect(theTwig(sim).there).toBe(start !== CALM);
    }
  });
});

describe('1. the solution, from the trail back to the trail', () => {
  it('on the calm slope: up the plate, along the bough, one push, back, and up the twig to all of the prize', () => {
    const sim = underThePlate();
    const began = sim.curr.x;
    const { seconds, prize } = solve(sim);
    console.log(`puzzle granskog: solved in ${seconds.toFixed(1)} s from the trail back to the trail, ${prize.toFixed(1)} s of them to the last sweet of the prize`);

    expect(taken(sim)).toBe(7);
    expect(prizeTaken(sim)).toBe(5);
    expect(sim.flags.has(PLACED)).toBe(true);
    expect(sim.placed).toContain(cone.id);
    expect(sim.bubbles).toBe(0);
    expect(sim.bowled).toBe(0);
    // Further along the trail than he began, and before the gap.
    expect(sim.curr.x).toBeGreaterThan(began + 1);
    expect(sim.curr.x).toBeLessThan(88);
    expect(seconds).toBeLessThan(20);
    // The trail's own story is where it was: nothing of the seesaw has been done or undone, and nothing is said.
    expect(sim.placed).not.toContain('cone');
    expect(sim.flags.has('launch')).toBe(false);
    expect(sim.said).toEqual([]);
  });

  it('is climbed in rhythm from anywhere under the plate: up, right, and once the twig is there up, up', () => {
    for (const under of [left(plate) + 0.1, plate.x - 0.3, plate.x + 0.3, right(plate) - 0.1]) {
      const sim = standingAt(under, slope(under), PUSHED);
      ontoTheBough(sim);
      // Wherever that set him down on the long bough, the twig is straight over him or a step back.
      if (sim.curr.x > right(twig)) walkTo(sim, twig.x + 0.25);
      jump(sim);
      expect(on(sim, twig), `the twig from under ${under}: ${where(sim)}`).toBe(true);
      jump(sim);
      expect(on(sim, hearts), `the hearts' bough from under ${under}: ${where(sim)}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('with the cones rolling, as he meets it first: the plate is in reach between two cones, and all of it is over them', () => {
    const sim = new Sim(granskog, {}, AT_THE_TOP);
    run(sim, 0.2);
    // Down the slope from its top, nudging the loose cone and jumping the one that catches him up.
    downTheSlope(sim, left(plate) - 0.3);
    expect(sim.flags.has('avalanche')).toBe(true);
    run(sim, 0.25);
    const began = { x: sim.curr.x, steps: sim.steps };
    ontoTheBough(sim);
    pushTheCone(sim);
    upToTheHearts(sim);
    expect(taken(sim)).toBe(7);
    downToThePlate(sim);
    const seconds = (sim.steps - began.steps) * STEP;
    console.log(`puzzle granskog: with the cones rolling, ${seconds.toFixed(1)} s from the trail to the plate again, with all of the prize`);
    // On the plate he waits for a cone to roll by under him, runs off the plate behind it, and on down the slope.
    untilAConeHasPassed(sim);
    downTheSlope(sim, right(bough) - 0.6);
    expect(onTrail(sim), `on down the slope: ${where(sim)}`).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(began.x + 4);
    expect(sim.bowled).toBe(0);
    expect(sim.bubbles).toBe(0);
    expect(seconds).toBeLessThan(25);
  });

  it('with the cones rolling, from the big candy a saved game begins at: a run, a jump, and he is up before the first cone', () => {
    const sim = new Sim(granskog, {}, ROLLING);
    run(sim, 0.2);
    runPast(sim, left(plate) - 0.25);
    run(sim, 0.25);
    ontoTheBough(sim);
    pushTheCone(sim);
    upToTheHearts(sim);
    expect(taken(sim)).toBe(7);
    expect(sim.bowled).toBe(0);
    expect(sim.bubbles).toBe(0);
  });

  it('the plate is a refuge: the cones roll by under him for as long as he stands on it, and bowl him over beside it', () => {
    for (const x of [left(plate) + 0.05, plate.x, right(plate) - 0.05]) {
      const sim = standingAt(x, plate.y, ROLLING);
      run(sim, 12);
      expect(on(sim, plate), `standing at ${x}: ${where(sim)}`).toBe(true);
      expect(sim.bowled, `standing at ${x}`).toBe(0);
    }
    const below = standingAt(plate.x, slope(plate.x), ROLLING);
    run(below, 6);
    expect(below.bowled).toBeGreaterThan(0);
  });

  it('on Lugnt it is there to play as well, with the same moves', () => {
    const sim = underThePlate(simOptions(settingsFor('lugnt')));
    const began = sim.curr.x;
    solve(sim);
    expect(taken(sim)).toBe(7);
    expect(sim.bubbles).toBe(0);
    expect(sim.curr.x).toBeGreaterThan(began + 1);
  });
});

describe('2. the prize cannot be had without it', () => {
  /** Plays on from wherever a wrong try left him: back to the trail under the plate, and the solution. */
  function andThenSolve(sim: Sim): void {
    run(sim, 0.5);
    expect(sim.curr.mode).toBe('free');
    // Off whatever he stands on, towards the slope's top side, and to under the plate.
    walkTo(sim, left(plate) - 0.8);
    run(sim, 0.8);
    expect(onTrail(sim), `on the trail again: ${where(sim)}`).toBe(true);
    walkTo(sim, plate.x - 0.3);
    solve(sim);
    expect(taken(sim)).toBe(7);
    expect(sim.bubbles).toBe(0);
  }

  it('jump for it: from the long bough under the hearts he comes down again, well short of them', () => {
    const sim = underThePlate();
    ontoTheBough(sim);
    let nearest = Infinity;
    let highest = -Infinity;
    for (const from of [left(bough) + 0.05, twig.x, right(hearts) - 0.2]) {
      walkTo(sim, from);
      const tried = hop(sim);
      nearest = Math.min(nearest, tried.nearest);
      highest = Math.max(highest, tried.highest);
      expect(on(sim, bough), `back on the bough: ${where(sim)}`).toBe(true);
    }
    // Clearly, not nearly: his feet stay most of an EL under the hearts' bough, and no sweet comes near his hands.
    expect(hearts.y - highest).toBeGreaterThan(0.6);
    expect(nearest - CANDY_MAGNET).toBeGreaterThan(0.25);
    expect(prizeTaken(sim)).toBe(0);
    expect(sim.flags.has(PLACED)).toBe(false);
    expect(sim.bubbles).toBe(0);
    andThenSolve(sim);
  });

  it('skip the cone: where the twig will be there is nothing to land on, and the plate\'s heart and the lollipop are all he gets', () => {
    const sim = underThePlate();
    ontoTheBough(sim);
    expect(theTwig(sim).there).toBe(false);
    walkTo(sim, side[LOLLIPOP]!.x);
    for (const dir of [0, 1, -1]) {
      walkTo(sim, twig.x + 0.25);
      expect(on(sim, bough), `under where the twig will be: ${where(sim)}`).toBe(true);
      const { highest } = hop(sim, dir);
      // He jumps as high as the twig will be: it is the step that is missing, not his jump.
      expect(highest, `a jump ${dir}`).toBeGreaterThan(twig.y);
      expect(sim.curr.y, `after a jump ${dir}: ${where(sim)}`).toBeLessThan(twig.y - 0.5);
      expect(sim.bubbles).toBe(0);
    }
    expect(taken(sim)).toBe(2);
    expect(prizeTaken(sim)).toBe(0);
    andThenSolve(sim);
  });

  it('climb the cone and leap for the hearts: it is no step up to them, however he takes his run', () => {
    // The cone's top is a place to stand, over the bough. The best of it is a run off its edge and a jump a
    // moment after, at full speed towards the hearts.
    let nearest = Infinity;
    let highest = -Infinity;
    let tries = 0;
    for (const from of [home.x - 0.25, home.x, home.x + 0.25]) {
      for (let runUp = 0; runUp <= 1.2001; runUp += 0.1) {
        const sim = standingAt(from, home.y + cone.height);
        expect(onTheCone(sim)).toBe(true);
        run(sim, runUp, { x: -1 });
        sim.step({ ...idle, x: -1, hop: true, hopHeld: true });
        for (let i = 0; i < 1.6 / STEP; i++) {
          sim.step({ ...idle, x: -1, hopHeld: true });
          nearest = Math.min(nearest, toTheHearts(sim));
          if (sim.curr.x < right(hearts) + 0.2) highest = Math.max(highest, sim.curr.y);
          if (sim.curr.mode === 'bubble' || (sim.curr.grounded && i > 20)) break;
        }
        tries++;
        expect(prizeTaken(sim), `from ${from} after a run of ${runUp.toFixed(1)} s: ${where(sim)}`).toBe(0);
        expect(on(sim, hearts)).toBe(false);
        expect(sim.bubbles).toBe(0);
      }
    }
    expect(tries).toBe(39);
    expect(nearest - CANDY_MAGNET).toBeGreaterThan(0.25);
    expect(hearts.y - LEDGE_GIVE - highest).toBeGreaterThan(0.3);

    // Played from the trail: he walks into the cone, his hands take its top, and from there he leaps.
    const sim = underThePlate();
    ontoTheBough(sim);
    ontoTheCone(sim);
    expect(sim.curr.verb).toBeNull();
    run(sim, 0.3, { x: -1 });
    hop(sim, -1);
    expect(prizeTaken(sim)).toBe(0);
    expect(on(sim, hearts)).toBe(false);
    expect(sim.flags.has(PLACED)).toBe(false);
    expect(sim.bubbles).toBe(0);
    andThenSolve(sim);
  });

  it('from the wrong side: beyond the cone Använd has nothing to offer, and a walk off the tip is a soft way down', () => {
    const sim = underThePlate();
    ontoTheBough(sim);
    // Over the cone, and down on its far side.
    ontoTheCone(sim);
    walkTo(sim, home.x + cone.width / 2 + 0.45);
    expect(on(sim, bough), `beyond the cone: ${where(sim)}`).toBe(true);
    expect(sim.curr.verb).toBeNull();
    use(sim);
    run(sim, MOVE_TIME);
    expect(theCone(sim).stop).toBe(0);
    expect(theCone(sim).x).toBe(home.x);
    expect(sim.flags.has(PLACED)).toBe(false);
    // Off the tip: down on the trail, short of the gap.
    walkTo(sim, right(bough) + 0.5);
    run(sim, 1);
    expect(onTrail(sim), `off the tip: ${where(sim)}`).toBe(true);
    expect(sim.curr.x).toBeLessThan(88);
    expect(sim.bubbles).toBe(0);
    expect(prizeTaken(sim)).toBe(0);
    // And back up the slope to the plate.
    runPast(sim, left(plate) - 0.6);
    andThenSolve(sim);
  });

  it('every jump from every place he can stand before the cone is pushed: none takes a sweet of the prize', () => {
    const starts: [string, number, number][] = [
      ['the trail', left(hearts) - 1, slope(left(hearts) - 1)], ['the trail', hearts.x, slope(hearts.x)], ['the trail', right(hearts), slope(right(hearts))],
      ['the plate', left(plate) + 0.1, plate.y], ['the plate', right(plate) - 0.1, plate.y],
      ['the bough', left(bough) + 0.1, bough.y], ['the bough', twig.x, bough.y], ['the bough', right(hearts) + 0.4, bough.y], ['the bough', bough.x - 0.4, bough.y],
      ['the bough beyond the cone', home.x + 0.75, bough.y],
    ];
    let tries = 0;
    let nearest = Infinity;
    for (const [name, x, y] of starts) {
      for (const way of [-1, 1]) {
        for (let runUp = 0; runUp <= 1.2001; runUp += 0.3) {
          for (const held of [-1, 0, 1]) {
            const sim = standingAt(x, y);
            run(sim, runUp, { x: way });
            sim.step({ ...idle, x: held, hop: true, hopHeld: true });
            for (let i = 0; i < 1.6 / STEP; i++) {
              sim.step({ ...idle, x: held, hopHeld: true });
              nearest = Math.min(nearest, toTheHearts(sim));
              if (sim.curr.mode === 'bubble' || (sim.curr.grounded && i > 20)) break;
            }
            tries++;
            const what = `from ${name} at ${x.toFixed(2)}, a run of ${runUp.toFixed(1)} s ${way > 0 ? 'right' : 'left'} and a jump ${held}: ${where(sim)}`;
            expect(prizeTaken(sim), what).toBe(0);
            expect(on(sim, hearts), what).toBe(false);
          }
        }
      }
    }
    expect(tries).toBe(starts.length * 2 * 5 * 3);
    expect(nearest - CANDY_MAGNET).toBeGreaterThan(0.25);
    // Nothing else in the chapter sets the flag the twig waits for.
    expect(granskog.spots!.some((spot) => spot.id === PLACED)).toBe(false);
    expect((granskog.sets ?? []).some((set) => set.flag === PLACED)).toBe(false);
    expect((granskog.later ?? []).some((beat) => beat.flag === PLACED)).toBe(false);
    expect(granskog.movers!.filter((mover) => `placed:${mover.id}` === PLACED)).toEqual([cone]);
  }, 60000);

  it('a child who tries everything: half a minute of running and jumping about it at random, and the prize is his only by the cone', () => {
    /** Random numbers from a seed, so that a failure can be played again. */
    const random = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const starts = [{ x: plate.x - 1.2, y: slope(plate.x - 1.2) }, { x: plate.x, y: plate.y }, { x: bough.x - 1, y: bough.y }, { x: home.x, y: home.y + cone.height }];
    let pushed = 0;
    for (const [n, from] of starts.entries()) {
      for (const uses of [false, true, true]) {
        for (const start of [CALM, ROLLING]) {
          const next = random(7919 * (n + 1) + (uses ? 104729 : 0) + (start === CALM ? 0 : 31));
          const sim = standingAt(from.x, from.y, start);
          let stick = 0;
          let held = false;
          let until = 0;
          for (let i = 0; i < 30 / STEP; i++) {
            if (i >= until) {
              // He stays about it: when he strays up or down the slope, he mostly turns back.
              const back = sim.curr.x < left(hearts) - 1.5 ? 1 : sim.curr.x > right(bough) + 0.8 ? -1 : 0;
              stick = back !== 0 && next() < 0.8 ? back : [-1, -1, -0.5, 0, 0.5, 1, 1][Math.floor(next() * 7)]!;
              held = next() < 0.6;
              until = i + Math.floor((0.08 + next() * 0.5) / STEP);
            }
            const press = next() < 0.02;
            sim.step({ ...idle, x: stick, hop: press, hopHeld: held || press, act: uses && next() < 0.01 });
            if (prizeTaken(sim) > 0 && !sim.flags.has(PLACED)) expect.fail(`the prize without the cone: ${where(sim)}, from ${from.x}, ${from.y}`);
          }
          if (!uses) expect(sim.flags.has(PLACED)).toBe(false);
          if (sim.flags.has(PLACED)) pushed++;
          // Whatever he did, he is on his feet or on his way back to them, and the story's own things are untouched.
          for (let i = 0; i < 4 / STEP && sim.curr.mode !== 'free'; i++) sim.step(idle);
          expect(sim.curr.mode, `at the end: ${where(sim)}`).toBe('free');
          expect(sim.placed.filter((id) => id !== 'twig' && id !== cone.id)).toEqual([]);
          expect(sim.said).toEqual([]);
        }
      }
    }
    // Pressing Använd now and then, he pushes the cone in some of them: it is found by trying, too.
    expect(pushed).toBeGreaterThan(0);
  }, 60000);
});

describe('3. no dead end', () => {
  it('left before the push and come back to: the cone lies where it lay, and the solution still works', () => {
    const sim = underThePlate();
    ontoTheBough(sim);
    walkTo(sim, home.x - cone.width / 2 - 0.45);
    expect(sim.curr.verb).toBe('push');
    // Down off the near end, away up the slope further than a thing left half way would wait for him, and back.
    walkTo(sim, left(plate) - 0.8);
    run(sim, 0.8);
    expect(onTrail(sim), `down on the trail: ${where(sim)}`).toBe(true);
    runPast(sim, home.x - MOVER_RESET - 2);
    run(sim, MOVE_TIME + 0.2);
    expect(theCone(sim).x).toBe(home.x);
    runPast(sim, left(plate) - 0.6);
    walkTo(sim, plate.x - 0.3);
    solve(sim);
    expect(taken(sim)).toBe(7);
    expect(sim.bubbles).toBe(0);
  });

  it('left after the push and come back to: the cone stays at the tip, where it helps, and the twig stays', () => {
    const sim = underThePlate();
    ontoTheBough(sim);
    pushTheCone(sim);
    expect(theCone(sim).x).toBe(tip.x);
    expect(theTwig(sim).there).toBe(true);
    expect(prizeTaken(sim)).toBe(0);
    // Away without the prize: over the cone and off the tip, and far back up the slope.
    ontoTheCone(sim);
    walkTo(sim, right(bough) + 0.5);
    run(sim, 1);
    expect(onTrail(sim), `off the tip: ${where(sim)}`).toBe(true);
    runPast(sim, tip.x - MOVER_RESET - 3);
    run(sim, MOVE_TIME + 0.2);
    expect(theCone(sim).x).toBe(tip.x);
    expect(theCone(sim).stop).toBe(1);
    expect(theTwig(sim).there).toBe(true);
    expect(sim.flags.has(PLACED)).toBe(true);
    // Back, and up: the plate, the bough, the twig, the hearts.
    runPast(sim, left(plate) - 0.6);
    walkTo(sim, plate.x - 0.3);
    ontoTheBough(sim);
    upToTheHearts(sim);
    expect(prizeTaken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
    // It has no half way: one push takes it to where it belongs, and Använd offers nothing more there.
    expect(cone.stops).toHaveLength(2);
    const again = standingAt(tip.x - cone.width / 2 - 0.45, bough.y, PUSHED);
    expect(again.curr.verb).toBeNull();
  });

  it('bowled over beside it, he is put back at the big candy just before it, with everything as it was', () => {
    const sim = new Sim(granskog, {}, ROLLING);
    run(sim, 0.2);
    runPast(sim, left(plate) - 0.25);
    run(sim, 0.25);
    ontoTheBough(sim);
    pushTheCone(sim);
    // Down onto the slope, and standing there until a cone comes.
    walkTo(sim, left(plate) - 0.8);
    for (let i = 0; i < 8 / STEP && sim.bowled === 0; i++) sim.step(idle);
    expect(sim.bowled).toBe(1);
    for (let i = 0; i < 3 / STEP && sim.curr.mode !== 'free'; i++) sim.step(idle);
    expect(sim.curr.x).toBeCloseTo(granskog.checkpoints![5]!.x, 0);
    expect(theCone(sim).x).toBe(tip.x);
    expect(theTwig(sim).there).toBe(true);
    expect(taken(sim)).toBe(2);
    expect(sim.bubbles).toBe(0);
  });
});

describe('4. a saved game comes back right', () => {
  it('with the flags the solved puzzle leaves, the cone is at the tip and the way is open', () => {
    const solved = underThePlate();
    solve(solved);
    const flags = [...solved.flags];
    expect(flags).toContain(PLACED);
    expect(solved.placed).toContain(cone.id);
    const sweets = solved.collectedSide.flatMap((got, i) => (got ? [i] : []));
    expect(sweets).toEqual([TELL, LOLLIPOP, ...HEARTS, ON_THE_TWIG]);

    // Everything the save keeps: the way is still open, and nothing of the prize is there to take twice.
    const whole = new Sim(granskog, {}, { checkpoint: solved.checkpoint, flags, placed: solved.placed, side: sweets });
    run(whole, 0.2);
    expect(theCone(whole).x).toBe(tip.x);
    expect(theCone(whole).stop).toBe(1);
    expect(theTwig(whole).there).toBe(true);
    expect(taken(whole)).toBe(7);
    walkTo(whole, plate.x - 0.3);
    ontoTheBough(whole);
    upToTheHearts(whole);
    expect(whole.collectedSide.filter(Boolean)).toHaveLength(7);
    expect(whole.candyCount - whole.collected.filter(Boolean).length).toBe(7);
    expect(whole.bubbles).toBe(0);

    // Saved after the push and before the prize, as the save has it and by the thing on its rail alone:
    // the prize is there, and so is the way to it.
    for (const start of [{ flags: [PLACED], placed: [cone.id] }, { flags: [], placed: [cone.id] }]) {
      const sim = new Sim(granskog, {}, { ...CALM, flags: [...CALM.flags!, ...start.flags], placed: ['twig', ...start.placed] });
      run(sim, 0.2);
      expect(sim.flags.has(PLACED)).toBe(true);
      expect(theCone(sim).x).toBe(tip.x);
      expect(theTwig(sim).there).toBe(true);
      walkTo(sim, plate.x - 0.3);
      ontoTheBough(sim);
      upToTheHearts(sim);
      expect(prizeTaken(sim)).toBe(5);
      expect(sim.bubbles).toBe(0);
    }

    // And a game saved before it has the cone at home and no twig.
    const before = new Sim(granskog, {}, CALM);
    run(before, 0.2);
    expect(theCone(before).x).toBe(home.x);
    expect(theTwig(before).there).toBe(false);
    expect(before.flags.has(PLACED)).toBe(false);
  });
});

describe('5. it is not on the main way', () => {
  /** Whether a place is a piece of the puzzle: over the slope under it, where its ledges, its cone and its sweets are. */
  const ofThePuzzle = (at: { x: number; y: number }) => at.x > SPAN.from && at.x < SPAN.to && at.y - slope(at.x) > 0.6;

  it('following the trail under it takes none of its candy, and neither Använd nor the helper has anything of it to show', () => {
    for (const start of [CALM, ROLLING]) {
      const sim = new Sim(granskog, {}, start);
      run(sim, 0.2);
      let was = false;
      for (let i = 0; i < 20 / STEP && sim.curr.x < 87.4; i++) {
        const jumps = sim.curr.grounded && coneBehind(sim);
        sim.step({ ...idle, x: 1, hop: jumps && !was, hopHeld: true });
        was = jumps;
        expect(sim.curr.verb, `running at ${sim.curr.x.toFixed(2)}`).toBeNull();
        const hint = hintFor(sim, granskog);
        expect(hint, `at ${sim.curr.x.toFixed(2)}`).not.toBeNull();
        expect(hint!.verb).toBeNull();
        expect(ofThePuzzle(hint!.at), `the helper at ${sim.curr.x.toFixed(2)} shows ${hint!.at.x}, ${hint!.at.y}`).toBe(false);
      }
      expect(sim.curr.x).toBeGreaterThan(87);
      expect(sideTaken(sim, SPAN.from, SPAN.to)).toEqual({ taken: 0, of: 7 });
      expect(sim.collectedSide.some(Boolean)).toBe(false);
      expect(sim.flags.has(PLACED)).toBe(false);
      expect(sim.bowled).toBe(0);
      expect(sim.bubbles).toBe(0);
      if (start !== CALM) continue;
      // The trail's own candy under it is his all the same.
      const under = granskog.candy.flatMap((candy, i) => (candy.x > 80.5 && candy.x < 86.5 ? [i] : []));
      expect(under).toHaveLength(3);
      for (const i of under) expect(sim.collected[i], `trail candy at ${granskog.candy[i]!.x}`).toBe(true);
    }
  });

  it('the helper never shows a piece of it: not to someone standing on the trail, and not when he asks beside the cone', () => {
    for (let x = SPAN.from; x <= SPAN.to - 0.5; x += 0.5) {
      const sim = standingAt(x, slope(x));
      const hint = hintFor(sim, granskog)!;
      expect(hint.verb, `standing at ${x}`).toBeNull();
      expect(ofThePuzzle(hint.at), `standing at ${x}: ${hint.at.x}, ${hint.at.y}`).toBe(false);
    }
    // Beside the cone the button says Knuffa, and the helper still shows the trail's next candy.
    for (const start of [CALM, PUSHED]) {
      const sim = standingAt(home.x - cone.width / 2 - 0.45, bough.y, start);
      expect(sim.curr.verb).toBe(start === CALM ? 'push' : null);
      const hint = hintFor(sim, granskog)!;
      expect(hint.verb).toBeNull();
      expect(ofThePuzzle(hint.at)).toBe(false);
      sim.step({ ...idle, help: true });
      run(sim, 0.2);
      expect(sim.help.step).toBe(1);
      expect(sim.help.verb).toBeNull();
      expect(ofThePuzzle(sim.help.at!)).toBe(false);
      expect(theCone(sim).x).toBe(start === CALM ? home.x : tip.x);
    }
  });

  /**
   * The plate is the one piece within a jump of the trail, as the first ledge of every side way is. The first
   * place on the slope from which a jump at a run ends on it, or takes its heart on the way by.
   */
  let first: number | undefined;
  function firstTakeoffOntoThePlate(): number {
    if (first !== undefined) return first;
    first = Infinity;
    for (let from = left(plate) - 4; from < left(plate) && first === Infinity; from += 0.05) {
      const sim = standingAt(from - 2.5, slope(from - 2.5));
      for (let i = 0; i < 5 / STEP && sim.curr.x < from; i++) sim.step({ ...idle, x: 1 });
      const took = sim.curr.x;
      hop(sim, 1);
      if (on(sim, plate) || sim.collectedSide[TELL]) first = took;
    }
    return first;
  }

  for (const [name, fps, options] of [['30 Hz', 30, {}], ['60 Hz', 60, {}], ['144 Hz', 144, {}], ['Lugnt, 60 Hz', 60, simOptions(settingsFor('lugnt'))]] as const) {
    it(`the robot at ${name} plays the chapter through and never touches it`, () => {
      const lugnt = (options as SimOptions).gentle === true;
      const game = new Game(granskog, options as SimOptions);
      let wasAhead = false;
      let wasOffered = false;
      /** How near his feet came to the top of a ledge of it, from below, while he was under it. */
      let nearest = Infinity;
      /** Where he last stood before each time he was in the air on the slope before the plate. */
      const takeoffs: number[] = [];
      let stood = { x: -Infinity, grounded: true };
      for (let frames = 0; !game.sim.flags.has('goal') && frames < fps * 400; frames++) {
        const d = decide(game, granskog);
        const ahead = lugnt ? d.ahead && game.sim.curr.vx < 0.2 : d.ahead;
        game.frame(1 / fps, { x: d.x, y: d.y, hopHeld: lugnt ? ahead : true }, { hop: ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = d.offered;
        const p = game.sim.curr;
        if (stood.grounded && !p.grounded && p.mode === 'free' && stood.x > 70.5 && stood.x < left(plate)) takeoffs.push(stood.x);
        stood = { x: p.x, grounded: p.grounded };
        if (!within(p)) continue;
        expect(p.verb, `at ${p.x.toFixed(2)}`).toBeNull();
        for (const ledge of [plate, bough, hearts]) {
          if (Math.abs(p.x - ledge.x) < ledge.width / 2 + 0.2) nearest = Math.min(nearest, ledge.y - p.y);
        }
      }
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(game.sim.bowled).toBe(0);
      // It ran under the plate with its feet on the slope, and under the rest with room over its head.
      expect(nearest).toBeGreaterThan(0.5);
      expect(game.sim.collectedSide.some((got, i) => got && within(side[i]!))).toBe(false);
      expect(game.sim.flags.has(PLACED)).toBe(false);
      expect(game.sim.placed).not.toContain(cone.id);
      expect(game.sim.movers.find((mover) => mover.def.id === cone.id)!.x).toBe(home.x);
      // Not by a hair: the cone that catches it up before the plate is jumped more than half an EL before the
      // first place a jump would have ended on the plate, and the next catches it up at the gap. If the cones'
      // rhythm or the robot's running is ever changed, this is the number that says whether the plate has to move.
      if (!lugnt) {
        expect(takeoffs).toHaveLength(1);
        console.log(`puzzle granskog: the robot at ${name} jumps a cone at x ${takeoffs[0]!.toFixed(2)}; a jump from x ${firstTakeoffOntoThePlate().toFixed(2)} on would have ended on the plate`);
        expect(firstTakeoffOntoThePlate() - takeoffs[0]!).toBeGreaterThan(0.5);
      } else {
        // On Lugnt the cones miss him while he runs, and it does not jump on the slope before the gap at all.
        expect(takeoffs).toHaveLength(0);
      }
    });
  }

  it('the cone is in the way of no jump from the trail: it lies over the head of the highest, and with it or without it every jump is the same jump', () => {
    // The cone is the one solid thing of the puzzle: a ledge is no ceiling. Jumps from the slope under it,
    // standing and at a run, with the slope's ledges taken away so that none of them ends on the plate.
    const bare = (withCone: boolean): ChapterData => ({ ...granskog, ledges: [], movers: granskog.movers!.filter((mover) => withCone || mover !== cone) });
    let most = 0;
    let headroom = Infinity;
    let tries = 0;
    for (const at of [home, tip]) {
      const start = at === tip ? PUSHED : CALM;
      for (let x = at.x - 2.4; x <= at.x + 0.8; x += 0.2) {
        for (const [runUp, held] of [[0, 0], [0, 1], [0.5, 1]] as const) {
          const [a, b] = [standingAt(x, slope(x), start, bare(true)), standingAt(x, slope(x), start, bare(false))];
          for (const sim of [a, b]) {
            run(sim, runUp, { x: 1 });
            sim.step({ ...idle, x: held, hop: true, hopHeld: true });
          }
          for (let i = 0; i < 1 / STEP; i++) {
            a.step({ ...idle, x: held, hopHeld: true });
            b.step({ ...idle, x: held, hopHeld: true });
            most = Math.max(most, Math.hypot(a.curr.x - b.curr.x, a.curr.y - b.curr.y));
            if (Math.abs(b.curr.x - at.x) < cone.width / 2 + 0.18) headroom = Math.min(headroom, at.y - (b.curr.y + ELOF_HEIGHT));
          }
          tries++;
        }
      }
    }
    expect(tries).toBeGreaterThan(90);
    expect(most).toBe(0);
    expect(headroom).toBeGreaterThan(0.02);
  }, 60000);
});

describe('6. in sight', () => {
  /**
   * What the picture holds on a screen of this size, as src/render/view.ts frames it: Elof a fifth of the
   * screen's height and between 75 and 140 px, never less than 6 EL across, the ground he is over 35 % up.
   */
  function picture(sim: Sim, screen: { width: number; height: number }) {
    const look = cameraIntent(sim.curr, granskog.cameras);
    const high = Math.max(screen.height / Math.min(140, Math.max(75, screen.height * 0.2)), (6 * screen.height) / screen.width) * look.zoom;
    const wide = (high * screen.width) / screen.height;
    return { left: look.x - wide / 2, right: look.x + wide / 2, bottom: look.y - 0.35 * high, top: look.y + 0.65 * high };
  }
  const inside = (frame: ReturnType<typeof picture>, at: { x: number; y: number }, margin = 0) =>
    at.x > frame.left + margin && at.x < frame.right - margin && at.y > frame.bottom + margin && at.y < frame.top - margin;
  const said = (frame: ReturnType<typeof picture>) => `the picture is ${frame.left.toFixed(1)}..${frame.right.toFixed(1)} across and ${frame.bottom.toFixed(1)}..${frame.top.toFixed(1)} up`;
  /** The sizes the game is checked at, and the smallest phone held sideways. */
  const SCREENS = [{ width: 780, height: 360 }, { width: 844, height: 390 }, { width: 390, height: 844 }, { width: 1180, height: 820 }, { width: 1440, height: 900 }];
  /** Standing on the trail, looking the way he runs. */
  const fromTheTrail = (x: number) => standingAt(x, slope(x));

  it('the prize\'s first sweet is in the trail\'s picture as he comes down to the plate and under it, on every screen', () => {
    const first = side[HEARTS[0]!]!;
    expect(trailShape(HEARTS[0]!, 'side')).toBe(3);
    let least = Infinity;
    for (const screen of SCREENS) {
      for (let x = left(plate) - 3.5; x <= right(plate) + 1e-9; x += 0.3) {
        const frame = picture(fromTheTrail(x), screen);
        expect(inside(frame, first, 0.12), `from the trail at ${x.toFixed(1)} on ${screen.width}×${screen.height}: ${said(frame)}`).toBe(true);
        least = Math.min(least, frame.top - first.y);
        // And so are the plate with its heart, and the long bough's near end.
        expect(inside(frame, side[TELL]!, 0.2)).toBe(true);
        expect(inside(frame, { x: left(bough), y: bough.y }, 0.2)).toBe(true);
      }
    }
    // It is high in the picture: on the smallest phone held sideways, under the plate's far end, a hand's
    // breadth under the top edge.
    expect(least).toBeLessThan(0.3);
    // From the plate itself, and from the long bough, the picture has risen with him: all four are well inside.
    for (const screen of SCREENS) {
      for (const [x, y] of [[plate.x, plate.y], [left(bough) + 0.3, bough.y]] as const) {
        const frame = picture(standingAt(x, y), screen);
        for (const i of HEARTS) expect(inside(frame, side[i]!, 0.8), `${side[i]!.x} from ${x}, ${y} on ${screen.width}×${screen.height}: ${said(frame)}`).toBe(true);
      }
    }
  });

  it('the prize is seen before the tool: coming down the slope, the hearts are in the picture before the cone is', () => {
    for (const screen of SCREENS) {
      const firstSeen = (at: { x: number; y: number }) => {
        for (let x = 70.5; x < 88; x += 0.25) if (inside(picture(fromTheTrail(x), screen), at)) return x;
        return Infinity;
      };
      const sweet = firstSeen(side[HEARTS.at(-1)!]!);
      const tool = firstSeen({ x: home.x, y: home.y + cone.height / 2 });
      expect(sweet, `${screen.width}×${screen.height}`).toBeLessThan(tool - 2);
      expect(tool).toBeLessThan(left(plate));
    }
  });

  it('it all fits in one picture: from the plate and from the long bough, the hearts, the twig\'s place and the cone at both its places', () => {
    const things = [side[HEARTS[0]!]!, side[HEARTS.at(-1)!]!, { x: twig.x, y: twig.y }, { x: home.x, y: home.y + cone.height / 2 }, { x: tip.x, y: tip.y + cone.height / 2 }, side[TELL]!];
    for (const screen of SCREENS) {
      // A phone held upright shows less than nine EL across on this slope: there the cone's far place comes
      // into the picture once he has taken a few steps along the bough towards it.
      const upright = screen.height > screen.width;
      for (const [x, y] of [[plate.x, plate.y], [left(bough) + 0.3, bough.y], [bough.x - 1, bough.y]] as const) {
        const frame = picture(standingAt(x, y), screen);
        for (const thing of things) {
          if (upright && Math.abs(thing.x - x) > 3.6) continue;
          expect(inside(frame, thing), `${thing.x}, ${thing.y} from ${x}, ${y} on ${screen.width}×${screen.height}: ${said(frame)}`).toBe(true);
        }
      }
    }
    // The whole of it is narrower than the picture of a phone held upright on this slope.
    const zoom = cameraIntent(fromTheTrail(plate.x).curr, granskog.cameras).zoom;
    expect(right(bough) - left(hearts)).toBeLessThan(6 * zoom);
  });
});
