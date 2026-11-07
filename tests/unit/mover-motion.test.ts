import { Group } from 'three';
import { describe, expect, it } from 'vitest';
import { createMoverMotion } from '../../src/render/mover-motion';
import type { Mover } from '../../src/sim/types';

/** The puzzles' things have weight as they move, and are drawn exactly where they are at rest (the graphics pass of 6 November 2026). */
const mover = (more: Partial<Mover> = {}): Mover => ({ id: 'm', width: 1.2, height: 1.5, verb: 'push', stops: [{ x: 0, y: 0 }], ...more } as Mover);

describe('the movers\' motion', () => {
  it('leans into a push, rocks to rest, and ends upright where the simulation has it', () => {
    const mesh = new Group();
    const motion = createMoverMotion([mover()], [mesh]);
    let x = 0, most = 0;
    for (let f = 0; f < 60; f++) {
      x += f < 30 ? 2 / 60 : 0;
      motion.update([{ x, y: 0 }], 1 / 60, false);
      most = Math.max(most, Math.abs(mesh.rotation.z));
    }
    expect(most).toBeGreaterThan(0.01);
    for (let f = 0; f < 240; f++) motion.update([{ x, y: 0 }], 1 / 60, false);
    expect(Math.abs(mesh.rotation.z)).toBeLessThan(1e-3);
    expect(mesh.position.x).toBeCloseTo(x, 6);
    expect(mesh.scale.y).toBeCloseTo(1, 3);
  });

  it('squashes landing after a drop, and springs back', () => {
    const mesh = new Group();
    const motion = createMoverMotion([mover({ verb: 'pull' })], [mesh]);
    let y = 3.3, least = 1;
    for (let f = 0; f < 90; f++) {
      if (f < 20) y = Math.max(0, y - (f / 60) * 9.8 / 60 * 30);
      else y = 0;
      motion.update([{ x: 0, y }], 1 / 60, false);
      least = Math.min(least, mesh.scale.y);
    }
    expect(least).toBeLessThan(0.99);
    for (let f = 0; f < 240; f++) motion.update([{ x: 0, y: 0 }], 1 / 60, false);
    expect(mesh.scale.y).toBeCloseTo(1, 3);
  });

  it('with less motion, is drawn exactly where it is, upright', () => {
    const mesh = new Group();
    const motion = createMoverMotion([mover()], [mesh]);
    for (let f = 0; f < 30; f++) motion.update([{ x: f * 0.05, y: 0 }], 1 / 60, true);
    expect(mesh.rotation.z).toBe(0);
    expect(mesh.scale.y).toBe(1);
    expect(mesh.position.x).toBeCloseTo(29 * 0.05, 6);
  });
});
