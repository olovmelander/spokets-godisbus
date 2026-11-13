import { Vector3, type Object3D } from 'three';
import { FACING_CAMERA, owlBone, seatOwlAt, type OwlRig } from '../../render/owl';
import { wingbeat } from '../../render/wingbeat';
import type { ChapterData } from '../../sim/types';

/**
 * The story's owl in Äventyr 2, as the rigged owl plays it (../../render/owl.ts, art/blender/owl.py): each moment of it
 * poses its clips and turns it, and says where it is. ./render.ts gives each moment the owl's holder and its clock.
 *
 * - **Sitting** (`sit`): its idle, `perch`, on the game's clock from a seed of its own, facing the camera.
 * - **In its hollow** (`hollow`, Stormskogen): `trapped` behind the branch; freed, `freed`, a hop out of the hole on its
 *   first beats (`takeoff`), and away up over the forest towards where it will wait (`fly`).
 * - **Called** (`called`, Älven): off its stone (`takeoff`), a couple of beats and a glide over (`fly`, `glide`), and down
 *   beside him (`land`), turning from the camera to the way it goes and back.
 * - **Coming in** (`landing`, Stormens öga): in from the lake on still wings (`glide`), down onto the jetty's end (`land`).
 *   It flies leftwards, so it is mirrored: its near wing stays the one towards the camera, and its face turns to it.
 * - **Carrying him** (`carry`, `ride`): up from where it waited (`takeoff`), `carry` and `glide` in the game's own
 *   wingbeat, braking with its talons forward at the end (`land`), and then away behind him (`fly`).
 * With less motion asked for, its own motions hold still (a glide's wings, a sitting owl's first pose); where it goes
 * is as before.
 */

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The seconds its freeing takes, the hop out of the hollow (as long as `takeoff`), and its flight away. */
export const FREED = 1.5;
export const HOP = 0.83;
export const AWAY = 3;
/** How long it takes, once down, to fold its wings and sit (the rest of `land`). */
export const SETTLE = 0.45;
/** Where in `land` its feet touch the ground. */
const TOUCH = 19 / 30;
/** The wingbeats a second as it carries him (as the stand-in's), and flying off on its own. */
export const CARRY_HZ = 0.86;
const AWAY_HZ = 1.3;

function at(rig: OwlRig, x: number, y: number, z: number): void {
  rig.turn.position.set(x, y, z);
}

/** Sitting, facing the camera (or, mirrored, facing it too). */
export function sit(rig: OwlRig, clock: number, dt: number, seed: number, still: boolean, mirrored = false): void {
  const { clips, turn } = rig;
  turn.scale.set(mirrored ? -1 : 1, 1, 1);
  turn.rotation.set(0, mirrored ? -FACING_CAMERA : FACING_CAMERA, 0);
  at(rig, 0, 0, 0);
  clips.scrub('perch', still ? 0 : (clock + seed) / clips.duration('perch'));
  clips.update(dt);
}

/**
 * The owl in its hollow: `since` is how long it has been free (negative while it is trapped). It moves `root`, the
 * spot's own group, from `from` (where it sits in the hollow). False once it has flown out of the picture.
 */
export function hollow(rig: OwlRig, root: Object3D, from: Vector3, since: number, clock: number, dt: number, still: boolean): boolean {
  const { clips, turn } = rig;
  turn.scale.set(1, 1, 1);
  at(rig, 0, 0, 0);
  if (since < 0) {
    turn.rotation.set(0, FACING_CAMERA, 0);
    root.position.copy(from);
    clips.scrub('trapped', still ? 0.45 : clock / clips.duration('trapped'));
  } else if (since < FREED) {
    // A shake, its feathers ruffled out and smoothed, its wings shaken out.
    turn.rotation.set(0, FACING_CAMERA, 0);
    root.position.copy(from);
    clips.scrub('freed', since / FREED);
  } else if (since < FREED + HOP) {
    // Out of the hole on its first beats, turning to the way it will go.
    const h = (since - FREED) / HOP;
    clips.scrub('takeoff', h);
    turn.rotation.set(0, FACING_CAMERA * (1 - smooth((h - 0.25) / 0.6)), 0);
    root.position.set(from.x + 0.5 * smooth(h), from.y + 0.3 * smooth(h), from.z + 1.1 * smooth(h / 0.55));
  } else {
    // Away over the forest, beating hard and climbing, and back among the trees.
    const f = since - FREED - HOP;
    clips.scrub('fly', still ? 0.25 : f * AWAY_HZ);
    turn.rotation.set(0, 0, Math.min(0.32, f * 0.45));
    root.position.set(from.x + 0.5 + 2.8 * f + 1.1 * f * f, from.y + 0.3 + 0.5 * f + 0.8 * f * f, from.z + 1.1 - 1.2 * f);
  }
  clips.update(dt);
  return since < FREED + HOP + AWAY;
}

/**
 * The owl called over to where he climbs onto it (Älven): `since` from its call (negative before), over `glide`
 * seconds, going right if `right`. The caller moves it along its way; this poses and turns it.
 */
export function called(rig: OwlRig, since: number, glide: number, right: boolean, clock: number, dt: number, seed: number, still: boolean): void {
  if (since < 0 || since >= glide + SETTLE) {
    sit(rig, clock, dt, seed, still, !right);
    return;
  }
  const { clips, turn } = rig;
  const face = right ? FACING_CAMERA : -FACING_CAMERA;
  turn.scale.set(right ? 1 : -1, 1, 1);
  at(rig, 0, 0, 0);
  const t = since;
  const up = 0.3;
  const down = glide - 0.55;
  let yaw = 0;
  if (t < up) {
    clips.scrub('takeoff', 0.2 + 0.6 * (t / up));
    yaw = face * (1 - smooth(t / up));
  } else if (t < down) {
    // A beat or two, and then it glides.
    const g = still ? 1 : smooth((t - up - 0.2) / 0.25);
    clips.scrub('fly', (t - up) * 2.2 + 0.1, 1 - g);
    clips.scrub('glide', 0.25, g);
  } else if (t < glide) {
    clips.scrub('land', TOUCH * ((t - down) / (glide - down)));
    yaw = face * smooth((t - down - 0.15) / 0.5);
  } else {
    clips.scrub('land', TOUCH + (1 - TOUCH) * ((t - glide) / SETTLE));
    yaw = face;
  }
  turn.rotation.set(0, yaw, 0);
  clips.update(dt);
}

/**
 * The owl that comes in from the lake to the jetty's end (Stormens öga), leftwards: `k` from 0 (far out) to 1 (down),
 * and `after`, the seconds since it came down. Its nose follows its way down, `dive` radians under level.
 */
export function landing(rig: OwlRig, k: number, after: number, dive: number, clock: number, dt: number, seed: number, still: boolean): void {
  if (after >= SETTLE) {
    sit(rig, clock, dt, seed, still, true);
    return;
  }
  const { clips, turn } = rig;
  turn.scale.set(-1, 1, 1);
  at(rig, 0, 0, 0);
  const start = 0.55;
  let yaw = 0;
  let nose = dive;
  if (k < start) clips.scrub('glide', still ? 0.25 : clock / clips.duration('glide'));
  else if (k < 1) {
    const l = (k - start) / (1 - start);
    clips.scrub('land', TOUCH * l);
    nose = dive * (1 - smooth(l / 0.5));
    yaw = -FACING_CAMERA * smooth((l - 0.45) / 0.55);
  } else {
    clips.scrub('land', TOUCH + (1 - TOUCH) * (after / SETTLE));
    nose = 0;
    yaw = -FACING_CAMERA;
  }
  turn.rotation.set(0, yaw, nose);
  clips.update(dt);
}

/** The ground of a chapter at x, from its ground line. */
export function groundAt(chapter: ChapterData | null, x: number): number {
  const line = chapter?.ground ?? [];
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
}

export interface RideFrame {
  /** Seconds since he climbed on; how much of the ride's way is left (1 to 0); where he is (his feet, the prop's place). */
  since: number;
  left: number;
  clock: number;
  dt: number;
  still: boolean;
  /** Where the owl he climbed onto was standing, if it was. */
  waits: Vector3 | null;
  /** The ground under him. */
  ground: number;
}

/** How long it takes to rise from where it stood and take him up. */
export const BOARD = 0.55;
/** How much of the way is left when it starts to brake, its talons forward. */
const BRAKE = 0.14;
const SEAT = new Vector3(0, 0.05, 0);
const tmp = new Vector3();
const PARTS = ['foot.L', 'foot.R', 'hind.L', 'hind.R'];

/** The lowest of it, in its holder's space: its feet, and its belly under the middle of its body. */
function lowest(rig: OwlRig): number {
  let low = owlBone(rig, 'plume', tmp).y - 0.55;
  for (const name of PARTS) low = Math.min(low, owlBone(rig, name, tmp).y - 0.04);
  return low;
}

/**
 * The owl that carries him, posed for this frame, its back under his feet. `prop` is the ride's prop, which the view has
 * put at his feet (turned as he climbs or comes down), with the owl's holder in it at its origin. It moves the prop: up
 * from where the owl stood as he climbs on, and over the ground where his feet come down to it.
 */
export function ride(rig: OwlRig, prop: Object3D, f: RideFrame): void {
  const { clips, turn } = rig;
  turn.scale.set(1, 1, 1);
  const lift = f.still ? 1 : smooth(f.since / BOARD);
  if (lift < 1) {
    clips.scrub('takeoff', 0.3 + 0.7 * f.since / BOARD);
    turn.rotation.set(0, FACING_CAMERA * (1 - smooth(f.since / (BOARD * 0.8))), 0);
  } else {
    turn.rotation.set(0, 0, 0);
    const beat = wingbeat(f.clock, CARRY_HZ, { every: 7, glide: 1.8, held: 0.3 });
    const glide = f.still ? 1 : beat.glide;
    const brake = f.still ? 0 : smooth((BRAKE - f.left) / BRAKE);
    clips.scrub('carry', f.clock * CARRY_HZ, (1 - glide) * (1 - brake));
    clips.scrub('glide', f.still ? 0.25 : f.clock / clips.duration('glide'), glide * (1 - brake));
    clips.scrub('land', 0.4 * brake, brake);
  }
  clips.update(f.dt);
  // Its back under his feet.
  turn.position.set(0, 0, 0);
  seatOwlAt(rig, SEAT);
  if (lift < 1 && f.waits) {
    // From where it stood: its feet there to begin with.
    tmp.set(f.waits.x - turn.position.x, f.waits.y - turn.position.y, f.waits.z - turn.position.z);
    prop.position.lerp(tmp, 1 - lift);
  }
  // Never under the ground: where he comes down, it brakes over the ground behind him, and he steps off its back.
  const floor = f.ground - lowest(rig);
  if (prop.position.y < floor) {
    const under = floor - prop.position.y;
    prop.position.y = floor;
    prop.position.z = Math.min(prop.position.z, -1.1 * smooth(under / 0.6));
  }
}

/** It has set him down: away behind him, up over the trees, `k` from 0 (just now) to 1 (gone). */
export function away(rig: OwlRig, prop: Object3D, down: Vector3, k: number, seconds: number, dt: number, still: boolean): void {
  const { clips, turn } = rig;
  turn.scale.set(1, 1, 1);
  turn.rotation.set(0, 0, 0);
  clips.scrub('fly', still ? 0.25 : seconds * AWAY_HZ + 0.6);
  clips.update(dt);
  prop.position.set(down.x + k * 6 + k * k * 4, down.y + k * 1.2 + k * k * 8, lerp(down.z, -1.4, smooth(k * 5)) - 2 * k);
  prop.rotation.set(0, 0, 0.3 * smooth(k * 3));
  prop.scale.setScalar(1);
}
