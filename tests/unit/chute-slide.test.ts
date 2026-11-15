import { describe, expect, it } from 'vitest';
import { cuesFor, newCueMemory, type Heard } from '../../src/audio/cues';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { createChuteSlide } from '../../src/render/chute-slide';
import { STANDING, type Pose } from '../../src/render/rig';
import { CHUTE_PULL, CHUTE_ROOM, CHUTE_SPEED, CHUTE_START, RUN_SPEED, STEP } from '../../src/sim/constants';
import { chuteLength, chutePoint, chuteStep, chuteUnder, chuteVelocity, chuteWay } from '../../src/sim/chute';

/**
 * The slide's chute (Olov, 14 November 2026: "Kan vi göra så att Elof faktiskt åker nedför rutschkanan? Han ska
 * fortfarande kunna gå uppför den, men när han tar sig nedför ska han åka."): the rule of when a slide begins and how
 * it goes (src/sim/chute.ts), how he is drawn on it (src/render/chute-slide.ts), and what is heard.
 * tests/robot/flarken.test.ts plays it.
 */
const chute = flarken.chutes![0]!;
const length = chuteLength(chute);
const middle = chutePoint(chute, length / 2);

describe('a slide\'s chute', () => {
  it('begins a slide only for one heading down it, on its line, with room left to slide', () => {
    expect(chuteWay(chute)).toBe(1);
    // At its brink and in its middle, pushing the way it goes down.
    expect(chuteUnder([chute], chute.from.x, chute.from.y, 1, RUN_SPEED)).toMatchObject({ s: 0, v: CHUTE_START });
    expect(chuteUnder([chute], middle.x, middle.y, 1, 0)).toMatchObject({ v: 0 });
    expect(chuteUnder([chute], middle.x, middle.y, 1, 0)!.s).toBeCloseTo(length / 2, 6);
    // His feet's middle rests a little over a slope's line, on his body's corner: still on it.
    expect(chuteUnder([chute], middle.x, middle.y + 0.2, 1, 0)).not.toBeNull();
    // Standing, or pushing up it: he walks.
    expect(chuteUnder([chute], middle.x, middle.y, 0, 0)).toBeNull();
    expect(chuteUnder([chute], middle.x, middle.y, -1, -RUN_SPEED)).toBeNull();
    // Before its brink, past its foot, at its very foot, over it in the air, under it on the sand: no slide.
    expect(chuteUnder([chute], chute.from.x - 0.05, chute.from.y, 1, RUN_SPEED)).toBeNull();
    expect(chuteUnder([chute], chute.to.x + 0.05, chute.to.y, 1, RUN_SPEED)).toBeNull();
    const foot = chutePoint(chute, length - CHUTE_ROOM / 2);
    expect(chuteUnder([chute], foot.x, foot.y, 1, RUN_SPEED)).toBeNull();
    expect(chuteUnder([chute], middle.x, middle.y + 0.8, 1, RUN_SPEED)).toBeNull();
    expect(chuteUnder([chute], middle.x, 0, 1, RUN_SPEED)).toBeNull();
  });

  it('gathers speed by the step alone, up to faster than he runs, and ends at its foot', () => {
    const run = chuteUnder([chute], chute.from.x, chute.from.y, 1, RUN_SPEED)!;
    let steps = 0;
    let last = run.v;
    while (!chuteStep(run)) {
      expect(run.v).toBeGreaterThanOrEqual(last);
      expect(run.v - last).toBeLessThanOrEqual(CHUTE_PULL * STEP + 1e-9);
      last = run.v;
      const at = chutePoint(chute, run.s);
      expect(at.x).toBeGreaterThan(chute.from.x);
      expect(at.x).toBeLessThan(chute.to.x);
      expect(++steps).toBeLessThan(400);
    }
    expect(run.v).toBeLessThanOrEqual(CHUTE_SPEED);
    expect(run.v).toBeGreaterThan(RUN_SPEED * 1.4);
    expect(chutePoint(chute, run.s)).toEqual(chute.to);
    // Along it and down: its speed is along its own line.
    const v = chuteVelocity(chute, run.v);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(run.v, 9);
    expect(v.x).toBeGreaterThan(0);
    expect(v.y / v.x).toBeCloseTo((chute.to.y - chute.from.y) / (chute.to.x - chute.from.x), 9);
  });

  it('is drawn sitting: legs out along it, arms out and up, his hips set down on it; and not at all off it', () => {
    const slide = createChuteSlide(flarken);
    const pose: Pose = { ...STANDING };
    const still = { x: middle.x, vx: 0, vy: 0 };
    // On his feet, his own motion's pose is left as it is.
    slide.pose(pose, still, 1 / 60, 0, false);
    expect(pose).toEqual(STANDING);
    expect(slide.weight).toBe(0);
    // Sliding, he sits down over a moment, and is there within a quarter of a second.
    const v = chuteVelocity(chute, 4);
    const sliding = { x: middle.x, vx: v.x, vy: v.y, sliding: true };
    Object.assign(pose, STANDING);
    slide.pose(pose, sliding, 1 / 60, 0, false);
    expect(slide.weight).toBeGreaterThan(0);
    expect(slide.weight).toBeLessThan(0.5);
    for (let i = 0; i < 15; i++) { Object.assign(pose, STANDING); slide.pose(pose, sliding, 1 / 60, i / 60, false); }
    expect(slide.weight).toBe(1);
    // His thighs lie along the chute's slope (a thigh level is a quarter turn), both arms are out ahead and up, and his
    // hips are set on the chute, not stood on his feet.
    const slope = Math.atan2(chute.from.y - chute.to.y, chute.to.x - chute.from.x);
    for (const leg of [pose.legL, pose.legR]) expect(Math.abs(leg - (Math.PI / 2 - slope))).toBeLessThan(0.3);
    for (const knee of [pose.kneeL, pose.kneeR]) expect(knee).toBeLessThan(0.5);
    for (const arm of [pose.armL, pose.armR]) { expect(arm).toBeGreaterThan(1.6); expect(arm).toBeLessThan(3.1); }
    expect(pose.seat).not.toBeNull();
    expect(pose.seat!).toBeLessThan(2.2);
    // Off its foot he gets his legs under him again, and then his pose is his own.
    for (let i = 0; i < 12; i++) { Object.assign(pose, STANDING); slide.pose(pose, still, 1 / 60, 0, false); }
    expect(slide.weight).toBe(0);
    expect(pose).toEqual(STANDING);
    // With less motion he sits at once, and still.
    Object.assign(pose, STANDING);
    slide.pose(pose, sliding, 1 / 60, 0.3, true);
    expect(slide.weight).toBe(1);
    const held = { ...pose };
    Object.assign(pose, STANDING);
    slide.pose(pose, sliding, 1 / 60, 0.9, true);
    expect(pose).toEqual(held);
  });

  it('is heard: a whoosh and a laugh as he sits down, and no footsteps on the way', () => {
    const still: Heard = { time: 0, mode: 'free', grounded: true, x: 0, y: 0, vx: 0, vy: 0, candy: 0, checkpoint: -1, bubbles: 0, atGoal: false, moving: 0, shadows: [], drips: [] };
    const memory = newCueMemory();
    expect(cuesFor(still, { ...still, time: 0.02, sliding: true, vx: 3 }, memory)).toEqual([{ kind: 'slide' }, { kind: 'giggle' }]);
    // A second of sliding at speed: nothing more, where a second of running is half a dozen steps.
    let before: Heard = { ...still, time: 0.02, sliding: true, vx: 5 };
    for (let i = 1; i <= 60; i++) {
      const now = { ...before, time: before.time + 1 / 60, x: before.x + 5 / 60 };
      expect(cuesFor(before, now, memory)).toEqual([]);
      before = now;
    }
    const ran = newCueMemory();
    let steps = 0;
    before = { ...still, vx: 5 };
    for (let i = 1; i <= 60; i++) {
      const now = { ...before, time: before.time + 1 / 60, x: before.x + 5 / 60 };
      steps += cuesFor(before, now, ran).filter((cue) => cue.kind === 'step').length;
      before = now;
    }
    expect(steps).toBeGreaterThan(4);
  });
});
