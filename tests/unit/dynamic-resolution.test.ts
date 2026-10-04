import { describe, expect, it } from 'vitest';
import {
  PIXEL_CAP, RESOLUTION_REVERSE_SECONDS, RESOLUTION_STEP_SECONDS,
  createDynamicResolution, maxResolutionSteps, pixelRatioFor,
} from '../../src/render/quality';

function run(seconds: number, busy: (time: number) => number, hz = 60) {
  const resolution = createDynamicResolution();
  let steps = 0;
  const changes: { at: number; steps: number }[] = [];
  for (let frame = 0; frame < seconds * hz; frame++) {
    const at = frame / hz;
    const next = resolution.feed(1 / hz, busy(at), steps, 13);
    if (next !== steps) changes.push({ at, steps: next });
    steps = next;
  }
  return { steps, changes };
}

describe('conservative dynamic resolution', () => {
  it('does not confuse idle time in a capped 30 Hz frame with overload', () => {
    expect(run(60, () => 3, 30).changes).toEqual([]);
  });
  it('sustained overload lowers one step at a time and spaces target reallocations', () => {
    const { changes } = run(30, () => 22);
    expect(changes.length).toBeGreaterThan(2);
    expect(changes.length).toBeLessThanOrEqual(9);
    for (let i = 1; i < changes.length; i++) {
      expect(changes[i]!.steps - changes[i - 1]!.steps).toBe(1);
      expect(changes[i]!.at - changes[i - 1]!.at).toBeGreaterThanOrEqual(RESOLUTION_STEP_SECONDS);
    }
  });
  it('can reduce resolution when visible frames consistently exceed 250 ms', () => {
    const resolution = createDynamicResolution();
    let steps = 0;
    for (let n = 0; n < 40; n++) steps = resolution.feed(0.4, 275, steps, 13);
    expect(steps).toBeGreaterThan(0);
    expect(steps).toBeLessThanOrEqual(3);
  });
  it('recovers slowly and never reverses direction sooner than the hysteresis', () => {
    const { changes } = run(45, (at) => at < 12 ? 24 : 2);
    const firstRecovery = changes.findIndex((change, i) => i > 0 && change.steps < changes[i - 1]!.steps);
    expect(firstRecovery).toBeGreaterThan(0);
    expect(changes[firstRecovery]!.at - changes[firstRecovery - 1]!.at).toBeGreaterThanOrEqual(RESOLUTION_REVERSE_SECONDS);
    expect(changes.at(-1)!.steps).toBe(0);
  });
  it('does not oscillate on alternating short bursts or medium steady work', () => {
    const burst = run(60, (at) => Math.floor(at) % 2 ? 3 : 21).changes;
    // A busy half of every second may justify one small reduction, but must not create a resize loop.
    expect(burst.length).toBeLessThanOrEqual(1);
    expect(run(60, () => 10).changes).toEqual([]);
  });
  it('isolated busy frames do not cause a resize', () => {
    expect(run(60, (at) => Math.floor(at * 60) % 180 === 0 ? 100 : 3).changes).toEqual([]);
  });
  it('does not count suspension or a resume gap as proof of load or recovery', () => {
    const resolution = createDynamicResolution();
    for (let n = 0; n < 120; n++) expect(resolution.feed(1 / 60, 25, 0, 13)).toBe(0);
    resolution.suspend();
    expect(resolution.feed(60, 25, 0, 13)).toBe(0);
    for (let n = 0; n < 60; n++) expect(resolution.feed(1 / 60, 25, 0, 13)).toBe(0);
  });
  it('stops at its bound under unrelenting work and cannot exceed the tier pixel cap', () => {
    expect(run(120, () => 22).steps).toBe(13);
    for (const tier of ['low', 'mid', 'high'] as const) {
      for (const [w, h, dpr] of [[844, 390, 3], [1180, 820, 2], [3840, 2160, 2]]) {
        const max = pixelRatioFor(tier, w!, h!, dpr!);
        for (let steps = 0; steps <= 100; steps++) {
          const ratio = pixelRatioFor(tier, w!, h!, dpr!, steps);
          expect(ratio * ratio * w! * h!).toBeLessThanOrEqual(PIXEL_CAP[tier] + 0.001);
          expect(ratio).toBeGreaterThanOrEqual(Math.min(max, 0.65));
          expect(ratio).toBeLessThanOrEqual(max);
        }
        expect(pixelRatioFor(tier, w!, h!, dpr!, 1)).toBeCloseTo(max - (maxResolutionSteps(max) > 0 ? 0.1 : 0));
      }
    }
  });
});
