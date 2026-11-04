import { Bone, BoxGeometry, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import { ADVENTURE2, BONUS, STORY, loadAdventure2 } from '../../src/content/chapters';
import type { PlayerState } from '../../src/sim/types';
import { createFamilyMotion, WAITING, type Waiting } from '../../src/render/family-motion';
import { createGhostMotion, type GhostMotionFrame } from '../../src/render/ghost-model';
import { createPlayerMotion, createPlayerStandIn, IDLES, type IdleAct } from '../../src/render/player-motion';
import { createModelRig, createRehearsalRig, createSway, galeOf, STANDING, type Pose } from '../../src/render/rig';
import { setWind, windAt } from '../../src/render/wind';

const player = (more: Partial<PlayerState> = {}): PlayerState => ({ x: 0, y: 0, vx: 0, vy: 0, facing: 1, grounded: true,
  groundY: 0, standY: 0, atEdge: false, bubble: 0, mode: 'free', t: 0, verb: null, hook: null, word: null, ...more });
const JOINTS = ['lean', 'nod', 'turn', 'armL', 'armR', 'elbowL', 'elbowR', 'legL', 'legR', 'kneeL', 'kneeR', 'spread'] as const;

/** The stand-in's two boots, in its group's space: the lowest corner of each, and where its toe meets the floor. */
function boots(body: ReturnType<typeof createPlayerStandIn>) {
  body.group.updateMatrixWorld(true);
  return ['left', 'right'].map((side) => {
    const boot = body.group.getObjectByName(`player-boot-${side}`) as Mesh;
    const positions = boot.geometry.getAttribute('position'), point = new Vector3();
    let low = Infinity;
    for (let i = 0; i < positions.count; i++) low = Math.min(low, point.fromBufferAttribute(positions, i).applyMatrix4(boot.matrixWorld).y);
    const toe = boot.localToWorld(new Vector3(.1, -.045, 0));
    return { low, toe };
  });
}

describe('Elof’s idles while he stands', () => {
  it('plays every idle in a shuffled order, never moving a foot from its place or the simulation', () => {
    const motion = createPlayerMotion(), body = createPlayerStandIn(), state = player({ x: 4, y: 2 });
    const before = structuredClone(state);
    body.pose(motion.update(state, 4, 1 / 60, null));
    const rest = boots(body);
    const order: IdleAct[] = [];
    let previous: Pose = { ...STANDING }, turn = 0, arm = 0, heel = 0;
    for (let frame = 0; frame < 60 * 80; frame++) {
      const pose = motion.update(state, 4, 1 / 60, null);
      body.pose(pose);
      if (motion.idling && motion.idling !== order[order.length - 1]) order.push(motion.idling);
      if (frame % 3 === 0) {
        const now = boots(body);
        expect(Math.min(now[0]!.low, now[1]!.low), `frame ${frame}`).toBeCloseTo(0, 6);
        for (const [i, boot] of now.entries()) {
          expect(Math.abs(boot.toe.x - rest[i]!.toe.x), `toe ${i} frame ${frame}`).toBeLessThan(.012);
          expect(boot.low, `boot ${i} frame ${frame}`).toBeLessThan(.015);
        }
      }
      for (const joint of JOINTS) expect(Math.abs(pose[joint] - previous[joint]), `${joint} frame ${frame}`).toBeLessThan(.2);
      expect(pose.bounce).toBe(0); expect(pose.seat).toBeNull();
      turn = Math.max(turn, Math.abs(pose.turn)); arm = Math.max(arm, pose.armR, pose.armL); heel = Math.max(heel, pose.kneeR);
      previous = { ...pose };
    }
    expect(new Set(order)).toEqual(new Set(Object.keys(IDLES)));
    const rounds = order.filter((act) => act !== 'stretch');
    for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
    expect(rounds.slice(0, 5)).not.toEqual(rounds.slice(5, 10));
    expect(turn).toBeGreaterThan(.4); expect(arm).toBeGreaterThan(2.5); expect(heel).toBeGreaterThan(.15);
    expect(state).toEqual(before);
  });

  it('waits before the first idle, and starts again from quiet when he has moved', () => {
    const motion = createPlayerMotion(), state = player();
    for (let frame = 0; frame < 60 * 3.3; frame++) {
      motion.update(state, 0, 1 / 60, null);
      expect(motion.idling).toBeNull();
    }
    for (let frame = 0; frame < 60 * 2; frame++) motion.update(state, 0, 1 / 60, null);
    expect(motion.idling).not.toBeNull();
    motion.update(state, .05, 1 / 60, null);
    expect(motion.idling).toBeNull();
  });

  it('leans into a strong wind with an arm up, braced on both feet, and not into a light one', () => {
    for (const [wind, facing] of [[-5, 1], [5, -1], [5, 1]] as const) {
      const motion = createPlayerMotion(), body = createPlayerStandIn(), state = player({ facing });
      let pose: Pose = { ...STANDING };
      for (let frame = 0; frame < 120; frame++) body.pose(pose = motion.update(state, 0, 1 / 60, null, 0, false, wind));
      const into = -Math.sign(wind) * facing > 0;
      if (into) expect(pose.lean).toBeGreaterThan(.12); else expect(pose.lean).toBeLessThan(-.03);
      expect(facing > 0 ? pose.armR : pose.armL).toBeGreaterThan(2);
      const feet = boots(body);
      expect(Math.min(feet[0]!.low, feet[1]!.low)).toBeCloseTo(0, 6);
      expect(Math.max(feet[0]!.low, feet[1]!.low)).toBeLessThan(.015);
    }
    // Still air, and a breath of wind passing along the path (to the right) outside a storm: no bracing.
    for (const [wind, facing] of [[1, 1], [-1, -1], [3, -1], [3, 1]] as const) {
      const light = createPlayerMotion();
      let air: Pose = { ...STANDING };
      for (let frame = 0; frame < 120; frame++) air = light.update(player({ facing }), 0, 1 / 60, null, 0, false, wind);
      expect(Math.max(air.armR, air.armL), `${wind} ${facing}`).toBeLessThan(.1);
    }
  });

  it('holds quite still with reduced motion, in any wind', () => {
    const motion = createPlayerMotion(), state = player();
    for (let frame = 0; frame < 120; frame++) motion.update(state, 0, 1 / 60, null, 0, true, -6);
    const held = { ...motion.update(state, 0, 1 / 60, null, 0, true, -6) };
    for (let frame = 0; frame < 60 * 40; frame++) {
      const pose = motion.update(state, 0, 1 / 60, null, 0, true, frame % 2 ? -6 : 6);
      for (const joint of JOINTS) expect(pose[joint]).toBeCloseTo(held[joint], 8);
      expect(motion.idling).toBeNull(); expect(motion.ruffle).toBe(0);
    }
    expect(held.legL).toBeCloseTo(0, 8); expect(held.kneeR).toBeCloseTo(0, 8); expect(held.turn).toBeCloseTo(0, 8);
  });
});

describe('the wind in the characters’ details', () => {
  it('follows the wind with a spring: lag, a little overshoot, more in a gust, and rest at once when still', () => {
    const sway = createSway();
    let peak = 0, angle = 0;
    for (let frame = 0; frame < 180; frame++) peak = Math.max(peak, angle = sway.step(3, 1 / 60, false));
    expect(angle).toBeCloseTo(.21, 2); expect(peak).toBeGreaterThan(.22);
    const gust = createSway();
    for (let frame = 0; frame < 180; frame++) gust.step(-4, 1 / 60, false);
    expect(gust.step(-4, 1 / 60, false)).toBeLessThan(-angle - .05);
    expect(sway.step(3, 0, false)).toBe(sway.step(3, 0, false));
    expect(sway.step(3, 1 / 60, true)).toBe(0);
    expect(sway.step(0, 1 / 60, false)).toBe(0);
  });

  it('reads windAt at each one’s own x: a passing breath reaches a figure further on later, and a gust only where it blows', () => {
    const near = createSway(), far = createSway();
    let nearPeak = { at: 0, angle: -Infinity }, farPeak = { at: 0, angle: -Infinity };
    for (let frame = 0; frame < 6.5 * 60; frame++) {
      const clock = 20 + frame / 60;
      setWind(clock, false, true, null);
      const a = near.step(windAt(0), 1 / 60, false), b = far.step(windAt(18), 1 / 60, false);
      if (a > nearPeak.angle) nearPeak = { at: clock, angle: a };
      if (b > farPeak.angle) farPeak = { at: clock, angle: b };
    }
    const lag = ((farPeak.at - nearPeak.at) % 6.5 + 6.5) % 6.5;
    expect(lag).toBeGreaterThan(1.2); expect(lag).toBeLessThan(2.8);
    const inGust = createSway(), outside = createSway();
    for (let frame = 0; frame < 120; frame++) {
      setWind(40 + frame / 60, false, false, { from: 0, to: 10, blow: 1 });
      inGust.step(windAt(5), 1 / 60, false); outside.step(windAt(30), 1 / 60, false);
    }
    expect(inGust.step(windAt(5), 1 / 60, false)).toBeLessThan(-.17);
    expect(Math.abs(outside.step(windAt(30), 1 / 60, false))).toBeLessThan(.12);
    setWind(40, true, true, null);
    expect(windAt(5)).toBe(0);
  });

  it('lays Elof’s fringe downwind, ruffles it under a hand, and rests it exactly with reduced motion', () => {
    const body = createPlayerStandIn(), fringe = body.group.getObjectByName('player-head')!.parent!.children[2]!;
    const rest = { z: fringe.rotation.z, x: fringe.position.x, y: fringe.position.y };
    body.group.updateMatrixWorld(true);
    for (let frame = 0; frame < 120; frame++) body.breeze(4, 1 / 60, false);
    expect(fringe.rotation.z).toBeLessThan(rest.z - .2);
    body.group.rotation.y = Math.PI; body.group.updateMatrixWorld(true);
    for (let frame = 0; frame < 120; frame++) body.breeze(4, 1 / 60, false);
    expect(fringe.rotation.z).toBeGreaterThan(rest.z + .2);
    body.breeze(0, 1 / 60, false, 1);
    const ruffled = fringe.rotation.z;
    body.breeze(0, 1 / 60, false, -1);
    expect(Math.abs(fringe.rotation.z - ruffled)).toBeGreaterThan(.3);
    body.breeze(4, 1 / 60, true, 1);
    expect(fringe.rotation.z).toBe(rest.z);
    expect(fringe.position.x).toBeCloseTo(rest.x, 12); expect(fringe.position.y).toBeCloseTo(rest.y, 12);
  });

  it('swings the rehearsal hair downwind and lifts a cap’s brim in a headwind, without another draw', () => {
    const part = (rig: ReturnType<typeof createRehearsalRig>) => {
      const m = new Matrix4();
      (rig.group.children[0] as InstancedMesh).getMatrixAt(4, m);
      return new Vector3(0, -.5, .5).applyMatrix4(m);
    };
    const mamma = createRehearsalRig('mamma');
    mamma.group.updateMatrixWorld(true);
    const hair = part(mamma);
    for (let frame = 0; frame < 120; frame++) mamma.breeze!(4, 1 / 60, false);
    expect(part(mamma).x).toBeGreaterThan(hair.x + .1);
    mamma.pose({ ...STANDING, nod: .2 });
    const nodded = part(mamma);
    mamma.breeze!(4, 1 / 60, true);
    expect(part(mamma).distanceTo(nodded)).toBeGreaterThan(.05);
    mamma.pose({ ...STANDING });
    expect(part(mamma).distanceTo(hair)).toBeLessThan(1e-9);
    const pappa = createRehearsalRig('pappa');
    pappa.group.rotation.y = -Math.PI / 2; pappa.group.updateMatrixWorld(true);
    const brim = part(pappa);
    for (let frame = 0; frame < 120; frame++) pappa.breeze!(4, 1 / 60, false);
    expect(part(pappa).y).toBeGreaterThan(brim.y + .02);
    for (const who of ['mamma', 'pappa', 'moa', 'bertil'] as const) {
      const rig = createRehearsalRig(who);
      expect(rig.group.children.filter((child) => child instanceof Mesh)).toHaveLength(1);
      expect((rig.group.children[0] as InstancedMesh).count).toBe(17);
    }
    let meshes = 0;
    createPlayerStandIn().group.traverse((node) => { if (node instanceof Mesh) meshes++; });
    expect(meshes).toBe(15);
  });

  it('bends a model’s named hair, brim and hem bones downwind about their roots, and rests them exactly', () => {
    const model = new Group(), head = new Bone(), hair = new Bone(), tip = new Bone(), brim = new Bone(), end = new Object3D();
    head.name = 'Head'; hair.name = 'hair_01'; tip.name = 'hair_02'; brim.name = 'cap_brim';
    head.position.y = 4; hair.position.set(0, .3, -.3); hair.rotation.z = Math.PI; tip.position.y = .4; end.position.y = .4;
    brim.position.set(0, .6, .3); brim.rotation.x = Math.PI / 2;
    tip.add(end); hair.add(tip); head.add(hair, brim); model.add(head);
    const rig = createModelRig(model, 5.2), parent = new Group();
    parent.add(rig.group); parent.rotation.y = .7; parent.scale.setScalar(2);
    parent.updateMatrixWorld(true);
    const rests = [hair, tip, brim].map((bone) => bone.quaternion.clone());
    const before = end.getWorldPosition(new Vector3()), brimBefore = brim.localToWorld(new Vector3(0, 1, 0));
    for (let frame = 0; frame < 120; frame++) { rig.breeze!(4, 1 / 60, false); parent.updateMatrixWorld(true); }
    expect(end.getWorldPosition(new Vector3()).x).toBeGreaterThan(before.x + .1);
    expect(brim.localToWorld(new Vector3(0, 1, 0)).y).toBeGreaterThan(brimBefore.y + .05);
    rig.breeze!(4, 1 / 60, true);
    [hair, tip, brim].forEach((bone, i) => expect(bone.quaternion.angleTo(rests[i]!)).toBeLessThan(1e-9));
    expect(() => createModelRig(new Group(), 1).breeze!(3, 1 / 60, false)).not.toThrow();
  });
});

describe('the family while they wait', () => {
  const look = { ahead: 8, up: .8 };

  it('shift their weight, glance about, fold their arms and look at the sky, on their feet and smoothly', () => {
    for (const who of ['mamma', 'pappa', 'moa', 'bertil'] as const) {
      const motion = createFamilyMotion(who, 84.8, ''), rig = createRehearsalRig(who);
      const mesh = rig.group.children[0] as InstancedMesh, matrix = new Matrix4(), point = new Vector3();
      const seen = new Set<Waiting>();
      let previous = { ...motion.update(1 / 60, 0, 0, .3, null, false, look) }, up = 0;
      for (let frame = 1; frame < 60 * 70; frame++) {
        const pose = motion.update(1 / 60, frame / 60, 0, .3, null, false, look);
        if (motion.waiting) seen.add(motion.waiting);
        for (const joint of JOINTS) expect(Math.abs(pose[joint] - previous[joint]), `${who} ${joint} ${frame}`).toBeLessThan(.1);
        up = Math.min(up, pose.nod);
        if (frame % 7 === 0) {
          rig.pose(pose);
          let bottom = Infinity;
          for (const foot of [13, 16]) {
            mesh.getMatrixAt(foot, matrix);
            for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) bottom = Math.min(bottom, point.set(x, y, z).applyMatrix4(matrix).y);
          }
          expect(bottom).toBeCloseTo(0, 5);
        }
        expect(pose.bounce).toBe(0);
        previous = { ...pose };
      }
      expect(seen, who).toEqual(new Set(Object.keys(WAITING)));
      expect(up, who).toBeLessThan(-.35);
    }
  });

  it('let a greeting take over smoothly, keep their gaze on him, and wait quite still with reduced motion', () => {
    const motion = createFamilyMotion('pappa', 30, '');
    let frame = 0;
    while (!motion.waiting && frame < 60 * 20) motion.update(1 / 60, frame++ / 60, 0, .3, null, false, look);
    for (let i = 0; i < 40; i++) motion.update(1 / 60, frame++ / 60, 0, .3, null, false, look);
    expect(motion.waiting).not.toBeNull();
    let previous = { ...motion.update(1 / 60, frame / 60, 0, .3, null, false, look) };
    for (let i = 0; i < 90; i++) {
      const pose = motion.update(1 / 60, frame++ / 60, Math.max(0, 1.8 - i / 60), .3, null, false, look);
      for (const joint of JOINTS) expect(Math.abs(pose[joint] - previous[joint]), `${joint} ${i}`).toBeLessThan(.3);
      previous = { ...pose };
    }
    expect(motion.waiting).toBeNull();
    const calm = createFamilyMotion('moa', 30, '');
    const held = { ...calm.update(.1, 0, 0, .3, null, true, look) };
    for (let i = 1; i < 600; i++) expect(calm.update(.1, i / 10, 0, .3, null, true, look)).toEqual(held);
    expect(calm.waiting).toBeNull();
  });
});

function toyGhost() {
  const model = new Group();
  for (const [i, z] of [-.1, .1].entries()) {
    const shoe = new Mesh(new BoxGeometry(.24, .1, .14), new MeshBasicMaterial());
    shoe.name = i === 0 ? 'footL' : 'footR'; shoe.position.set(.05, .05, z * 1.3);
    model.add(shoe);
  }
  const hem = new Object3D(); hem.name = 'hem'; hem.position.y = .3; model.add(hem);
  return { model, hem };
}
const ghostFrame = (more: Partial<GhostMotionFrame> = {}): GhostMotionFrame => ({ dt: 1 / 60, clock: 0, hop: null, calm: false, awake: true, staged: false, ...more });

describe('the ghost’s idles', () => {
  it('bobs and looks about between its taps, and cocks its head at Elof when he is near', () => {
    const { model } = toyGhost(), motion = createGhostMotion(model, true);
    let bob = 0, left = 0, right = 0, roll = 0, previous = { bob: 0, look: 0, pitch: 0, roll: 0 };
    for (let frame = 0; frame < 60 * 64; frame++) {
      const idle = { ...motion.update(ghostFrame({ clock: frame / 60, elof: 12 })) };
      bob = Math.max(bob, idle.bob); left = Math.max(left, idle.look); right = Math.min(right, idle.look);
      roll = Math.max(roll, Math.abs(idle.roll));
      expect(idle.bob).toBeGreaterThanOrEqual(0);
      expect(Math.abs(idle.look - previous.look)).toBeLessThan(.05);
      previous = idle;
    }
    expect(bob).toBeGreaterThan(.03); expect(bob).toBeLessThan(.06);
    expect(left).toBeGreaterThan(.3); expect(right).toBeLessThan(-.25);
    expect(roll).toBe(0);
    for (let frame = 0; frame < 120; frame++) previous = { ...motion.update(ghostFrame({ clock: 70 + frame / 60, elof: -3.2 })) };
    expect(previous.roll).toBeGreaterThan(.07); expect(previous.pitch).toBeGreaterThan(.05); expect(previous.look).toBe(0);
  });

  it('holds still in a scene, asleep, in a hop and with reduced motion, and freezes on pause', () => {
    const { model, hem } = toyGhost(), motion = createGhostMotion(model, true), rest = hem.quaternion.clone();
    for (const more of [{ staged: true }, { awake: false }, { hop: .4 }, { calm: true }] as const) {
      for (const clock of [2.4, 2.8, 1.8, 3]) expect(motion.update(ghostFrame({ clock, elof: 3, ...more }))).toEqual({ bob: 0, look: 0, pitch: 0, roll: 0 });
    }
    const bobbing = { ...motion.update(ghostFrame({ clock: 6.4 * 0 + 2.4, elof: 12 })) };
    expect(motion.update(ghostFrame({ dt: 0, clock: 9, elof: 2 }))).toEqual(bobbing);
    for (let frame = 0; frame < 120; frame++) motion.update(ghostFrame({ clock: frame / 60, wind: 4 }));
    expect(hem.quaternion.angleTo(rest)).toBeGreaterThan(.1);
    motion.update(ghostFrame({ calm: true, wind: 4 }));
    expect(hem.quaternion.angleTo(rest)).toBeLessThan(1e-9);
  });
});

describe('the wind reaching the characters, chapter by chapter', () => {
  beforeAll(() => loadAdventure2());

  it('is still indoors, full outside, and stronger while a storm rains until its calm', () => {
    const chapters = [...STORY, ...BONUS, ...ADVENTURE2];
    expect(chapters.length).toBeGreaterThanOrEqual(18);
    for (const chapter of chapters) {
      const gale = galeOf(chapter, new Set());
      if (chapter.place === 'home') expect(gale, chapter.id).toBe(0);
      else if (chapter.storm?.rain) expect(gale, chapter.id).toBeGreaterThan(1.3);
      else expect(gale, chapter.id).toBe(1);
      if (chapter.storm?.calm && chapter.place !== 'home') expect(galeOf(chapter, new Set([chapter.storm.calm])), chapter.id).toBe(1);
    }
    for (const id of ['stormgard', 'berget', 'myren', 'prolog']) expect(chapters.some((chapter) => chapter.id === id)).toBe(true);
  });
});
