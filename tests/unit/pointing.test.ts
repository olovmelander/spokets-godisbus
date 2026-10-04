import { describe, expect, it } from 'vitest';
import { Pointing, type Projection } from '../../src/app/pointing';
import { Game } from '../../src/app/game';
import { Sim } from '../../src/sim/sim';
import { STEP } from '../../src/sim/constants';
import type { ChapterData, StepInput } from '../../src/sim/types';
const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const held = { x: 0, y: 0, hopHeld: false };
const edges = { hop: false, act: false, helper: false };
const screen: Projection = { world: p => ({ x: p.x * 100, y: p.y * 100 }), player: () => null, helper: () => null };
const course: ChapterData = { id: 'point', spawn: { x: 0, y: 0.01 }, goalX: 50, ground: [{ x: -5, y: 0 }, { x: 50, y: 0 }], candy: [{ x: 2.2, y: 0.45 }] };
function start(chapter: ChapterData = course) {
  const sim = new Sim(chapter);
  for (let i = 0; i < 30; i++) sim.step(idle);
  return { sim, point: new Pointing(sim) };
}
describe('Peka without remote actions', () => {
  it('the visible helper receives one hint request even when it overlaps another target', () => {
    const { point } = start();
    expect(point.tap({ x: 220, y: 45 }, { ...screen, helper: () => ({ x: 220, y: 45 }) })).toEqual({ kind: 'helper' });
    expect(point.walking).toBe(false);
  });
  it('offers exactly the near button action and does not solve it until the ordinary input is used', () => {
    const { sim, point } = start({ ...course, spots: [{ id: 'berry', look: 'berry', at: { x: 1, y: 0 }, verb: 'take' }] });
    expect(point.tap({ x: 100, y: 60 }, screen)?.kind).toBe('use');
    expect(sim.flags.has('berry')).toBe(false);
    sim.step({ ...idle, act: true });
    expect(sim.flags.has('berry')).toBe(true);
    expect(point.tap({ x: 100, y: 60 }, screen)).toBeNull();
  });
  it('a far object only reacts, and locked or hidden objects cannot be tapped', () => {
    const { sim, point } = start({ ...course, spots: [
      { id: 'far', look: 'jay', at: { x: 5, y: 0 }, verb: 'give' },
      { id: 'locked', look: 'wisp', at: { x: 8, y: 0 }, verb: 'take', needs: 'missing' },
    ], hidden: [{ x: 9, y: 0.5, kind: 'sweet', after: 'missing' }] });
    expect(point.tap({ x: 500, y: 60 }, screen)).toEqual({ kind: 'spot', index: 0 });
    expect(point.walking).toBe(false);
    expect(point.tap({ x: 800, y: 60 }, screen)).toBeNull();
    expect(point.tap({ x: 900, y: 50 }, screen)).toBeNull();
    expect([...sim.flags]).toEqual([]);
  });
  it('a visible animal answers before its prerequisite and after its puzzle is complete', () => {
    const { sim, point } = start({ ...course, spots: [{ id: 'bird', look: 'jay', at: { x: 1, y: 0 }, verb: 'give', needs: 'berry' }] });
    expect(point.tap({ x: 100, y: 60 }, screen)).toEqual({ kind: 'spot', index: 0 });
    sim.flags.add('berry');
    sim.flags.add('bird');
    expect(point.tap({ x: 100, y: 60 }, screen)).toEqual({ kind: 'spot', index: 0 });
  });
  it('near candy invites a short level stroll, collects normally and stops', () => {
    const { sim, point } = start();
    expect(point.tap({ x: 220, y: 45 }, screen)?.kind).toBe('candy');
    expect(sim.candyCount).toBe(0);
    for (let i = 0; i < 300; i++) {
      const input = point.steer(held, edges);
      sim.step({ ...idle, ...input });
    }
    expect(sim.candyCount).toBe(1);
    expect(sim.curr.x).toBeGreaterThan(1);
    expect(sim.curr.x).toBeLessThan(2.3);
    expect(point.walking).toBe(false);
    expect(sim.bubbles).toBe(0);
  });
  it.each([{ hz: 60, tempo: 1 }, { hz: 144, tempo: 1 }, { hz: 8, tempo: 1 }, { hz: 4, tempo: 1 }, { hz: 8, tempo: 0.8 }])('the real fixed-step game finishes the same safe stroll at $hz FPS and tempo $tempo', ({ hz, tempo }) => {
    const game = new Game(course);
    game.tempo = tempo;
    for (let i = 0; i < 30; i++) game.frame(STEP, held, edges);
    const point = new Pointing(game.sim);
    expect(point.tap({ x: 220, y: 45 }, screen)?.kind).toBe('candy');
    for (let i = 0; i < 500; i++) game.frame(1 / hz, point.steer(held, edges), edges);
    expect(game.sim.candyCount).toBe(1);
    expect(game.sim.curr.x).toBeGreaterThan(1);
    expect(game.sim.curr.x).toBeLessThan(2.3);
    expect(point.walking).toBe(false);
    expect(game.sim.bubbles).toBe(0);
  });
  it('keeps the same 2.5-second simulation limit if the stroll makes no progress', () => {
    const { sim, point } = start();
    point.tap({ x: 220, y: 45 }, screen);
    for (let i = 0; i < 300; i++) {
      point.steer(held, edges);
      sim.step(idle);
    }
    expect(point.steer(held, edges)).toEqual(held);
    expect(point.walking).toBe(false);
    expect(sim.candyCount).toBe(0);
  });
  it('a stroll never crosses a gap, climbs a wall, takes a hose or walks to distant candy', () => {
    const cases: ChapterData[] = [
      { ...course, ground: [{ x: -5, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -6 }, { x: 2, y: -6 }, { x: 2, y: 0 }, { x: 50, y: 0 }] },
      { ...course, movers: [{ id: 'wall', width: 0.5, height: 1, stops: [{ x: 1, y: 0 }], verb: 'push' }] },
      { ...course, climbs: [{ x: 1, bottom: 0, top: 4 }] },
      { ...course, candy: [{ x: 4, y: 0.45 }] },
    ];
    for (const chapter of cases) {
      const { point } = start(chapter);
      point.tap({ x: chapter.candy[0]!.x * 100, y: 45 }, screen);
      expect(point.walking).toBe(false);
    }
  });
  it('manual movement, a jump, use, help and pause cancel a pending stroll', () => {
    for (const [input, press] of [[{ ...held, x: -1 }, edges], [held, { ...edges, hop: true }], [held, { ...edges, act: true }], [held, { ...edges, helper: true }]] as const) {
      const { point } = start();
      point.tap({ x: 220, y: 45 }, screen);
      expect(point.steer(input, press)).toEqual(input);
      expect(point.walking).toBe(false);
    }
    const { point } = start();
    point.tap({ x: 220, y: 45 }, screen);
    point.cancel();
    expect(point.steer(held, edges)).toEqual(held);
  });
});
