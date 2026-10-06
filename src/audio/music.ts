/**
 * The music and the air of each place (plan §5.8), all of it made in code: no recording, no licensed tune,
 * no download.
 *
 * "Spökets polska" (a working title) is a polska in 3/4, written for this game, and written here as notes.
 * It is played on a plucked string, by Karplus–Strong, with knocks of wood and strokes of a knife for its
 * rhythm: the ghost's own. Each place has its own way of playing it: the whole tune or only its bones, quick
 * or slow, with or without the bass.
 *
 * This file has no audio in it, only numbers, so that it can be checked without ears: the tests render the
 * pluck and measure its pitch, its level and its decay, read the tune bar by bar, and mix a whole round.
 */

/** One note of the tune: where in the bar it begins and how long it is, in beats, and its pitch as a MIDI number. */
export interface Note {
  beat: number;
  length: number;
  midi: number;
}

export const BEATS_PER_BAR = 3;

// The notes of D dorian that the tune uses, as MIDI numbers.
const [D4, E4, F4, G4, A4, B4, C5, D5, E5, F5] = [62, 64, 65, 67, 69, 71, 72, 74, 76, 77] as const;
const [G2, A2, C3, D3] = [43, 45, 48, 50] as const;

/** The tune: eight bars, one list of notes to a bar. It begins and ends on D, the note it rests on. */
export const POLSKA: Note[][] = [
  [{ beat: 0, length: 1, midi: D4 }, { beat: 1, length: 0.5, midi: F4 }, { beat: 1.5, length: 0.5, midi: A4 }, { beat: 2, length: 1, midi: D5 }],
  [{ beat: 0, length: 1, midi: C5 }, { beat: 1, length: 0.5, midi: A4 }, { beat: 1.5, length: 0.5, midi: F4 }, { beat: 2, length: 1, midi: A4 }],
  [{ beat: 0, length: 1, midi: G4 }, { beat: 1, length: 0.5, midi: B4 }, { beat: 1.5, length: 0.5, midi: A4 }, { beat: 2, length: 1, midi: G4 }],
  [{ beat: 0, length: 0.5, midi: F4 }, { beat: 0.5, length: 0.5, midi: E4 }, { beat: 1, length: 2, midi: D4 }],
  [{ beat: 0, length: 1, midi: A4 }, { beat: 1, length: 0.5, midi: D5 }, { beat: 1.5, length: 0.5, midi: E5 }, { beat: 2, length: 1, midi: F5 }],
  [{ beat: 0, length: 1, midi: E5 }, { beat: 1, length: 0.5, midi: C5 }, { beat: 1.5, length: 0.5, midi: A4 }, { beat: 2, length: 1, midi: C5 }],
  [{ beat: 0, length: 0.5, midi: D5 }, { beat: 0.5, length: 0.5, midi: C5 }, { beat: 1, length: 1, midi: A4 }, { beat: 2, length: 0.5, midi: G4 }, { beat: 2.5, length: 0.5, midi: F4 }],
  [{ beat: 0, length: 1, midi: E4 }, { beat: 1, length: 2, midi: D4 }],
];

/** The bass: a polska's step, on the first beat and the third. One pair to a bar. */
export const BASS: [number, number][] = [[D3, A2], [D3, A2], [G2, D3], [D3, A2], [D3, A2], [C3, G2], [A2, A2], [D3, A2]];

/** What a place's air sounds like. */
export type Ambience = 'room' | 'birds' | 'spruces' | 'bog' | 'wind' | 'night';

/** How a place plays the tune. */
export interface Arrangement {
  /** Beats a minute. */
  tempo: number;
  /** The whole tune, or only the notes on the first and third beat: its bones. */
  melody: 'full' | 'sparse';
  bass: boolean;
  /** Its rhythm: none, a knife's stroke now and then, or knocks of wood. */
  rhythm: 'none' | 'scrape' | 'knock';
  /** Semitones up or down: an octave down in the deep forest. */
  transpose: number;
  /** Bars of rest after the tune, before it comes again. */
  rest: number;
  /** How bright the pluck is, from 0 (dull) to 1. */
  bright: number;
  ambience: Ambience;
}

/** The arrangements, by place; and by part of the story where that says more than its place does. */
export const ARRANGEMENTS: Record<string, Arrangement> = {
  // Prolog: a solo pluck, with knife strokes. Epilog: the same tune, as a slow waltz.
  home: { tempo: 96, melody: 'full', bass: false, rhythm: 'scrape', transpose: 0, rest: 2, bright: 0.6, ambience: 'room' },
  epilog: { tempo: 72, melody: 'full', bass: true, rhythm: 'none', transpose: 0, rest: 2, bright: 0.4, ambience: 'night' },
  // Gården: pizzicato, and playful.
  garden: { tempo: 116, melody: 'full', bass: true, rhythm: 'none', transpose: 0, rest: 1, bright: 0.8, ambience: 'birds' },
  // Granskogen: low, and hesitant.
  forest: { tempo: 84, melody: 'sparse', bass: true, rhythm: 'none', transpose: -12, rest: 3, bright: 0.35, ambience: 'spruces' },
  // Myren: little of it, and far apart.
  bog: { tempo: 76, melody: 'sparse', bass: false, rhythm: 'none', transpose: -5, rest: 4, bright: 0.3, ambience: 'bog' },
  // Berget: the full theme.
  mountain: { tempo: 104, melody: 'full', bass: true, rhythm: 'none', transpose: 0, rest: 1, bright: 0.7, ambience: 'wind' },
  // Byn, the extra chapter: the whole tune at a walk, with the wood knocking all through.
  village: { tempo: 108, melody: 'full', bass: true, rhythm: 'knock', transpose: 0, rest: 1, bright: 0.75, ambience: 'birds' },
  // The final: everything, a little slower.
  dusk: { tempo: 88, melody: 'full', bass: true, rhythm: 'knock', transpose: 0, rest: 2, bright: 0.5, ambience: 'night' },
};

/** The arrangement for a part of the story, or null where there is no music: the test course. */
export function arrangementFor(chapter: string, place: string | undefined): Arrangement | null {
  return ARRANGEMENTS[chapter] ?? (place ? (ARRANGEMENTS[place] ?? null) : null);
}

/** How many bars one round of an arrangement is: the tune and its rest. */
export const barsIn = (a: Arrangement) => POLSKA.length + a.rest;
/** How long a bar is, in seconds. */
export const barSeconds = (a: Arrangement) => (BEATS_PER_BAR * 60) / a.tempo;

/** How much slower the close is than the tune: a chapter's end draws out. */
export const CADENCE_SLOW = 0.8;

/**
 * A chapter's close (docs/narrative-audit/threads.md §5.4): the tune's last two bars, a little slower and whole
 * even where the place plays only its bones, then the D it rests on, held. Times are from the close's start.
 */
export function cadenceOf(a: Arrangement): Sound[] {
  const slow: Arrangement = { ...a, tempo: a.tempo * CADENCE_SLOW, melody: 'full', rhythm: 'none' };
  const bar = barSeconds(slow);
  const out: Sound[] = [];
  for (const [i, index] of [POLSKA.length - 2, POLSKA.length - 1].entries()) {
    for (const s of barOf(slow, index)) out.push({ ...s, at: s.at + i * bar });
  }
  out.push({ voice: 'pluck', at: 2 * bar, midi: 62 + a.transpose, seconds: RING, level: 0.7 });
  if (a.bass) out.push({ voice: 'pluck', at: 2 * bar, midi: 50 + a.transpose, seconds: RING, level: 0.5 });
  return out;
}

/** How loud the music's bus is, beside effects at 1: it lies under them. */
export const MUSIC_LEVEL = 0.3;
/** The longest a plucked note rings, in seconds. */
export const RING = 2.2;

/** One thing to sound: what, when from the bar's start in seconds, at which pitch, for how long, and how loud (0 to 1). */
export interface Sound {
  voice: 'pluck' | 'knock' | 'scrape';
  at: number;
  midi: number;
  seconds: number;
  level: number;
}

/**
 * What sounds in bar number `bar` of an arrangement. In the rest after the tune no string sounds.
 * With `chase`, the wood knocks whatever the arrangement: the ghost is near (plan §5.8, the chase layer).
 */
export function barOf(a: Arrangement, bar: number, chase = false): Sound[] {
  const round = barsIn(a);
  const at = ((bar % round) + round) % round;
  const beat = 60 / a.tempo;
  const out: Sound[] = [];
  if (at < POLSKA.length) {
    for (const n of POLSKA[at]!) {
      if (a.melody === 'sparse' && n.beat !== 0 && n.beat !== 2) continue;
      out.push({
        voice: 'pluck',
        at: n.beat * beat,
        midi: n.midi + a.transpose,
        // A plucked string rings on a little past its note.
        seconds: Math.min(RING, n.length * beat + 0.5),
        // A polska leans on the first beat and the third.
        level: n.beat === 0 ? 0.9 : n.beat === 2 ? 0.75 : 0.6,
      });
    }
    if (a.bass) {
      const [first, third] = BASS[at]!;
      out.push({ voice: 'pluck', at: 0, midi: first + a.transpose, seconds: 1.6, level: 0.55 });
      out.push({ voice: 'pluck', at: 2 * beat, midi: third + a.transpose, seconds: 1.2, level: 0.45 });
    }
  }
  if (chase || a.rhythm === 'knock') {
    // One, and three, and a light one after: the step of a polska, knocked on wood.
    out.push({ voice: 'knock', at: 0, midi: 57, seconds: 0.07, level: 0.5 });
    out.push({ voice: 'knock', at: 2 * beat, midi: 62, seconds: 0.07, level: 0.4 });
    out.push({ voice: 'knock', at: 2.5 * beat, midi: 62, seconds: 0.05, level: 0.2 });
  } else if (a.rhythm === 'scrape' && at % 2 === 1) {
    // The knife on the wood, on the second beat of every second bar.
    out.push({ voice: 'scrape', at: beat, midi: 0, seconds: 0.18, level: 0.3 });
  }
  return out;
}

export const frequencyOf = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

/**
 * A plucked string, by Karplus–Strong: a burst of noise goes round a delay line one period long, and is
 * softened a little each time round, so that it rings and dies away like a string. The burst is always the
 * same for a pitch, so a note sounds the same every time.
 */
export function pluck(frequency: number, seconds: number, sampleRate: number, bright = 0.5): Float32Array {
  const length = Math.max(1, Math.round(seconds * sampleRate));
  // The line is a whole number of samples, and the softening takes half a sample off each round. So the
  // string is a little out of tune as it is made, and is read out at the speed that puts it right.
  const size = Math.max(2, Math.round(sampleRate / frequency + 0.5));
  const speed = (frequency * (size - 0.5)) / sampleRate;
  const line = new Float32Array(size);
  let seed = 12345 + Math.round(frequency * 7);
  for (let i = 0; i < size; i++) {
    seed = (seed * 16807) % 2147483647;
    line[i] = (seed / 2147483647) * 2 - 1;
  }
  // A duller pluck starts from a softer burst.
  for (let pass = 0; pass < Math.round((1 - bright) * 6); pass++) {
    let before = line[size - 1]!;
    for (let i = 0; i < size; i++) {
      const now = line[i]!;
      line[i] = 0.5 * (now + before);
      before = now;
    }
  }
  const raw = new Float32Array(Math.ceil(length * speed) + 2);
  // How much is left after each round. Low strings are let ring longer.
  const keep = 0.9985 - 0.004 * Math.min(1, frequency / 900);
  let at = 0;
  let peak = 0;
  for (let i = 0; i < raw.length; i++) {
    const next = at + 1 === size ? 0 : at + 1;
    const value = line[at]!;
    raw[i] = value;
    line[at] = keep * 0.5 * (value + line[next]!);
    at = next;
    peak = Math.max(peak, Math.abs(value));
  }
  // The same loudness for every pitch, and a short fade so that the end never clicks.
  const out = new Float32Array(length);
  const fade = Math.min(length, Math.round(0.03 * sampleRate));
  for (let i = 0; i < length; i++) {
    const from = i * speed;
    const whole = Math.floor(from);
    const value = raw[whole]! + (raw[whole + 1]! - raw[whole]!) * (from - whole);
    const tail = i >= length - fade ? (length - i) / fade : 1;
    out[i] = (value / (peak || 1)) * 0.9 * tail;
  }
  return out;
}

/** One tone of a call: a bird's chirp, a crane, a clock's tick. `delay` is from the call's start, in seconds. */
export interface Tone {
  wave: 'sine' | 'triangle';
  from: number;
  to: number;
  seconds: number;
  level: number;
  delay: number;
}

/** The air of a place: its wind, and what is heard in it now and then. All of it is quiet. */
export interface Air {
  /** Noise through a filter, swelling and sinking once in `swell` seconds. */
  wind: { filter: 'lowpass' | 'bandpass'; frequency: number; q: number; level: number; swell: number } | null;
  /** Each call comes again after a gap between the two numbers, in seconds. */
  calls: { gap: [number, number]; tones: Tone[] }[];
}

const chirp = (from: number, to: number, delay: number, level = 0.02, seconds = 0.07): Tone => ({ wave: 'sine', from, to, seconds, level, delay });

/** The airs. Small, close sounds sell the scale (plan §5.8): he is as small as a wooden figure. */
export const AIRS: Record<Ambience, Air> = {
  // The kitchen in the evening: only the clock on the wall.
  room: {
    wind: null,
    calls: [{ gap: [2, 2], tones: [chirp(1900, 1500, 0, 0.018, 0.03), chirp(1500, 1200, 1, 0.014, 0.03)] }],
  },
  // The garden: small birds, and a little air.
  birds: {
    wind: { filter: 'lowpass', frequency: 500, q: 0.7, level: 0.02, swell: 9 },
    calls: [
      { gap: [3, 8], tones: [chirp(3200, 4200, 0), chirp(3300, 4300, 0.11), chirp(3400, 4500, 0.22)] },
      { gap: [6, 14], tones: [chirp(2700, 2400, 0, 0.018, 0.14), chirp(2100, 2000, 0.2, 0.018, 0.2)] },
    ],
  },
  // The spruce forest: wind high up in the trees, and one bird far away.
  spruces: {
    wind: { filter: 'bandpass', frequency: 420, q: 0.7, level: 0.05, swell: 11 },
    calls: [{ gap: [9, 20], tones: [chirp(1500, 1300, 0, 0.014, 0.25)] }],
  },
  // The bog: wide and still. A crane far off, and a small bird near.
  bog: {
    wind: { filter: 'lowpass', frequency: 300, q: 0.7, level: 0.025, swell: 14 },
    calls: [
      { gap: [11, 24], tones: [{ wave: 'triangle', from: 520, to: 700, seconds: 0.35, level: 0.03, delay: 0 }, { wave: 'triangle', from: 560, to: 760, seconds: 0.4, level: 0.03, delay: 0.45 }] },
      { gap: [5, 12], tones: [chirp(2800, 3000, 0, 0.014, 0.08)] },
    ],
  },
  // The mountain: wind over bare rock.
  wind: {
    wind: { filter: 'bandpass', frequency: 600, q: 0.5, level: 0.07, swell: 7 },
    calls: [],
  },
  // Dusk and night: a hush, and an owl.
  night: {
    wind: { filter: 'lowpass', frequency: 260, q: 0.7, level: 0.03, swell: 16 },
    calls: [{ gap: [14, 30], tones: [chirp(420, 400, 0, 0.025, 0.5), chirp(420, 380, 0.8, 0.025, 0.6)] }],
  },
};
