import { describe, expect, it } from 'vitest';
import { OWN_SWITCHES, readSettings, settingsFor, simOptions, SLOWER_TEMPO, SWITCH_NAMES, tempoOf } from '../../src/save/settings';
import { createStore, newSave, PLAYER_NAME_MAX, readSave, SAVE_VERSION } from '../../src/save/store';

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
      effectsVolume: 1, musicVolume: 1,
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

describe('local player profiles', () => {
  const indexKey = 'godisbus.v1.index';
  const key = (id: string) => `godisbus.v1.player.${id}`;
  const index = (players: { id: string; name: string }[], current = players[0]?.id ?? 'elof') =>
    JSON.stringify({ v: SAVE_VERSION, players, current });

  it('discovers the old Elof save without changing it, then migrates its index on the next write', () => {
    const oldSave = { ...newSave(100, 'garden'), candy: { garden: [2, 4] }, flags: { garden: ['found'] } };
    const raw = JSON.stringify(oldSave);
    const storage = fakeStorage({ [key('elof')]: raw });
    const store = createStore(storage);
    expect(store.currentId).toBe('elof');
    expect(store.players()).toEqual([{ id: 'elof', name: 'Elof', kind: 'save' }]);
    expect(store.load()).toEqual({ kind: 'save', save: { ...oldSave, checkpoints: { [oldSave.chapter]: oldSave.checkpoint } } });
    expect(storage.items.get(indexKey)).toBeUndefined();
    expect(storage.items.get(key('elof'))).toBe(raw);
    expect(store.write(oldSave)).toBe(true);
    expect(JSON.parse(storage.items.get(indexKey)!)).toEqual(JSON.parse(index([{ id: 'elof', name: 'Elof' }])));
  });

  it('keeps each player’s progress and settings separate, and remembers the selected player after reload', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    expect(store.players()).toEqual([]);
    const elof = { ...newSave(100, 'garden'), checkpoint: 2, candy: { garden: [1, 2] }, flags: { garden: ['memory'] } };
    expect(store.write(elof)).toBe(true);
    const otherId = store.create('Moa', 'lugnt', 'prolog', 200)!;
    expect(otherId).toMatch(/^p_/);
    expect(store.currentId).toBe(otherId);
    const moa = { ...newSave(200, 'prolog', settingsFor('lugnt'), 'Moa'), flags: { prolog: ['star'] } };
    expect(store.write(moa)).toBe(true);
    expect(createStore(storage).load()).toEqual({ kind: 'save', save: { ...moa, checkpoints: { [moa.chapter]: moa.checkpoint } } });
    expect(store.select('elof')).toBe(true);
    expect(store.load()).toEqual({ kind: 'save', save: { ...elof, checkpoints: { [elof.chapter]: elof.checkpoint } } });
    expect(store.select(otherId)).toBe(true);
    expect(store.load()).toEqual({ kind: 'save', save: { ...moa, checkpoints: { [moa.chapter]: moa.checkpoint } } });
    expect(store.players()).toEqual([
      { id: 'elof', name: 'Elof', kind: 'save' }, { id: otherId, name: 'Moa', kind: 'save' },
    ]);
  });

  it('uses distinct opaque IDs for equal names and bounds names without splitting Unicode characters', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    const first = store.create('  Moa\n  ', 'aventyr', 'prolog', 100)!;
    const second = store.create('Moa', 'lugnt', 'prolog', 100)!;
    expect(first).not.toBe(second);
    expect(first.toLowerCase()).not.toContain('moa');
    expect(second.toLowerCase()).not.toContain('moa');
    expect(store.players().map((p) => p.name)).toEqual(['Moa', 'Moa']);
    expect(store.create(' \n\t ', 'aventyr', 'prolog', 100)).toBeNull();
    const long = '🐴'.repeat(PLAYER_NAME_MAX + 5);
    store.create(long, 'aventyr', 'prolog', 100);
    const loaded = store.load();
    expect(loaded.kind === 'save' && loaded.save.name).toBe('🐴'.repeat(PLAYER_NAME_MAX));
  });

  it('binds save names to the selected profile instead of a caller’s stale default name', () => {
    const store = createStore(fakeStorage());
    store.create('Moa', 'lugnt', 'prolog', 100);
    expect(store.write(newSave(200, 'garden'))).toBe(true);
    const loaded = store.load();
    expect(loaded.kind === 'save' && loaded.save.name).toBe('Moa');
    expect(store.players()[0]?.name).toBe('Moa');
  });

  it('clears only current progress and preserves the profile’s name and other players', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.write(newSave(100, 'garden'));
    const elof = storage.items.get(key('elof'));
    const other = store.create('Moa', 'lugnt', 'prolog', 200)!;
    expect(store.clear()).toBe(true);
    expect(store.load()).toEqual({ kind: 'none' });
    expect(store.players().find((p) => p.id === other)).toEqual({ id: other, name: 'Moa', kind: 'none' });
    expect(storage.items.get(key('elof'))).toBe(elof);
    expect(store.write(newSave(300, 'prolog'))).toBe(true);
    const loaded = store.load();
    expect(loaded.kind === 'save' && loaded.save.name).toBe('Moa');
  });

  it('removes exactly the named profile and selects a remaining player when necessary', () => {
    const storage = fakeStorage({ unrelated: 'keep me' });
    const store = createStore(storage);
    store.write(newSave(100, 'garden'));
    const other = store.create('Moa', 'lugnt', 'prolog', 200)!;
    expect(store.remove('unknown')).toBe(false);
    expect(store.remove(other)).toBe(true);
    expect(store.currentId).toBe('elof');
    expect(storage.items.has(key(other))).toBe(false);
    expect(store.load().kind).toBe('save');
    expect(store.remove('elof')).toBe(true);
    expect(store.players()).toEqual([]);
    expect(createStore(storage).load()).toEqual({ kind: 'none' });
    expect(storage.items.get('unrelated')).toBe('keep me');
    expect(store.write(newSave(300, 'prolog'))).toBe(true);
  });

  it('keeps corrupt player data visible and untouched while another player can still play', () => {
    const raw = '{ broken save';
    const storage = fakeStorage({ [key('elof')]: raw });
    const store = createStore(storage);
    expect(store.players()).toEqual([{ id: 'elof', name: 'Elof', kind: 'unreadable' }]);
    expect(store.write(newSave(100, 'prolog'))).toBe(false); // protected even before load()
    const other = store.create('Moa', 'lugnt', 'prolog', 200)!;
    expect(store.load().kind).toBe('save');
    expect(store.select('elof')).toBe(true);
    expect(store.load().kind).toBe('unreadable');
    expect(store.write(newSave(300, 'prolog'))).toBe(false);
    expect(storage.items.get(key('elof'))).toBe(raw);
    expect(store.remove('elof')).toBe(true); // explicit removal is allowed
    expect(store.currentId).toBe(other);
  });

  it.each([
    '{ broken index',
    JSON.stringify({ v: SAVE_VERSION + 1, players: [], current: 'elof' }),
    index([{ id: 'elof', name: 'Elof' }], 'missing'),
    index([{ id: 'elof', name: 'Elof' }, { id: 'elof', name: 'Again' }]),
  ])('never replaces a corrupt or newer index: %s', (raw) => {
    const storage = fakeStorage({ [indexKey]: raw, [key('elof')]: JSON.stringify(newSave(100, 'garden')) });
    const before = [...storage.items];
    const store = createStore(storage);
    expect(store.load()).toEqual({ kind: 'unreadable' });
    expect(store.write(newSave(200, 'prolog'))).toBe(false);
    expect(store.create('Moa', 'lugnt', 'prolog', 200)).toBeNull();
    expect(store.select('elof')).toBe(false);
    expect(store.remove('elof')).toBe(false);
    expect(store.clear()).toBe(false);
    expect([...storage.items]).toEqual(before);
  });

  it('does not guess that a rejected read means an empty save', () => {
    const storage = fakeStorage({ [key('elof')]: JSON.stringify(newSave(100, 'garden')) });
    const before = [...storage.items];
    storage.getItem = () => { throw new Error('blocked'); };
    const store = createStore(storage);
    expect(store.available).toBe(false);
    expect(store.load().kind).toBe('unreadable');
    expect(store.write(newSave(200, 'prolog'))).toBe(false);
    expect(store.create('Moa', 'lugnt', 'prolog', 200)).toBeNull();
    expect(store.clear()).toBe(false);
    expect([...storage.items]).toEqual(before);
  });

  it('checks the current save again before writing, even when the index can still be read', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.write(newSave(100, 'garden'));
    const before = [...storage.items];
    const get = storage.getItem;
    storage.getItem = (id) => { if (id === key('elof')) throw new Error('blocked'); return get(id); };
    expect(store.write(newSave(200, 'prolog'))).toBe(false);
    expect(store.select('elof')).toBe(false);
    expect(store.remove('elof')).toBe(false);
    expect([...storage.items]).toEqual(before);
  });

  it.each(['save', 'index'])('rolls back creation when storage refuses the new %s', (failure) => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.write(newSave(100, 'garden'));
    const before = [...storage.items];
    const set = storage.setItem;
    storage.setItem = (id, value) => {
      if ((failure === 'index' && id === indexKey) || (failure === 'save' && id.startsWith('godisbus.v1.player.p_'))) throw new Error('full');
      set(id, value);
    };
    expect(store.create('Moa', 'lugnt', 'prolog', 200)).toBeNull();
    expect(store.currentId).toBe('elof');
    expect([...storage.items]).toEqual(before);
  });

  it('restores a legacy save if its first index cannot be saved', () => {
    const raw = JSON.stringify(newSave(100, 'garden'));
    const storage = fakeStorage({ [key('elof')]: raw });
    const set = storage.setItem;
    storage.setItem = (id, value) => { if (id === indexKey) throw new Error('full'); set(id, value); };
    expect(createStore(storage).write(newSave(200, 'prolog'))).toBe(false);
    expect([...storage.items]).toEqual([[key('elof'), raw]]);
  });

  it('restores the index when profile removal is refused', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    store.write(newSave(100, 'garden'));
    const other = store.create('Moa', 'lugnt', 'prolog', 200)!;
    const before = [...storage.items];
    storage.removeItem = () => { throw new Error('blocked'); };
    expect(store.remove(other)).toBe(false);
    expect(store.currentId).toBe(other);
    expect([...storage.items]).toEqual(before);
  });

  it('does not retarget a running game when a different tab selects or creates another player', () => {
    const storage = fakeStorage();
    const first = createStore(storage);
    first.write(newSave(100, 'garden'));
    const second = createStore(storage);
    const other = second.create('Moa', 'lugnt', 'prolog', 200)!;
    const otherSave = storage.items.get(key(other));
    expect(first.currentId).toBe('elof');
    expect(first.write(newSave(300, 'granskog'))).toBe(true);
    expect(storage.items.get(key(other))).toBe(otherSave);
    expect(createStore(storage).currentId).toBe(other);
    expect(first.players()).toHaveLength(2);
  });

  it('does not recreate a profile removed by another tab through a late autosave', () => {
    const storage = fakeStorage();
    const first = createStore(storage);
    first.write(newSave(100, 'garden'));
    const second = createStore(storage);
    expect(second.remove('elof')).toBe(true);
    expect(first.write(newSave(200, 'granskog'))).toBe(false);
    expect(storage.items.has(key('elof'))).toBe(false);
  });

  it.each(['new', 'legacy'] as const)('rejects a deleted %s Elof tab after a fresh default Elof is created', (kind) => {
    const oldAdventure = { ...newSave(100, 'garden'), candy: { garden: [1, 2] } };
    const storage = fakeStorage(kind === 'legacy' ? { [key('elof')]: JSON.stringify(oldAdventure) } : {});
    const oldTab = createStore(storage);
    if (kind === 'new') expect(oldTab.write(oldAdventure)).toBe(true);
    const editor = createStore(storage);
    expect(editor.remove('elof')).toBe(true);
    expect(oldTab.write(oldAdventure)).toBe(false);

    // The title automatically offers Elof again after the last profile has been removed.
    const freshTab = createStore(storage);
    const freshAdventure = newSave(200, 'prolog');
    expect(freshTab.write(freshAdventure)).toBe(true);
    expect(oldTab.write(oldAdventure)).toBe(false);
    expect(createStore(storage).load()).toEqual({ kind: 'save', save: { ...freshAdventure, checkpoints: { [freshAdventure.chapter]: freshAdventure.checkpoint } } });

    // The writer binds the new token too, and remains able to save its new game.
    const progressed = { ...freshAdventure, candy: { prolog: [0] } };
    expect(freshTab.write(progressed)).toBe(true);
    expect(oldTab.write(oldAdventure)).toBe(false);
    expect(createStore(storage).load()).toEqual({ kind: 'save', save: { ...progressed, checkpoints: { [progressed.chapter]: progressed.checkpoint } } });
  });

  it('cannot create, select, clear or remove profiles without storage', () => {
    const store = createStore(null);
    expect(store.players()).toEqual([]);
    expect(store.currentId).toBe('elof');
    expect(store.create('Moa', 'lugnt', 'prolog', 100)).toBeNull();
    expect(store.select('elof')).toBe(false);
    expect(store.clear()).toBe(false);
    expect(store.remove('elof')).toBe(false);
  });
});

describe('saving', () => {
  it('writes a game and reads the same game back', () => {
    const storage = fakeStorage();
    const store = createStore(storage);
    expect(store.load()).toEqual({ kind: 'none' });
    const save = {
      ...newSave(1000, 'testbana', settingsFor('lugnt')),
      checkpoint: 2, checkpoints: { testbana: 2 }, candy: { testbana: [0, 1, 5] }, placed: { testbana: ['plank'] }, playMs: 42000,
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
        v: SAVE_VERSION, name: 'Elof', updated: 5, chapter: 'testbana', checkpoint: -1, checkpoints: { testbana: -1 }, playMs: 0,
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


describe('reset while another tab is open', () => {
  it('invalidates old autosaves without affecting other profiles', () => {
    const storage = fakeStorage();
    const first = createStore(storage);
    first.write({ ...newSave(0, 'garden'), candy: { garden: [1, 2] } });
    const staleTab = createStore(storage);
    const stale = staleTab.load();
    expect(stale.kind).toBe('save');
    expect(first.clear()).toBe(true);
    if (stale.kind === 'save') expect(staleTab.write(stale.save)).toBe(false);
    expect(first.load()).toEqual({ kind: 'none' });
    expect(first.write(newSave(1, 'prolog'))).toBe(true);
    if (stale.kind === 'save') expect(staleTab.write(stale.save)).toBe(false);
    expect(createStore(storage).load()).toEqual({ kind: 'save', save: { ...newSave(1, 'prolog'), checkpoints: { prolog: -1 } } });
  });
});
