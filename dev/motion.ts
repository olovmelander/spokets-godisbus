import {
  AmbientLight, BoxGeometry, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshLambertMaterial, PerspectiveCamera,
  PlaneGeometry, Quaternion, RepeatWrapping, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { morgonen } from '../src/content/aventyr2/chapters/morgonen';
import { billsta } from '../src/content/aventyr2/chapters/billsta';
import { stormkvall } from '../src/content/aventyr2/chapters/stormkvall';
import { stormoga } from '../src/content/aventyr2/chapters/stormoga';
import { prolog } from '../src/content/chapters/ends';
import { garden } from '../src/content/chapters/garden';
import { createGrandparent, type Figure, type Grandparent } from '../src/content/aventyr2/grandparents';
import { createAssets } from '../src/render/assets';
import { createPlayerMotion, createTurning } from '../src/render/player-motion';
import { createModelRig, STANDING, type Rig, type Role } from '../src/render/rig';
import { coatPose, elofRainGear, PUT_ON, TAKE_OFF } from '../src/render/elof-coat';
import type { PlayerState, Speaker } from '../src/sim/types';
import { createStage, litLamp } from '../src/render/stage';
import { lookAt } from '../src/render/look';
import { createTalker, talk, type Look, type Talker } from '../src/render/talk';
import { sv } from '../src/content/sv';
// Äventyr 2's lines, for the talk scene's words (TALK).
import '../src/content/aventyr2/aventyr2';
import { FIRST_SLEEVE, gearOnAt, heldInOther, LOOK, type GearRole } from '../src/render/rain-gear';
import type { ActorKey } from '../src/sim/scene';
import { JUMP_SPEED } from '../src/sim/constants';
import { COURSE, createCourse } from './elof-course';

/**
 * Rörelser: the family, mormor and morfar moving as the game moves them (dev/motion.html). Each scene is a short script of
 * the stage's own keys, played by the stage itself (src/render/stage.ts) on the private models where the pack has them.
 * `window.__motion.at(seconds)` replays it from the start to that moment, frame by frame, for stills.
 */
const query = new URLSearchParams(location.search);
const sceneName = query.get('scene') ?? 'walk';
const FAMILY: Role[] = ['pappa', 'mamma', 'moa', 'bertil'];
const wanted = (query.get('who') ?? '').split(',').filter(Boolean);
const cast = FAMILY.filter((who) => sceneName === 'grand' || sceneName === 'elof' ? wanted.includes(who) : wanted.length === 0 || wanted.includes(who));
const elders = (['mormor', 'morfar'] as Grandparent[])
  .filter((who) => sceneName === 'grand' ? wanted.length === 0 || wanted.includes(who) : sceneName === 'talk' && wanted.includes(who));
/** How far apart they stand: in a row across the lab, or close together, talking. */
const LANE = sceneName === 'talk' ? 2.6 : 9;
/**
 * ?scene=talk: the family stand together and speak in turn (Mormor and Morfar too, with &who=…,mormor,morfar), and Elof in
 * front of them; each line is held for reading `?read` seconds (3.2), as the game holds a line: the scene's clock waits while
 * the bodies go on living, look at whoever speaks, and the one speaking says it (src/render/talk.ts, face.ts).
 */
const TALK: readonly { at: number; who: Speaker; line: string }[] = [
  { at: 1, who: 'mamma', line: 'skPower' }, { at: 1.6, who: 'pappa', line: 'skLamp' }, { at: 2.2, who: 'bertil', line: 'skShip' },
  { at: 2.8, who: 'moa', line: 'skWindow' }, { at: 3.4, who: 'elof', line: 'skWind' }, { at: 4, who: 'mormor', line: 'biLantern' },
  { at: 4.6, who: 'morfar', line: 'biLadderLay' },
];
const READ = Number(query.get('read') ?? 3.2);
/** In ?scene=talk, Elof in front of them, on his own model where the pack has it, and his part in the talk. */
let listener: { rig: Rig; talker: Talker; look: Look; at: Vector3 } | null = null;
/** When the dress scene's act begins: its gear goes on from then, as the game's does (src/render/rain-gear.ts). */
const DRESS_AT = 1.8;

/** Each scene's keys for one of the family, who starts at `x`. */
const SCRIPTS: Record<string, (x: number) => ActorKey[]> = {
  // An easy walk across, a brisk one, a turn to the camera, and back the other way.
  walk: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0, move: 0.01, act: 'stand' },
    { at: 1, x: x + 8, move: 4 },
    { at: 6, x: x + 16, move: 2.4 },
    { at: 9.2, face: 0.25 },
    { at: 10.4, x, move: 6 },
  ],
  // Down on a knee and up, a crouch, a chair, standing again.
  acts: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.2, move: 0.01, act: 'stand' },
    { at: 1, act: 'kneel' }, { at: 3.6, act: 'stand' },
    { at: 5, act: 'crouch' }, { at: 7.2, act: 'stand' },
    { at: 8.6, act: 'sit' }, { at: 11.4, act: 'stand' },
  ],
  // At a kitchen chair, sideways on to the camera: up, a few steps away and back, round, and down again.
  chair: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0, move: 0.01, act: 'sit' },
    { at: 1.5, act: 'stand' },
    { at: 2.4, x: x + 2, move: 1.4 },
    { at: 4.4, x, move: 1.6 },
    { at: 6.2, face: 0 },
    { at: 7.2, act: 'sit' },
    { at: 9.5, act: 'stand' },
  ],
  gestures: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.2, move: 0.01, act: 'stand' },
    { at: 1, act: 'wave' }, { at: 3.4, act: 'nod' }, { at: 5, act: 'point', aim: { x: x + 8, y: 3, z: 2 } },
    { at: 7, act: 'cheer' }, { at: 9.4, act: 'shrug' }, { at: 11, act: 'startle' }, { at: 13, act: 'gasp' },
    { at: 15, act: 'hug' }, { at: 17.4, act: 'stand' },
  ],
  // What else the arms do: a lamp shone ahead, a reach down low, a lift, something offered, shown, a sip, the hands.
  more: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.2, move: 0.01, act: 'stand' },
    { at: 1, act: 'shine', aim: { x: x + 6, y: 2, z: 1 } }, { at: 3.4, act: 'reach', aim: { x: x + 1.6, y: 0.4, z: 0.6 } },
    { at: 5.8, act: 'lift', aim: { x: x + 1.2, y: 3.2, z: 0.4 } }, { at: 8, act: 'offer', aim: { x: x + 1.6, y: 2.6, z: 0.6 } },
    { at: 10, act: 'show' }, { at: 12, act: 'sip' }, { at: 14, act: 'hands' }, { at: 16, act: 'stand' },
  ],
  // Up off a knee, as in Stormkvällen's getting ready, and into the raincoat and the boots, each in their own way.
  dress: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.25, move: 0.01, act: 'kneel' },
    { at: 0.6, act: 'stand' }, { at: DRESS_AT, act: 'dress' },
  ],
  // Standing, as each of them stands, towards the camera: and a few steps, to stop and stand again.
  stand: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.25, move: 0.01, act: 'stand' },
    { at: 24, x: x + 3, move: 2.4 },
    { at: 27, face: 0.25 },
  ],
  // Turning on the spot, facing the camera: a little, a quarter to the right, a half turn, back round; turning to point, and
  // a few steps away, to stop and turn back.
  turn: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.25, move: 0.01, act: 'stand' },
    { at: 1.5, face: 0.3 }, { at: 3.5, face: 0.55 }, { at: 6, face: 0.05 }, { at: 9, face: 0.25 },
    { at: 11.5, act: 'point', aim: { x: x - 6, y: 3, z: 3 } }, { at: 14.5, act: 'stand' },
    { at: 15.5, x: x + 3, move: 2 }, { at: 18.5, face: 0.25 },
  ],
  // Following Elof, who walks, runs, stops and comes back.
  follow: (x) => [{ at: 0, x, y: 0, z: 0, face: 0, move: 0.01, act: 'stand', follow: 2.5 + x / LANE * 2.2 }],
  // Standing together, towards the camera and a little towards each other, as they talk (TALK).
  talk: (x) => [{ at: 0, x, y: 0, z: 0, face: 0.25 + (x / LANE - 1.5) * -0.03, move: 0.01, act: 'stand' }],
};
/** Where Elof is, in the follow scene: he walks, runs, stops and comes back. */
const elofAt = (t: number) => t < 1 ? 0 : t < 5 ? (t - 1) * 1.6 : t < 9 ? 6.4 + (t - 5) * 3.5 : t < 11 ? 20.4 : 20.4 - (t - 11) * 1.4;

const renderer = new WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputColorSpace = SRGBColorSpace;
document.body.append(renderer.domElement);
const scene = new Scene();
scene.background = new Color('#d9d4c7');
scene.add(new HemisphereLight('#f4efe2', '#6d6452', 1.6), new AmbientLight('#ffffff', 0.35));
const sun = new DirectionalLight('#fff6e8', 2.4);
sun.position.set(-6, 14, 12);
scene.add(sun);

// A ground marked every EL, so that a foot that slides shows against it.
const marks = document.createElement('canvas');
marks.width = marks.height = 64;
const pen = marks.getContext('2d')!;
pen.fillStyle = '#b8b09c'; pen.fillRect(0, 0, 64, 64);
pen.fillStyle = '#8f8775'; pen.fillRect(0, 0, 3, 64); pen.fillRect(0, 0, 64, 2);
const lines = new CanvasTexture(marks);
lines.wrapS = lines.wrapT = RepeatWrapping;
lines.repeat.set(120, 40);
lines.colorSpace = SRGBColorSpace;
const floor = new Mesh(new PlaneGeometry(120, 40), new MeshLambertMaterial({ map: lines }));
floor.rotation.x = -Math.PI / 2;
floor.position.set(30, 0, -10);
scene.add(floor);

const actors: Partial<Record<Role, ActorKey[]>> = {};
cast.forEach((who, i) => { actors[who] = (SCRIPTS[sceneName] ?? SCRIPTS.walk!)(i * LANE); });
// ?face=0: which way they face at first (0 along the course, side on to the camera; 0.25 towards it).
if (query.has('face')) for (const keys of Object.values(actors)) keys[0]!.face = Number(query.get('face'));
// The chair stands behind where they sit, as the kitchen's do in the prologue (src/content/chapters/ends.ts).
const furniture = sceneName === 'chair' ? cast.map((_, i) => ({ look: 'chair' as const, at: { x: i * LANE - 0.3, y: 0 }, z: 0, face: 0 })) : [];
// ?story=vaknar: one of the prologue's own scenes (or Morgonen's, &chapter=morgonen), in its kitchen, with the scenes
// before it told.
const story = query.get('story');
const told = (book: typeof prolog) => book.scenes!.slice(0, book.scenes!.findIndex((one) => one.id === story)).map((one) => one.by?.done ?? `scene:${one.id}`);
const BOOKS = { prolog, morgonen, stormkvall, billsta, stormoga } as const;
const book = BOOKS[(query.get('chapter') ?? 'prolog') as keyof typeof BOOKS] ?? prolog;
// ?run&chapter=stormkvall: every staged scene of the chapter in turn, each for its length and a second more, each told
// when it is over, as the game tells them: for a script to measure the whole chapter's motion (window.__motion.where).
const run = query.has('run') ? book.scenes!.filter((one) => one.stage?.actors) : null;
const chapter = story || run ? book : { ...garden, furniture, scenes: [{ id: 'lab', seconds: 600, stage: { actors } }] };
const stage = createStage(chapter, () => 0);
/**
 * Each boot's sole at its heel and at its toe, as drawn (window.__motion.joints): two points of the sole picked once, as the
 * model was bound (the lowest of the boot, its back and its front), so that a script can follow the one it stands on.
 */
const soleCorners = new WeakMap<object, { mesh: Mesh & { getVertexPosition(i: number, v: Vector3): Vector3 }; heel: number; toe: number }[]>();
function solesOf(rig: Rig): Record<string, number[][]> {
  let found = soleCorners.get(rig);
  if (!found) {
    found = [];
    rig.group.traverse((node) => {
      const mesh = node as Mesh & { isSkinnedMesh?: boolean; skeleton?: { bones: { name: string }[] }; getVertexPosition(i: number, v: Vector3): Vector3 };
      if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
      const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight'), at = mesh.geometry.getAttribute('position');
      for (const name of ['foot_l', 'foot_r']) {
        const bone = mesh.skeleton.bones.findIndex((b) => b.name === name);
        if (bone < 0) continue;
        const own: number[] = [];
        for (let i = 0; i < index.count; i++) if (index.getX(i) === bone && weight.getX(i) > 0.99) own.push(i);
        if (own.length < 4) continue;
        const low = Math.min(...own.map((i) => at.getY(i))), high = Math.max(...own.map((i) => at.getY(i)));
        const sole = own.filter((i) => at.getY(i) < low + 0.02 * (high - low) + 1e-4);
        const z = (i: number) => at.getZ(i);
        const heel = sole.reduce((a, b) => (z(b) < z(a) ? b : a)), toe = sole.reduce((a, b) => (z(b) > z(a) ? b : a));
        found!.push({ mesh, heel, toe });
      }
    });
    soleCorners.set(rig, found);
  }
  rig.group.updateMatrixWorld(true);
  const out: Record<string, number[][]> = {};
  found.forEach(({ mesh, heel, toe }, i) => {
    const point = (k: number) => mesh.getVertexPosition(k, new Vector3()).applyMatrix4(mesh.matrixWorld).toArray().map((v) => Math.round(v * 1e5) / 1e5);
    out[i === 0 ? 'foot_l' : 'foot_r'] = [point(heel), point(toe)];
  });
  return out;
}
/** The last pose each body was given (window.__motion.poses): for a script to measure each joint frame by frame. */
const posed = new Map<string, Record<string, unknown>>();
const watchPose = (who: string, rig: Rig) => {
  const original = rig.pose.bind(rig);
  rig.pose = (pose) => { posed.set(who, { ...pose }); original(pose); };
};
scene.add(stage.group);
// In a told scene only those asked for are seen: the others keep their places, out of the way of the look.
if (story) for (const [who, one] of stage.actors) if (wanted.length > 0 && !wanted.includes(who)) one.rig.group.scale.setScalar(1e-4);

const figures: { who: Grandparent; figure: Figure; group: Group }[] = elders.map((who, i) => {
  const figure = createGrandparent(who, null);
  figure.group.position.set(sceneName === 'talk' ? (cast.length + i) * LANE : i * LANE + 6, 0, sceneName === 'talk' ? 1.9 : 0);
  scene.add(figure.group);
  return { who, figure, group: figure.group };
});

// ?scene=elof: Elof on his own model, as the game moves him (src/render/player-motion.ts): a walk, a run, and a stop.
let boy: { rig: Rig; motion: ReturnType<typeof createPlayerMotion>; x: number } | null = null;
/**
 * ?scene=elofcoat: Elof on his own model in the doll's raincoat (made in Blender where the pack has it), putting it on as in
 * Stormkvällen's `regnrock`, or with &off taking it off as in Stormens öga's `rockav`: his arms as ./elof-coat.ts keys them,
 * the coat going on and off as the game's view has it, by the scene's seconds.
 */
let coated: Rig | null = null;
/**
 * ?scene=elofplay: Elof on his own model, moved by the game's own simulation through a course of jumps, hops, landings,
 * turns about, stops, a clamber, falls and a hose (dev/elof-course.ts), and turned, stretched and squashed as the game's
 * view does it (src/render/view.ts). `window.__motion.elof()` gives his bones, soles and state each frame.
 */
let played: {
  rig: Rig; outer: Group; motion: ReturnType<typeof createPlayerMotion>; course: ReturnType<typeof createCourse>;
  turn: number; turning: ReturnType<typeof createTurning>; squash: number; airStretch: number; fallingSpeed: number; stretch: number;
} | null = null;
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const clampTo = (n: number, low: number, high: number) => Math.min(high, Math.max(low, n));
const STORM = { id: 'stormkvall', storm: { rain: 1 } } as Parameters<typeof elofRainGear>[0];
const elofSpeed = (t: number) => t < 1 ? 0 : t < 5 ? 1.2 : t < 9 ? 3.5 : t < 9.6 ? 3.5 * (9.6 - t) / 0.6 : 0;
/** Where the camera looks, close on him: he is one EL tall. */

const camera = new PerspectiveCamera(28, 1, 0.5, 400);
/**
 * ?track: the camera keeps the first of them in the middle, at `?zoom` EL across (a close look at one body); `&follow=moa`
 * keeps that one instead (in ?scene=talk, `elof`, `mormor` or `morfar` too).
 */
const track = query.has('track'), zoom = Number(query.get('zoom') ?? 9), follow = query.get('follow');
function frame(): void {
  const width = innerWidth, height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const count = Math.max(1, cast.length + figures.length);
  const chosen = follow === 'elof' ? listener?.rig.group : follow ? stage.actors.get(follow as Role)?.rig.group ?? figures.find((one) => one.who === follow)?.figure.rig.group : undefined;
  const followed = !track ? undefined : chosen ?? (played ? played.outer : boy ? boy.rig.group : coated ? coated.group : cast[0] ? stage.actors.get(cast[0])?.rig.group : figures[0]?.figure.rig.group);
  const span = followed ? zoom : (count - 1) * LANE + (sceneName === 'walk' ? 16 : 4);
  const middle = followed ? followed.getWorldPosition(new Vector3()).x
    : (sceneName === 'walk' ? 8 : sceneName === 'grand' ? 6 : 0) + (count - 1) * LANE / 2;
  const view = query.get('view') === 'three';
  const distance = Math.max(followed ? 4 : 14, span * 0.5 / Math.tan(camera.fov * Math.PI / 360) / Math.max(0.6, camera.aspect) * 1.05);
  // Halfway up whoever is followed (Elof is one EL tall, the grown-ups five), or at `?at` EL.
  const high = query.has('at') ? Number(query.get('at')) : followed ? (boy || coated || played ? 0.5 : 2.3) : 2.4;
  // `?yaw`: the camera's angle round them in degrees, 0 from the front, 90 from their left, 180 from behind.
  const yaw = query.has('yaw') ? Number(query.get('yaw')) * Math.PI / 180 : view ? Math.atan2(0.55, 0.84) : 0;
  const reach = view && !query.has('yaw') ? Math.hypot(0.55, 0.84) * distance : distance;
  // `?bone=hand_r`: close on one of the followed body's bones (a hand, to see it hold).
  const bone = query.get('bone') ? followed?.getObjectByName(query.get('bone')!) : undefined;
  if (bone) {
    const at = bone.getWorldPosition(new Vector3()), near = zoom * 0.5 / Math.tan(camera.fov * Math.PI / 360);
    camera.position.set(at.x + Math.sin(yaw) * near, at.y + Number(query.get('rise') ?? 0.3) * near, at.z + Math.cos(yaw) * near);
    camera.lookAt(at);
  } else {
    camera.position.set(middle + Math.sin(yaw) * reach, high + 0.8, Math.cos(yaw) * reach);
    camera.lookAt(middle, high, 0);
  }
  camera.updateProjectionMatrix();
}
addEventListener('resize', frame);
frame();
const draw = () => { if (track) frame(); renderer.render(scene, camera); };

const flags = new Set<string>(story ? told(book) : []);
const lamp = litLamp();
let clock = 0, running = 0, runFrom = 0;
/** ?scene=talk: the scene's own clock, which waits while a line is read; the line being read, and for how long. */
let talkT = 0, line = 0, readFor = -1;
const talking = TALK.filter((one) => cast.includes(one.who as Role) || elders.includes(one.who as Grandparent) || one.who === 'elof');
function step(dt: number): void {
  clock += dt;
  const elof = { x: elofAt(clock), y: 0 };
  if (sceneName === 'talk') {
    if (readFor < 0) {
      talkT += dt;
      if (line < talking.length && talkT >= talking[line]!.at) readFor = 0;
    } else if ((readFor += dt) > READ) { readFor = -1; line++; }
    const now = readFor >= 0 ? talking[line]! : null;
    talk.hear(now ? { who: now.who, text: (sv.lines as Record<string, string>)[now.line] ?? '', seconds: readFor, reading: true } : null, dt);
    if (listener) {
      const { rig, talker, look, at } = listener;
      const other = talk.lookAt('elof'), there = other ? talk.face(other) : null;
      if (there) rig.mouth(at);
      talker.update(talk, there ? lookAt(rig.group, at, there, look) : null, dt, query.has('calm'));
      const pose = { ...STANDING };
      talker.pose(pose);
      rig.pose(pose);
      rig.face?.(talker.mouth.open, talker.mouth.round, talker.lids);
      rig.mouth(at);
      talk.place('elof', at.x, at.y, at.z);
    } else talk.place('elof', (cast.length + elders.length - 1) * LANE / 2, 0.9, 3.4);
    stage.update({ id: 'lab', seconds: talkT }, flags, elof, clock, dt, query.has('calm'));
    for (const { figure, group } of figures) figure.update(false, clock, dt, group.position.x + 30);
    return;
  }
  // Followers: the scene places them once, and from then on they walk along behind him.
  const following = sceneName === 'follow' && clock > 0.05;
  if (following) flags.add('scene:lab');
  if (run) {
    // On to the next staged scene when this one is over, telling it as the game does.
    while (running < run.length && clock - runFrom > (run[running]!.seconds ?? 6) + 1) {
      flags.add(run[running]!.by?.done ?? `scene:${run[running]!.id}`);
      runFrom = clock; running++;
    }
    const now = run[Math.min(running, run.length - 1)]!;
    stage.update(running < run.length ? { id: now.id, seconds: clock - runFrom } : null, flags, { x: 10.9, y: 0 }, clock, dt, false);
  } else stage.update(following ? null : { id: story ?? 'lab', seconds: clock }, flags, story ? { x: 10.9, y: 0 } : elof, clock, dt, false);
  // The raincoat and the boots going on with the motion, as the game's view dresses them.
  if (sceneName === 'dress') {
    for (const who of cast) {
      const on = gearOnAt(who, clock - DRESS_AT, query.has('calm'));
      stage.actors.get(who)?.rig.dress?.(on && (on.coat > 0 || on.boots[0] > 0 || on.boots[1] > 0)
        ? { ...LOOK[who], bootOff: null, on, first: FIRST_SLEEVE[who] } : null, true);
    }
    // Pappa's flashlight, in the hand that holds it as the game's view has it (src/render/view.ts).
    const pappa = stage.actors.get('pappa');
    if (pappa && cast.includes('pappa')) {
      if (!lamp.parent) scene.add(lamp);
      const side = heldInOther(chapter, 'pappa', { id: 'lab', seconds: clock }, query.has('calm')) ? 1 : 0;
      pappa.rig.group.updateMatrixWorld(true);
      pappa.rig.hand(side, lamp.position);
      lamp.rotation.set(0, pappa.rig.group.rotation.y, 0);
    }
  }
  // Elof comes up to each of them (they go down on a knee), calls them (the lantern, the ladder), and goes on.
  const near = Math.min(1, Math.max(0, (clock - 1) / 3)) - Math.min(1, Math.max(0, (clock - 10) / 3));
  for (const { figure, group } of figures) figure.update(clock > 6.5, clock, dt, group.position.x + 9 - 7 * near);
  if (coated) {
    const id = query.has('off') ? TAKE_OFF.scene : PUT_ON.scene;
    coated.dress?.(elofRainGear(STORM, new Set(), { id, seconds: clock }, query.has('calm')), true);
    coated.pose(coatPose(id, clock, { ...STANDING }));
  }
  if (played) {
    const p = played, { course, rig, outer } = p;
    if (!course.done) course.step(dt);
    const curr = course.sim.curr;
    rig.pose(p.motion.update(curr, curr.x, dt, null, 0, false, 0, 1, rig.legs));
    // As the game's view turns, stretches and squashes him (src/render/view.ts).
    const onHose = curr.mode === 'climb' || curr.mode === 'slide';
    const facingAngle = onHose ? Math.PI / 2 : curr.facing > 0 ? -0.35 : Math.PI + 0.35;
    p.turn = query.has('oldturn') ? p.turn + Math.atan2(Math.sin(facingAngle - p.turn), Math.cos(facingAngle - p.turn)) * ease(14, dt)
      : p.turning.update(facingAngle, dt);
    const elastic = curr.mode === 'free';
    if (dt > 0) {
      if (!elastic) { p.squash = 1; p.fallingSpeed = 0; }
      else if (curr.grounded) {
        if (p.fallingSpeed > 0) p.squash = 1 - .025 - .04 * clampTo(p.fallingSpeed / JUMP_SPEED, 0, 1);
        p.fallingSpeed = 0;
      } else p.fallingSpeed = Math.max(p.fallingSpeed, -curr.vy);
      p.squash += (1 - p.squash) * ease(12, dt);
    }
    p.airStretch = !elastic || curr.grounded ? p.squash : p.airStretch + (1 + clampTo(curr.vy * 0.012, -0.05, 0.1) - p.airStretch) * ease(30, dt);
    p.stretch = !elastic ? 1 : curr.grounded ? p.squash : p.airStretch;
    outer.position.set(curr.x, curr.y, 0);
    outer.rotation.set(0, p.turn, 0, 'ZYX');
    outer.scale.set(1 / Math.sqrt(p.stretch), p.stretch, 1 / Math.sqrt(p.stretch));
  }
  if (boy) {
    const speed = elofSpeed(clock);
    boy.x += speed * dt;
    const player = { mode: 'free', grounded: true, vx: speed, vy: 0, x: boy.x, y: 0, facing: 1, atEdge: false, t: 0 } as unknown as PlayerState;
    const legs = boy.rig.legs;
    boy.rig.group.position.x = boy.x;
    boy.rig.pose(boy.motion.update(player, boy.x, dt, null, 0, false, 0, 1, query.has('oldlegs') ? undefined : legs));
  }
}
/** From the start to `to` seconds, at the game's own frame rate, so that a still is that moment as it is in play. */
function replay(to: number): void {
  while (clock + 1 / 120 < to) step(1 / 60);
  draw();
}

const info = document.getElementById('info')!;
const load = async () => {
  if (query.has('standin')) return 'stand-ins';
  const assets = createAssets(renderer);
  const manifest = await assets.manifest();
  const files = manifest.packs.private?.files ?? {};
  const loaded: string[] = [];
  for (const who of cast) {
    if (!files[`${who}.glb`]) continue;
    stage.replace(who, await assets.model('private', who));
    watchPose(who, stage.actors.get(who)!.rig);
    // Their raincoat and boots made in Blender, where the pack has them.
    if (sceneName === 'dress' && files[`${who}-wardrobe.glb`]) stage.actors.get(who)!.rig.wear?.(await assets.model('private', `${who}-wardrobe`));
    loaded.push(who);
    // ?coat: the storm's raincoat and boots on, made in Blender where the pack has them (?shells: built from the body).
    const rig = stage.actors.get(who)?.rig;
    if (!query.has('coat') || !rig?.dress || !(who in LOOK)) continue;
    if (!query.has('shells') && rig.wear && files[`${who}-wardrobe.glb`]) rig.wear(await assets.model('private', `${who}-wardrobe`));
    rig.dress({ ...LOOK[who as GearRole], bootOff: null });
  }
  for (const { who, figure } of figures) {
    if (!files[`${who}.glb`]) continue;
    figure.dress(await assets.model('private', who));
    watchPose(who, figure.rig);
    loaded.push(who);
  }
  if (sceneName === 'elofcoat' && files['elof.glb']) {
    const model = await assets.model('private', 'elof');
    model.rotation.y = Math.PI / 2;
    coated = createModelRig(model, 1);
    coated.group.rotation.y = -Math.PI / 2 + Number(query.get('turn') ?? 0);
    if (files['elof-wardrobe.glb']) { coated.wear?.(await assets.model('private', 'elof-wardrobe')); loaded.push('elof-wardrobe'); }
    scene.add(coated.group);
    loaded.push('elof');
  }
  if (sceneName === 'elofplay' && files['elof.glb']) {
    const model = await assets.model('private', 'elof');
    model.rotation.y = Math.PI / 2;
    const rig = createModelRig(model, 1), outer = new Group();
    outer.add(rig.group);
    scene.add(outer);
    // The course's walls and ledges, drawn as blocks.
    const ground = COURSE.ground;
    for (let i = 1; i < ground.length - 2; i++) {
      const a = ground[i]!, b = ground[i + 1]!;
      if (a.y > 0.01 && b.y > 0.01 && a.x !== b.x) {
        const block = new Mesh(new BoxGeometry(b.x - a.x, a.y, 3), new MeshLambertMaterial({ color: '#a39a86' }));
        block.position.set((a.x + b.x) / 2, a.y / 2, -0.6);
        scene.add(block);
      }
    }
    played = { rig, outer, motion: createPlayerMotion(), course: createCourse(), turn: -0.35, turning: createTurning(-0.35), squash: 1, airStretch: 1, fallingSpeed: 0, stretch: 1 };
    watchPose('elof', rig);
    loaded.push('elof');
  }
  if (sceneName === 'elof' && files['elof.glb']) {
    const model = await assets.model('private', 'elof');
    model.rotation.y = Math.PI / 2;
    const rig = createModelRig(model, 1);
    scene.add(rig.group);
    boy = { rig, motion: createPlayerMotion(), x: 0 };
    watchPose('elof', rig);
    loaded.push('elof');
  }
  if (sceneName === 'talk' && files['elof.glb'] && !query.has('noelof')) {
    // In front of them at their left, as big as he is among them as a boy, turned to them and to the camera.
    const model = await assets.model('private', 'elof');
    const rig = createModelRig(model, 1);
    rig.group.scale.setScalar(3);
    rig.group.position.set(-2.2, 0, 1.6);
    rig.group.rotation.y = 0.85;
    scene.add(rig.group);
    listener = { rig, talker: createTalker('elof', 3), look: { turn: 0, nod: 0 }, at: new Vector3() };
    watchPose('elof', rig);
    loaded.push('elof');
  }
  return loaded.length ? `models: ${loaded.join(', ')}` : 'stand-ins (no private pack)';
};
const ready = load().then((what) => {
  info.textContent = `${sceneName} · ${what}`;
  const held = Number(query.get('t'));
  if (Number.isFinite(held) && query.has('t')) { replay(held); return; }
  let last = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    draw();
  });
});

const probe = new Vector3();
/** Elof's bones that a script follows (window.__motion.elof), and those whose turn in the world it is given too. */
const ELOF_BONES = ['pelvis', 'spine_01', 'spine_02', 'spine_03', 'neck_01', 'Head', 'clavicle_l', 'clavicle_r', 'upperarm_l', 'upperarm_r',
  'upperarm_twist_01_l', 'upperarm_twist_01_r', 'lowerarm_l', 'lowerarm_r', 'lowerarm_twist_01_l', 'lowerarm_twist_01_r', 'hand_l', 'hand_r',
  'thigh_l', 'thigh_r', 'thigh_correctiveRoot_l', 'thigh_correctiveRoot_r', 'calf_l', 'calf_r', 'foot_l', 'foot_r', 'ball_l', 'ball_r'];
const ELOF_WORLD = ['pelvis', 'spine_03', 'Head', 'hand_l', 'hand_r', 'foot_l', 'foot_r'];
declare global { interface Window { __motion: unknown } }
window.__motion = {
  ready,
  /** The lab's scene, for a script that measures how the bodies' skins bend. */
  scene,
  /** Plays on from where it is by `seconds`, at 60 frames a second, and draws. */
  play(seconds: number) { const to = clock + seconds; while (clock + 1 / 120 < to) step(1 / 60); draw(); return clock; },
  replay,
  /** Elof's ankles, and the lowest point of each boot with its vertex (skinned as drawn): for a script to measure his feet. */
  feet() {
    if (!boy) return null;
    const at = (name: string) => boy!.rig.group.getObjectByName(name)?.getWorldPosition(new Vector3()).toArray();
    boy.rig.group.updateMatrixWorld(true);
    const soles: [number, number, number][] = [];
    boy.rig.group.traverse((node) => {
      const mesh = node as Mesh & { isSkinnedMesh?: boolean; skeleton?: { bones: { name: string }[] }; getVertexPosition(i: number, v: Vector3): Vector3 };
      if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
      const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
      for (const [side, name] of [[0, 'foot_l'], [1, 'foot_r']] as const) {
        const bone = mesh.skeleton.bones.findIndex((b) => b.name === name);
        let best: [number, number, number] = [Infinity, Infinity, -1];
        for (let i = 0; i < index.count; i++) {
          if (index.getX(i) !== bone || weight.getX(i) < 0.99) continue;
          const v = mesh.getVertexPosition(i, new Vector3()).applyMatrix4(mesh.matrixWorld);
          if (v.y < best[1]) best = [v.x, v.y, i];
        }
        soles[side] = best;
      }
    });
    return { ankles: [at('foot_l'), at('foot_r')], soles, x: boy.x };
  },
  /** Each skinned mesh in the lab, and how many of its corners ../src/render/sleeves.ts gave to the arms. */
  skins() {
    const out: { name: string; corners: number; sleeves: unknown; joints: unknown; shoulders: unknown; skirt: unknown }[] = [];
    scene.traverse((node) => {
      const mesh = node as Mesh & { isSkinnedMesh?: boolean };
      if (!mesh.isSkinnedMesh) return;
      const data = mesh.geometry.userData;
      out.push({ name: mesh.name, corners: mesh.geometry.getAttribute('position').count, sleeves: data.sleevesWithArms, joints: data.halfJoints, shoulders: data.softShoulders, skirt: data.skirtsOverThighs });
    });
    return out;
  },
  /** The last pose each body was given, by who. */
  poses() { return Object.fromEntries(posed); },
  /** Which staged scene a run is in, and how far into it. */
  where() { return run ? { scene: run[Math.min(running, run.length - 1)]?.id ?? '', t: clock - runFrom, done: running >= run.length } : { scene: story ?? sceneName, t: clock, done: false }; },
  /** Plays on by `seconds` at 60 frames a second without drawing: for a script that measures every frame. */
  advance(seconds: number) { const to = clock + seconds; while (clock + 1 / 120 < to) step(1 / 60); return clock; },
  /**
   * Each body's bones in the world, and the lowest skinned point of each knee (its calf's vertices) and each foot, as drawn:
   * for a script to measure a knee in the floor, a planted foot that slides or a joint that jumps.
   */
  joints() {
    const rigs = [...[...stage.actors].map(([who, { rig }]) => [who, rig] as const), ...figures.map(({ who, figure }) => [who, figure.rig] as const)];
    return Object.fromEntries(rigs.map(([who, rig]) => {
      rig.group.updateMatrixWorld(true);
      const bones: Record<string, number[]> = {};
      const low: Record<string, number[]> = {};
      rig.group.traverse((node) => {
        if ((node as { isBone?: boolean }).isBone) bones[node.name] = node.getWorldPosition(new Vector3()).toArray();
        const mesh = node as Mesh & { isSkinnedMesh?: boolean; skeleton?: { bones: { name: string }[] }; getVertexPosition(i: number, v: Vector3): Vector3 };
        if (!mesh.isSkinnedMesh || !mesh.skeleton || !mesh.visible) return;
        const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
        const v = new Vector3();
        for (const name of ['calf_l', 'calf_r', 'foot_l', 'foot_r', 'thigh_l', 'thigh_r']) {
          const bone = mesh.skeleton.bones.findIndex((b) => b.name === name);
          if (bone < 0) continue;
          for (let i = 0; i < index.count; i++) {
            if (index.getX(i) !== bone || weight.getX(i) < 0.5) continue;
            mesh.getVertexPosition(i, v).applyMatrix4(mesh.matrixWorld);
            if (!low[name] || v.y < low[name]![1]!) low[name] = v.toArray();
          }
        }
      });
      const ahead = new Vector3(0, 0, 1).transformDirection(rig.group.matrixWorld), root = rig.group.getWorldPosition(new Vector3());
      return [who, { bones, low, height: rig.height, legs: rig.legs, ahead: ahead.toArray(), root: root.toArray(), soles: solesOf(rig) }];
    }));
  },
  /**
   * Elof on the course (?scene=elofplay), as drawn now: where he is in the game and what he does, the part of the course,
   * his pose, each named bone's own turn (its local quaternion) and place in the world, the world turn of his hips, head,
   * hands and feet, his soles' heels and toes, the group's turn and stretch.
   */
  elof() {
    if (!played) return null;
    const { rig, outer, course } = played, curr = course.sim.curr;
    outer.updateMatrixWorld(true);
    const local: Record<string, number[]> = {}, world: Record<string, number[]> = {}, at: Record<string, number[]> = {};
    const q = new Quaternion(), round = (v: number) => Math.round(v * 1e6) / 1e6;
    rig.group.traverse((node) => {
      if (!(node as { isBone?: boolean }).isBone || !ELOF_BONES.includes(node.name)) return;
      local[node.name] = node.quaternion.toArray().map(round);
      if (ELOF_WORLD.includes(node.name)) world[node.name] = node.getWorldQuaternion(q).toArray().map(round);
      at[node.name] = node.getWorldPosition(new Vector3()).toArray().map(round);
    });
    return {
      part: course.part, t: course.t, done: course.done,
      state: { x: curr.x, y: curr.y, vx: curr.vx, vy: curr.vy, mode: curr.mode, grounded: curr.grounded, facing: curr.facing, atEdge: curr.atEdge, t: curr.t },
      pose: posed.get('elof'), local, world, at, soles: solesOf(rig), turn: played.turn, stretch: played.stretch,
    };
  },
  /** Where each of the family's hands, mouth and group are: for a script to measure. */
  probe() {
    return Object.fromEntries([...[...stage.actors].map(([who, { rig }]) => [who, rig] as const), ...figures.map(({ who, figure }) => [who, figure.rig] as const)]
      .map(([who, rig]) => [who, { x: rig.group.position.x, y: rig.group.position.y, mouth: rig.mouth(probe).toArray(), height: rig.height, legs: rig.legs }]));
  },
};
