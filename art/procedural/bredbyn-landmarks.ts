import {
  BoxGeometry, BufferGeometry, Color, CylinderGeometry, Float32BufferAttribute, Group, LatheGeometry,
  Mesh, MeshStandardMaterial, Shape, ShapeGeometry, SphereGeometry, Vector2,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Original geometry studied from the public photographs in docs/bredbyn-reference-study.md. The low white
 * nave and freestanding wooden clock tower are separate buildings, never a generic church steeple. */
export const BREDBYN_LANDMARKS = {
  church: { wide: 22, deep: 10, eaves: 6.4, ridge: 14.6, porch: 8.4 },
  tower: { x: 17, z: -1, tall: 20, wide: 7.2 },
} as const;

const PLASTER = '#e5e0cf', TRIM = '#f1ead8', WOOD = '#59402f', DARK = '#302a25';
type Point = [number, number, number];

/** Colour is in the geometry: each complete building needs just one opaque, lit draw. */
function building(name: string) {
  const parts: BufferGeometry[] = [];
  const add = (shape: BufferGeometry, colour: string, x = 0, y = 0, z = 0, turn = 0) => {
    const geometry = shape.index ? shape.toNonIndexed() : shape;
    if (geometry !== shape) shape.dispose();
    geometry.deleteAttribute('uv');
    geometry.rotateY(turn).translate(x, y, z);
    const rgb = new Color(colour), values: number[] = [];
    for (let i = 0; i < geometry.getAttribute('position').count; i++) values.push(rgb.r, rgb.g, rgb.b);
    geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
    parts.push(geometry);
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, colour: string, turn = 0) =>
    add(new BoxGeometry(w, h, d), colour, x, y, z, turn);
  const face = (points: Point[], colour: string) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3));
    geometry.setIndex(points.length === 3 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals(); add(geometry, colour);
  };
  const beam = (a: Point, b: Point, radius: number, colour: string) => {
    const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2];
    const shape = new CylinderGeometry(radius, radius, Math.hypot(dx, dy, dz), 5);
    shape.rotateZ(-Math.atan2(dx, dy));
    // The braces lie in the front plane; the roof's ridge is the only depthwise beam.
    if (dz !== 0) shape.rotateX(Math.PI / 2);
    add(shape, colour, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  };
  return { add, box, face, beam, finish() {
    const geometry = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    geometry.computeBoundingBox(); geometry.computeBoundingSphere();
    const mesh = new Mesh(geometry, new MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }));
    mesh.name = name;
    return mesh;
  } };
}
type Building = ReturnType<typeof building>;

function arch(width: number, height: number): ShapeGeometry {
  const r = width / 2, shape = new Shape();
  shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, height - r);
  shape.absarc(0, height - r, r, 0, Math.PI, false);
  shape.lineTo(-r, 0);
  return new ShapeGeometry(shape, 12);
}

function window(b: Building, x: number, y: number, z: number, turn = 0) {
  const place = (g: BufferGeometry, c: string, depth = 0) => b.add(g, c, x + Math.sin(turn) * depth, y, z + Math.cos(turn) * depth, turn);
  place(arch(1.86, 4.55), '#c6c5b8');
  place(arch(1.5, 4.22).translate(0, 0.12, 0), '#536365', 0.035);
  for (const at of [-0.48, 0, 0.48]) place(new BoxGeometry(0.055, 3.45, 0.045).translate(at, 1.85, 0), TRIM, 0.065);
  for (const up of [0.9, 1.72, 2.54, 3.36]) place(new BoxGeometry(1.5, 0.055, 0.045).translate(0, up, 0), TRIM, 0.065);
  place(new BoxGeometry(2.02, 0.16, 0.28), '#9c9b8d', 0.02);
}

/** A steep shingle roof: overlapping little facets carry sunlight without a photographic texture. */
function roof(b: Building, x: number, z: number, wide: number, deep: number, eaves: number, ridge: number, turn = 0) {
  const rise = ridge - eaves, half = deep / 2;
  const transform = ([px, py, pz]: Point): Point => [x + px * Math.cos(turn) + pz * Math.sin(turn), py, z - px * Math.sin(turn) + pz * Math.cos(turn)];
  for (const side of [-1, 1]) {
    const slope = new BoxGeometry(wide, 0.14, Math.hypot(half, rise));
    slope.rotateX(side * Math.atan2(rise, half)).translate(0, (ridge + eaves) / 2, side * half / 2);
    b.add(slope, DARK, x, 0, z, turn);
    const rows = Math.ceil(rise * 2.4), columns = Math.ceil(wide * 1.8);
    for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
      const a = col / columns * wide - wide / 2, c = (col + 1) / columns * wide - wide / 2;
      const top = row / rows, bottom = (row + 1) / rows;
      const points: Point[] = [[a, ridge - rise * top + 0.095, side * half * top], [c, ridge - rise * top + 0.095, side * half * top],
        [c - 0.025, ridge - rise * bottom + 0.065, side * (half * bottom + 0.04)], [a + 0.025, ridge - rise * bottom + 0.065, side * (half * bottom + 0.04)]];
      if (side > 0) points.reverse();
      b.face(points.map(transform), ['#665347', '#756353', '#594a40', '#806c58'][(row * 17 + col * 7) % 4]!);
    }
  }
  b.box(x, ridge + 0.03, z, wide, 0.16, 0.16, '#8b7860', turn);
}

function church(): Mesh {
  const b = building('anundsjo-church');
  b.box(0, 0.22, 0, 22.2, 0.44, 10.2, '#99968a');
  b.box(0, 3.4, 0, 22, 6.0, 10, PLASTER);
  for (const side of [-1, 1]) {
    const p: Point[] = [[side * 11, 6.4, -5], [side * 11, 6.4, 5], [side * 11, 14.6, 0]];
    if (side > 0) p.reverse();
    b.face(p, PLASTER);
    window(b, side * 11.025, 0.8, 0, side * Math.PI / 2);
  }
  roof(b, 0, 0, 22.65, 10.65, 6.4, 14.6);
  for (const x of [-1, 7]) window(b, x, 0.8, 5.015);
  for (const x of [-7, 0, 7]) window(b, x, 0.8, -5.015, Math.PI);
  // The projecting porch has its own white pointed gable, recessed doorway and steep transverse roof.
  b.box(-7.1, 1.95, 6.55, 5.2, 3.9, 3.7, PLASTER);
  b.face([[-9.7, 3.9, 8.4], [-4.5, 3.9, 8.4], [-7.1, 9.15, 8.4]], PLASTER);
  roof(b, -7.1, 6.65, 4.0, 5.65, 3.9, 9.15, Math.PI / 2);
  b.add(arch(2.04, 3.48), '#c4c4b7', -7.1, 0.1, 8.425);
  b.add(arch(1.53, 3.16), '#343c39', -7.1, 0.1, 8.455);
  b.box(-7.1, 0.065, 8.65, 2.3, 0.13, 0.85, '#aaa89b');
  // Two round finials and the taller, slender central spindle, as on the real roof ridge.
  for (const x of [-5.6, 5.6]) {
    b.beam([x, 14.6, 0], [x, 15.45, 0], 0.07, DARK);
    b.add(new SphereGeometry(0.19, 8, 6), '#70634c', x, 15.15, 0);
  }
  b.add(new LatheGeometry([[0.1, 0], [0.21, 0.45], [0.17, 0.8], [0.04, 1.9], [0, 2.5]].map(([r, y]) => new Vector2(r, y)), 8), '#665a46', 0, 14.6, 0);
  for (const x of [-11, 11]) {
    b.beam([x, 14.6, 0], [x, 15.8, 0], 0.025, DARK);
    b.beam([x - 0.32, 15.3, 0], [x + 0.32, 15.3, 0], 0.025, DARK);
  }
  b.beam([-7.1, 9.15, 8.4], [-7.1, 10.1, 8.4], 0.035, DARK);
  b.beam([-7.4, 9.78, 8.4], [-6.8, 9.78, 8.4], 0.035, DARK);
  return b.finish();
}

/** A square bell-tower roof with curved, flared eaves; its stepped profile catches the low sun. */
function towerRoof(b: Building, profile: [number, number][]) {
  for (let row = 1; row < profile.length; row++) {
    const [a, low] = profile[row - 1]!, [c, high] = profile[row]!;
    for (let side = 0; side < 4; side++) {
      const turn = side * Math.PI / 2;
      const points: Point[] = [[-a, low, a], [a, low, a], [c, high, c], [-c, high, c]];
      b.face(points.map(([x, y, z]) => [x * Math.cos(turn) + z * Math.sin(turn), y, z * Math.cos(turn) - x * Math.sin(turn)]), row % 2 ? '#69533f' : '#75604b');
    }
  }
}

function bellTower(): Mesh {
  const b = building('anundsjo-bell-tower');
  b.box(0, 0.18, 0, 6.9, 0.36, 6.9, '#918b7a');
  b.box(0, 2.28, 0, 6.6, 4.2, 6.6, WOOD);
  // Broad weathered shingle courses at the foot, kept subtle against the white nave.
  for (let y = 0.45; y < 4.3; y += 0.33) for (const side of [-1, 1]) {
    b.box(0, y, side * 3.31, 6.6, 0.055, 0.08, '#756049');
    b.box(side * 3.31, y, 0, 0.08, 0.055, 6.6, '#756049');
  }
  towerRoof(b, [[3.6, 4.3], [3.15, 4.43], [2.55, 4.75], [2.0, 5.28], [1.92, 5.55]]);
  b.box(0, 8.0, 0, 3.9, 5, 3.9, WOOD);
  for (const y of [5.65, 6.55, 10.4]) b.box(0, y, 0, 4.15, 0.17, 4.15, '#8c6b46');
  for (let side = 0; side < 4; side++) {
    const turn = side * Math.PI / 2;
    const at = (x: number, y: number, z = 2.01): Point => [x * Math.cos(turn) + z * Math.sin(turn), y, z * Math.cos(turn) - x * Math.sin(turn)];
    for (const x of [-1.3, 0, 1.3]) {
      b.add(new BoxGeometry(0.98, 2.5, 0.15), '#785136', ...at(x, 8.3), turn);
      for (const edge of [-0.5, 0.5]) b.add(new BoxGeometry(0.1, 2.65, 0.22), '#332b22', ...at(x + edge, 8.3), turn);
      // Small pale square lights beneath the carved belfry panels.
      b.add(new BoxGeometry(0.43, 0.43, 0.06), TRIM, ...at(x, 6.02), turn);
      b.add(new BoxGeometry(0.29, 0.29, 0.08), '#343c39', ...at(x, 6.02, 2.055), turn);
      b.add(new BoxGeometry(0.035, 0.31, 0.095), TRIM, ...at(x, 6.02, 2.065), turn);
      b.add(new BoxGeometry(0.31, 0.035, 0.095), TRIM, ...at(x, 6.02, 2.065), turn);
      // Curving timber brackets, six facets to an arch, rather than straight church columns.
      for (let k = 0; k < 6; k++) {
        const a = k / 6 * Math.PI, c = (k + 1) / 6 * Math.PI;
        const mid = (a + c) / 2;
        const g = new BoxGeometry(0.6 * (c - a), 0.105, 0.12);
        g.rotateZ(Math.PI / 2 - mid).translate(x + Math.cos(mid) * 0.57, 9.61 + Math.sin(mid) * 0.45, 2.08);
        b.add(g, '#98764c', 0, 0, 0, turn);
      }
    }
  }
  towerRoof(b, [[2.6, 10.5], [2.48, 10.63], [2.17, 10.8], [1.95, 11.1], [1.8, 11.55], [1.65, 12.05], [1.35, 12.45], [0.94, 12.7]]);
  b.box(0, 13.5, 0, 1.9, 1.6, 1.9, '#725039');
  for (let side = 0; side < 4; side++) {
    const turn = side * Math.PI / 2;
    for (const [r, depth, colour] of [[0.66, 0.976, '#e3d7a5'], [0.57, 1.001, '#292d2b']] as const) {
      const circle = new CylinderGeometry(r, r, 0.025, 32); circle.rotateX(Math.PI / 2).translate(0, 13.5, depth);
      b.add(circle, colour, 0, 0, 0, turn);
    }
    for (let tick = 0; tick < 12; tick++) {
      const angle = tick / 6 * Math.PI;
      const mark = new BoxGeometry(0.055, tick % 3 === 0 ? 0.16 : 0.09, 0.035);
      mark.rotateZ(-angle).translate(Math.sin(angle) * 0.49, 13.5 + Math.cos(angle) * 0.49, 1.027);
      b.add(mark, '#e0c67d', 0, 0, 0, turn);
    }
    for (const [angle, length] of [[-Math.PI / 3, 0.34], [0, 0.44]]) {
      const hand = new BoxGeometry(0.065, length, 0.04); hand.translate(0, length / 2, 0).rotateZ(angle).translate(0, 13.5, 1.055);
      b.add(hand, '#dfbe71', 0, 0, 0, turn);
    }
  }
  b.add(new LatheGeometry([[0.88, 14.3], [1.14, 14.5], [1.28, 14.95], [1.25, 15.45], [1.05, 15.85], [0.72, 16.28], [0.4, 16.8], [0.18, 17.45], [0.06, 18.15]].map(([r, y]) => new Vector2(r, y)), 12), '#665441');
  b.beam([0, 18.05, 0], [0, 20, 0], 0.026, DARK);
  b.add(new SphereGeometry(0.1, 8, 6), '#9e8852', 0, 19.6, 0);
  b.face([[0, 19.16, 0], [0.55, 19.26, 0], [0.55, 19.5, 0], [0, 19.4, 0]], '#b4a071');
  const mesh = b.finish();
  mesh.position.set(BREDBYN_LANDMARKS.tower.x, 0, BREDBYN_LANDMARKS.tower.z);
  return mesh;
}

/** Local-space landmark pair. Place behind a street opening, then scale the whole group as needed. */
export function bredbynLandmarks(): Group {
  const group = new Group(); group.name = 'bredbyn-landmarks';
  group.add(church(), bellTower());
  return group;
}
