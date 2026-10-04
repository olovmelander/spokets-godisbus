import { Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { BONUS, STORY } from '../../src/content/chapters';
import { buildLines, lineHeight, lineOver, rods } from '../../src/render/lines';
import type { Hook, Line } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

// What holds a ring (docs/level-design.md): a cord from above, or a line between two poles.

const line: Line = { from: { x: 10, y: 6 }, to: { x: 20, y: 6 }, sag: 0.4, posts: true };
const ring = (x: number, y: number, more: Partial<Hook> = {}): Hook => ({ x, y, length: 2.4, extra: true, ...more });

describe('what holds a ring', () => {
  it('a line hangs in a shallow curve between its ends, lowest in the middle', () => {
    expect(lineHeight(line, 10)).toBeCloseTo(6);
    expect(lineHeight(line, 20)).toBeCloseTo(6);
    expect(lineHeight(line, 15)).toBeCloseTo(5.6);
    expect(lineHeight(line, 12.5)).toBeGreaterThan(lineHeight(line, 15));
    // One that slopes keeps its ends where they are said to be.
    const sloping: Line = { from: { x: 0, y: 4 }, to: { x: 8, y: 6 } };
    expect(lineHeight(sloping, 4)).toBeCloseTo(5);
  });

  it('a line is drawn in parts end to end, and its poles go down into the ground', () => {
    const all = rods({ lines: [line] });
    const parts = all.filter((rod) => rod.from.x !== rod.to.x);
    const poles = all.filter((rod) => rod.from.x === rod.to.x);
    expect(parts.length).toBeGreaterThanOrEqual(6);
    expect(parts[0]!.from).toEqual({ x: 10, y: 6 });
    expect(parts.at(-1)!.to.x).toBeCloseTo(20);
    for (const [i, part] of parts.slice(1).entries()) expect(part.from).toEqual(parts[i]!.to);
    expect(poles.map((pole) => pole.from.x)).toEqual([10, 20]);
    for (const pole of poles) {
      expect(pole.from.y).toBeLessThan(-5);
      expect(pole.to.y).toBeGreaterThan(6);
      expect(pole.thick).toBeGreaterThan(parts[0]!.thick);
    }
    expect(rods({ lines: [{ ...line, posts: false }] }).filter((rod) => rod.from.x === rod.to.x)).toHaveLength(0);
  });

  it('a ring under a line hangs from it; one that says how far it hangs has a cord that long; another has none', () => {
    const under = ring(15, 4.6);
    expect(lineOver([line], under)).toBe(line);
    const cords = rods({ lines: [line], hooks: [under] }).slice(-1);
    expect(cords[0]!.from.x).toBe(15);
    expect(cords[0]!.to.y).toBeCloseTo(5.6);
    expect(cords[0]!.from.y).toBeGreaterThan(4.6);
    // Outside the line's ends, or above it, there is nothing to hang from.
    expect(lineOver([line], ring(21, 4.6))).toBeNull();
    expect(lineOver([line], ring(15, 7))).toBeNull();
    expect(rods({ hooks: [ring(3, 2)] })).toHaveLength(0);
    const hung = rods({ hooks: [ring(3, 2, { hangs: 5 })] });
    expect(hung).toHaveLength(1);
    expect(hung[0]!.to).toEqual({ x: 3, y: 7 });
  });

  it('all of it is one mesh, with a rod from each start to each end, behind the plane he moves in', () => {
    expect(buildLines({})).toBeNull();
    const chapter = { lines: [line], hooks: [ring(15, 4.6), ring(30, 3, { hangs: 2 })] };
    const all = rods(chapter);
    const mesh = buildLines(chapter)!;
    expect(mesh.count).toBe(all.length);
    const matrix = new Matrix4();
    const at = new Vector3();
    const turn = new Quaternion();
    const size = new Vector3();
    for (const [i, rod] of all.entries()) {
      mesh.getMatrixAt(i, matrix);
      matrix.decompose(at, turn, size);
      const half = new Vector3(0, size.y / 2, 0).applyQuaternion(turn);
      expect(at.x + half.x).toBeCloseTo(rod.to.x);
      expect(at.y + half.y).toBeCloseTo(rod.to.y);
      expect(at.x - half.x).toBeCloseTo(rod.from.x);
      expect(at.y - half.y).toBeCloseTo(rod.from.y);
      expect(at.z + size.z).toBeLessThan(0);
    }
  });

  it('in every chapter a line is strung over the ground, and a cord is no longer than the picture is high', () => {
    for (const chapter of [...STORY, ...BONUS]) {
      for (const strung of chapter.lines ?? []) {
        for (const end of [strung.from, strung.to]) expect(end.y - heightAt(chapter, end.x), `${chapter.id}, the line's end at ${end.x}`).toBeGreaterThan(2);
        // It has rings on it: a line with nothing hanging from it is not what this is for.
        expect((chapter.hooks ?? []).filter((hook) => lineOver([strung], hook) === strung).length, `${chapter.id}, the line from ${strung.from.x}`).toBeGreaterThan(0);
      }
      for (const hook of chapter.hooks ?? []) {
        const over = lineOver(chapter.lines ?? [], hook);
        if (over && hook.hangs === undefined) {
          const cord = lineHeight(over, hook.x) - hook.y;
          expect(cord, `${chapter.id}, the ring at ${hook.x}`).toBeGreaterThan(0.25);
          expect(cord, `${chapter.id}, the ring at ${hook.x}`).toBeLessThan(3);
        }
        if (hook.hangs !== undefined) expect(hook.hangs, `${chapter.id}, the ring at ${hook.x}`).toBeGreaterThan(0.25);
      }
    }
  });
});
