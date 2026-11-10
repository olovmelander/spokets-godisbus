import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { ChapterData } from '../../src/sim/types';
import { idle, run, runPast } from './drive';

/**
 * What is said waits its turn (Olov, 9 November 2026: "när någon säger något kan bli avbrutet, så då måste det den
 * säger få talas klart innan nästa event spelas upp eller pratas upp"). The simulation learns only through its input
 * whether the page is still speaking (`talking`) and learns completion through `acknowledge`. With nobody
 * listening (the robot), it says and completes each line as before.
 */
const lane: ChapterData = {
  id: 'lane',
  spawn: { x: 0, y: 0.01 },
  goalX: 1000,
  ground: [{ x: -10, y: 8 }, { x: -10, y: 0 }, { x: 80, y: 0 }, { x: 80, y: 8 }],
  candy: [],
  beats: [
    { id: 'dark', at: 2, who: 'elof', line: 'ssDark' },
    { id: 'klonk', at: 4, who: 'spoket', line: 'ssKlonk' },
    { id: 'flash', at: 8, who: 'elof', line: 'ssFlash' },
    { id: 'gone', on: 'beat:flash', who: 'moa', line: 'ssSeeOld' },
    { id: 'left', at: 14, who: 'elof', line: 'ssVillage' },
    { id: 'right', at: 14, who: 'spoket', line: 'ssOnward' },
    { id: 'cones', at: 24, who: 'elof', line: 'ssCones', read: true },
    { id: 'stale', at: 40, until: 'past', who: 'elof', line: 'ssWide' },
  ],
  scenes: [{ id: 'held', at: 60, seconds: 1, hold: true }],
};

/** Runs right until he has passed `x`, or stands held there, with the page speaking or not. */
function walk(sim: Sim, x: number, talking: boolean): void {
  for (let i = 0; i < 20 / STEP && sim.curr.x < x; i++) sim.step({ ...idle, x: 1, talking });
}

/** Runs right until a line is said, or he has passed `x`. */
function runUntilSaid(sim: Sim, x: number, talking?: boolean): void {
  const before = sim.said.length;
  for (let i = 0; i < 20 / STEP && sim.curr.x < x && sim.said.length === before; i++) sim.step({ ...idle, x: 1, talking });
}

describe('lines that wait their turn', () => {
  it('holds a line back while the page still speaks, and its flag with it, and says it once it is quiet', () => {
    const sim = new Sim(lane);
    runUntilSaid(sim, 3, false);
    expect(sim.said).toEqual(['dark']);
    // "Hu, vad mörkt det är i skogen!" is still being read as he passes the next line's place, and the flash's.
    walk(sim, 9, true);
    expect(sim.said).toEqual(['dark']);
    expect(sim.flags.has('beat:klonk')).toBe(false);
    expect([...sim.waits.keys()]).toEqual(['klonk', 'flash']);
    expect(sim.unsaid).toBe(true);
    // Quiet: the one that has waited longest, and only one, until that one has been read too.
    sim.acknowledge('dark');
    sim.step({ ...idle, talking: false });
    expect(sim.said).toEqual(['dark', 'klonk']);
    run(sim, 1, { talking: true });
    expect(sim.said).toEqual(['dark', 'klonk']);
    sim.acknowledge('klonk');
    sim.step({ ...idle, talking: false });
    expect(sim.said).toEqual(['dark', 'klonk', 'flash']);
    // What waits for a line's flag waits for its words: Moa's answer comes after the flash has been read.
    expect(sim.flags.has('beat:flash')).toBe(true);
    run(sim, 1, { talking: true });
    expect(sim.said.at(-1)).toBe('flash');
    sim.acknowledge('flash');
    sim.step({ ...idle, talking: false });
    expect(sim.said.at(-1)).toBe('gone');
  });

  it('tells a page its lines one at a time, and nobody listening all those due at once', () => {
    const page = new Sim(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone'] });
    runUntilSaid(page, 15, false);
    expect(page.said).toEqual(['left']);
    const robot = new Sim(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone'] });
    runUntilSaid(robot, 15);
    expect(robot.said).toEqual(['left', 'right']);
  });

  it('lets him keep walking while an essential explanation waits its turn', () => {
    const sim = new Sim(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone', 'beat:left', 'beat:right'] });
    runPast(sim, 22);
    run(sim, 1.5, { x: 1, talking: true });
    expect(sim.waits.has('cones')).toBe(true);
    expect(sim.held).toBe(false);
    const at = sim.curr.x;
    run(sim, 2, { x: 1, talking: true });
    expect(sim.curr.x).toBeGreaterThan(at + 5);
    sim.step({ ...idle, x: 1, talking: false });
    expect(sim.said.at(-1)).toBe('cones');
    expect(sim.held).toBe(false);
  });

  it('keeps walking and jumping while several lines wait without dropping their order', () => {
    const sim = new Sim(lane);
    runUntilSaid(sim, 3, false);
    walk(sim, 10, true);
    expect([...sim.waits.keys()]).toEqual(['klonk', 'flash']);
    expect(sim.held).toBe(false);
    const at = sim.curr.x;
    sim.step({ ...idle, x: 1, hop: true, hopHeld: true, talking: true });
    run(sim, 0.2, { x: 1, hopHeld: true, talking: true });
    expect(sim.curr.x).toBeGreaterThan(at + 0.5);
    expect(sim.curr.y).toBeGreaterThan(0.5);
    expect(sim.curr.grounded).toBe(false);
    expect(sim.said).toEqual(['dark']);
    sim.acknowledge('dark');
    sim.step({ ...idle, x: 1, talking: false });
    expect(sim.said).toEqual(['dark', 'klonk']);
  });

  it('lets a line go that the story has gone past while it waited: it was never shown', () => {
    const sim = new Sim(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone', 'beat:left', 'beat:right', 'beat:cones'] });
    walk(sim, 39, false);
    walk(sim, 41, true);
    expect(sim.waits.has('stale')).toBe(true);
    sim.flags.add('past');
    run(sim, 0.5, { talking: true });
    sim.step({ ...idle, talking: false });
    expect(sim.waits.size).toBe(0);
    expect(sim.said).not.toContain('stale');
  });

  it('lets a held scene take the floor only once the lines before it are said and read', () => {
    const sim = new Sim(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone', 'beat:left', 'beat:right', 'beat:cones', 'beat:stale'] });
    walk(sim, 59, false);
    walk(sim, 60.2, true);
    run(sim, 3, { x: 1, talking: true });
    expect(sim.curr.x).toBeLessThan(60.4);
    expect(sim.sceneFrame).toBeNull();
    expect(sim.held).toBe(true);
    sim.step({ ...idle, talking: false });
    expect(sim.sceneFrame?.id).toBe('held');
  });

  it('waits for a long recording or slower reader without a timer releasing the next event', () => {
    const sim = new Sim(lane);
    runUntilSaid(sim, 3, false);
    walk(sim, 4.5, true);
    run(sim, 30, { talking: true });
    expect(sim.said).toEqual(['dark']);
    expect(sim.flags.has('beat:klonk')).toBe(false);
    sim.acknowledge('dark');
    sim.step({ ...idle, talking: false });
    expect(sim.said).toEqual(['dark', 'klonk']);
  });

  it('hears a line said in a frame as being said for the rest of that frame', () => {
    // At 30 frames a second, four steps a frame: the two lines due together come in two frames, not one.
    const game = new Game(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone'] });
    const counts: number[] = [];
    for (let frame = 0; frame < 30 * 6 && game.sim.said.length < 2; frame++) {
      const before = game.sim.said.length;
      game.frame(1 / 30, { x: 1, hopHeld: false, talking: false }, { hop: false, act: false, helper: false });
      counts.push(game.sim.said.length - before);
      for (const id of game.sim.said.slice(before)) game.sim.acknowledge(id);
    }
    expect(game.sim.said).toEqual(['left', 'right']);
    expect(Math.max(...counts)).toBe(1);
    // Nobody listening: both in the frame they come due, as the robot has always heard them.
    const robot = new Game(lane, {}, { flags: ['beat:dark', 'beat:klonk', 'beat:flash', 'beat:gone'] });
    for (let frame = 0; frame < 30 * 6 && robot.sim.said.length === 0; frame++) {
      robot.frame(1 / 30, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
    }
    expect(robot.sim.said).toEqual(['left', 'right']);
  });
});
