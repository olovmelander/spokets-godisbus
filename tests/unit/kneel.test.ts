import { describe, expect, it } from 'vitest';
import { kneelLegs, kneelPose, sample } from '../../src/render/gait';
import { CLIPS } from '../../src/render/motion-data';
import { KNEELING, ON_TOES, REHEARSAL_LEGS, STANDING, type Legs } from '../../src/render/rig';

/**
 * Going down on a knee (art/blender/motion.py CLIPS.kneel, the motion pass of 9 November 2026): the legs reach the floor
 * from where the clip keys the hips and the feet, on each body's own legs, so that the knee meets the floor, the front boot
 * stands flat and the back one on its toe, however long the legs are.
 */
// A grown-up of the family's proportions: legs about a third of the height, chunky boots; and a small boy's.
const SHORT: Legs = { hip: .356, thigh: .142, shin: .13, ankle: .083, heel: .063, toe: .124, width: .05, knee: .025 };
const BOY: Legs = { hip: .482, thigh: .185, shin: .186, ankle: .111, heel: .088, toe: .174, width: .062, knee: .031 };

/** The knee and the ankle of one leg in the body's side view, from the hip joint at `hips` over the floor. */
function leg(legs: Legs, hips: number, thigh: number, knee: number) {
  const kneeAt = { x: legs.thigh * Math.sin(thigh), y: hips - legs.thigh * Math.cos(thigh) };
  const shin = thigh - knee;
  return { knee: kneeAt, ankle: { x: kneeAt.x + legs.shin * Math.sin(shin), y: kneeAt.y - legs.shin * Math.cos(shin) } };
}

describe('going down on a knee', () => {
  it.each([['the stand-in', REHEARSAL_LEGS], ['short legs', SHORT], ['a boy', BOY]] as const)(
    'puts the left knee on the floor, the right boot flat ahead and the left on its toe behind: %s', (_, legs) => {
      const pose = kneelLegs({ ...STANDING }, legs);
      // Where the hips are kneeling: the left knee's joint as high over the floor as the knee is thick.
      const thick = legs.knee ?? KNEELING;
      const hips = thick + legs.thigh * Math.cos(pose.legL);
      const left = leg(legs, hips, pose.legL, pose.kneeL), right = leg(legs, hips, pose.legR, pose.kneeR);
      expect(left.knee.y).toBeCloseTo(thick, 3);
      // The knee a little behind the hips, the weight over the front foot; the back knee pointing forward, not up.
      expect(left.knee.x).toBeLessThan(0);
      expect(left.knee.x).toBeGreaterThan(-legs.thigh * .5);
      // The right boot flat on the floor ahead of the hips, its shin upright.
      expect(right.ankle.y).toBeCloseTo(legs.ankle, 3);
      expect(right.ankle.x).toBeGreaterThan(legs.thigh * .5);
      expect(pose.legR - pose.kneeR + pose.footR).toBeCloseTo(0, 6);
      expect(Math.abs(right.knee.x - right.ankle.x)).toBeLessThan(legs.shin * .2);
      // The left boot tipped right up onto its toe, behind the knee, its shin rising back to it.
      expect(pose.legL - pose.kneeL + pose.footL).toBeCloseTo(-ON_TOES, 6);
      expect(left.ankle.x).toBeLessThan(left.knee.x - legs.shin * .5);
      expect(left.ankle.y).toBeGreaterThan(left.knee.y);
    });

  it('goes down and comes up without a jump in any joint, the knee reaching the floor only at the end', () => {
    for (const legs of [REHEARSAL_LEGS, SHORT, BOY]) {
      const clip = CLIPS.kneel;
      let previous = kneelPose(clip, 0, legs, { ...STANDING });
      for (const joint of ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR'] as const) expect(Math.abs(previous[joint]), joint).toBeLessThan(.05);
      for (let frame = 1; frame <= clip.seconds * 120; frame++) {
        const pose = kneelPose(clip, frame / 120, legs, { ...STANDING });
        for (const joint of ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'lean', 'armR', 'elbowR'] as const) {
          expect(Math.abs(pose[joint] - previous[joint]), `${joint} at ${frame / 120}`).toBeLessThan(.12);
        }
        previous = pose;
      }
      // The knee comes down softly: the last tenth of the way takes over a tenth of a second.
      const down = clip.down!;
      const at = (share: number) => { for (let t = 0; t <= clip.seconds; t += .001) if (sample(down, t) >= share) return t; return clip.seconds; };
      expect(at(1) - at(.9)).toBeGreaterThan(.1);
    }
  });
});
