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
 * of the adventure keeps; here are its own: the leaf through the narrow and the reed up the bank, Billaberget's
 * boulders and gusts, morfar's ladder over the ditch, mormor's lantern and the barn's door, the loft and the roof,
 * the flash at the end, its two second ways, and a game taken up at every big candy.
 */

// Several tests here play the whole chapter more than once: give them time on a busy computer.
vi.setConfig({ testTimeout: 90000 });

/** Everything said on the way, in order, when the robot plays it from the start. */
const SAID = [
  'bi:arrive', 'bi:klonk', 'bi:current', 'bi:jetty', 'bi:reeds',
  'bi:hill', 'bi:hazel', 'bi:wind', 'bi:window', 'bi:window-klonk',
  'bi:ditch', 'bi:morfar-here', 'bi:ladder-lay', 'bi:ladder', 'bi:thanks', 'bi:to-mormor',
  'bi:yard', 'bi:mormor-here', 'bi:lantern', 'bi:open',
  'bi:loft', 'bi:hatch', 'bi:roof', 'bi:roof-klonk',
  'bi:there', 'bi:holds', 'bi:owl', 'bi:jetty-next', 'bi:cheer',
];
/** The big candies by name: their places in billsta.checkpoints. */
const CP = { jetty: 0, bank: 1, gusts: 2, hill: 3, drive: 4, lawn: 5, loft: 6, roof: 7, end: 8 };

const ladder = billsta.ledges!.find((l) => l.needs === 'bi:ladder')!;
const door = billsta.movers!.find((m) => m.id === 'bi-door')!;
const reed = billsta.climbs![0]!;
const leafRide = billsta.rides!.find((r) => r.id === 'bi:leaf')!;
const spot = (id: string) => billsta.spots!.find((s) => s.id === id)!;
const shelves = billsta.ledges!.filter((l) => l.look === 'stone');
const beams = billsta.ledges!.filter((l) => l.look === 'plank' && !l.needs);
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
    it(`the robot plays it from the narrow to the barn's roof at ${fps} Hz, and the story is told in order`, () => {
      const result = playThrough(fps, billsta, {}, 400);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.checkpoint).toBe(billsta.checkpoints!.length - 1);
      // The leaf ridden, morfar's ladder laid, mormor's lantern lit and the barn's door open, the two found.
      expect(result.flags).toEqual(expect.arrayContaining([
        'bi:leaf', 'bi:morfar', 'bi:ladder', 'bi:mormor', `placed:${door.id}`, 'bi:landed', 'goal',
      ]));
      expect(result.said).toEqual(SAID);
      // It never falls in, and it waits in the lee of each boulder and post: no gust catches it.
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

  describe('Sundet', () => {
    it('the narrow is far too wide for any jump; the birch leaf carries him through it to the jetty', () => {
      const narrow = pitAt(10);
      expect(narrow.to - narrow.from).toBeGreaterThan(4 * RUNNING_JUMP_REACH);
      expect(billsta.water!.some((w) => w.from === narrow.from && w.to === narrow.to)).toBe(true);
      // Walking off the stone ends in the glitter bubble, back on the stone.
      const wet = new Sim(billsta, {});
      runPast(wet, 6, 3);
      run(wet, 2);
      expect(wet.bubbles).toBe(1);
      expect(wet.curr.x).toBeLessThan(narrow.from);

      const sim = new Sim(billsta, {});
      walkTo(sim, leafRide.from.x - 0.6);
      expect(sim.curr.verb).toBe('take');
      expect(sim.curr.word).toBe('board');
      use(sim);
      expect(sim.curr.mode).toBe('ride');
      expect(leafRide.look).toBe('leaf');
      run(sim, leafRide.time + 0.2, { y: 1 });
      expect(sim.curr.mode, where(sim)).toBe('free');
      expect(sim.curr.x).toBeCloseTo(leafRide.to.x, 1);
      expect(sim.curr.y).toBeCloseTo(heightAt(billsta, leafRide.to.x), 1);
      expect(sim.said).toContain('bi:current');
      expect(sim.bubbles).toBe(0);
    });

    it('the bank at the jetty\'s end is out of every jump\'s reach, and he climbs the reed at its foot', () => {
      const bank = heightAt(billsta, reed.x + 0.5);
      const deck = heightAt(billsta, reed.x - 0.5);
      expect(bank - deck).toBeGreaterThan(JUMP_APEX + LEDGE_REACH);
      expect(reed.bottom).toBe(deck);
      expect(reed.top).toBe(bank);
      expect(billsta.decor!.some((d) => d.look === 'reed' && d.at.x === reed.x)).toBe(true);
      const sim = new Sim(billsta, {}, { checkpoint: CP.jetty, flags: ['bi:leaf'] });
      // Pushing on into it is enough: he takes hold, climbs, and steps off onto the bank.
      runPast(sim, reed.x + 0.8, 10);
      run(sim, 0.3);
      expect(sim.curr.y, where(sim)).toBeCloseTo(bank, 1);
      expect(sim.curr.x).toBeGreaterThan(reed.x + 0.5);
    });
  });

  describe('Billaberget', () => {
    it('crosses its boulders, a crack between two of them, and the gusts with the boulders as the lee', () => {
      const crack = pitAt(44.6);
      expect(crack.to - crack.from).toBeLessThan(RUNNING_JUMP_REACH - 0.6);
      expect(heightAt(billsta, crack.from + 0.5)).toBeLessThan(heightAt(billsta, crack.from - 0.5) - 4);
      // Each boulder is a stone of the field, for the picture.
      expect(billsta.landmarks!.map((l) => l.look)).toEqual(['stone', 'stone', 'stone']);
      const [gust] = billsta.gusts!;
      // Level and whole from the first boulder of its lee to the last, and a dash between two is half the calm.
      for (let x = gust!.from; x <= gust!.to; x += 0.2) expect(heightAt(billsta, x), `at ${x}`).toBeCloseTo(gust!.y, 6);
      for (let i = 1; i < gust!.shelters.length; i++) expect(gust!.shelters[i]! - gust!.shelters[i - 1]!).toBeCloseTo(5.2, 6);
      // Here the lee is the boulders themselves; on the barn's roof it is the ventilation hoods.
      expect(billsta.storm!.shelters).toEqual(['rocks', 'vents']);
    });

    it('a player who never waits in the lee is blown back, and still gets over with everything', () => {
      const sim = new Sim(billsta, {}, { checkpoint: CP.gusts, flags: ['bi:leaf'] });
      runPast(sim, 90, 60);
      expect(sim.blown).toBeGreaterThan(0);
      expect(sim.bubbles).toBe(0);
      expect(sim.curr.x).toBeGreaterThan(89);
    });

    it('has three shelves of rock up the cliff where the hazel grows: a held jump to each, with seven nuts', () => {
      const sim = new Sim(billsta, { easyJumps: true }, { checkpoint: CP.bank, flags: ['bi:leaf'] });
      // Up the first boulder and over the crack, onto the second.
      runPast(sim, 46.6, 10);
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
      runPast(sim, 55, 3);
      run(sim, 0.4);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 55), 1);
      const nuts = sideTaken(sim, 46, 55);
      expect(nuts.of).toBe(7);
      expect(nuts.taken).toBe(7);
      expect(sim.bubbles).toBe(0);
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
      const sim = new Sim(billsta, {}, { checkpoint: CP.hill, flags: ['bi:leaf'] });
      walkTo(sim, ditch.from - 0.3);
      run(sim, 0.8, { x: 1 });
      run(sim, 2.5);
      expect(sim.bubbles).toBe(1);
      expect(sim.curr.x, where(sim)).toBeLessThan(ditch.from);
    });

    it('called, morfar lays his ladder over the ditch while Elof watches, and Elof walks across', () => {
      const call = spot('bi:morfar');
      expect(call.look).toBe('morfar');
      const sim = new Sim(billsta, {}, saveAt(CP.hill).start);
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
      expect(runPast(sim, 105)).toBe(true);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(['bi:ditch', 'bi:morfar-here', 'bi:ladder-lay', 'bi:ladder', 'bi:thanks']);
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
      expect(runPast(sim, 142, 10)).toBe(true);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 142), 1);
      expect(sim.bubbles).toBe(0);
      expect(sim.said).toEqual(expect.arrayContaining(['bi:mormor-here', 'bi:lantern', 'bi:open', 'bi:loft']));
    });

    it('her lantern lights the loft and the barn\'s windows once she is called', () => {
      const storm = billsta.storm!;
      expect(storm.glows!.filter((g) => g.after === 'bi:mormor').length).toBeGreaterThanOrEqual(1);
      expect(billsta.decor!.find((d) => d.look === 'lantern')!.after).toBe('bi:mormor');
      expect(storm.buildings!.find((b) => b.kind === 'barn')!.lit).toBe('bi:mormor');
      expect(words.lines.biMormorHere).toBe('Lilla Elof! Är det verkligen du?');
      const mormor = billsta.beats!.filter((b) => b.who === 'mormor');
      expect(mormor.map((b) => b.line)).toEqual(['biMormorHere', 'biLantern', 'biDownToJetty']);
    });
  });

  describe('the red barn', () => {
    it('climbs the woodshed\'s stack a row at a time, and drops softly off its end', () => {
      const stack = billsta.surfaces!.find((s) => s.kind === 'wood' && s.from > 110)!;
      const top = Math.max(...[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6].map((dx) => heightAt(billsta, stack.from + dx)));
      expect(top).toBeLessThan(4);
      // Every row is a marked jump for Lätta hopp.
      const marked = billsta.jumps!.filter((j) => j.at.x > stack.from - 1 && j.at.x < stack.to);
      expect(marked.length).toBe(3);
    });

    it('goes through the dark loft, over the hatch in its floor, and up the hay onto the roof', () => {
      const hatch = pitAt(148);
      expect(heightAt(billsta, hatch.from - 0.1) - hatch.bottom).toBeGreaterThan(4);
      expect(hatch.to - hatch.from).toBeLessThan(RUNNING_JUMP_REACH - 0.6);
      const [, roof] = billsta.gusts!;
      for (let x = roof!.from; x <= roof!.to; x += 0.2) expect(heightAt(billsta, x), `at ${x}`).toBeCloseTo(roof!.y, 6);
      // Boards all the way, from the planks to the eaves.
      expect(billsta.surfaces!.find((s) => s.kind === 'wood' && s.from <= roof!.from && s.to >= roof!.to)).toBeDefined();
    });

    it('has two beams over the loft: up from the bale, across over the hatch, and down beyond it, with five hearts', () => {
      const sim = new Sim(billsta, {}, saveAt(CP.loft).start);
      run(sim, 0.2);
      leap(sim, 1, 142.2);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, 143.5), 2);
      walkTo(sim, 144.2);
      leap(sim, 1, 144.6);
      expect(on(sim, beams[0]!), where(sim)).toBe(true);
      walkTo(sim, beams[0]!.x - 0.6);
      leap(sim, 1, beams[0]!.x + beams[0]!.width / 2 - 0.25);
      expect(on(sim, beams[1]!), where(sim)).toBe(true);
      // A slow walk off its end lands beyond the hatch.
      for (let i = 0; i < 600 && sim.curr.y > beams[1]!.y - 0.5; i++) sim.step({ x: 0.3, y: 0, hopHeld: false, hop: false, act: false });
      run(sim, 0.8);
      expect(sim.curr.y, where(sim)).toBeCloseTo(heightAt(billsta, sim.curr.x), 1);
      expect(sim.curr.x).toBeGreaterThan(pitAt(148).to);
      const hearts = sideTaken(sim, 144, 150);
      expect(hearts).toEqual({ taken: 5, of: 5 });
      expect(sim.bubbles).toBe(0);
    });
  });

  describe('the roof\'s end', () => {
    it('shows both trägubbar far out on a stone in the narrow in a flash; the owl hoots far off, and Elof reads it', () => {
      const there = billsta.beats!.find((b) => b.id === 'bi:there')!;
      expect(there.read).toBe(true);
      expect(there.who).toBe('elof');
      expect(lines[there.line]).toBe('Där! På stenen ute i sundet!');
      expect(there.at!).toBeLessThan(billsta.goalX);
      expect(there.at!).toBeGreaterThan(billsta.checkpoints![CP.end]!.x);
      // Down at the eaves, low enough that the stone in the narrow is in sight over the roof he stands on.
      expect(heightAt(billsta, there.at!)).toBeLessThan(2);
      const far = billsta.decor!.filter((d) => d.z !== undefined && d.z <= -18);
      expect(far.map((d) => d.look).sort()).toEqual(['lillgubbe', 'tragubbe']);
      for (const d of far) expect(['beat:bi:there', 'bi:landed']).toContain(d.after);
      expect(billsta.storm!.flybys!.some((f) => f.on === 'beat:bi:there')).toBe(true);
      expect(words.lines.biOwl).toMatch(/ugglan/);
      // The card waits until the last word is said.
      expect(billsta.goalNeeds).toBe('beat:bi:cheer');
      const game = new Game(billsta, {}, saveAt(CP.end).start);
      for (let frame = 0; frame < 60 * 30 && !game.sim.flags.has('goal'); frame++) game.frame(1 / 60, { x: 1, hopHeld: false }, { hop: false, act: false, helper: false });
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(game.sim.said).toEqual(['bi:there', 'bi:holds', 'bi:owl', 'bi:jetty-next', 'bi:cheer']);
    });

    it('is a stormy night near midnight, with the house\'s window warm from the start', () => {
      expect(billsta.storm).toMatchObject({ rain: 0.85, lightning: 8 });
      expect(billsta.storm!.calm).toBeUndefined();
      expect(billsta.coda).toBe('all');
      expect(billsta.place).toBe('garden');
      expect(billsta.scenes!.map((s) => s.id)).toEqual(['card']);
      const villa = billsta.storm!.buildings!.find((b) => b.kind === 'villa')!;
      expect(villa.lit).toBe('');
      expect(villa.z).toBeLessThanOrEqual(-25);
      const kinds = new Set(billsta.storm!.buildings!.map((b) => b.kind));
      for (const kind of ['villa', 'barn', 'woodshed', 'rowboat', 'mailbox', 'birch'] as const) expect(kinds.has(kind), kind).toBe(true);
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
      'billstaNarrow', 'billstaReeds', 'billstaBoulders', 'billstaWind', 'billstaWindow', 'billstaMorfar/morfar',
      'billstaLadder/morfar', 'billstaYard', 'billstaMormor/mormor', 'billstaBarn/mormor', 'billstaLoft', 'billstaRoof', 'billstaFound',
    ]);
    // Every purpose the chooser can give has its words.
    for (let x = 0; x <= 190; x += 2) {
      for (const flags of [[], ['bi:leaf'], ['bi:leaf', 'bi:morfar', 'bi:ladder'], ['bi:ladder', 'bi:mormor'], ['beat:bi:there']]) {
        const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: heightAt(billsta, x) });
        expect(words.purposes![purpose], purpose).toBeDefined();
        expect(words.helpers![helper], helper).toBeDefined();
      }
    }
  });

  it('keeps Klonk ahead on firm ground, waiting at the ditch and the door, and wordless: it only says klonk', () => {
    for (const perch of billsta.ghost!) expect(perch.catch).toBeUndefined();
    expect(billsta.ghost!.filter((p) => p.until).map((p) => p.until)).toEqual(['bi:ladder', `placed:${door.id}`]);
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
