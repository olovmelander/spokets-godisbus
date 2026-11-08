import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { byn } from '../../src/content/chapters/byn';
import { STREET_DEPTH, assemble, drawnTogether, villageKit } from '../../src/render/village';

/** The street as the game puts it together from the village kit (art/baked/boot/village.glb). */
async function street() {
  const file = readFileSync(new URL('../../art/baked/boot/village.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  const kit = villageKit(gltf.scene);
  const parts = byn.street ?? [];
  return drawnTogether(parts).map((which) => ({ names: which.map((i) => parts[i]!.goods ?? parts[i]!.kind), geometry: assemble(kit, byn, parts, which) }));
}

describe("the shade between the street's parts", () => {
  it('darkens the boards beside a shop window casing, and fades within a hand or two', async () => {
    const shop = (await street()).find(({ names }) => names.includes('candy'))!.geometry;
    const position = shop.getAttribute('position'), normal = shop.getAttribute('normal'), colour = shop.getAttribute('color');
    // The candy shop's boards run from its left end to its window's casing, at 111.6: a board's face, at mid height.
    const at = (x: number) => {
      let best = -1;
      for (let i = 0; i < position.count; i++) {
        if (Math.abs(position.getZ(i) - STREET_DEPTH.near) > 1e-3 || normal.getZ(i) < 0.99 || Math.abs(position.getY(i) - 3.3 - 6) > 3) continue;
        if (best < 0 || Math.abs(position.getX(i) - x) < Math.abs(position.getX(best) - x)) best = i;
      }
      return { x: position.getX(best), light: colour.getX(best) + colour.getY(best) + colour.getZ(best) };
    };
    const edge = at(111.6), open = at(111);
    expect(Math.abs(edge.x - 111.6)).toBeLessThan(0.02);
    expect(open.x).toBeLessThan(111.2);
    expect(edge.light / open.light).toBeLessThan(0.8);
    expect(edge.light / open.light).toBeGreaterThan(0.5);
  });

  it('needs no more than a few thousand corners more along the whole street', async () => {
    const triangles = (await street()).reduce((sum, { geometry }) => sum + geometry.index!.count / 3, 0);
    expect(triangles).toBeLessThan(26000);
  });
});
