import { chapterFor } from '../save/codes';
import { PLAYER_NAME_MAX, type PlayerProfile } from '../save/store';
import { holdToConfirm } from './hold';
import { stickerStyle } from './sticker';
import type { PlayStyle } from '../save/settings';
import { sv } from '../content/sv';
import { CROSS } from './icons';

/** The buttons that start the game from the title's front. */
const START_BUTTONS = ['startAventyr', 'startLugnt', 'startBtn'];

export interface TitleHandlers {
  onStart(style: PlayStyle | null): void;
  onStartOver(): boolean | void | Promise<boolean | void>;
  onCode(chapter: string): boolean | void;
  /** A code that opens nothing: two soft knocks, falling. */
  onCodeWrong?(): void;
  onSettings?(): void;
  onFront?(): void;
  onSelect?(id: string): boolean;
  onCreate?(name: string, style: PlayStyle): boolean;
  onDelete?(id: string): boolean | Promise<boolean>;
}

/** The four candy stickers a player can have as their picture, by `PlayerProfile.token`. */
const PLAYER_STICKERS = ['gelehallon', 'skumbanan', 'polkagris', 'gummibjorn'] as const;

export interface TitlePlayers {
  currentId: string;
  players: PlayerProfile[];
  available: boolean;
  unreadable: boolean;
}
export interface Title {
  readonly open: boolean;
  show(hasSave: boolean, players?: TitlePlayers): void;
  showStyles(): void;
  /**
   * A start pressed while the game still loads (docs/ux-audit/first-minutes.md row 1): that button keeps its word
   * and shows the loading ghost, the others dim. The game starts by itself once it has loaded.
   */
  waiting(style: PlayStyle | null): void;
  hide(): void;
  back(): void;
}

/**
 * Title and local player management. Names enter the DOM only as text, never as markup.
 * A first start offers the two play styles as its start buttons, one tap each; a saved game has *Fortsätt*. Under
 * either, round buttons for the players, the settings, a code and, once the story is told, *Utforska vidare*
 * (docs/ux-audit/first-minutes.md rows 7 and 12). Each page of the title has its way back at its top left (row 10).
 */
export function createTitle(doc: Document, handlers: TitleHandlers): Title {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const backdrop = byId('title');
  const sections = ['titleFront', 'titleStyles', 'titlePlayers', 'titleNewPlayer', 'titleConfirm', 'titleCode'];
  let open = false;
  let saved = false;
  let state: TitlePlayers = { currentId: 'elof', players: [], available: true, unreadable: false };
  let pendingName: string | null = null;
  let confirmAction: (() => boolean | void | Promise<boolean | void>) | null = null;
  let confirmReturn = 'titleFront';
  let busy = false;

  function section(id: string, focus: string): void {
    for (const name of sections) byId(name).hidden = name !== id;
    byId('playerError').hidden = true;
    byId(focus).focus();
  }
  function fail(): void { byId('playerError').hidden = false; }
  function showStyles(): void { section('titleStyles', 'firstAventyr'); }
  function front(): void {
    pendingName = null;
    byId('codeWrong').hidden = true;
    section('titleFront', state.unreadable ? 'playersBtn' : saved ? 'startBtn' : 'startAventyr');
    handlers.onFront?.();
  }
  function confirm(text: string, action: () => boolean | void | Promise<boolean | void>, from: string): void {
    byId('playerConfirmText').textContent = text;
    confirmAction = action;
    confirmReturn = from;
    section('titleConfirm', 'playerConfirmNo');
  }
  /** Taking a player away and starting over wait behind "Ändra" (first-minutes.md row 14). */
  const editing = (on: boolean) => {
    byId('titlePlayers').classList.toggle('editing', on);
    byId('playersEdit').setAttribute('aria-pressed', String(on));
  };
  function players(): void {
    const list = byId('playerList');
    list.replaceChildren();
    for (const player of state.players) {
      const row = doc.createElement('div');
      row.className = 'player-row';
      const select = doc.createElement('button');
      select.type = 'button';
      select.className = 'wide';
      select.dataset.player = player.id;
      // Each player's own candy sticker, and the name as typed, never as markup; the one playing now has Moa's
      // crayon loop round it.
      const token = doc.createElement('i');
      token.className = 'player-token kind';
      token.style.cssText = stickerStyle(PLAYER_STICKERS[player.token] ?? PLAYER_STICKERS[0]!);
      token.setAttribute('aria-hidden', 'true');
      const said = doc.createElement('span');
      said.textContent = `${player.name}${player.kind === 'unreadable' ? ` — ${sv.players.unreadable}` : ''}`;
      select.append(token, said);
      select.setAttribute('aria-current', String(player.id === state.currentId));
      select.addEventListener('click', () => {
        if (player.id === state.currentId) front();
        else if (!handlers.onSelect?.(player.id)) fail();
      });
      const remove = doc.createElement('button');
      remove.type = 'button';
      remove.className = 'wide player-remove';
      remove.innerHTML = CROSS;
      remove.setAttribute('aria-label', sv.players.remove.replace('{name}', player.name));
      remove.addEventListener('click', () => confirm(sv.players.removeAsk.replace('{name}', player.name), () => handlers.onDelete?.(player.id) ?? false, 'titlePlayers'));
      row.append(select, remove);
      list.append(row);
    }
    section('titlePlayers', 'playersBack');
  }
  byId('playersBtn').addEventListener('click', () => {
    if (state.players.length === 0 && !state.unreadable) byId('newPlayerBtn').click();
    else players();
  });
  byId('playersBack').addEventListener('click', () => { editing(false); front(); });
  byId('playersEdit').addEventListener('click', () => editing(byId('playersEdit').getAttribute('aria-pressed') !== 'true'));
  byId('newPlayerBtn').addEventListener('click', () => {
    byId<HTMLInputElement>('playerName').value = '';
    section('titleNewPlayer', 'playerName');
  });
  const name = byId<HTMLInputElement>('playerName');
  name.maxLength = PLAYER_NAME_MAX;
  byId('newPlayerBack').addEventListener('click', players);
  byId('newPlayerForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (!name.value.trim()) { name.focus(); return; }
    pendingName = name.value;
    showStyles();
  });
  byId('stylesBack').addEventListener('click', () => {
    if (pendingName !== null) section('titleNewPlayer', 'playerName');
    else front();
  });
  byId('startBtn').addEventListener('click', () => {
    pendingName = null;
    if (saved) handlers.onStart(null);
    else showStyles();
  });
  // A first start: the style is the start button.
  for (const [id, style] of [['startAventyr', 'aventyr'], ['startLugnt', 'lugnt']] as const) {
    byId(id).addEventListener('click', () => {
      pendingName = null;
      handlers.onStart(style);
    });
  }
  byId('titleSettingsBtn').addEventListener('click', () => handlers.onSettings?.());
  // Börja om från början is on the players' page, and its question goes back there (first-minutes.md row 7).
  byId('startOverBtn').addEventListener('click', () => confirm(sv.players.restartAsk.replace('{name}', state.players.find(p => p.id === state.currentId)?.name ?? 'Elof'), handlers.onStartOver, 'titlePlayers'));
  byId('playerConfirmNo').addEventListener('click', () => {
    if (busy) return;
    if (confirmReturn === 'titlePlayers') players();
    else front();
  });
  // What cannot be undone is confirmed by holding "Ja" while a ring fills (first-minutes.md rows 7 and 14).
  holdToConfirm(byId<HTMLButtonElement>('playerConfirmYes'), async () => {
    if (!confirmAction || busy) return;
    busy = true;
    byId<HTMLButtonElement>('playerConfirmYes').disabled = true;
    try { if (await confirmAction() === false) fail(); }
    finally { busy = false; byId<HTMLButtonElement>('playerConfirmYes').disabled = false; }
  });
  const form = byId<HTMLFormElement>('codeForm');
  // Three fields, one word each, moving on at a space; a whole code typed or pasted into one spreads over them
  // (docs/ux-audit/first-minutes.md row 15).
  const fields = ['codeInput', 'codeInput2', 'codeInput3'].map((id) => byId<HTMLInputElement>(id));
  const wrong = byId('codeWrong');
  const spread = (from: number) => {
    const words = fields[from]!.value.split(/[^\p{L}]+/u);
    if (words.length < 2) return;
    for (let i = 0; i < words.length && from + i < fields.length; i++) fields[from + i]!.value = words[i] ?? '';
    const next = fields.find((input, i) => i > from && input.value === '') ?? fields[Math.min(fields.length - 1, from + words.length - 1)]!;
    next.focus();
  };
  fields.forEach((input, i) => {
    input.addEventListener('input', () => { wrong.hidden = true; spread(i); });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && input.value === '' && i > 0) { event.preventDefault(); fields[i - 1]!.focus(); }
    });
  });
  // A code has a page of its own (first-minutes.md row 15).
  byId('codeBtn').addEventListener('click', () => {
    wrong.hidden = true;
    section('titleCode', 'codeInput');
  });
  byId('codeBack').addEventListener('click', front);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const chapter = chapterFor(fields.map((input) => input.value).join(' '));
    if (!chapter || handlers.onCode(chapter) === false) {
      wrong.hidden = false;
      handlers.onCodeWrong?.();
    }
  });
  for (const [id, style] of [['firstAventyr', 'aventyr'], ['firstLugnt', 'lugnt']] as const) {
    byId(id).addEventListener('click', () => {
      if (pendingName !== null) {
        if (!handlers.onCreate?.(pendingName, style)) fail();
      } else handlers.onStart(style);
    });
  }

  return {
    get open() { return open; },
    show(hasSave, playerState) {
      saved = hasSave;
      if (playerState) state = playerState;
      open = true;
      backdrop.dataset.saved = String(saved);
      backdrop.classList.remove('leaving', 'waiting');
      for (const id of START_BUTTONS) byId(id).classList.remove('pressed');
      for (const ghost of backdrop.querySelectorAll('.waiting-ghost')) ghost.remove();
      backdrop.hidden = false;
      // Nothing of the play shows under the title: no bag, corners or controls for a game not begun (row 8).
      doc.body.classList.add('at-title');
      // The player is named on the players' button, not on a line of their own (first-minutes.md row 13).
      const current = state.players.find(p => p.id === state.currentId);
      byId('currentPlayer').textContent = current?.name ?? sv.players.new;
      byId('startOverBtn').hidden = !saved && !state.unreadable;
      byId('playersBtn').hidden = !state.available && state.players.length === 0;
      const indexUnreadable = state.unreadable && state.players.length === 0;
      byId<HTMLButtonElement>('startOverBtn').disabled = indexUnreadable;
      byId('playerUnreadable').textContent = indexUnreadable ? sv.players.indexUnreadable : sv.players.preserved;
      byId<HTMLButtonElement>('newPlayerBtn').disabled = !state.available || indexUnreadable;
      for (const id of ['startBtn', 'startAventyr', 'startLugnt']) byId<HTMLButtonElement>(id).disabled = state.unreadable;
      byId<HTMLButtonElement>('codeBtn').disabled = state.unreadable;
      byId<HTMLButtonElement>('titleSettingsBtn').disabled = state.unreadable;
      byId('playerUnreadable').hidden = !state.unreadable;
      front();
    },
    showStyles,
    waiting(style) {
      const pressed = style === 'aventyr' ? 'startAventyr' : style === 'lugnt' ? 'startLugnt' : 'startBtn';
      backdrop.classList.add('waiting');
      for (const id of START_BUTTONS) byId(id).classList.toggle('pressed', id === pressed);
      const button = byId(pressed);
      if (button.querySelector('.waiting-ghost')) return;
      const ghost = doc.querySelector('#loading svg')?.cloneNode(true) as SVGElement | undefined;
      if (!ghost) return;
      ghost.classList.add('waiting-ghost');
      button.prepend(ghost);
    },
    back() {
      if (busy) return;
      if (!byId('titleConfirm').hidden) byId('playerConfirmNo').click();
      else if (!byId('titleStyles').hidden && pendingName !== null) section('titleNewPlayer', 'playerName');
      else if (!byId('titleNewPlayer').hidden) players();
      // From the code's page, too, Back goes to the front.
      else front();
    },
    hide() {
      open = false;
      doc.body.classList.remove('at-title');
      // The card lifts away over the picture as the game begins: one movement from the tap to the story
      // (first-minutes.md row 16). With less motion it only fades (ui.css).
      if (backdrop.hidden) return;
      backdrop.classList.add('leaving');
      doc.defaultView?.setTimeout(() => {
        backdrop.classList.remove('leaving');
        if (!open) backdrop.hidden = true;
      }, 400);
    },
  };
}
