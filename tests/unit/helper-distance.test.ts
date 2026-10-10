import { Group, type Mesh } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { helperProp } from '../../src/render/props';
import { GHOST_CLEARANCE } from '../../src/sim/constants';
import type { HelpState } from '../../src/sim/types';

beforeEach(() => {
  const context = Object.fromEntries(['beginPath', 'ellipse', 'fill'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

const away: HelpState = { step: 0, at: null, verb: null, word: null };

describe('the garden ghost helps without being caught', () => {
  it.each([false, true])('stays beyond reach through arrivals, pursuit, jumps, restore and departure (calm=%s)', calm => {
    const helper = helperProp(garden, new Group());
    const hint: HelpState = { step: 1, at: { x: 63.5, y: 3.3 }, verb: null, word: null, visit: true };
    // Stay, run toward it, jump up, then restore across the level while its entrance/fade is unfinished.
    for (let i = 0; i < 150; i++) {
      const x = i < 90 ? 60 + i * 0.15 : 135;
      const y = i < 90 ? Math.max(0, Math.sin(i / 10) * 3) : 6;
      helper.update(i < 130 ? hint : away, x, y, 0, i / 60, 1 / 60, calm);
      if (helper.active) {
        expect(Math.hypot(helper.actor.position.x - x, helper.actor.position.y - y)).toBeGreaterThanOrEqual(GHOST_CLEARANCE);
        expect(helper.actor.position.x).toBeGreaterThan(x);
      }
    }
  });

  it('marks the real hint and demonstrates its hook while the ghost stays above Elof', () => {
    const helper = helperProp(garden, new Group());
    const at = garden.hooks![1]!;
    const hint: HelpState = { step: 3, at, verb: 'lace', word: null };
    helper.update(hint, at.x, at.y, 0, 1, 1, true);
    const ring = helper.group.getObjectByName('helper-focus') as Mesh;
    expect(ring.visible).toBe(true);
    expect(ring.position.x).toBe(at.x);
    expect(ring.position.y).toBe(at.y);
    expect(helper.group.getObjectByName('helper-demo-0')!.visible).toBe(true);
    expect(helper.group.getObjectByName('helper-demo-lace')!.visible).toBe(true);
    const before = helper.actor.position.clone();
    helper.update(hint, at.x, at.y, 0, 1, 0, true);
    expect(helper.actor.position.equals(before)).toBe(true);
    helper.update(away, at.x, at.y, 0, 1, 1, true);
    expect(ring.visible).toBe(false);
    expect(helper.active).toBe(false);
  });

  it('keeps the jay perched over its actual hint', () => {
    const helper = helperProp(granskog);
    const at = { x: 38, y: 1 };
    helper.update({ ...away, step: 1, at }, 36, 0, 0, 1, 1, true);
    expect(helper.actor.position.x).toBeCloseTo(at.x - 0.1);
    expect(helper.actor.position.y).toBeCloseTo(at.y + 1.6);
    expect(helper.group.getObjectByName('helper-focus')).toBeUndefined();
  });
});
