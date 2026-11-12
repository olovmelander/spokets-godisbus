import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { norrsken } from '../../src/content/chapters/norrsken';
import { epilog, STEP_STOOL } from '../../src/content/chapters/ends';
import { STEPS_TOP } from '../../src/render/stage';
import { HOME_LAYOUT } from '../../src/content/home-layout';

/**
 * How the sweets lie at the end of Äventyr 1 (the fine-tuning pass of 12 November 2026, as Äventyr 2's were laid out the
 * same day: "fint och strukturerat och inte för plottrigt"). None on a big candy's stick, none in the jay's beak or at the
 * feet of the family at the party, and none waiting where the family stands to meet him on the summit.
 */
describe('Äventyr 1, the last chapters: where the sweets lie', () => {
  for (const chapter of [berget, norrsken, epilog]) {
    it(`${chapter.id}: no sweet at a big candy's foot`, () => {
      for (const big of chapter.checkpoints ?? []) {
        for (const [i, c] of chapter.candy.entries()) {
          if (c.y - big.y > 1.9) continue;
          expect(Math.abs(c.x - big.x), `sweet ${i} at ${c.x},${c.y} by the big candy at ${big.x}`).toBeGreaterThan(0.55);
        }
      }
    });
  }

  it('epilog: no sweet at the feet of the one he gives a sweet to, nor by the things he found', () => {
    // Moa stands across the table from him, where the table is between her and any sweet on the floor.
    const marks = [
      ...(epilog.spots ?? []).filter((spot) => spot.id.startsWith('party:') && spot.look === 'sign' && (spot.standsAt?.z ?? 0) > -2.5)
        .map((spot) => spot.standsAt?.x ?? spot.at.x),
      ...(epilog.decor ?? []).filter((d) => d.at.y === 0).map((d) => d.at.x),
    ];
    for (const x of marks) for (const c of epilog.candy) expect(Math.abs(c.x - x), `the sweet at ${c.x} by ${x}`).toBeGreaterThan(0.65);
  });

  it('epilog: he stands on the step stool\'s top, high enough to reach Pappa\'s shelf, and under its front edge', () => {
    expect(STEP_STOOL.top.y).toBe(STEPS_TOP);
    // Drawn three times his small size, his head is about 3.2 over his feet: at the shelf's height, not an EL under it.
    expect(STEP_STOOL.top.y + 3.2).toBeGreaterThan(HOME_LAYOUT.shelf.y - 0.2);
    // The shelf's board reaches out to z -7.98 (src/render/dressing/built.ts); his head stays in front of it.
    expect(STEP_STOOL.top.z - 0.3).toBeGreaterThan(-7.98);
    expect(epilog.furniture!.find((piece) => piece.look === 'steps')!.z).toBe(STEP_STOOL.z);
  });

  it('norrsken: the jay has no sweet in its beak, and the reunion\'s place has none until it is over', () => {
    const jay = norrsken.spots!.find((spot) => spot.id === 'share:jay')!;
    for (const c of norrsken.candy) expect(Math.abs(c.x - jay.at.x), `the sweet at ${c.x}`).toBeGreaterThan(0.9);
    const meeting = norrsken.scenes!.find((scene) => scene.id === 'aterfunna')!;
    for (const c of norrsken.candy) if (c.x > 26.6) expect(c.after, `the sweet at ${c.x}`).toBe(`scene:${meeting.id}`);
    expect(norrsken.checkpoints!.filter((big) => big.x > 26.6).every((big) => big.after === `scene:${meeting.id}`)).toBe(true);
  });
});
