import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import type { ChapterData } from '../../src/sim/types';

/**
 * Where the scenes put the family, against the room's furniture (src/render/stage.ts: a table 5 long and 2.2 deep, a
 * chair 1.1 square). Stormkvällen opened with Moa sitting in the middle of the table and Mamma and Pappa on one spot,
 * and Morgonen had Moa in the table and Bertil standing in a chair (Olov, 8 November 2026).
 */
const TABLE = { x: 2.5, z: 1.1 };
const CHAIR = 0.55;
/** How far a body reaches round its feet. */
const BODY = 0.3;
const SEATED = new Set(['sit', 'carve', 'draw']);

/** Each place a scene puts someone, and whether they sit there. */
function places(chapter: ChapterData) {
  const out: { scene: string; who: string; at: number; x: number; z: number; seated: boolean }[] = [];
  for (const scene of chapter.scenes ?? []) {
    for (const [who, keys] of Object.entries(scene.stage?.actors ?? {})) {
      if (who === 'ghost') continue;
      let act = '';
      for (const key of keys ?? []) {
        act = key.act ?? act;
        if (key.x === undefined || key.z === undefined) continue;
        out.push({ scene: scene.id, who, at: key.at, x: key.x, z: key.z, seated: SEATED.has(act) });
      }
    }
  }
  return out;
}

describe('the family in the scenes, and the furniture', () => {
  const furnished = [...STORY, ...AVENTYR2].filter((chapter) => (chapter.furniture ?? []).some((piece) => piece.look === 'table'));

  it('finds the rooms with a table', () => {
    expect(furnished.map((chapter) => chapter.id)).toEqual(expect.arrayContaining(['stormkvall', 'morgonen']));
  });

  for (const chapter of furnished) {
    it(`${chapter.id}: nobody is put inside the table, and nobody stands in a chair`, () => {
      const tables = chapter.furniture!.filter((piece) => piece.look === 'table' && (piece.face ?? 0.25) === 0.25);
      const chairs = chapter.furniture!.filter((piece) => piece.look === 'chair');
      const wrong = places(chapter).filter((p) =>
        tables.some((t) => Math.abs(p.x - t.at.x) < TABLE.x + BODY && Math.abs(p.z - t.z) < TABLE.z + BODY)
        || (!p.seated && chairs.some((c) => Math.abs(p.x - c.at.x) < CHAIR + BODY && Math.abs(p.z - c.z) < CHAIR + BODY)));
      expect(wrong).toEqual([]);
    });
  }

  it('Stormkvällen: the evening opens with everyone a body apart', () => {
    const kvall = places(STORY.concat(AVENTYR2).find((chapter) => chapter.id === 'stormkvall')!).filter((p) => p.scene === 'kvall' && p.at === 0);
    for (const [i, a] of kvall.entries()) {
      for (const b of kvall.slice(i + 1)) expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.who} and ${b.who}`).toBeGreaterThan(1.2);
    }
  });
});
