import { readFileSync, readdirSync } from 'node:fs';
import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { norrsken } from '../../src/content/chapters/norrsken';
import { PINE_DEPTH, fitted, outcrops, rimPines, rockAt, shapeOf, shootsOf, stones, type MountainKit, type Outcrop, type Shape } from '../../src/render/mountain-kit';
import type { ChapterData } from '../../src/sim/types';

/**
 * The kit as Blender wrote it, read without three's loader: a .glb is a list of parts in JSON and their
 * numbers after it. The game reads the packed copy of this file; the numbers are the same.
 */
function readKit(): MountainKit {
  const file = readFileSync(new URL('../../art/baked/boot/mountain-kit.glb', import.meta.url));
  const json = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8'));
  const bin = file.subarray(20 + file.readUInt32LE(12) + 8);
  const read = (index: number): number[] => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const parts = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type as 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4'];
    const [size, get, scale] = ({
      5126: [4, (at: number) => bin.readFloatLE(at), 1], 5125: [4, (at: number) => bin.readUInt32LE(at), 1],
      5123: [2, (at: number) => bin.readUInt16LE(at), accessor.normalized ? 65535 : 1], 5121: [1, (at: number) => bin.readUInt8(at), accessor.normalized ? 255 : 1],
    } as Record<number, [number, (at: number) => number, number]>)[accessor.componentType]!;
    const stride = view.byteStride ?? size * parts;
    const out: number[] = [];
    for (let i = 0; i < accessor.count; i++) for (let k = 0; k < parts; k++) out.push(get((view.byteOffset ?? 0) + (accessor.byteOffset ?? 0) + i * stride + k * size) / scale);
    return out;
  };
  const kit = new Map<string, Shape>();
  for (const node of json.nodes) {
    if (node.mesh === undefined) continue;
    // Every part is built where it stands: none is moved or turned as a whole.
    expect(node.translation ?? node.rotation ?? node.scale ?? node.matrix, node.name).toBeUndefined();
    const primitive = json.meshes[node.mesh].primitives[0];
    const colour = primitive.attributes.COLOR_0 === undefined ? [] : read(primitive.attributes.COLOR_0);
    const parts = colour.length / (json.accessors[primitive.attributes.POSITION].count || 1);
    kit.set(node.name, {
      position: read(primitive.attributes.POSITION), normal: read(primitive.attributes.NORMAL),
      colour: colour.filter((_, i) => i % parts < 3), index: read(primitive.indices), ...(node.extras ?? {}),
    });
  }
  return kit;
}

const kit = readKit();
const generator = readFileSync(new URL('../../art/blender/mountain-kit.py', import.meta.url), 'utf8');
const corners = (shape: BufferGeometry): Vector3[] => {
  const at = shape.getAttribute('position');
  return Array.from({ length: at.count }, (_, i) => new Vector3().fromBufferAttribute(at, i));
};
const triangles = (shape: Shape) => shape.index.length / 3;
/** The rocks of Berget, each where the chapter has it. */
const rocks = outcrops(berget);
const fits = fitted(kit, rocks);
const placed = rocks.map((rock, i) => (fits[i] ? rockAt(kit, rock, fits[i]!) : null));
const name = (rock: Outcrop) => `the ${rock.kind} at ${rock.x}`;
/** How far behind the play plane what holds a flat top up keeps, and how thick a flat top is at most. */
const BACK = 0.42;
const THICK = 0.46;

describe('the mountain kit from Blender', () => {
  it('has every part the game asks it for', () => {
    for (const part of ['tall', 'tall-skott', 'martall-a', 'martall-a-skott', 'martall-b', 'martall-b-skott', 'skott', 'sten-a', 'sten-b', 'sten-c', 'klapper', 'lav']) expect([...kit.keys()], part).toContain(part);
    expect(generator.includes('\t') || /[^\x00-\x7f]/.test(generator), 'the generator is plain ASCII').toBe(false);
  });

  it('finds the rocks of the chapter: seven shelves, six boulders with their lee shelves, three stacks of the cairn', () => {
    expect(rocks.filter((rock) => rock.kind === 'hylla').map((rock) => rock.x)).toEqual([86, 88, 90.2, 92.5, 95.4, 98.2, 104.8]);
    const boulders = rocks.filter((rock) => rock.kind === 'la');
    expect(boulders.map((rock) => rock.x)).toEqual(berget.gusts![0]!.shelters);
    expect(boulders.map((rock) => rock.step)).toEqual([0.9, 0.9, 0.9, 0.9, 0.9, 0]);
    const stacks = rocks.filter((rock) => rock.kind === 'rose');
    expect(stacks.map((rock) => [rock.x, rock.y, rock.step])).toEqual([[146.9, 40.9, 0], [149.5, 39, 3.8], [152.3, 37.1, 3.8]]);
    // Every stone ledge and every step of the cairn is the top of one of them, once.
    const ledges = berget.ledges!.flatMap((ledge, i) => (ledge.look === 'stone' ? [i] : []));
    expect(rocks.flatMap((rock) => rock.ledges).sort((a, b) => a - b)).toEqual(ledges);
    expect(rocks.flatMap((rock) => rock.movers).sort()).toEqual(berget.movers!.map((_, i) => i));
  });

  it('has a part for every rock, with the numbers the chapter has', () => {
    for (const [i, rock] of rocks.entries()) expect(fits[i], `${name(rock)}: ${rock.wide} wide, ${rock.drop} over the ground, a step ${rock.step} down`).not.toBeNull();
    // The generator's table says the same as what it built.
    for (const [part, shape] of kit) {
      if (shape.wide === undefined) continue;
      const row = new RegExp(`\\('${part}', ([\\d.]+), ([\\d.]+), ([\\d.]+), [\\d.]+\\)`).exec(generator);
      expect(row?.slice(1).map(Number), part).toEqual([shape.wide, shape.drop, shape.step]);
    }
    // No two rocks side by side are the same part the same way round.
    const drawn = fits.map((fit) => `${fit!.name}${fit!.mirrored ? ' mirrored' : ''}`);
    for (let i = 1; i < drawn.length; i++) expect(drawn[i], `${name(rocks[i]!)} and its neighbour`).not.toBe(drawn[i - 1]);
  });

  it('puts each flat top where the simulation has it: at its height, as wide, its front edge on the play plane', () => {
    for (const [i, rock] of rocks.entries()) {
      const all = corners(placed[i]!);
      for (const top of rock.step > 0 ? [rock.y, rock.y - rock.step] : [rock.y]) {
        const level = all.filter((p) => Math.abs(p.y - top) < 0.002);
        const front = level.filter((p) => p.z > -0.12);
        const what = `${name(rock)}, the top at ${top}`;
        // Level from side to side where he stands, and no wider than he can stand on.
        expect(Math.min(...front.map((p) => p.x)), what).toBeLessThanOrEqual(rock.x - rock.wide / 2 + 0.08);
        expect(Math.max(...front.map((p) => p.x)), what).toBeGreaterThanOrEqual(rock.x + rock.wide / 2 - 0.08);
        for (const p of level.filter((q) => q.z > -0.3)) expect(Math.abs(p.x - rock.x), what).toBeLessThanOrEqual(rock.wide / 2 + 0.06);
        expect(Math.max(...front.map((p) => p.z)), what).toBeGreaterThan(-0.06);
        // Nothing of the rock stands up through the top where he stands, or beside it at its height. Over a
        // step there is the rock's own higher top, which he jumps up through as through any ledge.
        const higher = (p: Vector3) => rock.y > top && p.y > rock.y - THICK && p.y <= rock.y + 0.002;
        for (const p of all) if (p.z > -0.5 && Math.abs(p.x - rock.x) < rock.wide / 2 + 0.25) expect(p.y <= top + 0.002 || p.y > top + 1.4 || higher(p), `${what}: a corner at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('floats nothing, and stands nothing in front of him', () => {
    for (const [i, rock] of rocks.entries()) {
      const all = corners(placed[i]!);
      const tops = rock.step > 0 ? [rock.y, rock.y - rock.step] : [rock.y];
      // It goes down into the ground under it.
      expect(Math.min(...all.map((p) => p.y)), name(rock)).toBeLessThan(rock.y - rock.drop - 0.3);
      for (const p of all) {
        // Nothing is in front of the play plane, and only a flat top itself reaches out to it.
        expect(p.z, name(rock)).toBeLessThanOrEqual(0.001);
        if (p.z > -BACK + 0.02) expect(tops.some((top) => p.y <= top + 0.002 && p.y > top - THICK), `${name(rock)}: a corner at ${p.x.toFixed(2)}, ${p.y.toFixed(2)}, ${p.z.toFixed(2)}`).toBe(true);
      }
    }
  });

  it('hides nothing that stands by the path: no big candy, no cobble that rings, not the memory', () => {
    // Each as the space it needs: (what, x, from y to y, as far back as z).
    const things: [string, number, number, number, number, number][] = [
      ...(berget.checkpoints ?? []).map((at): [string, number, number, number, number, number] => ['the big candy', at.x, 0.5, at.y, at.y + 1.6, -1.1]),
      ...(berget.spots ?? []).filter((spot) => spot.look === 'cobble' || spot.look === 'memory').map((spot): [string, number, number, number, number, number] => [`the ${spot.look}`, spot.at.x, 0.42, spot.at.y, spot.at.y + 0.85, -1.05]),
      // A sweet in its wrapper turns as it hangs; a heart and a lollipop are flat and keep their faces to him.
      ...berget.candy.map((candy): [string, number, number, number, number, number] => ['a sweet of the trail', candy.x, 0.26, candy.y - 0.22, candy.y + 0.22, -0.16]),
      ...(berget.side ?? []).map((candy): [string, number, number, number, number, number] => ['a heart or a lollipop', candy.x, 0.2, candy.y - 0.24, candy.y + 0.24, -0.05]),
    ];
    const edge = new Vector3();
    for (const [i, rock] of rocks.entries()) {
      const at = placed[i]!.getAttribute('position');
      const index = placed[i]!.index!;
      for (const [what, x, reach, low, high, back] of things) {
        if (Math.abs(x - rock.x) > 4) continue;
        // Points all over each face: a block's face is wider than a sweet.
        for (let t = 0; t < index.count; t += 3) {
          const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(at, index.getX(t + k))) as [Vector3, Vector3, Vector3];
          if (Math.max(a.z, b.z, c.z) < back || Math.min(a.x, b.x, c.x) > x + reach || Math.max(a.x, b.x, c.x) < x - reach) continue;
          for (let u = 0; u <= 6; u++) for (let v = 0; u + v <= 6; v++) {
            edge.copy(a).multiplyScalar(1 - (u + v) / 6).addScaledVector(b, u / 6).addScaledVector(c, v / 6);
            const inside = Math.abs(edge.x - x) < reach && edge.y > low + 0.02 && edge.y < high && edge.z > back;
            expect(inside, `${name(rock)} hides ${what} at ${x}: at ${edge.x.toFixed(2)}, ${edge.y.toFixed(2)}, ${edge.z.toFixed(2)}`).toBe(false);
          }
        }
      }
    }
  });

  it('is granite in the greys of the ground, and far fewer triangles than what it takes the place of', () => {
    for (const part of ['sten-a', 'sten-b', 'sten-c', 'hylla-1', 'la-1', 'rose-3']) {
      const colour = kit.get(part)!.colour;
      let [r, g, b] = [0, 0, 0];
      for (let i = 0; i < colour.length; i += 3) { r += colour[i]!; g += colour[i + 1]!; b += colour[i + 2]!; }
      // Grey, a little to the blue: never brown. (Linear light: #8f939d is about 0.28, #d6d5d6 about 0.67.)
      expect(b / r, part).toBeGreaterThan(1);
      expect(b / r, part).toBeLessThan(1.35);
      expect(g / (colour.length / 3), part).toBeGreaterThan(0.12);
      expect(g / (colour.length / 3), part).toBeLessThan(0.7);
    }
    // A stone was a ball of 660 triangles, and a clump of lichen five balls of 80.
    for (const part of ['sten-a', 'sten-b', 'sten-c']) expect(triangles(kit.get(part)!), part).toBeLessThanOrEqual(350);
    expect(triangles(kit.get('lav')!)).toBeLessThanOrEqual(100);
    expect(triangles(kit.get('klapper')!)).toBeLessThanOrEqual(120);
    // The lichen is the palest thing on the ground.
    const lichen = kit.get('lav')!.colour;
    expect(Math.max(...Array.from(lichen))).toBeGreaterThan(0.8);
  });

  it('reads where a pine\'s shoots stand, whichever way round a triangle\'s corners come', () => {
    for (const order of [[0, 1, 2], [1, 2, 0], [2, 0, 1], [0, 2, 1]]) {
      // A shoot at (1, 2, 3), 0.5 long along +Y, its side along +X.
      const frame: Shape = { position: [1, 2, 3, 1, 2.5, 3, 1.2, 2, 3], normal: [], colour: [], index: order };
      const [matrix] = shootsOf(frame);
      const end = new Vector3(0, 1, 0).applyMatrix4(matrix!);
      expect([end.x, end.y, end.z].map((n) => Math.round(n * 1000) / 1000), String(order)).toEqual([1, 2.5, 3]);
      const side = new Vector3(1, 0, 0).applyMatrix4(matrix!);
      expect([side.x, side.y, side.z].map((n) => Math.round(n * 1000) / 1000), String(order)).toEqual([1.5, 2, 3]);
      expect(matrix!.determinant()).toBeGreaterThan(0);
    }
    // The old pine has a few hundred shoots, each about half a length long and within its crown.
    const shoots = shootsOf(kit.get('tall-skott')!);
    expect(shoots.length).toBeGreaterThan(200);
    for (const matrix of shoots) {
      const long = new Vector3().setFromMatrixColumn(matrix, 1).length();
      expect(long).toBeGreaterThan(0.4);
      expect(long).toBeLessThan(0.75);
    }
  });

  it('builds stones as one shape, with lichen on whichever side faces the sky', () => {
    const one = stones([{ x: 3, y: 1.3, z: -4, size: 0.8, turn: [1, 2, 3], shape: 0, tone: 1, foot: 1 }, { x: 6, y: 1.1, z: -5, size: 0.4, turn: [0, 0, 0], shape: 2, tone: 1, foot: 1 }], ['sten-a', 'sten-b', 'sten-c'].map((part) => kit.get(part)!));
    expect(one.index!.count / 3).toBe(triangles(kit.get('sten-a')!) + triangles(kit.get('sten-c')!));
    const at = one.getAttribute('position');
    const normal = one.getAttribute('normal');
    const colour = one.getAttribute('color');
    let [up, down, ups, downs] = [0, 0, 0, 0];
    for (let i = 0; i < at.count; i++) {
      // Sunk into the ground, and standing out of it.
      expect(at.getY(i)).toBeGreaterThan(0.2);
      if (normal.getY(i) > 0.8) { up += colour.getY(i); ups++; }
      if (normal.getY(i) < -0.2) { down += colour.getY(i); downs++; }
    }
    expect(up / ups).toBeGreaterThan((down / downs) * 1.15);
    one.dispose();
  });
});

describe('the pines of the mountain', () => {
  it('stand the old pine where the story walks to, behind everything on the path, and the simulation knows nothing of it', () => {
    // Berget: on the summit, between the cairn and the summit's end. Norrsken: left of the crack, the other way round.
    expect(berget.pine!.x).toBeGreaterThan(Math.max(...rocks.filter((rock) => rock.kind === 'rose').map((rock) => rock.x)) + 5);
    expect(berget.pine!.x).toBeLessThan(berget.ground[berget.ground.length - 1]!.x - 3);
    expect(norrsken.pine).toEqual({ x: 7.5, flip: true });
    expect(norrsken.pine!.x).toBeLessThan(norrsken.spots!.find((spot) => spot.id === 'lower')!.at.x);
    // Its stem and its roots keep behind the path: a big Elof, the ghost and the family stand in front of it.
    const wood = kit.get('tall')!;
    let nearest = -Infinity;
    for (let i = 0; i < wood.position.length; i += 3) {
      const z = PINE_DEPTH + wood.position[i + 2]!;
      nearest = Math.max(nearest, z);
      // A root near the path lies low.
      if (z > -1.4) expect(wood.position[i + 1]!, 'a root near the path').toBeLessThan(0.4);
    }
    // And none comes as near as a big candy stands.
    expect(nearest).toBeLessThan(-1.1);
    const folder = new URL('../../src/sim/', import.meta.url);
    for (const file of readdirSync(folder)) {
      if (file === 'types.ts') continue;
      expect(/\bpine\b/.test(readFileSync(new URL(file, folder), 'utf8')), `src/sim/${file}`).toBe(false);
    }
  });

  it('stand a few crooked pines on the rim, far back, and leave the open granite and the old pine their sky', () => {
    for (const chapter of [berget, norrsken] as ChapterData[]) {
      const rim = rimPines(chapter);
      expect(rim.length, chapter.id).toBeGreaterThanOrEqual(2);
      for (const one of rim) {
        expect(one.z, chapter.id).toBeLessThanOrEqual(-9);
        expect(Math.abs(one.x - chapter.pine!.x), chapter.id).toBeGreaterThanOrEqual(11);
      }
      for (const gust of chapter.gusts ?? []) expect(rim.filter((one) => one.x > gust.from - 3 && one.x < gust.to + 3).length, chapter.id).toBeLessThanOrEqual(1);
    }
    // At night two of them stand against the northern lights where the family is.
    expect(rimPines(norrsken).filter((one) => one.x > 14 && one.x < 36).length).toBeGreaterThanOrEqual(2);
  });
});

describe('a shape of the scene as a part of the kit', () => {
  it('is read where a matrix puts it', () => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    geometry.setAttribute('normal', new Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    const shape = shapeOf(geometry, new Matrix4().makeScale(2, 2, 2).setPosition(1, 0, 0));
    expect(Array.from(shape.position)).toEqual([1, 0, 0, 3, 0, 0, 1, 2, 0]);
    expect(Array.from(shape.normal)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
    expect(Array.from(shape.index)).toEqual([0, 1, 2]);
    expect(shape.colour.length).toBe(0);
  });
});
