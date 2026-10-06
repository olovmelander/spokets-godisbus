import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Game } from '../../src/app/game';
import { arrangementFor } from '../../src/audio/music';
import { BONUS, bonusAfter, courseFor, nextAfter, STORY } from '../../src/content/chapters';
import { byn } from '../../src/content/chapters/byn';
import { sv } from '../../src/content/sv';
import { chapterFor, codeFor } from '../../src/save/codes';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, FALL_LIMIT, JUMP_APEX, RUNNING_JUMP_REACH } from '../../src/sim/constants';
import { decide, heightAt, playThrough } from './robot';

describe('Byn, the extra chapter, in greybox rules', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the pavement into the shop at ${fps} Hz`, () => {
      const result = playThrough(fps, byn, {}, 240);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.bubbles).toBe(0);
      expect(result.knocks).toBe(0);
      // Every big candy on the way.
      expect(result.checkpoint).toBe(byn.checkpoints!.length - 1);
      // The things it had to do: the leaf, and the matchbox.
      expect(result.flags).toEqual(expect.arrayContaining(['leaf', 'placed:box', 'goal']));
      // What was said, in order.
      expect(result.said).toEqual(['again', 'lake', 'shop', 'shopInside', 'shopBag']);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, byn, {}, 240);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${byn.candy[i]!.x},${byn.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(4);
  });

  it('keeps all earlier candy and checkpoint indices intact when the shop is appended', () => {
    expect(createHash('sha256').update(JSON.stringify(byn.candy.slice(0, 62))).digest('hex'))
      .toBe('029d3d2e09c86f02ef2227df0583e19f97a4e8f374a868ac4d205bf57d30150e');
    expect(byn.checkpoints!.slice(0, 8)).toEqual([
      { x: 8, y: 2 }, { x: 15.6, y: 0 }, { x: 37.6, y: 0 }, { x: 66, y: 0 },
      { x: 83, y: 0 }, { x: 93.2, y: 0 }, { x: 105, y: 0 }, { x: 115, y: 3.3 },
    ]);
    expect(byn.shop?.door).toBe(122);
    expect(byn.goalX).toBeGreaterThan(byn.shop!.door + 20);
  });

  it('resumes an older save at the shop step and reaches the new ending without repeating the street', () => {
    const game = new Game(byn, {}, { checkpoint: 7, collected: [0, 61], placed: ['box'], flags: ['leaf', 'placed:box'] });
    expect(game.sim.curr.x).toBe(115);
    expect(game.sim.collected[0]).toBe(true);
    expect(game.sim.collected[61]).toBe(true);
    expect(game.sim.collected.slice(62).every((got) => !got)).toBe(true);
    for (let frame = 0; frame < 60 * 30 && !game.sim.flags.has('goal'); frame++) {
      game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.checkpoint).toBe(9);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
    expect(game.sim.said).toEqual(['shopInside', 'shopBag']);
  });

  it('on Lugnt it is played by running and Använd, with Hoppa only on the lace', () => {
    const game = new Game(byn, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasSwinging = false;
    for (let frame = 0; frame < 60 * 240 && !game.sim.flags.has('goal'); frame++) {
      const swinging = game.sim.curr.hook !== null;
      const { x, y, offered } = decide(game, byn);
      game.frame(1 / 60, { x: swinging ? 0 : x, y, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasSwinging = swinging;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
  });

  it('has a candy trail that is never lost: the next candy is at most 3 EL on', () => {
    const candy = byn.candy;
    const leaf = byn.rides![0]!;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      const x = candy[i]!.x;
      // On the leaf he sails, and the picture is wide: there the candy lies further apart.
      const wide = x > leaf.from.x && x < leaf.to.x + 2;
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(wide ? 6 : 3.2);
      expect(x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
    }
    expect(candy.length).toBeGreaterThanOrEqual(50);
  });

  it('has no candy in the ground, and none out of reach', () => {
    const leaf = byn.rides![0]!;
    for (const [i, c] of byn.candy.entries()) {
      if ((byn.hooks ?? []).some((h) => Math.hypot(h.x - c.x, h.y - c.y) < h.length + 0.7)) continue;
      if ((byn.movers ?? []).some((m) => Math.abs(m.stops[m.stops.length - 1]!.x - c.x) < m.width / 2 + 0.9)) continue;
      // On the puddle, the candy is where the leaf goes.
      if (c.x > leaf.from.x && c.x < leaf.to.x) continue;
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(byn, c.x + dx));
      expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(heightAt(byn, c.x) + 0.15);
      expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
    }
  });

  it('has a big candy at least every 40 EL, and they come in order', () => {
    const at = [byn.spawn.x, ...byn.checkpoints!.map((c) => c.x), byn.goalX];
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
    }
    for (const c of byn.checkpoints!) expect(heightAt(byn, c.x), `the big candy at ${c.x}`).toBeCloseTo(c.y, 5);
  });

  it('has no hop over the grate wider than a running jump carries, and the kerb is a drop he can land', () => {
    const edges = byn.jumps!.filter((jump) => jump.needs === undefined);
    expect(edges).toHaveLength(5);
    for (const jump of edges) expect(jump.land.x - jump.at.x, `the hop at ${jump.at.x}`).toBeLessThanOrEqual(RUNNING_JUMP_REACH + 0.4);
    expect(heightAt(byn, 11) - heightAt(byn, 13)).toBeLessThan(FALL_LIMIT);
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of byn.beats ?? []) {
      expect(lines[beat.line], beat.line).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
      // His friend has a name by now, but nobody says it here: the epilogue is where it is given.
      expect(lines[beat.line]).not.toMatch(/Klonk|[Ss]pöke/);
    }
    expect(sv.verbs.board).toBeDefined();
  });

  it('keeps his friend ahead of him, on firm ground, all the way through the shop', () => {
    const perches = byn.ghost!;
    for (const [i, perch] of perches.entries()) {
      expect(heightAt(byn, perch.at.x), `the place at ${perch.at.x}`).toBeCloseTo(perch.at.y, 5);
      if (i > 0) expect(perch.at.x).toBeGreaterThan(perches[i - 1]!.at.x);
    }
    expect(perches[perches.length - 1]!.at.x).toBeLessThan(byn.goalX);
    expect(perches[perches.length - 1]!.at.x).toBeGreaterThan(byn.goalX - 4);
  });

  it('comes after the story, not in it: the last card leads on to it, and a code opens it', () => {
    expect(STORY).not.toContain(byn);
    expect(BONUS).toEqual([byn]);
    expect(nextAfter('epilog')).toBeNull();
    expect(bonusAfter('epilog')).toBe(byn);
    expect(bonusAfter('berget')).toBeNull();
    expect(nextAfter('byn')).toBeNull();
    // A saved game that is in it goes on in it.
    expect(courseFor(new URLSearchParams('dev'), 'byn')).toBe(byn);
    expect(chapterFor(codeFor('byn')!)).toBe('byn');
    // It has its own way of playing the tune, and its own card.
    expect(arrangementFor(byn.id, byn.place)).not.toBeNull();
    expect(sv.end.kickers.byn).toBeDefined();
    expect(sv.end.closing.byn).toBeDefined();
  });

  it('names no real shop and no number: its words are plain', () => {
    for (const text of [sv.lines.again, sv.lines.lake, sv.lines.shop, sv.end.kickers.byn!, sv.end.closing.byn!]) expect(text).not.toMatch(/\d/);
  });
});
