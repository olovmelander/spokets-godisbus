import { describe, expect, it } from 'vitest';
import { AUTO_MEASURE, QUALITY_WARMUP, createAutoTier } from '../../src/render/quality';

function measure(busy: number, hz = 60) {
  const auto = createAutoTier();
  for (let n = 0; n < (QUALITY_WARMUP + AUTO_MEASURE + 0.2) * hz; n++) auto.feed(1 / hz, busy);
  return auto;
}

describe('Auto measures warmed CPU work on a safe screen', () => {
  it.each([30, 60, 120])('%i Hz with idle time chooses High, regardless of the callback cap', (hz) => {
    expect(measure(3, hz).tier).toBe('high');
  });
  it('chooses all three levels from work, not the display interval', () => {
    expect(measure(7).tier).toBe('high');
    expect(measure(10).tier).toBe('mid');
    expect(measure(20).tier).toBe('low');
  });
  it('ignores shader/loading warmup and isolated long callbacks', () => {
    const auto = createAutoTier();
    for (let n = 0; n < 180; n++) auto.feed(1 / 60, n < 30 || n === 70 ? 100 : 3);
    expect(auto.tier).toBe('high');
  });
  it('does not cross a tier during play or after a settled decision', () => {
    const auto = measure(3);
    expect(auto.settled).toBe(true);
    auto.suspend();
    for (let n = 0; n < 1000; n++) auto.feed(1 / 30, 29);
    expect(auto.tier).toBe('high');
  });
  it('discards partial measurements across loading, hidden or paused-to-play transitions', () => {
    const auto = createAutoTier();
    for (let n = 0; n < 120; n++) auto.feed(1 / 60, 25);
    auto.suspend();
    for (let n = 0; n < 180; n++) auto.feed(1 / 60, 3);
    expect(auto.tier).toBe('high');
  });
  it.each([[0, 2], [Number.NaN, 2], [3, 2], [1 / 60, Number.NaN], [1 / 60, -1]])('rejects elapsed %s / busy %s instead of counting a resume gap', (dt, busy) => {
    const auto = createAutoTier();
    for (let n = 0; n < 100; n++) auto.feed(dt!, busy!);
    expect(auto.settled).toBe(false);
    expect(auto.tier).toBe('mid');
  });
});
