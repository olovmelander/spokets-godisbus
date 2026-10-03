import { describe, expect, it } from 'vitest';
import { cuesFor, newCueMemory, STREAK_GAP, STRIDE, type Heard } from '../../src/audio/cues';

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
