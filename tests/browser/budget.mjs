// How many draw calls a picture may take, by quality tier (plan §6.5, and §6.12 gate 9).
//
// It was 120 on every tier until 5 October 2026, a guess made before anything was drawn. The game is tuned
// for High, which is what the family's devices are expected to run (a new iPad, an iPhone, a phone of the
// Samsung S23's class), and Olov raised it there to make room for better graphics. Low keeps the old number,
// since Low is what an older phone gets: what is added for High and Mid has to stay out of Low's picture where
// it would not fit.
//
// The number that matters in the end is the frame time on the devices (gate 5), which only Olov can measure,
// with ?bench. This one stands in for it in the checks, because a count does not depend on the computer.
export const DRAW_CALLS = { low: 120, mid: 160, high: 200 };

/**
 * Whether a picture is within its tier's budget. A check that cannot say which tier it measured is held to
 * Low's, so that nothing is let through by not knowing.
 */
export function withinDraws(drawCalls, tier) {
  return drawCalls <= (DRAW_CALLS[tier] ?? DRAW_CALLS.low);
}
