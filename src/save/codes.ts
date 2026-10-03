import { sv } from '../content/sv';

/**
 * Chapter codes (plan §6.9): three plain words that open a chapter's start on any device. A chapter's card
 * shows the code of the chapter that comes next, and the title takes one. So a game begun on the tablet can
 * go on on the phone, and a save that a browser has lost is not the end of the story.
 *
 * The words are in `sv.codes`, by the chapter they open. The prologue has none: it is where Börja begins.
 * A code is no secret and no lock: it holds the chapter only, not the candy.
 */

/** A word as it is compared: capitals, with å and ä as A and ö as O, for a keyboard without them. */
const plain = (word: string) => word.normalize('NFC').toUpperCase().replace(/[ÅÄ]/g, 'A').replace(/Ö/g, 'O').replace(/[^A-Z]/g, '');

const keyOf = (words: readonly string[]) => words.map(plain).sort().join(' ');

/** The code that opens this chapter's start, as it is shown: three words in capitals. Null where there is none. */
export function codeFor(chapter: string): string | null {
  return sv.codes[chapter]?.join(' ') ?? null;
}

/**
 * The chapter a typed code opens, or null when it is no code. Small letters, commas, more spaces and another
 * order are all right: a child types it, from a card held by someone else.
 */
export function chapterFor(typed: string): string | null {
  const words = typed.split(/[^\p{L}]+/u).filter((word) => plain(word) !== '');
  if (words.length !== 3) return null;
  const key = keyOf(words);
  return Object.keys(sv.codes).find((chapter) => keyOf(sv.codes[chapter]!) === key) ?? null;
}
