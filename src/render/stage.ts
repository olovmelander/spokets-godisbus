import {
  AdditiveBlending, BoxGeometry, CanvasTexture, CylinderGeometry, DoubleSide, DynamicDrawUsage, Group, InstancedMesh, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, Object3D, OctahedronGeometry, PlaneGeometry, SphereGeometry, SRGBColorSpace,
  Vector3,
} from 'three';
import type { ChapterData } from '../sim/types';
import { sceneWaits, type Act, type ActorKey, type ElofKey, type Point, type SceneDef, type SceneFrame, type ShotKey, type Thing } from '../sim/scene';
import { actPose, drawingAt, sippingAt, stanceOf, type Stance } from './acting';
import { carvingAt, CARVING_SHAVING_LIFETIME, type CarvingMotion, type CarvingPoint } from './carving-motion';
import { blendPose, createModelRig, createRehearsalRig, heightOf, STANDING, type Pose, type Rig, type Role } from './rig';
import { drawnWhile } from './idle';

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

/** Where an actor is and what it does, at one moment of the story. */
interface State {
  x: number; y: number; z: number;
  /** In turns: 0 along the course, 0.25 towards the camera. */
  face: number;
  act: Act;
  /** When the act began, and the act and stance before it, for the blend between them. */
  actAt: number;
  before: { act: Act; t: number; stance: Stance; aim: Point | null; mug: 0 | 1 | null; previous: State['before'] } | null;
  stance: Stance;
  aim: Point | null;
  glance: { from: Point; weight: number } | null;
  follow: number | null;
  holds: Thing | null;
  holdsLeft: Thing | null;
  rough: number;
  /** The walk under way, when a key moves the actor: from where, how far it has come, and how long it takes. */
  walk: { fromX: number; fromZ: number; toX: number; toZ: number; at: number; seconds: number } | null;
}

const fresh = (): State => ({
  x: 0, y: 0, z: 0, face: 0.25, act: 'stand', actAt: -99, before: null, stance: 'stand', aim: null, glance: null, follow: null,
  holds: null, holdsLeft: null, rough: 0, walk: null,
});
const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** The shortest way round between two facings, in turns. */
const mixTurn = (a: number, b: number, t: number) => {
  const d = ((((b - a) % 1) + 1.5) % 1) - 0.5;
  return a + d * t;
};
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
    state.walk = { fromX: state.x, fromZ: state.z, toX, toZ, at: key.at, seconds: move };
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
      mug: state.holds === 'mug' ? 1 : state.holdsLeft === 'mug' ? 0 : null, previous: age < .45 ? state.before : null };
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
  const shot = { x: first.x, y: first.y, height: first.height, width: first.width ?? 0, eye: first.eye ?? 0 };
  const blend = smooth((t - first.at) / (first.move ?? 1));
  for (let i = 1; i < keys.length; i++) {
    const key = keys[i]!;
    if (key.at > t) break;
    const next = keys[i + 1];
    const until = next && next.at <= t ? next.at : t;
    const p = smooth((until - key.at) / (key.move ?? 1));
    shot.x = mix(shot.x, key.x, p);
    shot.y = mix(shot.y, key.y, p);
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
    if (key.size !== undefined) out.size = key.size;
  }
  return out;
}

/** What the view does with a frame of the stage. */
export interface Directions {
  /** The camera's shot while a scene asks for one, and how much of it to take over the play camera. */
  shot: { x: number; y: number; height: number; width: number; eye: number; blend: number } | null;
  /** Thin bars above and below: a scene is telling. */
  bars: boolean;
  /** The ghost, staged by the scene: where it is, how it is turned and tilted, and its eyes. Null: as the simulation has it. */
  ghost: { x: number; y: number; z: number; face: number; tilt: number; bounce: number; blink: number; rough: number; look: Point | null; act: Act; actT: number } | null;
  /** Elof, in a held scene: lifted, acting, facing, and how big. */
  /** `onto`: where his feet are drawn in the place itself (on a hand), as much as `ontoWeight` says (0 to 1). */
  elof: {
    lift: Point; onto: Point; ontoWeight: number; act: Act | null; actT: number; aim: Point | null; face: number | null; size: number | null;
  } | null;
}

/** A thing the family holds: built small and plain, in the colours of what it is. */
function thing(kind: Thing, drawing: CanvasTexture): Mesh {
  switch (kind) {
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
      mug.add(heart);
      return mug;
    }
    case 'crayon': {
      const crayon = new Mesh(new CylinderGeometry(0.035, 0.035, 0.3, 6), new MeshStandardMaterial({ color: '#d9a13a', roughness: 0.6 }));
      const tip = new Object3D(); tip.name = 'drawing-crayon-tip'; tip.position.y = -.15; crayon.add(tip);
      return crayon;
    }
    case 'drawing': {
      const sheet = new Mesh(new PlaneGeometry(1.9, 1.5), new MeshBasicMaterial({ map: drawing, side: DoubleSide }));
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
  canvas.width = 256;
  canvas.height = 202;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#fbf6e8';
  c.fillRect(0, 0, 256, 202);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const crayon = (colour: string, width: number, path: () => void) => {
    c.strokeStyle = colour;
    c.lineWidth = width;
    c.beginPath();
    path();
    c.stroke();
  };
  const star = (x: number, y: number, r: number, fill: string) => {
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const k = i % 2 === 0 ? r : r * 0.45;
      c.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = '#a8741c';
    c.lineWidth = 3;
    c.stroke();
  };
  const sparkle = (x: number, y: number) => {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1.3, 0.2], [1.3, 0.2], [0, -1.4]]) crayon('#e8b830', 3, () => {
      c.moveTo(x + dx * 18, y + dy * 18);
      c.lineTo(x + dx * 26, y + dy * 26);
    });
  };
  /** A boy in a light blue shirt with a yellow fringe: tall or tiny. */
  const boy = (x: number, ground: number, tall: number) => {
    const head = tall * 0.22;
    crayon('#2f4b7c', Math.max(3, tall * 0.08), () => { c.moveTo(x - tall * 0.08, ground); c.lineTo(x, ground - tall * 0.42); c.lineTo(x + tall * 0.08, ground); });
    c.fillStyle = '#9db9e3';
    c.fillRect(x - tall * 0.13, ground - tall * 0.72, tall * 0.26, tall * 0.32);
    c.fillStyle = '#f2cba8';
    c.beginPath();
    c.arc(x, ground - tall * 0.72 - head, head, 0, Math.PI * 2);
    c.fill();
    crayon('#e8c64a', Math.max(3, tall * 0.07), () => { c.moveTo(x - head, ground - tall * 0.72 - head * 1.5); c.lineTo(x + head * 1.3, ground - tall * 0.72 - head * 2.1); });
  };
  const arrow = (x: number, y: number) => crayon('#6a5a4a', 4, () => { c.moveTo(x, y); c.lineTo(x + 46, y); c.moveTo(x + 34, y - 10); c.lineTo(x + 46, y); c.lineTo(x + 34, y + 10); });
  // Above: the star, then a tiny boy.
  star(54, 52, 30, '#f6dd6a');
  sparkle(54, 52);
  arrow(100, 52);
  boy(196, 84, 30);
  // Below: the golden sweet in its paper, glittering, then the boy as tall as he was.
  c.fillStyle = '#e2a92a';
  c.beginPath();
  c.ellipse(54, 150, 26, 20, 0, 0, Math.PI * 2);
  c.fill();
  crayon('#a8741c', 3, () => { c.ellipse(54, 150, 26, 20, 0, 0, Math.PI * 2); });
  crayon('#e2a92a', 6, () => { c.moveTo(28, 150); c.lineTo(12, 140); c.moveTo(28, 150); c.lineTo(12, 160); c.moveTo(80, 150); c.lineTo(96, 140); c.moveTo(80, 150); c.lineTo(96, 160); });
  sparkle(54, 150);
  arrow(104, 150);
  boy(200, 196, 92);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A kitchen table and chairs: plain stand-ins, never the family's own furniture (that is Olov's to model). */
function furniture(look: 'table' | 'chair' | 'stool'): Group {
  const group = new Group();
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
  head.position.set(0.24, 0.16, 0);
  const tail = new Mesh(new BoxGeometry(0.3, 0.06, 0.12), rust);
  tail.position.set(-0.32, -0.02, 0);
  bird.add(body, head, tail);
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
  const live = new Map<Role, { x: number; y: number; z: number; face: number; walked: number; pace: number; velocity: number; act: Act; elapsed: number }>();
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
  for (const piece of chapter.furniture ?? []) {
    const made = furniture(piece.look);
    made.position.set(piece.at.x, piece.at.y, piece.z);
    made.rotation.y = yaw(piece.face ?? 0.25);
    made.name = `furniture:${piece.look}`;
    group.add(made);
  }

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
  const jay = windowJay();
  jay.scale.setScalar(0);
  drawnWhile(jay, false);
  // Only a chapter whose scenes bring the jay to the window has it: no other one fetches the jay's model.
  const jayFlies = scenes.some((scene) => scene.stage?.fx?.some((fx) => fx.kind === 'jay'));
  if (jayFlies) group.add(jay);
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
  const hand = new Vector3();
  const pose: Pose = { ...STANDING };
  const before: Pose = { ...STANDING };
  const walking: Pose = { ...STANDING };
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

  return {
    group,
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
      group.add(rig.group);
      rigs.set(role, rig);
      return rig.group;
    },
    update(frame, flags, elof, clock, dt, calm) {
      const active = frame ? scenes.findIndex((scene) => scene.id === frame.id) : -1;
      const scene = active >= 0 ? scenes[active]! : null;
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
          starts.set(who, { ...state, x: now.x, y: now.y, z: now.z, face: now.face, walk: null,
            actAt: lastScene === null && now.act === state.act ? -now.elapsed : state.actAt });
        }
      }
      lastScene = scene?.id ?? null;
      const holding = new Set<Mesh>();
      for (const [who, rig] of rigs) {
        let state = resting.get(who);
        const keys = scene?.stage?.actors?.[who];
        if (scene && keys) {
          state = { ...(starts.get(who) ?? state ?? fresh()) };
          play(state, keys, t);
        }
        drawnWhile(rig.group, state !== undefined);
        if (!state) continue;
        const was = live.get(who);
        let x = state.x, y = state.y, z = state.z, face = state.face, pace = 0, velocity = 0, walked = was?.walked ?? 0;
        if (!scene && state.follow !== null && was) {
          // A follower accelerates, turns and eases into their place, without walking through a pause or restore.
          const want = elof.x - state.follow;
          if (dt <= 0) {
            ({ x, y, z, face, walked, pace, velocity } = was);
          } else if (Math.abs(want - was.x) > 14) {
            x = want; y = ground(x); face = state.face;
          } else {
            const gap = want - was.x;
            const speed = Math.sign(gap) * Math.min(2.6, Math.max(0, Math.abs(gap) - 0.25) * 4);
            velocity = was.velocity + (speed - was.velocity) * -Math.expm1(-9 * dt);
            const step = Math.sign(velocity) * Math.min(Math.abs(velocity * dt), Math.abs(gap));
            x = was.x + step; y = ground(x);
            pace = Math.min(1, Math.abs(step) / dt / 2.6);
            face = mixTurn(was.face, pace > 0.04 ? (step > 0 ? 0 : 0.5) : state.face, -Math.expm1(-7 * dt));
            walked += Math.abs(step);
          }
        } else if (state.walk) {
          const w = state.walk;
          const p = smooth((t - w.at) / w.seconds);
          pace = Math.min(1, Math.sin(Math.PI * Math.min(1, (t - w.at) / w.seconds)) * 1.6);
          walked = Math.hypot(w.toX - w.fromX, w.toZ - w.fromZ) * p;
          const travel = Math.atan2(w.toX - w.fromX, w.toZ - w.fromZ) / (Math.PI * 2);
          face = mixTurn(face, 0.25 - travel, Math.min(1, pace * 1.5));
        }
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
        const time = scene && keys ? t : clock;
        // Between scenes finish the current sip, then hold the cup down; pausing never advances this clock.
        const prior = was?.act === state.act ? was.elapsed : Math.max(0, -state.actAt);
        const elapsed = scene && keys ? Math.max(0, t - state.actAt)
          : prior + (state.act === 'sip' && sippingAt(prior, false, who).raise === 0 ? 0 : Math.max(0, dt));
        live.set(who, { x, y, z, face, walked, pace, velocity, act: state.act, elapsed });
        const since = (at: number) => (scene && keys ? Math.max(0, t - at) : elapsed);
        const context = { t: since(state.actAt), aim, stride: walked / (1.25 * rig.height / 5.2), pace, calm, role: who };
        actPose(state.act, context, pose, state.stance);
        if (state.glance) {
          // Blend the head angles, avoiding a whip through targets passing close behind the body.
          actPose(state.act, { ...context, aim: aimFor(state.glance.from) }, before, state.stance);
          pose.nod = mix(before.nod, pose.nod, state.glance.weight);
          pose.turn = mix(before.turn, pose.turn, state.glance.weight);
        }
        if (state.before && elapsed < 0.45) {
          const previous = (old: NonNullable<State['before']>, out: Pose): Pose => {
            actPose(old.act, { t: old.t, aim: aimFor(old.aim), stride: 0, pace: 0, calm, role: who }, out, old.stance);
            if (old.previous) blendPose(previous(old.previous, { ...STANDING }), out, smooth(old.t / .45), out, true);
            return out;
          };
          blendPose(previous(state.before, before), pose, smooth(elapsed / 0.45), pose, true);
        }
        if (pace > 0.01) {
          actPose('walk', { t: time, aim: null, stride: walked / (1.25 * rig.height / 5.2), pace: 1, calm, role: who }, walking);
          const weight = Math.min(1, pace);
          const acting = !['stand', 'watch', 'look', 'walk'].includes(state.act);
          // Walking supplies the legs; an offer, a drawing or a mug keeps its hands and torso in the act.
          for (const joint of ['legL', 'legR', 'kneeL', 'kneeR', 'bounce'] as const) pose[joint] += (walking[joint] - pose[joint]) * weight;
          if (!acting) {
            pose.lean += (walking.lean - pose.lean) * weight;
            if (!state.holdsLeft && state.holds !== 'drawing') {
              pose.armL += (walking.armL - pose.armL) * weight;
              pose.elbowL += (walking.elbowL - pose.elbowL) * weight;
            }
            if (!state.holds && state.holdsLeft !== 'drawing') {
              pose.armR += (walking.armR - pose.armR) * weight;
              pose.elbowR += (walking.elbowR - pose.elbowR) * weight;
            }
          }
          pose.seat = null;
        }
        rig.pose(pose);
        // Resolve authored interaction targets in 3D. Interrupted acts retain their contact share,
        // and unreachable targets stay at the real arm's limit rather than stretching the body.
        hand.set(0, 0, 0); otherHand.set(0, 0, 0);
        let rightWeight = 0, leftWeight = 0;
        const reach = (act: Act, age: number, target: Point | null, old: State['before'], share: number): void => {
          const k = old ? smooth(age / .45) : 1;
          if (old && k < 1) reach(old.act, old.t, old.aim, old.previous, share * (1 - k));
          if (!target || !TURNS_TO.includes(act)) return;
          const t = calm ? 3 : age, weight = share * k;
          heldPoint.set(target.x, target.y, target.z ?? 0);
          const right = weight * smooth(t / (act === 'lift' ? 1.1 : act === 'point' ? .3 : .5));
          hand.addScaledVector(heldPoint, right); rightWeight += right;
          if (act === 'reach' || act === 'lift') {
            const left = weight * smooth((t - .08) / (act === 'lift' ? 1.02 : .42));
            heldPoint.x += .3 * Math.cos(yaw(face)) / unit;
            heldPoint.y -= .1 / unit;
            heldPoint.z -= .3 * Math.sin(yaw(face)) / unit;
            otherHand.addScaledVector(heldPoint, left); leftWeight += left;
          }
        };
        reach(state.act, elapsed, state.aim, state.before, 1);
        if (rightWeight > 0) rig.reach(1, hand.divideScalar(rightWeight), rightWeight);
        if (leftWeight > 0) rig.reach(0, otherHand.divideScalar(leftWeight), leftWeight);
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
          fingerDirection.copy(forward).addScaledVector(up, -.25).normalize();
          rig.grip(1, wristTarget, fingerDirection, gripMark.position, weight);
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
            const weight = state.act === 'draw' ? 1 : 1 - smooth(elapsed / .45);
            paperContact.position.copy(sheet.position).addScaledVector(across, pen.across / unit).addScaledVector(forward, pen.ahead / unit);
            paperContact.position.y += .008 + pen.lift / unit;
            paperContact.userData.contact = pen.contact;
            paperSupport.position.copy(sheet.position).addScaledVector(across, .3).addScaledVector(forward, -.08);
            paperSupport.position.y += .045;
            fingerDirection.copy(forward).addScaledVector(up, -.15).normalize();
            rig.grip(0, paperSupport.position, fingerDirection, otherHand, weight);
            toolAxis.copy(up).addScaledVector(forward, -.45).normalize();
            heldPoint.copy(paperContact.position).addScaledVector(toolAxis, .15);
            rig.grip(1, heldPoint, fingerDirection, crayonGrip.position, weight);
          }
        }
        const showsDrawing = state.holds === 'drawing' || state.holdsLeft === 'drawing';
        const leavesShowing = state.before?.act === 'show' && elapsed < .45;
        if (sheet && (showsDrawing || leavesShowing)) {
          rig.mouth(heldPoint).addScaledVector(up, -.64 / unit).addScaledVector(forward, .45 / unit);
          rig.hand(1, hand); rig.hand(0, otherHand); hand.add(otherHand).multiplyScalar(.5).addScaledVector(up, .18);
          const arrival = calm || leavesShowing ? 1 : smooth(since(state.actAt) / .5);
          sheet.position.copy(hand).lerp(heldPoint, arrival);
          sheet.rotation.set(0, yaw(face), 0); sheet.scale.setScalar(.52);
          sheetLeft.position.copy(sheet.position).addScaledVector(across, .494).addScaledVector(up, -.18);
          sheetRight.position.copy(sheet.position).addScaledVector(across, -.494).addScaledVector(up, -.18);
          const weight = showsDrawing ? arrival : 1 - smooth(elapsed / .45);
          rig.grip(0, sheetLeft.position, up, otherHand, weight);
          rig.grip(1, sheetRight.position, up, hand, weight);
        }
        // What they hold: in the right hand, and in the left. Moa's drawing is held up in both.
        const releasingMug = state.before && elapsed < .45 ? state.before.mug : null;
        for (const [side, current] of [[1, state.holds], [0, state.holdsLeft]] as const) {
          const held = current ?? (side === releasingMug ? 'mug' : null);
          if (!held) continue;
          const mesh = things.get(held);
          if (!mesh) continue;
          if (current) holding.add(mesh);
          rig.hand(side, hand);
          if (held === 'drawing') continue;
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
            // Her hand wraps the side of the cup, rather than occupying its centre.
            hand.copy(heldPoint).addScaledVector(across, .18);
            rig.grip(side, hand, fingerDirection, mugGrip.position, current ? 1 : 1 - smooth(elapsed / .45));
            mesh.position.copy(mugGrip.position).addScaledVector(across, -.18);
          } else {
            if (held === 'knife' && state.act === 'carve' && workpiece?.act === 'carved') hand.copy(gripMark.position);
            if (held === 'crayon' && state.act === 'draw' && drawingContact) hand.copy(crayonGrip.position);
            mesh.position.copy(hand);
            if (held === 'knife' && state.act === 'carve' && workpiece?.act === 'carved') mesh.quaternion.setFromUnitVectors(up, knifeDirection);
            else if (held === 'crayon' && state.act === 'draw' && drawingContact) mesh.quaternion.setFromUnitVectors(up, toolAxis);
            else mesh.rotation.set(0, yaw(face), held === 'knife' || held === 'brush' || held === 'crayon' ? -0.6 : 0);
          }
        }
      }

      for (const mesh of things.values()) drawnWhile(mesh, holding.has(mesh));

      // The scene's glitter, shavings, glows and the bird at the window.
      let spark = 0, glow = 0, curl = 0;
      let jayOn = false;
      for (const fx of scene?.stage?.fx ?? []) {
        const age = t - fx.at;
        if (age < 0 || age > fx.seconds) continue;
        const life = age / fx.seconds;
        const fade = Math.min(1, age / 0.25, (fx.seconds - age) / 0.35);
        const at = fx.from;
        switch (fx.kind) {
          case 'sparkle': {
            for (let i = 0; i < 16 && spark < SPARKS; i++, spark++) {
              const a = i * 2.39996 + age * (1.4 + (i % 4) * 0.4);
              const r = 0.35 + 0.25 * Math.sin(age * 3 + i);
              const up = ((i / 16) + age * 0.35) % 1;
              place.position.set(at.x + Math.cos(a) * r, at.y + up * 1.4 - 0.2, (at.z ?? 0) + Math.sin(a) * r);
              place.rotation.set(age * 3 + i, age * 2 + i, 0);
              place.scale.setScalar(fade * (0.5 + 0.5 * Math.sin(age * 9 + i)) * (1 - up * 0.6));
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            break;
          }
          case 'stream': {
            const to = fx.to ?? at;
            for (let i = 0; i < 14 && spark < SPARKS; i++, spark++) {
              const k = ((i / 14) + age * 0.9) % 1;
              const arc = Math.sin(k * Math.PI) * 0.5;
              place.position.set(mix(at.x, to.x, k), mix(at.y, to.y, k) + arc, mix(at.z ?? 0, to.z ?? 0, k) + Math.sin(i * 1.7 + age * 4) * 0.08);
              place.rotation.set(age * 4 + i, i, 0);
              place.scale.setScalar(fade * 0.8);
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            break;
          }
          case 'poff': {
            // A burst outwards from him, and a soft flash that grows and fades.
            for (let i = 0; i < 24 && spark < SPARKS; i++, spark++) {
              const up = 1 - (2 * (i + 0.5)) / 24;
              const ring = Math.sqrt(1 - up * up);
              const a = i * 2.39996;
              const r = 0.3 + life * 2.4;
              place.position.set(at.x + Math.cos(a) * ring * r, at.y + up * r, (at.z ?? 0) + Math.sin(a) * ring * r);
              place.rotation.set(i, age * 5, 0);
              place.scale.setScalar(Math.max(0, 1.4 * (1 - life)));
              place.updateMatrix();
              sparks.setMatrixAt(spark, place.matrix);
            }
            if (glow < GLOWS) {
              place.position.set(at.x, at.y, at.z ?? 0);
              place.rotation.set(0, 0, 0);
              place.scale.setScalar((0.4 + life * 4) * Math.max(0, 1 - life));
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
            jay.position.set(at.x, at.y + (1 - smooth(age / 0.6)) * 1.5, at.z ?? 0);
            jay.scale.setScalar(1.6 * smooth(Math.min(1, age / 0.3, (fx.seconds - age) / 0.3)));
            jay.rotation.y = Math.PI / 2 * 0.6;
            break;
          }
        }
      }
      for (const [mesh, used] of [[sparks, spark], [glows, glow], [curls, curl]] as const) {
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
            // Its first blink, a wobble, and a little hop of surprise.
            blink = since > 0.5 && since < 0.68 ? 0.1 : 1;
            bounce = since > 0.7 && since < 1.05 ? Math.sin(((since - 0.7) / 0.35) * Math.PI) * 0.18 : 0;
            tilt = calm ? 0 : Math.sin(since * 9) * 0.08 * Math.max(0, 1 - since / 0.6);
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
            tilt = -0.18 * Math.sin(Math.min(1, since / 0.5) * Math.PI);
            break;
          case 'hop':
            bounce = calm ? 0 : Math.abs(Math.sin(since * 6)) * 0.3;
            break;
          case 'peek':
            tilt = 0.2 + (calm ? 0 : 0.08 * Math.sin(since * 3));
            break;
          case 'freeze':
            blink = 1;
            break;
          default:
            break;
        }
        ghost = { x: state.x, y: state.y, z: state.z, face: state.face, tilt, bounce, blink, rough: state.rough, look: state.act === 'look' ? state.aim : null, act: state.act, actT: since };
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
        Object.assign(onto, { x: hand.x, y: hand.y + PALM_TOP, z: hand.z });
      }
      return {
        shot: shot ? { ...shot.shot, blend: shot.blend } : null,
        bars: scene !== null && (scene.stage?.bars ?? scene.hold === true),
        ghost,
        elof: elofNow ? {
          lift: elofNow.lift, onto, ontoWeight: carrier ? elofNow.rideWeight : 0, act: elofNow.act, actT: t - elofNow.actAt,
          aim: elofNow.aim, face: elofNow.face, size: elofNow.size,
        } : null,
      };
    },
  };
}
