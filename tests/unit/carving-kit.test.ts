import { readFileSync } from 'node:fs';
import { Box3, BufferGeometry, Color, Group, InstancedMesh, MeshStandardMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import type { Assets } from '../../src/render/assets';
import { CARVING_WARMTH } from '../../src/render/lift/fauna';
import { CARVING_KINDS, carvingKit, installCarvings, type CarvingKind } from '../../src/render/lift/fauna/carving-kit';
import { CARVINGS, herd } from '../../src/render/lift/fauna/shapes';
import { woodColoured } from '../../src/render/lift/materials/surface';

/**
 * Pappa's hidden carvings as they are whittled in Blender (art/blender/carvings.py, src/render/lift/fauna/carving-kit.ts;
 * Olov, 14 November 2026: "den lilla kaninen ... behöver modelleras och designas bättre", "kaninen på stenen i slutet
 * behöver få en bättre design"). Read here from the baked kit.
 */

const FILE = new URL('../../art/baked/boot/carvings.glb', import.meta.url);

async function model(): Promise<Group> {
  const data = readFileSync(FILE);
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  return gltf.scene;
}

/** A figure's corners, each where it is and how light its colour is (0 dark to 1 light). */
function corners(shape: BufferGeometry): { at: Vector3; light: number; colour: Color }[] {
  const position = shape.getAttribute('position');
  const colour = shape.getAttribute('color');
  return Array.from({ length: position.count }, (_, i) => {
    const c = new Color(colour.getX(i), colour.getY(i), colour.getZ(i));
    return { at: new Vector3().fromBufferAttribute(position, i), light: 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b, colour: c };
  });
}
/** How wide a figure is across (z) and along (x) in a band of its height. */
function band(all: { at: Vector3 }[], low: number, high: number): Box3 {
  return all.filter((c) => c.at.y >= low && c.at.y <= high).reduce((box, c) => box.expandByPoint(c.at), new Box3());
}

describe("Pappa's carvings, whittled in Blender", () => {
  it('has the hare, the bird and the nisse, each standing on the origin on its plinth, facing +x', async () => {
    const kit = carvingKit(await model());
    expect([...kit.keys()].sort()).toEqual([...CARVING_KINDS].sort());
    for (const kind of CARVING_KINDS) {
      const shape = kit.get(kind)!;
      shape.computeBoundingBox();
      const box = shape.boundingBox!;
      // Its plinth stands on the origin, and it is a figure of a few hundred facets: one small draw.
      expect(box.min.y, kind).toBeCloseTo(0, 2);
      expect(Math.abs(box.min.z + box.max.z), `${kind} is the same on both sides`).toBeLessThan(0.02);
      expect(shape.index!.count / 3, `${kind} triangles`).toBeGreaterThan(300);
      expect(shape.index!.count / 3, `${kind} triangles`).toBeLessThan(900);
      // The plinth is wider than what stands on it is at its foot, and low.
      const foot = band(corners(shape), 0, 0.02);
      expect(foot.max.x - foot.min.x, `${kind} plinth`).toBeGreaterThan(0.22);
    }
  });

  it('is plainly a hare: long ears a little apart, round haunches behind, a tucked tail and a small head', async () => {
    const hare = corners(carvingKit(await model()).get('hare')!);
    const top = Math.max(...hare.map((c) => c.at.y));
    // As tall as the code-built one was and a little more, its ears a third of it.
    expect(top).toBeGreaterThan(0.5);
    expect(top).toBeLessThan(0.62);
    // The ears: two, apart at their tips, each much narrower than the head under them, and well over it.
    const tips = band(hare, top - 0.05, top);
    const left = hare.filter((c) => c.at.y > top - 0.05 && c.at.z > 0.01);
    const right = hare.filter((c) => c.at.y > top - 0.05 && c.at.z < -0.01);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(tips.max.z - tips.min.z).toBeGreaterThan(0.06);
    expect(hare.filter((c) => c.at.y > top - 0.05 && Math.abs(c.at.z) < 0.01).length, 'a gap between the ears').toBe(0);
    const head = band(hare, 0.28, 0.35);
    const ears = band(hare, 0.42, 0.5);
    expect(head.max.x - head.min.x).toBeGreaterThan(0.12);
    // The ears stand over the back of the head, laid a little back: the muzzle reaches well in front of them.
    expect(head.max.x - ears.max.x).toBeGreaterThan(0.06);
    // The haunches: the widest of it, low and behind its middle; and the tail behind them.
    const haunch = band(hare, 0.08, 0.16);
    const chest = band(hare, 0.2, 0.26);
    expect(haunch.max.z - haunch.min.z).toBeGreaterThan(0.17);
    expect(haunch.max.z - haunch.min.z).toBeGreaterThan((chest.max.z - chest.min.z) * 1.2);
    expect(haunch.min.x).toBeLessThan(-0.15);
    // The head is small beside the body: under half as long.
    const body = band(hare, 0.05, 0.26);
    expect(head.max.x - head.min.x).toBeLessThan((body.max.x - body.min.x) * 0.6);
  });

  it('is pale warm wood with the burning iron’s marks: two eyes and a nose on the hare, and nothing bright or painted', async () => {
    const kit = carvingKit(await model());
    for (const kind of CARVING_KINDS) {
      const all = corners(kit.get(kind)!);
      const mean = all.reduce((sum, c) => sum.add(c.colour), new Color(0, 0, 0)).multiplyScalar(1 / all.length);
      // Wood, as the materials' lift knows it (matt, with its grain and the knife's facets on High).
      expect(woodColoured(mean), `${kind} #${mean.clone().convertLinearToSRGB().getHexString()}`).toBe(true);
      // Each facet its own tone: many tones, none of them the candy's or paint's.
      expect(new Set(all.map((c) => c.colour.getHexString())).size, kind).toBeGreaterThan(40);
      for (const c of all) expect(c.colour.g, kind).toBeLessThanOrEqual(c.colour.r + 0.02);
    }
    const hare = corners(kit.get('hare')!);
    const burnt = hare.filter((c) => c.light < 0.05);
    // An eye on each side of its head, and its nose at the tip of its muzzle, on its middle.
    const eyes = burnt.filter((c) => c.at.y > 0.3 && c.at.y < 0.37 && Math.abs(c.at.z) > 0.03);
    expect(eyes.some((c) => c.at.z > 0)).toBe(true);
    expect(eyes.some((c) => c.at.z < 0)).toBe(true);
    const nose = burnt.filter((c) => Math.abs(c.at.z) < 0.02 && c.at.x > 0.18);
    expect(nose.length).toBeGreaterThan(0);
    // The nisse is neither of the story's figures: no eyes on its head.
    const nisse = corners(kit.get('nisse')!);
    expect(nisse.filter((c) => c.light < 0.05 && c.at.y > 0.2).length).toBe(0);
  });

  it('takes the code-built figure’s place in its own mesh, and leaves it where the kit is missing', async () => {
    const scene = new Group();
    const meshes = new Map<CarvingKind, InstancedMesh>();
    for (const kind of CARVING_KINDS) {
      const mesh = herd(CARVINGS[kind]('#d6bf98'), 2, new MeshStandardMaterial({ vertexColors: true, flatShading: true }));
      mesh.userData.carvingKit = kind;
      meshes.set(kind, mesh);
      scene.add(mesh);
    }
    const before = new Map([...meshes].map(([kind, mesh]) => [kind, mesh.geometry]));
    const none = { manifest: async () => ({ packs: { boot: { files: {} } } }), model: async () => { throw new Error('no file'); } } as unknown as Assets;
    expect(await installCarvings(none, scene)).toBe(false);
    for (const [kind, mesh] of meshes) expect(mesh.geometry, kind).toBe(before.get(kind));

    const loaded = await model();
    const assets = { manifest: async () => ({ packs: { boot: { files: { 'carvings.glb': 1 } } } }), model: async () => loaded } as unknown as Assets;
    expect(await installCarvings(assets, scene)).toBe(true);
    for (const [kind, mesh] of meshes) {
      expect(mesh.geometry, kind).not.toBe(before.get(kind));
      expect(mesh.count).toBe(2);
      // Drawn with the same material and program: position, normal and colour, as the code-built one has.
      for (const name of ['position', 'normal', 'color']) expect(mesh.geometry.getAttribute(name), `${kind} ${name}`).toBeDefined();
      expect(mesh.geometry.getAttribute('color').itemSize).toBe(3);
    }
    // Asked again, nothing more is waiting.
    expect(await installCarvings(assets, scene)).toBe(false);
  });

  it('keeps a warmth of its own, more in the storm and at dusk, and low enough to stay carved wood to the materials’ lift', () => {
    expect(CARVING_WARMTH.night).toBeGreaterThan(CARVING_WARMTH.day);
    const c = new Color(CARVING_WARMTH.colour);
    // What gives off more light than this keeps its own look there (src/render/lift/materials/surface.ts `classify`).
    expect(CARVING_WARMTH.night * Math.max(c.r, c.g, c.b)).toBeLessThan(0.4);
    expect(c.r).toBeGreaterThan(c.g);
    expect(c.g).toBeGreaterThan(c.b);
  });
});
