import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { DEMO_SECONDS, demoFloor, demoFor, sampleDemo } from '../../src/render/helper-demo';

describe('the visual hint demonstration', () => {
  it('shows a complete gully swing using the actual hook and safe landing, without editing chapter data', () => {
    const before = JSON.stringify(garden);
    const hook = garden.hooks![1]!;
    const keys = demoFor(garden, { at: hook, verb: 'lace' }, 0);
    const attached = keys.filter((p) => p.rope);
    expect(attached.length).toBeGreaterThan(2);
    for (const pose of attached) expect(Math.hypot(pose.x - hook.x, pose.y + 0.5 - hook.y)).toBeCloseTo(hook.length);
    expect(sampleDemo(keys, DEMO_SECONDS)).toMatchObject({ ...hook.land, reach: 0, rope: null });
    expect(sampleDemo(keys, DEMO_SECONDS * 8)).toEqual(sampleDemo(keys, DEMO_SECONDS));
    for (let t = 0; t <= DEMO_SECONDS; t += 0.05) {
      const pose = sampleDemo(keys, t);
      expect(pose.y).toBeGreaterThanOrEqual(demoFloor(garden, pose.x) - 0.01);
    }
    expect(JSON.stringify(garden)).toBe(before);
  });

  it('shows opposed push and pull motions, not a stationary marker', () => {
    const push = demoFor(garden, { at: { x: 137.6, y: 3.7 }, verb: 'push' }, 3.3);
    const pull = demoFor(garden, { at: { x: 134.2, y: 3.6 }, verb: 'pull' }, 0);
    expect(push[2]!.x).toBeGreaterThan(push[1]!.x);
    expect(pull[2]!.x).toBeLessThan(pull[1]!.x);
    expect(pull[2]!.rope).toEqual({ x: 134.2, y: 3.6 });
    expect(sampleDemo(pull, DEMO_SECONDS / 2).rope).toEqual({ x: 134.2, y: 3.6 });
  });

  it('bends to turn the ladybird and raises the hands before standing back', () => {
    const keys = demoFor(garden, { at: { x: 41, y: 6 }, verb: 'turn' }, 6);
    expect(keys[2]!.lean).toBeLessThan(-0.4);
    expect(keys[3]!.reach).toBe(1);
    expect(keys[4]!.x).toBeLessThan(keys[3]!.x);
    expect(keys.every((p) => p.y === 6)).toBe(true);
  });
});
