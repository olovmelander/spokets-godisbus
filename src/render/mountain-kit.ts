import {
  BufferGeometry, Color, Euler, Float32BufferAttribute, Group, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Quaternion, SphereGeometry, Vector3,
  type InstancedMesh, type Object3D,
} from 'three';
import type { ChapterData } from '../sim/types';
import { grows, heightAt, noise, sequence } from './dressing/kit';

/**
 * The things of the mountain, modelled in Blender (art/blender/mountain-kit.py): the old pine the story walks
 * to, crooked pines for the rim, the rock shelves, the boulders he shelters behind, the summit cairn, stones,
 * cobbles and reindeer lichen. They arrive in one file, `boot/mountain-kit`. Until it has, and wherever it is
 * missing, the mountain keeps the plain shapes it builds in code; the pines have none, and are not there.
 *
 * Nothing in the kit has a texture: its colours are on its corners, with its own shade baked into them.
 * What he stands on is put where the chapter has it, and never the other way round: a shelf, a boulder and a
 * stack of the cairn each say how wide their flat top is, how high over the ground and how far under it a
 * second one lies, and take the place of the ledges and steps that have those numbers.
 */

/** One part of the kit as plain numbers in the kit's own space. */
export interface Shape {
  position: ArrayLike<number>;
  normal: ArrayLike<number>;
  /** Empty where a part has no colours: one that only says where a tree's shoots stand. */
  colour: ArrayLike<number>;
  index: ArrayLike<number>;
  /** For what he stands on: its flat top's width, its height over the ground, and how far under it a second flat top lies. */
  wide?: number;
  drop?: number;
  step?: number;
}
export type MountainKit = ReadonlyMap<string, Shape>;

/** How far behind the path the old pine's stem stands: clear of the ghost, the candy and a big Elof. */
export const PINE_DEPTH = -3.5;

const point = new Vector3();
const facing = new Vector3();
const tint = new Color();

/** A shape of the scene as the kit's parts are, in its own space or where a matrix puts it. */
export function shapeOf(geometry: BufferGeometry, matrix = new Matrix4()): Shape {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const colour = geometry.getAttribute('color');
  const count = position.count;
  const shape = { position: new Float32Array(count * 3), normal: new Float32Array(count * 3), colour: new Float32Array(colour ? count * 3 : 0), index: geometry.index ? Array.from(geometry.index.array) : Array.from({ length: count }, (_, i) => i) };
  const turn = new Matrix3().getNormalMatrix(matrix);
  for (let i = 0; i < count; i++) {
    point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(shape.position, i * 3);
    if (normal) point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(shape.normal, i * 3);
    if (colour) shape.colour.set([colour.getX(i), colour.getY(i), colour.getZ(i)], i * 3);
  }
  return shape;
}

/**
 * Reads the kit from its loaded model. The pack step stores a model's corners as small whole numbers with the
 * scale on its node, and what is merged has no node: each part is taken out as it stands in the kit's space.
 */
export function mountainKit(model: Object3D): MountainKit {
  model.updateMatrixWorld(true);
  const kit = new Map<string, Shape>();
  model.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    const { wide, drop, step } = mesh.userData as { wide?: number; drop?: number; step?: number };
    kit.set(mesh.name, { ...shapeOf(mesh.geometry, mesh.matrixWorld), ...(wide !== undefined && drop !== undefined ? { wide, drop, step: step ?? 0 } : {}) });
  });
  return kit;
}

// --- putting shapes together ---------------------------------------------------------------------------------

interface Build { position: number[]; normal: number[]; colour: number[]; index: number[] }
const build = (): Build => ({ position: [], normal: [], colour: [], index: [] });
type Paint = (colour: Color, at: Vector3, facing: Vector3) => void;
const turned = new Matrix3();

/** Adds a shape where a matrix puts it. `paint` may change a corner's colour, by where it ends up and which way it faces. */
function put(into: Build, shape: Shape, matrix: Matrix4, paint?: Paint): void {
  const first = into.position.length / 3;
  turned.getNormalMatrix(matrix);
  for (let i = 0; i < shape.position.length; i += 3) {
    point.fromArray(shape.position, i).applyMatrix4(matrix);
    facing.fromArray(shape.normal, i).applyMatrix3(turned).normalize();
    tint.setRGB(shape.colour[i] ?? 1, shape.colour[i + 1] ?? 1, shape.colour[i + 2] ?? 1);
    paint?.(tint, point, facing);
    into.position.push(point.x, point.y, point.z);
    into.normal.push(facing.x, facing.y, facing.z);
    into.colour.push(tint.r, tint.g, tint.b);
  }
  // A shape that is mirrored has its faces turned inside out: their corners are taken the other way round.
  const mirrored = matrix.determinant() < 0;
  for (let i = 0; i < shape.index.length; i += 3) into.index.push(first + shape.index[i]!, first + shape.index[i + (mirrored ? 2 : 1)]!, first + shape.index[i + (mirrored ? 1 : 2)]!);
}

function shaped(from: Build): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(from.position, 3));
  geometry.setAttribute('normal', new Float32BufferAttribute(from.normal, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(from.colour, 3));
  geometry.setIndex(from.index);
  geometry.computeBoundingSphere();
  return geometry;
}

const at = (x: number, y: number, z: number, mirrored = false, scale = 1): Matrix4 =>
  new Matrix4().makeScale(mirrored ? -scale : scale, scale, scale).setPosition(x, y, z);

// --- what he stands on ---------------------------------------------------------------------------------------

/** A rock he stands on: one flat top, or two with one over the other. */
export interface Outcrop {
  /** A shelf of rock, a boulder to shelter behind, or a stack of the cairn. */
  kind: 'hylla' | 'la' | 'rose';
  x: number;
  /** Its highest flat top, and how wide that is. */
  y: number;
  wide: number;
  /** How high its top is over the ground there, and how far under it its second flat top lies (0: none). */
  drop: number;
  step: number;
  /** The chapter's ledges and things on rails that are its tops, the highest first. */
  ledges: number[];
  movers: number[];
}

const near = (a: number, b: number) => Math.abs(a - b) < 0.011;

/** The chapter's stone ledges and stone steps, as the rocks they are the tops of. */
export function outcrops(chapter: ChapterData): Outcrop[] {
  const shelters = (chapter.gusts ?? []).flatMap((gust) => gust.shelters);
  const tops = [
    ...(chapter.ledges ?? []).flatMap((ledge, i) => (ledge.look === 'stone' && ledge.needs === undefined ? [{ x: ledge.x, y: ledge.y, wide: ledge.width, ledge: i, mover: -1 }] : [])),
    // A thing on a rail that never moves is a step: its top is what he stands on.
    ...(chapter.movers ?? []).flatMap((mover, i) => (mover.look === 'stone' && mover.stops.length === 1 ? [{ x: mover.stops[0]!.x, y: mover.stops[0]!.y + mover.height, wide: mover.width, ledge: -1, mover: i }] : [])),
  ].sort((a, b) => a.x - b.x || b.y - a.y);
  const all: Outcrop[] = [];
  for (const top of tops) {
    const last = all.at(-1);
    // A second top straight under the first, as wide as it, is the same rock's step.
    if (last && last.step === 0 && near(last.x, top.x) && near(last.wide, top.wide) && (last.movers.length > 0) === (top.mover >= 0)) {
      last.step = Math.round((last.y - top.y) * 1000) / 1000;
    } else {
      all.push({
        kind: top.mover >= 0 ? 'rose' : shelters.some((x) => near(x, top.x)) ? 'la' : 'hylla',
        x: top.x, y: top.y, wide: top.wide, drop: Math.round((top.y - heightAt(chapter, top.x)) * 1000) / 1000, step: 0, ledges: [], movers: [],
      });
    }
    if (top.ledge >= 0) all.at(-1)!.ledges.push(top.ledge);
    else all.at(-1)!.movers.push(top.mover);
  }
  return all;
}

/**
 * The kit's part for each rock, or null where it has none with those numbers: that rock keeps its stand-in.
 * Rocks with the same numbers take the kit's parts in turn, and then the same ones mirrored.
 */
export function fitted(kit: MountainKit, rocks: readonly Outcrop[]): ({ name: string; mirrored: boolean } | null)[] {
  const turns = new Map<string, number>();
  return rocks.map((rock) => {
    const names = [...kit.keys()].filter((name) => {
      const part = kit.get(name)!;
      return name.startsWith(`${rock.kind}-`) && part.wide !== undefined && near(part.wide, rock.wide) && near(part.drop!, rock.drop) && near(part.step!, rock.step);
    });
    if (names.length === 0) return null;
    const key = names.join();
    const turn = turns.get(key) ?? 0;
    turns.set(key, turn + 1);
    // A stack of the cairn leans one way: it is never mirrored.
    return { name: names[turn % names.length]!, mirrored: rock.kind !== 'rose' && Math.floor(turn / names.length) % 2 === 1 };
  });
}

/** A rock of the kit where its outcrop stands: its top at the chapter's height, its front edge on the play plane. */
export function rockAt(kit: MountainKit, rock: Outcrop, fit: { name: string; mirrored: boolean }): BufferGeometry {
  const made = build();
  put(made, kit.get(fit.name)!, at(rock.x, rock.y, 0, fit.mirrored));
  return shaped(made);
}

// --- stones --------------------------------------------------------------------------------------------------

/**
 * A stone of the scatter: where its middle is, how big it is, how it is turned, which of the shapes it is, how
 * light or dark, and the height of the ground it lies in.
 */
export interface StonePlace { x: number; y: number; z: number; size: number; turn: [number, number, number]; shape: number; tone: number; foot: number }

/** The pale crust of lichen on whatever side of a stone faces the sky (art/blender/mountain-kit.py has the same). */
const CRUST = new Color('#d9d6c6');
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

/**
 * Stones as one shape: each is one of `shapes`, turned every way and sunk into the ground, with lichen on the
 * side that ends up facing the sky and the damp dark where it meets the rock.
 */
export function stones(places: readonly StonePlace[], shapes: readonly Shape[]): BufferGeometry {
  const made = build();
  const matrix = new Matrix4();
  const turn = new Quaternion();
  const size = new Vector3();
  for (const place of places) {
    matrix.compose(point.set(place.x, place.y, place.z), turn.setFromEuler(new Euler(...place.turn)), size.setScalar(place.size));
    put(made, shapes[place.shape % shapes.length]!, matrix, (colour, where, towards) => {
      colour.multiplyScalar(place.tone);
      colour.lerp(CRUST, smooth(0.35, 0.95, towards.y) * (0.25 + 0.5 * noise(where.x * 2.1 + 3, where.z * 2.1)));
      colour.multiplyScalar(0.62 + 0.38 * smooth(0, 0.3 * place.size + 0.08, where.y - place.foot));
    });
  }
  return shaped(made);
}

// --- pines ---------------------------------------------------------------------------------------------------

/**
 * Where a tree's shoots stand: its `-skott` part has a small triangle for each, with a square corner at the
 * shoot's foot, its long leg along the shoot and as long as it, and its short leg, 0.4 as long, to one side.
 * Each comes back as the matrix that puts the kit's one shoot (one long, along +Y) there.
 */
export function shootsOf(frames: Shape): Matrix4[] {
  const corners = [new Vector3(), new Vector3(), new Vector3()];
  const along = new Vector3();
  const side = new Vector3();
  const out: Matrix4[] = [];
  for (let i = 0; i < frames.index.length; i += 3) {
    for (let k = 0; k < 3; k++) corners[k]!.fromArray(frames.position, frames.index[i + k]! * 3);
    // The foot is the corner opposite the longest side.
    let foot = 0;
    for (let k = 1; k < 3; k++) if (corners[(k + 1) % 3]!.distanceTo(corners[(k + 2) % 3]!) > corners[(foot + 1) % 3]!.distanceTo(corners[(foot + 2) % 3]!)) foot = k;
    const a = corners[(foot + 1) % 3]!;
    const b = corners[(foot + 2) % 3]!;
    const long = a.distanceTo(corners[foot]!) > b.distanceTo(corners[foot]!);
    along.subVectors(long ? a : b, corners[foot]!);
    side.subVectors(long ? b : a, corners[foot]!).divideScalar(0.4);
    out.push(new Matrix4().makeBasis(side, along, point.crossVectors(side, along).setLength(along.length())).setPosition(corners[foot]!));
  }
  return out;
}

/**
 * A pine of the kit where a matrix puts it: its wood, and one shoot of needles at each place its `-skott` part
 * says. The old pine has the fine shoot; a pine of the rim, far off and out of focus, has the coarse one.
 */
function pine(into: Build, kit: MountainKit, name: string, matrix: Matrix4): void {
  const wood = kit.get(name);
  const frames = kit.get(`${name}-skott`);
  const shoot = (name === 'tall' ? undefined : kit.get('skott-grov')) ?? kit.get('skott');
  if (!wood || !frames || !shoot) return;
  put(into, wood, matrix);
  const there = new Matrix4();
  for (const frame of shootsOf(frames)) {
    there.multiplyMatrices(matrix, frame);
    // A shoot that stands up into the light is paler than one that hangs in the tree's own shade.
    const up = 0.78 + 0.34 * Math.max(0, there.elements[5]! / Math.hypot(there.elements[4]!, there.elements[5]!, there.elements[6]!));
    put(into, shoot, there, (colour) => colour.multiplyScalar(up));
  }
}

/** A crooked pine of the rim: which of the two it is, where it stands, how big, and whether it is mirrored. */
export interface RimPine { x: number; y: number; z: number; shape: 0 | 1; size: number; mirrored: boolean }

/** How long a piece of the rim is: its pines are one shape, drawn while any of it is in sight. */
const RIM_PIECE = 36;

/**
 * The crooked pines on the rim behind the path: small, far back, one for every 14 lengths or so. Over the open
 * granite there is one at most, since the rope and its rings want the sky behind them, and there is none near
 * the old pine, which stands alone.
 */
export function rimPines(chapter: ChapterData): RimPine[] {
  const next = sequence(4177);
  const from = chapter.ground[0]!.x;
  const to = chapter.ground[chapter.ground.length - 1]!.x;
  const open = (chapter.gusts ?? []).map((gust) => ({ from: gust.from - 3, to: gust.to + 3, kept: false }));
  const all: RimPine[] = [];
  for (let x = from + 4 + next() * 6; x < to - 2;) {
    const one: RimPine = { x, y: 0, z: -9.5 - next() * 5.5, shape: next() < 0.55 ? 0 : 1, size: 0.72 + next() * 0.3, mirrored: next() < 0.3 };
    const field = open.find((gust) => x > gust.from && x < gust.to);
    // Level ground only: it stands far back, where the ground is the path's own height. The one of the open
    // granite stands past its middle.
    const room = grows(chapter, x) && [-1.5, 1.5].every((d) => Math.abs(heightAt(chapter, x + d) - heightAt(chapter, x)) < 0.5)
      && !(chapter.pine && Math.abs(x - chapter.pine.x) < 11) && !(field && (field.kept || x < (field.from + field.to) / 2));
    if (!room) {
      // No room here: the next one stands where there first is some.
      x += 2;
      continue;
    }
    if (field) {
      field.kept = true;
      // As far back as a pine stands.
      one.z = -14.5;
    }
    one.y = heightAt(chapter, x) + backRise(one.z) - 0.2;
    all.push(one);
    x += 10 + next() * 7;
  }
  return all;
}

/** How much higher than the path the granite lies far behind it (the rock's profile in src/render/dressing/ground.ts). */
export const backRise = (z: number) => (z > -5.5 ? 0 : z > -10 ? ((-5.5 - z) / 4.5) * 0.1 : 0.1 + ((-10 - z) / 6) * 0.2);

// --- the mountain --------------------------------------------------------------------------------------------

/** What a mesh of the scene asks the kit for: set as `userData.mountain`. Its stand-in is what it has now. */
export type MountainSocket =
  /** Many of one small thing, each in its place: the shape changes, the places stay. */
  | { part: 'lav' | 'klapper' | 'strandsten' }
  /** The stones of a stretch: built again from the kit's three. */
  | { stones: StonePlace[] }
  /** A stand-in that the kit's rocks take the place of: the steps of the cairn, its mark, the boulders of the gusts. */
  | { standIn: 'step' | 'cairn' | 'shelters' };

/** The boulders to shelter behind, until the kit's are there: plain grey lumps, all one shape. */
export function shelterStandIn(gust: { y: number; shelters: readonly number[] }, material: MeshStandardMaterial): Mesh {
  const made = build();
  const lump = shapeOf(new SphereGeometry(1, 10, 8));
  for (const x of gust.shelters) put(made, lump, new Matrix4().makeScale(0.95, 1.15, 0.8).setPosition(x, gust.y + 0.75, -1.3), (colour) => colour.set('#8d8f93'));
  const mesh = new Mesh(shaped(made), material);
  mesh.name = 'shelters';
  mesh.userData.mountain = { standIn: 'shelters' } satisfies MountainSocket;
  return mesh;
}

/** The stones round the old pine's foot, counted from its stem: to its windward side, depth, size, shape. */
const BY_THE_PINE: readonly [number, number, number, number][] = [[3.3, 1.2, 1.5, 0], [4.6, -1.4, 0.95, 2], [-2.4, -2.6, 0.8, 1], [1.9, 2.3, 0.45, 0]];

/**
 * The mountain's part of a chapter's picture: what the kit brings that has no stand-in (the pines), and the
 * swap of everything else. Null for a chapter that is not on the mountain.
 */
export function createMountain(chapter: ChapterData, ledges: { install(carved: (ledge: number) => BufferGeometry | null | undefined): void }) {
  if (chapter.place !== 'mountain' && chapter.place !== 'dusk') return null;
  const group = new Group();
  group.name = 'mountain-kit';
  const rock = new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });

  /** The kit takes the place of the stand-ins, wherever in `scene` they are. False where it has nothing for this chapter. */
  function install(model: Object3D, scene: Object3D): boolean {
    const kit = mountainKit(model);
    const loose = ['sten-a', 'sten-b', 'sten-c'].flatMap((name) => kit.get(name) ?? []);
    if (loose.length === 0) return false;

    // What he stands on: each rock of the chapter that the kit has a part for.
    const rocks = outcrops(chapter);
    const fits = fitted(kit, rocks);
    const carved = new Map<number, BufferGeometry | null>();
    const cairn = build();
    const stepped = new Set<string>();
    for (const [i, crop] of rocks.entries()) {
      const fit = fits[i];
      if (!fit) continue;
      if (crop.kind === 'rose') {
        put(cairn, kit.get(fit.name)!, at(crop.x, crop.y, 0));
        for (const mover of crop.movers) stepped.add(chapter.movers![mover]!.id);
        continue;
      }
      // The rock is drawn at its highest ledge; its step is part of it.
      for (const [k, ledge] of crop.ledges.entries()) carved.set(ledge, k === 0 ? withUv(rockAt(kit, crop, fit)) : null);
    }
    ledges.install((ledge) => carved.get(ledge));
    if (cairn.index.length > 0) {
      const mesh = new Mesh(shaped(cairn), rock);
      mesh.name = 'cairn';
      group.add(mesh);
    }
    const sheltered = rocks.every((crop, i) => crop.kind !== 'la' || fits[i] !== null);
    const gone: Object3D[] = [];
    /** A small part of the kit as one shape, shared by everything that is drawn with it. */
    const small = new Map<string, BufferGeometry | null>();

    scene.traverse((node) => {
      const socket = node.userData.mountain as MountainSocket | undefined;
      if (!socket) return;
      const mesh = node as Mesh;
      if ('part' in socket) {
        if (!small.has(socket.part)) small.set(socket.part, geometryOf(kit.get(socket.part)));
        const shape = small.get(socket.part);
        if (!shape) return;
        mesh.geometry.dispose();
        mesh.geometry = shape;
        // A cobble by itself, in its own stand-in's colour: the kit's has its colours on its corners.
        const own = mesh.material as MeshStandardMaterial;
        if (!(mesh as unknown as InstancedMesh).isInstancedMesh && !own.vertexColors) {
          own.vertexColors = true;
          own.color.set('#ffffff');
          own.needsUpdate = true;
        }
      } else if ('stones' in socket) {
        mesh.geometry.dispose();
        mesh.geometry = stones(socket.stones, loose);
      } else if (socket.standIn === 'shelters' ? sheltered : socket.standIn === 'step' ? stepped.has(node.userData.mover as string) : cairn.index.length > 0) {
        gone.push(node);
      } else return;
      delete node.userData.mountain;
    });
    for (const node of gone) {
      node.traverse((part) => (part as Mesh).geometry?.dispose());
      node.removeFromParent();
    }

    // The old pine, with the stones at its foot. Mirrored, it is swept the other way.
    if (chapter.pine && kit.has('tall')) {
      const made = build();
      const side = chapter.pine.flip ? -1 : 1;
      const foot = heightAt(chapter, chapter.pine.x);
      pine(made, kit, 'tall', at(chapter.pine.x, foot - 0.04, PINE_DEPTH, side < 0));
      const mesh = new Mesh(shaped(made), rock);
      mesh.name = 'old-pine';
      const lying = BY_THE_PINE.map(([dx, dz, size, shape], i): StonePlace => ({ x: chapter.pine!.x + dx * side, y: foot + size * 0.28, z: PINE_DEPTH + dz, size, turn: [i * 1.3, i * 2.1 + 0.4, i * 0.7], shape, tone: 0.86, foot }));
      const beside = new Mesh(stones(lying, loose), rock);
      beside.name = 'old-pine-stones';
      group.add(mesh, beside);
    }

    // The crooked pines of the rim, a piece of the chapter at a time.
    const rim = rimPines(chapter);
    for (let from = chapter.ground[0]!.x; rim.length > 0 && from < chapter.ground[chapter.ground.length - 1]!.x; from += RIM_PIECE) {
      const made = build();
      for (const one of rim) if (one.x >= from && one.x < from + RIM_PIECE) pine(made, kit, one.shape === 0 ? 'martall-a' : 'martall-b', at(one.x, one.y, one.z, one.mirrored, one.size));
      if (made.index.length === 0) continue;
      const mesh = new Mesh(shaped(made), rock);
      mesh.name = `rim-pines:${from}`;
      group.add(mesh);
    }
    return true;
  }
  return { group, install };
}

/** A part of the kit as a shape of the scene, shared by everything that is drawn with it. */
function geometryOf(shape: Shape | undefined): BufferGeometry | null {
  if (!shape) return null;
  const made = build();
  put(made, shape, new Matrix4());
  return shaped(made);
}

/** A rock as the ledges' one mesh wants its parts: every face with corners of its own, and a place for a picture it does not have. */
function withUv(geometry: BufferGeometry): BufferGeometry {
  const plain = geometry.toNonIndexed();
  geometry.dispose();
  plain.setAttribute('uv', new Float32BufferAttribute(new Float32Array(plain.getAttribute('position').count * 2), 2));
  return plain;
}
