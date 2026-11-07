import { CylinderGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, Quaternion, Vector3, type BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { Pose, Rig } from './rig';

/**
 * The paddle of a stand-up paddle board (Olov, 6 November 2026: the family's SUP in place of a rowboat). Whoever
 * stands on the board holds it with the top hand on its T-grip and the lower hand down the shaft, on the board's far
 * side, and paddles: the blade goes in near the toes, pulls back past the feet, and comes out and forward again.
 * Both hands grip it each frame after the pose, so the arms follow the stroke. Sizes go with the body, a paddle a
 * little taller than its paddler. With less motion asked for, the paddle rests in the water.
 */
export interface Paddle {
  mesh: Mesh;
  /** A paddler's stance: knees a little bent, leaning into the stroke. */
  stance(pose: Pose): Pose;
  update(rig: Rig, clock: number, still: boolean): void;
}

const ADULT = 5.2;
const UP = new Vector3(0, 1, 0);
const smooth = (k: number) => k * k * (3 - 2 * k);
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

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
  const long = 6.0 * u;
  // Its middle at the origin, along y: the T-grip at the top, the shaft, the blade at the bottom.
  const shape = mergeGeometries([
    painted(new CylinderGeometry(0.075 * u, 0.075 * u, long * 0.8, 8).translate(0, long * 0.08, 0), '#dfe4e6'),
    painted(new CylinderGeometry(0.085 * u, 0.085 * u, 0.5 * u, 8).rotateZ(Math.PI / 2).translate(0, long * 0.48, 0), '#2b2e33'),
    painted(new CylinderGeometry(0.26 * u, 0.3 * u, long * 0.24, 4, 1).scale(1, 1, 0.14).rotateY(Math.PI / 4).translate(0, -long * 0.38, 0), '#f08a2c'),
  ]);
  const mesh = new Mesh(shape, new MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }));
  mesh.name = 'sup-paddle';
  mesh.castShadow = true;
  const feet = new Vector3(), forward = new Vector3(), left = new Vector3(), blade = new Vector3(), top = new Vector3();
  const along = new Vector3(), hand = new Vector3(), out = new Vector3();
  const turn = new Quaternion();
  return {
    mesh,
    stance(pose) {
      pose.kneeL = Math.max(pose.kneeL, 0.2);
      pose.kneeR = Math.max(pose.kneeR, 0.2);
      pose.legL = Math.max(pose.legL, 0.12);
      pose.legR = Math.max(pose.legR, 0.12);
      pose.lean += 0.08;
      return pose;
    },
    update(rig, clock, still) {
      rig.group.updateWorldMatrix(true, false);
      rig.group.getWorldPosition(feet);
      rig.group.getWorldQuaternion(turn);
      forward.set(0, 0, 1).applyQuaternion(turn);
      left.set(1, 0, 0).applyQuaternion(turn);
      // The stroke: in the water from in front of the toes to behind the heels, then out and forward.
      const t = still ? 0.3 : (clock * 0.5) % 1;
      let reach: number, lift: number;
      // Most of it ahead of the paddler, so that it is seen beside the body and not behind it.
      if (t < 0.62) {
        reach = mix(2.0, 0.3, smooth(t / 0.62));
        lift = 0;
      } else {
        const k = (t - 0.62) / 0.38;
        reach = mix(0.3, 2.0, smooth(k));
        lift = Math.sin(k * Math.PI) * 0.75;
      }
      // The blade a little under the water, beside the board; the grip high, over the shoulder on that side.
      blade.copy(feet).addScaledVector(forward, reach * u).addScaledVector(left, 0.8 * u).addScaledVector(UP, (-1.55 + lift) * u);
      top.copy(feet).addScaledVector(forward, (reach * 0.3 + 0.7) * u).addScaledVector(left, 0.15 * u).addScaledVector(UP, 4.1 * u);
      along.subVectors(top, blade).normalize();
      top.copy(blade).addScaledVector(along, long * 0.86);
      // The top hand on the grip, the lower hand down the shaft.
      hand.copy(top).addScaledVector(along, -0.1 * u);
      rig.grip(1, hand, forward, out, 1);
      hand.copy(top).addScaledVector(along, -long * 0.4);
      rig.grip(0, hand, forward, out, 1);
      mesh.quaternion.setFromUnitVectors(UP, along);
      mesh.position.copy(blade).addScaledVector(along, long * 0.38);
    },
  };
}
