import { readFileSync } from 'node:fs';
import { Group, type Object3D, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { AMBIENT, HEDGEHOG_STRIDE, HOP_DISTANCE, HOP_FRAMES, HOP_LAND, HOP_LIFT, hopProgress, rigAmbient, stepAmbient, type AmbientRig } from '../../src/render/ambient-animals';
import { OUTDOOR_MODELS } from '../../src/render/outdoor-models';

/** The JSON of a GLB, as Blender wrote it (art/baked). */
function glb(path: string) {
  const buffer = readFileSync(path);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number; mesh?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[] }[];
  };
}

/** The model as the game's asset loader gives it: the scene, with the file's clips on it. */
async function model(file: string): Promise<Object3D> {
  const bytes = Uint8Array.from(readFileSync(`art/baked/aventyr2/${file}.glb`));
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer, '');
  gltf.scene.animations = gltf.animations;
  return gltf.scene;
}

const ANIMALS = [
  { file: 'ankor', creature: 'anka', meshes: ['and', 'and-hona'], clips: ['paddle', 'dabble', 'preen', 'look', 'quack', 'flap'],
    bones: ['root', 'body', 'tail', 'neck1', 'neck2', 'head', 'jaw', 'wing.L', 'hand.R', 'shin.L', 'foot.R'] },
  { file: 'groda', creature: 'groda', meshes: ['groda-kropp'], clips: ['sit', 'hop', 'croak', 'catch'],
    bones: ['body', 'hips', 'head', 'jaw', 'throat', 'tongue', 'eye.L', 'eye.R', 'arm.L', 'hand.R', 'thigh.L', 'shin.R', 'foot.L', 'toes.R'] },
  { file: 'igelkott', creature: 'igelkott', meshes: ['igelkott-kropp'], clips: ['walk', 'sniff', 'curl', 'uncurl'],
    bones: ['body', 'chest', 'front', 'hips', 'rump', 'head', 'snout', 'arm.L', 'paw.R', 'leg.L', 'foot.R'] },
  { file: 'snigel', creature: 'snigel', meshes: ['snigel-kropp'], clips: ['crawl', 'look', 'hide'],
    bones: ['foot1', 'tail', 'neck', 'head', 'stalk.L', 'stalk.R', 'feeler.L', 'shell'] },
];

describe('the small animals from Blender (art/blender/ambient-animals.py)', () => {
  for (const { file, creature, meshes, clips, bones } of ANIMALS) {
    it(`${creature}: one skin, its meshes, its bones by their names, and every clip moving every bone`, () => {
      const json = glb(`art/baked/aventyr2/${file}.glb`);
      expect(json.skins).toHaveLength(1);
      expect(json.nodes.filter((node) => node.skin !== undefined).map((node) => node.name).sort()).toEqual([...meshes].sort());
      const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
      for (const bone of bones) expect(joints).toContain(bone);
      expect(joints.some((name) => name?.includes('_ik'))).toBe(false);
      expect(json.animations?.map((a) => a.name).sort()).toEqual(clips.map((clip) => `${creature}:${clip}`).sort());
      for (const animation of json.animations!) {
        const moved = new Set(animation.channels.map((channel) => channel.target.node));
        for (const joint of json.skins![0]!.joints) expect(moved.has(joint)).toBe(true);
      }
    });
  }

  it('the game counts the hedgehog\'s strides and the frog\'s hop as the kit builds them', () => {
    const kit = readFileSync('art/blender/ambient-animals.py', 'utf8');
    expect(kit).toContain(`WALK_STRIDE = ${HEDGEHOG_STRIDE}`);
    expect(kit).toContain(`HOP_FRAMES = ${HOP_FRAMES}`);
    expect(kit).toContain(`HOP_LIFT = ${HOP_LIFT}`);
    expect(kit).toContain(`HOP_LAND = ${HOP_LAND}`);
    expect(kit).toContain(`HOP_DISTANCE = ${HOP_DISTANCE}`);
    // Carried forward only between lift-off and landing.
    expect(hopProgress(HOP_LIFT / HOP_FRAMES - 0.01)).toBe(0);
    expect(hopProgress(HOP_LAND / HOP_FRAMES)).toBe(1);
    expect(hopProgress(1)).toBe(1);
  });

  it('they are no longer in creatures.glb, and the owl, otter and beaver still are', () => {
    const names = glb('art/baked/aventyr2/creatures.glb').nodes.map((node) => node.name);
    for (const gone of ['and', 'and-hona', 'groda', 'igelkott', 'snigel']) expect(names).not.toContain(gone);
    for (const kept of ['uggla', 'uggla-flyger', 'utter', 'baver']) expect(names).toContain(kept);
  });

  it('their places are where they were', () => {
    const find = (chapter: string, name: string) => OUTDOOR_MODELS[chapter]!.filter((item) => item.model === name).map(({ x, z, size, turn, y }) => [x, z, size, turn, y]);
    expect(find('garden', 'snigel')).toEqual([[70, -2.8, 0.65, -0.2, undefined]]);
    expect(find('garden', 'igelkott')).toEqual([[159, -3.5, 0.65, -0.2, undefined]]);
    expect(find('myren', 'groda')).toEqual([[137, -3.3, 0.75, -0.3, undefined]]);
    expect(find('myren', 'and')).toEqual([[45, -5.1, 0.8, 0.3, -0.6]]);
    expect(find('myren', 'and-hona')).toEqual([[47.3, -6, 0.8, -0.1, -0.6]]);
  });
});

/** A rig in a place of its own, as the installer puts it: at x, turned and sized as the chapter says. */
function placed(rig: AmbientRig, x: number, turn = 0, size = 1): Group {
  const place = new Group();
  place.position.set(x, 0, -3);
  place.rotation.y = turn;
  place.scale.setScalar(size);
  place.add(rig.level);
  place.userData.ambient = rig;
  place.updateMatrixWorld(true);
  return place;
}

/** Runs its life for `seconds` with Elof at `elof` (null: nowhere), and gives what it did on the way. */
function live(place: Group, from: number, seconds: number, elof: { x: number; y: number } | null, still = false) {
  const rig = place.userData.ambient as AmbientRig;
  const modes = new Set<string>();
  let farthest = 0;
  for (let t = from; t < from + seconds; t += 1 / 30) {
    stepAmbient(place, { clock: t, still, elof });
    place.updateMatrixWorld(true);
    modes.add(rig.mode);
    farthest = Math.max(farthest, Math.hypot(rig.x, rig.z));
  }
  return { modes, farthest, end: from + seconds };
}

describe('their lives in the game (src/render/ambient-animals.ts)', () => {
  it('a copy of its own with bones and clips; the two mallards share a rig and each shows its own mesh', async () => {
    const ducks = await model('ankor');
    for (const [kind, shown] of [['and', 'and'], ['and-hona', 'and-hona']] as const) {
      const rig = rigAmbient(ducks, kind)!;
      expect(rig).not.toBeNull();
      expect([...rig.clips.names].sort()).toEqual(['dabble', 'flap', 'look', 'paddle', 'preen', 'quack']);
      const visible: string[] = [];
      rig.level.traverse((node) => {
        const mesh = node as SkinnedMesh;
        if (!mesh.isSkinnedMesh) return;
        if (mesh.visible) visible.push(mesh.name);
        // Culled when out of view, by a sphere wide enough for its clips.
        expect(mesh.frustumCulled).toBe(true);
        expect(mesh.boundingSphere!.radius).toBeGreaterThan(0.5);
      });
      expect(visible).toEqual([shown]);
    }
    // Nothing for what is not one of them, or a model without its clips.
    expect(rigAmbient(ducks, 'uggla')).toBeNull();
    expect(rigAmbient(new Group(), 'groda')).toBeNull();
    expect(Object.keys(AMBIENT).sort()).toEqual(['and', 'and-hona', 'groda', 'igelkott', 'snigel']);
  });

  it('the hedgehog rolls into a ball when Elof comes near, and unrolls once he has gone', async () => {
    const place = placed(rigAmbient(await model('igelkott'), 'igelkott')!, 100, -0.2, 0.65);
    const rig = place.userData.ambient as AmbientRig;
    let run = live(place, 0, 20, { x: 80, y: 0 });
    expect(run.modes.has('curl')).toBe(false);
    expect(run.farthest).toBeLessThan(1.6);
    run = live(place, run.end, 2, { x: 100 + rig.x + 1, y: 0 });
    expect(rig.mode).toBe('curled');
    run = live(place, run.end, 6, { x: 80, y: 0 });
    expect(run.modes.has('uncurl')).toBe(true);
    expect(rig.mode).not.toBe('curled');
  });

  it('the snail draws into its shell when he comes, and out again after he has gone', async () => {
    const place = placed(rigAmbient(await model('snigel'), 'snigel')!, 50, 0.4, 0.8);
    const rig = place.userData.ambient as AmbientRig;
    let run = live(place, 0, 40, null);
    expect(rig.hidden).toBe(0);
    expect(run.farthest).toBeLessThan(0.9);
    run = live(place, run.end, 2, { x: 50, y: 0 });
    expect(rig.hidden).toBe(1);
    expect(rig.clips.showing().map((clip) => clip.name)).toContain('hide');
    run = live(place, run.end, 8, { x: 30, y: 0 });
    expect(rig.hidden).toBe(0);
  });

  it('the frog sits, croaks and catches flies, and hops away from him, never far from its place', async () => {
    const place = placed(rigAmbient(await model('groda'), 'groda')!, 137, -0.3, 0.75);
    const rig = place.userData.ambient as AmbientRig;
    let run = live(place, 0, 90, null);
    expect(run.modes.has('hop')).toBe(true);
    expect(run.modes.has('croak') || run.modes.has('catch')).toBe(true);
    expect(run.farthest).toBeLessThanOrEqual(1.8 + 0.4);
    // He comes up close on its left: it hops off to the right, if it has room.
    const before = rig.x;
    run = live(place, run.end, 4, { x: 137 + rig.x - 0.8, y: 0 });
    if (before + HOP_DISTANCE * 0.75 <= 1.8) expect(rig.x).toBeGreaterThan(before + 0.5);
  });

  it('the mallards swim about by their place, and do their doings', async () => {
    const place = placed(rigAmbient(await model('ankor'), 'and')!, 45, 0.3, 0.8);
    const run = live(place, 0, 120, null);
    expect(run.modes.has('swim')).toBe(true);
    expect([...run.modes].some((mode) => ['dabble', 'preen', 'look', 'quack', 'flap'].includes(mode))).toBe(true);
    expect(run.farthest).toBeLessThan(1.1);
  });

  it('in calm motion each rests at its place, as it was put, in its first pose', async () => {
    const place = placed(rigAmbient(await model('igelkott'), 'igelkott')!, 20, 0.5, 0.65);
    const rig = place.userData.ambient as AmbientRig;
    live(place, 0, 30, null);
    live(place, 30, 1, { x: 20, y: 0 }, true);
    expect(rig.x).toBe(0);
    expect(rig.z).toBe(0);
    expect(rig.mode).toBe('idle');
    expect(rig.heading).toBeCloseTo(0.5 - Math.PI / 2, 5);
    expect(rig.clips.showing()).toEqual([{ name: 'sniff', weight: 1, phase: 0 }]);
  });
});
