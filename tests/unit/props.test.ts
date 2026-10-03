import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { testbana } from '../../src/content/chapters/testbana';
import { moverProp, rideProp, spotProp } from '../../src/render/props';

describe('the stand-ins for things and animals', () => {
  it('every thing a chapter names is built, and one it does not name is left as it was', () => {
    for (const chapter of [...STORY, testbana]) {
      for (const mover of chapter.movers ?? []) {
        expect(moverProp(mover) !== null, `${chapter.id}: the ${mover.id}`).toBe(mover.look !== undefined);
      }
      for (const spot of chapter.spots ?? []) {
        expect(spotProp(spot) !== null, `${chapter.id}: the ${spot.id}`).toBe(spot.look !== undefined);
      }
      for (const ride of chapter.rides ?? []) {
        const drawn = ride.look !== undefined && ride.look !== 'plane' && ride.look !== 'none';
        expect(rideProp(ride.look ?? 'plane') !== null, `${chapter.id}: the ${ride.id}`).toBe(drawn);
      }
    }
  });

  it('no thing on a rail in the story is a plain box any more', () => {
    for (const chapter of STORY) for (const mover of chapter.movers ?? []) expect(mover.look, `${chapter.id}: the ${mover.id}`).toBeDefined();
  });

  it('a thing stands a little behind the path or beside it, never where he walks', () => {
    for (const chapter of STORY) {
      for (const spot of chapter.spots ?? []) {
        const prop = spotProp(spot);
        if (!prop) continue;
        expect(prop.group.position.x).toBe(spot.at.x);
        // The bag and the golden candy are held out to him; everything else is behind the path.
        if (spot.look !== 'bag' && spot.look !== 'gold') expect(prop.group.position.z, `${chapter.id}: the ${spot.id}`).toBeLessThanOrEqual(-0.35);
      }
    }
  });

  it('answers to being used without breaking: the ladybird turns and flies, the berry is gone', () => {
    for (const chapter of STORY) {
      for (const spot of chapter.spots ?? []) {
        const prop = spotProp(spot);
        if (!prop) continue;
        prop.update(false, 1, 1 / 60);
        const before = prop.group.scale.x;
        for (let i = 0; i < 240; i++) prop.update(true, 1 + i / 60, 1 / 60);
        expect(Number.isFinite(prop.group.scale.x)).toBe(true);
        expect(before).toBe(1);
        if (spot.look === 'ladybird' || spot.look === 'berry' || spot.look === 'lollipop' || spot.look === 'bag') expect(prop.group.scale.x, `the ${spot.id}`).toBe(0);
      }
    }
  });
});
