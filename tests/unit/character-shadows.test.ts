import { describe, expect, it } from 'vitest';
import { DirectionalLight, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Scene, Vector3, WebGLRenderTarget, DepthTexture, type WebGLRenderer, type InstancedMesh } from 'three';
import { CHARACTER_SHADOW_SIZE, createCharacterShadows } from '../../src/render/character-shadows';
import { setBakedShade } from '../../src/render/forest-shadows';

function fixture() {
  const scene = new Scene();
  const sun = new DirectionalLight(); sun.position.set(-6, 5, 8); scene.add(sun);
  const renderer = { shadowMap: { enabled: false, type: -1 } } as unknown as WebGLRenderer;
  const shadows = createCharacterShadows(renderer, scene, sun);
  return { scene, sun, renderer, shadows };
}

describe('bounded character shadows', () => {
  it('keeps one fixed High map and disposes both colour and depth when leaving High', () => {
    const { shadows, sun, renderer } = fixture();
    shadows.setTier('high');
    expect(sun.shadow.mapSize.toArray()).toEqual([CHARACTER_SHADOW_SIZE, CHARACTER_SHADOW_SIZE]);
    expect(renderer.shadowMap.enabled).toBe(true);
    const target = new WebGLRenderTarget(1024, 1024, { depthTexture: new DepthTexture(1024, 1024) });
    sun.shadow.map = target;
    let colourDisposed = 0, depthDisposed = 0;
    target.addEventListener('dispose', () => colourDisposed++);
    target.depthTexture!.addEventListener('dispose', () => depthDisposed++);
    shadows.setTier('mid');
    expect(sun.shadow.map).toBeNull();
    expect(colourDisposed).toBe(1); expect(depthDisposed).toBe(1);
    expect(renderer.shadowMap.enabled).toBe(false);
    expect(shadows.info().contact).toBe(true);
    shadows.setTier('low'); expect(shadows.info().contact).toBe(false);
  });

  it('shadows only visible characters, ignores hidden ancestors, and respects world scale and support height', () => {
    const { shadows, scene } = fixture();
    const person = new Group(); person.position.set(3, 2, 0); person.scale.setScalar(2); scene.add(person);
    const hiddenParent = new Group(); hiddenParent.visible = false; const hidden = new Group(); hiddenParent.add(hidden); scene.add(hiddenParent);
    const far = new Group(); far.position.x = 200; scene.add(far);
    shadows.add({ object: person, height: 1, radius: .3, groundY: () => 0 });
    shadows.add({ object: hidden, height: 1, radius: .3 });
    shadows.add({ object: far, height: 1, radius: .3 });
    shadows.setTier('high'); shadows.update(3, 1, 10);
    expect(shadows.info()).toMatchObject({ characters: 1, casters: 1 });
    const blobs = scene.getObjectByName('character-blobs') as InstancedMesh;
    expect(blobs.geometry.getAttribute('shadowFade').getY(0)).toBe(0);
    person.position.y = 0;
    shadows.update(3, 1, 10);
    expect(blobs.geometry.getAttribute('shadowFade').getY(0)).toBe(1);
    person.scale.setScalar(0);
    shadows.update(3, 1, 10);
    expect(shadows.info().characters).toBe(0);
  });

  it('keeps the authored light direction and uses only one instanced proxy caster', () => {
    const { shadows, sun, scene } = fixture();
    const expected = sun.position.clone().normalize();
    const ground = new Mesh(new PlaneGeometry(), new MeshStandardMaterial()); ground.castShadow = true;
    const unlit = new Mesh(new PlaneGeometry(), new MeshBasicMaterial()); scene.add(ground, unlit);
    shadows.prepareReceivers();
    expect(ground.receiveShadow).toBe(true); expect(ground.castShadow).toBe(false);
    expect(unlit.receiveShadow).toBe(false);
    shadows.setTier('high');
    for (const [x, y, span] of [[0, 0, 10], [120, 30, 15], [-5, -12, 22]]) {
      shadows.update(x!, y!, span!);
      const actual = new Vector3().subVectors(sun.position, sun.target.position).normalize();
      expect(actual.distanceTo(expected)).toBeLessThan(1e-12);
    }
    const casters: string[] = [];
    scene.traverse((object) => { if (object instanceof Mesh && object.castShadow) casters.push(object.name); });
    expect(casters).toEqual(['character-shadow-casters']);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
  });

  it('whitelists world casters through repeated warmups and keeps far-tree shadow rays ahead of the near plane', () => {
    const scene = new Scene();
    const tree = new Mesh(new PlaneGeometry(), new MeshStandardMaterial());
    tree.userData.casts = true;
    const prop = new Mesh(new PlaneGeometry(), new MeshStandardMaterial());
    prop.castShadow = true;
    scene.add(tree, prop);
    const sun = new DirectionalLight(); sun.position.set(-7, 5, -4); scene.add(sun);
    const renderer = { shadowMap: { enabled: false, type: -1 } } as unknown as WebGLRenderer;
    const shadows = createCharacterShadows(renderer, scene, sun);
    shadows.setTier('high');
    shadows.prepareReceivers(); shadows.prepareReceivers();
    expect(tree.castShadow).toBe(true);
    expect(prop.castShadow).toBe(false);
    shadows.update(63, 0, 10);
    sun.updateWorldMatrix(true, false);
    sun.shadow.updateMatrices(sun);
    // A trunk at z=-22 occludes the sun seen from z=5 at this point 64 EL towards the light.
    const intercept = new Vector3(63 - 7 * 6.75, 5 * 6.75, -22).project(sun.shadow.camera);
    for (const axis of ['x', 'y', 'z'] as const) expect(Math.abs(intercept[axis])).toBeLessThan(1);
    expect(sun.shadow.mapSize.toArray()).toEqual([1024, 1024]);
    shadows.setTier('mid'); expect(renderer.shadowMap.enabled).toBe(false);
  });

  it('switches baked shade with the tier, including ground installed after a tier change', () => {
    const { scene, shadows } = fixture();
    shadows.setTier('high');
    const ground = new Mesh(new PlaneGeometry(), new MeshStandardMaterial());
    const original = new Float32Array(ground.geometry.getAttribute('position').count * 3).fill(.8);
    const shaded = original.map((value) => value * .7);
    ground.geometry.setAttribute('color', ground.geometry.getAttribute('position').clone());
    ground.geometry.getAttribute('color').array.set(original);
    ground.userData.shadowBake = { original, shaded, active: false };
    setBakedShade(ground, true);
    scene.add(ground);
    shadows.prepareReceivers();
    expect(ground.geometry.getAttribute('color').array).toEqual(original);
    for (const tier of ['low', 'mid', 'high'] as const) {
      shadows.setTier(tier); shadows.prepareReceivers();
      expect(ground.geometry.getAttribute('color').array).toEqual(tier === 'high' ? original : shaded);
    }
  });
});
