import { describe, expect, it } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { Sim } from '../../src/sim/sim';
import { finishEyeStroke, guidedEye, validEyeStroke } from '../../src/sim/story-stroke';

const idle = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const settle = (sim: Sim) => { for (let i = 0; i < 20; i++) sim.step(idle); };
describe('painting with Pappa', () => {
  it('accepts either direction and completes short or wobbly strokes without punishment', () => {
    expect(validEyeStroke(guidedEye(116), 116)).toBe(true);
    expect(validEyeStroke(guidedEye(116).reverse(), 116)).toBe(true);
    const helped = finishEyeStroke([{ x: 100, y: 80 }, { x: 104, y: 79 }], 116)!;
    expect(validEyeStroke(helped, 116)).toBe(true);
    expect(finishEyeStroke([{ x: 100, y: 80 }, { x: 100, y: 80 }], 116)).toBeNull();
    expect(finishEyeStroke([{ x: NaN, y: 80 }, { x: 105, y: 80 }], 116)).toBeNull();
  });
  it('cannot award an unpainted eye, cancelled attempt or malformed completed trace', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 4.6, y: .01 } });
    settle(sim); sim.step({ ...idle, act: true });
    expect(sim.story).toEqual({ kind: 'paint', spot: 'eye' });
    expect(sim.flags.has('eye')).toBe(false);
    expect(sim.finishStory({ kind: 'paint', traces: [] })).toBe(false);
    expect(sim.finishStory({ kind: 'paint', traces: [[{ x: 0, y: 0 }]] })).toBe(false);
    sim.cancelStory();
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] })).toBe(false);
    settle(sim); sim.step({ ...idle, act: true });
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] })).toBe(true);
    expect(sim.flags.has('eye')).toBe(true);
    expect(sim.flags.has('paint')).toBe(false);
  });
  it('restores the first finished eye, then starts the blink only after the second', () => {
    const sim = new Sim({ ...prolog, spawn: { x: 4.6, y: .01 } }, {}, { flags: ['eye'] });
    settle(sim); sim.step({ ...idle, act: true });
    expect(sim.story?.spot).toBe('paint');
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] })).toBe(false);
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(204)] })).toBe(true);
    for (let i = 0; i < 360; i++) sim.step(idle);
    expect(sim.flags.has('blink')).toBe(true);
  });
});
