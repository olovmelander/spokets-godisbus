import { Matrix4, Vector3, type Object3D } from 'three';
import type { Look } from './talk';

const inverse = new Matrix4(), to = new Vector3(), from = new Vector3();

/**
 * Where a body's head turns to look at a point in the world (./talk.ts `Look`): to its own left (+) and down (+), from its head
 * at `head` (in the world too). A body faces its own +z with its left at +x, as the family's do (./rig.ts); `facesX` is for one
 * that faces its own +x instead, its left at -z, as Elof's group does.
 */
export function lookAt(body: Object3D, head: Vector3, target: { readonly x: number; readonly y: number; readonly z: number }, out: Look, facesX = false): Look {
  body.updateWorldMatrix(true, false);
  inverse.copy(body.matrixWorld).invert();
  to.set(target.x, target.y, target.z).applyMatrix4(inverse);
  from.copy(head).applyMatrix4(inverse);
  to.sub(from);
  const ahead = facesX ? to.x : to.z, left = facesX ? -to.z : to.x;
  out.turn = Math.atan2(left, ahead);
  out.nod = Math.atan2(-to.y, Math.max(1e-6, Math.hypot(ahead, left)));
  return out;
}
