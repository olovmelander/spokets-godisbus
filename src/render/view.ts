import {
  AdditiveBlending, BoxGeometry, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DirectionalLight, DoubleSide,
  DepthTexture, DynamicDrawUsage, ExtrudeGeometry, Fog, Group, HalfFloatType, HemisphereLight, InstancedMesh, LatheGeometry, Mesh,
  Float32BufferAttribute, MeshBasicMaterial, MeshLambertMaterial, MeshStandardMaterial, NeutralToneMapping, Object3D, OctahedronGeometry, PerspectiveCamera, PlaneGeometry, PointLight, Quaternion,
  Scene, Shape, SphereGeometry, TorusGeometry, UnsignedIntType, Vector2, Vector3, WebGLRenderer, WebGLRenderTarget,
} from 'three';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import type { Reaction } from '../app/pointing';
import { createAssets } from './assets';
import { candyKit, createTrail, installSweets, sweeten, sweetSocket } from './candy';
import { buildLedges } from './ledges';
import type { TextureOwnershipInfo } from './texture-ownership';
import { captureFrame } from './capture';
import { observeGpu, type GpuMemory } from './gpu-memory';
import { KINDS } from '../content/kinds';
import { personFor } from '../content/people';
import { PLACES, dress } from './dressing';
import { nightBrightness } from './backdrop';
import { helperProp, moverProp, rideProp, spotProp } from './props';
import { GARDEN_MORNING, GLOW_ON_HIGH, createGradePass, createMaterialGrade } from './grade';
import { createDepthBlur } from './depth-blur';
import { createBloom } from './bloom';
import { createWater } from './water';
import { createCharacterShadows } from './character-shadows';
import { chooseTier, maxResolutionSteps, pixelRatioFor, type Tier } from './quality';
import { cameraIntent } from '../sim/camera-intent';
import { songGlitter } from './song-glitter';
import { createEpilogueStage } from './epilogue-stage';
import { createPrologueStage } from './prologue-stage';
import { createFamilyRehearsal } from './family-rehearsal';
import { createSharedSweets } from './shared-sweets';
import { saturdayBag } from './saturday-bag';
import { createGhostThought } from './ghost-thought';
import { prologuePose, type PrologueFrame } from '../sim/prologue';
import { BERRY_HALF, BERRY_HEIGHT, RUN_SPEED } from '../sim/constants';
import type { ChapterData, HelpState, PlayerState, Vec } from '../sim/types';
import type { GhostState } from '../sim/sim';

/** A long lens from the side flattens depth the way a macro lens does (plan §5.2). */
const FOV = 30;
/** The ground sits about 35% up from the bottom, so thumbs never cover Elof (plan §5.2). */
const GROUND_FROM_BOTTOM = 0.35;

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
  /** Re-fetch released immutable textures before warming Three's restored GL resources. */
  restore(): Promise<void>;
  resize(): void;
  /** Apply a level without resetting the scene. Call while paused when crossing Low, to warm its shaders. */
  setTier(next: Tier): void;
  /** Whole 0.1 reductions from the tier cap. A changed step resizes existing targets, never shaders. */
  setResolutionSteps(steps: number): void;
  /** The rendered player's centre on the play plane, in CSS client coordinates; null before the first frame. */
  playerScreen(): { x: number; y: number } | null;
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
export function createView(canvas: HTMLCanvasElement, chapter: ChapterData, asked: Tier | null = null, standIns = false, trackGpu = false): View {
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
  const materialGrade = createMaterialGrade(grade);
  materialGrade.setEnabled(tier === 'low');
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
  scene.background = sky;
  scene.fog = new Fog(sky, 14, 44);
  // Lights are created once and never toggled: every change would compile a new shader (plan §6.2).
  const hemisphere = new HemisphereLight(place?.hemisphere.sky ?? '#e2efff', place?.hemisphere.ground ?? '#6a5338', place?.hemisphere.intensity ?? 1.25);
  scene.add(hemisphere);
  const sun = new DirectionalLight(place?.sun.colour ?? '#ffe1ae', place?.sun.intensity ?? 2.4);
  sun.position.set(...(place?.sun.from ?? ([-6, 5, 8] as const)));
  scene.add(sun);
  // A place's sun stands behind the scene, so a faint light from the camera's side lifts the faces. It is
  // there in greybox too, dark, so that every chapter uses the same shaders.
  const fill = new DirectionalLight(place?.fill.colour ?? '#ffffff', place?.fill.intensity ?? 0);
  fill.position.set(4, 3, 10);
  scene.add(fill);
  const dressing = place ? dress(chapter, place) : null;
  if (dressing) {
    scene.background = dressing.background;
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
  const trail = createTrail(chapter.candy);
  // Side candy, off the trail: hearts and lollipops, where the trail is sweets in wrappers.
  const sideTrail = createTrail(chapter.side ?? [], 'side');
  const noSide: readonly boolean[] = [];
  const ledges = buildLedges(chapter.ledges ?? []);
  const glitter = buildGlitter();
  const lace = buildLace();
  const glints = buildGlints(chapter);
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
  const things = (chapter.spots ?? []).map((spot) => ({ spot, prop: spotProp(spot), reactionTurn: 0 }));
  // What only stands about: drawn like a thing to use, and gone when its flag is set.
  const decor = (chapter.decor ?? []).map((def, i) => ({
    def,
    prop: spotProp({ id: `decor:${i}`, at: def.at, verb: 'take', look: def.look, ...(def.word ? { word: def.word } : {}) }),
  }));
  for (const d of decor) if (d.prop) scene.add(d.prop.group);
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
      scene.add(prop);
    }
    return { ride, prop };
  });
  const moverMeshes = buildMovers(chapter);
  const sharedSweets = chapter.id === 'norrsken' ? createSharedSweets() : null;
  if (sharedSweets) scene.add(sharedSweets.group);
  const rain = buildRain(chapter.drips?.length ?? 0);
  const cones = buildCones(chapter.rollers?.length ?? 0);
  scene.add(...moverMeshes, rain.group, cones.mesh);
  const climbs = buildClimbs(chapter);
  // The dressing brings its own ground and its own trees.
  if (!dressing) scene.add(buildGround(chapter), buildTrunks(chapter));
  scene.add(climbs.group, buildHooks(chapter), lace.mesh, trail.group, sideTrail.group, ledges.group, glitter.group);
  const water = createWater(chapter, place?.water ?? null, place?.sun.from);
  const waterScene = new Scene();
  waterScene.fog = scene.fog;
  waterScene.add(water.group);
  const tussockMeshes = buildTussocks(chapter, place?.tussock ?? null);
  const berryMeshes = buildBerries(chapter);
  for (const berry of berryMeshes) scene.add(berry);
  const mist = buildMist(chapter, scene.fog as Fog, place?.haze ?? null);
  const follower = buildFollower(chapter);
  const wind = buildWind(chapter);
  const night = buildNight(chapter, sky, hemisphere, sun);
  scene.add(night.group);
  scene.add(...tussockMeshes, mist.group, follower.group, wind.group);

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
    .filter((bird): bird is Object3D => bird !== undefined);
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
  const ready = Promise.all([candyReady, jayReady, sweetsReady]).then(() => undefined);

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
  const prologueStage = createPrologueStage(chapter.prologue);
  scene.add(prologueStage.group);
  const epilogueStage = createEpilogueStage(chapter.epilogue);
  scene.add(epilogueStage.group);
  let ghostFoot: Object3D | null = null;
  // The stand-in faces +x, as the stand-in Elof does; the model from Blender faces the camera.
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
      ghostFaces = -Math.PI / 2;
      // GLTFLoader drops the dot from Blender's names: foot.L arrives as footL.
      ghostFoot = model.getObjectByName('footL') ?? null;
      models.push('private/ghost');
      modelInstallations++;
    })
    .catch((error) => console.error('The ghost could not be loaded.', error));

  // Elof, modelled in Blender after his sheets and photos. He too is only here where the private pack is;
  // everywhere else the stand-in built in code plays his part.
  let doll: Doll | null = null;
  assets
    .manifest()
    .then((manifest) => (!standIns && manifest.packs.private?.files['elof.glb'] ? assets.model('private', 'elof') : null))
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
      modelInstallations++;
    })
    .catch((error) => console.error('Elof could not be loaded; the stand-in stays.', error));
  const elof = buildElof();
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
    const model = createFamilyRehearsal(personFor(stand.word)!);
    stand.prop!.group.clear(); stand.prop!.group.add(model);
    family.push({ model, at: stand.at, glad: stand.glad, was: false, joy: 0, arms: [], hands: [] });
  }
  if (chapter.prologue && !standIns) {
    assets.manifest().then(async (manifest) => {
      for (const who of ['pappa', 'mamma', 'moa', 'bertil']) {
        if (!manifest.packs.private?.files[`${who}.glb`]) continue;
        const model = await assets.model('private', who);
        prologueStage.replace(who, model);
        characterShadows.add({ object: model, height: 1.6, radius: .3 });
        if (!models.includes(`private/${who}`)) models.push(`private/${who}`);
        modelInstallations++;
      }
    }).catch((error) => console.error('The opening family could not be loaded; rehearsal shapes stay.', error));
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
          const old = family.findIndex((one) => one.model.parent === stand.prop!.group);
          if (old >= 0) family.splice(old, 1);
          stand.prop!.group.clear();
          stand.prop!.group.add(model);
          characterShadows.add({ object: model, height: 1.6, radius: .3,
            groundY: () => chapter.id === 'norrsken' && homeJourney && who === 'pappa'
              ? playerGroundY : stand.prop!.group.position.y });
          family.push({
            model, at: stand.at, glad: stand.glad, was: false, joy: 0,
            arms: [jointOf(model, 'upperarm_l', -1), jointOf(model, 'upperarm_r', -1)],
            hands: [jointOf(model, 'lowerarm_l', -1), jointOf(model, 'lowerarm_r', -1)],
          });
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
    characterShadows.add({ object: model, height: 5.2, radius: .45,
      active: () => model.parent === stand.prop!.group && stand.prop!.group.visible,
      groundY: () => chapter.id === 'norrsken' && homeJourney && personFor(stand.word) === 'pappa'
        ? playerGroundY : stand.prop!.group.position.y });
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
  let viewHeight = 5;
  let distance = 10;
  let pixelRatio = 1;
  let maxPixelRatio = 1;
  let resolutionSteps = 0;
  let resizes = 0;
  let cssWidth = 0;
  let cssHeight = 0;
  const look = cameraIntent({ ...startState(chapter) }, chapter.cameras);
  let stride = 0;
  let turn = 0;
  let squash = 1;
  let wasGrounded = true;

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
  let warm = 2;
  let warmedFor = 0;
  let hasFrame = false;
  let inEndingShot = false;
  let warming = true;
  const unculled: Object3D[] = [];
  const projectedPlayer = new Vector3();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
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
      materialGrade.apply(scene);
      materialGrade.apply(waterScene);
      for (const layer of [scene, waterScene]) layer.traverse((object) => {
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
        renderer.compile(waterScene, camera);
      }
      // A normal (non-XR) render target uses linear output without material tone mapping.
      renderer.render(scene, camera);
      if (hdr && water.refracting) water.capture(renderer, hdr.scene, camera);
      renderer.setRenderTarget(hdr?.scene ?? null);
      // Water reads the copied pre-water colour, while testing the scene's retained depth. No second
      // scene render and no read/write feedback: this adds only the pool draws and one small copy.
      const clear = renderer.autoClear;
      renderer.autoClear = false;
      try { renderer.render(waterScene, camera); } finally { renderer.autoClear = clear; }
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
        unculled.length = 0;
        warm--;
      }
    }
  }

  function render({ prev, curr, alpha, dt, atGoal, collected, side, checkpoint, movers, drips, flags, ghost: ghostState, rollers, tussocks, gusts, help, berries, noteHits, prologue, ending }: Frame): void {
    inEndingShot = !!chapter.epilogue && ending !== null && ending !== undefined;
    rain.update(drips);
    epilogueStage.update(flags, ending, reducedMotion.matches || document.body.classList.contains('calm'));
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
    const calmStory = reducedMotion.matches || document.body.classList.contains('calm');
    shoulderLift = calmStory ? wantShoulders : shoulderLift + Math.sign(wantShoulders - shoulderLift) * Math.min(Math.abs(wantShoulders - shoulderLift), dt * 8.5);
    clock += dt;
    responseFor = Math.max(0, responseFor - dt);
    const response = responseFor > 0 ? (calmResponse ? 0.15 : Math.sin((0.85 - responseFor) * 24) * responseFor / 0.85) : 0;
    if (responseFor === 0) reaction = null;
    trail.update(collected, flags, x, y, dt, clock, reaction?.kind === 'candy' ? reaction.index : undefined, response,
      chapter.prologue && ghostState ? ghostState.x : Infinity);
    sideTrail.update(side ?? noSide, flags, x, y, dt, clock);
    ledges.update(flags, dt);
    glints.update(flags, clock);
    lawnSong.update(flags, clock);
    for (const hit of noteHits ?? []) noteStrikes.set(hit.id, hit.serial);
    cones.update(rollers, clock);
    water.update(clock);
    for (const [i, t] of tussocks.entries()) tussockMeshes[i]?.position.set(t.x, t.y, 0);
    // A cranberry goes flat under him and springs back, a little past its shape.
    for (const [i, b] of (berries ?? []).entries()) {
      const flat = b.squash * b.squash;
      const spring = Math.sin(b.squash * Math.PI * 3) * 0.12 * b.squash;
      berryMeshes[i]?.scale.set(1 + 0.3 * flat - spring * 0.5, 1 - 0.5 * flat + spring, 1 + 0.3 * flat - spring * 0.5);
    }
    mist.update(flags, x, y, curr.facing, camera.position.z, dt);
    wind.update(gusts, clock);
    climbs.update(flags, dt);
    follower.update(flags, curr, clock, dt);
    // On a ride he sits on Moa's paper plane, which points the way it flies.
    const riding = curr.mode === 'ride';
    // Which ride he is on is read from where he is: no two rides share a stretch.
    const carrier = riding ? carriers.find((c) => x >= c.ride.from.x - 0.5 && x <= c.ride.to.x + 0.5) : undefined;
    const size = riding ? Math.min(1, curr.t / 0.05, (1 - curr.t) / 0.05) : 0;
    const heading = riding ? Math.atan2(curr.y - prev.y, Math.max(1e-4, curr.x - prev.x)) : 0;
    plane.scale.setScalar(carrier && carrier.ride.look !== undefined && carrier.ride.look !== 'plane' ? 0 : size);
    plane.position.set(x, y - 0.05, 0);
    plane.rotation.z = heading;
    for (const c of carriers) {
      if (!c.prop) continue;
      c.prop.scale.setScalar(c === carrier ? size : 0);
      c.prop.position.set(x, y - 0.05, 0);
      // A boat lies level on the water; a bird points the way it flies, and beats its wings.
      c.prop.rotation.z = c.ride.look === 'cap' ? Math.sin(clock * 2.4) * 0.05 : heading * 0.6;
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
      if (thing.prop && thing.spot.look === 'wisp') thing.prop.group.visible = thing.spot.needs === undefined || flags.has(thing.spot.needs);
      // The star comes from the torn bag; the returned bag is offered only after the repaired eyes.
      if (thing.prop && chapter.prologue && thing.spot.id === 'star') {
        const spilled = flags.has('blink') && flags.has('bag:torn') && (starDropTime > 0 || (x >= 37.5 && (ghostState?.x ?? 0) >= 40.5));
        if (spilled && dt > 0) starDropTime = Math.min(.65, starDropTime + dt);
        const progress = reducedMotion.matches || document.body.classList.contains('calm') ? 1 : Math.min(1, starDropTime / .65);
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
      if (d.prop && d.def.after !== undefined) d.prop.group.visible = flags.has(d.def.after);
      // The doorway tableau takes over Mamma's opening mark; never draw her twice when private models load.
      if (d.prop && chapter.prologue && d.def.word === 'callMamma') d.prop.group.visible = false;
    }
    // The POFF: he shrinks, or grows back, in a little more than a second, in a swarm of glitter.
    let poff = false;
    if (sized) {
      const big = (sized.after === undefined || flags.has(sized.after)) && (sized.until === undefined || !flags.has(sized.until));
      const want = big ? sized.scale : 1;
      if (!hasFrame) tall = want; // A restored small Elof must not replay a change that already happened.
      poff = tall !== want;
      tall += Math.sign(want - tall) * Math.min(Math.abs(want - tall), ((sized.scale - 1) * dt) / 1.2);
    }
    helper.update(help, x, y, curr.standY, clock, dt, reducedMotion.matches || document.body.classList.contains('calm'));
    // The helper is the same friend, not a second ghost alongside the one he is following.
    ghostPlace.visible = chapter.ghost !== undefined && !(ghostHelps && helper.active);
    hiddenSweets.update(flags, clock, dt, reaction?.kind === 'hidden' ? reaction.index : undefined, response);
    glance.update(flags, ghostState, clock, dt);
    glitter.update(curr.bubble, x, y, clock);
    // He hangs by his hands, his body along the lace.
    const hang = curr.hook ? Math.atan2(curr.hook.x - x, curr.hook.y - (y + 0.5)) : 0;
    lace.update(curr.hook, x - Math.sin(hang) * 0.4, y + 0.5 + Math.cos(hang) * 0.4);

    // The simulation says where to look; the view only smooths it.
    const want = cameraIntent(curr, chapter.cameras);
    look.zoom += (want.zoom - look.zoom) * ease(1.6, dt);
    look.x += (want.x - look.x) * ease(3, dt);
    look.y += (want.y - look.y) * ease(2.5, dt);
    const centreY = look.y + viewHeight * look.zoom * (0.5 - GROUND_FROM_BOTTOM);
    camera.position.set(look.x, centreY, distance * look.zoom);
    camera.lookAt(look.x, centreY, 0);
    if (chapter.prologue && !flags.has('blink') && x < 10) {
      const shotHeight = Math.max(8.4, 14.5 / camera.aspect);
      camera.position.set(3.5, 2.1, shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(3.5, 2.1, 0);
    }
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
    if (chapter.prologue && x >= 38 && !flags.has('pappa:noticed')) {
      // A fixed shared composition makes the scale change visible relative to the same family.
      // Width is bounded in portrait; the top and bottom leave room for story and touch controls.
      const shotHeight = Math.max(8.4, 9.6 / camera.aspect);
      camera.position.set(42.1, 1.55, shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(42.1, 1.55, 0);
    }
    if (chapter.epilogue && ending !== null && ending !== undefined) {
      const window = chapter.epilogue.window;
      const shotHeight = Math.max(2.6, 2.8 / camera.aspect);
      camera.position.set(window.x, window.y + 0.65, window.z + shotHeight / 2 / Math.tan(FOV * Math.PI / 360));
      camera.lookAt(window.x, window.y + 0.65, window.z);
    }
    const darkness = night.update(flags, look.x, centreY, clock, dt);
    if (dressing && place) {
      dressing.update(look.x, look.y, clock, darkness);
      if (place.id === 'dusk') {
        scene.backgroundIntensity = nightBrightness(darkness);
        // Fog keeps a copy of its initial colour; changing `sky` alone never changes the haze.
        (scene.fog as Fog).color.copy(sky);
      }
      // The haze begins behind the play plane, however far the camera has pulled back.
      if (!chapter.mist) {
        (scene.fog as Fog).near = camera.position.z + place.haze.near;
        (scene.fog as Fog).far = camera.position.z + place.haze.far;
      }
    }

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
    const waving = reaction?.kind === 'player' && curr.grounded;
    elof.arm.rotation.z = waving ? -2 + response * 0.3 : 0;
    if (doll) poseDoll(doll, curr, stride, dt, waving ? responseFor : 0, calmResponse);
    if (curr.grounded && !wasGrounded) squash = 0.82; // a soft landing
    wasGrounded = curr.grounded;
    squash += (1 - squash) * ease(12, dt);
    const stretch = curr.grounded ? squash : 1 + clamp(curr.vy * 0.012, -0.05, 0.1);
    // Knocked over by a drop he goes down on his back, lies a moment, and gets up.
    const lying = curr.mode === 'down' ? Math.min(1, curr.t / 0.15, (1 - curr.t) / 0.25) * 1.4 * curr.facing : 0;
    // The tilt turns about his middle, where the lace's pull goes through.
    elof.group.position.set(x - Math.sin(hang) * 0.5, y + 0.5 - Math.cos(hang) * 0.5 + shoulderLift, 0);
    elof.group.rotation.set(0, turn, lying - hang, 'ZYX');
    elof.group.scale.set(tall / Math.sqrt(stretch), tall * stretch, tall / Math.sqrt(stretch));
    if (poff) glitter.update(0.5, x, y + tall * 0.4, clock);
    elof.body.rotation.z = -clamp(curr.vx / RUN_SPEED, -1, 1) * 0.12 * curr.facing;

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
      ghostPlace.position.set(ghostState.x, ghostState.y, 0);
      ghostPlace.scale.setScalar(ghostSize);
      // Its shadow lies where it stands. In a hop it is off the ground, and the shadow waits where it will land.
      if (!hopping) ghostGroundY = ghostState.y;
      // 0 faces along the course; a half turn faces back at him.
      const wanted = reaction?.kind === 'ghost' ? -Math.PI / 2 : hopping || x > ghostState.x ? 0.4 : Math.PI - 0.4;
      ghostTurn += (wanted - ghostTurn) * ease(7, dt);
      const awake = !chapter.prologue || flags.has('blink');
      ghost.rotation.set(0, ghostFaces + ghostTurn, !awake ? 0 : hopping ? -0.25 * Math.sin(Math.PI * ghostState.t) : Math.sin(clock * 1.7) * 0.035);
      if (ghostFoot) ghostFoot.rotation.x = hopping ? 0 : -Math.max(0, Math.sin(clock * 9)) * (Math.sin(clock * 0.9) > 0.2 ? 0.45 : 0);
      if (chapter.prologue && prologue) {
        const pose = prologuePose(chapter.prologue, prologue);
        ghostPlace.position.set(pose.x, pose.y, 0.1);
        ghostSize = pose.scale;
        ghostPlace.scale.setScalar(ghostSize);
        ghost.rotation.set(0, ghostFaces + pose.turn, pose.tilt);
        if (ghostFoot) ghostFoot.rotation.x = 0;
        ghostStaged = true;
      } else if (chapter.prologue && flags.has('pappa:done')) {
        ghostSize = 0;
        ghostPlace.scale.setScalar(0);
        ghostStaged = true;
      }
    }
    if (chapter.prologue) {
      paintedEyes.forEach((eye, i) => { eye.visible = flags.has(i === 0 && paintedEyes.length > 1 ? 'eye' : 'paint'); });
    }
    // Keep the stolen paper bag distinct from the wooden pocket, across every chapter of the chase.
    stolenBag.visible = ghostPlace.visible && (chapter.prologue ? flags.has('blink') : chapter.id !== 'epilog') &&
      !(chapter.id === 'norrsken' && flags.has('eyes'));
    stolenBag.position.set(Math.cos(ghostTurn) * .48, .18, -.18 + Math.sin(ghostTurn) * .25);
    stolenBag.rotation.y = ghostTurn;
    const tear = stolenBag.getObjectByName('saturday-bag-tear');
    if (tear) tear.visible = chapter.prologue ? flags.has('bag:torn') : true;
    prologueStage.update(prologue, flags, { x, y, tall });
    // His first figure has its place again, with Klonk beside it once Elof finishes painting.
    if (chapter.epilogue && chapter.shelf && flags.has('dots')) {
      ghostPlace.position.set(chapter.shelf.x - 2.4, chapter.shelf.y + 0.08, -8.5);
      ghostPlace.scale.setScalar(1);
      ghost.rotation.set(0, ghostFaces - Math.PI / 2, 0);
      if (ghostFoot) ghostFoot.rotation.x = 0;
      ghostStaged = true;
    }
    ghostThought?.update(ghostState, flags, { x, y }, camera, clock, dt,
      reducedMotion.matches || document.body.classList.contains('calm'), ghostPlace.visible);
    // The family: each turns a little towards him, and throws their arms up for a moment when he has given
    // them candy, or when they first come into the picture.
    for (const one of family) {
      const now = one.glad !== undefined && flags.has(one.glad);
      if (now && !one.was) one.joy = 1.8;
      one.was = now;
      one.joy = Math.max(0, one.joy - dt);
      const towards = clamp((x - one.at) * 0.22, -0.75, 0.75);
      one.model.rotation.y += (towards - one.model.rotation.y) * ease(4, dt);
      const up = one.joy > 0 ? Math.min(1, one.joy / 0.3, (1.8 - one.joy) / 0.25) : 0;
      // A small hop of delight, and otherwise the slow sway of someone standing.
      one.model.position.y = reducedMotion.matches || document.body.classList.contains('calm') ? 0 : up * Math.abs(Math.sin(clock * 9)) * .36;
      for (const [i, arm] of one.arms.entries()) {
        bendJoint(arm, up > 0 ? -3.0 * up : Math.sin(clock * 1.1 + one.at + i) * 0.05, ease(10, dt));
        bendJoint(one.hands[i] ?? null, up > 0 ? -0.2 * up : -0.08, ease(10, dt));
      }
    }
    if (chapter.id === 'norrsken') {
      const carving = scene.getObjectByName('mover:tragubbe');
      if (carving && flags.has('taste') && ghostState && !homeJourney) carving.position.set(ghostState.x - .5, ghostState.y, 0);
      if (homeJourney && flags.has('home')) {
        // The home ride is visibly Pappa carrying Elof, with both returned carvings alongside him.
        const pappa = stands.find((stand) => personFor(stand.word) === 'pappa');
        const model = pappa?.prop?.group.children[0];
        if (model && pappa) {
          model.position.set(x - pappa.at, y - pappa.prop!.group.position.y, 0);
          model.rotation.y = .35;
        }
        ghostPlace.visible = true; ghostPlace.position.set(x - .8, y + shoulderLift, .12); ghostPlace.scale.setScalar(1);
        ghostGroundY = playerGroundY;
        if (carving) carving.position.set(x + .8, y + shoulderLift, .12);
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
    setTier(next) {
      const chosen = chooseTier(next, hdrAvailable);
      if (tier === chosen) return;
      const changesPipeline = (tier === 'low') !== (chosen === 'low') || tier === 'high' || chosen === 'high';
      tier = chosen;
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
    playerScreen() {
      elof.group.localToWorld(projectedPlayer.set(0, 0.5, 0));
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

/** One of the family, standing where their sign stood: the model, and the joints that move. */
interface Relative {
  model: Object3D;
  /** Where they stand, along the course. */
  at: number;
  /** The flag that makes them glad, and whether it was set when last looked at. */
  glad: string | undefined;
  was: boolean;
  /** Seconds of delight left. */
  joy: number;
  arms: (Joint | null)[];
  hands: (Joint | null)[];
}

/** A joint of a model by its bone's name, or null when the model has no such bone. */
function jointOf(model: Object3D, name: string, forward: 1 | -1): Joint | null {
  const node = model.getObjectByName(name);
  if (!node) return null;
  const bone = (node as { isBone?: boolean }).isBone === true;
  return { node, rest: bone ? node.quaternion.clone() : null, forward: bone ? forward : 1, angle: 0 };
}

/** Bends a joint towards an angle, a share of the way each frame. */
function bendJoint(joint: Joint | null, angle: number, quick: number): void {
  if (!joint) return;
  joint.angle += (angle - joint.angle) * quick;
  if (joint.rest) joint.node.quaternion.copy(joint.rest).multiply(turn.setFromAxisAngle(X_AXIS, joint.angle * joint.forward));
  else joint.node.rotation.x = joint.angle;
}

/**
 * Poses the doll in code until the library's clips drive it: a walk and a run that follow the distance he
 * covers, and a jump. He faces +z in his own space, so a joint swings forward with a negative turn round x.
 */
function poseDoll(doll: Doll, player: PlayerState, stride: number, dt: number, wave = 0, calm = false): void {
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
  if (wave > 0) {
    bend(doll.upperArms[0]!, -2);
    bend(doll.lowerArms[0]!, -0.7 + (calm ? 0 : Math.sin(wave * 22) * 0.3));
  }
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
 * Night and the northern lights (plan §3.4, the final). When the chapter's flag is set, the sky
 * darkens over a few seconds, the light turns low and blue, and three green ribbons wave far behind the
 * scene. The ribbons are there from the start, unseen, so that no shader is compiled when they flare.
 */
function buildNight(chapter: ChapterData, sky: Color, hemisphere: HemisphereLight, sun: DirectionalLight) {
  const group = new Group();
  if (!chapter.night) return { group, update: () => 0 };
  const after = chapter.night.after;
  const day = sky.clone();
  // Night from the start is there at once: it doesn't fall while he watches.
  const dark = new Color('#14244a');
  const lights = { hemisphere: hemisphere.intensity, sun: sun.intensity };
  const ribbons = [0, 1, 2].map((i) => {
    // A curtain of light: bright near its lower edge, fading upwards and towards its ends, and hanging in folds.
    const geometry = new PlaneGeometry(60, 7 + i * 2, 24, 4);
    const at = geometry.getAttribute('position');
    const glow: number[] = [];
    const rows = [0, 0.22, 0.55, 1, 0];
    for (let v = 0; v < at.count; v++) {
      const column = v % 25;
      const ends = Math.sin((Math.PI * column) / 24);
      const light = rows[Math.floor(v / 25)]! * ends;
      glow.push(0.25 * light, light, 0.55 * light);
      at.setY(v, at.getY(v) + Math.sin(column * 0.8 + i * 2) * 0.9 + Math.sin(column * 0.31 + i) * 1.4);
    }
    geometry.setAttribute('color', new Float32BufferAttribute(glow, 3));
    const material = new MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, fog: false, depthWrite: false, blending: AdditiveBlending, side: DoubleSide });
    const ribbon = new Mesh(geometry, material);
    ribbon.frustumCulled = false;
    group.add(ribbon);
    return ribbon;
  });
  let k = after === null ? 1 : 0;
  function update(flags: ReadonlySet<string>, x: number, y: number, clock: number, dt: number): number {
    k = Math.min(1, Math.max(0, k + (after === null || flags.has(after) ? dt : -dt) / 3));
    sky.copy(day).lerp(dark, k);
    hemisphere.intensity = lerp(lights.hemisphere, 0.75, k);
    sun.intensity = lerp(lights.sun, 0.7, k);
    for (const [i, ribbon] of ribbons.entries()) {
      ribbon.position.set(x + Math.sin(clock * 0.21 + i * 2.1) * 5, y + 9 + i * 2.5 + Math.sin(clock * 0.5 + i) * 0.5, -20 - i * 3);
      ribbon.rotation.z = 0.08 * Math.sin(clock * 0.33 + i * 1.7) + (i - 1) * 0.07;
      (ribbon.material as MeshBasicMaterial).opacity = k * (0.5 + 0.2 * Math.sin(clock * 0.9 + i * 2.4));
    }
    return k;
  }
  return { group, update };
}

/**
 * The gusts (plan §4.7, E4), in greybox: boulders to shelter behind, and pale streaks over the open ground.
 * In the second before a gust the streaks show faintly where it will come; while it blows they sweep across,
 * against the way he is going.
 */
function buildWind(chapter: ChapterData) {
  const group = new Group();
  const STREAKS = 14;
  const stone = new MeshStandardMaterial({ color: '#8d8f93', roughness: 0.95 });
  const stretches = (chapter.gusts ?? []).map((def) => {
    for (const x of def.shelters) {
      const boulder = new Mesh(new SphereGeometry(1, 10, 8), stone);
      boulder.scale.set(0.95, 1.15, 0.8);
      boulder.position.set(x, def.y + 0.75, -1.3);
      group.add(boulder);
    }
    const material = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0, depthWrite: false });
    const streaks = new InstancedMesh(new BoxGeometry(1, 0.035, 0.035), material, STREAKS);
    streaks.instanceMatrix.setUsage(DynamicDrawUsage);
    streaks.frustumCulled = false;
    group.add(streaks);
    return { def, material, streaks };
  });
  const place = new Object3D();
  function update(gusts: readonly { blow: number; warn: number }[], clock: number): void {
    for (const [i, { def, material, streaks }] of stretches.entries()) {
      const gust = gusts[i];
      const blow = gust?.blow ?? 0;
      const warn = gust?.warn ?? 0;
      material.opacity = blow > 0 ? 0.85 * Math.sin(Math.PI * Math.min(1, blow)) + 0.1 : warn * 0.3;
      const span = def.to - def.from;
      for (let k = 0; k < STREAKS; k++) {
        const along = (k * 0.618 + (blow > 0 ? blow * 1.6 : 0)) % 1;
        place.position.set(def.to - along * span, def.y + 0.25 + (k % 5) * 0.34 + Math.sin(clock * 5 + k) * 0.03, 0.4 - (k % 3) * 0.5);
        place.scale.set(blow > 0 ? 2.6 : 0.7 + warn * 0.6, 1, 1);
        place.updateMatrix();
        streaks.setMatrixAt(k, place.matrix);
      }
      streaks.instanceMatrix.needsUpdate = true;
    }
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
function buildMist(chapter: ChapterData, fog: Fog, haze: { near: number; far: number } | null) {
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
  group.add(light, glow);
  let k = 0;
  function update(flags: ReadonlySet<string>, x: number, y: number, facing: number, cameraZ: number, dt: number): void {
    k = Math.min(1, Math.max(0, k + (flags.has(after) ? dt : -dt) / 3));
    // The mist begins just behind the plane he walks in: he and what is near him stay clear, and the rest fades.
    // Before it comes, the air is the place's own: its haze begins behind the play plane.
    const clear = haze ? { near: cameraZ + haze.near, far: cameraZ + haze.far } : greybox;
    fog.near = lerp(clear.near, cameraZ - 2, k);
    fog.far = lerp(clear.far, cameraZ + 9, k);
    light.intensity = 7 * k;
    light.position.set(x + facing * 0.3, y + 1.4, 1);
    glow.position.set(x + facing * 0.32, y + 1.42, 0.25);
    glow.scale.setScalar(k);
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
      (ring.material as MeshBasicMaterial).opacity = following ? Math.sin(Math.PI * k) * 0.8 : 0;
    }
  }
  return { group, update };
}

/** The rolling cones of the avalanche (plan §4.7, E2): brown, long, turning as they go. One instanced mesh. */
function buildCones(count: number) {
  const mesh = new InstancedMesh(new SphereGeometry(1, 12, 8), new MeshStandardMaterial({ color: '#7a5230', roughness: 0.9 }), Math.max(1, count));
  mesh.count = count;
  mesh.instanceMatrix.setUsage(DynamicDrawUsage);
  mesh.frustumCulled = false;
  const place = new Object3D();
  function update(rollers: readonly { x: number; y: number; on: boolean; radius: number }[], clock: number): void {
    for (const [i, cone] of rollers.entries()) {
      const r = cone.on ? cone.radius : 0;
      // A little bounce as it rolls, and longer across the path than along it: a cone lying on its side.
      place.position.set(cone.x, cone.y + cone.radius + Math.abs(Math.sin(clock * 9 + i * 2)) * 0.08, 0);
      place.rotation.set(0, 0, -clock * 12 - i);
      place.scale.set(r, r, r * 1.9);
      place.updateMatrix();
      mesh.setMatrixAt(i, place.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  return { mesh, update };
}

/**
 * The falling drops and their shadows (plan §4.7, E1): the shadow grows on the ground for a second before
 * the drop lands, so the way through is read from the ground. Two instanced meshes, whatever their number.
 */
function buildRain(count: number) {
  const group = new Group();
  const size = Math.max(1, count);
  const drops = new InstancedMesh(
    new SphereGeometry(0.2, 14, 10),
    new MeshStandardMaterial({ color: '#a9d8f5', roughness: 0.08, transparent: true, opacity: 0.85 }),
    size,
  );
  const shadows = new InstancedMesh(
    new CircleGeometry(0.5, 20),
    new MeshBasicMaterial({ color: '#10202c', transparent: true, opacity: 0.4, depthWrite: false }),
    size,
  );
  for (const mesh of [drops, shadows]) {
    mesh.count = count;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    mesh.frustumCulled = false;
  }
  shadows.renderOrder = 1;
  group.add(shadows, drops);
  const place = new Object3D();

  function update(drips: readonly { x: number; y: number; shadow: number; height: number }[]): void {
    for (const [i, drip] of drips.entries()) {
      // The shadow lies on the ground, and the drop is a little taller than wide on its way down.
      place.position.set(drip.x, drip.y + 0.015, 0);
      place.rotation.set(-Math.PI / 2, 0, 0);
      place.scale.setScalar(drip.shadow);
      place.updateMatrix();
      shadows.setMatrixAt(i, place.matrix);
      place.position.set(drip.x, drip.y + Math.max(0, drip.height) + 0.2, 0);
      place.rotation.set(0, 0, 0);
      place.scale.set(drip.height >= 0 ? 1 : 0, drip.height >= 0 ? 1.35 : 0, drip.height >= 0 ? 1 : 0);
      place.updateMatrix();
      drops.setMatrixAt(i, place.matrix);
    }
    drops.instanceMatrix.needsUpdate = true;
    shadows.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}

/**
 * A soft glint over each thing Använd can act on (plan §4.6): the lever, the place to call from. It is
 * gone once the thing has been used.
 */
function buildGlints(chapter: ChapterData) {
  const group = new Group();
  const gold = new MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0.9, depthWrite: false, blending: AdditiveBlending });
  const spots = chapter.spots ?? [];
  const meshes = spots.map((spot) => {
    const glint = new Mesh(new OctahedronGeometry(0.16), gold);
    glint.position.set(spot.at.x, spot.at.y + 1.5, 0);
    group.add(glint);
    return glint;
  });
  function update(flags: ReadonlySet<string>, clock: number): void {
    for (const [i, spot] of spots.entries()) {
      const glint = meshes[i]!;
      const ready = !flags.has(spot.id) && (spot.needs === undefined || flags.has(spot.needs));
      glint.scale.setScalar(ready ? 1 + 0.25 * Math.sin(clock * 4 + i) : 0);
      glint.position.y = spot.at.y + 1.5 + Math.sin(clock * 2 + i) * 0.1;
      glint.rotation.y = clock * 2;
    }
  }
  return { group, update };
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
      s.sweet.visible = s.def.after === undefined || flags.has(s.def.after);
      s.size = Math.max(0, Math.min(1, s.size + (found ? -dt / 0.25 : dt)));
      s.sweet.scale.setScalar(s.size);
      s.sweet.position.y = s.def.y + Math.sin(clock * 1.8 + i) * 0.06;
      // It sways with its face to him: a coin or a fried egg seen edge-on is nothing.
      s.sweet.rotation.y = Math.sin(clock * 0.9 + i) * 0.9;
      s.sweet.rotation.z = i === tapped ? response * 0.4 : 0;
      s.ring.rotation.x = clock * 1.3 + i;
    }
  }
  return { group, update };
}

/** Moa's paper plane: a folded sheet, pointing along +x. It has no size until he rides it. */
function buildPlane(): Mesh {
  const paper = new MeshStandardMaterial({ color: '#fbf6e9', roughness: 0.9, side: DoubleSide });
  const plane = new Mesh(new ConeGeometry(0.55, 1.9, 3), paper);
  // A cone on its side, flattened: a dart.
  plane.geometry.rotateZ(-Math.PI / 2);
  plane.geometry.scale(1, 0.22, 1);
  plane.scale.setScalar(0);
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
      if (h.ring) h.ring.scale.setScalar(h.down);
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
    shoe.position.set(0.05, 0.05, z * 1.3);
    group.add(eye, shoe);
  }
  const bag = new Mesh(new BoxGeometry(0.16, 0.3, 0.26), paper);
  bag.position.set(0.3, 0.5, 0);
  group.add(bag);
  return group;
}

/** Named eye parts keep painted marks tied to the two existing story strokes, without editing a pack. */
function eyeNodes(model: Object3D): Object3D[] {
  const nodes: Object3D[] = [];
  model.traverse((node) => {
    if (/^(ghost-eye-[01]|eye[._-]?[lr12]|eyes)$/i.test(node.name)) nodes.push(node);
  });
  // A named parent must stay visible when its first named child is painted.
  const leaves = nodes.filter((node) => !nodes.some((child) => {
    for (let parent = child.parent; parent; parent = parent.parent) if (parent === node) return true;
    return false;
  }));
  if (leaves.length === 1 && leaves[0]!.children.length === 2) return [...leaves[0]!.children];
  return leaves;
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

  const nearArm = arm(0.19);
  body.add(torso, head, hairTop, fringe, backpack, nearArm, arm(-0.19));
  group.add(body, legLeft, legRight);
  return { group, body, legLeft, legRight, arm: nearArm };
}
