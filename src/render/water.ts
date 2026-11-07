import {
  BufferGeometry, CanvasTexture, ClampToEdgeWrapping, Color, DataTexture, DoubleSide, Float32BufferAttribute, Group,
  HalfFloatType, LinearFilter, Matrix4, Mesh, RedFormat, MeshBasicMaterial, OrthographicCamera, PerspectiveCamera, Plane, RepeatWrapping,
  SRGBColorSpace, ShaderMaterial, Vector2, Vector3, Vector4, WebGLRenderTarget, type Camera, type InstancedMesh, type Material,
  type Object3D, type Texture, type WebGLRenderer,
} from 'three';
import type { ChapterData, PlaceId } from '../sim/types';
import { KIT } from './dressing/kit';
import type { Tier } from './quality';

/** A tiny generated flow field: mostly downstream, with gentle eddies. No downloaded texture. */
function flowField() {
  const data = new Uint8Array(32 * 32 * 4);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
    const angle = Math.sin(x * Math.PI / 8) * Math.cos(y * Math.PI / 8) * 0.7;
    data.set([Math.round(128 + Math.cos(angle) * 100), Math.round(128 + Math.sin(angle) * 100), 128, 255], (y * 32 + x) * 4);
  }
  const texture = new DataTexture(data, 32, 32);
  texture.name = 'water-flow';
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

const CAUSTIC = /* glsl */ `
  float causticPattern(vec2 p, float time) {
    vec2 q = p * 6.0 + vec2(time * 0.43, time * -0.3);
    float a = sin(q.x + sin(q.y * 0.73 + time * 0.2));
    float b = sin(q.y + sin(q.x * 0.82 - time * 0.3));
    return pow(max(0.0, 1.0 - abs(a + b) * 1.6), 4.0);
  }
`;

/**
 * How a place's water lies and looks (art bible §2.3). Its colour and opacity are the place's own
 * (`PlaceLook.water`); what it mirrors is the place's sky and far scenery. The rest is here.
 */
export interface WaterKind {
  /** Where the water is cut towards the camera, and where that cut meets the ground at a pool's two ends. */
  front: number;
  corner: number;
  /** How far behind the path it reaches, and from where it thins out into the haze. */
  back: number;
  thins: number;
  /** Where the water behind the whole chapter begins: the bog's ground is islands in it. */
  behind: number | null;
  /** A pool that goes on behind the ground has no banks there: its sides thin out over this many EL. */
  feather: number;
  /** How far down the cut face goes. */
  depth: number;
  /** Shallow water: how far under the surface its bed lies, and how far back its far shore reaches. */
  bed: number;
  shore: number;
  /** Its own colour, as a share of the place's: deep water gives little light back. */
  dim: number;
  /** The cut face, from the waterline down, over `ramp` EL; and how much of what is behind shows at the waterline. */
  faceTop: string;
  faceDeep: string;
  ramp: number;
  faceAlpha: number;
  /** And how solid the face is from 1.2 EL under the waterline down. */
  faceBelow: number;
  /** How fast it hides what is in it, per EL of water looked through, and the colour it gives that. */
  murk: number;
  through: string;
  /** How much it mirrors, the mirror's tint, and how big its ripples are. */
  mirror: number;
  tint: string;
  ripple: number;
  /** The bed of shallow water, and its wet shore. */
  bedColour: string;
  shoreColour: string;
  /** What it mirrors, where the far scenery is hidden: what the street has standing at this z, painted by it. */
  stands: number | null;
  /**
   * What lives on it (Mid and High): how many pine needles and bits of leaf drift on it with the flow, and how much of
   * a long slow swell runs under its ripples. Left out: none.
   */
  drift?: number;
  swell?: number;
}

/**
 * A clear pool, as the forest's brook has: the test course's too, and any place without a kind of its own. It is a
 * Norrland brook (the graphics pass of 6 November 2026, after the reference brief): humic, the colour of tea, amber
 * where the light goes into it over stones, near black where it is deep. It was a tropical teal.
 */
const POOL: WaterKind = {
  front: 0.65, corner: 0.65, back: -34, thins: -18, behind: null, feather: 3, depth: 6, bed: 0, shore: 0,
  // Humic water is murky: what lies a hand's breadth in shows amber, a length in hardly. At 0.11 the green bank
  // behind it showed through all of its depth, and a brook seen from the side was a tank of olive water.
  dim: 0.72, faceTop: '#5a4a2a', faceDeep: '#15120b', ramp: 2.6, faceAlpha: 0.9, faceBelow: 0.97, murk: 0.42, through: '#d8b47a',
  // Dark water mirrors darker and warmer: at 0.6 and near white it gave back the bright, hazy forest so well that
  // the brook read as mist (Olov: "har vi fixat vattnet och bäckarna så att det ser bra ut?").
  mirror: 0.42, tint: '#b8ad8c', ripple: 1.15, bedColour: '#000000', shoreColour: '#000000', stands: null,
  drift: 1, swell: 0.35,
};

const KINDS: Partial<Record<PlaceId, WaterKind>> = {
  forest: POOL,
  /** Peat water: nearly black, still, and a mirror. It lies in front of the tussocks and behind the whole bog. */
  bog: {
    front: 2.4, corner: 1.5, back: -60, thins: -26, behind: -5.5, feather: 0, depth: 12, bed: 0, shore: 0,
    dim: 0.6, faceTop: '#34423f', faceDeep: '#0e1a18', ramp: 1.6, faceAlpha: 0.93, faceBelow: 1, murk: 0.5, through: '#c9d2c0',
    mirror: 0.5, tint: '#c8bd9e', ripple: 0.8, bedColour: '#000000', shoreColour: '#000000', stands: null,
    drift: 0.6,
  },
  /** Rain water in a dip of the street: a hand deep, asphalt under it, and a wet shore towards the houses. */
  village: {
    front: 0.65, corner: 0.65, back: -9, thins: -9, behind: null, feather: 0, depth: 6, bed: 0.5, shore: -13.4,
    dim: 0.7, faceTop: '#3d4954', faceDeep: '#2a323b', ramp: 0.6, faceAlpha: 1, faceBelow: 1, murk: 0.08, through: '#ffffff',
    // A puddle on a street gives back the sky darker and bluer than it is, over dark asphalt (Olov asked how the
    // street's water looks: the pale sky made it a flat near-white sheet). Was a grey-white tint over a lighter bed.
    mirror: 0.8, tint: '#8296b4', ripple: 0.85, bedColour: '#121418', shoreColour: '#26282c', stands: -20,
  },
};

/** A river: black, running, open towards the camera and on behind the path. Its stones and banks stand in it. */
export const RIVER: WaterKind = {
  front: 11, corner: 11, back: -60, thins: -26, behind: -5.5, feather: 0, depth: 12, bed: 0, shore: 0,
  dim: 0.6, faceTop: '#2a3a3c', faceDeep: '#0c1618', ramp: 1.6, faceAlpha: 0.93, faceBelow: 1, murk: 0.5, through: '#b8cac4',
  mirror: 0.55, tint: '#c4ccc0', ripple: 1.25, bedColour: '#000000', shoreColour: '#000000', stands: null,
  drift: 0.5, swell: 1,
};

/** How wide a thing can stand in a river with the water going on past it: more than that is a bank. */
const STANDS_IN_IT = 10;

/** A river is one water: its stretches meet half way between them, under what stands in it. */
function joined(pools: readonly { from: number; to: number; y: number }[]) {
  return pools.map((pool, i) => {
    const before = pools[i - 1];
    const after = pools[i + 1];
    return {
      ...pool,
      from: before && pool.from - before.to < STANDS_IN_IT ? (before.to + pool.from) / 2 : pool.from,
      to: after && after.from - pool.to < STANDS_IN_IT ? (pool.to + after.from) / 2 : pool.to,
    };
  });
}

/** A pool's banks as its water mirrors them: the top of the bank, and its cut face down to the water. */
const BANKS: Partial<Record<PlaceId, [string, string]>> = { forest: ['#55752a', '#3a2d20'], garden: ['#4f7d2a', '#4a3826'], bog: ['#6f5a30', '#2a201a'] };
/** What stands near the water, as its mirror shows it: a spruce's bark, a birch's, a dead pine's. */
const TRUNKS = () => new Map<Material | undefined, { tint: Color; tall: number; wide: number }>([
  [KIT?.bark, { tint: new Color('#4f4030'), tall: 60, wide: 1 }],
  [KIT?.birch, { tint: new Color('#d8d2c4'), tall: 60, wide: 1 }],
  [KIT?.deadwood, { tint: new Color('#a8a49a'), tall: 8.5, wide: 0.42 }],
]);
/** How many banks and trunks a picture of water mirrors at once: those nearest the camera. */
const MIRRORED = { banks: 8, trunks: 6 };

/** Greybox: a block of blue water a few EL deep, as before a place is dressed. */
const GREYBOX: WaterKind = { ...POOL, back: -3.95, thins: -3.95, feather: 0 };

export const waterKind = (place: PlaceId | undefined, dressed = true): WaterKind => (dressed ? (place && KINDS[place]) || POOL : GREYBOX);

/** What the water is made of: corners with their part (0 surface, 1 cut face, 2 shore), how much is there, and how deep. */
export interface WaterShape {
  position: number[];
  /** Per corner: its part, how much of the water is there (0 where it ends in nothing), how deep it is (0 at a shore), and its pool's level. */
  part: number[];
  index: number[];
}

/**
 * The water of a chapter as one mesh. A pool's surface lies where the simulation has it (`from`, `to`, `y`);
 * everything else is the picture's: how far it reaches towards and away from the camera, where it ends in
 * haze instead of an edge, and the face it is cut with in front.
 */
export function waterShape(pools: readonly { from: number; to: number; y: number }[], kind: WaterKind, span?: { from: number; to: number }, street?: (x: number) => number): WaterShape {
  const position: number[] = [];
  const part: number[] = [];
  const index: number[] = [];
  const corner = (x: number, y: number, z: number, which: number, there: number, deep: number, level: number) => {
    position.push(x, y, z);
    part.push(which, there, deep, level);
    return position.length / 3 - 1;
  };
  const quad = (a: number, b: number, c: number, d: number) => index.push(a, b, c, c, b, d);
  /** A piece of surface: columns along x, rows from the camera away, and what there is at each crossing. */
  const sheet = (y: number, columns: number[], rows: (column: number) => { z: number; y?: number; there?: number; deep?: number; which?: number }[]) => {
    const grid = columns.map((x, i) => rows(i).map((row) => corner(x, row.y ?? y, row.z, row.which ?? 0, row.there ?? 1, row.deep ?? 1, y)));
    for (let i = 0; i < grid.length - 1; i++) for (let j = 0; j < grid[i]!.length - 1; j++) quad(grid[i]![j]!, grid[i + 1]![j]!, grid[i]![j + 1]!, grid[i + 1]![j + 1]!);
  };
  if (!pools.length) return { position, part, index };
  const level = pools[0]!.y;
  const everywhere = kind.behind !== null && span !== undefined;
  // Far shores first, then the water behind everything, then each pool from its face to its surface: the
  // mesh is drawn in this order, and nothing of it is in front of what comes later.
  if (kind.bed > 0) for (const w of pools) {
    const up = street ? Math.max(street(w.from - 0.2), street(w.to + 0.2)) : w.y + 0.3;
    sheet(w.y, [w.from, w.to], () => [
      { z: kind.back + 0.4, which: 2 }, { z: kind.back - 0.5, y: up, which: 2 }, { z: kind.shore, y: up, which: 2 },
    ]);
  }
  if (everywhere) {
    const xs = [span.from - 60, span.to + 60];
    for (const w of pools) if (w.y === level) xs.push(...columnsOf(w, kind.corner < kind.front ? 1.2 : 0));
    const columns = [...new Set(xs)].sort((a, b) => a - b);
    sheet(level, columns, () => [{ z: kind.behind! }, { z: kind.thins }, { z: kind.back, there: 0 }]);
  }
  for (const w of pools) {
    const joined = everywhere && w.y === level;
    const inset = kind.corner < kind.front ? 1.2 : joined ? 0 : kind.bed > 0 ? 2 : kind.feather;
    const columns = columnsOf(w, inset);
    const front = columns.map((_, i) => (i === 0 || i === columns.length - 1 ? kind.corner : kind.front));
    const edge = (i: number) => i === 0 || i === columns.length - 1;
    // The cut face: straight down from the front of the surface.
    for (let i = 0; i < columns.length - 1; i++) {
      quad(
        corner(columns[i]!, w.y, front[i]!, 1, 1, 1, w.y), corner(columns[i + 1]!, w.y, front[i + 1]!, 1, 1, 1, w.y),
        corner(columns[i]!, w.y - kind.depth, front[i]!, 1, 1, 1, w.y), corner(columns[i + 1]!, w.y - kind.depth, front[i + 1]!, 1, 1, 1, w.y),
      );
    }
    if (joined) sheet(w.y, columns, (i) => [{ z: front[i]! }, { z: kind.behind! }]);
    else if (kind.bed > 0) {
      // A puddle: shallow at its shores, a hand deep in the middle.
      sheet(w.y, columns, (i) => [
        { z: front[i]!, deep: edge(i) ? 0 : 1 }, { z: kind.back + 2.5, deep: edge(i) ? 0 : 1 }, { z: kind.back, deep: 0 },
      ]);
    } else if (kind.feather > 0) {
      // Behind the ground's back edge no bank holds the pool: its sides and its far end thin out.
      sheet(w.y, columns, (i) => [
        { z: front[i]! }, { z: -15.5 }, { z: kind.thins - 2, there: edge(i) ? 0 : 1 }, { z: kind.back, there: 0 },
      ]);
    } else sheet(w.y, columns, (i) => [{ z: front[i]! }, { z: kind.back }]);
  }
  return { position, part, index };
}

/** A pool's columns: its two ends, and one a little inside each. */
function columnsOf(w: { from: number; to: number }, inset: number): number[] {
  const by = Math.min(inset, (w.to - w.from) / 3);
  return by > 0 ? [w.from, w.from + by, w.to - by, w.to] : [w.from, w.to];
}

/** What the view hands the water of a place, so that it mirrors the place it lies in. */
export interface WaterSetting {
  place?: PlaceId;
  /** The backdrop's colours: the mirrored sky is drawn from the same ones. */
  sky?: { top: string; middle: string; glow: string };
  /** The far layers' cards (`far-…` in backdrop.ts). Their pictures are mirrored, upside down, in the water. */
  far?: Object3D[];
  /** The chapter's ground at x: a shallow puddle's far shore lies at the street's height. */
  street?: (x: number) => number;
  /** A street's puddle mirrors its far side: the street paints it (village.ts `paintStreetMirror`), at its x and y. */
  stands?: (c: CanvasRenderingContext2D, column: (x: number) => number, row: (y: number) => number) => void;
}

interface FarCard { card: Mesh; map: Texture; z: number; every: number; tall: number; eye: number }

/** Reads a far layer's card as backdrop.ts made it: how wide and tall its picture hangs, and which row is at his eyes. */
function farCard(object: Object3D): FarCard | null {
  const card = object as Mesh;
  const map = (card.material as MeshBasicMaterial | undefined)?.map;
  const at = card.geometry?.getAttribute('position');
  const uv = card.geometry?.getAttribute('uv');
  if (!map?.image || !at || !uv) return null;
  let every = 0;
  let tall = 0;
  for (let i = 1; i < at.count; i++) {
    if (!every && at.getX(i) !== at.getX(0) && uv.getX(i) !== uv.getX(0)) every = (at.getX(i) - at.getX(0)) / (uv.getX(i) - uv.getX(0));
    if (!tall && at.getY(i) !== at.getY(0) && uv.getY(i) !== uv.getY(0)) tall = (at.getY(i) - at.getY(0)) / (uv.getY(i) - uv.getY(0));
  }
  if (!(every > 0) || !(tall > 0)) return null;
  return { card, map, z: card.position.z, every, tall, eye: uv.getY(0) - at.getY(0) / tall };
}

/** The mirror strip's size, and how far it reaches over and under the height of his eyes, in EL. */
const STRIP = { wide: 512, high: 128, above: 24, below: 4 };
/** How much higher a street's puddle shows what stands behind it than a mirror would. */
export const MIRROR_REACH = 3.5;
/**
 * The layer of what the water mirrors as it is, seen from under it (Mid and High): him, what he rides and carries, the
 * ghost, the family, the candy and what floats. Everything else stays on the common layer only.
 */
export const MIRRORED_NEAR = 5;
/** How much of the place's haze the water's surface takes, against the ground's. */
const WATER_HAZE = 0.6;
/**
 * Rings on the water at once (Mid and High): where something touches it, his steps and landings, a wake behind what he
 * rides, a fish rising. The newest takes the oldest's place.
 */
const RINGS = 8;
/** How fast a ring spreads, in EL a second, and how long it lasts. */
const RING_SPEED = 0.85;
const RING_LIFE = 3;
/** How far from a pool the camera may look and the pool still mirror what is near it, in EL. */
const NEAR_REACH = 16;
/** Where the camera stands, for the strip's sake: this far in front of the path, and this far under the far pictures' eye row. */
const SEEN_FROM = { z: 10.5, under: 0.55 };

/**
 * One picture of everything far away, as it stands on the nearest far layer's card: the farther layers are
 * drawn onto it at the size they have seen from the path. The water mirrors this one card about its own
 * surface, so the spruces across the bog stand on their heads in the pool below them. Built once, at load.
 */
function mirrorStrip(cards: Object3D[]): { map: CanvasTexture; frame: Vector4; anchor: FarCard } | null {
  const layers = cards.map(farCard).filter((layer): layer is FarCard => layer !== null).sort((a, b) => a.z - b.z);
  const anchor = layers[layers.length - 1];
  if (!anchor || typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = STRIP.wide;
  canvas.height = STRIP.high;
  const c = canvas.getContext('2d')!;
  const row = (y: number) => ((STRIP.above - y) / (STRIP.above + STRIP.below)) * STRIP.high;
  for (const layer of layers) {
    const image = layer.map.image as HTMLCanvasElement;
    // A layer behind the nearest is smaller on its card by as much as it is farther off.
    const small = (SEEN_FROM.z - anchor.z) / (SEEN_FROM.z - layer.z);
    const times = Math.max(1, Math.round(anchor.every / (layer.every * small)));
    const top = row(((1 - layer.eye) * layer.tall + SEEN_FROM.under) * small - SEEN_FROM.under);
    const foot = row((-layer.eye * layer.tall + SEEN_FROM.under) * small - SEEN_FROM.under);
    for (let k = 0; k < times; k++) {
      const x = (k * STRIP.wide) / times;
      c.drawImage(image, x, top, STRIP.wide / times, foot - top);
      // A card repeats its picture's foot downwards: so does the strip.
      if (foot < STRIP.high) c.drawImage(image, 0, image.height - 1, image.width, 1, x, foot, STRIP.wide / times, STRIP.high - foot);
    }
  }
  const map = new CanvasTexture(canvas);
  map.name = 'water-mirror';
  map.colorSpace = SRGBColorSpace;
  map.wrapS = RepeatWrapping;
  map.wrapT = ClampToEdgeWrapping;
  map.premultiplyAlpha = true;
  return { map, frame: new Vector4(anchor.z, anchor.every, STRIP.above + STRIP.below, STRIP.below), anchor };
}

/**
 * The same for water that has a street behind it and not the far scenery: what stands at `z` between `from`
 * and `to`, as the street paints it, in one picture that stands still in the world.
 */
function standingStrip(paint: NonNullable<WaterSetting['stands']>, z: number, from: number, to: number, base: number): { map: CanvasTexture; frame: Vector4; slide: Vector3 } | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = STRIP.wide;
  canvas.height = STRIP.high;
  paint(canvas.getContext('2d')!, (x) => ((x - from) / (to - from)) * STRIP.wide, (y) => ((STRIP.above - (y - base)) / (STRIP.above + STRIP.below)) * STRIP.high);
  const map = new CanvasTexture(canvas);
  map.name = 'water-mirror';
  map.colorSpace = SRGBColorSpace;
  map.wrapS = map.wrapT = ClampToEdgeWrapping;
  map.premultiplyAlpha = true;
  return { map, frame: new Vector4(z, to - from, STRIP.above + STRIP.below, STRIP.below), slide: new Vector3(from, 0, base) };
}

/**
 * The bog's islands as its water mirrors them on Mid, where there is no picture to mirror: how high the ground
 * stands over the water along the chapter, one row, and where its front goes under the water.
 */
function islandRow(chapter: ChapterData, kind: WaterKind, street: ((x: number) => number) | undefined): { map: DataTexture; frame: Vector4 } | null {
  const pools = chapter.water ?? [];
  const first = chapter.ground?.[0], last = chapter.ground?.[chapter.ground.length - 1];
  if (kind.behind === null || !street || !pools.length || !first || !last) return null;
  const from = first.x - 8, wide = last.x - first.x + 16, row = new Uint8Array(1024);
  // From the lowest pool's surface up: each pool reads it against its own.
  const base = Math.min(...pools.map((w) => w.y));
  for (let i = 0; i < row.length; i++) row[i] = Math.round(Math.min(1, Math.max(0, (street(from + (i / 1023) * wide) - base) / 4)) * 255);
  const map = new DataTexture(row, 1024, 1, RedFormat);
  map.name = 'water-islands';
  map.magFilter = map.minFilter = LinearFilter;
  map.needsUpdate = true;
  return { map, frame: new Vector4(from, wide, 1.65, base) };
}

/** A clear pixel: what the water mirrors of the far scenery where there is none. */
function nothingFar(): DataTexture {
  const texture = new DataTexture(new Uint8Array(4), 1, 1);
  texture.name = 'water-mirror';
  texture.needsUpdate = true;
  return texture;
}

/**
 * The water of a chapter: one mesh, one shader, the same on every tier. It mirrors the place's sky and the
 * far scenery standing on its head, darkens with depth where it is cut in front, and thins out into the haze
 * instead of ending in an edge. Mid adds the sun's glitter and caustics on what is under water, and mirrors its
 * banks: a pool's two ends, the trunks nearest it and the bog's islands, with a dark wet band where it meets a
 * bank. High also shows what lies just under the surface, from a half-size copy of the picture behind it, and
 * mirrors what stands on its banks from that same copy, in screen space (Olov's exception, 4 November 2026).
 */
export function createWater(chapter: ChapterData, look: { colour: string; opacity: number; face?: number } | null, sun: readonly [number, number, number] = [-7, 5, -4], setting: WaterSetting = {}) {
  const group = new Group();
  const pools = chapter.river ? joined(chapter.water ?? []) : chapter.water ?? [];
  const kind = chapter.river ? RIVER : waterKind(setting.place ?? chapter.place, look !== null);
  const details = { value: 0 }, time = { value: 0 };
  // A puddle in the street mirrors what stands across it: as far to each side as the camera can see it in it.
  const puddle = pools[0];
  const standing = puddle && kind.stands !== null && setting.stands
    ? standingStrip(setting.stands, kind.stands, puddle.from - 16, pools[pools.length - 1]!.to + 16, setting.street?.(puddle.from - 0.2) ?? puddle.y)
    : null;
  const mirror = pools.length && !standing ? mirrorStrip(setting.far ?? []) : null;
  const sky = setting.sky ?? { top: '#8fb6d8', middle: '#dfeaf0', glow: '#fff6dc' };
  const islands = look ? islandRow(chapter, kind, setting.street) : null;
  // Nothing near mirrored yet: a clear pixel, so that the shader never reads an empty sampler (its stand-in would
  // come and go with the tier, and the GPU's count of textures with it).
  const nothingNear = nothingFar();
  const uniforms = {
    flowMap: { value: flowField() }, time, details,
    sunDirection: { value: new Vector3(...sun).normalize() },
    waterColour: { value: new Color(look?.colour ?? '#4f9fc4') }, opacity: { value: look?.opacity ?? 0.78 },
    refraction: { value: null as WebGLRenderTarget['texture'] | null }, refractOn: { value: 0 },
    resolution: { value: new Vector2(1, 1) }, cameraFar: { value: 140 },
    fogColor: { value: new Color() }, fogNear: { value: 1 }, fogFar: { value: 100 },
    mirrorMap: { value: (standing?.map ?? mirror?.map ?? nothingFar()) as Texture },
    // The mirrored card: its z, how wide its picture hangs, how high the strip reaches, and how far of that is under the eye.
    mirrorFrame: { value: standing?.frame ?? mirror?.frame ?? new Vector4(-40, 80, STRIP.above + STRIP.below, STRIP.below) },
    // Where that card is now: its x, how far its picture has slid, and the height of its eye row.
    mirrorSlide: { value: new Vector3() },
    // How much higher up what stands behind it the water shows than a mirror would, and how much more its
    // ripples sway it: a puddle seen as flat as the street's shows a picture of all of the yard, not only its
    // kerb, and wavering (docs/visual-audit/byn.md row 8).
    mirrorReach: { value: standing ? MIRROR_REACH : 1 },
    skyTop: { value: new Color(sky.top) }, skyMiddle: { value: new Color(sky.middle) }, skyGlow: { value: new Color(sky.glow) },
    // What stands on the banks (Mid and High): each pool's two end banks, from, to and the height of each top; the
    // trunks nearest the camera, x, z, radius and top, and their colours; and on High the picture's own projection.
    banks: { value: Array.from({ length: MIRRORED.banks }, () => new Vector4(0, 0, -1e6, -1e6)) },
    columns: { value: Array.from({ length: MIRRORED.trunks }, () => new Vector4(0, 0, 0, -1e6)) },
    columnTint: { value: Array.from({ length: MIRRORED.trunks }, () => new Color()) },
    bankTop: { value: new Color((BANKS[setting.place ?? chapter.place!] ?? BANKS.forest!)[0]) },
    bankFace: { value: new Color((BANKS[setting.place ?? chapter.place!] ?? BANKS.forest!)[1]) },
    viewProjection: { value: new Matrix4() },
    islands: { value: (islands?.map ?? nothingFar()) as Texture },
    // Where the islands' row begins and how wide it is (none: 0), where their fronts go under the water, and the height it counts from.
    islandFrame: { value: islands?.frame ?? new Vector4(0, 0, 0, 0) },
    mirrorTint: { value: new Color(kind.tint) },
    faceTop: { value: new Color(kind.faceTop).multiplyScalar(look?.face ?? 1) }, faceDeep: { value: new Color(kind.faceDeep).multiplyScalar(look?.face ?? 1) },
    through: { value: new Color(kind.through) },
    bedColour: { value: new Color(kind.bedColour) }, shoreColour: { value: new Color(kind.shoreColour) },
    // Its murk per EL, the face's ramp, how much shows through the face at the waterline, and the bed's depth.
    body: { value: new Vector4(kind.murk, kind.ramp, kind.faceAlpha, kind.bed) },
    // How much it mirrors, how big its ripples are, how dark its own colour is, and how solid its face is further down.
    surface: { value: new Vector4(kind.mirror, kind.ripple, kind.dim, kind.faceBelow) },
    // What is near, mirrored as it is (Mid and High): the picture from under the water, how a point of the water
    // finds itself in it, whether there is one, and the height of the water it was taken at.
    nearMirror: { value: nothingNear as Texture }, nearMatrix: { value: new Matrix4() }, nearOn: { value: 0 }, nearLevel: { value: 0 },
    // How much of the haze its surface takes, against the ground's (all of it in the mist).
    haze: { value: WATER_HAZE },
    // Its rings: where each began (x, z), when (on its own clock) and how strong it is.
    rings: { value: Array.from({ length: RINGS }, () => new Vector4(0, 0, -100, 0)) },
    // What drifts on it, and its swell.
    life: { value: new Vector2(kind.drift ?? 0, kind.swell ?? 0) },
  };
  const material = new ShaderMaterial({
    // It writes no depth: a shaft of light or a sheet of mist that dips under the surface goes on into the
    // water, as light does, instead of being cut off along a line.
    uniforms, transparent: true, depthWrite: false, fog: true, side: DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec4 part;
      varying vec3 waterWorld; varying float waterDepth; varying vec4 waterPart;
      #include <fog_pars_vertex>
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        waterWorld = world.xyz;
        // Its part, how much of it is there, how deep it is, and the height of its pool's surface.
        waterPart = vec4(part.xyz, part.w + modelMatrix[3].y);
        vec4 mvPosition = viewMatrix * world;
        waterDepth = -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D flowMap, refraction, mirrorMap, islands;
      uniform vec3 waterColour, sunDirection, skyTop, skyMiddle, skyGlow, mirrorTint, faceTop, faceDeep, through, bedColour, shoreColour;
      uniform float time, details, opacity, refractOn, cameraFar, mirrorReach, nearOn, nearLevel, haze;
      uniform vec4 rings[${RINGS}];
      uniform vec2 life;
      uniform sampler2D nearMirror;
      uniform mat4 nearMatrix;
      uniform vec4 mirrorFrame, islandFrame, body, surface, banks[${MIRRORED.banks}], columns[${MIRRORED.trunks}];
      uniform vec3 mirrorSlide, columnTint[${MIRRORED.trunks}], bankTop, bankFace;
      uniform mat4 viewProjection;
      uniform vec2 resolution;
      varying vec3 waterWorld; varying float waterDepth; varying vec4 waterPart;
      #include <fog_pars_fragment>

      // Three trains of small waves that cross each other, so that no two rows are alike. A train finer than
      // the picture's pixels where it lies is left out: far water is still. Gives the slope, and where two
      // crests meet.
      vec3 ripples(vec2 p, float t, float pixel) {
        const vec2 a = vec2(0.26, 0.97), b = vec2(-0.5, 0.87), c = vec2(0.91, 0.42);
        float wa = dot(p, a) * 1.7 + t * 0.8 + 1.4 * sin(dot(p, c) * 0.45 - t * 0.15);
        float wb = dot(p, b) * 2.9 - t * 1.1 + 1.2 * sin(dot(p, a) * 0.7 + t * 0.2);
        float wc = dot(p, c) * 5.1 + t * 1.6 + 0.9 * sin(wa * 0.6);
        float fa = 1.0 - smoothstep(0.5, 1.4, pixel * 1.7);
        float fb = 1.0 - smoothstep(0.5, 1.4, pixel * 2.9);
        float fc = 1.0 - smoothstep(0.5, 1.4, pixel * 5.1);
        vec2 slope = a * cos(wa) * 0.55 * fa + b * cos(wb) * 0.3 * fb + c * cos(wc) * 0.15 * fc;
        return vec3(slope, cos(wb) * cos(wc) * fb * fc);
      }

      void main() {
        vec2 screen = gl_FragCoord.xy / resolution;
        float isTop = 1.0 - step(0.5, waterPart.x);
        vec3 ray = waterWorld - cameraPosition;
        vec3 view = -normalize(ray);
        vec2 flow = texture2D(flowMap, waterWorld.xz * 0.045).rg * 2.0 - 1.0;
        vec3 wave = ripples(waterWorld.xz - flow * time * 0.2, time, fwidth(waterWorld.z) + fwidth(waterWorld.x) * 0.3);
        // Cat's paws: the wind roughens the water in patches that drift slowly over it, between them it lies almost
        // still and mirrors cleanly, so that it looks alive and never like glass (Olov: "lite vågor och rörelse").
        float gust = 0.45 + 0.55 * smoothstep(-0.3, 0.9, sin(waterWorld.x * 0.23 - time * 0.55 + 1.6 * sin(waterWorld.z * 0.31 + time * 0.17))
          * sin(waterWorld.z * 0.47 + waterWorld.x * 0.11 + time * 0.23));
        vec2 slope = wave.xy * surface.y * 0.03 * gust;
        // Open water's long slow swell under the ripples: broad bands that the mirror leans into as they pass.
        if (details > 0.5 && life.y > 0.0) {
          slope += vec2(cos(waterWorld.x * 0.33 - time * 0.85 + 0.6 * sin(waterWorld.z * 0.21)), 0.6 * cos(waterWorld.z * 0.47 + waterWorld.x * 0.09 + time * 0.55))
            * 0.035 * life.y;
        }
        // Rings where something touched it: a few crests that spread and die away, tipping the mirror as they pass.
        float ringCrest = 0.0, ringTrough = 0.0;
        if (details > 0.5 && isTop > 0.5) {
          for (int i = 0; i < ${RINGS}; i++) {
            vec4 ring = rings[i];
            float age = time - ring.z;
            if (age < 0.0 || age > ${RING_LIFE.toFixed(1)}) continue;
            vec2 from = waterWorld.xz - ring.xy;
            float dist = length(from);
            float off = dist - age * ${RING_SPEED.toFixed(2)};
            float strength = exp(-off * off * 14.0) * exp(-age * 1.1) * ring.w * smoothstep(0.0, 0.1, age) * smoothstep(0.0, 0.3, dist + 0.05);
            float crest = sin(off * 24.0) * strength;
            slope += from / max(dist, 1e-3) * crest * 0.12;
            ringCrest += max(crest, 0.0);
            ringTrough += max(-crest, 0.0);
          }
        }

        // The mirror. The camera looks level, so what the water shows at a point is what stands as high over
        // the water, as far behind it, as the eye is in front of it: the far card upside down, hinged where
        // it meets the water. A ripple tips the mirror, mostly up and down.
        float run = max(waterWorld.z - mirrorFrame.x, 0.0);
        float away = max(-ray.z, 0.05);
        float rise = max(-ray.y / away + slope.y * 1.6, 0.0);
        vec2 hit = vec2(waterWorld.x + ray.x / away * run + slope.x * (2.0 + rise * run) * mirrorReach, waterWorld.y + rise * run * mirrorReach);
        vec4 far = texture2D(mirrorMap, vec2((hit.x - mirrorSlide.x) / mirrorFrame.y + mirrorSlide.y, (hit.y - mirrorSlide.z + mirrorFrame.w) / mirrorFrame.z));
        // The sky is the backdrop's own: its gradient by how high the mirrored ray goes, and its glow where the sun stands.
        float high = rise / 0.536;
        vec3 sky = mix(skyMiddle, skyTop, clamp((high - 0.08) / 0.42, 0.0, 1.0));
        float glow = clamp(1.0 - length(vec2(screen.x + slope.x * 2.0 - 0.273, high - 0.129)) / 0.664, 0.0, 1.0);
        sky = mix(sky, skyGlow, glow);
        vec3 mirrored = (sky * (1.0 - far.a) + far.rgb) * mirrorTint;
        // What stands on its banks, mirrored about its surface (Olov's exception of 4 November 2026): the view ray
        // goes on under the surface into the mirrored world. Mid and High: a pool's end banks and the trunks near
        // it, from what is known of them; High: the picture so far itself, in a few steps in screen space.
        float banked = 0.0;
        if (details > 0.5 && isTop > 0.5 && body.w <= 0.0) {
          vec3 d = normalize(ray + vec3(slope.x * 5.0, 0.0, slope.y * 2.0) * length(ray));
          float near = 1e9;
          vec3 standing = vec3(0.0);
          for (int i = 0; i < ${MIRRORED.banks}; i++) {
            vec4 b = banks[i];
            if (waterWorld.x < b.x - 0.05 || waterWorld.x > b.y + 0.05) continue;
            // A dark wet band where it meets a bank.
            float left = b.z - waterPart.w, right = b.w - waterPart.w;
            banked = max(banked, max(step(0.05, left) * (1.0 - smoothstep(0.0, 0.5, waterWorld.x - b.x)), step(0.05, right) * (1.0 - smoothstep(0.0, 0.5, b.y - waterWorld.x))));
            float t = ((d.x < 0.0 ? b.x : b.y) - waterWorld.x) / (abs(d.x) < 1e-4 ? 1e-4 : d.x);
            float high = d.x < 0.0 ? left : right;
            float under = -d.y * t;
            if (t > 0.0 && t < near && under < high && waterWorld.z + d.z * t > -16.0) {
              near = t;
              standing = mix(bankFace, bankTop, smoothstep(high - 0.45, high - 0.1, under)) * (0.7 + 0.3 * smoothstep(0.0, 0.6, under));
            }
          }
          for (int i = 0; i < ${MIRRORED.trunks}; i++) {
            vec4 c = columns[i];
            vec2 o = waterWorld.xz - c.xy;
            float a = dot(d.xz, d.xz), b = dot(o, d.xz), k = b * b - a * (dot(o, o) - c.z * c.z);
            if (k <= 0.0) continue;
            float t = (-b - sqrt(k)) / max(a, 1e-6);
            if (t > 0.0 && t < near && -d.y * t < c.w - waterPart.w) {
              near = t;
              vec2 side = (o + d.xz * t) / c.z;
              standing = columnTint[i] * (0.6 + 0.4 * clamp(side.x * sign(sunDirection.x), 0.0, 1.0));
            }
          }
          // The bog's islands, where the water lies in front of them: their fronts, on their heads.
          float front = (waterWorld.z - islandFrame.z) / max(-d.z, 0.05);
          if (islandFrame.y > 0.0 && front > 0.0 && front < near) {
            float high = textureLod(islands, vec2((waterWorld.x + d.x * front - islandFrame.x) / islandFrame.y, 0.5), 0.0).r * 4.0 + islandFrame.w - waterPart.w;
            float under = -d.y * front;
            if (under < high - 0.02) { near = front; standing = mix(bankFace, bankTop, smoothstep(high - 0.5, high - 0.12, under)) * (0.7 + 0.3 * smoothstep(0.0, 0.5, under)); }
          }
          float stands = near < 1e8 ? 0.92 * (1.0 - smoothstep(14.0, 32.0, near)) : 0.0;
          if (refractOn > 0.5 && waterDepth < 45.0) {
            // The picture so far, mirrored: the mirrored ray in growing steps against the picture's own depth.
            vec3 r = reflect(d, vec3(0.0, 1.0, 0.0));
            // Each pixel starts its steps a little differently, so that where they skip over the near side of
            // something they leave fine grain and not stripes (the bog's tussocks, 6 November 2026).
            float s = 0.25 * (0.55 + 0.9 * fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))))), last = 0.0;
            for (int i = 0; i < 8; i++) {
              vec4 clip = viewProjection * vec4(waterWorld + r * s, 1.0);
              vec2 uv = clip.xy / clip.w * 0.5 + 0.5;
              if (uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0) break;
              float gap = clip.w - textureLod(refraction, uv, 0.0).a * cameraFar;
              if (gap > 0.0 && gap < 0.5 + s * 0.35) {
                for (int j = 0; j < 5; j++) {
                  float m = (last + s) * 0.5;
                  vec4 mc = viewProjection * vec4(waterWorld + r * m, 1.0);
                  vec2 mu = mc.xy / mc.w * 0.5 + 0.5;
                  if (mc.w - textureLod(refraction, mu, 0.0).a * cameraFar > 0.0) { s = m; uv = mu; } else last = m;
                }
                // It fades where the mirrored point is off the picture, and the further it is from the water.
                float fade = smoothstep(1.0, 0.82, uv.y) * smoothstep(0.0, 0.05, uv.x) * smoothstep(1.0, 0.95, uv.x) * (1.0 - smoothstep(8.0, 22.0, s));
                vec3 seen = textureLod(refraction, uv, 0.0).rgb;
                standing = stands > 0.0 ? mix(standing, seen, fade) : seen;
                stands = max(stands, fade);
                break;
              }
              last = s;
              s = s * 1.7 + 0.2;
            }
          }
          mirrored = mix(mirrored, standing * mirrorTint, stands);
        }
        // Him, what he rides, the ghost, the family and the candy, as they are, from under the water: the picture a
        // camera mirrored in the water's surface takes, rippled as the surface is (Mid and High).
        if (nearOn > 0.5 && isTop > 0.5 && abs(waterPart.w - nearLevel) < 0.12) {
          vec4 nearAt = nearMatrix * vec4(waterWorld.x + slope.x * 4.0, nearLevel, waterWorld.z + slope.y * 2.0, 1.0);
          vec2 nearUv = nearAt.xy / nearAt.w;
          if (nearAt.w > 0.0 && all(greaterThan(nearUv, vec2(0.0))) && all(lessThan(nearUv, vec2(1.0)))) {
            vec4 seenNear = texture2D(nearMirror, nearUv);
            mirrored = mix(mirrored, seenNear.rgb * mirrorTint, clamp(seenNear.a, 0.0, 1.0));
          }
        }
        // Dark things are darker in water than in the air, and the sky keeps its light.
        mirrored *= 0.55 + 0.75 * dot(mirrored, vec3(0.3, 0.6, 0.1));
        // Water mirrors most where it is looked along, and a ripple's near side is looked into.
        float facing = clamp(view.y - dot(view.xz, wave.xy) * surface.y * 0.035, 0.0, 1.0);
        float glance = pow(1.0 - facing, 3.0);
        float mirrors = surface.x * (0.15 + 0.85 * glance);

        // Its own colour: dark where it is deep, and its bed where it is shallow.
        // Little of what is behind it shows through its surface: a third of what the place's opacity leaves.
        vec3 own = waterColour * surface.z;
        float solid = 1.0 - (1.0 - opacity) * 0.3;
        float wetOnly = 0.0;
        if (body.w > 0.0) {
          float grit = fract(sin(dot(floor(waterWorld.xz * 9.0), vec2(12.9898, 78.233))) * 43758.5453);
          // A puddle's shore is never straight (Olov: "pölen ser väldigt rak ut på sina kanter"): where the water
          // thins towards its ends and its far side it ends along a wandering line, and beyond it the asphalt is only
          // wet, dark and with a dull sheen; a darker line where the water's edge lies on it.
          float wander = 0.5 + 0.22 * sin(waterWorld.x * 0.9 + 2.0 * sin(waterWorld.z * 0.55)) + 0.18 * sin(waterWorld.z * 1.4 + waterWorld.x * 0.37)
            + 0.1 * sin(waterWorld.x * 3.1 - waterWorld.z * 2.3);
          float depth = clamp((waterPart.z - 0.55 * wander) / max(1.0 - 0.55 * wander, 0.05), 0.0, 1.0);
          float wetEdge = smoothstep(0.0, 0.05, depth);
          wetOnly = 1.0 - wetEdge;
          float water = (1.0 - exp(-body.x * body.w * depth / max(facing, 0.08))) * wetEdge;
          own = mix(bedColour * (0.88 + 0.24 * grit) * (1.0 - 0.35 * smoothstep(0.0, 0.03, depth) * (1.0 - smoothstep(0.03, 0.12, depth))), own, water);
          solid = 1.0;
        }
        vec3 top = mix(own, mirrored, mirrors * (1.0 - 0.8 * wetOnly)) * (1.0 - 0.3 * banked);
        // A ring's crests catch the light and its troughs are darker, whatever the light: by day and by night.
        top *= 1.0 + (0.55 * min(ringCrest, 1.0) - 0.3 * min(ringTrough, 1.0)) * (1.0 - wetOnly);
        top += mix(skyMiddle, skyGlow, 0.5) * mirrorTint * min(ringCrest, 1.0) * 0.08 * (1.0 - wetOnly);
        // Pine needles and bits of birch leaf afloat, drifting with the flow and turning in its eddies: a needle in one
        // patch of water in six, a leaf in one in twenty. They fade where they would be smaller than the pixels.
        if (details > 0.5 && isTop > 0.5 && life.x > 0.0) {
          vec2 afloat = (waterWorld.xz * vec2(1.0, 1.7) - flow * time * 0.1 - vec2(time * 0.045, 0.0)) * 1.4;
          vec2 piece = floor(afloat);
          float which = fract(sin(dot(piece, vec2(127.1, 311.7))) * 43758.5453);
          if (which > 1.0 - 0.17 * life.x) {
            float turn = which * 40.0 + time * 0.15 * (fract(which * 7.3) - 0.5);
            vec2 at = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * (fract(afloat) - (vec2(fract(which * 13.7), fract(which * 71.3)) * 0.5 + 0.25));
            float leafy = step(1.0 - 0.05 * life.x, which);
            float needle = smoothstep(0.03, 0.012, abs(at.y)) * smoothstep(0.24, 0.16, abs(at.x));
            float leaf = smoothstep(0.11, 0.07, length(at * vec2(1.0, 1.7)));
            float seen = (1.0 - smoothstep(0.08, 0.22, length(fwidth(afloat)))) * (1.0 - wetOnly);
            // Dry needles are a rusty brown, paler than the water; birch leaves are yellow.
            top = mix(top, leafy > 0.5 ? vec3(0.6, 0.47, 0.16) : vec3(0.36, 0.22, 0.1), mix(needle, leaf, leafy) * seen * 0.9);
          }
        }
        if (details > 0.5) {
          // The low sun's glitter: where two crests meet, under the sky's glow.
          vec3 normal = normalize(vec3(-slope.x, 1.0, -slope.y));
          float glint = pow(max(dot(normal, normalize(view + sunDirection)), 0.0), 64.0) + pow(max(wave.z, 0.0), 10.0) * glow * glow * glow;
          top += skyGlow * mirrorTint * glint * 0.4;
        }

        // The cut face: the water's own body, darker with depth, and a pale line where the surface meets it.
        float under = max(waterPart.w - waterWorld.y, 0.0);
        vec3 face = mix(faceTop, faceDeep, smoothstep(0.0, body.y, under));
        float faceSolid = mix(body.z, surface.w, smoothstep(0.0, 1.2, under));

        if (refractOn > 0.5 && body.w <= 0.0) {
          vec2 bend = slope * 0.2 * isTop;
          vec4 behind = texture2D(refraction, clamp(screen + bend, 0.0, 1.0));
          // Do not bend a nearer character into the water from outside its silhouette.
          if (behind.a * cameraFar < waterDepth - 0.03) behind = texture2D(refraction, screen);
          // What is in the water shows as far as the water lets it: a hand's breadth clearly, three EL not at all.
          float see = exp(-max(behind.a * cameraFar - waterDepth, 0.0) * body.x);
          vec3 seen = behind.rgb * through;
          top = mix(top, seen, see * (1.0 - mirrors) * 0.85);
          // Less light reaches what lies deep: a tussock's foot shows at the waterline, a sunken plank hardly.
          face = mix(face, seen, see * exp(-under * body.x * 2.0) * 0.8);
          solid = faceSolid = 1.0;
        }
        if (details > 0.5) {
          // Looked into from the side: the light comes down into it in slow, slanting beams that fade with depth,
          // and specks drift in it, catching that light (the graphics pass of 6 November 2026).
          float beamA = smoothstep(0.55, 1.0, sin(waterWorld.x * 0.8 + waterWorld.y * 0.32 + time * 0.12) * 0.5 + 0.5);
          float beamB = smoothstep(0.6, 1.0, sin(waterWorld.x * 2.1 - waterWorld.y * 0.18 + time * 0.07 + 1.7) * 0.5 + 0.5);
          face += faceTop * 1.3 * beamA * (0.4 + 0.6 * beamB) * exp(-under * 0.5) * (1.0 - smoothstep(0.0, 0.05, -under));
          vec2 speckAt = vec2(waterWorld.x * 11.0, (waterWorld.y + time * 0.04) * 11.0 + sin(waterWorld.x * 3.0 + time * 0.3));
          float speck = step(0.982, fract(sin(dot(floor(speckAt), vec2(12.9898, 78.233))) * 43758.5453));
          face += through * 0.22 * speck * exp(-under * 0.35);
        }
        // The line is soft, so that High's depth blur, which sees the pit behind the water, does not break it.
        face = mix(face, skyMiddle * mirrorTint, 0.1 * (1.0 - smoothstep(0.0, 0.07, under)));
        if (body.w > 0.0) {
          // Shallow water: under its bed the street is cut through, dark and cool as the ground's own front.
          float ground = smoothstep(body.w - 0.02, body.w + 0.03, under);
          face = mix(face, bedColour * vec3(0.7, 0.82, 1.2) * mix(0.8, 0.4, smoothstep(body.w, body.w + 2.0, under)), ground);
          faceSolid = 1.0;
        }
        // A puddle's far shore: wet asphalt, with a little of the sky in it.
        vec3 shore = shoreColour + mirrored * 0.06;

        vec3 colour = waterPart.x < 0.5 ? top : waterPart.x < 1.5 ? face : shore;
        float there = waterPart.x < 0.5 ? solid : waterPart.x < 1.5 ? faceSolid : 1.0;
        gl_FragColor = vec4(colour, there * waterPart.y);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        // The haze, as three.js lays it (fog_fragment), but less of it on the surface: the forest's haze is pale,
        // and dark water under it, seen from above, read as grey mist. Its cut face and shore take all of it.
        #ifdef USE_FOG
          #ifdef FOG_EXP2
            float fogFactor = 1.0 - exp(-fogDensity * fogDensity * vFogDepth * vFogDepth);
          #else
            float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
          #endif
          gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, fogFactor * (waterPart.x < 0.5 ? haze : 1.0));
        #endif
      }`,
  });
  const first = chapter.ground?.[0];
  const last = chapter.ground?.[chapter.ground.length - 1];
  const shape = waterShape(pools, kind, first && last ? { from: first.x, to: last.x } : undefined, setting.street);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(shape.position, 3));
  geometry.setAttribute('part', new Float32BufferAttribute(shape.part, 4));
  geometry.setIndex(shape.index);
  geometry.computeBoundingSphere();
  const body = new Mesh(geometry, material);
  body.name = 'water';
  // After the far layers (-3) and the street's houses (-2), which it thins out over and mirrors; before
  // everything else that is see-through, so that it is drawn over the water and not under it: the shrubs at
  // the far edge of the moss (-1), the glitter bubble, the mist sheets, the shafts of light and the dust.
  body.renderOrder = -1.5;
  if (pools.length) group.add(body);
  let target: WebGLRenderTarget | null = null;
  const copyMaterial = new ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, tDepth: { value: null }, nearFar: { value: new Vector2(0.1, 140) } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `uniform sampler2D tDiffuse, tDepth; uniform vec2 nearFar; varying vec2 vUv;
      void main() {
        float d = texture2D(tDepth, vUv).r;
        float linearDepth = nearFar.x / (nearFar.y - (nearFar.y - nearFar.x) * d);
        gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb, linearDepth);
      }`,
    depthTest: false, depthWrite: false,
  });
  const triangleGeometry = new BufferGeometry();
  triangleGeometry.setAttribute('position', new Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3));
  triangleGeometry.setAttribute('uv', new Float32BufferAttribute([0, 0, 2, 0, 0, 2], 2));
  const triangle = new Mesh(triangleGeometry, copyMaterial); triangle.frustumCulled = false;
  const screenCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  function capture(renderer: WebGLRenderer, source: WebGLRenderTarget, camera: PerspectiveCamera): void {
    if (!target) return;
    uniforms.cameraFar.value = camera.far;
    (copyMaterial.uniforms.nearFar!.value as Vector2).set(camera.near, camera.far);
    copyMaterial.uniforms.tDiffuse!.value = source.texture;
    copyMaterial.uniforms.tDepth!.value = source.depthTexture;
    renderer.setRenderTarget(target);
    renderer.render(triangle, screenCamera);
  }
  // The water is drawn in the scene's own pass, after what stands in it. Just before it, High copies the
  // picture so far at half size, to see through the surface: only while water is in the picture at all.
  // The banks: each pool's two ends, and how high the ground stands over them.
  const banks = pools.map((w) => ({ w, left: setting.street?.(w.from - 0.4) ?? -1e6, right: setting.street?.(w.to + 0.4) ?? -1e6, d: 0 }));
  // The trunks near the water, found in the scene the first time it is drawn.
  let trunks: { x: number; z: number; wide: number; top: number; tint: Color; d: number }[] | null = null;
  const findTrunks = (scene: Object3D) => {
    const kinds = TRUNKS();
    const found: NonNullable<typeof trunks> = [];
    const m = new Matrix4(), at = new Vector3(), size = new Vector3();
    scene.traverse((object) => {
      const many = object as InstancedMesh;
      const kind = many.isInstancedMesh ? kinds.get(many.material as Material) : undefined;
      if (!kind) return;
      for (let i = 0; i < many.count; i++) {
        many.getMatrixAt(i, m);
        m.premultiply(many.matrixWorld);
        at.setFromMatrixPosition(m);
        size.setFromMatrixScale(m);
        if (at.z > -0.5 || at.z < -16 || !pools.some((w) => at.x > w.from - 6 && at.x < w.to + 6)) continue;
        found.push({ x: at.x, z: at.z, wide: kind.wide * size.x, top: at.y + kind.tall * size.y, tint: kind.tint, d: 0 });
      }
    });
    return found;
  };
  /** The banks and trunks nearest the camera, for this picture. */
  const nearest = (x: number) => {
    for (const b of banks) b.d = Math.max(b.w.from - x, x - b.w.to, 0);
    if (banks.length > MIRRORED.banks) banks.sort((a, b) => a.d - b.d);
    uniforms.banks.value.forEach((v, i) => { const b = banks[i]; v.set(b?.w.from ?? 0, b?.w.to ?? 0, b?.left ?? -1e6, b?.right ?? -1e6); });
    for (const t of trunks!) t.d = Math.abs(t.x - x);
    trunks!.sort((a, b) => a.d - b.d);
    uniforms.columns.value.forEach((v, i) => {
      const t = trunks![i];
      v.set(t?.x ?? 0, t?.z ?? 0, t?.wide ?? 0, t?.top ?? -1e6);
      if (t) uniforms.columnTint.value[i]!.copy(t.tint);
    });
  };
  body.onBeforeRender = (renderer: WebGLRenderer, scene, camera: Camera) => {
    trunks ??= findTrunks(scene);
    nearest(camera.position.x);
    uniforms.viewProjection.value.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    if (standing) uniforms.mirrorSlide.value.copy(standing.slide);
    else if (mirror) {
      const { card, map } = mirror.anchor;
      uniforms.mirrorSlide.value.set(card.position.x, map.offset.x, card.position.y);
    } else uniforms.mirrorSlide.value.set(0, 0, camera.position.y + SEEN_FROM.under);
    const source = renderer.getRenderTarget() as WebGLRenderTarget | null;
    if (!target || !source?.depthTexture) return;
    capture(renderer, source, camera as PerspectiveCamera);
    renderer.setRenderTarget(source);
  };
  const patched = new WeakSet<Material>();
  const causticPools = pools.slice(0, 8).map((w) => new Vector4(w.from, w.to, w.y, 0));
  while (causticPools.length < 8) causticPools.push(new Vector4(0, 0, -1e6, 0));
  let before = 0;
  // The rings: which comes next, and when the next fish rises. A street's puddle has no fish.
  let ringNext = 0, untilRise = 3;
  const lively = kind.bed <= 0;
  // What is near, mirrored as it is (Mid and High): a camera mirrored in the water's surface takes, at a third of the size,
  // only what is on the near layer, and the water reads it back where each of its points is. As three.js's Reflector
  // does it, with its near plane laid along the surface, so that nothing under the water is in the picture.
  let nearTarget: WebGLRenderTarget | null = null;
  const nearCamera = new PerspectiveCamera();
  nearCamera.layers.set(MIRRORED_NEAR);
  const surfaceUp = new Vector3(0, 1, 0), onSurface = new Vector3(), eye = new Vector3(), aim = new Vector3();
  const turn = new Matrix4(), cut = new Plane(), clip = new Vector4(), q = new Vector4();
  const toSheet = new Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  const near: Object3D[] = [];
  const clearColour = new Color();
  /** The pool round `x` that mirrors what is near, and its height now; none when no pool is in reach. */
  const poolNear = (x: number) => {
    let best: (typeof pools)[number] | null = null, distance = NEAR_REACH;
    for (const w of pools) {
      const d = Math.max(w.from - x, x - w.to, 0);
      if (d < distance) { distance = d; best = w; }
    }
    return best;
  };
  return {
    group,
    /** Things the water mirrors as they are, and the lights they are lit by in its picture (call in a warm frame). */
    mirrorNear(scene: Object3D, things: readonly (Object3D | null | undefined)[]): void {
      if (!pools.length) return;
      for (const thing of things) {
        if (!thing) continue;
        if (!near.includes(thing)) near.push(thing);
        thing.traverse((object) => object.layers.enable(MIRRORED_NEAR));
      }
      // The same lights in both pictures, so that both use the same shaders (none is compiled in play).
      scene.traverse((object) => { if ((object as { isLight?: boolean }).isLight) object.layers.enable(MIRRORED_NEAR); });
    },
    /**
     * Before the scene's own picture, on Mid and High while a pool is near `x`: what is near, from under the water.
     * Only what is on the near layer is drawn, its matrices brought up to date first; the sun's map is not drawn again.
     */
    reflect(renderer: WebGLRenderer, scene: Object3D & { background?: unknown; matrixWorldAutoUpdate: boolean }, camera: PerspectiveCamera, x: number): void {
      uniforms.nearOn.value = 0;
      const pool = nearTarget && near.length ? poolNear(x) : null;
      if (!pool || !nearTarget) return;
      const level = pool.y + body.position.y;
      camera.updateMatrixWorld();
      eye.setFromMatrixPosition(camera.matrixWorld);
      if (eye.y < level + 0.05) return;
      onSurface.set(eye.x, level, eye.z);
      // The eye, and where it looks, mirrored in the surface; up stays up as the mirror turns it.
      turn.extractRotation(camera.matrixWorld);
      aim.set(0, 0, -1).applyMatrix4(turn).add(eye);
      nearCamera.position.set(eye.x, 2 * level - eye.y, eye.z);
      nearCamera.up.set(0, 1, 0).applyMatrix4(turn).reflect(surfaceUp);
      nearCamera.lookAt(aim.x, 2 * level - aim.y, aim.z);
      nearCamera.near = camera.near; nearCamera.far = camera.far;
      nearCamera.updateMatrixWorld();
      nearCamera.projectionMatrix.copy(camera.projectionMatrix);
      uniforms.nearMatrix.value.copy(toSheet).multiply(nearCamera.projectionMatrix).multiply(nearCamera.matrixWorldInverse);
      // The near plane along the surface (an oblique frustum): what is under the water is not in this picture.
      cut.setFromNormalAndCoplanarPoint(surfaceUp, onSurface).applyMatrix4(nearCamera.matrixWorldInverse);
      clip.set(cut.normal.x, cut.normal.y, cut.normal.z, cut.constant);
      const p = nearCamera.projectionMatrix.elements;
      q.set((Math.sign(clip.x) + p[8]!) / p[0]!, (Math.sign(clip.y) + p[9]!) / p[5]!, -1, (1 + p[10]!) / p[14]!);
      clip.multiplyScalar(2 / clip.dot(q));
      p[2] = clip.x; p[6] = clip.y; p[10] = clip.z + 1; p[14] = clip.w;
      nearCamera.projectionMatrixInverse.copy(nearCamera.projectionMatrix).invert();
      for (const thing of near) thing.updateWorldMatrix(true, true);
      const target = renderer.getRenderTarget(), alpha = renderer.getClearAlpha(), maps = renderer.shadowMap.autoUpdate;
      const background = scene.background, update = scene.matrixWorldAutoUpdate;
      renderer.getClearColor(clearColour);
      renderer.shadowMap.autoUpdate = false;
      scene.background = null;
      scene.matrixWorldAutoUpdate = false;
      renderer.setRenderTarget(nearTarget);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene as never, nearCamera);
      renderer.setClearColor(clearColour, alpha);
      renderer.setRenderTarget(target);
      renderer.shadowMap.autoUpdate = maps;
      scene.background = background;
      scene.matrixWorldAutoUpdate = update;
      uniforms.nearLevel.value = level;
      uniforms.nearOn.value = 1;
    },
    get refracting() { return target !== null; },
    /** How thick the mist is (0 none, 1 thick): the more mist, the more of it the surface takes, up to all of it. */
    setHaze(mist: number): void { uniforms.haze.value = WATER_HAZE + (1 - WATER_HAZE) * Math.min(1, Math.max(0, mist)); },
    /** Whether it has a picture of what is near it, from under it (Mid and High). */
    get mirroringNear() { return nearTarget !== null; },
    /** How high the water stands now against its pools' own height: it rises and falls a little. */
    get level() { return body.position.y; },
    /** `still`: with reduced motion the water all but stands. */
    update(clock: number, still = false, focusX?: number) {
      const step = (clock - before) * (still ? 0.12 : 1);
      time.value += step;
      before = clock;
      body.position.y = Math.sin(time.value * 1.3) * 0.03;
      // Now and then a fish rises, or a fly lands, somewhere on the water near him: a ring and nothing else. Not on a
      // puddle in the street, and not with reduced motion.
      if (focusX === undefined || still || !lively || step <= 0) return;
      untilRise -= step;
      if (untilRise > 0) return;
      untilRise = 2 + 4 * Math.random();
      const x = focusX + (Math.random() - 0.5) * 22;
      const pool = pools.find((w) => x > w.from + 0.4 && x < w.to - 0.4);
      if (pool) this.ripple(x, -0.6 - Math.random() * Math.min(10, Math.abs(kind.thins) * 0.5), 0.45 + Math.random() * 0.5);
    },
    /** The water's surface at `x`, where there is water: its height now. */
    surfaceAt(x: number): number | null {
      const pool = pools.find((w) => x >= w.from && x <= w.to);
      return pool ? pool.y + body.position.y : null;
    },
    /** Something touches the water at x, z: a ring spreads from there (Mid and High). `strength` 1 is a landing. */
    ripple(x: number, z: number, strength: number): void {
      if (!pools.some((w) => x >= w.from - 0.3 && x <= w.to + 0.3)) return;
      uniforms.rings.value[ringNext]!.set(x, z, time.value, strength);
      ringNext = (ringNext + 1) % RINGS;
    },
    setSize(width: number, height: number, tier: Tier) {
      details.value = tier === 'low' ? 0 : 1;
      uniforms.resolution.value.set(width, height);
      // What is near, mirrored as it is: Mid and High, which draw in a linear picture of their own as this does. A
      // third of the picture's size: the ripples soften it anyway, and a tablet's High stays within its memory.
      if (tier === 'low' || !pools.length) {
        nearTarget?.dispose(); nearTarget = null; uniforms.nearOn.value = 0; uniforms.nearMirror.value = nothingNear;
      } else {
        const nw = Math.max(1, Math.ceil(width / 3)), nh = Math.max(1, Math.ceil(height / 3));
        nearTarget ??= new WebGLRenderTarget(nw, nh, { type: HalfFloatType, stencilBuffer: false });
        nearTarget.texture.name = 'water-near';
        nearTarget.setSize(nw, nh);
        uniforms.nearMirror.value = nearTarget.texture;
        // Its stand-in is not drawn with now: let it go, as if it had never been drawn with.
        nothingNear.dispose();
      }
      // Shallow water shows its own bed, not what is behind it: it needs no copy.
      if (tier !== 'high' || !pools.length || kind.bed > 0) { target?.dispose(); target = null; uniforms.refractOn.value = 0; uniforms.refraction.value = null; return; }
      const w = Math.max(1, Math.ceil(width / 2)), h = Math.max(1, Math.ceil(height / 2));
      target ??= new WebGLRenderTarget(w, h, { type: HalfFloatType, depthBuffer: false, stencilBuffer: false });
      target.texture.name = 'water-refraction';
      target.setSize(w, h);
      uniforms.refraction.value = target.texture;
      uniforms.refractOn.value = 1;
    },
    capture,
    /** Project a moving light pattern onto submerged terrain/props, with no extra geometry or draw. */
    applyCaustics(root: Object3D) {
      if (!pools.length) return;
      root.traverse((object) => {
        const material = (object as Mesh).material;
        for (const one of material ? (Array.isArray(material) ? material : [material]) : []) {
          if (patched.has(one) || one instanceof ShaderMaterial || one instanceof MeshBasicMaterial) continue;
          patched.add(one);
          const before = one.onBeforeCompile, key = one.customProgramCacheKey.bind(one);
          one.customProgramCacheKey = () => `${key()}:water-caustics-v1`;
          one.onBeforeCompile = (shader, renderer) => {
            before.call(one, shader, renderer);
            shader.uniforms.waterTime = time; shader.uniforms.waterDetails = details;
            shader.uniforms.waterPools = { value: causticPools };
            shader.vertexShader = 'varying vec3 causticWorld;\n' + shader.vertexShader;
            shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `
              vec4 causticPosition = vec4(transformed, 1.0);
              #ifdef USE_INSTANCING
                causticPosition = instanceMatrix * causticPosition;
              #endif
              causticWorld = (modelMatrix * causticPosition).xyz;
              #include <project_vertex>`);
            shader.fragmentShader = /* glsl */ `varying vec3 causticWorld; uniform float waterTime, waterDetails;
              uniform vec4 waterPools[8]; ${CAUSTIC}\n` + shader.fragmentShader;
            shader.fragmentShader = shader.fragmentShader.replace('#include <tonemapping_fragment>', /* glsl */ `
              if (waterDetails > 0.5) {
                for (int i = 0; i < 8; i++) {
                  vec4 pool = waterPools[i];
                  float depth = pool.z - causticWorld.y;
                  if (causticWorld.x > pool.x && causticWorld.x < pool.y && causticWorld.z < ${(kind.front + 0.05).toFixed(2)} && causticWorld.z > ${Math.min(kind.back, -16).toFixed(1)} && depth > 0.05 && depth < 6.0) {
                    gl_FragColor.rgb += causticPattern(causticWorld.xz + depth * 0.16, waterTime) * vec3(0.06, 0.11, 0.10) * (1.0 - depth / 6.0);
                  }
                }
              }
              #include <tonemapping_fragment>`);
          };
          one.needsUpdate = true;
        }
      });
    },
  };
}
