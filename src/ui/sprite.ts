/**
 * The game's drawn icons (docs/ux-audit/style-and-sound.md, "Icons"; row 13): one set on a 24-unit grid, in the ink
 * of what they sit on (`currentColor`): ink on paper, cut into linden, cream on paint. Every typed symbol gave way to
 * them (♡ ✦ ✎ ≈ ⌂ △ ▶ ✓ ✕ × ● ← → ↩ ␣ ✚), because each system draws a typed symbol its own way, in its own weight
 * and on its own baseline, and some as colour emoji.
 *
 * They are put into the page once, as a sprite, when Vite writes index.html (vite.config.ts): the game's script
 * carries none of them. Each is used as `<svg class="i"><use href="#i-close"/></svg>` (`use()` in icons.ts).
 * Plain shapes only: no logotypes and no brand marks (plan §0).
 */
const line = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
/** Lines of the given width, for every shape in the body that has no fill of its own. */
const lines = (body: string, width = 2) => body.replaceAll('/>', ` ${line} stroke-width="${width}"/>`);

/** Elof as Moa's map draws him: a yellow tuft of hair on a blue shirt. */
const elofAt = (x: number, y: number, limbs: string) =>
  `<path d="${limbs}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x - 6} ${y + 6}h12l2.5 14h-17z" fill="#8fb4dc" stroke="#3d2b1f" stroke-width="1.8" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="7" fill="#f4c542" stroke="#3d2b1f" stroke-width="1.8"/>`;
/** The sign's candy paint: the 3D kit's six colours (src/render/candy.ts), a letter each. */
const CANDY_PAINT = ['#e8483f', '#f6c445', '#58b368', '#4a90d9', '#ef7fb0', '#f08a3c'];
const painted = (word: string) => [...word].map((letter, i) => `<tspan fill="${CANDY_PAINT[i % CANDY_PAINT.length]}">${letter}</tspan>`).join('');

export const ICONS = {
  // --- the panels' own ---------------------------------------------------------------------------------------
  /** Close a panel; no; remove a player. */
  close: lines('<path d="M6 6l12 12M18 6 6 18"/>', 2.6),
  /** Back, to the page this one was opened from. */
  back: lines('<path d="M20 12H5m0 0 6-6m-6 6 6 6"/>', 2.4),
  /** The picture before and after this one. */
  previous: lines('<path d="M15 5l-7 7 7 7"/>', 2.8),
  next: lines('<path d="M9 5l7 7-7 7"/>', 2.8),
  /** Yes, given, done. */
  check: lines('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 2.8),
  /** Go on; watch again. */
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
  /** Back to the beginning of what was watched. */
  again: lines('<path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5M4 4v4.5h4.5"/>', 2.4),
  /** The corner's pause. */
  pause: '<rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/>',
  /** Settings: a plain cog, with eight teeth. */
  cog: lines('<path d="M10.2 4.6L10.6 1.7L13.4 1.7L13.8 4.6A7.6 7.6 0 0 1 15.9 5.5L18.3 3.7L20.3 5.7L18.5 8.1A7.6 7.6 0 0 1 19.4 10.2L22.3 10.6L22.3 13.4L19.4 13.8A7.6 7.6 0 0 1 18.5 15.9L20.3 18.3L18.3 20.3L15.9 18.5A7.6 7.6 0 0 1 13.8 19.4L13.4 22.3L10.6 22.3L10.2 19.4A7.6 7.6 0 0 1 8.1 18.5L5.7 20.3L3.7 18.3L5.5 15.9A7.6 7.6 0 0 1 4.6 13.8L1.7 13.4L1.7 10.6L4.6 10.2A7.6 7.6 0 0 1 5.5 8.1L3.7 5.7L5.7 3.7L8.1 5.5A7.6 7.6 0 0 1 10.2 4.6Z"/><circle cx="12" cy="12" r="3.2"/>', 1.8),
  /** Utforska vidare and Moa's map: her map, folded, with the way on in red crayon. */
  map: `${lines('<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/>')}<path d="M5.5 15.5c1.5-3 3.5-1.5 5-4s3.5-2.5 6-4.5" fill="none" stroke="#c4352b" stroke-width="1.6" stroke-linecap="round" stroke-dasharray="0.4 2.4"/>`,
  /** The players. */
  people: '<circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="17" cy="9" r="2.5" fill="currentColor"/><path d="M2 21v-4a6 6 0 0 1 12 0v4m1-7a5 5 0 0 1 7 5v2" fill="none" stroke="currentColor" stroke-width="2"/>',
  /** A new player: one, and a plus. */
  'player-add': lines('<circle cx="9" cy="7.5" r="3.4"/><path d="M2.5 21v-2.5a6.5 6.5 0 0 1 13 0V21M19.5 8v6M16.5 11h6"/>'),
  /** Till startsidan. */
  home: lines('<path d="m2 11 10-9 10 9M5 9v13h14V9m-10 13v-8h6v8"/>'),
  /** The chapter's code: three words on a tag. */
  tag: lines('<path d="M3 5.5h11l7 6.5-7 6.5H3z"/><path d="M6.5 10h6M6.5 14h4"/>'),
  /** The photos, and the adventure seen again. */
  camera: lines('<path d="M3.5 8h4l2-2.5h5l2 2.5h4v11h-17z"/><circle cx="12" cy="13" r="3.5"/>'),
  /** Quieter, louder. */
  minus: lines('<path d="M6 12h12"/>', 2.6),
  plus: lines('<path d="M12 6v12M6 12h12"/>', 2.6),

  // --- the settings' rows (docs/ux-audit/menus.md row 5) ------------------------------------------------------
  /** Hjälp med svingen: a swing seat on its two ropes, and the arc it swings. */
  swing: lines('<path d="M4 3h16M8 3v11M16 3v11M6 14h12"/><path d="M3 19.5c4 2 14 2 18 0" stroke-dasharray="0.5 3.2"/>'),
  /** Lätta hopp: a dotted arc from one ledge to the next. */
  arc: lines('<path d="M2 20h5M17 14h5v6"/><path d="M5 17C8 6 15 5 18.5 11" stroke-dasharray="0.5 3.4"/>'),
  /** Stanna vid höga kanter: Elof standing at a high edge. */
  edge: lines('<path d="M2 10h12v12"/><circle cx="11" cy="3.4" r="1.6"/><path d="M11 5.4v2.4m0 0-1.4 1.8m1.4-1.8 1.2 1.8"/><path d="M19 12v2.5m0 3v2.5" stroke-dasharray="0.5 3"/>'),
  /** Spänning utan brådska: an hourglass. */
  hourglass: lines('<path d="M6 3h12M6 21h12M7.5 3v2c0 3.2 4.5 4.6 4.5 7s-4.5 3.8-4.5 7v2M16.5 3v2c0 3.2-4.5 4.6-4.5 7s4.5 3.8 4.5 7v2M9.5 19.5h5"/>'),
  /** Långsammare spel: a snail. */
  snail: lines('<circle cx="10" cy="12.5" r="5.5"/><path d="M10 12.5a2.4 2.4 0 1 1 2.4-2.4M3 18.5h15a3 3 0 0 0 3-3v-3m0 0 1-3m-2.6 3-1-3"/>'),
  /** Ljud: a speaker, sounding; and with a slash, off. */
  speaker: lines('<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M16.5 9a4.2 4.2 0 0 1 0 6M19 6.5a7.8 7.8 0 0 1 0 11"/>'),
  'speaker-off': lines('<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path d="M3 3l18 18"/>'),
  /** Musik: a note; and with a slash, off. */
  note: lines('<path d="M9 18V6.5l10-2.5v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
  'note-off': lines('<path d="M9 18V6.5l10-2.5v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/>'),
  /** Ljud även i tyst läge: a phone with its side switch, sounding. */
  loud: lines('<rect x="6" y="2.5" width="9.5" height="19" rx="2.4"/><path d="M3.5 6.5v3.5M18.5 9a4 4 0 0 1 0 6M21 7a7 7 0 0 1 0 10"/>'),
  /** Vänsterhänt: the two sides change places. */
  swap: lines('<path d="M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5M20 16H6m0 0 3.5-3.5M6 16l3.5 3.5"/>'),
  /** Vibration vid landning: a phone buzzing. */
  buzz: lines('<rect x="8" y="3" width="8" height="18" rx="2.2"/><path d="M4.5 8.5v7M2 10.5v3M19.5 8.5v7M22 10.5v3"/>'),
  /** Större text: a big and a small letter, drawn, not typed. */
  letters: lines('<path d="M2.5 19.5 7.5 5h1l5 14.5M4.6 14h6.8"/><circle cx="18" cy="16" r="3.2"/><path d="M21.2 13v6.5"/>', 2.2),
  /** Mindre rörelse: a wave that comes to rest. */
  still: lines('<path d="M2 12c1.6-5 3.4-5 5 0s3.4 5 5 0M14.5 12H22"/>'),
  /** Helskärm: the four corners of a screen. */
  corners: lines('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
  /** Tangenter och handkontroll: a keyboard. */
  keyboard: lines('<rect x="2" y="6" width="20" height="12" rx="2.2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7.5 14h9"/>'),
  /** Lägg till på hemskärmen: a phone with a plus. */
  'add-phone': lines('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 9v6M9 12h6"/>'),
  /** The pad's stick and its cross. */
  stick: lines('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>'),
  'cross-pad': lines('<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/>'),

  // --- keys, as they are printed on the keys --------------------------------------------------------------------
  'key-left': lines('<path d="M19 12H6m0 0 5-5m-5 5 5 5"/>', 2.6),
  'key-right': lines('<path d="M5 12h13m0 0-5-5m5 5-5 5"/>', 2.6),
  'key-up': lines('<path d="M12 19V6m0 0-5 5m5-5 5 5"/>', 2.6),
  'key-down': lines('<path d="M12 5v13m0 0-5-5m5 5 5-5"/>', 2.6),
  /** The space bar's mark: a wide, low bracket, on a key as wide as it. */
  'key-space': { box: '0 0 40 24', body: lines('<path d="M4 9v5.5h32V9"/>', 2.6) },

  // --- the play buttons and the styles' pictures --------------------------------------------------------------
  /** Hoppa: an arrow up. */
  hop: lines('<path d="M12 20V5m0 0-6 6m6-6 6 6"/>', 2.4),
  /** Följ fingret: the crayon arrow over his head, turned toward the held finger. */
  toward: lines('<path d="M4 12.5c4-.8 9.5-.6 15-.5m0 0-5.5-5.5M19 12l-5.5 5.5"/>', 3),
  /** Använd: an open hand. */
  hand: lines('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V10m0-2a1.5 1.5 0 0 1 3 0v6.5A6.5 6.5 0 0 1 11.5 21 6 6 0 0 1 6.7 18.6L4 14.5a1.5 1.5 0 0 1 2.4-1.8L9 15"/>', 1.8),
  // Använd's pictures, one for each kind of thing he does (docs/ux-audit/in-play.md row 6), so a child who does not
  // read the word still sees it: in the 24 box with a 1.8 line, as the hand.
  /** Ta, Plocka: a hand closing over something. */
  take: `${lines('<path d="M5 10c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5v2.5M8.5 9v3.5M12 7.5v5M15.5 9v3.5"/>', 1.8)}<circle cx="12" cy="17.5" r="3.2" fill="currentColor"/>`,
  /** Ge: a hand held out, a sweet on it. */
  give: `${lines('<path d="M2.5 14.5h3.5l4.5 2.5h6.5a1.75 1.75 0 0 1 0 3.5H11M6 20.5h11.5l4-3.5"/>', 1.8)}<path d="M9.5 6.5h5l2.2-1.7v6.4l-2.2-1.7h-5l-2.2 1.7V4.8z" fill="currentColor"/>`,
  /** Ropa: two cupped hands, and the call going out. */
  call: lines('<path d="M4 9.5c2 0 3.5 1.2 3.5 2.5S6 14.5 4 14.5M4 6.5c3.6 0 6.3 2.4 6.3 5.5s-2.7 5.5-6.3 5.5M14 9.5a3.5 3.5 0 0 1 0 5M17 7a7 7 0 0 1 0 10M20 4.5a10.5 10.5 0 0 1 0 15"/>', 1.8),
  /** Knuffa, Dra, Vänd, Lyft: an arrow against a block. */
  push: lines('<path d="M2.5 12h10m0 0-3.5-3.5m3.5 3.5-3.5 3.5"/><rect x="15" y="5.5" width="6.5" height="13" rx="1.5"/>', 1.8),
  /** Kliv upp, Kliv på, Åk med: steps, and the way up them. */
  climb: lines('<path d="M2.5 20.5h5v-5h5v-5h5v-5h4"/><path d="M6 11.5 12 5.5m0 0H8m4 0v4"/>', 1.8),
  /** Åk ner: down a slide. */
  slide: lines('<path d="M4 4.5c0 8 6 14.5 15.5 14.5m0 0-3-3m3 3-3 3"/><path d="M4 4.5h3"/>', 1.8),
  /** Smaka: a sweet in its wrapper. */
  taste: lines('<ellipse cx="12" cy="12" rx="5" ry="4"/><path d="M7.2 11 3 8v8l4.2-3M16.8 11 21 8v8l-4.2-3"/>', 1.8),
  /** Borsta tänderna: a toothbrush. */
  toothbrush: lines('<path d="M3.5 20.5 14 10"/><path d="M13 8.5 17.5 4l3 3-4.5 4.5z"/><path d="M15 7l2 2m-.5-3.5 2 2"/>', 1.8),
  /** Kasta snöret, Sänk snöret: a ring on a string. */
  lace: lines('<path d="M12 2.5v9"/><circle cx="12" cy="16" r="4.5"/><path d="M9.5 5.5h5"/>', 1.8),
  /** A big candy: the striped sweet on its stick that marks a safe place (plan §3.3, rule 4). */
  'big-candy': '<path d="M12 13v9" stroke="#f4efe6" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8.5" r="6.5" fill="#dd4b39"/><path d="M6.6 5.2c3.4 0 6.6 2.4 7.4 6.4M9.8 2.6c3.6.8 6.6 3.6 7.6 7.4" fill="none" stroke="#fff6ea" stroke-width="1.7" stroke-linecap="round"/>',
  /** Elof in mid-leap: the picture for Äventyr. */
  leap: { box: '0 0 42 38', body: `<circle cx="27" cy="9" r="4.2" fill="currentColor"/>${lines('<path d="M26 14l-6 8m6-8 7 5m-13 3-8 3m8-3 7 6m-6-13-7-3m13 2 6-4"/>', 2.6)}${lines('<path d="M4 33c8-5 24-5 34 1" stroke-dasharray="1 4"/>', 1.6)}` },
  /** Elof strolling: the picture for Lugnt. */
  stroll: { box: '0 0 42 38', body: `<circle cx="20" cy="8" r="4.2" fill="currentColor"/>${lines('<path d="M20 13v11m0 0-4 9m4-9 4 9m-4-16-5 6m5-6 5 5"/>', 2.6)}${lines('<path d="M5 34h32"/>', 1.6)}` },
  /** Äventyr on the title: Elof in mid-leap over the dotted arc of his jump (first-minutes.md row 12). */
  'start-leap': { box: '0 0 120 80', body: `<path d="M8 72C30 16 82 10 114 58" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.5 8" opacity="0.8"/>${elofAt(64, 18, 'M58 27 47 17M70 27l11-11M60 40l-9 11M68 40l12 7')}` },
  /** Lugnt on the title: Elof strolling, with the jay beside him. */
  'start-stroll': { box: '0 0 90 80', body: `<path d="M6 72h78" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>${elofAt(34, 24, 'M29 33l-5 12M39 33l5 11M32 46l-4 24M36 46l6 24')}<path d="M58 40c4-6 12-6 15-1l5-1-4 4c0 5-4 8-10 8h-5c-3 0-4-4-1-10z" fill="#6b88c4" stroke="#3d2b1f" stroke-width="1.6" stroke-linejoin="round"/><circle cx="68" cy="41" r="1.3" fill="#3d2b1f"/><path d="M62 50v5m4-5v5" stroke="#3d2b1f" stroke-width="1.6" stroke-linecap="round"/>` },
  /** A phone turning on its side: "Vänd skärmen på bredden!" */
  turn: { box: '0 0 34 28', body: lines('<rect x="4" y="9" width="9" height="16" rx="2"/><rect x="15" y="16" width="16" height="9" rx="2" stroke-dasharray="2 2.5"/><path d="M14 6c5 0 9 2.5 10.5 7m0 0-3-1.4m3 1.4 1.2-3"/>', 1.8) },
  /**
   * The game's name as Pappa's sign (docs/ux-audit/first-minutes.md row 5, style-and-sound.md row 4): a plank of
   * linden hung on two strings, "Elof och det stora" painted blue, and "godisäventyret" a letter in each candy colour
   * inside the dark edge of its cut, in the game's own type. The words are the heading's, for a screen reader.
   */
  sign: { box: '0 0 620 172', body: `<path d="M150 2v22M470 2v22" stroke="#7b5a36" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-1 310 96)"><rect x="8" y="20" width="604" height="148" rx="16" fill="#e6cfa4" stroke="#a17443" stroke-width="3"/><path d="M30 52c120-6 230 6 380-2s130 4 180 0M40 132c140 6 260-6 380 2s110-2 160 2" fill="none" stroke="#a17443" stroke-width="1.4" opacity="0.35"/><g font-family="Andika, sans-serif" font-weight="700" text-anchor="middle"><text x="310" y="70" font-size="40" fill="#2b5888">Elof och det stora</text><text x="310" y="146" font-size="76" stroke="#5a3a1e" stroke-width="5" stroke-linejoin="round" paint-order="stroke" textLength="560" lengthAdjust="spacingAndGlyphs">${painted('godisäventyret')}</text></g></g>` },

  // --- what Elof is doing now: the purpose line's pictures ----------------------------------------------------
  /** Follow: a dotted trail and an arrow. */
  trail: `${lines('<path d="M3 16h.01M6.5 15h.01M10 14h.01"/>', 3)}${lines('<path d="M13.5 12.5h7m0 0-3-3m3 3-3 3"/>', 2.2)}`,
  /** Help someone. */
  heart: lines('<path d="M12 19.5s-7-4.3-7-9.4a3.9 3.9 0 0 1 7-2.3 3.9 3.9 0 0 1 7 2.3c0 5.1-7 9.4-7 9.4z"/>', 2.2),
  /** Magic: the star, the glitter, the light; and the credits. */
  sparkle: lines('<path d="M12 3.5c.9 4.4 2.3 5.8 6.8 6.8-4.5 1-5.9 2.4-6.8 6.8-.9-4.4-2.3-5.8-6.8-6.8 4.5-1 5.9-2.4 6.8-6.8zM18.5 16.5l.6 1.6 1.6.6-1.6.6-.6 1.6-.6-1.6-1.6-.6 1.6-.6z"/>', 1.9),
  /** Paint: Moa's brush. */
  brush: lines('<path d="M20 4l-8.2 8.2"/><path d="M11.8 12.2c-1.9-.5-3.8.4-4.6 2.3-.6 1.5-.8 3.1-3.2 5 3.6.6 6.4-.6 7.6-2.4 1-1.4 1.1-3.2.2-4.9z"/>', 2.1),
  /** Carve: Pappa's knife. */
  knife: lines('<path d="M4.5 19.5l6.5-6.5"/><path d="M11 13l8-8c1.2 2.8-.2 6.3-3.3 8.6L13.5 15z"/>', 2.1),
  /** The mountain, with its old pine on the shoulder. */
  mountain: lines('<path d="M2.5 20 9.5 7.5l3.4 5.4 2.4-3.4L21.5 20z"/><path d="M17.5 6v4M16 7.4l1.5-1.4 1.5 1.4"/>', 2),
  /** Water: the brook and the bog. */
  water: lines('<path d="M3 10c2-2 4 2 6 0s4 2 6 0 4 2 6 0M3 15.5c2-2 4 2 6 0s4 2 6 0 4 2 6 0"/>', 2.1),
  /** Home: the house with a lit window. */
  house: `${lines('<path d="M3.5 11.5 12 4l8.5 7.5V20h-17z"/><path d="M10 20v-4.5h4V20"/>', 2)}<rect x="14.6" y="11" width="2.6" height="2.6" rx="0.4" fill="#f6c445" stroke="currentColor" stroke-width="1.2"/>`,
  /** Byn: three house fronts in a row. */
  village: lines('<path d="M2 20.5V12l3.5-3 3.5 3v8.5M9 20.5V9.5L12.5 6 16 9.5v11M16 20.5V13l3-2.5 3 2.5v7.5M1.5 20.5h21"/><path d="M12.5 13v2.5M5.5 15v2"/>', 1.8),
} as const satisfies Record<string, string | { box: string; body: string }>;

export type IconId = keyof typeof ICONS;

/** The sprite, as it goes into index.html: one hidden SVG, every icon a symbol in it. */
export function spriteHtml(): string {
  const symbols = Object.entries(ICONS).map(([id, icon]) => {
    const { box, body } = typeof icon === 'string' ? { box: '0 0 24 24', body: icon } : icon;
    return `<symbol id="i-${id}" viewBox="${box}">${body}</symbol>`;
  }).join('');
  return `<svg class="sprite" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">${symbols}</svg>`;
}
