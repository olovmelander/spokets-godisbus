import { sv } from '../content/sv';
import type { PhotoMoment } from '../content/photos';
import type { AlbumPhoto, PhotoStore } from '../save/photos';
import { CHECK, CROSS, NEXT, PREVIOUS, use } from './icons';

const camera = use('camera');

/**
 * Shared by the game and the menu preview; the pictures are always device-local object URLs. The photo is a print
 * on the paper, as big as the screen lets it be, with round arrows at its sides and the panels' one header
 * (docs/ux-audit/menus.md rows 4 and 17).
 */
export const photoAlbumHtml = `
  <div class="panel-back" id="photoAlbum" hidden>
    <section class="panel photo-panel" role="dialog" aria-modal="true" aria-labelledby="photoTitle">
      <div class="panel-head"><h2 id="photoTitle">${sv.photos.title}</h2><p class="photo-count" id="photoCount" role="status" aria-live="polite"></p><button class="panel-close" id="photoClose" type="button" aria-label="${sv.photos.back}">${CROSS}</button></div>
      <div class="photo-stage">
        <button class="photo-step" id="photoPrevious" type="button" aria-label="${sv.photos.previous}">${PREVIOUS}</button>
        <figure class="photo-print" id="photoFrame"><img id="photoImage" alt=""><figcaption id="photoCaption"></figcaption></figure>
        <figure class="photo-print second" id="photoFrame2" hidden><img id="photoImage2" alt=""><figcaption id="photoCaption2"></figcaption></figure>
        <div class="photo-credits" id="photoCredits" hidden>${use('sparkle', 'credits-mark')}<h3>${sv.photos.thanks}</h3><p>${sv.photos.credits}</p></div>
        <button class="photo-step go" id="photoNext" type="button" aria-label="${sv.photos.next}">${NEXT}</button>
      </div>
    </section>
  </div>`;

export function createPhotoAlbum(doc: Document, store: PhotoStore, player: string, onCreditsDone?: () => void) {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const panel = byId('photoAlbum');
  const section = byId('albumPhotos');
  let photos: (AlbumPhoto & { url: string })[] = [];
  /** Which photos the credits show: the adventure that has ended's own (Olov, 15 November 2026). */
  let ofTheStory: (moment: PhotoMoment) => boolean = () => true;
  /** What is turned through: every photo in the album, or in the credits the ended adventure's. */
  const pages = () => (credits ? photos.filter((photo) => ofTheStory(photo.moment)) : photos);
  let index = 0;
  let credits = false;
  let source: HTMLElement | null = null;
  let focus: HTMLElement | null = null;
  let focusMoment: string | null = null;
  let revision = 0;
  /** The credits are the book's last pages, which turn by themselves (docs/ux-audit/story-presentation.md row 15). */
  let turning: number | null = null;

  /** In the credits two photos lie on each spread, and the thanks have the last page to themselves. */
  const perPage = () => (credits ? 2 : 1);
  const count = () => Math.ceil(pages().length / perPage()) + (credits ? 1 : 0);
  const print = (frame: string, image: string, caption: string, photo: (typeof photos)[number] | undefined) => {
    byId(frame).hidden = !photo;
    const img = byId<HTMLImageElement>(image);
    if (photo) {
      img.src = photo.url;
      img.alt = sv.photos.moments[photo.moment];
      byId(caption).textContent = sv.photos.moments[photo.moment];
    } else { img.removeAttribute('src'); img.alt = ''; }
  };
  const stopTurning = () => {
    if (turning !== null) doc.defaultView?.clearInterval(turning);
    turning = null;
  };
  /**
   * The credits turn every 4 s while the book lies open and the page can be seen, never on its last page. Each manual
   * step restarts the wait, so the page he turned to gets its full 4 s; a hidden page waits until it is seen again.
   */
  const startTurning = () => {
    stopTurning();
    if (credits && !panel.hidden && !doc.hidden && index + 1 < count()) turning = doc.defaultView?.setInterval(turn, 4000) ?? null;
  };
  doc.addEventListener('visibilitychange', () => { if (doc.hidden) stopTurning(); else startTurning(); });
  function draw(): void {
    const shown = pages();
    const first = shown[index * perPage()];
    print('photoFrame', 'photoImage', 'photoCaption', first);
    print('photoFrame2', 'photoImage2', 'photoCaption2', credits && first ? shown[index * 2 + 1] : undefined);
    byId('photoCredits').hidden = !!first;
    byId('photoTitle').textContent = credits ? sv.photos.journey : sv.photos.title;
    byId('photoCount').textContent = sv.photos.count.replace('{n}', String(index + 1)).replace('{total}', String(count()));
    byId<HTMLButtonElement>('photoPrevious').disabled = index <= 0;
    // The last photo's arrow is a tick: done. On the book's last page it is the word itself, and only there.
    const last = index + 1 >= count();
    const next = byId('photoNext');
    next.innerHTML = last ? credits ? `${CHECK}<span>${sv.photos.done}</span>` : CHECK : NEXT;
    next.setAttribute('aria-label', last ? sv.photos.done : sv.photos.next);
    panel.querySelector('.photo-panel')!.classList.toggle('book', credits);
    panel.querySelector('.photo-panel')!.classList.toggle('last', last);
    if (credits && last) {
      stopTurning();
      // The thanks open at the top of their page.
      panel.querySelector<HTMLElement>('.photo-panel')!.scrollTop = 0;
    }
  }
  /** One page on, as the book turns: a page laid over the last (ui.css), or with less motion a fade. */
  function turn(): void {
    if (index + 1 >= count()) return;
    index++;
    draw();
    const stage = panel.querySelector<HTMLElement>('.photo-stage')!;
    stage.classList.remove('turned');
    void stage.offsetWidth;
    stage.classList.add('turned');
  }
  function show(at: number, withCredits: boolean, from: HTMLElement, backTo: HTMLElement): void {
    credits = withCredits;
    index = Math.max(0, Math.min(at, pages().length - 1));
    source = from;
    focus = backTo;
    focusMoment = backTo.dataset.photoMoment ?? null;
    from.hidden = true;
    panel.hidden = false;
    draw();
    byId('photoNext').focus();
    // Every 4 s a page turns by itself; a tap turns it sooner.
    startTurning();
  }
  /** One page back or on, by hand: the arrows, the keys. Forward in the credits turns the page as the book does. */
  function step(by: -1 | 1): boolean {
    if (by < 0 ? index <= 0 : index + 1 >= count()) return false;
    if (by > 0 && credits) turn();
    else { index += by; draw(); }
    startTurning();
    return true;
  }
  function back(): void {
    if (panel.hidden) return;
    stopTurning();
    panel.hidden = true;
    if (source) source.hidden = false;
    // A capture can refresh the thumbnail list while this panel is open. Return to the same moment's
    // new button rather than a detached element, with a visible source control when that moment vanished.
    const visible = (element: HTMLElement | null): element is HTMLElement => !!element?.isConnected
      && element.getClientRects().length > 0 && !element.closest('[hidden]') && !element.hasAttribute('disabled');
    const current = focusMoment
      ? [...section.querySelectorAll<HTMLElement>('[data-photo-moment]')].find((button) => button.dataset.photoMoment === focusMoment) ?? null
      : null;
    const target = [current, focus, ...(source?.querySelectorAll<HTMLElement>('button,input,[tabindex]:not([tabindex="-1"])') ?? [])].find(visible);
    target?.focus();
    source = focus = null;
    focusMoment = null;
  }
  byId('photoPrevious').addEventListener('click', () => { step(-1); });
  byId('photoNext').addEventListener('click', () => {
    // A tap turns the page now, and the next one waits its full 4 s.
    if (step(1)) return;
    const completedCredits = credits; back(); if (completedCredits) onCreditsDone?.();
  });
  byId('photoClose').addEventListener('click', back);
  panel.addEventListener('click', (event) => { if (event.target === panel) back(); });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && step(-1)) event.preventDefault();
    if (event.key === 'ArrowRight' && step(1)) event.preventDefault();
  });

  async function refresh(): Promise<void> {
    const request = ++revision;
    const frames = await store.list(player);
    if (request !== revision) return;
    for (const photo of photos) URL.revokeObjectURL(photo.url);
    photos = frames.map((photo) => ({ ...photo, url: URL.createObjectURL(photo.blob) }));
    section.replaceChildren();
    const title = doc.createElement('h3');
    title.innerHTML = `${camera}<span>${sv.photos.title}</span>`;
    section.append(title);
    if (!photos.length) {
      const empty = doc.createElement('p');
      empty.className = 'setting-hint';
      empty.textContent = sv.photos.empty;
      section.append(empty);
    } else {
      const list = doc.createElement('div');
      list.className = 'photo-thumbnails';
      for (const [at, photo] of photos.entries()) {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = 'photo-thumb';
        button.dataset.photoMoment = photo.moment;
        button.setAttribute('aria-label', sv.photos.open.replace('{name}', sv.photos.moments[photo.moment]));
        const img = doc.createElement('img');
        img.src = photo.url;
        img.alt = '';
        const label = doc.createElement('span');
        label.textContent = sv.photos.moments[photo.moment];
        button.append(img, label);
        button.addEventListener('click', () => show(at, false, byId('pause'), button));
        list.append(button);
      }
      section.append(list);
    }
    if (!panel.hidden) { index = Math.min(index, Math.max(0, count() - 1)); draw(); }
  }
  return {
    get open() { return !panel.hidden; },
    back,
    refresh,
    /**
     * The book of the adventure that has ended, its last pages turning by themselves: its own photos, and the thanks.
     * Äventyr 1 ends so after Godiskalaset, Äventyr 2 after Morgonen efter (Olov, 15 November 2026: "äventyr 2 [slutar]
     * på samma snygga sätt som äventyr 1 där man får se alla bilder från äventyret").
     */
    credits(of: (moment: PhotoMoment) => boolean = () => true, backTo?: HTMLElement) {
      ofTheStory = of;
      show(0, true, byId('endCard'), backTo ?? byId('endPhotos'));
    },
  };
}
