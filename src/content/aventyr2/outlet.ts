import { BufferGeometry, Color, Float32BufferAttribute } from 'three';
import { sequence } from '../../render/dressing/kit';

/**
 * Where a lake runs out into its å (Flärken, where the outlet takes the little one: Olov, "När ån tar med sig
 * lillgubben vill jag se en riktig å"): the stream's two banks, from the lake's edge on along it out of the picture,
 * and the stones in its bed that its water breaks round. The stream itself is the chapter's own water, which runs
 * here (../../render/water.ts, where its foam drifts), with its foam and white water (./render.ts).
 *
 * Built in the building's own place: x along the stream from where it leaves the lake, z across it (0 its middle,
 * the far bank behind, the near bank in front), y up from the water. Each bank is a low ridge of earth and old grass
 * and sedge, wet and dark at the water, that rounds down into the stream on its one side and into the lake behind
 * or in front on the other, and that grows out of the lake at the stream's mouth. Corners are vertex-coloured, as the
 * buildings' are.
 */
export interface OutletShape {
  /** How long it is drawn along x. */
  long: number;
  /** How far apart its two waterlines are, across the stream. */
  wide: number;
  /** How high its banks stand over the water at their crests. */
  high: number;
  /** How far along from the stream's mouth its near bank begins to come up out of the lake: past a jetty's end. */
  opens: number;
}

const EARTH = new Color('#2b241c'), WET = new Color('#1a1712'), SEDGE = new Color('#5d5a33'), STRAW = new Color('#8d7f4e'), GRASS = new Color('#46512c');
const STONE = new Color('#4a4f52'), STONE_WET = new Color('#2c3134'), MOSS = new Color('#47552c');

/**
 * One bank: a ridge along x whose stream side is at z = 0 in its own place and which lies towards `away`. It grows out
 * of the lake from `from` on, over four lengths.
 */
function bank(shape: OutletShape, away: 1 | -1, seed: number, out: { position: number[]; colour: number[] }, from = 0) {
  const random = sequence(seed);
  const step = 0.5;
  const columns = Math.ceil(shape.long / step) + 1;
  // Across it, from under the water at the stream, up its slope, over its crest, and down into the lake behind it.
  const across: readonly [number, number][] = [[-0.6, -0.5], [0, 0], [0.5, 0.42], [1.2, 0.8], [2.2, 1], [3.6, 0.92], [5, 0.5], [6.2, 0], [7, -0.6]];
  const bumps = Array.from({ length: 6 }, () => ({ at: random() * shape.long, wide: 1.5 + random() * 3, up: (random() - 0.4) * 0.5 }));
  const grid: [number, number, number][][] = [];
  const tones: Color[][] = [];
  for (let i = 0; i < columns; i++) {
    const x = Math.min(shape.long, i * step);
    // It grows out of the lake at the stream's mouth over four lengths.
    const rise = Math.min(1, Math.max(0, x - from) / 4) ** 0.8;
    const bump = bumps.reduce((sum, b) => sum + b.up * Math.exp(-(((x - b.at) / b.wide) ** 2)), 0);
    // Its waterline wanders a little, in and out.
    const wander = 0.35 * Math.sin(x * 0.7 + seed) + 0.2 * Math.sin(x * 1.9 + seed * 2);
    const column: [number, number, number][] = [];
    const tone: Color[] = [];
    for (const [k, [d, h]] of across.entries()) {
      // Before the bank emerges, its whole profile belongs below the water. Collapsing its crown to y=0
      // made a broad flat shelf at the exact waterline; the swell exposed and hid that shelf every half-cycle.
      // Begin in the shallow bed and meet the unchanged mature bank over the same four lengths.
      const submerged = h >= 0 ? -0.12 * (1 - rise) : 0;
      const y = (h > 0 ? h * shape.high * rise * (1 + bump) : h) + submerged;
      const noise = Math.sin(x * 3.1 + d * 2.3 + seed) * 0.5 + Math.sin(x * 7.7 - d * 5.1) * 0.5;
      column.push([x, y + (h > 0 ? 0.06 * noise * rise : 0), away * (d + wander * (k < 3 ? 1 : 0.3))]);
      // Dark wet earth at the water, then sedge, old straw and grass up its slope, varied along it.
      const c = new Color();
      if (y <= 0.08) c.copy(WET);
      else if (y < 0.3) c.copy(EARTH).lerp(SEDGE, (y - 0.08) / 0.22);
      else c.copy(SEDGE).lerp(noise > 0.2 ? STRAW : GRASS, 0.3 + 0.4 * Math.abs(noise));
      tone.push(c.multiplyScalar(0.85 + 0.25 * random()));
    }
    grid.push(column);
    tones.push(tone);
  }
  for (let i = 0; i < grid.length - 1; i++) for (let j = 0; j < across.length - 1; j++) {
    const a = grid[i]![j]!, b = grid[i + 1]![j]!, c = grid[i]![j + 1]!, d = grid[i + 1]![j + 1]!;
    const ta = tones[i]![j]!, tb = tones[i + 1]![j]!, tc = tones[i]![j + 1]!, td = tones[i + 1]![j + 1]!;
    // Facing up and out: the winding turns with the side it lies to.
    const tris = away > 0 ? [[a, c, b, ta, tc, tb], [b, c, d, tb, tc, td]] : [[a, b, c, ta, tb, tc], [b, d, c, tb, td, tc]];
    for (const [p, q, r, cp, cq, cr] of tris as [number[], number[], number[], Color, Color, Color][]) {
      out.position.push(...p!, ...q!, ...r!);
      out.colour.push(cp.r, cp.g, cp.b, cq.r, cq.g, cq.b, cr.r, cr.g, cr.b);
    }
  }
}

/** A stone half out of the water: a lumpy dome, wet and dark below, with moss on its top. */
function stone(x: number, z: number, size: number, seed: number, out: { position: number[]; colour: number[] }) {
  const random = sequence(seed);
  const rings = 4, around = 9;
  const lump = Array.from({ length: around }, () => 0.8 + random() * 0.4);
  const points: [number, number, number][][] = [];
  for (let r = 0; r <= rings; r++) {
    const up = r / rings;
    const ring: [number, number, number][] = [];
    for (let j = 0; j < around; j++) {
      const a = (j / around) * Math.PI * 2;
      const spread = Math.cos(up * Math.PI * 0.5) * size * lump[j]! * (r === 0 ? 1.1 : 1);
      ring.push([x + Math.cos(a) * spread * 1.2, -0.25 + Math.sin(up * Math.PI * 0.5) * size * 0.75, z + Math.sin(a) * spread]);
    }
    points.push(ring);
  }
  const tone = (p: [number, number, number]) => (p[1] < 0.08 ? STONE_WET : p[1] > size * 0.55 && random() < 0.5 ? MOSS : STONE);
  for (let r = 0; r < rings; r++) for (let j = 0; j < around; j++) {
    const a = points[r]![j]!, b = points[r]![(j + 1) % around]!, c = points[r + 1]![j]!, d = points[r + 1]![(j + 1) % around]!;
    for (const tri of [[a, c, b], [b, c, d]]) {
      for (const p of tri) {
        out.position.push(...p!);
        const c0 = tone(p!);
        out.colour.push(c0.r, c0.g, c0.b);
      }
    }
  }
}

/** The outlet's banks and its stones, as one vertex-coloured shape in its own place (see above). */
export function outletShape(shape: OutletShape, seed = 7): BufferGeometry {
  const out = { position: [] as number[], colour: [] as number[] };
  // The far bank behind the stream, and the near bank in front of it.
  bank(shape, -1, seed, out);
  const near = { position: [] as number[], colour: [] as number[] };
  // The near bank is a low wet edge of earth and sedge, so that the camera, which looks along the water from little
  // over it, sees the stream over it; it comes up out of the lake past a jetty's end.
  bank({ ...shape, high: shape.high * 0.2 }, 1, seed + 11, near, shape.opens);
  for (let i = 0; i < near.position.length; i += 3) near.position[i + 2]! += shape.wide;
  out.position.push(...near.position);
  out.colour.push(...near.colour);
  // The far bank stands at the stream's far side: everything moves so that the stream's middle is at z = 0.
  for (let i = 2; i < out.position.length; i += 3) out.position[i]! -= shape.wide / 2;
  // Stones in its bed, the water breaking round them: more where it leaves the lake, and none by a jetty's end.
  const random = sequence(seed + 23);
  for (let k = 0; k < Math.round(shape.long / 3); k++) {
    const x = shape.opens + random() ** 1.4 * (shape.long - shape.opens - 1.5);
    const size = 0.3 + random() * 0.35;
    // Not on its middle line, where what it carries floats: the whole stone is clear of it.
    const clear = 0.7 + size * 1.35;
    const z = (random() < 0.5 ? -1 : 1) * (clear + random() * Math.max(0, shape.wide * 0.5 - 0.4 - clear));
    stone(x, z, size, seed * 31 + k, out);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(out.position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(out.colour, 3));
  geometry.computeVertexNormals();
  return geometry;
}
