import { describe, expect, it } from 'vitest';
import {
  COYOTE_TIME, ELOF_HALF_WIDTH, HOP_APEX, JUMP_APEX, JUMP_BUFFER, RUNNING_JUMP_REACH, RUN_AFTER, RUN_SPEED, STEP,
  STOP_WITHIN, WALK_DEFLECTION, WALK_SPEED,
} from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, StepInput } from '../../src/sim/types';

/** A long flat floor between two walls. */
const flat: ChapterData = {
  id: 'flat',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -30, y: 8 }, { x: -30, y: 0 }, { x: 60, y: 0 }, { x: 60, y: 8 }],
};

/** A ledge one EL high on the left, then lower ground. */
const ledge: ChapterData = {
  id: 'ledge',
  spawn: { x: -2, y: 1.01 },
  goalX: 1000,
  ground: [{ x: -8, y: 8 }, { x: -8, y: 1 }, { x: 0, y: 1 }, { x: 0, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 8 }],
};

const idle: StepInput = { x: 0, hopHeld: false, hop: false, act: false };
const steps = (seconds: number) => Math.round(seconds / STEP);

function run(sim: Sim, seconds: number, input: Partial<StepInput> = {}): void {
  for (let i = 0; i < steps(seconds); i++) sim.step({ ...idle, ...input });
}

/** Runs until Elof has left the ground and landed again. Returns the highest point of his feet. */
function apexOfJump(sim: Sim, input: Partial<StepInput>): number {
  let top = sim.curr.y;
  let left = false;
  for (let i = 0; i < steps(3); i++) {
    sim.step({ ...idle, ...input });
    top = Math.max(top, sim.curr.y);
    if (!sim.curr.grounded) left = true;
    else if (left) break;
  }
  return top;
}

function settled(chapter: ChapterData): Sim {
  const sim = new Sim(chapter);
  run(sim, 0.5);
  return sim;
}

describe('standing and running', () => {
  it('stands still on the ground', () => {
    const sim = settled(flat);
    expect(sim.curr.grounded).toBe(true);
    expect(Math.abs(sim.curr.y)).toBeLessThan(0.01);
    expect(Math.abs(sim.curr.x)).toBeLessThan(0.001);
  });

  it('reaches the run after RUN_AFTER of full stick', () => {
    const sim = settled(flat);
    run(sim, RUN_AFTER * 0.5, { x: 1 });
    expect(sim.curr.vx).toBeLessThan(RUN_SPEED * 0.6);
    run(sim, RUN_AFTER * 0.5 + STEP, { x: 1 });
    expect(sim.curr.vx).toBeCloseTo(RUN_SPEED, 3);
    expect(sim.curr.facing).toBe(1);
  });

  it('walks at a half-pushed stick', () => {
    const sim = settled(flat);
    run(sim, 1, { x: -WALK_DEFLECTION });
    expect(sim.curr.vx).toBeCloseTo(-WALK_SPEED, 3);
    expect(sim.curr.facing).toBe(-1);
  });

  it('stops within STOP_WITHIN', () => {
    const sim = settled(flat);
    run(sim, 1, { x: 1 });
    run(sim, STOP_WITHIN + STEP);
    expect(sim.curr.vx).toBe(0);
  });

  it('is stopped by a wall', () => {
    const sim = settled(flat);
    run(sim, 12, { x: -1 });
    expect(sim.curr.x).toBeGreaterThan(-30 + ELOF_HALF_WIDTH - 0.02);
    expect(sim.curr.x).toBeLessThan(-30 + ELOF_HALF_WIDTH + 0.02);
  });
});

describe('Hoppa', () => {
  it('hops to HOP_APEX on a tap', () => {
    const sim = settled(flat);
    sim.step({ ...idle, hop: true });
    expect(apexOfJump(sim, {})).toBeCloseTo(HOP_APEX, 1);
  });

  it('jumps to JUMP_APEX when the button is held', () => {
    const sim = settled(flat);
    sim.step({ ...idle, hop: true, hopHeld: true });
    expect(apexOfJump(sim, { hopHeld: true })).toBeCloseTo(JUMP_APEX, 1);
  });

  it('lands in between when the button is let go halfway up', () => {
    const sim = settled(flat);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.12, { hopHeld: true });
    const top = apexOfJump(sim, {});
    expect(top).toBeGreaterThan(HOP_APEX + 0.1);
    expect(top).toBeLessThan(JUMP_APEX - 0.1);
  });

  it('carries RUNNING_JUMP_REACH at a run', () => {
    const sim = settled(flat);
    run(sim, 1, { x: 1 });
    const from = sim.curr.x;
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    apexOfJump(sim, { x: 1, hopHeld: true });
    expect(sim.curr.x - from).toBeGreaterThan(RUNNING_JUMP_REACH - 0.15);
    expect(sim.curr.x - from).toBeLessThan(RUNNING_JUMP_REACH + 0.15);
  });

  it('does not jump again in the air', () => {
    const sim = settled(flat);
    sim.step({ ...idle, hop: true, hopHeld: true });
    run(sim, 0.25, { hopHeld: true });
    const rising = sim.curr.vy;
    sim.step({ ...idle, hop: true, hopHeld: true });
    expect(sim.curr.vy).toBeLessThan(rising);
  });

  function walkOffTheLedge(): Sim {
    const sim = settled(ledge);
    for (let i = 0; i < steps(5) && sim.curr.grounded; i++) sim.step({ ...idle, x: 1 });
    expect(sim.curr.grounded).toBe(false);
    return sim;
  }

  it('still jumps just after walking off a ledge (coyote time)', () => {
    const sim = walkOffTheLedge();
    run(sim, COYOTE_TIME - 0.05, { x: 1 });
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    expect(sim.curr.vy).toBeGreaterThan(3);
  });

  it('no longer jumps once the coyote time has passed', () => {
    const sim = walkOffTheLedge();
    run(sim, COYOTE_TIME + 0.05, { x: 1 });
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true });
    expect(sim.curr.vy).toBeLessThan(0);
  });

  it('remembers a press made just before landing (jump buffer)', () => {
    const sim = walkOffTheLedge();
    // Fall until just above the ground, press, and keep holding.
    for (let i = 0; i < steps(2) && sim.curr.y > 0.25; i++) sim.step({ ...idle });
    sim.step({ ...idle, hop: true, hopHeld: true });
    let jumped = false;
    for (let i = 0; i < steps(JUMP_BUFFER); i++) {
      sim.step({ ...idle, hopHeld: true });
      if (sim.curr.vy > 3) jumped = true;
    }
    expect(jumped).toBe(true);
  });
});

describe('determinism', () => {
  it('gives the same result for the same input, twice', () => {
    const play = () => {
      const sim = new Sim(flat);
      for (let i = 0; i < 600; i++) sim.step({ x: Math.sin(i / 40), hopHeld: i % 90 < 30, hop: i % 90 === 0, act: false });
      return sim.curr;
    };
    expect(play()).toEqual(play());
  });
});
