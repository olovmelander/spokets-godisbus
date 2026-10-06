import type { Object3D } from 'three';

/**
 * The ghost modelled in Blender, where its private pack exists (HANDOVER.md): how it is turned, and its painted eyes.
 * The stand-in built in view.ts faces +x, as the stand-in Elof does, and every scene is staged for that.
 */

/** The model faces the camera (+z): a quarter turn this way faces it along the course (+x), as the stand-in does. */
export const MODEL_TURN = Math.PI / 2;

/**
 * The ghost's two painted eyes: the parts the prologue's two strokes show, one each, and that a scene's blink squeezes.
 * Named parts keep the marks tied to the strokes without editing a pack.
 */
export function eyeNodes(model: Object3D): Object3D[] {
  const nodes: Object3D[] = [];
  model.traverse((node) => {
    if (/^(ghost-eye-[01]|eye[._-]?[lr12]|eyes)$/i.test(node.name)) nodes.push(node);
  });
  // A named parent must stay visible when its first named child is painted.
  const leaves = nodes.filter((node) => !nodes.some((child) => {
    for (let parent = child.parent; parent; parent = parent.parent) if (parent === node) return true;
    return false;
  }));
  const eyes = leaves.length === 1 && leaves[0]!.children.length === 2 ? [...leaves[0]!.children] : leaves;
  // Each keeps the height it came with. A packed model's eye is not 1 tall: the pack stores its mesh in small whole
  // numbers and gives the part the scale that makes them metres again (KHR_mesh_quantization), 0.038 for the ghost's.
  for (const eye of eyes) eye.userData.height ??= eye.scale.y;
  return eyes;
}

/** Opens the eyes to `open` of their own height: 1 is wide open, 0.1 the middle of a blink. */
export function blinkEyes(eyes: readonly Object3D[], open: number): void {
  for (const eye of eyes) eye.scale.y = (eye.userData.height as number) * open;
}
