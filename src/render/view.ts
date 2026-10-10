import { lessMotion } from '../platform/motion';
import {
  AdditiveBlending, BoxGeometry, CapsuleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  DepthTexture, DynamicDrawUsage, ExtrudeGeometry, Fog, Group, HalfFloatType, HemisphereLight, InstancedMesh, LatheGeometry, Mesh,
  Float32BufferAttribute, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, NeutralToneMapping, Object3D, OctahedronGeometry, PerspectiveCamera, PlaneGeometry, PointLight,
  Scene, Shape, SphereGeometry, TorusGeometry, UnsignedIntType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Reaction } from '../app/pointing';
import { createAssets } from './assets';
import { windWisp } from './wind-wisp';
import { createAfloat } from './afloat';
import { createRain } from './rain';
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
import { drawn } from './dressing/kit';
import { createSky } from './dressing/sky';
import type { LifeAsk } from './life';
import { evening, nightBrightness } from './backdrop';
import { helperProp, moverProp, rideProp, spotProp } from './props';
import { GARDEN_MORNING, GLOW_ON_HIGH, createGradePass, createMaterialGrade } from './grade';
import { createDepthBlur } from './depth-blur';
import { createBloom } from './bloom';
import { createWater, waterKind } from './water';
import { createCharacterShadows } from './character-shadows';
import { createRimLight } from './rim-light';
import { chooseTier, maxResolutionSteps, pixelRatioFor, type Tier } from './quality';
import { cameraIntent } from '../sim/camera-intent';
import { songGlitter } from './song-glitter';
import { createEpilogueStage } from './epilogue-stage';
import { createPrologueStage } from './prologue-stage';
import { createStage } from './stage';
import { actPose } from './acting';
import { createModelRig, createRehearsalRig, heightOf, STANDING, type Pose, type Rig, type Role } from './rig';
import { createPlayerMotion, createPlayerStandIn } from './player-motion';
import { createAurora } from './aurora';
import { createFamilyMotion } from './family-motion';
import { createSharedSweets } from './shared-sweets';
import { saturdayBag } from './saturday-bag';
import { createGhostThought } from './ghost-thought';
import { drawnWhile } from './idle';
import { buildVerbMarks } from './verb-marks';
import { MODEL_TURN, blinkEyes, createGhostMotion, eyeNodes } from './ghost-model';
import type { Blow } from './wind';
import { layRich, seeRich } from './rich';
import { prologuePose, type PrologueFrame } from '../sim/prologue';
import { endsInScene, type SceneFrame } from '../sim/scene';
import { BERRY_HALF, BERRY_HEIGHT, GHOST_CLEARANCE, JUMP_SPEED } from '../sim/constants';
import type { ChapterData, HelpState, PlayerState, Vec } from '../sim/types';
import type { GhostState } from '../sim/sim';
import { photoCut } from './crop';

/** A long lens from the side flattens depth the way a macro lens does (plan §5.2). */
const FOV = 30;
/** The ground sits about 35% up from the bottom, so thumbs never cover Elof (plan §5.2). */
const GROUND_FROM_BOTTOM = 0.35;
/** How long the camera takes to come back to play after a scene's shot, in seconds. */
const SHOT_RELEASE = 1.1;
/** How long the picture takes to breathe out at a chapter's end. */
const CODA_EASE = 3.2;

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
  atGoal: boolean;
  /** Which trail candies are in the bag. */
  collected: readonly boolean[];
  /** The side candy in the bag, by its place in chapter.side. Left out: none. */
  side?: readonly boolean[];
  /** The last big candy reached, or -1. */
  checkpoint: number;
  /** Where the things on rails are, in the chapter's order. */
  movers: readonly { x: number; y: number }[];
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

/**
 * Stage 0a's greybox scene: the test course, a stand-in Elof in his colours, and the big candy.
 * `asked` is the tier from settings or ?tier=, or null for Auto. With `standIns` the figures built in code are kept even
 * where the private pack has the family's models: for pictures that go into the repository.
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
  const place = chapter.place ? PLACES[chapter.place] : null;
  const grade = place?.grade ?? GARDEN_MORNING;
  const gradePass = hdrAvailable ? createGradePass(grade) : null;
  const depthBlur = hdrAvailable ? createDepthBlur() : null;
  const bloom = hdrAvailable ? createBloom() : null;
  const outputPass = hdrAvailable ? new OutputPass() : null;
  if (outputPass) outputPass.renderToScreen = true;
  let hdr: { scene: WebGLRenderTarget; grade: WebGLRenderTarget } | null = null;
  // High glows; Mid does not.
  gradePass?.setGlow(tier === 'high' ? GLOW_ON_HIGH : 0);
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
    scene.add(dressing.group);
  }

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
    return { place, sweet: place.getObjectByName('candy')!, reached: false, pop: 0, spin: 0 };
  });
  // Where a scene ends the chapter (the prologue's title), the scene is the end: no candy marks it.
  const sceneEnds = endsInScene(chapter);
  if (sceneEnds) bigCandies.at(-1)!.place.visible = false;
  // The coda (docs/narrative-audit/threads.md §5.4): at the goal the picture breathes out over the place he has
  // crossed, while the tune closes. Not where a scene is the end, nor at home in the evening (its own end).
  const coda = !sceneEnds && !chapter.epilogue;
  let codaFor = 0;
  const trail = createTrail(chapter.candy);
  // Side candy, off the trail: hearts and lollipops, where the trail is sweets in wrappers.
  const sideTrail = createTrail(chapter.side ?? [], 'side');
  const noSide: readonly boolean[] = [];
  const ledges = buildLedges(chapter.ledges ?? [], rods(chapter), chapter.place);
  const glitter = buildGlitter();
  const lace = buildLace();
  // What Använd will do, over each thing it can act on (in-play.md row 6).
  const glints = buildVerbMarks(chapter);
  const lawnSong = songGlitter(chapter);
  const noteStrikes = new Map<string, number>();
  scene.add(lawnSong.group);
  const plane = buildPlane();
  scene.add(glints.group, plane);
  // The things that stand at spots, and what carries him on each ride, where the chapter says what they are.
  const ghostHelps = chapter.helper?.kind === 'ghost';
  const helper = helperProp(chapter, ghostHelps ? buildGhost() : undefined);
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
  const things = (chapter.spots ?? []).map((spot) => ({ spot, prop: spotProp(spot), reactionTurn: 0 }));
  // What only stands about: drawn like a thing to use, and gone when its flag is set.
  const decor = (chapter.decor ?? []).map((def, i) => ({
    def,
    prop: spotProp({ id: `decor:${i}`, at: def.at, verb: 'take', look: def.look, ...(def.word ? { word: def.word } : {}) }),
  }));
  for (const d of decor) if (d.prop) {
    if (d.def.z !== undefined) d.prop.group.position.z = d.def.z;
    scene.add(d.prop.group);
  }
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
    return { ride, prop };
  });
  const moverMeshes = buildMovers(chapter);
  const sharedSweets = chapter.id === 'norrsken' ? createSharedSweets() : null;
  if (sharedSweets) scene.add(sharedSweets.group);
  const rain = createRain(chapter);
  const cones = buildCones(chapter.rollers?.length ?? 0);
  scene.add(...moverMeshes, rain.group, cones.mesh);
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
      ...(chapter.street ? { stands: (c: CanvasRenderingContext2D, column: (x: number) => number, row: (y: number) => number) => paintStreetMirror(chapter, c, column, row) } : {}),
    } : undefined);
  // It is drawn in the scene's own pass, after what stands in it and the far layers, and before what
  // drifts over it (the bog's mist sheets, the shafts of light, the dust): its render order says where.
  scene.add(water.group);
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
  const parts = [candyReady, jayReady, sweetsReady, forestReady, housesReady, mountainReady, lifeReady];
  let arrived = 0;
  for (const part of parts) void part.then(() => { arrived++; }, () => {});
  const ready = Promise.all(parts).then(() => undefined);

  // The ghost. A stand-in built here plays its part everywhere. The one modelled in Blender after Pappa's
  // carving takes its place where its private pack exists (HANDOVER.md): the manifest says whether it does.
  // A chapter without a ghost in its data has none in the picture.
  const ghostPlace = new Group();
  ghostPlace.name = 'chase-ghost';
  let ghost: Group = buildGhost();
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
  let ghostMotion = createGhostMotion(ghost, true);
  // The stand-in faces +x, as the stand-in Elof does; the model from Blender faces the camera, and is turned to
  // face as the stand-in does (./ghost-model.ts).
  let ghostFaces = 0;
  let ghostTurn = Math.PI;
  let clock = 0;
  let starDropTime = 0;
  let shoulderLift = 0;
  let homeJourney = false;
  assets
    .manifest()
    .then((manifest) => (!standIns && manifest.packs.private?.files['ghost.glb'] ? assets.model('private', 'ghost') : null))
    .then((model) => {
      if (!model) return;
      ghostPlace.clear();
      ghostPlace.add(model, stolenBag);
      ghost = model;
      paintedEyes = eyeNodes(model);
      if (ghostHelps) helper.replaceGhost(model.clone());
      ghostFaces = MODEL_TURN;
      ghostMotion = createGhostMotion(model);
      models.push('private/ghost');
      modelInstallations++;
    })
    .catch((error) => console.error('The ghost could not be loaded.', error));

  // Elof, modelled in Blender after his sheets and photos. He too is only here where the private pack is;
  // everywhere else the stand-in built in code plays his part.
  const elof = createPlayerStandIn();
  let playerBody: Pick<Rig, 'pose' | 'hand' | 'mouth' | 'reach'> = elof;
  let playerHips = ['left', 'right'].map(side => elof.group.getObjectByName(`player-hip-${side}`));
  let playerFeet = ['left', 'right'].map(side => elof.group.getObjectByName(`player-boot-${side}`));
  const shoulderPose: Pose = { ...STANDING }, seat = new Vector3(), boot = new Vector3(), palm = new Vector3();
  const carryAhead = new Vector3(), carryUp = new Vector3(0, 1, 0);
  const laceHand = new Vector3(), laceAlong = new Vector3();
  const playerMotion = createPlayerMotion();
  assets
    .manifest()
    .then((manifest) => (!standIns && manifest.packs.private?.files['elof.glb'] ? assets.model('private', 'elof') : null))
    .then((model) => {
      if (!model) return;
      // Exported from Blender he faces +z, and the stand-in faces +x. A quarter turn makes them agree.
      model.rotation.y = Math.PI / 2;
      elof.group.clear();
      const rig = createModelRig(model, 1);
      elof.group.add(rig.group);
      playerBody = rig;
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
  const stands = chapter.prologue ? [] : [
    ...things.map((thing) => ({ look: thing.spot.look, word: thing.spot.word, prop: thing.prop, at: thing.spot.at.x, glad: thing.spot.id as string | undefined })),
    ...decor.map((d) => ({ look: d.def.look, word: d.def.word, prop: d.prop, at: d.def.at.x, glad: d.def.after })),
  ].filter((stand) => stand.look === 'sign' && stand.prop !== null && personFor(stand.word) !== null);
  for (const stand of stands) {
    const who = personFor(stand.word)!, rig = createRehearsalRig(who);
    stand.prop!.group.clear(); stand.prop!.group.add(rig.group);
    family.push({ rig, who, motion: createFamilyMotion(who, stand.at, stand.glad), at: stand.at, glad: stand.glad, was: false, joy: 0 });
  }
  if (stage.actors.size > 0 && !standIns) {
    assets.manifest().then(async (manifest) => {
      for (const who of stage.actors.keys()) {
        if (!manifest.packs.private?.files[`${who}.glb`]) continue;
        const model = await assets.model('private', who);
        const placed = stage.replace(who, model);
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
          const model = await assets.model('private', who);
          // Modelled with Elof's height as the unit, and drawn as big as he is drawn when he is a boy.
          model.scale.setScalar(3);
          const one = family.find((one) => one.rig.group.parent === stand.prop!.group)!;
          const rig = createModelRig(model, heightOf(who));
          rig.group.userData.familyRole = who;
          rig.group.position.copy(one.rig.group.position);
          rig.group.quaternion.copy(one.rig.group.quaternion);
          one.rig = rig;
          one.neck = model.getObjectByName('Head') ?? model.getObjectByName('head');
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

  const characterShadows = createCharacterShadows(renderer, scene, sun);
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
    depthBlur?.setSize(canvas.width, canvas.height, tier === 'high');
    bloom?.setSize(canvas.width, canvas.height, tier === 'high');
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
  /** The last scene shot, and how much of it the camera takes now: 1 in the scene, easing to 0 after it. */
  let lastShot: { x: number; y: number; height: number; width: number; eye: number } | null = null;
  let shotWeight = 0;
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
      // What only Mid and High draw (./rich.ts) is laid here, so that a model which arrived late is laid too.
      layRich(scene);
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
      renderer.render(scene, camera);
      if (hdr && gradePass && outputPass) {
        bloom?.render(renderer, hdr.scene);
        gradePass.setBloom(bloom?.texture ?? null);
        // The final macro shot focuses on the window figure, outside the usual z=0 play plane.
        if (!inEndingShot) depthBlur?.render(renderer, hdr.scene, camera);
        gradePass.setDepthBlur(inEndingShot ? null : depthBlur?.texture ?? null, hdr.scene.depthTexture, camera.near, camera.far, camera.position.z);
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

  function render({ prev, curr, alpha, dt, atGoal, collected, side, checkpoint, movers, drips, flags, ghost: ghostState, rollers, tussocks, gusts, help, berries, noteHits, prologue, scene: sceneFrame, ending }: Frame): void {
    inEndingShot = !!chapter.epilogue && ending !== null && ending !== undefined;
    rain.update(drips, dt);
    epilogueStage.update(flags, ending, lessMotion());
    for (const [i, mover] of movers.entries()) moverMeshes[i]?.position.set(mover.x, mover.y, 0);
    if (chapter.id === 'norrsken') {
      const eyes = scene.getObjectByName('first-carving-eyes');
      if (eyes) eyes.visible = flags.has('eyes');
    }
    const x = lerp(prev.x, curr.x, alpha);
    const y = lerp(prev.y, curr.y, alpha);
    const onShoulders = chapter.id === 'norrsken' && curr.mode === 'ride' && flags.has('home');
    if (onShoulders) homeJourney = true;
    const wantShoulders = onShoulders ? 4.25 : 0;
    const calmStory = lessMotion();
    shoulderLift = calmStory ? wantShoulders : shoulderLift + Math.sign(wantShoulders - shoulderLift) * Math.min(Math.abs(wantShoulders - shoulderLift), dt * 8.5);
    clock += dt;
    // The scene playing now, if any: where the family and the ghost are, what they do, and the shot (./stage.ts).
    const directions = stage.update(sceneFrame ?? null, flags, { x, y }, clock, dt, calmStory);
    responseFor = Math.max(0, responseFor - dt);
    const response = responseFor > 0 ? (calmResponse ? 0.15 : Math.sin((0.85 - responseFor) * 24) * responseFor / 0.85) : 0;
    if (responseFor === 0) reaction = null;
    trail.update(collected, flags, x, y, dt, clock, reaction?.kind === 'candy' ? reaction.index : undefined, response,
      chapter.prologue && ghostState ? ghostState.x : Infinity);
    sideTrail.update(side ?? noSide, flags, x, y, dt, clock);
    ledges.update(flags, dt);
    glints.update(flags, clock, lessMotion());
    lawnSong.update(flags, clock);
    for (const hit of noteHits ?? []) noteStrikes.set(hit.id, hit.serial);
    cones.update(rollers, clock);
    water.update(clock, lessMotion());
    afloat.update(clock, water.level, lessMotion());
    for (const [i, t] of tussocks.entries()) tussockMeshes[i]?.position.set(t.x, t.y, 0);
    // A cranberry goes flat under him and springs back, a little past its shape.
    for (const [i, b] of (berries ?? []).entries()) {
      const flat = b.squash * b.squash;
      const spring = Math.sin(b.squash * Math.PI * 3) * 0.12 * b.squash;
      berryMeshes[i]?.scale.set(1 + 0.3 * flat - spring * 0.5, 1 - 0.5 * flat + spring, 1 + 0.3 * flat - spring * 0.5);
    }
    mist.update(flags, x, y, curr.facing, camera.position.z, dt);
    const gust = wind.update(gusts, clock);
    climbs.update(flags, dt);
    follower.update(flags, curr, clock, dt);
    // On a ride he sits on Moa's paper plane, which points the way it flies.
    const riding = curr.mode === 'ride';
    // Which ride he is on is read from where he is: no two rides share a stretch.
    const carrier = riding ? carriers.find((c) => x >= c.ride.from.x - 0.5 && x <= c.ride.to.x + 0.5) : undefined;
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
    for (const c of carriers) {
      if (!c.prop) continue;
      const waitingCap = chapter.id === 'granskog' && c.ride.id === 'cap' && flags.has('cap:ready') && !flags.has('cap');
      const propSize = waitingCap ? 1 : c === carrier ? size : 0;
      c.prop.scale.setScalar(propSize);
      drawnWhile(c.prop, propSize > 0);
      c.prop.position.set(waitingCap ? c.ride.from.x : x, (waitingCap ? c.ride.from.y : y) - 0.05, 0);
      // A boat lies level on the water; a bird points the way it flies, and beats its wings.
      c.prop.rotation.z = c.ride.look === 'cap' ? calmStory ? 0 : Math.sin(clock * 2.4) * 0.05 : heading * 0.6;
      const beat = Math.sin(clock * 7) * 0.5;
      const near = c.prop.getObjectByName('wingNear');
      const far = c.prop.getObjectByName('wingFar');
      if (near) near.rotation.x = -beat;
      if (far) far.rotation.x = beat;
    }
    for (const [i, thing] of things.entries()) {
      if (thing.prop) thing.prop.group.rotation.z -= thing.reactionTurn;
      // The light counterweight tips the same board only during its safe bounce, then resets for another try.
      const trialTip = chapter.counterweight && thing.spot.id === chapter.counterweight.launch && riding
        && x < chapter.counterweight.to && flags.has(chapter.counterweight.trial) && !flags.has(chapter.counterweight.launch);
      thing.prop?.update(flags.has(thing.spot.id) || !!trialTip, clock, dt, noteStrikes.get(thing.spot.id));
      thing.reactionTurn = reaction?.kind === 'spot' && reaction.index === i ? response * 0.14 : 0;
      if (thing.prop) thing.prop.group.rotation.z += thing.reactionTurn;
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
    helper.update(help, x, y, curr.standY, clock, dt, lessMotion());
    // The helper is the same friend, not a second ghost alongside the one he is following.
    ghostPlace.visible = chapter.ghost !== undefined && !(ghostHelps && helper.active);
    hiddenSweets.update(flags, clock, dt, reaction?.kind === 'hidden' ? reaction.index : undefined, response);
    glance.update(flags, ghostState, clock, dt);
    glitter.update(curr.bubble, x, y, clock);
    // He hangs by his hands, his body along the lace.
    const hang = curr.hook ? Math.atan2(curr.hook.x - x, curr.hook.y - (y + 0.5)) : 0;

    // The simulation says where to look; the view only smooths it.
    const want = { ...cameraIntent(curr, chapter.cameras) };
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
    camera.position.set(look.x, centreY, distance * look.zoom);
    camera.lookAt(look.x, centreY, 0);
    const nearbyFamily = stands.find((stand) => stand.prop!.group.visible && Math.abs(stand.at - x) < 3.4 &&
      Math.abs(stand.prop!.group.position.y - y) < 2 && curr.mode !== 'ride' && curr.mode !== 'fly');
    if (nearbyFamily && !chapter.epilogue) {
      const centreX = (nearbyFamily.at + x) / 2;
      const familyY = nearbyFamily.prop!.group.position.y;
      const shotHeight = Math.max(viewHeight * look.zoom, 7.8, 8.8 / camera.aspect);
      camera.position.set(centreX, familyY + 2.2, shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(centreX, familyY + 2.2, 0);
    }
    if (chapter.id === 'norrsken' && flags.has('taste') && x >= 26 && x <= 33 && !flags.has('home')) {
      const shotHeight = Math.max(8.4, 10.2 / camera.aspect);
      camera.position.set(29.7, 2.1, shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(29.7, 2.1, 0);
    }
    if (onShoulders || shoulderLift > 0) {
      const shotHeight = Math.max(10.2, 8.8 / camera.aspect);
      camera.position.set(x, y + 3.1, shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(x, y + 3.1, 0);
    }
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
      camera.position.set(lerp(camera.position.x, s.x, w), lerp(camera.position.y, s.y + s.eye, w), lerp(camera.position.z, away, w));
      camera.lookAt(lerp(playAim.x, s.x, w), lerp(playAim.y, s.y, w), 0);
    }
    if (chapter.epilogue && ending !== null && ending !== undefined) {
      const window = chapter.epilogue.window;
      const shotHeight = Math.max(2.6, 2.8 / camera.aspect);
      camera.position.set(window.x, window.y + 0.65, window.z + shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(window.x, window.y + 0.65, window.z);
    }
    const darkness = night.update(flags, dt, tier === 'low' ? 0.5 : 0.85, calmStory);
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

    rimLight.setStrength(scene.backgroundIntensity * (1 - darkness));

    // The stand-in Elof: turned a little towards the camera, legs swinging with the distance he covers.
    // On a hose he turns his back to the camera, as a climber does.
    const onHose = curr.mode === 'climb' || curr.mode === 'slide';
    // In a held scene the scene may turn him: towards his family, or out over the garden.
    const scripted = directions.elof;
    const facingAngle = scripted?.face != null ? -scripted.face * Math.PI * 2 : onHose ? Math.PI / 2 : curr.facing > 0 ? -0.35 : Math.PI + 0.35;
    const turnDelta = facingAngle - turn;
    turn += Math.atan2(Math.sin(turnDelta), Math.cos(turnDelta)) * ease(14, dt);
    // A held scene owns the pose. Otherwise actual travel drives the same articulated pose on both bodies.
    let scriptedPose: Pose | null = null;
    if (scripted?.act && curr.grounded) {
      const unit = 5.2 / Math.max(0.5, tall);
      const facing = Math.cos(facingAngle) >= 0 ? 1 : -1;
      scriptedPose = actPose(scripted.act, { t: scripted.actT, aim: scripted.aim ? { ahead: (scripted.aim.x - x) * facing * unit, up: (scripted.aim.y - y) * unit } : null, stride: 0, pace: 0, calm: calmStory }, elofPose);
    }
    const waving = reaction?.kind === 'player' && curr.grounded;
    const playerPose = playerMotion.update(curr, x, dt, scriptedPose, waving ? responseFor : 0, calmResponse || calmStory);
    playerBody.pose(playerPose);
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
    const stretch = !elastic ? 1 : curr.grounded ? squash : 1 + clamp(curr.vy * 0.012, -0.05, 0.1);
    // Knocked over by a drop he goes down on his back, lies a moment, and gets up.
    const lying = curr.mode === 'down' ? Math.min(1, curr.t / 0.15, (1 - curr.t) / 0.25) * 1.4 * curr.facing : 0;
    // The tilt turns about his middle, where the lace's pull goes through.
    const lift = scripted?.lift;
    elof.group.position.set(x - Math.sin(hang) * 0.5 + (lift?.x ?? 0), y + 0.5 - Math.cos(hang) * 0.5 + shoulderLift + (lift?.y ?? 0), lift?.z ?? 0);
    // On a mark in the place itself, such as Pappa's palm: wherever the run left him.
    if (scripted && scripted.ontoWeight > 0) {
      const on = scripted.ontoWeight;
      elof.group.position.x += (scripted.onto.x - x) * on;
      elof.group.position.y += (scripted.onto.y - y) * on;
      elof.group.position.z += ((scripted.onto.z ?? 0) - (lift?.z ?? 0)) * on;
    }
    elof.group.rotation.set(0, turn, lying - hang, 'ZYX');
    elof.group.scale.set(tall / Math.sqrt(stretch), tall * stretch, tall / Math.sqrt(stretch));
    if (scriptedPose && scripted?.act === 'point' && scripted.aim) {
      const k = calmStory ? 1 : clamp(scripted.actT / .3, 0, 1);
      playerBody.reach(1, boot.set(scripted.aim.x, scripted.aim.y, scripted.aim.z ?? 0), k * k * (3 - 2 * k));
    }
    stage.updateElof(playerBody, scripted, tall, calmStory);
    if (curr.hook) {
      playerBody.hand(0, laceHand).add(playerBody.hand(1, laceAlong)).multiplyScalar(.5);
      laceHand.addScaledVector(boot.set(1, 0, 0).applyQuaternion(elof.group.quaternion), .15 * tall);
      laceAlong.set(curr.hook.x, curr.hook.y, 0).sub(laceHand).normalize();
      // Close both hands on the same lace, with the lower hand supporting its visible end.
      playerBody.reach(0, laceHand.addScaledVector(laceAlong, -.2 * tall));
      playerBody.reach(1, laceHand.addScaledVector(laceAlong, -.06 * tall));
      playerBody.hand(1, laceHand);
    }
    lace.update(curr.hook, laceHand);
    if (poff) glitter.update(0.5, x, y + tall * 0.4, clock);

    playerGroundY = curr.groundY;

    // A big candy turns slowly until it is reached. Then it gives a little jump, and turns fast.
    for (const [i, big] of bigCandies.entries()) {
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
      ghostSize += (away - ghostSize) * ease(8, dt);
      // On a table's edge it stands behind the play plane: its perch says how far (picture only).
      const perch = chapter.ghost?.[ghostState.perch];
      const before = chapter.ghost?.[Math.max(0, ghostState.perch - 1)];
      const depth = hopping ? lerp(before?.z ?? 0, perch?.z ?? 0, ghostState.t) : perch?.z ?? 0;
      ghostPlace.position.set(ghostState.x, ghostState.y, depth);
      ghostPlace.scale.setScalar(ghostSize);
      // Its shadow lies where it stands. In a hop it is off the ground, and the shadow waits where it will land.
      if (!hopping) ghostGroundY = ghostState.y;
      // 0 faces along the course; a half turn faces back at him.
      const wanted = reaction?.kind === 'ghost' ? -Math.PI / 2 : hopping || x > ghostState.x ? 0.4 : Math.PI - 0.4;
      const ghostDelta = wanted - ghostTurn;
      ghostTurn += Math.atan2(Math.sin(ghostDelta), Math.cos(ghostDelta)) * ease(7, dt);
      const awake = !chapter.prologue || flags.has('blink');
      ghost.rotation.set(0, ghostFaces + ghostTurn, !awake ? 0 : hopping ? -0.25 * Math.sin(Math.PI * ghostState.t) : calmStory ? 0 : Math.sin(clock * 1.7) * 0.035);
      if (chapter.prologue && prologue) {
        const pose = prologuePose(chapter.prologue, prologue);
        ghostPlace.position.set(pose.x, pose.y, pose.z);
        ghostSize = pose.scale;
        ghostPlace.scale.setScalar(ghostSize);
        ghost.rotation.set(0, ghostFaces + pose.turn, pose.tilt);
        ghostStaged = true;
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
      if (!chapter.ghostMeet) {
        const dx = ghostPlace.position.x - x, dy = ghostPlace.position.y - y;
        if (Math.hypot(dx, dy) < GHOST_CLEARANCE) {
          ghostPlace.position.y = y + (dy < 0 ? -1 : 1) * Math.sqrt(GHOST_CLEARANCE ** 2 - dx ** 2);
        }
      }
      blinkEyes(paintedEyes, staged?.blink ?? 1);
      ghostMotion.update({ dt, clock, hop: hopping ? ghostState.t : null, calm: calmStory, awake, staged: ghostStaged, performance: staged ?? undefined });
      looking.update(staged?.look ? ghostPlace.position : null, staged?.look ?? null, clock, dt);
    }
    if (chapter.prologue) {
      paintedEyes.forEach((eye, i) => { eye.visible = flags.has(i === 0 && paintedEyes.length > 1 ? 'eye' : 'paint'); });
    }
    // Keep the stolen paper bag distinct from the wooden pocket, across every chapter of the chase. It was given
    // back on the summit, so neither the party nor Byn, a week later, has it.
    stolenBag.visible = ghostPlace.visible && (chapter.prologue ? flags.has('grab') || flags.has('blink') : chapter.id !== 'epilog' && chapter.id !== 'byn') &&
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
    // His first figure has its place again, with Klonk beside it once Elof finishes painting.
    if (chapter.epilogue && chapter.shelf && flags.has('dots')) {
      ghostPlace.position.set(chapter.shelf.x - 2.4, chapter.shelf.y + 0.08, -8.5);
      ghostPlace.scale.setScalar(1);
      ghost.rotation.set(0, ghostFaces - Math.PI / 2, 0);
      ghostMotion.update({ dt, clock, hop: null, calm: calmStory, awake: true, staged: true });
      ghostStaged = true;
    }
    ghostThought?.update(ghostState, flags, { x, y }, camera, clock, dt,
      lessMotion(), ghostPlace.visible);
    // The same jointed body greets him at help points and in the story; its outer root remains the place's.
    for (const one of family) {
      const now = one.glad !== undefined && flags.has(one.glad);
      if (dt > 0) {
        if (now && !one.was) one.joy = 1.8;
        one.was = now;
        one.joy = Math.max(0, one.joy - dt);
      }
      const towards = clamp((x - one.at) * 0.22, -0.75, 0.75);
      const carrying = onShoulders && one.who === 'pappa';
      const facing = carrying ? Math.PI / 2 - .35 : towards;
      const turn = facing - one.rig.group.rotation.y;
      if (calmStory && dt > 0) one.rig.group.rotation.y = facing;
      else one.rig.group.rotation.y += Math.atan2(Math.sin(turn), Math.cos(turn)) * ease(4, dt);
      one.rig.group.position.set(0, 0, 0);
      one.rig.pose(one.motion.update(dt, clock, one.joy, towards - one.rig.group.rotation.y, carrying ? x : null, calmStory, {
        ahead: Math.abs(x - one.at) * 5.2 / one.rig.height,
        up: (y + tall * .8 - one.rig.group.parent!.position.y) * 5.2 / one.rig.height,
      }, one.glad && ['moa', 'seesaw', 'cap:ready', 'mamma', 'braid', 'bog:return-bridge'].includes(one.glad)
        ? { ready: now, near: Math.abs(x - one.at) < 6 && Math.abs(y - one.rig.group.parent!.position.y) < 5 } : undefined));
    }
    if (chapter.id === 'norrsken') {
      const carving = scene.getObjectByName('mover:tragubbe');
      if (carving && flags.has('taste') && ghostState && !homeJourney) carving.position.set(ghostState.x - .5, ghostState.y, 0);
      if (homeJourney && flags.has('home')) {
        // The home ride is visibly Pappa carrying Elof, with both returned carvings alongside him.
        const k = clamp(shoulderLift / 4.25, 0, 1), weight = k * k * (3 - 2 * k);
        const pappa = family.find(one => one.who === 'pappa'), model = pappa?.rig.group;
        if (model && pappa) {
          model.position.set(x - pappa.at, y - model.parent!.position.y, 0);
          if (shoulderLift > 0) {
            carryAhead.set(Math.sin(model.rotation.y), 0, Math.cos(model.rotation.y));
            if (pappa.neck) pappa.neck.getWorldPosition(seat);
            else pappa.rig.mouth(seat).addScaledVector(carryUp, -.25).addScaledVector(carryAhead, -.38);
            seat.addScaledVector(carryAhead, -.14 * tall).addScaledVector(carryUp, .1 * tall);
            const hips = playerHips[0] && playerHips[1]
              ? (playerHips[0].getWorldPosition(boot).y + playerHips[1].getWorldPosition(palm).y) / 2 - elof.group.position.y : .4 * tall;
            Object.assign(shoulderPose, playerPose);
            shoulderPose.legL = lerp(playerPose.legL, .85, weight); shoulderPose.legR = lerp(playerPose.legR, .85, weight);
            shoulderPose.kneeL = lerp(playerPose.kneeL, 1.15, weight); shoulderPose.kneeR = lerp(playerPose.kneeR, 1.15, weight);
            shoulderPose.seat = hips * 5.2 / tall * (1 - weight);
            playerBody.pose(shoulderPose);
            elof.group.position.lerp(seat, weight);
            for (const side of [0, 1] as const) {
              const foot = playerFeet[side];
              if (!foot) continue;
              foot.getWorldPosition(boot).addScaledVector(carryUp, -.025 * tall);
              pappa.rig.grip(side, boot, carryUp, palm, weight);
            }
          }
        }
        seat.copy(elof.group.position); seat.y -= .16 * tall; seat.z += .1 * tall;
        seat.lerp(boot.set(x, y + shoulderLift, .12), 1 - weight);
        ghostPlace.visible = true; ghostPlace.position.copy(seat); ghostPlace.position.x -= .8; ghostPlace.scale.setScalar(1);
        ghostMotion.update({ dt, clock, hop: null, calm: calmStory, awake: true, staged: true });
        ghostGroundY = playerGroundY;
        if (carving) { carving.position.copy(seat); carving.position.x += .8; }
      }
      sharedSweets?.update(flags, ghostPlace.position, carving?.position);
    }
    characterShadows.update(look.x, centreY, viewHeight * look.zoom * Math.max(1, camera.aspect) * .65);
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
  rig: Rig;
  neck?: Object3D;
  who: Role;
  motion: ReturnType<typeof createFamilyMotion>;
  /** Where they stand, along the course. */
  at: number;
  /** The flag that makes them glad, and whether it was set when last looked at. */
  glad: string | undefined;
  was: boolean;
  /** Seconds of delight left. */
  joy: number;
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
  function update(flags: ReadonlySet<string>, dt: number, most: number, still: boolean): number {
    k = Math.min(1, Math.max(0, k + (after === null || flags.has(after) ? dt : -dt) / 3));
    if (!still) drift += dt;
    sky.copy(day).lerp(dark, k);
    hemisphere.intensity = lerp(lights.hemisphere, 0.75, k);
    sun.intensity = lerp(lights.sun, 0.7, k);
    if (aurora) {
      aurora.update(k, drift, most);
      hemisphere.color.copy(lights.above).lerp(green, 0.25 * k * (0.85 + 0.15 * Math.sin(drift * 0.9)));
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
function buildTussocks(chapter: ChapterData, colour: string | null): Mesh[] {
  const moss = new MeshStandardMaterial({ color: colour ?? '#c9c377', roughness: 1, vertexColors: colour !== null });
  return (chapter.tussocks ?? []).map((t) => {
    // In greybox a box. In a place a mound of moss: level on top, where he stands, and round at its shoulders.
    const geometry = colour
      ? new LatheGeometry([[0, 0], [0.5, 0], [0.78, -0.06], [0.94, -0.2], [1, -0.42], [0.96, -0.75], [0.8, -1.2], [0.5, -1.6]].map(([r, y]) => new Vector2(r, y)), 22).scale(t.width / 2, 1, 1.5)
      : new BoxGeometry(t.width, 1.6, 2.6);
    geometry.translate(0, colour ? 0 : -0.8, -0.6);
    if (colour) {
      // Patches of paler and darker moss, and darker towards the water: no two alike.
      const at = geometry.getAttribute('position');
      const tones: number[] = [];
      for (let i = 0; i < at.count; i++) {
        const patch = 0.78 + 0.3 * Math.abs(Math.sin(at.getX(i) * 3.1 + t.x) * Math.cos(at.getZ(i) * 2.7 + t.x * 1.7));
        const deep = at.getY(i) < -0.25 ? 0.6 : 1;
        tones.push(patch * deep, patch * deep * (0.94 + 0.06 * Math.sin(at.getX(i) * 5 + t.x)), patch * deep * 0.9);
      }
      geometry.setAttribute('color', new Float32BufferAttribute(tones, 3));
    }
    const mesh = new Mesh(geometry, moss);
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
  if (!chapter.mist) return { group, update: () => {} };
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
  function update(flags: ReadonlySet<string>, x: number, y: number, facing: number, cameraZ: number, dt: number): void {
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
    glow.position.set(x + facing * 0.32, y + 1.42, 0.25);
    glow.scale.setScalar(k);
    halo.position.set(x + facing * 0.32, y + 1.42, 0.3);
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
  return { group, update };
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
  const down = new MeshStandardMaterial({ color: '#b9aa94', roughness: 1 });
  const chick = new Group();
  const body = new Mesh(new SphereGeometry(0.22, 14, 10), down);
  body.position.y = 0.42;
  body.scale.set(1.25, 1, 0.9);
  const neck = new Mesh(new CylinderGeometry(0.05, 0.06, 0.36, 8), down);
  neck.position.set(0.17, 0.68, 0);
  const head = new Mesh(new SphereGeometry(0.1, 12, 8), down);
  head.position.set(0.19, 0.9, 0);
  const beak = new Mesh(new ConeGeometry(0.035, 0.18, 8), new MeshStandardMaterial({ color: '#8a6a3a', roughness: 0.7 }));
  beak.rotation.z = -Math.PI / 2;
  beak.position.set(0.35, 0.89, 0);
  chick.add(body, neck, head, beak);
  for (const side of [-0.07, 0.07]) {
    const leg = new Mesh(new CylinderGeometry(0.018, 0.018, 0.26, 6), new MeshStandardMaterial({ color: '#5e5548', roughness: 0.8 }));
    leg.position.set(0, 0.13, side);
    chick.add(leg);
  }
  chick.position.set(def.at.x, def.at.y, 0);
  group.add(chick);
  const rings = [0, 1, 2].map(() => {
    const ring = new Mesh(new TorusGeometry(0.5, 0.025, 8, 36), new MeshBasicMaterial({ color: '#fff3d6', transparent: true, opacity: 0 }));
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    return ring;
  });
  function update(flags: ReadonlySet<string>, elof: PlayerState, clock: number, dt: number): void {
    const following = flags.has(def!.after) && !flags.has(def!.until);
    const to = flags.has(def!.until) ? def!.home : following ? { x: elof.x - elof.facing * 1.2, y: elof.standY } : def!.at;
    chick.position.x += (to.x - chick.position.x) * ease(following ? 4 : 2.5, dt);
    chick.position.y += (to.y - chick.position.y) * ease(6, dt);
    // It looks the way it goes, and bobs as it walks.
    const way = to.x - chick.position.x;
    if (Math.abs(way) > 0.05) chick.rotation.y = way > 0 ? 0 : Math.PI;
    body.position.y = 0.42 + (Math.abs(way) > 0.05 ? Math.abs(Math.sin(clock * 11)) * 0.05 : 0);
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
    sweet.add(sweetSocket(new Group().add(body, band), { shape: def.kind, scale: 1.25 }), ring);
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
      ring.position.set(at.x, at.y, 0.2);
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
  function update(hook: { x: number; y: number } | null, hand: Vector3): void {
    drawnWhile(mesh, hook !== null);
    if (!hook) {
      mesh.scale.setScalar(0);
      return;
    }
    const length = along.set(hook.x, hook.y, 0).sub(hand).length();
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
    braid: new MeshStandardMaterial({ color: '#6a4634', roughness: .9 }),
    lichen: new MeshStandardMaterial({ color: '#adb59b', roughness: 1 }),
    root: new MeshStandardMaterial({ color: '#65513d', roughness: 1 }),
  };
  const ringGeometry = new TorusGeometry(.14, .022, 8, 16);
  const ringMaterial = new MeshStandardMaterial({ color: '#b94a3c', roughness: .7 });
  const hoses = (chapter.climbs ?? []).map((climb) => {
    const look = climb.look ?? 'hose';
    const length = climb.top - climb.bottom + 0.25;
    // It hangs from its top, so that one that is let down grows downwards.
    const radius = look === 'lace' ? .035 : look === 'braid' ? .1 : .06;
    const geometry = new CylinderGeometry(radius, radius, length, 10);
    geometry.translate(0, -length / 2, 0);
    const hose = new Mesh(geometry, materials[look]);
    hose.name = `climb:${look}:${climb.x}`;
    hose.position.set(climb.x, climb.bottom + length, -0.16);
    group.add(hose);
    const ring = look === 'lace' ? new Mesh(ringGeometry, ringMaterial) : null;
    if (ring) { ring.position.set(climb.x, climb.top, -.12); group.add(ring); }
    return { hose, ring, needs: climb.needs, down: climb.needs === undefined ? 1 : 0 };
  });
  /** A hose that waits for something is let down when that has happened: the lichen, the braid, the lace. */
  function update(flags: ReadonlySet<string>, dt: number): void {
    for (const h of hoses) {
      if (h.needs !== undefined) h.down = Math.min(1, Math.max(0, h.down + (flags.has(h.needs) ? dt : -dt) / 0.5));
      h.hose.scale.y = Math.max(0.001, h.down);
      if (h.ring) {
        h.ring.scale.setScalar(h.down);
        drawnWhile(h.ring, h.down > 0);
      }
    }
  }
  return { group, update };
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
function buildGhost(): Group {
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
  return group;
}
