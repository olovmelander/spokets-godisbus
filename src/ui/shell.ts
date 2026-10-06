import { sceneUiHtml } from './scene';
import { sv } from '../content/sv';
import { endingHtml } from './ending';
import { photoAlbumHtml } from './photos';
import { storyPanelHtml } from './story';
import { BACK, CHECK, CROSS, line, svg } from './icons';

// Every picture on the page is a plain shape drawn here or in icons.ts: no logotypes, no brand marks (plan §0).

const HAND = svg(`<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V10m0-2a1.5 1.5 0 0 1 3 0v6.5A6.5 6.5 0 0 1 11.5 21 6 6 0 0 1 6.7 18.6L4 14.5a1.5 1.5 0 0 1 2.4-1.8L9 15" ${line} stroke-width="1.8"/>`);
const ARROW = svg(`<path d="M12 20V5m0 0-6 6m6-6 6 6" ${line} stroke-width="2.4"/>`);
const PAUSE = svg('<rect x="6" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/><rect x="13.8" y="5" width="4.2" height="14" rx="1.4" fill="currentColor"/>');
const PLAY = svg('<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>');
/** The helper: a small bird, seen from the side. */
const BIRD = svg(
  `<path d="M4 14c0-4 3-7 7-7 2.2 0 4 .9 5.2 2.4L20 9l-2.4 2.6c.3.8.4 1.6.4 2.4 0 3-2.6 5-6.5 5H7c-1.7 0-3-2-3-5z" ${line} stroke-width="1.9"/><circle cx="13.8" cy="10.8" r="1" fill="currentColor"/><path d="M4.4 15.6 2 18m7.5 1v2.4m3.5-2.4v2.4" ${line} stroke-width="1.7"/>`,
);
/** The wooden ghost: round top, two painted eyes, two shoes, and its paper bag; no mouth. */
const GHOST = svg(`<path d="M6 17V9a6 6 0 0 1 12 0v8c0 2-2 3-6 3s-6-1-6-3z" ${line} stroke-width="1.8"/><circle cx="10" cy="8.5" r="1" fill="currentColor"/><circle cx="14.5" cy="8.5" r="1" fill="currentColor"/><path d="M7 21h3m4 0h3M15 12h6v6h-6z" ${line} stroke-width="1.7"/>`);
/** Settings: a plain cog, with eight teeth. */
const COG = svg(`<path d="M10.2 4.6L10.6 1.7L13.4 1.7L13.8 4.6A7.6 7.6 0 0 1 15.9 5.5L18.3 3.7L20.3 5.7L18.5 8.1A7.6 7.6 0 0 1 19.4 10.2L22.3 10.6L22.3 13.4L19.4 13.8A7.6 7.6 0 0 1 18.5 15.9L20.3 18.3L18.3 20.3L15.9 18.5A7.6 7.6 0 0 1 13.8 19.4L13.4 22.3L10.6 22.3L10.2 19.4A7.6 7.6 0 0 1 8.1 18.5L5.7 20.3L3.7 18.3L5.5 15.9A7.6 7.6 0 0 1 4.6 13.8L1.7 13.4L1.7 10.6L4.6 10.2A7.6 7.6 0 0 1 5.5 8.1L3.7 5.7L5.7 3.7L8.1 5.5A7.6 7.6 0 0 1 10.2 4.6Z" ${line} stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" ${line} stroke-width="1.8"/>`);
/** Utforska vidare: Moa's map, folded. */
const FOLDED_MAP = svg(`<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" ${line} stroke-width="2"/><path d="M9 4v13.5M15 6.5V20" ${line} stroke-width="2"/>`);
const PEOPLE = svg('<circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="17" cy="9" r="2.5" fill="currentColor"/><path d="M2 21v-4a6 6 0 0 1 12 0v4m1-7a5 5 0 0 1 7 5v2" fill="none" stroke="currentColor" stroke-width="2"/>');
const HOME = svg(`<path d="m2 11 10-9 10 9M5 9v13h14V9m-10 13v-8h6v8" ${line} stroke-width="2"/>`);
/** A big candy: the striped sweet on its stick that marks a safe place (plan §3.3, rule 4). */
const BIG_CANDY = svg(
  '<path d="M12 13v9" stroke="#f4efe6" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="8.5" r="6.5" fill="#dd4b39"/><path d="M6.6 5.2c3.4 0 6.6 2.4 7.4 6.4M9.8 2.6c3.6.8 6.6 3.6 7.6 7.4" fill="none" stroke="#fff6ea" stroke-width="1.7" stroke-linecap="round"/>',
);
/** Elof in mid-leap: the picture for Äventyr. */
const LEAP = svg(
  `<circle cx="27" cy="9" r="4.2" fill="currentColor"/><path d="M26 14l-6 8m6-8 7 5m-13 3-8 3m8-3 7 6m-6-13-7-3m13 2 6-4" ${line} stroke-width="2.6"/><path d="M4 33c8-5 24-5 34 1" ${line} stroke-width="1.6" stroke-dasharray="1 4"/>`,
  '0 0 42 38',
);
/** Elof strolling: the picture for Lugnt. */
const STROLL = svg(
  `<circle cx="20" cy="8" r="4.2" fill="currentColor"/><path d="M20 13v11m0 0-4 9m4-9 4 9m-4-16-5 6m5-6 5 5" ${line} stroke-width="2.6"/><path d="M5 34h32" ${line} stroke-width="1.6"/>`,
  '0 0 42 38',
);
/** A phone turning on its side: "Vänd skärmen på bredden!" */
const TURN = svg(
  `<rect x="4" y="9" width="9" height="16" rx="2" ${line} stroke-width="1.8"/><rect x="15" y="16" width="16" height="9" rx="2" ${line} stroke-width="1.8" stroke-dasharray="2 2.5"/><path d="M14 6c5 0 9 2.5 10.5 7m0 0-3-1.4m3 1.4 1.2-3" ${line} stroke-width="1.8"/>`,
  '0 0 34 28',
);
/**
 * The game's name as Pappa's sign (docs/ux-audit/first-minutes.md row 5, style-and-sound.md row 4): a plank of linden
 * hung on two strings, "Elof och det stora" painted blue, and "godisäventyret" a letter in each candy colour inside the
 * dark edge of its cut, in the game's own type. The words are the heading's, for a screen reader.
 */
const CANDY_PAINT = ['#e8483f', '#f6c445', '#58b368', '#4a90d9', '#ef7fb0', '#f08a3c'];
const painted = (word: string) => [...word].map((letter, i) => `<tspan fill="${CANDY_PAINT[i % CANDY_PAINT.length]}">${letter}</tspan>`).join('');
const TITLE_SIGN = `<svg class="title-sign" viewBox="0 0 620 172" aria-hidden="true"><path d="M150 2v22M470 2v22" stroke="#7b5a36" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-1 310 96)"><rect x="8" y="20" width="604" height="148" rx="16" fill="#e6cfa4" stroke="#a17443" stroke-width="3"/><path d="M30 52c120-6 230 6 380-2s130 4 180 0M40 132c140 6 260-6 380 2s110-2 160 2" fill="none" stroke="#a17443" stroke-width="1.4" opacity="0.35"/><g font-weight="700" text-anchor="middle"><text x="310" y="70" font-size="40" fill="#2b5888">Elof och det stora</text><text x="310" y="146" font-size="76" stroke="#5a3a1e" stroke-width="5" stroke-linejoin="round" paint-order="stroke" textLength="560" lengthAdjust="spacingAndGlyphs">${painted('godisäventyret')}</text></g></g></svg>`;
/** Elof as Moa's map draws him: a yellow tuft of hair on a blue shirt. */
const elofAt = (x: number, y: number, limbs: string) =>
  `<path d="${limbs}" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M${x - 6} ${y + 6}h12l2.5 14h-17z" fill="#8fb4dc" stroke="#3d2b1f" stroke-width="1.8" stroke-linejoin="round"/><circle cx="${x}" cy="${y}" r="7" fill="#f4c542" stroke="#3d2b1f" stroke-width="1.8"/>`;
/** Äventyr: Elof in mid-leap over the dotted arc of his jump (first-minutes.md row 12). */
const START_LEAP = svg(
  `<path d="M8 72C30 16 82 10 114 58" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="0.5 8" opacity="0.8"/>${elofAt(64, 18, 'M58 27 47 17M70 27l11-11M60 40l-9 11M68 40l12 7')}`,
  '0 0 120 80',
);
/** Lugnt: Elof strolling, with the jay beside him. */
const START_STROLL = svg(
  `<path d="M6 72h78" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.6"/>${elofAt(34, 24, 'M29 33l-5 12M39 33l5 11M32 46l-4 24M36 46l6 24')}<path d="M58 40c4-6 12-6 15-1l5-1-4 4c0 5-4 8-10 8h-5c-3 0-4-4-1-10z" fill="#6b88c4" stroke="#3d2b1f" stroke-width="1.6" stroke-linejoin="round"/><circle cx="68" cy="41" r="1.3" fill="#3d2b1f"/><path d="M62 50v5m4-5v5" stroke="#3d2b1f" stroke-width="1.6" stroke-linecap="round"/>`,
  '0 0 90 80',
);
/** A paper bag with a folded top. The red inside rises as the bag fills (plan §4.3). */
const BAG =
  '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M8 15h32l-3 37H11z" fill="#f1dfb8"/><rect class="bag-fill" x="9" y="16" width="30" height="36" fill="#e8483f"/><path d="M8 15h32l-3 37H11z" fill="none" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 15l4-9 4 6 4-7 4 7 4-7 4 7 4-6 4 9z" fill="#f1dfb8" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/></svg>';

// The settings' pictures (docs/ux-audit/menus.md row 5): one line drawing for each row, in the ink of the words.
const icon = (body: string, width = 2) => svg(body.replaceAll('/>', ` ${line} stroke-width="${width}"/>`));
/** Hjälp med svingen: a swing seat on its two ropes, and the arc it swings. */
const SWING = icon('<path d="M4 3h16M8 3v11M16 3v11M6 14h12"/><path d="M3 19.5c4 2 14 2 18 0" stroke-dasharray="0.5 3.2"/>');
/** Lätta hopp: a dotted arc from one ledge to the next. */
const ARC = icon('<path d="M2 20h5M17 14h5v6"/><path d="M5 17C8 6 15 5 18.5 11" stroke-dasharray="0.5 3.4"/>');
/** Stanna vid höga kanter: Elof standing at a high edge. */
const EDGE = icon('<path d="M2 10h12v12"/><circle cx="11" cy="3.4" r="1.6"/><path d="M11 5.4v2.4m0 0-1.4 1.8m1.4-1.8 1.2 1.8"/><path d="M19 12v2.5m0 3v2.5" stroke-dasharray="0.5 3"/>');
/** Spänning utan brådska: an hourglass. */
const HOURGLASS = icon('<path d="M6 3h12M6 21h12M7.5 3v2c0 3.2 4.5 4.6 4.5 7s-4.5 3.8-4.5 7v2M16.5 3v2c0 3.2-4.5 4.6-4.5 7s4.5 3.8 4.5 7v2M9.5 19.5h5"/>');
/** Långsammare spel: a snail. */
const SNAIL = icon('<circle cx="10" cy="12.5" r="5.5"/><path d="M10 12.5a2.4 2.4 0 1 1 2.4-2.4M3 18.5h15a3 3 0 0 0 3-3v-3m0 0 1-3m-2.6 3-1-3"/>');
/** Ljud: a speaker; a slash when it is off. */
const SPEAKER = icon('<path d="M4 9.5h3.5L13 5v14l-5.5-4.5H4z"/><path class="sounding" d="M16.5 9a4.2 4.2 0 0 1 0 6M19 6.5a7.8 7.8 0 0 1 0 11"/><path class="slash" d="M3 3l18 18"/>');
/** Musik: a note; a slash when it is off. */
const NOTE = icon('<path d="M9 18V6.5l10-2.5v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path class="slash" d="M3 3l18 18"/>');
/** Ljud även i tyst läge: a phone with its side switch, sounding. */
const LOUD = icon('<rect x="6" y="2.5" width="9.5" height="19" rx="2.4"/><path d="M3.5 6.5v3.5M18.5 9a4 4 0 0 1 0 6M21 7a7 7 0 0 1 0 10"/>');
/** Vänsterhänt: the two sides change places. */
const SWAP = icon('<path d="M4 8h14m0 0-3.5-3.5M18 8l-3.5 3.5M20 16H6m0 0 3.5-3.5M6 16l3.5 3.5"/>');
/** Vibration vid landning: a phone buzzing. */
const BUZZ = icon('<rect x="8" y="3" width="8" height="18" rx="2.2"/><path d="M4.5 8.5v7M2 10.5v3M19.5 8.5v7M22 10.5v3"/>');
/** Större text: a big and a small letter. */
const LETTERS = svg('<text x="0.5" y="19" fill="currentColor" font-size="17" font-weight="700">A</text><text x="12.5" y="19" fill="currentColor" font-size="12" font-weight="700">a</text>');
/** Mindre rörelse: a wave that comes to rest. */
const STILL = icon('<path d="M2 12c1.6-5 3.4-5 5 0s3.4 5 5 0M14.5 12H22"/>');
/** Helskärm: the four corners of a screen. */
const CORNERS = icon('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>');
/** Tangenter och handkontroll: a keyboard. */
const KEYBOARD = icon('<rect x="2" y="6" width="20" height="12" rx="2.2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7.5 14h9"/>');
/** Lägg till på hemskärmen: a phone with a plus. */
const ADD_PHONE = icon('<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 9v6M9 12h6"/>');
/** The chapter's code: three words on a tag. */
const TAG = icon('<path d="M3 5.5h11l7 6.5-7 6.5H3z"/><path d="M6.5 10h6M6.5 14h4"/>');
/** The pad's stick and its cross, for the key reference. */
const STICK = icon('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3.5"/>');
const CROSS_PAD = icon('<path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5z"/>');

const p = sv.pause;

/** A setting that is on or off: its picture, its name, what it does, and a drawn switch (menus.md row 5). */
const switchRow = (id: string, key: keyof typeof p.says, picture: string, attributes = '') =>
  `<label class="switch" ${attributes}><span class="row-icon">${picture}</span><span class="row-words"><b id="${id}Name">${p[key]}</b><small id="${id}Says">${p.says[key]}</small></span><input type="checkbox" role="switch" id="${id}" aria-labelledby="${id}Name" aria-describedby="${id}Says"></label>`;

/**
 * A sound (menus.md row 8): the picture mutes it and keeps its level; five candy pips set the level, and a tap
 * anywhere along them chooses the nearest.
 */
const soundRow = (bus: 'effects' | 'music', id: string, word: string, picture: string) =>
  `<div class="sound-row" id="${bus}Row"><label class="mute">${picture}<input type="checkbox" id="${id}" aria-label="${word}"></label><span class="sound-word" aria-hidden="true">${word}</span><div class="pips" id="${bus}Volume" role="slider" tabindex="0" aria-label="${bus === 'effects' ? p.effectsVolume : p.musicVolume}" aria-valuemin="0" aria-valuemax="5">${'<i></i>'.repeat(5)}</div></div>`;

/** How much the helper does: its portrait, one to three dots, and what it means (menus.md row 9). */
const helpRow = (id: string, level: keyof typeof p.helpSays, word: string, portrait: string, dots: number) =>
  `<button class="help-level" id="${id}" type="button" role="radio" aria-describedby="${id}Says"><span class="row-icon">${portrait}</span><b>${word}</b><span class="dots" aria-hidden="true">${'<i class="on"></i>'.repeat(dots)}${'<i></i>'.repeat(3 - dots)}</span><small id="${id}Says">${p.helpSays[level]}</small></button>`;

/** A key reference row's keys, as keycaps: " / " parts the choices, " + " joins keys held together. */
const keycaps = (keys: string) =>
  keys.split(' / ').map((choice) => choice.split(' + ').map((held) => held.split(' ').map((key) => `<kbd>${key}</kbd>`).join('')).join('<span class="key-plus">+</span>')).join('<span class="key-or">/</span>');
/** The pad's names, as the pad shows them: coloured letters, and the stick and the cross drawn. */
const PAD_KEYS: Record<string, string> = {
  A: '<kbd class="pad-a">A</kbd>', B: '<kbd class="pad-b">B</kbd>', X: '<kbd class="pad-x">X</kbd>', Y: '<kbd class="pad-y">Y</kbd>',
  Spaken: `<kbd class="pad-word">${STICK}Spaken</kbd>`, styrkorset: `<kbd class="pad-word">${CROSS_PAD}styrkorset</kbd>`,
};
const padKeys = (keys: string) =>
  keys.split(' / ').map((key) => PAD_KEYS[key] ?? `<kbd>${key}</kbd>`).join('<span class="key-or">/</span>');
const referenceRows = (rows: readonly (readonly [string, string])[], caps: (keys: string) => string) =>
  rows.map(([keys, action]) => `<div><dt>${caps(keys)}</dt><dd>${action}</dd></div>`).join('');

/**
 * Builds everything that lies over the game view: the candy bag, the pause button and its panel, the
 * on-screen controls, the hint, the notice, the debug text and the message. The game page and
 * dev/menus.html both call it, so the preview can't drift from the game.
 */
export function mountShell(root: HTMLElement, helper: 'ghost' | 'jay' = 'jay'): void {
  const portrait = helper === 'ghost' ? GHOST : BIRD;
  root.insertAdjacentHTML(
    'beforeend',
    `<button class="bag" id="bag" type="button">${BAG}<span id="bagCount">0</span><span class="stickers" id="bagStickers"></span></button>
     <button class="corner" id="pauseBtn" type="button" aria-label="${p.open}">${PAUSE}</button>
     <button class="corner help" id="helpBtn" type="button" aria-label="${sv.help}">${portrait}</button>
     <div class="controls" id="controls" hidden>
       <div class="stick-zone" id="stickZone">
         <div class="stick-base" id="stickBase"><div class="stick-knob" id="stickKnob"></div></div>
       </div>
       <button class="btn btn-act" id="actBtn" type="button" disabled>${HAND}<span></span></button>
       <button class="btn btn-hop" id="hopBtn" type="button">${ARROW}<span></span></button>
     </div>
     <div class="key-prompt" id="keyPrompt" aria-hidden="true"><kbd id="keyPromptKey">E</kbd><span id="keyPromptWord"></span></div>
     ${sceneUiHtml}
     <div class="bubble" id="bubble" role="status" hidden><span class="face" id="bubbleFace" aria-hidden="true"></span><b id="bubbleWho"></b><span id="bubbleLine"></span></div>
     <div class="hint" id="hint" hidden></div>
     <div class="story-purpose" id="storyPurpose" role="status" aria-live="polite" aria-atomic="true" hidden><span id="storyPurposeIcon" aria-hidden="true"></span><span><small>${sv.storyContext.now}</small><span id="storyPurposeText"></span><span id="storyPurposeReveal" class="story-purpose-reveal" hidden></span></span></div>
     <div class="tutorial" id="tutorial" role="img" hidden>
       <i class="tutorial-target"></i><span class="tutorial-key" id="tutorialKey"></span><span class="tutorial-hand">${HAND}</span>
     </div>
     <div class="notice" id="notice" role="status" hidden></div>
     <pre class="debug" id="debug" hidden></pre>
     <div class="panel-back" id="pause" hidden>
       <div class="panel pause" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
         <div class="panel-head">
           <button class="panel-up" id="pauseBack" type="button" hidden>${BACK}<span id="pauseBackWord">${p.title}</span></button>
           <h2 id="pauseTitle">${p.title}</h2>
           <button class="panel-close" id="pauseClose" type="button" aria-label="${p.close}">${CROSS}</button>
         </div>
         <div class="pause-options" id="pauseOptions">
         <div class="pause-page pause-home" id="pauseHome">
           <div class="pause-story">
             <section class="map-card" id="pauseMapCard" aria-labelledby="pauseMapTitle"><h3 id="pauseMapTitle">${sv.map.title}</h3><div class="map" id="pauseMap"></div></section>
             <section class="story-recap" id="pauseStory" aria-labelledby="pauseStoryTitle" hidden><h3 id="pauseStoryTitle">${sv.storyContext.recap}</h3><b id="pauseStoryPurpose"></b><p id="pauseStoryRecap"></p><h4>${sv.storyContext.family}</h4><p id="pauseStoryFamily"></p></section>
           </div>
           <div class="pause-actions">
             <button class="wide go" id="resumeBtn" type="button">${PLAY}<span>${p.resume}</span></button>
             <div class="ask" id="stuckAsk" hidden>
               <p>${p.stuckAsk}</p>
               <button class="yes" id="stuckYes" type="button" aria-label="${p.stuckYes}">${CHECK}${BIG_CANDY}</button>
               <button class="no" id="stuckNo" type="button" aria-label="${p.stuckNo}">${CROSS}${PLAY}</button>
             </div>
             <div class="tiles" id="pauseTiles">
               <button class="tile" id="pauseBagBtn" type="button">${BAG}<span>${p.bag}</span><small id="pauseBagCount"></small></button>
               <button class="tile" id="stuckBtn" type="button">${BIG_CANDY}<span>${p.stuck}</span></button>
               <button class="tile" id="pauseSettingsBtn" type="button">${COG}<span>${p.settings}</span></button>
               <button class="tile" id="titleBtn" type="button">${HOME}<span>${p.home}</span></button>
               <button class="tile" id="pauseExplore" type="button" hidden>${FOLDED_MAP}<span>${sv.explore.title}</span></button>
             </div>
           </div>
         </div>
         <div class="pause-page" id="pauseBagPage" hidden>
           <div class="album" id="pauseAlbum" tabindex="-1"></div>
           <section id="albumPhotos" class="album-photos" aria-label="${sv.photos.title}"></section>
         </div>
         <div class="pause-page pause-settings" id="pauseSettingsPage" hidden>
           <section class="group" aria-labelledby="groupPlay">
             <h3 id="groupPlay">${p.groups.play}</h3>
             <h4 id="styleTitle">${p.style}</h4>
             <div class="styles" role="radiogroup" aria-labelledby="styleTitle" aria-describedby="styleSays">
               <button class="style" id="styleAventyr" type="button" role="radio">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
               <button class="style" id="styleLugnt" type="button" role="radio">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
             </div>
             <p class="style-says" id="styleSays"></p>
             <h4 id="helpTitle">${p.help}</h4>
             <div class="help-levels" role="radiogroup" aria-labelledby="helpTitle">
               ${helpRow('helpAsk', 'ask', p.helpAsk, portrait, 1)}
               ${helpRow('helpRemind', 'remind', p.helpRemind, portrait, 2)}
               ${helpRow('helpGuide', 'guide', p.helpGuide, portrait, 3)}
             </div>
             ${switchRow('setSwingHelp', 'swingHelp', SWING)}
             ${switchRow('setEasyJumps', 'easyJumps', ARC)}
             ${switchRow('setStopAtEdges', 'stopAtEdges', EDGE)}
             ${switchRow('setGentle', 'gentle', HOURGLASS)}
             ${switchRow('setSlower', 'slower', SNAIL)}
           </section>
           <section class="group" aria-labelledby="groupSound">
             <h3 id="groupSound">${p.groups.sound}</h3>
             ${soundRow('effects', 'setSound', p.sound, SPEAKER)}
             ${soundRow('music', 'setMusic', p.music, NOTE)}
             ${switchRow('setLoud', 'loud', LOUD, 'id="loudSetting" hidden')}
           </section>
           <section class="group" aria-labelledby="groupControls">
             <h3 id="groupControls">${p.groups.controls}</h3>
             ${switchRow('setLefty', 'lefty', SWAP)}
             ${switchRow('setFollowFinger', 'followFinger', HAND)}
             ${switchRow('setVibration', 'vibration', BUZZ, 'id="vibrationSetting" hidden')}
           </section>
           <section class="group" aria-labelledby="groupPicture">
             <h3 id="groupPicture">${p.groups.picture}</h3>
             ${switchRow('setBigText', 'bigText', LETTERS)}
             ${switchRow('setCalm', 'calm', STILL)}
             <button class="wide row-button" id="fullscreenBtn" type="button" hidden><span class="row-icon">${CORNERS}</span><span id="fullscreenWord">${p.fullscreen}</span></button>
             <p class="setting-hint" id="fullscreenFailed" role="status" hidden>${p.fullscreenFailed}</p>
           </section>
           <section class="group" aria-labelledby="groupGrownups">
             <h3 id="groupGrownups">${p.groups.grownups}</h3>
             <h4 id="graphicsTitle">${p.graphics}</h4>
             <div class="levels graphics" role="radiogroup" aria-labelledby="graphicsTitle" aria-describedby="graphicsHint">
               <button class="level" id="graphicsAuto" type="button" role="radio">${p.graphicsAuto}</button>
               <button class="level" id="graphicsLow" type="button" role="radio">${p.graphicsLow}</button>
               <button class="level" id="graphicsMid" type="button" role="radio">${p.graphicsMid}</button>
               <button class="level" id="graphicsHigh" type="button" role="radio">${p.graphicsHigh}</button>
             </div>
             <p class="setting-hint" id="graphicsHint">${p.graphicsHint}</p>
             <p class="setting-hint" id="graphicsFallback" role="status" hidden>${p.graphicsFallback}</p>
             <button class="wide row-button" id="controlsReferenceBtn" type="button" hidden><span class="row-icon">${KEYBOARD}</span><span>${sv.controls.title}</span></button>
             <details class="info-row" id="homeScreenHelp" hidden><summary><span class="row-icon">${ADD_PHONE}</span><span>${sv.homeScreen.title}</span></summary>
               <p id="homeScreenSteps"></p><p>${sv.homeScreen.offline}</p>
             </details>
             <div class="info-row code-row" id="pauseCode" hidden><span class="row-icon">${TAG}</span><span class="row-words"><b>${p.code}</b><small>${p.codeSays}</small></span><span class="code-words" id="pauseCodeWords"></span></div>
           </section>
         </div>
         </div>
         <div class="controls-reference" id="controlsReference" hidden>
           <section aria-labelledby="keysTitle"><h3 id="keysTitle">${sv.controls.keyboard}</h3><dl>${referenceRows(sv.controls.keyboardRows, keycaps)}</dl></section>
           <section aria-labelledby="padTitle"><h3 id="padTitle">${sv.controls.gamepad}</h3><dl>${referenceRows(sv.controls.gamepadRows, padKeys)}</dl></section>
         </div>
       </div>
     </div>
     <div class="panel-back title" id="title" hidden>
       <div class="panel" role="dialog" aria-modal="true" aria-labelledby="titleName">
         <div id="titleFront">
           <h1 id="titleName" class="title-name"><span class="sr-only">${sv.title}</span>${TITLE_SIGN}</h1>
           <div class="story-title" id="titleStory" hidden><span class="story-card" id="titleStoryCard"></span><b id="titleStoryPurpose"></b><p id="titleStoryRecap"></p></div>
           <p class="rotate">${TURN}<span>${sv.start.rotate}</span></p>
           <p id="playerUnreadable" role="status" hidden>${sv.players.preserved}</p>
           <div class="start-styles" id="startStyles">
             <button class="start-style go" id="startAventyr" type="button">${START_LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
             <button class="start-style" id="startLugnt" type="button">${START_STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
           </div>
           <button class="wide go" id="startBtn" type="button">${PLAY}<span class="begin">${sv.start.begin}</span><span class="resume">${sv.start.resume}</span></button>
           <div class="round-row">
             <button class="round" id="playersBtn" type="button" hidden>${PEOPLE}<span id="currentPlayer"></span></button>
             <button class="round" id="titleSettingsBtn" type="button">${COG}<span>${sv.players.settings}</span></button>
             <button class="round" id="codeBtn" type="button">${TAG}<span>${sv.code.short}</span></button>
             <button class="round" id="titleExplore" type="button" hidden>${FOLDED_MAP}<span>${sv.explore.short}</span></button>
           </div>
         </div>
         <div id="titleCode" hidden>
           <div class="section-head"><button class="round-back" id="codeBack" type="button" aria-label="${sv.players.back}">${BACK}</button><h2 id="codeTitle">${sv.code.have}</h2></div>
           <form class="code-form" id="codeForm">
             <input id="codeInput" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" maxlength="40" aria-labelledby="codeTitle" placeholder="${sv.code.hint}">
             <button class="wide go" id="codeGo" type="submit">${sv.code.open}</button>
             <p class="code-wrong" id="codeWrong" role="alert" hidden>${sv.code.wrong}</p>
           </form>
         </div>
         <div id="titleStyles" hidden>
           <div class="section-head"><button class="round-back" id="stylesBack" type="button" aria-label="${sv.players.back}">${BACK}</button><h2 id="howTitle">${sv.start.how}</h2></div>
           <div class="styles" role="group" aria-labelledby="howTitle">
             <button class="style" id="firstAventyr" type="button">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
             <button class="style" id="firstLugnt" type="button">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
           </div>
         </div>
         <div id="titlePlayers" hidden>
           <div class="section-head"><button class="round-back" id="playersBack" type="button" aria-label="${sv.players.back}">${BACK}</button><h2>${sv.players.title}</h2></div>
           <div id="playerList"></div>
           <button class="wide" id="newPlayerBtn" type="button">${PEOPLE}<span>${sv.players.new}</span></button>
           <button class="wide small" id="startOverBtn" type="button" hidden>${sv.start.over}</button>
         </div>
         <div id="titleNewPlayer" hidden>
           <div class="section-head"><button class="round-back" id="newPlayerBack" type="button" aria-label="${sv.players.back}">${BACK}</button><h2>${sv.players.new}</h2></div>
           <form class="code-form player-form" id="newPlayerForm">
             <label for="playerName">${sv.players.name}</label>
             <input id="playerName" required type="text" autocomplete="off" spellcheck="false" enterkeyhint="next" aria-describedby="playerLocal">
             <p class="setting-hint" id="playerLocal">${sv.players.local}</p>
             <button class="wide go" type="submit">${sv.players.next}</button>
           </form>
         </div>
         <div id="titleConfirm" hidden>
           <p id="playerConfirmText"></p>
           <button class="wide" id="playerConfirmNo" type="button">${CROSS}<span>${sv.players.no}</span></button>
           <button class="wide" id="playerConfirmYes" type="button">${CHECK}<span>${sv.players.yes}</span></button>
         </div>
         <p id="playerError" role="alert" hidden>${sv.players.error}</p>
       </div>
     </div>
     <div class="memory" id="memory" hidden><div class="memory-panel" role="dialog" aria-modal="true" aria-labelledby="memoryTitle"><button class="panel-close" id="memoryClose" type="button" aria-label="${p.close}">${CROSS}</button><h2 id="memoryTitle">${sv.memory}</h2><div class="memory-card" id="memoryCard" role="img" aria-label="${sv.memory}"></div><div class="memory-controls"><span id="memoryProgress" role="status"></span><button class="wide" id="memoryNext" type="button">${sv.memories.next} →</button></div></div></div>
     ${photoAlbumHtml}
     ${endingHtml}
     ${storyPanelHtml}
     <div class="panel-back" id="endCard" hidden>
       <div class="panel end" role="dialog" aria-modal="true" aria-labelledby="endTitle">
         <div class="page-story">
           <figure class="page-picture" id="endPicture" hidden></figure>
           <h2 id="endTitle"></h2>
           <div class="story-handoff" id="endStory" hidden><b id="endStoryTitle"></b><p id="endStoryText"></p></div>
         </div>
         <div class="page-tally">
           <div class="map" id="endMap"></div>
           <div class="rows" id="endRows"></div>
           <p class="count"><b id="endCount"></b> ${sv.end.candy}</p>
           <p class="found" id="endFound" hidden><span>${sv.stickers}</span><span class="stickers" id="endStickers"></span></p>
           <p class="next" id="endNext">${sv.end.next}</p>
           <button class="wide" id="endPhotos" type="button" hidden>▧ ${sv.photos.again}</button>
           <button class="wide go" id="endOnward" type="button" hidden>${PLAY}<span>${sv.end.onward}</span></button>
           <button class="wide go" id="endExplore" type="button" hidden><span aria-hidden="true">♧</span><span>${sv.explore.title}</span></button>
           <p class="code" id="endCode" hidden><span>${sv.code.next}</span><b id="endCodeWords"></b></p>
           <button class="wide" id="endAgain" type="button"><span>${sv.end.again}</span></button>
         </div>
       </div>
     </div>
     <div class="message" id="message" role="alertdialog" aria-modal="true" aria-label="${sv.recoveryTitle}" aria-describedby="messageText messageMore" tabindex="-1" hidden>
       <div class="message-ghost" id="messageGhost" aria-hidden="true"></div>
       <p id="messageText"></p>
       <p class="message-more" id="messageMore" hidden></p>
       <button id="messageButton" type="button"></button>
     </div>`,
  );
  const label = (id: string, text: string) => {
    const button = document.getElementById(id)!;
    button.querySelector('span')!.textContent = text;
    button.setAttribute('aria-label', text);
  };
  label('hopBtn', sv.hop);
  label('actBtn', sv.act);
  document.getElementById('bag')!.setAttribute('aria-label', sv.bag);
}
