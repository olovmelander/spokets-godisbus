import { STEP } from './constants';
import type { GhostState } from './sim';
import type { PlayerState, Vec } from './types';

export interface PrologueLayout { doorway: Vec; railing: Vec }
export interface PrologueFrame { kind: 'mamma' | 'pappa'; seconds: number; ghost: Vec }
export const MAMMA_TIME = 2.6;
export const PAPPA_TIME = 3;

/** Two short, deterministic freeze jokes. Only completed beats are saved; an interrupted one replays. */
export class PrologueSequence {
  frame: PrologueFrame | null = null;
  constructor(readonly layout: PrologueLayout) {}

  tick(player: PlayerState, ghost: GhostState | null, flags: Set<string>): void {
    if (!ghost) return;
    if (flags.has('pappa:done')) { ghost.gone = true; return; }
    if (!this.frame && player.mode === 'free' && player.grounded) {
      if (flags.has('blink') && !flags.has('mamma:passed') && ghost.x >= this.layout.doorway.x - 1.2) {
        this.frame = { kind: 'mamma', seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
      } else if (flags.has('star') && !flags.has('pappa:done') && player.x >= 44.4) {
        flags.add('pappa:noticed');
        this.frame = { kind: 'pappa', seconds: 0, ghost: { x: ghost.x, y: ghost.y } };
      }
    }
    if (this.frame) {
      this.frame.seconds += STEP;
      const mamma = this.frame.kind === 'mamma';
      if (this.frame.seconds + STEP / 2 >= (mamma ? MAMMA_TIME : PAPPA_TIME)) {
        flags.add(mamma ? 'mamma:passed' : 'pappa:done');
        if (!mamma) ghost.gone = true; // The railing is empty when Pappa looks back.
        this.frame = null;
      }
    }
    // The first doorway catches the bag after Mamma has passed. The existing trail begins just beyond it.
    if (flags.has('mamma:passed') && ghost.x >= this.layout.doorway.x) flags.add('bag:torn');
  }

  cancel(): void { this.frame = null; }
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const between = (t: number, start: number, end: number) => {
  const n = Math.max(0, Math.min(1, (t - start) / (end - start)));
  return n * n * (3 - 2 * n);
};

/** The view rehearses exactly the simulation's clock, so pause/recovery freeze every actor together. */
export function prologuePose(layout: PrologueLayout, frame: PrologueFrame) {
  const t = frame.seconds;
  if (frame.kind === 'mamma') {
    const fall = between(t, 0.25, 0.7) - between(t, 2.0, 2.6);
    return { x: frame.ghost.x, y: mix(frame.ghost.y, layout.doorway.y + 0.29, fall), tilt: -Math.PI / 2 * fall, turn: 0.4, scale: 1 };
  }
  const lift = between(t, 0.45, 1.4), sneak = between(t, 1.85, 2.85);
  return {
    x: mix(frame.ghost.x, layout.railing.x, lift) + sneak * 2.7,
    y: mix(frame.ghost.y, layout.railing.y, lift),
    tilt: sneak > 0 && sneak < 1 ? -0.1 : 0, turn: sneak > 0 ? 0.4 : Math.PI - 0.4,
    scale: 1 - between(t, 2.6, 2.95),
  };
}
