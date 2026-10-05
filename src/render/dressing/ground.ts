import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, type CanvasTexture } from 'three';
import type { ChapterData, SurfaceKind } from '../../sim/types';
import { MOSS, drawn, hash, heightAt, noise, sequence, surfaceAt } from './kit';

// --- L3: the ground ---------------------------------------------------------------------------------------

const SOIL = new Color('#3d2f20');

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
interface Row {
  z: number;
  /** How far under the outline it lies. */
  drop: number;
  /** 1 in the light, 0 wholly in shade. */
  shade: number;
  /** How much the surface rolls here. */
  bump: number;
  /** How far it has gone into the haze behind: 0 not at all, 1 wholly. */
  far?: number;
  /** A face that the ground was cut to, where nothing grows: 1 wholly. */
  cut?: number;
}
const PROFILE: Row[] = [
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
  { z: 2.75, drop: 4.4, shade: 0.37, bump: 0 },
  { z: 2.85, drop: 6.4, shade: 0.31, bump: 0 },
  { z: 2.9, drop: 9.5, shade: 0.27, bump: 0 },
  { z: 2.9, drop: 16, shade: 0.24, bump: 0 },
];
/** The shade is cool: what the sun doesn't reach is lit by the sky. */
const SHADE = new Color('#27413f');

/** Where the level ground of the path ends in front, in every profile. */
const EDGE = 0.45;
/** Where the forest's floor is whole again in front of a pool. */
const SHORE = 0.5;

/**
 * The forest's floor: it does not roll over into a face but slopes on towards the camera, so that the lower
 * third of the picture is ground seen from above, with things lying on it. Behind, it runs on into the haze,
 * so that it has no far edge to be found.
 */
const PROFILE_FOREST: Row[] = [
  { z: -30, drop: 0.3, shade: 0.8, bump: 0.1, far: 1 },
  { z: -22, drop: 0, shade: 0.76, bump: 0.2, far: 0.7 },
  { z: -16, drop: -0.25, shade: 0.72, bump: 0.25, far: 0.4 },
  { z: -10, drop: -0.15, shade: 0.76, bump: 0.2, far: 0.15 },
  { z: -5.5, drop: 0, shade: 0.84, bump: 0.26 },
  { z: -2.6, drop: 0, shade: 0.94, bump: 0.14 },
  { z: -0.9, drop: 0, shade: 1, bump: 0.05 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: EDGE, drop: 0, shade: 1, bump: 0 },
  // A pool's near shore rises here, just in front of the path: see `shore`.
  { z: SHORE, drop: 0.005, shade: 1, bump: 0 },
  { z: 0.9, drop: 0.04, shade: 1, bump: 0 },
  { z: 1.5, drop: 0.22, shade: 0.97, bump: 0 },
  { z: 2.2, drop: 0.55, shade: 0.9, bump: 0 },
  { z: 3.0, drop: 1.0, shade: 0.8, bump: 0 },
  { z: 3.8, drop: 1.6, shade: 0.66, bump: 0 },
  { z: 4.6, drop: 2.6, shade: 0.56, bump: 0 },
  // Where the floor ends the moss hangs over an edge, and under it the ground is cut: humus, then rock.
  { z: 5.0, drop: 3.1, shade: 0.5, bump: 0 },
  { z: 5.15, drop: 3.45, shade: 0.9, bump: 0, cut: 1 },
  { z: 5.2, drop: 4.4, shade: 0.9, bump: 0, cut: 1 },
  { z: 5.25, drop: 5.6, shade: 0.9, bump: 0, cut: 1 },
  { z: 5.3, drop: 7.4, shade: 0.9, bump: 0, cut: 1 },
  { z: 5.3, drop: 10.5, shade: 0.9, bump: 0, cut: 1 },
  { z: 5.3, drop: 16, shade: 0.9, bump: 0, cut: 1 },
];
/** Where the forest's moss ends and its cut begins, down a face in front. */
const LIP = 3.1;
/** What the forest's floor goes into far behind: its haze, a little greener. */
const FAR = new Color('#9fb588');

const HUMUS = new Color('#2f241b');
const ROOT = new Color('#7d6146');
const ROCK = [new Color('#7c827d'), new Color('#a2a79f'), new Color('#c2c4b9')];
const LICHEN = new Color('#b9c0ad');
const DEEP = new Color('#16302e');
const scratch = new Color();

/**
 * The forest's ground where it is cut, by how far under the moss: a hand of dark humus with pale fine roots,
 * then grey rock with lichen on it, going into the cool dark further down. Moss does not grow down a face.
 */
function cutAt(x: number, z: number, under: number, out: Color): Color {
  const grain = noise(x * 3.1 + z * 2.3, under * 2.7 + 5);
  if (under < 1.3) {
    out.copy(HUMUS);
    // Roots: a few thin pale runs along the face.
    const run = noise(x * 0.9 + 3, under * 9 + z);
    if (run > 0.66) out.lerp(ROOT, Math.min(1, (run - 0.66) * 5));
    return out.multiplyScalar(0.8 + grain * 0.4);
  }
  const tone = noise(x * 0.7 + 9, under * 0.9 + z * 0.6) * 1.999;
  out.copy(ROCK[Math.floor(tone)]!).lerp(ROCK[Math.floor(tone) + 1]!, tone - Math.floor(tone));
  if (grain > 0.72) out.lerp(LICHEN, (grain - 0.72) * 2.2);
  // Just under the humus the rock is stained by it.
  out.lerp(HUMUS, Math.max(0, 1 - (under - 1.3) / 0.8) * 0.7);
  return out.lerp(DEEP, Math.min(1, Math.max(0, (under - 4) / 9)) * 0.9);
}

/** How far under the path the forest's floor lies at a depth in front of it. */
export function slopeDrop(z: number): number {
  for (let j = 1; j < PROFILE_FOREST.length; j++) {
    const a = PROFILE_FOREST[j - 1]!;
    const b = PROFILE_FOREST[j]!;
    if (z <= b.z && b.z > a.z) return a.drop + ((b.drop - a.drop) * Math.max(0, z - a.z)) / (b.z - a.z);
  }
  return PROFILE_FOREST[PROFILE_FOREST.length - 1]!.drop;
}

/**
 * How far under the path the forest's floor lies at x and a depth in front of it, or null where there is no
 * floor there: past its lip, which is nearer the path where the front has drawn back to a wall.
 */
export function floorDrop(chapter: ChapterData, x: number, z: number): number | null {
  if (z <= EDGE) return 0;
  const forward = forwardAt(chapter, x);
  if (forward < 0.05) return null;
  const whole = EDGE + (z - EDGE) / forward;
  return whole > FLOOR_ENDS ? null : slopeDrop(whole);
}
/** The height of a pool's near shore at x, where the outline there is a pool's bed. */
export function shoreAt(chapter: ChapterData, x: number): number | null {
  const pool = (chapter.water ?? []).find((w) => x >= w.from && x <= w.to && heightAt(chapter, x) < w.y);
  return pool ? pool.y + SHORE_OVER : null;
}
/** How far over its water a pool's near shore lies. */
const SHORE_OVER = 0.06;

/** The depth where the forest's floor ends in front. */
export const FLOOR_ENDS = 4.6;

/** How near a wall's top the front has to draw back to the path. */
const DRAW_BACK = 2.5;

/**
 * How far forward the ground comes at x: 1 all the way, 0 not past the path's edge. At the top of a wall the
 * front draws back, since a corner that stood out towards the camera would hide what is at the wall's foot:
 * a lace, a sweet, him.
 */
export function forwardAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  const here = heightAt(chapter, x);
  let forward = 1;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (Math.abs(b.y - a.y) <= Math.abs(b.x - a.x) * 1.3) continue;
    const top = a.y > b.y ? a : b;
    const foot = a.y > b.y ? b : a;
    const away = Math.abs(x - top.x);
    // Only the upper side draws back, and only at a wall tall enough to hide something.
    if (away >= DRAW_BACK || top.y - foot.y < 0.6 || here < top.y - (top.y - foot.y) * 0.5) continue;
    if (Math.abs(top.x - foot.x) > 0.01 && (x - top.x) * (top.x - foot.x) < 0) continue;
    const t = away / DRAW_BACK;
    forward = Math.min(forward, t * t * (3 - 2 * t));
  }
  return forward;
}

/** The same for a wall's own corner, which stands at the wall and at one of its two heights. */
function forwardAtCorner(chapter: ChapterData, x: number, y: number): number {
  let forward = 1;
  for (const side of [-0.05, 0.05]) if (Math.abs(heightAt(chapter, x + side) - y) < 0.3) forward = Math.min(forward, forwardAt(chapter, x + side));
  return forward;
}

/** The edge of a deck: level to its front, then the board's end, and the dark under it. */
const PROFILE_BOARD: Row[] = [
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

/**
 * How far down a profile each of its rows lies, measured along the surface, and counted so that it is the
 * row's z on the play plane. The ground's picture and its tones are laid out by this: by z alone they would
 * be pulled long down the front, where the surface falls as fast as it comes forward.
 */
function lengthsDown(profile: Row[], forward = 1): number[] {
  const down = [0];
  for (let j = 1; j < profile.length; j++) down.push(down[j - 1]! + Math.hypot(depthOf(profile[j]!, forward) - depthOf(profile[j - 1]!, forward), profile[j]!.drop - profile[j - 1]!.drop));
  const level = profile.findIndex((row) => row.z >= -0.3);
  return down.map((d) => d - down[level]! + profile[level]!.z);
}

/** A row's depth where the front has drawn back by so much. */
function depthOf(row: Row, forward: number): number {
  return row.z > EDGE ? EDGE + (row.z - EDGE) * forward : row.z;
}

/** The bog's ground: as the bank in front, and sinking under the water behind the path. */
const PROFILE_ISLAND = PROFILE.map((row, i) => (i < 3 ? { ...row, drop: [3.2, 1.7, 0.3][i]!, bump: row.bump * 0.6 } : row));

/** What the ground is made of: a place's own, or what a chapter marks a stretch as. */
export type Ground = 'moss' | 'lawn' | 'sphagnum' | 'granite' | SurfaceKind;
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
  wood: { colours: tones('#a48a69', '#b49a78', '#c2a988', '#ccb696'), wall: new Color('#a38866'), shade: new Color('#2b2a33'), bump: 0, boards: true },
  earth: { colours: tones('#57432e', '#695037', '#7a5e41', '#8a6c4b'), wall: new Color('#4a3826'), shade: new Color('#2c2a2e'), bump: 0.5, boards: false },
  stone: { colours: tones('#767879', '#8a8c8a', '#9b9c97', '#adaca4'), wall: new Color('#6f7172'), shade: new Color('#2c3438'), bump: 0.3, boards: false },
  shavings: { colours: tones('#d6bb8a', '#e3cb9b', '#eedab0', '#f5e6c4'), wall: new Color('#cbb07d'), shade: new Color('#6a5a40'), bump: 0.6, boards: false },
  hedge: { colours: tones('#1f4a1c', '#2f6424', '#3f7a2a', '#588c34'), wall: new Color('#254a1e'), shade: new Color('#16301c'), bump: 1.3, boards: false },
  // The village street: pale slabs, dark asphalt with a little grit, and the grate's iron.
  paving: { colours: tones('#9c9a94', '#aeaca5', '#bdbbb3', '#cbc8be'), wall: new Color('#8e8c88'), shade: new Color('#3a3c44'), bump: 0, boards: false },
  asphalt: { colours: tones('#4c4f56', '#575a61', '#62656b', '#70727a'), wall: new Color('#45484e'), shade: new Color('#2a3038'), bump: 0.12, boards: false },
  iron: { colours: tones('#2e3136', '#383b41', '#44474d', '#52555b'), wall: new Color('#26282c'), shade: new Color('#22262c'), bump: 0, boards: false },
};
/** How wide a deck board is: 12 cm. */
export const BOARD = 0.8;
/** How much of its picture a kind of ground shows in one length: boards two to a tile, the speckles 256 dots to 1.8 lengths. */
export const tileOf = (kind: Ground) => (GROUNDS[kind].boards ? 1 / (BOARD * 2) : 0.55);

export function toneAt(kind: Ground, x: number, z: number, out: Color): Color {
  const look = GROUNDS[kind];
  const n = look.boards ? hash(Math.floor(x / BOARD), 3) : noise(x * 0.42 + 3, z * 0.6 + 11) * 0.65 + noise(x * 1.9, z * 2.3) * 0.35;
  const at = Math.min(2.999, Math.max(0, n * 3.4 - 0.2));
  const i = Math.floor(at);
  return out.copy(look.colours[i]!).lerp(look.colours[i + 1]!, at - i);
}

/** Deck boards, two to a tile: the grain runs along each, and a dark gap lies between them. */
export function boards(): CanvasTexture {
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
  /** A wall's top or foot: it keeps the outline's height, without the moss's roll. */
  wall: boolean;
  /** From here to the next point the outline is a wall's face. */
  face: boolean;
  /** How far along the outline it lies. */
  along: number;
  /** How far forward its front comes: see `forwardAt`. */
  forward: number;
  /** The wall whose face runs from here to the next point, where a place cuts its walls. */
  rises?: Wall;
  /**
   * Where the outline is a pool's bed: the height of the floor in front of it, a finger over the water. The
   * floor closes the pool towards the camera as a near shore, so that the water is a pool and not a tank cut
   * open in front.
   */
  shore?: number;
  kind: Ground;
}

/**
 * A wall in the forest. Its face stands between the floor at its foot and the floor at its top, and ends in
 * front where the top's floor does, which has drawn back to the path there (`forwardAt`). The lower floor
 * goes on under the upper one's rounded corner for as far as that takes to come forward again.
 */
interface Wall {
  top: number;
  foot: number;
  /** The height of the floor in front of its foot: the foot's own, or a pool's near shore. */
  floor: number;
  topForward: number;
  footForward: number;
  /** Where its foot stands, and which way from there its upper side lies. */
  x: number;
  side: 1 | -1;
  /** How far it leans from foot to top. */
  lean: number;
  along: number;
}

/** The ground of a chapter, as one mesh for each stretch of one kind of ground. */
export function bank(chapter: ChapterData, own: Ground): Group {
  const maps = { speckles: speckles(), boards: boards() };
  const group = new Group();
  for (const { kind, shape } of bankShapes(chapter, own)) {
    const wood = GROUNDS[kind].boards;
    group.add(new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, map: wood ? maps.boards : maps.speckles, roughness: wood ? 0.8 : 1 })));
  }
  return group;
}

/** The shapes of a chapter's ground, a stretch of one kind at a time. No picture is drawn for them here. */
export function bankShapes(chapter: ChapterData, own: Ground): { kind: Ground; shape: BufferGeometry }[] {
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const outline = [{ x: first.x - 16, y: first.y }, ...line, { x: last.x + 16, y: last.y }];
  // Points along the outline, close enough together for the moss to roll. A wall keeps its two corners.
  // In the forest every kind of ground but a deck lies on the forest's floor.
  const natural = own === 'moss' ? PROFILE_FOREST : PROFILE;
  const drawsBack = natural === PROFILE_FOREST;
  const points: BankPoint[] = [];
  let before = false;
  let along = 0;
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!;
    const b = outline[i + 1]!;
    const dx = b.x - a.x;
    const steep = Math.abs(b.y - a.y) > Math.abs(dx) * 1.3;
    // A cut face is banded by its height, so a tall one needs points up it.
    const pieces = Math.max(1, Math.ceil(Math.abs(dx) / 0.45), steep && drawsBack ? Math.ceil(Math.abs(b.y - a.y) / 0.9) : 1);
    const length = Math.hypot(dx, b.y - a.y);
    const ends = drawsBack && steep ? [forwardAtCorner(chapter, a.x, a.y), forwardAtCorner(chapter, b.x, b.y)] : null;
    let rises: Wall | undefined;
    if (ends) {
      const up = b.y > a.y;
      const [top, foot] = up ? [b, a] : [a, b];
      const pool = (chapter.water ?? []).find((w) => foot.x >= w.from && foot.x <= w.to && foot.y < w.y);
      rises = {
        top: top.y, foot: foot.y, floor: pool ? pool.y + SHORE_OVER : foot.y,
        topForward: up ? ends[1]! : ends[0]!, footForward: pool ? 1 : up ? ends[0]! : ends[1]!,
        x: foot.x, side: up ? 1 : -1, lean: Math.abs(top.x - foot.x), along: up ? along : along + length,
      };
    }
    for (let k = 0; k < pieces; k++) {
      const x = a.x + (dx * k) / pieces;
      // The corner at a wall's top or foot is a wall's too.
      const y = a.y + ((b.y - a.y) * k) / pieces;
      const corner = steep || before;
      const forward = !drawsBack ? 1 : ends ? ends[0]! + ((ends[1]! - ends[0]!) * k) / pieces : corner ? forwardAtCorner(chapter, x, y) : forwardAt(chapter, x);
      const pool = drawsBack ? (chapter.water ?? []).find((w) => x >= w.from && x <= w.to && y < w.y) : undefined;
      points.push({
        x, y, wall: corner, face: steep, along: along + (length * k) / pieces, forward: pool ? 1 : forward,
        ...(rises ? { rises } : {}), ...(pool ? { shore: pool.y + SHORE_OVER } : {}), kind: surfaceAt(chapter, x) ?? own,
      });
      before = steep;
    }
    along += length;
  }
  points.push({ x: last.x + 16, y: last.y, wall: false, face: false, along, forward: 1, kind: own });

  const shapes: { kind: Ground; shape: BufferGeometry }[] = [];
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i < points.length && points[i]!.kind === points[start]!.kind) continue;
    // A stretch takes the next one's first point too, so that the two meet.
    const stretch = points.slice(start, Math.min(points.length, i + 1));
    if (stretch.length > 1) shapes.push({ kind: points[start]!.kind, shape: stretchOfGround(stretch, points[start]!.kind, natural) });
    start = i;
  }
  return shapes;
}

/**
 * One stretch, as columns of points across the profile. The top and a wall's face have a column each where
 * they meet, so that each keeps its own colour and its own lie of the picture, and the corner is a corner.
 */
function stretchOfGround(points: BankPoint[], kind: Ground, natural: Row[]): BufferGeometry {
  const look = GROUNDS[kind];
  const profile = look.boards ? PROFILE_BOARD : look.sinks ? PROFILE_ISLAND : natural;
  const whole = lengthsDown(profile);
  const rows = profile.length;
  const cuts = profile === PROFILE_FOREST;
  const position: number[] = [];
  const colour: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const c = new Color();
  const tile = tileOf(kind);

  /**
   * The column at a point: of the top, or of the wall's face that runs along (ux, uy), and then of that wall
   * where the place cuts its walls. Returns its first corner.
   */
  const column = (p: BankPoint, ux = 0, uy = 0, wall?: Wall): number => {
    const first = position.length / 3;
    const face = ux !== 0 || uy !== 0;
    const forward = wall ? wall.topForward : p.forward;
    const down = forward < 1 ? lengthsDown(profile, forward) : whole;
    // A pool's near shore stands up out of its bed, and the picture goes up it.
    const rise = p.shore !== undefined ? Math.max(0, p.shore - p.y) : 0;
    // How far up its wall the point is.
    const up = wall && wall.top > wall.foot ? Math.min(1, Math.max(0, (p.y - wall.foot) / (wall.top - wall.foot))) : 0;
    for (let j = 0; j < rows; j++) {
      const row = profile[j]!;
      const z = depthOf(row, forward);
      const swell = p.wall ? 0 : row.bump * look.bump * (noise(p.x * 1.15, row.z * 1.4 + 7) - 0.5) * 2;
      let y = (p.shore !== undefined && row.z > EDGE ? p.shore : p.y) - row.drop + swell;
      let under = row.drop - (LIP - 0.5) * p.forward;
      if (wall) {
        // The face stands on the lower floor as that lies at this depth, and goes up to the upper one.
        const upper = wall.top - row.drop;
        const lowerDepth = EDGE + (z - EDGE) / Math.max(0.05, wall.footForward);
        const lower = row.z <= EDGE ? wall.foot - row.drop : wall.floor - (lowerDepth > FLOOR_ENDS + 0.7 ? row.drop : slopeDrop(lowerDepth));
        y = Math.min(upper, lower) + (upper - Math.min(upper, lower)) * up;
        under = upper - y;
      }
      position.push(p.x, y, z);
      toneAt(kind, p.x, down[j]!, c);
      if (cuts) {
        // A face is cut all the way; the front is cut under its lip, and where it has drawn back to a wall.
        const cut = face ? 1 : Math.max(row.cut ?? 0, row.z > EDGE ? 1 - p.forward : 0);
        // Over the edge the moss hangs a hand or two, further in some places than in others.
        const hang = 0.25 + noise(p.x * 1.7 + 2, z * 0.8) * 0.45;
        if (cut > 0 && under > hang) c.lerp(cutAt(p.x, z, under - hang, scratch), cut);
      } else if (face) c.lerp(look.wall, 0.82);
      c.lerp(look.shade, (1 - row.shade) * 0.9);
      if (row.far) c.lerp(FAR, row.far);
      colour.push(c.r, c.g, c.b);
      if (!face) uv.push((look.boards ? p.x : p.along) * tile, (down[j]! + (row.z > EDGE ? rise : 0)) * tile);
      // A face lies in the depth and along the wall. A board there is a board on edge, its grain into the depth.
      else if (look.boards) uv.push((p.x * ux + y * uy) * tile, z * tile);
      else uv.push(z * tile, (p.x * ux + y * uy) * tile);
    }
    return first;
  };

  const strip = (left: number, right: number, from = 0) => {
    for (let j = from; j < rows - 1; j++) index.push(left + j, left + j + 1, right + j, right + j, left + j + 1, right + j + 1);
  };
  const front = profile.findIndex((row) => row.z >= EDGE);
  let right = -1;
  let wasFace = false;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Up the wall, whichever way the outline runs.
    const turn = b.y < a.y ? -1 : 1;
    const ux = a.face ? ((b.x - a.x) / length) * turn : 0;
    const uy = a.face ? ((b.y - a.y) / length) * turn : 0;
    const wall = cuts && a.face ? a.rises : undefined;
    // Faces never share a column: two that meet may run different ways.
    const left = right < 0 || a.face || wasFace ? column(a, ux, uy, wall) : right;
    right = column(b, ux, uy, wall);
    wasFace = a.face;
    strip(left, right);
    // The lower floor goes on under the upper one's corner, in front of the path: once for each wall.
    if (wall && b.rises !== wall) {
      const reach = DRAW_BACK + wall.lean;
      const steps = Math.ceil(reach / 0.45);
      let last = -1;
      for (let k = 0; k <= steps; k++) {
        const away = (reach * k) / steps;
        const here = column({ x: wall.x + wall.side * away, y: wall.floor, wall: true, face: false, along: wall.along + wall.side * away, forward: wall.footForward, kind });
        // The points run to the right in every strip, so that each faces up.
        if (last >= 0) strip(wall.side > 0 ? last : here, wall.side > 0 ? here : last, front);
        last = here;
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  return geometry;
}
