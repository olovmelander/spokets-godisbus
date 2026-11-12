import { InstancedMesh, Matrix4, Vector3 } from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPaddle, PADDLE } from '../../src/render/paddle';
import { createRehearsalRig, STANDING } from '../../src/render/rig';
import { stubCanvas } from './canvas-stub';

beforeEach(() => stubCanvas());
afterEach(() => vi.unstubAllGlobals());

/**
 * How far a point is from the head, as the camera sees her from the side (Olov, 12 November 2026: "hennes arm går rakt
 * igenom hennes ansikte"): in the plane of her forward and up, from the rehearsal figure's head (its part 1, a box).
 */
function seenFromHead(mesh: InstancedMesh, point: Vector3): number {
  const m = new Matrix4(); mesh.getMatrixAt(1, m);
  const centre = new Vector3().setFromMatrixPosition(m);
  const local = point.clone().setX(centre.x).applyMatrix4(m.clone().invert());
  const scale = new Vector3().setFromMatrixScale(m);
  return Math.hypot(Math.max(0, Math.abs(local.y) - .5) * scale.y, Math.max(0, Math.abs(local.z) - .5) * scale.z);
}

describe('Mamma paddling her SUP', () => {
  const rig = createRehearsalRig('mamma');
  const paddle = createPaddle(rig.height);
  const mesh = rig.group.children.find((c): c is InstancedMesh => c instanceof InstancedMesh)!;
  const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3(), hand = new Vector3(), p = new Vector3();
  const strokes = Array.from({ length: 40 }, (_, i) => i / 20);
  const frame = (clock: number) => {
    rig.pose(paddle.stance({ ...STANDING }));
    paddle.update(rig, clock, false);
    // Once more: the stance leans as the last frame's stroke did.
    rig.pose(paddle.stance({ ...STANDING }));
    paddle.update(rig, clock, false);
  };

  it('keeps both arms out of her face as the camera sees it, all through the stroke', () => {
    for (const clock of strokes) {
      frame(clock);
      let nearest = Infinity;
      for (const side of [0, 1] as const) {
        rig.arm!(side, shoulder, elbow, wrist);
        rig.hand(side, hand);
        for (const [a, b] of [[elbow, wrist], [wrist, hand]] as const) {
          for (let k = 0; k <= 10; k++) nearest = Math.min(nearest, seenFromHead(mesh, p.lerpVectors(a, b, k / 10)));
        }
      }
      // A forearm and a hand are about a quarter of an EL thick: their middles stay clear of the head's outline by more.
      expect(nearest, `t ${clock}`).toBeGreaterThan(0.3);
    }
  });

  it('holds the paddle with both hands, its blade in the water through the pull and out of it in the recovery', () => {
    const axis = new Vector3();
    for (const clock of strokes) {
      frame(clock);
      axis.set(0, 1, 0).applyQuaternion(paddle.mesh.quaternion);
      for (const side of [0, 1] as const) {
        rig.hand(side, hand).sub(paddle.mesh.position);
        // The palm's middle is on the shaft, a hand's half-width from its line at most.
        expect(hand.addScaledVector(axis, -hand.dot(axis)).length(), `hand ${side} at t ${clock}`).toBeLessThan(0.25);
      }
      // The deck is 1.2 over the water: the blade's top is under it while it pulls, and clear of it as it swings forward.
      const t = (clock * 0.5) % 1;
      const bladeTop = paddle.mesh.position.y + axis.y * rig.height / 5.2 * PADDLE.long * (PADDLE.blade + PADDLE.bladeLong / 2);
      if (t > 0.04 && t < 0.5) expect(bladeTop, `t ${clock}`).toBeLessThan(-1.2);
      if (t > 0.74 && t < 0.88) expect(bladeTop, `t ${clock}`).toBeGreaterThan(-1.2);
    }
  });
});
