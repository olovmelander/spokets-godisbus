/** Small, authored interactions. Their unfinished UI state is never a saved reward. */
export type StoryKind = 'share' | 'party' | 'paint' | 'carve';
export interface StoryAction { kind: StoryKind; spot: string }
export const SWEETS = ['gelehallon', 'karamell', 'skumbanan', 'lingon'] as const;
export type Sweet = (typeof SWEETS)[number];
export type Candy = Exclude<Sweet, 'lingon'>;
export const FRIENDS = ['tragubbe', 'spoket', 'jay'] as const;
export type Friend = (typeof FRIENDS)[number];
export const PARTY_GUESTS = ['mamma', 'pappa', 'moa', 'bertil', 'spoket'] as const;
export type PartyGuest = (typeof PARTY_GUESTS)[number];
export type StoryAnswer = { kind: 'share'; friend: Friend; sweet: Sweet }
  | { kind: 'party'; friend: PartyGuest; sweet: Candy }
  | { kind: 'paint'; traces: readonly (readonly import('./story-stroke').StrokePoint[])[] }
  | { kind: 'carve'; stroke: readonly import('./story-stroke').StrokePoint[] };

/** Wildlife gets a berry from his pocket, never candy; nobody loses a collected sweet. */
export function sharingReward(flags: ReadonlySet<string>, friend: Friend, sweet: Sweet): string[] | null {
  if (!flags.has('bag') || !FRIENDS.includes(friend) || !SWEETS.includes(sweet) || flags.has(`share:${friend}`)) return null;
  if ((friend === 'jay') !== (sweet === 'lingon')) return null;
  return [`share:${friend}`, `gift:${friend}:${sweet}`];
}

/** Every family member likes every candy; the ghost's piece goes into its carved bag. */
export function partyReward(flags: ReadonlySet<string>, friend: PartyGuest, sweet: Sweet): string[] | null {
  if (!PARTY_GUESTS.includes(friend) || !SWEETS.includes(sweet) || sweet === 'lingon' || flags.has(`party:${friend}`)) return null;
  return [`party:${friend}`, `party-gift:${friend}:${sweet}`];
}
