import { lessMotion } from '../platform/motion';
import { sv } from '../content/sv';
import { use } from './icons';
import './memory.css';

import { MEMORIES } from './memory-art';
export { MEMORIES } from './memory-art';

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
  /** Opens a chapter's memory. Each picture waits for an explicit next/previous action. */
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

/** Dissolves and scene motion are presentation only; no timer advances the story. */
export const DISSOLVE_TIME = 600;
export const MEMORY_RETURN_TIME = 240;

export function createMemory(doc: Document): Memory {
  const back = doc.getElementById('memory') as HTMLElement;
  const panel = back.querySelector<HTMLElement>('.memory-panel')!;
  const card = doc.getElementById('memoryCard') as HTMLElement;
  const nextButton = doc.getElementById('memoryNext') as HTMLButtonElement;
  const closeButton = doc.getElementById('memoryClose') as HTMLButtonElement;
  const previousButton = doc.getElementById('memoryPrevious') as HTMLButtonElement;
  const caption = doc.getElementById('memoryCaption') as HTMLElement;
  const dots = doc.getElementById('memoryDots') as HTMLElement;
  const progress = doc.getElementById('memoryProgress') as HTMLElement;
  let open = false;
  let suspended = false;
  let advance: (() => void) | null = null;
  let calm = false;
  let origin: MemoryPresentation['origin'];
  let viewport = { width: 0, height: 0 };
  let returning = false;
  let transition = 0;
  let pendingTransition: (() => void) | null = null;
  const animations = new Set<Animation>();
  const sceneAnimations = new Set<Animation>();
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
  const animate = (element: Element, frames: Keyframe[], duration: number, repeat = false): Animation | null => {
    if (typeof element.animate !== 'function') return null;
    const animation = element.animate(frames, { duration, easing: 'ease-in-out', iterations: repeat ? Infinity : 1, direction: repeat ? 'alternate' : 'normal' });
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
    // same moving panel. It grows from the source, then the illustrated pages tell the story.
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
    // the current drawing and interruption state stay intact.
    origin = null;
    present(kind, done, { duration: Math.max(0, duration - elapsed), opacity });
  };
  doc.defaultView?.addEventListener('resize', resized);
  const stopScene = () => {
    for (const animation of sceneAnimations) { animations.delete(animation); animation.cancel(); }
    sceneAnimations.clear();
  };
  const bringToLife = (drawing: Element) => {
    if (calm) return;
    const movements: Record<string, [Keyframe[], number]> = {
      breeze: [[{ transform: 'rotate(-.7deg)' }, { transform: 'rotate(.7deg)' }], 3200],
      light: [[{ opacity: .6 }, { opacity: 1 }], 3600],
      motes: [[{ transform: 'translateY(3px)', opacity: .35 }, { transform: 'translateY(-4px)', opacity: .85 }], 4200],
      leaves: [[{ transform: 'translate(-4px,-3px) rotate(-2deg)' }, { transform: 'translate(5px,6px) rotate(3deg)' }], 3800],
      carve: [[{ transform: 'rotate(-3deg)' }, { transform: 'rotate(2deg)' }], 1000],
      offer: [[{ transform: 'translateY(1px)' }, { transform: 'translateY(-2px)' }], 2800],
      walk: [[{ transform: 'translateY(0)' }, { transform: 'translateY(-1px)' }], 1600],
      glint: [[{ opacity: .2 }, { opacity: 1 }], 2100],
      wind: [[{ transform: 'translateX(-5px)', opacity: .4 }, { transform: 'translateX(6px)', opacity: .9 }], 1900],
      // A short fall belongs to the gust; the figure rests after it, rather than moving by itself.
      fall: [[{ transform: 'translate(-4px,-7px)' }, { transform: 'translate(1px,5px)' }], 1800],
    };
    for (const part of drawing.querySelectorAll<SVGElement>('[data-memory-motion]')) {
      const kind = part.dataset.memoryMotion!;
      const movement = movements[kind];
      if (!movement) continue;
      const animation = animate(part, movement[0], movement[1], kind !== 'fall');
      if (animation) {
        if (kind === 'fall') animation.effect?.updateTiming({ fill: 'forwards' });
        sceneAnimations.add(animation);
      }
    }
  };
  let finish: (() => void) | null = null;
  const close = () => {
    if (!open) return;
    open = false;
    returning = false;
    advance = null;
    stopScene();
    cancelMovement();
    for (const animation of animations) animation.cancel();
    animations.clear();
    delete back.dataset.phase;
    delete back.dataset.suspended;
    delete back.dataset.calm;
    back.hidden = true;
    card.onclick = null;
    nextButton.onclick = null;
    previousButton.onclick = null;
    card.replaceChildren();
    const done = finish;
    finish = null;
    done?.();
  };
  const returnToBubble = () => {
    if (!open || returning || suspended) return;
    returning = true;
    advance = null;
    present('returning', close);
  };
  closeButton.onclick = close;
  // Intentional controls keep a curious tap on the painting from skipping its story.
  doc.addEventListener('keydown', (event) => {
    if (!open || suspended || event.altKey || event.ctrlKey || event.metaKey) return;
    // A direction/jump held while a shaving opens must not race through the new memory.
    if (event.repeat && ['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
      event.preventDefault();
      return;
    }
    if (event.key === 'ArrowLeft') { event.preventDefault(); previousButton.click(); }
    else if (event.key === 'ArrowRight') { event.preventDefault(); advance?.(); }
  });
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
      calm = !!options.calm || lessMotion(doc);
      back.dataset.calm = String(calm);
      back.dataset.suspended = String(suspended);
      origin = options.origin;
      back.hidden = false;
      const bounds = back.getBoundingClientRect();
      viewport = { width: bounds.width, height: bounds.height };
      const focus = doc.activeElement instanceof HTMLElement ? doc.activeElement : null;
      finish = () => {
        if (focus?.isConnected) focus.focus();
        done();
      };
      const story = sv.memories.chapters[chapter];
      doc.getElementById('memoryTitle')!.textContent = story.title;
      doc.getElementById('memoryWhen')!.textContent = `${sv.memories.when} · ${sv.explore.chapters[chapter]}`;
      let at = -1;
      const show = (index: number) => {
        if ((suspended && at >= 0) || returning || index < 0) return;
        if (at >= 0 && back.dataset.phase === 'opening') {
          cancelMovement();
          back.dataset.phase = 'pictures';
        }
        if (index >= pictures.length) { returnToBubble(); return; }
        stopScene();
        // Cancel an unfinished dissolve before removing its old picture, including rapid back/next input.
        for (const animation of [...animations]) if (!movement.includes(animation)) {
          animations.delete(animation); animation.cancel();
        }
        card.replaceChildren();
        at = index;
        card.insertAdjacentHTML('beforeend', pictures[at]!);
        const drawing = card.lastElementChild!;
        const words = story.captions[at]!;
        caption.textContent = words;
        card.setAttribute('aria-label', words);
        progress.textContent = `${at + 1} / ${pictures.length}`;
        dots.innerHTML = pictures.map((_, i) => `<i class="${i === at ? 'current' : i < at ? 'read' : ''}"></i>`).join('');
        previousButton.disabled = at === 0;
        nextButton.innerHTML = at === pictures.length - 1
          ? `<span>${sv.memories.finish}</span>${use('check')}`
          : `<span>${sv.memories.next}</span>${use('next')}`;
        if (!calm) animate(drawing, [{ opacity: .25 }, { opacity: 1 }], at === 0 ? 320 : DISSOLVE_TIME);
        bringToLife(drawing);
      };
      advance = () => show(at + 1);
      nextButton.onclick = advance;
      previousButton.onclick = () => show(at - 1);
      show(0);
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
        for (const animation of animations) hold(animation);
      } else {
        for (const animation of animations) animation.play();
        const done = pendingTransition;
        pendingTransition = null;
        done?.();
      }
    },
  };
}
