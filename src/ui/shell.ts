import { sv } from '../content/sv';
import { shellHtml } from './shell-html';

/**
 * Builds everything that lies over the game view: the candy bag, the pause button and its panel, the
 * on-screen controls, the hint, the notice, the debug text and the message. The game page and
 * dev/menus.html both call it, so the preview can't drift from the game.
 */
export function mountShell(root: HTMLElement, helper: 'ghost' | 'jay' = 'jay'): void {
  root.insertAdjacentHTML('beforeend', shellHtml(helper));
  const label = (id: string, text: string) => {
    const button = document.getElementById(id)!;
    button.querySelector('span')!.textContent = text;
    button.setAttribute('aria-label', text);
  };
  label('hopBtn', sv.hop);
  label('actBtn', sv.act);
  document.getElementById('bag')!.setAttribute('aria-label', sv.bag);
}
