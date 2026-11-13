import type { SceneFrame } from '../sim/scene';

/**
 * Granskogen: pulled ashore out of the eddy on its leaf, the ghost thanks Elof (../content/chapters/granskog.ts, `tackar`):
 * turned to him, it bows deep, the whole wooden toy tipping forward from its shoes and up again (it never bends), and
 * then gives two glad little hops where it stands. Added to its idle (./ghost-model.ts) by the scene's clock, so that a
 * paused scene holds the same moment. With reduced motion it bows, and does not hop.
 */
export const GHOST_THANKS = { scene: 'tackar', bow: 0.45, down: 0.35, hold: 0.35, up: 0.4, deep: 0.6, hops: 1.6, hop: 0.3 } as const;

const smooth = (t: number) => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

/** How far it is bowed at `t` seconds into the scene, from 0 (upright) to 1 (as deep as it goes). */
export function bowAt(t: number): number {
  const { bow, down, hold, up } = GHOST_THANKS;
  return smooth((t - bow) / down) * (1 - smooth((t - bow - down - hold) / up));
}

/**
 * Its thanks at this moment of the scene, or null when the scene is not playing: how far it is turned from facing straight
 * back at him towards the camera (radians, so that its face is seen as it bows; it otherwise stands turned a little away),
 * how far it tips forward (radians, about its own side, as its idle `pitch`), and how high it hops (EL).
 */
export function ghostThanks(frame: SceneFrame | null | undefined, calm: boolean): { turn: number; pitch: number; bob: number } | null {
  if (frame?.id !== GHOST_THANKS.scene) return null;
  const t = frame.seconds;
  const h = (t - GHOST_THANKS.hops) / GHOST_THANKS.hop;
  return { turn: 0.55, pitch: GHOST_THANKS.deep * bowAt(t), bob: calm || h <= 0 || h >= 2 ? 0 : 0.2 * Math.sin(Math.PI * (h % 1)) };
}
