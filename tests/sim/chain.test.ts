import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { foundFlag } from '../../src/content/kinds';
import { ELOF_HEIGHT, LACE_REACH, STEP } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { StepInput } from '../../src/sim/types';

// C1, Svingkedjan (plan §4.7): three swings in a row under the deck, and a hidden candy at the end.

const idle: StepInput = { x: 0, y: 0, hopHeld: false, hop: false, act: false };
const first = garden.hooks![0]!;
const crossing = garden.hooks![1]!;
const chain = garden.hooks!.filter((hook) => hook.extra);
const prize = garden.hidden!.find((h) => h.route)!;
const GULLY = { from: 62, to: 66.4 };

/** How far round the swing he is, in radians from straight down. */
const angleOf = (p: { x: number; y: number; hook: { x: number; y: number } | null }) =>
  p.hook ? Math.atan2(p.x - p.hook.x, p.hook.y - (p.y + ELOF_HEIGHT / 2)) : 0;

/**
 * Plays the stretch under the deck: runs right, throws the lace when it is offered, pushes the way he
 * swings, and lets go on the way up past `release` radians. In the air it throws again for as long as
 * `swings` allows: 1 is the ordinary way, 3 is the chain.
 */
function play(swings: number, release: number) {
  const sim = new Sim({ ...garden, spawn: { x: 49, y: 0.01 } });
  const taken: number[] = [];
  let was = 'free';
  for (let i = 0; i < 20 / STEP; i++) {
    const p = sim.curr;
    const input = { ...idle, x: 1 };
    if (p.mode === 'free' && p.verb === 'lace' && (p.grounded ? p.x < first.x : taken.length < swings)) input.act = true;
    if (p.mode === 'swing' && p.hook) {
      if (was !== 'swing') taken.push(p.hook.x);
      // On the crossing's own hook, the fourth, he lets go as on any crossing.
      if (p.vx > 0 && angleOf(p) > (taken.length === 4 ? 0.75 : release)) input.hop = true;
    }
    was = p.mode;
    sim.step(input);
    if (taken.length > 0 && sim.curr.grounded && sim.curr.mode === 'free') break;
    if (sim.bubbles > 0) break;
  }
  return { sim, taken };
}

describe('the swing chain under the deck', () => {
  it('is two hooks more, out of reach from the ground, and a candy high under the boards', () => {
    expect(chain).toHaveLength(2);
    // He stands with his middle half an Elof up: the lace does not reach that far.
    for (const hook of chain) expect(hook.y - ELOF_HEIGHT / 2).toBeGreaterThan(LACE_REACH);
    expect(prize.kind).toBe('gummibjorn');
    expect(prize.x).toBeGreaterThan(chain[1]!.x);
    expect(prize.x).toBeLessThan(GULLY.from);
    // Higher than the hook of the ordinary crossing: no swing on that one reaches it.
    expect(prize.y).toBeGreaterThan(crossing.y);
    // And far above a jump from the ground under it.
    expect(prize.y).toBeGreaterThan(3);
  });

  it('three swings in a row end at the candy', () => {
    // Not one exact moment: anywhere on the upper part of the swing will do.
    for (const release of [0.7, 0.8, 0.9]) {
      const { sim, taken } = play(3, release);
      expect(taken, `let go at ${release}`).toEqual([first.x, chain[0]!.x, chain[1]!.x]);
      expect(sim.flags.has(foundFlag(prize.kind)), `let go at ${release}`).toBe(true);
    }
  });

  it('and from there the hook of the crossing is in reach, and takes him over the gully', () => {
    // The last lace is short and slow to pump: higher than this he would swing there for a long while.
    for (const release of [0.7, 0.8, 0.85]) {
      const { sim, taken } = play(4, release);
      expect(taken, `let go at ${release}`).toEqual([first.x, chain[0]!.x, chain[1]!.x, crossing.x]);
      expect(sim.flags.has(foundFlag(prize.kind)), `let go at ${release}`).toBe(true);
      expect(sim.bubbles, `let go at ${release}`).toBe(0);
      expect(sim.curr.x, `let go at ${release}`).toBeGreaterThan(GULLY.to);
    }
  });

  it('a fall into the gully after the candy costs nothing: the bubble carries him back, and he keeps it', () => {
    const { sim } = play(3, 0.8);
    for (let i = 0; i < 6 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step(idle);
    expect(sim.curr.grounded).toBe(true);
    expect(sim.curr.x).toBeLessThan(GULLY.from);
    expect(sim.flags.has(foundFlag(prize.kind))).toBe(true);
  });

  it('the ordinary way does not find it, with one swing or with the crossing', () => {
    const { sim, taken } = play(1, 0.8);
    expect(taken).toEqual([first.x]);
    expect(sim.flags.has(foundFlag(prize.kind))).toBe(false);
    // The crossing, from the edge of the gully: its arc lies under the candy.
    const over = new Sim({ ...garden, spawn: { x: 60.7, y: 0.01 } });
    let top = 0;
    for (let i = 0; i < 12 / STEP; i++) {
      const p = over.curr;
      const input = { ...idle, x: 1 };
      if (p.mode === 'free' && p.grounded && p.verb === 'lace') input.act = true;
      if (p.mode === 'swing' && p.vx > 0 && angleOf(p) > 0.75) input.hop = true;
      over.step(input);
      top = Math.max(top, over.curr.y);
      if (over.curr.grounded && over.curr.x > GULLY.to) break;
    }
    expect(over.curr.x).toBeGreaterThan(GULLY.to);
    expect(over.bubbles).toBe(0);
    expect(over.flags.has(foundFlag(prize.kind))).toBe(false);
    expect(top + ELOF_HEIGHT / 2).toBeLessThan(prize.y - 0.6);
    // Nor does a jump from the ground under it.
    const under = new Sim({ ...garden, spawn: { x: prize.x, y: 0.01 } });
    for (let i = 0; i < 0.2 / STEP; i++) under.step(idle);
    under.step({ ...idle, hop: true, hopHeld: true });
    for (let i = 0; i < 0.9 / STEP; i++) under.step({ ...idle, hopHeld: true });
    expect(under.flags.has(foundFlag(prize.kind))).toBe(false);
  });

  it('in the air, the hook he let go of is not offered again, so Använd takes the next one', () => {
    // One hook, one swing, and no throw in the air: from letting go until he lands, the lace is never offered.
    const sim = new Sim({ ...garden, hooks: [first], spawn: { x: 49, y: 0.01 } });
    let swung = false;
    let offeredInAir = 0;
    for (let i = 0; i < 12 / STEP; i++) {
      const p = sim.curr;
      const input = { ...idle, x: 1 };
      if (!swung && p.mode === 'free' && p.grounded && p.verb === 'lace') input.act = true;
      if (p.mode === 'swing') {
        swung = true;
        if (p.vx > 0 && angleOf(p) > 0.8) input.hop = true;
      }
      if (swung && p.mode === 'free' && !p.grounded && p.verb === 'lace') offeredInAir++;
      sim.step(input);
      if (swung && sim.curr.mode === 'free' && sim.curr.grounded) break;
    }
    expect(swung).toBe(true);
    expect(offeredInAir).toBe(0);
    // Back on the ground under it, it is his to throw at again.
    const back = new Sim({ ...garden, hooks: [first], spawn: { x: first.x - 1, y: 0.01 } });
    for (let i = 0; i < 0.3 / STEP; i++) back.step(idle);
    expect(back.curr.verb).toBe('lace');
  });

  it('the helper never points up at it: the way on is the crossing', () => {
    const sim = new Sim({ ...garden, spawn: { x: 57.6, y: 0.01 } }, {}, { flags: ['ladybird'] });
    for (let i = 0; i < 0.3 / STEP; i++) sim.step(idle);
    const hint = hintFor(sim, garden)!;
    expect(hint.verb).toBe('lace');
    expect(hint.at).toEqual({ x: crossing.x, y: crossing.y });
  });
});
