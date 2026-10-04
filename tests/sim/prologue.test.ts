import { describe, expect, it } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { STEP } from '../../src/sim/constants';
import { MAMMA_TIME, PAPPA_TIME, prologuePose } from '../../src/sim/prologue';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const go: StepInput = { ...idle, x: 1 };
function tick(sim: Sim, seconds: number, input = idle) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) sim.step(input);
}
const chased = ['eye', 'paint', 'blink', 'mamma:passed', 'bag:torn', 'star'];

describe('the prologue freeze jokes', () => {
  it('freezes and topples the hopping ghost before the hinge tears the bag', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 5.5, y: 0.01 } }, {}, { flags: ['eye', 'paint', 'blink'] });
    for (let i = 0; i < 120 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('mamma');
    expect(sim.ghost!.t).toBeLessThan(1);
    expect(sim.flags.has('bag:torn')).toBe(false);
    tick(sim, 0.9, { ...go, hop: true, hopHeld: true, act: true });
    const frame = sim.prologue!.frame!;
    expect(prologuePose(prolog.prologue!, frame).tilt).toBeCloseTo(-Math.PI / 2);
    const position = sim.ghost!.x;
    tick(sim, 0.6, go);
    expect(sim.ghost!.x).toBe(position);
    expect(sim.candyCount).toBe(0);
    tick(sim, MAMMA_TIME, go);
    expect(sim.flags.has('mamma:passed')).toBe(true);
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.candyCount).toBeGreaterThan(0);
  });

  it('waits for Pappa, lifts the wooden ghost onto the railing, and leaves a safe walk to the title', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 45, y: 2.41 } }, {}, { flags: chased });
    tick(sim, 0.1);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    const start = sim.curr.x;
    tick(sim, 1.45, { ...go, hop: true, act: true });
    const placed = prologuePose(prolog.prologue!, sim.prologue!.frame!);
    expect(placed.x).toBeCloseTo(prolog.prologue!.railing.x);
    expect(placed.y).toBeCloseTo(prolog.prologue!.railing.y);
    expect(sim.curr.x).toBeCloseTo(start);
    expect(sim.flags.has('goal')).toBe(false);
    tick(sim, 1);
    const sneaking = prologuePose(prolog.prologue!, sim.prologue!.frame!);
    expect(sneaking.x).toBeGreaterThan(placed.x);
    tick(sim, 0.6);
    expect(sim.flags.has('pappa:done')).toBe(true);
    expect(sim.ghost!.gone).toBe(true);
    expect(sim.flags.has('goal')).toBe(false);
    tick(sim, 2, go);
    expect(sim.flags.has('goal')).toBe(true);
    expect(sim.bubbles).toBe(0);
  });

  it('replays an interrupted deck tableau from its appended checkpoint', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: [...chased, 'pappa:noticed'] });
    tick(sim, 0.2);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    expect(sim.curr.x).toBeCloseTo(45);
    tick(sim, PAPPA_TIME + 0.2);
    expect(sim.flags.has('pappa:done')).toBe(true);
    expect(sim.flags.has('star')).toBe(true);
    expect(sim.ghost!.gone).toBe(true);
    const again = new Sim(prolog, {}, { checkpoint: 2, flags: [...sim.flags] });
    tick(again, 0.2);
    expect(again.prologue!.frame).toBeNull();
    expect(again.ghost!.gone).toBe(true);
    tick(again, 2, go);
    expect(again.flags.has('goal')).toBe(true);
  });

  it('keeps old checkpoint indices and infers only the passed doorway for older saves', () => {
    expect(prolog.checkpoints!.slice(0, 2)).toEqual([{ x: 2.6, y: 0 }, { x: 26, y: 0 }]);
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: ['eye', 'paint', 'blink'] });
    tick(sim, 0.1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.flags.has('pappa:done')).toBe(false);
  });

  it('restarts an interrupted tableau after Till stora godiset without losing its completed actions', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: chased });
    tick(sim, 0.8);
    sim.toCheckpoint();
    expect(sim.prologue!.frame).toBeNull();
    tick(sim, 4.5);
    expect(sim.flags.has('pappa:done')).toBe(true);
    expect(sim.flags.has('star')).toBe(true);
  });
});
