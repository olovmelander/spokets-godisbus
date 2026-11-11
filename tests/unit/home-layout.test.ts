import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, type Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { installPictures } from '../../src/content/aventyr2/render';
import { HOME_BATHROOM as BATHROOM, HOME_LAYOUT } from '../../src/content/home-layout';
import type { ChapterData } from '../../src/sim/types';
import type { Assets } from '../../src/render/assets';
import { built } from '../../src/render/dressing/built';
import { bank } from '../../src/render/dressing/ground';
import { PACK } from '../../src/render/extensions';
import { createHomeRoutine } from '../../src/render/home-routine';
import { installSharedModels } from '../../src/render/shared-models';
import { createStage } from '../../src/render/stage';
import { heightAt } from '../../src/render/dressing/kit';

const chapters = [prolog, epilog, stormkvall, morgonen];
const rooms = new Map<string, Awaited<ReturnType<typeof makeHome>>>();
const bounds = (object: Object3D) => new Box3().setFromObject(object, true);

async function readKit(file: string): Promise<Group> {
  const bytes = readFileSync(new URL(`../../art/baked/aventyr2/${file}.glb`, import.meta.url));
  return (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}

/** Production builders and model installation, without a WebGL context or private family assets. */
async function makeHome(chapter: ChapterData, assets: Assets) {
  const group = new Group(), house = built(chapter, true), routine = createHomeRoutine(chapter), floor = bank(chapter, 'wood');
  const stage = createStage(chapter, x => heightAt(chapter, x));
  group.add(house, routine.group, floor, stage.group);
  for (const [index, decor] of (chapter.decor ?? []).entries()) if (decor.look === 'homeEvening' || decor.look === 'aftermath') {
    const piece = PACK.spots.get(decor.look)?.({ ...decor, id: `decor:${index}`, verb: 'take' });
    expect(piece, `${chapter.id}: authored room furniture`).toBeTruthy();
    group.add(piece!.group);
  }
  const fallbackSofa = bounds(group.getObjectByName(chapter.id === 'morgonen' ? 'room:soffa-filt' : 'room:soffa')!);
  expect(await installSharedModels(assets, group, true)).toBe(true);
  group.updateMatrixWorld(true);
  return { chapter, group, house, routine, floor, fallbackSofa };
}

beforeAll(async () => {
  // Only geometry is inspected here. The browser review uses actual canvas drawing and the private family.
  const context: object = new Proxy(function () {}, { get: (_, key) => key === Symbol.toPrimitive ? () => 0 : context, apply: () => context, set: () => true });
  vi.stubGlobal('Path2D', class {});
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  installPictures();
  const kits = new Map(await Promise.all(['room', 'home-routine'].map(async file => [file, await readKit(file)] as const)));
  const assets = {
    manifest: async () => ({ packs: { aventyr2: { files: { 'room.glb': {}, 'home-routine.glb': {} } } } }),
    model: async (_pack: string, file: string) => kits.get(file)!,
  } as unknown as Assets;
  for (const chapter of chapters) rooms.set(chapter.id, await makeHome(chapter, assets));
});
afterAll(() => vi.unstubAllGlobals());

describe('the actual furnished home has physical clearances', () => {
  it('places the actual dining table and display shelf consistently in all four chapters', () => {
    const tableBounds: number[][] = [], shelfBounds: number[][] = [];
    for (const chapter of chapters) {
      const { group, house } = rooms.get(chapter.id)!;
      const table = group.getObjectByName('bord')!;
      expect(table, `${chapter.id}: installed public table`).toBeDefined();
      const tableBox = bounds(table), centre = tableBox.getCenter(new Vector3());
      expect(centre.x).toBeCloseTo(HOME_LAYOUT.dining.x);
      expect(centre.z).toBeCloseTo(HOME_LAYOUT.dining.z);
      tableBounds.push([...tableBox.min.toArray(), ...tableBox.max.toArray()]);
      const shelf = house.children.filter(child => child instanceof Mesh).find(child => {
        const box = bounds(child), size = box.getSize(new Vector3());
        return Math.abs(size.x - 9.8) < .01 && Math.abs(size.y - .16) < .01 && box.min.y > 5;
      });
      expect(shelf, `${chapter.id}: actual display shelf board`).toBeDefined();
      const shelfBox = bounds(shelf!);
      shelfBounds.push([...shelfBox.min.toArray(), ...shelfBox.max.toArray()]);
    }
    for (const list of [tableBounds, shelfBounds]) for (const placed of list.slice(1)) {
      placed.forEach((value, index) => expect(value).toBeCloseTo(list[0]![index]!));
    }
  });

  it.each(chapters)('$id: keeps the television out of the baked sofa', chapter => {
    const { group } = rooms.get(chapter.id)!;
    const sofa = group.getObjectByName(chapter.id === 'morgonen' ? 'soffa-filt' : 'soffa')!;
    const screen = group.getObjectByName('home-tv-programme')!;
    expect(sofa).toBeDefined(); expect(screen).toBeDefined();
    const sofaBox = bounds(sofa), screenBox = bounds(screen);
    // The old screen actually passed through the right upholstered arm, below its top.
    expect(sofaBox.intersectsBox(screenBox), `${chapter.id}: screen enters sofa`).toBe(false);
    expect(screenBox.min.x - sofaBox.max.x).toBeGreaterThan(.25);
    const television = group.getObjectByName('home-tv')!;
    expect(television, `${chapter.id}: installed public TV console/frame`).toBeDefined();
    const televisionBox = bounds(television);
    expect(sofaBox.intersectsBox(televisionBox), `${chapter.id}: console enters sofa`).toBe(false);
    expect(televisionBox.min.x - sofaBox.max.x).toBeGreaterThan(.25);
    expect(televisionBox.min.z - HOME_LAYOUT.wall.z).toBeGreaterThan(.2);
    expect(televisionBox.min.y).toBeCloseTo(HOME_LAYOUT.wall.floorY, 3);
    // The animated surface must stay just in front of its real backing when the entire TV is turned.
    const centre = screen.getWorldPosition(new Vector3());
    const front = new Vector3(0, 0, 1).transformDirection(screen.matrixWorld);
    const behind = new Raycaster(centre, front.negate(), 0, .3).intersectObject(television, true)[0];
    expect(behind, `${chapter.id}: no TV backing behind the programme`).toBeDefined();
    expect(behind!.distance).toBeGreaterThan(.005);
  });

  it.each(chapters)('$id: keeps the projecting window sill behind the baked sofa back', chapter => {
    const { group, house, fallbackSofa } = rooms.get(chapter.id)!;
    const sofa = group.getObjectByName(chapter.id === 'morgonen' ? 'soffa-filt' : 'soffa')!;
    // Find the actual merged joinery spanning the middle window, not a duplicate box from layout constants.
    const joinery = house.children.filter(child => child instanceof Mesh).find(child => {
      const box = bounds(child);
      return box.min.x < 21 && box.max.x > 21 && box.min.y > 3 && box.max.y > 8 && box.max.z < -7;
    });
    expect(joinery, `${chapter.id}: middle window joinery`).toBeDefined();
    const sofaBox = bounds(sofa), windowBox = bounds(joinery!);
    expect(sofaBox.intersectsBox(windowBox), `${chapter.id}: sill enters sofa back`).toBe(false);
    expect(sofaBox.min.z - windowBox.max.z).toBeGreaterThan(.1);
    expect(fallbackSofa.intersectsBox(windowBox), `${chapter.id}: sill enters loading fallback`).toBe(false);
  });

  it.each(chapters)('$id: has a real doorway in the wall, with valid outward normals and UVs', chapter => {
    const { house } = rooms.get(chapter.id)!;
    const wall = house.children.find(child => child.renderOrder === -2) as Mesh;
    expect(wall).toBeDefined();
    // Rays must pass through the aperture but stop at both piers and the lintel. A painted door fails this.
    for (const dx of [-1.5, 0, 1.5]) for (const y of [.2, 2.8, 5.6]) {
      const hits = new Raycaster(new Vector3(BATHROOM.x + dx, y, 0), new Vector3(0, 0, -1), 0, 12).intersectObject(house, true);
      // Include window glass and trim too: cutting only the wall while retaining the old window34
      // would still cover the bathroom mirror and upper doorway.
      expect(hits, `${chapter.id}: wall covers doorway (${dx}, ${y})`).toHaveLength(0);
    }
    for (const [dx, y] of [[-2.2, 2.8], [2.2, 2.8], [0, 6.5]]) {
      expect(new Raycaster(new Vector3(BATHROOM.x + dx!, y!, 0), new Vector3(0, 0, -1), 0, 12).intersectObject(wall).length).toBeGreaterThan(0);
    }
    const normal = wall.geometry.getAttribute('normal'), uv = wall.geometry.getAttribute('uv');
    for (let i = 0; i < normal.count; i++) {
      expect(normal.getZ(i)).toBeGreaterThan(.99);
      expect(Number.isFinite(uv.getX(i)) && Number.isFinite(uv.getY(i))).toBe(true);
      expect(uv.getX(i)).toBeGreaterThanOrEqual(-1e-6); expect(uv.getX(i)).toBeLessThanOrEqual(1 + 1e-6);
      expect(uv.getY(i)).toBeGreaterThanOrEqual(-1e-6); expect(uv.getY(i)).toBeLessThanOrEqual(1 + 1e-6);
    }
  });

  it('keeps the whole door swing clear of the TV and the actual walking approach', () => {
    const { group, routine } = rooms.get(epilog.id)!;
    const door = group.getObjectByName('bathroom-door')!;
    const television = group.getObjectByName('home-tv')!;
    expect(television, 'the actual separately installed console and frame').toBeDefined();
    const televisionBox = bounds(television), flags = new Set(['teeth']);
    let reached = false;
    for (let i = 0; i <= 160; i++) {
      const seconds = BATHROOM.walkEnd * i / 160;
      routine.update(flags, { id: 'bathroom', seconds }, seconds);
      group.updateMatrixWorld(true);
      const person = routine.body({ x: BATHROOM.x, y: HOME_LAYOUT.wall.floorY })!;
      // A conservative corridor around the boy's body; this does not claim private skin/hand contact coverage.
      const corridor = new Box3(person.position.clone().add(new Vector3(-.32, .1, -.26)), person.position.clone().add(new Vector3(.32, 2.9, .26)));
      expect(bounds(door).intersectsBox(corridor), `door crosses Elof at ${seconds.toFixed(3)}s`).toBe(false);
      expect(bounds(door).intersectsBox(televisionBox), `door crosses TV at ${seconds.toFixed(3)}s`).toBe(false);
      if (person.position.z < BATHROOM.doorZ) reached = true;
    }
    expect(reached).toBe(true);
    expect(routine.body({ x: BATHROOM.x, y: 0 })!.position.z).toBeCloseTo(BATHROOM.feetZ);
  });

  it.each(chapters)('$id: supports the entire bathroom route without a gap or coplanar tile/wood surface', chapter => {
    const { group, routine, floor } = rooms.get(chapter.id)!;
    routine.update(new Set(['teeth']), { id: 'bathroom', seconds: BATHROOM.walkEnd }, BATHROOM.walkEnd);
    group.updateMatrixWorld(true);
    for (const dx of [-.26, 0, .26]) for (let i = 0; i <= 100; i++) {
      const z = BATHROOM.feetZ * i / 100;
      const hits = new Raycaster(new Vector3(BATHROOM.x + dx, .3, z), new Vector3(0, -1, 0), 0, 1).intersectObjects([floor, routine.group], true);
      expect(hits.length, `${chapter.id}: no floor at ${z}`).toBeGreaterThan(0);
      const top = hits[0]!;
      expect(top.point.y).toBeGreaterThanOrEqual(-.02);
      expect(top.point.y).toBeLessThanOrEqual(.08);
      for (const hit of hits.slice(1)) if (hit.object !== top.object) {
        // The shallow threshold intentionally meets the wood along one edge. Only parallel floor faces can
        // fight over a patch of pixels; do not reject the sloped transition for touching its supporting floor.
        const topNormal = top.face!.normal.clone().transformDirection(top.object.matrixWorld);
        const belowNormal = hit.face!.normal.clone().transformDirection(hit.object.matrixWorld);
        if (topNormal.dot(belowNormal) > .999999) {
          expect(Math.abs(top.point.y - hit.point.y), `${chapter.id}: overlapping surfaces at z=${z}`).toBeGreaterThan(.004);
        }
      }
    }
  });

  it.each([[390, 844], [844, 390]])('frames brushing through the actual open doorway at %i×%i', (width, height) => {
    const { group, house, routine } = rooms.get(epilog.id)!;
    const seconds = BATHROOM.brushStart + 1;
    routine.update(new Set(['teeth']), { id: 'bathroom', seconds }, seconds);
    group.updateMatrixWorld(true);
    const definition = epilog.scenes!.find(scene => scene.id === 'bathroom')!;
    const shot = definition.stage!.shots!.filter(key => key.at <= seconds).at(-1)!;
    const camera = new PerspectiveCamera(30, width! / height!, .1, 140);
    const away = Math.max(shot.height!, shot.width! / camera.aspect) / 2 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(shot.x!, shot.y! + (shot.eye ?? 0), (shot.z ?? 0) + away);
    camera.lookAt(shot.x!, shot.y!, shot.z ?? 0); camera.updateMatrixWorld(true);
    expect(camera.position.z).toBeGreaterThan(BATHROOM.doorZ + .5);
    const feet = routine.body({ x: BATHROOM.x, y: 0 })!.position;
    expect(feet.z).toBeLessThan(BATHROOM.doorZ - 1);
    // Legs, face and both hands: the bathroom shell and the real house wall must not mask them.
    for (const [dx, y] of [[0, .2], [0, 2.8], [-.35, 1.8], [.35, 1.8]]) {
      const target = feet.clone().add(new Vector3(dx!, y!, 0));
      const projected = target.clone().project(camera);
      expect(Math.abs(projected.x)).toBeLessThan(.9); expect(Math.abs(projected.y)).toBeLessThan(.9);
      const direction = target.clone().sub(camera.position);
      const blockers = new Raycaster(camera.position, direction.clone().normalize(), 0, direction.length() - .02).intersectObjects([house, routine.group], true);
      expect(blockers.map(hit => hit.object.name), `bathroom hides body point ${dx},${y}`).toEqual([]);
    }
  });
});
