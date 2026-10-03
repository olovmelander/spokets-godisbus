import { describe, expect, it } from 'vitest';
import { cuesFor, footingAt, newCueMemory, STREAK_GAP, STRIDE, VOICES, type Heard } from '../../src/audio/cues';
import { berget } from '../../src/content/chapters/berget';
import { prolog } from '../../src/content/chapters/ends';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { myren } from '../../src/content/chapters/myren';
import { testbana } from '../../src/content/chapters/testbana';

const still: Heard = {
  time: 0, mode: 'free', grounded: true, x: 0, y: 0, vx: 0, vy: 0, candy: 0, checkpoint: -1, bubbles: 0, atGoal: false,
  moving: 0, shadows: [], drips: [],
};
const kinds = (before: Heard, now: Heard, memory = newCueMemory()) => cuesFor(before, now, memory).map((cue) => cue.kind);

describe('what a moment of play sounds like', () => {
  it('is silent when nothing happens', () => {
    expect(kinds(still, { ...still, time: 0.016 })).toEqual([]);
  });

  it('a jump, and a landing that is louder the harder it is', () => {
    expect(kinds(still, { ...still, grounded: false, vy: 7 })).toEqual(['jump']);
    const soft = cuesFor({ ...still, grounded: false, vy: -2 }, still, newCueMemory());
    const hard = cuesFor({ ...still, grounded: false, vy: -12 }, still, newCueMemory());
    expect(soft).toEqual([{ kind: 'land', hard: 0.2 }]);
    expect(hard).toEqual([{ kind: 'land', hard: 1 }]);
  });

  it('a stone that rings sounds its own note, and a gust is heard when it begins', () => {
    expect(cuesFor({ ...still, notes: 2 }, { ...still, notes: 3 }, newCueMemory())).toEqual([{ kind: 'note', step: 2 }]);
    expect(kinds(still, { ...still, wind: true })).toEqual(['gust']);
    expect(kinds({ ...still, wind: true }, { ...still, wind: true })).toEqual([]);
  });

  it('walking off an edge is no jump', () => {
    expect(kinds(still, { ...still, grounded: false, vy: -0.3 })).toEqual([]);
  });

  it('a step for every stride he covers, left and right in turn', () => {
    const memory = newCueMemory();
    const steps: boolean[] = [];
    let before = still;
    for (let i = 1; i <= 120; i++) {
      const now = { ...still, time: i / 60, vx: 3.5, x: (3.5 * i) / 60 };
      for (const cue of cuesFor(before, now, memory)) if (cue.kind === 'step') steps.push(cue.left);
      before = now;
    }
    // Two seconds at a run is 7 EL.
    expect(steps.length).toBe(Math.floor(7 / STRIDE));
    expect(steps.slice(0, 4)).toEqual([false, true, false, true]);
  });

  it('his steps and his landings sound of what he walks on', () => {
    // Gården: the deck, the dry earth under it, the lawn, the boulder, Pappa's shavings.
    expect([0, 50, 90, 103, 140].map((x) => footingAt(garden, x))).toEqual(['plank', 'gravel', 'grass', 'stone', 'shavings']);
    expect(footingAt(granskog, 20)).toBe('moss');
    // Myren: sphagnum, and the boardwalk across it.
    expect([10, 110].map((x) => footingAt(myren, x))).toEqual(['squelch', 'plank']);
    expect(footingAt(berget, 20)).toBe('stone');
    expect(footingAt(prolog, 5)).toBe('plank');
    // The test course is no place: a plain step.
    expect(footingAt(testbana, 5)).toBeUndefined();

    const memory = newCueMemory();
    const onDeck = { ...still, footing: 'plank' as const };
    const cues = cuesFor(onDeck, { ...onDeck, time: 1, vx: 3.5, x: 3.5 }, memory);
    expect(cues).toEqual([{ kind: 'step', left: false, on: 'plank' }]);
    const landed = cuesFor({ ...onDeck, grounded: false, vy: -5 }, onDeck, newCueMemory());
    expect(landed).toEqual([{ kind: 'land', hard: 0.5, on: 'plank' }]);
    // Without a footing the cue says nothing of it.
    expect(cuesFor({ ...still, grounded: false, vy: -5 }, still, newCueMemory())).toEqual([{ kind: 'land', hard: 0.5 }]);
  });

  it('each one has a wordless sound of their own, heard when a line of theirs comes up', () => {
    const before = { ...still, said: ['mamma'] as const };
    expect(cuesFor(before, { ...before, said: ['mamma', 'elof', 'pappa'] }, newCueMemory())).toEqual([
      { kind: 'say', who: 'elof' },
      { kind: 'say', who: 'pappa' },
    ]);
    // What was said before is not said again.
    expect(cuesFor(before, before, newCueMemory())).toEqual([]);
    for (const [who, voice] of Object.entries(VOICES)) {
      // A few syllables, over in under a second: a sound, not a sentence.
      expect(voice.steps.length, who).toBeGreaterThanOrEqual(2);
      expect(voice.steps.length, who).toBeLessThanOrEqual(5);
      expect(voice.steps.length * voice.pace, who).toBeLessThan(0.8);
      expect(voice.pitch, who).toBeGreaterThan(120);
      expect(voice.pitch, who).toBeLessThan(700);
    }
    // Pappa is the lowest, the children are higher than their parents, and the ghost has no voice: it knocks.
    expect(VOICES.pappa.pitch).toBeLessThan(VOICES.mamma.pitch);
    for (const child of ['elof', 'moa', 'bertil'] as const) expect(VOICES[child].pitch, child).toBeGreaterThan(VOICES.mamma.pitch);
    expect(VOICES.spoket.wave).toBe('wood');
    expect(Object.values(VOICES).filter((voice) => voice.wave === 'wood')).toHaveLength(1);
  });

  it('the ghost knocks as it hops on, louder the nearer it is, and the helper knocks twice', () => {
    const near = cuesFor({ ...still, ghostPerch: 1, ghostAway: 3 }, { ...still, ghostPerch: 2, ghostAway: 3.5 }, newCueMemory());
    expect(near).toEqual([{ kind: 'ghostHop', near: 0.75 }]);
    const far = cuesFor({ ...still, ghostPerch: 1 }, { ...still, ghostPerch: 2, ghostAway: 30 }, newCueMemory());
    expect(far).toEqual([{ kind: 'ghostHop', near: 0 }]);
    expect(kinds({ ...still, helpStep: 1 }, { ...still, helpStep: 2 })).toEqual(['knocks']);
    // It knocks when it arrives, not all the while it waits.
    expect(kinds({ ...still, helpStep: 2 }, { ...still, helpStep: 3 })).toEqual([]);
  });

  it('candy collected in a row steps up, and starts again after a pause', () => {
    const memory = newCueMemory();
    const first = cuesFor(still, { ...still, time: 1, candy: 1 }, memory);
    const second = cuesFor({ ...still, time: 1, candy: 1 }, { ...still, time: 1.5, candy: 2 }, memory);
    const two = cuesFor({ ...still, time: 1.5, candy: 2 }, { ...still, time: 1.6, candy: 4 }, memory);
    const later = cuesFor({ ...still, time: 1.6, candy: 4 }, { ...still, time: 1.6 + STREAK_GAP + 0.5, candy: 5 }, memory);
    expect(first).toEqual([{ kind: 'candy', streak: 0 }]);
    expect(second).toEqual([{ kind: 'candy', streak: 1 }]);
    expect(two).toEqual([{ kind: 'candy', streak: 2 }, { kind: 'candy', streak: 3 }]);
    expect(later).toEqual([{ kind: 'candy', streak: 0 }]);
  });

  it('a big candy, and the end of the course', () => {
    expect(kinds(still, { ...still, checkpoint: 0 })).toEqual(['bigCandy']);
    expect(kinds(still, { ...still, atGoal: true })).toEqual(['goal']);
  });

  it('each thing he starts doing has its own sound', () => {
    expect(kinds(still, { ...still, mode: 'bubble', grounded: false })).toEqual(['bubble']);
    expect(kinds(still, { ...still, mode: 'swing', grounded: false })).toEqual(['lace']);
    expect(kinds(still, { ...still, mode: 'ledge', grounded: false })).toEqual(['haul']);
    expect(kinds(still, { ...still, mode: 'climb', grounded: false })).toEqual(['grab']);
    expect(kinds(still, { ...still, mode: 'slide', grounded: false })).toEqual(['slide']);
    expect(kinds(still, { ...still, mode: 'down', grounded: false })).toEqual(['knocked']);
    expect(kinds({ ...still, mode: 'swing', grounded: false }, { ...still, grounded: false, vy: 4 })).toEqual(['letGo']);
    expect(kinds({ ...still, mode: 'swing', grounded: false }, { ...still, mode: 'fly', grounded: false })).toEqual(['letGo']);
    expect(kinds(still, { ...still, mode: 'fly', grounded: false })).toEqual(['jump']);
  });

  it('a drop landing nearby splashes, louder the nearer it is; far off it is not heard', () => {
    const before = { ...still, shadows: [0.98, 0.98], drips: [{ x: 3, y: 0 }, { x: 40, y: 0 }] };
    const now = { ...before, shadows: [0, 0] };
    const cues = cuesFor(before, now, newCueMemory());
    expect(cues).toEqual([{ kind: 'splash', near: 0.75 }]);
  });

  it('a thing on a rail knocks when it sets off', () => {
    expect(kinds(still, { ...still, moving: 1 })).toEqual(['wood']);
    expect(kinds({ ...still, moving: 1 }, { ...still, moving: 1 })).toEqual([]);
  });
});
