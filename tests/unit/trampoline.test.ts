import { Box3, type Mesh } from 'three';
import { describe, expect, it } from 'vitest';
import { stormgard } from '../../src/content/aventyr2/chapters/stormgard';
import { createTrampoline, hollow, newCloth, TRAMPOLINE, trampolineStep } from '../../src/content/aventyr2/trampoline';
import { BERRY_HALF } from '../../src/sim/constants';

/**
 * Stormgården's trampoline (Olov, 14 November 2026: "Kan vi modellera studsmattan bättre?"; src/content/aventyr2/
 * trampoline.ts). It was a disc in a ring on four sticks that he waded through up to his knees, and the whole of it
 * went flat in a bounce. The simulation is as it was: only the picture is new.
 */

const at = stormgard.bouncers![0]!;
const { high, mat, out, weight } = TRAMPOLINE;
const FRAME = 1 / 60;

describe("Stormgården's trampoline", () => {
  it('leaves the simulation as it was, and has its mat exactly where the bounce is', () => {
    expect(at).toEqual({ x: 134, y: 0.5, lift: 3.4 });
    const made = createTrampoline(at);
    made.group.updateMatrixWorld(true);
    const cloth = new Box3().setFromObject(made.group.getObjectByName('trampoline-mat')!);
    expect(cloth.max.y).toBeCloseTo(at.y, 6);
    expect(cloth.min.y).toBeCloseTo(at.y, 6);
    // The bounce is on its cloth, well inside its edge; and it stands on the lawn, its legs' feet on the ground.
    expect(mat).toBeGreaterThan(BERRY_HALF + 0.4);
    expect((cloth.min.x + cloth.max.x) / 2).toBeCloseTo(at.x, 6);
    const whole = new Box3().setFromObject(made.group);
    expect(whole.min.y).toBeGreaterThan(at.y - high - 0.02);
    expect(whole.min.y).toBeLessThan(at.y - high + 0.06);
    // A frame of steel, the pad, its loose cushion and the mat: four draws, where there were six.
    const meshes: string[] = [];
    made.group.traverse((object) => { if ((object as Mesh).isMesh) meshes.push(object.name); });
    expect(meshes.sort()).toEqual(['trampoline-flap', 'trampoline-mat', 'trampoline-pad', 'trampoline-steel']);
  });

  it('draws him walking over it, on the pad and the mat, where the simulation has him on the lawn under it', () => {
    const cloth = newCloth();
    let highest = 0;
    // As he runs across at the simulation's ground, 3.5 EL a second.
    for (let dx = -3; dx <= 3; dx += 3.5 * FRAME) {
      const lift = trampolineStep(cloth, dx, 0, 0, FRAME, false);
      highest = Math.max(highest, lift);
      // Never under the lawn, never over the mat's level; and on the cloth he is on it, not knee-deep in it.
      expect(lift).toBeGreaterThanOrEqual(0);
      expect(lift).toBeLessThanOrEqual(high + 1e-6);
      if (Math.abs(dx) < mat - 0.35) expect(lift, `at ${dx.toFixed(2)}`).toBeGreaterThan(high - weight - 0.1);
      if (Math.abs(dx) > out + 0.9) expect(lift, `at ${dx.toFixed(2)}`).toBeLessThan(0.02);
    }
    expect(highest).toBeGreaterThan(high - weight - 0.02);
    // The cloth gives a little under his weight where he stands on it, and lies level again when he has gone.
    const stood = newCloth();
    for (let i = 0; i < 90; i++) trampolineStep(stood, 0, 0, 0, FRAME, false);
    expect(stood.deep).toBeCloseTo(weight, 2);
    expect(stood.lift).toBeCloseTo(high - weight, 2);
    for (let i = 0; i < 120; i++) trampolineStep(stood, 6, 0, 0, FRAME, false);
    expect(Math.abs(stood.deep)).toBeLessThan(0.005);
    expect(stood.lift).toBe(0);
  });

  it('gives where he lands in a bounce, takes him down with it, throws him, and settles', () => {
    const cloth = newCloth();
    // The simulation: he comes down onto the bouncer's top, and from that step on is thrown up, 3.4 EL high.
    const speed = Math.sqrt(2 * 30 * at.lift);
    let deepest = 0, lowest = Infinity, heldFor = 0, squash = 1;
    for (let frame = 0; frame < 54; frame++) {
      const t = frame * FRAME;
      const feet = high + speed * t - 15 * t * t;
      const lift = trampolineStep(cloth, 0.1, feet, squash, FRAME, false);
      squash = Math.max(0, squash - FRAME / 0.35);
      deepest = Math.max(deepest, cloth.deep);
      lowest = Math.min(lowest, feet + lift);
      if (cloth.holds) {
        heldFor = t + FRAME;
        // While it holds him he is on the cloth, in its hollow.
        expect(feet + lift).toBeCloseTo(high - hollow(0.1, -TRAMPOLINE.back, cloth.foot, -TRAMPOLINE.back, Math.max(0, cloth.deep)), 5);
      }
      // He is never drawn above where the simulation has him, nor through the cloth.
      expect(lift).toBeLessThanOrEqual(1e-6);
      expect(feet + lift).toBeGreaterThan(high - 0.4);
    }
    // A hollow a third of him deep, for a moment a child can see and no longer.
    expect(deepest).toBeGreaterThan(0.22);
    expect(deepest).toBeLessThan(0.37);
    expect(lowest).toBeLessThan(high - 0.2);
    expect(heldFor).toBeGreaterThan(0.08);
    expect(heldFor).toBeLessThanOrEqual(0.25 + FRAME);
    // Then he is where the simulation has him, and the cloth lies level.
    expect(Math.abs(cloth.lift)).toBeLessThan(0.01);
    expect(Math.abs(cloth.deep)).toBeLessThan(0.01);
    expect(cloth.holds).toBe(false);
  });

  it('lies still with less motion asked for, and still has him on it and not in it', () => {
    const cloth = newCloth();
    expect(trampolineStep(cloth, 0, 0, 0, FRAME, true)).toBeCloseTo(high, 6);
    // A bounce: no hollow, nothing held back; he is drawn where the simulation has him.
    expect(trampolineStep(cloth, 0, high, 1, FRAME, true)).toBe(0);
    expect(trampolineStep(cloth, 0, high + 0.6, 0.9, FRAME, true)).toBe(0);
    expect(cloth.deep).toBe(0);
    expect(cloth.holds).toBe(false);
  });

  it('presses the cloth into a hollow under his feet that is held at the edge', () => {
    expect(hollow(0, 0, 0, 0, 0.3)).toBeCloseTo(0.3, 6);
    expect(hollow(mat, 0, 0, 0, 0.3)).toBeCloseTo(0, 6);
    expect(hollow(0.5, 0, 0, 0, 0.3)).toBeLessThan(0.3);
    expect(hollow(0.5, 0, 0, 0, 0.3)).toBeGreaterThan(0.1);
    // In the picture: a bounce moves the cloth's points down, and they come back.
    const made = createTrampoline(at);
    const points = (made.group.getObjectByName('trampoline-mat') as Mesh).geometry.getAttribute('position');
    made.update(at.x, at.y, 1, FRAME, 0, false);
    for (let i = 0; i < 4; i++) made.update(at.x, at.y + 0.2 * i, 0.9, FRAME, 0, false);
    expect(points.getY(0)).toBeLessThan(high - 0.15);
    for (let i = 0; i < 180; i++) made.update(at.x, at.y + 3, 0, FRAME, 0, false);
    expect(points.getY(0)).toBeCloseTo(high, 2);
  });
});
