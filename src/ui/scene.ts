import { sv } from '../content/sv';
import type { SceneDef, SceneFrame, SceneStage } from '../sim/scene';

/**
 * What a scene lays over the picture (src/sim/scene.ts): thin dark bars while it tells, a fade from or to black,
 * a card with the time of day, and the game's own name. Nothing here takes a press or a focus: a scene is
 * watched, and the play goes on under it as soon as it ends.
 */
export const sceneUiHtml = `<div class="scene-ui" id="sceneUi" aria-hidden="true">
  <i class="scene-bar top"></i><i class="scene-bar bottom"></i>
  <i class="scene-fade" id="sceneFade"></i>
  <p class="scene-caption" id="sceneCaption"></p>
  <h1 class="scene-title" id="sceneTitle"></h1>
</div>`;

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** How dark the picture is at a moment of a scene, from its fade keys: each eases on from where it was. */
export function fadeAt(keys: NonNullable<SceneStage['fade']>, seconds: number): number {
  let dark = 0;
  for (const [i, key] of keys.entries()) {
    if (key.at > seconds) break;
    const next = keys[i + 1];
    const until = next && next.at <= seconds ? next.at : seconds;
    dark += (key.to - dark) * smooth((until - key.at) / (key.move ?? 0.8));
  }
  return dark;
}

export function createSceneUi(doc: Document) {
  const byId = (id: string) => doc.getElementById(id)!;
  const fade = byId('sceneFade');
  const caption = byId('sceneCaption');
  const title = byId('sceneTitle');
  const words: Record<string, string> = sv.scene;
  let shown = { bars: false, fade: -1, caption: '', captionOn: -1, title: '', titleOn: -1 };
  return {
    /** One frame: the scene playing now (or null), and whether a menu covers the picture. */
    show(scenes: readonly SceneDef[] | undefined, frame: SceneFrame | null, covered: boolean) {
      const scene = frame ? scenes?.find((def) => def.id === frame.id) : undefined;
      const t = frame?.seconds ?? 0;
      const bars = !covered && scene !== undefined && (scene.stage?.bars ?? scene.hold === true);
      if (bars !== shown.bars) doc.body.classList.toggle('scene-bars', bars);
      const dark = scene?.stage?.fade ? fadeAt(scene.stage.fade, t) : 0;
      if (Math.abs(dark - shown.fade) > 0.002) fade.style.opacity = String(dark);
      let captionText = '', captionOn = 0, titleText = '', titleOn = 0;
      for (const word of scene?.stage?.words ?? []) {
        const age = t - word.at;
        if (age < 0 || age > word.seconds) continue;
        const on = Math.min(1, age / 0.6, (word.seconds - age) / 0.6);
        if (word.kind === 'caption') { captionText = words[word.text] ?? ''; captionOn = on; }
        else { titleText = words[word.text] ?? ''; titleOn = on; }
      }
      if (captionText !== shown.caption) {
        // The place in large letters and the time of day under it; the dot stays in the text for anyone who
        // reads it aloud.
        const [place, time] = captionText.split(' · ');
        caption.replaceChildren();
        const line = (cls: string, text: string) => {
          const span = doc.createElement('span');
          span.className = cls;
          span.textContent = text;
          caption.append(span);
        };
        if (place) line('place', place);
        if (time) { line('dot', ' · '); line('time', time); }
      }
      // A chapter's card has the screen to itself: the play's corners step aside while it shows.
      const card = scene?.id === 'card' && captionOn > 0;
      if (card !== doc.body.classList.contains('scene-card')) doc.body.classList.toggle('scene-card', card);
      if (Math.abs(captionOn - shown.captionOn) > 0.002) caption.style.opacity = String(captionOn);
      if (titleText !== shown.title) title.textContent = titleText;
      if (Math.abs(titleOn - shown.titleOn) > 0.002) title.style.opacity = String(titleOn);
      shown = { bars, fade: dark, caption: captionText, captionOn, title: titleText, titleOn };
    },
  };
}
