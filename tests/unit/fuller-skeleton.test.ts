import { Bone, Group, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { followLimbs, TWIST } from '../../src/render/joints';
import { collarbone, createModelRig, FULLER, STANDING, type Pose } from '../../src/render/rig';
import { jointOf } from '../../src/render/sleeves';

/**
 * A body as the family's models are rigged (the private repository's family/body_rig.py), or as they were before it:
 * a pelvis and two spine bones, the head on the chest, and the arms hanging from it; with `fuller`, a third spine bone,
 * a neck the head hangs from, a collarbone each arm hangs from, a twist bone in each upper arm and forearm and a
 * corrective bone at each hip. Every joint rests where it does in the other, and the limbs hang half a turn round z, as
 * exported (src/render/rig.ts, createModelRig).
 */
function model(fuller: boolean) {
  const root = new Group();
  const named = (name: string, parent: Bone | Group, x: number, y: number, z = 0, hangs = false) => {
    const bone = new Bone(); bone.name = name; bone.position.set(x, y, z); if (hangs) bone.rotation.z = Math.PI; parent.add(bone); return bone;
  };
  // In the world at rest: the pelvis at 0.6, spine_01 0.65, spine_02 0.82, spine_03 0.91, the shoulders 1.0, the neck's foot
  // 1.08 and the head's joint 1.12.
  const pelvis = named('pelvis', root, 0, 0.6), spine = named('spine_01', pelvis, 0, 0.05), chest = named('spine_02', spine, 0, 0.17);
  const upper = fuller ? named('spine_03', chest, 0, 0.09) : null;
  const neck = upper ? named('neck_01', upper, 0, 0.17) : null;
  named('Head', neck ?? chest, 0, neck ? 0.04 : 0.3);
  for (const [tag, side] of [['l', 1], ['r', -1]] as const) {
    // The collarbone from beside the top of the breastbone (0.03, 0.98, 0.02) out to the shoulder (0.17, 1.0, 0).
    const clavicle = upper ? named(`clavicle_${tag}`, upper, side * 0.03, 0.07, 0.02) : null;
    const arm = clavicle ? named(`upperarm_${tag}`, clavicle, side * 0.14, 0.02, -0.02, true) : named(`upperarm_${tag}`, chest, side * 0.17, 0.18, 0, true);
    const fore = named(`lowerarm_${tag}`, arm, 0, 0.19);
    named(`hand_${tag}`, fore, 0, 0.17);
    if (fuller) { named(`upperarm_twist_01_${tag}`, arm, 0, 0.05); named(`lowerarm_twist_01_${tag}`, fore, 0, 0.1); }
    const thigh = named(`thigh_${tag}`, pelvis, side * 0.08, -0.015, 0, true);
    named(`foot_${tag}`, named(`calf_${tag}`, thigh, 0, 0.24), 0, 0.22);
    if (fuller) named(`thigh_correctiveRoot_${tag}`, pelvis, side * 0.08, -0.015, 0, true);
  }
  root.updateMatrixWorld(true);
  const rests = new Map<string, Quaternion>();
  root.traverse((node) => { if (node.name) rests.set(node.name, node.quaternion.clone()); });
  const rig = createModelRig(root, 5.2);
  const get = (name: string) => root.getObjectByName(name)!;
  /** How far a bone has turned from its rest, in its own frame (radians). */
  const turned = (name: string) => get(name).quaternion.angleTo(rests.get(name)!);
  const at = (name: string) => { root.updateMatrixWorld(true); return get(name).getWorldPosition(new Vector3()); };
  const facing = (name: string) => { root.updateMatrixWorld(true); return get(name).getWorldQuaternion(new Quaternion()); };
  return { root, rig, get, turned, at, facing };
}

const posed = (more: Partial<Pose>): Pose => ({ ...STANDING, armL: 0, armR: 0, elbowL: 0, elbowR: 0, ...more });

describe('a fuller skeleton', () => {
  it('bends the trunk through three spine bones, as far in all as two bent it', () => {
    const full = model(true), old = model(false);
    full.rig.pose(posed({ lean: 0.5 }));
    old.rig.pose(posed({ lean: 0.5 }));
    expect(full.turned('spine_01')).toBeCloseTo(0.5 * FULLER.spine.lean[0], 6);
    expect(full.turned('spine_02')).toBeCloseTo(0.5 * FULLER.spine.lean[1], 6);
    expect(full.turned('spine_03')).toBeCloseTo(0.5 * FULLER.spine.lean[2], 6);
    // The top of the trunk turns as far as before, and the shoulders' turn reaches the same.
    expect(full.facing('spine_03').angleTo(old.facing('spine_02'))).toBeLessThan(1e-6);
    expect(old.turned('spine_01')).toBeCloseTo(0.5 * 0.55, 6);
    // A turn of the shoulders is shared by the chest and the upper chest.
    full.rig.pose(posed({ twist: 0.4 }));
    old.rig.pose(posed({ twist: 0.4 }));
    expect(full.turned('spine_02')).toBeCloseTo(0.2, 6);
    expect(full.turned('spine_03')).toBeCloseTo(0.2, 6);
    expect(full.facing('spine_03').angleTo(old.facing('spine_02'))).toBeLessThan(1e-6);
  });

  it('shares the head\'s nod, turn and tilt with the neck, and faces the head as it faced', () => {
    const full = model(true), old = model(false);
    for (const pose of [posed({ nod: 0.5 }), posed({ turn: 0.7, tilt: 0.2 }), posed({ nod: -0.3, turn: -0.5, tilt: -0.15 })]) {
      full.rig.pose(pose);
      old.rig.pose(pose);
      expect(full.facing('Head').angleTo(old.facing('Head'))).toBeLessThan(1e-6);
      const whole = old.turned('Head');
      expect(full.turned('neck_01')).toBeCloseTo(whole * FULLER.neck, 5);
      expect(full.turned('Head')).toBeCloseTo(whole * (1 - FULLER.neck), 5);
    }
    // Nodding about the neck's foot, the head comes forward over the chest as well as down.
    full.rig.pose(posed({ nod: 0.5 }));
    old.rig.pose(posed({ nod: 0.5 }));
    expect(full.at('Head').z).toBeGreaterThan(old.at('Head').z + 0.005);
  });

  it('lifts the collarbone with a raised arm and brings it forward with a reaching one, the arm pointing as posed', () => {
    const full = model(true), old = model(false);
    full.rig.pose(posed({}));
    const shoulder = full.at('upperarm_l'), restAt = full.at('upperarm_l').clone();
    expect(full.turned('clavicle_l')).toBeLessThan(1e-9);
    for (const pose of [posed({ armL: Math.PI, armR: Math.PI }), posed({ armL: 2.4, outL: 0.6, armR: 1.2, spread: 0.3 }), posed({ armL: -0.6 })]) {
      full.rig.pose(pose);
      old.rig.pose(pose);
      // Each arm points where the pose has it, whatever its collarbone does.
      for (const name of ['upperarm_l', 'upperarm_r', 'lowerarm_l']) {
        const way = new Vector3(0, 1, 0).applyQuaternion(full.facing(name)), was = new Vector3(0, 1, 0).applyQuaternion(old.facing(name));
        expect(way.angleTo(was), name).toBeLessThan(1e-6);
      }
    }
    // Straight up, the shoulder is lifted by as much as a collarbone lifts.
    full.rig.pose(posed({ armL: Math.PI, armR: Math.PI }));
    expect(full.turned('clavicle_l')).toBeCloseTo(FULLER.lift, 2);
    expect(full.at('upperarm_l').y).toBeGreaterThan(restAt.y + 0.03);
    expect(full.at('upperarm_r').y).toBeCloseTo(full.at('upperarm_l').y, 6);
    // Reaching ahead, it comes forward; swung back, a little back; hanging, it rests.
    full.rig.pose(posed({ armL: Math.PI / 2 }));
    expect(full.at('upperarm_l').z).toBeGreaterThan(shoulder.z + 0.01);
    full.rig.pose(posed({ armL: -0.9 }));
    expect(full.at('upperarm_l').z).toBeLessThan(shoulder.z);
    full.rig.pose(posed({}));
    expect(full.at('upperarm_l').distanceTo(restAt)).toBeLessThan(1e-9);
  });

  it('reaches a hand to its target from the shoulder where the collarbone has put it', () => {
    const full = model(true);
    full.rig.pose(posed({ armL: 2.2 }));
    const target = full.at('upperarm_l').add(new Vector3(0.05, -0.05, 0.25));
    full.rig.reach(0, target);
    expect(full.rig.hand(0, new Vector3()).distanceTo(target)).toBeLessThan(1e-6);
  });

  it('turns the forearm\'s twist bone with a share of the hand\'s turn, and the hip\'s corrective bone half as far as its thigh', () => {
    const full = model(true);
    full.rig.pose(posed({ legL: 1.4, legR: -0.4 }));
    const hand = full.get('hand_l'), rest = hand.quaternion.clone();
    hand.quaternion.copy(rest).multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), 1));
    full.root.updateMatrixWorld(true);
    expect(full.turned('lowerarm_twist_01_l')).toBeCloseTo(TWIST.fore, 6);
    // A swing of the hand is no twist: the bone stays as it rests.
    hand.quaternion.copy(rest).multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), 0.8));
    full.root.updateMatrixWorld(true);
    expect(full.turned('lowerarm_twist_01_l')).toBeLessThan(1e-6);
    // The upper arm's follows its arm as posed: its swings are not a twist of it, and nothing else twists it (TWIST.upper).
    expect(TWIST.upper).toBe(0);
    expect(full.facing('upperarm_twist_01_l').angleTo(full.facing('upperarm_l'))).toBeLessThan(1e-6);
    expect(full.turned('thigh_correctiveRoot_l')).toBeCloseTo(0.7, 3);
    expect(full.turned('thigh_correctiveRoot_r')).toBeCloseTo(0.2, 3);
  });

  it('leaves a body without the new bones as it was', () => {
    const old = model(false);
    expect(followLimbs(old.root)).toBe(0);
    old.rig.pose(posed({ lean: 0.4, armL: Math.PI, nod: 0.3 }));
    expect(old.turned('spine_01')).toBeCloseTo(0.4 * 0.55, 6);
    expect(old.turned('spine_02')).toBeCloseTo(0.4 * 0.55, 6);
    expect(old.turned('Head')).toBeCloseTo(0.3, 6);
    expect(old.get('upperarm_l').parent!.name).toBe('spine_02');
    // Set up once: a second call finds them already following.
    const full = model(true);
    expect(followLimbs(full.root)).toBe(0);
  });

  it('lifts a collarbone only past the shoulder\'s height, and brings it forward only for an arm that is raised ahead', () => {
    const up = new Vector3(0, 1, 0), ahead = new Vector3(0, 0, 1);
    const hanging = collarbone(new Vector3(0, -1, 0), up, ahead);
    expect(Math.abs(hanging.lift) + Math.abs(hanging.forward)).toBe(0);
    expect(collarbone(new Vector3(0, 1, 0), up, ahead).lift).toBeCloseTo(FULLER.lift, 9);
    const level = collarbone(new Vector3(0, 0, 1), up, ahead);
    expect(level.lift).toBeGreaterThan(0);
    expect(level.lift).toBeLessThan(FULLER.lift * 0.4);
    expect(level.forward).toBeCloseTo(FULLER.reach, 9);
    expect(collarbone(new Vector3(0, -0.5, -0.87).normalize(), up, ahead).forward).toBeLessThan(0);
  });

  it('counts each new bone\'s corners as its limb\'s or the trunk\'s, where the rain gear asks', () => {
    expect(['clavicle_l', 'spine_03', 'neck_01', 'upperarm_twist_01_r', 'lowerarm_twist_01_l', 'thigh_correctiveRoot_r', 'calf_l_half', 'thigh_l_push'].map(jointOf))
      .toEqual(['spine_02', 'spine_02', 'Head', 'upperarm_r', 'lowerarm_l', 'thigh_r', 'calf_l', 'thigh_l']);
  });
});
