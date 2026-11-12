import { describe, expect, it } from 'vitest';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData } from '../../src/sim/types';
import { idle, run, use } from './drive';

/**
 * A staged moment is played where he began it (docs/dialogue.md). The scenes play one at a time, and a scene he is
 * free in may still be playing when he does the thing that starts the next: hooks the latch while Pappa is still on
 * his way to the window, takes his cup while the others still answer the name (Morgonen). He was free until the
 * first had played out, and the scene staged at the latch began with him at the other end of the room.
 */
const room: ChapterData = {
  id: 'room', spawn: { x: 0, y: 0.01 }, goalX: 1000, candy: [],
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 8 }],
  spots: [{ id: 'latch', at: { x: 5, y: 0 }, verb: 'turn' }],
  scenes: [
    // Not held: someone walks over, and he may go where he likes meanwhile.
    { id: 'walks-over', at: 1, seconds: 4 },
    { id: 'hooked', on: 'latch', seconds: 1, hold: true },
    // Another he is free in, due at a place: it does not stop him either.
    { id: 'passing', at: 30, seconds: 2 },
  ],
};

describe('a moment he stands for, begun while another scene still plays', () => {
  it('holds him where he began it, until the scene before it is over', () => {
    const sim = new Sim(room);
    for (let i = 0; i < 5 / STEP && sim.curr.x < 4.6; i++) sim.step({ ...idle, x: 1 });
    expect(sim.sceneFrame?.id).toBe('walks-over');
    expect(sim.held).toBe(false);
    use(sim);
    expect(sim.flags.has('latch')).toBe(true);
    // The first scene still plays, and he already stands: the stick does nothing.
    expect(sim.sceneFrame?.id).toBe('walks-over');
    expect(sim.held).toBe(true);
    const at = sim.curr.x;
    run(sim, 1, { x: 1 });
    expect(sim.curr.x).toBeCloseTo(at, 1);
    // Then the moment itself, with him still at the latch.
    for (let i = 0; i < 6 / STEP && sim.sceneFrame?.id !== 'hooked'; i++) sim.step({ ...idle, x: 1 });
    expect(sim.sceneFrame?.id).toBe('hooked');
    expect(Math.abs(sim.curr.x - 5)).toBeLessThan(1);
    run(sim, 1.2, { x: 1 });
    expect(sim.flags.has('scene:hooked')).toBe(true);
    expect(sim.held).toBe(false);
  });

  it('does not hold him for a scene he is free in, nor before he has done the thing', () => {
    const sim = new Sim(room);
    run(sim, 1, { x: 1 });
    expect(sim.sceneFrame?.id).toBe('walks-over');
    expect(sim.held).toBe(false);
    // Past the latch without touching it: nothing is due.
    for (let i = 0; i < 20 / STEP && sim.curr.x < 31; i++) sim.step({ ...idle, x: 1 });
    expect(sim.curr.x).toBeGreaterThan(30);
    expect(sim.held).toBe(false);
  });
});
