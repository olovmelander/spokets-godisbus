import { describe, expect, it } from 'vitest';
import { Game } from '../../src/app/game';
import { testbana } from '../../src/content/chapters/testbana';
import { NO_EDGES } from '../../src/input/press-queue';
import { ankleOf, rolled } from '../../src/render/gait';
import { createFollower, createPlayerMotion, STAND_IN_LEGS, strideAt } from '../../src/render/player-motion';
import { JOINTS, STANDING, type Legs, type Pose } from '../../src/render/rig';
import { RUN_SPEED, STEP, WALK_SPEED } from '../../src/sim/constants';
import type { ChapterData, PlayerState } from '../../src/sim/types';

/**
 * Elof's walk, through the game's own loop (Olov, 14 November 2026: "Ibland lutar Elof sig väldigt mycket bakåt när han
 * går … Ibland hackar han också lite framåt", mostly at home, where he is three times as big).
 *
 * A body with short legs in long boots, a third of its height, as his model is made: a fixture's round numbers.
 */
const BOOTS: Legs = { hip: 0.38, thigh: 0.145, shin: 0.13, ankle: 0.11, heel: 0.09, toe: 0.18, width: 0.06 };
const FLAT: ChapterData = { id: 'elof-walk', spawn: { x: 0, y: 0.01 }, goalX: 400, candy: [],
  ground: [{ x: -60, y: 10 }, { x: -60, y: 0 }, { x: 120, y: 0 }, { x: 120, y: 10 }] };
/** The display rates a walk is played at: a slow tablet, most screens, and the fast ones (Olov's own draws 240). */
const RATES = [30, 60, 144, 240];
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const tmp = { x: 0, y: 0 };

interface Shot { t: number; x: number; dt: number; state: PlayerState; pose: Pose }
type Stick = (t: number) => { x?: number; hop?: boolean };

/**
 * The game played at `hz` pictures a second, as the page plays it: the simulation's steps, the picture drawn between the
 * last two (`alpha`), and his body paced by the time that has passed there (src/render/view.ts).
 */
function play(chapter: ChapterData, stick: Stick, seconds: number, hz: number, tall = 1, legs: Legs | null = BOOTS): Shot[] {
  const game = new Game(chapter), motion = createPlayerMotion(), shots: Shot[] = [];
  let alphaWas = 0, hopping = false;
  for (let frame = 0; frame < Math.round(seconds * hz); frame++) {
    const t = frame / hz, held = stick(t), before = game.sim.steps;
    game.frame(1 / hz, { x: held.x ?? 0, hopHeld: !!held.hop }, held.hop && !hopping ? { ...NO_EDGES, hop: true } : NO_EDGES);
    hopping = !!held.hop;
    const alpha = game.alpha, x = lerp(game.sim.prev.x, game.sim.curr.x, alpha);
    const dt = Math.max(0, (game.sim.steps - before) * STEP + (alpha - alphaWas) * STEP);
    alphaWas = alpha;
    shots.push({ t, x, dt, state: { ...game.sim.curr }, pose: { ...motion.update(game.sim.curr, x, dt, null, 0, false, 0, tall, legs ?? undefined) } });
  }
  return shots;
}

/** Each foot of a pose: how far ahead of the hips it stands flat (heights), how high its sole is over the lower one's, and its knee. */
function feetOf(pose: Pose, legs: Legs) {
  const ankles = [ankleOf(pose, 0, legs), ankleOf(pose, 1, legs)];
  const under = ankles.map((ankle) => ankle.down + rolled(0, ankle.pitch, legs, tmp).y), hips = Math.max(under[0]!, under[1]!);
  return ankles.map((ankle, side) => ({
    flat: ankle.ahead - rolled(0, ankle.pitch, legs, tmp).x, ahead: ankle.ahead, up: hips - under[side]!, knee: side === 0 ? pose.kneeL : pose.kneeR,
  }));
}

/** How far the soles on the ground slid, in his heights: a foot down in two frames running should be where it was. */
function slide(shots: Shot[], tall: number, legs: Legs): { slid: number; frames: number; worst: number } {
  let slid = 0, frames = 0, worst = 0;
  for (let i = 1; i < shots.length; i++) {
    const a = shots[i - 1]!, b = shots[i]!;
    if (a.pose.bounce > 0 || b.pose.bounce > 0 || !a.state.grounded || !b.state.grounded || a.state.facing !== b.state.facing) continue;
    const before = feetOf(a.pose, legs), now = feetOf(b.pose, legs);
    for (const side of [0, 1]) {
      if (before[side]!.up > 0.002 || now[side]!.up > 0.002) continue;
      const moved = Math.abs((b.x - a.x) * b.state.facing / tall + now[side]!.flat - before[side]!.flat);
      slid += moved; frames++; worst = Math.max(worst, moved / b.dt);
    }
  }
  return { slid, frames, worst };
}

const walk: Stick = (t) => ({ x: t < 0.3 ? 0 : 0.6 }), run: Stick = (t) => ({ x: t < 0.3 ? 0 : 1 }), stroll: Stick = (t) => ({ x: t < 0.3 ? 0 : 0.3 });
const steady = (shots: Shot[]) => shots.filter((shot) => shot.t > 1.3);
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('Elof’s walk through the game’s own loop', () => {
  it('leans a little the way he goes, more as he goes faster for his size, and never back', () => {
    const leans = [] as { tall: number; speed: number; lean: number }[];
    for (const tall of [1, 3]) for (const [stick, speed] of [[stroll, WALK_SPEED / 2], [walk, WALK_SPEED], [run, RUN_SPEED]] as const) {
      const shots = play(FLAT, stick, 3, 60, tall);
      // Setting off and striding: never back, and never bent far over. (At home his run leaned twenty degrees, the lean
      // of a sprint, for the speed of a brisk walk at that size.)
      expect(Math.min(...shots.map((shot) => shot.pose.lean))).toBeGreaterThan(-0.005);
      expect(Math.max(...shots.map((shot) => shot.pose.lean))).toBeLessThan(0.32);
      leans.push({ tall, speed, lean: mean(steady(shots).map((shot) => shot.pose.lean)) });
    }
    // More as he goes faster, for how big he is: the same run is a sprint out in the world, a jog at home.
    const of = (tall: number, speed: number) => leans.find((one) => one.tall === tall && one.speed === speed)!.lean;
    for (const tall of [1, 3]) {
      expect(of(tall, WALK_SPEED)).toBeGreaterThanOrEqual(of(tall, WALK_SPEED / 2));
      expect(of(tall, RUN_SPEED)).toBeGreaterThan(of(tall, WALK_SPEED) + 0.03);
    }
    expect(of(3, WALK_SPEED)).toBeGreaterThan(0.02);
    expect(of(3, WALK_SPEED)).toBeLessThan(0.1);
    expect(of(3, RUN_SPEED)).toBeLessThan(of(1, RUN_SPEED) - 0.05);
    expect(of(1, RUN_SPEED)).toBeGreaterThan(0.2);
  });

  it('stops without rocking back from a walk, and only a little, for a moment, from a sprint', () => {
    for (const tall of [1, 3]) {
      const stops = play(FLAT, (t) => ({ x: t > 0.3 && t < 1.8 ? 0.6 : 0 }), 3, 60, tall).filter((shot) => shot.t > 1.8);
      // (Every stop rocked the trunk back four to six degrees.)
      expect(Math.min(...stops.map((shot) => shot.pose.lean))).toBeGreaterThan(-0.005);
    }
    const sprint = play(FLAT, (t) => ({ x: t > 0.3 && t < 1.8 ? 1 : 0 }), 3, 60, 1).filter((shot) => shot.t > 1.8);
    expect(Math.min(...sprint.map((shot) => shot.pose.lean))).toBeGreaterThan(-0.13);
    expect(Math.min(...sprint.filter((shot) => shot.t > 2.4).map((shot) => shot.pose.lean))).toBeGreaterThan(-0.01);
  });

  it('puts each foot down near under him, on a knee that gives', () => {
    for (const tall of [1, 3]) for (const stick of [walk, run]) {
      const shots = steady(play(FLAT, stick, 3.5, 60, tall));
      let strikes = 0;
      for (let i = 1; i < shots.length - 8; i++) for (const side of [0, 1]) {
        const before = feetOf(shots[i - 1]!.pose, BOOTS)[side]!, now = feetOf(shots[i]!.pose, BOOTS)[side]!;
        if (!(before.up > 0.004 && now.up <= 0.004 && now.flat > 0)) continue;
        strikes++;
        // It comes down a fifth of his height ahead of his hips at the most (a straight leg swung from the hip put it down
        // nearly a quarter ahead at home, the trunk upright behind it: he looked to lean back) ...
        expect(now.ahead).toBeLessThan(0.2);
        // ... and its knee is bent as the weight comes onto it (it was locked straight).
        expect(Math.max(...shots.slice(i, i + 8).map((shot) => feetOf(shot.pose, BOOTS)[side]!.knee))).toBeGreaterThan(0.12);
      }
      expect(strikes).toBeGreaterThan(3);
    }
  });

  it('takes steps for his size: a walk’s and a jog’s at home, a run’s out in the world', () => {
    const cadence = (stick: Stick, tall: number) => {
      const shots = steady(play(FLAT, stick, 4.3, 60, tall));
      let strikes = 0;
      for (let i = 1; i < shots.length; i++) for (const side of [0, 1]) {
        if (feetOf(shots[i - 1]!.pose, BOOTS)[side]!.up > 0.004 && feetOf(shots[i]!.pose, BOOTS)[side]!.up <= 0.004) strikes++;
      }
      return strikes / 3;
    };
    // Steps a second. (He took his steps at home as slowly as a third of his steps out in the world, in a sprint's pose.)
    expect(cadence(walk, 3)).toBeGreaterThan(1.5); expect(cadence(walk, 3)).toBeLessThan(2.6);
    expect(cadence(run, 3)).toBeGreaterThan(2.4); expect(cadence(run, 3)).toBeLessThan(3.8);
    expect(cadence(walk, 1)).toBeGreaterThan(2.4); expect(cadence(walk, 1)).toBeLessThan(3.8);
    expect(cadence(run, 1)).toBeGreaterThan(3.8); expect(cadence(run, 1)).toBeLessThan(5.6);
    // How he strides goes by how fast he goes for his size: a walk at home, where the same speed out in the world is a run.
    expect(strideAt(WALK_SPEED / 3, BOOTS).run).toBe(0);
    expect(strideAt(WALK_SPEED, BOOTS).run).toBeGreaterThan(0.8);
    expect(strideAt(RUN_SPEED, BOOTS).step).toBeGreaterThan(strideAt(RUN_SPEED / 3, BOOTS).step + 0.1);
  });

  it('holds each planted foot where it came down, at every display rate and at both sizes', () => {
    for (const hz of RATES) for (const tall of [1, 3]) for (const stick of [walk, run]) {
      const shots = steady(play(FLAT, stick, 3.3, hz, tall));
      const { slid, frames } = slide(shots, tall, BOOTS), covered = (shots[shots.length - 1]!.x - shots[0]!.x) / tall;
      expect(frames).toBeGreaterThan(hz);
      // A planted foot stays put: of the ground he covers, his soles slide over less than a twentieth. (At 240 pictures a
      // second his stride counted half the ground, and his feet slid over the rest.) In a sprint, out in the world, his
      // legs sweep through full stretch at each end of a step and are softened there: a fifth.
      expect(slid / frames * (shots.length / covered)).toBeLessThan(tall === 1 && stick === run ? 0.26 : 0.05);
    }
  });

  it('strides the same at every display rate', () => {
    for (const stick of [walk, run]) for (const tall of [1, 3]) {
      const at = RATES.map((hz) => {
        const shots = steady(play(FLAT, stick, 3.3, hz, tall));
        return { lean: mean(shots.map((shot) => shot.pose.lean)), swing: Math.max(...shots.map((shot) => shot.pose.legL)), knee: Math.max(...shots.map((shot) => shot.pose.kneeL)) };
      });
      for (const one of at) {
        expect(one.lean).toBeCloseTo(at[1]!.lean, 2);
        expect(Math.abs(one.swing - at[1]!.swing)).toBeLessThan(0.06);
        expect(Math.abs(one.knee - at[1]!.knee)).toBeLessThan(0.08);
      }
    }
  });

  it('counts all the ground he covers, even where a frame is given no time', () => {
    // The page once gave his body the time of the steps a frame ran, and drew him between two steps: at 240 pictures a
    // second every other frame had no time in it. What he travels in such a frame is kept for the next that has.
    const strides = (quantised: boolean) => {
      const motion = createPlayerMotion(), state = { ...new Game(FLAT).sim.curr, grounded: true };
      let x = 0, swings = 0, was = 0;
      for (let frame = 0; frame < 480; frame++) {
        x += WALK_SPEED / 240;
        const pose = motion.update(state, x, quantised ? (frame % 2 ? STEP : 0) : 1 / 240, null, 0, false, 0, 3, BOOTS);
        if (was <= 0.15 && pose.legL > 0.15) swings++;
        was = pose.legL;
      }
      return swings;
    };
    expect(strides(false)).toBeGreaterThan(1);
    expect(strides(true)).toBe(strides(false));
  });

  it('moves without a jump in any joint: setting off, changing pace, stopping and turning about, at every display rate', () => {
    const stick: Stick = (t) => ({ x: t < 0.3 ? 0 : t < 1.6 ? 0.6 : t < 3 ? 1 : t < 4 ? 0.6 : t < 4.8 ? 0 : t < 5.8 ? -0.6 : t < 6.6 ? -1 : t < 7.2 ? 1 : 0 });
    for (const hz of RATES) for (const tall of [1, 3]) {
      const shots = play(FLAT, stick, 8.2, hz, tall);
      let fastest = 0;
      for (let i = 1; i < shots.length; i++) {
        const b = shots[i - 1]!.pose, c = shots[i]!.pose;
        for (const joint of JOINTS) fastest = Math.max(fastest, Math.abs(c[joint] - b[joint]) / shots[i]!.dt);
        // A knee never bends backwards.
        expect(c.kneeL).toBeGreaterThan(-1e-6); expect(c.kneeR).toBeGreaterThan(-1e-6);
      }
      // Radians a second: a stride's fastest turn is its knee's as the foot swings through, fastest of all in the first
      // steps of a sprint. A pose that popped from one frame to the next is hundreds of radians a second at the fast
      // rates: a foot put down from a run's swing in one frame was 245, a knee thrown on from a step 100.
      expect(fastest).toBeLessThan(75);
    }
  });

  it('stops by stepping his feet together under him, not by sliding them', () => {
    for (const tall of [1, 3]) for (const [push, until] of [[0.6, 1.8], [0.6, 1.93], [0.6, 2.07], [1, 1.8], [1, 1.95]] as const) {
      const shots = play(FLAT, (t) => ({ x: t > 0.3 && t < until ? push : 0 }), until + 1.4, 60, tall);
      const stopped = shots.findIndex((shot, i) => shot.t > until && i > 0 && Math.abs(shot.x - shots[i - 1]!.x) < 1e-9);
      const after = shots.slice(stopped);
      // The soles that are on the ground stay where they are, to a few hundredths of his height in all (they slid home a
      // tenth of it and more) ...
      expect(slide(after, tall, BOOTS).slid).toBeLessThan(0.03);
      // ... and within two thirds of a second he stands, his feet under him.
      const end = after[Math.round(0.66 * 60)]!.pose;
      for (const foot of feetOf(end, BOOTS)) { expect(Math.abs(foot.flat)).toBeLessThan(0.012); expect(foot.up).toBeLessThan(0.003); }
      const stood = after[Math.round(0.95 * 60)]!.pose;
      expect(Math.abs(stood.legL)).toBeLessThan(0.02); expect(Math.abs(stood.kneeR)).toBeLessThan(0.02); expect(stood.bounce).toBe(0);
    }
  });

  it('walks up a kerb as a step, not a jump: no dip, no arms thrown up, and strides on from the foot that leads', () => {
    for (const hz of [60, 240]) {
      const shots = play({ ...testbana, spawn: { x: 5, y: 0.01 } }, (t) => ({ x: t < 0.3 ? 0 : 0.6 }), 3.2, hz);
      const off = shots.findIndex((shot) => !shot.state.grounded && shot.t > 0.5), on = shots.findIndex((shot, i) => i > off && shot.state.grounded);
      expect(off).toBeGreaterThan(0); expect(on).toBeGreaterThan(off);
      expect(shots[on]!.state.y).toBeGreaterThan(0.2);
      const lifted = shots.slice(off, on + Math.round(0.4 * hz));
      // (The lift the game gives him over a step was taken for a jump: down into the knees, the arms swung up past his head.)
      expect(Math.max(...lifted.map((shot) => Math.max(shot.pose.armL, shot.pose.armR)))).toBeLessThan(1);
      expect(Math.max(...lifted.map((shot) => shot.pose.lean))).toBeLessThan(0.3);
      expect(Math.min(...lifted.map((shot) => shot.pose.bounce))).toBe(0);
      // On the step he strides on at once, and no joint is thrown: the thighs stay within a stride's swing.
      const onward = shots.slice(on, on + Math.round(0.5 * hz));
      expect(Math.max(...onward.map((shot) => Math.max(Math.abs(shot.pose.legL), Math.abs(shot.pose.legR))))).toBeLessThan(1.5);
      expect(Math.max(...onward.map((shot) => Math.max(shot.pose.kneeL, shot.pose.kneeR)))).toBeLessThan(2.3);
    }
  });

  it('stands on the public figure’s own legs as on his model’s', () => {
    const shots = steady(play(FLAT, walk, 3.3, 60, 1, null));
    const { slid, frames } = slide(shots, 1, STAND_IN_LEGS);
    expect(slid / frames * (shots.length / (shots[shots.length - 1]!.x - shots[0]!.x))).toBeLessThan(0.05);
  });
});

describe('the follower under a stride', () => {
  it('takes a second change in the frame after a jump from where the body is, not as the new pose’s speed', () => {
    // Coming down from a step and striding on in the next frame, the knee was thrown on at a hundred radians a second.
    const follower = createFollower(), out = { ...STANDING };
    for (let i = 0; i < 10; i++) follower.follow({ ...STANDING, kneeL: 0.9 }, 1 / 240, out);
    follower.follow({ ...STANDING, kneeL: 0.5 }, 1 / 240, out, true);
    follower.follow({ ...STANDING, kneeL: 0.1 }, 1 / 240, out, true);
    let most = out.kneeL, least = out.kneeL;
    for (let i = 0; i < 240; i++) {
      follower.follow({ ...STANDING, kneeL: 0.1 }, 1 / 240, out);
      most = Math.max(most, out.kneeL); least = Math.min(least, out.kneeL);
    }
    expect(most).toBeLessThan(0.95);
    expect(least).toBeGreaterThan(0.05);
    expect(out.kneeL).toBeCloseTo(0.1, 4);
  });

  it('draws a stride’s legs as it has them, and never carries a knee on past straight', () => {
    const follower = createFollower(), out = { ...STANDING };
    // A knee straightening fast that stops as its heel comes down: firm, it stops with it.
    let knee = 1.2;
    for (let i = 0; i < 6; i++) { knee -= 0.2; follower.follow({ ...STANDING, kneeR: knee }, 1 / 60, out, false, 1, true); }
    for (let i = 0; i < 10; i++) {
      follower.follow({ ...STANDING, kneeR: 0 }, 1 / 60, out, false, 1, true);
      expect(out.kneeR).toBe(0);
    }
    // Taken for a jump (not a stride's), it is carried on only as far as straight.
    const loose = createFollower();
    knee = 1.2;
    for (let i = 0; i < 6; i++) { knee -= 0.2; loose.follow({ ...STANDING, kneeR: knee }, 1 / 60, out); }
    for (let i = 0; i < 20; i++) {
      loose.follow({ ...STANDING, kneeR: 0 }, 1 / 60, out);
      expect(out.kneeR).toBeGreaterThanOrEqual(0);
    }
  });
});
