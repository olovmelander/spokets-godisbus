import { describe, expect, it } from 'vitest';
import { STORY, chapterNumber } from '../../src/content/chapters';
import { MEMORIES, PICTURE_TIME } from '../../src/ui/memory';
import { heightAt, playThrough } from '../robot/robot';

const numbered = STORY.filter((chapter) => chapterNumber(chapter.id) > 0);

describe('the four memories', () => {
  it('lie one in each numbered chapter, as a glowing shaving on the path that he only has to touch', () => {
    for (const chapter of numbered) {
      const spots = (chapter.spots ?? []).filter((spot) => spot.look === 'memory');
      expect(spots, chapter.id).toHaveLength(1);
      expect(spots[0]).toMatchObject({ id: 'memory', touch: true });
      expect(heightAt(chapter, spots[0]!.at.x), chapter.id).toBeCloseTo(spots[0]!.at.y, 5);
    }
    for (const part of STORY) if (chapterNumber(part.id) === 0) expect((part.spots ?? []).some((s) => s.look === 'memory'), part.id).toBe(false);
    expect(Object.keys(MEMORIES).sort()).toEqual(numbered.map((chapter) => chapter.id).sort());
  });

  it('are found by anyone who plays the chapter: the robot touches each one', () => {
    for (const chapter of numbered) expect(playThrough(60, chapter, {}, 400).flags, chapter.id).toContain('memory');
  });

  it('are six to ten seconds long, in three or four pictures', () => {
    for (const [id, pictures] of Object.entries(MEMORIES)) {
      expect(pictures.length, id).toBeGreaterThanOrEqual(3);
      expect((pictures.length * PICTURE_TIME) / 1000, id).toBeGreaterThanOrEqual(6);
      expect((pictures.length * PICTURE_TIME) / 1000, id).toBeLessThanOrEqual(10);
    }
  });

  it('have no words, and end on the little figure: it is in every memory', () => {
    for (const [id, pictures] of Object.entries(MEMORIES)) {
      for (const picture of pictures) {
        expect(picture, id).not.toContain('<text');
        expect(picture.startsWith('<svg') && picture.endsWith('</svg>'), id).toBe(true);
      }
      expect(pictures[pictures.length - 1], id).toContain('class="tragubbe"');
    }
  });

  it('show little Elof in light blue every time, as the plan says', () => {
    for (const [id, pictures] of Object.entries(MEMORIES)) expect(pictures.some((picture) => picture.includes('#9cc4e4')), id).toBe(true);
  });

  it('let Elof understand at the old pine only when he has seen the last one', () => {
    const berget = numbered.find((chapter) => chapter.id === 'berget')!;
    expect(berget.beats).toContainEqual({ id: 'fetch', on: 'memory', who: 'elof', line: 'fetch' });
  });
});
