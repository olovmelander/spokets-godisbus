import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Mesh, Vector3, type MeshStandardMaterial } from 'three';
import { installPictures } from '../../src/content/aventyr2/render';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { boulderShape, fieldBoulder } from '../../src/content/aventyr2/field-boulder';
import { moverProp } from '../../src/render/props';

/**
 * The stone under Klonk's seesaw (Olov, 14 November 2026: "Kan vi förbättra designen och texturen på stenen vid
 * gungbrädan?"). It was a low lump of a few dozen flat grey facets with a green blob set on it. Now it is a field stone:
 * round, with worn flats, granite's speckled skin, lichen, moss on its weather side and a dark foot
 * (src/content/aventyr2/field-boulder.ts). To the simulation it is the thing it was.
 */

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

installPictures();
const pivot = billsta.movers!.find((m) => m.id === 'bi-pivot')!;

describe('the stone under the seesaw', () => {
  it('is drawn as a field stone, as wide and as high as the thing the simulation pushes', () => {
    expect(pivot.look).toBe('boulder');
    expect(pivot).toMatchObject({ width: 1.2, height: 0.6, verb: 'push' });
    const prop = moverProp(pivot)!;
    const stone = prop.getObjectByName('field-boulder') as Mesh;
    expect(stone).toBeDefined();
    const box = stone.geometry.boundingBox!;
    // Its top is where he stands if he lands on it, and nothing of it is higher.
    expect(box.max.y).toBeCloseTo(pivot.height, 2);
    // As wide as the thing, give or take a tenth; its foot goes on a little under the ground.
    expect(box.max.x - box.min.x).toBeGreaterThan(pivot.width * 0.95);
    expect(box.max.x - box.min.x).toBeLessThan(pivot.width * 1.2);
    expect(box.min.y).toBeLessThan(-0.03);
    expect(box.min.y).toBeGreaterThan(-0.2);
    // It lies deeper across the path than it is wide: heavy, most of it behind the plane he walks in.
    expect(box.max.z - box.min.z).toBeGreaterThan(pivot.width * 1.2);
    expect(-box.min.z).toBeGreaterThan(box.max.z);
    // One draw, and its shade on the ground.
    const meshes: Mesh[] = [];
    prop.traverse((node) => { if (node instanceof Mesh) meshes.push(node); });
    expect(meshes.map((m) => m.name).sort()).toEqual(['field-boulder', 'field-boulder-shade']);
  });

  it('is round, with worn flats: a smooth skin of some two thousand faces, not a few dozen flat ones', () => {
    const shape = boulderShape({ width: 1.2, height: 0.6, depth: 1.7 });
    expect(shape.index!.count / 3).toBeGreaterThan(1500);
    // Smooth: its corners are shared, each with one normal.
    expect(shape.getAttribute('position').count).toBeLessThan(shape.index!.count / 3);
    const at = shape.getAttribute('position'), normal = shape.getAttribute('normal');
    // Hardly undercut, so that it stands in the ground: next to none of its skin looks down, but for its buried foot
    // (a ball's would, over a third of it).
    let down = 0;
    for (let i = 0; i < at.count; i++) if (normal.getY(i) < -0.35 && at.getY(i) > 0.05) down++;
    expect(down / at.count).toBeLessThan(0.04);
    // Flats: a good part of its skin lies in a few planes (corners whose normals agree within a few degrees with two
    // dozen others). A plain egg of the same measures has none.
    const normals = Array.from({ length: normal.count }, (_, i) => new Vector3().fromBufferAttribute(normal, i));
    const flats: Vector3[] = [];
    let onFlat = 0;
    for (const n of normals) {
      if (n.y < -0.9) continue; // its buried foot
      let agree = 0;
      for (const other of normals) if (other.dot(n) > 0.996) agree++;
      if (agree < 25) continue;
      onFlat++;
      if (!flats.some((f) => f.dot(n) > 0.97)) flats.push(n.clone());
    }
    expect(onFlat / normals.length).toBeGreaterThan(0.12);
    // Its level top, and at least three worn into its sides.
    expect(flats.filter((f) => f.y < 0.95).length).toBeGreaterThanOrEqual(3);
  });

  it('has a trough across its top where the seesaw\'s trunk lies, behind the plane he walks in', () => {
    const prop = moverProp(pivot)!;
    const stone = prop.getObjectByName('field-boulder') as Mesh;
    const at = stone.geometry.getAttribute('position');
    const topAt = (z: number) => {
      let top = -1;
      for (let i = 0; i < at.count; i++) if (Math.abs(at.getZ(i) - z) < 0.07 && Math.abs(at.getX(i)) < 0.3) top = Math.max(top, at.getY(i));
      return top;
    };
    // The trunk is drawn 0.34 behind the plane, its middle at the stone's top and some 0.14 thick there.
    expect(topAt(-0.34)).toBeLessThan(pivot.height - 0.08);
    expect(topAt(-0.34)).toBeGreaterThan(pivot.height - 0.2);
    // In the plane he walks in, its top is its full height.
    expect(topAt(0.1)).toBeCloseTo(pivot.height, 1);
  });

  it('has moss on its weather side and none at its foot, and a skin of its own that goes with it', () => {
    const shape = boulderShape({ width: 1.2, height: 0.6, depth: 1.7 });
    const at = shape.getAttribute('position'), moss = shape.getAttribute('moss');
    const mean = (pick: (i: number) => boolean) => {
      let sum = 0, n = 0;
      for (let i = 0; i < at.count; i++) if (pick(i)) { sum += moss.getX(i); n++; }
      return sum / Math.max(1, n);
    };
    // Up and behind on the left, where the weather comes from: mossy. In front on the right: bare rock and lichen.
    expect(mean((i) => at.getX(i) < -0.2 && at.getZ(i) < -0.2 && at.getY(i) > 0.3)).toBeGreaterThan(0.45);
    expect(mean((i) => at.getX(i) > 0.2 && at.getZ(i) > 0.2)).toBeLessThan(0.08);
    expect(mean((i) => at.getY(i) < 0.05)).toBeLessThan(0.02);
    const stone = fieldBoulder({ width: 1.2, height: 0.6, depth: 1.7 }).getObjectByName('field-boulder') as Mesh;
    const material = stone.material as MeshStandardMaterial;
    // Its granite, lichen and moss are drawn by where a point is on the stone itself: pushed, it takes its skin along.
    expect(material.customProgramCacheKey()).toContain('field-boulder');
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <color_fragment>\n#include <roughnessmap_fragment>' };
    material.onBeforeCompile(shader as never, null as never);
    expect(shader.vertexShader).toContain('stoneAt = position');
    for (const part of ['stoneMica', 'stoneQuartz', 'stoneLichen', 'stoneOrange', 'stoneMossDeep']) expect(shader.uniforms[part], part).toBeDefined();
    expect(shader.fragmentShader).toContain('roughnessFactor = stoneSeen.a');
  });

  it('standing in water it is wet and bare low down: no moss near the waterline, and no shade on the water', () => {
    const def = { width: 3.4, height: 1.5, depth: 2.6, awash: 0.5 };
    const shape = boulderShape(def);
    const at = shape.getAttribute('position'), moss = shape.getAttribute('moss');
    for (let i = 0; i < at.count; i++) if (at.getY(i) < def.awash + 0.1) expect(moss.getX(i)).toBe(0);
    expect(fieldBoulder(def).getObjectByName('field-boulder-shade')).toBeUndefined();
  });
});
