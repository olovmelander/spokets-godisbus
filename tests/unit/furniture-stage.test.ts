import { stubCanvas } from './canvas-stub';
import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { createStage, type Stage } from '../../src/render/stage';
import type { Role } from '../../src/render/rig';
import { MAMMA_TIME } from '../../src/sim/prologue';

beforeEach(() => {
  stubCanvas();
});
afterEach(() => vi.unstubAllGlobals());

const scenes = prolog.scenes!, index = scenes.findIndex(scene => scene.id === 'prologue:mamma');
const flags = (complete = false) => new Set(scenes.slice(0, index + Number(complete)).map(scene => scene.by?.done ?? `scene:${scene.id}`));
const actor = (stage: Stage) => stage.actors.get('moa')!.rig;
function show(stage: Stage, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  stage.update({ id: 'prologue:mamma', seconds }, flags(), { x: prolog.prologue!.doorway.x - 1.1, y: 0 }, clock, dt, calm);
  stage.group.updateMatrixWorld(true);
}
function snapshot(stage: Stage) {
  const rig = actor(stage), mesh = rig.group.children[0] as InstancedMesh;
  return [rig.group.position.toArray(), rig.group.quaternion.toArray(), Array.from(mesh.instanceMatrix.array)];
}
function overlaps(stage: Stage, who: Role = 'moa', chairBack = false) {
  stage.group.updateMatrixWorld(true);
  const solids: Box3[] = [];
  for (const piece of stage.group.children.filter(child => child.name.startsWith('furniture:'))) {
    if (chairBack && (piece.name !== 'furniture:chair' || piece.rotation.y !== 0)) continue;
    piece.traverse(child => {
      if (!(child instanceof Mesh)) return;
      const box = new Box3().setFromObject(child);
      if (!chairBack || box.min.y > 1.2 && box.max.y > 2) solids.push(box.expandByScalar(-.005));
    });
  }
  const mesh = stage.actors.get(who)!.rig.group.children[0] as InstancedMesh, matrix = new Matrix4();
  mesh.geometry.computeBoundingBox();
  const hits: number[] = [];
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
    const part = new OBB().fromBox3(mesh.geometry.boundingBox!).applyMatrix4(matrix);
    if (solids.some(solid => part.intersectsOBB(new OBB().fromBox3(solid)))) hits.push(i);
  }
  return hits;
}

describe('Moa leaves the kitchen chair', () => {
  it.each([false, true])('steps into the aisle before following, clear of the chair and table (calm=%s)', calm => {
    const stage = createStage(prolog, () => 0);
    show(stage, MAMMA_TIME - .5, calm);
    expect(overlaps(stage)).toEqual([]);
    show(stage, MAMMA_TIME, calm);
    const before = actor(stage).group.position.clone();
    for (let frame = 1; frame <= 180; frame++) {
      stage.update(null, flags(true), { x: prolog.prologue!.doorway.x - 1.1, y: 0 }, MAMMA_TIME + frame / 60, 1 / 60, calm);
      const now = actor(stage).group.position;
      expect(now.distanceTo(before)).toBeLessThan(.05);
      expect(overlaps(stage), `following frame ${frame}`).toEqual([]);
      before.copy(now);
    }
  });

  it('finishes rising at the jay call before stepping out through the chair’s side', () => {
    const stage = createStage(prolog, () => 0), told = new Set(['scene:morgon']);
    const wake = (seconds: number) => {
      stage.update({ id: 'vaknar', seconds }, told, prolog.spawn, seconds, 1 / 60, false);
      stage.group.updateMatrixWorld(true);
    };
    wake(1.35);
    const seated = actor(stage).mouth(new Vector3()), position = actor(stage).group.position.clone();
    wake(1.85);
    expect(actor(stage).group.position.distanceTo(position)).toBeCloseTo(.155, 8);
    position.copy(actor(stage).group.position);
    expect(actor(stage).mouth(new Vector3()).y).toBeGreaterThan(seated.y + .4);
    // She is standing still for Mamma's held line, then her side-step clears both table and chair.
    wake(2);
    expect(actor(stage).group.position.distanceTo(position)).toBe(0);
    for (let frame = 0; frame <= 84; frame++) {
      wake(2.0 + frame / 60);
      const now = actor(stage).group.position;
      expect(now.distanceTo(position)).toBeLessThan(.07);
      expect(overlaps(stage), `Moa's chair exit at ${2.0 + frame / 60}`).toEqual([]);
      position.copy(now);
    }
  });

  it('reconstructs the exit on seek and freezes it when the scene is paused', () => {
    const stage = createStage(prolog, () => 0);
    show(stage, 1.35);
    const held = snapshot(stage);
    for (const seconds of [2.6, .2, 1.35]) show(stage, seconds);
    expect(snapshot(stage)).toEqual(held);
    for (const clock of [20, 40, 100]) show(stage, 1.35, false, 0, clock);
    expect(snapshot(stage)).toEqual(held);
    const restored = createStage(prolog, () => 0);
    show(restored, 1.35);
    expect(snapshot(restored)).toEqual(held);
  });
});

it.each([false, true])('Pappa keeps his body and legs beside the chair before turning towards the window (calm=%s)', calm => {
  const stage = createStage(prolog, () => 0), rig = stage.actors.get('pappa')!.rig;
  const told = new Set(scenes.slice(0, scenes.findIndex(scene => scene.id === 'vaknar')).map(scene => scene.by?.done ?? `scene:${scene.id}`));
  let previous: Vector3 | null = null;
  // He rises and clears the chair sideways, waits for the bird line, then steps into the rear aisle.
  for (let frame = 0; frame <= 84; frame++) {
    const seconds = .6 + frame / 60;
    stage.update({ id: 'vaknar', seconds }, told, prolog.spawn, seconds, 1 / 60, calm);
    const hits = overlaps(stage, 'pappa', true);
    // The rehearsal figure has wider swinging arms than the imported body; the trunk and legs
    // must never cross the back, and the entire figure must clear it before walking behind it.
    expect(hits.filter(part => part === 0 || part >= 11), `chair back at ${seconds}`).toEqual([]);
    if (seconds >= 1.4) expect(hits, `chair back at ${seconds}`).toEqual([]);
    if (previous) expect(rig.group.position.distanceTo(previous)).toBeLessThan(.07);
    previous = rig.group.position.clone();
  }
  expect(rig.group.position.toArray()).toEqual([12.3, 0, -3.5]);
});
