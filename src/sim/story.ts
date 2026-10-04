/** Small, authored interactions. Their unfinished UI state is never a saved reward. */
export type StoryKind = 'share' | 'paint' | 'carve';
export interface StoryAction { kind: StoryKind; spot: string }
export const SWEETS = ['gelehallon', 'karamell', 'skumbanan', 'lingon'] as const;
export type Sweet = (typeof SWEETS)[number];
export const FRIENDS = ['tragubbe', 'spoket', 'jay'] as const;
export type Friend = (typeof FRIENDS)[number];
export type StoryAnswer = { kind: 'share'; friend: Friend; sweet: Sweet }
  | { kind: 'paint'; traces: readonly (readonly import('./story-stroke').StrokePoint[])[] }
  | { kind: 'carve'; stroke: readonly import('./story-stroke').StrokePoint[] };

/** Wildlife gets a berry from his pocket, never candy; nobody loses a collected sweet. */
export function sharingReward(flags: ReadonlySet<string>, friend: Friend, sweet: Sweet): string[] | null {
  if (!flags.has('bag') || !FRIENDS.includes(friend) || !SWEETS.includes(sweet) || flags.has(`share:${friend}`)) return null;
  if ((friend === 'jay') !== (sweet === 'lingon')) return null;
  return [`share:${friend}`, `gift:${friend}:${sweet}`];
}
