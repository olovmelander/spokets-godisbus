import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { myren } from '../../src/content/chapters/myren';
import { TRAIL_SHAPES, trailShape } from '../../src/render/candy';
import { settingsFor, simOptions } from '../../src/save/settings';
import {
  BERRY_HEIGHT, BUBBLE_TIME, ELOF_HEIGHT, FALL_LIMIT, HOP_APEX, JUMP_APEX, LACE_REACH, LEDGE_GIVE, STEP, SWING_MAX, SWING_MIN_LENGTH,
} from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge } from '../../src/sim/types';
import { decide, heightAt } from '../robot/robot';
import { idle, jump, leap, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

// The first layers over Myren (docs/level-design.md): a leaf over the first cranberry, five leaves over the
// firm tussocks, and three rings between the dead pines over the boardwalk. Each is played here from the
// trail's ground and back to it, on Äventyr.

const ledges = myren.ledges!;
const side = myren.side!;
const berryLeaf = ledges.find((ledge) => ledge.look === 'leaf' && ledge.x < 10)!;
const leaves = ledges.filter((ledge) => ledge.look === 'leaf' && ledge.x > 10);
const [lower, upper, landing] = ledges.filter((ledge) => ledge.look === 'branch') as [Ledge, Ledge, Ledge];
const rings = myren.hooks!;
/** The boardwalk's top. */
const BOARDS = 4.5;

const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
/** He stands on this ledge: on his feet, at its top, over it. */
const on = (sim: Sim, ledge: Ledge) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.1 && sim.curr.x > left(ledge) - 0.2 && sim.curr.x < right(ledge) + 0.2;
/** He stands on the ground the trail runs on. */
const onTheTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(myren, sim.curr.x)) < 0.05;
/** The first side candy that lies over this ledge, within reach of him standing on it: its place in the list, or -1. */
const over = (ledge: Ledge) => side.findIndex((c) => Math.abs(c.x - ledge.x) <= ledge.width / 2 && c.y - ledge.y > 0.3 && c.y - ledge.y < 0.8);
/** Side candy is drawn as a heart or a lollipop by its place in the list. */
const isHeart = (index: number) => TRAIL_SHAPES[trailShape(index, 'side')] === 'hjarta';
const seconds = (sim: Sim, since: number) => (sim.steps - since) * STEP;

describe('the leaf over the first cranberry', () => {
  const berry = myren.bouncers![0]!;

  it('is higher than he jumps and lower than the berry bounces him, with a heart over the berry as its tell', () => {
    expect(Math.abs(berry.x - berryLeaf.x)).toBeLessThan(berryLeaf.width / 2);
    expect(berryLeaf.y - LEDGE_GIVE).toBeGreaterThan(JUMP_APEX + 0.3);
    expect(berryLeaf.y).toBeLessThan(BERRY_HEIGHT + berry.lift - 0.5);
    const tell = side.findIndex((c) => Math.abs(c.x - berry.x) < 0.1 && c.y > berryLeaf.y && c.y - berryLeaf.y < 0.8);
    expect(tell).toBeGreaterThanOrEqual(0);
    expect(isHeart(tell)).toBe(true);
  });

  it('is reached by jumping for the heart: he comes down on the berry, is put on the leaf, and walks off its far end', () => {
    const sim = new Sim(myren);
    run(sim, 0.2);
    const since = sim.steps;
    expect(walkTo(sim, berry.x)).toBe(true);
    expect(onTheTrail(sim)).toBe(true);
    jump(sim);
    expect(sim.bounces).toBe(1);
    expect(on(sim, berryLeaf)).toBe(true);
    expect(sideTaken(sim, 0, 10)).toEqual({ taken: 1, of: 2 });
    // Along the leaf and off its far end: a drop of less than two EL onto the ground the trail runs on,
    // further on than he began.
    expect(walkTo(sim, right(berryLeaf) + 0.8)).toBe(true);
    expect(sideTaken(sim, 0, 10)).toEqual({ taken: 2, of: 2 });
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(berry.x);
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(8);
  });

  it('is not reached from the ground beside the berry, and the heart is not taken there', () => {
    for (const x of [berry.x - 0.6, berry.x + 0.6, berryLeaf.x + 0.9]) {
      const sim = new Sim({ ...myren, spawn: { x, y: 0.01 } });
      run(sim, 0.2);
      jump(sim);
      expect(sim.bounces, `a jump at ${x}`).toBe(0);
      expect(onTheTrail(sim), `a jump at ${x}`).toBe(true);
      expect(sideTaken(sim, 0, 10).taken, `a jump at ${x}`).toBe(0);
    }
  });

  it('is passed over by the run from the first berry to the second', () => {
    // A running jump from a little way off comes down on the first berry, and the bounce carries him on.
    for (const from of [0.6, 1, 1.4]) {
      const sim = new Sim({ ...myren, spawn: { x: from - 1.2, y: 0.01 } });
      run(sim, 0.1);
      runPast(sim, from);
      sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
      let stoodOnIt = false;
      for (let i = 0; i < 4 / STEP && !(sim.bounces === 2 && sim.curr.grounded); i++) {
        sim.step({ ...idle, x: 1, hopHeld: true });
        stoodOnIt ||= on(sim, berryLeaf);
      }
      expect(sim.bounces, `a jump from ${from}`).toBe(2);
      expect(stoodOnIt, `a jump from ${from}`).toBe(false);
      expect(onTheTrail(sim), `a jump from ${from}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });
});

describe('the leaves over the first tussocks', () => {
  const [first, second, third, fourth, fifth] = leaves as [Ledge, Ledge, Ledge, Ledge, Ledge];

  /** He stands on the third tussock, under the first leaf. */
  function start(): Sim {
    const sim = new Sim({ ...myren, spawn: { x: 19.6, y: 0.31 } });
    run(sim, 0.3);
    walkTo(sim, first.x - 0.3);
    return sim;
  }

  /** Up the first two, by a held jump straight up under each. */
  function upTwo(sim: Sim): void {
    jump(sim);
    expect(on(sim, first)).toBe(true);
    walkTo(sim, left(second) + 0.3);
    jump(sim);
    expect(on(sim, second)).toBe(true);
  }

  it('are five between x 18 and x 40, each a step he can make from the last, with side candy over every one', () => {
    expect(leaves).toHaveLength(5);
    for (const leaf of leaves) {
      expect(left(leaf)).toBeGreaterThan(18);
      expect(right(leaf)).toBeLessThan(40);
      expect(leaf.width).toBeGreaterThanOrEqual(1.6);
      expect(over(leaf), `the leaf at ${leaf.x}`).toBeGreaterThanOrEqual(0);
    }
    // The first leaf's is a heart: the tell of the way, in sight from the tussock under it.
    expect(isHeart(over(first))).toBe(true);
    // The first is over its tussock: more than a hop and no more than a comfortable held jump above it.
    const under = heightAt(myren, first.x);
    expect(heightAt(myren, left(first))).toBe(under);
    expect(heightAt(myren, right(first))).toBe(under);
    expect(first.y - under).toBeGreaterThan(HOP_APEX + LEDGE_GIVE);
    expect(first.y - under).toBeLessThanOrEqual(0.9);
    for (const [i, leaf] of leaves.slice(1).entries()) {
      const last = leaves[i]!;
      expect(leaf.y - last.y, `up to the leaf at ${leaf.x}`).toBeLessThanOrEqual(0.9);
      expect(left(leaf) - right(last), `across to the leaf at ${leaf.x}`).toBeLessThanOrEqual(1.6);
      expect(leaf.x).toBeGreaterThan(last.x);
    }
    // All but the first are higher than a held jump from any tussock rises: the trail's hops pass under them.
    let highest = -Infinity;
    for (let x = 15.5; x < 36; x += 0.1) highest = Math.max(highest, heightAt(myren, x));
    for (const leaf of leaves.slice(1)) expect(leaf.y - LEDGE_GIVE, `the leaf at ${leaf.x}`).toBeGreaterThan(highest + JUMP_APEX + 0.3);
    // The last ends over the wide tussock, short of its big candy, and a safe drop above it.
    const wide = myren.checkpoints![1]!;
    expect(heightAt(myren, right(fifth))).toBe(wide.y);
    expect(right(fifth)).toBeLessThan(wide.x - 1);
    expect(fifth.y - wide.y).toBeLessThan(FALL_LIMIT);
  });

  it('are entered by a held jump from the third tussock, and let out onto the wide tussock with the big candy', () => {
    // Not one exact take-off: anywhere on the last half EL of a leaf will do.
    for (const early of [0.1, 0.3, 0.5]) {
      const sim = start();
      const since = sim.steps;
      expect(onTheTrail(sim), `taking off ${early} early`).toBe(true);
      const began = sim.curr.x;
      upTwo(sim);
      // A run along the second and a held jump over open water, up to the third.
      walkTo(sim, left(second) + 0.4);
      leap(sim, 1, right(second) - early);
      expect(on(sim, third), `taking off ${early} early`).toBe(true);
      // The same, level, to the fourth.
      walkTo(sim, left(third) + 0.5);
      leap(sim, 1, right(third) - early);
      expect(on(sim, fourth), `taking off ${early} early`).toBe(true);
      // He runs off the fourth onto the fifth, which is lower, and off the fifth onto the wide tussock.
      runPast(sim, right(fifth) + 0.9);
      run(sim, 0.5);
      expect(onTheTrail(sim), `taking off ${early} early`).toBe(true);
      expect(sim.curr.x).toBeGreaterThan(began);
      expect(sim.curr.x).toBeLessThan(36);
      expect(sim.bubbles, `taking off ${early} early`).toBe(0);
      expect(sideTaken(sim, 18, 40), `taking off ${early} early`).toEqual({ taken: 6, of: 6 });
      expect(seconds(sim, since)).toBeLessThan(10);
    }
  });

  it('can be run in one go: the stick held right from the first leaf, and Hoppa three times', () => {
    for (const hops of [[20.4, 22.1, 25.5], [20.5, 22.2, 25.7], [20.6, 22.3, 25.85]]) {
      const sim = start();
      const since = sim.steps;
      jump(sim);
      const waiting = [...hops];
      for (let i = 0; i < 12 / STEP && sim.curr.x < right(fifth) + 0.9 && sim.curr.mode !== 'bubble'; i++) {
        const press = waiting.length > 0 && sim.curr.grounded && sim.curr.x >= waiting[0]!;
        if (press) waiting.shift();
        sim.step({ ...idle, x: 1, hopHeld: true, hop: press });
      }
      run(sim, 0.5);
      expect(onTheTrail(sim), `Hoppa at ${hops.join(', ')}`).toBe(true);
      expect(sim.curr.x).toBeGreaterThan(right(fifth));
      expect(sim.bubbles, `Hoppa at ${hops.join(', ')}`).toBe(0);
      expect(sideTaken(sim, 18, 40), `Hoppa at ${hops.join(', ')}`).toEqual({ taken: 6, of: 6 });
      expect(seconds(sim, since)).toBeLessThan(6);
    }
  });

  it('are over water: a jump that falls short ends in the glitter bubble, which puts him back on the leaf he left', () => {
    const sim = start();
    upTwo(sim);
    // Walking, he stops at the end of a leaf over the water: he cannot stroll in.
    walkTo(sim, right(second) + 1, 3);
    expect(on(sim, second)).toBe(true);
    // A jump with too little of a run comes down between the second leaf and the third, over open water.
    // There is no ground to land on there, so this fall is the one that ends in the bubble. It carries him to
    // the last firm ground he stood on, which is the leaf, and he keeps the hearts he has.
    walkTo(sim, right(second) - 0.35);
    jump(sim, 0.5);
    expect(sim.bubbles).toBe(1);
    run(sim, BUBBLE_TIME + 1);
    expect(on(sim, second)).toBe(true);
    expect(sideTaken(sim, 18, 40).taken).toBe(2);
    // And from there the way goes on.
    walkTo(sim, left(second) + 0.4);
    leap(sim, 1, right(second) - 0.2);
    expect(on(sim, third)).toBe(true);
    expect(sim.bubbles).toBe(1);
  });
});

describe('the rings between the dead pines over the boardwalk', () => {
  /** He stands on the boards, under the first pine's branches. */
  function start(): Sim {
    const sim = new Sim({ ...myren, spawn: { x: 108, y: BOARDS + 0.01 } });
    run(sim, 0.2);
    walkTo(sim, lower.x);
    return sim;
  }

  /** Up the two branches, by a held jump straight up to each. */
  function upThePine(sim: Sim): void {
    jump(sim);
    expect(on(sim, lower)).toBe(true);
    jump(sim);
    expect(on(sim, upper)).toBe(true);
  }

  it('are two branches up from the boards, three rings in a row, and a branch to land on', () => {
    // The steps: one pine, the upper branch over the lower, each a held jump above the last.
    expect(upper.x).toBe(lower.x);
    expect(lower.y - BOARDS).toBeLessThanOrEqual(0.9);
    expect(upper.y - lower.y).toBeLessThanOrEqual(0.9);
    expect(upper.y - BOARDS).toBeCloseTo(1.7, 5);
    // The rings: off the way on, at one height, one length and one spacing.
    expect(rings).toHaveLength(3);
    for (const ring of rings) {
      expect(ring.extra).toBe(true);
      expect(ring.land).toBeUndefined();
      expect(ring.y).toBe(rings[0]!.y);
      expect(ring.length).toBe(rings[0]!.length);
      // Standing on the boards, with his middle half an Elof up, the lace does not reach one.
      expect(ring.y - (BOARDS + ELOF_HEIGHT / 2)).toBeGreaterThan(LACE_REACH);
      // On a swing pumped to its fullest, with the lace climbed as short as it goes, he is still a safe drop over the boards.
      expect(ring.y - SWING_MIN_LENGTH * Math.cos(SWING_MAX) - ELOF_HEIGHT / 2 - BOARDS).toBeLessThan(FALL_LIMIT);
      // At the bottom of the swing his feet clear the boards by more than his own height.
      expect(ring.y - ring.length - ELOF_HEIGHT / 2 - BOARDS).toBeGreaterThan(ELOF_HEIGHT);
    }
    expect(rings[1]!.x - rings[0]!.x).toBeCloseTo(rings[2]!.x - rings[1]!.x, 5);
    // The first is in reach from the upper branch.
    expect(Math.hypot(rings[0]!.x - upper.x, rings[0]!.y - (upper.y + ELOF_HEIGHT / 2))).toBeLessThan(LACE_REACH);
    // The landing: beyond the last ring, level with the upper branch, too high to jump to, and before the ramp.
    expect(left(landing)).toBeGreaterThan(rings[2]!.x);
    expect(landing.y).toBe(upper.y);
    expect(landing.y - BOARDS).toBeGreaterThan(JUMP_APEX + LEDGE_GIVE + 0.3);
    expect(right(landing) + 2).toBeLessThan(128);
    // Side candy: over every branch, and two along each swing. The lower branch's is a heart: the tell of the way.
    for (const branch of [lower, upper, landing]) expect(over(branch), `the branch at ${branch.x},${branch.y}`).toBeGreaterThanOrEqual(0);
    expect(isHeart(over(lower))).toBe(true);
    for (const ring of rings) expect(side.filter((c) => c.x >= ring.x - 0.1 && c.x < ring.x + 2 && c.y > landing.y + 0.5 && c.y < ring.y)).toHaveLength(2);
  });

  it('are swung along one after another, from the upper branch to the landing branch, and he steps down to the boards', () => {
    // Not one exact moment: he may let go anywhere on the way up.
    for (const release of [0.5, 0.7, 0.8, 0.9]) {
      const sim = start();
      const since = sim.steps;
      expect(onTheTrail(sim), `let go at ${release}`).toBe(true);
      const began = sim.curr.x;
      upThePine(sim);
      expect(swingAlong(sim, 1, 3, release), `let go at ${release}`).toEqual(rings.map((ring) => ring.x));
      expect(on(sim, landing), `let go at ${release}`).toBe(true);
      // Off the end of the branch: a drop of 1.7 EL onto the boards, before the ramp.
      runPast(sim, right(landing) + 0.4);
      run(sim, 0.6);
      expect(onTheTrail(sim), `let go at ${release}`).toBe(true);
      expect(sim.curr.y).toBeCloseTo(BOARDS, 1);
      expect(sim.curr.x).toBeGreaterThan(began);
      expect(sim.curr.x).toBeLessThan(128);
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
      expect(sideTaken(sim, 104, 128), `let go at ${release}`).toEqual({ taken: 9, of: 9 });
      expect(seconds(sim, since)).toBeLessThan(11);
    }
  });

  it('a fall from them lands on the boardwalk, unhurt, and the trail goes on from there', () => {
    const sim = start();
    upThePine(sim);
    // He lets go of the first ring and does not throw again.
    expect(swingAlong(sim, 1, 1, 0.8)).toEqual([rings[0]!.x]);
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.curr.y).toBeCloseTo(BOARDS, 1);
    expect(sim.curr.x).toBeGreaterThan(rings[0]!.x);
    expect(sim.curr.x).toBeLessThan(left(landing));
    expect(sim.bubbles).toBe(0);
    // Nor is walking off the upper branch more than a step down.
    const walker = start();
    upThePine(walker);
    walkTo(walker, left(upper) - 0.6);
    expect(onTheTrail(walker)).toBe(true);
    expect(walker.bubbles).toBe(0);
  });

  it('leave the boardwalk as it was: walking under them he is never offered the lace, and takes no heart', () => {
    const sim = new Sim({ ...myren, spawn: { x: 104.6, y: BOARDS + 0.01 } });
    let offered = 0;
    let highest = 0;
    for (let i = 0; i < 12 / STEP && sim.curr.x < 127.5; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.curr.verb === 'lace') offered++;
      highest = Math.max(highest, sim.curr.y);
    }
    expect(sim.curr.x).toBeGreaterThan(127);
    expect(offered).toBe(0);
    expect(highest).toBeLessThan(BOARDS + 0.05);
    expect(sideTaken(sim, 104, 128).taken).toBe(0);
    // The landing branch is not a step up from the boards: a held jump under it comes down where it began.
    const under = new Sim({ ...myren, spawn: { x: landing.x, y: BOARDS + 0.01 } });
    run(under, 0.2);
    jump(under);
    expect(onTheTrail(under)).toBe(true);
    expect(sideTaken(under, 104, 128).taken).toBe(0);
  });
});

describe('the trail under the layers', () => {
  it('is followed as before: the robot takes no side candy, finds no sweet with a way, and is never offered the lace', () => {
    for (const style of ['aventyr', 'lugnt'] as const) {
      const game = new Game(myren, style === 'lugnt' ? simOptions(settingsFor('lugnt')) : {});
      let wasAhead = false;
      let wasOffered = false;
      let lace = 0;
      let onALedge = 0;
      for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
        const { x, y, ahead, offered } = decide(game, myren);
        // On Lugnt nothing is jumped: the marked hops carry him.
        const hop = style === 'aventyr' && ahead && !wasAhead;
        game.frame(1 / 60, { x, y, hopHeld: style === 'aventyr' }, { hop, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
        if (game.sim.curr.verb === 'lace') lace++;
        if (ledges.some((ledge) => on(game.sim, ledge))) onALedge++;
      }
      expect(game.sim.flags.has('goal'), style).toBe(true);
      expect(game.sim.bubbles, style).toBe(0);
      expect(game.sim.collectedSide.filter(Boolean), style).toHaveLength(0);
      expect(lace, style).toBe(0);
      expect(onALedge, style).toBe(0);
      for (const sweet of myren.hidden!.filter((h) => h.way !== undefined)) expect(game.sim.flags.has(`found:${sweet.kind}`), `${style}: ${sweet.kind}`).toBe(false);
    }
  });
});
