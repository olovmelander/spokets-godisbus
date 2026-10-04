/**
 * Quality tiers (plan §6.5). The game is tuned for High on the family's devices; Low and Mid keep it playable
 * elsewhere.
 *  - Low renders straight to the canvas, with tone mapping in the materials and no post-processing.
 *  - Mid and High render to HDR buffers and run one grading pass, with glow on High.
 * High's depth blur and the grade inside the materials for Low still wait for the golden frames.
 */
export type Tier = 'low' | 'mid' | 'high';

export const TIERS: readonly Tier[] = ['low', 'mid', 'high'];

/** How many pixels a frame may have, per tier. */
export const PIXEL_CAP: Readonly<Record<Tier, number>> = { low: 1.0e6, mid: 1.6e6, high: 2.6e6 };

/** The canvas's pixel ratio: never above the screen's own or 2, and never more pixels than the tier allows. */
export function pixelRatioFor(tier: Tier, cssWidth: number, cssHeight: number, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio || 1, 2, Math.sqrt(PIXEL_CAP[tier] / (cssWidth * cssHeight)));
}

/** What the page asked for with ?tier=low, mid or high. null means Auto. */
export function tierFromQuery(value: string | null): Tier | null {
  return TIERS.includes(value as Tier) ? (value as Tier) : null;
}

/**
 * The tier to use at startup or after a settings change. Without float buffers it is always Low.
 * Auto starts in Mid, and may go up to High once play has shown that the device keeps up: see `createAutoTier`.
 */
export function chooseTier(asked: Tier | null, floatBuffers: boolean): Tier {
  if (!floatBuffers) return 'low';
  return asked ?? 'mid';
}

/** Auto measures this many seconds of play at Mid, after the first second, before it tries High. */
export const AUTO_SETTLE = 4;
/** And this many at High, after the half second in which the picture changes size. */
export const AUTO_TRIAL = 4;
/** A frame is late when it takes more than this many times the usual frame at Mid. */
export const AUTO_LATE = 1.5;
/** High is kept when at most this share of its frames were late. */
export const AUTO_LATE_SHARE = 0.1;
/** Slower than this at Mid, in seconds a frame, and High is never tried. */
export const AUTO_TOO_SLOW = 1 / 45;

export interface AutoTier {
  /** Takes the time one frame of play took, in seconds, and tells the tier to draw the next one in. */
  feed(dt: number): Tier;
  readonly tier: Tier;
  /** True once it has made up its mind: from then on the tier never changes. */
  readonly settled: boolean;
}

const middle = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 0;

/**
 * Auto (plan §6.5). High draws more pixels than Mid and enables the grading pass's glow uniform, so the two
 * can change without compiling shaders. The game starts at Mid, measures its frames, tries High, and keeps it
 * if the frames still come on time. If they don't, it goes back to Mid. One try: the picture never goes
 * back and forth.
 */
export function createAutoTier(): AutoTier {
  let tier: Tier = 'mid';
  let phase: 'warm' | 'measure' | 'change' | 'trial' | 'done' = 'warm';
  let time = 0;
  let usual = 0;
  let frames: number[] = [];
  const to = (next: typeof phase) => {
    phase = next;
    time = 0;
    frames = [];
  };
  return {
    feed(dt) {
      if (phase === 'done' || !(dt > 0)) return tier;
      time += dt;
      if (phase === 'warm') {
        // The first second has the loading in it: it says nothing.
        if (time >= 1) to('measure');
      } else if (phase === 'measure') {
        frames.push(dt);
        if (time >= AUTO_SETTLE) {
          usual = middle(frames);
          if (usual > AUTO_TOO_SLOW) to('done');
          else {
            tier = 'high';
            to('change');
          }
        }
      } else if (phase === 'change') {
        // The frame in which the picture changes size is slow on any device.
        if (time >= 0.5) to('trial');
      } else {
        frames.push(dt);
        if (time >= AUTO_TRIAL) {
          const late = frames.filter((frame) => frame > usual * AUTO_LATE).length;
          if (late > frames.length * AUTO_LATE_SHARE) tier = 'mid';
          to('done');
        }
      }
      return tier;
    },
    get tier() {
      return tier;
    },
    get settled() {
      return phase === 'done';
    },
  };
}
