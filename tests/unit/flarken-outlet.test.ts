import { Box3, BoxGeometry, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PerspectiveCamera, Scene, Vector3, type ShaderMaterial } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';
import { afloat, flightAt } from '../../src/content/aventyr2/kit';
import { outletShape } from '../../src/content/aventyr2/outlet';
import { ADVENTURE2, STORY, loadAdventure2 } from '../../src/content/chapters';
import { heightAt } from '../../src/render/dressing/kit';
import { PLACES } from '../../src/render/dressing';
import { PACK } from '../../src/render/extensions';
import { createWater, openWaterAt } from '../../src/render/water';
import { installSharedModels } from '../../src/render/shared-models';
import type { Assets } from '../../src/render/assets';
import type { ChapterData } from '../../src/sim/types';

/**
 * Flärken's end (src/content/aventyr2/chapters/flarken.ts): the lake runs out past the jetty's end into its å, which
 * takes the little one and the old one after him (Olov: "När ån tar med sig lillgubben vill jag se en riktig å"). It
 * was a wall of ground nine of him high at the jetty's end, and they went into it.
 */
beforeAll(async () => {
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  await loadAdventure2();
});
afterAll(() => vi.unstubAllGlobals());

const flarken = () => ADVENTURE2.find((chapter) => chapter.id === 'flarken')!;
const runOf = (chapter: ChapterData) => {
  const look = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
  const water = createWater(chapter, look.water, look.sun.from, { place: look.id });
  return ((water.group.children[0] as Mesh).material as ShaderMaterial).uniforms.run!.value as { x: number; y: number; z: number; w: number };
};

describe("Flärken's outlet, the å", () => {
  it('lies past the jetty\'s end: the lake\'s water, out past every picture at the end, and the end wall far beyond', () => {
    const chapter = flarken();
    const outlet = chapter.water![chapter.water!.length - 1]!;
    const lake = chapter.water!.find((w) => w.from > 140)!;
    const end = chapter.ground[chapter.ground.length - 1]!;
    expect(outlet.y).toBe(lake.y);
    // The jetty ends at the outlet, a step over its water, and the old one's end post stands on it before that.
    expect(heightAt(chapter, outlet.from - 0.1)).toBeCloseTo(0.6, 5);
    expect(heightAt(chapter, outlet.from + 0.1)).toBeLessThan(outlet.y - 4);
    // The picture at the end looks a little over 10 ahead of him at most, on the widest screen: the wall is well past.
    expect(end.x - chapter.goalX).toBeGreaterThan(30);
    expect(outlet.to).toBe(end.x);
    // The figures go down it.
    for (const f of chapter.storm!.flybys!.filter((one) => one.on === 'sjon:current' || one.on === 'sjon:log-run')) {
      expect(f.to.x).toBeGreaterThan(outlet.from);
      expect(f.to.x).toBeLessThan(outlet.to);
    }
  });

  it('looks over the foreground jetty at the whole little carving, and keeps both broken ends in the stone picture on a phone', () => {
    const chapter = flarken();
    const sighting = chapter.storm!.sightings![0]!;
    const lookout = chapter.scenes!.find((scene) => scene.id === 'sjon:utkik')!.stage!.shots![0]!;
    const stone = chapter.scenes!.find((scene) => scene.id === 'sjon:plopp')!.stage!.shots![0]!;
    for (const aspect of [390 / 844, 844 / 390]) {
      const cameraFor = (shot: typeof lookout) => {
        const camera = new PerspectiveCamera(30, aspect, 0.1, 140);
        const height = Math.max(shot.height, (shot.width ?? 0) / aspect);
        camera.position.set(shot.x, shot.y + (shot.eye ?? 0), (shot.z ?? 0) + height / 2 / Math.tan(Math.PI / 12));
        camera.lookAt(shot.x, shot.y, shot.z ?? 0);
        camera.updateMatrixWorld();
        return camera;
      };
      const camera = cameraFor(lookout);
      // The jetty used to hide everything below his eyes in portrait. Even the stone's waterline is seen over it.
      const bottom = new Vector3(sighting.at.x, sighting.at.y, sighting.z);
      const through = (0 - camera.position.z) / (bottom.z - camera.position.z);
      const crossing = camera.position.clone().lerp(bottom, through);
      expect(crossing.y).toBeGreaterThan(heightAt(chapter, crossing.x) + 0.05);
      for (const y of [bottom.y, bottom.y + 1.5]) {
        const screen = new Vector3(bottom.x, y, bottom.z).project(camera);
        expect(Math.abs(screen.x)).toBeLessThan(0.85);
        expect(Math.abs(screen.y)).toBeLessThan(0.85);
      }
      const carried = chapter.storm!.flybys!.find((f) => f.on === 'sjon:log-run')!;
      const logTop = new Vector3(carried.from.x, carried.from.y - 0.5 * carried.size!, carried.z);
      for (const sceneId of ['sjon:strommen', 'sjon:stocken']) {
        const shot = chapter.scenes!.find((scene) => scene.id === sceneId)!.stage!.shots![0]!;
        const view = cameraFor(shot);
        const ray = (0 - view.position.z) / (logTop.z - view.position.z);
        const atDeck = view.position.clone().lerp(logTop, ray);
        expect(atDeck.y).toBeGreaterThan(heightAt(chapter, atDeck.x) + 0.05);
      }
      const puzzleCamera = cameraFor(stone);
      // Elof at the push, the near broken end and the far broken end are all in the picture together.
      for (const x of [166.2, 173.4, 180.4]) {
        const screen = new Vector3(x, 0.5, 0).project(puzzleCamera);
        expect(Math.abs(screen.x)).toBeLessThan(0.95);
      }
    }
  });

  it('carries both figures on the stream in a held close view, with the next event after each passage', () => {
    const chapter = flarken();
    for (const [sceneId, trigger, after] of [['sjon:strommen', 'sjon:current', 'sjon:downstream'], ['sjon:stocken', 'sjon:log-run', 'sjon:both-downstream']]) {
      const scene = chapter.scenes!.find((s) => s.id === sceneId)!;
      const flyby = chapter.storm!.flybys!.find((f) => f.on === trigger)!;
      expect(scene.hold).toBe(true);
      expect(scene.stage!.shots!.every((shot) => shot.z === flyby.z)).toBe(true);
      expect(afloat(flyby)).toBe(true);
      expect(flyby.seconds).toBeGreaterThanOrEqual(5);
      const begins = scene.cues!.find((cue) => cue.flag === trigger)!.at;
      expect(begins).toBeGreaterThanOrEqual(scene.stage!.shots![0]!.move!);
      const finishes = scene.cues!.find((cue) => cue.flag === after)!.at;
      expect(finishes - begins).toBeGreaterThan(flyby.seconds);
      // Nothing in its path adds an airborne arc or spins it over the river; the log and the little carving bob.
      for (let t = 0; t <= 1; t += 0.1) {
        const at = flightAt(flyby, t);
        expect(at.y).toBeLessThanOrEqual(flyby.from.y);
        expect(at.y).toBeGreaterThanOrEqual(flyby.to.y - 1e-6);
        expect(at.z).toBe(-4);
      }
    }
    expect(chapter.scenes!.find((scene) => scene.id === 'sjon:stocken')!.on).toBe('sjon:downstream');
    expect(chapter.beats!.find((beat) => beat.id === 'sjon:log')!.on).toBe('sjon:log-run');
    expect(chapter.beats!.find((beat) => beat.id === 'sjon:floated')!.on).toBe('sjon:both-downstream');
  });

  it('keeps the old carving on its log when the private model replaces the stand-in', async () => {
    const chapter = flarken(), scene = new Scene();
    const context = { chapter, scene, sky: new Color(), hemisphere: new HemisphereLight(), sun: new DirectionalLight() };
    for (const make of PACK.extras) make(context);
    const log = scene.getObjectByName('flyby-log')!;
    expect(log).toBeDefined();
    const figure = log.parent!;
    const model = new Group(), carving = new Mesh(new BoxGeometry(0.3, 1, 0.3), new MeshBasicMaterial());
    carving.name = 'tragubbe'; carving.position.y = 0.5; model.add(carving);
    const assets: Assets = {
      manifest: async () => ({ version: 1, packs: { private: { bytes: 1, files: { 'tragubbar.glb': 1 } } } }),
      model: async () => model,
      restoreTextures: async () => {},
      textureInfo: () => ({ managed: 0, released: 0, cpuBytes: 0, restores: 0 }),
    };
    await installSharedModels(assets, figure);
    expect(figure.getObjectByName('tragubbe')).toBeDefined();
    expect(log.parent).toBe(figure);
    expect(figure.children).toContain(log);
    scene.updateMatrixWorld(true);
    const feet = figure.getWorldPosition(new Vector3());
    const bounds = new Box3().setFromObject(log);
    expect(bounds.max.y).toBeCloseTo(feet.y, 4);
    const flyby = chapter.storm!.flybys!.find((f) => f.on === 'sjon:log-run')!;
    const water = chapter.water![chapter.water!.length - 1]!.y;
    for (let t = 0; t <= 1; t += 0.1) {
      const height = flightAt(flyby, t).y;
      // The whole passage stays afloat, even at either end of the gentle bob.
      expect(height + bounds.max.y - 0.12).toBeGreaterThan(water);
      expect(height + bounds.min.y + 0.12).toBeLessThan(water);
    }
  });

  it('runs: its foam drifts down it, and the lake\'s still water runs there and nowhere else', () => {
    const chapter = flarken();
    const outlet = chapter.water![chapter.water!.length - 1]!;
    const foam = chapter.storm!.foam!;
    expect(foam).toHaveLength(1);
    expect(foam[0]!.from).toBeLessThanOrEqual(outlet.from);
    expect(foam[0]!.to).toBe(outlet.to);
    expect(foam[0]!.speed).toBeGreaterThan(1);
    const run = runOf(chapter);
    expect(run.x).toBe(foam[0]!.from);
    expect(run.y).toBeGreaterThan(run.x);
    expect(run.z).toBe(foam[0]!.speed);
    expect(run.w).toBe(outlet.to);
    // A river runs everywhere already, and Myren's bog lies still.
    expect(runOf(ADVENTURE2.find((chapter) => chapter.id === 'alven')!).z).toBe(0);
    expect(runOf(STORY.find((chapter) => chapter.id === 'myren')!).z).toBe(0);
    // And it lies at the lake's height all the way down it.
    for (let x = outlet.from; x <= outlet.to; x += 2) expect(openWaterAt(chapter, x)).toBe(outlet.y);
  });

  it('has its two banks, low over the water, and stones in its bed off the middle line, where what it carries floats', () => {
    const shape = { long: 43, wide: 6, high: 1.3, opens: 8.5 };
    const geometry = outletShape(shape);
    const at = geometry.getAttribute('position');
    const points = Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i));
    const box = new Box3().setFromPoints(points);
    expect(box.min.x).toBeGreaterThanOrEqual(-0.01);
    expect(box.max.x).toBeLessThanOrEqual(shape.long + 0.01);
    // Never higher than a little over his own height: the jetty's end and the figures stay in the picture over it.
    expect(box.max.y).toBeLessThan(shape.high * 1.6);
    // Banks behind and in front of the stream, and between them, down its middle, nothing over the water.
    expect(points.some((p) => p.z < -shape.wide / 2 - 2 && p.y > 0.5)).toBe(true);
    expect(points.some((p) => p.z > shape.wide / 2 + 1 && p.y > 0.2)).toBe(true);
    for (const p of points) if (Math.abs(p.z) < 0.6 && p.x > 2) expect(p.y, `x ${p.x.toFixed(1)}, z ${p.z.toFixed(2)}`).toBeLessThanOrEqual(0.02);
    // Its near bank comes up only past a jetty's end (`opens`), nor do stones stand in the jetty's way.
    for (const p of points) if (p.x < shape.opens - 0.01 && p.z > -1) expect(p.y, `x ${p.x.toFixed(1)}, z ${p.z.toFixed(2)}`).toBeLessThanOrEqual(0.02);
    // In the chapter it stands with its middle where the flybys float, at the water, its mouth behind the jetty's last
    // stretch, and its near bank from past the jetty's end.
    const def = flarken().storm!.buildings!.find((one) => one.kind === 'outlet')!;
    const outlet = flarken().water![flarken().water!.length - 1]!;
    expect(def.z).toBe(-4);
    expect(def.y).toBe(outlet.y);
    expect(def.x).toBeLessThan(outlet.from);
    expect(def.x + def.opens!).toBeGreaterThan(outlet.from);
    expect(def.x + def.width!).toBe(outlet.to);
    expect(building(def).group.children.length).toBe(1);
    // The trees along it stand on its far bank's crest, not out over the lake behind it.
    const trees = flarken().storm!.buildings!.filter((one) => (one.kind === 'birch' || one.kind === 'spruce') && one.x > def.x);
    expect(trees.length).toBeGreaterThan(0);
    for (const tree of trees) {
      const across = def.z - shape.wide / 2 - tree.z;
      expect(across, `tree at ${tree.x}`).toBeGreaterThan(2);
      expect(across, `tree at ${tree.x}`).toBeLessThan(5);
    }
  });
});
