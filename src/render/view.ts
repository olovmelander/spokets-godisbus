import {
  AdditiveBlending, BoxGeometry, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  DynamicDrawUsage, ExtrudeGeometry, Fog, Group, HalfFloatType, HemisphereLight, InstancedMesh, LatheGeometry, Mesh,
  MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, NeutralToneMapping, Object3D, OctahedronGeometry, PerspectiveCamera, Quaternion,
  Scene, Shape, SphereGeometry, TorusGeometry, UnsignedByteType, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { createAssets } from './assets';
import { GARDEN_MORNING, createGradePass } from './grade';
import { chooseTier, pixelRatioFor, type Tier } from './quality';
import { cameraIntent } from '../sim/camera-intent';
import { RUN_SPEED } from '../sim/constants';
import type { ChapterData, PlayerState } from '../sim/types';

/** A long lens from the side flattens depth the way a macro lens does (plan §5.2). */
const FOV = 30;
/** The ground sits about 35% up from the bottom, so thumbs never cover Elof (plan §5.2). */
const GROUND_FROM_BOTTOM = 0.35;

export interface ViewInfo {
  tier: Tier;
  drawCalls: number;
  triangles: number;
  programs: number;
  pixelRatio: number;
  width: number;
  height: number;
  /** Models loaded from the packs, as "pack/name". */
  models: string[];
  /** How many of their textures arrived as KTX2 and stayed compressed on the GPU. */
  compressedTextures: number;
  /** The "role" custom properties set in Blender, read back from the models. */
  roles: string[];
}

/** What the picture is drawn from: two simulation states and what has been reached and collected. */
export interface Frame {
  prev: PlayerState;
  curr: PlayerState;
  /** How far between the two states this frame lies, from 0 to 1. */
  alpha: number;
  /** The time since the last frame, in seconds. 0 while the game is paused. */
  dt: number;
  atGoal: boolean;
  /** Which trail candies are in the bag. */
  collected: readonly boolean[];
  /** The last big candy reached, or -1. */
  checkpoint: number;
}

export interface View {
  resize(): void;
  render(frame: Frame): void;
  info(): ViewInfo;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** How much of the way to go this frame, for a smoothing that doesn't depend on the frame rate. */
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);

/**
 * Stage 0a's greybox scene: the test course, a stand-in Elof in his colours, and the big candy.
 * `asked` is the tier from ?tier=, or null for Auto.
 */
export function createView(canvas: HTMLCanvasElement, chapter: ChapterData, asked: Tier | null = null): View {
  // The context is made here, so that the tier can be chosen before the renderer exists: Mid and High need
  // float colour buffers, and a device without them gets Low (plan §6.5).
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: true, stencil: false, powerPreference: 'high-performance',
  });
  // main.ts catches this and shows the message.
  if (!gl) throw new Error('WebGL 2 is not available');
  const tier = chooseTier(asked, gl.getExtension('EXT_color_buffer_float') !== null);

  const renderer = new WebGLRenderer({
    canvas,
    context: gl,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
    outputBufferType: tier === 'low' ? UnsignedByteType : HalfFloatType,
  });
  // Neutral keeps the colours that were set: a red house stays red (plan §6.5 names AgX or Neutral).
  renderer.toneMapping = NeutralToneMapping;
  // One frame is several render calls on Mid and High (the scene, the grade, the output), so the counters
  // are reset once per frame here, not by each call.
  renderer.info.autoReset = false;
  // Mid and High: the scene goes to the HDR buffer, one pass grades it, and the renderer tone-maps the result.
  if (tier !== 'low') renderer.setEffects([createGradePass(GARDEN_MORNING)]);
  // Let the browser restore a lost context instead of leaving a dead canvas.
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

  const scene = new Scene();
  const sky = new Color('#c4dcea');
  scene.background = sky;
  scene.fog = new Fog(sky, 14, 44);
  // Lights are created once and never toggled: every change would compile a new shader (plan §6.2).
  scene.add(new HemisphereLight('#e2efff', '#6a5338', 1.25));
  const sun = new DirectionalLight('#ffe1ae', 2.4);
  sun.position.set(-6, 5, 8);
  scene.add(sun);

  // The big candies: one at each checkpoint, a little behind the path so that he passes in front of it,
  // and the one at the end.
  const endX = chapter.goalX + 0.6;
  const bigCandies = [
    ...(chapter.checkpoints ?? []).map((at) => ({ x: at.x, y: at.y, z: -0.7 })),
    { x: endX, y: heightOfGroundAt(chapter, endX), z: 0 },
  ].map((at) => {
    const place = buildCandy();
    place.position.set(at.x, at.y, at.z);
    scene.add(place);
    return { place, sweet: place.getObjectByName('candy')!, reached: false, pop: 0 };
  });
  const trail = buildTrail(chapter);
  const glitter = buildGlitter();
  const lace = buildLace();
  scene.add(buildGround(chapter), buildTrunks(chapter), buildClimbs(chapter), buildHooks(chapter), lace.mesh, trail.mesh, glitter.group);

  // The big candy modelled in Blender takes the place of the one built in code, once it has arrived.
  // It is the first asset through the whole chain: Blender → glTF → KTX2 and meshopt → the page.
  const models: string[] = [];
  const roles: string[] = [];
  let compressedTextures = 0;
  const assets = createAssets(renderer);
  assets
    .model('boot', 'big-candy')
    .then((model) => {
      for (const [i, big] of bigCandies.entries()) {
        const copy = i === 0 ? model : model.clone();
        big.place.clear();
        big.place.add(copy);
        big.sweet = copy.getObjectByName('candy') ?? copy;
      }
      models.push('boot/big-candy');
      model.traverse((node) => {
        if (typeof node.userData.role === 'string') roles.push(node.userData.role);
        const map = ((node as Mesh).material as MeshStandardMaterial | undefined)?.map;
        if (map && (map as { isCompressedTexture?: boolean }).isCompressedTexture) compressedTextures++;
      });
    })
    .catch((error) => console.error('The big candy could not be loaded; the stand-in stays.', error));

  // The ghost, modelled in Blender after Pappa's carving. Its files are not in the public repository, so it
  // stands on the course only where its private pack exists (HANDOVER.md). The manifest says whether it does.
  const GHOST_X = 6.5;
  let ghost: Group | null = null;
  let ghostFoot: Object3D | null = null;
  let ghostTurn = -Math.PI / 2;
  let clock = 0;
  assets
    .manifest()
    .then((manifest) => (manifest.packs.private?.files['ghost.glb'] ? assets.model('private', 'ghost') : null))
    .then((model) => {
      if (!model) return;
      model.position.set(GHOST_X, heightOfGroundAt(chapter, GHOST_X), 0);
      scene.add(model);
      ghost = model;
      // GLTFLoader drops the dot from Blender's names: foot.L arrives as footL.
      ghostFoot = model.getObjectByName('footL') ?? null;
      models.push('private/ghost');
    })
    .catch((error) => console.error('The ghost could not be loaded.', error));

  // Elof, modelled in Blender after his sheets and photos. He too is only here where the private pack is;
  // everywhere else the stand-in built in code plays his part.
  let doll: Doll | null = null;
  assets
    .manifest()
    .then((manifest) => (manifest.packs.private?.files['elof.glb'] ? assets.model('private', 'elof') : null))
    .then((model) => {
      if (!model) return;
      // Exported from Blender he faces +z, and the stand-in faces +x. A quarter turn makes them agree.
      model.rotation.y = Math.PI / 2;
      elof.group.clear();
      elof.group.add(model);
      // A skinned Elof has bones, which keep the turn they rest in; the older one has loose parts that rest unturned.
      const part = (name: string, forward: 1 | -1): Joint | null => {
        const node = model.getObjectByName(name);
        if (!node) return null;
        const bone = (node as { isBone?: boolean }).isBone === true;
        return { node, rest: bone ? node.quaternion.clone() : null, forward: bone ? forward : 1, angle: 0 };
      };
      doll = {
        spine: part('spine_01', 1),
        head: part('Head', 1) ?? part('head', 1),
        thighs: [part('thigh_l', -1), part('thigh_r', -1)],
        calves: [part('calf_l', -1), part('calf_r', -1)],
        upperArms: [part('upperarm_l', -1), part('upperarm_r', -1)],
        lowerArms: [part('lowerarm_l', -1), part('lowerarm_r', -1)],
      };
      models.push('private/elof');
    })
    .catch((error) => console.error('Elof could not be loaded; the stand-in stays.', error));
  const elof = buildElof();
  scene.add(elof.group);

  const shadow = new Mesh(
    new CircleGeometry(0.27, 24),
    new MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = 1;
  scene.add(shadow);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 140);
  let viewHeight = 5;
  let distance = 10;
  let pixelRatio = 1;
  const look = cameraIntent({ ...startState(chapter) });
  let stride = 0;
  let turn = 0;
  let squash = 1;
  let wasGrounded = true;

  function resize(): void {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    pixelRatio = pixelRatioFor(tier, width, height, window.devicePixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Elof is about 78 px tall on a phone held sideways, and the view is never narrower than 6 EL.
    const elofPx = clamp(height * 0.2, 75, 140);
    viewHeight = Math.max(height / elofPx, 6 / camera.aspect);
    distance = viewHeight / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.updateProjectionMatrix();
  }
  resize();

  function render({ prev, curr, alpha, dt, atGoal, collected, checkpoint }: Frame): void {
    const x = lerp(prev.x, curr.x, alpha);
    const y = lerp(prev.y, curr.y, alpha);
    clock += dt;
    trail.update(collected, x, y, dt, clock);
    glitter.update(curr.bubble, x, y, clock);
    // He hangs by his hands, his body along the lace.
    const hang = curr.hook ? Math.atan2(curr.hook.x - x, curr.hook.y - (y + 0.5)) : 0;
    lace.update(curr.hook, x - Math.sin(hang) * 0.4, y + 0.5 + Math.cos(hang) * 0.4);

    // The simulation says where to look; the view only smooths it.
    const want = cameraIntent(curr);
    look.x += (want.x - look.x) * ease(3, dt);
    look.y += (want.y - look.y) * ease(2.5, dt);
    const centreY = look.y + viewHeight * (0.5 - GROUND_FROM_BOTTOM);
    camera.position.set(look.x, centreY, distance);
    camera.lookAt(look.x, centreY, 0);

    // The stand-in Elof: turned a little towards the camera, legs swinging with the distance he covers.
    // On a hose he turns his back to the camera, as a climber does.
    const onHose = curr.mode === 'climb' || curr.mode === 'slide';
    const facingAngle = onHose ? Math.PI / 2 : curr.facing > 0 ? -0.35 : Math.PI + 0.35;
    turn += (facingAngle - turn) * ease(14, dt);
    if (curr.grounded) stride += Math.abs(curr.vx) * dt * 5.5;
    const swing = curr.grounded ? Math.sin(stride) * 0.75 * Math.min(1, Math.abs(curr.vx) / RUN_SPEED + 0.25) : 0.5;
    const moving = Math.abs(curr.vx) > 0.05 || (!curr.grounded && curr.bubble === 0);
    elof.legLeft.rotation.z = moving ? swing : 0;
    elof.legRight.rotation.z = moving ? -swing : 0;
    if (doll) poseDoll(doll, curr, stride, dt);
    if (curr.grounded && !wasGrounded) squash = 0.82; // a soft landing
    wasGrounded = curr.grounded;
    squash += (1 - squash) * ease(12, dt);
    const stretch = curr.grounded ? squash : 1 + clamp(curr.vy * 0.012, -0.05, 0.1);
    // The tilt turns about his middle, where the lace's pull goes through.
    elof.group.position.set(x - Math.sin(hang) * 0.5, y + 0.5 - Math.cos(hang) * 0.5, 0);
    elof.group.rotation.set(0, turn, -hang, 'ZYX');
    elof.group.scale.set(1 / Math.sqrt(stretch), stretch, 1 / Math.sqrt(stretch));
    elof.body.rotation.z = -clamp(curr.vx / RUN_SPEED, -1, 1) * 0.12 * curr.facing;

    const height = Math.max(0, y - curr.groundY);
    shadow.position.set(x, curr.groundY + 0.012, 0);
    shadow.scale.setScalar(clamp(1 - height * 0.25, 0.35, 1));

    // A big candy turns slowly until it is reached. Then it gives a little jump, and turns fast.
    for (const [i, big] of bigCandies.entries()) {
      const last = i === bigCandies.length - 1;
      const reached = last ? atGoal : i <= checkpoint;
      if (reached && !big.reached) big.pop = 1;
      big.reached = reached;
      big.pop = Math.max(0, big.pop - dt * 2.2);
      big.sweet.rotateY(dt * (reached ? (last ? 7 : 3.4) : 1.2));
      big.place.scale.setScalar(1 + 0.3 * Math.sin(Math.PI * big.pop));
    }

    // The ghost is a wooden toy come alive: it never bends. It turns towards Elof, sways, and taps a foot.
    if (ghost) {
      // Exported from Blender it faces +z, the camera. A quarter turn faces it along the course.
      const towardsElof = x < ghost.position.x ? -Math.PI / 2 + 0.5 : Math.PI / 2 - 0.5;
      ghostTurn += (towardsElof - ghostTurn) * ease(6, dt);
      ghost.rotation.set(0, ghostTurn, Math.sin(clock * 1.7) * 0.035);
      if (ghostFoot) ghostFoot.rotation.x = -Math.max(0, Math.sin(clock * 9)) * (Math.sin(clock * 0.9) > 0.2 ? 0.45 : 0);
    }
    renderer.info.reset();
    renderer.render(scene, camera);
  }

  return {
    resize,
    render,
    info: () => ({
      tier,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs?.length ?? 0,
      pixelRatio,
      width: canvas.width,
      height: canvas.height,
      models,
      compressedTextures,
      roles,
    }),
  };
}

/** The joints of the Elof made in Blender. They are named after the animation library's skeleton (plan §5.6). */
interface Doll {
  spine: Joint | null;
  head: Joint | null;
  thighs: (Joint | null)[];
  calves: (Joint | null)[];
  upperArms: (Joint | null)[];
  lowerArms: (Joint | null)[];
}

/**
 * One joint and how far it is bent. A bone turns round its own x axis from the turn it rests in, and `forward`
 * says which way that axis swings it; a loose part has no rest and turns round the model's x axis.
 */
interface Joint {
  node: Object3D;
  rest: Quaternion | null;
  forward: 1 | -1;
  angle: number;
}

const X_AXIS = new Vector3(1, 0, 0);
const turn = new Quaternion();

/**
 * Poses the doll in code until the library's clips drive it: a walk and a run that follow the distance he
 * covers, and a jump. He faces +z in his own space, so a joint swings forward with a negative turn round x.
 */
function poseDoll(doll: Doll, player: PlayerState, stride: number, dt: number): void {
  const quick = ease(18, dt);
  const bend = (joint: Joint | null, angle: number) => {
    if (!joint) return;
    joint.angle += (angle - joint.angle) * quick;
    if (joint.rest) joint.node.quaternion.copy(joint.rest).multiply(turn.setFromAxisAngle(X_AXIS, joint.angle * joint.forward));
    else joint.node.rotation.x = joint.angle;
  };
  const speed = clamp(Math.abs(player.vx) / RUN_SPEED, 0, 1);
  if (!player.grounded) {
    // In the air: one knee up, the other leg trailing, arms thrown forward.
    bend(doll.thighs[0]!, -0.75);
    bend(doll.thighs[1]!, 0.3);
    bend(doll.calves[0]!, 0.9);
    bend(doll.calves[1]!, 0.5);
    bend(doll.upperArms[0]!, -0.9);
    bend(doll.upperArms[1]!, -1.3);
    bend(doll.lowerArms[0]!, -0.5);
    bend(doll.lowerArms[1]!, -0.3);
    bend(doll.spine, 0.06);
    return;
  }
  const reach = speed > 0.01 ? 0.22 + 0.62 * speed : 0;
  for (const [index, side] of [[0, 1], [1, -1]] as const) {
    const swing = Math.sin(stride) * side;
    bend(doll.thighs[index]!, -swing * reach);
    // The knee bends while the leg comes forward from behind.
    bend(doll.calves[index]!, Math.max(0, Math.cos(stride) * side) * reach * 1.25);
    bend(doll.upperArms[index]!, swing * reach * 0.9);
    bend(doll.lowerArms[index]!, speed > 0.01 ? -(0.25 + 0.6 * speed) : -0.06);
  }
  bend(doll.spine, 0.14 * speed);
  bend(doll.head, -0.08 * speed);
}

function startState(chapter: ChapterData): PlayerState {
  return {
    x: chapter.spawn.x, y: chapter.spawn.y, vx: 0, vy: 0, facing: 1, grounded: true, groundY: chapter.spawn.y,
    standY: chapter.spawn.y, atEdge: false, bubble: 0, mode: 'free', t: 0, verb: null, hook: null,
  };
}

/** The ground line, closed below and to the sides, as one extruded slab around the play plane (z = 0). */
function buildGround(chapter: ChapterData): Mesh {
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const shape = new Shape();
  shape.moveTo(first.x - 14, first.y);
  for (const p of line) shape.lineTo(p.x, p.y);
  shape.lineTo(last.x + 14, last.y);
  shape.lineTo(last.x + 14, -12);
  shape.lineTo(first.x - 14, -12);
  shape.closePath();
  // From well behind the play plane to a little in front of it: enough to stand on, and little enough that
  // a wall doesn't hide what is beside it when the camera looks along the course.
  const geometry = new ExtrudeGeometry(shape, { depth: 4.7, bevelEnabled: false });
  geometry.translate(0, 0, -4);
  return new Mesh(geometry, new MeshStandardMaterial({ color: '#7f8f58', roughness: 1 }));
}

/** Every hook has a red ring: the one sign the game teaches for "the lace goes here" (plan §4.2). */
function buildHooks(chapter: ChapterData): Group {
  const group = new Group();
  const red = new MeshStandardMaterial({ color: '#d8382c', roughness: 0.35 });
  for (const hook of chapter.hooks ?? []) {
    const ring = new Mesh(new TorusGeometry(0.19, 0.045, 10, 28), red);
    ring.position.set(hook.x, hook.y, -0.05);
    group.add(ring);
  }
  return group;
}

/**
 * The lace between Elof's hands and the hook: a red candy lace, drawn as one thin rod. It is always in the
 * scene, at no size while he isn't swinging, so nothing is compiled when he first throws it.
 */
function buildLace() {
  const mesh = new Mesh(new CylinderGeometry(0.022, 0.022, 1, 6), new MeshStandardMaterial({ color: '#e0463a', roughness: 0.5 }));
  mesh.frustumCulled = false;
  mesh.scale.setScalar(0);
  function update(hook: { x: number; y: number } | null, handX: number, handY: number): void {
    if (!hook) {
      mesh.scale.setScalar(0);
      return;
    }
    const dx = hook.x - handX;
    const dy = hook.y - handY;
    mesh.position.set((hook.x + handX) / 2, (hook.y + handY) / 2, 0);
    mesh.rotation.z = -Math.atan2(dx, dy);
    mesh.scale.set(1, Math.hypot(dx, dy), 1);
  }
  return { mesh, update };
}

/** The hoses he climbs: green garden hose, a little behind the play plane so that he is in front of it. */
function buildClimbs(chapter: ChapterData): Group {
  const group = new Group();
  const material = new MeshStandardMaterial({ color: '#3f8f4f', roughness: 0.55 });
  for (const climb of chapter.climbs ?? []) {
    const length = climb.top - climb.bottom + 0.25;
    const hose = new Mesh(new CylinderGeometry(0.06, 0.06, length, 10), material);
    hose.position.set(climb.x, climb.bottom + length / 2, -0.16);
    group.add(hose);
  }
  return group;
}

/** Dark trunks behind the course: something for the eye to measure Elof's speed against. */
function buildTrunks(chapter: ChapterData): Group {
  const group = new Group();
  const material = new MeshLambertMaterial({ color: '#5a4632' });
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  // A fixed sequence, not Math.random: the scene looks the same in every screenshot.
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = from - 6; x < to + 6; x += 2.2 + next() * 2.4) {
    const width = 0.7 + next() * 1.1;
    const trunk = new Mesh(new BoxGeometry(width, 16, width), material);
    trunk.position.set(x, 7, -6 - next() * 7);
    group.add(trunk);
  }
  return group;
}

/**
 * The glitter bubble (plan §4.2): a golden sparkle shell, never a round gum bubble. A faint glow and a swarm
 * of sparks that turn round Elof while it carries him. It is always in the scene, at no size, so its shaders
 * are compiled with the first frames and not when he first falls.
 */
function buildGlitter() {
  const SPARKS = 22;
  const RADIUS = 0.7;
  const group = new Group();
  const glow = new Mesh(
    new SphereGeometry(RADIUS, 20, 14),
    new MeshBasicMaterial({ color: '#ffcf5a', transparent: true, opacity: 0.14, depthWrite: false, blending: AdditiveBlending }),
  );
  const sparks = new InstancedMesh(
    new OctahedronGeometry(0.055),
    new MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0.95, depthWrite: false, blending: AdditiveBlending }),
    SPARKS,
  );
  sparks.instanceMatrix.setUsage(DynamicDrawUsage);
  glow.frustumCulled = false;
  sparks.frustumCulled = false;
  group.add(glow, sparks);
  group.scale.setScalar(0);
  const place = new Object3D();

  /** `carried` is the bubble's progress from the simulation: 0 when there is none. */
  function update(carried: number, elofX: number, elofY: number, clock: number): void {
    // It gathers in the first tenth of the way and scatters in the last.
    const size = carried <= 0 ? 0 : Math.min(1, carried / 0.1, (1 - carried) / 0.1 + 0.15);
    group.scale.setScalar(size);
    if (size === 0) return;
    group.position.set(elofX, elofY + 0.5, 0);
    for (let i = 0; i < SPARKS; i++) {
      // Spread evenly over the shell, each on its own slow turn.
      const up = 1 - (2 * (i + 0.5)) / SPARKS;
      const ring = Math.sqrt(1 - up * up) * RADIUS;
      const angle = i * 2.39996 + clock * (1.6 + (i % 5) * 0.35);
      place.position.set(Math.cos(angle) * ring, up * RADIUS, Math.sin(angle) * ring);
      place.rotation.set(clock * 3 + i, clock * 2.3 + i * 2, 0);
      place.scale.setScalar(0.55 + 0.45 * Math.sin(clock * 9 + i * 1.3));
      place.updateMatrix();
      sparks.setMatrixAt(i, place.matrix);
    }
    sparks.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}

/** The bright colours of the karameller on Olov's poster. */
const CANDY_COLOURS = ['#e8483f', '#f6c445', '#58b368', '#4a90d9', '#ef7fb0', '#f08a3c'];
/** A collected candy flies into Elof in this long. */
const CANDY_FLIGHT = 0.22;

/**
 * The trail candy: karameller in twisted wrappers, floating and turning. All of them are one instanced
 * mesh, so the whole trail is one draw call however long it is.
 */
function buildTrail(chapter: ChapterData) {
  const candy = chapter.candy;
  // A wrapped sweet in profile: a flared twist, a neck, the sweet itself, a neck and a twist.
  const profile = [[0.072, -0.19], [0.024, -0.115], [0.085, -0.064], [0.1, 0], [0.085, 0.064], [0.024, 0.115], [0.072, 0.19]];
  const geometry = new LatheGeometry(profile.map(([radius, along]) => new Vector2(radius, along)), 14);
  geometry.rotateZ(Math.PI / 2);
  // Both sides: the twists are open at their ends.
  const mesh = new InstancedMesh(geometry, new MeshStandardMaterial({ roughness: 0.32, side: DoubleSide }), Math.max(1, candy.length));
  mesh.count = candy.length;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  // The trail runs the length of the course, so it is never outside the picture as a whole.
  mesh.frustumCulled = false;
  const colour = new Color();
  candy.forEach((_, i) => mesh.setColorAt(i, colour.set(CANDY_COLOURS[i % CANDY_COLOURS.length]!)));
  /** How far each collected candy has flown, from 0 to 1; -1 while it still floats in its place. */
  const flown = candy.map(() => -1);
  const place = new Object3D();

  function update(collected: readonly boolean[], elofX: number, elofY: number, dt: number, clock: number): void {
    for (let i = 0; i < candy.length; i++) {
      const c = candy[i]!;
      if (collected[i] && flown[i]! < 0) flown[i] = 0;
      let x = c.x;
      let y = c.y + Math.sin(clock * 2.2 + i * 1.7) * 0.045;
      let size = 1;
      if (flown[i]! >= 0) {
        const t = Math.min(1, flown[i]! + dt / CANDY_FLIGHT);
        flown[i] = t;
        // It swells for a moment, then shrinks into his chest.
        x = lerp(x, elofX, t * t);
        y = lerp(y, elofY + 0.55, t * t);
        size = (1 + 0.5 * Math.sin(Math.PI * Math.min(1, t * 2))) * (1 - t * t);
      }
      place.position.set(x, y, 0);
      place.rotation.set(0.35, clock * 1.5 + i * 0.9, Math.sin(clock * 1.3 + i) * 0.3);
      place.scale.setScalar(size);
      place.updateMatrix();
      mesh.setMatrixAt(i, place.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

/** A big candy on its stick: the stand-in, until the one from Blender has loaded. */
function buildCandy(): Group {
  const group = new Group();
  const stick = new Mesh(new CylinderGeometry(0.035, 0.035, 1.1), new MeshStandardMaterial({ color: '#f4efe6', roughness: 0.6 }));
  stick.position.y = 0.55;
  const sweet = new Group();
  sweet.name = 'candy';
  sweet.position.y = 1.25;
  const red = new MeshStandardMaterial({ color: '#dd4b39', roughness: 0.25 });
  const white = new MeshStandardMaterial({ color: '#fff6ea', roughness: 0.25 });
  sweet.add(new Mesh(new SphereGeometry(0.32, 24, 16), red));
  for (const turnBy of [0, Math.PI / 2]) {
    const band = new Mesh(new CylinderGeometry(0.325, 0.325, 0.12, 24, 1, true), white);
    band.rotation.set(Math.PI / 2, turnBy, 0);
    sweet.add(band);
  }
  group.add(stick, sweet);
  return group;
}

function heightOfGroundAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return 0;
}

/**
 * A stand-in for Elof: simple shapes in the colours of his sheet, one EL tall, facing +x.
 * The real model is built in Blender in Stage 0c and lives in the private repository.
 */
function buildElof() {
  const group = new Group();
  const body = new Group();
  const material = (color: string, roughness = 0.9) => new MeshStandardMaterial({ color, roughness });
  const shirt = material('#9db9e3');
  const jeans = material('#2f4b7c');
  const boot = material('#6b4a2e');
  const skin = material('#f2cba8');
  const hair = material('#ecc967');

  const leg = (z: number) => {
    const pivot = new Group();
    pivot.position.set(0, 0.4, z);
    const thigh = new Mesh(new BoxGeometry(0.12, 0.34, 0.12), jeans);
    thigh.position.y = -0.19;
    const foot = new Mesh(new BoxGeometry(0.2, 0.09, 0.13), boot);
    foot.position.set(0.035, -0.355, 0);
    pivot.add(thigh, foot);
    return pivot;
  };
  const legLeft = leg(0.075);
  const legRight = leg(-0.075);

  const torso = new Mesh(new CapsuleGeometry(0.15, 0.16, 6, 14), shirt);
  torso.position.y = 0.54;
  const head = new Mesh(new SphereGeometry(0.19, 20, 14), skin);
  head.position.y = 0.81;
  const hairTop = new Mesh(new SphereGeometry(0.2, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hair);
  hairTop.position.set(-0.012, 0.83, 0);
  const fringe = new Mesh(new ConeGeometry(0.075, 0.18, 8), hair);
  fringe.position.set(0.13, 0.985, 0);
  fringe.rotation.z = -0.85;
  const backpack = new Mesh(new BoxGeometry(0.13, 0.24, 0.22), material('#6f6a40'));
  backpack.position.set(-0.19, 0.56, 0);
  const arm = (z: number) => {
    const mesh = new Mesh(new CapsuleGeometry(0.045, 0.2, 4, 8), shirt);
    mesh.position.set(0.02, 0.5, z);
    return mesh;
  };

  body.add(torso, head, hairTop, fringe, backpack, arm(0.19), arm(-0.19));
  group.add(body, legLeft, legRight);
  return { group, body, legLeft, legRight };
}
