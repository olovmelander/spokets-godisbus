import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { nextAfter } from '../../src/content/chapters';
import { berget } from '../../src/content/chapters/berget';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, JUMP_APEX, RUN_SPEED } from '../../src/sim/constants';
import { decide, heightAt, playThrough } from './robot';

/** Where the flight ends: the candy before it is in the air. */
const LANDED = berget.rides![0]!.to.x;

describe('Kapitel 4, Berget, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the crane's back to the old pine at ${fps} Hz`, () => {
      const result = playThrough(fps, berget, {}, 300);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(berget.checkpoints!.length - 1);
      // The flight, the five cobbles, and the ghost lifted up the cliff.
      expect(result.flags).toEqual(expect.arrayContaining(['flight', 'note:1', 'note:2', 'note:3', 'note:4', 'note:5', 'lift', 'goal']));
      expect(result.said).toEqual(['fetch']);
      expect(result.bubbles).toBe(0);
      // It waits in the lee of each boulder, and no gust catches it.
      expect(result.blown).toBe(0);
    });
  }

  it('the robot leaves no candy behind: on the crane it steers through all of it', () => {
    const result = playThrough(60, berget, {}, 300);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${berget.candy[i]!.x},${berget.candy[i]!.y}`).join(' ')}`).toBe(0);
  });

  it('the flight cannot fail: with no hand on the stick it still lands on the shoulder', () => {
    const game = new Game(berget);
    const still = { hop: false, act: false, helper: false };
    for (let frame = 0; frame < 60 * 16; frame++) game.frame(1 / 60, { x: 0, hopHeld: false }, still);
    expect(game.sim.curr.mode).toBe('free');
    expect(game.sim.curr.x).toBeCloseTo(LANDED, 0);
    expect(game.sim.curr.grounded).toBe(true);
    expect(game.sim.bubbles).toBe(0);
  });

  it('on Lugnt it is played by running and Använd: the gusts only slow him', () => {
    const game = new Game(berget, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, berget);
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(hops).toBe(0);
    expect(game.sim.candyCount).toBe(berget.candy.length);
  });

  it('a player who never waits is taken back by the gusts, and still arrives with everything', () => {
    const game = new Game(berget);
    let wasOffered = false;
    let wasAhead = false;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const p = game.sim.curr;
      // Where the robot would wait for a gust, this one runs.
      const d = decide(game, berget);
      const inTheStretch = p.mode === 'free' && p.x > berget.gusts![0]!.from - 1 && p.x < berget.gusts![0]!.to && p.verb === null;
      const { x, y, ahead, offered } = inTheStretch ? { ...d, x: 1 } : d;
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = ahead;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.blown).toBeGreaterThan(0);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.candyCount).toBe(berget.candy.length);
  });

  it('gives time to dash from each boulder to the next between two gusts, on level ground', () => {
    const gust = berget.gusts![0]!;
    for (let i = 1; i < gust.shelters.length; i++) {
      const dash = (gust.shelters[i]! - gust.shelters[i - 1]!) / RUN_SPEED;
      // Twice the time the dash takes at a run: a child who sets off late still makes it.
      expect((gust.every - gust.length) / dash, `from the boulder at ${gust.shelters[i - 1]}`).toBeGreaterThanOrEqual(1.7);
    }
    for (let x = gust.from; x <= gust.to; x += 0.5) expect(heightAt(berget, x)).toBeCloseTo(gust.y, 5);
  });

  it('has a candy trail that is never lost: the next candy is at most 3 EL on', () => {
    const candy = berget.candy;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      // On the crane he is fast and the picture is wide, so the candy lies further apart.
      const x = candy[i]!.x;
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(x < LANDED + 2.5 ? 7 : 3.2);
      expect(x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
    }
    expect(candy.length).toBeGreaterThanOrEqual(50);
  });

  it('has no candy in the ground, and none out of reach', () => {
    for (const [i, c] of berget.candy.entries()) {
      if ((berget.climbs ?? []).some((h) => Math.abs(h.x - c.x) < 0.5)) continue;
      // In the flight, the candy is where the crane goes.
      if (c.x < LANDED) continue;
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(berget, c.x + dx));
      expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(heightAt(berget, c.x) + 0.15);
      expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
    }
  });

  it('keeps the candy of the flight within what the stick can steer to', () => {
    const ride = berget.rides![0]!;
    for (const c of berget.candy.filter((c) => c.x < LANDED)) {
      // The same curve as the simulation flies: find the moment the crane passes this candy.
      let t = 0;
      for (let i = 0; i <= 1000; i++) {
        const k = (i / 1000) ** 2 * (3 - 2 * (i / 1000));
        if (ride.from.x + (ride.to.x - ride.from.x) * k >= c.x) {
          t = i / 1000;
          break;
        }
      }
      const k = t * t * (3 - 2 * t);
      const middle = ride.from.y + (ride.to.y - ride.from.y) * k + Math.sin(Math.PI * t) * ride.rise + 0.5;
      expect(Math.abs(c.y - middle), `the candy at ${c.x}`).toBeLessThanOrEqual((ride.corridor ?? 1.6) + CANDY_MAGNET - 0.2);
    }
  });

  it('has a big candy at least every 40 EL after the flight', () => {
    const at = [LANDED, ...berget.checkpoints!.map((c) => c.x), berget.goalX];
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
    }
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of berget.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of berget.spots ?? []) expect(verbs[spot.word ?? spot.verb], `the word for ${spot.id}`).toBeDefined();
  });

  it('follows Kapitel 3, and is the last chapter built', () => {
    expect(nextAfter('myren')?.id).toBe('berget');
    expect(nextAfter('berget')).toBeNull();
  });
});
