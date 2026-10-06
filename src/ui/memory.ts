import { sv } from '../content/sv';
import { use } from './icons';

/**
 * The four memories (plan §2.4, §3.3 rule 5): short, wordless pictures of the family some years ago, which
 * tell the secret before anyone says it. Each plays when Elof touches a glowing curl of shaving.
 *
 * They are drawn here as paper cut-outs in sepia, so that they never read as "now" (plan §5.4). Nobody is
 * drawn as themselves: a big figure with a flat cap is Pappa, a small one in light blue with a spiky fringe
 * is little Elof, and the small figure with the pointed cap is his first trägubbe, which is in every one.
 * The plan's memories are animated scenes with the family's models; these cards stand in for them.
 */
const INK = '#5a3d24';
const MID = '#a37a4c';
const LIGHT = '#dcc091';
const BLUE = '#9cc4e4';
const JELLY = '#d8345a';
const stroke = `fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"`;

/** A grown-up, as a cut-out: `h` tall, standing on y. A flat cap is Pappa's; a braid is Mamma's. */
function grownUp(x: number, y: number, h: number, mark: 'cap' | 'braid' | 'none' = 'cap', lean = 0): string {
  const r = h * 0.11;
  const head = y - h + r;
  const cap = mark === 'cap' ? `<path d="M${x - r * 1.15} ${head - r * 0.35}a${r * 1.15} ${r * 0.9} 0 0 1 ${r * 2.3} 0l${r * 0.9} ${r * 0.25}h${-r * 3.2}z" fill="${INK}"/>` : '';
  const braid = mark === 'braid' ? `<path d="M${x - r * 0.7} ${head}q${-r * 1.6} ${r * 2} ${-r * 0.6} ${h * 0.42}" ${stroke} stroke-width="5"/>` : '';
  return `<g transform="rotate(${lean} ${x} ${y})"><path d="M${x - h * 0.16} ${y}l${h * 0.04} ${-h * 0.72}q${h * 0.12} ${-h * 0.08} ${h * 0.24} 0l${h * 0.04} ${h * 0.72}z" fill="${MID}"/><circle cx="${x}" cy="${head}" r="${r}" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>${cap}${braid}</g>`;
}

/** Little Elof: small, in light blue, with his spiky fringe. Outdoors he wears a small flat cap as well. */
function littleElof(x: number, y: number, h: number, cap = false, arm: 'up' | 'out' | 'none' = 'none'): string {
  const r = h * 0.2;
  const head = y - h + r;
  const fringe = `<path d="M${x - r} ${head - r * 0.2}l${r * 0.35} ${-r * 0.85}l${r * 0.3} ${r * 0.5}l${r * 0.35} ${-r * 0.75}l${r * 0.3} ${r * 0.55}l${r * 0.4} ${-r * 0.6}l${r * 0.25} ${r * 0.9}z" fill="#e8b93a" stroke="${INK}" stroke-width="1.5"/>`;
  const hat = cap ? `<path d="M${x - r * 1.05} ${head - r * 0.5}a${r * 1.05} ${r * 0.75} 0 0 1 ${r * 2.1} 0l${r * 0.8} ${r * 0.2}h${-r * 2.9}z" fill="${INK}"/>` : '';
  const limb = arm === 'up' ? `<path d="M${x + h * 0.1} ${y - h * 0.5}l${h * 0.16} ${-h * 0.34}" ${stroke}/>` : arm === 'out' ? `<path d="M${x + h * 0.1} ${y - h * 0.48}l${h * 0.3} ${-h * 0.02}" ${stroke}/>` : '';
  return `<path d="M${x - h * 0.2} ${y}l${h * 0.05} ${-h * 0.56}q${h * 0.15} ${-h * 0.08} ${h * 0.3} 0l${h * 0.05} ${h * 0.56}z" fill="${BLUE}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${head}" r="${r}" fill="${LIGHT}" stroke="${INK}" stroke-width="2"/>${cap ? hat : ''}${fringe}${limb}`;
}

/** The first trägubbe: a small figure with a pointed cap, and a smile when it is seen close. */
function figure(x: number, y: number, h: number, smile = false): string {
  const face = smile ? `<path d="M${x - h * 0.09} ${y - h * 0.5}q${h * 0.09} ${h * 0.1} ${h * 0.18} 0" ${stroke} stroke-width="2"/><circle cx="${x - h * 0.08}" cy="${y - h * 0.62}" r="${h * 0.025}" fill="${INK}"/><circle cx="${x + h * 0.08}" cy="${y - h * 0.62}" r="${h * 0.025}" fill="${INK}"/>` : '';
  return `<g class="tragubbe"><path d="M${x - h * 0.2} ${y}l${h * 0.04} ${-h * 0.42}h${h * 0.32}l${h * 0.04} ${h * 0.42}z" fill="#c9a877" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="${y - h * 0.56}" r="${h * 0.19}" fill="#e2c898" stroke="${INK}" stroke-width="2"/><path d="M${x - h * 0.19} ${y - h * 0.66}l${h * 0.19} ${-h * 0.36}l${h * 0.19} ${h * 0.36}z" fill="${MID}" stroke="${INK}" stroke-width="2"/>${face}</g>`;
}

const jelly = (x: number, y: number, r = 5) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${JELLY}" stroke="${INK}" stroke-width="1.5"/>`;
const ground = (y: number) => `<path d="M0 ${y}h320v${200 - y}h-320z" fill="${LIGHT}"/><path d="M0 ${y}h320" ${stroke}/>`;
const spruce = (x: number, y: number, h: number) => `<path d="M${x - h * 0.28} ${y}l${h * 0.28} ${-h}l${h * 0.28} ${h}z" fill="${MID}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
const pine = (x: number, y: number) => `<path d="M${x} ${y}q-6 -40 4 -78" ${stroke} stroke-width="6"/><path d="M${x - 34} ${y - 76}q36 -30 76 -4q-30 8 -40 10q-20 4 -36 -6z" fill="${MID}" stroke="${INK}" stroke-width="2"/>`;
const mountain = (x: number, y: number, w: number, h: number) => `<path d="M${x - w / 2} ${y}l${w * 0.34} ${-h}l${w * 0.14} ${h * 0.3}l${w * 0.1} ${-h * 0.16}l${w * 0.42} ${h * 0.86}z" fill="${MID}" opacity="0.55"/>`;
const camera = (x: number, y: number) => `<rect x="${x - 9}" y="${y - 7}" width="18" height="13" rx="2" fill="${INK}"/><circle cx="${x}" cy="${y}" r="3.5" fill="${LIGHT}"/>`;
const frame = (inside: string) => `<svg viewBox="0 0 320 200" aria-hidden="true">${inside}</svg>`;

/** The pictures of each memory, by the chapter it lies in. */
export const MEMORIES: Record<string, string[]> = {
  // Memory 1: night at the kitchen table. Pappa carves his first figure, and gives it to little Elof.
  garden: [
    frame(`${ground(150)}<rect x="60" y="118" width="200" height="12" rx="3" fill="${MID}" stroke="${INK}" stroke-width="2"/>${grownUp(214, 150, 118)}<path d="M186 104l-26 8" ${stroke}/><path d="M158 110l-12 -8" ${stroke} stroke-width="2"/>${figure(150, 118, 30)}<path d="M132 100l-8 -6m4 14l-10 0m18 -24l-4 -9" ${stroke} stroke-width="2"/>${littleElof(96, 152, 62)}`),
    frame(`${ground(150)}${grownUp(206, 150, 118, 'cap', -6)}<path d="M180 98l-34 14" ${stroke}/>${figure(138, 124, 30, true)}${littleElof(100, 150, 70, false, 'out')}`),
    frame(`<circle cx="118" cy="104" r="64" fill="${LIGHT}" stroke="${INK}" stroke-width="3"/><path d="M56 92l22 -54l18 30l22 -46l18 34l26 -40l16 58z" fill="#e8b93a" stroke="${INK}" stroke-width="2.5"/><circle cx="98" cy="108" r="5" fill="${INK}"/><circle cx="140" cy="108" r="5" fill="${INK}"/><path d="M100 132q20 16 40 0" ${stroke}/><path d="M60 170q58 -22 116 0v30h-116z" fill="${BLUE}" stroke="${INK}" stroke-width="2.5"/>${figure(232, 182, 96, true)}`),
  ],
  // Memory 2: an autumn walk. He sets the figure on a stump, and shares his Saturday sweets with it.
  granskog: [
    frame(`${ground(156)}${spruce(40, 156, 120)}${spruce(92, 156, 90)}${spruce(272, 156, 130)}${grownUp(222, 156, 104)}${littleElof(150, 156, 60, true, 'out')}${figure(176, 126, 20)}`),
    frame(`${ground(156)}${spruce(286, 156, 120)}<path d="M176 156v-30h44v30" fill="${MID}" stroke="${INK}" stroke-width="2.5"/><path d="M172 126h52" ${stroke} stroke-width="5"/>${figure(198, 122, 44, true)}${jelly(198, 114, 6)}${littleElof(112, 156, 78, true, 'out')}${jelly(142, 116, 6)}`),
    frame(`${ground(156)}${spruce(26, 156, 130)}<path d="M150 156v-30h44v30" fill="${MID}" stroke="${INK}" stroke-width="2.5"/><path d="M146 126h52" ${stroke} stroke-width="5"/>${figure(172, 122, 44, true)}${jelly(172, 114, 6)}${littleElof(98, 156, 78, true, 'up')}${jelly(124, 96, 6)}${grownUp(256, 156, 110, 'cap', 4)}${camera(228, 92)}`),
  ],
  // Memory 3: the boardwalk over the bog. He rides on Pappa's shoulders, and holds the figure up to see.
  myren: [
    frame(`${mountain(236, 132, 150, 84)}${ground(150)}<path d="M0 140h320" ${stroke} stroke-width="7" stroke="${MID}"/>${littleElof(58, 140, 40, true)}${grownUp(118, 140, 84, 'braid')}${littleElof(142, 140, 50, true)}<path d="M126 104l10 6" ${stroke} stroke-width="2"/>${grownUp(216, 140, 90)}${littleElof(216, 60, 40, true, 'up')}${figure(228, 28, 14)}`),
    frame(`${mountain(250, 150, 170, 96)}${ground(170)}${grownUp(150, 196, 150)}${littleElof(150, 58, 70, true, 'up')}${figure(172, 14, 30, true)}`),
    frame(`${mountain(200, 168, 260, 130)}<path d="M150 62q-4 -18 2 -32m-12 30q18 -12 28 -2" ${stroke} stroke-width="3"/>${ground(168)}${figure(86, 150, 84, true)}`),
  ],
  // Memory 4: the old pine at sunset. A gust, the crack, and the last raspberry jelly at its edge.
  berget: [
    frame(`<circle cx="268" cy="118" r="30" fill="#e8b93a" opacity="0.7"/>${ground(150)}${pine(70, 150)}<path d="M112 150l8 -22h34l8 22z" fill="${MID}" stroke="${INK}" stroke-width="2.5"/>${figure(137, 128, 34, true)}${littleElof(186, 150, 60, true)}${grownUp(250, 150, 106)}${camera(224, 88)}`),
    frame(`${ground(150)}${pine(60, 150)}<path d="M150 150v50h26v-50" fill="#3a2718"/><path d="M90 60h46m-58 16h36m-24 16h52" ${stroke} stroke-width="2.5"/><g transform="rotate(38 162 150)">${figure(162, 150, 32)}</g>${grownUp(232, 150, 106, 'cap', -64)}<path d="M186 142l-14 14" ${stroke}/>`),
    frame(`${ground(150)}${pine(54, 150)}<path d="M150 150v50h26v-50" fill="#3a2718"/>${jelly(186, 144, 7)}${littleElof(228, 150, 70, true, 'up')}<path d="M252 92l8 -8m-2 14l10 -4" ${stroke} stroke-width="2"/>`),
    frame(`<path d="M0 0h320v200h-320z" fill="#4a3320"/><path d="M0 0h320v64h-320z" fill="#8a6a44"/><path d="M118 64q8 70 -6 136h96q-16 -66 -6 -136z" fill="#2a1a10"/><path d="M0 64h118m90 0h112" ${stroke} stroke="${LIGHT}"/>${jelly(108, 57, 6)}<g opacity="0.8">${grownUp(236, 64, 36)}${littleElof(236, 30, 17, true)}</g>${figure(160, 180, 60, true)}`),
  ],
};

/** A memory not yet found: a faint drawing of the glowing curl of shaving that starts one, not a "?" (menus.md row 12). */
const CURL = '<svg viewBox="0 0 64 40" aria-hidden="true"><path d="M10 30c6-16 30-22 40-10 6 8-2 16-10 13-6-2-5-10 1-10" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M50 8l2-5m4 9 5-2m-3 8h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".7"/></svg>';

/** Only discovered memories show their pictures. The other slots keep the story to themselves. */
export function memoryAlbumHtml(flags: Record<string, string[]>): string {
  return `<h3>${sv.memories.title}</h3><div class="memory-album">${Object.entries(MEMORIES).map(([id, pictures]) =>
    flags[id]?.includes('memory')
      ? `<button type="button" class="memory-thumb" data-memory="${id}" aria-label="${sv.memories.watch}: ${sv.explore.chapters[id]}">${pictures[0]}<span>${sv.explore.chapters[id]}</span>${use('play', 'memory-play')}</button>`
      : `<div class="memory-missing" role="img" aria-label="${sv.memories.waiting}">${CURL}</div>`,
  ).join('')}</div>`;
}

export interface Memory {
  readonly open: boolean;
  /** Plays a chapter's memory, picture after picture, and calls `done` when it is over. A tap goes on at once. */
  play(chapter: string, done: () => void, options?: MemoryPresentation): void;
  /** Cancels playback immediately and returns to the panel or game that opened it. */
  close(): void;
  /** Hold the current picture while the page or renderer is interrupted. */
  suspend(paused: boolean): void;
}

export interface MemoryPresentation {
  /** The visible ghost, memory shaving or album thumbnail, in CSS client coordinates. */
  origin?: { x: number; y: number } | null;
  calm?: boolean;
}

/** How long each picture stays, in milliseconds: 3.2 s (docs/ux-audit/story-presentation.md row 20), and less where
 *  a memory has four, so that none is longer than ten seconds (plan §3.3). Each dissolves into the next over 0.6 s
 *  while it is pushed in a little. */
export const PICTURE_TIME = 3200;
export const pictureTime = (count: number) => Math.min(PICTURE_TIME, Math.floor(9600 / Math.max(1, count)));
export const DISSOLVE_TIME = 600;
export const MEMORY_RETURN_TIME = 240;

export function createMemory(doc: Document): Memory {
  const back = doc.getElementById('memory') as HTMLElement;
  const panel = back.querySelector<HTMLElement>('.memory-panel')!;
  const card = doc.getElementById('memoryCard') as HTMLElement;
  const nextButton = doc.getElementById('memoryNext') as HTMLButtonElement;
  const closeButton = doc.getElementById('memoryClose') as HTMLButtonElement;
  const progress = doc.getElementById('memoryProgress') as HTMLElement;
  let open = false;
  let timer = 0;
  let suspended = false, remaining = PICTURE_TIME, deadline = 0;
  let advance: (() => void) | null = null;
  let calm = false;
  let origin: MemoryPresentation['origin'];
  let viewport = { width: 0, height: 0 };
  let returning = false;
  let transition = 0;
  let pendingTransition: (() => void) | null = null;
  const animations = new Set<Animation>();
  let movement: Animation[] = [];
  let presentation: { kind: 'opening' | 'returning'; done: () => void; duration: number; width: number; height: number } | null = null;
  const cancelMovement = () => {
    transition++;
    pendingTransition = null;
    for (const animation of movement) { animations.delete(animation); animation.cancel(); }
    movement = [];
    presentation = null;
  };
  const hold = (animation: Animation) => {
    const at = animation.currentTime ?? 0;
    animation.pause();
    // pause() otherwise takes effect on a later animation tick. Hold the same pixels immediately,
    // including an entrance interrupted before its first requestAnimationFrame.
    animation.currentTime = at;
  };
  const animate = (element: Element, frames: Keyframe[], duration: number): Animation | null => {
    if (typeof element.animate !== 'function') return null;
    const animation = element.animate(frames, { duration, easing: 'ease-out' });
    animations.add(animation);
    const forget = () => animations.delete(animation);
    void animation.finished.then(forget, forget);
    if (suspended) hold(animation);
    return animation;
  };
  // A rotated/resized view no longer has the same source position. Use a centred fade in that case,
  // and for unavailable/offscreen sources; never fly towards a stale or invented world position.
  const bubbleTransform = (): string | null => {
    const bounds = back.getBoundingClientRect();
    if (calm || !origin || !Number.isFinite(origin.x) || !Number.isFinite(origin.y)
      || bounds.width !== viewport.width || bounds.height !== viewport.height
      || origin.x < bounds.left || origin.x > bounds.right || origin.y < bounds.top || origin.y > bounds.bottom) return null;
    const rect = card.getBoundingClientRect();
    return `translate(${origin.x - rect.left - rect.width / 2}px, ${origin.y - rect.top - rect.height / 2}px) scale(0.08)`;
  };
  const present = (kind: 'opening' | 'returning', done: () => void, resumed?: { duration: number; opacity: number }) => {
    cancelMovement();
    back.dataset.phase = kind;
    const ticket = transition;
    const bubble = bubbleTransform();
    // The oval picture is the transform origin even though its title and controls belong to the
    // same moving panel. It grows from the source, then the existing wordless cards tell the story.
    const rect = card.getBoundingClientRect(), panelRect = panel.getBoundingClientRect();
    panel.style.transformOrigin = `${rect.left + rect.width / 2 - panelRect.left}px ${rect.top + rect.height / 2 - panelRect.top}px`;
    const growing = kind === 'opening';
    const duration = resumed?.duration ?? (calm ? 120 : growing ? 360 : MEMORY_RETURN_TIME);
    const bounds = back.getBoundingClientRect();
    presentation = { kind, done, duration, width: bounds.width, height: bounds.height };
    const travel = [{ transform: bubble! }, { transform: 'none' }];
    const fade = [{ opacity: resumed?.opacity ?? (growing ? 0 : 1) }, { opacity: growing ? 1 : 0 }];
    movement = [
      bubble ? animate(panel, growing ? travel : [...travel].reverse(), duration) : null,
      animate(back, fade, duration),
    ].filter((animation): animation is Animation => animation !== null);
    const complete = () => { presentation = null; movement = []; done(); };
    const settled = () => {
      if (!open || transition !== ticket) return;
      if (suspended) pendingTransition = complete;
      else complete();
    };
    if (movement.length) void Promise.all(movement.map((animation) => animation.finished)).then(settled, () => {});
    else settled();
  };
  const resized = () => {
    if (!open || !presentation) return;
    const bounds = back.getBoundingClientRect();
    if (bounds.width === presentation.width && bounds.height === presentation.height) return;
    const { kind, done, duration } = presentation;
    const elapsed = Number(movement[0]?.currentTime ?? duration);
    const opacity = Number(getComputedStyle(back).opacity);
    // The source and panel geometry belong to the previous orientation. Cancel only that movement;
    // the current drawing, remaining picture time and interruption state stay intact.
    origin = null;
    present(kind, done, { duration: Math.max(0, duration - elapsed), opacity });
  };
  doc.defaultView?.addEventListener('resize', resized);
  const schedule = () => {
    window.clearTimeout(timer);
    if (!open || suspended || !advance) return;
    deadline = performance.now() + remaining;
    timer = window.setTimeout(() => { if (!suspended) advance?.(); }, remaining);
  };
  let finish: (() => void) | null = null;
  const close = () => {
    if (!open) return;
    window.clearTimeout(timer);
    open = false;
    returning = false;
    advance = null;
    cancelMovement();
    for (const animation of animations) animation.cancel();
    animations.clear();
    delete back.dataset.phase;
    delete back.dataset.suspended;
    back.hidden = true;
    card.onclick = null;
    nextButton.onclick = null;
    const done = finish;
    finish = null;
    done?.();
  };
  const returnToBubble = () => {
    if (!open || returning || suspended) return;
    returning = true;
    window.clearTimeout(timer);
    advance = null;
    present('returning', close);
  };
  closeButton.onclick = close;
  // A tap anywhere goes on; only the ✕ leaves at once (row 20).
  back.addEventListener('click', (event) => { if (event.target === back || event.target === panel) advance?.(); });
  return {
    get open() {
      return open;
    },
    play(chapter, done, options = {}) {
      const pictures = MEMORIES[chapter];
      if (open) return;
      if (!pictures) {
        done();
        return;
      }
      open = true;
      returning = false;
      calm = !!options.calm || doc.body.classList.contains('calm')
        || !!doc.defaultView?.matchMedia('(prefers-reduced-motion: reduce)').matches;
      origin = options.origin;
      back.hidden = false;
      const bounds = back.getBoundingClientRect();
      viewport = { width: bounds.width, height: bounds.height };
      const focus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
      finish = () => {
        if (focus?.isConnected) focus.focus();
        done();
      };
      doc.getElementById('memoryTitle')!.textContent = `${sv.memories.title} · ${sv.explore.chapters[chapter]}`;
      let at = -1;
      const next = () => {
        if ((suspended && at >= 0) || returning) return;
        window.clearTimeout(timer);
        // An early tap may skip the entrance without waiting, just like skipping a picture.
        if (at >= 0 && back.dataset.phase === 'opening') {
          cancelMovement();
          back.dataset.phase = 'pictures';
        }
        at++;
        if (at >= pictures.length) {
          returnToBubble();
          return;
        }
        // The picture before dissolves into this one: the oval stays, and later pictures do not grow from the source.
        for (const old of [...card.children]) {
          const fading = calm || at === 0 ? null : animate(old, [{ opacity: 1 }, { opacity: 0 }], DISSOLVE_TIME);
          if (!fading) { old.remove(); continue; }
          // Gone once faded, and never back at full strength for a frame between.
          (old as HTMLElement).style.opacity = '0';
          void fading.finished.then(() => old.remove(), () => {});
        }
        card.insertAdjacentHTML('beforeend', pictures[at]!);
        const drawing = card.lastElementChild!;
        progress.textContent = `${at + 1} / ${pictures.length}`;
        nextButton.innerHTML = at === pictures.length - 1 ? `<span class="sr-only">${sv.memories.back}</span>${use('again')}` : `<span class="sr-only">${sv.memories.next}</span>${use('next')}`;
        if (!calm) animate(drawing, [{ opacity: 0 }, { opacity: 1 }], at === 0 ? 320 : DISSOLVE_TIME);
        // A slow push-in, as a camera moves over an old photo; never with Mindre rörelse.
        if (!calm) animate(drawing, [{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }], pictureTime(pictures.length) + DISSOLVE_TIME);
        remaining = pictureTime(pictures.length);
        schedule();
      };
      advance = next;
      card.onclick = next;
      nextButton.onclick = next;
      next();
      present('opening', () => { back.dataset.phase = 'pictures'; });
      nextButton.focus();
    },
    close,
    suspend(paused) {
      resized();
      if (paused === suspended) return;
      suspended = paused;
      if (open) back.dataset.suspended = String(paused);
      if (paused) {
        if (open && advance) remaining = Math.max(0, deadline - performance.now());
        window.clearTimeout(timer);
        for (const animation of animations) hold(animation);
      } else {
        for (const animation of animations) animation.play();
        const done = pendingTransition;
        pendingTransition = null;
        done?.();
        schedule();
      }
    },
  };
}
