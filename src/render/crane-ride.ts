import { Matrix4, Vector3, type Object3D } from 'three';
import { creatureClips, creatureClipsOf, type CreatureClips } from './creature-clips';

/**
 * The common crane of Myren and Berget, modelled, rigged and animated in Blender (art/blender/crane.py, boot/crane.glb),
 * as the rides play it. Where its GLB is missing the stand-in built in code (./crane.ts) is drawn and moved as before.
 *
 * Its clips (crane:<clip>): kneel, rise, stand, takeoff, fly, fly-free, glide, land. Its origin is on the ground under
 * the place on its back where he stands (the bone `saddle`). Here, the crane that waits on its shins at Myren plays
 * `kneel`; the one that carries him is placed and posed from where the simulation has his feet:
 *  - On the ground, before it lifts off (on Myren where it knelt, on Berget's hill where the chapter begins), it stays
 *    where it is and he is drawn on its back: kneeling while his feet are lower than its back, then rising by how high
 *    they are, so that its feet stay on the ground. When they are as high as its back standing, it leaps (`takeoff`, from
 *    the leap) and catches up with the way he goes.
 *  - In the air its back is under his feet: `fly`, scrubbed by the game's wingbeat (./wingbeat.ts), and `glide` in its
 *    glides. The near wing of `fly` rises only to about level, so that it never hides him.
 *  - In the last LAND seconds it lands (`land`: legs forward, wings braking, touchdown, down onto its shins). It never
 *    goes under the ground: where its feet or belly would, it stands on it, and he is drawn on its back.
 *  - When he has stepped down it rises, runs a few steps, takes off and flies away behind him (`fly-free`).
 * The seat it gives is where his feet are drawn while it holds him (./view.ts).
 */

/** The seconds before the end of a ride in which it lands. */
export const LAND = 1.5;
/** After he is off: how long it stays on its shins, rises, takes off, and when it is gone. */
const STAY = 0.45;
const RISE = 0.5;
const GONE = 5.0;
/** The leap in `takeoff`, as a share of the clip, and the run before it, in seconds. */
const LEAP = 19 / 34;
const RUN = 19 / 24;

export interface CraneRig {
  clips: CreatureClips;
  /** Where its back is at rest, in its own space: the point the ride prop turns about. */
  rest: Vector3;
  /** How high its back is, kneeling and standing, and its back's height through `rise`, by phase. */
  kneelSeat: number;
  standSeat: number;
  riseSeat: number[];
  /** What the ride remembers from frame to frame. */
  ride: { lifted: number; anchor: Vector3; z: number; down: Vector3; held: boolean };
}

const rigs = new WeakMap<Object3D, CraneRig>();
const tmp = new Vector3();
const inverse = new Matrix4();

/** The rigged crane put in `holder`, if one has been (by rigCrane). */
export function craneRigOf(holder: Object3D | undefined | null): CraneRig | undefined {
  return holder ? rigs.get(holder) : undefined;
}

/** Where a bone is in the creature's own space (its root's), as it is posed now. */
function boneAt(clips: CreatureClips, name: string, out: Vector3): Vector3 {
  const bone = clips.bone(name);
  if (!bone) return out.set(0, 0, 0);
  inverse.copy(clips.root.matrixWorld).invert();
  return out.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inverse);
}

/** The lowest of its feet and its belly, in its own space. */
function lowest(clips: CreatureClips): number {
  let low = Infinity;
  for (const name of ['belly', 'toes.L', 'toes.R', 'tarsus.L', 'tarsus.R']) low = Math.min(low, boneAt(clips, name, tmp).y);
  return low - 0.03;
}

/** How high its back is in each pose of `rise`, measured once on a copy of its own. */
function measure(model: Object3D): { kneel: number; stand: number; rise: number[]; rest: Vector3 } | null {
  const probe = creatureClips(model, 'crane', { fade: 0 });
  if (!probe || !probe.has('kneel') || !probe.has('rise') || !probe.has('stand')) return null;
  const seat = (name: string, phase: number) => {
    probe.scrub(name, phase);
    probe.update(0);
    probe.root.updateMatrixWorld(true);
    return boneAt(probe, 'saddle', tmp).y;
  };
  const rise = Array.from({ length: 25 }, (_, i) => seat('rise', i / 24));
  const kneel = seat('kneel', 0);
  const stand = seat('stand', 0);
  probe.dispose();
  // At rest: its back where it was bound, in the model as it came, before any clip.
  const rest = new Vector3();
  const bone = model.getObjectByName('saddle');
  model.updateMatrixWorld(true);
  if (bone) rest.setFromMatrixPosition(bone.matrixWorld).applyMatrix4(inverse.copy(model.matrixWorld).invert());
  return { kneel, stand, rise, rest };
}

/** The phase of `rise` at which its back is `height` high, from the heights measured through it. */
export function risePhase(seats: readonly number[], height: number): number {
  if (height <= seats[0]!) return 0;
  for (let i = 1; i < seats.length; i++) {
    if (height <= seats[i]!) {
      const a = seats[i - 1]!, b = seats[i]!;
      return (i - 1 + (b > a ? (height - a) / (b - a) : 1)) / (seats.length - 1);
    }
  }
  return 1;
}

/**
 * Puts a copy of the rigged crane in `holder`, in the place of the stand-in's parts. `turnsAtBack`: the holder turns
 * about the crane's back (a ride's prop), so the crane is hung from it there; otherwise it stands on the holder's origin.
 * Null, and nothing changed, if the model has no clips of the crane: the old one is put in as before.
 */
export function rigCrane(holder: Object3D, model: Object3D, turnsAtBack: boolean): CraneRig | null {
  if (creatureClipsOf(model, 'crane').length === 0) return null;
  const measured = measure(model);
  const clips = creatureClips(model, 'crane');
  if (!measured || !clips) return null;
  holder.clear();
  holder.add(clips.root);
  if (turnsAtBack) clips.root.position.set(-measured.rest.x, -measured.rest.y, 0);
  const rig: CraneRig = {
    clips, rest: measured.rest, kneelSeat: measured.kneel, standSeat: measured.stand, riseSeat: measured.rise,
    ride: { lifted: -1, anchor: new Vector3(), z: 0, down: new Vector3(), held: false },
  };
  rigs.set(holder, rig);
  return rig;
}

/** The kneeling crane, waiting for him: its idle, in time with the game's clock (so that the one he boards matches). */
export function kneel(rig: CraneRig, clock: number, dt: number): void {
  rig.clips.scrub('kneel', clock / rig.clips.duration('kneel'));
  rig.clips.update(dt);
}

export interface CraneRideFrame {
  /** Whether it carries him now, and how far through the ride he is (0 to 1), of how many seconds. */
  ridden: boolean;
  t: number;
  time: number;
  /** Where the simulation has his feet. */
  x: number;
  y: number;
  heading: number;
  ground: (x: number) => number;
  clock: number;
  dt: number;
  calm: boolean;
  /** Seconds since he got off; Infinity before he has ridden it. */
  landed: number;
  /** Where it waits for him: the kneeling crane's place (Myren), or the ride's start (Berget). */
  from: Vector3;
  /** The wingbeat: its phase in beats, how far into a glide, and the small nod with each beat. */
  beat: number;
  glide: number;
  pitch: number;
}

export interface CraneRideOut {
  /** Whether it is in the picture. */
  shown: boolean;
  /** Where his feet are drawn, while it holds him; null when it does not. */
  seat: Vector3 | null;
}

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
const back = new Vector3();
const seat = new Vector3();

/**
 * Poses and places the crane that carries him (`prop`, the ride's prop, whose origin is the crane's back at rest) for
 * this frame.
 */
export function rideCrane(rig: CraneRig, prop: Object3D, f: CraneRideFrame): CraneRideOut {
  const { clips, ride } = rig;
  if (!f.ridden && (!Number.isFinite(f.landed) || f.landed >= GONE || f.calm)) {
    ride.lifted = -1;
    ride.held = false;
    return { shown: false, seat: null };
  }
  let place: 'ground' | 'air' = 'air';
  let anchorZ = 0;
  let turn = 0;
  if (f.ridden) {
    const elapsed = f.t * f.time;
    const left = (1 - f.t) * f.time;
    const height = f.y - f.ground(f.x);
    if (!ride.held) {
      // He has just got on: it stands where it waited.
      ride.held = true;
      ride.lifted = -1;
      ride.anchor.copy(f.from);
      ride.z = f.from.z;
    }
    if (ride.lifted < 0 && height < rig.standSeat - 0.02) {
      place = 'ground';
      const rising = risePhase(rig.riseSeat, height);
      if (rising <= 0) clips.scrub('kneel', f.clock / clips.duration('kneel'));
      else clips.scrub('rise', rising);
      anchorZ = ride.z * (1 - smooth(rising));
    } else {
      if (ride.lifted < 0) ride.lifted = elapsed;
      const since = elapsed - ride.lifted;
      const takeoff = clips.duration('takeoff');
      if (left < LAND) clips.scrub('land', 1 - left / LAND);
      else if (since < takeoff * (1 - LEAP)) clips.scrub('takeoff', LEAP + since / takeoff);
      else {
        clips.scrub('fly', f.beat, 1 - f.glide);
        if (f.glide > 0) clips.scrub('glide', 0.5 * f.glide, f.glide);
      }
      // It points the way it flies, a little: never steeper than a climb it can make, and only once it is flying.
      const tilt = Math.max(-0.3, Math.min(0.3, f.heading * 0.6)) * smooth((since - 0.2) / 0.6);
      turn = left < LAND ? tilt * smooth((left - 0.6) / 0.6) : tilt + f.pitch;
    }
  } else {
    // He is off. It stays on its shins while he steps down, rises, runs, takes off and flies away behind him.
    if (ride.held) { ride.held = false; ride.down.copy(prop.position); }
    const l = f.landed;
    const ts = l - STAY - RISE;
    if (l < STAY) clips.scrub('land', 1);
    else if (ts < 0) clips.scrub('rise', (l - STAY) / RISE);
    else if (ts < clips.duration('takeoff')) clips.scrub('takeoff', ts / clips.duration('takeoff'));
    else clips.scrub('fly-free', f.beat);
    place = ts < RUN ? 'ground' : 'air';
    turn = 0.25 * smooth((ts - RUN) / 0.8);
  }
  clips.update(f.dt);
  clips.root.updateMatrixWorld(true);
  // Where its back is now, from where it is at rest; and its lowest point under it.
  boneAt(clips, 'saddle', back).sub(rig.rest);
  const low = lowest(clips) - rig.rest.y;
  if (f.ridden && place === 'ground') {
    prop.position.set(ride.anchor.x, f.ground(ride.anchor.x) + rig.rest.y, anchorZ);
    prop.rotation.set(0, 0, 0);
  } else if (f.ridden) {
    // In the air, its back under his feet; never through the ground. Lifting off, it catches up with where he is.
    prop.rotation.set(0, 0, turn);
    seat.copy(back).applyAxisAngle(Z, turn);
    const since = ride.lifted >= 0 ? f.t * f.time - ride.lifted : 1;
    const catchUp = smooth(since / 0.6);
    const x = f.x - seat.x;
    prop.position.set(ride.anchor.x + (x - ride.anchor.x) * catchUp, f.y - 0.05 - seat.y, ride.z * (1 - smooth(since / 0.5)));
    prop.position.y = Math.max(prop.position.y, f.ground(prop.position.x) - low);
    if (catchUp >= 1) ride.anchor.x = x;
  } else {
    // Away: a run along the ground, then up and away behind him.
    const ts = f.landed - STAY - RISE;
    const run = Math.max(0, ts);
    const flown = Math.max(0, ts - RUN);
    const ahead = 2.6 * Math.min(run, RUN) ** 2 / (2 * RUN) + 2.6 * flown + 1.6 * flown * flown;
    const x = ride.down.x + ahead;
    const ground = f.ground(x) - low;
    prop.rotation.set(0, 0, turn);
    prop.position.set(x, Math.max(ground, ride.down.y + 2.2 * flown ** 1.5), -0.7 * smooth(run / 1.2) - 1.8 * flown);
  }
  const shown = f.ridden || f.landed < GONE;
  if (!f.ridden) return { shown, seat: null };
  seat.copy(back).applyAxisAngle(Z, prop.rotation.z).add(prop.position);
  seat.y += 0.05;
  return { shown, seat };
}

const Z = new Vector3(0, 0, 1);
