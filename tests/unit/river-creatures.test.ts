import { readFileSync } from 'node:fs';
import { Box3, Group, Object3D, Quaternion, Vector3, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { beforeAll, describe, expect, it } from 'vitest';
import { beaverLife, THUMP_HIT, WADDLE_STRIDE } from '../../src/content/aventyr2/beaver';
import { alven } from '../../src/content/aventyr2/chapters/alven';
import { otterLife, type OtterWatcher } from '../../src/content/aventyr2/otter';
import { attachRig, rigOf, riggedHolder, turnBone } from '../../src/content/aventyr2/river-creatures';
import type { CreatureClips } from '../../src/render/creature-clips';

/**
 * Älven's beaver and otter, rigged and animated in Blender (art/blender/beaver.py, art/blender/otter.py), and their
 * lives playing their clips (src/content/aventyr2/beaver.ts, otter.ts, river-creatures.ts).
 */

/** The JSON of a GLB, as Blender wrote it (art/baked). */
function glb(path: string) {
  const buffer = readFileSync(path);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[] }[];
  };
}

async function load(path: string): Promise<Object3D> {
  const file = readFileSync(path);
  const gltf = await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '');
  gltf.scene.animations = gltf.animations;
  return gltf.scene;
}

const CREATURES = [
  { file: 'art/baked/aventyr2/beaver.glb', creature: 'beaver', clips: ['gnaw', 'look', 'thump', 'waddle', 'rise', 'swim', 'slap', 'dive'],
    bones: ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'jaw', 'ear.L', 'stick', 'stick.wood', 'upper_arm.L', 'hand.R', 'thigh.L', 'foot.R', 'toes.L', 'tail1', 'tail3'] },
  { file: 'art/baked/aventyr2/otter.glb', creature: 'otter', clips: ['sit', 'look', 'leap', 'swim', 'float', 'climb', 'shake'],
    bones: ['root', 'hips', 'spine', 'chest', 'neck', 'head', 'pebble', 'upper_arm.L', 'hand.R', 'thigh.L', 'foot.R', 'tail1', 'tail4'] },
] as const;

describe('the rigged beaver and otter from Blender', () => {
  for (const { file, creature, clips, bones } of CREATURES) {
    it(`${creature}: one skinned mesh, its bones by their names, and every clip`, () => {
      const json = glb(file);
      expect(json.skins).toHaveLength(1);
      expect(json.nodes.filter((node) => node.skin !== undefined)).toHaveLength(1);
      const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
      for (const bone of bones) expect(joints).toContain(bone);
      // The controls used while posing (IK targets, the grips on the stick, the marker in its mouth) are baked away.
      expect(joints.some((name) => /_ik\.|grip\.|stick\.mouth/.test(name ?? ''))).toBe(false);
      expect(json.animations?.map((a) => a.name).sort()).toEqual(clips.map((clip) => `${creature}:${clip}`).sort());
      // Every clip moves every bone, so that no clip leaves a bone where another put it.
      for (const animation of json.animations!) {
        const moved = new Set(animation.channels.map((channel) => channel.target.node));
        for (const joint of json.skins![0]!.joints) expect(moved.has(joint)).toBe(true);
      }
    });
  }

  it('the beaver waddles strides as long as its kit builds them, and its tail hits when the game splashes', () => {
    const kit = readFileSync('art/blender/beaver.py', 'utf8');
    expect(kit).toContain(`WADDLE_STRIDE = ${WADDLE_STRIDE}`);
    expect(kit).toContain(`THUMP_HIT = ${THUMP_HIT * 24} / 24.0`);
  });
});

/** A copy of the rigged creature in a holder, posed at `clip`'s `phase`, and the holder's world box. */
function posed(model: Object3D, creature: 'beaver' | 'otter', clip: string, phase: number, fit = 1) {
  const parent = new Group();
  const holder = riggedHolder(parent, creature, fit);
  expect(attachRig(holder, model)).toBe(true);
  const rig = rigOf(holder)!;
  rig.scrub(clip, phase);
  rig.update(0);
  parent.updateMatrixWorld(true);
  const box = new Box3();
  rig.root.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    // The skinned points where the bones put them.
    const at = new Vector3();
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 7) {
      mesh.getVertexPosition(i, at);
      box.expandByPoint(at.applyMatrix4(mesh.matrixWorld));
    }
  });
  const head = rig.bone('head')!.getWorldPosition(new Vector3());
  return { rig, box, head };
}

describe('their size, origin and facing are the old ones\'', () => {
  let beaver: Object3D;
  let otter: Object3D;
  beforeAll(async () => {
    beaver = await load('art/baked/aventyr2/beaver.glb');
    otter = await load('art/baked/aventyr2/otter.glb');
  });

  it('the beaver sits gnawing over its origin, as tall as the kit\'s old one, facing the camera (+z)', () => {
    const { box, head } = posed(beaver, 'beaver', 'gnaw', 0);
    expect(box.max.y).toBeGreaterThan(1.7);
    expect(box.max.y).toBeLessThan(2.0);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(Math.abs((box.min.x + box.max.x) / 2)).toBeLessThan(0.3);
    // Its head is forward of its middle, towards us; its tail out behind.
    expect(head.z).toBeGreaterThan(0.05);
    expect(box.min.z).toBeLessThan(-1.5);
  });

  it('swimming, the beaver is low in the water, its origin at the surface, and only its head and back above it', () => {
    const { box, head } = posed(beaver, 'beaver', 'swim', 0);
    expect(box.max.y).toBeGreaterThan(0.1);
    expect(box.max.y).toBeLessThan(0.6);
    expect(box.min.y).toBeLessThan(-0.6);
    expect(head.y).toBeGreaterThan(-0.15);
  });

  it('the otter sits up on its origin as tall as the kit\'s old one (at its fit), facing the camera', () => {
    const { box, head } = posed(otter, 'otter', 'sit', 0, 0.86);
    expect(box.max.y).toBeGreaterThan(1.2);
    expect(box.max.y).toBeLessThan(1.6);
    expect(box.min.y).toBeGreaterThan(-0.05);
    expect(Math.abs((box.min.x + box.max.x) / 2)).toBeLessThan(0.3);
    expect(head.z).toBeGreaterThan(0.1);
  });

  it('floating, the otter is on its back: its belly and its pebble up, at the water\'s surface', () => {
    const { rig, box } = posed(otter, 'otter', 'float', 0);
    const pebble = rig.bone('pebble')!.getWorldPosition(new Vector3());
    const spine = rig.bone('spine')!.getWorldPosition(new Vector3());
    expect(pebble.y).toBeGreaterThan(spine.y + 0.1);
    expect(box.max.y).toBeGreaterThan(0.05);
    expect(box.min.y).toBeLessThan(-0.15);
    // Only floating does it hold its pebble: sitting, the pebble is put away.
    const sitting = posed(otter, 'otter', 'sit', 0).rig.bone('pebble')!;
    expect(sitting.getWorldScale(new Vector3()).x).toBeLessThan(0.01);
  });

  it('a look turns a bone about the world\'s up, on top of its pose', () => {
    const { rig } = posed(beaver, 'beaver', 'look', 0);
    const head = rig.bone('head')!;
    const before = new Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new Quaternion()));
    turnBone(head, 0.5);
    head.updateWorldMatrix(true, false);
    const after = new Vector3(0, 0, 1).applyQuaternion(head.getWorldQuaternion(new Quaternion()));
    const yaw = (v: Vector3) => Math.atan2(v.x, v.z);
    const turned = yaw(after) - yaw(before);
    expect(turned - 2 * Math.PI * Math.round(turned / (2 * Math.PI))).toBeCloseTo(0.5, 2);
    expect(after.y).toBeCloseTo(before.y, 3);
  });
});

/** What the rig shows most now. */
const most = (rig: CreatureClips) => [...rig.showing()].sort((a, b) => b.weight - a.weight)[0]?.name;

describe('the beaver\'s life plays its clips', () => {
  let model: Object3D;
  beforeAll(async () => { model = await load('art/baked/aventyr2/beaver.glb'); });

  function beaver() {
    const decor = alven.decor!.find((d) => d.word === 'baver')!;
    const group = new Group();
    group.position.set(decor.at.x, decor.at.y, decor.z ?? -0.6);
    const kit = new Group();
    // The kit's old beaver, which waits hidden while the rigged one is there.
    const old = new Object3D();
    kit.add(old);
    group.add(kit);
    const elof = { x: 0, still: false };
    const lodge = alven.storm!.buildings!.find((b) => b.kind === 'lodge')!;
    const life = beaverLife({ id: 'decor:beaver', at: decor.at, verb: 'take', look: 'kit', word: 'baver' }, group, kit, () => alven.water ?? [], elof, () => lodge);
    const holder = kit.getObjectByName('beaver-rig')!;
    expect(attachRig(holder, model)).toBe(true);
    const rig = rigOf(holder)!;
    let clock = 0;
    const run = (x: number, seconds: number) => {
      elof.x = x;
      for (let t = 0; t < seconds; t += 1 / 30) { clock += 1 / 30; life.update(false, clock, 1 / 30); }
    };
    const world = () => kit.getWorldPosition(new Vector3());
    return { decor, kit, old, elof, run, rig, world };
  }

  it('gnaws, then looks at him, thumps its tail and waddles off by its steps, the old beaver hidden', () => {
    const b = beaver();
    b.run(100, 2);
    expect(most(b.rig)).toBe('gnaw');
    expect(b.old.visible).toBe(false);
    b.run(b.decor.at.x - 3, 0.5);
    expect(most(b.rig)).toBe('look');
    b.run(b.decor.at.x - 3, 2.2);
    expect(b.rig.showing().map((s) => s.name)).toContain('thump');
    // Off on all fours: the stride scrubbed by how far it has gone.
    b.run(b.decor.at.x - 3, 1.6);
    const first = b.rig.showing().find((s) => s.name === 'waddle')!;
    expect(first.weight).toBeGreaterThan(0.9);
    b.run(b.decor.at.x - 3, 0.3);
    const later = b.rig.showing().find((s) => s.name === 'waddle')!;
    expect(later.phase).not.toBeCloseTo(first.phase, 2);
    b.run(b.decor.at.x - 3, 0.8);
    expect(b.world().z).toBeLessThan(b.decor.z! - 1);
    b.run(b.decor.at.x - 3, 3);
    expect(b.kit.visible).toBe(false);
  });

  it('rises on its lodge\'s top, thumps there, and swims out over the lake, slaps the water and dives', () => {
    const b = beaver();
    b.run(b.decor.at.x - 3, 8);
    b.run(120.4, 0.5);
    expect(b.kit.visible).toBe(true);
    expect(most(b.rig)).toBe('rise');
    b.run(121, 1.6);
    expect(b.rig.showing().map((s) => s.name)).toContain('thump');
    b.run(133, 2.4);
    expect(most(b.rig)).toBe('swim');
    const lake = alven.water!.filter((w) => w.from > b.decor.at.x).sort((a, c) => a.from - c.from)[0]!;
    b.run(133, 2);
    // Its origin rides at the water's surface.
    expect(Math.abs(b.world().y - lake.y)).toBeLessThan(0.1);
    b.run(133, 5.4);
    expect(b.rig.showing().map((s) => s.name).some((n) => n === 'slap' || n === 'dive')).toBe(true);
  });

  it('keeps still with less motion asked for', () => {
    const b = beaver();
    b.elof.still = true;
    b.run(60, 1);
    const head = b.rig.bone('head')!.quaternion.clone();
    b.run(60, 1);
    expect(b.rig.bone('head')!.quaternion.angleTo(head)).toBeLessThan(1e-6);
  });
});

describe('the otter\'s life plays its clips', () => {
  let model: Object3D;
  beforeAll(async () => { model = await load('art/baked/aventyr2/otter.glb'); });

  function otter() {
    const decor = alven.decor!.find((d) => d.look === 'otter')!;
    const root = new Group();
    root.position.set(decor.at.x, decor.at.y, decor.z ?? 0);
    const group = new Group();
    group.scale.setScalar(0.72);
    group.userData.fit = 0.86;
    const old = new Object3D();
    group.add(old);
    root.add(group);
    const splash = { group: new Group(), update: () => {} };
    const elof: OtterWatcher = { x: 0, y: 0, still: false, riding: false };
    const life = otterLife({ id: 'decor:otter', at: decor.at, verb: 'take', look: 'otter' }, group, elof, splash, () => alven.water ?? [], () => {});
    const holder = group.getObjectByName('otter-rig')!;
    expect(attachRig(holder, model)).toBe(true);
    const rig = rigOf(holder)!;
    let clock = 0;
    const run = (x: number, seconds: number) => {
      elof.x = x;
      for (let t = 0; t < seconds; t += 1 / 30) { clock += 1 / 30; life.alive(clock, 1 / 30); }
    };
    return { decor, group, old, elof, run, rig, life };
  }

  it('sits, looks round at him, leaps, floats on its back, climbs back and shakes itself', () => {
    const o = otter();
    o.run(132, 2);
    expect(o.life.phase()).toBe('sit');
    expect(most(o.rig)).toBe('sit');
    expect(o.old.visible).toBe(false);
    o.run(o.decor.at.x - 3, 0.3);
    expect(o.life.phase()).toBe('alert');
    expect(most(o.rig)).toBe('look');
    o.run(o.decor.at.x - 3, 0.5);
    expect(o.life.phase()).toBe('leap');
    expect(most(o.rig)).toBe('leap');
    o.run(o.decor.at.x - 3, 0.6 + 0.9 + 1.2);
    expect(o.life.phase()).toBe('swim');
    expect(most(o.rig)).toBe('float');
    o.run(o.decor.at.x - 3, 3);
    o.run(o.decor.at.x - 10, 0.5);
    expect(o.life.phase()).toBe('climb');
    expect(most(o.rig)).toBe('climb');
    o.run(o.decor.at.x - 10, 0.8);
    expect(o.life.phase()).toBe('sit');
    expect(most(o.rig)).toBe('shake');
    o.run(o.decor.at.x - 10, 1.6);
    expect(most(o.rig)).toBe('sit');
    expect(o.group.position.x).toBeCloseTo(0, 3);
  });
});
