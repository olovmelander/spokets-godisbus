import { stubCanvas } from './canvas-stub';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { stepLength } from '../../src/render/acting';
import { heightOf } from '../../src/render/rig';
import { createStage, type Stage } from '../../src/render/stage';
import type { ActorKey, SceneDef } from '../../src/sim/scene';

/**
 * The family move as people do (the motion pass of 6 November 2026): a planted boot stays where it was put down,
 * nobody whips round, a follower keeps up with a running Elof without jumping, and a scene that does not stage
 * them leaves them where they are.
 */
beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

const SHOE = { left: 13, right: 16 } as const;
const stageFor = (keys: readonly ActorKey[], more: SceneDef[] = []) =>
  createStage({ ...garden, furniture: [], scenes: [{ id: 'motion', seconds: 12, stage: { actors: { mamma: keys } } }, ...more] }, () => 0);
const body = (stage: Stage) => stage.actors.get('mamma')!.rig;
function shoes(stage: Stage): [Vector3, Vector3] {
  const rig = body(stage), mesh = rig.group.children[0] as InstancedMesh, m = new Matrix4();
  stage.group.updateMatrixWorld(true);
  return [SHOE.left, SHOE.right].map((i) => { mesh.getMatrixAt(i, m); return new Vector3().setFromMatrixPosition(m.premultiply(mesh.matrixWorld)); }) as [Vector3, Vector3];
}
/**
 * What a boot stands on: its sole's heel edge, toe edge, or both (flat). A planted boot rolls over its heel and its toe,
 * and these are what must not slide.
 */
function soles(stage: Stage): { heel: Vector3; toe: Vector3 }[] {
  const rig = body(stage), mesh = rig.group.children[0] as InstancedMesh, m = new Matrix4();
  stage.group.updateMatrixWorld(true);
  return [SHOE.left, SHOE.right].map((i) => {
    mesh.getMatrixAt(i, m); m.premultiply(mesh.matrixWorld);
    return { heel: new Vector3(0, -.5, -.5).applyMatrix4(m), toe: new Vector3(0, -.5, .5).applyMatrix4(m) };
  });
}

describe('the family walk', () => {
  it.each([[6, 4], [6, 2], [10, 2]])('keeps the planted boot where it was put down: %s across in %s seconds', (way, seconds) => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: way, move: seconds }]);
    type Contact = { side: number; on: 'heel' | 'toe' | 'flat'; x: number; z: number };
    let last: Contact | null = null, lastX = 0, slipped = 0, along = 0, across = 0, travelled = 0;
    for (let f = 0; f <= (1 + seconds + .5) * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const now = soles(stage), x = body(stage).group.position.x;
      // The boot on the ground, and what of it: its heel, its toe or the whole sole (then its middle).
      const low = Math.min(...now.flatMap((one) => [one.heel.y, one.toe.y]));
      let contact: Contact | null = null;
      for (const [side, one] of now.entries()) {
        const heel = one.heel.y - low < .01, toe = one.toe.y - low < .01;
        if (heel && toe) contact = { side, on: 'flat', x: (one.heel.x + one.toe.x) / 2, z: (one.heel.z + one.toe.z) / 2 };
        else if (heel || toe) contact ??= { side, on: heel ? 'heel' : 'toe', x: heel ? one.heel.x : one.toe.x, z: heel ? one.heel.z : one.toe.z };
      }
      // Off the ground in a run's flight, nothing is planted.
      if (last && contact && contact.side === last.side && contact.on === last.on && low < .01) {
        const dx = contact.x - last.x, dz = contact.z - last.z;
        slipped += Math.hypot(dx, dz); along += Math.abs(dx); across += Math.abs(dz);
        travelled += Math.abs(x - lastX);
      }
      last = contact; lastX = x;
    }
    expect(travelled).toBeGreaterThan(way * .2);
    // Count side slip too: the old x-only check missed the pelvis turning the planted legs. Counter-yaw lowers slow
    // walking's total slip .20761→.18386, while x rises .06593→.08218 because the hip origins still move with the pelvis.
    // Keep that tradeoff bounded per axis; do not pretend that the remaining slip (including changing steps) is zero.
    expect(slipped / travelled).toBeLessThan(.19);
    expect(along / travelled).toBeLessThan(.085);
    expect(across / travelled).toBeLessThan(.14);
  });

  it('ends a walk with the feet together, and its steps get longer as it goes faster', () => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: 6.5, move: 3 }]);
    for (let f = 0; f <= 4.5 * 60; f++) stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
    const [left, right] = shoes(stage);
    expect(Math.abs(left.x - right.x)).toBeLessThan(.15);
    const tall = heightOf('mamma');
    expect(stepLength(1.2, tall)).toBeGreaterThan(stepLength(.5, tall) * 1.2);
  });

  it('turns about at a person\'s pace, never in a frame', () => {
    // Walking back the way she faces: a half turn first.
    const stage = stageFor([{ at: 0, x: 4, y: 0, face: 0, move: .01, act: 'stand' }, { at: 1, x: 0, move: 2 }]);
    let last: number | null = null, fastest = 0;
    for (let f = 0; f <= 3.5 * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const yaw = body(stage).group.rotation.y;
      if (last !== null) fastest = Math.max(fastest, Math.abs(Math.atan2(Math.sin(yaw - last), Math.cos(yaw - last))) * 60);
      last = yaw;
    }
    expect(fastest).toBeGreaterThan(1);
    expect(fastest).toBeLessThan(7.5);
  });

  it.each(['kneel', 'crouch'] as const)('gets up off the knees into a walk, and down again, over a moment: %s', act => {
    // As Pappa does in the prologue's familj: kneeling, he walks to the next place and kneels there.
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: 0, move: .01, act }, { at: 1, x: 3, move: 1 }, { at: 2, act }]);
    let last: number | null = null, fastest = 0, highest = 0;
    for (let f = 0; f <= 3 * 60; f++) {
      stage.update({ id: 'motion', seconds: f / 60 }, new Set(), { x: 0, y: 0 }, f / 60, 1 / 60, false);
      const y = body(stage).mouth(new Vector3()).y;
      if (last !== null) fastest = Math.max(fastest, Math.abs(y - last) * 60);
      highest = Math.max(highest, y);
      last = y;
    }
    // Up into the stride and down again at about a body height a second; the legs used to take over in a few
    // frames, five heights a second.
    expect(highest - last!).toBeGreaterThan(.3);
    expect(fastest / heightOf('mamma')).toBeLessThan(1.25);
  });
});

describe('a follower', () => {
  const follower = (more: SceneDef[] = []) => stageFor([{ at: 0, x: 0, y: 0, face: .25, move: .01, act: 'stand', follow: 3 }], more);

  it('keeps up with Elof running, without a jump', () => {
    const stage = follower();
    stage.update({ id: 'motion', seconds: 1 }, new Set(), { x: 0, y: 0 }, 1, 1 / 60, false);
    const flags = new Set(['scene:motion']);
    let last = body(stage).group.position.x, biggest = 0;
    for (let f = 1; f <= 12 * 60; f++) {
      // He runs as fast as he can (RUN_SPEED), for twelve seconds.
      stage.update(null, flags, { x: f / 60 * 3.5, y: 0 }, 1 + f / 60, 1 / 60, false);
      const x = body(stage).group.position.x;
      biggest = Math.max(biggest, Math.abs(x - last));
      last = x;
    }
    expect(biggest).toBeLessThan(.15);
    expect(12 * 3.5 - 3 - last).toBeLessThan(8);
  });

  it('stays where they are through a scene that does not stage them, and follows on after it', () => {
    const stage = follower([{ id: 'elsewhere', seconds: 3, stage: {} }]);
    stage.update({ id: 'motion', seconds: 1 }, new Set(), { x: 0, y: 0 }, 1, 1 / 60, false);
    const flags = new Set(['scene:motion']);
    for (let f = 1; f <= 4 * 60; f++) stage.update(null, flags, { x: f / 60 * 2, y: 0 }, 1 + f / 60, 1 / 60, false);
    const before = body(stage).group.position.x;
    for (let f = 0; f <= 60; f++) stage.update({ id: 'elsewhere', seconds: f / 60 }, flags, { x: 8, y: 0 }, 5 + f / 60, 1 / 60, false);
    // Slowing to a stop, not put back where the first scene left them.
    expect(Math.abs(body(stage).group.position.x - before)).toBeLessThan(1.2);
    expect(body(stage).group.position.x).toBeGreaterThan(2);
  });
});
