import { sv } from '../sv';
import { AT, DRAWING, MAP_STATES, PICTURE, type MapState } from '../../ui/map';

/**
 * Moa's map of Äventyr 2 (docs/aventyr-2.md): the storm's long way, in her crayon, as she would draw it for her
 * little brother. Home, the forest and the village; Olympia's pitch; north up the valley to the lake at Flärken;
 * then down the river, all the way to Billsta. Drawn round 0 0 like the first adventure's places, and nothing of
 * the real map: the places lie roughly as a child knows them, never measured.
 */

const crayon = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';

/** The places, keyed by the chapter each belongs to, so that the release boundary hides the ones not yet open. */
const ROUTE = ['stormkvall', 'stormskog', 'stormbyn', 'olympia', 'flarken', 'alven', 'billsta'] as const;

const PLACES: Record<(typeof ROUTE)[number], { at: { x: number; y: number }; name: string; picture: string }> = {
  stormkvall: { at: { x: 40, y: 108 }, name: 'Hemma', picture: PICTURE.home! },
  stormskog: { at: { x: 96, y: 92 }, name: 'Skogen', picture: PICTURE.forest! },
  stormbyn: { at: { x: 148, y: 112 }, name: 'Byn', picture: DRAWING.shop },
  // The pitch: a goal and the ball.
  olympia: {
    at: { x: 196, y: 82 }, name: 'Olympia',
    picture: `<path d="M-16 10v-18h32v18" ${crayon} stroke="#f2f0ea" stroke-width="3"/><path d="M-12 10v-14h24v14" ${crayon} stroke="#9aa4a8" stroke-width="1.4" stroke-dasharray="2 2"/><circle cx="8" cy="7" r="5" fill="#f2f0ea" stroke="#2a2a2a" stroke-width="1.6"/><path d="M8 4v.01M5 8v.01M11 8v.01" ${crayon} stroke="#2a2a2a" stroke-width="2.4"/>`,
  },
  // The lake, north up the valley, with its diving tower.
  flarken: {
    at: { x: 230, y: 22 }, name: 'Flärken',
    picture: `<path d="M-22 8c6-5 10 5 16 0s10 5 16 0 8 4 12 0" ${crayon} stroke="#3f8fc4" stroke-width="3"/><path d="M6 6v-20h10v20M6-8h10M6-14h10" ${crayon} stroke="#8a6a4c" stroke-width="2.4"/>`,
  },
  // The river running south again, past home and down to the big lake.
  alven: {
    at: { x: 286, y: 96 }, name: 'Älven',
    picture: `<path d="M-20-10c8 4 4 10 12 12s6 8 16 8M-14-12c8 4 4 10 12 12s6 8 16 8" ${crayon} stroke="#3f8fc4" stroke-width="2.8"/><path d="M10-6h8" ${crayon} stroke="#7b5a36" stroke-width="3"/>`,
  },
  // Mormor and morfar's white house with its two gables, and a heart.
  billsta: {
    at: { x: 344, y: 132 }, name: 'Billsta',
    picture: `<path d="M-18 10v-14l9-8 9 8 9-8 9 8v14z" fill="#f2f0ea" stroke="#6a6e74" stroke-width="2" stroke-linejoin="round"/><path d="M-10 2h5M5 2h5" ${crayon} stroke="#f4c542" stroke-width="3"/><path d="M20-18c-3-4-8 0-4 4l4 4 4-4c4-4-1-8-4-4z" fill="#dd4b39"/>`,
  },
};

/** What the map shows in each of Äventyr 2's chapters: the places drawn so far, and where he is. */
const REACHED: Record<string, { upTo: (typeof ROUTE)[number]; here: (typeof ROUTE)[number] }> = {
  stormkvall: { upTo: 'stormkvall', here: 'stormkvall' },
  stormgard: { upTo: 'stormkvall', here: 'stormkvall' },
  stormskog: { upTo: 'stormskog', here: 'stormskog' },
  stormbyn: { upTo: 'stormbyn', here: 'stormbyn' },
  olympia: { upTo: 'olympia', here: 'olympia' },
  flarken: { upTo: 'flarken', here: 'flarken' },
  alven: { upTo: 'alven', here: 'alven' },
  billsta: { upTo: 'billsta', here: 'billsta' },
  stormoga: { upTo: 'billsta', here: 'billsta' },
  morgonen: { upTo: 'billsta', here: 'stormkvall' },
};

/** Puts Moa's second map into the game's map (src/ui/map.ts). */
export function installMap(): void {
  for (const [id, place] of Object.entries(PLACES)) {
    AT[id] = place.at;
    PICTURE[id] = place.picture;
    (sv.map as Record<string, string>)[id] = place.name;
  }
  for (const [chapter, { upTo, here }] of Object.entries(REACHED)) {
    const state: MapState = { drawn: ROUTE.slice(0, ROUTE.indexOf(upTo) + 1), here, ghost: null, route: [...ROUTE] };
    MAP_STATES.set(chapter, state);
  }
}
