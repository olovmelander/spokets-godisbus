import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { granskog } from '../../src/content/chapters/granskog';
import { ELOF_HALF_WIDTH } from '../../src/sim/constants';
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

  it('shows the actual return root and the heavy cone push side without altering the course', () => {
    const before = JSON.stringify(granskog);
    const root = granskog.returnClue!.root;
    const climb = demoFor(granskog, { at: { x: root.x, y: root.top }, verb: null }, root.bottom);
    expect(climb[0]!.y).toBe(root.bottom);
    expect(climb.some((pose) => pose.x === root.x && pose.y === root.top)).toBe(true);
    expect(climb.at(-1)!.x).toBeLessThan(root.x);
    const heavy = granskog.movers!.find((mover) => mover.id === 'cone')!;
    const home = heavy.stops[0]!;
    const at = { x: home.x - heavy.width / 2 - ELOF_HALF_WIDTH - 0.12, y: home.y };
    const back = demoFor(granskog, { at, verb: null }, home.y);
    expect(back[0]!.x).toBeGreaterThan(home.x + heavy.width / 2);
    expect(back.some((pose) => pose.y > home.y + heavy.height)).toBe(true);
    expect(back.at(-1)!.x).toBe(at.x);
    expect(JSON.stringify(granskog)).toBe(before);
  });

  it('approaches the small cone from its right and demonstrates a leftwards push', () => {
    const keys = demoFor(granskog, { at: { x: 116, y: -7.3 }, verb: 'push' }, -8);
    expect(keys[0]!.x).toBeGreaterThan(116);
    expect(keys[1]!.x).toBeGreaterThan(116);
    expect(keys[2]!.x).toBeLessThan(keys[1]!.x);
  });
});
