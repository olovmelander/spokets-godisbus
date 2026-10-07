import { describe, expect, it } from 'vitest';
import { JAR, jarHeap, jarShape } from '../../src/render/village';

describe("the sweet shop's jars", () => {
  it('are glass read from its outline: nearly clear facing the camera, bright where it turns away', () => {
    const shape = jarShape();
    const at = shape.getAttribute('position');
    const normal = shape.getAttribute('normal');
    const colour = shape.getAttribute('color');
    expect(colour.itemSize).toBe(4);
    let front = 0, outline = 0;
    for (let i = 0; i < at.count; i++) {
      // The glass above its thicker base; the streaks of light are white.
      if (at.getY(i) < 0.3 || colour.getX(i) >= 1) continue;
      const alpha = colour.getW(i);
      if (Math.abs(normal.getZ(i)) > 0.95) {
        front += 1;
        expect(alpha).toBeLessThan(0.15);
      } else if (Math.abs(normal.getZ(i)) < 0.1) {
        outline += 1;
        expect(alpha).toBeGreaterThan(0.45);
      }
    }
    expect(front).toBeGreaterThan(4);
    expect(outline).toBeGreaterThan(4);
  });

  it('have a body, a shoulder in to a narrower neck, and a rim, standing on the shelf', () => {
    const widest = Math.max(...JAR.map(([r]) => r));
    const top = JAR[JAR.length - 1]!;
    expect(widest).toBeCloseTo(1.8);
    // The neck is narrower than the body.
    expect(Math.min(...JAR.filter(([, y]) => y > 4.8 && y < 5.15).map(([r]) => r))).toBeLessThan(1.4);
    expect(top[1]).toBeLessThan(5.5);
    expect(Math.min(...JAR.map(([, y]) => y))).toBeGreaterThanOrEqual(0);
  });

  it('hold their sweets heaped from the floor, inside the glass and under the shoulder', () => {
    const heap = jarHeap();
    expect(heap).toHaveLength(54);
    for (const sweet of heap) {
      // A sweet is about 0.35 across from its middle: it stays inside the body's 1.8.
      expect(Math.hypot(sweet.x, sweet.z) + 0.35).toBeLessThan(1.8);
      expect(sweet.y).toBeGreaterThan(0.3);
      expect(sweet.y).toBeLessThan(3.9);
    }
    // Fewer in each layer up: a heap, not a block.
    const layers = [...new Set(heap.map((sweet) => sweet.y))].sort((a, b) => a - b);
    const counts = layers.map((y) => heap.filter((sweet) => sweet.y === y).length);
    for (let i = 1; i < counts.length; i++) expect(counts[i]!).toBeLessThan(counts[i - 1]!);
  });
});
