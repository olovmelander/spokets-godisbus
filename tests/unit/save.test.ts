import { describe, expect, it } from 'vitest';
import { OWN_SWITCHES, readSettings, settingsFor, simOptions, SLOWER_TEMPO, SWITCH_NAMES, tempoOf } from '../../src/save/settings';
import { createStore, newSave, readSave, SAVE_VERSION } from '../../src/save/store';

/** A stand-in for localStorage. */
function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
    removeItem: (key: string) => void items.delete(key),
  };
}

describe('the two play styles', () => {
  it('Äventyr leaves the jumps and the swing to the player', () => {
    const settings = settingsFor('aventyr');
    expect(settings).toEqual({
      style: 'aventyr', followFinger: false, graphics: 'auto', swingHelp: false, easyJumps: false, slower: false, sound: true, music: true,
      lefty: false, bigText: false, calm: false, loud: false, help: 'ask',
    });
    expect(simOptions(settings)).toEqual({ swingHelp: false, easyJumps: false, stopAtEdges: false, gentle: false, help: 'ask' });
    expect(tempoOf(settings)).toBe(1);
  });

  it('Lugnt helps with both, and stops him at long drops', () => {
    const settings = settingsFor('lugnt');
    expect(settings.swingHelp).toBe(true);
    expect(settings.easyJumps).toBe(true);
    expect(simOptions(settings)).toEqual({ swingHelp: true, easyJumps: true, stopAtEdges: true, gentle: true, help: 'remind' });
  });

  it('Lugnt sounds in silent mode too, and Äventyr respects the switch', () => {
    expect(settingsFor('lugnt').loud).toBe(true);
    expect(settingsFor('aventyr').loud).toBe(false);
  });

  it('every switch has a value in both styles, and is read back from a save', () => {
    for (const style of ['aventyr', 'lugnt'] as const) {
      for (const name of SWITCH_NAMES) {
        expect(typeof settingsFor(style)[name], name).toBe('boolean');
        const turned = { ...settingsFor(style), [name]: !settingsFor(style)[name] };
        expect(readSettings(JSON.parse(JSON.stringify(turned))), name).toEqual(turned);
      }
    }
    // The player's own switches are no part of a style: left-handed is left-handed in both.
    for (const name of OWN_SWITCHES) expect(settingsFor('lugnt')[name], name).toBe(settingsFor('aventyr')[name]);
    expect(OWN_SWITCHES).toContain('lefty');
    expect(OWN_SWITCHES).not.toContain('loud');
  });

  it('loads old settings safely and round-trips the controls and graphics preferences', () => {
    expect(readSettings({ style: 'lugnt' }).followFinger).toBe(false);
    expect(readSettings({ followFinger: 'yes', graphics: 'ultra' })).toEqual(settingsFor('aventyr'));
    for (const graphics of ['auto', 'low', 'mid', 'high'] as const) {
      const settings = { ...settingsFor('aventyr'), followFinger: true, graphics };
      const loaded = readSave(JSON.stringify(newSave(100, 'garden', settings)));
      expect(loaded.kind === 'save' && loaded.save.settings).toEqual(settings);
    }
    expect(OWN_SWITCHES).toContain('followFinger');
  });

  it('lets every switch be changed on its own', () => {
    const settings = { ...settingsFor('aventyr'), swingHelp: true, slower: true };
    expect(simOptions(settings)).toEqual({ swingHelp: true, easyJumps: false, stopAtEdges: false, gentle: false, help: 'ask' });
    expect(tempoOf(settings)).toBe(SLOWER_TEMPO);
  });

  it('reads settings from whatever a save holds', () => {
    expect(readSettings(undefined)).toEqual(settingsFor('aventyr'));
    expect(readSettings({ style: 'lugnt' })).toEqual(settingsFor('lugnt'));
    expect(readSettings({ style: 'something else', swingHelp: 'yes' })).toEqual(settingsFor('aventyr'));
    expect(readSettings({ style: 'lugnt', easyJumps: false, extra: 1 })).toEqual({ ...settingsFor('lugnt'), easyJumps: false });
  });
});

describe('saving', () => {
  it('writes a game and reads the same game back', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    expect(store.load()).toEqual({ kind: 'none' });
    const save = {
      ...newSave(1000, 'testbana', settingsFor('lugnt')),
      checkpoint: 2, candy: { testbana: [0, 1, 5] }, placed: { testbana: ['plank'] }, playMs: 42000,
    };
    expect(store.write(save)).toBe(true);
    expect(store.load()).toEqual({ kind: 'save', save });
    expect([...storage.items.keys()].sort()).toEqual(['godisbus.v1.index', 'godisbus.v1.player.elof']);
  });

  it('plays on without storage', () => {
    const store = createStore(null);
    expect(store.available).toBe(false);
    expect(store.load()).toEqual({ kind: 'none' });
    expect(store.write(newSave(0, 'testbana'))).toBe(false);
  });

  it('plays on when storage refuses to write', () => {
    const storage = fakeStorage();
    storage.setItem = () => {
      throw new Error('full');
    };
    expect(createStore(storage).write(newSave(0, 'testbana'))).toBe(false);
  });

  it('drops what it does not know, and keeps the rest', () => {
    const loaded = readSave(JSON.stringify({
      v: 1, name: 'Elof', updated: 5, chapter: 'testbana', checkpoint: 1.5, playMs: -3,
      candy: { testbana: [0, 'two', 3, -1, 2.5], other: 'none' }, placed: { testbana: ['plank', 7], other: 3 },
      settings: { style: 'lugnt' }, someday: true,
    }));
    expect(loaded).toEqual({
      kind: 'save',
      save: {
        v: SAVE_VERSION, name: 'Elof', updated: 5, chapter: 'testbana', checkpoint: -1, playMs: 0,
        candy: { testbana: [0, 3] }, placed: { testbana: ['plank'] }, flags: {}, settings: settingsFor('lugnt'),
      },
    });
  });

  it('never writes over a save it could not read', () => {
    for (const text of ['{ not json', '"just a string"', JSON.stringify({ v: SAVE_VERSION + 1, name: 'from a newer game' })]) {
      const storage = fakeStorage({ 'godisbus.v1.player.elof': text });
      const store = createStore(storage);
      expect(store.load()).toEqual({ kind: 'unreadable' });
      expect(store.write(newSave(0, 'testbana'))).toBe(false);
      expect(storage.items.get('godisbus.v1.player.elof')).toBe(text);
    }
  });

  it('starts over only when the player says so', () => {
    const storage = fakeStorage({ 'godisbus.v1.player.elof': '{ not json' });
    const store = createStore(storage);
    store.load();
    store.clear();
    expect(store.load()).toEqual({ kind: 'none' });
    expect(store.write(newSave(0, 'testbana'))).toBe(true);
  });
});
