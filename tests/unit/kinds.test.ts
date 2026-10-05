import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { STORY, chapterNumber } from '../../src/content/chapters';
import { KINDS, album, foundFlag } from '../../src/content/kinds';
import { sv } from '../../src/content/sv';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';
import { heightAt } from '../robot/robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step({ ...idle, ...input });
}
const numbered = STORY.filter((chapter) => chapterNumber(chapter.id) > 0);

/** Elof under a hidden candy, on the ground there, having jumped as high as he can. */
function jumpAt(chapter: ChapterData, x: number): Sim {
  const sim = new Sim({ ...chapter, spawn: { x, y: heightAt(chapter, x) + 0.01 } });
  run(sim, 0.2);
  sim.step({ ...idle, hop: true, hopHeld: true });
  run(sim, 0.9, { hopHeld: true });
  return sim;
}

describe('the hidden candy for the album', () => {
  it('is sixteen kinds, four in each numbered chapter, each hidden once and in its own chapter', () => {
    expect(Object.keys(KINDS)).toHaveLength(16);
    const hidden = numbered.flatMap((chapter) => (chapter.hidden ?? []).map((h) => ({ ...h, chapter: chapter.id })));
    expect(hidden.map((h) => h.kind).sort()).toEqual(Object.keys(KINDS).sort());
    for (const chapter of numbered) expect(chapter.hidden, chapter.id).toHaveLength(4);
    for (const h of hidden) expect(KINDS[h.kind]!.chapter, h.kind).toBe(h.chapter);
    // The prologue, the final and the epilogue hide none.
    for (const chapter of STORY) if (chapterNumber(chapter.id) === 0) expect(chapter.hidden ?? []).toEqual([]);
  });

  it('has a name for every kind: a sort of candy, in plain words', () => {
    for (const kind of Object.keys(KINDS)) {
      expect(sv.kinds[kind], kind).toBeDefined();
      expect(sv.kinds[kind]!.length).toBeLessThanOrEqual(16);
    }
    expect(Object.keys(sv.kinds).sort()).toEqual(Object.keys(KINDS).sort());
  });

  it('lies off the trail: following the candy doesn\'t find it', () => {
    for (const chapter of numbered) {
      for (const h of chapter.hidden!) {
        const nearest = Math.min(...chapter.candy.map((c) => Math.hypot(c.x - h.x, c.y - h.y)));
        expect(nearest, `${chapter.id}: ${h.kind}`).toBeGreaterThan(0.9);
      }
    }
  });

  it('can be reached: he finds each one by jumping where it hangs, or by going where it lies', () => {
    for (const chapter of numbered) {
      for (const h of chapter.hidden!) {
        // One at the end of a challenge route is reached that way only: its own test shows how.
        if (h.route) continue;
        // One with a way of its own (up some ledges, down in a pocket, at the end of a swing) is played by
        // its chapter's secrets test, which has to exist and to name it.
        if (h.way !== undefined) {
          const file = new URL(`../sim/secrets-${chapter.id}.test.ts`, import.meta.url);
          expect(existsSync(file), `${chapter.id}: ${h.kind} is reached by "${h.way}", so tests/sim/secrets-${chapter.id}.test.ts must play it`).toBe(true);
          expect(readFileSync(file, 'utf8'), `${chapter.id}: ${h.kind}`).toContain(`'${h.kind}'`);
          continue;
        }
        const sim = jumpAt(chapter, h.x);
        expect(sim.flags.has(foundFlag(h.kind)), `${chapter.id}: ${h.kind} at ${h.x},${h.y}`).toBe(true);
        expect(sim.bubbles, `${chapter.id}: ${h.kind}`).toBe(0);
      }
    }
  });

  it('is not found by walking under it: where it hangs, it asks for a jump', () => {
    for (const chapter of numbered) {
      for (const h of chapter.hidden!) {
        if (h.way !== undefined || h.y - heightAt(chapter, h.x) < 1) continue;
        const sim = new Sim({ ...chapter, spawn: { x: h.x, y: heightAt(chapter, h.x) + 0.01 } });
        run(sim, 0.5);
        expect(sim.flags.has(foundFlag(h.kind)), `${chapter.id}: ${h.kind}`).toBe(false);
      }
    }
  });

  it('is kept: a saved game that has it starts with it, and the album reads every chapter', () => {
    const garden = numbered[0]!;
    const kind = garden.hidden![1]!.kind;
    const sim = new Sim(garden, {}, { flags: [foundFlag(kind)] });
    expect(sim.flags.has(foundFlag(kind))).toBe(true);
    expect(album({ garden: [foundFlag('skumbanan'), 'ladybird'], granskog: [foundFlag('gummiorm')], myren: [] })).toEqual(['skumbanan', 'gummiorm']);
    expect(album({})).toEqual([]);
    // In the order of the album, not the order found.
    expect(album({ berget: [foundFlag('polkagris')], garden: [foundFlag('gelehallon')] })).toEqual(['gelehallon', 'polkagris']);
  });

  it('gives every kind two colours that can be told apart on the bag', () => {
    const seen = new Set<string>();
    for (const [kind, look] of Object.entries(KINDS)) {
      expect(look.colour, kind).toMatch(/^#[0-9a-f]{6}$/);
      expect(look.mark, kind).toMatch(/^#[0-9a-f]{6}$/);
      expect(look.mark).not.toBe(look.colour);
      expect(seen.has(look.colour + look.mark), kind).toBe(false);
      seen.add(look.colour + look.mark);
    }
  });
});
