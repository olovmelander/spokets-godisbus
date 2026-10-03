import type { ChapterData, Mode, PlaceId, Speaker, SurfaceKind } from '../sim/types';

/**
 * How each one sounds when a line of theirs comes up: a few wordless syllables, never a word, and nothing
 * recorded (plan §5.8, §0 Q9). `pitch` is in Hz, `steps` are semitones above it, one to a syllable, and
 * `pace` is seconds from one syllable to the next. The ghost has no voice at all: it knocks, wood on wood.
 */
export interface Voice {
  wave: 'sine' | 'triangle' | 'wood';
  pitch: number;
  steps: number[];
  pace: number;
}

export const VOICES: Record<Speaker, Voice> = {
  elof: { wave: 'triangle', pitch: 520, steps: [0, 3, 5, 3], pace: 0.1 },
  mamma: { wave: 'sine', pitch: 350, steps: [4, 2, 0, 2], pace: 0.13 },
  pappa: { wave: 'triangle', pitch: 175, steps: [0, 0, 3], pace: 0.16 },
  moa: { wave: 'triangle', pitch: 440, steps: [0, 4, 2, 5, 7], pace: 0.09 },
  bertil: { wave: 'sine', pitch: 620, steps: [0, 2], pace: 0.14 },
  spoket: { wave: 'wood', pitch: 300, steps: [0, 0, 5], pace: 0.15 },
};

/** What he walks on, for the sound of his steps (plan §5.8). */
export type Footing = 'plank' | 'moss' | 'grass' | 'squelch' | 'stone' | 'gravel' | 'shavings';

/** A place's own ground, and what the stretches a chapter marks out are made of. */
const OWN: Record<PlaceId, Footing> = { forest: 'moss', garden: 'grass', bog: 'squelch', mountain: 'stone', dusk: 'stone', home: 'plank' };
const MADE: Record<SurfaceKind, Footing> = { wood: 'plank', earth: 'gravel', stone: 'stone', shavings: 'shavings', hedge: 'grass' };

/** What the ground is at x. A course without a place, the test course, has no footing: a plain step. */
export function footingAt(chapter: Pick<ChapterData, 'place' | 'surfaces'>, x: number): Footing | undefined {
  const made = chapter.surfaces?.find((s) => x >= s.from && x <= s.to)?.kind;
  return made ? MADE[made] : chapter.place ? OWN[chapter.place] : undefined;
}

/**
 * Which sounds a moment of play asks for. This is worked out from two looks at the game, a frame apart,
 * with no audio in it at all, so that it can be tested without ears (plan §5.8).
 */
export type Cue =
  | { kind: 'step'; left: boolean; on?: Footing }
  | { kind: 'jump' }
  | { kind: 'land'; hard: number; on?: Footing }
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
  /** A stone that rings when he touches it: each one a step higher. */
  | { kind: 'note'; step: number }
  | { kind: 'gust' }
  /** A hidden candy of a new kind. */
  | { kind: 'found' }
  /** Someone's line comes up: their wordless sound. */
  | { kind: 'say'; who: Speaker }
  /** The ghost hops on to its next place: a knock and a creak, louder the nearer it is. */
  | { kind: 'ghostHop'; near: number }
  /** The helper knocks twice: look here. */
  | { kind: 'knocks' }
  /** A cranberry bounces him. */
  | { kind: 'bounce' }
  /** Elof himself, without words: a gasp as the glitter takes him, a giggle at something good. */
  | { kind: 'gasp' }
  | { kind: 'giggle' }
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
  /** How many ringing stones he has touched. */
  notes?: number;
  /** Whether a gust blows where he is. */
  wind?: boolean;
  /** How many hidden candies he has found in this chapter. */
  found?: number;
  /** What he stands on. */
  footing?: Footing | undefined;
  /** Who has said each line so far, in order. */
  said?: readonly Speaker[];
  /** Which of its places the ghost is at or hopping to, and how far from him it is, in EL. */
  ghostPerch?: number;
  ghostAway?: number;
  /** How far the helper has come: from 2 on it knocks. */
  helpStep?: number;
  /** How many times a cranberry has bounced him. */
  bounces?: number;
}

/** What has to be remembered between frames: the candy streak, the stride, and when he last bounced. */
export interface CueMemory {
  streak: number;
  lastCandyAt: number;
  stride: number;
  left: boolean;
  lastBounceAt: number;
}

export const newCueMemory = (): CueMemory => ({ streak: 0, lastCandyAt: -10, stride: 0, left: true, lastBounceAt: -10 });

/** A candy within this long of the one before continues the streak. */
export const STREAK_GAP = 1.4;
/** One footstep for every this many EL he covers on the ground. */
export const STRIDE = 0.55;

export function cuesFor(before: Heard, now: Heard, memory: CueMemory): Cue[] {
  const cues: Cue[] = [];
  const dt = Math.max(0, now.time - before.time);
  const on = now.footing ? { on: now.footing } : {};

  // Candy: each one collected in a row sounds a step higher.
  for (let i = before.candy; i < now.candy; i++) {
    memory.streak = now.time - memory.lastCandyAt <= STREAK_GAP ? memory.streak + 1 : 0;
    memory.lastCandyAt = now.time;
    cues.push({ kind: 'candy', streak: memory.streak });
  }
  if (now.checkpoint > before.checkpoint) cues.push({ kind: 'bigCandy' }, { kind: 'giggle' });
  if (now.atGoal && !before.atGoal) cues.push({ kind: 'goal' });

  // What he starts doing.
  if (now.mode !== before.mode) {
    if (now.mode === 'bubble') cues.push({ kind: 'bubble' }, { kind: 'gasp' });
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
    if (!before.grounded && now.grounded) cues.push({ kind: 'land', hard: Math.min(1, Math.max(0, -before.vy) / 10), ...on });
    if (now.grounded) {
      memory.stride += Math.abs(now.vx) * dt;
      if (memory.stride >= STRIDE) {
        memory.stride -= STRIDE;
        memory.left = !memory.left;
        cues.push({ kind: 'step', left: memory.left, ...on });
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
  for (let i = before.notes ?? 0; i < (now.notes ?? 0); i++) cues.push({ kind: 'note', step: i });
  if (now.wind && !before.wind) cues.push({ kind: 'gust' });
  if ((now.found ?? 0) > (before.found ?? 0)) cues.push({ kind: 'found' });
  for (const who of (now.said ?? []).slice(before.said?.length ?? 0)) cues.push({ kind: 'say', who });
  if ((now.ghostPerch ?? 0) > (before.ghostPerch ?? 0)) cues.push({ kind: 'ghostHop', near: Math.max(0, 1 - (now.ghostAway ?? 20) / 14) });
  if ((now.helpStep ?? 0) >= 2 && (before.helpStep ?? 0) < 2) cues.push({ kind: 'knocks' });
  // The first bounce of a row makes him laugh; the ones after it are only boings.
  if ((now.bounces ?? 0) > (before.bounces ?? 0)) {
    cues.push({ kind: 'bounce' });
    if (now.time - memory.lastBounceAt > 3) cues.push({ kind: 'giggle' });
    memory.lastBounceAt = now.time;
  }
  return cues;
}
