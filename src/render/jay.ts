import { BoxGeometry, ConeGeometry, CylinderGeometry, Group, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3, type Object3D } from 'three';
import { creatureClips, creatureClipsOf, type CreatureClips } from './creature-clips';
import { wingbeat } from './wingbeat';

/**
 * Lavskrikan, the Siberian jay (plan 4.6): modelled, rigged and animated in Blender (art/blender/jay.py, boot/jay.glb),
 * in every place it is: on the ground where he gives it a lingonberry (Granskogen, Stormskogen, and the summit's sharing,
 * the spot look 'jay'), as the helper that comes when he asks (./props.ts helperProp), and at the window in the prologue
 * (./stage.ts). Where its GLB is missing the bird built here in code (`jayStandIn`) stands in, and moves as before.
 *
 * Its clips (jay:<clip>): idle, look, hop, peck, eat, call, takeoff, fly, glide, land, perch. Each place holds a group
 * named 'bird', its feet at the origin and facing +x; `rigJay` puts a copy of the rigged jay in it in place of the
 * stand-in. The bird turns to face him (or where it flies) through facing the lens: `heading` 1 is three-quarters to
 * the right, -1 three-quarters to the left, mirrored, so that the side of it that the clips turn to the lens (its right)
 * is always the one towards the lens; 0 faces the lens. Turning on the ground it hops round.
 */

/** Its parts that move in the stand-in: the wings beat about x. */
export const STAND_IN_WINGS = ['wingNear', 'wingFar'] as const;

const smooth = (v: number) => { const k = Math.min(1, Math.max(0, v)); return k * k * (3 - 2 * k); };

/** The jay built in code: grey-brown, a dark cap, a rust tail and wing patch. Its feet are at the origin; it faces +x. */
export function jayStandIn(): Group {
  const bird = new Group();
  bird.name = 'bird';
  const grey = new MeshStandardMaterial({ color: '#8c7f72', roughness: 0.9 });
  const rust = new MeshStandardMaterial({ color: '#b5622c', roughness: 0.8 });
  const dark = new MeshStandardMaterial({ color: '#2a2622', roughness: 0.5 });
  const ball = (radius: number, material: MeshStandardMaterial, x: number, y: number, z: number, squash: [number, number, number] = [1, 1, 1]) => {
    const mesh = new Mesh(new SphereGeometry(radius, 14, 10), material);
    mesh.position.set(x, y, z);
    mesh.scale.set(...squash);
    return mesh;
  };
  const body = ball(1, grey, 0, 0.36, 0, [0.3, 0.22, 0.2]);
  const head = ball(0.14, new MeshStandardMaterial({ color: '#5a4c42', roughness: 0.9 }), 0.22, 0.55, 0);
  head.name = 'head';
  const tail = new Mesh(new BoxGeometry(0.42, 0.05, 0.16), rust);
  tail.name = 'tail';
  tail.position.set(-0.36, 0.3, 0);
  tail.rotation.z = 0.35;
  const beak = new Mesh(new ConeGeometry(0.04, 0.14, 8), dark);
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.38, 0.55, 0);
  bird.add(body, head, tail, beak, ball(0.03, new MeshStandardMaterial({ color: '#111111', roughness: 0.2 }), 0.3, 0.59, 0.1));
  for (const side of [1, -1]) {
    const wing = new Mesh(new BoxGeometry(0.3, 0.03, 0.34), rust);
    wing.geometry.translate(0, 0, 0.17);
    wing.position.set(-0.04, 0.44, side * 0.12);
    wing.scale.z = side;
    wing.name = side > 0 ? 'wingNear' : 'wingFar';
    bird.add(wing);
    const leg = new Mesh(new CylinderGeometry(0.015, 0.015, 0.2, 8), dark);
    leg.position.set(0.02, 0.1, side * 0.07);
    bird.add(leg);
  }
  return bird;
}

/** How far it turns towards the lens, facing either way: 0.55 rad off the side. */
const THREE_QUARTER = 0.55;

/** Its turn and mirror for a heading (1: right, three-quarters on; 0: the lens; -1: left, mirrored). */
export function facing(heading: number): { yaw: number; mirror: 1 | -1 } {
  const h = Math.max(-1, Math.min(1, heading));
  const away = THREE_QUARTER + (Math.PI / 2 - THREE_QUARTER) * (1 - Math.abs(h));
  return h >= 0 ? { yaw: -away, mirror: 1 } : { yaw: away, mirror: -1 };
}

/** Puts a heading on a bird: its 'bird' group turned and, facing left, mirrored. */
export function face(bird: Object3D, heading: number): void {
  const { yaw, mirror } = facing(heading);
  bird.rotation.set(0, yaw, 0);
  bird.scale.set(mirror, 1, 1);
}

export interface JayRig {
  clips: CreatureClips;
  /** The lingonberry it takes, held at the tip of its beak (the bone 'bill'); hidden but while it has it. */
  berry: Mesh;
  /** Where it faces (see `face`), and the turn it hops through, if it is turning. */
  heading: number;
  turn: { from: number; to: number; t: number } | null;
  /** For how long it has had its berry; -1 before; NaN until its first frame on the ground. */
  since: number;
  /** The clip it plays now, when it plays one on its own clock. */
  playing: string;
  /** How long it has sat at the window, on its own clock. */
  life: number;
}

const rigs = new WeakMap<Object3D, JayRig>();

/** The rigged jay put in `bird` by rigJay, if one has been. */
export function jayRigOf(bird: Object3D | undefined | null): JayRig | undefined {
  return bird ? rigs.get(bird) : undefined;
}

/** Whether a model has the rigged jay's clips. */
export function hasJayClips(model: Object3D): boolean {
  return creatureClipsOf(model, 'jay').length > 0;
}

const CLIPS = ['idle', 'look', 'hop', 'peck', 'eat', 'call', 'fly', 'glide', 'land', 'perch', 'takeoff'];

/**
 * Puts a copy of the rigged jay in `bird` in the place of the stand-in's parts. `fade` 0: its clips change at once,
 * as the window's do, which work out every pose from the scene's seconds. Null, and nothing changed, if the model has
 * no jay with all its clips.
 */
export function rigJay(bird: Object3D, model: Object3D, fade = 0.25): JayRig | null {
  const clips = creatureClips(model, 'jay', { fade });
  if (!clips || CLIPS.some((name) => !clips.has(name))) return null;
  bird.clear();
  bird.add(clips.root);
  const berry = new Mesh(new SphereGeometry(0.05, 12, 8), new MeshStandardMaterial({ color: '#c0182a', roughness: 0.25 }));
  berry.name = 'jay-berry';
  berry.visible = false;
  // Pinched at the tip of its beak: the bone's own y runs along the beak.
  berry.position.set(0, -0.02, 0);
  clips.bone('bill')?.add(berry);
  const rig: JayRig = { clips, berry, heading: 1, turn: null, since: Number.NaN, playing: '', life: 0 };
  rigs.set(bird, rig);
  return rig;
}

/** Plays a clip on its own clock; `as` names what it is doing, where one clip serves two (a hop round, hops for joy). */
function play(rig: JayRig, name: string, options: { once?: boolean; restart?: boolean; speed?: number } = {}, as = name): void {
  rig.clips.play(name, options);
  rig.playing = as;
}

// --- on the ground, where he gives it a berry --------------------------------------------------------------------------

/**
 * How long it eats its berry; when the berry is in its beak (as the clip `eat` is made); then it calls (the clip `call`)
 * and hops for joy.
 */
export const EAT = { seconds: 56 / 24, from: 0.3, swallowed: 27 / 24, call: 32 / 24, hops: 3 } as const;
/** A hop on the spot, and the part of it in the air, as shares of it (the clip `hop`: frames 4 to 9 of 12). */
const HOP = { seconds: 0.5, from: 0.3, to: 0.75 } as const;
/** Within this far of it, it looks at him. */
const NEAR = 3.2;

export interface GroundFrame {
  /** Its berry has been given. */
  used: boolean;
  clock: number;
  dt: number;
  /** Where it stands, and where he is, if it knows. */
  x: number;
  elof?: { x: number; y: number };
  calm: boolean;
}

/**
 * The jay where he gives it a lingonberry, for one frame: it looks about and pecks while he is away, turns to him (a
 * hop round) and cocks its head at him when he comes near, and given its berry it reaches out, takes it, swallows it,
 * calls and hops for joy. With less motion it holds still, turned to him.
 */
export function stepGroundJay(bird: Object3D, rig: JayRig, f: GroundFrame): void {
  const dx = f.elof ? f.elof.x - f.x : Infinity;
  const want = !f.elof ? rig.heading : dx < -0.25 ? -1 : dx > 0.25 ? 1 : Math.sign(rig.heading) || 1;
  const near = Math.abs(dx) < NEAR;
  // Given its berry before it came (a game taken up again), it has had it long since.
  if (Number.isNaN(rig.since)) rig.since = f.used ? Infinity : -1;
  else if (f.used) rig.since = rig.since < 0 ? 0 : rig.since + f.dt;
  else rig.since = -1;
  const eating = rig.since >= 0 && rig.since < EAT.seconds;
  const after = rig.since - EAT.seconds;
  const calling = after >= 0 && after < EAT.call;
  const glad = after >= EAT.call && after < EAT.call + EAT.hops * HOP.seconds;
  rig.berry.visible = !f.calm && rig.since >= EAT.from && rig.since < EAT.swallowed;
  if (f.calm) {
    rig.turn = null;
    rig.heading = want;
    face(bird, rig.heading);
    rig.clips.scrub(near || f.used ? 'look' : 'idle', 0);
    rig.clips.update(f.dt);
    return;
  }
  if (rig.turn) {
    rig.turn.t += f.dt;
    const k = smooth((rig.turn.t / HOP.seconds - HOP.from) / (HOP.to - HOP.from));
    rig.heading = rig.turn.from + (rig.turn.to - rig.turn.from) * k;
    if (rig.turn.t >= HOP.seconds) { rig.heading = rig.turn.to; rig.turn = null; }
  } else if (want !== Math.sign(rig.heading) && !eating && !calling) {
    // It hops round to face him.
    rig.turn = { from: rig.heading, to: want, t: 0 };
    play(rig, 'hop', { once: true, restart: true });
  }
  face(bird, rig.heading);
  if (!rig.turn) {
    if (eating) { if (rig.playing !== 'eat') play(rig, 'eat', { once: true, restart: true }); }
    else if (calling) { if (rig.playing !== 'call') play(rig, 'call', { once: true, restart: true }); }
    else if (glad) { if (rig.playing !== 'glad') play(rig, 'hop', { restart: true }, 'glad'); }
    else if (near || f.used) play(rig, 'look');
    // Away from him it looks about, and now and then pecks at the ground.
    else play(rig, (f.clock + f.x * 1.7) % 11 > 8.4 ? 'peck' : 'idle');
  }
  rig.clips.update(f.dt);
}

// --- the helper ----------------------------------------------------------------------------------------------------------

/** The helper's wingbeat (./props.ts helperProp beats its rise and fall with the same): bursts, then glides. */
export const HELPER_BEAT = { hz: 3.5, rhythm: { every: 1.7, glide: 0.4, held: 0.1 } } as const;

/**
 * The jay as the helper, in the air over what it shows him: each beat of `fly` at the game's wingbeat, and `glide` in
 * its glides; it turns to face him (or up and away as it leaves), through facing the lens. Still with less motion: its
 * wings held out.
 */
export function stepFlyingJay(bird: Object3D, rig: JayRig, clock: number, dt: number, still: boolean, toward: number): void {
  const want = toward < 0 ? -1 : 1;
  rig.heading = still ? want : rig.heading + (want - rig.heading) * (1 - Math.exp(-4 * dt));
  face(bird, rig.heading);
  rig.berry.visible = false;
  if (still) rig.clips.scrub('glide', 0);
  else {
    const beat = wingbeat(clock, HELPER_BEAT.hz, HELPER_BEAT.rhythm);
    rig.clips.scrub('fly', clock * HELPER_BEAT.hz, 1 - beat.glide);
    if (beat.glide > 0) rig.clips.scrub('glide', clock / rig.clips.duration('glide'), beat.glide);
  }
  rig.clips.update(dt);
}

// --- at the window ---------------------------------------------------------------------------------------------------------

/** When it lands (its feet on the sill), how long it takes to come down onto it, and its touchdown in the clip `land`. */
export const WINDOW = { landed: 1.6, land: 18 / 24, touchdown: 9 / 18, leave: 2.2, takeoff: 18 / 24, flapHz: 4.5 } as const;
/** The two notes of its call, as the opening plays it with the scene's 'bird' sound at 1.6 s (src/audio/audio.ts). */
const CALL = [[1.68, 0.13], [1.9, 0.2]] as const;
const SIZE = 1.6;

export interface WindowPose {
  /** From the place on the sill, in EL, and its size. */
  offset: Vector3;
  scale: number;
  heading: number;
  /** Tipped as it banks in flight (the stand-in's lean). */
  lean: number;
  /** In the air (its wings beat). */
  flying: boolean;
  /** The clips of its flight, landing and leaving, each at a phase and with a weight: for the rigged jay. */
  clips: { name: string; phase: number; weight: number }[];
  /** The share of its pose that is its sitting on the sill, which goes on on its own clock (`sitting`). */
  settled: number;
  /** How far its beak is open for its call, 0 to 1. */
  call: number;
}

/**
 * Where the jay at the window is at `age` seconds of a scene `seconds` long, and how it flies: all from the scene's own
 * seconds, so that a scene taken up again, or paused, shows the same. It flies in from up to the right and lands on the
 * sill at 1.6 s, calls, sits there turned to the room, and at the end takes off and flies away up to the right.
 */
export function windowPose(age: number, seconds: number, calm: boolean): WindowPose {
  const offset = new Vector3();
  const scale = SIZE * smooth(Math.min(1, age / 0.3, (seconds - age) / 0.4));
  if (calm) return { offset, scale, heading: -0.35, lean: 0, flying: false, clips: [], settled: 1, call: 0 };
  const landing = smooth(age / WINDOW.landed), fly = 1 - landing;
  offset.set(fly * 2.8, fly * 1.8, fly * 0.8);
  const leaveAt = seconds - WINDOW.leave;
  const rise = WINDOW.takeoff * 0.4;
  const up = age > leaveAt + rise ? smooth((age - leaveAt - rise) / (WINDOW.leave - rise)) : 0;
  offset.x += up * 3.2;
  offset.y += up * 2.4;
  offset.z += up * 0.9;
  const landFrom = WINDOW.landed - WINDOW.land * WINDOW.touchdown;
  const clips: WindowPose['clips'] = [];
  const beat = wingbeat(age, WINDOW.flapHz, { every: 0.9, glide: 0.25, held: 0.1 });
  const flight = (weight: number) => {
    if (weight <= 0) return;
    clips.push({ name: 'fly', phase: age * WINDOW.flapHz, weight: weight * (1 - beat.glide) });
    if (beat.glide > 0) clips.push({ name: 'glide', phase: 0.25, weight: weight * beat.glide });
  };
  let heading: number;
  let flying = true;
  let settled = 0;
  if (age < landFrom) {
    flight(1);
    // In from the right, facing the way it flies.
    heading = -1;
  } else if (age < leaveAt) {
    const k = (age - landFrom) / WINDOW.land;
    const into = smooth((age - landFrom) / 0.12);
    settled = smooth((k - 1) / 0.45);
    flight(1 - into);
    if (settled < 1) clips.push({ name: 'land', phase: Math.min(1, k), weight: into * (1 - settled) });
    flying = k < WINDOW.touchdown;
    // Down on the sill it turns to the room, to the family coming to look at it.
    heading = -1 + 0.65 * smooth((age - WINDOW.landed) / 1.2);
  } else {
    const k = (age - leaveAt) / WINDOW.takeoff;
    settled = 1 - smooth(k / 0.15);
    if (k < 1) clips.push({ name: 'takeoff', phase: k, weight: 1 - settled });
    else flight(1);
    flying = k > 0.3;
    // It turns to the way it goes, up to the right, as it springs.
    heading = -0.35 + 1.35 * smooth(k / 0.6);
  }
  let call = 0;
  for (const [at, long] of CALL) {
    const k = (age - at) / long;
    if (k > 0 && k < 1) call = Math.max(call, Math.sin(Math.PI * k));
  }
  return { offset, scale, heading, lean: flying ? -0.18 * fly : 0, flying, clips, settled, call };
}

/**
 * Its sitting on the sill, `t` seconds into it: it grips the sill and looks about (`perch`), and every so often cocks
 * its head at the family (`look`). These go on through a held line, on their own clock.
 */
export function sitting(t: number): { name: string; phase: number; weight: number }[] {
  const cycle = 10, looking = 6, fade = 0.35;
  const c = t % cycle;
  const look = Math.min(smooth((c - looking) / fade), smooth((cycle - c) / fade));
  const out = [{ name: 'perch', phase: (t / 4) % 1, weight: 1 - look }];
  if (look > 0) out.push({ name: 'look', phase: ((c - looking) / 3) % 1, weight: look });
  return out;
}

const turn = new Quaternion();
const X = new Vector3(1, 0, 0);

/**
 * Poses the jay at the window (`jay`: its group on the stage, `at`: the place on the sill) for a frame: the stand-in
 * as before, its wings beating while it flies; the rigged jay by its clips. Where it is and how it flies come from `age`
 * alone, never the clock; sitting, it goes on looking about by `dt` (0 while the game is paused), as the family breathes.
 */
export function poseWindowJay(jay: Object3D, at: { x: number; y: number; z?: number }, age: number, seconds: number, calm: boolean, dt = 0): void {
  const pose = windowPose(age, seconds, calm);
  const bird = jay.getObjectByName('bird');
  const rig = jayRigOf(bird);
  jay.position.set(at.x + pose.offset.x, at.y + pose.offset.y, (at.z ?? 0) + pose.offset.z);
  jay.scale.setScalar(pose.scale);
  // The stand-in tips as it comes down; the rigged jay's clips pitch it themselves.
  jay.rotation.set(0, 0, calm || rig ? 0 : pose.lean);
  if (!bird) return;
  face(bird, pose.heading);
  if (!rig) {
    // The stand-in: its wings beat while it is in the air, and it tips its head to the room.
    const wingBeat = pose.flying ? Math.sin(age * 19) * 0.9 : 0;
    const near = jay.getObjectByName('wingNear'), far = jay.getObjectByName('wingFar');
    if (near) near.rotation.x = -wingBeat;
    if (far) far.rotation.x = wingBeat;
    const head = jay.getObjectByName('head');
    if (head) head.rotation.z = calm || pose.flying ? 0 : Math.sin(Math.max(0, age - WINDOW.landed) * 2) * 0.12;
    return;
  }
  for (const clip of pose.clips) rig.clips.scrub(clip.name, clip.phase, clip.weight);
  if (pose.settled > 0) {
    if (!calm) rig.life += dt;
    for (const clip of sitting(calm ? 0 : rig.life)) rig.clips.scrub(clip.name, clip.phase, clip.weight * pose.settled);
  } else rig.life = 0;
  rig.clips.update(0);
  // Its call: the beak opens on each note, the crown up.
  if (pose.call > 0) {
    rig.clips.bone('jaw')?.quaternion.multiply(turn.setFromAxisAngle(X, -0.6 * pose.call));
    rig.clips.bone('crest')?.quaternion.multiply(turn.setFromAxisAngle(X, -0.35 * pose.call));
  }
}
