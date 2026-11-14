import { CylinderGeometry, Group, Mesh, MeshStandardMaterial, Vector3, type BufferGeometry, type Object3D } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { SceneFrame } from '../sim/scene';
import type { ChapterData, Climb } from '../sim/types';
import { drawnWhile } from './idle';
import { EAT, face, jayRigOf, STAND_IN_WINGS, type JayRig } from './jay';

/**
 * Stormskogen: the jay brings the beard lichen down (Olov, 14 November 2026: "När man har gett lavskrikan ett lingon
 * och den visar vägen ska den först flyga upp över kanten. Därefter ska det tydligt framgå visuellt att det är
 * lavskrikan som ordnar det Elof kan klättra på för att ta sig upp. Nu dyker det som Elof ska klättra på upp direkt
 * när man ger fågeln lingonet."). Picture only: the simulation's climb is there from the flag the scene leaves.
 *
 * - Before, the lichen hangs wound up in a bundle on a dead snag that juts out over the root's edge: nothing hangs down
 *   the face.
 * - In the climb's scene (`broughtBy.scene`), which he is free in, the jay takes its berry and swallows it, springs,
 *   flies up over the edge, lands on the snag, and pecks at the bundle. Its second tug frees it (`broughtBy.at`): the
 *   lichen drops, unrolling down the face with its roll at its end, swings out the last of its fall and settles
 *   (./view.ts buildClimbs asks `broughtDown` how far). The jay hops out to the snag's tip, turns, looks down at him
 *   and calls.
 * - After, and in a game taken up later, the lichen hangs down and the jay sits on the snag looking at him.
 *
 * Everything is placed from the climb's own numbers (its x and its top) and the spot the jay stands at, never from
 * what the ground is drawn as. The bird's part comes from the scene's own seconds, so that a pause holds it and the
 * same moment always shows the same; its sitting, and the lichen's swing, go on by the picture's clock.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (v: number) => { const k = clamp01(v); return k * k * (3 - 2 * k); };
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

/** The jay's clips as art/blender/jay.py makes them, in seconds: their lengths, and the moments in them. */
const CLIP = {
  /** `takeoff`: a crouch, and its feet leave the ground. */
  takeoff: 18 / 24, leaves: 6 / 24,
  /** `land`: braking, and touchdown. */
  land: 18 / 24, touchdown: 9 / 24,
  /** `peck`: two stabs; the second is the tug that frees the lichen. */
  peck: 30 / 24, stabs: [9 / 24, 14 / 24],
  hop: 12 / 24, call: 32 / 24,
} as const;
/** How long it flies up, how its wings beat on the way, and how soon after touchdown it pecks. */
const FLIGHT = 1.05, FLAP_HZ = 5.5, SETTLE = 0.3;
/** After the lichen is free: a breath, then the hop to the snag's tip; and its call from there. */
const HOP_AFTER = 0.12, CALL_AFTER = 0.95;

/** The moments of the jay's part, in the scene's seconds, counted back from when the lichen comes loose (`at`). */
export function bringTimes(at: number) {
  const pecks = at - CLIP.stabs[1];
  const touchdown = pecks - SETTLE;
  const flies = touchdown - FLIGHT;
  const hops = at + HOP_AFTER;
  return { springs: flies - CLIP.leaves, flies, lands: touchdown - CLIP.touchdown, touchdown, pecks, loose: at, hops, perched: hops + CLIP.hop, calls: at + CALL_AFTER };
}

/** How long the scene has to be for the jay's whole part: to the end of its call. */
export const bringSeconds = (by: NonNullable<Climb['broughtBy']>): number => by.at + CALL_AFTER + CLIP.call;

/**
 * How far the lichen has unrolled, from 0 to 1; null where the climb's own flag decides (./view.ts): a climb the jay
 * does not bring, and once its scene is over. It falls with its weight: slowly at first, then fast.
 */
export function broughtDown(climb: Climb, flags: ReadonlySet<string>, scene: SceneFrame | null, still = false): number | null {
  const by = climb.broughtBy;
  if (!by || flags.has(`scene:${by.scene}`)) return null;
  // The spot's flag is set when he gives the berry, before the jay is up: until it has tugged it loose, nothing hangs.
  if (scene?.id !== by.scene) return 0;
  const k = clamp01((scene.seconds - by.at) / by.seconds);
  return still ? (k > 0 ? 1 : 0) : k ** 1.7;
}

/** Where things are, from the climb: where the lichen hangs from, and the snag it hangs on. */
export function snagOf(climb: Climb) {
  // As ./view.ts buildClimbs hangs it: a quarter over the top, a little behind the play plane.
  const hang = new Vector3(climb.x, climb.top + 0.25, -0.16);
  const SLOPE = 0.4;
  /** The snag's middle line and its thickness at x: it rises out over the face, away from the ledge he steps onto. */
  const out = -(climb.exit ?? 1);
  const axis = (x: number) => hang.y + 0.03 + (x - hang.x) * out * SLOPE;
  const thick = (x: number) => lerp(0.075, 0.035, clamp01(((x - hang.x) * out + 0.7) / 1.32));
  const on = (reach: number, z = hang.z) => { const x = hang.x + out * reach; return new Vector3(x, axis(x) + thick(x), z); };
  return {
    hang, out,
    /** Its foot, in the top of the root, and its tip out over the face. */
    foot: new Vector3(hang.x - out * 0.7, axis(hang.x - out * 0.7), -0.46), tip: new Vector3(hang.x + out * 0.62, axis(hang.x + out * 0.62), hang.z),
    thick,
    /** Where the jay lands and tugs, beside where the lichen is caught; and where it sits afterwards, at the tip. */
    tugs: on(0.2), sits: on(0.5),
  };
}

export interface BringPose {
  /** Its feet, in the world. */
  at: Vector3;
  /** Which way it faces (./jay.ts `face`): 1 right, -1 left. */
  heading: number;
  /** How far its nose is up, in radians, as it climbs. */
  pitch: number;
  /** Off the ground: it has no shadow on the forest floor. */
  aloft: boolean;
  /** In the air: the stand-in's wings beat. */
  flying: boolean;
  /** Its clips, each at a phase and with a weight. */
  clips: { name: string; phase: number; weight: number }[];
  /** The share of its pose that is its sitting on the snag, which goes on on its own clock. */
  settled: number;
  /** The berry is in its bill. */
  berry: boolean;
  /** How hard it tugs at the bundle now, 0 to 1: the bundle jerks with it. */
  tug: number;
}

/**
 * The jay at `t` seconds of the scene: from `ground` (where it was given its berry, facing `towards` him) up to the
 * snag. All from the scene's seconds, so that the same moment always shows the same.
 */
export function bringPose(t: number, by: NonNullable<Climb['broughtBy']>, ground: Vector3, snag: ReturnType<typeof snagOf>, towards: number, calm = false): BringPose {
  const T = bringTimes(by.at);
  const way = snag.tugs.x >= ground.x ? 1 : -1;
  const pose: BringPose = { at: ground.clone(), heading: towards, pitch: 0, aloft: false, flying: false, clips: [], settled: 0, berry: false, tug: 0 };
  // Looking back down at him from the tip: he stands where it came from.
  const back = -way;
  if (calm) {
    // With less motion it is on the ground with its berry, and then up on the snag: no flight between.
    if (t < T.flies) return { ...pose, clips: [{ name: 'look', phase: 0, weight: 1 }], berry: t >= EAT.from && t < EAT.swallowed };
    return { ...pose, at: snag.sits.clone(), heading: back, aloft: true, settled: 1 };
  }
  pose.berry = t >= EAT.from && t < EAT.swallowed;
  const add = (name: string, phase: number, weight: number) => { if (weight > 0.001) pose.clips.push({ name, phase: clamp01(phase), weight }); };
  if (t < T.lands) {
    // It eats, crouches and springs, and beats its way up.
    const spring = smooth((t - T.springs) / 0.1);
    const beating = smooth((t - (T.springs + CLIP.takeoff - 0.12)) / 0.12);
    add('eat', Math.min(t, T.springs + 0.1) / EAT.seconds, 1 - spring);
    add('takeoff', (t - T.springs) / CLIP.takeoff, spring * (1 - beating));
    if (beating > 0) pose.clips.push({ name: 'fly', phase: (t - T.flies) * FLAP_HZ, weight: beating });
  } else if (t < T.hops) {
    const braking = smooth((t - T.lands) / 0.1);
    const pecking = smooth((t - T.pecks) / 0.12);
    if (braking < 1) pose.clips.push({ name: 'fly', phase: (t - T.flies) * FLAP_HZ, weight: 1 - braking });
    add('land', (t - T.lands) / CLIP.land, braking * (1 - pecking));
    add('peck', (t - T.pecks) / CLIP.peck, pecking);
  } else {
    const hopping = smooth((t - T.hops) / 0.08);
    pose.settled = smooth((t - T.perched) / 0.2);
    add('peck', (t - T.pecks) / CLIP.peck, 1 - hopping);
    add('hop', (t - T.hops) / CLIP.hop, hopping * (1 - pose.settled));
  }
  // Where it is: on the ground until its feet leave it; up a curve that rises over the edge and comes down onto the
  // snag; there while it tugs; and out to the tip in one hop.
  if (t >= T.flies && t < T.touchdown) {
    const u = (t - T.flies) / FLIGHT, s = 0.45 * u + 0.55 * smooth(u);
    const over = new Vector3(lerp(ground.x, snag.tugs.x, 0.6), snag.tugs.y + 1.9, lerp(ground.z, snag.tugs.z, 0.6));
    const a = (1 - s) * (1 - s), b = 2 * s * (1 - s), c = s * s;
    pose.at.set(a * ground.x + b * over.x + c * snag.tugs.x, a * ground.y + b * over.y + c * snag.tugs.y, a * ground.z + b * over.z + c * snag.tugs.z);
    // Its nose follows its way up, and comes level as it brakes.
    const dx = 2 * (1 - s) * (over.x - ground.x) + 2 * s * (snag.tugs.x - over.x), dy = 2 * (1 - s) * (over.y - ground.y) + 2 * s * (snag.tugs.y - over.y);
    pose.pitch = 0.4 * Math.atan2(dy, Math.abs(dx)) * smooth(u / 0.15) * (1 - smooth((t - T.lands) / (T.touchdown - T.lands)));
    pose.aloft = pose.flying = true;
  } else if (t >= T.touchdown) {
    // The hop: in the air for the middle of the clip (frames 4 to 9 of 12).
    const k = smooth(((t - T.hops) / CLIP.hop - 0.3) / 0.45);
    pose.at.lerpVectors(snag.tugs, snag.sits, k);
    pose.at.y += 0.16 * Math.sin(Math.PI * k);
    pose.aloft = true;
  }
  // Turned to him while it eats; to its way as it crouches; and round to him again in its hop.
  pose.heading = t < T.hops ? lerp(towards, way, smooth((t - T.springs) / 0.22)) : lerp(way, back, smooth(((t - T.hops) / CLIP.hop - 0.25) / 0.5));
  // Each stab jerks the bundle: the first shakes it, the second pulls it free.
  for (const [i, stab] of CLIP.stabs.entries()) {
    const since = t - (T.pecks + stab);
    if (since > -0.06 && since < 0.22) pose.tug = Math.max(pose.tug, (i === 0 ? 0.6 : 1) * (since < 0 ? smooth(1 + since / 0.06) : 1 - smooth(since / 0.22)));
  }
  return pose;
}

/** Its call from the snag, `since` seconds after it begins: the clip's weight, and its phase. */
function calling(since: number): { weight: number; phase: number } {
  if (since <= 0 || since >= CLIP.call) return { weight: 0, phase: 0 };
  return { weight: Math.min(smooth(since / 0.12), smooth((CLIP.call - since) / 0.2)), phase: since / CLIP.call };
}

/** How long the roll at the lichen's end is, wound up on the snag. */
const BUNDLE = 0.62;

/** The lichen hangs as a flat curtain: three of it, turned about and of three lengths, make the wound-up hank. */
function bunch(strand: BufferGeometry): BufferGeometry {
  const parts = ([[0, 1], [1.1, 0.84], [2.2, 0.68]] as const).map(([turn, long]) => strand.clone().rotateY(turn).scale(1, long, 1));
  const made = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return made;
}

export interface JayLichenFrame {
  flags: ReadonlySet<string>;
  scene: SceneFrame | null;
  /** The jay's own place in the scene (its spot's group, which holds its 'bird'); null where there is none. */
  bird: Object3D | null;
  /** Where Elof is, and whether he is on a hose now. */
  elof: { x: number; y: number; climbing: boolean };
  clock: number;
  dt: number;
  calm: boolean;
}

/**
 * The snag, the bundle and the jay's part, for the chapter's climb that the jay brings down. `climbs` is where the view
 * draws what he climbs: the lichen itself is found there by its name, and swung from here.
 */
export function buildJayLichen(chapter: ChapterData, climbs: Object3D) {
  const group = new Group();
  group.name = 'jay-lichen';
  const climb = (chapter.climbs ?? []).find((one) => one.broughtBy);
  const by = climb?.broughtBy;
  if (!climb || !by) return { group, update: (_frame: JayLichenFrame) => {} };
  const snag = snagOf(climb);
  const long = climb.top - climb.bottom + 0.25;

  // The snag: a dead branch, grey and bare, with a broken stub of a twig.
  const wood = new MeshStandardMaterial({ color: '#7d756a', roughness: 1 });
  const along = new Vector3().subVectors(snag.tip, snag.foot), up = new Vector3(0, 1, 0);
  const length = along.length();
  const stem = new CylinderGeometry(snag.thick(snag.tip.x), snag.thick(snag.foot.x), length, 7, 3);
  const twig = new CylinderGeometry(0.012, 0.028, 0.3, 5).translate(0, 0.15, 0).rotateZ(-0.9).rotateY(0.6).translate(0, length * 0.18, 0);
  const snagMesh = new Mesh(mergeGeometries([stem, twig]), wood);
  stem.dispose();
  twig.dispose();
  snagMesh.name = 'jay-lichen-snag';
  snagMesh.position.copy(snag.foot).addScaledVector(along, 0.5);
  snagMesh.quaternion.setFromUnitVectors(up, along.clone().normalize());
  // The bundle: the lichen wound up, hanging from where it is caught. Named as what he climbs is, so that the forest's
  // kit gives it its own beard lichen in place of this stand-in (./forest-kit.ts installForest).
  const bundle = new Mesh<BufferGeometry>(new CylinderGeometry(0.15, 0.05, BUNDLE, 8).translate(0, -BUNDLE / 2, 0), new MeshStandardMaterial({ color: '#adb59b', roughness: 1 }));
  bundle.name = `climb:lichen:${climb.x}:bundle`;
  bundle.position.copy(snag.hang);
  group.add(snagMesh, bundle);

  const home = new Vector3();
  let homed = false;
  /** Which way it faced him on the ground as he gave it its berry, and which way it faces on the snag. */
  let towards = 1, heading = snag.out;
  let swing = 0, swingVelocity = 0, wasDown = -1, sat = 0, climbed = 0;
  let strand: Object3D | undefined;
  let bunched = false;

  /** The jay sitting on the snag, on its own clock: it grips it and looks about, and cocks its head at him while he is near. */
  function sit(rig: JayRig, weight: number, near: boolean, dt: number, own: boolean): void {
    sat += dt;
    if (own) { rig.clips.play(near && sat % 9 > 3.5 ? 'look' : 'perch'); return; }
    const looking = near ? Math.min(smooth((sat % 9 - 3.5) / 0.35), smooth((9 - sat % 9) / 0.35)) : 0;
    rig.clips.scrub('perch', (sat / 4) % 1, weight * (1 - looking));
    if (looking > 0) rig.clips.scrub('look', ((sat % 9 - 3.5) / 3) % 1, weight * looking);
  }

  function update({ flags, scene, bird: place, elof, clock, dt, calm }: JayLichenFrame): void {
    const done = flags.has(`scene:${by!.scene}`);
    const t = !done && scene?.id === by!.scene ? scene.seconds : null;
    const down = done ? 1 : broughtDown(climb!, flags, scene, calm) ?? 1;
    const pose = t === null ? null : bringPose(t, by!, home, snag, towards, calm);

    // Once the forest's kit has given the bundle its own lichen, that is bunched up, once.
    if (bundle.userData.forestClimb && !bunched) {
      bunched = true;
      const one = bundle.geometry;
      bundle.geometry = bunch(one);
      one.dispose();
    }
    // The lichen: its roll rides its end as it unrolls, and is used up as it comes to its length. It jerks as the jay tugs.
    const tug = pose?.tug ?? 0;
    drawnWhile(bundle, down < 1);
    bundle.position.set(snag.hang.x, snag.hang.y - long * down * (1 - BUNDLE / long) - 0.035 * tug, snag.hang.z);
    const thick = 1.35 * (1 - 0.5 * down);
    bundle.scale.set(thick, 1 - 0.45 * down, thick);
    bundle.rotation.z = calm ? 0 : 0.2 * tug * Math.sin(clock * 38) + 0.05 * Math.sin(clock * 1.7) * (1 - down);
    // Reaching its length it swings out the rest of its fall, and settles; in his hands it hangs still.
    if (wasDown >= 0 && wasDown < 1 && down >= 1 && !calm) swingVelocity = 0.6 * snag.out;
    wasDown = down;
    climbed = calm ? (elof.climbing ? 1 : 0) : climbed + ((elof.climbing && Math.abs(elof.x - climb!.x) < 1 ? 1 : 0) - climbed) * (1 - Math.exp(-8 * dt));
    const step = Math.min(dt, 1 / 30);
    swingVelocity += (-swing * 26 - swingVelocity * (3 + 20 * climbed)) * step;
    swing += swingVelocity * step;
    if (calm) swing = swingVelocity = 0;
    strand ??= climbs.getObjectByName(`climb:lichen:${climb!.x}`);
    if (strand) {
      const falling = down > 0 && down < 1 ? 0.07 * snag.out * Math.sin(Math.PI * down) : 0;
      const stir = calm ? 0 : (0.012 * Math.sin(clock * 1.3) + 0.006 * Math.sin(clock * 2.9 + 1)) * (1 - climbed);
      strand.rotation.z = (swing + falling + stir) * (1 - climbed * 0.9);
    }

    // The jay.
    const bird = place?.getObjectByName('bird');
    if (!place || !bird) return;
    if (!homed) { home.copy(place.position); homed = true; }
    const given = flags.has(by!.jay);
    // On the ground it is the spot's own (./props.ts): it turns to him, and waits for its berry.
    bird.userData.directed = given;
    const rig = jayRigOf(bird);
    if (!given) {
      place.position.copy(home);
      place.rotation.z = 0;
      place.userData.aloft = false;
      towards = (rig?.heading ?? (elof.x < home.x ? -1 : 1)) < 0 ? -1 : 1;
      heading = snag.out;
      sat = 0;
      return;
    }
    const near = Math.abs(elof.x - snag.sits.x) < 9;
    if (!pose) {
      // Given its berry and not yet on its way (the scene waits for a line to be read): it looks at him. Afterwards, and
      // in a game taken up later, it sits on the snag and looks down at him, turning to where he is.
      const up = done;
      place.position.copy(up ? snag.sits : home);
      place.rotation.z = 0;
      place.userData.aloft = up;
      const want = !up ? towards : elof.x < snag.sits.x - 0.3 ? -1 : elof.x > snag.sits.x + 0.3 ? 1 : heading < 0 ? -1 : 1;
      heading = calm || !up ? want : heading + (want - heading) * (1 - Math.exp(-5 * dt));
      face(bird, heading);
      if (rig) {
        rig.berry.visible = false;
        if (calm) rig.clips.scrub(up ? 'perch' : 'look', 0);
        else if (up) sit(rig, 1, near, dt, true);
        else rig.clips.play('look');
        rig.clips.update(dt);
      } else standIn(bird, false, clock);
      return;
    }
    place.position.copy(pose.at);
    place.rotation.z = pose.pitch * (pose.heading >= 0 ? 1 : -1);
    place.userData.aloft = pose.aloft;
    face(bird, pose.heading);
    heading = pose.heading;
    if (!rig) { standIn(bird, pose.flying, clock); return; }
    rig.berry.visible = pose.berry;
    const call = calm ? { weight: 0, phase: 0 } : calling(t! - bringTimes(by!.at).calls);
    for (const clip of pose.clips) rig.clips.scrub(clip.name, clip.phase, clip.weight);
    if (pose.settled > 0) {
      if (calm) rig.clips.scrub('perch', 0, pose.settled);
      else sit(rig, pose.settled * (1 - call.weight), near, dt, false);
    }
    if (call.weight > 0) rig.clips.scrub('call', call.phase, pose.settled * call.weight);
    rig.clips.update(dt);
  }

  /** The bird built in code, where the rigged one is missing: its wings beat while it flies. */
  function standIn(bird: Object3D, flying: boolean, clock: number): void {
    bird.position.y = 0;
    for (const [i, name] of STAND_IN_WINGS.entries()) {
      const wing = bird.getObjectByName(name);
      if (wing) wing.rotation.x = flying ? (i === 0 ? -1 : 1) * Math.sin(clock * 34) * 0.9 : 0;
    }
  }

  return { group, update };
}
