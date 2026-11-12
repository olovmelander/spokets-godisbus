import { Color, Float32BufferAttribute, type BufferGeometry, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mossAt, noise } from '../../render/dressing/kit';

/**
 * The stones the river breaks over (Älven's rapids and the torrent below the outlet, seen from the raft). They were
 * lumps of twenty faces, flat-shaded (Olov, 12 November 2026: "stenarna när man åker flotte kan modelleras snyggare, de
 * är väldigt kantiga för tillfället"). Now each is a boulder the water has worn round: smooth, a little flattened and
 * broad at its foot, swelling and dipping in a shape of its own. Where the water washes it, it is dark and wet; a
 * finger's breadth over the river a paler line where it dries; and on the tops of the ones out of the hardest water,
 * moss. Its grain is in its corners' colours: no lichen, which wants dry rock. One draw for all of a rapid's stones.
 */

/** A stone in the river: where it stands from the rapid's middle, how wide, how tall over the water, and its moss. */
export interface RiverStone { x: number; z: number; wide: number; tall: number; moss?: number }

/** How many corners round and up and down each stone has: smooth from the raft, and still a few hundred apiece. */
export const STONE_SEGMENTS = { round: 28, up: 22 };

/**
 * How far behind a rapid's middle line its stones and white water keep, in its own frame (which stands 0.2 behind the
 * path): the raft's lane down the torrent below the outlet is clear of them, and so is the near water where the little
 * one bobs.
 */
export const RAPID_LANE = 0.6;

/**
 * A rapid's stones, from its middle: big ones further back, mossy where they stand high out of the water, and a few
 * small ones just breaking the surface nearer the lane. Every one's front stays behind the lane (`RAPID_LANE`).
 */
export const RAPID_STONES: readonly RiverStone[] = [
  { x: -6.2, z: -2.1, wide: 1.5, tall: 0.9, moss: 0.6 },
  { x: -4.9, z: -1.25, wide: 0.6, tall: 0.4 },
  { x: -3.4, z: -3.2, wide: 1.9, tall: 1.3, moss: 1 },
  { x: -0.8, z: -1.75, wide: 1.1, tall: 0.7, moss: 0.3 },
  { x: 1, z: -1.2, wide: 0.55, tall: 0.36 },
  { x: 2.2, z: -3.4, wide: 2.1, tall: 1.4, moss: 1 },
  { x: 4.4, z: -1.95, wide: 1.3, tall: 0.8, moss: 0.4 },
  { x: 5.6, z: -1.15, wide: 0.5, tall: 0.34 },
  { x: 6.6, z: -2.8, wide: 1.6, tall: 1, moss: 0.7 },
];

const DRY = [new Color('#6f726d'), new Color('#7d7a71'), new Color('#62666a')];
const WET = new Color('#232a2a');
const TIDE = new Color('#8e8f86');

/**
 * The stones of one rapid, merged: their feet below the water's surface (y 0 here), their wet sides dark, a pale line
 * where they dry, moss on the tops of the mossy ones. `seed` makes each rapid's stones its own.
 */
export function riverStonesGeometry(stones: readonly RiverStone[], seed: number): BufferGeometry {
  const parts = stones.map((stone, i) => oneStone(stone, seed * 7.31 + i * 3.17));
  const merged = mergeGeometries(parts)!;
  for (const part of parts) part.dispose();
  return merged;
}

/** The material the stones share: wet, a little glossy, coloured on their corners. */
export function riverStonesMaterial(): MeshStandardMaterial {
  return new MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0 });
}

export function riverStones(stones: readonly RiverStone[], seed: number): Mesh {
  const mesh = new Mesh(riverStonesGeometry(stones, seed), riverStonesMaterial());
  mesh.name = 'river-stones';
  return mesh;
}

function oneStone(stone: RiverStone, seed: number): BufferGeometry {
  const { x, z, wide, tall } = stone;
  const deep = wide * (0.72 + 0.18 * noise(seed, 1.7));
  const geometry = new SphereGeometry(1, STONE_SEGMENTS.round, STONE_SEGMENTS.up);
  const at = geometry.getAttribute('position');
  // How it leans and which way its shape swells: its own.
  const lean = (noise(seed, 4.2) - 0.5) * 0.35;
  const flat = 0.78 + 0.16 * noise(seed, 8.9);
  // Where its middle stands: a little over the water, so that more than half of it shows.
  const middle = 0.1 + tall * 0.05;
  const p = new Vector3();
  for (let i = 0; i < at.count; i++) {
    p.fromBufferAttribute(at, i);
    // Worn round, but never a ball: broad low swells and a few smaller ones, from its own place in the noise.
    const swell = 1 + 0.16 * (noise(p.x * 1.1 + seed, p.y * 1.1 + p.z * 0.9) - 0.5) + 0.07 * (noise(p.x * 2.6 - seed, p.z * 2.6 + p.y * 1.7) - 0.5);
    let sx = p.x * swell;
    let sy = p.y * swell;
    let sz = p.z * swell;
    // Its top flattened a little, as the water and ice leave it; broad at its foot, under the water. Both bend in from
    // nothing at its middle, so that no crease runs round it there.
    if (sy > 0) sy *= 1 - (1 - flat) * sy * sy;
    else { const foot = 1 + 0.18 * sy * sy; sx *= foot; sz *= foot; sy *= 1 - 0.25 * sy * sy; }
    p.set(sx * wide + sy * lean * tall, sy * tall + middle, sz * deep);
    at.setXYZ(i, p.x + x, p.y, p.z + z);
  }
  geometry.computeVertexNormals();
  // Its colour, corner by corner: its own stone, the wet below, the tide line, and moss on top.
  const normal = geometry.getAttribute('normal');
  const colour: number[] = [];
  const own = new Color().copy(DRY[Math.floor(noise(seed, 2.3) * 2.999)]!);
  const c = new Color();
  const moss = new Color();
  const mossy = stone.moss ?? 0;
  for (let i = 0; i < at.count; i++) {
    const px = at.getX(i), py = at.getY(i), pz = at.getZ(i);
    // Its grain: broad shades and a finer speckle of dark and pale crystals.
    c.copy(own).multiplyScalar(0.84 + 0.22 * noise(px * 2.1 + seed, py * 2.1 + pz * 1.7) + 0.14 * noise(px * 9.3 - seed, py * 8.1 + pz * 9.7));
    // Washed dark where the water reaches, darkest at the surface and under it.
    const wet = 1 - smoothstep(0.08, 0.55, py + 0.06 * Math.sin(px * 3.1 + pz * 2.3 + seed));
    c.lerp(WET, 0.78 * wet);
    // A pale line where the splashes dry, just over the wet.
    const tide = Math.max(0, 1 - Math.abs(py - 0.6) / 0.08) * 0.35;
    c.lerp(TIDE, tide);
    // Darker in under its swell, where no light from the sky reaches.
    const up = normal.getY(i);
    c.multiplyScalar(1 - 0.35 * smoothstep(0, 0.7, -up));
    // Moss on its top, out of the water's reach, in soft patches: dark and wet.
    const patch = noise(px * 1.6 + seed, pz * 1.6 - seed) * 0.75 + noise(px * 5.1, pz * 5.1 + seed) * 0.25;
    const green = mossy * smoothstep(0.45, 0.9, up) * smoothstep(0.7, 1.05, py) * smoothstep(0.35, 0.7, patch);
    if (green > 0) c.lerp(mossAt(px * 3, pz * 3, moss).multiplyScalar(0.5), 0.75 * Math.min(1, green));
    colour.push(c.r, c.g, c.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.deleteAttribute('uv');
  return geometry;
}

function smoothstep(a: number, b: number, v: number): number {
  const k = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return k * k * (3 - 2 * k);
}
