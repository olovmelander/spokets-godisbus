import { Group, Quaternion, Sphere, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { creatureClips, type CreatureClips } from './creature-clips';

/**
 * The small animals beside his way, modelled, rigged and animated in Blender (art/blender/ambient-animals.py), and
 * the little lives the game gives them: the mallards swim about, dabble, preen, look round, quack, and now and then
 * rise and flap; the frog sits breathing with its throat pumping, croaks, snaps at a fly, and hops off, away from
 * Elof when he comes close; the hedgehog snuffles and wanders, and rolls into a ball when he comes near, and unrolls
 * once he has gone; the snail creeps, looks about with its eyestalks, and draws into its shell when he is near.
 *
 * Each is put where its stand-in was (./outdoor-models.ts, Äventyr 2's kit spots), by the shared installer
 * (./shared-models.ts), which asks `rigAmbient` for a copy with bones and clips of its own. Where its GLB is missing,
 * or has no clips, the installer keeps the old way (./kit-life.ts moves the stand-in). The kit builds them facing
 * +X; the one each takes the place of faced the camera (the snail: to the left), turned by its place's `turn`.
 * Everything here is in the world's own units, and they keep near their place, never crossing his path.
 */

/** Which GLB of the aventyr2 pack each is in, its armature, the mesh it shows, and how its rest faces from the old. */
export const AMBIENT: Readonly<Record<string, { file: string; creature: string; mesh: string; facing: number }>> = {
  and: { file: 'ankor', creature: 'anka', mesh: 'and', facing: -Math.PI / 2 },
  'and-hona': { file: 'ankor', creature: 'anka', mesh: 'and-hona', facing: -Math.PI / 2 },
  groda: { file: 'groda', creature: 'groda', mesh: 'groda-kropp', facing: -Math.PI / 2 },
  igelkott: { file: 'igelkott', creature: 'igelkott', mesh: 'igelkott-kropp', facing: -Math.PI / 2 },
  snigel: { file: 'snigel', creature: 'snigel', mesh: 'snigel-kropp', facing: Math.PI },
};

/** As the kit builds them (art/blender/ambient-animals.py; a test holds the two the same). */
export const HEDGEHOG_STRIDE = 0.34;
export const HOP_FRAMES = 30;
export const HOP_LIFT = 4;
export const HOP_LAND = 19;
export const HOP_DISTANCE = 2.2;
const FPS = 24;

/** The clips each must have to be given a life here. */
const NEEDS: Readonly<Record<string, readonly string[]>> = {
  anka: ['paddle', 'dabble', 'preen', 'look', 'quack', 'flap'],
  groda: ['sit', 'hop', 'croak', 'catch'],
  igelkott: ['walk', 'sniff', 'curl', 'uncurl'],
  snigel: ['crawl', 'look', 'hide'],
};

export interface AmbientRig {
  readonly kind: string;
  readonly creature: string;
  readonly clips: CreatureClips;
  /** Turned against its place's own turn, so that inside it the world's directions hold (scaled by the place). */
  readonly level: Group;
  /** Where it has gone from its place, and the way it faces. */
  readonly mover: Group;
  /** What it is doing, and for how long it has. */
  mode: string;
  time: number;
  /** Its own random numbers, the same each time for the same place. */
  seed: number;
  /** Where it is from its place, in EL of the world, and the way it faces (about y, 0 along +x). */
  x: number;
  z: number;
  heading: number;
  home: number | null;
  /** Where it goes next, the next thing it does, and how far it is through a stride or a hop. */
  aimX: number;
  aimZ: number;
  next: number;
  phase: number;
  /** The hop's start and its way. */
  fromX: number;
  fromZ: number;
  hopHeading: number;
  /** How far into its shell or ball, from 0 to 1; how long he has been away. */
  hidden: number;
  away: number;
  lastClock: number | null;
}

export interface AmbientContext {
  clock: number;
  still: boolean;
  /** Where Elof is, in the world. */
  elof?: { x: number; y: number } | null;
  /** The ground's height at a world x, where it is known (else the place's own height holds). */
  ground?: (x: number) => number;
  /** How far from its place it may go, in EL (else each its own). */
  range?: number;
}

/**
 * The rigged animal installed in a place (by ./shared-models.ts). Kept beside the scene, not in the place's userData,
 * which three copies as JSON when an object is cloned.
 */
const RIGS = new WeakMap<Object3D, AmbientRig>();
export function attachAmbient(place: Object3D, rig: AmbientRig): void {
  RIGS.set(place, rig);
}
export function ambientOf(place: Object3D): AmbientRig | undefined {
  return RIGS.get(place);
}

/** A copy of the animal `kind` from its model, with its own bones and clips; null if the model has none. */
export function rigAmbient(model: Object3D, kind: string): AmbientRig | null {
  const spec = AMBIENT[kind];
  if (!spec) return null;
  const node = model.getObjectByName(spec.creature);
  if (!node) return null;
  // The armature alone is copied, with the file's clips.
  node.animations = model.animations ?? [];
  const clips = creatureClips(node, spec.creature, { fade: 0.3 });
  if (!clips || NEEDS[spec.creature]!.some((name) => !clips.has(name))) {
    clips?.dispose();
    return null;
  }
  clips.root.traverse((object) => {
    const mesh = object as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    // The two mallards share their bones: each place shows its own.
    mesh.visible = mesh.name === spec.mesh;
    // Drawn only when in view: round it, wide enough for all its clips take it (a flap, a hop).
    mesh.geometry.computeBoundingSphere();
    const sphere = mesh.geometry.boundingSphere!.clone();
    sphere.radius *= 1.9;
    mesh.boundingSphere = new Sphere(sphere.center, sphere.radius);
    mesh.frustumCulled = true;
  });
  const level = new Group();
  const mover = new Group();
  level.name = `ambient:${kind}`;
  level.add(mover);
  mover.add(clips.root);
  return {
    kind, creature: spec.creature, clips, level, mover, mode: 'start', time: 0, seed: 1, x: 0, z: 0, heading: 0, home: null,
    aimX: 0, aimZ: 0, next: 0, phase: 0, fromX: 0, fromZ: 0, hopHeading: 0, hidden: 0, away: 99, lastClock: null,
  };
}

/** A number from 0 to 1, the next of the rig's own. */
function random(rig: AmbientRig): number {
  rig.seed = (rig.seed * 16807) % 2147483647;
  return (rig.seed - 1) / 2147483646;
}

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };
/** The shortest turn from a to b. */
const turnTo = (a: number, b: number) => Math.atan2(Math.sin(b - a), Math.cos(b - a));
const toward = (from: number, to: number, most: number) => from + Math.max(-most, Math.min(most, turnTo(from, to)));

/** How far through its hop a frog has gone, from its lift-off to its landing, at a phase of the hop clip. */
export function hopProgress(phase: number): number {
  return smooth((phase * HOP_FRAMES - HOP_LIFT) / (HOP_LAND - HOP_LIFT));
}

const placed = new Vector3();
const turned = new Quaternion();
const sized = new Vector3();

/**
 * One frame of an animal's life, for the place it is installed in. False if the place has no rigged animal (its
 * stand-in then lives as before). In reduced motion it rests where it was put, in its first pose.
 */
export function stepAmbient(place: Object3D, context: AmbientContext): boolean {
  const rig = RIGS.get(place);
  if (!rig) return false;
  const { clock, still } = context;
  const dt = rig.lastClock === null ? 0 : Math.min(0.1, Math.max(0, clock - rig.lastClock));
  rig.lastClock = clock;
  // The place's own turn and size in the world: the level group undoes the turn, so its x and z are the world's.
  place.matrixWorld.decompose(placed, turned, sized);
  const placeTurn = Math.atan2(2 * (turned.w * turned.y + turned.x * turned.z), 1 - 2 * (turned.y * turned.y + turned.x * turned.x));
  const size = sized.x || 1;
  const rest = placeTurn + AMBIENT[rig.kind]!.facing;
  if (rig.home === null || rig.mode === 'start') {
    rig.home = placed.x;
    rig.heading = rest;
    rig.seed = 1 + Math.floor(Math.abs(placed.x * 7919 + placed.z * 104729)) % 2147483000;
    rig.mode = 'idle';
    rig.next = 1 + 3 * random(rig);
  }
  if (still) {
    rig.mode = 'idle';
    rig.time = 0;
    rig.x = 0;
    rig.z = 0;
    rig.heading = rest;
    rig.hidden = 0;
    rig.clips.scrub(IDLE[rig.creature]!, 0);
  } else {
    const near = context.elof ? Math.abs(context.elof.x - (placed.x + rig.x)) + Math.max(0, Math.abs(context.elof.y - placed.y) - 1) : 99;
    const range = context.range ?? RANGE[rig.creature]!;
    if (rig.creature === 'anka') duck(rig, dt, near, range, size);
    else if (rig.creature === 'groda') frog(rig, dt, near, range, size, context.elof ? context.elof.x - placed.x : 99);
    else if (rig.creature === 'igelkott') hedgehog(rig, dt, near, range, size);
    else snail(rig, dt, near, range, size);
  }
  rig.clips.update(dt);
  // Into the place's space: turned back by the place's turn, and in its size.
  rig.level.rotation.y = -placeTurn;
  rig.level.scale.setScalar(1 / size);
  const lift = context.ground && !still ? context.ground(placed.x + rig.x) - context.ground(placed.x) : 0;
  const bob = rig.creature === 'anka' && !still ? 0.018 * Math.sin(clock * 1.6 + rig.seed % 7) : 0;
  rig.mover.position.set(rig.x, lift + bob, rig.z);
  rig.mover.rotation.y = rig.heading;
  rig.mover.scale.setScalar(size);
  return true;
}

const IDLE: Readonly<Record<string, string>> = { anka: 'paddle', groda: 'sit', igelkott: 'sniff', snigel: 'crawl' };
/** How far from its place each goes, in EL. */
const RANGE: Readonly<Record<string, number>> = { anka: 1.0, groda: 1.8, igelkott: 1.3, snigel: 0.5 };

function enter(rig: AmbientRig, mode: string): void {
  rig.mode = mode;
  rig.time = 0;
}

/** A place to go to, inside its range: along the bank mostly, a little in and out. */
function aim(rig: AmbientRig, range: number, depth: number): void {
  rig.aimX = (random(rig) * 2 - 1) * range;
  rig.aimZ = (random(rig) * 2 - 1) * depth;
}

function duck(rig: AmbientRig, dt: number, near: number, range: number, size: number): void {
  rig.time += dt;
  const c = rig.clips;
  if (rig.mode === 'idle' || rig.mode === 'swim') {
    // He has come to the water's edge: a quack for him, once in a while.
    if (near < 2.4 && rig.away > 6) {
      rig.away = 0;
      enter(rig, 'quack');
      c.play('quack', { once: true, fade: 0.2, restart: true });
      return;
    }
    rig.away = near < 2.4 ? 0 : rig.away + dt;
  }
  if (rig.mode === 'idle') {
    c.play('paddle', { speed: 0.45 });
    if (rig.time > rig.next) {
      const pick = random(rig);
      const action = pick < 0.42 ? 'swim' : pick < 0.62 ? 'dabble' : pick < 0.76 ? 'preen' : pick < 0.88 ? 'look' : pick < 0.95 ? 'quack' : 'flap';
      enter(rig, action);
      if (action === 'swim') aim(rig, range, 0.35);
      else c.play(action, { once: true, fade: 0.3, restart: true });
    }
    return;
  }
  if (rig.mode === 'swim') {
    const dx = rig.aimX - rig.x, dz = rig.aimZ - rig.z;
    const far = Math.hypot(dx, dz);
    const want = Math.atan2(-dz, dx);
    rig.heading = toward(rig.heading, want, 1.4 * dt);
    // It swims on as it turns, slower while it is still turned away from where it is going.
    const facing = Math.max(0, Math.cos(turnTo(rig.heading, want)));
    const speed = 0.38 * size * facing * smooth(far / 0.3);
    rig.x += Math.cos(rig.heading) * speed * dt;
    rig.z -= Math.sin(rig.heading) * speed * dt;
    c.play('paddle', { speed: 1.1 });
    if (far < 0.06 || rig.time > 14) {
      enter(rig, 'idle');
      rig.next = 1.5 + 4 * random(rig);
    }
    return;
  }
  // One of its doings, to its end, and then it floats again.
  if (rig.time >= c.duration(rig.mode) - 0.05) {
    enter(rig, 'idle');
    rig.next = 2 + 5 * random(rig);
  }
}

function frog(rig: AmbientRig, dt: number, near: number, range: number, size: number, elofFromHome: number): void {
  rig.time += dt;
  const c = rig.clips;
  // As far as the kit's hop goes, or as far as its place allows (a frog on a stone hops shorter).
  const hopLength = Math.min(HOP_DISTANCE * size, range);
  /** Off along x, this way (+1 or -1), if a hop that way keeps it in its range. */
  const hopWay = (way: number) => Math.abs(rig.x + way * hopLength) <= range + 0.01;
  if (rig.mode === 'idle') {
    c.play('sit');
    // Too near: it hops away from him, if it can; else it keeps still.
    const fromElof = elofFromHome - rig.x > 0 ? -1 : 1;
    if (near < 1.6 && rig.time > 0.6 && hopWay(fromElof)) {
      startHop(rig, fromElof, random(rig), hopLength);
      return;
    }
    if (rig.time > rig.next) {
      const pick = random(rig);
      if (pick < 0.3) { enter(rig, 'croak'); c.play('croak', { once: true, fade: 0.2, restart: true }); }
      else if (pick < 0.6) { enter(rig, 'catch'); c.play('catch', { once: true, fade: 0.15, restart: true }); }
      else {
        const way = Math.abs(rig.x) > 0.3 ? -Math.sign(rig.x) : random(rig) < 0.5 ? -1 : 1;
        if (hopWay(way)) startHop(rig, way, random(rig), hopLength);
        else rig.next = rig.time + 2;
      }
    }
    return;
  }
  if (rig.mode === 'turn') {
    // It shuffles round to face where it will hop, then goes.
    rig.heading = toward(rig.heading, rig.hopHeading, 4 * dt);
    c.play('sit');
    if (Math.abs(turnTo(rig.heading, rig.hopHeading)) < 0.02) {
      enter(rig, 'hop');
      rig.fromX = rig.x;
      rig.fromZ = rig.z;
    }
    return;
  }
  if (rig.mode === 'hop') {
    const length = HOP_FRAMES / FPS;
    const phase = Math.min(1, rig.time / length);
    c.scrub('hop', Math.min(phase, 0.999));
    const k = hopProgress(phase);
    rig.x = rig.fromX + Math.cos(rig.hopHeading) * hopLength * k;
    rig.z = rig.fromZ - Math.sin(rig.hopHeading) * hopLength * k;
    if (phase >= 1) {
      enter(rig, 'idle');
      rig.next = 3 + 5 * random(rig);
      c.play('sit', { fade: 0.15 });
    }
    return;
  }
  if (rig.time >= c.duration(rig.mode) - 0.05) {
    enter(rig, 'idle');
    rig.next = 3 + 5 * random(rig);
  }
}

/**
 * A hop along x, `way` (+1 or -1), turned a little in or out from the bank: back towards the line it was put on, so
 * that it never wanders out across his path. It turns to face that way first.
 */
function startHop(rig: AmbientRig, way: number, wobble: number, length: number): void {
  const along = way > 0 ? 0 : Math.PI;
  rig.hopHeading = along + Math.max(-0.35, Math.min(0.35, (way * rig.z) / length + (wobble - 0.5) * 0.3));
  enter(rig, 'turn');
}

function hedgehog(rig: AmbientRig, dt: number, near: number, range: number, size: number): void {
  rig.time += dt;
  const c = rig.clips;
  const close = near < 2.6;
  rig.away = close ? 0 : rig.away + dt;
  if (close && rig.mode !== 'curl' && rig.mode !== 'curled') {
    enter(rig, 'curl');
    c.play('curl', { once: true, fade: 0.12, restart: true });
    return;
  }
  if (rig.mode === 'curl' || rig.mode === 'curled') {
    if (rig.mode === 'curl' && rig.time >= c.duration('curl')) enter(rig, 'curled');
    // Once he has been gone a while, it unrolls.
    if (rig.mode === 'curled' && rig.away > 2.5) {
      enter(rig, 'uncurl');
      c.play('uncurl', { once: true, fade: 0.05, restart: true });
    }
    return;
  }
  if (rig.mode === 'uncurl') {
    if (rig.time >= c.duration('uncurl') - 0.05) { enter(rig, 'idle'); rig.next = 1 + 2 * random(rig); }
    return;
  }
  if (rig.mode === 'idle') {
    c.play('sniff');
    if (rig.time > rig.next) {
      enter(rig, 'walk');
      aim(rig, range, 0.25);
      // It keeps behind where it was put, never out towards his path.
      rig.aimZ = -Math.abs(rig.aimZ);
    }
    return;
  }
  // Walking: its strides counted by how far it goes, so that its feet do not slide.
  const dx = rig.aimX - rig.x, dz = rig.aimZ - rig.z;
  const far = Math.hypot(dx, dz);
  const want = Math.atan2(-dz, dx);
  rig.heading = toward(rig.heading, want, 2.2 * dt);
  const speed = 0.4 * size * Math.max(0, Math.cos(turnTo(rig.heading, want))) * smooth(far / 0.15) + 0.04 * size;
  const step = speed * dt;
  rig.x += Math.cos(rig.heading) * step;
  rig.z -= Math.sin(rig.heading) * step;
  rig.phase += step / (HEDGEHOG_STRIDE * size);
  c.scrub('walk', rig.phase);
  if (far < 0.05 || rig.time > 12) { enter(rig, 'idle'); rig.next = 3 + 5 * random(rig); }
}

function snail(rig: AmbientRig, dt: number, near: number, range: number, size: number): void {
  rig.time += dt;
  const c = rig.clips;
  const close = near < 2.2;
  rig.away = close ? 0 : rig.away + dt;
  // Into its shell at once when he comes; out again slowly, a while after he has gone.
  const inside = close || (rig.hidden > 0 && rig.away < 3);
  rig.hidden = Math.max(0, Math.min(1, rig.hidden + (inside ? dt / 1.5 : -dt / 3)));
  if (rig.hidden > 0) {
    c.scrub('hide', Math.min(0.999, rig.hidden));
    if (rig.mode !== 'out') enter(rig, 'out');
    return;
  }
  if (rig.mode === 'out' || rig.mode === 'idle') {
    enter(rig, 'look');
    rig.next = 3 + 4 * random(rig);
  }
  if (rig.mode === 'look') {
    c.play('look', { fade: 0.6 });
    if (rig.time > rig.next) { enter(rig, 'crawl'); rig.next = 18 + 20 * random(rig); }
    return;
  }
  // Creeping on, turning slowly back towards its place once it has gone far enough; a little in from its line at most.
  const outward = Math.cos(rig.heading) * rig.x - Math.sin(rig.heading) * rig.z;
  if (Math.hypot(rig.x, rig.z) > range && outward > 0) rig.heading += (rig.z > 0 ? 0.3 : -0.3) * dt;
  const speed = 0.05 * size;
  rig.x += Math.cos(rig.heading) * speed * dt;
  rig.z = Math.max(-0.25, Math.min(0.2, rig.z - Math.sin(rig.heading) * speed * dt));
  c.play('crawl', { fade: 0.6 });
  if (rig.time > rig.next) { enter(rig, 'look'); rig.next = 3 + 4 * random(rig); }
}
