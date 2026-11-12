import { CylinderGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pose, Rig } from './rig';

/**
 * The paddle of a stand-up paddle board (Olov, 6 November 2026: the family's SUP in place of a rowboat). Whoever
 * stands on the board holds it on the board's far side: the top hand (the right) on its T-grip, the lower hand (the
 * left) down the shaft, and paddles: the blade goes in ahead of the toes, pulls back past the feet, and comes out and
 * swings forward low over the water again. Both hands grip it each frame after the pose, so the arms follow the stroke.
 * With less motion asked for, the paddle rests in the water.
 *
 * The hands are where a paddler's are, and where the arms reach (Olov, 12 November 2026: "hennes arm går rakt igenom
 * hennes ansikte"). The top hand stays at the height of the chest, under the chin, and ahead of the face, through the
 * whole stroke: the camera sees her from the side, and a hand lifted to the grip at the height of her face, as the
 * recovery lifted the whole paddle, crossed her face in the picture. The recovery lifts the blade out by swinging it
 * forward and out, with the top hand where it is. The lower hand holds the shaft where the other arm reaches it: it hung
 * at her knee, half an arm's length short of the shaft. The trunk leans into the reach at the catch and comes up
 * through the pull.
 */
export interface Paddle {
  mesh: Mesh;
  /** A paddler's stance: knees a little bent, leaning into the stroke, the arms where they will hold the paddle. */
  stance(pose: Pose): Pose;
  update(rig: Rig, clock: number, still: boolean): void;
}

const ADULT = 5.2;
const UP = new Vector3(0, 1, 0);
const smooth = (k: number) => k * k * (3 - 2 * k);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

/**
 * The paddle's measures, in an adult's units. It is longer than a real one beside its paddler, as the board's deck stands
 * higher over the water (`BOARD.top`, 1.2, in ../content/aventyr2/render.ts): its blade is under the water while the top
 * hand is at her chest. Along its length from its middle: the T-grip at `GRIP`, the blade's middle at `BLADE`.
 */
export const PADDLE = { long: 7.1, grip: 0.48, blade: -0.38, bladeLong: 0.24 } as const;
/** From the top hand, just under the T-grip, to the blade's middle. */
const REACH = (PADDLE.grip - PADDLE.blade) * PADDLE.long - 0.1;

/** The share of the stroke that pulls; the rest is the recovery. Strokes a second. */
const DRIVE = 0.62;
const STROKE = 0.5;

/**
 * Where the top hand is, in the body's own frame from its feet (forward, to its left where the paddle is, up), and how the
 * shaft leans from it: `ahead` and `out` are the sines of its lean forward and out at the blade. `lean` is the trunk's.
 */
export interface StrokeAt { forward: number; left: number; up: number; ahead: number; out: number; lean: number }

/** The stroke at `t` (0 to 1): the catch at 0, the blade out at the feet at `DRIVE`, and back. */
export function strokeAt(t: number, out: StrokeAt = { forward: 0, left: 0, up: 0, ahead: 0, out: 0, lean: 0 }): StrokeAt {
  // At the catch the blade goes in two ahead of her toes; at the exit it comes out beside her feet.
  const catchAhead = (2.0 - 1.2) / REACH, exitAhead = (-0.05 - 0.95) / REACH;
  out.left = 0.35;
  if (t < DRIVE) {
    const k = smooth(t / DRIVE);
    out.forward = mix(1.2, 0.95, k);
    out.up = mix(3.68, 3.8, k);
    out.ahead = mix(catchAhead, exitAhead, k);
    out.out = 0.11;
    out.lean = mix(0.26, 0.1, k);
  } else {
    const r = (t - DRIVE) / (1 - DRIVE), k = smooth(r), arc = Math.sin(Math.PI * r);
    out.forward = mix(0.95, 1.2, k);
    out.up = mix(3.8, 3.68, k) + 0.06 * arc;
    // Out of the water: the blade swings forward and out, low over it, and in again at the catch.
    out.ahead = mix(exitAhead, catchAhead, k) + 0.36 * arc;
    out.out = 0.11 + 0.14 * arc;
    out.lean = mix(0.1, 0.26, k);
  }
  return out;
}

function painted(geometry: BufferGeometry, hex: string): BufferGeometry {
  const shape = geometry.index ? geometry.toNonIndexed() : geometry;
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const colours = new Float32Array(shape.getAttribute('position').count * 3);
  for (let i = 0; i < colours.length; i += 3) colours.set([r ** 2.2, g ** 2.2, b ** 2.2], i);
  shape.setAttribute('color', new Float32BufferAttribute(colours, 3));
  if (shape !== geometry) geometry.dispose();
  return shape;
}

export function createPaddle(height: number): Paddle {
  const u = height / ADULT;
  const long = PADDLE.long * u;
  // Its middle at the origin, along y: the T-grip at the top, the shaft, the blade at the bottom.
  const shape = mergeGeometries([
    painted(new CylinderGeometry(0.075 * u, 0.075 * u, long * 0.8, 8).translate(0, long * 0.08, 0), '#dfe4e6'),
    painted(new CylinderGeometry(0.085 * u, 0.085 * u, 0.5 * u, 8).rotateZ(Math.PI / 2).translate(0, long * PADDLE.grip, 0), '#2b2e33'),
    painted(new CylinderGeometry(0.26 * u, 0.3 * u, long * PADDLE.bladeLong, 4, 1).scale(1, 1, 0.14).rotateY(Math.PI / 4).translate(0, long * PADDLE.blade, 0), '#f08a2c'),
  ]);
  const mesh = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  mesh.name = 'sup-paddle';
  mesh.castShadow = true;
  const feet = new Vector3(), forward = new Vector3(), left = new Vector3(), top = new Vector3(), lower = new Vector3();
  const down = new Vector3(), along = new Vector3(), out = new Vector3(), local = new Vector3();
  const shoulder = new Vector3(), elbow = new Vector3(), wrist = new Vector3(), shoulderL = new Vector3(), toward = new Vector3();
  const turn = new Quaternion(), tilt = new Quaternion();
  const now = strokeAt(0.3);
  return {
    mesh,
    stance(pose) {
      pose.kneeL = Math.max(pose.kneeL, 0.2);
      pose.kneeR = Math.max(pose.kneeR, 0.2);
      pose.legL = Math.max(pose.legL, 0.12);
      pose.legR = Math.max(pose.legR, 0.12);
      // Into the reach at the catch, up again through the pull (the stroke as the last frame had it).
      pose.lean += now.lean;
      // The arms forward with the elbows bent and down, as they will hold the paddle: the grip carries that bend to
      // the paddle, so an elbow never swings up past the face.
      pose.armR = 1.2; pose.elbowR = 0.55; pose.armL = 0.8; pose.elbowL = 0.3;
      pose.spread = 0; pose.outL = 0; pose.outR = 0;
      return pose;
    },
    update(rig, clock, still) {
      rig.group.updateWorldMatrix(true, false);
      rig.group.getWorldPosition(feet);
      rig.group.getWorldQuaternion(turn);
      forward.set(0, 0, 1).applyQuaternion(turn);
      left.set(1, 0, 0).applyQuaternion(turn);
      strokeAt(still ? 0.3 : (clock * STROKE) % 1, now);
      // The top hand, under the chin and ahead of the face: at the chest, a little lower than the shoulders are, and
      // never further from the right shoulder than the arm reaches with its elbow a little bent.
      rig.arm?.(1, shoulder, elbow, wrist);
      const arm = rig.arm ? shoulder.distanceTo(elbow) + elbow.distanceTo(wrist) : 1.64 * u;
      const shoulderUp = rig.arm ? (shoulder.y - feet.y) / u : 4.05;
      top.copy(feet).addScaledVector(forward, now.forward * u).addScaledVector(left, now.left * u)
        .addScaledVector(UP, Math.min(now.up, shoulderUp - 0.3) * u);
      if (rig.arm && top.distanceTo(shoulder) > arm * 0.95) top.sub(shoulder).setLength(arm * 0.95).add(shoulder);
      // Down the shaft from it, to the blade: leaning forward and out as the stroke has it.
      local.set(now.out, -Math.sqrt(Math.max(0, 1 - now.ahead * now.ahead - now.out * now.out)), now.ahead);
      down.copy(local).applyQuaternion(turn);
      along.copy(down).negate();
      rig.grip(1, top, forward, out, 1);
      // The lower hand where the other arm reaches the shaft: the point of it nearest the left shoulder, a forearm and a
      // half down from the top hand at least.
      rig.arm?.(0, shoulderL, elbow, wrist);
      const nearest = rig.arm ? toward.subVectors(shoulderL, top).dot(down) : 0;
      const spacing = Math.min(1.8 * u, Math.max(1.15 * u, nearest));
      lower.copy(top).addScaledVector(down, spacing);
      rig.grip(0, lower, forward, out, 1);
      // The paddle along its shaft, its T-grip just over the top hand, turned with the body so its blade faces as it did.
      tilt.setFromUnitVectors(UP, local.negate());
      mesh.quaternion.copy(turn).multiply(tilt);
      mesh.position.copy(top).addScaledVector(along, 0.1 * u - PADDLE.grip * long);
    },
  };
}
