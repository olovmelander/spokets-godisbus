import { readFileSync } from 'node:fs';
import { Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { carGlass } from '../../src/render/car-glass';
import { building } from '../../src/content/aventyr2/buildings';
import { installSharedModels } from '../../src/render/shared-models';
import type { Assets } from '../../src/render/assets';

async function kit() {
  const bytes = readFileSync(new URL('../../art/baked/aventyr2/props.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}

describe('the cars’ own glass', () => {
  it('replaces cabin-light covers with the modeled windows without inventing warm window lamps', async () => {
    const model = await kit(), made = building({ kind: 'car', x: 4, z: -14, lit: '' });
    const fallback = made.group.children[1]!;
    expect(made.panes).toBeNull();
    expect(made.group.userData.lamps).toBeUndefined();
    const assets = { manifest: async () => ({ packs: { aventyr2: { files: { 'props.glb': {} } } } }), model: async () => model } as unknown as Assets;
    await installSharedModels(assets, made.group);
    expect(fallback.parent).toBeNull();
    expect(made.group.children).toHaveLength(1);
    const glazing: Mesh[] = [];
    made.group.traverse(object => { if ((object as Mesh).isMesh && (object as Mesh).geometry.hasAttribute('carPane')) glazing.push(object as Mesh); });
    expect(glazing).toHaveLength(1);
    expect((glazing[0]!.material as MeshStandardMaterial).userData.carWet).toBe(true);
    // Houses retain their independently lit windows.
    const house = building({ kind: 'villa', x: 0, z: -10, lit: '' });
    expect(house.panes?.isMeshBasicMaterial).toBe(true);
    expect(house.group.userData.lamps.length).toBeGreaterThan(0);
  });

  for (const name of ['bil', 'bil-gra']) it(`${name}: styles both sides and windscreens, preserving body colours, lamps and wheel resources`, async () => {
    const model = await kit(), source = model.getObjectByName(name)!;
    const body = (source as Mesh).isMesh ? source as Mesh : source.children.find(object => (object as Mesh).isMesh) as Mesh;
    const originalGeometry = body.geometry, originalMaterial = body.material;
    const wheel = source.getObjectByName(`${name}-hjul-fram`)!.children.find(object => (object as Mesh).isMesh) as Mesh;
    const root = new Group(), copy = source.clone(); root.add(copy);
    root.position.set(40, 2, -17); root.rotation.y = .8; root.scale.setScalar(6.4);
    carGlass(root, name === 'bil');
    const styled = (copy as Mesh).isMesh ? copy as Mesh : copy.children.find(object => (object as Mesh).isMesh) as Mesh;
    const points = styled.geometry.getAttribute('carPoint'), mask = styled.geometry.getAttribute('carPane');
    expect(points).toBeDefined(); expect(mask).toBeDefined();
    const selected: Vector3[] = [];
    for (let i = 0; i < mask.count; i++) if (mask.getX(i)) selected.push(new Vector3().fromBufferAttribute(points, i));
    expect(selected.length).toBeGreaterThan(100);
    expect(selected.some(point => point.z > .5)).toBe(true);
    expect(selected.some(point => point.z < -.5)).toBe(true);
    expect(selected.some(point => Math.abs(point.z) < .35)).toBe(true);
    // The estate's rear quarter glass reaches farther back than the hatchback's.
    expect(selected.every(point => point.y > .9 && Math.abs(point.x) < (name === 'bil' ? 2.1 : 2.25))).toBe(true);
    expect(styled.geometry.getAttribute('color').array).toEqual(originalGeometry.getAttribute('color').array);
    expect(originalGeometry.hasAttribute('carPane')).toBe(false);
    expect(body.material).toBe(originalMaterial);
    expect((copy.getObjectByName(`${name}-hjul-fram`)!.children.find(object => (object as Mesh).isMesh) as Mesh).material).toBe(wheel.material);
    expect((styled.material as MeshStandardMaterial).transparent).toBe(false);
    expect((styled.material as MeshStandardMaterial).emissive.getHex()).toBe((originalMaterial as MeshStandardMaterial).emissive.getHex());
  });
});
