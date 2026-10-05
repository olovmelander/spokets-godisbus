import type { Object3D } from 'three';

/**
 * Takes a thing out of the picture while it has nothing to draw, and puts it back when it has.
 *
 * three.js makes a draw call for a mesh of no size whose middle is in the picture, and for one that is wholly
 * unseen. What waits in the scene that way (what carries him on a ride, the lace, the helper's dotted figures)
 * cost every picture a dozen or two of the 120 draw calls it may have. So a thing is hidden in the same update
 * that brings its size or its opacity to nothing, and shown in the one that gives it some again.
 *
 * It is marked as idle while it is hidden for that reason, and the view's warm-up draws what is idle all the
 * same for its few frames, as it is: at no size, or unseen. So its shader is made, and its shape and its
 * picture are sent to the GPU, with the chapter's first frames and never when it is first shown (plan §6.12,
 * gate 6: no shader compiled and no growth in geometries, textures or GL bytes during play). What is hidden
 * for the story's sake is not marked, and is not drawn until the story shows it.
 */
export function drawnWhile(object: Object3D, something: boolean): void {
  object.visible = something;
  object.userData.idle = !something;
}
