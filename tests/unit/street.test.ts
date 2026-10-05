import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { DOOR_WIDE, STREET_DEPTH, WINDOW_WIDE, drawnTogether, uprights } from '../../src/render/village';
import type { ChapterData } from '../../src/sim/types';

/** The chapters of the village that say what stands behind their street. */
const STREETS = Object.values(COURSES).filter((chapter) => chapter.street !== undefined);

/** Where a chapter's street ends: at the shop's door, where the room begins, or with its ground. */
const streetEnd = (chapter: ChapterData) => chapter.shop?.door ?? chapter.ground[chapter.ground.length - 1]!.x;

/** What must be seen clearly along a street: each big candy (the checkpoints and the one at the goal) and each hook's ring. */
function marks(chapter: ChapterData): { what: string; x: number }[] {
  const end = streetEnd(chapter);
  return [
    ...(chapter.checkpoints ?? []).map((at) => ({ what: 'the big candy', x: at.x })),
    { what: 'the big candy at the goal', x: chapter.goalX + 0.6 },
    ...(chapter.hooks ?? []).map((hook) => ({ what: 'the hook', x: hook.x })),
  ].filter((mark) => mark.x < end);
}

/** How much plain wall a big candy or a ring has at each side of it, when he stands at it. */
const CLEAR = 1.5;

/** Whether a colour written as '#rrggbb' is a red: red is the candy's and the hook's (docs/art-bible.md §2.2). */
function red(colour: string): boolean {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16)) as [number, number, number];
  return r > 110 && r > g * 1.8 && r > b * 1.8;
}

describe('the village street', () => {
  it('is said by the village and by its golden frame', () => {
    expect(STREETS.map((chapter) => chapter.id).sort()).toEqual(['byn', 'look-street']);
    for (const chapter of STREETS) expect(chapter.place, chapter.id).toBe('village');
  });

  it('has exactly one thing behind every x: its stretches follow one another with no gap and nothing twice', () => {
    for (const chapter of STREETS) {
      const parts = chapter.street!;
      expect(parts[0]!.from, chapter.id).toBeLessThanOrEqual(chapter.ground[0]!.x);
      expect(parts[parts.length - 1]!.to, chapter.id).toBe(streetEnd(chapter));
      for (const [i, part] of parts.entries()) {
        expect(part.to, `${chapter.id}: the stretch from ${part.from}`).toBeGreaterThan(part.from);
        if (i > 0) expect(part.from, `${chapter.id}: the stretch from ${part.from}`).toBe(parts[i - 1]!.to);
      }
    }
  });

  it('keeps a yard far off, and stands every far stretch one step over the road', () => {
    for (const chapter of STREETS) {
      for (const part of chapter.street!) {
        if (part.kind === 'yard') expect(part.depth, `${chapter.id}: the yard from ${part.from}`).toBe('far');
        // The far side's foot is said, not read from the ground: the ground's far pavement is not built yet.
        if (part.depth === 'far') expect(part.foot, `${chapter.id}: the far stretch from ${part.from}`).toBeDefined();
        if (part.kind === 'house') {
          expect(part.wall, `${chapter.id}: the house from ${part.from}`).toMatch(/^#[0-9a-f]{6}$/);
          expect(part.boards).toBeDefined();
          expect(part.goods).toBeDefined();
        }
      }
    }
    expect(STREET_DEPTH.near).toBeGreaterThan(STREET_DEPTH.far);
    // A near wall is behind the play plane, clear of everything that stands on the path.
    expect(STREET_DEPTH.near).toBeLessThanOrEqual(-6);
  });

  it('draws a near house by itself and the whole far side of a crossing at once', () => {
    // One draw call a house, as before the kit: the far side is all in sight together, so it is one.
    expect(drawnTogether(COURSES['byn']!.street!)).toEqual([[0], [1, 2], [3], [4]]);
    expect(drawnTogether(COURSES['look-street']!.street!)).toEqual([[0], [1], [2]]);
    for (const chapter of STREETS) expect(drawnTogether(chapter.street!).flat(), chapter.id).toEqual(chapter.street!.map((_, i) => i));
  });

  it("gives each window and door the kit's own width, inside its house and clear of the next opening", () => {
    for (const chapter of STREETS) {
      for (const part of chapter.street!) {
        if (part.kind !== 'house') continue;
        const openings = [...(part.windows ?? []), ...(part.door ? [part.door] : [])].sort((a, b) => a.from - b.from);
        for (const w of part.windows ?? []) expect(w.to - w.from, `${chapter.id}: the window at ${w.from}`).toBeCloseTo(WINDOW_WIDE[part.goods!], 6);
        if (part.door) expect(part.door.to - part.door.from, `${chapter.id}: the door at ${part.door.from}`).toBeCloseTo(DOOR_WIDE, 6);
        for (const [i, opening] of openings.entries()) {
          // A casing of 1 EL at each side, and the wall's end or another casing beyond it.
          expect(opening.from - 1, `${chapter.id}: the opening at ${opening.from}`).toBeGreaterThanOrEqual(i > 0 ? openings[i - 1]!.to + 1 : part.from);
          expect(opening.to + 1, `${chapter.id}: the opening at ${opening.from}`).toBeLessThanOrEqual(part.to);
        }
        for (const x of [...(part.pipes ?? []), ...(part.sign !== undefined ? [part.sign] : []), ...(part.cellar !== undefined ? [part.cellar] : [])]) {
          expect(x > part.from && x < part.to, `${chapter.id}: what stands at ${x}`).toBe(true);
        }
      }
    }
  });

  it('stands no upright part of a near wall behind a big candy or a hook', () => {
    for (const chapter of STREETS) {
      const parts = chapter.street!;
      expect(marks(chapter).length, chapter.id).toBeGreaterThan(1);
      for (const [i, part] of parts.entries()) {
        if (part.depth !== 'near') continue;
        // A corner board, a casing, a door, a pipe or a sign: each is a strong upright line or shape.
        for (const upright of uprights(parts, i)) {
          for (const mark of marks(chapter)) {
            const apart = Math.max(upright.from - mark.x, mark.x - upright.to);
            expect(apart, `${chapter.id}: the ${upright.what} at ${upright.from} to ${upright.to} behind ${mark.what} at ${mark.x}`).toBeGreaterThanOrEqual(CLEAR);
          }
        }
      }
    }
  });

  it("hangs every hook's ring before plain wall: no shop window is behind it", () => {
    for (const chapter of STREETS) {
      for (const hook of (chapter.hooks ?? []).filter((one) => one.x < streetEnd(chapter))) {
        const behind = chapter.street!.find((part) => hook.x >= part.from && hook.x < part.to)!;
        expect(behind, `${chapter.id}: the hook at ${hook.x}`).toBeDefined();
        // A ring hangs at a window's height, and a window is the brightest thing on a wall.
        for (const w of behind.windows ?? []) expect(Math.max(w.from - hook.x, hook.x - w.to), `${chapter.id}: the hook at ${hook.x}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("keeps red for the candy and the hook: at most one red house, far off, and no hook before it", () => {
    for (const chapter of STREETS) {
      const reds = chapter.street!.filter((part) => part.wall !== undefined && red(part.wall));
      expect(reds.length, chapter.id).toBeLessThanOrEqual(1);
      for (const part of reds) {
        expect(part.depth, `${chapter.id}: the red house from ${part.from}`).toBe('far');
        for (const hook of chapter.hooks ?? []) expect(hook.x < part.from - 6 || hook.x > part.to + 6, `${chapter.id}: the hook at ${hook.x}`).toBe(true);
      }
    }
    expect(red('#8f2d22')).toBe(true);
    for (const calm of ['#efe6c8', '#e9e6dc', '#e3b24c', '#9a968c']) expect(red(calm), calm).toBe(false);
  });
});
