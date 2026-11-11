/** Godisracet's small, local Web Audio graph. kartRpm and the clutch-driven
 * engine are adapted from pekkas-pokal kart/audio.js at 7762360; the wooden
 * chimes and pentatonic tune are original. No files or remote services load.
 */
export interface KartSoundState {
  speed: number;
  throttle: number;
  drifting: boolean;
  boost: boolean;
  phase: 'menu' | 'countdown' | 'racing' | 'finished';
}
export type KartSoundEvent = 'countdown' | 'go' | 'boost' | 'pickup' | 'finish';
export interface KartAudioSettings { effects: number; music: number; calm: boolean }
export interface KartAudioEnv { createContext(): AudioContext | null }
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const finite = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;
const IDLE_RPM = 1450, CLUTCH_RPM = 2350, MAX_RPM = 3900, TOP_SPEED = 18.5;

/** Source centrifugal-clutch engine follows load as well as road speed. */
export function kartRpm(previous: number, speed: number, throttle: number, dt: number, wheelspin = 0): number {
  const wheel = IDLE_RPM + clamp(finite(speed), 0, 22) * (MAX_RPM - IDLE_RPM) / TOP_SPEED * .98;
  let target = throttle ? Math.max(wheel, CLUTCH_RPM) : wheel > 2000 ? wheel : IDLE_RPM;
  target = Math.min(MAX_RPM + 150, target + clamp(finite(wheelspin), 0, 1) * 700);
  const rate = target > previous ? (throttle ? 7 : 3) : 4.5;
  return finite(previous, IDLE_RPM) + (target - finite(previous, IDLE_RPM)) * (1 - Math.exp(-rate * clamp(finite(dt), 0, .1)));
}

const browserEnv: KartAudioEnv = {
  createContext() {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctor ? new Ctor() : null;
  },
};

export function createKartAudio(settings: KartAudioSettings, env: KartAudioEnv = browserEnv) {
  const effectsVolume = clamp(finite(settings.effects), 0, 1), musicVolume = clamp(finite(settings.music), 0, 1);
  let ctx: AudioContext | null = null, disposed = false, suspended = false;
  let master: GainNode | null = null, effects: GainNode | null = null, music: GainNode | null = null;
  let engineLevel: GainNode | null = null, engineFilter: BiquadFilterNode | null = null;
  let engine: OscillatorNode | null = null, overtone: OscillatorNode | null = null;
  let windLevel: GainNode | null = null, slideLevel: GainNode | null = null;
  let rpm = IDLE_RPM, songClock = 0, songStep = 0;
  let resumePending = false, pendingState: KartSoundState | null = null;
  const pendingEvents: KartSoundEvent[] = [];
  const nodes = new Set<AudioNode>();
  const continuous = new Set<AudioScheduledSourceNode>();
  const notes = new Map<AudioScheduledSourceNode, AudioNode[]>();
  const own = <T extends AudioNode>(node: T): T => { nodes.add(node); return node; };
  const start = <T extends AudioScheduledSourceNode>(node: T): T => { own(node); continuous.add(node); node.start(); return node; };
  const forget = (node: AudioNode) => { node.disconnect(); nodes.delete(node); };
  const stopNotes = () => {
    for (const [source, connections] of notes) {
      try { source.stop(); } catch { /* An ended note is already silent. */ }
      source.onended = null;
      for (const node of connections) forget(node);
    }
    notes.clear();
  };

  function build(context: AudioContext): void {
    const gain = (value: number) => { const g = own(context.createGain()); g.gain.value = value; return g; };
    master = gain(0);
    const compressor = own(context.createDynamicsCompressor());
    compressor.threshold.value = -18; compressor.knee.value = 14; compressor.ratio.value = 3;
    compressor.attack.value = .008; compressor.release.value = .2;
    master.connect(compressor); compressor.connect(context.destination);
    effects = gain(effectsVolume); effects.connect(master);
    music = gain(musicVolume); music.connect(master);
    if (effectsVolume === 0) return;
    engineLevel = gain(0);
    engineFilter = own(context.createBiquadFilter()); engineFilter.type = 'lowpass'; engineFilter.frequency.value = 450; engineFilter.Q.value = .7;
    engineFilter.connect(engineLevel); engineLevel.connect(effects);
    engine = own(context.createOscillator()); engine.type = 'triangle'; engine.frequency.value = 50;
    overtone = own(context.createOscillator()); overtone.type = 'sawtooth'; overtone.frequency.value = 100;
    const overtoneLevel = gain(.13);
    engine.connect(engineFilter); overtone.connect(overtoneLevel); overtoneLevel.connect(engineFilter);
    start(engine); start(overtone);
    // A single deterministic noise buffer serves soft wind and the drifting tyre rustle.
    const buffer = context.createBuffer(1, context.sampleRate, context.sampleRate), data = buffer.getChannelData(0);
    let seed = 761, brown = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (seed * 16807) % 2147483647;
      brown = (brown + (seed / 1073741823.5 - 1) * .04) / 1.04;
      data[i] = brown * 5;
    }
    const noise = own(context.createBufferSource()); noise.buffer = buffer; noise.loop = true;
    const wind = own(context.createBiquadFilter()); wind.type = 'lowpass'; wind.frequency.value = 620;
    const slide = own(context.createBiquadFilter()); slide.type = 'bandpass'; slide.frequency.value = 1350; slide.Q.value = 1.5;
    windLevel = gain(0); slideLevel = gain(0);
    noise.connect(wind); wind.connect(windLevel); windLevel.connect(effects);
    noise.connect(slide); slide.connect(slideLevel); slideLevel.connect(effects);
    start(noise);
  }

  function resumeContext(): void {
    if (!ctx || disposed || suspended) return;
    master?.gain.setValueAtTime(.65, ctx.currentTime);
    if (ctx.state === 'running') { flushPending(); return; }
    if (resumePending) return;
    const current = ctx;
    resumePending = true;
    void current.resume().then(() => {
      resumePending = false;
      if (ctx === current) flushPending();
    }).catch(() => { resumePending = false; /* A later gesture can unlock sound. */ });
  }
  function unlock(): void {
    if (disposed || (effectsVolume === 0 && musicVolume === 0)) return;
    if (!ctx) {
      try {
        ctx = env.createContext();
        if (!ctx) return;
        build(ctx);
      } catch {
        for (const source of continuous) { try { source.stop(); } catch { /* Partial graph. */ } }
        continuous.clear();
        for (const node of nodes) node.disconnect();
        nodes.clear();
        if (ctx) void ctx.close().catch(() => undefined);
        ctx = null; master = effects = music = engineLevel = windLevel = slideLevel = null;
        engine = overtone = null; engineFilter = null;
        return;
      }
    }
    resumeContext();
  }
  function note(midi: number, duration: number, level: number, delay = 0, tune = false): void {
    if (!ctx || suspended || disposed || ctx.state !== 'running') return;
    const bus = tune ? music : effects;
    if (!bus || (tune ? musicVolume : effectsVolume) === 0) return;
    const at = ctx.currentTime + delay;
    const oscillator = own(ctx.createOscillator()), envelope = own(ctx.createGain());
    oscillator.type = 'sine'; oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(level, at + .007);
    envelope.gain.exponentialRampToValueAtTime(.0001, at + duration);
    oscillator.connect(envelope); envelope.connect(bus);
    notes.set(oscillator, [oscillator, envelope]);
    oscillator.onended = () => {
      const connections = notes.get(oscillator);
      if (!connections) return;
      notes.delete(oscillator); connections.forEach(forget);
    };
    oscillator.start(at); oscillator.stop(at + duration + .025);
  }

  function tick(state: KartSoundState, dt: number): void {
    if (!ctx || disposed || suspended) return;
    if (ctx.state !== 'running') { pendingState = { ...state }; return; }
    pendingState = null;
    const step = clamp(finite(dt), 0, .1), now = ctx.currentTime;
    const racing = state.phase === 'racing', active = racing || state.phase === 'countdown';
    rpm = kartRpm(rpm, state.speed, state.throttle, step, state.boost ? .3 : 0);
    const speed = clamp(finite(state.speed) / 25, 0, 1), throttle = clamp(finite(state.throttle), 0, 1);
    engine?.frequency.setTargetAtTime(rpm / 45, now, .055);
    overtone?.frequency.setTargetAtTime(rpm / 22.5, now, .055);
    engineFilter?.frequency.setTargetAtTime(260 + speed * 400 + throttle * 230, now, .06);
    engineLevel?.gain.setTargetAtTime(active ? (settings.calm ? .045 : .06) + throttle * .025 : 0, now, .06);
    windLevel?.gain.setTargetAtTime(racing ? speed * speed * (settings.calm ? .025 : .04) : 0, now, .09);
    slideLevel?.gain.setTargetAtTime(racing && state.drifting ? .035 * speed : 0, now, .05);
    // An original light wooden melody; its clock freezes with the race.
    if (state.phase !== 'countdown' && musicVolume > 0) {
      songClock += step;
      if (songClock >= .32) {
        songClock -= .32;
        const melody = [74, 78, 81, 78, 76, 74, 69, 71, 74, 78, 83, 81, 78, 76, 74, 69];
        note(melody[songStep % melody.length]!, .24, .055, 0, true);
        if (songStep % 4 === 0) note(songStep % 8 === 0 ? 50 : 57, .48, .055, 0, true);
        songStep++;
      }
    }
  }
  function event(name: KartSoundEvent): void {
    if (!ctx || disposed || suspended) return;
    if (ctx.state !== 'running') {
      // Resume is asynchronous on Safari too. Retain the current cue, never an
      // old countdown burst, and discard the queue on a genuine later pause.
      if (name === 'finish') pendingEvents.length = 0;
      if (name === 'countdown' || name === 'go') {
        const previous = pendingEvents.indexOf('countdown');
        if (previous >= 0) pendingEvents.splice(previous, 1);
      }
      if (pendingEvents.length < 8) pendingEvents.push(name);
      return;
    }
    if (name === 'countdown') note(74, .15, .16);
    else if (name === 'go') { note(86, .3, .16); note(81, .32, .11, .06); }
    else if (name === 'pickup') { note(81, .16, .12); note(86, .24, .11, .08); }
    else if (name === 'boost') [74, 78, 81, 86].forEach((midi, i) => note(midi, .22, .10, i * .045));
    else if (name === 'finish') [74, 78, 81, 86, 81, 86].forEach((midi, i) => note(midi, .42, .13, i * .14));
  }
  function flushPending(): void {
    if (!ctx || disposed || suspended || ctx.state !== 'running') return;
    const state = pendingState; pendingState = null;
    // Apply the latest engine state before the fanfare; the result screen no
    // longer ticks audio, so retaining its last racing engine would buzz forever.
    if (state) tick(state, 0);
    const queued = pendingEvents.splice(0);
    queued.forEach(event);
  }

  return {
    unlock, tick, event,
    suspend(next: boolean) {
      if (suspended === next || disposed) return;
      suspended = next;
      if (!ctx) return;
      if (next) {
        pendingEvents.length = 0; pendingState = null;
        master?.gain.cancelScheduledValues(ctx.currentTime);
        master?.gain.setValueAtTime(0, ctx.currentTime);
        stopNotes();
        void ctx.suspend().then(() => { if (!suspended && !disposed) resumeContext(); }).catch(() => undefined);
      } else resumeContext();
    },
    dispose() {
      if (disposed) return;
      disposed = true; pendingEvents.length = 0; pendingState = null; stopNotes();
      if (ctx) master?.gain.setValueAtTime(0, ctx.currentTime);
      for (const source of continuous) { try { source.stop(); } catch { /* Already ended. */ } }
      continuous.clear();
      for (const node of nodes) node.disconnect();
      nodes.clear();
      if (ctx) void ctx.close().catch(() => undefined);
      ctx = null;
    },
  };
}
