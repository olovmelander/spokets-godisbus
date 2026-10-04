import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { berget } from '../../src/content/chapters/berget';
import { BUBBLE_TIME, SLIDE_TIME } from '../../src/sim/constants';
import { settingsFor, simOptions } from '../../src/save/settings';
import type { StepInput } from '../../src/sim/types';
import { decide } from '../robot/robot';

const idle: StepInput = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
const rope = berget.climbs![1]!;
const shelves = berget.movers!.filter((mover) => mover.id.startsWith('cairn:')).map((mover) => ({
  x: mover.stops[0]!.x, y: mover.stops[0]!.y + mover.height, width: mover.width,
}));

function frame(game: Game, fps: number, input: Partial<StepInput> = {}) {
  const now = { ...idle, ...input };
  game.frame(1 / fps, { x: now.x, y: now.y, hopHeld: now.hopHeld }, { hop: now.hop, act: now.act, helper: false });
}
function run(game: Game, fps: number, seconds: number, input: Partial<StepInput> = {}) {
  for (let i = 0; i < Math.ceil(seconds * fps); i++) frame(game, fps, input);
}
function walk(game: Game, fps: number, x: number) {
  for (let i = 0; i < fps * 10 && Math.abs(x - game.sim.curr.x) > 0.1; i++) {
    frame(game, fps, { x: Math.sign(x - game.sim.curr.x) * 0.6 });
  }
  run(game, fps, 0.25);
  expect(game.sim.curr.x).toBeCloseTo(x, 0);
}
function ascent(fps: number) {
  const game = new Game(berget, {}, { checkpoint: 4, flags: ['lift', 'memory'] });
  run(game, fps, 0.3);
  for (const [i, target] of shelves.entries()) {
    const direction = Math.sign(target.x - game.sim.curr.x), previous = shelves[i - 1];
    const takeoff = previous ? previous.x + direction * (previous.width / 2 - 0.3) : target.x - direction * (target.width / 2 + 0.8);
    for (let j = 0; j < fps * 3 && direction * (takeoff - game.sim.curr.x) > 0; j++) frame(game, fps, { x: direction });
    frame(game, fps, { x: direction, hop: true, hopHeld: true });
    for (let j = 0; j < fps * 3; j++) {
      frame(game, fps, { x: direction, hopHeld: true });
      if (game.sim.curr.grounded && Math.abs(game.sim.curr.y - target.y) < 0.1) break;
    }
    expect(game.sim.curr.y, `shelf ${i + 1} at ${fps} Hz`).toBeCloseTo(target.y, 1);
    expect(game.sim.curr.grounded).toBe(true);
    walk(game, fps, target.x);
  }
  return game;
}
function slide(game: Game, fps: number) {
  expect(game.sim.curr.verb).toBe('slide');
  frame(game, fps, { act: true });
  expect(game.sim.curr.mode).toBe('slide');
  run(game, fps, SLIDE_TIME + 1);
  expect(game.sim.curr.grounded).toBe(true);
  expect(game.sim.curr.y).toBeCloseTo(31.4, 1);
  expect(game.sim.curr.x).toBeCloseTo(rope.x, 1);
  expect(game.sim.bubbles).toBe(0);
}
function reuse(game: Game, fps: number) {
  frame(game, fps, { hop: true, hopHeld: true, y: 1 });
  for (let i = 0; i < fps * 3 && game.sim.curr.mode !== 'climb'; i++) frame(game, fps, { hopHeld: true, y: 1 });
  expect(game.sim.curr.mode).toBe('climb');
  for (let i = 0; i < fps * 12; i++) {
    frame(game, fps, { y: 1 });
    if (game.sim.curr.grounded && game.sim.curr.y > 40.8) break;
  }
  run(game, fps, 0.25);
  expect(game.sim.curr.grounded).toBe(true);
  expect(game.sim.curr.y).toBeCloseTo(40.9, 1);
  expect(game.sim.bubbles).toBe(0);
}

describe('Berget’s optional cairn lace loop', () => {
  it('preserves all original saved candy/checkpoint indices, the flight and the ghost’s lower lace', () => {
    // Fingerprint from 09d931, before the loop. This guards every original position/order and flag.
    const layout = { checkpoints: berget.checkpoints, candy: berget.candy,
      climbs: berget.climbs!.slice(0, 1).map(({ x, bottom, top, exit, needs }) => ({ x, bottom, top, exit, needs })), flight: berget.rides![0] };
    expect(berget.candy).toHaveLength(60);
    expect(berget.checkpoints).toHaveLength(5);
    expect(createHash('sha256').update(JSON.stringify(layout)).digest('hex')).toBe('2f93e805d3d9dfd833c660fcab9b84a8053ec0534be16f73a93e55e2a5ac7b1f');
    expect(rope.bottom).toBeGreaterThan(31.4 + 0.5);
  });

  for (const fps of [30, 144]) {
    it(`five real jumps earn a safe return and a reusable route at ${fps} Hz`, () => {
      const game = ascent(fps);
      expect(game.sim.flags.has('found:chokladpralin')).toBe(true);
      expect(game.sim.said).toContain('cairn-loop');
      expect(game.sim.checkpoint).toBe(4);
      expect(game.sim.flags.has('goal')).toBe(false);
      slide(game, fps);
      reuse(game, fps);
      slide(game, fps);
      expect(game.sim.said.filter((id) => id === 'cairn-loop')).toHaveLength(1);
      expect(game.sim.flags.has('found:chokladpralin')).toBe(true);
      expect(game.sim.flags.has('goal')).toBe(false);
      run(game, fps, 3, { x: 1 });
      expect(game.sim.flags.has('goal')).toBe(true);
    });
  }

  it('an old saved prize opens the optional rope without catching ordinary walking feet', () => {
    const game = new Game(berget, {}, { checkpoint: 4, flags: ['lift', 'memory', 'found:chokladpralin'] });
    run(game, 60, 0.3);
    walk(game, 60, rope.x);
    expect(game.sim.curr.mode).toBe('free');
    expect(game.sim.curr.y).toBeCloseTo(31.4, 1);
    reuse(game, 60);
    slide(game, 60);
    game.sim.toCheckpoint(); run(game, 60, BUBBLE_TIME + 0.3);
    expect(game.sim.curr.x).toBeCloseTo(149, 1);
    expect(game.sim.flags.has('found:chokladpralin')).toBe(true);
  });

  it('an unfinished save cannot climb the return rope before earning the cairn prize', () => {
    const game = new Game(berget, {}, { checkpoint: 4, flags: ['lift', 'memory'] });
    run(game, 60, 0.3); walk(game, 60, rope.x);
    frame(game, 60, { hop: true, hopHeld: true, y: 1 });
    let grabbed = false;
    for (let i = 0; i < 180; i++) { frame(game, 60, { y: 1, hopHeld: true }); grabbed ||= game.sim.curr.mode === 'climb'; }
    expect(grabbed).toBe(false);
    expect(game.sim.flags.has('found:chokladpralin')).toBe(false);
    expect(game.sim.bubbles).toBe(0);
  });

  it('the loop also returns to the existing ghost-lowered lace, which can be used in both directions', () => {
    const game = ascent(60); slide(game, 60);
    walk(game, 60, 146.25);
    expect(game.sim.curr.verb).toBe('slide');
    frame(game, 60, { act: true }); run(game, 60, SLIDE_TIME + 0.8);
    expect(game.sim.curr.y).toBeCloseTo(26.4, 1);
    expect(game.sim.curr.x).toBeCloseTo(145.7, 1);
    run(game, 60, 6.5, { y: 1 });
    expect(game.sim.curr.y).toBeCloseTo(31.4, 1);
    expect(game.sim.curr.grounded).toBe(true);
    expect(game.sim.flags.has('lift')).toBe(true);
    expect(game.sim.flags.has('found:chokladpralin')).toBe(true);
    expect(game.sim.checkpoint).toBe(4);
    expect(game.sim.bubbles).toBe(0);
  });

  it('Lugnt’s main route and old lower-cliff restore still reach the pine with no Hoppa or optional flag', () => {
    const game = new Game(berget, simOptions(settingsFor('lugnt')), { checkpoint: 3, flags: ['flight'] });
    let wasOffered = false;
    for (let i = 0; i < 60 * 30 && !game.sim.flags.has('goal'); i++) {
      const decision = decide(game, berget);
      frame(game, 60, { x: decision.x, y: decision.y, act: decision.offered && !wasOffered });
      wasOffered = decision.offered;
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.flags.has('lift')).toBe(true);
    expect(game.sim.flags.has('found:chokladpralin')).toBe(false);
    expect(game.sim.said).not.toContain('cairn-loop');
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.blown).toBe(0);
  });
});
