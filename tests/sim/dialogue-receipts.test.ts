import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData } from '../../src/sim/types';
import { idle, run } from './drive';

const lane: ChapterData = {
  id: 'receipts', spawn: { x: 0, y: 0.01 }, goalX: 100,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 110, y: 0 }, { x: 110, y: 8 }],
  candy: [], beats: [{ id: 'explain', at: 0, who: 'moa', line: 'notYet', read: true }],
};
const listen = (sim: Sim, seconds: number) => run(sim, seconds, { talking: false });

describe('completed dialogue receipts during play', () => {
  it('shows a beat immediately but waits for its completion before actions, scenery, rewards and the goal unlock', () => {
    const sim = new Sim({
      ...lane, goalX: -1, goalNeeds: 'beat:explain',
      spots: [{ id: 'take', at: { x: 0, y: 0 }, verb: 'take', needs: 'beat:explain' }],
      ledges: [{ x: 5, y: 2, width: 2, look: 'plank', needs: 'beat:explain' }],
      movers: [{ id: 'lift', width: 1, height: 0.2, verb: 'push', on: 'beat:explain', stops: [{ x: 8, y: 0 }, { x: 8, y: 2 }] }],
      candy: [{ x: 0, y: 0.5, after: 'beat:explain' }],
      checkpoints: [{ x: 0, y: 0.01, after: 'beat:explain' }],
      sets: [{ flag: 'understood', when: ['beat:explain'] }],
    });
    listen(sim, 0.2);
    expect(sim.flags.has('beat:explain')).toBe(true); // the renderer can begin its speaking gesture
    expect(sim.ready('beat:explain')).toBe(false);
    expect([...sim.pendingDialogue]).toEqual(['explain']);
    sim.step({ ...idle, act: true, talking: false });
    listen(sim, 5); // even a temporarily quiet audio channel is not a completion receipt
    expect(sim.curr.verb).toBeNull();
    expect(sim.flags.has('take')).toBe(false);
    expect(sim.flags.has('understood')).toBe(false);
    expect(sim.flags.has('goal')).toBe(false);
    expect(sim.ledges[0]!.there).toBe(false);
    expect(sim.movers[0]!.stop).toBe(0);
    expect(sim.collected[0]).toBe(false);
    expect(sim.checkpoint).toBe(-1);

    sim.acknowledge('explain');
    sim.step({ ...idle, act: true, talking: false });
    expect(sim.ready('beat:explain')).toBe(true);
    expect(sim.pendingDialogue.size).toBe(0);
    expect(sim.flags.has('take')).toBe(true);
    expect(sim.flags.has('understood')).toBe(true);
    expect(sim.flags.has('goal')).toBe(true);
    expect(sim.ledges[0]!.there).toBe(true);
    expect(sim.movers[0]!.stop).toBe(1);
    expect(sim.collected[0]).toBe(true);
    expect(sim.checkpoint).toBe(0);
  });

  it('starts a following event timer at completion, without charging the speaking time to it', () => {
    const sim = new Sim({ ...lane, later: [{ flag: 'arrived', after: 'beat:explain', seconds: 1, hold: true }] });
    listen(sim, 10);
    expect(sim.held).toBe(false);
    expect(sim.flags.has('arrived')).toBe(false);
    sim.acknowledge('explain');
    listen(sim, 0.5);
    expect(sim.held).toBe(true);
    expect(sim.flags.has('arrived')).toBe(false);
    listen(sim, 0.6);
    expect(sim.held).toBe(false);
    expect(sim.flags.has('arrived')).toBe(true);
  });

  it('registers a scene line before same-step interactions and begins dependent scenes only after completion', () => {
    const sim = new Sim({
      ...lane, beats: [],
      scenes: [
        { id: 'intro', seconds: STEP, lines: [{ at: 0, who: 'moa', line: 'notYet', id: 'explain' }] },
        { id: 'answer', on: 'beat:explain', seconds: 1, cues: [{ at: 0, flag: 'answered' }] },
      ],
      ledges: [{ x: 5, y: 2, width: 2, look: 'plank', needs: 'beat:explain' }],
      spots: [{ id: 'take', at: { x: 0, y: 0 }, verb: 'take', needs: 'beat:explain', touch: true }],
    });
    sim.step({ ...idle, act: true, talking: false });
    expect(sim.said).toEqual(['explain']);
    expect([...sim.pendingDialogue]).toEqual(['explain']);
    expect(sim.ledges[0]!.there).toBe(false);
    expect(sim.flags.has('take')).toBe(false);
    listen(sim, 5);
    expect(sim.flags.has('scene:intro')).toBe(false);
    expect(sim.flags.has('answered')).toBe(false);
    sim.acknowledge('explain');
    listen(sim, 0.1);
    expect(sim.flags.has('scene:intro')).toBe(true);
    expect(sim.flags.has('answered')).toBe(true);
    expect(sim.flags.has('take')).toBe(true);
  });

  it('keeps a reveal visible for its world line while the ride and steering continue', () => {
    const sim = new Sim({
      ...lane, beats: [{ id: 'look', on: 'seen', who: 'elof', line: 'ssWide' }],
      scenes: [{ id: 'view', on: 'board', seconds: 1, dialogue: ['look'], cues: [{ at: 0.1, flag: 'seen' }] }],
      spots: [{ id: 'board', at: { x: 0, y: 0 }, verb: 'take', ride: 'owl' }],
      rides: [{ id: 'owl', from: { x: 0, y: 0 }, to: { x: 40, y: 0 }, rise: 3, time: 8 }],
    });
    listen(sim, 0.2);
    sim.step({ ...idle, act: true, talking: false });
    listen(sim, 0.3);
    expect(sim.curr.mode).toBe('ride');
    expect(sim.said).toEqual(['look']);
    expect(sim.sceneFrame?.waiting).toBe(true);
    expect(sim.held).toBe(false);
    const before = sim.curr.x, clock = sim.sceneFrame!.seconds;
    run(sim, 2, { y: -1, talking: true });
    expect(sim.curr.x).toBeGreaterThan(before + 3);
    expect(sim.sceneFrame!.seconds).toBe(clock);
    expect(sim.flags.has('scene:view')).toBe(false);
    sim.acknowledge('look');
    listen(sim, 1.1);
    expect(sim.flags.has('scene:view')).toBe(true);
    expect(sim.curr.mode).toBe('ride');
  });

  it('preserves active words through automatic recovery, and re-arms them only on intentional dialogue discard', () => {
    const sim = new Sim(lane);
    listen(sim, 0.2);
    sim.toCheckpoint();
    listen(sim, 3);
    expect(sim.said).toEqual(['explain']);
    expect([...sim.pendingDialogue]).toEqual(['explain']);
    expect(sim.flags.has('beat:explain')).toBe(true);
    expect(sim.ready('beat:explain')).toBe(false);

    sim.discardDialogue();
    sim.toCheckpoint();
    expect(sim.pendingDialogue.size).toBe(0);
    expect(sim.flags.has('beat:explain')).toBe(false);
    listen(sim, 3);
    expect(sim.said).toEqual(['explain', 'explain']);
    expect(sim.pendingDialogue.has('explain')).toBe(true);
    sim.acknowledge('explain');
    listen(sim, 3);
    expect(sim.said).toHaveLength(2);
    expect(sim.ready('beat:explain')).toBe(true);
  });

  it('treats saved receipts as complete, never manufactures receipts for unknown IDs, and preserves no-listener play', () => {
    const restored = new Sim(lane, {}, { flags: ['beat:explain'] });
    expect(restored.pendingDialogue.size).toBe(0);
    expect(restored.ready('beat:explain')).toBe(true);
    restored.acknowledge('future');
    expect(restored.flags.has('beat:future')).toBe(false);
    listen(restored, 1);
    expect(restored.said).toEqual([]);
    const robot = new Sim({ ...lane, beats: [...lane.beats!, { id: 'reply', on: 'beat:explain', who: 'elof', line: 'ssOnward' }] });
    run(robot, 0.1);
    expect(robot.said).toEqual(['explain', 'reply']);
    expect(robot.pendingDialogue.size).toBe(0);
    expect(robot.ready('beat:explain')).toBe(true);
  });

  it('keeps pending receipts and scene reveal time exact through Pause and resumes without an early cue', () => {
    const game = new Game({
      ...lane, beats: [{ id: 'look', on: 'seen', who: 'elof', line: 'ssWide' }],
      scenes: [{ id: 'view', seconds: 1, dialogue: ['look'], cues: [{ at: 0, flag: 'seen' }, { at: 0.5, flag: 'landed' }] }],
    });
    const input = { x: 1, hopHeld: false, talking: false };
    const edges = { hop: false, act: false, helper: false };
    game.frame(1 / 30, input, edges);
    const before = { frame: game.sim.sceneFrame, x: game.sim.curr.x, steps: game.sim.steps, pending: [...game.sim.pendingDialogue] };
    for (let i = 0; i < 120; i++) game.frame(0, input, edges);
    game.resume();
    expect({ frame: game.sim.sceneFrame, x: game.sim.curr.x, steps: game.sim.steps, pending: [...game.sim.pendingDialogue] }).toEqual(before);
    game.frame(1 / 30, input, edges);
    expect(game.sim.curr.x).toBeGreaterThan(before.x);
    expect(game.sim.sceneFrame).toEqual(before.frame);
    expect(game.sim.flags.has('landed')).toBe(false);
    game.sim.acknowledge('look');
    for (let i = 0; i < 20; i++) game.frame(1 / 30, input, edges);
    expect(game.sim.flags.has('landed')).toBe(true);
  });
});
