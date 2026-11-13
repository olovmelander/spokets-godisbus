import { readFileSync } from 'node:fs';
import { AnimationClip, Bone, Group, NumberKeyframeTrack, Object3D, VectorKeyframeTrack } from 'three';
import { describe, expect, it } from 'vitest';
import { creatureClips, creatureClipsOf } from '../../src/render/creature-clips';
import { risePhase } from '../../src/render/crane-ride';
import { RUN_STRIDE, WALK_STRIDE } from '../../src/render/crane-chick';

/** The JSON of a GLB, as Blender wrote it (art/baked). */
function glb(path: string) {
  const buffer = readFileSync(path);
  return JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)).toString('utf8')) as {
    nodes: { name?: string; skin?: number; mesh?: number }[];
    skins?: { joints: number[] }[];
    animations?: { name: string; channels: { target: { node: number } }[] }[];
  };
}

describe('the rigged creatures from Blender', () => {
  const creatures = [
    { file: 'art/baked/boot/crane.glb', creature: 'crane', clips: ['kneel', 'rise', 'stand', 'takeoff', 'fly', 'fly-free', 'glide', 'land'],
      bones: ['body', 'saddle', 'belly', 'neck1', 'head', 'upperarm.L', 'hand.R', 'prim6.L', 'thigh.L', 'tarsus.R', 'toes.L', 'tail', 'bustle2'] },
    { file: 'art/baked/boot/crane-chick.glb', creature: 'crane-chick', clips: ['idle', 'walk', 'run'],
      bones: ['body', 'neck1', 'head', 'jaw', 'wing.L', 'wing.R', 'thigh.L', 'toes.R'] },
    { file: 'art/baked/boot/jay.glb', creature: 'jay', clips: ['idle', 'look', 'hop', 'peck', 'eat', 'call', 'takeoff', 'fly', 'glide', 'land', 'perch'],
      bones: ['body', 'puff', 'neck2', 'head', 'jaw', 'bill', 'crest', 'tail', 'fan1.L', 'fan2.R', 'upperarm.L', 'hand.R', 'prim5.L', 'sec2.R',
        'tert.L', 'thigh.L', 'tarsus.R', 'toes.L', 'claws.R', 'hallux.L'] },
  ];
  for (const { file, creature, clips, bones } of creatures) {
    it(`${creature}: one skinned mesh, its bones by their names, and every clip`, () => {
      const json = glb(file);
      expect(json.skins).toHaveLength(1);
      const skinned = json.nodes.filter((node) => node.skin !== undefined);
      expect(skinned).toHaveLength(1);
      const joints = json.skins![0]!.joints.map((i) => json.nodes[i]!.name);
      for (const bone of bones) expect(joints).toContain(bone);
      // No control used while posing (an IK target) is left in it.
      expect(joints.some((name) => name?.endsWith('_ik.L') || name?.endsWith('_ik.R'))).toBe(false);
      expect(json.animations?.map((a) => a.name).sort()).toEqual(clips.map((clip) => `${creature}:${clip}`).sort());
      // Every clip moves every bone, so that no clip leaves a bone where another put it.
      for (const animation of json.animations!) {
        const moved = new Set(animation.channels.map((channel) => channel.target.node));
        for (const joint of json.skins![0]!.joints) expect(moved.has(joint)).toBe(true);
      }
    });
  }

  it('the chick walks and runs strides as long as its kit builds them', () => {
    const kit = readFileSync('art/blender/crane-chick.py', 'utf8');
    expect(kit).toContain(`WALK_STRIDE = ${WALK_STRIDE}`);
    expect(kit).toContain(`RUN_STRIDE = ${RUN_STRIDE}`);
  });
});

/** A creature of one bone that `a` moves from x 0 to x 1 in a second and `b` holds at y 5. */
function testModel(): Object3D {
  const model = new Group();
  const body = new Bone();
  body.name = 'body';
  const wing = new Bone();
  wing.name = 'wingL';
  body.add(wing);
  model.add(body);
  model.animations = [
    new AnimationClip('test:a', 1, [new VectorKeyframeTrack('body.position', [0, 1], [0, 0, 0, 1, 0, 0])]),
    new AnimationClip('test:b', 2, [new VectorKeyframeTrack('body.position', [0, 2], [0, 5, 0, 0, 5, 0])]),
    new AnimationClip('other:c', 1, [new NumberKeyframeTrack('body.visible', [0], [1])]),
  ];
  return model;
}

describe('the clip player (src/render/creature-clips.ts)', () => {
  it('finds the creature\'s own clips, by their own names, and nothing for a model without', () => {
    expect(creatureClipsOf(testModel(), 'test').map((clip) => clip.name)).toEqual(['test:a', 'test:b']);
    expect(creatureClips(new Group(), 'test')).toBeNull();
    const creature = creatureClips(testModel(), 'test')!;
    expect(creature.names).toEqual(['a', 'b']);
    expect(creature.has('a')).toBe(true);
    expect(creature.has('c')).toBe(false);
    expect(creature.duration('b')).toBe(2);
  });

  it('is a copy of its own: posing it leaves the model and other copies as they were', () => {
    const model = testModel();
    const one = creatureClips(model, 'test')!;
    const two = creatureClips(model, 'test')!;
    one.scrub('a', 0.5);
    one.update(0);
    expect(one.bone('body')!.position.x).toBeCloseTo(0.5);
    expect(two.bone('body')!.position.x).toBe(0);
    expect(model.getObjectByName('body')!.position.x).toBe(0);
  });

  it('scrubs a clip to a phase, wrapping outside 0 to 1, and finds a bone by its Blender name', () => {
    const creature = creatureClips(testModel(), 'test')!;
    creature.scrub('a', 0.25);
    creature.update(0.016);
    expect(creature.bone('body')!.position.x).toBeCloseTo(0.25);
    creature.scrub('a', 1.75);
    creature.update(0.016);
    expect(creature.bone('body')!.position.x).toBeCloseTo(0.75);
    creature.scrub('a', 1);
    creature.update(0.016);
    expect(creature.bone('body')!.position.x).toBeCloseTo(1);
    expect(creature.bone('wing.L')?.name).toBe('wingL');
  });

  it('plays a clip on its own clock, looping or held at its end', () => {
    const creature = creatureClips(testModel(), 'test')!;
    creature.play('a');
    creature.update(0.3);
    expect(creature.bone('body')!.position.x).toBeCloseTo(0.3);
    creature.update(0.9);
    expect(creature.bone('body')!.position.x).toBeCloseTo(0.2);
    creature.play('a', { once: true, restart: true });
    creature.update(0.6);
    creature.update(0.6);
    expect(creature.bone('body')!.position.x).toBeCloseTo(1);
  });

  it('fades from one clip to the next, its weights always adding up to one', () => {
    const creature = creatureClips(testModel(), 'test', { fade: 0.4 })!;
    creature.scrub('a', 0);
    creature.update(0.1);
    expect(creature.showing()).toEqual([{ name: 'a', weight: 1, phase: 0 }]);
    creature.scrub('b', 0);
    creature.update(0.1);
    const mid = creature.showing();
    expect(mid.map((s) => s.name)).toEqual(['a', 'b']);
    expect(mid[1]!.weight).toBeCloseTo(0.25 / 1.0, 1);
    expect(mid.reduce((sum, s) => sum + s.weight, 0)).toBeCloseTo(1);
    expect(creature.bone('body')!.position.y).toBeGreaterThan(0.5);
    expect(creature.bone('body')!.position.y).toBeLessThan(5);
    for (let i = 0; i < 6; i++) { creature.scrub('b', 0); creature.update(0.1); }
    expect(creature.showing()).toEqual([{ name: 'b', weight: 1, phase: 0 }]);
    expect(creature.bone('body')!.position.y).toBeCloseTo(5);
  });

  it('shares the pose between clips scrubbed in the same frame, by their weights', () => {
    const creature = creatureClips(testModel(), 'test')!;
    creature.scrub('a', 1, 0.75);
    creature.scrub('b', 0, 0.25);
    creature.update(0.016);
    const body = creature.bone('body')!;
    expect(body.position.x).toBeCloseTo(0.75);
    expect(body.position.y).toBeCloseTo(1.25);
    creature.dispose();
    expect(creature.root.parent).toBeNull();
  });
});

describe('the crane rising under him (src/render/crane-ride.ts)', () => {
  it('finds the phase of its rise at which its back is as high as his feet', () => {
    const seats = [0.9, 0.95, 1.2, 1.6, 2.0, 2.23];
    expect(risePhase(seats, 0.5)).toBe(0);
    expect(risePhase(seats, 0.9)).toBe(0);
    expect(risePhase(seats, 1.6)).toBeCloseTo(3 / 5);
    expect(risePhase(seats, 1.8)).toBeCloseTo(3.5 / 5);
    expect(risePhase(seats, 3)).toBe(1);
  });
});
