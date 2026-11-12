import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { words } from '../../src/content/aventyr2/lines/flarken';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import {
  FALL_LIMIT, JUMP_APEX, LACE_REACH, LEDGE_REACH, RUN_SPEED, RUNNING_JUMP_REACH, SINK_DEPTH, STEP, WATER_REACH,
} from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge, SimStart } from '../../src/sim/types';
import { idle, jump, leap, run, runPast, sideTaken, swingAlong, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 5: Flärken (docs/aventyr-2.md), the bathing place at night in the storm. tests/robot/aventyr2.test.ts
 * holds it to the rules every chapter of the adventure keeps; here are its own: the swings, the slide, the picnic
 * table, the net and the changing rooms' roofs, the reed mats, the waves on the jetty, Mamma's boat, the diving
 * tower, the bark raft, the outlet at the end, its side ways, and a game taken up at every big candy.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

/** Everything said on the way, in order, when the robot plays it from the start. */
const SAID = [
  'sjon:arrive', 'sjon:dry-klonk', 'sjon:door', 'sjon:mats', 'sjon:wood', 'sjon:flash',
  'sjon:posts', 'sjon:old-one',
  'sjon:broken', 'sjon:family:mamma', 'sjon:boat-ready', 'sjon:steady', 'sjon:thanks',
  'sjon:near', 'sjon:tower', 'sjon:lookout',
  'sjon:gap', 'sjon:stone-idea', 'sjon:plop', 'sjon:plop-klonk', 'sjon:bark-idea', 'sjon:raft', 'sjon:klonk-raft',
  'sjon:outlet', 'sjon:log', 'sjon:floated', 'sjon:car', 'sjon:follow', 'sjon:klonk-cheer',
];
/** The big candies by name: their places in flarken.checkpoints. */
const CP = { swings: 1, court: 2, beach: 3, sand: 4, island: 5, jetty: 6, posts: 7, tower: 8, far: 9 };
/** What has happened by the time he is past Mamma's boat. */
const BOAT = ['sjon:mamma', 'sjon:boat'];

const ledges = flarken.ledges!;
const gunwale = ledges.find((ledge) => ledge.needs === 'sjon:boat')!;
const bark = flarken.movers!.find((mover) => mover.id === 'sjon-bark')!;
const door = flarken.movers!.find((mover) => mover.cycle)!;
const gust = flarken.gusts![0]!;
const call = flarken.spots!.find((spot) => spot.id === 'sjon:mamma')!;
const buildings = flarken.storm!.buildings!;
/** The planks' height on the jetty. */
const DECK = gust.y;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
/** Where the outline drops into open water and comes up again: the stretches with no ground to stand on. */
const pits = flarken.ground.flatMap((p, i) => {
  const next = flarken.ground[i + 1];
  return next && next.x > p.x && p.y < -1 && next.y < -1 ? [{ from: p.x, to: next.x }] : [];
});
const pitUnder = (x: number) => pits.find((pit) => pit.from < x && pit.to > x)!;
const barkGap = pitUnder(bark.stops[bark.stops.length - 1]!.x);
const breakGap = pitUnder(gunwale.x);
const [ring1, ring2] = flarken.hooks!;
const puddle = pitUnder(ring2!.x);
const ladder = flarken.climbs!.find((climb) => climb.look === 'ladder' && climb.bottom === 0)!;
const towerLadder = flarken.climbs!.find((climb) => climb.bottom === DECK)!;
const platform = ledges.find((ledge) => !ledge.needs && Math.abs(ledge.y - towerLadder.top) < 1e-6)!;
const table = ledges.find((ledge) => ledge.look === 'shelf' && ledge.y === 2)!;
const roofs = ledges.filter((ledge) => ledge.width > 5 && ledge.y > 2.5 && ledge.y < 3 && !ledge.needs);
const hutBench = ledges.find((ledge) => ledge.look === 'trestle' && ledge.y === 1)!;
const net = flarken.bouncers![0]!;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)} (${sim.curr.mode})`;

/** Plays it as the robot does, with the option to change its mind on a frame. */
function play(game: Game, seconds = 400, change?: (game: Game, d: ReturnType<typeof decide>) => ReturnType<typeof decide>) {
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !game.sim.flags.has('goal'); frame++) {
    let d = decide(game, flarken);
    if (change) d = change(game, d);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
}

/** Runs the way he is told until something stops him: the bark, say. */
function runInto(sim: Sim, dir: 1 | -1, seconds = 10): void {
  let last = sim.curr.x;
  for (let i = 0; i < seconds / STEP; i++) {
    sim.step({ ...idle, x: dir });
    if (i > 30 && Math.abs(sim.curr.x - last) < 1e-4) break;
    last = sim.curr.x;
  }
}

/** Runs right until he stands at x or past it: up a ladder, over a platform and down on the far side if need be. */
function runOn(sim: Sim, x: number, seconds = 20): void {
  for (let i = 0; i < seconds / STEP && !(sim.curr.x >= x && sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step({ ...idle, x: 1 });
  run(sim, 0.2);
}

/**
 * The save a real game keeps at a big candy (src/main.ts): the robot plays from the start until it reaches it,
 * and what it has found, placed and seen is taken up from there, said remarks and all.
 */
const saves = new Map<number, { start: SimStart; said: string[] }>();
function saveAt(checkpoint: number): { start: SimStart; said: string[] } {
  const kept = saves.get(checkpoint);
  if (kept) return kept;
  const game = new Game(flarken);
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * 400 && game.sim.checkpoint < checkpoint; frame++) {
    const d = decide(game, flarken);
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

describe('Äventyr 2, Kapitel 5: Flärken', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the parking to the jetty's end at ${fps} Hz, and the story is told in order`, () => {
      const result = playThrough(fps, flarken, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(flarken.checkpoints!.length - 1);
      // Mamma called and her boat held, and the bark pushed into the gap.
      expect(result.flags).toEqual(expect.arrayContaining([...BOAT, 'placed:sjon-bark', 'goal']));
      expect(result.said).toEqual(SAID);
      // It never falls in, no mat sinks under it, and it waits behind each post: no wave catches it.
      expect(result.bubbles).toBe(0);
      expect(result.sinks).toBe(0);
      expect(result.blown).toBe(0);
    });
  }

  it('the robot leaves no candy behind, and following the trail takes none of the side ways', () => {
    const game = new Game(flarken);
    play(game);
    expect(game.sim.flags.has('goal')).toBe(true);
    const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
    expect(missed.map((i) => `${flarken.candy[i]!.x},${flarken.candy[i]!.y}`)).toEqual([]);
    expect(game.sim.collectedSide.filter(Boolean).length).toBe(0);
    // Running along the trail it never comes down on the net: the bounce is for the one who jumps on it.
    expect(game.sim.bounces).toBe(0);
  });

  it('on Lugnt it is played by running and Använd: Hoppa only on the swings, and no mat sinks under a runner', () => {
    const game = new Game(flarken, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasSwinging = false;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const swinging = game.sim.curr.hook !== null;
      const { x, y, offered } = decide(game, flarken);
      game.frame(1 / 60, { x: swinging ? 0 : x, y, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasSwinging = swinging;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.sinks).toBe(0);
    expect(game.sim.collected.every(Boolean)).toBe(true);
  });

  describe('the playground', () => {
    it('has a lace ring under each swing seat: the first over the sand, the second over a puddle too wide to jump', () => {
      expect(heightAt(flarken, ring1!.x)).toBe(0);
      expect(puddle.to - puddle.from).toBeGreaterThan(RUNNING_JUMP_REACH + 1);
      expect(ring2!.x).toBeGreaterThan(puddle.from);
      expect(ring2!.x).toBeLessThan(puddle.to);
      expect(flarken.water!.some((w) => w.from === puddle.from && w.to === puddle.to)).toBe(true);
      // Each lands where the trail goes on, and the swing set stands over both, a seat at each ring.
      for (const ring of [ring1!, ring2!]) {
        expect(heightAt(flarken, ring.land!.x)).toBeCloseTo(ring.land!.y, 5);
        expect(ring.extra).toBeFalsy();
      }
      expect(ring2!.land!.x).toBeGreaterThan(puddle.to);
      const swings = buildings.find((b) => b.kind === 'swings')!;
      expect(swings.x - (swings.width ?? 22) / 4).toBeCloseTo(ring1!.x, 5);
      expect(swings.x + (swings.width ?? 22) / 4).toBeCloseTo(ring2!.x, 5);
    });

    it('he swings over the sand and over the puddle, and a leap at the puddle without the lace ends in the bubble', () => {
      const sim = new Sim(flarken);
      run(sim, 0.2);
      expect(swingAlong(sim, 1)).toEqual([ring1!.x]);
      expect(sim.curr.y, where(sim)).toBeCloseTo(0, 2);
      // On at a run, out of the first ring's reach, to the second: letting go anywhere on the early part of the
      // way up carries him over the puddle.
      for (const release of [0.5, 0.6, 0.7]) {
        const over = new Sim(flarken, {}, { checkpoint: 0 });
        run(over, 0.2);
        expect(runPast(over, ring1!.x + LACE_REACH)).toBe(true);
        expect(swingAlong(over, 1, 1, release)).toEqual([ring2!.x]);
        expect(over.curr.x, `let go at ${release}: ${where(over)}`).toBeGreaterThan(puddle.to);
        expect(over.bubbles).toBe(0);
      }
      // From the near side, without the lace.
      const leaper = new Sim(flarken, {}, { checkpoint: 0 });
      run(leaper, 0.2);
      expect(runPast(leaper, puddle.from - 0.3)).toBe(true);
      leap(leaper, 1);
      expect(leaper.bubbles).toBe(1);
    });

    it("climbs the slide's ladder to a platform higher than a jump, and runs down its chute", () => {
      const top = heightAt(flarken, ladder.x + 0.5);
      expect(top - heightAt(flarken, ladder.x - 0.5)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      expect(ladder.top).toBeCloseTo(top, 5);
      expect(ladder.exit).toBe(1);
      // The chute: no steeper than 45°, so his feet keep to it, and its foot is a soft landing anywhere.
      const rest = flarken.ground.filter((p) => p.x > ladder.x);
      const brink = rest.findIndex((p, i) => i > 0 && p.y === top && rest[i - 1]!.y === top);
      const [a, b] = [rest[brink]!, rest[brink + 1]!];
      expect(b.y).toBe(0);
      expect((a.y - b.y) / (b.x - a.x)).toBeLessThanOrEqual(1);
      const sim = new Sim(flarken, {}, { checkpoint: CP.swings });
      run(sim, 0.2);
      runOn(sim, b.x + 1);
      expect(sim.curr.y, where(sim)).toBeCloseTo(0, 2);
      expect(sim.bubbles).toBe(0);
      // The slide's picture: its ladder where his is, the chute down to where the slope ends.
      const slide = flarken.landmarks!.find((mark) => mark.look === 'slide')!;
      expect(slide.from).toBeCloseTo(ladder.x + 0.25, 5);
      expect(slide.to).toBeCloseTo(b.x, 5);
    });
  });

  describe('the picnic table and the volleyball net', () => {
    it('is a pull-up up each bench, and the trail goes under the top, where Klonk waits out of the rain', () => {
      const benches = flarken.ground.flatMap((p, i) => {
        const next = flarken.ground[i + 1];
        return next && next.y === p.y && p.y === 1.2 ? [{ from: p.x, to: next.x }] : [];
      });
      expect(benches.length).toBe(2);
      expect(1.2).toBeLessThanOrEqual(LEDGE_REACH);
      // The top spans the space between them, a held jump over a bench.
      expect(left(table)).toBeLessThanOrEqual(benches[0]!.to);
      expect(right(table)).toBeGreaterThanOrEqual(benches[1]!.from);
      expect(table.y - 1.2).toBeLessThan(JUMP_APEX);
      expect(table.y).toBeGreaterThan(1 + 0.5);
      for (let x = benches[0]!.to + 0.1; x < benches[1]!.from; x += 0.2) expect(heightAt(flarken, x)).toBe(0);
      expect(flarken.ghost!.some((perch) => perch.at.x > benches[0]!.to && perch.at.x < benches[1]!.from && perch.at.y === 0)).toBe(true);
      expect(flarken.landmarks!.some((mark) => mark.look === 'picnic' && mark.from === benches[0]!.from && mark.to === benches[1]!.to)).toBe(true);
    });

    it('has two side candies on the top: a held jump from the first bench', () => {
      const sim = new Sim(flarken, {}, { checkpoint: CP.swings });
      run(sim, 0.2);
      runOn(sim, left(table) - 0.6);
      expect(sim.curr.y, where(sim)).toBeCloseTo(1.2, 2);
      expect(walkTo(sim, left(table) + 0.2)).toBe(true);
      jump(sim, 1);
      run(sim, 0.3);
      expect(sim.curr.y, where(sim)).toBeCloseTo(table.y, 2);
      expect(walkTo(sim, right(table) - 0.2)).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, left(table), right(table))).toEqual({ taken: 2, of: 2 });
    });

    it('bounces him off the net up onto the changing rooms, and along both roofs: six side candies', () => {
      expect(net.y + net.lift).toBeGreaterThan(roofs[0]!.y + 0.3);
      // The roofs: higher than a jump from the ground or the bench, and each a fall he lands from softly.
      for (const roof of roofs) expect(roof.y).toBeGreaterThan(Math.max(JUMP_APEX, hutBench.y + JUMP_APEX));
      expect(roofs[0]!.y).toBeLessThan(FALL_LIMIT);
      const sim = new Sim(flarken, {}, { checkpoint: CP.court });
      run(sim, 0.2);
      expect(walkTo(sim, net.x)).toBe(true);
      sim.step({ ...idle, hop: true, hopHeld: true });
      for (let i = 0; i < 4 / STEP; i++) {
        const bounced = sim.bounces > 0;
        sim.step({ ...idle, x: bounced ? 0.7 : 0, hopHeld: true });
        if (bounced && sim.curr.grounded && sim.curr.vy <= 0.01) break;
      }
      expect(sim.bounces).toBe(1);
      expect(sim.curr.y, where(sim)).toBeCloseTo(roofs[0]!.y, 1);
      expect(walkTo(sim, right(roofs[0]!) - 0.2)).toBe(true);
      leap(sim, 1);
      expect(sim.curr.y, where(sim)).toBeCloseTo(roofs[1]!.y, 1);
      expect(walkTo(sim, right(roofs[1]!) - 0.2)).toBe(true);
      runOn(sim, right(roofs[1]!) + 1);
      expect(sim.curr.y, where(sim)).toBeCloseTo(0, 2);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, net.x - 0.5, right(roofs[1]!)).taken).toBe(6);
    });

    it('has a door that bangs above his head on the path: from the bench he rides it, and jumps up onto the roof', () => {
      expect(door.extra).toBe(true);
      expect(door.look).toBe('hut-door');
      expect(door.cycle!.slam).toBe(true);
      // Above his head on the path, out of reach of a jump from it, and in reach from the bench as it swings low.
      const low = Math.min(...door.stops.map((s) => s.y));
      expect(low).toBeGreaterThan(1.2);
      expect(low + door.height).toBeGreaterThan(JUMP_APEX);
      expect(low + door.height - hutBench.y).toBeLessThan(JUMP_APEX);
      const sim = new Sim(flarken, {}, { checkpoint: CP.court });
      run(sim, 0.2);
      expect(walkTo(sim, hutBench.x - 0.2)).toBe(true);
      jump(sim);
      run(sim, 0.3);
      expect(sim.curr.y, where(sim)).toBeCloseTo(hutBench.y, 2);
      const state = () => sim.movers.find((m) => m.def.id === door.id)!;
      for (let i = 0; i < 10 / STEP && !(state().x < door.stops[0]!.x + 0.2 && state().y < low + 0.1); i++) sim.step(idle);
      leap(sim, 1);
      expect(sim.curr.y, where(sim)).toBeCloseTo(state().y + door.height, 1);
      // It carries him out over the path, and from it the roof is a jump.
      for (let i = 0; i < 4 / STEP && state().x < door.stops[1]!.x - 0.2; i++) sim.step(idle);
      jump(sim);
      expect(sim.curr.y, where(sim)).toBeCloseTo(roofs[1]!.y, 1);
      expect(sim.bubbles).toBe(0);
      // The heart over the bench and the one over the door's swing, under the roof.
      const doorWay = (flarken.side ?? []).flatMap((c, i) => (c.x > left(hutBench) && c.x < door.stops[1]!.x && c.y < roofs[1]!.y ? [i] : []));
      expect(doorWay.length).toBe(2);
      for (const i of doorWay) expect(sim.collectedSide[i], `the side candy at ${flarken.side![i]!.x}`).toBe(true);
    });

    it('stands the huts behind their roofs, and the net where he bounces', () => {
      const huts = buildings.filter((d) => d.kind === 'hut' && !d.tar);
      expect(huts.length).toBe(2);
      for (const [i, hut] of huts.entries()) {
        expect(hut.x).toBeCloseTo(roofs[i]!.x, 5);
        expect(hut.height).toBeCloseTo(roofs[i]!.y, 5);
      }
      // The net is the bouncer itself, torn loose and sagging between its posts.
      expect(flarken.storm!.bouncers).toBe('net');
      expect(flarken.bouncers!.map((b) => b.x)).toContain(net.x);
    });
  });

  describe('Strandstenarna', () => {
    it('has a reed at the foot of the high stone, which the trail climbs, and the stone is too high to jump onto', () => {
      const reed = flarken.climbs!.find((climb) => climb.look === 'root' && climb.bottom === 0)!;
      const high = heightAt(flarken, reed.x + 0.5);
      expect(high - heightAt(flarken, reed.x - 0.5)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      expect(reed.top).toBeCloseTo(high, 5);
      expect(reed.exit).toBe(1);
      expect(flarken.decor!.some((d) => d.look === 'reed' && Math.abs(d.at.x - reed.x) < 0.01 && d.at.y === 0)).toBe(true);
      // And the way down its far side is steps a fall from which is soft.
      for (let x = reed.x + 1; x < reed.x + 12; x += 0.1) expect(heightAt(flarken, x) - heightAt(flarken, x + 0.1)).toBeLessThan(FALL_LIMIT);
    });

    it('has three stone shelves over the first stones: a held jump to each, and a jump across, with six side candies', () => {
      const shelves = ledges.filter((ledge) => ledge.look === 'shelf' && ledge.y !== 2 && !roofs.includes(ledge) && ledge !== platform);
      const first = shelves[0]!.x - 4.5;
      const sim = new Sim(flarken, {}, { checkpoint: CP.beach });
      run(sim, 0.2);
      expect(walkTo(sim, first)).toBe(true);
      leap(sim, 1, first + 1.2);
      expect(walkTo(sim, shelves[0]!.x)).toBe(true);
      jump(sim);
      expect(sim.curr.y, where(sim)).toBeCloseTo(shelves[0]!.y, 1);
      expect(walkTo(sim, left(shelves[1]!) + 0.15)).toBe(true);
      jump(sim);
      expect(sim.curr.y).toBeCloseTo(shelves[1]!.y, 1);
      leap(sim, 1, right(shelves[1]!) - 0.3);
      expect(sim.curr.y).toBeCloseTo(shelves[2]!.y, 1);
      // He walks off its end onto the sand, further on than he began.
      expect(walkTo(sim, right(shelves[2]!) + 0.8)).toBe(true);
      expect(sim.curr.y).toBeCloseTo(heightAt(flarken, sim.curr.x), 2);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, left(shelves[0]!) - 0.5, right(shelves[2]!) + 0.5)).toEqual({ taken: 6, of: 6 });
    });

    it('has a bent reed on the high stone, out of reach of his feet, which a jump catches and leads up to a leaf', () => {
      const reed = flarken.climbs!.find((climb) => climb.look === 'root' && climb.bottom > 0)!;
      const leaf = ledges.find((ledge) => ledge.look === 'leaf')!;
      const stone = heightAt(flarken, reed.x);
      expect(reed.bottom - stone).toBeGreaterThan(0.5);
      expect(reed.bottom - stone).toBeLessThan(JUMP_APEX);
      const sim = new Sim(flarken, {}, { checkpoint: CP.sand });
      run(sim, 0.2);
      // Up the reed of the trail, and along the top: walking under the bent one, he does not take hold.
      for (let i = 0; i < 20 / STEP && sim.curr.x < reed.x + 1; i++) sim.step({ ...idle, x: 1 });
      expect(sim.curr.mode).toBe('free');
      expect(sim.curr.y).toBeCloseTo(stone, 2);
      expect(walkTo(sim, reed.x)).toBe(true);
      sim.step({ ...idle, y: 1, hop: true, hopHeld: true });
      for (let i = 0; i < 6 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.y > stone + 1); i++) sim.step({ ...idle, y: 1, hopHeld: true });
      expect(sim.curr.y).toBeCloseTo(leaf.y, 2);
      expect(walkTo(sim, right(leaf) + 0.6)).toBe(true);
      run(sim, 0.5);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, reed.x - 0.5, right(leaf) + 0.5)).toEqual({ taken: 6, of: 6 });
    });
  });

  describe('Gungflyet', () => {
    const mats = flarken.tussocks!;
    const from = mats[0]!.x - mats[0]!.width / 2 - 3;
    const to = mats[mats.length - 1]!.x + mats[mats.length - 1]!.width / 2 + 3;

    it('has its reed mats over open water, a hop each no wider than between Myren\'s tussocks, and a marked jump for each', () => {
      const stones = [
        ...flarken.ground.flatMap((p, i) => {
          const next = flarken.ground[i + 1];
          return next && next.y === p.y && next.x > p.x && p.y > -1 ? [{ from: p.x, to: next.x, y: p.y }] : [];
        }),
        ...mats.map((t) => ({ from: t.x - t.width / 2, to: t.x + t.width / 2, y: t.y })),
      ].filter((s) => s.to > from && s.from < to).sort((a, b) => a.from - b.from);
      for (let i = 1; i < stones.length; i++) {
        const gap = stones[i]!.from - stones[i - 1]!.to;
        expect(gap, `the hop at ${stones[i - 1]!.to}`).toBeGreaterThan(1);
        expect(gap, `the hop at ${stones[i - 1]!.to}`).toBeLessThanOrEqual(1.5);
        expect(flarken.jumps!.some((j) => Math.abs(j.at.x - (stones[i - 1]!.to - 0.2)) < 0.01), `a marked jump at ${stones[i - 1]!.to}`).toBe(true);
      }
      // A mat that has sunk all the way is still above the water's reach: the bubble comes from the mat, not the water.
      const water = flarken.water!.find((w) => w.from < mats[0]!.x && w.to > mats[0]!.x)!;
      for (const t of mats) expect(t.y - SINK_DEPTH).toBeGreaterThan(water.y + WATER_REACH);
      // And a big candy on the firm stone between the two runs of mats.
      const between = flarken.checkpoints!.filter((c) => c.x > mats[0]!.x && c.x < mats[mats.length - 1]!.x);
      expect(between.length).toBe(1);
      expect(flarken.checkpoints!.indexOf(between[0]!)).toBe(CP.island);
    });

    it('a player who stops on every mat is carried back each time, and loses nothing', () => {
      const game = new Game(flarken);
      let rested = -1;
      let rest = 0;
      play(game, 400, (game, d) => {
        const p = game.sim.curr;
        const on = game.sim.tussocks.findIndex((t) => Math.abs(p.x - t.x) < t.width / 2 - 0.3 && Math.abs(p.y - t.y) < 0.1);
        if (on > rested && p.grounded) {
          rested = on;
          rest = 60 * 3;
        }
        const stand = rest > 0 && p.mode === 'free' && on === rested;
        if (rest > 0) rest--;
        return stand ? { x: 0, y: 0, ahead: false, offered: false } : d;
      });
      expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(game.sim.sinks).toBe(mats.length);
      expect(game.sim.bubbles).toBe(mats.length);
      expect(game.sim.collected.every(Boolean)).toBe(true);
    });
  });

  describe('Bryggan', () => {
    it('gives time to dash from each post to the next between two waves, on level, whole planks', () => {
      for (let i = 1; i < gust.shelters.length; i++) {
        const dash = (gust.shelters[i]! - gust.shelters[i - 1]!) / RUN_SPEED;
        expect((gust.every - gust.length) / dash, `from the post at ${gust.shelters[i - 1]}`).toBeGreaterThanOrEqual(1.7);
      }
      for (let x = gust.from; x <= gust.to; x += 0.25) expect(heightAt(flarken, x)).toBeCloseTo(gust.y, 5);
      // A big candy just before the first post and just after the last.
      expect(flarken.checkpoints![CP.jetty]!.x).toBeGreaterThan(gust.from - 4);
      expect(flarken.checkpoints![CP.jetty]!.x).toBeLessThan(gust.from);
      expect(flarken.checkpoints![CP.posts]!.x).toBeGreaterThan(gust.to);
      expect(flarken.checkpoints![CP.posts]!.x).toBeLessThan(gust.to + 4);
      expect(flarken.storm!.shelters).toBe('posts');
    });

    it('a player who never waits behind a post is washed back, and still arrives with everything', () => {
      const game = new Game(flarken);
      play(game, 400, (game, d) => {
        const p = game.sim.curr;
        const inTheWaves = p.mode === 'free' && p.x > gust.from - 1 && p.x < gust.to && p.verb === null;
        return inTheWaves ? { ...d, x: 1 } : d;
      });
      expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(game.sim.blown).toBeGreaterThan(0);
      expect(game.sim.bubbles).toBe(0);
      expect(game.sim.collected.every(Boolean)).toBe(true);
    });

    it('shows the old trägubbe far out on the planks, which leaps away when he comes', () => {
      const old = flarken.decor!.find((d) => d.look === 'tragubbe' && d.until === 'beat:sjon:old-one')!;
      const beat = flarken.beats!.find((b) => `beat:${b.id}` === old.until)!;
      expect(beat.who).toBe('elof');
      expect(old.at.x - beat.at!).toBeGreaterThan(8);
      expect(old.at.x).toBeLessThan(breakGap.from);
      expect(flarken.storm!.flybys!.some((f) => f.on === old.until && f.who === 'tragubbe' && f.from.x === old.at.x)).toBe(true);
    });
  });

  describe('Mammas båt', () => {
    it('the broken end is too far to jump; called, Mamma holds the boat still, and its gunwale carries him over', () => {
      expect(breakGap.to - breakGap.from).toBeGreaterThan(RUNNING_JUMP_REACH + 2);
      expect(gunwale.y).toBeCloseTo(DECK, 5);
      expect(left(gunwale)).toBeLessThanOrEqual(breakGap.from);
      expect(right(gunwale)).toBeGreaterThanOrEqual(breakGap.to);
      const sim = new Sim(flarken, {}, { checkpoint: CP.posts });
      run(sim, 0.2);
      // A leap off the broken end before he calls: the glitter bubble catches him over the water.
      expect(runPast(sim, breakGap.from - 0.3)).toBe(true);
      leap(sim, 1);
      expect(sim.bubbles).toBe(1);
      run(sim, 1.5);
      expect(sim.curr.x).toBeLessThan(breakGap.from);
      expect(sim.curr.y).toBeCloseTo(DECK, 2);
      // He calls her from the sign. While she rows up and lays the boat along the gap, he watches.
      expect(walkTo(sim, call.at.x)).toBe(true);
      expect(sim.curr.verb).toBe('call');
      expect(sim.curr.word).toBe('callMamma');
      use(sim);
      expect(sim.flags.has('sjon:mamma')).toBe(true);
      const x = sim.curr.x;
      run(sim, 1, { x: 1 });
      expect(sim.held).toBe(true);
      expect(sim.curr.x).toBeCloseTo(x, 3);
      expect(sim.flags.has('sjon:boat')).toBe(false);
      run(sim, 0.5);
      expect(sim.flags.has('sjon:boat')).toBe(true);
      expect(sim.held).toBe(false);
      // Along the gunwale, level with the planks, and onto the jetty beyond: nothing to jump.
      let lowest = Infinity;
      for (let i = 0; i < 6 / STEP && sim.curr.x < breakGap.to + 1; i++) {
        sim.step({ ...idle, x: 1 });
        lowest = Math.min(lowest, sim.curr.y);
      }
      expect(sim.curr.x).toBeGreaterThan(breakGap.to + 1);
      expect(lowest).toBeGreaterThan(DECK - 0.05);
      expect(sim.bubbles).toBe(1);
    });

    it('has Mamma answer warmly: she offers the boat, holds it, stays beside him, and knows how to follow the river', () => {
      const lines: Record<string, string> = sv.lines;
      const hers = flarken.beats!.filter((b) => b.who === 'mamma').map((b) => b.line);
      expect(hers).toEqual(['sjMamma', 'sjBoatReady', 'sjSteady', 'sjNear', 'sjCar']);
      for (const line of hers) expect(lines[line]).toBeTruthy();
      expect(lines.sjCar).toBe('Jag paddlar i land. Vi kör längs ån!');
      expect(flarken.coda).toBe('mamma');
      // Her lantern glows in the boat once she has come.
      expect(flarken.storm!.glows!.some((g) => g.after === 'sjon:boat' && g.at.x > breakGap.from && g.at.x < breakGap.to)).toBe(true);
    });
  });

  describe('Hopptornet', () => {
    const water = pitUnder(platform.x);

    it('stands in the water at the jetty\'s end: up its ladder, higher than a jump, to the platform', () => {
      expect(towerLadder.x).toBeLessThan(water.from);
      expect(water.from - towerLadder.x).toBeLessThanOrEqual(0.3);
      expect(towerLadder.top - towerLadder.bottom).toBeGreaterThan(JUMP_APEX + 1);
      expect(left(platform)).toBeCloseTo(water.from, 5);
      expect(right(platform)).toBeLessThan(water.to);
      expect(flarken.water!.some((w) => w.from === water.from && w.to === water.to)).toBe(true);
      // Even a held jump off it lands softly on the jetty, and the water beyond it is narrower than a step off at a run.
      expect(platform.y + JUMP_APEX - heightAt(flarken, water.to + 0.1)).toBeLessThan(FALL_LIMIT);
      expect(water.to - right(platform)).toBeLessThan(1);
      // The tower's picture: its ladder where his is, its platform where he stands.
      const tower = buildings.find((d) => d.kind === 'tower')!;
      expect(tower.x - tower.width! / 2 - 1.4).toBeCloseTo(towerLadder.x, 5);
      expect(tower.y! + tower.height!).toBeCloseTo(platform.y, 5);
    });

    it('shows the little one far out from the top, where the river begins, and Elof reads it there', () => {
      const lookout = flarken.beats!.find((b) => b.id === 'sjon:lookout')!;
      expect(lookout.read).toBe(true);
      expect(lookout.who).toBe('elof');
      expect(lookout.at!).toBeGreaterThan(left(platform));
      expect(lookout.at!).toBeLessThan(right(platform));
      // Olov, 9 November 2026: "Man ser inte lillgubben där ån börjar". On the platform the picture goes out with him,
      // in a held scene, and his words wait for the moment it has: then it is in the picture while they are read.
      const scene = flarken.scenes!.find((s) => s.id === 'sjon:utkik')!;
      expect(scene.hold).toBe(true);
      expect(scene.at).toBe(lookout.at);
      expect(scene.before).toBeCloseTo(right(platform), 5);
      const seen = scene.cues!.find((cue) => cue.flag === lookout.needs)!;
      const shot = scene.stage!.shots![0]!;
      expect(seen.at).toBeGreaterThanOrEqual(shot.at + (shot.move ?? 1));
      expect(seen.at).toBeLessThan(scene.seconds);
      // What it shows: the little one on its stone, far out behind the jetty's end, where the lake runs out, until he
      // has left the tower; and the shot has it in the middle of its picture, either way up.
      const sighting = flarken.storm!.sightings!.find((s) => s.on === lookout.needs)!;
      expect(sighting.who).toBe('lillgubbe');
      expect(sighting.until).toBe('beat:sjon:gap');
      expect(sighting.at.x).toBeGreaterThan(flarken.checkpoints![CP.far]!.x);
      expect(sighting.z).toBeLessThan(-3);
      expect(Math.abs(sighting.at.x - shot.x)).toBeLessThan(shot.width! / 2);
      expect(Math.abs(sighting.at.y - shot.y)).toBeLessThan(shot.height / 2);
      // Played: he is held on the platform until the picture has come back, and says it once, in its place.
      const sim = new Sim(flarken, {}, { checkpoint: CP.tower, flags: BOAT });
      run(sim, 0.2);
      for (let i = 0; i < 10 / STEP && !sim.flags.has('beat:sjon:lookout'); i++) sim.step({ ...idle, x: 1 });
      expect(sim.flags.has('sjon:seen'), where(sim)).toBe(true);
      expect(sim.curr.y).toBeCloseTo(platform.y, 2);
      const held = sim.curr.x;
      run(sim, scene.seconds - seen.at - 0.3, { x: 1 });
      expect(sim.curr.x).toBeCloseTo(held, 3);
      run(sim, 1, { x: 1 });
      expect(sim.curr.x).toBeGreaterThan(held + 0.5);
      expect(sim.said.filter((id) => id === 'sjon:lookout')).toEqual(['sjon:lookout']);
    });

    it('climbing it, he stops at the far edge if he walks, and a run or a held jump off it lands on the jetty beyond', () => {
      const up = () => {
        const sim = new Sim(flarken, {}, { checkpoint: CP.tower, flags: BOAT });
        run(sim, 0.2);
        for (let i = 0; i < 10 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded && sim.curr.y > DECK + 1); i++) sim.step({ ...idle, x: 1 });
        run(sim, 0.3);
        expect(sim.curr.y, where(sim)).toBeCloseTo(platform.y, 2);
        return sim;
      };
      // Walking: he stops at the edge and looks down at the water.
      const walker = up();
      for (let i = 0; i < 8 / STEP; i++) walker.step({ ...idle, x: 0.5 });
      expect(walker.curr.atEdge).toBe(true);
      expect(walker.curr.y).toBeCloseTo(platform.y, 2);
      // At a run he steps off over the water and lands on the jetty.
      const runner = up();
      runOn(runner, water.to + 0.3);
      expect(runner.curr.y, where(runner)).toBeCloseTo(DECK, 2);
      expect(runner.bubbles).toBe(0);
      // A held jump at a run from the very edge lands softly too.
      const jumper = up();
      leap(jumper, 1, right(platform) - 0.05);
      expect(jumper.curr.y, where(jumper)).toBeCloseTo(heightAt(flarken, jumper.curr.x), 2);
      expect(jumper.curr.x).toBeGreaterThan(water.to);
      expect(jumper.bubbles).toBe(0);
    });
  });

  describe('Barkflotten', () => {
    const last = bark.stops[bark.stops.length - 1]!;
    /** From the big candy before the tower, over it, down onto the planks where the bark lies. */
    const atTheBark = () => {
      const sim = new Sim(flarken, {}, { checkpoint: CP.tower, flags: BOAT });
      run(sim, 0.2);
      // The wrong idea comes first: he pushes the stone out, and it sinks.
      const stone = flarken.movers!.find((mover) => mover.id === 'sjon-stone')!;
      runOn(sim, stone.stops[0]!.x - stone.width / 2 - 1.5);
      runInto(sim, 1);
      expect(sim.curr.verb).toBe('push');
      use(sim);
      run(sim, 3);
      expect(sim.flags.has('placed:sjon-stone')).toBe(true);
      runOn(sim, bark.stops[0]!.x - bark.width / 2 - 1.5);
      return sim;
    };

    it('has the stone first: his own idea, which sinks, and only then can the bark be moved', () => {
      const stone = flarken.movers!.find((mover) => mover.id === 'sjon-stone')!;
      expect(stone.stops[0]!.x).toBeLessThan(bark.stops[0]!.x);
      expect(bark.needs).toBe('placed:sjon-stone');
      const last = stone.stops[stone.stops.length - 1]!;
      // It goes down in the gap, under the water, where nothing can stand on it.
      const water = flarken.water!.find((w) => w.from <= last.x && w.to >= last.x)!;
      expect(last.y + stone.height).toBeLessThan(water.y - 1);
      // The plop is said when he has seen it go under: the picture rolls it to the edge, tips it in and sinks it
      // (src/content/aventyr2/render.ts, `fieldstone`), a moment after it is in place to the simulation. He stands and
      // watches meanwhile, in a held scene whose shot has the gap in the picture, and the scene says when it is under.
      const watch = flarken.scenes!.find((scene) => scene.id === 'sjon:plopp')!;
      expect(watch.on).toBe('placed:sjon-stone');
      expect(watch.hold).toBe(true);
      expect(watch.until).toBe('sjon:sunk');
      const sunk = watch.cues!.find((cue) => cue.flag === 'sjon:sunk')!;
      expect(sunk.at).toBeGreaterThan(1);
      expect(sunk.at).toBeLessThan(2);
      const shot = watch.stage!.shots![0]!;
      expect(shot.x + shot.width! / 2).toBeGreaterThan(barkGap.from + 0.6);
      expect(shot.x - shot.width! / 2).toBeLessThan(stone.stops[0]!.x - stone.width / 2 - 0.3);
      expect(flarken.beats!.find((b) => b.id === 'sjon:plop')!.on).toBe('sjon:sunk');
      const sim = new Sim(flarken, {}, { checkpoint: CP.tower, flags: BOAT });
      run(sim, 0.2);
      runOn(sim, stone.stops[0]!.x - stone.width / 2 - 1.5);
      runInto(sim, 1);
      use(sim);
      // The scene begins once the stone is in place to the simulation; until it is under he stands, held there.
      for (let i = 0; i < 2 / STEP && sim.sceneFrame?.id !== 'sjon:plopp'; i++) sim.step({ ...idle });
      expect(sim.flags.has('placed:sjon-stone')).toBe(true);
      const watching = sim.curr.x;
      run(sim, sunk.at - 0.2, { x: 1 });
      expect(sim.curr.x).toBeCloseTo(watching, 3);
      expect(sim.said).not.toContain('sjon:plop');
      run(sim, 0.3, { x: 1 });
      expect(sim.said.slice(-2)).toEqual(['sjon:plop', 'sjon:plop-klonk']);
      // And it is not played again, nor in a game taken up after it.
      run(sim, watch.seconds);
      expect(sim.flags.has('scene:sjon:plopp')).toBe(true);
      expect(new Sim(flarken, {}, { checkpoint: CP.far, flags: [...BOAT, 'sjon:sunk'] }).flags.has('scene:sjon:plopp')).toBe(true);
      // The answer comes when he has seen the stone sink, and stands by the bark.
      const idea = flarken.beats!.find((b) => b.id === 'sjon:bark-idea')!;
      expect(idea.needs).toBe('placed:sjon-stone');
    });

    it('is a gap too wide to jump, where the bark floats with its top at his feet, a hop from each side', () => {
      expect(barkGap.to - barkGap.from).toBeGreaterThan(RUNNING_JUMP_REACH + 1);
      expect(last.y + bark.height).toBeCloseTo(heightAt(flarken, barkGap.from - 0.1), 5);
      expect(last.y + bark.height).toBeCloseTo(heightAt(flarken, barkGap.to + 0.1), 5);
      expect(last.x - bark.width / 2 - barkGap.from).toBeLessThanOrEqual(1.5);
      expect(barkGap.to - (last.x + bark.width / 2)).toBeLessThanOrEqual(1.5);
      // It floats mostly under water, as wood does.
      const water = flarken.water!.find((w) => w.from <= barkGap.from && w.to >= barkGap.to)!;
      expect(last.y).toBeLessThan(water.y);
      // Every marked jump over the gap waits for it.
      const over = flarken.jumps!.filter((j) => j.at.x > barkGap.from - 1 && j.at.x < barkGap.to);
      expect(over.length).toBe(2);
      for (const j of over) expect(j.needs).toBe(bark.id);
      // Before it floats there, the trail's last candy before the gap shows the way, and the bubble catches a leap.
      expect(flarken.candy.some((c) => Math.abs(c.x - last.x) < 0.3)).toBe(true);
    });

    it('stops him when he runs at it, three pushes put it in the water, and he hops over on it', () => {
      expect(bark.height).toBeGreaterThan(LEDGE_REACH);
      const sim = atTheBark();
      const state = () => sim.movers.find((m) => m.def.id === bark.id)!;
      for (let push = 1; push < bark.stops.length; push++) {
        // At a run he comes up against it, on its near side, and Knuffa is on the button.
        runInto(sim, 1);
        expect(sim.curr.y, `push ${push}`).toBeCloseTo(heightAt(flarken, sim.curr.x), 2);
        expect(sim.curr.x, `push ${push}`).toBeLessThan(state().x - bark.width / 2);
        expect(sim.curr.verb, `push ${push}`).toBe('push');
        use(sim);
        run(sim, 0.7);
        expect(state().stop).toBe(push);
      }
      expect(sim.flags.has(`placed:${bark.id}`)).toBe(true);
      expect(state().x).toBeCloseTo(last.x, 3);
      expect(state().y).toBeCloseTo(last.y, 3);
      leap(sim, 1, barkGap.from - 0.35);
      expect(Math.abs(sim.curr.x - last.x)).toBeLessThan(bark.width / 2);
      expect(sim.curr.y).toBeCloseTo(last.y + bark.height, 2);
      leap(sim, 1, last.x + bark.width / 2 - 0.35);
      expect(sim.curr.x).toBeGreaterThan(barkGap.to);
      expect(sim.bubbles).toBe(0);
    });

    it('goes home again when he leaves it half pushed, so nothing is ever stuck', () => {
      const sim = atTheBark();
      runInto(sim, 1);
      use(sim);
      run(sim, 0.7);
      const state = () => sim.movers.find((m) => m.def.id === bark.id)!;
      expect(state().stop).toBe(1);
      expect(walkTo(sim, state().x - 11, 30)).toBe(true);
      run(sim, 1);
      expect(state().stop).toBe(0);
      expect(state().x).toBeCloseTo(bark.stops[0]!.x, 3);
    });
  });

  describe("the jetty's end", () => {
    it('shows the outlet taking the little one, and the old trägubbe leaping after him onto a log', () => {
      const outlet = flarken.beats!.find((b) => b.id === 'sjon:outlet')!;
      expect(outlet.read).toBe(true);
      expect(outlet.who).toBe('elof');
      const watch = flarken.scenes!.find((scene) => scene.id === 'sjon:strommen')!;
      expect(watch.at!).toBeLessThan(flarken.goalX);
      expect(watch.at!).toBeGreaterThan(flarken.checkpoints![CP.far]!.x);
      expect(outlet.on).toBe('sjon:current');
      const flybys = flarken.storm!.flybys!;
      expect(flybys.find((f) => f.on === 'sjon:current')!.who).toBe('lillgubbe');
      // The old one waits on the end post until he leaps.
      const old = flarken.decor!.find((d) => d.look === 'tragubbe' && d.until === 'sjon:log-run')!;
      expect(old.at.x).toBeGreaterThan(flarken.goalX);
      expect(heightAt(flarken, old.at.x)).toBeCloseTo(old.at.y, 5);
      const leapAfter = flybys.find((f) => f.on === 'sjon:log-run')!;
      expect(leapAfter.who).toBe('tragubbe');
      expect(leapAfter.from.x).toBe(old.at.x);
      // Both go on down the river, out of the picture: the stone is the finale's, at Billsta.
      for (const f of flybys.filter((f) => f.on === 'sjon:current' || f.on === 'sjon:log-run')) expect(f.to.x).toBeGreaterThan(old.at.x + 10);
      expect(flarken.decor!.filter((d) => (d.look === 'tragubbe' || d.look === 'lillgubbe') && (d.z ?? 0) < -6)).toEqual([]);
      const lines: Record<string, string> = sv.lines;
      expect(Object.values(words.lines)).not.toContain('Där! På stenen ute i sjön!');
      expect(lines.sjFloated).toMatch(/^Trä flyter!/);
      expect(flarken.storm).toMatchObject({ rain: 0.95, lightning: 7, shelters: 'posts' });
    });
  });

  it('is taken up again at every big candy, and played on to the end without saying anything twice', () => {
    for (let checkpoint = 0; checkpoint < flarken.checkpoints!.length; checkpoint++) {
      const { start, said } = saveAt(checkpoint);
      const second = new Game(flarken, {}, start);
      expect(second.sim.curr.x).toBeCloseTo(flarken.checkpoints![checkpoint]!.x, 1);
      play(second);
      expect(second.sim.flags.has('goal'), `from big candy ${checkpoint}, it got to x ${second.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(second.sim.said.filter((id) => said.includes(id)), `from big candy ${checkpoint}`).toEqual([]);
      expect(second.sim.collected.every(Boolean), `from big candy ${checkpoint}`).toBe(true);
      expect(second.sim.bubbles).toBe(0);
    }
  });

  it('says what he is doing now all the way, with Mamma as the guide where her help is the next thing to do', () => {
    const game = new Game(flarken);
    const seen: string[] = [];
    let wasAhead = false;
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const d = decide(game, flarken);
      game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
      const now = storyContext('flarken', game.sim.flags, game.sim.curr);
      expect(now?.purpose, `at x ${game.sim.curr.x.toFixed(1)}`).toBeTruthy();
      expect(now?.family).toBeTruthy();
      const id = `${now!.id}${now!.guide ? `/${now!.guide}` : ''}`;
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      'sjonPark', 'sjonSwings', 'sjonSlide', 'sjonShore', 'sjonReeds', 'sjonShore', 'sjonMats', 'sjonJetty',
      'sjonMamma/mamma', 'sjonBoat/mamma', 'sjonOut', 'sjonTower', 'sjonDive', 'sjonGap', 'sjonBark', 'sjonRaft', 'sjonEnd', 'sjonRiver',
    ]);
  });

  it('keeps Klonk ahead on firm ground, never on a mat, and wordless: it only says klonk', () => {
    for (const perch of flarken.ghost!) {
      expect(perch.catch).toBeUndefined();
      expect(flarken.tussocks!.some((t) => Math.abs(perch.at.x - t.x) <= t.width / 2 + 0.3), `the perch at ${perch.at.x}`).toBe(false);
    }
    const lines: Record<string, string> = sv.lines;
    for (const beat of flarken.beats!.filter((b) => b.who === 'spoket')) expect(lines[beat.line]).toMatch(/^(Klonk[-,!]? ?)+(klonk!?)?$/i);
  });

  it('has its own words: new keys, short, no digits, and every one of them said', () => {
    const lines = Object.entries(words.lines);
    for (const [key, text] of lines) {
      expect(key).toMatch(/^sj[A-Z]/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
    }
    const said = new Set(flarken.beats!.map((b) => b.line));
    expect(lines.map(([key]) => key).filter((key) => !said.has(key))).toEqual([]);
    for (const id of Object.keys(words.purposes!)) expect(id).toMatch(/^sjon[A-Z]/);
    for (const id of Object.keys(words.helpers!)) expect(id).toMatch(/^sjon[A-Z]/);
  });

  it('is Kapitel 5: after Olympia and before Älven, at the bathing place with its own things', () => {
    expect(nextAfter('olympia')?.id).toBe('flarken');
    expect(nextAfter('flarken')?.id).toBe('alven');
    expect(AVENTYR2.find((chapter) => chapter.id === 'flarken')).toBe(flarken);
    expect(flarken.goalX).toBeGreaterThanOrEqual(175);
    expect(flarken.goalX).toBeLessThanOrEqual(195);
    expect(flarken.candy.length).toBeGreaterThanOrEqual(85);
    expect(flarken.checkpoints!.length).toBeGreaterThanOrEqual(8);
    expect(flarken.checkpoints!.length).toBeLessThanOrEqual(10);
    // The card, the lookout from the diving tower, and the stone going under.
    expect(flarken.scenes!.map((scene) => scene.id)).toEqual(['card', 'sjon:gamla', 'sjon:utkik', 'sjon:strommen', 'sjon:stocken', 'sjon:plopp']);
    for (const kind of ['tower', 'hut', 'swings', 'picnic', 'birch'] as const) {
      expect(buildings.some((d) => d.kind === kind), kind).toBe(true);
    }
    // The swings are in reach of the lace from the ground beside them.
    for (const ring of flarken.hooks!) expect(ring.y - 0.5).toBeLessThan(LACE_REACH);
  });
});
