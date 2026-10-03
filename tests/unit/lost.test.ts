import { describe, expect, it } from 'vitest';
import { STORY } from '../../src/content/chapters';
import { garden } from '../../src/content/chapters/garden';
import { LOST, lostFlag, lostFound } from '../../src/content/lost';
import { sv } from '../../src/content/sv';
import { STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';
import { albumHtml } from '../../src/ui/album';

// Hittegods (plan §4.8, O2): four small things lost under the deck.

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const things = (garden.spots ?? []).filter((spot) => spot.id.startsWith('lost:'));
const deck = garden.roofs![0]!;

describe('the lost things under the deck', () => {
  it('are four, each with a name, and all of them in Kapitel 1', () => {
    expect(things.map((spot) => spot.id)).toEqual(LOST.map(lostFlag));
    for (const thing of LOST) {
      expect(sv.lost[thing], thing).toBeDefined();
      expect(sv.lost[thing]!.length).toBeLessThanOrEqual(18);
    }
    expect(Object.keys(sv.lost).sort()).toEqual([...LOST].sort());
    for (const chapter of STORY) {
      if (chapter.id !== 'garden') expect((chapter.spots ?? []).filter((spot) => spot.id.startsWith('lost:')), chapter.id).toEqual([]);
    }
  });

  it('lie under the deck, on the firm ground before the gully, each with its own look', () => {
    for (const spot of things) {
      expect(spot.at.x, spot.id).toBeGreaterThan(deck.from + 1);
      expect(spot.at.x, spot.id).toBeLessThan(61);
      expect(spot.touch, spot.id).toBe(true);
      expect(spot.look, spot.id).toBe(spot.id.slice('lost:'.length));
      // On a stone lower than the boards overhead.
      expect(spot.at.y).toBeLessThan(deck.y - 2);
    }
  });

  it('walking past leaves each where it lies, and a jump takes it', () => {
    for (const spot of things) {
      const walked = new Sim({ ...garden, spawn: { x: spot.at.x - 2, y: 0.01 } });
      for (let i = 0; i < 1.3 / STEP; i++) walked.step({ ...idle, x: 1 });
      expect(walked.curr.x, spot.id).toBeGreaterThan(spot.at.x + 1);
      expect(walked.flags.has(spot.id), spot.id).toBe(false);

      const jumped = new Sim({ ...garden, spawn: { x: spot.at.x, y: 0.01 } });
      for (let i = 0; i < 0.2 / STEP; i++) jumped.step(idle);
      jumped.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 0.8 / STEP; i++) jumped.step({ ...idle, hopHeld: true });
      expect(jumped.flags.has(spot.id), spot.id).toBe(true);
    }
  });

  it('is never what the helper points at: nothing needs them', () => {
    const sim = new Sim({ ...garden, spawn: { x: 47.5, y: 0.01 } }, {}, { flags: ['ladybird'] });
    for (let i = 0; i < 0.3 / STEP; i++) sim.step(idle);
    expect(hintFor(sim, garden)!.verb).toBe('lace');
  });

  it('is read from the save, in the list\'s own order, and shown by name in the album', () => {
    expect(lostFound({})).toEqual([]);
    expect(lostFound({ garden: ['ladybird', lostFlag('coin'), lostFlag('marble')], myren: ['light'] })).toEqual(['marble', 'coin']);
    const none = albumHtml([]);
    expect(none).toContain(sv.lostTitle);
    for (const thing of LOST) expect(none, thing).not.toContain(sv.lost[thing]);
    const some = albumHtml([], ['coin']);
    expect(some).toContain(sv.lost.coin);
    expect(some).not.toContain(sv.lost.marble);
    // The sixteen kinds are still sixteen.
    expect(some.match(/<ul class="album-grid">(.*?)<\/ul>/)![1]!.match(/<li/g)).toHaveLength(16);
  });

  it('names no brand, and no one outside the family\'s first names', () => {
    for (const name of Object.values(sv.lost)) expect(name).toMatch(/^[A-ZÅÄÖ][a-zåäö]+( [a-zåäö]+)*$/);
  });
});
