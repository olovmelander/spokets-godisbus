import type { Speaker } from '../sim/types';
import { storyPortrait } from './story-illustrations';
import { ownIds } from './svg-ids';

/** The same drawn family as the story pages, with the game models' hair, clothes and glasses. */
export const FACES: Partial<Record<Speaker, string>> = {
  mamma: storyPortrait('mamma'),
  pappa: storyPortrait('pappa'),
  moa: storyPortrait('moa'),
  bertil: storyPortrait('bertil'),
  elof: storyPortrait('elof'),
  spoket: '<path d="M14 55V26q0-23 20-23t20 23v29l-8-5-8 5-8-5-8 5z" fill="#e7d4a6"/><circle cx="27" cy="23" r="3"/><circle cx="40" cy="23" r="3"/>',
};

// Each face put into the page has its own gradient ids: a bubble, the story line and a panel can hold the same face (svg-ids.ts).
export const faceSvg = (who: Speaker): string => `<svg viewBox="0 0 68 64" aria-hidden="true">${ownIds(FACES[who] ?? '')}</svg>`;
/** The same faces, as the inside of a 68×64 picture: for the sharing panel's family. */
export const faceBody = (who: Speaker): string => ownIds(FACES[who] ?? '');
