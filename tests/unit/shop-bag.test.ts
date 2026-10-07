import { Box3 } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { SATURDAY_BAG_TALL } from '../../src/render/saturday-bag';
import { SHOP_BAG, shopBag } from '../../src/render/village';

const byn = COURSES['byn']!;
const floor = byn.shop!.floor;

describe("the shop's bag in the last picture", () => {
  it("is one of the shop's striped paper bags, as his Saturday bag is, taller than he is, on the floor", () => {
    const bag = shopBag(byn, floor);
    // The candy kit puts its striped, pinked bag here (./candy.ts), in place of the boxes that stand in.
    expect(bag.userData.sweet).toEqual({ shape: 'lordagspase', paper: true });
    expect(bag.scale.x * SATURDAY_BAG_TALL).toBeCloseTo(SHOP_BAG.tall, 5);
    expect(SHOP_BAG.tall).toBeGreaterThan(2.5);
    const box = new Box3().setFromObject(bag);
    expect(box.min.y).toBeCloseTo(floor, 2);
    // A little turned, so that its side shows.
    expect(Math.abs(bag.rotation.y)).toBeGreaterThan(0.2);
  });

  it('stands clear of the big candy, behind the path', () => {
    const box = new Box3().setFromObject(shopBag(byn, floor));
    // The big candy is a sweet as tall as he is on the path at goalX: the bag's near side is well past it.
    expect(box.min.x).toBeGreaterThan(byn.goalX + 1);
    expect(box.max.z).toBeLessThan(-1);
  });
});
