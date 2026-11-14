/** Godisracet's sound and music: one small Web Audio graph, synthesised as it
 * plays. No files or remote services load. kartRpm's clutch is adapted from
 * pekkas-pokal kart/audio.js at 7762360; the effects and the tune are original.
 */
export interface KartSoundState {
  speed: number;            // m/s, about 0..40
  throttle: number;         // 0..1
  drifting: boolean;
  driftTier: 0 | 1 | 2 | 3; // sparks: none, blue, gold, pink
  boost: number;            // 0..1 while a boost burns
  airborne: boolean;
  surface: 'road' | 'rough' | 'mud' | 'water' | 'planks' | 'snow';
  zone: 0 | 1 | 2 | 3 | 4;  // Gården, Granskogen, Myren, Berget, Godisängen
  finalLap: boolean;
  star: boolean;            // the rainbow lollipop is active
  phase: 'menu' | 'countdown' | 'racing' | 'finished';
}
export type KartSoundEvent =
  | 'countdown' | 'go' | 'startBoost'
  | 'hop' | 'land' | 'trick'
  | 'turbo1' | 'turbo2' | 'turbo3'
  | 'tier'
  | 'pad' | 'boost' | 'draft'
  | 'box' | 'roulette' | 'itemReady'
  | 'throw' | 'drop' | 'shield' | 'shieldPop' | 'cloud' | 'star'
  | 'hit' | 'spin' | 'bump' | 'wall' | 'splash'
  | 'candy' | 'candyLost'
  | 'passUp' | 'passDown'
  | 'lap' | 'finalLap' | 'finish' | 'win';
export interface KartAudioSettings { effects: number; music: number; calm: boolean }
export interface KartAudioEnv { createContext(): AudioContext | null }
const clamp = (n: number, low: number, high: number) => Math.max(low, Math.min(high, n));
const finite = (n: number, fallback = 0) => Number.isFinite(n) ? n : fallback;
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
const IDLE_RPM = 1800, CLUTCH_RPM = 3000, MAX_RPM = 7400, TOP_SPEED = 30;

/** Source centrifugal-clutch engine follows load as well as road speed; it never falls as speed rises. */
export function kartRpm(previous: number, speed: number, throttle: number, dt: number, wheelspin = 0): number {
  const load = clamp(finite(throttle), 0, 1), from = finite(previous, IDLE_RPM);
  const wheel = IDLE_RPM + clamp(finite(speed), 0, 45) * (MAX_RPM - IDLE_RPM) / TOP_SPEED;
  const target = Math.max(wheel, IDLE_RPM + load * (CLUTCH_RPM - IDLE_RPM)) + load * 250 + clamp(finite(wheelspin), 0, 1) * 800;
  const rate = target > from ? 3 + load * 5 : 4.5;
  return from + (target - from) * (1 - Math.exp(-rate * clamp(finite(dt), 0, .1)));
}

// Each instrument is one oscillator with its own overtones. The first entry is
// the plain shape that stands in where a browser has no periodic waves.
type Custom = 'reed' | 'wood' | 'bell' | 'box' | 'bass';
type Wave = OscillatorType | Custom;
const PARTIALS: Record<Custom, [OscillatorType, ...number[]]> = {
  reed: ['triangle', 1, .5, .33, .2, .14, .08, .05], // an accordion
  wood: ['sine', 1, 0, 0, .3, 0, 0, 0, 0, 0, .1],     // a marimba bar
  bell: ['sine', 1, 0, .22, 0, 0, .1],
  box: ['sine', 1, .45, .2, 0, 0, .1],                // a music box: the bell with its octave
  bass: ['triangle', 1, .6, .35, .15, .08],           // overtones a phone's speaker can carry
};

// The tune: 32 bars in D, AABA, written in sixteenths. A digit is a note of D
// major pentatonic from A4 (0) to F#6 (9), '-' holds it and '.' rests. Staying
// pentatonic is what lets one melody sit over every zone's chords.
const PENTA = [69, 71, 74, 76, 78, 81, 83, 86, 88, 90], MAJOR = [0, 2, 4, 5, 7, 9, 11];
const OPEN = ['2--4--5-4-5-6---', '5--4--3-2-3-0---', '1--2--3-2-3-4---', '3--2--3-4-3---..'];
const ANSWER = ['2--4--5-4-5-6---', '7--6--5-6-7-6---', '5-4-3-2-1-2-3-4-', '3---3-4-3---0-1-'];
const close = (pickup: string) => ['2--4--5-4-5-6---', '7--6--5-6-7-6---', '5-4-3-4-3--4--3-', '2-----2-2-..' + pickup];
const BRIDGE = ['7-----6-7--6--5-', '4-----5-4--3--2-', '6-----5-6--5--4-', '3-4-5-3-4-5-6-5-',
  '7-----6-7--6--5-', '8-----7-8--7--6-', '5-6-5-4-3-4-3-2-', '3---5---3-..0-1-'];
const MELODY = [...OPEN, ...ANSWER, ...OPEN, ...close('5-6-'), ...BRIDGE, ...OPEN, ...close('0-1-')];
const STEPS = 16, SONG = MELODY.length * STEPS, BPM = 136, AHEAD = .12;

/** How a zone plays the tune. Chords are one letter a bar (lower case is minor,
 * F is F#m); rhythm lines are sixteen steps, x loud and o soft. */
interface Kit {
  chords: string;
  lead: [wave: Wave, octave: number, level: number, sustain: number, ring: number];
  thin?: boolean;   // only the tune's bones: notes on the beat, and long ones
  echo?: boolean;
  voicing: number[]; // chord tones as scale steps above the root
  arps: string[];    // each step an index into the voicing
  arp: [wave: Wave, octave: number, level: number, ring: number];
  bass: string;      // r root, f fifth, o octave
  pad?: number[];    // an octave, then scale steps: soft held notes, a bar each
  kick: string; snare: string; hat: string; knock: string;
}
const form = (a: string, last: string, b: string) => a + last + b + last;
const KITS: Kit[] = [
  { // Gården: an accordion over a polka's oom-pah.
    chords: form('DDGADbGA', 'DDGADbAD', 'GDGAGDeA'), lead: ['reed', 0, .07, .7, 1], voicing: [0, 2, 4, 7],
    arps: ['..1...1...1...1.', '..2...2...2...3.'], arp: ['reed', 0, .03, .16], bass: 'r-..f-..r-..f-o-',
    kick: 'x.......x.....o.', snare: '....x.......x...', hat: 'o.x.o.x.o.x.o.xo', knock: '',
  },
  { // Granskogen: marimba and wood blocks, in threes against the beat, on open fifths.
    chords: form('DeGAbeGA', 'DeGAbeAD', 'GDeAGeeA'), lead: ['wood', 0, .11, .15, 1.6], voicing: [0, 4, 7, 8],
    arps: ['0..1..2.0..1..3.'], arp: ['wood', -1, .06, .2], bass: 'r--r--f-r--r--o-',
    kick: 'x.....x...x.....', snare: '....o.......o..o', hat: '..o...o...o...o.', knock: '..x..o..x.o...x.',
  },
  { // Myren: the tune's bones on a low bell, in the relative minor, over a held bass.
    chords: form('bbGDbGeF', 'bbGDbGFb', 'GbGFGeeF'), lead: ['bell', -1, .085, .3, 2.4], thin: true, echo: true, voicing: [0, 2, 4, 6],
    arps: ['......1.....3...'], arp: ['bell', 0, .03, .5], bass: 'r-----------f---', pad: [0, 0, 4],
    kick: 'x.........o.....', snare: '', hat: '....o.......o...', knock: '..............o.',
  },
  { // Berget: a clear bell that echoes off the rock, open fifths and ninths, and a high held light.
    chords: form('GGeAGbeA', 'GGeAGbAG', 'DbGADGeA'), lead: ['bell', 0, .075, .3, 1.8], echo: true, voicing: [0, 4, 8, 11],
    arps: ['0.1.2.3.2.1.2.3.'], arp: ['sine', 0, .026, .24], bass: 'r-------..r-f---', pad: [1, 11, 14],
    kick: 'x.......x.......', snare: '', hat: '..o...o...o...o.', knock: '....x.......x..o',
  },
  { // Godisängen: the tune an octave up on a music box, over rolling chords and a bouncing bass.
    chords: form('DbGADbGA', 'DbGADbAD', 'GADbGAeA'), lead: ['box', 1, .06, .3, 1.7], voicing: [0, 2, 4, 7],
    arps: ['0123210123210123'], arp: ['bell', 0, .026, .18], bass: 'r-o-r-o-r-o-f-o-',
    kick: 'x...x...x...x...', snare: '....o.......x...', hat: 'o.x.o.x.o.x.o.xx', knock: '',
  },
];
const DEGREE: Record<string, number> = { D: 0, e: 1, F: 2, G: 3, A: 4, b: 5 };
const STAR = [0, 2, 4, 7, 9, 11, 14, 11];

// [filter, Hz, how far the grain swings it, Q, level, how far the grain swings that, grains a second]
const GROUND: Record<KartSoundState['surface'], [BiquadFilterType, number, number, number, number, number, number]> = {
  road: ['lowpass', 240, 0, .5, .01, 0, 1],
  rough: ['lowpass', 380, .4, .9, .085, .6, 26],  // gravel
  mud: ['bandpass', 300, .9, 4, .09, .4, 6],      // a slow squelch
  water: ['highpass', 2400, .3, .5, .05, .35, 12],
  planks: ['bandpass', 300, 0, 5, .16, 0, 1],     // knocked board by board, below
  snow: ['bandpass', 1600, .35, .8, .045, .5, 9],
};
const PLANK = 2.4; // metres from board to board
// Turbo whooshes: noise from and to (Hz), seconds, and the riser's first and last note.
const TURBO: [number, number, number, number, number][] = [[600, 2200, .3, 62, 81], [800, 3400, .4, 66, 86], [1000, 5200, .52, 69, 90]];
const CANDY = [81, 83, 86, 88, 90, 93, 95, 98], ROULETTE = [81, 86, 83, 88, 86, 90], SPARKLE = [93, 95, 98, 100, 102];
// One-shot voices are bounded: a pile-up steals the oldest instead of growing the graph.
const EFFECT_VOICES = 22, MUSIC_VOICES = 20, FADING_VOICES = 6, NOISE_SECONDS = 2, STALE = .5;
// A new context's compressor takes a moment to open up: in Chromium a cue in its first instant comes out
// at a third of its level. So the first "3" of the first countdown waits for this much of the audio clock.
const WARM = .1;

interface Shape { to?: number; glide?: number; attack?: number; hold?: number; wobble?: number; rate?: number; q?: number }
interface Voice { source: AudioScheduledSourceNode; nodes: AudioNode[]; level: AudioParam; tune: boolean; fading: boolean }
interface Motor {
  body: OscillatorNode; buzz: OscillatorNode; tone: BiquadFilterNode; level: GainNode;
  wind: BiquadFilterNode; windLevel: GainNode; ground: BiquadFilterNode; groundLevel: GainNode;
  spark: BiquadFilterNode; sparkLevel: GainNode;
}
interface Band { wet: AudioNode; echoes: GainNode | null; hat: BiquadFilterNode; snare: BiquadFilterNode }
interface Graph {
  master: GainNode; effects: GainNode; music: GainNode; noise: AudioBuffer;
  waves: Partial<Record<Custom, PeriodicWave>>; motor: Motor | null; band: Band | null;
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
  const calm = !!settings.calm, soft = calm ? .6 : 1;
  let ctx: AudioContext | null = null, g: Graph | null = null, disposed = false, suspended = false;
  let resumePending = false, pendingState: KartSoundState | null = null, waited = 0;
  const pendingEvents: { name: KartSoundEvent; gain: number; at: number }[] = [];
  let rpm = IDLE_RPM, plank = 0, knock = false, sparks = 0, spins = 0, candyRun = 0, candyAt = -9, amp = 1;
  let songStep = 0, songAt = -1, zone = 0, fast = false; // songAt: when the next sixteenth sounds, or -1 while the song is not running
  // Variation is seeded, so a race sounds the same every time it is played the same.
  let seed = 761;
  const rand = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  /** A value that changes so many times a second, whatever the frame rate is. */
  const jitter = () => {
    let clock = 1, value = .5;
    return (dt: number, rate: number) => { clock += dt * rate; if (clock >= 1) { clock %= 1; value = rand(); } return value; };
  };
  const flutter = jitter(), grain = jitter(), sizzle = jitter();
  const nodes = new Set<AudioNode>();
  const continuous = new Set<AudioScheduledSourceNode>();
  const voices = new Set<Voice>();
  const own = <T extends AudioNode>(node: T): T => { nodes.add(node); return node; };
  const start = <T extends AudioScheduledSourceNode>(node: T): T => { continuous.add(node); node.start(); return node; };
  const forget = (node: AudioNode) => { node.disconnect(); nodes.delete(node); };
  const release = (voice: Voice) => { voices.delete(voice); voice.source.onended = null; voice.nodes.forEach(forget); };
  const cut = (voice: Voice) => { try { voice.source.stop(); } catch { /* An ended voice is already silent. */ } release(voice); };
  const stopVoices = () => { for (const voice of [...voices]) cut(voice); };
  const stepTime = () => 15 / (BPM * (fast ? 1.13 : 1) * (calm ? .93 : 1));

  function build(context: AudioContext): Graph {
    const gain = (value: number, to?: AudioNode) => { const node = own(context.createGain()); node.gain.value = value; if (to) node.connect(to); return node; };
    const filter = (type: BiquadFilterType, frequency: number, q: number, to: AudioNode) => {
      const node = own(context.createBiquadFilter()); node.type = type; node.frequency.value = frequency; node.Q.value = q; node.connect(to); return node;
    };
    const master = gain(0), compressor = own(context.createDynamicsCompressor());
    compressor.threshold.value = -18; compressor.knee.value = 14; compressor.ratio.value = 3;
    compressor.attack.value = .008; compressor.release.value = .2;
    master.connect(compressor); compressor.connect(context.destination);
    const effects = gain(effectsVolume, master), music = gain(musicVolume, master);
    const waves: Graph['waves'] = {};
    if (typeof context.createPeriodicWave === 'function') for (const name of Object.keys(PARTIALS) as Custom[]) {
      const imag = new Float32Array(PARTIALS[name].length);
      PARTIALS[name].forEach((partial, i) => { if (i) imag[i] = partial as number; });
      waves[name] = context.createPeriodicWave(new Float32Array(imag.length), imag);
    }
    // One deterministic noise buffer serves the wind, the ground, the sparks, every whoosh and the drums.
    const noise = context.createBuffer(1, Math.round(context.sampleRate * NOISE_SECONDS), context.sampleRate), data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = rand() * 2 - 1;
    let motor: Motor | null = null, band: Band | null = null;
    if (effectsVolume > 0) {
      const level = gain(0, effects), tone = filter('lowpass', 500, 1.1, level);
      const body = own(context.createOscillator()), buzz = own(context.createOscillator());
      body.type = calm ? 'triangle' : 'sawtooth'; body.frequency.value = 45; body.connect(tone);
      buzz.type = 'square'; buzz.frequency.value = 90; buzz.connect(gain(calm ? .06 : .16, tone));
      const bed = own(context.createBufferSource()); bed.buffer = noise; bed.loop = true;
      const windLevel = gain(0, effects), wind = filter('bandpass', 600, .6, windLevel);
      const groundLevel = gain(0, effects), ground = filter('lowpass', 240, .5, groundLevel);
      const sparkLevel = gain(0, effects), spark = filter('bandpass', 1500, 2.2, sparkLevel);
      bed.connect(wind); bed.connect(ground); bed.connect(spark);
      start(body); start(buzz); start(bed);
      motor = { body, buzz, tone, level, wind, windLevel, ground, groundLevel, spark, sparkLevel };
    }
    if (musicVolume > 0) {
      const hat = filter('highpass', 7200, .7, music), snare = filter('bandpass', 1900, .9, music);
      let wet: AudioNode = music, echoes: GainNode | null = null;
      if (typeof context.createDelay === 'function') {
        // The mountain's echo: two taps, panned apart where the browser can.
        const send = gain(.5); echoes = gain(0, music); wet = gain(1, music); wet.connect(send);
        for (const [time, side] of [[.33, -.7], [.44, .7]] as const) {
          const delay = own(context.createDelay(1)); delay.delayTime.value = time;
          send.connect(delay); delay.connect(gain(.32, delay));
          if (typeof context.createStereoPanner === 'function') {
            const panner = own(context.createStereoPanner()); panner.pan.value = side; delay.connect(panner); panner.connect(echoes);
          } else delay.connect(echoes);
        }
      }
      band = { wet, echoes, hat, snare };
    }
    return { master, effects, music, noise, waves, motor, band };
  }

  function resumeContext(): void {
    if (!ctx || !g || disposed || suspended) return;
    g.master.gain.setTargetAtTime(.65, ctx.currentTime, .003); // A few milliseconds, so the engine does not click back in.
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
        g = build(ctx);
      } catch {
        for (const source of continuous) { try { source.stop(); } catch { /* Partial graph. */ } }
        continuous.clear();
        for (const node of nodes) node.disconnect();
        nodes.clear();
        if (ctx) void ctx.close().catch(() => undefined);
        ctx = null; g = null;
        return;
      }
    }
    resumeContext();
  }

  /** Makes room for one more voice: the oldest fades out fast, and a pile of fading ones is cut. */
  function room(tune: boolean): void {
    let live = 0, fading = 0, oldest: Voice | undefined, stale: Voice | undefined;
    for (const voice of voices) {
      if (voice.tune !== tune) continue;
      if (voice.fading) { fading++; stale ??= voice; } else { live++; oldest ??= voice; }
    }
    if (!oldest || live < (tune ? MUSIC_VOICES : EFFECT_VOICES)) return;
    if (stale && fading >= FADING_VOICES) cut(stale);
    const now = ctx!.currentTime, level = oldest.level;
    oldest.fading = true;
    if (typeof level.cancelAndHoldAtTime === 'function') level.cancelAndHoldAtTime(now); else level.cancelScheduledValues(now);
    level.setTargetAtTime(0, now, .008);
    try { oldest.source.stop(now + .04); } catch { /* It ends by itself, already silent. */ }
  }
  /** Every one-shot goes through here: an attack, an optional hold, a decay to silence, and a release on `ended`. */
  function voice(source: AudioScheduledSourceNode, chain: AudioNode[], out: AudioNode, tune: boolean, at: number, dur: number, peak: number, o: Shape, offset?: number): void {
    const attack = Math.max(o.attack ?? .006, calm && !tune ? .015 : .002), hold = o.hold ?? 0, end = at + Math.max(dur, attack + .02, hold + .02);
    const envelope = own(ctx!.createGain()), level = envelope.gain;
    level.value = 0;
    level.setValueAtTime(0, at);
    level.linearRampToValueAtTime(peak, at + attack);
    if (hold > attack) level.setValueAtTime(peak, at + hold);
    level.exponentialRampToValueAtTime(.0001, end);
    let node: AudioNode = source;
    for (const next of [...chain, envelope, out]) { node.connect(next); node = next; }
    const made: Voice = { source, nodes: [source, ...chain, envelope], level, tune, fading: false };
    voices.add(made);
    source.onended = () => { if (voices.has(made)) release(made); };
    if (offset === undefined) source.start(at); else (source as AudioBufferSourceNode).start(at, offset);
    source.stop(end + .03);
  }
  function tone(out: AudioNode, tune: boolean, at: number, wave: Wave, f: number, dur: number, level: number, o: Shape = {}): void {
    if (!ctx || !g) return;
    if (calm && !tune) { level *= .7; if (wave === 'square' || wave === 'sawtooth') wave = 'triangle'; }
    if (level < .0005) return;
    room(tune);
    const source = own(ctx.createOscillator()), custom = g.waves[wave as Custom], pitch = source.frequency;
    if (custom) source.setPeriodicWave(custom); else source.type = PARTIALS[wave as Custom]?.[0] ?? wave as OscillatorType;
    pitch.setValueAtTime(f, at);
    const to = o.to ?? f, glide = o.glide ?? dur;
    if (o.wobble) {
      // A zigzag laid along the glide: a comic wobble, with no second oscillator.
      const turns = Math.max(2, Math.round(glide * (o.rate ?? 12) * 2));
      for (let i = 1; i <= turns; i++) pitch.linearRampToValueAtTime(f * (to / f) ** (i / turns) * (1 + (i % 2 ? o.wobble : -o.wobble)), at + glide * i / turns);
    } else if (to !== f) pitch.exponentialRampToValueAtTime(to, at + glide);
    voice(source, [], out, tune, at, dur, level, o);
  }
  /** Noise through a filter of its own, or (type null) into a filter the band shares. */
  function hiss(out: AudioNode, tune: boolean, at: number, type: BiquadFilterType | null, f: number, dur: number, level: number, o: Shape = {}): void {
    if (!ctx || !g) return;
    if (calm && !tune) level *= .6;
    if (level < .0005) return;
    room(tune);
    const source = own(ctx.createBufferSource()), chain: AudioNode[] = [];
    source.buffer = g.noise; source.loop = true;
    if (type) {
      const filter = own(ctx.createBiquadFilter());
      filter.type = type; filter.Q.value = o.q ?? .8; filter.frequency.setValueAtTime(f, at);
      if (o.to) filter.frequency.exponentialRampToValueAtTime(o.to, at + (o.glide ?? dur));
      chain.push(filter);
    }
    voice(source, chain, out, tune, at, dur, level, o, rand() * NOISE_SECONDS * .9);
  }

  // Effects: `at` counts from now, and `amp` is the gain of the event being played.
  const soon = () => Math.max(ctx!.currentTime, WARM);
  const blip = (wave: Wave, f: number, dur: number, level: number, at = 0, o?: Shape) => tone(g!.effects, false, soon() + at, wave, f, dur, level * amp, o);
  const ping = (wave: Wave, midi: number, dur: number, level: number, at = 0, o?: Shape) => blip(wave, hz(midi), dur, level, at, o);
  const run = (wave: Wave, midis: number[], gap: number, dur: number, level: number, at = 0, o?: Shape) => midis.forEach((midi, i) => ping(wave, midi, dur, level, at + i * gap, o));
  const puff = (type: BiquadFilterType, f: number, dur: number, level: number, at = 0, o?: Shape) => hiss(g!.effects, false, soon() + at, type, f, dur, level * amp, o);
  /** Three whooshes that climb: each longer and higher than the last, with as many pips as its tier. */
  const turbo = (tier: number) => {
    const [from, to, length, low, high] = TURBO[tier - 1]!;
    puff('bandpass', from, length, .09 + tier * .025, 0, { to, q: 1.4, attack: .02, hold: length * .4 });
    blip('sawtooth', hz(low), length * .9, .07, 0, { to: hz(high), hold: length * .4 });
    run('bell', [86, 90, 93].slice(0, tier), .06, .4, .08, .04);
    if (tier === 3) blip('sine', 130, .3, .15, 0, { to: 55, glide: .2 });
  };
  const cues: Record<KartSoundEvent, (mine: boolean) => void> = {
    countdown() { ping('wood', 74, .3, .26); ping('sine', 62, .2, .13); },
    go() { run('reed', [86, 90, 93], .035, .6, .12, 0, { hold: .22 }); puff('highpass', 3000, .22, .04); },
    startBoost() {
      puff('bandpass', 500, .5, .13, 0, { to: 3600, q: 1.2, attack: .03, hold: .2 });
      blip('sawtooth', 196, .42, .09, 0, { to: 784, hold: .2 }); run('bell', [86, 93], .08, .45, .08, .12);
    },
    hop() { blip('triangle', 300, .16, .15, 0, { to: 620, glide: .11, wobble: .08, rate: 30 }); },
    land() { blip('sine', 170, .13, .2, 0, { to: 70, glide: .08 }); puff('bandpass', 800, .07, .08); },
    trick() { run('bell', [86, 90, 93, 98, 102], .045, .45, .09); puff('highpass', 6000, .3, .03, .05, { attack: .05 }); },
    turbo1() { turbo(1); }, turbo2() { turbo(2); }, turbo3() { turbo(3); },
    tier(mine) {
      // The sparks ring one note higher each time they step up within a drift.
      if (mine) sparks = Math.min(3, sparks + 1);
      const step = mine ? sparks : 1;
      ping('bell', [81, 86, 90][step - 1]!, .4, .1); puff('highpass', 4200 + step * 900, .07, .05);
    },
    pad() { blip('sawtooth', 330, .28, .12, 0, { to: 1320, glide: .2, hold: .12 }); puff('bandpass', 1200, .26, .1, 0, { to: 4200, q: 2, hold: .1 }); },
    boost() {
      puff('bandpass', 400, .7, .14, 0, { to: 3000, q: 1, attack: .06, hold: .3 });
      blip('sawtooth', 147, .6, .09, 0, { to: 587, glide: .45, hold: .3 }); run('bell', [78, 81, 86, 90], .05, .45, .07, .04);
    },
    draft() {
      puff('bandpass', 900, .55, .1, 0, { to: 2200, q: .7, attack: .15, hold: .3 });
      ping('sine', 81, .45, .04, .05, { to: hz(88), attack: .1, hold: .25 });
    },
    box() {
      blip('sine', 520, .09, .18, 0, { to: 170, glide: .06 }); puff('bandpass', 1800, .06, .1, 0, { q: 1 });
      for (let i = 0; i < 3; i++) ping('bell', SPARKLE[Math.floor(rand() * SPARKLE.length)]!, .4, .07, .04 + i * .045);
    },
    roulette() { ping('wood', ROULETTE[spins++ % ROULETTE.length]!, .07, .1); },
    itemReady() { ping('bell', 83, .12, .08); run('bell', [86, 90, 93], 0, .9, .09, .07); ping('bell', 98, 1, .07, .14); },
    throw() { blip('square', 1700, .16, .09, 0, { to: 420, glide: .13 }); puff('highpass', 2500, .06, .04); },
    drop() { blip('sine', 430, .1, .14, 0, { to: 170, glide: .07 }); blip('sine', 210, .09, .08, .07, { to: 360, glide: .05 }); },
    shield() {
      [74, 81, 86].forEach((midi, i) => ping('sine', midi, .7, .06, i * .05, { attack: .2, hold: .35 }));
      puff('bandpass', 700, .7, .05, 0, { to: 1500, q: .5, attack: .25, hold: .4 });
    },
    shieldPop() {
      blip('sine', 760, .08, .18, 0, { to: 190, glide: .05 }); puff('highpass', 3200, .09, .08);
      ping('bell', 86, .3, .05, .03); ping('bell', 81, .35, .05, .09);
    },
    cloud() {
      puff('lowpass', 170, 1.1, .3, 0, { to: 90, attack: .25, hold: .6 }); puff('highpass', 4800, 1.1, .05, .15, { attack: .3, hold: .7 });
      for (let i = 0; i < 3; i++) { const f = 1500 + rand() * 900; blip('sine', f, .06, .04, .3 + i * .2 + rand() * .1, { to: f * .6 }); }
    },
    star() { run('bell', [74, 78, 81, 86, 90, 93, 98, 102], .045, .6, .085); puff('highpass', 7000, .5, .025, .1, { attack: .2 }); },
    hit() { puff('bandpass', 900, .09, .14); blip('triangle', 700, .6, .15, 0, { to: 150, wobble: .09, rate: 13, hold: .3 }); },
    spin() {
      blip('sine', 540, .7, .11, 0, { to: 300, wobble: .22, rate: 5.5, hold: .45 });
      puff('bandpass', 1400, .7, .03, 0, { to: 700, q: 3, attack: .05, hold: .4 });
    },
    bump() { blip('wood', 400, .08, .17, 0, { to: 330 }); puff('bandpass', 1500, .04, .08, 0, { q: 2 }); },
    wall() { blip('triangle', 95, .2, .22, 0, { to: 48, glide: .12 }); puff('lowpass', 260, .14, .14); },
    splash() {
      puff('highpass', 1800, .4, .13, 0, { hold: .08 }); puff('bandpass', 700, .3, .08, .02, { to: 300, q: .9 });
      blip('sine', 260, .12, .1, 0, { to: 90 });
    },
    candy(mine) {
      // Sweets taken in quick succession climb the scale; a pause starts again from the bottom.
      const now = ctx!.currentTime;
      if (mine) { candyRun = now - candyAt < .9 ? Math.min(candyRun + 1, CANDY.length - 1) : 0; candyAt = now; }
      const midi = CANDY[mine ? candyRun : 0]!;
      ping('bell', midi, .2, .11); ping('bell', midi + 7, .35, .08, .05);
    },
    candyLost() { [83, 79, 76, 71].forEach((midi, i) => ping('triangle', midi, .16, .08, i * .07 + rand() * .02)); puff('highpass', 4000, .05, .03); },
    passUp() { ping('reed', 81, .12, .1); ping('reed', 86, .26, .11, .08); },
    passDown() { ping('reed', 81, .12, .08); ping('reed', 76, .28, .08, .08); },
    lap() { run('bell', [86, 93, 98], .09, 1.1, .11); ping('sine', 74, .8, .06); },
    finalLap() {
      run('reed', [81, 81, 81], .1, .09, .11);
      for (const midi of [86, 90]) ping('reed', midi, .5, .11, .3, { hold: .3 });
      run('bell', [93, 98], .08, .5, .07, .56); puff('highpass', 4000, .3, .04, .3);
    },
    finish() {
      run('reed', [74, 78, 81, 86], .14, .5, .1, 0, { hold: .1 }); ping('reed', 83, .3, .09, .56, { hold: .1 });
      for (const midi of [78, 81, 86]) ping('reed', midi, 1, .08, .72, { hold: .5 });
      ping('bass', 50, 1, .12, .72, { hold: .4 });
    },
    win() {
      run('reed', [74, 78, 81, 86], .08, .2, .11, 0, { hold: .06 }); ping('reed', 90, .26, .12, .32, { hold: .16 });
      run('reed', [88, 90], .1, .14, .1, .56, { hold: .06 });
      for (const midi of [86, 90, 93]) ping('reed', midi, 1.1, .09, .78, { hold: .55 });
      ping('bass', 50, 1.1, .14, .78, { hold: .5 }); blip('sine', 165, .17, .16, .78, { to: 48, glide: .08 });
      run('bell', [98, 102, 105, 110], .06, .8, .06, .84);
    },
  };

  /** The engine, the wind, the ground under the wheels and the drift's sizzle. */
  function drive(m: Motor, state: KartSoundState, step: number, now: number): void {
    const racing = state.phase === 'racing', running = racing || state.phase === 'countdown', air = !!state.airborne;
    const speed = clamp(finite(state.speed), 0, 45), pace = speed / TOP_SPEED;
    const throttle = clamp(finite(state.throttle), 0, 1), boost = clamp(finite(state.boost), 0, 1);
    rpm = kartRpm(rpm, speed, throttle, step, air ? .5 : boost * .4);
    // A little seeded flutter keeps the engine from sounding like a held note.
    const pitch = rpm / 40 * (1 + boost * .1) * (1 + (flutter(step, 22) - .5) * .012);
    m.body.frequency.setTargetAtTime(pitch, now, .045);
    m.buzz.frequency.setTargetAtTime(pitch * 2.012, now, .045);
    m.tone.frequency.setTargetAtTime(340 + pace * 800 + throttle * 320 + boost * 1100 + (air ? 250 : 0), now, .06);
    m.level.gain.setTargetAtTime(running ? (.028 + throttle * .016 + boost * .01) * soft * (air ? .6 : 1) : 0, now, .06);
    m.windLevel.gain.setTargetAtTime(racing ? (pace * pace * .03 + boost * .035) * soft : 0, now, .09);
    m.wind.frequency.setTargetAtTime(520 + pace * 700 + boost * 1400, now, .12);
    const tier = clamp(Math.round(finite(state.driftTier)), 0, 3), sliding = racing && state.drifting && !air;
    m.sparkLevel.gain.setTargetAtTime(sliding ? (.02 + tier * .009) * (.55 + .45 * sizzle(step, 30)) * Math.min(1, pace * 2.5) * soft : 0, now, .02);
    m.spark.frequency.setTargetAtTime([1500, 2300, 3300, 4600][tier]!, now, .04);
    const [type, tuned, swing, q, loud, rough, rate] = GROUND[state.surface] ?? GROUND.road;
    const rolling = racing && !air ? Math.min(1, pace * 1.6) * soft : 0, crunch = grain(step, rate);
    if (m.ground.type !== type) m.ground.type = type;
    m.ground.Q.setTargetAtTime(q, now, .03);
    if (state.surface !== 'planks') {
      m.ground.frequency.setTargetAtTime(tuned * (1 + swing * (crunch - .5)), now, .03);
      m.groundLevel.gain.setTargetAtTime(rolling * loud * (1 - rough + rough * crunch), now, .02);
      return;
    }
    // Boards knock by distance travelled, not by frame: an even clatter at any frame rate.
    if (!rolling) m.groundLevel.gain.setTargetAtTime(0, now, .03);
    plank += speed * step / PLANK;
    while (plank >= 1) {
      plank--;
      if (!rolling) continue;
      const at = Math.max(now, now + .05 - plank * PLANK / speed);
      knock = !knock;
      m.ground.frequency.setValueAtTime(knock ? 250 : 330, at);
      m.groundLevel.gain.setTargetAtTime(rolling * loud, at, .004);
      m.groundLevel.gain.setTargetAtTime(0, at + .014, .03);
    }
  }

  /** One sixteenth of the tune, as the current zone plays it. */
  function playStep(b: Band, index: number, at: number, star: boolean): void {
    const bar = Math.floor(index / STEPS), s = index % STEPS, kit = KITS[zone]!, unit = stepTime();
    const root = DEGREE[kit.chords[bar]!]!, dry = g!.music, out = kit.echo ? b.wet : dry;
    // Chord tones are counted in scale steps, so every zone's colour stays inside the one key.
    const chord = (steps: number, octave: number) => hz(62 + 12 * (octave + Math.floor((root + steps) / 7) - (root > 2 ? 1 : 0)) + MAJOR[(root + steps) % 7]!);
    const held = (line: string) => { let n = 1; while (line[s + n] === '-') n++; return n * unit; };
    // Calm leaves out the soft in-between hits.
    const hit = (line: string) => line[s] === 'x' ? (calm ? .75 : 1) : line[s] === 'o' && !calm ? .55 : 0;
    const digit = (line: string) => { const n = line.charCodeAt(s) - 48; return n >= 0 && n <= 9 ? n : -1; };
    const note = digit(MELODY[bar]!), length = held(MELODY[bar]!);
    if (note >= 0 && (!kit.thin || s % 4 === 0 || length > unit * 2.5)) {
      const [wave, octave, level, sustain, ring] = kit.lead;
      tone(out, true, at, wave, hz(PENTA[note]! + 12 * octave), Math.max(length * ring, .22), level, { attack: .01, hold: sustain * length });
    }
    const low = kit.bass[s];
    if (low === 'r' || low === 'f' || low === 'o') {
      const span = held(kit.bass);
      tone(dry, true, at, 'bass', chord(low === 'r' ? 0 : low === 'f' ? 4 : 7, -1), Math.max(span * .95, .14), .11, { attack: .008, hold: span * .5 });
    }
    kit.arps.forEach((line, i) => {
      const [wave, octave, level, ring] = kit.arp, n = digit(line);
      if (n >= 0 && !(calm && (i || s % 2))) tone(out, true, at, wave, chord(kit.voicing[n]!, octave), ring, level);
    });
    // A pad ends before the next bar's is scheduled, so held notes never pile up.
    if (kit.pad && s === 0) for (const steps of kit.pad.slice(1)) tone(out, true, at, 'sine', chord(steps, kit.pad[0]!), unit * 14.5, .012, { attack: unit * 4, hold: unit * 10 });
    // The final lap drives harder: a kick on every beat and hats on every sixteenth.
    const urgent = fast && !calm;
    const kick = hit(kit.kick) || (urgent && s % 4 === 0 ? .6 : 0), snare = hit(kit.snare);
    const hat = hit(kit.hat) || (urgent && s % 2 ? .45 : 0), wood = hit(kit.knock);
    if (kick) tone(dry, true, at, 'sine', 165, .17, .2 * kick, { to: 48, glide: .08, attack: .003 });
    if (snare) hiss(b.snare, true, at, null, 0, .13, .085 * snare, { attack: .002 });
    if (hat) hiss(b.hat, true, at, null, 0, .05, .045 * hat, { attack: .002 });
    if (wood) tone(out, true, at, 'wood', kit.knock[s] === 'o' ? 660 : 880, .08, .06 * wood);
    if (star && !(calm && s % 2)) tone(dry, true, at, 'bell', chord(STAR[index % STAR.length]!, 1), .13, .028);
  }
  /** Schedules the tune a little ahead on the audio clock. Its own clock only moves while racing ticks arrive. */
  function conduct(b: Band, state: KartSoundState, now: number): void {
    if (state.phase !== 'racing') { songStep = 0; songAt = -1; return; }
    if (songAt < now) {
      // After a pause the echo's old tail is let through only once it has run out. After a stall the song does not skip ahead.
      if (songAt < 0 && b.echoes) { b.echoes.gain.cancelScheduledValues(now); b.echoes.gain.setValueAtTime(0, now); b.echoes.gain.setTargetAtTime(1, now + .5, .03); }
      songAt = now + .05;
    }
    while (songAt < now + AHEAD) {
      // Zone and tempo change on a bar line only.
      if (songStep % STEPS === 0) { zone = clamp(Math.round(finite(state.zone)), 0, KITS.length - 1); fast = !!state.finalLap; }
      playStep(b, songStep, songAt, !!state.star);
      songAt += stepTime(); songStep = (songStep + 1) % SONG;
    }
  }

  function tick(state: KartSoundState, dt: number): void {
    if (!ctx || !g || disposed || suspended) return;
    const step = clamp(finite(dt), 0, .1);
    if (ctx.state !== 'running') { pendingState = { ...state }; waited += step; return; }
    pendingState = null;
    if (!state.drifting) sparks = 0;
    if (g.motor) drive(g.motor, state, step, ctx.currentTime);
    if (g.band) conduct(g.band, state, ctx.currentTime);
  }
  function event(name: KartSoundEvent, gain = 1): void {
    if (!ctx || !g || disposed || suspended || effectsVolume === 0) return;
    const level = clamp(finite(gain, 1), 0, 1);
    if (level < .02) return;
    if (ctx.state !== 'running') {
      // Resume is asynchronous on Safari too. Retain the current cue, never an
      // old countdown burst, and discard the queue on a genuine later pause.
      if (name === 'roulette') return;
      if (name === 'finish' || name === 'win') pendingEvents.length = 0;
      if (name === 'countdown' || name === 'go') {
        const previous = pendingEvents.findIndex(cue => cue.name === 'countdown');
        if (previous >= 0) pendingEvents.splice(previous, 1);
      }
      if (pendingEvents.length >= 8) pendingEvents.shift();
      pendingEvents.push({ name, gain: level, at: waited });
      return;
    }
    amp = level;
    cues[name]?.(level === 1);
  }
  function flushPending(): void {
    if (!ctx || disposed || suspended || ctx.state !== 'running') return;
    const state = pendingState, queued = pendingEvents.splice(0), since = waited;
    pendingState = null; waited = 0;
    // Apply the latest engine state before the fanfare; the result screen no
    // longer ticks audio, so retaining its last racing engine would buzz forever.
    if (state) tick(state, 0);
    // A cue that waited long for the context would only confuse. The fanfare is still worth hearing.
    for (const cue of queued) if (since - cue.at < STALE || cue.name === 'finish' || cue.name === 'win') event(cue.name, cue.gain);
  }

  return {
    unlock, tick, event,
    suspend(next: boolean) {
      if (suspended === next || disposed) return;
      suspended = next;
      if (!ctx || !g) return;
      if (next) {
        const now = ctx.currentTime;
        pendingEvents.length = 0; pendingState = null; waited = 0;
        g.master.gain.cancelScheduledValues(now);
        g.master.gain.setValueAtTime(0, now);
        // Notes scheduled ahead die with the pause: the song winds back to the first of them.
        if (songAt > now) songStep = (songStep - Math.floor((songAt - now) / stepTime()) + SONG) % SONG;
        songAt = -1; stopVoices();
        const echoes = g.band?.echoes?.gain;
        if (echoes) { echoes.cancelScheduledValues(now); echoes.setValueAtTime(0, now); }
        void ctx.suspend().then(() => { if (!suspended && !disposed) resumeContext(); }).catch(() => undefined);
      } else resumeContext();
    },
    dispose() {
      if (disposed) return;
      disposed = true; pendingEvents.length = 0; pendingState = null; stopVoices();
      if (ctx && g) g.master.gain.setValueAtTime(0, ctx.currentTime);
      for (const source of continuous) { try { source.stop(); } catch { /* Already ended. */ } }
      continuous.clear();
      for (const node of nodes) node.disconnect();
      nodes.clear();
      if (ctx) void ctx.close().catch(() => undefined);
      ctx = null; g = null;
    },
  };
}
