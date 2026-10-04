import type { PlayerState } from '../sim/types';

/** Authored album frames, in story order. Only game renders can enter this collection. */
export const PHOTO_MOMENTS = ['shrinking', 'swing', 'plane', 'cap', 'crane', 'aurora', 'carving'] as const;
export type PhotoMoment = (typeof PHOTO_MOMENTS)[number];
export const isPhotoMoment = (id: unknown): id is PhotoMoment => PHOTO_MOMENTS.includes(id as PhotoMoment);

const moments: { id: PhotoMoment; chapter: string; flag?: string; mode?: PlayerState['mode']; delay: number }[] = [
  { id: 'shrinking', chapter: 'prolog', flag: 'star', delay: 0.55 },
  { id: 'swing', chapter: 'garden', mode: 'swing', delay: 0.25 },
  { id: 'plane', chapter: 'garden', flag: 'moa', mode: 'ride', delay: 1.5 },
  { id: 'cap', chapter: 'granskog', flag: 'cap', mode: 'ride', delay: 1.5 },
  { id: 'crane', chapter: 'berget', flag: 'flight', mode: 'ride', delay: 2 },
  { id: 'aurora', chapter: 'norrsken', flag: 'taste', delay: 2.8 },
  { id: 'carving', chapter: 'epilog', flag: 'dots', delay: 0.3 },
];

/** Let the picture settle during play. Loading an old flag must not take a picture of the wrong place. */
export function createPhotoMoments(chapter: string, initial: ReadonlySet<string>) {
  const pending = moments.filter((moment) => moment.chapter === chapter && !(moment.flag && initial.has(moment.flag)))
    .map((moment) => ({ ...moment, elapsed: 0, done: false }));
  return (state: Pick<PlayerState, 'mode'>, flags: ReadonlySet<string>, dt: number): PhotoMoment | null => {
    if (dt <= 0) return null;
    for (const moment of pending) {
      if (moment.done) continue;
      if ((moment.flag && !flags.has(moment.flag)) || (moment.mode && state.mode !== moment.mode)) {
        moment.elapsed = 0;
        continue;
      }
      moment.elapsed += dt;
      if (moment.elapsed >= moment.delay) {
        moment.done = true;
        return moment.id;
      }
    }
    return null;
  };
}
