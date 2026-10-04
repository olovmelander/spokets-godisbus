import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry, DoubleSide, DynamicDrawUsage,
  Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, Points, RepeatWrapping, ShaderMaterial, SRGBColorSpace, SphereGeometry, Vector2, type Texture,
} from 'three';
import type { ChapterData, PlaceId, SurfaceKind } from '../sim/types';
import { outlook, outlookPane, scenery } from './backdrop';
import type { Grade } from './grade';
import { fronts, street } from './village';

/**
 * How a place looks (plan §5.3, §5.4): its light, its haze, its grade, and the layers that are built around
 * the play plane. A chapter names its place, and the view dresses the chapter's ground in it.
 *
 * Everything here is made in code, so it costs no download: the far plates and the foreground are drawn on
 * small canvases, which makes them soft the way an out-of-focus layer is. Plates rendered in Blender and
 * scanned materials replace the drawn ones place by place (plan §5.6).
 */
export interface PlaceLook {
  id: PlaceId;
  grade: Grade;
  /** The haze: its colour, and where it begins and ends, counted from the play plane away from the camera. */
  haze: { colour: string; near: number; far: number };
  /** The backdrop, from the top of the picture to the bottom, and the glow where the sun stands. */
  sky: { top: string; middle: string; bottom: string; glow: string };
  hemisphere: { sky: string; ground: string; intensity: number };
  /** The sun: low, warm and from behind, so that everything on the play plane gets a bright rim. */
  sun: { colour: string; intensity: number; from: readonly [number, number, number] };
  /** A faint cool light from the camera's side: it lifts the faces that the sun leaves in shade. */
  fill: { colour: string; intensity: number };
  /** Its water, and the soft tussocks that float in it. */
  water: { colour: string; opacity: number };
  tussock: string;
}

/** Granskogen at noon: deep green and mossy gold, shafts of light, cool shade. */
const FOREST: PlaceLook = {
  id: 'forest',
  grade: { tint: [1.04, 1.01, 0.94], exposure: 1.08, contrast: 1.08, saturation: 1.12, vignette: 0.32, grain: 0.03 },
  haze: { colour: '#b4c79a', near: 4, far: 62 },
  sky: { top: '#2c4a44', middle: '#e6ebb0', bottom: '#587246', glow: '#fff8d2' },
  hemisphere: { sky: '#cfe4ea', ground: '#5b6a34', intensity: 1.35 },
  sun: { colour: '#ffd9a0', intensity: 3.6, from: [-7, 5, -4] },
  fill: { colour: '#d6e6ff', intensity: 0.75 },
  water: { colour: '#3f8f9c', opacity: 0.8 },
  tussock: '#9aa246',
};

/** Gården at ten in the morning: dew, bright greens, the first yellow leaves, and the red house in the sun. */
const GARDEN: PlaceLook = {
  id: 'garden',
  grade: { tint: [1.04, 1.01, 0.95], exposure: 1.05, contrast: 1.07, saturation: 1.1, vignette: 0.28, grain: 0.025 },
  haze: { colour: '#cfe2ea', near: 6, far: 80 },
  sky: { top: '#6fa9d8', middle: '#d9ecf4', bottom: '#b4d28e', glow: '#fff4c8' },
  hemisphere: { sky: '#dcecff', ground: '#7d8f48', intensity: 1.35 },
  sun: { colour: '#ffe2ae', intensity: 3.6, from: [-7, 4.5, -3.5] },
  fill: { colour: '#e8f0ff', intensity: 0.8 },
  water: { colour: '#4f9fc4', opacity: 0.78 },
  tussock: '#a9c05a',
};

/** Myren in the late afternoon: a low gold sun over rust-red moss, dark pools, and silver mist. */
const BOG: PlaceLook = {
  id: 'bog',
  grade: { tint: [1.05, 1.0, 0.92], exposure: 1.05, contrast: 1.06, saturation: 1.06, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#dccfb4', near: 5, far: 70 },
  sky: { top: '#93a9be', middle: '#f1dfb6', bottom: '#bfa878', glow: '#fff1c4' },
  hemisphere: { sky: '#e8e2d2', ground: '#7d6a3c', intensity: 1.3 },
  sun: { colour: '#ffcf88', intensity: 3.5, from: [-8, 3.2, -4] },
  fill: { colour: '#e6e6f4', intensity: 0.75 },
  water: { colour: '#34423f', opacity: 0.9 },
  tussock: '#a3ae8c',
};

/** Berget in the golden hour: grey granite and white lichen under a pink-orange sky, haze in the valley. */
const MOUNTAIN: PlaceLook = {
  id: 'mountain',
  grade: { tint: [1.06, 0.99, 0.95], exposure: 1.04, contrast: 1.07, saturation: 1.08, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#e9b9a0', near: 6, far: 95 },
  sky: { top: '#6a78ae', middle: '#f7b78c', bottom: '#c98c74', glow: '#ffe2b4' },
  hemisphere: { sky: '#f0d4dc', ground: '#84705e', intensity: 1.25 },
  sun: { colour: '#ffae6c', intensity: 3.7, from: [-8, 2.6, -3] },
  fill: { colour: '#e8dcf0', intensity: 0.75 },
  water: { colour: '#4f7f9c', opacity: 0.8 },
  tussock: '#b9b08a',
};

/** The final, at the blue hour: the same summit, in blue, with the first stars. Night falls on it later. */
const DUSK: PlaceLook = {
  id: 'dusk',
  grade: { tint: [0.95, 0.99, 1.08], exposure: 1.02, contrast: 1.06, saturation: 1.0, vignette: 0.34, grain: 0.035 },
  haze: { colour: '#38446e', near: 6, far: 85 },
  sky: { top: '#16224c', middle: '#3c4c80', bottom: '#5c5a84', glow: '#9a86a8' },
  hemisphere: { sky: '#93a6e0', ground: '#3c3c54', intensity: 1.1 },
  sun: { colour: '#b8c0ff', intensity: 1.5, from: [-7, 5, -4] },
  fill: { colour: '#b0bcff', intensity: 0.65 },
  water: { colour: '#2c3c64', opacity: 0.85 },
  tussock: '#6a6f80',
};

/** At home: the kitchen on a Saturday morning, and the veranda in the evening. Warm, and built of boards. */
const HOME: PlaceLook = {
  id: 'home',
  grade: { tint: [1.05, 1.0, 0.93], exposure: 1.04, contrast: 1.05, saturation: 1.05, vignette: 0.3, grain: 0.025 },
  haze: { colour: '#e8d8b8', near: 8, far: 90 },
  sky: { top: '#d9c8a6', middle: '#f0e2c4', bottom: '#b79f78', glow: '#fff4d2' },
  hemisphere: { sky: '#fff0d8', ground: '#8a7250', intensity: 1.3 },
  sun: { colour: '#ffe0aa', intensity: 3.0, from: [-7, 5, -3] },
  fill: { colour: '#fff0e0', intensity: 0.8 },
  water: { colour: '#4f9fc4', opacity: 0.78 },
  tussock: '#b9a07e',
};

/** Byn on a Saturday morning in October: a clear cool sky, a low sun along the street, warm shop windows. */
const VILLAGE: PlaceLook = {
  id: 'village',
  grade: { tint: [1.03, 1.0, 0.97], exposure: 1.04, contrast: 1.06, saturation: 1.06, vignette: 0.3, grain: 0.03 },
  haze: { colour: '#d8dde6', near: 8, far: 95 },
  sky: { top: '#7fa6d6', middle: '#dfe8f2', bottom: '#b8b4ac', glow: '#fff0cc' },
  hemisphere: { sky: '#e6eefc', ground: '#6e6a66', intensity: 1.25 },
  sun: { colour: '#ffe2b0', intensity: 3.4, from: [-8, 3.4, -4] },
  fill: { colour: '#e4ecff', intensity: 0.75 },
  water: { colour: '#4a5a6a', opacity: 0.85 },
  tussock: '#9a9a96',
};

export const PLACES: Record<PlaceId, PlaceLook> = { forest: FOREST, garden: GARDEN, bog: BOG, mountain: MOUNTAIN, dusk: DUSK, home: HOME, village: VILLAGE };

/** What the view adds to its scene for a place, and moves each frame. */
export interface Dressing {
  group: Group;
  background: Texture;
  update(cameraX: number, groundY: number, clock: number, night?: number): void;
}

// --- small tools ----------------------------------------------------------------------------------------

/** A fixed sequence of numbers from 0 to 1: the same scatter in every session and every screenshot. */
function sequence(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth noise from 0 to 1. */
function noise(x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** The ground's height at x, read from the chapter's outline. */
function heightAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** Whether things can grow at x: fairly level ground, not the bottom of a pit, and not under water. */
function grows(chapter: ChapterData, x: number): boolean {
  if (surfaceAt(chapter, x) !== undefined) return false;
  const here = heightAt(chapter, x);
  if ((chapter.water ?? []).some((w) => x >= w.from - 0.5 && x <= w.to + 0.5 && here < w.y)) return false;
  if (Math.abs(heightAt(chapter, x + 0.4) - here) > 0.3 || Math.abs(heightAt(chapter, x - 0.4) - here) > 0.3) return false;
  return here > Math.min(heightAt(chapter, x - 3.5), heightAt(chapter, x + 3.5)) - 2.5;
}

/** What the ground is made of at x, where the chapter says it is something else than the place's own. */
function surfaceAt(chapter: ChapterData, x: number): SurfaceKind | undefined {
  return chapter.surfaces?.find((s) => x >= s.from && x <= s.to)?.kind;
}

/** A picture drawn in code, as a texture. Drawn small, it is soft when it fills a large card. */
function drawn(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void, tiled = false): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  if (tiled) texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

// --- L0: the backdrop ------------------------------------------------------------------------------------

function backdrop(look: PlaceLook): CanvasTexture {
  return drawn(256, 256, (c) => {
    const down = c.createLinearGradient(0, 0, 0, 256);
    down.addColorStop(0, look.sky.top);
    down.addColorStop(0.42, look.sky.middle);
    down.addColorStop(0.7, look.sky.middle);
    down.addColorStop(1, look.sky.bottom);
    c.fillStyle = down;
    c.fillRect(0, 0, 256, 256);
    // Where the sun stands behind the trees: a wide soft glow, up to the left.
    const glow = c.createRadialGradient(70, 95, 4, 70, 95, 170);
    glow.addColorStop(0, look.sky.glow);
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = glow;
    c.fillRect(0, 0, 256, 256);
  });
}

/**
 * The first stars, separate from the stretched sky gradient. Point sprites are square in framebuffer
 * pixels, so each soft circle stays round in portrait, landscape and every graphics tier. They sit at
 * the far depth, before the transparent hills: rock, people, clouds and ridges still hide them.
 */
function stars(): Points {
  const next = sequence(19);
  const positions: number[] = [];
  const sizes: number[] = [];
  const lights: number[] = [];
  for (let i = 0; i < 110; i++) {
    lights.push(0.35 + next() * 0.6);
    sizes.push(1.6 + next() * 1.5);
    positions.push(next() * 2 - 1, 1 - next() ** 1.6 * (300 / 256), 0);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('size', new Float32BufferAttribute(sizes, 1));
  geometry.setAttribute('light', new Float32BufferAttribute(lights, 1));
  const material = new ShaderMaterial({
    uniforms: { pixelRatio: { value: 1 }, colour: { value: new Color('#fffcf0') } },
    vertexShader: /* glsl */ `
      attribute float size;
      attribute float light;
      uniform float pixelRatio;
      varying float brightness;
      void main() {
        gl_Position = vec4(position.xy, 1.0, 1.0);
        gl_PointSize = size * pixelRatio;
        brightness = light;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 colour;
      varying float brightness;
      void main() {
        float round = 1.0 - smoothstep(0.2, 0.5, length(gl_PointCoord - vec2(0.5)));
        if (round < 0.01) discard;
        gl_FragColor = vec4(colour, round * brightness);
        #include <colorspace_fragment>
      }
    `,
    transparent: true, depthWrite: false, toneMapped: false,
  });
  const points = new Points(geometry, material);
  points.name = 'dusk-stars';
  points.frustumCulled = false;
  points.renderOrder = -4;
  points.onBeforeRender = (renderer) => { material.uniforms.pixelRatio!.value = renderer.getPixelRatio(); };
  return points;
}

// --- L3: the ground ---------------------------------------------------------------------------------------

/** The moss, in three greens and a gold, as numbers from 0 to 1. */
const MOSS = [new Color('#35521f'), new Color('#587a27'), new Color('#7f9a30'), new Color('#b3ae45')];
const SOIL = new Color('#3d2f20');

function mossAt(x: number, z: number, out: Color): Color {
  const n = noise(x * 0.42 + 3, z * 0.6 + 11) * 0.65 + noise(x * 1.9, z * 2.3) * 0.35;
  const at = Math.min(2.999, Math.max(0, n * 3.4 - 0.2));
  const i = Math.floor(at);
  return out.copy(MOSS[i]!).lerp(MOSS[i + 1]!, at - i);
}

/** Fine speckles, to be multiplied with the moss's colour: the grain of a moss carpet seen close. */
function speckles(): CanvasTexture {
  const next = sequence(5);
  return drawn(256, 256, (c) => {
    c.fillStyle = '#c9c9c9';
    c.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 5200; i++) {
      const light = next() > 0.5;
      const v = light ? 215 + next() * 40 : 120 + next() * 70;
      c.fillStyle = `rgba(${v},${v},${v},${0.35 + next() * 0.4})`;
      const r = 0.6 + next() * 1.9;
      c.beginPath();
      c.arc(next() * 256, next() * 256, r, 0, Math.PI * 2);
      c.fill();
    }
  }, true);
}

/**
 * The ground as a bank of moss: level behind the play plane, and rounding off towards the camera into the
 * dark, instead of ending in a cut face. Across the play plane itself it is as level as the simulation's
 * ground, so that feet stand on it.
 */
const PROFILE = [
  { z: -16, drop: -0.6, shade: 0.62, bump: 0.5 },
  { z: -10, drop: -0.25, shade: 0.72, bump: 0.4 },
  { z: -5.5, drop: 0, shade: 0.84, bump: 0.26 },
  { z: -2.6, drop: 0, shade: 0.94, bump: 0.14 },
  { z: -0.9, drop: 0, shade: 1, bump: 0.05 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: 0.45, drop: 0, shade: 1, bump: 0 },
  { z: 0.95, drop: 0.07, shade: 0.95, bump: 0.05 },
  { z: 1.5, drop: 0.4, shade: 0.8, bump: 0.12 },
  { z: 2.1, drop: 1.2, shade: 0.62, bump: 0.12 },
  { z: 2.6, drop: 3, shade: 0.44, bump: 0.05 },
  { z: 2.9, drop: 16, shade: 0.26, bump: 0 },
];
/** The shade is cool: what the sun doesn't reach is lit by the sky. */
const SHADE = new Color('#27413f');

/** The edge of a deck: level to its front, then the board's end, and the dark under it. */
const PROFILE_BOARD = [
  { z: -16, drop: 0, shade: 0.7, bump: 0 },
  { z: -10, drop: 0, shade: 0.8, bump: 0 },
  { z: -5.5, drop: 0, shade: 0.9, bump: 0 },
  { z: -2.6, drop: 0, shade: 0.96, bump: 0 },
  { z: -0.9, drop: 0, shade: 1, bump: 0 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: 0.45, drop: 0, shade: 1, bump: 0 },
  { z: 1.1, drop: 0, shade: 1, bump: 0 },
  { z: 1.1, drop: 0.22, shade: 0.8, bump: 0 },
  { z: 0.85, drop: 0.24, shade: 0.3, bump: 0 },
  { z: 0.85, drop: 1.4, shade: 0.14, bump: 0 },
  { z: 0.85, drop: 16, shade: 0.06, bump: 0 },
];

/** The bog's ground: as the bank in front, and sinking under the water behind the path. */
const PROFILE_ISLAND = PROFILE.map((row, i) => (i < 3 ? { ...row, drop: [3.2, 1.7, 0.3][i]!, bump: row.bump * 0.6 } : row));

/** What the ground is made of: a place's own, or what a chapter marks a stretch as. */
type Ground = 'moss' | 'lawn' | 'sphagnum' | 'granite' | SurfaceKind;
interface GroundLook {
  /** Four tones, from deep to bright. */
  colours: Color[];
  /** A wall's face, and what the shade goes towards. */
  wall: Color;
  shade: Color;
  /** How much it rolls: 1 as moss does, 0 for something built. */
  bump: number;
  /** Boards: a straight front edge, a tone for each board, and the boards' drawing. */
  boards: boolean;
  /** It goes down into the water behind the path: the bog's ground is islands. */
  sinks?: boolean;
}
const tones = (...hex: string[]) => hex.map((h) => new Color(h));
const GROUNDS: Record<Ground, GroundLook> = {
  moss: { colours: MOSS, wall: SOIL, shade: SHADE, bump: 1, boards: false },
  lawn: { colours: tones('#3f6a22', '#5c962b', '#7fb238', '#aecb52'), wall: new Color('#4a3826'), shade: new Color('#2a4a3a'), bump: 0.8, boards: false },
  sphagnum: { colours: tones('#6e3226', '#8f4d2b', '#7d8a36', '#bca94c'), wall: new Color('#2e241c'), shade: new Color('#2a3438'), bump: 1, boards: false, sinks: true },
  granite: { colours: tones('#8a8d94', '#a0a3a8', '#b6b7b8', '#cfccc8'), wall: new Color('#6a6c72'), shade: new Color('#3a3848'), bump: 0.25, boards: false },
  wood: { colours: tones('#a48a69', '#b49a78', '#c2a988', '#ccb696'), wall: new Color('#a38866'), shade: new Color('#1d1712'), bump: 0, boards: true },
  earth: { colours: tones('#57432e', '#695037', '#7a5e41', '#8a6c4b'), wall: new Color('#4a3826'), shade: new Color('#1f1a16'), bump: 0.5, boards: false },
  stone: { colours: tones('#767879', '#8a8c8a', '#9b9c97', '#adaca4'), wall: new Color('#6f7172'), shade: new Color('#2c3438'), bump: 0.3, boards: false },
  shavings: { colours: tones('#d6bb8a', '#e3cb9b', '#eedab0', '#f5e6c4'), wall: new Color('#cbb07d'), shade: new Color('#6a5a40'), bump: 0.6, boards: false },
  hedge: { colours: tones('#1f4a1c', '#2f6424', '#3f7a2a', '#588c34'), wall: new Color('#254a1e'), shade: new Color('#16301c'), bump: 1.3, boards: false },
  // The village street: pale slabs, dark asphalt with a little grit, and the grate's iron.
  paving: { colours: tones('#9c9a94', '#aeaca5', '#bdbbb3', '#cbc8be'), wall: new Color('#8e8c88'), shade: new Color('#3a3c44'), bump: 0, boards: false },
  asphalt: { colours: tones('#4c4f56', '#575a61', '#62656b', '#70727a'), wall: new Color('#45484e'), shade: new Color('#24262c'), bump: 0.12, boards: false },
  iron: { colours: tones('#2e3136', '#383b41', '#44474d', '#52555b'), wall: new Color('#26282c'), shade: new Color('#14161a'), bump: 0, boards: false },
};
/** How wide a deck board is: 12 cm. */
const BOARD = 0.8;

function toneAt(kind: Ground, x: number, z: number, out: Color): Color {
  const look = GROUNDS[kind];
  const n = look.boards ? hash(Math.floor(x / BOARD), 3) : noise(x * 0.42 + 3, z * 0.6 + 11) * 0.65 + noise(x * 1.9, z * 2.3) * 0.35;
  const at = Math.min(2.999, Math.max(0, n * 3.4 - 0.2));
  const i = Math.floor(at);
  return out.copy(look.colours[i]!).lerp(look.colours[i + 1]!, at - i);
}

/** Deck boards, two to a tile: the grain runs along each, and a dark gap lies between them. */
function boards(): CanvasTexture {
  const next = sequence(43);
  return drawn(128, 128, (c) => {
    c.fillStyle = '#d6d2cc';
    c.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 90; i++) {
      const x = next() * 128;
      const v = next() < 0.5 ? 150 + next() * 50 : 225 + next() * 30;
      c.strokeStyle = `rgba(${v},${v},${v},${0.25 + next() * 0.3})`;
      c.lineWidth = 0.6 + next() * 1.6;
      c.beginPath();
      c.moveTo(x, 0);
      c.bezierCurveTo(x + (next() - 0.5) * 3, 40, x + (next() - 0.5) * 3, 90, x, 128);
      c.stroke();
    }
    c.fillStyle = 'rgba(30,22,16,0.9)';
    for (const x of [0, 62, 126]) c.fillRect(x, 0, 2.5, 128);
  }, true);
}

interface BankPoint {
  x: number;
  y: number;
  wall: boolean;
  kind: Ground;
}

/** The ground of a chapter, as one mesh for each stretch of one kind of ground. */
function bank(chapter: ChapterData, own: Ground): Group {
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const outline = [{ x: first.x - 16, y: first.y }, ...line, { x: last.x + 16, y: last.y }];
  // Points along the outline, close enough together for the moss to roll. A wall keeps its two corners.
  const points: BankPoint[] = [];
  let before = false;
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!;
    const b = outline[i + 1]!;
    const dx = b.x - a.x;
    const steep = Math.abs(b.y - a.y) > Math.abs(dx) * 1.3;
    const pieces = Math.max(1, Math.ceil(Math.abs(dx) / 0.45));
    for (let k = 0; k < pieces; k++) {
      const x = a.x + (dx * k) / pieces;
      // The corner at a wall's top or foot is a wall's too.
      points.push({ x, y: a.y + ((b.y - a.y) * k) / pieces, wall: steep || before, kind: surfaceAt(chapter, x) ?? own });
      before = steep;
    }
  }
  points.push({ x: last.x + 16, y: last.y, wall: false, kind: own });

  const maps = { speckles: speckles(), boards: boards() };
  const group = new Group();
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i < points.length && points[i]!.kind === points[start]!.kind) continue;
    // A stretch takes the next one's first point too, so that the two meet.
    group.add(stretchOfGround(points.slice(start, Math.min(points.length, i + 1)), points[start]!.kind, maps));
    start = i;
  }
  return group;
}

function stretchOfGround(points: BankPoint[], kind: Ground, maps: { speckles: CanvasTexture; boards: CanvasTexture }): Mesh {
  const look = GROUNDS[kind];
  const profile = look.boards ? PROFILE_BOARD : look.sinks ? PROFILE_ISLAND : PROFILE;
  const position: number[] = [];
  const colour: number[] = [];
  const uv: number[] = [];
  const c = new Color();
  const tile = look.boards ? 1 / (BOARD * 2) : 0.55;
  for (const p of points) {
    for (const row of profile) {
      const swell = p.wall ? 0 : row.bump * look.bump * (noise(p.x * 1.15, row.z * 1.4 + 7) - 0.5) * 2;
      position.push(p.x, p.y - row.drop + swell, row.z);
      toneAt(kind, p.x, row.z, c);
      if (p.wall) c.lerp(look.wall, 0.82);
      c.lerp(look.shade, (1 - row.shade) * 0.9);
      colour.push(c.r, c.g, c.b);
      uv.push(p.x * tile, (row.z - row.drop - (p.wall ? p.y : 0)) * tile);
    }
  }
  const index: number[] = [];
  const rows = profile.length;
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = 0; j < rows - 1; j++) {
      const a = i * rows + j;
      const b = (i + 1) * rows + j;
      index.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, map: look.boards ? maps.boards : maps.speckles, roughness: look.boards ? 0.8 : 1 }));
  mesh.frustumCulled = false;
  return mesh;
}

// --- L2 and L3: what grows and lies there --------------------------------------------------------------------

/** One blade of grass, standing at the origin and bending a little forward: 1 high. */
function blade(): BufferGeometry {
  const position: number[] = [];
  const index: number[] = [];
  const steps = 4;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const half = 0.5 * (1 - t) ** 1.4;
    position.push(-half, t, t * t * 0.28, half, t, t * t * 0.28);
    if (i < steps) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}

/** Bark for the trunks: dark, with lighter ridges running up it. Multiplied with each trunk's own colour. */
function bark(): CanvasTexture {
  const next = sequence(31);
  return drawn(128, 256, (c) => {
    c.fillStyle = '#9a8f84';
    c.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 260; i++) {
      const x = next() * 128;
      const y = next() * 256 - 256;
      // Dark furrows, and fewer pale plates of bark between them.
      const v = next() < 0.62 ? 30 + next() * 60 : 190 + next() * 65;
      c.strokeStyle = `rgba(${v},${v * 0.92},${v * 0.82},${0.35 + next() * 0.45})`;
      c.lineWidth = 1 + next() * 4;
      const bend = [(next() - 0.5) * 8, (next() - 0.5) * 8, (next() - 0.5) * 6, 60 + next() * 40];
      // Drawn again a tile higher, so that the bark joins itself where it repeats.
      for (const lift of [0, 256]) {
        c.beginPath();
        c.moveTo(x, y + lift);
        c.bezierCurveTo(x + bend[0]!, y + lift + 22, x + bend[1]!, y + lift + 44, x + bend[2]!, y + lift + bend[3]!);
        c.stroke();
      }
    }
  }, true);
}

/** The shapes and materials of the forest floor, made once and shared by every stretch. */
function kit() {
  const profile = [[0, -0.5], [0.13, -0.42], [0.19, -0.2], [0.2, 0.05], [0.15, 0.3], [0.07, 0.46], [0, 0.5]];
  return {
    ball: new SphereGeometry(1, 8, 6),
    blade: blade(),
    cone: new LatheGeometry(profile.map(([r, y]) => new Vector2(r!, y!)), 9),
    needle: new BoxGeometry(1, 0.012, 0.014),
    trunk: trunk(),
    boulder: boulder(),
    moss: new MeshStandardMaterial({ roughness: 1 }),
    // The sun stands behind the grass and shines through: a little light of its own stands in for that.
    grass: new MeshStandardMaterial({ roughness: 0.7, side: DoubleSide, emissive: '#5d7a1e', emissiveIntensity: 0.55 }),
    leaf: new MeshStandardMaterial({ color: '#2f5a26', roughness: 0.35 }),
    berry: new MeshStandardMaterial({ color: '#c4202a', roughness: 0.25 }),
    coneWood: new MeshStandardMaterial({ color: '#7a4f2c', roughness: 0.85, flatShading: true }),
    needleWood: new MeshStandardMaterial({ color: '#8a5a2e', roughness: 1 }),
    bark: new MeshStandardMaterial({ map: bark(), vertexColors: true, roughness: 0.95 }),
    stone: new MeshStandardMaterial({ roughness: 0.95, vertexColors: true }),
    // The garden's.
    stalk: new CylinderGeometry(0.02, 0.028, 1, 6).translate(0, 0.5, 0),
    lawn: new MeshStandardMaterial({ roughness: 0.65, side: DoubleSide, emissive: '#4f8a1c', emissiveIntensity: 0.5 }),
    dew: new MeshStandardMaterial({ color: '#e9f6ff', roughness: 0.05, emissive: '#bfe4ff', emissiveIntensity: 0.35, transparent: true, opacity: 0.8 }),
    stem: new MeshStandardMaterial({ color: '#7fae45', roughness: 0.7 }),
    petal: new MeshStandardMaterial({ color: '#f2c81e', roughness: 0.6, emissive: '#a07400', emissiveIntensity: 0.25 }),
    clover: new MeshStandardMaterial({ color: '#3f8a34', roughness: 0.5 }),
    birchLeaf: new MeshStandardMaterial({ color: '#e6c53a', roughness: 0.6 }),
    birch: new MeshStandardMaterial({ map: birchBark(), roughness: 0.8 }),
    // The bog's and the mountain's.
    bare: boulder(false),
    straw: new MeshStandardMaterial({ roughness: 0.75, side: DoubleSide, emissive: '#8a7430', emissiveIntensity: 0.45 }),
    redLeaf: new MeshStandardMaterial({ color: '#c4472c', roughness: 0.55, emissive: '#70200c', emissiveIntensity: 0.3 }),
    orangeLeaf: new MeshStandardMaterial({ color: '#dd8a2c', roughness: 0.6, emissive: '#7a3c08', emissiveIntensity: 0.25 }),
    deadwood: new MeshStandardMaterial({ color: '#a9a69e', roughness: 1 }),
    lichen: new MeshStandardMaterial({ color: '#ecebdf', roughness: 1 }),
    crowLeaf: new MeshStandardMaterial({ color: '#2f4c2c', roughness: 0.5 }),
    blackBerry: new MeshStandardMaterial({ color: '#1e1e2a', roughness: 0.25 }),
  };
}
let KIT: ReturnType<typeof kit>;

/**
 * A spruce's trunk, turned: wide roots at its foot, then a pillar. It is mossy at the foot and bark above,
 * painted on its vertices, and the bark's drawing is multiplied with that.
 */
function trunk(): BufferGeometry {
  const profile: [number, number][] = [[1.9, 0], [1.55, 0.35], [1.25, 0.9], [1.08, 1.8], [1.01, 3.2], [1, 8], [0.98, 20], [0.95, 60]];
  const geometry = new LatheGeometry(profile.map(([r, y]) => new Vector2(r, y)), 22);
  const at = geometry.getAttribute('position');
  const uv = geometry.getAttribute('uv');
  const colour: number[] = [];
  const moss = new Color('#4d6b26');
  const wood = new Color('#7d6753');
  const c = new Color();
  for (let i = 0; i < at.count; i++) {
    const y = at.getY(i);
    // The moss climbs the roots, higher on one side.
    const green = Math.max(0, 1 - y / (1.3 + 0.9 * Math.sin(Math.atan2(at.getZ(i), at.getX(i)))));
    c.copy(wood).lerp(moss, Math.min(1, green * 1.3));
    colour.push(c.r, c.g, c.b);
    // The bark runs up the trunk at one size, not stretched by the lathe's own rows.
    uv.setXY(i, uv.getX(i) * 3, y / 6);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  return geometry;
}

/** A stone: a round thing pushed out of shape, grey below and mossy on top. */
function boulder(mossy = true): BufferGeometry {
  // A sphere's points are shared between its faces, so the stone is smooth when it is pushed out of shape.
  const geometry = new SphereGeometry(1, 22, 16);
  const at = geometry.getAttribute('position');
  const colour: number[] = [];
  const grey = new Color('#8f918d');
  const c = new Color();
  for (let i = 0; i < at.count; i++) {
    const x = at.getX(i);
    const y = at.getY(i);
    const z = at.getZ(i);
    const swell = 0.82 + 0.3 * noise(x * 1.4 + 5, y * 1.4 + z * 1.1) + 0.1 * noise(x * 4, z * 4 + y * 3);
    at.setXYZ(i, x * swell, y * swell, z * swell);
    mossAt(x * 3, z * 3, c);
    const green = mossy ? Math.min(1, Math.max(0, (y - 0.05) * 2.2 + (noise(x * 3, z * 3) - 0.5))) : 0;
    c.lerpColors(grey, c, green).multiplyScalar(0.75 + 0.25 * noise(x * 6, y * 6 + z * 5));
    colour.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** How long a stretch of scatter is: each is drawn only while it is in the picture. */
const STRETCH = 18;

/** Everything that stands and lies on the moss, in stretches along the chapter. */
function scatter(chapter: ChapterData, from: number, to: number, place: PlaceId): Group {
  const group = new Group();
  // Indoors nothing grows.
  if (place === 'home') return group;
  const build = { forest: stretch, garden: lawn, bog, mountain: fell, dusk: fell, village: street }[place];
  for (let a = from - 12; a < to + 12; a += STRETCH) group.add(build(chapter, a, a + STRETCH, Math.round(a * 7 + 97)));
  return group;
}

/** One stretch of it, each kind as one instanced mesh. */
function stretch(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  /** A depth behind the play plane or just in front of it, never where he walks. */
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  // Moss cushions: what makes the carpet a carpet.
  const cushions = new InstancedMesh(KIT.ball, KIT.moss, Math.round(length * 22));
  let n = 0;
  for (let i = 0; i < cushions.count; i++) {
    const x = from + next() * length;
    const z = depth(6.5, 0.22);
    if (!grows(chapter, x)) continue;
    // Many small ones and a few big; low where he walks, so that his boots show.
    const size = (0.06 + next() ** 2.2 * 0.3) * (z > 0.45 ? 0.55 : 1);
    const low = Math.abs(z) < 0.7 ? 0.5 : 1;
    place.position.set(x, top(x, z) - size * 0.35, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * (1 + next() * 0.5), size * low * (0.75 + next() * 0.45), size * (1 + next() * 0.5));
    place.updateMatrix();
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, mossAt(x * 2.1, z * 2.1, tint).multiplyScalar(0.85 + next() * 0.4));
  }
  cushions.count = n;

  // Grass and sedge: thin blades in tufts, mostly behind him, some already autumn gold.
  const grass = new InstancedMesh(KIT.blade, KIT.grass, Math.round(length * 9));
  n = 0;
  for (let tuft = 0; n < grass.count && tuft < grass.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.12 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6.5;
    if (!grows(chapter, x)) continue;
    const tall = z > 0 ? 0.35 + next() * 0.4 : 0.7 + next() * 1.6;
    const gold = next() < 0.3;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && n < grass.count; k++) {
      const bx = x + (next() - 0.5) * 0.3;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.25);
      place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
      place.scale.set(0.07 + next() * 0.07, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      grass.setMatrixAt(n, place.matrix);
      grass.setColorAt(n++, gold ? tint.set('#c9b54e').multiplyScalar(0.8 + next() * 0.3) : tint.set('#6f9434').multiplyScalar(0.7 + next() * 0.5));
    }
  }
  grass.count = n;

  // Lingonberry sprigs: small glossy leaves, and red berries the size of his fist.
  const sprigs = Math.round(length * 1.1);
  const leaves = new InstancedMesh(KIT.ball, KIT.leaf, Math.max(1, sprigs * 6));
  const berries = new InstancedMesh(KIT.ball, KIT.berry, Math.max(1, sprigs * 3));
  let leaf = 0;
  let berry = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3.2, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z);
    const turn = next() * 6.28;
    for (let k = 0; k < 6; k++) {
      const a = turn + k * 1.05;
      const h = 0.1 + k * 0.045;
      place.position.set(x + Math.cos(a) * 0.09, y + h, z + Math.sin(a) * 0.09);
      place.rotation.set(0.5, -a, 0.35);
      place.scale.set(0.085, 0.016, 0.05);
      place.updateMatrix();
      leaves.setMatrixAt(leaf++, place.matrix);
    }
    for (let k = 0; k < 1 + Math.floor(next() * 3); k++) {
      const a = turn + 0.5 + k * 2.1;
      place.position.set(x + Math.cos(a) * 0.12, y + 0.1 + next() * 0.07, z + Math.sin(a) * 0.12);
      place.rotation.set(0, 0, 0);
      place.scale.setScalar(0.05 + next() * 0.012);
      place.updateMatrix();
      berries.setMatrixAt(berry++, place.matrix);
    }
  }
  leaves.count = leaf;
  berries.count = berry;

  // Spruce cones, half an Elof long, lying where they fell; and the needles under everything.
  const cones = new InstancedMesh(KIT.cone, KIT.coneWood, Math.max(1, Math.round(length * 0.32)));
  n = 0;
  for (let i = 0; i < cones.count; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.15);
    if (!grows(chapter, x) || Math.abs(z) < 0.6) continue;
    place.position.set(x, top(x, z) + 0.13, z);
    place.rotation.set(Math.PI / 2 + (next() - 0.5) * 0.3, next() * 6.28, next() * 6.28, 'YXZ');
    place.scale.setScalar(0.42 + next() * 0.14);
    place.updateMatrix();
    cones.setMatrixAt(n++, place.matrix);
  }
  cones.count = n;
  const needles = new InstancedMesh(KIT.needle, KIT.needleWood, Math.round(length * 7));
  n = 0;
  for (let i = 0; i < needles.count; i++) {
    const x = from + next() * length;
    const z = depth(4.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.012, z);
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.3);
    place.scale.set(0.16 + next() * 0.14, 1, 1);
    place.updateMatrix();
    needles.setMatrixAt(n++, place.matrix);
  }
  needles.count = n;

  // The spruces themselves: trunks like pillars, 2.7 EL across, with a foot of roots and moss.
  const trunks = new InstancedMesh(KIT.trunk, KIT.bark, Math.ceil(length / 4.5) + 1);
  n = 0;
  for (let x = from + next() * 4; x < to && n < trunks.count; x += 4.5 + next() * 6.5) {
    // Some stand close behind the path, and more of them further in.
    const z = next() < 0.3 ? -3.6 - next() * 2.5 : -7 - next() * 15;
    const radius = (1 + next() * 0.45) * (z < -12 ? 0.8 : 1);
    if (!grows(chapter, x)) continue;
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.04);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 1, radius);
    place.updateMatrix();
    trunks.setMatrixAt(n, place.matrix);
    trunks.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.8 + next() * 0.4));
  }
  trunks.count = n;

  // Stones under the moss.
  const stones = new InstancedMesh(KIT.boulder, KIT.stone, Math.max(1, Math.round(length * 0.2)));
  n = 0;
  for (let i = 0; i < stones.count; i++) {
    const x = from + next() * length;
    const z = -1.3 - next() * 5;
    if (!grows(chapter, x)) continue;
    const size = 0.25 + next() * 0.55;
    place.position.set(x, top(x, z) + size * 0.15, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * 1.3, size * 0.8, size);
    place.updateMatrix();
    stones.setMatrixAt(n, place.matrix);
    stones.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.85 + next() * 0.3));
  }
  stones.count = n;

  for (const mesh of [cushions, grass, leaves, berries, cones, needles, trunks, stones]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Its bounds are those of its instances, so a stretch out of the picture is not drawn.
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

// --- L4: the foreground ---------------------------------------------------------------------------------

/** A tuft of grass far out of focus, drawn small and dark: it frames the picture from below. */
/** What the soft growth in front and far behind is like: the forest's dark, the garden's bright, the bog's straw. */
type Growth = 'dark' | 'bright' | 'straw';

function blurredTuft(seed: number, growth: Growth = 'dark'): CanvasTexture {
  const next = sequence(seed);
  const lift = growth === 'bright' ? 1.45 : 1;
  const straw = growth === 'straw';
  return drawn(96, 96, (c) => {
    for (let i = 0; i < 16; i++) {
      const x = 28 + next() * 40;
      const lean = (next() - 0.5) * 38;
      const tall = 30 + next() * 58;
      c.strokeStyle = straw
        ? `rgba(${92 + next() * 44},${76 + next() * 36},${30 + next() * 20},0.3)`
        : `rgba(${(22 + next() * 22) * lift},${(48 + next() * 30) * lift},${(22 + next() * 14) * lift},0.3)`;
      c.lineCap = 'round';
      // Each blade several times, thinner each time: soft at its edges, dark in its middle.
      for (const wide of [13, 9, 5]) {
        c.lineWidth = wide;
        c.beginPath();
        c.moveTo(x, 98);
        c.quadraticCurveTo(x + lean * 0.2, 96 - tall * 0.6, x + lean, 96 - tall);
        c.stroke();
      }
    }
    // No hard edge anywhere: it fades to nothing at its sides and at its foot.
    c.globalCompositeOperation = 'destination-in';
    const across = c.createLinearGradient(0, 0, 96, 0);
    across.addColorStop(0, 'rgba(0,0,0,0)');
    across.addColorStop(0.25, 'rgba(0,0,0,1)');
    across.addColorStop(0.75, 'rgba(0,0,0,1)');
    across.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, 96, 96);
    const down = c.createLinearGradient(0, 0, 0, 96);
    down.addColorStop(0, 'rgba(0,0,0,1)');
    down.addColorStop(0.7, 'rgba(0,0,0,1)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = down;
    c.fillRect(0, 0, 96, 96);
  });
}

/** A low shrub far out of focus: a soft mound with a fringe of leaves. */
function blurredShrub(seed: number, growth: Growth = 'dark'): CanvasTexture {
  const next = sequence(seed);
  const lift = growth === 'bright' ? 1.9 : 1;
  // Dwarf birch in autumn: rust and orange.
  const [red, blue] = growth === 'straw' ? [1.7, 0.4] : [0.5, 0.56];
  return drawn(96, 64, (c) => {
    for (let i = 0; i < 46; i++) {
      const x = 12 + next() * 72;
      const y = 26 + next() * 30 + Math.abs(x - 48) * 0.35;
      const r = 5 + next() * 9;
      const blob = c.createRadialGradient(x, y, 0, x, y, r);
      const g = (52 + next() * 44) * lift;
      blob.addColorStop(0, `rgba(${g * red},${g},${g * blue},0.42)`);
      blob.addColorStop(1, `rgba(${g * red},${g},${g * blue},0)`);
      c.fillStyle = blob;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function foreground(chapter: ChapterData, from: number, to: number, growth: Growth | null): Group {
  const group = new Group();
  // Bare rock has nothing soft in front of it.
  if (growth === null) return group;
  const next = sequence(59);
  const textures = [blurredTuft(1, growth), blurredTuft(2, growth), blurredTuft(3, growth)];
  const materials = textures.map((map) => new MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: false }));
  for (let x = from - 6 + next() * 4; x < to + 6; x += 3.5 + next() * 5.5) {
    const z = 4 + next() * 3.5;
    const wide = 4 + next() * 4;
    // Mostly low, along the bottom of the picture; now and then one stands tall and passes in front.
    const tall = next() < 0.2 ? 4.2 + next() * 1.6 : 2.4 + next() * 1.3;
    const card = new Mesh(new PlaneGeometry(wide, tall), materials[Math.floor(next() * materials.length)]!);
    // Grass grows from the ground, not from a deck's edge.
    if (surfaceAt(chapter, x) !== undefined) continue;
    if (!grows(chapter, x)) continue;
    card.position.set(x, heightAt(chapter, x) - 2.3 + tall / 2, z);
    card.renderOrder = 5;
    group.add(card);
  }
  // The undergrowth far behind the path: soft dark tufts that break the line where the moss ends.
  const far = [blurredShrub(7, growth), blurredShrub(8, growth), blurredShrub(9, growth)].map((map) => new MeshBasicMaterial({ map, transparent: true, opacity: 0.8, depthWrite: false }));
  for (let x = from - 10 + next() * 4; x < to + 10; x += 1.6 + next() * 2.6) {
    const z = -8 - next() * 8;
    const wide = 2.6 + next() * 3;
    const tall = 1.4 + next() * 2.2;
    const card = new Mesh(new PlaneGeometry(wide, tall), far[Math.floor(next() * far.length)]!);
    if (!grows(chapter, x)) continue;
    card.position.set(x, heightAt(chapter, x) - 0.3 + tall / 2, z);
    card.renderOrder = -1;
    group.add(card);
  }
  return group;
}

// --- effects: shafts of light, and what floats in them ------------------------------------------------------

function effects(chapter: ChapterData, from: number, to: number, where: PlaceId) {
  const group = new Group();
  const next = sequence(71);
  // The forest has shafts of light and dust high in them; the garden has dew that glitters near the ground.
  const garden = where === 'garden';
  const beam = drawn(64, 128, (c) => {
    const across = c.createLinearGradient(0, 0, 64, 0);
    across.addColorStop(0, 'rgba(255,255,255,0)');
    across.addColorStop(0.5, 'rgba(255,255,255,1)');
    across.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = across;
    c.fillRect(0, 0, 64, 128);
    // It fades towards the ground.
    c.globalCompositeOperation = 'destination-in';
    const down = c.createLinearGradient(0, 0, 0, 128);
    down.addColorStop(0, 'rgba(0,0,0,0)');
    down.addColorStop(0.2, 'rgba(0,0,0,1)');
    down.addColorStop(0.8, 'rgba(0,0,0,0.8)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = down;
    c.fillRect(0, 0, 64, 128);
  });
  const shafts: { mesh: Mesh; material: MeshBasicMaterial; base: number; phase: number }[] = [];
  for (let x = from + next() * 6; x < to + 8 && where === 'forest'; x += 7 + next() * 8) {
    const material = new MeshBasicMaterial({ map: beam, color: '#ffeeb0', transparent: true, opacity: 0.3, blending: AdditiveBlending, fog: false, depthWrite: false });
    const wide = 2.4 + next() * 3;
    const mesh = new Mesh(new PlaneGeometry(wide, 26), material);
    const high = Math.max(heightAt(chapter, x - 6), heightAt(chapter, x), heightAt(chapter, x + 6));
    mesh.position.set(x, high + 10, -1.2 - next() * 4);
    mesh.rotation.z = 0.46 + next() * 0.08;
    mesh.renderOrder = 3;
    group.add(mesh);
    shafts.push({ mesh, material, base: 0.24 + next() * 0.14, phase: next() * 6.28 });
  }

  // Mist over the bog: long pale sheets that lie low over the water and drift.
  const sheets: Mesh[] = [];
  if (where === 'bog') {
    const band = drawn(64, 32, (c) => {
      const down = c.createLinearGradient(0, 0, 0, 32);
      down.addColorStop(0, 'rgba(255,255,255,0)');
      down.addColorStop(0.55, 'rgba(255,255,255,1)');
      down.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = down;
      c.fillRect(0, 0, 64, 32);
      c.globalCompositeOperation = 'destination-in';
      const across = c.createLinearGradient(0, 0, 64, 0);
      across.addColorStop(0, 'rgba(0,0,0,0)');
      across.addColorStop(0.3, 'rgba(0,0,0,1)');
      across.addColorStop(0.7, 'rgba(0,0,0,1)');
      across.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = across;
      c.fillRect(0, 0, 64, 32);
    });
    for (let i = 0; i < 6; i++) {
      const sheet = new Mesh(
        new PlaneGeometry(22 + next() * 14, 2.6 + next() * 1.8),
        new MeshBasicMaterial({ map: band, color: '#fff7e6', transparent: true, opacity: 0.2 + next() * 0.14, fog: false, depthWrite: false }),
      );
      sheet.userData = { x: next(), y: 0.5 + next() * 1.1, z: -2.5 - next() * 9, speed: 0.25 + next() * 0.4 };
      sheet.renderOrder = 2;
      sheets.push(sheet);
      group.add(sheet);
    }
  }

  // Dust and pollen in the light: they drift slowly, and stay with the camera.
  const MOTES = where === 'dusk' ? 1 : 70;
  const motes = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: garden ? '#f2fbff' : '#fff6d0', transparent: true, opacity: garden ? 0.95 : 0.7, blending: AdditiveBlending, fog: false, depthWrite: false, map: drawn(32, 32, (c) => {
      const dot = c.createRadialGradient(16, 16, 1, 16, 16, 15);
      dot.addColorStop(0, 'rgba(255,255,255,1)');
      dot.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = dot;
      c.fillRect(0, 0, 32, 32);
    }) }),
    MOTES,
  );
  motes.instanceMatrix.setUsage(DynamicDrawUsage);
  motes.frustumCulled = false;
  motes.renderOrder = 4;
  group.add(motes);
  const seeds = Array.from({ length: MOTES }, () => ({ x: next(), y: next(), z: next(), speed: 0.3 + next() * 0.7, size: 0.03 + next() * 0.06 }));
  const place = new Object3D();
  const SPAN = 30;

  function update(cameraX: number, groundY: number, clock: number): void {
    for (const sheet of sheets) {
      const at = sheet.userData as { x: number; y: number; z: number; speed: number };
      const window = 70;
      const along = (((at.x * window + clock * at.speed - cameraX) % window) + window) % window;
      sheet.position.set(cameraX - window / 2 + along, groundY + at.y, at.z);
    }
    for (const shaft of shafts) shaft.material.opacity = shaft.base * (0.8 + 0.2 * Math.sin(clock * 0.6 + shaft.phase));
    for (const [i, mote] of seeds.entries()) {
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const along = (((mote.x * SPAN + (garden ? 0 : clock * 0.12 * mote.speed) - cameraX) % SPAN) + SPAN) % SPAN;
      place.position.set(
        cameraX - SPAN / 2 + along,
        garden ? heightAt(chapter, cameraX - SPAN / 2 + along) + 0.05 + mote.y * 1.3 : groundY + 0.3 + mote.y * 7 + Math.sin(clock * 0.5 * mote.speed + i) * 0.25,
        -5 + mote.z * 7.5,
      );
      // Dust drifts and swells slowly; dew flashes, and only where something grows.
      const twinkle = garden
        ? (grows(chapter, cameraX - SPAN / 2 + along) ? Math.max(0, Math.sin(clock * 3.1 * mote.speed + i * 2.3)) ** 6 * 2.2 : 0)
        : 0.6 + 0.4 * Math.sin(clock * 1.7 * mote.speed + i * 2.3);
      place.scale.setScalar(where === 'dusk' ? 0 : mote.size * twinkle);
      place.updateMatrix();
      motes.setMatrixAt(i, place.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}

// --- the garden ---------------------------------------------------------------------------------------------

/** A birch's bark: white, with dark dashes across it. */
function birchBark(): CanvasTexture {
  const next = sequence(37);
  return drawn(128, 256, (c) => {
    c.fillStyle = '#efe9dc';
    c.fillRect(0, 0, 128, 256);
    for (let i = 0; i < 70; i++) {
      const y = next() * 256;
      const x = next() * 128;
      const wide = 6 + next() * 30;
      c.fillStyle = `rgba(${40 + next() * 40},${36 + next() * 30},${30 + next() * 30},${0.4 + next() * 0.5})`;
      c.fillRect(x, y, wide, 1 + next() * 3);
      c.fillRect(x - 128, y, wide, 1 + next() * 3);
    }
  }, true);
}

/** One stretch of the lawn, as he sees it: a jungle behind the path, stubble where he walks, and dew on it all. */
function lawn(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const grass = new InstancedMesh(KIT.blade, KIT.lawn, Math.round(length * 36));
  let n = 0;
  for (let i = 0; i < grass.count; i++) {
    const x = from + next() * length;
    const where = next();
    // Behind the path it stands tall; on the path it is stubble, so that his boots show; in front it is short.
    const z = where < 0.55 ? -0.55 - next() ** 1.4 * 7.5 : where < 0.85 ? -0.5 + next() : 0.55 + next() * 0.4;
    const tall = where < 0.55 ? (0.5 + next() * 1.9) * Math.min(1, -z / 1.5 + 0.3) : where < 0.85 ? 0.07 + next() * 0.12 : 0.2 + next() * 0.3;
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z), z);
    place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
    place.scale.set(0.06 + next() * 0.07, tall, 1);
    place.updateMatrix();
    grass.setMatrixAt(n, place.matrix);
    grass.setColorAt(n++, next() < 0.14 ? tint.set('#c2c552').multiplyScalar(0.8 + next() * 0.3) : tint.set('#6fae34').multiplyScalar(0.7 + next() * 0.5));
  }
  grass.count = n;

  // Dew: on the ground, and on the grass behind him.
  const dew = new InstancedMesh(KIT.ball, KIT.dew, Math.round(length * 5));
  n = 0;
  for (let i = 0; i < dew.count; i++) {
    const x = from + next() * length;
    const z = depth(3.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + (z < -0.5 && next() < 0.6 ? 0.2 + next() * 0.9 : 0.035), z);
    place.rotation.set(0, 0, 0);
    place.scale.setScalar(0.016 + next() * 0.024);
    place.updateMatrix();
    dew.setMatrixAt(n++, place.matrix);
  }
  dew.count = n;

  // Dandelions, as tall as he is and taller.
  const flowers = Math.max(1, Math.round(length * 0.3));
  const stalks = new InstancedMesh(KIT.stalk, KIT.stem, flowers);
  const heads = new InstancedMesh(KIT.ball, KIT.petal, flowers);
  n = 0;
  for (let i = 0; i < flowers; i++) {
    const x = from + next() * length;
    const z = -0.9 - next() * 4;
    if (!grows(chapter, x)) continue;
    const tall = 0.9 + next() * 0.9;
    const lean = (next() - 0.5) * 0.25;
    place.position.set(x, top(x, z), z);
    place.rotation.set(0, 0, lean);
    place.scale.set(1.4, tall, 1.4);
    place.updateMatrix();
    stalks.setMatrixAt(n, place.matrix);
    place.position.set(x - Math.sin(lean) * tall, top(x, z) + Math.cos(lean) * tall, z);
    place.scale.set(0.19, 0.13, 0.19);
    place.updateMatrix();
    heads.setMatrixAt(n++, place.matrix);
  }
  stalks.count = n;
  heads.count = n;

  // Clover, three leaves to a stalk, and the birch's first yellow leaves on the ground.
  const sprigs = Math.round(length * 1.6);
  const clover = new InstancedMesh(KIT.ball, KIT.clover, Math.max(1, sprigs * 3));
  n = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z) + 0.14 + next() * 0.2;
    const turn = next() * 6.28;
    for (let k = 0; k < 3; k++) {
      const a = turn + k * 2.094;
      place.position.set(x + Math.cos(a) * 0.075, y, z + Math.sin(a) * 0.075);
      place.rotation.set(0.15, -a, 0.1);
      place.scale.set(0.085, 0.014, 0.07);
      place.updateMatrix();
      clover.setMatrixAt(n++, place.matrix);
    }
  }
  clover.count = n;
  const fallen = new InstancedMesh(KIT.ball, KIT.birchLeaf, Math.max(1, Math.round(length * 1.4)));
  n = 0;
  for (let i = 0; i < fallen.count; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.03, z);
    place.rotation.set((next() - 0.5) * 0.4, next() * 6.28, (next() - 0.5) * 0.4);
    place.scale.set(0.15, 0.012, 0.1);
    place.updateMatrix();
    fallen.setMatrixAt(n++, place.matrix);
  }
  fallen.count = n;

  // A birch now and then, far behind the path.
  const trunks = new InstancedMesh(KIT.trunk, KIT.birch, 2);
  n = 0;
  for (let i = 0; i < 2; i++) {
    const x = from + next() * length;
    const z = -8 - next() * 9;
    if (next() > 0.4 || !grows(chapter, x)) continue;
    const radius = 0.8 + next() * 0.4;
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.06);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 1, radius);
    place.updateMatrix();
    trunks.setMatrixAt(n++, place.matrix);
  }
  trunks.count = n;

  for (const mesh of [grass, dew, stalks, heads, clover, fallen, trunks]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

/**
 * What is built: the house's red wall behind the scene, and a deck overhead with the sun falling through
 * between its boards. The wall is drawn small, so that it is as soft as everything else that far away.
 */
function built(chapter: ChapterData, indoors = false): Group {
  const group = new Group();
  const house = chapter.house;
  if (house && indoors) {
    // Seen from inside: a pale panelled wall close behind him, and windows that let the sky in.
    const long = house.to - house.from;
    const floor = Math.min(...chapter.ground.map((p) => p.y));
    const panels = drawn(128, 64, (c) => {
      c.fillStyle = '#eadcc0';
      c.fillRect(0, 0, 128, 64);
      for (let x = 0; x < 128; x += 16) {
        c.fillStyle = 'rgba(150,126,88,0.35)';
        c.fillRect(x, 0, 1.5, 64);
      }
      // A rail and darker boards below it.
      c.fillStyle = 'rgba(128,100,66,0.5)';
      c.fillRect(0, 44, 128, 3);
      c.fillStyle = 'rgba(150,120,80,0.25)';
      c.fillRect(0, 47, 128, 17);
    }, true);
    panels.repeat.set(long / 12, 1);
    // In the evening the room is lit by candles: the wall is dim and warm, and the windows are dark.
    const evening = chapter.night !== undefined;
    const wall = new Mesh(new PlaneGeometry(long, 26), new MeshBasicMaterial({ map: panels, color: evening ? '#8c7252' : '#ffffff' }));
    wall.position.set((house.from + house.to) / 2, floor + 11, -9);
    wall.renderOrder = -2;
    group.add(wall);
    const frame = new MeshBasicMaterial({ color: evening ? '#a8977c' : '#f6efe2' });
    for (const x of house.windows) {
      // The frame, and a hole of sky in it: whatever is outside shows through, at night the northern lights.
      for (const [dx, dy, w, h] of [[0, 2.6, 5.4, 0.3], [0, -2.6, 5.4, 0.3], [-2.55, 0, 0.3, 5.5], [2.55, 0, 0.3, 5.5], [0, 0, 0.18, 5.2], [0, 0, 5.1, 0.18]] as const) {
        const bar = new Mesh(new PlaneGeometry(w, h), frame);
        bar.position.set(x + dx, heightAt(chapter, x) + 6 + dy, -8.9);
        group.add(bar);
      }
    }
    // Pappa's shelf: his figures in a row, athletes and tomtar, and the first place in the row.
    if (chapter.shelf) {
      const { x, y, filled } = chapter.shelf;
      const dim = evening ? 0.62 : 1;
      const wood = (hex: string) => new MeshStandardMaterial({ color: new Color(hex).multiplyScalar(dim), roughness: 0.85 });
      const board = new Mesh(new BoxGeometry(8.6, 0.16, 0.9), wood('#8a6a44'));
      board.position.set(x, y, -8.5);
      group.add(board);
      const tones = ['#d9bd8b', '#c9a877', '#e2c898', '#b99262', '#d2b07e', '#c4a070', '#dcc08e'];
      for (let i = 0; i < 7; i++) {
        const at = x - 3.6 + i * 1.2;
        if (i === 0 && !filled) {
          // The empty place: a paler patch on the wall where a figure once stood.
          const gap = new Mesh(new PlaneGeometry(0.9, 1.2), new MeshBasicMaterial({ color: evening ? '#b09a74' : '#fff6da', transparent: true, opacity: 0.75 }));
          gap.position.set(at, y + 0.68, -8.88);
          group.add(gap);
          continue;
        }
        // The first one, home again, is old: grey, with moss on its shoulder.
        const old = i === 0;
        const material = wood(old ? '#8f8c7e' : tones[i]!);
        const tall = old ? 0.62 : 0.7 + (i % 3) * 0.12;
        const body = new Mesh(new CylinderGeometry(0.17, 0.24, tall, 10), material);
        body.position.set(at, y + 0.08 + tall / 2, -8.5);
        const head = new Mesh(new SphereGeometry(0.19, 12, 9), material);
        head.position.set(at, y + 0.08 + tall + 0.14, -8.5);
        group.add(body, head);
        // Every second one is a tomte, with a pointed cap carved from the same piece.
        if (i % 2 === 0 && !old) {
          const cap = new Mesh(new ConeGeometry(0.19, 0.42, 10), wood('#7d8ea0'));
          cap.position.set(at, y + 0.08 + tall + 0.46, -8.5);
          group.add(cap);
        }
      }
    }
    // The wall is solid between the windows: it is cut by drawing the sky's own colour there, behind the frames.
    const sky = evening
      ? drawn(32, 32, (c) => {
          // The night outside, with the northern lights low over the trees.
          c.fillStyle = '#142046';
          c.fillRect(0, 0, 32, 32);
          const lights = c.createLinearGradient(0, 4, 0, 26);
          lights.addColorStop(0, 'rgba(90,240,170,0)');
          lights.addColorStop(0.6, 'rgba(90,240,170,0.75)');
          lights.addColorStop(1, 'rgba(90,240,170,0)');
          c.fillStyle = lights;
          c.fillRect(0, 4, 32, 22);
        })
      : null;
    // In the morning the garden's far scenery is outside, each window with its own part of it.
    const glass = new MeshBasicMaterial({ map: sky ?? outlook(), fog: false });
    for (const [i, x] of house.windows.entries()) {
      const pane = new Mesh(sky ? new PlaneGeometry(5.1, 5.2) : outlookPane(5.1, 5.2, i), glass);
      pane.position.set(x, heightAt(chapter, x) + 6, -8.95);
      group.add(pane);
    }
  } else if (house) {
    const long = house.to - house.from;
    const floor = Math.min(...chapter.ground.map((p) => p.y));
    // Falu red boards with their cover strips, lit from the left.
    const wall = drawn(128, 32, (c) => {
      c.fillStyle = '#8f2d22';
      c.fillRect(0, 0, 128, 32);
      for (let x = 0; x < 128; x += 16) {
        c.fillStyle = 'rgba(60,14,10,0.55)';
        c.fillRect(x + 11, 0, 2, 32);
        c.fillStyle = 'rgba(214,96,74,0.5)';
        c.fillRect(x + 8, 0, 3, 32);
      }
    }, true);
    wall.repeat.set(long / 9.6, 1);
    const boards = new Mesh(new PlaneGeometry(long, 70), new MeshBasicMaterial({ map: wall }));
    boards.position.set((house.from + house.to) / 2, floor + 33, -21);
    boards.renderOrder = -2;
    // The white board at the wall's corner, and a window with its white frame for each place asked for.
    const white = new MeshBasicMaterial({ color: '#f1ece2' });
    const corner = new Mesh(new PlaneGeometry(1.8, 70), white);
    corner.position.set(house.to - 0.9, floor + 33, -20.95);
    const pane = drawn(24, 32, (c) => {
      c.fillStyle = '#f1ece2';
      c.fillRect(0, 0, 24, 32);
      const glass = c.createLinearGradient(0, 0, 24, 32);
      glass.addColorStop(0, '#fdf6d8');
      glass.addColorStop(1, '#9fc4d8');
      c.fillStyle = glass;
      c.fillRect(3, 3, 8, 12);
      c.fillRect(13, 3, 8, 12);
      c.fillRect(3, 17, 8, 12);
      c.fillRect(13, 17, 8, 12);
    });
    const glass = new MeshBasicMaterial({ map: pane });
    group.add(boards, corner);
    for (const x of house.windows) {
      const window = new Mesh(new PlaneGeometry(7.5, 10), glass);
      window.position.set(x, heightAt(chapter, x) + 15, -20.9);
      group.add(window);
    }
  }
  for (const roof of chapter.roofs ?? []) {
    const long = roof.to - roof.from;
    const mid = (roof.from + roof.to) / 2;
    const dark = new MeshStandardMaterial({ color: '#5f4f3e', roughness: 0.9 });
    const map = boards();
    map.repeat.set(long / (BOARD * 2), 9 / (BOARD * 2));
    const deck = new Mesh(new BoxGeometry(long, 0.28, 9), new MeshStandardMaterial({ color: '#b49a78', map, roughness: 0.8 }));
    deck.position.set(mid, roof.y - 0.14, -3.4);
    group.add(deck);
    const place = new Object3D();
    const joists = new InstancedMesh(new BoxGeometry(0.34, 0.8, 9), dark, Math.ceil(long / 2.6) + 1);
    for (let i = 0; i < joists.count; i++) {
      place.position.set(Math.min(roof.to - 0.2, roof.from + 0.2 + i * 2.6), roof.y - 0.68, -3.4);
      place.updateMatrix();
      joists.setMatrixAt(i, place.matrix);
    }
    joists.computeBoundingSphere();
    group.add(joists);
    // The sun between the boards: stripes of light on the ground below.
    const stripes = new InstancedMesh(
      new PlaneGeometry(0.13, 7).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: '#ffe7ae', transparent: true, opacity: 0.34, blending: AdditiveBlending, fog: false, depthWrite: false }),
      Math.floor(long / BOARD),
    );
    for (let i = 0; i < stripes.count; i++) {
      const x = roof.from + (i + 0.5) * BOARD;
      place.position.set(x, heightAt(chapter, x) + 0.03, -2.4);
      place.updateMatrix();
      stripes.setMatrixAt(i, place.matrix);
    }
    stripes.computeBoundingSphere();
    stripes.renderOrder = 2;
    group.add(stripes);
  }
  return group;
}

// --- the bog and the mountain -----------------------------------------------------------------------------------

/** One stretch of the bog: rust-red and green moss, straw sedge, dwarf birch in autumn red, cloudberry leaves. */
function bog(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const cushions = new InstancedMesh(KIT.ball, KIT.moss, Math.round(length * 18));
  let n = 0;
  for (let i = 0; i < cushions.count; i++) {
    const x = from + next() * length;
    const z = depth(6.5, 0.22);
    if (!grows(chapter, x)) continue;
    const size = (0.06 + next() ** 2.2 * 0.3) * (z > 0.45 ? 0.55 : 1);
    const low = Math.abs(z) < 0.7 ? 0.5 : 1;
    place.position.set(x, top(x, z) - size * 0.35, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * (1 + next() * 0.5), size * low * (0.75 + next() * 0.45), size * (1 + next() * 0.5));
    place.updateMatrix();
    cushions.setMatrixAt(n, place.matrix);
    cushions.setColorAt(n++, toneAt('sphagnum', x * 2.1, z * 2.1, tint).multiplyScalar(0.85 + next() * 0.4));
  }
  cushions.count = n;

  // Sedge: straw-coloured in late September, in tufts.
  const sedge = new InstancedMesh(KIT.blade, KIT.straw, Math.round(length * 8));
  n = 0;
  for (let tuft = 0; n < sedge.count && tuft < sedge.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.12 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6.5;
    if (!grows(chapter, x)) continue;
    const tall = z > 0 ? 0.3 + next() * 0.35 : 0.6 + next() * 1.2;
    for (let k = 0; k < 4 + Math.floor(next() * 5) && n < sedge.count; k++) {
      const bx = x + (next() - 0.5) * 0.3;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.25);
      place.rotation.set((next() - 0.5) * 0.7, next() * 6.28, (next() - 0.5) * 0.7);
      place.scale.set(0.035 + next() * 0.03, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      sedge.setMatrixAt(n, place.matrix);
      sedge.setColorAt(n++, next() < 0.2 ? tint.set('#8f9a48') : tint.set('#d2b968').multiplyScalar(0.75 + next() * 0.4));
    }
  }
  sedge.count = n;

  // Dwarf birch: low twigs with small round leaves, red in autumn. Cloudberry leaves, orange, near the moss.
  const twigs = Math.round(length * 0.9);
  const birch = new InstancedMesh(KIT.ball, KIT.redLeaf, Math.max(1, twigs * 7));
  n = 0;
  for (let i = 0; i < twigs; i++) {
    const x = from + next() * length;
    const z = depth(4, 0.2);
    if (!grows(chapter, x)) continue;
    for (let k = 0; k < 7; k++) {
      place.position.set(x + (next() - 0.5) * 0.4, top(x, z) + 0.12 + next() * 0.45, z + (next() - 0.5) * 0.3);
      place.rotation.set(next() * 1.2, next() * 6.28, next() * 1.2);
      place.scale.set(0.065, 0.014, 0.055);
      place.updateMatrix();
      birch.setMatrixAt(n++, place.matrix);
    }
  }
  birch.count = n;
  const cloud = new InstancedMesh(KIT.ball, KIT.orangeLeaf, Math.max(1, Math.round(length * 1.3)));
  n = 0;
  for (let i = 0; i < cloud.count; i++) {
    const x = from + next() * length;
    const z = depth(3.5, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.1 + next() * 0.08, z);
    place.rotation.set((next() - 0.5) * 0.5, next() * 6.28, (next() - 0.5) * 0.5);
    place.scale.set(0.17 + next() * 0.06, 0.016, 0.15 + next() * 0.05);
    place.updateMatrix();
    cloud.setMatrixAt(n++, place.matrix);
  }
  cloud.count = n;

  // Cranberries, lying on the moss.
  const berries = new InstancedMesh(KIT.ball, KIT.berry, Math.max(1, Math.round(length * 1.6)));
  n = 0;
  for (let i = 0; i < berries.count; i++) {
    const x = from + next() * length;
    const z = depth(3, 0.3);
    if (!grows(chapter, x)) continue;
    place.position.set(x, top(x, z) + 0.04, z);
    place.rotation.set(0, 0, 0);
    place.scale.setScalar(0.04 + next() * 0.012);
    place.updateMatrix();
    berries.setMatrixAt(n++, place.matrix);
  }
  berries.count = n;

  // Dead pines: grey and bare, far apart.
  const dead = new InstancedMesh(KIT.trunk, KIT.deadwood, 2);
  n = 0;
  for (let i = 0; i < 2; i++) {
    const x = from + next() * length;
    const z = -6 - next() * 12;
    if (next() > 0.45 || !grows(chapter, x)) continue;
    const radius = 0.4 + next() * 0.35;
    place.rotation.set(0, next() * 6.28, (next() - 0.5) * 0.14);
    place.position.set(x, heightAt(chapter, x) - 0.5, z);
    place.scale.set(radius, 0.42, radius);
    place.updateMatrix();
    dead.setMatrixAt(n++, place.matrix);
  }
  dead.count = n;

  for (const mesh of [cushions, sedge, birch, cloud, berries, dead]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

/** One stretch of the mountain: reindeer lichen like small white shrubs, crowberry, dry grass and boulders. */
function fell(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  const tint = new Color();
  const length = to - from;
  const top = (x: number, z: number) => heightAt(chapter, x) + (z > 0.45 ? -0.07 * Math.min(1, (z - 0.45) / 0.5) : 0);
  const depth = (back: number, front = 0.25) => (next() < front ? 0.5 + next() * 0.45 : -0.45 - next() ** 1.6 * back);

  const clumps = Math.round(length * 2.6);
  const lichen = new InstancedMesh(KIT.ball, KIT.lichen, Math.max(1, clumps * 5));
  let n = 0;
  for (let i = 0; i < clumps; i++) {
    const x = from + next() * length;
    const z = depth(6, 0.25);
    if (!grows(chapter, x)) continue;
    const size = (0.07 + next() * 0.12) * (Math.abs(z) < 0.7 ? 0.5 : 1);
    for (let k = 0; k < 5; k++) {
      const ball = size * (0.6 + next() * 0.6);
      place.position.set(x + (next() - 0.5) * size * 3, top(x, z) + ball * 0.5, z + (next() - 0.5) * size * 2.4);
      place.rotation.set(0, next() * 6.28, 0);
      place.scale.set(ball, ball * 0.8, ball);
      place.updateMatrix();
      lichen.setMatrixAt(n++, place.matrix);
    }
  }
  lichen.count = n;

  // Crowberry: low dark sprigs with black berries.
  const sprigs = Math.round(length * 0.9);
  const leaves = new InstancedMesh(KIT.ball, KIT.crowLeaf, Math.max(1, sprigs * 8));
  const berries = new InstancedMesh(KIT.ball, KIT.blackBerry, Math.max(1, sprigs * 3));
  let leaf = 0;
  let berry = 0;
  for (let i = 0; i < sprigs; i++) {
    const x = from + next() * length;
    const z = depth(3.2, 0.3);
    if (!grows(chapter, x)) continue;
    const y = top(x, z);
    for (let k = 0; k < 8; k++) {
      place.position.set(x + (next() - 0.5) * 0.28, y + 0.05 + next() * 0.16, z + (next() - 0.5) * 0.24);
      place.rotation.set(next() * 1.4, next() * 6.28, next() * 1.4);
      place.scale.set(0.06, 0.013, 0.022);
      place.updateMatrix();
      leaves.setMatrixAt(leaf++, place.matrix);
    }
    for (let k = 0; k < 1 + Math.floor(next() * 3); k++) {
      place.position.set(x + (next() - 0.5) * 0.24, y + 0.08 + next() * 0.08, z + (next() - 0.5) * 0.2);
      place.rotation.set(0, 0, 0);
      place.scale.setScalar(0.04);
      place.updateMatrix();
      berries.setMatrixAt(berry++, place.matrix);
    }
  }
  leaves.count = leaf;
  berries.count = berry;

  // Dry grass, where there is a crack for it.
  const grass = new InstancedMesh(KIT.blade, KIT.straw, Math.round(length * 3.5));
  n = 0;
  for (let tuft = 0; n < grass.count && tuft < grass.count; tuft++) {
    const x = from + next() * length;
    const z = next() < 0.15 ? 0.6 + next() * 0.35 : -0.6 - next() ** 1.3 * 6;
    if (!grows(chapter, x)) continue;
    const tall = 0.3 + next() * 0.6;
    for (let k = 0; k < 3 + Math.floor(next() * 4) && n < grass.count; k++) {
      const bx = x + (next() - 0.5) * 0.2;
      place.position.set(bx, top(bx, z), z + (next() - 0.5) * 0.2);
      place.rotation.set((next() - 0.5) * 0.8, next() * 6.28, (next() - 0.5) * 0.8);
      place.scale.set(0.03 + next() * 0.03, tall * (0.7 + next() * 0.5), 1);
      place.updateMatrix();
      grass.setMatrixAt(n, place.matrix);
      grass.setColorAt(n++, tint.set('#cdb878').multiplyScalar(0.75 + next() * 0.4));
    }
  }
  grass.count = n;

  // Boulders, bare. The crooked pines come when a pine has a crown: a bare trunk reads as a pole.
  const stones = new InstancedMesh(KIT.bare, KIT.stone, Math.max(1, Math.round(length * 0.45)));
  n = 0;
  for (let i = 0; i < stones.count; i++) {
    const x = from + next() * length;
    const z = -1.4 - next() ** 1.4 * 9;
    if (!grows(chapter, x)) continue;
    const size = 0.3 + next() ** 1.8 * 1.3;
    place.position.set(x, top(x, z) + size * 0.2, z);
    place.rotation.set(0, next() * 6.28, 0);
    place.scale.set(size * 1.3, size * 0.8, size);
    place.updateMatrix();
    stones.setMatrixAt(n, place.matrix);
    stones.setColorAt(n++, tint.set('#ffffff').multiplyScalar(0.85 + next() * 0.3));
  }
  stones.count = n;

  for (const mesh of [lichen, leaves, berries, grass, stones]) {
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}

// --- the whole dressing --------------------------------------------------------------------------------------

/** Builds a place's layers around a chapter's ground. */
export function dress(chapter: ChapterData, look: PlaceLook): Dressing {
  const group = new Group();
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  KIT = kit();
  const air = effects(chapter, from, to, look.id);
  const own: Record<PlaceId, { ground: Ground; growth: Growth | null }> = {
    forest: { ground: 'moss', growth: 'dark' },
    garden: { ground: 'lawn', growth: 'bright' },
    bog: { ground: 'sphagnum', growth: 'straw' },
    mountain: { ground: 'granite', growth: null },
    dusk: { ground: 'granite', growth: null },
    home: { ground: 'wood', growth: null },
    village: { ground: 'asphalt', growth: null },
  };
  // The far scenery hangs in layers that pass at their own speeds, and stays at the height of his eyes
  // however high he climbs: backdrop.ts.
  const far = scenery(look.id, heightAt(chapter, from));
  if (look.id === 'dusk') group.add(stars());
  group.add(
    far.group,
    bank(chapter, own[look.id].ground),
    scatter(chapter, from, to, look.id),
    built(chapter, look.id === 'home'),
    // The village has the fronts of its houses behind the pavement.
    look.id === 'village' ? fronts(chapter, from, to) : new Group(),
    air.group,
    foreground(chapter, from, to, own[look.id].growth),
  );
  return {
    group,
    background: backdrop(look),
    update(cameraX, groundY, clock, night = 0) {
      air.update(cameraX, groundY, clock);
      far.update(cameraX, groundY, clock, night);
    },
  };
}
