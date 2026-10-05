import { Group, Mesh, PerspectiveCamera } from 'three';
import { describe, expect, it } from 'vitest';
import { TIERS } from '../../src/render/quality';
import { layRich, seeRich } from '../../src/render/rich';

/** A scene with one plain thing, and one rich thing with two parts in it, one of them two deep. */
function scene() {
  const root = new Group();
  const plain = new Mesh();
  const rich = new Group();
  rich.userData.rich = true;
  const part = new Mesh();
  const inner = new Group();
  const deep = new Mesh();
  inner.add(deep);
  rich.add(part, inner);
  root.add(plain, rich);
  return { root, plain, rich, part, deep };
}

describe('what only Mid and High draw', () => {
  it('is out of the picture on Low and in it on Mid and High, with all that is in it', () => {
    const { root, plain, part, deep } = scene();
    layRich(root);
    for (const tier of TIERS) {
      const camera = new PerspectiveCamera();
      seeRich(camera, tier);
      // What is plain is seen on every tier.
      expect(camera.layers.test(plain.layers), `plain on ${tier}`).toBe(true);
      expect(camera.layers.test(part.layers), `a rich part on ${tier}`).toBe(tier !== 'low');
      expect(camera.layers.test(deep.layers), `a rich part two deep on ${tier}`).toBe(tier !== 'low');
    }
  });

  it('follows the tier when it changes, both ways, on the one camera', () => {
    const { root, part } = scene();
    layRich(root);
    const camera = new PerspectiveCamera();
    for (const tier of ['high', 'low', 'mid', 'low', 'high'] as const) {
      seeRich(camera, tier);
      expect(camera.layers.test(part.layers), tier).toBe(tier !== 'low');
    }
  });

  it('leaves `visible` alone: the story and what has nothing to draw hide things with that', () => {
    const { root, rich, part } = scene();
    rich.visible = false;
    part.visible = false;
    layRich(root);
    expect([rich.visible, part.visible]).toEqual([false, false]);
    layRich(root);
    const camera = new PerspectiveCamera();
    seeRich(camera, 'high');
    expect(camera.layers.test(part.layers)).toBe(true);
  });

  it('takes a thing that arrives later, when it is laid again', () => {
    const { root, rich } = scene();
    layRich(root);
    const late = new Mesh();
    rich.add(late);
    const camera = new PerspectiveCamera();
    seeRich(camera, 'low');
    // Until it is laid it is on the plain layer, and Low would draw it.
    expect(camera.layers.test(late.layers)).toBe(true);
    layRich(root);
    expect(camera.layers.test(late.layers)).toBe(false);
  });
});
