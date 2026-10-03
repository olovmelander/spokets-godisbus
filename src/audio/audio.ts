import type { Cue } from './cues';

/**
 * The game's sound (plan §5.8, §6.8). Every effect is made in code, so sound costs no download.
 * There are no voices and no recordings: characters will make short wordless sounds, never words.
 *
 * One AudioContext, unlocked by the first tap, click or key. Effects go through their own bus to the
 * master and a compressor; music and ambience get their buses when they arrive.
 */
export interface Audio {
  /** Call from a pointerup, a click or a keydown: browsers start sound only from those. */
  unlock(): void;
  play(cue: Cue): void;
  /** 0 is silent, 1 is full. */
  setEffects(volume: number): void;
  /** True once the context runs: for the debug text and the tests. */
  readonly running: boolean;
  /** How many effects have been started. */
  readonly played: number;
}

/** A pentatonic scale, in semitones: candy collected in a row steps up it (plan §5.8). */
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
const note = (semitones: number, base = 523.25) => base * 2 ** (semitones / 12);

type AudioCtor = typeof AudioContext;

export function createAudio(): Audio {
  const Ctor: AudioCtor | undefined =
    typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext);
  let context: AudioContext | null = null;
  let effects: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let volume = 1;
  let played = 0;

  // The silent switch of an iPhone silences the game, as it should (plan §6.8).
  const session = typeof navigator === 'undefined' ? undefined : (navigator as unknown as { audioSession?: { type: string } }).audioSession;
  if (session) session.type = 'ambient';

  function build(): void {
    if (context || !Ctor) return;
    context = new Ctor();
    const compressor = context.createDynamicsCompressor();
    const master = context.createGain();
    master.gain.value = 0.8;
    effects = context.createGain();
    effects.gain.value = volume;
    effects.connect(master).connect(compressor).connect(context.destination);
    // One second of noise, made with a fixed sequence: the same sound every time.
    noise = context.createBuffer(1, context.sampleRate, context.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 22222;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }

  /** A tone that starts at once and dies away: the stuff of plucks, chimes and chirps. */
  function tone(type: OscillatorType, from: number, to: number, length: number, level: number, delay = 0): void {
    if (!context || !effects) return;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(effects);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  }

  /** A puff of filtered noise: steps, landings, splashes, whooshes. */
  function puff(kind: BiquadFilterType, from: number, to: number, length: number, level: number, delay = 0, q = 1): void {
    if (!context || !effects || !noise) return;
    const at = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = kind;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, at);
    if (to !== from) filter.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    source.connect(filter).connect(gain).connect(effects);
    source.start(at, (played * 0.137) % 0.5);
    source.stop(at + length + 0.02);
  }

  function sound(cue: Cue): void {
    switch (cue.kind) {
      case 'step':
        puff('bandpass', cue.left ? 900 : 760, 500, 0.05, 0.08, 0, 2);
        break;
      case 'jump':
        tone('triangle', 300, 560, 0.11, 0.16);
        break;
      case 'land':
        puff('lowpass', 500, 120, 0.09, 0.12 + 0.2 * cue.hard);
        break;
      case 'candy': {
        const pitch = note(SCALE[Math.min(cue.streak, SCALE.length - 1)]!);
        tone('triangle', pitch, pitch, 0.16, 0.2);
        tone('sine', pitch * 2, pitch * 2, 0.22, 0.09, 0.02);
        break;
      }
      case 'bigCandy':
        for (const [i, semitones] of [0, 4, 7, 12].entries()) tone('sine', note(semitones, 659.25), note(semitones, 659.25), 0.5, 0.16, i * 0.09);
        break;
      case 'note': {
        // A round stone rings like a bell, with a little of the octave above it.
        const pitch = note(SCALE[cue.step % SCALE.length]!, 392);
        tone('sine', pitch, pitch, 0.9, 0.2);
        tone('sine', pitch * 2, pitch * 2, 0.5, 0.05);
        break;
      }
      case 'gust':
        puff('bandpass', 260, 900, 1.3, 0.14, 0, 0.6);
        break;
      case 'goal':
        for (const [i, semitones] of [0, 4, 7, 12, 16].entries()) tone('triangle', note(semitones, 523.25), note(semitones, 523.25), 0.45, 0.18, i * 0.11);
        break;
      case 'bubble':
        // The glitter gathers: a quick run of high, bright notes over a breath of air.
        for (let i = 0; i < 7; i++) tone('sine', note(SCALE[(i * 3) % SCALE.length]!, 1318.5), note(SCALE[(i * 3) % SCALE.length]!, 1318.5), 0.3, 0.07, i * 0.055);
        puff('highpass', 3000, 6000, 0.7, 0.05);
        break;
      case 'lace':
        tone('sawtooth', 660, 220, 0.14, 0.1);
        puff('bandpass', 1800, 700, 0.18, 0.08, 0.02, 3);
        break;
      case 'letGo':
        puff('bandpass', 500, 2400, 0.25, 0.12, 0, 1.5);
        break;
      case 'haul':
        puff('lowpass', 400, 200, 0.07, 0.14);
        puff('lowpass', 500, 220, 0.07, 0.12, 0.2);
        break;
      case 'grab':
        puff('bandpass', 1200, 800, 0.05, 0.1, 0, 4);
        break;
      case 'slide':
        tone('sine', 880, 300, 0.9, 0.07);
        puff('bandpass', 2400, 900, 0.9, 0.05, 0, 2);
        break;
      case 'knocked':
        tone('sine', 180, 70, 0.22, 0.3);
        puff('highpass', 1500, 5000, 0.3, 0.14);
        break;
      case 'splash':
        puff('highpass', 1200, 4500, 0.22, 0.04 + 0.12 * cue.near);
        break;
      case 'wood':
        // A thing on a rail: two knocks of wood, as in Pappa's workshop.
        tone('sine', 420, 300, 0.06, 0.22);
        puff('bandpass', 1500, 900, 0.05, 0.12, 0, 6);
        tone('sine', 360, 260, 0.07, 0.18, 0.5);
        break;
    }
  }

  return {
    unlock() {
      build();
      // iOS leaves the context "interrupted" after a call; any later tap wakes it again.
      if (context && context.state !== 'running') void context.resume();
    },
    play(cue) {
      if (!context || context.state !== 'running' || volume <= 0) return;
      played++;
      sound(cue);
    },
    setEffects(next) {
      volume = Math.max(0, Math.min(1, next));
      if (effects) effects.gain.value = volume;
    },
    get running() {
      return context?.state === 'running';
    },
    get played() {
      return played;
    },
  };
}
