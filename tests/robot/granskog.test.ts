import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { granskog } from '../../src/content/chapters/granskog';
import { nextAfter } from '../../src/content/chapters';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { decide, playThrough } from './robot';

describe('Kapitel 2, Granskogen, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the forest's edge to the way to the bog at ${fps} Hz`, () => {
      const result = playThrough(fps, granskog, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.knocks).toBe(0);
      expect(result.checkpoint).toBe(granskog.checkpoints!.length - 1);
      // The things it had to do: the berry and the jay, the twig and the ants, Pappa and the cone, Bertil's
      // cap, and the ghost out of the eddy.
      expect(result.flags).toEqual(expect.arrayContaining([
        'berry', 'jay', 'placed:twig', 'antlift', 'seesaw', 'placed:cone', 'launch', 'log', 'cap', 'placed:rescue', 'goal',
      ]));
      // This robot presses every offered Använd, so it also chooses the optional berry gift.
      expect(result.said).toEqual(['vittra', 'vittra-gift', 'family:pappa', 'family:seesaw',
        'family:seesaw-ready', 'family:bertil', 'family:cap-ready', 'heja', 'thanked']);
      // The avalanche may bowl it over now and then: that only takes it back to a big candy.
      expect(result.bowled).toBeLessThanOrEqual(2);
      expect(result.bubbles).toBe(0);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, granskog, {}, 400);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${granskog.candy[i]!.x},${granskog.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(8);
  });

  it('on Lugnt the cones miss a running Elof, and Hoppa is never needed', () => {
    const game = new Game(granskog, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, granskog);
      // On Lugnt it jumps only where something stands in the way that no marked jump covers.
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bowled).toBe(0);
    expect(game.sim.bubbles).toBe(0);
    expect(hops).toBe(0);
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of granskog.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of granskog.spots ?? []) expect(verbs[spot.word ?? spot.verb], `the word for ${spot.id}`).toBeDefined();
  });

  it('follows Kapitel 1', () => {
    expect(nextAfter('garden')?.id).toBe('granskog');
    expect(nextAfter('testbana')).toBeNull();
  });
});
