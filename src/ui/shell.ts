import { sceneUiHtml } from './scene';
import { sv } from '../content/sv';
import { endingHtml } from './ending';
import { photoAlbumHtml } from './photos';
import { storyPanelHtml } from './story';

// Every picture on the page is a plain shape drawn here: no logotypes, no brand marks (plan §0).
const svg = (body: string, box = '0 0 24 24') => `<svg viewBox="${box}" aria-hidden="true">${body}</svg>`;
const line = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';

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
/** Back, to the page this one was opened from. */
const BACK = svg(`<path d="M20 12H5m0 0 6-6m-6 6 6 6" ${line} stroke-width="2.4"/>`);
/** Settings: a plain cog, with eight teeth. */
const COG = svg(`<path d="M10.2 4.6L10.6 1.7L13.4 1.7L13.8 4.6A7.6 7.6 0 0 1 15.9 5.5L18.3 3.7L20.3 5.7L18.5 8.1A7.6 7.6 0 0 1 19.4 10.2L22.3 10.6L22.3 13.4L19.4 13.8A7.6 7.6 0 0 1 18.5 15.9L20.3 18.3L18.3 20.3L15.9 18.5A7.6 7.6 0 0 1 13.8 19.4L13.4 22.3L10.6 22.3L10.2 19.4A7.6 7.6 0 0 1 8.1 18.5L5.7 20.3L3.7 18.3L5.5 15.9A7.6 7.6 0 0 1 4.6 13.8L1.7 13.4L1.7 10.6L4.6 10.2A7.6 7.6 0 0 1 5.5 8.1L3.7 5.7L5.7 3.7L8.1 5.5A7.6 7.6 0 0 1 10.2 4.6Z" ${line} stroke-width="1.8"/><circle cx="12" cy="12" r="3.2" ${line} stroke-width="1.8"/>`);
/** Utforska vidare: Moa's map, folded. */
const FOLDED_MAP = svg(`<path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z" ${line} stroke-width="2"/><path d="M9 4v13.5M15 6.5V20" ${line} stroke-width="2"/>`);
const CROSS = svg(`<path d="M6 6l12 12M18 6 6 18" ${line} stroke-width="2.6"/>`);
const PEOPLE = svg('<circle cx="8" cy="7" r="3" fill="currentColor"/><circle cx="17" cy="9" r="2.5" fill="currentColor"/><path d="M2 21v-4a6 6 0 0 1 12 0v4m1-7a5 5 0 0 1 7 5v2" fill="none" stroke="currentColor" stroke-width="2"/>');
const HOME = svg(`<path d="m2 11 10-9 10 9M5 9v13h14V9m-10 13v-8h6v8" ${line} stroke-width="2"/>`);
const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${line} stroke-width="2.8"/>`);
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
/** A paper bag with a folded top. The red inside rises as the bag fills (plan §4.3). */
const BAG =
  '<svg viewBox="0 0 48 56" aria-hidden="true"><path d="M8 15h32l-3 37H11z" fill="#f1dfb8"/><rect class="bag-fill" x="9" y="16" width="30" height="36" fill="#e8483f"/><path d="M8 15h32l-3 37H11z" fill="none" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/><path d="M8 15l4-9 4 6 4-7 4 7 4-7 4 7 4-6 4 9z" fill="#f1dfb8" stroke="#7b5a36" stroke-width="2.5" stroke-linejoin="round"/></svg>';

const p = sv.pause;

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
             <div class="styles" role="radiogroup" aria-labelledby="styleTitle">
               <button class="style" id="styleAventyr" type="button" role="radio">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
               <button class="style" id="styleLugnt" type="button" role="radio">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
             </div>
             <h4 id="helpTitle">${portrait}<span>${p.help}</span></h4>
             <div class="levels" role="radiogroup" aria-labelledby="helpTitle">
               <button class="level" id="helpAsk" type="button" role="radio">${p.helpAsk}</button>
               <button class="level" id="helpRemind" type="button" role="radio">${p.helpRemind}</button>
               <button class="level" id="helpGuide" type="button" role="radio">${p.helpGuide}</button>
             </div>
             <label class="switch"><input type="checkbox" id="setSwingHelp"><span>${p.swingHelp}</span></label>
             <label class="switch"><input type="checkbox" id="setEasyJumps"><span>${p.easyJumps}</span></label>
             <label class="switch"><input type="checkbox" id="setSlower"><span>${p.slower}</span></label>
           </section>
           <section class="group" aria-labelledby="groupSound">
             <h3 id="groupSound">${p.groups.sound}</h3>
             <label class="switch"><input type="checkbox" id="setSound"><span>${p.sound}</span></label>
             <div class="volume" role="group" aria-labelledby="effectsVolumeLabel">
               <span id="effectsVolumeLabel">${p.effectsVolume}</span><div class="volume-steps">
                 <button id="effectsVolumeDown" type="button" aria-label="${p.effectsQuieter}" aria-describedby="effectsVolumeValue">−</button>
                 <output id="effectsVolumeValue" aria-live="polite" aria-atomic="true">100 %</output>
                 <button id="effectsVolumeUp" type="button" aria-label="${p.effectsLouder}" aria-describedby="effectsVolumeValue">+</button>
               </div>
             </div>
             <label class="switch"><input type="checkbox" id="setMusic"><span>${p.music}</span></label>
             <div class="volume" role="group" aria-labelledby="musicVolumeLabel">
               <span id="musicVolumeLabel">${p.musicVolume}</span><div class="volume-steps">
                 <button id="musicVolumeDown" type="button" aria-label="${p.musicQuieter}" aria-describedby="musicVolumeValue">−</button>
                 <output id="musicVolumeValue" aria-live="polite" aria-atomic="true">100 %</output>
                 <button id="musicVolumeUp" type="button" aria-label="${p.musicLouder}" aria-describedby="musicVolumeValue">+</button>
               </div>
             </div>
             <label class="switch"><input type="checkbox" id="setLoud"><span>${p.loud}</span></label>
           </section>
           <section class="group" aria-labelledby="groupControls">
             <h3 id="groupControls">${p.groups.controls}</h3>
             <label class="switch"><input type="checkbox" id="setLefty"><span>${p.lefty}</span></label>
             <label class="switch"><input type="checkbox" id="setFollowFinger" aria-describedby="followHint"><span>${p.followFinger}</span></label>
             <p class="setting-hint" id="followHint">${p.followHint}</p>
             <label class="switch" id="vibrationSetting" hidden><input type="checkbox" id="setVibration"><span>${p.vibration}</span></label>
           </section>
           <section class="group" aria-labelledby="groupPicture">
             <h3 id="groupPicture">${p.groups.picture}</h3>
             <label class="switch"><input type="checkbox" id="setBigText"><span>${p.bigText}</span></label>
             <label class="switch"><input type="checkbox" id="setCalm"><span>${p.calm}</span></label>
             <button class="wide" id="fullscreenBtn" type="button" hidden>${p.fullscreen}</button>
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
             <button class="wide" id="controlsReferenceBtn" type="button">${sv.controls.title}</button>
             <details class="setting-hint" id="homeScreenHelp"><summary>${sv.homeScreen.title}</summary>
               <p>${sv.homeScreen.apple}</p><p>${sv.homeScreen.android}</p><p>${sv.homeScreen.offline}</p>
             </details>
           </section>
         </div>
         </div>
         <div class="controls-reference" id="controlsReference" hidden>
           <button class="wide" id="controlsBack" type="button">${sv.controls.back}</button>
           <h3>${sv.controls.keyboard}</h3>
           <dl>${sv.controls.keyboardRows.map(([key, action]) => `<div><dt>${key}</dt><dd>${action}</dd></div>`).join('')}</dl>
           <h3>${sv.controls.gamepad}</h3>
           <dl>${sv.controls.gamepadRows.map(([key, action]) => `<div><dt>${key}</dt><dd>${action}</dd></div>`).join('')}</dl>
         </div>
       </div>
     </div>
     <div class="panel-back title" id="title" hidden>
       <div class="panel" role="dialog" aria-modal="true" aria-labelledby="titleName">
         <div id="titleFront">
           <h1 id="titleName">${sv.title}</h1>
           <div class="story-title" id="titleStory" hidden><b id="titleStoryPurpose"></b><p id="titleStoryRecap"></p></div>
           <p class="rotate">${TURN}<span>${sv.start.rotate}</span></p>
           <p id="currentPlayer" class="current-player" hidden></p>
           <p id="playerUnreadable" role="status" hidden>${sv.players.preserved}</p>
           <button class="wide go" id="startBtn" type="button">${PLAY}<span class="begin">${sv.start.begin}</span><span class="resume">${sv.start.resume}</span></button>
           <button class="wide" id="playersBtn" type="button" hidden>${PEOPLE}<span>${sv.players.choose}</span></button>
           <button class="wide" id="titleSettingsBtn" type="button">${sv.players.settings}</button>
           <button class="wide small" id="startOverBtn" type="button" hidden>${sv.start.over}</button>
           <button class="wide small" id="codeBtn" type="button">${sv.code.have}</button>
           <button class="wide" id="titleExplore" type="button" hidden><span aria-hidden="true">♧</span><span>${sv.explore.title}</span></button>
           <form class="code-form" id="codeForm" hidden>
             <input id="codeInput" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" maxlength="40" aria-label="${sv.code.hint}" placeholder="${sv.code.hint}">
             <button class="wide go" id="codeGo" type="submit">${sv.code.open}</button>
             <p class="code-wrong" id="codeWrong" role="alert" hidden>${sv.code.wrong}</p>
           </form>
         </div>
         <div id="titleStyles" hidden>
           <button class="wide small" id="stylesBack" type="button">${sv.players.back}</button>
           <h2 id="howTitle">${sv.start.how}</h2>
           <div class="styles" role="group" aria-labelledby="howTitle">
             <button class="style" id="firstAventyr" type="button">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
             <button class="style" id="firstLugnt" type="button">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
           </div>
         </div>
         <div id="titlePlayers" hidden>
           <h2>${sv.players.choose}</h2>
           <button class="wide small" id="playersBack" type="button">${sv.players.back}</button>
           <div id="playerList"></div>
           <button class="wide" id="newPlayerBtn" type="button">${PEOPLE}<span>${sv.players.new}</span></button>
         </div>
         <div id="titleNewPlayer" hidden>
           <button class="wide small" id="newPlayerBack" type="button">${sv.players.back}</button>
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
     <div class="message" id="message" role="alertdialog" aria-modal="true" aria-label="${sv.recoveryTitle}" aria-describedby="messageText" hidden>
       <p id="messageText"></p>
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
