import { describe, expect, it } from 'vitest';
import { PAGE_ASPECT, photoCut } from '../../src/render/crop';

// The chapter's page glues in a photo, not the screen's shape (docs/ux-audit/story-presentation.md row 6).
describe("the page's photo", () => {
  it('is a 3:2 cut on a phone held either way, on the iPad and on a computer', () => {
    for (const [width, height] of [[1688, 780], [780, 1688], [2360, 1640], [1440, 900]] as const) {
      const cut = photoCut(width, height, null);
      expect(Math.abs(cut.width / cut.height - PAGE_ASPECT)).toBeLessThan(0.01);
      expect(cut.x >= 0 && cut.y >= 0 && cut.x + cut.width <= width && cut.y + cut.height <= height).toBe(true);
    }
  });

  it('has Elof a third of the way in from the left, and never cuts past the frame', () => {
    const cut = photoCut(1688, 780, { x: 800, y: 500 });
    expect(800 - cut.x).toBeCloseTo(cut.width / 3, 0);
    expect(photoCut(1688, 780, { x: 20, y: 500 }).x).toBe(0);
    const right = photoCut(1688, 780, { x: 1680, y: 500 });
    expect(right.x + right.width).toBe(1688);
  });

  it('held upright, keeps him a little below the middle, so the sky shows', () => {
    const cut = photoCut(780, 1688, { x: 300, y: 1100 });
    expect(cut.width).toBe(780);
    expect((1100 - cut.y) / cut.height).toBeCloseTo(0.6, 1);
  });
});
