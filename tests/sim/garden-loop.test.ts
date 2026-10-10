import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { garden } from '../../src/content/chapters/garden';
import { simOptions, settingsFor } from '../../src/save/settings';
import type { SimStart } from '../../src/sim/types';

const placed = ['curl', 'bridge'];
const neutral = { x: 0, y: 0, hopHeld: false };
const noPress = { hop: false, act: false, helper: false };
function make(x: number, y = 0, start: SimStart = {}, calm = false) {
  const game = new Game({ ...garden, spawn: { x, y: y + 0.01 } }, calm ? simOptions(settingsFor('lugnt')) : {}, start);
  for (let i = 0; i < 30; i++) game.frame(1 / 60, neutral, noPress);
  return game;
}
function wait(game: Game, seconds = 0.5) {
  for (let i = 0; i < seconds * 60; i++) game.frame(1 / 60, neutral, noPress);
}
function act(game: Game) { game.frame(1 / 60, neutral, { ...noPress, act: true }); }
function walkUntil(game: Game, dir: number, done: () => boolean, seconds = 12) {
  for (let i = 0; i < seconds * 60 && !done(); i++) game.frame(1 / 60, { ...neutral, x: dir }, noPress);
  expect(done(), `stopped at ${game.sim.curr.x.toFixed(2)},${game.sim.curr.y.toFixed(2)} (${game.sim.curr.mode})`).toBe(true);
}

describe('Moa’s departure hub and optional shaving-pocket return', () => {
  it('keeps all existing checkpoint indices and main-route identities', () => {
    expect(garden.checkpoints).toEqual([
      { x: 4.5, y: 6 }, { x: 21, y: 7.6 }, { x: 37, y: 6 }, { x: 49, y: 0 },
      { x: 60, y: 0 }, { x: 69, y: 0 }, { x: 108, y: 0 }, { x: 118.2, y: 0 },
      { x: 130, y: 0 }, { x: 144.6, y: 3.3 }, { x: 160, y: 0 },
    ]);
    expect(garden.rides?.find(ride => ride.id === 'plane')).toMatchObject({
      from: { x: 166, y: 0 }, to: { x: 206, y: 0 }, rise: 8, time: 7,
    });
    expect(garden.hidden?.map(item => item.kind)).toEqual(['gelehallon', 'gummibjorn', 'skumbanan', 'skumsvamp']);
  });

  it('calling Moa offers a separate departure and leaves the player free to explore', () => {
    const game = make(165.6, 0, { placed, flags: ['memory'] });
    expect(game.sim.curr.word).toBe('callMoa');
    act(game); wait(game, 1);
    expect(game.sim.flags.has('moa')).toBe(true);
    expect(game.sim.flags.has('garden:pocket-open')).toBe(true);
    expect(game.sim.flags.has('plane:board')).toBe(false);
    expect(game.sim.curr.mode).toBe('free');
    walkUntil(game, 1, () => game.sim.curr.word === 'gardenBoard');
    act(game);
    expect(game.sim.curr.mode).toBe('ride');
    expect(game.sim.flags.has('plane:board')).toBe(true);
    expect(game.sim.flags.has('garden:paper')).toBe(false);
  });

  it('never opens the pocket from the bridge or family call alone', () => {
    expect(make(141.8, 3.3, { placed }).sim.flags.has('garden:pocket-open')).toBe(false);
    expect(make(165.6, 0, { flags: ['moa'] }).sim.flags.has('garden:pocket-open')).toBe(false);
  });

  for (const calm of [false, true]) it(`slides down, finds the drawing and climbs back without Hoppa (${calm ? 'Lugnt' : 'Äventyr'})`, () => {
    const game = make(141.8, 3.3, { placed, flags: ['moa', 'family:plane-ready', 'memory'], collected: [0, 30, 60] }, calm);
    expect(game.sim.curr.verb).toBe('slide');
    act(game); wait(game, 1.5);
    expect(game.sim.curr.y).toBeCloseTo(-2, 1);
    expect(game.sim.flags.has('garden:paper')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    for (const i of [0, 30, 60]) expect(game.sim.collected[i]).toBe(true);
    walkUntil(game, 1, () => game.sim.curr.mode === 'free' && game.sim.curr.grounded && game.sim.curr.y > 3.2, 8);
    expect(game.sim.curr.x).toBeGreaterThan(142);
    expect(game.sim.bubbles).toBe(0);
    walkUntil(game, 1, () => game.sim.curr.word === 'gardenGiveDrawing', 10);
    act(game); wait(game);
    expect(game.sim.flags.has('garden:shared-paper')).toBe(true);
    expect(game.sim.said.includes('garden:thanks')).toBe(true);
    expect(game.sim.flags.has('plane:board')).toBe(false);
    walkUntil(game, 1, () => game.sim.curr.word === 'gardenBoard');
    act(game); wait(game, 8);
    expect(game.sim.curr.x).toBeGreaterThan(205);
    expect(game.sim.bubbles).toBe(0);
  });

  it('restores older called-Moa saves and interrupted new flights with the plane available', () => {
    for (const flight of [[], ['plane:board']]) {
      const game = make(1, 0, { checkpoint: 10, placed, flags: ['moa', 'memory', ...flight], collected: [0, 30, 60] });
      expect(game.sim.checkpoint).toBe(10);
      expect(game.sim.flags.has('moa')).toBe(true);
      expect(game.sim.flags.has('plane:board')).toBe(false);
      walkUntil(game, 1, () => game.sim.curr.word === 'gardenBoard');
      act(game);
      expect(game.sim.curr.mode).toBe('ride');
      expect(game.sim.flags.has('garden:paper')).toBe(false);
      for (const i of [0, 30, 60]) expect(game.sim.collected[i]).toBe(true);
    }
  });

  it('restores the optional reward without repeating it or removing any old collectible', () => {
    const game = make(1, 0, { checkpoint: 10, placed, flags: ['moa', 'memory', 'garden:paper', 'garden:shared-paper', 'beat:garden:thanks', 'lost:clip'], collected: [0, 30, 60] });
    walkUntil(game, 1, () => game.sim.curr.word === 'gardenBoard');
    expect(game.sim.flags.has('garden:shared-paper')).toBe(true);
    expect(game.sim.flags.has('lost:clip')).toBe(true);
    expect(game.sim.said.includes('garden:thanks')).toBe(false);
    for (const i of [0, 30, 60]) expect(game.sim.collected[i]).toBe(true);
  });
});
