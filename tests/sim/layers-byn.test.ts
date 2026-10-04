import { describe, expect, it } from 'vitest';
import { byn } from '../../src/content/chapters/byn';
import { LACE_REACH, ELOF_HEIGHT } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { idle, jump, leap, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

// The shop's shelves in Byn (docs/level-design.md): three steps of shelf, two lamps' rings, a long shelf and
// a step down. It is the chapter's only side way, and what it holds is side candy.

const FLOOR = byn.shop!.floor;
const shelves = byn.ledges!;
const lamps = byn.hooks!.filter((hook) => hook.extra);
const WAY = { from: 129, to: 150 };
const inShop = () => {
  const sim = new Sim({ ...byn, spawn: { x: 129.4, y: FLOOR + 0.01 } });
  run(sim, 0.3);
  return sim;
};

/** Up the three shelves from the floor, to the edge of the top one. */
function climb(sim: Sim): void {
  walkTo(sim, shelves[0]!.x - 0.3);
  jump(sim);
  leap(sim, 1, shelves[0]!.x + 0.3);
  leap(sim, 1, shelves[1]!.x + 0.3);
  walkTo(sim, shelves[2]!.x + 0.4);
}

describe('the shelves of the sweet shop', () => {
  it('begin where the trail passes, a held jump above the floor, and none is a ceiling for the bag\'s big candy', () => {
    expect(shelves[0]!.y - FLOOR).toBeLessThan(0.91);
    for (const [i, shelf] of shelves.slice(1, 3).entries()) expect(shelf.y - shelves[i]!.y).toBeLessThan(0.91);
    expect(shelves[0]!.x).toBeGreaterThan(byn.checkpoints![8]!.x + 1.3);
    expect(shelves.at(-1)!.x).toBeLessThan(byn.checkpoints![9]!.x - 1.2);
  });

  it('the lamps\' rings are out of the lace\'s reach from the floor, and in reach from the top shelf', () => {
    expect(lamps).toHaveLength(2);
    expect(lamps[1]!.y).toBe(lamps[0]!.y);
    for (const lamp of lamps) expect(lamp.y - (FLOOR + ELOF_HEIGHT / 2)).toBeGreaterThan(LACE_REACH);
    const sim = inShop();
    runPast(sim, WAY.to);
    expect(sim.curr.y).toBeCloseTo(FLOOR, 1);
    const up = inShop();
    climb(up);
    expect(up.curr.y).toBeCloseTo(shelves[2]!.y, 1);
    expect(up.curr.verb).toBe('lace');
  });

  it('are played from the floor to the floor: up three shelves, along both lamps, and down before the bag', () => {
    // Not one exact moment: anywhere on the upper part of each swing will do.
    for (const release of [0.7, 0.8, 0.9]) {
      const sim = inShop();
      climb(sim);
      const taken = swingAlong(sim, 1, 2, release);
      expect(taken, `let go at ${release}`).toEqual(lamps.map((lamp) => lamp.x));
      expect(sim.curr.y, `let go at ${release}`).toBeCloseTo(shelves[3]!.y, 1);
      runPast(sim, WAY.to + 0.5);
      run(sim, 0.4);
      // It lets out forward, onto the trail's floor, with nothing lost and no bubble.
      expect(sim.curr.grounded).toBe(true);
      expect(sim.curr.y).toBeCloseTo(FLOOR, 1);
      expect(sim.curr.x).toBeGreaterThan(WAY.to);
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
      expect(sideTaken(sim, WAY.from, WAY.to), `let go at ${release}`).toEqual({ taken: byn.side!.length, of: byn.side!.length });
    }
  });

  it('a miss costs nothing: letting go too early drops him on the floor under the lamps, unhurt', () => {
    const sim = inShop();
    climb(sim);
    const taken = swingAlong(sim, 1, 1, 0.15);
    expect(taken).toEqual([lamps[0]!.x]);
    run(sim, 1.5);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.y).toBeCloseTo(FLOOR, 1);
    expect(sim.bubbles).toBe(0);
  });

  it('keep their candy for those who climb: following the trail along the floor finds none of it', () => {
    const sim = new Sim({ ...byn, spawn: { x: 123, y: FLOOR + 0.01 } });
    for (let i = 0; i < 3000 && sim.curr.x < 156; i++) sim.step({ ...idle, x: 1 });
    expect(sim.curr.x).toBeGreaterThanOrEqual(156);
    expect(sideTaken(sim, WAY.from, WAY.to).taken).toBe(0);
    // The trail's own row along the floor is all his.
    const along = byn.candy.flatMap((candy, i) => (candy.x > 124 && candy.x < 155 ? [i] : []));
    expect(along.every((i) => sim.collected[i])).toBe(true);
  });
});
