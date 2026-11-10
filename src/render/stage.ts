import { holdFlashlight } from './lamp-hold';
import { heldInOther } from './rain-gear';
import { paintStoryIllustration } from '../ui/story-illustrations';
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, CanvasTexture, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PlaneGeometry, SphereGeometry, SRGBColorSpace,
  TorusGeometry, Vector3,
} from 'three';
import type { ChapterData } from '../sim/types';
import { sceneWaits, type Act, type ActorKey, type ElofKey, type Point, type SceneDef, type SceneFrame, type ShotKey, type Thing } from '../sim/scene';
import { actPose, drawingAt, EASY_GAIT, eatingAt, sippingAt, stanceOf, stepLength, type Stance } from './acting';
import { carvingAt, CARVING_SHAVING_LIFETIME, type CarvingMotion, type CarvingPoint } from './carving-motion';
import { chairPose, createFooting, crouchPlaces, crouchPose, KNEE_HAND, kneelPose, sample, SITTING_ON, type Clip, type Footing } from './gait';
import { createFootwork, type Footwork } from './footwork';
import { CLIPS, STANDS } from './motion-data';
import { blendPose, createModelRig, createRehearsalRig, heightOf, JOINTS, STANDING, type Legs, type Pose, type Rig, type Role } from './rig';
import { drawnWhile } from './idle';
import { goldSweet } from './gold-sweet';
import type { Grip } from './fingers';
import { lookAt } from './look';
import { createTalker, talk, type Free, type Look, type Talker } from './talk';

/**
 * The stage: plays a chapter's scenes in the picture (src/sim/scene.ts). It owns the family's posable figures
 * and what they hold, the furniture, the scenes' glitter and shavings, and works out from each scene's keys
 * and the simulation's scene clock where every actor is, what it does, and where the camera looks. Nothing
 * here keeps time of its own inside a scene: a paused game, a hidden page or a lost picture holds it exactly.
 * Between scenes the family rests where the last scene left them, or walks along behind Elof.
 */

const FAMILY: readonly Role[] = ['pappa', 'mamma', 'moa', 'bertil'];
const SEATED: readonly Act[] = ['sit', 'carve', 'draw'];
/** Acts whose aim the whole body turns to. */
const TURNS_TO: readonly Act[] = ['reach', 'lift', 'offer', 'point'];
/** How much of the arm's length a hand held out to give something uses: the elbow stays a little bent. */
const OFFER_REACH = 0.82;
/**
 * How each thing is held (./fingers.ts): the hand closes round the knife's haft, a lamp's body and the brush's stick, the
 * thumb over the fist; two fingers go through the mug's handle, the thumb on it; Moa pinches her crayon between her thumb
 * and her first finger near its tip, and the drawing at its edges. The size is the radius, in EL, of what the fingers
 * close round.
 */
export const GRIPS: Record<Thing, Grip> = {
  knife: { kind: 'power', size: 0.05 }, brush: { kind: 'power', size: 0.025 }, mug: { kind: 'loop', size: 0.024 },
  crayon: { kind: 'pinch', size: 0.035 }, drawing: { kind: 'pinch', size: 0.006 },
  'lamp-mamma': { kind: 'power', size: 0.075 }, 'lamp-pappa': { kind: 'power', size: 0.075 },
  'lamp-moa': { kind: 'power', size: 0.075 }, 'lamp-bertil': { kind: 'power', size: 0.075 },
};
/** A hand laid on something: the wood it steadies, the paper; and one that points. */
const FLAT: Grip = { kind: 'flat' }, POINTING: Grip = { kind: 'point' };
/** How far from its tip a crayon is pinched, and its middle from its tip. */
const PINCHED = 0.09, CRAYON_MIDDLE = 0.15;
/** The mug's handle, from its middle: a loop on its side, held by its upright. */
const MUG_HANDLE = new Vector3(0.235, -0.01, 0);

/** Where an actor is and what it does, at one moment of the story. */
interface State {
  x: number; y: number; z: number;
  /** In turns: 0 along the course, 0.25 towards the camera. */
  face: number;
  act: Act;
  /** When the act began, and the act and stance before it, for the blend between them. */
  actAt: number;
  before: { act: Act; t: number; stance: Stance; aim: Point | null; mug: 0 | 1 | null; held: [Thing | null, Thing | null]; previous: State['before'] } | null;
  stance: Stance;
  aim: Point | null;
  glance: { from: Point; weight: number } | null;
  follow: number | null;
  holds: Thing | null;
  holdsLeft: Thing | null;
  rough: number;
  /** Gone in, out of the picture: not drawn. */
  away: boolean;
  /** The walk under way, when a key moves the actor: from where, how far it has come, and how long it takes. */
  walk: { fromX: number; fromY: number; fromZ: number; toX: number; toY: number; toZ: number; at: number; seconds: number } | null;
  /**
   * Walking when the scene began: how fast along the course, and the stride then. The scene starts them where
   * they come to a stop (GLIDE on), and they are drawn easing into it, not frozen mid-step.
   */
  glide?: { speed: number; stride: number };
}

const fresh = (): State => ({
  x: 0, y: 0, z: 0, face: 0.25, act: 'stand', actAt: -99, before: null, stance: 'stand', aim: null, glance: null, follow: null,
  holds: null, holdsLeft: null, rough: 0, away: false, walk: null,
});
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** The shortest way round between two facings, in turns. */
const mixTurn = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 1) + 1.5) % 1) - 0.5;
  return a + d * t;
};
/**
 * How many steps an eased walk of `way` over `seconds` has taken at `u` of the way through its time, for a body
 * `height` tall on `legs`: its distance counted in steps of the length each moment's speed gives (acting.ts stepLength).
 */
function stepsOf(way: number, seconds: number, height: number, u: number, legs: Legs): number {
  // No interval has elapsed at the exact start key. Both speed and step length are zero there;
  // integrating 0 / 0 would poison a previous stride still settling under the new action.
  if (u <= 0) return 0;
  const n = 24;
  let steps = 0;
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) / n * u, speed = way / seconds * 6 * s * (1 - s);
    steps += speed * seconds * (u / n) / stepLength(speed / height, height, legs);
  }
  return steps;
}
/** How far through an eased walk (0 to 1 of its time) its stride has counted `n` steps (`stepsOf`, made whole by `fit`). */
function strideAt(way: number, seconds: number, height: number, legs: Legs, fit: number, n: number): number {
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (stepsOf(way, seconds, height, mid, legs) / fit < n) low = mid; else high = mid;
  }
  return (low + high) / 2;
}
/** The facing `from` turned towards `to` by at most `most` turns, the shortest way round. */
const turnBy = (from: number, to: number, most: number) => {
  const d = ((((to - from) % 1) + 1.5) % 1) - 0.5;
  return from + Math.max(-most, Math.min(most, d));
};
/** How fast a body may turn about, in turns a second: a half turn takes a little under half a second. */
const TURN_RATE = 1.15;
/**
 * Standing, it turns on the spot by stepping round (./footwork.ts), and its hips go round no faster than its feet can follow:
 * a half turn in about a second, in two or three steps.
 */
const STAND_TURN = 0.5;
/**
 * How fast a joint may turn at the most, in radians a second: quicker than any stride, run or gesture the scenes ask for
 * (a run's knees turn at over 20), so those play exactly as keyed; only a jump that nothing else smooths is spread out.
 */
const JOINT_RATE = 60;
const LIMBS = JOINTS;
/**
 * Where what is asked of a body jumps (a new scene or act, a new stance, the stride taking the legs or letting them go),
 * what is drawn goes on from where it was at the speed it had, and the difference dies away like a critically damped
 * spring (inertial blending): nothing snaps, and nothing in between is slowed. How quickly, in radians a second: the
 * weight going over a foot, the trunk bending to the side and the head tilting are slow by nature; the head turns and
 * nods at its own pace, a little after the body.
 */
const CATCH = 14;
/** A change in how far a joint is asked to go in one frame beyond this (radians) is a jump, not motion. */
const JUMP = 0.08;
const SLOW = ['sway', 'hipRoll', 'bendSide', 'tilt'] as const;
const CATCH_SLOW = 6;
const CATCH_HEAD = 9;
/** The neck follows at its own speed, not the much faster catch allowed for hands and feet. */
const HEAD_RATE = 6;
const catchOf = (joint: typeof LIMBS[number]) => (SLOW.includes(joint as typeof SLOW[number]) ? CATCH_SLOW
  : joint === 'turn' || joint === 'nod' ? CATCH_HEAD : CATCH);
/** And those slow ones never go over faster than this (a second's worth of the hips' whole shift), even in a stride. */
const SLOW_RATE = 1.5;
/**
 * How fast the legs may turn, in radians a second, as they always have: it keeps a walk's planted boot where it is
 * (tests/unit/family-gait.test.ts). A run's legs would turn faster: there it shows as legs that turn at it, to and fro.
 */
const LEG_RATE = 20;
const rateOf = (joint: typeof LIMBS[number]) => (SLOW.includes(joint as typeof SLOW[number]) ? SLOW_RATE
  : joint === 'turn' || joint === 'nod' ? HEAD_RATE : JOINT_RATE);
/** Where each of the family's standing loops starts, in seconds: nobody shifts their weight in step with anyone else. */
const LOOP: Record<Role, number> = { pappa: 0, mamma: 2.7, moa: 5.1, bertil: 1.3 };
/** What a stride gives the legs and hips, whatever the hands are doing, and what it gives the trunk, head and spread arms. */
const STRIDING = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'bounce', 'sway', 'hipRoll'] as const;
const CARRIED = ['lean', 'twist', 'bendSide', 'tilt', 'spread'] as const;
/** What of the stride's trunk goes on under an act whose arms and head are its own. */
const UNDER_ACT = ['lean', 'twist', 'bendSide', 'tilt'] as const;
/** A move this far in one frame is a cut, which the scene makes on purpose: nothing eases across it. */
const CUT = 1.2;
/** How fast a body goes up or down a step, in its own heights a second. */
const STEP_RATE = 0.9;
/**
 * How long, in seconds, a body takes to get up off its knees, a crouch or a chair into its stride, or to go down
 * into one from it: the legs hand over this gradually, not in the few frames a stride takes from standing.
 */
const RISE = 0.5;
/** Getting up out of a crouch is quicker than going down into one: its clip (CLIPS.crouch) the other way, in this long. */
const CROUCH_UP = 0.52;
const LOW: readonly Stance[] = ['kneel', 'crouch', 'sit'];
/**
 * What getting up from a chair or sitting down on one (art/blender/motion.py CLIPS.standUp, sitDown) has of the body
 * outright, from the act before to the one after: the legs, the lean that brings the weight over the feet, the hips
 * square and the arms that help. The head nods on top of whatever it looks at.
 */
const CHAIRED = ['legL', 'legR', 'kneeL', 'kneeR', 'footL', 'footR', 'splayL', 'splayR', 'lean', 'sway', 'hipRoll', 'bendSide',
  'armL', 'armR', 'elbowL', 'elbowR'] as const;
/** The moment the seat is left getting up, and reached sitting down: until then and from then the chair goes with the hips. */
const SEAT_LEFT = (() => {
  const keys = CLIPS.standUp.rise;
  let at = 0;
  for (let i = 0; i < keys.length && keys[i + 1] === 0; i += 3) at = keys[i]!;
  return at;
})();
const SEAT_REACHED = (() => {
  const keys = CLIPS.sitDown.rise;
  for (let i = 0; i < keys.length; i += 3) if (keys[i + 1] === 0) return keys[i]!;
  return CLIPS.sitDown.seconds;
})();
/** How long, in seconds, someone walking when a scene begins takes to slow to a stop (an exponential's time). */
const GLIDE = 0.15;
/** How far behind their place a follower may fall before they are put just out of the picture, and come in from there. */
const LOST = 26;
/** How far a body may be from Elof and still be in the free-play picture. */
const OUT_OF_SIGHT = 16;
/** How far over a hand's middle its palm is, where Elof's feet go when he rides it. */
const PALM_TOP = 0.1;

/** A facing in turns, as a group's turn about y: the bodies face their own +z. */
export const yaw = (face: number) => Math.PI / 2 - face * Math.PI * 2;

/**
 * Applies one key to a state over the time since it began. A key that moves the actor starts from wherever
 * the actor was at that moment; a new act takes over from the old one with a short blend.
 */
function apply(state: State, key: ActorKey, since: number): void {
  const first = state.actAt === -99;
  const move = key.move ?? 0.6;
  const p = first || since >= move ? 1 : smooth(since / move);
  const toX = key.x ?? state.x, toY = key.y ?? state.y, toZ = key.z ?? state.z;
  const far = Math.hypot(toX - state.x, toZ - state.z);
  if (far > 0.25 && p < 1 && !SEATED.includes(key.act ?? state.act)) {
    state.walk = { fromX: state.x, fromY: state.y, fromZ: state.z, toX, toY, toZ, at: key.at, seconds: move };
  } else if (p >= 1) state.walk = null;
  state.x = mix(state.x, toX, p);
  state.y = mix(state.y, toY, p);
  state.z = mix(state.z, toZ, p);
  if (key.face !== undefined) state.face = first ? key.face : mixTurn(state.face, key.face, smooth(since / Math.max(0.35, move)));
  else if (key.aim && key.act !== undefined && TURNS_TO.includes(key.act) && stanceOf(key.act, state.stance) !== 'sit') {
    // Reaching for something, lifting it somewhere or holding it out, the body turns to it: the arms only
    // swing forward, so this is how the hand comes where it is aimed.
    const toward = 0.25 - Math.atan2(key.aim.x - toX, (key.aim.z ?? 0) - toZ) / (Math.PI * 2);
    state.face = mixTurn(state.face, toward, smooth(since / 0.4));
  }
  if (key.act !== undefined && (key.act !== state.act || state.actAt < key.at - 1e-6)) {
    // Keep any unfinished blend when the next key interrupts it. Relative ages also survive scene changes.
    const age = Math.max(0, key.at - state.actAt);
    state.before = first ? null : { act: state.act, t: age, stance: state.stance, aim: state.aim,
      mug: state.holds === 'mug' ? 1 : state.holdsLeft === 'mug' ? 0 : null, held: [state.holdsLeft, state.holds], previous: age < .45 ? state.before : null };
    state.stance = stanceOf(key.act, state.stance);
    state.act = key.act;
    state.actAt = key.at;
    state.glance = null;
  }
  if (key.aim !== undefined) {
    state.glance = key.act === undefined && state.aim && key.aim && p < 1 ? { from: state.aim, weight: p } : null;
    state.aim = key.aim;
  }
  if (key.follow !== undefined) state.follow = key.follow;
  if (key.holds !== undefined) state.holds = key.holds;
  if (key.holdsLeft !== undefined) state.holdsLeft = key.holdsLeft;
  if (key.rough !== undefined) state.rough = mix(state.rough, key.rough, p);
  if (key.away !== undefined) state.away = key.away;
}

/** Folds an actor's keys of one scene up to `t` onto a state: the state at that moment. */
function play(state: State, keys: readonly ActorKey[], t: number): void {
  for (const [i, key] of keys.entries()) {
    if (key.at > t) break;
    const next = keys[i + 1];
    const until = next && next.at <= t ? next.at : t;
    apply(state, key, until - key.at);
  }
  // A walk that is over is over.
  if (state.walk && t >= state.walk.at + state.walk.seconds) state.walk = null;
}

/** The shot at a moment of a scene, from its keys: each key moves the camera on from where it was. */
function shotAt(keys: readonly ShotKey[], t: number): { shot: Required<Omit<ShotKey, 'at' | 'move'>>; blend: number } | null {
  if (keys.length === 0 || keys[0]!.at > t) return null;
  const first = keys[0]!;
  const shot = { x: first.x, y: first.y, z: first.z ?? 0, height: first.height, width: first.width ?? 0, eye: first.eye ?? 0 };
  const blend = smooth((t - first.at) / (first.move ?? 1));
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i]!;
    if (key.at > t) break;
    const next = keys[i + 1];
    const until = next && next.at <= t ? next.at : t;
    const p = smooth((until - key.at) / (key.move ?? 1));
    shot.x = mix(shot.x, key.x, p);
    shot.y = mix(shot.y, key.y, p);
    shot.z = mix(shot.z, key.z ?? 0, p);
    shot.height = mix(shot.height, key.height, p);
    shot.width = mix(shot.width, key.width ?? 0, p);
    shot.eye = mix(shot.eye, key.eye ?? 0, p);
  }
  return { shot, blend };
}

/** What a scene asks of Elof at a moment. */
function elofAt(keys: readonly ElofKey[], t: number) {
  const out = {
    lift: { x: 0, y: 0, z: 0 }, rides: null as Role | null, rideWeight: 0,
    act: null as Act | null, actAt: 0, aim: null as Point | null, face: null as number | null, size: null as number | null,
  };
  for (const [i, key] of keys.entries()) {
    if (key.at > t) break;
    const next = keys[i + 1];
    const until = next && next.at <= t ? next.at : t;
    const p = smooth((until - key.at) / (key.move ?? 0.6));
    if (key.lift) {
      out.lift.x = mix(out.lift.x, key.lift.x, p);
      out.lift.y = mix(out.lift.y, key.lift.y, p);
      out.lift.z = mix(out.lift.z, key.lift.z ?? 0, p);
    }
    if (key.rides) {
      out.rides = key.rides;
      out.rideWeight = mix(out.rideWeight, 1, p);
    } else if (key.rides === null) out.rideWeight = mix(out.rideWeight, 0, p);
    if (key.act !== undefined && key.act !== out.act) { out.act = key.act; out.actAt = key.at; }
    if (key.aim !== undefined) out.aim = key.aim;
    if (key.face !== undefined) out.face = key.face;
    if (key.size !== undefined) out.size = out.size === null ? key.size : mix(out.size, key.size, p);
  }
  return out;
}

/** What the view does with a frame of the stage. */
export interface Directions {
  /** The camera's shot while a scene asks for one, and how much of it to take over the play camera. */
  shot: { x: number; y: number; z: number; height: number; width: number; eye: number; blend: number } | null;
  /** Thin bars above and below: a scene is telling. */
  bars: boolean;
  /** The ghost, staged by the scene: where it is, how it is turned and tilted, and its eyes. Null: as the simulation has it. */
  ghost: { x: number; y: number; z: number; face: number; tilt: number; bounce: number; blink: number; rough: number; look: Point | null; act: Act; actT: number } | null;
  /** Elof, in a held scene: lifted, acting, facing, and how big. */
  /** `onto`: where his feet are drawn in the place itself (on a hand), as much as `ontoWeight` says (0 to 1). */
  /** `life`: the clock he goes on standing and breathing by under his act, which runs on while a line is read (./talk.ts). */
  elof: {
    lift: Point; onto: Point; ontoWeight: number; act: Act | null; actT: number; aim: Point | null; face: number | null; size: number | null;
    life: number;
  } | null;
}

/** Which hands are free for a gesture as someone speaks (./talk.ts): both, the left, the right, or neither. */
const HANDS_FREE: readonly Free[] = [[true, true], [true, false], [false, true], [false, false]];
/** Acts that leave the hands to hang: a gesture of speech may use them. */
const HANDS_HANG: readonly Act[] = ['stand', 'watch', 'look', 'nod'];
/** These acts keep their working right arm but leave the left free to counter-swing during a walk.
 * Pointing's idle counter-gesture belongs to standing; reach, lift and show need both arms and stay their own.
 */
const WALKING_HANDS: Partial<Record<Act, Free>> = {
  point: HANDS_FREE[1]!, shine: HANDS_FREE[1]!, offer: HANDS_FREE[1]!, wave: HANDS_FREE[1]!, paint: HANDS_FREE[1]!,
};

/**
 * A lit flashlight, pointing the way its holder faces (their +z), and its beam out into the dark. The beam is added to
 * the night, so what is black in it is nothing: it fades away from the lamp and has no end to see.
 */
export function litLamp(): Mesh {
  const body = new Mesh(new CylinderGeometry(0.075, 0.075, 0.42, 10).rotateX(Math.PI / 2), new MeshStandardMaterial({ color: '#3c4048', roughness: 0.5 }));
  const head = new Mesh(new CylinderGeometry(0.13, 0.085, 0.16, 12).rotateX(Math.PI / 2).translate(0, 0, 0.27), new MeshStandardMaterial({ color: '#50565e', roughness: 0.45 }));
  const LONG = 16;
  const cone = new ConeGeometry(1.7, LONG, 18, 5, true).rotateX(-Math.PI / 2).translate(0, 0, LONG / 2 + 0.3);
  const at = cone.getAttribute('position');
  const fade = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) fade.fill(Math.max(0, 1 - (at.getZ(i) - 0.3) / LONG) ** 1.6, i * 3, i * 3 + 3);
  cone.setAttribute('color', new BufferAttribute(fade, 3));
  const beam = new Mesh(cone, new MeshBasicMaterial({ color: '#fff2c8', vertexColors: true, transparent: true, opacity: 0.16, depthWrite: false, blending: AdditiveBlending, side: DoubleSide, fog: false }));
  beam.name = 'lamp-beam';
  body.add(head, beam);
  return body;
}

/** A thing the family holds: built small and plain, in the colours of what it is. */
function thing(kind: Thing, drawing: CanvasTexture): Mesh {
  switch (kind) {
    case 'lamp-mamma':
    case 'lamp-pappa':
    case 'lamp-moa':
    case 'lamp-bertil':
      return litLamp();
    case 'knife': {
      const handle = new Mesh(new BoxGeometry(0.09, 0.32, 0.09), new MeshStandardMaterial({ color: '#963c30', roughness: 0.7 }));
      const blade = new Mesh(new BoxGeometry(0.03, 0.24, 0.07), new MeshStandardMaterial({ color: '#cfd6d9', roughness: 0.25, metalness: 0.6 }));
      blade.name = 'carving-blade';
      blade.position.y = 0.28;
      handle.add(blade);
      const tip = new Object3D(); tip.name = 'carving-knife-tip'; tip.position.y = .4; handle.add(tip);
      return handle;
    }
    case 'brush': {
      const stick = new Mesh(new CylinderGeometry(0.025, 0.025, 0.5, 6), new MeshStandardMaterial({ color: '#c99a5e', roughness: 0.7 }));
      const tip = new Mesh(new CylinderGeometry(0.035, 0.008, 0.12, 6), new MeshStandardMaterial({ color: '#2a2422', roughness: 0.6 }));
      tip.position.y = 0.3;
      stick.add(tip);
      return stick;
    }
    case 'mug': {
      const mug = new Mesh(new CylinderGeometry(0.17, 0.15, 0.32, 12), new MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.5 }));
      const heart = new Mesh(new BoxGeometry(0.09, 0.09, 0.02), new MeshStandardMaterial({ color: '#b8463c', roughness: 0.6 }));
      heart.position.set(0, 0.02, 0.165);
      heart.rotation.z = Math.PI / 4;
      // Its handle, on its right as she holds it out: a loop she closes her hand round.
      const handle = new Mesh(new TorusGeometry(0.075, 0.024, 6, 10, Math.PI).rotateZ(-Math.PI / 2).translate(0.16, -0.01, 0), mug.material);
      handle.name = 'mug-handle';
      mug.add(heart, handle);
      return mug;
    }
    case 'crayon': {
      const crayon = new Mesh(new CylinderGeometry(0.035, 0.035, 0.3, 6), new MeshStandardMaterial({ color: '#d9a13a', roughness: 0.6 }));
      const tip = new Object3D(); tip.name = 'drawing-crayon-tip'; tip.position.y = -.15; crayon.add(tip);
      return crayon;
    }
    case 'drawing': {
      const sheet = new Mesh(new PlaneGeometry(1.9, 1.5), new MeshBasicMaterial({ map: drawing }));
      // An actual front and a plain back: the story must never be read mirrored through the paper.
      const back = new Mesh(sheet.geometry, new MeshBasicMaterial({ color: '#eee4d2' }));
      back.rotation.y = Math.PI; back.position.z = -.004; sheet.add(back);
      return sheet;
    }
  }
}

/**
 * Moa's drawing (plan §2.3: her crayon style is the game's map): what she saw happen. The star from the bag
 * made Elof small; the golden one, still in the bag, glitters too. Drawn in code, no letters.
 */
function moasDrawing(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 404;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fff3d4'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.translate(0, 42); c.scale(1.6, 1.6);
  paintStoryIllustration(c, 'moa-drawing');
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A kitchen table and chairs: plain stand-ins, never the family's own furniture (that is Olov's to model). */
function furniture(look: 'table' | 'chair' | 'stool'): Group {
  const group = new Group();
  // Where the adventure's pack has it, the piece is a model (art/blender/a2-room.py), of the same size.
  group.userData.model = look === 'table' ? 'bord' : look === 'chair' ? 'stol' : 'pall';
  group.userData.disposeFallback = true;
  const wood = new MeshStandardMaterial({ color: look === 'table' ? '#b58a58' : '#d9cdb8', roughness: 0.8 });
  const box = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), wood);
    mesh.position.set(x, y, z);
    group.add(mesh);
  };
  if (look === 'table') {
    // 5 long, 1.65 high, 2.2 deep: a kitchen table beside a boy drawn three times his small size.
    box(5, 0.16, 2.2, 0, 1.57, 0);
    for (const [x, z] of [[-2.3, -0.9], [2.3, -0.9], [-2.3, 0.9], [2.3, 0.9]] as const) box(0.16, 1.5, 0.16, x, 0.75, z);
  } else {
    const seat = look === 'stool' ? 1.15 : 1.25;
    box(1.1, 0.12, 1.1, 0, seat, 0);
    for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]] as const) box(0.1, seat, 0.1, x, seat / 2, z);
    if (look === 'chair') box(1.1, 1.5, 0.1, 0, seat + 0.75, -0.5);
  }
  return group;
}

/** A small stand-in bird for the window: grey-brown with a rust tail, until the jay modelled in Blender is put in. */
function windowJay(): Group {
  const group = new Group();
  const bird = new Group();
  bird.name = 'bird';
  const grey = new MeshLambertMaterial({ color: '#8d8a84' });
  const rust = new MeshLambertMaterial({ color: '#b0643a' });
  const body = new Mesh(new SphereGeometry(0.22, 10, 8), grey);
  body.scale.set(1.3, 1, 1);
  const head = new Mesh(new SphereGeometry(0.14, 10, 8), grey);
  head.name = 'head';
  head.position.set(0.24, 0.16, 0);
  const tail = new Mesh(new BoxGeometry(0.3, 0.06, 0.12), rust);
  tail.position.set(-0.32, -0.02, 0);
  bird.add(body, head, tail);
  for (const side of [-1, 1]) {
    const wing = new Mesh(new BoxGeometry(.35, .05, .18), rust);
    wing.name = side > 0 ? 'wingNear' : 'wingFar';
    wing.position.set(-.04, .04, side * .17); bird.add(wing);
  }
  group.add(bird);
  return group;
}

export interface Stage {
  readonly group: Group;
  /** The birds the jay modelled in Blender takes the place of, when it has come. */
  readonly birds: Object3D[];
  /** A private model for one of the family: it takes the rehearsal figure's place in every scene. */
  replace(who: string, model: Object3D): Object3D | null;
  /** One frame: what to do with the ghost, Elof and the camera. `dt` is 0 while the game stands still. */
  update(frame: SceneFrame | null, flags: ReadonlySet<string>, elof: { x: number; y: number }, clock: number, dt: number, calm: boolean): Directions;
  /** Attach the story sweet after Elof's actual body has been posed and placed. */
  updateElof(rig: Pick<Rig, 'hand' | 'mouth' | 'reach' | 'hold' | 'socket' | 'grasp'>, direction: Directions['elof'], height: number, calm: boolean): void;
  /** Everyone the stage has: for the shadows and the tests. */
  readonly actors: ReadonlyMap<Role, { rig: Rig; visible: () => boolean }>;
}

/** The stage for a chapter, or one with nothing on it when the chapter has no scenes. */
export function createStage(chapter: ChapterData, ground: (x: number) => number): Stage {
  const group = new Group();
  group.name = 'stage';
  const scenes: readonly SceneDef[] = chapter.scenes ?? [];
  const keyed = (who: string) => scenes.some((scene) => scene.stage?.actors?.[who as Role] !== undefined);
  const cast = FAMILY.filter(keyed);
  const drawing = moasDrawing();
  const things = new Map<Thing, Mesh>();
  const rigs = new Map<Role, Rig>();
  const live = new Map<Role, { x: number; y: number; z: number; face: number; walked: number; stride: number; gait: number; pace: number; velocity: number; act: Act; elapsed: number }>();
  /** Each body's pose as last drawn: the next frame's joints turn from it at most at JOINT_RATE. */
  const drawn = new Map<Role, Pose>();
  /**
   * How fast each body's joints were drawn turning, and how far what is drawn is from what is asked and how fast that
   * closes (the inertial blend, CATCH).
   */
  const drawnSpeed = new Map<Role, Pose>(), behind = new Map<Role, Pose>(), behindSpeed = new Map<Role, Pose>();
  /** What was asked of each body last frame, and how far that moved in the frame before: a jump is told from motion by it. */
  const asking = new Map<Role, Pose>(), askingStep = new Map<Role, Pose>();
  /** Where each body's planted feet stand (./gait.ts). */
  const footings = new Map<Role, Footing>();
  const footworks = new Map<Role, Footwork>();
  /** How much of each body's legs the walk has, 0 to 1. */
  const striding = new Map<Role, number>();
  /** A walk that began while the legs were mid-stride (a follower, say): it carries on from their phase. */
  const handed = new Map<Role, { walk: string; offset: number; gait: number }>();
  /** The walk each body is on, as it was last drawn: a new one may take over legs already striding. */
  const begun = new Map<Role, string>();
  let lastT = 0, lastElof: number | null = null;
  const holders = new Group();
  holders.name = 'stage-things';
  group.add(holders);
  for (const who of cast) {
    const rig = createRehearsalRig(who);
    rig.group.name = `stage-${who}`;
    rigs.set(who, rig);
    group.add(rig.group);
  }
  // Each family member's things: one of each that the scenes ask for, so nothing is made during play.
  for (const scene of scenes) for (const keys of Object.values(scene.stage?.actors ?? {})) for (const key of keys ?? []) {
    for (const held of [key.holds, key.holdsLeft, key.act === 'draw' ? 'drawing' as const : null]) if (held && !things.has(held)) {
      const mesh = thing(held, drawing);
      mesh.name = `stage-thing:${held}`;
      drawnWhile(mesh, false);
      things.set(held, mesh);
      holders.add(mesh);
    }
  }
  if (chapter.id === 'stormkvall') {
    const lamp = litLamp(); lamp.name = 'stage-thing:lamp-pappa'; drawnWhile(lamp, false);
    things.set('lamp-pappa', lamp); holders.add(lamp);
  }
  /** The chairs and stools, and who sits on each (below): getting up, they push it back from the table, and draw it in sitting down. */
  const chairs: { made: Group; x: number; y: number; z: number; face: number; top: number; owner: string | null; near: number }[] = [];
  for (const piece of chapter.furniture ?? []) {
    const made = furniture(piece.look);
    if (piece.look !== 'table') {
      chairs.push({ made, x: piece.at.x, y: piece.at.y, z: piece.z, face: piece.face ?? 0.25, top: piece.at.y + (piece.look === 'stool' ? 1.21 : 1.31), owner: null, near: 1 });
    }
    made.position.set(piece.at.x, piece.at.y, piece.z);
    made.rotation.y = yaw(piece.face ?? 0.25);
    made.name = `furniture:${piece.look}`;
    // A party's cloth over a table: over its top and hanging a little down its sides.
    if (piece.cloth && piece.look === 'table') {
      const cloth = new Mesh(new BoxGeometry(5.3, 0.5, 2.5), new MeshStandardMaterial({ color: piece.cloth, roughness: 0.9 }));
      // Beside the table, not in it: the room kit's model takes the table's own place (its children).
      cloth.position.set(piece.at.x, piece.at.y + 1.43, piece.z);
      cloth.rotation.y = made.rotation.y;
      group.add(cloth);
    }
    group.add(made);
  }
  // Each is whoever a scene seats nearest it, within an EL.
  for (const scene of scenes) for (const [who, keys] of Object.entries(scene.stage?.actors ?? {})) {
    let x: number | undefined, z = 0;
    for (const key of keys ?? []) {
      x = key.x ?? x; z = key.z ?? z;
      if (x === undefined || key.act === undefined || !SEATED.includes(key.act)) continue;
      for (const chair of chairs) {
        const far = Math.hypot(chair.x - x, chair.z - z);
        if (far < chair.near) { chair.owner = who; chair.near = far; }
      }
    }
  }
  /** How high each sits, in their own heights: on their chair, or on a kitchen chair's height wherever they sit. */
  const seats = new Map(chairs.flatMap(chair => chair.owner ? [[chair.owner, chair.top - chair.y] as const] : []));
  const seatOf = (who: string, height: number) => (seats.get(who) ?? 1.31) / height + SITTING_ON;

  // The glitter of the scenes: one batch of sparks, one of soft glows, one of shavings, shared by all of them.
  const SPARKS = 72, GLOWS = 6, CURLS = 18;
  const sparks = new InstancedMesh(new OctahedronGeometry(0.06), new MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.95, depthWrite: false, blending: AdditiveBlending }), SPARKS);
  const glows = new InstancedMesh(new SphereGeometry(0.5, 16, 12), new MeshBasicMaterial({ color: '#ffd774', transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending }), GLOWS);
  const curls = new InstancedMesh(new BoxGeometry(0.16, 0.03, 0.1), new MeshStandardMaterial({ color: '#ecd3a2', roughness: 0.8 }), CURLS);
  curls.name = 'carving-shavings';
  for (const mesh of [sparks, glows, curls]) {
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
    // One at no size, so that the warm-up draws each batch once (./idle.ts) and play never makes its shader.
    mesh.setMatrixAt(0, new Object3D().matrix.makeScale(0, 0, 0));
    mesh.count = 1;
    drawnWhile(mesh, false);
    group.add(mesh);
  }
  const wisps = new InstancedMesh(new CylinderGeometry(.018, .009, 1, 5),
    new MeshBasicMaterial({ color: '#d2e1e7', transparent: true, opacity: .42, depthWrite: false }), 24);
  wisps.name = 'window-wind';
  wisps.instanceMatrix.setUsage(DynamicDrawUsage);
  wisps.frustumCulled = false;
  wisps.setMatrixAt(0, new Object3D().matrix.makeScale(0, 0, 0));
  wisps.count = 1;
  drawnWhile(wisps, false);
  if (scenes.some(one => one.stage?.fx?.some(fx => fx.kind === 'wind'))) group.add(wisps);
  const windAlong = new Vector3();
  const jay = windowJay();
  jay.scale.setScalar(0);
  drawnWhile(jay, false);
  // Only a chapter whose scenes bring the jay to the window has it: no other one fetches the jay's model.
  const jayFlies = scenes.some((scene) => scene.stage?.fx?.some((fx) => fx.kind === 'jay'));
  if (jayFlies) group.add(jay);
  const star = new Group(); star.name = 'elof-star';
  const gold = new MeshStandardMaterial({ color: '#ffdb65', emissive: '#db7b25', emissiveIntensity: .55, roughness: .35 });
  for (let i = 0; i < 5; i++) {
    const point = new Mesh(new CylinderGeometry(0, .12, .3, 3), gold), angle = i * Math.PI * 2 / 5;
    point.position.set(Math.sin(angle) * .13, Math.cos(angle) * .13, 0); point.rotation.z = -angle; star.add(point);
  }
  star.add(new Mesh(new SphereGeometry(.13, 8, 6), gold));
  drawnWhile(star, false);
  if (scenes.some(scene => scene.stage?.star === true)) group.add(star);
  // The golden geléhallon, where a scene has him eat that instead (Stormens öga).
  const raspberry = goldSweet();
  drawnWhile(raspberry, false);
  if (scenes.some(scene => scene.stage?.star === 'gold')) group.add(raspberry);
  let starOn: Group | null = null;
  // The block of wood Pappa carves the ghost out of: it shrinks away as the shavings fly.
  const block = new Mesh(new CylinderGeometry(.43, .38, 1.08, 7), new MeshStandardMaterial({ color: '#d8bf8e', roughness: 0.85, flatShading: true }));
  block.name = 'stage-block';
  block.scale.setScalar(0);
  drawnWhile(block, false);
  group.add(block);
  const supportMark = new Object3D(), contactMark = new Object3D(), gripMark = new Object3D();
  supportMark.name = 'carving-support-target'; contactMark.name = 'carving-knife-contact';
  gripMark.name = 'carving-knife-grip';
  group.add(supportMark, contactMark, gripMark);
  const knifeDirection = new Vector3(), wristTarget = new Vector3(), up = new Vector3(0, 1, 0);
  const knifeHeld = new Vector3(), crayonHeld = new Vector3(), heldAxis = new Vector3(), aimed = new Vector3();
  /** The crayon's middle, as held: its back end is the way of `crayonHeld`. */
  const crayonCentre = new Vector3();
  const fingerDirection = new Vector3();
  const across = new Vector3(), forward = new Vector3(), surfaceDirection = new Vector3();
  const mark = (name: string) => { const node = new Object3D(); node.name = name; group.add(node); return node; };
  const paperContact = mark('drawing-paper-contact'), paperSupport = mark('drawing-paper-support');
  const crayonGrip = mark('drawing-crayon-grip'), mugGrip = mark('sipping-mug-grip'), mouth = mark('sipping-mouth');
  const sheetLeft = mark('drawing-left-grip'), sheetRight = mark('drawing-right-grip');
  const heldPoint = new Vector3(), otherHand = new Vector3(), toolAxis = new Vector3(), rim = new Vector3();
  const drawingHome = scenes.flatMap(scene => scene.stage?.actors?.moa ?? []).find(key => key.act === 'draw');
  const table = chapter.furniture?.find(piece => piece.look === 'table');
  // Contact runs down the near-left facet, separated from the supporting hand on the opposite side.
  function cutPoint(point: CarvingPoint, wood: State, face: number, clearance: number, out: Vector3): Vector3 {
    const travel = Math.max(0, Math.min(1, (point.ahead - 1.05) / .35));
    const side = -.96 + .1 * travel;
    across.set(Math.cos(yaw(face)), 0, -Math.sin(yaw(face)));
    forward.set(Math.sin(yaw(face)), 0, Math.cos(yaw(face)));
    surfaceDirection.copy(across).multiplyScalar(side).addScaledVector(forward, Math.sqrt(1 - side * side));
    // Intersect the tapered seven-sided blank, rather than placing the blade on an enclosing circle.
    const scale = .76 + .24 * wood.rough;
    const height = Math.max(0, Math.min(1, ((.24 + point.up - 2.45) / scale + .54) / 1.08));
    let plane = 0;
    for (let i = 0; i < 7; i++) {
      const angle = (i + .5) * Math.PI * 2 / 7;
      plane = Math.max(plane, Math.sin(angle) * surfaceDirection.x + Math.cos(angle) * surfaceDirection.z);
    }
    const radius = (.38 + .05 * height) * scale * Math.cos(Math.PI / 7) / plane;
    return out.set(wood.x, wood.y + .78 + point.up - 2.45, wood.z)
      .addScaledVector(surfaceDirection, radius + clearance);
  }

  const place = new Object3D();
  const hand = new Vector3(), lampAim = new Vector3(), kneeAt = new Vector3();
  const pose: Pose = { ...STANDING };
  const before: Pose = { ...STANDING };
  const walking: Pose = { ...STANDING };
  const gettingUp: Pose = { ...STANDING };
  const chairing: Pose = { ...STANDING }, tucked: Pose = { ...STANDING };
  /** The state each actor is in at rest: what the scenes told so far leave them doing. */
  function rest(flags: ReadonlySet<string>, upTo: number): Map<string, State> {
    const states = new Map<string, State>();
    for (const [i, scene] of scenes.entries()) {
      if (i >= upTo) break;
      if (sceneWaits(scene, flags)) continue;
      for (const [who, keys] of Object.entries(scene.stage?.actors ?? {})) {
        const state = states.get(who) ?? fresh();
        play(state, keys ?? [], Infinity);
        state.walk = null;
        states.set(who, state);
      }
      // Retained acts keep their age when the next scene starts its own clock at zero.
      for (const state of states.values()) state.actAt -= scene.seconds;
    }
    return states;
  }
  let lastScene: string | null = null;
  const starts = new Map<string, State>();
  /**
   * How long the scene playing now has waited on its lines (the story holds while one is read): the bodies go on standing and
   * breathing by the scene's clock and this, so that nobody freezes while something is said, and nothing jumps as it goes on.
   */
  let waited = 0;
  /** Each body's part in what is said (./talk.ts), and where its head looks. */
  const talkers = new Map<Role, Talker>();
  const heard: Look = { turn: 0, nod: 0 }, faceAt = new Vector3();

  let stagedTilt = 0;
  return {
    group,
    updateElof(rig, direction, height, calm) {
      // The golden sweet is in his hands as he looks at it too, held before him (`hands`).
      const shown = !!starOn && (direction?.act === 'show' || direction?.act === 'eat' || (starOn === raspberry && direction?.act === 'hands'));
      const bite = eatingAt(direction?.actT ?? 0, calm);
      const size = shown ? direction?.act === 'eat' ? bite.sweet : 1 : 0;
      drawnWhile(star, size > 0 && starOn === star);
      drawnWhile(raspberry, size > 0 && starOn === raspberry);
      if (!shown || !starOn) return;
      const unit = height / 3;
      // The star is made for a boy three times his small size; the golden sweet is as big as it lay on its paper by him small.
      const sweet = starOn === raspberry;
      // Between his thumb and his finger (./fingers.ts), or at the hand of a body without them.
      const pinched = { kind: 'pinch' as const, size: sweet ? .05 * height : .08 * unit };
      const at = () => { rig.hold?.(1, pinched); return rig.socket ? rig.socket(1, pinched, hand, heldAxis) : rig.hand(1, hand); };
      at();
      const aboveFingers = sweet ? .07 * height * size : 0;
      if (direction?.act === 'eat') {
        rig.mouth(heldPoint); heldPoint.z += .045 * unit;
        // The candy's centre meets the lips while its base stays between the fingertips. Reaching the wrist
        // here instead left the private model's grip socket above his eyes.
        heldPoint.y -= aboveFingers;
        hand.lerp(heldPoint, bite.mouth);
        if (sweet && rig.grasp && rig.socket) rig.grasp(1, pinched, wristTarget.copy(hand), heldAxis, hand);
        else { rig.reach(1, hand); at(); }
      }
      starOn.position.copy(hand);
      // The sweet sits on his fingertips, not in them.
      starOn.position.y += aboveFingers;
      starOn.scale.setScalar(size * (sweet ? height : unit));
      starOn.rotation.set(0, 0, -.12);
      if (sweet) (starOn.getObjectByName('glow') as Mesh).scale.setScalar(calm ? 1 : 1 + .12 * Math.sin(lastT * 5.3));
    },
    birds: jayFlies ? [jay.getObjectByName('bird')!] : [],
    // Read each time: a model from Blender may have taken a rehearsal figure's place since.
    get actors() {
      return new Map([...rigs.entries()].map(([who, rig]) => [who, { rig, visible: () => rig.group.visible && rig.group.parent !== null }]));
    },
    replace(who, model) {
      const role = who as Role;
      const old = rigs.get(role);
      if (!old) return null;
      // Modelled with Elof's height as the unit, and drawn as big as he is drawn when he is a boy.
      model.scale.setScalar(3);
      model.updateMatrixWorld(true);
      const rig = createModelRig(model, heightOf(role));
      rig.group.name = `stage-${who}`;
      rig.group.userData.familyRole = role;
      group.remove(old.group);
      old.dispose?.();
      group.add(rig.group);
      rigs.set(role, rig);
      return rig.group;
    },
    update(frame, flags, elof, clock, dt, calm) {
      const active = frame ? scenes.findIndex((scene) => scene.id === frame.id) : -1;
      const scene = active >= 0 ? scenes[active]! : null;
      starOn = scene?.stage?.star === true ? star : scene?.stage?.star === 'gold' ? raspberry : null;
      const t = frame?.seconds ?? 0;
      const ghostKeys = scene?.stage?.actors?.ghost;
      const workpiece = ghostKeys && ghostKeys[0]!.at <= t ? fresh() : null;
      if (workpiece) play(workpiece, ghostKeys!, t);
      let carving: { motion: CarvingMotion; at: number; face: number } | null = null;
      contactMark.userData.cut = 0;
      // Who rests where: the scenes told before the one playing now, or all of them told so far.
      const resting = rest(flags, active >= 0 ? active : scenes.length);
      // A scene that has just begun starts each actor from where they are drawn now.
      if (scene && lastScene !== scene.id) {
        starts.clear();
        for (const [who, now] of live) {
          const state = resting.get(who) ?? fresh();
          starts.set(who, { ...state, x: now.x + now.velocity * GLIDE, y: now.y, z: now.z, face: now.face, walk: null,
            actAt: lastScene === null && now.act === state.act ? -now.elapsed : state.actAt,
            glide: Math.abs(now.velocity) > 0.05 ? { speed: now.velocity, stride: now.stride } : undefined });
        }
      }
      // Playing on (the scene's clock goes with the frame's, or waits on a line), the bodies turn and move their
      // limbs at their own pace. Paused, they hold what was drawn. A scene sought to another moment shows exactly
      // what it asks for then.
      const same = !!scene && lastScene === scene.id;
      const flowing = dt > 0 && dt < 0.25 && (!same || t === lastT || Math.abs(t - lastT - dt) < 0.05);
      const paused = dt <= 0 && (!scene || (same && t === lastT));
      // The scene's clock waits on a line while the frame's goes on: the bodies' own clock goes on from it (`waited`).
      if (!same) waited = 0;
      else if (dt > 0 && dt < 0.25 && t === lastT) waited += dt;
      // Elof put far away at once (a game taken up): the picture cuts, and so do they. Nearer, they walk over.
      const restored = lastElof !== null && Math.abs(elof.x - lastElof) > LOST;
      lastScene = scene?.id ?? null;
      lastT = t;
      // Paused, a game taken up moves him without time passing: the next frame that plays sees the jump.
      if (dt > 0) lastElof = elof.x;
      const holding = new Set<Mesh>();
      for (const [who, rig] of rigs) {
        let state = resting.get(who);
        const keys = scene?.stage?.actors?.[who];
        if (scene && keys) {
          state = { ...(starts.get(who) ?? state ?? fresh()) };
          play(state, keys, t);
        }
        drawnWhile(rig.group, state !== undefined && !state.away);
        if (!state || state.away) {
          // Gone in: coming back is a cut, not a walk from where they went.
          live.delete(who);
          continue;
        }
        // The lamp Elof gave Pappa is a real held prop, so neither walking nor speech reuses that hand.
        if (chapter.id === 'stormkvall' && who === 'pappa' && flags.has('lamp:give')) {
          state = { ...state };
          if (heldInOther(chapter, who, frame, calm)) state.holds = 'lamp-pappa';
          else state.holdsLeft = 'lamp-pappa';
        }
        const was = live.get(who);
        let x = state.x, y = state.y, z = state.z, face = state.face, pace = 0, velocity = 0, walked = was?.walked ?? 0;
        // The legs go by steps of the body's own length at its gait (acting.ts), so a planted foot stays put.
        let stride = was?.stride ?? 0, gait = EASY_GAIT, step: number | undefined;
        if (state.follow !== null && was && !(scene && keys)) {
          // A follower accelerates, turns and eases into their place, without walking through a pause or restore.
          // A scene that does not stage them finds them where they are: they slow to a stop there and watch, and
          // follow on after it, rather than being put back where a scene last left them.
          const want = scene ? was.x + was.velocity * 0.22 : elof.x - state.follow;
          if (dt <= 0) {
            ({ x, y, z, face, walked, stride, gait, pace, velocity } = was);
          } else if (restored || Math.abs(want - was.x) > LOST) {
            // A game taken up puts them at their place with him. Left far behind as he ran on, they are put just out
            // of the picture, and come in from there.
            x = restored || Math.abs(want - elof.x) > OUT_OF_SIGHT ? want : want - Math.sign(want - was.x) * OUT_OF_SIGHT;
            y = ground(x); face = state.face;
          } else {
            // An easy walk near their place; further behind they walk faster and jog to catch up, as Elof runs.
            const gap = want - was.x;
            const most = 2.6 + Math.min(3.6, Math.max(0, Math.abs(gap) - 3) * 0.6);
            const speed = Math.sign(gap) * Math.min(most, Math.max(0, Math.abs(gap) - 0.25) * 4);
            velocity = was.velocity + (speed - was.velocity) * -Math.expm1(-9 * dt);
            const step = Math.sign(velocity) * Math.min(Math.abs(velocity * dt), Math.abs(gap));
            x = was.x + step; y = ground(x);
            // Towards or away from the camera they walk too, to the depth their place has.
            const deeper = Math.max(-0.5 * rig.height * dt, Math.min(0.5 * rig.height * dt, state.z - was.z));
            z = was.z + deeper;
            gait = Math.hypot(step, deeper) / dt / rig.height;
            // The stride sets off and dies away with the body, never in one frame.
            pace = was.pace + (Math.min(1, gait / 0.3) - was.pace) * -Math.expm1(-10 * dt);
            face = mixTurn(was.face, pace > 0.04 ? (step > 0 ? 0 : 0.5) : state.face, -Math.expm1(-7 * dt));
            walked += Math.hypot(step, deeper);
            stride += Math.hypot(step, deeper) / stepLength(Math.max(gait, 0.3), rig.height, rig.legs);
          }
        } else if (!(scene && keys) && was && paused) {
          ({ x, y, z, face } = was);
        } else if (!(scene && keys) && was && flowing && Math.hypot(state.x - was.x, state.z - was.z) > 0.05
          && Math.hypot(state.x - was.x, state.z - was.z) < LOST) {
          // A scene that ended before they reached their place: they walk the rest of the way, slowing as they come.
          const dx = state.x - was.x, dz = state.z - was.z, far = Math.hypot(dx, dz);
          const speed = Math.min(0.8 * rig.height, far * 4), step = Math.min(far, speed * dt);
          x = was.x + dx / far * step; z = was.z + dz / far * step; y = ground(x);
          gait = speed / rig.height;
          pace = was.pace + (Math.min(1, gait / 0.3) - was.pace) * -Math.expm1(-10 * dt);
          face = mixTurn(was.face, 0.25 - Math.atan2(dx, dz) / (Math.PI * 2), Math.min(1, pace * 1.5));
          walked = was.walked + step;
          stride = was.stride + step / stepLength(Math.max(gait, 0.3), rig.height, rig.legs);
        } else if (state.walk) {
          const w = state.walk;
          const p = smooth((t - w.at) / w.seconds);
          pace = Math.min(1, Math.sin(Math.PI * Math.min(1, (t - w.at) / w.seconds)) * 1.6);
          const way = Math.hypot(w.toX - w.fromX, w.toZ - w.fromZ);
          walked = way * p;
          // Its gait at each moment from how fast the eased move goes then: setting off and arriving it takes short
          // steps, at its fastest long ones, and far and soon is a jog. The stride counts those steps, made a whole
          // number so that the walk ends with the feet together, and each step's swing fits its length.
          const u = Math.min(1, Math.max(0, (t - w.at) / w.seconds));
          gait = way / w.seconds * 6 * u * (1 - u) / rig.height;
          const steps = stepsOf(way, w.seconds, rig.height, u, rig.legs), all = stepsOf(way, w.seconds, rig.height, 1, rig.legs);
          const whole = Math.max(1, Math.round(all)), fit = all / whole;
          stride = steps / fit;
          // Taken over from legs already striding, it starts where they were and comes round to the feet together.
          const which = `${lastScene}:${w.at}:${w.toX}:${w.toZ}`;
          let carry = handed.get(who);
          if (carry?.walk !== which) carry = undefined;
          // Only the phase matters, which comes round every two steps (one step on, the other leg leads): the
          // nearest way round.
          const behind = was ? was.stride - stride - 2 * Math.round((was.stride - stride) / 2) : 0;
          // Only a walk that begins with the body already striding takes it over: not its own setting off.
          const begins = begun.get(who) !== which;
          begun.set(who, which);
          if (!carry && begins && flowing && was && was.pace > 0.3 && u < 0.2) {
            carry = { walk: which, offset: behind, gait: was.gait };
            handed.set(who, carry);
          }
          if (carry) {
            stride += carry.offset * (1 - smooth(u));
            // Its gait too, and with it its steps: long and brisk at first, shortening as the body slows and sets
            // off again.
            gait = Math.max(gait, carry.gait * (1 - smooth(u * 4)));
          }
          // Each step is as long as the way from one heel strike to the next (a whole number of steps of the counted
          // stride): it keeps its length while it is taken, so the foot that comes down at its end lands where it is put.
          if (carry) step = Math.max(0.02, stepLength(gait, rig.height, rig.legs) / rig.height * fit);
          else {
            const k = Math.min(whole - 1, Math.floor(stride));
            const at = (n: number) => n <= 0 ? 0 : n >= whole ? 1 : strideAt(way, w.seconds, rig.height, rig.legs, fit, n);
            step = Math.max(0.02, way * (smooth(at(k + 1)) - smooth(at(k))) / rig.height);
          }
          const travel = Math.atan2(w.toX - w.fromX, w.toZ - w.fromZ) / (Math.PI * 2);
          face = mixTurn(face, 0.25 - travel, Math.min(1, pace * 1.5));
          // Walking on the ground, a body keeps to it, up and down a step where it is, not sinking through a floor.
          if (Math.abs(w.fromY - ground(w.fromX)) < 0.05 && Math.abs(w.toY - ground(w.toX)) < 0.05) y = ground(x);
        }
        if (scene && keys && state.glide) {
          // Slowing to the stop the scene starts them at, with steps that die away.
          const left = Math.exp(-t / GLIDE), behind = state.glide.speed * GLIDE * left;
          x -= behind;
          if (!state.walk) y = ground(x);
          const gliding = Math.abs(state.glide.speed) * left / rig.height;
          pace = Math.max(pace, Math.min(1, gliding / 0.3));
          if (!state.walk) {
            gait = gliding;
            stride = state.glide.stride + Math.abs(state.glide.speed * GLIDE - behind) / stepLength(Math.max(gait, 0.3), rig.height, rig.legs);
          }
        }
        // A cut is the scene's own; otherwise nobody whips round: a body turns at most at TURN_RATE.
        const cut = !was || Math.hypot(x - was.x, z - was.z) > CUT;
        const facing = face;
        // Setting off, it goes on turning no faster than its feet can follow until the stride is under way.
        const onTheSpot = state.stance === 'stand' && !calm ? 1 - smooth(pace / 0.5) : 0;
        if (flowing && !cut) face = turnBy(was!.face, face, (TURN_RATE + (STAND_TURN - TURN_RATE) * onTheSpot) * dt);
        // A step up or down takes a moment, as a stride does, never one frame.
        if (flowing && !cut) y = was!.y + Math.max(-STEP_RATE * rig.height * dt, Math.min(STEP_RATE * rig.height * dt, y - was!.y));
        else if (paused && was) face = was.face;
        rig.group.position.set(x, y, z);
        rig.group.rotation.y = yaw(face);
        // The aim, from the feet in the body's own side view, in an adult's units.
        const unit = 5.2 / rig.height;
        const aimFor = (target: Point | null) => {
          if (!target) return null;
          const turned = yaw(face);
          const ahead = (target.x - x) * Math.sin(turned) + ((target.z ?? 0) - z) * Math.cos(turned);
          const side = (target.x - x) * Math.cos(turned) - ((target.z ?? 0) - z) * Math.sin(turned);
          return { ahead: ahead * unit, side: side * unit, up: (target.y - y) * unit };
        };
        const aim = aimFor(state.aim);
        // How each stands and breathes goes by the scene's clock in a scene, and on by itself while it waits on a line.
        const time = scene && keys ? t + waited : clock;
        // Between scenes finish the current sip, then hold the cup down; pausing never advances this clock.
        const prior = was?.act === state.act ? was.elapsed : Math.max(0, -state.actAt);
        const elapsed = scene && keys ? Math.max(0, t - state.actAt)
          : prior + (state.act === 'sip' && sippingAt(prior, false, who).raise === 0 ? 0 : Math.max(0, dt));
        live.set(who, { x, y, z, face, walked, stride, gait, pace, velocity, act: state.act, elapsed });
        const since = (at: number) => (scene && keys ? Math.max(0, t - at) : elapsed);
        // How each stands runs on its own clock, so that the family never shift their weight together.
        const sitsAt = seatOf(who, rig.height);
        // A kneel or a crouch after the same (walked to, down there, or down already) does not go down again from standing.
        const already = (state.act === 'kneel' || state.act === 'crouch') && state.before?.stance === state.stance ? CLIPS[state.act].seconds : 0;
        const context = { t: since(state.actAt) + already, aim, stride, gait, step, pace, calm, role: who, legs: rig.legs, clock: time + LOOP[who], seat: sitsAt };
        actPose(state.act, context, pose, state.stance);
        if (state.glance) {
          // Blend the head angles, avoiding a whip through targets passing close behind the body.
          actPose(state.act, { ...context, aim: aimFor(state.glance.from) }, before, state.stance);
          pose.nod = mix(before.nod, pose.nod, state.glance.weight);
          pose.turn = mix(before.turn, pose.turn, state.glance.weight);
        }
        // Turning about, the head goes first: it looks round to where the body is turning to, ahead of the body (a larger
        // facing is to the body's right, and the head turns to its left as `turn` grows).
        if (flowing && !cut && !calm) {
          const still = ((((facing - face) % 1) + 1.5) % 1) - 0.5;
          pose.turn = Math.max(-0.9, Math.min(0.9, pose.turn - Math.max(-0.6, Math.min(0.6, still * Math.PI * 2 * 0.7))));
        }
        // Getting up off a knee or out of a crouch: the way down (art/blender/motion.py CLIPS.kneel, crouch) the other way,
        // handing over to what they do next as they come up. An act that comes before they are up starts from where they are.
        const getUp = (out: Pose, stance: Stance, from: State['before'], age: number): void => {
          const clip = from?.stance === 'kneel' ? CLIPS.kneel : from?.stance === 'crouch' ? CLIPS.crouch : null;
          const up = clip === CLIPS.crouch ? CROUCH_UP : clip?.seconds ?? 0;
          if (!clip || stance !== 'stand' || calm || age >= up) return;
          const u = age / up;
          if (clip === CLIPS.kneel) kneelPose(clip, clip.seconds * (1 - u), rig.legs, Object.assign(gettingUp, out), STANDS[who].width);
          else crouchPose(clip, clip.seconds * (1 - u), rig.legs, Object.assign(gettingUp, out), STANDS[who].width);
          const k = smooth(u);
          for (const joint of LIMBS) out[joint] = gettingUp[joint] + (out[joint] - gettingUp[joint]) * k;
        };
        /**
         * How far down in a crouch the body is (0 to 1): going down, down there under whatever it does with its arms and
         * head, and getting up the same way back. The hips sit back over the feet as far (crouchPlaces), which stay put.
         */
        const crouched = (act: Act, stance: Stance, from: State['before'], age: number): number => {
          const clip = CLIPS.crouch, s = clip.seconds;
          const now = stance === 'crouch' ? act === 'crouch' && !calm ? Math.min(1, Math.max(0, sample(clip.down!, Math.min(age, s)))) : 1
            : stance === 'stand' && from?.stance === 'crouch' && !calm && age < CROUCH_UP
              ? Math.min(1, Math.max(0, sample(clip.down!, s * (1 - age / CROUCH_UP)))) : 0;
          return from && age < .45 ? mix(crouched(from.act, from.stance, from.previous, from.t), now, smooth(age / .45)) : now;
        };
        // Getting up from a chair and sitting down on one (art/blender/motion.py CLIPS.standUp, sitDown): what it has of
        // the body (CHAIRED) comes in from the act before and hands over to what they do next; the head nods on top.
        const chairClip = (stance: Stance, from: State['before'], age: number): Clip | null => {
          const clip = calm || !from ? null : stance === 'stand' && from.stance === 'sit' ? CLIPS.standUp
            : stance === 'sit' && from.stance === 'stand' ? CLIPS.sitDown : null;
          return clip && age < clip.seconds ? clip : null;
        };
        const chair = (out: Pose, stance: Stance, from: State['before'], age: number): void => {
          const clip = chairClip(stance, from, age);
          if (!clip) return;
          const u = age / clip.seconds, k = smooth(u / .2) * (1 - smooth((u - .8) / .2));
          chairPose(clip, age, rig.legs, Object.assign(chairing, STANDING), sitsAt, STANDS[who].width);
          for (const joint of CHAIRED) out[joint] += (chairing[joint] - out[joint]) * k;
          out.nod += chairing.nod * k;
          // The hips where the clip has them, on the seat or over the feet, never with the feet through the floor.
          const seat = out.seat ?? 0, floor = out.seat === null ? 1 : out.floor ?? 0;
          out.seat = seat + (chairing.seat! - seat) * k;
          out.floor = Math.max(1e-3, floor * (1 - k));
        };
        /** How far behind its place the clip has the hips, in world units: as far as the feet are ahead of them, planted. */
        const backOf = (stance: Stance, from: State['before'], age: number): number => {
          const clip = chairClip(stance, from, age);
          if (clip) return sample(clip.planted!, age) * chairPose(clip, age, rig.legs, Object.assign(chairing, STANDING), sitsAt, STANDS[who].width) * rig.height;
          return from && age < .45 ? backOf(from.stance, from.previous, from.t) * (1 - smooth(age / .45)) : 0;
        };
        /** How far back the chair is: with the hips while they are on it, pushed back once they are up, in under them seated. */
        const chairBack = (stance: Stance, from: State['before'], age: number, hips: number, pushed: number): number => {
          const clip = chairClip(stance, from, age);
          if (clip === CLIPS.standUp) return age < SEAT_LEFT ? hips : pushed;
          if (clip === CLIPS.sitDown) return age < SEAT_REACHED ? pushed : hips;
          const now = stance === 'sit' ? 0 : pushed;
          return from && age < .45 ? mix(chairBack(from.stance, from.previous, from.t, hips, pushed), now, smooth(age / .45)) : now;
        };
        getUp(pose, state.stance, state.before, elapsed);
        if (state.before && elapsed < 0.45) {
          const previous = (old: NonNullable<State['before']>, out: Pose): Pose => {
            actPose(old.act, { t: old.t, aim: aimFor(old.aim), stride: 0, pace: 0, calm, role: who, legs: rig.legs, clock: time + LOOP[who], seat: sitsAt }, out, old.stance);
            getUp(out, old.stance, old.previous, old.t);
            chair(out, old.stance, old.previous, old.t);
            if (old.previous) blendPose(previous(old.previous, { ...STANDING }), out, smooth(old.t / .45), out, true);
            return out;
          };
          blendPose(previous(state.before, before), pose, smooth(elapsed / 0.45), pose, true);
        }
        // Walking supplies the legs, whole: their steps already shorten to nothing as the body slows, so the
        // planted boot stays put. Getting up off the knees or out of a chair into a walk, or going down into one
        // from it, takes RISE.
        // The stride grows from standing and dies away to it by itself (its pace): it has the legs all the while it walks.
        // The stride's own pace grows and dies away with the walk's.
        const stridePace = Math.min(1, pace * 1.5);
        const wanted = stridePace > 0.01 || footings.get(who)?.settling ? 1 : 0;
        const rising = (old: State['before']): boolean => !!old && (LOW.includes(old.stance) || rising(old.previous));
        const low = LOW.includes(state.stance) || (elapsed < 0.45 && rising(state.before));
        const had = striding.get(who);
        const legs = low && flowing && !cut && had !== undefined
          ? had + Math.max(-dt / RISE, Math.min(dt / RISE, wanted - had)) : wanted;
        striding.set(who, legs);
        // Each foot stays where it came down until it lifts; a cut or a seek forgets where they stood. Stopping, the stride
        // is drawn on until its last step has brought the feet together.
        const footing = footings.get(who) ?? footings.set(who, createFooting()).get(who)!;
        if ((!flowing && !paused) || cut || !(stridePace > 0.01 || legs > 0.01 || footing.settling)) footing.reset();
        if (stridePace > 0.01 || legs > 0.01 || footing.settling) {
          // Setting off and stopping, the stride itself grows and dies away with the pace: a planted foot stays planted.
          actPose('walk', { t: time, aim: null, stride, gait, step, pace: stridePace, calm, role: who, legs: rig.legs,
            feet: { footing, x, z, yaw: yaw(face), height: rig.height, dt } }, walking);
          const weight = Math.min(1, stridePace);
          const acting = !['stand', 'watch', 'look', 'walk'].includes(state.act);
          // An offer, a drawing or a mug keeps its hands and torso in the act; the hips go with the legs whatever the hands do,
          // and the trunk goes on over them as it goes walking, turning against the hips and bending with the step.
          for (const joint of STRIDING) pose[joint] += (walking[joint] - pose[joint]) * legs;
          if (acting) for (const joint of UNDER_ACT) pose[joint] += (walking[joint] - STANDING[joint]) * weight;
          if (!acting) for (const joint of CARRIED) pose[joint] += (walking[joint] - pose[joint]) * weight;
          const free = !acting || HANDS_HANG.includes(state.act) ? HANDS_FREE[0]!
            : state.act === 'shine' && state.holdsLeft?.startsWith('lamp-') && !state.holds?.startsWith('lamp-')
              ? HANDS_FREE[2]! : WALKING_HANDS[state.act] ?? HANDS_FREE[3]!;
          // Arm ownership is independent of the torso gesture. Props reserve their actual hand, and a drawing both;
          // a lamp carried on the left leaves the right arm free. Targeted contact is solved after the shared pose.
          if (free[0] && !state.holdsLeft && state.holds !== 'drawing') {
            pose.armL += (walking.armL - pose.armL) * weight;
            pose.elbowL += (walking.elbowL - pose.elbowL) * weight;
            pose.wristL += (walking.wristL - pose.wristL) * weight;
          }
          if (free[1] && !state.holds && state.holdsLeft !== 'drawing') {
            pose.armR += (walking.armR - pose.armR) * weight;
            pose.elbowR += (walking.elbowR - pose.elbowR) * weight;
            pose.wristR += (walking.wristR - pose.wristR) * weight;
          }
          if (stridePace > 0.01) pose.seat = null;
        }
        chair(pose, state.stance, state.before, elapsed);
        // Standing, the feet stay where they stand and step round as the body turns on the spot (./footwork.ts).
        const footwork = footworks.get(who) ?? footworks.set(who, createFootwork()).get(who)!;
        if (!paused) {
          const stands = flowing && !cut && !calm && state.stance === 'stand' && !low && legs <= 0.01 && stridePace <= 0.01
            && !footing.settling && pose.seat === null && !chairClip(state.stance, state.before, elapsed);
          const at = { x, z, yaw: yaw(face), target: yaw(facing), rate: STAND_TURN * Math.PI * 2, height: rig.height, width: STANDS[who].width, dt };
          if (stands) footwork.stand(pose, rig.legs, at);
          // Walking off, the feet come in to the stride's own places as it lifts them, not slid there.
          else if (flowing && !cut && !calm && footwork.moved && state.stance === 'stand' && !low && pose.seat === null) footwork.carry(pose, rig.legs, at, footing.down);
          else { footwork.reset(); pose.yawL = pose.yawR = 0; }
        }
        // What is asked for, from what was drawn. Where it jumps (a new scene, a glance to something else, an act that
        // starts from elsewhere), the body goes on from where it was at the speed it had and the jump dies away (CATCH):
        // a jump is a change in how far a joint is asked to go in a frame, beyond JUMP; what moves smoothly, however fast,
        // is drawn as it is. Paused, the body holds what was drawn; a cut or a seek draws what is asked at once.
        const shown = drawn.get(who), speed = drawnSpeed.get(who) ?? drawnSpeed.set(who, { ...STANDING }).get(who)!;
        const off = behind.get(who) ?? behind.set(who, { ...STANDING }).get(who)!;
        const offSpeed = behindSpeed.get(who) ?? behindSpeed.set(who, { ...STANDING }).get(who)!;
        const target = asking.get(who), targetStep = askingStep.get(who) ?? askingStep.set(who, { ...STANDING }).get(who)!;
        const wantedNow = { ...pose };
        if (flowing && !cut && shown && target) {
          const handing = had !== undefined && had !== legs;
          for (const joint of LIMBS) {
            const step = pose[joint] - target[joint], excess = step - targetStep[joint], jump = Math.abs(excess) > JUMP;
            targetStep[joint] = jump ? targetStep[joint] : step;
            // The legs are the stride's, a clip's or a stance's own, which put the feet where they stand (and the trunk is the
            // stride's while it walks): they are drawn as asked, at most at LEG_RATE, the weight's shift at SLOW_RATE.
            if (STRIDING.includes(joint as typeof STRIDING[number]) || ((legs > 0.01 || handing) && CARRIED.includes(joint as typeof CARRIED[number]))) {
              off[joint] = offSpeed[joint] = 0;
              const most = (SLOW.includes(joint as typeof SLOW[number]) ? SLOW_RATE : LEG_RATE) * dt;
              pose[joint] = shown[joint] + Math.max(-most, Math.min(most, pose[joint] - shown[joint]));
              speed[joint] = (pose[joint] - shown[joint]) / dt;
              continue;
            }
            // The jump goes into how far behind what is asked the body is; the body goes on as it was.
            if (jump) off[joint] -= excess;
            // Critically damped, as far as this frame: the difference and its speed die away together.
            const w = catchOf(joint), e = Math.exp(-w * dt), k = (offSpeed[joint] + w * off[joint]) * dt;
            off[joint] = (off[joint] + k) * e;
            offSpeed[joint] = (offSpeed[joint] - w * k) * e;
            if (Math.abs(off[joint]) < 1e-6 && Math.abs(offSpeed[joint]) < 1e-5) off[joint] = offSpeed[joint] = 0;
            const most = rateOf(joint) * dt;
            let caught = pose[joint] + off[joint];
            if (joint === 'turn') {
              // A delayed turn may keep momentum after its target changes, but cannot carry the head behind the chest.
              // Bound the catch offset smoothly inside the remaining neck range: ordinary gaze (zero offset) stays
              // exact, and velocity eases towards the limit instead of hitting a hard clamp. Speech adds only its small
              // look/nod afterwards. Keep this inside the active catch; Pause retains the already drawn head unchanged.
              const gaze = Math.max(-.9, Math.min(.9, pose.turn));
              const room = 1.15 - Math.sign(off.turn) * gaze;
              caught = gaze + room * Math.tanh(off.turn / room);
            }
            pose[joint] = shown[joint] + Math.max(-most, Math.min(most, caught - shown[joint]));
            speed[joint] = (pose[joint] - shown[joint]) / dt;
          }
        } else if (paused && shown) {
          // Pause holds the motion's memory as well as its picture. Losing an unfinished blend's
          // offset or velocity here would make the first resumed frame jump toward its target.
          Object.assign(pose, shown);
        } else {
          for (const joint of LIMBS) off[joint] = offSpeed[joint] = speed[joint] = targetStep[joint] = 0;
        }
        if (!paused) asking.set(who, wantedNow);
        drawn.set(who, { ...pose });
        // Getting up, the body comes up over its feet; sitting down, it goes down behind them, and in with the chair.
        const hipsBack = backOf(state.stance, state.before, elapsed);
        // Crouching, the hips sit back over the feet, which stay where they stood.
        const shift = hipsBack + crouchPlaces(rig.legs).ahead * rig.height * crouched(state.act, state.stance, state.before, elapsed + already);
        if (shift !== 0) {
          rig.group.position.x -= Math.sin(yaw(face)) * shift;
          rig.group.position.z -= Math.cos(yaw(face)) * shift;
        }
        for (const piece of chairs) if (piece.owner === who) {
          const pushed = chairPose(CLIPS.standUp, SEAT_LEFT, rig.legs, Object.assign(tucked, STANDING), sitsAt, STANDS[who].width) * rig.height;
          const back = chairBack(state.stance, state.before, elapsed, hipsBack, pushed);
          piece.made.position.set(piece.x - Math.sin(yaw(piece.face)) * back, piece.y, piece.z - Math.cos(yaw(piece.face)) * back);
        }
        // What is said (./talk.ts), drawn over what the scene asks for and never kept in it: they look at whoever speaks, from
        // where their face was a moment ago, and speak with their mouths, their heads and a free hand.
        const talker = talkers.get(who) ?? talkers.set(who, createTalker(who, 101 + 37 * FAMILY.indexOf(who))).get(who)!;
        const other = talk.lookAt(who), there = other ? talk.face(other) : null;
        if (there) rig.mouth(faceAt);
        const hangs = HANDS_HANG.includes(state.act);
        const free = HANDS_FREE[(hangs && !state.holdsLeft ? 0 : 2) + (hangs && !state.holds ? 0 : 1)]!;
        talker.update(talk, there ? lookAt(rig.group, faceAt, there, heard) : null, dt, calm, free);
        talker.pose(pose);
        rig.pose(pose);
        rig.face?.(talker.mouth.open, talker.mouth.round, talker.lids);
        rig.mouth(faceAt);
        talk.place(who, faceAt.x, faceAt.y, faceAt.z);
        // Resolve authored interaction targets in 3D. Interrupted acts retain their contact share,
        // and unreachable targets stay at the real arm's limit rather than stretching the body.
        hand.set(0, 0, 0); otherHand.set(0, 0, 0);
        let rightWeight = 0, leftWeight = 0, rightLimit = 0;
        const reach = (act: Act, age: number, target: Point | null, old: State['before'], share: number): void => {
          const k = old ? smooth(age / .45) : 1;
          if (old && k < 1) reach(old.act, old.t, old.aim, old.previous, share * (1 - k));
          if (!target || !TURNS_TO.includes(act)) return;
          const t = calm ? 3 : age, weight = share * k;
          heldPoint.set(target.x, target.y, target.z ?? 0);
          const right = weight * smooth(t / (act === 'lift' ? 1.1 : act === 'point' ? .3 : .5));
          hand.addScaledVector(heldPoint, right); rightWeight += right;
          rightLimit += right * (act === 'offer' ? OFFER_REACH : 1);
          if (act === 'reach' || act === 'lift') {
            const left = weight * smooth((t - .08) / (act === 'lift' ? 1.02 : .42));
            heldPoint.x += .3 * Math.cos(yaw(face)) / unit;
            heldPoint.y -= .1 / unit;
            heldPoint.z -= .3 * Math.sin(yaw(face)) / unit;
            otherHand.addScaledVector(heldPoint, left); leftWeight += left;
          }
        };
        reach(state.act, elapsed, state.aim, state.before, 1);
        // Pointing uses the whole arm; an offer keeps an elbow bend. Each retained act carries its own limit
        // through the blend, so starting or ending an offer cannot suddenly shorten or straighten the arm.
        if (rightWeight > 0) rig.reach(1, hand.divideScalar(rightWeight), rightWeight, rightLimit / rightWeight);
        // And the hand points with its first finger as the arm comes up, and lets it go as the arm comes down (./fingers.ts).
        const points = state.act === 'point' ? smooth((calm ? 3 : elapsed) / .3)
          : state.before?.act === 'point' ? 1 - smooth(elapsed / .45) : 0;
        if (points > 1e-3) rig.hold?.(1, POINTING, points);
        if (leftWeight > 0) rig.reach(0, otherHand.divideScalar(leftWeight), leftWeight);
        // Kneeling, the right hand rests on the right knee, and crouching both hands on the knees, with the real arms: as they
        // go down, while they look about down there, and as they push up off them getting up.
        const lowered = (stance: Stance) => stance === 'kneel' ? CLIPS.kneel : stance === 'crouch' ? CLIPS.crouch : null;
        /** How long getting up takes, from a kneel or a crouch. */
        const upOf = (clip: Clip) => clip === CLIPS.crouch ? CROUCH_UP : clip.seconds;
        const onKnee = (side: 0 | 1, act: Act, stance: Stance, age: number, old: State['before']): number => {
          const resting = (low: Stance) => low === 'crouch' || side === 1;
          const clip = lowered(stance), from = old ? lowered(old.stance) : null;
          const now = clip && resting(stance) ? act === stance ? calm ? 1 : sample(clip.hand!, age)
            : act === 'watch' || act === 'look' || act === 'nod' ? 1 : 0
            : stance === 'stand' && from && resting(old!.stance) && !calm && age < upOf(from)
              ? sample(from.hand!, from.seconds * (1 - age / upOf(from))) * (1 - smooth(age / upOf(from))) : 0;
          return old && age < .45 ? mix(onKnee(side, old.act, old.stance, old.t, old.previous), now, smooth(age / .45)) : now;
        };
        forward.set(Math.sin(yaw(face)), 0, Math.cos(yaw(face)));
        for (const side of [0, 1] as const) {
          const handOnKnee = rig.knee ? onKnee(side, state.act, state.stance, elapsed + already, state.before) : 0;
          if (handOnKnee <= 1e-3) continue;
          // On the top of the knee, a little back from its front, the wrist over the thigh.
          rig.knee!(side, kneeAt).addScaledVector(up, rig.height * KNEE_HAND.up).addScaledVector(forward, -rig.height * KNEE_HAND.back);
          rig.reach(side, kneeAt, handOnKnee);
        }
        // The working hands follow the wood, using each body's real arm lengths and the blade's tip.
        const leavesCarving = state.before?.act === 'carve' && elapsed < .45;
        if (who === 'pappa' && workpiece?.act === 'carved' && (state.act === 'carve' || leavesCarving)) {
          const carvingTime = state.act === 'carve' ? since(state.actAt) : state.before!.t;
          const motion = carvingAt(carvingTime, calm);
          const weight = state.act === 'carve' ? 1 : 1 - smooth(elapsed / .45);
          cutPoint(motion.right, workpiece, face, motion.clearance, contactMark.position);
          supportMark.position.set(workpiece.x, workpiece.y + .65, workpiece.z)
            .addScaledVector(across, .41 + .06 * workpiece.rough).addScaledVector(forward, -.12);
          knifeDirection.copy(across).multiplyScalar(.95).addScaledVector(forward, motion.knifeDirection.ahead * .12);
          knifeDirection.y = motion.knifeDirection.up;
          knifeDirection.normalize();
          wristTarget.copy(contactMark.position).addScaledVector(knifeDirection, -.4);
          rig.reach(0, supportMark.position, weight);
          rig.hold?.(0, FLAT, weight);
          fingerDirection.copy(forward).addScaledVector(up, -.25).normalize();
          // The hand closes round the haft, its blade out past the thumb; without fingers, the palm on it.
          if (rig.grasp) rig.grasp(1, GRIPS.knife, wristTarget, knifeDirection, gripMark.position, weight, knifeHeld);
          else { rig.grip(1, wristTarget, fingerDirection, gripMark.position, weight); knifeHeld.copy(knifeDirection); }
          contactMark.userData.cut = motion.cut;
          if (state.act === 'carve') carving = { motion, at: state.actAt, face };
        }
        across.set(Math.cos(yaw(face)), 0, -Math.sin(yaw(face)));
        forward.set(Math.sin(yaw(face)), 0, Math.cos(yaw(face)));
        const sheet = things.get('drawing');
        let drawingContact = false;
        const leavesDrawing = state.before?.act === 'draw' && elapsed < .45;
        if (who === 'moa' && drawingHome && table && state.stance === 'sit' && sheet) {
          const turn = yaw(drawingHome.face ?? .25);
          sheet.position.set((drawingHome.x ?? x) + Math.sin(turn) * 1.15 / unit, table.at.y + 1.658,
            (drawingHome.z ?? z) + Math.cos(turn) * 1.15 / unit);
          sheet.rotation.set(-Math.PI / 2, turn, 0, 'YXZ'); sheet.scale.setScalar(.43);
          holding.add(sheet);
          if (state.act === 'draw' || leavesDrawing) {
            drawingContact = true;
            const pen = drawingAt(state.act === 'draw' ? since(state.actAt) : state.before!.t, calm, who);
            // Returning from a look or gesture brings the hands back with the act's event-time blend.
            // An existing drawing (including its initial/restored pose) keeps its contact throughout.
            const taking = calm || !state.before || state.before.act === 'draw' ? 1 : smooth(elapsed / .45);
            const weight = state.act === 'draw' ? taking : 1 - smooth(elapsed / .45);
            paperContact.position.copy(sheet.position).addScaledVector(across, pen.across / unit).addScaledVector(forward, pen.ahead / unit);
            paperContact.position.y += .008 + pen.lift / unit;
            paperContact.userData.contact = pen.contact;
            paperSupport.position.copy(sheet.position).addScaledVector(across, .3).addScaledVector(forward, -.08);
            paperSupport.position.y += .045;
            fingerDirection.copy(forward).addScaledVector(up, -.15).normalize();
            rig.grip(0, paperSupport.position, fingerDirection, otherHand, weight);
            rig.hold?.(0, FLAT, weight);
            toolAxis.copy(up).addScaledVector(forward, -.45).normalize();
            heldPoint.copy(paperContact.position).addScaledVector(toolAxis, .15);
            // Pinched near its tip, the tip out past her fingers to the paper; without fingers, the palm round its middle.
            if (rig.grasp) {
              heldPoint.copy(paperContact.position).addScaledVector(toolAxis, PINCHED);
              rig.grasp(1, GRIPS.crayon, heldPoint, aimed.copy(toolAxis).negate(), crayonGrip.position, weight, crayonHeld);
              crayonHeld.negate();
              crayonCentre.copy(crayonGrip.position).addScaledVector(crayonHeld, CRAYON_MIDDLE - PINCHED);
            } else {
              rig.grip(1, heldPoint, fingerDirection, crayonGrip.position, weight);
              crayonHeld.copy(toolAxis); crayonCentre.copy(crayonGrip.position);
            }
          }
        }
        const showsDrawing = state.holds === 'drawing' || state.holdsLeft === 'drawing';
        const leavesShowing = state.before?.act === 'show' && elapsed < .45;
        if (sheet && (showsDrawing || leavesShowing)) {
          rig.mouth(heldPoint);
          // Her head can turn toward a speaker without pulling the page, and an arm, across her abdomen.
          // Centre the page between the shoulders; only its height follows the face above it.
          if (rig.arm) {
            rig.arm(0, hand, otherHand, kneeAt);
            rig.arm(1, otherHand, kneeAt, wristTarget);
            heldPoint.x = (hand.x + otherHand.x) * .5;
            heldPoint.z = (hand.z + otherHand.z) * .5;
          }
          heldPoint.addScaledVector(up, -.64 / unit).addScaledVector(forward, .45 / unit);
          rig.hand(1, hand); rig.hand(0, otherHand); hand.add(otherHand).multiplyScalar(.5).addScaledVector(up, .18);
          const arrival = calm || leavesShowing ? 1 : smooth(since(state.actAt) / .5);
          sheet.position.copy(hand).lerp(heldPoint, arrival);
          // Her page faces Elof in front of her, and the audience alongside him. Body turns may follow a
          // speaker, but never turn the explanation back to front or reverse its left-to-right pictures.
          sheet.rotation.set(0, 0, 0); sheet.scale.setScalar(.52);
          across.set(1, 0, 0);
          sheetLeft.position.copy(sheet.position).addScaledVector(across, .494).addScaledVector(up, -.18);
          sheetRight.position.copy(sheet.position).addScaledVector(across, -.494).addScaledVector(up, -.18);
          const weight = showsDrawing ? arrival : 1 - smooth(elapsed / .45);
          rig.grip(0, sheetLeft.position, up, otherHand, weight);
          rig.grip(1, sheetRight.position, up, hand, weight);
          rig.hold?.(0, GRIPS.drawing, weight);
          rig.hold?.(1, GRIPS.drawing, weight);
        }
        // What they hold: in the right hand, and in the left. Moa's drawing is held up in both.
        const releasingMug = state.before && elapsed < .45 ? state.before.mug : null;
        for (const [side, current] of [[1, state.holds], [0, state.holdsLeft]] as const) {
          // A hand that has just let something go opens over the blend, one that has just taken it closes.
          const had = state.before && elapsed < .45 ? state.before.held?.[side] ?? null : null;
          if (had && had !== current && had !== 'drawing' && !(had === 'mug' && side === releasingMug)) rig.hold?.(side, GRIPS[had], 1 - smooth(elapsed / .45));
          const held = current ?? (side === releasingMug ? 'mug' : null);
          if (!held) continue;
          const mesh = things.get(held);
          if (!mesh) continue;
          if (current) holding.add(mesh);
          rig.hand(side, hand);
          if (held === 'drawing') continue;
          if (held.startsWith('lamp-')) {
            const aim = state.aim;
            lampAim.set(aim?.x ?? elof.x, aim?.y ?? elof.y + .4, aim?.z ?? 0);
            // Newly taking a torch must follow the same event-time blend as the authored arms.
            // Pappa's persistent indoor torch is already in hand across every later act.
            const persistent = chapter.id === 'stormkvall' && who === 'pappa' && flags.has('lamp:give');
            const taking = calm || persistent || had === current || !state.before ? 1 : smooth(elapsed / .45);
            holdFlashlight(rig, mesh, side, lampAim, Math.max(.7, rig.height / 5.2), state.act !== 'dress', taking);
            continue;
          }
          const closing = !current ? 1 - smooth(elapsed / .45) : had === current || !state.before || elapsed >= .45 ? 1 : smooth(elapsed / .45);
          if (held === 'mug') {
            const sip = sippingAt(state.act === 'sip' ? since(state.actAt) : 0, calm, who);
            if (state.before?.act === 'sip' && elapsed < .45) {
              const old = sippingAt(state.before.t, calm, who), k = smooth(elapsed / .45);
              sip.raise = mix(old.raise, sip.raise, k); sip.tilt = mix(old.tilt, sip.tilt, k);
            }
            rig.mouth(mouth.position);
            // The nearest rim meets the lips; the cup turns around that contact while she drinks.
            mesh.rotation.set(-.42 * sip.tilt, yaw(face), 0, 'YXZ');
            rim.set(0, .16, -.15).applyQuaternion(mesh.quaternion);
            heldPoint.set(x, mouth.position.y - .9 / unit, z).addScaledVector(across, .4 / unit).addScaledVector(forward, .38 / unit);
            hand.copy(mouth.position).sub(rim); heldPoint.lerp(hand, sip.raise);
            fingerDirection.copy(up);
            const weight = current ? 1 : 1 - smooth(elapsed / .45);
            if (rig.grasp) {
              // Her hand closes round the handle's upright; the cup hangs from where her hand is.
              heldAxis.set(0, 1, 0).applyQuaternion(mesh.quaternion);
              hand.copy(MUG_HANDLE).applyQuaternion(mesh.quaternion).add(heldPoint);
              rig.grasp(side, GRIPS.mug, hand, heldAxis, mugGrip.position, weight);
              mesh.position.copy(MUG_HANDLE).applyQuaternion(mesh.quaternion).negate().add(mugGrip.position);
            } else {
              // Her hand wraps the side of the cup, rather than occupying its centre.
              hand.copy(heldPoint).addScaledVector(across, .18);
              rig.grip(side, hand, fingerDirection, mugGrip.position, weight);
              mesh.position.copy(mugGrip.position).addScaledVector(across, -.18);
            }
          } else {
            const carved = held === 'knife' && state.act === 'carve' && workpiece?.act === 'carved';
            const drawn = held === 'crayon' && state.act === 'draw' && drawingContact;
            if (carved) hand.copy(gripMark.position);
            else if (drawn) hand.copy(crayonCentre);
            else if (rig.socket) {
              // Held where the hand is, in its grip, the fingers closed round it; a pinched thing's tip out past them.
              rig.hold?.(side, GRIPS[held], closing);
              rig.socket(side, GRIPS[held], hand, heldAxis);
              if (GRIPS[held].kind === 'pinch') hand.addScaledVector(heldAxis.negate(), CRAYON_MIDDLE - PINCHED);
            }
            mesh.position.copy(hand);
            if (carved) mesh.quaternion.setFromUnitVectors(up, knifeHeld);
            else if (drawn) mesh.quaternion.setFromUnitVectors(up, crayonHeld);
            else if (rig.socket) mesh.quaternion.setFromUnitVectors(up, heldAxis);
            else mesh.rotation.set(0, yaw(face), held === 'knife' || held === 'brush' || held === 'crayon' ? -0.6 : 0);
          }
        }
      }

      for (const mesh of things.values()) drawnWhile(mesh, holding.has(mesh));

      // The scene's glitter, shavings, glows and the bird at the window.
      let spark = 0, glow = 0, curl = 0, wind = 0;
      let jayOn = false;
      for (const fx of scene?.stage?.fx ?? []) {
        const age = t - fx.at;
        if (age < 0 || age > fx.seconds) continue;
        const life = age / fx.seconds;
        const motion = calm ? .7 : age;
        const fade = Math.min(1, age / 0.25, (fx.seconds - age) / 0.35);
        // The chosen bite can happen on either side of the sweet: its magic belongs to Elof, not the mark.
        const at = scene?.id === 'poff' && scene.resumeAt ? { ...fx.from,
          x: fx.from.x + elof.x - scene.resumeAt.x, y: fx.from.y + elof.y - scene.resumeAt.y } : fx.from;
        switch (fx.kind) {
          case 'wind': {
            const to = fx.to ?? at;
            windAlong.set(to.x - at.x, to.y - at.y, (to.z ?? 0) - (at.z ?? 0)).normalize();
            for (let i = 0; i < 24 && wind < 24; i++, wind++) {
              // The room's air keeps moving while someone reads; Pause holds `waited` with the scene.
              const k = (i / 24 + (calm ? .2 : age + waited) * .48) % 1;
              const arc = Math.sin(k * Math.PI);
              place.position.set(mix(at.x, to.x, k) + Math.sin(i * 2.4) * .65 * arc,
                mix(at.y, to.y, k) + Math.sin(i * 1.7 + k * 8) * .7 * arc,
                mix(at.z ?? 0, to.z ?? 0, k) + Math.sin(i * 3.1) * .8 * arc);
              place.quaternion.setFromUnitVectors(up, windAlong);
              place.scale.set(fade, fade * (.5 + (i % 4) * .18), fade);
              place.updateMatrix();
              wisps.setMatrixAt(wind, place.matrix);
            }
            break;
          }
          case 'sparkle': {
            for (let i = 0; i < 16 && spark < SPARKS; i++, spark++) {
              const a = i * 2.39996 + motion * (1.4 + (i % 4) * 0.4);
              const r = 0.35 + 0.25 * Math.sin(motion * 3 + i);
              const up = ((i / 16) + motion * 0.35) % 1;
              place.position.set(at.x + Math.cos(a) * r, at.y + up * 1.4 - 0.2, (at.z ?? 0) + Math.sin(a) * r);
              place.rotation.set(motion * 3 + i, motion * 2 + i, 0);
              place.scale.setScalar(fade * (0.5 + 0.5 * Math.sin(motion * 9 + i)) * (1 - up * 0.6));
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            break;
          }
          case 'stream': {
            const to = fx.to ?? at;
            for (let i = 0; i < 14 && spark < SPARKS; i++, spark++) {
              const k = ((i / 14) + motion * 0.9) % 1;
              const arc = Math.sin(k * Math.PI) * 0.5;
              place.position.set(mix(at.x, to.x, k), mix(at.y, to.y, k) + arc, mix(at.z ?? 0, to.z ?? 0, k) + Math.sin(i * 1.7 + motion * 4) * 0.08);
              place.rotation.set(motion * 4 + i, i, 0);
              place.scale.setScalar(fade * 0.8);
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            break;
          }
          case 'poff': {
            // A warm spiral settles down with him: the world becomes enormous around the same little boy.
            for (let i = 0; i < 24 && spark < SPARKS; i++, spark++) {
              const up = 1 - (2 * (i + 0.5)) / 24;
              const ring = Math.sqrt(1 - up * up);
              const p = calm ? .5 : life, a = i * 2.39996 + (calm ? 0 : age * 1.25);
              const r = .4 + Math.sin(p * Math.PI) * 1.45;
              place.position.set(at.x + Math.cos(a) * ring * r, at.y + (1 - p) * (up + 1) * 1.4, (at.z ?? 0) + Math.sin(a) * ring * r);
              place.rotation.set(i, motion * 3, 0);
              place.scale.setScalar(fade * (calm ? .75 : 1.4 * (1 - life * .7)));
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            if (glow < GLOWS) {
              place.position.set(at.x, at.y, at.z ?? 0);
              place.rotation.set(0, 0, 0);
              place.scale.setScalar(fade * (calm ? 1 : .6 + Math.sin(life * Math.PI) * 1.5));
              place.updateMatrix();
              glows.setMatrixAt(glow++, place.matrix);
            }
            break;
          }
          case 'glow': {
            if (glow < GLOWS) {
              place.position.set(at.x, at.y, at.z ?? 0);
              place.rotation.set(0, 0, 0);
              place.scale.setScalar(fade * (0.55 + (calm ? 0 : 0.08 * Math.sin(age * 6))));
              place.updateMatrix();
              glows.setMatrixAt(glow++, place.matrix);
            }
            break;
          }
          case 'shavings': {
            if (carving && workpiece) {
              if (calm) break;
              for (const chip of carving.motion.shavings) {
                if (carving.at + chip.born < fx.at) continue;
                const woodAtBirth = fresh();
                play(woodAtBirth, ghostKeys!, carving.at + chip.born);
                cutPoint(chip.right, woodAtBirth, carving.face, 0, wristTarget);
                for (let i = 0; i < 3 && curl < CURLS; i++, curl++) {
                  const age = chip.age, seed = chip.id * 3 + i, life = age / CARVING_SHAVING_LIFETIME;
                  place.position.copy(wristTarget).addScaledVector(across, -(0.25 + i * .13) * age)
                    .addScaledVector(forward, (.25 + i * .09) * age);
                  place.position.y += (.35 + i * .12) * age - 2.6 * age * age;
                  place.rotation.set(seed + age * 7, seed * 1.7, age * 9);
                  place.scale.setScalar(.28 * fade * smooth(age / .04) * (1 - smooth((life - .55) / .45)));
                  place.updateMatrix(); curls.setMatrixAt(curl, place.matrix);
                }
              }
              break;
            }
            if (calm) break;
            // A curl leaves the knife with each stroke, and falls to the table.
            for (let i = 0; i < 9 && curl < CURLS; i++, curl++) {
              const each = (age * 1.6 + i / 9) % 1;
              const dir = i % 2 === 0 ? 1 : -1;
              place.position.set(at.x + dir * each * 0.7, at.y + 0.4 * Math.sin(each * Math.PI) - each * 0.55, (at.z ?? 0) + 0.25 + each * 0.4);
              place.rotation.set(each * 9 + i, i, each * 6);
              place.scale.setScalar(fade * (1 - each * 0.3));
              place.updateMatrix();
              curls.setMatrixAt(curl, place.matrix);
            }
            break;
          }
          case 'jay': {
            jayOn = true;
            const landing = calm ? 1 : smooth(age / 1.6), fly = 1 - landing;
            jay.position.set(at.x + fly * 2.8, at.y + fly * 1.8, (at.z ?? 0) + fly * .8);
            jay.scale.setScalar(1.6 * smooth(Math.min(1, age / .3, (fx.seconds - age) / .4)));
            jay.rotation.y = Math.PI / 2 * 0.6;
            jay.rotation.z = calm ? 0 : -.18 * fly + .045 * Math.sin(Math.max(0, age - 1.6) * 1.8);
            const wingBeat = calm ? 0 : Math.sin(age * 19) * .9 * fly;
            const near = jay.getObjectByName('wingNear'), far = jay.getObjectByName('wingFar');
            if (near) near.rotation.x = -wingBeat;
            if (far) far.rotation.x = wingBeat;
            const head = jay.getObjectByName('head');
            if (head) head.rotation.z = calm ? 0 : Math.sin(Math.max(0, age - 1.6) * 2) * .12;
            break;
          }
        }
      }
      for (const [mesh, used] of [[sparks, spark], [glows, glow], [curls, curl], [wisps, wind]] as const) {
        mesh.count = Math.max(1, used);
        mesh.instanceMatrix.needsUpdate = true;
        drawnWhile(mesh, used > 0);
      }
      if (!jayOn) jay.scale.setScalar(0);
      drawnWhile(jay, jayOn);

      // The ghost, where the scene stages it.
      let ghost: Directions['ghost'] = null;
      if (scene && workpiece) {
        const state = workpiece;
        const since = t - state.actAt;
        let tilt = 0, bounce = 0, blink = 1;
        switch (state.act) {
          case 'wake': {
            // Two astonished blinks, then a deliberate first lift from the tabletop.
            blink = calm ? 1 : 1 - .9 * Math.sin(Math.PI * smooth((since - .3) / .35)) ** 2
              - .9 * Math.sin(Math.PI * smooth((since - 1) / .4)) ** 2;
            bounce = calm ? 0 : Math.sin(Math.PI * smooth((since - 1.45) / .75)) * .18;
            tilt = calm ? .08 : -.12 * smooth(since / .8) + .2 * smooth((since - .8) / 1.1);
            break;
          }
          case 'tilt':
            tilt = 0.32 * smooth(since / 0.3);
            blink = since > 1.1 && since < 1.25 ? 0.1 : 1;
            break;
          case 'waddle':
          case 'run':
            tilt = calm ? 0 : Math.sin(since * (state.act === 'run' ? 18 : 11)) * 0.14;
            bounce = calm ? 0 : Math.abs(Math.sin(since * (state.act === 'run' ? 18 : 11))) * 0.08;
            break;
          case 'grab':
            tilt = calm ? .06 : -.24 * Math.sin(Math.min(1, since / 1.1) * Math.PI) + .06 * smooth((since - .9) / .45);
            break;
          case 'hop':
            bounce = calm ? 0 : Math.abs(Math.sin(since * 6)) * 0.3;
            break;
          case 'peek':
            tilt = (0.2 + (calm ? 0 : 0.08 * Math.sin(since * 3))) * (calm ? 1 : smooth(since / 0.3));
            break;
          case 'freeze':
            blink = 1;
            break;
          default:
            break;
        }
        // From one act to the next its lean changes over a moment, never in one frame.
        stagedTilt = calm ? tilt : stagedTilt + Math.max(-2 * dt, Math.min(2 * dt, tilt - stagedTilt));
        ghost = { x: state.x, y: state.y, z: state.z, face: state.face, tilt: stagedTilt, bounce, blink, rough: state.rough, look: state.act === 'look' ? state.aim : null, act: state.act, actT: since };
      }
      // The block of wood round the ghost, while there is any left.
      const rough = ghost?.rough ?? 0;
      block.scale.setScalar(rough > 0 ? .76 + rough * .24 : 0);
      drawnWhile(block, rough > 0);
      if (ghost && rough > 0) block.position.set(ghost.x, ghost.y + .54, ghost.z);

      const shot = scene?.stage?.shots ? shotAt(scene.stage.shots, t) : null;
      const elofKeys = scene?.stage?.elof;
      const elofNow = scene && elofKeys && elofKeys[0]!.at <= t ? elofAt(elofKeys, t) : null;
      // On a hand he stands on its palm, a little over the hand's middle.
      const carrier = elofNow?.rides ? rigs.get(elofNow.rides) : undefined;
      const onto = { x: 0, y: 0, z: 0 };
      if (carrier && elofNow!.rideWeight > 0) {
        carrier.hand(1, hand);
        // Open, level palms make a small platform. The left hand supports the side of the right,
        // rather than both wrists reaching through Elof at the same point.
        const weight = elofNow!.rideWeight;
        heldPoint.copy(hand);
        fingerDirection.set(-1, 0, 0);
        if (carrier.grasp) carrier.grasp(1, FLAT, heldPoint, fingerDirection, hand, weight);
        else { carrier.grip(1, heldPoint, forward.set(0, 0, 1), hand, weight); carrier.hold?.(1, FLAT, weight); }
        heldPoint.copy(hand).addScaledVector(up, -.08); heldPoint.x += .22;
        if (carrier.grasp) carrier.grasp(0, FLAT, heldPoint, fingerDirection, otherHand, weight);
        else { carrier.grip(0, heldPoint, forward.set(0, 0, 1), otherHand, weight); carrier.hold?.(0, FLAT, weight); }
        Object.assign(onto, { x: hand.x, y: hand.y + PALM_TOP * .35, z: hand.z });
      }
      return {
        shot: shot ? { ...shot.shot, blend: shot.blend } : null,
        bars: scene !== null && (scene.stage?.bars ?? scene.hold === true),
        ghost,
        elof: elofNow ? {
          lift: elofNow.lift, onto, ontoWeight: carrier ? elofNow.rideWeight : 0, act: elofNow.act, actT: t - elofNow.actAt,
          aim: elofNow.aim, face: elofNow.face, size: elofNow.size, life: t + waited,
        } : null,
      };
    },
  };
}
