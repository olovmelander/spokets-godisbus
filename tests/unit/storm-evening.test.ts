import { stubCanvas } from './canvas-stub';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Vector3 } from 'three';
import { stormkvall } from '../../src/content/aventyr2/chapters/stormkvall';
import { createStage } from '../../src/render/stage';

const elof = { x: 6.4, y: 0 };
const seen = new Set(['scene:kvall', 'goodnight', 'scene:fonstret', 'scene:klonkstar', 'star']);
beforeEach(() => stubCanvas());
afterEach(() => vi.unstubAllGlobals());

describe('the family discovers a small Elof after the magic', () => {
  it('keeps every family member turned away throughout the bite and shrinking', () => {
    for (const seconds of [1.8, 3.8, 5.8, 7.2]) {
      const stage = createStage(stormkvall, () => 0);
      stage.update({ id: 'krymper', seconds }, seen, elof, seconds, 0, false);
      for (const { rig } of stage.actors.values()) {
        const toward = new Vector3(elof.x, 0, 0).sub(rig.group.position).setY(0).normalize();
        const forward = new Vector3(0, 0, 1).applyQuaternion(rig.group.quaternion);
        expect(forward.dot(toward), `${rig.group.name} at ${seconds}`).toBeLessThan(0);
      }
    }
  });

  it('turns Moa towards his actual floor position before he answers the discovery', () => {
    const stage = createStage(stormkvall, () => 0);
    stage.update({ id: 'upptackt', seconds: 5 }, new Set([...seen, 'scene:krymper']), elof, 5, 0, false);
    const moa = stage.actors.get('moa')!.rig.group;
    const toward = new Vector3(elof.x, 0, 0).sub(moa.position).setY(0).normalize();
    expect(new Vector3(0, 0, 1).applyQuaternion(moa.quaternion).dot(toward)).toBeGreaterThan(.98);
  });

  it('lets visible window air flow while a line is read, but holds it on Pause', () => {
    const stage = createStage(stormkvall, () => 0), frame = { id: 'fonstret', seconds: 2.6 };
    const flags = new Set(['scene:kvall', 'goodnight', 'gust']);
    stage.update(frame, flags, elof, 2.6, .016, false);
    const air = stage.group.getObjectByName('window-wind') as InstancedMesh;
    expect(air.count).toBe(24);
    const first = [...air.instanceMatrix.array];
    for (let i = 0; i < 30; i++) stage.update(frame, flags, elof, 2.6, 1 / 60, false);
    expect([...air.instanceMatrix.array]).not.toEqual(first);
    const held = [...air.instanceMatrix.array];
    stage.update(frame, flags, elof, 2.6, 0, false);
    expect([...air.instanceMatrix.array]).toEqual(held);
    stage.update({ id: 'klonkstar', seconds: 2.1 }, new Set([...flags, 'scene:fonstret', 'window:shut']), elof, 2.1, 0, false);
    expect(air.visible).toBe(false);
  });
});
