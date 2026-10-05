import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { garden } from '../../src/content/chapters/garden';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, JUMP_APEX } from '../../src/sim/constants';
import { decide, heightAt, playThrough } from './robot';

describe('Kapitel 1, Gården, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the deck to the forest's edge at ${fps} Hz`, () => {
      const result = playThrough(fps, garden, {}, 300);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.bubbles).toBe(0);
      expect(result.knocks).toBe(0);
      // Every big candy on the way.
      expect(result.checkpoint).toBe(garden.checkpoints!.length - 1);
      // The things it had to do: the ladybird, the dandelion, both curls, and Moa.
      expect(result.flags).toEqual(expect.arrayContaining(['ladybird', 'dandelion', 'moa', 'plane:board', 'goal']));
      // What was said, in order.
      expect(result.said).toEqual(['stomp', 'moa1', 'garden:ready', 'garden:pocket']);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, garden, {}, 300);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${garden.candy[i]!.x},${garden.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(6);
  });

  it('on Lugnt it is played by running and Använd, with Hoppa only on the lace', () => {
    const game = new Game(garden, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasSwinging = false;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const swinging = game.sim.curr.hook !== null;
      const { x, y, offered } = decide(game, garden);
      game.frame(1 / 60, { x: swinging ? 0 : x, y, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasSwinging = swinging;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
  });

  it('has a candy trail that is never lost: the next candy is at most 3 EL on', () => {
    const candy = garden.candy;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      // Across the things he moves, the trail goes on where the thing will lie. In the flight he is fast
      // and the picture is wide, so the candy lies further apart.
      const x = candy[i]!.x;
      const wide = (x > 135 && x < 142) || (x > 166 && x < 206);
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(wide ? 6 : 3.2);
      expect(candy[i]!.x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
    }
    expect(candy.length).toBeGreaterThanOrEqual(60);
  });

  it('has no candy in the ground, and none out of reach', () => {
    for (const [i, c] of garden.candy.entries()) {
      if ((garden.climbs ?? []).some((h) => Math.abs(h.x - c.x) < 0.5)) continue;
      if ((garden.hooks ?? []).some((h) => Math.hypot(h.x - c.x, h.y - c.y) < h.length + 0.7)) continue;
      if ((garden.movers ?? []).some((m) => Math.abs(m.stops[m.stops.length - 1]!.x - c.x) < m.width / 2 + 0.9)) continue;
      // In the flight, the candy is where the plane goes.
      if (c.x > 166 && c.x < 206) continue;
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(garden, c.x + dx));
      expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(heightAt(garden, c.x) + 0.15);
      expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
    }
  });

  it('has a big candy at least every 40 EL, and they come in order', () => {
    const at = [garden.spawn.x, ...garden.checkpoints!.map((c) => c.x), garden.goalX];
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      // The flight to the forest's edge is one long ride that can't fail.
      if (at[i - 1]! < 160) expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
    }
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of garden.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of garden.spots ?? []) expect(verbs[spot.word ?? spot.verb]).toBeDefined();
  });

  it('keeps the ghost ahead of him all the way', () => {
    const game = new Game(garden);
    let wasAhead = false;
    let wasOffered = false;
    let behind = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, garden);
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      const ghost = game.sim.ghost!;
      if (!ghost.gone && ghost.x < game.sim.curr.x - 0.5) behind++;
    }
    // A swing or a slide may carry him past it for a moment; it is never left behind for long.
    expect(behind).toBeLessThan(60 * 3);
  });
});
