import {
  BoxGeometry, Color, ConeGeometry, CylinderGeometry, DynamicDrawUsage, Float32BufferAttribute, Group, InstancedMesh, Mesh, MeshStandardMaterial, Object3D,
  SphereGeometry, type BufferGeometry,
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
 * Nothing floats: a leaf has its stalk, a bough and a plate of bark their young stem, a shelf of rock its
 * pillar, a plank the batten that holds it to the wall, a trestle its legs. What holds a ledge is part of its
 * shape and goes far down, into the ground under it.
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
  shape: () => BufferGeometry;
  holder?: (width: number, place?: PlaceId) => BufferGeometry;
  colours?: Partial<Record<PlaceId, string>>;
}

/** A young tree's stem behind a ledge's middle, its top out of every picture. */
const stem = (radius: number, z: number, colour: string) => painted(upright(radius * 0.8, radius, 9, 16, z), colour);

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
  // clean line where he stands. In the forest it is spruce, its needles hanging in sprays below and behind that
  // line; in the bog a dead pine's, grey, with the stubs of its twigs.
  branch: {
    colour: '#6e5238', roughness: 0.95, colours: { bog: '#a9a69e' },
    shape: () => together(
      new CylinderGeometry(0.05, 0.1, 0.5, 9).rotateZ(Math.PI / 2).translate(-0.25, -0.08, -0.32),
      new CylinderGeometry(0.05, 0.1, 0.5, 9).rotateZ(-Math.PI / 2).translate(0.25, -0.08, -0.32),
    ),
    holder: (width, place) => {
      const bog = place === 'bog';
      const parts = [stem(bog ? 0.24 : 0.3, -0.72, bog ? '#9c998f' : '#5c4a3a')];
      for (let x = -width / 2 + 0.12, i = 0; x < width / 2 - 0.08; x += bog ? 0.7 : 0.17, i++) {
        // Towards the camera only as far as the plane he moves in: nothing of it stands in front of him.
        const front = i % 2 === 1;
        if (bog) parts.push(painted(new CylinderGeometry(0.015, 0.04, 0.35, 5).rotateX(front ? 1.1 : -1.1).translate(x, -0.06, front ? -0.3 : -0.6), '#8d8a81'));
        // A spray: a flat fan of needles drooping out from under the bough, darker than any sweet and never
        // above the line where he stands.
        else {
          const long = 0.5 + ((i * 7) % 5) * 0.08;
          parts.push(painted(new ConeGeometry(0.2, long, 5).scale(1, 1, 0.35).translate(0, long / 2, 0).rotateX(front ? 2.7 : -1.9)
            .rotateZ(((i % 3) - 1) * 0.5).translate(x, -0.1, front ? -0.45 : -0.56), i % 3 ? '#234a2e' : '#3f6b3a'));
        }
      }
      return together(...parts);
    },
  },
  // A plate of bark standing out from a stem: six-sided, with a corner to each side, so that it is as wide
  // as the ledge he stands on.
  bark: {
    colour: '#8a735c', roughness: 0.95, flat: true,
    shape: () => new CylinderGeometry(0.5, 0.42, LEDGE_THICK, 6).rotateY(Math.PI / 6).scale(1, 1, DEPTH).translate(0, -LEDGE_THICK / 2, -DEPTH / 2),
    holder: () => stem(0.27, -0.78, '#6e5a46'),
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

/** A look as a shape one ledge wide, at the origin: the ledge in its place's colour, and what holds it. */
function lookShape(look: LedgeLook, width: number, place?: PlaceId): BufferGeometry {
  const how = LOOKS[look];
  const ledge = painted(how.shape().scale(width, 1, 1), (place && how.colours?.[place]) ?? how.colour);
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
