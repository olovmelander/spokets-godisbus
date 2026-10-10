import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { createStage, type Stage } from '../../src/render/stage';
import type { Rig, Role } from '../../src/render/rig';
import type { ActorKey } from '../../src/sim/scene';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

function show(stage: Stage, id: string, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  const index = prolog.scenes!.findIndex(scene => scene.id === id);
  const flags = new Set(prolog.scenes!.slice(0, Math.max(0, index)).map(scene => scene.by?.done ?? `scene:${scene.id}`));
  const directions = stage.update({ id, seconds }, flags, { x: 40.9, y: -.8 }, clock, dt, calm);
  stage.group.updateMatrixWorld(true);
  return directions;
}
function stageFor(keys: readonly ActorKey[]) {
  return createStage({ ...prolog, furniture: [], scenes: [{ id: 'contact', seconds: 8, stage: { actors: { pappa: keys } } }] }, () => 0);
}
function arm(rig: Rig) {
  rig.group.updateMatrixWorld(true);
  const mesh = rig.group.children[0] as InstancedMesh, matrix = new Matrix4();
  mesh.getMatrixAt(8, matrix);
  const shoulder = new Vector3(0, .5, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
  mesh.getMatrixAt(9, matrix);
  const elbow = new Vector3(0, .45, 0).applyMatrix4(matrix).applyMatrix4(mesh.matrixWorld);
  return { shoulder, elbow, hand: rig.hand(1, new Vector3()) };
}
const rigFor = (stage: Stage, who: Role = 'pappa') => stage.actors.get(who)!.rig;

describe('3D story interactions', () => {
  it.each([
    ['vaknar', .55, 'mamma', [11.2, 3.55, -9]],
    ['prologue:pappa', 2.6, 'bertil', [50, -.3, 0]],
  ] as const)('points %s’s actual forearm at its lateral story target', (id, seconds, who, target) => {
    const stage = createStage(prolog, () => 0);
    show(stage, id, seconds);
    const rig = rigFor(stage, who), { shoulder, elbow, hand } = arm(rig);
    const wanted = new Vector3(...target).sub(elbow);
    expect(hand.clone().sub(elbow).angleTo(wanted)).toBeLessThan(1e-5);
    expect(shoulder.distanceTo(elbow)).toBeCloseTo(.84 * rig.height / 5.2, 6);
    expect(elbow.distanceTo(hand)).toBeCloseTo(Math.hypot(.92, .05) * rig.height / 5.2, 6);
  });

  it('lifts Elof to the authored palm point using the same hand that supports his ride', () => {
    const stage = createStage(prolog, () => 0);
    show(stage, 'handen', 3);
    const target = prolog.scenes!.find(scene => scene.id === 'handen')!.stage!.actors!.pappa!.find(key => key.act === 'lift')!.aim!;
    expect(rigFor(stage).hand(1, new Vector3()).distanceTo(new Vector3(target.x, target.y, target.z))).toBeLessThan(1e-6);
  });

  it.each([false, true])('supports Elof through his pointing cue, then lowers him continuously (calm=%s)', calm => {
    const stage = createStage(prolog, () => 0), rig = rigFor(stage);
    show(stage, 'handen', 3, calm);
    const held = rig.hand(1, new Vector3());
    for (const seconds of [8.2, 8.3, 8.75, 9.2]) {
      const directions = show(stage, 'handen', seconds, calm);
      const hand = rig.hand(1, new Vector3());
      expect(hand.distanceTo(held)).toBeLessThan(1e-6);
      expect(directions.elof!.ontoWeight).toBe(1);
      expect(directions.elof!.onto.y).toBeCloseTo(hand.y + .1, 6);
    }
    let previous = held;
    for (let frame = 1; frame <= 30; frame++) {
      const directions = show(stage, 'handen', 9.2 + frame / 60, calm);
      const hand = rig.hand(1, new Vector3());
      expect(hand.distanceTo(previous)).toBeLessThan(.25);
      expect(directions.elof!.onto.y).toBeCloseTo(hand.y + .1, 6);
      previous = hand;
    }
    expect(previous.y).toBeLessThan(held.y - 1);
    expect(show(stage, 'handen', 10.2, calm).elof!.ontoWeight).toBe(0);
  });

  it.each(['reach', 'offer'] as const)('makes an attainable %s contact with the real right hand', act => {
    const target = { x: -.8, y: 3.4, z: 1.1 };
    const stage = stageFor([{ at: 0, x: 0, y: 0, z: 0, face: .25, act: 'stand' }, { at: 1, face: .25, act, aim: target }]);
    show(stage, 'contact', 1.5);
    expect(rigFor(stage).hand(1, new Vector3()).distanceTo(new Vector3(target.x, target.y, target.z))).toBeLessThan(1e-6);
  });

  it('offers toward an unreachable recipient without extending the arm beyond its real length', () => {
    const stage = createStage(prolog, () => 0);
    show(stage, 'morgon', 9.6);
    const { shoulder, elbow, hand } = arm(rigFor(stage));
    const target = new Vector3(2.3, 2.3, 0);
    expect(hand.clone().sub(shoulder).angleTo(target.clone().sub(shoulder))).toBeLessThan(1e-5);
    expect(shoulder.distanceTo(hand)).toBeCloseTo(.84 + Math.hypot(.92, .05), 6);
    expect(elbow.distanceTo(hand)).toBeCloseTo(Math.hypot(.92, .05), 6);
    expect(hand.distanceTo(target)).toBeGreaterThan(1);
  });

  const interrupted: readonly ActorKey[] = [
    { at: 0, x: 0, y: 0, z: 0, face: .25, act: 'stand' },
    { at: 1, face: .25, act: 'reach', aim: { x: -1.2, y: 2, z: 1.2 } },
    { at: 1.22, face: .25, act: 'lift', aim: { x: -.6, y: 3.5, z: 1 } },
    { at: 1.35, face: .25, act: 'point', aim: { x: 4, y: 5, z: -3 } },
    { at: 1.7, face: .25, act: 'look', aim: { x: 4, y: 2, z: 2 } },
  ];
  it.each([false, true])('retains both hands through interrupted reaches and their release (calm=%s)', calm => {
    const stage = stageFor(interrupted), rig = rigFor(stage);
    for (const at of [1, 1.22, 1.35, 1.7]) {
      show(stage, 'contact', at - 1e-6, calm);
      const hands = [rig.hand(0, new Vector3()), rig.hand(1, new Vector3())];
      show(stage, 'contact', at, calm);
      for (const side of [0, 1] as const) expect(rig.hand(side, new Vector3()).distanceTo(hands[side]!)).toBeLessThan(1e-4);
    }
    show(stage, 'contact', 1.7, calm);
    const raised = rig.hand(1, new Vector3());
    show(stage, 'contact', 2.3, calm);
    expect(rig.hand(1, new Vector3()).distanceTo(raised)).toBeGreaterThan(.3);
  });

  it('reconstructs the same contacts when seeking, restoring and pausing', () => {
    const stage = stageFor(interrupted), rig = rigFor(stage);
    const snapshot = () => [rig.hand(0, new Vector3()).toArray(), rig.hand(1, new Vector3()).toArray()];
    show(stage, 'contact', 1.47);
    const held = snapshot();
    for (const at of [2.3, .5, 1.47]) show(stage, 'contact', at);
    expect(snapshot()).toEqual(held);
    show(stage, 'contact', 1.47, false, 0, 500);
    expect(snapshot()).toEqual(held);
    const restored = stageFor(interrupted);
    show(restored, 'contact', 1.47);
    expect(rigFor(restored).hand(1, new Vector3()).toArray()).toEqual(held[1]);
  });

  it('holds completed pointing contacts still in calmer mode', () => {
    const stage = stageFor(interrupted.slice(0, 4)), rig = rigFor(stage);
    show(stage, 'contact', 2, true);
    const held = rig.hand(1, new Vector3());
    for (const seconds of [3, 8, 40]) {
      show(stage, 'contact', seconds, true);
      expect(rig.hand(1, new Vector3()).distanceTo(held)).toBeLessThan(1e-8);
    }
  });

  it('lowers a distant pointing arm throughout its release without a last-frame snap', () => {
    const stage = stageFor([
      { at: 0, x: 0, y: 0, z: 0, face: .25, act: 'point', aim: { x: 20, y: 3, z: 2 } },
      { at: 3, face: .25, act: 'stand' },
    ]), rig = rigFor(stage);
    show(stage, 'contact', 3);
    const raised = rig.hand(1, new Vector3());
    let previous = raised.clone();
    for (let frame = 1; frame <= 27; frame++) {
      show(stage, 'contact', 3 + frame / 60);
      const now = rig.hand(1, new Vector3());
      expect(now.distanceTo(previous)).toBeLessThan(.2);
      if (frame === 12) expect(now.distanceTo(raised)).toBeGreaterThan(.5);
      previous = now;
    }
    expect(previous.distanceTo(raised)).toBeGreaterThan(1.5);
  });
});
