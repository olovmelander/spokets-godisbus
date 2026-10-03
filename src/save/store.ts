import { readSettings, settingsFor, type Settings } from './settings';

/**
 * Saving (plan §6.9): `localStorage`, one index key and one key per player.
 * Loading is tolerant: what it doesn't know it drops, and a save it can't read is never written over.
 */
export const SAVE_VERSION = 1;
const INDEX_KEY = 'godisbus.v1.index';
const playerKey = (id: string) => `godisbus.v1.player.${id}`;
/** With no save on the device, the game makes this player and starts (plan §6.9). */
export const FIRST_PLAYER = { id: 'elof', name: 'Elof' };

export interface PlayerSave {
  v: number;
  name: string;
  /** When it was written, in milliseconds since 1970. */
  updated: number;
  settings: Settings;
  /** The chapter being played, by its stable id. */
  chapter: string;
  /** The last big candy reached in that chapter, or -1 for its start. */
  checkpoint: number;
  /** The trail candy collected, per chapter, by its place in the chapter's list. */
  candy: Record<string, number[]>;
  playMs: number;
}

export type Loaded =
  | { kind: 'none' }
  | { kind: 'save'; save: PlayerSave }
  /** There is a save, but it is damaged or from a newer game. It is left alone. */
  | { kind: 'unreadable' };

export function newSave(now: number, chapter: string, settings: Settings = settingsFor('aventyr')): PlayerSave {
  return { v: SAVE_VERSION, name: FIRST_PLAYER.name, updated: now, settings, chapter, checkpoint: -1, candy: {}, playMs: 0 };
}

/** Reads one player's save from its text. */
export function readSave(text: string | null): Loaded {
  if (text === null) return { kind: 'none' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { kind: 'unreadable' };
  }
  if (typeof data !== 'object' || data === null) return { kind: 'unreadable' };
  const from = data as Record<string, unknown>;
  if (typeof from.v !== 'number' || from.v > SAVE_VERSION || from.v < 1) return { kind: 'unreadable' };

  const candy: Record<string, number[]> = {};
  if (typeof from.candy === 'object' && from.candy !== null) {
    for (const [chapter, list] of Object.entries(from.candy as Record<string, unknown>)) {
      if (Array.isArray(list)) candy[chapter] = list.filter((i): i is number => Number.isInteger(i) && i >= 0);
    }
  }
  return {
    kind: 'save',
    save: {
      v: SAVE_VERSION,
      name: typeof from.name === 'string' ? from.name : FIRST_PLAYER.name,
      updated: typeof from.updated === 'number' ? from.updated : 0,
      settings: readSettings(from.settings),
      chapter: typeof from.chapter === 'string' ? from.chapter : '',
      checkpoint: Number.isInteger(from.checkpoint) ? (from.checkpoint as number) : -1,
      candy,
      playMs: typeof from.playMs === 'number' && from.playMs >= 0 ? from.playMs : 0,
    },
  };
}

export interface SaveStore {
  /** False when the browser gives no storage: the game is played without saving. */
  readonly available: boolean;
  load(): Loaded;
  /** Writes the save. Returns false when it could not be written. */
  write(save: PlayerSave): boolean;
  /** Forgets the player's save: "Börja om från början". */
  clear(): void;
}

/** `storage` is `localStorage`, or null where the browser refuses it. */
export function createStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null): SaveStore {
  const id = FIRST_PLAYER.id;
  let unreadable = false;
  return {
    available: storage !== null,
    load() {
      if (!storage) return { kind: 'none' };
      let text: string | null;
      try {
        text = storage.getItem(playerKey(id));
      } catch {
        return { kind: 'none' };
      }
      const loaded = readSave(text);
      unreadable = loaded.kind === 'unreadable';
      return loaded;
    },
    write(save) {
      // A save that couldn't be read is never silently written over.
      if (!storage || unreadable) return false;
      try {
        storage.setItem(INDEX_KEY, JSON.stringify({ v: SAVE_VERSION, players: [FIRST_PLAYER], current: id }));
        storage.setItem(playerKey(id), JSON.stringify(save));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      unreadable = false;
      try {
        storage?.removeItem(playerKey(id));
      } catch {
        // Nothing to forget, then.
      }
    },
  };
}
