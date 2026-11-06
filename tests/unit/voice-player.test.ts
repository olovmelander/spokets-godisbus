import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class Voice {
  static made: Voice[] = [];
  static throws = false;
  volume = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  reject!: (error: Error) => void;
  attempt = new Promise<void>((_resolve, reject) => { this.reject = reject; });
  pause = vi.fn();
  play = vi.fn(() => {
    if (Voice.throws) throw new Error('Playback unavailable');
    return this.attempt;
  });
  constructor(readonly url: string) { Voice.made.push(this); }
}

let gestures: EventTarget;
let page: EventTarget & { hidden: boolean };
let player: typeof import('../../src/audio/voice-player');
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };
const blocked = () => new DOMException('Gesture required', 'NotAllowedError');

beforeEach(async () => {
  vi.resetModules();
  Voice.made = []; Voice.throws = false;
  gestures = new EventTarget();
  page = Object.assign(new EventTarget(), { hidden: false });
  vi.stubGlobal('window', gestures);
  vi.stubGlobal('document', page);
  vi.stubGlobal('Audio', Voice);
  player = await import('../../src/audio/voice-player');
});
afterEach(() => { player.stopVoice(); vi.unstubAllGlobals(); });

describe('spoken-line lifecycle', () => {
  it('leaves unrecorded dialogue silent and stops the previous recorded line', () => {
    player.playVoice('tiny');
    expect(player.playingVoice()).toBe('tiny');
    player.playVoice('skPower');
    player.playVoice('scene_stormkvall');
    expect(Voice.made).toHaveLength(1);
    expect(Voice.made[0]!.pause).toHaveBeenCalledOnce();
    expect(player.playingVoice()).toBeNull();
  });

  it('stops the current line when sound is muted and never resumes it on unmute', () => {
    player.playVoice('stolenBag');
    player.setVoiceSettings(false, .7);
    expect(Voice.made[0]!.pause).toHaveBeenCalledOnce();
    expect(player.playingVoice()).toBeNull();
    player.setVoiceSettings(true, .7);
    gestures.dispatchEvent(new Event('pointerdown'));
    expect(Voice.made).toHaveLength(1);
  });

  it('does not resurrect a dismissed line when the next gesture unlocks audio', async () => {
    player.playVoice('thanked');
    Voice.made[0]!.reject(blocked()); await flush();
    player.stopVoice();
    gestures.dispatchEvent(new Event('keydown'));
    expect(Voice.made).toHaveLength(1);
    expect(player.playingVoice()).toBeNull();
  });

  it('ignores a late autoplay rejection belonging to an older line', async () => {
    player.playVoice('fallenStar');
    player.playVoice('tiny');
    Voice.made[0]!.reject(blocked()); await flush();
    gestures.dispatchEvent(new Event('pointerdown'));
    expect(Voice.made).toHaveLength(2);
    expect(player.playingVoice()).toBe('tiny');
    expect(Voice.made[1]!.pause).not.toHaveBeenCalled();
  });

  it('clears a blocked line when volume is muted before the next gesture', async () => {
    player.playVoice('forestTrial');
    Voice.made[0]!.reject(blocked()); await flush();
    player.setVoiceSettings(true, 0);
    player.setVoiceSettings(true, 1);
    gestures.dispatchEvent(new Event('pointerdown'));
    expect(Voice.made).toHaveLength(1);
  });

  it('still retries the current blocked line once on a genuine gesture', async () => {
    player.playVoice('tiny');
    Voice.made[0]!.reject(blocked()); await flush();
    gestures.dispatchEvent(new Event('pointerdown'));
    gestures.dispatchEvent(new Event('keydown'));
    expect(Voice.made).toHaveLength(2);
    expect(Voice.made[1]!.url).toContain('/audio/voices/tiny.mp3');
    expect(player.playingVoice()).toBe('tiny');
  });

  it('stops an audible line when the page is hidden', () => {
    player.playVoice('tiny');
    page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
    expect(Voice.made[0]!.pause).toHaveBeenCalledOnce();
    expect(player.playingVoice()).toBeNull();
  });

  it('cancels a queued line on page exit, including a back-forward-cache entry', async () => {
    player.playVoice('tiny');
    Voice.made[0]!.reject(blocked()); await flush();
    gestures.dispatchEvent(new Event('pagehide'));
    gestures.dispatchEvent(new Event('pointerdown'));
    expect(Voice.made).toHaveLength(1);
  });

  it('does not report a playing line when play() throws synchronously', () => {
    Voice.throws = true;
    expect(() => player.playVoice('newGhost')).not.toThrow();
    expect(player.playingVoice()).toBeNull();
  });
});
