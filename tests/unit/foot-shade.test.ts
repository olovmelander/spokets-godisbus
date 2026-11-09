import { describe, expect, it } from 'vitest';
import { byn } from '../../src/content/chapters/byn';
import { lookForest } from '../../src/content/chapters/look';
import { SHOP_ROOM, STREET_DEPTH, footShade } from '../../src/render/village';

describe('the shade on the street where the houses stand', () => {
  const shade = footShade(byn)!;
  // A near house's stone foot stands 0.35 out from its wall.
  const foot = STREET_DEPTH.near + 0.35;

  it("darkens the street along a near house's foot, fading over two or three EL", () => {
    // The bakery's front, between its downpipe and its sign.
    expect(shade(70, foot + 0.02)).toBeLessThan(0.65);
    expect(shade(70, foot + 0.5)).toBeGreaterThan(shade(70, foot + 0.02));
    expect(shade(70, foot + 4)).toBeGreaterThan(0.95);
  });

  it('leaves the crossing alone, where no near house stands, and the door step has a foot of its own', () => {
    expect(shade(40, foot + 0.02)).toBeGreaterThan(0.98);
    // The bakery's door at 96 to 102: its granite step comes 3 out from the wall.
    expect(shade(99, STREET_DEPTH.near + 3 + 0.02)).toBeLessThan(0.65);
  });

  it("darkens the shop's floor under its low shelf, and not the floor he walks on", () => {
    const door = byn.shop!.door;
    expect(shade(door + 20, SHOP_ROOM.shelves.front - 1)).toBeLessThan(0.7);
    expect(shade(door + 20, -0.5)).toBeGreaterThan(0.97);
  });

  it('is nothing where no house stands', () => {
    expect(footShade(lookForest)).toBeNull();
  });
});
