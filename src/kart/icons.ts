/** Godisracet's own drawn emblems: shapes only, no letters, marks or borrowed artwork. */
import type { ItemId } from './sim/kart';

const svg = (body: string, box = '0 0 64 64') => `<svg viewBox="${box}" aria-hidden="true">${body}</svg>`;
const SWEET = (x: number, y: number, s: number, turn = -18) => `<g transform="translate(${x} ${y}) rotate(${turn}) scale(${s})"><path d="M-30 0-17-11v22ZM30 0 17-11v22Z" fill="#f2a93b" stroke="#8a5a1c" stroke-width="2.5" stroke-linejoin="round"/><ellipse rx="19" ry="13" fill="#ffd45e" stroke="#8a5a1c" stroke-width="2.5"/><path d="M-10-5q9-6 19 0" fill="none" stroke="#fff6cf" stroke-width="3" stroke-linecap="round"/></g>`;

export const CROWN = svg('<path d="M12 49 5 13l21 14L40 5l14 22 21-14-7 36Z" fill="#ffd45e" stroke="#7a5320" stroke-width="4" stroke-linejoin="round"/><path d="M12 49h56v10H12Z" fill="#e2a23a"/><circle cx="40" cy="38" r="5" fill="#fff6dc"/>', '0 0 80 64');
/** The paper bag every item comes out of. */
export const BAG = svg('<path d="M14 22h36l4 34H10Z" fill="#fff8ea" stroke="#7a4a2a" stroke-width="3" stroke-linejoin="round"/><path d="M20 22l-2 34M32 22v34M44 22l2 34" stroke="#e5484d" stroke-width="5"/><path d="M14 22l5-9 6 9 7-9 6 9 7-9 5 9Z" fill="#fff8ea" stroke="#7a4a2a" stroke-width="3" stroke-linejoin="round"/>');
export const CANDY = svg(SWEET(32, 32, .95));
export const ITEM_ICONS: Readonly<Record<ItemId, string>> = {
  sweet: svg(SWEET(32, 32, 1)),
  sweets3: svg(SWEET(32, 17, .58, -10) + SWEET(19, 43, .58, -24) + SWEET(45, 43, .58, 6)),
  cone: svg('<path d="M32 6c14 6 20 20 18 32S40 58 32 58 16 50 14 38 18 12 32 6Z" fill="#a8693a" stroke="#5b3518" stroke-width="3"/><path d="M19 24q13 9 26 0M16 36q16 10 32 0M19 47q13 8 26 0M32 8v48" fill="none" stroke="#5b3518" stroke-width="2.5" stroke-linecap="round"/><path d="M28 6q4-6 8 0" fill="none" stroke="#4d7a36" stroke-width="4" stroke-linecap="round"/>'),
  bee: svg('<ellipse cx="22" cy="20" rx="13" ry="9" fill="#e9f6ff" stroke="#5b6f86" stroke-width="2.5" transform="rotate(-24 22 20)"/><ellipse cx="42" cy="18" rx="13" ry="9" fill="#e9f6ff" stroke="#5b6f86" stroke-width="2.5" transform="rotate(24 42 18)"/><ellipse cx="32" cy="38" rx="20" ry="15" fill="#ffd23f" stroke="#3b2c1c" stroke-width="3"/><path d="M26 24.5v27M37 24v28" stroke="#3b2c1c" stroke-width="6"/><circle cx="46" cy="35" r="2.6" fill="#3b2c1c"/><path d="M12 38l-7-2" stroke="#3b2c1c" stroke-width="3" stroke-linecap="round"/>'),
  gum: svg('<path d="M8 46c2-9 9-11 14-10 2-11 20-12 22 0 8-2 13 5 12 11-2 9-46 9-48-1Z" fill="#ff7fb2" stroke="#9b2f62" stroke-width="3" stroke-linejoin="round"/><circle cx="40" cy="20" r="11" fill="#ffc2dc" stroke="#9b2f62" stroke-width="2.5"/><path d="M35 16q3-4 8-3" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>'),
  floss: svg('<path d="M30 40l-6 20" stroke="#c9a56b" stroke-width="5" stroke-linecap="round"/><path d="M14 34c-8-2-9-13-1-16 0-9 12-13 18-7 6-6 19-2 18 8 8 3 7 15-2 16-4 8-28 8-33-1Z" fill="#ffb3d4" stroke="#b34d7f" stroke-width="3" stroke-linejoin="round"/><path d="M22 22q5-5 11-1M34 30q6-4 10 1" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>'),
  rainbow: svg('<path d="M32 36v24" stroke="#f3ead6" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="26" r="21" fill="#ff5d6c" stroke="#7a2a3c" stroke-width="3"/><path d="M32 26m-15 0a15 15 0 1 1 15 15" fill="none" stroke="#ffd23f" stroke-width="6"/><path d="M32 26m-9 0a9 9 0 1 1 9 9" fill="none" stroke="#4fd1a1" stroke-width="5"/><circle cx="32" cy="26" r="3.5" fill="#5aa9ff"/>'),
  cloud: svg('<path d="M14 36c-9-1-10-14-1-16 1-10 14-13 19-5 7-6 19-1 17 9 9 1 9 12 0 13Z" fill="#b9c3d6" stroke="#4b5670" stroke-width="3" stroke-linejoin="round"/><path d="M20 44l-3 9M32 44l-3 9M44 44l-3 9" stroke="#5aa9ff" stroke-width="4" stroke-linecap="round"/>'),
};
/** The order the roulette flicks through while it spins. */
export const ROULETTE_ORDER: readonly ItemId[] = ['sweet', 'cone', 'gum', 'bee', 'floss', 'sweets3', 'cloud', 'rainbow'];
