import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { sjon } from '../../src/content/aventyr2/chapters/sjon';
import { words } from '../../src/content/aventyr2/lines/sjon';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { FALL_LIMIT, JUMP_APEX, LEDGE_REACH, RUN_SPEED, RUNNING_JUMP_REACH, SINK_DEPTH, STEP, WATER_REACH } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge, SimStart } from '../../src/sim/types';
import { idle, jump, leap, run, runPast, sideTaken, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 4: Sjön (docs/aventyr-2.md). tests/robot/aventyr2.test.ts holds it to the rules every chapter
 * of the adventure keeps; here are its own: the reed mats, the waves on the jetty, Mamma's boat, the bark raft, the
 * flash at the end, its three side ways, and a game taken up at every big candy.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

const ledges = sjon.ledges!;
const gunwale = ledges.find((ledge) => ledge.needs === 'sjon:boat')!;
const bark = sjon.movers!.find((mover) => mover.id === 'sjon-bark')!;
const planks = sjon.movers!.filter((mover) => mover.cycle);
const gust = sjon.gusts![0]!;
const call = sjon.spots!.find((spot) => spot.id === 'sjon:mamma')!;
/** The planks' height on the jetty. */
const DECK = gust.y;
const left = (ledge: Ledge) => ledge.x - ledge.width / 2;
const right = (ledge: Ledge) => ledge.x + ledge.width / 2;
/** Where the outline drops into open water and comes up again: the stretches with no ground to stand on. */
const pits = sjon.ground.flatMap((p, i) => {
  const next = sjon.ground[i + 1];
  return next && next.x > p.x && p.y < -1 && next.y < -1 ? [{ from: p.x, to: next.x }] : [];
});
const barkGap = pits.find((pit) => pit.from < bark.stops[bark.stops.length - 1]!.x && pit.to > bark.stops[bark.stops.length - 1]!.x)!;
const breakGap = pits.find((pit) => pit.from < gunwale.x && pit.to > gunwale.x)!;

/** Plays it as the robot does, with the option to change its mind on a frame. */
function play(game: Game, seconds = 400, change?: (game: Game, d: ReturnType<typeof decide>) => ReturnType<typeof decide>) {
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !game.sim.flags.has('goal'); frame++) {
    let d = decide(game, sjon);
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

describe('Äventyr 2, Kapitel 4: Sjön', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the beach to the jetty's end at ${fps} Hz, and the story is told in order`, () => {
      const result = playThrough(fps, sjon, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(sjon.checkpoints!.length - 1);
      // Mamma called and her boat held, and the bark pushed into the gap.
      expect(result.flags).toEqual(expect.arrayContaining(['sjon:mamma', 'sjon:boat', 'placed:sjon-bark', 'goal']));
      expect(result.said).toEqual([
        'sjon:arrive', 'sjon:stones', 'sjon:reeds', 'sjon:mats', 'sjon:wood', 'sjon:flash',
        'sjon:jetty', 'sjon:posts', 'sjon:old-one',
        'sjon:broken', 'sjon:family:mamma', 'sjon:boat-ready', 'sjon:steady', 'sjon:thanks', 'sjon:near',
        'sjon:gap', 'sjon:bark-idea', 'sjon:raft', 'sjon:klonk-raft',
        'sjon:there', 'sjon:floated', 'sjon:mamma-sees', 'sjon:klonk-cheer',
      ]);
      // It never falls in, no mat sinks under it, and it waits behind each post: no wave catches it.
      expect(result.bubbles).toBe(0);
      expect(result.sinks).toBe(0);
      expect(result.blown).toBe(0);
    });
  }

  it('the robot leaves no candy behind, and following the trail takes none of the side ways', () => {
    const game = new Game(sjon);
    play(game);
    expect(game.sim.flags.has('goal')).toBe(true);
    const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
    expect(missed.map((i) => `${sjon.candy[i]!.x},${sjon.candy[i]!.y}`)).toEqual([]);
    expect(game.sim.collectedSide.filter(Boolean).length).toBe(0);
  });

  it('on Lugnt it is played by running and Använd: Hoppa is never needed, and no mat sinks under a runner', () => {
    const game = new Game(sjon, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, sjon);
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.sinks).toBe(0);
    expect(hops).toBe(0);
    expect(game.sim.collected.every(Boolean)).toBe(true);
  });

  describe('Strandstenarna', () => {
    it('has a reed at the foot of the high stone, which the trail climbs, and the stone is too high to jump onto', () => {
      const reed = sjon.climbs!.find((climb) => climb.bottom === 0)!;
      const high = heightAt(sjon, reed.x + 0.5);
      expect(high - heightAt(sjon, reed.x - 0.5)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      expect(reed.top).toBeCloseTo(high, 5);
      expect(reed.exit).toBe(1);
      expect(sjon.decor!.some((d) => d.look === 'reed' && Math.abs(d.at.x - reed.x) < 0.01 && d.at.y === 0)).toBe(true);
      // And the way down its far side is steps a fall from which is soft.
      for (let x = reed.x + 1; x < reed.x + 12; x += 0.1) expect(heightAt(sjon, x) - heightAt(sjon, x + 0.1)).toBeLessThan(FALL_LIMIT);
    });

    it('has three stone shelves over the first stones: a held jump to each, and a jump across, with six side candies', () => {
      const shelves = ledges.filter((ledge) => ledge.look === 'stone');
      const sim = new Sim(sjon);
      run(sim, 0.2);
      expect(walkTo(sim, 9.5)).toBe(true);
      leap(sim, 1, 10.7);
      expect(walkTo(sim, shelves[0]!.x)).toBe(true);
      jump(sim);
      expect(sim.curr.y).toBeCloseTo(shelves[0]!.y, 1);
      expect(walkTo(sim, left(shelves[1]!) + 0.15)).toBe(true);
      jump(sim);
      expect(sim.curr.y).toBeCloseTo(shelves[1]!.y, 1);
      leap(sim, 1, right(shelves[1]!) - 0.3);
      expect(sim.curr.y).toBeCloseTo(shelves[2]!.y, 1);
      // He walks off its end onto the sand, further on than he began.
      expect(walkTo(sim, right(shelves[2]!) + 0.8)).toBe(true);
      expect(sim.curr.y).toBeCloseTo(heightAt(sjon, sim.curr.x), 2);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, 13, 19)).toEqual({ taken: 6, of: 6 });
    });

    it('has a bent reed on the high stone, out of reach of his feet, which a jump catches and leads up to a leaf', () => {
      const reed = sjon.climbs!.find((climb) => climb.bottom > 0)!;
      const leaf = ledges.find((ledge) => ledge.look === 'leaf')!;
      const stone = heightAt(sjon, reed.x);
      expect(reed.bottom - stone).toBeGreaterThan(0.5);
      expect(reed.bottom - stone).toBeLessThan(JUMP_APEX);
      const sim = new Sim(sjon, {}, { checkpoint: 1 });
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
      expect(sideTaken(sim, 29, 33)).toEqual({ taken: 6, of: 6 });
    });
  });

  describe('Gungflyet', () => {
    it('has its reed mats over open water, a hop each no wider than between Myren\'s tussocks, and a marked jump for each', () => {
      const stones = [
        ...sjon.ground.flatMap((p, i) => {
          const next = sjon.ground[i + 1];
          return next && next.y === p.y && next.x > p.x && p.y > -1 ? [{ from: p.x, to: next.x, y: p.y }] : [];
        }),
        ...sjon.tussocks!.map((t) => ({ from: t.x - t.width / 2, to: t.x + t.width / 2, y: t.y })),
      ].filter((s) => s.from > 44 && s.to < 80).sort((a, b) => a.from - b.from);
      for (let i = 1; i < stones.length; i++) {
        const gap = stones[i]!.from - stones[i - 1]!.to;
        expect(gap, `the hop at ${stones[i - 1]!.to}`).toBeGreaterThan(1);
        expect(gap, `the hop at ${stones[i - 1]!.to}`).toBeLessThanOrEqual(1.5);
        expect(sjon.jumps!.some((j) => Math.abs(j.at.x - (stones[i - 1]!.to - 0.2)) < 0.01), `a marked jump at ${stones[i - 1]!.to}`).toBe(true);
      }
      // A mat that has sunk all the way is still above the water's reach: the bubble comes from the mat, not the water.
      const water = sjon.water!.find((w) => w.from < sjon.tussocks![0]!.x && w.to > sjon.tussocks![0]!.x)!;
      for (const t of sjon.tussocks!) expect(t.y - SINK_DEPTH).toBeGreaterThan(water.y + WATER_REACH);
      // And a big candy on the firm stone between the two runs of mats.
      const between = sjon.checkpoints!.filter((c) => c.x > sjon.tussocks![0]!.x && c.x < sjon.tussocks![sjon.tussocks!.length - 1]!.x);
      expect(between.length).toBe(1);
    });

    it('a player who stops on every mat is carried back each time, and loses nothing', () => {
      const game = new Game(sjon);
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
      expect(game.sim.sinks).toBe(sjon.tussocks!.length);
      expect(game.sim.bubbles).toBe(sjon.tussocks!.length);
      expect(game.sim.collected.every(Boolean)).toBe(true);
    });
  });

  describe('Bryggan', () => {
    it('gives time to dash from each post to the next between two waves, on level, whole planks', () => {
      for (let i = 1; i < gust.shelters.length; i++) {
        const dash = (gust.shelters[i]! - gust.shelters[i - 1]!) / RUN_SPEED;
        expect((gust.every - gust.length) / dash, `from the post at ${gust.shelters[i - 1]}`).toBeGreaterThanOrEqual(1.7);
      }
      for (let x = gust.from; x <= gust.to; x += 0.25) expect(heightAt(sjon, x)).toBeCloseTo(gust.y, 5);
      // A big candy just before the first post and just after the last.
      expect(sjon.checkpoints!.some((c) => c.x > gust.from - 4 && c.x < gust.from)).toBe(true);
      expect(sjon.checkpoints!.some((c) => c.x > gust.to && c.x < gust.to + 4)).toBe(true);
    });

    it('a player who never waits behind a post is washed back, and still arrives with everything', () => {
      const game = new Game(sjon);
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
      const old = sjon.decor!.find((d) => d.look === 'tragubbe' && d.until)!;
      const beat = sjon.beats!.find((b) => `beat:${b.id}` === old.until)!;
      expect(beat.who).toBe('elof');
      expect(old.at.x - beat.at!).toBeGreaterThan(8);
      expect(sjon.storm!.flybys!.some((f) => f.on === old.until && f.who === 'tragubbe' && f.from.x === old.at.x)).toBe(true);
    });
  });

  describe('Mammas båt', () => {
    it('the broken end is too far to jump; called, Mamma holds the boat still, and its gunwale carries him over', () => {
      expect(breakGap.to - breakGap.from).toBeGreaterThan(RUNNING_JUMP_REACH + 2);
      expect(gunwale.y).toBeCloseTo(DECK, 5);
      expect(left(gunwale)).toBeLessThanOrEqual(breakGap.from);
      expect(right(gunwale)).toBeGreaterThanOrEqual(breakGap.to);
      const sim = new Sim(sjon, {}, { checkpoint: 5 });
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
      // Along the gunwale, level with the planks, and onto the outer jetty: nothing to jump.
      let lowest = Infinity;
      for (let i = 0; i < 6 / STEP && sim.curr.x < breakGap.to + 1; i++) {
        sim.step({ ...idle, x: 1 });
        lowest = Math.min(lowest, sim.curr.y);
      }
      expect(sim.curr.x).toBeGreaterThan(breakGap.to + 1);
      expect(lowest).toBeGreaterThan(DECK - 0.05);
      expect(sim.bubbles).toBe(1);
    });

    it('has Mamma answer warmly: she offers the boat, holds it, and stays beside him', () => {
      const lines: Record<string, string> = sv.lines;
      const hers = sjon.beats!.filter((b) => b.who === 'mamma').map((b) => b.line);
      expect(hers).toEqual(['sjMamma', 'sjBoatReady', 'sjSteady', 'sjNear', 'sjMammaSees']);
      for (const line of hers) expect(lines[line]).toBeTruthy();
      expect(sjon.coda).toBe('mamma');
      // Her lantern glows in the boat once she has come.
      expect(sjon.storm!.glows!.some((g) => g.after === 'sjon:mamma' && g.at.x > breakGap.from && g.at.x < breakGap.to)).toBe(true);
    });

    it('has two benches and three bobbing planks over the outer jetty: a second way, with six side candies', () => {
      expect(planks.length).toBe(3);
      for (const plank of planks) {
        expect(plank.extra).toBe(true);
        // He walks under them on the jetty, however low they ride.
        expect(Math.min(...plank.stops.map((s) => s.y)) - DECK).toBeGreaterThan(1.2);
      }
      const benches = ledges.filter((ledge) => ledge.look === 'trestle');
      const sim = new Sim(sjon, {}, { checkpoint: 6, flags: ['sjon:mamma', 'sjon:boat'] });
      run(sim, 0.2);
      expect(walkTo(sim, benches[0]!.x)).toBe(true);
      jump(sim);
      expect(sim.curr.y).toBeCloseTo(benches[0]!.y, 1);
      expect(walkTo(sim, left(benches[1]!) + 0.2)).toBe(true);
      jump(sim);
      expect(sim.curr.y).toBeCloseTo(benches[1]!.y, 1);
      // From plank to plank as they bob, and onto the last bench.
      leap(sim, 1, right(benches[1]!) - 0.2);
      for (const [i, plank] of planks.entries()) {
        const top = sim.movers.find((m) => m.def.id === plank.id)!;
        expect(Math.abs(sim.curr.x - top.x), `on plank ${i + 1}`).toBeLessThanOrEqual(plank.width / 2 + 0.2);
        expect(sim.curr.y, `on plank ${i + 1}`).toBeCloseTo(top.y + plank.height, 1);
        leap(sim, 1, top.x + plank.width / 2 - 0.2);
      }
      expect(sim.curr.y).toBeCloseTo(benches[2]!.y, 1);
      expect(walkTo(sim, right(benches[2]!) + 0.8)).toBe(true);
      run(sim, 0.5);
      expect(sim.curr.y).toBeCloseTo(heightAt(sjon, sim.curr.x), 2);
      expect(sim.bubbles).toBe(0);
      expect(sideTaken(sim, 136, 149)).toEqual({ taken: 6, of: 6 });
    });
  });

  describe('Barkflotten', () => {
    const last = bark.stops[bark.stops.length - 1]!;

    it('is a gap too wide to jump, where the bark floats with its top at his feet, a hop from each side', () => {
      expect(barkGap.to - barkGap.from).toBeGreaterThan(RUNNING_JUMP_REACH + 1);
      expect(last.y + bark.height).toBeCloseTo(heightAt(sjon, barkGap.from - 0.1), 5);
      expect(last.y + bark.height).toBeCloseTo(heightAt(sjon, barkGap.to + 0.1), 5);
      expect(last.x - bark.width / 2 - barkGap.from).toBeLessThanOrEqual(1.5);
      expect(barkGap.to - (last.x + bark.width / 2)).toBeLessThanOrEqual(1.5);
      // It floats mostly under water, as wood does.
      const water = sjon.water!.find((w) => w.from <= barkGap.from && w.to >= barkGap.to)!;
      expect(last.y).toBeLessThan(water.y);
      // Every marked jump over the gap waits for it.
      const over = sjon.jumps!.filter((j) => j.at.x > barkGap.from - 1 && j.at.x < barkGap.to);
      expect(over.length).toBe(2);
      for (const j of over) expect(j.needs).toBe(bark.id);
      // Before it floats there, the trail's last candy before the gap shows the way, and the bubble catches a leap.
      expect(sjon.candy.some((c) => Math.abs(c.x - last.x) < 0.3)).toBe(true);
    });

    it('stops him when he runs at it, three pushes put it in the water, and he hops over on it', () => {
      expect(bark.height).toBeGreaterThan(LEDGE_REACH);
      const sim = new Sim(sjon, {}, { checkpoint: 6, flags: ['sjon:mamma', 'sjon:boat'] });
      run(sim, 0.2);
      const state = () => sim.movers.find((m) => m.def.id === bark.id)!;
      for (let push = 1; push < bark.stops.length; push++) {
        // At a run he comes up against it, on its near side, and Knuffa is on the button.
        runInto(sim, 1);
        expect(sim.curr.y, `push ${push}`).toBeCloseTo(heightAt(sjon, sim.curr.x), 2);
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
      const sim = new Sim(sjon, {}, { checkpoint: 6, flags: ['sjon:mamma', 'sjon:boat'] });
      run(sim, 0.2);
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
    it('shows both trägubbar far out on a stone in a flash, and Elof reads it before he goes on', () => {
      const there = sjon.beats!.find((b) => b.id === 'sjon:there')!;
      expect(there.read).toBe(true);
      expect(there.who).toBe('elof');
      expect((sv.lines as Record<string, string>)[there.line]).toBe('Där! På stenen ute i sjön!');
      expect(there.at!).toBeLessThan(sjon.goalX);
      expect(there.at!).toBeGreaterThan(sjon.checkpoints![sjon.checkpoints!.length - 1]!.x);
      const far = sjon.decor!.filter((d) => d.z !== undefined && d.z < -10);
      expect(far.map((d) => d.look).sort()).toEqual(['lillgubbe', 'tragubbe']);
      for (const d of far) expect(['beat:sjon:there', 'sjon:landed']).toContain(d.after);
      expect(sjon.storm!.flybys!.some((f) => f.on === 'beat:sjon:there')).toBe(true);
      expect(sjon.storm).toMatchObject({ rain: 0.8, lightning: 8 });
    });
  });

  it('is taken up again at every big candy, and played on to the end without saying anything twice', () => {
    for (let checkpoint = 0; checkpoint < sjon.checkpoints!.length; checkpoint++) {
      const first = new Game(sjon);
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 400 && first.sim.checkpoint < checkpoint; frame++) {
        const d = decide(first, sjon);
        first.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
        wasAhead = d.ahead;
        wasOffered = d.offered;
      }
      expect(first.sim.checkpoint).toBe(checkpoint);
      // What the save keeps (src/main.ts, writeSave).
      const start: SimStart = {
        checkpoint: first.sim.checkpoint,
        collected: first.sim.collected.flatMap((got, i) => (got ? [i] : [])),
        side: first.sim.collectedSide.flatMap((got, i) => (got ? [i] : [])),
        placed: first.sim.placed,
        flags: [...first.sim.flags],
      };
      const second = new Game(sjon, {}, start);
      expect(second.sim.curr.x).toBeCloseTo(sjon.checkpoints![checkpoint]!.x, 1);
      play(second);
      expect(second.sim.flags.has('goal'), `from big candy ${checkpoint}, it got to x ${second.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(second.sim.said.filter((id) => first.sim.said.includes(id)), `from big candy ${checkpoint}`).toEqual([]);
      expect(second.sim.collected.every(Boolean), `from big candy ${checkpoint}`).toBe(true);
      expect(second.sim.bubbles).toBe(0);
    }
  });

  it('says what he is doing now all the way, with Mamma as the guide where her help is the next thing to do', () => {
    const game = new Game(sjon);
    const seen: string[] = [];
    let wasAhead = false;
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const d = decide(game, sjon);
      game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
      const now = storyContext('sjon', game.sim.flags, game.sim.curr);
      expect(now?.purpose, `at x ${game.sim.curr.x.toFixed(1)}`).toBeTruthy();
      expect(now?.family).toBeTruthy();
      const id = `${now!.id}${now!.guide ? `/${now!.guide}` : ''}`;
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      'sjonShore', 'sjonReeds', 'sjonShore', 'sjonMats', 'sjonJetty', 'sjonMamma/mamma', 'sjonBoat/mamma',
      'sjonOut', 'sjonBark', 'sjonRaft', 'sjonEnd', 'sjonFound',
    ]);
  });

  it('keeps Klonk ahead on firm ground, never on a mat, and wordless: it only says klonk', () => {
    for (const perch of sjon.ghost!) {
      expect(perch.catch).toBeUndefined();
      expect(sjon.tussocks!.some((t) => Math.abs(perch.at.x - t.x) <= t.width / 2 + 0.3), `the perch at ${perch.at.x}`).toBe(false);
    }
    const lines: Record<string, string> = sv.lines;
    for (const beat of sjon.beats!.filter((b) => b.who === 'spoket')) expect(lines[beat.line]).toMatch(/^(Klonk[-,!]? ?)+(klonk!?)?$/i);
  });

  it('has its own words: new keys, short, no digits, and every one of them said', () => {
    const lines = Object.entries(words.lines);
    for (const [key, text] of lines) {
      expect(key).toMatch(/^sj[A-Z]/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
    }
    const said = new Set(sjon.beats!.map((b) => b.line));
    expect(lines.map(([key]) => key).filter((key) => !said.has(key))).toEqual([]);
    for (const id of Object.keys(words.purposes!)) expect(id).toMatch(/^sjon[A-Z]/);
    for (const id of Object.keys(words.helpers!)) expect(id).toMatch(/^sjon[A-Z]/);
  });

  it('is Kapitel 4: after Byn i stormen and before the final', () => {
    expect(nextAfter('stormbyn')?.id).toBe('sjon');
    expect(nextAfter('sjon')?.id).toBe('stormoga');
    expect(AVENTYR2.find((chapter) => chapter.id === 'sjon')).toBe(sjon);
    expect(sjon.goalX).toBeGreaterThanOrEqual(165);
    expect(sjon.goalX).toBeLessThanOrEqual(180);
    expect(sjon.candy.length).toBeGreaterThanOrEqual(70);
  });
});
