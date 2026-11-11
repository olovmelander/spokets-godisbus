import { describe, expect, it } from 'vitest';
import { createKartRecords, kartTime } from '../../src/kart/records';

function store() {
  const data = new Map<string, string>();
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => { data.set(key, value); } };
  storage.setItem('godisbus.v1.index', JSON.stringify({ players: [{ id: 'elof', generation: 'first' }, { id: 'other' }] }));
  storage.setItem('godisbus.v1.player.elof', 'adventure-must-not-change');
  return { data, storage };
}
describe('optional console records', () => {
  it('keeps each player and difficulty separate without touching adventure progress', () => {
    const { data, storage } = store(), records = createKartRecords(storage, 'elof');
    expect(records.finish(false, { race: 150, lap: 48 })).toEqual({ saved: true, improved: true });
    records.finish(false, { race: 160, lap: 47 });
    records.finish(true, { race: 170, lap: 54 });
    expect(records.best(false)).toEqual({ race: 150, lap: 47 });
    expect(records.best(true)).toEqual({ race: 170, lap: 54 });
    expect(createKartRecords(storage, 'other').best(false)).toBeUndefined();
    expect(data.get('godisbus.v1.player.elof')).toBe('adventure-must-not-change');
  });
  it('cannot restore records from a stale tab after the player is reset or removed', () => {
    const { storage } = store(), old = createKartRecords(storage, 'elof');
    old.finish(false, { race: 150, lap: 48 });
    storage.setItem('godisbus.v1.index', JSON.stringify({ players: [{ id: 'elof', generation: 'reset' }] }));
    expect(old.finish(false, { race: 140, lap: 46 }).saved).toBe(false);
    expect(createKartRecords(storage, 'elof').best(false)).toBeUndefined();
    storage.setItem('godisbus.v1.index', JSON.stringify({ players: [] }));
    expect(old.finish(false, { race: 140, lap: 46 }).saved).toBe(false);
  });
  it('tolerates corrupt, missing and blocked storage', () => {
    const { storage } = store();
    storage.setItem('godisbus.kart.v1.elof', '{');
    expect(createKartRecords(storage, 'elof').best(false)).toBeUndefined();
    expect(createKartRecords(null, 'elof').finish(false, { race: 150, lap: 48 }).saved).toBe(false);
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
    expect(createKartRecords(blocked, 'elof').best(false)).toBeUndefined();
    expect(createKartRecords(storage, 'elof').finish(false, { race: Infinity, lap: 48 }).saved).toBe(false);
  });
  it('formats a minute rollover without ever displaying sixty seconds', () => {
    expect(kartTime(59.999)).toBe('0:59,9');
    expect(kartTime(60)).toBe('1:00,0');
  });
});
