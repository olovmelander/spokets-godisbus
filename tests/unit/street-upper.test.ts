import { readFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { byn } from '../../src/content/chapters/byn';
import { pictureTop } from '../../src/render/picture-top';
import { STREET_DEPTH, UPPER, assemble, footOf, villageKit } from '../../src/render/village';
import type { ChapterData } from '../../src/sim/types';

/** The village kit as the game reads it (art/baked/boot/village.glb). */
async function kit() {
  const file = readFileSync(new URL('../../art/baked/boot/village.glb', import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  return villageKit(gltf.scene);
}

/** The corners of one stretch of a chapter's street, put together as the game does. */
async function corners(chapter: ChapterData, i: number) {
  const geometry = assemble(await kit(), chapter, chapter.street!, [i]);
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  return Array.from({ length: position.count }, (_, k) => ({
    x: position.getX(k), y: position.getY(k), z: position.getZ(k), nx: normal.getX(k), ny: normal.getY(k),
  }));
}

/**
 * Olov, 15 November 2026, of the picture that opens out over the flood when Elof thanks Moa in Byn i stormen: "vissa
 * byggnader inte är fullt modellerade – de slutar liksom med ett rakt streck". The kit's walls end at 12, the top of the
 * shop floor; over it each house is built whole (`UPPER`, src/render/village.ts).
 */
describe('the village houses over their shop floor', () => {
  it('builds every house whole, up to a roof over its eaves', async () => {
    for (const chapter of [byn, stormbyn]) {
      for (const [i, part] of chapter.street!.entries()) {
        if (part.kind !== 'house') continue;
        const foot = footOf(chapter, part);
        const all = await corners(chapter, i);
        const roof = all.filter((c) => c.y > foot + UPPER.eaves && c.ny > 0.5);
        expect(roof.length, `${chapter.id}: the house from ${part.from}`).toBeGreaterThan(4);
        expect(Math.max(...all.map((c) => c.y)) - foot, `${chapter.id}: the house from ${part.from}`).toBeGreaterThan(UPPER.eaves + 2);
      }
    }
  });

  it("closes the shoemaker's end over the crossing with a gable, where the picture over the flood sees it", async () => {
    const i = stormbyn.street!.findIndex((part) => part.goods === 'boots');
    const part = stormbyn.street![i]!;
    const foot = footOf(stormbyn, part);
    const gable = (await corners(stormbyn, i)).filter((c) => Math.abs(c.x - part.from) < 0.01 && c.nx < -0.9 && c.y > foot + UPPER.eaves);
    expect(gable.length).toBeGreaterThan(2);
  });

  it("grows the yard birch's stem up into the crown the flora hangs over it, beside Moa's wall, parting into limbs", async () => {
    const i = stormbyn.street!.findIndex((part) => part.kind === 'yard' && part.from === 92);
    const part = stormbyn.street![i]!;
    const at = part.from + 2;
    const crown = pictureTop(stormbyn)(at, STREET_DEPTH.far - 0.6);
    const stem = (await corners(stormbyn, i)).filter((c) => Math.abs(c.x - at) < 1.6 && c.z < STREET_DEPTH.far - 3);
    // Its limbs reach up to there, where its stem parts into them.
    const reach = Math.max(...stem.map((c) => c.y));
    expect(reach).toBeGreaterThan(crown + UPPER.birch - 0.5);
    expect(reach).toBeLessThanOrEqual(crown + UPPER.birch);
    // The kit's own stem ends under the crown's foot there (./lift/flora/trees.ts hangs it 1.8 to 2.7 under the top).
    expect(crown - 2.7).toBeGreaterThan(17.2);
  });
});
