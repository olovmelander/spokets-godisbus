/** Godiscupen: the four courses in order, points for each race, and the most points at the end wins. */
import { TRACK_IDS, type TrackId } from './courses';
import type { RacerId } from './kart';

/** Points for first to eighth place in one race. */
export const CUP_POINTS = [10, 8, 6, 5, 4, 3, 2, 1] as const;
export interface Cup {
  /** Which of the cup's races is on, from 0. */
  index: number;
  points: Partial<Record<RacerId, number>>;
  /** The order of the race last scored, best first. */
  last: RacerId[];
  over: boolean;
}

export function createCup(): Cup { return { index: 0, points: {}, last: [], over: false }; }
export const cupTrack = (cup: Cup): TrackId => TRACK_IDS[Math.min(cup.index, TRACK_IDS.length - 1)]!;

/** Adds one finished race to the cup. The last course's race ends it. */
export function scoreRace(cup: Cup, order: readonly { id: RacerId }[]): void {
  if (cup.over) return;
  order.forEach((entry, place) => { cup.points[entry.id] = (cup.points[entry.id] ?? 0) + (CUP_POINTS[place] ?? 0); });
  cup.last = order.map(entry => entry.id);
  cup.over = cup.index >= TRACK_IDS.length - 1;
}
/** On to the next course, if there is one. */
export function nextRace(cup: Cup): boolean {
  if (cup.over || cup.index >= TRACK_IDS.length - 1) return false;
  cup.index++;
  return true;
}
/** The standings: most points first; level on points, the better place in the latest race is ahead. */
export function cupTable(cup: Cup): { id: RacerId; points: number }[] {
  return cup.last.map(id => ({ id, points: cup.points[id] ?? 0 })).sort((a, b) => b.points - a.points || cup.last.indexOf(a.id) - cup.last.indexOf(b.id));
}
