import { Box3, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { CLIPS } from '../../src/render/motion-data';
import type { Role } from '../../src/render/rig';
import { createStage, type Stage } from '../../src/render/stage';
import type { ActorKey } from '../../src/sim/scene';

/**
 * Getting up from a kitchen chair and sitting down on one (the motion pass of 8 November 2026, art/blender/motion.py
 * STAND_UP and SIT_DOWN): the chair is pushed back with the body on it, the body comes up over feet that stay where they
 * were put and stands clear of it, and sitting down it goes down behind its feet and draws the chair in again.
 */
beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

const SHOES = [13, 16];
// Sat at the chair, facing +x, with the chair's middle a little behind the hips: up at 1, away and back, and down at 6.6.
const KEYS: ActorKey[] = [
  { at: 0, x: 0, y: 0, z: 0, face: 0, move: 0.01, act: 'sit' },
  { at: 1, act: 'stand' },
  { at: 2, x: 2.4, move: 1.4 },
  { at: 4, x: 0, move: 1.6 },
  { at: 5.8, face: 0 },
  { at: 6.6, act: 'sit' },
];
const stageFor = (who: Role) => createStage({
  ...garden, furniture: [{ look: 'chair', at: { x: -0.3, y: 0 }, z: 0, face: 0 }],
  scenes: [{ id: 'chair', seconds: 12, stage: { actors: { [who]: KEYS } } }],
}, () => 0);
const show = (stage: Stage, seconds: number, calm = false) => {
  stage.update({ id: 'chair', seconds }, new Set(), { x: 30, y: 0 }, seconds, 1 / 60, calm);
  stage.group.updateMatrixWorld(true);
};
const chairOf = (stage: Stage) => stage.group.children.find(child => child.name === 'furniture:chair')!;
/** The front of each sole: what a foot on its ball stands on. */
function toes(stage: Stage, who: Role): Vector3[] {
  const mesh = stage.actors.get(who)!.rig.group.children[0] as InstancedMesh, m = new Matrix4();
  return SHOES.map(i => { mesh.getMatrixAt(i, m); return new Vector3(0, -.5, .5).applyMatrix4(m.premultiply(mesh.matrixWorld)); });
}
/** The parts of the body that are in the chair. */
function inChair(stage: Stage, who: Role): number[] {
  const solids: Box3[] = [];
  chairOf(stage).traverse(child => { if (child instanceof Mesh) solids.push(new Box3().setFromObject(child).expandByScalar(-.005)); });
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

describe('the kitchen chair', () => {
  // Bertil, small on a grown-up's chair, sits with his feet hanging: the rehearsal figure's legs do not reach the floor.
  it.each([['pappa', 0], ['mamma', 0], ['moa', 0], ['bertil', .1]] as const)('sits %s with the feet on the floor or over it', (who, over) => {
    const stage = stageFor(who);
    show(stage, .5);
    const mesh = stage.actors.get(who)!.rig.group.children[0] as InstancedMesh, m = new Matrix4();
    let lowest = Infinity;
    for (const i of SHOES) {
      mesh.getMatrixAt(i, m); m.premultiply(mesh.matrixWorld);
      for (const x of [-.5, .5]) for (const y of [-.5, .5]) for (const z of [-.5, .5]) lowest = Math.min(lowest, new Vector3(x, y, z).applyMatrix4(m).y);
    }
    expect(lowest).toBeGreaterThan(over - 1e-6);
    if (!over) expect(lowest).toBeLessThan(.02);
  });

  it.each(['pappa', 'moa'] as const)('lets %s up over the feet, pushing the chair back, and down again drawing it in', who => {
    const stage = stageFor(who), rig = stage.actors.get(who)!.rig, chair = chairOf(stage);
    show(stage, .9);
    const home = chair.position.clone(), seated = rig.group.position.clone();
    const left = 1 + CLIPS.standUp.rise[3]!;
    let planted: Vector3[] | null = null, slid = 0, last = rig.group.position.clone(), lastChair = home.clone(), jump = 0, shove = 0;
    for (let f = 0; f <= 60; f++) {
      const t = .9 + f / 60;
      show(stage, t);
      const now = toes(stage, who);
      // From the moment the seat is left, the balls of the feet stay where they are.
      if (t >= left + 1e-6) {
        planted ??= now;
        slid = Math.max(slid, ...now.map((one, i) => Math.hypot(one.x - planted![i]!.x, one.z - planted![i]!.z)));
      }
      jump = Math.max(jump, rig.group.position.distanceTo(last));
      shove = Math.max(shove, chair.position.distanceTo(lastChair));
      last.copy(rig.group.position); lastChair.copy(chair.position);
    }
    expect(slid).toBeLessThan(.02);
    expect(jump).toBeLessThan(.15);
    expect(shove).toBeLessThan(.15);
    // Up where they sat, and the chair pushed back behind them (to -x) and out of the way.
    expect(rig.group.position.distanceTo(seated)).toBeLessThan(1e-9);
    expect(home.x - chair.position.x).toBeGreaterThan(.4);
    expect(chair.position.z).toBeCloseTo(home.z, 9);
    expect(inChair(stage, who)).toEqual([]);
    // Away and back, it stays where it was pushed.
    const pushed = chair.position.clone();
    show(stage, 3);
    show(stage, 6.5);
    expect(chair.position.distanceTo(pushed)).toBeLessThan(1e-9);
    // Down onto it and in to the table with it, without a jump.
    last.copy(rig.group.position); lastChair.copy(chair.position); jump = 0; shove = 0;
    for (let f = 1; f <= 60; f++) {
      show(stage, 6.5 + f / 60);
      jump = Math.max(jump, rig.group.position.distanceTo(last));
      shove = Math.max(shove, chair.position.distanceTo(lastChair));
      last.copy(rig.group.position); lastChair.copy(chair.position);
    }
    expect(jump).toBeLessThan(.15);
    expect(shove).toBeLessThan(.15);
    expect(chair.position.distanceTo(home)).toBeLessThan(1e-9);
    expect(rig.group.position.distanceTo(seated)).toBeLessThan(1e-9);
  });

  it('goes back to the same place on a seek, and stays put while paused', () => {
    const stage = stageFor('mamma'), chair = chairOf(stage), rig = stage.actors.get('mamma')!.rig;
    show(stage, 1.3);
    const held = [chair.position.toArray(), rig.group.position.toArray()];
    for (const t of [3, .5, 7.1, 1.3]) show(stage, t);
    expect([chair.position.toArray(), rig.group.position.toArray()]).toEqual(held);
    stage.update({ id: 'chair', seconds: 1.3 }, new Set(), { x: 30, y: 0 }, 50, 0, false);
    expect([chair.position.toArray(), rig.group.position.toArray()]).toEqual(held);
  });

  it('in reduced motion still clears the chair, without the clip', () => {
    const stage = stageFor('mamma'), chair = chairOf(stage);
    show(stage, .9, true);
    const home = chair.position.clone();
    for (let f = 0; f <= 60; f++) show(stage, .9 + f / 60, true);
    expect(home.x - chair.position.x).toBeGreaterThan(.4);
    expect(inChair(stage, 'mamma')).toEqual([]);
  });
});
