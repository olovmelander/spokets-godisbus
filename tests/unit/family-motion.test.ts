import { Bone, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createFamilyMotion } from '../../src/render/family-motion';
import { createModelRig, createRehearsalRig, STANDING, type Pose } from '../../src/render/rig';

describe('family help-point movement', () => {
  it('greets with jointed arms, offsets idle by role, and freezes the actual pose while paused', () => {
    const motion = createFamilyMotion('moa', 165);
    const quiet = { ...motion.update(.1, 1, 0, .4, null, false) };
    const hello = { ...motion.update(.1, 1.1, 1.2, .4, null, false) };
    expect(hello.armR).toBeGreaterThan(quiet.armR + 1.5);
    expect(hello.elbowR).toBeGreaterThan(quiet.elbowR + .3);
    expect(hello.bounce).toBe(0); expect(hello.seat).toBeNull();
    expect(hello.turn).toBeCloseTo(.088);
    for (let i = 0; i < 20; i++) expect(motion.update(0, 50, 0, -.7, 80, true)).toEqual(hello);
    const other = createFamilyMotion('bertil', 165).update(.1, 1, 0, .4, null, false);
    expect(Math.abs(other.lean - quiet.lean)).toBeGreaterThan(.005);
    const calm = { ...motion.update(.1, 1, 0, .4, null, true) };
    expect(motion.update(.1, 80, 0, .4, null, true)).toEqual(calm);
  });

  it('walks only with real carry travel, holds the passenger, and rejects restored-position jumps', () => {
    const poses = [30, 60, 120].map((fps) => {
      const motion = createFamilyMotion('pappa', 27);
      motion.update(1 / fps, 0, 0, 0, 0, false);
      let pose: Pose = { ...STANDING }, excursion = 0;
      for (let frame = 1; frame <= fps; frame++) {
        pose = motion.update(1 / fps, frame / fps, 0, 0, frame * 2.6 / fps, false);
        excursion = Math.max(excursion, Math.abs(pose.legL));
        expect(pose.armL).toBe(1.85); expect(pose.armR).toBe(1.85);
        expect(pose.elbowL).toBe(.55); expect(pose.bounce).toBe(0);
      }
      expect(excursion).toBeGreaterThan(.2);
      const walking = { ...pose };
      for (let i = 0; i < 5; i++) expect(motion.update(0, 2, 0, 0, 2.6, false)).toEqual(walking);
      const standing = { ...motion.update(1 / fps, 2, 0, 0, 2.6, false) };
      expect(standing.legL).toBeCloseTo(0); expect(standing.legR).toBeCloseTo(0);
      expect(motion.update(1 / fps, 3, 0, 0, 80, false)).toEqual(standing);
      return walking;
    });
    for (const pose of poses) {
      expect(pose.legL).toBeCloseTo(poses[0]!.legL, 10);
      expect(pose.kneeR).toBeCloseTo(poses[0]!.kneeR, 10);
    }
    const calm = createFamilyMotion('pappa', 27);
    calm.update(.1, 0, 0, 0, 0, true);
    const stride = calm.update(.1, .1, 0, 0, .26, true);
    expect(Math.abs(stride.legL)).toBeGreaterThan(.1); expect(stride.bounce).toBe(0);
  });

  it('grounds actual boot corners through greetings and carry strides without moving any outer root', () => {
    for (const who of ['pappa', 'moa', 'bertil'] as const) {
      const motion = createFamilyMotion(who, 27), rig = createRehearsalRig(who);
      rig.group.position.set(15, -8, .4); rig.group.rotation.y = 1.2;
      const mesh = rig.group.children[0] as InstancedMesh, matrix = new Matrix4(), point = new Vector3();
      const poses = Array.from({ length: 30 }, (_, i) => ({ ...motion.update(.1, i * .1, Math.max(0, 1.8 - i * .1), .4, null, false) }));
      for (let i = 0; i < 90; i++) poses.push({ ...motion.update(1 / 60, i / 60, 0, 0, i * 2.6 / 60, false) });
      for (const pose of poses) {
        rig.pose(pose);
        let bottom = Infinity;
        for (const foot of [13, 16]) {
          mesh.getMatrixAt(foot, matrix);
          for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) {
            point.set(x, y, z).applyMatrix4(matrix); bottom = Math.min(bottom, point.y);
          }
        }
        expect(bottom).toBeCloseTo(0, 5);
        expect(rig.group.position.toArray()).toEqual([15, -8, .4]);
        expect(rig.group.rotation.y).toBe(1.2);
        expect(mesh.boundingBox!.min.y).toBeGreaterThan(-1e-6);
      }
    }
  });
});

describe('shared model turning and arm spread', () => {
  it('turns about body axes through arbitrary rest rolls, preserves pitch, and restores every bind rotation', () => {
    const model = new Group(), spine = new Bone(), head = new Bone(), left = new Bone(), right = new Bone();
    spine.name = 'spine_01'; head.name = 'Head'; left.name = 'upperarm_l'; right.name = 'upperarm_r';
    spine.rotation.set(.05, -.2, .1); head.rotation.set(.3, .4, -.15);
    left.rotation.set(.2, .15, Math.PI); right.rotation.set(-.3, -.25, Math.PI);
    spine.add(head, left, right); model.add(spine); model.rotation.y = .8; model.scale.setScalar(3);
    const rest = [spine, head, left, right].map((node) => node.quaternion.clone());
    const relative = [head, left, right].map((node) => rest[0]!.clone().multiply(node.quaternion));
    const rig = createModelRig(model, 5.2), parent = new Group(); parent.add(rig.group);
    parent.rotation.set(.1, 1.1, -.2); parent.position.set(4, -8, 2); parent.scale.setScalar(1.4);
    const pose = { ...STANDING, armL: .7, armR: .4, turn: .35, nod: .12, spread: .22 };
    rig.pose(pose); parent.updateWorldMatrix(true, true);
    const body = model.getWorldQuaternion(new Quaternion()), x = new Vector3(1, 0, 0);
    for (const [i, node, axis, extra, pitch] of [
      [0, head, new Vector3(0, 1, 0), pose.turn, pose.nod],
      [1, left, new Vector3(0, 0, 1), pose.spread, pose.armL],
      [2, right, new Vector3(0, 0, 1), -pose.spread, pose.armR],
    ] as const) {
      const expected = body.clone().multiply(new Quaternion().setFromAxisAngle(axis, extra))
        .multiply(relative[i]!).multiply(new Quaternion().setFromAxisAngle(x, pitch));
      expect(node.getWorldQuaternion(new Quaternion()).angleTo(expected)).toBeLessThan(1e-7);
    }
    const neutral = { ...STANDING, armL: 0, armR: 0, elbowL: 0, elbowR: 0 };
    rig.pose(neutral);
    for (const [i, node] of [spine, head, left, right].entries()) expect(node.quaternion.angleTo(rest[i]!)).toBeLessThan(1e-7);
    const partial = createModelRig(new Group(), 4);
    expect(() => partial.pose(pose)).not.toThrow();
    expect(partial.group.position.toArray()).toEqual([0, 0, 0]);
  });
});
