import { changeStyle, settingsFor, VOLUME_NAMES, type Graphics, type PlayStyle, type Settings, type Switch } from '../save/settings';
import type { HelpLevel } from '../sim/types';
import { sv } from '../content/sv';

/**
 * The pause panel (plan §6.10): a short first page (Moa's map and the story so far, Spela vidare, and four
 * tiles: Godispåsen, Jag har fastnat, Inställningar, Till startsidan), with the candy bag and the settings as
 * pages of their own under one header that stays put (docs/ux-audit/menus.md rows 1-4). Back returns to where
 * the panel was entered: a page opened straight from play goes straight back to play.
 * Its markup is built by the shell, so dev/menus.html shows the same panel as the game.
 */
export type PausePage = 'home' | 'bag' | 'settings' | 'reference';
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
  /** Opens the panel, on its first page or on `page`; from the title, on the settings. */
  show(settings: Settings, fromTitle?: boolean, page?: PausePage): void;
  /** Turns to a page while the panel is open. */
  page(page: PausePage): void;
  hide(): void;
  /** Back one step: the stuck question, then the page, then out of the panel. */
  back(): void;
}

export function createPause(doc: Document, handlers: PauseHandlers): Pause {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const back = byId('pause');
  const styles: Record<PlayStyle, HTMLButtonElement> = { aventyr: byId('styleAventyr'), lugnt: byId('styleLugnt') };
  const switches: Record<Switch, HTMLInputElement> = {
    followFinger: byId('setFollowFinger'),
    vibration: byId('setVibration'),
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
  const tiles = byId('pauseTiles');
  const options = byId('pauseOptions');
  const reference = byId('controlsReference');
  const pages: Record<Exclude<PausePage, 'reference'>, HTMLElement> = {
    home: byId('pauseHome'), bag: byId('pauseBagPage'), settings: byId('pauseSettingsPage'),
  };
  const titles: Record<PausePage, string> = { home: sv.pause.title, bag: sv.pause.bag, settings: sv.pause.settings, reference: sv.controls.title };
  const parentOf: Record<PausePage, PausePage | null> = { home: null, bag: 'home', settings: 'home', reference: 'settings' };
  let page: PausePage = 'home';
  let entry: PausePage = 'home';
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
    for (const key of VOLUME_NAMES) {
      byId(`${key}Value`).textContent = `${Math.round(settings[key] * 100)} %`;
      byId<HTMLButtonElement>(`${key}Down`).disabled = settings[key] <= 0;
      byId<HTMLButtonElement>(`${key}Up`).disabled = settings[key] >= 1;
    }
    for (const [choice, button] of Object.entries(graphics)) {
      button.setAttribute('aria-checked', String(settings.graphics === choice));
      button.classList.toggle('on', settings.graphics === choice);
    }
  }

  // Choosing a style sets its switches; each switch can then be changed on its own (plan §4.1).
  for (const [style, button] of Object.entries(styles) as [PlayStyle, HTMLButtonElement][]) {
    button.addEventListener('click', () => {
      settings = changeStyle(settings, style);
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
  for (const key of VOLUME_NAMES) {
    for (const [suffix, step] of [['Down', -1], ['Up', 1]] as const) {
      byId(`${key}${suffix}`).addEventListener('click', () => {
        settings = { ...settings, [key]: Math.max(0, Math.min(10, Math.round(settings[key] * 10) + step)) / 10 };
        draw();
        handlers.onSettings(settings);
      });
    }
  }

  /** Turns to a page: the header names it, and offers the way back to where it was opened from. */
  function go(next: PausePage, from?: PausePage): void {
    const returning = from !== undefined;
    page = next;
    for (const [name, element] of Object.entries(pages)) element.hidden = name !== next;
    options.hidden = next === 'reference';
    reference.hidden = next !== 'reference';
    byId('pauseTitle').textContent = titles[next];
    // The key reference has its own way back, so the header doesn't offer a second one.
    const up = next === entry || next === 'reference' ? null : parentOf[next];
    byId('pauseBack').hidden = up === null;
    if (up) byId('pauseBackWord').textContent = titles[up];
    if (next !== 'home') stuck(false);
    byId<HTMLElement>('pause').querySelector<HTMLElement>('.panel')!.scrollTop = 0;
    // Focus where the hand is wanted: coming back, on the tile that opened the page left behind.
    const focus = returning && next === 'home' ? (from === 'bag' ? 'pauseBagBtn' : from === 'settings' ? 'pauseSettingsBtn' : 'resumeBtn')
      : returning && next === 'settings' ? 'controlsReferenceBtn'
        : next === 'home' ? 'resumeBtn' : next === 'bag' ? 'pauseAlbum' : next === 'settings' ? (settings.style === 'lugnt' ? 'styleLugnt' : 'styleAventyr') : 'controlsBack';
    byId(focus).focus({ preventScroll: true });
  }
  /** "Jag har fastnat" asks in place of the tiles, so ✓ and ✕ come where the finger was. */
  function stuck(asking: boolean): void {
    ask.hidden = !asking;
    tiles.hidden = asking;
    if (asking) byId('stuckYes').focus();
  }
  function backOne(): void {
    if (!ask.hidden) {
      stuck(false);
      byId('stuckBtn').focus();
    } else if (page !== entry && parentOf[page]) go(parentOf[page]!, page);
    else handlers.onResume();
  }
  byId('controlsReferenceBtn').addEventListener('click', () => go('reference'));
  byId('controlsBack').addEventListener('click', () => go('settings', 'reference'));
  byId('pauseBagBtn').addEventListener('click', () => go('bag'));
  byId('pauseSettingsBtn').addEventListener('click', () => go('settings'));
  byId('pauseBack').addEventListener('click', () => { if (parentOf[page]) go(parentOf[page]!, page); });

  byId('titleBtn').addEventListener('click', () => handlers.onTitle?.());
  byId('resumeBtn').addEventListener('click', () => handlers.onResume());
  // The ✕ always closes the panel, from any page.
  byId('pauseClose').addEventListener('click', () => handlers.onResume());
  // A tap on the backdrop goes back as Escape does; a tap inside the panel doesn't.
  back.addEventListener('click', (event) => {
    if (event.target === back) backOne();
  });
  byId('stuckBtn').addEventListener('click', () => stuck(true));
  byId('stuckNo').addEventListener('click', () => {
    stuck(false);
    byId('stuckBtn').focus();
  });
  byId('stuckYes').addEventListener('click', () => handlers.onStuck());

  return {
    get open() {
      return open;
    },
    show(current, fromTitle = false, start: PausePage = fromTitle ? 'settings' : 'home') {
      settings = current;
      open = true;
      entry = start;
      ask.hidden = true;
      tiles.hidden = false;
      draw();
      back.hidden = false;
      go(start);
    },
    page(next) {
      if (open) go(next);
    },
    hide() {
      open = false;
      back.hidden = true;
    },
    back: backOne,
  };
}
