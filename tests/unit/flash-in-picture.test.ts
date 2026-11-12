import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { flightAt } from '../../src/content/aventyr2/kit';
import type { ChapterData } from '../../src/sim/types';

/**
 * A line that points at the little one in a flash ("Blixten! Där flyger lillgubben!") is said while he is in the
 * picture. On a phone held sideways the picture is six EL high where it is not widened, with the line's card across
 * its top, so a flight far overhead is never seen (docs/dialogue.md). The numbers below are those that were looked at
 * in the game at 844×390 and 390×844 (tests/browser/review/dialogue-moments.mjs).
 */
const POINTED = [['stormskog', 'ss:flash'], ['olympia', 'ol:top'], ['flarken', 'sjon:flash']] as const;

/** The ground's height at x, read from the chapter's outline. */
function groundAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return line[line.length - 1]!.y;
}

describe('the figures a line points at on Älven', () => {
  const alven = AVENTYR2.find((one) => one.id === 'alven')!;
  const flight = (said: string) => alven.storm!.flybys!.find((one) => one.on === `beat:${said}`)!;

  it('the little one bobs just ahead of the raft, on the near water, when the line is said as he boards', () => {
    const raft = alven.rides!.find((one) => one.id === 'al:raft')!;
    const beat = alven.beats!.find((one) => one.id === 'al:flash')!;
    const little = flight('al:flash');
    expect(little.who).toBe('lillgubbe');
    expect(little.lit?.length).toBeGreaterThan(0);
    // In front of the raft's lane: behind it the far bank's boulders hide him.
    expect(little.z!).toBeGreaterThan(0);
    expect(little.from.x - raft.from.x).toBeGreaterThan(3);
    expect(little.from.x - raft.from.x).toBeLessThan(6.5);
    // The line is said as he boards or not at all: said later, the raft would already be past where he bobs.
    expect(beat.on).toBe('al:raft');
    expect(beat.aside).toBeLessThanOrEqual(little.from.x - raft.from.x);
  });

  it('the old one floats past on the river in front of the bank, from where the line is said', () => {
    const beat = alven.beats!.find((one) => one.id === 'al:old-ahead')!;
    const old = flight('al:old-ahead');
    expect(old.who).toBe('tragubbe');
    expect(old.lit?.length).toBeGreaterThan(0);
    expect(old.z!).toBeGreaterThan(2);
    expect(old.from.x - beat.at!).toBeGreaterThan(0);
    expect(old.from.x - beat.at!).toBeLessThan(3);
    expect(old.to.x).toBeGreaterThan(beat.at! + 10);
  });
});

describe('the flash a line points at', () => {
  for (const [id, said] of POINTED) {
    it(`${id}: the little one flies low past the place where it is said, in his own glow`, () => {
      const chapter = AVENTYR2.find((one) => one.id === id)!;
      const beat = chapter.beats!.find((one) => one.id === said)!;
      const flight = chapter.storm!.flybys!.find((one) => one.on === `beat:${said}`)!;
      expect(flight.who).toBe('lillgubbe');
      // Seen as he is, and flashed on again while he flies: a dark shape in one flash is a glimpse, not a thing to point at.
      expect(flight.lit?.length).toBeGreaterThan(0);
      expect(flight.seconds).toBeGreaterThanOrEqual(3);
      // He comes from behind Elof and is blown on ahead.
      expect(flight.from.x).toBeLessThan(beat.at!);
      expect(flight.to.x).toBeGreaterThan(beat.at! + 10);
      // While the line is new he is no more than three and a half EL over Elof's feet.
      const feet = groundAt(chapter, beat.at!);
      for (let k = 0; k <= 0.5; k += 0.05) {
        expect(flightAt(flight, k).y - feet, `${Math.round(k * 100)} % of the way`).toBeLessThan(3.6);
      }
    });
  }
});

/**
 * Olov, 12 November 2026: "Han ska synas tydligt överallt" (the old one). Where Elof sees him and calls out, he stops,
 * the picture takes in the old one, who stands lit while the line is read, and then leaps or floats away lit, the
 * picture going a little way with him (src/content/aventyr2/kit.ts, `sighting`).
 */
const OLD_SEEN = [['stormgard', 'sg:playhouse'], ['olympia', 'ol:old-one'], ['flarken', 'sjon:old-one'], ['alven', 'al:old-one']] as const;

describe('the old one, where Elof calls out to him', () => {
  for (const [id, said] of OLD_SEEN) {
    it(`${id}: he stands for it, and the old one is lit where he stands and as he goes`, () => {
      const chapter = AVENTYR2.find((one) => one.id === id)!;
      const beat = chapter.beats!.find((one) => one.id === said)!;
      const moment = chapter.scenes!.find((scene) => scene.dialogue?.includes(said))!;
      expect(moment.hold).toBe(true);
      // The line waits for the picture: it needs the moment's cue.
      expect(moment.cues!.map((cue) => cue.flag)).toContain(beat.needs);
      const shots = moment.stage!.shots!;
      expect(shots.length).toBe(2);
      const flight = chapter.storm!.flybys!.find((one) => one.on === `beat:${said}`)!;
      expect(flight.who).toBe('tragubbe');
      expect(flight.lit?.length).toBeGreaterThan(0);
      expect(flight.seconds).toBeGreaterThanOrEqual(3);
      // He is in the first picture on a phone held upright too: `width` is the least it shows across.
      expect(Math.abs(flight.from.x - shots[0]!.x)).toBeLessThan(shots[0]!.width! / 2);
      // And the picture goes with him, the moment lasting as long as his flight.
      expect(shots[1]!.x).toBeGreaterThan(shots[0]!.x);
      expect(moment.seconds).toBeGreaterThanOrEqual(flight.seconds);
      // Where he stood before, he stands lit, and his flight takes over from there.
      for (const stood of chapter.decor!.filter((one) => one.look === 'tragubbe' && one.until === `beat:${said}`)) {
        expect(stood.word).toBe('lit');
        expect(Math.abs(stood.at.x - flight.from.x)).toBeLessThan(0.5);
      }
    });
  }
});
