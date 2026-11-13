import { readFileSync } from 'node:fs';
import { BufferGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { antRide } from '../../src/render/ant-ride';
import { batStroke } from '../../src/render/lift/fauna';
import { RIGS, SMALL_KINDS, fallback, installSmallLife, smallKit, smallMaterial, swarm, type SmallKind } from '../../src/render/lift/fauna/small-kit';
import type { Assets } from '../../src/render/assets';

/**
 * The small and the many (the creature overhaul, 13 November 2026): modelled in Blender (art/blender/small-life.py),
 * moved in the vertex stage by four numbers an instance (src/render/lift/fauna/small-kit.ts).
 */

const FILE = new URL('../../art/baked/boot/small-life.glb', import.meta.url);

/** The baked kit's nodes, as Blender wrote them: each part's name and what it says on itself. */
function nodes(): { name: string; extras: Record<string, unknown> }[] {
  const data = readFileSync(FILE);
  const length = data.readUInt32LE(12);
  const json = JSON.parse(data.subarray(20, 20 + length).toString('utf8')) as { nodes: { name: string; extras?: Record<string, unknown> }[] };
  return json.nodes.filter((node) => node.extras?.creature).map((node) => ({ name: node.name, extras: node.extras! }));
}

async function model(): Promise<Group> {
  const data = readFileSync(FILE);
  const gltf = await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength), '');
  return gltf.scene;
}

describe('the small life kit', () => {
  it('has every creature, each with its moving parts, and says how each moves', () => {
    const parts = nodes();
    const of = (creature: string, rig?: string) => parts.filter((p) => p.extras.creature === creature && (rig === undefined || p.extras.rig === rig));
    for (const creature of ['butterfly', 'dragonfly', 'bat', 'firefly', 'bee', 'ant']) expect(of(creature, 'body').length, creature).toBeGreaterThan(0);
    // Three butterflies, each with its own body and its four wings.
    for (const species of [1, 2, 3]) {
      const own = of('butterfly').filter((p) => p.extras.species === species);
      expect(own.map((p) => p.extras.rig).sort()).toEqual(['body', 'hind', 'hind', 'wing', 'wing']);
    }
    // A dragonfly's four glassy wings, two on each side.
    const wings = [...of('dragonfly', 'wing'), ...of('dragonfly', 'hind')];
    expect(wings.length).toBe(4);
    expect(wings.map((w) => w.extras.side).sort()).toEqual([-1, -1, 1, 1]);
    for (const w of wings) expect(w.extras.alpha as number).toBeLessThan(0.5);
    // A bat's wings fold at the wrist, out beyond the shoulder.
    for (const w of of('bat', 'batwing')) {
      const [sx, sy] = w.extras.pivot as number[];
      const [jx, jy] = w.extras.joint as number[];
      expect(Math.hypot(jx! - sx!, jy! - sy!)).toBeGreaterThan(0.15);
    }
    expect(of('firefly', 'lantern').length).toBe(1);
    expect(of('bee', 'wing').length).toBe(2);
  });

  it("walks its ant in a tripod: the near side's front and back legs with the far side's middle one", () => {
    const legs = nodes().filter((p) => p.extras.creature === 'ant' && p.extras.rig === 'leg');
    expect(legs.length).toBe(6);
    const group = (name: string) => legs.find((p) => p.name === name)!.extras.group;
    expect(['myra-ben-0n', 'myra-ben-2n', 'myra-ben-1f'].map(group)).toEqual([0, 0, 0]);
    expect(['myra-ben-1n', 'myra-ben-0f', 'myra-ben-2f'].map(group)).toEqual([1, 1, 1]);
    // Its feet are on the ground it stands on: its origin.
    expect(legs.every((p) => (p.extras.pivot as number[])[2]! > 0.05)).toBe(true);
  });

  it('reads into one shape a kind, every corner with its rig, its body first', async () => {
    const kit = smallKit(await model());
    expect([...kit.keys()].sort()).toEqual([...SMALL_KINDS].sort());
    for (const [kind, shape] of kit) {
      for (const name of ['position', 'normal', 'color', 'pivot', 'joint', 'rig']) expect(shape.getAttribute(name), `${kind} ${name}`).toBeDefined();
      // The same corners as the shape built in code, so that one material draws either.
      expect(shape.getAttribute('color').itemSize, kind).toBe(fallback(kind).getAttribute('color').itemSize);
      expect(shape.getAttribute('rig').getX(0), `${kind}: its body first`).toBe(RIGS.body);
    }
    // A bat's hand is all hand out at its tip, and none of it by its shoulder.
    const bat = kit.get('bat')!;
    const rig = bat.getAttribute('rig'), at = bat.getAttribute('position');
    let tip = 0, root = 1;
    for (let i = 0; i < rig.count; i++) {
      if (rig.getX(i) !== RIGS.batwing) continue;
      if (Math.abs(at.getZ(i)) > 0.45) tip = Math.max(tip, rig.getZ(i));
      if (Math.abs(at.getZ(i)) < 0.1) root = Math.min(root, rig.getZ(i));
    }
    expect(tip).toBe(1);
    expect(root).toBe(0);
    // A dragonfly's wing is mostly clear, its veins not.
    const dragonfly = kit.get('dragonfly')!;
    const colour = dragonfly.getAttribute('color');
    const clear: number[] = [];
    for (let i = 0; i < colour.count; i++) if (dragonfly.getAttribute('rig').getX(i) === RIGS.wing) clear.push(colour.getW(i));
    expect(Math.min(...clear)).toBeLessThan(0.3);
    expect(Math.max(...clear)).toBeGreaterThan(0.8);
    // Small things stay small: the ant 0.36 long, the bee 0.22, a butterfly 0.42 across.
    const size = (shape: BufferGeometry) => { shape.computeBoundingBox(); return shape.boundingBox!.getSize(new Vector3()); };
    expect(size(kit.get('ant')!).x).toBeCloseTo(0.36, 1);
    expect(size(kit.get('bee')!).x).toBeCloseTo(0.24, 1);
    expect(size(kit.get('butterfly-1')!).z).toBeCloseTo(0.43, 1);
  });

  it('takes the place of the shapes built in code, before the first frame, and each keeps its numbers', async () => {
    const loaded = await model();
    const assets = { manifest: async () => ({ version: 1, packs: { boot: { bytes: 1, files: { 'small-life.glb': 1 } } } }), model: async () => loaded } as unknown as Assets;
    const scene = new Group();
    const ants = swarm('ant', 3, smallMaterial());
    ants.geometry.getAttribute('act').setXYZW(1, 2, 0.5, 0, 0);
    scene.add(ants, new Mesh(new BufferGeometry(), new MeshBasicMaterial()));
    const before = ants.geometry;
    expect(await installSmallLife(assets, scene)).toBe(true);
    expect(ants.geometry).not.toBe(before);
    expect(ants.geometry.getAttribute('act')).toBe(before.getAttribute('act'));
    expect(ants.geometry.getAttribute('act').getX(1)).toBe(2);
    // Once only.
    expect(await installSmallLife(assets, scene)).toBe(false);
    // Without the file, the shapes built in code stay.
    const none = { manifest: async () => ({ version: 1, packs: {} }) } as unknown as Assets;
    const other = new Group().add(swarm('bee', 1, smallMaterial(true)));
    expect(await installSmallLife(none, other)).toBe(false);
  });

  it('has a shape built in code for every kind, with the same rig', () => {
    for (const kind of SMALL_KINDS) {
      const shape = fallback(kind);
      const rig = shape.getAttribute('rig');
      expect(rig.itemSize, kind).toBe(4);
      expect(shape.getAttribute('pivot').count, kind).toBe(rig.count);
    }
    const legs = (kind: SmallKind) => {
      const rig = fallback(kind).getAttribute('rig');
      const groups = new Set<number>();
      for (let i = 0; i < rig.count; i++) if (rig.getX(i) === RIGS.leg) groups.add(rig.getZ(i));
      return [...groups].sort();
    };
    expect(legs('ant')).toEqual([0, 1]);
  });
});

describe('the bat', () => {
  it('folds its hands as its wings come up, and spreads them wide on the way down', () => {
    for (let k = 0; k < 64; k++) {
      const phase = (k / 64) * Math.PI * 2;
      const [, fold] = batStroke(phase);
      const rising = batStroke(phase + 0.01)[0] > batStroke(phase)[0];
      if (!rising) expect(fold, `phase ${phase.toFixed(2)}`).toBeLessThan(0.01);
    }
    expect(batStroke(0)[1]).toBeGreaterThan(0.9);
  });
});

describe('the ants that carry him', () => {
  it('walk by the way they have come, lean with the slope they climb, and hold still with less motion', () => {
    const ride = antRide();
    const ants = ride.children[0] as InstancedMesh;
    const walk = ride.userData.walk as (clock: number, dt: number, still: boolean) => void;
    const act = ants.geometry.getAttribute('act');
    ride.position.set(0, 0, 0);
    walk(0, 1 / 60, false);
    const step = act.getX(0);
    // Up a slope, a little at a time.
    for (let f = 1; f <= 60; f++) {
      ride.position.set(f * 0.03, f * 0.03, 0);
      walk(f / 60, 1 / 60, false);
    }
    // Their steps are as long as the way: 1.8 along the slope in steps of 0.2.
    expect(act.getX(0) - step).toBeCloseTo((Math.hypot(1.8, 1.8) / 0.2) * Math.PI * 2, 1);
    expect(act.getY(0)).toBeGreaterThan(0.9);
    expect(ride.rotation.z).toBeGreaterThan(0.6);
    expect(ride.rotation.z).toBeLessThanOrEqual(0.75);
    // Their feet are under his: he stands on their backs.
    const m = new Matrix4();
    ants.getMatrixAt(0, m);
    expect(new Vector3().setFromMatrixPosition(m).y).toBeLessThan(-0.1);
    // With less motion, nothing steps.
    const held = act.getX(0);
    ride.position.set(3, 3, 0);
    walk(2, 1 / 60, true);
    expect(act.getX(0)).toBe(held);
    expect(ride.rotation.z).toBe(0);
  });
});
