import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Mesh, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CLOSE_DETAIL } from './ground-detail';

/**
 * The small spruces the storm has felled across Stormskogen's path ("Stormen fällde granar som tändstickor!"; Olov,
 * 12 November 2026: "De små fällda träden som ligger när man går kan ha bättre texturer och se snyggare ut"). They were
 * the forest kit's log, a dark grey smear with no ends to it. Now each is a young spruce's trunk, snapped at both ends
 * like a matchstick, made here:
 * - spruce bark: small round scales, grey-brown, each its own tone, dark between them, and here and there one flaked off
 *   to the reddish bark under it; crust lichen on its sides, moss on its top towards the back, and darker underneath;
 * - where it broke, pale fresh wood: at its foot a rougher break that shows its rings round a darker heart, and at its
 *   top end long splinters, as a matchstick snaps;
 * - dead grey branch stubs round it, none on its top where he walks and none reaching out towards him, and along its
 *   back a few twigs still green with needles.
 * Its top is the block's, level from end to end where he walks: the simulation's outline is not touched.
 */

/** Spruce bark, grey-brown with a warm cast; moss; crust lichen. */
const BARK = new Color('#987559');
const MOSS = new Color('#5c7a3a');
const LICHEN = new Color('#97a18a');
/** Fresh spruce wood where it broke, the line of a ring, its heart, and where the bark's edge was torn. */
const WOOD = new Color('#e4c690');
const RING = new Color('#c49a62');
const HEART = new Color('#a3754a');
const TORN = new Color('#b8935f');
/** A dead branch's grey. */
const STUB = new Color('#7a746c');
/** Spruce needles, dark green, lighter at the twig's tip where they are new. */
const NEEDLE = new Color('#2e4a2b');
const NEEDLE_TIP = new Color('#4f6d38');

/** A small repeatable noise: smooth, about -1 to 1. */
function wave(seed: number) {
  return (a: number, b: number) => Math.sin(a * 1.7 + seed) * Math.cos(b * 1.3 - seed * 0.7) * 0.6
    + Math.sin(a * 3.9 - b * 2.3 + seed * 1.9) * 0.4;
}

/** A shape being built: corners with their colour and, for bark, where on the bark they are (along, round, 1). */
interface Part { position: number[]; colour: number[]; bark: number[]; index: number[] }
const part = (): Part => ({ position: [], colour: [], bark: [], index: [] });
function corner(p: Part, x: number, y: number, z: number, c: Color, bark: readonly [number, number, number] = [0, 0, 0]): number {
  p.position.push(x, y, z);
  p.colour.push(c.r, c.g, c.b);
  p.bark.push(...bark);
  return p.position.length / 3 - 1;
}
function shape(p: Part): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(p.position, 3));
  g.setAttribute('color', new Float32BufferAttribute(p.colour, 3));
  g.setAttribute('spruceBark', new Float32BufferAttribute(p.bark, 3));
  g.setIndex(p.index);
  g.computeVertexNormals();
  return g;
}

/** A thin tapered stick from `from` to `to`: a branch stub or a splinter. */
function stick(p: Part, from: readonly number[], to: readonly number[], r0: number, r1: number, colour: Color, sides = 5): void {
  const rings = 3;
  const base = p.position.length / 3;
  const d = [to[0]! - from[0]!, to[1]! - from[1]!, to[2]! - from[2]!];
  const long = Math.hypot(d[0]!, d[1]!, d[2]!) || 1;
  const t = d.map((v) => v / long);
  const helper = Math.abs(t[1]!) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const cross = (u: readonly number[], v: readonly number[]) => [u[1]! * v[2]! - u[2]! * v[1]!, u[2]! * v[0]! - u[0]! * v[2]!, u[0]! * v[1]! - u[1]! * v[0]!];
  let a = cross(t, helper);
  const la = Math.hypot(a[0]!, a[1]!, a[2]!);
  a = a.map((v) => v / la);
  const b = cross(t, a);
  for (let i = 0; i <= rings; i++) {
    const k = i / rings, r = r0 + (r1 - r0) * k;
    for (let s = 0; s < sides; s++) {
      const q = (s / sides) * Math.PI * 2;
      corner(p, from[0]! + d[0]! * k + r * (Math.cos(q) * a[0]! + Math.sin(q) * b[0]!), from[1]! + d[1]! * k + r * (Math.cos(q) * a[1]! + Math.sin(q) * b[1]!),
        from[2]! + d[2]! * k + r * (Math.cos(q) * a[2]! + Math.sin(q) * b[2]!), colour);
    }
  }
  for (let i = 0; i < rings; i++) for (let s = 0; s < sides; s++) {
    const i0 = base + i * sides + s, i1 = base + i * sides + ((s + 1) % sides);
    p.index.push(i0, i1, i0 + sides, i1, i1 + sides, i0 + sides);
  }
  const tip = corner(p, to[0]!, to[1]!, to[2]!, colour);
  for (let s = 0; s < sides; s++) p.index.push(base + rings * sides + s, base + rings * sides + ((s + 1) % sides), tip);
}

/**
 * The bark's scales, drawn on what is marked bark (`spruceBark`: along the trunk, round it, and 1): small round plates,
 * each its own tone, dark where they meet, now and then one flaked off to the red-brown bark under it. Mid and High
 * only, as the rest of the close detail (./ground-detail.ts), and it fades where it would be finer than a few pixels.
 */
function spruceBark(material: MeshStandardMaterial): void {
  material.customProgramCacheKey = () => 'fallen-spruce-bark-v1';
  material.onBeforeCompile = (shader) => {
    shader.uniforms.closeDetail = CLOSE_DETAIL;
    shader.vertexShader = 'attribute vec3 spruceBark;\nvarying vec3 vSpruce;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `
      #include <begin_vertex>
      vSpruce = spruceBark;`);
    shader.fragmentShader = /* glsl */ `uniform float closeDetail;
      varying vec3 vSpruce;
      vec2 spruceHash(vec2 p) {
        p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
        return fract(sin(p) * 43758.5453);
      }
      ` + shader.fragmentShader.replace('#include <color_fragment>', /* glsl */ `
      #include <color_fragment>
      if (vSpruce.z > 0.5 && closeDetail > 0.5) {
        // Scales a little longer than wide along the trunk; the nearest two cells give each its plate and its edge.
        vec2 at = vec2(vSpruce.x * 19.0, vSpruce.y * 25.0);
        vec2 cell = floor(at), inCell = fract(at);
        float first = 8.0, second = 8.0;
        vec2 mine = cell;
        for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
          vec2 g = vec2(float(i), float(j));
          vec2 r = g + 0.15 + 0.7 * spruceHash(cell + g) - inCell;
          float d = dot(r, r);
          if (d < first) { second = first; first = d; mine = cell + g; } else if (d < second) second = d;
        }
        float edge = sqrt(second) - sqrt(first);
        float pixel = length(fwidth(at));
        float near = 1.0 - smoothstep(0.3, 0.8, pixel);
        vec2 own = spruceHash(mine + 3.7);
        vec3 scale = diffuseColor.rgb * (0.84 + 0.3 * own.x);
        // One in six has flaked off: the reddish bark under it.
        scale = mix(scale, diffuseColor.rgb * vec3(1.3, 0.86, 0.64), step(0.83, own.y) * 0.85);
        scale *= 1.0 - 0.32 * (1.0 - smoothstep(0.03, 0.14, edge));
        // And shallow furrows along the trunk, wandering a little.
        scale *= 1.0 - 0.12 * smoothstep(0.55, 1.0, sin(vSpruce.y * 34.0 + 2.0 * sin(vSpruce.x * 2.3)));
        // Knots, where branches grew: a dark eye in a paler ring, in one cell of two along it.
        vec2 knotAt = vec2(vSpruce.x / 0.62, vSpruce.y / 0.5);
        vec2 knotCell = floor(knotAt);
        vec2 knotHash = spruceHash(knotCell + 11.0);
        vec2 knot = (fract(knotAt) - 0.25 - 0.5 * knotHash) * vec2(0.62, 0.5) / vec2(0.045, 0.06);
        float knotR = length(knot);
        float knotted = step(0.5, spruceHash(knotCell + 5.0).x);
        scale = mix(scale, diffuseColor.rgb * 1.15, knotted * (1.0 - smoothstep(1.3, 1.9, knotR)) * smoothstep(0.75, 1.15, knotR));
        scale = mix(scale, diffuseColor.rgb * vec3(0.62, 0.48, 0.38), knotted * (1.0 - smoothstep(0.6, 1.0, knotR)));
        diffuseColor.rgb = mix(diffuseColor.rgb, scale, near);
      }`);
  };
}

/**
 * Where it snapped, at `end` along it, facing `way` (-1 at its foot, 1 at its top): the bark's last edge torn pale, the
 * splinters out to `long` past it, and inside them the rings round its heart.
 */
function snapped(p: Part, end: number, way: 1 | -1, radius: number, middle: number, sides: number, long: number, random: () => number): void {
  const tone = new Color();
  const at = (x: number, q: number, r: number) => [x, middle + Math.cos(q) * r, Math.sin(q) * r] as const;
  const lip: number[] = [], tips: number[] = [], inner: number[] = [];
  const tipAt: (readonly [number, number, number])[] = [];
  for (let s = 0; s < sides; s++) {
    const q = (s / sides) * Math.PI * 2;
    lip.push(corner(p, ...at(end + way * 0.005, q, radius * 0.97), TORN));
    // Most splinters short, some long; the longest over the top, where the fibres tore last.
    const out = long * (0.15 + 0.85 * random() ** 2.2) + (Math.cos(q) > 0.3 ? 0.3 * long * random() : 0);
    const tip = at(end + way * out, q + (random() - 0.5) * 0.12, radius * (0.6 + 0.3 * random()));
    tipAt.push(tip);
    tips.push(corner(p, ...tip, tone.copy(WOOD).multiplyScalar(0.96 + 0.1 * random())));
    inner.push(corner(p, ...at(end + way * (0.015 + 0.25 * long * random()), q, radius * 0.45), tone.copy(WOOD).lerp(RING, 0.3)));
  }
  // Wound so that their front is outwards, with `way`.
  const face = (a: number, b: number, c: number) => (way > 0 ? p.index.push(a, b, c) : p.index.push(a, c, b));
  for (let s = 0; s < sides; s++) {
    const t = (s + 1) % sides;
    face(lip[s]!, tips[s]!, lip[t]!);
    face(lip[t]!, tips[s]!, tips[t]!);
    face(tips[s]!, inner[s]!, tips[t]!);
    face(tips[t]!, inner[s]!, inner[t]!);
  }
  // The rings round the heart.
  let before = inner;
  for (const [k, colour] of [[0.36, WOOD], [0.3, RING], [0.22, WOOD], [0.15, RING], [0.08, HEART]] as const) {
    const ring: number[] = [];
    for (let s = 0; s < sides; s++) ring.push(corner(p, ...at(end + way * 0.012 * (k / 0.36), (s / sides) * Math.PI * 2, radius * k), colour));
    for (let s = 0; s < sides; s++) {
      const t = (s + 1) % sides;
      face(before[s]!, ring[s]!, before[t]!);
      face(before[t]!, ring[s]!, ring[t]!);
    }
    before = ring;
  }
  const heart = corner(p, ...at(end, 0, 0), HEART);
  for (let s = 0; s < sides; s++) face(before[s]!, heart, before[(s + 1) % sides]!);
  // Long splinters standing out of the break, pale as matchsticks.
  for (let k = 0; k < Math.round(long * 12); k++) {
    const s = Math.floor(random() * sides);
    const base = tipAt[s]!;
    const q = (s / sides) * Math.PI * 2;
    const to = [end + way * (long * (0.9 + 0.8 * random())), base[1] + Math.cos(q) * 0.04, base[2] + Math.sin(q) * 0.04];
    stick(p, [end, base[1], base[2]], to, 0.03, 0.005, tone.copy(WOOD).multiplyScalar(1.02), 4);
  }
}

/**
 * A felled young spruce lying along the path over a block of ground `wide` long and `high` high, from the block's
 * left end at its foot. `seed` makes each its own.
 */
export function fallenSpruce(wide: number, high: number, seed: number): Mesh {
  const noise = wave(seed);
  let n = Math.abs(Math.round(seed * 9301)) % 233280 || 1;
  const random = () => ((n = (n * 9301 + 49297) % 233280) / 233280);
  const r0 = high / 2;
  /** Its radius along it: a little thicker at its foot (left) than towards its top. */
  const radius = (x: number) => r0 * (1.06 - 0.1 * (x / wide) + 0.025 * noise(x * 1.3, 2));
  /** Its middle: low enough that its top is the block's, whatever its radius. */
  const middle = (x: number) => high - radius(x);
  const trunk = part();
  const sides = 28;
  const from = -0.04, to = wide - 0.03;
  const rings = Math.max(8, Math.round((to - from) * 8));
  const tone = new Color();
  for (let i = 0; i <= rings; i++) {
    const x = from + ((to - from) * i) / rings;
    const r = radius(x);
    for (let s = 0; s < sides; s++) {
      const q = (s / sides) * Math.PI * 2;
      // q from the top: towards the camera at a quarter turn, under it at a half.
      const up = Math.cos(q), front = Math.sin(q);
      // Its bark's ridges, a finger's breadth off round at most; none on top, where he walks.
      const rough = 1 + 0.025 * noise(q * 5, x * 4) * (1 - Math.max(0, up) ** 2);
      tone.copy(BARK).multiplyScalar(0.86 + 0.18 * noise(x * 0.9, q * 2) + 0.05 * noise(x * 7, q * 9));
      // Moss on the top towards the back, in patches; crust lichen on its sides; dark underneath, where it lies.
      const mossAt = Math.max(0, up) * Math.max(0, 0.35 - front) * (0.55 + 0.45 * noise(x * 2.3, q * 3 + 5));
      tone.lerp(MOSS, Math.min(0.8, Math.max(0, (mossAt - 0.2) * 2.4)));
      tone.lerp(LICHEN, Math.max(0, noise(x * 5 + 3, q * 6) - 0.55) * 1.1 * (1 - Math.max(0, up)));
      tone.multiplyScalar(0.5 + 0.5 * Math.min(1, (up + 1.05) / 1.15));
      corner(trunk, x, middle(x) + up * r * rough, front * r * rough, tone, [x, q * r0, 1]);
    }
  }
  for (let i = 0; i < rings; i++) for (let s = 0; s < sides; s++) {
    const i0 = i * sides + s, i1 = i * sides + ((s + 1) % sides);
    trunk.index.push(i0, i1, i0 + sides, i1, i1 + sides, i0 + sides);
  }
  // Snapped at its foot, a rougher break that shows its rings; and at its top, long splinters.
  const ends = part();
  snapped(ends, from, -1, radius(from), middle(from), sides, 0.12, random);
  snapped(ends, to, 1, radius(to), middle(to), sides, 0.32, random);

  // Dead branch stubs in whorls, round its back and underneath, or low in front pointing down: none on its top.
  const stubs = part();
  for (let x = 0.5 + random() * 0.3; x < wide - 0.45; x += 0.7 + random() * 0.45) {
    const count = 2 + Math.floor(random() * 2);
    for (let k = 0; k < count; k++) {
      const q = random() < 0.7 ? -(0.95 + random() * 1.5) : 1.95 + random() * 0.6;
      const up = Math.cos(q), front = Math.sin(q);
      const r = radius(x);
      const long = 0.16 + random() * (front < 0 ? 0.42 : 0.16);
      const at = [x, middle(x) + up * r * 0.92, front * r * 0.92];
      stick(stubs, at, [x + long * 0.45, at[1]! + up * long, at[2]! + front * long], 0.038, 0.01, tone.copy(STUB).multiplyScalar(0.8 + 0.3 * random()), 5);
    }
  }

  // A few of its branches still green, along its back: a twig with its needles out on both sides, what says spruce.
  const sprays = part();
  for (let x = 0.7 + random() * 0.4; x < wide - 0.6; x += 1.1 + random() * 0.7) {
    const q = -(1.1 + random() * 0.35);
    const r = radius(x);
    const at = [x, middle(x) + Math.cos(q) * r * 0.9, Math.sin(q) * r * 0.9];
    const long = 0.45 + random() * 0.3;
    // Up and back, leaning towards the top end, and bending down at its tip.
    const way = [0.35, 0.9, -0.85];
    const wl = Math.hypot(way[0]!, way[1]!, way[2]!);
    const along = way.map((v) => v / wl);
    stick(sprays, at, [at[0]! + along[0]! * long, at[1]! + along[1]! * long - 0.08, at[2]! + along[2]! * long], 0.02, 0.006, tone.copy(STUB).multiplyScalar(0.75), 4);
    for (let k = 0.15; k < 1; k += 0.07) {
      const c = [at[0]! + along[0]! * long * k, at[1]! + along[1]! * long * k - 0.08 * k * k, at[2]! + along[2]! * long * k];
      const needle = 0.09 * (1 - 0.5 * k);
      for (const side of [-1, 1]) {
        // Out to either side of the twig, flat to the camera, and a little forward along it.
        const tip = [c[0]! + along[0]! * needle * 0.6 + side * 0.02, c[1]! + side * needle * 0.75, c[2]! + side * needle * 0.35];
        const green = tone.copy(NEEDLE).multiplyScalar(0.8 + 0.4 * random()).lerp(NEEDLE_TIP, k * 0.6);
        const a = corner(sprays, c[0]!, c[1]! - 0.008, c[2]!, green);
        const b = corner(sprays, c[0]! + 0.02, c[1]! + 0.008, c[2]!, green);
        const t = corner(sprays, tip[0]!, tip[1]!, tip[2]!, green);
        sprays.index.push(a, b, t);
      }
    }
  }

  // Both sides: the splinters are thin, and seen from behind as often as from the front.
  const material = new MeshStandardMaterial({ color: '#ffffff', vertexColors: true, roughness: 0.88, side: DoubleSide });
  material.name = 'fallen-spruce';
  spruceBark(material);
  const mesh = new Mesh(mergeGeometries([shape(trunk), shape(ends), shape(stubs), shape(sprays)]), material);
  mesh.name = 'fallen-spruce';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
