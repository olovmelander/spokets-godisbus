import {
  AmbientLight, CanvasTexture, Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshLambertMaterial, PerspectiveCamera,
  PlaneGeometry, RepeatWrapping, Scene, SRGBColorSpace, Vector3, WebGLRenderer,
} from 'three';
import { garden } from '../src/content/chapters/garden';
import { createGrandparent, type Figure, type Grandparent } from '../src/content/aventyr2/grandparents';
import { createAssets } from '../src/render/assets';
import type { Role } from '../src/render/rig';
import { createStage } from '../src/render/stage';
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
const cast = FAMILY.filter((who) => sceneName === 'grand' ? wanted.includes(who) : wanted.length === 0 || wanted.includes(who));
const elders = (['mormor', 'morfar'] as Grandparent[]).filter((who) => sceneName === 'grand' && (wanted.length === 0 || wanted.includes(who)));
const LANE = 9;

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
  gestures: (x) => [
    { at: 0, x, y: 0, z: 0, face: 0.2, move: 0.01, act: 'stand' },
    { at: 1, act: 'wave' }, { at: 3.4, act: 'nod' }, { at: 5, act: 'point', aim: { x: x + 8, y: 3, z: 2 } },
    { at: 7, act: 'cheer' }, { at: 9.4, act: 'shrug' }, { at: 11, act: 'startle' }, { at: 13, act: 'gasp' },
    { at: 15, act: 'hug' }, { at: 17.4, act: 'stand' },
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
const chapter = { ...garden, furniture: [], scenes: [{ id: 'lab', seconds: 600, stage: { actors } }] };
const stage = createStage(chapter, () => 0);
scene.add(stage.group);

const figures: { who: Grandparent; figure: Figure; group: Group }[] = elders.map((who, i) => {
  const figure = createGrandparent(who, null);
  figure.group.position.set(i * LANE + 6, 0, 0);
  scene.add(figure.group);
  return { who, figure, group: figure.group };
});

const camera = new PerspectiveCamera(28, 1, 0.5, 400);
/** ?track: the camera keeps the first of them in the middle, at `?zoom` EL across (a close look at one body). */
const track = query.has('track'), zoom = Number(query.get('zoom') ?? 9);
function frame(): void {
  const width = innerWidth, height = innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  const count = Math.max(1, cast.length + figures.length);
  const followed = track ? cast[0] ? stage.actors.get(cast[0])?.rig.group : figures[0]?.figure.rig.group : undefined;
  const span = followed ? zoom : (count - 1) * LANE + (sceneName === 'walk' ? 16 : 4);
  const middle = followed ? followed.getWorldPosition(new Vector3()).x
    : (sceneName === 'walk' ? 8 : sceneName === 'grand' ? 6 : 0) + (count - 1) * LANE / 2;
  const view = query.get('view') === 'three';
  const distance = Math.max(followed ? 4 : 14, span * 0.5 / Math.tan(camera.fov * Math.PI / 360) / Math.max(0.6, camera.aspect) * 1.05);
  const high = followed ? 2.3 : 2.4;
  camera.position.set(middle + (view ? distance * 0.55 : 0), high + 0.8, view ? distance * 0.84 : distance);
  camera.lookAt(middle, high, 0);
  camera.updateProjectionMatrix();
}
addEventListener('resize', frame);
frame();
const draw = () => { if (track) frame(); renderer.render(scene, camera); };

const flags = new Set<string>();
let clock = 0;
function step(dt: number): void {
  clock += dt;
  const elof = { x: elofAt(clock), y: 0 };
  // Followers: the scene places them once, and from then on they walk along behind him.
  const following = sceneName === 'follow' && clock > 0.05;
  if (following) flags.add('scene:lab');
  stage.update(following ? null : { id: 'lab', seconds: clock }, flags, elof, clock, dt, false);
  // Elof comes up to each of them (they go down on a knee), calls them (the lantern, the ladder), and goes on.
  const near = Math.min(1, Math.max(0, (clock - 1) / 3)) - Math.min(1, Math.max(0, (clock - 10) / 3));
  for (const { figure, group } of figures) figure.update(clock > 6.5, clock, dt, group.position.x + 9 - 7 * near);
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
    loaded.push(who);
  }
  for (const { who, figure } of figures) {
    if (!files[`${who}.glb`]) continue;
    figure.dress(await assets.model('private', who));
    loaded.push(who);
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
  /** Where each of the family's hands, mouth and group are: for a script to measure. */
  probe() {
    return Object.fromEntries([...[...stage.actors].map(([who, { rig }]) => [who, rig] as const), ...figures.map(({ who, figure }) => [who, figure.rig] as const)]
      .map(([who, rig]) => [who, { x: rig.group.position.x, y: rig.group.position.y, mouth: rig.mouth(probe).toArray(), height: rig.height, legs: rig.legs }]));
  },
};
