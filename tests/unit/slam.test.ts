import { expect, it } from 'vitest';
import { slamAt } from '../../src/sim/sim';

it('rests at each stop, gathers speed, and bangs into the other: never past either, and the same each cycle', () => {
  const at = Array.from({ length: 1001 }, (_, i) => slamAt(i / 1000));
  expect(Math.min(...at)).toBe(0);
  expect(Math.max(...at)).toBe(1);
  expect(slamAt(0.05)).toBe(0);
  expect(slamAt(0.55)).toBe(1);
  // Fastest just before it arrives: the last hundredth of the way out goes further than the first tenth.
  expect(slamAt(0.5 - 1e-3) - slamAt(0.49)).toBeGreaterThan(slamAt(0.16) - slamAt(0.12));
  // No jump anywhere along the way.
  for (let i = 1; i < at.length; i++) expect(Math.abs(at[i]! - at[i - 1]!)).toBeLessThan(0.02);
  expect(slamAt(1.3)).toBeCloseTo(slamAt(0.3), 10);
});
