import { HOME_LAYOUT } from '../content/home-layout';
import type { ChapterData, PlayerState } from '../sim/types';

const HOME_CHAPTERS = new Set(['prolog', 'epilog', 'stormkvall', 'morgonen']);

/** A repeatable optional activity, never a puzzle flag or a new chapter. */
export function homeConsoleAvailable(chapter: Pick<ChapterData, 'id' | 'place' | 'outdoors'>,
  player: Pick<PlayerState, 'x' | 'y' | 'grounded' | 'mode'>, busy: boolean): boolean {
  return !busy && HOME_CHAPTERS.has(chapter.id) && chapter.place === 'home'
    && player.x < (chapter.outdoors ?? Infinity) && player.grounded && player.mode === 'free'
    && Math.abs(player.x - HOME_LAYOUT.television.x) <= 2.8 && player.y >= -.15 && player.y <= 1.2;
}

export interface HomeConsoleSession {
  element: HTMLElement;
  suspend(blocked: boolean): void;
  dispose(): void;
  debug(): Record<string, unknown>;
}

interface HomeConsoleOptions {
  mount(): HTMLElement;
  load(host: HTMLElement, close: () => void): Promise<HomeConsoleSession>;
  enter(): void;
  leave(): void;
  failed(): void;
}

/** Own one lazy session, including cancellation while its module is still loading. */
export function createHomeConsole(options: HomeConsoleOptions) {
  let host: HTMLElement | null = null, session: HomeConsoleSession | null = null;
  let generation = 0, blocked = false;
  const close = () => {
    if (!host) return;
    generation++;
    const previous = session, oldHost = host;
    session = null; host = null;
    try { previous?.dispose(); } finally { oldHost.remove(); options.leave(); }
  };
  return {
    get open() { return host !== null; },
    get element() { return host; },
    get loading() { return host !== null && session === null; },
    async show(): Promise<void> {
      if (host) return;
      const ticket = ++generation;
      host = options.mount();
      options.enter();
      try {
        const loaded = await options.load(host, close);
        if (ticket !== generation) { loaded.dispose(); return; }
        session = loaded;
        loaded.suspend(blocked);
      } catch {
        if (ticket !== generation) return;
        close(); options.failed();
      }
    },
    close,
    suspend(on: boolean) { blocked = on; session?.suspend(on); },
    debug: () => ({ open: host !== null, loading: host !== null && session === null, blocked, ...(session?.debug() ?? {}) }),
  };
}
