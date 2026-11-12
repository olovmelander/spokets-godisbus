import { Box3, Mesh, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { barnChimney, CHIMNEY } from '../../src/content/aventyr2/barn-chimney';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { GUST_SHELTER } from '../../src/sim/constants';
import { stubCanvas } from './canvas-stub';

beforeEach(() => stubCanvas());
afterEach(() => vi.unstubAllGlobals());

/**
 * The lee on Billsta's barn roof (Olov, 12 November 2026: "där det blåser på ladugårdstaket så kan skorstenarna göras
 * snyggare"): a row of old brick ventilation chimneys, each with its corbelled top and an iron cap over its opening.
 */
describe('the chimneys on Billsta’s barn roof', () => {
  const roof = billsta.gusts![0]!;

  it('stand on the roof behind the path, one at each lee, as wide as the shelter he hides in and taller than he is', () => {
    expect(billsta.storm!.shelters).toEqual(['vents', 'rocks']);
    for (const [i, x] of roof.shelters.entries()) {
      const chimney = barnChimney(x, roof.y, i);
      chimney.updateMatrixWorld(true);
      const box = new Box3().setFromObject(chimney), size = box.getSize(new Vector3());
      expect(box.min.y).toBeCloseTo(roof.y, 5);
      expect(box.getCenter(new Vector3()).x).toBeCloseTo(x, 5);
      // Behind the path: he passes in front of it.
      expect(box.max.z).toBeLessThan(-0.3);
      // About as wide as the lee it gives, never so wide that he looks sheltered where he is not.
      expect(size.x).toBeGreaterThan(CHIMNEY.wide);
      expect(size.x).toBeLessThan(2 * GUST_SHELTER + 0.2);
      expect(size.y).toBeGreaterThan(2.2);
      expect(size.y).toBeLessThan(3.4);
    }
  });

  it('are brick with a cap on legs, the sky seen between them, and not all alike', () => {
    const heights = new Set<number>();
    for (let i = 0; i < 4; i++) {
      const chimney = barnChimney(0, 0, i);
      const [stack, iron] = chimney.children as Mesh[];
      const top = new Box3().setFromObject(stack!).max.y;
      const cap = new Box3().setFromObject(iron!).max.y;
      // The cap stands over the stack's top on its legs.
      expect(cap - top).toBeGreaterThan(CHIMNEY.legs);
      heights.add(Math.round(top * 100));
    }
    expect(heights.size).toBeGreaterThan(1);
  });
});
