import type { ChapterData } from '../../sim/types';
import { garden } from './garden';
import { testbana } from './testbana';

/**
 * Every course the game can play, by id. The test course is not part of the story: it stays as the place
 * where every move can be tried, and as what the page shows while no chapter is released.
 */
export const COURSES: Record<string, ChapterData> = { testbana, garden };

/**
 * Which course a page plays (plan §4.9).
 * - `?course=<id>` plays that one.
 * - `?dev` plays the newest chapter in work, released or not.
 * - Otherwise: the test course, until a chapter is released. A release is `RELEASED_CHAPTER` in `world.ts`,
 *   and then the title and the saved game decide.
 */
export function courseFor(params: URLSearchParams): ChapterData {
  const asked = params.get('course');
  if (asked && COURSES[asked]) return COURSES[asked];
  return params.has('dev') ? garden : testbana;
}
