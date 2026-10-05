import { Color, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { PLACES } from '../../src/render/dressing';
import { createWater, waterKind, waterShape, type WaterShape } from '../../src/render/water';
import type { ChapterData } from '../../src/sim/types';

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

  it('lies behind the whole bog, and in front of its tussocks', () => {
    const myren = wet.find((chapter) => chapter.id === 'myren')!;
    const kind = waterKind('bog');
    const surface = corners(shapeOf(myren)).filter((corner) => corner.part === 0);
    expect(Math.min(...surface.map((corner) => corner.x))).toBeLessThan(myren.ground[0]!.x - 16);
    expect(Math.max(...surface.map((corner) => corner.x))).toBeGreaterThan(myren.ground[myren.ground.length - 1]!.x + 16);
    // The moss's shoulder goes under the water 1.65 EL in front of the path (ground.ts): open water lies in
    // front of that, and the cut meets the ground at a pool's two ends where the shoulder is still dry.
    expect(kind.front).toBeGreaterThan(2);
    expect(kind.corner).toBeLessThan(1.65);
    // Behind firm ground it begins under the moss, which sinks below the water's height about 6.5 EL back.
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
    // The house fronts stand 13 EL behind the path (village.ts).
    expect(Math.min(...shore.map((corner) => corner.z))).toBeLessThanOrEqual(-13);
    expect(kind.stands).toBe(-13);
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
