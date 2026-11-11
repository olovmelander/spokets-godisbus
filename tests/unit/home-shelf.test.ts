import { existsSync, readFileSync } from 'node:fs';
import { Box3, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import type { Assets } from '../../src/render/assets';
import { built } from '../../src/render/dressing/built';
import { installSharedModels } from '../../src/render/shared-models';

beforeEach(() => {
  const canvas: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : canvas, apply: () => canvas, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => canvas }) });
});
afterEach(() => vi.unstubAllGlobals());

it.each([prolog, epilog, stormkvall, morgonen])('keeps $id’s shelf and supports clear of the window joinery', chapter => {
  const room = built(chapter, true); room.updateMatrixWorld(true);
  const shelf = new Box3().setFromObject(room.getObjectByName('home-carving-shelf')!);
  // Find the actual merged frame, including its 5.8-wide sill, rather than assuming its material or name.
  const frame = room.children.find(object => {
    if (!(object instanceof Mesh)) return false;
    const bounds = new Box3().setFromObject(object);
    return Math.abs(bounds.min.x - 6.5) < .001 && Math.abs(bounds.max.x - 12.3) < .001 && bounds.max.y > 8.7 && bounds.max.y < 8.8;
  }) as Mesh;
  expect(frame).toBeDefined();
  const position = frame.geometry.getAttribute('position'), index = frame.geometry.getIndex()!;
  for (let start = 0; start < index.count; start += 3) {
    const triangle = new Box3();
    for (let corner = 0; corner < 3; corner++) triangle.expandByPoint(new Vector3().fromBufferAttribute(position, index.getX(start + corner)).applyMatrix4(frame.matrixWorld));
    expect(triangle.intersectsBox(shelf), `window triangle ${start / 3}`).toBe(false);
  }
  const brackets = room.getObjectByName('home-shelf-brackets') as Mesh;
  const points = brackets.geometry.getAttribute('position');
  const supports = [new Box3(), new Box3()];
  for (let i = 0; i < points.count; i++) {
    const point = new Vector3().fromBufferAttribute(points, i).applyMatrix4(brackets.matrixWorld);
    supports[point.x < chapter.shelf!.x ? 0 : 1]!.expandByPoint(point);
  }
  for (const support of supports) {
    expect(support.max.y).toBeCloseTo(shelf.min.y, 5);
    expect(support.min.z).toBeCloseTo(-9, 5);
  }
  expect(supports[0]!.max.x).toBeLessThan(6.7);
  expect(supports[1]!.min.x).toBeGreaterThan(12.1);
});

const carvings = new URL('../../art/private/baked/private/tragubbar.glb', import.meta.url);
it.skipIf(!existsSync(carvings))('supports the actual feet of all nine private carvings without moving their marks', async () => {
  const bytes = readFileSync(carvings), model = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  const room = built({ ...prolog, shelf: { ...prolog.shelf!, filled: true } }, true);
  const pieces = room.children.filter(object => object.userData.model === 'tragubbe' || object.userData.model?.startsWith('hylla-'));
  expect(pieces).toHaveLength(9);
  const marks = pieces.map(piece => piece.position.toArray());
  await installSharedModels({ manifest: async () => ({ packs: { private: { files: { 'tragubbar.glb': bytes.length } } } }), model: async () => model } as unknown as Assets, room);
  room.updateMatrixWorld(true);
  const shelf = new Box3().setFromObject(room.getObjectByName('home-carving-shelf')!);
  pieces.forEach((piece, i) => {
    expect(piece.position.toArray()).toEqual(marks[i]);
    const bottom = new Box3().setFromObject(piece).min.y;
    let count = 0;
    piece.traverse(object => {
      if (!(object instanceof Mesh)) return;
      const points = object.geometry.getAttribute('position');
      for (let i = 0; i < points.count; i++) {
        const point = new Vector3().fromBufferAttribute(points, i).applyMatrix4(object.matrixWorld);
        if (point.y > bottom + .035) continue;
        count++;
        expect(point.x, piece.userData.model).toBeGreaterThan(shelf.min.x);
        expect(point.x, piece.userData.model).toBeLessThan(shelf.max.x);
        expect(point.z, piece.userData.model).toBeGreaterThan(shelf.min.z);
        expect(point.z, piece.userData.model).toBeLessThan(shelf.max.z);
      }
    });
    expect(count).toBeGreaterThan(0);
    expect(Math.abs(bottom - shelf.max.y)).toBeLessThan(.006);
  });
});
