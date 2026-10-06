import { sceneUiHtml } from './scene';
import { sv } from '../content/sv';
import { endingHtml } from './ending';
import { photoAlbumHtml } from './photos';
import { storyPanelHtml } from './story';
import { BACK, CHECK, CROSS, NEXT, line, svg, use } from './icons';
import { keycapsOf } from './keys';

// Every picture on the page is a plain shape drawn in sprite.ts, here or in icons.ts: no logotypes, no brand marks
// (plan §0). The sprite's pictures are referenced by name; the helper's portraits and the bag stay here, drawn in the
// page itself, because the page moves their parts (the bag's fill) or counts them.
const HAND = use('hand');
const ARROW = use('hop');
const PAUSE = use('pause');
const PLAY = use('play');
/** The helper: a small bird, seen from the side. */
const BIRD = svg(
  `<path d="M4 14c0-4 3-7 7-7 2.2 0 4 .9 5.2 2.4L20 9l-2.4 2.6c.3.8.4 1.6.4 2.4 0 3-2.6 5-6.5 5H7c-1.7 0-3-2-3-5z" ${line} stroke-width="1.9"/><circle cx="13.8" cy="10.8" r="1" fill="currentColor"/><path d="M4.4 15.6 2 18m7.5 1v2.4m3.5-2.4v2.4" ${line} stroke-width="1.7"/>`,
);
/** The wooden ghost: round top, two painted eyes, two shoes, and its paper bag; no mouth. */
const GHOST = svg(`<path d="M6 17V9a6 6 0 0 1 12 0v8c0 2-2 3-6 3s-6-1-6-3z" ${line} stroke-width="1.8"/><circle cx="10" cy="8.5" r="1" fill="currentColor"/><circle cx="14.5" cy="8.5" r="1" fill="currentColor"/><path d="M7 21h3m4 0h3M15 12h6v6h-6z" ${line} stroke-width="1.7"/>`);
/** A paper bag with a folded top. The red inside rises as the bag fills (plan §4.3). */
const BAG =
  '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M8 15h32l-3 37H11z" fill="#f1dfb8"/><rect class="bag-fill" x="9" y="16" width="30" height="36" fill="#e8483f"/><path d="M8 15h32l-3 37H11z" fill="none" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 15l4-9 4 6 4-7 4 7 4-7 4 7 4-6 4 9z" fill="#f1dfb8" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/></svg>';
const COG = use('cog');
const FOLDED_MAP = use('map');
const PEOPLE = use('people');
const PLAYER_ADD = use('player-add');
const HOME = use('home');
const BIG_CANDY = use('big-candy');
const LEAP = use('leap');
const STROLL = use('stroll');
const TURN = use('turn');
const START_LEAP = use('start-leap');
const START_STROLL = use('start-stroll');
const TITLE_SIGN = use('sign', 'title-sign', '0 0 620 172');
const CAMERA = use('camera');

// The settings' pictures (docs/ux-audit/menus.md row 5): one line drawing for each row, in the ink of the words.
const SWING = use('swing');
const ARC = use('arc');
const EDGE = use('edge');
const HOURGLASS = use('hourglass');
const SNAIL = use('snail');
/** Ljud and Musik: the picture sounding, and with a slash when it is off; the row's state shows one of the two. */
const SPEAKER = `${use('speaker', 'sounding')}${use('speaker-off', 'slash')}`;
const NOTE = `${use('note', 'sounding')}${use('note-off', 'slash')}`;
const LOUD = use('loud');
const SWAP = use('swap');
const BUZZ = use('buzz');
const LETTERS = use('letters');
const STILL = use('still');
const CORNERS = use('corners');
const KEYBOARD = use('keyboard');
const ADD_PHONE = use('add-phone');
const TAG = use('tag');
const STICK = use('stick');
const CROSS_PAD = use('cross-pad');

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
  keys.split(' / ').map((choice) => choice.split(' + ').map(keycapsOf).join('<span class="key-plus">+</span>')).join('<span class="key-or">/</span>');
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
    `<button class="bag" id="bag" type="button">${BAG}<span class="bag-tag"><span id="bagCount">0</span><span class="stickers" id="bagStickers"></span></span></button>
     <button class="corner" id="pauseBtn" type="button" aria-label="${p.open}">${PAUSE}</button>
     <button class="corner help" id="helpBtn" type="button" aria-label="${sv.help}">${portrait}</button>
     <div class="controls" id="controls" hidden>
       <div class="stick-zone" id="stickZone">
         <div class="stick-base" id="stickBase"><div class="stick-knob" id="stickKnob"></div></div>
       </div>
       <button class="btn btn-act" id="actBtn" type="button" disabled>${HAND}<span></span></button>
       <button class="btn btn-hop" id="hopBtn" type="button">${ARROW}<span></span></button>
     </div>
     <div class="key-prompt" id="keyPrompt" aria-hidden="true"><kbd id="keyPromptKey">E</kbd>${HAND}<span id="keyPromptWord"></span></div>
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
             <button class="wide go" id="codeGo" type="submit" data-sound="press">${sv.code.open}</button>
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
           <button class="wide" id="newPlayerBtn" type="button">${PLAYER_ADD}<span>${sv.players.new}</span></button>
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
         <i class="title-loading" id="titleLoading" aria-hidden="true"></i>
       </div>
     </div>
     <div class="memory" id="memory" hidden><div class="memory-panel" role="dialog" aria-modal="true" aria-labelledby="memoryTitle"><button class="panel-close" id="memoryClose" type="button" aria-label="${p.close}">${CROSS}</button><h2 id="memoryTitle">${sv.memory}</h2><div class="memory-card" id="memoryCard" role="img" aria-label="${sv.memory}"></div><div class="memory-controls"><span id="memoryProgress" role="status"></span><button class="wide" id="memoryNext" type="button"><span>${sv.memories.next}</span>${NEXT}</button></div></div></div>
     ${photoAlbumHtml}
     ${endingHtml}
     ${storyPanelHtml}
     <div class="panel-back" id="endCard" hidden>
       <div class="panel end" role="dialog" aria-modal="true" aria-labelledby="endTitle">
         <div class="page-story">
           <figure class="page-picture" id="endPicture" hidden><span class="page-photo" id="endPhoto"></span><figcaption id="endStoryTitle"></figcaption></figure>
           <p class="page-kicker" id="endKicker" hidden></p>
           <h2 id="endTitle"></h2>
           <div class="story-handoff" id="endStory" hidden><p id="endStoryText"></p></div>
           <p class="next" id="endNext">${sv.end.next}</p>
         </div>
         <div class="page-tally">
           <div class="map" id="endMap"></div>
           <div class="rows" id="endRows"></div>
           <p class="count"><b id="endCount"></b> ${sv.end.candy}</p>
           <p class="found" id="endFound" hidden><span>${sv.stickers}</span><span class="stickers" id="endStickers"></span></p>
           <button class="wide" id="endPhotos" type="button" hidden>${CAMERA}<span>${sv.photos.again}</span></button>
           <button class="wide go" id="endOnward" type="button" hidden>${PLAY}<span>${sv.end.onward}</span></button>
           <button class="wide go" id="endExplore" type="button" hidden>${FOLDED_MAP}<span>${sv.explore.title}</span></button>
           <button class="wide" id="endAgain" type="button"><span>${sv.end.again}</span></button>
           <p class="code" id="endCode" hidden><span>${sv.code.next}</span><b id="endCodeWords"></b></p>
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
