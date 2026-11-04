import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../../src/content/aventyr2/chapters/stormoga';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { playThrough } from './robot';

/** Äventyr 2's beginning, final and end (docs/aventyr-2.md): every step is his own choice, and none can fail. */
describe('Äventyr 2: Stormkvällen', () => {
  it('finds the flashlight for Pappa, says goodnight, loses both figures to the gust, tastes Klonk\'s star and goes out into the storm', () => {
    const result = playThrough(60, stormkvall, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['lamp:take', 'lamp:give', 'goodnight', 'gust', 'star', 'scene:krymper', 'scene:tillsammans', 'a2titel']));
    const order = ['kvall:0', 'skLampThanks', 'fonstret:0', 'fonstret:2', 'klonkstar:1', 'krymper:0', 'tillsammans:0', 'skTrail', 'stormtitel:0'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
    expect(result.bubbles).toBe(0);
  });

  it('resumes after the shrinking on the floor, small, and still has its trail', () => {
    const game = new Game(stormkvall, {}, { checkpoint: 1, flags: ['scene:kvall', 'lamp:take', 'lamp:give', 'beat:skLampThanks', 'goodnight', 'gust', 'scene:fonstret', 'scene:klonkstar', 'star', 'scene:krymper', 'scene:tillsammans'] });
    expect(game.sim.curr.x).toBe(18);
    for (let frame = 0; frame < 60 * 120 && !game.sim.flags.has('goal'); frame++) {
      game.frame(1 / 60, { x: 1, hopHeld: true }, { hop: frame % 50 === 0, act: false, helper: false });
    }
    expect(game.sim.flags.has('goal')).toBe(true);
  });
});

describe('Äventyr 2: Stormens öga', () => {
  it('flies out with the owl, opens the storm\'s eye, takes the gold sweet, grows and goes home', () => {
    const result = playThrough(60, stormoga, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['owl:call', 'owl:ready', 'owl', 'eye', 'scene:oga', 'scene:motet', 'gift', 'taste', 'scene:stor', 'home']));
    const order = ['soFar', 'soOwl', 'oga:1', 'motet:3', 'soGold', 'soShare', 'stor:4', 'stor:5', 'stor:6'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
  });
});

describe('Äventyr 2: Morgonen efter', () => {
  it('puts both figures back, turns the latch, names the little one Fjun and ends on a cup of cocoa', () => {
    const result = playThrough(60, morgonen, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.flags).toEqual(expect.arrayContaining(['shelf:old', 'shelf:small', 'latch', 'beat:moName', 'cocoa']));
    const order = ['moOld', 'moSmall', 'moLatched', 'moFluff', 'moName', 'moNice', 'moWelcome', 'moAll'];
    expect(result.said.filter((id) => order.includes(id))).toEqual(order);
  });

  it('does not end before the cocoa: walking past everything leaves him at the end of the room', () => {
    const game = new Game(morgonen, {});
    for (let frame = 0; frame < 60 * 60; frame++) game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.x).toBeGreaterThan(morgonen.goalX);
    expect(game.sim.flags.has('goal')).toBe(false);
  });
});
