import { albumComplete, KINDS } from '../content/kinds';
import { LOST, type LostThing } from '../content/lost';
import { sv } from '../content/sv';
import { chapterPicture } from './map';
import { stickerStyle } from './sticker';

/**
 * The sticker album (plan §4.3), in the pause panel: every kind of hidden candy, on a strip for each chapter in the
 * order of the story, with the place's picture from Moa's map, its name and how many of its four he has
 * (docs/ux-audit/menus.md row 12). A kind he has found is a sticker, a picture of the sweet, with its name. One still
 * out there is an empty ring, and keeps its name to itself: what it is, is for him to find out. Under them: Hittegods
 * (plan §4.8), each thing drawn, and the small keepsakes.
 */

/** The album's chapters: the four that hide candy. */
const STRIPS = ['garden', 'granskog', 'myren', 'berget'] as const;

/** Hittegods, drawn as stickers (menus.md row 13): plain things, no brand on any of them. */
const LOST_PICTURE: Record<LostThing, string> = {
  // Bertil's blue glass marble, with its swirl and a gleam.
  marble: '<circle cx="22" cy="22" r="15" fill="#3f7fc6" stroke="#23476e" stroke-width="2"/><path d="M12 27c6-9 14-2 20-11" fill="none" stroke="#9fd0ff" stroke-width="3" stroke-linecap="round"/><ellipse cx="16" cy="15" rx="4" ry="2.6" fill="#fff" opacity=".75" transform="rotate(-30 16 15)"/>',
  // Moa's pink hair clip: a bar with a bow on it.
  clip: '<path d="M6 24h32" stroke="#e46aa0" stroke-width="7" stroke-linecap="round"/><path d="M9 24h26" stroke="#ffd0e4" stroke-width="2" stroke-linecap="round"/><path d="M22 24l-8-8v16zm0 0 8-8v16z" fill="#f08ab8" stroke="#a8366a" stroke-width="1.6" stroke-linejoin="round"/><circle cx="22" cy="24" r="3.2" fill="#c84a86"/>',
  // A red wooden toy block, a star cut in its side.
  brick: '<path d="M9 16l13-6 13 6v15l-13 6-13-6z" fill="#d8402f" stroke="#7f241c" stroke-width="2" stroke-linejoin="round"/><path d="M9 16l13 6 13-6M22 22v15" fill="none" stroke="#7f241c" stroke-width="2"/><path d="M15 22.5l1.2 2.6 2.8.3-2.1 1.9.6 2.8-2.5-1.5-2.5 1.5.6-2.8-2.1-1.9 2.8-.3z" fill="#f6c445"/>',
  // A krona: a gold coin with a small crown.
  coin: '<circle cx="22" cy="22" r="15" fill="#e8b636" stroke="#7d5414" stroke-width="2"/><circle cx="22" cy="22" r="11" fill="none" stroke="#b8862a" stroke-width="1.4"/><path d="M15 26l1-8 3.5 4 2.5-6 2.5 6 3.5-4 1 8z" fill="#c9952c" stroke="#7d5414" stroke-width="1.2" stroke-linejoin="round"/>',
};
/** Vittrornas tack: a small paper picture of a lingonberry sprig. */
const VITTRA = '<rect x="7" y="6" width="30" height="32" rx="2" fill="#fffaf0" stroke="#c9b48a" stroke-width="1.5" transform="rotate(-6 22 22)"/><circle cx="19" cy="26" r="6" fill="#b33748"/><circle cx="27" cy="23" r="5" fill="#c63e52"/><path d="M22 19c-1-5 4-8 8-7-1 4-4 6-8 7z" fill="#5f923f"/><circle cx="17" cy="24" r="1.6" fill="#f2a0a8"/>';
const drawn = (body: string) => `<svg class="thing" viewBox="0 0 44 44" aria-hidden="true">${body}</svg>`;

export function albumHtml(found: readonly string[], lost: readonly string[] = [], keepsakes: readonly string[] = []): string {
  const has = new Set(found);
  const kinds = Object.entries(KINDS);
  const count = sv.album.count.replace('{found}', String(kinds.filter(([kind]) => has.has(kind)).length)).replace('{total}', String(kinds.length));
  const strips = STRIPS.map((chapter) => {
    const own = kinds.filter(([, kind]) => kind.chapter === chapter);
    const place = sv.explore.chapters[chapter] ?? chapter;
    const tally = sv.album.chapterCount.replace('{found}', String(own.filter(([kind]) => has.has(kind)).length)).replace('{total}', String(own.length));
    const slots = own.map(([kind]) =>
      has.has(kind)
        ? `<li class="got"><i class="kind" style="${stickerStyle(kind)}"></i><span>${sv.kinds[kind] ?? kind}</span></li>`
        : '<li><i class="missing"></i></li>',
    );
    return `<section class="album-chapter" aria-label="${place}: ${tally}"><p class="album-place">${chapterPicture(chapter)}<b>${place}</b><small>${tally}</small></p><ul class="album-grid">${slots.join('')}</ul></section>`;
  });
  // Hittegods: what he has found under the deck, drawn and named. What is still lost keeps its name to itself.
  const things = LOST.map((thing) => (lost.includes(thing) ? `<li class="got" data-thing="${thing}">${drawn(LOST_PICTURE[thing])}<span>${sv.lost[thing]}</span></li>` : '<li><i class="missing"></i></li>'));
  return `<h3>${sv.album.title}</h3><p class="album-count">${count}</p><div class="album-chapters">${strips.join('')}</div>`
    + (albumComplete(found) ? `<figure class="golden-reward" data-reward="golden"><svg viewBox="0 0 120 76" aria-hidden="true"><path d="m40 25-28-12 5 25-5 25 28-12m40-26 28-12-5 25 5 25-28-12" fill="#e8b636" stroke="#9c691d" stroke-width="2"/><path d="m18 22 17 12m-17 20 17-12m67-20-17 12m17 20-17-12" fill="none" stroke="#fff0a8" stroke-width="3"/><rect x="33" y="13" width="54" height="50" rx="18" fill="#f6d363" stroke="#9c691d" stroke-width="2"/><path d="m44 21 5 32m6-35 5 36m6-36 5 34m7-29 3 23" stroke="#fff0a8" stroke-width="2"/><path d="M48 43c-4-7 1-15 8-14 4-6 13-3 13 3 7 1 8 10 3 14-7 6-18 4-24-3" fill="#d8345a" stroke="#a52443" stroke-width="2"/><path d="m10 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2m98 48 2 5 5 2-5 2-2 5-2-5-5-2 5-2" fill="#b47d20"/></svg><figcaption>${sv.album.golden}</figcaption></figure>` : '')
    + `<h3>${sv.lostTitle}</h3><ul class="album-grid lost-list">${things.join('')}</ul>`
    + (keepsakes.includes('vittra') ? `<h3>${sv.keepsakes}</h3><ul class="album-grid"><li class="got" data-keepsake="vittra">${drawn(VITTRA)}<span>${sv.vittraSticker}</span></li></ul>` : '');
}
