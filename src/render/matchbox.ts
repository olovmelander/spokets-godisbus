import { BoxGeometry, type BufferGeometry, Color, Float32BufferAttribute, Shape, ShapeGeometry, SphereGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * The matchbox on the shop's step (docs/visual-audit/byn.md row 17). It stands on its end with its label to
 * the camera: a sleeve of plain blue paper with a drawn flame on it (a picture, no mark), the dark striking
 * strips down both narrow sides, and its tray pushed up out of the top, five match heads showing in it. Its
 * origin is the middle of its bottom, as the simulation's, and it fills the simulation's box: he stands on
 * the tray's end. The red ring the lace goes to is the view's, just in front of the label.
 */
export const MATCHBOX = {
  paper: '#3d5f8a',
  strip: '#3a3230',
  card: '#d2bb8e',
  wood: '#e3cd9c',
  head: '#5a3a2a',
  label: '#ece2c6',
  frame: '#2d4668',
  drawn: '#b5864e',
  flame: ['#e8822e', '#f6d05a'],
  /** How far the tray is pushed out of the top, how thick the box is, and where its label stands. */
  out: 0.3,
  deep: 0.62,
  front: 0.15,
  heads: 5,
} as const;

/** Colours on the corners, and a shade by where each corner is. */
function paint(shape: BufferGeometry, hex: string, shade?: (x: number, y: number, z: number) => number): BufferGeometry {
  const c = new Color(hex);
  const at = shape.getAttribute('position');
  const colour = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    const k = shade ? shade(at.getX(i), at.getY(i), at.getZ(i)) : 1;
    colour.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colour, 3));
  return shape;
}

/** A flat print on the label, a little in front of what it is printed on. */
const print = (shape: Shape, hex: string, layer: number): BufferGeometry =>
  paint(new ShapeGeometry(shape, 6).translate(0, 0, MATCHBOX.front + 0.002 * layer), hex);

function rounded(x0: number, y0: number, x1: number, y1: number, r: number, into: Shape = new Shape()): Shape {
  into.moveTo(x0 + r, y0);
  into.lineTo(x1 - r, y0);
  into.quadraticCurveTo(x1, y0, x1, y0 + r);
  into.lineTo(x1, y1 - r);
  into.quadraticCurveTo(x1, y1, x1 - r, y1);
  into.lineTo(x0 + r, y1);
  into.quadraticCurveTo(x0, y1, x0, y1 - r);
  into.lineTo(x0, y0 + r);
  into.quadraticCurveTo(x0, y0, x0 + r, y0);
  return into;
}

/** A flame leaning a little to the right, from its round foot at y0 to its tip, `size` across. */
function flame(x: number, y0: number, size: number): Shape {
  const s = size / 0.3;
  const p = (dx: number, dy: number): [number, number] => [x + dx * s, y0 + dy * s];
  const shape = new Shape();
  shape.moveTo(...p(0.03, 0.46));
  shape.bezierCurveTo(...p(0.07, 0.31), ...p(0.17, 0.25), ...p(0.15, 0.13));
  shape.bezierCurveTo(...p(0.14, 0.04), ...p(0.07, 0), ...p(0, 0));
  shape.bezierCurveTo(...p(-0.07, 0), ...p(-0.14, 0.04), ...p(-0.15, 0.13));
  shape.bezierCurveTo(...p(-0.16, 0.23), ...p(-0.06, 0.29), ...p(0.03, 0.46));
  return shape;
}

/** The matchbox as one shape, its colours on its corners: one draw. */
export function matchboxShape(width: number, height: number): BufferGeometry {
  const { out, deep, front } = MATCHBOX;
  const tall = height - out;
  const back = front - deep;
  const middle = (front + back) / 2;
  const parts: BufferGeometry[] = [];

  // The sleeve: its paper worn pale along its edges, lighter towards the sky and dark where it stands.
  const edge = (x: number, y: number, z: number) =>
    Number(Math.abs(Math.abs(x) - width / 2) < 1e-4) + Number(y < 1e-4 || Math.abs(y - tall) < 1e-4) + Number(Math.abs(z - front) < 1e-4 || Math.abs(z - back) < 1e-4);
  parts.push(paint(new BoxGeometry(width, tall, deep, 6, 6, 3).translate(0, tall / 2, middle), MATCHBOX.paper,
    (x, y, z) => (edge(x, y, z) >= 2 ? 1.45 : 1) * (0.88 + 0.12 * (y / tall)) * (y < 1e-4 ? 0.7 : 1)));
  // The striking strips, down both narrow sides, a margin of the paper round them.
  for (const side of [-1, 1]) {
    parts.push(paint(new BoxGeometry(0.008, tall - 0.12, deep - 0.1).translate(side * (width / 2 + 0.004), tall / 2, middle), MATCHBOX.strip));
  }

  // The tray, open towards the label as a tray is: its bottom at the back, its two sides, and its end on top.
  const half = width / 2 - 0.03;
  const wall = 0.025;
  const from = tall - 0.08;
  const trayBack = back + 0.02;
  const trayFront = front - 0.02;
  // Its inside is in its own shade, and lighter towards the open front.
  const inside = (x: number, _: number, z: number) => (Math.abs(x) < half - wall + 1e-4 && z < trayFront - 1e-4 ? 0.4 : 1);
  parts.push(paint(new BoxGeometry(2 * (half - wall), height - from, wall).translate(0, (height + from) / 2, trayBack + wall / 2), MATCHBOX.card, inside));
  for (const side of [-1, 1]) {
    parts.push(paint(new BoxGeometry(wall, height - from, trayFront - trayBack).translate(side * (half - wall / 2), (height + from) / 2, (trayFront + trayBack) / 2), MATCHBOX.card, inside));
  }
  parts.push(paint(new BoxGeometry(2 * half, wall, trayFront - trayBack).translate(0, height - wall / 2, (trayFront + trayBack) / 2), MATCHBOX.card, inside));

  // Five matches in it, at the front of the tray, their heads up against its end, none quite like the next.
  const room = 2 * (half - wall);
  const z = trayFront - 0.09;
  for (let i = 0; i < MATCHBOX.heads; i++) {
    const x = -room / 2 + (room / MATCHBOX.heads) * (i + 0.5);
    const lift = 0.012 * Math.sin(i * 2.3);
    const top = height - wall - 0.006 + lift;
    const head = 0.2;
    parts.push(paint(new BoxGeometry(0.13, top - head * 0.6 - from, 0.13).translate(x, (from + top - head * 0.6) / 2, z), MATCHBOX.wood,
      (_, y) => 0.75 + 0.25 * Math.min(1, (y - from) / 0.25)));
    parts.push(paint(new SphereGeometry(0.085, 10, 8).scale(1, head / 0.17, 1).translate(x, top - head / 2, z + 0.005), MATCHBOX.head,
      (_, y) => 0.85 + 0.65 * Math.max(0, (y - (top - head / 2)) / (head / 2))));
  }

  // The label: a cream panel in a thin frame, and on it a drawn match with its flame.
  const [x0, x1, y0, y1] = [-0.31, 0.31, tall * 0.23, tall * 0.88];
  parts.push(print(rounded(x0, y0, x1, y1, 0.06), MATCHBOX.label, 1));
  const frame = rounded(x0 + 0.035, y0 + 0.035, x1 - 0.035, y1 - 0.035, 0.035);
  frame.holes.push(rounded(x0 + 0.057, y0 + 0.057, x1 - 0.057, y1 - 0.057, 0.025));
  parts.push(print(frame, MATCHBOX.frame, 2));
  const foot = y0 + (y1 - y0) * 0.36;
  parts.push(print(rounded(-0.024, y0 + 0.08, 0.024, foot + 0.04, 0.012), MATCHBOX.drawn, 2));
  parts.push(print(flame(0, foot, 0.27), MATCHBOX.flame[0], 3));
  parts.push(print(flame(0.004, foot + 0.035, 0.15), MATCHBOX.flame[1], 4));

  return mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
}
