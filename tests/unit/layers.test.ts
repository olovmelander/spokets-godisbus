import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import type { ChapterData } from '../../src/sim/types';

/**
 * How much of each chapter has a second level laid over it (docs/level-design.md §3). A side way is a run of
 * ledges and of rings off the main way, each within a jump or a throw of the next. Its length is the stretch
 * of the trail it lies over.
 *
 * The numbers below are the chapters as they stand, rounded down: a floor, so that a change can add a side
 * way and never quietly lose one. `rings` are the rings off the main way, and `ways` the hidden sweets that
 * are reached by a way of their own.
 */
const FLOOR: Record<string, { sideWays: number; length: number; rings: number; sweets: number }> = {
  garden: { sideWays: 3, length: 36, rings: 5, sweets: 2 },
  granskog: { sideWays: 2, length: 26, rings: 3, sweets: 2 },
  myren: { sideWays: 3, length: 28, rings: 3, sweets: 2 },
  berget: { sideWays: 2, length: 47, rings: 6, sweets: 2 },
  byn: { sideWays: 1, length: 19, rings: 2, sweets: 0 },
};
/**
 * Pieces further apart than this belong to two ways. Inside a way the widest gap is 1.4 EL, between two
 * swings; the nearest two ways, on Berget, are 3.4 EL apart.
 */
const APART = 2.5;
/** How far a swing carries him to each side of its ring. */
const SWING = 1.5;

export function sideWays(chapter: ChapterData): { from: number; to: number }[] {
  const pieces = [
    ...(chapter.ledges ?? []).map((ledge) => ({ from: ledge.x - ledge.width / 2, to: ledge.x + ledge.width / 2 })),
    ...(chapter.hooks ?? []).filter((hook) => hook.extra).map((hook) => ({ from: hook.x - SWING, to: hook.x + SWING })),
  ].sort((a, b) => a.from - b.from);
  const ways: { from: number; to: number }[] = [];
  for (const piece of pieces) {
    const last = ways.at(-1);
    if (last && piece.from - last.to < APART) last.to = Math.max(last.to, piece.to);
    else ways.push({ ...piece });
  }
  // A run of rings with no ledge in it is a chain over the trail's own swing, not a level of its own.
  const ledges = chapter.ledges ?? [];
  return ways.filter((way) => ledges.some((ledge) => ledge.x >= way.from && ledge.x <= way.to));
}

describe('the second level over each chapter', () => {
  for (const chapter of [...STORY, ...BONUS]) {
    const floor = FLOOR[chapter.id];
    if (!floor) continue;
    it(`${chapter.id}: no fewer side ways, rings and sweets with a way than it had, and no shorter`, () => {
      const ways = sideWays(chapter);
      const length = ways.reduce((sum, way) => sum + way.to - way.from, 0);
      const whole = chapter.goalX - chapter.spawn.x;
      const rings = (chapter.hooks ?? []).filter((hook) => hook.extra).length;
      const sweets = (chapter.hidden ?? []).filter((sweet) => sweet.way !== undefined).length;
      const what = `${ways.length} side ways over ${length.toFixed(1)} EL of ${whole.toFixed(0)} (${((100 * length) / whole).toFixed(0)} %): ${ways.map((way) => `${way.from.toFixed(0)}–${way.to.toFixed(0)}`).join(', ')}; ${rings} rings off the main way; ${sweets} sweets with a way`;
      console.log(`layers ${chapter.id}: ${what}`);
      expect(ways.length, what).toBeGreaterThanOrEqual(floor.sideWays);
      expect(length, what).toBeGreaterThanOrEqual(floor.length);
      expect(rings, what).toBeGreaterThanOrEqual(floor.rings);
      expect(sweets, what).toBeGreaterThanOrEqual(floor.sweets);
    });
  }

  it('the lace is in every chapter he walks through: a ring hangs in each of them', () => {
    for (const id of ['garden', 'granskog', 'myren', 'berget', 'byn']) {
      const chapter = [...STORY, ...BONUS].find((one) => one.id === id)!;
      expect((chapter.hooks ?? []).length, id).toBeGreaterThan(0);
    }
  });

  it('every side way has a heart or a lollipop on it: its tell', () => {
    for (const chapter of [...STORY, ...BONUS]) {
      for (const way of sideWays(chapter)) {
        const on = (chapter.side ?? []).filter((candy) => candy.x >= way.from - 0.5 && candy.x <= way.to + 0.5);
        expect(on.length, `${chapter.id}, the way from ${way.from.toFixed(1)} to ${way.to.toFixed(1)}`).toBeGreaterThan(0);
      }
    }
  });

  it('a ring off the main way hangs from something: a cord from above, or a line strung over it', () => {
    for (const chapter of [...STORY, ...BONUS]) {
      // The swing chain's two nails in Gården are in the deck's boards, right over them.
      const nails = chapter.id === 'garden' ? 2 : 0;
      const hung = (chapter.hooks ?? []).filter((hook) => hook.extra && (hook.hangs !== undefined || (chapter.lines ?? []).some((line) => hook.x > Math.min(line.from.x, line.to.x) && hook.x < Math.max(line.from.x, line.to.x))));
      expect(hung.length, chapter.id).toBe((chapter.hooks ?? []).filter((hook) => hook.extra).length - nails);
    }
  });
});
