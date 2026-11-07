import { describe, expect, it } from 'vitest';
import { stroke, wingbeat } from '../../src/render/wingbeat';

describe('wingbeat', () => {
  it('spends 60% of a beat on the downstroke', () => {
    let down = 0;
    const n = 1000;
    for (let i = 0; i < n; i++) if (stroke((i + 1) / n) < stroke(i / n)) down++;
    expect(down / n).toBeCloseTo(0.6, 1);
  });

  it('starts and ends each beat with the wings up, and is lowest at the end of the downstroke', () => {
    expect(stroke(0)).toBeCloseTo(1);
    expect(stroke(0.6)).toBeCloseTo(-1);
    expect(stroke(0.999)).toBeCloseTo(1, 2);
  });

  it('glides with the wings held a little under level, and never jumps', () => {
    const rhythm = { every: 6, glide: 1.6, held: -0.15 };
    expect(wingbeat(5.2, 1.1, rhythm).glide).toBe(1);
    expect(wingbeat(5.2, 1.1, rhythm).lift).toBeCloseTo(-0.15);
    expect(wingbeat(2, 1.1, rhythm).glide).toBe(0);
    let last = wingbeat(0, 1.1, rhythm).lift;
    for (let t = 0.005; t < 14; t += 0.005) {
      const lift = wingbeat(t, 1.1, rhythm).lift;
      expect(Math.abs(lift - last)).toBeLessThan(0.05);
      last = lift;
    }
  });

  it('beats without a pause when it is told not to glide', () => {
    for (let t = 0; t < 10; t += 0.37) expect(wingbeat(t, 1, { every: 0 }).glide).toBe(0);
  });
});
