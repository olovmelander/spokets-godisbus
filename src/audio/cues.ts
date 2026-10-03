import type { Mode } from '../sim/types';

/**
 * Which sounds a moment of play asks for. This is worked out from two looks at the game, a frame apart,
 * with no audio in it at all, so that it can be tested without ears (plan §5.8).
 */
export type Cue =
  | { kind: 'step'; left: boolean }
  | { kind: 'jump' }
  | { kind: 'land'; hard: number }
  /** `streak` counts the candies collected in a row: each one sounds a step higher (plan §5.8). */
  | { kind: 'candy'; streak: number }
  | { kind: 'bigCandy' }
  | { kind: 'bubble' }
  | { kind: 'lace' }
  | { kind: 'letGo' }
  | { kind: 'haul' }
  | { kind: 'grab' }
  | { kind: 'slide' }
  | { kind: 'knocked' }
  | { kind: 'splash'; near: number }
  | { kind: 'wood' }
  | { kind: 'goal' };

/** What the cues are worked out from: the little of the game's state that can be heard. */
export interface Heard {
  /** Seconds of play. */
  time: number;
  mode: Mode;
  grounded: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  candy: number;
  checkpoint: number;
  bubbles: number;
  atGoal: boolean;
  /** How many things on rails are on their way. */
  moving: number;
  /** For each drip, how far its next drop's shadow has grown; it falls back to 0 when the drop lands. */
  shadows: readonly number[];
  /** Where the drips are, for how near a splash is. */
  drips: readonly { x: number; y: number }[];
}

/** What has to be remembered between frames: the candy streak and the stride. */
export interface CueMemory {
  streak: number;
  lastCandyAt: number;
  stride: number;
  left: boolean;
}

export const newCueMemory = (): CueMemory => ({ streak: 0, lastCandyAt: -10, stride: 0, left: true });

/** A candy within this long of the one before continues the streak. */
export const STREAK_GAP = 1.4;
/** One footstep for every this many EL he covers on the ground. */
export const STRIDE = 0.55;

export function cuesFor(before: Heard, now: Heard, memory: CueMemory): Cue[] {
  const cues: Cue[] = [];
  const dt = Math.max(0, now.time - before.time);

  // Candy: each one collected in a row sounds a step higher.
  for (let i = before.candy; i < now.candy; i++) {
    memory.streak = now.time - memory.lastCandyAt <= STREAK_GAP ? memory.streak + 1 : 0;
    memory.lastCandyAt = now.time;
    cues.push({ kind: 'candy', streak: memory.streak });
  }
  if (now.checkpoint > before.checkpoint) cues.push({ kind: 'bigCandy' });
  if (now.atGoal && !before.atGoal) cues.push({ kind: 'goal' });

  // What he starts doing.
  if (now.mode !== before.mode) {
    if (now.mode === 'bubble') cues.push({ kind: 'bubble' });
    else if (now.mode === 'swing') cues.push({ kind: 'lace' });
    else if (now.mode === 'ledge') cues.push({ kind: 'haul' });
    else if (now.mode === 'climb') cues.push({ kind: 'grab' });
    else if (now.mode === 'slide') cues.push({ kind: 'slide' });
    else if (now.mode === 'down') cues.push({ kind: 'knocked' });
    else if (now.mode === 'fly') cues.push({ kind: before.mode === 'swing' ? 'letGo' : 'jump' });
    else if (now.mode === 'free' && before.mode === 'swing') cues.push({ kind: 'letGo' });
    else if (now.mode === 'free' && before.mode === 'climb' && now.vy > 2) cues.push({ kind: 'jump' });
  }

  // On his own feet: a jump, a landing, and steps by the distance he covers.
  if (now.mode === 'free' && before.mode === 'free') {
    if (before.grounded && !now.grounded && now.vy > 3) cues.push({ kind: 'jump' });
    if (!before.grounded && now.grounded) cues.push({ kind: 'land', hard: Math.min(1, Math.max(0, -before.vy) / 10) });
    if (now.grounded) {
      memory.stride += Math.abs(now.vx) * dt;
      if (memory.stride >= STRIDE) {
        memory.stride -= STRIDE;
        memory.left = !memory.left;
        cues.push({ kind: 'step', left: memory.left });
      }
    } else {
      memory.stride = STRIDE * 0.6;
    }
  }

  // Drops landing: louder the nearer they are.
  for (const [i, shadow] of now.shadows.entries()) {
    if ((before.shadows[i] ?? 0) > 0.5 && shadow < 0.2) {
      const drip = now.drips[i];
      const away = drip ? Math.hypot(drip.x - now.x, drip.y - now.y) : 20;
      if (away < 12) cues.push({ kind: 'splash', near: Math.max(0, 1 - away / 12) });
    }
  }

  if (now.moving > before.moving) cues.push({ kind: 'wood' });
  return cues;
}
