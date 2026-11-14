import type { ChapterData, PlayerState } from '../sim/types';
import { groundedHips, JOINTS, STANDING, type Pose } from './rig';

/**
 * How he is drawn going down a slide's chute (src/sim/chute.ts; Olov, 14 November 2026: "när han tar sig nedför ska han
 * åka"): on his bottom, his legs out ahead of him along the chute, his arms up and out, leaning back a little as he
 * gathers speed. The simulation has him on the chute's line; here he sits on it.
 *
 * The chute's rolled rims stand a third of him over its floor (art/blender/a2-built.py, `rutschkana`), so a body lying
 * on the floor would show only its trunk and arms over the near rim. He is sat with his legs just over the rims, where
 * they are seen: the rim hides the little that is under him.
 */

/** How high his hip joints are over the chute's line, in an adult's units (Pose.seat): his legs clear the rims. */
const SEAT = 1.7;
/** How long he takes to sit down as the slide begins, and to get his legs under him again as it ends, in seconds. */
const SIT = 0.16, RISE = 0.12;

const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

export function createChuteSlide(chapter: Pick<ChapterData, 'chutes'>) {
  const chutes = chapter.chutes ?? [];
  const sat: Pose = { ...STANDING };
  let weight = 0, slope = 0, fast = 0;
  return {
    /** How far into the sitting pose he is drawn, from 0 to 1. */
    get weight(): number { return smooth(weight); },
    /**
     * Sits `pose` (his own motion's, this frame) down by as much as he slides. `calm`: with less motion he sits still,
     * his arms held up, and sits at once.
     */
    pose(pose: Pose, player: Pick<PlayerState, 'x' | 'vx' | 'vy' | 'sliding'>, dt: number, clock: number, calm: boolean): void {
      if (chutes.length === 0) return;
      const on = player.sliding === true;
      weight = calm ? (on ? 1 : 0) : Math.min(1, Math.max(0, weight + (on ? dt / SIT : -dt / RISE)));
      if (weight <= 0) return;
      if (on) {
        const chute = chutes.find((c) => (player.x - c.from.x) * (player.x - c.to.x) <= 0) ?? chutes[0]!;
        slope = Math.atan2(chute.from.y - chute.to.y, Math.abs(chute.to.x - chute.from.x));
        // Faster, he leans back more and his arms go higher: 0 as he sits down, 1 at the foot.
        fast = Math.min(1, Math.hypot(player.vx, player.vy) / 6);
      }
      const k = smooth(weight), wave = calm ? 0 : Math.sin(clock * 11);
      Object.assign(sat, STANDING);
      // His thighs lie along the chute, a little over it at the knees; the shins come down to it, toes up.
      sat.legL = Math.PI / 2 - slope + 0.2; sat.legR = Math.PI / 2 - slope + 0.08;
      sat.kneeL = 0.34; sat.kneeR = 0.2;
      sat.footL = 0.35; sat.footR = 0.3;
      sat.splayL = 0.1; sat.splayR = 0.1;
      // Upright at first, leaning back into it as he goes, his face up.
      sat.lean = 0.12 - 0.3 * fast;
      sat.nod = -0.12 - 0.1 * fast;
      // Arms out ahead of him and up, the one nearer the camera the lower, under his chin, the other over it: his arms
      // are short beside his head, and held straight up they lie along it and read as hands on his head. Higher the
      // faster he goes, and shaking a little with the ride.
      const near = player.vx >= 0 ? 'armR' : 'armL', far = player.vx >= 0 ? 'armL' : 'armR';
      sat[near] = 1.85 + 0.28 * fast + 0.06 * wave; sat[far] = 2.45 + 0.3 * fast - 0.06 * wave;
      sat.elbowL = 0.12; sat.elbowR = 0.12;
      sat.spread = 0.22;
      sat.wristL = -0.2; sat.wristR = -0.2;
      const stood = pose.seat ?? groundedHips(pose);
      for (const joint of JOINTS) pose[joint] += (sat[joint] - pose[joint]) * k;
      pose.seat = stood + (SEAT - stood) * k;
      pose.bounce *= 1 - k;
    },
  };
}
