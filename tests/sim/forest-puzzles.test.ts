import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { Game } from '../../src/app/game';
import { granskog } from '../../src/content/chapters/granskog';
import { settingsFor, simOptions } from '../../src/save/settings';
import { MOVE_TIME, STEP } from '../../src/sim/constants';
import { counterweightTarget, hintFor } from '../../src/sim/help';
import type { SimStart, StepInput } from '../../src/sim/types';
import { decide } from '../robot/robot';

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const progress: SimStart = { checkpoint: 7, flags: ['berry', 'jay', 'antlift'], placed: ['twig'] };

function step(game: Game, input: Partial<StepInput> = {}) {
  const now = { ...idle, ...input };
  game.frame(STEP, { x: now.x, y: now.y, hopHeld: now.hopHeld }, { hop: now.hop, act: now.act, helper: now.help ?? false });
}

function run(game: Game, seconds: number, input: Partial<StepInput> = {}) {
  for (let i = 0; i < Math.round(seconds / STEP); i++) step(game, input);
}

function diagnostic(game: Game) {
  return JSON.stringify({ player: game.sim.curr, flags: [...game.sim.flags], movers: game.sim.movers.filter((m) => m.def.id.startsWith('cone')).map((m) => ({ id: m.def.id, x: m.x, stop: m.stop })) });
}

/** Walk to a chosen place; a blocked jump is an ordinary player input, never a teleport or awarded flag. */
function walkTo(game: Game, x: number) {
  let jumpedAt = -120;
  for (let i = 0; i < 30 / STEP; i++) {
    const p = game.sim.curr;
    if (Math.abs(x - p.x) < 0.07 && p.grounded && p.mode === 'free') {
      run(game, 0.15);
      expect(game.sim.curr.x, diagnostic(game)).toBeCloseTo(x, 0);
      return;
    }
    const blocked = p.grounded && Math.abs(p.vx) < 0.05 && Math.abs(x - p.x) > 0.25;
    const hop = blocked && i - jumpedAt > 72;
    if (hop) jumpedAt = i;
    step(game, { x: Math.sign(x - p.x) * 0.6, hop, hopHeld: i - jumpedAt < 90 });
  }
  expect.fail(`Could not walk to ${x}: ${diagnostic(game)}`);
}

function callPappa(game: Game) {
  run(game, 0.2);
  walkTo(game, 108.2);
  expect(game.sim.curr.word).toBe('callPappa');
  step(game, { act: true });
  run(game, 0.2);
  expect(game.sim.flags.has('seesaw')).toBe(true);
}

/** Follow the same spatial decisions as the chapter robot through the real input queue. */
function finishLaunch(game: Game, fps = 60) {
  let wasAhead = false, wasOffered = false;
  for (let frame = 0; frame < fps * 90; frame++) {
    if (game.sim.flags.has('launch') && game.sim.curr.mode === 'free' && game.sim.curr.x > 126) return;
    const { x, y, ahead, offered } = decide(game, granskog);
    game.frame(1 / fps, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
    wasAhead = ahead; wasOffered = offered;
  }
  expect.fail(`Could not complete the heavy launch: ${diagnostic(game)}`);
}

function trial(game: Game) {
  // The little cone is pushed left, so Elof approaches its right side without entering the ravine.
  walkTo(game, 116.72);
  expect(game.sim.curr.verb).toBe('push');
  expect(game.sim.actionAt?.x).toBeCloseTo(116, 1);
  step(game, { act: true });
  run(game, MOVE_TIME + 0.2);
  expect(game.sim.placed).toContain('cone-small');
  expect(game.sim.flags.has('placed:cone')).toBe(false);
  expect(counterweightTarget(game.sim, granskog)).toMatchObject({ at: { x: 113.2, y: -8 }, word: 'standOn' });
  walkTo(game, 113.2);
  expect(game.sim.curr.word).toBe('standOn');
  step(game, { act: true });
  expect(game.sim.curr.mode).toBe('ride');
  run(game, 1.9);
  expect(game.sim.flags.has('seesaw:trial')).toBe(true);
  expect(game.sim.flags.has('launch')).toBe(false);
  expect(game.sim.curr.mode).toBe('free');
  expect(game.sim.curr.grounded).toBe(true);
  expect(game.sim.curr.x).toBeCloseTo(116.5, 1);
  expect(game.sim.curr.x).toBeLessThan(118);
  expect(game.sim.curr.y).toBeCloseTo(-8, 1);
  expect(game.sim.bubbles).toBe(0);
}

describe('Pappas two counterweights on the actual forest ground', () => {
  it('preserves every saved candy and checkpoint index from the 26956e6 layout', () => {
    expect(granskog.checkpoints).toHaveLength(12);
    expect(granskog.candy).toHaveLength(103);
    // Hash the ordered authored arrays, including coordinates and candy appearance flags. This digest
    // came from evaluating granskog.ts at 26956e6, so moving/reordering an entry cannot silently migrate saves.
    const layout = JSON.stringify({ checkpoints: granskog.checkpoints, candy: granskog.candy });
    expect(createHash('sha256').update(layout).digest('hex'))
      .toBe('d6bffb10165b32984d206eb54a01ed3ed09380b7091c3962475b78d29c4fb5d9');
  });

  it('the small cone gives a safe trial, then a real return for the heavy cone crosses the ravine', () => {
    const game = new Game(granskog, {}, progress);
    callPappa(game);
    trial(game);
    const target = counterweightTarget(game.sim, granskog)!;
    expect(target.verb).toBeNull();
    expect(target.at.x).toBeLessThan(103.4 - 0.55);
    expect(hintFor(game.sim, granskog)).toEqual(target);
    finishLaunch(game);
    expect(game.sim.flags.has('placed:cone')).toBe(true);
    expect(game.sim.placed).toEqual(expect.arrayContaining(['twig', 'cone', 'cone-small']));
    expect(game.sim.curr.x).toBeCloseTo(128.4, 0);
    expect(game.sim.bubbles).toBe(0);
  });

  for (const fps of [30, 144]) {
    it(`choosing the heavy cone first works at ${fps} Hz without requiring the trial`, () => {
      const game = new Game(granskog, {}, progress);
      callPappa(game);
      finishLaunch(game, fps);
      expect(game.sim.flags.has('placed:cone')).toBe(true);
      expect(game.sim.flags.has('seesaw:trial')).toBe(false);
      expect(game.sim.placed).not.toContain('cone-small');
      expect(game.sim.bubbles).toBe(0);
    });
  }

  it('the optional small placement survives loading a checkpoint before the trial', () => {
    const game = new Game(granskog, {}, progress);
    callPappa(game);
    trial(game);
    const loaded = new Game(granskog, {}, { checkpoint: game.sim.checkpoint, placed: game.sim.placed, flags: [...game.sim.flags] });
    const small = loaded.sim.movers.find((m) => m.def.id === 'cone-small')!;
    expect(small.x).toBeCloseTo(114.6, 3);
    expect(small.stop).toBe(small.def.stops.length - 1);
    expect(loaded.sim.placed).toContain('cone-small');
    expect(loaded.sim.flags.has('placed:cone-small')).toBe(true);
    finishLaunch(loaded);
    expect(loaded.sim.flags.has('launch')).toBe(true);
    expect(loaded.sim.bubbles).toBe(0);
  });

  it('an old checkpoint 7 save keeps its completed cone and can restart the crossing', () => {
    const game = new Game(granskog, {}, { ...progress, placed: ['twig', 'cone'], flags: [...progress.flags!, 'seesaw', 'placed:cone', 'launch'] });
    expect(game.sim.movers.find((m) => m.def.id === 'cone')!.x).toBeCloseTo(114.6, 3);
    expect(game.sim.flags.has('launch')).toBe(false);
    run(game, 0.2);
    expect(hintFor(game.sim, granskog)).toMatchObject({ at: { x: 113.2, y: -8 }, word: 'standOn' });
    finishLaunch(game);
    expect(game.sim.flags.has('seesaw:trial')).toBe(false);
    expect(game.sim.bubbles).toBe(0);
  });

  it('a half-pushed heavy cone goes home on leaving or loading, then remains solvable', () => {
    const game = new Game(granskog, {}, progress);
    callPappa(game);
    walkTo(game, 102.4);
    expect(game.sim.curr.verb).toBe('push');
    step(game, { act: true });
    run(game, MOVE_TIME + 0.2);
    const heavy = game.sim.movers.find((m) => m.def.id === 'cone')!;
    expect(heavy.x).toBeCloseTo(106.2, 3);
    expect(heavy.stop).toBe(1);
    expect(game.sim.placed).not.toContain('cone');
    expect(game.sim.flags.has('placed:cone')).toBe(false);

    const loaded = new Game(granskog, {}, { checkpoint: game.sim.checkpoint, placed: game.sim.placed, flags: [...game.sim.flags] });
    expect(loaded.sim.movers.find((m) => m.def.id === 'cone')!.x).toBeCloseTo(103.4, 3);
    expect(loaded.sim.flags.has('seesaw')).toBe(true);
    finishLaunch(loaded);
    expect(loaded.sim.bubbles).toBe(0);

    walkTo(game, 95.2);
    run(game, MOVE_TIME + 0.2);
    expect(heavy.stop).toBe(0);
    expect(heavy.x).toBeCloseTo(103.4, 3);
    expect(game.sim.flags.has('seesaw')).toBe(true);
    finishLaunch(game);
    expect(game.sim.flags.has('launch')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
  });

  it('all three requested hints consistently show the return to the heavy push side', () => {
    const game = new Game({ ...granskog, spawn: { x: 116.5, y: -7.99 } }, {}, { flags: ['seesaw', 'family:seesaw-ready', 'beat:family:seesaw', 'seesaw:trial'], placed: ['twig', 'cone-small'] });
    run(game, 0.2);
    const target = counterweightTarget(game.sim, granskog)!;
    const x = game.sim.curr.x;
    for (const level of [1, 2, 3]) {
      step(game, { help: true });
      run(game, 0.15);
      expect(game.sim.help.step).toBe(level);
      expect(game.sim.help.at).toEqual(target.at);
      expect(game.sim.help.verb).toBeNull();
      expect(game.sim.curr.x).toBeCloseTo(x, 3);
      expect(game.sim.flags.has('placed:cone')).toBe(false);
    }
  });

  it('Lugnt automatically clears the cone in both directions and finishes without Hoppa', () => {
    const game = new Game({ ...granskog, spawn: { x: 100.5, y: -7.17 } }, simOptions(settingsFor('lugnt')), { flags: progress.flags, placed: progress.placed });
    let wasOffered = false;
    for (let frame = 0; frame < 60 * 90; frame++) {
      if (game.sim.flags.has('launch') && game.sim.curr.mode === 'free' && game.sim.curr.x > 126) break;
      const { x, y, offered } = decide(game, granskog);
      game.frame(1 / 60, { x, y, hopHeld: false }, { hop: false, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
    }
    expect(game.sim.flags.has('launch'), diagnostic(game)).toBe(true);
    expect(game.sim.curr.x).toBeGreaterThan(126);
    expect(game.sim.bubbles).toBe(0);
  });
});

describe('the optional vittra doorway on its real return root', () => {
  it('skipping the optional gift still lets him descend to the main trail', () => {
    const game = new Game(granskog, {}, { checkpoint: 3, flags: ['berry', 'jay', 'antlift'], placed: ['twig'] });
    run(game, 0.2);
    walkTo(game, 64.4);
    expect(game.sim.curr.word).not.toBe('leaveBerry');
    walkTo(game, 65.8);
    expect(game.sim.curr.verb).toBe('slide');
    step(game, { act: true });
    // Start moving as the slide releases, rather than waiting on the climbable root at its bottom.
    for (let i = 0; i < 2 / STEP && game.sim.curr.mode === 'slide'; i++) step(game);
    walkTo(game, 68.4);
    expect(game.sim.curr.y).toBeCloseTo(0, 1);
    expect(game.sim.checkpoint).toBe(4);
    expect(game.sim.flags.has('vittra:gift')).toBe(false);
    expect(game.sim.flags.has('vittra:gift:away')).toBe(false);
    expect(game.sim.flags.has('keepsake:vittra')).toBe(false);
    expect(game.sim.bubbles).toBe(0);
  });

  it('leaving a berry, descending and climbing back reveals the saved clue once', () => {
    const game = new Game(granskog, {}, { checkpoint: 3, flags: ['berry', 'jay', 'antlift', 'vittra:berry'], placed: ['twig'] });
    run(game, 0.2);
    walkTo(game, 64.4);
    expect(game.sim.curr.word).toBe('leaveBerry');
    step(game, { act: true });
    run(game, 1);
    expect(game.sim.flags.has('keepsake:vittra')).toBe(false);
    // Stand on the last solid part of the hilltop; the root itself hangs beyond its edge.
    walkTo(game, 65.8);
    expect(game.sim.curr.verb).toBe('slide');
    step(game, { act: true });
    run(game, 3);
    expect(game.sim.curr.y).toBeCloseTo(0, 1);
    expect(game.sim.flags.has('vittra:gift:away')).toBe(true);
    expect(game.sim.flags.has('keepsake:vittra')).toBe(false);
    expect(hintFor(game.sim, granskog)).toMatchObject({ at: { x: 66.3, y: 10 } });
    for (let i = 0; i < 12 / STEP; i++) {
      const p = game.sim.curr;
      if (p.mode === 'free' && p.grounded && p.y > 9.9) break;
      step(game, { x: Math.max(-0.6, Math.min(0.6, 66.3 - p.x)), y: 1 });
    }
    expect(game.sim.curr.y, diagnostic(game)).toBeCloseTo(10, 1);
    walkTo(game, 64.4);
    expect(game.sim.flags.has('keepsake:vittra')).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    const loaded = new Game(granskog, {}, { checkpoint: 3, flags: [...game.sim.flags], placed: game.sim.placed });
    run(loaded, 0.2);
    expect(loaded.sim.flags.has('keepsake:vittra')).toBe(true);
    expect(loaded.sim.flags.has('vittra:gift')).toBe(true);
  });
});
