import { BufferGeometry, Color, Float32BufferAttribute, Group, Mesh, MeshStandardMaterial, type CanvasTexture } from 'three';
import type { ChapterData, SurfaceKind } from '../../sim/types';
import { MOSS, drawn, hash, heightAt, landscape, noise, sequence, surfaceAt } from './kit';

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
 * Granite seen close: pale feldspar and grey quartz grains, dark flecks of mica, a few hairline cracks and
 * rings of crust lichen. It is nearly white on the whole, so that it is the rock's own tones that colour it:
 * the moss's speckles halved them, and grey rock came out as brown felt.
 */
function granite(): CanvasTexture {
  const next = sequence(71);
  const size = 256;
  return drawn(size, size, (c) => {
    c.fillStyle = '#e9e7e3';
    c.fillRect(0, 0, size, size);
    // Whatever lies over an edge is drawn again on the other side, so that the picture tiles.
    const everywhere = (x: number, y: number, reach: number, draw: (x: number, y: number) => void) => {
      for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) {
        if (x + dx > -reach && x + dx < size + reach && y + dy > -reach && y + dy < size + reach) draw(x + dx, y + dy);
      }
    };
    const grain = (colour: string, count: number, least: number, most: number) => {
      for (let i = 0; i < count; i++) {
        const r = least + next() * (most - least);
        const squash = 0.6 + next() * 0.4;
        const turn = next() * Math.PI;
        const alpha = 0.35 + next() * 0.5;
        everywhere(next() * size, next() * size, r, (x, y) => {
          c.fillStyle = colour;
          c.globalAlpha = alpha;
          c.beginPath();
          c.ellipse(x, y, r, r * squash, turn, 0, Math.PI * 2);
          c.fill();
        });
      }
    };
    grain('#fbf8f2', 900, 1.2, 3.4);
    grain('#c3c3c8', 700, 1, 3);
    grain('#d9c9c2', 260, 1.2, 3.2);
    grain('#55555c', 420, 0.5, 1.5);
    // Crust lichen: pale rings, a hand to a length across.
    for (let i = 0; i < 7; i++) {
      const r = 9 + next() * 16;
      const alpha = 0.16 + next() * 0.14;
      everywhere(next() * size, next() * size, r + 3, (x, y) => {
        c.globalAlpha = alpha;
        c.strokeStyle = '#f4f6e6';
        c.lineWidth = 2.5 + r * 0.12;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.stroke();
      });
    }
    // Hairline cracks, each a few short runs.
    for (let i = 0; i < 9; i++) {
      let x = next() * size;
      let y = next() * size;
      let turn = next() * Math.PI * 2;
      const alpha = 0.22 + next() * 0.2;
      for (let k = 0; k < 3; k++) {
        const nx = x + Math.cos(turn) * (10 + next() * 14);
        const ny = y + Math.sin(turn) * (10 + next() * 14);
        const [fx, fy] = [x, y];
        everywhere(fx, fy, 30, (ax, ay) => {
          c.globalAlpha = alpha;
          c.strokeStyle = '#6b6b74';
          c.lineWidth = 0.8;
          c.beginPath();
          c.moveTo(ax, ay);
          c.lineTo(ax + nx - fx, ay + ny - fy);
          c.stroke();
        });
        x = ((nx % size) + size) % size;
        y = ((ny % size) + size) % size;
        turn += (next() - 0.5) * 1.1;
      }
    }
    c.globalAlpha = 1;
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
  /** An edge that catches the light: how far towards white. */
  pale?: number;
  /** Which ledge it belongs to, where the rock is jointed: a block's ledges lie a little higher or lower. */
  ledge?: 1 | 2;
  /** On a deck's rim board: 0 at its upper edge, 1 at its lower. The board lies along the path. */
  rim?: number;
  /** The dark under a walk of planks: how far its tone has gone into it. Nothing is lit there. */
  hollow?: number;
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
/** Extra samples for soft diagonal trunk shadows, only on moss; the garden shares the original profile. */
const PROFILE_FOREST_SHADE = PROFILE_FOREST.flatMap((row, i): Row[] => {
  const before = PROFILE_FOREST[i - 1];
  if (!before) return [row];
  const between = [-4.5, -3.5, -1.8, -1.3].filter((z) => z > before.z && z < row.z).map((z) => {
    const k = (z - before.z) / (row.z - before.z);
    return { z, drop: before.drop + (row.drop - before.drop) * k,
      shade: before.shade + (row.shade - before.shade) * k, bump: before.bump + (row.bump - before.bump) * k };
  });
  return [...between, row];
});
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
const WHITE = new Color('#ffffff');

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

/**
 * Rock: level a little past the path, then a hard edge that catches the light, and down in two steps with a
 * ledge on each, as granite breaks. Nothing of it is rounded.
 */
const PROFILE_ROCK: Row[] = [
  { z: -16, drop: -0.3, shade: 0.72, bump: 0.5 },
  { z: -10, drop: -0.1, shade: 0.8, bump: 0.4 },
  { z: -5.5, drop: 0, shade: 0.9, bump: 0.26 },
  { z: -2.6, drop: 0, shade: 0.96, bump: 0.14 },
  { z: -0.9, drop: 0, shade: 1, bump: 0.05 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: EDGE, drop: 0, shade: 1, bump: 0 },
  { z: 0.9, drop: 0, shade: 1, bump: 0 },
  // The edge he walks along, drawn by its own pale line.
  { z: 0.98, drop: 0.08, shade: 1, bump: 0, pale: 0.4 },
  { z: 1.0, drop: 0.85, shade: 0.74, bump: 0, cut: 1, ledge: 1 },
  { z: 1.35, drop: 0.87, shade: 0.96, bump: 0, pale: 0.12, ledge: 1 },
  { z: 1.38, drop: 2.3, shade: 0.64, bump: 0, cut: 1, ledge: 2 },
  { z: 1.7, drop: 2.32, shade: 0.9, bump: 0, ledge: 2 },
  { z: 1.74, drop: 4.2, shade: 0.56, bump: 0, cut: 1 },
  { z: 1.9, drop: 6.5, shade: 0.5, bump: 0, cut: 1 },
  { z: 2.0, drop: 10, shade: 0.45, bump: 0, cut: 1 },
  { z: 2.0, drop: 16, shade: 0.42, bump: 0, cut: 1 },
];
const CAP = new Color('#d9d6c6');
const ROCK_DEEP = new Color('#46527e');

/**
 * Rock where it is cut: the same rock as its top, with a pale crust of lichen along the edge above it, and
 * going cool, never black, further down.
 */
function rockCutAt(kind: Ground, x: number, z: number, under: number, out: Color): Color {
  toneAt(kind, x * 1.3 + 4, under * 1.1 + z, out).multiplyScalar(0.9);
  if (under < 0.15) out.lerp(CAP, (1 - under / 0.15) * (0.3 + noise(x * 2.3, z * 2.1) * 0.5));
  return out.lerp(ROCK_DEEP, Math.min(1, Math.max(0, (under - 1.5) / 10)) * 0.7);
}

/** What grows in soil: where such ground is cut, there is humus under it, and what grows hangs over the edge. */
const IN_SOIL: ReadonlySet<Ground> = new Set<Ground>(['moss', 'lawn', 'sphagnum', 'earth']);

/** How much what is built falls for each length it comes towards the camera in front of the path. */
export const TILT = 0.3;
/** Where a built floor ends in front. */
export const TILT_ENDS = 5.6;

/**
 * What is built (a wooden floor, a street) in front of the path: one flat plane that tilts away towards the
 * camera, so that the lower third of the picture is floor seen from above and not a face.
 *
 * - It cannot run on level under the camera, though a real floor does. Where the camera stands over a level
 *   higher than its eye (he at the foot of a step, the camera a little ahead of him), a floor that reached
 *   the camera would have the camera inside the step, looking through it; one that stopped short of the
 *   camera would stand before the lens as a wall. Ground that falls away stays under the lines of sight.
 * - It cannot roll away in a curve as moss does: boards on a curve are a barrel. A plane keeps their lines
 *   straight, and reads as a floor seen from a little higher up.
 * - It ends in its own edge 5.6 lengths in front, below the lower edge of every picture.
 */
const TILTED: Row[] = [
  // A pool's near shore rises here, just in front of the path: see `shore`.
  { z: SHORE, drop: 0.005, shade: 1, bump: 0 },
  // The plane begins in a short curve, so that there is no fold at his feet.
  { z: 0.75, drop: 0.03, shade: 1, bump: 0 },
  { z: 1.1, drop: 0.11, shade: 1, bump: 0 },
  { z: 1.6, drop: TILT * (1.6 - EDGE), shade: 0.98, bump: 0 },
  { z: 2.4, drop: TILT * (2.4 - EDGE), shade: 0.95, bump: 0 },
  { z: 3.4, drop: TILT * (3.4 - EDGE), shade: 0.9, bump: 0 },
  { z: 4.5, drop: TILT * (4.5 - EDGE), shade: 0.83, bump: 0 },
  { z: TILT_ENDS, drop: TILT * (TILT_ENDS - EDGE), shade: 0.76, bump: 0 },
  { z: TILT_ENDS, drop: TILT * (TILT_ENDS - EDGE) + 0.2, shade: 0.6, bump: 0, cut: 1 },
  { z: TILT_ENDS - 0.1, drop: TILT * (TILT_ENDS - EDGE) + 2.5, shade: 0.4, bump: 0, cut: 1 },
  { z: TILT_ENDS - 0.1, drop: 16, shade: 0.3, bump: 0, cut: 1 },
];

/** A street is built: level and without a bank behind the path, and tilted in front of it. */
const PROFILE_STREET: Row[] = [
  { z: -16, drop: 0, shade: 0.74, bump: 0 },
  { z: -10, drop: 0, shade: 0.82, bump: 0 },
  { z: -5.5, drop: 0, shade: 0.9, bump: 0 },
  { z: -2.6, drop: 0, shade: 0.96, bump: 0 },
  { z: -0.9, drop: 0, shade: 1, bump: 0 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: EDGE, drop: 0, shade: 1, bump: 0 },
  ...TILTED,
];

/**
 * What a place's ground does in front of the path, and at its walls.
 * A place that cuts draws its front back to the path at the top of a wall, stands the wall's face on the
 * floor at its foot, and paints what is cut by how far under the surface it lies.
 */
interface Front {
  rows: Row[];
  cuts: boolean;
  /** How far under the surface, down a face in front, what grows there gives way to what is cut. */
  lip: number;
  /** How far over a cut edge the growth hangs, at most; none on rock. */
  hang: number;
  /** How far apart, in height, the points up a wall stand. */
  course: number;
  /** How tall a wall must be for the front to draw back at its top. */
  over: number;
  /** Whether it is broken into blocks along the path: see `blocksOf`. */
  jointed: boolean;
  /** What it goes into far behind the path: the place's haze, in the ground's own hue. */
  far: Color;
  /**
   * Whether it closes a pool towards the camera with a near shore, and how high that lies: a finger over the
   * water, as a forest pool's does, or level with the ground beside the pool, as a street does round a puddle.
   */
  shore: false | 'water' | 'ground';
}

/**
 * A block of jointed rock, from the joint before it to `to`. Its two ledges lie a little higher or lower
 * than its neighbours' and it has a tone of its own, so that the front is blocks and not two long steps.
 */
interface Block {
  to: number;
  ledges: [number, number];
  tone: number;
}

/** Half the width of a joint's dark line. */
const SEAM = 0.03;

/** The blocks along a chapter: a joint every 2.5 to 6 lengths, the same in every session. */
function blocksOf(from: number, to: number): Block[] {
  const next = sequence(977);
  const blocks: Block[] = [];
  for (let x = from - 20 + next() * 4; x < to + 26; ) {
    x += 2.5 + next() * 3.5;
    blocks.push({ to: x, ledges: [(next() - 0.5) * 0.44, (next() - 0.5) * 0.6], tone: 0.93 + next() * 0.14 });
  }
  return blocks;
}
/**
 * How tall a wall must be for the front to draw back at its top: a wall of 0.6 already hides its foot, and
 * him at it, from a camera that stands ahead of him over its top. That holds for a tilted plane as for a
 * slope that rolls: at 1.2 for what is built, the deck's upper floor stood in front of him at its step.
 */
const SOFT = 0.6;
const BUILT = SOFT;

const FRONTS: Record<'plain' | 'forest' | 'lawn' | 'rock' | 'street', Front> = {
  plain: { rows: PROFILE, cuts: false, lip: 0, hang: 0, course: Infinity, over: SOFT, jointed: false, far: FAR, shore: false },
  forest: { rows: PROFILE_FOREST, cuts: true, lip: LIP - 0.5, hang: 0.7, course: 0.9, over: SOFT, jointed: false, far: FAR, shore: 'water' },
  // The lawn has the forest's floor: grass grows down it towards the camera. Its turf hangs less far.
  lawn: { rows: PROFILE_FOREST, cuts: true, lip: LIP - 0.5, hang: 0.45, course: 0.9, over: SOFT, jointed: false, far: new Color('#b3cfa6'), shore: 'water' },
  rock: { rows: PROFILE_ROCK, cuts: true, lip: 0, hang: 0, course: 0.6, over: SOFT, jointed: true, far: FAR, shore: false },
  // A street is a tilted plane in what it is built of. A puddle lies in it: its near shore is the street.
  street: { rows: PROFILE_STREET, cuts: true, lip: 0, hang: 0, course: 0.9, over: BUILT, jointed: false, far: FAR, shore: 'ground' },
};
/** The front of a place whose own ground is this. */
const frontOf = (own: Ground): Front =>
  (own === 'moss' ? FRONTS.forest : own === 'lawn' ? FRONTS.lawn : own === 'granite' ? FRONTS.rock : own === 'asphalt' ? FRONTS.street : FRONTS.plain);

/** How far under the outline a profile lies at a depth, between its rows. */
function dropAt(rows: Row[], z: number): number {
  for (let j = 1; j < rows.length; j++) {
    const a = rows[j - 1]!;
    const b = rows[j]!;
    if (z <= b.z && b.z > a.z) return a.drop + ((b.drop - a.drop) * Math.max(0, z - a.z)) / (b.z - a.z);
  }
  return rows[rows.length - 1]!.drop;
}

/** How far under the path the forest's floor lies at a depth in front of it. */
export function slopeDrop(z: number): number {
  return dropAt(PROFILE_FOREST, z);
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
export function forwardAt(chapter: ChapterData, x: number, over = SOFT): number {
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
    if (away >= DRAW_BACK || top.y - foot.y < over - 1e-6 || here < top.y - (top.y - foot.y) * 0.5) continue;
    if (Math.abs(top.x - foot.x) > 0.01 && (x - top.x) * (top.x - foot.x) < 0) continue;
    const t = away / DRAW_BACK;
    forward = Math.min(forward, t * t * (3 - 2 * t));
  }
  return forward;
}

/** The same for a wall's own corner, which stands at the wall and at one of its two heights. */
function forwardAtCorner(chapter: ChapterData, x: number, y: number, over = SOFT): number {
  let forward = 1;
  for (const side of [-0.05, 0.05]) if (Math.abs(heightAt(chapter, x + side) - y) < 0.3) forward = Math.min(forward, forwardAt(chapter, x + side, over));
  return forward;
}

/** A wooden floor behind its front edge, in every place: boards, level, a little darker further in. */
const BOARDS_BEHIND: Row[] = [
  { z: -16, drop: 0, shade: 0.7, bump: 0 },
  { z: -10, drop: 0, shade: 0.8, bump: 0 },
  { z: -5.5, drop: 0, shade: 0.9, bump: 0 },
  { z: -2.6, drop: 0, shade: 0.96, bump: 0 },
  { z: -0.9, drop: 0, shade: 1, bump: 0 },
  { z: -0.3, drop: 0, shade: 1, bump: 0 },
  { z: EDGE, drop: 0, shade: 1, bump: 0 },
  { z: 1.1, drop: 0, shade: 1, bump: 0 },
];
/** How thick a plank is at its end, and how high the rim board under a walk of planks: a board on edge. */
const BOARD_END = 0.19;
const RIM = 0.76;

/**
 * A wooden floor: boards, level where he walks, and in front of the path the tilted plane (`TILTED`). It was
 * a face at first: the boards' picture ran down it 16 lengths deep, a plank fence with black gaps.
 */
const PROFILE_FLOOR: Row[] = [...BOARDS_BEHIND.filter((row) => row.z <= EDGE), ...TILTED];

/**
 * A walk of planks laid over a bog is narrow: it has a front edge. The boards' ends, a line of shadow under
 * their overhang, one rim board along the path that catches the light, and under it the dark.
 * Two rows may stand in one place: the colour changes there at once, as at an edge, and not over a slope.
 */
const PROFILE_PLANKS: Row[] = [
  ...BOARDS_BEHIND,
  { z: 1.1, drop: BOARD_END, shade: 0.86, bump: 0 },
  { z: 1.1, drop: BOARD_END, shade: 0.12, bump: 0 },
  { z: 1.0, drop: BOARD_END, shade: 0.12, bump: 0 },
  { z: 1.0, drop: BOARD_END + 0.15, shade: 0.12, bump: 0 },
  { z: 1.0, drop: BOARD_END + 0.15, shade: 1, bump: 0, rim: 0 },
  { z: 1.0, drop: BOARD_END + 0.15 + RIM, shade: 0.92, bump: 0, rim: 1 },
  { z: 1.0, drop: BOARD_END + 0.15 + RIM, shade: 1, bump: 0, hollow: 0.55 },
  { z: 0.72, drop: BOARD_END + 0.2 + RIM, shade: 1, bump: 0, hollow: 0.75 },
  { z: 0.72, drop: BOARD_END + 2.4 + RIM, shade: 1, bump: 0, hollow: 1 },
  { z: 0.72, drop: 16, shade: 1, bump: 0, hollow: 1 },
];
/** Under a walk of planks: the peat it lies on, in its shadow just under the rim and darker further down. */
const HOLLOW = [new Color('#5a4630'), new Color('#2a2018')];

/**
 * How far down a profile each of its rows lies, measured along the surface, and counted so that it is the
 * row's z on the play plane. The ground's picture and its tones are laid out by this: by z alone they would
 * be pulled long down the front, where the surface falls as fast as it comes forward.
 */
function lengthsDown(profile: Row[], forward = 1): number[] {
  const down = [0];
  for (let j = 1; j < profile.length; j++) down.push(down[j - 1]! + Math.hypot(depthOf(profile[j]!, forward) - depthOf(profile[j - 1]!, forward), dropOf(profile, profile[j]!, forward) - dropOf(profile, profile[j - 1]!, forward)));
  const level = profile.findIndex((row) => row.z >= -0.3);
  return down.map((d) => d - down[level]! + profile[level]!.z);
}

/** A row's depth where the front has drawn back by so much. */
function depthOf(row: Row, forward: number): number {
  return row.z > EDGE ? EDGE + (row.z - EDGE) * forward : row.z;
}

/**
 * A floor or street stays on its plane where its edge draws back beside a step. Keeping the full-depth
 * drop while shortening its depth bent the surface into a steep shoulder. Its cut keeps the same thickness
 * below the floor; the bog's narrow planks and the growing ground keep their own profiles.
 */
function dropOf(profile: Row[], row: Row, forward: number): number {
  if ((profile !== PROFILE_FLOOR && profile !== PROFILE_STREET) || row.z <= EDGE || forward === 1) return row.drop;
  return row.drop - dropAt(profile, row.z) + dropAt(profile, depthOf(row, forward));
}

/** The bog's ground: as the bank in front, and sinking under the water behind the path. */
const PROFILE_ISLAND = PROFILE.map((row, i) => (i < 3 ? { ...row, drop: [3.2, 1.7, 0.3][i]!, bump: row.bump * 0.6 } : row));

/** A wooden floor's front, a walk of planks' over the bog, and a bog's island's. */
const FLOOR_FRONT: Front = { rows: PROFILE_FLOOR, cuts: true, lip: 0, hang: 0, course: 0.9, over: BUILT, jointed: false, far: FAR, shore: 'ground' };
const PLANKS_FRONT: Front = { rows: PROFILE_PLANKS, cuts: false, lip: 0, hang: 0, course: Infinity, over: SOFT, jointed: false, far: FAR, shore: false };
const ISLAND_FRONT: Front = { rows: PROFILE_ISLAND, cuts: false, lip: 0, hang: 0, course: Infinity, over: SOFT, jointed: false, far: FAR, shore: false };

/**
 * The front of a kind of ground in a place: boards are a floor, or a walk of planks where the place is a
 * bog; a bog's own ground is islands; everything else has the place's front, in its own stuff.
 */
function frontFor(kind: Ground, own: Ground): Front {
  if (GROUNDS[kind].boards) return GROUNDS[own].sinks ? PLANKS_FRONT : FLOOR_FRONT;
  if (GROUNDS[kind].sinks) return ISLAND_FRONT;
  return frontOf(own);
}

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
  /** It is rock, and wears the granite's picture and not the moss's speckles. */
  rock?: boolean;
  /** It is not rock but has rock's grit in it, and wears the granite's picture too: asphalt. */
  grit?: boolean;
}
const tones = (...hex: string[]) => hex.map((h) => new Color(h));
const GROUNDS: Record<Ground, GroundLook> = {
  moss: { colours: MOSS, wall: SOIL, shade: SHADE, bump: 1, boards: false },
  lawn: { colours: tones('#3f6a22', '#5c962b', '#7fb238', '#aecb52'), wall: new Color('#4a3826'), shade: new Color('#2a4a3a'), bump: 0.8, boards: false },
  sphagnum: { colours: tones('#6e3226', '#8f4d2b', '#7d8a36', '#bca94c'), wall: new Color('#2e241c'), shade: new Color('#2a3438'), bump: 1, boards: false, sinks: true },
  granite: { colours: tones('#8f939d', '#a4a8b2', '#bcbfc6', '#d6d5d6'), wall: new Color('#8f929a'), shade: new Color('#46527e'), bump: 0.25, boards: false, rock: true },
  wood: { colours: tones('#a48a69', '#b49a78', '#c2a988', '#ccb696'), wall: new Color('#a38866'), shade: new Color('#2b2a33'), bump: 0, boards: true },
  earth: { colours: tones('#57432e', '#695037', '#7a5e41', '#8a6c4b'), wall: new Color('#4a3826'), shade: new Color('#2c2a2e'), bump: 0.5, boards: false },
  stone: { colours: tones('#767879', '#8a8c8a', '#9b9c97', '#adaca4'), wall: new Color('#6f7172'), shade: new Color('#2c3438'), bump: 0.3, boards: false, rock: true },
  shavings: { colours: tones('#d6bb8a', '#e3cb9b', '#eedab0', '#f5e6c4'), wall: new Color('#cbb07d'), shade: new Color('#6a5a40'), bump: 0.6, boards: false },
  hedge: { colours: tones('#1f4a1c', '#2f6424', '#3f7a2a', '#588c34'), wall: new Color('#254a1e'), shade: new Color('#16301c'), bump: 1.3, boards: false },
  // The village street: pale slabs, dark asphalt with a little grit, and the grate's iron.
  paving: { colours: tones('#9c9a94', '#aeaca5', '#bdbbb3', '#cbc8be'), wall: new Color('#8e8c88'), shade: new Color('#3a3c44'), bump: 0, boards: false },
  asphalt: { colours: tones('#4c4f56', '#575a61', '#62656b', '#70727a'), wall: new Color('#45484e'), shade: new Color('#2a3038'), bump: 0.12, boards: false, grit: true },
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
  /** What the ground at its foot is made of: the floor there goes on under the upper one's corner in that. */
  lower: Ground;
}

/** The ground of a chapter, as one mesh for each stretch of one kind of ground. */
export function bank(chapter: ChapterData, own: Ground): Group {
  const shapes = bankShapes(chapter, own);
  // A picture is drawn only for a chapter that has ground of its kind.
  const has = (which: (look: GroundLook) => boolean) => shapes.some(({ kind }) => which(GROUNDS[kind]));
  const maps = {
    boards: has((look) => look.boards) ? boards() : null,
    granite: has((look) => !!look.rock || !!look.grit) ? granite() : null,
    speckles: has((look) => !look.boards && !look.rock && !look.grit) ? speckles() : null,
  };
  const group = new Group();
  for (const { kind, shape } of shapes) {
    const look = GROUNDS[kind];
    const map = look.boards ? maps.boards : look.rock || look.grit ? maps.granite : maps.speckles;
    group.add(new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, map, roughness: look.boards ? 0.8 : look.rock ? 0.9 : 1 })));
  }
  return group;
}

/** The shapes of a chapter's ground, a stretch of one kind at a time. No picture is drawn for them here. */
export function bankShapes(chapter: ChapterData, own: Ground): { kind: Ground; shape: BufferGeometry }[] {
  chapter = landscape(chapter);
  const line = chapter.ground;
  const first = line[0]!;
  const last = line[line.length - 1]!;
  const outline = [{ x: first.x - 16, y: first.y }, ...line, { x: last.x + 16, y: last.y }];
  const kindAt = (x: number): Ground => surfaceAt(chapter, x) ?? own;
  /** How high a pool's near shore lies in a front that has one. */
  const shoreOf = (front: Front, pool: { from: number; to: number; y: number }) => (front.shore === 'ground'
    ? Math.max(pool.y + SHORE_OVER, Math.min(heightAt(chapter, pool.from - 0.6), heightAt(chapter, pool.to + 0.6)))
    : pool.y + SHORE_OVER);
  const poolAt = (front: Front, x: number, y: number) => (front.shore === false ? undefined : (chapter.water ?? []).find((w) => x >= w.from && x <= w.to && y < w.y));
  // Points along the outline, close enough together for the moss to roll. A wall keeps its two corners.
  const points: BankPoint[] = [];
  let before = false;
  let along = 0;
  for (let i = 0; i < outline.length - 1; i++) {
    const a = outline[i]!;
    const b = outline[i + 1]!;
    const dx = b.x - a.x;
    const steep = Math.abs(b.y - a.y) > Math.abs(dx) * 1.3;
    // A wall is built as the ground it begins on is.
    const front = frontFor(kindAt(a.x), own);
    // A cut face is banded by its height, so a tall one needs points up it.
    const pieces = Math.max(1, Math.ceil(Math.abs(dx) / 0.45), steep && front.cuts ? Math.ceil(Math.abs(b.y - a.y) / front.course) : 1);
    const length = Math.hypot(dx, b.y - a.y);
    const ends = front.cuts && steep ? [forwardAtCorner(chapter, a.x, a.y, front.over), forwardAtCorner(chapter, b.x, b.y, front.over)] : null;
    let rises: Wall | undefined;
    if (ends) {
      const up = b.y > a.y;
      const [top, foot] = up ? [b, a] : [a, b];
      // The lower side lies away from the top: to the left of a wall that goes up, to the right of one that goes down.
      const lower = kindAt(foot.x + (up ? -0.05 : 0.05));
      const below = frontFor(lower, own);
      const pool = poolAt(below, foot.x, foot.y);
      rises = {
        top: top.y, foot: foot.y, floor: pool ? shoreOf(below, pool) : foot.y,
        topForward: up ? ends[1]! : ends[0]!, footForward: pool ? 1 : up ? ends[0]! : ends[1]!,
        x: foot.x, side: up ? 1 : -1, lean: Math.abs(top.x - foot.x), along: up ? along : along + length, lower,
      };
    }
    for (let k = 0; k < pieces; k++) {
      const x = a.x + (dx * k) / pieces;
      // The corner at a wall's top or foot is a wall's too.
      const y = a.y + ((b.y - a.y) * k) / pieces;
      const corner = steep || before;
      const kind = kindAt(x);
      const mine = frontFor(kind, own);
      const forward = !mine.cuts ? 1 : ends ? ends[0]! + ((ends[1]! - ends[0]!) * k) / pieces : corner ? forwardAtCorner(chapter, x, y, mine.over) : forwardAt(chapter, x, mine.over);
      const pool = poolAt(mine, x, y);
      points.push({
        x, y, wall: corner, face: steep, along: along + (length * k) / pieces, forward: pool ? 1 : forward,
        ...(rises ? { rises } : {}), ...(pool ? { shore: shoreOf(mine, pool) } : {}), kind,
      });
      before = steep;
    }
    along += length;
  }
  points.push({ x: last.x + 16, y: last.y, wall: false, face: false, along, forward: 1, kind: own });

  const blocks = blocksOf(first.x, last.x);
  const shapes: { kind: Ground; shape: BufferGeometry }[] = [];
  let start = 0;
  for (let i = 1; i <= points.length; i++) {
    if (i < points.length && points[i]!.kind === points[start]!.kind) continue;
    // A stretch takes the next one's first point too, so that the two meet.
    const stretch = points.slice(start, Math.min(points.length, i + 1));
    const kind = points[start]!.kind;
    const front = frontFor(kind, own);
    if (stretch.length > 1) shapes.push({ kind, shape: stretchOfGround(stretch, kind, front, front.jointed ? blocks : []) });
    start = i;
  }
  return shapes;
}

/**
 * One stretch, as columns of points across the profile. The top and a wall's face have a column each where
 * they meet, so that each keeps its own colour and its own lie of the picture, and the corner is a corner.
 */
function stretchOfGround(points: BankPoint[], kind: Ground, front: Front, blocks: Block[] = []): BufferGeometry {
  const look = GROUNDS[kind];
  const profile = kind === 'moss' ? PROFILE_FOREST_SHADE : front.rows;
  const whole = lengthsDown(profile);
  const rows = profile.length;
  const cuts = front.cuts;
  const soil = IN_SOIL.has(kind);
  const ends = profile[rows - 1]!.z;
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
  const column = (p: BankPoint, ux = 0, uy = 0, wall?: Wall, block?: Block, seam = false): number => {
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
      const drop = dropOf(profile, row, forward) + (block && row.ledge ? block.ledges[row.ledge - 1]! : 0);
      let y = (p.shore !== undefined && row.z > EDGE ? p.shore : p.y) - drop + swell;
      let under = drop - front.lip * p.forward;
      if (wall) {
        // The face stands on the lower floor as that lies at this depth, and goes up to the upper one.
        const upper = wall.top - drop;
        const lowerDepth = profile === PROFILE_FLOOR || profile === PROFILE_STREET ? z : EDGE + (z - EDGE) / Math.max(0.05, wall.footForward);
        const lower = row.z <= EDGE ? wall.foot - drop : wall.floor - (lowerDepth > ends ? drop : dropAt(profile, lowerDepth));
        y = Math.min(upper, lower) + (upper - Math.min(upper, lower)) * up;
        under = upper - y;
      }
      position.push(p.x, y, z);
      toneAt(kind, p.x, down[j]!, c);
      if (cuts) {
        // A face is cut all the way; the front is cut under its lip, and where it has drawn back to a wall.
        const cut = face ? 1 : Math.max(row.cut ?? 0, row.z > EDGE ? 1 - p.forward : 0);
        // Over the edge what grows hangs a hand or two, further in some places than in others.
        const hang = soil ? front.hang * (0.36 + noise(p.x * 1.7 + 2, z * 0.8) * 0.64) : 0;
        // Soil is cut to humus and rock, rock to rock; what is built or clipped has its own face.
        if (cut > 0 && under > hang) {
          if (soil) c.lerp(cutAt(p.x, z, under - hang, scratch), cut);
          else if (look.rock) c.lerp(rockCutAt(kind, p.x, z, under, scratch), cut);
          else c.lerp(look.wall, 0.82 * cut);
        }
      } else if (face) c.lerp(look.wall, 0.82);
      // A rim board is one long board, not a board to each board of the deck: one tone, drifting along it.
      if (row.rim !== undefined && !face) c.copy(look.colours[1]!).lerp(look.colours[2]!, noise(p.x * 0.31 + 5, 3));
      c.lerp(look.shade, (1 - row.shade) * 0.9);
      if (row.hollow !== undefined) c.copy(HOLLOW[0]!).lerp(HOLLOW[1]!, row.hollow);
      if (block) c.multiplyScalar(block.tone);
      // A joint is a dark line down the faces, and a faint one across the ledges and the top.
      if (seam) c.multiplyScalar(row.cut ? 0.5 : row.z > EDGE ? 0.8 : 0.93);
      if (row.pale && !face) c.lerp(WHITE, row.pale);
      if (row.far) c.lerp(front.far, row.far);
      colour.push(c.r, c.g, c.b);
      // The rim board lies along the path: across it the picture spans one board, between two gaps, and its
      // grain runs along.
      if (row.rim !== undefined && !face) uv.push(0.0125 + row.rim * 0.475, p.x * tile);
      else if (!face) uv.push((look.boards ? p.x : p.along) * tile, (down[j]! + (row.z > EDGE ? rise : 0)) * tile);
      // A face lies in the depth and along the wall. A board there is a board on edge, its grain into the depth.
      else if (look.boards) uv.push((p.x * ux + y * uy) * tile, z * tile);
      else uv.push(z * tile, (p.x * ux + y * uy) * tile);
    }
    return first;
  };

  const strip = (left: number, right: number, from = 0) => {
    for (let j = from; j < rows - 1; j++) index.push(left + j, left + j + 1, right + j, right + j, left + j + 1, right + j + 1);
  };
  const edge = profile.findIndex((row) => row.z >= EDGE);
  let right = -1;
  let wasFace = false;
  /** Which block the strips have come to. */
  let at = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    // Up the wall, whichever way the outline runs.
    const turn = b.y < a.y ? -1 : 1;
    const ux = a.face ? ((b.x - a.x) / length) * turn : 0;
    const uy = a.face ? ((b.y - a.y) / length) * turn : 0;
    const wall = cuts && a.face ? a.rises : undefined;
    // Open ground is in blocks. By a wall it is whole: the wall stands on it as it is.
    const open = blocks.length > 0 && !a.face && !a.wall && !b.wall && a.forward >= 1 && b.forward >= 1;
    while (open && at < blocks.length - 1 && blocks[at]!.to <= a.x + SEAM * 1.5) at++;
    let block = open ? blocks[at] : undefined;
    // Faces never share a column: two that meet may run different ways.
    let left = right < 0 || a.face || wasFace ? column(a, ux, uy, wall, block) : right;
    if (block && block.to < b.x - SEAM * 1.5 && block.to > a.x + SEAM * 1.5 && at < blocks.length - 1) {
      // A joint: the two blocks each have a column there, and between them stands the cheek of the step.
      const t = (block.to - a.x) / (b.x - a.x);
      const joint: BankPoint = { ...a, x: block.to, y: a.y + (b.y - a.y) * t, along: a.along + (b.along - a.along) * t };
      // The line of the joint is a finger wide: a column beside it on each side keeps the dark to that.
      const beside = (side: number): BankPoint => ({ ...joint, x: joint.x + side * SEAM, along: joint.along + side * SEAM });
      const near = column(beside(-1), 0, 0, undefined, block);
      strip(left, near);
      strip(near, column(joint, 0, 0, undefined, block, true));
      const next = blocks[++at]!;
      strip(column(joint, 0, 1, undefined, block, true), column(joint, 0, 1, undefined, next, true));
      left = column(beside(1), 0, 0, undefined, next);
      strip(column(joint, 0, 0, undefined, next, true), left);
      block = next;
    }
    right = column(b, ux, uy, wall, block);
    wasFace = a.face;
    strip(left, right);
    // The lower floor goes on under the upper one's corner, in front of the path: once for each wall.
    // Only where the upper floor has drawn back (under one that has not, nothing of it would be seen), and
    // only in the lower floor's own stuff: a deck that ends over earth has its own dark under its corner.
    if (wall && b.rises !== wall && wall.topForward < 1 && wall.lower === kind) {
      const reach = DRAW_BACK + wall.lean;
      const steps = Math.ceil(reach / 0.45);
      let last = -1;
      for (let k = 0; k <= steps; k++) {
        const away = (reach * k) / steps;
        const here = column({ x: wall.x + wall.side * away, y: wall.floor, wall: true, face: false, along: wall.along + wall.side * away, forward: wall.footForward, kind });
        // The points run to the right in every strip, so that each faces up.
        if (last >= 0) strip(wall.side > 0 ? last : here, wall.side > 0 ? here : last, edge);
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
