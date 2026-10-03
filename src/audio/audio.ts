import type { Cue, Footing } from './cues';
import { AIRS, barOf, barSeconds, barsIn, frequencyOf, MUSIC_LEVEL, pluck, RING, type Arrangement } from './music';

/**
 * The game's sound (plan §5.8, §6.8). All of it is made in code, so sound costs no download.
 * There are no voices and no recordings: characters will make short wordless sounds, never words.
 *
 * One AudioContext, unlocked by the first tap, click or key. Three buses, music, effects and ambience, go to
 * the master and a compressor. *Ljud* is the effects and the place's air; *Musik* is the tune.
 */
export interface Audio {
  /** Call from a pointerup, a click or a keydown: browsers start sound only from those. */
  unlock(): void;
  play(cue: Cue): void;
  /** 0 is silent, 1 is full. The place's air follows it. */
  setEffects(volume: number): void;
  /** 0 is silent, 1 is full. */
  setMusic(volume: number): void;
  /** *Ljud även i tyst läge*: whether an iPhone's silent switch is passed by (plan §6.8). */
  setLoud(on: boolean): void;
  /** How this part of the story plays the tune, and its air; null is neither. It begins once sound runs. */
  setPlace(arrangement: Arrangement | null): void;
  /**
   * Call every frame: the next bar is given its notes a moment before it begins. With `chase` the wood
   * knocks, from the next bar line on.
   */
  tick(chase: boolean): void;
  /** The page was hidden, or shown again: sound sleeps with it. */
  sleep(hidden: boolean): void;
  /** True once the context runs: for the debug text and the tests. */
  readonly running: boolean;
  /** How many effects have been started. */
  readonly played: number;
  /** How many bars of music have been given their notes. */
  readonly bars: number;
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
  let music: GainNode | null = null;
  let ambience: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let volume = 1;
  let musicVolume = 1;
  let played = 0;
  // The music: which arrangement, which bar comes next and when, and each string once it has been made.
  let arrangement: Arrangement | null = null;
  let started = false;
  let bar = 0;
  let nextBar = 0;
  let bars = 0;
  const strings = new Map<number, AudioBuffer>();
  // The air: its wind, while it blows, and when each of its calls comes next.
  let wind: { source: AudioBufferSourceNode; swell: OscillatorNode } | null = null;
  let callsAt: number[] = [];
  let dice = 4711;
  const roll = () => (dice = (dice * 16807) % 2147483647) / 2147483647;

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
    master.connect(compressor).connect(context.destination);
    effects.connect(master);
    music = context.createGain();
    music.gain.value = MUSIC_LEVEL * musicVolume;
    music.connect(master);
    ambience = context.createGain();
    ambience.gain.value = volume;
    ambience.connect(master);
    // Four seconds of noise, made with a fixed sequence: the same sound every time, and long enough for a
    // wind that doesn't come round audibly.
    noise = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const data = noise.getChannelData(0);
    let seed = 22222;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      data[i] = (seed / 2147483647) * 2 - 1;
    }
  }

  /** A tone that starts at once and dies away: the stuff of plucks, chimes and chirps. */
  function tone(type: OscillatorType, from: number, to: number, length: number, level: number, delay = 0): void {
    if (context && effects) toneAt(effects, context.currentTime + delay, type, from, to, length, level);
  }

  function toneAt(bus: GainNode, at: number, type: OscillatorType, from: number, to: number, length: number, level: number): void {
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, at);
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, to), at + length);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    oscillator.connect(gain).connect(bus);
    oscillator.start(at);
    oscillator.stop(at + length + 0.02);
  }

  /** A puff of filtered noise: steps, landings, splashes, whooshes. */
  function puff(kind: BiquadFilterType, from: number, to: number, length: number, level: number, delay = 0, q = 1): void {
    if (context && effects) puffAt(effects, context.currentTime + delay, kind, from, to, length, level, q);
  }

  function puffAt(bus: GainNode, at: number, kind: BiquadFilterType, from: number, to: number, length: number, level: number, q: number): void {
    if (!context || !noise) return;
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
    source.connect(filter).connect(gain).connect(bus);
    source.start(at, (played * 0.137) % 0.5);
    source.stop(at + length + 0.02);
  }

  /** One footstep, on what he walks on (plan §5.8). The left foot and the right differ a little. */
  function step(on: Footing | undefined, left: boolean): void {
    const foot = left ? 1.1 : 1;
    switch (on) {
      case 'plank':
        // Hollow: a board with air under it.
        tone('sine', 180 * foot, 120, 0.05, 0.09);
        puff('bandpass', 1400 * foot, 800, 0.03, 0.05, 0, 3);
        break;
      case 'moss':
        // Almost nothing: soft and dull.
        puff('lowpass', 420 * foot, 200, 0.07, 0.07);
        break;
      case 'grass':
        puff('bandpass', 2200 * foot, 1200, 0.06, 0.04, 0, 1.2);
        puff('lowpass', 380, 200, 0.05, 0.04);
        break;
      case 'squelch':
        // Wet sphagnum: it sucks at his shoe, and lets go.
        puff('lowpass', 320, 160, 0.06, 0.07);
        puff('bandpass', 500 * foot, 1500, 0.09, 0.08, 0.02, 5);
        break;
      case 'stone':
        // A hard, short click.
        puff('bandpass', 2000 * foot, 1600, 0.025, 0.09, 0, 5);
        puff('lowpass', 600, 300, 0.03, 0.05);
        break;
      case 'gravel':
        // Dry earth and grit: two grains.
        puff('highpass', 1800 * foot, 3500, 0.05, 0.05);
        puff('highpass', 2400, 3000, 0.04, 0.035, 0.035);
        break;
      case 'shavings':
        // Pappa's shavings: a dry rustle.
        puff('bandpass', 3200 * foot, 2200, 0.07, 0.05, 0, 1.5);
        puff('bandpass', 2600, 1800, 0.05, 0.035, 0.03, 1.5);
        break;
      default:
        puff('bandpass', left ? 900 : 760, 500, 0.05, 0.08, 0, 2);
    }
  }

  function sound(cue: Cue): void {
    switch (cue.kind) {
      case 'step':
        step(cue.on, cue.left);
        break;
      case 'jump':
        tone('triangle', 300, 560, 0.11, 0.16);
        break;
      case 'land':
        puff('lowpass', 500, 120, 0.09, 0.12 + 0.2 * cue.hard);
        // A deck booms under him, and the bog gives.
        if (cue.on === 'plank') tone('sine', 140, 90, 0.09, 0.08 + 0.1 * cue.hard);
        else if (cue.on === 'squelch') puff('bandpass', 400, 1600, 0.14, 0.1, 0, 4);
        else if (cue.on === 'stone') puff('bandpass', 2000, 1500, 0.03, 0.08, 0, 5);
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
      case 'found':
        // A new kind for the album: a quick bright run up, and a sparkle on top.
        for (const [i, semitones] of [0, 7, 12, 16, 19].entries()) tone('triangle', note(semitones, 587.33), note(semitones, 587.33), 0.3, 0.17, i * 0.07);
        tone('sine', 2349, 2349, 0.5, 0.06, 0.36);
        break;
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

  /** One plucked string, made the first time it is asked for and kept. */
  function string(midi: number, bright: number): AudioBuffer {
    let buffer = strings.get(midi);
    if (!buffer) {
      const data = pluck(frequencyOf(midi), RING, context!.sampleRate, bright);
      buffer = context!.createBuffer(1, data.length, context!.sampleRate);
      buffer.getChannelData(0).set(data);
      strings.set(midi, buffer);
    }
    return buffer;
  }

  /** The place's music and air begin: its strings are made now, so that no bar has to wait for one. */
  function begin(): void {
    if (!context || !ambience || !noise || started) return;
    started = true;
    wind?.source.stop();
    wind?.swell.stop();
    wind = null;
    strings.clear();
    callsAt = [];
    if (!arrangement) return;
    for (let i = 0; i < barsIn(arrangement); i++) for (const s of barOf(arrangement, i)) if (s.voice === 'pluck') string(s.midi, arrangement.bright);
    bar = 0;
    nextBar = context.currentTime + 0.5;
    const air = AIRS[arrangement.ambience];
    callsAt = air.calls.map((call) => context!.currentTime + call.gap[0] * (0.3 + roll()));
    if (air.wind) {
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = air.wind.filter;
      filter.frequency.value = air.wind.frequency;
      filter.Q.value = air.wind.q;
      const gain = context.createGain();
      gain.gain.value = air.wind.level * 0.6;
      // It swells and sinks, slowly: wind is never even.
      const swell = context.createOscillator();
      swell.frequency.value = 1 / air.wind.swell;
      const depth = context.createGain();
      depth.gain.value = air.wind.level * 0.4;
      swell.connect(depth).connect(gain.gain);
      source.connect(filter).connect(gain).connect(ambience);
      source.start();
      swell.start();
      wind = { source, swell };
    }
  }

  /** Gives one bar its notes, from the moment `at` on. */
  function score(a: Arrangement, index: number, at: number, chase: boolean): void {
    if (!context || !music) return;
    for (const s of barOf(a, index, chase)) {
      const from = at + s.at;
      if (s.voice === 'knock') {
        // Wood on wood, as in Pappa's workshop.
        toneAt(music, from, 'sine', frequencyOf(s.midi) * 2, frequencyOf(s.midi) * 1.4, s.seconds, s.level);
        puffAt(music, from, 'bandpass', 1500, 900, 0.04, s.level * 0.5, 6);
      } else if (s.voice === 'scrape') {
        // The knife takes a shaving.
        puffAt(music, from, 'bandpass', 2600, 1400, s.seconds, s.level, 3);
      } else {
        const source = context.createBufferSource();
        source.buffer = string(s.midi, a.bright);
        const gain = context.createGain();
        gain.gain.setValueAtTime(s.level, from);
        gain.gain.setValueAtTime(s.level, from + s.seconds - 0.06);
        gain.gain.linearRampToValueAtTime(0, from + s.seconds);
        source.connect(gain).connect(music);
        source.start(from);
        source.stop(from + s.seconds + 0.02);
      }
    }
  }

  return {
    unlock() {
      build();
      // iOS leaves the context "interrupted" after a call; any later tap wakes it again.
      if (context && context.state !== 'running') void context.resume();
      begin();
    },
    play(cue) {
      if (!context || context.state !== 'running' || volume <= 0) return;
      played++;
      sound(cue);
    },
    setEffects(next) {
      volume = Math.max(0, Math.min(1, next));
      if (effects) effects.gain.value = volume;
      if (ambience) ambience.gain.value = volume;
    },
    setMusic(next) {
      musicVolume = Math.max(0, Math.min(1, next));
      if (music) music.gain.value = MUSIC_LEVEL * musicVolume;
    },
    setLoud(on) {
      if (session) session.type = on ? 'playback' : 'ambient';
    },
    setPlace(next) {
      arrangement = next;
      started = false;
      begin();
    },
    tick(chase) {
      if (!context || context.state !== 'running' || !arrangement || !ambience) return;
      const now = context.currentTime;
      // After a sleep, or a long frame, the tune goes on from now: never a heap of late bars at once.
      if (nextBar < now) nextBar = now + 0.1;
      if (nextBar < now + 0.3) {
        // With the music off the bars go by unplayed, so that switching it on takes up the tune where it is.
        if (musicVolume > 0) {
          score(arrangement, bar, nextBar, chase);
          bars++;
        }
        bar++;
        nextBar += barSeconds(arrangement);
      }
      const calls = AIRS[arrangement.ambience].calls;
      for (const [i, call] of calls.entries()) {
        if (now < callsAt[i]!) continue;
        callsAt[i] = now + call.gap[0] + (call.gap[1] - call.gap[0]) * roll();
        if (volume > 0) for (const t of call.tones) toneAt(ambience, now + 0.05 + t.delay, t.wave, t.from, t.to, t.seconds, t.level);
      }
    },
    sleep(hidden) {
      if (!context) return;
      if (hidden) void context.suspend();
      else void context.resume();
    },
    get running() {
      return context?.state === 'running';
    },
    get played() {
      return played;
    },
    get bars() {
      return bars;
    },
  };
}
