import { CAMERA_LEAD, FALL_LIMIT } from './constants';
import type { PlayerState, Vec } from './types';

/**
 * Where the camera wants to look: ahead of Elof, at the height of the ground he is over.
 * Over a drop too long to land, that is the ground he last stood on, so a jump across a chasm doesn't
 * pull the picture down into it.
 * The renderer only smooths this, so framing can be tested without it (plan §6.4).
 */
export function cameraIntent(player: PlayerState): Vec {
  const below = player.y - player.groundY > FALL_LIMIT ? player.standY : player.groundY;
  const ground = Math.max(below, player.y - 3);
  return { x: player.x + player.facing * CAMERA_LEAD, y: ground };
}
