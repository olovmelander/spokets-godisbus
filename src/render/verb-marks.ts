import { CanvasTexture, Group, LinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { ChapterData } from '../sim/types';
import { verbIcon } from '../ui/verbs';
import { drawnWhile } from './idle';

/** One picture's square in the strip, in pixels. */
const CELL = 128;
/** How big a mark is in the world, in EL. */
const SIZE = 0.5;
const INK = '#33241a';

/**
 * Draws one of the page's icons (src/ui/sprite.ts, which Vite puts into the page once) onto a canvas, read from its
 * symbol, so the game's script carries no drawing of its own. Its shapes are plain: paths, circles, ellipses and
 * rounded boxes, filled or drawn in lines.
 */
function drawSymbol(c: CanvasRenderingContext2D, symbol: Element, size: number): void {
  const box = (symbol.getAttribute('viewBox') ?? '0 0 24 24').split(/[\s,]+/).map(Number);
  const scale = size / Math.max(box[2] ?? 24, box[3] ?? 24);
  c.save();
  c.scale(scale, scale);
  c.translate(-(box[0] ?? 0), -(box[1] ?? 0));
  for (const shape of symbol.querySelectorAll('path, circle, ellipse, rect')) {
    const value = (name: string) => shape.getAttribute(name);
    const num = (name: string) => Number(value(name) ?? 0);
    let path: Path2D;
    switch (shape.tagName.toLowerCase()) {
      case 'path': path = new Path2D(value('d') ?? ''); break;
      case 'circle': path = new Path2D(); path.arc(num('cx'), num('cy'), num('r'), 0, Math.PI * 2); break;
      case 'ellipse': path = new Path2D(); path.ellipse(num('cx'), num('cy'), num('rx'), num('ry'), 0, 0, Math.PI * 2); break;
      default: path = new Path2D(); path.roundRect(num('x'), num('y'), num('width'), num('height'), num('rx')); break;
    }
    const paint = (colour: string | null) => colour === null || colour === 'none' ? null : colour === 'currentColor' ? INK : colour;
    const fill = paint(value('fill') ?? 'currentColor');
    const stroke = paint(value('stroke'));
    if (fill) { c.fillStyle = fill; c.fill(path); }
    if (stroke) {
      c.strokeStyle = stroke;
      c.lineWidth = Number(value('stroke-width') ?? 1);
      c.lineCap = (value('stroke-linecap') ?? 'butt') as CanvasLineCap;
      c.lineJoin = (value('stroke-linejoin') ?? 'miter') as CanvasLineJoin;
      c.setLineDash((value('stroke-dasharray') ?? '').split(/[\s,]+/).filter(Boolean).map(Number));
      c.stroke(path);
    }
  }
  c.restore();
}

/**
 * Over each thing Använd can act on, the picture of what he will do there, on a cream disc with a gold rim
 * (docs/ux-audit/in-play.md row 6): the same picture as on the button. It bobs a little, and stays still with less
 * motion; it is gone once the thing has been used. The pictures share one strip, drawn when the chapter is built.
 */
export function buildVerbMarks(chapter: ChapterData, doc: Document = document) {
  const group = new Group();
  const spots = chapter.spots ?? [];
  const icons = [...new Set(spots.map((spot) => verbIcon(spot.verb, spot.word)))];
  const canvas = doc.createElement('canvas');
  canvas.width = CELL * Math.max(1, icons.length);
  canvas.height = CELL;
  const c = canvas.getContext('2d')!;
  for (const [i, icon] of icons.entries()) {
    const middle = i * CELL + CELL / 2;
    c.beginPath();
    c.arc(middle, CELL / 2, CELL * 0.45, 0, Math.PI * 2);
    c.fillStyle = 'rgba(51, 36, 26, 0.55)';
    c.fill();
    c.beginPath();
    c.arc(middle, CELL / 2, CELL * 0.43, 0, Math.PI * 2);
    c.fillStyle = '#ffd76a';
    c.fill();
    c.beginPath();
    c.arc(middle, CELL / 2, CELL * 0.37, 0, Math.PI * 2);
    c.fillStyle = '#fbf4e4';
    c.fill();
    const symbol = doc.getElementById(`i-${icon}`);
    const size = CELL * 0.5;
    if (symbol) {
      c.save();
      c.translate(middle - size / 2, CELL / 2 - size / 2);
      drawSymbol(c, symbol, size);
      c.restore();
    } else {
      // A page without the sprite (a test's own page): the disc with a gold seed.
      c.beginPath();
      c.arc(middle, CELL / 2, CELL * 0.12, 0, Math.PI * 2);
      c.fillStyle = '#e0a526';
      c.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.name = 'verb-marks';
  texture.colorSpace = SRGBColorSpace;
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  // A little under full white, so that the paper never reaches the glow (GLOW_FROM in ./grade.ts) and bleeds. It
  // writes its depth, so High's soft background (./depth-blur.ts) leaves it sharp, as the thing it stands over.
  const material = new MeshBasicMaterial({ map: texture, color: 0xdedede, transparent: true, alphaTest: 0.05, fog: false });
  const meshes = spots.map((spot) => {
    const geometry = new PlaneGeometry(SIZE, SIZE);
    // This spot's picture in the strip.
    const cell = icons.indexOf(verbIcon(spot.verb, spot.word));
    const uv = geometry.getAttribute('uv');
    for (let k = 0; k < uv.count; k++) uv.setX(k, (cell + uv.getX(k)) / icons.length);
    const mark = new Mesh(geometry, material);
    mark.name = `verb-mark-${spot.id}`;
    mark.renderOrder = 10;
    mark.position.set(spot.at.x, spot.at.y + 1.5, 0.2);
    group.add(mark);
    return mark;
  });
  function update(flags: ReadonlySet<string>, clock: number, calm: boolean): void {
    for (const [i, spot] of spots.entries()) {
      const mark = meshes[i]!;
      const ready = !flags.has(spot.id) && (spot.needs === undefined || flags.has(spot.needs));
      mark.scale.setScalar(ready ? (calm ? 1 : 1 + 0.05 * Math.sin(clock * 4 + i)) : 0);
      drawnWhile(mark, ready);
      mark.position.y = spot.at.y + 1.5 + (calm ? 0 : Math.sin(clock * 2 + i) * 0.08);
    }
  }
  return { group, update };
}
