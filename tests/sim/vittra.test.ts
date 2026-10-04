import { describe, expect, it } from 'vitest';
import { granskog } from '../../src/content/chapters/granskog';
import { Sim } from '../../src/sim/sim';
import { newSave, readSave } from '../../src/save/store';
import { albumHtml } from '../../src/ui/album';
import type { ChapterData, StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const gift = granskog.spots!.find((spot) => spot.id === 'vittra:gift')!;
const settle = (sim: Sim) => { for (let i = 0; i < 40; i++) sim.step(idle); };
const lane: ChapterData = {
  id: 'vittra-test', ground: [{ x: -10, y: 0 }, { x: 10, y: 0 }], spawn: { x: 0, y: 0.01 }, goalX: 9, candy: [],
  spots: [{ ...gift, at: { x: 0, y: 0 } }],
};
function walkTo(sim: Sim, x: number) {
  const direction = Math.sign(x - sim.curr.x);
  for (let i = 0; i < 1000 && (x - sim.curr.x) * direction > 0; i++) sim.step({ ...idle, x: direction });
  expect((x - sim.curr.x) * direction).toBeLessThanOrEqual(0);
}

describe('a berry for the vittra neighbours', () => {
  it('keeps the original ghost story beat independent, and requires its own berry for the toy', () => {
    expect(granskog.beats!.find((beat) => beat.id === 'vittra')?.line).toBe('givesAway');
    const empty = new Sim({ ...granskog, spawn: { ...gift.at, y: gift.at.y + 0.01 } });
    settle(empty);
    empty.step({ ...idle, act: true });
    expect(empty.flags.has(gift.id)).toBe(false);
    const ready = new Sim({ ...granskog, spawn: { ...gift.at, y: gift.at.y + 0.01 } }, {}, { flags: ['vittra:berry'] });
    settle(ready);
    expect(ready.curr.word).toBe('leaveBerry');
    ready.step({ ...idle, act: true });
    expect(ready.flags.has(gift.id)).toBe(true);
    expect(ready.flags.has('keepsake:vittra')).toBe(false);
    expect(ready.flags.has('jay')).toBe(false);
  });

  it('gives no sticker for waiting at the door, then thanks him once on his next pass', () => {
    const sim = new Sim(lane, {}, { flags: ['vittra:berry'] });
    settle(sim);
    sim.step({ ...idle, act: true });
    for (let i = 0; i < 600; i++) sim.step(idle);
    expect(sim.flags.has('keepsake:vittra')).toBe(false);
    walkTo(sim, -4.5);
    expect(sim.flags.has('vittra:gift:away')).toBe(true);
    walkTo(sim, 0);
    expect(sim.flags.has('keepsake:vittra')).toBe(true);
    expect(sim.candyCount).toBe(0);
    const flags = [...sim.flags];
    walkTo(sim, -4.5);
    walkTo(sim, 0);
    expect([...sim.flags]).toEqual(flags);
  });

  it('remembers leaving a gift across saves and does not require the berry to be picked twice', () => {
    const save = { ...newSave(100, 'granskog'), flags: { granskog: ['vittra:berry', 'vittra:gift', 'vittra:gift:away'] } };
    const loaded = readSave(JSON.stringify(save));
    expect(loaded.kind).toBe('save');
    if (loaded.kind !== 'save') return;
    const sim = new Sim(lane, {}, { flags: loaded.save.flags.granskog! });
    settle(sim);
    expect(sim.flags.has('keepsake:vittra')).toBe(true);
    const html = albumHtml([], [], ['vittra']);
    expect(html).toContain('data-keepsake="vittra"');
    expect(html).toContain('0 av 16 sorter');
    expect(albumHtml([])).not.toContain('data-keepsake="vittra"');
  });
});
