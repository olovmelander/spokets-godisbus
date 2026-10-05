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
/** Everything up to Elof stepping onto Pappa's hand, told: the next is the lift and Moa's drawing. */
const toHand = ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar', 'mamma:noticed', 'mamma:passed', 'bag:torn', 'star', 'scene:poff', 'scene:familj'];
const told = [...toHand, 'hand', 'scene:handen'];
const layout = prolog.prologue!;

describe('the prologue freeze jokes', () => {
  it('freezes and topples the hopping ghost before the hinge tears the bag', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 5.5, y: 0.01 } }, {}, { flags: ['scene:morgon', 'eye', 'paint', 'woke', 'grab', 'blink', 'scene:vaknar'] });
    for (let i = 0; i < 240 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('mamma');
    expect(sim.flags.has('mamma:noticed')).toBe(true);
    expect(sim.flags.has('bag:torn')).toBe(false);
    tick(sim, 0.9, { ...go, hop: true, hopHeld: true, act: true });
    const frame = sim.prologue!.frame!;
    expect(prologuePose(layout, frame).tilt).toBeCloseTo(-Math.PI / 2);
    const position = sim.ghost!.x;
    tick(sim, 0.6, go);
    expect(sim.ghost!.x).toBe(position);
    expect(sim.candyCount).toBe(0);
    tick(sim, MAMMA_TIME, go);
    expect(sim.flags.has('mamma:passed')).toBe(true);
    tick(sim, 1.5, go);
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.candyCount).toBeGreaterThan(0);
  });

  it('waits for Pappa until Moa\'s drawing is told, lifts the wooden ghost onto the railing, and leaves it at the deck\'s edge', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41.6, y: -0.79 } }, {}, { flags: told });
    tick(sim, 0.1);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    expect(sim.flags.has('pappa:noticed')).toBe(true);
    const start = sim.curr.x;
    tick(sim, 1.45, { ...go, hop: true, act: true });
    const placed = prologuePose(layout, sim.prologue!.frame!);
    expect(placed.x).toBeCloseTo(layout.railing.x);
    expect(placed.y).toBeCloseTo(layout.railing.y);
    expect(sim.curr.x).toBeCloseTo(start);
    tick(sim, 1.6);
    expect(sim.flags.has('pappa:done')).toBe(true);
    // The railing is empty: the ghost is at the deck's edge, and waits there for him.
    expect(sim.ghost!.gone).toBe(false);
    expect(sim.ghost!.x).toBeCloseTo(layout.edge!.x);
    expect(sim.flags.has('goal')).toBe(false);
  });

  it('does not begin Pappa\'s joke before Moa has told what the star did', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41, y: -0.79 } }, {}, { flags: toHand });
    tick(sim, 1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.curr.word).toBe('climbOn');
  });

  it('takes a game saved after the joke up with the ghost at the deck\'s edge', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 2, flags: [...told, 'pappa:noticed', 'pappa:done'] });
    tick(sim, 0.2);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.ghost!.gone).toBe(false);
    expect(sim.ghost!.x).toBeCloseTo(layout.edge!.x);
  });

  it('replays an interrupted deck tableau from where it is staged', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: [...told, 'pappa:noticed'] });
    tick(sim, 0.2);
    expect(sim.prologue!.frame).toBeNull();
    // He walks back to the family on the deck; the joke is played there again, whole.
    for (let i = 0; i < 1200 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    tick(sim, PAPPA_TIME + 0.2);
    expect(sim.flags.has('pappa:done')).toBe(true);
  });

  it('keeps the meaning of the old big candies, and infers only the passed doorway for older saves', () => {
    // 0 in the kitchen at the start, 1 at the end of the hall, 2 on the deck after the shrinking.
    expect(prolog.checkpoints!.map((c) => c.x)).toEqual([0.6, 26, 45.5]);
    const sim = new Sim(prolog, {}, { checkpoint: 1, flags: ['eye', 'paint', 'blink'] });
    tick(sim, 0.1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.flags.has('bag:torn')).toBe(true);
    expect(sim.flags.has('pappa:done')).toBe(false);
    // An older save past the waking never plays the morning or the waking again.
    expect(sim.sceneFrame).toBeNull();
  });

  it('takes a game saved in the kitchen up there, with the morning and the eyes still to come', () => {
    const sim = new Sim(prolog, {}, { checkpoint: 0, flags: [] });
    expect(sim.curr.x).toBeLessThan(prolog.prologue!.doorway.x);
    tick(sim, 0.2);
    expect(sim.flags.has('bag:torn')).toBe(false);
    // He stands a step behind the table: the morning begins as he comes to it.
    for (let i = 0; i < 240 && !sim.sceneFrame; i++) sim.step(go);
    expect(sim.sceneFrame?.id).toBe('morgon');
    expect(sim.held).toBe(true);
  });

  it('gives him his feet back after the lift: Pappa notices the ghost as he sets off towards it', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 40.8, y: -0.79 } }, {}, { flags: told });
    tick(sim, 1);
    expect(sim.prologue!.frame).toBeNull();
    expect(sim.held).toBe(false);
    for (let i = 0; i < 240 && !sim.prologue!.frame; i++) sim.step(go);
    expect(sim.prologue!.frame?.kind).toBe('pappa');
    expect(sim.curr.x).toBeGreaterThanOrEqual(41.5);
  });

  it('restarts an interrupted tableau after Till stora godiset without losing its completed actions', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 41.6, y: -0.79 } }, {}, { flags: told });
    tick(sim, 0.8);
    sim.toCheckpoint();
    expect(sim.prologue!.frame).toBeNull();
    tick(sim, 3);
    for (let i = 0; i < 2400 && !sim.flags.has('pappa:done'); i++) sim.step(go);
    expect(sim.flags.has('pappa:done')).toBe(true);
    expect(sim.flags.has('star')).toBe(true);
  });
});
