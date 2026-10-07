import { Box3, InstancedMesh, Mesh, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { drawingAt, sippingAt } from '../../src/render/acting';
import { createStage, type Stage } from '../../src/render/stage';
import type { Rig, Role } from '../../src/render/rig';

beforeEach(() => {
  const context = Object.fromEntries(['fillRect', 'beginPath', 'lineTo', 'moveTo', 'closePath', 'fill', 'stroke', 'arc', 'ellipse'].map(name => [name, () => {}]));
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => context }) });
});
afterEach(() => vi.unstubAllGlobals());

const stageFor = () => createStage(prolog, () => 0);
const thing = (stage: Stage, name: string) => stage.group.getObjectByName(name)!;
const position = (stage: Stage, name: string) => thing(stage, name).getWorldPosition(new Vector3());
const actor = (stage: Stage, who: Role) => stage.actors.get(who)!.rig;
// Zero weight reads the solved palm without changing its reach or orientation.
const palm = (rig: Rig, side: 0 | 1) => rig.grip(side, new Vector3(), new Vector3(0, 1, 0), new Vector3(), 0);
function show(stage: Stage, id: string, seconds: number, calm = false, dt = 1 / 60, clock = seconds) {
  const scenes = prolog.scenes!, before = scenes.findIndex(scene => scene.id === id);
  const flags = new Set(scenes.slice(0, before).map(scene => scene.by?.done ?? `scene:${scene.id}`));
  stage.update({ id, seconds }, flags, { x: 2.6, y: 0 }, clock, dt, calm);
  stage.group.updateMatrixWorld(true);
}
function snapshot(stage: Stage) {
  return {
    actors: (['mamma', 'moa'] as const).map(who => {
      const rig = actor(stage, who), mesh = rig.group.children[0] as InstancedMesh;
      return { position: rig.group.position.toArray(), rotation: rig.group.quaternion.toArray(),
        joints: Array.from(mesh.instanceMatrix.array), left: palm(rig, 0).toArray(), right: palm(rig, 1).toArray() };
    }),
    props: ['drawing', 'mug', 'crayon'].map(name => {
      const object = thing(stage, `stage-thing:${name}`);
      return { visible: object.visible, matrix: object.matrixWorld.toArray() };
    }),
  };
}

describe.each(['title', 'morgon'])('%s paper and mug contacts', id => {
  it('keeps the drawing fully on the table with Moa seated at its end', () => {
    const stage = stageFor();
    show(stage, id, .6);
    const table = new Box3().setFromObject(thing(stage, 'furniture:table'));
    const sheet = thing(stage, 'stage-thing:drawing') as Mesh;
    const vertices = sheet.geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) {
      const point = new Vector3().fromBufferAttribute(vertices, i).applyMatrix4(sheet.matrixWorld);
      expect(point.x).toBeGreaterThan(table.min.x); expect(point.x).toBeLessThan(table.max.x);
      expect(point.z).toBeGreaterThan(table.min.z); expect(point.z).toBeLessThan(table.max.z);
      expect(point.y - table.max.y).toBeGreaterThan(0);
      expect(point.y - table.max.y).toBeLessThan(.02);
    }
    const chair = stage.group.children.find(piece => piece.name === 'furniture:chair' && piece.rotation.y === -Math.PI / 2)!;
    const seat = new Box3().setFromObject(chair.children[0]!);
    const hips = actor(stage, 'moa').group.position;
    expect(hips.x).toBeGreaterThan(seat.min.x + .15); expect(hips.x).toBeLessThan(seat.max.x - .15);
    expect(hips.z).toBeGreaterThan(seat.min.z + .15); expect(hips.z).toBeLessThan(seat.max.z - .15);
    expect(sheet.visible).toBe(true);
  });

  it('supports the paper and makes marks with the crayon tip, lifting between them', () => {
    const stage = stageFor(), rig = actor(stage, 'moa');
    const heights: number[] = [];
    for (const seconds of [0, .025, .1, .55, 1.25, 1.7, 2.4, 2.9, 3.6]) {
      show(stage, id, seconds);
      const pen = drawingAt(seconds, false, 'moa'), tip = position(stage, 'drawing-crayon-tip');
      expect(palm(rig, 0).distanceTo(position(stage, 'drawing-paper-support')), `support at ${seconds}`).toBeLessThan(1e-5);
      expect(tip.distanceTo(position(stage, 'drawing-paper-contact')), `tip at ${seconds}`).toBeLessThan(1e-5);
      expect(palm(rig, 1).distanceTo(position(stage, 'drawing-crayon-grip'))).toBeLessThan(1e-5);
      expect(position(stage, 'stage-thing:crayon').distanceTo(position(stage, 'drawing-crayon-grip'))).toBeLessThan(1e-8);
      expect(thing(stage, 'drawing-paper-contact').userData.contact).toBe(pen.contact);
      const gap = tip.y - position(stage, 'stage-thing:drawing').y;
      if (pen.contact) expect(gap).toBeCloseTo(.008, 5);
      else expect(gap).toBeGreaterThan(.04);
      heights.push(gap);
    }
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(.08);
  });

  it('brings the near rim to Sofie’s mouth while her palm stays around the mug’s side', () => {
    const stage = stageFor(), rig = actor(stage, 'mamma');
    show(stage, id, .6);
    const lowered = position(stage, 'stage-thing:mug');
    for (const seconds of [2.05, 2.3, 2.65, 2.9]) {
      expect(sippingAt(seconds, false, 'mamma').raise).toBe(1);
      show(stage, id, seconds);
      const mug = thing(stage, 'stage-thing:mug');
      const lip = new Vector3(0, .16, -.15).applyMatrix4(mug.matrixWorld);
      expect(lip.distanceTo(rig.mouth(new Vector3())), `rim at ${seconds}`).toBeLessThan(1e-5);
      expect(lip.distanceTo(position(stage, 'sipping-mouth'))).toBeLessThan(1e-5);
      expect(palm(rig, 0).distanceTo(position(stage, 'sipping-mug-grip'))).toBeLessThan(1e-5);
      expect(position(stage, 'stage-thing:mug').distanceTo(position(stage, 'sipping-mug-grip'))).toBeCloseTo(.18, 8);
      expect(position(stage, 'stage-thing:mug').y).toBeGreaterThan(lowered.y + .5);
    }
  });

  it('reconstructs drawing and sipping after a seek, and holds both during pause', () => {
    const stage = stageFor();
    show(stage, id, 2.3);
    const held = snapshot(stage);
    for (const seconds of [3.6, .55, 2.3]) show(stage, id, seconds);
    expect(snapshot(stage)).toEqual(held);
    for (const clock of [10, 50, 600]) show(stage, id, 2.3, false, 0, clock);
    expect(snapshot(stage)).toEqual(held);
  });

  it('holds quiet paper and chest-height mug poses in calmer mode', () => {
    const stage = stageFor();
    show(stage, id, .6, true);
    const held = snapshot(stage);
    for (const seconds of [1.25, 2.3, 3.6, 4.6]) {
      show(stage, id, seconds, true);
      expect(snapshot(stage)).toEqual(held);
      expect(thing(stage, 'drawing-paper-contact').userData.contact).toBe(true);
      expect(position(stage, 'stage-thing:mug').y).toBeLessThan(position(stage, 'sipping-mouth').y - .5);
    }
  });
});

it('shows the drawing below Moa’s face with both palms on its lower side edges', () => {
  const stage = stageFor(), rig = actor(stage, 'moa');
  for (const seconds of [2.8, 4, 6.7]) {
    show(stage, 'handen', seconds);
    const sheet = thing(stage, 'stage-thing:drawing');
    const bounds = new Box3().setFromObject(sheet);
    expect(bounds.max.y).toBeLessThan(rig.mouth(new Vector3()).y - .05);
    for (const [side, name] of [[0, 'drawing-left-grip'], [1, 'drawing-right-grip']] as const) {
      const hand = palm(rig, side), target = position(stage, name);
      expect(hand.distanceTo(target), `${name} at ${seconds}`).toBeLessThan(1e-5);
      const local = sheet.worldToLocal(hand);
      expect(Math.abs(local.x)).toBeCloseTo(.95, 5);
      expect(local.y).toBeLessThan(0); expect(local.y).toBeGreaterThan(-.75);
      expect(local.z).toBeCloseTo(0, 5);
    }
  }
});

it('releases the drawing hands continuously when Moa sits back and when she puts the picture down', () => {
  for (const [id, at, prop] of [['morgon', 8.4, 'crayon'], ['handen', 8, 'drawing']] as const) {
    const stage = stageFor(), rig = actor(stage, 'moa');
    show(stage, id, at - 1e-6);
    const before = [palm(rig, 0), palm(rig, 1)];
    show(stage, id, at);
    for (const side of [0, 1] as const) expect(palm(rig, side).distanceTo(before[side]!), `${id} hand ${side}`).toBeLessThan(1e-4);
    expect(thing(stage, `stage-thing:${prop}`).visible).toBe(false);
    show(stage, id, at + .6);
    expect(palm(rig, 1).distanceTo(before[1]!)).toBeGreaterThan(.1);
  }
});

it('keeps Sofie’s raised mug and supporting hand continuous when the morning gives way to the waking scene', () => {
  const stage = stageFor(), rig = actor(stage, 'mamma');
  show(stage, 'morgon', 10.5);
  const mug = thing(stage, 'stage-thing:mug');
  const hand = palm(rig, 0), centre = mug.position.clone(), turn = mug.quaternion.clone();
  show(stage, 'vaknar', 0);
  expect(palm(rig, 0).distanceTo(hand)).toBeLessThan(1e-4);
  expect(mug.position.distanceTo(centre)).toBeLessThan(1e-4);
  expect(mug.quaternion.angleTo(turn)).toBeLessThan(1e-4);
  expect(mug.visible).toBe(true);
  let previous = mug.position.clone();
  for (let frame = 1; frame <= 36; frame++) {
    show(stage, 'vaknar', frame / 60);
    expect(mug.position.distanceTo(previous)).toBeLessThan(.12);
    previous.copy(mug.position);
  }
  expect(mug.position.y).toBeLessThan(centre.y - .5);
  show(stage, 'vaknar', .2);
  const held = { mug: mug.matrixWorld.toArray(), palm: palm(rig, 0).toArray() };
  show(stage, 'vaknar', .65);
  show(stage, 'vaknar', .2);
  expect({ mug: mug.matrixWorld.toArray(), palm: palm(rig, 0).toArray() }).toEqual(held);
  show(stage, 'vaknar', .2, false, 0, 500);
  expect({ mug: mug.matrixWorld.toArray(), palm: palm(rig, 0).toArray() }).toEqual(held);
  const restored = stageFor();
  show(restored, 'vaknar', .2);
  expect(position(restored, 'stage-thing:mug').distanceTo(mug.position)).toBeLessThan(1e-5);
});

it('finishes the sip during free play, freezes on pause, and keeps its actual phase when the next scene begins', () => {
  for (const wait of [.2, 4]) {
    const stage = stageFor(), rig = actor(stage, 'mamma');
    show(stage, 'morgon', 10.5);
    const mug = thing(stage, 'stage-thing:mug'), flags = new Set(['scene:morgon']);
    let previous = mug.position.clone();
    for (let frame = 1; frame <= wait * 60; frame++) {
      stage.update(null, flags, { x: 2.6, y: 0 }, 20 + frame / 60, 1 / 60, false);
      expect(mug.position.distanceTo(previous)).toBeLessThan(.12);
      previous.copy(mug.position);
    }
    const hand = palm(rig, 0), centre = mug.position.clone(), turn = mug.quaternion.clone();
    for (const clock of [50, 900]) {
      stage.update(null, flags, { x: 2.6, y: 0 }, clock, 0, false);
      expect(palm(rig, 0).distanceTo(hand)).toBeLessThan(1e-8);
      expect(mug.position.distanceTo(centre)).toBeLessThan(1e-8);
    }
    if (wait === 4) {
      expect(centre.y).toBeLessThan(rig.mouth(new Vector3()).y - .5);
      for (let frame = 0; frame < 420; frame++) stage.update(null, flags, { x: 2.6, y: 0 }, 900 + frame / 60, 1 / 60, false);
      expect(mug.position.distanceTo(centre)).toBeLessThan(1e-8);
    }
    show(stage, 'vaknar', 0);
    expect(palm(rig, 0).distanceTo(hand)).toBeLessThan(1e-5);
    expect(mug.position.distanceTo(centre)).toBeLessThan(1e-5);
    expect(mug.quaternion.angleTo(turn)).toBeLessThan(1e-5);
  }
});

it('releases the discarded mug hand through the scene end and finishes lowering in free play', () => {
  const stage = stageFor(), rig = actor(stage, 'mamma');
  show(stage, 'prologue:mamma', 2.4 - 1e-6);
  const raised = palm(rig, 0);
  show(stage, 'prologue:mamma', 2.4);
  expect(palm(rig, 0).distanceTo(raised)).toBeLessThan(1e-4);
  expect(thing(stage, 'stage-thing:mug').visible).toBe(false);
  show(stage, 'prologue:mamma', 2.6);
  const halfway = palm(rig, 0), flags = new Set(['scene:morgon', 'scene:vaknar', 'mamma:passed']);
  // Keep the follower at its existing place so this measures only the hand's release.
  const elof = { x: rig.group.position.x + 5.2, y: 0 };
  stage.update(null, flags, elof, 40, 0, false);
  expect(palm(rig, 0).distanceTo(halfway)).toBeLessThan(1e-8);
  let previous = halfway;
  for (let frame = 1; frame <= 24; frame++) {
    stage.update(null, flags, elof, 40 + frame / 60, 1 / 60, false);
    const now = palm(rig, 0);
    expect(now.distanceTo(previous)).toBeLessThan(.12);
    previous = now;
  }
  expect(previous.distanceTo(halfway)).toBeGreaterThan(.3);
  expect(thing(stage, 'stage-thing:mug').visible).toBe(false);
});
