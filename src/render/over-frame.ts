import type { Camera, Object3D, WebGLRenderer } from 'three';

/** The layer of what is drawn over the finished picture rather than in it (rich.ts has 1, water.ts 5). */
export const OVER_FRAME_LAYER = 7;

/**
 * The ghost's thought is a page of the game's own illustrations held up in the world, not a thing of the place. In
 * the scene, Mid and High gave it the place's grade, depth blur and glow: the faces went soft and their skin took on
 * the storm's blue or the evening's rose (Olov, 13 November 2026: "färgerna kan se konstigt ut så att karaktärernas
 * hudfärg med mera ser konstig ut"). It stays in the scene graph, which places it and which the tests read, on a layer
 * of its own that the camera does not draw. `drawOverFrame` draws it last, straight onto the finished frame, in the
 * picture's own colours, as the memories show the same drawings.
 */
export function overFrame(object: Object3D): void {
  object.traverse((part) => part.layers.set(OVER_FRAME_LAYER));
}

/** Call after the frame is complete (after the output pass). Hidden things draw nothing. */
export function drawOverFrame(renderer: WebGLRenderer, object: Object3D, camera: Camera): void {
  if (!object.visible) return;
  const mask = camera.layers.mask, clear = renderer.autoClear;
  camera.layers.set(OVER_FRAME_LAYER);
  renderer.autoClear = false;
  try {
    renderer.setRenderTarget(null);
    renderer.render(object, camera);
  } finally {
    renderer.autoClear = clear;
    camera.layers.mask = mask;
  }
}
