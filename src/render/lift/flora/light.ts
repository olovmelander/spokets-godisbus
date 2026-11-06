import { BufferGeometry, Color, Float32BufferAttribute, MeshStandardMaterial, Vector3, type CanvasTexture, type Material } from 'three';
import { drawn, sequence } from '../../dressing/kit';

/**
 * The light in what grows (docs/visual-upgrade.md, flora): one set of numbers for every leaf, moss and mushroom
 * of the view, set each frame by the flora's lift (../flora.ts) from the place's sun and its darkness.
 *
 * - `leafSun`, `leafLight`: the sun stands low behind the scene, so a leaf it shines through glows warm, the more
 *   the nearer it is to the line from the eye to the sun (`leafy`).
 * - `mossSheen`: moss is soft: its edges catch the light like velvet (`mossy`).
 * - `mushGlow`, `mushTime`: how much the glowing mushrooms glow (0 by day), and their slow breath (`glowing`).
 */
export const PLANT = {
  leafSun: { value: new Vector3(-0.73, 0.52, -0.42) },
  leafLight: { value: new Color(0.9, 0.75, 0.5) },
  mossSheen: { value: new Color(0.25, 0.27, 0.18) },
  mushGlow: { value: 0 },
  mushTime: { value: 0 },
};

/** Adds to a material's shader as the wind and the grade do: what was there runs first, and the key names it. */
function patch(material: Material, name: string, edit: (shader: { vertexShader: string; fragmentShader: string; uniforms: Record<string, unknown> }) => void): void {
  const before = material.onBeforeCompile;
  const key = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${key()}:${name}`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    Object.assign(shader.uniforms, PLANT);
    edit(shader);
  };
}
const beforeOpaque = (shader: { fragmentShader: string }, declared: string, glsl: string) => {
  shader.fragmentShader = declared + shader.fragmentShader.replace('#include <opaque_fragment>', `${glsl}\n#include <opaque_fragment>`);
};

/**
 * A leaf's light: some of the low sun behind the scene comes through it, warm, as through a birch's crown
 * against the light (a wrap light and a back light, cheap). Only the leaves of the atlas glow so, not its bark.
 * Every leaf material gets the same text and the same key: they are one program.
 */
export function leafy<T extends MeshStandardMaterial>(material: T): T {
  patch(material, 'leaf-v1', (shader) => beforeOpaque(shader, 'uniform vec3 leafSun, leafLight;\n', /* glsl */ `
    #ifdef USE_MAP
    {
      vec3 leafL = normalize((viewMatrix * vec4(leafSun, 0.0)).xyz);
      float leaf = max(step(0.5, vMapUv.y), step(vMapUv.x, 0.5));
      float through = (0.3 + 0.7 * saturate(-dot(normal, leafL))) * (0.35 + 0.65 * smoothstep(-0.3, 0.9, dot(-normalize(vViewPosition), leafL)));
      outgoingLight += leaf * diffuseColor.rgb * leafLight * through;
    }
    #endif`));
  return material;
}

/**
 * Moss: soft and damp. Its edges catch the light like velvet, it is darker where it turns under, and a slow
 * ripple of light and shade runs through its pile. No hard highlight anywhere. Seen close it is a carpet of little
 * stars, as haircap and feather moss are (the graphics pass of 6 November 2026, after the reference brief): pale
 * yellow-green shoot tips and dark gaps between them, at two sizes, fading where they would be finer than a pixel.
 */
export function mossy<T extends Material>(material: T): T {
  patch(material, 'moss-v2', (shader) => {
    shader.vertexShader = 'varying vec3 vMossAt;\n' + shader.vertexShader.replace('#include <project_vertex>', /* glsl */ `#include <project_vertex>
      vec4 mossAt = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
      mossAt = instanceMatrix * mossAt;
      #endif
      vMossAt = (modelMatrix * mossAt).xyz;`);
    beforeOpaque(shader, 'uniform vec3 mossSheen; varying vec3 vMossAt;\n', /* glsl */ `
    {
      vec3 mossUp = (vec4(normal, 0.0) * viewMatrix).xyz;
      vec3 p = vMossAt * 9.0;
      float pile = sin(p.x + sin(p.z * 1.3)) * sin(p.y * 1.7 + sin(p.x * 1.1 + p.z));
      float rim = 1.0 - saturate(dot(normal, normalize(vViewPosition)));
      outgoingLight *= 0.8 + 0.28 * smoothstep(-0.5, 0.9, mossUp.y) + 0.07 * pile;
      outgoingLight += diffuseColor.rgb * mossSheen * rim * rim * (0.75 + 0.25 * pile);
      // The stars: a shoot tip in each little cell, and the dark between them.
      vec2 mossQ = vMossAt.xz * 26.0 + vec2(vMossAt.y * 7.0, -vMossAt.y * 5.0);
      vec2 mossCell = floor(mossQ), mossIn = fract(mossQ) - 0.5;
      vec2 mossJitter = vec2(fract(sin(dot(mossCell, vec2(127.1, 311.7))) * 43758.5), fract(sin(dot(mossCell, vec2(269.5, 183.3))) * 43758.5)) - 0.5;
      float mossTip = 1.0 - smoothstep(0.08, 0.26, length(mossIn - mossJitter * 0.5));
      vec2 mossQ2 = mossQ * 2.3 + 17.0;
      vec2 mossIn2 = fract(mossQ2) - 0.5;
      float mossGap = smoothstep(0.32, 0.48, max(abs(mossIn2.x), abs(mossIn2.y)));
      float mossNear = 1.0 - smoothstep(0.35, 0.9, length(fwidth(mossQ)));
      outgoingLight *= 1.0 - 0.22 * mossGap * mossNear;
      outgoingLight += diffuseColor.rgb * vec3(0.32, 0.36, 0.08) * mossTip * mossNear * (0.6 + 0.4 * smoothstep(-0.2, 0.8, mossUp.y));
    }`);
  });
  return material;
}

/** How fast the mushrooms breathe, in radians a second: a breath in three seconds, never one a second. */
export const MUSH_BREATH = 2.1;

/**
 * A mushroom that glows in the dark: its cap (the `glow` on its corners) gives a light of its own colour, as
 * much as `mushGlow` says, breathing slowly (`MUSH_BREATH`).
 */
export function glowing<T extends MeshStandardMaterial>(material: T): T {
  patch(material, 'mush-v1', (shader) => {
    shader.vertexShader = 'attribute float glow; uniform float mushTime; varying float vGlow;\n' + shader.vertexShader.replace('#include <begin_vertex>', /* glsl */ `#include <begin_vertex>
      vGlow = glow;
      #ifdef USE_INSTANCING
      vGlow *= 0.72 + 0.28 * sin(mushTime * ${MUSH_BREATH.toFixed(2)} + instanceMatrix[3].x * 1.7);
      #endif`);
    shader.fragmentShader = 'uniform float mushGlow; varying float vGlow;\n' + shader.fragmentShader.replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
      #ifdef USE_COLOR
      totalEmissiveRadiance += vColor.rgb * vGlow * mushGlow;
      #endif`);
  });
  return material;
}

// --- the atlas -------------------------------------------------------------------------------------------------

/** The atlas's cells, 128 px each, four across and two down. Its drawings are pale: the corners give their colour. */
export const CELL = { clump: 0, strand: 1, spray: 2, tuft: 3, fern: 4, leaf: 5, birch: 6, pine: 7 } as const;
export type Cell = keyof typeof CELL;
/** Where a cell is in the atlas, as shares of it: left, bottom, width, height. */
export const cellUv = (cell: Cell): [number, number, number, number] => {
  const i = CELL[cell];
  return [(i % 4) / 4, i < 4 ? 0.5 : 0, 0.25, 0.5];
};

type Pen = CanvasRenderingContext2D;
const S = 128;

/** A leaf from its stalk's end along an angle: a pointed oval. */
function leaf(c: Pen, x: number, y: number, angle: number, long: number, wide: number, shade: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.fillStyle = `rgb(${shade},${shade},${shade})`;
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(long * 0.35, -wide, long, 0);
  c.quadraticCurveTo(long * 0.35, wide, 0, 0);
  c.fill();
  c.restore();
}
/** A twig from one place to another, bowed, with what grows along it. */
function twig(c: Pen, x0: number, y0: number, x1: number, y1: number, bow: number, width: number, along: (x: number, y: number, angle: number, t: number) => void, steps = 10): void {
  const mx = (x0 + x1) / 2 + (y1 - y0) * bow;
  const my = (y0 + y1) / 2 - (x1 - x0) * bow;
  c.strokeStyle = 'rgb(120,120,120)';
  c.lineWidth = width;
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx, my, x1, y1);
  c.stroke();
  for (let k = 1; k <= steps; k++) {
    const t = k / steps;
    const x = (1 - t) ** 2 * x0 + 2 * t * (1 - t) * mx + t * t * x1;
    const y = (1 - t) ** 2 * y0 + 2 * t * (1 - t) * my + t * t * y1;
    along(x, y, Math.atan2((1 - t) * (my - y0) + t * (y1 - my), (1 - t) * (mx - x0) + t * (x1 - mx)), t);
  }
}

const DRAW: ((c: Pen, next: () => number) => void)[] = [
  // A birch's clump: small pointed leaves on fine twigs that spread and droop from one stalk, a round mass.
  (c, next) => {
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 2 + (k - 4) * 0.3 + (next() - 0.5) * 0.16;
      const long = 62 + next() * 26 - Math.abs(k - 4) * 6;
      twig(c, 64, 126, 64 + Math.cos(a) * long, 124 + Math.sin(a) * long, 0.16 * Math.sign(k - 4 || 1), 2, (x, y, angle, t) => {
        if (t < 0.25) return;
        for (const side of [-1, 1]) leaf(c, x, y, angle + side * (0.8 + next() * 0.6) + 0.4 * Math.sign(4 - k || 1), 14 + next() * 5, 6.5 + next() * 2, 185 + next() * 70);
      }, 8);
    }
  },
  // A birch's hanging strands, drawn from where they hang, as the rest are drawn from their foot.
  (c, next) => {
    for (let k = 0; k < 5; k++) {
      const x = 26 + k * 19 + (next() - 0.5) * 8;
      twig(c, 64, 128, x + (next() - 0.5) * 16, 6 + next() * 20, (next() - 0.5) * 0.2, 1.6, (lx, ly, angle, t) => {
        for (const side of [-1, 1]) leaf(c, lx, ly, angle + side * 1.1, (9 + next() * 4) * (1.1 - t * 0.4), 4.5, 185 + next() * 70);
      }, 11);
    }
  },
  // A spruce's bough from the side: a stem, and along it narrow side shoots reaching forward, dense and dark,
  // each with a ragged fringe of tips: a soft layered spray, not every needle.
  (c, next) => {
    twig(c, 64, 128, 62, 6, 0.06, 3.5, (x, y, angle, t) => {
      for (const side of [-1, 1]) {
        const long = (1 - t * 0.6) * (34 + next() * 14);
        const a = angle + side * (0.75 + next() * 0.3);
        const shade = 140 + next() * 90;
        leaf(c, x, y, a, long, 5.5, shade);
        for (let k = 1; k <= 3; k++) {
          const r = long * k * 0.24;
          for (const s2 of [-1, 1]) leaf(c, x + Math.cos(a) * r, y + Math.sin(a) * r, a + s2 * 0.7, 10 - k, 2.6, shade * (0.85 + next() * 0.2));
        }
      }
    }, 16);
  },
  // A pine's tufts: round brushes of needles at the ends of short twigs, dense in the middle and ragged at the rim.
  (c, next) => {
    for (let k = 0; k < 7; k++) {
      const x = 24 + next() * 80;
      const y = 28 + next() * 64;
      twig(c, 64, 128, x, y, (next() - 0.5) * 0.3, 3, () => {}, 1);
      for (let blob = 0; blob < 3; blob++) {
        const [bx, by, r] = [x + (next() - 0.5) * 14, y + (next() - 0.5) * 10, 9 + next() * 8];
        const v = 160 + next() * 75;
        c.fillStyle = `rgb(${v},${v},${v})`;
        c.beginPath();
        for (let p = 0; p <= 34; p++) {
          const a = (p / 34) * Math.PI * 2;
          const out = r * (p % 2 ? 0.8 + next() * 0.1 : 0.95 + next() * 0.2);
          c.lineTo(bx + Math.cos(a) * out, by + Math.sin(a) * out * 0.8);
        }
        c.fill();
      }
    }
  },
  // A fern's frond: leaflets in pairs, shorter towards its tip, each notched into lobes.
  (c, next) => {
    twig(c, 64, 128, 64, 4, 0.05, 3, (x, y, angle, t) => {
      for (const side of [-1, 1]) {
        const long = (1 - t * 0.85) * 52 + 6;
        const a = angle + side * 1.25;
        for (let lobe = 0; lobe < 5; lobe++) {
          const r = (lobe / 5) * long;
          leaf(c, x + Math.cos(a) * r, y + Math.sin(a) * r, a + side * 0.15, long * 0.34, 5.6, 175 + next() * 80);
        }
        leaf(c, x, y, a, long, 3, 205 + next() * 50);
      }
    }, 14);
  },
  // One birch leaf by itself, for those that whirl up, toothed at its edge.
  (c, next) => {
    leaf(c, 64, 118, -Math.PI / 2 + 0.1, 100, 40, 235);
    c.fillStyle = 'rgba(120,120,120,0.5)';
    for (let k = 0; k < 7; k++) c.fillRect(62 + (next() - 0.5) * 2, 110 - k * 13, 3, 10);
  },
  // A birch's bark: white, with dark dashes across it and darker at its foot.
  (c, next) => {
    c.fillStyle = 'rgb(236,232,222)';
    c.fillRect(0, 0, S, S);
    for (let k = 0; k < 46; k++) {
      const v = 30 + next() * 50;
      c.fillStyle = `rgba(${v},${v},${v},${0.5 + next() * 0.45})`;
      c.fillRect(next() * S - 10, next() * (S - 20), 8 + next() * 26, 1.5 + next() * 3);
    }
    const foot = c.createLinearGradient(0, S - 26, 0, S);
    foot.addColorStop(0, 'rgba(60,56,50,0)');
    foot.addColorStop(1, 'rgba(60,56,50,0.85)');
    c.fillStyle = foot;
    c.fillRect(0, S - 26, S, 26);
  },
  // A pine's bark: grey plates low down, and thin and paler up the stem.
  (c, next) => {
    c.fillStyle = 'rgb(200,196,188)';
    c.fillRect(0, 0, S, S);
    for (let k = 0; k < 80; k++) {
      const y = next() * S;
      const v = 90 + next() * 60 + (S - y) * 0.6;
      c.fillStyle = `rgba(${v},${v * 0.96},${v * 0.9},0.6)`;
      c.fillRect(next() * S - 6, y, 10 + next() * 18, 3 + next() * 9 * (y / S));
    }
  },
];

let atlas: CanvasTexture | null = null;
/** The flora's one picture, made once and shared by every view: soft, as everything drawn small is. */
export function leafAtlas(): CanvasTexture {
  if (atlas) return atlas;
  atlas = drawn(S * 4, S * 2, (c) => {
    c.lineCap = 'round';
    for (const [i, draw] of DRAW.entries()) {
      c.save();
      c.translate((i % 4) * S, i < 4 ? 0 : S);
      c.beginPath();
      c.rect(0, 0, S, S);
      c.clip();
      draw(c, sequence(i * 13 + 5));
      c.restore();
    }
  });
  return atlas;
}

// --- cards ------------------------------------------------------------------------------------------------------

/**
 * A shape made of cards that face the camera, as everything behind the path is seen: from the front, along -z.
 * Each card grows from its foot along an angle in the picture's plane (0 is to the right, π/2 up), turned a
 * little about that line for depth. Its normal leans out from the middle of the shape, so that a crown is lit
 * as one round thing and not as many flat ones; its colour is darker towards the inside and the foot.
 */
export class Cards {
  readonly position: number[] = [];
  readonly normal: number[] = [];
  readonly uv: number[] = [];
  readonly colour: number[] = [];
  readonly index: number[] = [];
  constructor(readonly middle = new Vector3(), readonly round = new Vector3(1, 1, 1)) {}

  card(foot: readonly [number, number, number], angle: number, long: number, wide: number, cell: Cell, tint: Color, yaw = 0, bend = 0): void {
    const steps = bend === 0 ? 1 : 3;
    const [u0, v0, du, dv] = cellUv(cell);
    let [x, y, z] = foot;
    const first = this.position.length / 3;
    for (let k = 0; k <= steps; k++) {
      const a = angle - bend * (k / steps);
      const side = [-Math.sin(a) * Math.cos(yaw), Math.cos(a) * Math.cos(yaw), Math.sin(yaw)];
      for (const s of [-1, 1]) {
        const p = [x + side[0]! * s * wide / 2, y + side[1]! * s * wide / 2, z + side[2]! * s * wide / 2];
        this.position.push(p[0]!, p[1]!, p[2]!);
        const out = new Vector3((p[0]! - this.middle.x) / this.round.x, (p[1]! - this.middle.y) / this.round.y, (p[2]! - this.middle.z) / this.round.z);
        const depth = Math.min(1, out.length());
        out.normalize().multiplyScalar(0.7).add(new Vector3(0, 0, 0.55)).normalize();
        this.normal.push(out.x, out.y, out.z);
        this.uv.push(u0 + (s < 0 ? 0 : du), v0 + dv * (k / steps));
        const shade = 0.55 + 0.45 * depth;
        this.colour.push(tint.r * shade, tint.g * shade, tint.b * shade);
      }
      if (k < steps) {
        const i = first + k * 2;
        this.index.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
      }
      x += Math.cos(a) * long / steps;
      y += Math.sin(a) * long / steps;
    }
  }

  /** A stem as a few sides of a cylinder, from one height to another, tapering, in a bark of the atlas. */
  stem(x: number, z: number, from: number, to: number, r0: number, r1: number, cell: Cell, tint: Color, lean = 0): void {
    const [u0, v0, du, dv] = cellUv(cell);
    const first = this.position.length / 3;
    const rows = 4;
    for (let k = 0; k <= rows; k++) {
      const t = k / rows;
      const r = r0 + (r1 - r0) * t;
      const y = from + (to - from) * t;
      for (let j = 0; j <= 6; j++) {
        // Only its front half: the back of a stem is never seen.
        const a = (j / 6) * Math.PI;
        this.position.push(x + Math.cos(a) * r + lean * t * t, y, z + Math.sin(a) * r);
        this.normal.push(Math.cos(a), 0, Math.sin(a));
        this.uv.push(u0 + du * (j / 6), v0 + dv * t);
        this.colour.push(tint.r, tint.g, tint.b);
        if (k < rows && j < 6) {
          const i = first + k * 7 + j;
          this.index.push(i, i + 7, i + 1, i + 1, i + 7, i + 8);
        }
      }
    }
  }

  /** The shape, scaled by `by` (a tree is built in EL and kept 1 high, for the wind's sway by height). */
  build(by = 1): BufferGeometry {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(this.position.map((v) => v * by), 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(this.normal, 3));
    geometry.setAttribute('uv', new Float32BufferAttribute(this.uv, 2));
    geometry.setAttribute('color', new Float32BufferAttribute(this.colour, 3));
    geometry.setIndex(this.index);
    return geometry;
  }
}
