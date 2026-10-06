import { changeStyle, settingsFor, styleOf, VOLUME_NAMES, type Graphics, type PlayStyle, type Settings, type Switch, type Volume } from '../save/settings';
import type { HelpLevel } from '../sim/types';
import { sv } from '../content/sv';

/**
 * The pause panel (plan §6.10): a short first page (Moa's map and the story so far, Spela vidare, and four
 * tiles: Godispåsen, Jag har fastnat, Inställningar, Till startsidan), with the candy bag and the settings as
 * pages of their own under one header that stays put (docs/ux-audit/menus.md rows 1-4). Back returns to where
 * the panel was entered: a page opened straight from play goes straight back to play.
 * The settings are rows with a picture each (rows 5-10). In a choice of several, the arrow keys and the pad's
 * left and right move the choice, and the sounds' pips take the arrows too (row 22).
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
    stopAtEdges: byId('setStopAtEdges'),
    gentle: byId('setGentle'),
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
  const p = sv.pause;
  const titles: Record<PausePage, string> = { home: p.title, bag: p.bag, settings: p.settings, reference: sv.controls.title };
  const parentOf: Record<PausePage, PausePage | null> = { home: null, bag: 'home', settings: 'home', reference: 'settings' };
  let page: PausePage = 'home';
  let entry: PausePage = 'home';
  const graphics: Record<Graphics, HTMLButtonElement> = {
    auto: byId('graphicsAuto'), low: byId('graphicsLow'), mid: byId('graphicsMid'), high: byId('graphicsHigh'),
  };
  /** Each sound: its pips, the switch that mutes it, and its row. */
  const sounds: Record<Volume, { pips: HTMLElement; on: Switch; row: HTMLElement }> = {
    effectsVolume: { pips: byId('effectsVolume'), on: 'sound', row: byId('effectsRow') },
    musicVolume: { pips: byId('musicVolume'), on: 'music', row: byId('musicRow') },
  };
  let settings = settingsFor('aventyr');
  let open = false;

  /** How many of the five pips a level fills. */
  const pipsOf = (level: number) => Math.round(level * 5);
  /** Marks the chosen one of a choice; the chosen one, or else the first, is the choice's one Tab stop. */
  function choose(buttons: HTMLButtonElement[], chosen: HTMLButtonElement | undefined): void {
    const stop = chosen && !chosen.disabled ? chosen : buttons.find((button) => !button.disabled);
    for (const button of buttons) {
      button.setAttribute('aria-checked', String(button === chosen));
      button.classList.toggle('on', button === chosen);
      button.tabIndex = button === stop ? 0 : -1;
    }
  }

  function draw(): void {
    // A help changed on its own makes the style the player's own: neither card is chosen (menus.md row 7).
    const style = styleOf(settings);
    choose(Object.values(styles), style ? styles[style] : undefined);
    byId('styleSays').textContent = p.styleSays[style ?? 'own'];
    choose(Object.values(levels), levels[settings.help]);
    for (const [key, input] of Object.entries(switches) as [Switch, HTMLInputElement][]) input.checked = settings[key];
    for (const [key, sound] of Object.entries(sounds) as [Volume, (typeof sounds)[Volume]][]) {
      const filled = pipsOf(settings[key]);
      sound.pips.setAttribute('aria-valuenow', String(filled));
      sound.pips.setAttribute('aria-valuetext', p.pips.replace('{n}', String(filled)));
      sound.pips.querySelectorAll('i').forEach((pip, i) => pip.classList.toggle('on', i < filled));
      sound.row.classList.toggle('muted', !settings[sound.on]);
    }
    choose(Object.values(graphics), graphics[settings.graphics]);
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
      // A help changed on its own changes the style's cards too, and a mute its sound's row.
      draw();
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
  /** Sets a sound's level in fifths: one pip at the least, as the picture beside it is the way to silence. */
  function setPips(key: Volume, filled: number): void {
    const level = Math.max(1, Math.min(5, filled)) / 5;
    if (level === settings[key]) return;
    settings = { ...settings, [key]: level };
    draw();
    handlers.onSettings(settings);
  }
  for (const key of VOLUME_NAMES) {
    const pips = sounds[key].pips;
    // A tap chooses the pip under it, or the nearest: the whole row is the target, in five parts.
    pips.addEventListener('click', (event) => {
      const box = pips.getBoundingClientRect();
      if (event.detail === 0 || box.width <= 0) return; // a pad's A or a key's Enter: the arrows set the level
      setPips(key, Math.ceil(((event.clientX - box.left) / box.width) * 5));
    });
    pips.addEventListener('keydown', (event) => {
      const filled = pipsOf(settings[key]);
      const next = { ArrowLeft: filled - 1, ArrowDown: filled - 1, ArrowRight: filled + 1, ArrowUp: filled + 1, Home: 1, End: 5 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      setPips(key, next);
    });
  }
  // In a choice of several the arrows move the choice, as in any group of radio buttons (menus.md row 22).
  for (const group of [Object.values(styles), Object.values(levels), Object.values(graphics)]) {
    for (const button of group) {
      button.addEventListener('keydown', (event) => {
        const step = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[event.key];
        if (!step) return;
        event.preventDefault();
        const usable = group.filter((other) => !other.disabled);
        const next = usable[(usable.indexOf(button) + step + usable.length) % usable.length];
        if (!next || next === button) return;
        next.focus();
        next.click();
      });
    }
  }

  /**
   * Turns to a page: the header names it, and offers the way back to where it was opened from. Inside the open
   * panel the page turns in from the side it comes from (docs/ux-audit/menus.md row 20); opening doesn't turn.
   */
  function go(next: PausePage, from?: PausePage, turn = true): void {
    const returning = from !== undefined;
    page = next;
    for (const [name, element] of Object.entries(pages)) element.hidden = name !== next;
    options.hidden = next === 'reference';
    reference.hidden = next !== 'reference';
    const shown = next === 'reference' ? reference : pages[next];
    shown.classList.toggle('turn', turn && !returning);
    shown.classList.toggle('turn-back', turn && returning);
    byId('pauseTitle').textContent = titles[next];
    const up = next === entry ? null : parentOf[next];
    byId('pauseBack').hidden = up === null;
    if (up) {
      byId('pauseBackWord').textContent = titles[up];
      byId('pauseBack').setAttribute('aria-label', p.backTo.replace('{page}', titles[up]));
    }
    if (next !== 'home') stuck(false);
    byId<HTMLElement>('pause').querySelector<HTMLElement>('.panel')!.scrollTop = 0;
    // Focus where the hand is wanted: coming back, on the tile that opened the page left behind.
    const focus = returning && next === 'home' ? (from === 'bag' ? 'pauseBagBtn' : from === 'settings' ? 'pauseSettingsBtn' : 'resumeBtn')
      : returning && next === 'settings' ? 'controlsReferenceBtn'
        : next === 'home' ? 'resumeBtn' : next === 'bag' ? 'pauseAlbum' : next === 'settings' ? (styles.lugnt.tabIndex === 0 ? 'styleLugnt' : 'styleAventyr') : 'pauseBack';
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
      go(start, undefined, false);
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
