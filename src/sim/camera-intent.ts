import { CAMERA_LEAD, FALL_LIMIT } from './constants';
import type { CameraZone, PlayerState } from './types';

/** Where the camera wants to look, and how wide: 1 is the usual picture, more shows more of the place. */
export interface CameraIntent {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Where the camera wants to look: ahead of Elof, at the height of the ground he is over.
 * - Over a drop too long to land, that is the ground he last stood on, so a jump across a chasm doesn't
 *   pull the picture down into it.
 * - On a hose it stays on him, a little below, so that both ends of the climb come into the picture.
 * - On the lace it rests on the hook's place, so that the whole swing is in it and nothing sways.
 * - A chapter's camera zones widen the picture where a place needs it: a swing, a climb, a vista.
 * The renderer only smooths this, so framing can be tested without it (plan §6.4).
 */
export function cameraIntent(player: PlayerState, zones: readonly CameraZone[] = []): CameraIntent {
  const zone = zones.find((z) => player.x >= z.from && player.x < z.to);
  const zoom = zone?.zoom ?? 1;
  const lift = zone?.lift ?? 0;
  if (player.mode === 'climb' || player.mode === 'slide') return { x: player.x + player.facing * 0.8, y: player.y - 1.2 + lift, zoom };
  if (player.hook) return { x: player.hook.x + player.facing * 1.2, y: player.standY + lift, zoom };
  const below = player.y - player.groundY > FALL_LIMIT ? player.standY : player.groundY;
  const ground = Math.max(below, player.y - 3);
  return { x: player.x + player.facing * (zone?.lead ?? CAMERA_LEAD), y: ground + lift, zoom };
}
