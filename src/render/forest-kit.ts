import {
  BufferGeometry, Euler, Float32BufferAttribute, Group, InstancedMesh, Matrix3, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Vector3,
  type Material, type Object3D,
} from 'three';
import type { ChapterData, Landmark } from '../sim/types';
import { restock } from './dressing/forest';

/**
 * The things of the spruce forest, modelled in Blender (art/blender/forest-kit.py): one spruce cone in its
 * sizes, the moss cushion, stones, a young spruce, a fern, mushrooms and fallen leaves, the chapter's landmarks,
 * Bertil's cap, the twig, the seesaw, the vittra door, and what he climbs. They arrive in one file,
 * `boot/forest-kit`. Until it has, and wherever it is missing, each place draws the stand-in it builds in code.
 *
 * Nothing in the kit has a texture: its colours are painted on its corners, with its own shade baked in.
 *
 * | Shape | Its origin, and its size |
 * | --- | --- |
 * | `kotte` | stands on its stalk, 1 long, up |
 * | `kotte-liten` | lies along x, its middle at the origin, 1 long |
 * | `tuva` | a hummock 1 in radius and 0.5 high, to be given its own green |
 * | `sten-a` to `sten-c`, `gungsten`, `gran`, `ormbunke`, `kantarell`, `karljohan`, `renlav` | stand on the origin, at their own size |
 * | `lov` | lies flat, its middle at the origin |
 * | `keps` | the middle of its opening, which is up; its peak towards +x |
 * | `lovbat` | the middle of its bottom; 2.9 long, its rib 0.3 up |
 * | `kvist` | the middle of its bottom; 2.4 long and 0.5 high |
 * | `gungbrada` | its middle; 4.4 long |
 * | `vittradorr` | the ground under its door, which faces the camera |
 * | `skagglav`, `rot` | hang from the origin: 1 long, and 2 long |
 * | `jattekotte`, `stock`, `myrstack`, `virvelsten` | the left end of the block of ground each stands over, at its foot, on the path |
 */
export interface ForestKit {
  /** A shape by its name in the generator, in the kit's own space. Shared: never change or dispose it. */
  shape(name: string): BufferGeometry | undefined;
  /** Lit by the place, with the colours of its corners. One for the whole view. */
  readonly material: MeshStandardMaterial;
}

/** What a place in the scene asks the kit for: set as `userData.forest` on a group that holds the stand-in. */
export interface ForestSocket {
  shape: string;
  /** Where it stands in its holder, how it is turned (x, y, z in turn) and how big it is. */
  at?: readonly [number, number, number];
  turn?: readonly [number, number, number];
  size?: number | readonly [number, number, number];
}

/** Marks a group as a place for the kit's shapes. What it holds now is its stand-in. */
export function forestSocket<T extends Object3D>(holder: T, ...sockets: ForestSocket[]): T {
  holder.userData.forest = sockets;
  return holder;
}

/** The kit's material: matt, in the colours painted on the corners. */
export const forestMaterial = (): MeshStandardMaterial => new MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });

/**
 * Reads the kit from its loaded model. The pack step stores a model's corners as small whole numbers with the
 * scale on its node, and an instance has no node: each shape is taken out as it stands in the kit's space.
 */
export function forestKit(model: Object3D): ForestKit {
  model.updateMatrixWorld(true);
  const shapes = new Map<string, BufferGeometry>();
  const point = new Vector3();
  model.traverse((node) => {
    const mesh = node as Mesh;
    const from = mesh.isMesh ? mesh.geometry : null;
    const position = from?.getAttribute('position');
    const normal = from?.getAttribute('normal');
    const colour = from?.getAttribute('color');
    if (!from || !position || !normal || !colour) return;
    const count = position.count;
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const colours = new Float32Array(count * 3);
    const turn = new Matrix3().getNormalMatrix(mesh.matrixWorld);
    for (let i = 0; i < count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3);
      point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, i * 3);
      colours[i * 3] = colour.getX(i);
      colours[i * 3 + 1] = colour.getY(i);
      colours[i * 3 + 2] = colour.getZ(i);
    }
    const made = new BufferGeometry();
    made.setAttribute('position', new Float32BufferAttribute(positions, 3));
    made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
    made.setAttribute('color', new Float32BufferAttribute(colours, 3));
    made.setIndex(from.index ? Array.from(from.index.array) : Array.from({ length: count }, (_, i) => i));
    made.computeBoundingSphere();
    made.computeBoundingBox();
    shapes.set(mesh.name, made);
  });
  return { shape: (name) => shapes.get(name), material: forestMaterial() };
}

/** One of the kit's shapes, placed: for putting several together as one mesh. */
export interface Placed {
  shape: BufferGeometry;
  matrix: Matrix4;
  /** How bright its colours are, where it has a shade of its own. */
  tone?: number;
}

/** Several shapes as one, each where its matrix puts it: one mesh and one draw call for the lot. */
export function together(parts: readonly Placed[]): BufferGeometry {
  let corners = 0;
  let indices = 0;
  for (const { shape } of parts) {
    corners += shape.getAttribute('position').count;
    indices += shape.index!.count;
  }
  const positions = new Float32Array(corners * 3);
  const normals = new Float32Array(corners * 3);
  const colours = new Float32Array(corners * 3);
  const index = new Uint32Array(indices);
  const point = new Vector3();
  const turn = new Matrix3();
  let at = 0;
  let next = 0;
  for (const { shape, matrix, tone = 1 } of parts) {
    const position = shape.getAttribute('position');
    const normal = shape.getAttribute('normal');
    const colour = shape.getAttribute('color');
    turn.getNormalMatrix(matrix);
    for (let i = 0; i < position.count; i++) {
      point.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, (at + i) * 3);
      point.fromBufferAttribute(normal, i).applyMatrix3(turn).normalize().toArray(normals, (at + i) * 3);
      colours[(at + i) * 3] = colour.getX(i) * tone;
      colours[(at + i) * 3 + 1] = colour.getY(i) * tone;
      colours[(at + i) * 3 + 2] = colour.getZ(i) * tone;
    }
    const from = shape.index!;
    for (let i = 0; i < from.count; i++) index[next++] = from.getX(i) + at;
    at += position.count;
  }
  const made = new BufferGeometry();
  made.setAttribute('position', new Float32BufferAttribute(positions, 3));
  made.setAttribute('normal', new Float32BufferAttribute(normals, 3));
  made.setAttribute('color', new Float32BufferAttribute(colours, 3));
  made.setIndex(Array.from(index));
  made.computeBoundingSphere();
  return made;
}

const scratch = { at: new Vector3(), turn: new Quaternion(), size: new Vector3(), euler: new Euler() };
/** A matrix from a place, a turn (x, y, z in turn) and a size. */
export function placing(at: readonly [number, number, number], turn: readonly [number, number, number] = [0, 0, 0], size: number | readonly [number, number, number] = 1): Matrix4 {
  const [sx, sy, sz] = typeof size === 'number' ? [size, size, size] : size;
  return new Matrix4().compose(scratch.at.set(...at), scratch.turn.setFromEuler(scratch.euler.set(...turn)), scratch.size.set(sx, sy, sz));
}

/** How thick the kit's cone is, as a share of its length: a Norway spruce cone is four times as long as it is thick. */
export const CONE_THICK = 0.25;
/** How thick its tip is, as a share of its length, out to its scales' ends. */
const CONE_TIP = 0.045;
/** A cone that he pushes leans no further than this, however square the box it fills. */
const CONE_LEAN = 0.61;

/**
 * The cone he pushes: it stands on its stalk and leans, so that a slim cone fills a box that is wider than a
 * cone is thick. Its tip is the box's top, and it stands on the middle of the box's bottom.
 */
export function standingCone(width: number, height: number): ForestSocket {
  const ratio = width / height;
  const lean = Math.min(CONE_LEAN, Math.atan(Math.max(0, (ratio - CONE_THICK) / (1 - ratio * CONE_THICK))));
  const [sin, cos] = [Math.sin(lean), Math.cos(lean)];
  const long = height / (cos + (CONE_THICK / 2 + CONE_TIP) * sin);
  // From the low edge of its foot on the one side to its tip on the other.
  const left = (-CONE_THICK / 2) * long * cos;
  const right = long * (sin + CONE_TIP * cos);
  return { shape: 'kotte', at: [-(left + right) / 2, (CONE_THICK / 2) * long * sin, 0], turn: [0, 0, -lean], size: long };
}

/** How long a cone that rolls is, as a share of how thick: shorter than one that lies still, so that a jump clears it. */
const ROLLER_LONG = 3;
/**
 * The cone that rolls, for the view's one mesh of them: lying across the path with its middle at the origin,
 * 1 in radius. `stretch` is how much longer than thick the view draws each.
 */
export function rollingCone(stretch: number): ForestSocket {
  const long = (2 * ROLLER_LONG) / stretch;
  return { shape: 'kotte', at: [0, 0, -long / 2], turn: [Math.PI / 2, 0, 0], size: [2 / CONE_THICK, long, 2 / CONE_THICK] };
}

function discard(stood: Object3D): void {
  stood.traverse((node) => {
    const mesh = node as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  });
}

/** What he climbs, by its look: the beard lichen as it hangs, and a root as lengths of root joined end to end. */
function climb(kit: ForestKit, look: string, long: number): BufferGeometry | undefined {
  if (look === 'lichen') return kit.shape('skagglav')?.clone().scale(1.7, long, 1.7);
  const root = kit.shape('rot');
  if (look !== 'root' || !root) return undefined;
  const lengths = Math.max(1, Math.round(long / 2));
  const each = long / lengths / 2;
  return together(Array.from({ length: lengths }, (_, i) => ({ shape: root, matrix: placing([0, -i * each * 2, 0], [0, i * 2.4, 0], [1, each, 1]) })));
}

/** The name of the kit's shape for each of the chapter's landmarks. */
export const LANDMARKS: Record<Landmark['look'], string> = { cone: 'jattekotte', log: 'stock', anthill: 'myrstack', stone: 'virvelsten' };

/**
 * Puts the kit's shapes where the scene asks for them, in place of their stand-ins: the things he uses, the
 * cones that roll, what he climbs, the forest floor's scatter, and the chapter's landmarks. A place whose
 * shape the kit lacks keeps its stand-in. The caller warms the new material before play goes on.
 */
export function installForest(root: Object3D, chapter: ChapterData, kit: ForestKit): number {
  const places: Object3D[] = [];
  const climbs: Mesh[] = [];
  const stretches: Group[] = [];
  root.traverse((node) => {
    if (node.userData.forest) places.push(node);
    if (node.userData.forestStretch) stretches.push(node as Group);
    if (/^climb:(lichen|root):/.test(node.name) && !node.userData.forestClimb) climbs.push(node as Mesh);
  });
  let installed = 0;
  for (const holder of places) {
    const sockets = holder.userData.forest as ForestSocket[];
    if (sockets.some((socket) => !kit.shape(socket.shape))) continue;
    delete holder.userData.forest;
    installed++;
    const many = holder as InstancedMesh;
    if (many.isInstancedMesh) {
      // Many of one thing: the shape changes, the places stay.
      many.geometry.dispose();
      (many.material as Material).dispose();
      many.geometry = together(sockets.map((socket) => ({ shape: kit.shape(socket.shape)!, matrix: placing(socket.at ?? [0, 0, 0], socket.turn, socket.size) })));
      many.material = kit.material;
      continue;
    }
    for (const child of [...holder.children]) discard(child);
    holder.clear();
    for (const socket of sockets) {
      const mesh = new Mesh(kit.shape(socket.shape)!, kit.material);
      mesh.applyMatrix4(placing(socket.at ?? [0, 0, 0], socket.turn, socket.size));
      holder.add(mesh);
    }
  }
  for (const mesh of climbs) {
    mesh.geometry.computeBoundingBox();
    const made = climb(kit, mesh.name.split(':')[1]!, -mesh.geometry.boundingBox!.min.y);
    if (!made) continue;
    mesh.geometry.dispose();
    mesh.geometry = made;
    // The stand-in's material is shared with the other things he climbs, and stays theirs.
    mesh.material = kit.material;
    mesh.userData.forestClimb = true;
    installed++;
  }
  for (const stretch of stretches) if (restock(stretch, chapter, kit)) installed++;
  for (const mark of chapter.landmarks ?? []) {
    const shape = kit.shape(LANDMARKS[mark.look]);
    if (!shape) continue;
    const mesh = new Mesh(shape, kit.material);
    mesh.name = `landmark:${mark.look}`;
    mesh.position.set(mark.from, mark.base, 0);
    root.add(mesh);
    installed++;
  }
  return installed;
}
