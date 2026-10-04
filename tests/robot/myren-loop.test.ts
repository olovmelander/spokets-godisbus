import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { myren } from '../../src/content/chapters/myren';
import { settingsFor, simOptions } from '../../src/save/settings';
import { decide } from './robot';

const idle = { x: 0, hopHeld: false };
const noPress = { hop: false, act: false, helper: false };

function settle(game: Game, fps: number, seconds = 1): void {
  for (let frame = 0; frame < fps * seconds; frame++) game.frame(1 / fps, idle, noPress);
}

/** The player deliberately revisits the lantern without pressing Hoppa or Använd on the way. */
function walkTo(game: Game, x: number, fps: number, firstCrossing = false): void {
  let hopped = false;
  let guidedHops = 0;
  for (let frame = 0; frame < fps * 30 && Math.abs(game.sim.curr.x - x) > 0.1; frame++) {
    // Before the reunion the original stone crossing still asks for a hop on Äventyr.
    const ahead = firstCrossing && decide(game, myren).ahead;
    game.frame(1 / fps, { x: Math.sign(x - game.sim.curr.x), hopHeld: ahead }, { ...noPress, hop: ahead && !hopped });
    if (game.sim.curr.mode === 'fly') guidedHops++;
    hopped = ahead;
  }
  expect(game.sim.curr.x, `walk to ${x}`).toBeCloseTo(x, 0);
  if (!firstCrossing) expect(guidedHops, `no old forward auto-hop when walking to ${x}`).toBe(0);
  settle(game, fps, 0.3);
}

describe('Myren: light, reunion and the optional return spång', () => {
  it('does not offer or raise a return route before the chick has reached its family', () => {
    const game = new Game({ ...myren, spawn: { x: 169.2, y: 0.01 } }, {}, { flags: ['light', 'chick'] });
    settle(game, 60);
    game.frame(1 / 60, idle, { ...noPress, act: true });
    settle(game, 60);
    expect(game.sim.flags.has('home')).toBe(false);
    expect(game.sim.flags.has('bog:return-bridge')).toBe(false);
    expect(game.sim.flags.has('bog:lantern-return')).toBe(false);
    expect(game.sim.movers.find((m) => m.def.id === 'bog-boardwalk')!.y).toBe(-2.5);
  });

  for (const fps of [30, 60, 144]) for (const style of ['aventyr', 'lugnt'] as const) {
    it(`makes the light → reunion → Mamma → lantern loop walkable both ways on ${style} at ${fps} Hz`, () => {
      const game = new Game({ ...myren, spawn: { x: 164.7, y: 0.11 } }, simOptions(settingsFor(style)), { flags: ['light'] });
      settle(game, fps);
      expect(game.sim.flags.has('chick')).toBe(true);
      walkTo(game, 176.5, fps, true);
      expect(game.sim.flags.has('home')).toBe(true);
      expect(game.sim.flags.has('bog:return-bridge')).toBe(false);
      expect(game.sim.flags.has('crane')).toBe(false);
      walkTo(game, 169.2, fps);
      expect(game.sim.curr.word).toBe('callMamma');
      game.frame(1 / fps, idle, { ...noPress, act: true });
      settle(game, fps);
      expect(game.sim.flags.has('placed:bog-boardwalk')).toBe(true);
      expect(game.sim.flags.has('bog:lantern-return')).toBe(false);
      const collected = game.sim.collected.slice();
      walkTo(game, 142, fps);
      expect(game.sim.flags.has('bog:lantern-return')).toBe(true);
      expect(game.sim.said).toContain('bog:light-return');
      // Reuse the changed place twice; the first return is a discovery, not a repeating reward.
      walkTo(game, 180, fps);
      walkTo(game, 142, fps);
      // Stop over old hop markers, then turn around: Lugnt must treat this as the new firm path.
      for (const stop of [149, 155.4, 158, 161.8, 168]) walkTo(game, stop, fps);
      walkTo(game, 158, fps);
      walkTo(game, 155.4, fps);
      walkTo(game, 180, fps);
      expect(game.sim.said.filter((id) => id === 'bog:light-return')).toHaveLength(1);
      expect(game.sim.flags.has('crane')).toBe(false);
      expect(game.sim.flags.has('goal')).toBe(false);
      expect(game.sim.bubbles).toBe(0);
      expect(game.sim.sinks).toBe(0);
      for (const [i, wasCollected] of collected.entries()) if (wasCollected) expect(game.sim.collected[i]).toBe(true);
      expect(game.sim.placed).not.toContain('bog-boardwalk');
    });
  }

  it('restores a completed or interrupted helper call from the saved flags at a firm checkpoint', () => {
    for (const bridgeFlags of [['bog:return-bridge'], ['bog:return-bridge', 'placed:bog-boardwalk', 'bog:lantern-return', 'beat:bog:light-return']]) {
      const game = new Game(myren, simOptions(settingsFor('lugnt')), {
        checkpoint: 8, flags: ['light', 'chick', 'home', ...bridgeFlags], collected: [0, 17], placed: ['pine'],
      });
      settle(game, 60);
      expect(game.sim.flags.has('placed:bog-boardwalk')).toBe(true);
      walkTo(game, 142, 60);
      walkTo(game, 180, 60);
      expect(game.sim.bubbles).toBe(0);
      expect(game.sim.collected[0]).toBe(true);
      expect(game.sim.collected[17]).toBe(true);
      expect(game.sim.placed).toContain('pine');
      expect(game.sim.said.filter((id) => id === 'bog:light-return').length).toBeLessThanOrEqual(1);
    }
  });

  it('allows the original crane departure without using or discovering the optional return', () => {
    const game = new Game({ ...myren, spawn: { x: 164.7, y: 0.11 } }, {}, { flags: ['light'] });
    settle(game, 60);
    walkTo(game, 180, 60, true);
    let pressed = false;
    for (let frame = 0; frame < 60 * 20 && !game.sim.flags.has('goal'); frame++) {
      const decision = decide(game, myren);
      // Ignore side interactions and the robot's optional backtracking.
      const offered = game.sim.curr.word === 'climbOn' && decision.offered;
      game.frame(1 / 60, { x: 1, y: decision.y, hopHeld: false }, { ...noPress, act: offered && !pressed });
      pressed = offered;
    }
    expect(game.sim.flags.has('goal')).toBe(true);
    expect(game.sim.flags.has('home')).toBe(true);
    expect(game.sim.flags.has('crane')).toBe(true);
    expect(game.sim.flags.has('bog:return-bridge')).toBe(false);
    expect(game.sim.flags.has('bog:lantern-return')).toBe(false);
  });
});
