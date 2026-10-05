import { ELOF_HEIGHT, STEP } from '../../src/sim/constants';
import type { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

/**
 * The hands of a test: the few moves a chapter's side ways are played with (docs/level-design.md). Each takes
 * the simulation as it stands and leaves him standing, so they can be said one after another like a route:
 * walk here, jump up, leap right, swing along three rings.
 */
export const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };

/** Lets time pass, with something held. */
export function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}

/** Walks to an x on the level he stands on, slowly, and stands there. False if he did not get there. */
export function walkTo(sim: Sim, x: number, limit = 20): boolean {
  for (let i = 0; i < limit / STEP && Math.abs(x - sim.curr.x) > 0.05; i++) sim.step({ ...idle, x: Math.sign(x - sim.curr.x) * 0.5 });
  run(sim, 0.25);
  return Math.abs(x - sim.curr.x) <= 0.1;
}

/** Runs at full speed until he has passed an x. False if he did not. */
export function runPast(sim: Sim, x: number, limit = 20): boolean {
  const dir = Math.sign(x - sim.curr.x) || 1;
  for (let i = 0; i < limit / STEP && dir * (x - sim.curr.x) > 0; i++) sim.step({ ...idle, x: dir });
  return dir * (x - sim.curr.x) <= 0;
}

/** A held jump from where he stands: straight up, or carried to one side by holding the stick. Ends when he stands. */
export function jump(sim: Sim, x = 0): void {
  sim.step({ ...idle, x, hop: true, hopHeld: true });
  for (let i = 0; i < 4 / STEP; i++) {
    sim.step({ ...idle, x, hopHeld: true });
    if (sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.vy <= 0.01) break;
    if (sim.curr.mode === 'bubble') break;
  }
  run(sim, 0.1);
}

/**
 * A running held jump: he runs the way he is told and takes off when he passes `from` (at once, if left out),
 * holding the stick until he stands again.
 */
export function leap(sim: Sim, dir: 1 | -1, from?: number): void {
  if (from !== undefined) for (let i = 0; i < 20 / STEP && dir * (from - sim.curr.x) > 0; i++) sim.step({ ...idle, x: dir });
  jump(sim, dir);
}

/** One press of Använd. */
export function use(sim: Sim): void {
  sim.step({ ...idle, act: true });
  run(sim, 0.1);
}

/** How far round the swing he is, in radians from straight down: positive to the right. */
export const angleOf = (sim: Sim): number => {
  const p = sim.curr;
  return p.hook ? Math.atan2(p.x - p.hook.x, p.hook.y - (p.y + ELOF_HEIGHT / 2)) : 0;
};

/**
 * Swings along rings the way he is told: he throws the lace when it is offered, pushes the way he swings, and
 * lets go on the way up past `release` radians. In the air he throws again, for as many rings as `rings`
 * allows. It ends when he stands, or in the glitter bubble. Gives the x of each ring he hung from, in order.
 */
export function swingAlong(sim: Sim, dir: 1 | -1, rings = 1, release = 0.8, limit = 25): number[] {
  const taken: number[] = [];
  let was = sim.curr.mode;
  for (let i = 0; i < limit / STEP; i++) {
    const p = sim.curr;
    const input = { ...idle, x: dir };
    if (p.mode === 'free' && p.verb === 'lace' && taken.length < rings) input.act = true;
    if (p.mode === 'swing' && p.hook) {
      if (was !== 'swing') taken.push(p.hook.x);
      if (dir * p.vx > 0 && dir * angleOf(sim) > release) input.hop = true;
    }
    was = p.mode;
    sim.step(input);
    if (taken.length > 0 && sim.curr.mode === 'free' && sim.curr.grounded) break;
    if (sim.curr.mode === 'bubble') break;
  }
  run(sim, 0.15);
  return taken;
}

/** How many of a chapter's side candies are in the bag, among those between two x. */
export function sideTaken(sim: Sim, from: number, to: number): { taken: number; of: number } {
  const side = sim.chapter.side ?? [];
  let taken = 0;
  let of = 0;
  for (const [i, candy] of side.entries()) {
    if (candy.x < from || candy.x > to) continue;
    of++;
    if (sim.collectedSide[i]) taken++;
  }
  return { taken, of };
}
