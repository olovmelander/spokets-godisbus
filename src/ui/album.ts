import { albumComplete, KINDS } from '../content/kinds';
import { LOST } from '../content/lost';
import { sv } from '../content/sv';
import { stickerStyle } from './sticker';

/**
 * The sticker album (plan §4.3), in the pause panel: every kind of hidden candy, four to a chapter, in the
 * order of the story. A kind he has found is a sticker, a picture of the sweet, with its name. One still out there is an empty ring,
 * and keeps its name to itself: what it is, is for him to find out. Under them: Hittegods (plan §4.8).
 */
export function albumHtml(found: readonly string[], lost: readonly string[] = [], keepsakes: readonly string[] = []): string {
  const has = new Set(found);
  const kinds = Object.entries(KINDS);
  const slots = kinds.map(([kind]) =>
    has.has(kind)
      ? `<li class="got"><i class="kind" style="${stickerStyle(kind)}"></i><span>${sv.kinds[kind] ?? kind}</span></li>`
      : '<li><i class="missing"></i><span>?</span></li>',
  );
  const count = sv.album.count.replace('{found}', String(kinds.filter(([kind]) => has.has(kind)).length)).replace('{total}', String(kinds.length));
  // Hittegods: what he has found under the deck, by name. What is still lost keeps its name to itself.
  const things = LOST.map((thing) => (lost.includes(thing) ? `<li class="got" data-thing="${thing}">${sv.lost[thing]}</li>` : '<li>?</li>'));
  return `<h3>${sv.album.title}</h3><p class="album-count">${count}</p><ul class="album-grid">${slots.join('')}</ul>`
    + (albumComplete(found) ? `<figure class="golden-reward" data-reward="golden"><svg viewBox="0 0 120 76" aria-hidden="true"><path d="m40 25-28-12 5 25-5 25 28-12m40-26 28-12-5 25 5 25-28-12" fill="#e8b636" stroke="#9c691d" stroke-width="2"/><path d="m18 22 17 12m-17 20 17-12m67-20-17 12m17 20-17-12" fill="none" stroke="#fff0a8" stroke-width="3"/><rect x="33" y="13" width="54" height="50" rx="18" fill="#f6d363" stroke="#9c691d" stroke-width="2"/><path d="m44 21 5 32m6-35 5 36m6-36 5 34m7-29 3 23" stroke="#fff0a8" stroke-width="2"/><path d="M48 43c-4-7 1-15 8-14 4-6 13-3 13 3 7 1 8 10 3 14-7 6-18 4-24-3" fill="#d8345a" stroke="#a52443" stroke-width="2"/><path d="m10 4 2 5 5 2-5 2-2 5-2-5-5-2 5-2m98 48 2 5 5 2-5 2-2 5-2-5-5-2 5-2" fill="#b47d20"/></svg><figcaption>${sv.album.golden}</figcaption></figure>` : '')
    + `<h3>${sv.lostTitle}</h3><ul class="lost-list">${things.join('')}</ul>`
    + (keepsakes.includes('vittra') ? `<h3>${sv.keepsakes}</h3><ul class="album-grid"><li class="got" data-keepsake="vittra"><i style="--colour:#f2df9a;--mark:#5f923f"></i><span>${sv.vittraSticker}</span></li></ul>` : '');
}
