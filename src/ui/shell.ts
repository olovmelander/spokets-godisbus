import { sv } from '../content/sv';

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
const CROSS = svg(`<path d="M6 6l12 12M18 6 6 18" ${line} stroke-width="2.6"/>`);
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
export function mountShell(root: HTMLElement): void {
  root.insertAdjacentHTML(
    'beforeend',
    `<button class="bag" id="bag" type="button">${BAG}<span id="bagCount">0</span><span class="stickers" id="bagStickers"></span></button>
     <button class="corner" id="pauseBtn" type="button" aria-label="${p.open}">${PAUSE}</button>
     <button class="corner help" id="helpBtn" type="button" aria-label="${sv.help}">${BIRD}</button>
     <div class="controls" id="controls" hidden>
       <div class="stick-zone" id="stickZone">
         <div class="stick-base" id="stickBase"><div class="stick-knob" id="stickKnob"></div></div>
       </div>
       <button class="btn btn-act" id="actBtn" type="button" disabled>${HAND}<span></span></button>
       <button class="btn btn-hop" id="hopBtn" type="button">${ARROW}<span></span></button>
     </div>
     <div class="bubble" id="bubble" role="status" hidden><b id="bubbleWho"></b><span id="bubbleLine"></span></div>
     <div class="hint" id="hint" hidden></div>
     <div class="notice" id="notice" role="status" hidden></div>
     <pre class="debug" id="debug" hidden></pre>
     <div class="panel-back" id="pause" hidden>
       <div class="panel" role="dialog" aria-modal="true" aria-labelledby="pauseTitle">
         <button class="panel-close" id="pauseClose" type="button" aria-label="${p.close}">${CROSS}</button>
         <h2 id="pauseTitle">${p.title}</h2>
         <div class="pause-options" id="pauseOptions">
         <button class="wide go" id="resumeBtn" type="button">${PLAY}<span>${p.resume}</span></button>
         <h3 id="styleTitle">${p.style}</h3>
         <div class="styles" role="radiogroup" aria-labelledby="styleTitle">
           <button class="style" id="styleAventyr" type="button" role="radio">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
           <button class="style" id="styleLugnt" type="button" role="radio">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
         </div>
         <label class="switch"><input type="checkbox" id="setSwingHelp"><span>${p.swingHelp}</span></label>
         <label class="switch"><input type="checkbox" id="setEasyJumps"><span>${p.easyJumps}</span></label>
         <label class="switch"><input type="checkbox" id="setFollowFinger" aria-describedby="followHint"><span>${p.followFinger}</span></label>
         <p class="setting-hint" id="followHint">${p.followHint}</p>
         <label class="switch"><input type="checkbox" id="setSlower"><span>${p.slower}</span></label>
         <label class="switch"><input type="checkbox" id="setSound"><span>${p.sound}</span></label>
         <label class="switch"><input type="checkbox" id="setMusic"><span>${p.music}</span></label>
         <label class="switch"><input type="checkbox" id="setLoud"><span>${p.loud}</span></label>
         <label class="switch"><input type="checkbox" id="setLefty"><span>${p.lefty}</span></label>
         <label class="switch"><input type="checkbox" id="setBigText"><span>${p.bigText}</span></label>
         <label class="switch"><input type="checkbox" id="setCalm"><span>${p.calm}</span></label>
         <h3 id="graphicsTitle">${p.graphics}</h3>
         <div class="levels graphics" role="radiogroup" aria-labelledby="graphicsTitle" aria-describedby="graphicsHint">
           <button class="level" id="graphicsAuto" type="button" role="radio">${p.graphicsAuto}</button>
           <button class="level" id="graphicsLow" type="button" role="radio">${p.graphicsLow}</button>
           <button class="level" id="graphicsMid" type="button" role="radio">${p.graphicsMid}</button>
           <button class="level" id="graphicsHigh" type="button" role="radio">${p.graphicsHigh}</button>
         </div>
         <p class="setting-hint" id="graphicsHint">${p.graphicsHint}</p>
         <p class="setting-hint" id="graphicsFallback" role="status" hidden>${p.graphicsFallback}</p>
         <button class="wide" id="controlsReferenceBtn" type="button">${sv.controls.title}</button>
         <h3 id="helpTitle">${BIRD}<span>${p.help}</span></h3>
         <div class="levels" role="radiogroup" aria-labelledby="helpTitle">
           <button class="level" id="helpAsk" type="button" role="radio">${p.helpAsk}</button>
           <button class="level" id="helpRemind" type="button" role="radio">${p.helpRemind}</button>
           <button class="level" id="helpGuide" type="button" role="radio">${p.helpGuide}</button>
         </div>
         <div class="map" id="pauseMap"></div>
         <div class="album" id="pauseAlbum" tabindex="-1"></div>
         <button class="wide" id="stuckBtn" type="button">${BIG_CANDY}<span>${p.stuck}</span></button>
         <div class="ask" id="stuckAsk" hidden>
           <p>${p.stuckAsk}</p>
           <button class="yes" id="stuckYes" type="button" aria-label="${p.stuckYes}">${CHECK}${BIG_CANDY}</button>
           <button class="no" id="stuckNo" type="button" aria-label="${p.stuckNo}">${CROSS}${PLAY}</button>
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
           <p class="rotate">${TURN}<span>${sv.start.rotate}</span></p>
           <button class="wide go" id="startBtn" type="button">${PLAY}<span class="begin">${sv.start.begin}</span><span class="resume">${sv.start.resume}</span></button>
           <button class="wide small" id="startOverBtn" type="button" hidden>${sv.start.over}</button>
           <button class="wide small" id="codeBtn" type="button">${sv.code.have}</button>
           <form class="code-form" id="codeForm" hidden>
             <input id="codeInput" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="go" maxlength="40" aria-label="${sv.code.hint}" placeholder="${sv.code.hint}">
             <button class="wide go" id="codeGo" type="submit">${sv.code.open}</button>
             <p class="code-wrong" id="codeWrong" role="alert" hidden>${sv.code.wrong}</p>
           </form>
         </div>
         <div id="titleStyles" hidden>
           <h2 id="howTitle">${sv.start.how}</h2>
           <div class="styles" role="group" aria-labelledby="howTitle">
             <button class="style" id="firstAventyr" type="button">${LEAP}<b>${p.aventyr}</b><small>${p.aventyrHint}</small></button>
             <button class="style" id="firstLugnt" type="button">${STROLL}<b>${p.lugnt}</b><small>${p.lugntHint}</small></button>
           </div>
         </div>
       </div>
     </div>
     <div class="memory" id="memory" role="img" hidden><div class="memory-card" id="memoryCard"></div></div>
     <div class="panel-back" id="endCard" hidden>
       <div class="panel end" role="dialog" aria-modal="true" aria-labelledby="endTitle">
         <h2 id="endTitle"></h2>
         <div class="rows" id="endRows"></div>
         <p class="count"><b id="endCount"></b> ${sv.end.candy}</p>
         <p class="found" id="endFound" hidden><span>${sv.stickers}</span><span class="stickers" id="endStickers"></span></p>
         <div class="map" id="endMap"></div>
         <p class="next" id="endNext">${sv.end.next}</p>
         <button class="wide go" id="endOnward" type="button" hidden>${PLAY}<span>${sv.end.onward}</span></button>
         <p class="code" id="endCode" hidden><span>${sv.code.next}</span><b id="endCodeWords"></b></p>
         <button class="wide" id="endAgain" type="button"><span>${sv.end.again}</span></button>
       </div>
     </div>
     <div class="message" id="message" hidden>
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
