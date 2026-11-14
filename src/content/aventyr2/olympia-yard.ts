import {
  BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { sway } from '../../render/wind';
import type { ChapterData } from '../../sim/types';

/**
 * The ground Olympia's buildings stand on (Olov, 14 November 2026: "Även byggnaderna i bakgrunden ser ut att sväva i
 * luften i stället för att stå på fast mark."). The place's ground is drawn 30 EL back from the path and no further,
 * and the pitch 22: the store, the masts, the hall and most of the stand stood beyond that, over nothing, with the far
 * forest's picture showing under their feet. The real ground lies up on its hill with a big pale gravel yard between
 * the hall and the pitch (docs/aventyr-2-overhaul.md), so that is what is here:
 *
 * - **The yard:** one sheet of ground from the pitch's far edge back past the hall into the forest, and from left of
 *   the lane to past the trail: pale wet gravel between the pitch and the hall and round the store, a trodden path from
 *   the gravel path to the store's door and from the hall's porch to the pitch, grass beyond, and the forest's dark floor
 *   where the forest is. Along the pitch it begins at a low concrete edging.
 * - **The bank:** behind the lane and the steps, which lie under the hill, it rises in grass to the hill's top, where
 *   the store stands.
 * - **At each building's foot:** a soft shade on the gravel along its wall, and grass grown up against its plinth.
 *
 * Picture only. Three draws: the ground, the shade, the grass.
 */

/** Where the yard begins behind the path, and how far back and to each side it goes: past what any picture shows. */
export const YARD = { front: -22.5, back: -124, left: -64, right: 262 } as const;
/** The hill's top, where the buildings stand; and how much higher the yard's front edge is, clear of the ground's own roll. */
const TOP = 0;
const LIP = 0.25;
/** Where the bank behind the lane has reached the hill's top. */
const BANK_TOP = -31.5;

/** What stands on the yard, in the chapter's x and z: the walls' feet, read from the models (art/blender/). */
export const FEET = {
  /** The store (art/blender/a2-buildings.py, `kiosk`): its walls, and its door on its front. */
  store: { x0: -7, x1: 15, front: -35.5, back: -44.5, door: 11.3 },
  /** The hall (art/blender/olympia.py): its low block's plinth across the front, its ramp before that, and its porch. */
  hall: { x0: 16, x1: 79, front: -59.2, back: -110, ramp: { x0: 24, x1: 59.2, front: -54.3 }, porch: 55.5 },
  /** The stand (art/blender/olympia.py): the low bank under its tiers. */
  stand: { x0: 77, x1: 159, front: -27.8, back: -44 },
  /** The floodlight masts' concrete feet. */
  masts: [[30, -36], [92, -30], [136, -38], [164, -28]] as const,
} as const;

const GRAVEL = new Color('#a39c8c');
const GRAVEL_WET = new Color('#7d786d');
const TRODDEN = new Color('#b3aa96');
const PUDDLE = new Color('#56677c');
const GRASS = new Color('#4d7a3a');
const GRASS_DARK = new Color('#35582c');
const STRAW = new Color('#8a8a4c');
const EARTH = new Color('#6e5b44');
const FOREST = new Color('#2c3a28');
const EDGING = new Color('#b9b3a4');

const hash = (a: number, b: number) => {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
/** Smooth noise from 0 to 1, the same every time. */
function noise(x: number, z: number): number {
  const [ix, iz] = [Math.floor(x), Math.floor(z)];
  const [fx, fz] = [x - ix, z - iz];
  const [ux, uz] = [fx * fx * (3 - 2 * fx), fz * fz * (3 - 2 * fz)];
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}
const smooth = (from: number, to: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - from) / (to - from)));
  return t * t * (3 - 2 * t);
};
/** How far outside a rectangle a point is: 0 inside. */
const outside = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) =>
  Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1));

/** The outline's height at x (src/render/dressing/kit.ts `heightAt`). */
function outlineAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  for (let i = 0; i < line.length - 1; i++) {
    const a = line[i]!, b = line[i + 1]!;
    if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + ((b.y - a.y) * (x - a.x)) / (b.x - a.x);
  }
  return x < line[0]!.x ? line[0]!.y : line[line.length - 1]!.y;
}

/**
 * The land's height along the path at x, as the yard meets it: the lane and the steps under the hill, the hill's top
 * from the steps' head to the trail (over the flooded pits and under the fence), and the trail's rise into the forest.
 */
export function landAt(chapter: ChapterData, x: number): number {
  const line = chapter.ground;
  // The first wall is the way back, closed by the hedge: the lane's own level goes on to its left.
  const lane = Math.min(...line.filter((p) => p.x === line[0]!.x).map((p) => p.y));
  if (x <= line[0]!.x) return lane;
  const here = outlineAt(chapter, x);
  // The hill's top is whole: its pits are the pitch's puddles, and what stands higher is a thing on it (the fence), up to
  // where the trail begins to rise.
  const trail = line.findIndex((p, i) => i > 0 && p.y > TOP + 0.01 && p.x > line[i - 1]!.x && line[i - 1]!.y === TOP && line.slice(i).every((q) => q.y > TOP));
  const rises = trail > 0 ? line[trail - 1]!.x : Infinity;
  const head = line.find((p) => p.y === TOP)?.x ?? line[0]!.x;
  if (x >= head && x <= rises) return TOP;
  if (x > rises) return Math.min(here, line[trail]!.y);
  // Behind the stone steps the hill's side is a slope, from the lane at the first step's foot to the top at the last's head.
  const foot = line.find((p) => p.x > line[0]!.x && p.y > lane + 0.01)?.x ?? head;
  return lane + (TOP - lane) * smooth(foot - 0.6, head + 0.4, x);
}

/** The yard's height at a place: the hill's top, the bank down to the lane behind it, and the trail's rise. */
export function yardAt(chapter: ChapterData, x: number, z: number): number {
  const land = landAt(chapter, x);
  // Its front edge stands a little over the ground it lies on; behind the lane it climbs the bank to the hill's top.
  const lip = LIP * (1 - smooth(YARD.front, YARD.front - 4.5, z));
  if (land >= TOP - 1e-6) return land + 0.03 + lip;
  return land + (TOP + 0.03 - land) * smooth(YARD.front - 0.6, BANK_TOP, z) + lip;
}

const tint = new Color();
const other = new Color();
/** What the yard is made of at a place, wet in the rain: gravel, grass, a path, the forest's floor. */
function yardColour(chapter: ChapterData, x: number, z: number, out: Color): Color {
  const land = landAt(chapter, x);
  const coarse = noise(x * 0.23 + 3.1, z * 0.21 + 7.7);
  const fine = noise(x * 1.7 + 1.3, z * 1.9 + 4.2);
  // Grass everywhere, patchy, and rougher on the bank; the forest's floor far back, at the sides and up the trail.
  const banked = land < TOP - 1e-6 ? 1 - smooth(BANK_TOP + 2, BANK_TOP - 2, z) : 0;
  out.copy(GRASS).lerp(GRASS_DARK, smooth(0.3, 0.75, coarse)).lerp(STRAW, banked * smooth(0.55, 0.85, noise(x * 0.9 + 5.5, z * 1.3 + 0.7)) * 0.5)
    .multiplyScalar(1 - 0.28 * banked * (0.6 + 0.8 * fine));
  // The gravel yard: between the pitch and the hall, round the hall and the store, and at the ski stadium's range.
  const { store, hall, stand } = FEET;
  const yard = Math.max(
    1 - smooth(0, 7, outside(x, z, 13, 167, hall.front - 2, YARD.front)),
    1 - smooth(1.5, 6, outside(x, z, hall.x0, hall.x1, hall.back, hall.front)),
    1 - smooth(1.2, 4.2, outside(x, z, store.x0, store.x1, store.back, store.front + 1.6)),
  ) * (land >= TOP - 1e-6 || z < BANK_TOP + 1 ? 1 : 0);
  if (yard > 0) {
    other.copy(GRAVEL).lerp(GRAVEL_WET, smooth(0.35, 0.8, coarse) * 0.8).multiplyScalar(0.9 + 0.2 * fine);
    // Rain standing in the gravel's hollows.
    other.lerp(PUDDLE, smooth(0.72, 0.8, noise(x * 0.31 + 11.3, z * 0.55 + 2.9)) * 0.75);
    out.lerp(other, yard * smooth(0.25, 0.6, yard + (fine - 0.5) * 0.5));
  }
  // Trodden paths: from the gravel path by the fence to the store's door, and from the hall's porch down to the pitch.
  const toStore = 1 - smooth(1.3, 2.6, Math.abs(x - (store.door + (z - store.front) * 0.06)));
  const toHall = 1 - smooth(1.8, 3.6, Math.abs(x - (hall.porch - (z - hall.ramp.front) * 0.12)));
  if (z > store.front && land >= TOP - 1e-6 && x > 7) out.lerp(other.copy(EARTH).lerp(TRODDEN, 0.45).multiplyScalar(0.92 + 0.16 * fine), toStore * 0.85);
  if (z > hall.ramp.front && z < YARD.front - 1.5) out.lerp(other.copy(TRODDEN).multiplyScalar(0.94 + 0.12 * fine), toHall * 0.6);
  // Under the stand, the bare earth of its bank.
  out.lerp(EARTH, (1 - smooth(0, 1.5, outside(x, z, stand.x0 - 1, stand.x1 + 1, stand.back, stand.front + 0.4))) * 0.8);
  // The forest's floor: behind everything, beyond the hall's ends, and where the trail goes up into the trees.
  const woods = Math.max(smooth(-78, -96, z), smooth(170, 178, x) * smooth(-24, -30, z - (x - 170) * 0.4), smooth(-12, -30, x) * smooth(-48, -62, z), smooth(84, 100, x) * smooth(-52, -66, z));
  out.lerp(other.copy(FOREST).multiplyScalar(0.85 + 0.3 * fine), woods);
  if (land > TOP) out.lerp(other.copy(FOREST).multiplyScalar(0.9 + 0.3 * fine), 0.85);
  // The concrete edging along the pitch and the gravel path, on the yard's raised front edge.
  if (Math.abs(land - TOP) < 1e-6 && z > YARD.front - 0.75) out.copy(EDGING).multiplyScalar(0.88 + 0.16 * hash(Math.floor(x / 3.2), 5));
  return out;
}

/** A sheet from its points: `at(i, j)` for column i and row j, with each point's colour; faces up. */
function sheet(columns: number, rows: number, at: (i: number, j: number) => [number, number, number], colourAt: (i: number, j: number) => Color): BufferGeometry {
  const positions: number[] = [], colours: number[] = [], index: number[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    positions.push(...at(i, j));
    const c = colourAt(i, j);
    colours.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < rows - 1; j++) for (let i = 0; i < columns - 1; i++) {
    const a = j * columns + i, b = a + 1, c = a + columns, d = c + 1;
    // Rows go back from the camera: wound to face up.
    index.push(a, b, c, b, d, c);
  }
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setIndex(index);
  made.computeVertexNormals();
  return made.toNonIndexed();
}

/** The places along the path the yard has a column at: every 2.5 EL, and wherever the land or the ground changes. */
function columnsOf(chapter: ChapterData): number[] {
  const xs = new Set<number>();
  for (let x = YARD.left; x <= YARD.right; x += 2.5) xs.add(x);
  for (const p of chapter.ground) if (p.x > YARD.left && p.x < YARD.right) { xs.add(p.x - 0.02); xs.add(p.x + 0.02); }
  const { store, hall, stand } = FEET;
  for (const x of [store.x0, store.x1, store.door - 2, store.door + 2, hall.x0, hall.x1, stand.x0, stand.x1, 13, 167]) xs.add(x);
  return [...xs].sort((a, b) => a - b);
}
/** The rows of the yard, from its front edge back: close together where the bank climbs and at the buildings' feet. */
const ROWS = [YARD.front, -22.9, -23.3, -24.2, -25.4, -26.6, -27.8, -29.2, -30.4, -31.5, -32.6, -33.9, -35.5, -37.5, -40, -44.5, -48, -51.5, -54.3, -56.5, -59.2, -62, -66, -72, -80, -90, -104, YARD.back];

/** The yard's ground, with a skirt down from its front edge so that nothing shows under it. */
function ground(chapter: ChapterData): BufferGeometry {
  const xs = columnsOf(chapter);
  const top = sheet(xs.length, ROWS.length, (i, j) => [xs[i]!, yardAt(chapter, xs[i]!, ROWS[j]!), ROWS[j]!], (i, j) => yardColour(chapter, xs[i]!, ROWS[j]!, tint));
  // The front edge's own face: the edging's side, and under the bank's foot the earth it is cut in.
  const skirt = sheet(xs.length, 2, (i, j) => [xs[i]!, yardAt(chapter, xs[i]!, YARD.front) - (j === 0 ? 1.2 : 0), YARD.front + (j === 0 ? 0.05 : 0)],
    (i, j) => yardColour(chapter, xs[i]!, YARD.front, tint).multiplyScalar(j === 0 ? 0.5 : 0.82));
  return mergeGeometries([top, skirt])!;
}

/** A strip of shade on the ground along a wall's foot, darkest at the wall: from (x0, z) to (x1, z), `out` wide towards the camera. */
function shadeAlong(chapter: ChapterData, x0: number, x1: number, z: number, out: number, dark: number, positions: number[], alphas: number[]): void {
  const count = Math.max(1, Math.ceil((x1 - x0) / 3));
  for (let i = 0; i < count; i++) {
    const [a, b] = [x0 + ((x1 - x0) * i) / count, x0 + ((x1 - x0) * (i + 1)) / count];
    const y = (x: number, at: number) => yardAt(chapter, x, at) + 0.06;
    // Two quads: dark at the wall, half as dark a third of the way out, nothing at its edge.
    for (const [near, far, k0, k1] of [[z, z + out * 0.35, dark, dark * 0.45], [z + out * 0.35, z + out, dark * 0.45, 0]] as const) {
      positions.push(a, y(a, near), near, a, y(a, far), far, b, y(b, near), near, b, y(b, near), near, a, y(a, far), far, b, y(b, far), far);
      alphas.push(k0, k1, k0, k0, k1, k1);
    }
  }
}

/** The shade at the buildings' feet and round the masts' concrete: one mesh, black, its darkness in its corners. */
function shade(chapter: ChapterData): Mesh {
  const positions: number[] = [], alphas: number[] = [];
  const { store, hall, stand } = FEET;
  shadeAlong(chapter, store.x0 - 0.4, store.x1 + 0.4, store.front, 2.6, 0.5, positions, alphas);
  shadeAlong(chapter, hall.x0 - 0.4, hall.ramp.x0, hall.front, 2.4, 0.5, positions, alphas);
  shadeAlong(chapter, hall.ramp.x0, hall.ramp.x1, hall.ramp.front, 2, 0.45, positions, alphas);
  shadeAlong(chapter, hall.ramp.x1, hall.x1 + 0.4, hall.front, 2.4, 0.5, positions, alphas);
  shadeAlong(chapter, stand.x0 - 1, stand.x1 + 1, stand.front, 1.8, 0.45, positions, alphas);
  for (const [x, z] of FEET.masts) {
    const y = yardAt(chapter, x, z) + 0.06;
    const sides = 10;
    for (let i = 0; i < sides; i++) {
      const [a, b] = [(i / sides) * Math.PI * 2, ((i + 1) / sides) * Math.PI * 2];
      positions.push(x, y, z, x + Math.sin(a) * 3, y, z + Math.cos(a) * 2.2, x + Math.sin(b) * 3, y, z + Math.cos(b) * 2.2);
      alphas.push(0.5, 0, 0);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(alphas.flatMap((a) => [0.02, 0.03, 0.03, a]), 4));
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  mesh.name = 'olympia-yard-shade';
  mesh.renderOrder = 1;
  return mesh;
}

/** A tuft of grass, standing at the origin, 1 high: three blades leaning apart, darker at the foot. */
function tuft(): BufferGeometry {
  const positions: number[] = [], colours: number[] = [], normals: number[] = [];
  for (const [lean, turn, tall] of [[-0.35, 0.2, 0.8], [0.05, -0.3, 1], [0.4, 0.5, 0.7]] as const) {
    const [dx, dz] = [Math.cos(turn) * 0.16, Math.sin(turn) * 0.16];
    const tip: [number, number, number] = [lean * tall, tall, turn * 0.1];
    positions.push(-dx, 0, -dz, dx, 0, dz, ...tip);
    colours.push(0.45, 0.5, 0.42, 0.45, 0.5, 0.42, 1.5, 1.6, 1.1);
    for (let i = 0; i < 3; i++) normals.push(0, 0.94, 0.34);
  }
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  return made;
}

/** Where grass grows up against a foot: along each wall's foot, thick and thin, and along the bank's top by the store. */
export function grassAt(chapter: ChapterData): { x: number; y: number; z: number; high: number }[] {
  const out: { x: number; y: number; z: number; high: number }[] = [];
  let n = 0;
  const along = (x0: number, x1: number, z: number, every: number, high: number) => {
    for (let x = x0; x < x1; x += every * (0.5 + hash(n++, 2.2))) {
      // In clumps, with gaps: by a slow wave along the wall, and a little chance.
      if (noise(x * 0.4 + 17.3, z * 0.37 + 2.1) < 0.3) continue;
      const at = z + 0.15 + 0.5 * hash(n, 9.1);
      out.push({ x, y: yardAt(chapter, x, at), z: at, high: high * (0.6 + 0.8 * hash(n, 4.4)) });
    }
  };
  const { store, hall, stand } = FEET;
  // The store's foot, but not at its door's step; the hall's plinth to the left and the right of its ramp; the stand's bank.
  along(store.x0 - 0.5, store.door - 1.6, store.front, 0.5, 0.75);
  along(store.door + 1.8, store.x1 + 0.6, store.front, 0.5, 0.75);
  along(hall.x0 - 0.5, hall.ramp.x0, hall.front, 0.45, 0.9);
  along(hall.ramp.x0, hall.ramp.x1 - 7, hall.ramp.front, 0.9, 0.7);
  along(hall.ramp.x1 + 1, hall.x1 + 0.5, hall.front, 0.45, 0.9);
  along(stand.x0 - 1, stand.x1 + 1, stand.front, 1.1, 0.7);
  // On the bank behind the lane and the steps, thicker along its top where the yard begins, and at the kerb's far end.
  const first = chapter.ground[0]!.x;
  for (let k = 0; k < 260; k++) {
    const x = first - 14 + 26 * hash(k, 12.7);
    const z = k % 3 === 0 ? BANK_TOP + 0.6 - 1.4 * hash(k, 3.9) : YARD.front - 0.8 - (YARD.front - BANK_TOP) * hash(k, 6.1);
    if (landAt(chapter, x) > TOP - 0.3) continue;
    out.push({ x, y: yardAt(chapter, x, z), z, high: 0.45 + 0.6 * hash(k, 1.9) });
  }
  // Round each mast's concrete foot.
  for (const [x, z] of FEET.masts) for (let k = 0; k < 9; k++) {
    const a = (k / 9) * Math.PI * 2 + hash(x, k);
    const [gx, gz] = [x + Math.sin(a) * 1.5, z + 0.4 + Math.cos(a) * 1.1];
    out.push({ x: gx, y: yardAt(chapter, gx, gz), z: gz, high: 0.5 + 0.5 * hash(k, x) });
  }
  return out;
}

/** The grass at the buildings' feet: one draw, swaying a little in the storm's wind. */
function grass(chapter: ChapterData): InstancedMesh {
  const places = grassAt(chapter);
  const material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  sway(material, 0.06);
  const mesh = new InstancedMesh(tuft(), material, places.length);
  mesh.name = 'olympia-yard-grass';
  const place = new Object3D();
  for (const [i, g] of places.entries()) {
    place.position.set(g.x, g.y - 0.03, g.z);
    place.rotation.set(0, (hash(i, 6.6) - 0.5) * 1.4, 0);
    place.scale.set(0.7 + 0.6 * hash(i, 1.1), g.high, 1);
    place.updateMatrix();
    mesh.setMatrixAt(i, place.matrix);
    mesh.setColorAt(i, tint.copy(hash(i, 5.5) < 0.25 ? GRASS : GRASS_DARK).lerp(other.set('#8a9a4a'), hash(i, 7.7) * 0.35));
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  return mesh;
}

/** The yard's own shapes, for the tests as for the picture. */
export function yardGround(chapter: ChapterData): BufferGeometry {
  return ground(chapter);
}

/** Olympia's yard, behind its pitch: added to the picture with the chapter's team benches (./team-benches.ts). */
export function olympiaYard(chapter: ChapterData): Group {
  const group = new Group();
  group.name = 'olympia-yard';
  const land = new Mesh(yardGround(chapter), new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
  land.name = 'olympia-yard-ground';
  group.add(land, shade(chapter), grass(chapter));
  return group;
}
