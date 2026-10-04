import { describe, expect, it } from 'vitest';
import { PIXEL_CAP, chooseTier, pixelRatioFor, tierFromQuery } from '../../src/render/quality';

describe('the pixel budget', () => {
  it('never draws more pixels than the tier allows', () => {
    // An iPad in landscape, with a device pixel ratio of 2.
    for (const tier of ['low', 'mid', 'high'] as const) {
      const ratio = pixelRatioFor(tier, 1180, 820, 2);
      expect(1180 * 820 * ratio * ratio).toBeLessThanOrEqual(PIXEL_CAP[tier] * 1.0001);
    }
  });

  it('never goes above the screen\'s own pixel ratio, or above 2', () => {
    expect(pixelRatioFor('high', 400, 300, 1)).toBe(1);
    expect(pixelRatioFor('high', 400, 300, 3)).toBe(2);
  });

  it('gives a phone held sideways its full sharpness on High', () => {
    // 844×390 at a ratio of 2 is 1.3 million pixels, inside High's 2.6 million.
    expect(pixelRatioFor('high', 844, 390, 3)).toBe(2);
    expect(pixelRatioFor('low', 844, 390, 3)).toBeLessThan(2);
  });
});

describe('choosing a tier', () => {
  it('reads ?tier=, and treats anything else as Auto', () => {
    expect(tierFromQuery('high')).toBe('high');
    expect(tierFromQuery('low')).toBe('low');
    expect(tierFromQuery('ultra')).toBeNull();
    expect(tierFromQuery(null)).toBeNull();
  });

  it('starts Auto in Mid', () => {
    expect(chooseTier(null, true)).toBe('mid');
  });

  it.each(['low', 'mid', 'high'] as const)('honours a supported %s choice at startup or in settings', (tier) => {
    expect(chooseTier(tier, true)).toBe(tier);
  });

  it.each([null, 'low', 'mid', 'high'] as const)('keeps %s on Low when float colour buffers are unavailable', (tier) => {
    expect(chooseTier(tier, false)).toBe('low');
  });
});
