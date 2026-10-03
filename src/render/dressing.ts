import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, DoubleSide, DynamicDrawUsage,
  Float32BufferAttribute, Group, IcosahedronGeometry, InstancedMesh, LatheGeometry, Mesh, MeshBasicMaterial, MeshStandardMaterial,
  Object3D, PlaneGeometry, RepeatWrapping, SRGBColorSpace, SphereGeometry, Vector2, type Texture,
} from 'three';
import type { ChapterData, PlaceId } from '../sim/types';
import type { Grade } from './grade';

/**
 * How a place looks (plan §5.3, §5.4): its light, its haze, its grade, and the layers that are built around
 * the play plane. A chapter names its place, and the view dresses the chapter's ground in it.
 *
 * Everything here is made in code, so it costs no download: the far plates and the foreground are drawn on
 * small canvases, which makes them soft the way an out-of-focus layer is. Plates rendered in Blender and
 * scanned materials replace the drawn ones place by place (plan §5.6).
 */
export interface PlaceLook {
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
}

/** Granskogen at noon: deep green and mossy gold, shafts of light, cool shade. */
const FOREST: PlaceLook = {
  grade: { tint: [1.04, 1.01, 0.94], exposure: 1.08, contrast: 1.08, saturation: 1.12, vignette: 0.32, grain: 0.03 },
  haze: { colour: '#b4c79a', near: 4, far: 62 },
  sky: { top: '#2c4a44', middle: '#e6ebb0', bottom: '#587246', glow: '#fff8d2' },
  hemisphere: { sky: '#cfe4ea', ground: '#5b6a34', intensity: 1.35 },
  sun: { colour: '#ffd9a0', intensity: 3.6, from: [-7, 5, -4] },
  fill: { colour: '#d6e6ff', intensity: 0.75 },
};

export const PLACES: Record<PlaceId, PlaceLook> = { forest: FOREST };

/** What the view adds to its scene for a place, and moves each frame. */
export interface Dressing {
  group: Group;
  background: Texture;
  update(cameraX: number, groundY: number, clock: number): void;
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
  const here = heightAt(chapter, x);
  if ((chapter.water ?? []).some((w) => x >= w.from - 0.5 && x <= w.to + 0.5 && here < w.y)) return false;
  if (Math.abs(heightAt(chapter, x + 0.4) - here) > 0.3 || Math.abs(heightAt(chapter, x - 0.4) - here) > 0.3) return false;
  return here > Math.min(heightAt(chapter, x - 3.5), heightAt(chapter, x + 3.5)) - 2.5;
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

// --- L1: far plates --------------------------------------------------------------------------------------

/**
 * A far plate of the forest seen from the moss: tall soft columns, which are trunks far out of focus, and
 * between them round spots of light, as a lens draws them.
 */
function forestPlate(seed: number, trunk: string, light: string, columns: number, spots: number, stretch: number): CanvasTexture {
  const next = sequence(seed);
  return drawn(512, 256, (c) => {
    for (let i = 0; i < columns; i++) {
      const x = ((i + 0.2 + next() * 0.6) / columns) * 512;
      const w = 10 + next() * 26;
      const across = c.createLinearGradient(x - w, 0, x + w, 0);
      across.addColorStop(0, 'rgba(0,0,0,0)');
      across.addColorStop(0.5, trunk);
      across.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = across;
      // Twice, half a plate apart, so that the plate joins itself when it repeats.
      c.fillRect(x - w, 0, w * 2, 256);
      c.fillRect(x - w - 512, 0, w * 2, 256);
      c.fillRect(x - w + 512, 0, w * 2, 256);
    }
    for (let i = 0; i < spots; i++) {
      const x = next() * 512;
      const y = 20 + next() * 150;
      const r = 3 + next() * 7;
      // The plate is stretched when it hangs: drawn wide here, a spot is round there.
      c.save();
      c.translate(x, y);
      c.scale(stretch, 1);
      const spot = c.createRadialGradient(0, 0, r * 0.5, 0, 0, r);
      spot.addColorStop(0, light);
      spot.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = spot;
      c.fillRect(-r, -r, r * 2, r * 2);
      c.restore();
    }
  }, true);
}

function plates(from: number, to: number, floor: number): Group {
  const group = new Group();
  const width = to - from + 240;
  const layers = [
    { z: -62, height: 90, every: 110, texture: forestPlate(11, 'rgba(104,140,138,0.5)', 'rgba(255,250,214,0.36)', 9, 26, (90 / 256) / (110 / 512)) },
    { z: -30, height: 60, every: 64, texture: forestPlate(23, 'rgba(44,74,70,0.8)', 'rgba(255,244,190,0.3)', 7, 14, (60 / 256) / (64 / 512)) },
  ];
  for (const layer of layers) {
    layer.texture.repeat.set(width / layer.every, 1);
    const plate = new Mesh(
      new PlaneGeometry(width, layer.height),
      new MeshBasicMaterial({ map: layer.texture, transparent: true, fog: false, depthWrite: false }),
    );
    plate.position.set((from + to) / 2, floor + layer.height * 0.36, layer.z);
    plate.renderOrder = -2;
    group.add(plate);
  }
  return group;
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

function bank(chapter: ChapterData): Mesh {
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const outline = [{ x: first.x - 16, y: first.y }, ...line, { x: last.x + 16, y: last.y }];
  // Points along the outline, close enough together for the moss to roll. A wall keeps its two corners.
  const points: { x: number; y: number; steep: boolean }[] = [];
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!;
    const b = outline[i + 1]!;
    const dx = b.x - a.x;
    const steep = Math.abs(b.y - a.y) > Math.abs(dx) * 1.3;
    const pieces = Math.max(1, Math.ceil(Math.abs(dx) / 0.45));
    for (let k = 0; k < pieces; k++) points.push({ x: a.x + (dx * k) / pieces, y: a.y + ((b.y - a.y) * k) / pieces, steep });
  }
  points.push({ x: last.x + 16, y: last.y, steep: false });

  const position: number[] = [];
  const colour: number[] = [];
  const uv: number[] = [];
  const c = new Color();
  for (const [i, p] of points.entries()) {
    // The corner at a wall's top or foot is earth too.
    const wall = p.steep || (points[i - 1]?.steep ?? false);
    for (const row of PROFILE) {
      const swell = wall ? 0 : row.bump * (noise(p.x * 1.15, row.z * 1.4 + 7) - 0.5) * 2;
      position.push(p.x, p.y - row.drop + swell, row.z);
      mossAt(p.x, row.z, c);
      if (wall) c.lerp(SOIL, 0.82);
      c.lerp(SHADE, (1 - row.shade) * 0.9);
      colour.push(c.r, c.g, c.b);
      uv.push(p.x * 0.55, (row.z - row.drop - (wall ? p.y : 0)) * 0.55);
    }
  }
  const index: number[] = [];
  const rows = PROFILE.length;
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
  const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, map: speckles(), roughness: 1 }));
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
function boulder(): BufferGeometry {
  const geometry = new IcosahedronGeometry(1, 3);
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
    const green = Math.min(1, Math.max(0, (y - 0.05) * 2.2 + (noise(x * 3, z * 3) - 0.5)));
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
function scatter(chapter: ChapterData, from: number, to: number): Group {
  const group = new Group();
  for (let a = from - 12; a < to + 12; a += STRETCH) group.add(stretch(chapter, a, a + STRETCH, Math.round(a * 7 + 97)));
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
function blurredTuft(seed: number): CanvasTexture {
  const next = sequence(seed);
  return drawn(96, 96, (c) => {
    for (let i = 0; i < 16; i++) {
      const x = 28 + next() * 40;
      const lean = (next() - 0.5) * 38;
      const tall = 30 + next() * 58;
      c.strokeStyle = `rgba(${22 + next() * 22},${48 + next() * 30},${22 + next() * 14},0.3)`;
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
function blurredShrub(seed: number): CanvasTexture {
  const next = sequence(seed);
  return drawn(96, 64, (c) => {
    for (let i = 0; i < 46; i++) {
      const x = 12 + next() * 72;
      const y = 26 + next() * 30 + Math.abs(x - 48) * 0.35;
      const r = 5 + next() * 9;
      const blob = c.createRadialGradient(x, y, 0, x, y, r);
      const g = 52 + next() * 44;
      blob.addColorStop(0, `rgba(${g * 0.5},${g},${g * 0.56},0.42)`);
      blob.addColorStop(1, `rgba(${g * 0.5},${g},${g * 0.56},0)`);
      c.fillStyle = blob;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

function foreground(chapter: ChapterData, from: number, to: number): Group {
  const group = new Group();
  const next = sequence(59);
  const textures = [blurredTuft(1), blurredTuft(2), blurredTuft(3)];
  const materials = textures.map((map) => new MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: false }));
  for (let x = from - 6 + next() * 4; x < to + 6; x += 3.5 + next() * 5.5) {
    const z = 4 + next() * 3.5;
    const wide = 4 + next() * 4;
    // Mostly low, along the bottom of the picture; now and then one stands tall and passes in front.
    const tall = next() < 0.2 ? 4.2 + next() * 1.6 : 2.4 + next() * 1.3;
    const card = new Mesh(new PlaneGeometry(wide, tall), materials[Math.floor(next() * materials.length)]!);
    card.position.set(x, heightAt(chapter, x) - 2.3 + tall / 2, z);
    card.renderOrder = 5;
    group.add(card);
  }
  // The undergrowth far behind the path: soft dark tufts that break the line where the moss ends.
  const far = [blurredShrub(7), blurredShrub(8), blurredShrub(9)].map((map) => new MeshBasicMaterial({ map, transparent: true, opacity: 0.8, depthWrite: false }));
  for (let x = from - 10 + next() * 4; x < to + 10; x += 1.6 + next() * 2.6) {
    const z = -8 - next() * 8;
    const wide = 2.6 + next() * 3;
    const tall = 1.4 + next() * 2.2;
    const card = new Mesh(new PlaneGeometry(wide, tall), far[Math.floor(next() * far.length)]!);
    card.position.set(x, heightAt(chapter, x) - 0.3 + tall / 2, z);
    card.renderOrder = -1;
    group.add(card);
  }
  return group;
}

// --- effects: shafts of light, and what floats in them ------------------------------------------------------

function effects(chapter: ChapterData, from: number, to: number) {
  const group = new Group();
  const next = sequence(71);
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
  for (let x = from + next() * 6; x < to + 8; x += 7 + next() * 8) {
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

  // Dust and pollen in the light: they drift slowly, and stay with the camera.
  const MOTES = 70;
  const motes = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({ color: '#fff6d0', transparent: true, opacity: 0.7, blending: AdditiveBlending, fog: false, depthWrite: false, map: drawn(32, 32, (c) => {
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
    for (const shaft of shafts) shaft.material.opacity = shaft.base * (0.8 + 0.2 * Math.sin(clock * 0.6 + shaft.phase));
    for (const [i, mote] of seeds.entries()) {
      // Each keeps its place in a window that follows the camera, and wraps round at its ends.
      const along = (((mote.x * SPAN + clock * 0.12 * mote.speed - cameraX) % SPAN) + SPAN) % SPAN;
      place.position.set(
        cameraX - SPAN / 2 + along,
        groundY + 0.3 + mote.y * 7 + Math.sin(clock * 0.5 * mote.speed + i) * 0.25,
        -5 + mote.z * 7.5,
      );
      place.scale.setScalar(mote.size * (0.6 + 0.4 * Math.sin(clock * 1.7 * mote.speed + i * 2.3)));
      place.updateMatrix();
      motes.setMatrixAt(i, place.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;
  }
  return { group, update };
}

// --- the whole dressing --------------------------------------------------------------------------------------

/** Builds a place's layers around a chapter's ground. */
export function dress(chapter: ChapterData, look: PlaceLook): Dressing {
  const group = new Group();
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const floor = Math.min(...chapter.ground.map((p) => p.y));
  KIT = kit();
  const air = effects(chapter, from, to);
  group.add(plates(from, to, floor), bank(chapter), scatter(chapter, from, to), air.group, foreground(chapter, from, to));
  return { group, background: backdrop(look), update: air.update };
}
