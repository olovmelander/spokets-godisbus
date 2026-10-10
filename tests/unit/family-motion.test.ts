import { Bone, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createFamilyMotion } from '../../src/render/family-motion';
import { createModelRig, createRehearsalRig, STANDING, type Pose } from '../../src/render/rig';

describe('family help-point movement', () => {
  it('welcomes Elof before calling, keeps the offered help readable, and holds it through pause', () => {
    for (const [who, purpose] of [['moa', 'moa'], ['pappa', 'seesaw'], ['bertil', 'cap:ready'], ['mamma', 'braid']] as const) {
      const motion = createFamilyMotion(who, 80, purpose);
      const look = { ahead: 2, up: .8 };
      const idle = { ...motion.update(.1, 1, 0, 0, null, true, look, { ready: false, near: false }) };
      const welcome = { ...motion.update(.1, 1, 0, 0, null, true, look, { ready: false, near: true }) };
      expect(welcome.armR).toBeGreaterThan(idle.armR + 1);
      const offered = { ...motion.update(.1, 1, 0, 0, null, true, look, { ready: true, near: true }) };
      expect(offered).not.toEqual(welcome);
      for (const clock of [10, 100, 900]) {
        expect(motion.update(.1, clock, 0, 0, null, true, look, { ready: true, near: true })).toEqual(offered);
        expect(motion.update(0, clock, 0, 0, null, false, look, { ready: false, near: false })).toEqual(offered);
      }
      expect(motion.update(.1, 1, 0, 0, null, true, look, { ready: true, near: false })).toEqual(idle);
    }
  });

  it('blends the welcoming hands and knees into a practical help gesture', () => {
    const motion = createFamilyMotion('bertil', 154.6, 'cap:ready');
    const look = { ahead: 2, up: .8 };
    for (let i = 0; i < 90; i++) motion.update(1 / 60, 0, 0, 0, null, false, look, { ready: false, near: true });
    let before = { ...motion.update(0, 0, 0, 0, null, false) };
    for (let i = 0; i < 90; i++) {
      const after = { ...motion.update(1 / 60, 0, 0, 0, null, false, look, { ready: true, near: true }) };
      for (const joint of ['armR', 'armL', 'elbowR', 'elbowL', 'kneeR', 'kneeL'] as const) {
        expect(Math.abs(after[joint] - before[joint]), joint).toBeLessThan(.3);
      }
      before = after;
    }
    expect(before.kneeL).toBeGreaterThan(.2);
  });

  it('gives the family distinct, readable greetings and keeps them still with reduced motion', () => {
    const roles = ['pappa', 'mamma', 'moa', 'bertil'] as const;
    const poses = roles.map((who) => {
      const motion = createFamilyMotion(who, 27);
      const greeting = { ...motion.update(.1, 1, 1.1, .4, null, true) };
      expect(motion.update(.1, 80, .9, .4, null, true)).toEqual(greeting);
      expect(greeting.bounce).toBe(0); expect(greeting.legL).toBe(0); expect(greeting.legR).toBe(0);
      return greeting;
    });
    const [pappa, mamma, moa, bertil] = poses;
    // A reassuring hand, a lower welcome, a one-handed wave, and a two-handed cheer.
    expect(pappa!.armL).toBeLessThan(.6); expect(pappa!.armR).toBeGreaterThan(1.4);
    expect(mamma!.armL).toBeGreaterThan(pappa!.armL); expect(mamma!.armR).toBeLessThan(1.5);
    expect(moa!.armL).toBeLessThan(.5); expect(moa!.armR).toBeGreaterThan(2.3);
    expect(bertil!.armL).toBeGreaterThan(2); expect(bertil!.armR).toBeGreaterThan(2.3);
    const idle = roles.map((who) => createFamilyMotion(who, 27).update(.1, 0, 0, 0, null, true));
    expect(idle[2]!.elbowL).toBeGreaterThan(idle[2]!.elbowR + .4);
    expect(idle[0]!.nod).toBeGreaterThan(idle[3]!.nod);
  });

  it('anticipates a greeting with the head, follows with the arms, and eases fully back to rest', () => {
    for (const who of ['pappa', 'mamma', 'moa', 'bertil'] as const) {
      const motion = createFamilyMotion(who, 27);
      const quiet = { ...motion.update(1 / 60, 0, 0, 0, null, false) };
      const starting = { ...motion.update(1 / 60, 0, 1.8, 0, null, false) };
      expect(starting).toEqual(quiet);
      const anticipating = { ...motion.update(1 / 60, 0, 1.76, 0, null, false) };
      expect(anticipating.nod).toBeGreaterThan(quiet.nod + .02);
      expect(anticipating.armR).toBe(quiet.armR);
      let previous = starting;
      for (let frame = 1; frame <= 108; frame++) {
        const current = { ...motion.update(1 / 60, 0, 1.8 - frame / 60, 0, null, false) };
        for (const joint of ['armL', 'armR', 'elbowL', 'elbowR', 'nod'] as const) {
          expect(Math.abs(current[joint] - previous[joint]), `${who} ${joint} frame ${frame}`).toBeLessThan(.3);
        }
        previous = current;
      }
      expect(previous).toEqual(quiet);
      expect(motion.update(.1, 0, 2.5, 0, null, false)).toEqual(quiet);
    }
  });

  it('follows Elof smoothly at the same rate on every screen and freezes the actual gaze on pause', () => {
    const poses = [30, 60, 120].map((fps) => {
      const motion = createFamilyMotion('mamma', 27);
      const before = { ...motion.update(1 / fps, 0, 0, -.75, null, false) };
      let result = { ...before };
      for (let frame = 1; frame <= fps / 10; frame++) result = { ...motion.update(1 / fps, frame / fps, 0, .75, null, false) };
      expect(result.turn).toBeGreaterThan(before.turn); expect(result.turn).toBeLessThan(.5);
      expect(motion.update(0, 50, 0, -.75, null, false)).toEqual(result);
      return result;
    });
    for (const pose of poses) expect(pose.turn).toBeCloseTo(poses[0]!.turn, 10);
  });

  it('greets with jointed arms, offsets idle by role, and freezes the actual pose while paused', () => {
    const motion = createFamilyMotion('moa', 165);
    const quiet = { ...motion.update(.1, 1, 0, .4, null, false) };
    const hello = { ...motion.update(.1, 1.1, 1.2, .4, null, false) };
    expect(hello.armR).toBeGreaterThan(quiet.armR + 1.5);
    expect(hello.elbowR).toBeGreaterThan(quiet.elbowR + .3);
    expect(hello.bounce).toBe(0); expect(hello.seat).toBeNull();
    expect(hello.turn).toBeCloseTo(.4);
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
        expect(pose.armL - pose.lean).toBeCloseTo(1.85); expect(pose.armR).toBe(pose.armL);
        expect(pose.elbowL).toBe(.55); expect(pose.bounce).toBe(0);
      }
      expect(excursion).toBeGreaterThan(.2);
      const walking = { ...pose };
      for (let i = 0; i < 5; i++) expect(motion.update(0, 2, 0, 0, 2.6, false)).toEqual(walking);
      const stopping = { ...motion.update(1 / fps, 2, 0, 0, 2.6, false) };
      expect(Math.abs(stopping.legL)).toBeLessThan(Math.abs(walking.legL));
      expect(Math.abs(stopping.legL)).toBeGreaterThan(Math.abs(walking.legL) * .6);
      for (let frame = 0; frame < fps; frame++) motion.update(1 / fps, 2, 0, 0, 2.6, false);
      expect(motion.update(1 / fps, 2, 0, 0, 2.6, false).legL).toBeCloseTo(0, 4);
      const restored = motion.update(1 / fps, 3, 0, 0, 80, false);
      expect(restored.legL).toBeCloseTo(0); expect(restored.legR).toBeCloseTo(0);
      expect(restored.armL).toBe(1.85);
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

  it('lowers the supporting arms after carrying without marching, and skips that transition in reduced motion', () => {
    const motion = createFamilyMotion('pappa', 27);
    const carry = { ...motion.update(1 / 60, 0, 0, 0, 0, false) };
    let lowering = { ...motion.update(1 / 60, 0, 0, 0, null, false) };
    expect(lowering.armR).toBeLessThan(carry.armR); expect(lowering.armR).toBeGreaterThan(1.7);
    expect(motion.update(0, 30, 0, 0, null, false)).toEqual(lowering);
    for (let frame = 0; frame < 30; frame++) {
      lowering = { ...motion.update(1 / 60, 0, 0, 0, null, false) };
      expect(lowering.legL).toBe(0); expect(lowering.legR).toBe(0); expect(lowering.bounce).toBe(0);
    }
    expect(lowering).toEqual(createFamilyMotion('pappa', 27).update(.1, 0, 0, 0, null, false));
    motion.update(.1, 0, 0, 0, 0, true);
    expect(motion.update(.1, 0, 0, 0, null, true)).toEqual(createFamilyMotion('pappa', 27).update(.1, 0, 0, 0, null, true));
  });

  it('keeps the hands continuous when boarding or when another greeting interrupts the first', () => {
    const motion = createFamilyMotion('pappa', 27);
    const quiet = { ...motion.update(1 / 60, 0, 0, 0, null, false) };
    const boarding = { ...motion.update(1 / 60, 0, 0, 0, 0, false) };
    expect(boarding.armR).toBeGreaterThan(quiet.armR);
    expect(boarding.armR - quiet.armR).toBeLessThan(.05);
    for (let frame = 1; frame <= 24; frame++) motion.update(1 / 60, 0, 0, 0, 0, false);
    expect(motion.update(1 / 60, 0, 0, 0, 0, false).armR).toBe(1.85);
    const wave = createFamilyMotion('bertil', 27);
    let previous = { ...wave.update(1 / 60, 0, 1, 0, null, false) };
    for (let frame = 0; frame <= 108; frame++) {
      const current = { ...wave.update(1 / 60, 0, Math.max(0, 1.8 - frame / 60), 0, null, false) };
      expect(Math.abs(current.armR - previous.armR)).toBeLessThan(.3);
      expect(Math.abs(current.elbowR - previous.elbowR)).toBeLessThan(.3);
      previous = current;
    }
    expect(previous.armR).toBe(.04);
  });

  it('looks down at tiny Elof, up when he climbs, and holds the actual look through a pause', () => {
    const results = [30, 60, 120].map(fps => {
      const motion = createFamilyMotion('mamma', 85);
      const down = { ...motion.update(1 / fps, 0, 0, 0, null, false, { ahead: 2, up: .8 }) };
      expect(down.nod).toBeGreaterThan(.55);
      for (let frame = 0; frame < fps; frame++) motion.update(1 / fps, 0, 0, 0, null, false, { ahead: 2, up: 6 });
      const up = { ...motion.update(0, 0, 0, 0, null, false) };
      expect(up.nod).toBeLessThan(-.35);
      expect(motion.update(0, 70, 1.8, .5, 80, true, { ahead: 1, up: 0 })).toEqual(up);
      return up;
    });
    for (const pose of results) expect(pose.nod).toBeCloseTo(results[0]!.nod, 10);
  });

  it('gives the practical helpers distinct gestures instead of the same celebration', () => {
    const poseFor = (who: 'mamma' | 'pappa' | 'moa' | 'bertil', purpose: string) => {
      const motion = createFamilyMotion(who, 80, purpose);
      const pose = { ...motion.update(.1, 1, 1, 0, null, true, { ahead: 1.4, up: 1.3 }) };
      expect(motion.update(.1, 90, .8, 0, null, true, { ahead: 1.4, up: 1.3 })).toEqual(pose);
      expect(pose.bounce).toBe(0); expect(pose.seat).toBeNull();
      return pose;
    };
    const cap = poseFor('bertil', 'cap'), lift = poseFor('mamma', 'mamma');
    expect(cap.kneeL).toBeGreaterThan(.2); expect(cap.kneeR).toBeGreaterThan(.2);
    expect(lift.elbowL).toBeGreaterThan(.5); expect(lift.elbowR).toBeGreaterThan(.5);
    expect(poseFor('mamma', 'bog:return-bridge')).toEqual(lift);
    const braid = poseFor('mamma', 'braid');
    expect(braid.armL).toBeGreaterThan(2.5); expect(braid.armR).toBeLessThan(1);
    const plane = poseFor('moa', 'moa'), greeting = poseFor('moa', 'taste');
    expect(plane.armR).toBeLessThan(greeting.armR - .5);
    const pointing = poseFor('pappa', 'seesaw');
    expect(pointing.elbowR).toBeLessThan(.6);
    expect(poseFor('pappa', 'party:pappa').armR).toBeLessThan(pointing.armR);
  });

  it('eases practical help gestures in and out without a hand or knee jump', () => {
    for (const [who, purpose] of [['moa', 'moa'], ['bertil', 'cap'], ['pappa', 'seesaw'],
      ['mamma', 'mamma'], ['mamma', 'braid'], ['mamma', 'bog:return-bridge'], ['moa', 'party:moa']] as const) {
      const motion = createFamilyMotion(who, 80, purpose), rig = createRehearsalRig(who);
      const quiet = { ...motion.update(1 / 60, 0, 0, 0, null, false) };
      let previous = quiet;
      rig.pose(quiet);
      const hand = rig.hand(1, new Vector3());
      for (let frame = 0; frame <= 108; frame++) {
        const pose = { ...motion.update(1 / 60, 0, Math.max(0, 1.8 - frame / 60), 0, null, false) };
        for (const joint of ['armL', 'armR', 'elbowL', 'elbowR', 'kneeL', 'kneeR'] as const) {
          expect(Math.abs(pose[joint] - previous[joint]), `${purpose} ${joint} frame ${frame}`).toBeLessThan(.3);
        }
        rig.pose(pose);
        const now = rig.hand(1, new Vector3());
        expect(now.distanceTo(hand), `${purpose} hand frame ${frame}`).toBeLessThan(.2);
        hand.copy(now); previous = pose;
      }
      expect(previous).toEqual(quiet);
    }
  });

  it('grounds actual boot corners through greetings and carry strides without moving any outer root', () => {
    for (const [who, purpose] of [['pappa', ''], ['mamma', ''], ['moa', ''], ['bertil', ''],
      ['pappa', 'seesaw'], ['pappa', 'party:pappa'], ['mamma', 'mamma'], ['mamma', 'braid'], ['mamma', 'bog:return-bridge'],
      ['moa', 'moa'], ['moa', 'party:moa'], ['bertil', 'cap']] as const) {
      const motion = createFamilyMotion(who, 27, purpose), rig = createRehearsalRig(who);
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
