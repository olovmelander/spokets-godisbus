import { describe, expect, it } from 'vitest';
import { facingBetween, turnFamily } from '../../src/render/family-turning';

describe('family turns while helping', () => {
  it.each([['Mamma lifting the pine', .9], ['Pappa holding the seesaw', -.95], ['Moa reaching into the root hole', -.5]] as const)(
    'holds a partial %s turn exactly through speech and Pause redraws', (_name, direction) => {
      const target = facingBetween(.2, direction, .5);
      let yaw = turnFamily(.2, target, 1 / 60, false);
      const held = yaw;
      for (let frame = 0; frame < 600; frame++) {
        yaw = turnFamily(yaw, target, 0, false);
        expect(yaw).toBe(held);
      }
      expect(turnFamily(yaw, target, 0, true)).toBe(held);
      const resumed = turnFamily(yaw, target, 1 / 60, false);
      expect(Math.abs(resumed - target)).toBeLessThan(Math.abs(held - target));
      expect(Math.abs(resumed - held)).toBeLessThan(.05);
    },
  );

  it('turns by elapsed event time, with the same result at different frame rates', () => {
    const target = facingBetween(-.3, .9, .5);
    const results = [30, 60, 120].map(fps => {
      let yaw = -.3;
      for (let frame = 0; frame < fps; frame++) yaw = turnFamily(yaw, target, 1 / fps, false);
      return yaw;
    });
    for (const yaw of results) {
      expect(yaw).toBeCloseTo(results[0]!, 12);
      expect(yaw).toBeGreaterThan(.28);
      expect(yaw).toBeLessThan(target);
    }
  });

  it('keeps approaching, kneeling and standing again identical with extra held renders', () => {
    const follow = (extraRedraws: number) => {
      let yaw = .2, hold = 0, pace = 1;
      const trace: number[] = [];
      for (let step = 0; step < 180; step++) {
        const dt = 1 / 60;
        pace += (0 - pace) * -Math.expm1(-8 * dt);
        hold += ((step < 90 ? 1 : 0) - hold) * -Math.expm1(-4 * dt);
        const walking = facingBetween(.2, 1.1, pace);
        const target = facingBetween(walking, -.95, hold);
        yaw = turnFamily(yaw, target, dt, false);
        for (let redraw = 0; redraw < extraRedraws; redraw++) yaw = turnFamily(yaw, target, 0, false);
        trace.push(yaw);
      }
      return trace;
    };
    const once = follow(0);
    expect(follow(4)).toEqual(once);
    expect(follow(20)).toEqual(once);
    for (let i = 1; i < once.length; i++) expect(Math.abs(once[i]! - once[i - 1]!)).toBeLessThan(.07);
    expect(Math.min(...once)).toBeLessThan(-.7);
    expect(once.at(-1)).toBeGreaterThan(.1);
  });

  it('takes the short arc through a reversal and holds the authored direction with reduced motion', () => {
    const target = facingBetween(3.1, -3.1, .5);
    expect(target).toBeCloseTo(Math.PI, 10);
    const turning = turnFamily(3.1, target, 1 / 60, false);
    expect(turning).toBeGreaterThan(3.1);
    expect(turning).toBeLessThan(target);
    expect(turnFamily(.2, -.95, 1 / 60, true)).toBeCloseTo(-.95, 10);
  });
});
