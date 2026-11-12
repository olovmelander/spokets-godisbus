import { capArms, capHands, capHandoff } from './cap-handoff';
import { familyLampSide, holdFlashlight, lampCarryWeight, quietLampArm } from './lamp-hold';
import { stormSweet } from './storm-sweet';
import { createEddy } from './eddy';
import { createRainBarrel } from './rain-barrel';
import { lessMotion } from '../platform/motion';
import { owlHollow } from './owl-trap';
import { buildBraid } from './braid';
import { braidTip, mammaPathY, mammaPathZ, mammaSteps, pineTilt, mammaLogPose } from './myren-helper';
import { createPaddle, type Paddle } from './paddle';
import { createScarves } from './scarf';
import { createHoldingOut, createUmbrellaCarry, handsOn, heldUp, holdAt, holdingOut, UMBRELLA } from './umbrella-hold';
import { swayingBoughs } from './swaying-boughs';
import { rootHollow } from './root-hollow';
import { rainGearFor } from './rain-gear';
import { coatPose } from './elof-coat';
import { createHeldCoat, holdsCoat } from './elof-coat-mesh';
import { createMoverMotion } from './mover-motion';
import { holdCarving } from './carrying';
import { createNorrskenRescue, rescueCarryPose } from './norrsken-rescue';
import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  DepthTexture, DynamicDrawUsage, ExtrudeGeometry, Fog, Group, HalfFloatType, HemisphereLight, InstancedMesh, LatheGeometry, Mesh,
  Float32BufferAttribute, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, NeutralToneMapping, Object3D, OctahedronGeometry, PerspectiveCamera, Quaternion, PlaneGeometry, PointLight,
  Scene, Shape, SphereGeometry, TorusGeometry, UnsignedIntType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Reaction } from '../app/pointing';
import { createAssets } from './assets';
import { installGardenHome, STORM_KOTA } from './garden-home';
import { installSharedModels } from './shared-models';
import { windWisp } from './wind-wisp';
import { createAfloat } from './afloat';
import { createRain } from './rain';
import { PACK } from './extensions';
import { installLift } from './lift';
import { paintStreetMirror } from './village';
import { candyKit, createTrail, installSweets, sweeten, sweetSocket } from './candy';
import { forestKit, forestSocket, installForest, rollingCone } from './forest-kit';
import { buildLedges } from './ledges';
import { createMountain, shelterStandIn } from './mountain-kit';
import { rods } from './lines';
import { buildHooks } from './rings';
import type { TextureOwnershipInfo } from './texture-ownership';
import { captureFrame } from './capture';
import { observeGpu, type GpuMemory } from './gpu-memory';
import { KINDS } from '../content/kinds';
import { personFor } from '../content/people';
import { PLACES, dress } from './dressing';
import { jettiesOf } from './dressing/ground';
import { drawn } from './dressing/kit';
import { createSky } from './dressing/sky';
import type { LifeAsk } from './life';
import { evening, nightBrightness } from './backdrop';
import { helperProp, moverProp, rideProp, spotProp } from './props';
import { GARDEN_MORNING, GLOW_ON_HIGH, createGradePass, createMaterialGrade } from './grade';
import { DOF_DEEP, DOF_DEEPER, createDepthBlur } from './depth-blur';
import { CLOSE_DETAIL, DAPPLE, DAPPLE_CLOCK, GROUND_SKY, GROUND_WET } from './ground-detail';
import { CANOPY } from './canopy';
import { SHADE_STRENGTH, createContactShade } from './contact-shade';
import { createBloom } from './bloom';
import { createLightShafts } from './light-shafts';
import { createWater, waterKind } from './water';
import { createCharacterShadows } from './character-shadows';
import { createRimLight } from './rim-light';
import { chooseTier, maxResolutionSteps, pixelRatioFor, type Tier } from './quality';
import { cameraIntent } from '../sim/camera-intent';
import { songGlitter } from './song-glitter';
import { createEpilogueStage } from './epilogue-stage';
import { createHomeRoutine } from './home-routine';
import { createPrologueStage } from './prologue-stage';
import { createStage, litLamp } from './stage';
import { actPose, sitting, stanceOf, stepLength, type Stance } from './acting';
import { createModelRig, createRehearsalRig, galeOf, heightOf, JOINTS, STANDING, type Pose, type Rig, type Role } from './rig';
import { createPlayerMotion, createPlayerStandIn, createTurning } from './player-motion';
import { createAurora } from './aurora';
import { createFamilyMotion } from './family-motion';
import { createBootPull } from './boot-pull';
import { facingBetween, turnFamily } from './family-turning';
import { createSharedSweets } from './shared-sweets';
import { createRescuedFigures } from './rescued-figures';
import { goldSweet } from './gold-sweet';
import { carryGold, GOLD_GRIP, GOLD_HAND, goldCarryWeight, tasteGrowingGold } from './gold-contact';
import { createHomeTrail } from './home-trail';
import { saturdayBag } from './saturday-bag';
import { createGhostThought } from './ghost-thought';
import { drawnWhile } from './idle';
import { buildVerbMarks } from './verb-marks';
import { MODEL_TURN, blinkEyes, createGhostMotion, eyeNodes } from './ghost-model';
import { windAt, type Blow } from './wind';
import { layRich, seeRich } from './rich';
import { prologuePose, type PrologueFrame } from '../sim/prologue';
import { endsInScene, type Act, type SceneFrame } from '../sim/scene';
import { BERRY_HALF, BERRY_HEIGHT, GHOST_CLEARANCE, JUMP_SPEED } from '../sim/constants';
import type { ChapterData, HelpState, PlayerState, Vec } from '../sim/types';
import type { GhostState } from '../sim/sim';
import { photoCut } from './crop';
import { wingbeat } from './wingbeat';
import { createFootSplash } from './foot-splash';
import { craneChick, stepChick, type Gait } from './crane';
import { lookAt } from './look';
import { createTalker, talk, type Free, type Look, type TalkFrame, type Talker } from './talk';

/** Whether the page's address has `?name`. */
function pageAsks(name: string): boolean {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').has(name);
  } catch {
    return false;
  }
}

/** Whether the page asked to leave the lens's effects out (`?nolens`). */
const lensLeftOut = (): boolean => pageAsks('nolens');

/** Whether the browser draws in software, without a graphics card (SwiftShader, llvmpipe and their kind). */
function softwareDrawn(renderer: WebGLRenderer): boolean {
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    return /swiftshader|llvmpipe|software|basic render/i.test(name);
  } catch {
    return false;
  }
}

/** How much of the film's look the grade gives (Olov, 6 November 2026: "mer likt ... Unravel"). */
const CINEMA = 0.8;
/**
 * How many EL the eye rises over a brook or a pool, looking down onto it: most over the forest's brooks, which lie
 * in their dips and otherwise read as a thin band (Olov, 6 November 2026), less over the bog, which is all water.
 */
const POOL_EYE = 1.6;
/** The rides that lie ready where he boards them, in either adventure. */
const WAITS_READY = new Set(['boot', 'umbrella', 'raft', 'leaf']);
/** How far a flying crane's body hangs under his feet (./crane.ts), and how long it takes to fly on once he is down. */
const CRANE_BELLY = 1.05;
const CRANE_AWAY = 1.8;
/** How far under his feet a ridden football's bottom is (the pack's `football` ride: radius 0.8, its top under his soles). */
const FOOTBALL_TOP = 1.64;
const BROOK_EYE = 3.0;
/** A long lens from the side flattens depth the way a macro lens does (plan §5.2). */
const FOV = 30;
/** The ground sits about 35% up from the bottom, so thumbs never cover Elof (plan §5.2). */
const GROUND_FROM_BOTTOM = 0.35;
/** How long the camera takes to come back to play after a scene's shot, in seconds. */
const SHOT_RELEASE = 1.1;
/** How long the picture takes to breathe out at a chapter's end. */
const CODA_EASE = 3.2;
/** A thing a scene brings out (Spot.after) rises into its place over this long, in seconds, from this far below. */
const SPOT_RISE = 0.9;
const SPOT_RISE_FROM = 0.45;

export interface ViewInfo {
  tier: Tier;
  /** Mid and High require renderable floating-point colour buffers. */
  hdrAvailable: boolean;
  drawCalls: number;
  triangles: number;
  programs: number;
  geometries: number;
  textures: number;
  /** Allocation observer is present only with ?debug or ?bench. */
  gpu: GpuMemory | null;
  pixelRatio: number;
  maxPixelRatio: number;
  resolutionSteps: number;
  /** Drawing-buffer resize operations, including viewport and tier changes. Useful for the churn gate. */
  resizes: number;
  width: number;
  height: number;
  /** Models loaded from the packs, as "pack/name". */
  models: string[];
  /** How many of their textures arrived as KTX2 and stayed compressed on the GPU. */
  compressedTextures: number;
  assetTextures: TextureOwnershipInfo;
  /** The "role" custom properties set in Blender, read back from the models. */
  roles: string[];
  shadows: { characters: number; contact: boolean; mapSize: number; casters: number };
}

/** What the picture is drawn from: two simulation states and what has been reached and collected. */
export interface Frame {
  prev: PlayerState;
  curr: PlayerState;
  /** How far between the two states this frame lies, from 0 to 1. */
  alpha: number;
  /** The time since the last frame, in seconds. 0 while the game is paused. */
  dt: number;
  /** Seconds actually advanced by the simulation; left out in a render-only fixture: dt. */
  eventDt?: number;
  atGoal: boolean;
  /** Which trail candies are in the bag. */
  collected: readonly boolean[];
  /** The side candy in the bag, by its place in chapter.side. Left out: none. */
  side?: readonly boolean[];
  /** The last big candy reached, or -1. */
  checkpoint: number;
  /** Where the things on rails are, in the chapter's order. */
  movers: readonly { x: number; y: number; t?: number; stop?: number }[];
  /** The drips and their next drops, in the chapter's order. */
  drips: readonly { x: number; y: number; shadow: number; height: number }[];
  /** What has happened in the chapter. A candy that waits for a flag is drawn once the flag is set. */
  flags: ReadonlySet<string>;
  /** Where the ghost is, or null in a chapter without it. */
  ghost: GhostState | null;
  /** The rolling cones, in the chapter's order. */
  rollers: readonly { x: number; y: number; on: boolean; radius: number }[];
  /** The soft tussocks, in the chapter's order: where the top of each is now. */
  tussocks: readonly { x: number; y: number }[];
  /** The stretches with gusts, in the chapter's order. */
  gusts: readonly { blow: number; warn: number }[];
  /** The cranberries, in the chapter's order: how flat each is after a bounce, from 1 to 0. */
  berries?: readonly { squash: number }[];
  prologue?: PrologueFrame | null;
  /** The scene playing now: one of the chapter's, or one of the prologue's freeze jokes (src/sim/scene.ts). */
  scene?: SceneFrame | null;
  ending?: number | null;
  noteHits?: readonly { serial: number; id: string; midi: number }[];
  /** What the helper is doing: its step, and where the thing is. */
  help: HelpState;
  /** What is said now, and whether the story waits on it (./talk.ts). Left out: nothing. */
  talk?: TalkFrame | null;
}

export interface View {
  readonly warming: boolean;
  readonly resolutionSteps: number;
  readonly maxResolutionSteps: number;
  /** Required public boot models are present; a failure keeps the loading/error card in front of play. */
  readonly ready: Promise<void>;
  /** How much of what `ready` waits for has come, from 0 to 1: for the crayon line under the title. */
  readonly loaded: number;
  /** Re-fetch released immutable textures before warming Three's restored GL resources. */
  restore(): Promise<void>;
  resize(): void;
  /** Apply a level without resetting the scene. Call while paused when crossing Low, to warm its shaders. */
  setTier(next: Tier): void;
  /** Whole 0.1 reductions from the tier cap. A changed step resizes existing targets, never shaders. */
  setResolutionSteps(steps: number): void;
  /**
   * The rendered player's centre on the play plane, in CSS client coordinates; null before the first frame. `up` asks
   * for another height on him instead, in his own lengths from his feet: 1.3 is just over his head.
   */
  playerScreen(up?: number): { x: number; y: number } | null;
  /** The visitor's centre for tapping the helper itself; null while it is away. */
  helperScreen(): { x: number; y: number } | null;
  /** The visible ghost's picture-bubble origin above its head; null while it is away or off screen. */
  ghostScreen(): Vec | null;
  worldScreen(at: Vec): Vec | null;
  /** Optional Peka responses: animation only, never changes the simulation. */
  react(what: Reaction, calm?: boolean): void;
  render(frame: Frame): void;
  /** Read the last frame immediately after render(), with no retained WebGL drawing buffer. */
  capture(): Promise<Blob | null>;
  /**
   * A copy of the frame just drawn, as a canvas of its own: the photo on a chapter's last page, a 3:2 cut with the
   * given point (CSS client coordinates, Elof) a third of the way in, at most 720×480 (src/render/crop.ts).
   */
  snapshot(focus?: { x: number; y: number } | null): HTMLCanvasElement | null;
  info(): ViewInfo;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** How much of the way to go this frame, for a smoothing that doesn't depend on the frame rate. */
const ease = (rate: number, dt: number) => 1 - Math.exp(-rate * dt);
const smooth = (k: number) => { const t = Math.min(1, Math.max(0, k)); return t * t * (3 - 2 * t); };

/**
 * Stage 0a's greybox scene: the test course, a stand-in Elof in his colours, and the big candy.
 * `asked` is the tier from settings or ?tier=, or null for Auto. With `standIns` the figures built in code and
 * generic home environment are kept even where private assets exist: for pictures that go into the repository.
 */
export function createView(canvas: HTMLCanvasElement, chapter: ChapterData, asked: Tier | null = null, standIns = false, trackGpu = false, life: LifeAsk = {}): View {
  // The context is made here, so that support is known before allocating HDR targets: Mid and High need
  // float colour buffers, and a device without them gets Low (plan §6.5).
  const gl = canvas.getContext('webgl2', {
    alpha: false, antialias: false, depth: true, stencil: false, powerPreference: 'high-performance',
  });
  // main.ts catches this and shows the message.
  if (!gl) throw new Error('WebGL 2 is not available');
  const gpu = trackGpu ? observeGpu(gl) : null;
  const hdrAvailable = gl.getExtension('EXT_color_buffer_float') !== null;
  let tier = chooseTier(asked, hdrAvailable);

  const renderer = new WebGLRenderer({
    canvas,
    context: gl,
    antialias: false,
    powerPreference: 'high-performance',
    alpha: false,
  });
  // Neutral keeps the colours that were set: a red house stays red (plan §6.5 names AgX or Neutral).
  renderer.toneMapping = NeutralToneMapping;
  // One frame is several render calls on Mid and High (the scene, the grade, the output), so the counters
  // are reset once per frame here, not by each call.
  renderer.info.autoReset = false;
  // r186's outputBufferType is fixed at construction. Own the two HDR targets so a settings change can
  // release them and draw Low straight to the canvas, keeping this renderer, its assets and the scene.
  // Mid and High keep the same linear HDR → grade → Neutral/sRGB stages as r186's native setEffects path.
  const place = chapter.place ? (PACK.looks.get(chapter.id) ?? PLACES[chapter.place]) : null;
  /** Whether the sun comes through leaves here: the forest and the garden, by day, out of the storm. */
  const dappled = (chapter.place === 'forest' || chapter.place === 'garden') && !chapter.storm;
  const grade = place?.grade ?? GARDEN_MORNING;
  const gradePass = hdrAvailable ? createGradePass(grade) : null;
  // `?nolens` leaves out the lens's depth of field and the shade where things meet, to compare their cost on a
  // device with `?bench` (the graphics pass of 6 November 2026).
  const lens = !lensLeftOut();
  const depthBlur = hdrAvailable && lens ? createDepthBlur() : null;
  // Mid and High: the shade where things meet, from the depth of the picture (./contact-shade.ts).
  const contactShade = hdrAvailable && lens ? createContactShade() : null;
  const bloom = hdrAvailable ? createBloom() : null;
  // Mid and High: shafts of light at a quarter of the width and height, which the grade adds (./light-shafts.ts).
  const lightShafts = hdrAvailable ? createLightShafts() : null;
  const outputPass = hdrAvailable ? new OutputPass() : null;
  if (outputPass) outputPass.renderToScreen = true;
  let hdr: { scene: WebGLRenderTarget; grade: WebGLRenderTarget } | null = null;
  // High glows; Mid does not.
  gradePass?.setGlow(tier === 'high' ? GLOW_ON_HIGH : 0);
  // The film's look on Mid and High, where the grade is a pass of its own (./grade.ts).
  gradePass?.setCinema(CINEMA);
  // The close detail of ground, bark, granite and boards: Mid and High only (./ground-detail.ts).
  CLOSE_DETAIL.value = tier === 'low' ? 0 : 1;
  // The edges' smoothing on Mid and High (./grade.ts), unless the browser draws without a GPU, where every pixel
  // is the processor's work; `?edges` asks for it all the same.
  const edgesHere = !softwareDrawn(renderer) || pageAsks('edges');
  gradePass?.setSmoothEdges(tier !== 'low' && edgesHere);
  // Let the browser restore a lost context instead of leaving a dead canvas.
  canvas.addEventListener('webglcontextlost', (e) => e.preventDefault());

  const scene = new Scene();
  // A place brings its own light, haze and layers. Without one the chapter is greybox.
  const sky = new Color(place?.haze.colour ?? '#c4dcea');
  scene.fog = new Fog(sky, 14, 44);
  const materialGrade = createMaterialGrade(grade, scene.fog);
  materialGrade.setEnabled(tier === 'low');
  // Lights are created once and never toggled: every change would compile a new shader (plan §6.2).
  const hemisphere = new HemisphereLight(place?.hemisphere.sky ?? '#e2efff', place?.hemisphere.ground ?? '#6a5338', place?.hemisphere.intensity ?? 1.25);
  scene.add(hemisphere);
  const sun = new DirectionalLight(place?.sun.colour ?? '#ffe1ae', place?.sun.intensity ?? 2.4);
  sun.position.set(...(place?.sun.from ?? ([-6, 5, 8] as const)));
  scene.add(sun);
  const rimLight = createRimLight(sun);
  // A place's sun stands behind the scene, so a faint light from the camera's side lifts the faces. It is
  // there in greybox too, dark, so that every chapter uses the same shaders.
  const fill = new DirectionalLight(place?.fill.colour ?? '#ffffff', place?.fill.intensity ?? 0);
  fill.position.set(4, 3, 10);
  scene.add(fill);
  const dressing = place ? dress(chapter, place, life) : null;
  const skyPicture = createSky(dressing?.background ?? null, sky);
  scene.add(skyPicture);
  if (dressing) {
    dressing.group.name = 'dressing';
    scene.add(dressing.group);
  }

  // The big candies: one at each checkpoint, a little behind the path so that he passes in front of it,
  // and the one at the end.
  const endX = chapter.goalX + 0.6;
  const bigCandies = [
    // (Or where the chapter stands it, out of the way of someone going by behind him: Checkpoint.z.)
    ...(chapter.checkpoints ?? []).map((at) => ({ x: at.x, y: at.y, z: at.z ?? -0.7, after: at.after })),
    { x: endX, y: heightOfGroundAt(chapter, endX), z: 0, after: undefined },
  ].map((at) => {
    const place = buildCandy();
    place.position.set(at.x, at.y, at.z);
    scene.add(place);
    // One that the story lays down (Checkpoint.after) waits out of the picture until then.
    return { place, sweet: place.getObjectByName('candy')!, reached: false, pop: 0, spin: 0, after: at.after, laid: at.after === undefined };
  });
  // Where a scene ends the chapter (the prologue's title), the scene is the end: no candy marks it.
  const sceneEnds = endsInScene(chapter);
  if (sceneEnds || chapter.trailEnds) bigCandies.at(-1)!.place.visible = false;
  // The coda (docs/narrative-audit/threads.md §5.4): at the goal the picture breathes out over the place he has
  // crossed, while the tune closes. Not where a scene is the end, nor at home in the evening (its own end).
  const coda = !sceneEnds && !chapter.epilogue;
  let codaFor = 0;
  const trail = createTrail(chapter.candy);
  // Side candy, off the trail: hearts and lollipops, where the trail is sweets in wrappers.
  const sideTrail = createTrail(chapter.side ?? [], 'side');
  const noSide: readonly boolean[] = [];
  const ledges = buildLedges(chapter.ledges ?? [], rods(chapter), chapter.place, chapter.movers);
  const glitter = buildGlitter();
  const lace = buildLace();
  // A scarf held down to him from above for a ride, in the hands of whoever lowers it (./scarf.ts): Pappa's in Älven.
  const scarves = createScarves(chapter);
  if (scarves) scene.add(scarves.group);
  const scarfLower = new Vector3(), scarfUpper = new Vector3(), scarfTop = new Vector3(), scarfBottom = new Vector3();
  let scarfHeld = false;
  // What Använd will do, over each thing it can act on (in-play.md row 6).
  const glints = buildVerbMarks(chapter);
  const lawnSong = songGlitter(chapter);
  const noteStrikes = new Map<string, number>();
  scene.add(lawnSong.group);
  const plane = buildPlane();
  scene.add(glints.group, plane);
  // The things that stand at spots, and what carries him on each ride, where the chapter says what they are.
  const ghostHelps = chapter.helper?.kind === 'ghost';
  const helperGhost = ghostHelps ? buildGhost() : undefined;
  const helper = helperProp(chapter, helperGhost);
  scene.add(helper.group);
  const hiddenSweets = buildHidden(chapter);
  scene.add(hiddenSweets.group);
  const glance = buildGlance(chapter);
  scene.add(glance.group);
  // The ghost's look in a scene: a dotted line from its eyes to what it looks at, and a ring there.
  const looking = buildLook();
  scene.add(looking.group);
  // The scenes' actors, what they hold, the furniture and the scenes' glitter (./stage.ts).
  const stage = createStage(chapter, (x) => heightOfGroundAt(chapter, x));
  scene.add(stage.group);
  const things = (chapter.spots ?? []).map((spot) => ({ spot, prop: spotProp(spot), reactionTurn: 0, risen: 0 }));
  // What only stands about: drawn like a thing to use, and gone when its flag is set.
  const decor = (chapter.decor ?? []).map((def, i) => ({
    def,
    prop: spotProp({ id: `decor:${i}`, at: def.at, verb: 'take', look: def.look, ...(def.word ? { word: def.word } : {}) }),
  }));
  for (const d of decor) if (d.prop) {
    if (d.def.z !== undefined) d.prop.group.position.z = d.def.z;
    if (d.def.scale !== undefined) d.prop.group.scale.setScalar(d.def.scale);
    if (d.def.turn !== undefined) d.prop.group.rotation.y = d.def.turn;
    scene.add(d.prop.group);
  }
  const rescuedFigures = createRescuedFigures(chapter, decor);
  // How big he is drawn: a boy among small things, or as small as the ghost (plan §5.2).
  const sized = chapter.size;
  let tall = sized && sized.after === undefined ? sized.scale : 1;
  for (const thing of things) if (thing.prop) {
    thing.prop.group.name = `spot:${thing.spot.id}`;
    scene.add(thing.prop.group);
  }
  const carriers = (chapter.rides ?? []).map((ride) => {
    const prop = ride.look && ride.look !== 'plane' && ride.look !== 'none' ? rideProp(ride.look) : null;
    if (prop) {
      prop.scale.setScalar(0);
      drawnWhile(prop, false);
      scene.add(prop);
    }
    return { ride, prop, wasRidden: false, landed: Infinity, setDown: new Vector3() };
  });
  const moverMeshes = buildMovers(chapter);
  /** The movers that go over the water: rafts, logs and boards, which it mirrors (./water.ts). */
  const moversOnWater = moverMeshes.filter((_, i) => (chapter.movers?.[i]?.stops ?? []).some((stop) => (chapter.water ?? []).some((pool) => stop.x > pool.from - 1 && stop.x < pool.to + 1)));
  // Each has weight as it moves: it leans, rocks to rest and squashes landing (./mover-motion.ts).
  const moverMotion = createMoverMotion(chapter.movers ?? [], moverMeshes);
  const sharedSweets = chapter.id === 'norrsken' ? createSharedSweets() : null;
  if (sharedSweets) scene.add(sharedSweets.group);
  // Norrsken's way home: the trail Pappa carries Elof down, and where his feet are on it (./home-trail.ts).
  const homeTrail = chapter.id === 'norrsken' ? createHomeTrail(chapter) : null;
  if (homeTrail) scene.add(homeTrail.mesh);
  const pappaFeet = { y: 0, z: 0 };
  const rain = createRain(chapter);
  const cones = buildCones(chapter.rollers?.length ?? 0);
  scene.add(...moverMeshes, rain.group, cones.mesh);
  // Stormskogen's swaying boughs: spruce boughs on young stems that lean as they swing (./swaying-boughs.ts).
  const boughs = swayingBoughs(chapter, moverMeshes);
  if (boughs) scene.add(boughs);
  // Drops thrown up at his feet as he runs and lands on wet ground, out in the storm (./foot-splash.ts).
  const footSplash = createFootSplash();
  const wetOutside = (chapter.storm?.rain ?? 0) > 0 && chapter.place !== 'home';
  if (wetOutside) scene.add(footSplash.mesh);
  const climbs = buildClimbs(chapter);
  // The dressing brings its own ground and its own trees.
  if (!dressing) scene.add(buildGround(chapter), buildTrunks(chapter));
  scene.add(climbs.group, buildHooks(chapter), lace.mesh, trail.group, sideTrail.group, ledges.group, glitter.group);
  // The water mirrors its place: the backdrop's sky, and the far layers' pictures standing on their heads.
  const farCards: Object3D[] = [];
  dressing?.group.traverse((object) => { if (object.name.startsWith('far-')) farCards.push(object); });
  const water = createWater(chapter, place?.water ?? null, place?.sun.from,
    place && dressing ? {
      place: place.id, sky: place.sky, far: farCards, street: (x) => heightOfGroundAt(chapter, x),
      // The lake under a jetty, where the simulation has ground: the jetty stands in it.
      ...(place.ground ? { under: jettiesOf(chapter, place.ground) } : {}),
      ...(chapter.street ? { stands: (c: CanvasRenderingContext2D, column: (x: number) => number, row: (y: number) => number) => paintStreetMirror(chapter, c, column, row) } : {}),
    } : undefined);
  // It is drawn in the scene's own pass, after what stands in it and the far layers, and before what
  // drifts over it (the bog's mist sheets, the shafts of light, the dust): its render order says where.
  scene.add(water.group);
  // Granskogen's eddy turns, and the leaf the ghost waits on floats in it (./eddy.ts).
  const eddy = createEddy(chapter);
  if (eddy) scene.add(eddy.group);
  let eddyLift = 0;
  // Stormgården's rain barrel: the tap's water pours into the ditch, which fills under the lid (./rain-barrel.ts).
  const rainBarrel = createRainBarrel(chapter);
  if (rainBarrel) scene.add(rainBarrel.group);
  // A puddle in the street has birch leaves on it, from the yard across it (./afloat.ts).
  const afloat = createAfloat(place && dressing && waterKind(place.id).bed > 0 ? chapter.water ?? [] : []);
  scene.add(afloat.group);
  const tussockMeshes = buildTussocks(chapter, place?.tussock ?? null);
  const berryMeshes = buildBerries(chapter);
  for (const berry of berryMeshes) scene.add(berry);
  const mist = buildMist(chapter, scene.fog as Fog, place?.haze ?? null, sun, hemisphere);
  const follower = buildFollower(chapter);
  const wind = buildWind(chapter);
  const night = buildNight(chapter, sky, hemisphere, sun);
  scene.add(night.group);
  // What a chapter pack adds: Äventyr 2's storm (./extensions.ts).
  const extras = PACK.extras.map((make) => make({ chapter, scene, sky, hemisphere, sun })).filter((extra) => extra !== null);
  // The visual upgrade's systems, for every chapter (./lift/, docs/visual-upgrade.md).
  installLift();
  const lifts = PACK.lifts.map((make) => make({ chapter, scene, sky, hemisphere, sun, place, dressing: dressing?.group ?? null })).filter((lift) => lift !== null);
  scene.add(...tussockMeshes, mist.group, follower.group, wind.group);
  const mountain = createMountain(chapter, ledges);
  if (mountain) scene.add(mountain.group);

  // The big candy modelled in Blender takes the place of the one built in code, once it has arrived.
  // It is the first asset through the whole chain: Blender → glTF → KTX2 and meshopt → the page.
  const models: string[] = [];
  // Several help points can load the same named model. Each installation still brings new materials
  // and shadow receivers, even when the displayed asset list already contains that name.
  let modelInstallations = 0;
  const roles: string[] = [];
  let compressedTextures = 0;
  const assets = createAssets(renderer);
  const birds = [helper.group, ...things.map((thing) => (thing.spot.look === 'jay' ? thing.prop?.group : undefined))]
    .map((group) => group?.getObjectByName('bird'))
    .filter((bird): bird is Object3D => bird !== undefined)
    .concat(stage.birds);
  const candyReady = assets
    .model('boot', 'big-candy')
    .then((model) => {
      // Before it is copied: the copies share its material.
      sweeten(model);
      for (const [i, big] of bigCandies.entries()) {
        const copy = i === 0 ? model : model.clone();
        big.place.clear();
        big.place.add(copy);
        big.sweet = copy.getObjectByName('candy') ?? copy;
      }
      models.push('boot/big-candy');
      modelInstallations++;
      model.traverse((node) => {
        if (typeof node.userData.role === 'string') roles.push(node.userData.role);
        const map = ((node as Mesh).material as MeshStandardMaterial | undefined)?.map;
        if (map && (map as { isCompressedTexture?: boolean }).isCompressedTexture) compressedTextures++;
      });
    });

  // The jay, modelled in Blender (art/blender/jay.py), takes the place of the bird built in code: the helper
  // that comes when he asks, and the one he shares a berry with. Its wings are parts of their own, with the
  // same names as the stand-in's, so they beat as before.
  const jayReady = birds.length > 0 ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['jay.glb'] ? assets.model('boot', 'jay') : null))
    .then((model) => {
      if (!model) return;
      for (const [i, bird] of birds.entries()) {
        bird.clear();
        bird.add(i === 0 ? model : model.clone());
      }
      models.push('boot/jay');
      modelInstallations++;
    }) : Promise.resolve();
  // The crane, modelled in Blender (art/blender/crane.py), takes the place of the one built in code (./crane.ts):
  // kneeling on Myren, and flying on Myren and Berget. Its parts have the stand-in's names, so they move as before.
  const cranes = [
    ...things.map((thing) => (thing.spot.look === 'crane' ? thing.prop?.group.getObjectByName('crane') : undefined)),
    ...carriers.map((carrier) => carrier.prop?.getObjectByName('crane-flying')),
  ].filter((crane): crane is Object3D => crane !== undefined);
  const craneReady = cranes.length > 0 ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['crane.glb'] ? assets.model('boot', 'crane') : null))
    .then((model) => {
      if (!model) return;
      const shapes = { crane: model.getObjectByName('crane-kneeling'), 'crane-flying': model.getObjectByName('crane-flying') };
      for (const crane of cranes) {
        const shape = shapes[crane.name as keyof typeof shapes];
        if (!shape) continue;
        crane.clear();
        for (const part of shape.children) crane.add(part.clone(true));
      }
      models.push('boot/crane');
      modelInstallations++;
    }) : Promise.resolve();
  // The small sweets, modelled in Blender (art/blender/candy.py), take the place of the ones built in code: the
  // trail, the hidden kinds and the magic candy. A build without the file keeps the stand-ins.
  const sweetsReady = assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['candy.glb'] ? assets.model('boot', 'candy') : null))
    .then((model) => {
      if (!model) return;
      const kit = candyKit(model);
      const onTrail = trail.install(kit);
      sideTrail.install(kit);
      const placed = installSweets(scene, kit);
      const shared = sharedSweets?.install(kit) ?? false;
      if (!onTrail && placed === 0 && !shared) return;
      models.push('boot/candy');
      modelInstallations++;
    });
  // The things of the forest, modelled in Blender (art/blender/forest-kit.py), take the place of the ones built
  // in code. A build without the file keeps those, as does a failed load.
  const forestReady = chapter.place === 'forest' ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['forest-kit.glb'] ? assets.model('boot', 'forest-kit') : null))
    .then((model) => {
      if (!model || installForest(scene, chapter, forestKit(model)) === 0) return;
      models.push('boot/forest-kit');
      modelInstallations++;
    })
    .catch((error) => console.error('The forest kit could not be loaded; the stand-ins stay.', error)) : Promise.resolve();
  // The village's houses, put together from the kit modelled in Blender (art/blender/village.py), take the
  // place of the plain fronts built in code. A build without the file keeps those, as does a failed load.
  const housesReady = dressing?.install ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['village.glb'] ? assets.model('boot', 'village') : null))
    .then((model) => {
      if (!model || !dressing.install!(model)) return;
      models.push('boot/village');
      modelInstallations++;
    })
    .catch((error) => console.error('The village kit could not be loaded; the plain fronts stay.', error)) : Promise.resolve();
  // Original public Bredbyn architecture, baked once instead of generating immutable geometry at boot.
  const bredbynReady = chapter.place === 'village' ? assets.manifest()
    .then(manifest => manifest.packs.boot?.files['bredbyn.glb'] ? assets.model('boot', 'bredbyn') : null)
    .then(model => {
      if (!model) return;
      const landmarks = model.getObjectByName('bredbyn-landmarks');
      if (landmarks) {
        // In Stormbyn the river's yard is narrow: the church's belfry was buried inside the sweet shop.
        // Its wider crossing has room for the same church and separate wooden belfry side by side.
        const stormStreet = chapter.id === 'stormbyn';
        landmarks.position.set(chapter.id === 'look-street' ? 13 : stormStreet ? 97.8 : 46, 2.3, -29);
        landmarks.scale.setScalar(0.53);
      }
      scene.add(model);
      models.push('boot/bredbyn');
      modelInstallations++;
    })
    .catch(error => console.error('The Bredbyn environment could not be loaded.', error)) : Promise.resolve();
  const gardenReady = chapter.id === 'garden' || chapter.id === 'stormgard' ? installGardenHome(scene, assets, standIns, chapter.id === 'stormgard' ? STORM_KOTA : undefined)
    .then(model => {
      if (!model) return;
      models.push(model);
      modelInstallations++;
    })
    .catch(error => console.warn('The garden buildings could not be loaded.', error)) : Promise.resolve();
  // The things of the mountain, modelled in Blender (art/blender/mountain-kit.py), take the place of the plain
  // shapes built in code, and bring the pines. A build without the file keeps the plain shapes, as does a failed load.
  const mountainReady = mountain ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['mountain-kit.glb'] ? assets.model('boot', 'mountain-kit') : null))
    .then((model) => {
      if (!model || !mountain.install(model, scene)) return;
      models.push('boot/mountain-kit');
      modelInstallations++;
    })
    .catch((error) => console.error('The mountain kit could not be loaded; the plain shapes stay.', error)) : Promise.resolve();
  // The far scenery's life (life.ts) waits for its pictures: one atlas, carried by a model. It is a picture
  // and not a model: it is sent to the GPU as it arrives (assets.ts) and takes the place of the clear picture
  // in a material the first frames have drawn already. So nothing is warmed again for it, and it is not
  // counted among the models: no shader, buffer or picture is made, and no draw call is added, when it comes.
  // The page waits for it with the boot's models, so that in play it has come before the first step. Without
  // it nothing happens far off, and the game is whole: a failure only says so.
  const wild = dressing?.wild;
  const lifeReady = wild ? assets
    .manifest()
    .then((manifest) => (manifest.packs.boot?.files['life.glb'] ? assets.model('boot', 'life') : null))
    .then((model) => {
      const atlas = ((model?.getObjectByName('life') as Mesh | undefined)?.material as MeshBasicMaterial | undefined)?.map;
      if (atlas) wild.install(atlas);
    })
    .catch((error) => console.error('The life of the far scenery could not be loaded.', error)) : Promise.resolve();
  // Both adventures share the authored home and landscape kits. Defer the scan until the whole scene,
  // including the epilogue's final carving, has been assembled below; all of it arrives before warm-up.
  const sharedReady = Promise.resolve().then(() => installSharedModels(assets, scene, standIns, model => {
    if (!models.includes(model)) models.push(model);
  }))
    .then(arrived => { if (arrived) modelInstallations++; })
    .catch(error => console.error('Shared scenery could not be loaded; its stand-ins stay.', error));
  const packReady = Promise.resolve().then(() => Promise.all(PACK.models.map((load) => load(assets, scene))))
    .then((arrived) => { if (arrived.includes(true)) modelInstallations++; })
    .catch((error) => console.error('A building could not be loaded; its stand-in stays.', error));
  const parts = [candyReady, jayReady, craneReady, sweetsReady, forestReady, housesReady, bredbynReady, gardenReady, mountainReady, lifeReady, sharedReady, packReady];
  let arrived = 0;
  for (const part of parts) void part.then(() => { arrived++; }, () => {});
  const ready = Promise.all(parts).then(() => undefined);

  // The ghost. A stand-in built here plays its part everywhere. The one modelled in Blender after Pappa's
  // carving takes its place where its private pack exists (HANDOVER.md): the manifest says whether it does.
  // A chapter without a ghost in its data has none in the picture.
  const ghostPlace = new Group();
  ghostPlace.name = 'chase-ghost';
  const ghostStandIn = buildGhost();
  let ghost: Group = ghostStandIn;
  let paintedEyes = eyeNodes(ghost);
  const stolenBag = saturdayBag();
  stolenBag.name = 'stolen-saturday-bag';
  ghostPlace.add(ghost, stolenBag);
  ghostPlace.visible = chapter.ghost !== undefined;
  scene.add(ghostPlace);
  const ghostThought = createGhostThought(chapter);
  if (ghostThought) scene.add(ghostThought.mesh);
  const prologueStage = createPrologueStage(chapter.prologue, (x) => heightOfGroundAt(chapter, x));
  scene.add(prologueStage.group);
  const epilogueStage = createEpilogueStage(chapter.epilogue);
  scene.add(epilogueStage.group);
  const homeRoutine = chapter.place === 'home' ? createHomeRoutine(chapter) : null;
  if (homeRoutine) scene.add(homeRoutine.group);
  let ghostMotion = createGhostMotion(ghost, true);
  // The stand-in faces +x, as the stand-in Elof does; the model from Blender faces the camera, and is turned to
  // face as the stand-in does (./ghost-model.ts).
  let ghostFaces = 0;
  let ghostTurn = Math.PI;
  // Its idle look about (./ghost-model.ts) turns it, and the bag it carries, the way it turns to face him.
  let ghostLook = 0;
  let clock = 0, lifeClock = 0;
  let starDropTime = 0;
  let elofStance: Stance = 'stand';
  let hangLast = 0, hangWeight = 0;
  let shoulderLift = 0, shoulderT = 0, airStretch = 1;
  let drawnMode: string | null = null, drawnX = 0, drawnY = 0;
  const rideFrom = new Vector3();
  type NearShot = { w: number; pos: Vector3; at: Vector3 };
  const nearShot = (): NearShot => ({ w: 0, pos: new Vector3(), at: new Vector3() });
  const nearShots = { family: nearShot(), taste: nearShot(), shoulders: nearShot() };
  const camAt = new Vector3();
  let homeJourney = false;
  assets
    .manifest()
    .then((manifest) => (!standIns && manifest.packs.private?.files['ghost.glb'] ? assets.model('private', 'ghost') : null))
    .then((model) => {
      if (!model) return;
      ghostStandIn.dispose();
      ghostPlace.clear();
      ghostPlace.add(model, stolenBag);
      ghost = model;
      paintedEyes = eyeNodes(model);
      if (ghostHelps) {
        helperGhost!.dispose();
        helper.replaceGhost(model.clone());
      }
      ghostFaces = MODEL_TURN;
      ghostMotion = createGhostMotion(model);
      models.push('private/ghost');
      modelInstallations++;
    })
    .catch((error) => console.error('The ghost could not be loaded.', error));

  // Elof, modelled in Blender after his sheets and photos. He too is only here where the private pack is;
  // everywhere else the stand-in built in code plays his part.
  const elof = createPlayerStandIn();
  let playerBody: Pick<Rig, 'pose' | 'hand' | 'mouth' | 'reach' | 'breeze' | 'dress' | 'hold' | 'grasp' | 'socket' | 'face'> = elof;
  let playerHips = ['left', 'right'].map(side => elof.group.getObjectByName(`player-hip-${side}`));
  let playerFeet = ['left', 'right'].map(side => elof.group.getObjectByName(`player-boot-${side}`));
  const shoulderPose: Pose = { ...STANDING }, seat = new Vector3(), boot = new Vector3(), palm = new Vector3();
  const carryAhead = new Vector3(), carryUp = new Vector3(0, 1, 0);
  const carrySide = new Vector3(), carryAxis = new Vector3(), carryHips = new Vector3();
  const rescue = chapter.id === 'norrsken' ? createNorrskenRescue() : null;
  if (rescue) scene.add(rescue.group);
  const laceHand = new Vector3(), laceAlong = new Vector3();
  /** Myren's lysklubba, held up in his right hand in the mist: where that hand is, from the frame before. */
  const lanternHand = new Vector3(), lanternLift = new Vector3();
  let lanternHeld = false;
  const playerMotion = createPlayerMotion();
  // What is said (./talk.ts): one picture at a time, and this is it. Elof's part in it, the ghost's (its klonks), where a head
  // looks, and a pose to draw it on without keeping it.
  talk.reset();
  const elofTalker = createTalker('elof', 3), ghostTalker = createTalker('spoket', 5);
  const heard: Look = { turn: 0, nod: 0 }, faceAt = new Vector3(), spokenPose: Pose = { ...STANDING };
  const BOTH_HANDS: Free = [true, true], NO_HANDS: Free = [false, false];
  const FREE_WITH_LAMP: readonly Free[] = [[false, true], [true, false]];
  /** What he does in a scene that leaves his hands free for a gesture as he speaks. */
  const HANDS_HANG: readonly Act[] = ['stand', 'watch', 'look'];
  assets
    .manifest()
    .then((manifest) => (!standIns && manifest.packs.private?.files['elof.glb'] ? assets.model('private', 'elof').then((model) => ({ model, manifest })) : null))
    .then((loaded) => {
      if (!loaded) return;
      const { model, manifest } = loaded;
      // Exported from Blender he faces +z, and the stand-in faces +x. A quarter turn makes them agree.
      model.rotation.y = Math.PI / 2;
      // Never culled: a skinned body's bounds are taken once, in one pose, and the camera that frames him always has him
      // in sight. Culled on those stale bounds, his body went from the picture over Älven's lake and left his cap.
      model.traverse((part) => { part.frustumCulled = false; });
      elof.dispose();
      elof.group.clear();
      const rig = createModelRig(model, 1);
      elof.group.add(rig.group);
      playerBody = rig;
      // The doll's raincoat made in Blender for his model, where the private pack has it; until then shells of his body.
      wardrobeFor(rig, 'elof', manifest);
      playerHips = ['thigh_l', 'thigh_r'].map(name => model.getObjectByName(name));
      playerFeet = ['foot_l', 'foot_r'].map(name => model.getObjectByName(name));
      models.push('private/elof');
      modelInstallations++;
    })
    .catch((error) => console.error('Elof could not be loaded; the stand-in stays.', error));
  elof.group.name = 'elof';
  scene.add(elof.group);

  // The same family is visible at each practical help point. Approved models replace shared rehearsal
  // figures; a blank marker alone cannot explain who helped or connect these crossings to the opening.
  const family: Relative[] = [];
  if (chapter.id === 'myren') scene.add(mammaSteps());
  if (chapter.id === 'stormskog') scene.add(owlHollow());
  // Stormskogen's dark hollow under the roots: a felled spruce's root plate behind the pit (./root-hollow.ts).
  const hollow = rootHollow(chapter);
  if (hollow) scene.add(hollow);
  /**
   * The rain gear and Bertil's own hair, made in Blender over each of the family's approved models (the private
   * repository's family/wardrobe.py): put on the model when it has come, if the private pack has it.
   */
  const wardrobeFor = (rig: Pick<Rig, 'wear'>, who: string, manifest: { packs: Record<string, { files: Record<string, unknown> } | undefined> }) => {
    if (!rig.wear || !manifest.packs.private?.files[`${who}-wardrobe.glb`]) return;
    assets.model('private', `${who}-wardrobe`)
      .then((made) => { rig.wear!(made); modelInstallations++; })
      .catch((error) => console.warn(`The private/${who}-wardrobe could not be loaded; the rain gear is drawn from the body.`, error));
  };
  const stands = chapter.prologue ? [] : [
    ...things.map((thing) => ({ look: thing.spot.look, word: thing.spot.word, prop: thing.prop, at: thing.spot.standsAt?.x ?? thing.spot.at.x, glad: thing.spot.id as string | undefined, seated: thing.spot.seated, paddles: thing.spot.paddles, standsAt: thing.spot.standsAt, goesTo: thing.spot.goesTo, goesWhen: thing.spot.goesWhen })),
    ...decor.map((d) => ({ look: d.def.look, word: d.def.word, prop: d.prop, at: d.def.at.x, glad: d.def.after, seated: false, paddles: false, standsAt: undefined, goesTo: undefined, goesWhen: undefined })),
  ].filter((stand) => stand.look === 'sign' && stand.prop !== null && personFor(stand.word) !== null);
  // One Mamma lays the pine and walks to the braid; the second call is only an interaction.
  if (chapter.id === 'myren') for (let i = stands.length - 1; i >= 0; i--) {
    if (stands[i]!.glad === 'braid' || stands[i]!.glad === 'bog:return-bridge') {
      stands[i]!.prop!.group.clear(); stands.splice(i, 1);
    }
  }
  for (const stand of stands) {
    const who = personFor(stand.word)!, rig = createRehearsalRig(who);
    stand.prop!.group.clear(); stand.prop!.group.add(rig.group);
    if (stand.standsAt) stand.prop!.group.position.set(stand.standsAt.x, stand.standsAt.y, stand.standsAt.z);
    // Whoever stands on a paddle board holds a paddle (./paddle.ts), in the world, gripped each frame.
    const paddle = stand.paddles ? createPaddle(rig.height) : undefined;
    if (paddle) scene.add(paddle.mesh);
    family.push({ rig, who, motion: createFamilyMotion(who, stand.at, stand.glad), at: stand.at, glad: stand.glad, was: false, joy: 0, seated: stand.seated, paddle,
      walk: stand.goesTo ? { to: stand.goesTo, when: stand.goesWhen, place: stand.prop!.group, home: stand.prop!.group.position.clone(), stride: 0, pace: 0, gait: 0, seen: false } : undefined,
      talker: createTalker(who, 211 + 17 * family.length) });
  }
  if (stage.actors.size > 0 && !standIns) {
    assets.manifest().then(async (manifest) => {
      for (const who of stage.actors.keys()) {
        if (!manifest.packs.private?.files[`${who}.glb`]) continue;
        const model = await assets.model('private', who).catch(error => {
          console.warn(`The private/${who} model could not be loaded; its rehearsal figure stays.`, error);
          return null;
        });
        if (!model) continue;
        const placed = stage.replace(who, model);
        wardrobeFor(stage.actors.get(who)!.rig, who, manifest);
        const height = stage.actors.get(who)!.rig.height;
        if (placed) characterShadows.add({ object: placed, height, radius: .45 * height / 5.2,
          active: () => placed.parent !== null && placed.visible });
        if (!models.includes(`private/${who}`)) models.push(`private/${who}`);
        modelInstallations++;
      }
    }).catch((error) => console.error('The family in the scenes could not be loaded; rehearsal shapes stay.', error));
  }
  if (!standIns && stands.length) {
    // `glad` is the flag that makes them glad: the candy he gives them, or the moment they come into the picture.
    assets
      .manifest()
      .then(async (manifest) => {
        for (const stand of stands) {
          const who = personFor(stand.word)!;
          if (!manifest.packs.private?.files[`${who}.glb`]) continue;
          const model = await assets.model('private', who).catch(error => {
            console.warn(`The private/${who} model could not be loaded; its rehearsal figure stays.`, error);
            return null;
          });
          if (!model) continue;
          // Modelled with Elof's height as the unit, and drawn as big as he is drawn when he is a boy.
          model.scale.setScalar(3);
          const one = family.find((one) => one.rig.group.parent === stand.prop!.group)!;
          const rig = createModelRig(model, heightOf(who));
          rig.group.userData.familyRole = who;
          rig.group.position.copy(one.rig.group.position);
          rig.group.quaternion.copy(one.rig.group.quaternion);
          one.rig.dispose?.();
          one.rig = rig;
          wardrobeFor(rig, who, manifest);
          one.neck = model.getObjectByName('neck_01') ?? model.getObjectByName('Head') ?? model.getObjectByName('head');
          if (chapter.id === 'myren' && who === 'mamma') one.braidTip = braidTip(model);
          stand.prop!.group.clear();
          stand.prop!.group.add(rig.group);
          characterShadows.add({ object: rig.group, height: rig.height, radius: .45 * rig.height / 5.2,
            groundY: () => chapter.id === 'norrsken' && homeJourney && who === 'pappa'
              ? playerGroundY : stand.prop!.group.position.y });
          if (!models.includes(`private/${who}`)) models.push(`private/${who}`);
          modelInstallations++;
        }
      })
      .catch((error) => console.error('Someone in the family could not be loaded; rehearsal shapes stay.', error));
  }

  const characterShadows = createCharacterShadows(renderer, scene, sun, { canopy: dappled });
  /** How far he has waded since his last ring on the water, and how long since his ride's wake left one. */
  let rippleWalked = 0, rippleWake = 0;
  let playerGroundY = chapter.spawn.y;
  let ghostGroundY = chapter.ghost?.[0]?.at.y ?? 0;
  let ghostStaged = false;
  characterShadows.add({ object: elof.group, height: 1, radius: .31, groundY: () => playerGroundY });
  characterShadows.add({ object: ghostPlace, height: 1, radius: .36, active: () => !ghostStaged, groundY: () => ghostGroundY });
  characterShadows.add({ object: helper.actor, height: ghostHelps ? 1 : .7, radius: .3,
    groundY: () => Math.min(helper.actor.position.y, heightOfGroundAt(chapter, helper.actor.position.x)) });
  if (chapter.follower && follower.group.children[0]) characterShadows.add({ object: follower.group.children[0], height: 1, radius: .3 });
  const animal = { ladybird: [.5, .45], jay: [.7, .34], ants: [.3, .5], crane: [2.2, .4] } as const;
  for (const stand of stands) {
    const model = stand.prop!.group.children[0]!;
    const height = heightOf(personFor(stand.word)!);
    characterShadows.add({ object: model, height, radius: .45 * height / 5.2,
      active: () => model.parent === stand.prop!.group && stand.prop!.group.visible,
      groundY: () => chapter.id === 'norrsken' && homeJourney && personFor(stand.word) === 'pappa'
        ? playerGroundY : stand.prop!.group.position.y });
  }
  // The family in the scenes stand on the ground as the family at the help points do: each rehearsal figure has
  // its shadow while it is drawn. A model from Blender that takes a figure's place brings its own.
  for (const actor of stage.actors.values()) {
    const body = actor.rig.group;
    characterShadows.add({ object: body, height: actor.rig.height, radius: .45 * actor.rig.height / 5.2,
      active: () => body.parent !== null && body.visible });
  }
  for (const thing of things) {
    const size = thing.spot.look && animal[thing.spot.look as keyof typeof animal];
    if (size && thing.prop) characterShadows.add({ object: thing.prop.group, height: size[0], radius: size[1] });
  }
  for (const carrier of carriers) if (carrier.prop && (carrier.ride.look === 'crane' || carrier.ride.look === 'ants')) {
    characterShadows.add({ object: carrier.prop, height: carrier.ride.look === 'crane' ? 1.6 : .3, radius: .7,
      groundY: () => Math.min(carrier.prop!.position.y, heightOfGroundAt(chapter, carrier.prop!.position.x)) });
  }
  characterShadows.setTier(tier);

  const camera = new PerspectiveCamera(FOV, 1, 0.1, 140);
  seeRich(camera, tier);
  let viewHeight = 5;
  let distance = 10;
  let pixelRatio = 1;
  let maxPixelRatio = 1;
  let resolutionSteps = 0;
  let resizes = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  const look = cameraIntent({ ...startState(chapter) }, chapter.cameras);
  let turn = 0;
  // His turn about, as a body turns round: it gathers speed and comes to rest facing the new way (./player-motion.ts).
  const turning = createTurning(turn);
  let squash = 1;
  let fallingSpeed = 0;

  function resize(): void {
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    maxPixelRatio = pixelRatioFor(tier, width, height, window.devicePixelRatio);
    resolutionSteps = Math.min(resolutionSteps, maxResolutionSteps(maxPixelRatio));
    const ratio = pixelRatioFor(tier, width, height, window.devicePixelRatio, resolutionSteps);
    // setPixelRatio + setSize would resize the canvas twice. Only do one allocation, when needed.
    if (cssWidth !== width || cssHeight !== height || pixelRatio !== ratio) {
      cssWidth = width;
      cssHeight = height;
      pixelRatio = ratio;
      renderer.setDrawingBufferSize(width, height, pixelRatio);
      resizes++;
    }
    if (tier === 'low') {
      hdr?.scene.dispose();
      hdr?.grade.dispose();
      hdr = null;
    } else {
      hdr ??= {
        scene: new WebGLRenderTarget(canvas.width, canvas.height, { type: HalfFloatType, stencilBuffer: false, depthTexture: new DepthTexture(canvas.width, canvas.height, UnsignedIntType) }),
        grade: new WebGLRenderTarget(canvas.width, canvas.height, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false }),
      };
      hdr.scene.setSize(canvas.width, canvas.height);
      hdr.grade.setSize(canvas.width, canvas.height);
      gradePass?.setSize(canvas.width, canvas.height);
    }
    // The lens's depth of field on Mid and High; Mid gathers from fewer points (./depth-blur.ts).
    depthBlur?.setSize(canvas.width, canvas.height, tier !== 'low', tier === 'high');
    contactShade?.setSize(canvas.width, canvas.height, tier !== 'low', tier === 'high');
    bloom?.setSize(canvas.width, canvas.height, tier === 'high');
    lightShafts?.setSize(canvas.width, canvas.height, tier !== 'low');
    water.setSize(canvas.width, canvas.height, tier);
    camera.aspect = width / height;
    // Elof is about 78 px tall on a phone held sideways, and the view is never narrower than 6 EL.
    const elofPx = clamp(height * 0.2, 75, 140);
    viewHeight = Math.max(height / elofPx, 6 / camera.aspect);
    distance = viewHeight / 2 / Math.tan((FOV * Math.PI) / 360);
    camera.updateProjectionMatrix();
  }
  resize();

  let ghostSize = 1;
  /** Elof's pose when a scene asks him to act. */
  const elofPose: Pose = { ...STANDING };
  /** A relative's legs and arms walking over to where they help from (Spot.goesTo). */
  const walkPose: Pose = { ...STANDING };
  /** The last scene shot, and how much of it the camera takes now: 1 in the scene, easing to 0 after it. */
  let lastShot: { x: number; y: number; z: number; height: number; width: number; eye: number } | null = null;
  let shotWeight = 0;
  /** How far behind the play plane the lens is focused: on it in play, further back for a shot of something there. */
  let focusBack = 0;
  /** Where Bertil's hands are at his boot while he pulls it off. */
  const bootAt = new Vector3();
  /** The root hole in the garden that the ghost crept into, where Moa reaches. */
  const ROOT_HOLE = { x: 163.4, y: 0 };
  const rootReach = new Vector3();
  /**
   * Moa's umbrella in Byn i stormen (the ride that floats him over the crossing): she holds it by its crook until he takes
   * it from her at the wall's edge, and then it carries him hanging from its crook (./umbrella-hold.ts). When she was
   * called, on the clock.
   */
  const umbrellaRide = chapter.id === 'stormbyn' ? carriers.find((c) => c.ride.look === 'umbrella' && c.prop) : undefined;
  const umbrellaBoard = umbrellaRide ? chapter.spots?.find((spot) => spot.ride === umbrellaRide.ride.id) : undefined;
  const umbrellaCarry = umbrellaRide ? createUmbrellaCarry() : null;
  const umbrellaHand = new Vector3(), umbrellaHeld = new Vector3(), umbrellaAxis = new Vector3();
  const umbrellaLower = new Vector3(), umbrellaUpper = new Vector3();
  /** How far down Moa is, holding it out to him at the wall's edge (./umbrella-hold.ts). */
  const umbrellaOut = createHoldingOut();
  /** Her fist round the umbrella's crook (./fingers.ts). */
  const UMBRELLA_GRIP = { kind: 'power' as const, size: 0.05 };
  const creepTo = new Vector3();
  /**
   * Moa's leaf drawing, blown out of her hand and back under the shaving bridge as the plane is ready (garden.ts,
   * `garden:drawing-blown`), so that it is seen to go where she says it went. A restored save does not replay it.
   */
  const blown = chapter.id === 'garden' ? spotProp({ id: 'blown', at: { x: 165.4, y: 2.6 }, verb: 'take', look: 'keepsake' }) : null;
  if (blown) { blown.group.visible = false; blown.group.scale.setScalar(1.6); scene.add(blown.group); }
  let blownAt = -1, blownSeen = false;
  /** Seconds since the ball he rides in Olympia was kicked; -1 when he is not on it. */
  let kickSince = -1;
  /** Bertil removes his cap, turns it over and sets it on the pool during the chapter's held preparation. */
  const capGift = chapter.id === 'granskog' ? carriers.find(carrier => carrier.ride.id === 'cap') : undefined;
  const capTime = chapter.later?.find(wait => wait.flag === 'family:cap-ready')?.seconds ?? 2.4;
  let capSince = -1;
  const capFrom = new Vector3(), capAt = new Vector3();
  const capKneel: Pose = { ...STANDING };
  /** How far into each of the family's own gestures they are, 0 to 1: Bertil's boot pull, Moa's reach into the root. */
  const gestures = new Map<string, { pull: number; reach: number; lift: number; liftFor: number; hold: number; stoop: number }>();
  const bootPull = createBootPull();
  /** Granskogen's seesaw board, which Pappa holds (props.ts); found the first time it is wanted. */
  let seesawPlank: Object3D | null | undefined;
  const gestureOf = (who: string) => { let g = gestures.get(who); if (!g) gestures.set(who, g = { pull: 0, reach: 0, lift: 0, liftFor: 0, hold: 0, stoop: 0 }); return g; };
  const lampTo = new Vector3(), lampAim = new Vector3(), lampHand = new Vector3(), lampLocal = new Vector3();
  const lampHeld = new Vector3(), upright = new Vector3(0, 1, 0);
  const LAMP_POINTS = new Vector3(0, 0, 1);
  /** A berry or a sweet between his thumb and his finger, and a sheet's corner (./fingers.ts). */
  const BERRY = { kind: 'pinch' as const, size: 0.05 }, PAPER = { kind: 'pinch' as const, size: 0.008 };
  /** The little one's knitted cap, held by its brim. */
  const CAP_PINCH = { kind: 'pinch' as const, size: 0.04 };
  // The little one's knitted cap ("Lillgubbens mössa! Jag tar med den."): from the gutter in Stormbyn Elof carries
  // it, tucked in at his back, through every chapter until he gives it back in the storm's eye (scene "motet").
  const carriedBerry = new Group();
  carriedBerry.name = 'carried-berry';
  {
    const red = new MeshStandardMaterial({ color: '#c0182a', roughness: 0.25 });
    const berry = new Mesh(new SphereGeometry(0.075, 12, 8), red);
    // Its little dry crown, and a glint.
    const crown = new Mesh(new SphereGeometry(0.022, 6, 4), new MeshStandardMaterial({ color: '#4a2a1a', roughness: 0.9 }));
    crown.position.set(0.05, 0.045, 0);
    carriedBerry.add(berry, crown);
    carriedBerry.visible = false;
    scene.add(carriedBerry);
  }
  const berryHand = new Vector3();
  // The golden geléhallon of Norrsken, as he tastes it: a raspberry of golden beads (as props.ts 'gold').
  const carriedGold = new Group();
  carriedGold.name = 'carried-gold';
  {
    const gold = new MeshStandardMaterial({ color: '#ffcf3a', roughness: 0.25, emissive: '#d99a00', emissiveIntensity: 0.7 });
    const bead = new SphereGeometry(0.035, 8, 6);
    for (let i = 0; i < 9; i++) {
      const b = new Mesh(bead, gold);
      b.position.set(Math.cos(i * 2.4) * 0.045 * (1 - i / 14), i * 0.011, Math.sin(i * 2.4) * 0.045 * (1 - i / 14));
      carriedGold.add(b);
    }
    carriedGold.visible = false;
    scene.add(carriedGold);
  }
  // The old trägubbe's golden geléhallon in Stormens öga ("Ett geléhallon i guldpapper!"): held up before him from when he
  // takes it until he tastes it, when the scene `stor` has it in his hand (./stage.ts).
  const carriedGift = chapter.id === 'stormoga' ? goldSweet() : null;
  if (carriedGift) {
    carriedGift.name = 'carried-gift';
    drawnWhile(carriedGift, false);
    scene.add(carriedGift);
  }
  // Moa's leaf drawing, found under the shaving bridge: a sheet of paper with a green leaf drawn on it in crayon.
  const carriedDrawing = new Group();
  carriedDrawing.name = 'carried-drawing';
  {
    const paper = new Mesh(new PlaneGeometry(0.26, 0.2), new MeshStandardMaterial({ color: '#f4efe2', roughness: 0.95, side: DoubleSide }));
    const leaf = new Mesh(new CircleGeometry(0.06, 12).scale(1.5, 0.75, 1).rotateZ(0.5), new MeshStandardMaterial({ color: '#5f9a34', roughness: 0.9, side: DoubleSide }));
    leaf.position.z = 0.002;
    const stem = new Mesh(new PlaneGeometry(0.06, 0.008).rotateZ(0.5), new MeshStandardMaterial({ color: '#4a6e26', roughness: 0.9, side: DoubleSide }));
    stem.position.set(-0.075, -0.045, 0.003);
    carriedDrawing.add(paper, leaf, stem);
    carriedDrawing.visible = false;
    scene.add(carriedDrawing);
  }
  const carriedCap = new Group();
  carriedCap.name = 'carried-cap';
  carriedCap.add(new Mesh(new ConeGeometry(0.16, 0.3, 10).translate(0, 0.15, 0), new MeshStandardMaterial({ color: '#c23a2e', roughness: 0.9 })));
  const bobble = new Mesh(new SphereGeometry(0.06, 10, 8), new MeshStandardMaterial({ color: '#f4efe4', roughness: 0.9 }));
  bobble.position.y = 0.31;
  carriedCap.add(bobble);
  carriedCap.visible = false;
  scene.add(carriedCap);
  const capTilt = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI * 0.8);
  // The doll's raincoat between the doll and his back, and laid on the stone in the storm's eye (./elof-coat.ts).
  const heldCoat = holdsCoat(chapter) ? createHeldCoat(chapter) : null;
  if (heldCoat) scene.add(heldCoat.group);
  /** Stormkvällen's flashlight: Elof carries it from the table, and Pappa has it from then on. */
  let carriedLamp: Mesh | null = null;
  const pappasLampBeam = chapter.id === 'stormkvall' ? stage.group.getObjectByName('stage-thing:lamp-pappa')?.getObjectByName('lamp-beam') : undefined;
  const holdLamp = (lamp: Mesh, rig: Pick<Rig, 'hand' | 'grasp' | 'socket'>, side: 0 | 1, facing: number, size: number) => {
    lampAim.set(Math.sin(facing), -0.3, Math.cos(facing)).normalize();
    if (rig.grasp && rig.socket) {
      // Closed round the lamp's body, the hand turned with its light, out past the thumb (./fingers.ts).
      const grip = { kind: 'power' as const, size: 0.075 * size };
      rig.grasp(side, grip, rig.socket(side, grip, lampHand), lampAim, lampHand, 1, lampHeld);
      lamp.position.copy(lampHand).addScaledVector(lampHeld, -0.06 * size);
      lamp.quaternion.setFromUnitVectors(LAMP_POINTS, lampHeld);
    } else {
      rig.hand(side, lampHand);
      lamp.position.copy(lampHand);
      lamp.quaternion.setFromUnitVectors(LAMP_POINTS, lampAim);
    }
    lamp.scale.setScalar(size);
    lamp.getObjectByName('lamp-beam')!.visible = tier !== 'low';
  };
  // The ledge that is Klonk frozen in Pappa's beam (Stormskogen), which his lamp is held on.
  const frozenLedge = chapter.storm?.frozen ? chapter.ledges?.find((ledge) => ledge.needs === chapter.storm!.frozen) : undefined;
  /** The rain gear each body wears now, by its key, so that it is changed only when it changes. */
  const dressed = new WeakMap<object, string>();
  // Where the family will put their gear on in this chapter, the pieces are made with the body, hidden, so that they are
  // drawn in the warm-up and nothing is compiled as they go on (./rain-gear.ts). Elof's doll's coat too.
  const putsOn = chapter.storm !== undefined && (chapter.storm.rain ?? 0) > 0;
  const dressFor = (rig: Pick<Rig, 'dress'>, who: string, flags: ReadonlySet<string>, scene: SceneFrame | null, calm: boolean, size = 1) => {
    if (!rig.dress) return;
    const gear = rainGearFor(chapter, who, flags, scene, calm, size);
    const on = gear?.on ? `${gear.on.coat.toFixed(3)},${gear.on.boots[0].toFixed(3)},${gear.on.boots[1].toFixed(3)}` : '';
    const key = gear ? `${gear.coat}${gear.boots}${gear.bootOff}${gear.first}${on}` : '';
    if (dressed.get(rig) === key) return;
    dressed.set(rig, key);
    rig.dress(gear, putsOn);
  };
  // "Min keps blir din båt, lillebror.": Bertil's cap is off his head once he has lent it, in Granskogen.
  const bared = new WeakMap<object, boolean>();
  const bareFor = (rig: Pick<Rig, 'bareHead'>, who: string, flags: ReadonlySet<string>) => {
    const bare = who === 'bertil' && chapter.id === 'granskog' && (flags.has('family:cap-ready') || capSince >= capTime * 0.12);
    if (!rig.bareHead || (bared.get(rig) ?? false) === bare) return;
    bared.set(rig, bare);
    rig.bareHead(bare);
  };
  /** How far the eye has risen over water, 0 to 1. */
  let overWater = 0;
  /**
   * The pools and brooks of the chapter, where the eye rises: still water, not the river, and not the street's
   * puddle, whose shot keeps the church and its belfry framed under the top edge (tests/browser/bredbyn.mjs).
   */
  const pools = chapter.river || chapter.place === 'village' ? [] : chapter.water ?? [];
  /** How far behind the play plane the lens keeps sharp (./depth-blur.ts): deeper while a shot is on the family. */
  let sharpDeep = DOF_DEEP;
  const playAim = new Vector3();
  let warm = 2;
  let warmedFor = 0;
  let hasFrame = false;
  let inEndingShot = false;
  let warming = true;
  const unculled: Object3D[] = [];
  const idle: Object3D[] = [];
  const projectedPlayer = new Vector3();
  let reaction: Reaction | null = null;
  let responseFor = 0;
  let calmResponse = false;
  const project = (point: Vector3, bounds = 1.05): Vec | null => {
    if (!hasFrame) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    point.project(camera);
    if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || Math.abs(point.z) > 1 || Math.abs(point.x) > bounds || Math.abs(point.y) > bounds) return null;
    return { x: rect.left + (point.x + 1) * rect.width / 2, y: rect.top + (1 - point.y) * rect.height / 2 };
  };

  /** Draws the current scene without advancing a camera, animation or simulation clock. */
  function draw(): void {
    renderer.info.reset();
    if (warm > 0) {
      water.applyCaustics(scene);
      characterShadows.prepareReceivers();
      rimLight.apply(scene);
      materialGrade.apply(scene);
      for (const lift of lifts) lift.patch?.(scene);
      // What only Mid and High draw (./rich.ts) is laid here, so that a model which arrived late is laid too.
      layRich(scene);
      // What the water mirrors as it is (./water.ts): him, what he rides and carries, the ghost, the family, the candy
      // and what goes over the water; tagged here, so that a model which arrived late is tagged too.
      water.mirrorNear(scene, [
        elof.group, ghostPlace, trail.group, stage.group, helper.group, afloat.group, carriedBerry, carriedGold, carriedDrawing, carriedCap, ...(carriedGift ? [carriedGift] : []),
        ...carriers.map((carrier) => carrier.prop), ...family.flatMap((one) => [one.rig.group, one.paddle?.mesh]), ...moversOnWater,
      ]);
      scene.traverse((object) => {
        // What is out of the picture for having nothing to draw (./idle.ts) is drawn in these frames all the
        // same, as it is: at no size, or unseen. Its shader, its shape and its picture are made here, not in play.
        if (object.userData.idle === true && !object.visible) {
          object.visible = true;
          idle.push(object);
        }
        if (!object.frustumCulled) return;
        object.frustumCulled = false;
        unculled.push(object);
      });
    }
    try {
      renderer.setRenderTarget(hdr?.scene ?? null);
      if (warm > 0) {
        // Frustum warmup alone skips hidden parents, including the family revealed at nightfall.
        // compile traverses their materials without drawing them, using this tier's actual target.
        renderer.compile(scene, camera);
      }
      // A normal (non-XR) render target uses linear output without material tone mapping. The water is in
      // this pass: on High it copies the picture so far just before it is drawn, and only while it is in
      // sight (water.ts). No second scene render and no read/write feedback.
      // On Mid and High, what is near the water first, from under it, for the water to mirror (./water.ts).
      if (hdr) water.reflect(renderer, scene, camera, camera.position.x);
      renderer.render(scene, camera);
      if (hdr && gradePass && outputPass) {
        bloom?.render(renderer, hdr.scene);
        gradePass.setBloom(bloom?.texture ?? null);
        // The final macro shot focuses on the window figure, outside the usual z=0 play plane.
        if (hdr.scene.depthTexture) contactShade?.render(renderer, hdr.scene.depthTexture, camera);
        const shade = contactShade?.texture ?? null;
        gradePass.setShade(shade, SHADE_STRENGTH);
        if (!inEndingShot) depthBlur?.render(renderer, hdr.scene, camera, sharpDeep, { texture: shade, strength: SHADE_STRENGTH }, camera.position.z + focusBack);
        gradePass.setDepthBlur(inEndingShot ? null : depthBlur?.texture ?? null, hdr.scene.depthTexture, camera.near, camera.far, camera.position.z + focusBack, sharpDeep);
        lightShafts?.render(renderer, hdr.scene, camera, scene, gradePass, warm > 0);
        gradePass.render(renderer, hdr.grade, hdr.scene);
        outputPass.render(renderer, hdr.grade, hdr.grade, 0, false);
      }
    } finally {
      renderer.setRenderTarget(null);
      if (warm > 0) {
        for (const object of unculled) object.frustumCulled = true;
        for (const object of idle) object.visible = false;
        unculled.length = 0;
        idle.length = 0;
        warm--;
      }
    }
  }

  function render({ prev, curr, alpha, dt, eventDt, atGoal, collected, side, checkpoint, movers, drips, flags, ghost: ghostState, rollers, tussocks, gusts, help, berries, noteHits, prologue, scene: sceneFrame, ending, talk: words }: Frame): void {
    // What is said this frame, for every body that says or hears it (./talk.ts).
    const lifeDt = dt;
    talk.hear(words, lifeDt);
    // A reading stop holds the visible event as well as the simulation: the flying carving, a lowered scarf,
    // a door and its walker must stay with the scene's shot. Breathing and speech have their own time below.
    dt = words?.reading ? 0 : eventDt ?? dt;
    lifeClock += lifeDt;
    homeRoutine?.update(flags, sceneFrame, lifeClock);
    inEndingShot = !!chapter.epilogue && ending !== null && ending !== undefined;
    rain.update(drips, dt);
    epilogueStage.update(flags, ending, lessMotion());
    moverMotion.update(movers, dt, lessMotion());
    eddyLift = eddy?.update(movers, moverMeshes, clock, lessMotion()) ?? 0;
    // On the life clock: the water already in the air falls on while the words about it are read.
    rainBarrel?.update(movers, lifeDt, lessMotion(), water);
    if (chapter.id === 'norrsken') {
      const eyes = scene.getObjectByName('first-carving-eyes');
      if (eyes) eyes.visible = flags.has('eyes');
    }
    const x = lerp(prev.x, curr.x, alpha);
    const y = lerp(prev.y, curr.y, alpha);
    const bathroom = homeRoutine?.body({ x, y });
    const onShoulders = chapter.id === 'norrsken' && curr.mode === 'ride' && flags.has('home');
    if (onShoulders) homeJourney = true;
    const wantShoulders = onShoulders ? 4.25 : 0;
    const calmStory = lessMotion();
    if (capGift) capSince = !flags.has('cap:ready') ? -1 : flags.has('family:cap-ready') || calmStory ? capTime : capSince < 0 ? 0 : Math.min(capTime, capSince + dt);
    // Up onto Pappa's shoulders and down again in half a second, starting and stopping softly.
    const shoulderWant = wantShoulders > 0 ? 1 : 0;
    shoulderT = calmStory ? shoulderWant : shoulderT + Math.sign(shoulderWant - shoulderT) * Math.min(Math.abs(shoulderWant - shoulderT), dt / 0.5);
    shoulderLift = 4.25 * smooth(shoulderT);
    clock += dt;
    // A scarf lowered to him, hanging, carrying him or gathered in: he hangs by his hands while it carries him.
    scarves?.frame(flags, curr.mode === 'ride', x, dt);
    const onScarf = scarves?.carrying === true;
    // What lives on a mover moves of itself: the ants under Granskogen's needle mats.
    for (const mesh of moverMeshes) (mesh.children[0]?.userData.tick as ((at: number) => void) | undefined)?.(clock);
    // The scene playing now, if any: where the family and the ghost are, what they do, and the shot (./stage.ts).
    const directions = stage.update(sceneFrame ?? null, flags, { x, y }, lifeClock, lifeDt, calmStory);
    responseFor = Math.max(0, responseFor - dt);
    const response = responseFor > 0 ? (calmResponse ? 0.15 : Math.sin((0.85 - responseFor) * 24) * responseFor / 0.85) : 0;
    if (responseFor === 0) reaction = null;
    trail.update(collected, flags, x, y, dt, clock, reaction?.kind === 'candy' ? reaction.index : undefined, response,
      chapter.prologue && ghostState ? ghostState.x : Infinity);
    sideTrail.update(side ?? noSide, flags, x, y, dt, clock);
    ledges.update(flags, dt, movers);
    glints.update(flags, clock, lessMotion());
    lawnSong.update(flags, clock);
    for (const hit of noteHits ?? []) noteStrikes.set(hit.id, hit.serial);
    cones.update(rollers, clock);
    water.update(clock, lessMotion(), x, flags);
    // Rings where he touches the water (./water.ts): his steps as he wades, a bigger one as he lands in it or falls
    // in, and a wake behind what he rides on it.
    const surface = water.surfaceAt(x);
    // A walked ride (Ride.ground): he goes on his own feet, wading where it goes through the water, and is drawn walking.
    const walkedRide = curr.mode === 'ride' && carriers.some((c) => c.ride.ground && x >= c.ride.from.x - 0.5 && x <= c.ride.to.x + 0.5);
    if (surface !== null && dt > 0 && !calmStory) {
      const feet = walkedRide ? y : curr.standY ?? y;
      const wading = (walkedRide || curr.mode === 'free' && curr.grounded) && feet > surface - 0.7 && feet < surface + 0.3;
      if (wading) {
        rippleWalked += Math.abs(curr.x - prev.x);
        // A boy grown big wades with bigger steps, and bigger rings.
        if (rippleWalked > 0.55 * Math.max(1, tall * 0.6)) { rippleWalked = 0; water.ripple(x, 0.05, 0.5 * Math.max(1, tall * 0.6)); }
        if (!prev.grounded && !walkedRide) water.ripple(x, 0.05, 1.1);
      } else rippleWalked = 0;
      if (curr.mode === 'bubble' && prev.mode !== 'bubble' && y < surface + 0.6) water.ripple(x, 0.05, 1.4);
      const afloatHere = curr.mode === 'ride' && !walkedRide && Math.abs(y - surface) < 0.8 && Math.abs(curr.x - prev.x) > 1e-4;
      rippleWake = afloatHere ? rippleWake + dt : 0.3;
      if (rippleWake >= 0.3) {
        rippleWake = 0;
        if (afloatHere) water.ripple(x - 0.45 * Math.sign(curr.x - prev.x), 0.05, 0.65);
      }
    }
    afloat.update(clock, water.level, lessMotion());
    for (const [i, t] of tussocks.entries()) tussockMeshes[i]?.position.set(t.x, t.y, 0);
    // A cranberry goes flat under him and springs back, a little past its shape.
    for (const [i, b] of (berries ?? []).entries()) {
      const flat = b.squash * b.squash;
      const spring = Math.sin(b.squash * Math.PI * 3) * 0.12 * b.squash;
      berryMeshes[i]?.scale.set(1 + 0.3 * flat - spring * 0.5, 1 - 0.5 * flat + spring, 1 + 0.3 * flat - spring * 0.5);
    }
    mist.update(flags, x, y, curr.facing, camera.position.z, dt, lanternHeld ? lanternHand : null);
    // The water takes less of the haze than the ground does, so that a brook seen from above stays water; in the mist,
    // all of it, so that the bog's water is lost in it as everything else is (./water.ts).
    water.setHaze(mist.thick());
    const gust = wind.update(gusts, clock);
    climbs.update(flags, dt, clock, lessMotion());
    follower.update(flags, curr, clock, dt);
    // On a ride he sits on Moa's paper plane, which points the way it flies.
    const riding = curr.mode === 'ride';
    // Which ride he is on is read from where he is: no two rides share a stretch.
    const carrier = riding ? carriers.find((c) => x >= c.ride.from.x - 0.5 && x <= c.ride.to.x + 0.5) : undefined;
    kickSince = carrier?.ride.id === 'kick' ? (kickSince < 0 ? 0 : kickSince + dt) : -1;
    const prepared = carrier?.ride.id === 'plane' && flags.has('moa') || carrier?.ride.id === 'cap' && flags.has('cap:ready');
    const size = riding ? Math.min(1, prepared ? 1 : curr.t / 0.05, (1 - curr.t) / 0.05) : 0;
    const heading = riding ? Math.atan2(curr.y - prev.y, Math.max(1e-4, curr.x - prev.x)) : 0;
    // What does not carry him now lies under his feet at no size, and is out of the picture (./idle.ts).
    const waitingPlane = chapter.id === 'garden' && flags.has('moa') && !flags.has('plane:board');
    const planeSize = waitingPlane ? 1 : carrier && carrier.ride.look !== undefined && carrier.ride.look !== 'plane' ? 0 : size;
    plane.scale.setScalar(planeSize);
    drawnWhile(plane, planeSize > 0);
    const planeStart = waitingPlane ? chapter.rides?.find(ride => ride.id === 'plane')?.from : undefined;
    plane.position.set(planeStart?.x ?? x, (planeStart?.y ?? y) - 0.05, 0);
    plane.rotation.z = waitingPlane ? 0 : heading;
    // Waiting (garden), it rests on the grass tops a little behind him, nose up and its folded back turned to the
    // picture: flat on the ground it sank into the lawn under his boots, and only a sliver showed (12 November 2026).
    if (waitingPlane) { plane.position.y += 0.4; plane.position.z = -0.45; plane.rotation.z = 0.12; }
    plane.rotation.x = waitingPlane ? 0.5 : 0;
    for (const c of carriers) {
      if (!c.prop) continue;
      if (c === carrier) { c.wasRidden = true; c.landed = 0; }
      else if (c.wasRidden) { c.wasRidden = false; c.landed = 0; c.setDown.copy(c.prop.position); }
      else c.landed += dt;
      // What he is told to step onto lies ready where he boards it, from when it is ready until he does: Moa's cap in
      // Granskogen, and in the storm Bertil's boot on the flooded lawn ("Min stövel blir din båt. Kliv i!"), Moa's
      // umbrella on the wall, the raft and the birch leaves on the water.
      const boarding = WAITS_READY.has(c.ride.look ?? '') ? chapter.spots?.find((spot) => spot.ride === c.ride.id && spot.look === undefined) : undefined;
      const waiting = (chapter.id === 'granskog' && c.ride.id === 'cap' && flags.has('cap:ready') && !flags.has('cap'))
        || (!!boarding && c !== carrier && !flags.has(boarding.id) && (boarding.needs === undefined || flags.has(boarding.needs)));
      const football = c.ride.look === 'football';
      const scored = football && flags.has(chapter.spots?.find(spot => spot.ride === c.ride.id)?.id ?? '') && x >= c.ride.to.x - 0.1 && c !== carrier;
      // Roll away into the goal promptly, so his soft step down clears the ball instead of passing through it.
      const rolling = scored ? 2 * smooth(c.landed / 0.4) : 0;
      // A crane sets him down and flies on, up and away: it shrank into the rock under him and was gone (PR #242's audit).
      const crane = c.ride.look === 'crane';
      const away = crane && c !== carrier && !calmStory && c.landed < CRANE_AWAY ? c.landed / CRANE_AWAY : -1;
      // (A ridden football lies on the ground at once, in the place of the one he climbs, so it is never grown from nothing.)
      const propSize = waiting || scored || away >= 0 ? 1 : c === carrier ? football ? 1 : crane ? Math.min(1, curr.t / 0.05) : size : 0;
      c.prop.scale.setScalar(propSize);
      drawnWhile(c.prop, propSize > 0);
      c.prop.position.set(waiting ? c.ride.from.x : scored ? c.ride.to.x + rolling : x, (waiting ? c.ride.from.y : scored ? c.ride.to.y : y) - 0.05, scored ? -rolling : 0);
      // Coming down to the ground its body stays over it, and he steps down off its back; then it flies on from there.
      if (crane && c === carrier) c.prop.position.y = Math.max(c.prop.position.y, heightOfGroundAt(chapter, x) + CRANE_BELLY);
      // Olympia's free kick (finetune pass, 12 November 2026): the ball lies on the turf as the ride sets off, just behind
      // him as he hops up onto it, and comes under his feet as he rises. It sank into the turf under him before.
      if (football && c === carrier) {
        const ground = heightOfGroundAt(chapter, x);
        c.prop.position.y = Math.max(c.prop.position.y, ground + FOOTBALL_TOP);
        c.prop.position.z = -0.6 * (1 - smooth((y - ground) / FOOTBALL_TOP));
      }
      // It rises away behind him, not through him where he has just stepped down.
      if (away >= 0) c.prop.position.set(c.setDown.x + away * 6 + away * away * 4, c.setDown.y + away * 1.2 + away * away * 7, -1.2 * smooth(Math.min(1, away * 4)) - away * 2);
      // A boat lies level on the water; a bird points the way it flies, and beats its wings.
      // A bird beats with a strong downstroke and a quicker upstroke, glides between bursts, and nods with each beat;
      // its wing tips follow a little behind.
      const wings = wingbeat(clock, 1.1, { every: 6.5, glide: 1.8, held: -0.2 });
      const flying = c.ride.look !== 'cap' && !waiting;
      c.prop.rotation.z = football ? 0 : !flying ? calmStory ? 0 : Math.sin(clock * 2.4) * 0.05 : (away >= 0 ? 0.35 * smooth(away * 3) : heading * 0.6) + wings.pitch;
      if (football && c.prop.children[0]) c.prop.children[0].rotation.z = -(c.prop.position.x - c.ride.from.x) / 0.8;
      const beat = wings.lift * 0.75;
      const lag = wingbeat(clock - 0.12, 1.1, { every: 6.5, glide: 1.8, held: -0.2 }).lift * 0.75;
      const near = c.prop.getObjectByName('wingNear');
      const far = c.prop.getObjectByName('wingFar');
      // The near wing, between him and the lens, rises only to about level, so it never hides him.
      if (near) near.rotation.x = -(beat > 0 ? beat * 0.12 : beat);
      if (far) far.rotation.x = beat;
      for (const name of ['wingTipNear', 'wingTipFar']) {
        const tip = c.prop.getObjectByName(name);
        if (tip) tip.rotation.x = -(lag - beat) * 0.9 - 0.08;
      }
    }
    // Moa's umbrella carries him hanging from its crook by both hands, come there from her hand (./umbrella-hold.ts).
    const umbrellaHung = !!umbrellaCarry && !!carrier && carrier === umbrellaRide;
    if (umbrellaHung) umbrellaCarry!.carry(umbrellaRide!.prop!, x, y, tall, Math.min(1, (1 - curr.t) / 0.05), clock, dt, calmStory);
    for (const [i, thing] of things.entries()) {
      if (thing.prop) thing.prop.group.rotation.z -= thing.reactionTurn;
      // The light counterweight tips the same board only during its safe bounce, then resets for another try.
      const trialTip = chapter.counterweight && thing.spot.id === chapter.counterweight.launch && riding
        && x < chapter.counterweight.to && flags.has(chapter.counterweight.trial ?? chapter.counterweight.launch) && !flags.has(chapter.counterweight.launch);
      thing.prop?.update(flags.has(thing.spot.id) || !!trialTip, clock, dt, noteStrikes.get(thing.spot.id));
      // The ghost's sweet on the vittra's doorstep, from when he sees it given away.
      if (thing.spot.look === 'vittra-door') { const sweet = thing.prop?.group.getObjectByName('vittra-candy'); if (sweet) sweet.visible = flags.has('beat:vittra'); }
      thing.reactionTurn = reaction?.kind === 'spot' && reaction.index === i ? response * 0.14 : 0;
      if (thing.prop) thing.prop.group.rotation.z += thing.reactionTurn;
      // Something a scene brings out (Spot.after) is not there before: from its moment it rises into its place
      // and grows, and it shrinks away as before once used. A game taken up later finds it in place.
      if (thing.prop && thing.spot.after !== undefined) {
        const out = flags.has(thing.spot.after);
        thing.risen = !out ? 0 : !hasFrame || lessMotion() ? 1 : Math.min(1, thing.risen + dt / SPOT_RISE);
        const rise = thing.risen * thing.risen * (3 - 2 * thing.risen);
        thing.prop.group.position.y = thing.spot.at.y - SPOT_RISE_FROM * (1 - rise);
        if (!flags.has(thing.spot.id)) thing.prop.group.scale.setScalar(0.2 + 0.8 * rise);
        drawnWhile(thing.prop.group, out && thing.prop.group.scale.x > 0);
      }
      // Shy lights take turns appearing; unrevealed ones must not betray the hiding place.
      // One that has been taken has shrunk away, and stays out of the picture.
      if (thing.prop && thing.spot.look === 'wisp') thing.prop.group.visible = (thing.spot.needs === undefined || flags.has(thing.spot.needs)) && thing.prop.group.scale.x > 0;
      if (thing.prop && (thing.spot.word === 'gardenBoard' || thing.spot.word === 'capBoard')) {
        thing.prop.group.visible = flags.has(thing.spot.needs!) && !flags.has(thing.spot.id);
      }
      // The star comes from the torn bag; the returned bag is offered only after the repaired eyes.
      if (thing.prop && chapter.prologue && thing.spot.id === 'star') {
        const spilled = flags.has('blink') && flags.has('bag:torn') && (starDropTime > 0 || (x >= 37.5 && (ghostState?.x ?? 0) >= 40.5));
        if (spilled && dt > 0) starDropTime = Math.min(.65, starDropTime + dt);
        const progress = lessMotion() ? 1 : Math.min(1, starDropTime / .65);
        thing.prop.group.visible = spilled && !flags.has('star');
        thing.prop.group.position.set(thing.spot.at.x + (1 - progress) * .3,
          thing.spot.at.y + (1 - progress * progress) * .9, -.35);
      }
      if (thing.prop && chapter.id === 'norrsken' && thing.spot.id === 'bag') {
        thing.prop.group.visible = flags.has('eyes') && !flags.has('bag');
        const tear = thing.prop.group.getObjectByName('saturday-bag-tear');
        if (tear) tear.visible = true;
      }
    }
    if (blown) {
      if (flags.has('garden:drawing-blown') && !blownSeen) { blownSeen = true; if (hasFrame) blownAt = clock; }
      const k = blownAt < 0 ? 1 : (clock - blownAt) / 4.6;
      blown.group.visible = k < 1;
      if (k < 1) {
        // Out of her hand and up on the gust, fluttering by her where it is seen, then away back over the lawn to where
        // it lies under the shaving bridge (garden.ts, `garden:paper`).
        const lift = Math.min(1, k / 0.3), glide = Math.max(0, (k - 0.3) / 0.7);
        // From her hand a step behind the path (garden.ts, the `moa` spot's `standsAt`), forward onto it as it goes.
        blown.group.position.set(165.5 - 1.2 * lift - 23.2 * glide, 1.8 + 1.8 * lift - 5.4 * glide ** 1.5 + Math.sin(clock * 6) * 0.15 * (1 - glide), -0.8 * (1 - k));
        blown.group.rotation.set(Math.sin(clock * 3.1) * 0.7, Math.sin(clock * 2.3) * 0.5, clock * 4);
      }
    }
    rescuedFigures?.restore();
    for (const d of decor) {
      d.prop?.update(d.def.until !== undefined && flags.has(d.def.until), clock, dt);
      if (d.prop && d.def.after !== undefined) d.prop.group.visible = flags.has(d.def.after) && d.prop.group.scale.x > 0;
      // The doorway tableau takes over Mamma's opening mark; never draw her twice when private models load.
      if (d.prop && chapter.prologue && d.def.word === 'callMamma') d.prop.group.visible = false;
    }
    // The POFF: he shrinks, or grows back, in a little more than a second, in a swarm of glitter.
    let poff = false;
    if (sized) {
      const big = (sized.after === undefined || flags.has(sized.after)) && (sized.until === undefined || !flags.has(sized.until));
      const want = directions.elof?.size ?? (big ? sized.scale : 1);
      if (!hasFrame) tall = want; // A restored small Elof must not replay a change that already happened.
      poff = tall !== want;
      tall = directions.elof?.size != null ? want : tall + Math.sign(want - tall) * Math.min(Math.abs(want - tall), ((sized.scale - 1) * dt) / 1.2);
    }
    helper.update(help, x, y, curr.standY, clock, dt, lessMotion(), ghostPlace.visible ? ghostPlace.position : undefined);
    // The helper is the same friend, not a second ghost alongside the one he is following.
    ghostPlace.visible = chapter.ghost !== undefined && !(ghostHelps && helper.active);
    hiddenSweets.update(flags, clock, dt, reaction?.kind === 'hidden' ? reaction.index : undefined, response);
    glance.update(flags, ghostState, clock, dt);
    glitter.update(curr.bubble, x, y, clock);
    if (wetOutside) footSplash.update(true, x, curr.standY ?? y, curr.grounded, curr.mode === 'free' && curr.grounded, curr.vy, curr.facing, tall, dt, lessMotion());
    // He hangs by his hands, his body along the lace.
    // Hooking on and letting go, he swings into the lace's line and out of it over a moment, not in one frame.
    if (curr.hook) hangLast = Math.atan2(curr.hook.x - x, curr.hook.y - (y + 0.5));
    hangWeight = calmStory ? (curr.hook ? 1 : 0) : hangWeight + ((curr.hook ? 1 : 0) - hangWeight) * ease(curr.hook ? 18 : 9, dt);
    const hang = hangLast * hangWeight;

    // The simulation says where to look; the view only smooths it. Walking a ride he is looked at as he walks, at the
    // height of the way's two ends, not dipping into the shallows with his feet.
    const walked = walkedRide ? carriers.find((c) => c.ride.ground && x >= c.ride.from.x - 0.5 && x <= c.ride.to.x + 0.5)!.ride : null;
    const level = walked ? lerp(walked.from.y, walked.to.y, clamp((x - walked.from.x) / (walked.to.x - walked.from.x), 0, 1)) : 0;
    const want = { ...cameraIntent(walked ? { ...curr, y: level, mode: 'free', grounded: true, groundY: level, standY: level } : curr, chapter.cameras) };
    codaFor = coda && atGoal ? Math.min(CODA_EASE, codaFor + dt) : 0;
    if (codaFor > 0) {
      const out = codaFor / CODA_EASE;
      const breath = out * out * (3 - 2 * out);
      // Back a little over the way he came, and up: him small in the place he has crossed, under its sky.
      want.zoom *= 1 + 0.5 * breath;
      want.x -= 1.6 * breath * curr.facing;
      want.y += 1.1 * breath;
    }
    look.zoom += (want.zoom - look.zoom) * ease(1.6, dt);
    look.x += (want.x - look.x) * ease(3, dt);
    look.y += (want.y - look.y) * ease(2.5, dt);
    const centreY = look.y + viewHeight * look.zoom * (0.5 - GROUND_FROM_BOTTOM);
    // Over a brook or a pool the eye rises a little and looks down onto the water, so that its surface reads as
    // water and not as a thin band at his feet (Olov: "har vi fixat vattnet och bäckarna?"). Where he stands in
    // the picture does not change: the camera still aims at the same point. Eased in and out.
    const wantOverWater = !calmStory && pools.some((w) => look.x > w.from - 3 && look.x < w.to + 3 && Math.abs(look.y - w.y) < 4) ? 1 : 0;
    overWater += (wantOverWater - overWater) * ease(1.2, dt);
    if (calmStory) overWater = 0;
    camera.position.set(look.x, centreY + (chapter.place === 'forest' ? BROOK_EYE : POOL_EYE) * overWater * look.zoom, distance * look.zoom);
    camera.lookAt(look.x, centreY, 0);
    const nearbyFamily = stands.find((stand) => stand.prop!.group.visible && Math.abs(stand.prop!.group.position.x - x) < 3.4 &&
      Math.abs(stand.prop!.group.position.y - y) < 3.5 && curr.mode !== 'ride' && curr.mode !== 'fly');
    // The near shots (beside one of the family, the taste in Norrsken, on Pappa's shoulders) glide in and out over
    // half a second or so instead of cutting, each from wherever the camera was.
    camAt.set(look.x, centreY, 0);
    const shotIn = (shot: NearShot, wanted: boolean, px: number, py: number, pz: number, ax: number, ay: number) => {
      if (wanted) { shot.pos.set(px, py, pz); shot.at.set(ax, ay, 0); }
      shot.w = calmStory ? (wanted ? 1 : 0) : shot.w + ((wanted ? 1 : 0) - shot.w) * ease(5, dt);
      if (shot.w < 0.001) return;
      const k = smooth(shot.w);
      camera.position.lerp(shot.pos, k);
      camAt.lerp(shot.at, k);
    };
    {
      const centreX = nearbyFamily ? (nearbyFamily.prop!.group.position.x + x) / 2 : 0;
      const familyY = nearbyFamily ? nearbyFamily.prop!.group.position.y : 0;
      const shotHeight = Math.max(viewHeight * look.zoom, 7.8 + Math.abs(familyY - y), 8.8 / camera.aspect);
      const bothY = (familyY + y) / 2 + 2.2;
      shotIn(nearShots.family, !!nearbyFamily && !chapter.epilogue, centreX, bothY, shotHeight / 2 / Math.tan(FOV * Math.PI / 360), centreX, bothY);
    }
    {
      const shotHeight = Math.max(8.4, 10.2 / camera.aspect);
      shotIn(nearShots.taste, chapter.id === 'norrsken' && flags.has('taste') && x >= 26 && x <= 33 && !flags.has('home'),
        28.7, 2.1, shotHeight / 2 / Math.tan(FOV * Math.PI / 360), 28.7, 2.1);
    }
    {
      const shotHeight = Math.max(10.2, 8.8 / camera.aspect);
      shotIn(nearShots.shoulders, onShoulders || shoulderLift > 0, x, y + 3.1, shotHeight / 2 / Math.tan(FOV * Math.PI / 360), x, y + 3.1);
    }
    camera.lookAt(camAt);
    // A scene's shot takes over from the play camera, and gives it back, smoothly (./stage.ts).
    if (directions.shot) {
      const s = directions.shot;
      lastShot = s;
      shotWeight = s.blend;
    } else shotWeight = Math.max(0, shotWeight - dt / SHOT_RELEASE);
    if (lastShot && shotWeight > 0) {
      const s = lastShot;
      const tall = Math.max(s.height, s.width / camera.aspect);
      const away = tall / 2 / Math.tan(FOV * Math.PI / 360);
      const w = shotWeight * shotWeight * (3 - 2 * shotWeight);
      playAim.set(camera.position.x, camera.position.y, 0);
      // A shot of something further back (`z`) looks at it from as far in front of it, and the lens focuses there.
      camera.position.set(lerp(camera.position.x, s.x, w), lerp(camera.position.y, s.y + s.eye, w), lerp(camera.position.z, s.z + away, w));
      camera.lookAt(lerp(playAim.x, s.x, w), lerp(playAim.y, s.y, w), s.z * w);
      focusBack = -s.z * w;
    } else focusBack = 0;
    // The lens pulls its focus back to the family, who stand behind the plane he plays in, while a shot is on them.
    const onFamily = Math.max(shotWeight, nearbyFamily && !chapter.epilogue ? 1 : 0);
    sharpDeep += (DOF_DEEP + DOF_DEEPER * onFamily - sharpDeep) * (calmStory ? 1 : ease(3, dt));
    if (chapter.epilogue && ending !== null && ending !== undefined) {
      // The last picture: his carving where he put it, on Pappa's shelf, or on the window sill.
      const window = chapter.epilogue.shelf && flags.has('shelf:placed') ? chapter.epilogue.shelf : chapter.epilogue.window;
      const shotHeight = Math.max(2.6, 2.8 / camera.aspect);
      camera.position.set(window.x, window.y + 0.65, window.z + shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(window.x, window.y + 0.65, window.z);
    }
    const darkness = night.update(flags, dt, tier === 'low' ? 0.5 : 0.85, calmStory, lifeDt);
    // The foreground's own shade, by day; little of it at night and in the storm, which are dark enough (./grade.ts).
    gradePass?.setForeShade(CINEMA * (chapter.storm ? 0.35 : 1) * (1 - 0.7 * darkness));
    // Sunlight through the leaves on the forest floor and the lawn, by day, out of the storm (./ground-detail.ts).
    // On High the crowns cast the dappled light for real (./canopy.ts); on Mid the ground paints it.
    DAPPLE.value = dappled && tier === 'mid' ? 1 - darkness : 0;
    CANOPY.on.value = dappled && tier === 'high' ? 1 - darkness : 0;
    if (!calmStory) DAPPLE_CLOCK.value = clock;
    // Out in the storm the ground is wet, and where it is looked along it gives back the sky (./ground-detail.ts).
    GROUND_WET.value = wetOutside ? 1 : 0;
    GROUND_SKY.value.copy(hemisphere.color).multiplyScalar(hemisphere.intensity);
    // The gusts too, for a pack's picture of them (the waves over Flärken's jetty, ./jetty-waves.ts).
    for (const extra of extras) extra.update({ dt, clock, flags, x, y, camera, still: calmStory, tier, riding: curr.mode === 'ride', revealPaused: sceneFrame?.waiting, scene: sceneFrame, gusts });
    if (dressing && place) {
      // What lives far off begins nothing while he is busy, and needs the lens to know what is in the picture.
      dressing.update(camera.position.x, look.y, clock, darkness, { gust, still: calmStory }, {
        busy: !curr.grounded || curr.mode !== 'free' || !!nearbyFamily || (!!chapter.mist && flags.has(chapter.mist.after)) || gusts.some((gust) => gust.blow > 0 || gust.warn > 0),
        calm: calmStory, eye: camera.position.z, slope: Math.tan((FOV * Math.PI) / 360) * camera.aspect,
      });
      if (place.id === 'dusk') {
        scene.backgroundIntensity = nightBrightness(darkness);
        // Fog keeps a copy of its initial colour; changing `sky` alone never changes the haze.
        (scene.fog as Fog).color.copy(sky);
      }
      // The mountain's hour goes on as he does: the sky dims with the far ridges (backdrop.ts).
      if (place.id === 'mountain') scene.backgroundIntensity = evening(look.x, chapter.ground[0]!.x, chapter.ground[chapter.ground.length - 1]!.x).sky;
      skyPicture.material.color.setScalar(scene.backgroundIntensity);
      // The haze begins behind the play plane, however far the camera has pulled back.
      if (!chapter.mist) {
        (scene.fog as Fog).near = camera.position.z + place.haze.near;
        (scene.fog as Fog).far = camera.position.z + place.haze.far;
      }
    }
    // The visual upgrade's systems, after the dressing, so that this frame's wind is set (./lift/).
    for (const lift of lifts) {
      lift.update({ dt, clock, flags, x, y, camera, still: calmStory, tier, riding: curr.mode === 'ride' && !walkedRide, vx: curr.vx, vy: curr.vy, facing: curr.facing, grounded: curr.grounded, mode: curr.mode, darkness });
    }

    rimLight.setStrength(scene.backgroundIntensity * (1 - darkness));

    // The stand-in Elof: turned a little towards the camera, legs swinging with the distance he covers.
    // On a hose he turns his back to the camera, as a climber does.
    const onHose = curr.mode === 'climb' || curr.mode === 'slide';
    // In a held scene the scene may turn him: towards his family, or out over the garden.
    const scripted = directions.elof;
    const facingAngle = bathroom ? -bathroom.face * Math.PI * 2 : scripted?.face != null ? -scripted.face * Math.PI * 2 : onHose ? Math.PI / 2 : curr.facing > 0 ? -0.35 : Math.PI + 0.35;
    turn = turning.update(facingAngle, dt);
    // A held scene owns the pose. Otherwise actual travel drives the same articulated pose on both bodies.
    let scriptedPose: Pose | null = null;
    if (scripted?.act && curr.grounded) {
      const unit = 5.2 / Math.max(0.5, tall);
      const facing = Math.cos(facingAngle) >= 0 ? 1 : -1;
      // An act of the hands after a kneel keeps him on his knees, as the family stay on theirs.
      elofStance = stanceOf(scripted.act, elofStance);
      // He goes on standing and breathing under it by the scene's clock, which runs on by itself while a line is read.
      const walking = scripted.act === 'walk';
      scriptedPose = actPose(scripted.act, { t: scripted.actT, aim: scripted.aim ? { ahead: (scripted.aim.x - x) * facing * unit, up: (scripted.aim.y - y) * unit } : null,
        stride: walking ? scripted.actT * 2 : 0, gait: walking ? 1.5 : 0, pace: walking ? 1 : 0, calm: calmStory, clock: scripted.life }, elofPose, elofStance);
      // Putting on the doll's raincoat, or taking it off: his arms go into its sleeves and out (./elof-coat.ts).
      if (sceneFrame) coatPose(sceneFrame.id, sceneFrame.seconds, scriptedPose);
    } else elofStance = 'stand';
    if (bathroom?.brushing) {
      scriptedPose = actPose('eat', { t: .7, aim: null, stride: 0, pace: 0, calm: calmStory, clock: lifeClock }, elofPose);
      // One hand brushes; the other rests by his side instead of covering his face.
      scriptedPose.armL = STANDING.armL; scriptedPose.elbowL = STANDING.elbowL; scriptedPose.wristL = STANDING.wristL;
    }
    else if (bathroom?.walking) scriptedPose = null;
    const waving = reaction?.kind === 'player' && curr.grounded;
    // The one wind (./wind.ts) as it reaches each of them where they stand: none indoors, and more in the storm.
    const gale = galeOf(chapter, flags);
    const breeze = gale * windAt(x);
    // His model's own legs (Rig.legs), where it has come: its feet hold the ground as he walks.
    const ownLegs = (playerBody as Partial<Pick<Rig, 'legs'>>).legs;
    // Hang by his hands from the scarf, and from Moa's umbrella; walk on his own feet on the way home.
    const moving = bathroom ? { ...curr, mode: 'free' as const, grounded: true, atEdge: false } : onScarf || umbrellaHung ? { ...curr, mode: 'swing' as const } : walkedRide ? { ...curr, mode: 'free' as const, grounded: true, atEdge: false } : curr;
    // Norrsken's continuous rescue line already owns both grips and the loop around the carving.
    const pullIndex = rescue ? -1 : movers.findIndex((m, i) => m.t !== undefined && m.t < 1 && (m.stop ?? 0) > 0 && chapter.movers?.[i]?.verb === 'pull' && !chapter.movers[i]!.on);
    const pullMover = pullIndex >= 0 ? movers[pullIndex]! : null;
    // Into the bathroom his steps are counted the way he faces: come from the right, the walk in read as a skid
    // backwards, and he glided in on still legs (Olov, 12 November 2026: "ser ut som att elof svävar in").
    const playerPose = playerMotion.update(moving, x + (bathroom ? bathroom.travel * curr.facing : 0), dt, scriptedPose, waving ? responseFor : 0, calmResponse || calmStory, breeze, tall, ownLegs);

    // What is said (./talk.ts): he looks at whoever speaks to him, from where his face was a moment ago, and speaks with his
    // mouth, his head and a free hand. It is drawn on a copy of his pose: his own motion never keeps it.
    if (pullMover) {
      const pulling = smooth((pullMover.t! - .15) / .25) * (1 - smooth((pullMover.t! - .9) / .1));
      playerPose.lean += (-.24 - playerPose.lean) * pulling;
      playerPose.kneeL += (.25 - playerPose.kneeL) * pulling; playerPose.kneeR += (.25 - playerPose.kneeR) * pulling;
      if (pullMover.t! < .2) {
        const cast = smooth(pullMover.t! / .2);
        playerPose.armR = lerp(2.7, 1.1, cast); playerPose.elbowR = lerp(.35, 1, cast);
      }
    }
    const elofOther = talk.lookAt('elof'), elofThere = elofOther ? talk.face(elofOther) : null;
    if (elofThere) playerBody.mouth(faceAt);
    const giftHeld = !!carriedGift && flags.has('gift') && !flags.has('taste') && !curr.hook && elof.group.visible;
    const elofHands = (scripted?.act && !HANDS_HANG.includes(scripted.act)) || curr.hook || lanternHeld ? NO_HANDS : giftHeld ? FREE_WITH_LAMP[GOLD_HAND]! : BOTH_HANDS;
    elofTalker.update(talk, elofThere ? lookAt(elof.group, faceAt, elofThere, heard, true) : null, lifeDt, calmStory, elofHands);
    elofTalker.pose(Object.assign(spokenPose, playerPose));
    const rescueGrip = rescue?.weight(flags, sceneFrame?.id === 'aterfunna' ? sceneFrame.seconds : undefined, calmStory) ?? 0;
    if (rescue && flags.has('scene:uppdragen') && rescueGrip > 0) {
      // Lean into the load with the carrying shoulder behind him, instead of jogging empty-handed: wherever he drags
      // it, the eyes' and the candy's places too, and less while it lies still behind him.
      rescueCarryPose(spokenPose, rescueGrip * (.4 + .6 * rescue.hauling));
    }
    if (rescue && sceneFrame?.id === 'uppdragen') spokenPose.lean -= .16;
    playerBody.pose(spokenPose);
    playerBody.face?.(elofTalker.mouth.open, elofTalker.mouth.round, elofTalker.lids);
    playerBody.breeze?.(breeze, dt, calmStory, playerMotion.ruffle);
    const elastic = curr.mode === 'free' && !scriptedPose && !calmStory;
    if (dt > 0) {
      if (!elastic) { squash = 1; fallingSpeed = 0; }
      else if (curr.grounded) {
        if (fallingSpeed > 0) squash = 1 - .025 - .04 * clamp(fallingSpeed / JUMP_SPEED, 0, 1);
        fallingSpeed = 0;
      } else fallingSpeed = Math.max(fallingSpeed, -curr.vy);
      squash += (1 - squash) * ease(12, dt);
    }
    // Only a real jump/fall stretches the body: climbing, rides and story lifts keep their proportions.
    // Off the ground the stretch comes over a few frames, not all in the first.
    airStretch = !elastic || curr.grounded ? squash : airStretch + (1 + clamp(curr.vy * 0.012, -0.05, 0.1) - airStretch) * ease(30, dt);
    const stretch = !elastic ? 1 : curr.grounded ? squash : airStretch;
    // Knocked over by a drop he goes down on his back, lies a moment, and gets up: softly at both ends.
    const lying = curr.mode === 'down' ? smooth(Math.min(1, curr.t / 0.15, (1 - curr.t) / 0.25)) * 1.4 * curr.facing : 0;
    // The tilt turns about his middle, where the lace's pull goes through.
    const lift = scripted?.lift;
    // A ride starts where the ride starts, which can be a step from where he pressed: he is drawn from where he was and
    // carried over that step in a moment, instead of jumping.
    if (curr.mode === 'ride' && drawnMode !== 'ride' && drawnMode !== null && !calmStory && Math.hypot(drawnX - x, drawnY - y) < 2) rideFrom.set(drawnX - x, drawnY - y, 0);
    rideFrom.multiplyScalar(curr.mode === 'ride' ? Math.exp(-10 * dt) : 0);
    drawnMode = curr.mode; drawnX = x; drawnY = y;
    elof.group.position.set(x - Math.sin(hang) * 0.5 + (lift?.x ?? 0) + rideFrom.x, y + 0.5 - Math.cos(hang) * 0.5 + shoulderLift + (lift?.y ?? 0) + rideFrom.y, lift?.z ?? 0);
    // On a mark in the place itself, such as Pappa's palm: wherever the run left him.
    if (scripted && scripted.ontoWeight > 0) {
      const on = scripted.ontoWeight;
      elof.group.position.x += (scripted.onto.x - x) * on;
      elof.group.position.y += (scripted.onto.y - y) * on;
      elof.group.position.z += ((scripted.onto.z ?? 0) - (lift?.z ?? 0)) * on;
    }
    if (bathroom) elof.group.position.copy(bathroom.position);
    elof.group.rotation.set(0, turn, lying - hang, 'ZYX');
    elof.group.scale.set(tall / Math.sqrt(stretch), tall * stretch, tall / Math.sqrt(stretch));
    if (scriptedPose && scripted?.act === 'point' && scripted.aim) {
      const k = calmStory ? 1 : clamp(scripted.actT / .3, 0, 1);
      playerBody.reach(1, boot.set(scripted.aim.x, scripted.aim.y, scripted.aim.z ?? 0), k * k * (3 - 2 * k));
      // With his first finger, where his hand has fingers of its own (./fingers.ts).
      playerBody.hold?.(1, { kind: 'point' }, k * k * (3 - 2 * k));
    }
    if (chapter.id === 'stormoga' && sceneFrame?.id === 'motet' && scripted?.act === 'reach' && scripted.aim) {
      const k = smooth(clamp(scripted.actT / 0.6, 0, 1));
      playerBody.reach(1, boot.set(scripted.aim.x, scripted.aim.y, scripted.aim.z ?? 0), k);
    }
    // Keep the same right-hand contact across the taste action. Scene pose blending cannot retain a post-pose
    // grip by itself; dropping that grip here used to snap the left arm down and teleport the sweet to the right.
    const carryingGold = giftHeld ? 1 : chapter.id === 'stormoga' && sceneFrame?.id === 'stor' ? goldCarryWeight(sceneFrame.seconds) : 0;
    carryGold(playerBody, elof.group, clock, calmStory, carryingGold);
    stage.updateElof(playerBody, scripted, tall, calmStory);
    epilogueStage.updateElof(playerBody);
    homeRoutine?.updateElof(playerBody);
    // Where his face is, for the others to look at as he speaks (as it was last drawn: near enough to look at).
    if (elof.group.visible) {
      playerBody.mouth(faceAt);
      talk.place('elof', faceAt.x, faceAt.y, faceAt.z);
    }
    // The doll's raincoat on him, part by part as he puts it on, and in his hands between the doll and his back.
    dressFor(playerBody, 'elof', flags, sceneFrame ?? null, calmStory, tall);
    heldCoat?.update(sceneFrame ?? null, flags, playerBody, elof.group, tall, y, calmStory);
    rescuedFigures?.update(flags, elof.group, playerBody, tall);
    if (curr.hook) {
      playerBody.hand(0, laceHand).add(playerBody.hand(1, laceAlong)).multiplyScalar(.5);
      laceHand.addScaledVector(boot.set(1, 0, 0).applyQuaternion(elof.group.quaternion), .15 * tall);
      laceAlong.set(curr.hook.x, curr.hook.y, 0).sub(laceHand).normalize();
      // Close both hands on the same lace, with the lower hand supporting its visible end.
      playerBody.reach(0, laceHand.addScaledVector(laceAlong, -.2 * tall));
      playerBody.reach(1, laceHand.addScaledVector(laceAlong, -.06 * tall));
      playerBody.hold?.(0, { kind: 'power', size: .02 * tall });
      playerBody.hold?.(1, { kind: 'power', size: .02 * tall });
      playerBody.hand(1, laceHand);
    }
    let pullTarget: { x: number; y: number; z?: number } | null = null;
    if (pullMover) {
      const def = chapter.movers![pullIndex]!, ring = def.ring ?? { x: 0, y: def.height };
      const target = boot.set(pullMover.x + ring.x, pullMover.y + ring.y, ring.z ?? .2);
      playerBody.hand(1, laceHand);
      laceAlong.copy(target).sub(laceHand).normalize();
      if (pullMover.t! >= .2) {
        const reach = rootReach.copy(laceHand).addScaledVector(laceAlong, .24);
        playerBody.reach(1, reach, .9); playerBody.reach(0, reach.clone().addScaledVector(laceAlong, -.12), .85);
        playerBody.hold?.(0, { kind: 'power', size: .025 }); playerBody.hold?.(1, { kind: 'power', size: .025 });
      }
      playerBody.hand(1, laceHand);
      const thrown = smooth(pullMover.t! / .2);
      pullTarget = { x: lerp(laceHand.x, target.x, thrown), y: lerp(laceHand.y, target.y, thrown), z: lerp(laceHand.z, target.z, thrown) };
    }
    lace.update(curr.hook ?? pullTarget, laceHand);
    if (onScarf && scarves) {
      // Both hands closed round the scarf over his head, the one over the other along it; the lower holds just over its end.
      scarves.grip(x, y, tall, scarfLower, scarfUpper);
      playerBody.reach(0, scarfLower);
      playerBody.reach(1, scarfUpper);
      const grip = { kind: 'power' as const, size: .03 * tall };
      playerBody.hold?.(0, grip);
      playerBody.hold?.(1, grip);
      if (playerBody.socket) playerBody.socket(0, grip, scarfBottom); else playerBody.hand(0, scarfBottom);
    }
    if (umbrellaHung && umbrellaRide?.prop) {
      // Both hands up round Moa's umbrella: the one on its crook, the other just over it on the shaft (./umbrella-hold.ts).
      handsOn(umbrellaRide.prop, umbrellaLower, umbrellaUpper);
      playerBody.reach(0, umbrellaLower);
      playerBody.reach(1, umbrellaUpper);
      const grip = { kind: 'power' as const, size: .03 * tall };
      playerBody.hold?.(0, grip);
      playerBody.hold?.(1, grip);
    }
    // In the mist he holds the lysklubba up before him, as a lantern (./view.ts buildMist).
    lanternHeld = !!chapter.mist && flags.has(chapter.mist.after) && !curr.hook && !!playerBody;
    if (lanternHeld && playerBody) {
      elof.group.updateWorldMatrix(true, false);
      lanternLift.set(0.3, 0.98, 0.12).applyMatrix4(elof.group.matrixWorld);
      playerBody.reach(1, lanternLift, 0.9);
      if (playerBody.grasp && playerBody.socket) {
        // Its stick upright in his fist, the sweet over his thumb (./fingers.ts).
        const grip = { kind: 'power' as const, size: .018 * tall };
        playerBody.grasp(1, grip, playerBody.socket(1, grip, lanternHand), upright, lanternHand);
        lanternHand.y -= .1 * tall;
      } else playerBody.hand(1, lanternHand);
    }
    // Found in Byn i stormen, it is in his hand while he picks it up and holds it up to look at it (the scene `mossan`,
    // its cue `sb:cap-picked`), and tucked in at his back from then on.
    const returningCap = chapter.id === 'stormoga' && sceneFrame?.id === 'motet';
    const returnedCap = returningCap && flags.has('so:cap-returned');
    const capInHand = (chapter.id === 'stormbyn' && flags.has('sb:cap-picked') && !flags.has('scene:mossan') && !curr.hook)
      || (returningCap && sceneFrame.seconds >= 8.8 && !returnedCap);
    const hasCap = (chapter.id === 'stormbyn' && flags.has('cap') && (capInHand || flags.has('scene:mossan')))
      || ['olympia', 'flarken', 'alven', 'billsta'].includes(chapter.id)
      || (chapter.id === 'stormoga' && !flags.has('scene:motet'));
    carriedCap.visible = hasCap && elof.group.visible;
    if (carriedCap.visible && returnedCap) {
      const mark = chapter.decor!.find(thing => thing.look === 'tiny-cap' && thing.until === 'taste')!;
      carriedCap.position.set(mark.at.x, mark.at.y, mark.z ?? 0);
      carriedCap.rotation.set(0, 0, 0);
      carriedCap.scale.setScalar(1);
    } else if (carriedCap.visible && capInHand) {
      // Between his right thumb and fingers, its point up (./fingers.ts).
      playerBody.hold?.(1, CAP_PINCH);
      if (playerBody.socket) playerBody.socket(1, CAP_PINCH, carriedCap.position);
      else playerBody.hand(1, carriedCap.position);
      carriedCap.position.y -= 0.1 * tall;
      elof.group.getWorldQuaternion(carriedCap.quaternion);
      carriedCap.scale.setScalar(0.8 * tall);
      if (returningCap) {
        // After he has said the whole line, the last short movement sets the cap on the little one's head.
        const mark = chapter.decor!.find(thing => thing.look === 'tiny-cap' && thing.until === 'taste')!;
        const settle = smooth(Math.max(0, Math.min(1, (sceneFrame.seconds - 10.8) / .8)));
        carriedCap.position.lerp(boot.set(mark.at.x, mark.at.y, mark.z ?? 0), settle);
        carriedCap.rotation.set(0, carriedCap.rotation.y * (1 - settle), 0);
        carriedCap.scale.setScalar(.8 * tall + (1 - .8 * tall) * settle);
      }
    } else if (carriedCap.visible) {
      elof.group.updateWorldMatrix(true, false);
      carriedCap.position.set(-0.17, 0.5, 0.05).applyMatrix4(elof.group.matrixWorld);
      elof.group.getWorldQuaternion(carriedCap.quaternion).multiply(capTilt);
      carriedCap.scale.setScalar(0.8 * tall);
    }
    // The lingonberries he picks in Granskogen, for the jay and for the vittra's door, held up in front of him in his
    // left hand until he gives each.
    const berryHeld = (flags.has('berry') && !flags.has('jay')) || (flags.has('vittra:berry') && !flags.has('vittra:gift'));
    const hasBerry = chapter.id === 'granskog' && berryHeld && !curr.hook && !!playerBody && elof.group.visible;
    carriedBerry.visible = hasBerry;
    if (hasBerry && playerBody) {
      elof.group.updateWorldMatrix(true, false);
      berryHand.set(0.32, 0.62, 0.16).applyMatrix4(elof.group.matrixWorld);
      playerBody.reach(0, berryHand, calmStory ? 0.7 : 0.6 + 0.05 * Math.sin(clock * 2.1));
      if (playerBody.socket) {
        // Pinched between his thumb and his finger (./fingers.ts).
        playerBody.hold?.(0, BERRY);
        playerBody.socket(0, BERRY, carriedBerry.position);
        carriedBerry.position.y += 0.03 * tall;
      } else {
        playerBody.hand(0, carriedBerry.position);
        carriedBerry.position.y += 0.06 * tall;
      }
      carriedBerry.scale.setScalar(tall);
    }
    // Moa's leaf drawing, from where he finds it under the bridge until he shows it to her.
    const hasDrawing = chapter.id === 'garden' && flags.has('garden:paper') && !flags.has('garden:shared-paper') && !curr.hook && !!playerBody && elof.group.visible;
    carriedDrawing.visible = hasDrawing;
    if (hasDrawing && playerBody) {
      elof.group.updateWorldMatrix(true, false);
      berryHand.set(0.3, 0.6, 0.18).applyMatrix4(elof.group.matrixWorld);
      playerBody.reach(0, berryHand, 0.6);
      // Its corner pinched between his thumb and his finger (./fingers.ts).
      playerBody.hold?.(0, PAPER);
      if (playerBody.socket) playerBody.socket(0, PAPER, carriedDrawing.position);
      else playerBody.hand(0, carriedDrawing.position);
      carriedDrawing.position.y += 0.08 * tall;
      carriedDrawing.position.z += 0.04;
      carriedDrawing.rotation.set(-0.2, 0, Math.sin(clock * 1.7) * 0.06);
      carriedDrawing.scale.setScalar(tall);
    }
    // "Smaka …": in Norrsken, as he tastes the golden sweet, his hand raises it to his mouth, and it is gone as he grows.
    const tasting = chapter.id === 'norrsken' && !!sized && flags.has('taste') && tall < sized.scale && !!playerBody && elof.group.visible;
    const bite = tasting && sized ? Math.min(1, Math.max(0, (tall - 1) / (sized.scale - 1))) : 1;
    carriedGold.visible = tasting && bite < 0.45 && !calmStory;
    if (carriedGold.visible && playerBody) {
      tasteGrowingGold(playerBody, elof.group, bite);
      if (playerBody.socket) playerBody.socket(0, BERRY, carriedGold.position);
      else playerBody.hand(0, carriedGold.position);
      carriedGold.scale.setScalar(tall * (1 - smooth((bite - 0.32) / 0.12)));
    }
    // The old one's golden sweet stays in the right hand from taking it through inspecting it and tasting it.
    if (carriedGift) drawnWhile(carriedGift, giftHeld);
    if (giftHeld && carriedGift) {
      if (playerBody.socket) playerBody.socket(GOLD_HAND, GOLD_GRIP, carriedGift.position);
      else playerBody.hand(GOLD_HAND, carriedGift.position);
      // On his fingertips, not in them.
      carriedGift.position.y += 0.07 * tall;
      carriedGift.scale.setScalar(tall);
      carriedGift.rotation.y = calmStory ? 0 : clock * 0.9;
      carriedGift.getObjectByName('glow')!.scale.setScalar(calmStory ? 1 : 1 + 0.12 * Math.sin(clock * 5.3));
    }
    // "Var är ficklampan? Jag ser ingenting!": Elof carries the lit flashlight from the table to Pappa in his right
    // hand, lighting the floor ahead; once given, Pappa has it in his left (Stormkvällen).
    const carries = chapter.id === 'stormkvall' && flags.has('lamp:take') && !flags.has('lamp:give') && !curr.hook && !!playerBody;
    if (carries && !carriedLamp) { carriedLamp = litLamp(); scene.add(carriedLamp); }
    if (carriedLamp) {
      carriedLamp.visible = carries;
      if (carries && playerBody) holdLamp(carriedLamp, playerBody, 1, turn, 1.6 * tall / 5.2);
    }
    if (pappasLampBeam) pappasLampBeam.visible = tier !== 'low';
    if (poff) glitter.update(0.5, x, y + tall * 0.4, clock);

    // On the bathroom's tiles his shadow lies on them, not under them.
    playerGroundY = curr.groundY + (bathroom ? bathroom.position.y - y : 0);

    // A big candy turns slowly until it is reached. Then it gives a little jump, and turns fast.
    for (const [i, big] of bigCandies.entries()) {
      if (big.after !== undefined) {
        const laid = flags.has(big.after);
        // It comes with a little jump, as a reached one does; a game taken up later finds it there.
        if (laid && !big.laid && hasFrame) big.pop = 1;
        big.laid = laid;
        drawnWhile(big.place, laid);
      }
      const last = i === bigCandies.length - 1;
      const reached = last ? atGoal : i <= checkpoint;
      if (reached && !big.reached) big.pop = 1;
      big.reached = reached;
      big.pop = Math.max(0, big.pop - dt * 2.2);
      // Its swirl turns like a pinwheel, with its face to him, and it sways a little so that it has a side.
      big.spin += dt * (reached ? (last ? 7 : 3.4) : 1.2);
      big.sweet.rotation.set(0, Math.sin(clock * 0.8 + i) * 0.4, -big.spin);
      big.place.scale.setScalar(1 + 0.3 * Math.sin(Math.PI * big.pop));
    }

    ghostStaged = false;
    // The ghost is a wooden toy come alive: it never bends. Standing, it turns towards Elof, sways and taps
    // a foot. Hopping, it faces the way it goes and tips forward. Gone, it has shrunk away.
    if (ghostState) {
      const hopping = ghostState.t < 1;
      const away = ghostState.gone ? 0 : 1;
      // On a table's edge it stands behind the play plane: its perch says how far (picture only).
      const perch = chapter.ghost?.[ghostState.perch];
      // Gone into a hole (the garden's roots), it creeps in head first and is seen to go, slower than a vanishing.
      const creeps = ghostState.gone ? perch?.into : undefined;
      ghostSize += (away - ghostSize) * ease(creeps ? 1 : 8, dt);
      const creep = creeps ? 1 - ghostSize : 0;
      const before = chapter.ghost?.[Math.max(0, ghostState.perch - 1)];
      const depth = hopping ? lerp(before?.z ?? 0, perch?.z ?? 0, ghostState.t) : perch?.z ?? 0;
      ghostPlace.position.set(ghostState.x, ghostState.y, depth);
      if (creeps) ghostPlace.position.lerp(creepTo.set(creeps.x, creeps.y, creeps.z), Math.min(1, creep * 1.4));
      ghostPlace.scale.setScalar(ghostSize);
      // Its shadow lies where it stands. In a hop it is off the ground, and the shadow waits where it will land.
      if (!hopping) ghostGroundY = ghostState.y;
      // 0 faces along the course; a half turn faces back at him.
      const wanted = reaction?.kind === 'ghost' ? -Math.PI / 2 : (hopping || x > ghostState.x ? 0.4 : Math.PI - 0.4) + ghostLook;
      const ghostDelta = wanted - ghostTurn;
      ghostTurn += Math.atan2(Math.sin(ghostDelta), Math.cos(ghostDelta)) * ease(7, dt);
      const awake = !chapter.prologue || flags.has('blink');
      // It tips forward in a hop and rocks a little standing, about its own side: the stand-in's z, and the model's x,
      // which faces its own +z and is turned a quarter (./ghost-model.ts). The yaw goes first, so each is its own.
      const tip = (!awake ? 0 : hopping ? 0.25 * Math.sin(Math.PI * ghostState.t) : calmStory ? 0 : Math.sin(clock * 1.7) * 0.026 + Math.sin(clock * 0.63 + 1.3) * 0.014) + Math.min(1, creep * 2) * 0.9;
      ghost.rotation.set(ghostFaces ? tip : 0, ghostFaces + ghostTurn, ghostFaces ? 0 : -tip, 'YXZ');
      if (chapter.prologue && prologue) {
        const pose = prologuePose(chapter.prologue, prologue);
        ghostPlace.position.set(pose.x, pose.y, pose.z);
        ghostSize = pose.scale;
        ghostPlace.scale.setScalar(ghostSize);
        ghost.rotation.set(0, ghostFaces + pose.turn, pose.tilt);
        ghostStaged = true;
        if (prologue.kind === 'pappa') {
          const catcher = stage.actors.get('pappa')?.rig;
          const caught = smooth(clamp((prologue.seconds - .7) / .4, 0, 1))
            * (1 - smooth(clamp((prologue.seconds - 2.8) / .25, 0, 1)));
          if (catcher && caught > 0) {
            holdCarving(catcher, 1, boot.copy(ghostPlace.position).addScaledVector(carryUp, .43),
              carryUp, .43, .13, seat, carryAxis, caught);
            ghostPlace.position.lerp(seat, caught);
          }
        }
      } else if (chapter.prologue && flags.has('pappa:done') && !chapter.prologue.edge) {
        ghostSize = 0;
        ghostPlace.scale.setScalar(0);
        ghostStaged = true;
      }
      // A scene's own acting: in Pappa's hands, its first blink, a look at the shelf, the grab (./stage.ts).
      const staged = directions.ghost;
      if (staged) {
        ghostPlace.position.set(staged.x, staged.y + staged.bounce, staged.z);
        ghostSize = 1;
        ghostPlace.scale.setScalar(1);
        ghostTurn = -staged.face * Math.PI * 2;
        ghost.rotation.set(0, ghostFaces + ghostTurn, staged.tilt);
        ghostStaged = true;
      }
      // Elof is interpolated between simulation steps. Keep that intermediate picture outside the
      // same chase clearance, without advancing the ghost past a puzzle's waiting perch.
      // A scene that places it (Berget's lift, in his hands) is not pushed off, nor is one that waits still on
      // something for his help, as in the simulation (the leaf in the eddy, the foot of the cliff).
      const waitsStill = !hopping && (perch?.stays === true || (perch?.still === true && perch.until !== undefined && !flags.has(perch.until)));
      // On the leaf afloat in the eddy, it rides as high as the leaf is drawn.
      if (waitsStill && perch?.on !== undefined && !staged) ghostPlace.position.y += eddyLift;
      if (!chapter.ghostMeet && !staged && !waitsStill) {
        const dx = ghostPlace.position.x - x, dy = ghostPlace.position.y - y;
        if (Math.hypot(dx, dy) < GHOST_CLEARANCE) {
          ghostPlace.position.y = y + (dy < 0 ? -1 : 1) * Math.sqrt(GHOST_CLEARANCE ** 2 - dx ** 2);
        }
      }
      blinkEyes(paintedEyes, staged?.blink ?? 1);
      const ghostIdle = ghostMotion.update({ dt, clock, hop: hopping ? ghostState.t : null, calm: calmStory, awake, staged: ghostStaged,
        performance: staged ?? undefined, elof: x - ghostPlace.position.x, wind: gale * windAt(ghostPlace.position.x) });
      ghostLook = ghostStaged ? 0 : ghostIdle.look;
      if (!ghostStaged) {
        // Its idle: a bob of the whole toy with its bag, and a curious tilt towards him when he is near.
        ghostPlace.position.y += ghostIdle.bob;
        ghost.rotation.x += ghostFaces ? ghostIdle.pitch : ghostIdle.roll;
        ghost.rotation.z += ghostFaces ? ghostIdle.roll : -ghostIdle.pitch;
      }
      // It has no mouth (plan §2.2): saying "Klonk", it bobs up once for each, tipping back a little, as a wooden toy would
      // (./talk.ts). Its knock is its voice already (../audio/cues.ts).
      ghostTalker.update(talk, null, lifeDt, calmStory);
      const klonk = ghostTalker.klonk;
      if (klonk > 0) {
        ghostPlace.position.y += 0.1 * klonk * ghostPlace.scale.y;
        if (ghostFaces) ghost.rotation.x -= 0.09 * klonk; else ghost.rotation.z += 0.09 * klonk;
      }
      if (ghostPlace.visible && ghostSize > 0.5) talk.place('spoket', ghostPlace.position.x, ghostPlace.position.y + 0.75 * ghostPlace.scale.y, ghostPlace.position.z);
      looking.update(staged?.look ? ghostPlace.position : null, staged?.look ?? null, clock, dt);
    }
    if (chapter.prologue) {
      paintedEyes.forEach((eye, i) => { eye.visible = flags.has(i === 0 && paintedEyes.length > 1 ? 'eye' : 'paint'); });
    }
    // Keep the stolen paper bag distinct from the wooden pocket, across every chapter of the chase. It was given
    // back on the summit, so neither the party nor Byn, a week later, has it.
    stolenBag.visible = ghostPlace.visible && (chapter.prologue ? flags.has('grab') || flags.has('blink') : chapter.id !== 'epilog' && chapter.id !== 'byn' && !chapter.named) &&
      !(chapter.id === 'norrsken' && flags.has('eyes'));
    // The gold sweet glints at the bag's mouth all through the chase (plan §3.3 rule 3).
    const glint = stolenBag.getObjectByName('saturday-bag-glow');
    if (glint) {
      drawnWhile(glint, stolenBag.visible);
      glint.scale.setScalar(calmStory ? 1 : 0.85 + 0.25 * Math.sin(clock * 4.2));
    }
    // Carried before it: in a scene it may face the camera, and the bag goes with its front.
    if (directions.ghost) stolenBag.position.set(Math.cos(ghostTurn) * .48, .18, -Math.sin(ghostTurn) * .4 - .05);
    else stolenBag.position.set(Math.cos(ghostTurn) * .48, .18, -.18 + Math.sin(ghostTurn) * .25);
    stolenBag.rotation.y = ghostTurn;
    const tear = stolenBag.getObjectByName('saturday-bag-tear');
    if (tear) tear.visible = chapter.prologue ? flags.has('bag:torn') : true;
    prologueStage.update(flags);
    // His first figure has its place again, with Klonk beside it, once Elof has put his own carving up between them:
    // where the three stand on the evening of the storm (../content/aventyr2/chapters/stormkvall.ts, KLONK_SHELF).
    if (chapter.epilogue && chapter.shelf && flags.has(chapter.epilogue.shelf ? 'shelf:placed' : 'dots')) {
      ghostPlace.position.set(chapter.shelf.x - (chapter.epilogue.shelf ? 2.1 : 2.4), chapter.shelf.y + 0.08, chapter.epilogue.shelf ? -8.4 : -8.5);
      ghostPlace.scale.setScalar(1);
      ghost.rotation.set(0, ghostFaces - Math.PI / 2, 0);
      ghostMotion.update({ dt, clock, hop: null, calm: calmStory, awake: true, staged: true });
      ghostStaged = true;
    }
    // Its readable entrance belongs to the held line; event time may stop before the paper has faded in.
    ghostThought?.update(ghostState, flags, { x, y }, camera, clock, lifeDt,
      lessMotion(), ghostPlace.visible);
    // The same jointed body greets him at help points and in the story; its outer root remains the place's.
    scarfHeld = false;
    for (const one of family) {
      // Pappa's authored carving/bathroom part replaces his candy-party helper, including its retained final pose.
      if (chapter.id === 'epilog' && one.who === 'pappa') one.rig.group.visible = !stage.actors.get('pappa')?.visible();
      const now = one.glad !== undefined && flags.has(one.glad);
      // Called, they walk over to where they help from (Spot.goesTo): an easy walk, slowing as they come. On the first
      // frame (a game taken up) and without motion they are simply there.
      let heading: number | null = one.walk?.heading ?? null;
      // A scarf in their hands (./scarf.ts): while it carries him they walk along with him, so that it hangs straight down.
      const scarf = scarves && one.walk ? scarves.holder(one.glad) : null;
      if (one.walk) {
        const w = one.walk, place = w.place.position;
        const to = scarf?.walk != null ? { x: scarf.walk, y: w.to.y, z: w.to.z } : (w.when !== undefined ? flags.has(w.when) : now) ? w.to : w.home;
        const dx = to.x - place.x, dz = to.z - place.z, far = Math.hypot(dx, dz);
        if (!w.seen || calmStory) { place.set(to.x, to.y, to.z); w.pace = 0; }
        else if (dt > 0 && far > 1e-3) {
          const speed = Math.min(chapter.id === 'myren' && one.glad === 'mamma' ? 5.2 : 1.1 * one.rig.height, far * 3), step = Math.min(far, speed * dt);
          place.x += dx / far * step; place.z += dz / far * step;
          place.y = chapter.id === 'myren' && one.glad === 'mamma' ? mammaPathY(place.x) : to.y;
          if (chapter.id === 'myren' && one.glad === 'mamma') place.z = mammaPathZ(place.x);
          w.gait = speed / one.rig.height;
          w.stride += step / stepLength(Math.max(w.gait, 0.3), one.rig.height, one.rig.legs);
          w.pace += (1 - w.pace) * ease(8, dt);
          heading = w.heading = Math.atan2(dx, dz);
        } else if (dt > 0) w.pace += (0 - w.pace) * ease(8, dt);
        w.seen = true;
        one.at = place.x;
      }
      if (dt > 0) {
        if (now && !one.was) one.joy = 1.8;
        one.was = now;
        one.joy = Math.max(0, one.joy - dt);
      }
      const towards = clamp((x - one.at) * 0.22, -0.75, 0.75);
      const carrying = onShoulders && one.who === 'pappa';
      // A paddler faces the board's nose, turning only a little towards him.
      // Author the direction from stable inputs, then turn once after the practical gestures below.
      // Mixing those gestures into last frame's drawn yaw would keep rotating a held reading/Pause frame.
      let facing = carrying ? Math.PI / 2 - .35 : one.paddle ? towards * 0.25 : towards;
      let turnRate = 4;
      one.rig.group.position.set(0, 0, 0);
      const posed = one.motion.update(dt, clock, one.joy, towards - one.rig.group.rotation.y, carrying ? x : null, calmStory, {
        ahead: Math.abs(x - one.at) * 5.2 / one.rig.height,
        up: (y + tall * .8 - one.rig.group.parent!.position.y) * 5.2 / one.rig.height,
      }, one.glad && ['moa', 'seesaw', 'cap:ready', 'mamma', 'braid', 'bog:return-bridge'].includes(one.glad)
        ? { ready: now && !(chapter.id === 'myren' && one.glad === 'mamma' && flags.has('placed:pine')), near: Math.abs(x - one.at) < 6 && Math.abs(y - one.rig.group.parent!.position.y) < 5 } : undefined, one.rig.legs);
      const offersCap = !!capGift && one.who === 'bertil' && !flags.has('cap') && Math.abs(x - one.at) < 8;
      const holdsCap = offersCap && capSince >= 0 && capSince < capTime;
      if (offersCap) {
        // One hand on the brim while he explains the idea; after being called, two hands on the cap.
        // Suppress the generic high greeting arms, which fought the practical reach and twisted his wrists.
        capArms(posed, capSince, capTime);
        const low = capHandoff(capSince, capTime).crouch;
        if (low > 0) {
          actPose('kneel', { t: 3, aim: null, stride: 0, pace: 0, calm: calmStory, role: 'bertil', legs: one.rig.legs }, capKneel);
          for (const joint of JOINTS) if (joint !== 'turn' && joint !== 'nod' && !joint.startsWith('arm') && !joint.startsWith('elbow')) posed[joint] += (capKneel[joint] - posed[joint]) * low;
          posed.lean = Math.max(posed.lean, 0.85 * low);
        }
      }

      if (one.walk && one.walk.pace > 0.001) {
        // Walking over: the legs go by the ground they cover, and the body turns the way it goes.
        const w = one.walk, p = w.pace;
        actPose('walk', { t: clock, aim: null, stride: w.stride, gait: w.gait, pace: p, calm: calmStory, role: one.who, legs: one.rig.legs }, walkPose);
        for (const key of JOINTS) if (key !== 'turn') posed[key] = posed[key] * (1 - p) + walkPose[key] * p;
        posed.bounce = posed.bounce * (1 - p) + walkPose.bounce * p;
        if (heading !== null) facing = facingBetween(facing, heading, p);
      }
      // Bertil pulls off his right boot for Elof (Olov: "på riktigt"): in the moment between being called and the
      // boot lying on the water, he leans down, lifts that foot and tugs at the boot with both hands.
      // Each such gesture comes and goes over a moment (`gestureOf`), never in one frame.
      const gesture = gestureOf(one.who);
      const pullsBoot = one.who === 'bertil' && chapter.id === 'stormgard';
      const pulling = pullsBoot && flags.has('sg:bertil') && !flags.has('sg:boot-ready');
      gesture.pull = pullsBoot ? bootPull(pulling, dt, calmStory) : 0;
      if (gesture.pull > 0.001) {
        const w = gesture.pull, tug = calmStory ? 0 : Math.sin(clock * 9) * 0.08;
        const toward = (joint: 'lean' | 'legR' | 'kneeR' | 'kneeL', v: number) => { posed[joint] += (v - posed[joint]) * w; };
        toward('lean', 0.55 + tug); toward('legR', 0.95); toward('kneeR', 1.35 + tug); toward('kneeL', Math.max(posed.kneeL, 0.25));
      }
      // Moa holds her umbrella in Byn i stormen (Olov, 9 November 2026: "Moa ska hålla i ett paraply redan innan Elof
      // ropar på henne och får det."): open over her head in the rain while she waits on the wall; called, she steps to
      // its edge, bends and holds it out low there for him (`down`, 0 to 1), until he takes it from her hand; then she
      // lets go and straightens (Olov, 12 November 2026: it stood there by itself before; ./umbrella-hold.ts).
      const umbrellaUp = one.who === 'moa' && !!umbrellaRide && !!umbrellaBoard && !flags.has(umbrellaBoard.id);
      const umbrellaAsked = umbrellaUp && one.glad !== undefined && flags.has(one.glad);
      // A game taken up after the call has her down from its first frame (./umbrella-hold.ts `createHoldingOut`).
      const { down, stoop } = one.who === 'moa' ? umbrellaOut.update(umbrellaAsked, clock, dt, !hasFrame, calmStory) : { down: 0, stoop: 0 };
      gesture.stoop = stoop;
      // Down in a crouch at the edge, to hold it out low to him (./umbrella-hold.ts).
      if (gesture.stoop > 0.001) holdingOut(posed, one.rig.legs, gesture.stoop);
      // Bertil kicks the ball Elof rides ("Upp på bollen! Jag skjuter, du flyger!"): turned to it, a wind-up, the
      // swing through, arms out, and back to standing.
      if (one.who === 'bertil' && kickSince >= 0 && kickSince < 0.9) {
        // Eased at both ends, and the turn to the ball is a quick turn, not a jump.
        const ready = smooth(kickSince / 0.15), swing = smooth((kickSince - 0.15) / 0.2), back = smooth((kickSince - 0.45) / 0.45);
        const on = (1 - back) * ready;
        posed.legR += ((-0.5 * ready + 1.7 * swing) * (1 - back) - posed.legR) * on;
        posed.kneeR += ((1.2 * ready * (1 - swing) + 0.15) * (1 - back) - posed.kneeR) * on;
        posed.lean += (-0.18 * swing - posed.lean) * on;
        posed.armL = Math.max(posed.armL, 0.9 * on);
        posed.armR = Math.max(posed.armR, 0.5 * on);
        facing = facingBetween(facing, 1.2, on);
        turnRate += 12 * on;
      }
      // On Myren, called, Mamma's hands lift the dead pine across the pool: she bends to its end and holds it while it
      // rises, and lets go once it lies across (the mover `pine`, which goes up by itself as her hands lift it).
      const pine = one.glad === 'mamma' && chapter.id === 'myren' ? scene.getObjectByName('mover:pine') : undefined;
      const lifting = !!pine && flags.has('mamma') && pine.position.y < -0.42;
      // Her end stays in her hands while the far end is lowered onto the opposite bank.
      if (pine) pine.rotation.z = flags.has('placed:pine') ? 0 : pineTilt(pine.position.y);
      // In Granskogen, called, Pappa bends to his seesaw and holds its high end steady while Elof fetches the cone and
      // climbs on, and lets go as he flies (the ride `launch`).
      if (seesawPlank === undefined) seesawPlank = chapter.id === 'granskog' ? scene.getObjectByName('seesaw-plank') ?? null : null;
      const board = one.who === 'pappa' ? seesawPlank : null;
      const arrived = !one.walk || Math.hypot(one.walk.to.x - one.walk.place.position.x, one.walk.to.z - one.walk.place.position.z) < 0.05;
      const holding = !!board && arrived && flags.has('seesaw') && !flags.has('launch');
      // In the epilogue Pappa comes over with the linden and the knife, and kneels beside Elof while he carves and
      // paints, turned to his hands: the knife always cuts away from the body, with Pappa beside him (plan §2.6).
      const beside = one.who === 'pappa' && !!chapter.epilogue && !!one.walk && arrived && flags.has('knife') && !flags.has('dots');
      if (lifting) gesture.liftFor = 0.6; else gesture.liftFor = Math.max(0, gesture.liftFor - dt);
      // Without motion the bend is there at once, and gone at once.
      gesture.lift = calmStory ? (gesture.liftFor > 0 ? 1 : 0) : gesture.lift + ((gesture.liftFor > 0 ? 1 : 0) - gesture.lift) * ease(6, dt);
      if (gesture.lift > 0.001) {
        const w = gesture.lift;
        facing = facingBetween(facing, .9, w);
        mammaLogPose(posed, one.rig.legs, w);
      }
      const kneels = holding || beside;
      gesture.hold = calmStory ? (kneels ? 1 : 0) : gesture.hold + ((kneels ? 1 : 0) - gesture.hold) * ease(4, dt);
      if (gesture.hold > 0.001) {
        // Down on his right knee, the left foot forward, leaning to the board, turned towards it.
        // Mixed so that at full weight each is exactly its value, frame after frame (a paused picture never drifts).
        const w = gesture.hold, mixTo = (from: number, to: number) => from * (1 - w) + to * w;
        posed.lean = mixTo(posed.lean, 0.85);
        posed.legL = mixTo(posed.legL, 1.35); posed.kneeL = mixTo(posed.kneeL, 1.55);
        posed.legR = mixTo(posed.legR, 0.1); posed.kneeR = mixTo(posed.kneeR, 1.65);
        facing = facingBetween(facing, board ? -0.95 : -1.15, w);
      }
      // In the garden, until he calls her, Moa crouches and reaches into the root hole the ghost crept into ("Där
      // kröp spöket in. Jag får inte plats!"); her fingers will not go in.
      // She reaches in once the ghost has crept in: first she watches it go.
      const reachesIn = one.who === 'moa' && chapter.id === 'garden' && !flags.has('moa') && Math.abs(one.at - ROOT_HOLE.x) < 4 && (ghostState?.gone ?? true);
      gesture.reach = calmStory ? (reachesIn ? 1 : 0) : gesture.reach + ((reachesIn ? 1 : 0) - gesture.reach) * ease(5, dt);
      if (gesture.reach > 0.001) {
        const w = gesture.reach;
        // Down on one knee, as Pappa kneels by his seesaw, so that her hand reaches the hole at the roots' foot.
        posed.lean += (Math.max(posed.lean, 0.85) - posed.lean) * w;
        posed.legL += (1.35 - posed.legL) * w; posed.kneeL += (1.55 - posed.kneeL) * w;
        posed.legR += (0.1 - posed.legR) * w; posed.kneeR += (1.65 - posed.kneeR) * w;
        facing = facingBetween(facing, -0.5, w);
      }
      // Lowering the scarf and holding it, they lean out over the railing a little, unless they walk with him.
      if (scarf) posed.lean += 0.3 * scarf.weight * (1 - (one.walk?.pace ?? 0));
      one.rig.group.rotation.y = turnFamily(one.rig.group.rotation.y, facing, dt, calmStory, turnRate);
      let shown = true;
      for (let node: Object3D | null = one.rig.group; node; node = node.parent) if (!node.visible) shown = false;
      // With a scarf in both hands, the lamp is set down where the chapter says, and lights him from there (and stays).
      const setDown = scarf ? scarf.lamp : null;
      const lit = shown && !one.paddle && !one.seated && gesture.pull < 0.5 && !carrying && !(scarf && scarf.weight > 0.001 && !setDown)
        && (rainGearFor(chapter, one.who, flags) !== null || (chapter.id === 'stormkvall' && one.who === 'pappa' && flags.has('lamp:give')));
      // Reserve the same carrying hand before adding speech; otherwise its gesture changes the elbow plane
      // that the lamp's final grip solves against. Moa's other hand is occupied by her umbrella.
      const holdsKlonk = frozenLedge && one.who === 'pappa' && chapter.storm?.frozen && flags.has(chapter.storm.frozen)
        && !(chapter.storm.wakes && flags.has(chapter.storm.wakes)) && x < frozenLedge.x + frozenLedge.width / 2 + 3;
      if (holdsKlonk) lampTo.set(frozenLedge.x, frozenLedge.y, 0);
      // Woken beside him, Klonk is out of the light: "Nu lyser jag på stigen", at Elof's heels (Klonk stood in its cone).
      else if (frozenLedge && one.who === 'pappa' && chapter.storm?.wakes && flags.has(chapter.storm.wakes) && x < frozenLedge.x + frozenLedge.width / 2 + 3) lampTo.set(x - 0.8, y + 0.1, 0);
      else lampTo.set(x, y + tall * .4, 0);
      const lampSide = familyLampSide(one.who, !!umbrellaRide), lampWeight = lampCarryWeight(gesture.pull);
      // What is said (./talk.ts): they look at whoever speaks, from where their face was a moment ago, and speak with their
      // mouths, their heads and a free hand; drawn on a copy, which their own motion never keeps.
      const said = talk.lookAt(one.who), there = said ? talk.face(said) : null;
      if (there) one.rig.mouth(faceAt);
      one.talker.update(talk, there ? lookAt(one.rig.group, faceAt, there, heard) : null, lifeDt, calmStory,
        one.seated || one.paddle || carrying || umbrellaUp || offersCap && (capSince < 0 || holdsCap) || !!(scarf && scarf.weight > 0.001) || gesture.hold > 0.001 || gesture.lift > 0.001 || gesture.pull > 0.001 ? NO_HANDS : lit && !setDown ? FREE_WITH_LAMP[lampSide]! : BOTH_HANDS);
      one.talker.pose(Object.assign(spokenPose, posed));
      if (lit && !setDown) quietLampArm(spokenPose, lampSide, lampWeight);
      one.rig.pose(one.seated ? sitting(spokenPose, one.rig.legs) : one.paddle ? one.paddle.stance(spokenPose) : spokenPose);
      one.rig.face?.(one.talker.mouth.open, one.talker.mouth.round, one.talker.lids);
      if (offersCap) {
        one.rig.group.updateWorldMatrix(true, false);
        const tall = one.rig.height;
        if (capSince >= 0 && capGift!.prop && capSince <= capTime) {
          if (capSince <= dt) capFrom.set(0, tall * .98, tall * .13).applyMatrix4(one.rig.group.matrixWorld);
          const k = capHandoff(capSince, capTime).lower;
          capAt.set(capGift!.ride.from.x, capGift!.ride.from.y - .05, 0).lerp(capFrom, 1 - k);
          capAt.y += Math.sin(Math.PI * k) * .25;
          capGift!.prop.position.copy(capAt);
          capGift!.prop.rotation.set(Math.PI * (1 - smooth(k / .55)), 0, 0);
          drawnWhile(capGift!.prop, capSince >= capTime * .12);
        }
        capHands(one.rig, capSince, capTime, capAt);
      }
      if (scarf && scarf.weight > 0.001 && one.walk) {
        // Both hands on it, out over the railing, the one over the other; the scarf hangs from the lower (./scarf.ts).
        scarf.hands(one.walk.place.position, scarfLower, scarfUpper);
        one.rig.reach(0, scarfLower, scarf.weight);
        one.rig.reach(1, scarfUpper, scarf.weight);
        const grip = { kind: 'power' as const, size: 0.05 };
        one.rig.hold?.(0, grip, scarf.weight);
        one.rig.hold?.(1, grip, scarf.weight);
        if (one.rig.socket) one.rig.socket(0, grip, scarfTop); else one.rig.hand(0, scarfTop);
        scarfHeld = true;
      }
      if (gesture.lift > 0.001 && pine) {
        // Both hands under the pine's end, a hand's width apart.
        const end = pine.position.x - 4.3 + .1, at = pine.position.y + .2 - 4.2 * Math.sin(pine.rotation.z);
        lampAim.set(Math.cos(pine.rotation.z), Math.sin(pine.rotation.z), 0);
        for (const side of [0, 1] as const) {
          rootReach.set(end + (side === 0 ? -.15 : .15), at, side === 0 ? .12 : -.12);
          if (one.rig.grasp) one.rig.grasp(side, { kind: 'power', size: .14 }, rootReach, lampAim, lampHeld, gesture.lift);
          else one.rig.reach(side, rootReach, gesture.lift);
        }
      }
      if (gesture.hold > 0.001 && board) {
        // A hand on the board's high end, over it, with the hand on that side; the other on his knee.
        board.localToWorld(rootReach.set(2.05, 0.1, 0));
        lampLocal.copy(rootReach);
        one.rig.group.worldToLocal(lampLocal);
        one.rig.reach(lampLocal.x >= 0 ? 0 : 1, rootReach, gesture.hold);
      }
      if (gesture.reach > 0.001) {
        const poke = calmStory ? 0 : Math.sin(clock * 2.3) * 0.12;
        one.rig.reach(1, rootReach.set(ROOT_HOLE.x + 0.2 + poke, ROOT_HOLE.y + 0.3, -0.2), 0.9 * gesture.reach);
      }
      if (chapter.id === 'myren' && one.glad === 'mamma') {
        if (one.braidTip) one.braidTip.getWorldPosition(rootReach);
        else one.rig.group.localToWorld(rootReach.set(-.18, one.rig.height * .55, .28));
        climbs.attachBraid(rootReach);
        one.braidHeld = (one.braidHeld ?? 0) + ((flags.has('braid') ? 1 : 0) - (one.braidHeld ?? 0)) * ease(6, dt);
        if (one.braidHeld > .001) {
          one.rig.reach(1, rootReach, one.braidHeld);
          one.rig.hold?.(1, { kind: 'power', size: .055 }, one.braidHeld);
        }
      }
      one.paddle?.update(one.rig, clock, calmStory);
      if (gesture.pull > 0.001) {
        one.rig.group.updateWorldMatrix(true, false);
        const u = one.rig.height / 5.2;
        bootAt.set(-0.33 * u, 1.05 * u, 0.55 * u).applyMatrix4(one.rig.group.matrixWorld);
        one.rig.reach(0, bootAt, gesture.pull);
        one.rig.reach(1, bootAt, gesture.pull);
      }
      // Out in the storm the family search with their lamps ("Regnrockar på! Vi går ut med lampor."): each holds a
      // lit flashlight in the left hand, the arm a little out, and lights the way to him. In Stormkvällen Pappa has
      // the one Elof brought him; in Stormskogen he holds Klonk in its beam until Elof is over.
      if (lit && !one.lamp) { one.lamp = litLamp(); one.lamp.name = 'family-lamp'; scene.add(one.lamp); }
      if (one.lamp) {
        one.lamp.visible = lit;
        if (lit && setDown) {
          lampAim.set(x - setDown.x, y + tall * 0.4 - setDown.y, -setDown.z);
          lampAim.z = Math.min(lampAim.z, Math.hypot(lampAim.x, lampAim.y) * 0.3);
          one.lamp.position.set(setDown.x, setDown.y, setDown.z);
          one.lamp.quaternion.setFromUnitVectors(LAMP_POINTS, lampAim.normalize());
          one.lamp.scale.setScalar(Math.max(0.7, one.rig.height / 5.2));
          one.lamp.getObjectByName('lamp-beam')!.visible = tier !== 'low';
        } else if (lit) {
          const u = one.rig.height / 5.2;
          one.rig.group.updateWorldMatrix(true, false);
          holdFlashlight(one.rig, one.lamp, lampSide, lampTo, Math.max(.7, u), true, lampWeight, null, 1, calmStory ? undefined : clock);
          one.lamp.getObjectByName('lamp-beam')!.visible = tier !== 'low';
        }
      }
      if (umbrellaUp && shown && umbrellaRide?.prop) {
        // Her umbrella by its crook in her left fist (./umbrella-hold.ts): before her chest, its canopy clear over her head
        // and leaning into the wind; called, held out low at the wall's edge, at the ride's start where his raised hands
        // will take it, and less leaning. The fist goes where it reaches; the umbrella goes with the fist.
        const start = umbrellaRide.ride.from;
        one.rig.group.updateWorldMatrix(true, false);
        one.rig.group.localToWorld(umbrellaHand.copy(UMBRELLA.held).multiplyScalar(one.rig.height));
        umbrellaHand.lerp(umbrellaHeld.set(start.x, start.y + UMBRELLA.hang, 0), down);
        heldUp(clock, Math.min(1, Math.abs(gale * windAt(one.at))), calmStory, umbrellaAxis, 1 - 0.6 * down);
        if (one.rig.grasp) one.rig.grasp(0, UMBRELLA_GRIP, umbrellaHand, umbrellaAxis, umbrellaHeld, 1);
        else { one.rig.reach(0, umbrellaHand, 1); one.rig.hand(0, umbrellaHeld); }
        holdAt(umbrellaRide.prop, umbrellaHeld, umbrellaAxis);
        umbrellaCarry?.held(umbrellaRide.prop);
        drawnWhile(umbrellaRide.prop, true);
      }
      one.rig.breeze?.(gale * windAt(carrying ? x : one.at), dt, calmStory);
      // Where their face is, for the others to look at as they speak.
      if (shown) {
        one.rig.mouth(faceAt);
        talk.place(one.who, faceAt.x, faceAt.y, faceAt.z);
      }
    }
    // The scarf from the holder's hands, hanging, or straight down to Elof's while it carries him (./scarf.ts).
    scarves?.update(scarfHeld ? scarfTop : null, onScarf ? scarfBottom : null, dt, clock, gale * windAt(x), calmStory);
    // The family in a scene, too: their hair and caps in the same wind, where each stands now.
    for (const actor of stage.actors.values()) {
      if (actor.visible()) actor.rig.breeze?.(gale * windAt(actor.rig.group.matrixWorld.elements[12]!), dt, calmStory);
    }
    // Rain gear in the storm, as the story has them put it on (./rain-gear.ts): the family at the help points and in
    // the scenes, going on as they put it on. Only when it changes: a model that has just taken a figure's place is
    // dressed afresh.
    for (const [who, actor] of stage.actors) dressFor(actor.rig, who, flags, sceneFrame ?? null, calmStory);
    for (const one of family) {
      dressFor(one.rig, one.who, flags, sceneFrame ?? null, calmStory);
      bareFor(one.rig, one.who, flags);
    }
    if (chapter.id === 'norrsken') {
      const carving = scene.getObjectByName('mover:tragubbe');
      // Out of the crack for good, the lace is off it: its ring no longer hides the face he paints.
      const ring = carving?.getObjectByName('pull-ring');
      if (ring) ring.visible = !flags.has('placed:tragubbe');
      if (carving && rescue) rescue.update(playerBody, elof.group, carving as Group, flags,
        sceneFrame?.id === 'snoret' ? clamp((sceneFrame.seconds - .4) / 1.7, 0, 1) : 1,
        flags.has('nr:rope-ready') && !flags.has('placed:tragubbe'), clock, dt, calmStory,
        sceneFrame?.id === 'uppdragen' ? smooth(clamp((sceneFrame.seconds - .5) / .65, 0, 1)) * (1 - smooth(clamp((sceneFrame.seconds - 1.9) / .6, 0, 1))) : 0,
        sceneFrame?.id === 'snoret', rescueGrip);
      if (carving && flags.has('taste') && !homeJourney) {
        // It was dragged up behind him: as he tastes it is set upright at his feet, from where it lay, not by a jump.
        const settle = sceneFrame?.id === 'aterfunna' && !calmStory ? smooth(clamp(sceneFrame.seconds / .7, 0, 1)) : 1;
        carving.position.set(lerp(carving.position.x, 26.05, settle), 0, lerp(.12, .2, settle)); carving.rotation.z = 0;
        ghostPlace.position.set(27.8, 0, .1); ghostPlace.visible = true;
      }
      if (homeJourney && flags.has('home')) {
        // The home ride is visibly Pappa carrying Elof, with both returned carvings alongside him.
        const k = clamp(shoulderLift / 4.25, 0, 1), weight = k * k * (3 - 2 * k);
        const pappa = family.find(one => one.who === 'pappa'), model = pappa?.rig.group;
        if (model && pappa) {
          // Carrying him, Pappa walks the trail down the mountainside, his feet on it (./home-trail.ts); set down,
          // they stand on the valley floor where Elof is.
          const from = model.parent!.position;
          const carrying = onShoulders || shoulderLift > 0;
          if (homeTrail) homeTrail.feet(x, pappaFeet, from.z);
          else pappaFeet.z = from.z;
          if (!homeTrail || !carrying) pappaFeet.y = y;
          model.position.set(x - pappa.at, pappaFeet.y - from.y, pappaFeet.z - from.z);
          if (carrying) playerGroundY = pappaFeet.y;
          if (shoulderLift > 0) {
            carryAhead.set(Math.sin(model.rotation.y), 0, Math.cos(model.rotation.y));
            if (pappa.neck) pappa.neck.getWorldPosition(seat);
            else pappa.rig.mouth(seat).addScaledVector(carryUp, -.65).addScaledVector(carryAhead, -.18);
            // His pelvis rests behind the neck, with his thighs either side of it. Anchor the actual hips,
            // not his feet/root at Pappa's head: different body proportions keep the same real contact.
            seat.addScaledVector(carryAhead, -.09 * tall).addScaledVector(carryUp, .045 * tall);
            Object.assign(shoulderPose, spokenPose);
            shoulderPose.legL = lerp(playerPose.legL, 1.16, weight); shoulderPose.legR = lerp(playerPose.legR, 1.16, weight);
            shoulderPose.kneeL = lerp(playerPose.kneeL, 1.32, weight); shoulderPose.kneeR = lerp(playerPose.kneeR, 1.32, weight);
            shoulderPose.splayL = shoulderPose.splayR = .30 * weight;
            shoulderPose.seat = null;
            elof.group.rotation.y += (model.rotation.y - Math.PI / 2 - elof.group.rotation.y) * weight;
            playerBody.pose(shoulderPose);
            if (playerHips[0] && playerHips[1]) {
              carryHips.copy(playerHips[0].getWorldPosition(boot)).add(playerHips[1].getWorldPosition(palm)).multiplyScalar(.5);
            } else carryHips.copy(elof.group.position).addScaledVector(carryUp, .4 * tall);
            elof.group.position.addScaledVector(seat.sub(carryHips), weight);
            for (const side of [0, 1] as const) {
              const foot = playerFeet[side];
              if (!foot) continue;
              foot.getWorldPosition(boot).addScaledVector(carryUp, -.025 * tall);
              pappa.rig.grip(side, boot, carryUp, palm, weight);
              pappa.rig.hold?.(side, { kind: 'power', size: .08 }, weight);
            }
          }
        }
        carryAhead.set(Math.cos(elof.group.rotation.y), 0, -Math.sin(elof.group.rotation.y));
        carrySide.set(carryAhead.z, 0, -carryAhead.x);
        playerBody.mouth(seat).addScaledVector(carryUp, -.27 * tall).addScaledVector(carryAhead, .18 * tall);
        ghostPlace.visible = true; ghostPlace.scale.setScalar(1);
        ghostMotion.update({ dt, clock, hop: null, calm: calmStory, awake: true, staged: true });
        holdCarving(playerBody, 0, boot.copy(seat).addScaledVector(carrySide, .2 * tall), carryUp, .43, .12, ghostPlace.position, carryAxis);
        ghostPlace.quaternion.setFromUnitVectors(carryUp, carryAxis);
        ghostGroundY = playerGroundY;
        if (carving) {
          holdCarving(playerBody, 1, boot.copy(seat).addScaledVector(carrySide, -.2 * tall), carryUp, .39, .13, carving.position, carryAxis);
          carving.quaternion.setFromUnitVectors(carryUp, carryAxis);
        }
      }
      sharedSweets?.update(flags, ghostPlace.position, carving ?? undefined, x);
    }
    characterShadows.update(look.x, centreY, viewHeight * look.zoom * Math.max(1, camera.aspect) * .65, clock, calmStory ? 0 : gale * windAt(look.x));
    // Gate 6 (plan §6.12): no shader is compiled during play. The first frames, and the first after a model
    // has arrived, draw the whole chapter, in view or not, so that every material's shader exists from then on.
    if (modelInstallations !== warmedFor) {
      warmedFor = modelInstallations;
      warm = 2;
    }
    warming = warm > 0;
    draw();
    hasFrame = true;
  }

  return {
    get warming() { return warming; },
    get resolutionSteps() { return resolutionSteps; },
    get maxResolutionSteps() { return maxResolutionSteps(maxPixelRatio); },
    ready,
    get loaded() { return arrived / parts.length; },
    async restore() {
      await ready;
      await assets.restoreTextures();
      resize();
      warmedFor = -1;
      warm = 2;
      if (hasFrame) while (warm > 0) draw();
    },
    resize,
    render,
    capture: () => hasFrame ? captureFrame(canvas) : Promise.resolve(null),
    snapshot(focus) {
      // Call it right after a render, as `capture`: the drawing buffer is not kept.
      if (!hasFrame || canvas.width <= 0 || canvas.height <= 0) return null;
      const rect = canvas.getBoundingClientRect();
      const toCanvas = rect.width > 0 ? canvas.width / rect.width : 1;
      const point = focus ? { x: (focus.x - rect.left) * toCanvas, y: (focus.y - rect.top) * toCanvas } : null;
      const cut = photoCut(canvas.width, canvas.height, point);
      const copy = canvas.ownerDocument.createElement('canvas');
      const scale = Math.min(1, 720 / cut.width, 480 / cut.height);
      copy.width = Math.max(1, Math.round(cut.width * scale));
      copy.height = Math.max(1, Math.round(cut.height * scale));
      try {
        copy.getContext('2d')?.drawImage(canvas, cut.x, cut.y, cut.width, cut.height, 0, 0, copy.width, copy.height);
      } catch { return null; }
      return copy;
    },
    setTier(next) {
      const chosen = chooseTier(next, hdrAvailable);
      if (tier === chosen) return;
      const changesPipeline = (tier === 'low') !== (chosen === 'low') || tier === 'high' || chosen === 'high';
      tier = chosen;
      seeRich(camera, tier);
      characterShadows.setTier(tier);
      materialGrade.setEnabled(tier === 'low');
      resolutionSteps = 0;
      gradePass?.setGlow(tier === 'high' ? GLOW_ON_HIGH : 0);
      CLOSE_DETAIL.value = tier === 'low' ? 0 : 1;
      gradePass?.setSmoothEdges(tier !== 'low' && edgesHere);
      resize();
      // The previous tier's storage has been released/resized; new allocations use this tier's budget.
      gpu?.resetPeaks();
      // Low and HDR need different material variants. Compile against their actual play targets before
      // the paused settings handler returns. Entering High also warms its half-resolution depth, bloom and water passes.
      if (changesPipeline) {
        warm = 2;
        if (hasFrame) while (warm > 0) draw();
      }
    },
    setResolutionSteps(steps) {
      const next = Math.min(maxResolutionSteps(maxPixelRatio), Math.max(0, Math.floor(steps)));
      if (resolutionSteps === next || !Number.isFinite(next)) return;
      resolutionSteps = next;
      resize();
    },
    playerScreen(up = 0.5) {
      elof.group.localToWorld(projectedPlayer.set(0, up, 0));
      projectedPlayer.z = 0;
      return project(projectedPlayer);
    },
    helperScreen() {
      if (!hasFrame || !helper.active) return null;
      const rect = canvas.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      helper.actor.getWorldPosition(projectedPlayer);
      projectedPlayer.y += 0.5;
      projectedPlayer.project(camera);
      if (!Number.isFinite(projectedPlayer.x) || !Number.isFinite(projectedPlayer.y) || Math.abs(projectedPlayer.z) > 1 || Math.abs(projectedPlayer.x) > 1 || Math.abs(projectedPlayer.y) > 1) return null;
      return { x: rect.left + (projectedPlayer.x + 1) * rect.width / 2, y: rect.top + (1 - projectedPlayer.y) * rect.height / 2 };
    },
    ghostScreen() {
      // In the garden the visiting helper replaces the chase ghost. Later helpers are birds, so they
      // never become a memory's origin. Use the rendered transform, including its hop and scale.
      const actor = ghostPlace.visible && ghost.visible ? ghostPlace
        : ghostHelps && helper.active && helper.group.visible && helper.actor.children[0]?.visible ? helper.actor : null;
      if (!hasFrame || !actor?.visible || Math.min(actor.scale.x, actor.scale.y, actor.scale.z) <= 0.001) return null;
      actor.localToWorld(projectedPlayer.set(0, 1.35, 0));
      return project(projectedPlayer, 1);
    },
    worldScreen(at) { return project(projectedPlayer.set(at.x, at.y, 0)); },
    react(what, calm = false) { reaction = what; responseFor = 0.85; calmResponse = calm; },
    info: () => ({
      tier,
      hdrAvailable,
      drawCalls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      programs: renderer.info.programs?.length ?? 0,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      gpu: gpu?.snapshot() ?? null,
      pixelRatio,
      maxPixelRatio,
      resolutionSteps,
      resizes,
      width: canvas.width,
      height: canvas.height,
      models,
      compressedTextures,
      assetTextures: assets.textureInfo(),
      roles,
      shadows: characterShadows.info(),
    }),
  };
}

/** One of the family at a help point; replacement keeps its greeting and movement state. */
interface Relative {
  /** They sit, in a boat, say. */
  seated?: boolean | undefined;
  /** They stand on a paddle board and paddle: the paddle they hold. */
  paddle?: Paddle | undefined;
  /** Out in the storm: the flashlight they search with, made when first wanted. */
  lamp?: Mesh | undefined;
  rig: Rig;
  neck?: Object3D;
  braidTip?: Object3D;
  braidHeld?: number;
  who: Role;
  motion: ReturnType<typeof createFamilyMotion>;
  /** Where they stand, along the course. */
  at: number;
  /** The flag that makes them glad, and whether it was set when last looked at. */
  glad: string | undefined;
  was: boolean;
  /** Seconds of delight left. */
  joy: number;
  /**
   * Where they walk once called (Spot.goesTo), the place they are drawn at (moved as they walk), where it stood at
   * first, how far they have walked in strides, how briskly, and whether a frame has placed them yet.
   */
  walk?: { to: { x: number; y: number; z: number }; when?: string | undefined; place: Object3D; home: Vector3; stride: number; pace: number; gait: number; seen: boolean; heading?: number } | undefined;
  /** Their part in what is said (./talk.ts). */
  talker: Talker;
}

function startState(chapter: ChapterData): PlayerState {
  return {
    x: chapter.spawn.x, y: chapter.spawn.y, vx: 0, vy: 0, facing: 1, grounded: true, groundY: chapter.spawn.y,
    standY: chapter.spawn.y, atEdge: false, bubble: 0, mode: 'free', t: 0, verb: null, hook: null, word: null,
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
  // Closed well below the deepest pit, so that the outline never crosses itself.
  const bottom = Math.min(...line.map((p) => p.y)) - 12;
  shape.lineTo(last.x + 14, bottom);
  shape.lineTo(first.x - 14, bottom);
  shape.closePath();
  // From well behind the play plane to a little in front of it: enough to stand on, and little enough that
  // a wall doesn't hide what is beside it when the camera looks along the course.
  const geometry = new ExtrudeGeometry(shape, { depth: 4.7, bevelEnabled: false });
  geometry.translate(0, 0, -4);
  return new Mesh(geometry, new MeshStandardMaterial({ color: '#7f8f58', roughness: 1 }));
}

/**
 * Night and the northern lights (plan §3.4, the final). When the chapter's flag is set, the sky darkens over
 * a few seconds, the light turns low and blue, and the northern lights flare far behind the scene
 * (./aurora.ts), lighting the tops of things a little green. Indoors only the windows show them.
 */
function buildNight(chapter: ChapterData, sky: Color, hemisphere: HemisphereLight, sun: DirectionalLight) {
  const group = new Group();
  if (!chapter.night) return { group, update: () => 0 };
  const after = chapter.night.after;
  const day = sky.clone();
  // Night from the start is there at once: it doesn't fall while he watches.
  const dark = new Color('#14244a');
  const lights = { hemisphere: hemisphere.intensity, sun: sun.intensity, above: hemisphere.color.clone() };
  const green = new Color('#8fffc8');
  const aurora = chapter.house ? null : createAurora();
  if (aurora) group.add(aurora.mesh);
  let k = after === null ? 1 : 0;
  // The lights' own time stands still with less motion: they hang as they are.
  let drift = 0;
  /** `most` caps the lights: lower on Low, where they are added after the picture's tone mapping. */
  function update(flags: ReadonlySet<string>, dt: number, most: number, still: boolean, lifeDt: number): number {
    k = Math.min(1, Math.max(0, k + (after === null || flags.has(after) ? dt : -dt) / 3));
    // Nightfall belongs to the story's event time. The sky's quiet movement, like breathing, continues
    // during reading; Pause supplies zero lifeDt and reduced motion holds the current curtain exactly.
    if (!still) drift += lifeDt;
    sky.copy(day).lerp(dark, k);
    // The night sky and the moon still light what faces up and out: the ground and the faces stay readable (the
    // light pass of 6 November 2026; at 0.75 and 0.7 the finale's summit and the epilogue's room went murky).
    hemisphere.intensity = lerp(lights.hemisphere, 1.05, k);
    sun.intensity = lerp(lights.sun, 0.9, k);
    if (aurora) {
      aurora.update(k, drift, most);
      hemisphere.color.copy(lights.above).lerp(green, 0.25 * k);
    }
    return k;
  }
  return { group, update };
}

/**
 * The gusts (plan §4.7, E4), in greybox: boulders to shelter behind, and pale streaks over the open ground.
 * In the second before a gust the streaks show faintly where it will come; while it blows they sweep across,
 * against the way he is going.
 *
 * A streak is a wisp of air: soft, a little wavy, thickest in its middle and gone at both ends, added to what is
 * behind it, and fainter in front of the plane he moves in than behind it (visual audit, berget row 8). They were
 * hard white lines, like a broken display.
 */
function buildWind(chapter: ChapterData) {
  const group = new Group();
  const STREAKS = 14;
  const stone = new MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const wisp = windWisp();
  const shade = new Color();
  const stretches = (chapter.gusts ?? []).map((def) => {
    // The boulders: plain lumps in one mesh, until the mountain kit's are there, each with its lee shelves as its own steps.
    group.add(shelterStandIn(def, stone));
    const material = new MeshBasicMaterial({ color: '#fff6ee', map: wisp, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending });
    const streaks = new InstancedMesh(new PlaneGeometry(1, 0.32), material, STREAKS);
    // Named, so that a pack drawing the gust as something else (Flärken's waves, ./jetty-waves.ts) can soften them.
    streaks.name = 'gust-streaks';
    streaks.instanceMatrix.setUsage(DynamicDrawUsage);
    streaks.frustumCulled = false;
    for (let k = 0; k < STREAKS; k++) streaks.setColorAt(k, shade.setScalar(k % 3 === 0 ? 0.45 : 0.8 + (k % 2) * 0.2));
    group.add(streaks);
    return { def, material, streaks };
  });
  const place = new Object3D();
  /** Moves the streaks, and says which gust blows now, for what grows there to lean in (./wind.ts). */
  function update(gusts: readonly { blow: number; warn: number }[], clock: number): Blow | null {
    let blowing: Blow | null = null;
    for (const [i, { def, material, streaks }] of stretches.entries()) {
      const gust = gusts[i];
      const blow = gust?.blow ?? 0;
      const warn = gust?.warn ?? 0;
      // It swells and dies down as the streaks do.
      if (blow > 0) blowing = { from: def.from, to: def.to, blow: Math.sin(Math.PI * Math.min(1, blow)) };
      material.opacity = blow > 0 ? 0.7 * Math.sin(Math.PI * Math.min(1, blow)) + 0.08 : warn * 0.25;
      drawnWhile(streaks, material.opacity > 0);
      const span = def.to - def.from;
      for (let k = 0; k < STREAKS; k++) {
        const along = (k * 0.618 + (blow > 0 ? blow * 1.6 : 0)) % 1;
        place.position.set(def.to - along * span, def.y + 0.25 + (k % 5) * 0.34 + Math.sin(clock * 5 + k) * 0.03, 0.4 - (k % 3) * 0.5);
        place.scale.set((blow > 0 ? 2.6 : 0.9 + warn * 0.7) * (0.8 + (k % 4) * 0.12), 1, 1);
        place.updateMatrix();
        streaks.setMatrixAt(k, place.matrix);
      }
      streaks.instanceMatrix.needsUpdate = true;
    }
    return blowing;
  }
  return { group, update };
}

/**
 * The cranberries (plan §4.8, O7): red, round and shiny, as big as he is wide, lying just behind the path so
 * that he walks in front of one and comes down on top of it. Each is scaled from the ground it lies on.
 */
function buildBerries(chapter: ChapterData): Group[] {
  const skin = new MeshStandardMaterial({ color: '#c2222e', roughness: 0.28, emissive: '#3a0508', emissiveIntensity: 0.35 });
  const dark = new MeshStandardMaterial({ color: '#4a1218', roughness: 0.8 });
  return (chapter.bouncers ?? []).map((b) => {
    const group = new Group();
    group.name = 'bouncer';
    const berry = new Mesh(new SphereGeometry(BERRY_HALF, 24, 16), skin);
    berry.scale.y = BERRY_HEIGHT / (2 * BERRY_HALF);
    berry.position.y = BERRY_HEIGHT / 2;
    // The little dimple where the flower sat.
    const calyx = new Mesh(new SphereGeometry(0.07, 10, 8), dark);
    calyx.position.set(0.12, BERRY_HEIGHT - 0.03, 0.2);
    group.add(berry, calyx);
    group.position.set(b.x, b.y - BERRY_HEIGHT, -0.35);
    return group;
  });
}

/**
 * The soft tussocks (plan §4.7, E3), in greybox: paler than the firm ground, so that they can be told
 * apart before he lands on one. Each is moved by the simulation.
 */
/** The sedge on a hummock's shoulders, for buildTussocks: thin blades leaning out, as a merged shape. */
function sedge(width: number, seed: number): BufferGeometry {
  const positions: number[] = [], normals: number[] = [], colours: number[] = [], uvs: number[] = [], index: number[] = [];
  const blades = Math.round(10 + width * 9);
  const base = [0.55, 0.6, 0.28], tip = [0.86, 0.82, 0.48];
  for (let i = 0; i < blades; i++) {
    const h = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453, rnd = h - Math.floor(h);
    const angle = i * 2.39996 + seed;
    const r = 0.6 + 0.38 * rnd;
    const height = 0.22 + 0.4 * ((rnd * 7.3) % 1);
    const out = [Math.cos(angle), Math.sin(angle)];
    const x = r * out[0]! * (width / 2), z = r * out[1]! * 1.5 - 0.6;
    const y = -Math.max(0, r - 0.5) * 0.38;
    const lean = 0.35 + 0.3 * rnd;
    const across = [-out[1]! * 0.035, out[0]! * 0.035];
    const top = [x + out[0]! * lean * height, y + height, z + out[1]! * lean * height * 0.6];
    const n = Math.hypot(out[0]! * 0.4, 1, out[1]! * 0.4);
    const at = positions.length / 3;
    positions.push(x - across[0]!, y, z - across[1]!, x + across[0]!, y, z + across[1]!, top[0]!, top[1]!, top[2]!);
    for (let k = 0; k < 3; k++) normals.push((out[0]! * 0.4) / n, 1 / n, (out[1]! * 0.4) / n);
    const shade = 0.8 + 0.3 * ((rnd * 3.1) % 1);
    colours.push(base[0]! * shade, base[1]! * shade, base[2]! * shade, base[0]! * shade, base[1]! * shade, base[2]! * shade, tip[0]!, tip[1]!, tip[2]!);
    uvs.push(0, 0, 1, 0, 0.5, 1);
    index.push(at, at + 1, at + 2, at, at + 2, at + 1);
  }
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  made.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setIndex(index);
  return made;
}

function buildTussocks(chapter: ChapterData, colour: string | null): Mesh[] {
  const moss = new MeshStandardMaterial({ color: colour ?? '#c9c377', roughness: 1, vertexColors: colour !== null });
  return (chapter.tussocks ?? []).map((t) => {
    // In greybox a box. In a place a mound of moss: level on top, where he stands, and round at its shoulders.
    const geometry = colour
      // A hummock: level where he stands, round at its shoulders, and wider and wider down into the water, as a
      // tussock of the bog is. It narrowed towards its foot, and from above (Mamma's shot) read as a bowl (6 November).
      // Its outline goes up from its foot to its crown: the other way round, the lathe faced inward, and he saw only
      // the inside of its far half, a hollow shell with the water through its front (12 November 2026).
      ? new LatheGeometry([[0, 0], [0.5, 0], [0.8, -0.05], [0.98, -0.18], [1.1, -0.42], [1.22, -0.8], [1.34, -1.3], [1.42, -1.8]].reverse().map(([r, y]) => new Vector2(r, y)), 26).scale(t.width / 2, 1, 1.5)
      : new BoxGeometry(t.width, 1.6, 2.6);
    geometry.translate(0, colour ? 0 : -0.8, -0.6);
    if (colour) {
      // Patches of paler and darker moss, and darker towards the water: no two alike.
      const at = geometry.getAttribute('position');
      const tones: number[] = [];
      for (let i = 0; i < at.count; i++) {
        const patch = 0.84 + 0.2 * Math.sin(at.getX(i) * 1.7 + t.x) * Math.cos(at.getZ(i) * 1.4 + t.x * 1.7);
        // Its sides darken gently down to the water: peat and wet moss, no hard band.
        const deep = 1 - 0.5 * Math.min(1, Math.max(0, (-at.getY(i) - 0.1) / 1.2));
        tones.push(patch * deep, patch * deep * (0.94 + 0.06 * Math.sin(at.getX(i) * 5 + t.x)), patch * deep * 0.9);
      }
      geometry.setAttribute('color', new Float32BufferAttribute(tones, 3));
    }
    // Sedge round its shoulders, leaning out, yellow-green with paler tips, in the same shape (no extra draw): a
    // tussock of the bog, not a bowl. Seen from both sides, so each blade is twice, once each way round.
    const shape = colour ? mergeGeometries([geometry, sedge(t.width, t.x)]) : geometry;
    const mesh = new Mesh(shape ?? geometry, moss);
    mesh.position.set(t.x, t.y, 0);
    return mesh;
  });
}

/**
 * The mist, and the light he carries in it (plan §3.4, Lysklubban). When the chapter's flag is set the fog
 * closes in over a few seconds, and a warm light goes with him. The light is in the scene from the start,
 * dark, so that no shader is compiled when it comes on.
 */
function buildMist(chapter: ChapterData, fog: Fog, haze: { near: number; far: number } | null, sun: DirectionalLight, hemisphere: HemisphereLight) {
  const group = new Group();
  const greybox = { near: fog.near, far: fog.far };
  if (!chapter.mist) return { group, update: () => {}, thick: () => 0 };
  const after = chapter.mist.after;
  const light = new PointLight('#ffcf8a', 0, 9, 1.6);
  // The lollipop, held up like a lantern: it glows through the mist.
  const glow = new Group();
  const sweet = sweetSocket(new Group().add(new Mesh(new SphereGeometry(0.13, 14, 10), new MeshBasicMaterial({ color: '#ffe2a0', fog: false }))),
    { shape: 'lysklubba', scale: 0.62, lantern: true });
  const stick = new Mesh(new CylinderGeometry(0.018, 0.018, 0.4, 6), new MeshBasicMaterial({ color: '#fff6e0', fog: false }));
  stick.position.y = -0.3;
  glow.add(sweet, stick);
  // Its light in the mist round it: a warm halo, brightest at the lantern (visual audit, myren rows 5 and 21).
  const halo = new Mesh(new PlaneGeometry(3.2, 3.2), new MeshBasicMaterial({
    map: drawn(64, 64, (c) => {
      const round = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      round.addColorStop(0, 'rgba(255,255,255,1)');
      round.addColorStop(0.25, 'rgba(255,255,255,0.45)');
      round.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = round;
      c.fillRect(0, 0, 64, 64);
    }),
    color: '#ffc878', transparent: true, opacity: 0, fog: false, depthWrite: false, blending: AdditiveBlending,
  }));
  // Behind the near things the mist is a wall: the far layers, which no haze reaches, go into it. It stands on
  // the water, so that the water in front of it is not painted over.
  const level = Math.min(0, ...(chapter.water ?? []).map((w) => w.y));
  const wall = new Mesh(new PlaneGeometry(90, 40).translate(0, 20, 0), new MeshBasicMaterial({ color: fog.color, transparent: true, opacity: 0, fog: false, depthWrite: false }));
  // Mamma's lamp on the boardwalk, behind him: a second warm point in the mist, where he came from (visual
  // audit, myren row 21). In the mist's own light, its halo's.
  const lamp = new Mesh(new PlaneGeometry(2.5, 2.5), (halo.material as MeshBasicMaterial).clone());
  const flame = new Mesh(new SphereGeometry(0.07, 8, 6), new MeshBasicMaterial({ color: '#fff0c8', fog: false }));
  const at = chapter.mist.lamp;
  if (at) {
    lamp.position.set(at.x, at.y, -0.5);
    flame.position.set(at.x, at.y, -0.45);
  }
  group.add(light, glow, halo, wall, ...(at ? [lamp, flame] : []));
  // In the mist the sun goes pale and the air grey and cool, so that the lantern is the warmest thing there.
  const clearDay = { sun: sun.intensity, sky: hemisphere.intensity, air: fog.color.clone() };
  const grey = new Color('#c4c6bd');
  let k = 0;
  function update(flags: ReadonlySet<string>, x: number, y: number, facing: number, cameraZ: number, dt: number, hand: Vector3 | null = null): void {
    k = Math.min(1, Math.max(0, k + (flags.has(after) ? dt : -dt) / 3));
    // The mist begins just behind the plane he walks in: he, the candy and what is near him stay clear, what is
    // further back goes pale, and 16 behind it is all mist. Before it comes, the air is the place's own.
    const clear = haze ? { near: cameraZ + haze.near, far: cameraZ + haze.far } : greybox;
    fog.near = lerp(clear.near, cameraZ + 0.5, k);
    fog.far = lerp(clear.far, cameraZ + 16, k);
    sun.intensity = clearDay.sun * (1 - 0.45 * k);
    hemisphere.intensity = clearDay.sky * (1 - 0.2 * k);
    fog.color.copy(clearDay.air).lerp(grey, 0.5 * k);
    light.intensity = 7 * k;
    light.position.set(x + facing * 0.3, y + 1.4, 1);
    // Held up in his hand like a lantern, its stick in his fist ("Följ mitt ljus hem till din familj.").
    if (hand) glow.position.set(hand.x, hand.y + 0.26, hand.z + 0.04);
    else glow.position.set(x + facing * 0.32, y + 1.42, 0.25);
    glow.scale.setScalar(k);
    halo.position.set(glow.position.x, glow.position.y, glow.position.z + 0.05);
    (halo.material as MeshBasicMaterial).opacity = 0.85 * k;
    wall.position.set(x, level, -20);
    (wall.material as MeshBasicMaterial).color.copy(fog.color);
    (wall.material as MeshBasicMaterial).opacity = 0.92 * k;
    (lamp.material as MeshBasicMaterial).opacity = 0.6 * k;
    flame.scale.setScalar(k);
    // Only the lollipop, the halos, the lamp's flame and the wall go out of the picture. The light stays, dark:
    // taking a light out compiles every shader anew.
    for (const one of [glow, halo, wall, lamp, flame]) drawnWhile(one, k > 0);
  }
  /** How far the mist has come in: 0 clear, 1 thick. */
  return { group, update, thick: () => k };
}

/**
 * Someone small who follows him (plan §3.4, Tranungen), in greybox: a grey chick with a long neck. It
 * waits, follows a little behind him once its flag is set, and stays at its home when it has come there.
 * While it follows, rings rise from its home: its family calling, shown without sound.
 */
function buildFollower(chapter: ChapterData) {
  const group = new Group();
  const def = chapter.follower;
  if (!def) return { group, update: () => {} };
  // The crane chick (crane.ts): it walks on its long legs, turns through facing the camera, and bobs its head.
  const chick = craneChick();
  const gait: Gait = { phase: 0, speed: 0, facing: 0 };
  chick.group.position.set(def.at.x, def.at.y, 0);
  group.add(chick.group);
  const rings = [0, 1, 2].map(() => {
    const ring = new Mesh(new TorusGeometry(0.5, 0.025, 8, 36), new MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });
  function update(flags: ReadonlySet<string>, elof: PlayerState, clock: number, dt: number): void {
    const following = flags.has(def!.after) && !flags.has(def!.until);
    const to = flags.has(def!.until) ? def!.home : following ? { x: elof.x - elof.facing * 1.2, y: elof.standY } : def!.at;
    const from = chick.group.position.x;
    chick.group.position.x += (to.x - from) * ease(following ? 4 : 2.5, dt);
    chick.group.position.y += (to.y - chick.group.position.y) * ease(6, dt);
    stepChick(chick, gait, chick.group.position.x - from, dt, clock);
    for (const [i, ring] of rings.entries()) {
      const k = (clock * 0.45 + i / rings.length) % 1;
      ring.position.set(def!.home.x, def!.home.y + 0.6 + k * 3.2, 0);
      ring.scale.setScalar(0.5 + k * 1.6);
      const opacity = following ? Math.sin(Math.PI * k) * 0.8 : 0;
      (ring.material as MeshBasicMaterial).opacity = opacity;
      drawnWhile(ring, opacity > 0);
    }
  }
  return { group, update };
}

/** The rolling cones of the avalanche (plan §4.7, E2): brown, long, turning as they go. One instanced mesh. */
function buildCones(count: number) {
  const mesh = forestSocket(new InstancedMesh(new SphereGeometry(1, 12, 8), new MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 }), Math.max(1, count)), rollingCone(1.9));
  mesh.name = 'rollers';
  mesh.count = count;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  const place = new Object3D();
  function update(rollers: readonly { x: number; y: number; on: boolean; radius: number }[], clock: number): void {
    // Drawn while one of them rolls: a cone that waits has no size.
    drawnWhile(mesh, rollers.some((cone) => cone.on));
    for (const [i, cone] of rollers.entries()) {
      const r = cone.on ? cone.radius : 0;
      // A little bounce as it rolls, and longer across the path than along it: a cone lying on its side.
      place.position.set(cone.x, cone.y + cone.radius + Math.abs(Math.sin(clock * 9 + i * 2)) * 0.08, 0);
      // It lies a little askew, so that its length shows while it turns.
      place.rotation.set(0, 0.45, -clock * 12 - i);
      place.scale.set(r, r, r * 1.9);
      place.updateMatrix();
      mesh.setMatrixAt(i, place.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

/**
 * A look (plan §3.4, the blink): while the chapter's beat lasts, a dotted line goes from the ghost's eyes to
 * what it looks at, and a soft ring pulses there. First one place, then the next. It has no words: what it
 * wants is told by what it looks at.
 */
function buildGlance(chapter: ChapterData) {
  const group = new Group();
  const def = chapter.glance;
  if (!def) return { group, update: () => {} };
  const glow = new MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false });
  const ring = new Mesh(new TorusGeometry(0.62, 0.07, 10, 36), glow);
  const DOTS = 12;
  const dots = new InstancedMesh(new SphereGeometry(0.055, 8, 6), glow, DOTS);
  dots.instanceMatrix.setUsage(DynamicDrawUsage);
  dots.frustumCulled = false;
  ring.frustumCulled = false;
  group.add(ring, dots);
  const place = new Object3D();
  let since = 0;
  function update(flags: ReadonlySet<string>, ghost: { x: number; y: number } | null, clock: number, dt: number): void {
    const on = flags.has(def!.from) && !flags.has(def!.until) && ghost !== null;
    since = on ? since + dt : 0;
    glow.opacity = on ? 0.55 + 0.35 * Math.sin(clock * 9) : 0;
    drawnWhile(group, on);
    if (!on) return;
    const at = def!.at[Math.min(def!.at.length - 1, Math.floor((since / def!.seconds) * def!.at.length))]!;
    ring.position.set(at.x, at.y, at.z);
    ring.scale.setScalar(1 + 0.12 * Math.sin(clock * 9));
    // The line grows out from its eyes towards what it looks at.
    const part = (since / def!.seconds) * def!.at.length;
    const grown = Math.min(1, (part - Math.floor(part)) / 0.35);
    for (let i = 0; i < DOTS; i++) {
      const t = ((i + 1) / (DOTS + 1)) * grown;
      place.position.set(ghost!.x + (at.x - ghost!.x) * t, ghost!.y + 0.75 + (at.y - ghost!.y - 0.75) * t, 0.2 + (at.z - 0.2) * t);
      place.updateMatrix();
      dots.setMatrixAt(i, place.matrix);
    }
    dots.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}

/**
 * The ghost's look in a scene (src/sim/scene.ts, the act `look`): it has no mouth and cannot point well, so a
 * line of dots grows from its eyes to what it looks at, and a ring pulses there. The same look as `glance`.
 */
function buildLook() {
  const group = new Group();
  const glow = new MeshBasicMaterial({ color: '#fff0b0', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, fog: false });
  const ring = new Mesh(new TorusGeometry(0.42, 0.06, 10, 36), glow);
  const DOTS = 12;
  const dots = new InstancedMesh(new SphereGeometry(0.05, 8, 6), glow, DOTS);
  dots.instanceMatrix.setUsage(DynamicDrawUsage);
  dots.frustumCulled = false;
  ring.frustumCulled = false;
  group.add(ring, dots);
  drawnWhile(group, false);
  const place = new Object3D();
  let since = 0;
  let last: { x: number; y: number; z?: number } | null = null;
  return {
    group,
    update(from: { x: number; y: number; z: number } | null, to: { x: number; y: number; z?: number } | null, clock: number, dt: number): void {
      if (to !== last) since = 0;
      last = to;
      const on = from !== null && to !== null;
      since = on ? since + dt : 0;
      glow.opacity = on ? 0.55 + 0.35 * Math.sin(clock * 9) : 0;
      drawnWhile(group, on);
      if (!on) return;
      ring.position.set(to.x, to.y, to.z ?? 0);
      ring.scale.setScalar(1 + 0.12 * Math.sin(clock * 9));
      const grown = Math.min(1, since / 0.35);
      const eyeY = from.y + 0.8;
      for (let i = 0; i < DOTS; i++) {
        const t = ((i + 1) / (DOTS + 1)) * grown;
        place.position.set(from.x + (to.x - from.x) * t, eyeY + (to.y - eyeY) * t, from.z + 0.1 + ((to.z ?? 0) - from.z - 0.1) * t);
        place.updateMatrix();
        dots.setMatrixAt(i, place.matrix);
      }
      dots.instanceMatrix.needsUpdate = true;
    },
  };
}

/**
 * The hidden candy (plan §4.3): bigger than the trail's, shaped as its kind, inside a slowly turning golden
 * ring. Found, it shrinks away into him. Its stand-in is a ball in its kind's two colours.
 */
function buildHidden(chapter: ChapterData) {
  const group = new Group();
  const gold = new MeshStandardMaterial({ color: '#ffd76a', roughness: 0.3, emissive: '#c9952a', emissiveIntensity: 0.6 });
  const sweets = (chapter.hidden ?? []).map((def) => {
    const kind = KINDS[def.kind];
    const sweet = new Group();
    const body = new Mesh(new SphereGeometry(0.19, 18, 12), new MeshStandardMaterial({ color: kind?.colour ?? '#cccccc', roughness: 0.3 }));
    const band = new Mesh(new TorusGeometry(0.17, 0.045, 8, 22), new MeshStandardMaterial({ color: kind?.mark ?? '#ffffff', roughness: 0.4 }));
    band.rotation.x = Math.PI / 2;
    const ring = new Mesh(new TorusGeometry(0.34, 0.022, 8, 30), gold);
    // The kit's sweet fills its ring: it is the prize, and bigger than anything on the trail.
    const special = stormSweet(def.kind);
    if (special) { body.geometry.dispose(); body.material.dispose(); band.geometry.dispose(); band.material.dispose(); }
    sweet.add(special ?? sweetSocket(new Group().add(body, band), { shape: def.kind, scale: 1.25 }), ring);
    sweet.position.set(def.x, def.y, 0);
    sweet.visible = def.after === undefined;
    group.add(sweet);
    return { def, sweet, ring, size: 1 };
  });
  function update(flags: ReadonlySet<string>, clock: number, dt: number, tapped?: number, response = 0): void {
    for (const [i, s] of sweets.entries()) {
      const found = flags.has(`found:${s.def.kind}`);
      s.size = Math.max(0, Math.min(1, s.size + (found ? -dt / 0.25 : dt)));
      s.sweet.scale.setScalar(s.size);
      // Found, it has shrunk away into him and is out of the picture. One that waits for its flag is hidden too.
      drawnWhile(s.sweet, s.size > 0);
      if (s.def.after !== undefined && !flags.has(s.def.after)) s.sweet.visible = false;
      s.sweet.position.y = s.def.y + Math.sin(clock * 1.8 + i) * 0.06;
      // It sways with its face to him: a coin or a fried egg seen edge-on is nothing.
      s.sweet.rotation.y = Math.sin(clock * 0.9 + i) * 0.9;
      s.sweet.rotation.z = i === tapped ? response * 0.4 : 0;
      s.ring.rotation.x = clock * 1.3 + i;
    }
  }
  return { group, update };
}

/** Moa's paper plane: a folded sheet, pointing along +x. It has no size, and is not drawn, until he rides it. */
function buildPlane(): Mesh {
  const paper = new MeshStandardMaterial({ color: '#fbf6e9', roughness: 0.9, side: DoubleSide });
  const plane = new Mesh(new ConeGeometry(0.55, 1.9, 3), paper);
  // A cone on its side, flattened: a dart.
  plane.geometry.rotateZ(-Math.PI / 2);
  plane.geometry.scale(1, 0.22, 1);
  plane.scale.setScalar(0);
  drawnWhile(plane, false);
  plane.frustumCulled = false;
  return plane;
}

/**
 * The things on rails: pale wood, like Pappa's shavings. One he pulls has the red ring on it, which is the
 * same sign as on a hook: the lace goes here.
 */
function buildMovers(chapter: ChapterData): Group[] {
  const wood = new MeshStandardMaterial({ color: '#d9bd8b', roughness: 0.85 });
  const red = new MeshStandardMaterial({ color: '#d8382c', roughness: 0.35 });
  return (chapter.movers ?? []).map((mover) => {
    const group = new Group();
    group.name = `mover:${mover.id}`;
    // As what it is, where the chapter says so; else a plain box.
    const prop = moverProp(mover);
    const box = new Mesh(new BoxGeometry(mover.width, mover.height, 1.1), wood);
    box.position.y = mover.height / 2;
    group.add(prop ?? box);
    if (mover.verb === 'pull' && mover.on === undefined && !mover.cycle && mover.stops.length > 1) {
      const at = mover.ring ?? { x: 0, y: mover.height };
      const ring = new Mesh(new TorusGeometry(0.17, 0.04, 10, 28), red);
      ring.name = 'pull-ring';
      ring.position.set(at.x, at.y, at.z ?? .2);
      group.add(ring);
    }
    group.position.set(mover.stops[0]!.x, mover.stops[0]!.y, 0);
    return group;
  });
}



/**
 * The lace between Elof's hands and the hook: a red candy lace, drawn as one thin rod. It is always in the
 * scene, at no size and out of the picture while he isn't swinging (./idle.ts), so nothing is compiled when
 * he first throws it.
 */
function buildLace() {
  const mesh = new Mesh(new CylinderGeometry(0.022, 0.022, 1, 6), new MeshStandardMaterial({ color: '#e0463a', roughness: 0.5 }));
  mesh.name = 'player-lace';
  const up = new Vector3(0, 1, 0), along = new Vector3();
  mesh.frustumCulled = false;
  mesh.scale.setScalar(0);
  drawnWhile(mesh, false);
  function update(hook: { x: number; y: number; z?: number } | null, hand: Vector3): void {
    drawnWhile(mesh, hook !== null);
    if (!hook) {
      mesh.scale.setScalar(0);
      return;
    }
    const length = along.set(hook.x, hook.y, hook.z ?? 0).sub(hand).length();
    mesh.position.copy(hand).addScaledVector(along, .5);
    mesh.quaternion.setFromUnitVectors(up, along.normalize());
    mesh.scale.set(1, length, 1);
  }
  return { mesh, update };
}

/** The hoses he climbs: green garden hose, a little behind the play plane so that he is in front of it. */
function buildClimbs(chapter: ChapterData) {
  const group = new Group();
  const materials = {
    hose: new MeshStandardMaterial({ color: '#3f8f4f', roughness: .55 }),
    lace: new MeshStandardMaterial({ color: '#d4b783', roughness: .9 }),
    lichen: new MeshStandardMaterial({ color: '#adb59b', roughness: 1 }),
    root: new MeshStandardMaterial({ color: '#65513d', roughness: 1 }),
  };
  // A ladder is part of what it stands on, and is drawn with it.
  const ringGeometry = new TorusGeometry(.14, .022, 8, 16);
  const ringMaterial = new MeshStandardMaterial({ color: '#b94a3c', roughness: .7 });
  // Mamma's braid is a braid, plaited, from her raised hand (./braid.ts).
  const braids = (chapter.climbs ?? []).filter((climb) => climb.look === 'braid').map((climb) => {
    const braid = buildBraid(climb.x, climb.bottom, climb.top);
    group.add(braid.group);
    return { braid, needs: climb.needs, down: climb.needs === undefined ? 1 : 0 };
  });
  const hoses = (chapter.climbs ?? []).flatMap((climb) => {
    const look = climb.look ?? 'hose';
    if (look === 'ladder' || look === 'braid') return [];
    const length = climb.top - climb.bottom + 0.25;
    // It hangs from its top, so that one that is let down grows downwards.
    const radius = look === 'lace' ? .035 : .06;
    const geometry = new CylinderGeometry(radius, radius, length, 10);
    geometry.translate(0, -length / 2, 0);
    const hose = new Mesh(geometry, materials[look]);
    hose.name = `climb:${look}:${climb.x}`;
    hose.position.set(climb.x, climb.bottom + length, -0.16);
    group.add(hose);
    const ring = look === 'lace' ? new Mesh(ringGeometry, ringMaterial) : null;
    if (ring) { ring.position.set(climb.x, climb.top, -.12); group.add(ring); }
    return [{ hose, ring, needs: climb.needs, down: climb.needs === undefined ? 1 : 0 }];
  });
  /** A hose that waits for something is let down when that has happened: the lichen, the braid, the lace. */
  function update(flags: ReadonlySet<string>, dt: number, clock = 0, still = false): void {
    for (const b of braids) {
      if (b.needs !== undefined) b.down = Math.min(1, Math.max(0, b.down + (flags.has(b.needs) ? dt : -dt) / 0.7));
      b.braid.update(b.down, clock, dt, still);
    }
    for (const h of hoses) {
      if (h.needs !== undefined) h.down = Math.min(1, Math.max(0, h.down + (flags.has(h.needs) ? dt : -dt) / 0.5));
      h.hose.scale.y = Math.max(0.001, h.down);
      if (h.ring) {
        h.ring.scale.setScalar(h.down);
        drawnWhile(h.ring, h.down > 0);
      }
    }
  }
  const attachBraid = (tip: Vector3) => { for (const b of braids) b.braid.attach(tip); };
  return { group, update, attachBraid };
}

/** Dark trunks behind the course: something for the eye to measure Elof's speed against. */
function buildTrunks(chapter: ChapterData): Group {
  const group = new Group();
  const material = new MeshLambertMaterial({ color: '#5a4632' });
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  // They stand from below the lowest ground to well above the highest: a chapter may go a long way down.
  const low = Math.min(...chapter.ground.map((p) => p.y)) - 2;
  const high = Math.max(...chapter.ground.map((p) => p.y)) + 8;
  // A fixed sequence, not Math.random: the scene looks the same in every screenshot.
  let seed = 7;
  const next = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let x = from - 6; x < to + 6; x += 2.2 + next() * 2.4) {
    const width = 0.7 + next() * 1.1;
    const trunk = new Mesh(new BoxGeometry(width, high - low, width), material);
    trunk.position.set(x, (low + high) / 2, -6 - next() * 7);
    group.add(trunk);
  }
  return group;
}

/**
 * The glitter bubble (plan §4.2): a golden sparkle shell, never a round gum bubble. A faint glow and a swarm
 * of sparks that turn round Elof while it carries him. It is always in the scene, at no size and out of the
 * picture (./idle.ts), so its shaders are compiled with the first frames and not when he first falls.
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
  drawnWhile(group, false);
  const place = new Object3D();

  /** `carried` is the bubble's progress from the simulation: 0 when there is none. */
  function update(carried: number, elofX: number, elofY: number, clock: number): void {
    // It gathers in the first tenth of the way and scatters in the last.
    const size = carried <= 0 ? 0 : Math.min(1, carried / 0.1, (1 - carried) / 0.1 + 0.15);
    group.scale.setScalar(size);
    drawnWhile(group, size > 0);
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
 * A stand-in for the ghost: a pale wooden shape with two dark eyes, the bag in front of it and red shoes.
 * It faces +x. The carved ghost modelled in Blender is in the private pack, and takes its place there.
 */
function buildGhost(): Group & { dispose(): void } {
  const group = new Group();
  const wood = new MeshStandardMaterial({ color: '#e3cfa4', roughness: 0.75 });
  const dark = new MeshStandardMaterial({ color: '#1c1a18', roughness: 0.3 });
  const red = new MeshStandardMaterial({ color: '#c8352b', roughness: 0.6 });
  const paper = new MeshStandardMaterial({ color: '#c79a62', roughness: 0.9 });
  const body = new Mesh(new CapsuleGeometry(0.27, 0.42, 6, 14), wood);
  body.position.y = 0.6;
  group.add(body);
  for (const [i, z] of [-0.1, 0.1].entries()) {
    const eye = new Mesh(new SphereGeometry(0.045, 10, 8), dark);
    eye.name = `ghost-eye-${i}`;
    eye.position.set(0.235, 0.82, z);
    const shoe = new Mesh(new BoxGeometry(0.24, 0.1, 0.14), red);
    shoe.name = i === 0 ? 'footL' : 'footR';
    shoe.position.set(0.05, 0.05, z * 1.3);
    group.add(eye, shoe);
  }
  const bag = new Mesh(new BoxGeometry(0.16, 0.3, 0.26), paper);
  bag.position.set(0.3, 0.5, 0);
  group.add(bag);
  let disposed = false;
  return Object.assign(group, { dispose() {
    if (disposed) return;
    disposed = true;
    group.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
    for (const material of [wood, dark, red, paper]) material.dispose();
  } });
}
