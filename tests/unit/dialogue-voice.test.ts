import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fakePage } from '../robot/listener';
import { createHud, readingTime } from '../../src/ui/hud';
import { sv } from '../../src/content/sv';

const voice = vi.hoisted(() => ({ key: null as string | null }));
vi.mock('../../src/audio/voice-player', () => ({
  playingVoice: () => voice.key,
  playVoice: (key: string) => { voice.key = key; },
  stopVoice: () => { voice.key = null; },
}));

beforeEach(() => { voice.key = null; });

describe('the bubble and the recording finish together', () => {
  it('keeps a long recording visible and postpones the queued line beyond its reading estimate', () => {
    const shown: string[] = [];
    const hud = createHud(fakePage({ show: (line) => shown.push(line), hide: () => shown.push('hidden') }), 0);
    hud.say('elof', 'tiny'); hud.tick(0);
    hud.say('pappa', 'first1');
    hud.tick(30); hud.tick(30);
    expect(shown).toHaveLength(1);
    expect(voice.key).toBe('tiny');
    expect(hud.speaking()).toBe(true);
    voice.key = null;
    hud.tick(1 / 60);
    expect(voice.key).toBe('first1');
    expect(shown.at(-1)).toBe('Min allra första trägubbe …');
  });

  it('does not let Fortsätt cut an audible story line', () => {
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0);
    hud.say('pappa', 'first1', true); hud.tick(0); hud.tick(30);
    expect(hud.advance()).toBe(false);
    expect(hud.reading()).toBe(true);
    expect(voice.key).toBe('first1');
    voice.key = null;
    expect(hud.advance()).toBe(true);
    expect(hud.reading()).toBe(false);
  });

  it('does not protect an ordinary line just because a protected line is queued after it', () => {
    const completed = vi.fn();
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    hud.say('elof', 'tiny', false, 'ordinary'); hud.tick(0);
    hud.say('pappa', 'first1', true, 'story');
    expect(hud.reading()).toBe(false);
    expect(hud.advance()).toBe(false);
    hud.tick(30);
    expect(hud.reading()).toBe(false);
    expect(completed).not.toHaveBeenCalled();
    voice.key = null;
    hud.tick(1 / 60);
    expect(hud.saying()?.key).toBe('first1');
    expect(hud.reading()).toBe(true);
    expect(completed.mock.calls).toEqual([['ordinary']]);
  });

  it.each([false, true])('finishes a silent line automatically after its scaled reading time (protected %s)', read => {
    const completed = vi.fn(), scale = 1.75;
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, () => scale, undefined, undefined, completed);
    hud.say('pappa', 'first1', read, 'first1'); hud.tick(0);
    voice.key = null; // Missing, disabled or already-finished recording.
    const duration = readingTime(sv.lines.first1) * scale;
    hud.tick(duration - .01);
    expect(completed).not.toHaveBeenCalled();
    expect(hud.speaking()).toBe(true);
    expect(hud.reading()).toBe(read);
    hud.tick(.02);
    expect(hud.speaking()).toBe(false);
    expect(hud.reading()).toBe(false);
    expect(completed.mock.calls).toEqual([['first1']]);
    hud.tick(30); hud.advance(); hud.hush(); hud.clear();
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('waits for an overlong voice and acknowledges only on a subsequent active frame', () => {
    const completed = vi.fn();
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    hud.say('pappa', 'first1', true, 'receipt'); hud.tick(0);
    hud.tick(60);
    expect(hud.reading()).toBe(true);
    expect(completed).not.toHaveBeenCalled();
    voice.key = null;
    hud.tick(0);
    expect(hud.reading()).toBe(true);
    expect(completed).not.toHaveBeenCalled();
    hud.tick(1 / 60);
    expect(hud.reading()).toBe(false);
    expect(completed.mock.calls).toEqual([['receipt']]);
  });

  it('allows optional early Continue only after the recording and the accidental-press guard', () => {
    const completed = vi.fn();
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    hud.say('pappa', 'first1', true, 'optional'); hud.tick(0);
    voice.key = null;
    hud.tick(.24);
    expect(hud.advance()).toBe(false);
    hud.tick(.02);
    expect(hud.advance()).toBe(true);
    expect(hud.advance()).toBe(false);
    expect(completed.mock.calls).toEqual([['optional']]);
    hud.tick(60);
    expect(completed).toHaveBeenCalledTimes(1);
  });

  it('holds both the reading timer and receipts under Pause, even after the voice finishes', () => {
    const completed = vi.fn();
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    hud.say('pappa', 'first1', true, 'paused'); hud.tick(0); hud.tick(.5);
    hud.paused(true); voice.key = null;
    hud.tick(100); hud.tick(0);
    expect(hud.advance()).toBe(false);
    expect(completed).not.toHaveBeenCalled();
    expect(hud.reading()).toBe(true);
    hud.paused(false); hud.tick(readingTime(sv.lines.first1) - .51);
    expect(completed).not.toHaveBeenCalled();
    hud.tick(.02);
    expect(completed.mock.calls).toEqual([['paused']]);
  });

  it('does not acknowledge interrupted or queued lines; an unread line can be replayed after reload', () => {
    const completed = vi.fn();
    const make = () => createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    const interrupted = make();
    interrupted.say('pappa', 'first1', true, 'unread'); interrupted.tick(0); interrupted.tick(.5);
    interrupted.say('pappa', 'first2', true, 'not-shown');
    interrupted.hush();
    expect(completed).not.toHaveBeenCalled();
    interrupted.clear(); interrupted.tick(100);
    expect(completed).not.toHaveBeenCalled();
    expect(interrupted.speaking()).toBe(false);
    const restored = make();
    restored.say('pappa', 'first1', true, 'unread'); restored.tick(0);
    voice.key = null; restored.tick(readingTime(sv.lines.first1) + .01);
    expect(completed.mock.calls).toEqual([['unread']]);
  });

  it('reports each stable beat ID only when that queued entry completes, including repeated spoken text', () => {
    const completed = vi.fn();
    const hud = createHud(fakePage({ show() {}, hide() {} }), 0, undefined, undefined, undefined, undefined, completed);
    hud.say('pappa', 'first1', true, 'one'); hud.say('pappa', 'first1', true, 'two'); hud.tick(0);
    voice.key = null; hud.tick(.3); hud.advance();
    expect(completed.mock.calls).toEqual([['one']]);
    hud.tick(0);
    expect(hud.reading()).toBe(true);
    voice.key = null; hud.tick(30);
    expect(completed.mock.calls).toEqual([['one'], ['two']]);
  });
});
