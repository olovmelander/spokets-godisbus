import { BoxGeometry, Float32BufferAttribute, Matrix4 } from 'three';
import { describe, expect, it } from 'vitest';
import { together } from '../../src/render/forest-kit';

describe("the shade between a kit's parts set side by side", () => {
  const block = () => {
    const shape = new BoxGeometry(1, 1, 1);
    shape.setAttribute('color', new Float32BufferAttribute(new Array(shape.getAttribute('position').count * 3).fill(1), 3));
    return shape;
  };
  /** The mean brightness of the corners on the face that looks along +x or -x, at x. */
  const face = (made: ReturnType<typeof together>, x: number, towards: number) => {
    const position = made.getAttribute('position'), normal = made.getAttribute('normal'), colour = made.getAttribute('color');
    const found: number[] = [];
    for (let i = 0; i < position.count; i++) if (Math.abs(position.getX(i) - x) < 1e-4 && normal.getX(i) * towards > 0.99) found.push(colour.getX(i));
    return found.reduce((sum, v) => sum + v, 0) / found.length;
  };

  it('darkens the faces of two stones that stand close, where they face each other', () => {
    const made = together([{ shape: block(), matrix: new Matrix4() }, { shape: block(), matrix: new Matrix4().makeTranslation(1.4, 0, 0) }], true);
    expect(face(made, 0.5, 1)).toBeLessThan(0.92);
    expect(face(made, -0.5, -1)).toBeCloseTo(1, 5);
  });

  it('leaves a part alone as it was, and parts put together without it', () => {
    expect(face(together([{ shape: block(), matrix: new Matrix4() }], true), 0.5, 1)).toBe(1);
    const plain = together([{ shape: block(), matrix: new Matrix4() }, { shape: block(), matrix: new Matrix4().makeTranslation(1.4, 0, 0) }]);
    expect(face(plain, 0.5, 1)).toBe(1);
  });
});
