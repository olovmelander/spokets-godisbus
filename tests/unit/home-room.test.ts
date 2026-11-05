import { BoxGeometry, BufferGeometry, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import type { Assets } from '../../src/render/assets';
import { built } from '../../src/render/dressing/built';
import { createEpilogueStage } from '../../src/render/epilogue-stage';
import { roomThings } from '../../src/render/home-room';
import { installSharedModels } from '../../src/render/shared-models';

const kit = (...names: string[]) => {
  const root = new Group();
  for (const name of names) {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshStandardMaterial());
    mesh.name = name;
    root.add(mesh);
  }
  return root;
};

describe('the same home in both adventures', () => {
  it.each([prolog, epilog, stormkvall])('keeps $id’s room at its own floor when a preview starts outside', (chapter) => {
    const canvas: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : canvas, apply: () => canvas, set: () => true });
    vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => canvas }) });
    try {
      const original = built(chapter, true);
      const moved = built({ ...chapter, spawn: { x: chapter.house!.to + 20, y: -7 } }, true);
      for (const room of [original, moved]) {
        // Neither the garden's lower ground nor the epilogue's raised stairs may move the kitchen.
        expect(room.getObjectByName('home-continuous-floor')!.position.y).toBeCloseTo(-0.015);
        const wall = room.children.find(child => child.renderOrder === -2)!;
        expect(wall.position.y).toBe(11);
      }
    } finally { vi.unstubAllGlobals(); }
  });

  it('loads the public room in a public preview, once, while retaining each piece’s authored location', async () => {
    const room = roomThings({ sofa: 24.4, lamp: 18.2, plant: 0.6, drawings: -20.6, rug: 5.5, blanket: false });
    const model = vi.fn(async () => kit('soffa', 'golvlampa', 'krukvaxt'));
    const assets = { model, manifest: async () => ({ packs: { aventyr2: { files: { 'room.glb': 1 } } } }) } as unknown as Assets;
    expect(await installSharedModels(assets, room, true)).toBe(true);
    expect(model).toHaveBeenCalledTimes(1);
    for (const [name, x, z] of [['soffa', 24.4, -6.6], ['golvlampa', 18.2, -7.4], ['krukvaxt', 0.6, -7.8]] as const) {
      const holder = room.getObjectByName(`room:${name}`)!;
      expect(holder.children).toHaveLength(1);
      expect(holder.children[0]!.position.toArray()).toEqual([x, 0, z]);
      expect(holder.getObjectByName(name)).toBeDefined();
    }
  });

  it('blinks the installed carving’s eyes without changing the shared model, its wood or its mouth', async () => {
    const stage = createEpilogueStage(epilog.epilogue);
    const geometry = new BufferGeometry();
    // A packed mesh: two small dark upper-face patches, a dark lower mouth and pale wood defining its bounds.
    geometry.setAttribute('position', new Float32BufferAttribute([
      -0.5, 0, -0.5, 0.5, 1, 0.5, 0, 0.5, 0.4,
      -0.15, 0.78, 0.4, -0.2, 0.82, 0.4, -0.15, 0.86, 0.4,
      0.15, 0.82, 0.4, 0.2, 0.86, 0.4, 0.15, 0.90, 0.4,
    ], 3));
    geometry.setAttribute('color', new Float32BufferAttribute([
      0.6, 0.4, 0.2, 0.6, 0.4, 0.2, 0.02, 0.01, 0.01,
      ...Array.from({ length: 6 }, () => [0.02, 0.01, 0.01]).flat(),
    ], 3));
    const source = new Group();
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true }));
    mesh.name = 'lillgubbe'; source.add(mesh);
    const assets = {
      model: async () => source,
      manifest: async () => ({ packs: { private: { files: { 'tragubbar.glb': 1 } } } }),
    } as unknown as Assets;
    expect(await installSharedModels(assets, stage.group)).toBe(true);
    const figure = stage.group.getObjectByName('epilogue-lillgubbe')!;
    const replacement = figure.getObjectByName('lillgubbe') as Mesh;
    stage.update(new Set(), 1.4, false);
    expect(figure.visible).toBe(false);
    stage.update(new Set(['dots']), 1.36, false);
    expect(figure.visible).toBe(true);
    expect(figure.getObjectByName('lillgubbe')).toBeDefined();
    const positions = replacement.geometry.getAttribute('position');
    expect(replacement.geometry).not.toBe(geometry);
    expect(positions.getY(3)).toBeGreaterThan(0.81);
    expect(positions.getY(5) - positions.getY(3)).toBeLessThan(0.004);
    expect(geometry.getAttribute('position').getY(3)).toBeCloseTo(0.78);
    for (const i of [0, 1, 2]) expect(positions.getY(i)).toBe(geometry.getAttribute('position').getY(i));
    const closed = positions.getY(3);
    stage.update(new Set(['dots']), 1.36, true);
    expect(positions.getY(3)).toBe(closed);
    stage.update(new Set(['dots']), null, false);
    expect(positions.getY(3)).toBeCloseTo(0.78);
  });
});
