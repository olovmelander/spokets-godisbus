import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { context, stormbyn } from '../../src/content/aventyr2/chapters/stormbyn';
import { words } from '../../src/content/aventyr2/lines/stormbyn';
import { nextAfter } from '../../src/content/chapters';
import { storyContext } from '../../src/content/story-context';
import { sv } from '../../src/content/sv';
import { heightAt as groundAt } from '../../src/render/dressing/kit';
import { drainsOf } from '../../src/render/dressing/ground';
import { AWNING, DOOR_WIDE, LAMP_POST, STREET_DEPTH, WINDOW_WIDE, awningTips, uprights } from '../../src/render/village';
import { settingsFor, simOptions } from '../../src/save/settings';
import { cameraIntent } from '../../src/sim/camera-intent';
import { BERRY_HALF, CANDY_MAGNET, ELOF_HEIGHT, FALL_LIMIT, GHOST_CLEARANCE, JUMP_APEX, LEDGE_REACH, RUNNING_JUMP_REACH, STEP } from '../../src/sim/constants';
import { Sim } from '../../src/sim/sim';
import type { PlayerState } from '../../src/sim/types';
import { decide, heightAt, playThrough } from './robot';
import { idle, jump, run, runPast, walkTo } from '../sim/drive';

/**
 * Kapitel 3, Byn i stormen (docs/aventyr-2.md): its puzzles and its family help, played by the robot, and the
 * village street's rules (tests/unit/street.test.ts, awnings, lamp posts, the drain), which iterate the first
 * adventure's courses only, held here for this chapter.
 */

/** Everything the robot says on the way, in order. */
const SAID = [
  'sbDark', 'sbKlonkHere', 'sbAwning', 'sbCandle', 'sbRiver', 'family:moa', 'family:umbrella',
  'sbFloat', 'sbLanded', 'sbCandleTwo', 'sbCap', 'sbToLake', 'sbKlonkCap', 'sbCandleThree', 'sbShore',
];

/** Where the street ends: with its ground. */
const END = stormbyn.ground[stormbyn.ground.length - 1]!.x;

/** Plays from a saved start at a big candy until the goal, the way the robot plays, and says how it went. */
function resume(checkpoint: number, flags: string[], options = {}) {
  const game = new Game(stormbyn, options, { checkpoint, flags });
  let wasAhead = false, wasOffered = false;
  for (let frame = 0; frame < 60 * 200 && !game.sim.flags.has('goal'); frame++) {
    const { x, y, ahead, offered } = decide(game, stormbyn);
    game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
    wasAhead = ahead;
    wasOffered = offered;
  }
  return game.sim;
}

/** A player's hands for one frame: the stick, Hoppa held, and a press of Hoppa. */
const press = (game: Game, x: number, held: boolean, hop = false) => game.frame(1 / 60, { x, y: 0, hopHeld: held }, { hop, act: false, helper: false });

describe('Kapitel 3, Byn i stormen', () => {
  it('is the pack\'s third world, after the forest and before the lake', () => {
    expect(AVENTYR2.map((chapter) => chapter.id)).toContain('stormbyn');
    expect(nextAfter('stormskog')?.id).toBe('stormbyn');
    expect(nextAfter('stormbyn')?.id).toBe('olympia');
    expect(stormbyn.place).toBe('village');
    expect(stormbyn.coda).toBe('moa');
    expect(stormbyn.goalX).toBeGreaterThanOrEqual(165);
    expect(stormbyn.goalX).toBeLessThanOrEqual(180);
    expect(stormbyn.candy.length).toBeGreaterThanOrEqual(70);
    expect(stormbyn.checkpoints!.length).toBeGreaterThanOrEqual(7);
  });

  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the forest path to the shore at ${fps} Hz, with every puzzle and every line in order`, () => {
      const result = playThrough(fps, stormbyn, {}, 300);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.bubbles).toBe(0);
      expect(result.knocks).toBe(0);
      expect(result.checkpoint).toBe(stormbyn.checkpoints!.length - 1);
      // The leaf down the river, Moa called, her umbrella over the flood, and the cap in the gutter.
      expect(result.flags).toEqual(expect.arrayContaining(['leaf', 'umbrella:ready', 'family:umbrella-ready', 'umbrella', 'cap', 'goal']));
      expect(result.said).toEqual(SAID);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, stormbyn, {}, 300);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${stormbyn.candy[i]!.x},${stormbyn.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(3);
  });

  it('on Lugnt it is played by running and Använd: the drops miss him, and Hoppa is never needed', () => {
    const game = new Game(stormbyn, simOptions(settingsFor('lugnt')));
    let wasOffered = false, wasAhead = false, hops = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, stormbyn);
      // It jumps only where something stands in the way that no marked jump covers.
      const blocked = ahead && game.sim.curr.vx < 0.2;
      if (blocked && !wasAhead) hops++;
      game.frame(1 / 60, { x, y, hopHeld: blocked }, { hop: blocked && !wasAhead, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasAhead = blocked;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
    expect(hops).toBe(0);
  });

  it('carries him down the gutter river on a long birch leaf, over water from shore to shore', () => {
    const leaf = stormbyn.rides!.find((ride) => ride.id === 'leaf')!;
    const river = stormbyn.water![0]!;
    expect(leaf.look).toBe('leaf');
    expect(leaf.from.x).toBeLessThan(river.from);
    expect(leaf.to.x).toBeGreaterThan(river.to);
    // Longer than Byn's puddle leaf.
    expect(leaf.to.x - leaf.from.x).toBeGreaterThan(25);
    expect(heightAt(stormbyn, leaf.from.x)).toBe(leaf.from.y);
    expect(heightAt(stormbyn, leaf.to.x)).toBe(leaf.to.y);
    // A river too wide to jump: the leaf is the way.
    expect(river.to - river.from).toBeGreaterThan(RUNNING_JUMP_REACH * 4);
    const spot = stormbyn.spots!.find((s) => s.ride === 'leaf')!;
    expect(sv.verbs[spot.word as keyof typeof sv.verbs]).toBe('Kliv på');
  });

  it('crosses the grate on five narrow bars, each hop a running jump with a marked edge for Lätta hopp', () => {
    const iron = stormbyn.surfaces!.filter((s) => s.kind === 'iron');
    expect(iron).toHaveLength(5);
    expect(drainsOf(stormbyn)).toEqual([{ from: 66, to: 84, y: 0 }]);
    for (const bar of iron) expect(groundAt(stormbyn, (bar.from + bar.to) / 2)).toBe(0);
    const hops = stormbyn.jumps!.filter((jump) => jump.at.x > 64 && jump.at.x < 84);
    expect(hops).toHaveLength(6);
    for (const jump of hops) {
      expect(jump.land.x - jump.at.x, `the hop at ${jump.at.x}`).toBeLessThanOrEqual(RUNNING_JUMP_REACH + 0.4);
      expect(heightAt(stormbyn, jump.land.x), `the landing of the hop at ${jump.at.x}`).toBe(0);
    }
    // Between the bars it is deep: a fall there is the glitter bubble's.
    for (let i = 1; i < iron.length; i++) expect(heightAt(stormbyn, (iron[i - 1]!.to + iron[i]!.from) / 2)).toBeLessThan(-FALL_LIMIT);
  });

  it("floats him down from the high wall under Moa's umbrella once she is called and has held it out", () => {
    const umbrella = stormbyn.rides!.find((ride) => ride.id === 'umbrella')!;
    const flood = stormbyn.water![1]!;
    expect(umbrella.look).toBe('umbrella');
    // From high to low, over the flooded crossing, rising only a little: it floats down.
    expect(umbrella.from.y - umbrella.to.y).toBeGreaterThanOrEqual(4);
    expect(umbrella.rise).toBeLessThanOrEqual(0.6);
    expect(umbrella.from.x).toBeLessThan(flood.from);
    expect(umbrella.to.x).toBeGreaterThan(flood.to);
    expect(heightAt(stormbyn, umbrella.from.x)).toBe(umbrella.from.y);
    expect(heightAt(stormbyn, umbrella.to.x)).toBe(umbrella.to.y);
    // The wall's far side is a drop too long to land, and the crossing too wide to jump.
    expect(umbrella.from.y - heightAt(stormbyn, flood.from + 0.5)).toBeGreaterThan(FALL_LIMIT);
    expect(flood.to - flood.from).toBeGreaterThan(RUNNING_JUMP_REACH * 4);

    const call = stormbyn.spots!.find((s) => s.id === 'umbrella:ready')!;
    const board = stormbyn.spots!.find((s) => s.ride === 'umbrella')!;
    expect(call).toMatchObject({ verb: 'call', look: 'sign', word: 'callMoa' });
    expect(sv.verbs.callMoa).toBe('Ropa på Moa');
    expect(board.needs).toBe('family:umbrella-ready');
    expect(sv.verbs[board.word as keyof typeof sv.verbs]).toBe('Håll i paraplyet');
    // Calling never starts the ride: a short held beat, then he chooses when to take hold.
    expect(call.ride).toBeUndefined();
    const held = stormbyn.later!.find((beat) => beat.flag === 'family:umbrella-ready')!;
    expect(held).toMatchObject({ after: 'umbrella:ready', hold: true });
    expect(held.seconds).toBeLessThanOrEqual(2);

    // Played: the call holds him for a moment; then the umbrella carries him over.
    const game = new Game(stormbyn, {}, { checkpoint: 4 });
    let heldFor = 0;
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 30 && !game.sim.flags.has('umbrella'); frame++) {
      const { x, y, offered } = decide(game, stormbyn);
      if (game.sim.held) heldFor += 1 / 60;
      // Before Moa holds it out, the umbrella is not offered.
      if (!game.sim.flags.has('family:umbrella-ready')) expect(game.sim.curr.word).not.toBe('sbUmbrella');
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: false, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
    }
    expect(game.sim.flags.has('umbrella')).toBe(true);
    expect(heldFor).toBeGreaterThan(1);
    for (let frame = 0; frame < 60 * 8 && game.sim.curr.mode === 'ride'; frame++) game.frame(1 / 60, { x: 1, y: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.x).toBeCloseTo(umbrella.to.x, 1);
    expect(game.sim.curr.y).toBeCloseTo(0, 1);
    expect(game.sim.bubbles).toBe(0);
  });

  it('has Moa with her umbrella before she is called, and called she steps to the edge to set it down for him', () => {
    // She holds it open over her head while she waits (src/render/view.ts; Olov, 9 November 2026: "Moa ska hålla i ett
    // paraply redan innan Elof ropar på henne och får det."), and goes where her hand reaches the ride's start.
    const umbrella = stormbyn.rides!.find((ride) => ride.id === 'umbrella')!;
    const call = stormbyn.spots!.find((s) => s.id === 'umbrella:ready')!;
    expect(call.goesTo).toBeDefined();
    expect(call.goesTo!.y).toBe(umbrella.from.y);
    expect(umbrella.from.x - call.goesTo!.x).toBeGreaterThan(0.8);
    expect(umbrella.from.x - call.goesTo!.x).toBeLessThan(2);
    // Behind the path, so that he walks past her in front.
    expect(call.goesTo!.z).toBeLessThan(-0.5);
  });

  it('ends on the road up towards Olympia: its last steps go up, each a pull-up', () => {
    // Up to Olympia, not down (Olov, 9 November 2026: "Man ska gå upp till Olympia, inte ner.").
    expect(heightAt(stormbyn, stormbyn.goalX) - heightAt(stormbyn, 162)).toBeGreaterThanOrEqual(3);
    for (let x = 160; x < END - 0.3; x += 0.1) {
      expect(heightAt(stormbyn, x + 0.1) - heightAt(stormbyn, x), `at ${x.toFixed(1)}`).toBeLessThanOrEqual(LEDGE_REACH);
      expect(heightAt(stormbyn, x) - heightAt(stormbyn, x + 0.1), `at ${x.toFixed(1)}`).toBeLessThan(FALL_LIMIT);
    }
    expect(words.purposes!.sbLake!.purpose).toBe('Gå uppför trappan mot Olympia.');
  });

  it('without the umbrella he cannot cross: walking off the wall ends in the glitter bubble, back on the wall', () => {
    const game = new Game(stormbyn, {}, { checkpoint: 4 });
    for (let frame = 0; frame < 60 * 6 && game.sim.bubbles === 0; frame++) game.frame(1 / 60, { x: 1, y: 0, hopHeld: true }, { hop: frame % 30 === 0, act: false, helper: false });
    expect(game.sim.bubbles).toBe(1);
    for (let frame = 0; frame < 60 * 3; frame++) game.frame(1 / 60, { x: 0, y: 0, hopHeld: false }, { hop: false, act: false, helper: false });
    expect(game.sim.curr.y).toBeCloseTo(stormbyn.rides![1]!.from.y, 1);
    expect(game.sim.flags.has('umbrella')).toBe(false);
  });

  it("finds and keeps the little one's cap, and follows the candy towards Olympia", () => {
    const cap = stormbyn.spots!.find((s) => s.id === 'cap')!;
    expect(cap).toMatchObject({ look: 'tiny-cap', touch: true });
    expect(heightAt(stormbyn, cap.at.x)).toBe(cap.at.y);
    // Finding it is a moment of its own (Olov, 9 November 2026: "När man hittar lillgubbens mössa går det alldeles för
    // fort."): he stops, his hand has it, he holds it up, and only then are its words said.
    const moment = stormbyn.scenes!.find((scene) => scene.on === cap.id)!;
    expect(moment.hold).toBe(true);
    const picked = moment.cues!.find((cue) => cue.flag === 'sb:cap-picked')!;
    const seen = moment.cues!.find((cue) => cue.flag === 'sb:cap-seen')!;
    expect(picked.at).toBeGreaterThan(0.5);
    expect(seen.at - picked.at).toBeGreaterThanOrEqual(0.8);
    expect(moment.seconds - seen.at).toBeGreaterThanOrEqual(1.5);
    const lines = stormbyn.beats!.filter((beat) => beat.on === seen.flag);
    expect(lines.map((beat) => sv.lines[beat.line as keyof typeof sv.lines])).toEqual(['Lillgubbens mössa! Jag tar med den.', 'Godisspåret går mot fotbollsplanen!']);
    expect(lines[1]!.read).toBe(true);
    // Klonk answers the find itself, between the two: an answer follows what it answers (docs/dialogue.md).
    const answer = stormbyn.beats!.find((beat) => beat.id === 'sbKlonkCap')!;
    expect(answer.on).toBe(`beat:${lines[0]!.id}`);
    expect(sv.lines[answer.line as keyof typeof sv.lines]).toBe('Klonk, klonk!');
    expect(answer.aside).toBeUndefined();
    // Played: coming to it stops him for the whole moment, a step from where it lay, and the words come after his hand
    // has it.
    const sim = new Sim(stormbyn, {}, { checkpoint: 6, flags: ['leaf', 'umbrella:ready', 'family:umbrella-ready', 'umbrella'] });
    for (let i = 0; i < 10 / STEP && !sim.flags.has(cap.id); i++) sim.step({ ...idle, x: 1 });
    const foundAt = sim.curr.x;
    let heldFor = 0;
    let saidBeforeHand = false;
    for (let i = 0; i < 8 / STEP; i++) {
      sim.step({ ...idle, x: 1 });
      if (sim.held) heldFor += STEP;
      if (sim.said.includes('sbCap') && !sim.flags.has(picked.flag)) saidBeforeHand = true;
      if (!sim.held && sim.flags.has(`scene:${moment.id}`)) break;
    }
    expect(heldFor).toBeGreaterThanOrEqual(moment.seconds - 0.1);
    expect(sim.said).toEqual(expect.arrayContaining(['sbCap', 'sbToLake', 'sbKlonkCap']));
    expect(saidBeforeHand).toBe(false);
    expect(Math.abs(foundAt - cap.at.x)).toBeLessThan(1.3);
    // Klonk thinks of the little one once the cap is found.
    const thought = stormbyn.ghost!.find((perch) => perch.thought)!;
    expect(thought.thought).toEqual({ picture: 'small-figure', after: 'cap' });
    expect(thought.at.x).toBeGreaterThan(cap.at.x + 4);
  });

  it('cannot leave without the cap, and can go back for it from a saved final checkpoint', () => {
    // This is also an old save that passed the touch spot by jumping: the final candy is ahead of the cap.
    const sim = new Sim(stormbyn, { gentle: true }, { checkpoint: 8, flags: ['umbrella'] });
    expect(runPast(sim, stormbyn.goalX + 0.1)).toBe(true);
    expect(sim.flags.has('cap')).toBe(false);
    expect(sim.flags.has('goal')).toBe(false);
    expect(storyContext('stormbyn', sim.flags, sim.curr)?.purpose).toBe(words.purposes!.sbFindCap!.purpose);
    // The street remains reachable. Back down the three steps and walk to the cap.
    for (let attempt = 0; attempt < 18 && sim.curr.x > 140; attempt++) {
      run(sim, 0.35, { x: -1 });
      jump(sim, -1);
    }
    expect(walkTo(sim, 139.4)).toBe(true);
    expect(sim.flags.has('cap')).toBe(true);
    expect(storyContext('stormbyn', sim.flags, sim.curr)?.purpose).toBe(words.purposes!.sbLake!.purpose);
    expect(runPast(sim, stormbyn.goalX + 0.1)).toBe(true);
    expect(sim.flags.has('goal')).toBe(true);
  });

  it('resumes after the umbrella and reaches the shore without the street over again', () => {
    const sim = resume(5, ['leaf', 'umbrella:ready', 'family:umbrella-ready', 'umbrella']);
    expect(sim.flags.has('goal')).toBe(true);
    expect(sim.checkpoint).toBe(stormbyn.checkpoints!.length - 1);
    expect(sim.bubbles).toBe(0);
    expect(sim.knocks).toBe(0);
    expect(sim.said).toEqual(SAID.slice(SAID.indexOf('sbCandleTwo')));
  });

  it('resumes on the wall before Moa is called, and calls her', () => {
    const sim = resume(4, ['leaf']);
    expect(sim.flags.has('goal')).toBe(true);
    expect(sim.said).toEqual(SAID.slice(SAID.indexOf('family:moa')));
    expect(sim.flags.has('umbrella')).toBe(true);
  });

  it('keeps the awning flap and the swinging sign as toys: their hearts are side candy, out of reach from the trail', () => {
    expect(stormbyn.bouncers).toHaveLength(1);
    const flap = stormbyn.bouncers![0]!;
    expect(flap.lift).toBeGreaterThanOrEqual(2.5);
    expect(flap.lift).toBeLessThanOrEqual(3);
    // It lies on the pavement, under the awning.
    expect(flap.y - heightAt(stormbyn, flap.x)).toBeCloseTo(0.5, 5);
    const awning = stormbyn.street!.flatMap((part) => part.awnings ?? []).find((a) => flap.x > a.from && flap.x < a.to);
    expect(awning, 'an awning over the flap').toBeDefined();
    // No trail candy asks for a bounce, and the stands under the awning are out of reach of a jump from the pavement.
    for (const c of stormbyn.candy) expect(Math.abs(c.x - flap.x) > BERRY_HALF + 0.6 || c.y < flap.y + 0.5, `candy at ${c.x}`).toBe(true);
    for (const box of stormbyn.ledges!.filter((l) => l.y > 4)) expect(box.y - heightAt(stormbyn, box.x)).toBeGreaterThan(JUMP_APEX + 1);

    const sign = stormbyn.movers!.find((m) => m.id === 'swing-sign')!;
    expect(sign).toMatchObject({ look: 'swing-sign', extra: true });
    expect(sign.cycle).toBeDefined();
    // Over the pavement it hangs above his head: walking under it, nothing stops him.
    for (const stop of sign.stops) expect(stop.y - heightAt(stormbyn, stop.x)).toBeGreaterThan(ELOF_HEIGHT + 0.3);
    // The hearts over the sign and on the stand beyond it are beyond any jump from the pavement.
    for (const heart of stormbyn.side!.filter((c) => c.x > 128 && c.x < 136)) {
      expect(heart.y - heightAt(stormbyn, heart.x), `the heart at ${heart.x}`).toBeGreaterThan(0.5 + JUMP_APEX + CANDY_MAGNET);
    }
    // No flag of the story waits for either.
    for (const spot of stormbyn.spots!) expect(spot.needs ?? '').not.toMatch(/swing-sign/);
  });

  it('bounces him off the flap up onto the stands under the awning, where the hearts are, and hops him along them', () => {
    const game = new Game(stormbyn, {}, { checkpoint: 0 });
    for (let frame = 0; frame < 600 && game.sim.curr.x < 18.4; frame++) press(game, 0.5, false);
    for (let frame = 0; frame < 20; frame++) press(game, 0, false);
    // A jump straight up beside the flap, drifting onto it on the way down; then on to the first stand.
    press(game, 0, true, true);
    let up = false;
    for (let frame = 0; frame < 200 && !(up && game.sim.curr.grounded); frame++) {
      const before = game.sim.bounces;
      press(game, up ? (game.sim.curr.x < 21 ? 1 : 0) : (game.sim.curr.x < 19 ? 0.4 : 0), true);
      if (game.sim.bounces > before) up = true;
    }
    expect(game.sim.bounces).toBe(1);
    expect(game.sim.curr.y).toBeCloseTo(4.7, 1);
    // A hop from each stand to the next.
    for (const [edge, to] of [[21.9, 24.4], [25.4, 27.8]]) {
      for (let frame = 0; frame < 300 && game.sim.curr.x < edge!; frame++) press(game, 0.5, false);
      press(game, 1, true, true);
      for (let frame = 0; frame < 50; frame++) press(game, game.sim.curr.x < to! ? 1 : 0, true);
      expect(game.sim.curr.y, `the stand at ${to}`).toBeCloseTo(4.7, 1);
    }
    expect(game.sim.collectedSide.slice(0, 6).every(Boolean)).toBe(true);
    expect(game.sim.bubbles).toBe(0);
  });

  it('lets him ride the swinging sign from the bench, and step off it onto the stand beyond', () => {
    const game = new Game(stormbyn, {}, { checkpoint: 5 });
    for (let frame = 0; frame < 600 && game.sim.curr.x < 125; frame++) press(game, 0.5, false);
    for (let frame = 0; frame < 20; frame++) press(game, 0, false);
    press(game, 0.5, true, true);
    for (let frame = 0; frame < 60; frame++) press(game, game.sim.curr.x < 126 ? 0.5 : 0, true);
    expect(game.sim.curr.y, 'on the bench').toBeCloseTo(1, 2);
    for (let frame = 0; frame < 300 && game.sim.curr.x < 126.8; frame++) press(game, 0.4, false);
    // He waits until the sign swings back towards him, and jumps for it.
    const sign = () => game.sim.movers.find((m) => m.def.id === 'swing-sign')!;
    let last = sign().x;
    for (let frame = 0; frame < 600; frame++) {
      press(game, 0, false);
      const now = sign().x;
      if (now < last && now < 130.4) break;
      last = now;
    }
    press(game, 1, true, true);
    for (let frame = 0; frame < 60; frame++) press(game, game.sim.curr.x < 129.2 ? 1 : 0, true);
    expect(game.sim.curr.y - (sign().y + sign().def.height), 'on the sign').toBeCloseTo(0, 1);
    // It carries him out to the end of its swing; from there a hop takes him onto the stand.
    for (let frame = 0; frame < 400 && !(sign().x > 131 && game.sim.curr.grounded); frame++) press(game, 0, false);
    press(game, 1, true, true);
    for (let frame = 0; frame < 80; frame++) press(game, game.sim.curr.x < 133.2 ? 1 : 0, true);
    expect(game.sim.curr.y, 'on the stand').toBeCloseTo(2, 1);
    expect(game.sim.collectedSide[10], 'the heart on the stand').toBe(true);
    expect(game.sim.bubbles).toBe(0);
  });

  for (const gentle of [false, true]) {
    it(`keeps Klonk out of reach all the way on ${gentle ? 'Lugnt' : 'Äventyr'}, over the river, the bars and the flood`, () => {
      const game = new Game(stormbyn, gentle ? simOptions(settingsFor('lugnt')) : {});
      let nearest = Infinity, samples = 0;
      const step = game.sim.step.bind(game.sim);
      game.sim.step = (input) => {
        step(input);
        const ghost = game.sim.ghost;
        if (ghost && !ghost.gone) {
          nearest = Math.min(nearest, Math.hypot(ghost.x - game.sim.curr.x, ghost.y - game.sim.curr.y));
          samples++;
        }
      };
      let wasAhead = false, wasOffered = false;
      for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
        const { x, y, ahead, offered } = decide(game, stormbyn);
        game.frame(1 / 60, { x, y, hopHeld: !gentle }, { hop: !gentle && ahead && !wasAhead, act: offered && !wasOffered, helper: false });
        wasAhead = ahead;
        wasOffered = offered;
      }
      expect(game.sim.flags.has('goal')).toBe(true);
      expect(samples).toBeGreaterThan(100);
      expect(nearest).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    });
  }

  it('starts Klonk safely ahead of him at every big candy', () => {
    for (const [checkpoint] of stormbyn.checkpoints!.entries()) {
      const sim = new Sim(stormbyn, {}, { checkpoint });
      expect(sim.ghost, `checkpoint ${checkpoint}`).not.toBeNull();
      expect(sim.ghost!.x).toBeGreaterThan(sim.curr.x);
      expect(Math.hypot(sim.ghost!.x - sim.curr.x, sim.ghost!.y - sim.curr.y), `checkpoint ${checkpoint}`).toBeGreaterThanOrEqual(GHOST_CLEARANCE - 1e-8);
    }
  });

  it('says its lines in Swedish, short and with no number; Moa calls him lillebror', () => {
    for (const [key, text] of Object.entries(words.lines)) {
      expect(key, key).toMatch(/^sb/);
      expect(text.length, key).toBeLessThanOrEqual(40);
      expect(text, key).not.toMatch(/\d/);
    }
    const moa = stormbyn.beats!.filter((beat) => beat.who === 'moa').map((beat) => words.lines[beat.line]!);
    expect(moa.length).toBeGreaterThanOrEqual(2);
    expect(moa.some((line) => /lillebror/i.test(line))).toBe(true);
    expect(stormbyn.beats!.some((beat) => beat.who === 'spoket')).toBe(true);
    for (const key of Object.keys(words.verbs ?? {})) expect(key).toMatch(/^sb/);
  });

  it('tells "Just nu" what he is doing, with Moa as the guide at her wall', () => {
    const at = (x: number, flags: string[] = []) => storyContext('stormbyn', new Set(flags), { x, y: 0 })!;
    expect(at(1).purpose).toBe(words.purposes!.sbStreet!.purpose);
    expect(at(40).purpose).toBe(words.purposes!.sbRiver!.purpose);
    expect(at(70, ['leaf']).purpose).toBe(words.purposes!.sbGrate!.purpose);
    expect(at(98, ['leaf']).guide).toBe('moa');
    expect(at(100, ['leaf', 'umbrella:ready']).purpose).toBe(words.purposes!.sbBoard!.purpose);
    expect(at(125, ['umbrella']).purpose).toBe(words.purposes!.sbGutter!.purpose);
    expect(at(150, ['umbrella', 'cap']).purpose).toBe(words.purposes!.sbLake!.purpose);
    // Every purpose and helper the chooser can name has its words, along the whole way and with every flag.
    const chosen = new Set<string>();
    for (const flags of [[], ['leaf'], ['umbrella:ready'], ['umbrella'], ['umbrella', 'cap']]) {
      for (let x = 0; x <= stormbyn.goalX; x += 2) {
        const [purpose, helper] = context((flag) => flags.includes(flag), { x, y: 0 });
        chosen.add(purpose);
        expect(words.purposes![purpose], purpose).toBeDefined();
        expect(words.helpers![helper], helper).toBeDefined();
      }
    }
    expect([...chosen].sort()).toEqual(Object.keys(words.purposes!).sort());
    for (const [id, copy] of Object.entries(words.purposes!)) expect(copy.purpose.length, id).toBeLessThanOrEqual(42);
  });

  it('is a stormy night: rain, lightning, and a candle in front of each near window', () => {
    expect(stormbyn.storm?.rain).toBeGreaterThan(0.5);
    expect(stormbyn.storm?.lightning).toBeGreaterThan(0);
    const glows = stormbyn.storm!.glows!;
    expect(glows.length).toBeGreaterThanOrEqual(2);
    for (const glow of glows) {
      expect(glow.z!).toBeLessThan(0);
      expect(glow.z!).toBeGreaterThan(STREET_DEPTH.near);
      const part = stormbyn.street!.find((one) => glow.at.x >= one.from && glow.at.x < one.to)!;
      expect(part.depth, `the candle at ${glow.at.x}`).toBe('near');
      expect(part.windows!.some((w) => glow.at.x > w.from && glow.at.x < w.to), `the candle at ${glow.at.x}`).toBe(true);
    }
  });
});

/** What must be seen clearly along the street: each big candy and the one at the goal (tests/unit/street.test.ts). */
const MARKS = [
  ...stormbyn.checkpoints!.map((at) => ({ what: 'the big candy', x: at.x })),
  { what: 'the big candy at the goal', x: stormbyn.goalX + 0.6 },
].filter((mark) => mark.x < END);

/** Whether a colour written as '#rrggbb' is a red: red is the candy's and the hook's. */
function red(colour: string): boolean {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(colour.slice(at, at + 2), 16)) as [number, number, number];
  return r > 110 && r > g * 1.8 && r > b * 1.8;
}

describe("Byn i stormen keeps the village street's rules", () => {
  const parts = stormbyn.street!;

  it('has exactly one thing behind every x, from its first ground to its last', () => {
    expect(parts[0]!.from).toBeLessThanOrEqual(stormbyn.ground[0]!.x);
    expect(parts[parts.length - 1]!.to).toBe(END);
    for (const [i, part] of parts.entries()) {
      expect(part.to, `the stretch from ${part.from}`).toBeGreaterThan(part.from);
      if (i > 0) expect(part.from, `the stretch from ${part.from}`).toBe(parts[i - 1]!.to);
    }
  });

  it('keeps every yard far off, gives every far stretch its foot, and every house its wall, boards and wares', () => {
    for (const part of parts) {
      if (part.kind === 'yard') expect(part.depth, `the yard from ${part.from}`).toBe('far');
      if (part.depth === 'far') expect(part.foot, `the far stretch from ${part.from}`).toBeDefined();
      if (part.kind === 'house') {
        expect(part.wall, `the house from ${part.from}`).toMatch(/^#[0-9a-f]{6}$/);
        expect(part.boards).toBeDefined();
        expect(part.goods).toBeDefined();
      }
    }
  });

  it('stands each near house on level ground, so that its foot is the ground he walks on', () => {
    for (const part of parts.filter((one) => one.depth === 'near')) {
      const heights = new Set<number>();
      for (let x = part.from + 0.25; x <= part.to - 0.25; x += 0.25) heights.add(heightAt(stormbyn, x));
      expect([...heights], `the house from ${part.from}`).toHaveLength(1);
    }
  });

  it("gives each window and door the kit's own width, inside its house and clear of the next opening", () => {
    for (const part of parts) {
      if (part.kind !== 'house') continue;
      const openings = [...(part.windows ?? []), ...(part.door ? [part.door] : [])].sort((a, b) => a.from - b.from);
      for (const w of part.windows ?? []) expect(w.to - w.from, `the window at ${w.from}`).toBeCloseTo(WINDOW_WIDE[part.goods!], 6);
      if (part.door) expect(part.door.to - part.door.from, `the door at ${part.door.from}`).toBeCloseTo(DOOR_WIDE, 6);
      for (const [i, opening] of openings.entries()) {
        expect(opening.from - 1, `the opening at ${opening.from}`).toBeGreaterThanOrEqual(i > 0 ? openings[i - 1]!.to + 1 : part.from);
        expect(opening.to + 1, `the opening at ${opening.from}`).toBeLessThanOrEqual(part.to);
      }
      for (const x of [...(part.pipes ?? []), ...(part.sign !== undefined ? [part.sign] : []), ...(part.cellar !== undefined ? [part.cellar] : [])]) {
        expect(x > part.from && x < part.to, `what stands at ${x}`).toBe(true);
      }
    }
  });

  it('stands no upright part of a near wall behind a big candy', () => {
    expect(MARKS.length).toBeGreaterThan(1);
    for (const [i, part] of parts.entries()) {
      if (part.depth !== 'near') continue;
      for (const upright of uprights(parts, i)) {
        for (const mark of MARKS) {
          const apart = Math.max(upright.from - mark.x, mark.x - upright.to);
          expect(apart, `the ${upright.what} at ${upright.from} to ${upright.to} behind ${mark.what} at ${mark.x}`).toBeGreaterThanOrEqual(1.5);
        }
      }
    }
  });

  it('keeps red for the candy: no red house at all on a dark night, and no hook', () => {
    expect(parts.filter((part) => part.wall !== undefined && red(part.wall))).toHaveLength(0);
    expect(stormbyn.hooks ?? []).toHaveLength(0);
  });

  it('hangs its awnings on near walls, inside their houses, one beside the other, each a whole number of scallops', () => {
    for (const part of parts) {
      if (!part.awnings) continue;
      expect(part.depth, `the house from ${part.from}`).toBe('near');
      for (const [i, awning] of part.awnings.entries()) {
        expect(awning.from).toBeGreaterThanOrEqual(part.from);
        expect(awning.to).toBeLessThanOrEqual(part.to);
        if (i > 0) expect(awning.from).toBeGreaterThan(part.awnings[i - 1]!.to);
        const scallops = (awning.to - awning.from) / AWNING.stripe;
        expect(scallops, `the awning at ${awning.from}`).toBeCloseTo(Math.round(scallops), 6);
      }
    }
  });

  it('lets every drop fall from the tip of a scallop, high over his highest jump, and keeps the crank clear of big candy', () => {
    const tips = awningTips(stormbyn);
    expect(stormbyn.drips!.length).toBeGreaterThanOrEqual(4);
    for (const drip of stormbyn.drips!) {
      const tip = tips.find((one) => Math.abs(one.x - drip.at.x) < 0.3);
      expect(tip, `the drip at ${drip.at.x}`).toBeDefined();
      expect(tip!.y - (drip.at.y + JUMP_APEX + 1)).toBeGreaterThan(2);
      expect(heightAt(stormbyn, drip.at.x)).toBe(drip.at.y);
    }
    for (const part of parts) {
      const first = part.awnings?.[0];
      if (!first) continue;
      for (const c of stormbyn.checkpoints!) expect(Math.abs(c.x - (first.from + AWNING.crank.in))).toBeGreaterThanOrEqual(1.5);
    }
  });

  it("stands its lamp posts on the far pavement, and behind no big candy when he is at it, on any screen", () => {
    const SCREENS = [[390, 844], [844, 390], [780, 360], [1180, 820], [1440, 900]] as const;
    const FOV = 30;
    const GROUND_FROM_BOTTOM = 0.35;
    const eyeAt = (x: number, facing: -1 | 1, width: number, height: number) => {
      const elofPx = Math.min(140, Math.max(75, height * 0.2));
      const viewHeight = Math.max(height / elofPx, 6 / (width / height));
      const distance = viewHeight / 2 / Math.tan((FOV * Math.PI) / 360);
      const y = groundAt(stormbyn, x);
      const look = cameraIntent({ x, y, facing, mode: 'free', groundY: y, standY: y, hook: null } as unknown as PlayerState, stormbyn.cameras);
      return { x: look.x, y: look.y + viewHeight * look.zoom * (0.5 - GROUND_FROM_BOTTOM), z: distance * look.zoom, half: viewHeight / 2 / distance };
    };
    for (const x of stormbyn.lampPosts!) {
      const part = parts.find((one) => x >= one.from && x < one.to)!;
      expect(part.depth, `the post at ${x}`).toBe('far');
    }
    let nearest = Infinity;
    let where = '';
    let highest = -Infinity;
    for (const [width, height] of SCREENS) {
      for (const mark of stormbyn.checkpoints!) {
        for (const facing of [-1, 1] as const) {
          const eye = eyeAt(mark.x, facing, width, height);
          for (const x of stormbyn.lampPosts!) {
            const scale = (eye.z + 0.7) / (eye.z - (LAMP_POST.z + 0.5));
            const left = eye.x + (x - 1.2 - eye.x) * scale;
            const right = eye.x + (x + 1.2 - eye.x) * scale;
            const apart = Math.max(left - (mark.x + 0.34), mark.x - 0.34 - right);
            if (apart >= nearest) continue;
            nearest = apart;
            where = `${width}x${height}: the post at ${x} behind the big candy at ${mark.x}, facing ${facing}`;
          }
        }
      }
      // And it goes on up out of every picture it is in.
      for (let x = stormbyn.ground[0]!.x + 0.5; x < END; x += 0.5) {
        for (const facing of [-1, 1] as const) {
          const eye = eyeAt(x, facing, width, height);
          const away = eye.z - LAMP_POST.z;
          for (const post of stormbyn.lampPosts!) {
            if (Math.abs(post - eye.x) > away * eye.half * (width / height) + 1.2) continue;
            highest = Math.max(highest, eye.y + away * eye.half);
          }
        }
      }
    }
    expect(nearest, where).toBeGreaterThan(0.25);
    const top = Math.min(...stormbyn.lampPosts!.map((x) => parts.find((one) => x >= one.from && x < one.to)!.foot!)) + LAMP_POST.tall;
    expect(top).toBeGreaterThan(highest + 2);
  });
});
