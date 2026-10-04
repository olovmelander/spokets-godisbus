import { describe, expect, it } from 'vitest';
import { DataUtils, HalfFloatType, LinearFilter } from 'three';
import { createGradeLut, GARDEN_MORNING, gradeColour, LUT_RANGE, LUT_SIZE } from '../../src/render/grade';
import { PLACES } from '../../src/render/dressing';

/** Sample the stored half-float lattice with the trilinear interpolation used by WebGL 2. */
function sample(data: Uint16Array, rgb: number[], offset: number) {
  const scale = Math.max(1, ...rgb.map((v) => v / LUT_RANGE));
  const at = rgb.map((v) => v / scale / LUT_RANGE * (LUT_SIZE - 1));
  const result = [0, 0, 0];
  for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
    const cube = [dx, dy, dz];
    const coordinate = at.map((v, i) => Math.min(LUT_SIZE - 1, Math.floor(v) + cube[i]!));
    const weight = at.reduce((w, v, i) => w * (cube[i] ? v % 1 : 1 - v % 1), 1);
    const index = (coordinate[2]! * LUT_SIZE ** 2 + coordinate[1]! * LUT_SIZE + coordinate[0]!) * 4;
    for (let c = 0; c < 3; c++) result[c]! += DataUtils.fromHalfFloat(data[index + c]!) * weight;
  }
  return result.map((v) => (v - offset) * scale + offset);
}

describe('place lookup tables', () => {
  it('keeps an identity grade linear, including HDR, with no baked tone or sRGB conversion', () => {
    const grade = { ...GARDEN_MORNING, tint: [1, 1, 1] as const, exposure: 1, contrast: 1, saturation: 1 };
    const lut = createGradeLut(grade);
    expect(lut.type).toBe(HalfFloatType);
    expect(lut.minFilter).toBe(LinearFilter);
    expect(lut.colorSpace).toBe('');
    expect(lut.image.data!.byteLength).toBe(262144);
    for (const value of [0, 0.018, 0.18, 1, 4, 16, 40]) {
      for (const channel of sample(lut.image.data as Uint16Array, [value, value, value], 0)) {
        expect(Math.abs(channel - value)).toBeLessThan(0.02);
      }
    }
  });

  it('retains the authored colour script without clipping dark or HDR corners', () => {
    for (const { grade } of Object.values(PLACES)) {
      const lut = createGradeLut(grade);
      const data = lut.image.data as Uint16Array;
      expect(DataUtils.fromHalfFloat(data[0]!)).toBeLessThan(0);
      const offset = 0.18 * (1 - grade.contrast);
      for (const rgb of [[0, 0, 0], [0.02, 0.005, 0.001], [0.18, 0.18, 0.18], [0.2, 1.1, 0.3], [5, 2, 0.1], [32, 8, 3]]) {
        const result = sample(data, rgb, offset);
        const authored = gradeColour(rgb, grade);
        result.forEach((v, i) => expect(Math.abs(v - authored[i]!)).toBeLessThan(Math.max(0.001, Math.abs(authored[i]!) * 0.001)));
      }
    }
  });
});
