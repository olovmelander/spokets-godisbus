import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class Voice {
  static made: Voice[] = [];
  static throws = false;
  volume = 1;
  currentTime = 0;
  duration = NaN;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  reject!: (error: Error) => void;
  attempt = new Promise<void>((_resolve, reject) => { this.reject = reject; });
  paused = true;
  pause = vi.fn(() => { this.paused = true; });
  play = vi.fn(() => {
    if (Voice.throws) throw new Error('Playback unavailable');
    this.paused = false;
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

  it('holds an audible line when the page is hidden', () => {
    player.playVoice('tiny');
    page.hidden = true; page.dispatchEvent(new Event('visibilitychange'));
    expect(Voice.made[0]!.pause).toHaveBeenCalledOnce();
    expect(player.playingVoice()).toBe('tiny');
  });

  it('continues a backgrounded recording when play resumes, while a visible Pause menu keeps it held', () => {
    player.playVoice('tiny');
    const voice = Voice.made[0]!;
    voice.currentTime = 1.7;
    page.hidden = true;
    page.dispatchEvent(new Event('visibilitychange'));
    expect(voice.paused).toBe(true);
    expect(player.playingVoice()).toBe('tiny');
    // The page's visible handler supplies whether a menu or a platform interruption still holds play.
    page.hidden = false;
    player.resumeVoice(false);
    expect(voice.paused).toBe(true);
    expect(voice.play).toHaveBeenCalledTimes(1);
    player.resumeVoice(true);
    expect(voice.paused).toBe(false);
    expect(voice.play).toHaveBeenCalledTimes(2);
    expect(voice.currentTime).toBe(1.7);
    voice.onended!();
    // The HUD can advance again: the finished recording no longer holds its bubble or the next event.
    expect(player.playingVoice()).toBeNull();
  });

  it.each([false, true])('cancels a queued autoplay retry on page exit (persisted %s)', async persisted => {
    player.playVoice('tiny');
    Voice.made[0]!.reject(blocked()); await flush();
    gestures.dispatchEvent(Object.assign(new Event('pagehide'), { persisted }));
    gestures.dispatchEvent(new Event('pointerdown'));
    expect(Voice.made).toHaveLength(1);
  });

  it('retains the active recording and its position in the back-forward cache, resuming only when the app permits', () => {
    player.playVoice('tiny');
    const voice = Voice.made[0]!;
    voice.currentTime = 1.7;
    gestures.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: true }));
    expect(voice.paused).toBe(true);
    expect(voice.currentTime).toBe(1.7);
    expect(player.playingVoice()).toBe('tiny');
    // Restoring the page is not permission to resume over a visible Pause menu.
    gestures.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
    player.resumeVoice(false);
    expect(voice.paused).toBe(true);
    expect(voice.play).toHaveBeenCalledTimes(1);
    player.resumeVoice(true);
    expect(voice.paused).toBe(false);
    expect(voice.play).toHaveBeenCalledTimes(2);
    expect(voice.currentTime).toBe(1.7);
    expect(player.playingVoice()).toBe('tiny');
    expect(Voice.made).toHaveLength(1);
    voice.onended!();
    expect(player.playingVoice()).toBeNull();
  });

  it('discards the active recording on an actual departure so returning cannot revive the abandoned line', () => {
    player.playVoice('tiny');
    const voice = Voice.made[0]!;
    voice.currentTime = 1.7;
    gestures.dispatchEvent(Object.assign(new Event('pagehide'), { persisted: false }));
    expect(voice.paused).toBe(true);
    expect(voice.currentTime).toBe(0);
    expect(player.playingVoice()).toBeNull();
    player.resumeVoice(true);
    expect(voice.play).toHaveBeenCalledTimes(1);
  });

  it('holds the line being said under Pause, and lets it finish after, not again from its start', () => {
    player.playVoice('tiny');
    player.pauseVoice();
    const voice = Voice.made[0]! as Voice & { paused?: boolean };
    expect(voice.pause).toHaveBeenCalledOnce();
    expect(player.playingVoice()).toBe('tiny');
    voice.paused = true;
    voice.currentTime = 1.2;
    player.resumeVoice();
    expect(voice.play).toHaveBeenCalledTimes(2);
    expect(voice.currentTime).toBe(1.2);
    expect(Voice.made).toHaveLength(1);
    // Nothing to go on with once the line is gone.
    player.stopVoice();
    player.resumeVoice();
    expect(voice.play).toHaveBeenCalledTimes(2);
  });

  it('reports the recording clock for lip-sync, including metadata loading and Pause', () => {
    expect(player.voicePosition()).toBeNull();
    player.playVoice('tiny');
    const voice = Voice.made[0]!;
    expect(player.voicePosition()).toEqual({ key: 'tiny', seconds: 0, duration: 0 });
    voice.duration = 8.4; voice.currentTime = 2.1;
    player.pauseVoice();
    expect(player.voicePosition()).toEqual({ key: 'tiny', seconds: 2.1, duration: 8.4 });
    voice.onended!();
    expect(player.voicePosition()).toBeNull();
  });

  it('does not report a playing line when play() throws synchronously', () => {
    Voice.throws = true;
    expect(() => player.playVoice('newGhost')).not.toThrow();
    expect(player.playingVoice()).toBeNull();
  });
});
