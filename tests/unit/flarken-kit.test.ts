import { readFileSync } from 'node:fs';
import { BufferGeometry, DoubleSide, Float32BufferAttribute, Mesh, MeshBasicMaterial, Raycaster, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { flarken } from '../../src/content/aventyr2/chapters/flarken';
import { building } from '../../src/content/aventyr2/buildings';
import { bankShapes, jettiesOf } from '../../src/render/dressing/ground';
import { drawnPools } from '../../src/render/water';

/**
 * Flärkenbadet's tower and huts as Blender baked them (art/blender/flarken.py, art/baked/aventyr2/flarken.glb): where
 * he walks on one, the model's top is exactly where his ledge is, and the tower's ladder is where he climbs.
 */
function shapes(): Map<string, Mesh> {
  const data = readFileSync(new URL('../../art/baked/aventyr2/flarken.glb', import.meta.url));
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8'));
  const bin = data.subarray(20 + length + 8);
  const numbers = (index: number): number[] => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type as 'SCALAR']!;
    const [bytes, read] = ({ 5126: [4, (at: number) => bin.readFloatLE(at)], 5125: [4, (at: number) => bin.readUInt32LE(at)], 5123: [2, (at: number) => bin.readUInt16LE(at)] } as Record<number, [number, (at: number) => number]>)[accessor.componentType]!;
    const start = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? bytes * size;
    const values: number[] = [];
    for (let i = 0; i < accessor.count; i++) for (let k = 0; k < size; k++) values.push(read(start + i * stride + k * bytes));
    return values;
  };
  const out = new Map<string, Mesh>();
  for (const node of json.nodes as { name: string; mesh?: number; translation?: number[]; rotation?: number[] }[]) {
    if (node.mesh === undefined) continue;
    expect(node.rotation, node.name).toBeUndefined();
    const position: number[] = [];
    const index: number[] = [];
    for (const primitive of json.meshes[node.mesh].primitives) {
      const first = position.length / 3;
      position.push(...numbers(primitive.attributes.POSITION));
      index.push(...numbers(primitive.indices).map((i) => i + first));
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(position, 3));
    geometry.setIndex(index);
    const mesh = new Mesh(geometry, new MeshBasicMaterial({ side: DoubleSide }));
    if (node.translation) mesh.position.fromArray(node.translation);
    mesh.updateMatrixWorld();
    out.set(node.name, mesh);
  }
  return out;
}

const kit = shapes();
const ray = new Raycaster();
/** Where a ray from `from` going `way` first meets the thing, or null. */
function hit(name: string, from: Vector3, way: Vector3): Vector3 | null {
  ray.set(from, way.normalize());
  return ray.intersectObject(kit.get(name)!)[0]?.point ?? null;
}
const down = () => new Vector3(0, -1, 0);
const buildings = flarken.storm!.buildings!;
const ledges = flarken.ledges!;

describe('Flärkenbadet, made in Blender', () => {
  it('has the tower and the three huts, and puts each in its stand-in\'s place at the chapter\'s size', () => {
    for (const name of ['hopptorn', 'hydda', 'hydda-skjutdorr', 'hydda-tjarad']) expect(kit.has(name), name).toBe(true);
    const models = buildings.filter((def) => def.kind === 'tower' || def.kind === 'hut').map((def) => building(def).group.userData);
    expect(models.map((data) => data.model)).toEqual(['hydda', 'hydda-skjutdorr', 'hopptorn', 'hydda-tjarad']);
    for (const data of models) expect(data.fit).toBeCloseTo(1, 5);
  });

  it('stands its platform\'s planks exactly where he stands on the tower, and its ladder where he climbs it', () => {
    const tower = buildings.find((def) => def.kind === 'tower')!;
    const platform = ledges.find((ledge) => !ledge.needs && Math.abs(ledge.y - 3.3) < 1e-6)!;
    const climb = flarken.climbs!.find((c) => c.bottom === tower.y)!;
    // The play plane is 3.4 in front of the tower's middle (z -3.4 in the chapter).
    const plane = -tower.z;
    for (const x of [platform.x - platform.width / 2 + 0.1, platform.x, platform.x + platform.width / 2 - 0.1]) {
      const top = hit('hopptorn', new Vector3(x - tower.x, 20, plane), down());
      expect(top, `x ${x}`).not.toBeNull();
      expect(top!.y + tower.y!).toBeCloseTo(platform.y, 2);
    }
    // Nothing of it stands over the platform's ends at the play plane, where he steps on and jumps off.
    expect(hit('hopptorn', new Vector3(platform.x + platform.width / 2 + 0.3 - tower.x, 20, plane), down())?.y ?? -9).toBeLessThan(0);
    // A rung behind him at the climb, from the jetty up to the platform: they are 0.6 apart.
    for (const y of [0.32, 1.52, 2.12]) {
      const rung = hit('hopptorn', new Vector3(climb.x - tower.x, y + 0.02, 20), new Vector3(0, 0, -1));
      expect(rung, `y ${y}`).not.toBeNull();
      expect(plane - rung!.z).toBeGreaterThan(0);
      expect(plane - rung!.z).toBeLessThan(0.4);
    }
  });

  it('stands each hut\'s roof exactly where its ledge is, so that he neither floats over it nor sinks into it', () => {
    const huts = buildings.filter((def) => def.kind === 'hut' && !def.tar);
    for (const [i, hut] of huts.entries()) {
      const roof = ledges.filter((ledge) => ledge.width > 5 && Math.abs(ledge.y - 2.9) < 1e-6)[i]!;
      const name = hut.slider ? 'hydda-skjutdorr' : 'hydda';
      const plane = -hut.z;
      // Between the roof's standing seams, from one end of the ledge to the other.
      for (const x of [-2.9, -1.45, -0.5, 0.5, 1.45, 2.9]) {
        const top = hit(name, new Vector3(x, 20, plane), down());
        expect(top, `${name} x ${x}`).not.toBeNull();
        expect(top!.y).toBeGreaterThan(roof.y - 0.03);
        expect(top!.y).toBeLessThan(roof.y + 0.03);
        expect(roof.x - roof.width / 2 - hut.x).toBeLessThan(x + 0.25);
      }
      // And no roof past the ledge's ends: the gap between the two huts is open (under it, the rail's end stop).
      expect(hit(name, new Vector3(roof.width / 2 + 0.15, 20, plane), down())?.y ?? -9).toBeLessThan(roof.y - 0.1);
    }
  });

  it('hangs the second hut\'s rail where its door slides, rising as the door does', () => {
    const door = flarken.movers!.find((mover) => mover.look === 'hut-door')!;
    const hut = buildings.find((def) => def.kind === 'hut' && def.slider)!;
    for (const stop of door.stops) {
      const x = stop.x - hut.x;
      // The rail is 0.16 over the door's top, just behind the door at the play plane.
      const rail = hit('hydda-skjutdorr', new Vector3(x, stop.y + door.height + 0.16, 20), new Vector3(0, 0, -1));
      expect(rail, `x ${x}`).not.toBeNull();
      expect(-hut.z - rail!.z).toBeGreaterThan(0);
      expect(-hut.z - rail!.z).toBeLessThan(0.2);
    }
  });
});

describe('Flärken\'s jetty, standing in the lake', () => {
  const jetties = jettiesOf(flarken, 'shore');
  const lake = flarken.water!.find((w) => w.from === 144)!;

  it('draws the lake under the jetty, as one with the water it meets, and leaves the simulation\'s water as it is', () => {
    expect(jetties.map((j) => [j.from, j.to])).toEqual([[113, 144], [150, 154], [159.6, 173.4], [178, 191]]);
    const drawn = drawnPools(flarken.water!, jetties);
    // The puddle and the first pools as they were; the lake from the jetty's foot to its end, one water.
    expect(drawn[0]).toEqual(flarken.water![0]);
    expect(drawn.find((w) => w.from === 113)).toEqual({ from: 113, to: 191, y: lake.y });
    expect(drawnPools(flarken.water!)).toEqual(flarken.water);
    // A chapter with no jetty draws the pools it has.
    expect(jettiesOf(flarken, 'sphagnum')).toEqual([]);
  });

  it('has only the jetty\'s side above the water: in front of the planks and behind them is the lake, and no block under it', () => {
    const jetty = bankShapes(flarken, 'shore').filter(({ kind }) => kind === 'shoreRidge');
    expect(jetty.length).toBe(jetties.length);
    let seen = 0;
    for (const { shape } of jetty) {
      const at = shape.getAttribute('position');
      for (let i = 0; i < at.count; i++) {
        const [x, y, z] = [at.getX(i), at.getY(i), at.getZ(i)];
        if (!jetties.some((j) => x > j.from + 0.5 && x < j.to - 0.5)) continue;
        seen++;
        // Nothing of it stands out of the water past the planks' sleepers, in front or behind.
        if (Math.abs(z) > 1.47) expect(y, `x ${x}, z ${z}`).toBeLessThan(lake.y);
        // And it goes down into the water no further than its planks stand over it, where the waves have pushed them
        // down: no face falls away into the dark under the jetty.
        expect(y, `x ${x}, z ${z}`).toBeGreaterThan(lake.y - 1);
        expect(Math.abs(z)).toBeLessThan(1.6);
      }
    }
    expect(seen).toBeGreaterThan(100);
  });
});
