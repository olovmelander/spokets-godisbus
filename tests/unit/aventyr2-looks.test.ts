import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { NIGHT } from '../../src/content/aventyr2/render';
import { PACK } from '../../src/render/extensions';
import { spotProp, moverProp, rideProp } from '../../src/render/props';

/** Äventyr 2's pictures (src/content/aventyr2/render.ts): every look its chapters use is drawn, and its light is its place's. */
describe('Äventyr 2: the pictures', () => {
  it('lights each chapter as its own place, at night where it is night', () => {
    for (const chapter of AVENTYR2) {
      const look = PACK.looks.get(chapter.id);
      expect(look, chapter.id).toBeDefined();
      expect(look!.id, chapter.id).toBe(chapter.place);
    }
    for (const [id, dim] of Object.entries(NIGHT.dim)) expect(dim, id).toBeLessThan(0.6);
  });

  it('draws every thing its chapters name: none is left a bare glint by mistake', () => {
    for (const chapter of AVENTYR2) {
      for (const spot of chapter.spots ?? []) if (spot.look) expect(spotProp(spot), `${chapter.id}: ${spot.id} (${spot.look})`).not.toBeNull();
      for (const [i, d] of (chapter.decor ?? []).entries()) expect(spotProp({ id: `decor:${i}`, at: d.at, verb: 'take', look: d.look }), `${chapter.id}: decor ${d.look}`).not.toBeNull();
      for (const mover of chapter.movers ?? []) if (mover.look) expect(moverProp(mover), `${chapter.id}: ${mover.id} (${mover.look})`).not.toBeNull();
      for (const ride of chapter.rides ?? []) if (ride.look && ride.look !== 'none' && ride.look !== 'plane') expect(rideProp(ride.look), `${chapter.id}: ${ride.id}`).not.toBeNull();
    }
  });

  it('adds the storm to the picture only where a chapter has one', () => {
    expect(PACK.extras.length).toBe(1);
    expect(AVENTYR2.filter((chapter) => chapter.storm).map((chapter) => chapter.id)).toEqual(['stormkvall', 'stormgard', 'stormskog', 'stormbyn', 'sjon', 'stormoga']);
    // Klonk's frozen bridge is a ledge the storm knows.
    const skog = AVENTYR2.find((chapter) => chapter.id === 'stormskog')!;
    expect(skog.ledges?.some((ledge) => ledge.needs === skog.storm?.frozen)).toBe(true);
  });
});
