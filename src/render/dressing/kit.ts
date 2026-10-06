import {
  BoxGeometry, BufferGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, LatheGeometry,
  MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, SphereGeometry, Vector2,
} from 'three';
import type { ChapterData, PlaceId, SurfaceKind } from '../../sim/types';
import type { Grade } from '../grade';
import { sway } from '../wind';

// What every part of the dressing uses: the type of a place's look, the small tools, the moss's colours, and
// the shapes and materials that the stretches of every place are built from.

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

// --- small tools ----------------------------------------------------------------------------------------

/** A fixed sequence of numbers from 0 to 1: the same scatter in every session and every screenshot. */
export function sequence(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** Smooth noise from 0 to 1. */
export function noise(x: number, y: number): number {
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
export function heightAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/** The land under the things he stands on. Their models keep the collision outline's raised tops. */
export function landscape(chapter: ChapterData): ChapterData {
  if (!chapter.landmarks?.length) return chapter;
  const ground = chapter.ground.map((point) => {
    const mark = chapter.landmarks!.find(({ from, to }) => point.x >= from && point.x <= to);
    return mark ? { x: point.x, y: Math.min(point.y, mark.base) } : point;
  }).filter((point, i, line) => i === 0 || point.x !== line[i - 1]!.x || point.y !== line[i - 1]!.y);
  // Idempotent: the dressing and a later restock can both ask for the land. The simulation is untouched.
  return { ...chapter, ground, landmarks: [] };
}

/** Whether things can grow at x: fairly level ground, not the bottom of a pit, and not under water. */
export function grows(chapter: ChapterData, x: number): boolean {
  if (surfaceAt(chapter, x) !== undefined) return false;
  const here = heightAt(chapter, x);
  if ((chapter.water ?? []).some((w) => x >= w.from - 0.5 && x <= w.to + 0.5 && here < w.y)) return false;
  if (Math.abs(heightAt(chapter, x + 0.4) - here) > 0.3 || Math.abs(heightAt(chapter, x - 0.4) - here) > 0.3) return false;
  return here > Math.min(heightAt(chapter, x - 3.5), heightAt(chapter, x + 3.5)) - 2.5;
}

/** What the ground is made of at x, where the chapter says it is something else than the place's own. */
export function surfaceAt(chapter: ChapterData, x: number): SurfaceKind | undefined {
  return chapter.surfaces?.find((s) => x >= s.from && x <= s.to)?.kind;
}

/**
 * A picture drawn in code, as a texture. Drawn small, it is soft when it fills a large card. One that tiles
 * lies on ground and bark, which are seen almost edge on: it is read along the slant, so that it stays sharp
 * into the distance (the graphics card gives as much of the 8 as it has).
 */
export function drawn(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void, tiled = false): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  if (tiled) {
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 8;
  }
  return texture;
}

/** The moss, in three greens and a gold, as numbers from 0 to 1. */
export const MOSS = [new Color('#35521f'), new Color('#587a27'), new Color('#7f9a30'), new Color('#b3ae45')];

export function mossAt(x: number, z: number, out: Color): Color {
  const n = noise(x * 0.42 + 3, z * 0.6 + 11) * 0.65 + noise(x * 1.9, z * 2.3) * 0.35;
  const at = Math.min(2.999, Math.max(0, n * 3.4 - 0.2));
  const i = Math.floor(at);
  return out.copy(MOSS[i]!).lerp(MOSS[i + 1]!, at - i);
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
    // For what is a few pixels across, a leaf or a berry: under half the ball's corners.
    bead: new SphereGeometry(1, 6, 4),
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
    // The bog's and the mountain's. The mountain's stones, its cobbles and its cushions of reindeer lichen are
    // modelled in Blender (../mountain-kit.ts): these three are their stand-ins, plain and of few corners.
    bare: boulder(false, 10, 7, '#a4a8b2'),
    cobble: tinted(new SphereGeometry(1, 8, 6).scale(1, 0.6, 0.78), '#d8d6cf'),
    lav: tinted(new SphereGeometry(0.5, 6, 3, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1), '#f4f3e4'),
    straw: new MeshStandardMaterial({ roughness: 0.75, side: DoubleSide, emissive: '#8a7430', emissiveIntensity: 0.45 }),
    redLeaf: new MeshStandardMaterial({ color: '#c4472c', roughness: 0.55, emissive: '#70200c', emissiveIntensity: 0.3 }),
    orangeLeaf: new MeshStandardMaterial({ color: '#dd8a2c', roughness: 0.6, emissive: '#7a3c08', emissiveIntensity: 0.25 }),
    deadwood: new MeshStandardMaterial({ color: '#a9a69e', roughness: 1 }),
    // Reindeer lichen is the brightest thing on the mountain's ground: its colours are on its corners, and a
    // little light of its own keeps it white where the low sun does not reach.
    lichen: new MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: '#8a8f84', emissiveIntensity: 0.25 }),
    crowLeaf: new MeshStandardMaterial({ color: '#2f4c2c', roughness: 0.5 }),
    blackBerry: new MeshStandardMaterial({ color: '#1e1e2a', roughness: 0.25 }),
  };
}
export let KIT: ReturnType<typeof kit>;

/** Makes the kit anew, for the chapter that is being dressed: only this module can set what it exports. */
export function makeKit(): void {
  KIT = kit();
  // What grows moves in the wind (../wind.ts): a blade's top by a share of its length, a dandelion's stalk
  // and the head on it by the same few hundredths of an EL, and the lichen only while a gust blows.
  for (const blades of [KIT.grass, KIT.lawn, KIT.straw]) sway(blades, 0.07);
  sway(KIT.stem, 0, 0.045);
  sway(KIT.petal, 0, 0, 0.045);
  sway(KIT.lichen, 0, 0, 0.02, 0);
}

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

/** A shape with one colour on all its corners, for a material that reads its colours there. */
function tinted(geometry: BufferGeometry, colour: string): BufferGeometry {
  const c = new Color(colour);
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute('color', new Float32BufferAttribute(Array.from({ length: count }, () => [c.r, c.g, c.b]).flat(), 3));
  return geometry;
}

/** A stone: a round thing pushed out of shape, grey below and mossy on top. */
function boulder(mossy = true, across = 22, down = 16, stone = '#8f918d'): BufferGeometry {
  // A sphere's points are shared between its faces, so the stone is smooth when it is pushed out of shape.
  const geometry = new SphereGeometry(1, across, down);
  const at = geometry.getAttribute('position');
  const colour: number[] = [];
  const grey = new Color(stone);
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
