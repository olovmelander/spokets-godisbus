import { AdditiveBlending, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3, type Object3D } from 'three';
import { glowTexture } from './glow';

/**
 * Where a torch held indoors shines on the room's back wall, or on the glass of its window: a soft pool of its light
 * (Olov, 12 November 2026: "pappa ska lysa ut genom förnstret för att titta efter trägubbarna"). Seen from in front, a
 * beam that goes away into the room is hard to see at all; the light where it lands shows what it is pointed at, the
 * empty places on the shelf, or the dark window. Added light, one mesh a lamp; hidden where the beam does not reach the
 * wall, or reaches it far off and faint.
 */
export interface LampSpot {
  mesh: Mesh;
  /** Lays the pool where `lamp` (its beam along its +z) meets the wall at `wall`, or hides it. */
  place(lamp: Object3D, wall: number, shown: boolean): void;
}

const at = new Vector3(), ray = new Vector3();
/** How far off the beam lands and is still seen; and how wide its pool is, near and far. */
const REACH = 9;

export function createLampSpot(): LampSpot {
  const material = new MeshBasicMaterial({ color: '#fff0cc', map: glowTexture(32), transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, fog: false });
  const mesh = new Mesh(new PlaneGeometry(1, 1), material);
  mesh.name = 'lamp-spot';
  mesh.renderOrder = 3;
  mesh.visible = false;
  return {
    mesh,
    place(lamp, wall, shown) {
      lamp.getWorldPosition(at);
      ray.set(0, 0, 1).applyQuaternion(lamp.getWorldQuaternion(mesh.quaternion));
      const t = ray.z < -0.05 ? (wall - at.z) / ray.z : -1;
      mesh.visible = shown && t > 0.2 && t < REACH;
      if (!mesh.visible) return;
      mesh.position.copy(at).addScaledVector(ray, t);
      mesh.position.z = wall;
      mesh.quaternion.identity();
      // Wider and fainter the further off it lands, and the more aslant.
      const slant = Math.min(2.5, 1 / Math.max(0.4, -ray.z));
      mesh.scale.set(1.8 + 0.3 * t * slant, 1.8 + 0.3 * t, 1);
      material.opacity = 0.6 * (1 - t / REACH);
    },
  };
}
