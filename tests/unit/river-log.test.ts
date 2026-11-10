import { Box3, Vector3, type Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { AVENTYR2 } from '../../src/content/aventyr2/aventyr2';
import { moverProp } from '../../src/render/props';
import type { Mover } from '../../src/sim/types';

/**
 * Älven's floating logs (src/content/aventyr2/river-log.ts): he stands on them, not in the air over them (Olov: "På
 * stockarna som man väntar in och hoppar på står man i luften ovanför stocken, inte på den"). The simulation's thing is a
 * box `width` long and `height` high from where it is, and his feet are on its top; the picture is measured against it.
 */
const alven = AVENTYR2.find((chapter) => chapter.id === 'alven')!;
const logs = (alven.movers ?? []).filter((mover) => mover.look === 'riverLog');

/** Every corner of what is drawn for a thing, where it is in the thing's own place (its foot at 0). */
function corners(prop: Object3D): Vector3[] {
  prop.updateMatrixWorld(true);
  const out: Vector3[] = [];
  prop.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const at = mesh.geometry.getAttribute('position');
    for (let i = 0; i < at.count; i++) out.push(new Vector3().fromBufferAttribute(at, i).applyMatrix4(mesh.matrixWorld));
  });
  return out;
}

describe("Älven's floating logs", () => {
  it('are the eddies\' three, the three between the stones and the two in the lake\'s shallows', () => {
    expect(logs.map((log) => log.id)).toEqual(['al-eddy-1', 'al-eddy-2', 'al-eddy-3', 'al-log-1', 'al-log-2', 'al-log-3', 'al-roll-1', 'al-roll-2']);
  });

  it('are drawn as long and as thick as the simulation\'s thing, with the top where his feet are', () => {
    for (const log of logs) {
      const prop = moverProp(log)!;
      // Made here, and fitted to nothing that comes later: a kit's model fitted to the box sank the top under his feet.
      prop.traverse((object) => expect(object.userData.model, log.id).toBeUndefined());
      const all = corners(prop);
      const box = new Box3().setFromPoints(all);
      // Nothing stands over his feet, and the top is there.
      expect(box.max.y, log.id).toBeLessThanOrEqual(log.height + 1e-6);
      expect(box.max.y, log.id).toBeGreaterThan(log.height - 0.01);
      // End to end, as the simulation has it, and as thick as it is high.
      expect(box.min.x, log.id).toBeCloseTo(-log.width / 2, 1);
      expect(box.max.x, log.id).toBeCloseTo(log.width / 2, 1);
      expect(box.min.y, log.id).toBeGreaterThan(-0.01);
      expect(box.min.y, log.id).toBeLessThan(log.height * 0.1);
      // Along the line he walks, from end to end, the top is never more than a few hundredths under his feet.
      const line = all.filter((p) => Math.abs(p.z) < 0.05 && Math.abs(p.x) < log.width / 2 - 0.12 && p.y > log.height / 2);
      expect(line.length, log.id).toBeGreaterThan(10);
      for (const p of line) expect(p.y, `${log.id} at ${p.x.toFixed(2)}`).toBeGreaterThan(log.height - 0.04);
      // Its stubs stand out to the side, never over the line he walks.
      for (const p of all.filter((q) => q.y > log.height - 0.15)) expect(Math.abs(p.z), log.id).toBeLessThan(log.height * 0.45);
    }
  });

  it('float half under as they bob and drift: the top over the water, the bottom under it', () => {
    const waterAt = (x: number) => alven.water!.find((pool) => x >= pool.from - 1 && x <= pool.to + 1);
    for (const log of logs) {
      for (const stop of log.stops) {
        const pool = waterAt(stop.x);
        expect(pool, log.id).toBeDefined();
        expect(stop.y + log.height - pool!.y, log.id).toBeGreaterThan(0.15);
        expect(stop.y, log.id).toBeLessThan(pool!.y);
      }
    }
  });

  it('are each their own, and the same every time', () => {
    const [a, b] = logs;
    const first = corners(moverProp(a!)!).length;
    expect(corners(moverProp(a!)!).length).toBe(first);
    const shapeOf = (mover: Mover) => corners(moverProp(mover)!).map((p) => p.y.toFixed(4)).join();
    expect(shapeOf(a!)).toBe(shapeOf(a!));
    expect(shapeOf(a!)).not.toBe(shapeOf(b!));
  });
});
