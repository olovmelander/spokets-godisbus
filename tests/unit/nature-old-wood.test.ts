import { readFileSync } from 'node:fs';
import { Box3, Group, type Mesh, MeshStandardMaterial, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { billsta } from '../../src/content/aventyr2/chapters/billsta';
import { olympia } from '../../src/content/aventyr2/chapters/olympia';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { stormskog } from '../../src/content/aventyr2/chapters/stormskog';
import type { Assets } from '../../src/render/assets';
import { oldWood } from '../../src/render/old-wood';
import { ROOT_HOLLOW, rootHollow } from '../../src/render/root-hollow';
import { installSharedModels } from '../../src/render/shared-models';
import type { ChapterData } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

/**
 * The big pieces of nature Olov named on 14 November 2026: the sawn stump ("förbättra även designen och texturen på
 * stubben"), the lying tree at the end of Billsta and of Stormens öga ("det liggande trädet i slutet"), and
 * Stormskogen's root plate ("Rotvältan ... behöver modelleras bättre och få snyggare design och texturer"). They were
 * a few hundred triangles each, in flat colours; now they are modelled in the nature kit, and every face of them says
 * what it is, for the game to draw its bark, rings, earth and moss (src/render/old-wood.ts).
 */
const OLD_WOOD = ['stubbe-sagad', 'stubbe-gnagd', 'lag-mossig', 'rotvalta'] as const;
/** What a face is, as the kit writes it (art/blender/a2-nature.py). */
const KIND = { spruce: 1, birch: 2, end: 3, bare: 4, earth: 5, moss: 6, root: 7, stone: 8, gnawed: 9 };

async function kit(): Promise<Object3D> {
  const file = readFileSync(new URL('../../art/baked/aventyr2/nature.glb', import.meta.url));
  return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
}

/** Every corner of a model, in the game's own axes (y up, its front towards +z), with what its face is (written in sixteenths). */
function corners(made: Object3D): { at: Vector3; kind: number }[] {
  const out: { at: Vector3; kind: number }[] = [];
  made.updateWorldMatrix(true, true);
  made.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const at = mesh.geometry.getAttribute('position');
    const bark = mesh.geometry.getAttribute('_bark');
    for (let i = 0; i < at.count; i++) out.push({ at: new Vector3().fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld), kind: bark ? Math.round(bark.getX(i) * 16) : -1 });
  });
  return out;
}

function triangles(made: Object3D): number {
  let count = 0;
  made.traverse((object) => {
    const mesh = object as Mesh;
    if (mesh.isMesh) count += (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3;
  });
  return count;
}

/** A model placed as a chapter's decor places it. */
function placed(made: Object3D, d: { at: { x: number; y: number }; z?: number; turn?: number; scale?: number }): Group {
  const holder = new Group();
  holder.position.set(d.at.x, d.at.y, d.z ?? -0.6);
  holder.rotation.y = d.turn ?? 0;
  holder.scale.setScalar(d.scale ?? 1);
  holder.add(made.clone());
  return holder;
}

/** How near the path a placed model comes, of what is over the ground he walks on there. */
function nearest(chapter: ChapterData, holder: Object3D): number {
  let most = -Infinity;
  for (const { at } of corners(holder)) if (at.y > heightAt(chapter, at.x) + 0.02) most = Math.max(most, at.z);
  return most;
}

describe('the nature kit\'s old wood', () => {
  it('models each of them, and says of every face what it is', async () => {
    const scene = await kit();
    for (const name of OLD_WOOD) {
      const made = scene.getObjectByName(name)!;
      expect(made, name).toBeDefined();
      // A few hundred triangles of flat colour before: forms now.
      expect(triangles(made), name).toBeGreaterThan(1800);
      made.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh) return;
        expect((mesh.material as MeshStandardMaterial).name, name).toBe('kit-bark');
        expect(mesh.geometry.getAttribute('_bark'), name).toBeDefined();
      });
    }
    const kinds = (name: string) => new Set(corners(scene.getObjectByName(name)!).map((c) => c.kind));
    // The sawn stump: bark, its sawn top, torn fibres at the hinge, roots and moss.
    for (const kind of [KIND.spruce, KIND.end, KIND.bare, KIND.root, KIND.moss]) expect(kinds('stubbe-sagad').has(kind), `stubbe-sagad ${kind}`).toBe(true);
    // The beaver's: birch bark, the cut point, and the chips in their heap of earth.
    for (const kind of [KIND.birch, KIND.gnawed, KIND.bare, KIND.earth]) expect(kinds('stubbe-gnagd').has(kind), `stubbe-gnagd ${kind}`).toBe(true);
    // The windfall: bark, bare wood where it has sloughed and where it broke, moss, and the ground it lies in.
    for (const kind of [KIND.spruce, KIND.bare, KIND.moss, KIND.earth]) expect(kinds('lag-mossig').has(kind), `lag-mossig ${kind}`).toBe(true);
    // The root plate: earth, roots, stones, the turf's moss, torn root ends, and the stem's bark.
    for (const kind of [KIND.earth, KIND.root, KIND.stone, KIND.moss, KIND.bare, KIND.spruce]) expect(kinds('rotvalta').has(kind), `rotvalta ${kind}`).toBe(true);
  });

  it('keeps the stumps\' tops where the chapters measure from them, and the windfall as long as the log it was', async () => {
    const scene = await kit();
    // The sawn stump: its back cut level at 1.3, the hinge's splinters a little over it, its stem 1.1 thick.
    const sawn = corners(scene.getObjectByName('stubbe-sagad')!);
    const cut = sawn.filter((c) => c.kind === KIND.end).map((c) => c.at.y);
    expect(Math.max(...cut)).toBeLessThan(1.6);
    expect(Math.min(...cut)).toBeGreaterThan(1.05);
    expect(cut.filter((y) => Math.abs(y - 1.3) < 0.04).length / cut.length).toBeGreaterThan(0.5);
    expect(Math.max(...sawn.map((c) => c.at.y))).toBeLessThan(1.75);
    const waist = sawn.filter((c) => c.kind === KIND.spruce && c.at.y > 1.1).map((c) => Math.hypot(c.at.x, c.at.z));
    expect(Math.max(...waist)).toBeLessThan(1.3);
    expect(Math.min(...waist)).toBeGreaterThan(0.95);
    // The gnawed one: its point at 2.7, as it was.
    const gnawed = new Box3().setFromObject(scene.getObjectByName('stubbe-gnagd')!);
    expect(gnawed.max.y).toBeGreaterThan(2.62);
    expect(gnawed.max.y).toBeLessThan(2.72);
    // The windfall: 14 long about its middle, its stem's top about where the log's was.
    const log = corners(scene.getObjectByName('lag-mossig')!);
    const bark = log.filter((c) => c.kind === KIND.spruce);
    expect(Math.min(...log.map((c) => c.at.x))).toBeGreaterThan(-7.3);
    expect(Math.max(...log.map((c) => c.at.x))).toBeLessThan(7.3);
    expect(Math.max(...log.map((c) => c.at.x)) - Math.min(...log.map((c) => c.at.x))).toBeGreaterThan(13.4);
    expect(Math.max(...bark.map((c) => c.at.y))).toBeGreaterThan(1.3);
    expect(Math.max(...bark.map((c) => c.at.y))).toBeLessThan(1.8);
    // It lies in the ground, not on its branches over it.
    expect(Math.min(...bark.map((c) => c.at.y))).toBeLessThan(0);
  });

  it('stands and lies behind the path wherever a chapter puts one, so he never walks through it', async () => {
    const scene = await kit();
    let seen = 0;
    for (const chapter of [alven, billsta, olympia, stormoga]) {
      for (const d of chapter.decor ?? []) {
        if (d.look !== 'kit' || !OLD_WOOD.includes(d.word as (typeof OLD_WOOD)[number])) continue;
        expect(nearest(chapter, placed(scene.getObjectByName(d.word!)!, d)), `${chapter.id}: ${d.word} at ${d.at.x}`).toBeLessThan(-0.5);
        seen++;
      }
    }
    expect(seen).toBeGreaterThanOrEqual(11);
  });

  it('has the lying tree at the end of Billsta and of Stormens öga, the kit\'s windfall', () => {
    const last = (chapter: ChapterData) => (chapter.decor ?? []).filter((d) => d.word === 'lag-mossig').sort((a, b) => b.at.x - a.at.x)[0]!;
    expect(last(billsta).at.x).toBeGreaterThan(billsta.goalX);
    // On the shore where the family gathers at the end; far enough back that none of them stands in it.
    const tree = last(stormoga);
    expect(tree.at.x).toBeGreaterThan(stormoga.goalX);
    expect(tree.z!).toBeLessThan(-5);
  });
});

describe('Stormskogen\'s root plate', () => {
  const hollow = stormskog.spots!.find((spot) => spot.id === 'ss:hollow')!;
  const box = (object: Object3D) => new Box3().setFromObject(object);

  it('asks for the kit\'s root plate, and stands a plain one behind the hollow until it has come', () => {
    const group = rootHollow(stormskog)!;
    group.updateMatrixWorld(true);
    const plate = group.getObjectByName('root-plate')!;
    expect(plate.userData.model).toBe('rotvalta');
    expect(plate.userData.turn).toBe(ROOT_HOLLOW.turn);
    const waiting = box(plate);
    expect(waiting.max.y).toBeGreaterThan(hollow.at.y + 3);
    expect(waiting.max.z).toBeLessThan(-0.5);
    expect(rootHollow({ ...stormskog, spots: [] })).toBeNull();
  });

  it('is a felled spruce\'s: wider than him and over his head, its stem lying away behind it, and all of it behind the plane he moves in', async () => {
    const source = await kit();
    const assets = {
      manifest: async () => ({ packs: { aventyr2: { files: { 'nature.glb': {} } } } }),
      model: async () => source,
    } as unknown as Assets;
    const group = rootHollow(stormskog)!;
    await installSharedModels(assets, group, true);
    group.updateMatrixWorld(true);
    const plate = group.getObjectByName('root-plate')!;
    expect(plate.getObjectByName('rotvalta')).toBeDefined();
    const all = corners(plate);
    // The plate itself: its earth, its roots and its stones.
    const face = all.filter((c) => c.kind === KIND.earth || c.kind === KIND.root || c.kind === KIND.stone);
    expect(Math.max(...face.map((c) => c.at.y))).toBeGreaterThan(hollow.at.y + 4);
    expect(Math.max(...face.map((c) => c.at.x)) - Math.min(...face.map((c) => c.at.x))).toBeGreaterThan(4);
    // The stem lies away from it into the forest, to the right, where he is going.
    const stem = all.filter((c) => c.kind === KIND.spruce);
    expect(Math.min(...stem.map((c) => c.at.z))).toBeLessThan(-9);
    expect(Math.max(...stem.map((c) => c.at.x))).toBeGreaterThan(hollow.at.x + 5);
    // Nothing of it covers him, Klonk, the candy or the thought: all that is over the ground he walks on is behind him.
    let near = -Infinity;
    for (const { at } of all) if (at.y > heightAt(stormskog, at.x) + 0.02) near = Math.max(near, at.z);
    expect(near).toBeLessThan(-0.5);
  });
});

describe('old wood seen close', () => {
  it('draws on the kit\'s `kit-bark` material from what its corners say, and wets it in the rain', () => {
    const material = new MeshStandardMaterial();
    oldWood(material);
    const shader = { uniforms: {} as Record<string, unknown>, vertexShader: '#include <project_vertex>', fragmentShader: '#include <normal_fragment_maps>' };
    (material.onBeforeCompile as unknown as (shader: unknown, renderer: unknown) => void)(shader, null);
    expect(shader.vertexShader).toContain('attribute vec3 _bark');
    expect(shader.fragmentShader).toContain('oldWoodWet');
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['oldWoodDetail', 'oldWoodWet']));
    // Once only: a second call leaves it as it is.
    const patched = material.onBeforeCompile;
    oldWood(material);
    expect(material.onBeforeCompile).toBe(patched);
  });

  it('is given to the kit\'s models as they are installed, in place of the plain weather', async () => {
    const source = await kit();
    const assets = {
      manifest: async () => ({ packs: { aventyr2: { files: { 'nature.glb': {} } } } }),
      model: async () => source,
    } as unknown as Assets;
    const scene = new Group();
    const holder = new Group();
    holder.userData.model = 'stubbe-sagad';
    scene.add(holder);
    await installSharedModels(assets, scene, true);
    let found = 0;
    holder.traverse((object) => {
      const material = (object as Mesh).material as MeshStandardMaterial | undefined;
      if (!material) return;
      expect(material.userData.ownWeather).toBe(true);
      expect(material.customProgramCacheKey()).toContain('old-wood');
      expect(material.customProgramCacheKey()).not.toContain('weathered');
      found++;
    });
    expect(found).toBeGreaterThan(0);
  });
});
