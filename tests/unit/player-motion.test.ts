import { Bone, Group, Mesh, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { JUMP_SPEED, RUN_SPEED } from '../../src/sim/constants';
import type { PlayerState } from '../../src/sim/types';
import { createPlayerMotion, createPlayerStandIn, playerPose } from '../../src/render/player-motion';
import { createModelRig, STANDING, type Pose } from '../../src/render/rig';

const player = (more: Partial<PlayerState> = {}): PlayerState => ({ x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: true,
  groundY: 0, standY: 0, atEdge: false, bubble: 0, mode: 'free', t: 0, verb: null, hook: null, word: null, ...more });
const target = (state: PlayerState, phase = 0, pace = 0, landing = 0) => playerPose(state, phase, pace, landing, { ...STANDING });

describe('the player’s shared motion', () => {
  it('uses actual distance, freezes while paused, and never runs against a wall or on a ride', () => {
    const motion = createPlayerMotion(), state = player({ vx: RUN_SPEED });
    for (let i = 0; i < 90; i++) motion.update(state, 0, 1 / 60, null);
    expect(motion.update(state, 0, 1 / 60, null).legL).toBe(0);
    let reach = 0;
    for (let i = 1; i <= 30; i++) reach = Math.max(reach, Math.abs(motion.update(state, i * RUN_SPEED / 60, 1 / 60, null).legL));
    const running = { ...motion.update(state, RUN_SPEED * 31 / 60, 1 / 60, null) };
    expect(reach).toBeGreaterThan(0.3);
    expect(running.elbowR).toBeGreaterThan(0.6);
    for (let i = 0; i < 30; i++) expect(motion.update(state, RUN_SPEED * 31 / 60, 0, null)).toEqual(running);
    for (const mode of ['climb', 'slide', 'ledge', 'swing', 'ride', 'down', 'bubble'] as const) {
      const special = player({ mode, grounded: false });
      expect(target(special, 0, 0)).toEqual(target(special, 9, 1));
    }
  });

  it('keeps gait phase with distance at different frame rates and resets after a teleport', () => {
    const poses = [30, 60, 120].map((fps) => {
      const motion = createPlayerMotion(), state = player({ vx: RUN_SPEED });
      motion.update(state, 0, 1 / fps, null);
      let pose: Pose = { ...STANDING };
      for (let frame = 1; frame <= fps * 2; frame++) pose = motion.update(state, frame * RUN_SPEED / fps, 1 / fps, null);
      return { ...pose };
    });
    for (const p of poses) {
      expect(Math.abs(p.legL - poses[1]!.legL)).toBeLessThan(0.1);
      expect(Math.abs(p.kneeR - poses[1]!.kneeR)).toBeLessThan(0.1);
    }
    const motion = createPlayerMotion(), state = player({ vx: RUN_SPEED });
    motion.update(state, 0, 1 / 60, null);
    for (let i = 1; i < 30; i++) motion.update(state, i * RUN_SPEED / 60, 1 / 60, null);
    const teleported = motion.update(state, 90, 1 / 60, null);
    expect(teleported.legL).toBe(0); expect(teleported.kneeR).toBe(0);
    for (let i = 0; i < 30; i++) motion.update(state, 90, 1 / 60, null);
    expect(motion.update(state, 90, 1 / 60, null).legR).toBe(0);
  });

  it('distinguishes the rise, descent and soft landing, and gives scripted acting full priority', () => {
    const up = target(player({ grounded: false, vy: JUMP_SPEED }));
    const down = target(player({ grounded: false, vy: -JUMP_SPEED }));
    expect(up.kneeL).toBeGreaterThan(down.kneeL + 0.6);
    expect(up.legL).toBeGreaterThan(down.legL + 0.5);
    const motion = createPlayerMotion(), falling = player({ grounded: false, vy: -JUMP_SPEED });
    for (let i = 0; i < 30; i++) motion.update(falling, 0, 1 / 60, null);
    const before = { ...motion.update(falling, 0, 1 / 60, null) };
    let bent = 0;
    for (let i = 0; i < 8; i++) bent = Math.max(bent, motion.update(player(), 0, 1 / 60, null).kneeL);
    expect(bent).toBeGreaterThan(before.kneeL + 0.2);
    const scripted = { ...STANDING, armR: 2.2, kneeL: 1.1, seat: 1.5, bounce: 0.2 };
    expect(motion.update(player({ vx: RUN_SPEED }), 2, 1 / 60, scripted, 1)).toEqual(scripted);
    expect(motion.update(player(), 2, 0, null)).toEqual(scripted);
    for (let i = 0; i < 90; i++) motion.update(player(), 2, 1 / 60, null);
    const standing = motion.update(player(), 2, 1 / 60, null);
    expect(standing.armR).toBeLessThan(1e-5); expect(standing.kneeL).toBeLessThan(1e-5);
    expect(standing.seat).toBeNull();
  });
});

describe('the rounded public player', () => {
  it('keeps every boot corner above the floor through the gait, jump and landing, with one sole planted', () => {
    const body = createPlayerStandIn();
    body.group.position.set(7, 4, -2); body.group.rotation.y = 0.7; body.group.scale.set(2, 3, 2);
    const point = new Vector3();
    const poses = Array.from({ length: 40 }, (_, frame) => target(player(), frame * Math.PI / 20, 1));
    poses.push(target(player(), 0, 0, 1), target(player({ grounded: false, vy: JUMP_SPEED })), target(player({ grounded: false, vy: -JUMP_SPEED })));
    for (const p of poses) {
      body.pose(p); body.group.updateWorldMatrix(true, true);
      if (p.legR < 0) {
        const nearLeg = body.group.getObjectByName('player-hip-right')!, nearArm = body.group.getObjectByName('player-shoulder-right')!;
        expect(nearLeg.position.z).toBeGreaterThan(0); expect(nearArm.position.z).toBeGreaterThan(0);
        expect(nearLeg.rotation.z * nearArm.rotation.z).toBeLessThan(0);
      }
      let lowest = Infinity;
      for (const side of ['left', 'right']) {
        const foot = body.group.getObjectByName(`player-boot-${side}`) as Mesh;
        const vertices = foot.geometry.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) {
          point.fromBufferAttribute(vertices, i); foot.localToWorld(point); body.group.worldToLocal(point);
          lowest = Math.min(lowest, point.y);
        }
      }
      expect(lowest).toBeCloseTo(0, 6);
    }
  });

  it('places an explicit seat and bounce at the requested hip height, and bends knees opposite elbows', () => {
    const body = createPlayerStandIn();
    body.pose({ ...STANDING, seat: 1.5, bounce: 0.2 }); body.group.updateWorldMatrix(true, true);
    const hip = body.group.getObjectByName('player-hip-left')!;
    expect(hip.getWorldPosition(new Vector3()).y).toBeCloseTo(1.7 / 5.2, 6);
    body.pose({ ...STANDING, elbowL: 0.8, kneeL: 0.8 }); body.group.updateWorldMatrix(true, true);
    const elbow = body.group.getObjectByName('player-elbow-left')!;
    const knee = body.group.getObjectByName('player-knee-left')!;
    const hand = elbow.localToWorld(new Vector3(0, -0.145, 0));
    const ankle = knee.localToWorld(new Vector3(0, -0.21, 0));
    expect(hand.x).toBeGreaterThan(elbow.getWorldPosition(new Vector3()).x + 0.08);
    expect(ankle.x).toBeLessThan(knee.getWorldPosition(new Vector3()).x - 0.1);
  });
});

describe('the player’s existing named-bone adapter', () => {
  it('uses the shared local-X-forward contract, preserves rest rotations, and grounds feet under a transformed parent', () => {
    const model = new Group();
    const limbs: { upper: Bone; lower: Bone; end: Bone }[] = [];
    for (const [side, x] of [['l', 0.08], ['r', -0.08]] as const) {
      for (const leg of [true, false]) {
        const upper = new Bone(), lower = new Bone(), end = new Bone();
        upper.name = `${leg ? 'thigh' : 'upperarm'}_${side}`;
        lower.name = `${leg ? 'calf' : 'lowerarm'}_${side}`;
        end.name = `${leg ? 'foot' : 'hand'}_${side}`;
        upper.position.set(x, leg ? 0.4 : 0.65, 0);
        // As Blender exports them: half a turn round z, so local +Y runs down the limb and local +Z still faces
        // the body's front. A positive turn round local X then brings the limb forward.
        upper.rotation.z = Math.PI;
        lower.position.y = leg ? 0.19 : 0.145; end.position.y = leg ? 0.21 : 0.145;
        lower.add(end); upper.add(lower); model.add(upper); limbs.push({ upper, lower, end });
      }
    }
    model.rotation.y = Math.PI / 2; // The public player's enclosing group faces +X.
    const rig = createModelRig(model, 1), parent = new Group(); parent.add(rig.group);
    parent.position.set(5, 3, -2); parent.rotation.y = 0.8; parent.scale.setScalar(2.4);
    rig.pose({ ...STANDING, armL: 0, armR: 0, elbowL: 0, elbowR: 0 }); parent.updateWorldMatrix(true, true);
    const hand = model.getObjectByName('hand_l')!;
    const before = rig.group.worldToLocal(hand.getWorldPosition(new Vector3()));
    rig.pose({ ...STANDING, armL: 0.7, elbowL: 0.4, legL: 0.6, kneeL: 0.8 }); parent.updateWorldMatrix(true, true);
    const reaching = rig.group.worldToLocal(hand.getWorldPosition(new Vector3()));
    expect(reaching.x).toBeGreaterThan(before.x + 0.15);
    // The thigh brings its knee forward, and the knee bends the foot back behind it, in the model's own space.
    const inModel = (name: string) => model.worldToLocal(model.getObjectByName(name)!.getWorldPosition(new Vector3()));
    expect(inModel('calf_l').z).toBeGreaterThan(inModel('thigh_l').z + 0.1);
    expect(inModel('foot_l').z).toBeLessThan(inModel('calf_l').z - 0.03);
    expect(inModel('lowerarm_l').z).toBeGreaterThan(inModel('upperarm_l').z + 0.05);
    const feet = ['foot_l', 'foot_r'].map((name) => rig.group.worldToLocal(model.getObjectByName(name)!.getWorldPosition(new Vector3())).y);
    expect(Math.min(...feet)).toBeCloseTo(0, 6);
    const posed = limbs[0]!.upper.quaternion.clone();
    rig.pose({ ...STANDING, armL: 0.7, elbowL: 0.4, legL: 0.6, kneeL: 0.8 });
    expect(limbs[0]!.upper.quaternion.angleTo(posed)).toBeLessThan(1e-7);
    rig.pose({ ...STANDING, armL: 0, armR: 0, elbowL: 0, elbowR: 0 });
    const rest = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI);
    for (const limb of limbs) expect(limb.upper.quaternion.angleTo(rest)).toBeLessThan(1e-7);
  });
});
