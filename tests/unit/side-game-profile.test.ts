import { describe, expect, it } from 'vitest';
import { createStore, newSave } from '../../src/save/store';
import { createKartRecords } from '../../src/kart/records';

const INDEX = 'godisbus.v1.index', SAVE = 'godisbus.v1.player.elof';
function memory(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return { items, getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => { items.set(key, value); }, removeItem: (key: string) => { items.delete(key); } };
}

describe('a side game played before the adventure', () => {
  it('keeps records across reload without inventing adventure progress', () => {
    const storage = memory(), store = createStore(storage);
    expect(store.ensureProfile()).toBe(true);
    expect([...storage.items.keys()]).toEqual([INDEX]);
    expect(store.load()).toEqual({ kind: 'none' });
    const index = storage.getItem(INDEX);
    const records = createKartRecords(storage, store.currentId);
    expect(records.finish('garden', 100, 'normal', { race: 180, lap: 59 }).saved).toBe(true);
    const reloaded = createStore(storage);
    expect(reloaded.ensureProfile()).toBe(true);
    expect(storage.getItem(INDEX)).toBe(index);
    expect(createKartRecords(storage, reloaded.currentId).best('garden', 100, 'normal')).toEqual({ race: 180, lap: 59 });
    expect(storage.getItem(SAVE)).toBeNull();
  });

  it('indexes a readable legacy save without changing its bytes', () => {
    const legacy = JSON.stringify(newSave(1, 'garden'));
    const storage = memory({ [SAVE]: legacy }), store = createStore(storage);
    expect(store.ensureProfile()).toBe(true);
    expect(storage.getItem(SAVE)).toBe(legacy);
    expect(store.players()[0]?.id).toBe('elof');
  });

  it('preserves an existing selected player and every stored byte', () => {
    const storage = memory(), store = createStore(storage);
    const id = store.create('Moa', 'lugnt', 'garden', 1);
    const before = new Map(storage.items);
    const reloaded = createStore(storage);
    expect(reloaded.currentId).toBe(id);
    expect(reloaded.ensureProfile()).toBe(true);
    expect(storage.items).toEqual(before);
  });

  it.each<Record<string, string>>([
    { [INDEX]: '{broken' }, { [INDEX]: JSON.stringify({ v: 2, current: 'elof', players: [] }) },
    { [SAVE]: '{broken' }, { [SAVE]: JSON.stringify({ v: 2 }) },
  ])('leaves unreadable or newer data alone: %j', initial => {
    const storage = memory(initial), before = new Map(storage.items);
    expect(createStore(storage).ensureProfile()).toBe(false);
    expect(storage.items).toEqual(before);
  });

  it.each(['remove', 'clear'] as const)('does not revive a stale profile after %s in another tab', action => {
    const storage = memory(), owner = createStore(storage);
    expect(owner.ensureProfile()).toBe(true);
    const stale = createStore(storage);
    if (action === 'remove') owner.remove(owner.currentId); else owner.clear();
    const before = new Map(storage.items);
    expect(stale.ensureProfile()).toBe(false);
    expect(storage.items).toEqual(before);
  });

  it('fails without modifying storage when writes are blocked', () => {
    const storage = memory();
    storage.setItem = () => { throw new Error('quota'); };
    expect(createStore(storage).ensureProfile()).toBe(false);
    expect(storage.items.size).toBe(0);
    expect(createStore(null).ensureProfile()).toBe(false);
  });
});
