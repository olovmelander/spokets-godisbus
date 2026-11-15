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

/**
 * Olov, 15 November 2026: "Kapitlet Godiskalaset i äventyr 1 och första kapitlet i äventyr 1 måste ha samma design på
 * hemmet som i det allra sista kapitlet i äventyr 2. Bord, golv, inredning och allt måste se likadant ut som hemmet i
 * äventyr 2." The toy shelf was Äventyr 2's alone, Godiskalaset's table had a cloth drawn as a flat grey slab and its hall
 * ended in a step, and an open doorway stood free in the prologue's room.
 */
describe('the home', () => {
  it('is furnished the same in every chapter at home: the same table and chairs, and the toy shelf beside the sofa', async () => {
    await loadAdventure2();
    const home = [...STORY, ...ADVENTURE2].filter((chapter) => chapter.place === 'home');
    for (const chapter of home) {
      const shelf = (chapter.decor ?? []).filter((d) => d.look === 'toyShelf');
      expect(shelf.map((d) => d.at.x), chapter.id).toEqual([HOME_LAYOUT.toyShelf.x]);
      const table = (chapter.furniture ?? []).filter((piece) => piece.look === 'table');
      expect(table, chapter.id).toHaveLength(1);
      expect(table[0]!.cloth, chapter.id).toBeUndefined();
      expect((chapter.furniture ?? []).filter((piece) => piece.look === 'chair').length, chapter.id).toBe(Object.keys(HOME_LAYOUT.dining.chairs).length);
    }
  });

  it('has the same hall in Godiskalaset as on Sunday morning: the coats, the boots and the front door, to the end wall', async () => {
    await loadAdventure2();
    const [epilog, morgonen] = ['epilog', 'morgonen'].map((id) => [...STORY, ...ADVENTURE2].find((chapter) => chapter.id === id)!);
    expect((epilog!.decor ?? []).some((d) => d.look === 'hall')).toBe(true);
    // Sunday morning's hall is in what the night left (its coats are wet).
    expect((morgonen!.decor ?? []).some((d) => d.look === 'aftermath')).toBe(true);
    for (const chapter of [epilog!, morgonen!]) {
      expect(chapter.house!.windows, chapter.id).toContain(HOME_LAYOUT.hall.window);
      const floor = chapter.ground.filter((p) => p.x > chapter.ground[0]!.x && p.x < HOME_LAYOUT.hall.end);
      expect(floor.every((p) => p.y === 0), chapter.id).toBe(true);
    }
  });
});
