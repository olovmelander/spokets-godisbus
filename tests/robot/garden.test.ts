import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { garden } from '../../src/content/chapters/garden';
import { sv } from '../../src/content/sv';
import { settingsFor, simOptions } from '../../src/save/settings';
import { CANDY_MAGNET, JUMP_APEX } from '../../src/sim/constants';
import { createHud } from '../../src/ui/hud';
import { fakePage, listenThrough } from './listener';
import { decide, heightAt, playThrough } from './robot';

describe('Kapitel 1, Gården, in greybox', () => {
  for (const fps of [30, 60, 144]) {
    it(`the robot plays it from the deck to the forest's edge at ${fps} Hz`, () => {
      const result = playThrough(fps, garden, {}, 300);
      expect(result.goal, `it got to x ${result.x.toFixed(1)}`).toBe(true);
      expect(result.bubbles).toBe(0);
      expect(result.knocks).toBe(0);
      // Every big candy on the way.
      expect(result.checkpoint).toBe(garden.checkpoints!.length - 1);
      // The things it had to do: the ladybird, the dandelion, both curls, and Moa.
      expect(result.flags).toEqual(expect.arrayContaining(['ladybird', 'dandelion', 'moa', 'plane:board', 'goal']));
      // What was said, in order. Moa answers his call with her idea and her plan; her drawing blows away once that is
      // told (garden.ts, `garden:drawing-blown`), and "Kliv på när du vill" follows her "Oj!". With no page reading the
      // lines, each is over the moment it is said, so the gust comes before the robot boards.
      expect(result.said).toEqual(['garden:home', 'garden:kota', 'stomp', 'moa1', 'moa2', 'family:moa', 'family:plane', 'garden:pocket', 'garden:ready', 'landat:0', 'landat:1']);
    });
  }

  it('the robot leaves little candy behind', () => {
    const result = playThrough(60, garden, {}, 300);
    expect(result.missed.length, `it missed ${result.missed.map((i) => `${garden.candy[i]!.x},${garden.candy[i]!.y}`).join(' ')}`).toBeLessThanOrEqual(6);
  });

  it('on Lugnt it is played by running and Använd, with Hoppa only on the lace', () => {
    const game = new Game(garden, simOptions(settingsFor('lugnt')));
    let wasOffered = false;
    let wasSwinging = false;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const swinging = game.sim.curr.hook !== null;
      const { x, y, offered } = decide(game, garden);
      game.frame(1 / 60, { x: swinging ? 0 : x, y, hopHeld: false }, { hop: swinging && !wasSwinging, act: offered && !wasOffered, helper: false });
      wasOffered = offered;
      wasSwinging = swinging;
    }
    expect(game.sim.flags.has('goal'), `it got to x ${game.sim.curr.x.toFixed(1)}`).toBe(true);
    expect(game.sim.bubbles).toBe(0);
    expect(game.sim.knocks).toBe(0);
  });

  it('has a candy trail that is never lost: the next candy is at most 3 EL on', () => {
    const candy = garden.candy;
    for (let i = 1; i < candy.length; i++) {
      const far = Math.hypot(candy[i]!.x - candy[i - 1]!.x, candy[i]!.y - candy[i - 1]!.y);
      // Across the things he moves, the trail goes on where the thing will lie. In the flight he is fast
      // and the picture is wide, so the candy lies further apart.
      const x = candy[i]!.x;
      const wide = (x > 135 && x < 142) || (x > 166 && x < 206);
      expect(far, `from candy ${i - 1} (${candy[i - 1]!.x}) to ${i} (${x})`).toBeLessThanOrEqual(wide ? 6 : 3.2);
      expect(candy[i]!.x).toBeGreaterThanOrEqual(candy[i - 1]!.x);
    }
    expect(candy.length).toBeGreaterThanOrEqual(60);
  });

  it('has no candy in the ground, and none out of reach', () => {
    for (const [i, c] of garden.candy.entries()) {
      if ((garden.climbs ?? []).some((h) => Math.abs(h.x - c.x) < 0.5)) continue;
      if ((garden.hooks ?? []).some((h) => Math.hypot(h.x - c.x, h.y - c.y) < h.length + 0.7)) continue;
      if ((garden.movers ?? []).some((m) => Math.abs(m.stops[m.stops.length - 1]!.x - c.x) < m.width / 2 + 0.9)) continue;
      // In the flight, the candy is where the plane goes.
      if (c.x > 166 && c.x < 206) continue;
      const around = [-1.2, -0.6, 0, 0.6, 1.2].map((dx) => heightAt(garden, c.x + dx));
      expect(c.y, `candy ${i} at ${c.x} is over the ground`).toBeGreaterThan(heightAt(garden, c.x) + 0.15);
      expect(c.y, `candy ${i} at ${c.x} can be reached`).toBeLessThanOrEqual(Math.max(...around) + 0.5 + JUMP_APEX + CANDY_MAGNET - 0.1);
    }
  });

  it('has a big candy at least every 40 EL, and they come in order', () => {
    const at = [garden.spawn.x, ...garden.checkpoints!.map((c) => c.x), garden.goalX];
    for (let i = 1; i < at.length; i++) {
      expect(at[i]!).toBeGreaterThan(at[i - 1]!);
      // The flight to the forest's edge is one long ride that can't fail.
      if (at[i - 1]! < 160) expect(at[i]! - at[i - 1]!, `from ${at[i - 1]} to ${at[i]}`).toBeLessThanOrEqual(40);
    }
  });

  it('says only lines the game has words for, each short enough for a bubble', () => {
    const lines: Record<string, string> = sv.lines;
    for (const beat of garden.beats ?? []) {
      expect(lines[beat.line], `the line "${beat.line}"`).toBeDefined();
      expect(lines[beat.line]!.length).toBeLessThanOrEqual(40);
    }
    const verbs: Record<string, string> = sv.verbs;
    for (const spot of garden.spots ?? []) expect(verbs[spot.word ?? spot.verb]).toBeDefined();
  });

  it('Moa says where the ghost went even to a child who calls her the moment she is in reach', () => {
    // The robot runs flat out and presses every button at once, with the game's own bubbles reading every line.
    const result = listenThrough(garden, {}, 60, 300);
    const rootFingers = result.heard.find((one) => one.id === 'moa1');
    expect(rootFingers?.shown, '"Spöket kröp ner under roten!" is shown').not.toBeNull();
    // Shown at the root, not after he has flown off over the hedge, and not long after its moment.
    expect(rootFingers!.shownX).toBeLessThan(167);
    expect(rootFingers!.shown! - rootFingers!.due).toBeLessThan(3);
  });

  it('Moa answers his call with her idea and her plan, and the gust takes her drawing as she says "Oj!"', () => {
    const game = new Game(garden, {}, { checkpoint: 9, flags: ['scene:card', 'ladybird', 'dandelion', 'placed:curl', 'placed:bridge', 'memory'], placed: ['curl', 'bridge'] });
    const lines: Record<string, string> = sv.lines;
    const shown: { id: string; at: number }[] = [];
    let clock = 0;
    const waiting: string[] = [];
    const hud = createHud(fakePage({
      show(text) {
        const i = waiting.findIndex((id) => lines[garden.beats!.find((beat) => beat.id === id)!.line] === text);
        if (i >= 0) shown.push({ id: waiting.splice(i, 1)[0]!, at: clock });
      },
      hide() {},
    }), garden.candy.length, () => true, () => 1, () => {}, () => {}, (id) => game.sim.acknowledge(id));
    let told = game.sim.said.length;
    let blownAt = -1;
    let wasOffered = false;
    // A child who runs to Moa, calls her at once, and then stands by the plane and listens.
    for (let frame = 0; frame < 60 * 60 && !game.sim.flags.has('beat:garden:ready'); frame++) {
      clock += 1 / 60;
      const called = game.sim.flags.has('moa');
      const { x, offered } = decide(game, garden);
      const act = !called && offered;
      game.frame(1 / 60, { x: called ? 0 : x, y: 0, hopHeld: true, talking: hud.speaking() }, { hop: false, act: act && !wasOffered, helper: false });
      wasOffered = act;
      if (blownAt < 0 && game.sim.flags.has('garden:drawing-blown')) blownAt = clock;
      for (; told < game.sim.said.length; told++) {
        const id = game.sim.said[told]!;
        const beat = garden.beats!.find((one) => one.id === id);
        if (!beat) continue;
        waiting.push(id);
        hud.say(beat.who, beat.line, false, id);
      }
      hud.tick(1 / 60);
    }
    const order = shown.map((one) => one.id).filter((id) => ['moa1', 'family:moa', 'family:plane', 'garden:pocket', 'garden:ready'].includes(id));
    expect(order).toEqual(['moa1', 'family:moa', 'family:plane', 'garden:pocket', 'garden:ready']);
    // The drawing blows once her plan is told, and her "Oj!" comes with it, while it is still in the air (4.6 s).
    const plan = shown.find((one) => one.id === 'family:plane')!;
    const oj = shown.find((one) => one.id === 'garden:pocket')!;
    expect(blownAt).toBeGreaterThan(plan.at);
    expect(oj.at - blownAt).toBeLessThan(1);
  });

  it('keeps the ghost ahead of him all the way', () => {
    const game = new Game(garden);
    let wasAhead = false;
    let wasOffered = false;
    let behind = 0;
    for (let frame = 0; frame < 60 * 300 && !game.sim.flags.has('goal'); frame++) {
      const { x, y, ahead, offered } = decide(game, garden);
      game.frame(1 / 60, { x, y, hopHeld: true }, { hop: ahead && !wasAhead, act: offered && !wasOffered, helper: false });
      wasAhead = ahead;
      wasOffered = offered;
      const ghost = game.sim.ghost!;
      if (!ghost.gone && ghost.x < game.sim.curr.x - 0.5) behind++;
    }
    // A swing or a slide may carry him past it for a moment; it is never left behind for long.
    expect(behind).toBeLessThan(60 * 3);
  });
});
