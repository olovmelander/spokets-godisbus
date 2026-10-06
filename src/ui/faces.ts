import type { Speaker } from '../sim/types';

/**
 * A small face for each speaker, beside what they say (docs/ux-audit/in-play.md row 16): a shirt in the colour of
 * the person's sign (src/render/props.ts), a head and hair. Plain shapes, like the sharing panel's portraits, and
 * no likeness of anyone.
 */
const person = (shirt: string, hair: string, extra = '') =>
  `<path d="M13 62V42q20-15 42 0v20" fill="${shirt}"/><circle cx="34" cy="24" r="18" fill="#dfb586"/>` +
  `<path d="M16 23Q12 2 34 2t18 23L42 13l-13 4-9-2z" fill="${hair}"/>${extra}`;

const FACES: Record<Speaker, string> = {
  // Mamma's sign is white with a red heart.
  mamma: person('#f1ece2', '#7a5739', '<path d="M34 55l-6-6q-3-4 1-6q3-1 5 2q2-3 5-2q4 2 1 6z" fill="#bf3d36"/>'),
  pappa: person('#5a7d4a', '#544137'),
  moa: person('#5b7fb5', '#b79668'),
  // Bertil's sign is his cap.
  bertil: person('#8a7a4a', '#976e46', '<path d="M15 19q2-16 19-16t19 16z" fill="#d98a2c"/><path d="M48 18h14v4H46z" fill="#d98a2c"/>'),
  elof: person('#2f5f9e', '#e0b84a'),
  spoket: '<path d="M14 55V26q0-23 20-23t20 23v29l-8-5-8 5-8-5-8 5z" fill="#e7d4a6"/><circle cx="27" cy="23" r="3"/><circle cx="40" cy="23" r="3"/>',
};

export const faceSvg = (who: Speaker): string => `<svg viewBox="0 0 68 64" aria-hidden="true">${FACES[who]}</svg>`;
/** The same faces, as the inside of a 68×64 picture: for the sharing panel's family. */
export const faceBody = (who: Speaker): string => FACES[who];
