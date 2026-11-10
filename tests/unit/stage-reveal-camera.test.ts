import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { createStage } from '../../src/render/stage';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import { stubCanvas } from './canvas-stub';

beforeEach(stubCanvas);
afterEach(() => vi.unstubAllGlobals());

const reveal = alven.scenes!.find(scene => scene.id === 'al:little')!;
const flags = () => new Set(['al:owl', 'al:little-seen',
  ...alven.beats!.filter(beat => beat.id !== 'al:see-little').map(beat => `beat:${beat.id}`),
  ...alven.scenes!.filter(scene => scene.id !== reveal.id).map(scene => `scene:${scene.id}`)]);
const ground = (x: number) => {
  for (let i = 0; i < alven.ground.length - 1; i++) {
    const a = alven.ground[i]!, b = alven.ground[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
  }
  return 0;
};

describe('the owl reveal gives the camera back when Elof keeps walking', () => {
  it.each([false, true])('releases its actual shot beyond169 while preserving the unfinished line and scene (calm=%s)', calm => {
    const sim = new Sim(alven, {}, { checkpoint: 7, flags: [...flags()] });
    const stage = createStage(alven, ground);
    let clock = 0;
    const show = (dt = STEP) => stage.update(sim.sceneFrame, sim.flags, sim.curr, clock += dt, dt, calm);
    for (let i = 0; i < 2 / STEP && !sim.pendingDialogue.has('al:see-little'); i++) {
      sim.step({ x: 0, y: 0, hopHeld: false, hop: false, act: false, talking: false });
      show();
    }
    expect(sim.pendingDialogue.has('al:see-little')).toBe(true);
    const seconds = sim.sceneFrame!.seconds;
    expect(show().shot).toMatchObject({ x: 160.5, width: 20, blend: 1 });
    for (let i = 0; i < 2 / STEP && sim.curr.x <= reveal.before!; i++) {
      expect(show().shot).not.toBeNull();
      sim.step({ x: 1, y: 0, hopHeld: false, hop: false, act: false, talking: true });
    }
    expect(sim.curr.x).toBeGreaterThan(reveal.before!);
    expect(show().shot).toBeNull();
    expect(show(0).shot).toBeNull();
    expect(sim.sceneFrame).toEqual({ id: reveal.id, seconds, waiting: true });
    expect(sim.pendingDialogue.has('al:see-little')).toBe(true);
    expect(sim.flags.has(`scene:${reveal.id}`)).toBe(false);
    // Reversing at the boundary must not instantly reacquire the old fixed shot.
    expect(stage.update(sim.sceneFrame, sim.flags, { x: 168.9, y: sim.curr.y }, clock, 0, calm).shot).toBeNull();
    // A later fresh/recovered presentation starts with its authored framing again.
    stage.update(null, sim.flags, sim.curr, clock, 0, calm);
    expect(stage.update(sim.sceneFrame, sim.flags, { x: 168.4, y: sim.curr.y }, clock, 0, calm).shot).not.toBeNull();
  });

  it('also gives back a nonheld shot on backward departure, allowing interpolation at its entry boundary', () => {
    const stage = createStage(alven, ground);
    const frame = { id: reveal.id, seconds: .8, waiting: true };
    for (const x of [152, 151.99, 151.51]) {
      expect(stage.update(frame, flags(), { x, y: 0 }, 1, STEP, false).shot).not.toBeNull();
    }
    expect(stage.update(frame, flags(), { x: 151.49, y: 0 }, 1, STEP, false).shot).toBeNull();
    expect(stage.update(frame, flags(), { x: 152, y: 0 }, 1, 0, false).shot).toBeNull();
  });

  it('keeps explicitly held shots and unbounded shots under their authored scene ownership', () => {
    for (const scene of [{ ...reveal, hold: true }, { ...reveal, at: undefined, before: undefined }]) {
      const stage = createStage({ ...alven, scenes: [scene] }, ground);
      const frame = { id: scene.id, seconds: .8, waiting: true };
      const start = stage.update(frame, flags(), { x: 168.4, y: 0 }, 1, STEP, false).shot;
      expect(start).not.toBeNull();
      expect(stage.update(frame, flags(), { x: 175, y: 0 }, 2, STEP, false).shot).toEqual(start);
      expect(stage.update(frame, flags(), { x: 145, y: 0 }, 3, STEP, false).shot).toEqual(start);
    }
  });
});
