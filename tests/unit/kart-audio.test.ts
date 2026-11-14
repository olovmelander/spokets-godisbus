import { describe, expect, it, vi } from 'vitest';
import { createKartAudio, kartRpm, type KartAudioEnv, type KartSoundEvent, type KartSoundState } from '../../src/kart/audio';

/** A parameter that remembers every value scheduled on it: `set[0]` is where a voice begins. */
class Param {
  value = 0; set: number[] = [];
  private to(value: number) { this.value = value; this.set.push(value); }
  setValueAtTime(value: number) { this.to(value); }
  linearRampToValueAtTime(value: number) { this.to(value); }
  exponentialRampToValueAtTime(value: number) { this.to(value); }
  setTargetAtTime(value: number) { this.to(value); }
  cancelScheduledValues() {}
  cancelAndHoldAtTime() {}
}
class AudioNodeFake {
  gain = new Param(); frequency = new Param(); Q = new Param(); threshold = new Param(); knee = new Param(); ratio = new Param();
  attack = new Param(); release = new Param(); delayTime = new Param(); pan = new Param();
  type = ''; buffer: unknown = null; loop = false;
  outputs: AudioNodeFake[] = [];
  starts = 0; stops = 0; at = 0; until = Infinity; disconnected = false; onended: (() => void) | null = null;
  /** `born` is the audio clock when the node was made: a note's `at` minus this is how far ahead it was scheduled. */
  constructor(readonly kind: string, readonly born: number) {}
  connect(node: AudioNodeFake) { this.outputs.push(node); return node; }
  disconnect() { this.disconnected = true; }
  start(at = 0) { this.starts++; this.at = at; }
  stop(at = 0) { this.stops++; this.until = at; }
  setPeriodicWave() {}
}
function soundEnv() {
  const nodes: AudioNodeFake[] = [];
  const make = (kind: string) => (): AudioNodeFake => { const n = new AudioNodeFake(kind, context.currentTime); nodes.push(n); return n; };
  const context = {
    state: 'suspended', currentTime: 0, sampleRate: 100, destination: new AudioNodeFake('destination', 0),
    createGain: make('gain'), createOscillator: make('oscillator'), createBiquadFilter: make('filter'),
    createDynamicsCompressor: make('compressor'), createBufferSource: make('noise'), createDelay: make('delay'),
    createStereoPanner: make('panner'), createPeriodicWave: () => ({}),
    createBuffer: (_channels: number, length: number) => ({ getChannelData: () => new Float32Array(length) }),
    resume: vi.fn(async () => { context.state = 'running'; }),
    suspend: vi.fn(async () => { context.state = 'suspended'; }),
    close: vi.fn(async () => { context.state = 'closed'; }),
  };
  nodes.push(context.destination);
  const factory = vi.fn(() => context as unknown as AudioContext);
  /** The sources started since `from`: the one-shot voices, once the graph is built. */
  const voices = (from = 0) => nodes.slice(from).filter(n => n.starts > 0);
  const live = (from = 0) => voices(from).filter(n => !n.disconnected);
  const reaches = (node: AudioNodeFake, bus: AudioNodeFake, seen = new Set<AudioNodeFake>()): boolean =>
    node === bus || (!seen.has(node) && (seen.add(node), node.outputs.some(next => reaches(next, bus, seen))));
  /** Lets every voice whose stop time has passed end, as the browser would. */
  const settle = () => { for (const n of nodes) if (n.starts && !n.disconnected && n.until <= context.currentTime) n.onended?.(); };
  return { env: { createContext: factory } satisfies KartAudioEnv, nodes, factory, context, voices, live, reaches, settle };
}
type Fake = ReturnType<typeof soundEnv>;
type Sound = ReturnType<typeof createKartAudio>;
const racing: KartSoundState = {
  speed: 20, throttle: 1, drifting: false, driftTier: 0, boost: 0, airborne: false, surface: 'road', zone: 0, finalLap: false, star: false, phase: 'racing',
};
const still: KartSoundState = { ...racing, speed: 0, throttle: 0, phase: 'finished' };
const EVENTS: KartSoundEvent[] = ['countdown', 'go', 'startBoost', 'hop', 'land', 'trick', 'turbo1', 'turbo2', 'turbo3', 'tier', 'pad', 'boost', 'draft',
  'box', 'roulette', 'itemReady', 'throw', 'drop', 'shield', 'shieldPop', 'cloud', 'star', 'bang', 'horn', 'spring', 'rocket', 'magnet', 'hit', 'spin', 'bump', 'wall', 'splash', 'candy', 'candyLost',
  'passUp', 'passDown', 'lap', 'finalLap', 'finish', 'win'];
const EFFECT_VOICES = 22, MUSIC_VOICES = 20, FADING_VOICES = 6, STEP = 15 / 136;

/** An unlocked, running instance, with its two buses and the index where its one-shot voices begin. */
async function ready(settings = { effects: .8, music: .5, calm: false }) {
  const f = soundEnv(), sound = createKartAudio(settings, f.env);
  sound.unlock(); await Promise.resolve();
  const bus = (level: number) => f.nodes.find(n => n.kind === 'gain' && n.gain.value === level)!;
  return { f, sound, built: f.nodes.length, effects: bus(settings.effects), music: bus(settings.music) };
}
/** Ticks at a frame rate while the audio clock runs, ending voices as they finish. Returns the most one-shot voices alive at once. */
function play(f: Fake, sound: Sound, state: KartSoundState, seconds: number, rate = 60, built = 0) {
  let most = 0;
  for (let i = 0; i < Math.round(seconds * rate); i++) {
    f.context.currentTime += 1 / rate; f.settle(); sound.tick(state, 1 / rate);
    most = Math.max(most, f.live(built).length);
  }
  return most;
}
/** The envelope of a voice: the gain after its source, or after its own filter. */
const envelope = (voice: AudioNodeFake) => (voice.outputs[0]!.kind === 'gain' ? voice.outputs[0]! : voice.outputs[0]!.outputs[0]!).gain;
const pitches = (voices: AudioNodeFake[]) => voices.map(n => `${n.kind} ${Math.round(n.frequency.set[0] ?? 0)}`);

describe('Godisracet engine', () => {
  it('uses clutch load at a standstill, rises with speed and decays smoothly', () => {
    const settle = (speed: number, throttle: number) => { let rpm = 0; for (let i = 0; i < 400; i++) rpm = kartRpm(rpm, speed, throttle, .05); return rpm; };
    const idle = settle(0, 0), clutch = settle(0, 1), gas = kartRpm(idle, 0, 1, .1);
    expect(kartRpm(idle, 0, 0, .1)).toBeCloseTo(idle); expect(gas).toBeGreaterThan(idle); expect(gas).toBeLessThan(clutch);
    expect(kartRpm(gas, 18, 1, .1)).toBeGreaterThan(gas);
    expect(kartRpm(settle(30, 1), 0, 0, .1)).toBeLessThan(settle(30, 1));
    expect(settle(40, 1)).toBeGreaterThan(settle(30, 1));
  });
  it('stays finite and never falls as speed rises', () => {
    for (const bad of [NaN, Infinity, -Infinity, -5, 1e9]) {
      expect(Number.isFinite(kartRpm(bad, bad, bad, bad, bad))).toBe(true);
      expect(Number.isFinite(kartRpm(3000, bad, 1, .016))).toBe(true);
    }
    for (const throttle of [0, .4, 1]) for (const previous of [1000, 4000, 9000]) {
      let last = -Infinity;
      for (let speed = 0; speed <= 44; speed += .5) {
        const rpm = kartRpm(previous, speed, throttle, .05);
        expect(rpm).toBeGreaterThanOrEqual(last); last = rpm;
      }
      expect(last).toBeGreaterThan(kartRpm(previous, 0, throttle, .05));
    }
  });
});

describe('Godisracet audio lifecycle', () => {
  it('does not create a context until a gesture, and creates none when both buses are muted', () => {
    const f = soundEnv(), sound = createKartAudio({ effects: 0, music: 0, calm: false }, f.env);
    sound.unlock(); sound.event('go'); sound.tick(racing, .05); sound.dispose(); expect(f.factory).not.toHaveBeenCalled();
    const audible = createKartAudio({ effects: 1, music: 0, calm: false }, f.env);
    audible.event('boost'); audible.tick(racing, .05); expect(f.factory).not.toHaveBeenCalled(); audible.unlock(); audible.unlock();
    expect(f.factory).toHaveBeenCalledTimes(1); audible.dispose();
  });
  it('cancels unfinished voices at pause and releases its graph/context exactly once', async () => {
    const { f, sound, built } = await ready({ effects: 1, music: 1, calm: false });
    sound.event('boost'); sound.tick(racing, .016);
    const voices = f.voices(built); expect(voices.length).toBeGreaterThan(4);
    sound.suspend(true); expect(voices.every(n => n.stops > 0 && n.disconnected && n.outputs[0]!.disconnected)).toBe(true);
    const count = f.nodes.length; sound.event('go'); sound.tick(racing, .016); expect(f.nodes).toHaveLength(count);
    sound.suspend(false); expect(f.context.resume).toHaveBeenCalled();
    sound.dispose(); sound.dispose(); expect(f.context.close).toHaveBeenCalledTimes(1);
    expect(f.nodes.slice(1).every(n => n.disconnected)).toBe(true);
    sound.unlock(); sound.event('go'); sound.tick(racing, .016); expect(f.nodes).toHaveLength(count); expect(f.factory).toHaveBeenCalledTimes(1);
  });
  it('closes and forgets a context whose graph cannot be built, and tries again at the next gesture', () => {
    const f = soundEnv(), sound = createKartAudio({ effects: 1, music: 1, calm: false }, f.env);
    const createDelay = f.context.createDelay;
    f.context.createDelay = () => { throw new Error('no delay'); };
    expect(() => sound.unlock()).not.toThrow();
    expect(f.context.close).toHaveBeenCalledTimes(1); expect(f.nodes.length).toBeGreaterThan(5); expect(f.nodes.slice(1).every(n => n.disconnected)).toBe(true);
    expect(f.voices().every(n => n.stops > 0)).toBe(true);
    const failed = f.nodes.length; sound.event('go'); sound.tick(racing, .05); expect(f.nodes).toHaveLength(failed);
    f.context.createDelay = createDelay; sound.unlock();
    expect(f.factory).toHaveBeenCalledTimes(2); expect(f.nodes.length).toBeGreaterThan(failed); expect(f.nodes.slice(failed).some(n => n.disconnected)).toBe(false);
    sound.dispose();
  });
  it('disconnects each one-shot voice when it ends', async () => {
    const { f, sound, built } = await ready();
    sound.event('lap');
    const voices = f.voices(built); expect(voices.length).toBeGreaterThan(0); expect(f.live(built)).toHaveLength(voices.length);
    f.context.currentTime = 5; f.settle();
    expect(voices.every(n => n.disconnected && n.outputs[0]!.disconnected)).toBe(true); expect(f.nodes.slice(1, built).some(n => n.disconnected)).toBe(false);
  });
  it('keeps the finish engine state and fanfare through an asynchronous context resume', async () => {
    for (const fanfare of ['finish', 'win'] as const) {
      const { f, sound, built } = await ready({ effects: 1, music: 0, calm: false });
      sound.tick({ ...racing, speed: 15 }, .05);
      const engineGain = f.nodes.find(n => n.kind === 'oscillator')!.outputs[0]!.outputs[0]!;
      expect(engineGain.kind).toBe('gain'); expect(engineGain.gain.value).toBeGreaterThan(0);
      sound.suspend(true); await Promise.resolve();
      let finishResume = () => {};
      f.context.resume.mockImplementation(() => new Promise<void>(resolve => {
        finishResume = () => { f.context.state = 'running'; resolve(); };
      }));
      sound.suspend(false);
      sound.tick(still, 0);
      sound.event('hop'); sound.event(fanfare);
      const before = f.nodes.length; expect(f.voices(built)).toHaveLength(0);
      finishResume(); await Promise.resolve();
      expect(engineGain.gain.value).toBe(0);
      // Only the fanfare (the hop queued before it is dropped), and every note has its own envelope.
      const notes = f.voices(before); expect(notes.length).toBeGreaterThanOrEqual(6);
      expect(notes.every(n => n.kind === 'oscillator')).toBe(true); expect(f.nodes).toHaveLength(before + notes.length * 2);
      sound.dispose();
    }
  });
  it('does not replay queued cues when a pending resume is interrupted by another pause', async () => {
    const f = soundEnv(); let resume = () => {};
    f.context.resume.mockImplementation(() => new Promise<void>(resolve => {
      resume = () => { f.context.state = 'running'; resolve(); };
    }));
    const sound = createKartAudio({ effects: 1, music: 0, calm: false }, f.env);
    sound.unlock(); sound.event('go'); const count = f.nodes.length;
    sound.suspend(true); resume(); await Promise.resolve();
    expect(f.nodes).toHaveLength(count);
    sound.dispose();
  });
  it('plays the current cue once a slow resume finishes, and none that waited too long', async () => {
    const slow = () => {
      const f = soundEnv(); let resume = () => {};
      f.context.resume.mockImplementation(() => new Promise<void>(resolve => { resume = () => { f.context.state = 'running'; resolve(); }; }));
      const sound = createKartAudio({ effects: 1, music: 0, calm: false }, f.env);
      sound.unlock();
      return { f, sound, built: f.nodes.length, resume: async () => { resume(); await Promise.resolve(); } };
    };
    const alone = async (name: KartSoundEvent) => { const made = await ready({ effects: 1, music: 0, calm: false }); made.sound.event(name); return pitches(made.f.voices(made.built)); };
    // A countdown burst leaves only its last cue, and the roulette never queues.
    const quick = slow();
    quick.sound.event('countdown'); quick.sound.event('countdown'); quick.sound.event('go');
    for (let i = 0; i < 20; i++) quick.sound.event('roulette');
    await quick.resume();
    expect(pitches(quick.f.voices(quick.built))).toEqual(await alone('go'));
    // Three seconds of ticks with no sound: the old cue is dropped, the fresh one plays.
    const late = slow();
    late.sound.event('go');
    for (let i = 0; i < 60; i++) late.sound.tick({ ...racing, phase: 'countdown' }, .05);
    late.sound.event('hop');
    await late.resume();
    expect(pitches(late.f.voices(late.built))).toEqual(await alone('hop'));
  });
});

describe('Godisracet effects', () => {
  it('gives every event at least one voice and a bounded number, all on the effects bus', async () => {
    for (const name of EVENTS) {
      const { f, sound, built, effects, music } = await ready();
      sound.event(name);
      const voices = f.voices(built);
      expect(voices.length, name).toBeGreaterThanOrEqual(1); expect(voices.length, name).toBeLessThanOrEqual(16);
      expect(f.nodes.length - built, name).toBeLessThanOrEqual(voices.length * 3);
      expect(voices.every(n => f.reaches(n, effects) && !f.reaches(n, music)), name).toBe(true);
      // No clicks: every voice starts from silence, decays to it, and is told when to stop.
      for (const n of voices) { expect(envelope(n).set[0], name).toBe(0); expect(envelope(n).value, name).toBeLessThan(.001); expect(n.until, name).toBeLessThan(3); }
      for (const value of f.nodes.slice(built).flatMap(n => [...n.gain.set, ...n.frequency.set, n.at])) expect(Number.isFinite(value) && value >= 0, name).toBe(true);
      sound.dispose();
    }
  });
  it('plays a rival at its distance: the same voices, quieter, and none at all out of earshot', async () => {
    const peak = (f: Fake, from: number) => Math.max(...f.voices(from).flatMap(n => envelope(n).set));
    const near = await ready(), far = await ready();
    near.sound.event('bump'); far.sound.event('bump', .25);
    expect(pitches(far.f.voices(far.built))).toEqual(pitches(near.f.voices(near.built)));
    expect(peak(far.f, far.built)).toBeCloseTo(peak(near.f, near.built) * .25);
    const count = far.f.nodes.length; far.sound.event('bump', 0); far.sound.event('bump', -1); expect(far.f.nodes).toHaveLength(count);
    far.sound.event('bump', NaN); far.sound.event('bump', 7); expect(peak(far.f, count)).toBeCloseTo(peak(near.f, near.built));
  });
  it('caps simultaneous voices however many events pile up', async () => {
    const { f, sound, built } = await ready();
    for (let i = 0; i < 40; i++) for (const name of EVENTS) sound.event(name);
    expect(f.voices(built).length).toBeGreaterThan(500);
    const most = EFFECT_VOICES + FADING_VOICES;
    expect(f.live(built).length).toBeGreaterThanOrEqual(EFFECT_VOICES); expect(f.live(built).length).toBeLessThanOrEqual(most);
    for (let i = 0; i < 400; i++) sound.event('win');
    expect(f.live(built).length).toBeLessThanOrEqual(most);
    // The graph holds what was built, and at most three nodes for each living voice.
    expect(f.nodes.slice(1).filter(n => !n.disconnected).length).toBeLessThanOrEqual(built + most * 3);
    // A stolen voice is faded and then stopped; the newest are the ones that remain.
    expect(f.voices(built).every(n => n.stops > 0)).toBe(true); expect(f.voices(built).at(-1)!.disconnected).toBe(false);
    // The music keeps its own voices while the effects pile up.
    play(f, sound, racing, .3); const tune = f.live(built).length;
    for (let i = 0; i < 100; i++) sound.event('star');
    expect(f.live(built).length).toBeGreaterThanOrEqual(tune); expect(f.live(built).length).toBeLessThanOrEqual(most + MUSIC_VOICES);
  });
  it('rings a taken sweet higher in quick succession, and from the bottom again after a pause', async () => {
    const { f, sound } = await ready();
    const pitch = (gain = 1) => { const from = f.nodes.length; sound.event('candy', gain); return f.voices(from)[0]!.frequency.set[0]!; };
    const first = pitch(); f.context.currentTime += .2; const second = pitch(); f.context.currentTime += .2; const third = pitch();
    expect(second).toBeGreaterThan(first); expect(third).toBeGreaterThan(second);
    // A rival's sweet neither climbs nor breaks the run.
    expect(pitch(.5)).toBe(first); f.context.currentTime += .2; expect(pitch()).toBeGreaterThan(third);
    f.context.currentTime += 3; expect(pitch()).toBe(first);
    for (let i = 0; i < 30; i++) { f.context.currentTime += .1; expect(pitch()).toBeLessThan(2500); }
  });
  it('steps the drift sparks up a note at a time and sets three turbos apart', async () => {
    const { f, sound } = await ready();
    const made = (name: KartSoundEvent) => { const from = f.nodes.length; sound.event(name); return f.voices(from); };
    const note = (voices: AudioNodeFake[]) => voices.find(n => n.kind === 'oscillator')!.frequency.set[0]!;
    sound.tick({ ...racing, drifting: true }, .016);
    const tones = [made('tier'), made('tier'), made('tier'), made('tier')].map(note);
    expect(tones[1]).toBeGreaterThan(tones[0]!); expect(tones[2]).toBeGreaterThan(tones[1]!); expect(tones[3]).toBe(tones[2]);
    sound.tick(racing, .016); expect(note(made('tier'))).toBe(tones[0]);
    // Each turbo is longer and higher than the one before, with one more pip.
    const turbos = (['turbo1', 'turbo2', 'turbo3'] as const).map(made);
    const whoosh = turbos.map(voices => voices.find(n => n.kind === 'noise')!), sweep = whoosh.map(n => n.outputs[0]!.frequency.set);
    for (const i of [1, 2]) {
      expect(turbos[i]!.length).toBeGreaterThan(turbos[i - 1]!.length); expect(whoosh[i]!.until).toBeGreaterThan(whoosh[i - 1]!.until);
      expect(sweep[i]![0]).toBeGreaterThan(sweep[i - 1]![0]!); expect(sweep[i]![1]).toBeGreaterThan(sweep[i - 1]![1]!);
    }
  });
  it('softens every effect in calm: quieter, slower to speak, and no harsh waves', async () => {
    const normal = await ready(), calm = await ready({ effects: .8, music: .5, calm: true });
    for (const name of EVENTS) {
      const from = [normal.f.nodes.length, calm.f.nodes.length]; normal.sound.event(name); calm.sound.event(name);
      const harsh = normal.f.voices(from[0]), gentle = calm.f.voices(from[1]);
      const loudest = (voices: AudioNodeFake[]) => Math.max(...voices.flatMap(n => envelope(n).set));
      expect(gentle, name).toHaveLength(harsh.length); expect(loudest(gentle), name).toBeLessThan(loudest(harsh) * .75);
      expect(gentle.every(n => n.type !== 'square' && n.type !== 'sawtooth'), name).toBe(true);
    }
  });
  it('follows the kart: engine with speed and boost, lighter in the air, and each surface and drift tier its own noise', async () => {
    const { f, sound, built } = await ready({ effects: .8, music: 0, calm: false });
    const [body, , bed] = f.voices(); const tone = body!.outputs[0]!, level = tone.outputs[0]!;
    const [wind, ground, spark] = bed!.outputs; const windLevel = wind!.outputs[0]!, groundLevel = ground!.outputs[0]!, sparkLevel = spark!.outputs[0]!;
    const run = (state: Partial<KartSoundState>) => { for (let i = 0; i < 60; i++) { f.context.currentTime += 1 / 60; sound.tick({ ...racing, ...state }, 1 / 60); } };
    run({ speed: 5 }); const slow = body!.frequency.value, dull = tone.frequency.value, breeze = windLevel.gain.value;
    run({ speed: 30 }); const quick = body!.frequency.value, loud = level.gain.value;
    expect(quick).toBeGreaterThan(slow * 1.5); expect(windLevel.gain.value).toBeGreaterThan(breeze);
    run({ speed: 30, throttle: 0 }); expect(level.gain.value).toBeLessThan(loud);
    run({ speed: 30, boost: 1 }); expect(body!.frequency.value).toBeGreaterThan(quick); expect(tone.frequency.value).toBeGreaterThan(dull + 1000);
    run({ speed: 30, airborne: true, surface: 'rough' }); expect(level.gain.value).toBeLessThan(loud); expect(groundLevel.gain.value).toBe(0);
    const seen = new Set<string>();
    for (const surface of ['rough', 'mud', 'water', 'planks', 'snow'] as const) {
      run({ surface }); seen.add(`${ground!.type} ${Math.round(ground!.Q.value * 10)}`);
      expect(Math.max(...groundLevel.gain.set.slice(-30)), surface).toBeGreaterThan(.02);
    }
    expect(seen.size).toBe(5);
    run({ surface: 'road' }); expect(groundLevel.gain.value).toBeLessThan(.02); expect(sparkLevel.gain.value).toBe(0);
    let last = 0;
    for (const driftTier of [0, 1, 2, 3] as const) {
      run({ drifting: true, driftTier }); expect(sparkLevel.gain.value).toBeGreaterThan(0);
      expect(spark!.frequency.value).toBeGreaterThan(last); last = spark!.frequency.value;
    }
    run({ phase: 'countdown', speed: 0 }); expect(level.gain.value).toBeGreaterThan(0); expect(sparkLevel.gain.value).toBe(0); expect(windLevel.gain.value).toBe(0);
    run({ phase: 'menu' }); expect(level.gain.value).toBe(0);
    // The continuous layers are part of the graph: none of this made a single voice, whatever arrives.
    sound.tick({ ...racing, speed: NaN, throttle: Infinity, boost: NaN, driftTier: 9 as 3, zone: -4 as 0, surface: 'ice' as 'snow' }, NaN);
    expect(f.nodes).toHaveLength(built);
    for (const value of [body!.frequency, tone.frequency, level.gain, groundLevel.gain, ground!.frequency, sparkLevel.gain, spark!.frequency].flatMap(p => p.set)) expect(Number.isFinite(value)).toBe(true);
    // Calm keeps the engine and the noise lower.
    const calm = await ready({ effects: .8, music: 0, calm: true });
    for (let i = 0; i < 60; i++) calm.sound.tick({ ...racing, speed: 30 }, 1 / 60);
    expect(calm.f.voices()[0]!.outputs[0]!.outputs[0]!.gain.value).toBeLessThan(loud * .7);
  });
  it('knocks the planks by distance, evenly at any frame rate', async () => {
    const knocks = async (rate: number) => {
      const { f, sound } = await ready({ effects: .8, music: 0, calm: false });
      const level = f.voices()[2]!.outputs[1]!.outputs[0]!.gain;
      for (let i = 0; i < 4 * rate; i++) { f.context.currentTime += 1 / rate; sound.tick({ ...racing, speed: 24, surface: 'planks' }, 1 / rate); }
      return level.set.filter(value => value > 0).length;
    };
    // 24 m/s over boards 2.4 m apart: ten a second.
    for (const rate of [30, 60, 144]) expect(Math.abs(await knocks(rate) - 40), `${rate} Hz`).toBeLessThanOrEqual(1);
  });
});

describe('Godisracet music', () => {
  /** The music voices made while `state` plays for some seconds from the start of a race. */
  async function tune(state: Partial<KartSoundState>, seconds: number, settings = { effects: .8, music: .5, calm: false }, rate = 60) {
    const made = await ready(settings);
    const most = play(made.f, made.sound, { ...racing, ...state }, seconds, rate, made.built);
    return { ...made, most, voices: made.f.voices(made.built) };
  }
  /** Whether every note starts on a grid of sixteenths this long. */
  const onGrid = (voices: AudioNodeFake[], step: number) => voices.every(n => Math.abs((n.at - voices[0]!.at) / step - Math.round((n.at - voices[0]!.at) / step)) < 1e-6);
  const steps = (voices: AudioNodeFake[], step: number) => Math.round((voices.at(-1)!.at - voices[0]!.at) / step);

  it('leaves effects silent with music-only settings and has no notes while suspended', async () => {
    const { f, sound, built, music } = await ready({ effects: 0, music: 1, calm: true });
    expect(f.voices()).toHaveLength(0); // No engine, wind or ground either.
    sound.event('go'); sound.event('win'); expect(f.nodes).toHaveLength(built);
    play(f, sound, racing, .4, 10);
    const voices = f.voices(built); expect(voices.length).toBeGreaterThan(0); expect(voices.every(n => f.reaches(n, music))).toBe(true);
    sound.suspend(true); const paused = f.nodes.length;
    play(f, sound, racing, .8, 10);
    expect(f.nodes).toHaveLength(paused); sound.dispose();
  });
  it('makes no music voices with effects-only settings', async () => {
    const { f, sound, built, effects } = await ready({ effects: 1, music: 0, calm: false });
    play(f, sound, { ...racing, star: true, finalLap: true }, 3);
    expect(f.nodes).toHaveLength(built); expect(f.nodes.some(n => n.kind === 'delay')).toBe(false);
    sound.event('lap'); expect(f.voices(built).length).toBeGreaterThan(0); expect(f.voices(built).every(n => f.reaches(n, effects))).toBe(true);
  });
  it('plays while racing only: not in the menu, the countdown or after the finish', async () => {
    for (const phase of ['menu', 'countdown', 'finished'] as const) expect((await tune({ phase }, 3)).voices, phase).toHaveLength(0);
    const { f, sound, voices, effects, music } = await tune({}, 3);
    expect(voices.length).toBeGreaterThan(40); expect(voices.every(n => f.reaches(n, music) && !f.reaches(n, effects))).toBe(true);
    // Bass, lead, an inner layer and drums: oscillators and noise both, each with a click-free envelope.
    expect(new Set(voices.map(n => n.kind))).toEqual(new Set(['oscillator', 'noise']));
    for (const n of voices) { expect(envelope(n).set[0]).toBe(0); expect(envelope(n).value).toBeLessThan(.001); expect(n.until).toBeGreaterThan(n.at); }
    const racingNodes = f.nodes.length; play(f, sound, { ...racing, phase: 'finished' }, 2); expect(f.nodes).toHaveLength(racingNodes);
  });
  it('schedules by the audio clock: the same notes at 30, 60 and 144 frames a second, each a little ahead', async () => {
    const at = async (rate: number) => (await tune({}, 6, undefined, rate)).voices;
    const [slow, normal, fast] = [await at(30), await at(60), await at(144)];
    // Whatever falls in the last few frames may not be scheduled yet at another frame rate.
    const shared = Math.min(slow.length, normal.length, fast.length) - 12;
    expect(shared).toBeGreaterThan(80);
    expect(pitches(slow).slice(0, shared)).toEqual(pitches(normal).slice(0, shared)); expect(pitches(fast).slice(0, shared)).toEqual(pitches(normal).slice(0, shared));
    for (const voices of [slow, normal, fast]) {
      // 136 beats a minute, every note on its sixteenth, and none scheduled late or far ahead.
      expect(onGrid(voices, STEP)).toBe(true); expect(steps(voices, STEP)).toBeGreaterThan(50);
      for (const n of voices) { expect(n.at).toBeGreaterThan(n.born); expect(n.at - n.born).toBeLessThan(.2); }
    }
  });
  it('runs the final lap faster than a normal lap, from the next bar line', async () => {
    const normal = await tune({}, 12), urgent = await tune({ finalLap: true }, 12);
    expect(onGrid(normal.voices, STEP)).toBe(true); expect(onGrid(urgent.voices, STEP / 1.13)).toBe(true);
    expect(steps(urgent.voices, STEP / 1.13)).toBeGreaterThan(steps(normal.voices, STEP) * 1.12);
    expect(urgent.voices.length).toBeGreaterThan(normal.voices.length * 1.2);
    // Announced mid-bar, the bar in progress keeps its tempo; the next one is quicker.
    const { f, sound, built } = await tune({}, 1);
    play(f, sound, { ...racing, finalLap: true }, 6);
    const bar = f.voices(built).filter(n => n.at < f.voices(built)[0]!.at + STEP * 15.5), later = f.voices(built).slice(bar.length);
    expect(onGrid(bar, STEP)).toBe(true); expect(steps(bar, STEP)).toBe(15);
    expect(later[0]!.at - bar[0]!.at).toBeCloseTo(STEP * 16, 6); expect(onGrid(later, STEP / 1.13)).toBe(true); expect(onGrid(later, STEP)).toBe(false);
  });
  it('gives each zone its own colour, changing on a bar line', async () => {
    const zones: Awaited<ReturnType<typeof tune>>[] = [];
    for (const zone of [0, 1, 2, 3, 4] as const) zones.push(await tune({ zone }, 14.2));
    expect(new Set(zones.map(z => pitches(z.voices).join())).size).toBe(5);
    // The bog is sparse; the mountain echoes; the candy meadow is busy. Every zone keeps the one tempo.
    expect(zones[2]!.voices.length).toBeLessThan(zones[0]!.voices.length * .6); expect(zones[4]!.voices.length).toBeGreaterThan(zones[0]!.voices.length);
    const echoes = (z: typeof zones[0]) => z.voices.filter(n => z.f.reaches(n, z.f.nodes.find(node => node.kind === 'delay')!)).length;
    expect(echoes(zones[3]!)).toBeGreaterThan(zones[3]!.voices.length / 2); expect(echoes(zones[0]!)).toBe(0); expect(echoes(zones[4]!)).toBe(0);
    for (const z of zones) expect(onGrid(z.voices, STEP)).toBe(true);
    // A zone entered mid-bar waits for the bar line: the bar in progress is still the old zone's, the next is the new one's.
    const { f, sound, built } = await tune({}, 1);
    play(f, sound, { ...racing, zone: 3 }, 3);
    const heard = f.voices(built), first = heard.filter(n => n.at < heard[0]!.at + STEP * 15.5), second = heard.slice(first.length);
    expect(pitches(first)).toEqual(pitches(zones[0]!.voices).slice(0, first.length));
    expect(second[0]!.at - first[0]!.at).toBeCloseTo(STEP * 16, 6);
    const mountain = zones[3]!.voices, barTwo = mountain.findIndex(n => n.at > mountain[0]!.at + STEP * 15.5);
    expect(pitches(second).slice(0, 30)).toEqual(pitches(mountain).slice(barTwo, barTwo + 30));
  });
  it('adds a glittering layer for the star, and plays slower and sparser in calm', async () => {
    const plain = await tune({}, 8), star = await tune({ star: true }, 8), calm = await tune({}, 8, { effects: .8, music: .5, calm: true });
    // One more note on every sixteenth, high above the tune.
    const glitter = star.voices.length - plain.voices.length;
    expect(glitter).toBeGreaterThanOrEqual(steps(plain.voices, STEP)); expect(glitter).toBeLessThanOrEqual(steps(plain.voices, STEP) + 3);
    expect(Math.max(...star.voices.map(n => n.frequency.set[0] ?? 0))).toBeGreaterThan(Math.max(...plain.voices.map(n => n.frequency.set[0] ?? 0)));
    expect(onGrid(calm.voices, STEP)).toBe(false); expect(onGrid(calm.voices, STEP / .93)).toBe(true);
    expect(calm.voices.length).toBeLessThan(plain.voices.length * .8);
    const calmStar = await tune({ star: true }, 8, { effects: .8, music: .5, calm: true });
    expect(calmStar.voices.length - calm.voices.length).toBeLessThan(glitter * .6);
  });
  it('keeps its voices bounded through a whole race, the final lap and the star included', async () => {
    for (const zone of [0, 1, 2, 3, 4] as const) {
      const { most, voices } = await tune({ zone, finalLap: true, star: true }, 30, { effects: 0, music: .5, calm: false });
      expect(most, `zone ${zone}`).toBeLessThan(MUSIC_VOICES);
      // Nothing was stolen to stay there: every voice was stopped once, by its own schedule.
      expect(voices.filter(n => n.stops !== 1), `zone ${zone}`).toHaveLength(0);
    }
  });
  it('freezes the song with a stalled frame or a pause, and starts it from the top with a new race', async () => {
    const whole = pitches((await tune({}, 9)).voices);
    const { f, sound, built } = await tune({}, 2);
    // A stall: no ticks for five seconds, then no burst to catch up, and the next note is the next note.
    f.context.currentTime += 5; f.settle(); const stalled = f.nodes.length; sound.tick(racing, .05);
    expect(f.voices(stalled).length).toBeGreaterThan(0); expect(f.voices(stalled).length).toBeLessThanOrEqual(12);
    play(f, sound, racing, 1);
    // A pause: the notes scheduled ahead are cut, and played again when the race goes on.
    const pausedAt = f.context.currentTime, paused = f.nodes.length; sound.suspend(true); await Promise.resolve();
    const cut = f.nodes.slice(built, paused).filter(n => n.starts && n.at > pausedAt); expect(cut.length).toBeGreaterThan(0);
    sound.suspend(false); await Promise.resolve();
    play(f, sound, racing, 3);
    const heard = pitches([...f.nodes.slice(built, paused).filter(n => n.starts && n.at <= pausedAt), ...f.voices(paused)]);
    expect(heard.length).toBeGreaterThan(100); expect(heard).toEqual(whole.slice(0, heard.length));
    expect(pitches(f.voices(paused)).slice(0, cut.length)).toEqual(pitches(cut));
    // A new race: the countdown resets the song.
    const again = f.nodes.length; play(f, sound, { ...racing, phase: 'countdown' }, .5); expect(f.nodes).toHaveLength(again);
    play(f, sound, racing, 2);
    expect(pitches(f.voices(again)).slice(0, 40)).toEqual(whole.slice(0, 40));
  });
  it('plays 32 bars before the tune comes round again', async () => {
    const { voices } = await tune({}, 32 * 16 * STEP * 2 + 1, { effects: 0, music: .5, calm: false });
    const bars = (from: number, count: number) => pitches(voices.filter(n => n.at >= voices[0]!.at + (from * 16 - .5) * STEP && n.at < voices[0]!.at + ((from + count) * 16 - .5) * STEP)).join();
    // The second time round is the first again, and no shorter stretch repeats: the bridge and both endings differ.
    expect(bars(32, 32)).toBe(bars(0, 32));
    for (const length of [4, 8, 16]) expect(bars(length, length), `${length} bars`).not.toBe(bars(0, length));
    expect(bars(16, 8)).not.toBe(bars(0, 8)); expect(bars(8, 4)).toBe(bars(0, 4)); expect(bars(12, 4)).not.toBe(bars(4, 4));
  });
  it('is deterministic: the same race sounds the same twice', async () => {
    const race = async () => {
      const { f, sound, built } = await ready();
      for (let i = 0; i < 240; i++) {
        f.context.currentTime += 1 / 60; f.settle();
        sound.tick({ ...racing, surface: i > 100 ? 'rough' : 'planks', drifting: i % 80 > 40, driftTier: 2, zone: i > 150 ? 2 : 0 }, 1 / 60);
        if (i % 30 === 0) for (const name of ['box', 'cloud', 'candyLost', 'trick'] as const) sound.event(name);
      }
      return f.nodes.slice(built).map(n => `${n.kind} ${n.at} ${n.frequency.set.join()} ${n.gain.set.join()}`).concat(f.nodes.slice(0, built).map(n => n.gain.set.join()));
    };
    const first = await race(); expect(first.length).toBeGreaterThan(300); expect(await race()).toEqual(first);
  });
});
