import { Box3, BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Assets, Manifest } from '../../src/render/assets';
import { GARDEN_HOME, installGardenHome } from '../../src/render/garden-home';

const PRIVATE = 'garden/home-landmarks';
const GENERIC = 'boot/garden-fallback';

/** Packed glTF roots decode normalized vertices through their own translation and scale. */
function buildings() {
  const model = new Group();
  const geometry = new BoxGeometry(2, 2, 2);
  const material = new MeshBasicMaterial();
  const roots = GARDEN_HOME.map((at, i) => {
    const root = new Mesh(geometry, material);
    root.name = at.name;
    root.position.set(2 + i, 8 + i, -3 - i);
    root.scale.set(7 + i, 8 + i, 5 + i);
    root.rotation.set(.1, .25 + i * .1, -.15);
    model.add(root);
    return root;
  });
  return { model, roots };
}

function fixture(advertised: string[], loaded: Record<string, Group | Error>) {
  const manifest: Manifest = { version: 1, packs: {} };
  for (const path of advertised) {
    const [pack, name] = path.split('/');
    manifest.packs[pack!] ??= { bytes: 1, files: {} };
    manifest.packs[pack!]!.files[`${name}.glb`] = 1;
  }
  const assets: Assets = {
    manifest: vi.fn(async () => manifest),
    model: vi.fn(async (pack, name) => {
      const model = loaded[`${pack}/${name}`];
      if (!model) throw new Error('Unexpected model request');
      if (model instanceof Error) throw model;
      return model;
    }),
    restoreTextures: async () => {},
    textureInfo: () => ({ managed: 0, released: 0, cpuBytes: 0, restores: 0 }),
  };
  const scene = new Group(), placeholder = new Group();
  placeholder.name = 'garden-home-placeholder';
  scene.add(placeholder);
  return { assets, scene, placeholder };
}

afterEach(() => vi.restoreAllMocks());

describe('garden home installation', () => {
  it('places packed geometry without erasing its decoding transform or shrinking its real bounds', async () => {
    const { model, roots } = buildings();
    const before = roots.map(root => ({
      position: root.position.toArray(), scale: root.scale.toArray(), rotation: root.quaternion.toArray(),
      bounds: new Box3().setFromObject(root),
    }));
    const { assets, scene, placeholder } = fixture([PRIVATE, GENERIC], { [PRIVATE]: model });

    expect(await installGardenHome(scene, assets)).toBe(PRIVATE);
    scene.updateMatrixWorld(true);
    roots.forEach((root, i) => {
      const at = GARDEN_HOME[i]!, original = before[i]!;
      const placement = scene.getObjectByName(at.name)!;
      expect(placement).toBeInstanceOf(Group);
      expect(root.parent).toBe(placement);
      expect(placement.position.toArray()).toEqual([at.x, at.y, at.z]);
      root.position.toArray().forEach((value, axis) => expect(value).toBeCloseTo(original.position[axis]!, 12));
      root.scale.toArray().forEach((value, axis) => expect(value).toBeCloseTo(original.scale[axis]!, 12));
      root.quaternion.toArray().forEach((value, axis) => expect(value).toBeCloseTo(original.rotation[axis]!, 12));
      const offset = new Vector3(at.x, at.y, at.z);
      const expected = original.bounds.clone();
      expected.min.multiplyScalar(at.scale).add(offset);
      expected.max.multiplyScalar(at.scale).add(offset);
      const actual = new Box3().setFromObject(placement);
      expect(actual.min.distanceTo(expected.min)).toBeLessThan(1e-9);
      expect(actual.max.distanceTo(expected.max)).toBeLessThan(1e-9);
      // Overwriting the packed root scale used to reduce a whole building to a roughly two-EL cube.
      expect(actual.getSize(new Vector3()).y).toBeGreaterThan(10);
    });
    expect(placeholder.visible).toBe(false);
    expect(assets.model).toHaveBeenCalledExactlyOnceWith('garden', 'home-landmarks');
  });

  it('never requests private architecture in repository-safe stand-in mode', async () => {
    const generic = buildings().model;
    const { assets, scene, placeholder } = fixture([PRIVATE, GENERIC], {
      [PRIVATE]: new Error('Private architecture must not be requested'), [GENERIC]: generic,
    });
    expect(await installGardenHome(scene, assets, true)).toBe(GENERIC);
    expect(assets.model).toHaveBeenCalledExactlyOnceWith('boot', 'garden-fallback');
    expect(generic.parent).toBe(scene);
    expect(placeholder.visible).toBe(false);
  });

  it('rejects an incomplete private building set without installing or partially moving it', async () => {
    const broken = buildings(), generic = buildings().model;
    broken.roots[1]!.removeFromParent();
    const originalPosition = broken.roots[0]!.position.toArray();
    const { assets, scene, placeholder } = fixture([PRIVATE, GENERIC], {
      [PRIVATE]: broken.model, [GENERIC]: generic,
    });
    expect(await installGardenHome(scene, assets)).toBe(GENERIC);
    expect(assets.model).toHaveBeenNthCalledWith(1, 'garden', 'home-landmarks');
    expect(assets.model).toHaveBeenNthCalledWith(2, 'boot', 'garden-fallback');
    expect(broken.model.parent).toBeNull();
    expect(broken.roots[0]!.position.toArray()).toEqual(originalPosition);
    expect(generic.parent).toBe(scene);
    expect(placeholder.visible).toBe(false);
  });

  it('loads generic architecture after a failed advertised private file', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { assets, scene, placeholder } = fixture([PRIVATE, GENERIC], {
      [PRIVATE]: new Error('Corrupt private GLB'), [GENERIC]: buildings().model,
    });
    expect(await installGardenHome(scene, assets)).toBe(GENERIC);
    expect(assets.model).toHaveBeenNthCalledWith(2, 'boot', 'garden-fallback');
    expect(placeholder.visible).toBe(false);
  });

  it('keeps the original exterior when neither pack is available', async () => {
    const { assets, scene, placeholder } = fixture([], {});
    expect(await installGardenHome(scene, assets)).toBeNull();
    expect(assets.model).not.toHaveBeenCalled();
    expect(scene.children).toEqual([placeholder]);
    expect(placeholder.visible).toBe(true);
  });

  it('keeps the original exterior when both advertised models fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { assets, scene, placeholder } = fixture([PRIVATE, GENERIC], {
      [PRIVATE]: new Error('Private file unavailable'), [GENERIC]: new Error('Fallback file unavailable'),
    });
    expect(await installGardenHome(scene, assets)).toBeNull();
    expect(assets.model).toHaveBeenCalledTimes(2);
    expect(scene.children).toEqual([placeholder]);
    expect(placeholder.visible).toBe(true);
  });
});
