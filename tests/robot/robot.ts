import { Game } from '../../src/app/game';
import { DROP_RADIUS, DROP_WARNING } from '../../src/sim/constants';
import type { DripState, MoverState } from '../../src/sim/sim';
import type { ChapterData, SimOptions } from '../../src/sim/types';

/** The ground's height at x, read from the chapter data. */
export function heightAt(chapter: ChapterData, x: number): number {
  const g = chapter.ground;
  for (let i = 0; i < g.length - 1; i++) {
    const a = g[i]!;
    const b = g[i + 1]!;
    if (a.x !== b.x && x >= a.x && x < b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return Infinity;
}

/** What the robot does this frame: where it pushes the stick, and what it wants to press. */
export interface Decision {
  x: number;
  y: number;
  /** A reason to press Hoppa: the press is made the moment the reason appears. */
  ahead: boolean;
  /** A reason to press Använd. */
  offered: boolean;
}

/**
 * The robot plays through the real loop and press queue with a fake clock (plan §6.13).
 * It decides from what it sees, as a player does:
 * - it runs right, and holds Hoppa when a wall stands ahead or a gap opens. A slope and a kerb are no wall:
 *   it runs up them. A step down with no far side is no gap: it runs off that, as the trail shows;
 * - when Använd offers the lace, a hose that leads on, a thing to pull, push, turn, take or call, or the
 *   ghost within reach, it presses it, standing still where that matters;
 * - on the lace it pushes the way it swings, and lets go on the way up at full height. It throws the lace
 *   from the ground only: in the air after letting go the hook is still in reach, and Använd would take it
 *   straight back;
 * - falling drops it reads from their shadows: it waits before one whose drop would land on it;
 * - on a ride it steers towards the next candy.
 */
export function decide(game: Game, chapter: ChapterData): Decision {
  const p = game.sim.curr;
  const movers: readonly MoverState[] = game.sim.movers;
  const drips: readonly DripState[] = game.sim.drips;
  const wait: Decision = { x: 0, y: 0, ahead: false, offered: false };

  if (p.mode === 'ride') {
    const next = chapter.candy.find((c, i) => !game.sim.collected[i] && c.x > p.x + 0.3 && c.x < p.x + 6);
    const off = next ? next.y - (p.y + 0.5) : 0;
    return { ...wait, x: 1, y: Math.abs(off) < 0.15 ? 0 : Math.sign(off) };
  }
  const inALandingPlace = drips.some((d) => Math.abs(d.x - p.x) < DROP_RADIUS + 0.1);
  if (!inALandingPlace && p.grounded) {
    for (const d of drips) {
      const edge = d.x - DROP_RADIUS - p.x;
      if (Math.abs(d.y - p.y) > 0.5 || edge > 1.1 || edge < 0) continue;
      const until = d.shadow > 0 ? (1 - d.shadow) * DROP_WARNING : Infinity;
      // From a standstill the run through takes a little longer than at full speed.
      const through = (edge + 2 * DROP_RADIUS) / 3.5 + 0.45;
      if (until < through) return wait;
    }
  }
  // A thing on its way along its rail: wait for it.
  if (movers.some((m) => m.t < 1)) return wait;
  // Something to do where it stands: stand still and do it.
  if (p.verb !== null && p.verb !== 'lace' && p.verb !== 'slide') return { ...wait, offered: true };
  if (p.hook) {
    const angle = Math.atan2(p.x - p.hook.x, p.hook.y - (p.y + 0.5));
    const high = p.vx > 0 && angle > 0.68 && angle < 0.85 && Math.hypot(p.vx, p.vy) > 5;
    return { x: p.vx < -0.05 ? -1 : 1, y: 0, ahead: high, offered: false };
  }
  // Steeper than 45 degrees over the next EL, and more than a step high. A thing in the way is a wall too.
  // One that can still be pushed is walked up to, not jumped at.
  const placed = (m: MoverState) => m.stop === m.def.stops.length - 1;
  const inTheWay = movers.some((m) => placed(m) && m.x - m.def.width / 2 - p.x > 0 && m.x - m.def.width / 2 - p.x < 1 && m.y + m.def.height > p.y + 0.3);
  const wall = inTheWay || heightAt(chapter, p.x + 1.0) - heightAt(chapter, p.x + 0.6) > 0.4;
  // A gap with a plank across it is no gap.
  const bridged = movers.some((m) => Math.abs(m.y + m.def.height - p.y) < 0.3 && m.x - m.def.width / 2 < p.x + 0.4 && m.x + m.def.width / 2 > p.x + 2);
  const gap = !bridged && heightAt(chapter, p.x + 0.35) < p.y - 0.3 && heightAt(chapter, p.x + 2.2) > p.y - 0.3;
  const leadsOn = (chapter.climbs ?? []).some((c) => Math.abs(c.top - p.y) < 0.3 && c.x > p.x && c.x - p.x < 1);
  return { x: 1, y: 0, ahead: p.grounded && (wall || gap), offered: (p.verb === 'lace' && p.grounded) || (p.verb === 'slide' && leadsOn) };
}

/** Plays a course from its start until its end, or for `limit` seconds, and says how it went. */
export function playThrough(fps: number, chapter: ChapterData, options: SimOptions = {}, limit = 150) {
  const game = new Game(chapter, options);
  const dt = 1 / fps;
  let lowest = Infinity;
  let frames = 0;
  let wasAhead = false;
  let wasOffered = false;
  while (!game.sim.flags.has('goal') && frames < fps * limit) {
    const { x, y, ahead, offered } = decide(game, chapter);
    // A press is the moment the reason appears; holding is everything after it.
    game.frame(dt, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
    wasAhead = ahead;
    wasOffered = offered;
    lowest = Math.min(lowest, game.sim.curr.y);
    frames++;
  }
  const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
  return {
    goal: game.sim.flags.has('goal'), seconds: frames * dt, steps: game.sim.steps, end: game.sim.curr, lowest,
    candy: game.sim.candyCount, missed, bubbles: game.sim.bubbles, knocks: game.sim.knocks, said: [...game.sim.said],
    flags: [...game.sim.flags], checkpoint: game.sim.checkpoint, x: game.sim.curr.x,
  };
}
