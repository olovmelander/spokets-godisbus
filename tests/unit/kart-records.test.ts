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
    expect(records.finish('bog', 150, 'normal', { race: 150, lap: 48 })).toEqual({ saved: true, improved: true });
    records.finish('bog', 150, 'normal', { race: 160, lap: 47 });
    records.finish('bog', 150, 'easy', { race: 170, lap: 54 });
    records.finish('bog', 50, 'normal', { race: 190, lap: 60 });
    records.finish('garden', 150, 'normal', { race: 140, lap: 44 });
    expect(records.best('bog', 150, 'normal')).toEqual({ race: 150, lap: 47 });
    expect(records.best('bog', 150, 'easy')).toEqual({ race: 170, lap: 54 });
    expect(records.best('bog', 50, 'normal')).toEqual({ race: 190, lap: 60 });
    expect(records.best('garden', 150, 'normal')).toEqual({ race: 140, lap: 44 });
    expect(records.best('mountain', 150, 'normal')).toBeUndefined();
    expect(createKartRecords(storage, 'other').best('bog', 150, 'normal')).toBeUndefined();
    expect(data.get('godisbus.v1.player.elof')).toBe('adventure-must-not-change');
  });
  it('cannot restore records from a stale tab after the player is reset or removed', () => {
    const { storage } = store(), old = createKartRecords(storage, 'elof');
    old.finish('bog', 150, 'normal', { race: 150, lap: 48 }); old.finishCup(150, 'normal', 2);
    storage.setItem('godisbus.v1.index', JSON.stringify({ players: [{ id: 'elof', generation: 'reset' }] }));
    expect(old.finish('bog', 150, 'normal', { race: 140, lap: 46 }).saved).toBe(false);
    expect(old.finishCup(150, 'normal', 1).saved).toBe(false);
    expect(createKartRecords(storage, 'elof').best('bog', 150, 'normal')).toBeUndefined();
    expect(createKartRecords(storage, 'elof').bestCup(150, 'normal')).toBeUndefined();
    storage.setItem('godisbus.v1.index', JSON.stringify({ players: [] }));
    expect(old.finish('bog', 150, 'normal', { race: 140, lap: 46 }).saved).toBe(false);
  });
  it('tolerates corrupt, missing and blocked storage', () => {
    const { storage } = store();
    storage.setItem('godisbus.kart.v3.elof', '{');
    expect(createKartRecords(storage, 'elof').best('bog', 150, 'normal')).toBeUndefined();
    expect(createKartRecords(null, 'elof').finish('bog', 150, 'normal', { race: 150, lap: 48 }).saved).toBe(false);
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } };
    expect(createKartRecords(blocked, 'elof').best('bog', 150, 'normal')).toBeUndefined();
    expect(createKartRecords(blocked, 'elof').bestCup(150, 'normal')).toBeUndefined();
    expect(createKartRecords(storage, 'elof').finish('bog', 150, 'normal', { race: Infinity, lap: 48 }).saved).toBe(false);
    storage.setItem('godisbus.kart.v3.elof', JSON.stringify({ v: 3, generation: 'first', times: { 'bog.150.normal': { race: 'fast', lap: 1 }, 'garden.50.easy': { race: 120, lap: 39 } }, cups: { '150.normal': 12, '50.easy': 3 } }));
    const mended = createKartRecords(storage, 'elof');
    expect(mended.best('bog', 150, 'normal')).toBeUndefined(); expect(mended.best('garden', 50, 'easy')).toEqual({ race: 120, lap: 39 });
    expect(mended.bestCup(150, 'normal')).toBeUndefined(); expect(mended.bestCup(50, 'easy')).toBe(3);
  });
  it('keeps the best cup place for each speed class and difficulty', () => {
    const { storage } = store(), records = createKartRecords(storage, 'elof');
    expect(records.bestCup(100, 'normal')).toBeUndefined();
    expect(records.finishCup(100, 'normal', 4)).toEqual({ saved: true, improved: true });
    expect(records.finishCup(100, 'normal', 6)).toEqual({ saved: true, improved: false });
    expect(records.finishCup(100, 'normal', 2)).toEqual({ saved: true, improved: true });
    expect(records.finishCup(150, 'hard', 7).improved).toBe(true);
    expect(records.bestCup(100, 'normal')).toBe(2); expect(records.bestCup(150, 'hard')).toBe(7); expect(records.bestCup(100, 'easy')).toBeUndefined();
    expect(records.finishCup(100, 'normal', 0).saved).toBe(false); expect(records.finishCup(100, 'normal', 9).saved).toBe(false);
  });
  it('formats a minute rollover without ever displaying sixty seconds', () => {
    expect(kartTime(59.999)).toBe('0:59,9');
    expect(kartTime(60)).toBe('1:00,0');
  });
});
