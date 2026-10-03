import type { Held } from '../app/game';
import type { Edges } from '../input/press-queue';
import type { ViewInfo } from '../render/view';
import type { ChapterData, PlayerState } from '../sim/types';

/**
 * ?bench (plan §6.10): the game plays itself for a while, and then shows numbers as plain text that Olov
 * can copy from any device into a session. Until Stage 0b brings the golden frames, it plays the test course.
 */
export interface Bench {
  readonly done: boolean;
  /** True once report() has been called: the text then stays on screen. */
  readonly shown: boolean;
  /** The input for this frame: run back and forth over the course, jumping now and then. */
  play(player: PlayerState, timeMs: number): { held: Held & { y: number }; edges: Edges };
  frame(intervalMs: number, busyMs: number): void;
  report(info: ViewInfo): string;
}

/** The first second is left out: shaders compile and textures upload in it. */
const WARM_UP_MS = 1000;

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

export function createBench(seconds: number, chapter: ChapterData): Bench {
  const intervals: number[] = [];
  const busy: number[] = [];
  let elapsed = 0;
  let done = false;
  let shown = false;
  let direction: 1 | -1 = 1;
  let nextHop = 0;

  return {
    get done() {
      return done;
    },
    get shown() {
      return shown;
    },
    play(player, timeMs) {
      if (player.x > chapter.goalX - 2) direction = -1;
      if (player.x < chapter.spawn.x + 1) direction = 1;
      const hop = timeMs >= nextHop && player.grounded;
      if (hop) nextHop = timeMs + 900;
      return { held: { x: direction, y: 0, hopHeld: true }, edges: { hop, act: false, helper: false } };
    },
    frame(intervalMs, busyMs) {
      if (done) return;
      elapsed += intervalMs;
      if (elapsed < WARM_UP_MS) return;
      intervals.push(intervalMs);
      busy.push(busyMs);
      if (elapsed >= WARM_UP_MS + seconds * 1000) done = true;
    },
    report(info) {
      shown = true;
      const p50 = percentile(intervals, 0.5);
      const p95 = percentile(intervals, 0.95);
      const busy95 = percentile(busy, 0.95);
      // iOS caps the frame rate at 30 in Low Power Mode and when the device is warm (plan §6.5).
      const capped = p50 > 30 && busy95 < 10;
      return [
        'Elof bench, the test course',
        navigator.userAgent,
        `screen ${window.innerWidth}×${window.innerHeight} CSS px · device pixel ratio ${window.devicePixelRatio}`,
        `tier ${info.tier} · canvas ${info.width}×${info.height} · pixel ratio ${info.pixelRatio.toFixed(2)}`,
        `${intervals.length} frames in ${seconds} s · ${p50 > 0 ? Math.round(1000 / p50) : 0} fps`,
        `frame p50 ${p50.toFixed(1)} ms · p95 ${p95.toFixed(1)} ms`,
        `busy p50 ${percentile(busy, 0.5).toFixed(1)} ms · p95 ${busy95.toFixed(1)} ms`,
        capped ? 'The frame rate looks capped at 30: Low Power Mode, or a warm device?' : 'The frame rate does not look capped.',
        `draw calls ${info.drawCalls} · triangles ${info.triangles} · programs ${info.programs}`,
        `models ${info.models.join(', ') || 'none'} · KTX2 textures ${info.compressedTextures}`,
      ].join('\n');
    },
  };
}
