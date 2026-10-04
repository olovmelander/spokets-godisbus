import { OWN_SWITCHES, settingsFor, type Graphics, type PlayStyle, type Settings, type Switch } from '../save/settings';
import type { HelpLevel } from '../sim/types';
import { sv } from '../content/sv';

/**
 * The pause panel (plan §6.10): Spela vidare, the play style and its switches, and "Jag har fastnat".
 * Its markup is built by the shell, so dev/menus.html shows the same panel as the game.
 */
export interface PauseHandlers {
  /** The player wants to go on: the ✕, the backdrop, or Spela vidare. */
  onResume(): void;
  /** A setting was changed. The panel stays open. */
  onSettings(settings: Settings, choice?: 'graphics'): void;
  /** "Jag har fastnat", answered with ✓: back to the last big candy. */
  onStuck(): void;
  onTitle?(): void;
}

export interface Pause {
  readonly open: boolean;
  show(settings: Settings, fromTitle?: boolean): void;
  hide(): void;
  /** Back from the reference/confirmation first; otherwise resume. */
  back(): void;
}

export function createPause(doc: Document, handlers: PauseHandlers): Pause {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const back = byId('pause');
  const styles: Record<PlayStyle, HTMLButtonElement> = { aventyr: byId('styleAventyr'), lugnt: byId('styleLugnt') };
  const switches: Record<Switch, HTMLInputElement> = {
    followFinger: byId('setFollowFinger'),
    swingHelp: byId('setSwingHelp'),
    easyJumps: byId('setEasyJumps'),
    slower: byId('setSlower'),
    sound: byId('setSound'),
    music: byId('setMusic'),
    lefty: byId('setLefty'),
    bigText: byId('setBigText'),
    calm: byId('setCalm'),
    loud: byId('setLoud'),
  };
  const levels: Record<HelpLevel, HTMLButtonElement> = { ask: byId('helpAsk'), remind: byId('helpRemind'), guide: byId('helpGuide') };
  const ask = byId('stuckAsk');
  const options = byId('pauseOptions');
  const reference = byId('controlsReference');
  const graphics: Record<Graphics, HTMLButtonElement> = {
    auto: byId('graphicsAuto'), low: byId('graphicsLow'), mid: byId('graphicsMid'), high: byId('graphicsHigh'),
  };
  let settings = settingsFor('aventyr');
  let open = false;

  function draw(): void {
    for (const [style, button] of Object.entries(styles)) {
      const chosen = settings.style === style;
      button.setAttribute('aria-checked', String(chosen));
      button.classList.toggle('on', chosen);
    }
    for (const [level, button] of Object.entries(levels)) {
      const chosen = settings.help === level;
      button.setAttribute('aria-checked', String(chosen));
      button.classList.toggle('on', chosen);
    }
    for (const [key, input] of Object.entries(switches) as [Switch, HTMLInputElement][]) input.checked = settings[key];
    for (const [choice, button] of Object.entries(graphics)) {
      button.setAttribute('aria-checked', String(settings.graphics === choice));
      button.classList.toggle('on', settings.graphics === choice);
    }
  }

  // Choosing a style sets its switches; each switch can then be changed on its own (plan §4.1).
  for (const [style, button] of Object.entries(styles) as [PlayStyle, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      settings = { ...settingsFor(style), graphics: settings.graphics, ...Object.fromEntries(OWN_SWITCHES.map((key) => [key, settings[key]])) };
      draw();
      handlers.onSettings(settings);
    });
  }
  for (const [level, button] of Object.entries(levels) as [HelpLevel, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      settings = { ...settings, help: level };
      draw();
      handlers.onSettings(settings);
    });
  }
  for (const [key, input] of Object.entries(switches) as [Switch, HTMLInputElement][]) {
    input.addEventListener('change', () => {
      settings = { ...settings, [key]: input.checked };
      handlers.onSettings(settings);
    });
  }
  for (const [choice, button] of Object.entries(graphics) as [Graphics, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      settings = { ...settings, graphics: choice };
      draw();
      handlers.onSettings(settings, 'graphics');
    });
  }

  function showReference(show: boolean): void {
    reference.hidden = !show;
    options.hidden = show;
    byId('pauseTitle').textContent = show ? sv.controls.title : sv.pause.title;
    byId(show ? 'controlsBack' : 'controlsReferenceBtn').focus();
  }
  function backOne(): void {
    if (!reference.hidden) showReference(false);
    else if (!ask.hidden) {
      ask.hidden = true;
      byId('stuckBtn').focus();
    } else handlers.onResume();
  }
  byId('controlsReferenceBtn').addEventListener('click', () => showReference(true));
  byId('controlsBack').addEventListener('click', () => showReference(false));

  byId('titleBtn').addEventListener('click', () => handlers.onTitle?.());
  byId('resumeBtn').addEventListener('click', () => handlers.onResume());
  byId('pauseClose').addEventListener('click', backOne);
  // A tap on the backdrop closes the panel; a tap inside it doesn't.
  back.addEventListener('click', (event) => {
    if (event.target === back) backOne();
  });
  byId('stuckBtn').addEventListener('click', () => {
    ask.hidden = false;
    byId('stuckYes').focus();
  });
  byId('stuckNo').addEventListener('click', () => {
    ask.hidden = true;
  });
  byId('stuckYes').addEventListener('click', () => handlers.onStuck());

  return {
    get open() {
      return open;
    },
    show(current, fromTitle = false) {
      byId('resumeBtn').querySelector('span')!.textContent = fromTitle ? sv.players.back : sv.pause.resume;
      for (const id of ['pauseMap', 'pauseAlbum', 'albumPhotos', 'stuckBtn', 'titleBtn']) byId(id).hidden = fromTitle;
      settings = current;
      open = true;
      ask.hidden = true;
      reference.hidden = true;
      options.hidden = false;
      byId('pauseTitle').textContent = sv.pause.title;
      draw();
      back.hidden = false;
      byId('resumeBtn').focus();
    },
    hide() {
      open = false;
      back.hidden = true;
    },
    back: backOne,
  };
}
