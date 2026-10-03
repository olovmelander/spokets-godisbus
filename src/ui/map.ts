import { sv } from '../content/sv';

/**
 * Moas karta (plan §4.9): a crayon drawing of the route, on a chapter's card and in the pause panel. Places
 * are drawn in as Elof reaches them, with a child's names for them. A little Elof marks "Här är du", and the
 * ghost is drawn where it is heading: the goal as a picture, which never says how (plan §4.6).
 * It is drawn here, in code: no picture file, and nothing of the real map of the place.
 */
export type MapPlace = 'home' | 'forest' | 'brook' | 'bog' | 'mountain';

export interface MapState {
  /** The places drawn so far, in the order of the route. */
  drawn: MapPlace[];
  /** Where Elof is. */
  here: MapPlace;
  /** Where the ghost is heading, or null when it is with him. */
  ghost: MapPlace | null;
}

const ROUTE: MapPlace[] = ['home', 'forest', 'brook', 'bog', 'mountain'];

/** What the map shows in each part of the story, by its stable id. Null: a course that is not on the map. */
export function mapState(chapter: string): MapState | null {
  const upTo = (place: MapPlace) => ROUTE.slice(0, ROUTE.indexOf(place) + 1);
  switch (chapter) {
    case 'prolog':
      return { drawn: upTo('home'), here: 'home', ghost: 'home' };
    case 'garden':
      return { drawn: upTo('home'), here: 'home', ghost: 'forest' };
    // The brook's calm edge is the end of Granskogen: both are drawn there.
    case 'granskog':
      return { drawn: upTo('brook'), here: 'forest', ghost: 'bog' };
    case 'myren':
      return { drawn: upTo('bog'), here: 'bog', ghost: 'mountain' };
    case 'berget':
      return { drawn: upTo('mountain'), here: 'mountain', ghost: 'mountain' };
    case 'norrsken':
      return { drawn: upTo('mountain'), here: 'mountain', ghost: null };
    case 'epilog':
      return { drawn: upTo('mountain'), here: 'home', ghost: null };
    default:
      return null;
  }
}

/** Where each place lies on the paper, and how it is drawn: crayon colours, a little crooked. */
const AT: Record<MapPlace, { x: number; y: number }> = {
  home: { x: 44, y: 112 },
  forest: { x: 124, y: 96 },
  brook: { x: 192, y: 112 },
  bog: { x: 258, y: 88 },
  mountain: { x: 334, y: 58 },
};
const crayon = 'fill="none" stroke-linecap="round" stroke-linejoin="round"';
const PICTURE: Record<MapPlace, string> = {
  // The red house with its white corners.
  home: `<path d="M-15 8v-16l15-11 15 11v16z" fill="#c0392b" stroke="#7a2318" stroke-width="2"/><path d="M-4 8v-9h8v9" ${crayon} stroke="#fff6ea" stroke-width="2.4"/>`,
  // Three spruces.
  forest: `<path d="M-16 8l7-22 7 22zM-3 8l8-28 8 28zM10 8l6-18 6 18z" fill="#3f7a3a" stroke="#27512a" stroke-width="2" stroke-linejoin="round"/>`,
  // The brook.
  brook: `<path d="M-18-4c6-6 10 6 16 0s10 6 16 0M-18 6c6-6 10 6 16 0s10 6 16 0" ${crayon} stroke="#3f8fc4" stroke-width="3"/>`,
  // Tussocks in the bog, and a little mist.
  bog: `<path d="M-16 6c2-8 8-8 10 0M-2 8c2-9 9-9 11 0M12 4c2-7 7-7 9 0" ${crayon} stroke="#b0672f" stroke-width="3"/><path d="M-18-8h14m6-5h16" ${crayon} stroke="#c9c2b2" stroke-width="3"/>`,
  // The mountain, with the old pine on it.
  mountain: `<path d="M-24 14l18-34 9 13 6-8 15 29z" fill="#9a9aa4" stroke="#5c5c68" stroke-width="2" stroke-linejoin="round"/><path d="M-6-20v-9m-4 4l4-5 4 5" ${crayon} stroke="#27512a" stroke-width="2.2"/>`,
};

/** The map as SVG markup. With a state of null it draws nothing. */
export function mapSvg(state: MapState | null): string {
  if (!state) return '';
  const route = state.drawn.map((place, i) => `${i === 0 ? 'M' : 'L'}${AT[place].x} ${AT[place].y + 20}`).join(' ');
  const places = state.drawn
    .map((place) => {
      const { x, y } = AT[place];
      return `<g transform="translate(${x} ${y})">${PICTURE[place]}</g><text x="${x}" y="${y + 42}" text-anchor="middle">${sv.map[place]}</text>`;
    })
    .join('');
  const here = AT[state.here];
  // A little Elof: a yellow tuft of hair on a blue shirt.
  const elof = `<g transform="translate(${here.x - 22} ${here.y - 30})"><circle r="6" fill="#f4c542" stroke="#8a6a1a" stroke-width="1.5"/><path d="M-5 7h10l2 11h-14z" fill="#8fb4dc" stroke="#4a6a8c" stroke-width="1.5"/></g><text class="here" x="${here.x - 22}" y="${here.y - 42}" text-anchor="middle">${sv.map.here}</text>`;
  const to = state.ghost && state.ghost !== state.here ? AT[state.ghost] : null;
  // The ghost, where it is heading: on blank paper, when that place is not drawn yet.
  const ghost = to
    ? `<g transform="translate(${to.x + (state.drawn.includes(state.ghost!) ? 22 : 0)} ${to.y - (state.drawn.includes(state.ghost!) ? 26 : 0)})"><path d="M-7 10v-12a7 7 0 0 1 14 0v12z" fill="#e9d3a8" stroke="#8a6a3a" stroke-width="1.5"/><circle cx="-2.5" cy="-2" r="1.2"/><circle cx="2.5" cy="-2" r="1.2"/></g>`
    : '';
  return `<svg class="moas-karta" viewBox="0 -16 380 180" role="img" aria-label="${sv.map.title}"><path d="${route}" ${crayon} stroke="#b9976a" stroke-width="3" stroke-dasharray="2 8"/>${places}${ghost}${elof}</svg>`;
}
