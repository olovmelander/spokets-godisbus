import { readSettings, settingsFor, type PlayStyle, type Settings } from './settings';

/**
 * Saving (plan §6.9): `localStorage`, one index key and one key per player.
 * Loading is tolerant: what it doesn't know it drops, and a save it can't read is never written over.
 */
export const SAVE_VERSION = 1;
const INDEX_KEY = 'godisbus.v1.index';
const playerKey = (id: string) => `godisbus.v1.player.${id}`;
/** With no save on the device, the game makes this player and starts (plan §6.9). */
export const FIRST_PLAYER = { id: 'elof', name: 'Elof' };
export const PLAYER_NAME_MAX = 24;

const playerName = (name: string) => Array.from(name.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim())
  .slice(0, PLAYER_NAME_MAX).join('');

export interface PlayerProfile {
  id: string;
  name: string;
  kind: Loaded['kind'];
}

interface PlayerIndex {
  v: number;
  players: { id: string; name: string; generation?: string }[];
  current: string;
}

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
  /** The things on rails that are where they belong, per chapter, by id. */
  placed: Record<string, string[]>;
  /** What has happened, per chapter: the flags set. */
  flags: Record<string, string[]>;
  playMs: number;
}

export type Loaded =
  | { kind: 'none' }
  | { kind: 'save'; save: PlayerSave }
  /** There is a save, but it is damaged or from a newer game. It is left alone. */
  | { kind: 'unreadable' };

export function newSave(now: number, chapter: string, settings: Settings = settingsFor('aventyr'), name = FIRST_PLAYER.name): PlayerSave {
  return { v: SAVE_VERSION, name: playerName(name) || FIRST_PLAYER.name, updated: now, settings, chapter, checkpoint: -1, candy: {}, placed: {}, flags: {}, playMs: 0 };
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
  const names = (value: unknown): Record<string, string[]> => {
    const out: Record<string, string[]> = {};
    if (typeof value !== 'object' || value === null) return out;
    for (const [chapter, list] of Object.entries(value as Record<string, unknown>)) {
      if (Array.isArray(list)) out[chapter] = list.filter((id): id is string => typeof id === 'string');
    }
    return out;
  };
  const placed = names(from.placed);
  const flags = names(from.flags);
  return {
    kind: 'save',
    save: {
      v: SAVE_VERSION,
      name: typeof from.name === 'string' ? playerName(from.name) || FIRST_PLAYER.name : FIRST_PLAYER.name,
      updated: typeof from.updated === 'number' ? from.updated : 0,
      settings: readSettings(from.settings),
      chapter: typeof from.chapter === 'string' ? from.chapter : '',
      checkpoint: Number.isInteger(from.checkpoint) ? (from.checkpoint as number) : -1,
      candy,
      placed,
      flags,
      playMs: typeof from.playMs === 'number' && from.playMs >= 0 ? from.playMs : 0,
    },
  };
}

export interface SaveStore {
  /** False when the browser gives no storage: the game is played without saving. */
  readonly available: boolean;
  readonly currentId: string;
  /** Local profiles only. A broken save remains visible so it can be explicitly restarted or removed. */
  players(): PlayerProfile[];
  /** Selects an existing profile; future writes from this store stay bound to it. */
  select(id: string): boolean;
  /** Creates and selects a fresh profile. Returns null when it could not be saved. */
  create(name: string, style: PlayStyle, chapter: string, now: number): string | null;
  /** Removes only this profile, choosing another if the current one was removed. */
  remove(id: string): boolean;
  load(): Loaded;
  /** Writes the save. Returns false when it could not be written. */
  write(save: PlayerSave): boolean;
  /** Forgets only the current player's progress: "Börja om från början". Its name stays. */
  clear(): boolean;
}

/** `storage` is `localStorage`, or null where the browser refuses it. */
export function createStore(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null): SaveStore {
  let currentId = FIRST_PLAYER.id;
  let readFailed = false;
  const get = (key: string): string | null => {
    try {
      return storage?.getItem(key) ?? null;
    } catch (error) {
      readFailed = true;
      throw error;
    }
  };
  // Read again before mutations: another tab may have added a player, but it cannot retarget this store's
  // current game. An invalid index is never replaced by a guessed one.
  const readIndex = (): { index: PlayerIndex; raw: string | null } | null => {
    try {
      readFailed = false;
      const raw = get(INDEX_KEY);
      if (raw === null) {
        const legacyText = get(playerKey(FIRST_PLAYER.id));
        const legacy = readSave(legacyText);
        return { raw, index: { v: SAVE_VERSION, current: FIRST_PLAYER.id, players: legacyText === null ? [] : [{
          id: FIRST_PLAYER.id, name: legacy.kind === 'save' ? legacy.save.name : FIRST_PLAYER.name,
        }] } };
      }
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return null;
      const from = value as Record<string, unknown>;
      if (from.v !== SAVE_VERSION || !Array.isArray(from.players) || typeof from.current !== 'string') return null;
      const players: PlayerIndex['players'] = [];
      for (const item of from.players) {
        if (!item || typeof item !== 'object' || typeof item.id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(item.id)
          || (item.generation !== undefined && typeof item.generation !== 'string')
          || typeof item.name !== 'string' || !playerName(item.name) || players.some((p) => p.id === item.id)) return null;
        players.push({ id: item.id, name: playerName(item.name), ...(item.generation ? { generation: item.generation } : {}) });
      }
      if (players.length ? !players.some((p) => p.id === from.current) : from.current !== FIRST_PLAYER.id) return null;
      return { raw, index: { v: SAVE_VERSION, players, current: from.current } };
    } catch {
      return null;
    }
  };
  const first = readIndex();
  if (first) currentId = first.index.current;
  let generation = first?.index.players.find((p) => p.id === currentId)?.generation;
  let currentWasIndexed = first?.index.players.some((p) => p.id === currentId) ?? false;
  const restore = (key: string, value: string | null) => {
    try {
      if (value === null) storage?.removeItem(key);
      else storage?.setItem(key, value);
    } catch {
      // localStorage has no transaction. A failed rollback must never reach a different profile's key.
    }
  };
  const putIndex = (index: PlayerIndex) => storage!.setItem(INDEX_KEY, JSON.stringify(index));
  return {
    get available() { return storage !== null && !readFailed; },
    get currentId() { return currentId; },
    players() {
      if (!storage) return [];
      const data = readIndex();
      if (!data) return [];
      return data.index.players.map((profile) => {
        let kind: PlayerProfile['kind'] = 'unreadable';
        try {
          // A profile whose progress was explicitly cleared is a valid player with no save yet.
          kind = readSave(get(playerKey(profile.id))).kind;
        } catch { /* Keep the profile visible when a read is refused. */ }
        return { id: profile.id, name: profile.name, kind };
      });
    },
    select(id) {
      if (!storage) return false;
      const data = readIndex();
      if (!data || !data.index.players.some((p) => p.id === id)) return false;
      try {
        get(playerKey(id)); // A rejected read must not change the selected profile.
        putIndex({ ...data.index, current: id });
        currentId = id;
        generation = data.index.players.find((p) => p.id === id)?.generation;
        currentWasIndexed = true;
        return true;
      } catch {
        return false;
      }
    },
    create(name, style, chapter, now) {
      if (!storage) return null;
      const nameToSave = playerName(name);
      const data = readIndex();
      if (!nameToSave || !data) return null;
      let id = '';
      try {
        for (let attempt = 0; attempt < 8; attempt++) {
          const token = globalThis.crypto?.randomUUID?.() ?? `${now.toString(36)}_${Math.random().toString(36).slice(2)}`;
          const candidate = `p_${token}`;
          if (!data.index.players.some((p) => p.id === candidate) && get(playerKey(candidate)) === null) {
            id = candidate;
            break;
          }
        }
        if (!id) return null;
        const save = newSave(now, chapter, settingsFor(style), nameToSave);
        storage.setItem(playerKey(id), JSON.stringify(save));
        try {
          putIndex({ ...data.index, players: [...data.index.players, { id, name: nameToSave }], current: id });
        } catch (error) {
          restore(playerKey(id), null);
          throw error;
        }
        currentId = id;
        generation = undefined;
        currentWasIndexed = true;
        return id;
      } catch {
        return null;
      }
    },
    remove(id) {
      if (!storage) return false;
      const data = readIndex();
      if (!data || !data.index.players.some((p) => p.id === id)) return false;
      const players = data.index.players.filter((p) => p.id !== id);
      const nextId = data.index.current === id ? players[0]?.id ?? FIRST_PLAYER.id : data.index.current;
      try {
        get(playerKey(id)); // If a read is blocked, leave both index and data alone.
        putIndex({ ...data.index, players, current: nextId });
        try {
          storage.removeItem(playerKey(id));
        } catch (error) {
          restore(INDEX_KEY, data.raw);
          throw error;
        }
        if (currentId === id) {
          currentId = nextId;
          generation = players.find((p) => p.id === nextId)?.generation;
          currentWasIndexed = players.some((p) => p.id === nextId);
        }
        return true;
      } catch {
        return false;
      }
    },
    load() {
      if (!storage) return { kind: 'none' };
      const data = readIndex();
      if (!data || (data.index.players.length > 0 && !data.index.players.some((p) => p.id === currentId))) return { kind: 'unreadable' };
      try {
        return readSave(get(playerKey(currentId)));
      } catch {
        return { kind: 'unreadable' };
      }
    },
    write(save) {
      if (!storage) return false;
      const data = readIndex();
      if (!data) return false;
      const profile = data.index.players.find((p) => p.id === currentId);
      if (profile && profile.generation !== generation) return false;
      if (!profile && (currentWasIndexed || data.index.players.length > 0 || currentId !== FIRST_PLAYER.id)) return false;
      try {
        const key = playerKey(currentId);
        const previous = get(key);
        if (readSave(previous).kind === 'unreadable') return false;
        const name = profile?.name ?? (playerName(save.name) || FIRST_PLAYER.name);
        storage.setItem(key, JSON.stringify({ ...save, name }));
        if (!profile || data.raw === null) {
          // Elof's stable default ID can be recreated after deleting the last profile. Give that new
          // incarnation its own token, so an older tab cannot overwrite it with the deleted adventure.
          // A legacy save synthesized by readIndex already has a profile and keeps its existing token.
          const createdGeneration = profile ? profile.generation
            : globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          try {
            putIndex({ ...data.index, players: profile ? data.index.players : [...data.index.players, { id: currentId, name, generation: createdGeneration }] });
          } catch (error) {
            restore(key, previous);
            throw error;
          }
          generation = createdGeneration;
        }
        currentWasIndexed = true;
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      if (!storage) return false;
      const data = readIndex();
      if (!data || (data.index.players.length > 0 && !data.index.players.some((p) => p.id === currentId))) return false;
      try {
        get(playerKey(currentId));
        // Invalidate already-open tabs as well as this save; their next autosave must not restore it.
        const nextGeneration = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
        const indexed = data.index.players.some((p) => p.id === currentId);
        if (indexed) putIndex({ ...data.index, players: data.index.players.map((p) => p.id === currentId ? { ...p, generation: nextGeneration } : p) });
        try {
          storage.removeItem(playerKey(currentId));
        } catch (error) {
          if (indexed) restore(INDEX_KEY, data.raw);
          throw error;
        }
        if (indexed) generation = nextGeneration;
        return true;
      } catch {
        return false;
      }
    },
  };
}
