import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudio, uiKey } from '../../src/audio/audio';
import { arrangementFor, MUSIC_LEVEL } from '../../src/audio/music';

class Parameter {
  value = 0;
  /** Where the last ramp goes: what the level will be once it has glided there. */
  target: number | null = null;
  setValueAtTime() {}
  exponentialRampToValueAtTime(to: number) { this.target = to; }
  linearRampToValueAtTime(to: number) { this.target = to; }
  setTargetAtTime(to: number) { this.target = to; }
  cancelScheduledValues() { this.target = null; }
}
class Node {
  gain = new Parameter(); frequency = new Parameter(); Q = new Parameter();
  type = '';
  onended: (() => void) | null = null;
  starts: number[] = []; stops: (number | undefined)[] = [];
  connect(other: Node) { return other; }
  disconnect() {}
  addEventListener() {}
  start(at = 0) { this.starts.push(at); }
  stop(at?: number) { this.stops.push(at); }
}
class Context {
  static instance: Context;
  currentTime = 0; sampleRate = 8000; state = 'suspended';
  destination = new Node(); sources: Node[] = []; gains: Node[] = [];
  constructor() { Context.instance = this; }
  createDynamicsCompressor() { return new Node(); }
  createGain() { const gain = new Node(); this.gains.push(gain); return gain; }
  filters: Node[] = [];
  createBiquadFilter() { const filter = new Node(); this.filters.push(filter); return filter; }
  createBuffer(_channels: number, frames: number) { return { getChannelData: () => new Float32Array(frames) }; }
  createBufferSource() { const source = new Node(); this.sources.push(source); return source; }
  createOscillator() { return this.createBufferSource(); }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
}

afterEach(() => vi.unstubAllGlobals());
describe('audio pause lifecycle', () => {
  it('keeps the star hush independent of mute, volume, menus and page sleep', () => {
    vi.stubGlobal('window', { AudioContext: Context });
    const audio = createAudio();
    audio.storyQuiet(true);
    audio.unlock();
    const context = Context.instance;
    const [, effects, music, ambience] = context.gains;
    expect(music!.gain.value).toBeCloseTo(MUSIC_LEVEL * 0.18);
    expect(ambience!.gain.value).toBeCloseTo(0.15);
    audio.setMusic(0.4);
    audio.setEffects(0.6);
    expect(effects!.gain.value).toBe(0.6);
    expect(music!.gain.value).toBeCloseTo(MUSIC_LEVEL * 0.4 * 0.18);
    expect(ambience!.gain.value).toBeCloseTo(0.6 * 0.15);
    audio.menu(true);
    expect(music!.gain.target).toBeCloseTo(MUSIC_LEVEL * 0.4 * 0.18 * 0.355);
    expect(ambience!.gain.target).toBeCloseTo(0.6 * 0.15 * 0.5);
    audio.setMusic(0);
    audio.setEffects(0);
    audio.storyQuiet(false);
    expect(music!.gain.target).toBe(0);
    expect(ambience!.gain.target).toBe(0);
    audio.sleep(true);
    audio.storyQuiet(true);
    expect(audio.mode).toBe('off');
    audio.setMusic(0.4);
    audio.setEffects(0.6);
    audio.sleep(false);
    expect(music!.gain.target).toBeCloseTo(MUSIC_LEVEL * 0.4 * 0.18 * 0.355);
    audio.storyQuiet(false);
    audio.menu(false);
    expect(music!.gain.target).toBeCloseTo(MUSIC_LEVEL * 0.4);
    expect(ambience!.gain.target).toBeCloseTo(0.6);
  });

  it.each(['bird', 'blink', 'paper', 'taste', 'swell', 'poff', 'breath'] as const)('cancels the opening %s sound on pause and never plays it muted or hidden', sound => {
    vi.stubGlobal('window', { AudioContext: Context });
    const audio = createAudio();
    const cue = { kind: 'story', sound } as const;
    audio.play(cue);
    expect(audio.played).toBe(0);
    audio.unlock();
    const context = Context.instance;
    audio.play(cue);
    expect(audio.played).toBe(1);
    const sources = [...context.sources];
    expect(sources.length).toBeGreaterThan(0);
    audio.menu(true);
    for (const source of sources) expect(source.stops).toContain(undefined);
    audio.play(cue);
    audio.menu(false);
    audio.setEffects(0);
    audio.play(cue);
    audio.setEffects(1);
    audio.sleep(true);
    audio.play(cue);
    audio.sleep(false);
    expect(context.sources).toHaveLength(sources.length);
    expect(audio.played).toBe(1);
  });

  it('silences every bus, cancels delayed effects/music, and menu inputs cannot wake it', () => {
    vi.stubGlobal('window', { AudioContext: Context });
    const audio = createAudio();
    audio.setPlace(arrangementFor('garden', 'garden'));
    audio.unlock();
    const context = Context.instance;
    context.currentTime = 0.3;
    audio.tick(true);
    audio.play({ kind: 'call', who: 'mamma' });
    const before = [...context.sources];
    expect(before.some((s) => s.starts.some((at) => at > context.currentTime))).toBe(true);
    const played = audio.played;
    const bars = audio.bars;
    audio.sleep(true);
    expect(context.gains[0]!.gain.value).toBe(0);
    expect(audio.running).toBe(false);
    for (const source of before) expect(source.stops).toContain(undefined);
    for (let i = 0; i < 10; i++) { audio.unlock(); audio.tick(true); audio.play({ kind: 'jump' }); }
    expect(audio.played).toBe(played);
    expect(audio.bars).toBe(bars);
    expect(context.sources).toHaveLength(before.length);

    context.currentTime = 50;
    audio.sleep(false);
    audio.tick(true);
    expect(audio.running).toBe(true);
    expect(audio.bars).toBe(bars); // New bar begins ahead, never a catch-up burst.
    expect(context.gains[0]!.gain.value).toBe(0.8);
    expect(context.sources.slice(before.length).every((s) => s.starts.every((at) => at === 0 || at >= 50))).toBe(true);
    audio.play({ kind: 'jump' });
    expect(audio.played).toBe(played + 1);
  });

  it('a paused title never creates an AudioContext from a menu tap', () => {
    const ctor = vi.fn();
    vi.stubGlobal('window', { AudioContext: ctor });
    const audio = createAudio();
    audio.sleep(true);
    audio.unlock();
    expect(ctor).not.toHaveBeenCalled();
  });
});

describe('sound under a menu (docs/ux-audit/style-and-sound.md rows 20 and 21)', () => {
  it('stops the world, keeps the tune going muffled and the air lower, and lets the UI sound', () => {
    vi.stubGlobal('window', { AudioContext: Context });
    const audio = createAudio();
    audio.setPlace(arrangementFor('garden', 'garden'));
    audio.unlock();
    const context = Context.instance;
    context.state = 'running';
    context.currentTime = 0.3;
    audio.tick(false);
    audio.play({ kind: 'call', who: 'mamma' });
    const calling = context.sources.filter((s) => s.starts.some((at) => at > 0.3));
    const played = audio.played;
    audio.menu(true);
    expect(audio.mode).toBe('menu');
    expect(audio.running).toBe(true);
    // The world's sounds are cut; the tune's are not.
    expect(calling.some((s) => s.stops.includes(undefined))).toBe(true);
    const [master, effects, music, ambience] = context.gains;
    // The first filter the context makes is the paper the tune is heard through.
    const muffle = context.filters[0]!;
    expect(muffle.frequency.target).toBe(1100);
    expect(music!.gain.target).toBeCloseTo(music!.gain.value * 0.355);
    expect(ambience!.gain.target).toBeCloseTo(effects!.gain.value * 0.5);
    audio.play({ kind: 'jump' });
    expect(audio.played).toBe(played);
    const bars = audio.bars;
    for (let t = 1; t <= 4; t++) { context.currentTime = 0.3 + t; audio.tick(false); }
    expect(audio.bars).toBeGreaterThan(bars);
    const sources = context.sources.length;
    audio.ui('press');
    expect(audio.uiPlayed).toBe(1);
    expect(context.sources.length).toBeGreaterThan(sources);

    // Left alone for half a minute the menu goes quiet; the next touch wakes it.
    context.currentTime = 40;
    audio.tick(false);
    expect(audio.mode).toBe('off');
    expect(master!.gain.target).toBe(0);
    audio.unlock();
    expect(audio.mode).toBe('menu');
    expect(master!.gain.value).toBe(0.8);

    audio.menu(false);
    expect(audio.mode).toBe('play');
    expect(muffle.frequency.target).toBe(20000);
    audio.play({ kind: 'jump' });
    expect(audio.played).toBe(played + 1);
  });

  it('is silent with Ljud off, and off while the page is hidden', () => {
    vi.stubGlobal('window', { AudioContext: Context });
    const audio = createAudio();
    audio.unlock();
    Context.instance.state = 'running';
    audio.menu(true);
    audio.setEffects(0);
    audio.ui('press');
    expect(audio.uiPlayed).toBe(0);
    audio.setEffects(1);
    audio.sleep(true);
    audio.ui('press');
    expect(audio.uiPlayed).toBe(0);
    expect(audio.mode).toBe('off');
  });

  it('plays the UI in the place\'s key, folded round D', () => {
    expect(uiKey(0)).toBe(0);
    expect(uiKey(-12)).toBe(0);
    expect(uiKey(-5)).toBe(7);
    expect(uiKey(9)).toBe(-3);
  });
});
