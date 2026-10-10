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

/** How high a line stands at x, from 0 to 1. */
type Shape = (x: number) => number;

/**
 * A hill's back: a soft line through points, each a place along the picture and a height (both from 0 to 1,
 * in order along the picture). It joins itself a picture's width on. The hills of Ångermanland are long
 * backs with a knob, not waves, so they are drawn by hand.
 */
export function back(points: readonly (readonly [number, number])[], wide = W): Shape {
  const n = points.length;
  const point = (i: number): readonly [number, number] => {
    const p = points[((i % n) + n) % n]!;
    return [p[0] + Math.floor(i / n), p[1]];
  };
  return (x) => {
    const u = (((x / wide) % 1) + 1) % 1;
    let i = 0;
    while (i < n && points[i]![0] <= u) i++;
    const [x0, y0] = point(i - 2);
    const [x1, y1] = point(i - 1);
    const [x2, y2] = point(i);
    const [x3, y3] = point(i + 1);
    const t = (u - x1) / (x2 - x1);
    // The slope at a point is the slope between its neighbours.
    const m1 = ((y2 - y0) / (x2 - x0)) * (x2 - x1);
    const m2 = ((y3 - y1) / (x3 - x1)) * (x2 - x1);
    return (2 * t ** 3 - 3 * t * t + 1) * y1 + (t ** 3 - 2 * t * t + t) * m1 + (3 * t * t - 2 * t ** 3) * y2 + (t ** 3 - t * t) * m2;
  };
}

/**
 * A ridge of forest, filled down to the picture's foot: its own colour at the crest, and the haze's further
 * down, where the valley is. Its skyline is spruce tops: `tips` is how tall the tallest stand, in texels, a
 * few texels apart. `top` is the row of its highest point and `tall` how far its lowest lies under that.
 * `roof` leaves it open below: a wood's crowns, with air and stems under them.
 */
function ridge(c: Pen, top: number, tall: number, shape: Shape, colour: Ink, haze: Ink, tips = 0, depth = 40, seed = 7, roof = false): void {
  const down = c.createLinearGradient(0, top, 0, top + tall + depth);
  down.addColorStop(0, ink(colour));
  down.addColorStop(roof ? 0.5 : 1, ink(haze));
  if (roof) down.addColorStop(1, ink(haze, 0));
  c.fillStyle = down;
  const row = (x: number) => top + tall * (1 - shape(x));
  c.beginPath();
  c.moveTo(-MARGIN, H);
  if (tips <= 0) {
    for (let x = -MARGIN; x <= W + MARGIN; x += 2) c.lineTo(x, row(x));
  } else {
    // The same tops a picture's width on.
    const next = sequence(seed);
    const tops: [number, number, number][] = [];
    // Most are low and a few stand tall, at uneven steps: a comb of even teeth is a fence, not a forest.
    for (let x = 0; x < W - 2; x += 2 + next() * 3.5) tops.push([x, tips * next() ** 1.7, 0.8 + next() * 0.7]);
    for (const shift of [-W, 0, W]) {
      for (const [x, high, half] of tops) {
        const at = x + shift;
        if (at < -MARGIN - 4 || at > W + MARGIN + 4) continue;
        c.lineTo(at - half, row(at - half));
        c.lineTo(at, row(at) - high);
        c.lineTo(at + half, row(at + half));
      }
    }
  }
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

/**
 * A tree is drawn standing on its foot, a little out of plumb, and the same in each of its copies: its
 * numbers come from where it stands and how tall it is, so no two in a picture have the same outline.
 */
function standing(c: Pen, x: number, foot: number, tall: number, lean: number, paint: (next: () => number) => void): void {
  around(x, (at) => {
    const next = sequence(Math.round(x * 13 + tall * 7 + foot * 3));
    c.save();
    c.translate(at, foot);
    c.rotate((next() - 0.5) * lean);
    paint(next);
    c.restore();
  });
}

/**
 * A Norrland spruce against the light: a narrow spire, a quarter as wide as it is tall, in tiers of boughs
 * that end lower than they begin. A bough is missing here and there, and one top in ten is broken.
 * `girth` widens it: seen from above, down a slope, only a spruce's top shows, and that is a cone.
 */
function spruce(c: Pen, x: number, foot: number, tall: number, colour: Ink, girth = 1): void {
  standing(c, x, foot, tall, 0.07, (next) => {
    // A small one keeps some body: under four texels wide the blur takes it.
    const half = Math.max(2.2, tall * (0.11 + next() * 0.03) * girth);
    const broken = next() < 0.1 ? 0.1 + next() * 0.08 : 0;
    const tiers = Math.max(6, Math.min(16, Math.round(tall / 4.2)));
    // The stem shows under the lowest boughs.
    const bare = 0.03 + next() * 0.05;
    const pitch = (tall * (1 - bare)) / tiers;
    const stem = Math.max(1.5, tall * 0.034);
    c.fillStyle = ink(colour);
    c.fillRect(-stem / 2, -tall * (1 - broken), stem, tall * (1 - broken));
    for (let i = 0; i < tiers; i++) {
      const down = (i + 0.6) / tiers;
      const y = -tall + down * tall * (1 - bare);
      const reach = half * Math.min(1, 0.14 + 1.2 * down ** 0.8);
      for (const side of [-1, 1]) {
        const gone = next() < 1 / 12;
        const wide = reach * (0.75 + next() * 0.5);
        const droop = wide * (0.35 + next() * 0.3) + pitch * 0.5;
        if (gone || down < broken) continue;
        c.beginPath();
        c.moveTo(0, y - pitch * 0.7);
        c.quadraticCurveTo(side * wide * 0.6, y - pitch * 0.35, side * wide, y + droop);
        c.quadraticCurveTo(side * wide * 0.4, y + droop * 0.5 + pitch * 0.25, 0, y + pitch * 0.75);
        c.fill();
      }
    }
  });
}

/** A young spruce close by, on the forest's floor: broad at the foot, in a few tiers. */
function youngSpruce(c: Pen, x: number, foot: number, tall: number, colour: Ink): void {
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

/**
 * A pine: a bent stem, bare for most of its height and warm where the bark is thin near the top, with a
 * stub or two of dead branch, and a crown of a few flat plates on limbs, with air between them. `spread` is
 * how wide the crown is for its height: a bog pine's is wide, a forest pine's is not.
 */
function pine(c: Pen, x: number, foot: number, tall: number, bark: Ink, warm: Ink, crown: Ink, spread = 1): void {
  standing(c, x, foot, tall, 0.14, (next) => {
    const thick = Math.max(tall < 26 ? 1.7 : 2.2, tall * 0.05);
    const top = [(next() - 0.5) * 0.26 * tall, -tall * 0.93] as const;
    const one = [(next() - 0.5) * 0.3 * tall, -tall * 0.32] as const;
    const two = [(next() - 0.5) * 0.26 * tall + top[0] * 0.5, -tall * 0.64] as const;
    // Where the stem is, this far up it.
    const stemAt = (t: number): [number, number] => {
      const k = 1 - t;
      return [3 * k * k * t * one[0] + 3 * k * t * t * two[0] + t ** 3 * top[0], 3 * k * k * t * one[1] + 3 * k * t * t * two[1] + t ** 3 * top[1]];
    };
    const stroke = (from: number, to: number, colour: Ink, wide: number) => {
      c.strokeStyle = ink(colour);
      c.lineWidth = wide;
      c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i <= 12; i++) c.lineTo(...stemAt(from + ((to - from) * i) / 12));
      c.stroke();
    };
    stroke(0, 0.7, bark, thick);
    stroke(0.6, 1, warm, thick * 0.75);
    // Dead stubs on the bare part.
    const stubs = 1 + Math.floor(next() * 2);
    c.strokeStyle = ink(bark);
    c.lineWidth = Math.max(1.2, thick * 0.5);
    for (let i = 0; i < stubs; i++) {
      const [sx, sy] = stemAt(0.28 + next() * 0.26);
      const side = next() < 0.5 ? -1 : 1;
      const reach = tall * (0.07 + next() * 0.07);
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + side * reach, sy + reach * (next() - 0.35) * 0.6);
      c.stroke();
    }
    // The crown begins where the stem's bare part ends: plates of needles, each out on its own limb.
    const bare = 0.55 + next() * 0.15;
    const plates = 3 + Math.floor(next() * 3);
    let side = next() < 0.5 ? -1 : 1;
    for (let i = 0; i < plates; i++) {
      const up = i / (plates - 1);
      const [px, py] = stemAt(bare + (1 - bare) * up);
      // The top plate lies over the stem; the lower ones reach out, the lowest the furthest.
      const out = up === 1 ? 0 : side * tall * (0.1 + next() * 0.14) * spread * (1.1 - up * 0.6);
      const lift = tall * (0.03 + next() * 0.04);
      // The top one is the smallest and the roundest: a pine's crown is a heap, not a table.
      const wide = tall * (0.1 + next() * 0.06) * spread * (0.62 + 0.38 * (1 - up));
      if (out !== 0) {
        c.strokeStyle = ink(warm);
        c.lineWidth = Math.max(1.2, thick * 0.45);
        c.beginPath();
        c.moveTo(px, py);
        c.quadraticCurveTo(px + out * 0.5, py - lift * 0.2, px + out, py - lift);
        c.stroke();
      }
      c.fillStyle = ink(crown);
      const puffs = 2 + Math.floor(next() * 2);
      for (let p = 0; p < puffs; p++) {
        const along = p / (puffs - 1) - 0.5;
        c.beginPath();
        c.ellipse(px + out + along * wide * 1.2, py - lift - tall * 0.02 * next(), wide * (0.55 + next() * 0.25), Math.max(2, wide * (0.3 + next() * 0.14 + up * 0.25)), 0, 0, Math.PI * 2);
        c.fill();
      }
      side = -side;
    }
  });
}

/**
 * A dead pine, silver and bare: a tapering stem with its top broken off, and a few crooked limbs that reach
 * out and hang. Its sunward side is light, so that it has a body, and its other side is dark enough to
 * stand out from the mist behind it.
 */
function snag(c: Pen, x: number, foot: number, tall: number, colour: Ink, shade: Ink): void {
  standing(c, x, foot, tall, 0.16, (next) => {
    const bend = (next() - 0.5) * 0.14 * tall;
    const stemAt = (t: number): [number, number] => [bend * Math.sin(t * Math.PI) + bend * 0.7 * t, -tall * t];
    const wideAt = (t: number) => 2.2 - 1.3 * t;
    // The limbs, behind the stem: out and a little up, a knee, and then down.
    const limbs = 3 + Math.floor(next() * 3);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    let side = next() < 0.5 ? -1 : 1;
    for (let i = 0; i < limbs; i++) {
      const t = 0.48 + (0.47 * (i + next() * 0.5)) / limbs;
      const [sx, sy] = stemAt(t);
      const reach = tall * (0.14 + next() * 0.2) * (1.3 - t * 0.6);
      const rise = reach * next() * 0.3;
      const hang = reach * (0.45 + next() * 0.5);
      c.strokeStyle = ink(shade);
      c.lineWidth = 2.3 - t;
      c.beginPath();
      c.moveTo(sx, sy);
      c.lineTo(sx + side * reach * 0.5, sy - rise);
      c.lineTo(sx + side * reach * 0.84, sy - rise + hang * 0.3);
      c.lineTo(sx + side * reach, sy - rise + hang);
      c.stroke();
      // A twig off its knee.
      if (next() < 0.6) {
        c.lineWidth = 1.4;
        c.beginPath();
        c.moveTo(sx + side * reach * 0.5, sy - rise);
        c.lineTo(sx + side * reach * (0.7 + next() * 0.3), sy - rise - reach * (0.15 + next() * 0.25));
        c.stroke();
      }
      if (next() < 0.8) side = -side;
    }
    // The stem: its shaded side first, and the lit side over it.
    for (const [shift, tone] of [[0.8, shade], [-0.6, colour]] as const) {
      c.fillStyle = ink(tone);
      c.beginPath();
      for (let i = 0; i <= 10; i++) { const [sx, sy] = stemAt(i / 10); c.lineTo(sx - wideAt(i / 10) + shift, sy); }
      // The broken top: a splinter.
      const [tx, ty] = stemAt(1);
      c.lineTo(tx + shift + 0.5, ty - tall * 0.1);
      for (let i = 10; i >= 0; i--) { const [sx, sy] = stemAt(i / 10); c.lineTo(sx + wideAt(i / 10) * (shift > 0 ? 1 : 0.35) + shift, sy); }
      c.fill();
    }
  });
}

/**
 * A birch in its autumn yellow: a white stem with dark marks, and small leaves in a tall crown that hangs.
 * `alpha` is how solid the leaves are: far in, a birch is a pale line and a yellow breath.
 */
function birch(c: Pen, x: number, foot: number, tall: number, stem: Ink, mark: Ink, leaves: readonly Ink[], alpha: number, leafy = 34): void {
  standing(c, x, foot, tall, 0.1, (next) => {
    const thick = Math.max(2.4, tall * 0.03);
    const sway = (next() - 0.5) * 0.16 * tall;
    const stemAt = (t: number): [number, number] => [sway * t * t, -tall * t];
    c.strokeStyle = ink(stem);
    c.lineCap = 'butt';
    for (const [from, to, wide] of [[0, 0.55, thick], [0.5, 0.92, thick * 0.7]] as const) {
      c.lineWidth = wide;
      c.beginPath();
      for (let i = 0; i <= 8; i++) c.lineTo(...stemAt(from + ((to - from) * i) / 8));
      c.stroke();
    }
    // The dark marks where branches were.
    c.fillStyle = ink(mark);
    for (let t = 0.06 + next() * 0.05; t < 0.5; t += 0.07 + next() * 0.08) {
      const [mx, my] = stemAt(t);
      c.fillRect(mx - thick / 2 + (next() < 0.5 ? 0 : thick * 0.4), my, thick * 0.6, Math.max(1.2, thick * 0.35));
    }
    // The crown: a tall oval of small leaves, fuller below its middle, where the twigs hang.
    const [cx, cy] = stemAt(0.68);
    for (let i = 0; i < leafy; i++) {
      const turn = next() * Math.PI * 2;
      const far = Math.sqrt(next());
      const r = tall * (0.035 + next() * 0.04);
      const lx = cx + Math.cos(turn) * far * tall * 0.17;
      const ly = cy + Math.sin(turn) * far * tall * 0.3 + far * tall * 0.05;
      const round = c.createRadialGradient(lx, ly, r * 0.3, lx, ly, r);
      const leaf = leaves[Math.floor(next() * leaves.length)]!;
      round.addColorStop(0, ink(leaf, alpha));
      round.addColorStop(1, ink(leaf, 0));
      c.fillStyle = round;
      c.fillRect(lx - r, ly - r, r * 2, r * 2);
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
function clouds(c: Pen, seed: number, eye: number, count: number, light: Ink, shade: Ink, alpha: number): void {
  const next = sequence(seed);
  for (let i = 0; i < count; i++) {
    const x = ((i + next() * 0.7) / count) * W;
    const wide = 44 + next() * 66;
    cloud(c, next, x, eye - 14 - next() * 80, wide, wide * (0.2 + next() * 0.12), light, shade, alpha * (0.7 + next() * 0.3));
  }
}

/**
 * An evening sky over open land: long thin clouds lying level, each shaded above and lit along its
 * underside by the low sun. The higher in the picture, the nearer and the longer.
 */
function lenses(c: Pen, seed: number, eye: number, count: number, light: Ink, shade: Ink, alpha: number): void {
  const next = sequence(seed);
  for (let i = 0; i < count; i++) {
    const x = ((i + next() * 0.8) / count) * W;
    const up = 0.1 + 0.9 * next() ** 1.2;
    const wide = (70 + next() * 110) * (0.45 + 0.65 * up);
    const tall = (5 + next() * 5) * (0.55 + 0.55 * up);
    const y = eye - 8 - up * 80;
    const solid = alpha * (0.7 + next() * 0.3);
    // A cloud is a few bars, one over the other and each a little to the side.
    const bars = 2 + Math.floor(next() * 3);
    for (let bar = 0; bar < bars; bar++) {
      const bx = x + (next() - 0.5) * wide * 0.5;
      const by = y - bar * tall * 0.6;
      const bw = wide * (1 - bar * 0.2) * (0.7 + next() * 0.3);
      const bt = tall * (0.95 - bar * 0.15);
      blob(c, bx, by, bw / 2, bt * 0.6, shade, solid, 0.45);
      // The sun on its underside.
      blob(c, bx - bw * 0.06, by + bt * 0.36, bw * 0.42, bt * 0.32, light, solid, 0.3);
    }
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
function forestLayer(seed: number, z: number, hold: number, every: number, soft: number, wood: Ink, alpha: number, count: number, thin: number, thick: number, young: number, birches = 0): Layer {
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
      for (let i = 0; i < young; i++) youngSpruce(c, next() * W, eye + 8, (34 + next() * 60) * size, mix(green, mist, 0.25 + (1 - alpha) * 0.5));
      for (let i = 0; i < young * 3; i++) {
        const r = (10 + next() * 16) * size;
        blob(c, next() * W, eye + 6 - next() * 6, r * 1.6, r, green, alpha * 0.8, 0.3);
      }
      // Birches between the spruces, in their autumn yellow: a pale stem, and leaves that hang in from above.
      // They have their own numbers, so that nothing else in the picture moves for them.
      const leafy = sequence(seed + 100);
      for (let i = 0; i < birches; i++) {
        const x = ((i + 0.2 + leafy() * 0.6) / birches) * W;
        const lean = (leafy() - 0.5) * 30 * size;
        const wide = Math.max(3.2, 7 * size) + leafy() * 1.2;
        around(x, (at) => {
          c.strokeStyle = ink(mix([233, 228, 212], mist, 0.2 + (1 - alpha) * 0.4), 0.5 + alpha * 0.5);
          c.lineWidth = wide;
          c.beginPath();
          c.moveTo(at, eye + 8);
          c.quadraticCurveTo(at + lean * 0.2, eye * 0.5, at + lean, -4);
          c.stroke();
        });
        for (let j = 0; j < 18; j++) {
          const r = (9 + leafy() * 12) * size;
          const up = leafy() ** 1.3;
          blob(c, x + lean * up + (leafy() - 0.5) * 90 * size, eye - 22 - up * 80, r * 1.25, r, leafy() < 0.3 ? [226, 204, 104] : [216, 184, 72], 0.5 * (0.6 + leafy() * 0.4), 0.3);
        }
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
  forestLayer(17, -62, 0.46, 120, 2, [108, 144, 138], 0.52, 15, 4, 8, 9, 3),
  forestLayer(23, -46, 0.7, 90, 1, [72, 106, 100], 0.66, 10, 6, 12, 6, 3),
  forestLayer(29, -32, 1, 64, 1, [44, 74, 70], 0.8, 6, 10, 20, 4),
];

// --- the garden ---------------------------------------------------------------------------------------------

const GARDEN_HAZE: Ink = [214, 232, 236];

const GARDEN: Layer[] = [
  // The sky's clouds: white, and slow.
  { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 2, drift: 0.45, draw: (c) => clouds(c, 3, 200, 7, [255, 255, 255], [196, 210, 226], 0.85) },
  // The hills beyond the village: forest, blue with distance. The long back with a knob is Storklocken's.
  {
    z: -76, hold: 0.24, sink: 0.02, every: 200, eye: 190, soft: 1,
    draw(c) {
      ridge(c, 161, 24, back([[0.03, 0.3], [0.08, 0.78], [0.115, 1], [0.15, 0.86], [0.185, 0.6], [0.25, 0.58], [0.36, 0.7], [0.46, 0.78], [0.55, 0.5], [0.68, 0.2], [0.82, 0.1], [0.93, 0.16]]), [146, 176, 198], GARDEN_HAZE, 2, 24, 23);
      ridge(c, 176, 10, back([[0.06, 0.4], [0.2, 0.9], [0.34, 0.3], [0.5, 0.75], [0.64, 1], [0.8, 0.35], [0.92, 0.6]]), [128, 164, 172], GARDEN_HAZE, 2.5, 22, 29);
      floor(c, 186, [196, 220, 200], [190, 216, 180]);
    },
  },
  // The valley's far side: fields in strips up a low hill, the forest on its crest, the neighbours' roofs
  // in front of it, and the river at its foot.
  {
    z: -62, hold: 0.44, sink: 0.04, every: 140, eye: 190, soft: 1,
    draw(c) {
      const next = sequence(41);
      const far: Ink = [118, 156, 138];
      const hill = back([[0.05, 0.3], [0.2, 0.9], [0.36, 0.45], [0.52, 1], [0.7, 0.35], [0.86, 0.75]]);
      const top = 172;
      const tall = 8;
      const crest = (x: number) => top + tall * (1 - hill(x));
      // The forest on the hill: spruces so close that they are one dark edge, each with its own top.
      ridge(c, top - 7, tall, hill, far, far, 3, 10, 37);
      for (let i = 0; i < 84; i++) {
        const x = ((i + next()) / 84) * W;
        spruce(c, x, crest(x) + 3, 15 + next() * 20, mix(far, GARDEN_HAZE, next() * 0.25), 1.6);
      }
      // The fields: stubble, ley and aftermath, each its own colour, under the morning's haze.
      ridge(c, top, tall, hill, [176, 200, 134], [176, 206, 132], 0, 30);
      const fields: Ink[] = [[186, 200, 104], [226, 204, 134], [138, 178, 92], [208, 214, 148]];
      for (let x = -8, i = 0; x < W; i++) {
        const wide = 26 + next() * 34;
        const lean = 6 + next() * 5;
        const tone = fields[i % fields.length]!;
        const from = x;
        around(from, (at) => {
          c.fillStyle = ink(tone);
          c.beginPath();
          c.moveTo(at + lean, crest(at + lean) + 1.5);
          c.lineTo(at + lean + wide * 0.86, crest(at + lean + wide * 0.86) + 1.5);
          c.lineTo(at + wide, 192);
          c.lineTo(at, 192);
          c.fill();
        });
        x += wide;
      }
      // The river, pale as the sky, winding along the hill's foot.
      for (const shift of [-W, 0, W]) {
        c.strokeStyle = ink([207, 224, 234]);
        c.lineWidth = 4;
        c.beginPath();
        for (let x = 0; x <= W; x += 8) c.lineTo(x + shift, 184 + 1.8 * Math.sin((x / W) * Math.PI * 4 + 0.8) + 1 * Math.sin((x / W) * Math.PI * 10));
        c.stroke();
      }
      // Groves between the fields, and birches in their yellow by the houses.
      for (let i = 0; i < 12; i++) blob(c, next() * W, 184 - next() * 10, 12 + next() * 10, 7 + next() * 5, [140, 174, 116], 0.9, 0.5);
      for (const [x, high] of [[70, 30], [124, 24], [290, 28], [346, 22], [398, 26], [470, 30]] as const) {
        birch(c, x, 190, high, [236, 234, 224], [120, 124, 118], [[226, 198, 96], [217, 180, 84], [170, 186, 104]], 0.8, 22);
      }
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
      floor(c, 190, [176, 206, 132], [150, 190, 110]);
      band(c, 146, 196, GARDEN_HAZE, 0.3);
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
      hills(c, 180, 11, [3, 7, 11], 0.9, [112, 152, 84], [58, 102, 58], 4, -4);
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

/**
 * What stands on the bog's nearest card: where along its picture (0 to 1) and how tall in EL. A mire is
 * open, so most of it is: one group of spruces, dark against the mist, small crooked bog pines and silver
 * dead ones. Nothing stands in its middle: the far shore and the mountain are seen through there, and what
 * lives on the bog walks there, behind this card.
 */
export const BOG_NEAR = {
  open: [0.3, 0.7],
  trees: [
    { kind: 'spruce', at: 0.19, tall: 7.4 }, { kind: 'spruce', at: 0.226, tall: 12.6 }, { kind: 'spruce', at: 0.263, tall: 9.6 },
    { kind: 'pine', at: 0.04, tall: 3.6 }, { kind: 'pine', at: 0.118, tall: 4.8 }, { kind: 'pine', at: 0.152, tall: 2.6 },
    { kind: 'pine', at: 0.752, tall: 5 }, { kind: 'pine', at: 0.81, tall: 2.8 }, { kind: 'pine', at: 0.9, tall: 4.2 },
    { kind: 'snag', at: 0.074, tall: 5.6 }, { kind: 'snag', at: 0.73, tall: 6.4 }, { kind: 'snag', at: 0.955, tall: 4.2 },
  ],
} as const;

const BOG: Layer[] = [
  // Late afternoon clouds, long and level, warm where the low sun reaches them from below.
  { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 1, drift: 0.35, draw: (c) => lenses(c, 5, 200, 7, [255, 240, 212], [176, 172, 186], 0.7) },
  // The mountain, in mist: where the trail goes. A long back that rises to a knob, as Storklocken does.
  {
    z: -78, hold: 0.2, sink: 0.02, every: 200, eye: 190, soft: 1,
    draw(c) {
      ridge(c, 160, 26, back([[0.0, 0.5], [0.05, 0.86], [0.085, 1], [0.115, 0.9], [0.14, 0.6], [0.2, 0.62], [0.3, 0.74], [0.4, 0.7], [0.47, 0.42], [0.58, 0.2], [0.72, 0.12], [0.86, 0.22], [0.94, 0.3]]), [126, 140, 172], BOG_MIST, 2.2, 14, 3);
      ridge(c, 177, 7, back([[0.06, 0.3], [0.22, 0.9], [0.36, 0.4], [0.55, 0.8], [0.7, 0.35], [0.88, 1]]), [146, 156, 178], BOG_MIST, 2.5, 10, 5);
      band(c, 166, 208, BOG_MIST, 0.6);
      floor(c, 188, BOG_MIST, [224, 212, 184]);
    },
  },
  // Low hills of forest, with spruce tops for a skyline.
  {
    z: -64, hold: 0.38, sink: 0.04, every: 170, eye: 190, soft: 1,
    draw(c) {
      ridge(c, 174, 12, back([[0.04, 0.2], [0.16, 0.7], [0.27, 0.5], [0.4, 1], [0.52, 0.55], [0.63, 0.25], [0.78, 0.6], [0.9, 0.35]]), [104, 122, 126], BOG_MIST, 4, 16, 9);
      band(c, 172, 206, BOG_MIST, 0.55);
      floor(c, 188, [226, 214, 186], [214, 198, 160]);
    },
  },
  // The forest's edge across the bog: a low band of pines, with spruce in a few clumps.
  {
    z: -50, hold: 0.62, sink: 0.07, every: 120, eye: 190, soft: 1,
    draw(c) {
      const next = sequence(83);
      const far: Ink = [86, 106, 96];
      const bark = mix([112, 112, 104], BOG_MIST, 0.2);
      const warm = mix([176, 124, 86], BOG_MIST, 0.35);
      // The pine wood behind: one roof of crowns, uneven, on many thin stems.
      const roof = back([[0.04, 0.5], [0.15, 1], [0.27, 0.3], [0.4, 0.8], [0.52, 0.2], [0.66, 0.9], [0.8, 0.45], [0.92, 0.75]]);
      c.fillStyle = ink(mix(bark, BOG_MIST, 0.3));
      for (let x = 0; x < W; x += 3 + next() * 4) around(x, (at) => c.fillRect(at, 178, 1.3, 16));
      ridge(c, 172, 5, roof, mix(far, BOG_MIST, 0.3), mix(far, BOG_MIST, 0.34), 2.4, 7, 13, true);
      // The pines at its edge, each seen whole, and spruce in a few clumps.
      for (let i = 0; i < 46; i++) {
        const tone = mix(far, BOG_MIST, next() * 0.2);
        pine(c, ((i + next()) / 46) * W, 193, 12 + next() * 11, bark, warm, tone, 0.8);
      }
      for (const clump of [66, 236, 402]) {
        const many = 4 + Math.floor(next() * 3);
        for (let i = 0; i < many; i++) spruce(c, clump + (next() - 0.5) * 46, 194, 16 + next() * 14, mix(far, BOG_MIST, next() * 0.16));
      }
      band(c, 176, 208, BOG_MIST, 0.55);
      floor(c, 190, [204, 186, 138], [188, 164, 112]);
    },
  },
  // The nearest spruces and bog pines, dark against the mist, and the open mire between them.
  {
    z: -34, hold: 1, sink: 0.1, every: 84, eye: 190, soft: 1,
    draw(c) {
      const near: Ink = [82, 98, 88];
      const texels = W / 84;
      for (const [i, tree] of BOG_NEAR.trees.entries()) {
        const x = tree.at * W;
        const tall = tree.tall * texels;
        // The group is the bog's dark against the mist: slim as they are, they keep it by being a shade deeper.
        if (tree.kind === 'spruce') spruce(c, x, 197, tall, mix(mix(near, [50, 68, 60], 0.4), BOG_MIST, (i % 3) * 0.06), 1.1);
        else if (tree.kind === 'pine') pine(c, x, 196, tall, [104, 98, 90], mix([176, 118, 78], BOG_MIST, 0.15), mix(near, [100, 112, 76], 0.4), 1.25);
        else snag(c, x, 196, tall, [198, 194, 182], [112, 110, 108]);
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
  /** The valley's floor: its lake, which is the sky's colour, its mires and its clear-cuts. */
  water: Ink;
  mire: Ink;
  cut: Ink;
  /** The slope under him: bare rock, and heath in its autumn rust. */
  rock: Ink;
  heath: Ink;
}

/**
 * The view from a summit. Seen from the mountain's foot the nearer ridges stand high; as he climbs they sink
 * (`sink`) until the land lies under him: thin ridges one behind the other close over the horizon, each
 * paler, under a sky that fills half the picture. What lies under a crest is painted too: the flight looks
 * down on it.
 */
function fell(look: Fell): Layer[] {
  const eye = 170;
  return [
    { z: -90, hold: 0.08, sink: 0, every: 160, eye: 200, soft: 1, drift: 0.3, draw: (c) => lenses(c, 7, 200, 7, look.cloud.light, look.cloud.shade, look.cloud.alpha) },
    // The farthest ridges, nearly the sky's colour: thin ones, and one long back with a knob over them all.
    {
      z: -78, hold: 0.2, sink: 0.05, every: 200, eye, soft: 1,
      draw(c) {
        ridge(c, eye - 17.5, 4, back([[0.05, 0.4], [0.3, 1], [0.48, 0.3], [0.66, 0.8], [0.85, 0.2]]), mix(look.ridge[0], look.haze, 0.45), look.haze, 0, 8);
        ridge(c, eye - 30, 17, back([[0.0, 0.2], [0.06, 0.38], [0.105, 0.86], [0.135, 1], [0.165, 0.9], [0.2, 0.62], [0.26, 0.56], [0.34, 0.62], [0.44, 0.44], [0.55, 0.16], [0.7, 0.04], [0.86, 0.1], [0.94, 0.16]]), look.ridge[0], look.haze, 1.2, 8, 3);
        ridge(c, eye - 14.5, 4.5, back([[0.03, 0.9], [0.2, 0.25], [0.38, 0.75], [0.55, 0.35], [0.74, 1], [0.9, 0.5]]), mix(look.ridge[0], look.ridge[1], 0.45), look.haze, 1.5, 12, 5);
      },
    },
    // Two nearer ones, darker.
    {
      z: -64, hold: 0.38, sink: 0.12, every: 190, eye, soft: 1,
      draw(c) {
        ridge(c, eye - 20, 5, back([[0.08, 0.35], [0.24, 1], [0.4, 0.45], [0.57, 0.8], [0.76, 0.15], [0.92, 0.6]]), mix(look.ridge[0], look.ridge[1], 0.8), look.haze, 2, 10, 7);
        ridge(c, eye - 16, 5, back([[0.05, 0.7], [0.2, 0.2], [0.36, 0.6], [0.5, 1], [0.68, 0.5], [0.85, 0.85]]), look.ridge[1], look.haze, 2.4, 30, 11);
        band(c, 186, 256, look.haze, 0.4);
      },
    },
    // A forested ridge, and the valley under it: a lake, the mire at its end, a river's thread, clear-cuts.
    {
      z: -50, hold: 0.62, sink: 0.22, every: 140, eye, soft: 1,
      draw(c) {
        const next = sequence(97);
        const floorTone = mix(look.ridge[2], look.haze, 0.42);
        ridge(c, eye - 31, 12, back([[0.04, 0.5], [0.17, 1], [0.3, 0.55], [0.44, 0.15], [0.6, 0.7], [0.74, 0.95], [0.9, 0.3]]), look.ridge[2], floorTone, 3.2, 36, 17);
        // Clear-cuts and stands of forest: pale and dark patches, lying flat.
        for (let i = 0; i < 9; i++) blob(c, next() * W, 158 + next() * 40, 16 + next() * 22, 2.4 + next() * 2.2, look.cut, 0.7, 0.55);
        for (let i = 0; i < 12; i++) blob(c, next() * W, 158 + next() * 42, 22 + next() * 34, 2.2 + next() * 2, mix(look.ridge[2], look.ridge[3], 0.55), 0.8, 0.5);
        // The mire, tawny, with the lake lying in it.
        blob(c, 206, 176.5, 46, 6, look.mire, 0.95, 0.6);
        blob(c, 118, 181, 30, 3.4, look.mire, 0.8, 0.5);
        blob(c, 388, 171, 34, 3.2, look.mire, 0.7, 0.5);
        const shore = [[-1, 0.15], [-0.72, -0.75], [-0.3, -0.5], [0.1, -1], [0.62, -0.7], [1, -0.1], [0.78, 0.7], [0.36, 0.45], [0.02, 1], [-0.5, 0.85]] as const;
        for (const [x, y, wide, tall] of [[152, 177, 46, 4.6], [392, 171, 15, 1.9]] as const) {
          around(x, (at) => {
            c.fillStyle = ink(look.water);
            c.beginPath();
            for (let i = 0; i <= shore.length; i++) {
              const a = shore[i % shore.length]!;
              const b = shore[(i + 1) % shore.length]!;
              const mid = [at + ((a[0] + b[0]) / 2) * wide, y + ((a[1] + b[1]) / 2) * tall] as const;
              if (i === 0) c.moveTo(...mid);
              else c.quadraticCurveTo(at + a[0] * wide, y + a[1] * tall, ...mid);
            }
            c.fill();
          });
        }
        // The river: out of the lake, and away between the ridges.
        around(196, (at) => {
          c.strokeStyle = ink(look.water, 0.9);
          c.lineCap = 'round';
          c.lineWidth = 2.6;
          c.beginPath();
          c.moveTo(at, 177);
          c.bezierCurveTo(at + 26, 181, at + 44, 172, at + 70, 174);
          c.bezierCurveTo(at + 96, 176, at + 104, 167, at + 132, 168);
          c.stroke();
          c.lineWidth = 1.8;
          c.beginPath();
          c.moveTo(at + 132, 168);
          c.bezierCurveTo(at + 150, 169, at + 160, 163, at + 184, 163.5);
          c.stroke();
        });
        // The forest on the lake's near shore.
        for (const [x, y, wide] of [[140, 183.5, 52], [246, 180.5, 30], [66, 186, 40]] as const) blob(c, x, y, wide, 2.6, mix(look.ridge[2], look.ridge[3], 0.7), 0.9, 0.6);
        band(c, 200, 290, look.haze, 0.4);
      },
    },
    // The slope under him: it falls away to the valley, with its spruces smaller and paler the further down,
    // rock and heath between them. The tallest stand close, and at the summit only their tops are seen.
    {
      z: -36, hold: 1, sink: 0.32, every: 100, eye, soft: 1,
      draw(c) {
        const next = sequence(101);
        const lie = back([[0.03, 0.75], [0.14, 0.95], [0.27, 0.5], [0.42, 0.12], [0.56, 0.05], [0.68, 0.3], [0.8, 0.85], [0.92, 1]]);
        const top = eye - 10;
        const tall = 16;
        const crest = (x: number) => top + tall * (1 - lie(x));
        const dark = mix(look.ridge[3], [12, 10, 28], 0.25);
        // The spruces that stand along its edge, against the valley.
        for (let i = 0; i < 16; i++) {
          const x = ((i + next() * 0.9) / 16) * W;
          spruce(c, x, crest(x) + 5, 20 + next() * 16, mix(look.ridge[3], look.haze, 0.1));
        }
        // The ground between the trees is paler than they are: heath, lichen and rock in the evening light.
        ridge(c, top, tall, lie, mix(look.ridge[3], look.haze, 0.42), mix(look.ridge[3], look.haze, 0.22), 3, 60, 19);
        for (let i = 0; i < 22; i++) {
          const x = next() * W;
          const down = 6 + next() * 66;
          blob(c, x, crest(x) + down, 12 + next() * 20 + down * 0.15, 2 + down * 0.06, look.rock, 0.42, 0.3);
        }
        for (let i = 0; i < 26; i++) {
          const x = next() * W;
          const down = 5 + next() * 68;
          blob(c, x, crest(x) + down, 12 + next() * 22 + down * 0.15, 2.2 + down * 0.06, look.heath, 0.4, 0.3);
        }
        // Spruce tops down the slope, in stands with open heath between: nearer, they are bigger and darker.
        const stand = back([[0.02, 0.95], [0.13, 0.15], [0.24, 0.8], [0.37, 0.05], [0.5, 1], [0.63, 0.25], [0.75, 0.85], [0.88, 0.1]]);
        for (let row = 0; row < 7; row++) {
          const down = 6 + row * 10.5;
          const size = 12 + row * 3.8;
          const count = Math.round(46 - row * 3.8);
          const tone = mix(mix(look.ridge[3], look.haze, 0.08), dark, Math.min(1, row / 5));
          for (let i = 0; i < count; i++) {
            const x = ((i + next()) / count) * W;
            const [dice, lower, grown] = [next(), next(), next()];
            // Each row's stands lie elsewhere along it.
            if (dice > stand(x + row * 61)) continue;
            spruce(c, x, crest(x) + down + lower * 9, size * (0.6 + grown * 0.8), tone, 1.7);
          }
        }
        // The tall ones, close by.
        for (const [at, reach] of [[20, 55], [36, 47], [150, 51], [236, 49], [251, 60], [264, 44], [342, 53], [422, 57], [470, 46]] as const) {
          const foot = crest(at) + 12;
          spruce(c, at, foot, foot - (eye - reach), dark);
        }
        // The picture's last row is its foot, and the card repeats it: one colour there.
        const foot = c.createLinearGradient(0, 238, 0, H);
        foot.addColorStop(0, ink(dark, 0));
        foot.addColorStop(0.8, ink(dark));
        c.fillStyle = foot;
        c.fillRect(-MARGIN, 238, W + MARGIN * 2, H - 238);
      },
    },
  ];
}

/** The golden hour: blue-violet ridges under a pink-orange sky. */
const MOUNTAIN = fell({
  haze: [240, 190, 164],
  ridge: [[158, 138, 190], [132, 112, 168], [104, 90, 142], [76, 66, 106]],
  cloud: { light: [255, 214, 184], shade: [176, 140, 176], alpha: 0.75 },
  water: [252, 212, 186],
  mire: [198, 150, 118],
  cut: [176, 138, 150],
  rock: [164, 152, 176],
  heath: [176, 112, 96],
});

/** The blue hour: the same ridges, dark. The lake still holds the sky's last light. */
const DUSK = fell({
  haze: [62, 74, 122],
  ridge: [[52, 64, 116], [40, 50, 98], [30, 38, 80], [20, 26, 58]],
  cloud: { light: [96, 100, 150], shade: [40, 48, 92], alpha: 0.5 },
  water: [96, 110, 162],
  mire: [56, 62, 104],
  cut: [50, 60, 106],
  rock: [44, 52, 94],
  heath: [44, 40, 80],
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

/** Bredbyn sits in a wooded valley: a broad rounded ridge, with autumn trees below it.
 * The actual church and street silhouettes are separate lit geometry, never repeated on this layer. */
const VILLAGE: Layer[] = [
  { ...GARDEN[0]!, drift: 0.26 },
  {
    z: -76, hold: 0.24, sink: 0.02, every: 240, eye: 188, soft: 1,
    draw(c) {
      const haze: Ink = [209, 219, 221];
      ridge(c, 158, 18, back([[0, 0.3], [0.14, 0.7], [0.3, 0.85], [0.43, 0.8], [0.6, 0.3], [0.76, 0.45], [0.9, 0.55]]), [135, 157, 170], haze, 1.2, 24, 61);
      ridge(c, 179, 10, back([[0, 0.45], [0.2, 0.8], [0.44, 0.3], [0.68, 0.55], [0.85, 0.6]]), [114, 140, 126], haze, 3, 28, 73);
      floor(c, 196, [166, 177, 138], [172, 182, 148]);
    },
  },
];

const LAYERS: Record<PlaceId, Layer[]> = { forest: FOREST, garden: GARDEN, bog: BOG, mountain: MOUNTAIN, dusk: DUSK, home: [], village: VILLAGE };

/** Where a place's far layers hang and how they pass, from the farthest to the nearest. Each is one draw call. */
export const farLayers = (place: PlaceId): { z: number; hold: number; sink: number; drift: number }[] =>
  LAYERS[place].map(({ z, hold, sink, drift }) => ({ z, hold, sink, drift: drift ?? 0 }));

export interface Scenery {
  group: Group;
  /** Where the camera looks, the ground he stands on, and the time. */
  update(cameraX: number, groundY: number, clock: number, night?: number): void;
}

/** Linear-light exposure shared by the finale's sky and its unlit distant hills. */
export const nightBrightness = (night: number): number => 1 - 0.66 * Math.min(1, Math.max(0, night));

/**
 * How far a layer has gone down, in EL, when he stands `climb` EL over the land around him. At a summit the
 * nearest slope has gone down 9 EL and stays there; below where he began, the layers rise, by 5 EL at most.
 */
export const sunk = (sink: number, climb: number): number => Math.max(-5, Math.min(9, climb * sink));

/**
 * The hour on the mountain (plan §3.4: 18:00 at the flight, 18:35 at the old pine). Over the first two
 * fifths of the chapter the golden hour stands still; from there to its end the far ridges turn towards
 * rose and the sky dims a little, as the sun goes down. Linear light, as the finale's nightfall is.
 */
export function evening(x: number, from: number, to: number): { tint: readonly [number, number, number]; sky: number } {
  const late = to > from ? Math.min(1, Math.max(0, (x - from) / (to - from) - 0.4) / 0.6) : 0;
  return { tint: [1, 1 - 0.14 * late, 1 - 0.08 * late], sky: 1 - 0.15 * late };
}

/**
 * Builds a place's far scenery. `anchor` is the height of the land around the chapter: where it starts, or
 * lower if it starts on a height (a chapter's `outlook`). Above it the nearer layers sink under the farther
 * ones, and below it they rise. `from` and `to` are the chapter's ends: the mountain's hour goes by them.
 */
export function scenery(place: PlaceId, anchor: number, from = 0, to = 0): Scenery {
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
    card.name = `far-${place}-${-layer.z}`;
    card.position.z = layer.z;
    card.renderOrder = -3;
    // It goes with the camera, so it is always in the picture.
    card.frustumCulled = false;
    group.add(card);
    return { layer, card, map };
  });
  return {
    group,
    update(cameraX, groundY, clock, night = 0) {
      const hour = place === 'mountain' ? evening(cameraX, from, to).tint : null;
      for (const { layer, card, map } of cards) {
        card.position.set(cameraX, groundY + EYE - sunk(layer.sink, groundY - anchor), layer.z);
        const along = (cameraX * layer.hold + clock * (layer.drift ?? 0)) / layer.every;
        map.offset.x = along - Math.floor(along);
        // These pictures include their own haze and receive no scene lights. Tint from white each time,
        // never from last frame's colour, so pausing or reversing nightfall cannot accumulate darkness.
        if (place === 'dusk') card.material.color.setScalar(nightBrightness(night));
        if (hour) card.material.color.setRGB(hour[0], hour[1], hour[2]);
      }
    },
  };
}
