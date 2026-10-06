import { stickerStyle } from './sticker';
import { sv } from '../content/sv';
import type { Speaker, Verb } from '../sim/types';
import { faceSvg } from './faces';

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
  /** Says something at the top of the screen for a few seconds: a find. */
  notice(text: string): void;
  /** Puts a line in the queue of bubbles. Each is shown for a few seconds, one after another. */
  say(who: Speaker, line: string, priority?: boolean): void;
  /**
   * A scene takes the floor: lines still waiting are dropped, and so is one a find has hidden. A line being read
   * is let stay a little longer, so the scene's own lines come when they are acted.
   */
  hush(): void;
  /** Moves the bubbles on. `dt` is the time since the last frame, in seconds: 0 while the game is paused. */
  tick(dt: number): void;
  /** Whether someone is saying something, or will: a bubble shows or waits its turn. */
  speaking(): boolean;
  /**
   * Shows the card at the end of a chapter: its title, and the candy in rows of ten with the number.
   * With `onNext` it leads on to the next chapter; without, it says that the story goes on later, or `closing`
   * where the story is over. `code` is the next chapter's three words, to open it on another device.
   */
  end(title: string, count: number, onAgain: () => void, onNext?: () => void, closing?: string, hidden?: readonly { kind: string; found: boolean }[], code?: string | null, onwardWord?: string, kicker?: string): void;
}

/** A bubble stays for this long, and a little longer for each letter. */
// Long enough to read at a child's pace: 12 letters 3.6 s, 40 letters 6.1 s (docs/ux-audit/in-play.md row 17).
const BUBBLE_TIME = 2.5;
const BUBBLE_TIME_PER_LETTER = 0.09;
/** How long a line being read stays when a scene begins. */
const HUSH_TIME = 1.6;

/**
 * `reading` stretches how long a bubble stays: longer with *Lugnare tempo* and with *Större text*.
 */
export function createHud(doc: Document, total: number, ghostNamed: () => boolean = () => false, reading: () => number = () => 1): Hud {
  const byId = <T extends HTMLElement>(id: string) => doc.getElementById(id) as T;
  const bag = byId('bag');
  const number = byId('bagCount');
  const act = byId<HTMLButtonElement>('actBtn');
  // With keys or a pad: what E (or X) will do, in Använd's corner (src/ui/ui.css, .key-prompt).
  const prompt = byId('keyPrompt');
  const promptWord = byId('keyPromptWord');
  let offered = false;
  let knocked = false;
  const showPrompt = () => prompt.classList.toggle('on', offered || knocked);
  const bubble = byId('bubble');
  let shown = -1;
  let wordShown: string | undefined;
  const queue: { who: Speaker; line: string }[] = [];
  let left = 0;
  let ended = false;
  // Nothing bounces or slaps on when the device asks for less motion, or the player does (*Mindre rörelse*).
  const less = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = { get matches() { return less.matches || doc.body.classList.contains('calm'); } };
  /** A sticker: a picture of the sweet, or an empty ring for one not found. */
  const sticker = (kind: string, found = true): HTMLElement => {
    const mark = doc.createElement('i');
    mark.className = found ? 'kind' : 'missing';
    mark.style.cssText = stickerStyle(kind);
    mark.title = sv.kinds[kind] ?? kind;
    return mark;
  };
  let stuck: string[] | null = null;
  let noticeFor = 0;
  const verbs: Record<string, string> = sv.verbs;
  const lines: Record<string, string> = sv.lines;
  const actionWord = (verb: Verb, word?: string | null) => word === 'giveGhost' && ghostNamed() ? sv.giveKlonk : (verbs[word ?? verb] ?? verbs[verb] ?? sv.act);

  return {
    candy(count) {
      if (count === shown) return;
      const grew = shown >= 0 && count > shown;
      shown = count;
      number.textContent = String(count);
      bag.title = sv.storyContext.recovered;
      bag.setAttribute('aria-label', sv.storyContext.recoveredCount.replace('{count}', String(count)));
      bag.style.setProperty('--fill', String(total > 0 ? Math.min(1, count / total) : 0));
      if (grew && !still.matches) {
        bag.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
      }
    },
    verb(verb, word = null) {
      const text = verb ? actionWord(verb, word) : sv.act;
      if (text === wordShown && act.disabled === (verb === null)) return;
      wordShown = text;
      act.disabled = verb === null;
      act.querySelector('span')!.textContent = text;
      act.setAttribute('aria-label', text);
      offered = verb !== null;
      if (offered || !knocked) promptWord.textContent = text;
      showPrompt();
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
      knocked = hint !== null && hint.verb !== null;
      act.classList.toggle('pulse', knocked);
      prompt.classList.toggle('pulse', knocked);
      // Out of reach the button is dimmed: it shows what it will say when he is there.
      if (hint && hint.verb && act.disabled) {
        const text = actionWord(hint.verb, hint.word);
        act.querySelector('span')!.textContent = text;
        promptWord.textContent = text;
        wordShown = undefined;
      }
      showPrompt();
    },
    notice(text) {
      const notice = byId('notice');
      notice.textContent = text;
      notice.hidden = false;
      noticeFor = 3.5;
    },
    say(who, line, priority = false) {
      if (!lines[line]) return;
      if (priority) { queue.length = 0; left = 0; }
      queue.push({ who, line });
    },
    hush() {
      queue.length = 0;
      if (noticeFor > 0) {
        noticeFor = 0;
        byId('notice').hidden = true;
        left = 0;
        bubble.hidden = true;
      } else left = Math.min(left, HUSH_TIME);
    },
    speaking() {
      return left > 0 || queue.length > 0;
    },
    tick(dt) {
      if (noticeFor > 0) {
        noticeFor -= dt;
        if (noticeFor <= 0) byId('notice').hidden = true;
      }
      // Finds and speech share a readable area. Keep the complete speech queued while a find is shown.
      if (noticeFor > 0) { bubble.hidden = true; return; }
      if (left > 0) {
        bubble.hidden = false;
        left -= dt;
        if (left <= 0) bubble.hidden = true;
        return;
      }
      const next = queue.shift();
      if (!next) return;
      const text = lines[next.line]!;
      byId('bubbleWho').textContent = next.who === 'spoket' && ghostNamed() ? sv.ghostName : sv.who[next.who];
      byId('bubbleLine').textContent = text;
      byId('bubbleFace').innerHTML = faceSvg(next.who);
      bubble.dataset.who = next.who;
      bubble.hidden = false;
      left = (BUBBLE_TIME + text.length * BUBBLE_TIME_PER_LETTER) * reading();
    },
    end(title, count, onAgain, onNext, closing, hidden, code, onwardWord, kicker) {
      if (ended) return;
      ended = true;
      byId('endTitle').textContent = title;
      byId('endKicker').textContent = kicker ?? '';
      byId('endKicker').hidden = !kicker;
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
      if (code) {
        byId('endCodeWords').textContent = code;
        byId('endCode').hidden = false;
      }
      byId('endAgain').onclick = onAgain;
      const onward = byId('endOnward');
      onward.hidden = onNext === undefined;
      // The story's last words stay, even where an extra chapter follows.
      byId('endNext').hidden = onNext !== undefined && !closing;
      if (onNext) onward.onclick = onNext;
      if (onwardWord) onward.querySelector('span')!.textContent = onwardWord;
      byId('endCard').hidden = false;
      (onNext ? onward : byId('endAgain')).focus();
    },
  };
}
