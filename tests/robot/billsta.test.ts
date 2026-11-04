import { describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { billsta, context } from '../../src/content/aventyr2/chapters/billsta';
import { words } from '../../src/content/aventyr2/lines/billsta';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { JUMP_APEX, LEDGE_REACH, RUNNING_JUMP_REACH } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { Ledge, SimStart } from '../../src/sim/types';
import { jump, leap, run, runPast, sideTaken, use, walkTo } from '../sim/drive';
import { decide, heightAt, playThrough } from './robot';

/**
 * Äventyr 2, Kapitel 7: Billsta (docs/aventyr-2.md). tests/robot/aventyr2.test.ts holds it to the rules every chapter
 * of the adventure keeps; here are its own: the car on the road and the lit window from the start, morfar's ladder
 * over the ditch, mormor's lantern and the barn's door, the loft and the roof, the soft drop behind the house, the
 * brook's stones, Klonk's seesaw over the deep brook, Billaberget's boulders and gusts, the flash from the brow at the end, its two second ways, and a game taken up at every big candy.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

/** Everything said on the way, in order, when the robot plays it from the start. */
const SAID = [
  'bi:arrive', 'bi:klonk', 'bi:window', 'bi:window-klonk',
  'bi:new-trail', 'bi:ditch', 'bi:morfar-here', 'bi:ladder-lay', 'bi:ladder', 'bi:thanks', 'bi:to-mormor',
  'bi:yard', 'bi:mormor-here', 'bi:lantern', 'bi:open',
  'bi:loft', 'bi:hatch', 'bi:roof', 'bi:roof-klonk', 'bi:forest',
  'bi:brook', 'bi:seesaw', 'bi:call', 'bi:klonk-jump', 'bi:fly', 'bi:thanks-klonk', 'bi:klonk-glad',
  'bi:hill', 'bi:hazel', 'bi:wind', 'bi:top',
  'bi:there', 'bi:holds', 'bi:not-alone', 'bi:owl', 'bi:down', 'bi:cheer',
];
/** The big candies by name: their places in billsta.checkpoints. */
const CP = { road: 0, drive: 1, lawn: 2, loft: 3, roof: 4, house: 5, seesaw: 6, hill: 7, gusts: 8 };

const ladder = billsta.ledges!.find((l) => l.needs === 'bi:ladder')!;
const door = billsta.movers!.find((m) => m.id === 'bi-door')!;
const spot = (id: string) => billsta.spots!.find((s) => s.id === id)!;
const call = spot('bi:call-klonk');
const seesaw = spot('bi:fling');
const fling = billsta.rides!.find((r) => r.id === 'bi:fling')!;
const shelves = billsta.ledges!.filter((l) => l.look === 'stone');
const beams = billsta.ledges!.filter((l) => l.look === 'plank' && !l.needs);
const [roofGust, slopeGust] = billsta.gusts!;
const lines: Record<string, string> = sv.lines;
const where = (sim: Sim) => `he is at ${sim.curr.x.toFixed(2)}, ${sim.curr.y.toFixed(2)} (${sim.curr.mode})`;
const on = (sim: Sim, l: Ledge) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - l.y) < 0.08 && Math.abs(sim.curr.x - l.x) <= l.width / 2 + 0.16;
/** Where the outline drops into a pit and comes up again: the stretches with no ground to stand on. */
const pits = billsta.ground.flatMap((p, i) => {
  const next = billsta.ground[i + 1];
  const before = billsta.ground[i - 1];
  return next && before && next.x > p.x && before.x === p.x && before.y > p.y + 2 && billsta.ground[i + 2]?.x === next.x ? [{ from: p.x, to: next.x, bottom: p.y }] : [];
});
const pitAt = (x: number) => pits.find((p) => p.from < x && p.to > x)!;
const pool = pitAt((fling.from.x + fling.to.x) / 2);

/** Plays it as the robot does, with the option to change its mind on a frame. */
function play(game: Game, seconds = 400, until = () => game.sim.flags.has('goal')) {
  let wasAhead = false;
  let wasOffered = false;
  for (let frame = 0; frame < 60 * seconds && !until(); frame++) {
    const d = decide(game, billsta);
    game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
    wasAhead = d.ahead;
    wasOffered = d.offered;
  }
}

/** The save a real game keeps at a big candy (src/main.ts): the robot plays from the start until it reaches it. */
const saves = new Map<number, { start: SimStart; said: string[] }>();
function saveAt(checkpoint: number): { start: SimStart; said: string[] } {
  const kept = saves.get(checkpoint);
  if (kept) return kept;
  const game = new Game(billsta, {});
  play(game, 400, () => game.sim.checkpoint >= checkpoint);
  expect(game.sim.checkpoint).toBe(checkpoint);
  const indices = (got: readonly boolean[]) => got.flatMap((has, i) => (has ? [i] : []));
  const save = {
    start: { checkpoint, collected: indices(game.sim.collected), side: indices(game.sim.collectedSide), placed: game.sim.placed, flags: [...game.sim.flags] },
    said: [...game.sim.said],
  };
  saves.set(checkpoint, save);
  return save;
}

describe('Äventyr 2, Kapitel 7: Billsta', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the car on the road to Billaberget's brow at ${fps} Hz, and the story is told in order`, () => {
      const result = playThrough(fps, billsta, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(billsta.checkpoints!.length - 1);
      // Morfar's ladder laid, mormor's lantern lit and the barn's door open, Klonk on the seesaw, the two found.
      expect(result.flags).toEqual(expect.arrayContaining([
        'bi:morfar', 'bi:ladder', 'bi:mormor', `placed:${door.id}`, call.id, 'bi:klonk-on', fling.id, 'bi:landed', 'goal',
      ]));
      expect(result.said).toEqual(SAID);
      // It never falls in, and it waits in the lee of each hood and boulder: no gust catches it.
      expect(result.bubbles).toBe(0);
      expect(result.blown).toBe(0);
      expect(result.knocks).toBe(0);
    });
  }

  it('the robot leaves no candy behind, and following the trail takes none of the side ways', () => {
    const game = new Game(billsta);
    play(game);
    expect(game.sim.flags.has('goal')).toBe(true);
    const missed = game.sim.collected.flatMap((got, i) => (got ? [] : [i]));
    expect(missed.map((i) => `${billsta.candy[i]!.x},${billsta.candy[i]!.y}`)).toEqual([]);
    expect(game.sim.collectedSide.filter(Boolean).length).toBe(0);
    expect(billsta.candy.length).toBeGreaterThanOrEqual(85);
  });

  it('on Lugnt it is played by running and Använd: Hoppa is never needed, and the gusts only slow him', () => {
    const game = new Game(billsta, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasAhead = false;
    let hops = 0;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, billsta);
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

  describe('Vägen', () => {
    it('starts on the road beside the family\'s car, with mormor and morfar\'s window lit behind the yard', () => {
      const buildings = billsta.storm!.buildings!;
      const car = buildings.find((b) => b.kind === 'car')!;
      expect(car.lit).toBe('');
      // Well back from the play plane, so its wheels, body and cabin are in the picture; in front of the house.
      expect(car.z).toBeLessThanOrEqual(-8);
      // He stands beside it, on the asphalt.
      expect(Math.abs(billsta.spawn.x - car.x)).toBeLessThan((car.width ?? 29) / 2);
      const road = billsta.surfaces!.find((s) => s.kind === 'asphalt')!;
      expect(road.from).toBeLessThanOrEqual(billsta.spawn.x);
      expect(road.to).toBeGreaterThan(spot('bi:morfar').at.x);
      // Its headlights glow at its front, from the start.
      const front = car.x + (car.width ?? 29) / 2;
      expect(billsta.storm!.glows!.filter((g) => g.after === undefined && Math.abs(g.at.x - front) < 1).length).toBeGreaterThanOrEqual(1);
      // Spruces across the road, behind it.
      const spruces = buildings.filter((b) => b.kind === 'spruce' && b.x < spot('bi:morfar').at.x);
      expect(spruces.length).toBeGreaterThanOrEqual(2);
      for (const s of spruces) expect(s.z).toBeLessThanOrEqual(-12);
      // The house behind the yard, lit from the start; the barn beside it, where he climbs.
      const villa = buildings.find((b) => b.kind === 'villa')!;
      expect(villa.lit).toBe('');
      expect(villa.z).toBeLessThanOrEqual(-25);
      expect(car.z).toBeGreaterThan(villa.z);
      const barn = buildings.find((b) => b.kind === 'barn')!;
      expect(barn.x).toBeGreaterThan(villa.x);
      // The first words: three mil by car, and the lit window.
      expect(lines.biArrive).toBe('Framme i Billsta, hos mormor och morfar!');
      const window = billsta.beats!.find((b) => b.id === 'bi:window')!;
      expect(window.at!).toBeLessThan(spot('bi:morfar').at.x);
      expect(lines[window.line]).toMatch(/lyser/);
    });

    it('is by the road near the forest, not by the water: no lake beside the house', () => {
      // Only the narrow, seen far off from the brow, behind the forest: nowhere near the house, and too high to be
      // seen from anywhere lower than the brow.
      for (const lake of billsta.storm!.lakes ?? []) {
        expect(lake.near!).toBeLessThanOrEqual(-15);
        expect(lake.from).toBeGreaterThan(slopeGust!.to - 4);
        expect(lake.y).toBeGreaterThan(heightAt(billsta, slopeGust!.from) + 2.5);
      }
      // No current to ride: the one ride is Klonk's fling over the brook.
      expect((billsta.rides ?? []).map((r) => r.id)).toEqual(['bi:fling']);
    });
  });

  describe('Morfar', () => {
    it('the ditch is twice a running jump; without his ladder walking on ends in the glitter bubble', () => {
      const ditch = pitAt(ladder.x);
      expect(ditch.to - ditch.from).toBeGreaterThan(2 * RUNNING_JUMP_REACH);
      expect(billsta.water!.some((w) => w.from === ditch.from && w.to === ditch.to)).toBe(true);
      // His ladder lies rim to rim, level with both, and a little longer than the ditch is wide.
      expect(ladder.y).toBe(heightAt(billsta, ditch.from - 0.1));
      expect(ladder.y).toBe(heightAt(billsta, ditch.to + 0.1));
      expect(ladder.x - ladder.width / 2).toBeLessThan(ditch.from);
      expect(ladder.x + ladder.width / 2).toBeGreaterThan(ditch.to);
      const sim = new Sim(billsta, {}, { checkpoint: CP.road });
      walkTo(sim, ditch.from - 0.3);
      run(sim, 0.8, { x: 1 });
      run(sim, 2.5);
      expect(sim.bubbles).toBe(1);
      expect(sim.curr.x, where(sim)).toBeLessThan(ditch.from);
    });

    it('called, morfar lays his ladder over the ditch while Elof watches, and Elof walks across', () => {
      const call = spot('bi:morfar');
      expect(call.look).toBe('morfar');
      const sim = new Sim(billsta, {}, saveAt(CP.road).start);
      // Klonk waits at the ditch's edge until the ladder is there.
      const edge = billsta.ghost!.findIndex((perch) => perch.until === 'bi:ladder');
      walkTo(sim, call.at.x);
      expect(sim.ghost!.perch).toBe(edge);
      expect(sim.curr.verb).toBe('call');
      expect(sim.curr.word).toBe('biCallMorfar');
      expect((sv.verbs as Record<string, string>).biCallMorfar).toBe('Ropa på morfar');
      use(sim);
      expect(sim.flags.has('bi:morfar')).toBe(true);
      // A short held beat while he lays it down: the stick does nothing.
      run(sim, 0.8, { x: 1 });
      expect(sim.held).toBe(true);
      expect(Math.abs(sim.curr.x - call.at.x)).toBeLessThan(0.1);
      expect(sim.flags.has('bi:ladder')).toBe(false);
      run(sim, 1, { x: 1 });
      expect(sim.flags.has('bi:ladder')).toBe(true);
      expect(sim.ghost!.perch).toBeGreaterThan(edge);
      expect(runPast(sim, 21)).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(['bi:new-trail', 'bi:ditch', 'bi:morfar-here', 'bi:ladder-lay', 'bi:ladder', 'bi:thanks']);
    });

    it('is glad and amazed to see him so small, and says only what he does: the ladder, and where mormor is', () => {
      expect(words.lines.biMorfarHere).toBe('Elof! Så liten du har blivit!');
      const morfar = billsta.beats!.filter((b) => b.who === 'morfar');
      expect(morfar.map((b) => b.line)).toEqual(['biMorfarHere', 'biLadderLay', 'biLadderOn', 'biToMormor']);
      expect(billsta.beats!.find((b) => b.id === 'bi:morfar-here')!.read).toBe(true);
    });
  });

  describe('Mormor', () => {
    it('the barn\'s door at the top of the planks is shut, too high to climb, until mormor opens it', () => {
      expect(door.on).toBe('bi:mormor');
      expect(door.height).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      // Opened, it slides up in its frame, over his head.
      expect(door.stops[1]!.x).toBe(door.stops[0]!.x);
      expect(door.stops[1]!.y).toBeGreaterThan(door.stops[0]!.y + 1.2);
      const sim = new Sim(billsta, { easyJumps: true }, saveAt(CP.lawn).start);
      // Past mormor without a word, up the stack and the planks: the door stops him.
      runPast(sim, door.stops[0]!.x + 2, 12);
      expect(sim.curr.x, where(sim)).toBeLessThan(door.stops[0]!.x - door.width / 2);
      expect(sim.flags.has(`placed:${door.id}`)).toBe(false);
      // Back down to her by the woodshed, and call.
      const call = spot('bi:mormor');
      expect(call.look).toBe('mormor');
      walkTo(sim, call.at.x);
      expect(sim.curr.word).toBe('biCallMormor');
      expect((sv.verbs as Record<string, string>).biCallMormor).toBe('Ropa på mormor');
      use(sim);
      expect(sim.flags.has('bi:mormor')).toBe(true);
      run(sim, 1);
      expect(sim.flags.has(`placed:${door.id}`)).toBe(true);
      expect(runPast(sim, 58, 10)).toBe(true);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 58), 1);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(expect.arrayContaining(['bi:mormor-here', 'bi:lantern', 'bi:open', 'bi:loft']));
    });

    it('her lantern lights the loft and the barn\'s windows once she is called, and comes up the hill at the end', () => {
      const storm = billsta.storm!;
      expect(storm.glows!.filter((g) => g.after === 'bi:mormor').length).toBeGreaterThanOrEqual(1);
      expect(billsta.decor!.find((d) => d.look === 'lantern')!.after).toBe('bi:mormor');
      expect(storm.buildings!.find((b) => b.kind === 'barn')!.lit).toBe('bi:mormor');
      expect(storm.glows!.some((g) => g.after === 'beat:bi:owl' && g.at.x > slopeGust!.to)).toBe(true);
      expect(words.lines.biMormorHere).toBe('Lilla Elof! Är det verkligen du?');
      const mormor = billsta.beats!.filter((b) => b.who === 'mormor');
      expect(mormor.map((b) => b.line)).toEqual(['biMormorHere', 'biLantern', 'biToNarrow']);
    });
  });

  describe('the red barn', () => {
    it('climbs the woodshed\'s stack a row at a time, and drops softly off its end', () => {
      const stack = billsta.surfaces!.find((s) => s.kind === 'wood')!;
      const top = Math.max(...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((dx) => heightAt(billsta, stack.from + dx)));
      expect(top).toBeLessThan(4);
      // Every row is a marked jump for Lätta hopp.
      const marked = billsta.jumps!.filter((j) => j.at.x > stack.from - 1 && j.at.x < stack.to);
      expect(marked.length).toBe(3);
    });

    it('goes through the dark loft, over the hatch in its floor, and up the hay onto the roof', () => {
      const hatch = pitAt(63.9);
      expect(heightAt(billsta, hatch.from - 0.1) - hatch.bottom).toBeGreaterThan(4);
      expect(hatch.to - hatch.from).toBeLessThan(RUNNING_JUMP_REACH - 0.6);
      for (let x = roofGust!.from; x <= roofGust!.to; x += 0.2) expect(heightAt(billsta, x), `at ${x}`).toBeCloseTo(roofGust!.y, 6);
      for (let i = 1; i < roofGust!.shelters.length; i++) expect(roofGust!.shelters[i]! - roofGust!.shelters[i - 1]!).toBeCloseTo(5.2, 6);
      // Boards all the way, from the planks to the eaves.
      expect(billsta.surfaces!.find((s) => s.kind === 'wood' && s.from <= roofGust!.from && s.to >= roofGust!.to)).toBeDefined();
      // On the roof the lee is the ventilation hoods; on Billaberget it is its boulders.
      expect(billsta.storm!.shelters).toEqual(['vents', 'rocks']);
    });

    it('has two beams over the loft: up from the bale, across over the hatch, and down beyond it, with five hearts', () => {
      const sim = new Sim(billsta, {}, saveAt(CP.loft).start);
      run(sim, 0.2);
      leap(sim, 1, 58.2);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 59.5), 2);
      walkTo(sim, 60.2);
      leap(sim, 1, 60.6);
      expect(on(sim, beams[0]!), where(sim)).toBe(true);
      walkTo(sim, beams[0]!.x - 0.6);
      leap(sim, 1, beams[0]!.x + beams[0]!.width / 2 - 0.25);
      expect(on(sim, beams[1]!), where(sim)).toBe(true);
      // A slow walk off its end lands beyond the hatch.
      for (let i = 0; i < 600 && sim.curr.y > beams[1]!.y - 0.5; i++) sim.step({ x: 0.3, y: 0, hopHeld: false, hop: false, act: false });
      run(sim, 0.8);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, sim.curr.x), 1);
      expect(sim.curr.x).toBeGreaterThan(pitAt(63.9).to);
      const hearts = sideTaken(sim, 60, 66);
      expect(hearts).toEqual({ taken: 5, of: 5 });
      expect(sim.bubbles).toBe(0);
    });

    it('slopes down at the roof\'s far end to its low eaves, a soft drop to the ground behind the house', () => {
      expect(heightAt(billsta, roofGust!.to + 6) - heightAt(billsta, billsta.checkpoints![CP.house]!.x)).toBeLessThan(4);
      // On Lugnt too: the drop is short enough to land, so he walks off it.
      const sim = new Sim(billsta, {}, { checkpoint: CP.roof });
      const gentle = new Sim(billsta, simOptions(settingsFor('lugnt')), { checkpoint: CP.roof });
      for (const s of [sim, gentle]) {
        expect(runPast(s, billsta.checkpoints![CP.house]!.x, 60), where(s)).toBe(true);
        run(s, 0.4);
        expect(s.curr.y, where(s)).toBeCloseTo(0, 2);
        expect(s.bubbles).toBe(0);
      }
    });
  });

  describe('the forest behind the house', () => {
    it('crosses the brook on three stones, a hop of water between each, every hop a marked jump', () => {
      const brook = billsta.water!.find((w) => w.from < billsta.checkpoints![CP.seesaw]!.x && w.to > billsta.checkpoints![CP.house]!.x)!;
      const stones = billsta.surfaces!.filter((s) => s.kind === 'stone' && s.from > brook.from && s.to < brook.to);
      expect(stones.length).toBe(3);
      const edges = [brook.from, ...stones.flatMap((s) => [s.from, s.to]), brook.to];
      for (let i = 0; i < edges.length; i += 2) {
        expect(edges[i + 1]! - edges[i]!).toBeGreaterThan(1);
        expect(edges[i + 1]! - edges[i]!).toBeLessThan(RUNNING_JUMP_REACH - 0.6);
        expect(billsta.jumps!.some((j) => Math.abs(j.at.x - (edges[i]! - 0.2)) < 0.01)).toBe(true);
      }
      // They are granite, for the picture.
      for (const s of stones) expect(billsta.landmarks!.some((l) => l.look === 'stone' && l.from === s.from && l.to === s.to)).toBe(true);
      const sim = new Sim(billsta, {}, { checkpoint: CP.house });
      for (const s of stones) {
        leap(sim, 1, s.from - 1.4 - 0.25);
        expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, s.from + 0.5), 2);
        expect(sim.curr.x).toBeGreaterThan(s.from);
      }
      leap(sim, 1, brook.to - 1.4 - 0.25);
      expect(sim.curr.x, where(sim)).toBeGreaterThan(brook.to);
      expect(sim.bubbles).toBe(0);
    });

    it('further on is too wide for any jump, and the hill\'s bank rises straight out of it, out of every jump\'s reach', () => {
      expect(pool.to - pool.from).toBeGreaterThan(2 * RUNNING_JUMP_REACH);
      expect(billsta.water!.some((w) => w.from === pool.from && w.to === pool.to)).toBe(true);
      expect(heightAt(billsta, pool.to + 0.1) - heightAt(billsta, pool.from - 0.1)).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      // Nothing marks a jump over it, and nothing is pushed into it: the way over is Klonk's seesaw.
      expect(billsta.jumps!.filter((j) => j.at.x > pool.from - 1 && j.at.x < pool.to)).toEqual([]);
      expect(billsta.movers!.map((m) => m.id)).toEqual([door.id]);
      expect(billsta.climbs ?? []).toEqual([]);
      // A running jump off the bank ends in the glitter bubble, back on the near bank.
      const wet = new Sim(billsta, {}, { checkpoint: CP.seesaw });
      leap(wet, 1, pool.from - 0.25);
      run(wet, 2.5);
      expect(wet.bubbles).toBe(1);
      expect(wet.curr.x, where(wet)).toBeLessThan(pool.from);
    });

    it('has a dry spruce over a stone as a seesaw: he is too light alone, and nothing flings him until Klonk is called', () => {
      expect(seesaw.look).toBe('seesaw');
      expect(seesaw.needs).toBe('bi:klonk-on');
      expect(seesaw.ride).toBe(fling.id);
      // Required: the story's way over, never a side way.
      expect(seesaw.extra).toBeUndefined();
      expect(fling.from.y).toBe(heightAt(billsta, fling.from.x));
      expect(fling.from.x).toBeLessThan(pool.from);
      expect(fling.to.x).toBeGreaterThan(pool.to);
      expect(fling.to.y).toBe(heightAt(billsta, fling.to.x));
      expect(lines.biSeesaw).toBe('En gungbräda! Men jag är för lätt.');
      const sim = new Sim(billsta, {}, saveAt(CP.seesaw).start);
      // Klonk waits over the stone until he calls.
      const waits = billsta.ghost!.findIndex((perch) => perch.until === 'bi:call-klonk');
      walkTo(sim, fling.from.x);
      expect(sim.ghost!.perch).toBe(waits);
      run(sim, 2);
      expect(sim.curr.mode).toBe('free');
      expect(sim.flags.has(fling.id)).toBe(false);
      expect(sim.curr.verb).toBe('call');
      expect(sim.curr.word).toBe('biCallKlonk');
      expect((sv.verbs as Record<string, string>).biCallKlonk).toBe('Ropa på Klonk');
      expect(sim.said).toContain('bi:seesaw');
    });

    it('called, Klonk jumps onto the high end while Elof stands still, and the seesaw flings him over the brook onto the bank', () => {
      const sim = new Sim(billsta, {}, saveAt(CP.seesaw).start);
      walkTo(sim, fling.from.x);
      use(sim);
      expect(sim.flags.has(call.id)).toBe(true);
      // A short held beat while Klonk jumps on: the stick does nothing.
      run(sim, 0.8, { x: -1 });
      expect(sim.held).toBe(true);
      expect(Math.abs(sim.curr.x - fling.from.x)).toBeLessThan(0.1);
      expect(sim.flags.has('bi:klonk-on')).toBe(false);
      // Klonk is on the seesaw's high end, on the ground it comes down to.
      const high = billsta.ghost!.findIndex((perch) => perch.until === fling.id);
      expect(sim.ghost!.perch).toBe(high);
      expect(sim.ghost!.x).toBeCloseTo(billsta.ghost![high]!.at.x, 1);
      expect(sim.ghost!.y).toBeCloseTo(billsta.ghost![high]!.at.y, 1);
      expect(billsta.ghost![high]!.at.x).toBeGreaterThan(seesaw.at.x + 3);
      expect(billsta.ghost![high]!.at.x).toBeLessThan(pool.from);
      // Then the seesaw tips, by itself: he is already standing on it.
      run(sim, 0.6);
      expect(sim.flags.has('bi:klonk-on')).toBe(true);
      expect(sim.curr.mode).toBe('ride');
      run(sim, fling.time + 0.3);
      expect(sim.curr.mode, where(sim)).toBe('free');
      expect(sim.curr.x).toBeCloseTo(fling.to.x, 1);
      expect(sim.curr.y).toBeCloseTo(heightAt(billsta, fling.to.x), 1);
      // Klonk follows him over the brook.
      expect(sim.ghost!.perch).toBeGreaterThan(high);
      expect(runPast(sim, 142)).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(['bi:seesaw', 'bi:call', 'bi:klonk-jump', 'bi:fly', 'bi:thanks-klonk', 'bi:klonk-glad']);
      expect(lines.biThanksKlonk).toBe('Tack, Klonk! Du är min bästa vän.');
    });

    it('is Klonk\'s own help: he guides there, says only klonk, and stays on firm ground', () => {
      const at = billsta.checkpoints![CP.seesaw]!;
      for (const flags of [[], [call.id], [call.id, 'bi:klonk-on', fling.id]]) {
        const [, helper, , guide] = context((flag) => flags.includes(flag), { x: fling.from.x, y: at.y });
        expect(guide).toBe('spoket');
        expect(words.helpers![helper]).toMatch(/Klonk/);
      }
      for (const beat of billsta.beats!.filter((b) => ['bi:klonk-jump', 'bi:klonk-glad'].includes(b.id))) expect(beat.who).toBe('spoket');
      for (const perch of billsta.ghost!.filter((p) => p.until === call.id || p.until === fling.id)) {
        expect(heightAt(billsta, perch.at.x)).toBeCloseTo(perch.at.y, 3);
        expect(perch.catch).toBeUndefined();
      }
    });
  });

  describe('Billaberget', () => {
    it('crosses its boulders, a crack between two of them, and the gusts with the boulders as the lee', () => {
      const crack = pitAt(148.6);
      expect(crack.to - crack.from).toBeLessThan(RUNNING_JUMP_REACH - 0.6);
      expect(heightAt(billsta, crack.from + 0.5)).toBeLessThan(heightAt(billsta, crack.from - 0.5) - 4);
      // Each boulder is a stone of the field, for the picture.
      expect(billsta.landmarks!.filter((l) => l.base >= slopeGust!.y).map((l) => l.look)).toEqual(['stone', 'stone', 'stone']);
      // Level and whole from the first boulder of its lee to the last, and a dash between two is half the calm.
      for (let x = slopeGust!.from; x <= slopeGust!.to; x += 0.2) expect(heightAt(billsta, x), `at ${x}`).toBeCloseTo(slopeGust!.y, 6);
      for (let i = 1; i < slopeGust!.shelters.length; i++) expect(slopeGust!.shelters[i]! - slopeGust!.shelters[i - 1]!).toBeCloseTo(5.2, 6);
      // Up Billaberget: the slope is higher than the forest floor, and the brow higher still.
      expect(slopeGust!.y).toBeGreaterThan(heightAt(billsta, billsta.checkpoints![CP.seesaw]!.x) + 2.5);
      expect(heightAt(billsta, billsta.goalX)).toBeGreaterThan(slopeGust!.y + 2.5);
    });

    it('a player who never waits in the lee is blown back, and still gets over with everything', () => {
      const sim = new Sim(billsta, {}, { checkpoint: CP.gusts });
      runPast(sim, slopeGust!.to + 2, 60);
      expect(sim.blown).toBeGreaterThan(0);
      expect(sim.bubbles).toBe(0);
      expect(sim.curr.x).toBeGreaterThan(slopeGust!.to + 1);
    });

    it('has three shelves of rock up the cliff where the hazel grows: a held jump to each, with seven nuts', () => {
      const sim = new Sim(billsta, { easyJumps: true }, { checkpoint: CP.hill });
      // Up the first boulder and over the crack, onto the second.
      runPast(sim, 150.5, 10);
      walkTo(sim, shelves[0]!.x - 0.4);
      jump(sim);
      expect(on(sim, shelves[0]!), where(sim)).toBe(true);
      walkTo(sim, shelves[0]!.x - 0.5);
      leap(sim, 1, shelves[0]!.x + shelves[0]!.width / 2 - 0.25);
      expect(on(sim, shelves[1]!), where(sim)).toBe(true);
      walkTo(sim, shelves[1]!.x - 0.6);
      leap(sim, 1, shelves[1]!.x + shelves[1]!.width / 2 - 0.25);
      expect(on(sim, shelves[2]!), where(sim)).toBe(true);
      // Off its end, onto the big boulder.
      runPast(sim, 158.9, 3);
      run(sim, 0.4);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 158.9), 1);
      const nuts = sideTaken(sim, 149.9, 158.9);
      expect(nuts.of).toBe(7);
      expect(nuts.taken).toBe(7);
      expect(sim.bubbles).toBe(0);
      // The cliff's granite face stands behind them.
      const cliff = billsta.storm!.buildings!.find((b) => b.kind === 'cliff')!;
      for (const s of shelves) expect(Math.abs(s.x - cliff.x)).toBeLessThan((cliff.width ?? 16) / 2);
    });
  });

  describe('the brow', () => {
    it('shows both trägubbar far below on a stone in the narrow in a flash; the owl hoots far off, and Elof reads it', () => {
      const there = billsta.beats!.find((b) => b.id === 'bi:there')!;
      expect(there.read).toBe(true);
      expect(there.who).toBe('elof');
      expect(lines[there.line]).toBe('Där nere! På en sten i sundet!');
      expect(there.at!).toBeLessThan(billsta.goalX);
      expect(there.at!).toBeGreaterThan(billsta.checkpoints![CP.gusts]!.x);
      // High on the brow, above the slope and the forest.
      expect(heightAt(billsta, there.at!)).toBeGreaterThan(slopeGust!.y + 2.5);
      // Far below and far behind the forest: the two figures on their stone in the narrow's water.
      const far = billsta.decor!.filter((d) => d.z !== undefined && d.z <= -25);
      expect(far.map((d) => d.look).sort()).toEqual(['lillgubbe', 'tragubbe']);
      for (const d of far) expect(['beat:bi:there', 'bi:landed']).toContain(d.after);
      // They stand on their stone out on the narrow's water, in front of the far scenery (the garden's nearest far
      // picture is 32 behind the path, and covers what is behind it).
      const narrow = billsta.storm!.lakes![0]!;
      for (const d of far) {
        expect(d.at.x).toBeGreaterThan(narrow.from);
        expect(d.at.y - narrow.y).toBeCloseTo(0.3, 5);
        expect(d.z!).toBeLessThan(narrow.near!);
        expect(d.z!).toBeGreaterThan(-32);
      }
      expect(billsta.storm!.flybys!.some((f) => f.on === 'beat:bi:there')).toBe(true);
      expect(words.lines.biOwl).toMatch(/ugglan/);
      expect(words.lines.biToNarrow).toMatch(/sundet/);
      // The card waits until the last word is said.
      expect(billsta.goalNeeds).toBe('beat:bi:cheer');
      const game = new Game(billsta, {}, saveAt(CP.gusts).start);
      for (let frame = 0; frame < 60 * 60 && !game.sim.flags.has('goal'); frame++) {
        const d = decide(game, billsta);
        game.frame(1 / 60, { x: d.x, y: 0, hopHeld: true }, { hop: false, act: false, helper: false });
      }
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(game.sim.said.filter((id) => SAID.indexOf(id) >= SAID.indexOf('bi:there'))).toEqual(['bi:there', 'bi:holds', 'bi:not-alone', 'bi:owl', 'bi:down', 'bi:cheer']);
    });

    it('is a stormy night near midnight, with the house\'s window warm from the start', () => {
      expect(billsta.storm).toMatchObject({ rain: 0.85, lightning: 8 });
      expect(billsta.storm!.calm).toBeUndefined();
      expect(billsta.coda).toBe('all');
      expect(billsta.place).toBe('garden');
      expect(billsta.scenes!.map((s) => s.id)).toEqual(['card']);
      const kinds = new Set(billsta.storm!.buildings!.map((b) => b.kind));
      for (const kind of ['car', 'villa', 'barn', 'woodshed', 'rowboat', 'mailbox', 'birch', 'spruce', 'cliff'] as const) expect(kinds.has(kind), kind).toBe(true);
    });
  });

  it('is taken up again at every big candy, and played on to the end without saying anything twice', () => {
    for (let checkpoint = 0; checkpoint < billsta.checkpoints!.length; checkpoint++) {
      const { start, said } = saveAt(checkpoint);
      const game = new Game(billsta, {}, start);
      expect(game.sim.curr.x).toBeCloseTo(billsta.checkpoints![checkpoint]!.x, 1);
      play(game);
      expect(game.sim.flags.has('goal'), `from big candy ${checkpoint}, it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
      expect(game.sim.said.filter((id) => said.includes(id)), `from big candy ${checkpoint}`).toEqual([]);
      expect(game.sim.collected.every(Boolean), `from big candy ${checkpoint}`).toBe(true);
      expect(game.sim.bubbles).toBe(0);
    }
  });

  it('says what he is doing now all the way, with morfar and mormor as the guide where their help is next', () => {
    const game = new Game(billsta);
    const seen: string[] = [];
    let wasAhead = false;
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 400 && !game.sim.flags.has('goal'); frame++) {
      const d = decide(game, billsta);
      game.frame(1 / 60, { x: d.x, y: d.y, hopHeld: true }, { hop: d.ahead && !wasAhead, act: d.offered && !wasOffered, helper: false });
      wasAhead = d.ahead;
      wasOffered = d.offered;
      const now = storyContext('billsta', game.sim.flags, game.sim.curr);
      expect(now?.purpose, `at x ${game.sim.curr.x.toFixed(1)}`).toBeTruthy();
      expect(now?.family).toBeTruthy();
      const id = `${now!.id}${now!.guide ? `/${now!.guide}` : ''}`;
      if (seen[seen.length - 1] !== id) seen.push(id);
    }
    expect(seen).toEqual([
      'billstaRoad', 'billstaMorfar/morfar', 'billstaLadder/morfar', 'billstaYard', 'billstaMormor/mormor', 'billstaBarn/mormor',
      'billstaLoft', 'billstaRoof', 'billstaBrook', 'billstaSeesaw/spoket', 'billstaKlonkOn/spoket', 'billstaFly/spoket',
      'billstaBoulders', 'billstaWind', 'billstaBrow', 'billstaFound',
    ]);
    // Every purpose the chooser can give has its words.
    for (let x = -2; x <= 205; x += 2) {
      for (const flags of [[], ['bi:ladder'], ['bi:ladder', 'bi:mormor'], ['bi:ladder', 'bi:mormor', call.id], ['bi:ladder', 'bi:mormor', call.id, 'bi:klonk-on', fling.id], ['beat:bi:there']]) {
        const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: heightAt(billsta, x) });
        expect(words.purposes![purpose], purpose).toBeDefined();
        expect(words.helpers![helper], helper).toBeDefined();
      }
    }
  });

  it('keeps Klonk ahead on firm ground, waiting at the ditch, the door and the seesaw, and wordless: it only says klonk', () => {
    for (const perch of billsta.ghost!) expect(perch.catch).toBeUndefined();
    expect(billsta.ghost!.filter((p) => p.until).map((p) => p.until)).toEqual(['bi:ladder', `placed:${door.id}`, call.id, fling.id]);
    for (const beat of billsta.beats!.filter((b) => b.who === 'spoket')) expect(lines[beat.line]).toMatch(/^(Klonk[-,!]? ?)+(klonk!?)?$/i);
  });

  it('has its own words: new keys, short, no digits, every one of them said, and no name but the family\'s', () => {
    const own = Object.entries(words.lines);
    for (const [key, text] of own) {
      expect(key).toMatch(/^bi[A-Z]/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
      // Capitals only at a sentence's start, or for Elof, Klonk, Mamma and the places the study names.
      for (const word of text.match(/(?<![.!?…] |^)\b[A-ZÅÄÖ][a-zåäö]+/g) ?? []) expect(['Elof', 'Klonk', 'Mamma', 'Pappa', 'Billsta', 'Billaberget']).toContain(word);
    }
    const said = new Set(billsta.beats!.map((b) => b.line));
    expect(own.map(([key]) => key).filter((key) => !said.has(key))).toEqual([]);
    for (const id of Object.keys(words.purposes!)) expect(id).toMatch(/^billsta[A-Z]/);
    for (const id of Object.keys(words.helpers!)) expect(id).toMatch(/^billsta[A-Z]/);
    for (const id of Object.keys(words.verbs!)) expect(id).toMatch(/^bi[A-Z]/);
    // Mormor and morfar are only that, and speak as themselves.
    for (const b of billsta.beats!.filter((b) => b.who === 'mormor' || b.who === 'morfar')) expect(b.line).toMatch(/^bi/);
    for (const copy of Object.values(words.purposes!)) expect(`${copy.purpose} ${copy.recap}`).not.toMatch(/\d/);
    // The water by the house is gone: no jetty, no reeds, no current.
    for (const text of [...own.map(([, t]) => t), ...Object.values(words.purposes!).flatMap((c) => [c.purpose, c.recap])]) expect(text).not.toMatch(/brygg|vass|ström/i);
  });

  it('is Kapitel 7: after Älven and before the final', () => {
    expect(nextAfter('alven')?.id).toBe('billsta');
    expect(nextAfter('billsta')?.id).toBe('stormoga');
    expect(AVENTYR2.find((chapter) => chapter.id === 'billsta')).toBe(billsta);
    expect(billsta.goalX).toBeGreaterThanOrEqual(175);
    expect(billsta.goalX).toBeLessThanOrEqual(195);
    expect(billsta.checkpoints!.length).toBeGreaterThanOrEqual(8);
    expect(billsta.checkpoints!.length).toBeLessThanOrEqual(10);
    expect(billsta.candy.length).toBeGreaterThanOrEqual(85);
  });
});
