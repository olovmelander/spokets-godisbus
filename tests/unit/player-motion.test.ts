import { Bone, Group, Mesh, Quaternion, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { CLIMB_SPEED, JUMP_SPEED, RUN_SPEED, WALK_SPEED } from '../../src/sim/constants';
import type { PlayerState } from '../../src/sim/types';
import { Sim } from '../../src/sim/sim';
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
    for (const mode of ['slide', 'ledge', 'swing', 'ride', 'down', 'bubble'] as const) {
      const special = player({ mode, grounded: false });
      expect(target(special, 0, 0)).toEqual(target(special, 9, 1));
    }
  });

  it('extends the supporting leg, folds only the recovering foot, and gives running more reach than walking', () => {
    const walk = target(player(), 0, WALK_SPEED / RUN_SPEED), run = target(player(), 0, 1);
    expect(walk.kneeL).toBeGreaterThan(0.2); expect(walk.kneeR).toBe(0);
    expect(run.kneeL).toBeGreaterThan(walk.kneeL + 0.5); expect(run.kneeR).toBe(0);
    const opposite = target(player(), Math.PI, 1);
    expect(opposite.kneeL).toBe(0); expect(opposite.kneeR).toBeCloseTo(run.kneeL);
    const walkReach = target(player(), Math.PI / 2, WALK_SPEED / RUN_SPEED);
    const runReach = target(player(), Math.PI / 2, 1);
    expect(runReach.legL).toBeGreaterThan(walkReach.legL + 0.3);
    expect(runReach.armL).toBeLessThan(0); expect(runReach.armR).toBeGreaterThan(0);
    expect(runReach.elbowR).toBeGreaterThan(runReach.elbowL);
  });

  it('leans into acceleration, plants to stop, then settles without marching in place', () => {
    const motion = createPlayerMotion(), state = player();
    let x = 0, startingLean = 0;
    motion.update(state, x, 1 / 60, null);
    for (let frame = 1; frame <= 60; frame++) {
      x += RUN_SPEED * Math.min(1, frame / 18) / 60;
      const p = motion.update(state, x, 1 / 60, null);
      if (frame <= 24) startingLean = Math.max(startingLean, p.lean);
    }
    const cruising = { ...motion.update(state, x + RUN_SPEED / 60, 1 / 60, null) };
    x += RUN_SPEED / 60;
    expect(startingLean).toBeGreaterThan(cruising.lean + 0.045);
    let stoppingLean = Infinity, planted = 0;
    for (let frame = 1; frame <= 15; frame++) {
      x += RUN_SPEED * Math.max(0, 1 - frame / 9) / 60;
      const p = motion.update(state, x, 1 / 60, null);
      stoppingLean = Math.min(stoppingLean, p.lean);
      if (frame >= 9) planted = Math.max(planted, Math.min(p.kneeL, p.kneeR));
      expect(p.bounce).toBe(0); expect(p.seat).toBeNull();
    }
    expect(stoppingLean).toBeLessThan(-0.03); expect(planted).toBeGreaterThan(0.07);
    for (let frame = 0; frame < 90; frame++) motion.update(state, x, 1 / 60, null);
    const settled = motion.update(state, x, 1 / 60, null);
    expect(Math.abs(settled.legL)).toBeLessThan(1e-7); expect(settled.kneeR).toBeLessThan(1e-7);
  });

  it('plants for a reversal and directs the weight shift into the new facing, with quieter reduced motion', () => {
    const reverse = (facing: 1 | -1, calm: boolean) => {
      const motion = createPlayerMotion(), state = player();
      let x = 0;
      motion.update(state, x, 1 / 60, null, 0, calm);
      for (let frame = 0; frame < 45; frame++) {
        x += RUN_SPEED / 60;
        motion.update(state, x, 1 / 60, null, 0, calm);
      }
      state.facing = facing;
      for (let frame = 1; frame <= 9; frame++) {
        x += RUN_SPEED * (1 - frame / 9) / 60;
        motion.update(state, x, 1 / 60, null, 0, calm);
      }
      return { ...motion.update(state, x, 0, null, 0, calm) };
    };
    const stopping = reverse(1, false), turning = reverse(-1, false), calm = reverse(-1, true);
    expect(turning.lean).toBeGreaterThan(stopping.lean + 0.15);
    expect(turning.nod).toBeLessThan(stopping.nod);
    expect(turning.lean).toBeGreaterThan(calm.lean + 0.04);
    expect(calm.kneeL).toBeCloseTo(turning.kneeL, 8); expect(calm.kneeR).toBeCloseTo(turning.kneeR, 8);
  });

  it('takes off with the leg already leading instead of choosing the same knee for every jump', () => {
    const jump = (frames: number) => {
      const motion = createPlayerMotion(), state = player();
      let x = 0;
      motion.update(state, x, 1 / 60, null);
      for (let frame = 0; frame < frames; frame++) {
        x += RUN_SPEED / 60;
        motion.update(state, x, 1 / 60, null);
      }
      const before = { ...motion.update(state, x, 0, null) };
      state.grounded = false; state.vy = JUMP_SPEED;
      for (let frame = 0; frame < 12; frame++) {
        x += RUN_SPEED / 60;
        motion.update(state, x, 1 / 60, null);
      }
      const rising = { ...motion.update(state, x, 0, null) };
      expect(Math.sign(rising.legL - rising.legR)).toBe(Math.sign(before.legL - before.legR));
      expect(Math.sign(rising.kneeL - rising.kneeR)).toBe(Math.sign(before.legL - before.legR));
      expect(motion.update(state, x, 0, null)).toEqual(rising);
      return rising;
    };
    expect(jump(8).legL).toBeGreaterThan(jump(18).legL + 0.5);
  });

  it('steps out of carried modes without adding a false landing impact', () => {
    for (const mode of ['climb', 'slide', 'ledge', 'ride', 'bubble', 'down'] as const) {
      const motion = createPlayerMotion(), state = player({ mode, grounded: false, t: 1 });
      for (let frame = 0; frame < 45; frame++) motion.update(state, 0, 1 / 60, null);
      const before = { ...motion.update(state, 0, 0, null) };
      const released = motion.update(player(), 0, 1 / 60, null);
      expect(released.kneeL).toBeCloseTo(before.kneeL * Math.exp(-18 / 60), 8);
      expect(released.kneeR).toBeCloseTo(before.kneeR * Math.exp(-18 / 60), 8);
    }
  });

  it('reads the rise and fall of an actual assisted jump, then absorbs its landing', () => {
    const sim = new Sim({ id: 'assisted-motion', spawn: { x: 0, y: .01 }, goalX: 100,
      ground: [{ x: -6, y: 0 }, { x: 12, y: 0 }], candy: [],
      jumps: [{ at: { x: 2, y: 0 }, dir: 1, land: { x: 4.5, y: 0 } }] }, { easyJumps: true });
    const motion = createPlayerMotion(), samples: { state: PlayerState; pose: Pose; vy: number }[] = [];
    let previous = sim.curr.y;
    for (let frame = 0; frame < 150; frame++) {
      for (let step = 0; step < 2; step++) sim.step({ x: frame < 70 ? 1 : 0, y: 0, hop: false, hopHeld: false, act: false });
      const pose = { ...motion.update(sim.curr, sim.curr.x, 1 / 60, null) };
      samples.push({ state: { ...sim.curr }, pose, vy: (sim.curr.y - previous) * 60 });
      previous = sim.curr.y;
      expect(motion.update(sim.curr, sim.curr.x, 0, null)).toEqual(pose);
    }
    const rising = samples.filter(s => s.state.mode === 'fly' && s.vy > 3);
    const falling = samples.filter(s => s.state.mode === 'fly' && s.vy < -3);
    expect(rising.length).toBeGreaterThan(4); expect(falling.length).toBeGreaterThan(4);
    expect([...rising, ...falling].every(s => s.state.vy === 0)).toBe(true);
    const fold = (p: Pose) => Math.max(p.kneeL, p.kneeR);
    expect(Math.max(...rising.map(s => fold(s.pose)))).toBeGreaterThan(Math.min(...falling.map(s => fold(s.pose))) + .25);
    const landed = samples.findIndex((s, i) => i > 0 && s.state.grounded && samples[i - 1]!.state.mode === 'fly');
    expect(landed).toBeGreaterThan(0);
    expect(Math.max(...samples.slice(landed, landed + 5).map(s => Math.min(s.pose.kneeL, s.pose.kneeR))))
      .toBeGreaterThan(Math.min(samples[landed - 1]!.pose.kneeL, samples[landed - 1]!.pose.kneeR) + .15);
  });

  it('keeps both arms raised through fast real swings at slower frame rates', () => {
    for (const fps of [20, 30, 60]) {
      const sim = new Sim({ id: 'swing-motion', spawn: { x: -.2, y: .01 }, goalX: 100,
        ground: [{ x: -8, y: 0 }, { x: 0, y: 0 }, { x: 0, y: -6 }, { x: 5, y: -6 }, { x: 5, y: 0 }, { x: 14, y: 0 }], candy: [],
        hooks: [{ x: 2.3, y: 3.5, length: 3 }] });
      const input = { x: 0, y: 0, hop: false, hopHeld: false, act: false };
      for (let step = 0; step < 24; step++) sim.step(input);
      sim.step({ ...input, act: true });
      const motion = createPlayerMotion(); let fastest = 0;
      for (let frame = 0; frame < fps * 8; frame++) {
        for (let step = 0; step < 120 / fps; step++) sim.step({ ...input, x: sim.curr.vx < -.05 ? -1 : 1 });
        fastest = Math.max(fastest, Math.abs(sim.curr.vx));
        const pose = motion.update(sim.curr, sim.curr.x, 1 / fps, null);
        if (frame > fps) { expect(pose.armL).toBeCloseTo(2.9, 5); expect(pose.armR).toBeCloseTo(2.9, 5); }
      }
      expect(fastest).toBeGreaterThan(8.5);
      const restored = motion.update(player({ vx: RUN_SPEED }), 90, 1 / fps, null);
      expect(restored.legL).toBe(0); expect(restored.armL).toBeLessThan(.02);
    }
  });

  it('climbs hand over hand from vertical travel, and holds its grip when stopped or paused', () => {
    const motion = createPlayerMotion(), state = player({ mode: 'climb', grounded: false, vy: CLIMB_SPEED });
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null);
    const blocked = { ...motion.update(state, 0, 1 / 60, null) };
    expect(blocked.armL).toBeCloseTo(blocked.armR, 6);
    let separation = 0;
    for (let frame = 0; frame < 45; frame++) {
      state.y += CLIMB_SPEED / 60;
      const p = motion.update(state, 0, 1 / 60, null);
      separation = Math.max(separation, Math.abs(p.armL - p.armR));
    }
    expect(separation).toBeGreaterThan(0.4);
    const climbing = { ...motion.update(state, 0, 0, null) };
    for (let frame = 0; frame < 30; frame++) expect(motion.update(state, 0, 0, null)).toEqual(climbing);
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null);
    const holding = { ...motion.update(state, 0, 1 / 60, null) };
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null);
    const still = motion.update(state, 0, 1 / 60, null);
    expect(still.armL).toBeCloseTo(holding.armL, 6); expect(still.kneeR).toBeCloseTo(holding.kneeR, 6);
  });

  it('pulls over a ledge in stages, braces for a slide, and looks down at a protected edge', () => {
    const hanging = target(player({ mode: 'ledge', grounded: false, t: 0 }));
    const pulling = target(player({ mode: 'ledge', grounded: false, t: 0.5 }));
    const standing = target(player({ mode: 'ledge', grounded: false, t: 1 }));
    expect(hanging.armL).toBeGreaterThan(2.5);
    expect(pulling.armL).toBeLessThan(hanging.armL); expect(pulling.kneeL).toBeGreaterThan(hanging.kneeL);
    expect(pulling.lean).toBeGreaterThan(0.2);
    expect(standing.armL).toBe(0); expect(standing.kneeL).toBe(0); expect(standing.lean).toBe(0);
    const slide = target(player({ mode: 'slide', grounded: false }));
    expect(slide.lean).toBeLessThan(0); expect(slide.nod).toBeGreaterThan(0);
    const edge = target(player({ atEdge: true }));
    expect(edge.nod).toBeGreaterThan(0.2); expect(edge.spread).toBeGreaterThan(0.1);
    expect(edge).toEqual(target(player({ atEdge: true }), 5, 1));
  });

  it('absorbs a harder fall more deeply than a small step down without lifting the planted sole', () => {
    const land = (speed: number) => {
      const motion = createPlayerMotion(), state = player({ grounded: false, vy: -speed });
      for (let frame = 0; frame < 30; frame++) motion.update(state, 0, 1 / 60, null);
      const before = motion.update(state, 0, 1 / 60, null).kneeL;
      let bend = 0;
      for (let frame = 0; frame < 20; frame++) {
        const p = motion.update(player(), 0, 1 / 60, null);
        bend = Math.max(bend, p.kneeL);
        expect(p.bounce).toBe(0); expect(p.seat).toBeNull();
      }
      return { bend, compression: bend - before };
    };
    const hard = land(JUMP_SPEED), soft = land(JUMP_SPEED * 0.15);
    expect(hard.bend).toBeGreaterThan(soft.bend + 0.1);
    expect(hard.compression).toBeGreaterThan(soft.compression + 0.25);
  });

  it('breathes quietly while idle, freezes when paused, and settles still with reduced motion', () => {
    const motion = createPlayerMotion(), state = player();
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null);
    const first = { ...motion.update(state, 0, 1 / 60, null) };
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null);
    const later = { ...motion.update(state, 0, 1 / 60, null) };
    expect(Math.abs(later.nod - first.nod)).toBeGreaterThan(0.015);
    expect(later.legL).toBe(0); expect(later.bounce).toBe(0);
    expect(motion.update(state, 0, 0, null)).toEqual(later);
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null, 0, true);
    const calm = { ...motion.update(state, 0, 1 / 60, null, 0, true) };
    for (let frame = 0; frame < 90; frame++) motion.update(state, 0, 1 / 60, null, 0, true);
    const still = motion.update(state, 0, 1 / 60, null, 0, true);
    expect(still.nod).toBeCloseTo(calm.nod, 8); expect(still.turn).toBeCloseTo(calm.turn, 8);
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
  it('closes both hands onto a swing grip and restores the authored arms on release', () => {
    const body = createPlayerStandIn(), p = target(player({ mode: 'swing', grounded: false }));
    body.group.position.set(4, 2, -.1); body.group.rotation.set(0, -.35, .9, 'ZYX'); body.group.scale.setScalar(2);
    body.pose(p);
    const before = ['left', 'right'].map(side => body.group.getObjectByName(`player-shoulder-${side}`)!.quaternion.clone());
    const a = body.hand(0, new Vector3()), b = body.hand(1, new Vector3()), centre = a.clone().add(b).multiplyScalar(.5);
    const up = new Vector3(-Math.sin(.9), Math.cos(.9), 0);
    centre.addScaledVector(up, -.16);
    body.reach(0, centre); expect(body.hand(0, a).distanceTo(centre)).toBeLessThan(1e-6);
    centre.addScaledVector(up, -.12);
    body.reach(1, centre); expect(body.hand(1, b).distanceTo(centre)).toBeLessThan(1e-6);
    body.pose(p);
    for (const [i, side] of ['left', 'right'].entries()) {
      expect(body.group.getObjectByName(`player-shoulder-${side}`)!.quaternion.angleTo(before[i]!)).toBeLessThan(1e-7);
    }
  });

  it('keeps every boot corner above the floor through the gait, jump and landing, with one sole planted', () => {
    const body = createPlayerStandIn();
    body.group.position.set(7, 4, -2); body.group.rotation.y = 0.7; body.group.scale.set(2, 3, 2);
    const point = new Vector3();
    const poses = Array.from({ length: 40 }, (_, frame) => target(player(), frame * Math.PI / 20, 1));
    poses.push(target(player(), 0, 0, 1), target(player({ atEdge: true })), target(player({ grounded: false, vy: JUMP_SPEED })), target(player({ grounded: false, vy: -JUMP_SPEED })));
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
