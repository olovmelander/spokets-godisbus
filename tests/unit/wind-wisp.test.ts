import { describe, expect, it } from 'vitest';
import { windWisp } from '../../src/render/wind-wisp';

describe("the mountain's gusts", () => {
  it('are wisps of air, not lines: gone at both ends and at the edges, strongest along the middle', () => {
    const texture = windWisp();
    const { data, width, height } = texture.image as { data: Uint8Array; width: number; height: number };
    const alpha = (x: number, y: number) => data[(y * width + x) * 4 + 3]!;
    let strongest = 0;
    for (let y = 0; y < height; y++) {
      // Both ends fade to nothing, and so do the top and the bottom.
      expect(alpha(0, y)).toBeLessThan(12);
      expect(alpha(width - 1, y)).toBeLessThan(12);
      strongest = Math.max(strongest, alpha(width / 2, y));
    }
    for (let x = 0; x < width; x++) {
      expect(alpha(x, 0)).toBeLessThan(40);
      expect(alpha(x, height - 1)).toBeLessThan(40);
    }
    expect(strongest).toBeGreaterThan(200);
    // White: only its strength changes.
    expect([data[0], data[1], data[2]]).toEqual([255, 255, 255]);
  });
});
