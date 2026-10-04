import { sv } from '../content/sv';
import type { AlbumPhoto, PhotoStore } from '../save/photos';

const camera = '<svg viewBox="0 0 32 24" aria-hidden="true"><path d="M3 6h6l3-4h8l3 4h6v16H3z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="13" r="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

/** Shared by the game and the menu preview; the pictures are always device-local object URLs. */
export const photoAlbumHtml = `
  <div class="panel-back" id="photoAlbum" hidden>
    <section class="panel photo-panel" role="dialog" aria-modal="true" aria-labelledby="photoTitle">
      <button class="panel-close" id="photoClose" type="button" aria-label="${sv.photos.back}">✕</button>
      <h2 id="photoTitle">${sv.photos.title}</h2>
      <figure id="photoFrame"><img id="photoImage" alt=""><figcaption id="photoCaption"></figcaption></figure>
      <div class="photo-credits" id="photoCredits" hidden><span aria-hidden="true">✧</span><h3>${sv.photos.thanks}</h3><p>${sv.photos.credits}</p></div>
      <p class="photo-count" id="photoCount" role="status" aria-live="polite"></p>
      <div class="photo-nav"><button class="wide" id="photoPrevious" type="button">← ${sv.photos.previous}</button><button class="wide go" id="photoNext" type="button">${sv.photos.next} →</button></div>
      <button class="wide" id="photoBack" type="button">↩ ${sv.photos.back}</button>
    </section>
  </div>`;

export function createPhotoAlbum(doc: Document, store: PhotoStore, player: string, onCreditsDone?: () => void) {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const panel = byId('photoAlbum');
  const section = byId('albumPhotos');
  let photos: (AlbumPhoto & { url: string })[] = [];
  let index = 0;
  let credits = false;
  let source: HTMLElement | null = null;
  let focus: HTMLElement | null = null;
  let focusMoment: string | null = null;
  let revision = 0;

  const count = () => photos.length + (credits ? 1 : 0);
  function draw(): void {
    const photo = photos[index];
    byId('photoFrame').hidden = !photo;
    byId('photoCredits').hidden = !!photo;
    const image = byId<HTMLImageElement>('photoImage');
    if (photo) {
      image.src = photo.url;
      image.alt = sv.photos.moments[photo.moment];
      byId('photoCaption').textContent = sv.photos.moments[photo.moment];
    } else { image.removeAttribute('src'); image.alt = ''; }
    byId('photoTitle').textContent = credits ? sv.photos.journey : sv.photos.title;
    byId('photoCount').textContent = sv.photos.count.replace('{n}', String(index + 1)).replace('{total}', String(count()));
    byId<HTMLButtonElement>('photoPrevious').disabled = index <= 0;
    byId('photoNext').textContent = index + 1 < count() ? `${sv.photos.next} →` : `✓ ${sv.photos.done}`;
  }
  function show(at: number, withCredits: boolean, from: HTMLElement, backTo: HTMLElement): void {
    index = Math.max(0, Math.min(at, photos.length - 1));
    credits = withCredits;
    source = from;
    focus = backTo;
    focusMoment = backTo.dataset.photoMoment ?? null;
    from.hidden = true;
    panel.hidden = false;
    draw();
    byId('photoNext').focus();
  }
  function back(): void {
    if (panel.hidden) return;
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
  byId('photoPrevious').addEventListener('click', () => { if (index > 0) { index--; draw(); } });
  byId('photoNext').addEventListener('click', () => {
    if (index + 1 < count()) { index++; draw(); }
    else { const completedCredits = credits; back(); if (completedCredits) onCreditsDone?.(); }
  });
  for (const id of ['photoClose', 'photoBack']) byId(id).addEventListener('click', back);
  panel.addEventListener('click', (event) => { if (event.target === panel) back(); });
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' && index > 0) { index--; draw(); event.preventDefault(); }
    if (event.key === 'ArrowRight' && index + 1 < count()) { index++; draw(); event.preventDefault(); }
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
    credits() { show(0, true, byId('endCard'), byId('endPhotos')); },
  };
}
