import {
  BoxGeometry, BufferGeometry, CanvasTexture, CircleGeometry, Color, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix3, Mesh,
  MeshBasicMaterial, MeshStandardMaterial, Object3D, PlaneGeometry, RepeatWrapping, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from 'three';
import type { ChapterData, StreetGoods, StreetPart } from '../sim/types';
import { sweetSocket } from './candy';

/**
 * The village street (the extra chapter Byn): its houses and its yard, a lamp post now and then, a bicycle
 * leaning by a cellar window, and the birches' yellow leaves on the ground.
 *
 * The houses are put together from a kit of parts modelled in Blender (art/blender/village.py): a stone foot
 * with its drip board, boards with cover strips, casings, a door behind its step, a downpipe, and a shop
 * window with its wares. The chapter says what stands where (`street` in its data). Until the kit has
 * arrived, and wherever it is missing, each house is a plain front built here.
 *
 * No shop is a real one: no name, no letters, no mark and no house number (plan §0, §2.6). What a shop sells
 * is told by the wares in its window and by a carved sign.
 */

/** A fixed sequence of numbers from 0 to 1: the same street in every session and every screenshot. */
function sequence(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fixed number from 0 to 1 for each n. */
const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 31.7) * 43758.5453;
  return s - Math.floor(s);
};

function drawn(width: number, height: number, draw: (c: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
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

/**
 * The village beyond the street, far off and soft: wooden houses with weathered tin roofs, birches in their
 * October yellow, spruces, and the low blue hills of the valley. It is one long picture far behind the
 * fronts, seen over the fences: as he walks, it slides past more slowly than the houses do.
 */
function skyline(from: number, to: number, foot: number): Mesh {
  const next = sequence(211);
  // Drawn at twice the size it is measured in, and a little out of focus: it is far away.
  const picture = drawn(1024, 256, (c) => {
    c.scale(2, 2);
    c.clearRect(0, 0, 512, 128);
    c.filter = 'blur(1.1px)';
    // Two ridges of hills, the far one paler.
    for (const [base, tall, colour] of [[78, 30, '#a9b9cc'], [92, 22, '#8fa3bd']] as const) {
      c.fillStyle = colour;
      c.beginPath();
      c.moveTo(0, 128);
      for (let px = 0; px <= 512; px += 8) c.lineTo(px, base - tall * (0.5 + 0.5 * Math.sin(px * 0.0123 + base) * Math.cos(px * 0.031 + tall)));
      c.lineTo(512, 128);
      c.fill();
    }
    // Spruces and birches between the houses.
    for (let i = 0; i < 34; i++) {
      const px = next() * 512;
      const birch = next() < 0.5;
      const tall = 16 + next() * 16;
      c.fillStyle = birch ? ['#d0b24a', '#bfa846', '#a9b060'][i % 3]! : '#3f5a48';
      c.beginPath();
      if (birch) c.ellipse(px, 104 - tall * 0.6, tall * 0.36, tall * 0.6, 0, 0, Math.PI * 2);
      else {
        c.moveTo(px, 104 - tall * 1.2);
        c.lineTo(px + tall * 0.3, 106);
        c.lineTo(px - tall * 0.3, 106);
      }
      c.fill();
    }
    // The houses: a wall, a broken roof of tin, white gable boards, a chimney, a few windows. None is red:
    // red is the candy's (docs/art-bible.md §2.2).
    const walls = ['#e3b24c', '#e9e6dc', '#e3b24c', '#c9c4b4', '#efe6c8', '#e3b24c'];
    for (let i = 0; i < 9; i++) {
      const px = 20 + i * 56 + (next() - 0.5) * 16;
      const wide = 30 + next() * 12;
      const top = 80 + next() * 6;
      c.fillStyle = walls[i % walls.length]!;
      c.fillRect(px - wide / 2, top, wide, 112 - top);
      c.fillStyle = '#a8736a';
      c.beginPath();
      c.moveTo(px - wide / 2 - 2, top);
      c.lineTo(px - wide * 0.34, top - 12);
      c.lineTo(px, top - 19);
      c.lineTo(px + wide * 0.34, top - 12);
      c.lineTo(px + wide / 2 + 2, top);
      c.fill();
      c.fillRect(px + wide * 0.12, top - 22, 4, 6);
      c.fillStyle = '#fbf6ea';
      c.fillRect(px - wide / 2 - 2, top - 1, wide + 4, 1.5);
      c.fillStyle = '#56687c';
      for (const wx of [-0.28, 0, 0.28]) c.fillRect(px + wx * wide - 2, top + 6, 4, 6);
    }
    // The haze of the valley lies over all of it, thickest at the foot.
    const haze = c.createLinearGradient(0, 40, 0, 128);
    haze.addColorStop(0, 'rgba(216,221,230,0.25)');
    haze.addColorStop(1, 'rgba(216,221,230,0.62)');
    c.globalCompositeOperation = 'source-atop';
    c.fillStyle = haze;
    c.fillRect(0, 0, 512, 128);
  });
  picture.wrapS = RepeatWrapping;
  const wide = to - from + 220;
  picture.repeat.set(wide / 96, 1);
  const plate = new Mesh(new PlaneGeometry(wide, 24), new MeshBasicMaterial({ map: picture, transparent: true, fog: false, depthWrite: false }));
  plate.position.set((from + to) / 2, foot + 14.6, -52);
  // Sorted by depth with the far scenery's cards: in front of the sky's hills, which are further off.
  plate.renderOrder = -3;
  return plate;
}

// --- the houses of the street ----------------------------------------------------------------------------------

/** How far behind the path a wall stands: right behind him, or on the other side of the crossing. */
export const STREET_DEPTH = { near: -7, far: -20 } as const;
/** How wide the glass of each shop's window is, and a door's opening, as the kit has them. */
export const WINDOW_WIDE: Record<StreetGoods, number> = { yarn: 7, boots: 8.2, bread: 5.2, candy: 6.8 };
export const DOOR_WIDE = 6;
/** What a front's upright parts take along the wall: a casing, a corner board, half a pipe, and half a sign. */
const CASING = 1;
const CORNER = 1.1;
const PIPE = 0.4;
const SIGN: Partial<Record<StreetGoods, number>> = { bread: 1.7, boots: 2.1 };
/** How far a stone foot stands out from its wall. */
const PROUD = 0.35;
/** The kit's parts that go on along a wall, and how long one of each is. */
const TILES = { sockel: 4, panel: 1.35, liggande: 4, mur: 4, staket: 3.8, hack: 6 } as const;
/** Where the kit's walls end: nothing of a house is built above 12 EL, and the picture never reaches there. */
const TOP = 12;
/** A shop window's sill, over its house's foot: the floor its wares stand on. */
const SILL = 2.6;
/**
 * A passage through a house, where the street behind the houses meets its side wall: what drives and walks
 * there comes out of its dark opening and goes into it. `near` is its front edge, behind the path.
 */
const PASSAGE = { near: -10.7, wide: 5.4, post: 0.5 };
/** How far back a house's side wall goes: no further than where the picture's top edge is still under its top. */
const SIDE = { near: 17, far: 8 };
/** The colour of each shop's door. */
const DOORS: Record<StreetGoods, string> = { candy: '#7a5632', bread: '#6b8494', boots: '#5d4a36', yarn: '#6a4a3a' };
/** How much of its colour a corner gives off where the kit says it glows: the lamps in a shop window. */
const GLOW = 2.2;

type End = 'side' | 'flat' | 'none';

/**
 * How a house's two ends are finished. A near house has a side wall where the crossing opens beside it, and a
 * far one where a yard does. Where two near houses meet, the left one has the corner board. The street's two
 * ends (what the ground's own end wall hides, and the wall cut through at the shop's door) and a far house's
 * corner behind a near one have nothing: the boards go on to the end.
 */
function ends(parts: readonly StreetPart[], i: number): { left: End; right: End } {
  const part = parts[i]!;
  const before = parts[i - 1];
  const after = parts[i + 1];
  if (part.depth === 'near') return { left: before?.depth === 'far' ? 'side' : 'none', right: after ? (after.depth === 'far' ? 'side' : 'flat') : 'none' };
  return { left: before?.kind === 'yard' ? 'side' : 'none', right: after?.kind === 'yard' ? 'side' : 'none' };
}

/**
 * The upright parts of a house's front, each from one side to the other: its corner boards, the casings of
 * its windows, its door, its pipes and its sign. None of a near house's may stand behind a big candy or a
 * hook's ring (tests/unit/street.test.ts).
 */
export function uprights(parts: readonly StreetPart[], i: number): { what: string; from: number; to: number }[] {
  const part = parts[i]!;
  if (part.kind !== 'house') return [];
  const end = ends(parts, i);
  const out: { what: string; from: number; to: number }[] = [];
  if (end.left !== 'none') out.push({ what: 'corner', from: part.from, to: part.from + CORNER });
  if (end.right !== 'none') out.push({ what: 'corner', from: part.to - CORNER, to: part.to });
  for (const w of part.windows ?? []) out.push({ what: 'casing', from: w.from - CASING, to: w.from }, { what: 'casing', from: w.to, to: w.to + CASING });
  if (part.door) out.push({ what: 'door', from: part.door.from - CASING, to: part.door.to + CASING });
  for (const x of part.pipes ?? []) out.push({ what: 'pipe', from: x - PIPE, to: x + PIPE });
  const half = part.goods ? SIGN[part.goods] : undefined;
  if (part.sign !== undefined && half !== undefined) out.push({ what: 'sign', from: part.sign - half, to: part.sign + half });
  return out;
}

/**
 * One part of the kit as plain numbers in its own space: its corners, their colours, whose colour each takes
 * (0 its own, 0.5 the house's wall, 1 the house's door) and how much of its colour it gives off.
 */
interface Shape {
  position: Float32Array;
  normal: Float32Array;
  colour: Float32Array;
  whose: Float32Array;
  glow: Float32Array;
  index: ArrayLike<number>;
}
export type VillageKit = ReadonlyMap<string, Shape>;

/**
 * Reads the kit from its loaded model. The pack step stores a model's corners as small whole numbers with the
 * scale on its node, and what is merged has no node: each part is taken out as it stands in the kit's space.
 */
export function villageKit(model: Object3D): VillageKit {
  model.updateMatrixWorld(true);
  const kit = new Map<string, Shape>();
  const point = new Vector3();
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const position = mesh.geometry.getAttribute('position');
    const normal = mesh.geometry.getAttribute('normal');
    const colour = mesh.geometry.getAttribute('color');
    const uv = mesh.geometry.getAttribute('uv');
    if (!position || !normal || !colour || !uv) return;
    const count = position.count;
    const shape: Shape = {
      position: new Float32Array(count * 3), normal: new Float32Array(count * 3), colour: new Float32Array(count * 3),
      whose: new Float32Array(count), glow: new Float32Array(count),
      index: mesh.geometry.index ? Array.from(mesh.geometry.index.array) : Array.from({ length: count }, (_, i) => i),
    };
    const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(shape.position, i * 3);
      point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(shape.normal, i * 3);
      shape.colour[i * 3] = colour.getX(i);
      shape.colour[i * 3 + 1] = colour.getY(i);
      shape.colour[i * 3 + 2] = colour.getZ(i);
      shape.whose[i] = uv.getX(i);
      // Blender's exporter turns V upside down.
      shape.glow[i] = Math.max(0, 1 - uv.getY(i));
    }
    kit.set(mesh.name, shape);
  });
  return kit;
}

/** A flat piece facing the street: from x0 to x1 and y0 to y1, `z` out from the wall. */
type Slab = [x0: number, x1: number, y0: number, y1: number, z: number, colour: string, whose?: number, glow?: number];

function flat(slabs: Slab[]): Shape {
  const shape = {
    position: new Float32Array(slabs.length * 12), normal: new Float32Array(slabs.length * 12), colour: new Float32Array(slabs.length * 12),
    whose: new Float32Array(slabs.length * 4), glow: new Float32Array(slabs.length * 4), index: [] as number[],
  };
  const paint = new Color();
  for (const [s, [x0, x1, y0, y1, z, colour, whose = 0, glow = 0]] of slabs.entries()) {
    paint.set(colour);
    for (const [c, [x, y]] of ([[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as const).entries()) {
      const i = s * 4 + c;
      shape.position.set([x, y, z], i * 3);
      shape.normal.set([0, 0, 1], i * 3);
      shape.colour.set([paint.r, paint.g, paint.b], i * 3);
      shape.whose[i] = whose;
      shape.glow[i] = glow;
    }
    shape.index.push(s * 4, s * 4 + 1, s * 4 + 2, s * 4, s * 4 + 2, s * 4 + 3);
  }
  return shape;
}

/**
 * The stand-in for the kit: the same parts by the same names, each as a few flat pieces, so that a house is
 * put together the same way with either. It has no pipe, no sign and no wares. Its pieces lie nearly in one
 * plane, a little in front of one another: seen from the side, nothing shows between them.
 */
function standIn(): VillageKit {
  const trim = '#f4efe2';
  const stone = '#8f8c86';
  const kit = new Map<string, Shape>([
    ['sockel', flat([[0, 4, -7, 1.6, 0.04, stone], [0, 4, 1.6, 1.98, 0.06, trim]])],
    ['panel', flat([[0, 1.35, 1.95, TOP, 0, '#ffffff', 0.5], [0, 0.35, 1.95, TOP, 0.02, '#e9e9e9', 0.5]])],
    ['liggande', flat([[0, 4, 1.95, TOP, 0, '#ffffff', 0.5]])],
    ['knut', flat([[-0.2, 1.1, 1.95, TOP, 0.03, trim]])],
    ['dorr', flat([[-4, 4, -7, 1.2, 0.08, '#aaa59d'], [-4, 4, 1.2, TOP, 0.04, trim], [-3, 3, 1.2, TOP, 0.06, '#ffffff', 1]])],
    ['port', flat([[0, 5.4, -7, 13, 0.02, '#15171c'], [-0.5, 0, -7, 13, 0.03, trim], [5.4, 5.9, -7, 13, 0.03, trim]])],
    ['mur', flat([[0, 4, -7, 0.5, 0.04, stone]])],
    ['staket', flat([[0, 3.8, 0.5, 4.6, 0.04, '#9a968c']])],
  ]);
  for (const [goods, wide] of Object.entries(WINDOW_WIDE)) {
    kit.set(`fonster-${goods}`, flat([[-wide / 2 - 1, wide / 2 + 1, 1.95, TOP, 0.04, trim], [-wide / 2, wide / 2, SILL, TOP, 0.06, '#ffe2a0', 0, 0.45]]));
  }
  return kit;
}

/** A house while it is put together. */
interface Build {
  position: number[];
  normal: number[];
  colour: number[];
  glow: number[];
  index: number[];
}

/** Where a wall stands, which way it runs and which way it faces: the last two in the ground's plane, as (x, z). */
interface Wall {
  x: number;
  y: number;
  z: number;
  along: readonly [number, number];
  out: readonly [number, number];
}
interface Paint {
  wall: Color;
  door: Color;
}
/** How a part is set on a wall: stretched along it, mirrored, moved up, a tone lighter or darker. */
interface Placing {
  wide?: number;
  mirror?: boolean;
  up?: number;
  tone?: number;
}
const PLAIN = new Color('#ffffff');

/** Sets a part of the kit on a wall, `at` along it, in the house's colours. A part the kit lacks is left out. */
function put(build: Build, shape: Shape | undefined, wall: Wall, at: number, paint: Paint, placing: Placing = {}): void {
  if (!shape) return;
  const { wide = 1, mirror = false, up = 0, tone = 1 } = placing;
  const stretch = mirror ? -wide : wide;
  const first = build.position.length / 3;
  for (let i = 0; i < shape.whose.length; i++) {
    const x = shape.position[i * 3]! * stretch + at;
    const y = shape.position[i * 3 + 1]!;
    const z = shape.position[i * 3 + 2]!;
    build.position.push(wall.x + wall.along[0] * x + wall.out[0] * z, wall.y + up + y, wall.z + wall.along[1] * x + wall.out[1] * z);
    // A stretched part's faces turn: their normals are divided by the stretch, and made one long again.
    const nx = shape.normal[i * 3]! / stretch;
    const ny = shape.normal[i * 3 + 1]!;
    const nz = shape.normal[i * 3 + 2]!;
    const long = Math.hypot(nx, ny, nz) || 1;
    build.normal.push((wall.along[0] * nx + wall.out[0] * nz) / long, ny / long, (wall.along[1] * nx + wall.out[1] * nz) / long);
    const whose = shape.whose[i]!;
    const tint = whose > 0.75 ? paint.door : whose > 0.25 ? paint.wall : PLAIN;
    const k = tint === paint.wall ? tone : 1;
    build.colour.push(shape.colour[i * 3]! * tint.r * k, shape.colour[i * 3 + 1]! * tint.g * k, shape.colour[i * 3 + 2]! * tint.b * k);
    build.glow.push(shape.glow[i]!, 0);
  }
  // Mirrored, a face is seen from its other side: its corners are taken the other way round.
  for (let i = 0; i < shape.index.length; i += 3) {
    build.index.push(first + shape.index[i]!, first + shape.index[i + (mirror ? 2 : 1)]!, first + shape.index[i + (mirror ? 1 : 2)]!);
  }
}

/** A part that goes on along a wall, from one place to another: a whole number of it, each a little wider or narrower. */
function run(build: Build, kit: VillageKit, name: keyof typeof TILES, wall: Wall, from: number, to: number, paint: Paint, placing: Placing = {}): void {
  if (to - from < 0.05) return;
  const pitch = TILES[name];
  const count = Math.max(1, Math.round((to - from) / pitch));
  const wide = (to - from) / (pitch * count);
  // Each board is its own tone, as boards painted in different years are.
  for (let i = 0; i < count; i++) put(build, kit.get(name), wall, from + i * pitch * wide, paint, { ...placing, wide, tone: 0.965 + 0.07 * hash(from * 3.1 + i) });
}

/** How high a part's foot stands: where the chapter says, or on the highest ground under it. */
function footOf(chapter: ChapterData, part: StreetPart): number {
  if (part.foot !== undefined) return part.foot;
  const first = Math.max(part.from, chapter.ground[0]!.x) + 0.25;
  const last = Math.min(part.to, chapter.ground[chapter.ground.length - 1]!.x) - 0.25;
  let foot = -Infinity;
  for (let x = first; x <= last; x += 0.5) foot = Math.max(foot, heightAt(chapter, x));
  return Number.isFinite(foot) ? foot : 0;
}

/**
 * A house's side wall, going back from its front's corner: its foot and its boards, and for a near house the
 * dark opening of the passage. `corner` says at which end of the wall the front is.
 */
function side(build: Build, kit: VillageKit, wall: Wall, long: number, corner: 'first' | 'last', boards: 'panel' | 'liggande', paint: Paint, passage: { at: number; up: number } | null): void {
  // The front's corner board goes round the corner and covers the wall's first bit.
  const wood: [number, number] = corner === 'first' ? [CORNER, long] : [0, long - CORNER];
  const stone: [number, number] = corner === 'first' ? [-PROUD, long] : [0, long + PROUD];
  if (!passage) {
    run(build, kit, boards, wall, wood[0], wood[1], paint);
    run(build, kit, 'sockel', wall, stone[0], stone[1], paint);
    return;
  }
  const from = passage.at - PASSAGE.post;
  const to = passage.at + PASSAGE.wide + PASSAGE.post;
  put(build, kit.get('port'), wall, passage.at, paint, { up: passage.up });
  run(build, kit, boards, wall, wood[0], from, paint);
  run(build, kit, boards, wall, to, wood[1], paint);
  run(build, kit, 'sockel', wall, stone[0], from, paint);
  run(build, kit, 'sockel', wall, to, stone[1], paint);
}

/** A house: its front with everything the chapter gives it, and a side wall at each end that is seen. */
function house(build: Build, kit: VillageKit, chapter: ChapterData, parts: readonly StreetPart[], i: number): void {
  const part = parts[i]!;
  const end = ends(parts, i);
  const foot = footOf(chapter, part);
  const z = STREET_DEPTH[part.depth];
  const goods = part.goods ?? 'bread';
  const paint = { wall: new Color(part.wall ?? '#e9e6dc'), door: new Color(DOORS[goods]) };
  const boards = part.boards === 'lying' ? 'liggande' : 'panel';
  // What the ground's own end wall hides is not built.
  const from = Math.max(part.from, chapter.ground[0]!.x - 1);
  const to = Math.min(part.to, chapter.ground[chapter.ground.length - 1]!.x + 1);
  const front: Wall = { x: 0, y: foot, z, along: [1, 0], out: [0, 1] };

  // Boards between the openings, and the stone foot under everything but the door.
  const openings = [
    ...(part.windows ?? []).map((w) => ({ from: w.from - CASING, to: w.to + CASING, door: false })),
    ...(part.door ? [{ from: part.door.from - CASING, to: part.door.to + CASING, door: true }] : []),
  ].sort((a, b) => a.from - b.from);
  let wood = from + (end.left === 'none' ? 0 : CORNER);
  let stone = from - (end.left === 'side' ? PROUD : 0);
  for (const opening of openings) {
    run(build, kit, boards, front, wood, opening.from, paint);
    wood = opening.to;
    if (!opening.door) continue;
    run(build, kit, 'sockel', front, stone, opening.from, paint);
    stone = opening.to;
  }
  run(build, kit, boards, front, wood, to - (end.right === 'none' ? 0 : CORNER), paint);
  run(build, kit, 'sockel', front, stone, to + (end.right === 'side' ? PROUD : 0), paint);
  if (end.left !== 'none') put(build, kit.get('knut'), front, from, paint);
  if (end.right !== 'none') put(build, kit.get('knut'), front, to, paint, { mirror: true });

  for (const w of part.windows ?? []) put(build, kit.get(`fonster-${goods}`), front, (w.from + w.to) / 2, paint, { wide: (w.to - w.from) / WINDOW_WIDE[goods] });
  if (part.door) put(build, kit.get('dorr'), front, (part.door.from + part.door.to) / 2, paint, { wide: (part.door.to - part.door.from) / DOOR_WIDE });
  for (const x of part.pipes ?? []) put(build, kit.get('ror'), front, x, paint);
  if (part.sign !== undefined) put(build, kit.get(`skylt-${goods}`), front, part.sign, paint);
  if (part.cellar !== undefined) put(build, kit.get('kallarfonster'), front, part.cellar, paint);

  // The side walls. A near house's has the passage where the street behind the houses comes through, with
  // its floor at the road's height: one step under the far side's foot.
  const long = SIDE[part.depth];
  const passage = (beside: StreetPart | undefined, at: number) => (part.depth === 'near' && beside ? { at, up: footOf(chapter, beside) - 1 - foot } : null);
  if (end.right === 'side') {
    side(build, kit, { x: to, y: foot, z, along: [0, -1], out: [1, 0] }, long, 'first', boards, paint, passage(parts[i + 1], z - PASSAGE.near));
  }
  if (end.left === 'side') {
    side(build, kit, { x: from, y: foot, z: z - long, along: [0, 1], out: [-1, 0] }, long, 'last', boards, paint, passage(parts[i - 1], long - (z - PASSAGE.near) - PASSAGE.wide));
  }
}

/** A yard: a low wall with a fence of boards between two gateposts, a hedge behind it, and a birch. */
function yard(build: Build, kit: VillageKit, chapter: ChapterData, part: StreetPart): void {
  const paint = { wall: PLAIN, door: PLAIN };
  const front: Wall = { x: 0, y: footOf(chapter, part), z: STREET_DEPTH[part.depth], along: [1, 0], out: [0, 1] };
  run(build, kit, 'mur', front, part.from, part.to, paint);
  run(build, kit, 'staket', front, part.from + 1.4, part.to - 1.4, paint);
  for (const x of [part.from + 0.7, part.to - 0.7]) put(build, kit.get('grindstolpe'), front, x, paint);
  run(build, kit, 'hack', front, part.from, part.to, paint);
  put(build, kit.get('bjork'), front, part.from + (part.to - part.from) * 0.4, paint);
}

/** Granite courses on a raised pavement's kerb or a shop's step, merged with the house above it. */
function masonry(build: Build, chapter: ChapterData, part: StreetPart): void {
  if (part.kind !== 'house' || part.depth !== 'near') return;
  const line = chapter.ground;
  const stone = new Color('#a5a69f');
  const mortar = new Color('#4d5558');
  const normal = new Vector3(), edge = new Vector3();
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!, b = line[i]!;
    if (a.x !== b.x || a.y === b.y || Math.min(a.y, b.y) < 0) continue;
    const side = b.y > a.y ? 1 : -1;
    const on = a.x + side * 0.01;
    if (on < part.from || on >= part.to || !chapter.surfaces?.some((s) =>
      (s.kind === 'stone' || s.kind === 'paving') && (s.from === a.x || s.to === a.x) && on > s.from && on < s.to)) continue;
    const low = Math.min(a.y, b.y), high = Math.max(a.y, b.y);
    const back = STREET_DEPTH.near, front = 0.45;
    // Wall coordinates: along its depth, up, and how far it stands proud of the collision face.
    const quad = (corners: number[][], colour: Color, tone = 1) => {
      const points = corners.map(([z, y, proud]) => new Vector3(a.x - side * proud!, y, z));
      if (side < 0) points.reverse();
      normal.subVectors(points[1]!, points[0]!).cross(edge.subVectors(points[2]!, points[0]!)).normalize();
      const first = build.position.length / 3;
      for (const point of points) {
        build.position.push(point.x, point.y, point.z);
        build.normal.push(normal.x, normal.y, normal.z);
        build.colour.push(colour.r * tone, colour.g * tone, colour.b * tone);
        build.glow.push(0, 0);
      }
      build.index.push(first, first + 1, first + 2, first, first + 2, first + 3);
    };
    // A solid recessed joint bed: nothing translucent and no coplanar overlay on the original bank.
    quad([[back, low, 0.004], [front, low, 0.004], [front, high, 0.004], [back, high, 0.004]], mortar);
    const courses = Math.max(1, Math.round((high - low) / 1.65));
    for (let row = 0; row < courses; row++) {
      const bottom = low + (high - low) * row / courses + (row ? 0.035 : 0);
      const top = low + (high - low) * (row + 1) / courses - (row < courses - 1 ? 0.035 : 0);
      for (let z = back - (row % 2) * 1.65; z < front; z += 3.3) {
        const left = Math.max(back, z) + (z > back ? 0.025 : 0);
        const right = Math.min(front, z + 3.3) - (z + 3.3 < front ? 0.025 : 0);
        const outer = [[left, bottom, 0.012], [right, bottom, 0.012], [right, top, 0.012], [left, top, 0.012]];
        const inner = [[left + 0.05, bottom + 0.05, 0.045], [right - 0.05, bottom + 0.05, 0.045], [right - 0.05, top - 0.05, 0.045], [left + 0.05, top - 0.05, 0.045]];
        const tone = 0.9 + hash(a.x + z * 1.7 + row * 11) * 0.18;
        quad(inner, stone, tone);
        for (let k = 0; k < 4; k++) quad([outer[k]!, outer[(k + 1) % 4]!, inner[(k + 1) % 4]!, inner[k]!], stone, tone * (k === 2 ? 1.08 : k === 0 ? 0.86 : 0.97));
      }
    }
  }
}

/**
 * Which of the street's stretches are drawn together. A near house is drawn by itself, and only while it is
 * in sight. Everything on the far side of a crossing is one shape: it is all in sight at once.
 */
export function drawnTogether(parts: readonly StreetPart[]): number[][] {
  const groups: number[][] = [];
  for (const [i, part] of parts.entries()) {
    const last = groups.at(-1);
    if (last && part.depth === 'far' && parts[last[0]!]!.depth === 'far') last.push(i);
    else groups.push([i]);
  }
  return groups;
}

/** Some stretches of the street as one shape: everything in it is drawn at once. */
export function assemble(kit: VillageKit, chapter: ChapterData, parts: readonly StreetPart[], which: readonly number[]): BufferGeometry {
  const build: Build = { position: [], normal: [], colour: [], glow: [], index: [] };
  for (const i of which) {
    if (parts[i]!.kind === 'house') house(build, kit, chapter, parts, i);
    else yard(build, kit, chapter, parts[i]!);
    masonry(build, chapter, parts[i]!);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(build.position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(build.normal, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(build.colour, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(build.glow, 2));
  geometry.setIndex(build.index);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * The glass of a near house's shop windows, as what it catches of the sky: two pale streaks slanting across
 * each window, one wide and one narrow. They lie just behind the bars' fronts, so the bars cross them. A far
 * house has none: its windows are small in the picture, and in the haze.
 */
function panes(chapter: ChapterData, part: StreetPart): BufferGeometry | null {
  if (part.kind !== 'house' || part.depth !== 'near' || !part.windows?.length) return null;
  const foot = footOf(chapter, part);
  const z = STREET_DEPTH[part.depth] - 0.47;
  const position: number[] = [];
  const index: number[] = [];
  const rows = 4;
  const lean = 0.42;
  for (const w of part.windows) {
    for (const [at, wide] of [[0.06, 0.2], [0.34, 0.06]] as const) {
      const first = position.length / 3;
      for (let r = 0; r <= rows; r++) {
        const up = ((TOP - SILL) * r) / rows;
        const left = w.from + (w.to - w.from) * at + up * lean;
        // Cut off at the window's side: a streak never lies on a casing.
        for (const x of [left, left + (w.to - w.from) * wide]) position.push(Math.min(w.to, Math.max(w.from, x)), foot + SILL + up, z);
        if (r < rows) index.push(first + r * 2, first + r * 2 + 1, first + r * 2 + 3, first + r * 2, first + r * 2 + 3, first + r * 2 + 2);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setIndex(index);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * What every house is drawn with: lit by the place, so that a wall stands in cool shade and each strip and
 * casing has a warm edge towards the low sun, with its colours on its corners. Where the kit says so (the
 * first UV coordinate), a corner also gives off its colour: the lamps in a shop window.
 */
function wallMaterial(): MeshStandardMaterial {
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  material.customProgramCacheKey = () => 'village-wall-v1';
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = `varying float villageGlow;\n${shader.vertexShader.replace('#include <color_vertex>', '#include <color_vertex>\n  villageGlow = uv.x;')}`;
    shader.fragmentShader = `varying float villageGlow;\n${shader.fragmentShader.replace('#include <emissivemap_fragment>',
      `#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * villageGlow * ${GLOW.toFixed(2)};`)}`;
  };
  return material;
}

/**
 * The street's pits that are open to the back: the drain and the puddle, each from its first edge to its last.
 * A pit behind which a near house stands is closed by that house's foot.
 */
function pits(chapter: ChapterData): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!;
    const b = line[i + 1]!;
    if (b.x <= a.x || Math.max(a.y, b.y) > -2) continue;
    const last = out.at(-1);
    // The dark between the drain's bars is one pit: its bars are less than 3 EL wide.
    if (last && a.x - last.to < 3) last.to = b.x;
    else out.push({ from: a.x, to: b.x });
  }
  return out.filter((pit) => !chapter.street?.some((part) => part.depth === 'near' && (pit.from + pit.to) / 2 >= part.from && (pit.from + pit.to) / 2 < part.to));
}

/**
 * Everything that stands behind the street: its houses and its yard, the far village beyond them, the dark
 * under the street, the bicycle and the shop's room. `install` puts the houses together again from the kit
 * modelled in Blender, once it has arrived.
 */
export function fronts(chapter: ChapterData, from: number, to: number): { group: Group; install(model: Object3D): boolean } {
  const group = new Group();
  const floor = heightAt(chapter, from + 20);
  const foot = Math.min(floor, 0) - 0.6;
  const parts = chapter.street ?? [];
  const material = wallMaterial();
  const plain = standIn();
  const stretches = drawnTogether(parts).map((which) => {
    const mesh = new Mesh(assemble(plain, chapter, parts, which), material);
    mesh.name = `street:${which.map((i) => parts[i]!.goods ?? parts[i]!.kind).join('+')}`;
    group.add(mesh);
    return { mesh, which };
  });
  // The glass is the chapter's, not the kit's: it is there from the first frame.
  const glass = new MeshBasicMaterial({ color: '#e6f0ff', transparent: true, opacity: 0.12, depthWrite: false });
  for (const part of parts) {
    const streaks = panes(chapter, part);
    if (streaks) group.add(new Mesh(streaks, glass));
  }
  group.add(skyline(from, to, foot));
  // Under the street it is dark: the drain and the puddle go down into it. Each has its own piece of the dark,
  // which is drawn only while that pit is in sight.
  const dark = new MeshBasicMaterial({ color: '#1d2024', fog: false });
  for (const pit of pits(chapter)) {
    const under = new Mesh(new PlaneGeometry(pit.to - pit.from + 2, 16), dark);
    under.position.set((pit.from + pit.to) / 2, Math.min(floor, 0) - 8.4, -12.6);
    under.renderOrder = -1;
    group.add(under);
  }
  group.add(bicycle(chapter), shopInterior(chapter));
  return {
    group,
    install(model) {
      const kit = villageKit(model);
      if (stretches.length === 0 || !kit.has('sockel') || !kit.has('panel')) return false;
      for (const { mesh, which } of stretches) {
        mesh.geometry.dispose();
        mesh.geometry = assemble(kit, chapter, parts, which);
      }
      return true;
    },
  };
}

/** A cutaway room continuous with the outdoor step: huge jars, plain shelves and a bag to share. */
function shopInterior(chapter: ChapterData): Group {
  const group = new Group();
  group.name = 'candy-shop-interior';
  const shop = chapter.shop;
  if (!shop) return group;
  const { door, to, floor } = shop;
  const wood = new MeshStandardMaterial({ color: '#98663f', roughness: 0.85 });
  const cream = new MeshStandardMaterial({ color: '#f1dbb2', roughness: 0.9 });
  const brass = new MeshStandardMaterial({ color: '#c9a35e', roughness: 0.6 });
  const block = (x: number, y: number, z: number, w: number, h: number, d: number, material = wood) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z); group.add(mesh); return mesh;
  };
  const wallpaper = drawn(128, 128, (c) => {
    c.fillStyle = '#edddbd'; c.fillRect(0, 0, 128, 128);
    c.fillStyle = '#e5d2ad';
    for (let x = 0; x < 128; x += 16) c.fillRect(x, 0, 5, 128);
    c.fillStyle = '#dac5a0';
    for (let x = 8; x < 128; x += 32) for (let y = 12; y < 128; y += 32) {
      c.beginPath(); c.arc(x, y, 1.3, 0, Math.PI * 2); c.fill();
    }
  });
  wallpaper.wrapS = wallpaper.wrapT = RepeatWrapping;
  wallpaper.repeat.set((to - door) / 5, 4);
  const wall = new Mesh(new PlaneGeometry(to - door + 2, 28), new MeshBasicMaterial({ map: wallpaper, fog: false }));
  wall.position.set((door + to) / 2, floor + 14, -8.5);
  group.add(wall);
  // The door is open behind his path. Its jamb, warm sill and doormat mark the threshold without a wall
  // across the play plane. The interior wall hides cars beyond it; they never enter the room.
  block(door, floor + 10, -2.1, 0.5, 20, 0.6, cream);
  block(door + 3, floor + 19.7, -2.1, 6.5, 0.6, 0.6, cream);
  const openDoor = block(door - 1.1, floor + 6, -5, 2.6, 12, 0.25);
  openDoor.rotation.y = -0.75;
  // Close the cutaway's side below the threshold, where the rounded outdoor bank meets straight boards.
  // Both top surfaces remain at the authored floor height; no white slice of the backdrop shows through.
  block(door + 0.13, floor - 8, 1.84, 0.55, 16, 2.15, new MeshStandardMaterial({ color: '#68513b', roughness: 1 }));
  block(door + 1.8, floor + 0.035, -0.9, 4.5, 0.05, 3, new MeshStandardMaterial({ color: '#8b6260', roughness: 1 }));
  block((door + to) / 2, floor + 1.2, -8.1, to - door + 1, 2.4, 0.3);
  for (const y of [floor + 1, floor + 8.4]) block(door + 23, y, -5.9, 43, 0.36, 4.2);

  const jarGeometry = new CylinderGeometry(1.8, 1.95, 5.2, 18, 1, true);
  const glass = new MeshStandardMaterial({ color: '#f4f4e5', roughness: 0.18, transparent: true, opacity: 0.17, depthWrite: false, side: DoubleSide });
  const jars = new InstancedMesh(jarGeometry, glass, 10);
  const lids = new InstancedMesh(new CylinderGeometry(1.98, 1.98, 0.28, 18), brass, 10);
  const perJar = 54;
  const sweets = new InstancedMesh(new SphereGeometry(0.32, 7, 5), new MeshStandardMaterial({ roughness: 0.45 }), 10 * perJar);
  const place = new Object3D();
  const next = sequence(708);
  const tones = ['#de5161', '#e6b940', '#81a269', '#ecb3c2', '#a397cb', '#d98748'].map((c) => new Color(c));
  for (let i = 0; i < 10; i++) {
    const x = door + 7 + (i % 5) * 8;
    const shelf = floor + (i < 5 ? 1.18 : 8.58);
    place.position.set(x, shelf + 2.6, -5.9); place.updateMatrix(); jars.setMatrixAt(i, place.matrix);
    place.position.y = shelf + 5.35; place.updateMatrix(); lids.setMatrixAt(i, place.matrix);
    for (let j = 0; j < perJar; j++) {
      // A loose pile from the bottom up, not sweets floating throughout an empty jar.
      place.position.set(x + ((j % 3) - 1) * 0.73 + (next() - 0.5) * 0.12,
        shelf + 0.35 + Math.floor(j / 9) * 0.56,
        -5.9 + ((Math.floor(j / 3) % 3) - 1) * 0.73 + (next() - 0.5) * 0.12);
      place.rotation.set(next(), next(), next()); place.scale.set(1.1, 0.95, 0.9); place.updateMatrix();
      sweets.setMatrixAt(i * perJar + j, place.matrix); sweets.setColorAt(i * perJar + j, tones[i % tones.length]!);
    }
    place.rotation.set(0, 0, 0); place.scale.setScalar(1);
  }
  for (const mesh of [jars, lids, sweets]) mesh.computeBoundingSphere();
  // Wrapped sweets from the kit take the balls' place: the same piles, in the same colours.
  sweetSocket(sweets, { shape: 'burk', scale: 3.1 });
  group.add(sweets, lids, jars);
  // A plain paper bag, open at its top, beside the final candy. No sign, price or brand.
  const paper = new MeshStandardMaterial({ color: '#d5b57e', roughness: 1 });
  const dark = new MeshBasicMaterial({ color: '#6a5035' });
  const bagX = chapter.goalX + 1.9;
  block(bagX, floor + 1.7, -2.7, 3.2, 3.4, 0.16, paper);
  block(bagX - 1.52, floor + 1.7, -3.45, 0.16, 3.4, 1.5, paper);
  block(bagX + 1.52, floor + 1.7, -3.45, 0.16, 3.4, 1.5, paper);
  const opening = new Mesh(new PlaneGeometry(2.9, 1.3), dark);
  opening.rotation.x = -Math.PI / 2; opening.position.set(bagX, floor + 0.05, -3.45); group.add(opening);
  return group;
}

/**
 * Anonymous street life, well behind Elof: shoes passing on the pavement and a slow, unmarked car. Both go
 * behind the near houses, whose shop windows are rooms 3.5 EL deep, and through the passages in their side
 * walls (PASSAGE): they are seen on the crossing.
 * These are only scenery: their shadows and steady motion announce them, and they have no collision,
 * timer or damage rule. Everything is allocated at startup and the view's paused clock freezes them.
 */
export function villageLife(chapter: ChapterData): { group: Group; update(clock: number): void } {
  const group = new Group();
  group.name = 'village-life';
  const shoes = new Group();
  const car = new Group();
  shoes.name = 'passing-shoes'; car.name = 'passing-car';
  const cloth = new MeshStandardMaterial({ color: '#687989', roughness: 1 });
  const leather = new MeshStandardMaterial({ color: '#705142', roughness: 0.85 });
  const rubber = new MeshStandardMaterial({ color: '#343535', roughness: 1 });
  const shape = (parent: Group, material: MeshStandardMaterial, x: number, y: number, z: number, w: number, h: number, d: number) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  };
  const legs = [-0.6, 0.6].map((z) => {
    const leg = new Group(); leg.position.z = z;
    shape(leg, rubber, 0.5, 0.18, 0, 3.3, 0.36, 1.3);
    shape(leg, leather, 0.3, 0.7, 0, 2.8, 1, 1.25);
    shape(leg, cloth, -0.55, 10, 0, 1.3, 18, 1.2);
    shoes.add(leg); return leg;
  });
  // Cream, not red: red is the candy's and the hook's, and the hook hangs where the car passes.
  const paint = new MeshStandardMaterial({ color: '#d8cdb0', roughness: 0.65 });
  const window = new MeshStandardMaterial({ color: '#809ba6', roughness: 0.5 });
  shape(car, paint, 0, 3.3, 0, 18, 3.3, 4);
  shape(car, paint, -0.8, 6, 0, 9.5, 3.1, 3.6);
  shape(car, window, -0.8, 6.1, 1.82, 8.4, 2.2, 0.06);
  const wheel = new InstancedMesh(new TorusGeometry(1.8, 0.42, 8, 24), rubber, 4);
  const hubs = new InstancedMesh(new CircleGeometry(1.2, 16), new MeshBasicMaterial({ color: '#c4c2b9', side: DoubleSide }), 4);
  const place = new Object3D();
  for (let i = 0; i < 4; i++) {
    place.position.set(i % 2 === 0 ? -6 : 6, 1.9, i < 2 ? 2.1 : -2.1); place.updateMatrix(); wheel.setMatrixAt(i, place.matrix);
    place.position.z += i < 2 ? 0.1 : -0.1; place.updateMatrix(); hubs.setMatrixAt(i, place.matrix);
  }
  wheel.computeBoundingSphere(); hubs.computeBoundingSphere(); car.add(wheel, hubs);
  // A pale lamp on each end, with no flashing or sudden movement.
  shape(car, new MeshStandardMaterial({ color: '#f6dda1', emissive: '#77603a', emissiveIntensity: 0.3 }), 8.85, 3.3, 1.6, 0.25, 0.8, 0.5);
  shape(car, new MeshStandardMaterial({ color: '#ad5347' }), -8.85, 3.3, 1.6, 0.25, 0.6, 0.5);
  const shadowMaterial = new MeshBasicMaterial({ color: '#242b31', transparent: true, opacity: 0.18, depthWrite: false });
  const shade = (parent: Group, width: number, depth: number) => {
    const mesh = new Mesh(new CircleGeometry(1, 24), shadowMaterial);
    mesh.rotation.x = -Math.PI / 2; mesh.scale.set(width, depth, 1); mesh.position.y = 0.025; parent.add(mesh);
  };
  shade(car, 10, 2.8); shade(shoes, 3.5, 1.6);
  group.add(car, shoes);
  const lo = chapter.ground[0]!.x - 36;
  const hi = (chapter.shop?.to ?? chapter.goalX) + 40;
  const span = hi - lo;
  return {
    group,
    update(clock) {
      // The loop resets beyond the playable view. Inside the shop its wall hides both lanes.
      car.position.set(lo + ((clock * 4 + 104) % span), 0.45, -13.4);
      shoes.position.set(lo + ((clock * 2.8 + 45) % span), 2, -12.2);
      for (const [i, leg] of legs.entries()) {
        const stride = clock * 3.2 + i * Math.PI;
        leg.position.x = Math.sin(stride) * 1.15;
        leg.position.y = Math.max(0, Math.cos(stride)) * 0.75;
        leg.rotation.z = -Math.sin(stride) * 0.08;
      }
    },
  };
}

/**
 * A bicycle leaning by the wall, at the chapter's first hook: its wheel is a great ring over him, and the
 * lace takes hold of its pedal. Plain, with no mark on it.
 */
function bicycle(chapter: ChapterData): Group {
  const group = new Group();
  const hook = chapter.hooks?.[0];
  if (!hook) return group;
  const rubber = new MeshStandardMaterial({ color: '#2a2a2e', roughness: 0.9 });
  const steel = new MeshStandardMaterial({ color: '#c6c8cc', roughness: 0.35, metalness: 0.6 });
  const paint = new MeshStandardMaterial({ color: '#3f6f8f', roughness: 0.5 });
  const centre = { x: hook.x - 6.4, y: heightAt(chapter, hook.x - 6.4) + 5.2 };
  const tyre = new Mesh(new TorusGeometry(4.9, 0.3, 10, 48), rubber);
  tyre.position.set(centre.x, centre.y, -2.6);
  const rim = new Mesh(new TorusGeometry(4.5, 0.1, 6, 48), steel);
  rim.position.copy(tyre.position);
  const spokes = new InstancedMesh(new BoxGeometry(0.05, 8.9, 0.05), steel, 9);
  const place = new Object3D();
  for (let i = 0; i < spokes.count; i++) {
    place.position.copy(tyre.position);
    place.rotation.set(0, 0, (i / spokes.count) * Math.PI);
    place.updateMatrix();
    spokes.setMatrixAt(i, place.matrix);
  }
  spokes.computeBoundingSphere();
  // The frame: from the wheel's hub to the crank, and up towards the saddle, out of the picture.
  const tube = (ax: number, ay: number, bx: number, by: number, thick: number, material: MeshStandardMaterial, z = -2.3) => {
    const long = Math.hypot(bx - ax, by - ay);
    const mesh = new Mesh(new CylinderGeometry(thick, thick, long, 10), material);
    mesh.position.set((ax + bx) / 2, (ay + by) / 2, z);
    mesh.rotation.z = Math.atan2(by - ay, bx - ax) - Math.PI / 2;
    return mesh;
  };
  const crank = { x: hook.x - 0.9, y: hook.y + 2.4 };
  group.add(
    tyre, rim, spokes,
    tube(centre.x, centre.y, crank.x, crank.y, 0.22, paint),
    tube(crank.x, crank.y, crank.x - 2.2, crank.y + 9, 0.26, paint),
    tube(crank.x, crank.y, crank.x + 5.5, crank.y + 8, 0.26, paint),
    // The crank arm, and the pedal the lace hooks on to.
    tube(crank.x, crank.y, hook.x, hook.y + 0.25, 0.1, steel, -0.9),
  );
  const pedal = new Mesh(new BoxGeometry(0.9, 0.18, 0.8), rubber);
  pedal.position.set(hook.x, hook.y + 0.3, -0.5);
  group.add(pedal);
  return group;
}

const LEAVES = ['#e8b63a', '#d99a2b', '#f0cf5a', '#c9792a', '#b8943a'].map((hex) => new Color(hex));

/** One stretch of the street: the birches' leaves on the ground, and a lamp post in every second stretch. */
export function street(chapter: ChapterData, from: number, to: number, seed: number): Group {
  const group = new Group();
  const next = sequence(seed);
  const place = new Object3D();
  // A birch leaf: small, and nearly round, with a point.
  const leaves = new InstancedMesh(new CircleGeometry(0.2, 7).scale(1.3, 1, 1), new MeshStandardMaterial({ color: '#ffffff', roughness: 0.85, side: DoubleSide }), 46);
  let count = 0;
  for (let i = 0; i < 46; i++) {
    const x = from + next() * (to - from);
    // Behind the path, or in front of it: never where he walks.
    const z = next() < 0.72 ? -0.6 - next() * 7 : 0.6 + next() * 1.6;
    const turn = next() * Math.PI * 2;
    const tilt = (next() - 0.5) * 0.5;
    const tone = LEAVES[Math.floor(next() * LEAVES.length)]!;
    const y = heightAt(chapter, x);
    // None over the drain, in the well or on the puddle's bottom.
    if ((chapter.shop && x >= chapter.shop.door) || y < -2 || Math.abs(heightAt(chapter, x + 0.4) - y) > 0.2 || Math.abs(heightAt(chapter, x - 0.4) - y) > 0.2) continue;
    place.position.set(x, y + 0.03 + next() * 0.02, z);
    place.rotation.set(-Math.PI / 2 + tilt, 0, turn);
    place.scale.setScalar(0.7 + next() * 0.8);
    place.updateMatrix();
    leaves.setMatrixAt(count, place.matrix);
    leaves.setColorAt(count, tone);
    count++;
  }
  leaves.count = count;
  leaves.computeBoundingSphere();
  if (count > 0) group.add(leaves);

  // A lamp post: a dark green column on a foot, going up out of the picture.
  if (Math.round(from / 18) % 2 === 0) {
    const x = from + 4 + next() * 8;
    const y = heightAt(chapter, x);
    // Not where a near house stands: its wall is in front of the post's place.
    const indoors = chapter.street?.some((part) => part.depth === 'near' && x >= part.from && x < part.to) ?? false;
    if (y > -2 && !indoors && (!chapter.shop || x < chapter.shop.door)) {
      const iron = new MeshStandardMaterial({ color: '#2f4a3c', roughness: 0.6 });
      const post = new Mesh(new CylinderGeometry(0.42, 0.55, 40, 14), iron);
      post.position.set(x, y + 20, -8.2);
      const foot = new Mesh(new CylinderGeometry(0.95, 1.25, 2.2, 14), iron);
      foot.position.set(x, y + 1.1, -8.2);
      group.add(post, foot);
    }
  }
  return group;
}
