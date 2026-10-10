import type { IconId } from './sprite';

// The drawn pictures the panels share: plain shapes, no logotypes and no brand marks (plan §0). The drawings
// themselves are in sprite.ts, which Vite puts into the page once (vite.config.ts); here each is only a reference to
// its symbol, so that every panel draws the same ✕ and the same arrows whatever the system's fonts would make of a
// typed symbol (docs/ux-audit/style-and-sound.md row 13).
export const svg = (body: string, box = '0 0 24 24') => `<svg viewBox="${box}" aria-hidden="true">${body}</svg>`;
export const line = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

/** One drawn icon from the sprite, in the ink of what it sits on. `box` keeps a picture's own shape where the page
 *  sizes it by its width alone. */
export const use = (id: IconId, cls = '', box = '') =>
  `<svg class="i${cls ? ` ${cls}` : ''}"${box ? ` viewBox="${box}"` : ''} aria-hidden="true"><use href="#i-${id}"/></svg>`;

/** Close: the panel's ✕. */
export const CROSS = use('close');
/** Back, to the page this one was opened from. */
export const BACK = use('back');
/** The photo viewer's way to the photo before and after this one. */
export const PREVIOUS = use('previous');
export const NEXT = use('next');
export const CHECK = use('check');
export const AGAIN = use('again');
