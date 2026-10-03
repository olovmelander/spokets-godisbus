import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { testbana } from '../../src/content/chapters/testbana';
import { settingsFor, simOptions } from '../../src/save/settings';
import { decide, playThrough as play } from './robot';

const playThrough = (fps: number) => play(fps, testbana);

describe('the robot on the test course', () => {
  for (const fps of [30, 60, 120, 144]) {
    it(`reaches the big candy at ${fps} Hz`, () => {
      const result = playThrough(fps);
      expect(result.goal).toBe(true);
      expect(result.seconds).toBeLessThan(110);
      expect(result.lowest).toBeGreaterThan(-1);
      expect(result.bubbles).toBe(0);
      // It reads the shadows: no drop lands on it.
      expect(result.knocks).toBe(0);
    });
  }

  for (const fps of [30, 60, 120, 144]) {
    it(`follows the candy trail and misses none of it at ${fps} Hz`, () => {
      const result = playThrough(fps);
      expect(result.missed).toEqual([]);
      expect(result.candy).toBe(testbana.candy.length);
    });
  }

  it('with Hjälp med svingen, lands the swing by pressing Hoppa at once', () => {
    const game = new Game(testbana, { swingHelp: true });
    const dt = 1 / 60;
    let wasAhead = false;
    let wasOffered = false;
    let wasSwinging = false;
    for (let frame = 0; frame < 60 * 90 && !game.sim.flags.has('goal'); frame++) {
      const p = game.sim.curr;
      const swinging = p.hook !== null;
      const { x, ahead, offered } = decide(game, testbana);
      // On the lace it does nothing but press Hoppa, the moment it hangs there.
      const hop = swinging ? !wasSwinging : ahead && !wasAhead;
      game.frame(dt, { x: swinging ? 0 : x, hopHeld: true }, { hop, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      wasSwinging = swinging;
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.candyCount).toBeGreaterThanOrEqual(testbana.candy.length - 3);
  });

  it('on Lugnt, gets to the end by running, Använd, and one Hoppa on the lace', () => {
    const game = new Game(testbana, simOptions(settingsFor('lugnt')));
    const dt = 1 / 60;
    let wasOffered = false;
    let wasSwinging = false;
    let reached = -1;
    const order: number[] = [];
    for (let frame = 0; frame < 60 * 90 && !game.sim.flags.has('goal'); frame++) {
      const p = game.sim.curr;
      const swinging = p.hook !== null;
      const { x, offered } = decide(game, testbana);
      game.frame(dt, { x: swinging ? 0 : x, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasSwinging = swinging;
      if (game.sim.checkpoint !== reached) order.push((reached = game.sim.checkpoint));
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    // Every big candy on the way, in order.
    expect(order).toEqual([0, 1, 2, 3, 4, 5, 6]);
    // On Lugnt the drops miss a moving Elof, and this robot never stops under one.
    expect(game.sim.knocks).toBe(0);
  });

  it('with Lugnare tempo, takes a quarter longer and is otherwise the same game', () => {
    const play = (tempo: number) => {
      const game = new Game(testbana);
      game.tempo = tempo;
      let frames = 0;
      while (game.sim.curr.x < 6 && frames < 600) {
        game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
        frames++;
      }
      return frames;
    };
    expect(play(0.8) / play(1)).toBeCloseTo(1.25, 1);
  });

  it('plays the same game twice at the same frame rate', () => {
    expect(playThrough(60)).toEqual(playThrough(60));
  });
});

describe('a player who never jumps the chasm', () => {
  it('is carried back every time, loses nothing, and never sees the bottom', () => {
    const game = new Game(testbana);
    const dt = 1 / 60;
    let wasAhead = false;
    let lowest = Infinity;
    let candy = 0;
    // The robot's own play up to the chasm, and from there only running: 40 seconds of it.
    for (let frame = 0; frame < 60 * 40; frame++) {
      const ahead = game.sim.curr.x < 25 && decide(game, testbana).ahead;
      game.frame(dt, { x: 1, hopHeld: true }, { hop: ahead && !wasAhead, act: false, helper: false });
      wasAhead = ahead;
      lowest = Math.min(lowest, game.sim.curr.y);
      expect(game.sim.candyCount).toBeGreaterThanOrEqual(candy);
      candy = game.sim.candyCount;
    }
    expect(game.sim.bubbles).toBeGreaterThan(5);
    expect(game.sim.flags.has('goal')).toBe(false);
    // The chasm is seven EL deep; the bubble catches him four EL down.
    expect(lowest).toBeGreaterThan(-5);
    expect(game.sim.curr.x).toBeLessThan(27.8);
    expect(candy).toBeGreaterThanOrEqual(17);
  });
});

describe('a player who runs straight through the drops', () => {
  it('is knocked over now and then, and still gets to the end with all the candy on the way', () => {
    const fromHere = testbana.candy.flatMap((c, i) => (c.x > 71 ? [i] : []));
    let knocks = 0;
    // Setting off at twelve different moments: some runs are lucky, some are not, and all arrive.
    for (let wait = 0; wait < 12; wait++) {
      const game = new Game({ ...testbana, spawn: { x: 70.6, y: 3.31 } });
      for (let frame = 0; frame < 60 * 40 && !game.sim.flags.has('goal'); frame++) {
        game.frame(1 / 60, { x: frame < wait * 12 ? 0 : 1, hopHeld: false }, { hop: false, act: false, helper: false });
      }
      expect(game.sim.flags.has('goal'), `setting off after ${wait * 0.2} s`).toBe(true);
      expect(game.sim.bubbles).toBe(0);
      // A knock takes nothing: every candy from the first drop on is in the bag.
      expect(fromHere.every((i) => game.sim.collected[i])).toBe(true);
      knocks += game.sim.knocks;
    }
    expect(knocks).toBeGreaterThan(0);
  });
});

describe('presses and frames', () => {
  it('does not lose a press made in a frame that runs no step', () => {
    const game = new Game(testbana);
    for (let i = 0; i < 60; i++) game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    // Too short a frame for a step: the press has to wait.
    expect(game.frame(1 / 1000, { x: 0, hopHeld: true }, { hop: true, act: false, helper: false })).toBe(0);
    expect(game.sim.curr.vy).toBeLessThan(1);
    game.frame(1 / 60, { x: 0, hopHeld: true }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.vy).toBeGreaterThan(3);
  });

  it('uses a press once, even when a frame runs several steps', () => {
    const game = new Game(testbana);
    for (let i = 0; i < 60; i++) game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.frame(1 / 30, { x: 0, hopHeld: false }, { hop: true, act: false, helper: false })).toBe(4);
    // A tap: he is already slowing down under the heavier gravity, not being launched again each step.
    const afterFour = game.sim.curr.vy;
    game.frame(1 / 30, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.vy).toBeLessThan(afterFour);
  });

  it('forgets a press made before a pause', () => {
    const game = new Game(testbana);
    for (let i = 0; i < 60; i++) game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    game.frame(1 / 1000, { x: 0, hopHeld: false }, { hop: true, act: false, helper: false });
    game.resume();
    game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.vy).toBeLessThan(1);
  });
});
