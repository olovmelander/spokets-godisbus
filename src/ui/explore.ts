import { BONUS, STORY } from '../content/chapters';
import { foundFlag, KINDS } from '../content/kinds';
import { sv } from '../content/sv';
import type { PlayerSave } from '../save/store';
import { ghostNamed } from '../save/journey';
import { mapState, mapSvg } from './map';

/** Only authored, already built chapters; neither test courses nor future places appear. */
export const EXPLORE_CHAPTERS = [...STORY, ...BONUS];

export function exploreHtml(save: PlayerSave): string {
  return EXPLORE_CHAPTERS.map((chapter) => {
    const flags = save.flags[chapter.id] ?? [];
    const candy = new Set((save.candy[chapter.id] ?? []).filter((i) => i >= 0 && i < chapter.candy.length)).size;
    const kinds = Object.entries(KINDS).filter(([, kind]) => kind.chapter === chapter.id);
    const stickers = kinds.map(([id, kind]) => `<i class="${flags.includes(foundFlag(id)) ? 'got' : 'missing'}" style="--colour:${kind.colour};--mark:${kind.mark}"></i>`).join('');
    const rows = Array.from({ length: Math.ceil(candy / 10) }, (_, row) => `<span class="row">${'<i></i>'.repeat(Math.min(10, candy - row * 10))}</span>`).join('');
    const challenge = chapter.hidden?.find((hidden) => hidden.route);
    const stars = challenge ? `<span class="route-star" aria-label="${flags.includes(foundFlag(challenge.kind)) ? sv.explore.routeFound : sv.explore.routeWaiting}">${flags.includes(foundFlag(challenge.kind)) ? '★' : '☆'}</span>` : '';
    return `<button type="button" class="chapter-choice" data-chapter="${chapter.id}"><b><span aria-hidden="true">${sv.explore.icons[chapter.id] ?? '→'}</span> ${sv.explore.chapters[chapter.id] ?? chapter.id}</b><span class="rows" aria-hidden="true">${rows}</span><span>${candy} / ${chapter.candy.length} ${sv.end.candy}</span>${kinds.length ? `<span class="stickers" aria-label="${kinds.filter(([id]) => flags.includes(foundFlag(id))).length} / ${kinds.length} ${sv.stickers}">${stickers}</span>` : ''}${stars}</button>`;
  }).join('');
}

export function createExplore(doc: Document, onSelect: (id: string) => void) {
  const back = doc.createElement('div');
  back.id = 'explore';
  back.className = 'panel-back explore';
  back.hidden = true;
  back.innerHTML = `<div class="panel" role="dialog" aria-modal="true" aria-labelledby="exploreTitle"><button class="panel-close" type="button" aria-label="${sv.pause.close}">✕</button><h2 id="exploreTitle">${sv.explore.title}</h2><div class="map"></div><p>${sv.explore.hint}</p><div class="chapter-list"></div></div>`;
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
    if (button && EXPLORE_CHAPTERS.some((chapter) => chapter.id === button.dataset.chapter)) onSelect(button.dataset.chapter!);
  });
  return {
    element: back,
    get open() { return !back.hidden; },
    show(save: PlayerSave) {
      focus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
      back.querySelector('.map')!.innerHTML = mapSvg({ ...mapState('epilog')!, here: mapState(save.chapter)?.here ?? 'home' }, ghostNamed(save.flags));
      back.querySelector('.chapter-list')!.innerHTML = exploreHtml(save);
      back.hidden = false;
      back.querySelector<HTMLButtonElement>(`[data-chapter="${EXPLORE_CHAPTERS.some((chapter) => chapter.id === save.chapter) ? save.chapter : 'prolog'}"]`)!.focus();
    },
    back: hide,
  };
}
