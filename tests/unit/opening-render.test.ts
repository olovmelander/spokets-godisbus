import { Matrix4, Vector3, type InstancedMesh } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { actPose, eatingAt } from '../../src/render/acting';
import { createPlayerStandIn } from '../../src/render/player-motion';
import { STANDING } from '../../src/render/rig';
import { createStage } from '../../src/render/stage';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

describe('opening story performance', () => {
  const frame = (stage: ReturnType<typeof createStage>, seconds: number, calm = false, id = 'poff', clock = seconds) =>
    stage.update({ id, seconds }, new Set(), { x: 40.5, y: -.8 }, clock, 0, calm);

  it.each([false, true])('keeps the edible star in Elof’s actual hand and at his lips before it vanishes (calm=%s)', calm => {
    const stage = createStage(prolog, () => 0), body = createPlayerStandIn();
    const star = stage.group.getObjectByName('elof-star')!;
    body.group.position.set(40.5, -.8, 0); body.group.scale.setScalar(3);
    const show = (seconds: number) => {
      const direction = frame(stage, seconds, calm).elof!;
      body.pose(actPose(direction.act!, { t: direction.actT, calm, aim: null, stride: 0, pace: 0 }, { ...STANDING }));
      stage.updateElof(body, direction, 3, calm);
    };
    show(1);
    expect(star.visible).toBe(true);
    expect(star.position.distanceTo(body.hand(1, new Vector3()))).toBeLessThan(1e-7);
    show(2.9);
    expect(star.visible).toBe(true);
    expect(star.position.distanceTo(body.mouth(new Vector3()))).toBeLessThan(.09);
    expect(eatingAt(.9, calm).sweet).toBe(1);
    show(3.45);
    expect(star.visible).toBe(false);
    show(2.9);
    const bite = star.position.toArray();
    frame(stage, 2.9, calm, 'poff', 1000);
    show(2.9);
    expect(star.position.toArray()).toEqual(bite);
    stage.update(null, new Set(), { x: 40.5, y: -.8 }, 500, 0, calm);
    stage.updateElof(body, null, 3, calm);
    expect(star.visible).toBe(false);
  });

  it('eats before shrinking, then changes size continuously on the scene clock', () => {
    const stage = createStage(prolog, () => 0);
    expect(frame(stage, 3.9).elof!.size).toBe(3);
    expect(frame(stage, 4).elof!.size).toBe(3);
    expect(frame(stage, 5.25).elof!.size).toBeCloseTo(2);
    expect(frame(stage, 6.5).elof!.size).toBe(1);
    expect(frame(stage, 5.25, false, 'poff', 900).elof!.size).toBe(2);
    let previous = 3;
    for (let i = 1; i <= 150; i++) {
      const size = frame(stage, 4 + i / 60).elof!.size!;
      expect(size).toBeLessThanOrEqual(previous);
      expect(previous - size).toBeLessThan(.03);
      previous = size;
    }
  });

  it('lands the jay before the reading stop and freezes both its flight and wings when paused', () => {
    const stage = createStage(prolog, () => 0), bird = stage.birds[0]!, jay = bird.parent!;
    frame(stage, .7, false, 'vaknar');
    const flying = jay.position.clone();
    frame(stage, 2, false, 'vaknar');
    const landed = jay.position.clone(), wings = ['wingNear', 'wingFar'].map(name => jay.getObjectByName(name)!.rotation.x);
    expect(flying.distanceTo(landed)).toBeGreaterThan(1);
    wings.forEach(wing => expect(Math.abs(wing)).toBe(0));
    frame(stage, 2, false, 'vaknar', 1000);
    expect(jay.position.toArray()).toEqual(landed.toArray());
    expect(['wingNear', 'wingFar'].map(name => jay.getObjectByName(name)!.rotation.x)).toEqual(wings);
    frame(stage, .7, true, 'vaknar');
    expect(jay.position.toArray()).toEqual(landed.toArray());
    expect(jay.rotation.z).toBe(0);
  });

  it('keeps magical particles still in reduced motion while retaining their readable light', () => {
    const stage = createStage(prolog, () => 0);
    const sparks = stage.group.children.find(child => (child as InstancedMesh).isInstancedMesh && (child as InstancedMesh).instanceMatrix.count === 72) as InstancedMesh;
    const matrix = new Matrix4();
    frame(stage, 4.7, true);
    sparks.getMatrixAt(0, matrix); const before = matrix.toArray();
    frame(stage, 5.1, true);
    sparks.getMatrixAt(0, matrix);
    expect(sparks.visible).toBe(true);
    expect(matrix.toArray()).toEqual(before);
  });

  it('keeps shrinking magic around Elof when he tastes the star from its other side', () => {
    const stage = createStage(prolog, () => 0);
    const sparks = stage.group.children.find(child => (child as InstancedMesh).isInstancedMesh && (child as InstancedMesh).instanceMatrix.count === 72) as InstancedMesh;
    const matrix = new Matrix4();
    frame(stage, 5.1);
    sparks.getMatrixAt(0, matrix); const from = new Vector3().setFromMatrixPosition(matrix);
    stage.update({ id: 'poff', seconds: 5.1 }, new Set(), { x: 43.1, y: -.8 }, 800, 0, false);
    sparks.getMatrixAt(0, matrix); const to = new Vector3().setFromMatrixPosition(matrix);
    expect(to.x - from.x).toBeCloseTo(2.6, 4);
    expect(to.y).toBe(from.y); expect(to.z).toBe(from.z);
  });
});
