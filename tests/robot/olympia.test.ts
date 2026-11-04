import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { context, olympia } from '../../src/content/aventyr2/chapters/olympia';
import { words } from '../../src/content/aventyr2/lines/olympia';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import {
  DROP_RADIUS, FALL_LIMIT, GHOST_CLEARANCE, JUMP_APEX, LEDGE_GIVE, LEDGE_REACH, ROLLER_REACH, RUN_SPEED, RUNNING_JUMP_REACH, STEP,
} from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { SimStart } from '../../src/sim/types';
import { idle, leap, run, sideTaken, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 4: Olympia (src/content/aventyr2/chapters/olympia.ts). tests/robot/aventyr2.test.ts holds it to
 * the rules every chapter of the adventure keeps; here are its own: the fence, the balls in the wind, the ball kicked
 * into the flooded goalmouth, the net and the crossbar, the benches, Bertil's free kick, the biathlon range, the
 * flash at the end, and a game taken up at every big candy.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

/** What is said on the way, in the story's order. */
const SAID = [
  'ol:arrive', 'ol:klonk', 'ol:lights', 'ol:fence', 'ol:top', 'ol:little',
  'ol:wind', 'ol:jump', 'ol:klonk-balls', 'ol:phew',
  'ol:puddle', 'ol:idea', 'ol:splash', 'ol:klonk-ball', 'ol:in-goal',
  'ol:flag', 'ol:benches', 'ol:crowd',
  'ol:circle', 'ol:old-one', 'ol:bertil-here', 'ol:kick-ready', 'ol:fly', 'ol:goal', 'ol:cheer', 'ol:thanks',
  'ol:range', 'ol:all-white',
  'ol:trail', 'ol:gust', 'ol:north', 'ol:follow', 'ol:car', 'ol:klonk-end',
];
/** The ball floated, Bertil called, his ball ready and ridden, and the end. */
const PUZZLES = ['placed:ol-ball', 'ol:bertil', 'ol:kick-ready', 'ol:kick', 'goal'];

const ball = olympia.movers!.find((mover) => mover.id === 'ol-ball')!;
const last = ball.stops[ball.stops.length - 1]!;
const [fenceDown, fenceUp, net] = olympia.climbs!;
const crossbar = olympia.ledges![0]!;
const kick = olympia.rides!.find((ride) => ride.id === 'kick')!;
const targets = olympia.spots!.filter((spot) => spot.id.startsWith('ol:target-'));
const call = olympia.spots!.find((spot) => spot.id === 'ol:bertil')!;
const board = olympia.spots!.find((spot) => spot.id === 'ol:kick')!;
/** Where the outline drops into a pit and comes up again: the stretches with no ground to stand on. */
const pits = olympia.ground.flatMap((p, i) => {
  const next = olympia.ground[i + 1];
  return next && next.x > p.x && p.y < -1 && next.y < -1 ? [{ from: p.x, to: next.x }] : [];
});
const puddle = pits.find((pit) => pit.from < last.x && pit.to > last.x)!;
const circle = pits.find((pit) => pit.from > puddle.to)!;
const checkpoint = (x: number) => olympia.checkpoints!.findIndex((c) => Math.abs(c.x - x) < 0.01);

/** Plays it as the robot does, with the option to change its mind on a frame. */
function play(game: Game, seconds = 400, change?: (game: Game, d: ReturnType<typeof decide>) => ReturnType<typeof decide>, hopHeld = true) {
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !game.sim.flags.has('goal'); frame++) {
    let d = decide(game, olympia);
    if (change) d = change(game, d);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
}

/** Runs the way he is told until something stops him: the ball, say. */
function runInto(sim: Sim, dir: 1 | -1, seconds = 10): void {
  let x = sim.curr.x;
  for (let i = 0; i < seconds / STEP; i++) {
    sim.step({ ...idle, x: dir });
    if (i > 30 && Math.abs(sim.curr.x - x) < 1e-4) break;
    x = sim.curr.x;
  }
}

/** Climbs whatever he holds, pushing up, until he is on his feet again. */
function climbUp(sim: Sim): void {
  for (let i = 0; i < 12 / STEP && sim.curr.mode !== 'free'; i++) sim.step({ ...idle, y: 1 });
  run(sim, 0.3);
}

describe('Äventyr 2, Kapitel 4: Olympia', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the steps to the trail at ${fps} Hz, doing every puzzle, and the story is told in order`, () => {
      const result = playThrough(fps, olympia, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(olympia.checkpoints!.length - 1);
      expect(result.flags).toEqual(expect.arrayContaining(PUZZLES));
      expect(result.said).toEqual(SAID);
      // It jumps every ball, reads the drops' shadows, and never falls in.
      expect(result.bowled).toBe(0);
      expect(result.knocks).toBe(0);
      expect(result.bubbles).toBe(0);
    });
  }

  it('the robot leaves no trail candy behind', () => {
    const game = new Game(olympia);
    play(game);
    expect(game.sim.flags.has('goal')).toBe(true);
    const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
    expect(missed.map((i) => `${olympia.candy[i]!.x},${olympia.candy[i]!.y}`)).toEqual([]);
    expect(olympia.candy.length).toBeGreaterThanOrEqual(80);
  });

  it('on Lugnt it is played by running and Använd: the balls and the drops miss a runner, and Hoppa is never needed', () => {
    const game = new Game(olympia, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, olympia);
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect([...game.sim.flags]).toEqual(expect.arrayContaining(PUZZLES));
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
    expect(game.sim.bowled).toBe(0);
    expect(hops).toBe(0);
    expect(game.sim.collected.every(Boolean)).toBe(true);
  });

  it('keeps Klonk out of reach, a friend ahead of him, through every puzzle and the free kick', () => {
    for (const options of [{}, simOptions(settingsFor('lugnt'))]) {
      const game = new Game(olympia, options);
      let nearest = Infinity;
      const step = game.sim.step.bind(game.sim);
      game.sim.step = (input) => {
        step(input);
        const ghost = game.sim.ghost;
        if (ghost && !ghost.gone) nearest = Math.min(nearest, Math.hypot(ghost.x - game.sim.curr.x, ghost.y - game.sim.curr.y));
      };
      play(game);
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(nearest).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    }
    for (const [i] of olympia.checkpoints!.entries()) {
      const sim = new Sim(olympia, {}, { checkpoint: i });
      if (sim.ghost && !sim.ghost.gone) expect(Math.hypot(sim.ghost.x - sim.curr.x, sim.ghost.y - sim.curr.y), `checkpoint ${i}`).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    }
    for (const perch of olympia.ghost!) expect(perch.catch).toBeUndefined();
  });

  describe('Trappan och staketet', () => {
    it('comes down soft steps to a fence higher than a jump, with a net up its near side and one down its far side', () => {
      for (let x = -2.9; x < 15; x += 0.1) expect(heightAt(olympia, x) - heightAt(olympia, x + 0.1)).toBeLessThan(FALL_LIMIT);
      const top = heightAt(olympia, fenceUp.x + 0.65);
      expect(top - heightAt(olympia, fenceUp.x - 0.5)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      expect(top - heightAt(olympia, fenceDown.x + 0.5)).toBeGreaterThan(FALL_LIMIT);
      expect([fenceUp.top, fenceDown.top]).toEqual([top, top]);
      expect([fenceUp.bottom, fenceDown.bottom]).toEqual([0, 0]);
      expect(fenceUp.exit).toBe(1);
      expect(fenceDown.exit).toBeUndefined();
    });

    it('he climbs the near side, sees the pitch in a flash from the top, and slides down the far side', () => {
      const sim = new Sim(olympia, {}, { checkpoint: 0 });
      run(sim, 0.2);
      for (let i = 0; i < 10 / STEP && sim.curr.mode !== 'climb'; i++) sim.step({ ...idle, x: 1 });
      expect(sim.curr.mode).toBe('climb');
      for (let i = 0; i < 10 / STEP && sim.curr.mode !== 'free'; i++) sim.step({ ...idle, x: 1 });
      run(sim, 0.3);
      expect(sim.curr.y).toBeCloseTo(fenceUp.top, 1);
      expect(sim.flags.has('beat:ol:top')).toBe(true);
      // At the top, Använd slides him down the far side, never back.
      expect(sim.curr.verb).toBe('slide');
      use(sim);
      run(sim, 1.2);
      expect(sim.curr.x).toBeCloseTo(fenceDown.x, 1);
      expect(sim.curr.y).toBeCloseTo(0, 2);
      expect(sim.bubbles).toBe(0);
      expect(olympia.storm!.flybys!.find((f) => f.on === 'beat:ol:top')?.who).toBe('lillgubbe');
    });
  });

  describe('Bollarna i blåsten', () => {
    const rollers = olympia.rollers!;

    it('are footballs the wind rolls from behind him over level, whole turf, faster than he runs, each low enough to jump', () => {
      expect(olympia.storm!.rollers).toBe('football');
      expect(rollers.length).toBe(3);
      for (const r of rollers) {
        expect(r.to.x).toBeGreaterThan(r.from.x);
        expect(r.speed).toBeGreaterThan(RUN_SPEED * 2);
        // Over a ball's top, with room for his legs, at less than a held jump's height.
        expect(2 * r.radius + ROLLER_REACH).toBeLessThan(JUMP_APEX + 0.3);
        expect(r.needs).toBe('beat:ol:wind');
        expect(r.until).toBe('beat:ol:phew');
        for (let x = r.from.x; x <= r.to.x + 3.4; x += 0.1) expect(heightAt(olympia, x), `the turf at ${x.toFixed(1)}`).toBe(r.from.y);
      }
      // A big candy in the middle of the stretch: a ball that bowls him over takes him back no further.
      expect(olympia.checkpoints!.some((c) => c.x > rollers[0]!.from.x + 5 && c.x < rollers[0]!.to.x - 5)).toBe(true);
      // They set off from the bag at the fence's foot once he is well past it, the first a second after the beat
      // that shows them: never at his feet.
      const wind = olympia.beats!.find((b) => b.id === 'ol:wind')!;
      expect(wind.at! - rollers[0]!.from.x).toBeGreaterThan(3);
      expect(Math.min(...rollers.map((r) => r.first))).toBeGreaterThanOrEqual(1);
      expect(olympia.decor).toContainEqual(expect.objectContaining({ look: 'football', at: rollers[0]!.from }));
    });

    it('one that reaches him standing still bowls him into the glitter bubble, back to the last big candy', () => {
      const middle = checkpoint(40.6);
      const sim = new Sim(olympia, {}, { checkpoint: middle, flags: ['beat:ol:wind'] });
      run(sim, 0.5);
      expect(sim.bowled).toBe(0);
      for (let i = 0; i < 6 / STEP && sim.bowled === 0; i++) sim.step(idle);
      expect(sim.bowled).toBe(1);
      run(sim, 0.1);
      expect(sim.curr.mode).toBe('bubble');
      run(sim, 1.2);
      expect(sim.curr.mode).toBe('free');
      expect(sim.curr.x).toBeCloseTo(olympia.checkpoints![middle]!.x, 1);
      expect(sim.flags.has('beat:ol:phew')).toBe(false);
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('Bollen i målet', () => {
    it('is a goalmouth too wide to jump, where the ball floats with its top at his feet, a hop from each side', () => {
      expect(puddle.to - puddle.from).toBeGreaterThan(RUNNING_JUMP_REACH + 1);
      expect(last.y + ball.height).toBeCloseTo(heightAt(olympia, puddle.from - 0.1), 5);
      expect(last.y + ball.height).toBeCloseTo(heightAt(olympia, puddle.to + 0.1), 5);
      expect(last.x - ball.width / 2 - puddle.from).toBeLessThanOrEqual(1.5);
      expect(puddle.to - (last.x + ball.width / 2)).toBeLessThanOrEqual(1.5);
      // A football: a ball one and a half Elofs high, kicked with Sparka.
      expect(ball).toMatchObject({ look: 'football', width: 1.5, height: 1.5, verb: 'push', word: 'olKick' });
      expect((sv.verbs as Record<string, string>).olKick).toBe('Sparka');
      // It floats mostly under water.
      const water = olympia.water!.find((w) => w.from <= puddle.from && w.to >= puddle.to)!;
      expect(last.y).toBeLessThan(water.y);
      // Every marked jump over the goalmouth waits for it.
      const over = olympia.jumps!.filter((j) => j.at.x > puddle.from - 1 && j.at.x < puddle.to);
      expect(over.length).toBe(2);
      for (const j of over) expect(j.needs).toBe(ball.id);
      // The small goal stands beyond it, its mouth towards him.
      expect(olympia.storm!.buildings!.some((b) => b.kind === 'goal' && b.x >= puddle.to && b.x - puddle.to < 3)).toBe(true);
    });

    it('stops him when he runs at it, three kicks put it in the water, and he hops over on it into the goal', () => {
      expect(ball.height).toBeGreaterThan(LEDGE_REACH);
      const sim = new Sim(olympia, {}, { checkpoint: checkpoint(64) });
      run(sim, 0.2);
      const state = () => sim.movers.find((m) => m.def.id === ball.id)!;
      for (let push = 1; push < ball.stops.length; push++) {
        runInto(sim, 1);
        expect(sim.curr.y, `kick ${push}`).toBeCloseTo(heightAt(olympia, sim.curr.x), 2);
        expect(sim.curr.x, `kick ${push}`).toBeLessThan(state().x - ball.width / 2);
        expect(sim.curr.verb, `kick ${push}`).toBe('push');
        expect(sim.curr.word, `kick ${push}`).toBe('olKick');
        use(sim);
        run(sim, 0.7);
        expect(state().stop).toBe(push);
      }
      expect(sim.flags.has(`placed:${ball.id}`)).toBe(true);
      expect(sim.said).toContain('ol:splash');
      leap(sim, 1, puddle.from - 0.35);
      expect(Math.abs(sim.curr.x - last.x)).toBeLessThan(ball.width / 2);
      expect(sim.curr.y).toBeCloseTo(last.y + ball.height, 2);
      leap(sim, 1, last.x + ball.width / 2 - 0.35);
      expect(sim.curr.x).toBeGreaterThan(puddle.to);
      run(sim, 1.5, { x: 1 });
      expect(sim.said).toContain('ol:in-goal');
      expect(sim.bubbles).toBe(0);
    });

    it('goes home again when he leaves it half kicked, so nothing is ever stuck', () => {
      const sim = new Sim(olympia, {}, { checkpoint: checkpoint(64) });
      run(sim, 0.2);
      runInto(sim, 1);
      use(sim);
      run(sim, 0.7);
      const state = () => sim.movers.find((m) => m.def.id === ball.id)!;
      expect(state().stop).toBe(1);
      expect(walkTo(sim, state().x - 11, 30)).toBe(true);
      run(sim, 1);
      expect(state().stop).toBe(0);
      expect(state().x).toBeCloseTo(ball.stops[0]!.x, 3);
    });
  });

  describe('Nätet och ribban', () => {
    it('the net begins out of reach of his feet, and the bar is far out of a jump\'s reach from the turf under it', () => {
      const ground = heightAt(olympia, net.x);
      expect(net.bottom - ground).toBeGreaterThan(0.3);
      expect(net.bottom - ground).toBeLessThan(JUMP_APEX);
      expect(net.top).toBe(crossbar.y);
      expect(net.exit).toBe(-1);
      // Its top steps him onto the bar's far end.
      expect(Math.abs(net.x - 0.65 - crossbar.x)).toBeLessThanOrEqual(crossbar.width / 2);
      for (let x = crossbar.x - crossbar.width / 2; x <= crossbar.x + crossbar.width / 2; x += 0.1) {
        expect(crossbar.y - heightAt(olympia, x)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH + LEDGE_GIVE);
      }
      // It is the small goal's top.
      const goal = olympia.storm!.buildings!.find((b) => b.kind === 'goal')!;
      expect(goal.x).toBeCloseTo(crossbar.x - crossbar.width / 2, 5);
      expect(goal.width).toBeCloseTo(crossbar.width, 5);
    });

    it('a held jump takes hold of the net; up it, along the bar to the lookout with every heart, and a slide down again', () => {
      const sim = new Sim(olympia, {}, { checkpoint: checkpoint(89.4), placed: [ball.id], flags: [`placed:${ball.id}`] });
      run(sim, 0.2);
      expect(walkTo(sim, net.x)).toBe(true);
      // Walking under it, the tell is out of reach.
      expect(sideTaken(sim, crossbar.x - 4, net.x + 0.5).taken).toBe(0);
      sim.step({ ...idle, hop: true, hopHeld: true, y: 1 });
      for (let i = 0; i < 2 / STEP && sim.curr.mode !== 'climb'; i++) sim.step({ ...idle, hopHeld: true, y: 1 });
      expect(sim.curr.mode).toBe('climb');
      climbUp(sim);
      expect(sim.curr.y).toBeCloseTo(crossbar.y, 1);
      expect(walkTo(sim, crossbar.x - crossbar.width / 2 + 0.8)).toBe(true);
      expect(sim.flags.has('ol:lookout')).toBe(true);
      expect(sim.said).toContain('ol:lookout');
      expect(walkTo(sim, net.x - 0.65)).toBe(true);
      expect(sim.curr.verb).toBe('slide');
      use(sim);
      run(sim, 1.5);
      expect(sim.curr.y).toBeCloseTo(0, 2);
      expect(sideTaken(sim, crossbar.x - 4, net.x + 0.5)).toEqual({ taken: 10, of: 10 });
      expect(sim.bubbles).toBe(0);
    });

    it('each way begins with a heart: its tell, in sight from the trail', () => {
      // Side candy is drawn heart, lollipop, heart, by its place in the list (src/render/candy.ts).
      const side = olympia.side!;
      expect(side.findIndex((c) => Math.abs(c.x - net.x) < 0.01) % 2).toBe(0);
      expect(side.findIndex((c) => c.after?.startsWith('ol:target-')) % 2).toBe(0);
    });
  });

  describe('Hörnflaggan och bänkarna', () => {
    it('the corner flag snaps by the pitch, and the benches pour in two runs with a dry big candy between', () => {
      expect(olympia.decor!.some((d) => d.look === 'flag')).toBe(true);
      const drips = olympia.drips!;
      expect(drips.length).toBe(6);
      const dry = olympia.checkpoints!.find((c) => c.x > drips[2]!.at.x && c.x < drips[3]!.at.x)!;
      expect(dry).toBeDefined();
      for (const d of drips) expect(Math.abs(d.at.x - dry.x)).toBeGreaterThan(DROP_RADIUS + 1);
      for (const d of drips) expect(heightAt(olympia, d.at.x)).toBe(d.at.y);
    });
  });

  describe('Bertils frispark', () => {
    it('the flooded centre circle is wider than any jump, and his kick carries Elof over it in a great arc into the far goal', () => {
      expect(circle.to - circle.from).toBeGreaterThan(RUNNING_JUMP_REACH * 5);
      expect(kick.from.x).toBeLessThan(circle.from);
      expect(kick.to.x).toBeGreaterThan(circle.to);
      expect(kick.look).toBe('football');
      expect(kick.rise).toBeGreaterThanOrEqual(4);
      expect(heightAt(olympia, kick.from.x)).toBe(kick.from.y);
      expect(heightAt(olympia, kick.to.x)).toBe(kick.to.y);
      const far = olympia.storm!.buildings!.filter((b) => b.kind === 'goal').find((b) => b.x > circle.to)!;
      expect(kick.to.x).toBeGreaterThan(far.x);
      expect(kick.to.x).toBeLessThan(far.x + far.width!);
      expect(board).toMatchObject({ verb: 'take', word: 'olRideBall', needs: 'ol:kick-ready', ride: 'kick', at: kick.from });
      expect(call).toMatchObject({ verb: 'call', word: 'callBertil', look: 'sign' });
    });

    it('Ropa på Bertil, a short held moment while he lays the ball ready, and Elof climbs on when he wants', () => {
      const sim = new Sim(olympia, {}, { checkpoint: checkpoint(117), placed: [ball.id], flags: [`placed:${ball.id}`] });
      run(sim, 0.2);
      for (let i = 0; i < 20 / STEP && sim.curr.verb !== 'call'; i++) sim.step({ ...idle, x: 1 });
      expect(sim.curr.word).toBe('callBertil');
      expect(sim.said).toContain('ol:bertil-here');
      use(sim);
      run(sim, 0.4);
      // He stands and watches.
      expect(sim.held).toBe(true);
      run(sim, 0.9);
      expect(sim.held).toBe(false);
      expect(sim.flags.has('ol:kick-ready')).toBe(true);
      expect(sim.said.slice(-1)).toEqual(['ol:kick-ready']);
      // The ball waits for him: nothing starts until he chooses.
      run(sim, 2);
      expect(sim.curr.mode).toBe('free');
      for (let i = 0; i < 4 / STEP && sim.curr.verb !== 'take'; i++) sim.step({ ...idle, x: 0.5 });
      expect(sim.curr.word).toBe('olRideBall');
      use(sim);
      expect(sim.curr.mode).toBe('ride');
      run(sim, kick.time + 0.2);
      expect(sim.curr.mode).toBe('free');
      expect(sim.curr.x).toBeCloseTo(kick.to.x, 1);
      expect(sim.bubbles).toBe(0);
      run(sim, 0.5, { x: 1 });
      expect(sim.said.slice(-4)).toEqual(['ol:fly', 'ol:goal', 'ol:cheer', 'ol:thanks']);
    });

    it('the old trägubbe is seen at the circle, and blown over it ahead of him', () => {
      const oldOne = olympia.decor!.find((d) => d.look === 'tragubbe')!;
      expect(oldOne.until).toBe('beat:ol:old-one');
      expect(oldOne.at.x).toBeLessThan(circle.from);
      const flyby = olympia.storm!.flybys!.find((f) => f.on === 'beat:ol:old-one')!;
      expect(flyby.who).toBe('tragubbe');
      expect(flyby.to.x).toBeGreaterThan(circle.to);
    });
  });

  describe('Skidskyttevallen', () => {
    it('has five black targets, each a cone throw that lets out a heart, and three more when all are white', () => {
      expect(targets.length).toBe(5);
      for (const t of targets) {
        expect(t).toMatchObject({ verb: 'take', word: 'olThrow', extra: true });
        expect(heightAt(olympia, t.at.x)).toBe(t.at.y);
        expect(olympia.side!.filter((c) => c.after === t.id).length).toBe(1);
      }
      expect(olympia.sets).toContainEqual({ flag: 'ol:all-white', when: targets.map((t) => t.id) });
      expect(olympia.side!.filter((c) => c.after === 'ol:all-white').length).toBe(3);
      expect((sv.verbs as Record<string, string>).olThrow).toBe('Kasta kotte');
    });

    it('the robot throws at all five on its way and takes every heart; one who walks past them still gets to the end', () => {
      const game = new Game(olympia, {}, { checkpoint: checkpoint(152.4), placed: [ball.id], flags: [`placed:${ball.id}`, 'ol:bertil', 'ol:kick-ready'] });
      play(game);
      expect(game.sim.flags.has('ol:all-white')).toBe(true);
      const range = olympia.side!.flatMap((c, i) => (c.after?.startsWith('ol:') && c.after !== undefined ? [i] : []));
      expect(range.every((i) => game.sim.collectedSide[i])).toBe(true);
      const past = new Game(olympia, {}, { checkpoint: checkpoint(152.4), placed: [ball.id], flags: [`placed:${ball.id}`] });
      // It never throws, and never walks back to a target it has passed.
      play(past, 200, (g, d) => (g.sim.curr.word === 'olThrow' || d.x < 0 ? { ...d, x: 1, offered: false } : d));
      expect(past.sim.flags.has('goal')).toBe(true);
      expect(targets.some((t) => past.sim.flags.has(t.id))).toBe(false);
      expect(past.sim.collected.every((got, i) => got || olympia.candy[i]!.x < olympia.checkpoints![checkpoint(152.4)]!.x)).toBe(true);
    });
  });

  describe('Elljusspåret', () => {
    it('in a flash the strongest gust takes the little one north, and the old trägubbe follows: Elof reads it before he goes on', () => {
      const gust = olympia.beats!.find((b) => b.id === 'ol:gust')!;
      expect(gust.read).toBe(true);
      expect(gust.at!).toBeLessThan(olympia.goalX);
      expect(gust.at!).toBeGreaterThan(olympia.checkpoints![olympia.checkpoints!.length - 1]!.x);
      const flybys = olympia.storm!.flybys!.filter((f) => f.on === 'beat:ol:gust' || f.on === 'beat:ol:follow');
      expect(flybys.map((f) => f.who)).toEqual(['lillgubbe', 'tragubbe']);
      // North, up over the treetops.
      for (const f of flybys) expect(f.to.y - f.from.y).toBeGreaterThan(10);
      const lines: Record<string, string> = sv.lines;
      expect(lines.olNorth).toBe('Upp mot sjön vid Flärken!');
      expect(olympia.storm).toMatchObject({ rain: 0.85, lightning: 9, rollers: 'football' });
    });
  });

  it('is taken up again at every big candy, and played on to the end without saying anything twice', () => {
    for (let at = 0; at < olympia.checkpoints!.length; at++) {
      const first = new Game(olympia);
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 400 && first.sim.checkpoint < at; frame++) {
        const d = decide(first, olympia);
        first.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
        wasAhead = d.ahead;
        wasOffered = d.offered;
      }
      expect(first.sim.checkpoint).toBe(at);
      // What the save keeps (src/main.ts, writeSave).
      const start: SimStart = {
        checkpoint: first.sim.checkpoint,
        collected: first.sim.collected.flatMap((got, i) => (got ? [i] : [])),
        side: first.sim.collectedSide.flatMap((got, i) => (got ? [i] : [])),
        placed: first.sim.placed,
        flags: [...first.sim.flags],
      };
      const second = new Game(olympia, {}, start);
      expect(second.sim.curr.x).toBeCloseTo(olympia.checkpoints![at]!.x, 1);
      play(second);
      expect(second.sim.flags.has('goal'), `from big candy ${at}, it got to x ${second.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(second.sim.said.filter((id) => first.sim.said.includes(id)), `from big candy ${at}`).toEqual([]);
      expect(second.sim.collected.every(Boolean), `from big candy ${at}`).toBe(true);
      expect(second.sim.bubbles).toBe(0);
      expect(second.sim.bowled).toBe(0);
    }
  });

  it('says what he is doing now all the way, with Bertil as the guide where his help is the next thing to do', () => {
    const game = new Game(olympia);
    const seen: string[] = [];
    play(game, 400, (g, d) => {
      const now = storyContext('olympia', g.sim.flags, g.sim.curr);
      expect(now?.purpose, `at x ${g.sim.curr.x.toFixed(1)}`).toBeTruthy();
      expect(now?.family).toBeTruthy();
      const id = `${now!.id}${now!.guide ? `/${now!.guide}` : ''}`;
      if (seen[seen.length - 1] !== id) seen.push(id);
      return d;
    });
    expect(seen).toEqual([
      'olympiaArrive', 'olympiaFence', 'olympiaTrail', 'olympiaBalls', 'olympiaTrail', 'olympiaKick', 'olympiaHop',
      'olympiaTrail', 'olympiaBenches', 'olympiaTrail', 'olympiaCallBertil/bertil', 'olympiaBoard/bertil', 'olympiaFly/bertil',
      'olympiaStadium', 'olympiaNorth',
    ]);
    // Every purpose and helper the chooser can give has its words.
    for (const x of [0, 12, 30, 66, 76, 84, 100, 118, 130, 160, 176]) {
      for (const flags of [[], ['beat:ol:wind'], [`placed:${ball.id}`], ['ol:bertil'], ['ol:kick'], ['beat:ol:gust']]) {
        const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: 0 });
        expect(words.purposes![purpose], purpose).toBeDefined();
        expect(words.helpers![helper], helper).toBeDefined();
      }
    }
  });

  it('has its own words: new keys, short, no digits, every one of them said, and Klonk says only klonk', () => {
    const lines = Object.entries(words.lines);
    for (const [key, text] of lines) {
      expect(key).toMatch(/^ol[A-Z]/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
    }
    const said = new Set(olympia.beats!.map((b) => b.line));
    expect(lines.map(([key]) => key).filter((key) => !said.has(key))).toEqual([]);
    for (const id of Object.keys(words.purposes!)) expect(id).toMatch(/^olympia[A-Z]/);
    for (const id of Object.keys(words.helpers!)) expect(id).toMatch(/^olympia[A-Z]/);
    for (const key of Object.keys(words.verbs!)) expect(key).toMatch(/^ol[A-Z]/);
    const all: Record<string, string> = sv.lines;
    for (const beat of olympia.beats!.filter((b) => b.who === 'spoket')) expect(all[beat.line]).toMatch(/^Klonk(, klonk)?!$/);
    // Bertil calls Elof lillebror, and his free kick is his own.
    expect(all.olBertilReady).toBe('Upp på bollen! Jag skjuter, du flyger!');
    expect(all.olIdea).toBe('Bollar flyter! Bollen kan bära mig.');
  });

  it('is Kapitel 4: after Byn i stormen and before Flärken, Bertil\'s chapter, about as long as the plan says', () => {
    expect(nextAfter('stormbyn')?.id).toBe('olympia');
    expect(nextAfter('olympia')?.id).toBe('flarken');
    expect(AVENTYR2.find((chapter) => chapter.id === 'olympia')).toBe(olympia);
    expect(olympia.goalX).toBeGreaterThanOrEqual(165);
    expect(olympia.goalX).toBeLessThanOrEqual(185);
    expect(olympia.checkpoints!.length).toBeGreaterThanOrEqual(8);
    expect(olympia.checkpoints!.length).toBeLessThanOrEqual(10);
    expect(olympia.place).toBe('garden');
    expect(olympia.coda).toBe('bertil');
    expect(olympia.scenes!.map((scene) => scene.id)).toEqual(['card']);
    expect(sv.end.kickers.olympia).toBe('Äventyr 2 · Kapitel 4');
  });
});
