/**
 * The chapter's page glues in a photo, not the whole screen (docs/ux-audit/story-presentation.md row 6): a 3:2 cut
 * of the frame just drawn, with Elof a third of the way in from the left, as a photographer frames someone walking
 * into the picture. Held upright the cut is the screen's width, with him a little below its middle, so the sky shows.
 * All in the canvas's own pixels; without a point to frame, the cut is the middle of the frame.
 */
export interface Cut {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const PAGE_ASPECT = 3 / 2;

export function photoCut(width: number, height: number, focus: { x: number; y: number } | null): Cut {
  const wide = width / height > PAGE_ASPECT;
  const cutWidth = wide ? Math.round(height * PAGE_ASPECT) : width;
  const cutHeight = wide ? height : Math.round(width / PAGE_ASPECT);
  const clamp = (value: number, most: number) => Math.round(Math.max(0, Math.min(most, value)));
  const x = focus ? clamp(focus.x - cutWidth / 3, width - cutWidth) : clamp((width - cutWidth) / 2, width - cutWidth);
  const y = focus ? clamp(focus.y - cutHeight * 0.6, height - cutHeight) : clamp((height - cutHeight) / 2, height - cutHeight);
  return { x, y, width: cutWidth, height: cutHeight };
}
