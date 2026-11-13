import { Group, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createBagReturn } from '../../src/render/norrsken-bag';

const ghost = { x: 19.4, t: 1 };

describe("Norrskenet: the ghost gives the bag back (Olov, 13 November 2026)", () => {
  it('keeps it while the trägubbe is in the crack, and holds it out only as he comes near', () => {
    const bag = createBagReturn();
    expect(bag.update(new Set(['lower', 'haul']), 18, ghost, .1, false)).toBe(0);
    const out = new Set(['lower', 'haul', 'placed:tragubbe', 'scene:uppdragen']);
    // Far off, at the crack: still in its hands.
    expect(bag.update(out, 11, ghost, .1, false)).toBe(0);
    // Hopping ahead to its place: not yet.
    expect(bag.update(out, 16, { x: 17, t: .5 }, .1, false)).toBe(0);
    // Near: held out and set down before him over a moment, not at once.
    const steps = [16, 16.2, 16.4, 16.6, 16.8, 17, 17.2, 17.4].map((x) => bag.update(out, x, ghost, .1, false));
    expect(steps[0]).toBeGreaterThan(0);
    expect(steps[0]).toBeLessThan(.5);
    for (let i = 1; i < steps.length; i++) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]!);
    expect(steps.at(-1)).toBe(1);
    // Taken: it stays given.
    expect(bag.update(new Set([...out, 'bag']), 11, ghost, .1, false)).toBe(1);
  });

  it('finds it set down in a game taken up beside the ghost, and with reduced motion', () => {
    const out = new Set(['placed:tragubbe', 'scene:uppdragen']);
    expect(createBagReturn().update(out, 17.8, ghost, 0, false)).toBe(1);
    const calm = createBagReturn();
    calm.update(out, 11, ghost, .1, true);
    expect(calm.update(out, 16, ghost, .1, true)).toBe(1);
  });

  it('carries it from the ghost to where it is taken, with a lift as it is held out', () => {
    const holder = new Group(), carried = new Group();
    holder.position.set(19.4, 0, -.6);
    const down = new Vector3(18.8, 0, .25);
    const bag = createBagReturn();
    carried.position.set(-.48, .18, -.05);
    bag.hand(carried, holder, down, .5);
    const halfway = carried.position.clone().add(holder.position);
    expect(halfway.x).toBeLessThan(19.4 - .48 + 1e-6);
    expect(halfway.x).toBeGreaterThan(18.8);
    expect(halfway.y).toBeGreaterThan(.18);
    carried.position.set(-.48, .18, -.05);
    bag.hand(carried, holder, down, .999);
    expect(carried.position.clone().add(holder.position).distanceTo(down)).toBeLessThan(.02);
  });
});
