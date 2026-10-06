import type { UiSound } from '../audio/audio';

/**
 * What each press in a menu sounds like (docs/ux-audit/style-and-sound.md, "UI sound"): the way on two rising knocks
 * of wood, the way back two falling and a breath of paper, a choice Moa's crayon, any other plank one knock. A button
 * says otherwise with `data-sound`. Hoppa, Använd, the stick and the corners make the game's own sounds, not these.
 */
export function soundFor(button: Element): UiSound | null {
  if (!button.closest('.panel, .memory-panel, .ending-shot, .message')) return null;
  const own = button.getAttribute('data-sound');
  if (own) return own as UiSound;
  if (button.matches('.panel-close, .panel-up, .round-back')) return 'back';
  if (button.matches('.go')) return 'go';
  if (button.matches('[role="radio"], .style, .level, .help-level, .share-choice, .chapter-choice')) return 'choose';
  return 'press';
}

/** One listener for every press in a menu, and one for every switch. */
export function wireUiSound(doc: Document, play: (sound: UiSound) => void): void {
  doc.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest?.('button');
    if (!button || button.disabled) return;
    const sound = soundFor(button);
    if (sound) play(sound);
  }, true);
  doc.addEventListener('change', (event) => {
    const input = event.target as HTMLInputElement | null;
    if (input?.type === 'checkbox' && input.closest('.panel')) play(input.checked ? 'on' : 'off');
  }, true);
}
