/**
 * Whether this device's player has learned the keys (docs/ux-audit/in-play.md row 13): the three keycaps of the
 * hint stay until each has been used once, or for half a minute of play, and then never again here. It belongs to
 * the device, not to a player: it is about a keyboard. A device that keeps nothing shows them again next time.
 */
const KEY = 'godisbus.v1.keys-learned';

export function keysLearned(storage: Pick<Storage, 'getItem'> | null = globalThis.localStorage ?? null): boolean {
  try { return storage?.getItem(KEY) === '1'; } catch { return false; }
}

export function learnKeys(storage: Pick<Storage, 'setItem'> | null = globalThis.localStorage ?? null): void {
  try { storage?.setItem(KEY, '1'); } catch { /* Kept nowhere: shown again next time. */ }
}
