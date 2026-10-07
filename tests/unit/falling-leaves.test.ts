import type { BufferAttribute, Mesh } from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { effects, FALLING_BIRCH } from '../../src/render/dressing/effects';

// The effects draw their one picture on a canvas: here a canvas that draws nothing will do.
const context = new Proxy({}, {
  get: (_, key) => (key === 'createLinearGradient' || key === 'createRadialGradient' ? () => ({ addColorStop() {} }) : () => {}),
  set: () => true,
});
const real = (globalThis as { document?: unknown }).document;
beforeAll(() => { (globalThis as { document?: unknown }).document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) }; });
afterAll(() => { (globalThis as { document?: unknown }).document = real; });

const byn = COURSES['byn']!;

/** What falls and flies, as the effects draw it: each card's middle, width and opacity. */
function falling(where: 'village' | 'forest', chapter = byn) {
  const { group, update } = effects(chapter, -20, 200, where);
  const life = group.children.find((child) => child.renderOrder === -0.5) as Mesh | undefined;
  const read = () => {
    if (!life) return [];
    const at = life.geometry.getAttribute('position') as BufferAttribute, colour = life.geometry.getAttribute('color') as BufferAttribute;
    return Array.from({ length: at.count / 4 }, (_, i) => {
      const xs = [0, 1, 2, 3].map((k) => at.getX(i * 4 + k)), zs = [0, 1, 2, 3].map((k) => at.getZ(i * 4 + k));
      return { x: xs.reduce((a, b) => a + b) / 4, z: zs.reduce((a, b) => a + b) / 4, span: Math.max(...xs) - Math.min(...xs), alpha: colour.getW(i * 4) };
    });
  };
  return { update, read };
}

describe('the birch leaves falling in the village', () => {
  it('are a few at a time, as big as those on the street, and fall behind the path', () => {
    const { update, read } = falling('village');
    update(60, 0, 3.7);
    const cards = read();
    expect(cards.length).toBe(FALLING_BIRCH.count);
    const seen = cards.filter((card) => card.alpha > 0);
    expect(seen.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.z).toBeLessThan(-0.8);
      expect(card.z).toBeGreaterThan(-4.2);
      expect(card.span).toBeLessThanOrEqual(2 * Math.hypot(FALLING_BIRCH.long, FALLING_BIRCH.wide) + 1e-6);
    }
    expect(Math.max(...cards.map((card) => card.span))).toBeGreaterThan(FALLING_BIRCH.long);
  });

  it('never fall indoors, in the shop, nor at all with reduced motion', () => {
    const { update, read } = falling('village');
    update(byn.shop!.door + 18, byn.shop!.floor, 3.7);
    expect(read().every((card) => card.alpha === 0)).toBe(true);
    update(60, 0, 5.1, true);
    expect(read().every((card) => card.alpha === 0)).toBe(true);
  });

  it('leave the forest its own needles and small leaves', () => {
    const { update, read } = falling('forest', COURSES['granskog']!);
    update(60, 0, 3.7);
    const cards = read();
    expect(cards.length).toBeGreaterThanOrEqual(5);
    expect(Math.max(...cards.slice(0, 5).map((card) => card.span))).toBeLessThan(0.2);
  });
});
