import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { epilog } from '../../src/content/chapters/ends';
import { morgonen } from '../../src/content/aventyr2/chapters/morgonen';
import { hintFor, requiredForGoal } from '../../src/sim/help';
import type { ChapterData } from '../../src/sim/types';
import { decide } from '../robot/robot';

const cases = [
  {
    chapter: epilog, x: 46.801, receipt: 'named', action: 'knife',
    flags: ['partied', 'scene:card', 'scene:klonk-table', 'beat:klonk',
      ...['mamma', 'pappa', 'moa', 'bertil', 'spoket'].flatMap((who) => [`party:${who}`, `beat:partyThanks:${who}`])],
  },
  {
    chapter: morgonen, x: 61.801, receipt: 'moWelcome', action: 'cocoa',
    flags: ['scene:frukost', 'shelf:old', 'shelf:small', 'latch', 'scene:fonster', 'scene:haken', 'scene:namnet',
      ...['moOld', 'moSmall', 'moLatched', 'moFluff', 'moName', 'moKlonk', 'moNice'].map((id) => `beat:${id}`)],
  },
];

describe('returning to actions unlocked while walking and talking', () => {
  it.each(cases)('$chapter.id: guides back from the actual end-of-room position only after the line finishes', ({ chapter, x, flags, receipt, action }) => {
    const game = new Game({ ...chapter, spawn: { x, y: 0.01 } }, {}, { flags });
    const target = chapter.spots!.find((spot) => spot.id === action)!;
    for (let i = 0; i < 20; i++) game.frame(1 / 60, { x: 0, hopHeld: false, talking: false }, { hop: false, act: false, helper: false });
    expect(game.sim.pendingDialogue.has(receipt)).toBe(true);
    expect(hintFor(game.sim, chapter)).toBeNull();
    expect(decide(game, chapter).x).toBe(1);

    game.sim.acknowledge(receipt);
    expect(hintFor(game.sim, chapter)).toMatchObject({ at: target.at, verb: target.verb, word: target.word });
    expect(decide(game, chapter).x).toBe(-1);
    game.sim.step({ x: 0, y: 0, hop: false, hopHeld: false, act: false, help: true, talking: false });
    expect(game.sim.help.at).toEqual(target.at);
    let wasAhead = false, wasOffered = false;
    for (let i = 0; i < 60 * 15 && !game.sim.flags.has(action); i++) {
      const { x, y, ahead, offered } = decide(game, chapter);
      game.frame(1 / 60, { x, y, hopHeld: true, talking: false }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead; wasOffered = offered;
    }
    expect(game.sim.flags.has(action)).toBe(true);
    expect(Math.abs(game.sim.curr.x - target.at.x)).toBeLessThan(1.5);
  });

  it('keeps distant optional actions outside the return rule and handles cyclic authored conditions', () => {
    const chapter: ChapterData = {
      id: 'return', spawn: { x: 40, y: 0.01 }, goalX: 45, goalNeeds: 'ending',
      ground: [{ x: -10, y: 0 }, { x: 50, y: 0 }], candy: [],
      spots: [
        { id: 'optional', at: { x: 2, y: 0 }, verb: 'take' },
        { id: 'side', at: { x: 4, y: 0 }, verb: 'take', extra: true },
        { id: 'needed', at: { x: 8, y: 0 }, verb: 'take' },
      ],
      sets: [{ flag: 'ending', when: ['cycle', 'needed'] }, { flag: 'cycle', when: ['ending'] }],
    };
    const game = new Game(chapter);
    for (let i = 0; i < 20; i++) game.frame(1 / 60, { x: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect([...requiredForGoal(chapter)].sort()).toEqual(['cycle', 'ending', 'needed']);
    expect(hintFor(game.sim, chapter)?.at).toEqual({ x: 8, y: 0 });
    expect(decide(game, chapter).x).toBe(-1);
    game.sim.flags.add('needed');
    expect(hintFor(game.sim, chapter)).toBeNull();
    expect(decide(game, chapter).x).toBe(1);
  });
});
