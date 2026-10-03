import { sv } from '../content/sv';
import type { Verb } from '../sim/types';

/**
 * What the page shows over the game while it is played: the candy bag in the corner (plan §4.3), and the
 * word on the Använd button (plan §4.1). `total` is the trail candy in the chapter being played.
 */
export interface Hud {
  /** Shows the number of candies in the bag. The bag bumps when the number has grown. */
  candy(count: number): void;
  /** Shows what Använd would do now. With nothing to use, the button is dimmed and says Använd. */
  verb(verb: Verb | null): void;
}

export function createHud(bag: HTMLElement, number: HTMLElement, act: HTMLButtonElement, total: number): Hud {
  let shown = -1;
  let verbShown: Verb | null | undefined;
  const still = window.matchMedia('(prefers-reduced-motion: reduce)');
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
    verb(verb) {
      if (verb === verbShown) return;
      verbShown = verb;
      const word = verb ? sv.verbs[verb] : sv.act;
      act.disabled = verb === null;
      act.querySelector('span')!.textContent = word;
      act.setAttribute('aria-label', word);
    },
  };
}
