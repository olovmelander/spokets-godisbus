import { KINDS } from '../content/kinds';
import { LOST } from '../content/lost';
import { sv } from '../content/sv';

/**
 * The sticker album (plan §4.3), in the pause panel: every kind of hidden candy, four to a chapter, in the
 * order of the story. A kind he has found is a sticker with its name. One still out there is an empty ring,
 * and keeps its name to itself: what it is, is for him to find out. Under them: Hittegods (plan §4.8).
 */
export function albumHtml(found: readonly string[], lost: readonly string[] = [], keepsakes: readonly string[] = []): string {
  const has = new Set(found);
  const kinds = Object.entries(KINDS);
  const slots = kinds.map(([kind, look]) =>
    has.has(kind)
      ? `<li class="got"><i style="--colour:${look.colour};--mark:${look.mark}"></i><span>${sv.kinds[kind] ?? kind}</span></li>`
      : '<li><i class="missing"></i><span>?</span></li>',
  );
  const count = sv.album.count.replace('{found}', String(kinds.filter(([kind]) => has.has(kind)).length)).replace('{total}', String(kinds.length));
  // Hittegods: what he has found under the deck, by name. What is still lost keeps its name to itself.
  const things = LOST.map((thing) => (lost.includes(thing) ? `<li class="got" data-thing="${thing}">${sv.lost[thing]}</li>` : '<li>?</li>'));
  return `<h3>${sv.album.title}</h3><p class="album-count">${count}</p><ul class="album-grid">${slots.join('')}</ul>`
    + `<h3>${sv.lostTitle}</h3><ul class="lost-list">${things.join('')}</ul>`
    + (keepsakes.includes('vittra') ? `<h3>${sv.keepsakes}</h3><ul class="album-grid"><li class="got" data-keepsake="vittra"><i style="--colour:#f2df9a;--mark:#5f923f"></i><span>${sv.vittraSticker}</span></li></ul>` : '');
}
