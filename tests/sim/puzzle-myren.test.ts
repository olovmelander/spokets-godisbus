import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { myren } from '../../src/content/chapters/myren';
import { TRAIL_SHAPES, trailShape } from '../../src/render/candy';
import { settingsFor, simOptions } from '../../src/save/settings';
import { cameraIntent } from '../../src/sim/camera-intent';
import {
  BUBBLE_TIME, CANDY_MAGNET, ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LEDGE_GIVE, RISE_TIME, SINK_DEPTH, SINK_TIME, STEP, TOUCH_REACH,
} from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { Mode, SimOptions, SimStart, Vec } from '../../src/sim/types';
import { decide, heightAt } from '../robot/robot';
import { idle, jump, leap, run, runPast } from './drive';

// The toss: Myren's puzzle (docs/level-design.md, §1 point 8). Hearts hang in an arch over the second run of
// soft tussocks, up to a bough of a dead pine, and something glints in the moss of the first of them. The
// way up is the one thing the bog has taught him not to do: to stand still on a soft tussock. Sunk deep
// enough over what glints, he is thrown up along the hearts. It is played here from the trail back to it.

// Most tests here play their way several times over: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

const side = myren.side!;
const soft = myren.tussocks!;
/** What glints, the throw it starts, and the bough the throw ends on. */
const glint = myren.spots!.find((spot) => spot.id === 'bog:toss')!;
const toss = myren.rides!.find((ride) => ride.id === glint.ride)!;
const perch = myren.ledges!.find((ledge) => ledge.y === toss.to.y && Math.abs(toss.to.x - ledge.x) < ledge.width / 2)!;
/** The soft tussock it lies under, by its place in the chapter's list, and the two after it. */
const SPRING = soft.findIndex((t) => Math.abs(glint.at.x - t.x) <= t.width / 2);
const spring = soft[SPRING]!;
/** From how far he touches a thing (src/sim/sim.ts, `reach`). */
const REACH = TOUCH_REACH + 0.5;
/** How far under the top of the tussock the thing lies, and how deep he has to sink straight over it. */
const DEEP = spring.y - glint.at.y;
const SINK = DEEP - REACH;
/** The island: firm ground with a big candy, between the two runs of soft tussocks. */
const ISLAND = { from: 63.2, to: 67, big: 3 };
/** The stretch the puzzle lies over. */
const FROM = spring.x - spring.width / 2;
const TO = perch.x + perch.width / 2;

const left = (thing: { x: number; width: number }) => thing.x - thing.width / 2;
const right = (thing: { x: number; width: number }) => thing.x + thing.width / 2;
/** Where his feet are on the throw, as the simulation carries him (src/sim/sim.ts, `ride`). */
function thrown(t: number): Vec {
  const k = t * t * (3 - 2 * t);
  return { x: toss.from.x + (toss.to.x - toss.from.x) * k, y: toss.from.y + (toss.to.y - toss.from.y) * k + Math.sin(Math.PI * t) * toss.rise };
}
/** How far a point is from where his middle passes on the throw. */
function offTheThrow(at: Vec): number {
  let nearest = Infinity;
  for (let t = 0; t <= 1; t += 0.001) nearest = Math.min(nearest, Math.hypot(thrown(t).x - at.x, thrown(t).y + ELOF_HEIGHT / 2 - at.y));
  return nearest;
}
/** The prize: the side candy that lies along the throw, by its place in the chapter's list, in the order he meets it. */
const prize = side.map((_, i) => i).filter((i) => side[i]!.x > spring.x && side[i]!.x < TO && offTheThrow(side[i]!) < 0.05).sort((a, b) => side[a]!.x - side[b]!.x);
const isHeart = (index: number) => TRAIL_SHAPES[trailShape(index, 'side')] === 'hjarta';

/** What he is doing, read afresh: the simulation changes it under a test's feet. */
const doing = (sim: Sim): Mode => sim.curr.mode;
const stands = (sim: Sim) => doing(sim) === 'free' && sim.curr.grounded;
/** He stands on this soft tussock, wherever its top is now. */
const onTussock = (sim: Sim, i: number) => stands(sim) && Math.abs(sim.curr.x - soft[i]!.x) <= soft[i]!.width / 2 + 0.2 && Math.abs(sim.curr.y - sim.tussocks[i]!.y) < 0.1;
const onTheBough = (sim: Sim) => stands(sim) && Math.abs(sim.curr.y - perch.y) < 0.1 && sim.curr.x > left(perch) - 0.2 && sim.curr.x < right(perch) + 0.2;
const onTheIsland = (sim: Sim) => stands(sim) && Math.abs(sim.curr.y) < 0.05 && sim.curr.x > ISLAND.from - 0.2 && sim.curr.x < ISLAND.to + 0.2;
/** He stands on the trail: on the ground or on a soft tussock. */
const onTheTrail = (sim: Sim) => stands(sim) && (Math.abs(sim.curr.y - heightAt(myren, sim.curr.x)) < 0.05 || soft.some((_, i) => onTussock(sim, i)));
const wasThrown = (sim: Sim) => sim.flags.has(glint.id);
/** How many of the prize are in the bag. */
const taken = (sim: Sim) => prize.filter((i) => sim.collectedSide[i]).length;
const seconds = (sim: Sim, since = 0) => (sim.steps - since) * STEP;
/** How far his feet are from the thing. */
const away = (sim: Sim) => Math.hypot(sim.curr.x - glint.at.x, sim.curr.y - glint.at.y);

/** He stands on the island, at its big candy, as a game taken up there does. */
function onTheIslandAgain(options: SimOptions = {}, start: SimStart = {}): Sim {
  const sim = new Sim(myren, options, { checkpoint: ISLAND.big, ...start });
  run(sim, 0.3);
  return sim;
}
/** He stands on a soft tussock, this far from its middle. */
function standingOn(i: number, along = 0, options: SimOptions = {}, start: SimStart = {}): Sim {
  const sim = new Sim({ ...myren, spawn: { x: soft[i]!.x + along, y: soft[i]!.y + 0.01 } }, options, start);
  // A game is taken up before the toss here, so the toss is there (see "a saved game").
  return sim;
}
/** The hop the trail asks for: at a run off the island's far end, onto the first soft tussock. */
function hopOn(sim: Sim): void {
  leap(sim, 1, ISLAND.to - 0.3);
}
/**
 * Walks to a place and stands there, for as long as it takes for something to happen to him: he is thrown, or
 * the glitter bubble takes him. Tells which, or 'nothing' when the time is up.
 */
function standAt(sim: Sim, x: number, limit = 4): 'thrown' | 'bubble' | 'nothing' {
  for (let i = 0; i < limit / STEP; i++) {
    if (doing(sim) === 'ride') return 'thrown';
    if (doing(sim) === 'bubble') return 'bubble';
    const off = x - sim.curr.x;
    sim.step({ ...idle, x: Math.abs(off) > 0.05 ? Math.sign(off) * 0.5 : 0 });
  }
  return 'nothing';
}
/** Lets what carries him carry him, until he stands again. */
function untilHeStands(sim: Sim, limit = 5): void {
  for (let i = 0; i < limit / STEP && !stands(sim); i++) sim.step(idle);
  run(sim, 0.1);
}
/** Walks along the bough and off its end, until he stands on something lower. */
function stepDown(sim: Sim, dir: 1 | -1): void {
  for (let i = 0; i < 6 / STEP && !(stands(sim) && sim.curr.y < perch.y - 1); i++) sim.step({ ...idle, x: dir * 0.5 });
  run(sim, 0.1);
}
/**
 * The solution, from where he stands on the island: the hop onto the soft tussock, a few steps to where it
 * glints, and standing still. He is thrown, and it ends when he stands on the bough.
 */
function solve(sim: Sim, at = glint.at.x): void {
  expect(onTheIsland(sim)).toBe(true);
  hopOn(sim);
  expect(onTussock(sim, SPRING)).toBe(true);
  expect(standAt(sim, at)).toBe('thrown');
  untilHeStands(sim);
}

/**
 * What the picture holds on a screen, from the place the camera wants to look at: a screen shows `high` EL
 * from top to bottom at zoom 1, with that place 35 % up (src/render/view.ts).
 */
const SCREENS = {
  // The smallest the game is drawn for: a phone held sideways, 780 by 360.
  phone: { high: 4.8, wide: 4.8 * (780 / 360) },
  // A phone held upright, 390 by 844: never narrower than 6 EL.
  upright: { high: 6 * (844 / 390), wide: 6 },
  // A tablet, 1180 by 820.
  tablet: { high: 820 / 140, wide: (820 / 140) * (1180 / 820) },
};
function pictureOf(look: { x: number; y: number; zoom: number }, screen: { high: number; wide: number }) {
  return {
    left: look.x - (screen.wide * look.zoom) / 2, right: look.x + (screen.wide * look.zoom) / 2,
    bottom: look.y - 0.35 * screen.high * look.zoom, top: look.y + 0.65 * screen.high * look.zoom,
  };
}
const picture = (sim: Sim, screen: { high: number; wide: number }) => pictureOf(cameraIntent(sim.curr, myren.cameras), screen);
const holds = (frame: ReturnType<typeof pictureOf>, at: Vec, margin = 0.2) =>
  at.x > frame.left + margin && at.x < frame.right - margin && at.y > frame.bottom + margin && at.y < frame.top - margin;

describe('the toss: what is laid out', () => {
  it('is one thing to use and a place to come to: what glints under a soft tussock, the throw it begins, and a bough', () => {
    // What glints is touched, not used with the button; it is off the way on; and it begins the throw.
    expect(glint.touch).toBe(true);
    expect(glint.extra).toBe(true);
    expect(glint.needs).toBeUndefined();
    // It has no look of its own: the picture of it is the glint that floats 1.5 EL over a thing
    // (src/render/view.ts, `buildGlints`), which is here in the moss at the top of the tussock.
    expect(glint.look).toBeUndefined();
    expect(glint.at.y + 1.5 - spring.y).toBeGreaterThan(-0.01);
    expect(glint.at.y + 1.5 - spring.y).toBeLessThan(0.2);
    // It lies under the first soft tussock after the island, towards its far end.
    expect(SPRING).toBe(soft.findIndex((t) => t.x > ISLAND.to));
    expect(glint.at.x - spring.x).toBeGreaterThan(0.5);
    expect(glint.at.x).toBeLessThan(right(spring) - 0.2);
    // Too deep to touch from the top of the tussock, wherever he stands on it; in reach once he has sunk a
    // good part of the way, which takes a second and more of standing; and that well before the tussock has
    // sunk and the glitter bubble comes.
    expect(DEEP).toBeGreaterThan(REACH + 0.2);
    const wait = (SINK / SINK_DEPTH) * SINK_TIME;
    expect(wait).toBeGreaterThan(1);
    expect(wait).toBeLessThan(SINK_TIME - 0.5);
    // The throw: nothing is drawn under him, nothing steers it, it begins where his feet are when he comes
    // within reach straight over the thing, and it ends on the bough.
    expect(toss.look).toBe('none');
    expect(toss.corridor).toBe(0);
    expect(toss.from.x).toBe(glint.at.x);
    expect(toss.from.y).toBeCloseTo(spring.y - SINK, 5);
    expect(toss.to.y).toBe(perch.y);
    expect(toss.to.x).toBeGreaterThan(left(perch) + 0.4);
    expect(toss.to.x).toBeLessThan(right(perch) - 0.4);
    // The bough is a dead pine's: its stem stands in open water, between two soft tussocks.
    expect(perch.look).toBe('branch');
    expect(heightAt(myren, perch.x)).toBeLessThan(-1);
    expect(soft.some((t) => Math.abs(perch.x - t.x) <= t.width / 2 + 0.3)).toBe(false);
    // It needs no thing on a rail, and no ring.
    expect((myren.movers ?? []).some((mover) => mover.stops.some((stop) => stop.x > FROM - 2 && stop.x < TO + 2 && stop.y > -1))).toBe(false);
    expect((myren.hooks ?? []).some((hook) => hook.x > FROM - 6 && hook.x < TO + 6)).toBe(false);
  });

  it('the bough is out of a jump\'s reach, and each of its ends is over a soft tussock a safe drop below', () => {
    const under = [SPRING + 1, SPRING + 2].map((i) => soft[i]!);
    expect(left(perch)).toBeLessThan(right(under[0]!) - 0.1);
    expect(right(perch)).toBeGreaterThan(left(under[1]!) + 0.1);
    for (const t of under) {
      // Higher than a held jump from it rises, by the margin the leaves keep: the hops of the trail pass under it.
      expect(perch.y - LEDGE_GIVE, `over the tussock at ${t.x}`).toBeGreaterThan(t.y + JUMP_APEX + 0.3);
      expect(perch.y - t.y).toBeLessThan(FALL_LIMIT);
    }
    // It stands clear of where the ghost waits and of the big candies.
    for (const at of [...myren.ghost!.map((p) => p.at.x), ...myren.checkpoints!.map((c) => c.x)]) expect(Math.abs(at - perch.x)).toBeGreaterThan(perch.width / 2 + 3);
  });

  it('the prize is six side candies along the throw, added at the end of the list: a heart first, and a heart over the bough', () => {
    expect(prize).toHaveLength(6);
    // The last six of the list, so that no saved game's side candy changes its place.
    expect([...prize].sort((a, b) => a - b)).toEqual(side.map((_, i) => i).slice(-6));
    expect(isHeart(prize[0]!)).toBe(true);
    expect(isHeart(prize.at(-1)!)).toBe(true);
    // The last is within reach of him standing where the throw sets him down.
    const last = side[prize.at(-1)!]!;
    expect(Math.hypot(last.x - toss.to.x, last.y - (toss.to.y + ELOF_HEIGHT / 2))).toBeLessThan(CANDY_MAGNET - 0.2);
    // Each is higher than a held jump from the highest of the tussocks under them reaches, by the margin the
    // hidden sweets keep; and no two are so near each other that they are drawn as one.
    const highest = Math.max(...soft.slice(SPRING, SPRING + 3).map((t) => t.y));
    for (const i of prize) expect(side[i]!.y, `the candy at ${side[i]!.x}`).toBeGreaterThan(highest + JUMP_APEX + ELOF_HEIGHT / 2 + CANDY_MAGNET + 0.2);
    for (const [n, i] of prize.slice(1).entries()) {
      const before = side[prize[n]!]!;
      expect(Math.hypot(side[i]!.x - before.x, side[i]!.y - before.y), `from the candy at ${before.x}`).toBeGreaterThan(0.4);
    }
  });

  it('lies ten EL clear of the other side ways, and clear of what the story uses', () => {
    // The side ways laid before it: the leaves end at 32.2, and the dead pines over the boardwalk begin at 110.2.
    const others = myren.ledges!.filter((ledge) => ledge !== perch);
    for (const ledge of others) {
      const gap = Math.max(left(ledge) - TO, FROM - right(ledge));
      expect(gap, `the ledge at ${ledge.x}`).toBeGreaterThan(10);
    }
    for (const hook of myren.hooks ?? []) expect(Math.max(hook.x - TO, FROM - hook.x)).toBeGreaterThan(10);
    // What the story uses: the big candies, the places where the ghost waits, and every other thing to use.
    const story = [...myren.checkpoints!.map((c) => c.x), ...myren.ghost!.map((p) => p.at.x), ...myren.spots!.filter((spot) => spot !== glint).map((spot) => spot.at.x)];
    for (const x of story) expect(Math.max(x - TO, glint.at.x - x), `what stands at ${x}`).toBeGreaterThan(3);
  });
});

describe('the toss: the solution', () => {
  it('from the island: a hop onto the soft tussock, a few steps to where it glints, and standing still. He is thrown up along the hearts onto the bough, and steps down onto the trail', () => {
    // Not one exact place: he may stand a little short of the glint, on it, or past it.
    const took: number[] = [];
    for (const at of [glint.at.x - 0.35, glint.at.x, glint.at.x + 0.25]) {
      const sim = onTheIslandAgain();
      const since = sim.steps;
      const began = sim.curr.x;
      expect(onTheTrail(sim), `standing at ${at}`).toBe(true);
      expect(taken(sim)).toBe(0);
      solve(sim, at);
      // Up on the bough, with every candy of the prize, and the tussock that threw him up again behind him.
      expect(onTheBough(sim), `standing at ${at}`).toBe(true);
      expect(sim.curr.x).toBeCloseTo(toss.to.x, 1);
      expect(taken(sim), `standing at ${at}`).toBe(6);
      expect(sim.tussocks[SPRING]!.sunk, `standing at ${at}`).toBe(0);
      // Off the far end of the bough: a step down of less than two EL onto the next soft tussock, further on.
      stepDown(sim, 1);
      expect(onTussock(sim, SPRING + 2), `standing at ${at}`).toBe(true);
      expect(onTheTrail(sim)).toBe(true);
      expect(sim.curr.x).toBeGreaterThan(began + 8);
      took.push(seconds(sim, since));
      // And the trail goes on from there: the next hop is the trail's own.
      leap(sim, 1, right(soft[SPRING + 2]!) - 0.3);
      expect(onTussock(sim, SPRING + 3), `standing at ${at}`).toBe(true);
      // Nothing took him back, nothing sank under him, and the prize is all of the side candy he has.
      expect(sim.bubbles, `standing at ${at}`).toBe(0);
      expect(sim.sinks, `standing at ${at}`).toBe(0);
      expect(sim.collectedSide.filter(Boolean)).toHaveLength(6);
    }
    console.log(`the toss, from the island's big candy to the trail beyond the bough: ${took.map((s) => s.toFixed(1)).join(', ')} s`);
    for (const s of took) expect(s).toBeLessThan(9);
  });

  it('he may stand anywhere on the far half of the tussock: the nearer the glint the sooner he is thrown, and always before it has sunk', () => {
    const waited = [0.2, 0.4, 0.7, 1, 1.15].map((along) => {
      const sim = standingOn(SPRING, along);
      expect(standAt(sim, sim.curr.x), `${along} from its middle`).toBe('thrown');
      const wait = seconds(sim);
      untilHeStands(sim);
      expect(onTheBough(sim), `${along} from its middle`).toBe(true);
      expect(taken(sim), `${along} from its middle`).toBe(6);
      expect(sim.bubbles + sim.sinks).toBe(0);
      return wait;
    });
    console.log(`standing 0.2, 0.4, 0.7, 1 and 1.15 from the middle of the tussock he is thrown after ${waited.map((s) => s.toFixed(2)).join(', ')} s; it would have sunk after ${SINK_TIME} s`);
    // Over the glint, 0.7 from its middle, after a little more than a second; to the sides later.
    expect(waited[2]!).toBeGreaterThan(1.1);
    expect(waited[2]!).toBeLessThan(1.35);
    expect(waited[1]!).toBeGreaterThan(waited[2]!);
    expect(waited[0]!).toBeGreaterThan(waited[1]!);
    expect(waited[3]!).toBeGreaterThan(waited[2]!);
    expect(waited[4]!).toBeGreaterThan(waited[3]!);
    for (const wait of waited) expect(wait).toBeLessThan(SINK_TIME - 0.1);
  });

  it('he is thrown from where he has sunk to, the tussock springs back as he goes, and the throw takes every candy by itself', () => {
    const sim = standingOn(SPRING, glint.at.x - spring.x);
    expect(standAt(sim, glint.at.x)).toBe('thrown');
    // Thrown from where he stood: the throw begins under his feet, not somewhere else.
    expect(Math.hypot(sim.prev.x - toss.from.x, sim.prev.y - toss.from.y)).toBeLessThan(0.05);
    // Two thirds of the way down.
    const sunk = sim.tussocks[SPRING]!.sunk;
    expect(sunk).toBeGreaterThan(0.6);
    expect(sunk).toBeLessThan(0.72);
    let highest = -Infinity;
    let risen = Infinity;
    const since = sim.steps;
    for (let i = 0; i < 4 / STEP && doing(sim) === 'ride'; i++) {
      // The stick and the buttons do nothing on it: whatever he holds, the throw is the same.
      sim.step({ x: i % 40 < 20 ? -1 : 1, y: i % 60 < 30 ? 1 : -1, hopHeld: true, hop: i % 15 === 0, act: i % 25 === 0 });
      highest = Math.max(highest, sim.curr.y);
      if (sim.tussocks[SPRING]!.sunk === 0) risen = Math.min(risen, seconds(sim, since));
    }
    expect(seconds(sim, since)).toBeCloseTo(toss.time, 1);
    // The tussock is back up within the time a soft tussock takes to rise, long before he is down.
    expect(risen).toBeLessThan(RISE_TIME);
    expect(risen).toBeLessThan(toss.time / 2);
    // He rises above the bough and comes down onto it; nowhere is he higher than a safe drop over the trail.
    expect(highest).toBeGreaterThan(perch.y + 0.5);
    expect(highest - spring.y).toBeLessThan(FALL_LIMIT);
    run(sim, 0.1);
    expect(onTheBough(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
  });

  it('on Lugnt too: the marked hop sets him down on its near half, and a step on, standing still, throws him', () => {
    const lugnt = simOptions(settingsFor('lugnt'));
    const sim = onTheIslandAgain(lugnt);
    // He runs: the marked hop carries him onto the soft tussock, and he stops a step further on.
    for (let i = 0; i < 6 / STEP && !(onTussock(sim, SPRING) && sim.curr.x >= glint.at.x - 0.45); i++) sim.step({ ...idle, x: sim.curr.x < spring.x - 0.2 ? 1 : 0.5 });
    expect(onTussock(sim, SPRING)).toBe(true);
    // On Lugnt a tussock sinks only while he stands still. He does, and is thrown.
    expect(standAt(sim, sim.curr.x)).toBe('thrown');
    untilHeStands(sim);
    expect(onTheBough(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
    // A walker on Lugnt is not stopped at the ends of the bough: under each is a tussock to step down to.
    stepDown(sim, 1);
    expect(onTussock(sim, SPRING + 2)).toBe(true);
    expect(sim.bubbles + sim.sinks).toBe(0);
  });
});

describe('the toss: what does not take the prize', () => {
  /** After a wrong try, from wherever it left him on the first three soft tussocks or the island: the solution. */
  function stillSolves(sim: Sim, what: string): void {
    untilHeStands(sim, BUBBLE_TIME + 3);
    // Back to the tussock with the glint, by the trail's own hops against the way it runs.
    for (const i of [SPRING + 2, SPRING + 1]) if (onTussock(sim, i)) leap(sim, -1, left(soft[i]!) + 0.3);
    if (onTheIsland(sim)) hopOn(sim);
    expect(onTussock(sim, SPRING), what).toBe(true);
    expect(standAt(sim, glint.at.x), what).toBe('thrown');
    untilHeStands(sim);
    expect(onTheBough(sim), what).toBe(true);
    expect(taken(sim), what).toBe(6);
  }

  it('jumping for it: no jump from the tussocks under the hearts and the bough takes a candy or reaches the bough', () => {
    let tried = 0;
    for (const i of [SPRING, SPRING + 1, SPRING + 2]) {
      const t = soft[i]!;
      for (let along = -0.9; along <= 0.91; along += 0.3) {
        // A held jump straight up, and one carried to each side with the stick held.
        for (const dir of [0, 1, -1] as const) {
          const sim = standingOn(i, along);
          run(sim, 0.05);
          let highest = -Infinity;
          sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
          for (let step = 0; step < 2 / STEP && !(stands(sim) && step > 10) && doing(sim) !== 'bubble'; step++) {
            sim.step({ ...idle, x: dir, hopHeld: true });
            highest = Math.max(highest, sim.curr.y);
          }
          const what = `a jump to ${dir} from ${(t.x + along).toFixed(1)}`;
          expect(taken(sim), what).toBe(0);
          expect(wasThrown(sim), what).toBe(false);
          expect(highest, what).toBeLessThan(perch.y - LEDGE_GIVE);
          tried++;
        }
      }
      // And a running jump off each end.
      for (const dir of [1, -1] as const) {
        const sim = standingOn(i, -dir * 0.7);
        leap(sim, dir, t.x + dir * (t.width / 2 - 0.3));
        expect(taken(sim), `a running jump off the tussock at ${t.x} to ${dir}`).toBe(0);
        expect(wasThrown(sim)).toBe(false);
        expect(onTheBough(sim)).toBe(false);
        tried++;
      }
    }
    expect(tried).toBeGreaterThan(60);
    // After a jump for the hearts from under them, the solution is as it was.
    const sim = standingOn(SPRING + 1, -0.6);
    run(sim, 0.05);
    jump(sim);
    expect(taken(sim)).toBe(0);
    stillSolves(sim, 'after a jump for the hearts');
  });

  it('hurrying over the tussock, as the trail has taught him: he may even come down on the glint and hop on, and is not thrown', () => {
    // The trail's own hops, at a run: on from the island and off again at once.
    const sim = onTheIslandAgain();
    hopOn(sim);
    leap(sim, 1, right(spring) - 0.3);
    expect(onTussock(sim, SPRING + 1)).toBe(true);
    expect(wasThrown(sim)).toBe(false);
    expect(taken(sim)).toBe(0);
    expect(sim.bubbles + sim.sinks).toBe(0);
    // Standing on the glint itself for as long as a second, and then hopping on.
    for (const pause of [0.3, 0.6, 0.8, 1]) {
      const slow = standingOn(SPRING, glint.at.x - spring.x);
      run(slow, pause);
      expect(wasThrown(slow), `after ${pause} s on the glint`).toBe(false);
      jump(slow, 1);
      expect(onTussock(slow, SPRING + 1), `after ${pause} s on the glint`).toBe(true);
      expect(wasThrown(slow)).toBe(false);
      expect(taken(slow)).toBe(0);
      expect(slow.bubbles + slow.sinks).toBe(0);
    }
    stillSolves(sim, 'after hurrying over it');
  });

  it('standing still on its near half: it sinks under him like every soft tussock, and the glitter bubble takes him back to the island', () => {
    for (const along of [-0.9, -0.5, -0.25, 0, 0.1]) {
      const sim = onTheIslandAgain();
      hopOn(sim);
      expect(standAt(sim, spring.x + along), `${along} from its middle`).toBe('bubble');
      expect(sim.sinks).toBe(1);
      expect(sim.bubbles).toBe(1);
      expect(wasThrown(sim), `${along} from its middle`).toBe(false);
      expect(taken(sim)).toBe(0);
      run(sim, BUBBLE_TIME + 0.3);
      expect(onTheIsland(sim), `${along} from its middle`).toBe(true);
      // It cost him nothing, and the solution is as it was.
      if (along === -0.25) stillSolves(sim, 'after sinking on its near half');
    }
  });

  it('standing still on the tussocks under the hearts and under the bough: the glitter bubble, and nothing more', () => {
    for (const i of [SPRING + 1, SPRING + 2]) {
      for (const along of [-0.7, 0, 0.7]) {
        const sim = standingOn(i, along);
        expect(standAt(sim, sim.curr.x), `on the tussock at ${soft[i]!.x}`).toBe('bubble');
        expect(wasThrown(sim)).toBe(false);
        expect(taken(sim)).toBe(0);
      }
    }
  });

  it('a fall into the water beside the glint: he is not standing, so he is not thrown', () => {
    for (const from of [-0.2, 0.3]) {
      // A run off the far end of the tussock, past the glint, with no jump.
      const sim = standingOn(SPRING, from);
      let nearest = Infinity;
      for (let i = 0; i < 3 / STEP && doing(sim) !== 'bubble'; i++) {
        sim.step({ ...idle, x: 1 });
        nearest = Math.min(nearest, away(sim));
      }
      expect(doing(sim)).toBe('bubble');
      expect(sim.sinks).toBe(0);
      expect(wasThrown(sim), `a run from ${from}`).toBe(false);
      expect(taken(sim)).toBe(0);
      // Falling, he never came within its reach at all: the bubble takes him before he is that low.
      expect(nearest, `a run from ${from}`).toBeGreaterThan(REACH);
    }
  });
});

describe('the toss: no dead end', () => {
  it('he may begin and leave: stepping off before he is thrown changes nothing, the tussock rises again, and the solution is as it was', () => {
    const sim = onTheIslandAgain();
    hopOn(sim);
    // Towards the glint, a moment's standing there, and off again while it sinks: back to the island.
    for (let i = 0; i < 3 / STEP && sim.curr.x < glint.at.x - 0.3 && doing(sim) === 'free'; i++) sim.step({ ...idle, x: 0.5 });
    run(sim, 0.3);
    expect(wasThrown(sim)).toBe(false);
    expect(onTussock(sim, SPRING)).toBe(true);
    expect(sim.tussocks[SPRING]!.sunk).toBeGreaterThan(0.4);
    leap(sim, -1, left(spring) + 0.3);
    expect(onTheIsland(sim)).toBe(true);
    run(sim, RISE_TIME);
    expect(sim.tussocks[SPRING]!.sunk).toBe(0);
    expect(wasThrown(sim)).toBe(false);
    expect(taken(sim)).toBe(0);
    expect(sim.bubbles + sim.sinks).toBe(0);
    solve(sim);
    expect(onTheBough(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
    expect(sim.bubbles + sim.sinks).toBe(0);
  });

  it('from the bough he steps down either way; a tussock that sinks under him after it costs nothing, and the glitter bubble puts him back on the bough', () => {
    const sim = onTheIslandAgain();
    solve(sim);
    // Back the way he came: off the near end, onto the soft tussock he was thrown over.
    stepDown(sim, -1);
    expect(onTussock(sim, SPRING + 1)).toBe(true);
    expect(sim.bubbles).toBe(0);
    // He stands there until it has sunk. The last firm ground he stood on is the bough.
    expect(standAt(sim, sim.curr.x)).toBe('bubble');
    run(sim, BUBBLE_TIME + 0.3);
    expect(onTheBough(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
    // And on, off its far end.
    stepDown(sim, 1);
    expect(onTussock(sim, SPRING + 2)).toBe(true);
    expect(sim.bubbles).toBe(1);
  });

  it('a jump off the bough over open water is the glitter bubble, which puts him back on it', () => {
    const sim = standingOn(SPRING, glint.at.x - spring.x);
    expect(standAt(sim, glint.at.x)).toBe('thrown');
    untilHeStands(sim);
    // A running jump off the far end carries him over the tussock under it.
    leap(sim, 1, right(perch) - 0.2);
    if (doing(sim) === 'bubble') run(sim, BUBBLE_TIME + 0.3);
    expect(onTheBough(sim) || onTheTrail(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
  });
});

describe('the toss: a saved game', () => {
  /** What a save keeps of a simulation (src/main.ts): the big candy, the flags, the side candy, the things in place. */
  const saved = (sim: Sim): SimStart => ({
    checkpoint: sim.checkpoint, flags: [...sim.flags], placed: sim.placed,
    collected: sim.collected.flatMap((got, i) => (got ? [i] : [])), side: sim.collectedSide.flatMap((got, i) => (got ? [i] : [])),
  });

  it('keeps the prize; and taken up at the island, before the toss, it has the toss again, as it has every ride', () => {
    const sim = onTheIslandAgain();
    solve(sim);
    expect(wasThrown(sim)).toBe(true);
    expect(sim.checkpoint).toBe(ISLAND.big);
    const again = new Sim(myren, {}, saved(sim));
    run(again, 0.3);
    expect(onTheIsland(again)).toBe(true);
    // The six are in the bag, and counted once.
    expect(taken(again)).toBe(6);
    expect(again.candyCount).toBe(sim.candyCount);
    // He is before the throw, so it is there again: the glint is back, and the solution is as it was.
    expect(wasThrown(again)).toBe(false);
    solve(again);
    expect(onTheBough(again)).toBe(true);
    expect(again.candyCount).toBe(sim.candyCount);
    expect(again.bubbles + again.sinks).toBe(0);
  });

  it('taken up beyond it, the toss stays taken: its tussock is then a soft tussock like the others, all of it', () => {
    // He has solved it and gone on to the shore's big candy.
    const start: SimStart = { checkpoint: ISLAND.big + 1, flags: [glint.id], side: [...prize] };
    const sim = new Sim(myren, {}, start);
    run(sim, 0.3);
    expect(sim.curr.x).toBeGreaterThan(TO);
    expect(wasThrown(sim)).toBe(true);
    expect(taken(sim)).toBe(6);
    // Back over the soft tussocks, against the way the trail runs, onto the far half of the one that threw him.
    for (const i of [SPRING + 3, SPRING + 2, SPRING + 1, SPRING]) {
      const from = i === SPRING + 3 ? 81.5 : left(soft[i + 1]!);
      leap(sim, -1, from + 0.3);
      expect(onTussock(sim, i), `back onto the tussock at ${soft[i]!.x}`).toBe(true);
    }
    expect(sim.curr.x).toBeGreaterThan(spring.x);
    // It sinks under him, and the bubble takes him back to firm ground.
    expect(standAt(sim, sim.curr.x)).toBe('bubble');
    expect(sim.sinks).toBe(1);
    expect(taken(sim)).toBe(6);
  });

  it('a game saved half-way, sunk but not thrown, is a game in which nothing has happened', () => {
    const sim = onTheIslandAgain();
    hopOn(sim);
    run(sim, 0.4);
    expect(wasThrown(sim)).toBe(false);
    const again = new Sim(myren, {}, saved(sim));
    run(again, 0.3);
    expect(onTheIsland(again)).toBe(true);
    expect(again.tussocks[SPRING]!.sunk).toBe(0);
    solve(again);
    expect(taken(again)).toBe(6);
  });
});

describe('the toss: not on the main way', () => {
  it('following the trail takes none of it: the robot is never thrown, takes no heart, never stands on the bough, and never comes near the thing\'s reach', () => {
    for (const style of ['aventyr', 'lugnt'] as const) {
      for (const fps of [30, 60, 144]) {
        const game = new Game(myren, style === 'lugnt' ? simOptions(settingsFor('lugnt')) : {});
        let wasAhead = false;
        let wasOffered = false;
        let nearest = Infinity;
        let onIt = 0;
        let carried = 0;
        for (let frame = 0; frame < fps * 120 && game.sim.curr.x < TO + 12; frame++) {
          const { x, y, ahead, offered } = decide(game, myren);
          // On Lugnt nothing is jumped: the marked hops carry him.
          const hop = style === 'aventyr' && ahead && !wasAhead;
          game.frame(1 / fps, { x, y, hopHeld: style === 'aventyr' }, { hop, act: offered && !wasOffered, helper: false });
          wasAhead = ahead;
          wasOffered = offered;
          if (stands(game.sim)) nearest = Math.min(nearest, away(game.sim));
          if (onTheBough(game.sim)) onIt++;
          if (doing(game.sim) === 'ride') carried++;
        }
        const what = `${style} at ${fps} Hz`;
        expect(game.sim.curr.x, what).toBeGreaterThanOrEqual(TO + 12);
        expect(wasThrown(game.sim), what).toBe(false);
        expect(carried, what).toBe(0);
        expect(onIt, what).toBe(0);
        expect(game.sim.collectedSide.filter(Boolean), what).toHaveLength(0);
        expect(game.sim.bubbles + game.sim.sinks, what).toBe(0);
        // A tenth of an EL is two fifths of a second more on the tussock than the robot spends there.
        expect(nearest, what).toBeGreaterThan(REACH + 0.1);
      }
    }
  });

  it('the helper never points at it: asked anywhere from the island to the shore, on the trail or up on the bough, it shows the trail\'s next candy', () => {
    const pieces: Vec[] = [glint.at, { x: glint.at.x, y: glint.at.y + 1.5 }, toss.from, toss.to, { x: perch.x, y: perch.y }, ...prize.map((i) => side[i]!)];
    const isTrailCandy = (at: Vec) => myren.candy.some((c) => c.x === at.x && c.y === at.y);
    // Near the shore the next thing the story needs comes within the helper's reach: the place to call Mamma from.
    const story = myren.spots!.filter((spot) => !spot.extra && !spot.touch);
    let asked = 0;
    let candy = 0;
    const ask = (sim: Sim, where: string) => {
      const hint = hintFor(sim, myren);
      expect(hint, where).not.toBeNull();
      const theStorys = story.find((spot) => spot.at.x === hint!.at.x && spot.at.y === hint!.at.y);
      expect(isTrailCandy(hint!.at) || theStorys !== undefined, where).toBe(true);
      expect(hint!.verb, where).toBe(theStorys ? theStorys.verb : null);
      for (const piece of pieces) expect(Math.hypot(hint!.at.x - piece.x, hint!.at.y - piece.y), where).toBeGreaterThan(0.5);
      if (!theStorys) candy++;
      asked++;
    };
    // Along the island, and on every soft tussock of the second run, at rest and half sunk.
    for (let x = ISLAND.from + 0.3; x < ISLAND.to; x += 0.5) {
      const sim = new Sim({ ...myren, spawn: { x, y: 0.01 } });
      run(sim, 0.2);
      ask(sim, `on the island at ${x.toFixed(1)}`);
    }
    for (let i = SPRING; i < soft.length; i++) {
      for (const along of [-0.8, -0.3, 0.2, 0.7]) {
        const sim = standingOn(i, along);
        run(sim, 0.1);
        ask(sim, `on the tussock at ${soft[i]!.x}, ${along} from its middle`);
        run(sim, 0.6);
        if (doing(sim) === 'free') ask(sim, `sunk on the tussock at ${soft[i]!.x}, ${along} from its middle`);
      }
    }
    // Asked with the button too, standing on the glint: the helper goes to the trail's candy.
    const onIt = standingOn(SPRING, glint.at.x - spring.x);
    run(onIt, 0.2);
    onIt.step({ ...idle, help: true });
    expect(onIt.help.step).toBe(1);
    expect(onIt.help.verb).toBeNull();
    expect(isTrailCandy(onIt.help.at!)).toBe(true);
    // And up on the bough, with the puzzle done, it shows the trail again.
    const done = onTheIslandAgain();
    solve(done);
    ask(done, 'on the bough');
    // Forty places asked from, and at half of them it is the trail's candy: from the island and the first
    // tussocks, where the place to call Mamma from is still far off.
    expect(asked).toBeGreaterThanOrEqual(40);
    expect(candy).toBeGreaterThanOrEqual(20);
  });

  it('the trail under it is as it was: the hops of the second run of soft tussocks, both ways, take no candy of the prize and are not stopped by the bough', () => {
    // On from the island to the shore, as the trail runs.
    const on = onTheIslandAgain();
    hopOn(on);
    for (let i = SPRING; i < soft.length; i++) {
      expect(onTussock(on, i)).toBe(true);
      leap(on, 1, right(soft[i]!) - 0.3);
    }
    expect(onTheTrail(on)).toBe(true);
    expect(on.curr.x).toBeGreaterThan(81.5);
    expect(taken(on)).toBe(0);
    expect(wasThrown(on)).toBe(false);
    expect(on.bubbles + on.sinks).toBe(0);
    // And on Lugnt, running: the marked hops carry him under the hearts and the bough.
    const calm = onTheIslandAgain(simOptions(settingsFor('lugnt')));
    expect(runPast(calm, 82.5)).toBe(true);
    expect(taken(calm)).toBe(0);
    expect(wasThrown(calm)).toBe(false);
    expect(calm.bubbles + calm.sinks).toBe(0);
  });
});

describe('the toss: in sight', () => {
  it('from the island the glint and the first hearts are in the trail\'s picture; from the tussock all of the prize and the bough are', () => {
    const island = new Sim({ ...myren, spawn: { x: ISLAND.to - 0.5, y: 0.01 } });
    run(island, 0.2);
    const tussock = standingOn(SPRING, -0.4);
    run(tussock, 0.05);
    // Where its glint is drawn: 1.5 EL over the thing.
    const sparkle = { x: glint.at.x, y: glint.at.y + 1.5 };
    const first = side[prize[0]!]!;
    for (const [name, screen] of Object.entries(SCREENS)) {
      // The trail's own picture: he stands on the ground the trail runs on, and no zone of the puzzle is his.
      expect(cameraIntent(island.curr, myren.cameras).zoom, name).toBe(1.3);
      expect(cameraIntent(tussock.curr, myren.cameras).zoom, name).toBe(1.3);
      const fromTheIsland = picture(island, screen);
      expect(holds(fromTheIsland, sparkle), `${name}: the glint from the island`).toBe(true);
      expect(holds(fromTheIsland, first), `${name}: the first heart from the island`).toBe(true);
      const fromTheTussock = picture(tussock, screen);
      expect(holds(fromTheTussock, sparkle, 0), `${name}: the glint from the tussock`).toBe(true);
      for (const i of prize) expect(holds(fromTheTussock, side[i]!), `${name}: the candy at ${side[i]!.x} from the tussock`).toBe(true);
      expect(holds(fromTheTussock, { x: perch.x, y: perch.y }), `${name}: the bough from the tussock`).toBe(true);
    }
    // On a phone held sideways and on a tablet the whole prize is in it from the island already.
    for (const i of prize) expect(holds(picture(island, SCREENS.phone), side[i]!), `the candy at ${side[i]!.x} from the island`).toBe(true);
    // The prize's first candy by its place in the list, too.
    expect(holds(picture(island, SCREENS.phone), side[side.length - 6]!)).toBe(true);
  });

  it('on the bough the picture is wider and holds the tussocks he steps down to; on the trail under it the picture is as it was, at the top of a jump too', () => {
    const sim = onTheIslandAgain();
    solve(sim);
    expect(cameraIntent(sim.curr, myren.cameras).zoom).toBe(1.5);
    for (const [name, screen] of Object.entries(SCREENS)) {
      const frame = picture(sim, screen);
      for (const i of [SPRING + 1, SPRING + 2]) {
        expect(frame.bottom, `${name}: the tussock at ${soft[i]!.x}`).toBeLessThan(soft[i]!.y - 0.4);
        expect(frame.left, name).toBeLessThan(sim.curr.x - 1.5);
        expect(frame.right, name).toBeGreaterThan(right(perch) + 1);
      }
    }
    // A jump on the bough does not change the picture's width.
    sim.step({ ...idle, hop: true, hopHeld: true });
    for (let i = 0; i < 0.7 / STEP; i++) {
      sim.step({ ...idle, hopHeld: true });
      expect(cameraIntent(sim.curr, myren.cameras).zoom).toBe(1.5);
    }
    // On the trail under the hearts and the bough the picture is the usual one all through a held jump.
    for (const i of [SPRING, SPRING + 1, SPRING + 2]) {
      for (const along of [-0.6, 0.6]) {
        const under = standingOn(i, along);
        run(under, 0.05);
        expect(cameraIntent(under.curr, myren.cameras).zoom).toBe(1.3);
        under.step({ ...idle, hop: true, hopHeld: true });
        for (let step = 0; step < 0.7 / STEP; step++) {
          under.step({ ...idle, hopHeld: true });
          expect(cameraIntent(under.curr, myren.cameras).zoom, `jumping on the tussock at ${soft[i]!.x}`).toBe(1.3);
        }
      }
    }
  });

  it('through the throw he stays in the picture, and so does every candy as he comes to it: on the smallest screen, with the picture following as the view moves it', () => {
    // The view only smooths where the simulation wants to look (src/render/view.ts): these are its rates.
    const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
    for (const [name, screen] of Object.entries(SCREENS)) {
      const sim = onTheIslandAgain();
      const look = cameraIntent(sim.curr, myren.cameras);
      const dt = 1 / 60;
      const frame = (input = idle) => {
        for (let step = 0; step < Math.round(dt / STEP); step++) sim.step(input);
        const want = cameraIntent(sim.curr, myren.cameras);
        look.zoom += (want.zoom - look.zoom) * ease(1.6, dt);
        look.x += (want.x - look.x) * ease(3, dt);
        look.y += (want.y - look.y) * ease(2.5, dt);
        return pictureOf(look, screen);
      };
      // The solution, a frame at a time: the hop, the steps to the glint, and standing still.
      for (let i = 0; i < 600 && sim.curr.x < ISLAND.to - 0.3; i++) frame({ ...idle, x: 1 });
      frame({ ...idle, x: 1, hop: true, hopHeld: true });
      for (let i = 0; i < 600 && !onTussock(sim, SPRING); i++) frame({ ...idle, x: 1, hopHeld: true });
      for (let i = 0; i < 600 && doing(sim) === 'free'; i++) frame({ ...idle, x: sim.curr.x < glint.at.x - 0.05 ? 0.5 : 0 });
      expect(doing(sim), name).toBe('ride');
      let head = Infinity;
      let feet = Infinity;
      let got = taken(sim);
      for (let i = 0; i < 600 && doing(sim) === 'ride'; i++) {
        const now = frame();
        head = Math.min(head, now.top - (sim.curr.y + ELOF_HEIGHT));
        feet = Math.min(feet, sim.curr.y - now.bottom);
        expect(sim.curr.x, name).toBeGreaterThan(now.left + 1);
        expect(sim.curr.x, name).toBeLessThan(now.right - 1);
        // Each candy is in the picture in the frame he takes it.
        for (const index of prize.slice(got, taken(sim))) expect(holds(now, side[index]!, 0.1), `${name}: the candy at ${side[index]!.x}`).toBe(true);
        got = taken(sim);
      }
      expect(got, name).toBe(6);
      // His head never touches the top of the picture, and the water under him never leaves it.
      expect(head, name).toBeGreaterThan(0.3);
      expect(feet, name).toBeGreaterThan(1);
      if (name === 'phone') console.log(`through the throw on a phone held sideways: his head at least ${head.toFixed(2)} EL under the top of the picture`);
    }
  });
});
