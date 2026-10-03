/**
 * Quality tiers (plan §6.5). The game is tuned for High on the family's devices; Low and Mid keep it playable
 * elsewhere.
 *  - Low renders straight to the canvas, with tone mapping in the materials and no post-processing.
 *  - Mid and High render to r186's HDR buffer and run one grading pass.
 * Bloom and the depth blur of High, and the grade inside the materials for Low, come with the golden frames.
 */
export type Tier = 'low' | 'mid' | 'high';

export const TIERS: readonly Tier[] = ['low', 'mid', 'high'];

/** How many pixels a frame may have, per tier. */
export const PIXEL_CAP: Readonly<Record<Tier, number>> = { low: 1.0e6, mid: 1.6e6, high: 2.6e6 };

/** The canvas's pixel ratio: never above the screen's own or 2, and never more pixels than the tier allows. */
export function pixelRatioFor(tier: Tier, cssWidth: number, cssHeight: number, devicePixelRatio: number): number {
  return Math.min(devicePixelRatio || 1, 2, Math.sqrt(PIXEL_CAP[tier] / (cssWidth * cssHeight)));
}

/** What the page asked for with ?tier=low, mid or high. null means Auto. */
export function tierFromQuery(value: string | null): Tier | null {
  return TIERS.includes(value as Tier) ? (value as Tier) : null;
}

/**
 * The tier to start in. A device that can't render to float buffers gets Low, whatever was asked for.
 * Auto is Mid for now: the two-second measurement that can raise it to High or lower it to Low needs a
 * scene worth measuring, and arrives with the golden frames.
 */
export function chooseTier(asked: Tier | null, floatBuffers: boolean): Tier {
  if (!floatBuffers) return 'low';
  return asked ?? 'mid';
}
