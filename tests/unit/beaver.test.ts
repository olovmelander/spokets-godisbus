import { readFileSync } from 'node:fs';
import { Box3, Group, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { beaverLife } from '../../src/content/aventyr2/beaver';
import { alven } from '../../src/content/aventyr2/chapters/alven';

/** The beaver as the chapter puts it, with a model holding the parts the kit gives it (art/blender/a2-creatures.py). */
function beaver() {
  const decor = alven.decor!.find((d) => d.word === 'baver')!;
  const group = new Group();
  group.position.set(decor.at.x, decor.at.y, decor.z ?? -0.6);
  const model = new Group();
  for (const name of ['kit-head', 'baver-svans', 'baver-pinne']) {
    const part = new Object3D();
    part.name = name;
    model.add(part);
  }
  group.add(model);
  const elof = { x: 0, still: false };
  const life = beaverLife({ id: 'decor:beaver', at: decor.at, verb: 'take', look: 'kit', word: 'baver' }, group, model, () => alven.water ?? [], elof);
  let clock = 0;
  /** Runs it on for `seconds` with Elof at x. */
  const run = (x: number, seconds: number) => {
    elof.x = x;
    for (let t = 0; t < seconds; t += 1 / 30) { clock += 1 / 30; life.update(false, clock, 1 / 30); }
  };
  const world = () => model.getWorldPosition(new Vector3());
  return { decor, group, model, elof, run, world, part: (name: string) => model.getObjectByName(name)! };
}

describe('the beaver at its lodge in Älven', () => {
  it('sits on the bank behind the path by its stumps, gnawing its stick, before he comes', () => {
    const b = beaver();
    b.run(60, 3);
    expect(b.model.visible).toBe(true);
    expect(b.decor.z!).toBeLessThan(-1.5);
    const turns: number[] = [];
    for (let i = 0; i < 20; i++) { b.run(60, 0.05); turns.push(b.part('kit-head').rotation.x); }
    // Its head works as it gnaws, and the stick turns in its paws.
    expect(Math.max(...turns) - Math.min(...turns)).toBeGreaterThan(0.03);
    expect(b.part('baver-pinne').rotation.x).not.toBe(0);
  });

  it('looks round at him as he comes along the bank, thumps its tail, and goes off behind its lodge', () => {
    const b = beaver();
    b.run(100, 1);
    b.run(b.decor.at.x - 3, 1);
    // Its head is up, and between them its body and its head have turned to look straight at him.
    expect(b.part('kit-head').rotation.x).toBeLessThan(-0.1);
    const looking = b.model.rotation.y + b.part('kit-head').rotation.y;
    expect(looking).toBeCloseTo(Math.atan2(-3, -b.group.position.z), 2);
    // The tail goes up, and slaps down.
    let lifted = 0;
    for (let i = 0; i < 60; i++) { b.run(b.decor.at.x - 3, 1 / 30); lifted = Math.max(lifted, b.part('baver-svans').rotation.x); }
    expect(lifted).toBeGreaterThan(0.8);
    // Off it goes, behind the lodge, and out of sight.
    b.run(b.decor.at.x - 3, 2.4);
    expect(b.world().z).toBeLessThan(b.group.position.z - 1);
    b.run(b.decor.at.x - 3, 3);
    expect(b.model.visible).toBe(false);
  });

  it('swims home over the lake while he is on the lodge, low in the water, and dives in under it', () => {
    const b = beaver();
    b.run(b.decor.at.x - 3, 8);
    expect(b.model.visible).toBe(false);
    const lake = alven.water!.filter((w) => w.from > b.decor.at.x).sort((a, b2) => a.from - b2.from)[0]!;
    b.run(126, 1);
    expect(b.model.visible).toBe(true);
    const start = b.world();
    // Out on the open water, behind the path, its back at the surface.
    expect(start.x).toBeGreaterThan(lake.from);
    expect(start.z).toBeLessThan(-3);
    expect(start.y).toBeLessThan(lake.y);
    b.run(126, 4);
    const later = b.world();
    expect(later.x).toBeLessThan(start.x);
    expect(later.z).toBeGreaterThan(start.z);
    // By the shore it slaps the water and is gone.
    b.run(126, 4);
    expect(b.model.visible).toBe(false);
    // Back along the bank, out of sight of it: it is sitting there again.
    b.run(b.decor.at.x - 20, 0.5);
    expect(b.model.visible).toBe(true);
    expect(b.world().x).toBeCloseTo(b.decor.at.x, 3);
  });

  it('keeps still with less motion asked for', () => {
    const b = beaver();
    b.elof.still = true;
    b.run(60, 1);
    const head = b.part('kit-head').rotation.x;
    b.run(60, 1);
    expect(b.part('kit-head').rotation.x).toBe(head);
  });

  it('comes from Blender with its head, its tail on its hinge and its stick in its paws', async () => {
    const file = readFileSync(new URL('../../art/baked/aventyr2/creatures.glb', import.meta.url));
    const scene = (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
    const body = scene.getObjectByName('baver')!;
    const head = scene.getObjectByName('baver-huvud')!;
    const tail = body.getObjectByName('baver-svans')!;
    const stick = body.getObjectByName('baver-pinne')!;
    expect(body && head && tail && stick).toBeTruthy();
    scene.updateMatrixWorld(true);
    // The tail starts at its hinge and runs back from it (-z, as the front is +z), flat on the ground.
    const tailBox = new Box3().setFromObject(tail);
    expect(tailBox.max.z).toBeLessThan(tail.position.z + 0.1);
    expect(tailBox.min.z).toBeLessThan(tail.position.z - 1);
    expect(tailBox.min.y).toBeLessThan(0.1);
    // The stick lies across its paws, at its mouth, under its head.
    const stickBox = new Box3().setFromObject(stick);
    const headBox = new Box3().setFromObject(head);
    expect(stickBox.getSize(new Vector3()).x).toBeGreaterThan(1);
    expect(stickBox.max.y).toBeLessThan(headBox.max.y);
    expect(stickBox.max.z).toBeGreaterThan(headBox.getCenter(new Vector3()).z);
  });
});
