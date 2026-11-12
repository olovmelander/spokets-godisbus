import { readFileSync } from 'node:fs';
import { Group, type Mesh, type Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { heightAt } from '../robot/robot';

/**
 * The beaver's gnawed trunks by the steps up its lodge in Älven, and the other things of the nature kit along the river
 * (`stubbe-gnagd`, `gren-a` and the rest). Olov, 12 November 2026: "i bäverhyddan så går man rakt igenom de tuggade
 * trädstammarna, det ser konstigt ut. Fixa det!"
 */
describe('the nature kit\'s things along Älven', () => {
  async function kit(): Promise<Object3D> {
    const file = readFileSync(new URL('../../art/baked/aventyr2/nature.glb', import.meta.url));
    return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
  }

  /** How near the path a model comes, over the ground he walks on, placed as the picture places a decor's kit model. */
  function reach(made: Object3D, d: NonNullable<typeof alven.decor>[number]) {
    const holder = new Group();
    holder.position.set(d.at.x, d.at.y, d.z ?? -0.6);
    holder.rotation.y = d.turn ?? 0;
    holder.scale.setScalar(d.scale ?? 1);
    holder.add(made.clone());
    holder.updateMatrixWorld(true);
    const p = new Vector3();
    let nearest = -Infinity;
    let shown = 0;
    holder.traverse((object) => {
      const mesh = object as Mesh;
      if (!mesh.isMesh) return;
      const at = mesh.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        p.fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld);
        if (p.y > heightAt(alven, p.x) + 0.02) { nearest = Math.max(nearest, p.z); shown++; }
      }
    });
    return { nearest, shown };
  }

  it('has the gnawed trunks behind the steps: no part of one is where he climbs, and they are still there, seen', async () => {
    const scene = await kit();
    const trunks = alven.decor!.filter((d) => d.word === 'stubbe-gnagd');
    const stick = alven.climbs![0]!;
    // Two of them by the steps he climbs, between the bank and the stick up the lodge.
    expect(trunks.filter((d) => d.at.x > stick.x - 4 && d.at.x <= stick.x).length).toBe(2);
    for (const d of trunks) {
      const { nearest, shown } = reach(scene.getObjectByName('stubbe-gnagd')!, d);
      // Over the ground where he walks, more than half an EL behind the path.
      expect(nearest, `the trunk at ${d.at.x}`).toBeLessThan(-0.5);
      // And it is there to be seen, not sunk out of sight.
      expect(shown, `the trunk at ${d.at.x}`).toBeGreaterThan(100);
    }
  });

  it('has Moa and Bertil run down from the car round the gnawed stump at the trail\'s end, not through it', () => {
    const stump = alven.decor!.filter((d) => d.word === 'stubbe-gnagd').sort((a, b) => b.at.x - a.at.x)[0]!;
    const card = alven.scenes!.find((scene) => scene.id === 'card')!;
    const come = alven.scenes!.find((scene) => scene.id === 'al:kids')!;
    for (const who of ['moa', 'bertil'] as const) {
      const way = [card.stage!.actors![who]![0]!, ...come.stage!.actors![who]!].filter((k) => k.x !== undefined && k.z !== undefined);
      for (let i = 1; i < way.length; i++) {
        const [a, b] = [way[i - 1]!, way[i]!];
        // How near the straight run from one key to the next comes to the stump's middle.
        const [dx, dz] = [b.x! - a.x!, b.z! - a.z!];
        const t = Math.max(0, Math.min(1, ((stump.at.x - a.x!) * dx + ((stump.z ?? 0) - a.z!) * dz) / (dx * dx + dz * dz)));
        const near = Math.hypot(a.x! + dx * t - stump.at.x, a.z! + dz * t - (stump.z ?? 0));
        expect(near, `${who}, run ${i}`).toBeGreaterThan(1.4);
      }
    }
  });

  it('lays every branch, stump and log of the kit behind the path, where he never walks through one', async () => {
    const scene = await kit();
    const things = alven.decor!.filter((d) => d.look === 'kit' && scene.getObjectByName(d.word!));
    expect(things.length).toBeGreaterThanOrEqual(7);
    for (const d of things) expect(reach(scene.getObjectByName(d.word!)!, d).nearest, `${d.word} at ${d.at.x}`).toBeLessThan(-0.5);
  });
});
