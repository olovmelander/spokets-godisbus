import { CanvasTexture, ClampToEdgeWrapping, Group, Mesh, MeshBasicMaterial, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three';
import type { PlaceId } from '../sim/types';

/**
 * The far scenery of a place (art bible §2.2, L1): what lies behind the mid-ground, as a handful of pictures
 * that hang one behind the other and pass at their own speeds when he runs. That is the parallax.
 *
 * Each picture is drawn in code on a small canvas, blurred, and stretched over a wide card: far things are
 * soft, and their haze is painted in. A card goes with the camera, and its picture slides across it: a layer
 * that holds 1 of his way stands still in the world, and one that holds 0.1 is nearly as far away as the sky.
 * Nothing is made after the start, and sliding a picture changes no shader.
 */
interface Layer {
  /** Where its card hangs, behind the play plane. */
  z: number;
  /** How much of the camera's way it stays behind: 1 stands in the world, 0 goes with the camera. */
  hold: number;
  /** How much of his climb it sinks by, as nearer hills do under farther ones. */
  sink: number;
  /** How wide one picture is, in EL. It is half as tall, so a pixel is square. */
  every: number;
  /** The row of the picture that lies at the height of his eyes, counted from its top. */
  eye: number;
  /** How soft it is: each step doubles the blur. */
  soft: number;
  /** Clouds drift: EL a second. */
  drift?: number;
  draw(c: Pen): void;
}

type Pen = CanvasRenderingContext2D;
type Ink = readonly [number, number, number];

/** A picture's size, and the margin that is drawn round it so that the blur joins where the picture repeats. */
const W = 512;
const H = 256;
const MARGIN = 64;
/** How far above the ground he stands on the pictures' horizon lies. */
const EYE = 1.4;
/** How far a card reaches down below the horizon: its picture's foot goes on to there. */
const DEEP = 240;

const ink = (c: Ink, alpha = 1) => `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
const mix = (a: Ink, b: Ink, t: number): Ink => [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];

/** A fixed sequence of numbers from 0 to 1: the same scenery in every session and every screenshot. */
function sequence(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sheet(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * A layer's picture. It is drawn with a margin, made soft by halving it and doubling it again (which every
 * browser can do), and cut to size. Its top row is clear and its bottom row is its foot: the card repeats
 * those two rows above and below the picture.
 */
function picture(soft: number, draw: (c: Pen) => void): CanvasTexture {
  let image = sheet(W + MARGIN * 2, H);
  const pen = image.getContext('2d')!;
  pen.translate(MARGIN, 0);
  draw(pen);
  const scaled = (from: HTMLCanvasElement, width: number, height: number) => {
    const to = sheet(width, height);
    const c = to.getContext('2d')!;
    c.imageSmoothingEnabled = true;
    c.drawImage(from, 0, 0, width, height);
    return to;
  };
  for (let i = 0; i < soft; i++) image = scaled(image, image.width / 2, image.height / 2);
  for (let i = 0; i < soft; i++) image = scaled(image, image.width * 2, image.height * 2);
  const out = sheet(W, H);
  const c = out.getContext('2d')!;
  c.drawImage(image, -MARGIN, 0);
  // No hard edge: the top fades to nothing.
  c.globalCompositeOperation = 'destination-in';
  const fade = c.createLinearGradient(0, 0, 0, H);
  fade.addColorStop(0, 'rgba(0,0,0,0)');
  fade.addColorStop(0.012, 'rgba(0,0,0,0)');
  fade.addColorStop(0.11, 'rgba(0,0,0,1)');
  fade.addColorStop(1, 'rgba(0,0,0,1)');
  c.fillStyle = fade;
  c.fillRect(0, 0, W, H);
  const texture = new CanvasTexture(out);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  return texture;
}

// --- what the pictures are drawn with ---------------------------------------------------------------------

/** Paints a thing three times, a picture's width apart, so that the picture joins itself where it repeats. */
function around(x: number, paint: (x: number) => void): void {
  // A copy that lies wholly outside the picture and its margin is not painted: nothing is wider than this.
  for (const shift of [-W, 0, W]) if (x + shift > -MARGIN - 130 && x + shift < W + MARGIN + 130) paint(x + shift);
}

/** A number from 0 to 1 for a column of the picture, the same a picture's width on. */
function tooth(x: number, seed: number): number {
  const s = Math.sin((((x % W) + W) % W) * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** How high a line of hills stands at x: a few waves that fit the picture's width a whole number of times. */
function crest(x: number, waves: readonly number[], shift: number): number {
  let up = 0;
  for (const [i, w] of waves.entries()) up += Math.sin((x / W) * Math.PI * 2 * w + shift + i * 1.9) / (i + 1);
  return 0.5 + 0.35 * up;
}

/**
 * A line of hills, filled down to the picture's foot: its own colour at the crest, and the haze's further
 * down, where the valley is. `teeth` makes the crest ragged, as a forest's edge is.
 */
function hills(c: Pen, base: number, tall: number, waves: readonly number[], shift: number, colour: Ink, haze: Ink, teeth = 0, depth = 70): void {
  const down = c.createLinearGradient(0, base - tall, 0, base + depth);
  down.addColorStop(0, ink(colour));
  down.addColorStop(1, ink(haze));
  c.fillStyle = down;
  c.beginPath();
  c.moveTo(-MARGIN, H);
  for (let x = -MARGIN; x <= W + MARGIN; x += 2) c.lineTo(x, base - tall * crest(x, waves, shift) - teeth * tooth(x, shift));
  c.lineTo(W + MARGIN, H);
  c.fill();
}

/** A band of mist or light across the picture: nothing at its edges, the most in its middle. */
function band(c: Pen, from: number, to: number, colour: Ink, alpha: number): void {
  const down = c.createLinearGradient(0, from, 0, to);
  down.addColorStop(0, ink(colour, 0));
  down.addColorStop(0.5, ink(colour, alpha));
  down.addColorStop(1, ink(colour, 0));
  c.fillStyle = down;
  c.fillRect(-MARGIN, from, W + MARGIN * 2, to - from);
}

/** The ground far away: from a row down to the picture's foot. */
function floor(c: Pen, from: number, colour: Ink, foot: Ink): void {
  const down = c.createLinearGradient(0, from, 0, H);
  down.addColorStop(0, ink(colour, 0));
  down.addColorStop(0.12, ink(colour));
  down.addColorStop(1, ink(foot));
  c.fillStyle = down;
  c.fillRect(-MARGIN, from, W + MARGIN * 2, H - from);
}

/** A spruce as it stands against the light: a spire in tiers of drooping branches. */
function spruce(c: Pen, x: number, foot: number, tall: number, colour: Ink): void {
  c.fillStyle = ink(colour);
  const wide = tall * 0.27;
  around(x, (at) => {
    for (let i = 0; i < 6; i++) {
      const base = foot - tall * (1 - (i + 1) / 6);
      c.beginPath();
      c.moveTo(at, foot - tall * (1 - i / 6) - tall * 0.09);
      c.lineTo(at + wide * (0.3 + 0.7 * ((i + 1) / 6)), base);
      c.lineTo(at - wide * (0.3 + 0.7 * ((i + 1) / 6)), base);
      c.fill();
    }
  });
}

/** A pine: a bare stem, and a flat crown at its top. */
function pine(c: Pen, x: number, foot: number, tall: number, colour: Ink, crown: Ink): void {
  around(x, (at) => {
    c.fillStyle = ink(colour);
    c.fillRect(at - tall * 0.03, foot - tall * 0.9, tall * 0.06, tall * 0.9);
    c.fillStyle = ink(crown);
    for (const [dx, dy, rx, ry] of [[0.01, 0.93, 0.19, 0.055], [-0.13, 0.86, 0.13, 0.045], [0.14, 0.85, 0.12, 0.045], [-0.02, 0.8, 0.11, 0.04], [0.1, 0.74, 0.08, 0.035]] as const) {
      c.beginPath();
      c.ellipse(at + dx * tall, foot - dy * tall, rx * tall, ry * tall, 0, 0, Math.PI * 2);
      c.fill();
    }
  });
}

/** A soft round thing: a leaf mass, a shrub, a part of a cloud, a spot of light. */
function blob(c: Pen, x: number, y: number, rx: number, ry: number, colour: Ink, alpha: number, core = 0.2): void {
  around(x, (at) => {
    c.save();
    c.translate(at, y);
    c.scale(1, ry / rx);
    const round = c.createRadialGradient(0, 0, rx * core, 0, 0, rx);
    round.addColorStop(0, ink(colour, alpha));
    round.addColorStop(1, ink(colour, 0));
    c.fillStyle = round;
    c.fillRect(-rx, -rx, rx * 2, rx * 2);
    c.restore();
  });
}

/** A cloud: a heap of soft rounds on a level foot, lit from above and shaded below. */
function cloud(c: Pen, next: () => number, x: number, y: number, wide: number, tall: number, light: Ink, shade: Ink, alpha: number): void {
  const puffs = 5 + Math.floor(next() * 4);
  blob(c, x, y + tall * 0.2, wide * 0.6, tall * 0.42, shade, alpha * 0.8, 0.3);
  for (let i = 0; i < puffs; i++) {
    const along = (i + 0.5) / puffs - 0.5;
    const r = tall * (0.5 + next() * 0.4) * (1 - Math.abs(along) * 1.1);
    blob(c, x + along * wide, y - r * 0.45, r * 1.5, r, light, alpha, 0.35);
  }
}

/** A sky of clouds: big ones low and far apart, small ones between them. */
function clouds(c: Pen, seed: number, eye: number, count: number, light: Ink, shade: Ink, alpha: number, flat = 1): void {
  const next = sequence(seed);
  for (let i = 0; i < count; i++) {
    const x = ((i + next() * 0.7) / count) * W;
    const wide = 44 + next() * 66;
    cloud(c, next, x, eye - 14 - next() * 80, wide, (wide * (0.2 + next() * 0.12)) / flat, light, shade, alpha * (0.7 + next() * 0.3));
  }
}

/** Tall soft columns: trunks far out of focus. */
function trunks(c: Pen, next: () => number, count: number, thin: number, thick: number, colour: Ink, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const x = ((i + 0.15 + next() * 0.7) / count) * W;
    const w = thin + next() * (thick - thin);
    around(x, (at) => {
      const across = c.createLinearGradient(at - w, 0, at + w, 0);
      across.addColorStop(0, ink(colour, 0));
      across.addColorStop(0.36, ink(colour, alpha));
      across.addColorStop(0.64, ink(colour, alpha));
      across.addColorStop(1, ink(colour, 0));
      c.fillStyle = across;
      c.fillRect(at - w, 0, w * 2, H);
    });
  }
}

/** Round spots of light, as a lens draws what shines far out of focus. */
function spots(c: Pen, next: () => number, count: number, from: number, to: number, small: number, big: number, colour: Ink, alpha: number): void {
  for (let i = 0; i < count; i++) {
    const r = small + next() * (big - small);
    blob(c, next() * W, from + next() * (to - from), r, r, colour, alpha * (0.5 + next() * 0.5), 0.6);
  }
}

// --- the forest ---------------------------------------------------------------------------------------------

/**
 * One depth of the spruce forest seen from the moss: trunks as columns, young spruces at their feet, boughs
 * hanging in from above, and the light between them. The further in, the thinner, the paler and the more.
 */
function forestLayer(seed: number, z: number, hold: number, every: number, soft: number, wood: Ink, alpha: number, count: number, thin: number, thick: number, young: number): Layer {
  const eye = 150;
  const mist: Ink = [196, 212, 160];
  // Further in, things are smaller as well as paler.
  const size = (64 / every) * (0.45 + 0.55 * hold);
  return {
    z, hold, every, eye, soft, sink: 0.3 * hold,
    draw(c) {
      const next = sequence(seed);
      const green = mix(wood, [58, 96, 58], 0.45);
      // Boughs: they hang in from above, heavier towards the top.
      for (let i = 0; i < count * 3; i++) {
        const r = (18 + next() * 30) * size;
        blob(c, next() * W, next() ** 1.8 * (eye - 70 * size), r * 1.7, r * 0.7, green, alpha * 0.75, 0.25);
      }
      trunks(c, next, count, thin, thick, wood, alpha);
      // Young spruces, and what grows at the trunks' feet.
      for (let i = 0; i < young; i++) spruce(c, next() * W, eye + 8, (34 + next() * 60) * size, mix(green, mist, 0.25 + (1 - alpha) * 0.5));
      for (let i = 0; i < young * 3; i++) {
        const r = (10 + next() * 16) * size;
        blob(c, next() * W, eye + 6 - next() * 6, r * 1.6, r, green, alpha * 0.8, 0.3);
      }
      floor(c, eye + 2, mix(green, mist, 0.5), mix(green, mist, 0.3));
      // The haze lies low between the trunks, and the sun comes through it as round spots.
      band(c, eye - 46 * size - 20, eye + 22, mist, 0.2 + (1 - alpha) * 0.5);
      spots(c, next, Math.round(10 + count * 0.8), 20, eye - 10, 3 + 2 * size, 5 + 7 * size, [255, 248, 206], 0.42);
    },
  };
}

const FOREST: Layer[] = [
  forestLayer(11, -78, 0.26, 160, 2, [146, 176, 158], 0.42, 24, 1.6, 3.6, 12),
  forestLayer(17, -62, 0.46, 120, 2, [108, 144, 138], 0.52, 15, 4, 8, 9),
  forestLayer(23, -46, 0.7, 90, 1, [72, 106, 100], 0.66, 10, 6, 12, 6),
  forestLayer(29, -32, 1, 64, 1, [44, 74, 70], 0.8, 6, 10, 20, 4),
];

// --- the garden ---------------------------------------------------------------------------------------------

const GARDEN_HAZE: Ink = [214, 232, 236];

const GARDEN: Layer[] = [
  // The sky's clouds: white, and slow.
  { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 2, drift: 0.45, draw: (c) => clouds(c, 3, 200, 7, [255, 255, 255], [196, 210, 226], 0.85) },
  // The hills beyond the village: forest, blue with distance.
  {
    z: -76, hold: 0.24, sink: 0.02, every: 200, eye: 190, soft: 2,
    draw(c) {
      hills(c, 190, 32, [1, 3], 0.4, [146, 176, 198], GARDEN_HAZE, 0, 30);
      hills(c, 194, 22, [2, 5], 2.1, [128, 164, 172], GARDEN_HAZE, 2.5, 26);
      floor(c, 186, [196, 220, 200], [190, 216, 180]);
    },
  },
  // The edge of the forest, the neighbours' roofs in front of it, and the meadow.
  {
    z: -62, hold: 0.44, sink: 0.04, every: 140, eye: 190, soft: 1,
    draw(c) {
      const next = sequence(41);
      const far: Ink = [118, 156, 138];
      for (let i = 0; i < 46; i++) spruce(c, next() * W, 194, 22 + next() * 26, mix(far, GARDEN_HAZE, next() * 0.25));
      for (let i = 0; i < 16; i++) blob(c, next() * W, 180 - next() * 10, 14 + next() * 10, 12 + next() * 8, [150, 180, 120], 0.9, 0.5);
      // A house is a pale wall under a grey roof: no window, no door, nothing to read.
      for (const [x, wide, tall] of [[96, 44, 17], [318, 34, 14], [372, 22, 11]] as const) {
        around(x, (at) => {
          c.fillStyle = ink([232, 222, 200]);
          c.fillRect(at - wide / 2, 190 - tall, wide, tall + 4);
          c.fillStyle = ink([124, 128, 138]);
          c.beginPath();
          c.moveTo(at - wide / 2 - 3, 190 - tall);
          c.lineTo(at - wide / 4, 190 - tall - wide * 0.3);
          c.lineTo(at + wide / 4, 190 - tall - wide * 0.3);
          c.lineTo(at + wide / 2 + 3, 190 - tall);
          c.fill();
        });
      }
      floor(c, 186, [176, 206, 132], [150, 190, 110]);
      band(c, 150, 200, GARDEN_HAZE, 0.5);
    },
  },
  // Birches in their first yellow, over the hedge.
  {
    z: -46, hold: 0.7, sink: 0.07, every: 96, eye: 180, soft: 1,
    draw(c) {
      const next = sequence(47);
      for (const x of [58, 170, 236, 388, 470]) {
        const lean = (next() - 0.5) * 16;
        around(x, (at) => {
          c.strokeStyle = ink([238, 234, 222]);
          c.lineWidth = 4 + next() * 3;
          c.beginPath();
          c.moveTo(at, 186);
          c.quadraticCurveTo(at + lean * 0.3, 110, at + lean, 20);
          c.stroke();
        });
        for (let i = 0; i < 22; i++) {
          const leaf: Ink = next() < 0.35 ? [212, 202, 120] : next() < 0.5 ? [172, 194, 112] : [140, 176, 104];
          const r = 8 + next() * 11;
          blob(c, x + lean + (next() - 0.5) * 70, 50 + next() ** 1.3 * 84, r * 1.2, r, leaf, 0.7, 0.35);
        }
      }
      // The hedge: dark, with the sun on its top.
      hills(c, 180, 22, [3, 7, 11], 0.9, [112, 152, 84], [58, 102, 58], 4, -4);
      floor(c, 182, [70, 116, 60], [84, 130, 62]);
      band(c, 132, 190, GARDEN_HAZE, 0.3);
    },
  },
  // The garden's own leaves, far out of focus: shrubs below, and branches that hang in from above.
  {
    z: -32, hold: 1, sink: 0.1, every: 64, eye: 172, soft: 1,
    draw(c) {
      const next = sequence(53);
      const leaves: Ink[] = [[78, 128, 66], [104, 150, 70], [136, 172, 84], [198, 188, 96]];
      for (let i = 0; i < 44; i++) {
        const r = 12 + next() * 20;
        const x = next() * W;
        // Shrubs stand in groups, with open lawn between them.
        const here = crest(x, [2, 3], 4.2);
        if (here < 0.42) continue;
        blob(c, x, 176 - next() * 54 * here, r * 1.3, r, leaves[Math.floor(next() * leaves.length)]!, 0.62, 0.3);
      }
      for (let i = 0; i < 30; i++) {
        const r = 12 + next() * 18;
        const x = next() * W;
        const here = crest(x, [1, 2], 1.1);
        if (here < 0.55) continue;
        blob(c, x, 40 + next() * 60 * here, r * 1.4, r, leaves[Math.floor(next() * leaves.length)]!, 0.5, 0.3);
      }
      floor(c, 174, [96, 146, 62], [84, 134, 58]);
      spots(c, next, 14, 20, 150, 3, 8, [255, 250, 214], 0.4);
    },
  },
];

// --- the bog ------------------------------------------------------------------------------------------------

const BOG_MIST: Ink = [246, 236, 212];

const BOG: Layer[] = [
  // Late afternoon clouds, warm where the low sun reaches them.
  { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 2, drift: 0.35, draw: (c) => clouds(c, 5, 200, 6, [255, 240, 212], [176, 172, 186], 0.7, 1.3) },
  // The mountain, in mist: where the trail goes.
  {
    z: -78, hold: 0.2, sink: 0.02, every: 200, eye: 190, soft: 2,
    draw(c) {
      hills(c, 198, 58, [1, 2], 0.6, [126, 140, 172], BOG_MIST, 0, 4);
      hills(c, 198, 24, [2, 3], 2.6, [146, 156, 178], BOG_MIST, 0, 8);
      band(c, 166, 208, BOG_MIST, 0.6);
      floor(c, 188, BOG_MIST, [224, 212, 184]);
    },
  },
  // Low hills of forest.
  {
    z: -64, hold: 0.38, sink: 0.04, every: 170, eye: 190, soft: 1,
    draw(c) {
      hills(c, 194, 28, [2, 3, 7], 1.3, [104, 122, 126], BOG_MIST, 3.5, 14);
      band(c, 172, 206, BOG_MIST, 0.55);
      floor(c, 188, [226, 214, 186], [214, 198, 160]);
    },
  },
  // The forest's edge across the bog.
  {
    z: -50, hold: 0.62, sink: 0.07, every: 120, eye: 190, soft: 1,
    draw(c) {
      const next = sequence(83);
      const far: Ink = [86, 106, 96];
      for (let i = 0; i < 54; i++) spruce(c, next() * W, 194, 16 + next() * 26, mix(far, BOG_MIST, next() * 0.3));
      for (let i = 0; i < 9; i++) pine(c, next() * W, 194, 24 + next() * 18, [112, 112, 104], mix(far, BOG_MIST, 0.2));
      band(c, 172, 208, BOG_MIST, 0.55);
      floor(c, 190, [204, 186, 138], [188, 164, 112]);
    },
  },
  // The nearest spruces and bog pines, dark against the mist.
  {
    z: -34, hold: 1, sink: 0.1, every: 84, eye: 190, soft: 1,
    draw(c) {
      const next = sequence(89);
      const near: Ink = [82, 98, 88];
      for (let i = 0; i < 9; i++) spruce(c, next() * W, 196, 38 + next() * 44, mix(near, BOG_MIST, next() * 0.25));
      for (let i = 0; i < 4; i++) pine(c, next() * W, 196, 40 + next() * 30, [104, 98, 90], mix(near, [100, 112, 76], 0.4));
      // Dead pines: grey and bare.
      for (let i = 0; i < 4; i++) {
        const x = next() * W;
        const tall = 26 + next() * 26;
        around(x, (at) => {
          c.strokeStyle = ink([150, 148, 140]);
          c.lineWidth = 2;
          c.beginPath();
          c.moveTo(at, 196);
          c.lineTo(at + 3, 196 - tall);
          c.moveTo(at + 1.5, 196 - tall * 0.6);
          c.lineTo(at + 9, 196 - tall * 0.78);
          c.stroke();
        });
      }
      band(c, 176, 210, BOG_MIST, 0.5);
      floor(c, 192, [176, 150, 96], [150, 118, 74]);
    },
  },
];

// --- the mountain, and the same mountain at dusk ---------------------------------------------------------------

interface Fell {
  haze: Ink;
  /** The ridges, from the farthest to the nearest. */
  ridge: readonly [Ink, Ink, Ink, Ink];
  cloud: { light: Ink; shade: Ink; alpha: number };
  /** Windows in the valley, lit when it is dark. */
  lights: boolean;
}

function fell(look: Fell): Layer[] {
  return [
    { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 2, drift: 0.3, draw: (c) => clouds(c, 7, 200, 6, look.cloud.light, look.cloud.shade, look.cloud.alpha, 2.2) },
    // The farthest ridges, nearly the sky's colour.
    {
      z: -78, hold: 0.2, sink: 0.02, every: 200, eye: 170, soft: 1,
      draw(c) {
        hills(c, 172, 44, [1, 3, 7], 0.3, look.ridge[0], look.haze, 0, 40);
        hills(c, 180, 34, [2, 3, 5], 1.7, mix(look.ridge[0], look.ridge[1], 0.5), look.haze, 0, 40);
      },
    },
    {
      z: -64, hold: 0.38, sink: 0.05, every: 190, eye: 170, soft: 1,
      draw(c) {
        hills(c, 184, 42, [1, 2, 5], 2.9, look.ridge[1], look.haze, 1.5, 50);
        band(c, 186, 256, look.haze, 0.4);
      },
    },
    // A forested ridge, and the valley under it filled with haze.
    {
      z: -50, hold: 0.62, sink: 0.09, every: 140, eye: 170, soft: 1,
      draw(c) {
        hills(c, 190, 38, [1, 3, 4], 4.4, look.ridge[2], look.haze, 3.5, 56);
        if (look.lights) {
          const next = sequence(97);
          for (let i = 0; i < 9; i++) {
            const x = 150 + (next() - 0.5) * 120;
            blob(c, x, 236 + next() * 12, 2.2, 2.2, [255, 214, 140], 0.9, 0.4);
          }
        }
        band(c, 200, 290, look.haze, 0.4);
      },
    },
    // The nearest slope, with the tops of its spruces.
    {
      z: -36, hold: 1, sink: 0.14, every: 100, eye: 170, soft: 1,
      draw(c) {
        const next = sequence(101);
        const base = 196;
        for (let i = 0; i < 16; i++) {
          const x = next() * W;
          spruce(c, x, base - 38 * crest(x, [1, 2, 4], 2.4) + 8, 26 + next() * 22, look.ridge[3]);
        }
        hills(c, base, 38, [1, 2, 4], 2.4, look.ridge[3], mix(look.ridge[3], look.haze, 0.45), 3, 60);
      },
    },
  ];
}

/** The golden hour: blue-violet ridges under a pink-orange sky. */
const MOUNTAIN = fell({
  haze: [240, 190, 164],
  ridge: [[158, 138, 190], [132, 112, 168], [104, 90, 142], [76, 66, 106]],
  cloud: { light: [255, 214, 184], shade: [176, 140, 176], alpha: 0.75 },
  lights: false,
});

/** The blue hour: the same ridges, dark, and the first windows lit far below. */
const DUSK = fell({
  haze: [62, 74, 122],
  ridge: [[52, 64, 116], [40, 50, 98], [30, 38, 80], [20, 26, 58]],
  cloud: { light: [96, 100, 150], shade: [40, 48, 92], alpha: 0.5 },
  lights: true,
});

/**
 * What a window at home shows in the morning: the garden's far scenery as one small picture under its sky,
 * as soft as it is outdoors. It does not move: the room is the picture's business here.
 */
export function outlook(): CanvasTexture {
  return picture(1, (c) => {
    const sky = c.createLinearGradient(0, 0, 0, 200);
    sky.addColorStop(0, ink([111, 169, 216]));
    sky.addColorStop(1, ink([226, 240, 244]));
    c.fillStyle = sky;
    c.fillRect(-MARGIN, 0, W + MARGIN * 2, H);
    for (const layer of GARDEN) layer.draw(c);
  });
}

/**
 * A window's pane, cut from the outlook: each window shows its own part of it, below the picture's clear
 * top and above its foot.
 */
export function outlookPane(wide: number, tall: number, index: number): PlaneGeometry {
  const geometry = new PlaneGeometry(wide, tall);
  const uv = geometry.getAttribute('uv');
  const across = (0.56 * H * wide) / (tall * W);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, 0.12 + index * 0.37 + uv.getX(i) * across, 0.3 + uv.getY(i) * 0.56);
  return geometry;
}

/** Every place's far layers, from the farthest to the nearest. Indoors there is nothing far away. */
/**
 * The village has the garden's sky and its far hills. What stands between them and the street, the far
 * village with its red roofs, is drawn with the street's houses (village.ts).
 */
const VILLAGE = GARDEN.slice(0, 2);

const LAYERS: Record<PlaceId, Layer[]> = { forest: FOREST, garden: GARDEN, bog: BOG, mountain: MOUNTAIN, dusk: DUSK, home: [], village: VILLAGE };

/** Where a place's far layers hang and how they pass, from the farthest to the nearest. Each is one draw call. */
export const farLayers = (place: PlaceId): { z: number; hold: number; sink: number; drift: number }[] =>
  LAYERS[place].map(({ z, hold, sink, drift }) => ({ z, hold, sink, drift: drift ?? 0 }));

export interface Scenery {
  group: Group;
  /** Where the camera looks, the ground he stands on, and the time. */
  update(cameraX: number, groundY: number, clock: number): void;
}

/**
 * Builds a place's far scenery. `anchor` is the height the chapter starts at: above it the nearer layers
 * sink a little under the farther ones, and below it they rise.
 */
export function scenery(place: PlaceId, anchor: number): Scenery {
  const group = new Group();
  const cards = LAYERS[place].map((layer) => {
    const map = picture(layer.soft, layer.draw);
    const tall = layer.every / 2;
    const below = tall * (1 - layer.eye / H);
    // Wide enough for the widest picture at its depth, and deep enough for any climb. It ends where the
    // picture's clear top is: nothing is drawn above that.
    const geometry = new PlaneGeometry((40 - layer.z) * 1.4, DEEP + tall - below).translate(0, (tall - below - DEEP) / 2, 0);
    const at = geometry.getAttribute('position');
    const uv = geometry.getAttribute('uv');
    for (let i = 0; i < at.count; i++) uv.setXY(i, at.getX(i) / layer.every, (at.getY(i) + below) / tall);
    const card = new Mesh(geometry, new MeshBasicMaterial({ map, transparent: true, fog: false, depthWrite: false }));
    card.position.z = layer.z;
    card.renderOrder = -3;
    // It goes with the camera, so it is always in the picture.
    card.frustumCulled = false;
    group.add(card);
    return { layer, card, map };
  });
  return {
    group,
    update(cameraX, groundY, clock) {
      for (const { layer, card, map } of cards) {
        const sunk = Math.max(-5, Math.min(5, (groundY - anchor) * layer.sink));
        card.position.set(cameraX, groundY + EYE - sunk, layer.z);
        const along = (cameraX * layer.hold + clock * (layer.drift ?? 0)) / layer.every;
        map.offset.x = along - Math.floor(along);
      }
    },
  };
}
