import { InstancedMesh, Matrix4, Mesh, Raycaster, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { garden } from '../../src/content/chapters/garden';
import { PROLOG_SCENES, TITLE_TABLEAU } from '../../src/content/chapters/prolog-scenes';
import { createStage, type Stage } from '../../src/render/stage';
import type { SceneDef } from '../../src/sim/scene';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

const morning = PROLOG_SCENES.find(scene => scene.id === 'morgon')!;
const stageFor = (scene: SceneDef) => createStage({ ...garden, furniture: [], scenes: [scene] }, () => 0);
const actor = (stage: Stage) => stage.actors.get('pappa')!.rig;
const thing = (stage: Stage, name: string) => stage.group.getObjectByName(name)!;
const position = (stage: Stage, name: string) => thing(stage, name).getWorldPosition(new Vector3());
function show(stage: Stage, scene: SceneDef, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  stage.update({ id: scene.id, seconds }, new Set(), { x: 2.2, y: 0 }, clock, dt, calm);
  stage.group.updateMatrixWorld(true);
}
function snapshot(stage: Stage) {
  const rig = actor(stage), mesh = rig.group.children[0] as InstancedMesh;
  const knife = thing(stage, 'stage-thing:knife');
  const shavings = thing(stage, 'carving-shavings') as InstancedMesh;
  return {
    position: rig.group.position.toArray(),
    rotation: rig.group.quaternion.toArray(),
    joints: Array.from(mesh.instanceMatrix.array),
    left: rig.hand(0, new Vector3()).toArray(),
    right: rig.hand(1, new Vector3()).toArray(),
    knife: knife.matrixWorld.toArray(),
    grip: position(stage, 'carving-knife-grip').toArray(),
    tip: position(stage, 'carving-knife-tip').toArray(),
    support: position(stage, 'carving-support-target').toArray(),
    contact: position(stage, 'carving-knife-contact').toArray(),
    cut: thing(stage, 'carving-knife-contact').userData.cut as number,
    shavings: shavings.visible ? Array.from(shavings.instanceMatrix.array.slice(0, shavings.count * 16)) : [],
  };
}

describe.each([TITLE_TABLEAU, morning])('$id carving on stage', scene => {
  it('keeps the support hand planted and the knife tip on its moving contact target', () => {
    const stage = stageFor(scene);
    // Sample cutting, lifted recovery and inspection, including a second loop and a shrinking blank.
    for (const seconds of [.55, 1.07, 1.4, 1.91, 2.12, 2.7, 3.5, 5.1, 6.5]) {
      show(stage, scene, seconds);
      const rig = actor(stage);
      expect(rig.hand(0, new Vector3()).distanceTo(position(stage, 'carving-support-target')), `support at ${seconds}`).toBeLessThan(1e-5);
      expect(position(stage, 'carving-knife-tip').distanceTo(position(stage, 'carving-knife-contact')), `blade tip at ${seconds}`).toBeLessThan(1e-5);
      expect(position(stage, 'stage-thing:knife').distanceTo(position(stage, 'carving-knife-grip'))).toBeLessThan(1e-8);
      expect(thing(stage, 'stage-thing:knife').visible).toBe(true);
    }
  });

  it('puts real cuts on the wooden surface and raises the returning blade clear', () => {
    const stage = stageFor(scene);
    const ray = new Raycaster(), radial = new Vector3();
    for (const [seconds, cutting] of [[1.07, true], [1.42, false], [1.91, true], [2.18, false], [2.7, false]] as const) {
      show(stage, scene, seconds);
      const block = thing(stage, 'stage-block') as Mesh;
      const tip = position(stage, 'carving-knife-tip');
      radial.copy(tip).sub(block.getWorldPosition(new Vector3())).setY(0).normalize();
      ray.set(tip.clone().addScaledVector(radial, .3), radial.clone().negate());
      const hits = ray.intersectObject(block, false);
      expect(hits.length, `surface at ${seconds}`).toBeGreaterThan(0);
      const gap = hits[0]!.point.distanceTo(tip);
      if (cutting) {
        expect(thing(stage, 'carving-knife-contact').userData.cut).toBeGreaterThan(.5);
        expect(gap, `cut gap at ${seconds}`).toBeLessThan(1e-5);
      } else {
        expect(thing(stage, 'carving-knife-contact').userData.cut).toBe(0);
        expect(gap, `lift at ${seconds}`).toBeGreaterThan(.025);
      }
    }
  });

  it('reconstructs the same hands, blade and falling shavings after a seek or paused update', () => {
    const stage = stageFor(scene);
    show(stage, scene, 1.15);
    const held = snapshot(stage);
    expect(held.shavings.length).toBeGreaterThan(0);
    for (const seconds of [2.7, .55, 5.1, 1.15]) show(stage, scene, seconds);
    expect(snapshot(stage)).toEqual(held);
    // A changing external clock must not move an authored scene whose own time is paused.
    for (const clock of [8, 30, 600]) show(stage, scene, 1.15, false, 0, clock);
    expect(snapshot(stage)).toEqual(held);
  });

  it('has no cuts or flying shavings in calmer mode, including after moving normally', () => {
    const stage = stageFor(scene);
    show(stage, scene, 1.15);
    expect(thing(stage, 'carving-shavings').visible).toBe(true);
    for (const seconds of [.55, 1.07, 1.42, 1.91, 2.7, 5.1, 6.5]) {
      show(stage, scene, seconds, true);
      expect(thing(stage, 'carving-knife-contact').userData.cut).toBe(0);
      expect(thing(stage, 'carving-shavings').visible).toBe(false);
      expect(position(stage, 'carving-knife-tip').distanceTo(position(stage, 'carving-knife-contact'))).toBeLessThan(1e-5);
    }
  });
});

it('holds one steady carving pose under the title in calmer mode', () => {
  const stage = stageFor(TITLE_TABLEAU);
  show(stage, TITLE_TABLEAU, .6, true);
  const held = snapshot(stage);
  for (const seconds of [1.07, 1.42, 1.91, 2.7, 5.1, 60]) {
    show(stage, TITLE_TABLEAU, seconds, true);
    expect(snapshot(stage)).toEqual(held);
  }
});

it('fades the last morning shavings continuously before their scene effect ends', () => {
  const stage = stageFor(morning), matrix = new Matrix4();
  const shavings = thing(stage, 'carving-shavings') as InstancedMesh;
  const largestShaving = (seconds: number) => {
    show(stage, morning, seconds);
    expect(shavings.visible).toBe(true);
    let largest = 0;
    for (let i = 0; i < shavings.count; i++) {
      shavings.getMatrixAt(i, matrix);
      largest = Math.max(largest, matrix.getMaxScaleOnAxis());
    }
    return largest;
  };
  const full = largestShaving(6.8);
  expect(full).toBeGreaterThan(.1);
  expect(largestShaving(6.95)).toBeLessThan(full * .3);
  expect(largestShaving(6.999)).toBeLessThan(full * .01);
  expect(largestShaving(7)).toBeLessThan(1e-8);
  show(stage, morning, 7.001);
  expect(shavings.visible).toBe(false);
});

it('releases both carving contacts into blowing and reaching, and restores them on rewind', () => {
  const stage = stageFor(morning), rig = actor(stage);
  show(stage, morning, 7.2 - 1e-6);
  const before = [rig.hand(0, new Vector3()), rig.hand(1, new Vector3())];
  show(stage, morning, 7.2);
  for (const side of [0, 1] as const) expect(rig.hand(side, new Vector3()).distanceTo(before[side]!)).toBeLessThan(1e-4);
  expect(thing(stage, 'stage-thing:knife').visible).toBe(false);
  for (const seconds of [7.7, 8.6]) {
    show(stage, morning, seconds);
    expect(rig.hand(0, new Vector3()).distanceTo(position(stage, 'carving-support-target'))).toBeGreaterThan(.1);
    expect(rig.hand(1, new Vector3()).distanceTo(before[1]!)).toBeGreaterThan(.1);
    expect(thing(stage, 'stage-thing:knife').visible).toBe(false);
    expect(thing(stage, 'carving-knife-contact').userData.cut).toBe(0);
  }
  show(stage, morning, 1.07);
  expect(rig.hand(0, new Vector3()).distanceTo(position(stage, 'carving-support-target'))).toBeLessThan(1e-5);
  expect(position(stage, 'carving-knife-tip').distanceTo(position(stage, 'carving-knife-contact'))).toBeLessThan(1e-5);
  expect(thing(stage, 'stage-thing:knife').visible).toBe(true);
});
