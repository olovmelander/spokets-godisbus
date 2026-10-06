import { chapterFor } from '../save/codes';
import { PLAYER_NAME_MAX, type PlayerProfile } from '../save/store';
import type { PlayStyle } from '../save/settings';
import { sv } from '../content/sv';

/** The buttons that start the game from the title's front. */
const START_BUTTONS = ['startAventyr', 'startLugnt', 'startBtn'];

export interface TitleHandlers {
  onStart(style: PlayStyle | null): void;
  onStartOver(): boolean | void | Promise<boolean | void>;
  onCode(chapter: string): boolean | void;
  onSettings?(): void;
  onFront?(): void;
  onSelect?(id: string): boolean;
  onCreate?(name: string, style: PlayStyle): boolean;
  onDelete?(id: string): boolean | Promise<boolean>;
}

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
      select.textContent = `${player.id === state.currentId ? '● ' : '○ '}${player.name}${player.kind === 'unreadable' ? ` — ${sv.players.unreadable}` : ''}`;
      select.setAttribute('aria-current', String(player.id === state.currentId));
      select.addEventListener('click', () => {
        if (player.id === state.currentId) front();
        else if (!handlers.onSelect?.(player.id)) fail();
      });
      const remove = doc.createElement('button');
      remove.type = 'button';
      remove.className = 'wide player-remove';
      remove.textContent = '×';
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
  byId('playersBack').addEventListener('click', front);
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
  byId('playerConfirmYes').addEventListener('click', async () => {
    if (!confirmAction || busy) return;
    busy = true;
    byId<HTMLButtonElement>('playerConfirmYes').disabled = true;
    try { if (await confirmAction() === false) fail(); }
    finally { busy = false; byId<HTMLButtonElement>('playerConfirmYes').disabled = false; }
  });
  const form = byId<HTMLFormElement>('codeForm');
  const field = byId<HTMLInputElement>('codeInput');
  const wrong = byId('codeWrong');
  // A code has a page of its own (first-minutes.md row 15).
  byId('codeBtn').addEventListener('click', () => {
    wrong.hidden = true;
    section('titleCode', 'codeInput');
  });
  byId('codeBack').addEventListener('click', front);
  field.addEventListener('input', () => (wrong.hidden = true));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const chapter = chapterFor(field.value);
    if (!chapter || handlers.onCode(chapter) === false) wrong.hidden = false;
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
      // (first-minutes.md row 16). Without motion it simply goes.
      const still = doc.body.classList.contains('calm') || doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (still || backdrop.hidden) { backdrop.hidden = true; return; }
      backdrop.classList.add('leaving');
      doc.defaultView?.setTimeout(() => {
        backdrop.classList.remove('leaving');
        if (!open) backdrop.hidden = true;
      }, 400);
    },
  };
}
