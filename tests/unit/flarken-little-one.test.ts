import { Box3, BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3, type Object3D } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { BARK_BOAT, barkBoat } from '../../src/content/aventyr2/bark-boat';
import { afloat } from '../../src/content/aventyr2/kit';
import { ADVENTURE2, loadAdventure2 } from '../../src/content/chapters';
import type { Assets } from '../../src/render/assets';
import { PACK, type ViewExtra } from '../../src/render/extensions';
import { installSharedModels } from '../../src/render/shared-models';
import { openWaterAt } from '../../src/render/water';
import type { SceneFrame } from '../../src/sim/scene';
import type { ChapterData } from '../../src/sim/types';

/**
 * The little carving on the water (Olov, 14 November 2026: "När Elof säger ”Där är Lillgubben, där ån börjar” sitter
 * Lillgubben på något. När Lillgubben sedan syns igen i slutet flyter den däremot direkt på vattnet. Kan vi göra detta
 * enhetligt?"). It was on a stone at Flärken's lookout, gone once Elof had passed the tower, and at the end and down
 * Älven it floated by itself, on nothing. Now it is on a piece of pine bark wherever it is on water
 * (src/content/aventyr2/bark-boat.ts): caught against a stone at the lookout, there until the outlet takes the bark from
 * that very place, and under it on Älven; and the bark lies in the water, never over it or under it.
 */
beforeAll(async () => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  await loadAdventure2();
});
afterAll(() => vi.unstubAllGlobals());

const chapterOf = (id: string) => ADVENTURE2.find((chapter) => chapter.id === id)!;

/** A chapter's storm as the view holds it: its extras in a scene, played a frame at a time. */
function staged(chapter: ChapterData, at: { x: number; y: number }) {
  const scene = new Scene();
  const extras = PACK.extras.map((make) => make({ chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() }))
    .filter((extra): extra is ViewExtra => extra !== null);
  const camera = new PerspectiveCamera();
  camera.position.set(at.x, 6, 20);
  return {
    scene,
    frame(flags: ReadonlySet<string>, clock: number, moment: SceneFrame | null = null, dt = 1 / 60) {
      for (const extra of extras) extra.update({ dt, clock, flags, x: at.x, y: at.y, camera, still: false, tier: 'mid', riding: false, scene: moment });
      scene.updateMatrixWorld(true);
    },
  };
}

const shown = (node: Object3D) => { for (let n: Object3D | null = node; n; n = n.parent) if (!n.visible) return false; return true; };
/** The carving and the bark under it, among what is drawn under `root`: where its feet are, and the bark's box. */
function afloatUnder(root: Object3D) {
  const bark = root.getObjectByName('bark-boat')!;
  const carving = root.getObjectByName('little-trägubbe')!;
  expect(bark, 'a piece of bark').toBeDefined();
  expect(carving, 'the little carving').toBeDefined();
  return { bark, carving, feet: carving.getWorldPosition(new Vector3()), box: new Box3().setFromObject(bark) };
}

describe('the little carving on its piece of bark', () => {
  it('is one piece of bark: longer and wider than the carving, thick, its top where the carving stands', () => {
    const bark = barkBoat();
    const box = new Box3().setFromObject(bark);
    const size = box.getSize(new Vector3());
    // The carving is 0.52 tall and 0.3 across: the bark is plainly something it is on.
    expect(size.x).toBeGreaterThan(0.9);
    expect(size.z).toBeGreaterThan(0.45);
    expect(size.x).toBeGreaterThan(size.z * 1.5);
    expect(box.min.y).toBeCloseTo(-BARK_BOAT.thick, 5);
    // Its top is at its origin where the carving stands, its rim curled up a little over that.
    expect(box.max.y).toBeGreaterThan(0.01);
    expect(box.max.y).toBeLessThan(0.08);
    expect(BARK_BOAT.sunk).toBeGreaterThan(0.03);
    expect(BARK_BOAT.sunk).toBeLessThan(BARK_BOAT.thick - 0.03);
    // The family's carving takes the stand-in's place round it, and the bark stays.
    expect(bark.userData.keep).toBe(0);
  });

  it("is seen from Flärken's tower on its bark against a stone, and stays there until the current takes it", () => {
    const chapter = chapterOf('flarken');
    const sighting = chapter.storm!.sightings![0]!;
    const flight = chapter.storm!.flybys!.find((f) => f.on === 'sjon:current')!;
    // One story: the sighting ends on the very flag that begins the flight, from the same place, as big.
    expect(sighting.who).toBe('lillgubbe');
    expect(sighting.on).toBe('sjon:seen');
    expect(sighting.until).toBe(flight.on);
    expect(flight.who).toBe('lillgubbe');
    expect(afloat(flight)).toBe(true);
    expect(flight.from.x).toBe(sighting.at.x);
    expect(flight.z ?? -4).toBe(sighting.z);
    expect(flight.size).toBe(sighting.size);
    const water = openWaterAt(chapter, sighting.at.x)!;
    expect(sighting.at.y).toBe(water);

    const stage = staged(chapter, { x: 156, y: 3.3 });
    const root = stage.scene.getObjectByName('sighting')!;
    // Not before the lookout's flash.
    stage.frame(new Set(), 1);
    expect(shown(root)).toBe(false);
    // From the flash on, past the tower and the gap, as long as the current has not taken him: there, on his bark.
    for (const flags of [['sjon:seen'], ['sjon:seen', 'beat:sjon:lookout', 'beat:sjon:gap', 'placed:sjon-stone', 'placed:sjon-bark']]) {
      stage.frame(new Set(flags), 2);
      expect(shown(root), flags.join()).toBe(true);
      const { feet, box } = afloatUnder(root);
      // His feet on the bark's top, the bark in the water: some of it over the water, some under.
      expect(feet.y).toBeGreaterThan(water + 0.05);
      expect(feet.y - box.min.y).toBeCloseTo(BARK_BOAT.thick * sighting.size!, 1);
      expect(box.min.y).toBeLessThan(water - 0.02);
      expect(box.max.y).toBeGreaterThan(water + 0.05);
      // The bark is under him and reaches out past him on both sides: it is seen.
      expect(box.min.x).toBeLessThan(feet.x - 0.5);
      expect(box.max.x).toBeGreaterThan(feet.x + 0.5);
    }
  });

  it('is carried off by the outlet on that bark, from where it lay, in the water all the way', () => {
    const chapter = chapterOf('flarken');
    const sighting = chapter.storm!.sightings![0]!;
    const flight = chapter.storm!.flybys!.find((f) => f.on === 'sjon:current')!;
    const stage = staged(chapter, { x: 184.3, y: 0.6 });
    const root = stage.scene.getObjectByName('sighting')!;
    const flying = stage.scene.getObjectByName('flyby:sjon:current')!;
    const moment = (seconds: number) => ({ id: 'sjon:strommen', seconds }) as SceneFrame;
    const seen = new Set(['sjon:seen']);
    stage.frame(seen, 10, moment(0.5));
    expect(shown(root)).toBe(true);
    expect(flying.visible).toBe(false);
    const before = afloatUnder(root);
    // The current: the one at the stone is gone at once, and the flight is there in its place, on its bark.
    const taken = new Set(['sjon:seen', 'sjon:current']);
    stage.frame(taken, 10 + 1 / 60, moment(0.72));
    expect(shown(before.carving)).toBe(false);
    expect(shown(before.bark)).toBe(false);
    // (The stone it was caught on stays in the stream.)
    expect(shown(root)).toBe(true);
    expect(root.children.some((child) => child instanceof Mesh && shown(child))).toBe(true);
    expect(flying.visible).toBe(true);
    const after = afloatUnder(flying);
    expect(after.feet.x).toBeCloseTo(before.feet.x, 0);
    expect(Math.abs(after.feet.y - before.feet.y)).toBeLessThan(0.12);
    expect(after.feet.z).toBeCloseTo(before.feet.z, 1);
    expect(after.carving.getWorldScale(new Vector3()).x).toBeCloseTo(before.carving.getWorldScale(new Vector3()).x, 3);
    // Down the å: the bark under him and in the water at every moment, bob and all.
    let last = after.feet.x;
    for (let t = 2 / 60; t < flight.seconds * 0.95; t += 1 / 30) {
      stage.frame(taken, 10 + t, moment(0.7 + t), 1 / 30);
      const { feet, box } = afloatUnder(flying);
      const water = openWaterAt(chapter, feet.x)!;
      // (He rocks on it as it goes, so his feet swing a little about his middle: on, give or take that.)
      expect(feet.x).toBeGreaterThanOrEqual(last - 0.15);
      last = Math.max(last, feet.x);
      expect(box.min.y, `under water at ${feet.x.toFixed(1)}`).toBeLessThan(water);
      expect(box.max.y, `over water at ${feet.x.toFixed(1)}`).toBeGreaterThan(water + 0.03);
      expect(feet.y).toBeGreaterThan(water);
    }
    expect(last).toBeGreaterThan(sighting.at.x + 12);
  });

  it('keeps its bark when the family\'s own carving takes the stand-in\'s place', async () => {
    const chapter = chapterOf('flarken');
    const stage = staged(chapter, { x: 184.3, y: 0.6 });
    const flying = stage.scene.getObjectByName('flyby:sjon:current')!;
    const bark = flying.getObjectByName('bark-boat')!;
    const figure = bark.parent!;
    const model = new Group(), carving = new Mesh(new BoxGeometry(0.3, 0.52, 0.3), new MeshBasicMaterial());
    carving.name = 'lillgubbe'; carving.position.y = 0.26; model.add(carving);
    const assets: Assets = {
      manifest: async () => ({ version: 1, packs: { private: { bytes: 1, files: { 'tragubbar.glb': 1 } } } }),
      model: async () => model,
      restoreTextures: async () => {},
      textureInfo: () => ({ managed: 0, released: 0, cpuBytes: 0, restores: 0 }),
    };
    await installSharedModels(assets, figure);
    expect(figure.getObjectByName('lillgubbe')).toBeDefined();
    expect(bark.parent).toBe(figure);
    stage.scene.updateMatrixWorld(true);
    expect(new Box3().setFromObject(bark).max.y - figure.getWorldPosition(new Vector3()).y).toBeLessThan(0.15);
  });

  it('is on the same bark down Älven, lying in the river wherever the flight was written', () => {
    const chapter = chapterOf('alven');
    const flights = chapter.storm!.flybys!.filter((f) => f.who === 'lillgubbe');
    expect(flights.length).toBeGreaterThanOrEqual(2);
    for (const flight of flights) {
      expect(afloat(flight), flight.on).toBe(true);
      const stage = staged(chapter, { x: flight.from.x, y: 0.4 });
      const flying = stage.scene.getObjectByName(`flyby:${flight.on}`)!;
      const flags = new Set([flight.on]);
      // (A flight whose flag is set as the picture opens is one already seen, in a game taken up: it is not played.)
      stage.frame(new Set(), 4.9);
      stage.frame(flags, 5);
      for (let t = 1 / 30; t < flight.seconds * 0.9; t += 1 / 15) {
        stage.frame(flags, 5 + t, null, 1 / 15);
        expect(flying.visible, `${flight.on} at ${t.toFixed(2)}`).toBe(true);
        const { feet, box } = afloatUnder(flying);
        const water = openWaterAt(chapter, feet.x)!;
        expect(box.min.y, `${flight.on}: under water at ${feet.x.toFixed(1)}`).toBeLessThan(water);
        expect(box.max.y, `${flight.on}: over water at ${feet.x.toFixed(1)}`).toBeGreaterThan(water + 0.02);
      }
    }
  });
});
