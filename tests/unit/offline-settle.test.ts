import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { waitUntilSettled } from '../../src/platform/offline';

/**
 * A start pressed while a new version downloads waits for it (src/platform/offline.ts, src/main.ts `keepStart`): Olov,
 * 13 November 2026, heard half of Äventyr 1's lines without their voices, because his device played on with the
 * version from before the recordings. The wait ends once nothing has been downloading for a moment, or at its limit.
 */
describe('a start that waits for a new version', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(0); });
  afterEach(() => { vi.useRealTimers(); });

  it('goes at once, after the grace, when nothing downloads', () => {
    const go = vi.fn();
    waitUntilSettled(() => false, go, { grace: 1500, every: 250 });
    vi.advanceTimersByTime(1250);
    expect(go).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(go).toHaveBeenCalledOnce();
  });

  it('waits while a download runs, and a moment after it, for the title to put the version in place', () => {
    let busy = true;
    const go = vi.fn();
    waitUntilSettled(() => busy, go, { grace: 1500, every: 250 });
    vi.advanceTimersByTime(10000);
    expect(go).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(1000);
    expect(go).not.toHaveBeenCalled();
    // A vote to put it in place makes it busy again: no start under it.
    busy = true;
    vi.advanceTimersByTime(3000);
    expect(go).not.toHaveBeenCalled();
    busy = false;
    vi.advanceTimersByTime(2000);
    expect(go).toHaveBeenCalledOnce();
  });

  it('never keeps him waiting past its limit, and goes only once', () => {
    const go = vi.fn();
    waitUntilSettled(() => true, go, { limit: 45000, every: 250 });
    vi.advanceTimersByTime(44000);
    expect(go).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(go).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60000);
    expect(go).toHaveBeenCalledOnce();
  });
});
