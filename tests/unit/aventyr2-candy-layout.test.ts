import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { COLLECTION_PLACES } from '../../src/content/collections';
import type { ChapterData, Vec } from '../../src/sim/types';

/**
 * How Äventyr 2's sweets lie (Olov, 12 November 2026: "alla godisar och saker och specialgodisar ligger placerade fint och
 * strukturerat och inte för plottrigt"): none on top of another, none at the foot of a big candy, and the album's sweet and
 * the lost thing beside it in a place of their own, with no heart or sweet of the trail crowding them. Each of these was
 * broken somewhere: two sweets on one spot at the foot of Byn i stormen's wall, a heart and a sweet of the trail on one
 * spot on Stormskogen's pole, five hearts round the lingonhjärta and the paper boat, sweets on the big candies' sticks.
 */

const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

interface Pickup extends Vec { what: string }

/** What he picks up: the trail's sweets, the side candy, the album's sweet, and the lost thing (drawn about 0.4 over where it lies). */
function pickups(chapter: ChapterData): Pickup[] {
  return [
    ...chapter.candy.map((c, i) => ({ x: c.x, y: c.y, what: `sweet ${i}` })),
    ...(chapter.side ?? []).map((c, i) => ({ x: c.x, y: c.y, what: `side ${i}` })),
    ...(chapter.hidden ?? []).map((h) => ({ x: h.x, y: h.y, what: `hidden ${h.kind}` })),
    ...(chapter.spots ?? []).filter((s) => s.id.startsWith('lost:')).map((s) => ({ x: s.at.x, y: s.at.y + 0.4, what: s.id })),
  ];
}
const place = (p: Pickup) => `${p.what} at ${p.x},${p.y}`;

describe('Äventyr 2: where its sweets lie', () => {
  for (const chapter of AVENTYR2) {
    describe(chapter.id, () => {
      it('lays no two of them on top of each other', () => {
        const all = pickups(chapter);
        for (let i = 0; i < all.length; i++) {
          for (let j = i + 1; j < all.length; j++) {
            const a = all[i]!, b = all[j]!;
            // The album's sweet and its lost thing are one find, side by side.
            if (a.what.startsWith('hidden') && b.what.startsWith('lost:')) continue;
            expect(dist(a, b), `${place(a)} and ${place(b)}`).toBeGreaterThanOrEqual(0.6);
          }
        }
      });

      it('stands each big candy in a gap of the trail, with no sweet at its foot', () => {
        // The big candy is a lollipop: a stick 1.1 high, and its sweet over it.
        for (const big of chapter.checkpoints ?? []) {
          for (const [i, c] of chapter.candy.entries()) {
            if (c.y - big.y > 1.9) continue;
            expect(Math.abs(c.x - big.x), `sweet ${i} at ${c.x},${c.y} by the big candy at ${big.x}`).toBeGreaterThan(0.55);
          }
        }
      });

      it('gives the album\'s sweet and the lost thing a place of their own, off the trail and clear of the hearts', () => {
        const at = COLLECTION_PLACES[chapter.id];
        if (!at) return;
        const others = pickups(chapter).filter((p) => p.what.startsWith('sweet') || p.what.startsWith('side'));
        const sweet = chapter.hidden!.find((h) => h.kind === at.kind)!;
        const lost = chapter.spots!.find((s) => s.id === `lost:${at.find}`)!;
        for (const p of others) {
          expect(dist(p, sweet), `${place(p)} by the ${at.kind}`).toBeGreaterThan(0.95);
          expect(dist(p, { x: lost.at.x, y: lost.at.y + 0.4 }), `${place(p)} by the ${at.find}`).toBeGreaterThan(0.8);
        }
        // Nor at a big candy.
        for (const big of chapter.checkpoints ?? []) expect(Math.abs(big.x - sweet.x) > 1.5 || Math.abs(big.y - at.y) > 1.5, `the big candy at ${big.x}`).toBe(true);
      });
    });
  }
});
