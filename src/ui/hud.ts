import { lessMotion } from '../platform/motion';
import { GOES_ON, TONES } from '../content/tones';
import { stickerStyle } from './sticker';
import { sv } from '../content/sv';
import type { Speaker, Verb } from '../sim/types';
import { faceSvg } from './faces';
import { verbIcon } from './verbs';
import { candyRows } from './rolls';
import { playingVoice, playVoice, stopVoice } from '../audio/voice-player';

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
  /** The helper's step on the three pips under its portrait, emptied when it leaves (in-play.md rows 3 and 20). */
  helped(step: number): void;
  /**
   * The hidden candy found so far (plan §4.3). A new one hangs from the bag on a tag with its name for three
   * seconds, then drops into the bag (docs/ux-audit/in-play.md rows 1 and 18); the stickers live in the album.
   */
  stickers(found: readonly string[]): void;
  /** Hangs a few words from the bag on a tag, for `seconds`: a find, a thanks. What is being said goes on. */
  notice(text: string, seconds?: number): void;
  /** While paused the bag says its number; in play only for a while after a candy (in-play.md row 2). */
  paused(on: boolean): void;
  /**
   * Every line stays for its reading time and recording. Protected story lines also offer Fortsätt after the sound;
   * ordinary lines leave play free. Whatever is said waits its turn without replacing a line still being read.
   * A supplied stable beat ID is acknowledged only when this displayed line finishes, never when it is queued.
   */
  say(who: Speaker, line: string, read?: boolean, beatId?: string): void;
  /** The line currently shown is protected. A future queued story line does not pause the current ordinary one. */
  reading(): boolean;
  /** A fresh press advances a story line after its recording and the accidental-press guard. */
  advance(): boolean;
  /** A deliberate checkpoint restart discards the interrupted dialogue, which its scene tells again. */
  clear(): void;
  /**
   * A scene takes the floor: a find's tag comes down. What is being said is let finish: the scene waited for quiet
   * before it began (src/sim/scene.ts), and its own lines wait their turn as every line does.
   */
  hush(): void;
  /** Moves the bubbles on. `dt` is the time since the last frame, in seconds: 0 while the game is paused. */
  tick(dt: number): void;
  /**
   * Whether someone is saying something, or will: a bubble shows or waits its turn, or a recorded voice still speaks (a
   * line's, or a card's), so that nothing said after it cuts it.
   */
  speaking(): boolean;
  /**
   * Who says the line in the bubble now and its words, for the picture (their mouth, the others' looks: src/render/talk.ts);
   * `at` counts the lines shown, so that a new line, even the same words again, is told from the last. Null: no bubble.
   */
  saying(): { who: Speaker; text: string; key: string; at: number } | null;
  /**
   * Shows the card at the end of a chapter: its title, and the candy in rows of ten with the number.
   * With `onNext` it leads on to the next chapter; without, it says that the story goes on later, or `closing`
   * where the story is over. `code` is the next chapter's three words, to open it on another device.
   */
  end(title: string, count: number, onAgain: () => void, onNext?: () => void, closing?: string, hidden?: readonly { kind: string; found: boolean }[], code?: string | null, onwardWord?: string, kicker?: string): void;
}

/** A find's tag hangs from the bag this long, and its sticker takes the last part of it to drop into the bag. */
const FIND_TIME = 3;
const DROP_TIME = 0.4;
/** The tag's mark when it is not a find: a drawn sparkle (src/ui/sprite.ts). */
const SPARKLE = '<svg class="i" aria-hidden="true"><use href="#i-sparkle"/></svg>';

/** A bubble stays for this long, and a little longer for each letter. */
// Long enough to read at a child's pace: 12 letters 3.6 s, 40 letters 6.1 s (docs/ux-audit/in-play.md row 17).
const BUBBLE_TIME = 2.5;
const BUBBLE_TIME_PER_LETTER = 0.09;
/** How long a line takes to read at a child's pace, before *Lugnare tempo* and *Större text* stretch it. */
export const readingTime = (text: string) => BUBBLE_TIME + text.length * BUBBLE_TIME_PER_LETTER;
/**
 * A bubble whose time is up stays this long for a line that goes on from it: the simulation says the next line only
 * once this one has been read (src/sim/sim.ts), so it comes a frame after, and is added under it.
 */
const GOES_ON_TIME = 0.3;

/**
 * `reading` stretches how long a bubble stays: longer with *Lugnare tempo* and with *Större text*. `spoke` hears
 * each line as it is shown, so its speaker's wordless sound goes with its bubble, not ahead of it. `completed` hears a
 * stable beat ID once the displayed line has finished; clearing or abandoning it never creates a reading receipt.
 */
export function createHud(doc: Document, total: number, ghostNamed: () => boolean = () => false, reading: () => number = () => 1,
  arrived: () => void = () => {}, spoke: (who: Speaker) => void = () => {}, completed: (beatId: string) => void = () => {}): Hud {
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
  const helpBtn = byId('helpBtn');
  let helpShown = -1;
  const bubble = byId('bubble');
  let shown = -1;
  let wordShown: string | undefined;
  type Line = { who: Speaker; line: string; read: boolean; beatId?: string };
  const queue: Line[] = [];
  let current: Line | null = null;
  let left = 0;
  /** A bubble whose time is up, kept for a line that goes on from it (`GOES_ON_TIME`). */
  let lingers = 0;
  let readFor = 0;
  /** Whose the bubble is and the lines in it now, so that a line which goes on from them is added under them. */
  let spoken: { who: Speaker; texts: string[] } | null = null;
  /** The line shown last, for the picture: who says it, its words, and how many lines have been shown. */
  const said = { who: 'elof' as Speaker, text: '', key: '', at: 0 };
  let ended = false;
  // Nothing bounces or slaps on when the device asks for less motion, or the player does (*Mindre rörelse*).
  const still = { get matches() { return lessMotion(doc); } };
  /** A sticker: a picture of the sweet, or an empty ring for one not found. */
  const sticker = (kind: string, found = true): HTMLElement => {
    const mark = doc.createElement('i');
    mark.className = found ? 'kind' : 'missing';
    mark.style.cssText = stickerStyle(kind);
    mark.title = sv.kinds[kind] ?? sv.stickers;
    return mark;
  };
  let stuck: string[] | null = null;
  let noticeFor = 0;
  const speechHasFloor = () => current !== null || queue.length > 0 || lingers > 0 || playingVoice() !== null;
  // How long the bag's number stays after a candy, and whether a menu is open, which keeps it.
  const COUNT_TIME = 3;
  let countFor = 0;
  let pausedNow = false;
  // Before the first candy the bag is only the bag.
  bag.classList.add('quiet');
  const tag = byId('notice');
  const mark = byId('noticeMark');
  const words = byId('noticeText');
  /** Hangs the tag: its mark (a sticker, or a drawn sparkle) and its words. */
  const hang = (text: string, seconds: number, picture: HTMLElement | null) => {
    words.textContent = text;
    mark.replaceChildren(...(picture ? [picture] : []));
    mark.innerHTML ||= SPARKLE;
    tag.hidden = speechHasFloor();
    tag.classList.remove('dropping');
    noticeFor = seconds;
  };
  const verbs: Record<string, string> = sv.verbs;
  const lines: Record<string, string> = sv.lines;
  const actionWord = (verb: Verb, word?: string | null) => word === 'giveGhost' && ghostNamed() ? sv.giveKlonk : (verbs[word ?? verb] ?? verbs[verb] ?? sv.act);
  const finish = () => {
    const beatId = current?.beatId;
    // Clear ownership before notifying the app: a save or another line queued by the callback cannot acknowledge this
    // entry again. A pending autoplay retry must not start after its completed bubble has gone.
    current = null;
    left = 0;
    stopVoice();
    if (beatId !== undefined) completed(beatId);
  };

  return {
    candy(count) {
      if (count === shown) return;
      const grew = shown >= 0 && count > shown;
      shown = count;
      number.textContent = String(count);
      if (grew) {
        countFor = COUNT_TIME;
        bag.classList.remove('quiet');
      }
      bag.title = sv.storyContext.recovered;
      bag.setAttribute('aria-label', sv.storyContext.recoveredCount.replace('{count}', String(count)));
      bag.style.setProperty('--fill', String(total > 0 ? Math.min(1, count / total) : 0));
      // With less motion the bag brightens for a moment in place of its bump.
      if (grew) {
        bag.animate(still.matches ? [{ filter: 'brightness(1.4)' }, { filter: 'none' }]
          : [{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
      }
    },
    verb(verb, word = null) {
      const text = verb ? actionWord(verb, word) : sv.act;
      if (text === wordShown && act.disabled === (verb === null)) return;
      wordShown = text;
      // Something has come in reach: the button pops forward and a soft wood tick says so, so a running child's eye
      // is caught (docs/ux-audit/in-play.md row 7). No pop under Mindre rörelse; the tick stays.
      if (verb !== null && !offered) {
        if (!still.matches) act.animate([{ transform: 'scale(0.86)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 160, easing: 'ease-out' });
        arrived();
      }
      act.disabled = verb === null;
      act.querySelector('span')!.textContent = text;
      act.setAttribute('aria-label', text);
      // And a picture of it, for a child who does not read the word (in-play.md row 6).
      act.querySelector('use')?.setAttribute('href', `#i-${verbIcon(verb, word)}`);
      offered = verb !== null;
      if (offered || !knocked) {
        promptWord.textContent = text;
        prompt.querySelector('use')?.setAttribute('href', `#i-${verbIcon(verb, word)}`);
      }
      showPrompt();
    },
    stickers(found) {
      if (stuck !== null && stuck.length === found.length) return;
      const fresh = stuck === null ? [] : found.filter((kind) => !stuck!.includes(kind));
      stuck = [...found];
      const row = byId('bagStickers');
      row.replaceChildren(...found.map((kind) => sticker(kind)));
      for (const kind of fresh) {
        // The new one on a tag from the bag, at 40 px with its name; it drops into the bag when the tag goes.
        const piece = sticker(kind);
        // It slaps on, or with less motion lights up (ui.css).
        piece.classList.add('new');
        hang(sv.found.replace('{name}', sv.kinds[kind] ?? sv.stickers), FIND_TIME, piece);
        tag.dataset.find = kind;
      }
    },
    helped(step) {
      if (step === helpShown) return;
      helpShown = step;
      helpBtn.dataset.step = String(step);
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
        // The picture of what it will do there, too.
        for (const where of [act, prompt]) where.querySelector('use')?.setAttribute('href', `#i-${verbIcon(hint.verb, hint.word)}`);
        wordShown = undefined;
      }
      showPrompt();
    },
    notice(text, seconds = FIND_TIME) {
      hang(text, seconds, null);
      delete tag.dataset.find;
    },
    paused(on) {
      if (on === pausedNow) return;
      pausedNow = on;
      bag.classList.toggle('quiet', !on && countFor <= 0);
    },
    say(who, line, read = false, beatId) {
      if (!lines[line]) return;
      // It waits its turn, a story line too: nothing is cut short or dropped to make room for it.
      queue.push({ who, line, read, beatId });
      if (noticeFor > 0) tag.hidden = true;
    },
    reading() {
      return current?.read === true;
    },
    advance() {
      if (pausedNow || !current?.read || readFor < 0.25 || playingVoice() !== null) return false;
      lingers = 0;
      bubble.hidden = true;
      spoken = null;
      finish();
      return true;
    },
    clear() {
      stopVoice();
      queue.length = 0;
      current = null;
      left = 0;
      lingers = 0;
      spoken = null;
      bubble.hidden = true;
    },
    hush() {
      // A scene takes the floor: the tag comes down. Nothing said is cut or dropped (it waited for quiet).
      if (noticeFor > 0) {
        noticeFor = 0;
        tag.hidden = true;
      }
    },
    speaking() {
      return current !== null || queue.length > 0 || playingVoice() !== null;
    },
    saying() {
      return bubble.hidden || said.at === 0 ? null : said;
    },
    tick(dt) {
      if (pausedNow) return;
      if (noticeFor > 0) {
        // A reward waits its turn behind the whole exchange, including the brief continuation linger.
        // Its time belongs to the visible notice, so it cannot expire unseen behind a speech card.
        tag.hidden = speechHasFloor();
        if (!tag.hidden) {
          noticeFor -= dt;
          // A find's sticker drops into the bag as its tag goes (a fade under Mindre rörelse).
          if (noticeFor <= DROP_TIME && tag.dataset.find && !tag.classList.contains('dropping')) tag.classList.add('dropping');
          if (noticeFor <= 0) tag.hidden = true;
        }
      }
      if (countFor > 0) {
        countFor -= dt;
        if (countFor <= 0 && !pausedNow) bag.classList.add('quiet');
      }
      if (current) {
        bubble.hidden = false;
        readFor += dt;
        left = Math.max(0, left - dt);
        // A paused/zero-time presentation frame cannot acknowledge a line, even if its sound ended between frames.
        if (dt <= 0 || left > 0 || playingVoice() !== null) return;
        // Its time is up. It stays a moment for a line that goes on from it, which the simulation says now.
        lingers = GOES_ON_TIME;
        finish();
        if (queue.length === 0) return;
      }
      // A recording can outlast its reading estimate: keep its bubble until the actual sound ends.
      if (playingVoice() !== null) return;
      if (lingers > 0) {
        // A line that goes on from this one is added under it, not put in its place (story-presentation.md row 22).
        const after = queue[0];
        if (!after) {
          lingers -= dt;
          if (lingers <= 0) {
            bubble.hidden = true;
            spoken = null;
          }
          return;
        }
        lingers = 0;
        if (!GOES_ON.has(after.line) || after.who !== spoken?.who) {
          bubble.hidden = true;
          spoken = null;
        }
      }
      const next = queue.shift();
      if (!next) return;
      playVoice(next.line);
      const text = lines[next.line]!;
      said.who = next.who; said.text = text; said.key = next.line; said.at++;
      const goesOn = GOES_ON.has(next.line) && !bubble.hidden && spoken?.who === next.who;
      spoken = { who: next.who, texts: goesOn ? [...spoken!.texts, text].slice(-2) : [text] };
      byId('bubbleWho').textContent = next.who === 'spoket' && ghostNamed() ? sv.ghostName : sv.who[next.who];
      byId('bubbleLine').replaceChildren(...spoken.texts.flatMap((words, i) => {
        const said = doc.createElement('span');
        said.className = 'said';
        said.textContent = words;
        return i > 0 ? [doc.createTextNode(' '), said] : [said];
      }));
      // How it is said: a shout, a worry, a gentle word or a thought (src/content/tones.ts).
      const tone = TONES[next.line];
      if (tone) bubble.dataset.tone = tone;
      else delete bubble.dataset.tone;
      byId('bubbleFace').innerHTML = faceSvg(next.who);
      bubble.dataset.who = next.who;
      bubble.hidden = false;
      current = next;
      readFor = 0;
      left = readingTime(text) * reading();
      // The speaker's wordless sound goes with the bubble.
      spoke(next.who);
    },
    end(title, count, onAgain, onNext, closing, hidden, code, onwardWord, kicker) {
      if (ended) return;
      ended = true;
      byId('endTitle').textContent = title;
      byId('endKicker').textContent = kicker ?? '';
      byId('endKicker').hidden = !kicker;
      if (closing) {
        byId('endNext').textContent = closing;
        // The closing card's own voice, by the chapter whose words it is: end_epilog, end_byn, end_morgonen.
        playVoice(`end_${Object.keys(sv.end.closing).find((id) => sv.end.closing[id] === closing)}`);
      }
      // The chapter's hidden candy: a sticker for each one found, an empty ring for each still out there.
      if (hidden && hidden.length > 0) {
        byId('endStickers').replaceChildren(...hidden.map((h) => sticker(h.kind, h.found)));
        byId('endFound').hidden = false;
      }
      byId('endCount').textContent = String(count);
      // In tens, each ten a roll, as on the chapter cards (plan §4.3).
      byId('endRows').innerHTML = candyRows(count);
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
