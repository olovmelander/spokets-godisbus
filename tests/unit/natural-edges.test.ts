import { beforeAll, describe, expect, it } from 'vitest';
import { ADVENTURE2, COURSES, loadAdventure2 } from '../../src/content/chapters';
import { groundOf } from '../../src/render/dressing';
import { bankShapes, openRows, roundedFront, slopeDrop } from '../../src/render/dressing/ground';
import { heightAt, landscape } from '../../src/render/dressing/kit';
import { STILL_BEHIND, STILL_FRONT, edgesOf, openPools } from '../../src/render/dressing/natural';
import { OPEN_UNDER, waterKind, waterShape } from '../../src/render/water';
import type { ChapterData } from '../../src/sim/types';

// Olov, 14 November 2026: "Förbättra marken genom hela spelet så att kanterna och övergångarna får mer naturliga och
// varierade former, i stället för så raka linjer." The ground's walls were its outline pulled straight through the
// depth: every ditch a slot cut with a ruler, every ledge a box. These hold what src/render/dressing/natural.ts does
// about it, and what it must leave alone: the plane he moves in, and everything that is built.

// (Long enough for a computer that is busy with other things: the pack is every chapter of the second adventure.)
beforeAll(async () => { await loadAdventure2(); }, 60000);

/** Every chapter of both adventures that is out of doors. */
const outdoors = (): ChapterData[] => [...Object.values(COURSES), ...ADVENTURE2]
  .filter((chapter, i, all) => all.indexOf(chapter) === i && chapter.place !== undefined && chapter.place !== 'home' && !chapter.id.startsWith('look-'));
const own = (chapter: ChapterData) => groundOf(chapter.place!);

/** The corners of a chapter's ground on the faces of the wall at `x`: between its foot and its top, clear of both. */
function faceCorners(chapter: ChapterData, x: number, foot: number, top: number): { x: number; y: number; z: number }[] {
  const found: { x: number; y: number; z: number }[] = [];
  for (const { shape } of bankShapes(chapter, own(chapter))) {
    const at = shape.getAttribute('position');
    for (let i = 0; i < at.count; i++) {
      const [px, py, pz] = [at.getX(i), at.getY(i), at.getZ(i)];
      if (Math.abs(px - x) < 2.4 && py > foot + 0.35 && py < top - 0.35) found.push({ x: px, y: py, z: pz });
    }
  }
  return found;
}

describe('the lines the ground\'s walls take through the depth', () => {
  it('leaves the plane he moves in as the simulation has it, in every chapter: its floors, and the lip and the foot of each wall', () => {
    for (const chapter of outdoors()) {
      const edges = edgesOf(chapter, own(chapter));
      const line = chapter.ground;
      // Every floor: where his soles stand, and where what he stands beside lies.
      for (let x = line[0]!.x; x <= line.at(-1)!.x; x += 0.37) {
        for (const z of [STILL_BEHIND, -0.2, 0, 0.3, STILL_FRONT]) {
          expect(edges.shiftOn(x, z), `${chapter.id} at ${x.toFixed(1)}, ${z}`).toBe(0);
          expect(edges.sink(x, heightAt(chapter, x), z), `${chapter.id} at ${x.toFixed(1)}, ${z}`).toBe(0);
        }
      }
      // Every grown wall: its lip and its foot where the outline has them, and its face between them weathered back
      // into the wall only, by a few hundredths at his height over its foot and a tenth over his head.
      for (const bank of edges.banks) {
        for (const z of [STILL_BEHIND, 0, STILL_FRONT]) {
          for (const y of [bank.top, bank.foot, bank.top + 0.5, bank.foot - 0.5]) expect(edges.shift(bank.x, y, z), `${chapter.id} at ${bank.x}`).toBe(0);
          for (let y = bank.foot; y <= bank.top; y += 0.07) {
            const into = edges.shift(bank.x, y, z) * bank.side;
            expect(into, `${chapter.id} at ${bank.x}, ${y.toFixed(2)}`).toBeGreaterThanOrEqual(0);
            expect(into, `${chapter.id} at ${bank.x}, ${y.toFixed(2)}`).toBeLessThanOrEqual(y - bank.foot < 1 ? 0.0301 : 0.1101);
          }
        }
      }
    }
    // And in the mesh: a wall's face stands where the outline has it there, or a hand's breadth back in the wall.
    const forest = landscape(COURSES['granskog']!);
    const still = faceCorners(forest, 118, -15, -8).filter((corner) => corner.z >= STILL_BEHIND && corner.z <= 0.45 && corner.x < 120);
    expect(still.length).toBeGreaterThan(20);
    for (const corner of still) {
      expect(corner.x, `at y ${corner.y.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeLessThanOrEqual(118 + 1e-6);
      expect(corner.x, `at y ${corner.y.toFixed(2)}, z ${corner.z.toFixed(2)}`).toBeGreaterThan(118 - 0.111);
    }
    // A tall wall beside him is not ruled with a ruler: it was one x from its foot to its lip.
    const xs = still.map((corner) => corner.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.04);
  });

  it('gives every wall of grown ground a line of its own behind the path: none is the outline pulled straight', () => {
    // Granskogen's pit, Stormskogen's dry ditch, Stormgården's ditch, a bank of Berget's rock, a bog's island.
    const walls: [course: string, x: number, foot: number, top: number][] = [
      ['granskog', 118, -15, -8], ['granskog', 126, -15, -8], ['stormskog', 103, -5, 0], ['stormskog', 104.6, -5, 0],
      ['stormgard', 85, -3, 0], ['stormgard', 90, -3, 0], ['stormgard', 106, -5, 0], ['berget', 6, -14, 0], ['myren', 49, -6, 0],
    ];
    for (const [course, x, foot, top] of walls) {
      const behind = faceCorners(landscape(COURSES[course]!), x, foot, top).filter((corner) => corner.z < -1 && corner.z > -9 && Math.abs(corner.x - x) < 1.6);
      expect(behind.length, `${course} at ${x}`).toBeGreaterThan(30);
      const xs = behind.map((corner) => corner.x);
      // It was 0: every corner of the face at the wall's own x.
      expect(Math.max(...xs) - Math.min(...xs), `${course} at ${x}`).toBeGreaterThan(0.2);
    }
    // In every chapter out of doors but the village's streets and Olympia's pitch and steps, which are built.
    for (const chapter of outdoors()) {
      const banks = edgesOf(chapter, own(chapter)).banks;
      if (chapter.place === 'village' || chapter.id === 'olympia') expect(banks.length, chapter.id).toBe(0);
      else expect(banks.length, chapter.id).toBeGreaterThan(0);
    }
  });

  it('keeps what is built straight: decks, steps, kerbs, the pitch, a bed\'s edging, what a thing stands on', () => {
    const built: [course: string, x: number][] = [
      // The veranda's steps and the flower bed's edging in Stormgården, and the rain barrel beside its ditch.
      ['stormgard', 24], ['stormgard', 37], ['stormgard', 39], ['stormgard', 80],
      // Olympia's stone steps and the pits in its pitch (its holes are the pitch's own: src/content/aventyr2/pitch.ts).
      ['olympia', 3], ['olympia', 75], ['olympia', 78.9], ['olympia', 125], ['olympia', 146],
      // Flärken's jetty, and the deck in Gården.
      ['flarken', 144], ['garden', 17],
    ];
    for (const [course, x] of built) {
      const chapter = COURSES[course]!;
      const edges = edgesOf(chapter, own(chapter));
      expect(edges.bankAt(x), `${course} at ${x}`).toBeUndefined();
      for (const z of [-1, -3, -8, 1.5, 3]) expect(Math.abs(edges.shift(x, heightAt(chapter, x - 0.01), z)), `${course} at ${x}, ${z}`).toBeLessThan(1e-9);
    }
    for (const course of ['byn', 'stormbyn', 'prolog', 'epilog', 'stormkvall', 'morgonen', 'olympia']) expect(openPools(COURSES[course]!), course).toEqual([]);
  });

  it('never folds the ground over itself, and in front of the path never pulls its picture further than the ground allows', () => {
    for (const chapter of outdoors()) {
      const edges = edgesOf(chapter, own(chapter));
      if (edges.banks.length === 0) continue;
      const line = chapter.ground;
      for (const z of [-0.8, -1.7, -4, -9, 1.2, 3]) {
        let last = -Infinity;
        for (let x = line[0]!.x - 4; x <= line.at(-1)!.x + 4; x += 0.05) {
          // What stands on the ground goes with it: on its upper floor with a wall's lip, on its lower with its foot.
          const drawn = x + edges.shiftOn(x, z);
          if (last > -Infinity) {
            const step = drawn - last;
            // A wall's lip and its foot are one x on the outline and two in the picture: the face between them. Not that,
            // nor a wall that is a steep slope (Stormens öga's shore), which is all face.
            const atWall = edges.banks.some((bank) => Math.abs(bank.x - x) < 0.051) || Math.abs(heightAt(chapter, x) - heightAt(chapter, x - 0.05)) > 0.065;
            if (!atWall) {
              expect(step, `${chapter.id} at ${x.toFixed(2)}, ${z}`).toBeGreaterThan(0);
              // In front of the path the ground is seen from above: its picture is held to 0.6 and 1.6 (./ground.test.ts).
              if (z > 0) expect(step / 0.05, `${chapter.id} at ${x.toFixed(2)}, ${z}`).toBeGreaterThan(0.6);
              if (z > 0) expect(step / 0.05, `${chapter.id} at ${x.toFixed(2)}, ${z}`).toBeLessThan(1.6);
            }
          }
          last = drawn;
        }
      }
    }
  }, 120000);

  it('brings the front of a bog\'s island and of a lake\'s rock round at its ends', () => {
    const bog = landscape(COURSES['myren']!);
    // The island from 49 to 52, and the long bank after the last water.
    expect(roundedFront(bog, 49.02)).toBeLessThan(0.5);
    expect(roundedFront(bog, 51.98)).toBeLessThan(0.5);
    expect(roundedFront(bog, 50.5)).toBeGreaterThan(roundedFront(bog, 49.02) + 0.2);
    let least = Infinity, most = -Infinity;
    for (let x = 171; x < 187; x += 0.5) { least = Math.min(least, roundedFront(bog, x)); most = Math.max(most, roundedFront(bog, x)); }
    // Along a stretch it wanders: it was one line parallel to the path.
    expect(most - least).toBeGreaterThan(0.2);
    expect(least).toBeGreaterThan(0.5);
  });
});

describe('a pool that runs on towards the camera', () => {
  it('is every still pool of a garden or a forest, and no street\'s puddle, river, lake or hole in a pitch', () => {
    const open = Object.fromEntries(outdoors().map((chapter) => [chapter.id, openPools(chapter).map((w) => w.from)]));
    expect(open['granskog']).toEqual((COURSES['granskog']!.water ?? []).map((w) => w.from));
    // Stormgården's ditch, its flooded lawn that he rides the boot over, and the wheel rut.
    expect(open['stormgard']).toEqual((COURSES['stormgard']!.water ?? []).map((w) => w.from));
    expect(open['billsta']).toEqual((COURSES['billsta']!.water ?? []).map((w) => w.from));
    for (const course of ['byn', 'stormbyn', 'olympia', 'myren', 'flarken', 'alven', 'stormoga']) expect(open[course], course).toEqual([]);
  });

  it('has water that lies down the ground\'s fall between its banks, in under them, with no cut in front', () => {
    const chapter = COURSES['stormgard']!;
    const pools = chapter.water!;
    const open = { pools: openPools(chapter), rows: openRows(), drop: slopeDrop };
    const shape = waterShape(pools, waterKind('garden'), { from: chapter.ground[0]!.x, to: chapter.ground.at(-1)!.x }, (x) => heightAt(chapter, x), undefined, open);
    const corners = Array.from({ length: shape.position.length / 3 }, (_, i) => ({
      x: shape.position[i * 3]!, y: shape.position[i * 3 + 1]!, z: shape.position[i * 3 + 2]!, part: shape.part[i * 4]!, level: shape.part[i * 4 + 3]!,
    }));
    // No cut face: it was a wall of water straight down from 0.65 in front of the path.
    expect(corners.filter((corner) => corner.part === 1)).toEqual([]);
    for (const pool of pools) {
      const mine = corners.filter((corner) => corner.level === pool.y && corner.x > pool.from - 2 && corner.x < pool.to + 2);
      expect(Math.min(...mine.map((corner) => corner.x))).toBeCloseTo(pool.from - OPEN_UNDER, 6);
      expect(Math.max(...mine.map((corner) => corner.x))).toBeCloseTo(pool.to + OPEN_UNDER, 6);
      // It reaches the pool's shore far in front, and at every row it lies as far under the bank as on the path.
      expect(Math.max(...mine.map((corner) => corner.z))).toBeGreaterThanOrEqual(4.6);
      for (const corner of mine) expect(corner.y, `at z ${corner.z}`).toBeCloseTo(pool.y - (corner.z > 0.45 ? slopeDrop(corner.z) : 0), 6);
    }
    // And the ground under it: the lawn's bank stands over the water all the way, by as much as on the path.
    for (const z of openRows()) expect(slopeDrop(z)).toBeGreaterThanOrEqual(0);
  });

  it('keeps a pool that is not open as it was: a street\'s puddle is cut where its street closes it', () => {
    const byn = COURSES['byn']!;
    const kind = waterKind('village');
    const shape = waterShape(byn.water!, kind, { from: byn.ground[0]!.x, to: byn.ground.at(-1)!.x }, (x) => heightAt(byn, x), undefined, { pools: openPools(byn), rows: openRows(), drop: slopeDrop });
    const zs = Array.from({ length: shape.position.length / 3 }, (_, i) => shape.position[i * 3 + 2]!);
    expect(Math.max(...zs)).toBeCloseTo(kind.front, 6);
    expect(shape.part.filter((_, i) => i % 4 === 0 && shape.part[i] === 1).length).toBeGreaterThan(0);
  });
});
