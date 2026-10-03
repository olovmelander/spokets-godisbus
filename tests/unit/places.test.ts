import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';

describe('the places', () => {
  it('every chapter that names a place names one that has a look', () => {
    for (const chapter of Object.values(COURSES)) {
      if (chapter.place !== undefined) expect(PLACES[chapter.place], `${chapter.id}: ${chapter.place}`).toBeDefined();
    }
  });

  it('Granskogen and its golden frame are dressed as the forest; the test course stays greybox', () => {
    expect(COURSES['granskog']!.place).toBe('forest');
    expect(COURSES['look-forest']!.place).toBe('forest');
    expect(COURSES['testbana']!.place).toBeUndefined();
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
