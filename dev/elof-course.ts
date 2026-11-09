import { Sim } from '../src/sim/sim';
import type { ChapterData, StepInput } from '../src/sim/types';

/**
 * A course for Elof in the motion lab (dev/motion.html?scene=elofplay): the game's own simulation, driven by a script of
 * stick and button presses, so that his body can be watched and measured through what he does in play. Units: EL.
 *
 * Standing he jumps (Hoppa held) and hops (a tap); he walks and turns about, stops; runs and turns about twice, stops; makes
 * a running jump and runs on from its landing; clambers up a wall a little higher than he is, runs off its far side (a fall
 * from a ledge, into a run); walks into a hose and climbs it, steps off its top, and walks off that ledge's edge, three of
 * him high.
 */
export const COURSE: ChapterData = {
  id: 'elof-course',
  spawn: { x: 0, y: 0.01 },
  goalX: 400,
  candy: [],
  ground: [
    { x: -30, y: 10 }, { x: -30, y: 0 },
    // A wall he pulls himself up, a little higher than he is tall, and the drop off its far side.
    { x: 24, y: 0 }, { x: 24, y: 1.2 }, { x: 30, y: 1.2 }, { x: 30, y: 0 },
    // A hose up the side of a high ledge, and its far edge.
    { x: 40.3, y: 0 }, { x: 40.3, y: 3 }, { x: 46, y: 3 }, { x: 46, y: 0 },
    { x: 90, y: 0 }, { x: 90, y: 10 },
  ],
  climbs: [{ x: 40.1, bottom: 0, top: 3, exit: 1 }],
};

/** One part of the script: what the stick and Hoppa do `t` seconds into it, and whether it is over. */
interface Part {
  name: string;
  input: (t: number, sim: Sim) => Partial<StepInput>;
  over: (t: number, sim: Sim, part: { landedAt: number | null; leftAt: number | null }) => boolean;
}

const still = () => ({});
const forFor = (seconds: number) => (t: number) => t >= seconds;
/** Over once he has been in the air and down again for `after` seconds. */
const landed = (after: number) => (t: number, _sim: Sim, part: { landedAt: number | null }) => part.landedAt !== null && t - part.landedAt >= after;

const PARTS: Part[] = [
  { name: 'stand', input: still, over: forFor(1) },
  // A held jump from standing, up to its top (1.1 EL) and down, and he stands.
  { name: 'jump', input: (t) => ({ hop: t < 1 / 60, hopHeld: t < 0.5 }), over: landed(1) },
  // A tap: a hop (0.6 EL).
  { name: 'hop', input: (t) => ({ hop: t < 1 / 60, hopHeld: t < 1 / 60 }), over: landed(1) },
  { name: 'walk', input: () => ({ x: 0.6 }), over: forFor(2) },
  { name: 'walk-turn', input: () => ({ x: -0.6 }), over: forFor(1.8) },
  { name: 'walk-stop', input: still, over: forFor(1.2) },
  { name: 'run', input: () => ({ x: 1 }), over: forFor(2) },
  { name: 'run-turn', input: () => ({ x: -1 }), over: forFor(1.6) },
  { name: 'run-turn2', input: () => ({ x: 1 }), over: forFor(1.4) },
  { name: 'run-stop', input: still, over: forFor(1.2) },
  // A running jump, held, and on at a run from where he lands.
  { name: 'run-jump', input: (t) => ({ x: 1, hop: Math.abs(t - 0.9) < 1 / 120, hopHeld: t >= 0.9 && t < 1.5 }), over: landed(1.2) },
  { name: 'land-stop', input: still, over: forFor(1.2) },
  // A short hop at a walk, and on.
  { name: 'walk-hop', input: (t) => ({ x: 0.6, hop: Math.abs(t - 0.6) < 1 / 120, hopHeld: Math.abs(t - 0.6) < 1 / 120 }), over: landed(0.8) },
  // On at a run into the wall: he pulls himself up it, and runs on off its far side.
  { name: 'clamber', input: () => ({ x: 1 }), over: (t, sim) => sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.y > 1 && t > 0.3 },
  { name: 'off-ledge', input: () => ({ x: 1 }), over: landed(1) },
  { name: 'fall-stop', input: still, over: forFor(1.2) },
  // Walking into the hose he takes hold of it, climbs, steps off its top, and walks off the ledge's far edge.
  { name: 'to-hose', input: () => ({ x: 0.6 }), over: (_t, sim) => sim.curr.mode === 'climb' },
  { name: 'climb', input: () => ({ y: 1 }), over: (_t, sim) => sim.curr.mode === 'free' && sim.curr.grounded },
  { name: 'walk-off', input: () => ({ x: 0.6 }), over: landed(1) },
  { name: 'end', input: still, over: forFor(1.5) },
];

/** The course played: `step` advances it by a frame of `dt` (two of the simulation's steps at 60 frames a second). */
export function createCourse() {
  const sim = new Sim(COURSE);
  let at = 0, t = 0;
  const part = { landedAt: null as number | null, leftAt: null as number | null };
  let wasGrounded = true;
  return {
    sim,
    get part(): string { return PARTS[Math.min(at, PARTS.length - 1)]!.name; },
    get t(): number { return t; },
    get done(): boolean { return at >= PARTS.length; },
    step(dt: number): void {
      for (let left = dt; left > 1e-9; left -= 1 / 120) {
        const now = PARTS[at];
        const input: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false, ...(now ? now.input(t, sim) : {}) };
        sim.step(input);
        t += 1 / 120;
        const grounded = sim.curr.grounded && sim.curr.mode === 'free';
        if (!grounded && wasGrounded) part.leftAt = t;
        if (grounded && !wasGrounded && part.leftAt !== null) part.landedAt = t;
        wasGrounded = grounded;
        if (now && now.over(t, sim, part)) { at++; t = 0; part.landedAt = part.leftAt = null; }
      }
    },
  };
}
