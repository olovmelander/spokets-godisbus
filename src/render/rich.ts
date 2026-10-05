import type { Camera, Object3D } from 'three';
import type { Tier } from './quality';

/**
 * What only Mid and High draw.
 *
 * A picture may take more draw calls on Mid and High than on Low (tests/browser/budget.mjs), because the game
 * is tuned for High and Low is what an older phone gets. So what is added for the richer picture, and would
 * take Low's over its number, is marked where it is built: `object.userData.rich = true`. The view puts
 * such a thing, and all that is in it, on a layer of its own, and the camera sees that layer on Mid and High
 * only.
 *
 * It is a layer and not `visible`, because `visible` is already spoken for: the story hides things with it,
 * and so does what has nothing to draw (./idle.ts). The two cannot undo one another this way.
 */
export const RICH_LAYER = 1;

/** Puts every thing marked rich under `root`, with all that is in it, on the rich layer. May be done again. */
export function layRich(root: Object3D): void {
  root.traverse((object) => {
    if (object.userData.rich !== true) return;
    object.traverse((part) => part.layers.set(RICH_LAYER));
  });
}

/** Lets a camera see what is rich, or not, by the tier. */
export function seeRich(camera: Camera, tier: Tier): void {
  if (tier === 'low') camera.layers.disable(RICH_LAYER);
  else camera.layers.enable(RICH_LAYER);
}
