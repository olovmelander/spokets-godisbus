/** The ?debug overlay: numbers a session or Olov can read off the screen of any device (plan §6.14). */
export interface Debug {
  /** Call once per frame with the time since the last frame and the time this frame spent working. */
  frame(intervalMs: number, busyMs: number, now: number, lines: () => string[]): void;
}

const KEEP = 240;

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))]!;
}

export function createDebug(el: HTMLElement): Debug {
  const intervals: number[] = [];
  const busy: number[] = [];
  let shownAt = -Infinity;
  el.hidden = false;
  return {
    frame(intervalMs, busyMs, now, lines) {
      intervals.push(intervalMs);
      busy.push(busyMs);
      if (intervals.length > KEEP) intervals.shift();
      if (busy.length > KEEP) busy.shift();
      if (now - shownAt < 250) return;
      shownAt = now;
      const p50 = percentile(intervals, 0.5);
      el.textContent = [
        `${p50 > 0 ? Math.round(1000 / p50) : 0} fps · frame p50 ${p50.toFixed(1)} p95 ${percentile(intervals, 0.95).toFixed(1)} ms`,
        `busy p50 ${percentile(busy, 0.5).toFixed(1)} p95 ${percentile(busy, 0.95).toFixed(1)} ms`,
        ...lines(),
      ].join('\n');
    },
  };
}
