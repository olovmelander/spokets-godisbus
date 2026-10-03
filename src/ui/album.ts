import { KINDS } from '../content/kinds';
import { sv } from '../content/sv';

/**
 * The sticker album (plan §4.3), in the pause panel: every kind of hidden candy, four to a chapter, in the
 * order of the story. A kind he has found is a sticker with its name. One still out there is an empty ring,
 * and keeps its name to itself: what it is, is for him to find out.
 */
export function albumHtml(found: readonly string[]): string {
  const has = new Set(found);
  const kinds = Object.entries(KINDS);
  const slots = kinds.map(([kind, look]) =>
    has.has(kind)
      ? `<li class="got"><i style="--colour:${look.colour};--mark:${look.mark}"></i><span>${sv.kinds[kind] ?? kind}</span></li>`
      : '<li><i class="missing"></i><span>?</span></li>',
  );
  const count = sv.album.count.replace('{found}', String(kinds.filter(([kind]) => has.has(kind)).length)).replace('{total}', String(kinds.length));
  return `<h3>${sv.album.title}</h3><p class="album-count">${count}</p><ul class="album-grid">${slots.join('')}</ul>`;
}
