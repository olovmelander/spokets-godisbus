import { readFileSync } from 'node:fs';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { building } from '../../src/content/aventyr2/buildings';

/**
 * A thing of the buildings kit as Blender baked it (art/blender/a2-buildings.py, art/baked/aventyr2/buildings.glb), its
 * points only, in the game's frame: a baked file is plain, with no compression to undo.
 */
function kitMesh(name: string): Mesh {
  const data = readFileSync(new URL('../../art/baked/aventyr2/buildings.glb', import.meta.url));
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
  const bin = data.subarray(20 + length + 8);
  const read = (index: number): number[] => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const size = accessor.type === 'VEC3' ? 3 : 1;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const values: number[] = [];
    for (let i = 0; i < accessor.count * size; i++) {
      if (accessor.componentType === 5126) values.push(bin.readFloatLE(start + i * 4));
      else if (accessor.componentType === 5125) values.push(bin.readUInt32LE(start + i * 4));
      else values.push(bin.readUInt16LE(start + i * 2));
    }
    return values;
  };
  const node = (json.nodes as { name: string; mesh?: number; translation?: number[] }[]).find((n) => n.name === name)!;
  expect(node.translation, name).toBeUndefined();
  const primitive = json.meshes[node.mesh!].primitives[0];
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(read(primitive.attributes.POSITION), 3));
  geometry.setIndex(read(primitive.indices));
  return new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
}

/** Äventyr 2's buildings made in Blender keep the game's own glass, so that it can light: it must lie where their windows are. */
describe('Äventyr 2: the buildings kit and the glass the game keeps', () => {
  it('lays the church\'s and the store\'s glass on their walls, behind the glazing bars, never in a wall or off it', () => {
    for (const [kind, model, size] of [['church', 'kyrka', 26], ['store', 'kiosk', 22]] as const) {
      const walls = kitMesh(model);
      const glass = (building({ kind, x: 0, z: 0, width: size }).group.children[1] as Mesh).geometry;
      const at = glass.getAttribute('position');
      const index = glass.getIndex()!;
      let behind = 0;
      let total = 0;
      for (let t = 0; t < index.count; t += 3) {
        const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(at, index.getX(t + k))) as [Vector3, Vector3, Vector3];
        const out = b.clone().sub(a).cross(c.clone().sub(a));
        if (out.length() < 1e-6) continue;
        out.normalize();
        const middle = a.clone().add(b).add(c).divideScalar(3);
        // Its middle, and halfway from there to each corner.
        for (const point of [middle, ...[a, b, c].map((corner) => corner.clone().add(middle).multiplyScalar(0.5))]) {
          const hit = new Raycaster(point.clone().addScaledVector(out, 1), out.clone().negate(), 0, 3).intersectObject(walls)[0];
          total++;
          expect(hit, `${kind}: something behind the glass at ${point.toArray().map((v) => v.toFixed(2))}`).toBeDefined();
          // The wall just behind the glass, or a bar, the frame or the keystone over an arch just in front of it.
          expect(hit!.distance, kind).toBeGreaterThan(0.8);
          expect(hit!.distance, kind).toBeLessThan(1.06);
          if (hit!.distance > 1) behind++;
        }
      }
      expect(total).toBeGreaterThan(1);
      // Most of it shows the wall's dark glass, not bars.
      expect(behind / total, kind).toBeGreaterThanOrEqual(0.5);
    }
  });

  it('hangs the pole\'s lamp glass in the lamp\'s head', () => {
    const lamp = kitMesh('elstolpe');
    const glass = (building({ kind: 'pole', x: 0, z: 0, height: 19, width: 34 }).group.children[1] as Mesh).geometry;
    glass.computeBoundingBox();
    const middle = glass.boundingBox!.getCenter(new Vector3());
    const up = new Raycaster(middle, new Vector3(0, 1, 0), 0, 3).intersectObject(lamp)[0];
    expect(up?.distance).toBeLessThan(0.6);
  });

  it('makes every kind it stands in for, and nothing more', () => {
    const generator = readFileSync(new URL('../../art/blender/a2-buildings.py', import.meta.url), 'utf8');
    const made = [...generator.matchAll(/^ {4}finish\(part, '([a-z-]+)'/gm)].map((match) => match[1]);
    const asked = (['church', 'lodge', 'store', 'floodlight', 'pole'] as const).map((kind) => building({ kind, x: 0, z: 0 }).group.userData.model as string);
    expect(made.sort()).toEqual([...asked].sort());
  });
});
