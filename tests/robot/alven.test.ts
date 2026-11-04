import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { words } from '../../src/content/aventyr2/lines/alven';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { FALL_LIMIT, FELL_IN, JUMP_APEX, LEDGE_REACH, RUNNING_JUMP_REACH, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ride, SimStart } from '../../src/sim/types';
import { idle, leap, run, runPast, sideTaken, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 6: Älven (docs/aventyr-2.md). tests/robot/aventyr2.test.ts holds it to the rules every chapter
 * of the adventure keeps; here are its own: the raft and the leaf down the current, the bobbing logs between the
 * stones, Pappa's scarf over the rapids at the bridge in Bredbyn, the beaver's stumps and lodge, the owl over the
 * lake, the otter's stone, the flashes that show the two figures further down the river each time, and the lit
 * window towards Billsta.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

/** Everything said on the way, in order, when the robot plays it from the start. */
const SAID = [
  'al:arrive', 'al:klonk-floats', 'al:klonk', 'al:flash', 'al:raft-seen', 'al:current', 'al:old-one', 'al:logs-wait',
  'al:bredbyn', 'al:rapids', 'al:pappa-here', 'al:scarf-down', 'al:take-hold', 'al:up', 'al:over', 'al:thanks', 'al:follow', 'al:lodge', 'al:otter',
  'al:lake', 'al:owl-seen', 'al:owl-here', 'al:owl-fly', 'al:see-little', 'al:owl-thanks',
  'al:moalven', 'al:old-ahead',
  'al:last', 'al:gone', 'al:afraid', 'al:klonk-near', 'al:moa-never', 'al:bertil-pocket', 'al:moa-trail',
  'al:billsta', 'al:car', 'al:window', 'al:klonk-end',
];
/** The big candies by name: their places in alven.checkpoints. */
const CP = { gravel: 1, bank: 2, stone: 3, bredbyn: 4, farBank: 5, lake: 6, moalven: 7 };
const lines: Record<string, string> = sv.lines;
const verbs: Record<string, string> = sv.verbs;
const ride = (id: string) => alven.rides!.find((r) => r.id === id)!;
const spot = (id: string) => alven.spots!.find((s) => s.id === id)!;
/** The water at x, where there is any. */
const waterAt = (x: number) => alven.water!.find((w) => x > w.from && x < w.to);
/** The stretch of water a ride crosses, from the ground it leaves to the ground it lands on. */
const waterUnder = (r: Ride) => alven.water!.filter((w) => w.from > r.from.x && w.to < r.to.x);
/** The bobbing logs on the way, and the rolling ones out to the otter's stone. */
const logs = alven.movers!.filter((m) => m.cycle && !m.extra && !m.cycle.wait);
const eddy = alven.movers!.filter((m) => m.cycle?.wait);
const rollers = alven.movers!.filter((m) => m.cycle && m.extra);

/** Plays it as the robot does, from a start, with the option to change its mind on a frame. */
function play(game: Game, seconds = 400, change?: (game: Game, d: ReturnType<typeof decide>) => ReturnType<typeof decide>) {
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !game.sim.flags.has('goal'); frame++) {
    let d = decide(game, alven);
    if (change) d = change(game, d);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
}

/**
 * The save a real game keeps at a big candy (src/main.ts): the robot plays from the start until it reaches it,
 * and what it has found, placed and seen is taken up from there, said remarks and all.
 */
const saves = new Map<number, { start: SimStart; said: string[] }>();
function saveAt(checkpoint: number) {
  const kept = saves.get(checkpoint);
  if (kept) return kept;
  const game = new Game(alven);
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * 400 && game.sim.checkpoint < checkpoint; frame++) {
    const d = decide(game, alven);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
  expect(game.sim.checkpoint).toBe(checkpoint);
  const indices = (got: readonly boolean[]) => got.flatMap((has, i) => (has ? [i] : []));
  const save = {
    start: {
      checkpoint, collected: indices(game.sim.collected), side: indices(game.sim.collectedSide),
      placed: game.sim.placed, flags: [...game.sim.flags],
    },
    said: [...game.sim.said],
  };
  saves.set(checkpoint, save);
  return save;
}

/** Stands where he is until `ready`, a few seconds at most. */
function waitFor(sim: Sim, ready: () => boolean): void {
  for (let i = 0; i < 10 / STEP && !ready(); i++) sim.step(idle);
}

/** Lets a ride he is on carry him to its end, and says how high it lifted him. */
function rideOut(sim: Sim): number {
  let highest = -Infinity;
  for (let i = 0; i < 12 / STEP && sim.curr.mode === 'ride'; i++) {
    sim.step(idle);
    highest = Math.max(highest, sim.curr.y);
  }
  run(sim, 0.2);
  return highest;
}

describe('Äventyr 2, Kapitel 6: Älven', () => {
  it('is Kapitel 6: after Flärken and before Billsta, a night forest along the river', () => {
    expect(nextAfter('flarken')?.id).toBe('alven');
    expect(nextAfter('alven')?.id).toBe('billsta');
    expect(AVENTYR2.find((chapter) => chapter.id === 'alven')).toBe(alven);
    expect(alven.place).toBe('forest');
    expect(alven.goalX).toBeGreaterThanOrEqual(170);
    expect(alven.goalX).toBeLessThanOrEqual(190);
    expect(alven.candy.length).toBeGreaterThanOrEqual(80);
    expect(alven.checkpoints!.length).toBeGreaterThanOrEqual(8);
    expect(alven.checkpoints!.length).toBeLessThanOrEqual(10);
    expect(alven.coda).toBe('pappa');
    expect(alven.storm).toMatchObject({ rain: 1, lightning: 7.5 });
    expect(alven.scenes!.map((scene) => scene.id)).toEqual(['card']);
    expect(sv.scene.alven).toBe('Älven · halv tolv');
  });

  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the outlet down to Moälven at ${fps} Hz, and the story is told in order`, () => {
      const result = playThrough(fps, alven, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(alven.checkpoints!.length - 1);
      // The raft and the leaf, Pappa called and his scarf taken, the owl called and ridden.
      expect(result.flags).toEqual(expect.arrayContaining([
        'al:raft', 'al:pappa', 'al:scarf', 'al:lift', 'al:owl-call', 'al:owl-ready', 'al:owl', 'goal',
      ]));
      expect(result.said).toEqual(SAID);
      // It never falls in: not off a log, not into the rapids.
      expect(result.bubbles).toBe(0);
    });
  }

  it('the robot leaves no candy behind, and following the trail takes nothing from the otter\'s stone', () => {
    const game = new Game(alven);
    play(game);
    expect(game.sim.flags.has('goal')).toBe(true);
    const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
    expect(missed.map((i) => `${alven.candy[i]!.x},${alven.candy[i]!.y}`)).toEqual([]);
    expect(game.sim.collectedSide.filter(Boolean).length).toBe(0);
  });

  it('on Lugnt it is played by running and Använd: Hoppa is never needed, and nothing is lost', () => {
    const game = new Game(alven, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, alven);
      // On Lugnt it jumps only where something stands in the way that no marked jump covers.
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(hops).toBe(0);
    expect(game.sim.collected.every(Boolean)).toBe(true);
  });

  describe('Strömmen', () => {
    it('turns three logs to and fro in the eddies: each is a hop from the next for a moment, and far too far the rest of the time', () => {
      expect(eddy.length).toBe(3);
      const sim = new Sim(alven);
      const at = (i: number) => sim.movers.find((m) => m.def.id === eddy[i]!.id)!;
      const gap = (i: number) => at(i + 1).x - at(i).x - eddy[i]!.width;
      let close = 0;
      let wide = 0;
      for (let step = 0; step < 5.2 * 60; step++) {
        sim.step({ x: 0, y: 0, hop: false, hopHeld: false, act: false });
        if (gap(0) < 0.9) close++;
        if (gap(0) > RUNNING_JUMP_REACH) wide++;
      }
      // A moment, and most of the round it is out of reach.
      expect(close / (5.2 * 60)).toBeGreaterThan(0.15);
      expect(close / (5.2 * 60)).toBeLessThan(0.4);
      expect(wide).toBeGreaterThan(0);
      expect(spot('al:leaf').needs).toBe(FELL_IN);
    });

    it('offers the birch leaf to one who has fallen in, and from the start on Lugnt, and never before', () => {
      const leaf = ride('al:leaf');
      const sim = new Sim(alven, {}, { checkpoint: 1 });
      expect(sim.flags.has(FELL_IN)).toBe(false);
      const gentle = new Sim(alven, simOptions(settingsFor('lugnt')));
      expect(gentle.flags.has(FELL_IN)).toBe(true);
      expect(leaf.look).toBe('leaf');
    });

    it('carries him on a raft and offers a birch leaf, low on the water, from bank to bank over water too wide to jump', () => {
      for (const [id, look] of [['al:raft', 'raft'], ['al:leaf', 'leaf']] as const) {
        const r = ride(id);
        expect(r.look).toBe(look);
        expect(r.rise).toBeLessThanOrEqual(0.4);
        expect(r.corridor).toBeLessThanOrEqual(0.4);
        expect(heightAt(alven, r.from.x)).toBeCloseTo(r.from.y, 5);
        expect(heightAt(alven, r.to.x)).toBeCloseTo(r.to.y, 5);
        const water = waterUnder(r);
        expect(water.length, id).toBe(1);
        expect(water[0]!.to - water[0]!.from, id).toBeGreaterThan(RUNNING_JUMP_REACH * 4);
        // He steps on with Kliv på, where the current begins.
        expect(spot(id).ride).toBe(id);
        expect(verbs[spot(id).word!]).toBe('Kliv på');
        // The trail goes all along it.
        expect(alven.candy.filter((c) => c.x > r.from.x && c.x < r.to.x).length, id).toBeGreaterThanOrEqual(6);
      }
    });

    it('lets Klonk float beside him on the water: he is wood', () => {
      const afloat = alven.ghost!.filter((perch) => perch.z !== undefined);
      expect(afloat.length).toBeGreaterThanOrEqual(4);
      for (const perch of afloat) expect(perch.at.y, `the perch at ${perch.at.x}`).toBe(waterAt(perch.at.x)?.y);
      // Everywhere else he waits on firm ground, always further on, and wordless.
      const perches = alven.ghost!;
      for (let i = 1; i < perches.length; i++) expect(perches[i]!.at.x).toBeGreaterThan(perches[i - 1]!.at.x);
      for (const perch of perches.filter((p) => p.z === undefined)) expect(heightAt(alven, perch.at.x), `the perch at ${perch.at.x}`).toBeCloseTo(perch.at.y, 3);
      for (const perch of perches) expect(perch.catch).toBeUndefined();
      for (const beat of alven.beats!.filter((b) => b.who === 'spoket')) expect(lines[beat.line]).toMatch(/^(Klonk[-,!]? ?)+(klonk!?)?( …)?$/i);
      expect(lines.alKlonkFloats).toBe('Klonk, du flyter! Du är ju av trä.');
    });
  });

  describe('Stenar och stockar', () => {
    it('has a log between each two stones, bobbing so little that it carries him like a stone, each hop marked', () => {
      expect(logs.length).toBe(3);
      for (const log of logs) {
        const [low, high] = log.stops;
        // Only up and down, a few hundredths: never far from the height the marked jumps land at.
        expect(low!.x).toBe(high!.x);
        expect(Math.abs(high!.y - low!.y)).toBeLessThanOrEqual(0.2);
        const top = (low!.y + high!.y) / 2 + log.height;
        // It floats half under the water, as wood does.
        const water = waterAt(low!.x)!;
        expect(low!.y).toBeLessThan(water.y);
        expect(low!.y + log.height).toBeGreaterThan(water.y + 0.3);
        const onto = alven.jumps!.find((j) => j.land.x > low!.x - log.width / 2 && j.land.x < low!.x + log.width / 2)!;
        const off = alven.jumps!.find((j) => j.at.x > low!.x - log.width / 2 && j.at.x < low!.x + log.width / 2)!;
        expect(onto.land.y).toBeCloseTo(top, 5);
        expect(off.at.y).toBeCloseTo(top, 5);
        // From the stone before it and to the stone after it, a hop no wider than between Flärken's reed mats.
        expect(low!.x - log.width / 2 - onto.at.x - 0.2).toBeLessThanOrEqual(1.5);
        expect(off.land.x - 0.9 - (low!.x + log.width / 2)).toBeLessThanOrEqual(1.5);
      }
      // Between the stones it is deep: a fall there is the glitter bubble's.
      for (const log of logs) expect(heightAt(alven, log.stops[0]!.x)).toBeLessThan(-FALL_LIMIT);
    });

    it('a player who stands still on a log stays dry, carried up and down', () => {
      const log = logs[0]!;
      const sim = new Sim(alven, {}, { checkpoint: CP.bank });
      run(sim, 0.2);
      leap(sim, 1, 52.7);
      expect(sim.curr.y).toBeCloseTo(heightAt(alven, sim.curr.x), 1);
      leap(sim, 1, 56.1);
      const state = sim.movers.find((m) => m.def.id === log.id)!;
      expect(Math.abs(sim.curr.x - state.x)).toBeLessThan(log.width / 2);
      let lowest = Infinity;
      let highest = -Infinity;
      for (let i = 0; i < 6 / STEP; i++) {
        sim.step(idle);
        lowest = Math.min(lowest, sim.curr.y);
        highest = Math.max(highest, sim.curr.y);
        expect(sim.curr.y).toBeCloseTo(state.y + log.height, 1);
      }
      expect(highest - lowest).toBeGreaterThan(0.05);
      expect(sim.bubbles).toBe(0);
      // And on to the next stone.
      leap(sim, 1, state.x + log.width / 2 - 0.3);
      expect(sim.curr.y).toBeCloseTo(heightAt(alven, sim.curr.x), 2);
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('Bron i Bredbyn', () => {
    const lift = ride('al:lift');
    const rapids = waterUnder(lift)[0]!;
    const call = spot('al:pappa');

    it('has rapids under the bridge far too wide to jump, and the bridge over them, just behind him', () => {
      expect(rapids.to - rapids.from).toBeGreaterThan(RUNNING_JUMP_REACH * 5);
      const bridge = alven.storm!.buildings!.find((b) => b.kind === 'bridge')!;
      expect(bridge.x - bridge.width! / 2).toBeLessThan(rapids.from);
      expect(bridge.x + bridge.width! / 2).toBeGreaterThan(rapids.to);
      expect(bridge.z).toBeLessThanOrEqual(-2);
      expect(bridge.z).toBeGreaterThanOrEqual(-8);
      // His deck is high over the lift's arc.
      expect((bridge.y ?? 0) + bridge.height!).toBeGreaterThan(lift.from.y + lift.rise + 1.5);
      // Pappa's lamp shines on the bridge once he is called.
      expect(alven.storm!.glows!.some((g) => g.after === call.id && g.at.x > rapids.from && g.at.x < rapids.to)).toBe(true);
      // A fairy-tale river: a bridge and a beaver's lodge on it, and no dam or power station.
      expect(alven.storm!.buildings!.map((b) => b.kind)).toEqual(expect.arrayContaining(['bridge', 'lodge']));
    });

    it('called, Pappa lowers his scarf while Elof watches, and lifts him up and over the rapids', () => {
      expect(lift.look).toBe('none');
      expect(lift.rise).toBeGreaterThanOrEqual(3.5);
      expect(lift.rise).toBeLessThanOrEqual(5);
      expect(lift.from.x).toBeLessThan(rapids.from);
      expect(lift.to.x).toBeGreaterThan(rapids.to);
      const sim = new Sim(alven, {}, { checkpoint: CP.bredbyn });
      run(sim, 0.2);
      // A leap into the rapids before he calls: the glitter bubble catches him and sets him on the bank.
      expect(runPast(sim, rapids.from - 0.3)).toBe(true);
      leap(sim, 1);
      expect(sim.bubbles).toBe(1);
      run(sim, 1.5);
      expect(sim.curr.x).toBeLessThan(rapids.from);
      expect(sim.curr.y).toBeCloseTo(0, 2);
      // Before Pappa is called, the scarf is not there to take.
      expect(walkTo(sim, lift.from.x)).toBe(true);
      expect(sim.curr.verb).not.toBe('take');
      // He calls from the sign; while the scarf comes down he watches.
      expect(walkTo(sim, call.at.x)).toBe(true);
      expect(sim.curr.verb).toBe('call');
      expect(sim.curr.word).toBe('callPappa');
      use(sim);
      expect(sim.flags.has('al:pappa')).toBe(true);
      const x = sim.curr.x;
      run(sim, 1, { x: 1 });
      expect(sim.held).toBe(true);
      expect(sim.curr.x).toBeCloseTo(x, 3);
      expect(sim.flags.has('al:scarf')).toBe(false);
      run(sim, 0.7);
      expect(sim.flags.has('al:scarf')).toBe(true);
      expect(sim.held).toBe(false);
      // Ta tag i halsduken: up towards the bridge, and down on the far bank.
      expect(walkTo(sim, lift.from.x)).toBe(true);
      expect(sim.curr.verb).toBe('take');
      expect(sim.curr.word).toBe('alScarf');
      expect(verbs.alScarf).toBe('Ta tag i halsduken');
      use(sim);
      expect(sim.curr.mode).toBe('ride');
      const highest = rideOut(sim);
      expect(highest).toBeGreaterThan(lift.rise - 0.5);
      expect(sim.curr.x).toBeCloseTo(lift.to.x, 1);
      expect(sim.curr.y).toBeCloseTo(heightAt(alven, sim.curr.x), 2);
      expect(sim.bubbles).toBe(1);
    });

    it('has Pappa answer warmly: he calls from the bridge, lowers his scarf, holds it, and follows', () => {
      const his = alven.beats!.filter((b) => b.who === 'pappa').map((b) => b.line);
      // ... and at the end, by the car, he tells where the river goes.
      expect(his).toEqual(['alPappaHere', 'alScarfDown', 'alTakeHold', 'alOver', 'alFollow', 'alBillsta']);
      expect(lines.alTakeHold).toBe('Ta tag i halsduken, Elof!');
      for (const line of his) expect(lines[line]).toBeTruthy();
      // His three lines before the lift are read before Elof goes on.
      for (const beat of alven.beats!.filter((b) => b.who === 'pappa').slice(0, 3)) expect(beat.read).toBe(true);
    });

    it('lifts him again when taken up before the rapids, and not when taken up after them', () => {
      const before = new Sim(alven, {}, { checkpoint: CP.bredbyn, flags: ['al:pappa', 'al:scarf', 'al:lift'] });
      expect(before.flags.has('al:lift')).toBe(false);
      run(before, 0.2);
      expect(walkTo(before, lift.from.x)).toBe(true);
      expect(before.curr.word).toBe('alScarf');
      const after = new Sim(alven, {}, { checkpoint: CP.farBank, flags: ['al:pappa', 'al:scarf', 'al:lift'] });
      expect(after.flags.has('al:lift')).toBe(true);
    });
  });

  describe('Bäverhyddan', () => {
    const stick = alven.climbs![0]!;

    it('has gnawed stumps for steps, each in reach, and a lodge front too high to jump, with a gnawed stick up it', () => {
      expect(stick.look).toBe('root');
      expect(stick.exit).toBe(1);
      const below = heightAt(alven, stick.x);
      const above = heightAt(alven, stick.x + 0.6);
      expect(stick.bottom).toBeCloseTo(below, 5);
      expect(stick.top).toBeCloseTo(above, 5);
      expect(above - below).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      // The stumps up to it: each a step he pulls himself up.
      const steps = [115, 117, 118.9].map((x) => heightAt(alven, x));
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i]! - steps[i - 1]!).toBeGreaterThan(0.4);
        expect(steps[i]! - steps[i - 1]!).toBeLessThanOrEqual(LEDGE_REACH - 0.3);
      }
      // The far side is a slope he walks down, not a drop.
      for (let x = stick.x + 4.5; x < 131; x += 0.1) expect(heightAt(alven, x) - heightAt(alven, x + 0.1)).toBeLessThan(0.1);
      // The lodge stands behind it all, a heap of sticks.
      const lodge = alven.storm!.buildings!.find((b) => b.kind === 'lodge')!;
      expect(Math.abs(lodge.x - stick.x)).toBeLessThan(lodge.width! / 2);
      expect(lodge.z).toBeLessThan(-(lodge.width! / 3));
      expect(alven.surfaces!.some((s) => s.kind === 'earth' && s.from < stick.x && s.to > stick.x)).toBe(true);
    });

    it('is climbed by walking: up the stumps, up the stick and over the top, and down to the lake', () => {
      const sim = new Sim(alven, {}, { checkpoint: CP.farBank, flags: ['al:pappa', 'al:scarf', 'al:lift'] });
      run(sim, 0.2);
      let top = -Infinity;
      for (let i = 0; i < 20 / STEP && sim.curr.x < 130; i++) {
        sim.step({ ...idle, x: 1 });
        top = Math.max(top, sim.curr.y);
      }
      expect(sim.curr.x).toBeGreaterThanOrEqual(130);
      expect(top).toBeCloseTo(stick.top, 2);
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('Sjön', () => {
    const owl = ride('al:owl');
    const lake = alven.water!.filter((w) => w.from > owl.from.x && w.to < owl.to.x);
    const call = spot('al:owl-call');
    const board = spot('al:owl');

    it('is the widest water of all, and the owl from the forest is called and ridden over it, as in the final', () => {
      const widest = Math.max(...alven.water!.map((w) => w.to - w.from));
      expect(lake[lake.length - 1]!.to - lake[0]!.from).toBeGreaterThan(widest);
      expect(owl.look).toBe('owl');
      expect(owl.rise).toBeGreaterThanOrEqual(4);
      expect(call).toMatchObject({ look: 'owl', verb: 'call', word: 'alCallOwl' });
      expect(board).toMatchObject({ verb: 'take', word: 'alBoardOwl', needs: 'al:owl-ready', ride: 'al:owl' });
      expect(verbs.alCallOwl).toBe('Ropa på ugglan');
      const sim = new Sim(alven, {}, { checkpoint: CP.lake, flags: ['al:pappa', 'al:scarf', 'al:lift'] });
      run(sim, 0.2);
      // Before it is called it does not come.
      expect(walkTo(sim, board.at.x)).toBe(true);
      expect(sim.curr.verb).toBeNull();
      expect(walkTo(sim, call.at.x)).toBe(true);
      expect(sim.curr.word).toBe('alCallOwl');
      use(sim);
      run(sim, 0.8, { x: 1 });
      expect(sim.held).toBe(true);
      run(sim, 0.8);
      expect(sim.flags.has('al:owl-ready')).toBe(true);
      expect(walkTo(sim, board.at.x)).toBe(true);
      expect(sim.curr.word).toBe('alBoardOwl');
      use(sim);
      expect(rideOut(sim)).toBeGreaterThan(owl.rise - 0.5);
      expect(sim.curr.x).toBeCloseTo(owl.to.x, 1);
      expect(sim.curr.y).toBeCloseTo(heightAt(alven, sim.curr.x), 2);
      // High over the otter's stone: its sweets are not taken from the owl's back.
      expect(sideTaken(sim, 130, 170).taken).toBe(0);
      expect(sim.bubbles).toBe(0);
    });

    it('has two logs rolling in the shallows out to the otter\'s stone: a way of its own, there and back, with four sweets', () => {
      expect(rollers.length).toBe(2);
      for (const log of rollers) {
        expect(log.extra).toBe(true);
        // They float half under the shallows' water, with their tops at the shore's height.
        const water = waterAt(log.stops[0]!.x)!;
        for (const stop of log.stops) {
          expect(stop.y).toBeLessThan(water.y);
          expect(Math.abs(stop.y + log.height - heightAt(alven, 137))).toBeLessThanOrEqual(0.1);
        }
      }
      const sim = new Sim(alven, {}, { checkpoint: CP.lake, flags: ['al:pappa', 'al:scarf', 'al:lift'] });
      run(sim, 0.2);
      const at = (i: number) => sim.movers.find((m) => m.def.id === rollers[i]!.id)!;
      const on = (i: number) => Math.abs(sim.curr.x - at(i).x) < rollers[i]!.width / 2 && Math.abs(sim.curr.y - at(i).y - rollers[i]!.height) < 0.1;
      // Out: from the shore onto the first, onto the second when they roll close, and up onto the stone.
      leap(sim, 1, 137.1);
      expect(on(0)).toBe(true);
      waitFor(sim, () => at(1).x - at(0).x < 3.25 && at(0).x > 139.7);
      leap(sim, 1, at(0).x + 0.7);
      expect(on(1)).toBe(true);
      waitFor(sim, () => at(1).x > 142.95);
      leap(sim, 1, at(1).x + 0.7);
      expect(sim.curr.y).toBeCloseTo(heightAt(alven, sim.curr.x), 2);
      expect(walkTo(sim, 147.6)).toBe(true);
      expect(sideTaken(sim, 136, 149)).toEqual({ taken: 4, of: 4 });
      // And back the same way, to the shore where the owl waits.
      expect(walkTo(sim, 145.6)).toBe(true);
      waitFor(sim, () => at(1).x > 142.95);
      leap(sim, -1, 145.4);
      expect(on(1)).toBe(true);
      waitFor(sim, () => at(1).x - at(0).x < 3.25);
      leap(sim, -1, at(1).x - 0.7);
      expect(on(0)).toBe(true);
      leap(sim, -1, at(0).x - 0.7);
      expect(sim.curr.x).toBeLessThan(137.4);
      expect(sim.curr.y).toBeCloseTo(0, 2);
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('the flashes, and the way to Billsta', () => {
    it('shows the little one and the old one floating ahead in flashes, further down the river each time', () => {
      const flybys = alven.storm!.flybys!;
      for (const who of ['lillgubbe', 'tragubbe'] as const) {
        const his = flybys.filter((f) => f.who === who);
        expect(his.length, who).toBeGreaterThanOrEqual(2);
        for (let i = 1; i < his.length; i++) expect(his[i]!.from.x).toBeGreaterThan(his[i - 1]!.to.x);
      }
      for (const f of flybys) {
        // Each is Elof's sight, and lies ahead of him, down the river, low over the water.
        const beat = alven.beats!.find((b) => `beat:${b.id}` === f.on)!;
        expect(beat.who).toBe('elof');
        expect(f.from.x).toBeGreaterThan(beat.at!);
        expect(f.to.x).toBeGreaterThan(f.from.x);
        expect(Math.max(f.from.y, f.to.y)).toBeLessThan(1);
      }
    });

    it('lets the trail run out: the last of the handful, the night\'s lowest point, and the family lifts him out of it', () => {
      const last = alven.beats!.find((b) => b.id === 'al:last')!;
      expect(last.at!).toBeGreaterThan(alven.checkpoints![alven.checkpoints!.length - 1]!.x);
      expect(last.at!).toBeLessThan(alven.goalX);
      // The trail stops where he says so: past this there is no candy to follow, all the way to the goal.
      expect(alven.candy.filter((c) => c.x > last.at!)).toEqual([]);
      expect(alven.trailEnds).toBe(true);
      expect(alven.candy.filter((c) => c.x > last.at! - 4).length).toBeGreaterThan(0);
      const chain = ['al:last', 'al:gone', 'al:afraid', 'al:klonk-near', 'al:moa-never', 'al:bertil-pocket', 'al:moa-trail', 'al:billsta'];
      for (const [i, id] of chain.entries()) {
        const beat = alven.beats!.find((b) => b.id === id)!;
        expect(beat.read, id).toBe(true);
        if (i > 0) expect(beat.on, id).toBe(`beat:${chain[i - 1]}`);
      }
      expect(alven.beats!.find((b) => b.id === 'al:moa-trail')!.who).toBe('moa');
      expect(alven.beats!.find((b) => b.id === 'al:bertil-pocket')!.who).toBe('bertil');
      // Moa and Bertil are there, by the road, when he needs them.
      const family = (alven.decor ?? []).filter((d) => d.after === 'beat:al:last');
      expect(family.map((d) => d.word).sort()).toEqual(['callBertil', 'callMoa']);
    });

    it('ends with the family\'s car on the road by the river: three mil to Billsta, where mormor and morfar live', () => {
      const billsta = alven.beats!.find((b) => b.id === 'al:billsta')!;
      expect(billsta.who).toBe('pappa');
      expect(billsta.read).toBe(true);
      expect(lines[billsta.line]).toBe('Älven rinner ända till Billsta.');
      expect(billsta.on).toBe('beat:al:moa-trail');
      const car = alven.beats!.find((b) => b.id === 'al:car')!;
      expect(car.who).toBe('mamma');
      expect(car.on).toBe('beat:al:billsta');
      expect(lines[alven.beats!.find((b) => b.id === 'al:window')!.line]).toBe('Mormor och morfar kan hjälpa oss leta!');
      // The car stands on the road behind the river, its lights on from the moment Pappa speaks; no window far off.
      const parked = alven.storm!.buildings!.find((d) => d.kind === 'car')!;
      expect(parked.lit).toBe('beat:al:billsta');
      expect(Math.abs(parked.x - alven.goalX)).toBeLessThan(12);
      for (const glow of alven.storm!.glows!.filter((g) => g.after === 'beat:al:billsta')) expect(glow.z!).toBeGreaterThan(-6);
    });
  });

  it('is taken up again at every big candy, and played on to the end without saying anything twice', () => {
    for (let checkpoint = 0; checkpoint < alven.checkpoints!.length; checkpoint++) {
      const { start, said } = saveAt(checkpoint);
      const game = new Game(alven, {}, start);
      expect(game.sim.curr.x).toBeCloseTo(alven.checkpoints![checkpoint]!.x, 1);
      play(game);
      expect(game.sim.flags.has('goal'), `from big candy ${checkpoint}, it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(game.sim.said.filter((id) => said.includes(id)), `from big candy ${checkpoint}`).toEqual([]);
      expect([...said, ...game.sim.said], `from big candy ${checkpoint}`).toEqual(SAID);
      expect(game.sim.collected.every(Boolean), `from big candy ${checkpoint}`).toBe(true);
      expect(game.sim.bubbles).toBe(0);
    }
  });

  it('says what he is doing now all the way, with Pappa as the guide where his help is the next thing to do', () => {
    const game = new Game(alven);
    const seen: string[] = [];
    let wasAhead = false;
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const d = decide(game, alven);
      game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
      const now = storyContext('alven', game.sim.flags, game.sim.curr);
      expect(now?.purpose, `at x ${game.sim.curr.x.toFixed(1)}`).toBeTruthy();
      expect(now?.family).toBeTruthy();
      const id = `${now!.id}${now!.guide ? `/${now!.guide}` : ''}`;
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      'alvenOutlet', 'alvenRaft', 'alvenCurrent', 'alvenEddy', 'alvenStones',
      'alvenPappa/pappa', 'alvenScarf/pappa', 'alvenLifted/pappa', 'alvenLodge',
      'alvenLake', 'alvenBoard', 'alvenFly', 'alvenMoalven', 'alvenBillsta',
    ]);
  });

  it('has its own words: new keys, short, no digits, and every one of them said', () => {
    const own = Object.entries(words.lines);
    for (const [key, text] of own) {
      expect(key).toMatch(/^al[A-Z]/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
    }
    const said = new Set(alven.beats!.map((b) => b.line));
    expect(own.map(([key]) => key).filter((key) => !said.has(key))).toEqual([]);
    for (const id of Object.keys(words.verbs!)) expect(id).toMatch(/^al[A-Z]/);
    for (const id of Object.keys(words.purposes!)) expect(id).toMatch(/^alven[A-Z]/);
    for (const id of Object.keys(words.helpers!)) expect(id).toMatch(/^alven[A-Z]/);
    // Every button word of its own is on a button.
    const used = new Set(alven.spots!.map((s) => s.word));
    expect(Object.keys(words.verbs!).filter((key) => !used.has(key))).toEqual([]);
  });
});
