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
export function pixelRatioFor(tier: Tier, cssWidth: number, cssHeight: number, devicePixelRatio: number, reduction = 0): number {
  const max = Math.min(devicePixelRatio > 0 && Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1, 2,
    Math.sqrt(PIXEL_CAP[tier] / (Math.max(1, cssWidth) * Math.max(1, cssHeight))));
  return max - Math.min(maxResolutionSteps(max), Math.max(0, Math.floor(reduction))) * RESOLUTION_STEP;
}

/** What the page asked for with ?tier=low, mid or high. null means Auto. */
export function tierFromQuery(value: string | null): Tier | null {
  return TIERS.includes(value as Tier) ? (value as Tier) : null;
}

/**
 * The tier to use at startup or after a settings change. Without float buffers it is always Low.
 * Auto starts in Mid, and measures busy time on the title before choosing a level: see `createAutoTier`.
 */
export function chooseTier(asked: Tier | null, floatBuffers: boolean): Tier {
  if (!floatBuffers) return 'low';
  return asked ?? 'mid';
}

/** Sample a warmed title (or paused scene) for two seconds. Frame interval determines duration only. */
export const AUTO_MEASURE = 2;
export const QUALITY_WARMUP = 0.5;
/** Leave time for input, layout and GPU submission in a 60 Hz frame. These are CPU busy milliseconds. */
export const HIGH_BUSY_MS = 8;
export const LOW_BUSY_MS = 14;
export const RESOLUTION_STEP = 0.1;
export const RESOLUTION_MIN = 0.65;
export const RESOLUTION_STEP_SECONDS = 3;
export const RESOLUTION_REVERSE_SECONDS = 6;

/** Stay on 0.1 steps from the tier cap; never sharpen beyond it or become illegible on a large display. */
export function maxResolutionSteps(max: number): number {
  return Math.max(0, Math.floor((max - Math.min(max, RESOLUTION_MIN) + 1e-9) / RESOLUTION_STEP));
}

export interface AutoTier {
  /** Call only for a visible, safely paused screen; busyMs is measured work, never the RAF interval. */
  feed(elapsed: number, busyMs: number): Tier;
  /** Discard incomplete measurements across play, loading, visibility or a resize. Keeps a settled choice. */
  suspend(): void;
  readonly tier: Tier;
  /** True once it has made up its mind: from then on the tier never changes. */
  readonly settled: boolean;
}

const percentile80 = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor((values.length - 1) * 0.8)] ?? 0;
const valid = (elapsed: number, busyMs: number) => elapsed > 0 && Number.isFinite(elapsed)
  && busyMs >= 0 && Number.isFinite(busyMs);
// A slow visible frame is evidence, not a suspension. Cap its contribution to the measurement clock so
// one long callback/resume gap cannot satisfy a window or allocation spacing. The caller explicitly
// suspends across hidden/loading/menu changes, and both controllers still require many CPU samples.
const sampleSeconds = (elapsed: number) => Math.min(elapsed, 0.25);

/**
 * Auto uses the 80th-percentile CPU cost of a warmed title scene. A capped 30 Hz callback with 3 ms of
 * work is inexpensive; its 30 ms of idle is not evidence of overload. CPU timings cannot diagnose a
 * GPU-only stall. Crossing Low changes material variants, so main.ts applies this only while paused.
 */
export function createAutoTier(): AutoTier {
  let tier: Tier = 'mid';
  let settled = false;
  let warm = 0;
  let measured = 0;
  const samples: number[] = [];
  const suspend = () => {
    warm = 0;
    measured = 0;
    samples.length = 0;
  };
  return {
    feed(elapsed, busyMs) {
      if (settled) return tier;
      if (!valid(elapsed, busyMs)) { suspend(); return tier; }
      elapsed = sampleSeconds(elapsed);
      if (warm < QUALITY_WARMUP) { warm += elapsed; return tier; }
      measured += elapsed;
      samples.push(busyMs);
      if (measured >= AUTO_MEASURE && samples.length >= 20) {
        const busy = percentile80(samples);
        tier = busy >= LOW_BUSY_MS ? 'low' : busy < HIGH_BUSY_MS ? 'high' : 'mid';
        settled = true;
        samples.length = 0;
      }
      return tier;
    },
    suspend,
    get tier() {
      return tier;
    },
    get settled() {
      return settled;
    },
  };
}

export interface DynamicResolution {
  /** Returns a number of 0.1 pixel-ratio reductions from the current tier's cap. */
  feed(elapsed: number, busyMs: number, steps: number, maxSteps: number): number;
  suspend(): void;
}

/** Rare resolution steps only; the tier, effects, simulation, camera and animation clocks stay unchanged. */
export function createDynamicResolution(): DynamicResolution {
  let warm = 0;
  let windowTime = 0;
  let sinceStep = 0;
  let trend: -1 | 0 | 1 = 0;
  let trendTime = 0;
  let lastDirection: -1 | 0 | 1 = 0;
  const samples: number[] = [];
  const suspend = () => {
    warm = 0;
    windowTime = 0;
    trend = 0;
    trendTime = 0;
    samples.length = 0;
    // Time in a paused/hidden page does not satisfy the allocation spacing or reversal guard.
  };
  return {
    suspend,
    feed(elapsed, busyMs, steps, maxSteps) {
      if (!valid(elapsed, busyMs)) { suspend(); return steps; }
      elapsed = sampleSeconds(elapsed);
      if (warm < QUALITY_WARMUP) { warm += elapsed; return steps; }
      sinceStep += elapsed;
      windowTime += elapsed;
      samples.push(busyMs);
      if (windowTime < 1 || samples.length < 12) return steps;
      const busy = percentile80(samples);
      const direction = busy >= LOW_BUSY_MS ? 1 : busy < HIGH_BUSY_MS - 1 ? -1 : 0;
      trendTime = direction === trend ? trendTime + windowTime : windowTime;
      trend = direction;
      windowTime = 0;
      samples.length = 0;
      if (direction === 0 || trendTime < (direction === 1 ? 2 : 6)
        || sinceStep < RESOLUTION_STEP_SECONDS
        || (lastDirection !== 0 && direction !== lastDirection && sinceStep < RESOLUTION_REVERSE_SECONDS)) return steps;
      const next = Math.max(0, Math.min(maxSteps, steps + direction));
      if (next !== steps) {
        sinceStep = 0;
        lastDirection = direction;
        suspend();
      }
      return next;
    },
  };
}
