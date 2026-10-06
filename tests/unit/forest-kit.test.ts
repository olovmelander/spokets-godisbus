import { readFileSync } from 'node:fs';
import {
  Box3, BoxGeometry, BufferGeometry, CylinderGeometry, DoubleSide, Float32BufferAttribute, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshStandardMaterial, Raycaster, SphereGeometry, Vector3, type Object3D,
} from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { FLOOR_SHAPES, restock, stretch } from '../../src/render/dressing/forest';
import { shoreAt } from '../../src/render/dressing/ground';
import { heightAt, makeKit } from '../../src/render/dressing/kit';
import { LANDMARKS, forestKit, forestSocket, installForest, placing, rollingCone, standingCone, together, type ForestKit } from '../../src/render/forest-kit';
import { moverProp, rideProp, spotProp } from '../../src/render/props';

const forest = COURSES['granskog']!;
const generator = readFileSync(new URL('../../art/blender/forest-kit.py', import.meta.url), 'utf8');
/** The names the generator gives its things. */
const built = [...generator.matchAll(/^(?:finish\(part, |stone\()'([a-z-]+)'/gm)].map((match) => match[1]!).concat(['sten-a', 'sten-b', 'sten-c']);
/** What the game asks the kit for besides the floor's shapes and the landmarks. */
const USED = ['kotte', 'keps', 'lovbat', 'kvist', 'gungbrada', 'gungsten', 'vittradorr', 'skagglav', 'rot'];

/**
 * The kit as Blender baked it (art/baked/boot/forest-kit.glb), read here as the game reads the packed one: a
 * mesh for each thing, with the colours of its corners. A baked file is plain: no compression to undo.
 */
function baked(): { model: Group; json: { images?: unknown[]; textures?: unknown[]; meshes: { primitives: { attributes: Record<string, number> }[] }[] } } {
  const data = readFileSync(new URL('../../art/baked/boot/forest-kit.glb', import.meta.url));
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
  const bin = data.subarray(20 + length + 8);
  const numbers = (index: number): { values: number[]; size: number } => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type as 'SCALAR']!;
    const [bytes, read, scale] = ({
      5126: [4, (at: number) => bin.readFloatLE(at), 1], 5125: [4, (at: number) => bin.readUInt32LE(at), 1],
      5123: [2, (at: number) => bin.readUInt16LE(at), accessor.normalized ? 1 / 65535 : 1], 5121: [1, (at: number) => bin.readUInt8(at), accessor.normalized ? 1 / 255 : 1],
    } as Record<number, [number, (at: number) => number, number]>)[accessor.componentType]!;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? bytes * size;
    const values: number[] = [];
    for (let i = 0; i < accessor.count; i++) for (let k = 0; k < size; k++) values.push(read(start + i * stride + k * bytes) * scale);
    return { values, size };
  };
  const model = new Group();
  for (const node of json.nodes as { name: string; mesh?: number; translation?: number[]; rotation?: number[]; scale?: number[] }[]) {
    if (node.mesh === undefined) continue;
    // Every thing is baked where it stands, unturned.
    expect(node.rotation, node.name).toBeUndefined();
    const primitive = json.meshes[node.mesh].primitives[0];
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(numbers(primitive.attributes.POSITION).values, 3));
    geometry.setAttribute('normal', new Float32BufferAttribute(numbers(primitive.attributes.NORMAL).values, 3));
    const colour = numbers(primitive.attributes.COLOR_0);
    geometry.setAttribute('color', new Float32BufferAttribute(colour.values.filter((_, i) => i % colour.size < 3), 3));
    geometry.setIndex(numbers(primitive.indices).values);
    const mesh = new Mesh(geometry, new MeshStandardMaterial());
    mesh.name = node.name;
    if (node.translation) mesh.position.fromArray(node.translation);
    if (node.scale) mesh.scale.fromArray(node.scale);
    model.add(mesh);
  }
  return { model, json };
}

/** A kit of plain boxes by the given names, each with colours on its corners. */
function boxes(...names: string[]): ForestKit {
  const shapes = new Map(names.map((name) => {
    const geometry = new BoxGeometry(0.2, 0.2, 0.2);
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    geometry.computeBoundingBox();
    return [name, geometry as BufferGeometry];
  }));
  return { shape: (name) => shapes.get(name), material: new MeshStandardMaterial({ vertexColors: true }) };
}

const triangles = (root: Object3D): number => {
  let count = 0;
  root.traverse((node) => {
    const mesh = node as InstancedMesh;
    if (!mesh.isMesh) return;
    const each = (mesh.geometry.index ? mesh.geometry.index.count : mesh.geometry.getAttribute('position').count) / 3;
    count += each * (mesh.isInstancedMesh ? mesh.count : 1);
  });
  return count;
};

let kit: ForestKit;
let json: ReturnType<typeof baked>['json'];
beforeAll(() => {
  // The place's own shapes draw their bark on a canvas: there is none here, and none is needed.
  const context = new Proxy({}, { get: () => () => undefined, set: () => true });
  vi.stubGlobal('document', { createElement: () => ({ width: 0, height: 0, getContext: () => context }) });
  makeKit();
  const read = baked();
  kit = forestKit(read.model);
  json = read.json;
});

describe('the forest kit from Blender', () => {
  it('has a shape for everything the game asks it for, in the generator and in the baked file', () => {
    for (const name of [...FLOOR_SHAPES, ...Object.values(LANDMARKS), ...USED]) {
      expect(built, name).toContain(name);
      expect(kit.shape(name), name).toBeDefined();
    }
    expect(new Set(built).size).toBe(built.length);
  });

  it('has no texture, so nothing can be written or drawn on any of it: its colours are on its corners', () => {
    expect(json.images).toBeUndefined();
    expect(json.textures).toBeUndefined();
    for (const mesh of json.meshes) {
      expect(Object.keys(mesh.primitives[0]!.attributes).sort()).toEqual(['COLOR_0', 'NORMAL', 'POSITION']);
    }
  });

  it('has a cone that is long and slim, as a spruce cone is, and never an egg', () => {
    for (const [name, long] of [['kotte', 'y'], ['kotte-liten', 'x']] as const) {
      const size = kit.shape(name)!.boundingBox!.getSize(new Vector3());
      const thick = Math.max(...(['x', 'y', 'z'] as const).filter((axis) => axis !== long).map((axis) => size[axis]));
      expect(size[long] / thick, name).toBeGreaterThan(3.4);
      expect(size[long] / thick, name).toBeLessThan(5);
    }
  });

  it('has a cushion of few points: four hundred lie in a picture', () => {
    expect(kit.shape('tuva')!.index!.count / 3).toBeLessThan(64);
  });

  it('reads its shapes from a loaded model, each in the kit\'s own space', () => {
    const model = new Group();
    const geometry = new BoxGeometry(0.2, 0.2, 0.2);
    geometry.setAttribute('color', new Float32BufferAttribute(new Float32Array(geometry.getAttribute('position').count * 3).fill(1), 3));
    const mesh = new Mesh(geometry, new MeshStandardMaterial());
    mesh.name = 'kotte';
    // The pack step puts a model's scale on its node.
    mesh.scale.setScalar(2);
    mesh.position.set(0, 1, 0);
    const plain = new Mesh(new SphereGeometry(1), new MeshStandardMaterial());
    plain.name = 'no-colours';
    model.add(mesh, plain);
    const read = forestKit(model);
    expect(read.shape('kotte')!.boundingBox!.min.y).toBeCloseTo(0.8);
    expect(read.shape('kotte')!.boundingBox!.max.y).toBeCloseTo(1.2);
    expect(read.shape('no-colours')).toBeUndefined();
  });
});

describe('the landmarks', () => {
  const marks = forest.landmarks ?? [];

  it('are the four blocks of the outline that the chapter names', () => {
    expect(marks.map((mark) => mark.look).sort()).toEqual(['anthill', 'cone', 'log', 'stone']);
    for (const mark of marks) {
      // A block: level from end to end, above the ground at its foot, with a wall at each end.
      const top = heightAt(forest, (mark.from + mark.to) / 2);
      expect(top, mark.look).toBeGreaterThan(mark.base);
      for (const x of [mark.from + 0.05, mark.to - 0.05]) expect(heightAt(forest, x), mark.look).toBeCloseTo(top, 6);
      expect(heightAt(forest, mark.from - 0.05), mark.look).toBeLessThan(top);
      expect(heightAt(forest, mark.to + 0.05), mark.look).toBeLessThan(top);
    }
  });

  it('have their tops where the outline has the blocks\', so that his feet stand on them', () => {
    const down = new Vector3(0, -1, 0);
    const ray = new Raycaster();
    for (const mark of marks) {
      const mesh = new Mesh(kit.shape(LANDMARKS[mark.look])!, new MeshBasicMaterial({ side: DoubleSide }));
      mesh.position.set(mark.from, mark.base, 0);
      mesh.updateMatrixWorld(true);
      for (let x = mark.from + 0.12; x <= mark.to - 0.12; x += 0.17) {
        for (const z of [-0.2, -0.1, 0, 0.1, 0.2]) {
          ray.set(new Vector3(x, mark.base + 40, z), down);
          const hit = ray.intersectObject(mesh)[0];
          expect(hit, `${mark.look} at x ${x.toFixed(2)}, z ${z}`).toBeDefined();
          const over = hit!.point.y - heightAt(forest, x);
          expect(over, `${mark.look} at x ${x.toFixed(2)}, z ${z}`).toBeGreaterThan(-0.06);
          expect(over, `${mark.look} at x ${x.toFixed(2)}, z ${z}`).toBeLessThan(0.06);
        }
      }
    }
  });

  it('stand no higher in front of the path than the path itself, so that nothing covers his boots', () => {
    for (const mark of marks) {
      const at = kit.shape(LANDMARKS[mark.look])!.getAttribute('position');
      const top = heightAt(forest, (mark.from + mark.to) / 2) - mark.base;
      for (let i = 0; i < at.count; i++) if (at.getZ(i) > 0.3) expect(at.getY(i), `${mark.look}, a point ${at.getZ(i).toFixed(2)} in front`).toBeLessThan(top + 0.06);
    }
  });

  it('reach no further along the path than a hand past their blocks, where he walks', () => {
    for (const mark of marks) {
      const at = kit.shape(LANDMARKS[mark.look])!.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        // Behind the path a thing may spread: he passes in front of it.
        if (at.getZ(i) < -0.3 || at.getY(i) < 0.1) continue;
        expect(at.getX(i), mark.look).toBeGreaterThan(-0.4);
        expect(at.getX(i), mark.look).toBeLessThan(mark.to - mark.from + 0.4);
      }
    }
  });

  it('are put in the scene where the chapter says, one mesh each', () => {
    const scene = new Group();
    expect(installForest(scene, forest, boxes(...Object.values(LANDMARKS)))).toBe(marks.length);
    for (const mark of marks) {
      const mesh = scene.getObjectByName(`landmark:${mark.look}`)!;
      expect(mesh.position.toArray()).toEqual([mark.from, mark.base, 0]);
    }
    // A kit without them leaves the chapter as it was.
    expect(installForest(new Group(), forest, boxes())).toBe(0);
  });
});

describe('the things he uses, from the kit', () => {
  it('stands a cone in the box it is pushed as: its tip at the box\'s top, and within its sides', () => {
    const cone = kit.shape('kotte')!;
    for (const [width, height] of [[1.1, 1.5], [0.55, 0.7], [0.7, 0.7]] as const) {
      const socket = standingCone(width, height);
      const box = new Box3().setFromBufferAttribute(cone.clone().applyMatrix4(placing(socket.at!, socket.turn, socket.size)).getAttribute('position') as Float32BufferAttribute);
      expect(box.max.y, `${width} by ${height}`).toBeGreaterThan(height - 0.04);
      expect(box.max.y, `${width} by ${height}`).toBeLessThan(height + 0.04);
      expect(box.min.y).toBeGreaterThan(-0.08);
      expect(box.min.x).toBeGreaterThan(-width / 2 - 0.06);
      expect(box.max.x).toBeLessThan(width / 2 + 0.06);
      // It is a slim cone that leans, not one pulled wide.
      expect(typeof socket.size).toBe('number');
    }
  });

  it('lays the cone that rolls across the path, as thick as the simulation has it', () => {
    const socket = rollingCone(1.9);
    const box = new Box3().setFromBufferAttribute(kit.shape('kotte')!.clone().applyMatrix4(placing(socket.at!, socket.turn, socket.size)).getAttribute('position') as Float32BufferAttribute);
    // The view draws each 1 in radius and 1.9 times as long as thick; the kit's is three times as long as thick then.
    expect(Math.max(box.max.x, -box.min.x, box.max.y, -box.min.y)).toBeCloseTo(1, 1);
    expect((box.max.z - box.min.z) * 1.9).toBeGreaterThan(5.8);
    expect((box.max.z - box.min.z) * 1.9).toBeLessThan(6.3);
    expect(box.max.z + box.min.z).toBeCloseTo(0, 1);
  });

  it('takes the place of each stand-in that asks for it, and of no other', () => {
    const scene = new Group();
    const twig = moverProp({ id: 'twig', look: 'twig', width: 2.4, height: 0.5, verb: 'pull', stops: [{ x: 0, y: 0 }] })!;
    const big = moverProp({ id: 'cone', look: 'cone', width: 1.1, height: 1.5, verb: 'push', stops: [{ x: 0, y: 0 }] })!;
    const leaf = moverProp({ id: 'rescue', look: 'leaf', width: 2.9, height: 0.3, verb: 'pull', stops: [{ x: 0, y: 0 }] })!;
    const plank = moverProp({ id: 'plank', look: 'plank', width: 2, height: 0.3, verb: 'push', stops: [{ x: 0, y: 0 }] })!;
    const seesaw = spotProp({ id: 'launch', look: 'seesaw', at: { x: 0, y: 0 }, verb: 'take' })!;
    const door = spotProp({ id: 'door', look: 'vittra-door', at: { x: 0, y: 0 }, verb: 'give' })!;
    const cap = rideProp('cap')!;
    const rollers = forestSocket(new InstancedMesh(new SphereGeometry(1, 12, 8), new MeshStandardMaterial(), 3), rollingCone(1.9));
    const lichen = new Mesh(new CylinderGeometry(0.06, 0.06, 4.25).translate(0, -4.25 / 2, 0), new MeshStandardMaterial());
    lichen.name = 'climb:lichen:43.7';
    const root = new Mesh(new CylinderGeometry(0.06, 0.06, 10.25).translate(0, -10.25 / 2, 0), new MeshStandardMaterial());
    root.name = 'climb:root:66.3';
    const hose = new Mesh(new CylinderGeometry(0.06, 0.06, 3).translate(0, -1.5, 0), new MeshStandardMaterial());
    hose.name = 'climb:hose:5';
    scene.add(twig, big, leaf, plank, seesaw.group, door.group, cap, rollers, lichen, root, hose);
    const before = { plank: plank.children.length, hose: hose.geometry, gift: door.group.children.at(-1) };

    // Plain boxes for what stands, and the kit's own lichen and root, which hang from where they are held.
    const plain = boxes('kotte', 'kvist', 'lovbat', 'gungbrada', 'gungsten', 'vittradorr', 'keps');
    const all: ForestKit = { shape: (name) => plain.shape(name) ?? (name === 'skagglav' || name === 'rot' ? kit.shape(name) : undefined), material: plain.material };
    const chapter = { ...forest, landmarks: [] };
    // Without the cap in the kit, the cap keeps its stand-in and everything else is the kit's.
    const lacking: ForestKit = { shape: (name) => (name === 'keps' ? undefined : all.shape(name)), material: all.material };
    expect(installForest(scene, chapter, lacking)).toBe(9);
    const drawnWith = (holder: Object3D) => {
      const materials = new Set<unknown>();
      holder.traverse((node) => { if ((node as Mesh).isMesh) materials.add((node as Mesh).material); });
      return [...materials];
    };
    for (const holder of [twig, big, leaf, rollers, lichen, root]) expect(drawnWith(holder)).toEqual([all.material]);
    expect(drawnWith(cap)).not.toContain(all.material);
    expect(installForest(scene, chapter, all)).toBe(1);
    expect(drawnWith(cap)).toEqual([all.material]);
    // What did not ask for the kit is as it was: another look's stand-in, the garden's hose, the berry left at the door.
    expect(plank.children.length).toBe(before.plank);
    expect(hose.geometry).toBe(before.hose);
    expect(door.group.children.at(-1)).toBe(before.gift);
    // The seesaw still tips: its stick is the group that the spot turns.
    const stick = seesaw.group.children[0]!;
    seesaw.update(true, 0, 1);
    expect(stick.rotation.z).toBeCloseTo(0.14 - 0.28);
    // What he climbs is as long as it was.
    for (const [mesh, long] of [[lichen, 4.25], [root, 10.25]] as const) {
      mesh.geometry.computeBoundingBox();
      expect(mesh.geometry.boundingBox!.min.y).toBeCloseTo(-long, 1);
      expect(mesh.geometry.boundingBox!.max.y).toBeCloseTo(0, 1);
    }
  });

  it('puts several shapes together as one, each where its matrix has it', () => {
    const one = boxes('a').shape('a')!;
    const made = together([{ shape: one, matrix: new Matrix4() }, { shape: one, matrix: placing([5, 0, 0], [0, 0, 0], 2), tone: 0.5 }]);
    expect(made.getAttribute('position').count).toBe(one.getAttribute('position').count * 2);
    expect(made.index!.count).toBe(one.index!.count * 2);
    made.computeBoundingBox();
    expect(made.boundingBox!.min.x).toBeCloseTo(-0.1);
    expect(made.boundingBox!.max.x).toBeCloseTo(5.2);
    expect(made.getAttribute('color').getX(made.getAttribute('color').count - 1)).toBeCloseTo(0.5);
  });
});

describe('the forest\'s floor with the kit', () => {
  /** The stretches of the chapter, as the dressing lays them out. */
  const stretches = () => {
    const out: [number, number, number][] = [];
    for (let a = forest.ground[0]!.x - 12; a < forest.ground.at(-1)!.x + 12; a += 18) out.push([a, a + 18, Math.round(a * 7 + 97)]);
    return out;
  };
  const places = (mesh: InstancedMesh): number[][] => Array.from({ length: mesh.count }, (_, i) => {
    const matrix = new Matrix4();
    mesh.getMatrixAt(i, matrix);
    return matrix.elements.slice(12, 15).map((n) => Math.round(n * 1000) / 1000);
  });

  it('is one mesh fewer in every stretch, and a third fewer triangles', () => {
    let standIn = 0;
    let fromKit = 0;
    for (const [from, to, seed] of stretches()) {
      const group = stretch(forest, from, to, seed);
      expect(group.children.length).toBe(8);
      standIn += triangles(group);
      expect(restock(group, forest, kit)).toBe(true);
      const trunks = group.getObjectByName('forest-trunks')!;
      expect(trunks.userData.casts).toBe(true);
      expect(group.children.length).toBeLessThanOrEqual(7);
      expect((group.children[0] as InstancedMesh).geometry).toBe(kit.shape('tuva'));
      fromKit += triangles(group);
    }
    expect(fromKit).toBeLessThan(standIn * 0.67);
  });

  it('keeps its stand-ins where the kit lacks a shape', () => {
    const [from, to, seed] = stretches()[2]!;
    const group = stretch(forest, from, to, seed);
    const children = [...group.children];
    expect(restock(group, forest, boxes(...FLOOR_SHAPES.slice(1)))).toBe(false);
    expect(group.children).toEqual(children);
  });

  it('leaves the grass, the sprigs, the needles and the spruces where they stood', () => {
    for (const [from, to, seed] of stretches()) {
      const standIn = stretch(forest, from, to, seed).children as InstancedMesh[];
      const fromKit = stretch(forest, from, to, seed, kit).children as InstancedMesh[];
      // Cushions first; then grass, leaves, berries, needles and trunks, which are the same with the kit and without.
      for (const kind of [1, 2, 3, 4, 5]) expect(places(fromKit[kind]!), `kind ${kind} from ${from}`).toEqual(places(standIn[kind]!));
    }
  });

  it('lays nothing in front of the path higher than the path, and nothing where he walks', () => {
    for (const [from, to, seed] of stretches()) {
      const still = stretch(forest, from, to, seed, kit).children.at(-1) as Mesh;
      if (still instanceof InstancedMesh) continue;
      const at = still.geometry.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const [x, y, z] = [at.getX(i), at.getY(i), at.getZ(i)];
        // A thing reaches a length or so from where it stands: the path may step up or down beside it.
        // In front of a pool the floor is its near shore, a finger over the water.
        const path = Math.max(...[x - 1.2, x, x + 1.2].map((near) => shoreAt(forest, near) ?? heightAt(forest, near)));
        if (z > 0.5) expect(y, `at x ${x.toFixed(1)}, ${z.toFixed(2)} in front`).toBeLessThan(path + 0.001);
        // Only what lies flat (a leaf's edge, a cushion of lichen) comes near the path's own strip.
        if (Math.abs(z) < 0.3) expect(y, `at x ${x.toFixed(1)}, z ${z.toFixed(2)}`).toBeLessThan(path + 0.12);
      }
    }
  });

  it('stands a spruce behind the vittra door, for its roots to be the door\'s arch', () => {
    const door = forest.spots!.find((spot) => spot.look === 'vittra-door')!;
    const [from, to, seed] = stretches().find(([a, b]) => door.at.x >= a && door.at.x < b)!;
    const trunks = places(stretch(forest, from, to, seed, kit).children[5] as InstancedMesh);
    const own = trunks.filter(([x, , z]) => Math.abs(x! - door.at.x) < 0.5 && z! > -3 && z! < -1.5);
    expect(own.length).toBe(1);
    // No other stands in its way.
    expect(trunks.filter(([x, , z]) => Math.abs(x! - door.at.x) < 3.2 && z! > -9).length).toBe(1);
  });
});
