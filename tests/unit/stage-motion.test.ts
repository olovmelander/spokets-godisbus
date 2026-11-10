import { stubCanvas } from './canvas-stub';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { prolog } from '../../src/content/chapters/ends';
import { createStage, type Stage } from '../../src/render/stage';
import type { ActorKey } from '../../src/sim/scene';

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

function stageFor(keys: readonly ActorKey[]) {
  return createStage({ ...garden, furniture: [], scenes: [{ id: 'motion', seconds: 8, stage: { actors: { mamma: keys } } }] }, () => 0);
}
const show = (stage: Stage, seconds: number) => stage.update({ id: 'motion', seconds }, new Set(), { x: 0, y: 0 }, seconds, 1 / 60, false);
const actor = (stage: Stage) => stage.actors.get('mamma')!.rig;
function snapshot(stage: Stage) {
  const rig = actor(stage), mesh = rig.group.children[0] as InstancedMesh;
  return { position: rig.group.position.toArray(), rotation: rig.group.quaternion.toArray(), joints: Array.from(mesh.instanceMatrix.array) };
}

describe('story character motion', () => {
  it('keeps Pappa finite at the exact first step after lifting Elof and standing from his knee', () => {
    const ground = (x: number) => {
      for (let i = 0; i < prolog.ground.length - 1; i++) {
        const a = prolog.ground[i]!, b = prolog.ground[i + 1]!;
        if (a.x !== b.x && x >= a.x && x <= b.x) return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x);
      }
      return 0;
    };
    const stage = createStage(prolog, ground), scenes = prolog.scenes!;
    const before = scenes.findIndex(scene => scene.id === 'handen');
    const flags = new Set(scenes.slice(0, before).map(scene => scene.by?.done ?? `scene:${scene.id}`));
    let clock = 0;
    for (const id of ['handen', 'prologue:pappa']) {
      const scene = scenes.find(scene => scene.id === id)!;
      for (let frame = 0; frame <= Math.ceil(scene.seconds * 60); frame++) {
        const seconds = Math.min(scene.seconds, frame / 60);
        stage.update({ id, seconds }, flags, { x: 40.9, y: -.8 }, clock += 1 / 60, 1 / 60, false);
        const rig = stage.actors.get('pappa')!.rig;
        const mesh = rig.group.children[0] as InstancedMesh;
        expect(Array.from(mesh.instanceMatrix.array).every(Number.isFinite), `${id} ${seconds}`).toBe(true);
        expect(rig.hand(1, new Vector3()).toArray().every(Number.isFinite), `${id} ${seconds} hand`).toBe(true);
      }
      flags.add(scene.by?.done ?? `scene:${id}`);
    }
  });

  it('does not invent a stride for a stationary key or an instantaneous move', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, z: 0, act: 'stand' },
      { at: .5, x: 0, z: 0, move: 1, act: 'look' },
      { at: 1, x: 3, move: 0, act: 'stand' },
      { at: 1.5, x: 4, move: .5, act: 'walk' },
    ]);
    for (const t of [0, .5, .75, 1, 1.25, 1.5, 1.5 + 1 / 60, 2]) {
      show(stage, t);
      const current = snapshot(stage);
      expect([...current.position, ...current.rotation, ...current.joints].every(Number.isFinite), `at ${t}`).toBe(true);
      if (t < 1) expect(current.position[0]).toBe(0);
      if (t >= 1 && t <= 1.5) expect(current.position[0]).toBe(3);
    }
  });

  it('keeps the old hand target at the reach-to-lift boundary', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, move: .01, act: 'reach', aim: { x: 0, y: 2.8, z: 1.4 } },
      { at: 2, act: 'lift', aim: { x: 0, y: 4.3, z: 1.0 } },
    ]);
    show(stage, 2 - 1e-6);
    const before = actor(stage).hand(1, new Vector3());
    show(stage, 2);
    expect(actor(stage).hand(1, new Vector3()).distanceTo(before)).toBeLessThan(1e-4);
    show(stage, 3.3);
    expect(actor(stage).hand(1, new Vector3()).y).toBeGreaterThan(before.y + .8);
  });

  it('keeps a carried mug raised while the legs walk', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, move: .01, act: 'sip', holdsLeft: 'mug' },
      { at: 2, z: 2, move: 2 },
    ]);
    show(stage, 3);
    const rig = actor(stage), hand = rig.hand(0, new Vector3());
    expect(hand.y).toBeGreaterThan(3.3);
    const mug = stage.group.getObjectByName('stage-thing:mug')!;
    const grip = stage.group.getObjectByName('sipping-mug-grip')!;
    expect(mug.position.distanceTo(grip.position)).toBeCloseTo(.18, 8);
    const first = snapshot(stage).joints;
    show(stage, 3.15);
    expect(snapshot(stage).joints).not.toEqual(first);
    expect(rig.hand(0, new Vector3()).y).toBeGreaterThan(3.3);
  });

  it.each(['point', 'shine', 'offer'] as const)('swings the free arm while walking and continuing to %s', act => {
    const aim = { x: 20, y: 3.8, z: 2 };
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, act, aim, ...(act === 'shine' ? { holds: 'lamp-mamma' as const } : {}) },
      { at: .6, x: 6, move: 3.4 },
    ]);
    const rig = actor(stage), posed: number[] = [], original = rig.pose.bind(rig);
    let time = 0;
    vi.spyOn(rig, 'pose').mockImplementation(pose => {
      if (time >= 1.5 && time <= 3.5) posed.push(pose.armL);
      original(pose);
    });
    const elbow = new Vector3(), hand = new Vector3(), matrix = new Matrix4();
    for (let frame = 0; frame <= 240; frame++) {
      time = frame / 60; show(stage, time);
      if (time < 1.5 || time > 3.5) continue;
      if (act === 'point') {
        rig.group.updateMatrixWorld(true);
        const mesh = rig.group.children[0] as InstancedMesh;
        mesh.getMatrixAt(9, matrix);
        elbow.set(0, .45, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
        rig.hand(1, hand);
        expect(hand.clone().sub(elbow).angleTo(new Vector3(aim.x, aim.y, aim.z).sub(elbow))).toBeLessThan(.015);
      }
      if (act === 'shine') {
        const lamp = stage.group.getObjectByName('stage-thing:lamp-mamma')!;
        expect(lamp.position.distanceTo(rig.hand(1, hand))).toBeLessThan(.3);
      }
    }
    // A real counter-swing, not just the tiny breathing loop under the gesture.
    expect(Math.max(...posed) - Math.min(...posed)).toBeGreaterThan(.45);
  });

  it('swings the right arm when the walking torch is held in the left hand', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, act: 'shine', aim: { x: 20, y: 1, z: 2 }, holdsLeft: 'lamp-mamma' },
      { at: .6, x: 6, move: 3.4 },
    ]);
    const rig = actor(stage), posed: number[] = [], original = rig.pose.bind(rig);
    let time = 0;
    vi.spyOn(rig, 'pose').mockImplementation(pose => { if (time >= 1.5 && time <= 3.5) posed.push(pose.armR); original(pose); });
    for (let frame = 0; frame <= 240; frame++) {
      time = frame / 60; show(stage, time);
      const lamp = stage.group.getObjectByName('stage-thing:lamp-mamma')!;
      expect(lamp.position.distanceTo(rig.hand(0, new Vector3()))).toBeLessThan(.3);
    }
    expect(Math.max(...posed) - Math.min(...posed)).toBeGreaterThan(.45);
  });

  it('keeps a carried left-hand mug reserved while the right hand points during a walk', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, act: 'point', aim: { x: 20, y: 4, z: 2 }, holdsLeft: 'mug' },
      { at: .6, x: 6, move: 3.4 },
    ]);
    const rig = actor(stage), posed: number[] = [], original = rig.pose.bind(rig);
    let time = 0;
    vi.spyOn(rig, 'pose').mockImplementation(pose => { if (time >= 1.5 && time <= 3.5) posed.push(pose.armL); original(pose); });
    for (let frame = 0; frame <= 240; frame++) {
      time = frame / 60; show(stage, time);
      const mug = stage.group.getObjectByName('stage-thing:mug')!, grip = stage.group.getObjectByName('sipping-mug-grip')!;
      expect(mug.position.distanceTo(grip.position)).toBeCloseTo(.18, 8);
    }
    expect(Math.max(...posed) - Math.min(...posed)).toBeLessThan(.1);
  });

  it('hands a walking gesture back to the stride continuously and holds it on pause', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, face: .25, act: 'point', aim: { x: 20, y: 4, z: 2 } },
      { at: .6, x: 6, move: 4.4 },
      { at: 2.8, act: 'look' },
    ]);
    const rig = actor(stage), previous = [new Vector3(), new Vector3()];
    for (let frame = 0; frame <= 300; frame++) {
      show(stage, frame / 60);
      for (const side of [0, 1] as const) {
        const hand = rig.hand(side, new Vector3());
        if (frame > 150) expect(hand.distanceTo(previous[side]!)).toBeLessThan(.25);
        previous[side]!.copy(hand);
      }
    }
    const before = snapshot(stage);
    stage.update({ id: 'motion', seconds: 5 }, new Set(), { x: 0, y: 0 }, 5, 0, false);
    expect(snapshot(stage)).toEqual(before);
  });

  it('holds a following body exactly on pause, even if the player is restored far away', () => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: .25, move: .01, act: 'stand', follow: 2 }]);
    show(stage, 1);
    const flags = new Set(['scene:motion']);
    for (let i = 1; i <= 20; i++) stage.update(null, flags, { x: 6, y: 0 }, 1 + i / 60, 1 / 60, false);
    const before = snapshot(stage);
    for (let i = 0; i < 3; i++) stage.update(null, flags, { x: 50, y: 0 }, 1 + 20 / 60, 0, false);
    expect(snapshot(stage)).toEqual(before);
    stage.update(null, flags, { x: 50, y: 0 }, 1 + 21 / 60, 1 / 60, false);
    expect(actor(stage).group.position.x).toBe(48);
    expect(actor(stage).hand(0, new Vector3()).y).toBeGreaterThan(2);
  });

  it('accelerates and turns a follower rather than flipping them on the first step', () => {
    const stage = stageFor([{ at: 0, x: 0, y: 0, face: .25, move: .01, act: 'stand', follow: 2 }]);
    show(stage, 1);
    const rig = actor(stage), facing = rig.group.quaternion.clone(), flags = new Set(['scene:motion']);
    stage.update(null, flags, { x: 6, y: 0 }, 1 + 1 / 60, 1 / 60, false);
    const firstStep = rig.group.position.x;
    expect(firstStep).toBeGreaterThan(0);
    expect(firstStep).toBeLessThan(2.6 / 60 / 2);
    expect(facing.angleTo(rig.group.quaternion)).toBeLessThan(.2);
    for (let i = 2; i <= 120; i++) stage.update(null, flags, { x: 6, y: 0 }, 1 + i / 60, 1 / 60, false);
    expect(rig.group.position.x).toBeGreaterThan(3);
    expect(rig.group.position.x).toBeLessThanOrEqual(4);
  });

  it('exposes the story shoe clock and holds reduced-motion ghost loops still', () => {
    for (const act of ['waddle', 'run', 'hop', 'peek'] as const) {
      const stage = createStage({ ...garden, scenes: [{ id: 'toy', seconds: 4, stage: { actors: { ghost: [{ at: 0, act }] } } }] }, () => 0);
      const a = stage.update({ id: 'toy', seconds: .3 }, new Set(), { x: 0, y: 0 }, .3, 1 / 60, true).ghost!;
      const b = stage.update({ id: 'toy', seconds: .6 }, new Set(), { x: 0, y: 0 }, .6, 1 / 60, true).ghost!;
      expect(a.act).toBe(act); expect(a.actT).toBe(.3);
      expect(a.bounce).toBe(b.bounce); expect(a.tilt).toBe(b.tilt);
    }
  });
});
