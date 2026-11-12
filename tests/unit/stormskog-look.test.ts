import { Box3, Group, Mesh, Quaternion, Vector3, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import { heightAt } from '../../src/render/dressing/kit';
import { ROOT_HOLLOW, rootHollow } from '../../src/render/root-hollow';
import { swayingBoughs } from '../../src/render/swaying-boughs';

/** The movers as the view builds them: a group at the mover's place, holding its prop. */
function movers() {
  return (stormskog.movers ?? []).map((mover) => {
    const group = new Group();
    const prop = new Group();
    prop.add(new Mesh());
    group.add(prop);
    group.position.set(mover.stops[0]!.x, mover.stops[0]!.y, 0);
    return group;
  });
}

describe('Stormskogen: what holds the swaying boughs', () => {
  it('draws each swaying bough as a spruce bough on a young stem, rooted under the middle of its swing', () => {
    const meshes = movers();
    const group = swayingBoughs(stormskog, meshes)!;
    expect(group).not.toBeNull();
    const boughs = (stormskog.movers ?? []).flatMap((mover, i) => (mover.cycle ? [{ mover, group: meshes[i]! }] : []));
    expect(boughs).toHaveLength(3);
    // The owl's twig is not one of them.
    expect(meshes[(stormskog.movers ?? []).findIndex((m) => m.id === 'owl-twig')]!.children).toHaveLength(1);
    for (const { mover, group: moving } of boughs) {
      // The kit's twig is not drawn; the bough is, on the mover, its top where he stands.
      expect(moving.children[0]!.visible).toBe(false);
      const bough = moving.getObjectByName(`swaying-bough:${mover.id}`)!;
      expect(bough.position.y).toBeCloseTo(mover.height);
      const stem = group.getObjectByName(`swaying-stem:${mover.id}`)!;
      const foot = stem.parent!;
      const xs = mover.stops.map((stop) => stop.x);
      const middle = (Math.min(...xs) + Math.max(...xs)) / 2;
      expect(foot.position.x).toBeCloseTo(middle);
      expect(foot.position.y).toBeCloseTo(heightAt(stormskog, middle));
      // At either end of its swing the stem leans to meet the bough's top, its foot where it was.
      for (const stop of mover.stops) {
        moving.position.set(stop.x, stop.y, 0);
        (moving.children[0]!.userData.tick as (clock: number) => void)(0);
        stem.updateWorldMatrix(true, false);
        const along = new Vector3(0, 1, 0).applyQuaternion(stem.getWorldQuaternion(new Quaternion()));
        const toBough = new Vector3(stop.x - foot.position.x, stop.y + mover.height - foot.position.y, 0).normalize();
        expect(along.angleTo(toBough)).toBeLessThan(1e-6);
        expect(foot.position.x).toBeCloseTo(middle);
        // A young spruce leans, it does not lie down.
        expect(Math.abs(foot.rotation.z)).toBeLessThan(0.25);
      }
    }
  });
});

describe('Stormskogen: the dark hollow under the roots', () => {
  const hollow = stormskog.spots!.find((spot) => spot.id === 'ss:hollow')!;
  const group = rootHollow(stormskog)!;
  group.updateMatrixWorld(true);
  const box = (object: Object3D) => new Box3().setFromObject(object);

  it('stands a felled spruce’s root plate behind the hollow, wider than him and over his head', () => {
    expect(group.position.x).toBe(hollow.at.x);
    const plate = box(group.getObjectByName('root-plate')!);
    expect(plate.min.x).toBeLessThan(hollow.at.x - 2);
    expect(plate.max.x).toBeGreaterThan(hollow.at.x + 2);
    expect(plate.max.y).toBeGreaterThan(hollow.at.y + 3);
  });

  it('keeps all of it behind the plane he moves in, so it covers neither him, Klonk nor the candy', () => {
    for (const name of ['root-plate', 'root-plate-roots']) expect(box(group.getObjectByName(name)!).max.z, name).toBeLessThan(-0.3);
    // The arching roots come down on the hollow's rims, not over the trail's sweets or the floor he walks.
    const roots = box(group.getObjectByName('root-plate-roots')!);
    expect(roots.max.x - hollow.at.x).toBeLessThan(ROOT_HOLLOW.reach + 0.6);
    expect(hollow.at.x - roots.min.x).toBeLessThan(ROOT_HOLLOW.reach + 0.6);
  });

  it('is built only where the chapter has the hollow', () => {
    expect(rootHollow({ ...stormskog, spots: [] })).toBeNull();
  });
});
