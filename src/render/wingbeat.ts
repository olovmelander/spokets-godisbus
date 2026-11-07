/**
 * A bird's wingbeat, as a lift from -1 (wings down) to 1 (wings up). The downstroke, which carries it, takes 60% of
 * a beat and the upstroke the rest. Between bursts of beats a big bird glides with its wings held a little under
 * level, and a small one closes them. `pitch` is the small nod of the body that goes with each beat.
 */
export interface Beat { lift: number; glide: number; pitch: number }

export interface Rhythm {
  /** Seconds from one glide to the next; 0: it never glides. */
  every?: number;
  /** How long each glide lasts. */
  glide?: number;
  /** The lift its wings hold while it glides. */
  held?: number;
  /** Where in its rhythm this bird starts, in seconds. */
  seed?: number;
}

const DOWN = 0.6;
const EASE = 0.3;
const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/** One beat's lift at `phase` (in beats): from up, down for 60% of it, then up again. */
export function stroke(phase: number): number {
  const p = phase - Math.floor(phase);
  return p < DOWN ? Math.cos((Math.PI * p) / DOWN) : -Math.cos((Math.PI * (p - DOWN)) / (1 - DOWN));
}

export function wingbeat(t: number, hz: number, { every = 6, glide = 1.6, held = -0.15, seed = 0 }: Rhythm = {}): Beat {
  let g = 0;
  if (every > 0 && glide > 0) {
    const c = (((t + seed) % every) + every) % every;
    const start = every - glide;
    const ease = Math.min(EASE, glide / 2);
    if (c >= start) g = Math.min(smooth((c - start) / ease), smooth((every - c) / ease));
  }
  const flap = stroke(t * hz);
  return { lift: flap * (1 - g) + held * g, glide: g, pitch: 0.03 * stroke(t * hz - 0.25) * (1 - g) };
}
