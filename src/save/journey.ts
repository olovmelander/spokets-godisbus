import { collectionReceipts } from '../content/collections';
import { courseQuery } from '../content/chapters';
import type { PlayerSave } from './store';

/**
 * The ending stays finished when its chapter is played again: the first adventure's, or the second's (Morgonen efter),
 * whose last card leads back to the map of the chapters as the first's does.
 */
export function storyFinished(flags: PlayerSave['flags']): boolean {
  return (flags.epilog?.includes('goal') ?? false) || (flags.morgonen?.includes('goal') ?? false);
}

/** The name is a story discovery, carried into every later visit. */
export function ghostNamed(flags: PlayerSave['flags']): boolean {
  return flags.epilog?.includes('beat:named') ?? false;
}

/** Permanent completion and naming survive a save of this visit's live story state. */
export function rememberFlags(previous: readonly string[], live: ReadonlySet<string>, chapter = ''): string[] {
  return [...new Set([...live, ...collectionReceipts(chapter, [...previous,...live]), ...previous.filter(flag => flag === 'goal' || flag === 'beat:named')])];
}

/** A visit changes the active chapter, never its candy, puzzles, memories or remembered safe places. */
export function visitChapter(save: PlayerSave, id: string, fromStart = false): PlayerSave {
  const checkpoints = { ...save.checkpoints, [save.chapter]: Math.max(save.checkpoints?.[save.chapter] ?? -1, save.checkpoint) };
  return { ...save, chapter: id, checkpoint: fromStart ? -1 : (checkpoints[id] ?? -1), checkpoints };
}

/** Discoveries belong to the collection; interaction flags and completed scenes belong to this playthrough. */
const permanentFlag = (flag: string): boolean =>
  ['goal', 'beat:named', 'memory', 'dewsong', 'heard:cobbles'].includes(flag)
  || ['found:', 'lost:', 'keepsake:', 'memory:', 'note:'].some(prefix => flag.startsWith(prefix));

/**
 * An explicit choice in Utforska vidare starts a fresh playable chapter. Collected sweets, discoveries and
 * furthest safe places remain; only this chapter's story state and placed puzzle pieces start over.
 * Materialize older keepsake/memory discoveries before their original story triggers are removed.
 */
export function exploreChapter(save: PlayerSave, id: string): PlayerSave {
  const visit = visitChapter(save, id, true);
  const previous = save.flags[id] ?? [];
  const flags = [...new Set([...previous.filter(permanentFlag), ...collectionReceipts(id, previous)])];
  return { ...visit, placed: { ...visit.placed, [id]: [] }, flags: { ...visit.flags, [id]: flags } };
}

/** Explicit course URLs must not keep sending chapter navigation back to the chapter just left. */
export function chapterQuery(params: URLSearchParams, id: string): string {
  return courseQuery(params, id).slice(1);
}
