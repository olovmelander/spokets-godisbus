import { isPhotoMoment, PHOTO_MOMENTS, type PhotoMoment } from '../content/photos';

export const PHOTO_DB = 'godisbus.v1.photos';
export const PHOTO_MAX_BYTES = 100_000;
export interface AlbumPhoto { player: string; moment: PhotoMoment; blob: Blob }
type StoredPhoto = AlbumPhoto & { generation?: string };
type ResetStorage = Pick<Storage, 'getItem' | 'setItem'>;
const resetKey = (player: string) => `godisbus.v1.photos.reset.${player}`;
interface Reset { generation: string | null; pending: boolean }
export interface PhotoStore {
  list(player: string): Promise<AlbumPhoto[]>;
  /** Keeps the first picture of this moment. Seven authored IDs bound each player's collection. */
  put(photo: AlbumPhoto): Promise<boolean>;
  clear(player: string): Promise<boolean>;
}

/** No storage prompt or error panel: an unavailable/full database leaves a normal, photo-free album. */
export function createPhotoStore(factory: IDBFactory | null, resets: ResetStorage | null = null): PhotoStore {
  // A reset is durable even when IndexedDB refuses writes. Its generation hides all older frames;
  // pending physical deletion is retried next time. Keeping the generation prevents resurrection.
  const bound = new Map<string, string | null>();
  function resetFor(player: string): Reset | null {
    try {
      const raw = resets?.getItem(resetKey(player));
      if (!raw) return { generation: null, pending: false };
      const value: unknown = JSON.parse(raw);
      if (!value || typeof value !== 'object') return null;
      const mark = value as Record<string, unknown>;
      return typeof mark.generation === 'string' && typeof mark.pending === 'boolean'
        ? { generation: mark.generation, pending: mark.pending } : null;
    } catch { return null; }
  }
  function current(player: string): Reset | null {
    const reset = resetFor(player);
    if (!reset) return null;
    if (!bound.has(player)) bound.set(player, reset.generation);
    // Another tab reset this player's album: stale encoders must not repopulate it.
    return bound.get(player) === reset.generation ? reset : null;
  }
  let opening: Promise<IDBDatabase | null> | undefined;
  const open = (): Promise<IDBDatabase | null> => opening ??= new Promise((resolve) => {
    if (!factory) { resolve(null); return; }
    let finished = false;
    const finish = (db: IDBDatabase | null) => {
      if (finished) { db?.close(); return; }
      finished = true;
      clearTimeout(timeout);
      resolve(db);
    };
    const timeout = setTimeout(() => finish(null), 2000);
    try {
      const request = factory.open(PHOTO_DB, 1);
      request.onupgradeneeded = () => {
        const store = request.result.createObjectStore('frames', { keyPath: ['player', 'moment'] });
        store.createIndex('player', 'player');
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); opening = undefined; };
        finish(db);
      };
      request.onerror = request.onblocked = () => finish(null);
    } catch { finish(null); }
  });

  async function run<T>(mode: IDBTransactionMode, fallback: T, work: (store: IDBObjectStore, result: (value: T) => void) => void): Promise<T> {
    const db = await open();
    if (!db) return fallback;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction('frames', mode);
        let value = fallback;
        tx.oncomplete = () => resolve(value);
        tx.onerror = tx.onabort = () => resolve(fallback);
        work(tx.objectStore('frames'), (next) => { value = next; });
      } catch { resolve(fallback); }
    });
  }
  const valid = (photo: AlbumPhoto): boolean => typeof photo === 'object' && photo !== null && typeof photo.player === 'string' && photo.player.length > 0
    && isPhotoMoment(photo.moment) && photo.blob instanceof Blob && photo.blob.type === 'image/webp'
    && photo.blob.size > 0 && photo.blob.size <= PHOTO_MAX_BYTES;
  async function removeFrames(player: string, generation?: string | null): Promise<boolean> {
    return run('readwrite', false, (store, result) => {
      const request = store.index('player').openCursor(player);
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          // Retrying a tombstone only removes older frames; new-generation captures survive.
          try {
            if (generation === undefined || ((cursor.value as StoredPhoto).generation ?? null) !== generation) cursor.delete();
            cursor.continue();
          } catch { result(false); }
        } else result(true);
      };
    });
  }
  async function clean(player: string, reset: Reset): Promise<void> {
    if (!reset.pending || !resets) return;
    if (await removeFrames(player, reset.generation)) {
      try {
        if (resetFor(player)?.generation === reset.generation) resets.setItem(resetKey(player), JSON.stringify({ ...reset, pending: false }));
      } catch { /* The marker stays pending: retry later, without showing older frames. */ }
    }
  }
  return {
    async list(player) {
      const reset = current(player);
      if (!reset) return [];
      await clean(player, reset);
      const photos = await run<StoredPhoto[]>('readonly', [], (store, result) => {
        const request = store.index('player').getAll(player);
        request.onsuccess = () => result((request.result as StoredPhoto[]).filter(valid)
          .filter((photo) => (photo.generation ?? null) === reset.generation)
          .sort((a, b) => PHOTO_MOMENTS.indexOf(a.moment) - PHOTO_MOMENTS.indexOf(b.moment)));
      });
      return current(player) ? photos : [];
    },
    async put(photo) {
      if (!valid(photo)) return false;
      const reset = current(photo.player);
      if (!reset) return false;
      await clean(photo.player, reset);
      if (!current(photo.player)) return false;
      return run('readwrite', false, (store, result) => {
        const read = store.get([photo.player, photo.moment]);
        read.onsuccess = () => {
          if (!current(photo.player)) return;
          // Retain the first frame in this generation, but permit a fresh adventure after a reset.
          if (read.result && ((read.result as StoredPhoto).generation ?? null) === reset.generation) return;
          try {
            const request = store.put({ ...photo, ...(reset.generation ? { generation: reset.generation } : {}) });
            request.onsuccess = () => result(true);
          } catch { /* A synchronous quota/security error in this event is a normal photo-free fallback. */ }
        };
      });
    },
    async clear(player) {
      let marked = false;
      if (resets) {
        try {
          const generation = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          resets.setItem(resetKey(player), JSON.stringify({ generation, pending: true }));
          bound.set(player, generation);
          marked = true;
        } catch {
          // A physical deletion alone cannot stop a still-open tab from restoring its older capture.
          // With durable reset storage configured, leave everything intact if its marker is refused.
          return false;
        }
      }
      const removed = await removeFrames(player);
      if (removed && marked) {
        try {
          const reset = current(player);
          if (reset) resets!.setItem(resetKey(player), JSON.stringify({ ...reset, pending: false }));
        } catch { /* A harmless pending marker will retry next time. */ }
      }
      return marked || removed;
    },
  };
}
