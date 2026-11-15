import { describe, expect, it } from 'vitest';
import { ADVENTURE2, STORY, loadAdventure2 } from '../../src/content/chapters';
import { HOME_LAYOUT } from '../../src/content/home-layout';

/**
 * Olov, 15 November 2026: "golvet buktar precis framför tv:n i vissa av dem. Golvet ska vara plant i alla kapitel, precis
 * som i det sista kapitlet." The prologue and Stormkvällen kept a door sill to the veranda in their ground from before
 * the shared home, right in front of the TV, and the floor was drawn bent round it.
 */
describe('the floor at home', () => {
  it('is level in every chapter at home, from the back of the room past the TV and the bathroom door', async () => {
    await loadAdventure2();
    const home = [...STORY, ...ADVENTURE2].filter((chapter) => chapter.place === 'home');
    expect(home.map((chapter) => chapter.id).sort()).toEqual(['epilog', 'morgonen', 'prolog', 'stormkvall']);
    const past = HOME_LAYOUT.bathroom.x + HOME_LAYOUT.bathroom.width / 2;
    for (const chapter of home) {
      const floor = chapter.ground.filter((p) => p.x > chapter.ground[0]!.x && p.x <= past);
      expect(floor.every((p) => p.y === 0), `${chapter.id}: ${JSON.stringify(floor)}`).toBe(true);
      // Nothing is jumped onto there, and the trail lies on the floor.
      for (const jump of chapter.jumps ?? []) expect(jump.at.x > past || jump.land.x > past, chapter.id).toBe(true);
      for (const candy of (chapter.candy ?? []).filter((c) => c.x > HOME_LAYOUT.television.x - 3 && c.x < HOME_LAYOUT.television.x + 3)) {
        expect(candy.y, `${chapter.id}: the candy at ${candy.x}`).toBeLessThan(0.6);
      }
    }
  });
});
