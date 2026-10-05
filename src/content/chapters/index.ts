import type { ChapterData } from '../../sim/types';
import { CHAPTER_IDS, RELEASED_CHAPTER, type ChapterId } from '../world';
import { berget } from './berget';
import { byn } from './byn';
import { epilog, prolog } from './ends';
import { garden } from './garden';
import { granskog } from './granskog';
import { lookDeck, lookForest, lookStreet } from './look';
import { myren } from './myren';
import { norrsken } from './norrsken';
import { testbana } from './testbana';

/**
 * Every course the game can play, by id. The test course is not part of the story: it stays as the place
 * where every move can be tried, and as what the page shows while no chapter is released.
 */
export const COURSES: Record<string, ChapterData> = {
  testbana, prolog, garden, granskog, myren, berget, norrsken, epilog, byn, 'look-forest': lookForest, 'look-deck': lookDeck, 'look-street': lookStreet,
};

/** The chapters of the story, in order. Each end card leads to the next one that is built. */
export const STORY: ChapterData[] = [prolog, garden, granskog, myren, berget, norrsken, epilog];

/** Extra chapters: they come after the story is over, have no number, and are not on Moa's map. */
export const BONUS: ChapterData[] = [byn];

/** The extra chapter that the story's last card leads on to, or null. */
export function bonusAfter(id: string): ChapterData | null {
  return id === STORY[STORY.length - 1]!.id ? (BONUS[0] ?? null) : null;
}

/** The chapter after this one, or null when it is the last one built. */
export function nextAfter(id: string): ChapterData | null {
  const at = STORY.findIndex((chapter) => chapter.id === id);
  return at >= 0 ? (STORY[at + 1] ?? null) : null;
}

/** The chapters that have a number, in order. The prologue, the final and the epilogue have names instead. */
const NUMBERED: ChapterData[] = [garden, granskog, myren, berget];

/** "Kapitel N": a chapter's number, or 0 for the final and for a course outside the story. */
export function chapterNumber(id: string): number {
  return NUMBERED.findIndex((chapter) => chapter.id === id) + 1;
}

/** The authored course names used by existing saves, and the plan's stable release IDs. */
const RELEASE_IDS: Record<string, ChapterId> = {
  prolog: 'prolog', garden: 'garden', granskog: 'granskog', myren: 'myr', berget: 'berg',
  norrsken: 'final', epilog: 'epilog',
};
const COURSE_ALIASES: Record<string, string> = { myr: 'myren', berg: 'berget', final: 'norrsken' };
export const courseId = (id: string): string => Object.hasOwn(COURSE_ALIASES, id) ? COURSE_ALIASES[id]! : id;

/** One release boundary for links, saves, codes and chapter selection. Debug alone never opens a chapter. */
export function courseAvailable(params: URLSearchParams, id: string, released: ChapterId | null = RELEASED_CHAPTER): boolean {
  const canonical = courseId(id);
  if (!Object.hasOwn(COURSES, canonical)) return false;
  if (canonical === 'testbana' || params.has('dev')) return true;
  const stable = RELEASE_IDS[canonical];
  return released !== null && stable !== undefined && CHAPTER_IDS.indexOf(stable) <= CHAPTER_IDS.indexOf(released);
}

/** Which course a page plays (plan §4.9); an unavailable URL/save falls back to the released beginning. */
export function courseFor(params: URLSearchParams, saved: string | null = null, released: ChapterId | null = RELEASED_CHAPTER): ChapterData {
  const asked = params.get('course');
  if (asked && courseAvailable(params, asked, released)) return COURSES[courseId(asked)]!;
  // A development save is retained on the device, but never opens unreleased work in the public game.
  if (saved && courseAvailable(params, saved, released) && courseId(saved) !== 'testbana') return COURSES[courseId(saved)]!;
  return courseAvailable(params, 'prolog', released) ? prolog : testbana;
}

/** The end card's destination. Bonus and look-development courses have no public release ID. */
export function nextAvailable(id: string, params: URLSearchParams, released: ChapterId | null = RELEASED_CHAPTER): ChapterData | null {
  const following = nextAfter(courseId(id)) ?? bonusAfter(courseId(id));
  return following && courseAvailable(params, following.id, released) ? following : null;
}

/** Replace an old explicit course and discard inspection seeds when entering a different chapter. */
export function courseQuery(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  next.set('course', courseId(id));
  next.delete('at');
  next.delete('flags');
  next.delete('title');
  return `?${next.toString()}`;
}
