import { Box3, BoxGeometry, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { Assets, Manifest } from '../../src/render/assets';
import { installSharedModels } from '../../src/render/shared-models';

const shape = (name: string) => {
  const mesh = new Mesh(new BoxGeometry(2, 4, 6), new MeshStandardMaterial());
  mesh.name = name;
  return mesh;
};
const kit = (...names: string[]) => {
  const group = new Group();
  group.add(...names.map(shape));
  return group;
};
const socket = (name: string) => {
  const group = new Group();
  group.userData.model = name;
  group.add(shape('fallback'));
  return group;
};
const assetsFor = (models: Record<string, Group>) => {
  const packs: Manifest['packs'] = {};
  for (const key of Object.keys(models)) {
    const [pack, file] = key.split('/');
    packs[pack!] ??= { bytes: 1, files: {} };
    packs[pack!]!.files[`${file}.glb`] = 1;
  }
  return {
    manifest: vi.fn(async () => ({ version: 1, packs })),
    model: vi.fn(async (pack: string, name: string) => {
      const model = models[`${pack}/${name}`];
      if (!model) throw new Error(`Unexpected model request: ${pack}/${name}`);
      return model;
    }),
    restoreTextures: async () => {},
    textureInfo: () => ({ managed: 0, released: 0, cpuBytes: 0, restores: 0 }),
  } satisfies Assets;
};

describe('models shared by both adventures', () => {
  it('loads only the files requested by the scene and reuses a kit for separate furniture copies', async () => {
    const assets = assetsFor({
      'aventyr2/room': kit('bord', 'stol'),
      'aventyr2/nature': kit('gran-a'),
      'aventyr2/olympia': kit('olympia-hall'),
      'private/tragubbar': kit('tragubbe'),
    });
    const scene = new Group(), first = socket('stol'), second = socket('stol'), table = socket('bord');
    scene.add(first, second, table);
    const loaded = vi.fn();
    expect(await installSharedModels(assets, scene, false, loaded)).toBe(true);
    expect(assets.model.mock.calls).toEqual([['aventyr2', 'room']]);
    const a = first.getObjectByName('stol')!, b = second.getObjectByName('stol')!;
    expect(a).not.toBe(b);
    expect(a.parent).not.toBe(b.parent);
    await expect(assets.model.mock.results[0]!.value).resolves.toHaveProperty('children.length', 2);
    expect(table.getObjectByName('bord')).toBeDefined();
    expect(loaded).toHaveBeenCalledExactlyOnceWith('aventyr2/room');
    expect(await installSharedModels(assets, scene, false, loaded)).toBe(false);
    expect(loaded).toHaveBeenCalledTimes(1);
  });

  it('preserves packed transforms, placement and retained effects, and installs each socket only once', async () => {
    const source = kit('bil'), made = source.getObjectByName('bil')!;
    made.position.set(0.3, 0.7, -0.2);
    made.scale.set(0.01, 0.02, 0.03);
    const assets = assetsFor({ 'aventyr2/props': source });
    const scene = new Group(), place = socket('bil'), windows = shape('windows');
    place.position.set(12, 4, -8);
    place.userData = { ...place.userData, fit: 2, turn: 0.8, lift: 1.1, shift: -0.4, back: -1.5, onModelInstalled: vi.fn() };
    windows.userData.keep = 0.2;
    windows.position.z = 0.5;
    place.add(windows);
    scene.add(place);
    expect(await installSharedModels(assets, scene)).toBe(true);
    const copy = place.getObjectByName('bil')!;
    expect(copy.position.toArray()).toEqual(made.position.toArray());
    expect(copy.scale.toArray()).toEqual(made.scale.toArray());
    expect(copy.parent!.position.toArray()).toEqual([-0.4, 1.1, -1.5]);
    expect(copy.parent!.scale.toArray()).toEqual([2, 2, 2]);
    expect(copy.parent!.rotation.y).toBe(0.8);
    expect(place.position.toArray()).toEqual([12, 4, -8]);
    expect(place.children).toContain(windows);
    expect(windows.position.z).toBeCloseTo(0.7);
    expect(place.getObjectByName('fallback')).toBeUndefined();
    expect(place.userData.onModelInstalled).toHaveBeenCalledExactlyOnceWith(copy.parent);
    expect(await installSharedModels(assets, scene)).toBe(false);
    expect(assets.model).toHaveBeenCalledTimes(1);
    expect(windows.position.z).toBeCloseTo(0.7);
    expect(place.userData.onModelInstalled).toHaveBeenCalledTimes(1);
  });

  it('fits an authored rock to the collision landmark without changing its anchor', async () => {
    const assets = assetsFor({ 'aventyr2/nature': kit('block-b') });
    const scene = new Group(), rock = socket('block-b');
    rock.position.set(18, 2, -4);
    rock.userData.block = { width: 3, height: 5, depth: 7, x: 0.5, y: 4, z: -0.6 };
    scene.add(rock);
    await installSharedModels(assets, scene);
    const copy = rock.getObjectByName('block-b')!.parent!;
    const size = new Box3().setFromObject(copy).getSize(new Vector3());
    expect(size.x).toBeCloseTo(3);
    expect(size.y).toBeCloseTo(5);
    expect(size.z).toBeCloseTo(7);
    expect(copy.position.toArray()).toEqual([0.5, 1.5, -0.6]);
    expect(rock.position.toArray()).toEqual([18, 2, -4]);
  });

  it('keeps missing exports and missing named pieces visible and permits a later successful retry', async () => {
    const scene = new Group(), chair = socket('stol'), tree = socket('gran-a');
    scene.add(chair, tree);
    const missing = assetsFor({ 'aventyr2/room': kit('bord') });
    expect(await installSharedModels(missing, scene)).toBe(false);
    expect(chair.getObjectByName('fallback')).toBeDefined();
    expect(tree.getObjectByName('fallback')).toBeDefined();
    const available = assetsFor({ 'aventyr2/room': kit('stol'), 'aventyr2/nature': kit('gran-a') });
    expect(await installSharedModels(available, scene)).toBe(true);
    expect(chair.getObjectByName('stol')).toBeDefined();
    expect(tree.getObjectByName('gran-a')).toBeDefined();
  });

  it('isolates a failed file from other kits and keeps that fallback eligible for retry', async () => {
    const scene = new Group(), chair = socket('stol'), tree = socket('gran-a');
    scene.add(chair, tree);
    const assets = assetsFor({ 'aventyr2/room': kit('stol'), 'aventyr2/nature': kit('gran-a') });
    assets.model.mockRejectedValueOnce(new Error('temporary missing room export'));
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      expect(await installSharedModels(assets, scene)).toBe(true);
      expect(chair.getObjectByName('fallback')).toBeDefined();
      expect(tree.getObjectByName('gran-a')).toBeDefined();
      expect(await installSharedModels(assets, scene)).toBe(true);
      expect(chair.getObjectByName('stol')).toBeDefined();
      expect(assets.model.mock.calls).toEqual([['aventyr2', 'room'], ['aventyr2', 'nature'], ['aventyr2', 'room']]);
    } finally { warning.mockRestore(); }
  });

  it('gives repeated buildings their own signs and lit windows without taking them from the source', async () => {
    const source = kit('olympia-hall', 'olympia-hall-name', 'olympia-hall-glow');
    const assets = assetsFor({ 'aventyr2/olympia': source });
    const scene = new Group(), left = socket('olympia-hall'), right = socket('olympia-hall');
    left.userData.fit = right.userData.fit = 2;
    scene.add(left, right);
    await installSharedModels(assets, scene);
    for (const suffix of ['name', 'glow']) {
      const name = `olympia-hall-${suffix}`;
      const a = left.getObjectByName(name) as Mesh, b = right.getObjectByName(name) as Mesh;
      expect(a).toBeDefined();
      expect(b).toBeDefined();
      expect(a).not.toBe(b);
      expect(source.getObjectByName(name)?.parent).toBe(source);
      expect((a.material as MeshBasicMaterial).isMeshBasicMaterial).toBe(true);
      expect(a.parent?.scale.x).toBe(2);
    }
  });

  it('keeps private models out of stand-in captures while still installing public furniture', async () => {
    const assets = assetsFor({ 'aventyr2/room': kit('bord'), 'private/tragubbar': kit('tragubbe'), 'private/mormor': kit('mormor') });
    const scene = new Group(), table = socket('bord'), carving = socket('tragubbe'), grandma = new Group();
    grandma.userData = { grandparent: 'mormor', dress: vi.fn() };
    scene.add(table, carving, grandma);
    expect(await installSharedModels(assets, scene, true)).toBe(true);
    expect(assets.model.mock.calls).toEqual([['aventyr2', 'room']]);
    expect(carving.getObjectByName('fallback')).toBeDefined();
    expect(grandma.userData.dress).not.toHaveBeenCalled();
    expect(await installSharedModels(assets, scene)).toBe(true);
    expect(carving.getObjectByName('tragubbe')).toBeDefined();
    expect(grandma.userData.dress).toHaveBeenCalledTimes(1);
  });

  it('reports a grandparent-only installation for shader warm-up and never dresses that actor twice', async () => {
    const assets = assetsFor({ 'private/morfar': kit('morfar') });
    const scene = new Group(), grandpa = new Group();
    grandpa.userData = { grandparent: 'morfar', dress: vi.fn() };
    scene.add(grandpa);
    expect(await installSharedModels(assets, scene)).toBe(true);
    expect(grandpa.userData.dress).toHaveBeenCalledTimes(1);
    expect(await installSharedModels(assets, scene)).toBe(false);
    expect(assets.model).toHaveBeenCalledTimes(1);
  });

  it('can replace falling cones without any other model sockets and reports the arrival for warm-up', async () => {
    const source = kit('kotte'), cone = source.getObjectByName('kotte') as Mesh;
    const geometry = cone.geometry;
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    const assets = assetsFor({ 'boot/forest-kit': source });
    const old = new BoxGeometry(1, 1, 1), drops = new InstancedMesh(old, new MeshStandardMaterial(), 3);
    drops.name = 'rain-drops';
    drops.userData.cones = true;
    const scene = new Group();
    scene.add(drops);
    expect(await installSharedModels(assets, scene)).toBe(true);
    expect(drops.geometry).not.toBe(old);
    expect(drops.geometry).not.toBe(geometry);
    drops.geometry.computeBoundingBox();
    const size = drops.geometry.boundingBox!.getSize(new Vector3());
    expect(size.y).toBeCloseTo(0.7);
    expect(await installSharedModels(assets, scene)).toBe(false);
    expect(assets.model).toHaveBeenCalledTimes(1);
  });
});
