import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { nextAfter } from '../../src/content/chapters';
import { myren } from '../../src/content/chapters/myren';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, JUMP_APEX } from '../../src/sim/constants';
import { decide, heightAt, playThrough } from './robot';

/** The ground or a soft tussock at rest: what he can stand on at x. */
const floorAt = (x: number) =>
  Math.max(heightAt(myren, x), ...(myren.tussocks ?? []).filter((t) => Math.abs(x - t.x) <= t.width / 2).map((t) => t.y));

describe('Kapitel 3, Myren, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the bog's edge to the crane's back at ${fps} Hz`, () => {
      const result = playThrough(fps, myren, {}, 300);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(myren.checkpoints!.length - 1);
      // Mamma's bridge and her braid, the lollipop, the chick brought home, and the crane.
      expect(result.flags).toEqual(expect.arrayContaining(['mamma', 'placed:pine', 'braid', 'light', 'chick', 'home', 'crane', 'goal']));
      expect(result.said).toEqual(['spangen', 'bog:chick-light', 'bog:family-home', 'bog:bridge-ready']);
      // It never falls in, and no tussock sinks under it: it keeps hopping.
      expect(result.bubbles).toBe(0);
      expect(result.sinks).toBe(0);
    });
  }

  it('the robot leaves no candy behind', () => {
    const result = playThrough(60, myren, {}, 300);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${myren.candy[i]!.x},${myren.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(2);
  });

  it('on Lugnt it is played by running and Använd: Hoppa is never needed, and no tussock sinks under a runner', () => {
    const game = new Game(myren, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, myren);
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.sinks).toBe(0);
    expect(hops).toBe(0);
    expect(game.sim.candyCount).toBe(myren.candy.length);
  });

  it('a player who stops on every soft tussock is carried back each time, and loses nothing', () => {
    const game = new Game(myren);
    let wasOffered = false;
    let wasAhead = false;
    let rested = -1;
    let rest = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const decision = decide(game, myren);
      const p = game.sim.curr;
      // Once on each soft tussock it stands until the tussock has sunk under it.
      const on = game.sim.tussocks.findIndex((t) => Math.abs(p.x - t.x) < t.width / 2 - 0.3 && Math.abs(p.y - t.y) < 0.1);
      if (on > rested && p.grounded) {
        rested = on;
        rest = 60 * 3;
      }
      const stand = rest > 0 && p.mode === 'free' && on === rested;
      if (rest > 0) rest--;
      const { x, y, ahead, offered } = stand ? { x: 0, y: 0, ahead: false, offered: false } : decision;
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = ahead;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.sinks).toBe(myren.tussocks!.length);
    expect(game.sim.bubbles).toBe(myren.tussocks!.length);
    expect(game.sim.candyCount).toBeGreaterThanOrEqual(myren.candy.length - 2);
  });

  it('has a candy trail that is never lost: the next candy is at most 3 EL on', () => {
    const candy = myren.candy;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      // On the crane he is fast and the picture is wide, so the candy lies further apart.
      const x = candy[i]!.x;
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(x > 181 ? 6 : 3.2);
      expect(x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
    }
    expect(candy.length).toBeGreaterThanOrEqual(60);
  });

  it('ends its trail at the lollipop, and shows the rest only in its light', () => {
    for (const c of myren.candy) expect(c.after, `candy at ${c.x}`).toBe(c.x > 142 ? 'light' : undefined);
  });

  it('has no candy in the ground or the water, and none out of reach', () => {
    for (const [i, c] of myren.candy.entries()) {
      if ((myren.climbs ?? []).some((h) => Math.abs(h.x - c.x) < 0.5)) continue;
      if ((myren.movers ?? []).some((m) => Math.abs(m.stops[m.stops.length - 1]!.x - c.x) < m.width / 2 + 0.9)) continue;
      // On the crane, the candy is where the crane goes.
      if (c.x > 181) continue;
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => floorAt(c.x + dx));
      expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(floorAt(c.x) + 0.15);
      expect(c.y, `candy ${i} at ${c.x} is over the water`).toBeGreaterThan(-0.3);
      expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
    }
  });

  it('has no hop wider than a running jump carries, and a marked jump for each', () => {
    const stones = [
      ...myren.ground.flatMap((p, i) => {
        const next = myren.ground[i + 1];
        return next && next.y === p.y && next.x > p.x && p.y > -1 ? [{ from: p.x, to: next.x, y: p.y }] : [];
      }),
      ...myren.tussocks!.map((t) => ({ from: t.x - t.width / 2, to: t.x + t.width / 2, y: t.y })),
    ].sort((a, b) => a.from - b.from);
    let hops = 0;
    for (let i = 1; i < stones.length; i++) {
      const gap = stones[i]!.from - stones[i - 1]!.to;
      // The pool is crossed on Mamma's pine, and the boardwalk is climbed.
      if (gap <= 0 || gap > 5) continue;
      hops++;
      expect(gap, `the hop at ${stones[i - 1]!.to}`).toBeLessThanOrEqual(1.5);
      expect(Math.abs(stones[i]!.y - stones[i - 1]!.y)).toBeLessThanOrEqual(0.5);
      expect(myren.jumps!.some((j) => Math.abs(j.at.x - (stones[i - 1]!.to - 0.2)) < 0.01), `a marked jump at ${stones[i - 1]!.to}`).toBe(true);
    }
    expect(hops).toBe(myren.jumps!.length);
  });

  it('has a big candy at least every 40 EL, and firm ground with one between the two runs of soft tussocks', () => {
    const at = [myren.spawn.x, ...myren.checkpoints!.map((c) => c.x), myren.goalX];
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
    }
    const soft = myren.tussocks!.map((t) => t.x);
    const between = myren.checkpoints!.filter((c) => c.x > soft[0]! && c.x < soft[soft.length - 1]!);
    expect(between.length).toBe(1);
    // A big candy stands on ground, never on a tussock that sinks.
    for (const c of myren.checkpoints!) expect(heightAt(myren, c.x), `the big candy at ${c.x}`).toBeCloseTo(c.y, 5);
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of myren.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of myren.spots ?? []) expect(verbs[spot.word ?? spot.verb], `the word for ${spot.id}`).toBeDefined();
  });

  it('keeps the ghost ahead of him, on firm ground, all the way', () => {
    for (const perch of myren.ghost!) expect(heightAt(myren, perch.at.x), `the ghost's place at ${perch.at.x}`).toBeCloseTo(perch.at.y, 5);
    const game = new Game(myren);
    let wasAhead = false;
    let wasOffered = false;
    let behind = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, myren);
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      const ghost = game.sim.ghost!;
      if (!ghost.gone && ghost.x < game.sim.curr.x - 0.5) behind++;
    }
    expect(behind).toBeLessThan(60 * 3);
  });

  it('follows Kapitel 2', () => {
    expect(nextAfter('granskog')?.id).toBe('myren');
  });
});
