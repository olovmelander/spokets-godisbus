import { Color, Matrix4, type InstancedMesh } from 'three';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { AFLOAT, afloat, createAfloat } from '../../src/render/afloat';
import { bankShapes } from '../../src/render/dressing/ground';
import { MIRRORED, paintStreetMirror, STREET_DEPTH } from '../../src/render/village';
import { waterKind } from '../../src/render/water';

const byn = COURSES['byn']!;
const puddle = byn.water![0]!;

/** What the street paints for the puddle to mirror, as boxes in EL: a context that only remembers. */
function painted() {
  const boxes: { x0: number; x1: number; y0: number; y1: number; colour: unknown }[] = [];
  const c = {
    fillStyle: '' as unknown,
    fillRect(x: number, y: number, w: number, h: number) { boxes.push({ x0: x, x1: x + w, y0: -y - h, y1: -y, colour: this.fillStyle }); },
    createLinearGradient: () => ({ addColorStop() {} }),
  };
  paintStreetMirror(byn, c as unknown as CanvasRenderingContext2D, (x) => x, (y) => -y);
  return boxes;
}

describe("the village's puddle", () => {
  it("mirrors the street's far side as the kit builds it: the yard's boards on their rails before the hedge, its wall and gateposts, and the kerb", () => {
    expect(waterKind('village').stands).toBe(STREET_DEPTH.far);
    const yard = byn.street!.find((part) => part.kind === 'yard')!;
    const foot = yard.foot!;
    const boxes = painted();
    const boards = boxes.filter((b) => b.colour === MIRRORED.boards);
    // Four boards to each length of the kit's fence, between the gateposts, from just over the wall up.
    expect(boards.length % 4).toBe(0);
    expect(boards.length).toBeGreaterThanOrEqual(20);
    for (const board of boards) {
      expect(board.x0).toBeGreaterThan(yard.from + 1.3);
      expect(board.x1).toBeLessThan(yard.to - 1.3);
      expect(board.y0).toBeCloseTo(foot + 0.62, 5);
      expect(board.y1).toBeCloseTo(foot + 4.6, 5);
    }
    // The hedge shows between the boards: they cover less than four fifths of the fence.
    const covered = boards.reduce((sum, b) => sum + b.x1 - b.x0, 0);
    expect(covered / (yard.to - yard.from - 2.8)).toBeLessThan(0.8);
    expect(covered / (yard.to - yard.from - 2.8)).toBeGreaterThan(0.5);
    // The hedge is painted first, and everything of the fence over it.
    const hedge = boxes.findIndex((b) => b.y0 === foot && b.y1 === foot + 5.6);
    expect(hedge).toBeGreaterThanOrEqual(0);
    expect(boxes.findIndex((b) => b.colour === MIRRORED.boards)).toBeGreaterThan(hedge);
    expect(boxes.filter((b) => b.colour === MIRRORED.post).length).toBe(2);
    // The far pavement's kerb, from the street up to the far side's foot, under the yard and the far house.
    const kerbs = boxes.filter((b) => b.colour === MIRRORED.kerb);
    expect(kerbs.some((b) => b.x0 <= puddle.from && b.x1 >= puddle.to && b.y0 === 0 && b.y1 === foot)).toBe(true);
  });

  it("paints each house's stone foot and drip board under its own wall", () => {
    const boxes = painted();
    for (const part of byn.street!.filter((p) => p.kind === 'house')) {
      const own = boxes.filter((b) => b.x0 === part.from && b.x1 === part.to);
      expect(own.map((b) => b.colour)).toEqual(expect.arrayContaining([MIRRORED.stone, MIRRORED.drip, part.wall]));
    }
  });

  it('has birch leaves afloat on it, behind the line he sails along and in front of its far shore, none on another', () => {
    const leaves = afloat(byn.water!);
    expect(leaves.length).toBe(AFLOAT.leaves);
    for (const leaf of leaves) {
      expect(leaf.x).toBeGreaterThan(puddle.from + 1);
      expect(leaf.x).toBeLessThan(puddle.to - 1);
      expect(leaf.z).toBeLessThanOrEqual(AFLOAT.near);
      expect(leaf.z).toBeGreaterThan(waterKind('village').back + 1);
      expect(leaf.y).toBe(puddle.y);
    }
    for (const [i, a] of leaves.entries()) for (const b of leaves.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1);
    // No leaves where there is no puddle.
    expect(createAfloat([]).group.children.length).toBe(0);
  });

  it('turns its leaves with the water and widens a fading ring from each; with reduced motion all stands still', () => {
    const { group, update } = createAfloat(byn.water!);
    const [leaves, rings] = group.children as InstancedMesh[];
    const at = (mesh: InstancedMesh, i: number) => { const m = new Matrix4(); mesh.getMatrixAt(i, m); return m.elements.slice(); };
    const glow = (i: number) => { const c = new Color(); rings!.getColorAt(i, c); return c.r + c.g + c.b; };
    update(1, 0.02);
    const first = at(leaves!, 0);
    // It lies on the water as the water stands now.
    expect(first[13]).toBeCloseTo(puddle.y + 0.02 + 0.006, 5);
    update(3, -0.02);
    expect(at(leaves!, 0)).not.toEqual(first);
    // A ring is brightest as it begins and gone as it is widest.
    const leaf = afloat(byn.water!)[0]!;
    const start = leaf.every - leaf.first + leaf.every * 3;
    update(start + 0.01, 0);
    const young = glow(0);
    update(start + AFLOAT.ring - 0.01, 0);
    expect(glow(0)).toBeLessThan(young * 0.05);
    update(5, 0, true);
    const still = at(leaves!, 0);
    update(9, 0, true);
    expect(at(leaves!, 0)).toEqual(still);
    expect(glow(0)).toBe(0);
  });

  it('wets the road round it, as far as a step and a half from the water, and not beyond', () => {
    // The same street with its puddle and without: the road round the puddle is darker for it.
    const tone = (chapter: typeof byn, from: number, to: number) => {
      let sum = 0, n = 0;
      for (const { shape } of bankShapes(chapter, 'asphalt').filter((part) => part.kind === 'asphalt')) {
        const at = shape.getAttribute('position'), colour = shape.getAttribute('color');
        for (let i = 0; i < at.count; i++) {
          if (at.getX(i) < from || at.getX(i) > to || Math.abs(at.getY(i)) > 0.05 || at.getZ(i) > -1 || at.getZ(i) < -6) continue;
          sum += colour.getX(i) + colour.getY(i) + colour.getZ(i);
          n++;
        }
      }
      expect(n, `${from}..${to}`).toBeGreaterThan(4);
      return sum / n;
    };
    const dry = { ...byn, water: [] };
    const wetter = (from: number, to: number) => tone(byn, from, to) / tone(dry, from, to);
    expect(wetter(puddle.from - 1, puddle.from - 0.05)).toBeLessThan(0.85);
    expect(wetter(puddle.to + 0.05, puddle.to + 1)).toBeLessThan(0.85);
    // Further out it is dry. (The floor under the shore's corner lies at the road's height only where there is
    // water, so a few more corners are counted with it.)
    expect(wetter(puddle.from - 4, puddle.from - 1.6)).toBeGreaterThan(0.97);
    expect(wetter(puddle.to + 1.6, puddle.to + 4)).toBeGreaterThan(0.97);
  });
});
