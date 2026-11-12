import { describe, expect, it } from 'vitest';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { fallenSpruce } from '../../src/render/fallen-spruce';
import { forestLandmarks } from '../../src/render/forest-kit';
import { heightAt } from '../robot/robot';

/**
 * Stormskogen's felled spruces across the path (Olov, 12 November 2026: "De små fällda träden som ligger när man går kan
 * ha bättre texturer och se snyggare ut"): made in code (src/render/fallen-spruce.ts), not the forest kit's log.
 */
describe('the storm\'s felled spruces', () => {
  it('are the landmarks across Stormskogen\'s path, each made in code and never replaced by the kit', () => {
    const scene = forestLandmarks(stormskog);
    const logs = scene.children.filter((holder) => holder.name === 'landmark:log');
    expect(logs).toHaveLength(stormskog.landmarks!.filter((mark) => mark.look === 'log').length);
    for (const holder of logs) {
      expect(holder.children.map((child) => child.name)).toEqual(['fallen-spruce']);
      expect(holder.userData.forest).toBeUndefined();
    }
  });

  for (const mark of stormskog.landmarks!.filter((one) => one.look === 'log')) {
    it(`at ${mark.from}: nothing stands on its top where he walks or reaches up in front of it`, () => {
      const wide = mark.to - mark.from;
      const high = heightAt(stormskog, (mark.from + mark.to) / 2) - mark.base;
      const at = fallenSpruce(wide, high, mark.from).geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
        // Over the block where he walks, nothing over its top along the path.
        if (x > 0.05 && x < wide - 0.05 && Math.abs(z) < 0.3) expect(y, `at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBeLessThan(high + 0.03);
        // In front of the path, nothing higher than its top: his boots are never covered.
        if (z > 0.3) expect(y, `at ${x.toFixed(2)}, ${z.toFixed(2)}`).toBeLessThan(high + 0.02);
        // Its splinters reach a little past the block's ends, never into the next thing along the path.
        expect(x).toBeGreaterThan(-0.7);
        expect(x).toBeLessThan(wide + 0.9);
      }
    });
  }
});
