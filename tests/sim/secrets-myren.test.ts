import { describe, expect, it } from 'vitest';
import { myren } from '../../src/content/chapters/myren';
import { foundFlag } from '../../src/content/kinds';
import { CANDY_MAGNET, ELOF_HEIGHT, JUMP_APEX, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { heightAt } from '../robot/robot';
import { idle, jump, run, runPast, swingAlong, walkTo } from './drive';

// The sweets of Myren that have a way of their own (docs/level-design.md): each is played here the way it says.

const sweet = (kind: string) => myren.hidden!.find((h) => h.kind === kind)!;
const found = (sim: Sim, kind: string) => sim.flags.has(foundFlag(kind));
/** He stands on the ground the trail runs on. */
const onTheTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(myren, sim.curr.x)) < 0.05;
/** The highest a held jump from the ground at x brings his reach. */
const jumpReach = (x: number) => heightAt(myren, x) + JUMP_APEX + ELOF_HEIGHT / 2 + CANDY_MAGNET;

describe('stekt ägg: bounced up from the cranberry', () => {
  const egg = sweet('stektagg');
  const berry = myren.bouncers![0]!;
  const leaf = myren.ledges!.find((ledge) => ledge.look === 'leaf' && Math.abs(ledge.x - berry.x) < ledge.width / 2)!;

  it('lies over the near end of the leaf above the first cranberry, in sight from the start and out of a jump\'s reach', () => {
    expect(egg.way).toBe('bounced up from the cranberry');
    expect(egg.x).toBeGreaterThan(leaf.x - leaf.width / 2);
    expect(egg.x).toBeLessThan(berry.x);
    // Within reach of him standing on the leaf, and well above the reach of a held jump from the ground.
    expect(egg.y - (leaf.y + ELOF_HEIGHT / 2)).toBeLessThan(CANDY_MAGNET - 0.2);
    expect(egg.y).toBeGreaterThan(jumpReach(egg.x) + 0.2);
    // Near where the chapter begins.
    expect(Math.abs(egg.x - myren.spawn.x)).toBeLessThan(2);
  });

  it('is found by coming down on the cranberry: the bounce puts him on the leaf, and he walks along it to the sweet', () => {
    // From the chapter's own start. A held jump at the berry comes down on it, whichever part of it he is over.
    for (const x of [berry.x - 0.2, berry.x, berry.x + 0.3]) {
      const sim = new Sim(myren);
      run(sim, 0.2);
      expect(walkTo(sim, x)).toBe(true);
      expect(found(sim, 'stektagg')).toBe(false);
      jump(sim);
      expect(sim.bounces, `a jump at ${x}`).toBe(1);
      expect(sim.curr.grounded && Math.abs(sim.curr.y - leaf.y) < 0.1, `a jump at ${x}`).toBe(true);
      expect(walkTo(sim, egg.x)).toBe(true);
      expect(found(sim, 'stektagg'), `a jump at ${x}`).toBe(true);
      // And down again, onto the ground he began on.
      walkTo(sim, leaf.x - leaf.width / 2 - 0.8);
      expect(onTheTrail(sim)).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('is not reached by a jump from the ground: under it, beside the berry and under the leaf\'s far end', () => {
    for (const x of [egg.x - 0.3, egg.x, berry.x - 0.5, berry.x + 0.5, leaf.x + leaf.width / 2 - 0.2]) {
      const sim = new Sim({ ...myren, spawn: { x, y: 0.01 } });
      run(sim, 0.2);
      jump(sim);
      expect(sim.bounces, `a jump at ${x}`).toBe(0);
      expect(onTheTrail(sim), `a jump at ${x}`).toBe(true);
      expect(found(sim, 'stektagg'), `a jump at ${x}`).toBe(false);
    }
    // Nor by walking under it.
    const walker = new Sim(myren);
    runPast(walker, 9);
    expect(found(walker, 'stektagg')).toBe(false);
  });

  it('is not taken in passing by the run from the first berry to the second', () => {
    for (const from of [0.6, 1, 1.4]) {
      const sim = new Sim({ ...myren, spawn: { x: from - 1.2, y: 0.01 } });
      run(sim, 0.1);
      runPast(sim, from);
      sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
      for (let i = 0; i < 4 / STEP && !(sim.bounces === 2 && sim.curr.grounded); i++) sim.step({ ...idle, x: 1, hopHeld: true });
      expect(sim.bounces, `a jump from ${from}`).toBe(2);
      expect(found(sim, 'stektagg'), `a jump from ${from}`).toBe(false);
    }
  });
});

describe('sur napp: along the rings between the dead pines', () => {
  const napp = sweet('surnapp');
  const BOARDS = 4.5;
  const [lower, upper, landing] = myren.ledges!.filter((ledge) => ledge.look === 'branch');
  const rings = myren.hooks!;

  it('hangs over the branch where the rings end, in sight from the boardwalk and out of a jump\'s reach from it', () => {
    expect(napp.way).toBe('along the rings between the dead pines');
    expect(Math.abs(napp.x - landing!.x)).toBeLessThan(landing!.width / 2);
    expect(napp.x).toBeGreaterThan(rings[2]!.x);
    // Within reach of him standing on the branch, and well above the reach of a held jump from the boards.
    expect(napp.y - (landing!.y + ELOF_HEIGHT / 2)).toBeLessThan(CANDY_MAGNET - 0.2);
    expect(heightAt(myren, napp.x)).toBe(BOARDS);
    expect(napp.y).toBeGreaterThan(jumpReach(napp.x) + 0.2);
    // Less than three EL over the boards: in the picture of anyone walking there.
    expect(napp.y - BOARDS).toBeLessThan(3);
  });

  it('is found by going up the pine, swinging along the three rings, and walking along the branch they end at', () => {
    for (const release of [0.5, 0.7, 0.8, 0.9]) {
      const sim = new Sim({ ...myren, spawn: { x: 108, y: BOARDS + 0.01 } });
      run(sim, 0.2);
      walkTo(sim, lower!.x);
      jump(sim);
      jump(sim);
      expect(sim.curr.y, `let go at ${release}`).toBeCloseTo(upper!.y, 1);
      expect(swingAlong(sim, 1, 3, release), `let go at ${release}`).toEqual(rings.map((ring) => ring.x));
      expect(sim.curr.y, `let go at ${release}`).toBeCloseTo(landing!.y, 1);
      runPast(sim, landing!.x + landing!.width / 2 + 0.4);
      run(sim, 0.6);
      expect(found(sim, 'surnapp'), `let go at ${release}`).toBe(true);
      expect(onTheTrail(sim), `let go at ${release}`).toBe(true);
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
    }
  });

  it('is not reached from the boards: a jump under it falls short, and so does one swing', () => {
    for (const x of [napp.x - 0.4, napp.x, napp.x + 0.4]) {
      const sim = new Sim({ ...myren, spawn: { x, y: BOARDS + 0.01 } });
      run(sim, 0.2);
      jump(sim);
      expect(onTheTrail(sim), `a jump at ${x}`).toBe(true);
      expect(found(sim, 'surnapp'), `a jump at ${x}`).toBe(false);
    }
    // Along the boards with no jump.
    const walker = new Sim({ ...myren, spawn: { x: 104.6, y: BOARDS + 0.01 } });
    runPast(walker, 127.5);
    expect(found(walker, 'surnapp')).toBe(false);
    // Up the pine and one swing only: he comes down on the boards, far short of it.
    const sim = new Sim({ ...myren, spawn: { x: 108, y: BOARDS + 0.01 } });
    run(sim, 0.2);
    walkTo(sim, lower!.x);
    jump(sim);
    jump(sim);
    swingAlong(sim, 1, 1, 0.8);
    expect(onTheTrail(sim)).toBe(true);
    expect(found(sim, 'surnapp')).toBe(false);
  });
});
