import {
  AdditiveBlending, Box3, BoxGeometry, BufferGeometry, CanvasTexture, CapsuleGeometry, CircleGeometry, Color, ConeGeometry, CylinderGeometry, DataTexture, ExtrudeGeometry, InstancedBufferAttribute, DoubleSide, DynamicDrawUsage,
  Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, LinearFilter, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, RingGeometry,
  CatmullRomCurve3, Points, PointsMaterial, Shape, ShapeGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, TubeGeometry, Vector2, Vector3,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PLACES } from '../../render/dressing';
import { heightAt, type PlaceLook } from '../../render/dressing/kit';
import { PACK, type ExtraContext, type ExtraFrame, type ViewExtra } from '../../render/extensions';
import { roomThings } from '../../render/home-room';
import { glowTexture } from '../../render/glow';
import { wingbeat } from '../../render/wingbeat';
import { kitLife } from '../../render/kit-life';
import { drawnWhile } from '../../render/idle';
import { litLamp } from '../../render/stage';
import { LOOK as RAIN_GEAR } from '../../render/rain-gear';
import { DOLL_SIZE, DOLL_Z, ELOF_COAT, PUT_ON } from '../../render/elof-coat';
import type { SpotProp } from '../../render/props';
import type { ChapterData, Mover, RideLook, Spot } from '../../sim/types';
import { GRAVITY } from '../../sim/constants';
import { BIRDS, bird as smallBird, owl as tawnyOwl } from '../../render/lift/fauna/shapes';
import { stepLength } from '../../render/acting';
import { paintedWood } from '../../render/painted-wood';
import { box, building, paint, PANE, rock } from './buildings';
import { createGrandparent, type Going, type Grandparent } from './grandparents';
import { afloat, flightAt, elderWalk } from './kit';
import { moonstone } from './moonstone';
import { logSeed, riverLogShape, riverLogWood } from './river-log';
import { beaverLife } from './beaver';
import { morgonen } from './chapters/morgonen';

/**
 * Äventyr 2's pictures (docs/aventyr-2.md), built in code like the first adventure's stand-ins: each is
 * recognisable, none is final art, and nothing here is a likeness of anyone. Registered into the renderer's
 * extension points (src/render/extensions.ts) when the pack loads.
 *
 * - **Night looks** for each chapter: the storm's blue dark, the lamplit village, the moonlit lake, the clear morning.
 * - **The storm:** rain in slanting streaks round the camera, soft flashes of lightning far behind (never a strobe,
 *   and none with less motion), figures blown across the sky in a flash, candlelight in windows, and when the storm's
 *   eye opens the stars and the moon.
 * - **The things of the story:** the two trägubbar, the pumpkin lantern, the owl, the rain barrel's tap, a candle,
 *   a flashlight, the little one's cap, the window latch and the reeds; Bertil's boot, Moa's umbrella and the owl
 *   to ride on; and the lid, the bark, the swinging sign and the jetty's planks.
 */

const solid = (color: string, roughness = 0.8, more: ConstructorParameters<typeof MeshStandardMaterial>[0] = {}) =>
  new MeshStandardMaterial({ color, roughness, ...more });
const ball = (radius: number, material: Material, x = 0, y = 0, z = 0, squash: readonly [number, number, number] = [1, 1, 1]): Mesh => {
  const mesh = new Mesh(new SphereGeometry(radius, 14, 10), material);
  mesh.position.set(x, y, z);
  mesh.scale.set(...squash);
  return mesh;
};
const UP = new Vector3(0, 1, 0);
const smooth = (t: number) => { const k = Math.min(1, Math.max(0, t)); return k * k * (3 - 2 * k); };
/**
 * A creature's look about, from -1 to 1: it holds one way, then turns to the next over `ease` of a hold, at uneven
 * times, `rate` turns a second or so. The same for the same `seed`.
 */
const held = (clock: number, seed: number, rate: number, ease: number) => {
  const w = clock * rate + 0.3 * Math.sin(clock * rate * 1.4 + seed) + seed;
  const n = Math.floor(w);
  const way = (m: number) => { const v = Math.sin(m * 12.9898 + seed) * 43758.5453; return (v - Math.floor(v)) * 2 - 1; };
  return way(n - 1) + (way(n) - way(n - 1)) * smooth((w - n) / ease);
};
/** A fixed scatter: the same in every session and every screenshot. */
function scatter(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where Elof is, for those who look at him, how far the story has come, and whether the picture keeps still. */
const elof: { x: number; flags: ReadonlySet<string> | null; still: boolean } = { x: 0, flags: null, still: false };
/** The chapter in the picture, for the things on rails that draw their own way there: Flärken's stone and bark. */
const playing: { chapter: ChapterData | null } = { chapter: null };
/** For the tests: where the storm says which chapter is in the picture. */
export const DRAWN_IN = playing;
/** The open water of the chapter being drawn, for what swims in it. */
let pools: NonNullable<ChapterData['water']> = [];
/** The chapter whose picture this is, for where its ground is: set as its storm is made. */
let course: ChapterData | null = null;

/**
 * The owls that carry him, one to a chapter (Olov, 8 November 2026: the owl he climbed onto vanished, or flew off by
 * itself, while another carried him). For each owl ride: the flag that boards it, where it sets off and lands, and where
 * the owl waiting for him stands now. The owl he climbs onto is the one that carries him: once he has, the waiting
 * owl is not drawn, and the ride's own owl lifts him from where it stood (`stormExtra`).
 */
const owlRides: { flag: string; from: { x: number; y: number }; to: { x: number; y: number }; waits: Vector3 | null }[] = [];
/** How far from where an owl ride sets off the owl that waits for it may stand. */
const OWL_WAITS = 2.5;

/** An owl standing at `root` is drawn while it waits, and noted as the one he will climb onto; once he has, it is not. */
function waitingOwl(root: Object3D): boolean {
  const ride = owlRides.find((r) => Math.abs(r.from.x - root.position.x) < OWL_WAITS);
  if (!ride) return true;
  if (elof.flags?.has(ride.flag)) return false;
  (ride.waits ??= new Vector3()).copy(root.position);
  return true;
}
/** The flag that puts the ladder's ledge over the ditch at Billsta. */
const LADDER_LAID = 'bi:ladder';

let glowMap: ReturnType<typeof glowTexture> | null = null;
/** A soft additive glow of a colour, as big as `size`. */
function glow(colour: string, size: number, opacity = 1): Mesh {
  glowMap ??= glowTexture(32);
  const mesh = new Mesh(new PlaneGeometry(size, size), new MeshBasicMaterial({
    color: colour, map: glowMap, transparent: true, opacity, depthWrite: false, blending: AdditiveBlending, fog: false,
  }));
  mesh.renderOrder = 3;
  return mesh;
}

// --- the night looks -------------------------------------------------------------------------------------------

/**
 * A night's grade. Its contrast stays near 1: it pivots on middle grey, so in a picture this dark more of it turns
 * the near shapes to pure black, where Elof is lost. Its vignette is light (the light pass of 6 November 2026): at
 * night darker corners swallowed the ground in front of him and the edges of the scenes.
 */
const grade = (exposure: number, saturation: number, tint: readonly [number, number, number]) => ({ tint: [...tint] as [number, number, number], exposure, contrast: 1.02, saturation, vignette: 0.3, grain: 0.04 });

/**
 * The light from the camera's side, out of doors in the storm. The sun stands behind the scene, so this is what
 * falls on what faces him: strong enough that near shapes read, while the sky, which it doesn't light, stays dark.
 * Raised in the light pass of 6 November 2026, with the sky light: at the darkest the ground in front of him and
 * the figures in the scenes sank into black (half of the play picture under L* 10 in places).
 */
const STORM_FILL = 2.8;
/** The light from the night sky on everything out of doors, at least: it keeps the ground from going black. */
const NIGHT_SKY = 1.45;

/** Each chapter's light, in place of its place's (its `id` stays the place's, for the place's kits). */
const LOOKS: Record<string, PlaceLook> = {
  // At home on the storm evening: candlelight inside, and the dark storm beyond the deck.
  stormkvall: {
    ...PLACES.home,
    // Lamplight in the room: warm and low, but the room and the deck outside still read.
    grade: { ...PLACES.home.grade, tint: [1.05, 0.98, 0.95], exposure: 1.0, vignette: 0.32 },
    haze: { colour: '#262e42', near: 8, far: 76 },
    sky: { top: '#0b1220', middle: '#25304a', bottom: '#1c2232', glow: '#8fa0c4' },
    hemisphere: { sky: '#ffd7a4', ground: '#5a4230', intensity: 1.35 },
    sun: { colour: '#ffc488', intensity: 2.3, from: [-7, 5, -3] },
    fill: { colour: '#c8c4e8', intensity: 1.15 },
  },
  stormgard: {
    ...PLACES.garden,
    grade: grade(0.92, 0.86, [0.86, 0.95, 1.12]),
    haze: { colour: '#2c3a54', near: 5, far: 58 },
    sky: { top: '#0b1324', middle: '#2b3a58', bottom: '#1e2a3e', glow: '#91a6cc' },
    hemisphere: { sky: '#8ea2d2', ground: '#34402e', intensity: NIGHT_SKY },
    sun: { colour: '#c4d2ff', intensity: 1.7, from: [-6, 6, -3] },
    fill: { colour: '#a8bce8', intensity: STORM_FILL },
    water: { colour: '#34506e', opacity: 0.86, face: 1.8 },
    tussock: '#55663f',
  },
  stormskog: {
    ...PLACES.forest,
    grade: grade(0.98, 0.84, [0.86, 0.97, 1.1]),
    haze: { colour: '#22333a', near: 4, far: 50 },
    sky: { top: '#081218', middle: '#203238', bottom: '#18262a', glow: '#8fb2b8' },
    hemisphere: { sky: '#86a6b8', ground: '#2c3a24', intensity: NIGHT_SKY },
    sun: { colour: '#c0d6ff', intensity: 1.6, from: [-7, 5, -4] },
    fill: { colour: '#a4c0e0', intensity: STORM_FILL },
    water: { colour: '#33565e', opacity: 0.86, face: 1.8 },
    tussock: '#56663c',
  },
  stormbyn: {
    ...PLACES.village,
    // The power is out: no street lamp, and the walls only as pale as a night lets them be. It was the darkest
    // place of all (half its play picture near black): the street and the figures now read as the others' do.
    grade: grade(0.9, 0.88, [0.92, 0.95, 1.1]),
    haze: { colour: '#2a3246', near: 7, far: 80 },
    sky: { top: '#0c1222', middle: '#2c3650', bottom: '#2a2c38', glow: '#b0a6c4' },
    hemisphere: { sky: '#8c9cc8', ground: '#34343a', intensity: NIGHT_SKY },
    sun: { colour: '#c4d0f4', intensity: 1.1, from: [-8, 3.4, -4] },
    fill: { colour: '#a8b8e8', intensity: STORM_FILL * 0.85 },
    water: { colour: '#34425a', opacity: 0.88, face: 1.6 },
    tussock: '#5a5a58',
  },
  flarken: {
    ...PLACES.bog,
    // A lake's shore, not a bog: the same islands in the water, in worn grass and with none of the red moss.
    ground: 'shore',
    far: 'lake',
    noSun: true,
    grade: grade(1.0, 0.84, [0.9, 0.96, 1.08]),
    haze: { colour: '#3c5068', near: 8, far: 90 },
    sky: { top: '#101c30', middle: '#34496a', bottom: '#465e7c', glow: '#c0d2e6' },
    hemisphere: { sky: '#90a8d0', ground: '#3a3a2e', intensity: NIGHT_SKY },
    sun: { colour: '#c8d6ff', intensity: 1.6, from: [-8, 4, -4] },
    fill: { colour: '#a8bce4', intensity: STORM_FILL },
    // Dark lake water, but not ink: under it, in his bubble, he still sees the bed and the stones.
    water: { colour: '#2c4560', opacity: 0.84, face: 2.2 },
    tussock: '#6a6c4c',
  },
  // The new worlds' first light, until their own is set: the football pitch, the river and Billsta at night.
  olympia: {
    ...PLACES.garden,
    // A clearing cut out of a forested hill: the forest stands right behind the stand, and no garden.
    far: 'wall',
    farBeyond: -70,
    grade: grade(0.94, 0.98, [0.98, 1.0, 0.98]),
    // Thin haze: the hall and the stand are what this place is, and they stand well back.
    haze: { colour: '#2a3a38', near: 22, far: 150 },
    sky: { top: '#081416', middle: '#20383a', bottom: '#2a4444', glow: '#a4ccc0' },
    hemisphere: { sky: '#c0bcb0', ground: '#3c4430', intensity: 1.15 },
    sun: { colour: '#f0dcc8', intensity: 2, from: [-4, 5, 6] },
    // The pitch was never dark (its low moon stands in front): it keeps the storm's first fill.
    fill: { colour: '#d4c8bc', intensity: 1.8 },
    water: { colour: '#34506e', opacity: 0.86, face: 1.8 },
    tussock: '#55663f',
  },
  alven: {
    ...PLACES.forest,
    // Ridges and hay meadows, and the river's own black water.
    far: 'river',
    farBeyond: -70,
    grade: grade(1.0, 0.84, [1.0, 0.98, 0.9]),
    haze: { colour: '#2a3226', near: 10, far: 120 },
    sky: { top: '#0e120c', middle: '#2c3426', bottom: '#384230', glow: '#b4b890' },
    hemisphere: { sky: '#a0a88c', ground: '#34382a', intensity: NIGHT_SKY },
    sun: { colour: '#dcd4b0', intensity: 1.6, from: [-7, 5, -4] },
    fill: { colour: '#c0c4a4', intensity: STORM_FILL },
    // The river's black water, dark brown-green rather than ink, so that under it the bed still shows.
    water: { colour: '#22363a', opacity: 0.86, face: 2.2 },
    tussock: '#56663c',
  },
  billsta: {
    ...PLACES.garden,
    // By the road near the forest: spruce behind the house, and no other garden's house far off.
    far: 'billaberget',
    farBeyond: -70,
    grade: grade(0.98, 0.92, [0.96, 0.95, 1.08]),
    haze: { colour: '#2a2e50', near: 16, far: 170 },
    sky: { top: '#0c0e26', middle: '#2a2e58', bottom: '#38385e', glow: '#b4b0dc' },
    hemisphere: { sky: '#a8acd0', ground: '#3c3e48', intensity: NIGHT_SKY },
    sun: { colour: '#d4d6f4', intensity: 1.75, from: [-6, 6, -3] },
    fill: { colour: '#bcc0e0', intensity: STORM_FILL },
    water: { colour: '#344c6c', opacity: 0.86, face: 1.8 },
    tussock: '#56663f',
  },
  stormoga: {
    ...PLACES.bog,
    ground: 'shore',
    noSun: true,
    grade: grade(0.98, 0.9, [0.88, 0.96, 1.14]),
    haze: { colour: '#1e2c48', near: 6, far: 80 },
    sky: { top: '#060c1e', middle: '#1c2a4c', bottom: '#2a3454', glow: '#d8e2ff' },
    hemisphere: { sky: '#9cb0e6', ground: '#3a3c48', intensity: NIGHT_SKY },
    // The moon, low over the lake, behind the stone; its light off the calm water lifts what faces him.
    sun: { colour: '#dfe6ff', intensity: 1.9, from: [-6, 4, -6] },
    fill: { colour: '#b4c4f0', intensity: 1.6 },
    water: { colour: '#26385c', opacity: 0.86, face: 2.0 },
    tussock: '#5c6050',
  },
  morgonen: {
    ...PLACES.home,
    // Sunday after the storm: the air washed clear, a cool bright light through the windows.
    grade: { ...PLACES.home.grade, tint: [1.02, 1.01, 0.98], exposure: 1.07, saturation: 1.08 },
    sun: { ...PLACES.home.sun, intensity: 3.3 },
  },
};
/** The night's tint on what no lamp lights: the painted far scenery, the soft foreground. `calm`: the storm's eye. */
const TINT: Record<string, readonly [number, number, number]> = {
  stormkvall: [0.42, 0.46, 0.62], stormgard: [0.3, 0.34, 0.48], stormskog: [0.42, 0.48, 0.58], stormbyn: [0.5, 0.52, 0.64],
  olympia: [0.42, 0.56, 0.56], flarken: [0.54, 0.6, 0.74], alven: [0.5, 0.5, 0.42], billsta: [0.5, 0.48, 0.74], stormoga: [0.42, 0.46, 0.64], calm: [0.58, 0.64, 0.88],
};
/** How much of the painted far scenery shows through the storm's dark: the backdrop is dimmed to night. */
const DIM: Record<string, number> = { stormkvall: 0.34, stormgard: 0.42, stormskog: 0.36, stormbyn: 0.46, olympia: 0.42, flarken: 0.4, alven: 0.38, billsta: 0.44, stormoga: 0.38 };

// --- the storm -------------------------------------------------------------------------------------------------

const RAIN_MAX = 420;
const RAIN_FOR = { low: 150, mid: 290, high: RAIN_MAX } as const;
/** The box of rain round the camera: how wide, how tall, and from how far behind the play plane to how near. */
const BOX = { x: 34, y: 22, back: -8, front: 4 };
/** How near the play plane the camera comes in play, at the least: nearer than this, the box goes with it. */
const RAIN_OUT = 6;

/** The flag at which the storm blows the window open: the gust in Stormkvällen's `fonstret`. */
const WINDOW_BURST = 'gust';
/** How far, in radians, its halves stand open in the wind, and how far they bang to and fro. */
const WINDOW_OPEN = 1.1;
const WINDOW_FLAP = 0.24;

/**
 * The window the storm blows open (`house.opens`): its two halves, hinged at the jambs, open outward as Swedish
 * windows do, through the opening in the wall (src/render/dressing/built.ts). While the hook holds they rattle now
 * and then. At the gust they fly open, overshoot and bang to and fro in the wind, and the hook hangs loose; when
 * the decor's `until` flag is set (Pappa shuts it) they swing to, and the hook is on again. With less motion they
 * only stand open. A game taken up later finds them as the story left them. `story` is where it reads the flags and
 * whether the picture keeps still: the storm's own, set every frame.
 */
export function casement(spot: Spot, story: { readonly flags: ReadonlySet<string> | null; readonly still: boolean } = elof): SpotProp {
  const root = new Group();
  root.position.set(spot.at.x, spot.at.y, -9.05);
  const wide = 2.55, tall = 5.2;
  const paint = solid('#c3b498', 0.82);
  // The storm's own pane, put on it with the room's other windows' glass by name, and lit by the same flashes.
  const glass = new MeshBasicMaterial({ name: 'window-glass', fog: false });
  const brass = solid('#c8a040', 0.35, { metalness: 0.6 });
  const halves = [-1, 1].map((side) => {
    // The left half hangs at the left jamb and reaches right, and the other way round.
    const hinge = new Group();
    hinge.position.x = side * wide;
    const reach = -side;
    const parts = [
      new BoxGeometry(0.16, tall, 0.1).translate(reach * 0.08, 0, 0),
      new BoxGeometry(0.16, tall, 0.1).translate(reach * (wide - 0.08), 0, 0),
      new BoxGeometry(wide, 0.16, 0.1).translate(reach * wide / 2, tall / 2 - 0.08, 0),
      new BoxGeometry(wide, 0.16, 0.1).translate(reach * wide / 2, -tall / 2 + 0.08, 0),
      new BoxGeometry(wide, 0.08, 0.06).translate(reach * wide / 2, 0, 0),
    ];
    hinge.add(new Mesh(mergeGeometries(parts), paint));
    parts.forEach((part) => part.dispose());
    const pane = new PlaneGeometry(wide - 0.2, tall - 0.2).translate(reach * wide / 2, 0, -0.01);
    // Each half shows its half of the first window's part of the storm, as the room's other panes do.
    const uv = pane.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + (side > 0 ? 1 : 0)) / 6);
    hinge.add(new Mesh(pane, glass));
    root.add(hinge);
    return { hinge, side, angle: 0, speed: 0, phase: side > 0 ? 1.7 : 0 };
  });
  // The window hook, on the left half's meeting edge: across onto the right half while it holds.
  const hook = new Group();
  hook.position.set(-0.04, 0.35, 0.09);
  const bar = new Mesh(new BoxGeometry(0.5, 0.05, 0.05).translate(0.25, 0, 0), brass);
  hook.add(bar);
  halves[0]!.hinge.add(hook);
  hook.position.x += wide;
  let known = false;
  return {
    group: root,
    update(used, clock, dt) {
      const flags = story.flags;
      if (!flags) return;
      const burst = flags.has(WINDOW_BURST);
      const open = burst && !used;
      const still = story.still;
      for (const half of halves) {
        const want = open ? WINDOW_OPEN + (still ? 0 : WINDOW_FLAP * Math.sin(clock * 2.3 + half.phase) + 0.08 * Math.sin(clock * 5.3 + half.phase)) : 0;
        if (!known || still) {
          half.angle = want;
          half.speed = 0;
        } else {
          // A spring that overshoots as it flies open, and settles without a bounce as it is pulled to.
          const stiff = open ? 60 : 30, damping = open ? 4.5 : 2 * Math.sqrt(30);
          for (let left = Math.min(dt, 0.1); left > 0; left -= 0.02) {
            const step = Math.min(0.02, left);
            half.speed += ((want - half.angle) * stiff - half.speed * damping) * step;
            half.angle += half.speed * step;
          }
          if (!open && half.angle < 0) { half.angle = 0; half.speed = 0; }
        }
        // While the hook holds, a shudder now and then in the strongest gusts.
        const rattle = burst || still ? 0 : 0.015 * Math.abs(Math.sin(clock * 19 + half.phase)) * Math.max(0, Math.sin(clock * 0.9)) ** 8;
        half.hinge.rotation.y = -half.side * (half.angle + rattle);
      }
      hook.rotation.z = open ? -1.35 + (still ? 0 : 0.18 * Math.sin(clock * 3.1)) : 0;
      known = true;
    },
  };
}

/** The night sky in a window during the storm: dark cloud, and rain running down the glass. */
function stormPane(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 96;
  canvas.height = 64;
  const c = canvas.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 64);
  sky.addColorStop(0, '#0e1628');
  sky.addColorStop(0.7, '#26324a');
  sky.addColorStop(1, '#1a2232');
  c.fillStyle = sky;
  c.fillRect(0, 0, 96, 64);
  const r = scatter(41);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(200,215,255,${0.08 + r() * 0.14})`;
    c.fillRect(r() * 96, r() * 64, 0.8, 4 + r() * 8);
  }
  // The far tree line, darker than the sky.
  c.fillStyle = '#0a101c';
  c.beginPath();
  c.moveTo(0, 64);
  for (let x = 0; x <= 96; x += 4) c.lineTo(x, 48 - 6 * Math.abs(Math.sin(x * 0.21)) - 3 * Math.sin(x * 0.7));
  c.lineTo(96, 64);
  c.fill();
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** A jagged bolt, far behind: a ribbon of light that only shows in its own flash. */
function bolt(seed: number): Mesh {
  const r = scatter(seed);
  const positions: number[] = [];
  let x = 0;
  let y = 0;
  const width = 0.5;
  for (let i = 0; i < 9; i++) {
    const nx = x + (r() - 0.5) * 3.6;
    const ny = y - 2.4 - r() * 1.6;
    positions.push(x - width, y, 0, x + width, y, 0, nx - width, ny, 0, x + width, y, 0, nx + width, ny, 0, nx - width, ny, 0);
    x = nx;
    y = ny;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ color: '#e8eeff', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false, side: DoubleSide }));
  mesh.renderOrder = -1;
  return mesh;
}

/** The storm's night outside a lit house. */
const OUT_OF_DOORS = { sky: new Color('#7488b8'), ground: new Color('#2c3830'), sun: new Color('#a8bce8'), far: new Color('#6a7088') };
/** The chapters whose pools are rain water standing on a ground, with the rain's rings all over them. */
const PUDDLES = new Set(['olympia']);

/**
 * The storm round the camera. Its flashes are soft and seldom (Harding's rule: never more than three a second);
 * with less motion the rain hangs still and there are none.
 */
function stormExtra({ chapter, scene, hemisphere, sun }: ExtraContext): ViewExtra | null {
  playing.chapter = chapter;
  // The chapter's open water, for what swims in it (./beaver.ts).
  pools = chapter.water ?? [];
  course = chapter;
  // The owl rides of this chapter, and the flag that boards each: the spot that starts it.
  owlRides.length = 0;
  for (const ride of chapter.rides ?? []) {
    const boarding = ride.look === 'owl' ? chapter.spots?.find((spot) => spot.ride === ride.id) : undefined;
    if (boarding) owlRides.push({ flag: boarding.id, from: ride.from, to: ride.to, waits: null });
  }
  const storm = chapter.storm;
  const dim = DIM[chapter.id];
  if (!storm && dim === undefined) return null;
  const group = new Group();
  group.name = 'storm';
  scene.add(group);
  const random = scatter(chapter.id.length * 977);

  // Rain: thin pale streaks, slanting with the wind from the left.
  const rain = storm?.rain ?? 0;
  // Each streak is brightest at its head and fades along its tail, as a falling drop is seen (the graphics pass of
  // 6 November 2026: they were flat bars of one brightness), and each falls at its own length.
  const streak = new Uint8Array(4 * 32);
  for (let k = 0; k < 32; k++) {
    const along = k / 31;
    streak.set([255, 255, 255, Math.round(255 * Math.pow(along, 1.6) * (1 - Math.pow(along, 14)))], k * 4);
  }
  const streakMap = new DataTexture(streak, 1, 32);
  streakMap.magFilter = streakMap.minFilter = LinearFilter;
  streakMap.needsUpdate = true;
  const drops = new InstancedMesh(new PlaneGeometry(0.024, 0.95), new MeshBasicMaterial({ color: '#d8e3ff', map: streakMap, transparent: true, opacity: 0.3, depthWrite: false, fog: false }), RAIN_MAX);
  drops.instanceMatrix.setUsage(DynamicDrawUsage);
  drops.frustumCulled = false;
  drops.renderOrder = 4;
  const seeds = Array.from({ length: RAIN_MAX }, () => ({ x: random() * BOX.x, y: random() * BOX.y, z: BOX.back + random() * (BOX.front - BOX.back), speed: 13 + random() * 6, long: 0.55 + random() * 0.7 }));
  if (rain > 0) group.add(drops);
  // Where the rain lands round him: small rings that open and fade on the ground and the water, a few at a time
  // (the graphics pass of 6 November 2026). Added light, one draw; on Low none.
  const LANDINGS = 36;
  const landings = new InstancedMesh(new RingGeometry(0.05, 0.075, 16).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: '#ffffff', transparent: true, depthWrite: false, blending: AdditiveBlending, fog: false }), LANDINGS);
  landings.instanceMatrix.setUsage(DynamicDrawUsage);
  landings.instanceColor = new InstancedBufferAttribute(new Float32Array(LANDINGS * 3), 3);
  landings.instanceColor.setUsage(DynamicDrawUsage);
  landings.frustumCulled = false;
  landings.renderOrder = 4;
  landings.userData.rich = true;
  const landingSeeds = Array.from({ length: LANDINGS }, () => ({ x: random() * 16 - 8, z: -1.6 + random() * 2.4, phase: random(), every: 0.5 + random() * 0.6 }));
  if (rain > 0) group.add(landings);
  const landingTint = new Color();
  // Rain on the still water of a ground's puddles (Olympia's flooded goalmouth and centre circle): rings that open and
  // fade all over each, a few at a time, wherever he is, so that the water reads as water standing in the rain. The
  // landings near him fall on the ground under a pool, at its bottom. Added light, one draw; on Low none.
  const puddles = rain > 0 && PUDDLES.has(chapter.id) ? chapter.water ?? [] : [];
  const PUDDLE_RINGS = 8;
  const puddleRings = new InstancedMesh(landings.geometry, landings.material, Math.max(1, puddles.length * PUDDLE_RINGS));
  puddleRings.instanceMatrix.setUsage(DynamicDrawUsage);
  puddleRings.instanceColor = new InstancedBufferAttribute(new Float32Array(puddleRings.count * 3), 3);
  puddleRings.instanceColor.setUsage(DynamicDrawUsage);
  puddleRings.frustumCulled = false;
  puddleRings.renderOrder = 4;
  puddleRings.userData.rich = true;
  const puddleSeeds = puddles.flatMap((pool) => Array.from({ length: PUDDLE_RINGS }, () => ({
    pool, x: pool.from + 0.35 + random() * (pool.to - pool.from - 0.7), z: -1.6 + random() * 2, phase: random(), every: 0.7 + random() * 0.7,
  })));
  if (puddles.length) group.add(puddleRings);
  const place = new Object3D();
  const SLANT = 0.32;
  place.rotation.z = -SLANT * 0.6;

  // Lightning: a bolt far behind, the sky and the lights brightening with it.
  const bolts = [bolt(3), bolt(11)];
  for (const b of bolts) group.add(b);
  const base = { hemisphere: hemisphere.intensity, sun: sun.intensity };
  // A home with a door out into the storm: the room's warm lamps stay behind him, and the night has the light.
  const doorway = rain > 0 ? chapter.outdoors : undefined;
  const room = { sky: hemisphere.color.clone(), ground: hemisphere.groundColor.clone(), sun: sun.color.clone() };
  let nextFlash = (storm?.lightning ?? 0) * 0.5;
  let flashAt = -99;
  let flashBolt = 0;
  const flashOf = (since: number) => since < 0 ? 0 : Math.exp(-since * 7) * smooth(since / 0.04) + 0.55 * Math.exp(-Math.max(0, since - 0.22) * 9) * smooth((since - 0.18) / 0.04);

  // Figures blown across the sky: lit by their own flash. A flight meant to be watched (`lit`) is the figure itself,
  // its model where the pack has it, in a soft pale glow that brightens with each flash, tumbling about its middle.
  const flybys = (storm?.flybys ?? []).map((def) => {
    const lit = !!def.lit;
    const figure = (def.who === 'lillgubbe' ? littleFigure : oldFigure)(!lit);
    const holder = new Group();
    holder.name = `flyby:${def.on}`;
    holder.add(figure);
    holder.scale.setScalar(def.size ?? 1.2);
    // Floating down the water, the old one rides a log.
    if (def.who === 'tragubbe' && afloat(def)) {
      const log = new Mesh(new CylinderGeometry(0.22, 0.25, 2.2, 8), solid('#5a4632', 0.9));
      log.rotation.z = Math.PI / 2;
      log.position.y = -0.25;
      log.name = 'flyby-log';
      // The family's carving replaces this socket's stand-in; the log stays under its feet.
      log.userData.keep = 0;
      figure.add(log);
    }
    let halo: Mesh | null = null;
    if (lit) {
      figure.position.y = -FIGURE_MIDDLE[def.who];
      halo = glow('#dde4ff', 2.4, 0);
      halo.position.z = -0.3;
      holder.add(halo);
    }
    holder.visible = false;
    group.add(holder);
    return { def, figure: holder, halo, start: -1, seen: false, flashed: 0 };
  });

  // Someone seen far off (Olov, 9 November 2026: "Man ser inte lillgubben där ån börjar"): the carving itself, pale and
  // a little warm, standing on its stone in the water where a flash shows it, with a soft light about it so that it
  // reads against the dark lake, rings round the stone and the current going by. Drawn bigger than it is, for the
  // distance; a scene's shot looks out to it (the chapter's own business).
  const sightings = (storm?.sightings ?? []).map((def) => {
    const root = new Group();
    root.name = 'sighting';
    root.position.set(def.at.x, def.at.y, def.z);
    const size = def.size ?? 1;
    const stone = new Mesh(rock(def.at.x * 7, 0.95, 0.5, 0.8), solid('#363a40', 0.35));
    stone.position.y = -0.05;
    const figure = def.who === 'lillgubbe' ? littleFigure() : oldFigure();
    // Lit a little from within, as the meeting's pair are: pale wood that holds what light there is.
    figure.userData.warm = true;
    figure.traverse((node) => {
      const material = (node as Mesh).material as MeshStandardMaterial | undefined;
      if (material?.isMeshStandardMaterial) { material.emissive.set('#6a5236'); material.emissiveIntensity = 0.55; }
    });
    figure.scale.setScalar(size);
    figure.position.y = 0.4;
    const halo = glow('#dfe8ff', 2.6 * size, 0.42);
    halo.position.set(0, 0.4 + 0.35 * size, -0.5);
    const water = new MeshBasicMaterial({ color: '#cfe0f0', transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false });
    const rings = [0, 1].map(() => {
      const ring = new Mesh(new RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), water.clone());
      ring.position.y = 0.02;
      root.add(ring);
      return ring;
    });
    // The current going by on its way to the river: pale streaks on the water, past the stone and on. One draw; each
    // fades in and out by its colour, the light being added.
    const lanes = [0.55, -0.7, 0.95, -0.35];
    const streaks = new InstancedMesh(new PlaneGeometry(0.9, 0.05).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false, blending: AdditiveBlending, fog: false }), lanes.length);
    streaks.instanceMatrix.setUsage(DynamicDrawUsage);
    streaks.instanceColor = new InstancedBufferAttribute(new Float32Array(lanes.length * 3), 3);
    streaks.instanceColor.setUsage(DynamicDrawUsage);
    streaks.frustumCulled = false;
    root.add(stone, figure, halo, streaks);
    drawnWhile(root, false);
    group.add(root);
    return { def, root, figure, halo, rings, streaks, lanes, seen: false };
  });
  const streakAt = new Object3D();
  const streakTint = new Color();

  // Candles and lamps in windows: warm, a little alive.
  const glows = (storm?.glows ?? []).map((def, i) => {
    const light = glow('#ffc66e', def.size ?? 1.2, 0.85);
    light.position.set(def.at.x, def.at.y, def.z ?? -6);
    group.add(light);
    return { def, light, phase: i * 1.7 };
  });

  // A lamp shining on him from somewhere: Moa's from the window ("Jag lyser för dig från fönstret!").
  const beams = (storm?.beams ?? []).map((def) => {
    const lamp = litLamp();
    lamp.scale.setScalar(1.8);
    lamp.position.set(def.at.x, def.at.y, def.z);
    lamp.visible = false;
    group.add(lamp);
    return { def, lamp };
  });
  const beamAt = new Vector3();
  const BEAM_POINTS = new Vector3(0, 0, 1);

  // When the storm's eye opens: stars, and the moon over the water.
  const starGeometry = new BufferGeometry();
  const stars: number[] = [];
  for (let i = 0; i < 260; i++) stars.push((random() - 0.5) * 220, 6 + random() * 50, -95 - random() * 10);
  starGeometry.setAttribute('position', new Float32BufferAttribute(stars, 3));
  const starMaterial = new PointsMaterial({ color: '#f2f4ff', size: 0.55, transparent: true, opacity: 0, depthWrite: false, fog: false, sizeAttenuation: true });
  const starField = new Points(starGeometry, starMaterial);
  starField.frustumCulled = false;
  const moon = new Group();
  // Named: the light shafts of the visual upgrade find the moon by it (src/render/lift/atmosphere.ts).
  moon.name = 'moon';
  moon.add(new Mesh(new SphereGeometry(3.2, 24, 16), new MeshBasicMaterial({ color: '#f4f2e6', transparent: true, opacity: 0, fog: false })), glow('#c8d8ff', 26, 0));
  if (storm?.calm) group.add(starField, moon);
  let calm = 0;

  // The windows of a room in the storm show the storm, not the morning or the northern lights.
  const panes: MeshBasicMaterial[] = [];
  if (chapter.house && storm) {
    const pane = stormPane();
    scene.traverse((object) => {
      const material = (object as Mesh).material as MeshBasicMaterial | undefined;
      if (material?.name === 'window-glass' && !panes.includes(material)) {
        material.map = pane;
        material.needsUpdate = true;
        panes.push(material);
      }
    });
  }

  // The painted far scenery and the soft foreground are lit by no lamp: they are tinted to the night, the sun's
  // shafts all but put out, and they brighten with each flash. In a house only the far scenery beyond its windows.
  const night = new Color(...(TINT[chapter.id] ?? [1, 1, 1]));
  const eyeTint = new Color(...(TINT.calm ?? [1, 1, 1]));
  const unlit: { material: MeshBasicMaterial; base: Color; additive: boolean }[] = [];
  scene.getObjectByName('dressing')?.traverse((object) => {
    const material = (object as Mesh).material as MeshBasicMaterial | undefined;
    if (!material?.isMeshBasicMaterial || material.name === 'window-glass' || unlit.some((u) => u.material === material)) return;
    // In a house, only what lies out of doors: the far scenery, and the garden beyond the corner.
    if (chapter.house && !object.name.startsWith('far-') && !(chapter.outdoors !== undefined && new Box3().setFromObject(object).min.x >= chapter.outdoors - 1)) return;
    unlit.push({ material, base: material.color.clone(), additive: material.blending === AdditiveBlending });
  });
  const tint = new Color();

  // The big things standing behind the play plane: houses, a barn, goals, masts, a diving tower (./buildings.ts).
  const buildings = (storm?.buildings ?? []).map((def) => {
    const made = building(def);
    group.add(made.group);
    return made;
  });

  // A bathing raft moored in the bay rocks and drags at its moorings: the tower stands on it.
  // The family's stand-up paddle board, paddled in (Olov, 6 November 2026: in place of a rowboat). Whoever paddles
  // stands on it and goes with it.
  const boat = storm?.boat ? paddleBoard() : null;
  if (boat) group.add(boat);
  let rowed = 0;
  const standAt = new Vector3();

  const rocking = buildings.filter((_, i) => storm?.buildings?.[i]?.kind === 'tower').map((made) => ({ made, y: made.group.position.y }));

  const drift = createFoam(storm?.foam, group);


  // Cones shaken from the spruces fall where the chapter's drips are: brown and scaled, no splash.
  const coneDrops = storm?.drips === 'cone' ? scene.getObjectByName('rain-drops') as InstancedMesh | undefined : undefined;
  const splashes = ['rain-rings', 'rain-beads'].map((name) => scene.getObjectByName(name)).filter((o): o is Object3D => !!o);
  if (coneDrops) {
    const scales: Vector2[] = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      scales.push(new Vector2(Math.sin(Math.PI * t) * 0.17 * (1 - 0.35 * t) + 0.01, -0.34 + t * 0.7));
    }
    coneDrops.geometry.dispose();
    coneDrops.geometry = new LatheGeometry(scales, 9);
    coneDrops.material = solid('#6a4428', 0.9, { flatShading: true });
    coneDrops.userData.cones = true;
    coneDrops.userData.disposeFallback = true;
  }
  // Footballs bowled along by the wind, where the chapter's rollers are: round, and patched.
  const balls = storm?.rollers === 'football' ? scene.getObjectByName('rollers') as InstancedMesh | undefined : undefined;
  if (balls) {
    balls.geometry = footballGeometry().scale(1, 1, 1 / 1.9);
    balls.material = footballMaterial();
  }
  // The bouncers as what they are here: the garden's trampoline, or the striped flap of an awning.
  if (storm?.bouncers) {
    for (const holder of scene.children.filter((child) => child.name === 'bouncer')) {
      holder.clear();
      holder.add(storm.bouncers === 'trampoline' ? trampoline() : storm.bouncers === 'net' ? saggingNet() : awningFlap());
    }
  }

  // A figure seen far out in the lake stands on a stone of its own, dark and wet, the waves round it: as big as the figure
  // is drawn, its top under its feet.
  for (const d of (chapter.water ?? []).length > 0 ? chapter.decor ?? [] : []) {
    if ((d.look !== 'tragubbe' && d.look !== 'lillgubbe') || (d.z ?? 0) > -6) continue;
    const size = d.scale ?? 1;
    const rock = new Mesh(new SphereGeometry(1.4, 12, 8), solid('#3c4048', 0.9, { flatShading: true }));
    rock.scale.set(1.3 * size, 0.55 * size, size);
    rock.position.set(d.at.x, d.at.y - (size === 1 ? 0.45 : 0.72 * size), d.z ?? 0);
    group.add(rock);
  }

  // The gusts' shelters as what they are here: upturned flower pots on the lawn, or the jetty's posts.
  // (The boulders they stand in for join the scene after this is built: they are put away on the first frame.)
  const shelterOf = (i: number) => (Array.isArray(storm?.shelters) ? storm.shelters[i] ?? 'stones' : storm?.shelters ?? 'stones');
  for (const [i, gust] of (chapter.gusts ?? []).entries()) {
    const kind = shelterOf(i);
    if (kind !== 'stones') for (const x of gust.shelters) group.add(kind === 'pots' ? flowerPot(x, gust.y) : kind === 'vents' ? roofVent(x, gust.y) : kind === 'rocks' ? boulder(x, gust.y) : jettyPost(x, gust.y));
  }

  // The car that goes by behind the street, in the rain.
  const passing = scene.getObjectByName('passing-car');
  if (passing) {
    passing.userData.model = 'bil-gra';
    passing.userData.fit = 3.8;
    passing.userData.lift = -0.45;
  }
  // The rain barrel and the watering can stand on the lawn, their tops where the outline has them.
  for (const [look, model] of [['barrel', 'tunna'], ['can', 'kanna'], ['playhouse', 'lekstuga'], ['slide', 'rutschkana'], ['picnic', 'picknick'], ['fence', 'staket'], ['stairs', 'trappa'], ['woodpile', 'vedstapel'], ['skerry', 'holme'], ['edging', 'rabatt']] as const) {
    for (const holder of scene.getObjectsByProperty('name', `landmark:${look}`)) {
      const mark = chapter.landmarks?.find((one) => one.look === look && one.from === holder.position.x);
      if (mark && look === 'skerry') {
        // A continuous worn surface replaces the export's stacked shelves and overlapping crack strips.
        // Keep the chapter's exact walking top; only the surrounding silhouette and water are pictures.
        for (const child of holder.children) child.traverse((object) => {
          if (!(object instanceof Mesh)) return;
          object.geometry.dispose();
          for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose();
        });
        holder.clear();
        holder.position.y = 0;
        const water = chapter.water?.find((pool) => pool.to === mark.from || pool.from === mark.to)?.y ?? -0.5;
        holder.add(moonstone(mark.to - mark.from, heightAt(chapter, (mark.from + mark.to) / 2), water));
        continue;
      }
      holder.userData.model = model;
      // A barrel and a can stand round their middles; the others are measured from their near edge.
      if (mark && (look === 'barrel' || look === 'can')) holder.userData.shift = (mark.to - mark.from) / 2;
      // Behind the porch, the house itself, as the family's garden has it.
      if (look === 'playhouse') {
        const house = new Group();
        house.position.copy(holder.position);
        house.userData.model = 'lekstuga-hus';
        holder.parent?.add(house);
      }
    }
  }
  // Boulders that are blocks of the ground (landmarks), where no kit of the place draws them: faceted granite in
  // place of the plain box that stands in for them. The forest's kit has its own stones and is left to them.
  if (chapter.place !== 'forest' || chapter.river) {
    for (const holder of scene.getObjectsByProperty('name', 'landmark:stone')) {
      const box = holder.children.find((child): child is Mesh => child instanceof Mesh && child.geometry instanceof BoxGeometry);
      if (!box) continue;
      const { width, height } = (box.geometry as BoxGeometry).parameters;
      // Until the kit's has come: faceted granite. It takes one of the kit's boulders, filling the block.
      holder.userData.model = ['block-a', 'block-b', 'block-c'][Math.abs(Math.round(holder.position.x)) % 3]!;
      // Its back stands up behind the path, and its front goes down into the ground: he walks on the ground's own top.
      holder.userData.block = chapter.river && holder.position.y < 0 ? { width: width * 1.34, height: 2.6, depth: Math.max(4, width * 0.8), x: box.position.x, y: height - 0.55, z: -1.5 } : { width: width * 1.2, height: height * 1.5, depth: Math.max(3.5, width * 0.8), x: box.position.x, y: height * 0.65, z: -2.4 };
      box.geometry.dispose();
      box.geometry = rock(Math.round(holder.position.x * 10), width / 2 * 1.08, height / 2 * 1.04, 1.8);
      box.material = solid('#8c9096', 0.95, { flatShading: true });
    }
  }

  // Open water past the path: dark, a little glossy, catching the flashes.
  for (const lake of storm?.lakes ?? []) {
    const near = lake.near ?? -4;
    const depth = 120;
    const sheet = new Mesh(new PlaneGeometry(lake.to - lake.from, depth), solid('#1a2a3c', 0.22, { metalness: 0.2 }));
    sheet.rotation.x = -Math.PI / 2;
    sheet.position.set((lake.from + lake.to) / 2, lake.y, near - depth / 2);
    sheet.name = 'lake';
    group.add(sheet);
  }

  // Klonk, frozen stiff in Pappa's beam, lying across the gap as a plank.
  const frozenLedge = storm?.frozen ? chapter.ledges?.find((ledge) => ledge.needs === storm.frozen) : undefined;
  let frozenKlonk: Object3D | null = null;
  let crossed = false;
  const planks: Object3D[] = [];
  if (frozenLedge) scene.traverse((object) => { if (object.name.startsWith('ledges:') && object.name.endsWith(':plank')) planks.push(object); });

  // A goal's crossbar as what it is: white, round-cornered steel, joined to the frame that runs back into the picture.
  if (storm?.bars === 'goal') {
    scene.traverse((object) => {
      if (!(object instanceof Mesh) || !/^ledges:\d+$/.test(object.name) || object.userData.rods) return;
      const at = (object.userData.ledges as number[]).map((i) => chapter.ledges![i]!);
      object.geometry.dispose();
      object.geometry = mergeGeometries(at.map((ledge) => box(ledge.width, 0.3, 0.6, ledge.x, ledge.y - 0.15, -0.25, '#f4f4f0')));
      object.geometry.computeBoundingSphere();
    });
  }

  // Pappa's scarf from the bridge is drawn with the family who hold it (../../render/scarf.ts).

  const owlWings: Object3D[] = [];
  let first = true;
  /** The owl that carries him; the ride it is carrying him on, when it took him and set him down, and where. */
  let ridden: Object3D | null = null;
  let carrying: (typeof owlRides)[number] | null = null;
  let boardedAt = 0, landedAt = -1;
  const setDown = new Vector3(), owlStart = new Vector3();
  return {
    update({ dt, clock, flags, x, y, camera, still, tier, riding }: ExtraFrame) {
      elof.x = x;
      elof.flags = flags;
      elof.still = still;
      drift?.(dt, still);
      // The owl's slow, deep beats, wherever it flies: wide over the water and a little under him. Its downstroke is
      // the slower, and between bursts it glides on wings held near level (a positive turn lowers its wings).
      const beat = still ? 0.2 : 0.2 - 0.5 * wingbeat(clock, 0.86, { every: 7, glide: 1.8, held: 0.3 }).lift;
      for (const wing of owlWings) wing.rotation.x = beat * (wing.userData.side as number);
      if (boat && storm?.boat) {
        const { from, to, y, after, spot } = storm.boat;
        if (elof.flags?.has(after)) rowed = Math.min(1, rowed + dt / 1.4);
        const way = rowed * rowed * (3 - 2 * rowed);
        const bob = still ? 0 : Math.sin(clock * 1.2) * (0.06 - 0.05 * way);
        boat.position.set(from.x + (to.x - from.x) * way, y + bob, from.z + (to.z - from.z) * way);
        boat.rotation.y = (1 - way) * 0.7;
        // Whoever paddles stands on its back half, behind the line he walks, facing its nose, the paddle on the far side.
        const rower = scene.getObjectByName(`spot:${spot}`);
        standAt.set(1.5, BOARD.top, -0.6).applyAxisAngle(UP, boat.rotation.y).add(boat.position);
        rower?.position.copy(standAt);
        rower?.rotation.set(0, boat.rotation.y + Math.PI / 2, 0);
        // The board tips a hair under her weight and with the swell.
        boat.rotation.z = still ? 0 : Math.sin(clock * 1.1) * 0.012 * (1 - 0.6 * way);
        boat.rotation.x = still ? 0 : Math.sin(clock * 0.8 + 1) * 0.01 + 0.012;
      }
      // A loose corner of the tarp over the rowing boat lifts in the gusts and flaps, and falls back between them.
      for (const [i, made] of buildings.entries()) {
        const flap = made.group.userData.flap as Object3D | undefined;
        if (!flap) continue;
        const gust = Math.max(0, Math.sin(clock * 0.47 + i * 2.1)) ** 3;
        flap.rotation.x = still ? -0.08 : -(0.08 + 0.05 * Math.sin(clock * 1.9 + i) + gust * (0.55 + 0.2 * Math.sin(clock * 11 + i)));
      }
      for (const [i, raft] of rocking.entries()) {
        raft.made.group.position.y = raft.y + (still ? 0 : Math.sin(clock * 0.9 + i) * 0.09);
        raft.made.group.rotation.z = still ? 0 : Math.sin(clock * 0.63 + i) * 0.018;
      }
      if (first) {
        scene.traverse((object) => { if (object.name === 'owl-wing') owlWings.push(object); });
        // A flyby whose moment has passed already (a game taken up later) is not played again.
        for (const f of flybys) if (flags.has(f.def.on)) f.seen = true;
        for (const s of sightings) if (flags.has(s.def.on)) s.seen = true;
        // The boulders the gusts' shelters stand in for are put away, where something else is drawn: one mesh a gust.
        for (const [i, stone] of scene.getObjectsByProperty('name', 'shelters').entries()) if (shelterOf(i) !== 'stones') stone.visible = false;
        // The garden's far pictures are drawn by day: beyond the door they are the same garden in the storm's night.
        if (doorway !== undefined) {
          scene.traverse((object) => {
            if (!object.name.startsWith('far-')) return;
            const seen = unlit.find((u) => u.material === (object as Mesh).material);
            seen?.base.multiply(OUT_OF_DOORS.far);
          });
        }
        ridden = scene.getObjectByName('owl-ridden') ?? null;
        first = false;
      }
      // The owl he climbs onto carries him. The view draws the ride's owl under him (../../render/view.ts); here it lifts
      // him from where it waited, its wings opening as it grows from a sitting owl's size to its own, and when it has set
      // him down it flies on and away, instead of coming out of nothing and shrinking away again under him.
      if (ridden && owlRides.length > 0) {
        const ride = riding ? owlRides.find((r) => x >= r.from.x - 0.5 && x <= r.to.x + 0.5) : undefined;
        if (ride && ride !== carrying) { carrying = ride; boardedAt = clock; landedAt = -1; }
        if (!ride && carrying && landedAt < 0) { landedAt = clock; setDown.copy(ridden.position); }
        if (ride) {
          const k = still ? 1 : smooth((clock - boardedAt) / 0.45);
          ridden.scale.setScalar(SITTING_SIZE + (1 - SITTING_SIZE) * k);
          if (ride.waits && k < 1) {
            owlStart.set(ride.waits.x, ride.waits.y + SITTING_LIFT - 0.5 * SITTING_SIZE, ride.waits.z);
            ridden.position.lerp(owlStart, 1 - k);
          }
          drawnWhile(ridden, true);
        } else if (carrying && landedAt >= 0) {
          const k = still ? 1 : (clock - landedAt) / 1.8;
          if (k < 1) {
            ridden.position.set(setDown.x + k * 6 + k * k * 4, setDown.y + k * 1.2 + k * k * 8, setDown.z);
            ridden.rotation.z = 0.3 * smooth(k * 3);
            ridden.scale.setScalar(1);
          }
          drawnWhile(ridden, k < 1);
        }
      }
      const calmFlag = storm?.calm;
      calm = Math.min(1, Math.max(0, calm + ((calmFlag && flags.has(calmFlag)) ? dt : -dt) / 3));
      if (still && calmFlag && flags.has(calmFlag)) calm = 1;
      const cx = camera.position.x;
      const cy = camera.position.y;
      // Where a scene's shot takes the camera out beyond the play plane (to the stone in Billsta's narrow), the rain goes
      // out with it, still falling in front of it.
      const cz = Math.min(0, camera.position.z - RAIN_OUT);

      // The rain falls through its box and starts again at the top; the box goes with the camera.
      const count = rain > 0 ? Math.round(RAIN_FOR[tier] * rain * (1 - calm)) : 0;
      drops.count = count;
      drawnWhile(drops, count > 0);
      if (count > 0) {
        const t = still ? 0 : clock;
        for (let i = 0; i < count; i++) {
          const s = seeds[i]!;
          const fall = (s.y + t * s.speed) % BOX.y;
          const x = ((s.x + fall * SLANT - cx) % BOX.x + BOX.x) % BOX.x;
          place.position.set(cx - BOX.x / 2 + x, cy + BOX.y / 2 - fall, s.z + cz);
          // No rain falls indoors: only out of doors, beyond the house's corner.
          const out = chapter.outdoors !== undefined && place.position.x < chapter.outdoors ? 0 : 1;
          place.scale.set(out, out * s.long, out);
          place.updateMatrix();
          drops.setMatrixAt(i, place.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
        (drops.material as MeshBasicMaterial).opacity = 0.42 * (1 - calm) * (0.6 + 0.4 * rain);
      }
      // The landings: each opens over a short while, fades, and lands again somewhere else near him.
      const landing = rain > 0 && count > 0 && tier !== 'low';
      drawnWhile(landings, landing);
      if (landing) {
        const t = still ? 0 : clock;
        for (let i = 0; i < LANDINGS; i++) {
          const s = landingSeeds[i]!;
          const round = (t / s.every + s.phase);
          const k = round - Math.floor(round);
          const where = Math.floor(round) * 7.31 + i * 3.7;
          const x = cx + s.x + Math.sin(where) * 2.5;
          const out = chapter.outdoors !== undefined && x < chapter.outdoors;
          place.position.set(x, heightAt(chapter, x) + 0.02, s.z + Math.cos(where) * 0.4);
          place.rotation.set(0, 0, 0);
          place.scale.setScalar(out ? 0 : 0.8 + k * 3.2);
          place.updateMatrix();
          landings.setMatrixAt(i, place.matrix);
          const light = (1 - k) * (1 - k) * 0.9 * (1 - calm) * rain;
          landings.setColorAt(i, landingTint.setRGB(light * 0.85, light * 0.9, light));
        }
        place.rotation.set(0, 0, -SLANT * 0.6);
        landings.instanceMatrix.needsUpdate = true;
        landings.instanceColor!.needsUpdate = true;
      }
      const puddling = puddles.length > 0 && rain > 0 && tier !== 'low';
      drawnWhile(puddleRings, puddling);
      if (puddling) {
        const t = still ? 0 : clock;
        place.rotation.set(0, 0, 0);
        for (const [i, s] of puddleSeeds.entries()) {
          const round = t / s.every + s.phase;
          const k = round - Math.floor(round);
          const where = Math.floor(round) * 5.17 + i * 2.3;
          const x = Math.min(s.pool.to - 0.3, Math.max(s.pool.from + 0.3, s.x + Math.sin(where) * 0.6));
          place.position.set(x, s.pool.y + 0.015, s.z + Math.cos(where) * 0.3);
          place.scale.setScalar(0.7 + k * 2.6);
          place.updateMatrix();
          puddleRings.setMatrixAt(i, place.matrix);
          const light = (1 - k) * (1 - k) * 0.8 * (1 - calm) * rain;
          puddleRings.setColorAt(i, landingTint.setRGB(light * 0.85, light * 0.9, light));
        }
        place.rotation.set(0, 0, -SLANT * 0.6);
        puddleRings.instanceMatrix.needsUpdate = true;
        puddleRings.instanceColor!.needsUpdate = true;
      }

      // Lightning, now and then; and one at every flyby's moment, and again through a flight meant to be watched.
      for (const f of flybys) {
        const again = f.def.lit ?? [];
        const due = !f.seen ? flags.has(f.def.on) : f.flashed < again.length && clock - f.start >= again[f.flashed]!;
        if (!due) continue;
        if (f.seen) f.flashed++;
        else {
          f.seen = true;
          f.start = clock;
        }
        flashAt = clock;
        flashBolt = (flashBolt + 1) % bolts.length;
        bolts[flashBolt]!.position.set(cx + (random() - 0.5) * 30, cy + 22, -60);
      }
      // And one where someone is seen far off, behind them; then they stay, rocking on their stone in the current.
      for (const s of sightings) {
        const shown = flags.has(s.def.on) && !flags.has(s.def.until);
        if (shown && !s.seen) {
          s.seen = true;
          flashAt = clock;
          flashBolt = (flashBolt + 1) % bolts.length;
          bolts[flashBolt]!.position.set(s.def.at.x + (random() - 0.5) * 12, cy + 20, -60);
        }
        drawnWhile(s.root, shown);
        if (!shown) continue;
        s.figure.rotation.z = still ? 0 : Math.sin(clock * 1.6) * 0.07 + Math.sin(clock * 2.9 + 1) * 0.025;
        s.figure.position.y = 0.4 + (still ? 0 : Math.sin(clock * 1.3) * 0.03);
        (s.halo.material as MeshBasicMaterial).opacity = still ? 0.4 : 0.36 + 0.06 * Math.sin(clock * 1.7);
        for (const [i, ring] of s.rings.entries()) {
          const k = still ? 0.3 + 0.4 * i : (clock * 0.45 + i * 0.5) % 1;
          ring.scale.setScalar(0.9 + 1.6 * k);
          (ring.material as MeshBasicMaterial).opacity = 0.32 * (1 - k) * Math.min(1, k * 6);
        }
        for (const [i, z] of s.lanes.entries()) {
          const k = still ? 0.5 : (clock * 0.28 + i * 0.27) % 1;
          streakAt.position.set(-2.4 + 4.8 * k, 0.02, z);
          streakAt.updateMatrix();
          s.streaks.setMatrixAt(i, streakAt.matrix);
          s.streaks.setColorAt(i, streakTint.setScalar(Math.sin(Math.PI * k)));
        }
        s.streaks.instanceMatrix.needsUpdate = true;
        s.streaks.instanceColor!.needsUpdate = true;
      }
      if (!still && storm?.lightning && calm === 0 && clock >= nextFlash) {
        flashAt = clock;
        flashBolt = (flashBolt + 1) % bolts.length;
        nextFlash = clock + storm.lightning * (0.6 + 0.8 * random());
        bolts[flashBolt]!.position.set(cx + (random() - 0.5) * 30, cy + 22, -60);
      }
      const flash = still ? 0 : flashOf(clock - flashAt) * (1 - calm);
      bolts.forEach((b, i) => { (b.material as MeshBasicMaterial).opacity = i === flashBolt ? flash * 0.9 : 0; drawnWhile(b, i === flashBolt && flash > 0.01); });
      const out = doorway === undefined ? 0 : Math.min(1, Math.max(0, (camera.position.x - doorway + 2) / 8));
      if (doorway !== undefined) {
        hemisphere.color.lerpColors(room.sky, OUT_OF_DOORS.sky, out);
        hemisphere.groundColor.lerpColors(room.ground, OUT_OF_DOORS.ground, out);
        sun.color.lerpColors(room.sun, OUT_OF_DOORS.sun, out);
      }
      const baseHemisphere = (chapter.night ? hemisphere.intensity : base.hemisphere) * (1 - 0.3 * out);
      const baseSun = (chapter.night ? sun.intensity : base.sun) * (1 - 0.5 * out);
      hemisphere.intensity = baseHemisphere * (1 + 1.1 * flash + 0.25 * calm);
      sun.intensity = baseSun * (1 + 0.8 * flash + 0.3 * calm);
      if (dim !== undefined) scene.backgroundIntensity = Math.min(1, dim + 0.14 * calm + 0.6 * flash);
      for (const pane of panes) pane.color.setScalar(1 + 1.6 * flash);
      tint.copy(night).lerp(eyeTint, storm?.calm ? calm : 0).multiplyScalar(1 + 1.3 * flash);
      for (const u of unlit) u.material.color.copy(u.base).multiply(tint).multiplyScalar(u.additive ? 0.25 : 1);

      for (const f of flybys) {
        const k = f.start < 0 ? 1 : (clock - f.start) / f.def.seconds;
        f.figure.visible = k < 1 && f.start >= 0;
        if (!f.figure.visible) continue;
        // On the water a figure floats, bobbing along; in the air it tumbles across the sky.
        const floating = afloat(f.def);
        const at = flightAt(f.def, k);
        f.figure.position.set(at.x, at.y + (floating ? 0.12 * Math.sin(clock * 3) : 0), at.z);
        f.figure.rotation.z = still ? (floating ? 0 : 0.4) : floating ? Math.sin(clock * 2.2) * 0.25 : -k * 9;
        // Its glow comes up as the flash finds it, breathes with each flash, and goes as it is lost in the dark.
        if (f.halo) (f.halo.material as MeshBasicMaterial).opacity = (0.42 + 0.5 * flash) * smooth(k / 0.06) * (1 - smooth((k - 0.82) / 0.18));
      }
      for (const b of beams) {
        b.lamp.visible = x >= b.def.within[0] && x <= b.def.within[1];
        if (!b.lamp.visible) continue;
        beamAt.set(x, y + 0.4, 0).sub(b.lamp.position).normalize();
        b.lamp.quaternion.setFromUnitVectors(BEAM_POINTS, beamAt);
        b.lamp.getObjectByName('lamp-beam')!.visible = tier !== 'low';
      }
      for (const g of glows) {
        const lit = g.def.after === undefined || flags.has(g.def.after);
        g.light.visible = lit;
        (g.light.material as MeshBasicMaterial).opacity = still ? 0.8 : 0.72 + 0.12 * Math.sin(clock * 9 + g.phase) * Math.sin(clock * 3.1 + g.phase);
      }
      if (coneDrops) for (const splash of splashes) splash.visible = false;
      if (frozenLedge && storm?.frozen) {
        // Once he is over, Pappa looks away and Klonk is himself again, on the far side: on its flag, where it has one.
        if (flags.has(storm.frozen) && (storm.wakes ? flags.has(storm.wakes) : x > frozenLedge.x + frozenLedge.width / 2 + 0.8)) crossed = true;
        const lying = flags.has(storm.frozen) && !crossed;
        if (lying && !frozenKlonk) {
          const ghost = scene.getObjectByName('chase-ghost')?.children[0];
          if (ghost) {
            frozenKlonk = ghost.clone();
            const length = Math.max(1, frozenLedge.width / 1.15);
            frozenKlonk.scale.set(1, length, 1);
            frozenKlonk.rotation.set(0, 0, -Math.PI / 2);
            frozenKlonk.position.set(frozenLedge.x - frozenLedge.width / 2, frozenLedge.y + 0.02, 0.05);
            scene.add(frozenKlonk);
          }
        }
        if (frozenKlonk) {
          frozenKlonk.visible = lying;
          const ghostPlace = scene.getObjectByName('chase-ghost');
          if (ghostPlace && lying) ghostPlace.visible = false;
          // The plank the simulation stands him on is Klonk: its own picture is not drawn.
          for (const plank of planks) plank.visible = !lying && plank.visible;
        }
      }
      for (const b of buildings) {
        if (!b.panes) continue;
        const lit = b.def.lit !== undefined && (b.def.lit === '' || flags.has(b.def.lit));
        b.panes.color.copy(lit ? (b.def.kind === 'car' ? PANE.cabin : PANE.lit) : PANE.dark);
        if (lit && !still) b.panes.color.multiplyScalar(0.92 + 0.08 * Math.sin(clock * 2.1 + b.def.x));
      }
      starMaterial.opacity = calm;
      drawnWhile(starField, calm > 0);
      starField.position.x = cx * 0.85;
      moon.position.set(cx * 0.92 + 26, cy + 18, -110);
      (moon.children[0] as Mesh<SphereGeometry, MeshBasicMaterial>).material.opacity = calm;
      (moon.children[1] as Mesh<PlaneGeometry, MeshBasicMaterial>).material.opacity = calm * 0.5;
      drawnWhile(moon, calm > 0);
    },
  };
}

/** An upturned terracotta flower pot, a shelter from the wind as tall as two of him. */
function flowerPot(x: number, y: number): Group {
  const group = new Group();
  const clay = solid('#b65f3a', 0.8);
  const pot = new Mesh(new CylinderGeometry(0.62, 0.92, 1.7, 20), clay);
  pot.position.y = 0.85;
  const rim = new Mesh(new CylinderGeometry(1.0, 1.0, 0.28, 20), clay);
  rim.position.y = 0.14;
  group.add(pot, rim);
  group.position.set(x, y, -1.3);
  group.userData.model = 'kruka';
  group.userData.turn = x * 1.7;
  return group;
}

/** A boulder of the hillside, granite grey and faceted, as big as the lumps it stands in for. */
function boulder(x: number, y: number): Group {
  const stone = new Group();
  stone.add(new Mesh(rock(Math.round(x * 10), 1.0, 1.2, 0.85), solid('#8c9096', 0.95, { flatShading: true })));
  stone.position.set(x, y + 0.7, -1.3);
  // The kit's, as soon as it has come: it stands on the ground, and the stand-in's middle is 0.7 over it.
  stone.userData.model = 'block-b';
  stone.userData.block = { width: 3, height: 2.7, depth: 2.6, x: 0, y: 0.65 };
  stone.userData.turn = x;
  return stone;
}

/** A barn roof's ventilation hood: a little red-painted wooden box with its own pointed roof, standing on the ridge. */
function roofVent(x: number, y: number): Group {
  const group = new Group();
  const box = new Mesh(new BoxGeometry(1.1, 1.9, 1.1), solid('#8a2c22', 0.9));
  box.position.y = 0.95;
  const slats = new Mesh(new BoxGeometry(1.14, 0.7, 1.14), solid('#2a1c18', 0.9));
  slats.position.y = 1.35;
  const cap = new Mesh(new ConeGeometry(0.95, 0.7, 4), solid('#5a5c60', 0.6, { metalness: 0.3 }));
  cap.rotation.y = Math.PI / 4;
  cap.position.y = 2.25;
  group.add(box, slats, cap);
  group.position.set(x, y, -1.2);
  return group;
}

/** A jetty's post, dark and wet, standing up out of the boards: a shelter from the waves' spray. */
function jettyPost(x: number, y: number): Group {
  const group = new Group();
  const post = new Mesh(new CylinderGeometry(0.42, 0.48, 3.2, 12), solid('#7a6450', 0.85));
  post.position.y = 1.2;
  const cap = new Mesh(new CylinderGeometry(0.46, 0.46, 0.12, 12), solid('#9a8670', 0.8));
  cap.position.y = 2.86;
  group.add(post, cap);
  group.position.set(x, y, -1.1);
  group.userData.model = 'bryggstolpe';
  return group;
}

/** The garden's trampoline, as big as a table to him: a dark round mat on a green frame, its top at the bouncer's. */
function trampoline(): Group {
  const group = new Group();
  const mat = new Mesh(new CylinderGeometry(1.5, 1.5, 0.06, 28), solid('#1e2226', 0.7));
  mat.position.y = 0.5;
  const rim = new Mesh(new TorusGeometry(1.6, 0.12, 8, 30), solid('#3c7a52', 0.6));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.52;
  group.add(mat, rim);
  for (const a of [0.4, 2.0, 3.6, 5.2]) {
    const leg = new Mesh(new CylinderGeometry(0.05, 0.05, 1.4, 6), solid('#2c5a3c', 0.6));
    leg.position.set(Math.cos(a) * 1.55, -0.2, Math.sin(a) * 1.55 - 0.3);
    group.add(leg);
  }
  group.position.z = -0.3;
  return group;
}

/**
 * A volleyball net torn loose and sagging low between its two posts: a white top band dipping to the
 * bouncer's top in the middle, the mesh hanging under it. He lands in the dip.
 */
function saggingNet(): Group {
  const group = new Group();
  const white = solid('#f2f2ee', 0.7);
  const mesh = solid('#d4d6d2', 0.8);
  const sag = (x: number) => 0.5 + 1.6 * (x / 2.4) ** 2;
  const points = Array.from({ length: 13 }, (_, i) => new Vector3(-2.4 + (i / 12) * 4.8, sag(-2.4 + (i / 12) * 4.8), 0));
  const band = new Mesh(new TubeGeometry(new CatmullRomCurve3(points), 24, 0.07, 6), white);
  group.add(band);
  for (let i = 0; i <= 12; i++) {
    const x = -2.1 + i * 0.35;
    const strand = new Mesh(new BoxGeometry(0.025, 0.42, 0.025), mesh);
    strand.position.set(x, sag(x) - 0.22, 0);
    group.add(strand);
  }
  for (const k of [1, 2]) {
    const lower = points.map((p) => new Vector3(p.x, p.y - k * 0.18, 0));
    group.add(new Mesh(new TubeGeometry(new CatmullRomCurve3(lower), 24, 0.02, 4), mesh));
  }
  for (const x of [-2.5, 2.5]) {
    const post = new Mesh(new CylinderGeometry(0.06, 0.07, 2.4, 8), solid('#c8ccce', 0.5, { metalness: 0.4 }));
    post.position.set(x, 1.2, 0);
    group.add(post);
  }
  group.position.z = -0.2;
  return group;
}

/** An awning's loose flap: striped cloth, sagging, its top at the bouncer's. */
function awningFlap(): Group {
  const group = new Group();
  for (let i = 0; i < 6; i++) {
    const stripe = new Mesh(new BoxGeometry(0.3, 0.08, 1.4), solid(i % 2 ? '#f1ece2' : '#2f6a8a', 0.8));
    stripe.position.set(-0.75 + i * 0.3, 0.46 - Math.sin((i / 5) * Math.PI) * 0.06, 0);
    group.add(stripe);
  }
  return group;
}

// --- the figures ---------------------------------------------------------------------------------------------

/** How high each figure's middle is over its feet: a watched flight tumbles about it. */
const FIGURE_MIDDLE = { lillgubbe: 0.26, tragubbe: 0.5 } as const;

/** Pappa's very first trägubbe: grey old wood, a pointed cap, a crooked smile and the crowberry eyes Elof gave it. */
function oldFigure(silhouette = false): Group {
  const group = new Group();
  const wood = silhouette ? solid('#3a3a40', 1, { emissive: '#30384c', emissiveIntensity: 0.6 }) : solid('#8f8c7e', 1);
  const dark = solid('#2a2622', 0.9);
  const body = new Mesh(new CylinderGeometry(0.13, 0.2, 0.48, 8), wood);
  body.position.set(0, 0.24, 0);
  body.rotation.z = -0.08;
  const cap = new Mesh(new ConeGeometry(0.17, 0.34, 7), wood);
  cap.position.set(0.02, 0.84, 0);
  cap.rotation.z = -0.1;
  const smile = new Mesh(new TorusGeometry(0.055, 0.009, 5, 12, Math.PI), dark);
  smile.position.set(0, 0.57, 0.146);
  smile.rotation.z = Math.PI;
  group.add(body, ball(0.16, wood, 0.015, 0.58), cap, smile, ball(0.06, solid('#6f8a45', 1), -0.13, 0.38, 0.08, [1, 0.5, 1]));
  // The crowberry eyes: dark, a little shiny.
  for (const x of [-0.06, 0.06]) group.add(ball(0.026, solid('#1a1530', 0.3), x, 0.62, 0.148));
  group.name = 'old-trägubbe';
  if (!silhouette) { group.userData.model = 'tragubbe'; group.userData.fit = 0.72; }
  return group;
}

/** Elof's own first carving: pale linden, round and small, with the two eyes he painted. Its cap is lost in the storm. */
function littleFigure(silhouette = false): Group {
  const group = new Group();
  const wood = silhouette ? solid('#4a4640', 1, { emissive: '#3a4260', emissiveIntensity: 0.7 }) : solid('#e6cfa2', 0.9);
  const dark = solid('#2c2420', 0.6);
  const body = new Mesh(new CylinderGeometry(0.1, 0.14, 0.3, 9), wood);
  body.position.y = 0.15;
  group.add(body, ball(0.12, wood, 0, 0.4));
  for (const x of [-0.045, 0.045]) group.add(ball(0.02, dark, x, 0.42, 0.11));
  // The knife's marks: three facets, a little crooked, as a first carving's are.
  for (const [y, turn] of [[0.08, 0.3], [0.2, -0.4]] as const) {
    const cut = new Mesh(new BoxGeometry(0.2, 0.012, 0.012), solid('#c9b07e', 1));
    cut.position.set(0, y, 0.135);
    cut.rotation.z = turn;
    group.add(cut);
  }
  group.name = 'little-trägubbe';
  if (!silhouette) group.userData.model = 'lillgubbe';
  return group;
}

/** A thing that stands about: it shrinks away when its flag says it is gone, and may move a little while it is there. */
function standing(spot: Spot, group: Group, alive?: (clock: number, dt: number) => void, leaves: 'shrink' | 'leap' | 'fly' | 'blown' = 'shrink', flyer?: Group): SpotProp {
  const root = new Group();
  root.position.set(spot.at.x, spot.at.y, -0.6);
  root.add(group);
  // What flies off may fly as another shape, with wings that open: hidden until it goes.
  if (flyer) { root.add(flyer); drawnWhile(flyer, false); }
  const flyerWings: Object3D[] = [];
  flyer?.traverse((node) => { if (typeof node.userData.side === 'number') flyerWings.push(node); });
  let since = 0;
  return {
    group: root,
    update(used, clock, dt) {
      since = used ? since + dt : 0;
      alive?.(clock, dt);
      if (leaves === 'shrink' || since === 0) {
        const size = Math.max(0, 1 - since / 0.4);
        root.scale.setScalar(size);
        root.position.x = spot.at.x;
        root.position.y = spot.at.y;
        root.rotation.z = 0;
        drawnWhile(root, size > 0);
        if (flyer) { drawnWhile(group, true); drawnWhile(flyer, false); group.scale.set(1, 1, 1); }
        return;
      }
      if (leaves === 'leap') {
        // A crouch, and away in one long arc, spinning a little: he never waits.
        const crouch = Math.min(1, since / 0.16);
        const k = Math.max(0, (since - 0.16) / 0.62);
        root.scale.set(1, k === 0 ? 1 - 0.2 * crouch : 1, 1);
        root.position.x = spot.at.x + k * 5.5;
        root.position.y = spot.at.y + Math.sin(Math.min(k, 1) * Math.PI) * 2.6 - Math.max(0, k - 1) * 8;
        root.rotation.z = -k * 2.2;
        drawnWhile(root, k < 1.2);
        return;
      }
      if (leaves === 'blown') {
        // Lifted off its feet by the gust and tumbled away with it, up and out through the window.
        const k = since / 0.9;
        root.position.x = spot.at.x + k * 6.6;
        root.position.y = spot.at.y + Math.sin(Math.min(k, 1) * Math.PI * 0.7) * 2.2 + k * 0.4;
        root.rotation.z = -k * 7;
        drawnWhile(root, k < 1.05);
        return;
      }
      if (flyer) {
        // A crouch, then off the bough: its wings open, it drops forward a little and climbs away, beating hard.
        const crouch = smooth(since / 0.22);
        const k = Math.max(0, (since - 0.22) / 1.6);
        group.scale.set(1, 1 - 0.12 * crouch * (k > 0 ? 0 : 1), 1);
        drawnWhile(group, k === 0);
        drawnWhile(flyer, k > 0 && k < 1);
        root.position.x = spot.at.x + k * k * 3 + k * 5;
        root.position.y = spot.at.y - Math.sin(Math.min(1, k * 4) * Math.PI) * 0.35 + k * k * 9;
        root.rotation.z = Math.min(0.35, k * 1.5);
        const lift = wingbeat(since, 2.2, { every: 0 }).lift;
        for (const wing of flyerWings) wing.rotation.x = (0.15 - 0.6 * lift) * (wing.userData.side as number);
        drawnWhile(root, k < 1);
        return;
      }
      // Up and away on its wings, faster and faster.
      const k = since / 1.5;
      root.position.x = spot.at.x + k * 8;
      root.position.y = spot.at.y + k * k * 11;
      root.rotation.z = 0.25;
      const flap = Math.sin(clock * 26) * 0.7;
      const near = group.getObjectByName('wingNear');
      const far = group.getObjectByName('wingFar');
      if (near) near.rotation.x = flap;
      if (far) far.rotation.x = -flap;
      drawnWhile(root, k < 1);
    },
  };
}

/** An otter sitting up on its stone, its head turning and its back bobbing a little: it is real, and it has seen him. */
function otter(): { group: Group; head: Group } {
  const group = new Group();
  const fur = solid('#7a5c42', 0.55);
  const pale = solid('#b8a488', 0.7);
  const body = new Mesh(new SphereGeometry(0.36, 14, 10).scale(1, 1.5, 0.9), fur);
  body.position.y = 0.5;
  const belly = new Mesh(new SphereGeometry(0.24, 12, 8).scale(1, 1.5, 0.7), pale);
  belly.position.set(0, 0.5, 0.2);
  const tail = new Mesh(new ConeGeometry(0.16, 1.1, 10).rotateZ(Math.PI / 2), fur);
  tail.position.set(-0.62, 0.12, -0.05);
  const head = new Group();
  head.position.y = 1.08;
  head.add(new Mesh(new SphereGeometry(0.26, 14, 10).scale(1, 0.85, 0.95), fur), ball(0.14, pale, 0, -0.06, 0.2, [1, 0.7, 0.8]));
  for (const x of [-0.11, 0.11]) head.add(ball(0.035, solid('#141010', 0.25), x, 0.05, 0.23), ball(0.07, fur, x * 1.9, 0.18, 0));
  head.add(ball(0.04, solid('#141010', 0.3), 0, -0.02, 0.32));
  group.add(body, belly, tail, head);
  group.scale.setScalar(0.72);
  // The kit's otter, standing up on its stone, in the group that bobs.
  group.userData.model = 'utter';
  group.userData.fit = 0.86;
  return { group, head };
}

// --- the things of the story -----------------------------------------------------------------------------------

/** A football's skin: white, with the dark patches where an icosahedron's corners are. Radius 1, at the origin. */
function footballGeometry(): BufferGeometry {
  const geometry = new SphereGeometry(1, 28, 18);
  const t = (1 + Math.sqrt(5)) / 2;
  const corners = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]]
    .map(([x, y, z]) => { const l = Math.hypot(x!, y!, z!); return [x! / l, y! / l, z! / l] as const; });
  const at = geometry.getAttribute('position');
  const colours: number[] = [];
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i), y = at.getY(i), z = at.getZ(i);
    const near = Math.max(...corners.map(([cx, cy, cz]) => x * cx + y * cy + z * cz));
    const dark = near > 0.94;
    colours.push(...(dark ? [0.08, 0.08, 0.09] : [0.95, 0.95, 0.93]));
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return geometry;
}
const footballMaterial = () => new MeshStandardMaterial({ vertexColors: true, roughness: 0.45 });
function football(radius: number): Mesh {
  const ball = new Mesh(footballGeometry(), footballMaterial());
  ball.scale.setScalar(radius);
  ball.position.y = radius;
  return ball;
}

/** Cream foam drifting on black water, as it does below a rapid: one mesh of flecks, carried by the current. */
function createFoam(foam: NonNullable<ChapterData['storm']>['foam'], group: Group): ((dt: number, still: boolean) => void) | null {
  if (!foam?.length) return null;
  const flecks = foam.flatMap((run) => Array.from({ length: Math.round((run.to - run.from) * (run.dense ?? 3)) }, (_, i) => ({
    run,
    x: run.from + ((i * 0.618) % 1) * (run.to - run.from),
    z: -0.3 - ((i * 0.381) % 1) * 7,
    size: 0.05 + ((i * 0.733) % 1) * 0.16,
  })));
  const mesh = new InstancedMesh(new CircleGeometry(1, 8).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#dcd4c0', transparent: true, opacity: 0.42, depthWrite: false }), flecks.length);
  mesh.name = 'river-foam';
  mesh.frustumCulled = false;
  group.add(mesh);
  const place = new Object3D();
  const write = () => {
    for (const [i, fleck] of flecks.entries()) {
      place.position.set(fleck.x, fleck.run.y + 0.03, fleck.z);
      place.scale.set(fleck.size * 2.6, 1, fleck.size);
      place.updateMatrix();
      mesh.setMatrixAt(i, place.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  write();
  return (dt, still) => {
    if (still) return;
    for (const fleck of flecks) {
      fleck.x += fleck.run.speed * dt * (0.7 + fleck.size);
      if (fleck.x > fleck.run.to) fleck.x = fleck.run.from;
    }
    write();
  };
}

/** Mormor's lantern, whose light falls where he walks: it hangs from its top, and its glow goes with it. */
function lantern(): { group: Group; light: Mesh } {
  const group = new Group();
  const tin = new Group();
  tin.userData.model = 'lykta';
  group.add(tin);
  const body = new Mesh(new CylinderGeometry(0.2, 0.24, 0.52, 8), new MeshBasicMaterial({ color: '#ffd27a' }));
  body.position.y = -0.46;
  const roof = new Mesh(new CylinderGeometry(0.1, 0.3, 0.16, 8), solid('#2a2a2a', 0.5));
  roof.position.y = -0.14;
  const floor = new Mesh(new CylinderGeometry(0.27, 0.27, 0.06, 8), solid('#2a2a2a', 0.5));
  floor.position.y = -0.74;
  const light = glow('#ffc070', 6, 0.6);
  light.position.y = -0.46;
  group.add(body, roof, floor, light);
  return { group, light };
}

/** How far behind its group a grandparent's body stands (./grandparents.ts). */
const RIG_BACK = 1.9;
/**
 * At the door she walked to (Mormor's at the barn): where her hand goes on it from where she stands, which way she turns
 * meanwhile (a little towards him), when the door opens after she has come (the simulation's `bi:door`, ./chapters/
 * billsta.ts), how long she pushes it in, and when she has let go.
 */
const AT_DOOR = { ahead: 0.75, up: 2.55, out: 0.4, heading: -0.35, open: 0.55, push: 0.4, let: 1.1 };

/**
 * Mormor or Morfar in the picture: no longer a thing he uses up, so they stay when he calls. Where the chapter sends one
 * (`Spot.goesTo`, once `goesWhen` is set), they walk there over the ground at their own pace, and at the end put a hand
 * on what is before them and push it (Mormor, up the planks to the barn's door, which swings in as the simulation opens
 * it: `ELDER_WALK` times both).
 */
function figure(spot: Spot, who: Grandparent, lit = who === 'mormor'): SpotProp {
  const carried = lit ? lantern() : null;
  const made = createGrandparent(who, carried?.group ?? null, spot.id.startsWith('decor:'));
  made.group.userData.dress = (model: Object3D) => made.dress(model);
  const home = spot.standsAt, to = spot.goesTo;
  const put = (x: number, y: number, z: number) => made.group.position.set(x, y, z + RIG_BACK);
  if (home) put(home.x, home.y, home.z); else made.group.position.set(spot.at.x, spot.at.y, -0.6);
  const going: Going = { gait: 0, pace: 0, stride: 0, heading: null, touch: null, weight: 0 };
  const touch = new Vector3();
  const ground = (x: number) => (course ? heightAt(course, x) : home && to ? home.y + ((to.y - home.y) * (x - home.x)) / (to.x - home.x || 1) : 0);
  let goneFor = -1, seconds = 1, first = true, wasX = 0, wasY = 0;
  return {
    group: made.group,
    update(used, clock, dt) {
      const goes = !!home && !!to && !!elof.flags?.has(spot.goesWhen ?? spot.id);
      let ongoing: Going | undefined;
      if (goes && home && to) {
        if (goneFor < 0) {
          seconds = elderWalk(home.x, to.x, ground);
          // A game taken up after the walk finds them there, and so does one without motion.
          goneFor = first || elof.still ? seconds + AT_DOOR.open + AT_DOOR.let + 1 : 0;
          wasX = home.x; wasY = home.y;
        } else goneFor += dt;
        const k = smooth(goneFor / seconds);
        const x = home.x + (to.x - home.x) * k, z = home.z + (to.z - home.z) * k, y = ground(x);
        put(x, y, z);
        const moved = Math.hypot(x - wasX, y - wasY);
        wasX = x; wasY = y;
        const walking = goneFor < seconds;
        going.gait = dt > 0 ? moved / dt / made.rig.height : 0;
        // The stride goes by the ground covered, a step of the body's own length at its gait, so the planted foot holds.
        if (moved > 0) going.stride += moved / stepLength(Math.max(going.gait, 0.3), made.rig.height, made.rig.legs);
        going.pace = elof.still ? (walking ? 1 : 0) : going.pace + ((walking && moved > 1e-4 ? 1 : 0) - going.pace) * Math.min(1, dt * 8);
        // The way she goes; at the door, turned a little to him; once it is open and she has let go, as she will.
        const at = goneFor - seconds;
        going.heading = walking ? Math.atan2(to.x - home.x, to.z - home.z) : at < AT_DOOR.open + AT_DOOR.let ? AT_DOOR.heading : null;
        // Her hand goes out to the door as she comes to it, stays on it while it opens, pushing it a little way in, and
        // comes back.
        const open = at - AT_DOOR.open;
        going.weight = elof.still || at < -0.3 ? 0 : open < AT_DOOR.push ? smooth((at + 0.3) / 0.5) : 1 - smooth((open - AT_DOOR.push) / (AT_DOOR.let - AT_DOOR.push));
        going.touch = touch.set(to.x + AT_DOOR.ahead + smooth(open / AT_DOOR.push) * 0.35, to.y + AT_DOOR.up, to.z + AT_DOOR.out);
        ongoing = going;
      }
      first = false;
      made.update(used, clock, dt, elof.x, elof.flags?.has(LADDER_LAID), ongoing);
      if (carried) (carried.light.material as MeshBasicMaterial).opacity = 0.55 + 0.08 * Math.sin(clock * 6.3);
    },
  };
}

/** A carved pumpkin lantern, as tall as two of him, its face lit from inside by a candle. */
function pumpkin(): { group: Group; light: Mesh; face: MeshBasicMaterial } {
  const group = new Group();
  const ribs: Vector2[] = [];
  for (let i = 0; i <= 16; i++) {
    const a = (i / 16) * Math.PI;
    ribs.push(new Vector2(Math.sin(a) * 1.4, 1.1 - Math.cos(a) * 1.1));
  }
  const skin = new LatheGeometry(ribs, 28);
  const at = skin.getAttribute('position');
  // Its ribs: the skin goes in and out round it.
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i);
    const z = at.getZ(i);
    const a = Math.atan2(z, x);
    const k = 1 - 0.07 * Math.abs(Math.cos(a * 5));
    at.setXYZ(i, x * k, at.getY(i), z * k);
  }
  skin.computeVertexNormals();
  const body = new Group();
  body.userData.model = 'pumpa';
  const stem = new Mesh(new CylinderGeometry(0.09, 0.14, 0.4, 7), solid('#5a5a2a', 0.9));
  stem.position.y = 2.3;
  stem.rotation.z = 0.25;
  body.add(new Mesh(skin, solid('#d8701e', 0.55)), stem);
  group.add(body);
  // The face: two triangle eyes and a toothy grin, glowing.
  const face = new MeshBasicMaterial({ color: '#ffcf5a', fog: false });
  const triangle = (size: number) => {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute([-size, -size * 0.6, 0, size, -size * 0.6, 0, 0, size * 0.8, 0], 3));
    return g;
  };
  for (const x of [-0.5, 0.5]) {
    const eye = new Mesh(triangle(0.22), face);
    eye.position.set(x, 1.35, 1.36);
    group.add(eye);
  }
  const grin = new Mesh(new PlaneGeometry(1.1, 0.22), face);
  grin.position.set(0, 0.8, 1.38);
  group.add(grin);
  for (const x of [-0.3, 0.1, 0.4]) {
    const tooth = new Mesh(new BoxGeometry(0.14, 0.12, 0.02), solid('#d8701e', 0.55));
    tooth.position.set(x, 0.86, 1.4);
    group.add(tooth);
  }
  const light = glow('#ffb04a', 5.5, 0.55);
  light.position.set(0, 1.1, 1.6);
  group.add(light);
  return { group, light, face };
}

/** The owl, tawny and round, with big dark eyes in a pale face. */
function owl(flying = false): Group {
  const group = new Group();
  group.userData.model = flying ? undefined : 'uggla';
  if (!flying) {
    // Until the kit's has come, the same tawny owl as sits in the forest's trees (../../render/lift/fauna/shapes.ts), only
    // near and large, with its lids resting half down, set here once: the forest's own move them in its vertex stage.
    const shape = tawnyOwl();
    const rig = shape.getAttribute('rig');
    const pivot = shape.getAttribute('pivot');
    const at = shape.getAttribute('position');
    for (let i = 0; i < at.count; i++) if (rig.getX(i) > 3.5) at.setY(i, pivot.getY(i) + (at.getY(i) - pivot.getY(i)) * 0.5);
    const body = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }));
    body.rotation.y = -Math.PI / 2;
    body.scale.setScalar(2.7);
    group.add(body);
    group.name = 'owl';
    return group;
  }
  // In flight, under him: the same tawny owl, its body level and its round face turned a little to the camera, its broad
  // wings out to the sides with their finger feathers spread. The storm's extra beats them (see `beat` in stormExtra).
  // Night and the storm's light come from behind it: a little light of its own keeps its feathers from going black.
  const lit = (colour: string) => solid(colour, 0.9, { side: DoubleSide, emissive: colour, emissiveIntensity: 0.22 });
  const back = lit('#8a7458');
  const belly = lit('#b8a486');
  const face = lit('#dccdac');
  group.add(ball(0.72, back, 0, -0.72, 0, [1.3, 0.72, 0.82]));
  group.add(ball(0.56, belly, 0.14, -0.88, 0, [1.3, 0.62, 0.8]));
  group.add(ball(0.52, back, 0.98, -0.52, 0.04, [1, 0.95, 1]));
  const disc = ball(0.4, face, 1.26, -0.54, 0.16, [0.55, 0.96, 0.98]);
  group.add(disc);
  for (const z of [-0.02, 0.34]) group.add(ball(0.13, solid('#ebe2ca', 0.6), 1.42, -0.46, z, [0.5, 1, 1]), ball(0.085, solid('#1c1610', 0.35), 1.49, -0.46, z, [0.5, 1, 1]));
  const beak = new Mesh(new ConeGeometry(0.06, 0.2, 6), solid('#a89878', 0.6));
  beak.rotation.z = -Math.PI / 2 - 0.5;
  beak.position.set(1.54, -0.6, 0.16);
  group.add(beak);
  // The tail: short, round and flat, as an owl's is.
  group.add(ball(0.5, lit('#6e5c46'), -1, -0.66, 0, [1.1, 0.16, 0.62]));
  // Its feet, tucked up under it.
  for (const z of [-0.2, 0.2]) group.add(ball(0.14, solid('#8a7a5e', 0.8), 0.2, -1.28, z, [1.3, 0.7, 0.9]));
  const outline = new Shape();
  outline.moveTo(0.8, 0);
  outline.quadraticCurveTo(1.05, 1.3, 0.62, 2.3);
  for (const [x, y] of [[0.42, 2.72], [0.22, 2.3], [0.02, 2.62], [-0.16, 2.2], [-0.36, 2.42], [-0.5, 2], [-0.72, 2.08], [-0.72, 1.6]] as const) outline.lineTo(x, y);
  outline.quadraticCurveTo(-1, 0.8, -0.82, 0);
  outline.closePath();
  for (const side of [-1, 1]) {
    const hinge = new Group();
    hinge.name = 'owl-wing';
    hinge.userData.side = side;
    hinge.position.set(0.05, -0.46, side * 0.42);
    const feathers = new Mesh(new ShapeGeometry(outline, 8).rotateX(Math.PI / 2).scale(1, 1, side), lit('#7a6650'));
    // The shorter feathers over the wing's root: the same wing, smaller and paler, lying on it.
    const coverts = new Mesh(new ShapeGeometry(outline, 8).scale(0.74, 0.56, 1).rotateX(Math.PI / 2).scale(1, 1, side).translate(0, 0.03, 0), lit('#a08a6c'));
    hinge.add(feathers, coverts);
    hinge.userData.model = side > 0 ? 'uggla-vinge-n' : 'uggla-vinge-f';
    group.add(hinge);
  }
  // The kit's body, under its wings and under him. What is built above stands in until it has come.
  const carried = new Group();
  carried.position.y = -0.6;
  carried.userData.model = 'uggla-flyger';
  for (const part of group.children.filter((child) => child.name !== 'owl-wing')) carried.add(part);
  group.add(carried);
  return group;
}

/** How much smaller than the owl that carries him a sitting owl is, and how high its flying shape's middle sits then. */
const SITTING_SIZE = 0.6;
const SITTING_LIFT = 1.4;

/**
 * The flying owl at a sitting owl's size, for one that takes off by itself. Its wings have names of their own, so the
 * ridden owl's beat does not drive them.
 */
function sittingSizeFlyer(): Group {
  const flyer = owl(true);
  flyer.scale.setScalar(SITTING_SIZE);
  flyer.position.y = SITTING_LIFT;
  flyer.traverse((node) => { if (node.name === 'owl-wing') node.name = 'owl-wing-away'; });
  return flyer;
}

/**
 * An owl that comes when called (`Spot.goesTo`; Älven: "Called, it settles beside him"): off its stone on open wings,
 * a short glide, and down where he climbs onto it. Once he has, it is the owl that carries him, and is not drawn here.
 */
function calledOwl(spot: Spot, sitting: Group, alive: (clock: number) => void): SpotProp {
  const to = spot.goesTo!;
  const flyer = sittingSizeFlyer();
  const wings: Object3D[] = [];
  flyer.traverse((node) => { if (typeof node.userData.side === 'number') wings.push(node); });
  const root = new Group();
  root.add(sitting, flyer);
  root.position.set(spot.at.x, spot.at.y, -0.6);
  drawnWhile(flyer, false);
  const GLIDE = 1.3;
  let since = -1;
  return {
    group: root,
    update(used, clock, dt) {
      // A game taken up after it was called finds it there already.
      since = !used ? -1 : since < 0 && clock < 0.5 ? GLIDE : Math.max(0, since) + dt;
      const k = used ? smooth(Math.min(1, since / GLIDE)) : 0;
      root.position.set(
        spot.at.x + (to.x - spot.at.x) * k,
        spot.at.y + (to.y - spot.at.y) * k + Math.sin(k * Math.PI) * 1.1,
        -0.6 + (to.z + 0.6) * k,
      );
      const gliding = used && since < GLIDE;
      drawnWhile(sitting, !gliding);
      drawnWhile(flyer, gliding);
      if (gliding) {
        const lift = wingbeat(since, 2.2, { every: 0 }).lift;
        for (const wing of wings) wing.rotation.x = (0.15 - 0.6 * lift) * (wing.userData.side as number);
        root.rotation.z = 0.12 * Math.sin(k * Math.PI);
      } else {
        root.rotation.z = 0;
        alive(clock);
      }
      drawnWhile(root, waitingOwl(root));
    },
  };
}

/** Bertil's rubber boot, lying on the water as a boat: its toe the bow, its open leg where Elof sits. */
function boot(): Group {
  const group = new Group();
  const rubber = solid('#2f6b3a', 0.45);
  const sole = solid('#2a2420', 0.8);
  const foot = new Mesh(new CylinderGeometry(0.55, 0.6, 1.9, 16), rubber);
  foot.rotation.z = Math.PI / 2;
  foot.position.set(0.5, -0.2, 0);
  const toe = ball(0.58, rubber, 1.45, -0.22, 0, [0.9, 0.95, 1]);
  const leg = new Mesh(new CylinderGeometry(0.62, 0.6, 1.0, 18, 1, true), rubber);
  leg.position.set(-0.5, 0.05, 0);
  (leg.material as MeshStandardMaterial).side = DoubleSide;
  const keel = new Mesh(new BoxGeometry(2.8, 0.16, 0.9), sole);
  keel.position.set(0.35, -0.78, 0);
  const rim = new Mesh(new TorusGeometry(0.61, 0.05, 6, 22), solid('#e6c34a', 0.5));
  rim.rotation.x = Math.PI / 2;
  rim.position.set(-0.5, 0.55, 0);
  group.add(foot, toe, leg, keel, rim);
  group.position.y = -0.1;
  group.userData.model = 'stovel';
  return group;
}

/** Moa's umbrella, open over him: denim blue with pale spots, its handle down to his hands. */
function umbrella(): Group {
  const group = new Group();
  const canopy = new Mesh(new SphereGeometry(1.5, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), solid('#5b7fb5', 0.6, { side: DoubleSide }));
  canopy.position.y = 2.1;
  canopy.scale.y = 0.7;
  group.add(canopy);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    group.add(ball(0.13, solid('#f1ece2', 0.6), Math.cos(a) * 0.95, 2.55, Math.sin(a) * 0.95, [1, 0.35, 1]));
  }
  const shaft = new Mesh(new CylinderGeometry(0.035, 0.035, 1.5, 6), solid('#3a3a3a', 0.4));
  shaft.position.y = 1.55;
  const hook = new Mesh(new TorusGeometry(0.14, 0.035, 6, 12, Math.PI), solid('#8a5a32', 0.6));
  hook.position.set(0.14, 0.82, 0);
  hook.rotation.z = Math.PI;
  group.add(shaft, hook);
  group.userData.model = 'paraply';
  group.userData.lift = 0.72;
  return group;
}

/** How far in front of his feet the little one's cap comes to lie, found in the gutter, and the flag of his hand on it. */
const CAP_AT_FEET = 0.42;
const CAP_PICKED = 'sb:cap-picked';

function spotLooks(): Record<string, (spot: Spot) => SpotProp | null> {
  return {
    // He leaps away, as he does all night, except where Elof lifts him up.
    tragubbe: (spot) => {
      const figure = oldFigure();
      // On the stone in the storm's eye it rocks the little one a little, and turns to him when he has come.
      const met = spot.word === 'lifted';
      figure.userData.warm = met;
      return standing(spot, figure, met ? (clock, dt) => {
        figure.rotation.z = Math.sin(clock * 1.1) * 0.04;
        const seen = elof.flags?.has('eye') && Math.abs(elof.x - spot.at.x) < 5;
        figure.rotation.y += ((seen ? -0.9 : 0) - figure.rotation.y) * Math.min(1, dt * 1.6);
      } : undefined, spot.id.startsWith('decor:') && !met ? 'leap' : 'shrink');
    },
    seesawLog: (spot) => {
      // The dry spruce over its stone, measured from its low end, where he stands. Thick at the root, thin at the
      // top, with the stubs of its boughs. It turns about the stone, wherever the stone is.
      const LENGTH = 5;
      const STONE_TOP = 0.6;
      const EVEN = 2.5;
      const SHORT = 1.2;
      const group = new Group();
      group.position.set(spot.at.x + 0.4, spot.at.y, -0.34);
      const wood = solid('#94806a', 0.85);
      const pale = solid('#b4a288', 0.9);
      const log = new Group();
      const body = new Group();
      const trunk = new Mesh(new CylinderGeometry(0.08, 0.2, LENGTH, 10).rotateZ(-Math.PI / 2), wood);
      trunk.castShadow = true;
      body.add(trunk);
      for (const [x, side] of [[-1.9, 1], [-1.3, -1], [-0.6, 1], [0.1, -1], [0.8, 1], [1.5, -1]] as const) {
        const stub = new Mesh(new CylinderGeometry(0.02, 0.05, 0.52, 6), pale);
        stub.position.set(x, 0.24 * side, 0.05);
        stub.rotation.z = side > 0 ? -0.6 : Math.PI + 0.6;
        body.add(stub);
      }
      const root = new Mesh(new CircleGeometry(0.2, 10).rotateY(-Math.PI / 2), pale);
      root.position.x = -LENGTH / 2 - 0.001;
      body.add(root);
      log.add(body);
      group.add(log);
      let arm = EVEN;
      let rocked = 0;
      let since = 0;
      let first = true;
      return {
        group,
        update: (used, _clock, dt) => {
          const moved = elof.flags?.has('placed:bi-pivot') ?? false;
          const on = elof.flags?.has('bi:klonk-on') ?? false;
          const wanted = moved ? SHORT : EVEN;
          arm = first ? wanted : arm + (wanted - arm) * Math.min(1, dt * 6);
          first = false;
          rocked = on ? rocked + dt : 0;
          since = used ? since + dt : 0;
          const rest = Math.atan2(STONE_TOP - 0.1, arm);
          // Klonk lands on the even arms, and it hardly stirs.
          const stir = on && !moved ? -0.05 * Math.exp(-rocked * 2.2) * Math.cos(rocked * 8) : 0;
          const fall = Math.min(1, since / 0.24);
          log.position.set(arm, STONE_TOP, 0);
          body.position.x = LENGTH / 2 - arm;
          log.rotation.z = rest + stir + (TIPPED - rest - stir) * fall * fall;
        },
      };
    },
    otter: (spot) => {
      const { group, head } = otter();
      return standing(spot, group, (clock) => {
        group.position.y = Math.sin(clock * 1.7) * 0.03;
        // It looks about, holding each look, mostly out towards him, turning its head (the stand-in's, or the kit's on
        // its neck); a kit without a head of its own turns a little from its waist, more slowly.
        const look = held(clock, spot.at.x, 0.45, 0.12);
        const kitHead = group.getObjectByName('kit-head');
        if (head.parent === group || kitHead) {
          const turning = kitHead ?? head;
          group.rotation.y = kitHead ? held(clock, spot.at.x, 0.2, 0.3) * 0.12 + 0.1 : 0;
          turning.rotation.y = look * 0.6 + 0.1;
          turning.rotation.x = held(clock * 0.8, spot.at.x + 3, 0.5, 0.1) * 0.12;
        } else group.rotation.y = held(clock, spot.at.x, 0.25, 0.3) * 0.35 + 0.1;
      });
    },
    lillgubbe: (spot) => {
      const figure = littleFigure();
      figure.userData.warm = spot.word === 'lifted';
      // It trembles until it has its cap back, and then it hops. On the shelf in Stormkvällen the gust takes it
      // ("Lillgubben! Vinden tog honom!"), out through the window after the old one.
      // Its gladness starts when it has its cap back, from the ground, and grows in over a moment: no hop is caught
      // halfway up, and the trembling fades into the sway.
      let gladFor = 0;
      return standing(spot, figure, (clock, dt) => {
        const glad = elof.flags?.has('scene:motet') ?? false;
        gladFor = glad ? gladFor + dt : 0;
        const k = smooth(gladFor / 0.4);
        const tremble = Math.sin(clock * 5.3) * 0.03 + Math.sin(clock * 8.1 + 1) * 0.012;
        figure.rotation.z = tremble * (1 - k) + Math.sin(gladFor * 1.7) * 0.06 * k;
        figure.position.y = glad ? gladHop(gladFor) * k : 0;
      }, spot.id.startsWith('decor:') && spot.word !== 'lifted' ? 'blown' : 'shrink');
    },
    pumpkin: (spot) => {
      const { group, light, face } = pumpkin();
      return standing(spot, group, (clock) => {
        const flicker = 0.85 + 0.15 * Math.sin(clock * 11) * Math.sin(clock * 4.3 + 1);
        (light.material as MeshBasicMaterial).opacity = 0.5 * flicker;
        face.color.setRGB(1, 0.78 * flicker + 0.1, 0.32 * flicker);
      });
    },
    owl: (spot) => {
      const bird = owl();
      // It sits still, as an owl does, and now and then turns slowly to look another way, and holds it.
      const turn = (clock: number) => held(clock, spot.at.x, 0.22, 0.16) * 0.35;
      const alive = (clock: number) => {
        // The kit's owl turns its head, far, as owls do, and its body hardly; the stand-in turns as one.
        const head = bird.getObjectByName('kit-head');
        if (head) {
          bird.rotation.y = turn(clock) * 0.15;
          head.rotation.y = turn(clock) * 2.6;
          head.rotation.z = held(clock * 0.7, spot.at.x + 5, 0.3, 0.2) * 0.12;
        } else bird.rotation.y = turn(clock);
        bird.scale.y = 1 + Math.sin(clock * 1.4) * 0.008;
      };
      // Called, it comes over to where he climbs onto it.
      if (spot.goesTo) return calledOwl(spot, bird, alive);
      const decor = spot.id.startsWith('decor:');
      // One that flies off does so as the flying owl, with its wings, at the sitting one's size; its wings have names of
      // their own, so the ridden owl's beat does not drive them. One that he climbs onto does not fly off: it carries him.
      const flyer = decor ? sittingSizeFlyer() : undefined;
      const prop = standing(spot, bird, alive, decor ? 'fly' : 'shrink', flyer);
      return {
        group: prop.group,
        update(used, clock, dt) {
          // At no size, as the view hides a thing that stands about once it is gone (`decor.after`).
          const waits = waitingOwl(prop.group);
          prop.group.scale.setScalar(waits ? 1 : 0);
          if (waits) prop.update(used, clock, dt);
          else drawnWhile(prop.group, false);
        },
      };
    },
    tap: (spot) => {
      // The rain barrel's brass tap, and the water that pours from it once it is turned.
      const group = new Group();
      const brass = solid('#b8902e', 0.35, { metalness: 0.6 });
      const pipe = new Mesh(new CylinderGeometry(0.09, 0.09, 0.7, 10), brass);
      pipe.rotation.x = Math.PI / 2;
      pipe.position.set(0, 0.5, 0.25);
      const spout = new Mesh(new CylinderGeometry(0.07, 0.08, 0.35, 10), brass);
      spout.position.set(0, 0.3, 0.6);
      const handle = new Group();
      for (const turn of [0, Math.PI / 2]) {
        const bar = new Mesh(new BoxGeometry(0.5, 0.06, 0.06), brass);
        bar.rotation.y = turn;
        handle.add(bar);
      }
      handle.position.set(0, 0.68, 0.45);
      const water = new Mesh(new CylinderGeometry(0.05, 0.09, 1, 8, 1, true), new MeshBasicMaterial({ color: '#a8c8ff', transparent: true, opacity: 0.6, depthWrite: false }));
      water.position.set(0, -0.3, 0.6);
      water.visible = false;
      group.add(pipe, spout, handle, water);
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -0.6);
      root.add(group);
      let turned = 0;
      return {
        group: root,
        update(used, clock, dt) {
          turned = used ? Math.min(1, turned + dt * 2) : 0;
          handle.rotation.z = turned * Math.PI * 0.75;
          water.visible = turned > 0.6;
          water.scale.x = 1 + 0.15 * Math.sin(clock * 20);
        },
      };
    },
    candle: (spot) => {
      const group = new Group();
      const wax = new Mesh(new CylinderGeometry(0.09, 0.1, 0.42, 10), solid('#f4ecd8', 0.7));
      wax.position.y = 0.21;
      const flame = ball(0.05, new MeshBasicMaterial({ color: '#ffd27a' }), 0, 0.5, 0, [0.7, 1.4, 0.7]);
      const light = glow('#ffc070', 1.1, 0.7);
      light.position.y = 0.5;
      group.add(wax, flame, light);
      return standing(spot, group, (clock) => { flame.scale.y = 1.4 + 0.2 * Math.sin(clock * 13); });
    },
    cocoa: (spot) => {
      // Sunday's cup of hot chocolate ("Varm choklad efter stormen"): a white mug with a red heart, brown to the
      // brim, and its steam curling up.
      const group = new Group();
      const mug = new Mesh(new CylinderGeometry(0.17, 0.15, 0.32, 14), solid('#f4f1ea', 0.5));
      mug.position.y = 0.16;
      const cocoa = new Mesh(new CylinderGeometry(0.15, 0.15, 0.01, 14), solid('#5a3420', 0.3));
      cocoa.position.y = 0.3;
      const handle = new Mesh(new TorusGeometry(0.08, 0.022, 6, 12, Math.PI), solid('#f4f1ea', 0.5));
      handle.rotation.z = -Math.PI / 2;
      handle.position.set(0.17, 0.17, 0);
      const heart = new Mesh(new BoxGeometry(0.08, 0.08, 0.02), solid('#b8463c', 0.6));
      heart.rotation.z = Math.PI / 4;
      heart.position.set(0, 0.17, 0.16);
      group.add(mug, cocoa, handle, heart);
      const steam = new MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false });
      const puffs = [0, 1, 2].map(() => {
        const puff = new Mesh(new SphereGeometry(0.06, 8, 6), steam);
        group.add(puff);
        return puff;
      });
      return standing(spot, group, (clock) => {
        for (const [i, puff] of puffs.entries()) {
          const k = (clock * 0.45 + i / 3) % 1;
          puff.position.set(Math.sin(clock * 1.7 + i * 2.1) * 0.05 * (1 + k), 0.34 + k * 0.5, 0);
          puff.scale.setScalar(0.6 + k * 1.4);
        }
        steam.opacity = 0.2;
      });
    },
    flashlight: (spot) => {
      const group = new Group();
      const body = new Mesh(new CylinderGeometry(0.09, 0.09, 0.6, 10), solid('#c8372a', 0.5));
      body.rotation.z = Math.PI / 2;
      const head = new Mesh(new CylinderGeometry(0.15, 0.1, 0.18, 12), solid('#2a2a2a', 0.4));
      head.rotation.z = Math.PI / 2;
      head.position.x = 0.38;
      // Its beam fades away from the lamp, and has no end to see.
      const long = 7;
      const cone = new ConeGeometry(1.5, long, 18, 5, true).rotateZ(Math.PI / 2).translate(long / 2 + 0.46, 0, 0);
      const place = cone.getAttribute('position');
      const fade = new Float32Array(place.count * 3);
      // Clamped: at the cone's far ring a float32 rounds a hair past the end, and a negative base to 1.6 is NaN, which the
      // lens smears into a black blob in the room.
      for (let i = 0; i < place.count; i++) fade.fill(Math.max(0, 1 - (place.getX(i) - 0.46) / long) ** 1.6, i * 3, i * 3 + 3);
      cone.setAttribute('color', new Float32BufferAttribute(fade, 3));
      const beam = new Mesh(cone, new MeshBasicMaterial({ color: '#fff2c8', vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false, side: DoubleSide, blending: AdditiveBlending }));
      const light = glow('#fff0c0', 1.2, 0.9);
      light.position.x = 0.48;
      group.add(body, head, beam, light);
      return standing(spot, group);
    },
    'tiny-cap': (spot) => {
      // Fjun's cap, lost in the gutter: a little knitted red cone with a white bobble.
      const group = new Group();
      const cap = new Mesh(new ConeGeometry(0.16, 0.3, 10), solid('#c23a2e', 0.9));
      // Back on its head it sits straight and goes with its hops; lost, it lies on its side and bobs.
      const worn = spot.word === 'worn';
      cap.rotation.z = worn ? 0 : 1.2;
      cap.position.y = worn ? 0.15 : 0.1;
      group.add(cap, ball(0.06, solid('#f4efe4', 0.9), worn ? 0 : 0.17, worn ? 0.32 : 0.2, 0));
      if (worn) return standing(spot, group, (clock) => { group.position.y = home ? 0 : gladHop(clock); });
      // Lost in the gutter in Byn i stormen, it bobs where it lies. Found, a gust tumbles it the last step to his feet,
      // and it lies there until his hand has it (the scene `mossan`, ./chapters/stormbyn.ts): then it is in his hand
      // (../../render/view.ts). In a game taken up after that it is gone.
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -0.2);
      root.add(group);
      let since = -1, to = spot.at.x;
      return {
        group: root,
        update(used, clock, dt) {
          if (!used) {
            since = -1;
            root.position.x = spot.at.x;
            group.rotation.z = 0;
            group.position.y = 0.04 * Math.sin(clock * 3);
            drawnWhile(root, true);
            return;
          }
          if (since < 0) {
            since = 0;
            to = elof.x + (Math.sign(spot.at.x - elof.x) || 1) * CAP_AT_FEET;
          }
          since += dt;
          const k = elof.still ? 1 : smooth(since / 0.5);
          root.position.x = spot.at.x + (to - spot.at.x) * k;
          // It rolls over the stones as it goes, and lies still.
          group.rotation.z = (spot.at.x - root.position.x) / 0.16;
          group.position.y = 0;
          drawnWhile(root, !(elof.flags?.has(CAP_PICKED) || elof.flags?.has('scene:mossan')));
        },
      };
    },
    casement: (spot) => casement(spot),
    latch: (spot) => {
      const group = new Group();
      const brass = solid('#c8a040', 0.35, { metalness: 0.6 });
      const hook = new Mesh(new TorusGeometry(0.16, 0.03, 6, 14, Math.PI * 1.4), brass);
      const eye = new Mesh(new TorusGeometry(0.06, 0.02, 6, 10), brass);
      eye.position.set(0.3, 0, 0);
      group.add(hook, eye);
      return standing(spot, group);
    },
    football: (spot) => standing(spot, (() => { const g = new Group(); g.add(football(0.75)); return g; })()),
    whiteWater: (spot) => {
      // The rapids: wet boulders the river breaks over, and standing waves of white water that heave and never go.
      const group = new Group();
      group.position.set(spot.at.x, spot.at.y, -0.2);
      const random = scatter(37);
      const parts: BufferGeometry[] = [];
      for (const [x, z, wide, tall] of [[-6.2, -1, 1.5, 0.9], [-3.4, -2.8, 1.9, 1.3], [-0.8, -0.5, 1.1, 0.7], [2.2, -3.2, 2.1, 1.4], [4.4, -1.1, 1.3, 0.8], [6.6, -2.4, 1.6, 1]] as const) {
        parts.push(rock(Math.round(x * 10), wide, tall, wide * 0.8).clone().translate(x, 0.1, z));
      }
      const stones = new Mesh(mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part))), solid('#3a3e3c', 0.32, { flatShading: true }));
      group.add(stones);
      const waves = new InstancedMesh(new SphereGeometry(1, 10, 6).scale(1, 0.4, 0.7), solid('#d8d0ba', 0.5), 34);
      waves.frustumCulled = false;
      const humps = Array.from({ length: waves.count }, () => ({ x: (random() - 0.5) * 14.6, z: -0.4 - random() * 4.4, size: 0.3 + random() * 0.55, phase: random() * 6.28 }));
      group.add(waves);
      const place = new Object3D();
      const heave = (clock: number) => {
        for (const [i, hump] of humps.entries()) {
          const swell = 0.75 + 0.35 * Math.sin(clock * 5 + hump.phase);
          place.position.set(hump.x, 0.04 + 0.1 * Math.sin(clock * 4 + hump.phase), hump.z);
          place.scale.set(hump.size * 1.5, hump.size * swell, hump.size);
          place.updateMatrix();
          waves.setMatrixAt(i, place.matrix);
        }
        waves.instanceMatrix.needsUpdate = true;
      };
      heave(0);
      return { group, update: (_used, clock) => heave(clock) };
    },
    blind: (spot) => {
      // A shop's roller blind, down for the night. Someone wakes, and it goes up on the lit window. Its width is its word.
      const wide = Number(spot.word ?? 7);
      const tall = 9.7;
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y + tall, -6);
      const cloth = new Mesh(new PlaneGeometry(wide + 0.3, tall + 0.2).translate(0, -tall / 2, 0), solid('#262c38', 0.9));
      const slats: BufferGeometry[] = [];
      for (let y = 0.5; y < tall; y += 0.6) slats.push(new PlaneGeometry(wide + 0.3, 0.05).translate(0, -y, 0.01));
      const lines = new Mesh(mergeGeometries(slats), solid('#1c2028', 0.9));
      const rail = new Mesh(new BoxGeometry(wide + 0.5, 0.26, 0.2), solid('#3a3e48', 0.7));
      root.add(cloth, lines, rail);
      let since = 0;
      return {
        group: root,
        update(used, _clock, dt) {
          since = used ? since + dt : 0;
          const k = Math.min(1, since / 1.1);
          const open = 1 - (1 - k) ** 2;
          cloth.scale.y = lines.scale.y = 1 - open * 0.96;
        },
      };
    },
    bellCord: (spot) => {
      // A shop's bell cord, down from its awning to where he reaches, with a wooden knob; it swings hard when pulled.
      const group = new Group();
      const cord = new Mesh(new CylinderGeometry(0.035, 0.035, 12, 6).translate(0, 6, 0), solid('#c8b888', 0.9));
      const knob = new Mesh(new SphereGeometry(0.2, 10, 8).scale(1, 1.3, 1), solid('#a07040', 0.5));
      group.add(cord, knob);
      group.position.set(spot.at.x, spot.at.y + 1.15, -0.7);
      let since = 9;
      return {
        group,
        update(used, clock, dt) {
          since = used ? since + dt : 0;
          const pull = used ? Math.exp(-since * 1.8) : 0;
          group.rotation.z = Math.sin(clock * 1.4 + spot.at.x) * 0.012 + Math.sin(since * 7) * 0.08 * pull;
          group.position.y = spot.at.y + 1.15 - 0.3 * Math.exp(-since * 6) * (used ? 1 : 0);
        },
      };
    },
    floatBall: (spot) => {
      // A small ball adrift in a puddle, turning slowly and bobbing on the rain's rings.
      const group = new Group();
      const small = football(0.36);
      small.position.y = 0.26;
      group.add(small);
      return standing(spot, group, (clock) => {
        group.position.y = Math.sin(clock * 1.6) * 0.05;
        small.rotation.z = Math.sin(clock * 0.7) * 0.5;
        small.rotation.y = clock * 0.3;
      });
    },
    target: (spot) => {
      // A biathlon target on its stand: a black disc on a white plate, white too once it is hit. It stays.
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -1.2);
      const stand = new Mesh(new BoxGeometry(0.16, 2.2, 0.16), solid('#5a5a5e', 0.7));
      stand.position.y = 1.1;
      const plate = new Mesh(new BoxGeometry(1.1, 1.1, 0.08), solid('#e8e8e2', 0.7));
      plate.position.y = 2.6;
      const disc = new Mesh(new CylinderGeometry(0.38, 0.38, 0.06, 20), solid('#141414', 0.6));
      disc.rotation.x = Math.PI / 2;
      disc.position.set(0, 0, 0.06);
      plate.add(disc);
      // The cone he throws ("Kasta kotte"): from his hand up in an arc to the disc, which turns white as it hits and
      // shakes the plate; the cone drops away.
      const cone = new Mesh(new ConeGeometry(0.14, 0.42, 8), solid('#7a5232', 0.8));
      cone.visible = false;
      root.add(stand, plate, cone);
      const black = new Color('#141414');
      const white = new Color('#f2f2ee');
      const FLIGHT = 0.45;
      // Already hit when first drawn (a saved game): no throw is shown.
      let since = -1, first = true;
      return {
        group: root,
        update(used, _clock, dt) {
          since = !used ? -1 : since >= 0 ? since + dt : first ? 9 : 0;
          first = false;
          const k = since < 0 ? 0 : Math.min(1, since / FLIGHT);
          (disc.material as MeshStandardMaterial).color.copy(used && k >= 1 ? white : black);
          const after = Math.max(0, since - FLIGHT);
          cone.visible = since >= 0 && after < 0.6;
          if (cone.visible) {
            const fall = after * after * 14;
            cone.position.set(-0.5 * (1 - k), 1.0 + (2.6 - 1.0) * k + Math.sin(k * Math.PI) * 0.9 - fall, 1.2 * (1 - k) + 0.12);
            cone.rotation.set(since * 9, 0, since * 7);
          }
          plate.rotation.z = after > 0 ? Math.sin(after * 40) * 0.08 * Math.exp(-after * 6) : 0;
        },
      };
    },
    lifebuoy: (spot) => {
      // A life ring on its post: red and white, its rope coiled.
      const group = new Group();
      const pole = new Mesh(new CylinderGeometry(0.12, 0.12, 6, 8), solid('#e6e2d8', 0.7));
      pole.position.y = 3;
      const ring = new Group();
      for (let i = 0; i < 8; i++) {
        const piece = new Mesh(new TorusGeometry(1, 0.28, 8, 6, Math.PI / 4), solid(i % 2 ? '#f2f0ea' : '#d8352a', 0.5));
        piece.rotation.z = (i * Math.PI) / 4;
        ring.add(piece);
      }
      ring.position.set(0, 4.6, 0.3);
      group.add(pole, ring);
      return standing(spot, group, (clock) => { ring.rotation.z = Math.sin(clock * 1.7) * 0.12; });
    },
    flag: (spot) => {
      // A corner flag, snapping in the storm.
      const group = new Group();
      const pole = new Mesh(new CylinderGeometry(0.1, 0.1, 10, 6), solid('#f2e64a', 0.6));
      pole.position.y = 5;
      const cloth = new Mesh(new PlaneGeometry(3, 2, 6, 1), solid('#d83a2a', 0.8, { side: DoubleSide }));
      cloth.geometry.translate(1.5, 0, 0);
      cloth.position.y = 9;
      group.add(pole, cloth);
      const base = cloth.geometry.getAttribute('position').array.slice();
      return standing(spot, group, (clock) => {
        const at = cloth.geometry.getAttribute('position');
        for (let i = 0; i < at.count; i++) at.setZ(i, Math.sin(clock * 9 + base[i * 3]! * 2) * 0.35 * (base[i * 3]! / 3));
        at.needsUpdate = true;
      });
    },
    lantern: (spot) => {
      const group = new Group();
      group.add(new Mesh(new CylinderGeometry(0.35, 0.4, 0.9, 8), new MeshBasicMaterial({ color: '#ffd27a' })));
      const light = glow('#ffc070', 5, 0.7);
      group.add(light);
      group.position.y = 0.45;
      return standing(spot, group, (clock) => { (light.material as MeshBasicMaterial).opacity = 0.6 + 0.1 * Math.sin(clock * 7); });
    },
    deadLamp: (spot) => {
      // A flashlight the storm has put out, set down on the boards: a dull body and a pale, dark glass.
      const group = new Group();
      const body = new Mesh(new CylinderGeometry(0.1, 0.1, 0.62, 10).rotateZ(Math.PI / 2), solid('#3c4048', 0.5));
      const head = new Mesh(new CylinderGeometry(0.17, 0.11, 0.2, 12).rotateZ(-Math.PI / 2), solid('#50565e', 0.45));
      head.position.x = 0.4;
      const glass = new Mesh(new CircleGeometry(0.15, 12).rotateY(Math.PI / 2), solid('#aab4c0', 0.2));
      glass.position.x = 0.505;
      group.add(body, head, glass);
      group.position.y = 0.17;
      return standing(spot, group, () => {});
    },
    owlLanding: (spot) => {
      // It has seen the light, and comes in from the lake: down out of the storm, onto the jetty's end.
      const sitting = owl();
      const flying = owl(true);
      const root = new Group();
      root.add(sitting, flying);
      root.position.set(spot.at.x, spot.at.y, -0.6);
      let since = 0;
      return {
        group: root,
        update(used, clock, dt) {
          const called = elof.flags?.has('owl:call') ?? false;
          since = called ? since + dt : 0;
          const k = Math.min(1, since / 1.3);
          const left = (1 - k) ** 3;
          root.position.x = spot.at.x + left * 26;
          root.position.y = spot.at.y + left * 9;
          sitting.rotation.y = Math.sin(clock * 0.7) * 0.25;
          sitting.visible = k >= 1;
          flying.visible = k < 1;
          // Climbed onto, it is the owl that carries him (`stormExtra`).
          drawnWhile(root, called && !used && waitingOwl(root));
        },
      };
    },
    kit: (spot) => {
      // A thing of the nature kit, named by its word. Until it has come, a plain stone or nothing.
      const group = new Group();
      group.position.set(spot.at.x, spot.at.y, -0.6);
      const model = new Group();
      model.userData.model = spot.word;
      if (spot.word?.startsWith('hylla')) model.add(new Mesh(rock(Math.round(spot.at.x * 10), 1.1, 0.5, 0.9), solid('#7a7e80', 0.9, { flatShading: true })));
      group.add(model);
      const phase = spot.at.x * 1.7;
      // What is alive breathes, and what is afloat lifts on the water.
      if (spot.word === 'and' || spot.word === 'and-hona') {
        return { group, update: (_, clock) => { model.position.y = 0.05 * Math.sin(clock * 1.5 + phase); model.rotation.z = 0.04 * Math.sin(clock * 1.1 + phase); } };
      }
      // The beaver gnaws, looks at him, thumps its tail, and swims home to its lodge (./beaver.ts).
      if (spot.word === 'baver') return beaverLife(spot, group, model, () => pools, elof);
      // The hedgehog snuffles, the frog hops on the spot, the snail creeps (../../render/kit-life.ts).
      if (spot.word === 'igelkott' || spot.word === 'groda' || spot.word === 'snigel') {
        const rest = { x: 0, y: 0, turn: 0, size: 1 };
        return { group, update: (_, clock) => { kitLife(spot.word!, model, rest, clock, phase, elof.still); } };
      }
      return { group, update: () => {} };
    },
    aftermath: () => aftermath(),
    doll: (spot) => {
      // The doll at the foot of the toy shelf, in the small yellow raincoat Elof takes for the storm (../../render/elof-coat.ts):
      // without it once he has taken it. The room's models from Blender (art/blender/a2-room.py) take the plain shapes' place.
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, DOLL_Z);
      root.scale.setScalar(DOLL_SIZE);
      const doll = new Group();
      doll.userData.model = 'docka';
      doll.userData.disposeFallback = true;
      const dress = solid('#7fa6b8', 0.9), skin = solid('#f2cfb3', 0.7);
      const body = new Mesh(new CylinderGeometry(0.12, 0.17, 0.4, 12).translate(0, 0.22, 0), dress);
      const head = new Mesh(new SphereGeometry(0.155, 14, 10).translate(0, 0.62, -0.01), skin);
      const hair = new Mesh(new SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.64, 0.005), solid('#7a5232', 0.9));
      doll.add(body, head, hair);
      for (const side of [-1, 1]) {
        const leg = new Mesh(new CapsuleGeometry(0.05, 0.34, 4, 8).rotateX(Math.PI / 2).translate(side * 0.08, 0.055, 0.26), solid('#efe9e0', 0.9));
        const shoe = new Mesh(new SphereGeometry(0.06, 8, 6).scale(0.9, 1.2, 0.8).translate(side * 0.086, 0.08, 0.47), solid('#b8403a', 0.7));
        doll.add(leg, shoe);
      }
      const coat = new Group();
      coat.userData.model = 'docka-rock';
      coat.userData.disposeFallback = true;
      const yellow = solid(ELOF_COAT, 0.42);
      coat.add(new Mesh(new CylinderGeometry(0.1, 0.22, 0.46, 14, 1, true).translate(0, 0.27, 0), yellow));
      coat.add(new Mesh(new SphereGeometry(0.09, 10, 8).scale(1.1, 0.8, 0.5).translate(0, 0.4, -0.14), yellow));
      root.add(doll, coat);
      return {
        group: root,
        update(used) {
          // Taken off the doll the moment he takes it, into his hands (../../render/elof-coat.ts, `createHeldCoat`).
          drawnWhile(coat, !used && !(elof.flags?.has(`scene:${PUT_ON.scene}`) ?? false));
        },
      };
    },
    toyShelf: (spot) => {
      // A low toy shelf in the family's room, its front towards the camera: blocks, a ball, a ring tower, books, a truck.
      const root = new Group();
      root.position.set(spot.at.x, spot.at.y, -2);
      const model = new Group();
      model.userData.model = 'leksakshylla';
      model.userData.disposeFallback = true;
      const birch = solid('#dcbc8c', 0.8);
      for (const x of [-1.64, 1.64]) model.add(new Mesh(new BoxGeometry(0.12, 1.8, 1).translate(x, 0.9, 0), birch));
      for (const y of [0.14, 0.9, 1.78]) model.add(new Mesh(new BoxGeometry(3.3, 0.08, 1).translate(0, y, 0), birch));
      model.add(new Mesh(new BoxGeometry(3.3, 1.7, 0.06).translate(0, 0.9, -0.46), solid('#c4a070', 0.85)));
      root.add(model);
      return { group: root, update: () => {} };
    },
    // The same room on the evening of the storm, before anything has happened to it.
    homeEvening: () => ({ group: roomThings({ sofa: 24.4, lamp: 18.2, plant: 0.6, drawings: -20.6, rug: 14, blanket: false }), update: () => {} }),
    mormor: (spot) => figure(spot, 'mormor'),
    morfar: (spot) => figure(spot, 'morfar'),
    // At home in the morning her lantern has been put out.
    mormorHome: (spot) => figure(spot, 'mormor', false),
    reed: (spot) => {
      // Reeds standing out of the shallows: tall stems with brown seed heads, bending in the wind.
      const group = new Group();
      const stems: Group[] = [];
      for (let i = 0; i < 4; i++) {
        const stem = new Group();
        const tall = 3 + (i % 3) * 0.6;
        const shaft = new Mesh(new CylinderGeometry(0.03, 0.05, tall, 5), solid('#7a8a48', 0.9));
        shaft.position.y = tall / 2;
        const head = new Mesh(new CylinderGeometry(0.09, 0.09, 0.5, 7), solid('#5a3a22', 1));
        head.position.y = tall + 0.1;
        stem.add(shaft, head);
        stem.position.set((i - 1.5) * 0.35, 0, (i % 2) * 0.3);
        stems.push(stem);
        group.add(stem);
      }
      // The kit's bulrushes take their place, bending as one.
      const model = new Group();
      model.userData.model = Math.round(spot.at.x * 3) % 2 ? 'vass-a' : 'vass-b';
      model.userData.fit = 0.62;
      model.userData.turn = spot.at.x;
      for (const stem of stems) model.add(stem);
      group.add(model);
      return standing(spot, group, (clock) => { group.rotation.z = -0.03 + 0.04 * Math.sin(clock * 1.4 + spot.at.x); });
    },
  };
}

function rideLooks(): Record<string, (look: RideLook) => Object3D | null> {
  return {
    boot: () => boot(), umbrella: () => umbrella(),
    // Ridden, its back comes up under his seat: the flying owl hangs from his feet, and he sat in the air above it.
    // It is the owl he climbed onto, and it flies on when it has set him down (`stormExtra`).
    owl: () => { const g = new Group(); g.name = 'owl-ridden'; const bird = owl(true); bird.position.y = 0.5; g.add(bird); return g; },
    // The ball Bertil kicks, under his feet as it flies.
    football: () => { const g = new Group(); const b = football(0.8); b.position.y = -0.84; g.add(b); return g; },
    raft: () => { const g = new Group(); g.add(raft(3.2, 0.5)); g.children[0]!.position.y = -0.5; return g; },
  };
}

/** A raft of logs lashed together, with its top at `h`, `w` long. */
function raft(w: number, h: number): Group {
  const group = new Group();
  const logs = Math.max(3, Math.round(1.6 / 0.32));
  for (let i = 0; i < logs; i++) {
    const log = new Mesh(new CylinderGeometry(h / 2, h / 2, w, 8), solid(i % 2 ? '#7a5a3c' : '#6a4c32', 0.9));
    log.rotation.z = Math.PI / 2;
    log.position.set(0, h / 2, -0.8 + i * (1.6 / (logs - 1)));
    group.add(log);
  }
  for (const x of [-w * 0.35, w * 0.35]) {
    const rope = new Mesh(new BoxGeometry(0.12, h + 0.05, 1.8), solid('#c8b080', 0.9));
    rope.position.set(x, h / 2, 0);
    group.add(rope);
  }
  group.userData.model = 'flotte';
  group.userData.block = { width: w, height: h, depth: 2, x: 0, y: h * 1.5 };
  return group;
}

/** A little picture drawn in code, where there is anything to draw with. */
function drawnPicture(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext('2d');
  if (c) draw(c);
  return new CanvasTexture(canvas);
}

/** The light of a window lying on the floor: four soft panes on black, which added to the floor is nothing. */
const paneLight = () => drawnPicture(128, 128, (c) => {
  c.fillStyle = '#000';
  c.fillRect(0, 0, 128, 128);
  c.filter = 'blur(3px)';
  c.fillStyle = '#fff';
  for (const [x, y] of [[14, 14], [68, 14], [14, 68], [68, 68]] as const) c.fillRect(x, y, 46, 46);
});

/**
 * Sunday morning's room: what the night left. Wet raincoats on their hooks and boots in a pool, leaves blown in at the
 * window, mormor's lantern put out on the table, and the sun lying on the floor. All of it stands in the room's own
 * places, counted from the room's start. The coats go on dripping.
 */
function aftermath(): SpotProp {
  const group = new Group();
  const WALL = -8.5;
  const SILL = 3.2;
  const coats: BufferGeometry[] = [];
  // The very coats and boots they wore through the storm (../../render/rain-gear.ts).
  const WHO = ['pappa', 'mamma', 'moa', 'bertil'] as const;
  const COATS = WHO.map((who, i) => ({ x: [15.9, 17, 18.1, 19][i]!, tall: [2.7, 2.5, 1.9, 1.5][i]!, colour: RAIN_GEAR[who].coat }));
  coats.push(paint(new BoxGeometry(4.8, 0.16, 0.16).translate(17.75, 5.6, WALL - 0.24), '#6a4a2c'));
  for (const coat of COATS) {
    const mid = 5.45 - coat.tall / 2;
    coats.push(paint(new CylinderGeometry(0.3, 0.56, coat.tall, 10).scale(1, 1, 0.36).translate(coat.x, mid, WALL), coat.colour));
    coats.push(paint(new SphereGeometry(0.27, 10, 8).scale(1, 0.85, 0.6).translate(coat.x, 5.5, WALL), coat.colour));
  }
  // And beside them, small, the doll's raincoat Elof wore through the storm when he was small (../../render/elof-coat.ts).
  const LITTLE = { x: 19.85, tall: 0.6 };
  coats.push(paint(new CylinderGeometry(0.09, 0.2, LITTLE.tall, 10).scale(1, 1, 0.4).translate(LITTLE.x, 5.45 - LITTLE.tall / 2, WALL), ELOF_COAT));
  coats.push(paint(new SphereGeometry(0.1, 10, 8).scale(1, 0.85, 0.6).translate(LITTLE.x, 5.47, WALL), ELOF_COAT));
  for (const side of [-1, 1]) coats.push(paint(new CylinderGeometry(0.04, 0.045, 0.34, 6).rotateZ(side * 0.28).translate(LITTLE.x + side * 0.15, 5.2, WALL + 0.02), ELOF_COAT));
  const BOOTS = WHO.map((who, i) => ({ x: [15.8, 16.9, 18, 19][i]!, colour: RAIN_GEAR[who].boots }));
  for (const boot of BOOTS) {
    for (const side of [-0.2, 0.2]) {
      coats.push(paint(new BoxGeometry(0.3, 0.74, 0.26).translate(boot.x + side, 0.37, WALL + 1), boot.colour));
      coats.push(paint(new BoxGeometry(0.34, 0.16, 0.46).translate(boot.x + side, 0.08, WALL + 1.1), boot.colour));
    }
  }
  group.add(new Mesh(mergeGeometries(coats), new MeshStandardMaterial({ vertexColors: true, roughness: 0.42 })));
  group.add(roomThings({ sofa: 44.5, lamp: 36.4, plant: 55, drawings: 0, rug: 10, blanket: true }));
  // The pool they stand in: flat, and giving back the room's light.
  const pool = new Mesh(new CircleGeometry(1, 20).rotateX(-Math.PI / 2).scale(2.9, 1, 1.1).translate(17.4, 0.012, WALL + 1.3), new MeshStandardMaterial({ color: '#5a5040', roughness: 0.08, transparent: true, opacity: 0.55 }));
  group.add(pool);
  // The sun on the floor, one window's worth from each, lying a little aslant.
  const light = new PlaneGeometry(4.8, 10.5, 1, 1).rotateX(-Math.PI / 2);
  const at = light.getAttribute('position');
  for (let i = 0; i < at.count; i++) at.setX(i, at.getX(i) + at.getZ(i) * -0.42);
  const panes = mergeGeometries([4, 13, 22, 40, 49].map((x) => light.clone().translate(x + 0.8, 0.02, 1)));
  group.add(new Mesh(panes, new MeshBasicMaterial({ map: paneLight(), color: '#ffe6b0', transparent: true, opacity: 0.2, blending: AdditiveBlending, depthWrite: false, fog: false })));
  // Birch leaves that came in at the window with the storm.
  const random = scatter(61);
  const leaves = new InstancedMesh(new SphereGeometry(0.2, 6, 4).scale(1, 0.05, 0.68), new MeshStandardMaterial({ roughness: 0.75 }), 30);
  const place = new Object3D();
  const tint = new Color();
  for (let i = 0; i < leaves.count; i++) {
    const near = i % 3 === 0 ? 22 : i % 3 === 1 ? 13 : 40;
    place.position.set(near + (random() - 0.5) * 8, 0.03, 0.5 + random() * 5.5);
    place.rotation.set(0, random() * 6.28, (random() - 0.5) * 0.14);
    place.updateMatrix();
    leaves.setMatrixAt(i, place.matrix);
    leaves.setColorAt(i, tint.set(random() < 0.6 ? '#c9a23a' : '#a8703a').multiplyScalar(0.8 + random() * 0.3));
  }
  group.add(leaves);
  // Mormor's lantern on the table, put out.
  const out = lantern();
  out.light.visible = false;
  out.group.position.set(8, 2.68, -1.5);
  group.add(out.group);
  // A great tit on the sill of the window with the new latch: the storm is over, and it has come for what the night left.
  const tit = new Mesh(smallBird(BIRDS.tit), new MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }));
  tit.scale.setScalar(1);
  tit.position.set(22, SILL, WALL + 0.12);
  group.add(tit);
  // Three slow drops from the coats' hems.
  const fall = new SphereGeometry(0.05, 6, 4);
  const wet = solid('#b8ccdc', 0.1);
  const drops = [...COATS.slice(0, 3), LITTLE].map((coat, i) => {
    const drop = new Mesh(fall, wet);
    drop.position.set(coat.x, 0, WALL + 0.1);
    group.add(drop);
    return { drop, from: 5.45 - coat.tall, phase: i * 0.83 };
  });
  return {
    group,
    update(_used, clock) {
      // A hop along the sill now and then, a peck, and it turns about.
      const round = clock % 7.2;
      const hop = Math.max(0, 1 - Math.abs(round - 2) / 0.22);
      const back = Math.max(0, 1 - Math.abs(round - 5.4) / 0.22);
      const along = Math.min(1, Math.max(0, (round - 1.8) / 0.4)) - Math.min(1, Math.max(0, (round - 5.2) / 0.4));
      tit.position.x = 21.4 + along * 1.5;
      tit.position.y = SILL + (hop + back) * 0.16;
      tit.rotation.y = round > 2.2 && round < 5.2 ? Math.PI + 0.5 : 0.5;
      tit.rotation.z = (round > 3 && round < 3.4) || (round > 6.2 && round < 6.6) ? -0.6 : 0;
      for (const { drop, from, phase } of drops) {
        const k = (clock * 0.45 + phase) % 1;
        drop.position.y = from * (1 - k * k);
      }
    },
  };
}

/** The little one's hops when it is glad: short, and well apart. Its cap goes with them. */
/** A glad hop, from the ground at `t` = 0, each a little higher or lower than the last. */
const gladHop = (t: number) => {
  const beat = t * 2.6 / Math.PI, n = Math.floor(beat);
  const height = 0.24 * (0.8 + 0.4 * (Math.sin(n * 7.13) * 0.5 + 0.5));
  return Math.sin((beat - n) * Math.PI) ** 6 * height;
};

/**
 * A splash where something heavy goes into the water, `since` seconds after it did (before that, none): drops thrown
 * up and out, a crown of white that rises and falls back, and rings that spread on the water. Its origin is the
 * water's surface where it went in. With less motion only the rings.
 */
function waterSplash(size: number) {
  const group = new Group();
  const white = new MeshBasicMaterial({ color: '#e4edf2', transparent: true, opacity: 0, depthWrite: false });
  // The drops: one draw for them all.
  const drops = new InstancedMesh(new SphereGeometry(0.055 * size, 6, 4), white.clone(), 12);
  drops.instanceMatrix.setUsage(DynamicDrawUsage);
  drops.frustumCulled = false;
  group.add(drops);
  const thrown = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.3 * Math.sin(i * 7.1);
    return { vx: Math.cos(a) * (0.8 + 0.8 * ((i * 0.37) % 1)) * size, vz: Math.sin(a) * 0.5 * size, vy: (2.4 + 1.8 * ((i * 0.61) % 1)) * size };
  });
  const place = new Object3D();
  const crown = new Mesh(new CylinderGeometry(0.46 * size, 0.6 * size, 0.42 * size, 20, 1, true).translate(0, 0.21 * size, 0), white.clone());
  group.add(crown);
  const rings = [0, 0.3, 0.65].map((delay) => {
    const mesh = new Mesh(new RingGeometry(0.9, 1, 40).rotateX(-Math.PI / 2), white.clone());
    mesh.position.y = 0.015;
    group.add(mesh);
    return { mesh, delay };
  });
  drawnWhile(group, false);
  return {
    group,
    update(since: number, still: boolean) {
      const on = since >= 0 && since < 2.6;
      drawnWhile(group, on);
      if (!on) return;
      drops.visible = !still && since < 0.7;
      if (drops.visible) {
        for (const [i, d] of thrown.entries()) {
          place.position.set(d.vx * since, d.vy * since - 0.5 * GRAVITY * since * since, d.vz * since);
          place.scale.setScalar(place.position.y > -0.02 ? 1 : 0);
          place.updateMatrix();
          drops.setMatrixAt(i, place.matrix);
        }
        drops.instanceMatrix.needsUpdate = true;
        (drops.material as MeshBasicMaterial).opacity = 0.85 * (1 - since / 0.7);
      }
      const c = since / 0.45;
      crown.visible = !still && c < 1;
      crown.scale.set(1 + c * 0.8, 0.02 + Math.sin(Math.PI * Math.min(1, c)) * 1.2, 1 + c * 0.8);
      (crown.material as MeshBasicMaterial).opacity = 0.7 * (1 - c);
      for (const r of rings) {
        const k = (since - r.delay) / 1.9;
        r.mesh.visible = k > 0 && k < 1;
        r.mesh.scale.setScalar((0.5 + 2.4 * k) * size);
        (r.mesh.material as MeshBasicMaterial).opacity = 0.5 * (1 - k);
      }
    },
  };
}

/**
 * How far behind or in front of the play plane Flärken's stone and bark lie on the planks: the stone at the front, the
 * bark at the back, so that the stone rolls past the bark and not through it. In the water the bark floats under him.
 */
const STONE_Z = 0.6;
const BARK_Z = -0.6;
/** Where the stone sinks, a little nearer the play plane than where it lay. */
const STONE_Z_IN = 0.25;
/** How long the stone takes to roll to the edge, and how fast it sinks once the water has slowed it, in EL a second. */
const ROLL = 1.55;
const SINK = 1.3;

/** Where a thing standing on a chapter's ground at `x` comes to its edge going right, and the water's level beyond. */
function edgeAhead(chapter: ChapterData | null, x: number, y: number, to: number): { edge: number; water: number } {
  let edge = x;
  if (chapter) while (edge < to && heightAt(chapter, edge + 0.05) > y - 0.3) edge += 0.05;
  const water = chapter?.water?.find((w) => w.from <= to && w.to >= to)?.y ?? y - 0.6;
  return { edge: Math.min(edge, to), water };
}

/**
 * Flärken's round field stone (Olov, 9 November 2026: "Uppdraget med stenen som ska fylla luckan måste se bättre ut"),
 * art/blender/flarken.py's `grasten`: Elof's own idea, pushed out to fill the gap, where it sinks. The simulation takes
 * it from where it lies to where it ends, under the water, straight and in a moment; drawn so, it went through the
 * planks. Here it has its weight: it gathers way slowly, rolls along the planks turning as it goes, tips over the edge,
 * falls in with a splash, and sinks more slowly through the water to the bottom, bubbles coming up after it. Its shadow
 * lies on the planks under it. The chapter says the plop once it has gone under (`sjon:sunk`). With less motion it goes
 * the same way, without the splash's drops.
 */
function fieldStone(mover: Mover): Group {
  const outer = new Group();
  const r = mover.height / 2;
  const first = mover.stops[0]!;
  const last = mover.stops[mover.stops.length - 1]!;
  const holder = new Group();
  holder.userData.model = 'grasten';
  // Wet in the rain: its granite a little glossy.
  holder.userData.onModelInstalled = (model: Group) => model.traverse((node) => {
    const mesh = node as Mesh;
    const material = mesh.material as MeshStandardMaterial | undefined;
    if (!material?.isMeshStandardMaterial) return;
    mesh.material = material.clone();
    (mesh.material as MeshStandardMaterial).roughness = 0.42;
    mesh.castShadow = true;
  });
  // Until the kit's has come: a smooth grey stone as big.
  const standIn = new Mesh(new SphereGeometry(1, 24, 16).scale(mover.width / 2, r, r * 0.86), solid('#7a7974', 0.45));
  standIn.castShadow = true;
  holder.add(standIn);
  glowMap ??= glowTexture(32);
  const shade = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: '#000000', map: glowMap, transparent: true, opacity: 0.5, depthWrite: false }));
  shade.scale.set(mover.width * 1.7, 1, r * 2.1);
  const splash = waterSplash(1.1);
  // The bubbles that come up after it, one draw for them all.
  const air = new InstancedMesh(new SphereGeometry(0.075, 8, 6), new MeshBasicMaterial({ color: '#d8e6f0', transparent: true, opacity: 0.75, depthWrite: false }), 7);
  air.instanceMatrix.setUsage(DynamicDrawUsage);
  air.frustumCulled = false;
  drawnWhile(air, false);
  const bubbles = Array.from({ length: 7 }, (_, i) => ({ at: 0.15 + i * 0.32, size: 0.6 + 0.6 * ((i * 0.47) % 1), x: 0, y: 0 }));
  const place = new Object3D();
  outer.add(holder, shade, splash.group, air);

  let ready = false, edge = first.x, water = first.y - 0.6, span = 0, speed = 0, fall = 0, inAt = 0, entered = 0, start = 0;
  let state: 'unknown' | 'rest' | 'going' | 'sunk' = 'unknown';
  const at = { x: 0, y: 0, z: 0, turn: 0, planks: 1 };
  /** Where its middle is drawn `t` seconds after the push, how far it has turned, and how much of it is on the planks. */
  const path = (t: number) => {
    let rolled: number;
    if (t < ROLL) {
      // Gathering way: slowly at first, and rolling on at the edge.
      const u = Math.max(0, t) / ROLL;
      at.x = first.x + span * (2 * u * u - u * u * u);
      at.y = first.y + r;
      at.z = STONE_Z;
      at.planks = 1;
      rolled = at.x - first.x;
    } else if (t < inAt) {
      // Over the edge and falling, as he falls; while it still touches the planks' end it turns about it.
      const k = t - ROLL;
      at.x = edge + 0.85 * speed * k;
      at.y = first.y + r - 0.5 * GRAVITY * k * k;
      const off = Math.hypot(at.x - edge, at.y - first.y);
      if (off < r) {
        at.x = edge + ((at.x - edge) / off) * r;
        at.y = first.y + ((at.y - first.y) / off) * r;
      }
      at.z = STONE_Z + (STONE_Z_IN - STONE_Z) * (k / fall);
      at.planks = Math.max(0, 1 - k / 0.12);
      rolled = at.x - first.x;
    } else {
      // In the water: slowed at once, then sinking steadily to the bottom, drifting on a little and turning less.
      const k = t - inAt;
      const drop = SINK * k + (GRAVITY * fall - SINK) * 0.25 * (1 - Math.exp(-k / 0.25));
      at.x = entered + (last.x - entered) * (1 - Math.exp(-k / 0.6));
      at.y = Math.max(last.y + r, water + r - drop);
      at.z = STONE_Z_IN;
      at.planks = 0;
      rolled = entered - first.x + 0.85 * speed * 0.7 * (1 - Math.exp(-k / 0.7));
    }
    at.turn = -rolled / r;
    return at;
  };
  outer.userData.tick = (clock: number) => {
    const mesh = outer.parent;
    if (!mesh) return;
    if (!ready) {
      ({ edge, water } = edgeAhead(playing.chapter, first.x, first.y, last.x));
      span = edge - first.x;
      speed = span / ROLL;
      fall = Math.sqrt((2 * Math.max(0.05, first.y - water)) / GRAVITY);
      inAt = ROLL + fall;
      entered = edge + 0.85 * speed * fall;
      // Each bubble rises from where the stone was when it let it go.
      for (const b of bubbles) { path(inAt + b.at); b.x = at.x; b.y = at.y + r * 0.4; }
      ready = true;
    }
    const sx = mesh.position.x, sy = mesh.position.y;
    const atFirst = Math.abs(sx - first.x) < 1e-3 && Math.abs(sy - first.y) < 1e-3;
    if (state === 'unknown') state = Math.abs(sx - last.x) < 1e-3 && Math.abs(sy - last.y) < 1e-3 ? 'sunk' : 'rest';
    if (state === 'rest' && !atFirst) { state = 'going'; start = clock; }
    if (state !== 'rest' && atFirst) state = 'rest';
    const t = state === 'rest' ? 0 : state === 'sunk' ? 60 : clock - start;
    path(t);
    // It draws its own way: the simulation's lean and squash are not its.
    mesh.rotation.z = 0;
    mesh.scale.set(1, 1, 1);
    holder.position.set(at.x - sx, at.y - sy, at.z);
    holder.rotation.set(0, 0, at.turn);
    shade.position.set(at.x - sx, first.y + 0.015 - sy, at.z);
    shade.visible = at.planks > 0;
    (shade.material as MeshBasicMaterial).opacity = 0.5 * at.planks;
    splash.group.position.set(entered - sx, water - sy, STONE_Z_IN);
    splash.update(state === 'going' ? t - inAt : -1, elof.still);
    let rising = false;
    for (const [i, b] of bubbles.entries()) {
      const since = state === 'going' ? t - inAt - b.at : -1;
      const rise = b.y + since * 1.7;
      const up = since > 0 && rise < water;
      rising ||= up;
      place.position.set(b.x - sx + Math.sin(since * 9 + b.at * 5) * 0.06, rise - sy, STONE_Z_IN + 0.1);
      place.scale.setScalar(up ? b.size : 0);
      place.updateMatrix();
      air.setMatrixAt(i, place.matrix);
    }
    air.instanceMatrix.needsUpdate = true;
    drawnWhile(air, rising);
  };
  return outer;
}

/**
 * Flärken's bark (art/blender/flarken.py, `barkbit`), which fills the gap once the stone has sunk: it lies at the back
 * of the planks, behind the stone, and is pushed along them. The simulation's last push takes it straight from the
 * planks to where it floats in the gap, through the planks' end; drawn here, it slides to the edge, tips over it, goes
 * in with a splash, bobs up again and floats under him, mostly under the water, rocking a little.
 */
function barkRaft(mover: Mover): Group {
  const outer = new Group();
  const holder = new Group();
  holder.name = 'bark-holder';
  holder.userData.model = 'barkbit';
  const splash = waterSplash(0.9);
  outer.add(holder, splash.group);
  const before = mover.stops[mover.stops.length - 2]!;
  const last = mover.stops[mover.stops.length - 1]!;
  /** How long it slides to the edge, and how long it takes from tipping to being in the water. */
  const SLIDE = 0.32, DROP = 0.3;
  let ready = false, edge = before.x, water = last.y + mover.height * 0.6, start = 0;
  let state: 'unknown' | 'planks' | 'going' | 'afloat' = 'unknown';
  outer.userData.tick = (clock: number) => {
    const mesh = outer.parent;
    if (!mesh) return;
    if (!ready) {
      ({ edge, water } = edgeAhead(playing.chapter, before.x, before.y, last.x));
      ready = true;
    }
    const sx = mesh.position.x, sy = mesh.position.y;
    // On the planks, give or take the little way past a stop that a push settles back from.
    const onPlanks = sx <= before.x + 0.2 && sy >= before.y - 0.05;
    if (state === 'unknown') state = Math.abs(sx - last.x) < 1e-3 && Math.abs(sy - last.y) < 1e-3 ? 'afloat' : 'planks';
    if (state === 'planks' && !onPlanks) { state = 'going'; start = clock; }
    if (state !== 'planks' && onPlanks) state = 'planks';
    if (state === 'planks') {
      // On the planks it slides as the simulation has it, at the back.
      holder.position.set(0, 0, BARK_Z);
      holder.rotation.set(0, 0, 0);
      splash.update(-1, elof.still);
      return;
    }
    const t = state === 'afloat' ? 60 : clock - start;
    // Where its middle is when it tips: a little over the edge.
    const over = edge + mover.width * 0.12;
    const tipped = over + (last.x - over) * 0.7;
    let x: number, y: number, tip: number;
    if (t < SLIDE) {
      const u = t / SLIDE;
      x = before.x + (over - before.x) * (1.6 * u - 0.6 * u * u);
      y = before.y;
      tip = 0;
    } else if (t < SLIDE + DROP) {
      const k = (t - SLIDE) / DROP;
      x = over + (tipped - over) * k;
      y = before.y + (last.y - 0.22 - before.y) * k * k;
      tip = -0.45 * Math.sin(Math.PI * k);
    } else {
      // Under, and up again: it bobs a few times and settles where it floats.
      const k = t - SLIDE - DROP;
      x = tipped + (last.x - tipped) * (1 - Math.exp(-k / 0.3));
      y = last.y - 0.22 * Math.exp(-k / 0.28) * Math.cos(k * 6.5);
      tip = 0.07 * Math.exp(-k / 0.35) * Math.sin(k * 8);
    }
    const z = BARK_Z * (1 - smooth(t / (SLIDE + DROP)));
    // Afloat, it rocks a little on the water.
    const bob = elof.still ? 0 : Math.sin(clock * 1.9) * 0.02;
    const rock_ = elof.still ? 0 : Math.sin(clock * 1.3 + 1) * 0.015;
    mesh.rotation.z = 0;
    mesh.scale.set(1, 1, 1);
    holder.position.set(x - sx, y + bob - sy, z);
    holder.rotation.set(0, 0, tip + rock_);
    // In it goes where its foot meets the water as it tips.
    splash.group.position.set(over + (tipped - over) * 0.6 - sx, water - sy, 0);
    splash.update(t - SLIDE - DROP * 0.6, elof.still);
  };
  return outer;
}

/** The fallen long arm of Klonk's seesaw comes to rest with its top on the ground. */
const TIPPED = -0.16;

/** The barn door at the top of the planks in Billsta: how wide and tall it is drawn, and where it hangs, behind the path. */
const BARN_DOOR = { wide: 2.4, tall: 5.4, back: -1.6, thick: 0.18, swing: 1.62 };

/**
 * The loft door of mormor's barn, at the top of the planks up to it (Billsta; Olov, 9 November 2026: "Mormor ska gå fram
 * och öppna ladan"): Falu red boards with a white frame and the white Z of its braces, iron straps on its hinges and a
 * ring to pull it by, in a white door frame with a piece of the barn's red wall going back from it. The simulation lifts
 * the door's block up out of his way when it opens (`DOOR`, ./chapters/billsta.ts); the picture keeps the frame where
 * it stands and swings the door in on its hinges as the block goes up. Two draws: the frame, and the door.
 */
function barnDoor(mover: Mover): Group {
  const { wide, tall, back, thick, swing } = BARN_DOOR;
  const closed = mover.stops[0]!.y;
  const travel = Math.max(1e-3, mover.stops[mover.stops.length - 1]!.y - closed);
  const front = back + wide;
  const RED = ['#8a2f25', '#7c2a21', '#93342a', '#842c23'];
  const WHITE = '#e6e1d4';
  const IRON = '#202022';
  // The frame and the wall: they stay where they stand.
  const frame: BufferGeometry[] = [];
  for (const z of [back - 0.12, front + 0.12]) frame.push(box(0.26, tall + 0.36, 0.24, 0, (tall + 0.36) / 2 - 0.05, z, WHITE));
  frame.push(box(0.28, 0.26, wide + 0.6, 0, tall + 0.2, back + wide / 2, WHITE));
  frame.push(box(0.34, 0.12, wide + 0.3, 0, 0.03, back + wide / 2, '#9a8a70'));
  // The wall going back from the door, boards with battens over their joints, and a little of it over the lintel.
  const wall = { from: back - 0.24, to: -4.4, top: tall + 1.2 };
  const boards = Math.round((wall.from - wall.to) / 0.55);
  for (let i = 0; i < boards; i++) {
    const z = wall.from - (i + 0.5) * ((wall.from - wall.to) / boards);
    frame.push(box(0.16, wall.top, (wall.from - wall.to) / boards - 0.03, -0.02, wall.top / 2, z, RED[i % RED.length]!));
    if (i > 0) frame.push(box(0.2, wall.top, 0.09, 0.02, wall.top / 2, z + (wall.from - wall.to) / boards / 2, '#6e251d'));
  }
  frame.push(box(0.16, wall.top - tall - 0.33, wide + 0.6, -0.02, (wall.top + tall + 0.33) / 2, back + wide / 2, RED[2]!));
  const frameMaterial = solid('#ffffff', 0.85, { vertexColors: true });
  paintedWood(frameMaterial);
  const frameMesh = new Mesh(mergeGeometries(frame), frameMaterial);
  frameMesh.castShadow = true;
  // The door, on its hinges at its back edge: upright boards, a white frame on its face, the white Z of its braces.
  const leaf: BufferGeometry[] = [];
  const planks = 5;
  for (let i = 0; i < planks; i++) {
    leaf.push(box(thick, tall - 0.04, wide / planks - 0.04, 0, tall / 2, (i + 0.5) * (wide / planks), RED[i % RED.length]!));
  }
  for (const side of [-1, 1]) {
    const x = side * (thick / 2 + 0.03);
    for (const y of [0.16, tall - 0.16]) leaf.push(box(0.06, 0.24, wide - 0.08, x, y, wide / 2, WHITE));
    for (const z of [0.12, wide - 0.12]) leaf.push(box(0.06, tall - 0.08, 0.2, x, tall / 2, z, WHITE));
    leaf.push(box(0.06, 0.2, wide - 0.3, x, tall * 0.52, wide / 2, WHITE));
    // The diagonals of the Z, in the lower and the upper half.
    for (const [low, high] of [[0.3, tall * 0.52], [tall * 0.52, tall - 0.3]] as const) {
      const run = wide - 0.5, rise = high - low;
      leaf.push(paint(new BoxGeometry(0.06, Math.hypot(run, rise), 0.18).rotateX(-Math.atan2(run, rise) * side).translate(x, (low + high) / 2, wide / 2), WHITE));
    }
  }
  // Iron straps over the hinges, and the ring to pull it by, near its free edge.
  for (const y of [0.9, tall - 0.9]) leaf.push(box(thick + 0.1, 0.16, wide * 0.42, 0, y, wide * 0.21, IRON));
  leaf.push(paint(new TorusGeometry(0.16, 0.035, 6, 14).rotateY(Math.PI / 2).translate(-thick / 2 - 0.08, tall * 0.45, wide - 0.32), IRON));
  const leafMaterial = solid('#ffffff', 0.85, { vertexColors: true });
  paintedWood(leafMaterial);
  const leafMesh = new Mesh(mergeGeometries(leaf), leafMaterial);
  leafMesh.castShadow = true;
  const hinge = new Group();
  hinge.name = 'barn-door-hinge';
  hinge.position.z = back;
  hinge.add(leafMesh);
  const held = new Group();
  held.add(frameMesh, hinge);
  const group = new Group();
  group.add(held);
  // Each frame: the simulation's block has gone up `lift`; the picture stays where it stood and the door swings in.
  group.userData.tick = () => {
    const lift = (group.parent?.position.y ?? closed) - closed;
    held.position.y = -lift;
    if (group.parent) { group.parent.rotation.z = 0; group.parent.scale.set(1, 1, 1); }
    const open = Math.min(1, Math.max(0, lift / travel));
    hinge.rotation.y = swing * open * open * (3 - 2 * open);
  };
  return group;
}

function moverLooks(): Record<string, (mover: Mover) => Group | null> {
  return {
    boulder: (mover) => {
      // A round field stone, as wide and as high as the thing it is to the simulation, with moss on its shaded side.
      const group = new Group();
      const stone = new Mesh(rock(Math.round(mover.width * 37), mover.width / 2 * 1.06, mover.height / 2 * 1.04, mover.width * 0.46), solid('#7a7e80', 0.86, { flatShading: true }));
      stone.position.y = mover.height / 2;
      stone.castShadow = true;
      const moss = new Mesh(rock(Math.round(mover.width * 41), mover.width * 0.3, mover.height * 0.2, mover.width * 0.3), solid('#55703e', 0.95, { flatShading: true }));
      moss.position.set(-mover.width * 0.16, mover.height * 0.86, 0.04);
      group.add(stone, moss);
      return group;
    },
    riverLog: (mover) => {
      // A sawn log floating half under, its top level where he stands (./river-log.ts): the kit's fallen branch, fitted
      // to the thing's box, lay 0.47 to 0.78 under his feet.
      const group = new Group();
      const log = new Mesh(riverLogShape(mover.width, mover.height, logSeed(mover.id)), riverLogWood());
      log.name = 'river-log';
      log.castShadow = true;
      log.receiveShadow = true;
      group.add(log);
      return group;
    },
    lid: (mover) => {
      // The rain barrel's round wooden lid, floating: boards across it, and a handle.
      const group = new Group();
      const lid = new Mesh(new CylinderGeometry(mover.width / 2, mover.width / 2, mover.height, 24), solid('#8a6a44', 0.85));
      lid.position.y = mover.height / 2;
      group.add(lid);
      for (const x of [-0.25, 0.25]) {
        const seam = new Mesh(new BoxGeometry(0.03, mover.height * 1.02, mover.width * 0.9), solid('#5a4428', 0.9));
        seam.position.set(x * mover.width, mover.height / 2, 0);
        group.add(seam);
      }
      return group;
    },
    fieldstone: (mover) => fieldStone(mover),
    bark: (mover) => {
      const outer = barkRaft(mover);
      const group = outer.getObjectByName('bark-holder')!;
      // Until the kit's has come (art/blender/flarken.py, `barkbit`): pine bark, grey-brown and furrowed, pale enough to
      // be told in the storm's dark.
      const slab = new Mesh(new BoxGeometry(mover.width, mover.height, 1.2, 6, 2, 3), solid('#9a7656', 1, { flatShading: true, emissive: '#3a2614', emissiveIntensity: 0.5 }));
      const at = slab.geometry.getAttribute('position');
      const r = scatter(Math.round(mover.width * 100));
      // Rounded off along its top, as a thick piece of bark is, and uneven.
      for (let i = 0; i < at.count; i++) if (at.getY(i) > 0) {
        at.setY(i, at.getY(i) + (r() - 0.5) * 0.08);
        at.setX(i, at.getX(i) * 0.9);
        at.setZ(i, at.getZ(i) * 0.8);
      }
      slab.geometry.computeVertexNormals();
      slab.position.y = mover.height / 2;
      group.add(slab);
      // The cracks along its face, between the bark's plates, and its paler top where he will stand.
      for (const [k, y] of [0.3, 0.62, 0.95].entries()) {
        const crack = new Mesh(new BoxGeometry(mover.width * (0.7 - k * 0.12), 0.06, 0.04), solid('#4a3424', 1));
        crack.position.set((k - 1) * 0.3, mover.height * y, 0.6 - y * 0.12);
        crack.rotation.z = (k - 1) * 0.05;
        group.add(crack);
      }
      const top = new Mesh(new BoxGeometry(mover.width * 0.86, 0.06, 0.9), solid('#b8966e', 1));
      top.position.y = mover.height + 0.02;
      group.add(top);
      return outer;
    },
    'swing-sign': (mover) => {
      // A shop's sign on two chains: a plain painted board with a border, and no letter on it.
      const group = new Group();
      const board = new Mesh(new BoxGeometry(mover.width, mover.height, 0.12), solid('#2f5a6a', 0.7));
      board.position.y = mover.height / 2;
      const border = new Mesh(new BoxGeometry(mover.width * 0.85, mover.height * 0.6, 0.13), solid('#e6c66a', 0.6));
      border.position.y = mover.height / 2;
      group.add(board, border);
      for (const x of [-0.4, 0.4]) {
        const chain = new Mesh(new CylinderGeometry(0.02, 0.02, 3, 4), solid('#3a3a3a', 0.5, { metalness: 0.5 }));
        chain.position.set(x * mover.width, mover.height + 1.5, 0);
        group.add(chain);
      }
      return group;
    },
    football: (mover) => { const g = new Group(); g.add(football(Math.min(mover.width, mover.height) / 2)); return g; },
    raft: (mover) => { const g = new Group(); g.add(raft(mover.width, mover.height)); return g; },
    buoy: (mover) => {
      // A swimming buoy: a white float with a red band, bobbing.
      const g = new Group();
      const float = new Mesh(new SphereGeometry(mover.width / 2, 14, 10), solid('#f2f0ea', 0.4));
      float.scale.y = mover.height / mover.width;
      float.position.y = mover.height / 2;
      const band = new Mesh(new TorusGeometry(mover.width / 2 * 0.98, 0.08, 6, 20), solid('#d8352a', 0.5));
      band.rotation.x = Math.PI / 2;
      band.position.y = mover.height / 2;
      g.add(float, band);
      return g;
    },
    'hut-door': (mover) => {
      // Flärken's second hut's old door, sliding on its rail (buildings.ts, hutDoorway): upright planks with dark gaps,
      // a Z of braces, a ring handle to pull it by on its left, and two hangers whose wheels run on the rail over it.
      // The mover is its top, where he stands; the door hangs from there to just over the sill when it is shut.
      const w = mover.width, top = mover.height, tall = mover.stops[0]!.y + top - 0.04;
      const wood: BufferGeometry[] = [];
      const planks = Math.max(4, Math.round(w / 0.42));
      const tones = ['#7a5532', '#6c4a2a', '#835c37', '#71502d'];
      for (let i = 0; i < planks; i++) {
        wood.push(box(w / planks - 0.05, tall - 0.04, 0.12, -w / 2 + (i + 0.5) * (w / planks), top - tall / 2, 0, tones[i % tones.length]!));
      }
      const brace = '#8c6640';
      for (const y of [0.17, 0.83]) wood.push(box(w - 0.14, 0.22, 0.08, 0, top - tall + tall * y, 0.1, brace));
      const run = w - 0.34, rise = tall * 0.66;
      const diagonal = box(Math.hypot(run, rise), 0.2, 0.08, 0, 0, 0, brace);
      diagonal.rotateZ(-Math.atan2(rise, run)).translate(0, top - tall / 2, 0.1);
      wood.push(diagonal);
      // A worn board along its top, which he stands on.
      wood.push(box(w + 0.04, 0.1, 0.24, 0, top - 0.05, 0, '#8e6a44'));
      const door = new Mesh(mergeGeometries(wood), solid('#ffffff', 0.85, { vertexColors: true }));
      const iron: BufferGeometry[] = [];
      for (const x of [-w * 0.32, w * 0.32]) {
        iron.push(box(0.12, 0.34, 0.04, x, top + 0.05, -0.06, '#1d1d1f'));
        iron.push(new CylinderGeometry(0.09, 0.09, 0.06, 12).rotateX(Math.PI / 2).translate(x, top + 0.22, -0.1));
      }
      iron.push(box(0.14, 0.3, 0.04, -w / 2 + 0.26, top - tall * 0.5, 0.16, '#1d1d1f'));
      iron.push(new TorusGeometry(0.1, 0.025, 6, 12).translate(-w / 2 + 0.26, top - tall * 0.5 - 0.1, 0.18));
      const metal = new Mesh(mergeGeometries(iron.map((g) => (g.index ? g.toNonIndexed() : g)).map((g) => { g.deleteAttribute('uv'); g.deleteAttribute('color'); return g; })), solid('#1d1d1f', 0.5, { metalness: 0.4 }));
      const group = new Group();
      group.add(door, metal);
      return group;
    },
    'barn-door': (mover) => barnDoor(mover),
    'jetty-plank': (mover) => {
      const group = new Group();
      const plank = new Mesh(new BoxGeometry(mover.width, mover.height, 1.4), solid('#8c7a62', 0.9));
      plank.position.y = mover.height / 2;
      group.add(plank);
      return group;
    },
  };
}

/** Puts Äventyr 2's pictures into the renderer's extension points. */
export function installPictures(): void {
  for (const [id, look] of Object.entries(LOOKS)) PACK.looks.set(id, look);
  for (const [look, make] of Object.entries(spotLooks())) PACK.spots.set(look, make);
  for (const [look, make] of Object.entries(rideLooks())) PACK.rides.set(look, make);
  for (const [look, make] of Object.entries(moverLooks())) PACK.movers.set(look, make);
  if (!PACK.extras.includes(stormExtra)) PACK.extras.push(stormExtra);
}

/** For the tests: the looks, and which chapters have a dimmed sky. */
export const NIGHT = { looks: LOOKS, dim: DIM, colourOf: (hex: string) => new Color(hex) };

/** The paddle board's size, in EL: Mamma is 5.2 tall, a family board about twice that; its deck stands at `top` over the water. */
const BOARD = { long: 7.4, wide: 2.4, thick: 0.42, top: 1.2 };

/**
 * A stand-up paddle board, as the family has (Olov, 6 November 2026): a long flat board with a rounded nose and a
 * squarer tail, white rails and a coloured deck, a dark grooved traction pad where one stands, a carry handle in
 * the middle and a coiled leash at the tail. No print, name or mark. It lies along x, its middle at the origin,
 * which is the water's level; its deck is `BOARD.top` over it, level with the jetty he walks off.
 */
function paddleBoard(): Group {
  const group = new Group();
  group.name = 'paddle-board';
  const { long, wide, thick, top } = BOARD;
  const half = long / 2, side = wide / 2;
  const outline = (inset: number) => {
    const s = new Shape();
    const l = half - inset, w = side - inset;
    // The tail: square with rounded corners; the nose: a long curve to a rounded point.
    s.moveTo(-l + 0.5, -w);
    s.lineTo(l * 0.35, -w);
    s.bezierCurveTo(l * 0.8, -w, l, -w * 0.45, l, 0);
    s.bezierCurveTo(l, w * 0.45, l * 0.8, w, l * 0.35, w);
    s.lineTo(-l + 0.5, w);
    s.quadraticCurveTo(-l, w, -l, w - 0.5);
    s.lineTo(-l, -w + 0.5);
    s.quadraticCurveTo(-l, -w, -l + 0.5, -w);
    return s;
  };
  const bevel = 0.09;
  const body = new ExtrudeGeometry(outline(0), { depth: thick - bevel * 2, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 20 })
    .rotateX(-Math.PI / 2).translate(0, top - thick + bevel, 0);
  // The deck in a clear sea colour, the rails and the underside white.
  group.add(new Mesh(body, [solid('#2a9db0', 0.5), solid('#eef1ef', 0.45)]));
  // The traction pad: dark, grooved in diamonds, over the back two thirds of the deck.
  const pad = drawnPad();
  const padGeometry = new BoxGeometry(long * 0.5, 0.03, wide - 0.5).translate(-long * 0.12, top + 0.015, 0);
  const padUv = padGeometry.getAttribute('uv');
  for (let i = 0; i < padUv.count; i++) padUv.setXY(i, padUv.getX(i) * 6, padUv.getY(i) * 3);
  group.add(new Mesh(padGeometry, new MeshStandardMaterial({ color: '#4a4f55', map: pad, roughness: 0.95 })));
  // The carry handle, sunk in the middle of the deck, and the leash coiled at the tail.
  group.add(new Mesh(new BoxGeometry(0.7, 0.05, 0.28).translate(0.55, top + 0.025, 0), solid('#1f2226', 0.7)));
  const leash = new Mesh(new TorusGeometry(0.28, 0.035, 6, 20).rotateX(Math.PI / 2).translate(-half + 0.6, top + 0.04, 0.4), solid('#e0462f', 0.6));
  group.add(leash);
  // The fin under the tail, mostly in the water.
  group.add(new Mesh(new BoxGeometry(0.5, 0.45, 0.05).translate(-half + 0.8, top - thick - 0.2, 0), solid('#2b2e33', 0.6)));
  for (const mesh of group.children) mesh.castShadow = true;
  return group;
}

/** The traction pad's diamond grooves, drawn once. */
function drawnPad(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#ffffff';
  c.fillRect(0, 0, 64, 64);
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.lineWidth = 3;
  for (let k = -64; k < 128; k += 16) {
    c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 64, 64); c.stroke();
    c.beginPath(); c.moveTo(k + 64, 0); c.lineTo(k, 64); c.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
