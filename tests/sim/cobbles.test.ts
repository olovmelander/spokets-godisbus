import { describe, expect, it } from 'vitest';
import { berget } from '../../src/content/chapters/berget';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const stones = berget.spots!.filter((spot) => spot.look === 'cobble');
function walkTo(sim: Sim, x: number) {
  const direction = Math.sign(x - sim.curr.x);
  for (let i = 0; i < 1500 && (x - sim.curr.x) * direction > 0; i++) sim.step({ ...idle, x: direction });
  expect((x - sim.curr.x) * direction).toBeLessThanOrEqual(0);
}

describe('the old shore’s cobbles', () => {
  it('replays each stone’s own pitch in either direction and keeps its discovery', () => {
    const sim = new Sim({ ...berget, spawn: { x: 95.5, y: 26.41 } });
    walkTo(sim, 109);
    expect(sim.noteHits.map((hit) => hit.midi)).toEqual([67, 69, 71, 74, 76]);
    walkTo(sim, 95.5);
    expect(sim.noteHits.slice(5).map((hit) => hit.midi)).toEqual([76, 74, 71, 69, 67]);
    expect(stones.every((stone) => sim.flags.has(stone.id))).toBe(true);
  });

  it('stays playable after loading every discovery, without repeated ringing while standing still', () => {
    const sim = new Sim({ ...berget, spawn: { x: 98, y: 26.41 } }, {}, { flags: stones.map((stone) => stone.id) });
    for (let i = 0; i < 240; i++) sim.step(idle);
    expect(sim.noteHits).toHaveLength(1);
    expect(sim.noteHits[0]?.midi).toBe(67);
    walkTo(sim, 101.5);
    walkTo(sim, 98);
    expect(sim.noteHits.filter((hit) => hit.id === 'note:1')).toHaveLength(2);
  });
});
