import { readFileSync } from 'node:fs';
import { BufferGeometry, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { COURSES } from '../../src/content/chapters';
import { assemble, villageKit } from '../../src/render/village';

const chapter = COURSES['byn']!;
/** With decorative procedural surfaces excluded, an absent kit isolates the stone facing. */
const facing = (course = chapter, part = 0) => assemble(new Map(), course, course.street!, [part]);
const mesh = (shape: BufferGeometry) => new Mesh(shape, new MeshBasicMaterial());

describe('the village masonry', () => {
  it('faces only the raised kerb and shop step, with the correct outward normals and bounded cap', () => {
    const before = JSON.stringify(chapter);
    let triangles = 0;
    for (const [part, x, low, top, side] of [[0, 12, 0, 2, 1], [4, 110, 0, 3.3, -1]]) {
      const shape = facing(chapter, part);
      const at = shape.getAttribute('position'), normal = shape.getAttribute('normal');
      shape.computeBoundingBox();
      const box = shape.boundingBox!;
      expect(box.min.y).toBeCloseTo(low!);
      expect(box.max.y).toBeCloseTo(top!);
      expect(box.min.z).toBe(-7);
      expect(box.max.z).toBeCloseTo(0.45);
      expect(shape.boundingSphere!.containsPoint(box.getCenter(new Vector3()))).toBe(true);
      let caps = 0;
      for (let i = 0; i < at.count; i++) {
        const proud = (at.getX(i) - x!) * side!;
        expect(proud).toBeGreaterThan(0.003);
        expect(proud).toBeLessThan(0.046);
        const n = new Vector3().fromBufferAttribute(normal, i);
        expect(n.length()).toBeCloseTo(1, 5);
        expect(n.x * side!).toBeGreaterThan(0.4);
        if (n.y > 0.1) caps++;
      }
      expect(caps).toBeGreaterThan(0);
      triangles += shape.index!.count / 3;
    }
    expect(triangles).toBeLessThan(400);
    // Awnings and smooth plaster are also built without the kit. Exclude both to isolate stone facing.
    const bare = { ...chapter, street: chapter.street!.map((part) => ({ ...part, awnings: undefined, finish: undefined })) };
    for (const part of [1, 2, 3]) expect(facing(bare, part).index!.count).toBe(0);
    const frame = COURSES['look-street']!;
    const kerb = facing(frame);
    kerb.computeBoundingBox();
    expect(kerb.boundingBox!.min.x).toBeCloseTo(7.004);
    for (const part of [1, 2]) expect(facing(frame, part).index!.count).toBe(0);
    expect(JSON.stringify(chapter)).toBe(before);
  });

  it('has visible stones in front of recessed mortar, two shop courses and staggered upright joints', () => {
    const wall = mesh(facing(chapter, 4));
    const ray = new Raycaster();
    const surface = (y: number, z: number) => {
      ray.set(new Vector3(109, y, z), new Vector3(1, 0, 0));
      const hit = ray.intersectObject(wall)[0];
      expect(hit, `wall at y${y}, z${z}`).toBeDefined();
      return hit!.point.x;
    };
    expect(surface(0.8, -2.5)).toBeCloseTo(109.955, 3);
    expect(surface(1.65, -2.5)).toBeCloseTo(109.996, 3);
    expect(surface(2.4, -2.5)).toBeCloseTo(109.955, 3);
    // The lower course's upright joint is a whole stone in the upper course.
    expect(surface(0.8, -3.7)).toBeCloseTo(109.996, 3);
    expect(surface(2.4, -3.7)).toBeCloseTo(109.955, 3);
    // A descending kerb must also be visible from its lower side with ordinary front-face culling.
    ray.set(new Vector3(13, 1, -2), new Vector3(-1, 0, 0));
    expect(ray.intersectObject(mesh(facing()))[0]!.point.x).toBeCloseTo(12.045, 3);
  });

  it('retains exactly the same stone geometry when the actual village kit arrives', async () => {
    const bytes = readFileSync(new URL('../../art/baked/boot/village.glb', import.meta.url));
    const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
    const kit = villageKit(model.scene);
    expect(kit.has('sockel')).toBe(true);
    expect(kit.has('panel')).toBe(true);
    for (const part of [0, 4]) {
      const bare = facing(chapter, part);
      const full = assemble(kit, chapter, chapter.street!, [part]);
      for (const name of ['position', 'normal', 'color', 'uv']) {
        const expected = bare.getAttribute(name).array;
        expect(full.getAttribute(name).array.slice(-expected.length)).toEqual(expected);
      }
      const offset = full.getAttribute('position').count - bare.getAttribute('position').count;
      expect(Array.from(full.index!.array.slice(-bare.index!.count), (i) => i - offset)).toEqual(Array.from(bare.index!.array));
      // Rebuilt bounds include the facing where the old house alone stopped seven EL behind the path.
      const at = bare.getAttribute('position');
      for (let i = 0; i < at.count; i++) expect(full.boundingSphere!.containsPoint(new Vector3().fromBufferAttribute(at, i))).toBe(true);
    }
  });
});
