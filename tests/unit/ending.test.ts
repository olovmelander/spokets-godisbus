import { describe, expect, it } from 'vitest';
import { EndingClock } from '../../src/ui/ending';

describe('the post-credit window shot', () => {
  it('starts once and rings once at the painted eyes blink', () => {
    const clock = new EndingClock();
    expect(clock.start()).toBe(true);
    const bells: number[] = [];
    for (let i = 0; i < 200; i++) if (clock.tick(1 / 60)) bells.push(clock.seconds!);
    expect(bells).toHaveLength(1);
    expect(bells[0]).toBeCloseTo(1.2, 1);
    expect(clock.start()).toBe(false);
  });
  it('does not jump ahead during a hidden/recovery pause and leaves the eyes open on dismissal', () => {
    const clock = new EndingClock();
    expect(clock.tick(10)).toBe(false);
    clock.start();
    clock.tick(1 / 60);
    const before = clock.seconds;
    clock.tick(0);
    expect(clock.seconds).toBe(before);
    clock.finish();
    expect(clock.seconds).toBeGreaterThanOrEqual(3);
    expect(clock.start()).toBe(false);
  });
});
