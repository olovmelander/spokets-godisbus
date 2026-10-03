import type { PlayStyle } from '../save/settings';

/**
 * The title, and the first start (plan §6.10).
 * - With a saved game: **Fortsätt**, and a smaller *Börja om från början*.
 * - Without one: **Börja**, and then the two play styles as pictures (plan §4.1). Choosing one starts the game.
 * Its markup is built by the shell, so dev/menus.html shows the same screens as the game.
 */
export interface TitleHandlers {
  /** The game starts. `style` is the one chosen at a first start, or null when a saved game goes on. */
  onStart(style: PlayStyle | null): void;
  /** *Börja om från början*: forget the saved game. The title then offers Börja. */
  onStartOver(): void;
}

export interface Title {
  readonly open: boolean;
  show(hasSave: boolean): void;
  /** Shows the choice of play style, as after Börja. */
  showStyles(): void;
  hide(): void;
}

export function createTitle(doc: Document, handlers: TitleHandlers): Title {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const back = byId('title');
  const front = byId('titleFront');
  const styles = byId('titleStyles');
  let open = false;
  let saved = false;

  function showStyles(): void {
    front.hidden = true;
    styles.hidden = false;
    byId('firstAventyr').focus();
  }

  byId('startBtn').addEventListener('click', () => {
    if (saved) handlers.onStart(null);
    else showStyles();
  });
  byId('startOverBtn').addEventListener('click', () => {
    handlers.onStartOver();
    saved = false;
    draw();
  });
  byId('firstAventyr').addEventListener('click', () => handlers.onStart('aventyr'));
  byId('firstLugnt').addEventListener('click', () => handlers.onStart('lugnt'));

  function draw(): void {
    back.dataset.saved = String(saved);
    byId('startOverBtn').hidden = !saved;
    front.hidden = false;
    styles.hidden = true;
  }

  return {
    get open() {
      return open;
    },
    show(hasSave) {
      saved = hasSave;
      open = true;
      draw();
      back.hidden = false;
      byId('startBtn').focus();
    },
    showStyles,
    hide() {
      open = false;
      back.hidden = true;
    },
  };
}
