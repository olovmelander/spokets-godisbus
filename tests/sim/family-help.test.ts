import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { granskog } from '../../src/content/chapters/granskog';
import { garden } from '../../src/content/chapters/garden';
import { myren } from '../../src/content/chapters/myren';
import type { ChapterData } from '../../src/sim/types';

const neutral = { x: 0, y: 0, hopHeld: false };
const noPress = { hop: false, act: false, helper: false };
function wait(game: Game, seconds: number, move = 0) {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) game.frame(1 / 60, { ...neutral, x: move }, noPress);
}
function start(chapter: ChapterData, x: number, y: number, flags: string[] = []) {
  const game = new Game({ ...chapter, spawn: { x, y: y + .01 } }, {}, { flags });
  wait(game, .3);
  return game;
}
const act = (game: Game) => game.frame(1 / 60, neutral, { ...noPress, act: true });

describe('family help has time to prepare and a deliberate next action', () => {
  it('preserves an unread introduction when its nearby checkpoint was already collected', () => {
    // The candy at83.4 can be collected while Mamma's line at82.6 is still waiting for Fortsätt.
    const unread = new Game(myren, {}, { checkpoint: 4 });
    wait(unread, .1);
    expect(unread.sim.said).toContain('family:mamma');
    const read = new Game(myren, {}, { checkpoint: 4, flags: ['beat:family:mamma'] });
    wait(read, .1);
    expect(read.sim.said).not.toContain('family:mamma');
  });

  it('does not introduce helpers again at old saved checkpoints beyond completed crossings', () => {
    for (const [chapter, checkpoint, flags] of [
      [granskog, 10, ['seesaw', 'placed:cone', 'launch', 'cap']],
      [myren, 7, ['mamma', 'placed:pine', 'braid', 'light']],
    ] as const) {
      const game = new Game(chapter, {}, { checkpoint, flags: [...flags] });
      wait(game, 2);
      expect(game.sim.held).toBe(false);
      expect(game.sim.said.filter(id => id.startsWith('family:'))).toEqual([]);
    }
  });

  it('defers unfinished restored help until Elof returns to its encounter', () => {
    for (const prepared of [[], ['family:seesaw-ready']]) {
      const away = new Game(granskog, {}, { checkpoint: 5, flags: ['seesaw', ...prepared] });
      wait(away, 2);
      expect(away.sim.held).toBe(false);
      expect(away.sim.said).not.toContain('family:seesaw');
      const returned = new Game(granskog, {}, { checkpoint: 7, flags: ['seesaw', ...prepared] });
      wait(returned, 1.4);
      expect(returned.sim.flags.has('family:seesaw-ready')).toBe(true);
      expect(returned.sim.said).toContain('family:seesaw');
    }
  });

  it.each([
    [garden, 208, 0, ['moa', 'plane:board']],
    [granskog, 179, -8, ['seesaw', 'placed:cone', 'launch', 'cap']],
    [myren, 139, 0, ['mamma', 'placed:pine', 'braid', 'light']],
  ] as const)('does not replay completed help at an older far checkpoint in %s', (chapter, x, y, flags) => {
    for (const readyFlags of [[], ['family:plane-ready', 'family:seesaw-ready', 'family:cap-ready', 'family:braid-ready']]) {
      const game = start(chapter, x, y, [...flags, ...readyFlags]);
      expect(game.sim.held).toBe(false);
      wait(game, 2);
      expect(game.sim.held).toBe(false);
      expect(game.sim.said.filter(id => id.startsWith('family:') || id === 'garden:ready')).toEqual([]);
    }
  });

  it('lets Bertil prepare the cap, keeps Elof ashore, and boards only on a new action', () => {
    const game = start(granskog, 154.6, -8);
    expect(game.sim.curr.word).toBe('callBertil');
    act(game);
    expect(game.sim.flags.has('cap:ready')).toBe(true);
    expect(game.sim.flags.has('cap')).toBe(false);
    const where = game.sim.curr.x;
    wait(game, .8, 1);
    expect(game.sim.curr.x).toBeCloseTo(where, 2);
    expect(game.sim.curr.mode).toBe('free');
    wait(game, .7);
    expect(game.sim.flags.has('beat:family:cap-ready')).toBe(true);
    expect(game.sim.held).toBe(false);
    wait(game, 4);
    expect(game.sim.curr.mode).toBe('free');
    expect(game.sim.curr.word).toBe('capBoard');
    act(game);
    expect(game.sim.curr.mode).toBe('ride');
    wait(game, 8.5);
    expect(game.sim.curr.x).toBeGreaterThan(176);
  });

  it('restores an offered boat without taking away the separate boarding choice', () => {
    const game = start(granskog, 155, -8, ['cap:ready', 'family:cap-ready']);
    expect(game.sim.curr.word).toBe('capBoard');
    wait(game, 3);
    expect(game.sim.curr.mode).toBe('free');
    act(game);
    expect(game.sim.curr.mode).toBe('ride');
  });

  it.each([
    [garden, 165.6, 0, 'moa', 'family:plane-ready'],
    [granskog, 108.2, -8, 'seesaw', 'family:seesaw-ready'],
    [myren, 102.2, 0, 'braid', 'family:braid-ready'],
  ] as const)('gives %s a short visible preparation before the held explanation', (chapter, x, y, flag, ready) => {
    const game = start(chapter, x, y);
    act(game);
    expect(game.sim.flags.has(flag)).toBe(true);
    expect(game.sim.held).toBe(true);
    wait(game, .5, 1);
    expect(game.sim.flags.has(ready)).toBe(false);
    wait(game, 1);
    expect(game.sim.flags.has(ready)).toBe(true);
    expect(game.sim.held).toBe(false);
    expect(game.sim.curr.mode).toBe('free');
  });
});
