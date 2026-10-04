import { afterEach, describe, expect, it, vi } from 'vitest';
import { createAudio } from '../../src/audio/audio';
import { arrangementFor } from '../../src/audio/music';

class Parameter {
  value = 0;
  setValueAtTime() {}
  exponentialRampToValueAtTime() {}
  linearRampToValueAtTime() {}
}
class Node {
  gain = new Parameter(); frequency = new Parameter(); Q = new Parameter();
  onended: (() => void) | null = null;
  starts: number[] = []; stops: (number | undefined)[] = [];
  connect(other: Node) { return other; }
  disconnect() {}
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
  createBiquadFilter() { return new Node(); }
  createBuffer(_channels: number, frames: number) { return { getChannelData: () => new Float32Array(frames) }; }
  createBufferSource() { const source = new Node(); this.sources.push(source); return source; }
  createOscillator() { return this.createBufferSource(); }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
}

afterEach(() => vi.unstubAllGlobals());
describe('audio pause lifecycle', () => {
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
