import { CanvasTexture, MeshStandardMaterial, SRGBColorSpace } from 'three';

/**
 * Anundsjö IF's crest, the club whose ground Olympia is: Olov's own exception to the rule of no crests, first on Bertil's
 * cap (7 November 2026, the private repository's `family/cap_crest.py`) and now on Olympia's team benches (Olov,
 * 12 November 2026: "Går det läggs till anundsjö loggan om Bertil har på sin kep i avbytarbåsen?"). Drawn as the cap's
 * is, after the club's: gold wings sweeping up from a point, and over them a shield in a gold edge, tilted, with a blue
 * corner at its top, a white band across it with AIF in gold, and its lower part blue with 1921 in gold.
 *
 * The crest's own plane is in units of a hundredth of its width, x to the right and y up, as in `cap_crest.py`.
 */

type Point = readonly [number, number];

const GOLD = '#d8a823';
const BLUE = '#28297a';
const WHITE = '#f3f1e8';
/** The white band's slope, and the two ways along and across it. */
const BAND = (34 * Math.PI) / 180;
const ALONG: Point = [Math.cos(BAND), Math.sin(BAND)];
const ACROSS: Point = [-Math.sin(BAND), Math.cos(BAND)];
const CENTRE: Point = [52, 52];

/** Two gold arms sweeping up and out from a point under the shield, their tips higher than their middle. */
export function wings(): Point[] {
  const steps = 25;
  const t = (i: number) => -1 + (2 * i) / (steps - 1);
  const outer = Array.from({ length: steps }, (_, i): Point => [50 + 50 * t(i), 4 + 58 * Math.abs(t(i)) ** 1.7]);
  const inner = Array.from({ length: steps }, (_, i): Point => [50 - 37 * t(i), 22 + 38 * Math.abs(t(i)) ** 1.7]);
  return [...outer, ...inner];
}

/** The shield, tilted up to the right as the club's is: flat top, straight sides, a point below. */
export function shield(grow = 0): Point[] {
  const [half, top, side, point] = [23 + grow, 27 + grow, 2, -33 - grow * 1.4];
  const turn = (14 * Math.PI) / 180;
  const corners: Point[] = [[-half, top], [half, top], [half, side], [0, point], [-half, side]];
  return corners.map(([x, y]): Point => [52 + x * Math.cos(turn) - y * Math.sin(turn), 54 + x * Math.sin(turn) + y * Math.cos(turn)]);
}

/** A point of the crest's plane `along` and `across` the band from its centre. */
const onBand = (along: number, across: number): Point =>
  [CENTRE[0] + ALONG[0] * along + ACROSS[0] * across, CENTRE[1] + ALONG[1] * along + ACROSS[1] * across];

/** How the crest's plane lies on its picture: `size` pixels square, the crest's 0..100 across it with a margin. */
const PIXELS = 256;
const toPicture = ([x, y]: Point): Point => [8 + x * 2.4, PIXELS - 14 - y * 2.4];

/** Draws the crest into a 2D picture: wings, gold edge, blue shield, white band, and the gold letters. */
export function drawCrest(c: CanvasRenderingContext2D): void {
  const fill = (points: readonly Point[], colour: string) => {
    c.beginPath();
    points.forEach((p, i) => {
      const [x, y] = toPicture(p);
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    });
    c.closePath();
    c.fillStyle = colour;
    c.fill();
  };
  c.clearRect(0, 0, PIXELS, PIXELS);
  fill(wings(), GOLD);
  fill(shield(3.2), GOLD);
  fill(shield(), BLUE);
  // The white band, only inside the shield: from 7 under the band's centre line to 9 over it.
  c.save();
  const inner = shield();
  c.beginPath();
  inner.forEach((p, i) => (i === 0 ? c.moveTo(...toPicture(p)) : c.lineTo(...toPicture(p))));
  c.closePath();
  c.clip();
  fill([onBand(-100, -7), onBand(100, -7), onBand(100, 9), onBand(-100, 9)], WHITE);
  c.restore();
  // The letters run at the band's slope, leaning as the crest's do.
  const letters = (text: string, centre: Point, high: number) => {
    const [x, y] = toPicture(centre);
    c.save();
    c.translate(x, y);
    c.rotate(-BAND);
    c.transform(1, 0, -0.18, 1, 0, 0);
    c.font = `bold ${Math.round(high * 2.4 / 0.72)}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = GOLD;
    c.fillText(text, 0, 0);
    c.restore();
  };
  letters('AIF', onBand(0, 1), 11);
  letters('1921', onBand(-1.5, -15), 7.6);
}

/** The crest as a material for a square picture, where there is anything to draw with (not in the tests). */
export function crestMaterial(): MeshStandardMaterial | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = PIXELS;
  canvas.height = PIXELS;
  const c = canvas.getContext('2d');
  if (!c) return null;
  drawCrest(c);
  const map = new CanvasTexture(canvas);
  map.colorSpace = SRGBColorSpace;
  map.anisotropy = 4;
  return new MeshStandardMaterial({ map, transparent: true, alphaTest: 0.35, roughness: 0.45, metalness: 0.05 });
}
