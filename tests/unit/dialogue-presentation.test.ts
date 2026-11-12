import { expect, it, vi } from 'vitest';
import { sv } from '../../src/content/sv';
import { createHud, readingTime } from '../../src/ui/hud';
import { fakePage } from '../robot/listener';

const voice = vi.hoisted(() => ({ key: null as string | null }));
vi.mock('../../src/audio/voice-player', () => ({
  hasVoice: () => false,
  playingVoice: () => voice.key,
  playVoice: (key: string) => { voice.key = key; },
  stopVoice: () => { voice.key = null; },
}));

it('keeps a protected line in its dock through Pause and completion linger until the next displayed line', () => {
  const doc = fakePage({ show() {}, hide() {} });
  const completed = vi.fn();
  const hud = createHud(doc, 0, undefined, undefined, undefined, undefined, completed);
  const bubble = doc.getElementById('bubble')!;
  hud.say('pappa', 'first2', true, 'first2');
  hud.tick(0);
  expect(bubble.dataset.protected).toBe('true');
  expect(bubble.hidden).toBe(false);
  hud.paused(true);
  voice.key = null;
  hud.tick(100);
  expect(bubble.dataset.protected).toBe('true');
  expect(hud.reading()).toBe(true);
  expect(completed).not.toHaveBeenCalled();

  hud.paused(false);
  hud.tick(readingTime(sv.lines.first2) + .01);
  expect(hud.reading()).toBe(false); // Continue is now hidden, but its card must not relocate.
  expect(bubble.hidden).toBe(false);
  expect(bubble.dataset.protected).toBe('true');
  hud.tick(.15);
  expect(bubble.hidden).toBe(false);
  hud.say('pappa', 'first3', true, 'first3');
  hud.tick(0);
  expect(hud.reading()).toBe(true);
  expect(bubble.dataset.protected).toBe('true');
  expect(doc.getElementById('bubbleLine')!.textContent).toBe(`${sv.lines.first2} ${sv.lines.first3}`);

  voice.key = null;
  hud.tick(readingTime(sv.lines.first3) + .01);
  hud.tick(.31);
  expect(bubble.hidden).toBe(true);
  expect(completed.mock.calls).toEqual([['first2'], ['first3']]);
  hud.say('elof', 'tiny');
  hud.tick(0);
  expect(bubble.hidden).toBe(false);
  expect(bubble.dataset.protected).toBe('false');
  expect(hud.reading()).toBe(false);
});
