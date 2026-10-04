import { KINDS } from '../content/kinds';

/**
 * The stickers of the hidden candy are pictures of the sweets themselves, rendered in Blender from the models
 * the game draws (art/blender/candy-stickers.py). They lie in one sheet, `kinds.webp`: six across and three
 * down, in the order of KINDS. A test holds the generator to that order.
 */
export const STICKER_SHEET = { across: 6, down: 3 };

/**
 * A sticker's inline style: where its picture lies in the sheet, and its kind's two colours, which the
 * round stand-in used. Empty for something that is not a kind.
 */
export function stickerStyle(kind: string): string {
  const look = KINDS[kind];
  if (!look) return '';
  const at = Object.keys(KINDS).indexOf(kind);
  return `--colour:${look.colour};--mark:${look.mark};--sx:${at % STICKER_SHEET.across};--sy:${Math.floor(at / STICKER_SHEET.across)}`;
}
