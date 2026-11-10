import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import '../../src/content/aventyr2/aventyr2';
import { context, stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { flightAt } from '../../src/content/aventyr2/kit';
import { words } from '../../src/content/aventyr2/lines/stormgard';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { FALL_LIMIT, GHOST_CLEARANCE, JUMP_APEX, LEDGE_GIVE, RUNNING_JUMP_REACH } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { SimOptions } from '../../src/sim/types';
import { idle, jump, leap, run, runPast, sideTaken, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 1: Stormgården (src/content/aventyr2/chapters/stormgard.ts). The rules every chapter of the
 * adventure keeps are in ./aventyr2.test.ts; here are this one's own: the gutter, the gusts, the rain barrel and
 * its lid, Bertil's boot, the playhouse and its thought, the hedge, and the two side ways.
 */

/** What the robot does on the way, in the order the story has it. */
const SAID = [
  'sg:moa', 'sg:gutter', 'sg:pumpkin', 'sg:pumpkin-klonk', 'sg:gusts', 'sg:pot-klonk', 'sg:pot',
  'sg:ditch', 'sg:barrel', 'sg:lid', 'sg:bertil-here', 'sg:boot-ready', 'sg:heja', 'sg:thanks',
  'sg:playhouse', 'sg:lonely', 'sg:why', 'sg:flash', 'sg:forest', 'sg:end-klonk',
];
const PUZZLES = ['sg:tap', 'placed:lid', 'sg:bertil', 'sg:boot-ready', 'sg:boot', 'sg:thought', 'goal'];

const ledges = stormgard.ledges!;
const sills = ledges.filter((ledge) => ledge.x < 20);
const planks = ledges.filter((ledge) => ledge.x > 130);
const lid = stormgard.movers!.find((mover) => mover.id === 'lid')!;
const tap = stormgard.spots!.find((spot) => spot.id === 'sg:tap')!;
const hose = stormgard.climbs![0]!;
const trampoline = stormgard.bouncers![0]!;
/** The ditch, read from the water over it. */
const ditch = stormgard.water![0]!;

const standsOn = (sim: Sim, ledge: { x: number; y: number; width: number }): boolean =>
  sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.1 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.2;
const onTheTrail = (sim: Sim): boolean => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(stormgard, sim.curr.x)) < 0.05;
/** Walks on to the right, slowly, as far as an x: off the end of whatever he stands on. */
function stroll(sim: Sim, to: number): void {
  for (let i = 0; i < 30 * 120 && sim.curr.x < to; i++) sim.step({ ...idle, x: 0.5 });
  run(sim, 0.4);
}
/** From the big candy after the gusts: into the barrel's hose, and up it onto the barrel's top. */
function upTheBarrel(sim: Sim): void {
  for (let i = 0; i < 10 * 120 && sim.curr.mode !== 'climb'; i++) sim.step({ ...idle, x: 1 });
  expect(sim.curr.mode).toBe('climb');
  for (let i = 0; i < 6 * 120 && sim.curr.mode !== 'free'; i++) sim.step({ ...idle, x: 1 });
  run(sim, 0.3);
}
/** Taken up at the big candy after the boot ride, as a save would have it. */
const AFTER_BOOT = ['sg:tap', 'placed:lid', 'sg:bertil', 'sg:boot-ready', 'sg:boot'];
const afterBoot = (options: SimOptions = {}) => {
  const sim = new Sim(stormgard, options, { checkpoint: 4, placed: ['lid'], flags: AFTER_BOOT });
  run(sim, 1.2);
  return sim;
};
/** A hop straight up onto the trampoline, steered right once it has bounced him. */
function bounce(sim: Sim): void {
  walkTo(sim, trampoline.x);
  sim.step({ ...idle, hop: true, hopHeld: true });
  for (let i = 0; i < 4 * 120; i++) {
    sim.step({ ...idle, x: sim.bounces > 0 ? 1 : 0, hopHeld: true });
    if (sim.curr.grounded && sim.curr.vy <= 0.01 && i > 20) break;
  }
  run(sim, 0.2);
}

describe('Äventyr 2, Kapitel 1: Stormgården', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the veranda to the hedge at ${fps} Hz, doing every puzzle`, () => {
      const result = playThrough(fps, stormgard, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(stormgard.checkpoints!.length - 1);
      // The tap, the lid it floats up, Bertil called, his boot ready and boarded, the old one's thought.
      expect(result.flags).toEqual(expect.arrayContaining(PUZZLES));
      // What was said, in the story's order.
      expect(result.said).toEqual(SAID);
      // It reads the drops' shadows, waits in each pot's lee, and never falls.
      expect(result.knocks).toBe(0);
      expect(result.blown).toBe(0);
      expect(result.bubbles).toBe(0);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, stormgard, {}, 400);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${stormgard.candy[i]!.x},${stormgard.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(2);
    expect(stormgard.candy.length).toBeGreaterThanOrEqual(80);
  });

  it('on Lugnt it is played by running and Använd: the gusts only slow him, and Hoppa is never needed', () => {
    const game = new Game(stormgard, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, stormgard);
      // On Lugnt it jumps only where something stands in the way that no marked jump covers.
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
    expect(hops).toBe(0);
    expect(game.sim.candyCount).toBe(stormgard.candy.length);
  });

  it('keeps Klonk out of reach, a friend ahead of him, through every puzzle and the boot ride', () => {
    for (const options of [{}, simOptions(settingsFor('lugnt'))]) {
      const game = new Game(stormgard, options);
      let nearest = Infinity;
      const step = game.sim.step.bind(game.sim);
      game.sim.step = (input) => {
        step(input);
        const ghost = game.sim.ghost;
        if (ghost && !ghost.gone) nearest = Math.min(nearest, Math.hypot(ghost.x - game.sim.curr.x, ghost.y - game.sim.curr.y));
      };
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
        const { x, y, ahead, offered } = decide(game, stormgard);
        game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(nearest).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    }
    for (const [checkpoint] of stormgard.checkpoints!.entries()) {
      const sim = new Sim(stormgard, {}, { checkpoint });
      if (sim.ghost && !sim.ghost.gone) expect(Math.hypot(sim.ghost.x - sim.curr.x, sim.ghost.y - sim.curr.y), `checkpoint ${checkpoint}`).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    }
    // In the gusts it is blown into a flowerpot, behind the path, in one of the pots' lee.
    const pot = stormgard.ghost!.find((perch) => perch.z !== undefined)!;
    expect(stormgard.gusts![0]!.shelters).toContain(pot.at.x);
  });

  describe('Regntunnan', () => {
    it('the ditch is wider than a running jump, its lid lies at the bottom, and the barrel is in the way', () => {
      expect(ditch.to - ditch.from).toBeGreaterThan(RUNNING_JUMP_REACH + 2);
      expect(lid.stops[0]!.y).toBeCloseTo(heightAt(stormgard, (ditch.from + ditch.to) / 2), 5);
      // At its last stop the lid lies level with the lawn, and longer than the ditch, on both banks.
      const last = lid.stops[lid.stops.length - 1]!;
      expect(last.y + lid.height).toBeCloseTo(heightAt(stormgard, ditch.from - 0.5), 5);
      expect(last.x - lid.width / 2).toBeLessThan(ditch.from);
      expect(last.x + lid.width / 2).toBeGreaterThan(ditch.to);
      // Its water's hands lift it: Använd never moves it.
      expect(lid.on).toBe(tap.id);
      // The hose hangs where walking into the barrel takes hold of it, and its top is the tap's.
      expect(heightAt(stormgard, hose.x + 0.4)).toBeCloseTo(hose.top, 5);
      expect(tap.at.y).toBe(hose.top);
      expect(tap.word).toBe('sgTurnTap');
      // Walking off the barrel's far side is a soft landing.
      expect(hose.top - heightAt(stormgard, ditch.from - 0.5)).toBeLessThan(FALL_LIMIT);
    });

    it('before the tap a running jump over the ditch ends in the glitter bubble, back on the near side', () => {
      const sim = new Sim(stormgard, {}, { checkpoint: 2 });
      run(sim, 0.5);
      upTheBarrel(sim);
      stroll(sim, 83.9);
      runPast(sim, 84.4);
      leap(sim, 1, ditch.from - 0.15);
      run(sim, 1.5);
      expect(sim.bubbles).toBe(1);
      expect(sim.curr.x).toBeLessThan(ditch.from);
      expect(sim.flags.has('placed:lid')).toBe(false);
    });

    it('up the hose, Vrid på kranen: the lid floats up, and he walks over it', () => {
      const sim = new Sim(stormgard, {}, { checkpoint: 2 });
      run(sim, 0.5);
      upTheBarrel(sim);
      expect(sim.curr.y).toBeCloseTo(hose.top, 1);
      expect(sim.curr.verb).toBe('turn');
      expect(sim.curr.word).toBe('sgTurnTap');
      sim.step({ ...idle, act: true });
      expect(sim.flags.has(tap.id)).toBe(true);
      run(sim, 1);
      expect(sim.flags.has('placed:lid')).toBe(true);
      runPast(sim, ditch.to + 2);
      run(sim, 0.3);
      expect(onTheTrail(sim)).toBe(true);
      expect(sim.bubbles).toBe(0);
    });

    for (const [style, options] of [['Äventyr', {}], ['Lugnt', simOptions(settingsFor('lugnt'))]] as const) {
      it(`on ${style}, down past the barrel before the tap, the watering can is the way back up to it`, () => {
        const sim = new Sim(stormgard, options, { checkpoint: 2 });
        run(sim, 0.5);
        upTheBarrel(sim);
        stroll(sim, 84.4);
        expect(sim.curr.y).toBeCloseTo(0, 1);
        if (style === 'Äventyr') {
          for (let i = 0; i < 4 * 120 && !(sim.curr.y > 1 && sim.curr.grounded); i++) sim.step({ ...idle, x: -1 });
          run(sim, 0.3);
          walkTo(sim, 83);
          jump(sim, -1);
        } else {
          for (let i = 0; i < 6 * 120 && !(sim.curr.y > 3 && sim.curr.grounded); i++) sim.step({ ...idle, x: -1 });
          run(sim, 0.3);
        }
        expect(sim.curr.y).toBeCloseTo(hose.top, 1);
        for (let i = 0; i < 3 * 120 && sim.curr.verb !== 'turn'; i++) sim.step({ ...idle, x: -0.4 });
        expect(sim.curr.verb).toBe('turn');
        expect(sim.bubbles).toBe(0);
      });
    }
  });

  describe('Bertils stövelbåt', () => {
    it('Ropa på Bertil, a short held moment while he lays his boot on the water, and Elof steps in when he wants', () => {
      const sim = new Sim(stormgard, {}, { checkpoint: 3, placed: ['lid'], flags: ['sg:tap', 'placed:lid'] });
      run(sim, 0.5);
      for (let i = 0; i < 20 * 120 && sim.curr.verb !== 'call'; i++) sim.step({ ...idle, x: 1 });
      expect(sim.curr.word).toBe('callBertil');
      expect(sim.said).toContain('sg:bertil-here');
      sim.step({ ...idle, act: true });
      run(sim, 0.5);
      // He stands and watches.
      expect(sim.held).toBe(true);
      run(sim, 0.9);
      expect(sim.held).toBe(false);
      expect(sim.flags.has('sg:boot-ready')).toBe(true);
      expect(sim.said.slice(-1)).toEqual(['sg:boot-ready']);
      // The boot waits for him: nothing starts until he chooses.
      run(sim, 2);
      expect(sim.curr.mode).toBe('free');
      expect(sim.curr.word).toBe('sgBoardBoot');
      sim.step({ ...idle, act: true });
      expect(sim.curr.mode).toBe('ride');
      run(sim, stormgard.rides![0]!.time + 0.2);
      expect(sim.curr.mode).toBe('free');
      expect(sim.curr.x).toBeCloseTo(stormgard.rides![0]!.to.x, 1);
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('the playhouse and the hedge', () => {
    it('a flash shows the old trägubbe on the roof leaping away, and its thought waits on the ridge', () => {
      const ridge = stormgard.spots!.find((spot) => spot.id === 'sg:thought')!;
      expect(heightAt(stormgard, ridge.at.x)).toBeCloseTo(ridge.at.y, 5);
      expect(stormgard.decor).toContainEqual(expect.objectContaining({ look: 'tragubbe', at: ridge.at, until: 'beat:sg:playhouse' }));
      expect(stormgard.storm!.flybys!.map((flyby) => [flyby.on, flyby.who])).toEqual([['beat:sg:playhouse', 'tragubbe'], ['beat:sg:flash', 'lillgubbe']]);
      const clue = stormgard.thoughtClues![0]!;
      expect(clue).toMatchObject({ picture: 'lonely-figure', after: ridge.id });
      expect(Math.abs(clue.at.x - ridge.at.x)).toBeLessThan(1);
      // The old one is seen before the trail climbs the playhouse; the little one flies before the hedge.
      const beat = (id: string) => stormgard.beats!.find((b) => b.id === id)!;
      expect(beat('sg:playhouse').at!).toBeLessThan(planks[0]!.x);
      expect(stormgard.scenes!.find((scene) => scene.id === 'haecken')!.at!).toBeLessThan(stormgard.goalX);
    });

    it('at the hedge he stops and watches the little one tumble slowly over it, near the path and lit', () => {
      // Olov, 9 November 2026: "När lillgubben flyger över häcken i slutet av kapitlet är det svårt att se honom. Det ska
      // synas tydligt."
      const flight = stormgard.storm!.flybys!.find((flyby) => flyby.on === 'beat:sg:flash')!;
      expect(flight.seconds).toBeGreaterThanOrEqual(4.5);
      expect(flight.z!).toBeGreaterThan(-1.5);
      expect(flight.size!).toBeGreaterThan(1.2);
      expect(flight.lit?.length).toBeGreaterThan(0);
      // Over the hedge, from in front of it.
      expect(flight.from.x).toBeLessThan(stormgard.surfaces!.find((surface) => surface.kind === 'hedge')!.from);
      expect(flight.to.x).toBeGreaterThan(stormgard.goalX);
      // Over the hedge's tall end where the ground ends, and never into it.
      const end = stormgard.ground[stormgard.ground.length - 1]!;
      for (let k = 0; k <= 1; k += 0.01) {
        const at = flightAt(flight, k);
        if (at.x > end.x - 0.6) expect(at.y, `at ${k.toFixed(2)} of the way`).toBeGreaterThan(end.y + 0.5);
      }
      const moment = stormgard.scenes!.find((scene) => scene.id === 'haecken')!;
      expect(moment.hold).toBe(true);
      expect(moment.on).toBeUndefined();
      expect(moment.cues).toContainEqual({ at: 0.8, flag: 'sg:flight' });
      expect(stormgard.beats!.find((beat) => beat.id === 'sg:flash')!.on).toBe('sg:flight');
      expect(moment.seconds).toBeGreaterThanOrEqual(flight.seconds - 0.5);
      // Its camera follows him: the shot's last key moves on along his way, as long as his flight takes.
      const shots = moment.stage!.shots!;
      expect(shots[shots.length - 1]!.x - shots[0]!.x).toBeGreaterThan((flight.to.x - flight.from.x) / 2);
      expect(shots[shots.length - 1]!.move!).toBeGreaterThanOrEqual(flight.seconds - 1);
      // Played: the robot is held there for the whole flight, and goes on to the forest after.
      const game = new Game(stormgard, {}, { checkpoint: 4, placed: ['lid'], flags: AFTER_BOOT });
      let heldFor = 0;
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 120 && !game.sim.flags.has('goal'); frame++) {
        const { x, y, ahead, offered } = decide(game, stormgard);
        game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
        if (game.sim.sceneFrame?.id === 'haecken' && game.sim.held) heldFor += 1 / 60;
      }
      expect(game.sim.flags.has('goal'), `he got to ${game.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(heldFor).toBeGreaterThanOrEqual(moment.seconds - 0.1);
      expect(game.sim.bubbles).toBe(0);
    });

    it('resumes at the big candy after the boot, and plays on to the forest without repeating anything', () => {
      // Played by the robot as far as that big candy, then taken up from what a save keeps there.
      const first = new Game(stormgard);
      let wasAhead = false;
      let wasOffered = false;
      for (let frame = 0; frame < 60 * 400 && first.sim.checkpoint < 4; frame++) {
        const { x, y, ahead, offered } = decide(first, stormgard);
        first.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
      expect(first.sim.checkpoint).toBe(4);
      const collected = first.sim.collected.flatMap((got, i) => (got ? [i] : []));
      const game = new Game(stormgard, {}, { checkpoint: 4, collected, placed: first.sim.placed, flags: [...first.sim.flags] });
      expect(game.sim.curr.x).toBe(stormgard.checkpoints![4]!.x);
      wasAhead = false;
      wasOffered = false;
      for (let frame = 0; frame < 60 * 200 && !game.sim.flags.has('goal'); frame++) {
        const { x, y, ahead, offered } = decide(game, stormgard);
        game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(game.sim.checkpoint).toBe(stormgard.checkpoints!.length - 1);
      expect(game.sim.said).toEqual(SAID.slice(SAID.indexOf('sg:playhouse')));
      expect(game.sim.bubbles).toBe(0);
    });
  });

  it('frames the little one before its flight is announced, after the previous line is finished', () => {
    const sim = new Sim({ ...stormgard, spawn: { x: 176.7, y: 0 } });
    // Approach while a previous line still owns the floor: neither flight nor camera may jump ahead.
    for (let i = 0; i < 120; i++) sim.step({ ...idle, x: 1, talking: true });
    expect(sim.flags.has('beat:sg:flash')).toBe(false);
    expect(sim.sceneFrame).toBeNull();
    for (let i = 0; i < 360 && !sim.flags.has('beat:sg:flash'); i++) sim.step({ ...idle, x: 1, talking: false });
    expect(sim.flags.has('beat:sg:flash')).toBe(true);
    expect(sim.sceneFrame?.id).toBe('haecken');
    expect(sim.sceneFrame!.seconds).toBeGreaterThanOrEqual(0.79);
    expect(sim.sceneFrame!.seconds).toBeLessThan(0.9);
    expect(sim.held).toBe(true);
  });

  describe('the side ways', () => {
    it('the window sills: up from the deck, dry over the first run of drops, and down in the dry place', () => {
      for (const atRun of [false, true]) {
        const sim = new Sim(stormgard);
        run(sim, 0.3);
        if (atRun) {
          leap(sim, 1, 4);
          leap(sim, 1, 5.7);
          leap(sim, 1, 8.1);
          expect(standsOn(sim, sills[2]!)).toBe(true);
          runPast(sim, 14.4);
        } else {
          walkTo(sim, 4.6);
          jump(sim);
          expect(standsOn(sim, sills[0]!)).toBe(true);
          walkTo(sim, 5.8);
          jump(sim, 1);
          expect(standsOn(sim, sills[1]!)).toBe(true);
          walkTo(sim, 8.2);
          jump(sim, 1);
          expect(standsOn(sim, sills[2]!)).toBe(true);
          // Standing over the drops a while: none reaches him up here.
          run(sim, 6);
          expect(sim.knocks).toBe(0);
          stroll(sim, 12.4);
          expect(standsOn(sim, sills[3]!)).toBe(true);
          stroll(sim, 14.4);
        }
        run(sim, 0.3);
        expect(onTheTrail(sim)).toBe(true);
        expect(sideTaken(sim, 0, 20)).toEqual({ taken: 6, of: 6 });
        expect(sim.bubbles).toBe(0);
        expect(sim.knocks).toBe(0);
      }
    });

    it('the trampoline: its bounce is the only way onto the planks, and they lead to the hearts over the roof', () => {
      const sim = afterBoot();
      bounce(sim);
      expect(sim.bounces).toBe(1);
      expect(standsOn(sim, planks[0]!)).toBe(true);
      for (const [i, from] of [136.8, 138.8, 141].entries()) {
        walkTo(sim, from);
        jump(sim, 1);
        expect(standsOn(sim, planks[i + 1]!), `plank ${i + 1}`).toBe(true);
      }
      expect(sim.flags.has('sg:lookout')).toBe(true);
      // Off the plank onto the roof, over the ridge, and off the far eaves onto the lawn.
      stroll(sim, 152);
      expect(onTheTrail(sim)).toBe(true);
      expect(sim.flags.has('sg:thought')).toBe(true);
      expect(sideTaken(sim, 133, 146)).toEqual({ taken: 9, of: 9 });
      expect(sim.bubbles).toBe(0);
    });

    it('each way begins with a heart: its tell, in sight from the trail', () => {
      // Side candy is drawn heart, lollipop, heart, by its place in the list (src/render/candy.ts).
      const side = stormgard.side!;
      const first = (from: number, to: number) => side.findIndex((c) => c.x >= from && c.x <= to);
      expect(first(0, 20) % 2).toBe(0);
      expect(first(133, 146) % 2).toBe(0);
      expect(side[first(133, 146)]!.x).toBeCloseTo(trampoline.x, 0);
    });

    it('the planks are clearly out of a jump\'s reach from the trail under them, and the trampoline\'s heart too', () => {
      for (let x = 133; x <= 149; x += 0.05) {
        const floor = heightAt(stormgard, x);
        for (const plank of planks.filter((p) => Math.abs(x - p.x) <= p.width / 2 + 0.2)) {
          expect(plank.y - floor, `the plank at ${plank.x}, over ${x.toFixed(2)}`).toBeGreaterThanOrEqual(JUMP_APEX + LEDGE_GIVE + 0.1);
        }
      }
      // And a jump from the ridge, the highest place on the trail, falls short of the hearts' plank.
      expect(planks[3]!.y - heightAt(stormgard, 145.6)).toBeGreaterThan(JUMP_APEX + LEDGE_GIVE);
      expect(heightAt(stormgard, trampoline.x)).toBe(0);
    });
  });

  describe('its words', () => {
    it('are short, plain and new, and Klonk says only klonk', () => {
      for (const [key, text] of Object.entries(words.lines)) {
        expect(key.startsWith('sg'), key).toBe(true);
        expect(text.length, key).toBeLessThanOrEqual(40);
        expect(text, key).not.toMatch(/\d/);
      }
      const lines: Record<string, string> = sv.lines;
      for (const beat of stormgard.beats!) {
        expect(lines[beat.line], beat.line).toBe(words.lines[beat.line]);
        if (beat.who === 'spoket') expect(lines[beat.line]).toMatch(/^Klonk(, klonk)?!$/);
      }
      const verbs: Record<string, string> = sv.verbs;
      for (const spot of stormgard.spots!) if (spot.word) expect(verbs[spot.word], spot.word).toBeTruthy();
    });

    it('"Just nu" follows the story: veranda, gusts, tap, lid, Bertil, boot, playhouse, thought, hedge', () => {
      const at = (x: number, ...flags: string[]) => storyContext('stormgard', new Set(flags), { x, y: 0 })?.purpose;
      const copy = (id: string) => words.purposes![id]!.purpose;
      expect(at(1)).toBe(copy('sgVeranda'));
      expect(at(50)).toBe(copy('sgWind'));
      expect(at(78)).toBe(copy('sgTap'));
      expect(at(86, 'sg:tap')).toBe(copy('sgLid'));
      expect(at(100, 'sg:tap')).toBe(copy('sgBertilCall'));
      expect(at(104, 'sg:tap', 'sg:bertil')).toBe(copy('sgBoard'));
      expect(at(115, 'sg:tap', 'sg:bertil', 'sg:boot')).toBe(copy('sgBoot'));
      expect(at(133, 'sg:boot', 'beat:sg:playhouse')).toBe(copy('sgPlayhouse'));
      expect(at(147, 'sg:boot', 'sg:thought')).toBe(copy('sgLonely'));
      expect(at(185, 'sg:thought', 'beat:sg:flash')).toBe(copy('sgHedge'));
      // Every purpose and helper the chooser can give has its words.
      for (const x of [0, 30, 50, 78, 86, 100, 104, 115, 130, 147, 185]) {
        for (const flags of [[], ['sg:tap'], ['sg:tap', 'sg:bertil'], ['sg:boot'], ['beat:sg:playhouse'], ['sg:thought'], ['beat:sg:flash']]) {
          const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: 0 });
          expect(words.purposes![purpose], purpose).toBeDefined();
          expect(words.helpers![helper], helper).toBeDefined();
        }
      }
    });
  });
});
