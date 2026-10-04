import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { myren } from '../../src/content/chapters/myren';
import { berget } from '../../src/content/chapters/berget';
import { thoughtAt } from '../../src/render/ghost-thought';
import type { ChapterData } from '../../src/sim/types';

const stop = (chapter: ChapterData, index = chapter.ghost!.findIndex((perch) => perch.thought)) => {
  const at = chapter.ghost![index]!.at;
  return { ...at, perch: index, t: 1, gone: false };
};
const nearby = (chapter: ChapterData) => ({ x: stop(chapter).x - 3, y: stop(chapter).y });

describe('the ghost learns to show what it wants', () => {
  it('leaves the garden visit as its existing smudge', () => {
    for (const [i, perch] of garden.ghost!.entries()) {
      expect(perch.thought).toBeUndefined();
      expect(thoughtAt(garden, stop(garden, i), new Set(['ladybird', 'placed:rescue', 'home']), perch.at)).toBeNull();
    }
  });

  it('shows only a mountain after the forest rescue, at both final waiting stops', () => {
    for (const [i, perch] of granskog.ghost!.entries()) {
      if (!perch.thought) {
        expect(thoughtAt(granskog, stop(granskog, i), new Set(['placed:rescue']), perch.at)).toBeNull();
        continue;
      }
      expect(thoughtAt(granskog, stop(granskog, i), new Set(['jay', 'beat:thanked']), perch.at)).toBeNull();
      expect(thoughtAt(granskog, stop(granskog, i), new Set(['placed:rescue']), perch.at)).toBe('mountain');
      expect(perch.at.x).toBeGreaterThan(188.2);
    }
  });

  it('keeps the pine and crack private until the crane chick is brought home', () => {
    const ghost = stop(myren);
    for (const flags of [[], ['light'], ['light', 'chick'], ['beat:spangen']]) {
      expect(thoughtAt(myren, ghost, new Set(flags), nearby(myren))).toBeNull();
    }
    expect(thoughtAt(myren, ghost, new Set(['home']), nearby(myren))).toBe('pine-crack');
  });

  it('shows the returned doorway picture only beside its discovered keepsake, without relocating the ghost', () => {
    const player = { x: 64.4, y: 10 };
    const waitingBelow = { x: 69, y: 0, perch: 8, t: 1, gone: false };
    expect(thoughtAt(granskog, waitingBelow, new Set(['vittra:gift', 'vittra:gift:away']), player)).toBeNull();
    expect(thoughtAt(granskog, waitingBelow, new Set(['keepsake:vittra']), player)).toBe('small-figure');
    expect(waitingBelow).toMatchObject({ x: 69, y: 0, perch: 8 });
    expect(thoughtAt(granskog, waitingBelow, new Set(['keepsake:vittra']), { x: 69, y: 0 })).toBeNull();
    expect(thoughtAt(granskog, null, new Set(['keepsake:vittra']), player)).toBe('small-figure');
  });

  it('shows the lonely figure below the final cliff before Lift, and clears it immediately afterwards', () => {
    const ghost = stop(berget);
    expect(berget.ghost![ghost.perch]!.until).toBe('lift');
    expect(thoughtAt(berget, ghost, new Set(), nearby(berget))).toBe('lonely-figure');
    expect(thoughtAt(berget, ghost, new Set(['lift']), nearby(berget))).toBeNull();
    expect(berget.spots!.find((spot) => spot.id === 'lift')!.at.y).toBe(ghost.y);
  });

  it('does not display a thought from a destination perch while hopping, leaving or far away', () => {
    const ghost = stop(berget);
    expect(thoughtAt(berget, { ...ghost, t: 0.8 }, new Set(), nearby(berget))).toBeNull();
    expect(thoughtAt(berget, { ...ghost, gone: true }, new Set(), nearby(berget))).toBeNull();
    expect(thoughtAt(berget, ghost, new Set(), { x: ghost.x - 6, y: ghost.y })).toBeNull();
    expect(thoughtAt(berget, ghost, new Set(), { x: ghost.x, y: ghost.y - 6 })).toBeNull();
    expect(thoughtAt(berget, null, new Set(), nearby(berget))).toBeNull();
  });

  it('allocates at most one kind of picture for each authored chapter and never at the earlier perches', () => {
    for (const chapter of [granskog, myren, berget]) {
      const perches = chapter.ghost!;
      expect(new Set(perches.flatMap((perch) => perch.thought ? [perch.thought.picture] : [])).size).toBe(1);
      expect(perches.findIndex((perch) => perch.thought)).toBeGreaterThan(5);
    }
  });
});
