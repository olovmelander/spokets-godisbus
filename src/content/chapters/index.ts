import type { ChapterData } from '../../sim/types';
import { CHAPTER_IDS, RELEASED_CHAPTER, type ChapterId } from '../world';
import { berget } from './berget';
import { byn } from './byn';
import { epilog, prolog } from './ends';
import { garden } from './garden';
import { granskog } from './granskog';
import { myren } from './myren';
import { norrsken } from './norrsken';
import { testbana } from './testbana';

/**
 * Every course the game can play, by id. The test course is not part of the story: it stays as the place
 * where every move can be tried, and as what the page shows while no chapter is released.
 */
export const COURSES: Record<string, ChapterData> = {
  testbana, prolog, garden, granskog, myren, berget, norrsken, epilog, byn,
};

/**
 * The look-development courses (./look.ts) are a chunk of their own: only `?dev&course=look-…` asks for them, so the
 * players' first download does not carry them. The unit tests put them in at once (tests/setup.ts).
 */
export const LOOK_IDS: readonly string[] = ['look-forest', 'look-deck', 'look-street'];
export function addLookCourses(look: typeof import('./look')): void {
  Object.assign(COURSES, { 'look-forest': look.lookForest, 'look-deck': look.lookDeck, 'look-street': look.lookStreet });
}
export const loadLookCourses = (): Promise<void> => import('./look').then(addLookCourses);

/** The chapters of the story, in order. Each end card leads to the next one that is built. */
export const STORY: ChapterData[] = [prolog, garden, granskog, myren, berget, norrsken, epilog];

/** Extra chapters: they come after the story is over, have no number, and are not on Moa's map. */
export const BONUS: ChapterData[] = [byn];

/** The extra chapter that the story's last card leads on to, or null. */
export function bonusAfter(id: string): ChapterData | null {
  return id === STORY[STORY.length - 1]!.id ? (BONUS[0] ?? null) : null;
}

/**
 * Äventyr 2, Stormnatten (docs/aventyr-2.md), in order. Its chapters are a pack of their own: the ids are known
 * from the start, and the chapters themselves come into ADVENTURE2 (and COURSES) once loadAdventure2() is done.
 */
export const ADVENTURE2_IDS: readonly string[] = ['stormkvall', 'stormgard', 'stormskog', 'stormbyn', 'olympia', 'flarken', 'alven', 'billsta', 'stormoga', 'morgonen'];
export const ADVENTURE2: ChapterData[] = [];
export const isAdventure2 = (id: string): boolean => ADVENTURE2_IDS.includes(id);
/** Byn, the last of the first adventure, leads on to the second. */
const ADVENTURE2_AFTER = 'byn';

/** A loaded pack's chapters become courses like any other. Called by the pack itself, once. */
export function addAdventure2(chapters: readonly ChapterData[]): void {
  for (const chapter of chapters) {
    if (Object.hasOwn(COURSES, chapter.id)) continue;
    COURSES[chapter.id] = chapter;
    ADVENTURE2.push(chapter);
  }
}

let adventure2: Promise<void> | null = null;
/** Fetches and installs Äventyr 2's pack; precached with the rest of the game, so it works offline too. */
export function loadAdventure2(): Promise<void> {
  adventure2 ??= import('../aventyr2/aventyr2').then(() => undefined);
  return adventure2;
}

/** The chapter after this one, or null when it is the last one built. */
export function nextAfter(id: string): ChapterData | null {
  const at = STORY.findIndex((chapter) => chapter.id === id);
  if (at >= 0) return STORY[at + 1] ?? null;
  const on = ADVENTURE2.findIndex((chapter) => chapter.id === id);
  return on >= 0 ? (ADVENTURE2[on + 1] ?? null) : id === ADVENTURE2_AFTER ? (ADVENTURE2[0] ?? null) : null;
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
  ...Object.fromEntries(ADVENTURE2_IDS.map((id) => [id, id as ChapterId])),
};
const COURSE_ALIASES: Record<string, string> = { myr: 'myren', berg: 'berget', final: 'norrsken' };
export const courseId = (id: string): string => Object.hasOwn(COURSE_ALIASES, id) ? COURSE_ALIASES[id]! : id;

/** One release boundary for links, saves, codes and chapter selection. Debug alone never opens a chapter. */
export function courseAvailable(params: URLSearchParams, id: string, released: ChapterId | null = RELEASED_CHAPTER): boolean {
  const canonical = courseId(id);
  if (!Object.hasOwn(COURSES, canonical) && !isAdventure2(canonical) && !LOOK_IDS.includes(canonical)) return false;
  if (canonical === 'testbana' || params.has('dev')) return true;
  const stable = RELEASE_IDS[canonical];
  return released !== null && stable !== undefined && CHAPTER_IDS.indexOf(stable) <= CHAPTER_IDS.indexOf(released);
}

/** Which course a page plays (plan §4.9); an unavailable URL/save falls back to the released beginning. */
export function courseFor(params: URLSearchParams, saved: string | null = null, released: ChapterId | null = RELEASED_CHAPTER): ChapterData {
  const asked = params.get('course');
  // Äventyr 2 is there only once its pack has loaded (loadAdventure2).
  const loaded = (id: string) => Object.hasOwn(COURSES, courseId(id));
  if (asked && courseAvailable(params, asked, released) && loaded(asked)) return COURSES[courseId(asked)]!;
  // A development save is retained on the device, but never opens unreleased work in the public game.
  if (saved && courseAvailable(params, saved, released) && courseId(saved) !== 'testbana' && loaded(saved)) return COURSES[courseId(saved)]!;
  return courseAvailable(params, 'prolog', released) ? prolog : testbana;
}

/** The end card's destination. Bonus and look-development courses have no public release ID; Byn leads on to Äventyr 2. */
export function nextAvailable(id: string, params: URLSearchParams, released: ChapterId | null = RELEASED_CHAPTER): ChapterData | null {
  const here = courseId(id);
  // Where Byn is not open (a public release), the story's last card leads straight on to Äventyr 2.
  const ways = [nextAfter(here) ?? bonusAfter(here), here === STORY[STORY.length - 1]!.id ? ADVENTURE2[0] : undefined];
  return ways.find((way): way is ChapterData => !!way && courseAvailable(params, way.id, released)) ?? null;
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
