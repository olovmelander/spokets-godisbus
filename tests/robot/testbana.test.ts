import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { testbana } from '../../src/content/chapters/testbana';
import type { ChapterData } from '../../src/sim/types';

/** The ground's height at x, read from the chapter data. */
function heightAt(chapter: ChapterData, x: number): number {
  const g = chapter.ground;
  for (let i = 0; i < g.length - 1; i++) {
    const a = g[i]!;
    const b = g[i + 1]!;
    if (a.x !== b.x && x >= a.x && x < b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return Infinity;
}

/**
 * The robot plays through the real loop and press queue with a fake clock (plan §6.13).
 * It decides from what it sees, as a player does: it runs right, and holds Hoppa when the ground
 * ahead rises or drops.
 */
function playThrough(fps: number, chapter = testbana) {
  const game = new Game(chapter);
  const dt = 1 / fps;
  let lowest = Infinity;
  let frames = 0;
  let wasAhead = false;
  while (!game.sim.flags.has('goal') && frames < fps * 40) {
    const p = game.sim.curr;
    const rises = heightAt(chapter, p.x + 1.0) > p.y + 0.05;
    const drops = heightAt(chapter, p.x + 0.35) < p.y - 0.3;
    const ahead = p.grounded && (rises || drops);
    // A press is the moment the reason appears; holding is everything after it.
    game.frame(dt, { x: 1, hopHeld: true }, { hop: ahead && !wasAhead, act: false, helper: false });
    wasAhead = ahead;
    lowest = Math.min(lowest, game.sim.curr.y);
    frames++;
  }
  return { goal: game.sim.flags.has('goal'), seconds: frames * dt, steps: game.sim.steps, end: game.sim.curr, lowest };
}

describe('the robot on the test course', () => {
  for (const fps of [30, 60, 120, 144]) {
    it(`reaches the big candy at ${fps} Hz`, () => {
      const result = playThrough(fps);
      expect(result.goal).toBe(true);
      expect(result.seconds).toBeLessThan(25);
      expect(result.lowest).toBeGreaterThan(-1);
    });
  }

  it('plays the same game twice at the same frame rate', () => {
    expect(playThrough(60)).toEqual(playThrough(60));
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
