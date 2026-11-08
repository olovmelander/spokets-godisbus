import { readFileSync } from 'node:fs';
import { Color } from 'three';
import { describe, expect, it } from 'vitest';

/** The baked Bredbyn model (scripts/bake-bredbyn.mjs, art/blender/bredbyn-shade.py), read as the game gets it. */
const file = readFileSync(new URL('../../art/baked/boot/bredbyn.glb', import.meta.url));
const json = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)).toString('utf8'));
const bin = file.subarray(28 + file.readUInt32LE(12));
interface Accessor { bufferView: number; componentType: number; count: number; type: string; byteOffset?: number }
function floats(index: number): Float32Array {
  const accessor: Accessor = json.accessors[index];
  expect(accessor.componentType).toBe(5126);
  const view = json.bufferViews[accessor.bufferView];
  const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type]!;
  const start = bin.byteOffset + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  return new Float32Array(bin.buffer.slice(start, start + accessor.count * size * 4));
}
const nodes: { name: string; mesh?: number }[] = json.nodes;
const meshOf = (name: string) => json.meshes[nodes.find((node) => node.name === name)!.mesh!].primitives[0];

describe('Bredbyn with its shade baked in', () => {
  it('keeps the names the game places it by, each building one opaque draw with its colours on its corners', () => {
    for (const name of ['bredbyn', 'bredbyn-landmarks', 'bredbyn-street']) expect(nodes.some((node) => node.name === name)).toBe(true);
    let triangles = 0;
    for (const name of ['anundsjo-church', 'anundsjo-bell-tower', 'street-west', 'street-east']) {
      const node = nodes.find((one) => one.name === name)!;
      expect(json.meshes[node.mesh!].primitives).toHaveLength(1);
      const primitive = meshOf(name);
      expect(Object.keys(primitive.attributes).sort()).toEqual(['COLOR_0', 'NORMAL', 'POSITION']);
      const material = json.materials[primitive.material];
      expect(material.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      expect(material.doubleSided ?? false).toBe(false);
      expect(material.pbrMetallicRoughness.baseColorTexture).toBeUndefined();
      triangles += json.accessors[primitive.indices].count / 3;
    }
    expect(json.images ?? []).toHaveLength(0);
    // The shade needs points on the large walls: no more than this, for a model seen far off.
    expect(triangles).toBeLessThan(30000);
  });

  it('darkens the church wall under its eaves and leaves the open wall bright', () => {
    const primitive = meshOf('anundsjo-church');
    const position = floats(primitive.attributes.POSITION), colour = floats(primitive.attributes.COLOR_0);
    const size = json.accessors[primitive.attributes.COLOR_0].type === 'VEC4' ? 4 : 3;
    const plaster = new Color('#e5e0cf');
    const under: number[] = [], open: number[] = [];
    for (let i = 0; i < position.length / 3; i++) {
      // The long wall towards the street, between the porch and the east gable: z 5, x from -4 to 11.
      const x = position[i * 3]!, y = position[i * 3 + 1]!, z = position[i * 3 + 2]!;
      if (Math.abs(z - 5) > 1e-3 || x < -4 || x > 10.5) continue;
      const k = colour[i * size]! / plaster.r;
      // Only the plaster's own corners: its hue stays when it is shaded.
      if (Math.abs(colour[i * size + 2]! / plaster.b - k) > 0.01) continue;
      if (y > 6.2) under.push(k);
      else if (y > 2.5 && y < 4.5) open.push(k);
    }
    expect(under.length).toBeGreaterThan(5);
    expect(open.length).toBeGreaterThan(5);
    const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
    expect(mean(under)).toBeLessThan(0.85);
    expect(mean(open)).toBeGreaterThan(mean(under) + 0.08);
  });
});
