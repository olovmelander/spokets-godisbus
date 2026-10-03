import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { testbana } from '../../src/content/chapters/testbana';
import type { ChapterData, PlayerState, SimOptions } from '../../src/sim/types';

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
 * It decides from what it sees, as a player does: it runs right, and holds Hoppa when a wall stands
 * ahead or a gap opens. A slope and a kerb are no wall: it runs up them. A step down with no far side is
 * no gap: it runs off that, as the trail shows. When Använd offers the lace, or a hose that leads on, it
 * presses it. On the lace it pushes the way it swings, and lets go on the way up at full height. It throws
 * the lace from the ground only: in the air after letting go the hook is still in reach, and Använd would
 * take it straight back.
 */
function decide(chapter: ChapterData, p: PlayerState): { x: number; ahead: boolean; offered: boolean } {
  if (p.hook) {
    const angle = Math.atan2(p.x - p.hook.x, p.hook.y - (p.y + 0.5));
    const high = p.vx > 0 && angle > 0.68 && angle < 0.85 && Math.hypot(p.vx, p.vy) > 5;
    return { x: p.vx < -0.05 ? -1 : 1, ahead: high, offered: false };
  }
  // Steeper than 45 degrees over the next EL, and more than a step high.
  const wall = heightAt(chapter, p.x + 1.0) - heightAt(chapter, p.x + 0.6) > 0.4;
  const gap = heightAt(chapter, p.x + 0.35) < p.y - 0.3 && heightAt(chapter, p.x + 2.2) > p.y - 0.3;
  const leadsOn = (chapter.climbs ?? []).some((c) => Math.abs(c.top - p.y) < 0.3 && c.x > p.x && c.x - p.x < 1);
  return { x: 1, ahead: p.grounded && (wall || gap), offered: (p.verb === 'lace' && p.grounded) || (p.verb === 'slide' && leadsOn) };
}

function playThrough(fps: number, chapter = testbana, options: SimOptions = {}) {
  const game = new Game(chapter, options);
  const dt = 1 / fps;
  let lowest = Infinity;
  let frames = 0;
  let wasAhead = false;
  let wasOffered = false;
  while (!game.sim.flags.has('goal') && frames < fps * 90) {
    const { x, ahead, offered } = decide(chapter, game.sim.curr);
    // A press is the moment the reason appears; holding is everything after it.
    game.frame(dt, { x, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
    wasAhead = ahead;
    wasOffered = offered;
    lowest = Math.min(lowest, game.sim.curr.y);
    frames++;
  }
  const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
  return {
    goal: game.sim.flags.has('goal'), seconds: frames * dt, steps: game.sim.steps, end: game.sim.curr, lowest,
    candy: game.sim.candyCount, missed, bubbles: game.sim.bubbles,
  };
}

describe('the robot on the test course', () => {
  for (const fps of [30, 60, 120, 144]) {
    it(`reaches the big candy at ${fps} Hz`, () => {
      const result = playThrough(fps);
      expect(result.goal).toBe(true);
      expect(result.seconds).toBeLessThan(60);
      expect(result.lowest).toBeGreaterThan(-1);
      expect(result.bubbles).toBe(0);
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
      const { x, ahead, offered } = decide(testbana, p);
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
      const ahead = game.sim.curr.x < 25 && decide(testbana, game.sim.curr).ahead;
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
