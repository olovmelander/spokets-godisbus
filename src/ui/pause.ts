import { settingsFor, type PlayStyle, type Settings } from '../save/settings';
import type { HelpLevel } from '../sim/types';

/**
 * The pause panel (plan §6.10): Spela vidare, the play style and its switches, and "Jag har fastnat".
 * Its markup is built by the shell, so dev/menus.html shows the same panel as the game.
 */
export interface PauseHandlers {
  /** The player wants to go on: the ✕, the backdrop, or Spela vidare. */
  onResume(): void;
  /** A setting was changed. The panel stays open. */
  onSettings(settings: Settings): void;
  /** "Jag har fastnat", answered with ✓: back to the last big candy. */
  onStuck(): void;
}

export interface Pause {
  readonly open: boolean;
  show(settings: Settings): void;
  hide(): void;
}

export function createPause(doc: Document, handlers: PauseHandlers): Pause {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const back = byId('pause');
  const styles: Record<PlayStyle, HTMLButtonElement> = { aventyr: byId('styleAventyr'), lugnt: byId('styleLugnt') };
  const switches = {
    swingHelp: byId<HTMLInputElement>('setSwingHelp'),
    easyJumps: byId<HTMLInputElement>('setEasyJumps'),
    slower: byId<HTMLInputElement>('setSlower'),
    sound: byId<HTMLInputElement>('setSound'),
    music: byId<HTMLInputElement>('setMusic'),
  };
  const levels: Record<HelpLevel, HTMLButtonElement> = { ask: byId('helpAsk'), remind: byId('helpRemind'), guide: byId('helpGuide') };
  const ask = byId('stuckAsk');
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
    switches.swingHelp.checked = settings.swingHelp;
    switches.easyJumps.checked = settings.easyJumps;
    switches.slower.checked = settings.slower;
    switches.sound.checked = settings.sound;
    switches.music.checked = settings.music;
  }

  // Choosing a style sets its switches; each switch can then be changed on its own (plan §4.1).
  for (const [style, button] of Object.entries(styles) as [PlayStyle, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      settings = { ...settingsFor(style), slower: settings.slower, sound: settings.sound, music: settings.music };
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
  for (const [key, input] of Object.entries(switches) as [keyof typeof switches, HTMLInputElement][]) {
    input.addEventListener('change', () => {
      settings = { ...settings, [key]: input.checked };
      handlers.onSettings(settings);
    });
  }

  byId('resumeBtn').addEventListener('click', () => handlers.onResume());
  byId('pauseClose').addEventListener('click', () => handlers.onResume());
  // A tap on the backdrop closes the panel; a tap inside it doesn't.
  back.addEventListener('click', (event) => {
    if (event.target === back) handlers.onResume();
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
    show(current) {
      settings = current;
      open = true;
      ask.hidden = true;
      draw();
      back.hidden = false;
      byId('resumeBtn').focus();
    },
    hide() {
      open = false;
      back.hidden = true;
    },
  };
}
