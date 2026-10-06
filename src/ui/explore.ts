import { BONUS, STORY } from '../content/chapters';
import { foundFlag, KINDS } from '../content/kinds';
import { stickerStyle } from './sticker';
import { sv } from '../content/sv';
import type { PlayerSave } from '../save/store';
import { ghostNamed } from '../save/journey';
import { DRAWING, mapState, mapSvg, PICTURE } from './map';
import { CROSS } from './icons';

/** Each chapter's picture, in Moa's crayon (docs/ux-audit/menus.md row 18): her map's places, and four drawings more. */
const CHAPTER_PICTURE: Record<string, string> = {
  prolog: DRAWING.star, garden: PICTURE.home, granskog: PICTURE.forest, myren: PICTURE.bog, berget: PICTURE.mountain,
  norrsken: DRAWING.aurora, epilog: DRAWING.party, byn: DRAWING.shop,
};
const chapterPicture = (id: string) => `<svg class="chapter-picture" viewBox="-26 -32 52 48" aria-hidden="true">${CHAPTER_PICTURE[id] ?? ''}</svg>`;
/** The challenge's star: filled once its candy is found. */
const challengeStar = (found: boolean) =>
  `<svg viewBox="-22 -24 44 42" aria-hidden="true"><path d="M0-22l6 12 13 2-9.5 9.5L12 15 0 8.5-12 15l2.5-13.5L-19-8l13-2z" fill="${found ? '#f4c542' : 'none'}" stroke="#806022" stroke-width="2.6" stroke-linejoin="round"/></svg>`;

/** Only authored, already built chapters; neither test courses nor future places appear. */
export const EXPLORE_CHAPTERS = [...STORY, ...BONUS];

export function exploreHtml(save: PlayerSave, available: (id: string) => boolean = () => true): string {
  return EXPLORE_CHAPTERS.filter((chapter) => available(chapter.id)).map((chapter) => {
    const flags = save.flags[chapter.id] ?? [];
    // All the candy he has from here, and all there is: the trail's, and the side candy off it.
    const sideTotal = chapter.side?.length ?? 0;
    const candy = new Set((save.candy[chapter.id] ?? []).filter((i) => i >= 0 && i < chapter.candy.length)).size
      + new Set((save.side?.[chapter.id] ?? []).filter((i) => i >= 0 && i < sideTotal)).size;
    const kinds = Object.entries(KINDS).filter(([, kind]) => kind.chapter === chapter.id);
    const stickers = kinds.map(([id]) => `<i class="${flags.includes(foundFlag(id)) ? 'got kind' : 'missing'}" style="${stickerStyle(id)}"></i>`).join('');
    const rows = Array.from({ length: Math.ceil(candy / 10) }, (_, row) => `<span class="row">${'<i></i>'.repeat(Math.min(10, candy - row * 10))}</span>`).join('');
    const challenge = chapter.hidden?.find((hidden) => hidden.route);
    const routeFound = challenge ? flags.includes(foundFlag(challenge.kind)) : false;
    // "Utmaning" is written under the star, and what it means is said to a screen reader.
    const stars = challenge ? `<span class="route-star${routeFound ? ' found' : ''}">${challengeStar(routeFound)}<small aria-hidden="true">${sv.explore.challenge}</small><span class="sr-only">${routeFound ? sv.explore.routeFound : sv.explore.routeWaiting}</span></span>` : '';
    return `<button type="button" class="chapter-choice" data-chapter="${chapter.id}">${chapterPicture(chapter.id)}<b>${sv.explore.chapters[chapter.id] ?? chapter.id}</b><span class="rows" aria-hidden="true">${rows}</span><span class="chapter-count">${candy} / ${chapter.candy.length + sideTotal} ${sv.end.candy}</span>${kinds.length ? `<span class="stickers"><span class="sr-only">${kinds.filter(([id]) => flags.includes(foundFlag(id))).length} / ${kinds.length} ${sv.stickers}</span>${stickers}</span>` : ''}${stars}</button>`;
  }).join('');
}

export function createExplore(doc: Document, onSelect: (id: string) => void, available: (id: string) => boolean = () => true) {
  const back = doc.createElement('div');
  back.id = 'explore';
  back.className = 'panel-back explore';
  back.hidden = true;
  // The panels' one header (menus.md row 4): the title, and the drawn ✕ that stays put while the list scrolls.
  back.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="exploreTitle"><div class="panel-head"><h2 id="exploreTitle">${sv.explore.title}</h2><button class="panel-close" type="button" aria-label="${sv.pause.close}">${CROSS}</button></div><div class="map"></div><p>${sv.explore.hint}</p><div class="chapter-list"></div></div>`;
  doc.body.append(back);
  let focus: HTMLElement | null = null;
  const hide = () => {
    if (back.hidden) return;
    back.hidden = true;
    focus?.focus();
  };
  back.querySelector('button')!.onclick = hide;
  back.addEventListener('click', (event) => {
    if (event.target === back) hide();
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-chapter]') : null;
    if (button && available(button.dataset.chapter!) && EXPLORE_CHAPTERS.some((chapter) => chapter.id === button.dataset.chapter)) onSelect(button.dataset.chapter!);
  });
  return {
    element: back,
    get open() { return !back.hidden; },
    show(save: PlayerSave) {
      focus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
      back.querySelector('.map')!.innerHTML = mapSvg({ ...mapState('epilog', available)!, here: mapState(save.chapter, available)?.here ?? 'home' }, ghostNamed(save.flags));
      back.querySelector('.chapter-list')!.innerHTML = exploreHtml(save, available);
      back.hidden = false;
      back.querySelector('.panel')!.scrollTop = 0;
      // It opens at the top, with its title, the map and the hint in sight. Focus waits on this chapter, and only
      // keys and a pad, which need to see it, scroll to it (menus.md row 18).
      const touch = doc.body.dataset.device === 'touch';
      back.querySelector<HTMLButtonElement>(`[data-chapter="${EXPLORE_CHAPTERS.some((chapter) => chapter.id === save.chapter && available(chapter.id)) ? save.chapter : EXPLORE_CHAPTERS.find((chapter) => available(chapter.id))?.id}"]`)?.focus({ preventScroll: touch });
    },
    back: hide,
  };
}
