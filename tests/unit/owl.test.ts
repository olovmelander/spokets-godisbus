import { readFileSync } from 'node:fs';
import { AnimationClip, Bone, BoxGeometry, Group, InstancedMesh, MeshBasicMaterial, Object3D, Vector3, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { FACING_CAMERA, OWL_CLIPS, installOwls, owlBone, owlRigOf, rigOwl } from '../../src/render/owl';
import { AWAY, FREED, HOP, SETTLE, called, hollow, landing, ride, sit } from '../../src/content/aventyr2/owl-moments';
import type { Assets } from '../../src/render/assets';

/** The JSON of a GLB, as Blender wrote it (art/baked). */
function glb(path: string) {
  const buffer = readFileSync(path);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number; mesh?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[]; samplers: { input: number }[] }[];
    accessors: { max?: number[] }[];
  };
}

describe('the rigged owl from Blender (art/blender/owl.py, boot/owl.glb)', () => {
  const json = glb('art/baked/boot/owl.glb');

  it('is one skinned mesh, with its bones by their names', () => {
    expect(json.skins).toHaveLength(1);
    expect(json.nodes.filter((node) => node.skin !== undefined)).toHaveLength(1);
    const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
    for (const bone of ['body', 'plume', 'saddle', 'neck', 'head', 'lid.L', 'lid.R', 'tail', 'tailfan.L', 'tailfan.R', 'upperarm.L',
      'forearm.R', 'hand.L', 'prim1.L', 'prim6.R', 'sec1.L', 'sec3.R', 'tert.L', 'thigh.L', 'tarsus.R', 'foot.L', 'hind.R']) expect(joints).toContain(bone);
  });

  it('has every clip the game plays, each moving every bone, the loops a whole number of frames', () => {
    expect(json.animations?.map((a) => a.name).sort()).toEqual(OWL_CLIPS.map((clip) => `owl:${clip}`).sort());
    const joints = json.skins![0]!.joints;
    for (const animation of json.animations!) {
      const moved = new Set(animation.channels.map((channel) => channel.target.node));
      for (const joint of joints) expect(moved.has(joint), animation.name).toBe(true);
    }
    const seconds = (name: string) => json.accessors[json.animations!.find((a) => a.name === `owl:${name}`)!.samplers[0]!.input]!.max![0]!;
    // One wingbeat a clip, scrubbed by the game's own: fly and carry are a second each, as the kit builds them.
    expect(seconds('fly')).toBeCloseTo(1, 3);
    expect(seconds('carry')).toBeCloseTo(1, 3);
    expect(seconds('perch')).toBeCloseTo(12, 3);
    // The hop out of the hollow takes as long as its takeoff.
    expect(seconds('takeoff')).toBeCloseTo(HOP, 2);
  });
});

/** A stand-in for the rigged owl: bones by their names in three, and a clip for each of its clips that moves a bone. */
function testOwl(): Group {
  const model = new Group();
  const root = new Bone();
  root.name = 'root';
  model.add(root);
  const body = new Bone();
  body.name = 'body';
  body.position.set(0, 0.9, 0);
  root.add(body);
  for (const [name, at] of [['saddle', [-0.5, 0.1, 0]], ['plume', [0, 0, 0]], ['footL', [0.1, -0.85, 0.2]], ['footR', [0.1, -0.85, -0.2]],
    ['hindL', [0, -0.85, 0.2]], ['hindR', [0, -0.85, -0.2]]] as const) {
    const bone = new Bone();
    bone.name = name;
    bone.position.set(...at);
    body.add(bone);
  }
  // Each clip lifts the body to its own height, so that the test can tell which is shown.
  model.animations = OWL_CLIPS.map((clip, i) => new AnimationClip(`owl:${clip}`, clip === 'perch' ? 12 : 1,
    [new VectorKeyframeTrack('body.position', [0, 1], [0, 0.9 + i, 0, 0, 0.9 + i, 0])]));
  return model;
}

function heldOwl(): { holder: Group; rig: NonNullable<ReturnType<typeof rigOwl>> } {
  const holder = new Group();
  const rig = rigOwl(testOwl())!;
  holder.add(rig.turn);
  holder.userData.owlRig = rig;
  return { holder, rig };
}

const fakeAssets = (withOwl: boolean): Assets => ({
  model: async () => testOwl(),
  manifest: async () => ({ version: 1, packs: { boot: { bytes: 0, files: withOwl ? { 'owl.glb': 1 } : {} } } }),
  restoreTextures: async () => {},
  textureInfo: () => ({}) as ReturnType<Assets['textureInfo']>,
});

describe('the owl in the game (src/render/owl.ts)', () => {
  it('is rigged only from a model with all its clips', () => {
    expect(rigOwl(new Group())).toBeNull();
    const short = testOwl();
    short.animations = short.animations.slice(1);
    expect(rigOwl(short)).toBeNull();
    expect(rigOwl(testOwl())?.clips.names).toEqual([...OWL_CLIPS]);
  });

  it('takes the place of what was built in code, empties the spare shapes, and sits on the near forest\'s branches', async () => {
    const scene = new Group();
    const perched = new Group();
    perched.userData.owl = 'perched';
    perched.add(new Object3D());
    const spare = new Group();
    spare.userData.owl = 'spare';
    spare.add(new Object3D());
    const fauna = new Group();
    const owls = new InstancedMesh(new BoxGeometry(), new MeshBasicMaterial(), 2);
    owls.name = 'fauna-owls';
    fauna.add(owls);
    scene.add(perched, spare, fauna);
    expect(await installOwls(fakeAssets(true), scene)).toBe(true);
    const rig = owlRigOf(perched)!;
    expect(perched.children).toEqual([rig.turn]);
    expect(spare.children).toHaveLength(0);
    expect(owlRigOf(spare)).toBeUndefined();
    expect(owls.userData.owlRigs).toHaveLength(2);
    // Hidden until the forest's update shows one, and drawn in the warm-up all the same.
    for (const one of owls.userData.owlRigs) expect(one.turn.userData.idle).toBe(true);
    // Once is enough.
    expect(await installOwls(fakeAssets(true), scene)).toBe(false);
  });

  it('leaves the kit\'s older owl to come where its file is missing', async () => {
    const scene = new Group();
    const perched = new Group();
    perched.userData.owl = 'perched';
    perched.userData.owlStatic = 'uggla';
    const standIn = new Object3D();
    perched.add(standIn);
    scene.add(perched);
    await installOwls(fakeAssets(false), scene);
    expect(owlRigOf(perched)).toBeUndefined();
    expect(perched.userData.model).toBe('uggla');
    expect(perched.children).toContain(standIn);
  });
});

describe('the story\'s owl (src/content/aventyr2/owl-moments.ts)', () => {
  const shown = (rig: NonNullable<ReturnType<typeof rigOwl>>) => rig.clips.showing().sort((a, b) => b.weight - a.weight)[0]?.name;

  it('sits facing the camera, or mirrored and facing it still', () => {
    const { rig } = heldOwl();
    sit(rig, 3, 0.016, 0, false);
    expect(shown(rig)).toBe('perch');
    expect(rig.turn.rotation.y).toBeCloseTo(FACING_CAMERA);
    sit(rig, 3, 0.016, 0, false, true);
    expect(rig.turn.scale.x).toBe(-1);
    // Mirrored, its front (+x) turned by -FACING_CAMERA comes to +z all the same.
    const front = new Vector3(1, 0, 0).multiply(rig.turn.scale).applyEuler(rig.turn.rotation);
    expect(front.z).toBeCloseTo(1);
  });

  it('is trapped in its hollow until it is free, then shakes, hops out and flies off out of the picture', () => {
    const { holder, rig } = heldOwl();
    const from = new Vector3(72.6, 2.8, -0.1);
    expect(hollow(rig, holder, from, -1, 1, 0.016, false)).toBe(true);
    expect(shown(rig)).toBe('trapped');
    expect(holder.position.toArray()).toEqual(from.toArray());
    expect(hollow(rig, holder, from, FREED * 0.5, 1, 0.5, false)).toBe(true);
    expect(holder.position.toArray()).toEqual(from.toArray());
    hollow(rig, holder, from, FREED + HOP * 0.9, 1, 0.5, false);
    // Out of the hole, towards the camera.
    expect(holder.position.z).toBeGreaterThan(from.z + 0.9);
    expect(hollow(rig, holder, from, FREED + HOP + 1, 1, 0.5, false)).toBe(true);
    expect(shown(rig)).toBe('fly');
    expect(holder.position.x).toBeGreaterThan(from.x + 3);
    expect(holder.position.y).toBeGreaterThan(from.y + 1);
    expect(hollow(rig, holder, from, FREED + HOP + AWAY + 0.1, 1, 0.5, false)).toBe(false);
  });

  it('called, it takes off, glides and comes down facing the camera again', () => {
    const { rig } = heldOwl();
    called(rig, 0.1, 1.3, true, 1, 0.5, 0, false);
    expect(shown(rig)).toBe('takeoff');
    called(rig, 0.7, 1.3, true, 1, 0.5, 0, false);
    expect(rig.turn.rotation.y).toBeCloseTo(0);
    called(rig, 1.2, 1.3, true, 1, 0.5, 0, false);
    expect(shown(rig)).toBe('land');
    called(rig, 1.3 + SETTLE + 0.1, 1.3, true, 1, 0.5, 0, false);
    expect(shown(rig)).toBe('perch');
    expect(rig.turn.rotation.y).toBeCloseTo(FACING_CAMERA);
  });

  it('comes in leftwards, mirrored, gliding and then landing', () => {
    const { rig } = heldOwl();
    landing(rig, 0.2, -1, 0.3, 1, 0.5, 0, false);
    expect(rig.turn.scale.x).toBe(-1);
    expect(shown(rig)).toBe('glide');
    landing(rig, 0.9, -0.2, 0.3, 1, 0.5, 0, false);
    expect(shown(rig)).toBe('land');
    landing(rig, 1, SETTLE + 0.1, 0.3, 1, 0.5, 0, false);
    expect(shown(rig)).toBe('perch');
  });

  it('carries him with its back under his feet, and never goes under the ground', () => {
    const { holder, rig } = heldOwl();
    const prop = new Group();
    prop.add(holder);
    prop.position.set(115, 3, 0);
    ride(rig, prop, { since: 2, left: 0.5, clock: 4, dt: 0.5, still: false, waits: null, ground: 0 });
    expect(shown(rig)).toBe('carry');
    const seat = owlBone(rig, 'saddle', new Vector3());
    expect(seat.x).toBeCloseTo(0);
    expect(seat.y).toBeCloseTo(0.05);
    expect(prop.position.y).toBe(3);
    // Where he comes down to the ground, it stays over it, and goes back behind him.
    prop.position.set(122.9, 0, 0);
    ride(rig, prop, { since: 3, left: 0.01, clock: 5, dt: 0.5, still: false, waits: null, ground: 0 });
    expect(shown(rig)).toBe('land');
    prop.updateMatrixWorld(true);
    const foot = rig.clips.bone('footL')!.getWorldPosition(new Vector3());
    expect(foot.y).toBeGreaterThanOrEqual(-1e-6);
    expect(prop.position.z).toBeLessThan(0);
  });

  it('rises from where it stood as he climbs on', () => {
    const { holder, rig } = heldOwl();
    const prop = new Group();
    prop.add(holder);
    prop.position.set(110, 1, 0);
    const waits = new Vector3(110.3, 0, -0.6);
    ride(rig, prop, { since: 0, left: 1, clock: 1, dt: 0, still: false, waits, ground: 0 });
    // Its feet (the rig's origin) where it stood.
    prop.updateMatrixWorld(true);
    const feet = rig.turn.getWorldPosition(new Vector3());
    expect(feet.distanceTo(waits)).toBeLessThan(1e-6);
  });
});
