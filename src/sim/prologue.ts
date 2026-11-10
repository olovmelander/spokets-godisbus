import { STEP } from './constants';
import type { GhostState } from './sim';
import type { GhostPerch, PlayerState, Vec } from './types';

/**
 * The prologue's set: the doorway whose hinge tears the bag, the railing Pappa puts the frozen ghost on, and
 * the deck's edge it sneaks off to behind his back. Pappa notices it once the flag `pappaAfter` is set.
 */
export interface PrologueLayout {
  doorway: Vec; railing: Vec; edge?: Vec; pappaAfter?: string; pappaFrom?: number;
  /** For the picture only: where the deck's railing runs, and how far behind the play plane. */
  rail?: { from: number; to: number; z: number };
}
export interface PrologueFrame { kind: 'mamma' | 'pappa'; seconds: number; ghost: Vec }
export const MAMMA_TIME = 2.6;
export const PAPPA_TIME = 5.2;

/**
 * Two short, deterministic freeze jokes (plan §3.3 rule 2). Only completed beats are saved; an interrupted one
 * replays. `perches` are the ghost's places: after Pappa's joke it is where the edge perch is.
 */
export class PrologueSequence {
  frame: PrologueFrame | null = null;
  /** A joke is due and waits for what is being said to finish: he stands and listens meanwhile. */
  listening = false;
  constructor(readonly layout: PrologueLayout, private readonly perches: readonly GhostPerch[] = []) {}

  /**
   * One step. `talking`: a line is still being read, or waits to be said, so a joke that is due waits. The simulation
   * waits for the page to finish the line (./sim.ts).
   */
  tick(player: PlayerState, ghost: GhostState | null, flags: Set<string>, talking = false, conditions: Pick<ReadonlySet<string>, 'has'> = flags): void {
    this.listening = false;
    if (!ghost) return;
    if (conditions.has('pappa:done') && !this.layout.edge) { ghost.gone = true; return; }
    if (!this.frame && player.mode === 'free' && player.grounded) {
      // Pappa notices it once its flag is set, where he kneels: a game taken up further back walks there first.
      const pappaDue = this.layout.pappaAfter
        ? (conditions.has(this.layout.pappaAfter) || conditions.has('pappa:noticed')) && player.x >= (this.layout.pappaFrom ?? -Infinity)
        : player.x >= 44.4;
      const kind = conditions.has('blink') && !conditions.has('mamma:passed') && ghost.x >= this.layout.doorway.x - 1.2 ? 'mamma'
        : conditions.has('star') && !conditions.has('pappa:done') && pappaDue ? 'pappa' : null;
      // Its line is said as it begins: the words before it are let finish first.
      if (kind && talking) this.listening = true;
      else if (kind) {
        flags.add(`${kind}:noticed`);
        this.frame = { kind, seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
      }
    }
    if (this.frame) {
      this.frame.seconds += STEP;
      const mamma = this.frame.kind === 'mamma';
      if (this.frame.seconds + STEP / 2 >= (mamma ? MAMMA_TIME : PAPPA_TIME)) {
        flags.add(mamma ? 'mamma:passed' : 'pappa:done');
        if (!mamma) this.hide(ghost);
        this.frame = null;
      }
    }
    // The first doorway catches the bag after Mamma has passed. The existing trail begins just beyond it.
    if (conditions.has('mamma:passed') && ghost.x >= this.layout.doorway.x) flags.add('bag:torn');
  }

  /**
   * The railing is empty when Pappa looks back. In the older prologue the ghost was gone; now it is at the deck's
   * edge, where it waits for Elof: its edge perch.
   */
  hide(ghost: GhostState): void {
    const edge = this.layout.edge;
    const at = edge ? this.perches.findIndex((perch) => perch.at.x === edge.x && perch.at.y === edge.y) : -1;
    if (!edge || at < 0) { ghost.gone = true; return; }
    ghost.x = edge.x;
    ghost.y = edge.y;
    ghost.perch = at;
    ghost.t = 1;
    ghost.gone = false;
  }

  cancel(): void { this.frame = null; this.listening = false; }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (t: number, start: number, end: number) => {
  const n = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return n * n * (3 - 2 * n);
};

/** How far in front of the play plane the ghost is drawn in a freeze joke, where it is not on the railing. */
const PLAY_Z = 0.1;

/** The view rehearses exactly the simulation's clock, so pause/recovery freeze every actor together. */
export function prologuePose(layout: PrologueLayout, frame: PrologueFrame) {
  const t = frame.seconds;
  if (frame.kind === 'mamma') {
    const fall = between(t, 0.25, 0.7) - between(t, 2.0, 2.6);
    return { x: frame.ghost.x, y: mix(frame.ghost.y, layout.doorway.y + 0.29, fall), z: PLAY_Z, tilt: -Math.PI / 2 * fall, turn: 0.4, scale: 1 };
  }
  const lift = between(t, 1.1, 2.8), sneak = between(t, 3.4, 4.9);
  if (layout.edge) {
    // Behind his back it hops down off the railing and scurries to the deck's edge, where it waits.
    const hop = Math.sin(Math.PI * sneak) * 1.1;
    const rail = layout.rail?.z ?? PLAY_Z;
    return {
      x: mix(mix(frame.ghost.x, layout.railing.x, lift), layout.edge.x, sneak),
      y: mix(mix(frame.ghost.y, layout.railing.y, lift), layout.edge.y, sneak) + hop,
      z: mix(mix(PLAY_Z, rail, lift), PLAY_Z, sneak),
      // It turns round to go as it sets off, over a third of a second, and leans into its scurry and out of it.
      tilt: -0.12 * Math.sin(Math.PI * sneak), turn: mix(Math.PI - 0.4, 0.4, between(t, 3.15, 3.5)), scale: 1,
    };
  }
  return {
    x: mix(frame.ghost.x, layout.railing.x, lift) + sneak * 2.7,
    y: mix(frame.ghost.y, layout.railing.y, lift),
    z: PLAY_Z,
    tilt: -0.1 * Math.sin(Math.PI * sneak), turn: mix(Math.PI - 0.4, 0.4, between(t, 3.15, 3.5)),
    scale: 1 - between(t, 4.7, 5.15),
  };
}
