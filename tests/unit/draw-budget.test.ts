import { describe, expect, it } from 'vitest';
import { TIERS } from '../../src/render/quality';
import { DRAW_CALLS, withinDraws } from '../browser/budget.mjs';

describe('the draw-call budget', () => {
  it('has a number for every tier, and a richer tier never has less room', () => {
    expect(Object.keys(DRAW_CALLS).sort()).toEqual([...TIERS].sort());
    for (let i = 1; i < TIERS.length; i++) expect(DRAW_CALLS[TIERS[i]!]).toBeGreaterThanOrEqual(DRAW_CALLS[TIERS[i - 1]!]);
  });

  it('keeps Low where every tier was: an older phone gets no heavier picture than before', () => {
    expect(DRAW_CALLS.low).toBe(120);
  });

  it('holds a picture of unknown tier to Low: nothing passes by not saying what it measured', () => {
    expect(withinDraws(DRAW_CALLS.low)).toBe(true);
    expect(withinDraws(DRAW_CALLS.low + 1)).toBe(false);
    expect(withinDraws(DRAW_CALLS.low + 1, 'no such tier')).toBe(false);
    expect(withinDraws(DRAW_CALLS.high, 'high')).toBe(true);
    expect(withinDraws(DRAW_CALLS.high + 1, 'high')).toBe(false);
    expect(withinDraws(DRAW_CALLS.mid + 1, 'mid')).toBe(false);
  });
});
