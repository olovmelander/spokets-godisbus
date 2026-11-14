import { readFileSync } from 'node:fs';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, Object3D, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { beaverLife } from '../../src/content/aventyr2/beaver';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { forwardAt, slopeDrop } from '../../src/render/dressing/ground';
import { heightAt } from '../robot/robot';

/**
 * The beaver's lodge on Älven's bank as Blender baked it (art/blender/a2-buildings.py, `baverhydda`). Olov, 14 November
 * 2026: "Bäverhyddan behöver få bättre design och texturer." It is laid over the ground he walks on, so the kit shares
 * numbers with the chapter, with the ground's slope in front of the path, and with the beaver's place on its top
 * (HANDOVER's "Senare": "the beaver on its lodge is half behind sticks").
 */
describe('Äventyr 2: the beaver\'s lodge of the buildings kit', () => {
  const def = alven.storm!.buildings!.find((b) => b.kind === 'lodge')!;
  const kit = readFileSync(new URL('../../art/blender/a2-buildings.py', import.meta.url), 'utf8');
  /** A table of the kit, by its name: the numbers after `NAME = `, to the end of its statement (its lines that follow are indented). */
  const numbers = (name: string) => {
    const from = kit.indexOf(`\n${name} = `);
    expect(from, name).toBeGreaterThan(0);
    const rest = kit.slice(from + 1);
    const text = rest.slice(rest.indexOf('='), rest.search(/\r?\n(?=\S)/));
    // Not the figures in a key's name ('step1').
    return [...text.matchAll(/(?<![A-Za-z_])-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  };

  /** The lodge's points and faces, in the chapter's own x, y and z: a baked file is plain, with no compression to undo. */
  function lodge(): { mesh: Mesh; points: Vector3[] } {
    const data = readFileSync(new URL('../../art/baked/aventyr2/buildings.glb', import.meta.url));
    const length = data.readUInt32LE(12);
    const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
    const bin = data.subarray(20 + length + 8);
    const read = (index: number): number[] => {
      const accessor = json.accessors[index];
      const view = json.bufferViews[accessor.bufferView];
      const size = accessor.type === 'VEC3' ? 3 : 1;
      const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
      const values: number[] = [];
      for (let i = 0; i < accessor.count * size; i++) {
        if (accessor.componentType === 5126) values.push(bin.readFloatLE(start + i * 4));
        else if (accessor.componentType === 5125) values.push(bin.readUInt32LE(start + i * 4));
        else values.push(bin.readUInt16LE(start + i * 2));
      }
      return values;
    };
    const node = (json.nodes as { name: string; mesh?: number }[]).find((n) => n.name === 'baverhydda')!;
    const primitive = json.meshes[node.mesh!].primitives[0];
    const fit = (def.width ?? 18) / 18;
    const at = read(primitive.attributes.POSITION);
    const points: Vector3[] = [];
    for (let i = 0; i < at.length; i += 3) {
      at[i] = def.x + at[i]! * fit;
      at[i + 1] = (def.y ?? 0) + at[i + 1]! * fit;
      at[i + 2] = def.z + at[i + 2]! * fit;
      points.push(new Vector3(at[i], at[i + 1], at[i + 2]));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(at, 3));
    geometry.setIndex(read(primitive.indices));
    return { mesh: new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide })), points };
  }
  const made = lodge();

  /** Where the beaver stands when it has come out on top, as its life puts it there (tests/unit/beaver.test.ts). */
  function summit(): Vector3 {
    const decor = alven.decor!.find((d) => d.word === 'baver')!;
    const group = new Group();
    group.position.set(decor.at.x, decor.at.y, decor.z ?? -0.6);
    const model = new Group();
    for (const name of ['kit-head', 'baver-svans', 'baver-pinne']) { const part = new Object3D(); part.name = name; model.add(part); }
    group.add(model);
    const elof = { x: 0, still: false };
    const life = beaverLife({ id: 'decor:beaver', at: decor.at, verb: 'take', look: 'kit', word: 'baver' }, group, model, () => alven.water ?? [], elof, () => def);
    let clock = 0;
    const run = (x: number, seconds: number) => { elof.x = x; for (let t = 0; t < seconds; t += 1 / 30) { clock += 1 / 30; life.update(false, clock, 1 / 30); } };
    run(decor.at.x - 3, 8);
    run(120.4, 3);
    expect(model.visible).toBe(true);
    return model.getWorldPosition(new Vector3());
  }

  it('is made for the ground he walks on: the bank, the two steps, the top and the far side down to the shore', () => {
    const [bank, step1, high1, step2, high2, top, topEnds, high, shore] = numbers('LODGE_WALK');
    const over = (x: number) => heightAt(alven, def.x + x) - (def.y ?? 0);
    expect(over(step1! - 0.2)).toBeCloseTo(bank!, 5);
    expect(over(step1! + 0.2)).toBeCloseTo(high1!, 5);
    expect(over(step2! + 0.2)).toBeCloseTo(high2!, 5);
    expect(over(top! + 0.2)).toBeCloseTo(high!, 5);
    expect(over(topEnds! - 0.2)).toBeCloseTo(high!, 5);
    expect(over(shore! + 0.2)).toBeCloseTo(bank!, 5);
    // Half way down the far side.
    expect(over((topEnds! + shore!) / 2)).toBeCloseTo((high! + bank!) / 2, 5);
  });

  it('is made for the ground\'s own slope in front of the path, and for how its front is drawn back at a wall\'s top', () => {
    const fall = numbers('LODGE_FALL');
    expect(fall.length).toBeGreaterThanOrEqual(16);
    // Where the ground's slope changes, the lodge's apron would stand in it or over it: rebake the kit with the new rows.
    for (let i = 0; i < fall.length; i += 2) expect(slopeDrop(fall[i]!), `at ${fall[i]} in front`).toBeCloseTo(fall[i + 1]!, 2);
    for (const z of [0.7, 1.2, 1.9, 2.6, 3.4, 4.2]) {
      const [a, b] = [fall.findLastIndex((v, i) => i % 2 === 0 && v <= z), fall.findIndex((v, i) => i % 2 === 0 && v > z)];
      const between = fall[a + 1]! + ((fall[b + 1]! - fall[a + 1]!) * (z - fall[a]!)) / (fall[b]! - fall[a]!);
      expect(Math.abs(slopeDrop(z) - between), `at ${z} in front`).toBeLessThan(0.06);
    }
    const [drawn] = numbers('LODGE_DRAWN');
    const [, , , , , top] = numbers('LODGE_WALK');
    // All the way forward where the lodge lays its own mud, drawn back before that.
    expect(forwardAt(alven, def.x + top! + drawn! + 0.01)).toBe(1);
    expect(forwardAt(alven, def.x + top! + drawn! - 0.3)).toBeLessThan(1);
  });

  it('leaves the strip he walks to the ground: nothing of it stands over his feet, on the steps, the top or the far side', () => {
    const [from, to] = numbers('LODGE_BAND');
    // The strip, in the chapter's z: from behind the path's line to in front of it.
    const [back, front] = [from! - 7, to! - 7];
    expect(back).toBeLessThan(-0.6);
    expect(front).toBeGreaterThan(0.5);
    let over = 0;
    for (const p of made.points) if (p.z > back + 0.02 && p.z < front - 0.02 && p.y > heightAt(alven, p.x) + 0.02) over++;
    expect(over).toBe(0);
    // And just in front of the strip it lies low: nothing between his boots and the camera.
    for (const p of made.points) {
      if (p.z < front || p.z > 2.4 || p.x < def.x - 6 || p.x > def.x + 8.6) continue;
      expect(p.y - heightAt(alven, p.x), `at ${p.x.toFixed(2)}, ${p.z.toFixed(2)}`).toBeLessThan(0.16);
    }
  });

  it('has its crown where the beaver comes out, under its feet, and nothing higher anywhere', () => {
    const top = summit();
    const [x, d, high] = numbers('LODGE_SUMMIT');
    expect(top.x).toBeCloseTo(def.x + x!, 2);
    expect(top.z).toBeCloseTo(def.z + d!, 2);
    expect(top.y).toBeCloseTo((def.y ?? 0) + high!, 2);
    const hit = new Raycaster(new Vector3(top.x, top.y + 6, top.z), new Vector3(0, -1, 0), 0, 12).intersectObject(made.mesh)[0];
    expect(hit).toBeDefined();
    // Its feet on the mud: not sunk in it, not in the air over it.
    expect(Math.abs(hit!.point.y - top.y)).toBeLessThan(0.08);
    expect(Math.max(...made.points.map((p) => p.y))).toBeLessThan(top.y + 0.12);
  });

  it('shows the beaver whole on its crown: from the path below, nothing of the lodge is between it and the camera', () => {
    const top = summit();
    // The beaver is about 1.6 wide and 2 tall there. From where the camera stands, a little over him on the roof and
    // far in front, sight lines to its feet, its middle and its sides: each reaches it without meeting the lodge.
    for (const eye of [new Vector3(121, 6.2, 24), new Vector3(123.4, 7.2, 26), new Vector3(118, 5.4, 22), new Vector3(127, 5, 24)]) {
      for (const [dx, dy] of [[0, 0.12], [-0.7, 0.2], [0.7, 0.2], [0, 1], [-0.6, 1], [0.6, 1.6]] as const) {
        const aim = new Vector3(top.x + dx, top.y + dy, top.z);
        const way = aim.clone().sub(eye);
        const far = way.length();
        const hit = new Raycaster(eye, way.normalize(), 0, far - 0.05).intersectObject(made.mesh)[0];
        expect(hit, `from ${eye.toArray()} to ${dx}, ${dy}: the lodge is in the way at ${hit?.point.toArray().map((v) => v.toFixed(2))}`).toBeUndefined();
      }
    }
  });

  it('is a dome of sticks: many of them, of many thicknesses, behind the path and down its front into the water', () => {
    expect(made.points.length).toBeGreaterThan(9000);
    const index = made.mesh.geometry.getIndex()!;
    // Small enough to be one of five things in the pack.
    expect(index.count / 3).toBeLessThan(26000);
    const built = kit.match(/wanted_sticks = \(\('logs', (\d+).*\('branches', (\d+).*\('twigs', (\d+)/)!;
    expect(Number(built[1]) + Number(built[2]) + Number(built[3])).toBeGreaterThan(450);
    // Its foot is in the water in front of it, under the surface.
    const water = Math.max(...alven.water!.map((w) => w.y));
    expect(made.points.some((p) => p.z > 5 && p.y < water - 0.1)).toBe(true);
    // And it rises behind him to well over the roof he walks on.
    expect(Math.max(...made.points.map((p) => p.y))).toBeGreaterThan(heightAt(alven, def.x) + 2.4);
  });
});
