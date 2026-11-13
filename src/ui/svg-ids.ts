/**
 * Every copy of a drawing put into the page gets ids of its own.
 *
 * The drawn pictures colour faces, skies and wood with gradients, found by id: `fill="url(#…)"`. A url(#id) is
 * resolved to the FIRST element in the page with that id, and the same picture is often in the page twice: a
 * memory's first picture in the album (behind the closed Pause menu) and in the memory being shown; a family
 * face in a hidden speech bubble and in a panel. When that first copy is inside a hidden part of the page
 * (`display: none`), the browser has nothing to paint with, and the fill becomes nothing: the face shows the wall
 * or the sky behind it (Olov, 13 November 2026: "färgerna ser konstigt ut så att karaktärernas hudfärg ser konstig
 * ut"). Renaming each copy's ids, and its own references to them, makes every copy paint by itself.
 */
let copies = 0;

/** The markup with each id it defines renamed for this copy, and every url(#id)/href="#id" to them following. */
export function ownIds(markup: string): string {
  const ids = new Set<string>();
  for (const match of markup.matchAll(/\sid="([^"]+)"/g)) ids.add(match[1]!);
  if (ids.size === 0) return markup;
  const copy = ++copies;
  // References to ids defined elsewhere (the icon sprite's `href="#i-play"`) are left alone.
  return markup.replace(/(\sid="|url\(#|href="#)([^")]+)/g, (all, lead: string, id: string) => ids.has(id) ? `${lead}${id}-c${copy}` : all);
}
