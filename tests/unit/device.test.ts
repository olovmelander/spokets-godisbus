import { describe, expect, it, vi } from 'vitest';
import { createDevicePlay, createHighLanding, isAndroid, type ScreenLock } from '../../src/platform/device';
import { changeStyle, readSettings, settingsFor } from '../../src/save/settings';
import { newSave, readSave } from '../../src/save/store';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function sentinel() {
  let onRelease = () => {};
  const held = {
    released: false,
    release: vi.fn(async () => { held.released = true; onRelease(); }),
    addEventListener: (_type: 'release', callback: () => void) => { onRelease = callback; },
  };
  return held;
}

describe('optional device play lifecycle', () => {
  it('keeps a screen lock only during active play and reacquires on the next play', async () => {
    const first = sentinel();
    const second = sentinel();
    const requestWakeLock = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const play = createDevicePlay({ userAgent: 'Android', requestWakeLock });
    expect(requestWakeLock).not.toHaveBeenCalled();
    play.setPlaying(true); await flush();
    for (let i = 0; i < 20; i++) play.setPlaying(true);
    expect(requestWakeLock).toHaveBeenCalledTimes(1);
    play.setPlaying(false); await flush();
    expect(first.release).toHaveBeenCalledTimes(1);
    play.setPlaying(true); await flush();
    expect(requestWakeLock).toHaveBeenCalledTimes(2);
    expect(second.released).toBe(false);
  });
  it('releases a late request after pause, and resumes without overlapping requests', async () => {
    let resolve!: (lock: ScreenLock) => void;
    const late = sentinel();
    const current = sentinel();
    const requestWakeLock = vi.fn().mockImplementationOnce(() => new Promise<ScreenLock>((done) => { resolve = done; })).mockResolvedValueOnce(current);
    const play = createDevicePlay({ userAgent: 'Android', requestWakeLock });
    play.setPlaying(true); await flush();
    play.setPlaying(false); play.setPlaying(true); play.visible();
    expect(requestWakeLock).toHaveBeenCalledTimes(1);
    resolve(late); await flush();
    expect(late.release).toHaveBeenCalledTimes(1);
    expect(requestWakeLock).toHaveBeenCalledTimes(2);
    expect(current.released).toBe(false);
  });
  it('denied and synchronous failures never spin on animation frames, but visibility can retry', async () => {
    const requestWakeLock = vi.fn().mockRejectedValueOnce(new Error('denied')).mockImplementationOnce(() => { throw Error('unsupported'); });
    const play = createDevicePlay({ userAgent: 'iPhone', requestWakeLock });
    play.setPlaying(true); await flush();
    for (let i = 0; i < 20; i++) play.setPlaying(true);
    expect(requestWakeLock).toHaveBeenCalledTimes(1);
    play.visible(); await flush();
    expect(requestWakeLock).toHaveBeenCalledTimes(2);
    play.setPlaying(false); play.visible(); await flush();
    expect(requestWakeLock).toHaveBeenCalledTimes(2);
  });
  it('can reacquire an operating-system-revoked lock on visible', async () => {
    const held = sentinel();
    const requestWakeLock = vi.fn().mockResolvedValueOnce(held).mockResolvedValueOnce(sentinel());
    const play = createDevicePlay({ userAgent: 'iPhone', requestWakeLock });
    play.setPlaying(true); await flush();
    await held.release();
    play.visible(); await flush();
    expect(requestWakeLock).toHaveBeenCalledTimes(2);
  });
  it('works without APIs and ignores a refused release', async () => {
    const noApis = createDevicePlay({ userAgent: 'Android' });
    noApis.setPlaying(true); noApis.landing(true); noApis.setPlaying(false);
    const held = { ...sentinel(), release: vi.fn().mockRejectedValue(new Error('gone')) };
    const play = createDevicePlay({ userAgent: 'Android', requestWakeLock: async () => held });
    play.setPlaying(true); await flush(); play.setPlaying(false); await flush();
    expect(held.release).toHaveBeenCalledTimes(1);
  });
  it('vibrates only when opted in, playing and on Android', () => {
    const vibrate = vi.fn();
    const android = createDevicePlay({ userAgent: 'Mozilla Android 14', vibrate });
    android.landing(true); android.setPlaying(true); android.landing(false);
    expect(vibrate).not.toHaveBeenCalled();
    android.landing(true);
    expect(vibrate).toHaveBeenCalledExactlyOnceWith(10);
    for (const userAgent of ['iPhone', 'iPad', 'Macintosh', 'Windows']) {
      expect(isAndroid(userAgent)).toBe(false);
      const other = createDevicePlay({ userAgent, vibrate });
      other.setPlaying(true); other.landing(true);
    }
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});

describe('landing and the saved choice', () => {
  it('ignores normal jumps, triggers once after a high fall and resets on carried/respawn modes', () => {
    const sample = createHighLanding();
    const at = (y: number, grounded = false, mode = 'free') => sample({ y, grounded, mode });
    expect(at(0, true)).toBe(false);
    expect(at(1.1)).toBe(false);
    expect(at(0, true)).toBe(false);
    at(3); at(2); at(1);
    expect(at(0, true)).toBe(true);
    expect(at(0, true)).toBe(false);
    at(5); at(3, false, 'down');
    expect(at(0, true)).toBe(false);
    at(5, false, 'ride');
    expect(at(0, true)).toBe(false);
    at(5); sample.reset();
    expect(at(0, true)).toBe(false);
  });
  it('migrates to off, persists a deliberate choice and preserves it across styles', () => {
    for (const style of ['aventyr', 'lugnt'] as const) {
      expect(settingsFor(style).vibration).toBe(false);
      expect(readSettings({ style, vibration: 'true' }).vibration).toBe(false);
    }
    expect(readSettings({}).vibration).toBe(false);
    const chosen = { ...settingsFor('aventyr'), vibration: true };
    const saved = readSave(JSON.stringify(newSave(1, 'garden', chosen)));
    expect(saved.kind === 'save' && saved.save.settings.vibration).toBe(true);
    expect(changeStyle(chosen, 'lugnt').vibration).toBe(true);
  });
});
