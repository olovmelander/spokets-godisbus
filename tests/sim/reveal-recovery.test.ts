import { describe, expect, it } from 'vitest';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { SimStart } from '../../src/sim/types';
import { idle, run } from './drive';

// Actual progress saved by Pause during the built owl reveal (7f7510f, portrait). The UI correctly
// omitted its unfinished receipt but retained the cue and the earlier shore checkpoint.
const interrupted: SimStart = {
  "checkpoint": 6,
  "collected": [
    68,
    69,
    70,
    71,
    72,
    73,
    74,
    75,
    76,
    77,
    78
  ],
  "flags": [
    "scene:card",
    "scene:bron",
    "al:pappa",
    "al:scarf",
    "al:lift",
    "al:owl-call",
    "al:owl-ready",
    "beat:al:arrive",
    "beat:al:klonk-floats",
    "beat:al:klonk",
    "beat:al:flash",
    "beat:al:raft-seen",
    "beat:al:current",
    "beat:al:old-one",
    "beat:al:logs-wait",
    "beat:al:leaf-seen",
    "beat:al:bredbyn",
    "beat:al:rapids",
    "beat:al:pappa-here",
    "beat:al:scarf-down",
    "beat:al:take-hold",
    "beat:al:up",
    "beat:al:over",
    "beat:al:thanks",
    "beat:al:follow",
    "beat:al:lodge",
    "beat:al:otter",
    "beat:al:lake",
    "beat:al:owl-seen",
    "beat:al:owl-here",
    "lost:float",
    "found:mintfisk",
    "al:owl",
    "beat:al:owl-fly",
    "al:little-seen",
    "memory:storm:raft"
  ]
};
const ride = alven.rides!.find(one => one.id === 'al:owl')!;
const reveal = alven.scenes!.find(one => one.id === 'al:little')!;
const cueAt = reveal.cues![0]!.at;

function board(sim: Sim): void {
  for (let i = 0; i < 5 / STEP && sim.curr.x < ride.from.x - .8; i++) sim.step({ ...idle, x: 1, talking: false });
  run(sim, .15, { talking: false });
  sim.step({ ...idle, act: true, talking: false });
  expect(sim.curr.mode).toBe('ride');
}

function firstRevealLine(sim: Sim): void {
  for (let i = 0; i < 10 / STEP && !sim.pendingDialogue.has('al:see-little'); i++) {
    if (sim.sceneFrame?.id === reveal.id && sim.sceneFrame.seconds + STEP / 2 < cueAt) {
      expect(sim.said).not.toContain('al:see-little');
    }
    sim.step({ ...idle, talking: false });
  }
  expect(sim.pendingDialogue.has('al:see-little')).toBe(true);
  expect(sim.sceneFrame?.id).toBe(reveal.id);
  expect(sim.sceneFrame!.seconds).toBeCloseTo(cueAt, 6);
}

describe('owned world dialogue stays with its reveal across queues and recovery', () => {
  it('reloads the actual unfinished save silently at the shore, then frames the replay before saying its line', () => {
    const sim = new Sim(alven, {}, interrupted);
    run(sim, 2, { talking: false });
    expect(sim.curr.x).toBeCloseTo(132.6, 5);
    expect(sim.sceneFrame).toBeNull();
    expect(sim.pendingDialogue.size).toBe(0);
    expect(sim.said).not.toContain('al:see-little');
    expect(sim.flags.has('al:little-seen')).toBe(true);
    board(sim);
    firstRevealLine(sim);
    sim.step({ ...idle, talking: true });
    const clock = sim.sceneFrame!.seconds;
    run(sim, 20, { talking: true, y: -1 });
    expect(sim.sceneFrame).toMatchObject({ id: reveal.id, seconds: clock, waiting: true });
    expect(sim.curr.mode).toBe('free');
    expect(sim.curr.x).toBeCloseTo(ride.to.x, 1);
    sim.acknowledge('al:see-little');
    run(sim, 6, { talking: false });
    expect(sim.flags.has('scene:al:little')).toBe(true);
    expect(sim.said.filter(id => id === 'al:see-little')).toHaveLength(1);
  });

  it('holds the actual reveal when its words queue behind the owl line, without stopping the ride', () => {
    const flags = ['al:owl-call', 'al:owl-ready', 'scene:bron', ...alven.beats!
      .filter(beat => !['al:owl-fly', 'al:see-little'].includes(beat.id)).map(beat => `beat:${beat.id}`)];
    const sim = new Sim({ ...alven, spawn: { ...ride.from, y: ride.from.y + .01 } }, {}, { flags });
    run(sim, .2, { talking: false });
    sim.step({ ...idle, act: true, talking: false });
    expect(sim.pendingDialogue.has('al:owl-fly')).toBe(true);
    for (let i = 0; i < 10 / STEP && !sim.waits.has('al:see-little'); i++) sim.step({ ...idle, talking: true, y: -1 });
    expect(sim.waits.has('al:see-little')).toBe(true);
    expect(sim.flags.has('beat:al:see-little')).toBe(false);
    sim.step({ ...idle, talking: true });
    const before = sim.curr.x, clock = sim.sceneFrame!.seconds;
    run(sim, 20, { talking: true, y: -1 });
    expect(sim.curr.x).toBeGreaterThan(before + 1);
    expect(sim.sceneFrame).toMatchObject({ id: reveal.id, seconds: clock, waiting: true });
    expect(sim.flags.has('scene:al:little')).toBe(false);
    expect(sim.held).toBe(false);
    sim.acknowledge('al:owl-fly');
    sim.step({ ...idle, talking: false });
    expect(sim.pendingDialogue.has('al:see-little')).toBe(true);
    expect(sim.sceneFrame!.seconds).toBe(clock);
    sim.acknowledge('al:see-little');
    run(sim, 6, { talking: false });
    expect(sim.flags.has('scene:al:little')).toBe(true);
  });

  it('does not mark a begun reveal complete merely because the next checkpoint lies beyond its starting x', () => {
    const sim = new Sim(alven, {}, { ...interrupted, checkpoint: 7 });
    expect(sim.flags.has('scene:al:little')).toBe(false);
    firstRevealLine(sim);
    expect(sim.curr.x).toBeCloseTo(168.4, 5);
    sim.step({ ...idle, talking: true });
    expect(sim.sceneFrame?.waiting).toBe(true);
  });

  it('does not treat a reveal own final cue as a receipt for its still-unread explanation', () => {
    const scene = flarken.scenes!.find(one => one.id === 'sjon:plopp')!;
    const flags = [scene.on!, scene.until!, ...flarken.scenes!.filter(one => one.id !== scene.id).map(one => `scene:${one.id}`),
      ...flarken.beats!.filter(beat => beat.id !== 'sjon:plop').map(beat => `beat:${beat.id}`)];
    const stone = flarken.movers!.find(mover => `placed:${mover.id}` === scene.on)!;
    const at = stone.stops[0]!;
    const sim = new Sim({ ...flarken, spawn: { x: at.x - 1, y: at.y + .01 } }, {}, { flags, placed: [stone.id] });
    expect(sim.flags.has(`scene:${scene.id}`)).toBe(false);
    for (let i = 0; i < 5 / STEP && !sim.pendingDialogue.has('sjon:plop'); i++) sim.step({ ...idle, talking: false });
    expect(sim.pendingDialogue.has('sjon:plop')).toBe(true);
    expect(sim.sceneFrame?.id).toBe(scene.id);
    expect(sim.sceneFrame!.seconds + STEP / 2).toBeGreaterThanOrEqual(scene.cues![0]!.at);
  });
});
