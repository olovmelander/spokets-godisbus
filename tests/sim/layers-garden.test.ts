import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LACE_REACH, LEDGE_GIVE, STEP, SWING_MAX } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { heightAt } from '../robot/robot';
import { idle, jump, leap, run, runPast, sideTaken, swingAlong, walkTo } from './drive';

// The side ways of Gården (docs/level-design.md): the window sills over the deck, the planks beside the hose,
// and the clothes line over the dew rain. Each is entered from the trail's ground, gives up all its side candy,
// and sets him down on the trail further on, with no glitter bubble. All on Äventyr.

const ledges = garden.ledges!;
const sills = ledges.filter((ledge) => ledge.look === 'plank' && ledge.x < 40);
const planks = ledges.filter((ledge) => ledge.look === 'plank' && ledge.x > 40);
const leaves = ledges.filter((ledge) => ledge.look === 'leaf');
const hose = garden.climbs![0]!;
// The clothes line's rings: the extra hooks beyond the gully.
const line = garden.hooks!.filter((hook) => hook.extra && hook.x > 100);

/** He stands on the trail's ground: on the ground line itself, and not on a ledge over it. */
const onTheTrail = (sim: Sim): boolean => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(garden, sim.curr.x)) < 0.05;
/** He stands on this ledge. */
const standsOn = (sim: Sim, ledge: { x: number; y: number; width: number }): boolean =>
  sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.1 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.2;
const seconds = (sim: Sim, since: number): number => (sim.steps - since) * STEP;
/** Walks on to the right, slowly, as far as an x: off the end of whatever he stands on, and on along what he lands on. */
function stroll(sim: Sim, to: number): void {
  for (let i = 0; i < 30 / STEP && sim.curr.x < to; i++) sim.step({ ...idle, x: 0.5 });
  run(sim, 0.4);
}
/** Waits until he is on his own feet again: a drop may have knocked him over where he came down. */
function settle(sim: Sim): void {
  for (let i = 0; i < 4 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step(idle);
}
/** Up the hose from its foot to a height, by pushing up, and off it to the right with Hoppa held. */
function upTheHoseAndOff(sim: Sim, height: number): void {
  for (let i = 0; i < 2 / STEP && sim.curr.mode !== 'climb'; i++) sim.step({ ...idle, y: 1 });
  expect(sim.curr.mode).toBe('climb');
  for (let i = 0; i < 8 / STEP && sim.curr.y < height; i++) sim.step({ ...idle, y: 1 });
  sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
  for (let i = 0; i < 3 / STEP; i++) {
    sim.step({ ...idle, x: 1, hopHeld: true });
    if ((sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.vy <= 0.01) || sim.curr.mode === 'bubble') break;
  }
  run(sim, 0.1);
}

describe('the window sills over the deck', () => {
  const FROM = 22;
  const TO = 36;
  /** On the step beyond the lifted board, where the trail runs. */
  const start = () => {
    const sim = new Sim({ ...garden, spawn: { x: 20, y: 7.61 } });
    run(sim, 0.3);
    return sim;
  };

  it('are five boards, each wide, each 0.7 or 0.8 from the last, and none more than a soft landing above the deck', () => {
    expect(sills).toHaveLength(5);
    for (const [i, sill] of sills.entries()) {
      expect(sill.width).toBeGreaterThanOrEqual(1.8);
      if (i > 0) {
        expect(Math.abs(sill.y - sills[i - 1]!.y)).toBeGreaterThan(0.65);
        expect(Math.abs(sill.y - sills[i - 1]!.y)).toBeLessThan(0.85);
      }
      // A held jump straight up from it comes down on it, or beside it on the deck under it: a soft landing.
      expect(sill.y + JUMP_APEX - heightAt(garden, sill.x), `the sill at ${sill.x}`).toBeLessThan(FALL_LIMIT - 0.2);
    }
    // The first is one held jump over the step the trail runs on, and the first side candy, a heart, hangs over it.
    expect(sills[0]!.y - heightAt(garden, 22.8)).toBeLessThanOrEqual(0.9);
    expect(garden.side![0]!.x).toBe(sills[0]!.x);
    expect(garden.side![0]!.y).toBeCloseTo(sills[0]!.y + 0.55);
  });

  it('are each one clear held jump up from the deck under them, or clearly out of reach: none is a near miss', () => {
    for (let x = FROM; x <= TO; x += 0.05) {
      const floor = heightAt(garden, x);
      for (const sill of sills.filter((s) => Math.abs(x - s.x) <= s.width / 2 + 0.2)) {
        const up = sill.y - floor;
        // A held jump lifts his feet 1.1, and a board holds him from 0.1 under its top.
        expect(up <= 0.9 || up >= JUMP_APEX + LEDGE_GIVE + 0.1, `the sill at ${sill.x}, ${up.toFixed(2)} over the deck at ${x.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('are climbed from the step, walked along and stepped off before the ladybird, with every heart and lollipop', () => {
    const sim = start();
    expect(onTheTrail(sim)).toBe(true);
    const began = sim.curr.x;
    const since = sim.steps;
    // Up through the first from under its end, then up two more by held jumps to the right.
    walkTo(sim, 22.8);
    jump(sim);
    expect(standsOn(sim, sills[0]!)).toBe(true);
    walkTo(sim, 24.5);
    jump(sim, 1);
    expect(standsOn(sim, sills[1]!)).toBe(true);
    walkTo(sim, 26.4);
    jump(sim, 1);
    expect(standsOn(sim, sills[2]!)).toBe(true);
    // Down again at a walk: each board begins under the end of the one before.
    stroll(sim, 30.6);
    expect(standsOn(sim, sills[3]!)).toBe(true);
    stroll(sim, 33.2);
    expect(standsOn(sim, sills[4]!)).toBe(true);
    stroll(sim, 36.4);
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(began);
    expect(sim.curr.x).toBeLessThan(garden.spots!.find((spot) => spot.id === 'ladybird')!.at.x);
    expect(sideTaken(sim, FROM, TO)).toEqual({ taken: 6, of: 6 });
    expect(sim.bubbles).toBe(0);
    // Well under half a minute for a robot that walks.
    expect(seconds(sim, since)).toBeLessThan(25);
  });

  it('flow at a run too: three running jumps up, and on along the boards, in about the time the deck under them takes', () => {
    const sim = start();
    const since = sim.steps;
    leap(sim, 1, 21.6);
    leap(sim, 1, 24.3);
    leap(sim, 1, 26.2);
    expect(standsOn(sim, sills[2]!)).toBe(true);
    runPast(sim, 36.4);
    run(sim, 0.3);
    expect(onTheTrail(sim)).toBe(true);
    expect(sideTaken(sim, FROM, TO)).toEqual({ taken: 6, of: 6 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(8);
  });

  it('are reached by a running jump from anywhere on the last two EL of the step too', () => {
    for (const from of [20.9, 21.6, 22.3, 22.8]) {
      const sim = start();
      runPast(sim, 20.4);
      leap(sim, 1, from);
      expect(standsOn(sim, sills[0]!), `a jump from ${from}`).toBe(true);
    }
  });

  it('are run along and jumped off without a glitter bubble: every fall lands on a board or on the deck', () => {
    // At a run from the highest, and by a running held jump from each board's ends.
    const ran = new Sim({ ...garden, spawn: { x: sills[2]!.x - 0.8, y: sills[2]!.y + 0.06 } });
    run(ran, 0.3);
    runPast(ran, 37);
    run(ran, 0.5);
    expect(onTheTrail(ran)).toBe(true);
    expect(ran.bubbles).toBe(0);
    for (const sill of sills) {
      for (const dir of [1, -1] as const) {
        const sim = new Sim({ ...garden, spawn: { x: sill.x, y: sill.y + 0.06 } });
        run(sim, 0.3);
        leap(sim, dir, sill.x + dir * (sill.width / 2 - 0.1));
        run(sim, 1.2);
        expect(sim.bubbles, `a jump ${dir > 0 ? 'right' : 'left'} off the sill at ${sill.x}`).toBe(0);
        expect(sim.curr.grounded).toBe(true);
      }
    }
  });

  it('are not found by following the trail under them without jumping, or by the jumps the trail asks for', () => {
    const sim = start();
    runPast(sim, 37);
    expect(sim.curr.x).toBeGreaterThan(37);
    expect(sideTaken(sim, FROM, TO).taken).toBe(0);
    // The highest the trail's own jumps under them take his feet is under every board.
    const highest = Math.max(...garden.jumps!.filter((j) => j.land.x > FROM && j.at.x < TO).map((j) => j.at.y)) + JUMP_APEX;
    for (const sill of sills) expect(sill.y - LEDGE_GIVE).toBeGreaterThan(highest);
  });
});

describe('the planks beside the hose', () => {
  const FROM = 46.9;
  const TO = 51;
  /**
   * At the top of the hose, with the ladybird turned: Använd slides him down it, as the trail goes. With the
   * stick held to the right he walks on from its foot; with it at rest he stands there.
   */
  const slidDown = (stick = 0) => {
    const sim = new Sim({ ...garden, spawn: { x: 45.6, y: 6.01 } }, {}, { flags: ['ladybird'] });
    run(sim, 0.3);
    expect(sim.curr.verb).toBe('slide');
    sim.step({ ...idle, act: true });
    for (let i = 0; i < 3 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step({ ...idle, x: stick });
    if (stick === 0) run(sim, 0.5);
    return sim;
  };

  it('are two boards under the deck, there once the hose is, clear of the lost things, and out of reach from the ground', () => {
    expect(planks).toHaveLength(2);
    const roof = garden.roofs![0]!;
    for (const plank of planks) {
      expect(plank.needs).toBe(hose.needs);
      expect(plank.y).toBeLessThan(roof.y - 2);
      // No held jump from the ground lands on one.
      expect(plank.y - LEDGE_GIVE).toBeGreaterThan(JUMP_APEX + 0.2);
      // A held jump off one is still a soft landing.
      expect(plank.y + 0.05 + JUMP_APEX).toBeLessThan(FALL_LIMIT);
      // A lost thing under it has room over it: it stands 0.4 tall on its stone.
      for (const spot of garden.spots!.filter((s) => s.id.startsWith('lost:') && Math.abs(s.at.x - plank.x) < plank.width / 2 + 0.1)) {
        expect(plank.y - spot.at.y, spot.id).toBeGreaterThan(0.65);
      }
    }
    // Before the ladybird is turned there is no hose, and no plank or heart either.
    const before = new Sim(garden);
    expect(before.ledges.filter((ledge) => ledge.x > 40 && ledge.x < 60).map((ledge) => ledge.there)).toEqual([false, false]);
    expect(garden.side!.filter((candy) => candy.x > FROM && candy.x < TO).map((candy) => candy.after)).toEqual([hose.needs]);
    // The first ring of the trail hangs further on: its swing does not come this far left.
    const ring = garden.hooks![0]!;
    expect(ring.x - ring.length).toBeGreaterThan(planks[1]!.x + planks[1]!.width / 2);
  });

  it('are not a way down from the deck: a run or a jump off its edge is the glitter bubble, as it always was', () => {
    for (const flags of [[], ['ladybird']]) {
      for (const speed of [1, 0.75]) {
        // Hoppa this long after his middle passes the edge (before it, where negative), tapped or held; or not at all.
        for (const press of [null, -0.1, 0, 0.1, 0.19]) {
          for (const held of press === null ? [false] : [false, true]) {
            const sim = new Sim({ ...garden, spawn: { x: 42.5, y: 6.01 } }, {}, { flags });
            run(sim, 0.3);
            let pressed = false;
            let landed = false;
            for (let i = 0; i < 2.5 / STEP && sim.bubbles === 0; i++) {
              const hop: boolean = !pressed && press !== null && sim.curr.x >= 46 + press * 3.5 * speed;
              if (hop) pressed = true;
              sim.step({ ...idle, x: speed, hop, hopHeld: held });
              if (sim.curr.grounded && sim.curr.y < 5.5) landed = true;
            }
            const how = `${flags.length ? 'after' : 'before'} the ladybird, at ${speed}, ${press === null ? 'running off' : `${held ? 'held' : 'tapped'} ${press} s past the edge`}`;
            expect(sim.bubbles, how).toBe(1);
            expect(landed, how).toBe(false);
            expect(sim.flags.has('found:skumsvamp'), how).toBe(false);
            // Running off without a jump, as the trail's own miss is made, he does not come near the heart either.
            if (press === null) expect(sideTaken(sim, FROM, TO).taken, how).toBe(0);
          }
        }
      }
    }
  });

  it('are reached by climbing back up the hose and jumping off it, and let out forward under the deck', () => {
    const sim = slidDown();
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.curr.x).toBeCloseTo(hose.x, 1);
    expect(sideTaken(sim, FROM, TO).taken).toBe(0);
    const began = sim.curr.x;
    const since = sim.steps;
    // From above the first plank: it lies a long jump from the hose.
    upTheHoseAndOff(sim, 3.4);
    expect(standsOn(sim, planks[0]!)).toBe(true);
    walkTo(sim, 48.9);
    jump(sim, 1);
    expect(standsOn(sim, planks[1]!)).toBe(true);
    // Off its far end, at a walk.
    stroll(sim, 51.9);
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.curr.x).toBeGreaterThan(began);
    expect(sideTaken(sim, FROM, TO)).toEqual({ taken: 1, of: 1 });
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(15);
  });

  it('catch a jump off the hose from anywhere above them: there is no one right moment', () => {
    for (const height of [2.9, 3.4, 3.9, 4.4, 4.9, 5.4]) {
      const sim = slidDown();
      upTheHoseAndOff(sim, height);
      expect(standsOn(sim, planks[0]!), `off the hose at ${height}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
    // From lower down the jump falls short of them, onto the ground: a soft landing, and the hose is right there.
    for (const height of [1.5, 2, 2.5]) {
      const sim = slidDown();
      upTheHoseAndOff(sim, height);
      expect(onTheTrail(sim), `off the hose at ${height}`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('a held jump off the far end is a soft landing too', () => {
    const sim = new Sim({ ...garden, spawn: { x: planks[1]!.x, y: planks[1]!.y + 0.06 } }, {}, { flags: ['ladybird'] });
    run(sim, 0.3);
    leap(sim, 1, planks[1]!.x + 0.5);
    run(sim, 0.5);
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('are not found by following the trail: down the hose and on under them, at a run or with a held jump at every step', () => {
    const sim = slidDown(1);
    runPast(sim, 52);
    expect(sim.curr.x).toBeGreaterThan(52);
    expect(sideTaken(sim, FROM, TO).taken).toBe(0);
    const hopping = slidDown(1);
    for (let i = 0; i < 30 && hopping.curr.x < 52; i++) leap(hopping, 1);
    expect(hopping.curr.x).toBeGreaterThan(52);
    expect(sideTaken(hopping, FROM, TO).taken).toBe(0);
    expect(hopping.curr.y).toBeCloseTo(0, 1);
  });
});

describe('the clothes line over the dew rain', () => {
  const FROM = 104;
  const TO = 127;
  const first = leaves[0]!;
  const second = leaves[1]!;
  const top = leaves[2]!;
  const landing = leaves[3]!;
  const step = leaves[4]!;
  /** On top of the boulder, where the trail runs, having waited a while: the drops keep their own time. */
  const start = (wait = 0) => {
    const sim = new Sim({ ...garden, spawn: { x: 102, y: 1.31 } });
    run(sim, 0.3 + wait);
    return sim;
  };
  /** Up the three leaves from the boulder, over the candy on each. */
  const upTheLeaves = (sim: Sim) => {
    walkTo(sim, 104.6);
    jump(sim);
    expect(standsOn(sim, first)).toBe(true);
    walkTo(sim, 105.5);
    jump(sim, 1);
    expect(standsOn(sim, second)).toBe(true);
    walkTo(sim, 107.5);
    jump(sim, 1);
    expect(standsOn(sim, top)).toBe(true);
    walkTo(sim, top.x);
  };

  it('is three rings at equal spacing and equal height, out of reach from the lawn and from the boulder', () => {
    expect(line).toHaveLength(3);
    expect(leaves).toHaveLength(5);
    for (const ring of line) {
      expect(ring.y).toBe(line[0]!.y);
      expect(ring.length).toBe(line[0]!.length);
      expect(ring.land).toBeUndefined();
      // Standing on the lawn under it, his middle is further from it than the lace reaches.
      expect(ring.y - (heightAt(garden, ring.x) + ELOF_HEIGHT / 2)).toBeGreaterThan(LACE_REACH);
      // The lowest point of its swing is above where the drops reach, and from its highest he can land on the lawn.
      expect(ring.y - ring.length - ELOF_HEIGHT / 2).toBeGreaterThanOrEqual(1.5);
      expect(ring.y - ring.length * Math.cos(SWING_MAX) - ELOF_HEIGHT / 2 - heightAt(garden, ring.x)).toBeLessThan(FALL_LIMIT - 0.5);
    }
    expect(line[1]!.x - line[0]!.x).toBeCloseTo(line[2]!.x - line[1]!.x);
    expect(Math.hypot(line[0]!.x - 105, line[0]!.y - (1.3 + ELOF_HEIGHT / 2))).toBeGreaterThan(LACE_REACH);
    // The leaves go up from the boulder by steps he can make, and the first has its heart over it.
    expect(first.y - heightAt(garden, 104.6)).toBeLessThanOrEqual(0.9);
    expect(second.y - first.y).toBeLessThanOrEqual(0.9);
    expect(top.y - second.y).toBeLessThanOrEqual(0.9);
    expect(garden.side!.some((candy) => candy.x === first.x && Math.abs(candy.y - first.y - 0.55) < 0.01)).toBe(true);
    // Every leaf lies above where a drop reaches him, and no higher than a held jump off it can come down from.
    for (const leaf of leaves) {
      expect(leaf.y).toBeGreaterThanOrEqual(1.5);
      expect(leaf.y + 0.05 + JUMP_APEX - heightAt(garden, leaf.x + leaf.width)).toBeLessThan(FALL_LIMIT);
    }
    // The two at the far end cannot be jumped onto from the lawn: the way to them is along the rings.
    for (const leaf of [landing, step]) expect(leaf.y - LEDGE_GIVE).toBeGreaterThan(JUMP_APEX + 0.2);
  });

  it('is swung along from the boulder to the far leaf, dry, with every heart and lollipop, and steps down to the lawn', () => {
    // Not one exact moment: anywhere on the upper part of each swing will do.
    for (const release of [0.7, 0.8, 0.9]) {
      // Nor one moment of the dew rain's rhythm.
      for (const wait of [0, 0.7, 1.4]) {
        const sim = start(wait);
        expect(onTheTrail(sim)).toBe(true);
        const began = sim.curr.x;
        const since = sim.steps;
        upTheLeaves(sim);
        const taken = swingAlong(sim, 1, 3, release);
        expect(taken, `let go at ${release}`).toEqual(line.map((ring) => ring.x));
        expect(standsOn(sim, landing), `let go at ${release}: he came down at ${sim.curr.x.toFixed(2)},${sim.curr.y.toFixed(2)}`).toBe(true);
        // Down by the smaller leaf, at a walk, and onto the lawn before the big candy.
        stroll(sim, 125);
        expect(standsOn(sim, step)).toBe(true);
        stroll(sim, 127.2);
        expect(onTheTrail(sim)).toBe(true);
        expect(sim.curr.x).toBeGreaterThan(began);
        expect(sim.curr.x).toBeLessThan(130);
        expect(sideTaken(sim, FROM, TO), `let go at ${release}`).toEqual({ taken: 14, of: 14 });
        expect(sim.bubbles).toBe(0);
        // The dry way: no drop reaches him on it.
        expect(sim.knocks).toBe(0);
        // Under twenty seconds for a robot that walks along every leaf.
        expect(seconds(sim, since)).toBeLessThan(20);
      }
    }
  });

  it('forgives a throw that comes late: the next ring is still in reach a quarter of a second after letting go', () => {
    for (const late of [0.1, 0.2, 0.3]) {
      const sim = new Sim({ ...garden, spawn: { x: top.x, y: top.y + 0.06 } });
      run(sim, 0.3);
      const taken: number[] = [];
      let was = sim.curr.mode;
      let inAir = 0;
      for (let i = 0; i < 30 / STEP; i++) {
        const p = sim.curr;
        const input = { ...idle, x: 1 };
        inAir = p.mode === 'free' && !p.grounded ? inAir + STEP : 0;
        if (p.mode === 'free' && p.verb === 'lace' && (p.grounded || inAir >= late)) input.act = true;
        if (p.mode === 'swing' && p.hook) {
          if (was !== 'swing') taken.push(p.hook.x);
          if (p.vx > 0 && Math.atan2(p.x - p.hook.x, p.hook.y - (p.y + ELOF_HEIGHT / 2)) > 0.8) input.hop = true;
        }
        was = p.mode;
        sim.step(input);
        if ((taken.length > 0 && sim.curr.mode === 'free' && sim.curr.grounded) || sim.curr.mode === 'bubble') break;
      }
      expect(taken, `a throw ${late} s late`).toEqual(line.map((ring) => ring.x));
      expect(standsOn(sim, landing), `a throw ${late} s late`).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('a fall from it lands on the lawn below, unhurt: letting go of a ring without throwing again', () => {
    for (const rings of [1, 2]) {
      for (const release of [0.3, 0.8, 1.1]) {
        const sim = new Sim({ ...garden, spawn: { x: top.x, y: top.y + 0.06 } });
        run(sim, 0.3);
        swingAlong(sim, 1, rings, release);
        settle(sim);
        expect(sim.bubbles, `${rings} ring(s), let go at ${release}`).toBe(0);
        expect(onTheTrail(sim), `${rings} ring(s), let go at ${release}`).toBe(true);
        expect(sim.curr.x).toBeGreaterThan(top.x);
      }
    }
    // Off the far leaf by a running held jump: past the step, and onto the lawn.
    const sim = new Sim({ ...garden, spawn: { x: landing.x, y: landing.y + 0.06 } });
    run(sim, 0.3);
    leap(sim, 1, landing.x + 0.9);
    settle(sim);
    expect(onTheTrail(sim)).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('is not found by following the trail: over the boulder and through the dew rain without jumping', () => {
    const sim = new Sim({ ...garden, spawn: { x: 99, y: 0.01 } });
    run(sim, 0.3);
    runPast(sim, 129, 40);
    expect(sim.curr.x).toBeGreaterThan(129);
    expect(sideTaken(sim, FROM, TO).taken).toBe(0);
    // Nor is a ring ever offered down there: Använd keeps its meaning on the trail.
    const under = new Sim({ ...garden, spawn: { x: 100, y: 0.01 } });
    let offered = 0;
    for (let i = 0; i < 40 / STEP && under.curr.x < 128; i++) {
      under.step({ ...idle, x: 1 });
      if (under.curr.verb === 'lace') offered++;
    }
    expect(under.curr.x).toBeGreaterThan(127);
    expect(offered).toBe(0);
  });

  it('and the far leaves are not jumped onto from the lawn: the way to them is along the rings', () => {
    for (const dir of [1, -1] as const) {
      const sim = new Sim({ ...garden, spawn: { x: dir > 0 ? 120.5 : 128.5, y: 0.01 } });
      run(sim, 0.3);
      let highest = 0;
      for (let i = 0; i < 40 && (dir > 0 ? sim.curr.x < 128.5 : sim.curr.x > 120.5); i++) {
        leap(sim, dir);
        // A drop may knock him over on the way: he gets up and goes on.
        settle(sim);
        highest = Math.max(highest, sim.curr.y);
      }
      expect(highest, `leaping ${dir > 0 ? 'right' : 'left'}`).toBeLessThan(0.1);
    }
  });
});
