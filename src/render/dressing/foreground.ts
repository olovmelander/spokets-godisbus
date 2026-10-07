import { Group, Matrix4, MeshBasicMaterial, Vector3, type CanvasTexture, type InstancedMesh, type Material, type Object3D } from 'three';
import { FALL_LIMIT } from '../../sim/constants';
import type { ChapterData } from '../../sim/types';
import { quadBatch } from '../quads';
import { windAt } from '../wind';
import { KIT, drawn, grows, heightAt, sequence, surfaceAt } from './kit';

// --- L4: the foreground ---------------------------------------------------------------------------------

/**
 * What grows out of focus in front of the picture, and softly far behind the path: the forest's dark ferns
 * and twigs, the garden's bright grass, the bog's straw sedge, what comes up in a kerb's joint, and on the
 * mountain the shoulders of boulders, dry grass and crowberry: in the low sun (`fell`), and at night.
 */
export type Growth = 'dark' | 'bright' | 'straw' | 'kerb' | 'fell' | 'night';

type Pen = CanvasRenderingContext2D;

/** Each growth's shade, and the rim that the sun behind the scene gives it on its upper left. */
export const INK: Record<Growth, readonly [core: string, rim: string]> = {
  dark: ['#10231c', '#6f8f34'],
  bright: ['#1f4a1c', '#8fc43a'],
  straw: ['#54441e', '#ad9850'],
  kerb: ['#1d2b1f', '#71893f'],
  // The mountain's shade is blue-violet and only the sun is warm (art bible §2.3): a sand-warm rim, never pink.
  fell: ['#2c2a44', '#d4b494'],
  night: ['#0c1230', '#4a5a86'],
};
/** A dandelion's clock and the cotton grass's wool: pale, and never bright. */
export const PALE = '#b4b5a2';

/** A cell of the sheet is this many pixels, and a card shows one cell. */
const CELL = 128;

/** A blade from the cell's foot: where it stands, how far its tip leans, how tall and how wide it is. */
function blade(c: Pen, x: number, lean: number, tall: number, wide: number): void {
  c.beginPath();
  c.moveTo(x - wide / 2, CELL + 4);
  c.quadraticCurveTo(x - wide / 4 + lean * 0.1, CELL - tall * 0.6, x + lean, CELL - tall);
  c.quadraticCurveTo(x + wide / 4 + lean * 0.4, CELL - tall * 0.55, x + wide / 2, CELL + 4);
  c.fill();
}

/** A leaf from its stalk's end, pointing along an angle. */
function leaf(c: Pen, x: number, y: number, angle: number, long: number, wide: number): void {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(long * 0.4, -wide, long, 0);
  c.quadraticCurveTo(long * 0.4, wide, 0, 0);
  c.fill();
  c.restore();
}

/**
 * A stem that bows from one place to another with leaves in pairs along it: a fern's frond, a lingonberry
 * sprig, a spruce twig, by how many leaves it has, how long and wide they are, how far they stand out from
 * the stem, and how much shorter they are at its tip.
 */
function spray(c: Pen, x0: number, y0: number, x1: number, y1: number, bow: number, pairs: number, long: number, wide: number, open: number, taper: number): void {
  const mx = (x0 + x1) / 2 - (y1 - y0) * bow;
  const my = (y0 + y1) / 2 + (x1 - x0) * bow;
  for (let k = 1; k <= pairs; k++) {
    const t = k / pairs;
    const x = (1 - t) ** 2 * x0 + 2 * t * (1 - t) * mx + t * t * x1;
    const y = (1 - t) ** 2 * y0 + 2 * t * (1 - t) * my + t * t * y1;
    const along = Math.atan2((1 - t) * (my - y0) + t * (y1 - my), (1 - t) * (mx - x0) + t * (x1 - mx));
    for (const side of [-1, 1]) leaf(c, x, y, along + side * open, long * (1 - taper * t), wide);
  }
  c.lineWidth = Math.max(3, wide * 0.5);
  c.beginPath();
  c.moveTo(x0, y0);
  c.quadraticCurveTo(mx, my, x1, y1);
  c.stroke();
}

/** Something pale and round: it is drawn in its own colour, whichever ink the rest is in. */
function pale(c: Pen, x: number, y: number, wide: number, tall: number): void {
  const ink = c.fillStyle;
  c.fillStyle = PALE;
  c.beginPath();
  c.ellipse(x, y, wide, tall, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = ink;
}

/** Leaves in a ring from one foot, as a plantain's or a dandelion's, with something on two stalks over them. */
function rosette(c: Pen, x: number, next: () => number, long: number, top: (x: number, y: number) => void): void {
  for (let k = 0; k < 7; k++) leaf(c, x, CELL + 2, -Math.PI * (0.2 + 0.6 * (k + next() * 0.6) / 7), long * (0.6 + next() * 0.4), 13 + next() * 6);
  for (const side of [-1, 1]) {
    const tx = x + side * (10 + next() * 22);
    const ty = 10 + next() * 20;
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x, CELL);
    c.quadraticCurveTo(x, ty + 40, tx, ty);
    c.stroke();
    top(tx, ty);
  }
}

/** Blades in a row or a fan: how many, where the first stands and how far apart, how they lean, how tall and how wide. */
function blades(c: Pen, next: () => number, count: number, x: number, apart: number, fan: number, lean: number, tall: number, wide: number): void {
  for (let k = 0; k < count; k++) blade(c, x + k * apart + next() * apart * 0.4, (k - (count - 1) / 2) * fan + (next() - 0.5) * lean, tall * (0.62 + next() * 0.38), wide * (0.7 + next() * 0.5));
}

/** The mountain's foreground, by day and at night: the same things, in their own light (`INK`). */
const FELL: [size: number, draw: (c: Pen, next: () => number) => void][] = [
  // The shoulder of a boulder, rounded by the ice, with a crack and a step in its outline.
  [2.8, (c) => {
    c.beginPath();
    c.moveTo(2, 134);
    c.bezierCurveTo(4, 72, 30, 34, 62, 30);
    c.bezierCurveTo(78, 28, 84, 38, 92, 36);
    c.bezierCurveTo(112, 34, 126, 78, 126, 134);
    c.closePath();
    c.fill();
  }],
  // Dry grass in a tuft, thin and leaning.
  [2, (c, next) => blades(c, next, 8, 16, 13, 9, 20, 120, 8)],
  // Crowberry: low dense sprigs of needle leaves.
  [1.5, (c, next) => {
    for (const x of [20, 46, 72, 98, 118]) spray(c, x, 134, x + (next() - 0.5) * 44, 34 + next() * 34, (next() - 0.5) * 0.4, 10, 12, 4.5, 1.05, 0.3);
  }],
  // A small stone half sunk, with grass beside it.
  [1.8, (c, next) => {
    c.beginPath();
    c.ellipse(52, 132, 40, 30, 0, Math.PI, 0);
    c.fill();
    blades(c, next, 4, 92, 9, 8, 16, 104, 7);
  }],
];

/**
 * What a growth's cards show: one drawing to a cell, and how many EL across its card is, so that a sprig is
 * small and a fern is large. Each fills its cell from the foot to the top, since only the upper part of a
 * card is in the picture.
 */
const DRAWINGS: Record<Growth, [size: number, draw: (c: Pen, next: () => number) => void][]> = {
  dark: [
    // A fern: two fronds bowing out from one foot.
    [2.5, (c) => {
      spray(c, 60, 134, 12, 8, -0.2, 13, 32, 8, 1.15, 0.8);
      spray(c, 68, 134, 118, 22, 0.22, 12, 29, 7.5, 1.15, 0.8);
    }],
    // Lingonberry: stiff little stems with oval leaves.
    [1.3, (c, next) => {
      for (const x of [28, 64, 98]) spray(c, x, 134, x + (next() - 0.5) * 30, 6 + next() * 22, (next() - 0.5) * 0.3, 6, 18, 9, 0.85, 0.25);
    }],
    // Grass, and a young fern among it.
    [2, (c, next) => {
      blades(c, next, 5, 16, 20, 9, 30, 126, 14);
      spray(c, 92, 134, 120, 40, 0.3, 8, 21, 6.5, 1.1, 0.8);
    }],
    // A spruce twig that has come down: needles all along it and along its side twigs.
    [2.2, (c) => {
      spray(c, 4, 124, 122, 14, -0.16, 26, 14, 3.2, 0.9, 0.35);
      spray(c, 40, 92, 66, 6, 0.1, 13, 12, 3, 0.9, 0.3);
      spray(c, 74, 60, 122, 78, 0.12, 10, 12, 3, 0.9, 0.3);
    }],
  ],
  bright: [
    // Five broad blades.
    [2, (c, next) => blades(c, next, 5, 14, 22, 12, 30, 126, 19)],
    // Blades, and two clovers on their stalks.
    [1.8, (c, next) => {
      blades(c, next, 4, 12, 30, 10, 26, 126, 16);
      for (const x of [38, 94]) {
        const tall = 96 + next() * 22;
        blade(c, x, 0, tall, 4);
        for (let k = 0; k < 3; k++) leaf(c, x, CELL - tall + 4, -Math.PI / 2 + (k - 1) * 2.1, 19, 15);
      }
    }],
    // Thin tall blades that lean one way.
    [2.2, (c, next) => blades(c, next, 6, 8, 16, 0, 20, 126, 11)],
    // A dandelion's leaves, and two buds on their stalks.
    [1.6, (c, next) => rosette(c, 64, next, 118, (x, y) => leaf(c, x, y + 6, -Math.PI / 2, 19, 8))],
  ],
  straw: [
    // Sedge: thin separate blades, fanned.
    [2, (c, next) => blades(c, next, 8, 30, 9, 11, 14, 126, 15)],
    // The same, and seed heads on stiff stalks.
    [2.2, (c, next) => {
      blades(c, next, 6, 34, 11, 14, 14, 110, 15);
      for (const x of [48, 80]) {
        const lean = (next() - 0.5) * 34;
        blade(c, x, lean, 120, 6);
        leaf(c, x + lean, 2, Math.PI / 2, 28, 9);
      }
    }],
    // Cotton grass: wool on thin stalks.
    [1.8, (c, next) => {
      for (const x of [30, 64, 98]) {
        const lean = (next() - 0.5) * 26;
        const tall = 100 + next() * 20;
        blade(c, x, lean, tall, 6);
        blade(c, x + 7, lean * 2.4, tall * 0.7, 10);
        pale(c, x + lean, CELL - tall - 2, 8, 6.5);
      }
    }],
    // A few tips, far apart: what stands up out of the water.
    [1.8, (c, next) => blades(c, next, 6, 10, 20, 0, 30, 126, 16)],
  ],
  kerb: [
    // Plantain: broad leaves, and its two spikes.
    [1.9, (c, next) => rosette(c, 64, next, 104, (x, y) => leaf(c, x, y + 26, -Math.PI / 2, 32, 6))],
    // Grass out of a joint.
    [1.8, (c, next) => blades(c, next, 7, 36, 9, 12, 16, 126, 10)],
    // A dandelion gone to seed: its leaves, and two clocks.
    [2, (c, next) => rosette(c, 62, next, 100, (x, y) => pale(c, x, y + 2, 12, 12))],
  ],
  fell: FELL,
  night: FELL,
};

/** The share of a card's height, at its top, that its drawing leaves clear when it has been made soft. */
export const CLEAR = 0.09;

/**
 * The sheet of a growth's cards: its drawings side by side. Each is drawn with real outlines at twice its
 * size, first in the sun's rim and then in its own shade a little down and to the right, and then made soft
 * the way the far pictures are, by halving it and doubling it again (which every browser can do). On its
 * card it is some five times larger again: out of focus, and still a fern or a blade of grass.
 */
export function tuftSheet(growth: Growth, soft = 1): CanvasTexture {
  const [core, rim] = INK[growth];
  const count = DRAWINGS[growth].length;
  let sheet = drawn(CELL * 2 * count, CELL * 2, (c) => {
    for (const [i, [, drawing]] of DRAWINGS[growth].entries()) {
      for (const [ink, shift] of [[rim, 0], [core, 2.2]] as const) {
        // A drawing keeps clear of its cell's sides and top, so that nothing of it is cut when it is made soft.
        c.setTransform(1.6, 0, 0, 1.8, (i * CELL + 12.8 + shift) * 2, (12.8 + shift) * 2);
        c.fillStyle = c.strokeStyle = ink;
        c.lineCap = 'round';
        drawing(c, sequence(i * 7 + 3));
      }
    }
    // No hard edge anywhere: it fades to nothing at its foot.
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = 'destination-in';
    const down = c.createLinearGradient(0, 0, 0, CELL * 2);
    down.addColorStop(0.8, 'rgba(0,0,0,1)');
    down.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = down;
    c.fillRect(0, 0, CELL * 2 * count, CELL * 2);
  });
  const scaled = (by: number) => {
    const from = sheet.image as HTMLCanvasElement;
    return drawn(from.width * by, from.height * by, (c) => c.drawImage(from, 0, 0, from.width * by, from.height * by));
  };
  for (let i = 0; i <= soft; i++) sheet = scaled(0.5);
  for (let i = 0; i < soft; i++) sheet = scaled(2);
  // And once more across and once more down, as the mean of three: it takes the steps out of what is thin.
  for (const [across, down] of [[1, 0], [0, 1]] as const) {
    const from = sheet.image as HTMLCanvasElement;
    sheet = drawn(from.width, from.height, (c) => {
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = 1 / 3;
      for (const by of [-1.5, 0, 1.5]) c.drawImage(from, by * across, by * down);
    });
  }
  return sheet;
}

/** A low shrub far out of focus: a soft mound with a fringe of leaves. */
function blurredShrub(seed: number, growth: Growth): CanvasTexture {
  const next = sequence(seed);
  const lift = growth === 'bright' ? 1.9 : growth === 'night' ? 0.5 : 1;
  // Dwarf birch in autumn: rust and orange, in the bog and on the mountain; at night only its dark.
  const [red, blue] = growth === 'straw' || growth === 'fell' ? [1.7, 0.4] : growth === 'night' ? [0.7, 1.6] : [0.5, 0.56];
  return drawn(96, 64, (c) => {
    for (let i = 0; i < 46; i++) {
      const x = 12 + next() * 72;
      const y = 26 + next() * 30 + Math.abs(x - 48) * 0.35;
      const r = 5 + next() * 9;
      const blob = c.createRadialGradient(x, y, 0, x, y, r);
      const g = (52 + next() * 44) * lift;
      blob.addColorStop(0, `rgba(${g * red},${g},${g * blue},0.42)`);
      blob.addColorStop(1, `rgba(${g * red},${g},${g * blue},0)`);
      c.fillStyle = blob;
      c.fillRect(x - r, y - r, r * 2, r * 2);
    }
  });
}

/** Where the instances of one of the kit's materials stand in what has been built, and how wide each is. */
export function standing(root: Object3D, material: Material): { at: Vector3; wide: number }[] {
  const found: { at: Vector3; wide: number }[] = [];
  const matrix = new Matrix4();
  root.traverse((object) => {
    const mesh = object as InstancedMesh;
    if (mesh.material !== material || !mesh.isInstancedMesh) return;
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      found.push({ at: new Vector3().setFromMatrixPosition(matrix), wide: new Vector3().setFromMatrixScale(matrix).x });
    }
  });
  return found;
}

/** The dark where something stands on the ground: densest along the ground, and gone a hand over it. */
function skirt(): CanvasTexture {
  return drawn(96, 64, (c) => {
    c.setTransform(1, 0, 0, 0.5, 0, 20);
    const dark = c.createRadialGradient(48, 40, 0, 48, 40, 46);
    dark.addColorStop(0, 'rgba(15,31,28,0.8)');
    dark.addColorStop(1, 'rgba(15,31,28,0)');
    c.fillStyle = dark;
    c.fillRect(0, 0, 96, 88);
  });
}

/** Some pictures of one size side by side as one: the cards of a batch each show one of them. */
function sheet(pictures: CanvasTexture[]): CanvasTexture {
  const one = pictures[0]!.image as HTMLCanvasElement;
  return drawn(one.width * pictures.length, one.height, (c) => {
    for (const [i, picture] of pictures.entries()) c.drawImage(picture.image as HTMLCanvasElement, i * one.width, 0);
  });
}

/** A card of soft growth: its middle, its size, which drawing of its sheet it shows, and whether that is turned round. */
export interface Card {
  x: number;
  y: number;
  z: number;
  wide: number;
  tall: number;
  picture: number;
  turned?: boolean;
}

/**
 * How far the lens is from the path, in EL, before a chapter pulls the picture back: from a small phone held
 * sideways (8.9) by way of tablets to a large screen, and a phone held upright (24.2), where the picture is
 * narrow. The camera's height over him is always the same share of the distance: 0.15 of the picture's
 * height over the ground he stands on, through a lens of 30 degrees.
 */
const LENS = [8.9, 9.33, 10.2, 10.93, 12, 13.2, 14.4, 16.5, 19.2, 24.2];
const RISE = 0.15 * 2 * Math.tan(Math.PI / 12);
/** How far under the line he walks on a card's top stays, at the least. */
export const UNDER = 0.07;

/**
 * The line he walks on, all along a chapter: at each place the lowest that he, or anything he needs, can be.
 * That is the ground; over a pool its surface, which the glitter bubble never lets him through; in a drop
 * that the bubble takes him out of, as far down as he may fall; and at a climb's foot a little under it,
 * since the picture looks under him while he climbs. With `standing` it is where he can stand, which is
 * what the picture follows: over such a drop that is its lower edge, where the picture waits for him.
 */
export function walkLine(chapter: ChapterData): (x: number, standing?: boolean) => number {
  const STEP = 0.25;
  const from = chapter.ground[0]!.x - 40;
  const ground = Array.from({ length: Math.ceil((chapter.ground[chapter.ground.length - 1]!.x + 40 - from) / STEP) }, (_, i) => heightAt(chapter, from + i * STEP));
  const lines = [FALL_LIMIT, 0].map((fall) => ground.map((here, i) => {
    const x = from + i * STEP;
    const pool = (chapter.water ?? []).find((w) => x >= w.from && x <= w.to && here < w.y);
    if (pool) return pool.y;
    let left = here;
    let right = here;
    for (let d = 1; d <= 10 / STEP; d++) {
      left = Math.max(left, ground[i - d] ?? here);
      right = Math.max(right, ground[i + d] ?? here);
    }
    const edge = Math.min(left, right);
    return (here < edge - FALL_LIMIT ? edge - fall : here) - ((chapter.climbs ?? []).some((climb) => Math.abs(climb.x - x) < 2) ? 1.2 : 0);
  }));
  return (x, standing = false) => {
    const line = lines[standing ? 1 : 0]!;
    const i = Math.min(line.length - 1, Math.max(0, (x - from) / STEP));
    return Math.min(line[Math.floor(i)]!, line[Math.ceil(i)]!);
  };
}

/**
 * How high the top of a card may reach at x, z in front of the path, so that from wherever he stands it
 * stays under the line he walks on: never over his boots, a sweet on the ground or a checkpoint. (A hook's
 * ring, a ledge and a sweet in the air are all higher still.)
 *
 * A card that the lens sees over the path at one place, while he stands at another, lies on the straight
 * line between the two; so its top has to stay under every such line from the ground where he may stand to
 * the ground it may cover. On a level stretch and on an even slope that is its own ground and a little
 * more, the more the nearer the lens it is. Beside a step or a gap it is lower, by what the lower ground asks.
 */
export function ceilingAt(chapter: ChapterData, walk: (x: number, standing?: boolean) => number, x: number, z: number): number {
  let top = Infinity;
  for (const far of LENS) {
    // A picture is at most 1.2 times as wide as the lens is far, and an upright one under half as wide.
    const wide = far > 20 ? 0.4 : 1.2;
    for (let eye = x - wide * far; eye <= x + wide * far; eye += 0.5) {
      // Where the chapter pulls the picture back, the lens is that much further off.
      const zones = (chapter.cameras ?? []).filter((zone) => eye >= zone.from - 4 && eye <= zone.to + 4);
      const lens = far * Math.max(1, ...zones.map((zone) => zone.zoom ?? 1));
      // Further to the side than half the picture's width, the card is out of it.
      if (Math.abs(x - eye) > (wide / 2) * (lens - z)) continue;
      const share = z / lens;
      // The picture looks 2.5 EL ahead of him, either way, and further where the chapter says so.
      const lead = Math.max(2.6, ...zones.map((zone) => zone.lead ?? 0));
      const stands = Math.min(...[-1, -0.5, 0, 0.5, 1].map((ahead) => walk(eye + ahead * lead, true)));
      // What lies under the picture's lower edge is not seen: there the edge is what the card stays under.
      const over = Math.max(walk(x + (x - eye) * share / (1 - share)), stands - 0.19 * lens);
      top = Math.min(top, share * stands + (1 - share) * over);
    }
  }
  return top + RISE * z - UNDER;
}

/**
 * Where the cards in front stand, for a chapter and its growth: one every few EL, 2.6 to 5.6 EL in front of
 * the path, each with its top as high as it may be there (`ceilingAt`) or a little lower. None stands tall:
 * what passed in front of him hid him, and what he was looking for.
 */
export function tufts(chapter: ChapterData, growth: Growth): Card[] {
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const next = sequence(59);
  const walk = walkLine(chapter);
  const cards: Card[] = [];
  const kerb = growth === 'kerb';
  for (let x = from - 4 + next() * 3; x < to + 4; x += (kerb ? 2.5 : 1.4) + next() * (kerb ? 3 : 2.2)) {
    const z = 2.6 + next() * 3;
    // The straw's last drawing is what stands in water, and is kept for it.
    let picture = Math.floor(next() * (growth === 'straw' ? 3 : DRAWINGS[growth].length));
    const scale = 0.85 + next() * 0.35;
    const turned = next() < 0.5;
    const lower = Math.max(0, next() - 0.5) * 0.6;
    const thin = next() < 0.5;
    const built = surfaceAt(chapter, x);
    const wet = (chapter.water ?? []).some((w) => x >= w.from - 0.5 && x <= w.to + 0.5);
    // Sedge stands up out of the bog's water, thinly. Nothing else grows in water, on boards or indoors.
    if (wet && growth === 'straw' && thin) picture = 3;
    else if (wet || (kerb ? (built !== undefined && built !== 'paving') || (!!chapter.shop && x > chapter.shop.door - 6) : !grows(chapter, x))) continue;
    const size = DRAWINGS[growth][picture]![0] * scale;
    const top = Math.min(...[-0.5, 0, 0.5].map((side) => ceilingAt(chapter, walk, x + side * size, z))) - lower + size * CLEAR;
    cards.push({ x, y: top - size / 2, z, wide: size, tall: size, picture, turned });
  }
  return cards;
}

/** Cards of soft growth as one batch, drawn far to near: each shows one of the pictures of its sheet. */
function cards(list: Card[], map: CanvasTexture, pictures: number, order: number, fog: boolean, opacity = 1) {
  const material = new MeshBasicMaterial({ map, transparent: true, vertexColors: true, opacity, fog, depthWrite: false });
  const batch = quadBatch(list.length, material, true);
  for (const [i, card] of list.sort((a, b) => a.z - b.z).entries()) {
    batch.put(i, card.x, card.y, card.z, card.wide / 2, 0, 0, card.tall / 2);
    batch.cell(i, (card.picture + (card.turned ? 1 : 0)) / pictures, 0, (card.turned ? -1 : 1) / pictures, 1);
  }
  batch.mesh.renderOrder = order;
  batch.mesh.visible = list.length > 0;
  return batch;
}

export function foreground(chapter: ChapterData, from: number, to: number, growth: Growth | null, built: Object3D = new Group()) {
  const group = new Group();
  // A floor indoors has nothing soft in front of it.
  if (growth === null) return { group, update() {} };
  const front = tufts(chapter, growth);
  const batch = cards(front, tuftSheet(growth), DRAWINGS[growth].length, 5, false);
  group.add(batch.mesh);
  // The undergrowth far behind the path: soft dark tufts that break the line where the moss ends. Their
  // numbers are drawn as they were when the cards in front took theirs first, so that no shrub has moved.
  const next = sequence(59);
  for (let x = from - 6 + next() * 4; x < to + 6; x += 3.5 + next() * 5.5) for (let k = 0; k < 5; k++) next();
  const shrubs: Card[] = [];
  for (let x = from - 10 + next() * 4; x < to + 10 && growth !== 'kerb'; x += 1.6 + next() * 2.6) {
    const z = -8 - next() * 8;
    const wide = 2.6 + next() * 3;
    const tall = 1.4 + next() * 2.2;
    const picture = Math.floor(next() * 3);
    if (!grows(chapter, x)) continue;
    shrubs.push({ x, y: heightAt(chapter, x) - 0.3 + tall / 2, z, wide, tall, picture });
  }
  // The forest's trunks and stones stand in a dark of their own: a soft card at each foot, in the same batch.
  // It stands upright, since the ground behind the path is seen almost edge on.
  for (const trunk of standing(built, KIT.bark)) shrubs.push({ x: trunk.at.x, y: trunk.at.y + 0.6, z: trunk.at.z + trunk.wide * 1.5, wide: trunk.wide * 5, tall: 2.2, picture: 3 });
  for (const stone of standing(built, KIT.stone)) if (stone.at.z < -1) shrubs.push({ x: stone.at.x, y: stone.at.y - stone.wide * 0.1, z: stone.at.z + stone.wide * 0.8, wide: stone.wide * 2.6, tall: stone.wide * 0.9, picture: 3 });
  if (shrubs.length) group.add(cards(shrubs, sheet([...[7, 8, 9].map((seed) => blurredShrub(seed, growth)), skirt()]), 4, -1, true, 0.8).mesh);

  let leaning = false;
  /** The cards in front lean with the wind: their tops are pushed, their feet stay. Still, they stand as built. */
  function update(still: boolean): void {
    if (still && !leaning) return;
    leaning = !still;
    for (const [i, card] of front.entries()) {
      const push = windAt(card.x) * 0.05;
      batch.put(i, card.x + push / 2, card.y, card.z, card.wide / 2, 0, push / 2, card.tall / 2);
    }
  }
  return { group, update };
}
