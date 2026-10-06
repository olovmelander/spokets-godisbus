/**
 * The candy in the bag, as it is counted (plan §4.3): in tens, each ten wrapped in a roll, a striped tube with
 * twisted ends, and the rest as single sweets (docs/ux-audit/story-presentation.md row 12). 140 candies are 14 rolls
 * on two lines, never a box that scrolls.
 */
export function candyRows(count: number): string {
  const rolls = Math.floor(Math.max(0, count) / 10);
  return '<i class="roll"></i>'.repeat(rolls) + '<i></i>'.repeat(Math.max(0, count) - rolls * 10);
}
