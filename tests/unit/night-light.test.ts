import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { NIGHT } from '../../src/content/aventyr2/render';
import { PLACES, type PlaceLook } from '../../src/render/dressing';

/**
 * The nights stay nights, and are never so dark that the ground and the figures go black (the light pass of
 * 6 November 2026). Before it, at the darkest, half of the play picture was under L* 10 in Byn i stormen, and the
 * scenes' figures were murky; Olov: "Spelet kan vara lite för mörkt när det är som mörkast också i scenerna."
 */
const luminance = (hex: string) => {
  const c = new Color(hex);
  return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
};

/**
 * How much light falls on what faces the camera on the play plane, graded: the sky light on an upright surface,
 * the fill from the camera's side, and the sun where it stands in front. A figure, a wall or the front of the
 * ground is lit by this; the sky, which no light lights, is not.
 */
function playLight(look: PlaceLook): number {
  const sky = look.hemisphere.intensity * (luminance(look.hemisphere.sky) + luminance(look.hemisphere.ground)) / 2;
  const fill = look.fill.intensity * luminance(look.fill.colour) * 0.89;
  const [x, y, z] = look.sun.from;
  const sun = look.sun.intensity * luminance(look.sun.colour) * Math.max(0, z / Math.hypot(x, y, z));
  return look.grade.exposure * (sky + fill + sun);
}

describe('the night light', () => {
  const day = ['garden', 'forest', 'bog', 'mountain', 'village', 'home'].map((id) => playLight(PLACES[id as keyof typeof PLACES]!));
  const daylight = Math.min(...day);

  it('lights the play plane of every night at least 60 % as well as the dimmest day', () => {
    for (const [id, look] of Object.entries(NIGHT.looks)) {
      expect(playLight(look) / daylight, id).toBeGreaterThan(0.6);
    }
  });

  it('keeps its sky dark and its corners nearly as light as the middle', () => {
    for (const [id, look] of Object.entries(NIGHT.looks)) {
      if (id === 'morgonen') continue;
      expect(luminance(look.sky.top), id).toBeLessThan(0.02);
      expect(look.grade.vignette, id).toBeLessThanOrEqual(0.32);
    }
  });
});
