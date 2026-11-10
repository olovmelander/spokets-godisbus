import { Bone, Object3D, Quaternion, Skeleton, SkinnedMesh, Vector3 } from 'three';

/**
 * A grown-up walking past behind Byn's street, as tiny Elof sees one: the legs of the model made in Blender
 * (art/blender/a2-street.py, `fotgangare`), walked by the game. Each foot is planted where it lands: the heel strikes
 * ahead of the hips with the toes up, the foot rolls down flat and stays put while the body goes over it, the heel
 * lifts and the foot rolls over the ball, the toes bend and push off behind, and the leg swings through with its knee
 * bent, the trousers' hem trailing, to strike again. The hips dip as the legs reach and rise over the standing leg,
 * sway towards it and turn a little with the stride, and the coat's hem swings with them.
 *
 * Everything is a function of how far it has walked, so a paused clock holds it still and nothing is kept between
 * frames. Units: EL, along +x, with the ground at 0.
 */

/** The model's joints as it was made (art/blender/a2-street.py, SHARED). */
export const WALKER = { hip: 10.4, knee: 5.5, ankle: 0.9, ball: 1.75, ballUp: 0.3, heel: 0.78, hipWide: 1.02 } as const;
const THIGH = WALKER.hip - WALKER.knee;
const SHIN = WALKER.knee - WALKER.ankle;

/** The walk: how long a step is (one heel strike to the other's), and how fast it goes. */
export const STRIDE = { step: 6.6, speed: 9 } as const;
/** Of each leg's cycle, from its heel strike: when the foot is flat, when its heel lifts, and when its toes leave. */
const FLAT = 0.1;
const HEEL_OFF = 0.36;
const TOE_OFF = 0.6;
/** When the flat foot is under the hips: a little before the middle of its stance, so that it pushes off well behind. */
const UNDER = 0.25;
/** How far the toes are up as the heel strikes, and the heel up as the toes leave, in radians. */
const STRIKE = 0.3;
const PUSH = -0.82;
/** How high the hips are at most as it walks: a little under standing, so the standing knee is never locked. */
const HIPS = WALKER.hip - 0.12;
/** The longest a leg reaches from hip to ankle, a hair short of straight: the knee still bends a few degrees. */
const REACH = (THIGH + SHIN) * 0.997;

export interface LegPose {
  /** The ankle, relative to the hips' foot on the ground, and the foot's and the toes' pitch (toes up positive). */
  ankle: { x: number; y: number };
  foot: number;
  toes: number;
  /** Absolute angles of the thigh and the shin from hanging straight down, forward positive, and the knee. */
  thigh: number;
  shin: number;
  knee: { x: number; y: number };
  /** How much the trousers' hem trails behind the shin. */
  hem: number;
  /** True while the foot is on the ground. */
  planted: boolean;
}

export interface WalkPose {
  hips: { y: number; sway: number; turn: number; roll: number };
  coat: number;
  /** [left (-z, the far side), right (+z, the near side)]. */
  legs: [LegPose, LegPose];
}

const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
const smoother = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * k * (k * (k * 6 - 15) + 10); };
const frac = (v: number) => v - Math.floor(v);

/** Where the ankle of a foot flat on the ground is, `phase` into its stance: under the hips halfway through. */
function flatAnkle(phase: number): number {
  return 2 * STRIDE.step * (UNDER - phase);
}

/** The ankle and the foot's and toes' pitch, `phase` (0 to 1) into a leg's cycle, from its heel strike. */
function foot(phase: number): { x: number; y: number; foot: number; toes: number; planted: boolean } {
  const { heel, ankle, ball } = WALKER;
  if (phase < FLAT) {
    // Rolling down onto it from the heel, which stays where it struck.
    const pitch = STRIKE * (1 - smooth(phase / FLAT));
    const pivot = flatAnkle(phase) - heel;
    return { x: pivot + heel * Math.cos(pitch) - ankle * Math.sin(pitch), y: heel * Math.sin(pitch) + ankle * Math.cos(pitch), foot: pitch, toes: pitch, planted: true };
  }
  if (phase < HEEL_OFF) return { x: flatAnkle(phase), y: ankle, foot: 0, toes: 0, planted: true };
  if (phase < TOE_OFF) {
    // The heel lifts and the foot turns about the joint at the ball, which stays where it was; the toes stay flat on
    // the ground.
    const k = (phase - HEEL_OFF) / (TOE_OFF - HEEL_OFF);
    const pitch = PUSH * k * k * (1.6 - 0.6 * k);
    const pivot = flatAnkle(phase) + ball;
    const up = ankle - WALKER.ballUp;
    return { x: pivot - ball * Math.cos(pitch) - up * Math.sin(pitch), y: WALKER.ballUp - ball * Math.sin(pitch) + up * Math.cos(pitch), foot: pitch, toes: 0, planted: true };
  }
  // The swing: from where the toes left to where the heel strikes next, lifted on the way, the foot turning from
  // pointing down to its toes up.
  const from = foot(TOE_OFF - 1e-6);
  const to = foot(0);
  const u = (phase - TOE_OFF) / (1 - TOE_OFF);
  const along = smoother(u * 1.06 - 0.03);
  const x = from.x + (to.x - from.x) * along;
  const lift = 0.95 * Math.sin(Math.PI * Math.min(1, u * 1.15)) ** 1.4;
  const y = from.y + (to.y - from.y) * smooth(u) + lift;
  // Its pitch: up from pointing down through level to the toes up by the strike.
  const pitch = from.foot + (to.foot - from.foot) * smooth(u * 1.25 - 0.1);
  // The toes, bent up as they left, straighten early in the swing.
  return { x, y, foot: pitch, toes: pitch + (from.toes - from.foot) * (1 - smooth(u * 3)), planted: false };
}

/** Thigh and shin angles for a hip joint and an ankle, the knee forward: two bones, solved in the plane of the walk. */
function reach(hx: number, hy: number, ax: number, ay: number): { thigh: number; shin: number; knee: { x: number; y: number } } {
  const dx = ax - hx;
  const dy = ay - hy;
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(THIGH - SHIN) + 1e-3), THIGH + SHIN - 1e-4);
  const down = Math.atan2(dx, -dy);
  const open = Math.acos(Math.min(1, Math.max(-1, (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d))));
  const thigh = down + open;
  const knee = { x: hx + THIGH * Math.sin(thigh), y: hy - THIGH * Math.cos(thigh) };
  return { thigh, shin: Math.atan2(ax - knee.x, knee.y - ay), knee };
}

/** How high the hips can be for a standing leg's ankle at (x, y) to be in reach. */
const hipsFor = (x: number, y: number) => y + Math.sqrt(Math.max(0, REACH * REACH - x * x));
/** The lower of two, rounded off where they meet, so that the hips never jolt. */
const softMin = (a: number, b: number, k = 0.12) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));

/** The whole walk, `walked` EL along: the hips, the coat, and each leg. A pure function of the distance. */
export function walkPose(walked: number): WalkPose {
  const cycle = walked / (2 * STRIDE.step);
  const phases = [frac(cycle), frac(cycle + 0.5)] as const;
  const feet = phases.map(foot);
  // The hips as high as the standing legs let them, never higher than walking height.
  let y = HIPS;
  for (const f of feet) if (f.planted || f.y < WALKER.ankle + 0.5) y = softMin(y, hipsFor(f.x, f.y));
  // Towards the standing leg (the left's side is -z), the striking leg's hip turned forward, and dropping a little on
  // the swinging side.
  const left = phases[0];
  const sway = -0.2 * Math.sin(2 * Math.PI * (left - 0.05));
  const turn = -0.07 * Math.cos(2 * Math.PI * left);
  const roll = 0.035 * Math.sin(2 * Math.PI * (left - 0.05));
  const legs = feet.map((f, i) => {
    // The hip joint, carried forward and back as the hips turn about the upright, and up and down as they roll.
    const side = i === 0 ? 1 : -1;
    const hx = -side * WALKER.hipWide * Math.sin(turn);
    const hy = y + side * WALKER.hipWide * Math.sin(roll);
    const solved = reach(hx, hy, f.x, f.y);
    // The hem trails as the shin swings forward through the air, and settles as the foot comes down.
    const phase = phases[i]!;
    const swing = phase >= TOE_OFF ? (phase - TOE_OFF) / (1 - TOE_OFF) : -1;
    const hem = swing >= 0 ? -0.16 * Math.sin(Math.PI * swing) ** 1.5 : 0.05 * Math.exp(-phase * 30) * Math.sin(phase * 40);
    return { ankle: { x: f.x, y: f.y }, foot: f.foot, toes: f.toes, thigh: solved.thigh, shin: solved.shin, knee: solved.knee, hem, planted: f.planted };
  }) as [LegPose, LegPose];
  // The coat's hem trails a little as it walks, and each leg's swing pushes it forward for a moment.
  const coat = -0.035 + 0.03 * Math.sin(2 * Math.PI * (2 * left - 0.3));
  return { hips: { y, sway, turn, roll }, coat, legs };
}

/** One bone, with its rest pose and the axis it turns about in its parent's frame for a turn about the model's z. */
interface Joint { bone: Bone; rest: Quaternion; at: Vector3; side: Vector3; up: Vector3; ahead: Vector3 }

export interface Walker {
  /** Poses the legs `walked` EL along. */
  pose(walked: number): void;
}

const Z = new Vector3(0, 0, 1);
const Y = new Vector3(0, 1, 0);
const X = new Vector3(1, 0, 0);
const turn = new Quaternion();
const turned = new Quaternion();

/**
 * The walker in a copy of the model as installed (./shared-models.ts): its skinned mesh is bound again to the copy's own
 * bones, as a clone shares its source's skeleton, and its joints are found by name. Null if it is not the walker.
 */
export function rigWalker(copy: Object3D): Walker | null {
  let mesh: SkinnedMesh | null = null;
  copy.traverse((object) => { if ((object as SkinnedMesh).isSkinnedMesh && !mesh) mesh = object as SkinnedMesh; });
  if (!mesh) return null;
  const skinned = mesh as SkinnedMesh;
  const bones = skinned.skeleton.bones.map((bone) => copy.getObjectByName(bone.name) as Bone | undefined);
  if (bones.some((bone) => !bone?.isBone)) return null;
  skinned.bind(new Skeleton(bones as Bone[], skinned.skeleton.boneInverses), skinned.bindMatrix);
  // The root the bones hang from: the model's own frame, in which +y is up and +x is ahead.
  const root = (bones as Bone[]).find((bone) => !(bone.parent as Bone | null)?.isBone)!.parent!;
  const worldRest = (bone: Object3D): Quaternion => {
    const q = new Quaternion();
    for (let at: Object3D | null = bone; at && at !== root; at = at.parent) q.premultiply(at.quaternion);
    return q;
  };
  const joints = new Map<string, Joint>();
  for (const bone of bones as Bone[]) {
    const parentRest = worldRest(bone.parent!).invert();
    joints.set(bone.name, {
      bone, rest: bone.quaternion.clone(), at: bone.position.clone(),
      side: Z.clone().applyQuaternion(parentRest), up: Y.clone().applyQuaternion(parentRest), ahead: X.clone().applyQuaternion(parentRest),
    });
  }
  const need = ['hips', 'coat', 'thigh_l', 'calf_l', 'hem_l', 'foot_l', 'ball_l', 'thigh_r', 'calf_r', 'hem_r', 'foot_r', 'ball_r'];
  if (need.some((name) => !joints.has(name))) return null;
  const set = (name: string, angle: number, axis: 'side' | 'up' | 'ahead' = 'side', then?: Quaternion) => {
    const joint = joints.get(name)!;
    turned.setFromAxisAngle(joint[axis], angle);
    if (then) turned.multiply(then);
    joint.bone.quaternion.copy(turned).multiply(joint.rest);
  };
  return {
    pose(walked) {
      const walk = walkPose(walked);
      const hips = joints.get('hips')!;
      // The hips: down and up, towards the standing leg, a little turned and rolled.
      hips.bone.position.copy(hips.at).addScaledVector(hips.up, walk.hips.y - WALKER.hip).addScaledVector(hips.side, walk.hips.sway);
      turn.setFromAxisAngle(hips.ahead, walk.hips.roll);
      set('hips', walk.hips.turn, 'up', turn);
      set('coat', walk.coat);
      for (const [i, leg] of walk.legs.entries()) {
        const s = i === 0 ? 'l' : 'r';
        // Each bone turns by its angle less its parent's, about the axis across the walk.
        set(`thigh_${s}`, leg.thigh);
        set(`calf_${s}`, leg.shin - leg.thigh);
        set(`hem_${s}`, leg.hem);
        set(`foot_${s}`, leg.foot - leg.shin);
        set(`ball_${s}`, leg.toes - leg.foot);
      }
    },
  };
}
