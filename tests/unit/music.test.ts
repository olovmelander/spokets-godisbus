import { describe, expect, it } from 'vitest';
import {
  AIRS, ARRANGEMENTS, arrangementFor, barOf, barSeconds, barsIn, BASS, BEATS_PER_BAR, frequencyOf, MUSIC_LEVEL, pluck, POLSKA, RING,
} from '../../src/audio/music';
import { STORY } from '../../src/content/chapters';
import { testbana } from '../../src/content/chapters/testbana';

// Nobody listens to the music in a test. It is measured instead (plan §5.8, "QA without ears").

/** The pitch of a sound, in Hz, from the lag at which it is most like itself. */
function pitchOf(samples: Float32Array, sampleRate: number, near: number): number {
  const from = Math.floor(sampleRate / (near * 1.3));
  const to = Math.ceil(sampleRate / (near / 1.3));
  const span = Math.min(samples.length - to - 2, Math.round(sampleRate * 0.25));
  const likeness = (lag: number) => {
    let sum = 0;
    for (let i = 0; i < span; i++) sum += samples[i]! * samples[i + lag]!;
    return sum;
  };
  let best = from;
  let most = -Infinity;
  for (let lag = from; lag <= to; lag++) {
    const value = likeness(lag);
    if (value > most) [most, best] = [value, lag];
  }
  // Between whole lags: the top of the curve through the best lag and its neighbours.
  const [a, b, c] = [likeness(best - 1), most, likeness(best + 1)];
  return sampleRate / (best + (0.5 * (a - c)) / (a - 2 * b + c));
}

const loudness = (samples: Float32Array, from: number, to: number) => {
  let sum = 0;
  for (let i = from; i < to; i++) sum += samples[i]! ** 2;
  return Math.sqrt(sum / (to - from));
};

const peakOf = (samples: Float32Array) => samples.reduce((most, value) => Math.max(most, Math.abs(value)), 0);

/** Every pitch any arrangement plays on a string. */
const pitches = [...new Set(Object.values(ARRANGEMENTS).flatMap((a) => Array.from({ length: barsIn(a) }, (_, i) => barOf(a, i)).flat().filter((s) => s.voice === 'pluck').map((s) => s.midi)))];

describe('the plucked string', () => {
  it('is a sound without holes in it, and never too loud', () => {
    for (const rate of [44100, 48000]) {
      const string = pluck(293.66, 1.5, rate);
      expect(string.length).toBe(Math.round(1.5 * rate));
      expect(string.every((value) => Number.isFinite(value))).toBe(true);
      expect(peakOf(string)).toBeLessThanOrEqual(0.9001);
      expect(peakOf(string)).toBeGreaterThan(0.5);
    }
  });

  it('is in tune, at every pitch the tune uses and at both sample rates', () => {
    expect(pitches.length).toBeGreaterThan(12);
    for (const rate of [44100, 48000]) {
      for (const midi of pitches) {
        const wanted = frequencyOf(midi);
        const heard = pitchOf(pluck(wanted, 0.8, rate), rate, wanted);
        // Within a hundredth of a semitone's width six times over: nobody hears that.
        expect(Math.abs(heard / wanted - 1), `midi ${midi} at ${rate} Hz: ${heard.toFixed(2)} for ${wanted.toFixed(2)}`).toBeLessThan(0.004);
      }
    }
  });

  it('rings and dies away, and ends in silence', () => {
    const rate = 48000;
    const string = pluck(440, RING, rate);
    const early = loudness(string, 0, rate * 0.1);
    const later = loudness(string, rate * 0.5, rate * 0.6);
    const last = loudness(string, rate * 1.8, rate * 1.9);
    expect(later).toBeLessThan(early);
    expect(last).toBeLessThan(later);
    // It still rings after half a second: a string, not a click.
    expect(later).toBeGreaterThan(early * 0.1);
    expect(Math.abs(string[string.length - 1]!)).toBeLessThan(0.01);
  });

  it('is the same every time, and duller when asked to be', () => {
    expect(pluck(220, 0.3, 48000)).toEqual(pluck(220, 0.3, 48000));
    // A dull string moves less from one sample to the next.
    const rough = (s: Float32Array) => s.slice(0, 2000).reduce((sum, value, i) => sum + (i ? Math.abs(value - s[i - 1]!) : 0), 0);
    expect(rough(pluck(220, 0.3, 48000, 0.2))).toBeLessThan(rough(pluck(220, 0.3, 48000, 0.9)));
  });
});

describe('Spökets polska', () => {
  // D dorian: D E F G A B C.
  const scale = new Set([2, 4, 5, 7, 9, 11, 0]);

  it('is eight bars of three beats, each filled from its first beat to its last', () => {
    expect(POLSKA).toHaveLength(8);
    expect(BASS).toHaveLength(8);
    for (const [i, bar] of POLSKA.entries()) {
      let at = 0;
      for (const note of bar) {
        expect(note.beat, `bar ${i + 1}`).toBe(at);
        at += note.length;
      }
      expect(at, `bar ${i + 1}`).toBe(BEATS_PER_BAR);
    }
  });

  it('keeps to its scale, and begins and ends on D', () => {
    for (const note of POLSKA.flat()) expect(scale.has(note.midi % 12), `midi ${note.midi}`).toBe(true);
    for (const midi of BASS.flat()) expect(scale.has(midi % 12), `midi ${midi}`).toBe(true);
    expect(POLSKA[0]![0]!.midi % 12).toBe(2);
    expect(POLSKA[7]!.at(-1)!.midi % 12).toBe(2);
  });

  it('moves by small steps: a child can hum it', () => {
    const tune = POLSKA.flat().map((note) => note.midi);
    for (let i = 1; i < tune.length; i++) expect(Math.abs(tune[i]! - tune[i - 1]!), `note ${i}`).toBeLessThanOrEqual(7);
    expect(Math.max(...tune) - Math.min(...tune)).toBeLessThanOrEqual(16);
  });
});

describe('how each place plays it', () => {
  it('every part of the story has its arrangement and its air, and the test course has neither', () => {
    for (const chapter of STORY) {
      const a = arrangementFor(chapter.id, chapter.place);
      expect(a, chapter.id).not.toBeNull();
      expect(AIRS[a!.ambience], chapter.id).toBeDefined();
    }
    expect(arrangementFor(testbana.id, testbana.place)).toBeNull();
    // The epilogue is at home, as the prologue is, and plays it as a slow waltz.
    expect(arrangementFor('epilog', 'home')).toBe(ARRANGEMENTS.epilog);
    expect(arrangementFor('prolog', 'home')).toBe(ARRANGEMENTS.home);
    expect(ARRANGEMENTS.epilog!.tempo).toBeLessThan(ARRANGEMENTS.home!.tempo);
  });

  it('every note begins within its bar, at a pitch a string can play, and never at full level', () => {
    for (const [name, a] of Object.entries(ARRANGEMENTS)) {
      expect(a.tempo, name).toBeGreaterThanOrEqual(60);
      expect(a.tempo, name).toBeLessThanOrEqual(130);
      for (let bar = 0; bar < barsIn(a); bar++) {
        for (const chase of [false, true]) {
          for (const s of barOf(a, bar, chase)) {
            expect(s.at, name).toBeGreaterThanOrEqual(0);
            expect(s.at, name).toBeLessThan(barSeconds(a));
            expect(s.level, name).toBeGreaterThan(0);
            expect(s.level, name).toBeLessThanOrEqual(0.9);
            expect(s.seconds, name).toBeLessThanOrEqual(RING);
            if (s.voice === 'pluck') {
              expect(frequencyOf(s.midi), name).toBeGreaterThan(45);
              expect(frequencyOf(s.midi), name).toBeLessThan(1500);
            }
          }
        }
      }
    }
  });

  it('rests after the tune, and comes round again', () => {
    for (const [name, a] of Object.entries(ARRANGEMENTS)) {
      expect(a.rest, name).toBeGreaterThanOrEqual(1);
      for (let bar = POLSKA.length; bar < barsIn(a); bar++) expect(barOf(a, bar).filter((s) => s.voice === 'pluck'), name).toEqual([]);
      expect(barOf(a, barsIn(a) + 2)).toEqual(barOf(a, 2));
    }
  });

  it('the bones of the tune are fewer notes than the whole of it, and the forest plays them an octave down', () => {
    const forest = ARRANGEMENTS.forest!;
    const garden = ARRANGEMENTS.garden!;
    const strings = (a: typeof forest) => Array.from({ length: 8 }, (_, i) => barOf(a, i)).flat().filter((s) => s.voice === 'pluck');
    expect(strings(forest).length).toBeLessThan(strings(garden).length);
    expect(barOf(forest, 0)[0]!.midi).toBe(barOf(garden, 0)[0]!.midi - 12);
    // The garden is the quickest; the bog is slow.
    expect(garden.tempo).toBeGreaterThan(ARRANGEMENTS.mountain!.tempo);
    expect(ARRANGEMENTS.bog!.tempo).toBeLessThan(forest.tempo);
  });

  it('the wood knocks on the first beat and the third while the ghost is near, and in the final all through', () => {
    const garden = ARRANGEMENTS.garden!;
    const beat = 60 / garden.tempo;
    expect(barOf(garden, 0).some((s) => s.voice === 'knock')).toBe(false);
    const knocks = barOf(garden, 0, true).filter((s) => s.voice === 'knock');
    expect(knocks.map((s) => s.at)).toEqual([0, 2 * beat, 2.5 * beat]);
    // In the rest too: the tune waits, the ghost doesn't.
    expect(barOf(garden, POLSKA.length, true).filter((s) => s.voice === 'knock')).toHaveLength(3);
    expect(barOf(ARRANGEMENTS.dusk!, 3).some((s) => s.voice === 'knock')).toBe(true);
    // At home the knife takes a shaving in every second bar.
    const home = ARRANGEMENTS.home!;
    expect(barOf(home, 1).filter((s) => s.voice === 'scrape')).toHaveLength(1);
    expect(barOf(home, 2).filter((s) => s.voice === 'scrape')).toHaveLength(0);
  });

  it('a whole round, mixed as the game mixes it, never clips', () => {
    // A low rate is enough to add levels up.
    const rate = 12000;
    for (const [name, a] of Object.entries(ARRANGEMENTS)) {
      const mix = new Float32Array(Math.ceil((barsIn(a) * barSeconds(a) + RING) * rate));
      const strings = new Map<number, Float32Array>();
      for (let bar = 0; bar < barsIn(a); bar++) {
        for (const s of barOf(a, bar, true)) {
          if (s.voice !== 'pluck') continue;
          const string = strings.get(s.midi) ?? pluck(frequencyOf(s.midi), RING, rate, a.bright);
          strings.set(s.midi, string);
          const from = Math.round((bar * barSeconds(a) + s.at) * rate);
          const length = Math.round(s.seconds * rate);
          for (let i = 0; i < length; i++) mix[from + i]! += string[i]! * s.level * MUSIC_LEVEL;
        }
      }
      const peak = peakOf(mix);
      expect(peak, name).toBeLessThan(0.7);
      expect(peak, name).toBeGreaterThan(0.1);
    }
  });
});

describe('the air of a place', () => {
  it('is quiet: wind and calls lie far under the effects', () => {
    for (const [name, air] of Object.entries(AIRS)) {
      if (air.wind) {
        expect(air.wind.level, name).toBeLessThanOrEqual(0.08);
        expect(air.wind.swell, name).toBeGreaterThanOrEqual(5);
        expect(air.wind.frequency, name).toBeGreaterThan(100);
      }
      for (const call of air.calls) {
        expect(call.gap[0], name).toBeGreaterThanOrEqual(2);
        expect(call.gap[1], name).toBeGreaterThanOrEqual(call.gap[0]);
        expect(call.tones.length, name).toBeGreaterThan(0);
        for (const tone of call.tones) {
          expect(tone.level, name).toBeLessThanOrEqual(0.04);
          expect(tone.seconds, name).toBeLessThanOrEqual(0.7);
          expect(Math.min(tone.from, tone.to), name).toBeGreaterThan(200);
          expect(Math.max(tone.from, tone.to), name).toBeLessThan(5000);
          // A call is over before it can come again.
          expect(tone.delay + tone.seconds, name).toBeLessThan(call.gap[0]);
        }
      }
    }
  });

  it('has something in it everywhere: a wind or a call', () => {
    for (const [name, air] of Object.entries(AIRS)) expect(air.wind !== null || air.calls.length > 0, name).toBe(true);
  });
});
