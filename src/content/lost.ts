/**
 * Hittegods (plan §4.8, O2): four small things lost under the deck in Kapitel 1. To someone as small as a
 * wooden figure each is a find as big as his head. Their names are in `sv.lost`.
 * Finding one sets the flag `lost:<thing>` in its chapter, which the save keeps.
 */
export const LOST = ['marble', 'clip', 'brick', 'coin'] as const;
export type LostThing = (typeof LOST)[number];

export const lostFlag = (thing: string) => `lost:${thing}`;

/** The things found so far, read from a save's flags for every chapter, in the list's own order. */
export function lostFound(flags: Record<string, readonly string[]>): LostThing[] {
  const found = new Set(Object.values(flags).flat());
  return LOST.filter((thing) => found.has(lostFlag(thing)));
}
