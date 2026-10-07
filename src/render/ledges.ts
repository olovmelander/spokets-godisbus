import {
  BoxGeometry, Color, ConeGeometry, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, LatheGeometry, Mesh, MeshStandardMaterial,
  Object3D, OctahedronGeometry, SphereGeometry, Vector2, Vector3, type BufferGeometry,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LEDGE_THICK } from '../sim/constants';
import type { Ledge, LedgeLook, PlaceId } from '../sim/types';
import { drawnWhile } from './idle';
import { ROD_COLOUR, rodShape, type Rod } from './lines';

/**
 * The ledges (docs/level-design.md): thin floors that he jumps up through and stands on. Each stands just
 * behind the plane he moves in, with its front edge on it, so that he passes in front of one that is higher
 * than his feet and stands on its edge once he is up.
 *
 * Nothing floats: a leaf has its stalk, a bough and a bracket fungus their young stem, a nest its fork, a shelf
 * of rock its pillar, a plank the batten that holds it to the wall, a trestle its legs. What holds a ledge is
 * part of its shape and goes far down, into the ground under it.
 *
 * A chapter's ledges lie in a few places far apart, one for each side way. **A place is one mesh:** its
 * ledges of every look, what holds each of them, and the cords, lines and poles its rings hang from, all one
 * shape with their colours on their corners. It is drawn only while it is in sight. So a side way costs a
 * picture one draw call while he is at it and none while he is not, however many ledges it has. A ledge that
 * waits for a flag grows out when the flag is set: those few are drawn as instances beside the rest.
 */
const DEPTH = 0.9;
/** How far down a stalk, a stem or a pillar goes: further than any ledge is above its ground. */
const DOWN = 14;

/** A shape one EL wide, its top at 0 and its front edge at the play plane; the ledge and what holds it. */
const together = (...parts: BufferGeometry[]): BufferGeometry => mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)));
/** An upright round thing from `DOWN` below the ledge to `rise` above it, behind the ledge's middle. */
const upright = (top: number, bottom: number, sides: number, rise: number, z: number): BufferGeometry =>
  new CylinderGeometry(top, bottom, DOWN + rise, sides).translate(0, (rise - DOWN) / 2 - LEDGE_THICK * 0.6, z);

/**
 * A ledge's look. `shape` is the ledge itself, one EL wide: it is drawn as wide as the ledge. `holder` is what
 * holds it, at its own size whatever the ledge's width, with its colours on its corners: a stem drawn wider for a
 * wider ledge was a board with a cut top (visual audit, granskogen row 4). A place may have its own colour.
 */
interface Look {
  colour: string;
  roughness: number;
  flat?: boolean;
  /** A shape that paints its own corners keeps their colours: a fungus has its bands. */
  shape: (place?: PlaceId) => BufferGeometry;
  holder?: (width: number, place?: PlaceId) => BufferGeometry;
  colours?: Partial<Record<PlaceId, string>>;
}

/**
 * A young tree's stem behind a ledge's middle, its top out of every picture: its bark in strips from `dark` to
 * `light` round it, and the dead twigs of its lowest whorls standing out from it above the ledge, back from the
 * plane he moves in.
 */
function stem(radius: number, z: number, dark: string, light: string): BufferGeometry {
  const trunk = upright(radius * 0.8, radius, 9, 16, z);
  const from = new Color(dark);
  const at = trunk.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    // Each of its nine sides a strip of its own tone; the seam's corner is the first side's.
    tint.set(light).lerp(from, draws((i % 10) % 9)[0]);
    colours.set([tint.r, tint.g, tint.b], i * 3);
  }
  trunk.setAttribute('color', new Float32BufferAttribute(colours, 3));
  // A dead twig droops out from the stem, back from the plane, with two twiglets off it.
  const twigs = [1.3, 2.7].flatMap((up, whorl) => [-1, 1].flatMap((side) => {
    const long = 0.32 + 0.14 * whorl;
    const twig = (length: number, thick: number, from: number, turn: number) => painted(new CylinderGeometry(thick * 0.4, thick, length, 3)
      .translate(0, length / 2, 0).rotateZ(turn).translate(0, from, 0), '#857a6d');
    return [twig(long, 0.025, 0, 0), twig(long * 0.4, 0.012, long * 0.45, -0.7), twig(long * 0.35, 0.012, long * 0.7, 0.7)].map((part) =>
      part.rotateZ(-side * (2.0 - 0.1 * whorl)).rotateY(side * 0.5).translate(side * radius * 0.6, up + 0.2 * side, z - radius * 0.3));
  }));
  return together(trunk, ...twigs);
}

const LOOKS: Record<LedgeLook, Look> = {
  // A sawn board: the end of a deck plank, a sill, a shelf. A batten under its back edge holds it to the wall.
  plank: {
    colour: '#c9ae84', roughness: 0.75,
    shape: () => together(
      new BoxGeometry(1, LEDGE_THICK, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
      new BoxGeometry(0.86, 0.3, 0.12).translate(0, -LEDGE_THICK - 0.15, -DEPTH + 0.1),
    ),
  },
  // A board on four legs, where there is no wall to hold it: a step, a bench, a table on a floor. Its legs
  // stand back from the plane he moves in, so he walks past in front of them.
  trestle: {
    colour: '#c9ae84', roughness: 0.75,
    shape: () => together(
      new BoxGeometry(1, LEDGE_THICK, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
      new BoxGeometry(0.9, 0.12, 0.05).translate(0, -LEDGE_THICK - 0.06, -0.3),
      ...[-0.43, 0.43].flatMap((x) => [-0.3, -DEPTH + 0.1].map((z) => new BoxGeometry(0.06, DOWN, 0.08).translate(x, -LEDGE_THICK - DOWN / 2, z))),
    ),
  },
  // A broad leaf held out flat on its stalk: thick in the middle, thin at its rim.
  leaf: {
    colour: '#5f9140', roughness: 0.8,
    shape: () => new SphereGeometry(0.5, 14, 6).scale(1, 0.17, DEPTH).translate(0, -0.085, -DEPTH / 2),
    holder: () => painted(upright(0.035, 0.06, 6, 0, -DEPTH / 2), '#5f9140'),
  },
  // A bough lying along the path, thickest where it leaves its stem and thinner towards both ends, its top a
  // clean line where he stands. What hangs from it is the place's: a spruce's branchlets in the forest, a dead
  // pine's grey stubs in the bog, a birch's leaves in the garden.
  branch: {
    colour: '#6e5238', roughness: 0.95, colours: { bog: '#a9a69e' },
    shape: () => together(
      new CylinderGeometry(0.05, 0.1, 0.5, 9).rotateZ(Math.PI / 2).translate(-0.25, -0.08, -0.32),
      new CylinderGeometry(0.05, 0.1, 0.5, 9).rotateZ(-Math.PI / 2).translate(0.25, -0.08, -0.32),
    ),
    holder: (width, place) => {
      const bog = place === 'bog';
      const hanging = bog ? stubs(width) : place === 'garden' ? leaves(width) : needles(width);
      return together(bog ? stem(0.24, -0.72, '#86837b', '#aeaba3') : stem(0.3, -0.72, '#4f3f32', '#7d6753'), ...hanging);
    },
  },
  // A bracket fungus standing out from a young stem (the look was a plate of bark, and the chapters still call
  // it that): a half-round shelf, level on top where he stands, thick where it grows from the stem, with a
  // rounded lip. In the forest it is the spruce's, dark on top with a rust-red band and a cream rim, cream
  // under it; in the garden the birch's, pale brown over white (visual audit, granskogen row 4).
  bark: {
    colour: '#8a735c', roughness: 0.9,
    shape: (place) => bracket(place === 'garden' ? BIRCH_FUNGUS : SPRUCE_FUNGUS),
    holder: () => stem(0.33, -0.86, '#5c4a3a', '#8a735c'),
  },
  // A nest in the fork of a stem: a shallow bowl of twigs, moss inside, as wide as the ledge. It leans towards
  // the camera, so that its front rim is the line where he stands and its back rim stands up behind him; two
  // boughs of the stem hold it from under.
  nest: {
    colour: '#6b5236', roughness: 1,
    shape: nest,
    holder: (width) => together(stem(0.3, -1.12, '#4f3f32', '#7d6753'), ...loose(width), ...woven(width), ...[-1, 1].map((side) => fork(side * Math.min(0.32 * width, 0.6)))),
  },
  // A shelf of rock on the pillar it has weathered out of. This is its stand-in: the mountain kit has each
  // shelf as a slab on its own blocks, and puts it here once it has arrived (`install` below).
  stone: {
    colour: '#9a9da0', roughness: 1, flat: true,
    shape: () => together(
      // Its lower rim is the wider one: it is set back by that, so that nothing of it stands in front of him.
      new CylinderGeometry(0.5, 0.56, LEDGE_THICK * 1.3, 7).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK * 0.65, -0.56 * DEPTH),
      upright(0.3, 0.42, 7, 0, -0.56 * DEPTH - 0.08).scale(1, 1, 0.8),
    ),
  },
};

export const LEDGE_LOOKS = Object.keys(LOOKS) as LedgeLook[];
/** How long a ledge that waits for a flag takes to come into being. */
const GROW = 0.35;
/** Ledges and rods further apart than this are in different places: no side way has a gap that wide. */
const APART = 10;

const tint = new Color();
/** A shape with one colour on all its corners. */
function painted(shape: BufferGeometry, colour: string): BufferGeometry {
  tint.set(colour);
  const corners = shape.getAttribute('position').count;
  const colours = new Float32Array(corners * 3);
  for (let i = 0; i < corners; i++) colours.set([tint.r, tint.g, tint.b], i * 3);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return shape;
}

/** A shape whose colour goes from `foot` where y is 0 to `tip` where y is `tall`. */
function shaded(shape: BufferGeometry, foot: string, tip: string, tall: number): BufferGeometry {
  const from = new Color(foot);
  const to = new Color(tip);
  const at = shape.getAttribute('position');
  const colours = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    tint.copy(from).lerp(to, Math.min(1, Math.max(0, at.getY(i) / tall)));
    colours.set([tint.r, tint.g, tint.b], i * 3);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  return shape;
}

/** Three numbers from 0 to 1 for the `i`th thing along a ledge: the same each time it is built. */
function draws(i: number): [number, number, number] {
  const at = (k: number) => {
    const s = Math.sin((i + 1) * 12.9898 * k + k * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  return [at(0.37), at(0.61), at(0.83)];
}

/** Where twigs leave a bough `width` wide, about `apart` from each other and a little unevenly, each with its own numbers. */
function twigs(width: number, apart: number): { x: number; draw: [number, number, number] }[] {
  const count = Math.max(2, Math.round((width - 0.2) / apart));
  return Array.from({ length: count }, (_, i) => {
    const draw = draws(i);
    return { x: -width / 2 + 0.1 + ((i + 0.5 + (draw[2] - 0.5) * 0.6) * (width - 0.2)) / count, draw };
  });
}

/**
 * A spruce bough's branchlets, hanging from it as a Norrland spruce's do: tufts of narrow sprays fanning down
 * from its twigs, some before the bough and some behind it, longest near the stem and shorter towards the
 * bough's ends, dark at the bough and paler at the tips. Nothing of them is above the line where he stands or in
 * front of the plane he moves in.
 */
function needles(width: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (const [n, { x, draw: [many, turn] }] of twigs(width, 0.26).entries()) {
    const front = n % 2 === 1;
    const near = 1 - Math.abs(x) / (width / 2 + 0.3);
    const strands = 4 + Math.floor(many * 3);
    for (let k = 0; k < strands; k++) {
      const [long, wide] = draws(n * 7 + k + 11);
      const spread = (k / (strands - 1) - 0.5) * 1.2 + (turn - 0.5) * 0.4;
      const tall = (0.16 + 0.34 * near) * (0.65 + 0.5 * long) * (1 - 0.3 * Math.abs(spread));
      const spray = shaded(new ConeGeometry(0.035 + 0.025 * wide, tall, 4, 1, true).translate(0, tall / 2, 0), front ? '#2a4f31' : '#1d3b26', front ? '#4c7444' : '#335a37', tall);
      parts.push(spray.rotateX(front ? Math.PI - 0.25 : 0.45 - Math.PI).rotateZ(spread).translate(x + (k - strands / 2) * 0.02, -0.09, front ? -0.24 : -0.5));
    }
  }
  return parts;
}

/** A dead pine's bough: the grey stubs of its twigs, a few to each side, their tips under the line where he stands. */
function stubs(width: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (let x = -width / 2 + 0.12, i = 0; x < width / 2 - 0.08; x += 0.7, i++) {
    const front = i % 2 === 1;
    parts.push(painted(new CylinderGeometry(0.015, 0.04, 0.35, 5).rotateX(front ? 1.1 : -1.1).translate(x, -0.11, front ? -0.3 : -0.6), '#8d8a81'));
  }
  return parts;
}

/** A birch's leaves in early autumn, green and the first of them yellow. */
const BIRCH_LEAVES = ['#6f9a34', '#86a83a', '#5e8a30', '#d9b23a', '#7c9c36', '#94a63c', '#e2c04a'];

/**
 * A birch bough's leaves: small and pointed, two or three to a twig, fanning down from it, some before the
 * bough and some behind it. They are flat, with a fold down the middle.
 */
function leaves(width: number): BufferGeometry[] {
  const parts: BufferGeometry[] = [];
  for (const [n, { x, draw: [many, turn] }] of twigs(width, 0.36).entries()) {
    const front = n % 2 === 1;
    const count = 2 + Math.floor(many * 2);
    for (let k = 0; k < count; k++) {
      const [big, hue] = draws(n * 5 + k + 23);
      const size = 0.1 + 0.06 * big;
      const spread = (k / (count - 1) - 0.5) * 1.8 + (turn - 0.5) * 0.6;
      const leaf = painted(new OctahedronGeometry(1, 0).scale(size * 0.75, size * 1.2, size * 0.12).translate(0, -size * 1.2, 0), BIRCH_LEAVES[Math.floor(hue * BIRCH_LEAVES.length)]!);
      parts.push(leaf.rotateX(front ? -0.3 : 0.45).rotateZ(spread).translate(x, -0.1, front ? -0.22 : -0.52));
    }
  }
  return parts;
}

/** A nest's twigs, its rim's and its moss's colours, from under it round to its middle. */
const NEST: [number, number, string][] = [
  [0.02, -0.34, '#4a3a2a'], [0.3, -0.31, '#5a4430'], [0.4, -0.24, '#6e5538'], [0.46, -0.14, '#57432e'], [0.5, -0.04, '#7f6443'],
  [0.5, 0.04, '#5f4a32'], [0.48, 0.11, '#937552'], [0.44, 0.14, '#7a5f40'], [0.38, 0.07, '#57472f'], [0.32, 0.01, '#55703a'],
  [0.15, 0, '#4f6a36'], [0.02, 0, '#4f6a36'],
];
/** How far a nest leans towards the camera: its height falls by this for each EL forward. */
const LEAN = 0.3;

/**
 * A nest one EL wide, from the ledge's back to its front edge: a bowl turned from its profile, its twigs a little
 * lighter or darker all round it, leaning towards the camera.
 */
function nest(): BufferGeometry {
  const shape = new LatheGeometry(NEST.map(([out, y]) => new Vector2(out, y)), 28);
  const at = shape.getAttribute('position');
  const colour = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    const [out, , hex] = NEST[i % NEST.length]!;
    // The twigs of each turn are their own, lighter or darker, and its wall and rim bulge in and out a little:
    // the moss inside is one, and its front is where the ledge's is.
    const [light, , bulge] = draws(Math.floor(i / NEST.length) % 28);
    const twigs = out > 0.39 || at.getY(i) < -0.05;
    tint.set(hex).multiplyScalar(twigs ? 0.7 + 0.6 * light : 1);
    colour.set([tint.r, tint.g, tint.b], i * 3);
    const grow = twigs ? 1 + 0.08 * (bulge - 0.5) * (1 - Math.max(0, at.getZ(i) / out) ** 4) : 1;
    // It leans: its front comes down to the line where he stands, its back goes up.
    at.setXYZ(i, at.getX(i) * grow, at.getY(i) - LEAN * at.getZ(i), at.getZ(i) * grow);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colour, 3));
  shape.computeVertexNormals();
  return shape.scale(1, 1, DEPTH).translate(0, 0, -DEPTH / 2);
}

/** A few loose twigs standing out from round the back of a nest `width` wide, at their own size. */
function loose(width: number): BufferGeometry[] {
  return Array.from({ length: 12 }, (_, i) => {
    const [long, lift] = draws(i + 40);
    const round = Math.PI * (0.62 + (0.76 * i) / 11);
    const [x, z] = [0.47 * Math.sin(round), 0.47 * Math.cos(round)];
    return painted(new CylinderGeometry(0.006, 0.012, 0.18 + 0.14 * long, 3).translate(0, 0.09 + 0.07 * long, 0).rotateZ(-1.2 + 0.5 * lift)
      .rotateY(Math.atan2(-z * DEPTH, x * width)).translate(x * width, 0.12 - LEAN * z, z * DEPTH - DEPTH / 2), '#7a5f40');
  });
}

const TWIGS = ['#6b5236', '#8a6c48', '#4f3d2a', '#7a5f40'];
/** Twigs laid round the outside of a nest `width` wide, at their own size, each across the ones under it. */
function woven(width: number): BufferGeometry[] {
  return Array.from({ length: 22 }, (_, i) => {
    const [round, high, slope] = draws(i + 60);
    const turn = Math.PI * (2 * round - 1);
    const [x, z] = [0.47 * Math.sin(turn), 0.47 * Math.cos(turn)];
    const long = 0.35 + 0.25 * slope;
    // Along the wall where it lies: its way round the nest, as wide and deep as the nest is. Where that way
    // slants, its middle is set back so that neither end comes in front of the plane he moves in.
    const way = Math.atan2(x * DEPTH, z * width);
    const back = Math.min(z * DEPTH - DEPTH / 2, -(long / 2) * Math.abs(Math.sin(way)) - 0.02);
    return painted(new CylinderGeometry(0.012, 0.018, long, 4).rotateZ(-Math.PI / 2).rotateZ((slope - 0.5) * 0.7)
      .rotateY(way).translate(x * width, -0.2 + 0.24 * high - LEAN * z, back), TWIGS[i % 4]!);
  });
}

/** A bough of a stem that a nest sits on: from the stem behind it out to under the nest, `x` to one side. */
function fork(x: number): BufferGeometry {
  const from = new Vector3(0, -1.1, -1.12);
  const to = new Vector3(x, -0.17, -0.5);
  const along = to.clone().sub(from);
  return painted(new CylinderGeometry(0.035, 0.06, along.length(), 6).rotateX(Math.PI / 2).lookAt(along).translate((from.x + to.x) / 2, (from.y + to.y) / 2, (from.z + to.z) / 2), '#5c4a3a');
}

/** A bracket fungus's colours: under it, at its rim, the band inside the rim, its top, its rings, and its top at the stem. */
interface Fungus { under: string; rim: string; band: string; top: string; ring: string; old: string }
/** The spruce's red-belted bracket, as the old forest has it. */
const SPRUCE_FUNGUS: Fungus = { under: '#cbb88d', rim: '#efe2bd', band: '#8e4a2c', top: '#5e4a3c', ring: '#4a3c33', old: '#3a322d' };
/** The birch's bracket: pale brown over a thick white rim. */
const BIRCH_FUNGUS: Fungus = { under: '#e4dccb', rim: '#f6f1e4', band: '#d9cdb5', top: '#8f6f4f', ring: '#7a5d42', old: '#6b5440' };

/**
 * A bracket fungus one EL wide, from the ledge's back to its front edge: its profile turned half round, from
 * under it at the stem out round its thick lip and back over its level top, with its bands on the profile's
 * points. Its edge waves a little, and its front is broader than a half round, so that it is under him nearly as
 * far out as the ledge goes.
 */
function bracket(colours: Fungus): BufferGeometry {
  const profile: [number, number, keyof Fungus][] = [
    [0.02, -0.25, 'under'], [0.45, -0.235, 'under'], [0.8, -0.215, 'under'], [0.92, -0.2, 'rim'], [0.98, -0.17, 'rim'], [1, -0.12, 'rim'],
    [0.995, -0.075, 'band'], [0.975, -0.04, 'band'], [0.94, -0.015, 'top'], [0.86, -0.003, 'top'], [0.74, 0, 'ring'], [0.62, 0, 'top'],
    [0.5, 0, 'ring'], [0.38, 0, 'old'], [0.02, 0, 'old'],
  ];
  const shape = new LatheGeometry(profile.map(([out, y]) => new Vector2(out, y)), 18, -Math.PI / 2, Math.PI);
  const at = shape.getAttribute('position');
  const colour = new Float32Array(at.count * 3);
  for (let i = 0; i < at.count; i++) {
    // Each turn of the profile is its points in order.
    tint.set(colours[profile[i % profile.length]![2]]);
    colour.set([tint.r, tint.g, tint.b], i * 3);
    // How far round it has turned, from its left end through its front to its right: the edge waves between
    // its ends and its front, which are where the ledge's are, and the front is eased out towards the ends.
    const out = Math.hypot(at.getX(i), at.getZ(i));
    const round = Math.atan2(at.getX(i), at.getZ(i));
    const wave = 1 - 0.022 * (1 - Math.cos(8 * round));
    at.setXYZ(i, out * wave * Math.sin(round), at.getY(i), out * wave * Math.max(0, Math.cos(round)) ** 0.6);
  }
  shape.setAttribute('color', new Float32BufferAttribute(colour, 3));
  shape.computeVertexNormals();
  return shape.scale(0.5, 1, DEPTH).translate(0, 0, -DEPTH);
}

/** A look as a shape one ledge wide, at the origin: the ledge in its place's colour, and what holds it. */
function lookShape(look: LedgeLook, width: number, place?: PlaceId): BufferGeometry {
  const how = LOOKS[look];
  const made = how.shape(place).scale(width, 1, 1);
  const ledge = made.hasAttribute('color') ? made : painted(made, (place && how.colours?.[place]) ?? how.colour);
  const shape = how.holder ? together(ledge, how.holder(width, place)) : ledge;
  // A look with flat faces: the shape has no shared corners, so each face gets its own normal.
  if (how.flat) shape.computeVertexNormals();
  return shape;
}

/** A ledge as a shape where it lies: as wide as it is, with what holds it. */
function ledgeShape(ledge: Ledge, place?: PlaceId): BufferGeometry {
  return lookShape(ledge.look, ledge.width, place).translate(ledge.x, ledge.y, 0);
}

interface Piece { from: number; to: number; ledge?: number; rod?: Rod }

/**
 * A ledge of rock as the mountain kit has it (src/render/mountain-kit.ts), where it lies: with a normal, a UV
 * and a colour on each corner, and no index, as the shapes built here have. Null: nothing is drawn for this
 * ledge, since it is a step of the rock drawn at another. Undefined: the kit has none, and its stand-in stays.
 */
export type Carved = (ledge: number) => BufferGeometry | null | undefined;

/**
 * The places a chapter's ledges and rods lie in: a run of them with no gap wider than `APART`, one for each
 * side way. Each is given as the numbers of its ledges and as its rods.
 */
export function ledgePlaces(ledges: readonly Ledge[], rods: readonly Rod[] = []): { ledges: number[]; rods: Rod[] }[] {
  const pieces: Piece[] = [
    ...ledges.map((ledge, i) => ({ from: ledge.x - ledge.width / 2, to: ledge.x + ledge.width / 2, ledge: i })),
    ...rods.map((rod) => ({ from: Math.min(rod.from.x, rod.to.x), to: Math.max(rod.from.x, rod.to.x), rod })),
  ].sort((a, b) => a.from - b.from);
  const places: { ledges: number[]; rods: Rod[] }[] = [];
  let reach = -Infinity;
  for (const piece of pieces) {
    if (piece.from - reach > APART) places.push({ ledges: [], rods: [] });
    const here = places.at(-1)!;
    if (piece.ledge !== undefined) here.ledges.push(piece.ledge);
    if (piece.rod) here.rods.push(piece.rod);
    reach = Math.max(reach, piece.to);
  }
  return places;
}

export function buildLedges(ledges: readonly Ledge[], rods: readonly Rod[] = [], site?: PlaceId) {
  const group = new Group();
  group.name = 'ledges';
  const place = new Object3D();
  /** How far each ledge has come into being, from 0 to 1. */
  const there: number[] = ledges.map((ledge) => (ledge.needs === undefined ? 1 : 0));
  /** One material for every place: the colours are on the corners. */
  const solid = new MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
  const waiting: { mesh: InstancedMesh; at: number[] }[] = [];
  const solids: { mesh: Mesh; always: number[]; rods: Rod[] }[] = [];
  /** A place's one shape: its ledges that are always there, each as the kit has it or as its look, and its rods. */
  const shapeOf = (always: readonly number[], lines: readonly Rod[], carved?: Carved): BufferGeometry => {
    const parts = [
      ...always.flatMap((i) => {
        const rock = ledges[i]!.look === 'stone' ? carved?.(i) : undefined;
        return rock === null ? [] : [rock ?? ledgeShape(ledges[i]!, site)];
      }),
      ...lines.map((rod) => painted(rodShape(rod), ROD_COLOUR)),
    ];
    const shape = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    shape.computeBoundingSphere();
    return shape;
  };

  for (const [n, here] of ledgePlaces(ledges, rods).entries()) {
    // What is always there: one shape, one mesh, drawn while the place is in sight.
    const always = here.ledges.filter((i) => ledges[i]!.needs === undefined);
    if (always.length + here.rods.length > 0) {
      const mesh = new Mesh(shapeOf(always, here.rods), solid);
      mesh.name = `ledges:${n}`;
      mesh.userData.ledges = always;
      mesh.userData.rods = here.rods.length;
      group.add(mesh);
      solids.push({ mesh, always, rods: here.rods });
    }
    // Those that wait for a flag grow out when it is set: instances, one mesh for each look among them.
    for (const look of LEDGE_LOOKS) {
      const at = here.ledges.filter((i) => ledges[i]!.needs !== undefined && ledges[i]!.look === look);
      if (at.length === 0) continue;
      const how = LOOKS[look];
      // Their colours are on their corners too: what holds the ledge has its own.
      const mesh = new InstancedMesh(lookShape(look, 1, site), new MeshStandardMaterial({ vertexColors: true, roughness: how.roughness, flatShading: how.flat === true }), at.length);
      mesh.name = `ledges:${n}:${look}`;
      mesh.instanceMatrix.setUsage(DynamicDrawUsage);
      mesh.userData.ledges = at;
      group.add(mesh);
      waiting.push({ mesh, at });
    }
  }

  const write = (): void => {
    for (const { mesh, at } of waiting) {
      for (const [slot, i] of at.entries()) {
        const ledge = ledges[i]!;
        const k = there[i]!;
        place.position.set(ledge.x, ledge.y, 0);
        place.scale.set(ledge.width * k, k, k);
        place.updateMatrix();
        mesh.setMatrixAt(slot, place.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      // It is drawn while its place is in sight, whatever size its ledges have come to: unless none of them
      // has come to any size yet (./idle.ts).
      drawnWhile(mesh, at.some((i) => there[i]! > 0));
      mesh.computeBoundingSphere();
    }
  };
  write();

  /** A ledge that waits for a flag grows out once the flag is set. Nothing is written while nothing changes. */
  function update(flags: ReadonlySet<string>, dt: number): void {
    let changed = false;
    for (const { at } of waiting) {
      for (const i of at) {
        const want = flags.has(ledges[i]!.needs!) ? 1 : 0;
        if (there[i] === want) continue;
        there[i] = want > there[i]! ? Math.min(1, there[i]! + dt / GROW) : Math.max(0, there[i]! - dt / GROW);
        changed = true;
      }
    }
    if (changed) write();
  }

  /** The rock ledges take the shapes the mountain kit has for them: each place that has one is built again. */
  function install(carved: Carved): void {
    for (const { mesh, always, rods: lines } of solids) {
      if (!always.some((i) => ledges[i]!.look === 'stone')) continue;
      mesh.geometry.dispose();
      mesh.geometry = shapeOf(always, lines, carved);
    }
  }
  return { group, update, install };
}
