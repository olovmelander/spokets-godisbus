import { KINDS } from '../content/kinds';
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
  /**
   * The helper has knocked (plan §4.6): Använd's word pulses. Out of reach of the thing, the button shows
   * the word it will have there. `null`: the helper is away, or only looking.
   */
  knock(hint: { verb: Verb | null; word: string | null } | null): void;
  /**
   * Shows the stickers of the hidden candy found so far, on the bag. A new one slaps on, and its name is
   * said at the top of the screen (plan §4.3).
   */
  stickers(found: readonly string[]): void;
  /** Puts a line in the queue of bubbles. Each is shown for a few seconds, one after another. */
  say(who: Speaker, line: string): void;
  /** Moves the bubbles on. `dt` is the time since the last frame, in seconds: 0 while the game is paused. */
  tick(dt: number): void;
  /**
   * Shows the card at the end of a chapter: its title, and the candy in rows of ten with the number.
   * With `onNext` it leads on to the next chapter; without, it says that the story goes on later, or `closing`
   * where the story is over.
   */
  end(title: string, count: number, onAgain: () => void, onNext?: () => void, closing?: string, hidden?: readonly { kind: string; found: boolean }[]): void;
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
  /** A sticker: a round mark in the kind's two colours, or an empty ring for one not found. */
  const sticker = (kind: string, found = true): HTMLElement => {
    const mark = doc.createElement('i');
    if (!found) mark.className = 'missing';
    mark.style.setProperty('--colour', KINDS[kind]?.colour ?? '#cccccc');
    mark.style.setProperty('--mark', KINDS[kind]?.mark ?? '#ffffff');
    mark.title = sv.kinds[kind] ?? kind;
    return mark;
  };
  let stuck: string[] | null = null;
  let noticeFor = 0;
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
    stickers(found) {
      if (stuck !== null && stuck.length === found.length) return;
      const fresh = stuck === null ? [] : found.filter((kind) => !stuck!.includes(kind));
      stuck = [...found];
      const row = byId('bagStickers');
      row.replaceChildren(...found.map((kind) => sticker(kind)));
      for (const kind of fresh) {
        const at = found.indexOf(kind);
        if (!still.matches) row.children[at]?.classList.add('new');
        // Its name, at the top of the screen, for a few seconds.
        const notice = byId('notice');
        notice.textContent = sv.found.replace('{name}', sv.kinds[kind] ?? kind);
        notice.hidden = false;
        noticeFor = 3.5;
      }
    },
    knock(hint) {
      act.classList.toggle('pulse', hint !== null && hint.verb !== null);
      // Out of reach the button is dimmed: it shows what it will say when he is there.
      if (hint && hint.verb && act.disabled) {
        const text = verbs[hint.word ?? hint.verb] ?? verbs[hint.verb] ?? sv.act;
        act.querySelector('span')!.textContent = text;
        wordShown = undefined;
      }
    },
    say(who, line) {
      if (lines[line]) queue.push({ who, line });
    },
    tick(dt) {
      if (noticeFor > 0) {
        noticeFor -= dt;
        if (noticeFor <= 0) byId('notice').hidden = true;
      }
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
    end(title, count, onAgain, onNext, closing, hidden) {
      if (ended) return;
      ended = true;
      byId('endTitle').textContent = title;
      if (closing) byId('endNext').textContent = closing;
      // The chapter's hidden candy: a sticker for each one found, an empty ring for each still out there.
      if (hidden && hidden.length > 0) {
        byId('endStickers').replaceChildren(...hidden.map((h) => sticker(h.kind, h.found)));
        byId('endFound').hidden = false;
      }
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
      const onward = byId('endOnward');
      onward.hidden = onNext === undefined;
      byId('endNext').hidden = onNext !== undefined;
      if (onNext) onward.onclick = onNext;
      byId('endCard').hidden = false;
      (onNext ? onward : byId('endAgain')).focus();
    },
  };
}
