import { describe, expect, it } from 'vitest';
import { CARVING_PERIOD, CARVING_SHAVING_LIFETIME, carvingAt } from '../../src/render/carving-motion';

describe('Pappa carving', () => {
  it('makes three different outward cuts, with a stable supporting hand and an inspection pause', () => {
    const support = carvingAt(0).left;
    const cuts = new Map<number, { min: number; max: number; pressure: number }>();
    let inspection = 0, previous = carvingAt(0);
    for (let i = 1; i <= 3200; i++) {
      const pose = carvingAt(i / 1000);
      expect(pose.left).toEqual(support);
      expect(pose.lean).toBeGreaterThanOrEqual(.18); expect(pose.lean).toBeLessThan(.24);
      expect(pose.nod).toBeGreaterThan(.4); expect(pose.nod).toBeLessThan(.53);
      expect(Math.hypot(pose.knifeDirection.ahead, pose.knifeDirection.up)).toBeCloseTo(1, 12);
      if (pose.phase === 'cut') {
        expect(pose.clearance).toBe(0);
        const seen = cuts.get(pose.stroke) ?? { min: pose.right.ahead, max: pose.right.ahead, pressure: 0 };
        seen.max = Math.max(seen.max, pose.right.ahead); seen.pressure = Math.max(seen.pressure, pose.cut);
        cuts.set(pose.stroke, seen);
        if (previous.phase === 'cut' && previous.stroke === pose.stroke) {
          expect(pose.right.ahead).toBeGreaterThanOrEqual(previous.right.ahead);
          expect(pose.right.up).toBeLessThanOrEqual(previous.right.up);
        }
        expect(pose.knifeDirection.ahead).toBeGreaterThan(.85);
        expect(pose.knifeDirection.up).toBeLessThan(0);
      } else expect(pose.cut).toBe(0);
      if (pose.phase === 'inspect') inspection += .001;
      previous = pose;
    }
    expect(cuts.size).toBe(3);
    const [first, second, third] = [...cuts.values()];
    expect(second!.max - second!.min).toBeGreaterThan(first!.max - first!.min + .04);
    expect(third!.pressure).toBeLessThan(first!.pressure);
    expect(second!.pressure).toBeGreaterThan(first!.pressure);
    expect(inspection).toBeGreaterThan(.6);
  });

  it('lifts the knife clear before returning, instead of sawing back through the cut', () => {
    let previous = carvingAt(0), end = previous.right;
    const lifted = new Set<number>();
    for (let i = 1; i < 3200; i++) {
      const pose = carvingAt(i / 1000);
      if (previous.phase === 'cut' && pose.phase === 'recover') end = previous.right;
      if (pose.phase === 'recover') {
        expect(pose.cut).toBe(0);
        expect(pose.clearance).toBeGreaterThanOrEqual(0);
        if (pose.right.ahead < end.ahead - .04) {
          // Once it is moving materially backwards, the wrist has risen clear of its cutting height.
          expect(pose.right.up).toBeGreaterThan(end.up + .10);
        }
        if (pose.right.up > carvingAt(0).right.up + .10 && pose.knifeDirection.up > 0) {
          expect(pose.clearance).toBeGreaterThan(.025);
          lifted.add(pose.stroke);
        }
      }
      previous = pose;
    }
    expect([...lifted]).toEqual([0, 1, 2]);
  });

  it('keeps wrist, head and blade direction continuous across phases and the loop seam', () => {
    let previous = carvingAt(0);
    for (let i = 1; i <= 384; i++) {
      const pose = carvingAt(i / 120);
      expect(Math.hypot(pose.right.ahead - previous.right.ahead, pose.right.up - previous.right.up)).toBeLessThan(.05);
      expect(Math.abs(pose.knifeDirection.up - previous.knifeDirection.up)).toBeLessThan(.15);
      expect(Math.abs(pose.lean - previous.lean)).toBeLessThan(.006);
      expect(Math.abs(pose.nod - previous.nod)).toBeLessThan(.006);
      expect(Math.abs(pose.clearance - previous.clearance)).toBeLessThan(.02);
      previous = pose;
    }
    const before = carvingAt(CARVING_PERIOD - 1e-6), after = carvingAt(CARVING_PERIOD + 1e-6);
    expect(before.right).toEqual(after.right);
    expect(before.knifeDirection).toEqual(after.knifeDirection);
    expect(before.lean).toBe(after.lean); expect(before.nod).toBe(after.nod);
    expect(before.clearance).toBe(0); expect(after.clearance).toBe(0);
  });

  it('emits only during real cuts and keeps each shaving origin fixed after its birth', () => {
    const births = new Map<number, number>();
    for (let i = 0; i < 960; i++) {
      const time = i / 100, pose = carvingAt(time);
      for (const shaving of pose.shavings) {
        const atBirth = carvingAt(shaving.born);
        expect(atBirth.phase).toBe('cut'); expect(atBirth.cut).toBeGreaterThan(.6);
        expect(atBirth.clearance).toBe(0);
        expect(shaving.right.ahead).toBeCloseTo(atBirth.right.ahead, 12);
        expect(shaving.right.up).toBeCloseTo(atBirth.right.up, 12);
        expect(shaving.age).toBeGreaterThanOrEqual(0); expect(shaving.age).toBeLessThan(CARVING_SHAVING_LIFETIME);
        expect(shaving.born + shaving.age).toBeCloseTo(time, 12);
        if (births.has(shaving.id)) expect(shaving.born).toBe(births.get(shaving.id));
        births.set(shaving.id, shaving.born);
      }
    }
    expect([...births.keys()]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(carvingAt(2.7).shavings).toEqual([]);
  });

  it('is deterministic when paused or seeking and holds one clear pose with reduced motion', () => {
    const held = carvingAt(1.08), calm = carvingAt(0, true);
    for (const time of [5, .4, 30, 0, 600]) {
      carvingAt(time);
      expect(carvingAt(1.08)).toEqual(held);
      expect(carvingAt(time, true)).toEqual(calm);
    }
    expect(calm.phase).toBe('inspect'); expect(calm.cut).toBe(0); expect(calm.shavings).toEqual([]);
    expect(calm.clearance).toBe(.1);
    expect(calm.knifeDirection.up).toBeGreaterThan(0);
    expect(carvingAt(-1)).toEqual(carvingAt(0));
    expect(carvingAt(Infinity)).toEqual(carvingAt(0));
    for (const time of [.2, 1.3, 1.9, 2.7]) {
      const { shavings: _first, ...first } = carvingAt(time);
      const { shavings: _later, ...later } = carvingAt(time + CARVING_PERIOD * 1000);
      expect(later.phase).toBe(first.phase); expect(later.stroke).toBe(first.stroke);
      expect(later.right.ahead).toBeCloseTo(first.right.ahead, 9); expect(later.right.up).toBeCloseTo(first.right.up, 9);
    }
  });
});
