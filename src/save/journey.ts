import type { PlayerSave } from './store';

/** The ending stays finished when its chapter is played again. */
export function storyFinished(flags: PlayerSave['flags']): boolean {
  return flags.epilog?.includes('goal') ?? false;
}

/** The live goal resets on load; its saved completion must survive the next autosave. */
export function rememberFlags(previous: readonly string[], live: ReadonlySet<string>): string[] {
  return [...new Set([...live, ...(previous.includes('goal') ? ['goal'] : [])])];
}

/** A visit changes the active chapter, never its candy, puzzles, memories or remembered safe places. */
export function visitChapter(save: PlayerSave, id: string, fromStart = false): PlayerSave {
  const checkpoints = { ...save.checkpoints, [save.chapter]: Math.max(save.checkpoints?.[save.chapter] ?? -1, save.checkpoint) };
  return { ...save, chapter: id, checkpoint: fromStart ? -1 : (checkpoints[id] ?? -1), checkpoints };
}

/** Explicit course URLs must not keep sending chapter navigation back to the chapter just left. */
export function chapterQuery(params: URLSearchParams, id: string): string {
  const next = new URLSearchParams(params);
  next.set('course', id);
  for (const key of ['at', 'flags', 'title']) next.delete(key);
  return next.toString();
}
