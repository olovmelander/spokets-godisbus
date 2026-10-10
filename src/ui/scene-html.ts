import { sv } from '../content/sv';

/** Static scene shell; safe to render at build time as well as in the menu workbench. */
export const sceneUiHtml = `<div class="scene-ui" id="sceneUi" aria-hidden="true">
  <i class="scene-bar top"></i><i class="scene-bar bottom"></i>
  <i class="scene-fade" id="sceneFade"></i>
  <p class="scene-caption" id="sceneCaption"></p>
  <h1 class="scene-title" id="sceneTitle"></h1>
</div>
<div class="scene-reading" id="sceneReading" hidden>
  <div class="scene-reading-copy"><strong id="sceneMoment" hidden></strong><span>${sv.dialogue.pace}</span></div>
  <button id="sceneNext" type="button" aria-describedby="bubbleWho bubbleLine"><span>${sv.dialogue.next}</span><kbd id="sceneNextKey"></kbd><svg class="i" aria-hidden="true"><use href="#i-next"/></svg></button>
</div>
<p class="sr-only" id="sceneSaid" role="status" aria-live="polite"></p>`;
