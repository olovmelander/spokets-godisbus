import { readFileSync } from 'node:fs';
import { Box3, Mesh, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it, vi } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import type { Assets } from '../../src/render/assets';
import { heightAt, landscape, surfaceAt } from '../../src/render/dressing/kit';
import { forestLandmarks } from '../../src/render/forest-kit';
import { fitOutdoorLandmarks } from '../../src/render/outdoor-models';
import { installSharedModels } from '../../src/render/shared-models';

// Contact geometry does not need a browser canvas for its procedural mineral texture.
vi.mock('../../src/render/dressing/ground', () => ({ granite: () => null }));

describe('the garden boulder', () => {
  it('rests on continuous lawn while keeping the playable top stone for footsteps', () => {
    const chapter = COURSES.garden!;
    expect(surfaceAt(chapter, 103)).toBe('stone');
    const land = landscape(chapter);
    expect(surfaceAt(land, 103)).toBeUndefined();
    expect(heightAt(land, 103)).toBe(0);
    expect(heightAt(chapter, 103)).toBe(1.3);
  });

  it('supports both boots across its complete collision top after its rounded model replaces the fallback', () => {
    const chapter = COURSES.garden!;
    const group = forestLandmarks(chapter);
    fitOutdoorLandmarks(chapter, group);
    const holder = group.getObjectByName('landmark:stone')!;
    // The loader keeps the continuous outer stone when replacing its temporary core.
    for (const child of [...holder.children]) if (typeof child.userData.keep !== 'number') holder.remove(child);
    group.updateMatrixWorld(true);
    const ray = new Raycaster();
    const stone = chapter.landmarks!.find(mark => mark.look === 'stone')!;
    for (let x = stone.from + 0.01; x < stone.to; x += 0.1) for (const z of [-0.1, 0.1]) {
      const top = heightAt(chapter, x);
      ray.set(new Vector3(x, top + 1, z), new Vector3(0, -1, 0));
      const contact = ray.intersectObject(group, true)[0];
      expect(contact, `boot at x=${x.toFixed(2)}, z=${z}`).toBeDefined();
      expect(contact!.point.y).toBeCloseTo(top, 5);
    }
  });

  it('wraps the actual authored core with one continuous stone from the boots to the lawn', async () => {
    const bytes = Uint8Array.from(readFileSync(new URL('../../art/baked/aventyr2/nature.glb', import.meta.url)));
    const source = await new GLTFLoader().parseAsync(bytes.buffer, '');
    const assets = {
      manifest: async () => ({ packs: { aventyr2: { files: { 'nature.glb': {} } } } }),
      model: async () => source.scene,
    } as unknown as Assets;
    const chapter = COURSES.garden!;
    const group = forestLandmarks(chapter);
    fitOutdoorLandmarks(chapter, group);
    await installSharedModels(assets, group, true);
    group.updateMatrixWorld(true);
    const skin = group.getObjectByName('garden-stone-skin') as Mesh;
    const native = group.getObjectByName('block-a')!;
    expect(native).toBeDefined();
    expect(group.getObjectByName('garden-stone-shoulder')).toBeUndefined();
    // The asymmetric native export is grounded and inset, rather than dangling below an added cap.
    const bounds = new Box3().setFromObject(native);
    expect(bounds.min.y).toBeCloseTo(0, 5);
    expect(bounds.max.y).toBeCloseTo(1.04, 5);
    expect(bounds.min.x).toBeGreaterThan(101);
    expect(bounds.max.x).toBeLessThan(105);
    expect(new Box3().setFromObject(skin).min.y).toBeLessThan(0);
    const ray = new Raycaster();
    for (let x = 101.01; x < 105; x += 0.1) for (const z of [-0.1, 0.1]) {
      ray.set(new Vector3(x, 2.3, z), new Vector3(0, -1, 0));
      const contact = ray.intersectObject(group, true)[0];
      expect(contact, `stone at x=${x.toFixed(2)}, z=${z}`).toBeDefined();
      expect(contact!.object).toBe(skin);
      expect(contact!.point.y).toBeCloseTo(1.3, 5);
    }
    // The visible front belongs to that same mesh at every height, including below the native crown.
    // A thin floating strip or a shoulder with a gap fails these horizontal contact rays.
    for (let x = 101.05; x < 105; x += 0.2) for (const y of [0.02, 0.25, 0.55, 0.85, 1.15]) {
      ray.set(new Vector3(x, y, 2), new Vector3(0, 0, -1));
      const contact = ray.intersectObject(group, true)[0];
      expect(contact, `continuous face at x=${x.toFixed(2)}, y=${y}`).toBeDefined();
      expect(contact!.object).toBe(skin);
      expect(contact!.point.z).toBeGreaterThan(0.2);
    }
    // The skin encloses the actual core at its centre; it is not a separate slab suspended over it.
    ray.set(new Vector3(103, 2.3, -1.15), new Vector3(0, -1, 0));
    const outer = ray.intersectObject(skin)[0]!;
    const core = ray.intersectObject(native, true)[0]!;
    expect(core).toBeDefined();
    expect(outer.point.y).toBeGreaterThan(core.point.y);
    expect(outer.point.y - core.point.y).toBeLessThan(0.5);
  });
});
