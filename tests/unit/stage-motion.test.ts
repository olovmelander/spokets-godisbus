import { InstancedMesh, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { createStage, type Stage } from '../../src/render/stage';
import type { ActorKey } from '../../src/sim/scene';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
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
