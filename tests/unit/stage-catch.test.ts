import { Matrix4, Quaternion, Vector3 } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { createStage } from '../../src/render/stage';
import { STANDING, type Pose } from '../../src/render/rig';
import { talk } from '../../src/render/talk';
import * as acting from '../../src/render/acting';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); talk.reset(); });

it('still blends a real sudden target change and preserves its unfinished catch through Pause', () => {
  let wanted = .2, shown = 0;
  const authored = acting.actPose;
  vi.spyOn(acting, 'actPose').mockImplementation((...args) => {
    const pose = authored(...args); pose.elbowR = wanted; return pose;
  });
  const stage = createStage({ ...prolog, furniture: [], scenes: [{ id: 'target', seconds: 5,
    stage: { actors: { pappa: [{ at: 0, x: 0, y: 0, z: 0, act: 'stand' }] } } }] }, () => 0);
  const rig = stage.actors.get('pappa')!.rig, original = rig.pose.bind(rig);
  vi.spyOn(rig, 'pose').mockImplementation(pose => { shown = pose.elbowR; original(pose); });
  let clock = 0;
  const frame = (dt = 1 / 60) => {
    clock += dt; stage.update({ id: 'target', seconds: clock }, new Set(), { x: 0, y: 0 }, clock, dt, false);
  };
  for (let i = 0; i < 30; i++) frame();
  expect(shown).toBeCloseTo(.2, 8);
  wanted = 1.8; frame();
  expect(shown).toBeGreaterThan(.2); expect(shown).toBeLessThan(.4);
  const held = shown;
  for (let i = 0; i < 30; i++) { frame(0); expect(shown).toBe(held); }
  frame(); expect(shown - held).toBeLessThan(.2);
  for (let i = 0; i < 120; i++) frame();
  expect(shown).toBeCloseTo(wanted, 4);
});

it.each([30, 60, 120])('settles Pappa’s real brush offer before releasing it after painting (%s Hz)', rate => {
  const stage = createStage(prolog, () => 0), rig = stage.actors.get('pappa')!.rig;
  const elof = prolog.spawn, flags = new Set<string>();
  const shown: Pose = { ...STANDING }, original = rig.pose.bind(rig);
  vi.spyOn(rig, 'pose').mockImplementation(pose => { Object.assign(shown, pose); original(pose); });
  let clock = 0;
  const frame = (id: string | null, seconds: number, dt = 1 / rate) => {
    clock += dt;
    stage.update(id ? { id, seconds } : null, flags, elof, clock, dt, false);
  };
  for (let i = 0; i <= 10.5 * rate; i++) {
    const t = i / rate; frame('morgon', t);
    if (t === 5.5 || t === 9) {
      for (let reading = 0; reading < rate; reading++) {
        talk.hear({ who: t === 9 ? 'pappa' : 'mamma', text: 'Måla ögonen, Elof.', seconds: reading / rate, reading: true }, 1 / rate);
        frame('morgon', t);
      }
      talk.hear(null, 1 / rate);
    }
  }
  flags.add('scene:morgon');
  for (let painting = 0; painting < 2 * rate; painting++) frame(null, 0);
  const restored = createStage(prolog, () => 0), expected: Pose = { ...STANDING };
  vi.spyOn(restored.actors.get('pappa')!.rig, 'pose').mockImplementation(pose => Object.assign(expected, pose));
  restored.update(null, flags, elof, clock, 1 / rate, false);
  // The settled pose must agree with the same authored offer on reload. A stale target velocity previously
  // injected a new offset on every held frame, keeping this elbow hyperextended by nearly one radian forever.
  expect(shown.elbowR).toBeGreaterThanOrEqual(0);
  expect(shown.elbowR).toBeCloseTo(expected.elbowR, 4);
  expect(shown.armR).toBeCloseTo(expected.armR, 4);
  const held = { ...shown };
  for (let paused = 0; paused < 20; paused++) frame(null, 0, 0);
  expect(shown).toEqual(held);

  flags.add('eye'); flags.add('paint');
  const mesh = rig.group.children[0] as import('three').InstancedMesh;
  const matrix = new Matrix4(), at = new Vector3(), scale = new Vector3(), rotation = new Quaternion();
  let previous: Quaternion | null = null;
  for (let i = 0; i <= .6 * rate; i++) {
    frame('vaknar', i / rate);
    mesh.getMatrixAt(9, matrix); matrix.decompose(at, rotation, scale);
    if (previous) expect(rotation.angleTo(previous)).toBeLessThan(18 / rate);
    previous = rotation.clone();
  }
});
