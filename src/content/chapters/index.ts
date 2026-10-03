import type { ChapterData } from '../../sim/types';
import { berget } from './berget';
import { garden } from './garden';
import { granskog } from './granskog';
import { lookDeck, lookForest } from './look';
import { myren } from './myren';
import { norrsken } from './norrsken';
import { testbana } from './testbana';

/**
 * Every course the game can play, by id. The test course is not part of the story: it stays as the place
 * where every move can be tried, and as what the page shows while no chapter is released.
 */
export const COURSES: Record<string, ChapterData> = { testbana, garden, granskog, myren, berget, norrsken, 'look-forest': lookForest, 'look-deck': lookDeck };

/** The chapters of the story, in order. Each end card leads to the next one that is built. */
export const STORY: ChapterData[] = [garden, granskog, myren, berget, norrsken];

/** The chapter after this one, or null when it is the last one built. */
export function nextAfter(id: string): ChapterData | null {
  const at = STORY.findIndex((chapter) => chapter.id === id);
  return at >= 0 ? (STORY[at + 1] ?? null) : null;
}

/** The chapters that have a number, in order. The final has a name instead. */
const NUMBERED: ChapterData[] = [garden, granskog, myren, berget];

/** "Kapitel N": a chapter's number, or 0 for the final and for a course outside the story. */
export function chapterNumber(id: string): number {
  return NUMBERED.findIndex((chapter) => chapter.id === id) + 1;
}

/**
 * Which course a page plays (plan §4.9).
 * - `?course=<id>` plays that one.
 * - `?dev` plays the story's chapters, released or not: the one the saved game is in, or the first.
 * - Otherwise: the test course, until a chapter is released. A release is `RELEASED_CHAPTER` in `world.ts`,
 *   and then the title and the saved game decide.
 */
export function courseFor(params: URLSearchParams, saved: string | null = null): ChapterData {
  const asked = params.get('course');
  if (asked && COURSES[asked]) return COURSES[asked];
  if (!params.has('dev')) return testbana;
  return STORY.find((chapter) => chapter.id === saved) ?? garden;
}
