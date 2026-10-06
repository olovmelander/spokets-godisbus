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
        // The bag, the golden candy and the star lie where he takes them; everything else is behind the path.
        if (spot.look !== 'bag' && spot.look !== 'gold' && spot.look !== 'star') expect(prop.group.position.z, `${chapter.id}: the ${spot.id}`).toBeLessThanOrEqual(-0.35);
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

describe("the bog's shy tussocks", () => {
  it('stand on peat columns up out of the water, not in the air, and are one draw each', async () => {
    const { Box3 } = await import('three');
    const { COURSES } = await import('../../src/content/chapters');
    const myren = COURSES.myren!;
    const water = Math.min(...(myren.water ?? []).map((w) => w.y));
    const shy = (myren.movers ?? []).filter((mover) => mover.look === 'tussock');
    expect(shy.length).toBe(6);
    for (const mover of shy) {
      const prop = moverProp(mover)!;
      const meshes: unknown[] = [];
      prop.traverse((node) => { if ((node as { isMesh?: boolean }).isMesh) meshes.push(node); });
      expect(meshes.length, mover.id).toBe(1);
      const box = new Box3().setFromObject(prop);
      // From every place it stands, its column goes down under the water; its top is where he stands.
      for (const stop of mover.stops) expect(stop.y + box.min.y, mover.id).toBeLessThan(water - 2);
      expect(box.max.y, mover.id).toBeGreaterThan(mover.height);
      // Its column stands behind the path he walks below it.
      expect(box.min.z, mover.id).toBeLessThan(0);
    }
  });
});
