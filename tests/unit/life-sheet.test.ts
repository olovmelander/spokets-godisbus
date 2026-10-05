import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ATLAS, LIFE, STRIPS, WALK, type Strip } from '../../src/content/life';

/**
 * The atlas of the far scenery's life, as its generator measured it (art/blender/life.py writes life.json
 * beside the model). The game's own table of cells must be the generator's, and the moose's walk must be a
 * walk: its hooves on one line, a cycle that closes, and hooves that stand still on the ground while the body
 * goes on.
 */
interface Cell { foot: number; box: [number, number, number, number]; cover: number }
interface Sheet {
  atlas: [number, number];
  strips: Record<string, number[]>;
  cells: Record<string, Cell[]>;
  moose: {
    cell: number; foot: number; stride: number; duty: number; halt: number; pixels: number; shade: number;
    hooves: Record<string, [number, number][]>;
    small: { walk: string[]; stand: string[] };
  };
}
const sheet = JSON.parse(readFileSync('art/baked/boot/life.json', 'utf8')) as Sheet;
const strips = STRIPS as Record<string, Strip>;

/** How unlike two cells are: the sum of the differences of their small copies. */
function apart(a: string, b: string): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += Math.abs(parseInt(a[i]!, 16) - parseInt(b[i]!, 16));
  return sum;
}

describe('the atlas of the far life', () => {
  it('has the cells the game says it has', () => {
    expect(sheet.atlas).toEqual([...ATLAS]);
    expect(Object.keys(sheet.strips).sort()).toEqual(Object.keys(strips).sort());
    for (const [name, strip] of Object.entries(strips)) {
      expect(sheet.strips[name], name).toEqual([...strip]);
      expect(sheet.cells[name]!.length, name).toBe(strip[4]);
    }
  });

  it('has cells for everyone in the cast', () => {
    const drawn = new Set<Strip>(Object.values(strips));
    for (const [place, cast] of Object.entries(LIFE)) {
      for (const [kind, role] of Object.entries(cast.roles)) {
        if (role.act === 'flock') expect(drawn.has(role.strip!), `${place} ${kind}`).toBe(true);
        else expect([sheet.cells.walk!.length, sheet.cells.stand!.length], `${place} ${kind}`).toEqual([12, 4]);
      }
    }
  });

  it('keeps its strips inside the picture and off each other', () => {
    const boxes = Object.entries(strips).map(([name, [x, y, wide, tall, cells, row]]) => ({ name, x, y, x1: x + wide * Math.min(cells, row), y1: y + tall * Math.ceil(cells / row) }));
    for (const a of boxes) {
      expect(a.x1, a.name).toBeLessThanOrEqual(ATLAS[0]);
      expect(a.y1, a.name).toBeLessThanOrEqual(ATLAS[1]);
      for (const b of boxes) if (a !== b) expect(a.x < b.x1 && b.x < a.x1 && a.y < b.y1 && b.y < a.y1, `${a.name} over ${b.name}`).toBe(false);
    }
  });

  it('has something in every cell, and nothing that touches a cell\'s edge', () => {
    for (const [name, strip] of Object.entries(strips)) {
      for (const [i, cell] of sheet.cells[name]!.entries()) {
        const [left, top, right, bottom] = cell.box;
        expect(right, `${name} ${i} is empty`).toBeGreaterThan(left);
        expect(Math.min(left, top), `${name} ${i}`).toBeGreaterThanOrEqual(1);
        expect(right, `${name} ${i}`).toBeLessThanOrEqual(strip[2] - 2);
        expect(bottom, `${name} ${i}`).toBeLessThanOrEqual(strip[3] - 2);
      }
    }
  });
});

describe('the moose\'s cells', () => {
  const walk = sheet.cells.walk!;
  const stand = sheet.cells.stand!;
  const small = sheet.moose.small;
  const neighbours = walk.map((_, i) => apart(small.walk[i]!, small.walk[(i + 1) % 12]!));

  it('are the numbers the game walks it by', () => {
    expect(sheet.moose.stride).toBe(WALK.stride);
    expect(sheet.moose.cell).toBe(WALK.cell);
    expect(sheet.moose.foot).toBe(WALK.foot);
    expect(sheet.moose.halt).toBe(WALK.halt);
    expect(sheet.moose.pixels).toBe(strips.walk![2] / WALK.cell);
    expect(Math.abs(sheet.moose.shade - WALK.shade) / WALK.shade).toBeLessThan(0.05);
  });

  it('are an animal that fills its cell: 15 to 45% of it', () => {
    for (const [i, cell] of [...walk, ...stand].entries()) {
      expect(cell.cover, `cell ${i}`).toBeGreaterThanOrEqual(0.15);
      expect(cell.cover, `cell ${i}`).toBeLessThanOrEqual(0.45);
    }
  });

  it('keep the hooves on one line, where the game thinks the ground is', () => {
    const feet = [...walk, ...stand].map((cell) => cell.foot);
    expect(Math.max(...feet) - Math.min(...feet)).toBeLessThanOrEqual(1);
    // A soft edge is half covered a pixel or two inside the hoof.
    const ground = strips.walk![3] - WALK.foot * sheet.moose.pixels;
    for (const foot of feet) expect(Math.abs(foot - ground)).toBeLessThanOrEqual(2.5);
  });

  it('are as tall as the game says, with the antlers', () => {
    for (const cell of walk) {
      const tall = (cell.foot - cell.box[1]) / sheet.moose.pixels;
      expect(Math.abs(tall - WALK.tall)).toBeLessThan(0.15);
    }
  });

  it('close the cycle: the last cell is no further from the first than neighbours are from each other', () => {
    expect(Math.min(...neighbours)).toBeGreaterThan(0);
    expect(neighbours[11]!).toBeLessThanOrEqual(Math.max(...neighbours.slice(0, 11)) * 1.05);
    // And no cell is the cell before it: twelve different moments.
    expect(new Set(small.walk).size).toBe(12);
  });

  it('let a hoof stand still on the ground while the body goes on by the stride', () => {
    const step = (WALK.stride * sheet.moose.pixels) / 12;
    expect(Object.keys(sheet.moose.hooves).sort()).toEqual(['FL', 'FR', 'HL', 'HR']);
    for (const [leg, hooves] of Object.entries(sheet.moose.hooves)) {
      let standing = 0;
      for (let i = 0; i < 12; i++) {
        const [x, up] = hooves[i]!;
        const [next, nextUp] = hooves[(i + 1) % 12]!;
        if (up > 0.001) continue;
        standing++;
        // From one cell to the next a standing hoof goes back under the body by a twelfth of the stride.
        if (nextUp <= 0.001) expect(Math.abs(x - next - step) / step, `${leg} cell ${i}`).toBeLessThan(0.02);
      }
      // It stands for 62% of the cycle: seven or eight cells of the twelve.
      expect(standing, leg).toBeGreaterThanOrEqual(7);
      expect(standing, leg).toBeLessThanOrEqual(8);
      // And it is lifted high, as a moose lifts its hooves in a bog.
      expect(Math.max(...hooves.map(([, up]) => up)), leg).toBeGreaterThan(0.2);
    }
  });

  it('never have fewer than two hooves on the ground', () => {
    for (let i = 0; i < 12; i++) {
      const down = Object.values(sheet.moose.hooves).filter((hooves) => hooves[i]![1] <= 0.001).length;
      expect(down, `cell ${i}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('stop from the cell where the hooves are down, and lift the head from there', () => {
    // The first standing cell is the walk's cell with two hooves set down: as like it as a neighbour is.
    expect(apart(small.stand[0]!, small.walk[WALK.halt]!)).toBeLessThanOrEqual(Math.max(...neighbours));
    // The head comes up: the animal's top is higher in each of the next two, and the last only flicks an ear.
    expect(stand[1]!.box[1]).toBeLessThan(stand[0]!.box[1]);
    expect(stand[2]!.box[1]).toBeLessThan(stand[1]!.box[1]);
    expect(apart(small.stand[3]!, small.stand[2]!)).toBeLessThan(apart(small.stand[2]!, small.stand[0]!));
    expect(small.stand[3]).not.toBe(small.stand[2]);
  });
});
