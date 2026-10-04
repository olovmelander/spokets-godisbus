import { sv } from '../content/sv';

/** The wordless last shot follows a completed credits album, once per visit to this ending. */
export const endingHtml = `<div id="endingShot" class="ending-shot" role="dialog" aria-modal="true" aria-labelledby="endingWords" aria-describedby="endingDescription" hidden>
  <p id="endingWords">${sv.end.closing.epilog}</p>
  <span class="sr-only" id="endingDescription">${sv.end.window}</span>
  <button class="wide" id="endingContinue" type="button">${sv.pause.resume}</button>
</div>`;

export class EndingClock {
  seconds: number | null = null;
  private rang = false;
  start(): boolean {
    if (this.seconds !== null) return false;
    this.seconds = 0;
    return true;
  }
  tick(dt: number): boolean {
    if (this.seconds === null) return false;
    this.seconds += Math.max(0, Math.min(dt, 0.25));
    if (this.rang || this.seconds < 1.2) return false;
    this.rang = true;
    return true;
  }
  finish(): void { if (this.seconds !== null) this.seconds = Math.max(3, this.seconds); }
}

export function createEnding(doc: Document, done: () => void) {
  const element = doc.getElementById('endingShot')!;
  const next = doc.getElementById('endingContinue')!;
  const card = doc.getElementById('endCard')!;
  const clock = new EndingClock();
  function back(): void {
    if (element.hidden) return;
    element.hidden = true;
    clock.finish();
    card.hidden = false;
    const explore = doc.getElementById('endExplore');
    const control = explore && !explore.hidden && explore.getClientRects().length > 0 ? explore
      : [...card.querySelectorAll<HTMLElement>('button')].find(node => !node.hidden && node.getClientRects().length > 0);
    control?.focus();
    done();
  }
  next.addEventListener('click', back);
  return {
    element, back,
    get open() { return !element.hidden; },
    get seconds() { return clock.seconds; },
    start() {
      if (!clock.start()) return false;
      card.hidden = true;
      element.hidden = false;
      next.focus();
      return true;
    },
    tick(dt: number) { return !element.hidden && clock.tick(dt); },
  };
}
