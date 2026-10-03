import { sv } from '../content/sv';

const HAND =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-3.5a1.5 1.5 0 0 1 3 0V10m0-2a1.5 1.5 0 0 1 3 0v6.5A6.5 6.5 0 0 1 11.5 21 6 6 0 0 1 6.7 18.6L4 14.5a1.5 1.5 0 0 1 2.4-1.8L9 15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ARROW =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V5m0 0-6 6m6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/**
 * Builds everything that lies over the game view: the on-screen controls, the hint, the debug text and
 * the message. The game page and dev/menus.html both call it, so the preview can't drift from the game.
 */
export function mountShell(root: HTMLElement): void {
  root.insertAdjacentHTML(
    'beforeend',
    `<div class="controls" id="controls" hidden>
       <div class="stick-zone" id="stickZone">
         <div class="stick-base" id="stickBase"><div class="stick-knob" id="stickKnob"></div></div>
       </div>
       <button class="btn btn-act" id="actBtn" type="button" disabled>${HAND}<span></span></button>
       <button class="btn btn-hop" id="hopBtn" type="button">${ARROW}<span></span></button>
     </div>
     <div class="hint" id="hint" hidden></div>
     <pre class="debug" id="debug" hidden></pre>
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
}
