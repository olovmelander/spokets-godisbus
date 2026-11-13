import { readFileSync } from 'node:fs';
import { Box3, Group, Mesh, Vector3, type Object3D, type SkinnedMesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { EAT, facing, hasJayClips, jayRigOf, jayStandIn, poseWindowJay, rigJay, sitting, stepFlyingJay, stepGroundJay, WINDOW, windowPose } from '../../src/render/jay';
import { stubCanvas } from './canvas-stub';

/** The rigged jay as Blender wrote it (art/baked/boot/jay.glb), with its clips on it as the game's loader keeps them. */
let model: Object3D;
beforeAll(async () => {
  stubCanvas();
  const bytes = readFileSync('art/baked/boot/jay.glb');
  const gltf = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  model = gltf.scene;
  model.animations = gltf.animations;
});
afterAll(() => vi.unstubAllGlobals());

/** Its box as it is posed now, from its skinned mesh's posed points. */
function posedBox(root: Object3D): Box3 {
  root.updateMatrixWorld(true);
  const box = new Box3();
  const point = new Vector3();
  root.traverse((node) => {
    const mesh = node as SkinnedMesh;
    if (!mesh.isSkinnedMesh) return;
    const position = mesh.geometry.getAttribute('position');
    for (let i = 0; i < position.count; i += 7) box.expandByPoint(mesh.getVertexPosition(i, point).applyMatrix4(mesh.matrixWorld));
  });
  return box;
}

describe('the rigged jay (art/blender/jay.py) keeps the place of the one before it', () => {
  it('stands with its feet at the origin, facing +x, as tall and long as the stand-in', () => {
    expect(hasJayClips(model)).toBe(true);
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    rig.clips.scrub('idle', 0);
    rig.clips.update(0);
    const box = posedBox(bird);
    // Feet on the ground, the crown about 0.7 EL up; the beak in front (+x), the tail behind.
    expect(box.min.y).toBeGreaterThan(-0.03);
    expect(box.min.y).toBeLessThan(0.03);
    expect(box.max.y).toBeGreaterThan(0.62);
    expect(box.max.y).toBeLessThan(0.82);
    expect(box.max.x).toBeGreaterThan(0.4);
    expect(box.max.x).toBeLessThan(0.52);
    expect(box.min.x).toBeLessThan(-0.5);
    expect(box.min.x).toBeGreaterThan(-0.75);
    // Folded, its wings lie on its sides: no wider than its body and fluff.
    expect(box.max.z - box.min.z).toBeLessThan(0.62);
  });

  it('opens its wings to fly, and draws its feet up', () => {
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    rig.clips.scrub('fly', 7 / 24);
    rig.clips.update(0);
    const spread = posedBox(bird);
    expect(spread.max.z - spread.min.z).toBeGreaterThan(1.1);
    expect(spread.min.y).toBeGreaterThan(0.1);
  });

  it('puts the berry it takes at the tip of its beak, and the stand-in goes', () => {
    const bird = jayStandIn();
    expect(bird.getObjectByName('wingNear')).toBeDefined();
    const rig = rigJay(bird, model)!;
    expect(jayRigOf(bird)).toBe(rig);
    expect(bird.getObjectByName('wingNear')).toBeUndefined();
    expect(rig.berry.parent?.name).toBe('bill');
    expect(rig.berry.visible).toBe(false);
  });

  it('is not rigged from a model without its clips', () => {
    const bird = jayStandIn();
    expect(rigJay(bird, new Group())).toBeNull();
    expect(bird.getObjectByName('wingNear')).toBeDefined();
  });
});

describe('the jay on the ground (src/render/jay.ts)', () => {
  const frame = (bird: Object3D, used: boolean, elofX: number, seconds: number, calm = false, from = 0) => {
    const rig = jayRigOf(bird)!;
    for (let t = from; t < seconds - 1e-9; t += 1 / 60) stepGroundJay(bird, rig, { used, clock: t, dt: 1 / 60, x: 37, elof: { x: elofX, y: 0 }, calm });
    return rig;
  };

  it('faces him three-quarters on, mirrored when he is to its left, turning in a hop through facing the lens', () => {
    expect(facing(1)).toEqual({ yaw: -0.55, mirror: 1 });
    expect(facing(-1)).toEqual({ yaw: 0.55, mirror: -1 });
    expect(facing(0).yaw).toBeCloseTo(-Math.PI / 2);
    expect(facing(-0.001).yaw).toBeCloseTo(Math.PI / 2, 2);
    const bird = new Group();
    rigJay(bird, model);
    const rig = frame(bird, false, 40, 0.5);
    expect(rig.heading).toBe(1);
    expect(bird.scale.x).toBe(1);
    // He comes past it to its left: it hops round.
    frame(bird, false, 35, 0.75, false, 0.5);
    expect(rig.playing).toBe('hop');
    expect(Math.abs(rig.heading)).toBeLessThan(1);
    frame(bird, false, 35, 1.75, false, 0.75);
    expect(rig.heading).toBe(-1);
    expect(bird.scale.x).toBe(-1);
    // Near him it cocks its head at him; away from him it looks about.
    expect(rig.playing).toBe('look');
    frame(bird, false, 25, 2.5, false, 1.75);
    expect(['idle', 'peck']).toContain(rig.playing);
  });

  it('takes his berry, holds it in its beak, swallows it and hops for joy', () => {
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    frame(bird, false, 36, 1);
    frame(bird, true, 36, 0.1);
    expect(rig.playing).toBe('eat');
    expect(rig.berry.visible).toBe(false);
    frame(bird, true, 36, 0.5, false, 0.1);
    expect(rig.berry.visible).toBe(true);
    frame(bird, true, 36, EAT.swallowed + 0.1, false, 0.5);
    expect(rig.berry.visible).toBe(false);
    frame(bird, true, 36, EAT.seconds + 0.3, false, EAT.swallowed + 0.1);
    expect(rig.playing).toBe('hop');
    frame(bird, true, 36, EAT.seconds + 2.5, false, EAT.seconds + 0.3);
    expect(rig.playing).toBe('look');
  });

  it('given its berry before it came (a game taken up again), it does not eat it again', () => {
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    frame(bird, true, 38, 0.2);
    expect(rig.playing).toBe('look');
    expect(rig.berry.visible).toBe(false);
  });

  it('with less motion it turns to him at once, holds still and shows no berry', () => {
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    frame(bird, true, 35, 0.6, true);
    expect(rig.heading).toBe(-1);
    expect(rig.turn).toBeNull();
    expect(rig.berry.visible).toBe(false);
    expect(rig.clips.showing().map((clip) => [clip.name, clip.phase])).toEqual([['look', 0]]);
  });
});

describe('the jay as the helper', () => {
  it('beats its wings by the game\'s rhythm, glides between, turns to him, and holds its wings out when still', () => {
    const bird = new Group();
    const rig = rigJay(bird, model)!;
    stepFlyingJay(bird, rig, 0.1, 1 / 60, false, -2);
    expect(rig.clips.showing().map((clip) => clip.name)).toContain('fly');
    for (let i = 0; i < 120; i++) stepFlyingJay(bird, rig, 0.1 + i / 60, 1 / 60, false, -2);
    expect(rig.heading).toBeLessThan(-0.95);
    for (let i = 0; i < 60; i++) stepFlyingJay(bird, rig, 5, 1 / 60, true, 3);
    expect(rig.heading).toBe(1);
    expect(rig.clips.showing().map((clip) => [clip.name, clip.phase])).toEqual([['glide', 0]]);
  });
});

describe('the jay at the window', () => {
  it('flies in, is on the sill from 1.6 s, calls with the scene\'s sound, and flies away at the end', () => {
    const scene = 27.7;
    expect(windowPose(0.7, scene, false).offset.length()).toBeGreaterThan(1);
    expect(windowPose(0.7, scene, false).flying).toBe(true);
    expect(windowPose(0.7, scene, false).clips.map((clip) => clip.name)).toContain('fly');
    expect(windowPose(1.4, scene, false).clips.map((clip) => clip.name)).toContain('land');
    expect(windowPose(WINDOW.landed, scene, false).offset.length()).toBeCloseTo(0);
    expect(windowPose(1.75, scene, false).call).toBeGreaterThan(0.5);
    expect(windowPose(3, scene, false).call).toBe(0);
    expect(windowPose(3, scene, false).settled).toBe(1);
    expect(windowPose(3, scene, false).flying).toBe(false);
    expect(windowPose(scene - 0.5, scene, false).offset.y).toBeGreaterThan(1);
    expect(windowPose(scene - 0.5, scene, false).flying).toBe(true);
    // With less motion it is simply there, sitting.
    const calm = windowPose(0.7, scene, true);
    expect(calm.offset.length()).toBe(0);
    expect(calm.settled).toBe(1);
  });

  it('sits on its own clock between, looking at the family now and then, its clips always adding up', () => {
    for (let t = 0; t < 20; t += 0.1) {
      const clips = sitting(t);
      expect(clips.reduce((sum, clip) => sum + clip.weight, 0)).toBeCloseTo(1);
    }
    expect(sitting(2).map((clip) => clip.name)).toEqual(['perch']);
    expect(sitting(8).find((clip) => clip.name === 'look')?.weight).toBe(1);
  });

  it('poses the same from the same second of the scene, and only its sitting goes on through a held line', () => {
    const make = () => {
      const jay = new Group();
      const bird = new Group();
      bird.name = 'bird';
      jay.add(bird);
      rigJay(bird, model, 0);
      return jay;
    };
    const at = { x: 11.2, y: 3.55, z: -8.6 };
    const one = make(), two = make();
    poseWindowJay(one, at, 1.3, 27.7, false, 1 / 60);
    poseWindowJay(two, at, 1.3, 27.7, false, 0);
    const bone = (jay: Object3D) => jay.getObjectByName('head')!.quaternion.toArray();
    expect(one.position.toArray()).toEqual(two.position.toArray());
    expect(bone(one)).toEqual(bone(two));
    // Sitting, a held line (dt, no new seconds) moves it on; a pause (dt 0) does not.
    poseWindowJay(one, at, 5, 27.7, false, 0);
    const held = bone(one);
    poseWindowJay(one, at, 5, 27.7, false, 0);
    expect(bone(one)).toEqual(held);
    for (let i = 0; i < 30; i++) poseWindowJay(one, at, 5, 27.7, false, 1 / 30);
    expect(bone(one)).not.toEqual(held);
    expect(one.position.toArray()).toEqual([at.x, at.y, at.z]);
  });
});

describe('one jay built in code', () => {
  it('is the only stand-in: the window, the help points and the helper all use it', () => {
    const sources = ['src/render/props.ts', 'src/render/stage.ts'].map((file) => readFileSync(file, 'utf8'));
    for (const source of sources) expect(source).toContain('jayStandIn()');
    expect(sources.join('\n')).not.toMatch(/name\s*=\s*side > 0 \? 'wingNear'/);
    const bird = jayStandIn();
    expect(bird.name).toBe('bird');
    expect(new Box3().setFromObject(bird).min.y).toBeCloseTo(0, 1);
    expect(bird.children.filter((child) => child instanceof Mesh).length).toBeGreaterThan(5);
  });
});
