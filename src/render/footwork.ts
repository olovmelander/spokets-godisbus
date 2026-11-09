import { ankleOf, reachWith } from './gait';
import type { Legs, Pose } from './rig';

/**
 * Turning on the spot, a body steps round, as people do: the feet stay where they stand while the hips turn over them, a
 * planted foot pivoting on its ball with its heel a little up and its leg turning at the hip for the rest; once a leg is
 * turned too far or a foot is left too far from under its hip, it steps. A turn of more than a little opens the foot on
 * the side it turns towards first, the other follows, and a large turn takes another; each step puts the weight over the
 * other foot first, lifts the foot, and sets it down under its hip where the hips will have come round to, turned a little
 * further on. Small turns are taken on the balls of the feet alone. Pure: no three, no clock of its own; one for each
 * body that stands (./stage.ts), which hands it where the body stands and which way its hips face and are to face.
 */

const TAU = Math.PI * 2;
const wrap = (a: number) => a - TAU * Math.round(a / TAU);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/** A planted foot whose heel is up turns with the hips by this share of their turn, on its ball; its leg takes the rest. */
const PIVOT = 0.6;
/** How far up the heel has to be (radians) for the foot to pivot freely: flat, it holds and the leg turns. */
const LIGHT = 0.06;
/** A pivoting foot's heel lifts as fast as the hips turn (radians of heel for each radian a second), at most HEEL. */
const HEEL_RATE = 0.07, HEEL = 0.2;
/** A planted foot steps once its leg is turned this far from the hips (radians), or it stands this far from under its hip
 * (a share of the height): its `need` is 1 there. */
const TURNED = 0.5, ASTRAY = 0.05;
/** A turn still to go of more than this (radians) opens the foot on the side it turns towards, and the other follows. */
const OPEN = 0.45;
/** The foot that steps points on past where the hips will be when it lands, by this share of the turn left, at most OPENS. */
const LEAD = 0.5, OPENS = 0.5;
/** Once the turn is over, a foot whose need is past this closes up with one more step; less, it stays as it is. The first
 * step of a turn under way is taken at FIRST. */
const SETTLE = 0.65, FIRST = 0.6;
/** Seconds of the weight going over the other foot before a foot lifts. */
const PREP = 0.1;
/** How far over the other foot the hips go for a step, a share of the way to it; and how quickly (radians a second). */
const OVER = 0.55, OVER_RATE = 22;
/** How high a step lifts the foot: a share of the height, more for a longer step, at most LIFT_MOST. */
const LIFT = 0.016, LIFT_WAY = 0.25, LIFT_MOST = 0.045;
/** How far a step's toes point down in the air (radians). */
const TOES = 0.14;
/** The hips come down at most this far for a foot left far (a share of the height), and as quickly as this (a second). */
const LOWER = 0.02, LOWER_RATE = 14;

interface Foot { x: number; z: number; yaw: number; heel: number }
interface Step { side: 0 | 1; u: number; seconds: number; fromX: number; fromZ: number; fromYaw: number; fromHeel: number; lift: number; lifted: boolean }

/** Where a body stands (`x`, `z`: world units), which way its hips face and are to face (`yaw`, `target`: a group's turn
 * about y), how fast they may turn (radians a second), how tall it is, how far out each foot stands standing (a share of
 * the height), and the seconds since the last frame. */
export interface Standing { x: number; z: number; yaw: number; target: number; rate: number; height: number; width: number; dt: number }

export function createFootwork() {
  const feet: [Foot | null, Foot | null] = [null, null];
  let step: Step | null = null;
  /** Which foot stepped last in this turn, and how long since a step ended (seconds). */
  let last: 0 | 1 | null = null, still = 0;
  let lastYaw: number | null = null;
  /** The weight over a foot (sway, an adult's units), and how fast it goes there. */
  let shift = 0, shiftSpeed = 0;
  /** How far the hips have come down for a foot further than the leg reaches (a share of the height). */
  let lowered = 0;
  /** Walking off: how far each foot stands from where the stride has it (world units), which way it points, and how much of
   * that is left (1 until the stride lifts it). */
  type Carried = { x: number; z: number; yaw: number; k: number; heel: number };
  const carried: [Carried | null, Carried | null] = [null, null];

  /** Where each foot stands under its hip, for hips facing `yaw`: its ankle in the world. */
  const home = (side: 0 | 1, at: Standing, yaw: number) => {
    const out = (side === 0 ? 1 : -1) * at.width * at.height;
    return { x: at.x + out * Math.cos(yaw), z: at.z - out * Math.sin(yaw) };
  };
  /** A point of the world in the body's own terms (its left and ahead, shares of its height). */
  const body = (x: number, z: number, at: Standing) => {
    const dx = (x - at.x) / at.height, dz = (z - at.z) / at.height, c = Math.cos(at.yaw), s = Math.sin(at.yaw);
    return { left: dx * c - dz * s, ahead: dx * s + dz * c };
  };
  /** How far from under its hip a foot is, as a share of where it would step. */
  const need = (side: 0 | 1, at: Standing): number => {
    const f = feet[side]!, b = body(f.x, f.z, at);
    return Math.max(Math.abs(wrap(f.yaw - at.yaw)) / TURNED, Math.hypot(b.left - (side === 0 ? 1 : -1) * at.width, b.ahead) / ASTRAY);
  };

  return {
    /** Forget where the feet stood: the body has been put somewhere, walks, kneels or sits; standing again, they stand under it. */
    reset(): void {
      feet[0] = feet[1] = null; step = null; last = null; still = 0; lastYaw = null; shift = shiftSpeed = 0; lowered = 0;
      carried[0] = carried[1] = null;
    },
    /** Whether the feet stand anywhere a stride would not put them, or are being handed over to one. */
    get moved(): boolean {
      return feet[0] !== null || carried[0] !== null || carried[1] !== null;
    },
    /**
     * Walking off from where the feet stood: each foot stays where it stands, turned as it was, until the stride (whose legs
     * the pose has) lifts it, and comes in to where the stride has it while it is in the air. `down`: which feet the stride
     * has on the ground. Once both have come in, the footwork is done with them.
     */
    carry(pose: Pose, legs: Legs, at: Standing, down: readonly [boolean, boolean]): void {
      const dt = Math.max(0, at.dt);
      for (const side of [0, 1] as const) {
        const s = side === 0 ? 1 : -1;
        const a = ankleOf(pose, side, legs);
        // Where the stride has the ankle, in the world.
        const left = (s * (legs.width + a.out)) * at.height, ahead = a.ahead * at.height, c = Math.cos(at.yaw), sn = Math.sin(at.yaw);
        const x = at.x + left * c + ahead * sn, z = at.z - left * sn + ahead * c;
        const f = feet[side];
        if (f && !carried[side]) carried[side] = { x: f.x - x, z: f.z - z, yaw: f.yaw, k: 1, heel: f.heel };
        const kept = carried[side];
        if (!kept) continue;
        if (!down[side]) kept.k = Math.max(0, kept.k - dt / 0.25);
        // A heel up on its toe comes down about the toe, and the hips come up, as the weight goes onto it.
        kept.heel *= Math.exp(-8 * dt);
        const k = smooth(kept.k);
        if (k <= 0) { carried[side] = null; if (side === 0) pose.yawL = 0; else pose.yawR = 0; continue; }
        const b = body(at.x + kept.x * k, at.z + kept.z * k, at);
        const yaw = wrap(kept.yaw - at.yaw) * k, heel = kept.heel * k;
        const mx = s * a.out + b.left, mz = a.ahead + b.ahead, cy = Math.cos(yaw), sy = Math.sin(yaw);
        const fore = legs.toe * (1 - Math.cos(heel)) - legs.ankle * Math.sin(heel), rise = -legs.toe * Math.sin(heel) + legs.ankle * (Math.cos(heel) - 1);
        reachWith(mx * sy + mz * cy + fore, a.down - lowered - rise, s * (mx * cy - mz * sy), a.pitch + heel, legs, pose, side);
        if (side === 0) pose.yawL = yaw; else pose.yawR = yaw;
      }
      lowered *= Math.exp(-8 * dt);
      feet[0] = feet[1] = null; step = null; last = null; lastYaw = null; shift = shiftSpeed = 0;
    },
    /**
     * The feet of a body standing `at`, over the legs the pose has (its act's): each foot's ankle moved from under its hip
     * to where it stands, the leg turned at the hip as far as the foot is, and the weight over a foot for a step.
     */
    stand(pose: Pose, legs: Legs, at: Standing): void {
      const dt = Math.max(0, at.dt);
      for (const side of [0, 1] as const) if (!feet[side]) { const h = home(side, at, at.yaw); feet[side] = { x: h.x, z: h.z, yaw: at.yaw, heel: 0 }; }
      const turned = lastYaw === null ? 0 : wrap(at.yaw - lastYaw);
      lastYaw = at.yaw;
      const left = wrap(at.target - at.yaw);
      const toe = legs.toe * at.height;
      // The feet that stand pivot on their balls with the hips, as far as their heels are up; the heels lift as the hips turn.
      for (const side of [0, 1] as const) {
        const f = feet[side]!;
        if (step?.side === side && step.lifted) continue;
        const free = smooth(-f.heel / LIGHT);
        if (turned !== 0 && free > 0) {
          const bx = f.x + toe * Math.sin(f.yaw), bz = f.z + toe * Math.cos(f.yaw);
          f.yaw += PIVOT * turned * free;
          f.x = bx - toe * Math.sin(f.yaw); f.z = bz - toe * Math.cos(f.yaw);
        }
        const heel = dt > 0 ? -Math.min(HEEL, HEEL_RATE * Math.abs(turned) / dt) : f.heel;
        f.heel += (heel - f.heel) * (1 - Math.exp(-12 * dt));
        if (Math.abs(f.heel) < 1e-5) f.heel = 0;
      }
      // Which foot steps, if one does: the one on the side the body turns towards opens, the other follows, alternately while
      // the turn lasts; any foot left too far steps; once the turn is over, one left far enough closes up.
      if (!step) {
        still += dt;
        if (still > 0.6) last = null;
        // Which way it turns: where the hips are to face, or else where they are going.
        const way = Math.abs(left) > 0.02 ? left : turned;
        const towards: 0 | 1 = way > 0 ? 0 : 1;
        const turning = Math.abs(left) > 0.02 || Math.abs(turned) > 1e-4;
        // The first step of a turn is the foot on the side it turns to, the next the other, and so on.
        const first: 0 | 1 = last === null ? turning ? towards : need(0, at) >= need(1, at) ? 0 : 1 : (1 - last) as 0 | 1;
        const other = (1 - first) as 0 | 1;
        // Turning, a foot steps once it needs to (the first sooner, the turn being under way); after it, one left far enough.
        const enough = turning ? last === null ? FIRST : 1 : SETTLE;
        let side: 0 | 1 | null = null;
        if (Math.abs(left) > OPEN || need(first, at) >= enough) side = first;
        // Whichever foot is far enough, a turn starts with the foot on its own side.
        else if (need(other, at) >= enough) side = turning && last === null ? first : other;
        // The next step of a turn follows the last at once, the weight going straight over onto the foot just put down.
        if (side !== null && (last !== null || still > 0.03)) {
          const f = feet[side]!, seconds = 0.22 + 0.08 * clamp(at.height / 5.2, 0, 1);
          step = { side, u: -(last === null ? PREP : PREP / 2) / seconds, seconds, fromX: f.x, fromZ: f.z, fromYaw: f.yaw, fromHeel: f.heel, lift: 0,
            lifted: false };
        }
      }
      let raise = 0, airPitch = 0;
      if (step) {
        step.u += dt / step.seconds;
        const f = feet[step.side]!;
        if (step.u >= 0) {
          if (!step.lifted) {
            step.lifted = true;
            step.fromX = f.x; step.fromZ = f.z; step.fromYaw = f.yaw; step.fromHeel = f.heel;
          }
          const k = Math.min(1, step.u);
          // Where it goes: under its hip, as the hips will be when it comes down, turned on a little past them.
          const most = at.rate * (1 - k) * step.seconds, land = at.yaw + clamp(left, -most, most);
          const toYaw = land + clamp(LEAD * wrap(at.target - land), -OPENS, OPENS);
          const to = home(step.side, at, land);
          if (step.lift === 0) step.lift = Math.min(LIFT_MOST, LIFT + LIFT_WAY * Math.hypot(to.x - f.x, to.z - f.z) / at.height);
          const e = smooth(k);
          f.x = step.fromX + (to.x - step.fromX) * e;
          f.z = step.fromZ + (to.z - step.fromZ) * e;
          f.yaw = step.fromYaw + wrap(toYaw - step.fromYaw) * e;
          raise = step.lift * Math.sin(Math.PI * k) ** 0.8;
          airPitch = step.fromHeel * (1 - e) - TOES * Math.sin(Math.PI * k);
          f.heel = 0;
          if (step.u >= 1) { last = step.side; step = null; still = 0; raise = 0; airPitch = 0; }
        }
      }
      // The weight goes over the foot that stays, before the other lifts, and back to the middle as it comes down.
      let over = 0;
      if (step && step.u < 0.6) {
        const stays = feet[1 - step.side]!, b = body(stays.x, stays.z, at);
        over = OVER * b.left * 5.2;
      }
      if (dt > 0) {
        const e = Math.exp(-OVER_RATE * dt), off = shift - over, k = (shiftSpeed + OVER_RATE * off) * dt;
        shift = over + (off + k) * e;
        shiftSpeed = (shiftSpeed - OVER_RATE * k) * e;
      }
      pose.sway += shift;
      pose.hipRoll += 0.1 * shift;
      // Each leg reaches its foot where it stands, from the hips the act has, turned at the hip as far as the foot points.
      const most = (legs.thigh + legs.shin) * 0.998;
      /** How far forward and up the ankle goes with the heel up `h` (radians) about the toe. */
      const fore = (h: number) => legs.toe * (1 - Math.cos(h)) - legs.ankle * Math.sin(h);
      const rise = (h: number) => -legs.toe * Math.sin(h) + legs.ankle * (Math.cos(h) - 1);
      const placed: { ahead: number; down: number; out: number; pitch: number; heel: number; yaw: number; up: boolean; reach: number; still: boolean }[] = [];
      for (const side of [0, 1] as const) {
        const f = feet[side]!, s = side === 0 ? 1 : -1, b = body(f.x, f.z, at);
        const moveLeft = b.left - s * at.width, moveAhead = b.ahead, yaw = wrap(f.yaw - at.yaw);
        const up = step?.side === side && step.lifted;
        const heel = up ? airPitch : f.heel;
        const a = ankleOf(pose, side, legs);
        const x = s * a.out + moveLeft, z = a.ahead + moveAhead, c = Math.cos(yaw), si = Math.sin(yaw);
        const ahead = x * si + z * c, down = a.down - (up ? raise : 0);
        const out = s * (x * c - z * si);
        const still = !up && heel === 0 && Math.abs(moveLeft) < 1e-7 && Math.abs(moveAhead) < 1e-7 && Math.abs(yaw) < 1e-7;
        placed.push({ ahead, down, out, pitch: a.pitch, heel, yaw, up, reach: Math.max(most, Math.hypot(a.ahead, a.down, a.out)), still });
      }
      // A foot put further than the leg reaches from where the act has the hips brings them down a little, both knees giving,
      // as far as LOWER; further than that, it rolls up onto its toe.
      let lower = 0;
      for (const p of placed) if (!p.up) lower = Math.max(lower, p.down - rise(p.heel) - Math.sqrt(Math.max(0, p.reach * p.reach - (p.ahead + fore(p.heel)) ** 2 - p.out * p.out)));
      lower = Math.min(LOWER, lower);
      lowered += (lower - lowered) * (1 - Math.exp(-LOWER_RATE * dt));
      placed.forEach((p, side) => {
        if (side === 0) pose.yawL = p.yaw; else pose.yawR = p.yaw;
        // A foot where the act has it, under hips where the act has them, keeps the act's own leg.
        if (p.still && lowered < 1e-7) return;
        let heel = p.heel;
        const far = (h: number) => Math.hypot(p.ahead + fore(h), p.down - lowered - rise(h), p.out);
        if (!p.up && far(heel) > p.reach) {
          let near = heel, most = -0.7;
          if (far(most) > p.reach) near = most;
          else for (let i = 0; i < 12; i++) { const mid = (near + most) / 2; if (far(mid) > p.reach) near = mid; else most = mid; }
          heel = far(near) <= p.reach ? near : most;
        }
        reachWith(p.ahead + fore(heel), p.down - lowered - rise(heel), p.out, p.pitch + heel, legs, pose, side as 0 | 1);
      });
    },
  };
}
export type Footwork = ReturnType<typeof createFootwork>;
