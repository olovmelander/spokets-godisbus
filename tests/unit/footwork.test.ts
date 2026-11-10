import { Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { createFootwork } from '../../src/render/footwork';
import * as footwork from '../../src/render/footwork';
import { REHEARSAL_LEGS, STANDING, type Pose } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';
import { talk } from '../../src/render/talk';
import { stubCanvas } from './canvas-stub';

beforeEach(() => { stubCanvas(); talk.reset(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); talk.reset(); });

it('returns a lifted standing foot to a walking stride continuously across a half-turn', () => {
  const feet = createFootwork();
  const at = { x: 0, z: 0, yaw: 0, target: 0, rate: Math.PI, height: 5.2, width: REHEARSAL_LEGS.width, dt: 1 / 60 };
  feet.stand({ ...STANDING }, REHEARSAL_LEGS, at);
  let previous: number | null = null;
  for (let frame = 0; frame < 20; frame++) {
    const pose = { ...STANDING };
    feet.carry(pose, REHEARSAL_LEGS, { ...at, yaw: 2.9 + frame * .03 }, [false, true]);
    const yaw = pose.yawL ?? 0;
    if (previous !== null) expect(Math.abs(yaw - previous), `frame ${frame}`).toBeLessThan(.4);
    previous = yaw;
  }
  expect(previous).toBe(0);
});

it('keeps an unfinished carried foot when a short walk stops, but forgets it on an explicit cut', () => {
  const feet = createFootwork();
  const at = { x: 0, z: 0, yaw: 0, target: 0, rate: Math.PI, height: 5.2, width: REHEARSAL_LEGS.width, dt: 1 / 60 };
  feet.stand({ ...STANDING }, REHEARSAL_LEGS, at);
  const carried = { ...STANDING };
  const turned = { ...at, yaw: .6, target: .6 };
  feet.carry(carried, REHEARSAL_LEGS, turned, [true, true]);
  const stopped = { ...STANDING };
  feet.stand(stopped, REHEARSAL_LEGS, turned);
  expect(stopped.yawL).toBeCloseTo(carried.yawL!, 8);
  expect(stopped.yawR).toBeCloseTo(carried.yawR!, 8);
  feet.reset();
  const cut = { ...STANDING };
  feet.stand(cut, REHEARSAL_LEGS, turned);
  expect(cut.yawL).toBe(0); expect(cut.yawR).toBe(0);
});

it.each([false, true])('keeps the same physical leg direction when a carried half-turn returns to standing (lifted=%s)', lifted => {
  const feet = createFootwork();
  const at = { x: 0, z: 0, yaw: 0, target: 0, rate: Math.PI, height: 5.2, width: REHEARSAL_LEGS.width, dt: 1 / 60 };
  feet.stand({ ...STANDING }, REHEARSAL_LEGS, at);
  let carried = { ...STANDING }, yaw = 0;
  for (let frame = 0; frame < 10; frame++) {
    yaw = 2.9 + frame * .04; carried = { ...STANDING };
    feet.carry(carried, REHEARSAL_LEGS, { ...at, yaw, target: yaw }, [!lifted, true]);
  }
  const stopped = { ...STANDING };
  feet.stand(stopped, REHEARSAL_LEGS, { ...at, yaw, target: yaw });
  expect(Math.cos(stopped.yawL!)).toBeCloseTo(Math.cos(carried.yawL!), 8);
  expect(Math.sin(stopped.yawL!)).toBeCloseTo(Math.sin(carried.yawL!), 8);

  // The standing foot may express that same direction on the opposite side of ±π. Feeding the two
  // real footwork outputs through the stage must not manufacture a nearly complete turn between them.
  let wanted = carried.yawL!;
  const make = footwork.createFootwork;
  vi.spyOn(footwork, 'createFootwork').mockImplementation(() => {
    const made = make(), stand = made.stand.bind(made);
    made.stand = (pose, legs, where) => { stand(pose, legs, where); pose.yawL = wanted; };
    return made;
  });
  const stage = createStage({ ...prolog, furniture: [], scenes: [{ id: 'turn', seconds: 4,
    stage: { actors: { bertil: [{ at: 0, x: 0, y: 0, z: 0, face: .25, act: 'stand' }] } } }] }, () => 0);
  const rig = stage.actors.get('bertil')!.rig, draw = rig.pose.bind(rig); let shown = 0;
  vi.spyOn(rig, 'pose').mockImplementation(pose => { shown = pose.yawL ?? 0; draw(pose); });
  for (let frame = 0; frame < 60; frame++) stage.update({ id: 'turn', seconds: frame / 60 }, new Set(), { x: 0, y: 0 }, frame / 60, 1 / 60, false);
  const before = shown;
  wanted = stopped.yawL!;
  stage.update({ id: 'turn', seconds: 1 }, new Set(), { x: 0, y: 0 }, 1, 1 / 60, false);
  expect(shown).toBeCloseTo(before, 8);
});

it('keeps Bertil’s restored window step and its return to standing continuous', () => {
  const stage = createStage(prolog, () => 0), rig = stage.actors.get('bertil')!.rig;
  const flags = new Set(['scene:morgon', 'eye', 'paint']);
  const draw = rig.pose.bind(rig); let shown: Pose = { ...STANDING };
  vi.spyOn(rig, 'pose').mockImplementation(pose => { shown = { ...pose }; draw(pose); });
  const mesh = rig.group.children[0] as InstancedMesh, matrix = new Matrix4(), at = new Vector3(), scale = new Vector3(), turn = new Quaternion();
  let previous: { yaw: number; foot: Vector3; turn: Quaternion } | null = null;
  for (let frame = 0; frame < 150; frame++) {
    const seconds = 1 / 24 + frame / 60;
    stage.update({ id: 'vaknar', seconds }, flags, { x: 2.6, y: 0 }, seconds + 1, 1 / 60, false);
    stage.group.updateMatrixWorld(true); mesh.getMatrixAt(13, matrix); matrix.premultiply(mesh.matrixWorld).decompose(at, turn, scale);
    const yaw = shown.yawL ?? 0;
    if (previous && seconds > 1 && seconds < 1.6) {
      expect(Math.abs(yaw - previous.yaw), `yaw at ${seconds}`).toBeLessThan(.36);
      expect(at.distanceTo(previous.foot), `foot at ${seconds}`).toBeLessThan(.4);
      expect(turn.angleTo(previous.turn), `boot turn at ${seconds}`).toBeLessThan(.6);
    }
    if (frame === 67) {
      const held = { ...shown };
      for (let pause = 0; pause < 8; pause++) {
        stage.update({ id: 'vaknar', seconds }, flags, { x: 2.6, y: 0 }, seconds + 1, 0, false);
        expect(shown).toEqual(held);
      }
    }
    previous = { yaw, foot: at.clone(), turn: turn.clone() };
  }
});
