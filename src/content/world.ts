/** Stable chapter IDs (plan §4.9). "Kapitel N" is computed from the released order and never stored. */
export const CHAPTER_IDS = ['prolog', 'garden', 'granskog', 'forsen', 'myr', 'berg', 'final', 'epilog'] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

/**
 * The last released chapter. Raising it IS the release (CLAUDE.md).
 * null: nothing is released yet, and the page shows Stage 0a's test course.
 */
export const RELEASED_CHAPTER: ChapterId | null = null;
