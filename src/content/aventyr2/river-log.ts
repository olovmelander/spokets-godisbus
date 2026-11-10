import { BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial } from 'three';
import { sequence } from '../../render/dressing/kit';

/**
 * A log the river carries (Älven's eddies, the logs between its stones and the two in the lake's shallows): a sawn
 * trunk floating half under, lying along the path. It is as long as the simulation's thing is wide and as thick as
 * it is high, and its top is level where the simulation's top is, so that he stands on it, bobbing and drifting
 * with it (Olov: "På stockarna ... står man i luften ovanför stocken, inte på den"). It was the nature kit's fallen
 * branch fitted to the thing's box: that branch tapers from 1.0 to 0.34 thick and its stubs reach down to half its
 * length again, so the box squashed it to 0.42 thick at most, and its top lay 0.47 to 0.78 under his feet, mostly
 * under the water.
 *
 * Made here, its own for each log (`seed`): wet dark bark in long plates with furrows between, a few patches worn
 * bare to grey wood, a knot or two and a broken bough's stub out to the side, never over where he walks; and two
 * sawn ends, pale, with their rings, a darker heart, the bark round them and a crack.
 */
export function riverLogShape(width: number, high: number, seed: number): BufferGeometry {
  const random = sequence(seed * 7919 + 13);
  const r = high / 2;
  const around = 32;
  const along = Math.max(8, Math.ceil(width * 9));
  const position: number[] = [];
  const colour: number[] = [];
  const index: number[] = [];
  const c = new Color();
  const put = (x: number, y: number, z: number, tone: Color) => {
    position.push(x, y, z);
    colour.push(tone.r, tone.g, tone.b);
    return position.length / 3 - 1;
  };
  // Thinner towards one end by a few hundredths, its top kept level: it is the top he stands on.
  const taper = 0.04 + random() * 0.04;
  const thin = random() < 0.5 ? 1 : -1;
  const radiusAt = (s: number) => r * (1 - taper * (thin > 0 ? s : 1 - s));
  // The sawn ends are not quite square to it.
  const tilt = [[(random() - 0.5) * 0.12, (random() - 0.5) * 0.12], [(random() - 0.5) * 0.12, (random() - 0.5) * 0.12]] as const;
  const endAt = (s: number, y: number, z: number) => (s <= 0 ? -width / 2 + tilt[0][0] * z + tilt[0][1] * (y - r) : s >= 1 ? width / 2 + tilt[1][0] * z + tilt[1][1] * (y - r) : (s - 0.5) * width);
  // The bark's plates: furrows round it that wander a little along it.
  const plates = 9 + Math.floor(random() * 3);
  const phase = random() * Math.PI * 2;
  const wander = 0.6 + random() * 0.9;
  const furrowAt = (s: number, a: number) => Math.pow(0.5 + 0.5 * Math.cos(a * plates + phase + 1.1 * Math.sin(s * wander * 6 + a * 2)), 4);
  // Each plate a tone of its own, and its own breaks along the log.
  const plateTone = (s: number, a: number) => {
    const plate = Math.floor((a * plates + phase + 1.1 * Math.sin(s * wander * 6 + a * 2)) / (Math.PI * 2) + 0.5 + Math.floor(s * width * 1.6) * 0.37);
    const v = Math.sin(plate * 12.9898 + seed * 0.731) * 43758.5453;
    return v - Math.floor(v);
  };
  // Where it has been rolled against stones the bark is worn off: smooth grey wood.
  const worn = [0, 1, 2].map(() => ({ s: random(), a: random() * Math.PI * 2, size: 0.12 + random() * 0.14 }));
  const wornAt = (s: number, a: number) => Math.max(0, ...worn.map((w) => {
    const da = Math.atan2(Math.sin(a - w.a), Math.cos(a - w.a));
    return 1 - Math.hypot(((s - w.s) * width) / (w.size * 2.6), (da * r) / w.size);
  }));
  // Dark knots, where boughs were.
  const knots = [0, 1].map(() => ({ s: 0.15 + random() * 0.7, a: random() * Math.PI * 2 }));
  const knotAt = (s: number, a: number) => Math.max(0, ...knots.map((k) => {
    const da = Math.atan2(Math.sin(a - k.a), Math.cos(a - k.a));
    return 1 - Math.hypot(((s - k.s) * width) / 0.07, (da * r) / 0.05);
  }));
  const BARK = new Color('#3d3027'), BARK_LIGHT = new Color('#5c4a3a'), FURROW = new Color('#1f1813');
  const GREY = new Color('#857c6c'), WET = new Color('#2b3326'), DRY = new Color('#6e604f');

  // The trunk: rings along it, each round it from the front (+z), up over the top and down the back.
  const ring = (s: number) => {
    const first = position.length / 3;
    const big = radiusAt(s);
    const centre = high - big;
    for (let j = 0; j < around; j++) {
      const a = (j / around) * Math.PI * 2;
      const bare = Math.min(1, wornAt(s, a) * 3);
      const furrow = furrowAt(s, a) * (1 - bare);
      const radius = big * (1 - 0.075 * furrow - 0.02 * bare);
      const y = centre + Math.sin(a) * radius;
      const z = Math.cos(a) * radius;
      c.copy(BARK).lerp(BARK_LIGHT, 0.25 + 0.6 * plateTone(s, a));
      c.lerp(FURROW, furrow * 0.85);
      c.lerp(GREY, bare * 0.85);
      c.lerp(FURROW, Math.min(1, knotAt(s, a) * 1.6));
      // Its top, out of the water, has dried paler where he stands; it is darker and greener under, in the water.
      c.lerp(DRY, Math.max(0, Math.sin(a) - 0.55) * 0.9 * (1 - furrow * 0.6));
      c.lerp(WET, Math.max(0, -Math.sin(a)) * 0.45);
      put(endAt(s, y, z), y, z, c);
    }
    return first;
  };
  const rings = Array.from({ length: along + 1 }, (_, i) => ring(i / along));
  for (let i = 0; i < along; i++) for (let j = 0; j < around; j++) {
    const a = rings[i]! + j, b = rings[i]! + ((j + 1) % around), d = rings[i + 1]! + j, e = rings[i + 1]! + ((j + 1) % around);
    index.push(a, d, b, b, d, e);
  }

  // The sawn ends: rings of the tree's years, closer towards the bark, a darker heart and the pith, the bark round
  // its edge, and a crack from the edge in.
  const years: readonly [number, string][] = [
    [0, '#5e4630'], [0.06, '#80603f'], [0.16, '#a07c55'], [0.2, '#856544'], [0.3, '#aa875e'], [0.33, '#8c6c48'],
    [0.42, '#b6966a'], [0.45, '#98784f'], [0.55, '#cbb084'], [0.58, '#ab8f63'], [0.66, '#d2b88c'], [0.685, '#b29669'],
    [0.75, '#d6bd92'], [0.77, '#b89c70'], [0.83, '#d8c096'], [0.88, '#c9ae84'], [0.9, '#4e3a2a'], [0.93, '#3d3027'], [1, '#33281f'],
  ];
  const ends: [number, number][] = [[0, -1], [1, 1]];
  for (const [s, side] of ends) {
    const big = radiusAt(s);
    const centre = high - big;
    const crack = random() * Math.PI * 2;
    // The pith, a little off the middle, as a stem grows more on its sunny side.
    const off = [(random() - 0.5) * 0.16 * big, (random() - 0.5) * 0.16 * big];
    const loops = years.map(([k, hex]) => {
      const first = position.length / 3;
      const tone = new Color(hex);
      for (let j = 0; j < around; j++) {
        const a = (j / around) * Math.PI * 2;
        // The edge follows the trunk's own furrowed edge, so that the two meet.
        const bare = Math.min(1, wornAt(s, a) * 3);
        const edge = big * (1 - 0.075 * furrowAt(s, a) * (1 - bare) - 0.02 * bare);
        const rr = edge * k;
        const y = centre + Math.sin(a) * rr + off[0]! * (1 - k);
        const z = Math.cos(a) * rr + off[1]! * (1 - k);
        // Weathered: the outer years greyer, and the crack dark.
        c.copy(tone).lerp(GREY, 0.18 * k * k);
        const da = Math.abs(Math.atan2(Math.sin(a - crack), Math.cos(a - crack)));
        if (k > 0.35 && k < 0.9 && da < 0.11) c.multiplyScalar(0.45);
        put(endAt(s, y, z), y, z, c);
      }
      return first;
    });
    for (let i = 0; i < loops.length - 1; i++) for (let j = 0; j < around; j++) {
      const a = loops[i]! + j, b = loops[i]! + ((j + 1) % around), d = loops[i + 1]! + j, e = loops[i + 1]! + ((j + 1) % around);
      // Facing out of the end: the winding turns with the side.
      if (side > 0) index.push(a, b, d, b, e, d);
      else index.push(a, d, b, b, d, e);
    }
  }

  // A broken bough's stub or two, out to the front or the back about level, low enough never to cover his boots.
  for (let k = 0; k < 1 + Math.floor(random() * 2); k++) {
    const s = 0.2 + random() * 0.6;
    const front = random() < 0.5 ? 1 : -1;
    const a = front > 0 ? -0.1 + random() * 0.4 : Math.PI - 0.3 + random() * 0.4;
    const big = radiusAt(s);
    const centre = high - big;
    const out = [0, Math.sin(a), Math.cos(a)] as const;
    const long = r * (0.45 + random() * 0.35);
    const wide = r * 0.16;
    const side = [1, 0, 0] as const;
    const up = [0, -out[2], out[1]] as const;
    const base = (position.length / 3);
    for (let i = 0; i <= 2; i++) {
      const t = i / 2;
      const reach = big * 0.8 + long * t;
      const radius = wide * (1 - 0.45 * t);
      for (let j = 0; j < 8; j++) {
        const b = (j / 8) * Math.PI * 2;
        const dx = Math.cos(b) * radius * side[0];
        const dy = Math.sin(b) * radius * up[1];
        const dz = Math.sin(b) * radius * up[2];
        c.copy(i === 2 ? GREY : BARK).multiplyScalar(i === 2 ? 1.1 : 0.9);
        put((s - 0.5) * width + dx, centre + out[1] * reach + dy, out[2] * reach + dz, c);
      }
    }
    for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++) {
      const a0 = base + i * 8 + j, b0 = base + i * 8 + ((j + 1) % 8), d0 = base + (i + 1) * 8 + j, e0 = base + (i + 1) * 8 + ((j + 1) % 8);
      index.push(a0, d0, b0, b0, d0, e0);
    }
    // Its broken end, pale.
    const tip = put((s - 0.5) * width, centre + out[1] * (big * 0.8 + long * 1.04), out[2] * (big * 0.8 + long * 1.04), c.copy(GREY).multiplyScalar(1.25));
    for (let j = 0; j < 8; j++) index.push(base + 16 + j, tip, base + 16 + ((j + 1) % 8));
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colour, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

let wood: MeshStandardMaterial | null = null;
/** The logs' wood, one for all of them: its colours are on its corners, and it is wet, so it has a sheen. */
export function riverLogWood(): MeshStandardMaterial {
  wood ??= new MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0, name: 'river-log' });
  return wood;
}

/** A log's own number, from its name: the same log looks the same every time. */
export function logSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return (h >>> 0) % 100000;
}
