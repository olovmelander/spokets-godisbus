import { describe, expect, it } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { lineHeight } from '../../src/render/lines';
import { trailShape } from '../../src/render/candy';
import { settingsFor, simOptions } from '../../src/save/settings';
import { cameraIntent } from '../../src/sim/camera-intent';
import { ELOF_HALF_WIDTH, ELOF_HEIGHT, FALL_LIMIT, JUMP_APEX, LACE_REACH, LEDGE_GIVE, MOVE_TIME, MOVER_RESET, RUNNING_JUMP_REACH, STEP, SWING_MAX } from '../../src/sim/constants';
import { hintFor } from '../../src/sim/help';
import { Sim } from '../../src/sim/sim';
import type { ChapterData, Vec } from '../../src/sim/types';
import { heightAt, playThrough } from '../robot/robot';
import { angleOf, idle, jump, leap, run, runPast, swingAlong, use, walkTo } from './drive';

// The puzzle of Gården (docs/level-design.md, point 8): the curl on the ring, over the birch's first root.
//
// He sees five sweets on a bough beyond the root. The catch: the bough is too high from the ground and too far
// from the plate of bark over the root's top, and the red ring that hangs between them has a curl of shaving
// round it. The insight is the chapter's rule the other way round: the lace pulls as well as swings. From the
// bark Använd pulls the curl along its string, off the ring; then the same button throws the lace at the ring
// it hid, and the swing sets him down among the sweets. Two things to act on, and the prize. All on Äventyr
// unless a test says otherwise.

const piece = garden.movers!.find((mover) => mover.id === 'ring-curl')!;
/** The only ring between the gully and the boulder: the chain's nails lie before, the clothes line's rings after. */
const ring = garden.hooks!.find((hook) => hook.extra && hook.x > 66.4 && hook.x < 100)!;
const string = garden.lines!.find((line) => ring.x > line.from.x && ring.x < line.to.x)!;
const bark = garden.ledges!.find((ledge) => ledge.look === 'bark')!;
const bough = garden.ledges!.find((ledge) => ledge.look === 'branch')!;
const zone = garden.cameras!.find((one) => one.above !== undefined && one.from < ring.x && one.to > ring.x)!;
const side = garden.side!;
/** The prize: the side candy over the bough, by its place in the chapter's list. */
const prize = side.flatMap((candy, i) => (Math.abs(candy.x - bough.x) <= bough.width / 2 + 0.3 && candy.y > bough.y ? [i] : []));
/** The one he sees first: the nearest to where he comes from. */
const tell = prize.reduce((a, b) => (side[a]!.x < side[b]!.x ? a : b));
const [home, parked] = piece.stops as [Vec, Vec];
const handle = (at: Vec): Vec => ({ x: at.x + piece.ring!.x, y: at.y + piece.ring!.y });
const solved = { flags: [`placed:${piece.id}`], placed: [piece.id] };

const right = (ledge: { x: number; width: number }) => ledge.x + ledge.width / 2;
const left = (ledge: { x: number; width: number }) => ledge.x - ledge.width / 2;
const seconds = (sim: Sim, since: number) => (sim.steps - since) * STEP;
const curl = (sim: Sim) => sim.movers.find((mover) => mover.def.id === piece.id)!;
const taken = (sim: Sim) => prize.filter((i) => sim.collectedSide[i]).length;
/**
 * He stands on the trail's ground, and not on a ledge over it. On the root's slopes the corner of his feet
 * carries him, a little above the line under his middle: half his width up a slope of one in two.
 */
const onTheTrail = (sim: Sim) => sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - heightAt(garden, sim.curr.x)) < 0.12;
const standsOn = (sim: Sim, ledge: { x: number; y: number; width: number }) =>
  sim.curr.mode === 'free' && sim.curr.grounded && Math.abs(sim.curr.y - ledge.y) < 0.1 && Math.abs(sim.curr.x - ledge.x) <= ledge.width / 2 + 0.2;
const where = (sim: Sim) => `at ${sim.curr.x.toFixed(2)},${sim.curr.y.toFixed(2)} (${sim.curr.mode})`;

/** On the trail at an x, having stood a moment. */
const at = (x: number, start = {}, chapter: ChapterData = garden) => {
  const sim = new Sim({ ...chapter, spawn: { x, y: heightAt(chapter, x) + 0.01 } }, {}, start);
  run(sim, 0.3);
  return sim;
};
/** On a ledge at an x. */
const on = (ledge: { y: number }, x: number, start = {}, options = {}) => {
  const sim = new Sim({ ...garden, spawn: { x, y: ledge.y + 0.06 } }, options, start);
  run(sim, 0.3);
  return sim;
};
/** Waits until he stands again. */
function settle(sim: Sim): void {
  for (let i = 0; i < 4 / STEP && !(sim.curr.mode === 'free' && sim.curr.grounded); i++) sim.step(idle);
  run(sim, 0.2);
}
/** From the trail, wherever he stands on it near the root: under the bark, and up through it with a held jump. */
function upOnTheBark(sim: Sim): void {
  expect(onTheTrail(sim), where(sim)).toBe(true);
  expect(walkTo(sim, bark.x), where(sim)).toBe(true);
  jump(sim);
  settle(sim);
  expect(standsOn(sim, bark), where(sim)).toBe(true);
}
/** One press of Använd where it says Dra, and the curl's slide along the string. */
function pullTheCurl(sim: Sim): void {
  expect(sim.curr.verb).toBe('pull');
  expect(sim.actionAt).toEqual(handle(home));
  use(sim);
  run(sim, MOVE_TIME + 0.1);
  expect(curl(sim).x).toBeCloseTo(parked.x, 3);
}
/** The swing from the bark to the bough, a walk along it over every sweet, and off its far end onto the lawn. */
function swingToThePrize(sim: Sim, release = 0.8): void {
  expect(sim.curr.verb).toBe('lace');
  expect(sim.actionAt).toMatchObject({ x: ring.x, y: ring.y });
  expect(swingAlong(sim, 1, 1, release), `let go at ${release}`).toEqual([ring.x]);
  expect(standsOn(sim, bough), `let go at ${release}: he came down ${where(sim)}`).toBe(true);
  walkTo(sim, left(bough) + 0.15);
  walkTo(sim, right(bough));
  expect(taken(sim)).toBe(prize.length);
  for (let i = 0; i < 6 / STEP && sim.curr.x < right(bough) + 0.7; i++) sim.step({ ...idle, x: 0.5 });
  settle(sim);
  expect(onTheTrail(sim), where(sim)).toBe(true);
}
/** The whole of it, from the trail back to the trail. */
function solve(sim: Sim, release = 0.8): void {
  upOnTheBark(sim);
  if (curl(sim).stop === 0) pullTheCurl(sim);
  swingToThePrize(sim, release);
}

/**
 * What the picture holds on the smallest screen the game is drawn for, a phone 780 by 360 held sideways: 4.8 EL
 * high and 10.4 wide at zoom 1, with the place the camera looks at 35 % up (src/render/view.ts).
 */
function picture(sim: Sim) {
  const look = cameraIntent(sim.curr, garden.cameras);
  const high = 4.8 * look.zoom;
  const wide = (high * 780) / 360;
  return { left: look.x - wide / 2, right: look.x + wide / 2, bottom: look.y - 0.35 * high, top: look.y + 0.65 * high, zoom: look.zoom };
}
const holds = (view: ReturnType<typeof picture>, point: Vec, margin = 0.2) =>
  point.x > view.left + margin && point.x < view.right - margin && point.y > view.bottom + margin && point.y < view.top - margin;

/** The stretch of the trail the puzzle lies over, with room to either side. */
const FROM = 78;
const TO = 92;

describe('the curl on the ring: its pieces', () => {
  it('are a curl on a string with the swing\'s ring inside it, and a bough with five sweets: two things to act on', () => {
    expect(piece).toMatchObject({ verb: 'pull', look: 'curl', optional: true });
    expect(piece.stops).toHaveLength(2);
    expect(piece.needs).toBeUndefined();
    expect(piece.on).toBeUndefined();
    // At home the curl hangs round the ring: the ring is well inside its box.
    expect(Math.abs(ring.x - home.x)).toBeLessThan(piece.width / 2 - 0.3);
    expect(ring.y - home.y).toBeGreaterThan(0.3);
    expect(home.y + piece.height - ring.y).toBeGreaterThan(0.3);
    // As it is drawn (src/render/props.ts) the curl is a coil in the middle of its box, as wide as the thing:
    // the swing's ring hangs inside the coil, and the curl's own ring sits on its rim, on the side it is pulled to.
    const coil = { x: home.x, y: home.y + piece.height / 2, radius: Math.min(piece.width, piece.height) / 2 };
    expect(Math.hypot(ring.x - coil.x, ring.y - coil.y)).toBeLessThan(coil.radius - 0.2);
    expect(Math.abs(Math.hypot(handle(home).x - coil.x, handle(home).y - coil.y) - coil.radius)).toBeLessThan(0.2);
    expect(handle(home).x).toBeLessThan(home.x);
    expect(parked.x).toBeLessThan(home.x);
    // Parked, it is clear of the ring, and of the lace from the bark to the ring.
    expect(home.x - parked.x).toBeGreaterThan(piece.width + 1);
    expect(parked.y).toBeGreaterThan(bark.y + ELOF_HEIGHT + JUMP_APEX);
    // The ring hangs from the string, and the curl by its own ring, at home and where it is parked.
    expect(ring.extra).toBe(true);
    expect(lineHeight(string, ring.x) - ring.y).toBeGreaterThan(0.25);
    for (const stop of [home, parked]) {
      const hangs = lineHeight(string, handle(stop).x) - handle(stop).y;
      expect(hangs).toBeGreaterThan(0.1);
      expect(hangs).toBeLessThan(0.4);
      expect(handle(stop).x).toBeGreaterThan(string.from.x);
      expect(handle(stop).x).toBeLessThan(string.to.x);
    }
    // The swing is meant to end on the bough: with Hjälp med svingen it is steered there.
    expect(ring.land).toEqual({ x: bough.x, y: bough.y });
    // Five sweets over the bough, there from the start, the nearest of them a heart.
    expect(prize).toHaveLength(5);
    expect(prize).toEqual(side.map((_, i) => i).slice(-5));
    for (const i of prize) expect(side[i]!.after).toBeUndefined();
    expect(trailShape(tell, 'side')).toBe(3);
  });

  it('lie 10 EL clear of every side way and of every big candy, where the trail runs plain over the root', () => {
    const mine = [string.from.x, string.to.x, left(bark), right(bark), left(bough), right(bough), ...prize.map((i) => side[i]!.x), home.x, parked.x, ring.x];
    const others = [
      ...garden.ledges!.filter((ledge) => ledge !== bark && ledge !== bough).flatMap((ledge) => [left(ledge), right(ledge)]),
      ...garden.hooks!.filter((hook) => hook !== ring).map((hook) => hook.x),
      ...garden.checkpoints!.map((big) => big.x),
    ];
    for (const x of mine) for (const other of others) expect(Math.abs(x - other), `${x} and ${other}`).toBeGreaterThanOrEqual(10);
    // The trail asks for no jump there, and nothing of the story is to be used there.
    expect(garden.jumps!.some((one) => one.at.x > FROM && one.at.x < TO)).toBe(false);
    expect(garden.spots!.filter((spot) => spot.at.x > FROM && spot.at.x < TO).every((spot) => spot.note !== undefined)).toBe(true);
  });

  it('the bark is one held jump over the root\'s top, the bough out of every jump\'s reach, and both a soft landing', () => {
    // The bark lies over the level top of the root, 0.9 up, all along.
    for (let x = left(bark); x <= right(bark); x += 0.05) {
      expect(bark.y - heightAt(garden, x), `the bark over ${x.toFixed(2)}`).toBeCloseTo(0.9, 5);
    }
    // The bough: clearly more than a held jump above the ground under it and above the root's top beside it...
    for (let x = left(bough) - 1.6; x <= right(bough) + 0.2; x += 0.05) {
      expect(bough.y - heightAt(garden, x), `the bough over ${x.toFixed(2)}`).toBeGreaterThanOrEqual(JUMP_APEX + LEDGE_GIVE + 0.1);
    }
    // ...and further from the bark than a running jump carries.
    expect(left(bough) - right(bark)).toBeGreaterThan(RUNNING_JUMP_REACH + 0.5);
    expect(bough.y).toBeGreaterThan(bark.y);
    // A held jump off either comes down softly, even where it lands on the lawn.
    for (const ledge of [bark, bough]) expect(ledge.y + 0.05 + JUMP_APEX).toBeLessThan(FALL_LIMIT);
    for (const ledge of [bark, bough]) {
      for (const dir of [1, -1] as const) {
        const sim = on(ledge, ledge.x, ledge === bough ? solved : {});
        leap(sim, dir, ledge.x + dir * (ledge.width / 2 - 0.1));
        settle(sim);
        expect(sim.bubbles, `a jump ${dir > 0 ? 'right' : 'left'} off the ${ledge.look}`).toBe(0);
        expect(onTheTrail(sim), where(sim)).toBe(true);
      }
    }
  });

  it('the curl\'s own ring is out of the lace\'s reach from the root, and in reach from anywhere on the bark', () => {
    for (let x = FROM; x <= TO; x += 0.05) {
      const middle = { x, y: heightAt(garden, x) + ELOF_HEIGHT / 2 };
      expect(Math.hypot(handle(home).x - middle.x, handle(home).y - middle.y), `from the trail at ${x.toFixed(2)}`).toBeGreaterThan(LACE_REACH + 0.2);
    }
    for (let x = left(bark) - ELOF_HALF_WIDTH; x <= right(bark) + ELOF_HALF_WIDTH; x += 0.05) {
      const middle = { x, y: bark.y + ELOF_HEIGHT / 2 };
      expect(Math.hypot(handle(home).x - middle.x, handle(home).y - middle.y), `from the bark at ${x.toFixed(2)}`).toBeLessThan(LACE_REACH - 0.05);
      expect(Math.hypot(ring.x - middle.x, ring.y - middle.y)).toBeLessThan(LACE_REACH - 0.5);
    }
    // And played: Dra is offered all along the bark, and Kasta snöret in its place once the curl is gone.
    for (let x = left(bark) - 0.15; x <= right(bark) + 0.151; x += 0.1) {
      const sim = on(bark, x);
      expect(standsOn(sim, bark)).toBe(true);
      expect(sim.curr.verb, `on the bark at ${x.toFixed(2)}`).toBe('pull');
      use(sim);
      run(sim, MOVE_TIME + 0.1);
      expect(sim.curr.verb, `on the bark at ${x.toFixed(2)}, the curl gone`).toBe('lace');
    }
  });
});

describe('the curl on the ring: the solution', () => {
  it('from the trail back to the trail: up on the bark, Dra, Kasta snöret, the swing, and five sweets on the bough', () => {
    const times: string[] = [];
    // Not one exact moment: anywhere on the upper part of the swing will do.
    for (const release of [0.6, 0.7, 0.8, 0.9]) {
      const sim = at(79);
      const began = sim.curr.x;
      const since = sim.steps;
      expect(taken(sim)).toBe(0);
      solve(sim, release);
      expect(sim.curr.x).toBeGreaterThan(began);
      expect(sim.curr.x).toBeGreaterThan(right(bough));
      expect(taken(sim)).toBe(5);
      expect(sim.bubbles).toBe(0);
      expect(sim.knocks).toBe(0);
      expect(sim.flags.has(`placed:${piece.id}`)).toBe(true);
      expect(sim.placed).toContain(piece.id);
      expect(seconds(sim, since), `let go at ${release}`).toBeLessThan(20);
      times.push(`${release}: ${seconds(sim, since).toFixed(1)} s`);
    }
    console.log(`the curl on the ring, solved from x 79 to the lawn beyond the bough, by where he lets go: ${times.join(', ')}`);
  });

  it('flows: with the stick held on from the throw he lands, runs along the bough over all five and drops to the lawn', () => {
    for (const release of [0.6, 0.8]) {
      const sim = on(bark, bark.x, solved);
      expect(swingAlong(sim, 1, 1, release)).toEqual([ring.x]);
      runPast(sim, right(bough) + 1.5);
      settle(sim);
      expect(taken(sim), `let go at ${release}`).toBe(5);
      expect(onTheTrail(sim)).toBe(true);
      expect(sim.bubbles).toBe(0);
    }
  });

  it('forgives where he stands and when he lets go: from anywhere on the bark, anywhere on the upper part of the swing', () => {
    for (const from of [left(bark) - 0.1, bark.x - 0.3, bark.x, bark.x + 0.3, right(bark) + 0.1]) {
      for (const release of [0.6, 0.7, 0.8, 0.9, 1]) {
        const sim = on(bark, from, solved);
        expect(swingAlong(sim, 1, 1, release, 40)).toEqual([ring.x]);
        expect(standsOn(sim, bough), `from ${from.toFixed(2)}, let go at ${release}: ${where(sim)}`).toBe(true);
        expect(sim.bubbles).toBe(0);
      }
    }
  });

  it('with Hjälp med svingen, and on Lugnt, one press of Hoppa sets him down on the bough', () => {
    for (const options of [{ swingHelp: true }, simOptions(settingsFor('lugnt'))]) {
      for (const from of [left(bark), bark.x, right(bark)]) {
        const sim = on(bark, from, {}, options);
        pullTheCurl(sim);
        use(sim);
        expect(sim.curr.mode).toBe('swing');
        run(sim, 0.4);
        sim.step({ ...idle, hop: true });
        settle(sim);
        expect(standsOn(sim, bough), where(sim)).toBe(true);
        expect(sim.bubbles).toBe(0);
      }
    }
  });
});

describe('the curl on the ring: the wrong tries', () => {
  it('jumping for it: no jump from the trail takes a sweet or lands on the bough, and the solution still works', () => {
    // Every held jump along the trail under and around it: on the spot, and at a run either way.
    for (let x = FROM + 1; x <= TO - 1; x += 0.2) {
      for (const dir of [0, 1, -1] as const) {
        const sim = at(x - dir * 3);
        for (let i = 0; i < 6 / STEP && dir * (x - sim.curr.x) > 0; i++) sim.step({ ...idle, x: dir });
        sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
        const how = `a jump from ${x.toFixed(1)}, ${dir === 0 ? 'on the spot' : dir > 0 ? 'running right' : 'running left'}`;
        for (let i = 0; i < 1.2 / STEP; i++) {
          sim.step({ ...idle, x: dir, hopHeld: true });
          // While the curl hangs round the ring, the lace is never offered: not in the air either.
          expect(sim.curr.verb, how).not.toBe('lace');
          // The bark is the way in, and a jump under it lands on it. Nothing else is stood on.
          if (sim.curr.grounded) expect(onTheTrail(sim) || standsOn(sim, bark), `${how}: he stood ${where(sim)}`).toBe(true);
        }
        expect(taken(sim), how).toBe(0);
        expect(sim.bubbles, how).toBe(0);
      }
    }
    // One boy tries it all, and then solves it.
    const sim = at(79);
    walkTo(sim, bough.x);
    jump(sim);
    leap(sim, 1);
    walkTo(sim, 85.2);
    leap(sim, 1, 85.9);
    settle(sim);
    expect(onTheTrail(sim)).toBe(true);
    expect(taken(sim)).toBe(0);
    expect(sim.bubbles).toBe(0);
    solve(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
  });

  it('jumping for it from the bark: he comes down on the root, and the solution still works', () => {
    for (const from of [bark.x, right(bark) - 0.1, right(bark) + 0.15]) {
      const sim = on(bark, left(bark) + 0.1);
      leap(sim, 1, from);
      settle(sim);
      // On the root or its far slope: under the bough at the furthest, and far under its sweets.
      expect(onTheTrail(sim), where(sim)).toBe(true);
      expect(sim.curr.x).toBeLessThan(right(bough));
      expect(taken(sim)).toBe(0);
      expect(sim.bubbles).toBe(0);
      if (from === bark.x) {
        solve(sim);
        expect(taken(sim)).toBe(5);
      }
    }
  });

  it('swinging first: while the curl hangs round the ring the lace is never offered, so the swing cannot come first', () => {
    // On the trail, at a walk and at a run: nothing of the puzzle is offered at all.
    for (const speed of [0.5, 1]) {
      const sim = at(FROM);
      for (let i = 0; i < 40 / STEP && sim.curr.x < TO; i++) {
        sim.step({ ...idle, x: speed });
        expect(sim.curr.verb, `on the trail ${where(sim)}`).toBeNull();
      }
      expect(sim.curr.x).toBeGreaterThanOrEqual(TO);
    }
    // On the bark, standing and jumping, straight up and off either end: Dra or nothing.
    for (let x = left(bark); x <= right(bark) + 0.01; x += 0.1) {
      for (const dir of [0, 1, -1]) {
        const sim = on(bark, x);
        expect(sim.curr.verb).toBe('pull');
        sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
        for (let i = 0; i < 1.4 / STEP; i++) {
          sim.step({ ...idle, x: dir, hopHeld: true });
          expect(sim.curr.verb === null || sim.curr.verb === 'pull', `a jump from the bark at ${x.toFixed(1)}: ${sim.curr.verb}`).toBe(true);
        }
        expect(curl(sim).stop).toBe(0);
        expect(taken(sim)).toBe(0);
      }
    }
    // He jumps off the bark towards the bough without it, then comes back and does it the right way round.
    const sim = at(80);
    upOnTheBark(sim);
    leap(sim, 1);
    settle(sim);
    expect(onTheTrail(sim)).toBe(true);
    expect(taken(sim)).toBe(0);
    solve(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
  });

  it('from the wrong side: the lace pulls a thing towards him, and beyond the ring nothing is offered', () => {
    // On the root's far slope and the lawn beyond, standing and in a held jump on the spot or onwards.
    for (let x = home.x + 0.2; x <= TO - 1; x += 0.2) {
      for (const dir of [0, 1]) {
        const sim = at(x);
        expect(sim.curr.verb).toBeNull();
        sim.step({ ...idle, x: dir, hop: true, hopHeld: true });
        for (let i = 0; i < 1.2 / STEP; i++) {
          sim.step({ ...idle, x: dir, hopHeld: true });
          expect(sim.curr.verb, `a jump from ${x.toFixed(1)} on the far side`).toBeNull();
        }
      }
    }
    // Even on the bough itself, were he there: the curl's ring is within the lace's reach, and it is not offered.
    const there = on(bough, left(bough) + 0.1);
    expect(standsOn(there, bough)).toBe(true);
    expect(Math.hypot(handle(home).x - there.curr.x, handle(home).y - (there.curr.y + ELOF_HEIGHT / 2))).toBeLessThan(LACE_REACH);
    expect(there.curr.verb).toBeNull();
    use(there);
    run(there, MOVE_TIME + 0.1);
    expect(curl(there).stop).toBe(0);
    expect(curl(there).x).toBe(home.x);
    // He tries from the far side of the root, finds nothing, and goes round to the bark.
    const sim = at(87.5);
    use(sim);
    jump(sim);
    use(sim);
    expect(curl(sim).stop).toBe(0);
    expect(taken(sim)).toBe(0);
    solve(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
  });

  it('letting go badly: early, late, backwards or not at all is a soft landing, and the ring is still there', () => {
    const count = (sim: Sim) => expect(sim.bubbles).toBe(0);
    // Forwards, from the first moment of the swing to its very top.
    for (const from of [left(bark), bark.x, right(bark)]) {
      for (let release = 0.05; release <= 1.12; release += 0.1) {
        const sim = on(bark, from, solved);
        let swung = false;
        for (let i = 0; i < 30 / STEP; i++) {
          const p = sim.curr;
          const input = { ...idle, x: 1 };
          if (!swung && p.verb === 'lace') input.act = true;
          if (p.mode === 'swing') {
            swung = true;
            if (p.vx > 0 && angleOf(sim) > release) input.hop = true;
          }
          sim.step(input);
          count(sim);
          if (swung && sim.curr.mode === 'free' && sim.curr.grounded) break;
        }
        expect(sim.curr.grounded, `from ${from.toFixed(2)}, let go at ${release.toFixed(2)}`).toBe(true);
      }
    }
    // Backwards, after pumping it up, with the stick any way; and with the lace climbed short first.
    for (const stick of [-1, 0, 1]) {
      for (const release of [0.2, 0.5, 0.8, 1.05]) {
        for (const climb of [0, 0.5, 1.5]) {
          for (const way of [1, -1]) {
            const sim = on(bark, bark.x - 0.3, solved);
            use(sim);
            expect(sim.curr.mode).toBe('swing');
            for (let i = 0; i < climb / STEP; i++) sim.step({ ...idle, y: 1, x: Math.sign(sim.curr.vx) || 1 });
            for (let i = 0; i < 12 / STEP; i++) sim.step({ ...idle, x: Math.sign(sim.curr.vx) || 1 });
            for (let i = 0; i < 12 / STEP; i++) {
              const p = sim.curr;
              const input = { ...idle, x: p.mode === 'swing' ? Math.sign(p.vx) || 1 : stick };
              if (p.mode === 'swing' && way * p.vx > 0 && way * angleOf(sim) > release) input.hop = true;
              sim.step(input);
              count(sim);
              if (sim.curr.mode === 'free' && sim.curr.grounded) break;
            }
            expect(sim.curr.grounded, `stick ${stick}, let go ${way > 0 ? 'forwards' : 'backwards'} at ${release}, climbed ${climb} s`).toBe(true);
          }
        }
      }
    }
    // A full lace never lifts his feet further than a soft landing above the lawn.
    expect(ring.y - ring.length * Math.cos(SWING_MAX) - ELOF_HEIGHT / 2).toBeLessThan(FALL_LIMIT - 0.2);
    // He lets go at once, lands beyond the bough with nothing, walks back, and the swing is still his.
    const sim = at(79);
    upOnTheBark(sim);
    pullTheCurl(sim);
    swingAlong(sim, 1, 1, 0.1);
    settle(sim);
    expect(onTheTrail(sim), where(sim)).toBe(true);
    expect(taken(sim)).toBe(0);
    solve(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
  });
});

describe('the curl on the ring: from the root under it', () => {
  it('a jump with a throw at its top pulls the curl too, as the rings of the clothes line can be joined from the lawn', () => {
    // Standing on the root nothing is offered; at the top of a held jump under the string the curl's ring is in reach.
    const sim = at(bark.x + 1);
    expect(sim.curr.verb).toBeNull();
    sim.step({ ...idle, hop: true, hopHeld: true });
    let pulled = false;
    for (let i = 0; i < 1.5 / STEP; i++) {
      const offered = sim.curr.verb === 'pull';
      sim.step({ ...idle, hopHeld: true, act: offered && !pulled });
      pulled ||= offered;
      // The curl comes first this way too: the lace is his only once it is off the ring.
      if (curl(sim).stop === 0) expect(sim.curr.verb).not.toBe('lace');
    }
    run(sim, MOVE_TIME);
    expect(pulled).toBe(true);
    expect(curl(sim).x).toBeCloseTo(parked.x, 3);
    expect(onTheTrail(sim)).toBe(true);
    expect(taken(sim)).toBe(0);
    expect(sim.bubbles).toBe(0);
    solve(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
  });

  it('once the curl is off it, the ring can be thrown at from the root as well: every swing from there lands softly', () => {
    let reached = 0;
    let swings = 0;
    for (let x = ring.x - 2; x <= ring.x + 1.21; x += 0.4) {
      for (const release of [0.2, 0.5, 0.7, 0.8, 0.9, 1.05]) {
        const sim = at(x, solved);
        expect(sim.curr.verb, `on the root at ${x.toFixed(1)}`).toBe('lace');
        swingAlong(sim, 1, 1, release, 60);
        settle(sim);
        expect(sim.bubbles, `from the root at ${x.toFixed(1)}, let go at ${release}`).toBe(0);
        expect(onTheTrail(sim) || standsOn(sim, bough) || standsOn(sim, bark), where(sim)).toBe(true);
        swings++;
        if (standsOn(sim, bough)) reached++;
      }
    }
    // It is a way to the bough too, for whoever pumps the swing up from a standstill and lets go high.
    expect(reached).toBeGreaterThan(swings / 2);
  });
});

describe('the curl on the ring: no dead end, and a saved game', () => {
  it('left half-way, with the curl pulled and the swing not taken, it waits as he left it', () => {
    const sim = at(79);
    upOnTheBark(sim);
    pullTheCurl(sim);
    // Away, far further than a thing on its way would wait for him, and back.
    runPast(sim, parked.x - MOVER_RESET - 2);
    run(sim, MOVE_TIME + 1);
    expect(Math.abs(sim.curr.x - curl(sim).x)).toBeGreaterThan(MOVER_RESET);
    expect(curl(sim).stop).toBe(1);
    expect(curl(sim).x).toBeCloseTo(parked.x, 3);
    expect(sim.flags.has(`placed:${piece.id}`)).toBe(true);
    runPast(sim, bark.x - 1.5);
    run(sim, 0.3);
    const since = sim.steps;
    upOnTheBark(sim);
    // The curl is where it helps: there is nothing left to pull, and the ring is offered at once.
    expect(sim.curr.verb).toBe('lace');
    swingToThePrize(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
    expect(seconds(sim, since)).toBeLessThan(15);
  });

  it('a saved game with the curl pulled starts with the ring free, and one with the sweets taken keeps them', () => {
    // From the big candy before the root, as a saved game starts.
    const before = garden.checkpoints!.findIndex((big) => big.x > 66.4 && big.x < bark.x);
    const sim = new Sim(garden, {}, { checkpoint: before, ...solved });
    run(sim, 0.3);
    expect(curl(sim).stop).toBe(1);
    expect(curl(sim).x).toBe(parked.x);
    expect(sim.placed).toContain(piece.id);
    expect(taken(sim)).toBe(0);
    runPast(sim, bark.x - 1.5);
    run(sim, 0.3);
    upOnTheBark(sim);
    swingToThePrize(sim);
    expect(taken(sim)).toBe(5);
    expect(sim.bubbles).toBe(0);
    // What the game saves of it, and what comes back from that.
    const bag = (which: readonly boolean[]) => which.flatMap((got, i) => (got ? [i] : []));
    const again = new Sim(garden, {}, { checkpoint: before, flags: [...sim.flags], placed: sim.placed, collected: bag(sim.collected), side: bag(sim.collectedSide) });
    expect(curl(again).stop).toBe(1);
    expect(curl(again).x).toBe(parked.x);
    expect(taken(again)).toBe(5);
    expect(again.candyCount).toBe(sim.candyCount);
    // An older save knows nothing of it: the curl hangs round the ring.
    const old = new Sim(garden, {}, { checkpoint: before, placed: ['curl', 'bridge'] });
    expect(curl(old).stop).toBe(0);
    expect(curl(old).x).toBe(home.x);
  });
});

describe('the curl on the ring: off the main way, and in sight from it', () => {
  it('following the trail takes none of it, and the helper never points at any piece of it', () => {
    const pieces = [handle(home), handle(parked), { x: ring.x, y: ring.y }, ...prize.map((i) => side[i]!)];
    // He has turned the ladybird to get here: the helper has nothing behind him to show.
    for (const start of [{ flags: ['ladybird'] }, { flags: ['ladybird', ...solved.flags], placed: solved.placed }]) {
      const sim = at(FROM, start);
      for (let i = 0; i < 60 / STEP && sim.curr.x < TO; i++) {
        sim.step({ ...idle, x: 0.5 });
        if (i % 30 !== 0) continue;
        const hint = hintFor(sim, garden)!;
        expect(hint, where(sim)).not.toBeNull();
        // The way is on along the trail: its next candy, with no word of its own. Once the curl is pulled the
        // button says Kasta snöret under the ring, and the helper still shows the trail.
        expect(hint.verb, where(sim)).toBeNull();
        expect(garden.candy.some((candy) => candy.x === hint.at.x && candy.y === hint.at.y), where(sim)).toBe(true);
        for (const one of pieces) expect(Math.hypot(hint.at.x - one.x, hint.at.y - one.y), where(sim)).toBeGreaterThan(1);
      }
      expect(taken(sim)).toBe(0);
    }
    // Asked three times under the string, it shows the trail three times.
    const asked = at(84.5, { flags: ['ladybird'] });
    for (let i = 0; i < 3; i++) asked.step({ ...idle, help: true });
    expect(asked.help.step).toBe(3);
    expect(asked.help.verb).toBeNull();
    expect(garden.candy.some((candy) => candy.x === asked.help.at!.x && candy.y === asked.help.at!.y)).toBe(true);
    // At a run too, nothing is taken and nothing is pulled.
    const ran = at(FROM);
    runPast(ran, TO);
    expect(taken(ran)).toBe(0);
    expect(curl(ran).stop).toBe(0);
  });

  it('the robot plays the chapter exactly as it does without it', () => {
    const without: ChapterData = {
      ...garden,
      movers: garden.movers!.filter((mover) => mover !== piece),
      hooks: garden.hooks!.filter((hook) => hook !== ring),
      lines: garden.lines!.filter((line) => line !== string),
      ledges: garden.ledges!.filter((ledge) => ledge !== bark && ledge !== bough),
      side: side.filter((_, i) => !prize.includes(i)),
      cameras: garden.cameras!.filter((one) => one !== zone),
    };
    const result = playThrough(60, garden, {}, 300);
    const plain = playThrough(60, without, {}, 300);
    expect(result.goal).toBe(true);
    expect(result.steps).toBe(plain.steps);
    expect(result.candy).toBe(plain.candy);
    expect(result.missed).toEqual(plain.missed);
    expect(result.said).toEqual(plain.said);
    expect(result.flags).toEqual(plain.flags);
    expect(result.flags).not.toContain(`placed:${piece.id}`);
    expect({ ...result.end }).toEqual({ ...plain.end });
    expect(result.bubbles + result.knocks).toBe(0);
  });

  it('the first sweet is in the trail\'s picture as he comes up the root, and the curl is not', () => {
    // The curl as it is drawn: a coil as wide as the thing, in the middle of its box (src/render/props.ts).
    const coil = home.y + piece.height / 2 - Math.min(piece.width, piece.height) / 2;
    let first = Infinity;
    for (let x = FROM; x <= right(bark) + 1.8; x += 0.1) {
      const sim = at(x);
      const view = picture(sim);
      // On the ground the picture is the usual one.
      expect(view.zoom, `standing at ${x.toFixed(1)}`).toBe(1);
      if (holds(view, side[tell]!)) first = Math.min(first, x);
      if (x >= left(bark) - 0.8) expect(holds(view, side[tell]!), `from the trail at ${x.toFixed(1)}`).toBe(true);
      // The prize is seen before any tool: on this screen the curl, and the ring in it, hang above the picture
      // all the way.
      expect(coil, `from the trail at ${x.toFixed(1)}`).toBeGreaterThan(view.top + 0.1);
      expect(ring.y - 0.25).toBeGreaterThan(view.top + 0.1);
    }
    // On the root's near slope, before the bark is over him.
    expect(first).toBeLessThan(left(bark) - 0.8);
    console.log(`the curl on the ring: its first sweet is in the trail's picture from x ${first.toFixed(1)} on a phone held sideways`);
  });

  it('on the bark, on the swing and on the bough the picture holds all of it, and on the root it is the usual one', () => {
    const things = [handle(home), handle(parked), { x: ring.x, y: ring.y }, { x: left(bough), y: bough.y }, { x: right(bough), y: bough.y }, ...prize.map((i) => side[i]!), { x: bark.x, y: bark.y - 0.9 }];
    for (const x of [left(bark), bark.x, right(bark)]) {
      const view = picture(on(bark, x));
      expect(view.zoom).toBe(zone.zoom);
      for (const thing of things) expect(holds(view, thing), `from the bark at ${x.toFixed(2)}: ${thing.x},${thing.y}`).toBe(true);
      // The string and its two sticks too.
      for (const end of [string.from, string.to]) expect(holds(view, end, 0.1)).toBe(true);
    }
    // On the lace it rests on the hook's place, at the height of the bark he left.
    const sim = on(bark, bark.x, solved);
    use(sim);
    const hung = picture(sim);
    for (let i = 0; i < 4 / STEP; i++) {
      sim.step({ ...idle, x: Math.sign(sim.curr.vx) || 1 });
      expect(sim.curr.mode).toBe('swing');
      expect(picture(sim).zoom).toBe(zone.zoom);
      expect(picture(sim).bottom).toBeCloseTo(hung.bottom, 5);
    }
    for (const thing of things) expect(holds(hung, thing), `on the lace: ${thing.x},${thing.y}`).toBe(true);
    for (const x of [left(bough) + 0.2, right(bough)]) {
      const view = picture(on(bough, x, solved));
      expect(view.zoom).toBe(zone.zoom);
      for (const i of prize) expect(holds(view, side[i]!)).toBe(true);
    }
    // On the trail under it the picture is as it was: standing, and through a hop.
    for (let x = zone.from - 1; x <= zone.to + 1; x += 0.25) {
      const under = at(x);
      expect(picture(under).zoom, `standing at ${x.toFixed(2)}`).toBe(1);
      under.step({ ...idle, hop: true });
      for (let i = 0; i < 0.7 / STEP; i++) {
        under.step(idle);
        expect(picture(under).zoom, `hopping at ${x.toFixed(2)}`).toBe(1);
      }
    }
  });

  it('the bough ends before the dew bells: nobody standing on it rings one', () => {
    const sim = on(bough, left(bough), solved);
    walkTo(sim, right(bough) + ELOF_HALF_WIDTH);
    expect(standsOn(sim, bough)).toBe(true);
    expect(sim.noteHits).toEqual([]);
    expect([...sim.flags].filter((flag) => flag.startsWith('note:'))).toEqual([]);
  });
});
