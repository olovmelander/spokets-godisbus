// The drawn pictures the panels share: plain shapes, no logotypes and no brand marks (plan §0). Shared here so
// that the shell, the photo viewer and Utforska vidare draw the same ✕ and the same arrows (docs/ux-audit/menus.md
// row 4), whatever the system's fonts would make of typed symbols.
export const svg = (body: string, box = '0 0 24 24') => `<svg viewBox="${box}" aria-hidden="true">${body}</svg>`;
export const line = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

/** Close: the panel's ✕. */
export const CROSS = svg(`<path d="M6 6l12 12M18 6 6 18" ${line} stroke-width="2.6"/>`);
/** Back, to the page this one was opened from. */
export const BACK = svg(`<path d="M20 12H5m0 0 6-6m-6 6 6 6" ${line} stroke-width="2.4"/>`);
/** The photo viewer's way to the photo before and after this one. */
export const PREVIOUS = svg(`<path d="M15 5l-7 7 7 7" ${line} stroke-width="2.8"/>`);
export const NEXT = svg(`<path d="M9 5l7 7-7 7" ${line} stroke-width="2.8"/>`);
export const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${line} stroke-width="2.8"/>`);
