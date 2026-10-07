import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { byn } from '../../src/content/chapters/byn';
import { AWNING, STREET_DEPTH, assemble, awningTips, type VillageKit } from '../../src/render/village';
import { JUMP_APEX } from '../../src/sim/constants';
import type { ChapterData } from '../../src/sim/types';

/** The bakery: the house the awnings hang on. */
const bakery = byn.street!.findIndex((part) => part.awnings !== undefined);

/** A part of a kit as one flat piece facing the street, from x0 to x1 and y0 to y1, giving off `glow`. */
function piece(x0: number, x1: number, y0: number, y1: number, glow = 0) {
  return {
    position: new Float32Array([x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0]),
    normal: new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]),
    colour: new Float32Array(12).fill(1),
    whose: new Float32Array(4),
    glow: new Float32Array(4).fill(glow),
    index: [0, 1, 2, 0, 2, 3],
  };
}

/** The corners of a stretch of the street, put together from a kit. */
function corners(kit: VillageKit, chapter: ChapterData = byn) {
  const geometry = assemble(kit, chapter, chapter.street!, [bakery]);
  const position = geometry.getAttribute('position');
  const colour = geometry.getAttribute('color');
  const glow = geometry.getAttribute('uv');
  return Array.from({ length: position.count }, (_, i) => ({
    x: position.getX(i), y: position.getY(i), z: position.getZ(i),
    colour: [colour.getX(i), colour.getY(i), colour.getZ(i)] as const, glow: glow.getX(i),
  }));
}

/** Byn as if its bakery had no awnings. */
const bare: ChapterData = { ...byn, street: byn.street!.map((part) => ({ ...part, awnings: undefined })) };

describe('the awnings of the village', () => {
  it('hangs only on a near wall, inside its house, one beside the other', () => {
    for (const chapter of Object.values(COURSES)) {
      for (const part of chapter.street ?? []) {
        if (!part.awnings) continue;
        expect(part.depth, `${chapter.id}: the house from ${part.from}`).toBe('near');
        for (const [i, awning] of part.awnings.entries()) {
          expect(awning.from).toBeGreaterThanOrEqual(part.from);
          expect(awning.to).toBeLessThanOrEqual(part.to);
          if (i > 0) expect(awning.from).toBeGreaterThan(part.awnings[i - 1]!.to);
        }
      }
    }
  });

  it('lets every drop in Byn fall from the tip of a scallop, high over his highest jump', () => {
    const tips = awningTips(byn);
    for (const drip of byn.drips!) {
      const tip = tips.find((one) => Math.abs(one.x - drip.at.x) < 0.3);
      expect(tip, `the drip at ${drip.at.x}`).toBeDefined();
      // He is one length tall: the top of his head at his highest jump is still two lengths under the tip.
      expect(tip!.y - (drip.at.y + JUMP_APEX + 1)).toBeGreaterThan(2);
    }
  });

  it('keeps the green and the pale stripe away from the candy and the hook\'s red', () => {
    for (const colour of AWNING.colours) {
      const [r, g, b] = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16)) as [number, number, number];
      expect(r > 110 && r > g * 1.8 && r > b * 1.8, colour).toBe(false);
    }
  });

  it('is built into its house: over the path but never in front of the line he walks on', () => {
    // An empty kit: what is left of the bakery is its awnings, and the granite of its step.
    const awnings = corners(new Map()).filter((corner) => corner.z > STREET_DEPTH.near && corner.y > 3);
    expect(awnings.length).toBeGreaterThan(100);
    expect(Math.max(...awnings.map((corner) => corner.z))).toBeLessThan(0);
    // Under its scallops' tips there is only the crank's rod, which hangs down the wall.
    const tip = awningTips(byn)[0]!.y;
    const below = awnings.filter((corner) => corner.y < tip - 1e-3);
    expect(below.length).toBeGreaterThan(0);
    for (const corner of below) expect(corner.z).toBeLessThan(STREET_DEPTH.near + 0.6);
    expect(Math.min(...below.map((corner) => corner.y))).toBeGreaterThan(3);
  });

  it('shades the wall under it, coolly, and leaves the light of a shop window alone', () => {
    const kit: VillageKit = new Map([
      ['panel', piece(0, 1.35, 1.95, 12)],
      // The window's frame, and its glass that gives off light.
      ['fonster-bread', { ...piece(-3.6, 3.6, 1.95, 12) }],
    ]);
    const glass = new Map(kit).set('fonster-bread', piece(-2.6, 2.6, 2.6, 12, 0.45));
    const shaded = corners(kit), plain = corners(kit, bare);
    // The frame of the window under the first awning, high up: darker, and the more so in red than in blue.
    const high = (list: typeof shaded) => list.find((corner) => Math.abs(corner.x - 84.5) < 0.01 && corner.y > 11.9 && Math.abs(corner.z - STREET_DEPTH.near) < 0.01)!;
    const [r, , b] = high(shaded).colour;
    const [r0, , b0] = high(plain).colour;
    expect(r).toBeLessThan(r0 * 0.7);
    expect(b / b0).toBeGreaterThan(r / r0);
    // Lower down the shade is lighter.
    const low = (list: typeof shaded) => list.find((corner) => Math.abs(corner.x - 84.5) < 0.01 && corner.y < 2 && Math.abs(corner.z - STREET_DEPTH.near) < 0.01)!;
    expect(low(shaded).colour[0]).toBeGreaterThan(r);
    // The glass keeps its light.
    const lit = corners(glass).filter((corner) => corner.glow > 0);
    expect(lit.length).toBeGreaterThan(0);
    for (const corner of lit) expect(corner.colour).toEqual([1, 1, 1]);
    // A wall far from any awning is as it was.
    const far = (list: typeof shaded) => list.find((corner) => corner.x < 70 && corner.y > 11.9)!;
    expect(far(shaded).colour).toEqual(far(plain).colour);
  });

  it('leaves a rod hanging in the first awning\'s crank, out from the wall beside the big candy', () => {
    const rod = byn.street![bakery]!.awnings![0]!.from + AWNING.crank.in;
    const checkpoints = byn.checkpoints!.map((at) => at.x);
    for (const x of checkpoints) expect(Math.abs(x - rod)).toBeGreaterThanOrEqual(1.5);
  });
});
