import { describe, expect, it } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';
import type { Storm } from '../../src/sim/types';

/** Äventyr 2's buildings (src/content/aventyr2/buildings.ts): each is built, stands on its foot, and costs two draws at most. */
describe('Äventyr 2: the buildings', () => {
  const kinds: NonNullable<Storm['buildings']>[number]['kind'][] = ['villa', 'barn', 'playhouse', 'goal', 'floodlight', 'stand', 'clubhouse', 'tower', 'hut', 'birch', 'car', 'kota', 'church', 'bridge', 'woodshed', 'rowboat', 'swings', 'slide', 'picnic', 'volleyball', 'lodge', 'mailbox', 'cliff'];
  for (const kind of kinds) {
    it(`builds the ${kind} in at most two meshes, standing where it is put`, () => {
      const made = building({ kind, x: 10, z: -8 });
      expect(made.group.children.length).toBeLessThanOrEqual(2);
      expect(made.group.position.x).toBe(10);
      expect(made.group.position.z).toBe(-8);
      for (const child of made.group.children) {
        const position = (child as import('three').Mesh).geometry.getAttribute('position');
        expect(position.count).toBeGreaterThan(0);
        for (let i = 0; i < position.count; i++) expect(Number.isFinite(position.getY(i))).toBe(true);
      }
    });
  }
});
