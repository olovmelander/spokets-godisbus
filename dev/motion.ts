import {
  AmbientLight, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshLambertMaterial, PerspectiveCamera,
  PlaneGeometry, RepeatWrapping, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { morgonen } from '../src/content/aventyr2/chapters/morgonen';
import { prolog } from '../src/content/chapters/ends';
import { garden } from '../src/content/chapters/garden';
import { createGrandparent, type Figure, type Grandparent } from '../src/content/aventyr2/grandparents';
import { createAssets } from '../src/render/assets';
import { createPlayerMotion } from '../src/render/player-motion';
import { createModelRig, type Rig, type Role } from '../src/render/rig';
import type { PlayerState } from '../src/sim/types';
import { createStage } from '../src/render/stage';
import { FIRST_SLEEVE, gearOnAt, LOOK, type GearRole } from '../src/render/rain-gear';
import type { ActorKey } from '../src/sim/scene';

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
const elders = (['mormor', 'morfar'] as Grandparent[]).filter((who) => sceneName === 'grand' && (wanted.length === 0 || wanted.includes(who)));
const LANE = 9;
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
  // Up off a knee, as in Stormkvällen's getting ready, and into the raincoat and the boots, each in their own way.
  dress: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.25, move: 0.01, act: 'kneel' },
    { at: 0.6, act: 'stand' }, { at: DRESS_AT, act: 'dress' },
  ],
  // Following Elof, who walks, runs, stops and comes back.
  follow: (x) => [{ at: 0, x, y: 0, z: 0, face: 0, move: 0.01, act: 'stand', follow: 2.5 + x / LANE * 2.2 }],
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
const book = query.get('chapter') === 'morgonen' ? morgonen : prolog;
const chapter = story ? book : { ...garden, furniture, scenes: [{ id: 'lab', seconds: 600, stage: { actors } }] };
const stage = createStage(chapter, () => 0);
scene.add(stage.group);
// In a told scene only those asked for are seen: the others keep their places, out of the way of the look.
if (story) for (const [who, one] of stage.actors) if (wanted.length > 0 && !wanted.includes(who)) one.rig.group.scale.setScalar(1e-4);

const figures: { who: Grandparent; figure: Figure; group: Group }[] = elders.map((who, i) => {
  const figure = createGrandparent(who, null);
  figure.group.position.set(i * LANE + 6, 0, 0);
  scene.add(figure.group);
  return { who, figure, group: figure.group };
});

// ?scene=elof: Elof on his own model, as the game moves him (src/render/player-motion.ts): a walk, a run, and a stop.
let boy: { rig: Rig; motion: ReturnType<typeof createPlayerMotion>; x: number } | null = null;
const elofSpeed = (t: number) => t < 1 ? 0 : t < 5 ? 1.2 : t < 9 ? 3.5 : t < 9.6 ? 3.5 * (9.6 - t) / 0.6 : 0;
/** Where the camera looks, close on him: he is one EL tall. */

const camera = new PerspectiveCamera(28, 1, 0.5, 400);
/** ?track: the camera keeps the first of them in the middle, at `?zoom` EL across (a close look at one body). */
const track = query.has('track'), zoom = Number(query.get('zoom') ?? 9);
function frame(): void {
  const width = innerWidth, height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const count = Math.max(1, cast.length + figures.length);
  const followed = track ? boy ? boy.rig.group : cast[0] ? stage.actors.get(cast[0])?.rig.group : figures[0]?.figure.rig.group : undefined;
  const span = followed ? zoom : (count - 1) * LANE + (sceneName === 'walk' ? 16 : 4);
  const middle = followed ? followed.getWorldPosition(new Vector3()).x
    : (sceneName === 'walk' ? 8 : sceneName === 'grand' ? 6 : 0) + (count - 1) * LANE / 2;
  const view = query.get('view') === 'three';
  const distance = Math.max(followed ? 4 : 14, span * 0.5 / Math.tan(camera.fov * Math.PI / 360) / Math.max(0.6, camera.aspect) * 1.05);
  // Halfway up whoever is followed (Elof is one EL tall, the grown-ups five), or at `?at` EL.
  const high = query.has('at') ? Number(query.get('at')) : followed ? (boy ? 0.5 : 2.3) : 2.4;
  // `?yaw`: the camera's angle round them in degrees, 0 from the front, 90 from their left, 180 from behind.
  const yaw = query.has('yaw') ? Number(query.get('yaw')) * Math.PI / 180 : view ? Math.atan2(0.55, 0.84) : 0;
  const reach = view && !query.has('yaw') ? Math.hypot(0.55, 0.84) * distance : distance;
  camera.position.set(middle + Math.sin(yaw) * reach, high + 0.8, Math.cos(yaw) * reach);
  camera.lookAt(middle, high, 0);
  camera.updateProjectionMatrix();
}
addEventListener('resize', frame);
frame();
const draw = () => { if (track) frame(); renderer.render(scene, camera); };

const flags = new Set<string>(story ? told(book) : []);
let clock = 0;
function step(dt: number): void {
  clock += dt;
  const elof = { x: elofAt(clock), y: 0 };
  // Followers: the scene places them once, and from then on they walk along behind him.
  const following = sceneName === 'follow' && clock > 0.05;
  if (following) flags.add('scene:lab');
  stage.update(following ? null : { id: story ?? 'lab', seconds: clock }, flags, story ? { x: 10.9, y: 0 } : elof, clock, dt, false);
  // The raincoat and the boots going on with the motion, as the game's view dresses them.
  if (sceneName === 'dress') {
    for (const who of cast) {
      const on = gearOnAt(who, clock - DRESS_AT, query.has('calm'));
      stage.actors.get(who)?.rig.dress?.(on && (on.coat > 0 || on.boots[0] > 0 || on.boots[1] > 0)
        ? { ...LOOK[who], bootOff: null, on, first: FIRST_SLEEVE[who] } : null, true);
    }
  }
  // Elof comes up to each of them (they go down on a knee), calls them (the lantern, the ladder), and goes on.
  const near = Math.min(1, Math.max(0, (clock - 1) / 3)) - Math.min(1, Math.max(0, (clock - 10) / 3));
  for (const { figure, group } of figures) figure.update(clock > 6.5, clock, dt, group.position.x + 9 - 7 * near);
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
    loaded.push(who);
  }
  if (sceneName === 'elof' && files['elof.glb']) {
    const model = await assets.model('private', 'elof');
    model.rotation.y = Math.PI / 2;
    const rig = createModelRig(model, 1);
    scene.add(rig.group);
    boy = { rig, motion: createPlayerMotion(), x: 0 };
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
declare global { interface Window { __motion: unknown } }
window.__motion = {
  ready,
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
      const ahead = new Vector3(0, 0, 1).transformDirection(rig.group.matrixWorld);
      return [who, { bones, low, height: rig.height, legs: rig.legs, ahead: ahead.toArray() }];
    }));
  },
  /** Where each of the family's hands, mouth and group are: for a script to measure. */
  probe() {
    return Object.fromEntries([...[...stage.actors].map(([who, { rig }]) => [who, rig] as const), ...figures.map(({ who, figure }) => [who, figure.rig] as const)]
      .map(([who, rig]) => [who, { x: rig.group.position.x, y: rig.group.position.y, mouth: rig.mouth(probe).toArray(), height: rig.height, legs: rig.legs }]));
  },
};
