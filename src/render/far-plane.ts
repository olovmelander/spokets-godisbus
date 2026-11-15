/**
 * How far the camera sees, its far plane. At the usual picture the camera stands about 15 EL in front of the play plane
 * and sees 140, so 125 behind the plane; over a brink (Billsta's brow) 640, for the water far below and the ridges
 * beyond. A shot that backs the camera off to fit its width keeps seeing as far behind the plane: a scene's `width` on a
 * phone held upright took Lördagsmorgon's last picture, the title over the garden, 114 EL back, and everything more than
 * 26 behind the plane, the trees, the forest and the hills, left the picture (Olov, 15 November 2026: "Vi måste fixa det
 * på alla ställen där kameran zoomar ut så bakgrunden inte försvinner"). Stormens öga's stars and moon are kept in front
 * of the camera besides (`SKY`, ../content/aventyr2/render.ts).
 */
export const SIGHT = { far: 140, brink: 640, eye: 15 } as const;

/** The far plane for a camera `eye` EL in front of the play plane: never nearer than at the usual picture. */
export function farPlane(eye: number, brink = false): number {
  const far = brink ? SIGHT.brink : SIGHT.far;
  return Math.max(far, eye + far - SIGHT.eye);
}
