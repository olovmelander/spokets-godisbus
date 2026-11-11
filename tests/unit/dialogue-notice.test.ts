import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHud, readingTime } from '../../src/ui/hud';
import { sv } from '../../src/content/sv';
import { fakePage } from '../robot/listener';

const voice = vi.hoisted(() => ({ key: null as string | null }));
vi.mock('../../src/audio/voice-player', () => ({
  playingVoice: () => voice.key,
  playVoice: (key: string) => { voice.key = key; },
  stopVoice: () => { voice.key = null; },
}));
beforeEach(() => { voice.key = null; });

function fixture() {
  const doc = fakePage({ show() {}, hide() {} });
  const hud = createHud(doc, 0);
  return { hud, tag: doc.getElementById('notice')!, text: doc.getElementById('noticeText')! };
}

describe('reward notices wait for the dialogue floor', () => {
  it('preserves the exact remaining visible time across a recording, continuation linger and Pause', () => {
    const { hud, tag } = fixture();
    hud.notice('A found memory', 3);
    hud.tick(1);
    expect(tag.hidden).toBe(false);
    hud.say('elof', 'tiny');
    expect(tag.hidden).toBe(true);
    hud.tick(0);
    hud.tick(60);
    expect(tag.hidden).toBe(true); // The recording still owns the floor.
    voice.key = null;
    hud.tick(.01); // Finish the line, then retain its complete text for a continuation.
    hud.tick(.29);
    expect(tag.hidden).toBe(true);
    hud.tick(.02);
    hud.tick(0);
    expect(tag.hidden).toBe(false);
    hud.paused(true);
    hud.tick(100);
    expect(tag.hidden).toBe(false);
    hud.paused(false);
    hud.tick(1.99);
    expect(tag.hidden).toBe(false);
    hud.tick(.02);
    expect(tag.hidden).toBe(true);
  });

  it('defers a new notice through every queued line without briefly flashing between speakers', () => {
    const { hud, tag } = fixture();
    hud.say('elof', 'tiny');
    hud.say('pappa', 'first1');
    hud.notice('A found sweet', 3);
    expect(tag.hidden).toBe(true);
    hud.tick(0);
    voice.key = null;
    hud.tick(readingTime(sv.lines.tiny) + .01);
    expect(hud.saying()?.key).toBe('first1');
    expect(tag.hidden).toBe(true);
    voice.key = null;
    hud.tick(readingTime(sv.lines.first1) + .01);
    hud.tick(.31);
    hud.tick(0);
    expect(tag.hidden).toBe(false);
    hud.tick(2.99);
    expect(tag.hidden).toBe(false);
    hud.tick(.02);
    expect(tag.hidden).toBe(true);
  });

  it('retains replacement semantics while deferred and still lets a staged scene hush the notice', () => {
    const { hud, tag, text } = fixture();
    hud.say('elof', 'tiny');
    hud.tick(0);
    hud.notice('Earlier find', 3);
    hud.notice('Latest find', 5);
    expect(text.textContent).toBe('Latest find');
    expect(tag.hidden).toBe(true);
    voice.key = null;
    hud.tick(readingTime(sv.lines.tiny) + .01);
    hud.tick(.31);
    hud.tick(0);
    hud.tick(4.99);
    expect(tag.hidden).toBe(false);
    hud.tick(.02);
    expect(tag.hidden).toBe(true);

    hud.say('pappa', 'first1', true);
    hud.tick(0);
    hud.notice('A quiet find', 3);
    hud.hush();
    expect(hud.speaking()).toBe(true);
    voice.key = null;
    hud.tick(30);
    hud.tick(.31);
    hud.tick(0);
    expect(tag.hidden).toBe(true);
  });

  it('also yields to a card recording with no bubble', () => {
    const { hud, tag } = fixture();
    voice.key = 'scene_morgon';
    hud.notice('A new photo', 3);
    hud.tick(100);
    expect(tag.hidden).toBe(true);
    voice.key = null;
    hud.tick(2.99);
    expect(tag.hidden).toBe(false);
    hud.tick(.02);
    expect(tag.hidden).toBe(true);
  });
});
