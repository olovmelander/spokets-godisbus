import { Color, type Mesh } from 'three';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ADVENTURE2, BONUS, STORY, loadAdventure2 } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';
import { PACK } from '../../src/render/extensions';
import { createWater, isOpenWater, levelLine, levelOn, waterKind, waterShape, type WaterShape } from '../../src/render/water';
import { STREET_DEPTH } from '../../src/render/village';
import type { ChapterData } from '../../src/sim/types';

beforeAll(async () => {
  // The pack's looks draw on canvases: there are none here, and none are needed.
  const fake: object = new Proxy(function () {}, { get: (_, key) => (key === Symbol.toPrimitive ? () => 0 : fake), apply: () => fake, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, style: {}, getContext: () => fake }) });
  await loadAdventure2();
});
afterAll(() => vi.unstubAllGlobals());

const wet = [...STORY, ...BONUS].filter((chapter) => (chapter.water ?? []).length > 0);
const ground = (chapter: ChapterData, x: number) => {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
};
const shapeOf = (chapter: ChapterData) => waterShape(chapter.water!, waterKind(chapter.place),
  { from: chapter.ground[0]!.x, to: chapter.ground[chapter.ground.length - 1]!.x }, (x) => ground(chapter, x));
/** A shape's corners: where each is, which part it belongs to, how much water is there, and its pool's level. */
const corners = (shape: WaterShape) => Array.from({ length: shape.position.length / 3 }, (_, i) => ({
  x: shape.position[i * 3]!, y: shape.position[i * 3 + 1]!, z: shape.position[i * 3 + 2]!,
  part: shape.part[i * 4]!, there: shape.part[i * 4 + 1]!, deep: shape.part[i * 4 + 2]!, level: shape.part[i * 4 + 3]!,
}));
const light = (hex: string) => { const c = new Color(hex); return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b; };

describe('the water, as it is drawn', () => {
  it('lies in the bog, the forest and the village street', () => {
    expect(wet.map((chapter) => chapter.id).sort()).toEqual(['byn', 'granskog', 'myren']);
  });

  it('is one mesh in a chapter, however many pools there are', () => {
    for (const chapter of wet) {
      const water = createWater(chapter, PLACES[chapter.place!].water, PLACES[chapter.place!].sun.from, { place: chapter.place! });
      expect(water.group.children, chapter.id).toHaveLength(1);
      const mesh = water.group.children[0] as Mesh;
      const count = mesh.geometry.getAttribute('position').count;
      expect(Math.max(...(mesh.geometry.getIndex()!.array as unknown as number[])), chapter.id).toBeLessThan(count);
    }
  });

  it('has its surface where the simulation has it: each pool from end to end, at its height', () => {
    for (const chapter of wet) {
      const surface = corners(shapeOf(chapter)).filter((corner) => corner.part === 0);
      for (const pool of chapter.water!) {
        const own = surface.filter((corner) => corner.level === pool.y && corner.x >= pool.from && corner.x <= pool.to);
        expect(Math.min(...own.map((corner) => corner.x)), chapter.id).toBe(pool.from);
        expect(Math.max(...own.map((corner) => corner.x)), chapter.id).toBe(pool.to);
        // It reaches from in front of the path to behind it.
        expect(Math.max(...own.map((corner) => corner.z)), chapter.id).toBeGreaterThan(0.5);
        expect(Math.min(...own.map((corner) => corner.z)), chapter.id).toBeLessThan(-5);
      }
      for (const corner of surface) expect(corner.y, chapter.id).toBe(corner.level);
    }
  });

  it('never ends in an edge behind the path: it thins out to nothing, or meets a shore', () => {
    for (const chapter of wet) {
      const kind = waterKind(chapter.place);
      const surface = corners(shapeOf(chapter)).filter((corner) => corner.part === 0);
      const far = Math.min(...surface.map((corner) => corner.z));
      for (const corner of surface.filter((one) => one.z === far)) {
        // A puddle's far edge is its shore, where it is no deeper than nothing.
        if (kind.bed > 0) expect(corner.deep, chapter.id).toBe(0);
        else expect(corner.there, chapter.id).toBe(0);
      }
    }
  });

  it('lies in front of the whole bog and behind it, and its tussocks stand in it: no cut of it is ever seen', () => {
    const myren = wet.find((chapter) => chapter.id === 'myren')!;
    const kind = waterKind('bog');
    const all = corners(shapeOf(myren));
    const surface = all.filter((corner) => corner.part === 0);
    expect(Math.min(...surface.map((corner) => corner.x))).toBeLessThan(myren.ground[0]!.x - 16);
    expect(Math.max(...surface.map((corner) => corner.x))).toBeGreaterThan(myren.ground[myren.ground.length - 1]!.x + 16);
    // It was cut 2.4 in front of the path, and on a phone held upright the lower third of the picture was that cut:
    // the water seen from the side, under its surface (Olov, 9 November 2026). It runs on past the camera now, which
    // stands about 24 EL in front of the path then, so that it is all surface and has no cut in the picture.
    expect(kind.front).toBeGreaterThan(40);
    expect(all.every((corner) => corner.part === 0), 'no cut face').toBe(true);
    expect(Math.max(...surface.map((corner) => corner.z))).toBeGreaterThan(40);
    // Behind firm ground it is under the moss, which sinks below the water's height about 6.5 EL back.
    expect(kind.behind).toBeGreaterThan(-6.4);
  });

  it('is a shallow puddle in the street: a few EL across, with a far shore at the street\'s height up to the houses', () => {
    const byn = wet.find((chapter) => chapter.id === 'byn')!;
    const kind = waterKind('village');
    const all = corners(shapeOf(byn));
    const surface = all.filter((corner) => corner.part === 0);
    expect(Math.max(...surface.map((corner) => corner.z)) - Math.min(...surface.map((corner) => corner.z))).toBeLessThanOrEqual(10);
    expect(kind.bed).toBeGreaterThan(0);
    expect(kind.bed).toBeLessThan(1);
    const shore = all.filter((corner) => corner.part === 2);
    const pool = byn.water![0]!;
    expect(Math.max(...shore.map((corner) => corner.y))).toBe(ground(byn, pool.from - 0.2));
    // The far shore reaches back towards the far pavement's kerb, 16 EL behind the path.
    expect(Math.min(...shore.map((corner) => corner.z))).toBeLessThanOrEqual(-13);
    // It mirrors the street's far side, which stands 20 EL behind the path (village.ts).
    expect(kind.stands).toBe(STREET_DEPTH.far);
  });

  it('is dark where it is deep, and mirrors less than half of the sky', () => {
    for (const chapter of wet) {
      const kind = waterKind(chapter.place);
      const look = PLACES[chapter.place!].water;
      expect(light(kind.faceDeep), chapter.id).toBeLessThan(light(kind.faceTop));
      // Its own colour is the place's, dimmed: the sky in it is brighter than it is.
      expect(kind.dim, chapter.id).toBeLessThan(1);
      expect(light(look.colour) * kind.dim, chapter.id).toBeLessThan(0.25);
    }
    // Peat water (art bible §2.3): the darkest of the three, and the sky in it stays darker than the sky.
    const bog = waterKind('bog');
    expect(light(bog.faceDeep)).toBeLessThan(0.02);
    expect(bog.mirror).toBeLessThanOrEqual(0.6);
  });
});

describe('open water: a river, a lake and the bog', () => {
  /** The water a chapter is drawn with, as createWater makes it, and its corners. */
  const drawnOf = (chapter: ChapterData) => {
    const look = PACK.looks.get(chapter.id) ?? PLACES[chapter.place!];
    const water = createWater(chapter, look.water, look.sun.from, { place: look.id, street: (x) => ground(chapter, x) });
    const geometry = (water.group.children[0] as Mesh).geometry;
    const position = geometry.getAttribute('position'), part = geometry.getAttribute('part');
    return Array.from({ length: position.count }, (_, i) => ({ x: position.getX(i), y: position.getY(i), z: position.getZ(i), part: part.getX(i), level: part.getW(i) }));
  };
  const open = () => ADVENTURE2.filter((chapter) => isOpenWater(chapter));

  it('is Älven\'s river, Flärken\'s lake and the narrow at Stormens öga, as Myren\'s bog is', () => {
    expect(open().map((chapter) => chapter.id).sort()).toEqual(['alven', 'flarken', 'stormoga']);
    expect([...STORY, ...BONUS].filter((chapter) => isOpenWater(chapter)).map((chapter) => chapter.id)).toEqual(['myren']);
  });

  it('lies over the whole chapter from past the camera to the haze, all surface, with no cut and no edge in the picture', () => {
    for (const chapter of open()) {
      const all = drawnOf(chapter);
      expect(all.every((corner) => corner.part === 0), chapter.id).toBe(true);
      // Columns from well before the chapter to well after it, each from past the camera to the far haze: in front of
      // the banks too, where it ended in the air over their floor (Olov: "som om vattnet bara vore en platt skiva").
      const xs = [...new Set(all.map((corner) => corner.x))].sort((a, b) => a - b);
      expect(xs[0]!, chapter.id).toBeLessThan(chapter.ground[0]!.x - 16);
      expect(xs[xs.length - 1]!, chapter.id).toBeGreaterThan(chapter.ground[chapter.ground.length - 1]!.x + 16);
      for (const x of xs) {
        const column = all.filter((corner) => corner.x === x).map((corner) => corner.z);
        expect(Math.max(...column), `${chapter.id} at ${x}`).toBeGreaterThan(40);
        expect(Math.min(...column), `${chapter.id} at ${x}`).toBeLessThan(-26);
      }
    }
  });

  it('extends past even the widest portrait scene camera, so the reunion cannot expose an underwater cut edge', () => {
    for (const chapter of open()) {
      const front = Math.max(...drawnOf(chapter).map((corner) => corner.z));
      for (const scene of chapter.scenes ?? []) for (const shot of scene.stage?.shots ?? []) {
        const height = Math.max(shot.height, (shot.width ?? 0) / (390 / 844));
        const eye = (shot.z ?? 0) + height / 2 / Math.tan(Math.PI / 12);
        expect(front, `${chapter.id}: ${scene.id}`).toBeGreaterThan(eye + 2);
      }
    }
  });

  it('lies at each stretch\'s own height where the simulation has water, and goes from one to the next across a bank', () => {
    for (const chapter of open()) {
      const all = drawnOf(chapter);
      const line = levelLine(chapter.water!);
      for (const corner of all) {
        expect(corner.y, `${chapter.id} at ${corner.x}`).toBeCloseTo(levelOn(line, corner.x), 6);
        expect(corner.level, chapter.id).toBeCloseTo(corner.y, 6);
      }
      for (const pool of chapter.water!) {
        for (const x of [pool.from, (pool.from + pool.to) / 2, pool.to]) expect(levelOn(line, x), `${chapter.id} at ${x}`).toBe(pool.y);
      }
    }
    // Älven's water steps down and up from stretch to stretch: the current, the stones, the rapids, the lake, the brook.
    const alven = open().find((chapter) => chapter.id === 'alven')!;
    const line = levelLine(alven.water!);
    expect(levelOn(line, 51.3)).toBeGreaterThan(-0.4);
    expect(levelOn(line, 51.3)).toBeLessThan(-0.15);
  });

  it('is under the ground of every bank where he walks: a bank stands in it, never in the air over it', () => {
    for (const chapter of open()) {
      const line = levelLine(chapter.water!);
      for (let x = chapter.ground[0]!.x; x <= chapter.ground[chapter.ground.length - 1]!.x; x += 0.25) {
        const wet = chapter.water!.some((pool) => x > pool.from - 0.01 && x < pool.to + 0.01);
        if (!wet) expect(ground(chapter, x), `${chapter.id} at ${x}`).toBeGreaterThan(levelOn(line, x));
      }
    }
  });
});
