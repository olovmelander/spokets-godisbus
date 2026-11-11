import { readFileSync } from 'node:fs';
import { Box3, Group, InstancedMesh, Matrix4, Mesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBB } from 'three/addons/math/OBB.js';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { prolog } from '../../src/content/chapters/ends';
import { HOME_LAYOUT } from '../../src/content/home-layout';
import { createStage, type Stage } from '../../src/render/stage';
import { MAMMA_TIME } from '../../src/sim/prologue';
import type { Role } from '../../src/render/rig';
import { stubCanvas } from './canvas-stub';

const family: Role[] = ['mamma', 'pappa', 'moa', 'bertil'];
const scenes = prolog.scenes!, wake = scenes.find(scene => scene.id === 'vaknar')!;
const told = (id: string) => new Set(scenes.slice(0, scenes.findIndex(scene => scene.id === id)).map(scene => scene.by?.done ?? `scene:${scene.id}`));
let sofa: Group;
beforeAll(async () => {
  stubCanvas();
  const bytes = readFileSync(new URL('../../art/baked/aventyr2/room.glb', import.meta.url));
  const room = (await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
  sofa = new Group();
  sofa.add(room.getObjectByName('soffa')!.clone(true));
  sofa.position.set(HOME_LAYOUT.living.sofa.x, 0, HOME_LAYOUT.living.sofa.z);
  sofa.updateMatrixWorld(true);
});
afterAll(() => vi.unstubAllGlobals());

function show(stage: Stage, id: string, seconds: number, calm: boolean, dt = 1 / 60, clock = seconds) {
  stage.update({ id, seconds }, told(id), { x: prolog.prologue!.doorway.x - 1.1, y: 0 }, clock, dt, calm);
  stage.group.updateMatrixWorld(true);
}
function parts(stage: Stage, who: Role) {
  const mesh = stage.actors.get(who)!.rig.group.children[0] as InstancedMesh, matrix = new Matrix4();
  mesh.geometry.computeBoundingBox();
  return Array.from({ length: mesh.count }, (_, i) => {
    mesh.getMatrixAt(i, matrix); matrix.premultiply(mesh.matrixWorld);
    return new OBB().fromBox3(mesh.geometry.boundingBox!).applyMatrix4(matrix);
  });
}
function solids(stage: Stage) {
  const boxes: { name: string; box: OBB }[] = [];
  for (const piece of [...stage.group.children.filter(child => child.name.startsWith('furniture:')), sofa]) {
    piece.traverse(child => {
      if (child instanceof Mesh) boxes.push({ name: `${piece.name || 'baked sofa'}:${child.name}`, box: new OBB().fromBox3(new Box3().setFromObject(child, true).expandByScalar(-.005)) });
    });
  }
  return boxes;
}
function snapshot(stage: Stage) {
  return family.map(who => {
    const group = stage.actors.get(who)!.rig.group;
    return [group.position.toArray(), group.quaternion.toArray(), Array.from((group.children[0] as InstancedMesh).instanceMatrix.array)];
  });
}

describe('the family visits the actual window in the furnished room', () => {
  it.each([false, true])('walks out and back without entering table, chairs, sofa or each other (calm=%s)', calm => {
    const stage = createStage(prolog, () => 0), problems = new Map<string, string>();
    for (const [id, from, to] of [['vaknar', 2, 12.8], ['prologue:mamma', 0, MAMMA_TIME]] as const) {
      let previous: Vector3[] | undefined;
      for (let f = 0; f <= Math.ceil((to - from) * 60); f++) {
        const seconds = Math.min(to, from + f / 60);
        show(stage, id, seconds, calm);
        const obstacles = solids(stage), bodies = family.map(who => parts(stage, who));
        const positions = family.map(who => stage.actors.get(who)!.rig.group.position.clone());
        for (const [i, who] of family.entries()) {
          const collisions = bodies[i]!.flatMap((part, index) => obstacles.filter(solid => part.intersectsOBB(solid.box)).map(solid => `${index}:${solid.name}`));
          if (collisions.length && !problems.has(`${id}:${who}:furniture`)) problems.set(`${id}:${who}:furniture`, `${id} ${seconds.toFixed(3)} ${who} at ${positions[i]!.toArray()}: ${collisions.join(', ')}`);
          if (previous) expect(positions[i]!.distanceTo(previous[i]!), `${id} ${seconds} ${who} discontinuity`).toBeLessThan(.09);
          // Trunks/heads must not pass through another actor; hand gestures may share the space between them.
          for (let j = i + 1; j < family.length; j++) {
            for (const a of [0, 1]) for (const b of [0, 1]) if (bodies[i]![a]!.intersectsOBB(bodies[j]![b]!) && !problems.has(`${id}:${who}:${family[j]}`)) problems.set(`${id}:${who}:${family[j]}`, `${id} ${seconds.toFixed(3)} ${who}/${family[j]} body overlap`);
          }
        }
        previous = positions;
      }
    }
    expect([...problems.values()]).toEqual([]);
  });

  it('gathers all four by the landed bird before the ghost wakes, keeping Elof with the carving', () => {
    const stage = createStage(prolog, () => 0), bird = wake.stage!.fx!.find(fx => fx.kind === 'jay')!;
    const awakening = wake.stage!.actors!.ghost!.find(key => key.act === 'wake')!.at;
    show(stage, 'vaknar', awakening - .1, false);
    for (const who of family) {
      const rig = stage.actors.get(who)!.rig;
      expect(Math.hypot(rig.group.position.x - bird.from.x, rig.group.position.z - bird.from.z!), who).toBeLessThan(3.5);
      expect(rig.group.position.z, who).toBeLessThan(-6);
      const ahead = new Vector3(0, 0, 1).applyQuaternion(rig.group.quaternion);
      const towards = new Vector3(bird.from.x - rig.group.position.x, 0, bird.from.z! - rig.group.position.z).normalize();
      expect(ahead.dot(towards), `${who} faces the jay`).toBeGreaterThan(.98);
    }
    expect(bird.seconds).toBeGreaterThanOrEqual(wake.seconds);
    expect(wake.stage!.elof!.every(key => key.lift === undefined && key.rides === undefined)).toBe(true);
  });

  it('reconstructs both journeys and freezes their exact poses during Pause', () => {
    for (const [id, at] of [['vaknar', 7.2], ['prologue:mamma', 4.7]] as const) {
      const stage = createStage(prolog, () => 0);
      show(stage, id, at, false); const held = snapshot(stage);
      for (const t of [at + 1, .1, at]) show(stage, id, t, false);
      expect(snapshot(stage)).toEqual(held);
      show(stage, id, at, false, 0, 900);
      expect(snapshot(stage)).toEqual(held);
      const restored = createStage(prolog, () => 0);
      show(restored, id, at, false);
      expect(snapshot(restored)).toEqual(held);
    }
  });

});
