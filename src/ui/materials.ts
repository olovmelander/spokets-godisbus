/**
 * The UI's materials (docs/ux-audit/style-and-sound.md, "Materials"): the tooth of Moa's drawing paper and the grain
 * of Pappa's linden, each drawn once at boot in a small canvas and set on the page as a CSS image. Both are brown
 * marks on nothing, laid over the colour of whatever wears them, so the same grain shows through cream paper,
 * bare linden and red paint alike. Nothing is fetched for them.
 */
import type { PlaceId } from '../sim/types';

/** The same marks every time, so every device draws the same paper and the same wood. */
function dice(seed: number): () => number {
  let state = seed;
  return () => (state = (state * 16807) % 2147483647) / 2147483647;
}

/** A 128×128 tile of warm specks: the paper darkens by at most 7 %. */
function paper(doc: Document): string | null {
  const canvas = doc.createElement('canvas');
  canvas.width = canvas.height = 128;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  const roll = dice(4711);
  const tooth = pen.createImageData(128, 128);
  for (let i = 0; i < tooth.data.length; i += 4) {
    tooth.data[i] = 112;
    tooth.data[i + 1] = 84;
    tooth.data[i + 2] = 48;
    tooth.data[i + 3] = Math.floor(roll() * roll() * 18);
  }
  pen.putImageData(tooth, 0, 0);
  return canvas.toDataURL('image/png');
}

/** A 64×64 tile of paper-coloured specks: where Moa's wax crayon skipped over the paper's tooth. */
function crayon(doc: Document): string | null {
  const canvas = doc.createElement('canvas');
  canvas.width = canvas.height = 64;
  const pen = canvas.getContext('2d');
  if (!pen) return null;
  const roll = dice(2016);
  const skips = pen.createImageData(64, 64);
  for (let i = 0; i < skips.data.length; i += 4) {
    skips.data[i] = 251;
    skips.data[i + 1] = 244;
    skips.data[i + 2] = 228;
    // Most of the wax holds; here and there the paper shows through it.
    skips.data[i + 3] = roll() < 0.1 ? Math.floor(70 + roll() * 110) : 0;
  }
  pen.putImageData(skips, 0, 0);
  return canvas.toDataURL('image/png');
}

/** A 256×96 tile of 46 wavering fibres along its length: the linden's grain. */
function linden(doc: Document): string | null {
  const canvas = doc.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const knife = canvas.getContext('2d');
  if (!knife) return null;
  const roll = dice(1942);
  for (let fibre = 0; fibre < 46; fibre++) {
    const y = roll() * 96;
    const wave = 1 + roll() * 2.5;
    // Whole waves along the tile, so the grain runs on across the seam.
    const bend = (2 * Math.PI * (1 + Math.floor(roll() * 3))) / 256;
    knife.strokeStyle = `rgb(90 58 30 / ${(0.05 + roll() * 0.13).toFixed(3)})`;
    knife.lineWidth = 0.6 + roll() * 1.4;
    knife.beginPath();
    for (let x = 0; x <= 256; x += 4) {
      const at = y + Math.sin(x * bend + fibre) * wave;
      if (x === 0) knife.moveTo(x, at);
      else knife.lineTo(x, at);
    }
    knife.stroke();
  }
  return canvas.toDataURL('image/png');
}

/** Sets the paper's tooth, the wood's grain and the crayon's wax on the page as `--grain`, `--woodgrain` and `--wax`.
 *  Without a 2D canvas
 *  paper and wood stay flat, and nothing else changes. */
export function applyMaterials(doc: Document): void {
  try {
    const tooth = paper(doc);
    const grain = linden(doc);
    const wax = crayon(doc);
    if (tooth) doc.documentElement.style.setProperty('--grain', `url(${tooth})`);
    if (grain) doc.documentElement.style.setProperty('--woodgrain', `url(${grain})`);
    if (wax) doc.documentElement.style.setProperty('--wax', `url(${wax})`);
  } catch {
    // A canvas that can't be read back (a privacy setting) leaves the materials flat.
  }
}

/**
 * The place's own shade, which dims it under a panel (row 15): the shadows' colour in each place, so the garden's
 * greens and the forest's blues stay themselves round the paper instead of going one muddy brown.
 */
export const PLACE_SHADE: Record<PlaceId, string> = {
  garden: '36 64 74',
  forest: '22 50 58',
  bog: '58 51 64',
  mountain: '58 52 96',
  dusk: '12 20 48',
  village: '42 52 68',
  home: '64 52 44',
};

/** Dims every panel in the shade of the place it lies over; a course with no place keeps the garden's. */
export function applyPlace(doc: Document, place: PlaceId | undefined): void {
  if (place) doc.documentElement.style.setProperty('--place-shade', PLACE_SHADE[place]);
}
