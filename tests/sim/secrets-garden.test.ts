import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { foundFlag } from '../../src/content/kinds';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { heightAt } from '../robot/robot';
import { idle, jump, leap, run, runPast, swingAlong, walkTo } from './drive';

// The hidden sweets of Gården that have a way of their own (docs/level-design.md): each is played here the
// way its `way` says, and looked for along the trail, where it must not be found.

const sweet = (kind: string) => garden.hidden!.find((h) => h.kind === kind)!;
const has = (sim: Sim, kind: string) => sim.flags.has(foundFlag(kind));
const onTheGround = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(garden, sim.curr.x)) < 0.05;
/** Waits until he is on his own feet again: a drop may have knocked him over. */
function settle(sim: Sim): void {
  for (let i = 0; i < 4 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step(idle);
}
/** A held jump straight up from the ground at an x, and what he found by it. */
function jumpAt(x: number): Sim {
  const sim = new Sim({ ...garden, spawn: { x, y: heightAt(garden, x) + 0.01 } }, {}, { flags: ['ladybird'] });
  run(sim, 0.2);
  sim.step({ ...idle, hop: true, hopHeld: true });
  run(sim, 0.9, { hopHeld: true });
  return sim;
}

describe('skumbanan, at the end of the clothes line', () => {
  const banana = sweet('skumbanan');
  const rings = garden.hooks!.filter((hook) => hook.extra && hook.x > 100);

  it('says how it is reached, and hangs in sight over the dew rain, beyond the last ring', () => {
    expect(banana.way).toBe('at the end of the clothes line');
    expect(banana.x).toBeGreaterThan(rings[2]!.x);
    expect(banana.x).toBeLessThan(130);
    // Higher than a held jump from the lawn takes him, and lower than the rings: in the picture from the trail.
    expect(banana.y).toBeGreaterThan(2.6);
    expect(banana.y).toBeLessThan(rings[0]!.y);
  });

  it('is his after three swings in a row from the boulder, wherever on the upper part of a swing he lets go', () => {
    for (const release of [0.7, 0.8, 0.9]) {
      const sim = new Sim({ ...garden, spawn: { x: 102, y: 1.31 } });
      run(sim, 0.3);
      expect(onTheGround(sim)).toBe(true);
      // Up the three leaves from the boulder's top.
      walkTo(sim, 104.6);
      jump(sim);
      walkTo(sim, 105.5);
      jump(sim, 1);
      walkTo(sim, 107.5);
      jump(sim, 1);
      expect(sim.curr.y).toBeCloseTo(3, 0);
      expect(has(sim, 'skumbanan')).toBe(false);
      expect(swingAlong(sim, 1, 3, release), `let go at ${release}`).toEqual(rings.map((ring) => ring.x));
      // On the far leaf: a few steps along it, and it is his.
      walkTo(sim, banana.x);
      expect(has(sim, 'skumbanan'), `let go at ${release}`).toBe(true);
      // And on down to the lawn, before the big candy.
      runPast(sim, 127.5);
      settle(sim);
      expect(onTheGround(sim)).toBe(true);
      expect(sim.curr.x).toBeLessThan(130);
      expect(sim.bubbles).toBe(0);
      expect(sim.knocks).toBe(0);
    }
  });

  it('is not found on the trail under it: not at a run, and not by held jumps all the way through the dew rain', () => {
    const ran = new Sim({ ...garden, spawn: { x: 99, y: 0.01 } });
    run(ran, 0.3);
    runPast(ran, 131, 40);
    expect(ran.curr.x).toBeGreaterThan(131);
    expect(has(ran, 'skumbanan')).toBe(false);
    for (const dir of [1, -1] as const) {
      const sim = new Sim({ ...garden, spawn: { x: dir > 0 ? 118.5 : 129, y: 0.01 } });
      run(sim, 0.3);
      for (let i = 0; i < 60 && (dir > 0 ? sim.curr.x < 129 : sim.curr.x > 118.5); i++) {
        leap(sim, dir);
        settle(sim);
      }
      expect(has(sim, 'skumbanan'), `leaping ${dir > 0 ? 'right' : 'left'}`).toBe(false);
    }
    // Nor by a held jump straight up from the lawn, anywhere under the leaf it hangs over.
    for (let x = banana.x - 2; x <= banana.x + 2; x += 0.25) expect(has(jumpAt(x), 'skumbanan'), `a jump at ${x}`).toBe(false);
  });
});

describe('skumsvamp, back up the hose, on the planks under the deck', () => {
  const mushroom = sweet('skumsvamp');
  const hose = garden.climbs![0]!;
  /**
   * He has turned the ladybird and slid down the hose, as the trail goes. With the stick held to the right
   * he walks on from its foot; with it at rest he stands there.
   */
  const atTheFoot = (stick = 0) => {
    const sim = new Sim({ ...garden, spawn: { x: 45.6, y: 6.01 } }, {}, { flags: ['ladybird'] });
    run(sim, 0.3);
    sim.step({ ...idle, act: true });
    for (let i = 0; i < 3 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step({ ...idle, x: stick });
    if (stick === 0) run(sim, 0.5);
    return sim;
  };

  it('says how it is reached, and lies under the deck boards a little way from the hose', () => {
    expect(mushroom.way).toBe('back up the hose, on the planks under the deck');
    expect(mushroom.x - hose.x).toBeGreaterThan(2);
    expect(mushroom.x - hose.x).toBeLessThan(5);
    expect(mushroom.y).toBeLessThan(garden.roofs![0]!.y - 2);
  });

  it('is his when he climbs back up the hose, jumps off onto the first plank and on to the second', () => {
    const sim = atTheFoot();
    expect(onTheGround(sim)).toBe(true);
    expect(sim.curr.x).toBeCloseTo(hose.x, 1);
    expect(has(sim, 'skumsvamp')).toBe(false);
    // Up: pushing up takes hold of the hose again.
    for (let i = 0; i < 8 / STEP && sim.curr.y < 2.6; i++) sim.step({ ...idle, y: 1 });
    expect(sim.curr.mode).toBe('climb');
    // Hoppa, held, with the stick to the right: off the hose and onto the first plank.
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    for (let i = 0; i < 3 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.vy <= 0.01); i++) sim.step({ ...idle, x: 1, hopHeld: true });
    run(sim, 0.1);
    expect(sim.curr.y).toBeCloseTo(2.4, 0);
    expect(has(sim, 'skumsvamp')).toBe(false);
    // A held jump to the right, onto the second: the sweet hangs over it.
    walkTo(sim, 48.7);
    jump(sim, 1);
    walkTo(sim, mushroom.x);
    expect(has(sim, 'skumsvamp')).toBe(true);
    // And out forward: off the plank's far end, onto the ground under the deck.
    runPast(sim, 51.5);
    run(sim, 0.5);
    expect(onTheGround(sim)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(hose.x);
    expect(sim.bubbles).toBe(0);
  });

  it('is not found on the trail: sliding down the hose and going on, at a run or by held jumps', () => {
    const ran = atTheFoot(1);
    runPast(ran, 53);
    expect(ran.curr.x).toBeGreaterThan(53);
    expect(has(ran, 'skumsvamp')).toBe(false);
    const hopping = atTheFoot(1);
    for (let i = 0; i < 30 && hopping.curr.x < 53; i++) leap(hopping, 1);
    expect(hopping.curr.x).toBeGreaterThan(53);
    expect(has(hopping, 'skumsvamp')).toBe(false);
    // Nor by a held jump straight up from the ground, anywhere under the planks.
    for (let x = 46.6; x <= 51.2; x += 0.2) {
      const sim = jumpAt(x);
      expect(has(sim, 'skumsvamp'), `a jump at ${x.toFixed(1)}`).toBe(false);
      expect(sim.curr.y).toBeLessThan(1.2);
    }
  });

  it('and the first swing of the trail, right beside it, does not take it either', () => {
    const sim = new Sim({ ...garden, spawn: { x: 49.5, y: 0.01 } }, {}, { flags: ['ladybird'] });
    run(sim, 0.3);
    expect(swingAlong(sim, 1, 1, 0.8)).toEqual([garden.hooks![0]!.x]);
    expect(sim.curr.x).toBeGreaterThan(garden.hooks![0]!.x);
    expect(has(sim, 'skumsvamp')).toBe(false);
  });
});
