import { describe, expect, it } from 'vitest';
import { changeStyle, readSettings, settingsFor } from '../../src/save/settings';
import { newSave, readSave } from '../../src/save/store';

describe('saved independent music/effects levels', () => {
  it('migrates old saves to full levels without changing mute switches', () => {
    const old = readSave(JSON.stringify({ ...newSave(1, 'garden'), settings: { sound: false, music: true } }));
    expect(old.kind).toBe('save');
    if (old.kind !== 'save') return;
    expect(old.save.settings).toMatchObject({ effectsVolume: 1, musicVolume: 1, sound: false, music: true });
  });
  it.each([undefined, null, '0.5', false, Number.NaN, Infinity, -Infinity, {}])('safely defaults invalid level %s', (level) => {
    expect(readSettings({ effectsVolume: level, musicVolume: level })).toMatchObject({ effectsVolume: 1, musicVolume: 1 });
  });
  it('bounds finite imported values, including silent zero', () => {
    expect(readSettings({ effectsVolume: -4, musicVolume: 12 })).toMatchObject({ effectsVolume: 0, musicVolume: 1 });
    expect(readSettings({ effectsVolume: 0, musicVolume: 0.375 })).toMatchObject({ effectsVolume: 0, musicVolume: 0.375 });
  });
  it('round-trips levels with a player save independently of mute and other players', () => {
    for (const [effectsVolume, musicVolume, sound, music] of [[0.2, 0.9, false, true], [1, 0, true, false]] as const) {
      const settings = { ...settingsFor('aventyr'), effectsVolume, musicVolume, sound, music };
      const loaded = readSave(JSON.stringify(newSave(5, 'garden', settings)));
      expect(loaded.kind === 'save' && loaded.save.settings).toEqual(settings);
    }
  });
  it('first-start and later style changes preserve levels, mute and other personal settings', () => {
    const chosen = {
      ...settingsFor('aventyr'), graphics: 'high' as const, effectsVolume: 0.4, musicVolume: 0.7,
      sound: false, music: false, followFinger: true, lefty: true, slower: true,
    };
    const calm = changeStyle(chosen, 'lugnt');
    expect(calm).toMatchObject({
      style: 'lugnt', effectsVolume: 0.4, musicVolume: 0.7, sound: false, music: false,
      graphics: 'high', followFinger: true, lefty: true, slower: true, swingHelp: true, easyJumps: true,
    });
    expect(changeStyle(calm, 'aventyr')).toEqual(chosen);
  });
});
