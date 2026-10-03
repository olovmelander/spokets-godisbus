import { CAMERA_LEAD } from './constants';
import type { PlayerState, Vec } from './types';

/**
 * Where the camera wants to look: ahead of Elof, at the height of the ground he is over.
 * The renderer only smooths this, so framing can be tested without it (plan §6.4).
 */
export function cameraIntent(player: PlayerState): Vec {
  const ground = Math.max(player.groundY, player.y - 3);
  return { x: player.x + player.facing * CAMERA_LEAD, y: ground };
}
