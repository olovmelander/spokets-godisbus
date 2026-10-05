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
export const PAPPA_TIME = 3;

/**
 * Two short, deterministic freeze jokes (plan §3.3 rule 2). Only completed beats are saved; an interrupted one
 * replays. `perches` are the ghost's places: after Pappa's joke it is where the edge perch is.
 */
export class PrologueSequence {
  frame: PrologueFrame | null = null;
  constructor(readonly layout: PrologueLayout, private readonly perches: readonly GhostPerch[] = []) {}

  tick(player: PlayerState, ghost: GhostState | null, flags: Set<string>): void {
    if (!ghost) return;
    if (flags.has('pappa:done') && !this.layout.edge) { ghost.gone = true; return; }
    if (!this.frame && player.mode === 'free' && player.grounded) {
      // Pappa notices it once its flag is set, where he kneels: a game taken up further back walks there first.
      const pappaDue = this.layout.pappaAfter
        ? (flags.has(this.layout.pappaAfter) || flags.has('pappa:noticed')) && player.x >= (this.layout.pappaFrom ?? -Infinity)
        : player.x >= 44.4;
      if (flags.has('blink') && !flags.has('mamma:passed') && ghost.x >= this.layout.doorway.x - 1.2) {
        flags.add('mamma:noticed');
        this.frame = { kind: 'mamma', seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
      } else if (flags.has('star') && !flags.has('pappa:done') && pappaDue) {
        flags.add('pappa:noticed');
        this.frame = { kind: 'pappa', seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
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
    if (flags.has('mamma:passed') && ghost.x >= this.layout.doorway.x) flags.add('bag:torn');
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

  cancel(): void { this.frame = null; }
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
  const lift = between(t, 0.45, 1.4), sneak = between(t, 1.85, 2.85);
  if (layout.edge) {
    // Behind his back it hops down off the railing and scurries to the deck's edge, where it waits.
    const hop = Math.sin(Math.PI * sneak) * 1.1;
    const rail = layout.rail?.z ?? PLAY_Z;
    return {
      x: mix(mix(frame.ghost.x, layout.railing.x, lift), layout.edge.x, sneak),
      y: mix(mix(frame.ghost.y, layout.railing.y, lift), layout.edge.y, sneak) + hop,
      z: mix(mix(PLAY_Z, rail, lift), PLAY_Z, sneak),
      tilt: sneak > 0 && sneak < 1 ? -0.12 : 0, turn: sneak > 0 ? 0.4 : Math.PI - 0.4, scale: 1,
    };
  }
  return {
    x: mix(frame.ghost.x, layout.railing.x, lift) + sneak * 2.7,
    y: mix(frame.ghost.y, layout.railing.y, lift),
    z: PLAY_Z,
    tilt: sneak > 0 && sneak < 1 ? -0.1 : 0, turn: sneak > 0 ? 0.4 : Math.PI - 0.4,
    scale: 1 - between(t, 2.6, 2.95),
  };
}
