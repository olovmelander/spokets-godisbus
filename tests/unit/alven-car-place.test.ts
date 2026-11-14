import { describe, expect, it } from 'vitest';
import { FAMILY_CAR } from '../../src/content/aventyr2/buildings';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { heightAt } from '../robot/robot';

/**
 * The family's car at Älven's end. Olov, 14 November 2026: "I slutet står bilen så att bakluckan hamnar mitt i trädet.
 * Placeringen behöver justeras." A birch the chapter builds stood at x 181, z -18: half an EL inside the car's tail,
 * whose boot is at x 180.5, so that its trunk rose through the boot.
 */
describe('the family\'s car at Älven\'s end', () => {
  const buildings = alven.storm!.buildings!;
  const car = buildings.find((b) => b.kind === 'car')!;
  const long = car.width ?? 29;
  const metre = long / FAMILY_CAR.long;
  const half = FAMILY_CAR.wide * metre;
  const tail = car.x - long / 2;
  const nose = car.x + long / 2;
  const trees = buildings.filter((b) => b.kind === 'birch' || b.kind === 'spruce');
  /** A built tree's trunk at its foot, with its flare, in EL: a birch 60 high is about 1.6 across there. */
  const TRUNK = 1.2;

  it('stands with its boot, its sides and its nose clear of every tree the chapter builds', () => {
    expect(trees.length).toBeGreaterThanOrEqual(3);
    for (const tree of trees) {
      const beside = Math.max(tail - tree.x, tree.x - nose, 0);
      const across = Math.max((car.z - half) - tree.z, tree.z - (car.z + half), 0);
      // Out of the car, and a clear step from it: the whole car is seen, its tail lights too.
      expect(Math.hypot(beside, across), `the ${tree.kind} at ${tree.x}`).toBeGreaterThan(TRUNK + 2);
    }
  });

  it('keeps the forest\'s own trees out from its tail to its nose', () => {
    const gap = alven.treeGaps!.find((g) => g.from <= tail && g.to >= nose);
    expect(gap).toBeDefined();
    // The forest's trunks stand no further back than 22 EL (src/render/dressing/forest.ts): none is left by the car.
    expect(gap!.back).toBeLessThanOrEqual(-22);
    expect(gap!.from).toBeLessThanOrEqual(tail - TRUNK);
  });

  it('stands on the bank, and so does every tree the chapter builds: none in the river or in the stream that joins it', () => {
    const inWater = (x: number, reach: number) => alven.water!.some((pool) => x + reach > pool.from && x - reach < pool.to);
    expect(inWater(tail, 0)).toBe(false);
    expect(inWater(nose, 0)).toBe(false);
    expect(heightAt(alven, tail)).toBe(heightAt(alven, nose));
    // A bank runs back from the path as far as these trees stand; between two banks the water does too.
    for (const tree of trees) expect(inWater(tree.x, TRUNK), `the ${tree.kind} at ${tree.x}`).toBe(false);
  });

  it('has Moa and Bertil wait by its near side, in front of it, and come down from there to the bank', () => {
    const card = alven.scenes!.find((scene) => scene.id === 'card')!;
    for (const who of ['moa', 'bertil'] as const) {
      const at = card.stage!.actors![who]![0]!;
      expect(at.x!).toBeGreaterThan(tail);
      expect(at.x!).toBeLessThan(nose);
      // A giant to him, a child stands about three EL wide: clear of the car's side.
      expect(at.z!, who).toBeGreaterThan(car.z + half + 1.2);
    }
  });
});
