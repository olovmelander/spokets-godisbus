import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { buildVerbMarks } from '../../src/render/verb-marks';
import { verbIcon } from '../../src/ui/verbs';

// A page with no sprite, and a canvas that only counts what is drawn on it.
const fakeDoc = () => {
  const drawn: string[] = [];
  const context = new Proxy({}, { get: (_, name) => (typeof name === 'string' ? (...args: unknown[]) => { drawn.push(name); return args; } : undefined), set: () => true });
  const canvas = { width: 0, height: 0, getContext: () => context };
  return { doc: { createElement: () => canvas, getElementById: () => null } as unknown as Document, canvas, drawn };
};

// What Använd will do, over the thing itself (docs/ux-audit/in-play.md row 6).
describe("the verbs' pictures in the world", () => {
  it('draws each picture once, and puts each thing\'s own over it', () => {
    const { doc, canvas } = fakeDoc();
    const marks = buildVerbMarks(garden, doc);
    const spots = garden.spots ?? [];
    const icons = [...new Set(spots.map((spot) => verbIcon(spot.verb, spot.word)))];
    expect(canvas.width).toBe(128 * icons.length);
    for (const [i, spot] of spots.entries()) {
      const mark = marks.group.children[i] as import('three').Mesh;
      const uv = mark.geometry.getAttribute('uv');
      const cell = icons.indexOf(verbIcon(spot.verb, spot.word));
      for (let k = 0; k < uv.count; k++) {
        expect(uv.getX(k)).toBeGreaterThanOrEqual(cell / icons.length - 1e-6);
        expect(uv.getX(k)).toBeLessThanOrEqual((cell + 1) / icons.length + 1e-6);
      }
    }
  });

  it('shows a mark only while its thing can be used, and holds it still with less motion', () => {
    const { doc } = fakeDoc();
    const marks = buildVerbMarks(garden, doc);
    const spot = (garden.spots ?? []).find((s) => s.needs === undefined)!;
    const i = garden.spots!.indexOf(spot);
    const mark = marks.group.children[i]!;
    marks.update(new Set(), 1, false);
    expect(mark.visible).toBe(true);
    const bobbing = mark.position.y;
    marks.update(new Set(), 1, true);
    expect(mark.position.y).toBe(spot.at.y + 1.5);
    expect(mark.scale.x).toBe(1);
    expect(bobbing).not.toBe(mark.position.y);
    marks.update(new Set([spot.id]), 1, true);
    expect(mark.visible).toBe(false);
  });
});
