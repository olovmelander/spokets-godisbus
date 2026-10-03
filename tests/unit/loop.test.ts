import { describe, expect, it } from 'vitest';
import { FixedLoop } from '../../src/core/loop';
import { PressQueue } from '../../src/input/press-queue';

const STEP = 1 / 120;

function stepsInOneSecond(fps: number): number {
  const loop = new FixedLoop(STEP, 8);
  let steps = 0;
  for (let frame = 0; frame < fps; frame++) steps += loop.advance(1 / fps, () => {});
  return steps;
}

describe('the fixed-step loop', () => {
  it('runs 120 steps a second at any frame rate', () => {
    for (const fps of [30, 60, 120, 144]) {
      expect(Math.abs(stepsInOneSecond(fps) - 120), `${fps} Hz`).toBeLessThanOrEqual(1);
    }
  });

  it('runs no step in some frames at 144 Hz, and four in each frame at 30 Hz', () => {
    const fast = new FixedLoop(STEP, 8);
    const counts = Array.from({ length: 144 }, () => fast.advance(1 / 144, () => {}));
    expect(counts).toContain(0);
    expect(Math.max(...counts)).toBe(1);

    const slow = new FixedLoop(STEP, 8);
    expect(slow.advance(1 / 30, () => {})).toBe(4);
  });

  it('marks only the first step of a frame as first', () => {
    const loop = new FixedLoop(STEP, 8);
    const firsts: boolean[] = [];
    loop.advance(1 / 30, (first) => firsts.push(first));
    expect(firsts).toEqual([true, false, false, false]);
  });

  it('caps a long frame and drops the rest, so the next frame is normal again', () => {
    const loop = new FixedLoop(STEP, 8);
    expect(loop.advance(2, () => {})).toBe(8);
    expect(loop.advance(1 / 60, () => {})).toBe(2);
  });

  it('keeps alpha between 0 and 1, and forgets the time away on reset', () => {
    const loop = new FixedLoop(STEP, 8);
    loop.advance(STEP * 1.5, () => {});
    expect(loop.alpha).toBeCloseTo(0.5, 5);
    loop.reset();
    expect(loop.alpha).toBe(0);
    expect(loop.advance(STEP * 0.5, () => {})).toBe(0);
  });
});

describe('the press queue', () => {
  it('holds a press until it is taken, and gives it out once', () => {
    const queue = new PressQueue();
    queue.push({ hop: true, act: false, helper: false });
    queue.push({ hop: false, act: false, helper: false });
    expect(queue.take()).toEqual({ hop: true, act: false, helper: false });
    expect(queue.take()).toEqual({ hop: false, act: false, helper: false });
  });

  it('forgets presses when cleared', () => {
    const queue = new PressQueue();
    queue.push({ hop: true, act: true, helper: true });
    queue.clear();
    expect(queue.take()).toEqual({ hop: false, act: false, helper: false });
  });
});
