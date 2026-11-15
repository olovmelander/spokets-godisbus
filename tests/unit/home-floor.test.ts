import { describe, expect, it } from 'vitest';
import { ADVENTURE2, STORY, loadAdventure2 } from '../../src/content/chapters';
import { HOME_BATHROOM, HOME_LAYOUT } from '../../src/content/home-layout';
import { FRONT_DOOR } from '../../src/render/front-door';
import { HALL } from '../../src/render/home-hall';

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

  it('hangs the raincoats, their rail and the boots clear of the white bathroom door and of the green front door', () => {
    // Olov, 15 November 2026: "Sen måste vi se till så att regnkläderna inte hänger över den vita dörren." The white door's
    // frame (src/render/home-routine.ts) and the green door's (src/render/front-door.ts), at their outer edges.
    const white = HOME_BATHROOM.x + HOME_BATHROOM.openingWidth / 2 + 0.17;
    const green = HOME_LAYOUT.hall.door - (FRONT_DOOR.width + 0.9) / 2;
    const ends = [
      [HALL.rail.x - HALL.rail.wide / 2, HALL.rail.x + HALL.rail.wide / 2],
      ...HALL.coats.map((coat) => [coat.x - HALL.hem, coat.x + HALL.hem]),
      // A pair of boots: two, 0.2 to either side, each 0.3 wide.
      ...HALL.boots.map((boot) => [boot.x - 0.35, boot.x + 0.35]),
    ];
    expect(Math.min(...ends.map(([from]) => from!))).toBeGreaterThan(white + 0.2);
    expect(Math.max(...ends.map(([, to]) => to!))).toBeLessThan(green - 0.2);
  });

  it('has the white bathroom door and the green front door in every chapter at home, and the veranda\'s door past them', async () => {
    // Olov, 15 November 2026: "Jag vill ha den vita och den gröna dörren överallt", and "Jag vill ha verandadörren så som
    // den funkar idag men även ha de två dörrarna". The bathroom's white door is in every room at home (src/render/
    // home-routine.ts); the green door is the hall's (`hall`, `hallWorn` on the evening of the storm, when the raincoats
    // are worn, and the morning's `aftermath`). Where a chapter goes out on the veranda, its door is past the green one.
    await loadAdventure2();
    const home = [...STORY, ...ADVENTURE2].filter((chapter) => chapter.place === 'home');
    expect(home.map((chapter) => chapter.id).sort()).toEqual(['epilog', 'morgonen', 'prolog', 'stormkvall']);
    const green = HOME_LAYOUT.hall.door + (FRONT_DOOR.width + 0.9) / 2;
    for (const chapter of home) {
      expect((chapter.decor ?? []).filter((d) => ['hall', 'hallWorn', 'aftermath'].includes(d.look)), chapter.id).toHaveLength(1);
      if (chapter.outdoors === undefined) continue;
      expect(chapter.outdoors, chapter.id).toBe(HOME_LAYOUT.veranda);
      expect(chapter.outdoors, chapter.id).toBeGreaterThan(green + 1);
      // The floor is level from the room's back to the veranda's door, through the hall.
      const indoors = chapter.ground.filter((p) => p.x > chapter.ground[0]!.x && p.x < chapter.outdoors!);
      expect(indoors.every((p) => p.y === 0), chapter.id).toBe(true);
    }
    expect(home.filter((chapter) => chapter.outdoors !== undefined).map((chapter) => chapter.id).sort()).toEqual(['prolog', 'stormkvall']);
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
