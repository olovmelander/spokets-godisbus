import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { LAMP, shopLamps } from '../../src/render/village';

const byn = COURSES['byn']!;

describe("the shop's lamps", () => {
  it('hang over each ring in the room that has its own flex, and nowhere outside the shop', () => {
    const lamps = shopLamps(byn);
    const rings = (byn.hooks ?? []).filter((hook) => hook.hangs !== undefined && hook.x > byn.shop!.door);
    expect(lamps).toEqual(rings.map((ring) => ({ x: ring.x, y: ring.y })));
    expect(lamps.length).toBe(2);
    // The bicycle's lace hangs from its pedal, not a lamp.
    expect(lamps.every((lamp) => lamp.x > byn.shop!.door && lamp.x < byn.shop!.to)).toBe(true);
    expect(shopLamps(COURSES['garden']!)).toEqual([]);
  });

  it('keep the ring free: the shade is over it, and the two shades do not touch', () => {
    const widest = Math.max(...LAMP.shade.map(([r]) => r));
    // The ring is 0.19 round and the lace hangs from it downwards: the shade's rim is well over its top.
    expect(LAMP.rim - LAMP.bulb).toBeGreaterThan(0.19 + 0.5);
    const [a, b] = shopLamps(byn);
    expect(Math.abs(b!.x - a!.x)).toBeGreaterThan(2 * widest + 1);
  });
});
