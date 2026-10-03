import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';

describe('the places', () => {
  it('every chapter that names a place names one that has a look', () => {
    for (const chapter of Object.values(COURSES)) {
      if (chapter.place !== undefined) expect(PLACES[chapter.place], `${chapter.id}: ${chapter.place}`).toBeDefined();
    }
  });

  it('Gården and Granskogen and their golden frames are dressed; the test course stays greybox', () => {
    expect(COURSES['garden']!.place).toBe('garden');
    expect(COURSES['look-deck']!.place).toBe('garden');
    expect(COURSES['granskog']!.place).toBe('forest');
    expect(COURSES['look-forest']!.place).toBe('forest');
    expect(COURSES['testbana']!.place).toBeUndefined();
  });

  it('what a chapter marks for the picture lies along its own ground', () => {
    for (const chapter of Object.values(COURSES)) {
      const from = chapter.ground[0]!.x - 16;
      const to = chapter.ground[chapter.ground.length - 1]!.x + 16;
      const marked = chapter.surfaces ?? [];
      for (const [i, s] of marked.entries()) {
        expect(s.to, `${chapter.id}: a stretch of ${s.kind}`).toBeGreaterThan(s.from);
        expect(s.from).toBeGreaterThanOrEqual(from);
        expect(s.to).toBeLessThanOrEqual(to);
        // In order, and never one over another.
        if (i > 0) expect(s.from).toBeGreaterThanOrEqual(marked[i - 1]!.to);
      }
      for (const roof of chapter.roofs ?? []) {
        expect(roof.to).toBeGreaterThan(roof.from);
        // Overhead: above every hook and above him wherever he stands under it.
        for (const hook of chapter.hooks ?? []) if (hook.x > roof.from && hook.x < roof.to) expect(roof.y, `${chapter.id}: the hook at ${hook.x}`).toBeGreaterThan(hook.y + 1);
      }
      if (chapter.house) for (const x of chapter.house.windows) expect(x > chapter.house.from && x < chapter.house.to, `${chapter.id}: the window at ${x}`).toBe(true);
    }
  });

  it('each look keeps its grade gentle: nothing a child would read as a filter', () => {
    for (const [id, look] of Object.entries(PLACES)) {
      expect(look.grade.vignette, id).toBeLessThanOrEqual(0.4);
      expect(look.grade.grain, id).toBeLessThanOrEqual(0.04);
      expect(look.grade.contrast, id).toBeLessThanOrEqual(1.15);
      // The haze begins behind the play plane: he and what is near him stay clear.
      expect(look.haze.near, id).toBeGreaterThan(0);
    }
  });
});
