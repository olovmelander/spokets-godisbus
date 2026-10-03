import { sv } from '../content/sv';
import type { Speaker, Verb } from '../sim/types';

/**
 * What the page shows over the game while it is played: the candy bag in the corner (plan §4.3), the word
 * on the Använd button (plan §4.1), the bubbles (plan §3.7) and the card at a chapter's end.
 * `total` is the trail candy in the chapter being played.
 */
export interface Hud {
  /** Shows the number of candies in the bag. The bag bumps when the number has grown. */
  candy(count: number): void;
  /** Shows what Använd would do now. With nothing to use, the button is dimmed and says Använd. */
  verb(verb: Verb | null, word?: string | null): void;
  /** Puts a line in the queue of bubbles. Each is shown for a few seconds, one after another. */
  say(who: Speaker, line: string): void;
  /** Moves the bubbles on. `dt` is the time since the last frame, in seconds: 0 while the game is paused. */
  tick(dt: number): void;
  /** Shows the card at the end of a chapter: its title, and the candy in rows of ten with the number. */
  end(title: string, count: number, onAgain: () => void): void;
}

/** A bubble stays for this long, and a little longer for each letter. */
const BUBBLE_TIME = 2.2;
const BUBBLE_TIME_PER_LETTER = 0.055;

export function createHud(doc: Document, total: number): Hud {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const bag = byId('bag');
  const number = byId('bagCount');
  const act = byId<HTMLButtonElement>('actBtn');
  const bubble = byId('bubble');
  let shown = -1;
  let wordShown: string | undefined;
  const queue: { who: Speaker; line: string }[] = [];
  let left = 0;
  let ended = false;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
  const verbs: Record<string, string> = sv.verbs;
  const lines: Record<string, string> = sv.lines;

  return {
    candy(count) {
      if (count === shown) return;
      const grew = shown >= 0 && count > shown;
      shown = count;
      number.textContent = String(count);
      bag.style.setProperty('--fill', String(total > 0 ? Math.min(1, count / total) : 0));
      if (grew && !still.matches) {
        bag.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
      }
    },
    verb(verb, word = null) {
      const text = verb ? (verbs[word ?? verb] ?? verbs[verb] ?? sv.act) : sv.act;
      if (text === wordShown && act.disabled === (verb === null)) return;
      wordShown = text;
      act.disabled = verb === null;
      act.querySelector('span')!.textContent = text;
      act.setAttribute('aria-label', text);
    },
    say(who, line) {
      if (lines[line]) queue.push({ who, line });
    },
    tick(dt) {
      if (left > 0) {
        left -= dt;
        if (left <= 0) bubble.hidden = true;
        return;
      }
      const next = queue.shift();
      if (!next) return;
      const text = lines[next.line]!;
      byId('bubbleWho').textContent = sv.who[next.who];
      byId('bubbleLine').textContent = text;
      bubble.dataset.who = next.who;
      bubble.hidden = false;
      left = BUBBLE_TIME + text.length * BUBBLE_TIME_PER_LETTER;
    },
    end(title, count, onAgain) {
      if (ended) return;
      ended = true;
      byId('endTitle').textContent = title;
      byId('endCount').textContent = String(count);
      // Rows of ten, as on the chapter cards (plan §4.3).
      const rows = byId('endRows');
      rows.replaceChildren();
      for (let i = 0; i < count; i += 10) {
        const row = doc.createElement('div');
        row.className = 'row';
        for (let k = i; k < Math.min(count, i + 10); k++) row.appendChild(doc.createElement('i'));
        rows.appendChild(row);
      }
      byId('endAgain').onclick = onAgain;
      byId('endCard').hidden = false;
      byId('endAgain').focus();
    },
  };
}
