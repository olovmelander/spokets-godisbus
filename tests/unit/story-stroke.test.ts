import { describe, expect, it } from 'vitest';
import { epilog, prolog } from '../../src/content/chapters/ends';
import { Sim } from '../../src/sim/sim';
import { finishEyeStroke, guidedCarve, guidedEye, validCarveStroke, validEyeStroke } from '../../src/sim/story-stroke';

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
    // After the morning's scene, which holds him while Pappa carves.
    const sim = new Sim({ ...prolog, spawn: { x: 3.4, y: .01 } }, {}, { flags: ['scene:morgon'] });
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
    const sim = new Sim({ ...prolog, spawn: { x: 3.4, y: .01 } }, {}, { flags: ['scene:morgon', 'eye'] });
    settle(sim); sim.step({ ...idle, act: true });
    expect(sim.story?.spot).toBe('paint');
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] })).toBe(false);
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(204)] })).toBe(true);
    // The waking is a scene he watches; it ends with the ghost running off with the bag.
    for (let i = 0; i < 360; i++) sim.step(idle);
    expect(sim.flags.has('blink')).toBe(false);
    for (let i = 0; i < 600; i++) sim.step(idle);
    expect(sim.flags.has('blink')).toBe(true);
  });
});

describe('carving away from the body', () => {
  it('accepts an outward stroke with finger jitter, but rejects inward, sideways and partial strokes', () => {
    const outward = guidedCarve();
    expect(validCarveStroke(outward)).toBe(true);
    expect(validCarveStroke(outward.map((p, i) => ({ x: p.x + (i % 2 ? 2 : -2), y: p.y + (i % 2 ? 2 : -2) })))).toBe(true);
    expect(validCarveStroke([...outward].reverse())).toBe(false);
    expect(validCarveStroke(outward.slice(0, 5))).toBe(false);
    expect(validCarveStroke([outward[0]!, { x: 150, y: 30 }, outward.at(-1)!])).toBe(false);
    expect(validCarveStroke([outward[0]!, outward[7]!, outward[3]!, outward.at(-1)!])).toBe(false);
    expect(validCarveStroke([{ x: NaN, y: 0 }, outward.at(-1)!])).toBe(false);
  });
  it('an inward stroke cannot start or award progress; a retry finishes the same carving', () => {
    const sim = new Sim({ ...epilog, spawn: { x: 32, y: .01 } }, {}, { flags: ['knife'] });
    settle(sim); sim.step({ ...idle, act: true });
    expect(sim.story).toEqual({ kind: 'carve', spot: 'cut1' });
    expect(sim.finishStory({ kind: 'carve', stroke: guidedCarve().reverse() })).toBe(false);
    expect(sim.flags.has('cut1')).toBe(false);
    expect(sim.story?.spot).toBe('cut1');
    for (let n = 1; n <= 3; n++) {
      expect(sim.finishStory({ kind: 'carve', stroke: guidedCarve() })).toBe(true);
      expect(sim.flags.has(`cut${n}`)).toBe(true);
      expect(sim.finishStory({ kind: 'carve', stroke: guidedCarve() })).toBe(false);
      settle(sim); sim.step({ ...idle, act: true });
    }
    expect(sim.story).toEqual({ kind: 'paint', spot: 'dots' });
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116)] })).toBe(false);
    expect(sim.flags.has('dots')).toBe(false);
    expect(sim.finishStory({ kind: 'paint', traces: [guidedEye(116), guidedEye(204)] })).toBe(true);
    expect(sim.flags.has('dots')).toBe(true);
  });
});
